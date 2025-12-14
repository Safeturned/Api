var builder = DistributedApplication.CreateBuilder(args);

var env = builder.AddDockerComposeEnvironment("env");

var postgres = builder.AddPostgres("database")
    .WithPgAdmin()
    .WithDataVolume();

var database = postgres.AddDatabase("safeturned-db");

var redis = builder.AddRedis("safeturned-redis")
    .WithDataVolume()
    .WithLifetime(ContainerLifetime.Persistent);

builder.AddProject<Projects.Safeturned_Api>("safeturned-api")
    .WithReference(database)
    .WithReference(redis)
    .WaitFor(database)
    .WaitFor(redis);

builder.Build().Run();
