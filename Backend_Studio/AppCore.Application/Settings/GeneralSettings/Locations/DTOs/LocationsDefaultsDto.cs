//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings;


//===============================================================
// Locations Defaults DTO
//===============================================================

public class LocationsDefaultsDto
{
    //===========================================================
    // Next code (preview)
    //===========================================================

    public string NextLocationCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Divisions with their districts (fixed)
    //===========================================================

    public List<LocationsDivisionOptionDto> Divisions
    {
        get;
        set;
    } = new();
}


//===============================================================
// Locations : one division with its districts
//===============================================================

public class LocationsDivisionOptionDto
{
    //===========================================================
    // Division
    //===========================================================

    public string Division
    {
        get;
        set;
    } = string.Empty;


    public List<string> Districts
    {
        get;
        set;
    } = new();
}