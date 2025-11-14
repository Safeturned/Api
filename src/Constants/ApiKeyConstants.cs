namespace Safeturned.Api.Constants;

public static class ApiKeyConstants
{
    public const string LivePrefix = "sk_live_";
    public const string TestPrefix = "sk_test_";

    public const int KeyRandomLength = 32;
    public const int KeyLastCharsLength = 6;

    public const string DefaultScopes = "read,analyze";
}

public static class FileConstants
{
    public const string AllowedExtension = ".dll";
    public static readonly string[] AllowedExtensions = { ".dll" };

    public const string ErrorMessageInvalidExtension = "Only .DLL files are allowed.";
}

public static class HttpMethodConstants
{
    public const string Get = "GET";
    public const string Post = "POST";
    public const string Put = "PUT";
    public const string Delete = "DELETE";
    public const string Patch = "PATCH";
    public const string Head = "HEAD";
    public const string Options = "OPTIONS";
}

public static class KnownAuthPolicies
{
    public const string AdminOnly = "AdminOnly";
}

public static class AuthConstants
{
    public const string BearerScheme = "Bearer";
    public const string ApiKeyScheme = "ApiKey";
}