using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RenameBackendDtoFolderToBackendApplicationFolder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn
            (
                name: "BackendDtoFolder",

                table: "INF_ModuleSynchronization",

                newName: "BackendApplicationFolder"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn
            (
                name: "BackendApplicationFolder",

                table: "INF_ModuleSynchronization",

                newName: "BackendDtoFolder"
            );
        }
    }
}