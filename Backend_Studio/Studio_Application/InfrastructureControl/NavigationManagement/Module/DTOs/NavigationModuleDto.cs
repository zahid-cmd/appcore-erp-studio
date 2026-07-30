//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Module.DTOs;

//===============================================================
// Navigation Module DTO
//===============================================================

public class NavigationModuleDto
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

    public string Icon
    {
        get;
        set;
    } = string.Empty;

    public string RouteKey
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