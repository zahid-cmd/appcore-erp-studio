//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Membership Services DTO
//===============================================================

public class MembershipServicesDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long MembershipServiceId
    {
        get;
        set;
    }


    //===========================================================
    // Basic Information (created by Membership Cards; read only)
    //===========================================================

    // MSC-002-001-00001 (central CodeGenerator)
    public string ServiceCode
    {
        get;
        set;
    } = string.Empty;


    public long ServiceSubCategoryId
    {
        get;
        set;
    }


    public string SubCategoryCode
    {
        get;
        set;
    } = string.Empty;


    public string SubCategoryName
    {
        get;
        set;
    } = string.Empty;


    // The card that created this row
    public long? MembershipCardId
    {
        get;
        set;
    }


    public string CardCode
    {
        get;
        set;
    } = string.Empty;


    public int CardRank
    {
        get;
        set;
    }


    // The card name
    public string MembershipType
    {
        get;
        set;
    } = string.Empty;


    // The sub category name
    public string ServiceName
    {
        get;
        set;
    } = string.Empty;


    // "<Service Name> - <Card Name>"
    public string DisplayName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Service Value (set on this page)
    //===========================================================

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


    //===========================================================
    // Income Ledger (billed on the invoice)
    //===========================================================

    public string IncomeSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string IncomeLedgerCode
    {
        get;
        set;
    } = string.Empty;


    // "<Sub Group Name> - <Card Name>"
    public string IncomeLedgerName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Expense Ledger (the same amount discounted; SUB-004-002-001)
    //===========================================================

    public string ExpenseSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string ExpenseLedgerCode
    {
        get;
        set;
    } = string.Empty;


    // "<Sub Group Name> - <Card Name>"
    public string ExpenseLedgerName
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