namespace Safeturned.Api.Helpers;

public static class ConfigurationExtensions
{
    public static string GetRequiredString(this IConfiguration configuration, string key)
    {
        var value = configuration.GetValue<string>(key);
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"{key} configuration value is required.");
        }
        return value;
    }
    public static string GetRequiredConnectionString(this IConfiguration configuration, string name)
    {
        var value = configuration.GetConnectionString(name);
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"{name} connection string is required.");
        }
        return value;
    }
    public static string GetRequiredStorage(this IConfiguration configuration, string name)
    {
        var section = configuration.GetRequiredSection("Storages");
        return section.GetRequiredString(name);
    }
    public static string GetRequiredDiscordWebhook(this IConfiguration configuration, string name)
    {
        var section = configuration.GetRequiredSection("DiscordWebhooks");
        var value = section.GetValue<string>(name);
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"{name} discord webhook is required.");
        }
        return value;
    }
}