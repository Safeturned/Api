using ST.CheckingProcessor.Abstraction;

namespace Safeturned.Api.Services;

public interface IFileCheckingService
{
    /// <summary>
    /// Checks a file stream and returns the processing context with results
    /// </summary>
    /// <param name="fileStream">The file stream to check</param>
    /// <returns>The processing context containing the check results</returns>
    Task<IModuleProcessingContext> CheckFileAsync(Stream fileStream);
    
    /// <summary>
    /// Checks if the file is a valid .NET assembly that can be processed
    /// </summary>
    /// <param name="fileStream">The file stream to validate</param>
    /// <returns>True if the file can be processed, false otherwise</returns>
    Task<bool> CanProcessFileAsync(Stream fileStream);
} 