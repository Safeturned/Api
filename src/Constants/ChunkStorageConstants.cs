using Microsoft.AspNetCore.HttpOverrides;

namespace Safeturned.Api.Constants;

public static class ChunkStorageConstants
{
    public const string ChunkFileNameFormat = "chunk_{0:D3}.dat";
    public const string FinalFileName = "final_file.dat";

    public const int ChunkFileNamePadding = 3;

    public const int DefaultFileBufferSize = 4096;

    public const int FileSystemSettleDelayMs = 10;
}

public static class NetworkConstants
{
    public const string CloudflareIpHeader = "CF-CONNECTING-IP";

    public static string ForwardedForHeader => ForwardedHeadersDefaults.XForwardedForHeaderName;
    public static string ForwardedHostHeader => ForwardedHeadersDefaults.XForwardedHostHeaderName;

    public const string LocalhostIpV6 = "::1";
    public const string LocalhostIpV4 = "127.0.0.1";
    public const string UnknownIpAddress = "unknown";
}

public static class HttpContextItemKeys
{
    public const string UserId = "UserId";
    public const string ApiKeyId = "ApiKeyId";
    public const string User = "User";
    public const string ApiKey = "ApiKey";
    public const string ClientTag = "ClientTag";
}
