/* ============================================================
   EMI Accounts
   (Settings › Account Settings › EMI Accounts)

   One EMI collection channel : a platform (SSLCommerz /
   ShurjoPay / POS / QR / Online) settled into a bank account.
   The card is chosen per sale, not here.
   Sub group SUB-002-002-005 (Cash With EMI), code
   EMI-002-002-005-nnnnn, name (auto, UPPERCASE)
   EMI - <Platform> - <Linked Bank Short>.
============================================================ */

export type EmiPlatform =
    'SSLCommerz' | 'ShurjoPay' | 'POS' | 'QR' | 'Online';

export interface EmiAccounts
{
    EmiAccountId:
        number;

    // Account Sub Group (always SUB-002-002-005)
    AccountSubGroupsId:
        number;

    SubGroupCode:
        string;

    SubGroupName:
        string;

    // Auto
    EmiAccountCode:
        string;

    EmiAccountName:
        string;

    // SSLCommerz / ShurjoPay / POS / QR / Online
    Platform:
        string;

    // Bank Accounts → Display Name (settlement account)
    LinkedBankAccount:
        string;

    Branch:
        string;

    // Always Yes / No
    CollectionAccount:
        boolean;

    PaymentAccount:
        boolean;

    BranchExclusive:
        boolean;

    Remarks:
        string;

    Status:
        boolean;
}



/* ============================================================
   Create EMI Accounts
   (sub group, code, name and the two fixed flags are set by
   the server)
============================================================ */

export interface CreateEmiAccounts
{
    Platform:
        string;

    LinkedBankAccount:
        string;

    Branch:
        string;

    BranchExclusive:
        boolean;

    Remarks:
        string;

    Status:
        boolean;
}



/* ============================================================
   Update EMI Accounts
============================================================ */

export interface UpdateEmiAccounts
    extends CreateEmiAccounts
{
    EmiAccountId:
        number;
}



/* ============================================================
   EMI Accounts Defaults (Add form)
   Message is set when SUB-002-002-005 is missing.
============================================================ */

export interface EmiAccountsDefaults
{
    AccountSubGroupsId:
        number;

    SubGroupCode:
        string;

    SubGroupName:
        string;

    Code:
        string;

    Message:
        string;
}