// PAGE-CLONED : Wings -> Bank Setup
//===============================================================
// Bank
//===============================================================

export interface BankSetup
{
    BankSetupId: number;

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
