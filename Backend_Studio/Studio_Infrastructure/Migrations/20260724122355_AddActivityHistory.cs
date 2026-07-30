using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddActivityHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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

            migrationBuilder.CreateIndex(
                name: "IX_ActivityHistories_Module_EntityName_EntityId",
                table: "ActivityHistories",
                columns: new[] { "Module", "EntityName", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_ActivityHistories_PerformedDate",
                table: "ActivityHistories",
                column: "PerformedDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActivityHistories");
        }
    }
}
