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

public static class KnownAuthPolicies
{
    public const string AdminOnly = "AdminOnly";
}