using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Models;
using Sentry;
using HttpMethod = System.Net.Http.HttpMethod;

namespace Safeturned.Api.Services;

public class ApiKeyUsageLoggerService : BackgroundService
{
    private readonly Channel<ApiKeyUsageLogRequest> _channel;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger _logger;

    public ApiKeyUsageLoggerService(
        Channel<ApiKeyUsageLogRequest> channel,
        IServiceProvider serviceProvider,
        ILogger logger)
    {
        _channel = channel;
        _serviceProvider = serviceProvider;
        _logger = logger.ForContext<ApiKeyUsageLoggerService>();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.Information("API Key Usage Logger Service started");

        await foreach (var logRequest in _channel.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await LogUsageAsync(logRequest, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Error logging API key usage for {ApiKeyId}", logRequest.ApiKeyId);
                SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error logging API key usage"));
            }
        }

        _logger.Information("API Key Usage Logger Service stopped");
    }

    private async Task LogUsageAsync(ApiKeyUsageLogRequest request, CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var httpMethod = ParseHttpMethod(request.Method);
        var endpointId = await GetOrCreateEndpointIdAsync(request.Endpoint, context, cancellationToken);

        // Get UserId from the API key
        var apiKey = await context.Set<ApiKey>()
            .AsNoTracking()
            .FirstOrDefaultAsync(k => k.Id == request.ApiKeyId, cancellationToken);

        if (apiKey == null)
        {
            _logger.Warning("API key {ApiKeyId} not found, skipping usage log", request.ApiKeyId);
            return;
        }

        var usage = new ApiKeyUsage
        {
            ApiKeyId = request.ApiKeyId,
            UserId = apiKey.UserId,
            EndpointId = endpointId,
            Method = httpMethod,
            StatusCode = request.StatusCode,
            ResponseTimeMs = request.ResponseTimeMs,
            RequestedAt = DateTime.UtcNow,
            ClientIpAddress = request.ClientIp
        };

        context.Set<ApiKeyUsage>().Add(usage);
        await context.SaveChangesAsync(cancellationToken);

        _logger.Debug("Logged API key usage for {ApiKeyId} - {Method} {Endpoint}",
            request.ApiKeyId, request.Method, request.Endpoint);
    }

    private static async Task<int> GetOrCreateEndpointIdAsync(string path, FilesDbContext context, CancellationToken cancellationToken)
    {
        var endpoint = await context.Set<Database.Models.Endpoint>()
            .FirstOrDefaultAsync(e => e.Path == path, cancellationToken);

        if (endpoint != null)
            return endpoint.Id;

        endpoint = new Database.Models.Endpoint { Path = path };
        context.Set<Database.Models.Endpoint>().Add(endpoint);
        await context.SaveChangesAsync(cancellationToken);
        return endpoint.Id;
    }

    private static HttpMethodType ParseHttpMethod(string method) => method.ToUpperInvariant() switch
    {
        "GET" => HttpMethodType.Get,
        "POST" => HttpMethodType.Post,
        "PUT" => HttpMethodType.Put,
        "DELETE" => HttpMethodType.Delete,
        "PATCH" => HttpMethodType.Patch,
        "HEAD" => HttpMethodType.Head,
        "OPTIONS" => HttpMethodType.Options,
        _ => HttpMethodType.None
    };
}