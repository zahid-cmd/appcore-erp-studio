//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InventoryManagement.ProductReceiving;
using AppCore.Application.Platform.Accounting;
using AppCore.Domain.Entities.InventoryManagement.ProductReceiving;
using AppCore.Domain.Entities.Procurement.MotorBikePurchase;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.InventoryManagement.ProductReceiving;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InventoryManagement.ProductReceiving;


//===============================================================
// Motor Bike Receiving : the shared Product Receiving engine
//===============================================================

public class MotorBikeReceivingRepository
    : ReceivingRepositoryBase<MotorBikeReceiving, MotorBikeReceivingLines, PurchasesMb, PurchasesMbLines>,
      IMotorBikeReceivingRepository
{
    private static readonly ReceivingPage PageInfo =
        new()
        {
            PageType = "MB",
            Prefix = "RCMB",
            Title = "Motor Bike Receiving",
            TableName = "MotorBikeReceiving",
            PurchaseTableName = "PurchasesMb",
            WholeUnits = true,
            HasShelves = false,
            SwitchBackDated = "CFG-MOD-012-0001",
            SwitchUnitsRequired = "CFG-MOD-007-0048",
            SwitchUniqueKeyNo = "CFG-MOD-007-0049",
            SwitchUniqueBatteryNo = "CFG-MOD-007-0050"
        };


    public MotorBikeReceivingRepository(
        AppDbContext context,
        IVoucherNumberService numberService)
        : base(
            context,
            numberService)
    {
    }


    protected override ReceivingPage Page =>
        PageInfo;
}
