using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateModuleSynchronizationStructure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BackendApplicationFolder",
                table: "INF_ModuleSynchronization");

            migrationBuilder.DropColumn(
                name: "BackendConfigurationFile",
                table: "INF_ModuleSynchronization");

            migrationBuilder.DropColumn(
                name: "BackendControllerFile",
                table: "INF_ModuleSynchronization");

            migrationBuilder.DropColumn(
                name: "BackendDomainFolder",
                table: "INF_ModuleSynchronization");

            migrationBuilder.RenameColumn(
                name: "BackendRepositoryFile",
                table: "INF_ModuleSynchronization",
                newName: "DependencyInjectionFile");

            migrationBuilder.RenameColumn(
                name: "BackendInfrastructureFolder",
                table: "INF_ModuleSynchronization",
                newName: "DbContextFile");

            migrationBuilder.RenameColumn(
                name: "BackendEntityFile",
                table: "INF_ModuleSynchronization",
                newName: "BackendEntityFolder");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "DependencyInjectionFile",
                table: "INF_ModuleSynchronization",
                newName: "BackendRepositoryFile");

            migrationBuilder.RenameColumn(
                name: "DbContextFile",
                table: "INF_ModuleSynchronization",
                newName: "BackendInfrastructureFolder");

            migrationBuilder.RenameColumn(
                name: "BackendEntityFolder",
                table: "INF_ModuleSynchronization",
                newName: "BackendEntityFile");

            migrationBuilder.AddColumn<string>(
                name: "BackendApplicationFolder",
                table: "INF_ModuleSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendConfigurationFile",
                table: "INF_ModuleSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendControllerFile",
                table: "INF_ModuleSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendDomainFolder",
                table: "INF_ModuleSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");
        }
    }
}
