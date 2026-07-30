using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class NavigationActivityModuleRefactor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NavigationActivities_NavigationSubmenus_NavigationSubmenuId",
                table: "NavigationActivities");

            migrationBuilder.RenameColumn(
                name: "NavigationSubmenuId",
                table: "NavigationActivities",
                newName: "NavigationModuleId");

            migrationBuilder.RenameIndex(
                name: "IX_NavigationActivities_NavigationSubmenuId_SequenceNo",
                table: "NavigationActivities",
                newName: "IX_NavigationActivities_NavigationModuleId_SequenceNo");

            migrationBuilder.AddForeignKey(
                name: "FK_NavigationActivities_NavigationModules_NavigationModuleId",
                table: "NavigationActivities",
                column: "NavigationModuleId",
                principalTable: "NavigationModules",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NavigationActivities_NavigationModules_NavigationModuleId",
                table: "NavigationActivities");

            migrationBuilder.RenameColumn(
                name: "NavigationModuleId",
                table: "NavigationActivities",
                newName: "NavigationSubmenuId");

            migrationBuilder.RenameIndex(
                name: "IX_NavigationActivities_NavigationModuleId_SequenceNo",
                table: "NavigationActivities",
                newName: "IX_NavigationActivities_NavigationSubmenuId_SequenceNo");

            migrationBuilder.AddForeignKey(
                name: "FK_NavigationActivities_NavigationSubmenus_NavigationSubmenuId",
                table: "NavigationActivities",
                column: "NavigationSubmenuId",
                principalTable: "NavigationSubmenus",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
