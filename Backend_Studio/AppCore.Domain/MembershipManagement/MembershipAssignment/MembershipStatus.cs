//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.MembershipManagement.MembershipAssignment;


//===============================================================
// Membership Status (one membership period of one bike)
//
// Enrolled here; activated by Membership Fees Collection (or at
// once when the fee is 0). Free services : fixed windows in
// MembershipServiceWindows.
//===============================================================

public class MembershipStatus
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long MembershipId
    {
        get;
        set;
    }


    //===========================================================
    // Membership
    //===========================================================

    // MEM-000001 (central CodeGenerator), assigned on create
    public string MembershipNo
    {
        get;
        set;
    } = string.Empty;


    // Enrollment / Renewal / Upgrade
    public string EntryType
    {
        get;
        set;
    } = string.Empty;


    // The membership renewed / upgraded (renewal / upgrade)
    public long? PreviousMembershipId
    {
        get;
        set;
    }


    public long MembershipCardId
    {
        get;
        set;
    }


    // The card's policy at enrollment
    public long MembershipPolicyId
    {
        get;
        set;
    }


    // Customer Profiles (Inbound or Outside)
    public long CustomerId
    {
        get;
        set;
    }


    //===========================================================
    // Motor Bike
    //===========================================================

    // Placeholder : linked when Customer Vehicles is built
    public long? CustomerVehicleId
    {
        get;
        set;
    }


    // Product Settings > Motor Bikes
    public long MotorBikeId
    {
        get;
        set;
    }


    // UPPERCASE; one open membership per chassis
    public string ChassisNo
    {
        get;
        set;
    } = string.Empty;


    public string EngineNo
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Period & Fee
    //===========================================================

    public DateOnly EnrollmentDate
    {
        get;
        set;
    }


    public DateOnly StartDate
    {
        get;
        set;
    }


    // Start + validity - 1 day (+ carried-over windows on upgrade)
    public DateOnly ExpiryDate
    {
        get;
        set;
    }


    // Enrollment / renewal / upgrade fee copied from the policy
    public decimal FeeAmount
    {
        get;
        set;
    }


    // Set by Membership Fees Collection
    public bool FeeCollected
    {
        get;
        set;
    }


    public DateOnly? FeeCollectedDate
    {
        get;
        set;
    }


    //===========================================================
    // Policy values copied at enrollment (later policy edits do not change them)
    //===========================================================

    public int ValidityMonths
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


    // Unused services carried over on upgrade
    public int CarriedServiceCount
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


    //===========================================================
    // Status
    //===========================================================

    // Pending / Active / Expired / Suspended / Cancelled / Renewed / Upgraded
    public string Status
    {
        get;
        set;
    } = string.Empty;


    public string StatusReason
    {
        get;
        set;
    } = string.Empty;


    public DateOnly? StatusDate
    {
        get;
        set;
    }


    public string Remarks
    {
        get;
        set;
    } = string.Empty;


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