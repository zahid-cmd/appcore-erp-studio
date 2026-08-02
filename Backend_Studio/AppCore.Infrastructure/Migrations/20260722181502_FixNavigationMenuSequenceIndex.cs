using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixNavigationMenuSequenceIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NavigationMenus_NavigationModuleId",
                table: "NavigationMenus");

            migrationBuilder.DropIndex(
                name: "IX_NavigationMenus_SequenceNo",
                table: "NavigationMenus");

            migrationBuilder.CreateIndex(
                name: "IX_NavigationMenus_NavigationModuleId_SequenceNo",
                table: "NavigationMenus",
                columns: new[] { "NavigationModuleId", "SequenceNo" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NavigationMenus_NavigationModuleId_SequenceNo",
                table: "NavigationMenus");

            migrationBuilder.CreateIndex(
                name: "IX_NavigationMenus_NavigationModuleId",
                table: "NavigationMenus",
                column: "NavigationModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_NavigationMenus_SequenceNo",
                table: "NavigationMenus",
                column: "SequenceNo",
                unique: true);
        }
    }
}
