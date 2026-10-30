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
// Purchase Orders - AC Repository (Accessories Purchase)
//
// The work is done by PurchaseOrderRepositoryBase (shared by MB /
// SP / AC); this page only says what is its own : tables, number
// prefix, supply types, pricing and switch codes (Procurement ›
// Accessories Purchase › Purchase Orders - AC, always read BY CODE).
//===============================================================

public class PurchaseOrdersAcRepository
    : PurchaseOrderRepositoryBase<PurchaseOrdersAc, PurchaseOrdersAcLines>,
      IPurchaseOrdersAcRepository
{
    private static readonly PurchaseOrderPage ThisPage =
        new()
        {
            PageType = "AC",
            Prefix = VoucherTypes.PurchaseOrderAccessories,
            Title = "Purchase Order - AC",
            TableName = "PurchaseOrdersAc",
            SupplyTypes = new[] { "Accessories", "General" },
            MrpPricing = true,

            SwitchPoRequired = "CFG-MOD-007-0019",
            SwitchCarryBalance = "CFG-MOD-007-0020",
            SwitchBackDated = "CFG-MOD-007-0021",
            SwitchPostDated = "CFG-MOD-007-0022",
            SwitchMaxLines = "CFG-MOD-007-0023",
            SwitchExpectedRequired = "CFG-MOD-007-0024",
            SwitchPrintOnApproval = "CFG-MOD-007-0025",
            SwitchPlaceOnApproval = "CFG-MOD-007-0027",
            SwitchFreeGoods = "CFG-MOD-007-0029",
            SwitchRoundPayable = "CFG-MOD-007-0031",
            SwitchWholeTakaLines = "CFG-MOD-007-0033",
            SwitchEditSupplierTerms = "CFG-MOD-007-0039"
        };


    protected override PurchaseOrderPage Page =>
        ThisPage;


    public PurchaseOrdersAcRepository(
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