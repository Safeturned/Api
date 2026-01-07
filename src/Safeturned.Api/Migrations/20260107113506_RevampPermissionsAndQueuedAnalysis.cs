using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Safeturned.Api.Migrations
{
    /// <inheritdoc />
    public partial class RevampPermissionsAndQueuedAnalysis : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Files_Users_UserId",
                table: "Files");

            migrationBuilder.DropColumn(
                name: "IsAdmin",
                table: "Users");

            migrationBuilder.AddColumn<int>(
                name: "Permissions",
                table: "Users",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CurrentVerdict",
                table: "Files",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Features",
                table: "Files",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsTakenDown",
                table: "Files",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PublicAdminMessage",
                table: "Files",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TakedownReason",
                table: "Files",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TakenDownAt",
                table: "Files",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "TakenDownByUserId",
                table: "Files",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AnalysisJobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    FileName = table.Column<string>(type: "text", nullable: false),
                    FileHash = table.Column<string>(type: "text", nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    HangfireJobId = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ApiKeyId = table.Column<Guid>(type: "uuid", nullable: true),
                    ClientIpAddress = table.Column<string>(type: "text", nullable: true),
                    ForceAnalyze = table.Column<bool>(type: "boolean", nullable: false),
                    BadgeToken = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResultJson = table.Column<string>(type: "text", nullable: true),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    RetryCount = table.Column<int>(type: "integer", nullable: false),
                    TempFilePath = table.Column<string>(type: "text", nullable: true),
                    TempFileCleanedUp = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnalysisJobs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AnalysisJobs_ApiKeys_ApiKeyId",
                        column: x => x.ApiKeyId,
                        principalTable: "ApiKeys",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AnalysisJobs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "FileAdminReviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FileHash = table.Column<string>(type: "text", nullable: false),
                    ReviewerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Verdict = table.Column<int>(type: "integer", nullable: false),
                    PublicMessage = table.Column<string>(type: "text", nullable: true),
                    InternalNotes = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FileAdminReviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FileAdminReviews_Files_FileHash",
                        column: x => x.FileHash,
                        principalTable: "Files",
                        principalColumn: "Hash",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FileAdminReviews_Users_ReviewerId",
                        column: x => x.ReviewerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Files_CurrentVerdict",
                table: "Files",
                column: "CurrentVerdict");

            migrationBuilder.CreateIndex(
                name: "IX_Files_IsTakenDown",
                table: "Files",
                column: "IsTakenDown");

            migrationBuilder.CreateIndex(
                name: "IX_Files_TakenDownAt",
                table: "Files",
                column: "TakenDownAt");

            migrationBuilder.CreateIndex(
                name: "IX_Files_TakenDownByUserId",
                table: "Files",
                column: "TakenDownByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AnalysisJobs_ApiKeyId",
                table: "AnalysisJobs",
                column: "ApiKeyId");

            migrationBuilder.CreateIndex(
                name: "IX_AnalysisJobs_CreatedAt",
                table: "AnalysisJobs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AnalysisJobs_ExpiresAt",
                table: "AnalysisJobs",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_AnalysisJobs_FileHash",
                table: "AnalysisJobs",
                column: "FileHash");

            migrationBuilder.CreateIndex(
                name: "IX_AnalysisJobs_Status",
                table: "AnalysisJobs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_AnalysisJobs_UserId",
                table: "AnalysisJobs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_FileAdminReviews_CreatedAt",
                table: "FileAdminReviews",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_FileAdminReviews_FileHash",
                table: "FileAdminReviews",
                column: "FileHash");

            migrationBuilder.CreateIndex(
                name: "IX_FileAdminReviews_ReviewerId",
                table: "FileAdminReviews",
                column: "ReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_FileAdminReviews_Verdict",
                table: "FileAdminReviews",
                column: "Verdict");

            migrationBuilder.AddForeignKey(
                name: "FK_Files_Users_TakenDownByUserId",
                table: "Files",
                column: "TakenDownByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Files_Users_UserId",
                table: "Files",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Files_Users_TakenDownByUserId",
                table: "Files");

            migrationBuilder.DropForeignKey(
                name: "FK_Files_Users_UserId",
                table: "Files");

            migrationBuilder.DropTable(
                name: "AnalysisJobs");

            migrationBuilder.DropTable(
                name: "FileAdminReviews");

            migrationBuilder.DropIndex(
                name: "IX_Files_CurrentVerdict",
                table: "Files");

            migrationBuilder.DropIndex(
                name: "IX_Files_IsTakenDown",
                table: "Files");

            migrationBuilder.DropIndex(
                name: "IX_Files_TakenDownAt",
                table: "Files");

            migrationBuilder.DropIndex(
                name: "IX_Files_TakenDownByUserId",
                table: "Files");

            migrationBuilder.DropColumn(
                name: "Permissions",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CurrentVerdict",
                table: "Files");

            migrationBuilder.DropColumn(
                name: "Features",
                table: "Files");

            migrationBuilder.DropColumn(
                name: "IsTakenDown",
                table: "Files");

            migrationBuilder.DropColumn(
                name: "PublicAdminMessage",
                table: "Files");

            migrationBuilder.DropColumn(
                name: "TakedownReason",
                table: "Files");

            migrationBuilder.DropColumn(
                name: "TakenDownAt",
                table: "Files");

            migrationBuilder.DropColumn(
                name: "TakenDownByUserId",
                table: "Files");

            migrationBuilder.AddColumn<bool>(
                name: "IsAdmin",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddForeignKey(
                name: "FK_Files_Users_UserId",
                table: "Files",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id");
        }
    }
}
