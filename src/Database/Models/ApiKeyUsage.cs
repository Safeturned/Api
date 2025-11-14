using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Safeturned.Api.Database.Models;

public class ApiKeyUsage
{
    [Key]
    public long Id { get; set; }

    [Required]
    public Guid ApiKeyId { get; set; }

    [Required]
    public int EndpointId { get; set; }

    [Required]
    public HttpMethodType Method { get; set; }

    public int StatusCode { get; set; }

    public int ResponseTimeMs { get; set; }

    [Required]
    public DateTime RequestedAt { get; set; }

    [MaxLength(50)]
    public string? ClientIpAddress { get; set; }

    [ForeignKey(nameof(ApiKeyId))]
    public ApiKey ApiKey { get; set; } = null!;
}

public enum HttpMethodType : byte
{
    Get = 1,
    Post = 2,
    Put = 3,
    Delete = 4,
    Patch = 5,
    Head = 6,
    Options = 7
}

public static class EndpointRegistry
{
    private static readonly Dictionary<string, int> EndpointToId = new();
    private static readonly Dictionary<int, string> IdToEndpoint = new();
    private static int _nextId = 1;
    private static readonly Lock Lock = new();

    public static int GetOrCreateEndpointId(string endpoint)
    {
        lock (Lock)
        {
            if (EndpointToId.TryGetValue(endpoint, out var id))
                return id;

            id = _nextId++;
            EndpointToId[endpoint] = id;
            IdToEndpoint[id] = endpoint;
            return id;
        }
    }

    public static string? GetEndpoint(int id)
    {
        lock (Lock)
        {
            return IdToEndpoint.TryGetValue(id, out var endpoint) ? endpoint : null;
        }
    }
}