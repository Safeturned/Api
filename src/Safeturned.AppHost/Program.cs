var builder = DistributedApplication.CreateBuilder(args);
var config = builder.Configuration;
var environment = builder.Environment;

var env = builder.AddDockerComposeEnvironment("env");

var postgres = builder.AddPostgres("database")
    .WithPgAdmin()
    .WithDataVolume();

var apiDatabase = postgres.AddDatabase("safeturned-db");
var botDatabase = postgres.AddDatabase("safeturned-botdb");

var redis = builder.AddRedis("safeturned-redis")
    .WithDataVolume()
    .WithLifetime(ContainerLifetime.Persistent);

var api = builder.AddProject<Projects.Safeturned_Api>("safeturned-api")
    .WithReference(apiDatabase)
    .WithReference(redis)
    .WaitFor(apiDatabase)
    .WaitFor(redis);

var migrations = builder.AddProject<Projects.Safeturned_MigrationService>("safeturned-migrations")
    .WithReference(botDatabase)
    .WaitFor(botDatabase)
    .WithEnvironment("DOTNET_ENVIRONMENT", environment.EnvironmentName);

var runMode = builder.ExecutionContext.IsRunMode;

IResourceBuilder<IResourceWithEndpoints> web;
if (runMode)
{
    web = builder.AddJavaScriptApp("safeturned-web", "../../web/src")
        .WithHttpEndpoint(port: 3000, env: "PORT")
        .WithEnvironment("NEXT_PUBLIC_API_URL", api.GetEndpoint("http"))
        .WithEnvironment("NEXT_PUBLIC_DISCORD_BOT_CLIENT_ID", config["Discord:BotClientId"] ?? "")
        .WithEnvironment("NEXT_TELEMETRY_DISABLED", "1")
        .WithReference(api)
        .WaitFor(api);
}
else
{
    web = builder.AddDockerfile("safeturned-web", "../../web/src")
        .WithHttpEndpoint(port: 3000, targetPort: 3000, env: "PORT")
        .WithBuildArg("APP_VERSION", Environment.GetEnvironmentVariable("APP_VERSION") ?? "dev")
        .WithEnvironment("API_URL", api.GetEndpoint("http"))
        .WithEnvironment("NEXT_PUBLIC_DISCORD_BOT_CLIENT_ID", "1436734963125981354")
        .WithReference(api)
        .WaitFor(api);
}

builder.AddProject<Projects.Safeturned_DiscordBot>("safeturned-discordbot")
    .WithReference(botDatabase)
    .WaitForCompletion(migrations)
    .WaitFor(botDatabase)
    .WaitFor(api)
    .WithReference(api)
    .WithEnvironment("DOTNET_ENVIRONMENT", environment.EnvironmentName)
    .WithEnvironment("SafeturnedApiUrl", api.GetEndpoint("http"))
    .WithEnvironment("SafeturnedBotApiKey", config["Discord:BotApiKey"] ?? "")
    .WithEnvironment("SafeturnedWebUrl", web.GetEndpoint("http"));

builder.Build().Run();
