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
// ServerManagementConfiguration
//
// Table "ServerManagement" (columns added by
// Database\ServerManagement_Setup.sql). The old template columns
// sampleSearchDropdownId / sampleField stay in the table but are
// not mapped any more.
//===============================================================

public class ServerManagementConfiguration
    : IEntityTypeConfiguration<ServerManagement>
{
    public void Configure
    (
        EntityTypeBuilder<ServerManagement> builder
    )
    {
        builder.ToTable("ServerManagement");

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
               .HasDatabaseName("UX_ServerManagement_PublicId");

        builder.Property(x => x.Code)
               .HasColumnName("code")
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.Name)
               .HasColumnName("name")
               .IsRequired()
               .HasMaxLength(200);

        //=======================================================
        // Connection
        //=======================================================

        builder.Property(x => x.HostAddress)
               .HasColumnName("hostAddress")
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.AgentPort)
               .HasColumnName("agentPort")
               .IsRequired();

        builder.Property(x => x.AgentToken)
               .HasColumnName("agentToken")
               .IsRequired();

        builder.Property(x => x.AppUrl)
               .HasColumnName("appUrl")
               .IsRequired()
               .HasMaxLength(300);

        builder.Property(x => x.Environment)
               .HasColumnName("environment")
               .IsRequired()
               .HasMaxLength(30);

        //=======================================================
        // Last check
        //=======================================================

        builder.Property(x => x.LastCheckedDate)
               .HasColumnName("lastCheckedDate")
               .IsRequired(false);

        builder.Property(x => x.LastCheckStatus)
               .HasColumnName("lastCheckStatus")
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.LastCheckMessage)
               .HasColumnName("lastCheckMessage")
               .IsRequired()
               .HasMaxLength(500);

        builder.Property(x => x.AgentVersion)
               .HasColumnName("agentVersion")
               .IsRequired()
               .HasMaxLength(30);

        builder.Property(x => x.CurrentRelease)
               .HasColumnName("currentRelease")
               .IsRequired()
               .HasMaxLength(30);

        //=======================================================
        // Status / Audit
        //=======================================================

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
