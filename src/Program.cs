using System.Threading.RateLimiting;
using Asp.Versioning;
using Hangfire;
using Hangfire.Console;
using Hangfire.PostgreSql;
using HangfireBasicAuthenticationFilter;
using Safeturned.Api;
using Safeturned.Api.Database.Preparing;
using Safeturned.Api.Helpers;
using Safeturned.Api.Jobs;
using Safeturned.Api.RateLimiting;
using Safeturned.Api.Scripts.Files;
using Safeturned.Api.Services;
using Serilog;
using Serilog.Debugging;

SelfLog.Enable(Console.Error);

Log.Logger = new LoggerConfiguration()
    .WriteTo.AddConsoleLogger()
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
var config = builder.Configuration;
var host = builder.Host;
var services = builder.Services;

host.UseSerilog(Log.Logger);

#pragma warning disable ASP0000
var loggerFactory = new ServiceCollection()
    .AddLogging(loggingBuilder => loggingBuilder.AddSerilog(Log.Logger))
    .BuildServiceProvider()
    .GetRequiredService<ILoggerFactory>();
#pragma warning restore ASP0000

var connectionString = config.GetRequiredConnectionString("safeturned-db");

var dbPrepare = new DatabasePreparator(loggerFactory);
dbPrepare
    .Add("Hangfire", connectionString, DbPrepareType.PostgreSql, true)
    .Add("Files", connectionString, DbPrepareType.PostgreSql, true, DbReference.Filter)
    .Prepare();

host.UseDefaultServiceProvider((_, options) =>
{
    options.ValidateOnBuild = true;
    options.ValidateScopes = true;
});

builder.WebHost.UseSentry(x =>
{
    x.AddExceptionFilterForType<OperationCanceledException>();
});

services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    /*options.AddPolicy(KnownRateLimitPolicies., httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.GetIPAddress(),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1)
            }));*/
});

services.AddOpenApi();

services.AddScoped<IFileCheckingService, FileCheckingService>();

services.AddMemoryCache();
services.AddScoped<IAnalyticsService, AnalyticsService>();

services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader =  new HeaderApiVersionReader("api-version");
}).AddMvc()
.AddApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
    options.DefaultApiVersion = new ApiVersion(1);
    options.AssumeDefaultVersionWhenUnspecified = true;
});

services.AddHangfire(x => x
    .UseConsole()
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(
        xx => xx.UseNpgsqlConnection(config.GetRequiredConnectionString("safeturned-db")), new PostgreSqlStorageOptions
        {
            PrepareSchemaIfNecessary = true,
            InvisibilityTimeout = TimeSpan.FromHours(7),
        }));
services.AddHangfireServer();

services.ConfigureHttpClientDefaults(http =>
{
    http.AddStandardResilienceHandler();
});

services.AddHttpContextAccessor();

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

var app = builder.Build();

app.MapDefaultEndpoints();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseHangfireDashboard(options: new DashboardOptions
{
    Authorization =
    [
        new HangfireCustomBasicAuthenticationFilter
        {
            User = config["Hangfire:User"],
            Pass = config["Hangfire:Password"],
        }
    ]
});

var serviceProvider = app.Services;
var recurringJobManager = serviceProvider.GetRequiredService<IRecurringJobManager>();

recurringJobManager.AddOrUpdate<AnalyticsCacheUpdateJob>(
    "analytics-cache",
    job => job.UpdateAnalyticsCache(null!, CancellationToken.None),
    "*/5 * * * *");

//app.UseAuthentication();
app.UseExceptionHandler(_ => {}); // it must have empty lambda, otherwise error, more: https://github.com/dotnet/aspnetcore/issues/51888
app.UseRouting();
app.UseRateLimiter();
//app.UseAuthorization();

app.UseHangfireDashboard(config["Hangfire:DashboardPath"] ?? "/hangfire", new DashboardOptions
{
    Authorization =
    [
        new HangfireCustomBasicAuthenticationFilter
        {
            User = config["Hangfire:User"],
            Pass = config["Hangfire:Password"],
        }
    ]
});

app.MapControllers();

app.Run();