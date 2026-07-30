using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRouteKeyToNavigation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RouteKey",
                table: "NavigationModules",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RouteKey",
                table: "NavigationMenus",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            // Populate RouteKey for existing modules
            migrationBuilder.Sql(@"
                UPDATE ""NavigationModules""
                SET ""RouteKey"" =
                    lower(
                        replace(
                            replace(
                                replace(""Name"", ' & ', '-'),
                            ' ', '-'),
                        '&', '')
                    )
                WHERE ""RouteKey"" = '';
            ");

            // Populate RouteKey for existing menus
            migrationBuilder.Sql(@"
                UPDATE ""NavigationMenus""
                SET ""RouteKey"" =
                    lower(
                        replace(
                            replace(
                                replace(""Name"", ' & ', '-'),
                            ' ', '-'),
                        '&', '')
                    )
                WHERE ""RouteKey"" = '';
            ");

            migrationBuilder.CreateTable(
                name: "SEC_RoleProfile",
                columns: table => new
                {
                    RoleProfileId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProfileCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ProfileName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ProfileTypeId = table.Column<long>(type: "bigint", nullable: false),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    IsSystemRole = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    IsDefaultRole = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    DeletedBy = table.Column<long>(type: "bigint", nullable: true),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedBy = table.Column<long>(type: "bigint", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SEC_RoleProfile", x => x.RoleProfileId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NavigationModules_RouteKey",
                table: "NavigationModules",
                column: "RouteKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NavigationMenus_NavigationModuleId_RouteKey",
                table: "NavigationMenus",
                columns: new[] { "NavigationModuleId", "RouteKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SEC_RoleProfile_DisplayName",
                table: "SEC_RoleProfile",
                column: "DisplayName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SEC_RoleProfile_IsActive",
                table: "SEC_RoleProfile",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_SEC_RoleProfile_IsDeleted",
                table: "SEC_RoleProfile",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_SEC_RoleProfile_ProfileCode",
                table: "SEC_RoleProfile",
                column: "ProfileCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SEC_RoleProfile_ProfileName",
                table: "SEC_RoleProfile",
                column: "ProfileName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SEC_RoleProfile_ProfileTypeId",
                table: "SEC_RoleProfile",
                column: "ProfileTypeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SEC_RoleProfile");

            migrationBuilder.DropIndex(
                name: "IX_NavigationModules_RouteKey",
                table: "NavigationModules");

            migrationBuilder.DropIndex(
                name: "IX_NavigationMenus_NavigationModuleId_RouteKey",
                table: "NavigationMenus");

            migrationBuilder.DropColumn(
                name: "RouteKey",
                table: "NavigationModules");

            migrationBuilder.DropColumn(
                name: "RouteKey",
                table: "NavigationMenus");
        }
    }
}
