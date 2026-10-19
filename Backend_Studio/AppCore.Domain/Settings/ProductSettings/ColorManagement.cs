// PAGE-CLONED : Company -> Color Management
//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ProductSettings;


//===============================================================
// ColorManagement
//===============================================================

public class ColorManagement
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long ColorManagementId
    {
        get;
        set;
    }


    //===============================================================
    // Color Code
    //===============================================================

    public string ColorCode { get; set; } = string.Empty;

    //===============================================================
    // Color Name
    //===============================================================

    public string ColorName { get; set; } = string.Empty;

    //===============================================================
    // Remarks
    //===============================================================

    public string Remarks { get; set; } = string.Empty;

    //===============================================================
    // Status
    //===============================================================

    public bool Status { get; set; }

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