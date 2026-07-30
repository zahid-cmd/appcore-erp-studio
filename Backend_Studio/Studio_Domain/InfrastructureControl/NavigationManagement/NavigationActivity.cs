//===============================================================
// Namespaces
//===============================================================

using AppCore.Domain.Common;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;

//===============================================================
// Navigation Activity
//===============================================================

public class NavigationActivity : CodeMasterEntity
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
    // Navigation Property
    //===============================================================

    public NavigationModule NavigationModule
    {
        get;
        set;
    } = null!;
}