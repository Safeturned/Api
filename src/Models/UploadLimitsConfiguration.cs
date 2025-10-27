namespace Safeturned.Api.Models;

/// <summary>
/// Configuration model for upload limits and restrictions
/// </summary>
public class UploadLimitsConfiguration
{
    /// <summary>
    /// Maximum file size allowed for upload (in bytes)
    /// Must be configured - no default value
    /// </summary>
    public long MaxFileSizeBytes { get; set; }
    
    /// <summary>
    /// Maximum number of chunks allowed per upload session
    /// Must be configured - no default value
    /// </summary>
    public int MaxChunksPerSession { get; set; }
    
    /// <summary>
    /// Default chunk size for chunked uploads (in bytes)
    /// Must be configured - no default value
    /// </summary>
    public int DefaultChunkSizeBytes { get; set; }
    
    /// <summary>
    /// Maximum chunk size allowed (in bytes)
    /// Must be configured - no default value
    /// </summary>
    public int MaxChunkSizeBytes { get; set; }
    
    /// <summary>
    /// Buffer size for file operations (in bytes)
    /// Must be configured - no default value
    /// </summary>
    public int FileBufferSize { get; set; }
    
    /// <summary>
    /// Session expiration time in hours
    /// Must be configured - no default value
    /// </summary>
    public int SessionExpirationHours { get; set; }
    
    /// <summary>
    /// Maximum concurrent upload sessions per IP
    /// Must be configured - no default value
    /// </summary>
    public int MaxConcurrentSessionsPerIp { get; set; }
}
