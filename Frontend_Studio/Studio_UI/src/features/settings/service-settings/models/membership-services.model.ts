/* ============================================================
   Membership Service (configure-only)

   One complimentary service per membership card. Rows are
   created, renamed, deleted and restored by Membership Cards;
   this page only sets the Service Value, status and remarks.
   Billed on the invoice at the Service Value, then discounted :
   income ledger + expense ledger, each
   "<Sub Group Name> - <Card Name>".
============================================================ */

export interface MembershipService
{
    MembershipServiceId:
        number;

    // MSC-002-001-00001
    ServiceCode:
        string;

    // Sub Category (display)
    ServiceSubCategoryId:
        number;

    SubCategoryCode?:
        string;

    SubCategoryName?:
        string;

    // The card that created the row
    MembershipCardId:
        number | null;

    CardCode?:
        string;

    CardRank?:
        number;

    // The card name
    MembershipType:
        string;

    // The sub category name
    ServiceName:
        string;

    // "<Service Name> - <Card Name>"
    DisplayName:
        string;

    // Value of the free service; 0 = Pending
    ServiceValue:
        number;

    // Pending (no Service Value yet) / Ready
    Readiness:
        string;

    // Income Ledger (billed on the invoice at the Service Value)
    IncomeSubGroupCode?:
        string;

    IncomeLedgerCode:
        string;

    IncomeLedgerName:
        string;

    // Expense Ledger (SUB-004-002-001 : the discount)
    ExpenseSubGroupCode?:
        string;

    ExpenseLedgerCode:
        string;

    ExpenseLedgerName:
        string;

    Remarks:
        string;

    IsActive:
        boolean;
}


/* ============================================================
   Configure (Update) Membership Service
============================================================ */

export interface UpdateMembershipService
{
    MembershipServiceId:
        number;

    // > 0
    ServiceValue:
        number;

    Remarks:
        string;

    IsActive:
        boolean;
}


/* ============================================================
   Filter options
============================================================ */

export interface MembershipServiceCardOption
{
    MembershipCardId:
        number;

    CardCode:
        string;

    CardName:
        string;

    CardRank:
        number;

    IsActive:
        boolean;
}


export interface MembershipServiceSubCategoryOption
{
    ServiceSubCategoryId:
        number;

    SubCategoryCode:
        string;

    SubCategoryName:
        string;
}


/* ============================================================
   Membership Services Defaults
============================================================ */

export interface MembershipServicesDefaults
{
    Cards:
        MembershipServiceCardOption[];

    SubCategories:
        MembershipServiceSubCategoryOption[];

    // SUB-004-002-001 (display)
    ExpenseSubGroupCode:
        string;

    ExpenseSubGroupName:
        string;
}