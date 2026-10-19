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
    // Basic Information
    //===========================================================

    // MSC-002-001-00001 (central CodeGenerator), assigned on create
    public string ServiceCode
    {
        get;
        set;
    } = string.Empty;


    // A Membership Services sub category (locked after saving)
    public long ServiceSubCategoryId
    {
        get;
        set;
    }


    // Silver Card / Gold Card / Platinum Card / Titanium Card
    // (later loaded from the Membership module)
    public string MembershipType
    {
        get;
        set;
    } = string.Empty;


    // Typed, e.g. "Free Wash"
    public string ServiceName
    {
        get;
        set;
    } = string.Empty;


    // "<Service Name> - <Membership Type>", unique among live rows
    public string DisplayName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Sub Category (display)
    //===========================================================

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


    //===========================================================
    // Service Value (complimentary : booked as an expense)
    //===========================================================

    // Value of the free service, > 0
    public decimal ServiceValue
    {
        get;
        set;
    }


    //===========================================================
    // Income Ledger (billed on the invoice; under the sub category's income sub group)
    //===========================================================

    // GLR-005-005-001-nnnnn, created on create
    public string IncomeLedgerCode
    {
        get;
        set;
    } = string.Empty;


    // Always equal to the Display Name
    public string IncomeLedgerName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Expense Ledger (the same amount discounted; under SUB-004-002-001)
    //===========================================================

    // GLR-004-002-001-nnnnn, created on create
    public string ExpenseLedgerCode
    {
        get;
        set;
    } = string.Empty;


    // Always equal to the Display Name
    public string ExpenseLedgerName
    {
        get;
        set;
    } = string.Empty;


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