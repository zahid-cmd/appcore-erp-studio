//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Sales Test Rides : statuses
//===============================================================

public static class SalesTestRideStatuses
{
    public const string Booked = "Booked";

    public const string Confirmed = "Confirmed";

    public const string Ridden = "Ridden";

    public const string NoShow = "NoShow";

    public const string Cancelled = "Cancelled";

    // Live : holds the slot and blocks a second booking
    public static bool IsLive(string status) =>
        status == Booked || status == Confirmed;

    public static string Label(string status) =>
        status == NoShow ? "No-show" : status;
}


//===============================================================
// One test ride (with what the board needs of its enquiry)
//===============================================================

public class SalesTestRideDto
{
    public long SalesTestRideId { get; set; }

    // Links of the Test Rides page (list / form)
    public Guid PublicId { get; set; }

    public long SalesEnquiryId { get; set; }

    public string EnquiryNo { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public DateOnly RideDate { get; set; }

    // "HH:mm"
    public string SlotStart { get; set; } = string.Empty;

    public string SlotEnd { get; set; } = string.Empty;

    public long? TimeSlotId { get; set; }

    // The bike to ride
    public long? ModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public DateTime? StatusDate { get; set; }

    public string CancelReason { get; set; } = string.Empty;

    public long AdvisorUserId { get; set; }

    public string AdvisorName { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    public int RescheduleCount { get; set; }

    // The enquiry
    public string EnquirerName { get; set; } = string.Empty;

    public string EnquirerMobile { get; set; } = string.Empty;

    public string EnquiryModelName { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string SecondModelName { get; set; } = string.Empty;

    public string InterestLevelName { get; set; } = string.Empty;

    public string InterestLevelColor { get; set; } = string.Empty;

    public string EnquiryStatusName { get; set; } = string.Empty;

    public string EnquiryStatusColor { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }

    // Booked / Confirmed (holds the slot)
    public bool IsLive { get; set; }

    // Live and the date has passed
    public bool IsOverdue { get; set; }
}


//===============================================================
// An open sales enquiry with no live test ride (waiting list)
//===============================================================

public class TestRideWaitingDto
{
    public long SalesEnquiryId { get; set; }

    public string EnquiryNo { get; set; } = string.Empty;

    public DateOnly EnquiryDate { get; set; }

    public string EnquirerName { get; set; } = string.Empty;

    public string EnquirerMobile { get; set; } = string.Empty;

    public long ModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public long? SecondModelId { get; set; }

    public string SecondModelName { get; set; } = string.Empty;

    // Asked for a ride (website / form) : the date and time asked
    public DateOnly? TestRideDate { get; set; }

    public string TestRideSlot { get; set; } = string.Empty;

    public string SourceName { get; set; } = string.Empty;

    public bool FromWebsite { get; set; }

    public string InterestLevelName { get; set; } = string.Empty;

    public string InterestLevelColor { get; set; } = string.Empty;

    public string StatusName { get; set; } = string.Empty;

    public string StatusColor { get; set; } = string.Empty;

    public long ExecutiveUserId { get; set; }

    public string ExecutiveName { get; set; } = string.Empty;

    // Last ride was a No-show / Cancelled
    public string LastRide { get; set; } = string.Empty;
}


//===============================================================
// The day board (slots : AppointmentSlotDto)
//===============================================================

public class TestRideDayDto
{
    public DateOnly Date { get; set; }

    public long BranchId { get; set; }

    // The default Test Ride time slot (null = none set)
    public long? TimeSlotId { get; set; }

    public string TimeSlotName { get; set; } = string.Empty;

    public int IntervalMinutes { get; set; }

    // Rides per slot
    public int Capacity { get; set; }

    // Switch : a full slot may be overbooked after a warning
    public bool AllowOverbook { get; set; } = true;

    public string TimeFrom { get; set; } = string.Empty;

    public string TimeTo { get; set; } = string.Empty;

    public string BreakFrom { get; set; } = string.Empty;

    public string BreakTo { get; set; } = string.Empty;

    // Why nothing can be booked ('' = fine)
    public string Message { get; set; } = string.Empty;

    public List<AppointmentSlotDto> Slots { get; set; } = new();

    public List<SalesTestRideDto> Rides { get; set; } = new();

    public List<TestRideWaitingDto> Waiting { get; set; } = new();

    // Per status, this day
    public Dictionary<string, int> Counts { get; set; } = new();

    // Live + ridden per day, the 7 days from weekFrom (date strip)
    public Dictionary<string, int> Week { get; set; } = new();
}


//===============================================================
// Active test rides (the Sales Enquiries list's Test Rides view) :
// live rides (Booked / Confirmed) of every date, and the ride
// requests not booked yet : open enquiries with a test ride date
// asked (website test ride requests included)
//===============================================================

public class ActiveTestRideDto
{
    // Ride / Request
    public string Kind { get; set; } = string.Empty;

    // 0 for a request
    public long SalesTestRideId { get; set; }

    public long SalesEnquiryId { get; set; }

    public string EnquiryNo { get; set; } = string.Empty;

    // The ride date / the asked date
    public DateOnly Date { get; set; }

    // "HH:mm" ('' for a request)
    public string SlotStart { get; set; } = string.Empty;

    public string SlotEnd { get; set; } = string.Empty;

    // A request : the time asked ("Morning", "10:30 AM")
    public string AskedSlot { get; set; } = string.Empty;

    // Booked / Confirmed / Requested
    public string Status { get; set; } = string.Empty;

    public string SourceName { get; set; } = string.Empty;

    public bool FromWebsite { get; set; }

    public string EnquirerName { get; set; } = string.Empty;

    public string EnquirerMobile { get; set; } = string.Empty;

    // The bike to ride (the enquiry's model for a request)
    public string ModelName { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string InterestLevelName { get; set; } = string.Empty;

    public string InterestLevelColor { get; set; } = string.Empty;

    // The executive of the ride / of the enquiry
    public string AdvisorName { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    public int RescheduleCount { get; set; }
}


//===============================================================
// Book / reschedule / change status
//===============================================================

public class BookTestRideDto
{
    public long SalesEnquiryId { get; set; }

    public long BranchId { get; set; }

    public DateOnly RideDate { get; set; }

    // "HH:mm" : the start of a slot of the day
    public string SlotStart { get; set; } = string.Empty;

    // The enquiry's model or second model (0 = the model)
    public long ModelId { get; set; }

    // 0 = the user who books
    public long AdvisorUserId { get; set; }

    public string Note { get; set; } = string.Empty;

    // Book into a full slot (after a warning)
    public bool AllowOverbook { get; set; }
}


public class RescheduleTestRideDto
{
    public long SalesTestRideId { get; set; }

    public DateOnly RideDate { get; set; }

    public string SlotStart { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    public bool AllowOverbook { get; set; }
}


public class TestRideStatusDto
{
    public long SalesTestRideId { get; set; }

    // Confirmed / Ridden / NoShow / Cancelled
    public string Status { get; set; } = string.Empty;

    // Required for Cancelled
    public string Reason { get; set; } = string.Empty;
}
