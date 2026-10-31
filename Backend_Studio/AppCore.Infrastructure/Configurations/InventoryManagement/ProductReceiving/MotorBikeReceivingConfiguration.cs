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
// Motor Bike Receiving : header + lines. The header is registered by Code
// Synchronization (DbSet); the lines enter the model through
// this class.
//===============================================================

public class MotorBikeReceivingConfiguration
    : IEntityTypeConfiguration<MotorBikeReceiving>,
      IEntityTypeConfiguration<MotorBikeReceivingLines>
{
    public void Configure(
        EntityTypeBuilder<MotorBikeReceiving> builder)
    {
        ReceivingModel.ConfigureHeader(builder, "MotorBikeReceiving");
    }


    public void Configure(
        EntityTypeBuilder<MotorBikeReceivingLines> builder)
    {
        ReceivingModel.ConfigureLine(builder, "MotorBikeReceivingLines");
    }
}
