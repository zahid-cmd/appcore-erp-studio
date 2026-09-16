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
// SourceControlConfiguration
//===============================================================

public class SourceControlConfiguration
    : IEntityTypeConfiguration<SourceControl>
{

    //===========================================================
    // Configure
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<SourceControl> builder
    )
    {

        //=======================================================
        // Table
        //=======================================================

        builder.ToTable(
            "SourceControl"
        );


        //=======================================================
        // Primary Key
        //=======================================================

        builder.HasKey(
            x => x.SourceControlId
        );


        builder.Property(
            x => x.SourceControlId
        )
        .HasColumnName(
            "sourceControlId"
        )
        .ValueGeneratedOnAdd();


        //=======================================================
        // Repository Code
        //=======================================================

        builder.Property(
            x => x.RepositoryCode
        )
        .HasColumnName(
            "repositoryCode"
        )
        .IsRequired()
        .HasMaxLength(50);


        //=======================================================
        // Repository Name
        //=======================================================

        builder.Property(
            x => x.RepositoryName
        )
        .HasColumnName(
            "repositoryName"
        )
        .IsRequired()
        .HasMaxLength(200);


        //=======================================================
        // Git Remote URL
        //=======================================================

        builder.Property(
            x => x.GitRemoteUrl
        )
        .HasColumnName(
            "gitRemoteUrl"
        )
        .IsRequired()
        .HasMaxLength(500);


        //=======================================================
        // Default Branch
        //=======================================================

        builder.Property(
            x => x.DefaultBranch
        )
        .HasColumnName(
            "defaultBranch"
        )
        .IsRequired()
        .HasMaxLength(100);


        //=======================================================
        // Repository Path
        //=======================================================

        builder.Property(
            x => x.RepositoryPath
        )
        .HasColumnName(
            "repositoryPath"
        )
        .IsRequired()
        .HasMaxLength(500);


        //=======================================================
        // Remarks
        //=======================================================

        builder.Property(
            x => x.Remarks
        )
        .HasColumnName(
            "remarks"
        )
        .IsRequired(false)
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
        // Deleted By
        //=======================================================

        builder.Property(
            x => x.DeletedBy
        )
        .HasColumnName(
            "deletedBy"
        )
        .IsRequired(false);


        //=======================================================
        // Deleted Date
        //=======================================================

        builder.Property(
            x => x.DeletedDate
        )
        .HasColumnName(
            "deletedDate"
        )
        .IsRequired(false);


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