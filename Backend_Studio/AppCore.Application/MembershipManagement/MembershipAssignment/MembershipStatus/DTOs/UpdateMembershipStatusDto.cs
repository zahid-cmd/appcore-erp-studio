//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.MembershipManagement.MembershipAssignment;


//===============================================================
// Update Membership DTO
//
// Pending : every field. Otherwise only Status (Active / Suspended /
// Cancelled) and Remarks.
//===============================================================

public class UpdateMembershipStatusDto
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

    public long MembershipCardId
    {
        get;
        set;
    }


    public long CustomerId
    {
        get;
        set;
    }


    //===========================================================
    // Motor Bike
    //===========================================================

    public long MotorBikeId
    {
        get;
        set;
    }


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
    // Period
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


    //===========================================================
    // Control
    //===========================================================

    public string Remarks
    {
        get;
        set;
    } = string.Empty;


    public string Status
    {
        get;
        set;
    } = string.Empty;


    // Required for Suspended / Cancelled
    public string StatusReason
    {
        get;
        set;
    } = string.Empty;
}