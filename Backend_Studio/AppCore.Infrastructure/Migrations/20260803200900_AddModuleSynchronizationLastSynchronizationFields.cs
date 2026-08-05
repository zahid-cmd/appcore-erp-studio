using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddModuleSynchronizationLastSynchronizationFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LastSynchronizationResult",
                table: "INF_ModuleSynchronization",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<long>(
                name: "LastSynchronizedBy",
                table: "INF_ModuleSynchronization",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastSynchronizedDate",
                table: "INF_ModuleSynchronization",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastSynchronizationResult",
                table: "INF_ModuleSynchronization");

            migrationBuilder.DropColumn(
                name: "LastSynchronizedBy",
                table: "INF_ModuleSynchronization");

            migrationBuilder.DropColumn(
                name: "LastSynchronizedDate",
                table: "INF_ModuleSynchronization");
        }
    }
}
