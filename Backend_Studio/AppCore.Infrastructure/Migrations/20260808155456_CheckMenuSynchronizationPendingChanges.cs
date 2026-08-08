using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CheckMenuSynchronizationPendingChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BackendApiProject",
                table: "INF_MenuSynchronization");

            migrationBuilder.DropColumn(
                name: "BackendControllerFolder",
                table: "INF_MenuSynchronization");

            migrationBuilder.DropColumn(
                name: "BackendEntityFolder",
                table: "INF_MenuSynchronization");

            migrationBuilder.DropColumn(
                name: "BackendInterfaceFolder",
                table: "INF_MenuSynchronization");

            migrationBuilder.DropColumn(
                name: "DbContextFile",
                table: "INF_MenuSynchronization");

            migrationBuilder.RenameColumn(
                name: "DependencyInjectionFile",
                table: "INF_MenuSynchronization",
                newName: "BackendDomainFolder");

            migrationBuilder.AlterColumn<string>(
                name: "FrontendApplicationRouteFile",
                table: "INF_MenuSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "BackendDomainFolder",
                table: "INF_MenuSynchronization",
                newName: "DependencyInjectionFile");

            migrationBuilder.AlterColumn<string>(
                name: "FrontendApplicationRouteFile",
                table: "INF_MenuSynchronization",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(300)",
                oldMaxLength: 300);

            migrationBuilder.AddColumn<string>(
                name: "BackendApiProject",
                table: "INF_MenuSynchronization",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendControllerFolder",
                table: "INF_MenuSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendEntityFolder",
                table: "INF_MenuSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BackendInterfaceFolder",
                table: "INF_MenuSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DbContextFile",
                table: "INF_MenuSynchronization",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");
        }
    }
}
