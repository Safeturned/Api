namespace Safeturned.Api.Models;

public class SecuritySettings
{
    public string[] AllowedOrigins { get; set; } = [];
    public bool RequireApiKey { get; set; } = true;
    public bool RequireOriginValidation { get; set; } = true;
}