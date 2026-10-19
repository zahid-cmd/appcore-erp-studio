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
    // Membership Services sub categories (live) with the next codes
    //===========================================================

    public List<MembershipServicesSubCategoryOptionDto> SubCategories
    {
        get;
        set;
    } = new();


    //===========================================================
    // Membership Types (fixed for now)
    //===========================================================

    public List<string> MembershipTypes
    {
        get;
        set;
    } = new();


    //===========================================================
    // Expense sub group (SUB-004-002-001, display)
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


    // Set when the sub group is missing / deleted
    public string ExpenseSubGroupMessage
    {
        get;
        set;
    } = string.Empty;
}


//===============================================================
// Membership Services : one sub category option
//===============================================================

public class MembershipServicesSubCategoryOptionDto
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


    public string NextExpenseLedgerCode
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