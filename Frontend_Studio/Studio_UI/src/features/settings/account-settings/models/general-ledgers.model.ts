//===========================================================
// General Ledger
//===========================================================

export interface GeneralLedger
{
    GeneralLedgerId:
        number;


    AccountClassId:
        number;


    AccountClassName:
        string;


    AccountGroupId:
        number;


    AccountGroupName:
        string;


    AccountSubGroupId:
        number;


    AccountSubGroupName:
        string;


    ClassCode:
        string;


    Mode:
        string;


    GroupCode:
        string;


    SubGroupCode:
        string;


    LedgerCode:
        string;


    LedgerName:
        string;


    //===========================================================
    // Configuration
    //===========================================================

    // TODO: Add General Ledger specific configuration fields here
    // (e.g. NormalBalance, IsControlAccount, OpeningBalance)


    Remarks:
        string;


    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}



//===========================================================
// Create General Ledger
//===========================================================

export interface CreateGeneralLedger
{
    AccountClassId:
        number;


    AccountGroupId:
        number;


    AccountSubGroupId:
        number;


    ClassCode:
        string;


    Mode:
        string;


    GroupCode:
        string;


    SubGroupCode:
        string;


    LedgerCode:
        string;


    LedgerName:
        string;


    //===========================================================
    // Configuration
    //===========================================================

    // TODO: Add General Ledger specific configuration fields here


    Remarks:
        string;


    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}



//===========================================================
// Update General Ledger
//===========================================================

export interface UpdateGeneralLedger
{
    GeneralLedgerId:
        number;


    AccountClassId:
        number;


    AccountGroupId:
        number;


    AccountSubGroupId:
        number;


    ClassCode:
        string;


    Mode:
        string;


    GroupCode:
        string;


    SubGroupCode:
        string;


    LedgerCode:
        string;


    LedgerName:
        string;


    //===========================================================
    // Configuration
    //===========================================================

    // TODO: Add General Ledger specific configuration fields here


    Remarks:
        string;


    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}



//===========================================================
// General Ledger Defaults
//===========================================================

export interface GeneralLedgerDefaults
{
    Code:
        string;
}