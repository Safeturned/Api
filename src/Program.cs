using System.Threading.RateLimiting;
using Asp.Versioning;
using Hangfire;
using Hangfire.Console;
using Hangfire.PostgreSql;
using HangfireBasicAuthenticationFilter;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Preparing;
using Safeturned.Api.ExceptionHandlers;
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

var dbConnectionString = config.GetRequiredConnectionString("safeturned-db");

var dbPrepare = new DatabasePreparator(loggerFactory);
dbPrepare
    .Add("Hangfire", dbConnectionString, DbPrepareType.PostgreSql, true)
    .Add("Files", dbConnectionString, DbPrepareType.PostgreSql, true, DbReference.Filter)
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
    options.ApiVersionReader = new HeaderApiVersionReader("api-version");
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
        xx => xx.UseNpgsqlConnection(dbConnectionString), new PostgreSqlStorageOptions
        {
            PrepareSchemaIfNecessary = true,
            InvisibilityTimeout = TimeSpan.FromHours(7),
        }));
services.AddHangfireServer();

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(int.Parse(Environment.GetEnvironmentVariable("SAFETURNED_API_PORT")));
});
services.AddHttpContextAccessor();
services.AddControllers();

services.AddDbContext<FilesDbContext>(options =>
{
    options.UseNpgsql(dbConnectionString);
});

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

services.AddSerilog(Log.Logger);

var app = builder.Build();

AppDomain.CurrentDomain.UnhandledException += ExceptionHandling.OnUnhandledException;

app.MapDefaultEndpoints();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "OpenAPI V1");
    });
}

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

//app.UseAuthentication();
app.UseExceptionHandler(_ => {}); // it must have empty lambda, otherwise error, more: https://github.com/dotnet/aspnetcore/issues/51888
app.UseRateLimiter();
//app.UseAuthorization();

app.UseHangfireDashboard(config.GetRequiredString("Hangfire:DashboardPath"), new DashboardOptions
{
    Authorization =
    [
        new HangfireCustomBasicAuthenticationFilter
        {
            User = config.GetRequiredString("Hangfire:User"),
            Pass = config.GetRequiredString("Hangfire:Password"),
        }
    ]
});

app.MapControllers();

var serviceProvider = app.Services;
var recurringJobManager = serviceProvider.GetRequiredService<IRecurringJobManager>();

recurringJobManager.AddOrUpdate<AnalyticsCacheUpdateJob>(
    "analytics-cache",
    job => job.UpdateAnalyticsCache(null!, CancellationToken.None),
    "*/5 * * * *");

app.Run();