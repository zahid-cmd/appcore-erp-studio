//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings;


//===============================================================
// Update Locations DTO
//===============================================================

public class UpdateLocationsDto
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

    // Preview only : the server assigns LOC-....
    public string LocationCode
    {
        get;
        set;
    } = string.Empty;


    public string LocationName
    {
        get;
        set;
    } = string.Empty;


    // Preview only : built by the server
    public string DisplayName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Geography
    //===========================================================

    public string Division
    {
        get;
        set;
    } = string.Empty;


    public string District
    {
        get;
        set;
    } = string.Empty;


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
}