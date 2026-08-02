//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Activity.DTOs;

//===============================================================
// Navigation Activity DTO
//===============================================================

public class NavigationActivityDto
{
    //===============================================================
    // Primary Key
    //===============================================================

    public long Id
    {
        get;
        set;
    }

    //===============================================================
    // Navigation Module
    //===============================================================

    public long NavigationModuleId
    {
        get;
        set;
    }

    public string NavigationModuleName
    {
        get;
        set;
    } = string.Empty;

    //===============================================================
    // Basic Information
    //===============================================================

    public string Code
    {
        get;
        set;
    } = string.Empty;

    public string Name
    {
        get;
        set;
    } = string.Empty;

    public int DisplayOrder
    {
        get;
        set;
    }

    public string? Remarks
    {
        get;
        set;
    }

    //===============================================================
    // Status
    //===============================================================

    public bool IsActive
    {
        get;
        set;
    }
}