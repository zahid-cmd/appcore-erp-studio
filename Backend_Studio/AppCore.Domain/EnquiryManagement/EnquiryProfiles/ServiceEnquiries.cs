//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Service Enquiries
//
// Service and spare parts enquiries on one page :
//   EnquiryType Service : the bike (model, registration, chassis,
//                          km), what it needs (service lines from
//                          Service Settings and / or a complaint),
//                          preferred date + slot, pick-up / drop.
//   EnquiryType Parts   : part lines from the Spare Parts /
//                          Accessories catalogue (or typed).
// Number ENQ-SER-MM-YYYY-nnnnn (CodeGenerator.GenerateEnquiryNo,
// own series, reset every month). Enquirer from EnquiryContacts
// (shared with Sales Enquiries).
//
// Closed (Converted) when the service is taken (job card closed
// or billed) or the parts counter sale is completed — set by
// those pages when they are built.
//
// Table made by ServiceEnquiries_Tables.sql (replaces the Code
// Synchronization sample table).
//===============================================================

public class ServiceEnquiries
{
    public long ServiceEnquiryId { get; set; }


    //===========================================================
    // Public Id (uuid v7) : the id used in links and the address
    // bar; the internal id stays inside the server
    //===========================================================

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    // ENQ-SER-MM-YYYY-nnnnn
    public string EnquiryNo { get; set; } = string.Empty;

    public int EnquiryYear { get; set; }

    public int EnquiryMonth { get; set; }

    public int SequenceNo { get; set; }


    //===========================================================
    // Enquiry Information
    //===========================================================

    public DateOnly EnquiryDate { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // Service / Parts
    public string EnquiryType { get; set; } = "Service";

    public long SourceId { get; set; }

    public long StatusId { get; set; }

    // Service advisor (0 = unassigned : sent from the website)
    public long ExecutiveUserId { get; set; }

    public string ExecutiveName { get; set; } = string.Empty;


    //===========================================================
    // Enquirer (EnquiryContacts, by mobile)
    //===========================================================

    public long EnquiryContactId { get; set; }

    public string EnquirerMobile { get; set; } = string.Empty;

    public string EnquirerName { get; set; } = string.Empty;


    //===========================================================
    // The bike
    //===========================================================

    // Product Sub Category of a Motor Bikes category (no colour)
    public long? ModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public long? BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public string RegistrationNo { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public int? KmReading { get; set; }


    //===========================================================
    // The request
    //===========================================================

    public string Complaint { get; set; } = string.Empty;

    // Preferred service date + slot (Morning / Afternoon / Evening)
    public DateOnly? PreferredDate { get; set; }

    public string PreferredSlot { get; set; } = string.Empty;

    public bool PickupDrop { get; set; }

    // Sum of the lines (estimate only)
    public decimal EstimatedTotal { get; set; }


    //===========================================================
    // Follow-up
    //===========================================================

    public DateOnly? NextFollowUpDate { get; set; }

    public long? FollowUpMethodId { get; set; }

    public DateOnly? LastFollowUpDate { get; set; }

    public string LastFollowUpNote { get; set; } = string.Empty;

    public long? LostReasonId { get; set; }

    public DateOnly? ClosedDate { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool FromWebsite { get; set; }

    // Raised by a sold bike's service schedule (ServiceVehicleSchedules)
    public long? ServiceVehicleScheduleId { get; set; }


    //===========================================================
    // Converted (job card closed / billed, or counter sale)
    //===========================================================

    public bool IsConverted { get; set; }

    public DateOnly? ConvertedDate { get; set; }

    // JobCard / ServiceInvoice / CounterSale
    public string ConvertedDocType { get; set; } = string.Empty;

    public long? ConvertedDocId { get; set; }

    public string ConvertedDocNo { get; set; } = string.Empty;


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
