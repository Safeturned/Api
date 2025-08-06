var builder = DistributedApplication.CreateBuilder(args);

var database = builder.AddPostgres("database")
    .WithPgAdmin()
    .WithDataVolume()
    .AddDatabase("safeturned-db");

builder.AddProject<Projects.Safeturned_Api>("safeturned-api")
    .WithReference(database)
    .WaitFor(database);

builder.Build().Run();
