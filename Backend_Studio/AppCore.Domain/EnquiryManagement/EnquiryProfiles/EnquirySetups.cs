//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Enquiry Setups
//
// One table for the five lists of the Enquiry Setup page (a tab
// each), told apart by SetupType :
//
//   Source          Source of Enquiry   SRC-001  Walk-in, Phone …
//   Status          Enquiry Status      EST-001  New … Won / Lost
//   InterestLevel   Interest Levels     INT-001  Hot / Warm / Cold
//   FollowUpMethod  Follow-up Methods   FUM-001  Call, SMS …
//   LostReason      Lost Reasons        LRS-001  Price, …
//   TimeSlot        Time Slots          TSL-001  Service Appointment 1
//
// Hand-written page (NO Code Synchronization for the submenu
// "Enquiry Setup"). Table made by EnquirySetup_Tables.sql.
//===============================================================

public class EnquirySetups
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long EnquirySetupId
    {
        get;
        set;
    }


    //===========================================================
    // List (tab) : Source / Status / InterestLevel /
    // FollowUpMethod / LostReason
    //===========================================================

    public string SetupType
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Code (per type, e.g. EST-003; deleted rows count, never
    // reused) and Name (unique per type among live rows)
    //===========================================================

    public string Code
    {
        get;
        set;
    } = string.Empty;


    public string Name
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Colour (#RRGGBB) : Enquiry Status and Interest Levels only
    //===========================================================

    public string ColorCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Stage : Enquiry Status only — Open / Won / Lost. A follow-up
    // closes an enquiry with a Won or Lost status.
    //===========================================================

    public string Stage
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Days to purchase : Interest Levels only. An open enquiry
    // with an Expected Purchase Date takes the level whose range
    // holds the days left (e.g. Super Hot 0 - 3, Hot 4 - 7).
    // DaysTo null = and more. Both null = chosen by hand only.
    //===========================================================

    public int? DaysFrom
    {
        get;
        set;
    }


    public int? DaysTo
    {
        get;
        set;
    }


    //===========================================================
    // Time Slots only : a booking day for one page (UsedFor
    // Service = service appointments, TestRide = test rides) :
    // working hours From - To cut into IntervalMinutes slots (15 /
    // 30 / 45 / 60), the lunch break BreakFrom - BreakTo skipped.
    // One active time slot per page. Null / '' for other lists.
    //===========================================================

    public int? IntervalMinutes
    {
        get;
        set;
    }

    // Bookings one slot can take (1 - 20). Manual for now; later
    // from Workshop Configuration (service bays allowed for online
    // booking)
    public int? SlotCapacity
    {
        get;
        set;
    }

    public TimeOnly? BreakFrom
    {
        get;
        set;
    }

    public TimeOnly? BreakTo
    {
        get;
        set;
    }

    public TimeOnly? TimeFrom
    {
        get;
        set;
    }

    public TimeOnly? TimeTo
    {
        get;
        set;
    }

    public string UsedFor
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Order in the lists and dropdowns
    //===========================================================

    public int DisplayOrder
    {
        get;
        set;
    }


    //===========================================================
    // Default : preselected on new enquiries / follow-ups (one
    // per type at most)
    //===========================================================

    public bool IsDefault
    {
        get;
        set;
    }


    //===========================================================
    // System row (seeded New / Won / Lost statuses) : cannot be
    // deleted or deactivated; its Stage is locked
    //===========================================================

    public bool IsSystem
    {
        get;
        set;
    }


    //===========================================================
    // Remarks / Status
    //===========================================================

    public string Remarks
    {
        get;
        set;
    } = string.Empty;


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
