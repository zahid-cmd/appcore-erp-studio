//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Service Appointments : statuses
//===============================================================

public static class ServiceAppointmentStatuses
{
    public const string Booked = "Booked";

    public const string Confirmed = "Confirmed";

    public const string Arrived = "Arrived";

    public const string NoShow = "NoShow";

    public const string Cancelled = "Cancelled";

    // Live : holds the slot and blocks a second booking
    public static bool IsLive(string status) =>
        status == Booked || status == Confirmed;

    public static string Label(string status) =>
        status == NoShow ? "No-show" : status;
}


//===============================================================
// One appointment (with what the board needs of its enquiry)
//===============================================================

public class ServiceAppointmentDto
{
    public long ServiceAppointmentId { get; set; }

    public long ServiceEnquiryId { get; set; }

    public string EnquiryNo { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public DateOnly AppointmentDate { get; set; }

    // "HH:mm"
    public string SlotStart { get; set; } = string.Empty;

    public string SlotEnd { get; set; } = string.Empty;

    public long? TimeSlotId { get; set; }

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

    public string ModelName { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string RegistrationNo { get; set; } = string.Empty;

    public string RequestSummary { get; set; } = string.Empty;

    public string EnquiryStatusName { get; set; } = string.Empty;

    public string EnquiryStatusColor { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }
}


//===============================================================
// An open Service enquiry with no live appointment (waiting list)
//===============================================================

public class AppointmentWaitingDto
{
    public long ServiceEnquiryId { get; set; }

    public string EnquiryNo { get; set; } = string.Empty;

    public DateOnly EnquiryDate { get; set; }

    public string EnquirerName { get; set; } = string.Empty;

    public string EnquirerMobile { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string RequestSummary { get; set; } = string.Empty;

    public DateOnly? PreferredDate { get; set; }

    public string SourceName { get; set; } = string.Empty;

    public bool FromWebsite { get; set; }

    // Raised by a sold bike's service schedule
    public bool FromSchedule { get; set; }

    public string StatusName { get; set; } = string.Empty;

    public string StatusColor { get; set; } = string.Empty;

    public long ExecutiveUserId { get; set; }

    public string ExecutiveName { get; set; } = string.Empty;

    // Last appointment was a No-show / Cancelled
    public string LastAppointment { get; set; } = string.Empty;
}


//===============================================================
// One slot of the day
//===============================================================

public class AppointmentSlotDto
{
    // "HH:mm"
    public string Start { get; set; } = string.Empty;

    public string End { get; set; } = string.Empty;

    // Live + arrived appointments in the slot
    public int Booked { get; set; }

    // Bookings the slot can take (the time slot's setting)
    public int Capacity { get; set; }

    public bool Full { get; set; }
}


//===============================================================
// The day board
//===============================================================

public class AppointmentDayDto
{
    public DateOnly Date { get; set; }

    public long BranchId { get; set; }

    // The default Service Appointment time slot ('' = none set)
    public long? TimeSlotId { get; set; }

    public string TimeSlotName { get; set; } = string.Empty;

    public int IntervalMinutes { get; set; }

    // Bookings per slot
    public int Capacity { get; set; }

    public string TimeFrom { get; set; } = string.Empty;

    public string TimeTo { get; set; } = string.Empty;

    public string BreakFrom { get; set; } = string.Empty;

    public string BreakTo { get; set; } = string.Empty;

    // Why nothing can be booked ('' = fine)
    public string Message { get; set; } = string.Empty;

    // Switch : a full slot may be overbooked after a warning
    public bool AllowOverbook { get; set; } = true;

    public List<AppointmentSlotDto> Slots { get; set; } = new();

    public List<ServiceAppointmentDto> Appointments { get; set; } = new();

    public List<AppointmentWaitingDto> Waiting { get; set; } = new();

    // Per status, this day
    public Dictionary<string, int> Counts { get; set; } = new();

    // Live + arrived per day, the 7 days from Date (date strip)
    public Dictionary<string, int> Week { get; set; } = new();
}


//===============================================================
// Active appointments (the Service Enquiries list's Appointments
// view) : live appointments (Booked / Confirmed) of every date,
// and the visit requests not booked yet : open Service enquiries
// with an asked date (website "Book a service" included)
//===============================================================

public class ActiveAppointmentDto
{
    // Appointment / Request
    public string Kind { get; set; } = string.Empty;

    // 0 for a request
    public long ServiceAppointmentId { get; set; }

    public long ServiceEnquiryId { get; set; }

    public string EnquiryNo { get; set; } = string.Empty;

    // The appointment date / the asked date
    public DateOnly Date { get; set; }

    // "HH:mm" ('' for a request)
    public string SlotStart { get; set; } = string.Empty;

    public string SlotEnd { get; set; } = string.Empty;

    // Booked / Confirmed / Requested
    public string Status { get; set; } = string.Empty;

    public string SourceName { get; set; } = string.Empty;

    public bool FromWebsite { get; set; }

    public bool FromSchedule { get; set; }

    public string EnquirerName { get; set; } = string.Empty;

    public string EnquirerMobile { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string RequestSummary { get; set; } = string.Empty;

    // The advisor (appointment) / the executive (request)
    public string AdvisorName { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    public int RescheduleCount { get; set; }
}


//===============================================================
// Book / reschedule / change status
//===============================================================

public class BookServiceAppointmentDto
{
    public long ServiceEnquiryId { get; set; }

    public long BranchId { get; set; }

    public DateOnly AppointmentDate { get; set; }

    // "HH:mm" : the start of a slot of the day
    public string SlotStart { get; set; } = string.Empty;

    // 0 = the user who books
    public long AdvisorUserId { get; set; }

    public string Note { get; set; } = string.Empty;

    // Book a full slot anyway (asked on the board after a warning)
    public bool AllowOverbook { get; set; }
}


public class RescheduleServiceAppointmentDto
{
    public long ServiceAppointmentId { get; set; }

    public DateOnly AppointmentDate { get; set; }

    public string SlotStart { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    public bool AllowOverbook { get; set; }
}


public class ServiceAppointmentStatusDto
{
    public long ServiceAppointmentId { get; set; }

    // Confirmed / Arrived / NoShow / Cancelled
    public string Status { get; set; } = string.Empty;

    // Required for Cancelled
    public string Reason { get; set; } = string.Empty;
}
