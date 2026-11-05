//===============================================================
// Namespace (with the service enquiry contracts : one repository)
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Service Follow-ups : a call / visit logged on a service enquiry
//===============================================================

public class ServiceFollowUpDto
{
    public long ServiceFollowUpId { get; set; }

    public long ServiceEnquiryId { get; set; }

    public string EnquiryNo { get; set; } = string.Empty;

    public string EnquirerName { get; set; } = string.Empty;

    public string EnquirerMobile { get; set; } = string.Empty;

    public string EnquiryType { get; set; } = string.Empty;

    public DateTime FollowUpAt { get; set; }

    public DateOnly FollowUpDate { get; set; }

    public long? MethodId { get; set; }

    public string MethodName { get; set; } = string.Empty;

    public string Outcome { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    public DateOnly? NextFollowUpDate { get; set; }

    public string StatusFromName { get; set; } = string.Empty;

    public string StatusToName { get; set; } = string.Empty;

    public string StatusToStage { get; set; } = string.Empty;

    public DateOnly? PreferredDateFrom { get; set; }

    public DateOnly? PreferredDateTo { get; set; }

    public string LostReasonName { get; set; } = string.Empty;

    public long ExecutiveUserId { get; set; }

    public string ExecutiveName { get; set; } = string.Empty;
}


// Log a call / visit
public class LogServiceFollowUpDto
{
    public long ServiceEnquiryId { get; set; }

    public long ExecutiveUserId { get; set; }

    public long? MethodId { get; set; }

    public string Outcome { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    // Required unless the enquiry is suspended
    public DateOnly? NextFollowUpDate { get; set; }

    // Open-stage status, or a Lost-stage one (Suspended) with a reason
    public long StatusId { get; set; }

    // The visit date agreed (service enquiries); null = kept
    public DateOnly? PreferredDate { get; set; }

    public long? LostReasonId { get; set; }
}
