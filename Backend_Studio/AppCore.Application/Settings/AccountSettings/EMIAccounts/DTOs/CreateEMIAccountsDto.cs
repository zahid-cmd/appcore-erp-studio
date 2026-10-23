//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// Create EMI Accounts DTO
//
// Sub group, code, name, Collection Account (Yes) and Payment
// Account (No) are always set by the server.
//===============================================================

public class CreateEmiAccountsDto
{
    // SSLCommerz / ShurjoPay / POS / QR / Online
    public string Platform { get; set; } = string.Empty;

    // Bank Accounts → Display Name
    public string LinkedBankAccount { get; set; } = string.Empty;

    public string Branch { get; set; } = string.Empty;

    public bool BranchExclusive { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; } = true;
}