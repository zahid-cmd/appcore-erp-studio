//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.AccountSettings;


//===============================================================
// EMI Accounts
//
// One EMI collection channel : a platform (SSLCommerz /
// ShurjoPay / POS / QR / Online) settled into a bank account
// (Bank Accounts). The card is chosen per sale, not here.
//
// Lives under the reserved sub group SUB-002-002-005 (Cash With
// EMI); the code is EMI-002-002-005-nnnnn.
//
// EmiAccountName is system generated (UPPERCASE) :
// EMI - <Platform> - <Linked Bank Short Name>
//
// Tenure, interest % / amount and the total charged on the
// platform are entered per sale (Payment Desk), not stored here.
//===============================================================

public class EmiAccounts
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long EmiAccountId
    {
        get;
        set;
    }


    //===========================================================
    // Account Sub Group (always SUB-002-002-005)
    //===========================================================

    public long AccountSubGroupsId
    {
        get;
        set;
    }


    //===========================================================
    // EMI Account Code : EMI-002-002-005-00001
    //===========================================================

    public string EmiAccountCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // EMI Account Name (auto generated)
    //===========================================================

    public string EmiAccountName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Platform : SSLCommerz / ShurjoPay / POS / QR / Online
    //===========================================================

    public string Platform
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Linked Bank Account (Bank Accounts → Display Name)
    // The settlement account the bank pays into.
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
    // Configuration
    //
    // Collection Account : always Yes
    // Payment Account    : always No
    //===========================================================

    public bool CollectionAccount
    {
        get;
        set;
    } = true;


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
    } = true;


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted
    {
        get;
        set;
    } = false;


    public long? DeletedBy
    {
        get;
        set;
    }


    public DateTime? DeletedDate
    {
        get;
        set;
    }


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy
    {
        get;
        set;
    }


    public DateTime CreatedDate
    {
        get;
        set;
    }


    public long? ModifiedBy
    {
        get;
        set;
    }


    public DateTime? ModifiedDate
    {
        get;
        set;
    }
}