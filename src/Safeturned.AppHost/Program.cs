#pragma warning disable ASPIREPIPELINES003

using Aspire.Hosting.Docker.Resources.ServiceNodes.Swarm;

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

var fileCheckerLocalPath = Path.GetFullPath(Path.Combine(builder.AppHostDirectory, "../../FileChecker/src"));
var useLocalFileChecker = runMode && Directory.Exists(fileCheckerLocalPath);

IResourceBuilder<ContainerResource> fileChecker;
if (useLocalFileChecker)
{
    var checkerVersion = config["CHECKER_VERSION"] ?? $"{DateTime.UtcNow:yyyy.M.d}.0";
    var checkerVersionSuffix = config["CHECKER_VERSION_SUFFIX"] ?? "-dev";
    fileChecker = builder.AddDockerfile("filechecker", "../../FileChecker/src", "Safeturned.FileChecker.Service/Dockerfile")
        .WithBuildArg("CHECKER_VERSION", checkerVersion)
        .WithBuildArg("CHECKER_VERSION_SUFFIX", checkerVersionSuffix)
        .WithHttpEndpoint(targetPort: 5080, name: "http");
}
else
{
    fileChecker = builder.AddContainer("filechecker", "ghcr.io/safeturned/safeturned-filechecker:latest")
        .WithHttpEndpoint(targetPort: 5080, name: "http");
}

if (!runMode)
{
    fileChecker.PublishAsDockerComposeService((resource, service) =>
    {
        service.Deploy = new Deploy
        {
            Replicas = 3,
            UpdateConfig = new UpdateConfig
            {
                Parallelism = "1",
                Delay = "10s",
                Order = "start-first"
            }
        };
    });

    builder.AddContainer("watchtower", "nickfedor/watchtower")
        .WithBindMount("/var/run/docker.sock", "/var/run/docker.sock")
        .WithArgs("--interval", "300", "--cleanup", "filechecker");
}

var api = builder.AddProject<Projects.Safeturned_Api>("api", project => project.ExcludeLaunchProfile = true)
    .WithEnvironment("ASPNETCORE_ENVIRONMENT", environment.EnvironmentName)
    .WithReference(apiDatabase)
    .WithReference(redis)
    .WithEnvironment("FileChecker__Url", fileChecker.GetEndpoint("http"))
    .WaitFor(apiDatabase)
    .WaitFor(redis)
    .WaitFor(fileChecker);

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
