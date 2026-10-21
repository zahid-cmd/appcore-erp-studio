//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings;


//===============================================================
// Locations DTO
//===============================================================

public class LocationsDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long LocationId
    {
        get;
        set;
    }


    //===========================================================
    // Basic Information
    //===========================================================

    // LOC-0001 (central CodeGenerator), assigned on create
    public string LocationCode
    {
        get;
        set;
    } = string.Empty;


    // Typed, e.g. "Mirpur"; unique within its district (live rows)
    public string LocationName
    {
        get;
        set;
    } = string.Empty;


    // "<Location Name>, <District>", e.g. "Mirpur, Dhaka"
    public string DisplayName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Geography (fixed lists, see BangladeshGeography)
    //===========================================================

    // One of the 8 divisions
    public string Division
    {
        get;
        set;
    } = string.Empty;


    // One of the 64 districts, inside the division
    public string District
    {
        get;
        set;
    } = string.Empty;


    // Optional, 4 digits
    public string PostalCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Remarks & Status
    //===========================================================

    public string Remarks
    {
        get;
        set;
    } = string.Empty;


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