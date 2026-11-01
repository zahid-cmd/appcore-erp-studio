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
// Purchase Orders - SP Configuration
//
// One class configures the header and its lines (the database
// registers a configuration through its FIRST entity, the header,
// which has the Code Sync DbSet; the lines come with it). The
// columns are in PurchaseOrderModel (shared by MB / SP / AC).
//===============================================================

public class PurchaseOrdersSpConfiguration
    : IEntityTypeConfiguration<PurchaseOrdersSp>,
      IEntityTypeConfiguration<PurchaseOrdersSpLines>
{
    public void Configure(
        EntityTypeBuilder<PurchaseOrdersSp> builder)
    {
        PurchaseOrderModel.ConfigureHeader(builder, "PurchaseOrdersSp");
    }


    public void Configure(
        EntityTypeBuilder<PurchaseOrdersSpLines> builder)
    {
        PurchaseOrderModel.ConfigureLine(builder, "PurchaseOrdersSpLines");
    }
}