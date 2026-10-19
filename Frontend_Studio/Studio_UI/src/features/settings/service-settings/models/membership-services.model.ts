/* ============================================================
   Membership Types (fixed for now; later loaded from the
   Membership module). The server sends the same list.
============================================================ */

export const MEMBERSHIP_TYPES:
    readonly string[] =
[
    'Silver Card',
    'Gold Card',
    'Platinum Card',
    'Titanium Card'
];


/* ============================================================
   Membership Service
   (complimentary : billed on the invoice at the Service Value,
   then discounted - income ledger + expense ledger)
============================================================ */

export interface MembershipService
{
    MembershipServiceId:
        number;

    // MSC-002-001-00001
    ServiceCode:
        string;

    //===========================================================
    // Sub Category (locked after saving)
    //===========================================================

    ServiceSubCategoryId:
        number;

    SubCategoryCode?:
        string;

    SubCategoryName?:
        string;

    //===========================================================
    // Service
    //===========================================================

    // Silver Card / Gold Card / Platinum Card / Titanium Card
    MembershipType:
        string;

    // Typed, e.g. "Free Wash"
    ServiceName:
        string;

    // "Free Wash - Gold Card" (built; unique)
    DisplayName:
        string;

    // Value of the free service (expense)
    ServiceValue:
        number;

    //===========================================================
    // Income Ledger (billed on the invoice at the Service Value)
    //===========================================================

    IncomeLedgerCode:
        string;

    IncomeLedgerName:
        string;

    //===========================================================
    // Expense Ledger (under SUB-004-002-001 : the discount)
    //===========================================================

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
   Create / Update Membership Service
============================================================ */

export interface CreateMembershipService
{
    ServiceCode:
        string;

    ServiceSubCategoryId:
        number;

    MembershipType:
        string;

    ServiceName:
        string;

    DisplayName:
        string;

    ServiceValue:
        number;

    IncomeLedgerCode:
        string;

    IncomeLedgerName:
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


export interface UpdateMembershipService
extends CreateMembershipService
{
    MembershipServiceId:
        number;
}


/* ============================================================
   Membership Services sub category option (with the next codes)
============================================================ */

export interface MembershipServiceSubCategoryOption
{
    ServiceSubCategoryId:
        number;

    SubCategoryCode:
        string;

    SubCategoryName:
        string;

    CategoryName:
        string;

    IsActive:
        boolean;

    ItemCreationAllowed:
        boolean;

    NextServiceCode:
        string;

    NextIncomeLedgerCode:
        string;

    NextExpenseLedgerCode:
        string;

    // Why no service can be added under it ('' when it can)
    Message:
        string;
}


/* ============================================================
   Membership Services Defaults
============================================================ */

export interface MembershipServicesDefaults
{
    SubCategories:
        MembershipServiceSubCategoryOption[];

    MembershipTypes:
        string[];

    // SUB-004-002-001 (display)
    ExpenseSubGroupCode:
        string;

    ExpenseSubGroupName:
        string;

    // Set when that sub group is missing / deleted
    ExpenseSubGroupMessage:
        string;
}