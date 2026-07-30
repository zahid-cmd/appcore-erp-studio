//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.MasterActivity.DTOs;

//===============================================================
// Create Master Activity DTO
//===============================================================

public class CreateMasterActivityDto
{
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