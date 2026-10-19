//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Customized Services Defaults DTO
//===============================================================

public class CustomizedServicesDefaultsDto
{
    //===========================================================
    // Customized Services sub categories (live) with the next codes
    //===========================================================

    public List<CustomizedServicesSubCategoryOptionDto> SubCategories
    {
        get;
        set;
    } = new();
}


//===============================================================
// Customized Services : one sub category option
//===============================================================

public class CustomizedServicesSubCategoryOptionDto
{
    //===========================================================
    // Sub Category
    //===========================================================

    public long ServiceSubCategoryId
    {
        get;
        set;
    }


    public string SubCategoryCode
    {
        get;
        set;
    } = string.Empty;


    public string SubCategoryName
    {
        get;
        set;
    } = string.Empty;


    public string CategoryName
    {
        get;
        set;
    } = string.Empty;


    // Sub category and its category active
    public bool IsActive
    {
        get;
        set;
    }


    public bool ItemCreationAllowed
    {
        get;
        set;
    }


    //===========================================================
    // Preview of the codes the next service gets
    //===========================================================

    public string NextServiceCode
    {
        get;
        set;
    } = string.Empty;


    public string NextIncomeLedgerCode
    {
        get;
        set;
    } = string.Empty;


    // Why no service can be added under it ('' when it can)
    public string Message
    {
        get;
        set;
    } = string.Empty;
}