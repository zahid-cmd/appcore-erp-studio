//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments;


//===============================================================
// Service Follow-ups : one row per call / visit logged on a
// service enquiry (from the Service Enquiries list / form)
//
// What was done (method, outcome, note), who and when, and what
// it changed on the enquiry (status, preferred visit date, next
// follow-up, suspend reason). The enquiry keeps the latest values.
//===============================================================

public class ServiceFollowUps
{
    public long ServiceFollowUpId { get; set; }

    public long ServiceEnquiryId { get; set; }

    public string EnquiryNo { get; set; } = string.Empty;

    public DateTime FollowUpAt { get; set; }

    public DateOnly FollowUpDate { get; set; }

    public long? MethodId { get; set; }

    public string MethodName { get; set; } = string.Empty;

    // Reached / No answer / Call back later / Visit booked / Not interested
    public string Outcome { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    public DateOnly? NextFollowUpDate { get; set; }

    public long? StatusFromId { get; set; }

    public string StatusFromName { get; set; } = string.Empty;

    public long StatusToId { get; set; }

    public string StatusToName { get; set; } = string.Empty;

    public string StatusToStage { get; set; } = string.Empty;

    public DateOnly? PreferredDateFrom { get; set; }

    public DateOnly? PreferredDateTo { get; set; }

    public long? LostReasonId { get; set; }

    public string LostReasonName { get; set; } = string.Empty;

    public long ExecutiveUserId { get; set; }

    public string ExecutiveName { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}
