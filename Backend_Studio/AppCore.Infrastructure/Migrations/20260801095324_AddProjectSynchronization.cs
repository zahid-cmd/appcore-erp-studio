using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectSynchronization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProjectSynchronizations",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SynchronizationLevel = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ModuleId = table.Column<long>(type: "bigint", nullable: true),
                    MenuId = table.Column<long>(type: "bigint", nullable: true),
                    SubmenuId = table.Column<long>(type: "bigint", nullable: true),
                    SynchronizationTarget = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Remarks = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    LastSynchronizedBy = table.Column<long>(type: "bigint", nullable: true),
                    LastSynchronizedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedBy = table.Column<long>(type: "bigint", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<long>(type: "bigint", nullable: true),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectSynchronizations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectSynchronizations_IsDeleted",
                table: "ProjectSynchronizations",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectSynchronizations_MenuId",
                table: "ProjectSynchronizations",
                column: "MenuId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectSynchronizations_ModuleId",
                table: "ProjectSynchronizations",
                column: "ModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectSynchronizations_SubmenuId",
                table: "ProjectSynchronizations",
                column: "SubmenuId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectSynchronizations_SynchronizationLevel_ModuleId_MenuI~",
                table: "ProjectSynchronizations",
                columns: new[] { "SynchronizationLevel", "ModuleId", "MenuId", "SubmenuId", "SynchronizationTarget" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectSynchronizations_SynchronizationTarget",
                table: "ProjectSynchronizations",
                column: "SynchronizationTarget");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProjectSynchronizations");
        }
    }
}
