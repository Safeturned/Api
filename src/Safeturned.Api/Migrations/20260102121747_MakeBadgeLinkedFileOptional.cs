using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Safeturned.Api.Migrations
{
    /// <inheritdoc />
    public partial class MakeBadgeLinkedFileOptional : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Badges_Files_LinkedFileHash",
                table: "Badges");

            migrationBuilder.AlterColumn<string>(
                name: "LinkedFileHash",
                table: "Badges",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddForeignKey(
                name: "FK_Badges_Files_LinkedFileHash",
                table: "Badges",
                column: "LinkedFileHash",
                principalTable: "Files",
                principalColumn: "Hash");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Badges_Files_LinkedFileHash",
                table: "Badges");

            migrationBuilder.AlterColumn<string>(
                name: "LinkedFileHash",
                table: "Badges",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Badges_Files_LinkedFileHash",
                table: "Badges",
                column: "LinkedFileHash",
                principalTable: "Files",
                principalColumn: "Hash",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
