namespace Safeturned.Api.Clients.FileChecker;

public record FileCheckResult(
    float Score,
    string? Message,
    bool Checked,
    string Version,
    object? Results,
    AssemblyMetadata? Metadata
);

public record AssemblyMetadata
{
    public string? Company { get; init; }
    public string? Product { get; init; }
    public string? Title { get; init; }
    public string? Copyright { get; init; }
    public string? Guid { get; init; }
}

public record FileValidationResult(bool Valid);
