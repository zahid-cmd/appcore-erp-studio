//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.AccountSettings;


//===============================================================
// Account Class
//===============================================================

public class AccountClass
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
    public Guid PublicId { get; set; } = Guid.CreateVersion7();


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
    } = false;

    // What the class is for the financial statements : Asset /
    // Liability / Equity / Income / Other Income / Cost of Goods
    // Sold / Expense (StatementTypes). The statements go by this,
    // never by the class name.
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


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted
    {
        get;
        set;
    } = false;


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