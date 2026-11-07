//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Procurement.Shared;


//===============================================================
// One Purchases page : what makes MB / SP / AC different.
// Switches are always read BY CODE; a null code = the switch is
// not on this page (its fallback is used).
//===============================================================

public sealed class PurchasePage
{
    // MB / SP / AC
    public string PageType { get; init; } = string.Empty;

    // Number prefix and voucher type (PIMB / PISP / PIAC)
    public string Prefix { get; init; } = string.Empty;

    // "Purchase - SP"
    public string Title { get; init; } = string.Empty;

    // Header table (row lock FOR UPDATE)
    public string TableName { get; init; } = string.Empty;

    // Purchase Order header table of the same page type
    public string OrderTableName { get; init; } = string.Empty;

    // Supplier Supply Types the page takes
    public string[] SupplyTypes { get; init; } = Array.Empty<string>();

    // MRP / Profit % / DP pricing, free qty, additional discount,
    // rounding (SP / AC). false (MB) : unit price only.
    public bool MrpPricing { get; init; }


    //===========================================================
    // Switch codes (CFG-MOD-007-nnnn)
    //===========================================================

    // Purchase Order pages' switches read here
    public string? SwitchPoRequired { get; init; }

    public string? SwitchCarryBalance { get; init; }

    public string? SwitchFreeGoods { get; init; }

    public string? SwitchRoundPayable { get; init; }

    public string? SwitchWholeTakaLines { get; init; }

    public string? SwitchEditSupplierTerms { get; init; }

    // Purchases page switches
    public string? SwitchBackDated { get; init; }

    public string? SwitchPostDated { get; init; }

    public string? SwitchMaxLines { get; init; }

    public string? SwitchMushakRequired { get; init; }

    public string? SwitchReceivedOnPurchase { get; init; }

    public string? SwitchPostOnApproval { get; init; }

    public string? SwitchPrintOnApproval { get; init; }

    // MB only
    public string? SwitchUnitsRequired { get; init; }

    public string? SwitchUniqueKeyNo { get; init; }

    public string? SwitchUniqueBatteryNo { get; init; }

    // 6.3 entry switches
    public string? SwitchInvoiceNoRequired { get; init; }

    public string? SwitchDoRequired { get; init; }

    public string? SwitchGatePassRequired { get; init; }

    public string? SwitchPriceAbovePo { get; init; }

    public string? SwitchVatAsPer63 { get; init; }

    // ON = a line may take stock above the item's Max Stock Level
    // (a warning is shown); OFF / missing = Max is a hard cap
    public string? SwitchAboveMaxStock { get; init; }
}
