using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueRoleProfileIndexToActivityAssignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignments_RoleProfileId",
                table: "ActivityAssignments",
                column: "RoleProfileId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ActivityAssignments_RoleProfileId",
                table: "ActivityAssignments");
        }
    }
}
