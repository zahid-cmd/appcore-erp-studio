//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.MasterActivity.DTOs;

//===============================================================
// Master Activity Defaults DTO
//===============================================================

public class MasterActivityDefaultsDto
{
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