//===============================================================
// Namespaces
//===============================================================

using AppCore.Domain.Common;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;

//===============================================================
// Master Activity
//===============================================================

public class MasterActivity : CodeMasterEntity
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
    //
    // Common : shown on every page (View, Add, Update ...).
    // Page   : shown only on the pages it is linked to
    //          (Approve, Post, Settlement ...). The links are kept
    //          in MasterActivityPages by code.
    //===============================================================

    public string ActivityScope
    {
        get;
        set;
    } = "Common";

    //===============================================================
    // Page activity : also linked to every page that has page
    // switches (System Configurations), without manual links.
    //===============================================================

    public bool LinkToSwitchPages
    {
        get;
        set;
    }
}