//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HumanResourceSetup.Designation.DTOs;


//===============================================================
// Update Designation DTO
//===============================================================

public class UpdateDesignationDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long DesignationId
    {
        get;
        set;
    }


    //===========================================================
    // Basic Information
    //===========================================================

    public string DesignationCode
    {
        get;
        set;
    } = string.Empty;


    public string DesignationName
    {
        get;
        set;
    } = string.Empty;


    public string DesignationShortName
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
}