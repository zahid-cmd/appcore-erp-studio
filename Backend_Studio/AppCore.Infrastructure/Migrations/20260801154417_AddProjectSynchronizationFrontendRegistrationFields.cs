using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectSynchronizationFrontendRegistrationFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FrontendModuleRouteFile",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendParentRouteFile",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendRoutePath",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FrontendModuleRouteFile",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "FrontendParentRouteFile",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "FrontendRoutePath",
                table: "ProjectSynchronizations");
        }
    }
}
