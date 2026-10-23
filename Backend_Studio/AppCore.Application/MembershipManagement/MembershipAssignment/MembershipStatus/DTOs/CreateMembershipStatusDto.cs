//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.MembershipManagement.MembershipAssignment;


//===============================================================
// Create (Enroll) Membership DTO
//
// Number, expiry, fee, policy values and windows are built by the server.
//===============================================================

public class CreateMembershipStatusDto
{
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
}