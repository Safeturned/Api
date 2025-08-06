using DI.Engine.Template;
using DI.Service.Provide.Extensions;
using DI.Services.Abstraction;
using DI.Services.Factory;
using DI.Services.Provide;
using DI.Services.Scheme.Factory;
using DI.Services.Scheme.Read;
using DI.Services.Scheme.Read.Abstraction;
using DI.Services.Scheme.Read.Validation;
using ST.CheckingProcessor.Abstraction;
using System.Reflection;
using ST.Initializing.Abstraction;

namespace Safeturned.Api.Services;

public class FileCheckingService : IFileCheckingService
{
    private readonly IDiServiceProvider _serviceProvider;
    private readonly IModuleCheckingProcessor _moduleCheckingProcessor;
    private readonly ILogger<FileCheckingService> _logger;

    public FileCheckingService(ILogger<FileCheckingService> logger)
    {
        _logger = logger;
        _serviceProvider = CreateServiceProvider();
        _moduleCheckingProcessor = _serviceProvider.ResolveService<IModuleCheckingProcessor>() as IModuleCheckingProcessor;

        // Initialize all ST services
        InitializeServices();
    }

    public async Task<IModuleProcessingContext> CheckFileAsync(Stream fileStream)
    {
        try
        {
            _logger.LogInformation("Starting file check");

            // Reset stream position to beginning
            fileStream.Position = 0;

            var context = _moduleCheckingProcessor.Process(fileStream);

            _logger.LogInformation("File check completed. Score: {Score}, Checked: {Checked}",
                context.Score, context.Checked);

            return context;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during file check");
            throw; // Let the GlobalExceptionHandler capture with Sentry
        }
    }

    public async Task<bool> CanProcessFileAsync(Stream fileStream)
    {
        try
        {
            // Reset stream position to beginning
            fileStream.Position = 0;

            // Try to load the module to see if it's a valid .NET assembly
            using var memoryStream = new MemoryStream();
            await fileStream.CopyToAsync(memoryStream);
            memoryStream.Position = 0;

            // Try to load with dnlib to validate it's a .NET assembly
            var module = dnlib.DotNet.ModuleDefMD.Load(memoryStream);
            return module != null;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "File is not a valid .NET assembly");
            // Don't capture this in Sentry as it's expected behavior for invalid files
            return false;
        }
    }

    private IDiServiceProvider CreateServiceProvider()
    {
        var reader = CreateReader();

        // Load all ST assemblies
        var currentDir = Directory.GetCurrentDirectory();
        foreach (string file in Directory.GetFiles(currentDir, "ST.*.dll", SearchOption.TopDirectoryOnly))
        {
            try
            {
                reader.Read(Assembly.LoadFrom(file));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load ST assembly: {File}", file);
                // Don't capture this in Sentry as it's a non-critical initialization issue
            }
        }

        // Load the current assembly
        reader.Read(Assembly.GetExecutingAssembly());

        return CreateProvider(reader);
    }

    private void InitializeServices()
    {
        try
        {
            var services = _serviceProvider.ResolveServices<IStInitializable>(null,
                DI.Services.Abstraction.EDiServiceEquals.SubClassOrAssignableOrEquals, true)
                .Cast<IStInitializable>();

            foreach (var initializable in services)
            {
                initializable.Initialize();
            }

            _logger.LogInformation("ST services initialized successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize ST services");
            // Capture this in Sentry as it's a critical initialization failure
            SentrySdk.CaptureException(ex, scope => scope.SetExtra("message", "Failed to initialize ST services"));
        }
    }

    private IDiSchemeReader CreateReader()
    {
        var schemeFactory = new DiSchemeFactory();
        var validator = new DiServiceReadContextValidator();
        return new DiSchemeReader(schemeFactory, validator);
    }

    private IDiServiceProvider CreateProvider(IDiSchemeReader reader)
    {
        var engine = new DiEngineTemplate(false);
        var serviceFactory = new DiServiceFactory(engine);
        return new DiServiceProvider(serviceFactory, reader.EndRead());
    }
}