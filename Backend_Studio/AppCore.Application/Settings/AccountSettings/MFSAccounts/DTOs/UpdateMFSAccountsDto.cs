//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.MFSAccounts.DTOs;


//===============================================================
// Update MFS Account DTO
//===============================================================

public class UpdateMFSAccountDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long MFSAccountId
    {
        get;
        set;
    }


    //===========================================================
    // Account Sub Group
    // (Locked after creation; must match the saved record)
    //===========================================================

    public long AccountSubGroupsId
    {
        get;
        set;
    }


    //===========================================================
    // MFS Account Code
    // (Locked after creation; any value sent is ignored)
    //===========================================================

    public string MFSAccountCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // MFS Account Name (Provider)
    //===========================================================

    public string MFSAccountName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // MFS Account Number
    //===========================================================

    public string MFSAccountNumber
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Account Type (Personal / Merchant)
    //===========================================================

    public string AccountType
    {
        get;
        set;
    } = "Personal";


    //===========================================================
    // MFS Charges (%)
    // Merchant : required (> 0 and <= 100)
    // Personal : forced to 0
    //===========================================================

    public decimal MFSCharges
    {
        get;
        set;
    }


    //===========================================================
    // Linked Bank Account
    // Merchant : required
    // Personal : forced to empty
    //===========================================================

    public string LinkedBankAccount
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Branch
    //===========================================================

    public string Branch
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Display Name
    // (Rebuilt by the server : MFS Account Name - MFS Account Number)
    //===========================================================

    public string DisplayName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

    public bool CollectionAccount
    {
        get;
        set;
    }


    public bool PaymentAccount
    {
        get;
        set;
    }


    public bool BranchExclusive
    {
        get;
        set;
    }


    //===========================================================
    // Remarks
    //===========================================================

    public string Remarks
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Status
    //===========================================================

    public bool Status
    {
        get;
        set;
    }
}