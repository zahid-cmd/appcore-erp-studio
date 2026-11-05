//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Enquiry Setup : the five lists (tabs) and their codes
//===============================================================

public static class EnquirySetupTypes
{
    public const string Source = "Source";

    public const string Status = "Status";

    public const string InterestLevel = "InterestLevel";

    public const string FollowUpMethod = "FollowUpMethod";

    public const string LostReason = "LostReason";

    public const string TimeSlot = "TimeSlot";


    // Type → (code prefix, label)
    public static readonly IReadOnlyDictionary<string, (string Prefix, string Label)> All =
        new Dictionary<string, (string Prefix, string Label)>(StringComparer.OrdinalIgnoreCase)
        {
            [Source]         = ("SRC", "Source of Enquiry"),
            [Status]         = ("EST", "Enquiry Status"),
            [InterestLevel]  = ("INT", "Interest Level"),
            [FollowUpMethod] = ("FUM", "Follow-up Method"),
            [LostReason]     = ("LRS", "Suspend Reason"),
            [TimeSlot]       = ("TSL", "Time Slot")
        };


    // Lists that carry a colour
    public static bool HasColor(string type) =>
        string.Equals(type, Status, StringComparison.OrdinalIgnoreCase)
        ||
        string.Equals(type, InterestLevel, StringComparison.OrdinalIgnoreCase);


    // Lists that carry a stage
    public static bool HasStage(string type) =>
        string.Equals(type, Status, StringComparison.OrdinalIgnoreCase);


    // Lists that carry a days-to-purchase range
    public static bool HasDays(string type) =>
        string.Equals(type, InterestLevel, StringComparison.OrdinalIgnoreCase);

    // Lists that carry hours + where they are offered
    public static bool HasTime(string type) =>
        string.Equals(type, TimeSlot, StringComparison.OrdinalIgnoreCase);
}


//===============================================================
// Time Slots : the page a time slot serves, and its slots
//===============================================================

public static class TimeSlotUses
{
    public const string Service = "Service";

    public const string TestRide = "TestRide";

    public static readonly string[] All =
    {
        Service,
        TestRide
    };

    // Allowed slot lengths (minutes)
    public static readonly int[] Intervals =
    {
        15,
        30,
        45,
        60
    };

    // Shown as (and the name of the time slot : "<label> <n>")
    public static string Label(string use) =>
        use switch
        {
            Service => "Service Appointment",
            TestRide => "Test Ride",
            _ => use
        };

    // The bookable slots of a day : From, From + interval, ... while
    // the slot ends by To; a slot that would touch the break starts
    // again at the break's end.
    public static List<(TimeOnly Start, TimeOnly End)> BuildSlots
    (
        TimeOnly from,
        TimeOnly to,
        int intervalMinutes,
        TimeOnly? breakFrom,
        TimeOnly? breakTo
    )
    {
        List<(TimeOnly Start, TimeOnly End)> slots =
            new();

        if (intervalMinutes <= 0 || to <= from)
        {
            return slots;
        }

        int start = from.Hour * 60 + from.Minute;

        int end = to.Hour * 60 + to.Minute;

        int? lunchFrom = breakFrom.HasValue ? breakFrom.Value.Hour * 60 + breakFrom.Value.Minute : null;

        int? lunchTo = breakTo.HasValue ? breakTo.Value.Hour * 60 + breakTo.Value.Minute : null;

        int t = start;

        while (t + intervalMinutes <= end && slots.Count < 200)
        {
            if (lunchFrom.HasValue && lunchTo.HasValue && t < lunchTo.Value && t + intervalMinutes > lunchFrom.Value)
            {
                t = lunchTo.Value;

                continue;
            }

            slots.Add((new TimeOnly(t / 60, t % 60), new TimeOnly((t + intervalMinutes) / 60, (t + intervalMinutes) % 60)));

            t += intervalMinutes;
        }

        return slots;
    }
}


//===============================================================
// Enquiry Status stages
//===============================================================

public static class EnquiryStages
{
    public const string Open = "Open";

    public const string Won = "Won";

    public const string Lost = "Lost";


    public static readonly string[] All =
    {
        Open,
        Won,
        Lost
    };
}


//===============================================================
// Enquiry Setup DTO (read)
//===============================================================

public class EnquirySetupDto
{
    public long EnquirySetupId { get; set; }

    public string SetupType { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // #RRGGBB (Status / Interest Level), else ''
    public string ColorCode { get; set; } = string.Empty;

    // Open / Won / Lost (Status), else ''
    public string Stage { get; set; } = string.Empty;

    // Interest Level : days to purchase (To null = and more)
    public int? DaysFrom { get; set; }

    public int? DaysTo { get; set; }

    // Time Slot : page (Service / TestRide), slot length, working
    // hours and lunch break ("HH:mm"), else '' / null
    public string UsedFor { get; set; } = string.Empty;

    public int? IntervalMinutes { get; set; }

    // Bookings per slot (1 - 20)
    public int? SlotCapacity { get; set; }

    public string TimeFrom { get; set; } = string.Empty;

    public string TimeTo { get; set; } = string.Empty;

    public string BreakFrom { get; set; } = string.Empty;

    public string BreakTo { get; set; } = string.Empty;

    // Bookable slots of a day (Time Slot)
    public int SlotCount { get; set; }

    public int DisplayOrder { get; set; }

    public bool IsDefault { get; set; }

    public bool IsSystem { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// Create Enquiry Setup DTO (Code set by the server)
//===============================================================

public class CreateEnquirySetupDto
{
    public string SetupType { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string ColorCode { get; set; } = string.Empty;

    public string Stage { get; set; } = string.Empty;

    // Interest Level : days to purchase (both null = by hand only)
    public int? DaysFrom { get; set; }

    public int? DaysTo { get; set; }

    // Time Slot : page (Service / TestRide; locked after saving),
    // slot length 15 / 30 / 45 / 60, working hours and an optional
    // lunch break ("HH:mm", 24 h). The name is generated.
    public string UsedFor { get; set; } = string.Empty;

    public int? IntervalMinutes { get; set; }

    // Bookings per slot (1 - 20)
    public int? SlotCapacity { get; set; }

    public string TimeFrom { get; set; } = string.Empty;

    public string TimeTo { get; set; } = string.Empty;

    public string BreakFrom { get; set; } = string.Empty;

    public string BreakTo { get; set; } = string.Empty;

    // 0 = after the last one
    public int DisplayOrder { get; set; }

    public bool IsDefault { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}


//===============================================================
// Update Enquiry Setup DTO (type and code locked after saving)
//===============================================================

public class UpdateEnquirySetupDto
    : CreateEnquirySetupDto
{
    public long EnquirySetupId { get; set; }
}


//===============================================================
// Enquiry Setup Defaults DTO (preview for a new row of a type)
//===============================================================

public class EnquirySetupDefaultsDto
{
    public string SetupType { get; set; } = string.Empty;

    // e.g. EST-004
    public string Code { get; set; } = string.Empty;

    // Highest order of the type's live rows + 1
    public int NextDisplayOrder { get; set; } = 1;
}
