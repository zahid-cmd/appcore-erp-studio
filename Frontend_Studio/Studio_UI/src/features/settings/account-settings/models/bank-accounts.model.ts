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

    FullAccountNumber: string;

    ShortAccountName: string;

    ShortAccountNumber: string;

    ShortBranchName: string;

    SwiftCode: string;

    RoutingNumber: string;

    BranchExclusive: boolean;

    BankBranchName: string;

    // Optional; only for Liability For Finance (SUB-003-002-002)
    SanctionLimit: number | null;

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

    FullAccountNumber: string;

    ShortAccountName: string;

    ShortAccountNumber: string;

    ShortBranchName: string;

    SwiftCode: string;

    RoutingNumber: string;

    BranchExclusive: boolean;

    BankBranchName: string;

    // Optional; only for Liability For Finance (SUB-003-002-002)
    SanctionLimit: number | null;

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

    FullAccountNumber: string;

    ShortAccountName: string;

    ShortAccountNumber: string;

    ShortBranchName: string;

    SwiftCode: string;

    RoutingNumber: string;

    BranchExclusive: boolean;

    BankBranchName: string;

    // Optional; only for Liability For Finance (SUB-003-002-002)
    SanctionLimit: number | null;

}