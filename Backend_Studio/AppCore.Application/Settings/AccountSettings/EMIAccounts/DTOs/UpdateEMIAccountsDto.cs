//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// Update EMI Accounts DTO
//
// Sub group and code are locked after creation; the name is
// rebuilt by the server.
//===============================================================

public class UpdateEmiAccountsDto
{
    public long EmiAccountId { get; set; }

    // SSLCommerz / ShurjoPay / POS / QR / Online
    public string Platform { get; set; } = string.Empty;

    // Bank Accounts → Display Name
    public string LinkedBankAccount { get; set; } = string.Empty;

    public string Branch { get; set; } = string.Empty;

    public bool BranchExclusive { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; } = true;
}