//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Update (Configure) Membership Services DTO
//
// Rows are created, renamed, deleted and restored by Membership
// Cards. This page only sets the Service Value, status and remarks.
//===============================================================

public class UpdateMembershipServicesDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long MembershipServiceId
    {
        get;
        set;
    }


    //===========================================================
    // Configuration (the only editable fields)
    //===========================================================

    // > 0
    public decimal ServiceValue
    {
        get;
        set;
    }


    public string Remarks
    {
        get;
        set;
    } = string.Empty;


    public bool IsActive
    {
        get;
        set;
    }
}