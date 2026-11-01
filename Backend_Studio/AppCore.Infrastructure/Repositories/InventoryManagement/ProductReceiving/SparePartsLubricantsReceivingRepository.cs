//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InventoryManagement.ProductReceiving;
using AppCore.Application.Platform.Accounting;
using AppCore.Domain.Entities.InventoryManagement.ProductReceiving;
using AppCore.Domain.Entities.Procurement.SparePartsLubricantPurchase;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.InventoryManagement.ProductReceiving;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InventoryManagement.ProductReceiving;


//===============================================================
// Spare Parts & Lubricants Receiving : the shared Product Receiving engine
//===============================================================

public class SparePartsLubricantsReceivingRepository
    : ReceivingRepositoryBase<SparePartsLubricantsReceiving, SparePartsLubricantsReceivingLines, PurchasesSp, PurchasesSpLines>,
      ISparePartsLubricantsReceivingRepository
{
    private static readonly ReceivingPage PageInfo =
        new()
        {
            PageType = "SP",
            Prefix = "RCSP",
            Title = "Spare Parts & Lubricants Receiving",
            TableName = "SparePartsLubricantsReceiving",
            PurchaseTableName = "PurchasesSp",
            WholeUnits = false,
            HasShelves = true,
            SwitchBackDated = "CFG-MOD-012-0002",
            SwitchShelfRequired = "CFG-MOD-012-0003"
        };


    public SparePartsLubricantsReceivingRepository(
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
