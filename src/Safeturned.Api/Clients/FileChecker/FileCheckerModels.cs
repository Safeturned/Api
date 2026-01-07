namespace Safeturned.Api.Clients.FileChecker;

public record FileCheckResult
{
    public float Score { get; init; }
    public string Version { get; init; } = string.Empty;
    public FeatureResult[]? Features { get; init; }
    public AssemblyMetadata? Metadata { get; init; }
}

public record FeatureResult
{
    public string Name { get; init; } = string.Empty;
    public float Score { get; init; }
    public List<FeatureMessage>? Messages { get; init; }
}

public record FeatureMessage
{
    public string Text { get; init; } = string.Empty;
}

public record AssemblyMetadata
{
    public string? Company { get; init; }
    public string? Product { get; init; }
    public string? Title { get; init; }
    public string? Copyright { get; init; }
    public string? Guid { get; init; }
}

public record FileValidationResult(bool Valid);
