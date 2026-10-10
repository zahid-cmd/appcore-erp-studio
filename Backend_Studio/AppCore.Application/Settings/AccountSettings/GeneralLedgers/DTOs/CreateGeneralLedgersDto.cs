//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.GeneralLedgers.DTOs;


//===============================================================
// Create General Ledgers DTO
//===============================================================

public class CreateGeneralLedgersDto
{
    //===========================================================
    // Account Class
    //===========================================================

    public long AccountClassId
    {
        get;
        set;
    }


    //===========================================================
    // Account Group
    //===========================================================

    public long AccountGroupId
    {
        get;
        set;
    }


    //===========================================================
    // Account Sub Group
    //===========================================================

    public long AccountSubGroupId
    {
        get;
        set;
    }


    //===========================================================
    // Basic Information
    //===========================================================

    public string ClassCode
    {
        get;
        set;
    } = string.Empty;


    public string Mode
    {
        get;
        set;
    } = string.Empty;


    public string GroupCode
    {
        get;
        set;
    } = string.Empty;


    public string SubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string LedgerCode
    {
        get;
        set;
    } = string.Empty;


    public string LedgerName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

    // TODO: Add General Ledger specific configuration fields here


    public string Remarks
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Status
    //===========================================================

    public bool IsActive
    {
        get;
        set;
    } = true;
}