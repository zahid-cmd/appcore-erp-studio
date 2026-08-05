using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddModuleSynchronization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "INF_ModuleSynchronization",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ModuleId = table.Column<long>(type: "bigint", nullable: false),
                    ModuleCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ModuleName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FrontendSolution = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FrontendProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FrontendSourceFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendFeatureFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendModuleFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendModelFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendPagesFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendRoutesFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendServicesFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendModuleRouteFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendApplicationRouteFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendRoutePath = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendSolution = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendApiProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendApplicationProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendDomainProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendInfrastructureProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendApplicationFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendDomainFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendInfrastructureFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendDtoFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendInterfaceFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendEntityFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendConfigurationFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendRepositoryFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendConfigurationFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendRepositoryFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendControllerFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendControllerFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
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
                    table.PrimaryKey("PK_INF_ModuleSynchronization", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_INF_ModuleSynchronization_ModuleId",
                table: "INF_ModuleSynchronization",
                column: "ModuleId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "INF_ModuleSynchronization");
        }
    }
}
