using System.Globalization;
using System.Text;
using System.Threading.Channels;
using System.Threading.RateLimiting;
using Asp.Versioning;
using Hangfire;
using Hangfire.Console;
using Hangfire.PostgreSql;
using HangfireBasicAuthenticationFilter;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Primitives;
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
services.AddAuthentication(AuthConstants.BearerScheme)
    .AddCookie(AuthConstants.CookieScheme, options =>
    {
        options.Cookie.Name = AuthConstants.OAuthCookie;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(5);
        options.SlidingExpiration = false;
        options.Cookie.HttpOnly = true;
        if (builder.Environment.IsProduction())
        {
            options.Cookie.SameSite = SameSiteMode.Strict;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        }
        else
        {
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = CookieSecurePolicy.None;
        }
    })
    .AddJwtBearer(AuthConstants.BearerScheme, options =>
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

        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                logger.Warning("JWT authentication failed for {Path}: {Error}",
                    context.Request.Path, context.Exception.Message);

                if (context.Exception is SecurityTokenExpiredException)
                {
                    logger.Information("JWT token expired at {ExpiredAt}",
                        ((SecurityTokenExpiredException)context.Exception).Expires);
                }

                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                var userId = context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                logger.Debug("JWT token validated successfully for user {UserId} on path {Path}",
                    userId, context.Request.Path);
                return Task.CompletedTask;
            },
            OnMessageReceived = context =>
            {
                var hasAuthHeader = context.Request.Headers.ContainsKey("Authorization");

                if (!hasAuthHeader && context.Request.Cookies.TryGetValue(AuthConstants.AccessTokenCookie, out var token))
                {
                    context.Token = token;
                    logger.Debug("JWT token extracted from cookie for path {Path}", context.Request.Path);
                }
                else if (hasAuthHeader)
                {
                    logger.Debug("JWT token from Authorization header for path {Path}", context.Request.Path);
                }
                else
                {
                    logger.Debug("No JWT token found (neither in header nor cookie) for path {Path}", context.Request.Path);
                }

                return Task.CompletedTask;
            }
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
        options.SaveTokens = false;
        options.SignInScheme = AuthConstants.CookieScheme;

        options.ClaimActions.MapCustomJson("urn:discord:avatar:url", user =>
        {
            var avatar = user.GetString("avatar");
            return string.Format(
                CultureInfo.InvariantCulture,
                "https://cdn.discordapp.com/avatars/{0}/{1}.{2}?size=1024",
                user.GetString("id"),
                avatar,
                avatar.StartsWith("a_") ? "gif" : "png"
            );
        });

        options.Events.OnRedirectToAuthorizationEndpoint = context =>
        {
            if (context.Properties?.Items.TryGetValue("returnUrl", out var returnUrl) == true)
            {
                var state = context.Properties.Items.TryGetValue("state", out var existingState)
                    ? existingState
                    : Guid.NewGuid().ToString();
                context.Properties.Items["state"] = $"{state}|{returnUrl}";
            }
            return Task.CompletedTask;
        };
    })
    .AddSteam(options =>
    {
        options.ApplicationKey = config.GetRequiredString("Steam:ApiKey");
        options.CallbackPath = "/signin-steam";
        options.SaveTokens = false;
        options.SignInScheme = AuthConstants.CookieScheme;
    });

var allowedOrigins = config.GetSection("Security:AllowedOrigins").Get<string[]>();
services.AddCors(options =>
{
    if (allowedOrigins != null && allowedOrigins.Length > 0)
    {
        options.AddPolicy("RestrictedCors", builder =>
        {
            builder
                .WithOrigins(allowedOrigins)
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        });
    }
});

services.AddAuthorizationBuilder()
    .AddPolicy(KnownAuthPolicies.AdminOnly, policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireClaim(AuthConstants.IsAdminClaim, "true");
    });

services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "__Secure-Csrf";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;

    if (!builder.Environment.IsDevelopment())
    {
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    }
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

app.Use(async (context, next) =>
{
    var hasCookie = context.Request.Cookies.TryGetValue(AuthConstants.AccessTokenCookie, out var token);
    var hasApiKeyHeader = context.Request.Headers.ContainsKey(AuthConstants.ApiKeyHeader);

    if (hasCookie && !hasApiKeyHeader)
    {
        context.Request.Headers.Authorization = new StringValues($"{AuthConstants.BearerScheme} {token}");
        logger.Debug("Extracted JWT from cookie for path {Path}, token length: {TokenLength}",
            context.Request.Path, token?.Length ?? 0);
    }
    else if (!hasCookie && !hasApiKeyHeader)
    {
        logger.Debug("No auth cookie or API key header found for path {Path}", context.Request.Path);
    }

    await next();
});

app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

    if (!app.Environment.IsDevelopment())
    {
        context.Response.Headers.Append("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }

    await next();
});

if (allowedOrigins != null && allowedOrigins.Length > 0)
{
    app.UseCors("RestrictedCors");
}

app.UseAuthentication();

app.Use(async (context, next) =>
{
    if (context.Request.Headers.ContainsKey(AuthConstants.ApiKeyHeader))
    {
        var result = await context.AuthenticateAsync(AuthConstants.ApiKeyScheme);
        if (result.Succeeded)
        {
            context.User = result.Principal;
        }
    }
    await next();
});

app.UseExceptionHandler(_ => {});

app.UseApiKeyRateLimit();
app.UseAntiforgery();
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