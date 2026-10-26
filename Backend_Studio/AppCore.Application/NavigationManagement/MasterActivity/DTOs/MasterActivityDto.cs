//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.NavigationManagement.MasterActivity.DTOs;

//===============================================================
// Master Activity DTO
//===============================================================

public class MasterActivityDto
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

    // Pages linked by hand (submenu codes)
    public List<string> PageSubmenuCodes
    {
        get;
        set;
    } = new();

    // Every page it shows on : hand links + pages with switches
    // (submenu ids, used by the assignment grids)
    public List<long> PageSubmenuIds
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
    }
}