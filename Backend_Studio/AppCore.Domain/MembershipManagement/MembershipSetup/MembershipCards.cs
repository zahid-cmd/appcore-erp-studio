//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.MembershipManagement.MembershipSetup;


//===============================================================
// Membership Cards
//
// One membership card (e.g. SILVER CARD, GOLD CARD). Saving a card
// creates its accounts and its complimentary service :
//
//   On the card
//     Fee Ledger       under SUB-009-001-001 (Membership Fees)
//     Discount Ledger  under SUB-004-002-002 (Membership Discount)
//
//   On its Membership Services row (Service Settings)
//     Income Ledger    under SUB-007-005-001 (the Membership
//                      Services sub category's income sub group)
//     Expense Ledger   under SUB-004-002-001 (Membership Service
//                      Charges)
//
// Every ledger is named "<Sub Group Name> - <Card Name>" and is
// renamed, (de)activated, deleted and restored with the card.
//===============================================================

public class MembershipCards
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

    // MCD-001 (central CodeGenerator), assigned on create
    public string CardCode
    {
        get;
        set;
    } = string.Empty;


    // UPPERCASE, unique among live cards, e.g. GOLD CARD
    public string CardName
    {
        get;
        set;
    } = string.Empty;


    // 1 = lowest card; unique among live cards (upgrade order)
    public int CardRank
    {
        get;
        set;
    }


    //===========================================================
    // Fee Ledger (under SUB-009-001-001)
    //===========================================================

    // GLR-009-001-001-nnnnn, created on create
    public string FeeLedgerCode
    {
        get;
        set;
    } = string.Empty;


    // "<Sub Group Name> - <Card Name>"
    public string FeeLedgerName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Discount Ledger (under SUB-004-002-002)
    //===========================================================

    // GLR-004-002-002-nnnnn, created on create
    public string DiscountLedgerCode
    {
        get;
        set;
    } = string.Empty;


    // "<Sub Group Name> - <Card Name>"
    public string DiscountLedgerName
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