//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;

//===============================================================
// Master Activity Pages
//
// The pages (submenus) a Page activity is used on. Linked by
// code : MasterActivities.Code + NavigationSubmenus.Code.
//===============================================================

public class MasterActivityPages
{
    //===============================================================
    // Primary Key
    //===============================================================

    public long MasterActivityPageId
    {
        get;
        set;
    }

    //===============================================================
    // Links (by code)
    //===============================================================

    public string MasterActivityCode
    {
        get;
        set;
    } = string.Empty;

    public string NavigationSubmenuCode
    {
        get;
        set;
    } = string.Empty;

    //===============================================================
    // Audit
    //===============================================================

    public long? CreatedBy
    {
        get;
        set;
    }

    public DateTime CreatedDate
    {
        get;
        set;
    } = DateTime.UtcNow;
}