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

    IsActive: boolean;

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

    IsActive: boolean;

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

    IsActive: boolean;

}
