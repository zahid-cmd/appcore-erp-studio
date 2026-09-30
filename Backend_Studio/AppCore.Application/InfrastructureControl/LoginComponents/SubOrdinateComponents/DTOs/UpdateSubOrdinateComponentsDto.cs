//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Http;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.LoginComponents.SubOrdinateComponents.DTOs;


//===============================================================
// UpdateSubOrdinateComponentsDto
//===============================================================

public class UpdateSubOrdinateComponentsDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long Id
    {
        get;
        set;
    }


    //===========================================================
    // Name
    //===========================================================

    public string Name
    {
        get;
        set;
    }
    =
        string.Empty;


    //===========================================================
    // Tab Name
    //===========================================================

    public string TabName
    {
        get;
        set;
    }
    =
        string.Empty;


    //===========================================================
    // Icon
    //===========================================================

    public string Icon
    {
        get;
        set;
    }
    =
        string.Empty;


    //===========================================================
    // Folder Name
    //===========================================================

    public string FolderName
    {
        get;
        set;
    }
    =
        string.Empty;


    //===========================================================
    // Feature Folder
    //===========================================================

    public string FeatureFolder
    {
        get;
        set;
    }
    =
        string.Empty;


    //===========================================================
    // Feature Sub Folder
    //===========================================================

    public string FeatureSubFolder
    {
        get;
        set;
    }
    =
        string.Empty;


    //===========================================================
    // Component Path
    //===========================================================

    public string ComponentPath
    {
        get;
        set;
    }
    =
        string.Empty;


    //===========================================================
    // Registration File Path
    //===========================================================

    public string RegistrationFilePath
    {
        get;
        set;
    }
    =
        string.Empty;


    //===========================================================
    // HTML File Path
    //===========================================================

    public string HtmlFilePath
    {
        get;
        set;
    }
    =
        string.Empty;


    //===========================================================
    // TS File Path
    //===========================================================

    public string TsFilePath
    {
        get;
        set;
    }
    =
        string.Empty;


    //===========================================================
    // CSS File Path
    //===========================================================

    public string CssFilePath
    {
        get;
        set;
    }
    =
        string.Empty;


    //===========================================================
    // Display Order
    //===========================================================

    public int DisplayOrder
    {
        get;
        set;
    }


    //===========================================================
    // Status
    //===========================================================

    public bool Status
    {
        get;
        set;
    }
    =
        true;


    //===========================================================
    // Remarks
    //===========================================================
    //
    // OPTIONAL
    //
    // Remarks has been removed from the UI, therefore it must
    // NOT be treated as a required multipart/form-data field.
    //
    //===========================================================

    public string? Remarks
    {
        get;
        set;
    }


    //===========================================================
    // Background Image Configuration
    //===========================================================

    public IFormFile? LightBackgroundImage
    {
        get;
        set;
    }


    public IFormFile? DeepBackgroundImage
    {
        get;
        set;
    }


    //===========================================================
    // Image Removal Flags
    //===========================================================

    public bool RemoveLightBackgroundImage
    {
        get;
        set;
    }


    public bool RemoveDeepBackgroundImage
    {
        get;
        set;
    }
}