//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ServiceSettings;


//===============================================================
// Membership Services
//
// The complimentary (free) service of one membership card. Rows
// are CREATED BY MEMBERSHIP CARDS (one per card) and are renamed,
// (de)activated, deleted and restored with the card; this page
// only configures the Service Value, status and remarks.
//
// Billed on the invoice at its Service Value, then discounted, so
// it owns two General Ledgers, each "<Sub Group Name> - <Card Name>" :
//   Income Ledger  under the sub category's income sub group
//                  (SUB-007-005-001)
//   Expense Ledger under SUB-004-002-001 (Membership Service Charges)
//===============================================================

public class MembershipServices
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


    // The membership card that created this row (Membership Cards)
    public long? MembershipCardId
    {
        get;
        set;
    }


    // The card name (follows card renames)
    public string MembershipType
    {
        get;
        set;
    } = string.Empty;


    // The sub category name (follows renames)
    public string ServiceName
    {
        get;
        set;
    } = string.Empty;


    // "<Service Name> - <Card Name>", unique among live rows
    public string DisplayName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Service Value (complimentary : booked as an expense)
    //===========================================================

    // Value of the free service; 0 = Pending (not invoiceable)
    public decimal ServiceValue
    {
        get;
        set;
    }


    //===========================================================
    // Income Ledger (billed on the invoice; under the sub category's income sub group)
    //===========================================================

    // GLR-007-005-001-nnnnn, created with the card
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
    // Expense Ledger (the same amount discounted; under SUB-004-002-001)
    //===========================================================

    // GLR-004-002-001-nnnnn, created with the card
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