// PAGE-CLONED : Cash Accounts -> Bank Accounts
//===============================================================
// Bank Accounts
//===============================================================

export interface BankAccount
{
    BankAccountId: number;

    AccountSubGroupsId: number;

    BankAccountCode: string;

    BankAccountName: string;

    Remarks: string;

    Status: boolean;

    Branch: string;

    DisplayName: string;

    CollectionAccount: boolean;

    PaymentAccount: boolean;

    Bank: string;

}


//===============================================================
// Create Bank Accounts
//===============================================================

export interface CreateBankAccount
{
    AccountSubGroupsId: number;

    BankAccountCode: string;

    BankAccountName: string;

    Remarks: string;

    Status: boolean;

    Branch: string;

    DisplayName: string;

    CollectionAccount: boolean;

    PaymentAccount: boolean;

    Bank: string;

}


//===============================================================
// Update Bank Accounts
//===============================================================

export interface UpdateBankAccount
{
    BankAccountId: number;

    AccountSubGroupsId: number;

    BankAccountCode: string;

    BankAccountName: string;

    Remarks: string;

    Status: boolean;

    Branch: string;

    DisplayName: string;

    CollectionAccount: boolean;

    PaymentAccount: boolean;

    Bank: string;

}
