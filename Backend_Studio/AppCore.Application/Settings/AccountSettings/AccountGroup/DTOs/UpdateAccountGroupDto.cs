//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.AccountGroup.DTOs;


//===============================================================
// Update Account Group DTO
//===============================================================

public class UpdateAccountGroupDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long AccountGroupId
    {
        get;
        set;
    }


    //===========================================================
    // Account Class
    //===========================================================

    public long AccountClassId
    {
        get;
        set;
    }


    //===========================================================
    // Basic Information
    //===========================================================

    public string ClassCode
    {
        get;
        set;
    } = string.Empty;


    public string Mode
    {
        get;
        set;
    } = string.Empty;


    public string GroupCode
    {
        get;
        set;
    } = string.Empty;


    public string GroupName
    {
        get;
        set;
    } = string.Empty;


    public bool AllowManualSubGroup
    {
        get;
        set;
    }


    //===========================================================
    // Configuration
    //===========================================================

    public string Remarks
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Status
    //===========================================================

    public bool IsActive
    {
        get;
        set;
    } = true;
}