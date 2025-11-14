using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Safeturned.Api.Models;
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
            }
        }

        _logger.Information("API Key Usage Logger Service stopped");
    }

    private async Task LogUsageAsync(ApiKeyUsageLogRequest request, CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

        var httpMethod = ParseHttpMethod(request.Method);
        var endpointId = EndpointRegistry.GetOrCreateEndpointId(request.Endpoint);

        var usage = new ApiKeyUsage
        {
            ApiKeyId = request.ApiKeyId,
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

    private static HttpMethodType ParseHttpMethod(string method) => method.ToUpperInvariant() switch
    {
        "GET" => HttpMethodType.Get,
        "POST" => HttpMethodType.Post,
        "PUT" => HttpMethodType.Put,
        "DELETE" => HttpMethodType.Delete,
        "PATCH" => HttpMethodType.Patch,
        "HEAD" => HttpMethodType.Head,
        "OPTIONS" => HttpMethodType.Options,
        _ => HttpMethodType.Get
    };
}
