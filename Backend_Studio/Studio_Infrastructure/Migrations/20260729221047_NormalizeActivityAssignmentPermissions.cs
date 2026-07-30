using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeActivityAssignmentPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MasterActivities",
                table: "ActivityAssignmentDetails");

            migrationBuilder.DropColumn(
                name: "SpecialActivities",
                table: "ActivityAssignmentDetails");

            migrationBuilder.CreateTable(
                name: "ActivityAssignmentPermissions",
                columns: table => new
                {
                    ActivityAssignmentPermissionId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ActivityAssignmentDetailId = table.Column<long>(type: "bigint", nullable: false),
                    MasterActivityId = table.Column<long>(type: "bigint", nullable: true),
                    NavigationActivityId = table.Column<long>(type: "bigint", nullable: true),
                    Id = table.Column<long>(type: "bigint", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedBy = table.Column<long>(type: "bigint", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<long>(type: "bigint", nullable: true),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActivityAssignmentPermissions", x => x.ActivityAssignmentPermissionId);
                    table.ForeignKey(
                        name: "FK_ActivityAssignmentPermissions_ActivityAssignmentDetails_Act~",
                        column: x => x.ActivityAssignmentDetailId,
                        principalTable: "ActivityAssignmentDetails",
                        principalColumn: "ActivityAssignmentDetailId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignments_IsActive",
                table: "ActivityAssignments",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignments_IsDeleted",
                table: "ActivityAssignments",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignmentDetails_ActivityAssignmentId_ModuleId_Men~",
                table: "ActivityAssignmentDetails",
                columns: new[] { "ActivityAssignmentId", "ModuleId", "MenuId", "SubMenuId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignmentDetails_IsActive",
                table: "ActivityAssignmentDetails",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignmentDetails_IsDeleted",
                table: "ActivityAssignmentDetails",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignmentDetails_MenuId",
                table: "ActivityAssignmentDetails",
                column: "MenuId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignmentDetails_ModuleId",
                table: "ActivityAssignmentDetails",
                column: "ModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignmentDetails_SubMenuId",
                table: "ActivityAssignmentDetails",
                column: "SubMenuId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignmentPermissions_ActivityAssignmentDetailId",
                table: "ActivityAssignmentPermissions",
                column: "ActivityAssignmentDetailId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignmentPermissions_IsActive",
                table: "ActivityAssignmentPermissions",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignmentPermissions_IsDeleted",
                table: "ActivityAssignmentPermissions",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignmentPermissions_MasterActivityId",
                table: "ActivityAssignmentPermissions",
                column: "MasterActivityId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignmentPermissions_NavigationActivityId",
                table: "ActivityAssignmentPermissions",
                column: "NavigationActivityId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActivityAssignmentPermissions");

            migrationBuilder.DropIndex(
                name: "IX_ActivityAssignments_IsActive",
                table: "ActivityAssignments");

            migrationBuilder.DropIndex(
                name: "IX_ActivityAssignments_IsDeleted",
                table: "ActivityAssignments");

            migrationBuilder.DropIndex(
                name: "IX_ActivityAssignmentDetails_ActivityAssignmentId_ModuleId_Men~",
                table: "ActivityAssignmentDetails");

            migrationBuilder.DropIndex(
                name: "IX_ActivityAssignmentDetails_IsActive",
                table: "ActivityAssignmentDetails");

            migrationBuilder.DropIndex(
                name: "IX_ActivityAssignmentDetails_IsDeleted",
                table: "ActivityAssignmentDetails");

            migrationBuilder.DropIndex(
                name: "IX_ActivityAssignmentDetails_MenuId",
                table: "ActivityAssignmentDetails");

            migrationBuilder.DropIndex(
                name: "IX_ActivityAssignmentDetails_ModuleId",
                table: "ActivityAssignmentDetails");

            migrationBuilder.DropIndex(
                name: "IX_ActivityAssignmentDetails_SubMenuId",
                table: "ActivityAssignmentDetails");

            migrationBuilder.AddColumn<string>(
                name: "MasterActivities",
                table: "ActivityAssignmentDetails",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SpecialActivities",
                table: "ActivityAssignmentDetails",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: false,
                defaultValue: "");
        }
    }
}
