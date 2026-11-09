//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AppCore.Domain.Entities.InfrastructureControl.CodeManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InfrastructureControl.CodeManagement;


//===============================================================
// DeploymentCenterConfiguration
//
// Table "DeploymentCenter" (columns added by
// Database\DeploymentCenter_Setup.sql). The old template columns
// sampleSearchDropdownId / sampleField stay but are not mapped.
//===============================================================

public class DeploymentCenterConfiguration
    : IEntityTypeConfiguration<DeploymentCenter>
{
    public void Configure
    (
        EntityTypeBuilder<DeploymentCenter> builder
    )
    {
        builder.ToTable("DeploymentCenter");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
               .HasColumnName("id");

        // Public Id (links and API calls; uuid v7)
        builder.Property(x => x.PublicId)
               .HasColumnName("publicId")
               .IsRequired()
               .HasDefaultValueSql("uuidv7()");

        builder.HasIndex(x => x.PublicId)
               .IsUnique()
               .HasDatabaseName("UX_DeploymentCenter_PublicId");

        builder.Property(x => x.Code)
               .HasColumnName("code")
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.Name)
               .HasColumnName("name")
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.ServerManagementId)
               .HasColumnName("serverManagementId")
               .IsRequired();

        builder.Property(x => x.ServerName)
               .HasColumnName("serverName")
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.Kind)
               .HasColumnName("kind")
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.DeployStatus)
               .HasColumnName("deployStatus")
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.Step)
               .HasColumnName("step")
               .IsRequired()
               .HasMaxLength(300);

        builder.Property(x => x.Percent)
               .HasColumnName("percent")
               .IsRequired();

        builder.Property(x => x.AgentJobId)
               .HasColumnName("agentJobId")
               .IsRequired()
               .HasMaxLength(64);

        builder.Property(x => x.BackupFile)
               .HasColumnName("backupFile")
               .IsRequired()
               .HasMaxLength(400);

        builder.Property(x => x.PreviousRelease)
               .HasColumnName("previousRelease")
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.PackageMb)
               .HasColumnName("packageMb")
               .HasColumnType("numeric(10,2)")
               .IsRequired();

        builder.Property(x => x.StartedDate)
               .HasColumnName("startedDate")
               .IsRequired(false);

        builder.Property(x => x.FinishedDate)
               .HasColumnName("finishedDate")
               .IsRequired(false);

        builder.Property(x => x.DurationSeconds)
               .HasColumnName("durationSeconds")
               .IsRequired();

        builder.Property(x => x.Log)
               .HasColumnName("log")
               .IsRequired();

        builder.Property(x => x.Branch)
               .HasColumnName("branch")
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.CommitHash)
               .HasColumnName("commitHash")
               .IsRequired()
               .HasMaxLength(64);

        builder.Property(x => x.CommitMessage)
               .HasColumnName("commitMessage")
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.PerformedByName)
               .HasColumnName("performedByName")
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.ReleaseNotes)
               .HasColumnName("releaseNotes")
               .IsRequired();

        builder.Property(x => x.Version)
               .HasColumnName("version")
               .IsRequired()
               .HasMaxLength(20);

        builder.Property(x => x.ChangeType)
               .HasColumnName("changeType")
               .IsRequired()
               .HasMaxLength(10);

        builder.Property(x => x.WhatsNew)
               .HasColumnName("whatsNew")
               .IsRequired();

        builder.Property(x => x.Status)
               .HasColumnName("status")
               .IsRequired();

        builder.Property(x => x.Remarks)
               .HasColumnName("remarks")
               .IsRequired()
               .HasMaxLength(1000);

        builder.Property(x => x.IsActive)
               .HasColumnName("isActive")
               .IsRequired();

        builder.Property(x => x.IsDeleted)
               .HasColumnName("isDeleted")
               .IsRequired();

        builder.Property(x => x.CreatedBy)
               .HasColumnName("createdBy")
               .IsRequired();

        builder.Property(x => x.CreatedDate)
               .HasColumnName("createdDate")
               .IsRequired();

        builder.Property(x => x.ModifiedBy)
               .HasColumnName("modifiedBy")
               .IsRequired(false);

        builder.Property(x => x.ModifiedDate)
               .HasColumnName("modifiedDate")
               .IsRequired(false);
    }
}
