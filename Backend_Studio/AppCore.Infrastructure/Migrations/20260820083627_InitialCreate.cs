using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AccountClass",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    sampleSearchDropdownId = table.Column<long>(type: "bigint", nullable: true),
                    sampleField = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    status = table.Column<bool>(type: "boolean", nullable: false),
                    remarks = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    isActive = table.Column<bool>(type: "boolean", nullable: false),
                    isDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    createdBy = table.Column<long>(type: "bigint", nullable: false),
                    createdDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    modifiedBy = table.Column<long>(type: "bigint", nullable: true),
                    modifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountClass", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "AccountGroup",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    sampleSearchDropdownId = table.Column<long>(type: "bigint", nullable: true),
                    sampleField = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    status = table.Column<bool>(type: "boolean", nullable: false),
                    remarks = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    isActive = table.Column<bool>(type: "boolean", nullable: false),
                    isDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    createdBy = table.Column<long>(type: "bigint", nullable: false),
                    createdDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    modifiedBy = table.Column<long>(type: "bigint", nullable: true),
                    modifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountGroup", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "ActivityAssignments",
                columns: table => new
                {
                    ActivityAssignmentId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RoleProfileId = table.Column<long>(type: "bigint", nullable: false),
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
                    table.PrimaryKey("PK_ActivityAssignments", x => x.ActivityAssignmentId);
                });

            migrationBuilder.CreateTable(
                name: "ActivityHistories",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Module = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EntityName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    EntityId = table.Column<long>(type: "bigint", nullable: false),
                    ActivityType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ActivityTitle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ActivityDescription = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    PerformedBy = table.Column<long>(type: "bigint", nullable: false),
                    PerformedByName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    PerformedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActivityHistories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Branch",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    sampleSearchDropdownId = table.Column<long>(type: "bigint", nullable: true),
                    sampleField = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    status = table.Column<bool>(type: "boolean", nullable: false),
                    remarks = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    isActive = table.Column<bool>(type: "boolean", nullable: false),
                    isDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    createdBy = table.Column<long>(type: "bigint", nullable: false),
                    createdDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    modifiedBy = table.Column<long>(type: "bigint", nullable: true),
                    modifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Branch", x => x.id);
                });

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
                    BuildStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DbStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    LastSynchronizedBy = table.Column<long>(type: "bigint", nullable: true),
                    LastSynchronizedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastSynchronizationResult = table.Column<string>(type: "text", nullable: false),
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

            migrationBuilder.CreateTable(
                name: "Company",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    sampleSearchDropdownId = table.Column<long>(type: "bigint", nullable: true),
                    sampleField = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    status = table.Column<bool>(type: "boolean", nullable: false),
                    remarks = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    isActive = table.Column<bool>(type: "boolean", nullable: false),
                    isDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    createdBy = table.Column<long>(type: "bigint", nullable: false),
                    createdDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    modifiedBy = table.Column<long>(type: "bigint", nullable: true),
                    modifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Company", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "HR_Department",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ShortName = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    DepartmentHead = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Email = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Phone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    CompanyId = table.Column<long>(type: "bigint", nullable: false),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedBy = table.Column<long>(type: "bigint", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<long>(type: "bigint", nullable: true),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SequenceNo = table.Column<int>(type: "integer", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HR_Department", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HR_Designation",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedBy = table.Column<long>(type: "bigint", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<long>(type: "bigint", nullable: true),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SequenceNo = table.Column<int>(type: "integer", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HR_Designation", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "INF_MenuSynchronization",
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
                    SynchronizationType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    FrontendSolution = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FrontendProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FrontendSourceFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendFeatureFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendMenuFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendModelsFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendServicesFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendPagesFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendRoutesFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendMenuRouteFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendModuleRouteFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendApplicationRouteFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendSolution = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendApplicationProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendDomainProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendInfrastructureProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendControllerFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendApplicationFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendDomainFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendRepositoryFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendConfigurationFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
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
                    table.PrimaryKey("PK_INF_MenuSynchronization", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "INF_ModuleSynchronization",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ModuleId = table.Column<long>(type: "bigint", nullable: false),
                    ModuleCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ModuleName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SynchronizationType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    FrontendSolution = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FrontendProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FrontendSourceFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendFeatureFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendModuleFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendRoutesFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendModuleRouteFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendApplicationRouteFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendSolution = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendApiProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendApplicationProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendDomainProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendInfrastructureProject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BackendControllerFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendApplicationFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendInterfaceFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendEntityFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendRepositoryFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    BackendConfigurationFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    DependencyInjectionFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    DbContextFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
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
                    table.PrimaryKey("PK_INF_ModuleSynchronization", x => x.Id);
                });

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
                    FrontendMenuRouteFile = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    FrontendSubmenuFolder = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
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

            migrationBuilder.CreateTable(
                name: "MasterActivities",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedBy = table.Column<long>(type: "bigint", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<long>(type: "bigint", nullable: true),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SequenceNo = table.Column<int>(type: "integer", nullable: false),
                    Code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MasterActivities", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NavigationModules",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Icon = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RouteKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedBy = table.Column<long>(type: "bigint", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<long>(type: "bigint", nullable: true),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SequenceNo = table.Column<int>(type: "integer", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NavigationModules", x => x.Id);
                });

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
                    FrontendSolution = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FrontendProject = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FrontendSourceFolder = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FrontendFeatureFolder = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FrontendModuleFolder = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FrontendModelFolder = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FrontendPagesFolder = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FrontendRoutesFolder = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FrontendServicesFolder = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FrontendModuleRouteFile = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FrontendParentRouteFile = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FrontendRoutePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    BackendApiProject = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    BackendApplicationProject = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    BackendDomainProject = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    BackendInfrastructureProject = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    BackendControllerFolder = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    BackendDtoFolder = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    BackendInterfaceFolder = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    BackendEntityFolder = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    BackendRepositoryFolder = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    BackendConfigurationFolder = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    BackendDependencyInjectionFile = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    BackendDbContextFile = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    BackendProgramFile = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    BackendMigrationFolder = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    DatabaseProvider = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FrontendStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    BackendStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
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

            migrationBuilder.CreateTable(
                name: "ActivityAssignmentDetails",
                columns: table => new
                {
                    ActivityAssignmentDetailId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ActivityAssignmentId = table.Column<long>(type: "bigint", nullable: false),
                    ModuleId = table.Column<long>(type: "bigint", nullable: false),
                    MenuId = table.Column<long>(type: "bigint", nullable: false),
                    SubMenuId = table.Column<long>(type: "bigint", nullable: false),
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
                    table.PrimaryKey("PK_ActivityAssignmentDetails", x => x.ActivityAssignmentDetailId);
                    table.ForeignKey(
                        name: "FK_ActivityAssignmentDetails_ActivityAssignments_ActivityAssig~",
                        column: x => x.ActivityAssignmentId,
                        principalTable: "ActivityAssignments",
                        principalColumn: "ActivityAssignmentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NavigationActivities",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NavigationModuleId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedBy = table.Column<long>(type: "bigint", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<long>(type: "bigint", nullable: true),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SequenceNo = table.Column<int>(type: "integer", nullable: false),
                    Code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NavigationActivities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NavigationActivities_NavigationModules_NavigationModuleId",
                        column: x => x.NavigationModuleId,
                        principalTable: "NavigationModules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NavigationMenus",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NavigationModuleId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Icon = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RouteKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Route = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedBy = table.Column<long>(type: "bigint", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<long>(type: "bigint", nullable: true),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SequenceNo = table.Column<int>(type: "integer", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NavigationMenus", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NavigationMenus_NavigationModules_NavigationModuleId",
                        column: x => x.NavigationModuleId,
                        principalTable: "NavigationModules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

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

            migrationBuilder.CreateTable(
                name: "NavigationSubmenus",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NavigationMenuId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Icon = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RouteKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Route = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedBy = table.Column<long>(type: "bigint", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<long>(type: "bigint", nullable: true),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SequenceNo = table.Column<int>(type: "integer", nullable: false),
                    Code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NavigationSubmenus", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NavigationSubmenus_NavigationMenus_NavigationMenuId",
                        column: x => x.NavigationMenuId,
                        principalTable: "NavigationMenus",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignmentDetails_ActivityAssignmentId",
                table: "ActivityAssignmentDetails",
                column: "ActivityAssignmentId");

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

            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignments_IsActive",
                table: "ActivityAssignments",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignments_IsDeleted",
                table: "ActivityAssignments",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityAssignments_RoleProfileId",
                table: "ActivityAssignments",
                column: "RoleProfileId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ActivityHistories_Module_EntityName_EntityId",
                table: "ActivityHistories",
                columns: new[] { "Module", "EntityName", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_ActivityHistories_PerformedDate",
                table: "ActivityHistories",
                column: "PerformedDate");

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

            migrationBuilder.CreateIndex(
                name: "IX_HR_Department_Code",
                table: "HR_Department",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HR_Department_CompanyId_Name",
                table: "HR_Department",
                columns: new[] { "CompanyId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HR_Designation_Code",
                table: "HR_Designation",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HR_Designation_Name",
                table: "HR_Designation",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_INF_MenuSynchronization_MenuId_SynchronizationType",
                table: "INF_MenuSynchronization",
                columns: new[] { "MenuId", "SynchronizationType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_INF_ModuleSynchronization_ModuleId_SynchronizationType",
                table: "INF_ModuleSynchronization",
                columns: new[] { "ModuleId", "SynchronizationType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_INF_SubmenuSynchronization_SubmenuId_SynchronizationType",
                table: "INF_SubmenuSynchronization",
                columns: new[] { "SubmenuId", "SynchronizationType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterActivities_Code",
                table: "MasterActivities",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MasterActivities_SequenceNo",
                table: "MasterActivities",
                column: "SequenceNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NavigationActivities_Code",
                table: "NavigationActivities",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NavigationActivities_NavigationModuleId_SequenceNo",
                table: "NavigationActivities",
                columns: new[] { "NavigationModuleId", "SequenceNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NavigationMenus_Code",
                table: "NavigationMenus",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NavigationMenus_NavigationModuleId_RouteKey",
                table: "NavigationMenus",
                columns: new[] { "NavigationModuleId", "RouteKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NavigationMenus_NavigationModuleId_SequenceNo",
                table: "NavigationMenus",
                columns: new[] { "NavigationModuleId", "SequenceNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NavigationModules_Code",
                table: "NavigationModules",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NavigationModules_DisplayOrder",
                table: "NavigationModules",
                column: "DisplayOrder",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NavigationModules_Name",
                table: "NavigationModules",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NavigationModules_RouteKey",
                table: "NavigationModules",
                column: "RouteKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NavigationModules_SequenceNo",
                table: "NavigationModules",
                column: "SequenceNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NavigationSubmenus_Code",
                table: "NavigationSubmenus",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NavigationSubmenus_NavigationMenuId_RouteKey",
                table: "NavigationSubmenus",
                columns: new[] { "NavigationMenuId", "RouteKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NavigationSubmenus_NavigationMenuId_SequenceNo",
                table: "NavigationSubmenus",
                columns: new[] { "NavigationMenuId", "SequenceNo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectSynchronizations_BackendStatus",
                table: "ProjectSynchronizations",
                column: "BackendStatus");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectSynchronizations_FrontendStatus",
                table: "ProjectSynchronizations",
                column: "FrontendStatus");

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
                name: "AccountClass");

            migrationBuilder.DropTable(
                name: "AccountGroup");

            migrationBuilder.DropTable(
                name: "ActivityAssignmentPermissions");

            migrationBuilder.DropTable(
                name: "ActivityHistories");

            migrationBuilder.DropTable(
                name: "Branch");

            migrationBuilder.DropTable(
                name: "CodeSynchronizations");

            migrationBuilder.DropTable(
                name: "Company");

            migrationBuilder.DropTable(
                name: "HR_Department");

            migrationBuilder.DropTable(
                name: "HR_Designation");

            migrationBuilder.DropTable(
                name: "INF_MenuSynchronization");

            migrationBuilder.DropTable(
                name: "INF_ModuleSynchronization");

            migrationBuilder.DropTable(
                name: "INF_SubmenuSynchronization");

            migrationBuilder.DropTable(
                name: "MasterActivities");

            migrationBuilder.DropTable(
                name: "NavigationActivities");

            migrationBuilder.DropTable(
                name: "NavigationSubmenus");

            migrationBuilder.DropTable(
                name: "ProjectSynchronizations");

            migrationBuilder.DropTable(
                name: "SEC_RoleProfile");

            migrationBuilder.DropTable(
                name: "ActivityAssignmentDetails");

            migrationBuilder.DropTable(
                name: "NavigationMenus");

            migrationBuilder.DropTable(
                name: "ActivityAssignments");

            migrationBuilder.DropTable(
                name: "NavigationModules");
        }
    }
}
