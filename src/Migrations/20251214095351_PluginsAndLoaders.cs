using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Safeturned.Api.Migrations
{
    /// <inheritdoc />
    public partial class PluginsAndLoaders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClientTag",
                table: "ApiKeyUsages",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "LoaderReleases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Framework = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Configuration = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Version = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PackedVersion = table.Column<long>(type: "bigint", nullable: false),
                    DownloadUrl = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    Sha256 = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    SourceRepo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AssetName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsLatest = table.Column<bool>(type: "boolean", nullable: false),
                    Content = table.Column<byte[]>(type: "bytea", nullable: true),
                    ContentHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoaderReleases", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PluginInstallerReleases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Framework = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Version = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PackedVersion = table.Column<long>(type: "bigint", nullable: false),
                    DownloadUrl = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    Sha256 = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    SourceRepo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AssetName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsLatest = table.Column<bool>(type: "boolean", nullable: false),
                    Content = table.Column<byte[]>(type: "bytea", nullable: true),
                    ContentHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PluginInstallerReleases", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PluginReleases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Framework = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Version = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PackedVersion = table.Column<long>(type: "bigint", nullable: false),
                    DownloadUrl = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    Sha256 = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    SourceRepo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AssetName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsLatest = table.Column<bool>(type: "boolean", nullable: false),
                    Content = table.Column<byte[]>(type: "bytea", nullable: true),
                    ContentHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PluginReleases", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LoaderReleases_Framework_Configuration_IsLatest",
                table: "LoaderReleases",
                columns: new[] { "Framework", "Configuration", "IsLatest" });

            migrationBuilder.CreateIndex(
                name: "IX_LoaderReleases_Framework_Configuration_Version",
                table: "LoaderReleases",
                columns: new[] { "Framework", "Configuration", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PluginInstallerReleases_Framework_IsLatest",
                table: "PluginInstallerReleases",
                columns: new[] { "Framework", "IsLatest" });

            migrationBuilder.CreateIndex(
                name: "IX_PluginInstallerReleases_Framework_Version",
                table: "PluginInstallerReleases",
                columns: new[] { "Framework", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PluginReleases_Framework_IsLatest",
                table: "PluginReleases",
                columns: new[] { "Framework", "IsLatest" });

            migrationBuilder.CreateIndex(
                name: "IX_PluginReleases_Framework_Version",
                table: "PluginReleases",
                columns: new[] { "Framework", "Version" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LoaderReleases");

            migrationBuilder.DropTable(
                name: "PluginInstallerReleases");

            migrationBuilder.DropTable(
                name: "PluginReleases");

            migrationBuilder.DropColumn(
                name: "ClientTag",
                table: "ApiKeyUsages");
        }
    }
}
