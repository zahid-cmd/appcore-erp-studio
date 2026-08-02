using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectSynchronizationConfigurationFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BackendApiProject",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendApplicationProject",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendConfigurationFolder",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendControllerFolder",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendDbContextFile",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendDependencyInjectionFile",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendDomainProject",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendDtoFolder",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendEntityFolder",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendInfrastructureProject",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendInterfaceFolder",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendMigrationFolder",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendProgramFile",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendRepositoryFolder",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DatabaseProvider",
                table: "ProjectSynchronizations",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendFeatureFolder",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendModelFolder",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendModuleFolder",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendPagesFolder",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendProject",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendRoutesFolder",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendServicesFolder",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendSolution",
                table: "ProjectSynchronizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FrontendSourceFolder",
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
                name: "BackendApiProject",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "BackendApplicationProject",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "BackendConfigurationFolder",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "BackendControllerFolder",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "BackendDbContextFile",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "BackendDependencyInjectionFile",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "BackendDomainProject",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "BackendDtoFolder",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "BackendEntityFolder",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "BackendInfrastructureProject",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "BackendInterfaceFolder",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "BackendMigrationFolder",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "BackendProgramFile",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "BackendRepositoryFolder",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "DatabaseProvider",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "FrontendFeatureFolder",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "FrontendModelFolder",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "FrontendModuleFolder",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "FrontendPagesFolder",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "FrontendProject",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "FrontendRoutesFolder",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "FrontendServicesFolder",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "FrontendSolution",
                table: "ProjectSynchronizations");

            migrationBuilder.DropColumn(
                name: "FrontendSourceFolder",
                table: "ProjectSynchronizations");
        }
    }
}
