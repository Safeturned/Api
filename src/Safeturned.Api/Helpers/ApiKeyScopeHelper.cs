using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Helpers;

public static class ApiKeyScopeHelper
{
    private static readonly Dictionary<ApiKeyScope, string> ScopeMap = new()
    {
        { ApiKeyScope.Read, "read" },
        { ApiKeyScope.Analyze, "analyze" },
    };

    public static string[] ScopesToArray(ApiKeyScope scopes)
    {
        return ScopeMap
            .Where(kvp => (scopes & kvp.Key) != 0)
            .Select(kvp => kvp.Value)
            .ToArray();
    }

    public static ApiKeyScope StringArrayToScopes(string[]? scopes)
    {
        if (scopes == null || scopes.Length == 0)
            return ApiKeyScope.Read | ApiKeyScope.Analyze;

        ApiKeyScope result = 0;
        foreach (var scope in scopes)
        {
            var normalized = scope.ToLowerInvariant();
            var found = ScopeMap.FirstOrDefault(kvp => kvp.Value == normalized);
            if (found.Key != 0)
            {
                result |= found.Key;
            }
        }

        return result == 0 ? (ApiKeyScope.Read | ApiKeyScope.Analyze) : result;
    }

    public static bool HasScope(ApiKeyScope scopes, string scope)
    {
        var normalized = scope.ToLowerInvariant();
        var found = ScopeMap.FirstOrDefault(kvp => kvp.Value == normalized);
        return found.Key != 0 && (scopes & found.Key) != 0;
    }
}
