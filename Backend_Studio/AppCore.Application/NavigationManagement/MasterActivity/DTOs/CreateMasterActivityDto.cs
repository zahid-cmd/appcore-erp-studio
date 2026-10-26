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
    // Scope
    //===============================================================

    // Common / Page
    public string ActivityScope
    {
        get;
        set;
    } = "Common";

    public bool LinkToSwitchPages
    {
        get;
        set;
    }

    // Submenu codes (Page scope only)
    public List<string> PageSubmenuCodes
    {
        get;
        set;
    } = new();

    //===============================================================
    // Status
    //===============================================================

    public bool IsActive
    {
        get;
        set;
    } = true;
}