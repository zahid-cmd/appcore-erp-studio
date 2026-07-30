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
// Navigation Menu Configuration
//===============================================================

public class NavigationMenuConfiguration
    : IEntityTypeConfiguration<NavigationMenu>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<NavigationMenu> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("NavigationMenus");

        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.Id);

        //===========================================================
        // Code Information
        //===========================================================

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
               .HasMaxLength(20);

        builder.HasIndex(x => x.Code)
               .IsUnique();

        //===========================================================
        // Foreign Key
        //===========================================================

        builder.Property(x => x.NavigationModuleId)
               .IsRequired();

        //===========================================================
        // Basic Information
        //===========================================================

        builder.Property(x => x.Name)
               .IsRequired()
               .HasMaxLength(100);

        builder.Property(x => x.Icon)
               .HasMaxLength(100);

        builder.Property(x => x.RouteKey)
               .IsRequired()
               .HasMaxLength(100);

        builder.HasIndex(x => new
        {
            x.NavigationModuleId,
            x.RouteKey
        })
        .IsUnique();

        builder.Property(x => x.Route)
               .HasMaxLength(200);

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
        // Relationships
        //===========================================================

        builder.HasOne(x => x.NavigationModule)
               .WithMany(x => x.Menus)
               .HasForeignKey(x => x.NavigationModuleId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Submenus)
               .WithOne(x => x.Menu)
               .HasForeignKey(x => x.NavigationMenuId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}