using Safeturned.Api.Clients.FileChecker;

namespace Safeturned.Api.Services;

public class FileCheckingService(IFileCheckerClient fileCheckerClient, ILogger logger) : IFileCheckingService
{
    private readonly ILogger _logger = logger.ForContext<FileCheckingService>();

    public async Task<FileCheckResult> CheckFileAsync(Stream fileStream, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.Information("Starting file check via FileChecker service");
            fileStream.Position = 0;

            var result = await fileCheckerClient.AnalyzeAsync(fileStream, cancellationToken);

            _logger.Information("File check completed. Score: {Score}, Checked: {Checked}", result.Score, result.Checked);
            return result;
        }
        catch (OperationCanceledException)
        {
            _logger.Information("File check was cancelled");
            throw;
        }
        catch (HttpRequestException ex)
        {
            _logger.Error(ex, "Failed to communicate with FileChecker service");
            throw;
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error during file check");
            throw;
        }
    }

    public async Task<bool> CanProcessFileAsync(Stream fileStream, CancellationToken cancellationToken = default)
    {
        try
        {
            fileStream.Position = 0;
            return await fileCheckerClient.ValidateAsync(fileStream, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            _logger.Debug("File validation was cancelled");
            return false;
        }
        catch (Exception ex)
        {
            _logger.Debug(ex, "File validation failed");
            return false;
        }
    }

    public async Task<string> GetVersionAsync(CancellationToken cancellationToken = default)
    {
        return await fileCheckerClient.GetVersionAsync(cancellationToken);
    }
}
