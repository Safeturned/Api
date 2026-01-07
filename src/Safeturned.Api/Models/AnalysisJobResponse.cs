using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Models;

public record AnalysisJobSubmitResponse(
    Guid JobId,
    AnalysisJobStatus Status,
    ResponseMessageType MessageType
);

public record AnalysisJobStatusResponse(
    Guid JobId,
    AnalysisJobStatus Status,
    DateTime CreatedAt,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    FileCheckResponse? Result,
    string? ErrorMessage
);

public record FileUploadAsyncFallbackResponse(
    string Message,
    Guid JobId,
    string PollUrl
);
