//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.UserManagement.UserProfile.DTOs;


//===============================================================
// Update User Profile DTO
//===============================================================

public class UpdateUserProfileDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long UserProfileId
    {
        get;
        set;
    }


    //===========================================================
    // Basic Information
    //===========================================================

    public string ProfileCode
    {
        get;
        set;
    } = string.Empty;


    public string UserName
    {
        get;
        set;
    } = string.Empty;


    public string DisplayName
    {
        get;
        set;
    } = string.Empty;


    public string FullName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Contact Information
    //===========================================================

    public string Email
    {
        get;
        set;
    } = string.Empty;


    public string MobileNo
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