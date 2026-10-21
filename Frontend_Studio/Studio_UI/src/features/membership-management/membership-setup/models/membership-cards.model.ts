/* ============================================================
   Membership Card

   Saving a card creates its accounts and its complimentary
   service, each ledger named "<Sub Group Name> - <Card Name>" :
     Fee Ledger       SUB-009-001-001 (Membership Fees)
     Discount Ledger  SUB-004-002-002 (Membership Discount)
     Membership Services row (Service Settings, Pending until
     its Service Value is set) with
       Income Ledger  SUB-007-005-001
       Expense Ledger SUB-004-002-001 (Membership Service Charges)
============================================================ */

export interface MembershipCard
{
    MembershipCardId:
        number;

    // MCD-001
    CardCode:
        string;

    // UPPERCASE, unique
    CardName:
        string;

    // 1 = lowest card; unique
    CardRank:
        number;

    // Fee Ledger
    FeeSubGroupCode?:
        string;

    FeeSubGroupName?:
        string;

    FeeLedgerCode:
        string;

    FeeLedgerName:
        string;

    // Discount Ledger
    DiscountSubGroupCode?:
        string;

    DiscountSubGroupName?:
        string;

    DiscountLedgerCode:
        string;

    DiscountLedgerName:
        string;

    // Complimentary Service (its Membership Services row)
    MembershipServiceId?:
        number | null;

    ServiceCode:
        string;

    ServiceName:
        string;

    ServiceValue:
        number;

    // Pending (no Service Value yet) / Ready
    Readiness:
        string;

    ServiceIncomeSubGroupCode?:
        string;

    ServiceIncomeLedgerCode:
        string;

    ServiceIncomeLedgerName:
        string;

    ServiceExpenseSubGroupCode?:
        string;

    ServiceExpenseLedgerCode:
        string;

    ServiceExpenseLedgerName:
        string;

    Remarks:
        string;

    IsActive:
        boolean;
}


/* ============================================================
   Create / Update Membership Card
   (codes and ledgers are always built by the server)
============================================================ */

export interface CreateMembershipCard
{
    CardName:
        string;

    CardRank:
        number;

    Remarks:
        string;

    IsActive:
        boolean;
}


export interface UpdateMembershipCard
extends CreateMembershipCard
{
    MembershipCardId:
        number;
}


/* ============================================================
   One account sub group a card creates a ledger under
============================================================ */

export interface MembershipCardAccountOption
{
    SubGroupCode:
        string;

    SubGroupName:
        string;

    NextLedgerCode:
        string;

    // Why a card cannot be saved yet ('' when fine)
    Message:
        string;
}


/* ============================================================
   Membership Cards Defaults (preview of the next card)
============================================================ */

export interface MembershipCardsDefaults
{
    NextCardCode:
        string;

    NextCardRank:
        number;

    FeeAccount:
        MembershipCardAccountOption;

    DiscountAccount:
        MembershipCardAccountOption;

    ServiceIncomeAccount:
        MembershipCardAccountOption;

    ServiceExpenseAccount:
        MembershipCardAccountOption;

    ServiceSubCategoryCode:
        string;

    ServiceSubCategoryName:
        string;

    NextServiceCode:
        string;

    ServiceMessage:
        string;
}