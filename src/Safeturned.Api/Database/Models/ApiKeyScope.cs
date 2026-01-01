namespace Safeturned.Api.Database.Models;

[Flags]
public enum ApiKeyScope
{
    Read = 1,
    Analyze = 2,
}