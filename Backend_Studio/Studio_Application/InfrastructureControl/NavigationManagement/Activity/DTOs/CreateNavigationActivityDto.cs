//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Activity.DTOs;

//===============================================================
// Create Navigation Activity DTO
//===============================================================

public class CreateNavigationActivityDto
{
    //===============================================================
    // Navigation Module
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