//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Menu.DTOs;

//===============================================================
// Create Navigation Menu DTO
//===============================================================

public class CreateNavigationMenuDto
{
    //===============================================================
    // Foreign Key
    //===============================================================

    public long NavigationModuleId
    {
        get;
        set;
    }

    //===============================================================
    // Basic Information
    //===============================================================

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
    } = true;
}