using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSubmenuSynchronization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "INF_SubmenuSynchronization",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ModuleId = table.Column<long>(type: "bigint", nullable: false),
                    ModuleCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ModuleName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    MenuId = table.Column<long>(type: "bigint", nullable: false),
                    MenuCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    MenuName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SubmenuId = table.Column<long>(type: "bigint", nullable: false),
                    SubmenuCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SubmenuName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SynchronizationType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    FrontendSolution = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FrontendProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FrontendSourceFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendFeatureFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendMenuFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendSubmenuFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendPagesFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendFormFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendListFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendSubmenuModelFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendSubmenuServiceFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendSubmenuRouteFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendSubmenuFormTsFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendSubmenuFormHtmlFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendSubmenuFormCssFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendSubmenuListTsFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendSubmenuListHtmlFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendSubmenuListCssFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendSolution = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendApplicationProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendDomainProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendInfrastructureProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendControllerFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendApplicationSubMenuFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendApplicationDtosFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendApplicationInterfacesFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendSubMenuDtoFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendCreateSubMenuDtoFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendUpdateSubMenuDtoFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendSubMenuDefaultsDtoFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendSubMenuRepositoryInterfaceFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendSubMenuEntityFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendSubMenuConfigurationFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendSubMenuRepositoryFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    LastSynchronizedBy = table.Column<long>(type: "bigint", nullable: true),
                    LastSynchronizedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastSynchronizationResult = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
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
                    table.PrimaryKey("PK_INF_SubmenuSynchronization", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_INF_SubmenuSynchronization_SubmenuId_SynchronizationType",
                table: "INF_SubmenuSynchronization",
                columns: new[] { "SubmenuId", "SynchronizationType" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "INF_SubmenuSynchronization");
        }
    }
}
