using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSynchronizationTypeToModuleSynchronization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_INF_ModuleSynchronization_ModuleId",
                table: "INF_ModuleSynchronization");

            migrationBuilder.AddColumn<string>(
                name: "SynchronizationType",
                table: "INF_ModuleSynchronization",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_INF_ModuleSynchronization_ModuleId_SynchronizationType",
                table: "INF_ModuleSynchronization",
                columns: new[] { "ModuleId", "SynchronizationType" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_INF_ModuleSynchronization_ModuleId_SynchronizationType",
                table: "INF_ModuleSynchronization");

            migrationBuilder.DropColumn(
                name: "SynchronizationType",
                table: "INF_ModuleSynchronization");

            migrationBuilder.CreateIndex(
                name: "IX_INF_ModuleSynchronization_ModuleId",
                table: "INF_ModuleSynchronization",
                column: "ModuleId",
                unique: true);
        }
    }
}
