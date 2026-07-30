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
// Navigation Activity Configuration
//===============================================================

public class NavigationActivityConfiguration
    : IEntityTypeConfiguration<NavigationActivity>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<NavigationActivity> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("NavigationActivities");

        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.Id);

        //===========================================================
        // Code Information
        //===========================================================

        builder.Property(x => x.NavigationModuleId)
               .IsRequired();

        builder.Property(x => x.SequenceNo)
               .IsRequired();

        builder.HasIndex(x => new
        {
            x.NavigationModuleId,
            x.SequenceNo
        })
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

        //===========================================================
        // Relationship
        //===========================================================

        builder.HasOne(x => x.NavigationModule)

               .WithMany(x => x.Activities)

               .HasForeignKey(x => x.NavigationModuleId)

               .OnDelete(DeleteBehavior.Restrict);
    }
}