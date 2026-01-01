using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Safeturned.Api.Migrations
{
    /// <inheritdoc />
    public partial class Dotnet10 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ApiKeyId",
                table: "Scans",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FileHash",
                table: "Scans",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Scans",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AnalyzerVersion",
                table: "Files",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ApiKeyId",
                table: "Files",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AssemblyCompany",
                table: "Files",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AssemblyCopyright",
                table: "Files",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AssemblyGuid",
                table: "Files",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AssemblyProduct",
                table: "Files",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AssemblyTitle",
                table: "Files",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Files",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Endpoints",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Path = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Endpoints", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Tier = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsAdmin = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ApiKeys",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    KeyHash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Prefix = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    LastSixChars = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastUsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Scopes = table.Column<int>(type: "integer", nullable: false),
                    IpWhitelist = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApiKeys", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApiKeys_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Badges",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    LinkedFileHash = table.Column<string>(type: "text", nullable: false),
                    UpdateSalt = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    UpdateToken = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    RequireTokenForUpdate = table.Column<bool>(type: "boolean", nullable: false),
                    TrackedAssemblyCompany = table.Column<string>(type: "text", nullable: true),
                    TrackedAssemblyProduct = table.Column<string>(type: "text", nullable: true),
                    TrackedAssemblyGuid = table.Column<string>(type: "text", nullable: true),
                    TrackedFileName = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    VersionUpdateCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Badges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Badges_Files_LinkedFileHash",
                        column: x => x.LinkedFileHash,
                        principalTable: "Files",
                        principalColumn: "Hash",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Badges_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsRevoked = table.Column<bool>(type: "boolean", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedByIp = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserIdentities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Provider = table.Column<int>(type: "integer", nullable: false),
                    ProviderUserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ProviderUsername = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AvatarUrl = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    ConnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "TIMEZONE('UTC', NOW())"),
                    LastAuthenticatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserIdentities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserIdentities_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ApiKeyUsages",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ApiKeyId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    EndpointId = table.Column<int>(type: "integer", nullable: false),
                    Method = table.Column<int>(type: "integer", nullable: false),
                    StatusCode = table.Column<int>(type: "integer", nullable: false),
                    ResponseTimeMs = table.Column<int>(type: "integer", nullable: false),
                    RequestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ClientIpAddress = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApiKeyUsages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApiKeyUsages_ApiKeys_ApiKeyId",
                        column: x => x.ApiKeyId,
                        principalTable: "ApiKeys",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ApiKeyUsages_Endpoints_EndpointId",
                        column: x => x.EndpointId,
                        principalTable: "Endpoints",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ApiKeyUsages_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Scans_ApiKeyId",
                table: "Scans",
                column: "ApiKeyId");

            migrationBuilder.CreateIndex(
                name: "IX_Scans_ScanDate",
                table: "Scans",
                column: "ScanDate");

            migrationBuilder.CreateIndex(
                name: "IX_Scans_UserId",
                table: "Scans",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Files_AddDateTime",
                table: "Files",
                column: "AddDateTime");

            migrationBuilder.CreateIndex(
                name: "IX_Files_ApiKeyId",
                table: "Files",
                column: "ApiKeyId");

            migrationBuilder.CreateIndex(
                name: "IX_Files_UserId",
                table: "Files",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ChunkUploadSessions_ClientIpAddress",
                table: "ChunkUploadSessions",
                column: "ClientIpAddress");

            migrationBuilder.CreateIndex(
                name: "IX_ChunkUploadSessions_ExpiresAt",
                table: "ChunkUploadSessions",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_ApiKeys_KeyHash",
                table: "ApiKeys",
                column: "KeyHash");

            migrationBuilder.CreateIndex(
                name: "IX_ApiKeys_UserId",
                table: "ApiKeys",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ApiKeyUsages_ApiKeyId",
                table: "ApiKeyUsages",
                column: "ApiKeyId");

            migrationBuilder.CreateIndex(
                name: "IX_ApiKeyUsages_EndpointId",
                table: "ApiKeyUsages",
                column: "EndpointId");

            migrationBuilder.CreateIndex(
                name: "IX_ApiKeyUsages_RequestedAt",
                table: "ApiKeyUsages",
                column: "RequestedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ApiKeyUsages_UserId",
                table: "ApiKeyUsages",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ApiKeyUsages_UserId_RequestedAt",
                table: "ApiKeyUsages",
                columns: new[] { "UserId", "RequestedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Badges_LinkedFileHash",
                table: "Badges",
                column: "LinkedFileHash");

            migrationBuilder.CreateIndex(
                name: "IX_Badges_UpdatedAt",
                table: "Badges",
                column: "UpdatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Badges_UserId",
                table: "Badges",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoints_Path",
                table: "Endpoints",
                column: "Path",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_ExpiresAt",
                table: "RefreshTokens",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_Token",
                table: "RefreshTokens",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId_IsRevoked_ExpiresAt",
                table: "RefreshTokens",
                columns: new[] { "UserId", "IsRevoked", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_UserIdentities_Provider",
                table: "UserIdentities",
                column: "Provider");

            migrationBuilder.CreateIndex(
                name: "IX_UserIdentities_Provider_ProviderUserId",
                table: "UserIdentities",
                columns: new[] { "Provider", "ProviderUserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserIdentities_UserId",
                table: "UserIdentities",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Files_ApiKeys_ApiKeyId",
                table: "Files",
                column: "ApiKeyId",
                principalTable: "ApiKeys",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Files_Users_UserId",
                table: "Files",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Scans_ApiKeys_ApiKeyId",
                table: "Scans",
                column: "ApiKeyId",
                principalTable: "ApiKeys",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Scans_Users_UserId",
                table: "Scans",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Files_ApiKeys_ApiKeyId",
                table: "Files");

            migrationBuilder.DropForeignKey(
                name: "FK_Files_Users_UserId",
                table: "Files");

            migrationBuilder.DropForeignKey(
                name: "FK_Scans_ApiKeys_ApiKeyId",
                table: "Scans");

            migrationBuilder.DropForeignKey(
                name: "FK_Scans_Users_UserId",
                table: "Scans");

            migrationBuilder.DropTable(
                name: "ApiKeyUsages");

            migrationBuilder.DropTable(
                name: "Badges");

            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DropTable(
                name: "UserIdentities");

            migrationBuilder.DropTable(
                name: "ApiKeys");

            migrationBuilder.DropTable(
                name: "Endpoints");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Scans_ApiKeyId",
                table: "Scans");

            migrationBuilder.DropIndex(
                name: "IX_Scans_ScanDate",
                table: "Scans");

            migrationBuilder.DropIndex(
                name: "IX_Scans_UserId",
                table: "Scans");

            migrationBuilder.DropIndex(
                name: "IX_Files_AddDateTime",
                table: "Files");

            migrationBuilder.DropIndex(
                name: "IX_Files_ApiKeyId",
                table: "Files");

            migrationBuilder.DropIndex(
                name: "IX_Files_UserId",
                table: "Files");

            migrationBuilder.DropIndex(
                name: "IX_ChunkUploadSessions_ClientIpAddress",
                table: "ChunkUploadSessions");

            migrationBuilder.DropIndex(
                name: "IX_ChunkUploadSessions_ExpiresAt",
                table: "ChunkUploadSessions");

            migrationBuilder.DropColumn(
                name: "ApiKeyId",
                table: "Scans");

            migrationBuilder.DropColumn(
                name: "FileHash",
                table: "Scans");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Scans");

            migrationBuilder.DropColumn(
                name: "AnalyzerVersion",
                table: "Files");

            migrationBuilder.DropColumn(
                name: "ApiKeyId",
                table: "Files");

            migrationBuilder.DropColumn(
                name: "AssemblyCompany",
                table: "Files");

            migrationBuilder.DropColumn(
                name: "AssemblyCopyright",
                table: "Files");

            migrationBuilder.DropColumn(
                name: "AssemblyGuid",
                table: "Files");

            migrationBuilder.DropColumn(
                name: "AssemblyProduct",
                table: "Files");

            migrationBuilder.DropColumn(
                name: "AssemblyTitle",
                table: "Files");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Files");
        }
    }
}
