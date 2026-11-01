//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Procurement.Shared;


//===============================================================
// One Purchase Order page : what makes MB / SP / AC different.
// Switches are always read BY CODE; a null code = the switch is
// not on this page (its fallback is used).
//===============================================================

public sealed class PurchaseOrderPage
{
    // MB / SP / AC
    public string PageType { get; init; } = string.Empty;

    // Number prefix (POMB / POSP / POAC)
    public string Prefix { get; init; } = string.Empty;

    // "Purchase Order - SP"
    public string Title { get; init; } = string.Empty;

    // Header table (row lock FOR UPDATE)
    public string TableName { get; init; } = string.Empty;

    // Supplier Supply Types the page takes
    public string[] SupplyTypes { get; init; } = Array.Empty<string>();

    // MRP / Profit % / DP pricing, free qty, additional discount,
    // rounding (SP / AC). false (MB) : unit price only.
    public bool MrpPricing { get; init; }


    //===========================================================
    // Switch codes (CFG-MOD-007-nnnn)
    //===========================================================

    // Read by the Purchases page (purchase entry must pick a PO)
    public string? SwitchPoRequired { get; init; }

    // Read by the Purchases page (balance carried or closed short)
    public string? SwitchCarryBalance { get; init; }

    // Value = most days back / ahead (empty = any day)
    public string? SwitchBackDated { get; init; }

    public string? SwitchPostDated { get; init; }

    // Value = most lines on one PO (OFF = no limit)
    public string? SwitchMaxLines { get; init; }

    // ON = Expected Delivery must be entered
    public string? SwitchExpectedRequired { get; init; }

    // Read by the page / print : ON = an Approved PO prints
    public string? SwitchPrintOnApproval { get; init; }

    // ON = Approve also places the order
    public string? SwitchPlaceOnApproval { get; init; }

    // Free Qty on the lines (OFF / missing = refused)
    public string? SwitchFreeGoods { get; init; }

    // Payable in whole taka (Value Nearest / Up / Down)
    public string? SwitchRoundPayable { get; init; }

    // Line payables in whole taka (needs Round Payable ON)
    public string? SwitchWholeTakaLines { get; init; }

    // OFF = a supplier's terms (Supplier Profile) are fixed on the
    // order (missing = ON : editable)
    public string? SwitchEditSupplierTerms { get; init; }
}