using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SplitProjectSynchronizationStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Status",
                table: "ProjectSynchronizations",
                newName: "FrontendStatus");

            migrationBuilder.AddColumn<string>(
                name: "BackendStatus",
                table: "ProjectSynchronizations",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectSynchronizations_BackendStatus",
                table: "ProjectSynchronizations",
                column: "BackendStatus");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectSynchronizations_FrontendStatus",
                table: "ProjectSynchronizations",
                column: "FrontendStatus");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProjectSynchronizations_BackendStatus",
                table: "ProjectSynchronizations");

            migrationBuilder.DropIndex(
                name: "IX_ProjectSynchronizations_FrontendStatus",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "BackendStatus",
                table: "ProjectSynchronizations");

            migrationBuilder.RenameColumn(
                name: "FrontendStatus",
                table: "ProjectSynchronizations",
                newName: "Status");
        }
    }
}
