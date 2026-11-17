//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.AccountClass.DTOs;


//===============================================================
// Create Account Class DTO
//===============================================================

public class CreateAccountClassDto
{
    //===========================================================
    // Basic Information
    //===========================================================

    public string ClassType
    {
        get;
        set;
    } = string.Empty;


    public string ClassCode
    {
        get;
        set;
    } = string.Empty;


    public string ClassName
    {
        get;
        set;
    } = string.Empty;


    public string Mode
    {
        get;
        set;
    } = string.Empty;


    public string ClassPrefix
    {
        get;
        set;
    } = string.Empty;


    public bool AllowManualGroupCreation
    {
        get;
        set;
    }


    //===========================================================
    // Configuration
    //===========================================================

    // What the class is for the financial statements : Asset /
    // Liability / Equity / Income / Other Income / Cost of Goods
    // Sold / Expense. Fixed for the inventory family.
    public string StatementType
    {
        get;
        set;
    } = string.Empty;

    // Business line of its ledgers : MB / SP / AC / SV ("" : none)
    public string BusinessLine
    {
        get;
        set;
    } = string.Empty;

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