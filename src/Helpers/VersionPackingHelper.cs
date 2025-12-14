namespace Safeturned.Api.Helpers;

public static class VersionPackingHelper
{
    public static uint Pack(string? version)
    {
        if (string.IsNullOrWhiteSpace(version))
        {
            return 0;
        }

        var parts = version.Split('.');
        var major = parts.Length > 0 && uint.TryParse(parts[0], out var ma) ? ma : 0;
        var minor = parts.Length > 1 && uint.TryParse(parts[1], out var mi) ? mi : 0;
        var patch = parts.Length > 2 && uint.TryParse(parts[2], out var pa) ? pa : 0;

        return (major << 16) | (minor << 8) | patch;
    }
}
