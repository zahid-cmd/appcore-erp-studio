//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.AccountSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.AccountSettings;


//===============================================================
// Account Class Configuration
//===============================================================

public class AccountClassConfiguration
    : IEntityTypeConfiguration<AccountClass>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<AccountClass> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("AccountClasses");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.AccountClassId);

        builder.Property(x => x.AccountClassId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Class Type
        //===========================================================

        builder.Property(x => x.ClassType)
               .IsRequired()
               .HasMaxLength(50);


        //===========================================================
        // Class Code
        //===========================================================

        builder.Property(x => x.ClassCode)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.ClassCode)
               .IsUnique();


        //===========================================================
        // Class Name
        //===========================================================

        builder.Property(x => x.ClassName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Mode
        //===========================================================

        builder.Property(x => x.Mode)
               .IsRequired()
               .HasMaxLength(20);


        //===========================================================
        // Class Prefix
        //===========================================================

        builder.Property(x => x.ClassPrefix)
               .IsRequired()
               .HasMaxLength(10);


        //===========================================================
        // Manual Group Creation
        //===========================================================

        builder.Property(x => x.AllowManualGroupCreation)
               .IsRequired()
               .HasDefaultValue(false);


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