namespace Safeturned.Api.Constants;

public static class ApiKeyConstants
{
    public const string LivePrefix = "sk_live";
    public const string TestPrefix = "sk_test";

    public const int KeyRandomLength = 32;
    public const int KeyLastCharsLength = 6;

    public const string DefaultScopes = "read,analyze";

    public const string WebsiteServiceName = "Website Service";
}

public static class FileConstants
{
    public const string AllowedExtension = ".dll";
    public static readonly string[] AllowedExtensions = [AllowedExtension];

    public const string ErrorMessageInvalidExtension = "Only .DLL files are allowed.";
}

public static class KnownAuthPolicies
{
    public const string AdminOnly = "AdminOnly";
}

public static class ClientConstants
{
    /// <summary>
    /// Maximum length for client tag/identifier header values.
    /// Client tags longer than this are truncated for storage/logging.
    /// </summary>
    public const int MaxClientTagLength = 50;
}
