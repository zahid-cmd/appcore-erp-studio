//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.VatManagement.VatSetup;


//===============================================================
// Purchase VAT Defaults
//
// Next code (preview only), the VAT Types, the VAT Current Account
// ledgers to choose from, the ledger last used for each type
// (pre-selected on the form) and today (Asia/Dhaka).
//===============================================================

public class PurchaseVatDefaultsDto
{
    public string Code { get; set; } = string.Empty;

    public List<string> VatTypes { get; set; } = new();

    public List<PurchaseVatLedgerOptionDto> Ledgers { get; set; } = new();

    // VAT Type → ledger code of its latest rule
    public Dictionary<string, string> SuggestedLedgers { get; set; } = new();

    // yyyy-MM-dd
    public string Today { get; set; } = string.Empty;

    // yyyy-MM-dd : 30 June ending the current financial year
    public string DefaultValidTo { get; set; } = string.Empty;

    // Expiring warning starts this many days before Valid To
    public int ReminderDays { get; set; }
}


public class PurchaseVatLedgerOptionDto
{
    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}