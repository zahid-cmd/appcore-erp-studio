//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings.AccountClass.DTOs;


//===============================================================
// Account Class Defaults DTO
//===============================================================

public class AccountClassDefaultsDto
{
    //===========================================================
    // Suggested Prefix (last prefix used by Account Classes;
    // empty on a fresh database)
    //===========================================================

    public string ClassPrefix
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Account Class Code
    //===========================================================

    public string Code
    {
        get;
        set;
    } = string.Empty;
}