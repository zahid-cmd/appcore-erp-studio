//===============================================================
// POS Account
//
// POSAccountName is system generated (UPPERCASE):
// POS - <Issuing Bank Short Name> - <Terminal Number>
//     - <Short Bank Name of Linked Bank Account>
//===============================================================

export interface POSAccount
{
    POSAccountId: number;

    AccountSubGroupsId: number;

    POSAccountCode: string;

    POSAccountName: string;

    IssuingBank: string;

    TerminalNumber: string;

    LinkedBankAccount: string;

    Branch: string;

    CollectionAccount: boolean;

    PaymentAccount: boolean;

    BranchExclusive: boolean;

    Remarks: string;

    Status: boolean;
}


//===============================================================
// Create POS Account
//===============================================================

export interface CreatePOSAccount
{
    AccountSubGroupsId: number;

    POSAccountCode: string;

    POSAccountName: string;

    IssuingBank: string;

    TerminalNumber: string;

    LinkedBankAccount: string;

    Branch: string;

    CollectionAccount: boolean;

    PaymentAccount: boolean;

    BranchExclusive: boolean;

    Remarks: string;

    Status: boolean;
}


//===============================================================
// Update POS Account
//===============================================================

export interface UpdatePOSAccount
extends CreatePOSAccount
{
    POSAccountId: number;
}