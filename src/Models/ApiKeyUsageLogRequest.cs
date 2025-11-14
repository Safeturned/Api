namespace Safeturned.Api.Models;

public record ApiKeyUsageLogRequest(
    Guid ApiKeyId,
    string Endpoint,
    string Method,
    int StatusCode,
    int ResponseTimeMs,
    string? ClientIp
);