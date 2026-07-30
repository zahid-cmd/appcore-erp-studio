using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNavigationModuleUniqueConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_NavigationModules_DisplayOrder",
                table: "NavigationModules",
                column: "DisplayOrder",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NavigationModules_Name",
                table: "NavigationModules",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NavigationModules_DisplayOrder",
                table: "NavigationModules");

            migrationBuilder.DropIndex(
                name: "IX_NavigationModules_Name",
                table: "NavigationModules");
        }
    }
}
