//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.MembershipManagement.MembershipSetup;


//===============================================================
// Membership Policies DTO
//===============================================================

public class MembershipPoliciesDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long MembershipPolicyId
    {
        get;
        set;
    }


    //===========================================================
    // Policy Information
    //===========================================================

    public string PolicyCode
    {
        get;
        set;
    } = string.Empty;


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


    public bool CardIsActive
    {
        get;
        set;
    }


    // 1 - 120
    public int ValidityMonths
    {
        get;
        set;
    }


    //===========================================================
    // Fees & Discounts
    //===========================================================

    // >= 0
    public decimal EnrollmentFee
    {
        get;
        set;
    }


    // >= 0
    public decimal RenewalFee
    {
        get;
        set;
    }


    // 0 - 100
    public decimal SparePartsDiscountPercent
    {
        get;
        set;
    }


    // 0 - 100
    public decimal AccessoriesDiscountPercent
    {
        get;
        set;
    }


    // 0 - 100
    public decimal ServiceChargeDiscountPercent
    {
        get;
        set;
    }


    //===========================================================
    // Free Services (fixed windows from the membership start)
    //===========================================================

    // 0 - 99 per validity period (0 = none)
    public int FreeServiceCount
    {
        get;
        set;
    }


    // Length of each window (0 when no free services)
    public int ServiceInterval
    {
        get;
        set;
    }


    // Days / Months
    public string ServiceIntervalUnit
    {
        get;
        set;
    } = string.Empty;


    // Days after expiry a missed service can still be approved (0 - 365)
    public int MissedServiceGraceDays
    {
        get;
        set;
    }


    // Missed services that can be given with approval per period (0 - count)
    public int MaxMissedServices
    {
        get;
        set;
    }


    //===========================================================
    // Remarks
    //===========================================================

    public string Remarks
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Status
    //===========================================================

    public bool IsActive
    {
        get;
        set;
    } = true;


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted
    {
        get;
        set;
    } = false;


    public long? DeletedBy
    {
        get;
        set;
    }


    public DateTime? DeletedDate
    {
        get;
        set;
    }


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy
    {
        get;
        set;
    }


    public DateTime CreatedDate
    {
        get;
        set;
    }


    public long? ModifiedBy
    {
        get;
        set;
    }


    public DateTime? ModifiedDate
    {
        get;
        set;
    }
}