// PAGE-CLONED : Wings -> Cash Accounts
//===============================================================
// Cash Accounts
//===============================================================

export interface CashAccount
{
    CashAccountId: number;
    // The id used in links and API calls (uuid v7)
    PublicId?: string;

    AccountSubGroupsId: number;

    CashAccountCode: string;

    CashAccountName: string;

    Remarks: string;

    Status: boolean;

    Branch: string;

    DisplayName: string;

    CollectionAccount: boolean;

    PaymentAccount: boolean;

}


//===============================================================
// Create Cash Accounts
//===============================================================

export interface CreateCashAccount
{
    AccountSubGroupsId: number;

    CashAccountCode: string;

    CashAccountName: string;

    Remarks: string;

    Status: boolean;

    Branch: string;

    DisplayName: string;

    CollectionAccount: boolean;

    PaymentAccount: boolean;

}


//===============================================================
// Update Cash Accounts
//===============================================================

export interface UpdateCashAccount
{
    CashAccountId: number;

    AccountSubGroupsId: number;

    CashAccountCode: string;

    CashAccountName: string;

    Remarks: string;

    Status: boolean;

    Branch: string;

    DisplayName: string;

    CollectionAccount: boolean;

    PaymentAccount: boolean;

}
