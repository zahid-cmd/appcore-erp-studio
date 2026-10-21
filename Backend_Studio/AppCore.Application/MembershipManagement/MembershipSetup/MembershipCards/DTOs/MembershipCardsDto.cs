//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.MembershipManagement.MembershipSetup;


//===============================================================
// Membership Cards DTO
//===============================================================

public class MembershipCardsDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long MembershipCardId
    {
        get;
        set;
    }


    //===========================================================
    // Card Information
    //===========================================================

    // MCD-001
    public string CardCode
    {
        get;
        set;
    } = string.Empty;


    public string CardName
    {
        get;
        set;
    } = string.Empty;


    // 1 = lowest card
    public int CardRank
    {
        get;
        set;
    }


    //===========================================================
    // Fee Ledger (SUB-009-001-001)
    //===========================================================

    public string FeeSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string FeeSubGroupName
    {
        get;
        set;
    } = string.Empty;


    public string FeeLedgerCode
    {
        get;
        set;
    } = string.Empty;


    public string FeeLedgerName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Discount Ledger (SUB-004-002-002)
    //===========================================================

    public string DiscountSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string DiscountSubGroupName
    {
        get;
        set;
    } = string.Empty;


    public string DiscountLedgerCode
    {
        get;
        set;
    } = string.Empty;


    public string DiscountLedgerName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Complimentary Service (its Membership Services row)
    //===========================================================

    public long? MembershipServiceId
    {
        get;
        set;
    }


    public string ServiceCode
    {
        get;
        set;
    } = string.Empty;


    public string ServiceName
    {
        get;
        set;
    } = string.Empty;


    public decimal ServiceValue
    {
        get;
        set;
    }


    // Pending (no Service Value yet) / Ready
    public string Readiness
    {
        get;
        set;
    } = string.Empty;


    public string ServiceIncomeSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string ServiceIncomeLedgerCode
    {
        get;
        set;
    } = string.Empty;


    public string ServiceIncomeLedgerName
    {
        get;
        set;
    } = string.Empty;


    public string ServiceExpenseSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string ServiceExpenseLedgerCode
    {
        get;
        set;
    } = string.Empty;


    public string ServiceExpenseLedgerName
    {
        get;
        set;
    } = string.Empty;


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

    public bool IsActive
    {
        get;
        set;
    }


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted
    {
        get;
        set;
    }


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