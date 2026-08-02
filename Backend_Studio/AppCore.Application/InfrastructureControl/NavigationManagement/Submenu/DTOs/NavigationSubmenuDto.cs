//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Submenu.DTOs;

//===============================================================
// Navigation Submenu DTO
//===============================================================

public class NavigationSubmenuDto
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

    public string NavigationModuleCode
    {
        get;
        set;
    } = string.Empty;

    public string NavigationModuleName
    {
        get;
        set;
    } = string.Empty;

    //===============================================================
    // Navigation Menu
    //===============================================================

    public long NavigationMenuId
    {
        get;
        set;
    }

    public string NavigationMenuCode
    {
        get;
        set;
    } = string.Empty;

    public string NavigationMenuName
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

    public string Icon
    {
        get;
        set;
    } = string.Empty;

    //===============================================================
    // Route Information
    //===============================================================

    public string RouteKey
    {
        get;
        set;
    } = string.Empty;

    public string Route
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