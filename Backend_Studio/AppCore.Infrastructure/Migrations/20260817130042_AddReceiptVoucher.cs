using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReceiptVoucher : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Branch");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Branch",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedBy = table.Column<long>(type: "bigint", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    ModifiedBy = table.Column<long>(type: "bigint", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Remarks = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    SampleField = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    SampleSearchDropdownId = table.Column<long>(type: "bigint", nullable: true),
                    Status = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Branch", x => x.Id);
                });
        }
    }
}
