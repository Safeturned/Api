var builder = DistributedApplication.CreateBuilder(args);

var env = builder.AddDockerComposeEnvironment("env");

var database = builder.AddPostgres("database")
    .WithPgAdmin()
    .WithDataVolume()
    .AddDatabase("safeturned-db");

builder.AddProject<Projects.Safeturned_Api>("safeturned-api")
    .WithHttpHealthCheck("/health")
    .WithReference(database)
    .WaitFor(database);

builder.Build().Run();
