//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Procurement.AccessoriesPurchase;
using AppCore.Infrastructure.Configurations.Procurement.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Procurement.AccessoriesPurchase;


//===============================================================
// Purchases - AC : header + lines.
// The header is registered by Code Synchronization (DbSet); the
// other entities enter the model through this class.
//===============================================================

public class PurchasesAcConfiguration
    : IEntityTypeConfiguration<PurchasesAc>,
      IEntityTypeConfiguration<PurchasesAcLines>
{
    public void Configure(
        EntityTypeBuilder<PurchasesAc> builder)
    {
        PurchaseModel.ConfigureHeader(builder, "PurchasesAc");
    }


    public void Configure(
        EntityTypeBuilder<PurchasesAcLines> builder)
    {
        PurchaseModel.ConfigureLine(builder, "PurchasesAcLines");
    }
}
