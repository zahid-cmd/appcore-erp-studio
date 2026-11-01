//===============================================================
// Posting Setup Models
//
// Settings › Account Settings › Posting Setup : the ledger of
// each posting purpose (VAT per product type, Inter-Branch,
// Opening Stock ...). Purposes are fixed; only the ledger
// changes, with a reason.
//===============================================================

export type PostingSetupStatus =
    'Ready'
    | 'NotSet'
    | 'NotFound'
    | 'Inactive'
    | 'OutsideGroup';


export interface PostingSetupRow
{
    purposeCode: string;

    purposeName: string;

    groupName: string;

    description: string;

    usedBy: string;

    allowedSubGroupCodes: string[];

    isRequired: boolean;

    displayOrder: number;

    ledgerCode: string;

    ledgerName: string;

    subGroupCode: string;

    subGroupName: string;

    balance: number;

    status: PostingSetupStatus;

    statusText: string;

    modifiedDate: string | null;
}


export interface PostingSetupLedgerOption
{
    ledgerCode: string;

    ledgerName: string;

    subGroupCode: string;

    subGroupName: string;
}


export interface PostingSetupWorkspace
{
    canChange: boolean;

    rows: PostingSetupRow[];

    ledgers: PostingSetupLedgerOption[];

    switches: PostingSwitch[];
}


// A posting switch, read-only here (System Configurations)
export interface PostingSwitch
{
    configurationCode: string;

    page: string;

    name: string;

    found: boolean;

    isEnabled: boolean;

    value: string;
}


export interface UpdatePostingSetup
{
    ledgerCode: string;

    reason: string;
}


export interface PostingSetupHistory
{
    purposeCode: string;

    purposeName: string;

    oldLedgerCode: string;

    oldLedgerName: string;

    newLedgerCode: string;

    newLedgerName: string;

    reason: string;

    changedByName: string;

    changedDate: string;
}
