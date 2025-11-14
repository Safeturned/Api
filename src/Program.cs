using System.Text;
using System.Threading.Channels;
using System.Threading.RateLimiting;
using Asp.Versioning;
using Hangfire;
using Hangfire.Console;
using Hangfire.PostgreSql;
using HangfireBasicAuthenticationFilter;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using Safeturned.Api.Constants;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Preparing;
using Safeturned.Api.ExceptionHandlers;
using Safeturned.Api.Filters;
using Safeturned.Api.Helpers;
using Safeturned.Api.Jobs;
using Safeturned.Api.Middleware;
using Safeturned.Api.Models;
using Safeturned.Api.RateLimiting;
using Safeturned.Api.Scripts.Files;
using Safeturned.Api.Services;
using Sentry.Hangfire;
using Serilog;
using Serilog.Debugging;

SelfLog.Enable(Console.Error);

var logger = Log.Logger = new LoggerConfiguration()
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
var dbPrepare = new DatabasePreparator(loggerFactory, builder.Environment);
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

services.AddHttpClient();

services.AddScoped<IFileCheckingService, FileCheckingService>();
services.AddScoped<IChunkStorageService, ChunkStorageService>();

services.AddScoped<ITokenService, TokenService>();
services.AddScoped<IDiscordAuthService, DiscordAuthService>();
services.AddScoped<ISteamAuthService, SteamAuthService>();
services.AddScoped<IApiKeyService, ApiKeyService>();

services.AddSingleton(_ => Channel.CreateUnbounded<ApiKeyUsageLogRequest>(new UnboundedChannelOptions
{
    SingleReader = true,
    AllowSynchronousContinuations = false
}));

services.AddHostedService<ApiKeyUsageLoggerService>();

var chunkStoragePath = config.GetRequiredString("ChunkStorage:DirectoryPath");
Directory.CreateDirectory(chunkStoragePath);
try
{
    var testFile = Path.Combine(chunkStoragePath, $".writability_test_{Guid.NewGuid():N}");
    File.WriteAllText(testFile, "test");
    File.Delete(testFile);
    logger.Information("Chunk storage directory is writable: {Path}", chunkStoragePath);
}
catch (Exception ex)
{
    logger.Error(ex, "Chunk storage directory is not writable: {Path}", chunkStoragePath);
    throw new InvalidOperationException($"Chunk storage directory is not writable: {chunkStoragePath}.", ex);
}

var redisConnectionString = config.GetRequiredConnectionString("safeturned-redis");
services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = redisConnectionString;
    options.InstanceName = "Safeturned:";
});

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
    .UseSentry()
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

var maxChunkSizeBytes = config.GetValue<int>("UploadLimits:MaxChunkSizeBytes");
var maxFileSizeBytes = config.GetValue<long>("UploadLimits:MaxFileSizeBytes");
var maxChunksPerSession = config.GetValue<int>("UploadLimits:MaxChunksPerSession");
var defaultChunkSizeBytes = config.GetValue<int>("UploadLimits:DefaultChunkSizeBytes");
var fileBufferSize = config.GetValue<int>("UploadLimits:FileBufferSize");
var sessionExpirationHours = config.GetValue<int>("UploadLimits:SessionExpirationHours");
var maxConcurrentSessionsPerIp = config.GetValue<int>("UploadLimits:MaxConcurrentSessionsPerIp");

if (maxChunkSizeBytes <= 0)
    throw new InvalidOperationException("UploadLimits:MaxChunkSizeBytes must be configured and greater than 0");
if (maxFileSizeBytes <= 0)
    throw new InvalidOperationException("UploadLimits:MaxFileSizeBytes must be configured and greater than 0");
if (maxChunksPerSession <= 0)
    throw new InvalidOperationException("UploadLimits:MaxChunksPerSession must be configured and greater than 0");
if (defaultChunkSizeBytes <= 0)
    throw new InvalidOperationException("UploadLimits:DefaultChunkSizeBytes must be configured and greater than 0");
if (fileBufferSize <= 0)
    throw new InvalidOperationException("UploadLimits:FileBufferSize must be configured and greater than 0");
if (sessionExpirationHours <= 0)
    throw new InvalidOperationException("UploadLimits:SessionExpirationHours must be configured and greater than 0");
if (maxConcurrentSessionsPerIp <= 0)
    throw new InvalidOperationException("UploadLimits:MaxConcurrentSessionsPerIp must be configured and greater than 0");

