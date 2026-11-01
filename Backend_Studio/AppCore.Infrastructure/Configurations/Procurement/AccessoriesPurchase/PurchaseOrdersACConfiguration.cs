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
// Purchase Orders - AC Configuration
//
// One class configures the header and its lines (the database
// registers a configuration through its FIRST entity, the header,
// which has the Code Sync DbSet; the lines come with it). The
// columns are in PurchaseOrderModel (shared by MB / SP / AC).
//===============================================================

public class PurchaseOrdersAcConfiguration
    : IEntityTypeConfiguration<PurchaseOrdersAc>,
      IEntityTypeConfiguration<PurchaseOrdersAcLines>
{
    public void Configure(
        EntityTypeBuilder<PurchaseOrdersAc> builder)
    {
        PurchaseOrderModel.ConfigureHeader(builder, "PurchaseOrdersAc");
    }


    public void Configure(
        EntityTypeBuilder<PurchaseOrdersAcLines> builder)
    {
        PurchaseOrderModel.ConfigureLine(builder, "PurchaseOrdersAcLines");
    }
}