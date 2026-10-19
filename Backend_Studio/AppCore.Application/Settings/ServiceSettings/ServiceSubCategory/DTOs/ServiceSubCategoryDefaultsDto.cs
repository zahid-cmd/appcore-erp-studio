//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Service Sub Category Defaults DTO
//===============================================================

public class ServiceSubCategoryDefaultsDto
{
    //===========================================================
    // Live Service Categories with their preview codes
    //===========================================================

    public List<ServiceSubCategoryCategoryOptionDto> Categories
    {
        get;
        set;
    } = new();
}


//===============================================================
// Service Sub Category : one Service Category option
//===============================================================

public class ServiceSubCategoryCategoryOptionDto
{
    //===========================================================
    // Service Category
    //===========================================================

    public long ServiceCategoryId
    {
        get;
        set;
    }


    public string CategoryCode
    {
        get;
        set;
    } = string.Empty;


    public string CategoryName
    {
        get;
        set;
    } = string.Empty;


    public string CategoryType
    {
        get;
        set;
    } = string.Empty;


    public string BrandName
    {
        get;
        set;
    } = string.Empty;


    public bool IsActive
    {
        get;
        set;
    }


    public bool SubCategoryCreationAllowed
    {
        get;
        set;
    }


    //===========================================================
    // Income Account (display)
    //===========================================================

    public string IncomeClassCode
    {
        get;
        set;
    } = string.Empty;


    public string IncomeClassName
    {
        get;
        set;
    } = string.Empty;


    public string IncomeGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string IncomeGroupName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Preview of the next codes under this category
    //===========================================================

    // <Category Code>-sss
    public string NextSubCategoryCode
    {
        get;
        set;
    } = string.Empty;


    // SUB-ccc-ggg-sss
    public string NextSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Brand Services : types already used (one per type)
    //===========================================================

    public List<string> UsedSubCategoryTypes
    {
        get;
        set;
    } = new();
}