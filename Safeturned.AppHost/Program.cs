var builder = DistributedApplication.CreateBuilder(args);

var env = builder.AddDockerComposeEnvironment("env");

var database = builder.AddPostgres("database")
    .WithPgAdmin()
    .WithDataVolume()
    .AddDatabase("safeturned-db");

var redis = builder.AddRedis("safeturned-redis")
    .WithDataVolume();

builder.AddProject<Projects.Safeturned_Api>("safeturned-api")
    .WithReference(database)
    .WithReference(redis)
    .WaitFor(database)
    .WaitFor(redis);

builder.Build().Run();