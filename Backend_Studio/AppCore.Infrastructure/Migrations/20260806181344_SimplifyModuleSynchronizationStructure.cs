using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SimplifyModuleSynchronizationStructure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FrontendModelFolder",
                table: "INF_ModuleSynchronization");

            migrationBuilder.DropColumn(
                name: "FrontendPagesFolder",
                table: "INF_ModuleSynchronization");

            migrationBuilder.DropColumn(
                name: "FrontendRoutePath",
                table: "INF_ModuleSynchronization");

            migrationBuilder.DropColumn(
                name: "FrontendServicesFolder",
                table: "INF_ModuleSynchronization");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FrontendModelFolder",
                table: "INF_ModuleSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendPagesFolder",
                table: "INF_ModuleSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendRoutePath",
                table: "INF_ModuleSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendServicesFolder",
                table: "INF_ModuleSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");
        }
    }
}
