using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateLayoutComponents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "sampleSearchDropdownId",
                table: "LayoutComponents");

            migrationBuilder.RenameColumn(
                name: "sampleField",
                table: "LayoutComponents",
                newName: "componentPath");

            migrationBuilder.AddColumn<string>(
                name: "componentKey",
                table: "LayoutComponents",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "displayOrder",
                table: "LayoutComponents",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "icon",
                table: "LayoutComponents",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "componentKey",
                table: "LayoutComponents");

            migrationBuilder.DropColumn(
                name: "displayOrder",
                table: "LayoutComponents");

            migrationBuilder.DropColumn(
                name: "icon",
                table: "LayoutComponents");

            migrationBuilder.RenameColumn(
                name: "componentPath",
                table: "LayoutComponents",
                newName: "sampleField");

            migrationBuilder.AddColumn<long>(
                name: "sampleSearchDropdownId",
                table: "LayoutComponents",
                type: "bigint",
                nullable: true);
        }
    }
}
