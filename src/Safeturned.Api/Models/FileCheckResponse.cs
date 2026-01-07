namespace Safeturned.Api.Models;

public record FileCheckResponse(
    string FileName,
    string FileHash,
    float Score,
    ResponseMessageType MessageType,
    DateTime ProcessedAt,
    DateTime LastScanned,
    long FileSizeBytes,
    string? AnalyzerVersion,
    FeatureResultResponse[]? Features,
    string? AssemblyCompany,
    string? AssemblyProduct,
    string? AssemblyTitle,
    string? AssemblyGuid,
    string? AssemblyCopyright
);

public record FeatureResultResponse(
    string Name,
    float Score,
    List<string>? Messages
);

public record FeatureMessageResponse(string Text);