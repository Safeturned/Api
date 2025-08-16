using dnlib.DotNet;
using Safeturned.FileChecker;
using Safeturned.FileChecker.Modules;
using ILogger = Serilog.ILogger;

namespace Safeturned.Api.Services;

public class FileCheckingService : IFileCheckingService
{
    private readonly ILogger _logger;

    public FileCheckingService(ILogger logger)
    {
        _logger = logger.ForContext<FileCheckingService>();
    }

    public async Task<IModuleProcessingContext> CheckFileAsync(Stream fileStream)
    {
        try
        {
            _logger.Information("Starting file check");
            fileStream.Position = 0;
            var context = Checker.Process(fileStream);
            _logger.Information("File check completed. Score: {Score}, Checked: {Checked}", context.Score, context.Checked);
            return context;
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error during file check");
            throw; // Let the GlobalExceptionHandler capture with Sentry
        }
    }

    public async Task<bool> CanProcessFileAsync(Stream fileStream)
    {
        try
        {
            fileStream.Position = 0;
            using var memoryStream = new MemoryStream();
            await fileStream.CopyToAsync(memoryStream);
            memoryStream.Position = 0;
            var module = ModuleDefMD.Load(memoryStream);
            return module != null;
        }
        catch (Exception ex)
        {
            _logger.Debug(ex, "File is not a valid .NET assembly");
            // Don't capture this in Sentry as it's expected behavior for invalid files
            return false;
        }
    }
}