var port = Environment.GetEnvironmentVariable("SAFETURNED_API_PORT") ?? throw new InvalidOperationException("API port is not set.");
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(int.Parse(port));
    options.Limits.MaxRequestBodySize = maxChunkSizeBytes;
});

services.AddHttpContextAccessor();

var jwtSecret = config.GetRequiredString("Jwt:SecretKey");
services.AddAuthentication("Bearer")
    .AddCookie("Cookies", options =>
    {
        options.Cookie.Name = "safeturned_oauth";
        options.ExpireTimeSpan = TimeSpan.FromMinutes(5);
        options.SlidingExpiration = false;
        if (builder.Environment.IsDevelopment())
        {
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = CookieSecurePolicy.None;
        }
    })
    .AddJwtBearer("Bearer", options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = config.GetRequiredString("Jwt:Issuer"),
            ValidAudience = config.GetRequiredString("Jwt:Audience"),
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.Zero
        };
    })
    .AddScheme<ApiKeyAuthenticationOptions, ApiKeyAuthenticationHandler>(
        ApiKeyAuthenticationOptions.DefaultScheme,
        options => { })
    .AddDiscord(options =>
    {
        options.ClientId = config.GetRequiredString("Discord:ClientId");
        options.ClientSecret = config.GetRequiredString("Discord:ClientSecret");
        options.CallbackPath = "/signin-discord";
        options.Scope.Add("identify");
        options.Scope.Add("email");
        options.SaveTokens = true;
        options.SignInScheme = "Cookies";

        options.ClaimActions.MapCustomJson("urn:discord:avatar:url", user =>
        {
            var userId = user.GetString("id");
            var avatar = user.GetString("avatar");
            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(avatar))
                return null;

            // Check if avatar is animated GIF (starts with "a_")
            var extension = avatar.StartsWith("a_") ? "gif" : "png";
            return $"https://cdn.discordapp.com/avatars/{userId}/{avatar}.{extension}";
        });

        options.Events.OnTicketReceived = context =>
        {
            context.ReturnUri = "/v1.0/auth/discord/callback";
            return Task.CompletedTask;
        };
    })
    .AddSteam(options =>
    {
        options.ApplicationKey = config.GetRequiredString("Steam:ApiKey");
        options.CallbackPath = "/signin-steam";
        options.SaveTokens = true;
        options.SignInScheme = "Cookies";

        options.Events.OnTicketReceived = context =>
        {
            context.ReturnUri = "/v1.0/auth/steam/callback";
            return Task.CompletedTask;
        };
    });

services.AddAuthorizationBuilder()
    .AddPolicy(KnownAuthPolicies.AdminOnly, policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireClaim("is_admin", "true");
    });
services.AddControllers();

services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = maxChunkSizeBytes;
    options.ValueLengthLimit = int.MaxValue;
    options.ValueCountLimit = int.MaxValue;
    options.KeyLengthLimit = int.MaxValue;
});

services.AddDbContext<FilesDbContext>(options =>
{
    options.UseNpgsql(dbConnectionString);
    options
        .UseSeeding((context, _) =>
        {
            var seedService = new AdminSeedService(context, logger, config);
            seedService.SeedAdminUser();
        })
        .UseAsyncSeeding((context, _, _) =>
        {
            var seedService = new AdminSeedService(context, logger, config);
            seedService.SeedAdminUser();
            return Task.CompletedTask;
        });
    if (builder.Environment.IsDevelopment())
    {
        options.ConfigureWarnings(x => x.Ignore(RelationalEventId.PendingModelChangesWarning));
    }
});

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

services.AddSerilog(Log.Logger);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    ApplyMigration<FilesDbContext>(scope);
}

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

app.UseAuthentication();
app.UseExceptionHandler(_ => {}); // it must have empty lambda, otherwise error, more: https://github.com/dotnet/aspnetcore/issues/51888

if (securitySettings?.AllowedOrigins != null && securitySettings.AllowedOrigins.Length > 0)
{
    app.UseCors("RestrictedCors");
}

app.UseRateLimiter();
app.UseApiKeyRateLimit();
app.UseAuthorization();

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

static void ApplyMigration<TDbContext>(IServiceScope scope) where TDbContext : DbContext
{
    using var context = scope.ServiceProvider.GetRequiredService<TDbContext>();
    context.Database.EnsureDeleted();
    context.Database.EnsureCreated();
    //context.Database.Migrate();
}