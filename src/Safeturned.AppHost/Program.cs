#pragma warning disable ASPIREPIPELINES003

var builder = DistributedApplication.CreateBuilder(args);
var runMode = builder.ExecutionContext.IsRunMode;
var config = builder.Configuration;
var environment = builder.Environment;
var imageTag = config["IMAGE_TAG_SUFFIX"] ?? "dev";

var env = builder.AddDockerComposeEnvironment("safeturned")
    .WithSshDeploySupport()
    .WithProperties(env =>
    {
        env.DefaultNetworkName = "safeturned-network";
    });

var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()
    .WithDataVolume();

if (!runMode)
{
    var dbPassword = builder.AddParameter("DatabasePassword", secret: true);
    postgres.WithPassword(dbPassword);
}

var apiDatabase = postgres.AddDatabase("db");
var botDatabase = postgres.AddDatabase("botdb");

var redis = builder.AddRedis("redis")
    .WithDataVolume()
    .WithLifetime(ContainerLifetime.Persistent);

if (!runMode)
{
    var redisPassword = builder.AddParameter("RedisPassword", secret: true);
    redis.WithPassword(redisPassword);
}

var api = builder.AddProject<Projects.Safeturned_Api>(name: "api", project => project.ExcludeLaunchProfile = true)
    .WithEnvironment("ASPNETCORE_ENVIRONMENT", environment.EnvironmentName)
    .WithReference(apiDatabase)
    .WithReference(redis)
    .WaitFor(apiDatabase)
    .WaitFor(redis);

if (runMode)
{
    api.WithHttpEndpoint(name: "http");
}
else
{
    api.WithHttpEndpoint(port: 8890, targetPort: 8890, name: "http");
}

var migrations = builder.AddProject<Projects.Safeturned_MigrationService>("migrations")
    .WithReference(botDatabase)
    .WaitFor(botDatabase)
    .WithEnvironment("DOTNET_ENVIRONMENT", environment.EnvironmentName);

var safeturnedBotApiKey = builder.AddParameter("SafeturnedBotApiKey", secret: true);

IResourceBuilder<IResourceWithEndpoints> web;
if (runMode)
{
    web = builder.AddJavaScriptApp("web", "../../web/src")
        .WithHttpEndpoint(port: 3000, env: "PORT")
        .WithEnvironment("NEXT_PUBLIC_API_URL", api.GetEndpoint("http"))
        .WithEnvironment("NEXT_PUBLIC_DISCORD_BOT_CLIENT_ID", config["Discord:BotClientId"] ?? "")
        .WithEnvironment("NEXT_TELEMETRY_DISABLED", "1")
        .WithReference(api)
        .WaitFor(api);
}
else
{
    web = builder.AddDockerfile("web", "../../web/src")
        .WithHttpEndpoint(port: 3000, targetPort: 3000, env: "PORT")
        .WithBuildArg("APP_VERSION", imageTag)
        .WithEnvironment("API_URL", api.GetEndpoint("http"))
        .WithEnvironment("NEXT_PUBLIC_DISCORD_BOT_CLIENT_ID", "1436734963125981354")
        .WithReference(api)
        .WaitFor(api);
}

var discordBot = builder.AddProject<Projects.Safeturned_DiscordBot>("discordbot")
    .WithReference(botDatabase)
    .WaitForCompletion(migrations)
    .WaitFor(botDatabase)
    .WaitFor(api)
    .WithReference(api)
    .WithEnvironment("DOTNET_ENVIRONMENT", environment.EnvironmentName)
    .WithEnvironment("SafeturnedApiUrl", api.GetEndpoint("http"))
    .WithEnvironment("SafeturnedBotApiKey", safeturnedBotApiKey);

if (runMode)
{
    discordBot.WithEnvironment("SafeturnedWebUrl", web.GetEndpoint("http"));
}
else
{
    discordBot.WithEnvironment("SafeturnedWebUrl", "https://safeturned.com");
}

if (!string.IsNullOrEmpty(imageTag))
{
    api.WithImagePushOptions(o => o.Options.RemoteImageTag = imageTag);
    migrations.WithImagePushOptions(o => o.Options.RemoteImageTag = imageTag);
    discordBot.WithImagePushOptions(o => o.Options.RemoteImageTag = imageTag);
    if (!runMode)
    {
        web.WithImagePushOptions(o => o.Options.RemoteImageTag = imageTag);
    }
}

builder.Build().Run();
