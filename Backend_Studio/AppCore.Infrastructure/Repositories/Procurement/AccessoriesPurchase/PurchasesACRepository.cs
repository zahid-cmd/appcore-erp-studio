//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Platform.Accounting;
using AppCore.Application.Procurement.AccessoriesPurchase;
using AppCore.Domain.Entities.Procurement.AccessoriesPurchase;
using AppCore.Domain.Platform.Accounting;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.Procurement.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Procurement.AccessoriesPurchase;


//===============================================================
// Purchases - AC : the shared Purchases engine with this page's
// tables, Purchase Order tables, number prefix and switch codes
//===============================================================

public class PurchasesAcRepository
    : PurchaseRepositoryBase<PurchasesAc, PurchasesAcLines, PurchaseOrdersAc, PurchaseOrdersAcLines>,
      IPurchasesAcRepository
{
    private static readonly PurchasePage ThisPage =
        new()
        {
            PageType = "AC",
            Prefix = VoucherTypes.PurchaseAccessories,
            Title = "Purchase - AC",
            TableName = "PurchasesAc",
            OrderTableName = "PurchaseOrdersAc",
            SupplyTypes = new[] { "Accessories", "General" },
            MrpPricing = true,
            SwitchPoRequired = "CFG-MOD-007-0019",
            SwitchCarryBalance = "CFG-MOD-007-0020",
            SwitchFreeGoods = "CFG-MOD-007-0029",
            SwitchRoundPayable = "CFG-MOD-007-0031",
            SwitchWholeTakaLines = "CFG-MOD-007-0033",
            SwitchEditSupplierTerms = "CFG-MOD-007-0039",
            SwitchBackDated = "CFG-MOD-007-0058",
            SwitchPostDated = "CFG-MOD-007-0059",
            SwitchMaxLines = "CFG-MOD-007-0060",
            SwitchMushakRequired = "CFG-MOD-007-0061",
            SwitchReceivedOnPurchase = "CFG-MOD-007-0062",
            SwitchPostOnApproval = "CFG-MOD-007-0063",
            SwitchPrintOnApproval = "CFG-MOD-007-0064",
            SwitchUnitsRequired = null,
            SwitchUniqueKeyNo = null,
            SwitchUniqueBatteryNo = null,
            SwitchInvoiceNoRequired = "CFG-MOD-007-0075",
            SwitchDoRequired = "CFG-MOD-007-0076",
            SwitchGatePassRequired = "CFG-MOD-007-0077",
            SwitchPriceAbovePo = "CFG-MOD-007-0078",
            SwitchVatAsPer63 = "CFG-MOD-007-0079",
            SwitchAboveMaxStock = "CFG-MOD-007-0085"
        };


    protected override PurchasePage Page =>
        ThisPage;


    public PurchasesAcRepository(
        AppDbContext context,
        IVoucherNumberService numberService,
        IVatApplicabilityService vatApplicability,
        IVoucherPostingService postingService)
        : base(
            context,
            numberService,
            vatApplicability,
            postingService)
    {
    }
}
