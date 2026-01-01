namespace Safeturned.Api.Models;

public record FileCheckResponse(
    string FileName,
    string FileHash,
    float Score,
    bool Checked,
    ResponseMessageType MessageType,
    DateTime ProcessedAt,
    DateTime LastScanned,
    long FileSizeBytes,
    string? AnalyzerVersion,
    string[]? CheckedItems,
    string? AssemblyCompany,
    string? AssemblyProduct,
    string? AssemblyTitle,
    string? AssemblyGuid,
    string? AssemblyCopyright
);