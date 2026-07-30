using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRouteKeyToNavigationSubmenu : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            //=========================================================
            // Add RouteKey Column
            //=========================================================

            migrationBuilder.AddColumn<string>(
                name: "RouteKey",
                table: "NavigationSubmenus",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            //=========================================================
            // Populate Existing Records
            //=========================================================

            migrationBuilder.Sql(@"
                UPDATE ""NavigationSubmenus""
                SET ""RouteKey"" =
                    LOWER(
                        REGEXP_REPLACE(
                            ""Code"",
                            '[^a-zA-Z0-9]+',
                            '-',
                            'g'
                        )
                    )
                WHERE ""RouteKey"" IS NULL;
            ");

            //=========================================================
            // Make RouteKey Required
            //=========================================================

            migrationBuilder.AlterColumn<string>(
                name: "RouteKey",
                table: "NavigationSubmenus",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            //=========================================================
            // Create Unique Index
            //=========================================================

            migrationBuilder.CreateIndex(
                name: "IX_NavigationSubmenus_NavigationMenuId_RouteKey",
                table: "NavigationSubmenus",
                columns: new[] { "NavigationMenuId", "RouteKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NavigationSubmenus_NavigationMenuId_RouteKey",
                table: "NavigationSubmenus");

            migrationBuilder.DropColumn(
                name: "RouteKey",
                table: "NavigationSubmenus");
        }
    }
}