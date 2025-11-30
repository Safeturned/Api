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
    public Guid UserId { get; set; }

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

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(EndpointId))]
    public Endpoint Endpoint { get; set; } = null!;
}

public enum HttpMethodType
{
    None = 0,
    Get = 1,
    Post = 2,
    Put = 3,
    Delete = 4,
    Patch = 5,
    Head = 6,
    Options = 7
}