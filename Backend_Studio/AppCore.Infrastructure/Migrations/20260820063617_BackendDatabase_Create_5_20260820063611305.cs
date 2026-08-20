using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppCore.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class BackendDatabase_Create_5_20260820063611305 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Status",
                table: "Company",
                newName: "status");

            migrationBuilder.RenameColumn(
                name: "SampleSearchDropdownId",
                table: "Company",
                newName: "sampleSearchDropdownId");

            migrationBuilder.RenameColumn(
                name: "SampleField",
                table: "Company",
                newName: "sampleField");

            migrationBuilder.RenameColumn(
                name: "Remarks",
                table: "Company",
                newName: "remarks");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "Company",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "ModifiedDate",
                table: "Company",
                newName: "modifiedDate");

            migrationBuilder.RenameColumn(
                name: "ModifiedBy",
                table: "Company",
                newName: "modifiedBy");

            migrationBuilder.RenameColumn(
                name: "IsDeleted",
                table: "Company",
                newName: "isDeleted");

            migrationBuilder.RenameColumn(
                name: "IsActive",
                table: "Company",
                newName: "isActive");

            migrationBuilder.RenameColumn(
                name: "CreatedDate",
                table: "Company",
                newName: "createdDate");

            migrationBuilder.RenameColumn(
                name: "CreatedBy",
                table: "Company",
                newName: "createdBy");

            migrationBuilder.RenameColumn(
                name: "Code",
                table: "Company",
                newName: "code");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "Company",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "Status",
                table: "Branch",
                newName: "status");

            migrationBuilder.RenameColumn(
                name: "SampleSearchDropdownId",
                table: "Branch",
                newName: "sampleSearchDropdownId");

            migrationBuilder.RenameColumn(
                name: "SampleField",
                table: "Branch",
                newName: "sampleField");

            migrationBuilder.RenameColumn(
                name: "Remarks",
                table: "Branch",
                newName: "remarks");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "Branch",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "ModifiedDate",
                table: "Branch",
                newName: "modifiedDate");

            migrationBuilder.RenameColumn(
                name: "ModifiedBy",
                table: "Branch",
                newName: "modifiedBy");

            migrationBuilder.RenameColumn(
                name: "IsDeleted",
                table: "Branch",
                newName: "isDeleted");

            migrationBuilder.RenameColumn(
                name: "IsActive",
                table: "Branch",
                newName: "isActive");

            migrationBuilder.RenameColumn(
                name: "CreatedDate",
                table: "Branch",
                newName: "createdDate");

            migrationBuilder.RenameColumn(
                name: "CreatedBy",
                table: "Branch",
                newName: "createdBy");

            migrationBuilder.RenameColumn(
                name: "Code",
                table: "Branch",
                newName: "code");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "Branch",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "Status",
                table: "AccountGroup",
                newName: "status");

            migrationBuilder.RenameColumn(
                name: "SampleSearchDropdownId",
                table: "AccountGroup",
                newName: "sampleSearchDropdownId");

            migrationBuilder.RenameColumn(
                name: "SampleField",
                table: "AccountGroup",
                newName: "sampleField");

            migrationBuilder.RenameColumn(
                name: "Remarks",
                table: "AccountGroup",
                newName: "remarks");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "AccountGroup",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "ModifiedDate",
                table: "AccountGroup",
                newName: "modifiedDate");

            migrationBuilder.RenameColumn(
                name: "ModifiedBy",
                table: "AccountGroup",
                newName: "modifiedBy");

            migrationBuilder.RenameColumn(
                name: "IsDeleted",
                table: "AccountGroup",
                newName: "isDeleted");

            migrationBuilder.RenameColumn(
                name: "IsActive",
                table: "AccountGroup",
                newName: "isActive");

            migrationBuilder.RenameColumn(
                name: "CreatedDate",
                table: "AccountGroup",
                newName: "createdDate");

            migrationBuilder.RenameColumn(
                name: "CreatedBy",
                table: "AccountGroup",
                newName: "createdBy");

            migrationBuilder.RenameColumn(
                name: "Code",
                table: "AccountGroup",
                newName: "code");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "AccountGroup",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "Status",
                table: "AccountClass",
                newName: "status");

            migrationBuilder.RenameColumn(
                name: "SampleSearchDropdownId",
                table: "AccountClass",
                newName: "sampleSearchDropdownId");

            migrationBuilder.RenameColumn(
                name: "SampleField",
                table: "AccountClass",
                newName: "sampleField");

            migrationBuilder.RenameColumn(
                name: "Remarks",
                table: "AccountClass",
                newName: "remarks");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "AccountClass",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "ModifiedDate",
                table: "AccountClass",
                newName: "modifiedDate");

            migrationBuilder.RenameColumn(
                name: "ModifiedBy",
                table: "AccountClass",
                newName: "modifiedBy");

            migrationBuilder.RenameColumn(
                name: "IsDeleted",
                table: "AccountClass",
                newName: "isDeleted");

            migrationBuilder.RenameColumn(
                name: "IsActive",
                table: "AccountClass",
                newName: "isActive");

            migrationBuilder.RenameColumn(
                name: "CreatedDate",
                table: "AccountClass",
                newName: "createdDate");

            migrationBuilder.RenameColumn(
                name: "CreatedBy",
                table: "AccountClass",
                newName: "createdBy");

            migrationBuilder.RenameColumn(
                name: "Code",
                table: "AccountClass",
                newName: "code");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "AccountClass",
                newName: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "status",
                table: "Company",
                newName: "Status");

            migrationBuilder.RenameColumn(
                name: "sampleSearchDropdownId",
                table: "Company",
                newName: "SampleSearchDropdownId");

            migrationBuilder.RenameColumn(
                name: "sampleField",
                table: "Company",
                newName: "SampleField");

            migrationBuilder.RenameColumn(
                name: "remarks",
                table: "Company",
                newName: "Remarks");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "Company",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "modifiedDate",
                table: "Company",
                newName: "ModifiedDate");

            migrationBuilder.RenameColumn(
                name: "modifiedBy",
                table: "Company",
                newName: "ModifiedBy");

            migrationBuilder.RenameColumn(
                name: "isDeleted",
                table: "Company",
                newName: "IsDeleted");

            migrationBuilder.RenameColumn(
                name: "isActive",
                table: "Company",
                newName: "IsActive");

            migrationBuilder.RenameColumn(
                name: "createdDate",
                table: "Company",
                newName: "CreatedDate");

            migrationBuilder.RenameColumn(
                name: "createdBy",
                table: "Company",
                newName: "CreatedBy");

            migrationBuilder.RenameColumn(
                name: "code",
                table: "Company",
                newName: "Code");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "Company",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "status",
                table: "Branch",
                newName: "Status");

            migrationBuilder.RenameColumn(
                name: "sampleSearchDropdownId",
                table: "Branch",
                newName: "SampleSearchDropdownId");

            migrationBuilder.RenameColumn(
                name: "sampleField",
                table: "Branch",
                newName: "SampleField");

            migrationBuilder.RenameColumn(
                name: "remarks",
                table: "Branch",
                newName: "Remarks");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "Branch",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "modifiedDate",
                table: "Branch",
                newName: "ModifiedDate");

            migrationBuilder.RenameColumn(
                name: "modifiedBy",
                table: "Branch",
                newName: "ModifiedBy");

            migrationBuilder.RenameColumn(
                name: "isDeleted",
                table: "Branch",
                newName: "IsDeleted");

            migrationBuilder.RenameColumn(
                name: "isActive",
                table: "Branch",
                newName: "IsActive");

            migrationBuilder.RenameColumn(
                name: "createdDate",
                table: "Branch",
                newName: "CreatedDate");

            migrationBuilder.RenameColumn(
                name: "createdBy",
                table: "Branch",
                newName: "CreatedBy");

            migrationBuilder.RenameColumn(
                name: "code",
                table: "Branch",
                newName: "Code");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "Branch",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "status",
                table: "AccountGroup",
                newName: "Status");

            migrationBuilder.RenameColumn(
                name: "sampleSearchDropdownId",
                table: "AccountGroup",
                newName: "SampleSearchDropdownId");

            migrationBuilder.RenameColumn(
                name: "sampleField",
                table: "AccountGroup",
                newName: "SampleField");

            migrationBuilder.RenameColumn(
                name: "remarks",
                table: "AccountGroup",
                newName: "Remarks");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "AccountGroup",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "modifiedDate",
                table: "AccountGroup",
                newName: "ModifiedDate");

            migrationBuilder.RenameColumn(
                name: "modifiedBy",
                table: "AccountGroup",
                newName: "ModifiedBy");

            migrationBuilder.RenameColumn(
                name: "isDeleted",
                table: "AccountGroup",
                newName: "IsDeleted");

            migrationBuilder.RenameColumn(
                name: "isActive",
                table: "AccountGroup",
                newName: "IsActive");

            migrationBuilder.RenameColumn(
                name: "createdDate",
                table: "AccountGroup",
                newName: "CreatedDate");

            migrationBuilder.RenameColumn(
                name: "createdBy",
                table: "AccountGroup",
                newName: "CreatedBy");

            migrationBuilder.RenameColumn(
                name: "code",
                table: "AccountGroup",
                newName: "Code");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "AccountGroup",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "status",
                table: "AccountClass",
                newName: "Status");

            migrationBuilder.RenameColumn(
                name: "sampleSearchDropdownId",
                table: "AccountClass",
                newName: "SampleSearchDropdownId");

            migrationBuilder.RenameColumn(
                name: "sampleField",
                table: "AccountClass",
                newName: "SampleField");

            migrationBuilder.RenameColumn(
                name: "remarks",
                table: "AccountClass",
                newName: "Remarks");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "AccountClass",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "modifiedDate",
                table: "AccountClass",
                newName: "ModifiedDate");

            migrationBuilder.RenameColumn(
                name: "modifiedBy",
                table: "AccountClass",
                newName: "ModifiedBy");

            migrationBuilder.RenameColumn(
                name: "isDeleted",
                table: "AccountClass",
                newName: "IsDeleted");

            migrationBuilder.RenameColumn(
                name: "isActive",
                table: "AccountClass",
                newName: "IsActive");

            migrationBuilder.RenameColumn(
                name: "createdDate",
                table: "AccountClass",
                newName: "CreatedDate");

            migrationBuilder.RenameColumn(
                name: "createdBy",
                table: "AccountClass",
                newName: "CreatedBy");

            migrationBuilder.RenameColumn(
                name: "code",
                table: "AccountClass",
                newName: "Code");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "AccountClass",
                newName: "Id");
        }
    }
}
