//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.InventoryManagement.ProductReceiving;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InventoryManagement.ProductReceiving;


//===============================================================
// Accessories Receiving : header + lines. The header is registered by Code
// Synchronization (DbSet); the lines enter the model through
// this class.
//===============================================================

public class AccessoriesReceivingConfiguration
    : IEntityTypeConfiguration<AccessoriesReceiving>,
      IEntityTypeConfiguration<AccessoriesReceivingLines>
{
    public void Configure(
        EntityTypeBuilder<AccessoriesReceiving> builder)
    {
        ReceivingModel.ConfigureHeader(builder, "AccessoriesReceiving");
    }


    public void Configure(
        EntityTypeBuilder<AccessoriesReceivingLines> builder)
    {
        ReceivingModel.ConfigureLine(builder, "AccessoriesReceivingLines");
    }
}
