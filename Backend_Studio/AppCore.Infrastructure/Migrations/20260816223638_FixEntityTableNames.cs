using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixEntityTableNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "FrontendMenuRouteFile",
                table: "INF_SubmenuSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "BuildStatus",
                table: "CodeSynchronizations",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DbStatus",
                table: "CodeSynchronizations",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BuildStatus",
                table: "CodeSynchronizations");

            migrationBuilder.DropColumn(
                name: "DbStatus",
                table: "CodeSynchronizations");

            migrationBuilder.AlterColumn<string>(
                name: "FrontendMenuRouteFile",
                table: "INF_SubmenuSynchronization",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(300)",
                oldMaxLength: 300);
        }
    }
}
