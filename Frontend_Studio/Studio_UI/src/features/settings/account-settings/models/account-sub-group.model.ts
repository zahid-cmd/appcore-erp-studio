//===========================================================
// Account Sub Group
//===========================================================

export interface AccountSubGroup
{
    AccountSubGroupId:
        number;


    AccountClassId:
        number;


    AccountClassName:
        string;


    AccountGroupId:
        number;


    AccountGroupName:
        string;


    ClassCode:
        string;


    Mode:
        string;


    GroupCode:
        string;


    SubGroupCode:
        string;


    SubGroupName:
        string;


    //===========================================================
    // Configuration
    //===========================================================

    AllowManualLedger:
        boolean;


    Remarks:
        string;


    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}



//===========================================================
// Create Account Sub Group
//===========================================================

export interface CreateAccountSubGroup
{
    AccountClassId:
        number;


    AccountGroupId:
        number;


    ClassCode:
        string;


    Mode:
        string;


    GroupCode:
        string;


    SubGroupCode:
        string;


    SubGroupName:
        string;


    //===========================================================
    // Configuration
    //===========================================================

    AllowManualLedger:
        boolean;


    Remarks:
        string;


    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}



//===========================================================
// Update Account Sub Group
//===========================================================

export interface UpdateAccountSubGroup
{
    AccountSubGroupId:
        number;


    AccountClassId:
        number;


    AccountGroupId:
        number;


    ClassCode:
        string;


    Mode:
        string;


    GroupCode:
        string;


    SubGroupCode:
        string;


    SubGroupName:
        string;


    //===========================================================
    // Configuration
    //===========================================================

    AllowManualLedger:
        boolean;


    Remarks:
        string;


    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}



//===========================================================
// Account Sub Group Defaults
//===========================================================

export interface AccountSubGroupDefaults
{
    Code:
        string;
}