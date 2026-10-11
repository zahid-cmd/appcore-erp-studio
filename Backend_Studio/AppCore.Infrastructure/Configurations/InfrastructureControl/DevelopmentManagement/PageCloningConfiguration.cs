//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Page Cloning Configuration
//===============================================================

public class PageCloningConfiguration
    : IEntityTypeConfiguration<PageCloning>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<PageCloning> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("PageClonings");


        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.PageCloningId);

        builder.Property(x => x.PageCloningId)
               .ValueGeneratedOnAdd();


        //===========================================================
        // Clone From
        //===========================================================

        builder.Property(x => x.CloneFromId)
               .IsRequired();

        builder.HasIndex(x => x.CloneFromId);

        builder.Property(x => x.CloneFromCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.CloneFromName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Clone To
        //===========================================================

        builder.Property(x => x.CloneToId)
               .IsRequired();

        builder.HasIndex(x => x.CloneToId);

        builder.Property(x => x.CloneToCode)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(x => x.CloneToName)
               .IsRequired()
               .HasMaxLength(200);


        //===========================================================
        // Blueprint
        //===========================================================

        builder.Property(x => x.EntityName)
               .IsRequired()
               .HasMaxLength(200);

        builder.Property(x => x.BlueprintJson)
               .IsRequired()
               .HasColumnType("text");


        //===========================================================
        // Clone Run
        //===========================================================

        builder.Property(x => x.NumberOfFiles)
               .IsRequired()
               .HasDefaultValue(15);

        builder.Property(x => x.RunStatus)
               .IsRequired()
               .HasMaxLength(30)
               .HasDefaultValue("Draft");

        builder.HasIndex(x => x.RunStatus);

        builder.Property(x => x.LastRunDate);

        builder.Property(x => x.BuildOutput)
               .IsRequired()
               .HasColumnType("text");


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