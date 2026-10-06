//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Designation Configuration
//===============================================================

public class DesignationConfiguration
    : IEntityTypeConfiguration<Designation>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<Designation> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("Designations");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.DesignationId);

        builder.Property(x => x.DesignationId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Designation Code
        //===========================================================

        builder.Property(x => x.DesignationCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.DesignationCode)
               .IsUnique();


        //===========================================================
        // Designation Name
        //===========================================================

        builder.Property(x => x.DesignationName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Designation Short Name
        //===========================================================

        builder.Property(x => x.DesignationShortName)
               .IsRequired()
               .HasMaxLength(100);


        //===========================================================
        // Configuration
        //===========================================================

        builder.Property(x => x.Remarks)
               .IsRequired()
               .HasMaxLength(1000);


        //===========================================================
        // Status
        //===========================================================

        builder.Property(x => x.IsActive)
               .IsRequired()
               .HasDefaultValue(true);


        //===========================================================
        // Soft Delete
        //===========================================================

        builder.Property(x => x.IsDeleted)
               .IsRequired();

        builder.Property(x => x.DeletedBy);

        builder.Property(x => x.DeletedDate);


        //===========================================================
        // Audit Information
        //===========================================================

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.Property(x => x.ModifiedBy);

        builder.Property(x => x.ModifiedDate);
    }
}