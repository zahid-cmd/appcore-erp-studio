//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence.Configurations.Settings.GeneralSettings;


//===============================================================
// System Configurations Configuration
//===============================================================

public class SystemConfigurationsConfiguration
    : IEntityTypeConfiguration<SystemConfigurations>
{
    //===========================================================
    // Configure
    //===========================================================

    public void Configure(
        EntityTypeBuilder<SystemConfigurations> builder)
    {
        //=======================================================
        // Table
        //=======================================================

        builder.ToTable("SystemConfigurations");


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(x => x.SystemConfigurationId);

        builder.Property(x => x.SystemConfigurationId)
               .ValueGeneratedOnAdd();


        //=======================================================
        // Navigation Module (FK, no cascade)
        //=======================================================

        builder.Property(x => x.NavigationModuleId)
               .IsRequired();

        builder.HasIndex(x => x.NavigationModuleId);

        builder.HasOne<NavigationModule>()
               .WithMany()
               .HasForeignKey(x => x.NavigationModuleId)
               .OnDelete(DeleteBehavior.Restrict);


        //=======================================================
        // Configuration Code (unique, deleted rows included so
        // a code is never reused)
        //=======================================================

        builder.Property(x => x.ConfigurationCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.HasIndex(x => x.ConfigurationCode)
               .IsUnique();


        //=======================================================
        // Configuration Name (unique per module, active rows)
        //=======================================================

        builder.Property(x => x.ConfigurationName)
               .IsRequired()
               .HasMaxLength(200);

        builder.HasIndex(x => new { x.NavigationModuleId, x.ConfigurationName })
               .IsUnique()
               .HasFilter("\"IsDeleted\" = false");


        //=======================================================
        // Enabled
        //=======================================================

        builder.Property(x => x.IsEnabled)
               .IsRequired()
               .HasDefaultValue(false);


        //=======================================================
        // Value (optional : number or short text)
        //=======================================================

        builder.Property(x => x.Value)
               .IsRequired()
               .HasMaxLength(100)
               .HasDefaultValue(string.Empty);


        //=======================================================
        // Remarks
        //=======================================================

        builder.Property(x => x.Remarks)
               .HasMaxLength(1000);


        //=======================================================
        // Soft Delete
        //=======================================================

        builder.Property(x => x.IsDeleted)
               .IsRequired();

        builder.Property(x => x.DeletedBy);

        builder.Property(x => x.DeletedDate);


        //=======================================================
        // Audit Information
        //=======================================================

        builder.Property(x => x.CreatedBy)
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .IsRequired();

        builder.Property(x => x.ModifiedBy);

        builder.Property(x => x.ModifiedDate);
    }
}