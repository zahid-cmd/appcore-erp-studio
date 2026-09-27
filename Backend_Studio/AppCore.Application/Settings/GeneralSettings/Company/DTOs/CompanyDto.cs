//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings.Company.DTOs;


//===============================================================
// Company DTO
//===============================================================

public class CompanyDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long CompanyId
    {
        get;
        set;
    }


    //===========================================================
    // Basic Information
    //===========================================================

    public string CompanyCode
    {
        get;
        set;
    } = string.Empty;


    public string CompanyName
    {
        get;
        set;
    } = string.Empty;


    public string CompanyShortName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Address & Contact Information
    //===========================================================

    public string AddressLine1
    {
        get;
        set;
    } = string.Empty;


    public string AddressLine2
    {
        get;
        set;
    } = string.Empty;


    public string Phone
    {
        get;
        set;
    } = string.Empty;


    public string Mobile
    {
        get;
        set;
    } = string.Empty;


    public string Email
    {
        get;
        set;
    } = string.Empty;


    public string Website
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Business Information
    //===========================================================

    public string BINNo
    {
        get;
        set;
    } = string.Empty;


    public string OwnershipType
    {
        get;
        set;
    } = string.Empty;


    public string EconomicActivity
    {
        get;
        set;
    } = string.Empty;


    public string TINNo
    {
        get;
        set;
    } = string.Empty;


    public string TradeLicenseNo
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

    public string CompanyLogoPath
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