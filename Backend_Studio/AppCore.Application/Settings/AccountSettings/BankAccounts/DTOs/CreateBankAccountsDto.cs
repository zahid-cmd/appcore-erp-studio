// PAGE-CLONED : Cash Accounts -> Bank Accounts
// PAGE-CLONED : Wings -> Bank Accounts
//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.BankAccounts.DTOs;


//===============================================================
// Create BankAccount DTO
//===============================================================

public class CreateBankAccountDto
{
    //===============================================================
    // Account Sub Groups Id
    //===============================================================

    public long AccountSubGroupsId { get; set; }

    //===============================================================
    // Bank Account Code
    //===============================================================

    public string BankAccountCode { get; set; } = string.Empty;

    //===============================================================
    // Bank Account Name
    //===============================================================

    public string BankAccountName { get; set; } = string.Empty;

    //===============================================================
    // Remarks
    //===============================================================

    public string Remarks { get; set; } = string.Empty;

    //===============================================================
    // Is Active
    //===============================================================

    public bool IsActive { get; set; }
}