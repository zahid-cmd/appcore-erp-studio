//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Membership Services Defaults DTO
//===============================================================

public class MembershipServicesDefaultsDto
{
    //===========================================================
    // List filters
    //===========================================================

    public List<MembershipServicesCardOptionDto> Cards
    {
        get;
        set;
    } = new();


    public List<MembershipServicesSubCategoryOptionDto> SubCategories
    {
        get;
        set;
    } = new();


    //===========================================================
    // Expense sub group (display)
    //===========================================================

    public string ExpenseSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string ExpenseSubGroupName
    {
        get;
        set;
    } = string.Empty;
}


//===============================================================
// Membership card (filter option)
//===============================================================

public class MembershipServicesCardOptionDto
{
    public long MembershipCardId
    {
        get;
        set;
    }


    public string CardCode
    {
        get;
        set;
    } = string.Empty;


    public string CardName
    {
        get;
        set;
    } = string.Empty;


    public int CardRank
    {
        get;
        set;
    }


    public bool IsActive
    {
        get;
        set;
    }
}


//===============================================================
// Membership Services sub category (filter option)
//===============================================================

public class MembershipServicesSubCategoryOptionDto
{
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
}