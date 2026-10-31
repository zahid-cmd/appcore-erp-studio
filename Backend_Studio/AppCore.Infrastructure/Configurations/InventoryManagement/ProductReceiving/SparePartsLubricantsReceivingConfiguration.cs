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
// Spare Parts & Lubricants Receiving : header + lines. The header is registered by Code
// Synchronization (DbSet); the lines enter the model through
// this class.
//===============================================================

public class SparePartsLubricantsReceivingConfiguration
    : IEntityTypeConfiguration<SparePartsLubricantsReceiving>,
      IEntityTypeConfiguration<SparePartsLubricantsReceivingLines>
{
    public void Configure(
        EntityTypeBuilder<SparePartsLubricantsReceiving> builder)
    {
        ReceivingModel.ConfigureHeader(builder, "SparePartsLubricantsReceiving");
    }


    public void Configure(
        EntityTypeBuilder<SparePartsLubricantsReceivingLines> builder)
    {
        ReceivingModel.ConfigureLine(builder, "SparePartsLubricantsReceivingLines");
    }
}
