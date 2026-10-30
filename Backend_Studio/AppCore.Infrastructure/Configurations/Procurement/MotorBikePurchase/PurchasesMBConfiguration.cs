//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Procurement.MotorBikePurchase;
using AppCore.Infrastructure.Configurations.Procurement.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Procurement.MotorBikePurchase;


//===============================================================
// Purchases - MB : header + lines + motor bike units.
// The header is registered by Code Synchronization (DbSet); the
// other entities enter the model through this class.
//===============================================================

public class PurchasesMbConfiguration
    : IEntityTypeConfiguration<PurchasesMb>,
      IEntityTypeConfiguration<PurchasesMbLines>,
      IEntityTypeConfiguration<MotorBikeUnits>
{
    public void Configure(
        EntityTypeBuilder<PurchasesMb> builder)
    {
        PurchaseModel.ConfigureHeader(builder, "PurchasesMb");
    }


    public void Configure(
        EntityTypeBuilder<PurchasesMbLines> builder)
    {
        PurchaseModel.ConfigureLine(builder, "PurchasesMbLines");
    }


    public void Configure(
        EntityTypeBuilder<MotorBikeUnits> builder)
    {
        PurchaseModel.ConfigureUnits(builder);
    }
}
