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
// Purchase Orders - SP Repository (Spare Parts & Lubricant Purchase)
//
// The work is done by PurchaseOrderRepositoryBase (shared by MB /
// SP / AC); this page only says what is its own : tables, number
// prefix, supply types, pricing and switch codes (Procurement ›
// Spare Parts & Lubricant Purchase › Purchase Orders - SP, always read BY CODE).
//===============================================================

public class PurchaseOrdersSpRepository
    : PurchaseOrderRepositoryBase<PurchaseOrdersSp, PurchaseOrdersSpLines>,
      IPurchaseOrdersSpRepository
{
    private static readonly PurchaseOrderPage ThisPage =
        new()
        {
            PageType = "SP",
            Prefix = VoucherTypes.PurchaseOrderSpareParts,
            Title = "Purchase Order - SP",
            TableName = "PurchaseOrdersSp",
            SupplyTypes = new[] { "Spare Parts", "General" },
            MrpPricing = true,

            SwitchPoRequired = "CFG-MOD-007-0010",
            SwitchCarryBalance = "CFG-MOD-007-0011",
            SwitchBackDated = "CFG-MOD-007-0012",
            SwitchPostDated = "CFG-MOD-007-0013",
            SwitchMaxLines = "CFG-MOD-007-0014",
            SwitchExpectedRequired = "CFG-MOD-007-0015",
            SwitchPrintOnApproval = "CFG-MOD-007-0016",
            SwitchPlaceOnApproval = "CFG-MOD-007-0018",
            SwitchFreeGoods = "CFG-MOD-007-0028",
            SwitchRoundPayable = "CFG-MOD-007-0030",
            SwitchWholeTakaLines = "CFG-MOD-007-0032",
            SwitchEditSupplierTerms = "CFG-MOD-007-0038",
            SwitchAboveMaxStock = "CFG-MOD-007-0081"
        };


    protected override PurchaseOrderPage Page =>
        ThisPage;


    public PurchaseOrdersSpRepository(
        AppDbContext context,
        IVoucherNumberService numberService,
        IVatApplicabilityService vatApplicability)
        : base(
            context,
            numberService,
            vatApplicability)
    {
    }
}