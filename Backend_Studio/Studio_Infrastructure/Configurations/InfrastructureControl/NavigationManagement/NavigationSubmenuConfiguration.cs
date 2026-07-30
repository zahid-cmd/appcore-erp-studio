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
// Navigation Submenu Configuration
//===============================================================

public class NavigationSubmenuConfiguration
    : IEntityTypeConfiguration<NavigationSubmenu>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<NavigationSubmenu> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("NavigationSubmenus");

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
            x.NavigationMenuId,
            x.SequenceNo
        })
        .IsUnique();

        builder.Property(x => x.Code)
               .IsRequired()
               .HasMaxLength(30);

        builder.HasIndex(x => x.Code)
               .IsUnique();

        //===========================================================
        // Foreign Key
        //===========================================================

        builder.Property(x => x.NavigationMenuId)
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
            x.NavigationMenuId,
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
        // Relationship
        //===========================================================

        builder.HasOne(x => x.Menu)
               .WithMany(x => x.Submenus)
               .HasForeignKey(x => x.NavigationMenuId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}