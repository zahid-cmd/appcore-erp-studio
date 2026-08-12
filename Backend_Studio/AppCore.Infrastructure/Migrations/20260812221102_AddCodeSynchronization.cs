using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCodeSynchronization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CodeSynchronizations",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SubmenuSynchronizationId = table.Column<long>(type: "bigint", nullable: false),
                    ModuleId = table.Column<long>(type: "bigint", nullable: false),
                    ModuleCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ModuleName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    MenuId = table.Column<long>(type: "bigint", nullable: false),
                    MenuCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    MenuName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SubmenuId = table.Column<long>(type: "bigint", nullable: false),
                    SubmenuCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SubmenuName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SynchronizationType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    LastSynchronizedBy = table.Column<long>(type: "bigint", nullable: true),
                    LastSynchronizedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastSynchronizationResult = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Remarks = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedBy = table.Column<long>(type: "bigint", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<long>(type: "bigint", nullable: true),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CodeSynchronizations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CodeSynchronizations_ModuleId_MenuId_SubmenuId_Synchronizat~",
                table: "CodeSynchronizations",
                columns: new[] { "ModuleId", "MenuId", "SubmenuId", "SynchronizationType" });

            migrationBuilder.CreateIndex(
                name: "IX_CodeSynchronizations_SubmenuId_SynchronizationType",
                table: "CodeSynchronizations",
                columns: new[] { "SubmenuId", "SynchronizationType" });

            migrationBuilder.CreateIndex(
                name: "IX_CodeSynchronizations_SubmenuSynchronizationId",
                table: "CodeSynchronizations",
                column: "SubmenuSynchronizationId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CodeSynchronizations");
        }
    }
}
