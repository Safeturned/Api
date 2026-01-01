namespace Safeturned.Api.Models;

public enum ResponseMessageType
{
    FileRetrievedFromDatabase,
    NewFileProcessedSuccessfully,
    FileAlreadyUploadedSkippedAnalysis,
    FileReanalyzedSuccessfully,
    FileNotDotNetAssembly,
    UnknownError
}
