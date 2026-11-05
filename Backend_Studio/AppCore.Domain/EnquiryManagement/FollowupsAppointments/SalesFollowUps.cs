//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments;


//===============================================================
// Sales Follow-ups : one row per call / visit logged on a sales
// enquiry (Follow-ups & Appointments › Sales Follow-ups)
//
// A log entry : what was done (method, outcome, note), who and
// when, and what it changed on the enquiry (status, interest,
// expected purchase date, next follow-up, suspend reason). The
// enquiry itself carries the latest values.
//===============================================================

public class SalesFollowUps
{
    public long SalesFollowUpId { get; set; }

    public long SalesEnquiryId { get; set; }

    public string EnquiryNo { get; set; } = string.Empty;

    // When the call was made / logged
    public DateTime FollowUpAt { get; set; }

    public DateOnly FollowUpDate { get; set; }

    public long? MethodId { get; set; }

    public string MethodName { get; set; } = string.Empty;

    // Reached / No answer / Call back later / Visited / Not interested
    public string Outcome { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    public DateOnly? NextFollowUpDate { get; set; }

    public long? StatusFromId { get; set; }

    public string StatusFromName { get; set; } = string.Empty;

    public long StatusToId { get; set; }

    public string StatusToName { get; set; } = string.Empty;

    public string StatusToStage { get; set; } = string.Empty;

    public long? InterestFromId { get; set; }

    public string InterestFromName { get; set; } = string.Empty;

    public long? InterestToId { get; set; }

    public string InterestToName { get; set; } = string.Empty;

    public DateOnly? ExpectedPurchaseFrom { get; set; }

    public DateOnly? ExpectedPurchaseTo { get; set; }

    public long? LostReasonId { get; set; }

    public string LostReasonName { get; set; } = string.Empty;

    // Who made the call (User Profile)
    public long ExecutiveUserId { get; set; }

    public string ExecutiveName { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}
