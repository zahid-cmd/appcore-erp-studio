//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence.Configurations.InfrastructureControl.NavigationManagement;

//===============================================================
// Master Activity Configuration
//===============================================================

public class MasterActivityConfiguration
    : IEntityTypeConfiguration<MasterActivity>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<MasterActivity> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("MasterActivities");

        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.Id);

        //===========================================================
        // Code Information
        //===========================================================

        builder.Property(x => x.SequenceNo)
               .IsRequired();

        builder.HasIndex(x => x.SequenceNo)
               .IsUnique();

        builder.Property(x => x.Code)
               .IsRequired()
               .HasMaxLength(40);

        builder.HasIndex(x => x.Code)
               .IsUnique();

        //===========================================================
        // Basic Information
        //===========================================================

        builder.Property(x => x.Name)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.DisplayOrder)
               .IsRequired();

        builder.Property(x => x.Remarks)
               .HasMaxLength(500);

        //===========================================================
        // Status
        //===========================================================

        builder.Property(x => x.IsActive)
               .IsRequired();

        builder.Property(x => x.IsDeleted)
               .IsRequired();
    }
}