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
// Department Configuration
//===============================================================

public class DepartmentConfiguration
    : IEntityTypeConfiguration<Department>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<Department> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("Departments");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.DepartmentId);

        builder.Property(x => x.DepartmentId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Department Code
        //===========================================================

        builder.Property(x => x.DepartmentCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.DepartmentCode)
               .IsUnique();


        //===========================================================
        // Department Name
        //===========================================================

        builder.Property(x => x.DepartmentName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Department Short Name
        //===========================================================

        builder.Property(x => x.DepartmentShortName)
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