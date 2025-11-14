namespace Safeturned.Api.Models;

public class SecuritySettings
{
    public string ApiKey { get; set; } = string.Empty;
    public string[] AllowedOrigins { get; set; } = [];
    public bool RequireApiKey { get; set; } = true;
    public bool RequireOriginValidation { get; set; } = true;
}