using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Constants;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Helpers;

namespace Safeturned.Api.Database.Seeding;

public class ApiKeySeed
{
    private readonly DbContext _context;
    private readonly ILogger _logger;
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _config;

    public ApiKeySeed(DbContext context, ILogger logger, IWebHostEnvironment environment, IConfiguration config)
    {
        _context = context;
        _logger = logger.ForContext<ApiKeySeed>();
        _environment = environment;
        _config = config;
    }

    /// <summary>
    /// Seeds a Website API key if one doesn't already exist.
    /// - Development: Uses hardcoded key from configuration (reused across DB resets)
    /// - Production: Generates a new key on first run (sk_live_ prefix)
    /// </summary>
    public void SeedWebsiteApiKey()
    {
        try
        {
            const string keyName = ApiKeyConstants.WebsiteServiceName;
            var admin = _context.Set<User>().FirstOrDefault(x => x.IsAdmin);
            if (admin == null)
            {
                _logger.Warning("No admin user found, cannot seed API key");
                return;
            }

            var keyExists = _context.Set<ApiKey>().Any(x => x.Name == keyName && x.UserId == admin.Id && x.IsActive);
            if (keyExists)
            {
                _logger.Information("Website API key already exists and is active, skipping seed");
                return;
            }

            string plainTextKey;
            if (_environment.IsDevelopment())
            {
                plainTextKey = _config.GetRequiredString("ApiKeySeed:WebsiteKey");
                _logger.Information("Using development API key from configuration");
            }
            else
            {
                plainTextKey = ApiKeyHelper.GenerateApiKey(ApiKeyConstants.LivePrefix);
                _logger.Information("Generated production API key");
            }

            var keyHash = ApiKeyHelper.HashApiKey(plainTextKey);
            var prefix = ApiKeyHelper.ExtractPrefix(plainTextKey);
            var lastSixChars = plainTextKey[^ApiKeyConstants.KeyLastCharsLength..];

            var apiKey = new ApiKey
            {
                Id = Guid.NewGuid(),
                UserId = admin.Id,
                KeyHash = keyHash,
                Name = keyName,
                Prefix = prefix,
                LastSixChars = lastSixChars,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = null,
                IsActive = true,
                Scopes = ApiKeyScope.Read | ApiKeyScope.Analyze,
                IpWhitelist = null
            };

            _context.Set<ApiKey>().Add(apiKey);
            _context.SaveChanges();

            _logger.Information("Created API key for WebSite. Key: {PlainTextKey}", plainTextKey);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Failed to seed API key");
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Failed to seed API key"));
        }
    }
}
