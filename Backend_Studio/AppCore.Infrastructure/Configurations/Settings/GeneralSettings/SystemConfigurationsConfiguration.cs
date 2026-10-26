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
        // Configuration Name
        //
        // Unique per module + page / menu among active rows :
        // index "UX_SystemConfigurations_Scope_Name" (an
        // expression index, created by
        // SystemConfigurations_Redesign.sql; the repository
        // checks it too).
        //=======================================================

        builder.Property(x => x.ConfigurationName)
               .IsRequired()
               .HasMaxLength(200);


        //=======================================================
        // Scope : Module / Menu / Submenu (linked by code)
        //=======================================================

        builder.Property(x => x.ScopeType)
               .IsRequired()
               .HasMaxLength(10)
               .HasDefaultValue("Module");

        builder.Property(x => x.NavigationMenuCode)
               .HasMaxLength(30);

        builder.Property(x => x.NavigationSubmenuCode)
               .HasMaxLength(30);

        builder.HasIndex(x => x.NavigationSubmenuCode)
               .HasDatabaseName("IX_SystemConfigurations_SubmenuCode");


        //=======================================================
        // ON / OFF texts
        //=======================================================

        builder.Property(x => x.OnDescription)
               .IsRequired()
               .HasMaxLength(300)
               .HasDefaultValue(string.Empty);

        builder.Property(x => x.OffDescription)
               .IsRequired()
               .HasMaxLength(300)
               .HasDefaultValue(string.Empty);


        //=======================================================
        // Value definition
        //=======================================================

        builder.Property(x => x.ValueType)
               .IsRequired()
               .HasMaxLength(10)
               .HasDefaultValue("None");

        builder.Property(x => x.ValueUnit)
               .IsRequired()
               .HasMaxLength(30)
               .HasDefaultValue(string.Empty);

        builder.Property(x => x.ValueMin);

        builder.Property(x => x.ValueMax);

        builder.Property(x => x.ValueEmptyText)
               .IsRequired()
               .HasMaxLength(40)
               .HasDefaultValue(string.Empty);


        //=======================================================
        // Defaults
        //=======================================================

        builder.Property(x => x.DefaultEnabled)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(x => x.DefaultValue)
               .IsRequired()
               .HasMaxLength(100)
               .HasDefaultValue(string.Empty);


        //=======================================================
        // Parent / flags / order
        //=======================================================

        builder.Property(x => x.ParentConfigurationCode)
               .HasMaxLength(50);

        builder.Property(x => x.IsCritical)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(x => x.IsSystemDefined)
               .IsRequired()
               .HasDefaultValue(false);

        builder.Property(x => x.DisplayOrder)
               .IsRequired()
               .HasDefaultValue(0);


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