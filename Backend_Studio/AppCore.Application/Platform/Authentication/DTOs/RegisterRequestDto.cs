//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.Authentication.DTOs;


//===============================================================
// Register Request DTO
//===============================================================

public class RegisterRequestDto
{
    //===========================================================
    // User Name
    //===========================================================

    public string UserName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Display Name
    //===========================================================

    public string DisplayName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Full Name
    //===========================================================

    public string FullName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Email
    //===========================================================

    public string Email
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Mobile Number
    //===========================================================

    public string MobileNo
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Password
    //===========================================================

    public string Password
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Profile Photo (optional)
    //
    // UserPhotoData : the picture from the browser as a data URL
    // ("data:image/jpeg;base64,...").
    // UserPhotoPath : set by the API after it saves the file
    // (anything the browser sends here is ignored).
    //===========================================================

    public string UserPhotoData
    {
        get;
        set;
    } = string.Empty;

    public string UserPhotoPath
    {
        get;
        set;
    } = string.Empty;
}
