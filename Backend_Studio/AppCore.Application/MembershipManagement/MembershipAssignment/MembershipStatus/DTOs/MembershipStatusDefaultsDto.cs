//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.MembershipManagement.MembershipAssignment;


//===============================================================
// Membership Status Defaults DTO
//===============================================================

public class MembershipStatusDefaultsDto
{
    public string NextMembershipNo
    {
        get;
        set;
    } = string.Empty;


    // yyyy-MM-dd (server date)
    public string Today
    {
        get;
        set;
    } = string.Empty;


    // Active cards with an active policy
    public List<MembershipStatusCardOptionDto> Cards
    {
        get;
        set;
    } = new();


    // Active customer profiles
    public List<MembershipStatusCustomerOptionDto> Customers
    {
        get;
        set;
    } = new();


    // Live motor bikes
    public List<MembershipStatusMotorBikeOptionDto> MotorBikes
    {
        get;
        set;
    } = new();


    public List<string> Statuses
    {
        get;
        set;
    } = new();
}


//===============================================================
// Card with its active policy
//===============================================================

public class MembershipStatusCardOptionDto
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


    public long MembershipPolicyId
    {
        get;
        set;
    }


    public string PolicyCode
    {
        get;
        set;
    } = string.Empty;


    public int ValidityMonths
    {
        get;
        set;
    }


    public decimal EnrollmentFee
    {
        get;
        set;
    }


    public decimal SparePartsDiscountPercent
    {
        get;
        set;
    }


    public decimal AccessoriesDiscountPercent
    {
        get;
        set;
    }


    public decimal ServiceChargeDiscountPercent
    {
        get;
        set;
    }


    public int FreeServiceCount
    {
        get;
        set;
    }


    public int ServiceInterval
    {
        get;
        set;
    }


    public string ServiceIntervalUnit
    {
        get;
        set;
    } = string.Empty;


    public int MissedServiceGraceDays
    {
        get;
        set;
    }


    public int MaxMissedServices
    {
        get;
        set;
    }
}


//===============================================================
// Customer option
//===============================================================

public class MembershipStatusCustomerOptionDto
{
    public long CustomerId
    {
        get;
        set;
    }


    public string CustomerCode
    {
        get;
        set;
    } = string.Empty;


    public string DisplayName
    {
        get;
        set;
    } = string.Empty;


    public string CustomerType
    {
        get;
        set;
    } = string.Empty;
}


//===============================================================
// Motor bike option
//===============================================================

public class MembershipStatusMotorBikeOptionDto
{
    public long MotorBikeId
    {
        get;
        set;
    }


    public string ProductCode
    {
        get;
        set;
    } = string.Empty;


    public string ProductName
    {
        get;
        set;
    } = string.Empty;
}