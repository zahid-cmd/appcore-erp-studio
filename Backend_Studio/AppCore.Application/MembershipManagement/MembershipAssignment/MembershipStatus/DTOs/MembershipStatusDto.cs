//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.MembershipManagement.MembershipAssignment;


//===============================================================
// Membership Status DTO
//===============================================================

public class MembershipStatusDto
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
    // Display
    //===========================================================

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


    public string PolicyCode
    {
        get;
        set;
    } = string.Empty;


    public string CustomerCode
    {
        get;
        set;
    } = string.Empty;


    public string CustomerName
    {
        get;
        set;
    } = string.Empty;


    public string CustomerType
    {
        get;
        set;
    } = string.Empty;


    public string MotorBikeName
    {
        get;
        set;
    } = string.Empty;


    public int UsedCount
    {
        get;
        set;
    }


    public int MissedCount
    {
        get;
        set;
    }


    public int ApprovedCount
    {
        get;
        set;
    }


    // Pending : every field; otherwise remarks / status only
    public bool IsEditable
    {
        get;
        set;
    }


    // Only filled by Get By Id
    public List<MembershipServiceWindowDto> Windows
    {
        get;
        set;
    } = new();


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


//===============================================================
// Free service window (with what can be done now)
//===============================================================

public class MembershipServiceWindowDto
{
    public long MembershipServiceWindowId
    {
        get;
        set;
    }


    public int WindowNo
    {
        get;
        set;
    }


    public DateOnly FromDate
    {
        get;
        set;
    }


    public DateOnly ToDate
    {
        get;
        set;
    }


    public bool IsCarriedOver
    {
        get;
        set;
    }


    // Upcoming / Available / Used / Missed / Approved
    public string State
    {
        get;
        set;
    } = string.Empty;


    public DateOnly? UsedDate
    {
        get;
        set;
    }


    public string UsedReference
    {
        get;
        set;
    } = string.Empty;


    public bool IsApproved
    {
        get;
        set;
    }


    public DateOnly? ApprovedDate
    {
        get;
        set;
    }


    public string ApprovalReason
    {
        get;
        set;
    } = string.Empty;


    public bool CanUse
    {
        get;
        set;
    }


    public bool CanUndo
    {
        get;
        set;
    }


    public bool CanApprove
    {
        get;
        set;
    }
}