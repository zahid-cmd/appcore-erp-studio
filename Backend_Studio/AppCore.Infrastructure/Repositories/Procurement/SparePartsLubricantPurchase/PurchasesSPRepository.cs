//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Platform.Accounting;
using AppCore.Application.Procurement.SparePartsLubricantPurchase;
using AppCore.Domain.Entities.Procurement.SparePartsLubricantPurchase;
using AppCore.Domain.Platform.Accounting;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.Procurement.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Procurement.SparePartsLubricantPurchase;


//===============================================================
// Purchases - SP : the shared Purchases engine with this page's
// tables, Purchase Order tables, number prefix and switch codes
//===============================================================

public class PurchasesSpRepository
    : PurchaseRepositoryBase<PurchasesSp, PurchasesSpLines, PurchaseOrdersSp, PurchaseOrdersSpLines>,
      IPurchasesSpRepository
{
    private static readonly PurchasePage ThisPage =
        new()
        {
            PageType = "SP",
            Prefix = VoucherTypes.PurchaseSpareParts,
            Title = "Purchase - SP",
            TableName = "PurchasesSp",
            OrderTableName = "PurchaseOrdersSp",
            SupplyTypes = new[] { "Spare Parts", "General" },
            MrpPricing = true,
            SwitchPoRequired = "CFG-MOD-007-0010",
            SwitchCarryBalance = "CFG-MOD-007-0011",
            SwitchFreeGoods = "CFG-MOD-007-0028",
            SwitchRoundPayable = "CFG-MOD-007-0030",
            SwitchWholeTakaLines = "CFG-MOD-007-0032",
            SwitchEditSupplierTerms = "CFG-MOD-007-0038",
            SwitchBackDated = "CFG-MOD-007-0051",
            SwitchPostDated = "CFG-MOD-007-0052",
            SwitchMaxLines = "CFG-MOD-007-0053",
            SwitchMushakRequired = "CFG-MOD-007-0054",
            SwitchReceivedOnPurchase = "CFG-MOD-007-0055",
            SwitchPostOnApproval = "CFG-MOD-007-0056",
            SwitchPrintOnApproval = "CFG-MOD-007-0057",
            SwitchUnitsRequired = null,
            SwitchUniqueKeyNo = null,
            SwitchUniqueBatteryNo = null,
            SwitchInvoiceNoRequired = "CFG-MOD-007-0070",
            SwitchDoRequired = "CFG-MOD-007-0071",
            SwitchGatePassRequired = "CFG-MOD-007-0072",
            SwitchPriceAbovePo = "CFG-MOD-007-0073",
            SwitchVatAsPer63 = "CFG-MOD-007-0074",
            SwitchAboveMaxStock = "CFG-MOD-007-0084"
        };


    protected override PurchasePage Page =>
        ThisPage;


    public PurchasesSpRepository(
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
