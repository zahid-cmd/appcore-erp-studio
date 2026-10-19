//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Labor Chart Defaults DTO
//===============================================================

public class LaborChartDefaultsDto
{
    //===========================================================
    // Labor Chart sub categories (live) with the next codes
    //===========================================================

    public List<LaborChartSubCategoryOptionDto> SubCategories
    {
        get;
        set;
    } = new();


    //===========================================================
    // Sections (fixed list)
    //===========================================================

    public List<string> Sections
    {
        get;
        set;
    } = new();
}


//===============================================================
// Labor Chart : one Labor Chart sub category option
//===============================================================

public class LaborChartSubCategoryOptionDto
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


    public long BrandManagementId
    {
        get;
        set;
    }


    public string BrandName
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
    // Preview of the codes the next labor operation gets
    //===========================================================

    public string NextLaborCode
    {
        get;
        set;
    } = string.Empty;


    public string NextIncomeLedgerCode
    {
        get;
        set;
    } = string.Empty;


    // Why no operation can be added under it ('' when it can)
    public string Message
    {
        get;
        set;
    } = string.Empty;
}