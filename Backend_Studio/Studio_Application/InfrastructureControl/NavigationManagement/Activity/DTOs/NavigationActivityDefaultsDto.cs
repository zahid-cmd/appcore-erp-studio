//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.Activity.DTOs;

//===============================================================
// Navigation Activity Defaults DTO
//===============================================================

public class NavigationActivityDefaultsDto
{
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
    // Default Values
    //===============================================================

    public string Code
    {
        get;
        set;
    } = string.Empty;

    public int DisplayOrder
    {
        get;
        set;
    }

    public bool IsActive
    {
        get;
        set;
    } = true;
}