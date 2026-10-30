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
// Purchase Orders - MB Repository (Motor Bike Purchase)
//
// The work is done by PurchaseOrderRepositoryBase (shared by MB /
// SP / AC); this page only says what is its own : tables, number
// prefix, supply types, pricing and switch codes (Procurement ›
// Motor Bike Purchase › Purchase Orders - MB, always read BY CODE).
//===============================================================

public class PurchaseOrdersMbRepository
    : PurchaseOrderRepositoryBase<PurchaseOrdersMb, PurchaseOrdersMbLines>,
      IPurchaseOrdersMbRepository
{
    private static readonly PurchaseOrderPage ThisPage =
        new()
        {
            PageType = "MB",
            Prefix = VoucherTypes.PurchaseOrderMotorBikes,
            Title = "Purchase Order - MB",
            TableName = "PurchaseOrdersMb",
            SupplyTypes = new[] { "Motor Bikes", "General" },
            MrpPricing = false,

            SwitchPoRequired = "CFG-MOD-007-0001",
            SwitchCarryBalance = "CFG-MOD-007-0002",
            SwitchBackDated = "CFG-MOD-007-0003",
            SwitchPostDated = "CFG-MOD-007-0004",
            SwitchMaxLines = "CFG-MOD-007-0005",
            SwitchExpectedRequired = "CFG-MOD-007-0006",
            SwitchPrintOnApproval = "CFG-MOD-007-0007",
            SwitchPlaceOnApproval = "CFG-MOD-007-0009",
            SwitchFreeGoods = null,
            SwitchRoundPayable = null,
            SwitchWholeTakaLines = null,
            SwitchEditSupplierTerms = "CFG-MOD-007-0040"
        };


    protected override PurchaseOrderPage Page =>
        ThisPage;


    public PurchaseOrdersMbRepository(
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