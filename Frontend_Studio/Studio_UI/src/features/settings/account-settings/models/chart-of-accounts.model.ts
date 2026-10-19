//===============================================================
// Chart of Accounts (read-only)
//
// Tree    : Account Class → Account Group → Account Sub Group
// Ledgers : loaded per Sub Group (GL / Cash / Bank / MFS / POS …)
//
// The page owns no data: every load reads the live account
// setting tables, so changes made on those pages show up here.
// Counts come from the server. ActiveLedgerCount lets the page
// show "active only" totals without loading every ledger.
//===============================================================

export type CoaLevel =
    | 'class'
    | 'group'
    | 'subgroup';

// Sent by the server (GL / Cash / Bank / MFS / POS today).
// Kept as a plain string so a new ledger type shows up as-is,
// without a frontend change.
export type CoaLedgerType =
    string;


//===============================================================
// Sub Group Node
//===============================================================

export interface CoaSubGroupNode
{
    Id: number;

    Code: string;

    Name: string;

    Status: boolean;

    LedgerCount: number;

    ActiveLedgerCount: number;
}


//===============================================================
// Group Node
//===============================================================

export interface CoaGroupNode
{
    Id: number;

    Code: string;

    Name: string;

    Status: boolean;

    SubGroups: CoaSubGroupNode[];
}


//===============================================================
// Class Node
//===============================================================

export interface CoaClassNode
{
    Id: number;

    Code: string;

    Name: string;

    // Account / Inventory / Work In Progress / Cost of Goods Sold
    ClassType: string;

    Status: boolean;

    Groups: CoaGroupNode[];
}


//===============================================================
// Ledger Row (leaf)
//===============================================================

export interface CoaLedgerRow
{
    Id: number;

    SubGroupId: number;

    Code: string;

    Name: string;

    Type: CoaLedgerType;

    Branch: string;

    Status: boolean;
}


//===============================================================
// Link Issue (from the server's link check)
//===============================================================

export interface CoaIssue
{
    // Group / Sub Group / Ledger (Cash) …
    Level: string;

    Id: number;

    Code: string;

    Name: string;

    Problem: string;
}


//===============================================================
// Print Options
//===============================================================

export type CoaPrintScope =
    | 'all'
    | 'selection';

export type CoaPrintDepth =
    | 'class'
    | 'group'
    | 'subgroup'
    | 'ledger';

export interface CoaPrintOptions
{
    scope: CoaPrintScope;

    depth: CoaPrintDepth;

    includeInactive: boolean;

    showType: boolean;

    showBranch: boolean;

    showStatus: boolean;

    landscape: boolean;
}