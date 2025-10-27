using System.Threading.RateLimiting;
using Asp.Versioning;
using Hangfire;
using Hangfire.Console;
using Hangfire.PostgreSql;
using HangfireBasicAuthenticationFilter;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Preparing;
using Safeturned.Api.ExceptionHandlers;
using Safeturned.Api.Filters;
using Safeturned.Api.Helpers;
using Safeturned.Api.Jobs;
using Safeturned.Api.Models;
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

services.Configure<SecuritySettings>(config.GetSection("Security"));

var securitySettings = config.GetSection("Security").Get<SecuritySettings>();
if (securitySettings?.AllowedOrigins != null && securitySettings.AllowedOrigins.Length > 0)
{
    services.AddCors(options =>
    {
        options.AddPolicy("RestrictedCors", policy =>
        {
            policy.WithOrigins(securitySettings.AllowedOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();
        });
    });
}

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

var sentryFilter = new SentryRequestFilter();
builder.WebHost.UseSentry(x =>
{
    x.AddExceptionFilterForType<OperationCanceledException>();
    x.SetBeforeSend((sentryEvent, _) => sentryFilter.Filter(sentryEvent));
});

services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy(KnownRateLimitPolicies.UploadFile, httpContext =>
        RateLimitPartition.GetSlidingWindowLimiter(
            httpContext.GetIPAddress(),
            _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 4
            }));

    options.AddPolicy(KnownRateLimitPolicies.AnalyticsWithDateRange, httpContext =>
        RateLimitPartition.GetSlidingWindowLimiter(
            httpContext.GetIPAddress(),
            _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 4
            }));

    options.AddPolicy(KnownRateLimitPolicies.ChunkedUpload, httpContext =>
        RateLimitPartition.GetSlidingWindowLimiter(
            httpContext.GetIPAddress(),
            _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 50,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 4
            }));
});

services.AddOpenApi();

services.AddScoped<IFileCheckingService, FileCheckingService>();
services.AddScoped<IChunkStorageService, ChunkStorageService>();

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

var port = Environment.GetEnvironmentVariable("SAFETURNED_API_PORT") ?? throw new InvalidOperationException("API port is not set.");

var uploadLimits = new UploadLimitsConfiguration();
config.GetSection("UploadLimits").Bind(uploadLimits);

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(int.Parse(port));
    options.Limits.MaxRequestBodySize = uploadLimits.MaxChunkSizeBytes;
});

services.AddHttpContextAccessor();
services.AddControllers();

services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = uploadLimits.MaxChunkSizeBytes;
    options.ValueLengthLimit = int.MaxValue;
    options.ValueCountLimit = int.MaxValue;
    options.KeyLengthLimit = int.MaxValue;
});

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

//app.UseAuthentication();
app.UseExceptionHandler(_ => {}); // it must have empty lambda, otherwise error, more: https://github.com/dotnet/aspnetcore/issues/51888

if (securitySettings?.AllowedOrigins != null && securitySettings.AllowedOrigins.Length > 0)
{
    app.UseCors("RestrictedCors");
}

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

recurringJobManager.AddOrUpdate<ChunkCleanupJob>(
    "chunk-cleanup",
    job => job.CleanupExpiredChunksAsync(null!, CancellationToken.None),
    "0 */6 * * *");

app.Run();