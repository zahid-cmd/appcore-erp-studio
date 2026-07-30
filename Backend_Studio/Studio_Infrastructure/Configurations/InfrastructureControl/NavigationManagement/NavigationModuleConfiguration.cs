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
// Navigation Module Configuration
//===============================================================

public class NavigationModuleConfiguration
    : IEntityTypeConfiguration<NavigationModule>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<NavigationModule> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("NavigationModules");

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
               .HasMaxLength(20);

        builder.HasIndex(x => x.Code)
               .IsUnique();

        //===========================================================
        // Basic Information
        //===========================================================

        builder.Property(x => x.Name)
               .IsRequired()
               .HasMaxLength(100);

        builder.HasIndex(x => x.Name)
               .IsUnique();

        builder.Property(x => x.Icon)
               .HasMaxLength(100);

        builder.Property(x => x.RouteKey)
               .IsRequired()
               .HasMaxLength(100);

        builder.HasIndex(x => x.RouteKey)
               .IsUnique();

        builder.Property(x => x.DisplayOrder)
               .IsRequired();

        builder.HasIndex(x => x.DisplayOrder)
               .IsUnique();

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
        // Relationships
        //===========================================================

        builder.HasMany(x => x.Menus)
               .WithOne(x => x.NavigationModule)
               .HasForeignKey(x => x.NavigationModuleId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}