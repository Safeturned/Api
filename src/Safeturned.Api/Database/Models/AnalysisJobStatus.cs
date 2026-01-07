namespace Safeturned.Api.Database.Models;

public enum AnalysisJobStatus
{
    Pending = 0,
    Processing = 1,
    Completed = 2,
    Failed = 3,
    TimedOut = 4
}
