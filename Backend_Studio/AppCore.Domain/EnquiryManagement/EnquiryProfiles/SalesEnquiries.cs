//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Sales Enquiries
//
// A motor bike sales lead. Enquiry No ENQ-SAL-MM-YYYY-00001
// (CodeGenerator.GenerateEnquiryNo; one series per month for all
// branches). The enquirer is the person who contacted us (kept in
// EnquiryContacts by mobile); he may not be the buyer.
//
// "No enquiry, no sale" : every bike sale will link to one sales
// enquiry and mature it (status of the Won stage, sale no / date,
// the Customer Profile of the real buyer). Won never comes from
// this page.
//
// Table made by SalesEnquiries_Tables.sql (replaces the Code Sync
// baseline table).
//===============================================================

public class SalesEnquiries
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long SalesEnquiryId { get; set; }


    //===========================================================
    // Public Id (uuid v7) : the id used in links and the address
    // bar; the internal id stays inside the server
    //===========================================================

    public Guid PublicId { get; set; } = Guid.CreateVersion7();


    //===========================================================
    // Number : ENQ-SAL-MM-YYYY-nnnnn
    //===========================================================

    public string EnquiryNo { get; set; } = string.Empty;

    public int EnquiryYear { get; set; }

    public int EnquiryMonth { get; set; }

    // Sequence inside the month (deleted rows keep theirs)
    public int SequenceNo { get; set; }


    //===========================================================
    // Enquiry Information
    //===========================================================

    public DateOnly EnquiryDate { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // Enquiry Setup rows (no database foreign keys)
    public long SourceId { get; set; }

    public long StatusId { get; set; }

    public long? InterestLevelId { get; set; }

    // User Profile
    public long ExecutiveUserId { get; set; }

    public string ExecutiveName { get; set; } = string.Empty;


    //===========================================================
    // Enquirer (the person who contacted us)
    //===========================================================

    public long EnquiryContactId { get; set; }

    public string EnquirerMobile { get; set; } = string.Empty;

    public string EnquirerName { get; set; } = string.Empty;

    // Self / Referrer
    public string EnquiryFor { get; set; } = "Self";


    //===========================================================
    // Interest : bike model = Product Sub Category of a Motor
    // Bikes category (no colour)
    //===========================================================

    public long ModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public long? SecondModelId { get; set; }

    public string SecondModelName { get; set; } = string.Empty;

    public int Quantity { get; set; } = 1;

    public decimal Budget { get; set; }

    // Cash / EMI / Exchange
    public string PaymentMode { get; set; } = "Cash";

    public string ExchangeBike { get; set; } = string.Empty;

    public DateOnly? ExpectedPurchaseDate { get; set; }

    // Colour the enquirer prefers (text only; optional)
    public string PreferredColor { get; set; } = string.Empty;

    // Sent from the public website's Enquire form
    public bool FromWebsite { get; set; }

    // Test ride asked for (website) : date and slot (Morning /
    // Afternoon / Evening). The Test Rides page will book it.
    public DateOnly? TestRideDate { get; set; }

    public string TestRideSlot { get; set; } = string.Empty;


    //===========================================================
    // Follow-up
    //===========================================================

    public DateOnly? NextFollowUpDate { get; set; }

    public long? FollowUpMethodId { get; set; }

    // Filled by Sales Follow-ups (later)
    public DateOnly? LastFollowUpDate { get; set; }

    public string LastFollowUpNote { get; set; } = string.Empty;

    // Lost stage only
    public long? LostReasonId { get; set; }

    public DateOnly? ClosedDate { get; set; }

    public string Remarks { get; set; } = string.Empty;


    //===========================================================
    // Maturity (written by the Sales module later)
    //===========================================================

    public bool IsMatured { get; set; }

    public DateOnly? MaturedDate { get; set; }

    public long? SaleId { get; set; }

    public string SaleNo { get; set; } = string.Empty;

    public long? CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;


    //===========================================================
    // Soft Delete / Audit
    //===========================================================

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
