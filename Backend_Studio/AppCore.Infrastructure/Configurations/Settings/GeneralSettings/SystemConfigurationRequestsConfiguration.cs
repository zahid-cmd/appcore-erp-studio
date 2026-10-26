//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Settings.GeneralSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence.Configurations.Settings.GeneralSettings;


//===============================================================
// System Configuration Requests Configuration
//
// Table created by SystemConfigurations_Redesign.sql.
//===============================================================

public class SystemConfigurationRequestsConfiguration
    : IEntityTypeConfiguration<SystemConfigurationRequests>
{
    public void Configure(
        EntityTypeBuilder<SystemConfigurationRequests> builder)
    {
        //=======================================================
        // Table / Key
        //=======================================================

        builder.ToTable("SystemConfigurationRequests");

        builder.HasKey(x => x.SystemConfigurationRequestId);

        builder.Property(x => x.SystemConfigurationRequestId)
               .ValueGeneratedOnAdd();


        //=======================================================
        // Switch (FK, no cascade)
        //=======================================================

        builder.Property(x => x.SystemConfigurationId)
               .IsRequired();

        builder.HasOne<SystemConfigurations>()
               .WithMany()
               .HasForeignKey(x => x.SystemConfigurationId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.Property(x => x.ConfigurationCode)
               .IsRequired()
               .HasMaxLength(50);

        // One Pending request per switch
        builder.HasIndex(x => x.ConfigurationCode)
               .HasDatabaseName("UX_SystemConfigurationRequests_OnePending")
               .IsUnique()
               .HasFilter("\"Status\" = 'Pending'");


        //=======================================================
        // From → To
        //=======================================================

        builder.Property(x => x.FromEnabled)
               .IsRequired();

        builder.Property(x => x.FromValue)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.ToEnabled)
               .IsRequired();

        builder.Property(x => x.ToValue)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.Reason)
               .IsRequired()
               .HasMaxLength(500);


        //=======================================================
        // Status / people
        //=======================================================

        // Concurrency token : two admins cannot both decide the
        // same request (the second save fails)
        builder.Property(x => x.Status)
               .IsRequired()
               .HasMaxLength(20)
               .IsConcurrencyToken();

        builder.Property(x => x.RequestedBy)
               .IsRequired();

        builder.Property(x => x.RequestedByName)
               .IsRequired()
               .HasMaxLength(150);

        builder.Property(x => x.RequestedDate)
               .IsRequired();

        builder.Property(x => x.DecidedByName)
               .HasMaxLength(150);

        builder.Property(x => x.DecisionNote)
               .HasMaxLength(500);
    }
}