import
{
    PagedResult
}
from '../../../../shared/paging/paged-result.model';

//===========================================================
// General Ledger
//===========================================================

export interface GeneralLedger
{
    GeneralLedgerId:
        number;
    // The id used in links and API calls (uuid v7)
    PublicId?: string;


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


//===============================================================
// List page query (server paging)
//
// origin : manual (All General Ledgers) / inventory (Auto
//          Inventory Ledgers) / financial (Auto Financial
//          Ledgers)
// status : active / inactive ('' = all)
//===============================================================

export interface GeneralLedgerPageQuery
{
    page:number;
    pageSize:number;
    search?:string;
    sort?:string;
    dir?:'asc' | 'desc';
    origin:'manual' | 'inventory' | 'financial';
    accountClassId?:number | null;
    accountGroupId?:number | null;
    accountSubGroupId?:number | null;
    status?:string;
}


//===============================================================
// List page answer : one page plus the filter choices
// (classes / groups / sub groups holding ledgers of the tab)
//===============================================================

export interface GeneralLedgerPage
{
    result:PagedResult<any>;
    classIds:number[];
    groupIds:number[];
    subGroupIds:number[];
}
