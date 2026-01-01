namespace Safeturned.Api.Scripts.Files;

public static class DbReference
{
    public static Func<string, bool> Filter =>
        x => x.StartsWith(typeof(DbReference).Namespace!, StringComparison.InvariantCulture);
}