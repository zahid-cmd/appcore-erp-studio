// PAGE-CLONED : Bank Setup -> Card Setup
// PAGE-CLONED : Wings -> Card Setup
//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.CardSetup.DTOs;


//===============================================================
// CardSetup DTO
//===============================================================

public class CardSetupDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long CardSetupId
    {
        get;
        set;
    }


    //===============================================================
    // Card Code
    //===============================================================

    public string CardCode { get; set; } = string.Empty;

    //===============================================================
    // Card Name
    //===============================================================

    public string CardName { get; set; } = string.Empty;

    //===============================================================
    // Remarks
    //===============================================================

    public string Remarks { get; set; } = string.Empty;

    //===============================================================
    // Status
    //===============================================================

    public bool Status { get; set; }

    //===============================================================
    // Short Name
    //===============================================================

    public string ShortName { get; set; } = string.Empty;

    //===============================================================
    // Issuing Bank
    //===============================================================

    public string IssuingBank { get; set; } = string.Empty;

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