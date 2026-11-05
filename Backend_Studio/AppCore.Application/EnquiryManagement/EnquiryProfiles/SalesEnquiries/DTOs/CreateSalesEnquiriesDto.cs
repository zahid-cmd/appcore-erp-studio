//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Create Sales Enquiry DTO
//
// Enquiry No is always built by the server on the first save.
// The enquirer is found (or added) by mobile.
//===============================================================

public class CreateSalesEnquiriesDto
{
    //===========================================================
    // Enquiry Information
    //===========================================================

    public DateOnly EnquiryDate { get; set; }

    public long BranchId { get; set; }

    public long SourceId { get; set; }

    public long StatusId { get; set; }

    public long? InterestLevelId { get; set; }

    public long ExecutiveUserId { get; set; }


    //===========================================================
    // Enquirer
    //===========================================================

    public string EnquirerMobile { get; set; } = string.Empty;

    public string EnquirerName { get; set; } = string.Empty;

    public string AltPhone { get; set; } = string.Empty;

    public long? LocationId { get; set; }

    public string Address { get; set; } = string.Empty;

    // Self / Referrer
    public string EnquiryFor { get; set; } = "Self";


    //===========================================================
    // Interest
    //===========================================================

    public long ModelId { get; set; }

    public long? SecondModelId { get; set; }

    public int Quantity { get; set; } = 1;

    public decimal Budget { get; set; }

    // Cash / EMI / Exchange
    public string PaymentMode { get; set; } = "Cash";

    public string ExchangeBike { get; set; } = string.Empty;

    public DateOnly? ExpectedPurchaseDate { get; set; }

    // Optional, text only (max 50)
    public string PreferredColor { get; set; } = string.Empty;


    //===========================================================
    // Follow-up
    //===========================================================

    public DateOnly? NextFollowUpDate { get; set; }

    public long? FollowUpMethodId { get; set; }

    // Required when the status is of the Lost stage
    public long? LostReasonId { get; set; }

    public string Remarks { get; set; } = string.Empty;
}
