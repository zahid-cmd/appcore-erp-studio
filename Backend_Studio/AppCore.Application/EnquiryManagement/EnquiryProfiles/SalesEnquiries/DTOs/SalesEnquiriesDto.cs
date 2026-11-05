//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Sales Enquiry DTO (read : list and form)
//===============================================================

public class SalesEnquiriesDto
{
    public long SalesEnquiryId { get; set; }

    // uuid v7 : links and the address bar
    public Guid PublicId { get; set; }

    // ENQ-SAL-MM-YYYY-nnnnn
    public string EnquiryNo { get; set; } = string.Empty;


    //===========================================================
    // Enquiry Information
    //===========================================================

    public DateOnly EnquiryDate { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long SourceId { get; set; }

    public string SourceName { get; set; } = string.Empty;

    public long StatusId { get; set; }

    public string StatusName { get; set; } = string.Empty;

    public string StatusColor { get; set; } = string.Empty;

    // Open / Won / Lost
    public string StatusStage { get; set; } = string.Empty;

    public long? InterestLevelId { get; set; }

    public string InterestLevelName { get; set; } = string.Empty;

    public string InterestLevelColor { get; set; } = string.Empty;

    // Interest level taken from the days left to the Expected
    // Purchase Date (open enquiries; refreshed every read)
    public bool InterestAuto { get; set; }

    // Expected Purchase Date − today (open enquiries; 0 when due
    // or past)
    public int? DaysToPurchase { get; set; }

    public long ExecutiveUserId { get; set; }

    public string ExecutiveName { get; set; } = string.Empty;


    //===========================================================
    // Enquirer
    //===========================================================

    public long EnquiryContactId { get; set; }

    public string EnquirerMobile { get; set; } = string.Empty;

    public string EnquirerName { get; set; } = string.Empty;

    public string AltPhone { get; set; } = string.Empty;

    public long? LocationId { get; set; }

    public string LocationName { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    // Self / Referrer
    public string EnquiryFor { get; set; } = "Self";


    //===========================================================
    // Interest
    //===========================================================

    public long ModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public long? SecondModelId { get; set; }

    public string SecondModelName { get; set; } = string.Empty;

    public int Quantity { get; set; }

    public decimal Budget { get; set; }

    public string PaymentMode { get; set; } = string.Empty;

    public string ExchangeBike { get; set; } = string.Empty;

    public DateOnly? ExpectedPurchaseDate { get; set; }

    public string PreferredColor { get; set; } = string.Empty;

    // Sent from the public website (unassigned until an ERP
    // user saves it : ExecutiveUserId 0)
    public bool FromWebsite { get; set; }

    // Test ride asked for on the website
    public DateOnly? TestRideDate { get; set; }

    public string TestRideSlot { get; set; } = string.Empty;


    //===========================================================
    // Follow-up
    //===========================================================

    public DateOnly? NextFollowUpDate { get; set; }

    public long? FollowUpMethodId { get; set; }

    public string FollowUpMethodName { get; set; } = string.Empty;

    public DateOnly? LastFollowUpDate { get; set; }

    public string LastFollowUpNote { get; set; } = string.Empty;

    public long? LostReasonId { get; set; }

    public string LostReasonName { get; set; } = string.Empty;

    public DateOnly? ClosedDate { get; set; }

    public string Remarks { get; set; } = string.Empty;


    //===========================================================
    // Maturity
    //===========================================================

    public bool IsMatured { get; set; }

    public DateOnly? MaturedDate { get; set; }

    public string SaleNo { get; set; } = string.Empty;

    public long? CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    // Sale date − enquiry date (matured only)
    public int? MaturityDays { get; set; }


    //===========================================================
    // Audit
    //===========================================================

    public DateTime CreatedDate { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
