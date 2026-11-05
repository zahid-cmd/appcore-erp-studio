// PAGE-CLONED : Wings -> Bank Setup
//===============================================================
// Bank
//===============================================================

export interface BankSetup
{
    BankSetupId: number;
    // The id used in links and API calls (uuid v7)
    PublicId?: string;

    BankCode: string;

    BankName: string;

    Remarks: string;

    Status: boolean;

    ShortName: string;

}


//===============================================================
// Create Bank
//===============================================================

export interface CreateBankSetup
{
    BankCode: string;

    BankName: string;

    Remarks: string;

    Status: boolean;

    ShortName: string;

}


//===============================================================
// Update Bank
//===============================================================

export interface UpdateBankSetup
{
    BankSetupId: number;

    BankCode: string;

    BankName: string;

    Remarks: string;

    Status: boolean;

    ShortName: string;

}
