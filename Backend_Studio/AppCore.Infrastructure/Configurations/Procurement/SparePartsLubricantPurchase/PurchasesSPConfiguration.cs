//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

using AppCore.Domain.Entities.Procurement.SparePartsLubricantPurchase;
using AppCore.Infrastructure.Configurations.Procurement.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Procurement.SparePartsLubricantPurchase;


//===============================================================
// Purchases - SP : header + lines.
// The header is registered by Code Synchronization (DbSet); the
// other entities enter the model through this class.
//===============================================================

public class PurchasesSpConfiguration
    : IEntityTypeConfiguration<PurchasesSp>,
      IEntityTypeConfiguration<PurchasesSpLines>
{
    public void Configure(
        EntityTypeBuilder<PurchasesSp> builder)
    {
        PurchaseModel.ConfigureHeader(builder, "PurchasesSp");
    }


    public void Configure(
        EntityTypeBuilder<PurchasesSpLines> builder)
    {
        PurchaseModel.ConfigureLine(builder, "PurchasesSpLines");
    }
}
