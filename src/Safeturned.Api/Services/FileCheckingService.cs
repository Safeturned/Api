using dnlib.DotNet;
using Safeturned.FileChecker;
using Safeturned.FileChecker.Modules;

namespace Safeturned.Api.Services;

public class FileCheckingService : IFileCheckingService
{
    private readonly ILogger _logger;

    public FileCheckingService(ILogger logger)
    {
        _logger = logger.ForContext<FileCheckingService>();
    }

    public async Task<IModuleProcessingContext> CheckFileAsync(Stream fileStream, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.Information("Starting file check");
            fileStream.Position = 0;
            var context = Checker.Process(fileStream);
            _logger.Information("File check completed. Score: {Score}, Checked: {Checked}", context.Score, context.Checked);
            return context;
        }
        catch (OperationCanceledException)
        {
            _logger.Information("File check was cancelled");
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
            using var memoryStream = new MemoryStream();
            await fileStream.CopyToAsync(memoryStream, cancellationToken);
            memoryStream.Position = 0;
            var module = ModuleDefMD.Load(memoryStream);
            return module != null;
        }
        catch (OperationCanceledException)
        {
            _logger.Debug("File processing was cancelled");
            return false;
        }
        catch (Exception ex)
        {
            _logger.Debug(ex, "File is not a valid .NET assembly");
            return false;
        }
    }
}