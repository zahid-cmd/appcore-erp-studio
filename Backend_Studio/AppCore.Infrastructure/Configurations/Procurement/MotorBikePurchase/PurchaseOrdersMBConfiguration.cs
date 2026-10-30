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
// Purchase Orders - MB Configuration
//
// One class configures the header and its lines (the database
// registers a configuration through its FIRST entity, the header,
// which has the Code Sync DbSet; the lines come with it). The
// columns are in PurchaseOrderModel (shared by MB / SP / AC).
//===============================================================

public class PurchaseOrdersMbConfiguration
    : IEntityTypeConfiguration<PurchaseOrdersMb>,
      IEntityTypeConfiguration<PurchaseOrdersMbLines>
{
    public void Configure(
        EntityTypeBuilder<PurchaseOrdersMb> builder)
    {
        PurchaseOrderModel.ConfigureHeader(builder, "PurchaseOrdersMb");
    }


    public void Configure(
        EntityTypeBuilder<PurchaseOrdersMbLines> builder)
    {
        PurchaseOrderModel.ConfigureLine(builder, "PurchaseOrdersMbLines");
    }
}