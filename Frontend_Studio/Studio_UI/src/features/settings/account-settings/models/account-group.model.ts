/* ============================================================
   Account Group
============================================================ */

export interface AccountGroup
{
    AccountGroupId:
        number;
    // The id used in links and API calls (uuid v7)
    PublicId?: string;


    AccountClassId:
        number;


    AccountClassName:
        string;


    ClassCode:
        string;


    Mode:
        string;


    GroupCode:
        string;


    GroupName:
        string;


    AllowManualSubGroup:
        boolean;

    // Balance Sheet term (asset / liability groups) :
    // true = non-current, false = current
    IsNonCurrent?:
        boolean;

    // Cash flow statement : Operating / Investing / Financing
    CashFlowActivity?:
        string;

    // List only : Current / Non-current / blank (equity, income,
    // expense)
    TermText?:
        string;

    // Statement Type of its Account Class (read only)
    StatementType?:
        string;


    //===========================================================
    // Configuration
    //===========================================================

    Remarks:
        string;


    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}



/* ============================================================
   Create Account Group
============================================================ */

export interface CreateAccountGroup
{
    AccountClassId:
        number;


    ClassCode:
        string;


    Mode:
        string;


    GroupCode:
        string;


    GroupName:
        string;


    AllowManualSubGroup:
        boolean;

    // Balance Sheet term (asset / liability groups) :
    // true = non-current, false = current
    IsNonCurrent?:
        boolean;

    // Cash flow statement : Operating / Investing / Financing
    CashFlowActivity?:
        string;


    //===========================================================
    // Configuration
    //===========================================================

    Remarks:
        string;


    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}



/* ============================================================
   Update Account Group
============================================================ */

export interface UpdateAccountGroup
{
    AccountGroupId:
        number;


    AccountClassId:
        number;


    ClassCode:
        string;


    Mode:
        string;


    GroupCode:
        string;


    GroupName:
        string;


    AllowManualSubGroup:
        boolean;

    // Balance Sheet term (asset / liability groups) :
    // true = non-current, false = current
    IsNonCurrent?:
        boolean;

    // Cash flow statement : Operating / Investing / Financing
    CashFlowActivity?:
        string;


    //===========================================================
    // Configuration
    //===========================================================

    Remarks:
        string;


    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}



/* ============================================================
   Account Group Defaults
============================================================ */

export interface AccountGroupDefaults
{
    Code:
        string;
}