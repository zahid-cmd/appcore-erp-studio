//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Service Category Defaults DTO
//===============================================================

public class ServiceCategoryDefaultsDto
{
    //===========================================================
    // Next Category Code per Category Type
    //   Brand Services        : BRS-nnn
    //   Differential Services : DRS-nnn
    //===========================================================

    public string BrandServicesCode
    {
        get;
        set;
    } = string.Empty;


    public string DifferentialServicesCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Income Account Class (the one service categories use; first time : an 'Account' class named '...Income...')
    //===========================================================

    public long IncomeClassId
    {
        get;
        set;
    }


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


    //===========================================================
    // Next Income Group Code (GRP-ccc-ggg)
    //===========================================================

    public string IncomeGroupCode
    {
        get;
        set;
    } = string.Empty;
}