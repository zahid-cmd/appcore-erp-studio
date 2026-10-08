//===============================================================
// Namespaces
//===============================================================

using AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;


//===============================================================
// Page Cloning Configuration
//===============================================================

namespace AppCore.Infrastructure.Configurations.InfrastructureControl.DevelopmentManagement;

public class PageCloningConfiguration :
    IEntityTypeConfiguration<PageCloning>
{
    //===========================================================
    // Configure
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<PageCloning> builder
    )
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable("tblPageCloning");


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey
        (
            x =>
                x.Id
        );


        builder.Property
        (
            x =>
                x.Id
        )
        .ValueGeneratedOnAdd()
        .HasColumnName("Id")
        .HasColumnType("bigint");


        //=======================================================
        // Clone From
        //=======================================================

        builder.Property
        (
            x =>
                x.CloneFromId
        )
        .IsRequired()
        .HasColumnName("CloneFromId")
        .HasColumnType("bigint");


        builder.Property
        (
            x =>
                x.CloneFromCode
        )
        .IsRequired()
        .HasMaxLength(50)
        .HasColumnName("CloneFromCode")
        .HasColumnType("character varying(50)");


        builder.Property
        (
            x =>
                x.CloneFromName
        )
        .IsRequired()
        .HasMaxLength(200)
        .HasColumnName("CloneFromName")
        .HasColumnType("character varying(200)");


        //=======================================================
        // Clone To
        //=======================================================

        builder.Property
        (
            x =>
                x.CloneToId
        )
        .IsRequired()
        .HasColumnName("CloneToId")
        .HasColumnType("bigint");


        builder.Property
        (
            x =>
                x.CloneToCode
        )
        .IsRequired()
        .HasMaxLength(50)
        .HasColumnName("CloneToCode")
        .HasColumnType("character varying(50)");


        builder.Property
        (
            x =>
                x.CloneToName
        )
        .IsRequired()
        .HasMaxLength(200)
        .HasColumnName("CloneToName")
        .HasColumnType("character varying(200)");


        //=======================================================
        // Clone Type
        //=======================================================

        builder.Property
        (
            x =>
                x.CloningType
        )
        .IsRequired()
        .HasMaxLength(50)
        .HasColumnName("CloningType")
        .HasColumnType("character varying(50)")
        .HasDefaultValue("Page");


        //=======================================================
        // Files
        //=======================================================

        builder.Property
        (
            x =>
                x.NumberOfFiles
        )
        .IsRequired()
        .HasColumnName("NumberOfFiles")
        .HasColumnType("integer")
        .HasDefaultValue(15);


        //=======================================================
        // Operation
        //=======================================================

        builder.Property
        (
            x =>
                x.Operation
        )
        .IsRequired()
        .HasMaxLength(50)
        .HasColumnName("Operation")
        .HasColumnType("character varying(50)")
        .HasDefaultValue("Clone");


        //=======================================================
        // Status
        //=======================================================

        builder.Property
        (
            x =>
                x.Status
        )
        .IsRequired()
        .HasMaxLength(50)
        .HasColumnName("Status")
        .HasColumnType("character varying(50)")
        .HasDefaultValue("Pending");


        //=======================================================
        // Configuration
        //=======================================================

        builder.Property
        (
            x =>
                x.Remarks
        )
        .HasMaxLength(1000)
        .HasColumnName("Remarks")
        .HasColumnType("character varying(1000)");


        //=======================================================
        // Last Cloning
        //=======================================================

        builder.Property
        (
            x =>
                x.LastClonedBy
        )
        .HasColumnName("LastClonedBy")
        .HasColumnType("bigint");


        builder.Property
        (
            x =>
                x.LastClonedDate
        )
        .HasColumnName("LastClonedDate")
        .HasColumnType("timestamp with time zone");


        builder.Property
        (
            x =>
                x.LastCloningResult
        )
        .IsRequired()
        .HasMaxLength(1000)
        .HasColumnName("LastCloningResult")
        .HasColumnType("character varying(1000)");


        //=======================================================
        // Active Status
        //=======================================================

        builder.Property
        (
            x =>
                x.IsActive
        )
        .IsRequired()
        .HasColumnName("IsActive")
        .HasColumnType("boolean")
        .HasDefaultValue(true);


        //=======================================================
        // Audit
        //=======================================================

        builder.Property
        (
            x =>
                x.CreatedBy
        )
        .IsRequired()
        .HasColumnName("CreatedBy")
        .HasColumnType("bigint");


        builder.Property
        (
            x =>
                x.CreatedDate
        )
        .IsRequired()
        .HasColumnName("CreatedDate")
        .HasColumnType("timestamp with time zone");


        builder.Property
        (
            x =>
                x.ModifiedBy
        )
        .HasColumnName("ModifiedBy")
        .HasColumnType("bigint");


        builder.Property
        (
            x =>
                x.ModifiedDate
        )
        .HasColumnName("ModifiedDate")
        .HasColumnType("timestamp with time zone");


        //=======================================================
        // Soft Delete
        //=======================================================

        builder.Property
        (
            x =>
                x.DeletedBy
        )
        .HasColumnName("DeletedBy")
        .HasColumnType("bigint");


        builder.Property
        (
            x =>
                x.DeletedDate
        )
        .HasColumnName("DeletedDate")
        .HasColumnType("timestamp with time zone");


        builder.Property
        (
            x =>
                x.IsDeleted
        )
        .IsRequired()
        .HasColumnName("IsDeleted")
        .HasColumnType("boolean")
        .HasDefaultValue(false);


        //=======================================================
        // Indexes
        //=======================================================

        builder.HasIndex
        (
            x =>
                x.CloneFromId
        );


        builder.HasIndex
        (
            x =>
                x.CloneToId
        );


        builder.HasIndex
        (
            x =>
                x.IsDeleted
        );
    }
}