using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateMenuSynchronizationFrontendStructure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "FrontendModuleFolder",
                table: "INF_MenuSynchronization",
                newName: "FrontendServicesFolder");

            migrationBuilder.RenameColumn(
                name: "FrontendApplicationRouteFile",
                table: "INF_MenuSynchronization",
                newName: "FrontendPagesFolder");

            migrationBuilder.AddColumn<string>(
                name: "FrontendFormFolder",
                table: "INF_MenuSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendListFolder",
                table: "INF_MenuSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendMenuFolder",
                table: "INF_MenuSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendMenuRouteFile",
                table: "INF_MenuSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendModelsFolder",
                table: "INF_MenuSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FrontendFormFolder",
                table: "INF_MenuSynchronization");

            migrationBuilder.DropColumn(
                name: "FrontendListFolder",
                table: "INF_MenuSynchronization");

            migrationBuilder.DropColumn(
                name: "FrontendMenuFolder",
                table: "INF_MenuSynchronization");

            migrationBuilder.DropColumn(
                name: "FrontendMenuRouteFile",
                table: "INF_MenuSynchronization");

            migrationBuilder.DropColumn(
                name: "FrontendModelsFolder",
                table: "INF_MenuSynchronization");

            migrationBuilder.RenameColumn(
                name: "FrontendServicesFolder",
                table: "INF_MenuSynchronization",
                newName: "FrontendModuleFolder");

            migrationBuilder.RenameColumn(
                name: "FrontendPagesFolder",
                table: "INF_MenuSynchronization",
                newName: "FrontendApplicationRouteFile");
        }
    }
}
