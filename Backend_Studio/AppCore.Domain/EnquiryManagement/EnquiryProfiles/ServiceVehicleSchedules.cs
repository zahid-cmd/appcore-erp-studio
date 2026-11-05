//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Service Vehicle Schedules : one row per service position of
// the brand's Service Policy, for one sold bike
//
// DueDate = sale date + IntervalDays; after a service is taken
// the rest are counted again from that taken date. A date set
// by hand (DueDateEdited) is kept.
// Status (stored) : Upcoming · Enquired (a Service Enquiry was
// raised, ServiceEnquiryId) · Taken · Skipped.
// Shown as Upcoming / Due / Missed / Out of warranty on top of
// that, from today's date.
//===============================================================

public class ServiceVehicleSchedules
{
    public long ServiceVehicleScheduleId { get; set; }

    public long ServiceVehicleId { get; set; }

    public int SequenceNo { get; set; }

    // Free / Paid
    public string ServiceType { get; set; } = "Free";

    public string ServiceName { get; set; } = string.Empty;

    // Scheduled Services row of the policy (price, code)
    public long? ScheduledServiceId { get; set; }

    public int IntervalDays { get; set; }

    public int IntervalKm { get; set; }

    public int GraceDays { get; set; }

    public DateOnly DueDate { get; set; }

    public int DueKm { get; set; }

    // DueDate + GraceDays
    public DateOnly LastDate { get; set; }

    public bool DueDateEdited { get; set; }

    public string Status { get; set; } = "Upcoming";

    public long? ServiceEnquiryId { get; set; }

    public string EnquiryNo { get; set; } = string.Empty;

    public DateOnly? TakenDate { get; set; }

    public int? TakenKm { get; set; }

    // Job card / service invoice that took it (empty = entered by hand)
    public string TakenDocType { get; set; } = string.Empty;

    public string TakenDocNo { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
