//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Service Policy Defaults DTO
//===============================================================

public class ServicePolicyDefaultsDto
{
    //===========================================================
    // Next Policy Code (SVP-nnn)
    //===========================================================

    public string Code
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Associated Sub Group : the one the policies use (fixed), or
    // for the first policy the first eligible one named '...receivable...'
    //===========================================================

    public long DefaultSubGroupId
    {
        get;
        set;
    }


    // True once a policy exists : every policy uses the same sub group
    public bool IsSubGroupFixed
    {
        get;
        set;
    }


    //===========================================================
    // Next Associated Ledger Code under DefaultSubGroupId (preview)
    //===========================================================

    public string NextLedgerCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Eligible sub groups
    //===========================================================

    public List<ServicePolicySubGroupOptionDto> SubGroups
    {
        get;
        set;
    } = new();


    //===========================================================
    // Brands (the form offers active brands without a policy)
    //===========================================================

    public List<ServicePolicyBrandOptionDto> Brands
    {
        get;
        set;
    } = new();
}


//===============================================================
// Associated Sub Group Option
//===============================================================

public class ServicePolicySubGroupOptionDto
{
    public long AccountSubGroupId
    {
        get;
        set;
    }


    public string SubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string SubGroupName
    {
        get;
        set;
    } = string.Empty;


    public string ClassName
    {
        get;
        set;
    } = string.Empty;


    public string GroupName
    {
        get;
        set;
    } = string.Empty;
}


//===============================================================
// Brand Option
//===============================================================

public class ServicePolicyBrandOptionDto
{
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


    public bool BrandActive
    {
        get;
        set;
    }


    // Set when the brand already has a policy
    public long? ServicePolicyId
    {
        get;
        set;
    }
}