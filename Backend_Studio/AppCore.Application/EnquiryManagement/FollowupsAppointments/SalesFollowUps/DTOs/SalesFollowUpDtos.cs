//===============================================================
// Namespace (with the sales enquiry contracts : one repository)
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Sales Follow-ups : a call / visit logged on a sales enquiry
//===============================================================

public class SalesFollowUpDto
{
    public long SalesFollowUpId { get; set; }

    public long SalesEnquiryId { get; set; }

    public string EnquiryNo { get; set; } = string.Empty;

    public string EnquirerName { get; set; } = string.Empty;

    public string EnquirerMobile { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

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

    public string InterestFromName { get; set; } = string.Empty;

    public string InterestToName { get; set; } = string.Empty;

    public DateOnly? ExpectedPurchaseFrom { get; set; }

    public DateOnly? ExpectedPurchaseTo { get; set; }

    public string LostReasonName { get; set; } = string.Empty;

    public long ExecutiveUserId { get; set; }

    public string ExecutiveName { get; set; } = string.Empty;
}


// Log a call / visit (Add)
public class LogSalesFollowUpDto
{
    public long SalesEnquiryId { get; set; }

    // Who made the call (User Profile); also becomes the enquiry's
    // executive when it has none (website enquiries)
    public long ExecutiveUserId { get; set; }

    public long? MethodId { get; set; }

    public string Outcome { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    // Required unless the enquiry is suspended
    public DateOnly? NextFollowUpDate { get; set; }

    // Open-stage status, or a Lost-stage one (Suspended) with a reason
    public long StatusId { get; set; }

    public long? InterestLevelId { get; set; }

    public DateOnly? ExpectedPurchaseDate { get; set; }

    public long? LostReasonId { get; set; }
}
