//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InfrastructureControl.ApplicationConfiguration;


//===============================================================
// LoginPagesConfiguration
//===============================================================

public class LoginPagesConfiguration
    : IEntityTypeConfiguration<LoginPages>
{

    //===========================================================
    // Configure
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<LoginPages> builder
    )
    {

        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "LoginPages"
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
        );


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
        // Page Key
        //=======================================================

        builder.Property(
            x => x.PageKey
        )
        .HasColumnName(
            "pageKey"
        )
        .IsRequired()
        .HasMaxLength(200);


        //=======================================================
        // Title
        //=======================================================

        builder.Property(
            x => x.Title
        )
        .HasColumnName(
            "title"
        )
        .IsRequired()
        .HasMaxLength(500);


        //=======================================================
        // Subtitle
        //=======================================================

        builder.Property(
            x => x.Subtitle
        )
        .HasColumnName(
            "subtitle"
        )
        .IsRequired()
        .HasMaxLength(1000);


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