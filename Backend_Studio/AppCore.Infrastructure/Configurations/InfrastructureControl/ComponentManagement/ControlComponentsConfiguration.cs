//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.InfrastructureControl.ComponentManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InfrastructureControl.ComponentManagement;


//===============================================================
// ControlComponentsConfiguration
//===============================================================

public class ControlComponentsConfiguration
    : IEntityTypeConfiguration<ControlComponents>
{

    //===========================================================
    // Configure
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<ControlComponents> builder
    )
    {

        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "ControlComponents"
        );


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x => x.Id
        );


        builder.Property(
            x => x.Id
        )
        .HasColumnName(
            "id"
        )
        .ValueGeneratedOnAdd()
        .UseIdentityByDefaultColumn();


        //=======================================================
        // Code
        //=======================================================

        builder.Property(
            x => x.Code
        )
        .HasColumnName(
            "code"
        )
        .IsRequired()
        .HasMaxLength(50);


        //=======================================================
        // Name
        //=======================================================

        builder.Property(
            x => x.Name
        )
        .HasColumnName(
            "name"
        )
        .IsRequired()
        .HasMaxLength(200);


        //=======================================================
        // Tab Name
        //=======================================================

        builder.Property(
            x => x.TabName
        )
        .HasColumnName(
            "tabName"
        )
        .IsRequired()
        .HasMaxLength(200);


        //=======================================================
        // Component Key
        //=======================================================

        builder.Property(
            x => x.ComponentKey
        )
        .HasColumnName(
            "componentKey"
        )
        .IsRequired()
        .HasMaxLength(200);


        //=======================================================
        // Display Order
        //=======================================================

        builder.Property(
            x => x.DisplayOrder
        )
        .HasColumnName(
            "displayOrder"
        )
        .IsRequired();


        //=======================================================
        // Icon
        //=======================================================

        builder.Property(
            x => x.Icon
        )
        .HasColumnName(
            "icon"
        )
        .IsRequired()
        .HasMaxLength(200);


        //=======================================================
        // Component Path
        //=======================================================

        builder.Property(
            x => x.ComponentPath
        )
        .HasColumnName(
            "componentPath"
        )
        .IsRequired()
        .HasMaxLength(500);


        //=======================================================
        // Status
        //=======================================================

        builder.Property(
            x => x.Status
        )
        .HasColumnName(
            "status"
        )
        .IsRequired();


        //=======================================================
        // Remarks
        //=======================================================

        builder.Property(
            x => x.Remarks
        )
        .HasColumnName(
            "remarks"
        )
        .IsRequired()
        .HasMaxLength(1000);


        //=======================================================
        // Active
        //=======================================================

        builder.Property(
            x => x.IsActive
        )
        .HasColumnName(
            "isActive"
        )
        .IsRequired();


        //=======================================================
        // Deleted
        //=======================================================

        builder.Property(
            x => x.IsDeleted
        )
        .HasColumnName(
            "isDeleted"
        )
        .IsRequired();


        //=======================================================
        // Created By
        //=======================================================

        builder.Property(
            x => x.CreatedBy
        )
        .HasColumnName(
            "createdBy"
        )
        .IsRequired();


        //=======================================================
        // Created Date
        //=======================================================

        builder.Property(
            x => x.CreatedDate
        )
        .HasColumnName(
            "createdDate"
        )
        .IsRequired();


        //=======================================================
        // Modified By
        //=======================================================

        builder.Property(
            x => x.ModifiedBy
        )
        .HasColumnName(
            "modifiedBy"
        )
        .IsRequired(false);


        //=======================================================
        // Modified Date
        //=======================================================

        builder.Property(
            x => x.ModifiedDate
        )
        .HasColumnName(
            "modifiedDate"
        )
        .IsRequired(false);
    }

}