//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InventoryManagement.ProductReceiving;
using AppCore.Application.Platform.Accounting;
using AppCore.Domain.Entities.InventoryManagement.ProductReceiving;
using AppCore.Domain.Entities.Procurement.AccessoriesPurchase;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.InventoryManagement.ProductReceiving;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InventoryManagement.ProductReceiving;


//===============================================================
// Accessories Receiving : the shared Product Receiving engine
//===============================================================

public class AccessoriesReceivingRepository
    : ReceivingRepositoryBase<AccessoriesReceiving, AccessoriesReceivingLines, PurchasesAc, PurchasesAcLines>,
      IAccessoriesReceivingRepository
{
    private static readonly ReceivingPage PageInfo =
        new()
        {
            PageType = "AC",
            Prefix = "RCAC",
            Title = "Accessories Receiving",
            TableName = "AccessoriesReceiving",
            PurchaseTableName = "PurchasesAc",
            WholeUnits = false,
            HasShelves = true,
            SwitchBackDated = "CFG-MOD-012-0004",
            SwitchShelfRequired = "CFG-MOD-012-0005"
        };


    public AccessoriesReceivingRepository(
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
