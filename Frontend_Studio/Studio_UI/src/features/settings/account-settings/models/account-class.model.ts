/* ============================================================
   Account Class
============================================================ */

export interface AccountClass
{
    AccountClassId:
        number;
    // The id used in links and API calls (uuid v7)
    PublicId?: string;


    ClassType:
        string;


    ClassCode:
        string;


    ClassName:
        string;


    Mode:
        string;


    ClassPrefix:
        string;


    AllowManualGroupCreation:
        boolean;


    // What the class is for the financial statements : Asset /
    // Liability / Equity / Income / Other Income / Cost of Goods
    // Sold / Expense. The statements go by this, never by the name.
    StatementType?:
        string;


    // Business line of its ledgers : MB / SP / AC / SV ('' : none)
    BusinessLine?:
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
   Create Account Class
============================================================ */

export interface CreateAccountClass
{
    ClassType:
        string;


    ClassCode:
        string;


    ClassName:
        string;


    Mode:
        string;


    ClassPrefix:
        string;


    AllowManualGroupCreation:
        boolean;


    // What the class is for the financial statements : Asset /
    // Liability / Equity / Income / Other Income / Cost of Goods
    // Sold / Expense. The statements go by this, never by the name.
    StatementType?:
        string;


    // Business line of its ledgers : MB / SP / AC / SV ('' : none)
    BusinessLine?:
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
   Update Account Class
============================================================ */

export interface UpdateAccountClass
{
    AccountClassId:
        number;


    ClassType:
        string;


    ClassCode:
        string;


    ClassName:
        string;


    Mode:
        string;


    ClassPrefix:
        string;


    AllowManualGroupCreation:
        boolean;


    // What the class is for the financial statements : Asset /
    // Liability / Equity / Income / Other Income / Cost of Goods
    // Sold / Expense. The statements go by this, never by the name.
    StatementType?:
        string;


    // Business line of its ledgers : MB / SP / AC / SV ('' : none)
    BusinessLine?:
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
   Account Class Defaults
============================================================ */

export interface AccountClassDefaults
{
    // Last prefix used by Account Classes (empty on a fresh database)
    ClassPrefix:
        string;

    Code:
        string;
}