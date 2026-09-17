//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.RoleManagement.RoleProfile.DTOs;


//===============================================================
// Create Role Profile DTO
//===============================================================

public class CreateRoleProfileDto
{
    //===========================================================
    // Basic Information
    //===========================================================

    public string ProfileCode
    {
        get;
        set;
    } = string.Empty;


    public string ProfileName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Description
    //===========================================================

    public string? Remarks
    {
        get;
        set;
    }


    //===========================================================
    // Display Information
    //===========================================================

    public int DisplayOrder
    {
        get;
        set;
    }


    //===========================================================
    // System Flags
    //===========================================================

    public bool IsSystemRole
    {
        get;
        set;
    } = false;


    public bool IsDefaultRole
    {
        get;
        set;
    } = false;


    //===========================================================
    // Status
    //===========================================================

    public bool IsActive
    {
        get;
        set;
    } = true;
}