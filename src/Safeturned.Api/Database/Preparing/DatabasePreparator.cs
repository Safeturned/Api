using DbUp;
using DbUp.Builder;
using DbUp.Engine.Output;

namespace Safeturned.Api.Database.Preparing;

public enum DbPrepareType
{
    MySql,
    PostgreSql,
}

public class DatabasePreparator
{
    private readonly IUpgradeLog _upgradeLogger;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<DatabasePreparator> _logger;
    private readonly Dictionary<string, PrepareDatabase> _databases = [];

    public DatabasePreparator(ILoggerFactory loggerFactory, IWebHostEnvironment environment)
    {
        _upgradeLogger = new MicrosoftUpgradeLog(loggerFactory);
        _environment = environment;
        _logger = loggerFactory.CreateLogger<DatabasePreparator>();
    }

    public DatabasePreparator Add(string name, string connectionString, DbPrepareType dbPrepareType, bool ensureExists,
        Func<string, bool>? migrationFilter = null)
    {
        _databases.Add(name, new PrepareDatabase(name, connectionString, dbPrepareType, ensureExists, migrationFilter));
        return this;
    }

    public void Prepare()
    {
        OutputInfo();
        EnsureExists();
        if (_environment.IsProduction())
        {
            Migrate();
        }
        _databases.Clear();
    }

    private void OutputInfo()
    {
        _logger.LogInformation("{0} databases are going to be prepared", _databases.Count);
        foreach (var (_, database) in _databases)
        {
            _logger.LogInformation("Database is going to be prepared: {0}", database);
        }
    }

    private void EnsureExists()
    {
        foreach (var (name, database) in _databases)
        {
            try
            {
                if (!database.EnsureExists)
                {
                    continue;
                }

                _logger.LogInformation("Ensuring database exists: \"{0}\"", name);

                if (database.DbPrepareType == DbPrepareType.MySql)
                {
                    EnsureDatabase.For.MySqlDatabase(database.ConnectionString, _upgradeLogger);
                }
                else if (database.DbPrepareType == DbPrepareType.PostgreSql)
                {
                    EnsureDatabase.For.PostgresqlDatabase(database.ConnectionString, _upgradeLogger);
                }
                else
                {
                    throw new InvalidOperationException($"Unsupported DB Prepare type: {database.DbPrepareType}");
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to ensure database exists: \"{name}\"", ex);
            }
        }
    }

    private void Migrate()
    {
        foreach (var (name, database) in _databases)
        {
            try
            {
                var filter = database.MigrationFilter;
                if (filter == null)
                {
                    continue;
                }

                _logger.LogInformation("Migrating database: \"{0}\"", name);

                UpgradeEngineBuilder upgradeEngine;
                if (database.DbPrepareType == DbPrepareType.MySql)
                {
                    upgradeEngine = DeployChanges.To.MySqlDatabase(database.ConnectionString);
                }
                else if (database.DbPrepareType == DbPrepareType.PostgreSql)
                {
                    upgradeEngine = DeployChanges.To.PostgresqlDatabase(database.ConnectionString);
                }
                else
                {
                    throw new InvalidOperationException($"Unsupported DB Prepare type: {database.DbPrepareType}");
                }

                var upgrader = upgradeEngine
                    .WithScriptsEmbeddedInAssembly(AssemblyReference.Assembly, filter)
                    .LogTo(_upgradeLogger)
                    .LogScriptOutput()
                    .Build();
                if (upgrader.IsUpgradeRequired())
                {
                    var result = upgrader.PerformUpgrade();
                    if (!result.Successful)
                    {
                        throw new InvalidOperationException("Failed to apply migration.", result.Error);
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to migrate database: \"{name}\"", ex);
            }
        }
    }
}

public class PrepareDatabase
{
    public PrepareDatabase(string name, string connectionString, DbPrepareType dbPrepareType, bool ensureExists,
        Func<string, bool>? migrationFilter)
    {
        Name = name;
        ConnectionString = connectionString;
        DbPrepareType = dbPrepareType;
        EnsureExists = ensureExists;
        MigrationFilter = migrationFilter;
    }

    public string Name { get; }
    public string ConnectionString { get; }
    public DbPrepareType DbPrepareType { get; }
    public bool EnsureExists { get; }
    public Func<string, bool>? MigrationFilter { get; }

    public override string ToString()
    {
        var migrationFilterText = MigrationFilter != null
            ? "yes"
            : "no";
        var ensureExistsText = EnsureExists
            ? "yes"
            : "no";
        return
            $"Name: {Name}, ConnectionString Length: {ConnectionString.Length}, EnsureExists: {ensureExistsText}, MigrationFilter: {migrationFilterText}";
    }
}