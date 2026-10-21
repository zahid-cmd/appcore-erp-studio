//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.MembershipManagement.MembershipSetup;


//===============================================================
// Membership Policies Defaults DTO
//===============================================================

public class MembershipPoliciesDefaultsDto
{
    //===========================================================
    // Policy Information
    //===========================================================

    public string NextPolicyCode
    {
        get;
        set;
    } = string.Empty;


    // Live cards without a live policy
    public List<MembershipPoliciesCardOptionDto> Cards
    {
        get;
        set;
    } = new();


    // Days / Months
    public List<string> IntervalUnits
    {
        get;
        set;
    } = new();
}


//===============================================================
// Membership card option
//===============================================================

public class MembershipPoliciesCardOptionDto
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