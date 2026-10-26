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
// Master Activity Pages Configuration
//===============================================================

public class MasterActivityPagesConfiguration
    : IEntityTypeConfiguration<MasterActivityPages>
{
    //===============================================================
    // Configure
    //===============================================================

    public void Configure(
        EntityTypeBuilder<MasterActivityPages> builder)
    {
        //===========================================================
        // Table
        //===========================================================

        builder.ToTable("MasterActivityPages");

        //===========================================================
        // Primary Key
        //===========================================================

        builder.HasKey(x => x.MasterActivityPageId);

        //===========================================================
        // Links
        //===========================================================

        builder.Property(x => x.MasterActivityCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.Property(x => x.NavigationSubmenuCode)
               .IsRequired()
               .HasMaxLength(40);

        builder.HasIndex(x => new { x.MasterActivityCode, x.NavigationSubmenuCode })
               .IsUnique()
               .HasDatabaseName("UX_MasterActivityPages_Activity_Submenu");

        //===========================================================
        // Audit
        //===========================================================

        builder.Property(x => x.CreatedDate)
               .IsRequired();
    }
}