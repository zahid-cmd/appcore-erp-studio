//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.AccountGroup.DTOs;


//===============================================================
// Create Account Group DTO
//===============================================================

public class CreateAccountGroupDto
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


    public string GroupName
    {
        get;
        set;
    } = string.Empty;


    public bool AllowManualSubGroup
    {
        get;
        set;
    }

    // Balance Sheet term of an asset / liability group :
    // true = non-current, false = current. Used by the Net
    // assets view; ignored for equity, income and expense.
    public bool IsNonCurrent
    {
        get;
        set;
    }

    // Cash flow statement : Operating / Investing / Financing
    public string CashFlowActivity
    {
        get;
        set;
    } = "Operating";


    //===========================================================
    // Configuration
    //===========================================================

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