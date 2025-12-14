namespace Safeturned.Api.Constants;

public static class AuthConstants
{
    public const string ApiKeyScheme = "ApiKey";
    public const string BearerScheme = "Bearer";
    public const string CookieScheme = "Cookies";

    public const string TierClaim = "tier";
    public const string ApiKeyIdClaim = "api_key_id";
    public const string ScopesClaim = "scopes";
    public const string IsAdminClaim = "is_admin";
    public const string UsernameClaim = "username";
    public const string AvatarUrlClaim = "avatar_url";

    public const string SubClaim = "sub";

    public const string AccessTokenCookie = "access_token";
    public const string RefreshTokenCookie = "refresh_token";
    public const string OAuthCookie = "safeturned_oauth";

    public const string ApiKeyHeader = "X-API-Key";
    public const string AuthorizationHeader = "Authorization";
    public const string ClientHeader = "X-Client";
}
