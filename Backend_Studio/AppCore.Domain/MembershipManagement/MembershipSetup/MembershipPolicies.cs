//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.MembershipManagement.MembershipSetup;


//===============================================================
// Membership Policies
//
// The rules of one membership card : validity, fees, member
// discounts and free services. No ledgers here : fees post to the
// card's Fee Ledger and discounts to its Discount Ledger. Enrollment /
// renewal copy these values, so later edits do not change memberships
// already sold.
//===============================================================

public class MembershipPolicies
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

    // MSP-001 (central CodeGenerator), assigned on create
    public string PolicyCode
    {
        get;
        set;
    } = string.Empty;


    // One live policy per card; locked after saving
    public long MembershipCardId
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