//===============================================================
// Auto Accounts (read-only)
//
// Codes of the account groups / sub groups / ledgers created
// automatically by other pages, split by origin. Used by the
// Account Group, Account Sub Group and General Ledger list pages:
//
//   tab 1 'all'            : created manually on the form pages
//   tab 2 'auto-inventory' : created by Product Category / Sub
//                            Category / Motor Bikes / Spare Parts /
//                            Accessories
//   tab 3 'auto-financial' : created by any other page (Service
//                            Settings, Membership, …)
//
// Codes are upper case. Matching is by CODE only, never by name.
//===============================================================

export type AccountOrigin =
    | 'manual'
    | 'inventory'
    | 'financial';

export interface AutoAccountCodes
{
    InventoryGroupCodes: Set<string>;

    InventorySubGroupCodes: Set<string>;

    InventoryLedgerCodes: Set<string>;

    FinancialGroupCodes: Set<string>;

    FinancialSubGroupCodes: Set<string>;

    FinancialLedgerCodes: Set<string>;
}

// The tab each origin is shown on
export const ACCOUNT_ORIGIN_TAB:
    Record<AccountOrigin, string> =
{
    manual:'all',
    inventory:'auto-inventory',
    financial:'auto-financial'
};