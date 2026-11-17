//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.AccountClass.DTOs;


//===============================================================
// Account Class DTO
//===============================================================

public class AccountClassDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long AccountClassId
    {
        get;
        set;
    }


    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }


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


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted
    {
        get;
        set;
    }


    public long? DeletedBy
    {
        get;
        set;
    }


    public DateTime? DeletedDate
    {
        get;
        set;
    }


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy
    {
        get;
        set;
    }


    public DateTime CreatedDate
    {
        get;
        set;
    }


    public long? ModifiedBy
    {
        get;
        set;
    }


    public DateTime? ModifiedDate
    {
        get;
        set;
    }
}