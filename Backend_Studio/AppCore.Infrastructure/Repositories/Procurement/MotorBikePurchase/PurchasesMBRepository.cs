//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Platform.Accounting;
using AppCore.Application.Procurement.MotorBikePurchase;
using AppCore.Domain.Entities.Procurement.MotorBikePurchase;
using AppCore.Domain.Platform.Accounting;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.Procurement.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Procurement.MotorBikePurchase;


//===============================================================
// Purchases - MB : the shared Purchases engine with this page's
// tables, Purchase Order tables, number prefix and switch codes
//===============================================================

public class PurchasesMbRepository
    : PurchaseRepositoryBase<PurchasesMb, PurchasesMbLines, PurchaseOrdersMb, PurchaseOrdersMbLines>,
      IPurchasesMbRepository
{
    private static readonly PurchasePage ThisPage =
        new()
        {
            PageType = "MB",
            Prefix = VoucherTypes.PurchaseMotorBikes,
            Title = "Purchase - MB",
            TableName = "PurchasesMb",
            OrderTableName = "PurchaseOrdersMb",
            SupplyTypes = new[] { "Motor Bikes", "General" },
            MrpPricing = false,
            SwitchPoRequired = "CFG-MOD-007-0001",
            SwitchCarryBalance = "CFG-MOD-007-0002",
            SwitchFreeGoods = null,
            SwitchRoundPayable = null,
            SwitchWholeTakaLines = null,
            SwitchEditSupplierTerms = "CFG-MOD-007-0040",
            SwitchBackDated = "CFG-MOD-007-0041",
            SwitchPostDated = "CFG-MOD-007-0042",
            SwitchMaxLines = "CFG-MOD-007-0043",
            SwitchMushakRequired = "CFG-MOD-007-0044",
            SwitchReceivedOnPurchase = "CFG-MOD-007-0045",
            SwitchPostOnApproval = "CFG-MOD-007-0046",
            SwitchPrintOnApproval = "CFG-MOD-007-0047",
            SwitchUnitsRequired = "CFG-MOD-007-0048",
            SwitchUniqueKeyNo = "CFG-MOD-007-0049",
            SwitchUniqueBatteryNo = "CFG-MOD-007-0050",
            SwitchInvoiceNoRequired = "CFG-MOD-007-0065",
            SwitchDoRequired = "CFG-MOD-007-0066",
            SwitchGatePassRequired = "CFG-MOD-007-0067",
            SwitchPriceAbovePo = "CFG-MOD-007-0068",
            SwitchVatAsPer63 = "CFG-MOD-007-0069",
            SwitchAboveMaxStock = "CFG-MOD-007-0083"
        };


    protected override PurchasePage Page =>
        ThisPage;


    public PurchasesMbRepository(
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
