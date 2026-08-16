//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Settings.GeneralSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Settings.GeneralSettings;


//===============================================================
// BranchConfiguration
//===============================================================

public class BranchConfiguration
    : IEntityTypeConfiguration<Branch>
{

    //===========================================================
    // Configure
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<Branch> builder
    )
    {

        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "{{TABLE_NAME}}"
        );


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x => x.Id
        );


        //=======================================================
        // Code
        //=======================================================

        builder.Property(
            x => x.Code
        )
        .IsRequired()
        .HasMaxLength(50);


        //=======================================================
        // Name
        //=======================================================

        builder.Property(
            x => x.Name
        )
        .IsRequired()
        .HasMaxLength(200);


        //=======================================================
        // Sample Search Dropdown
        //=======================================================

        builder.Property(
            x => x.SampleSearchDropdownId
        )
        .IsRequired(false);


        //=======================================================
        // Sample Field
        //=======================================================

        builder.Property(
            x => x.SampleField
        )
        .HasMaxLength(500);


        //=======================================================
        // Status
        //=======================================================

        builder.Property(
            x => x.Status
        )
        .IsRequired();


        //=======================================================
        // Remarks
        //=======================================================

        builder.Property(
            x => x.Remarks
        )
        .HasMaxLength(1000);
    }

}