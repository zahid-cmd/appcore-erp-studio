// PAGE-CLONED : Bank Accounts -> MFS Accounts
//===============================================================
// MFS Accounts
//===============================================================

export interface MFSAccount
{
    MFSAccountId: number;

    AccountSubGroupsId: number;

    MFSAccountCode: string;

    MFSAccountName: string;

    Remarks: string;

    Status: boolean;

    Branch: string;

    DisplayName: string;

    CollectionAccount: boolean;

    PaymentAccount: boolean;

    LinkedBankAccount: string;

    MFSAccountNumber: string;

    AccountType: string;

    BranchExclusive: boolean;

    MFSCharges: number;

}


//===============================================================
// Create MFS Accounts
//===============================================================

export interface CreateMFSAccount
{
    AccountSubGroupsId: number;

    MFSAccountCode: string;

    MFSAccountName: string;

    Remarks: string;

    Status: boolean;

    Branch: string;

    DisplayName: string;

    CollectionAccount: boolean;

    PaymentAccount: boolean;

    LinkedBankAccount: string;

    MFSAccountNumber: string;

    AccountType: string;

    BranchExclusive: boolean;

    MFSCharges: number;

}


//===============================================================
// Update MFS Accounts
//===============================================================

export interface UpdateMFSAccount
{
    MFSAccountId: number;

    AccountSubGroupsId: number;

    MFSAccountCode: string;

    MFSAccountName: string;

    Remarks: string;

    Status: boolean;

    Branch: string;

    DisplayName: string;

    CollectionAccount: boolean;

    PaymentAccount: boolean;

    LinkedBankAccount: string;

    MFSAccountNumber: string;

    AccountType: string;

    BranchExclusive: boolean;

    MFSCharges: number;

}
