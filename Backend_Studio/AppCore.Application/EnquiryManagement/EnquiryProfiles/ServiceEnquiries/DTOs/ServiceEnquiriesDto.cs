//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Service Enquiry DTO (read : list and form)
//===============================================================

public class ServiceEnquiriesDto
{
    public long ServiceEnquiryId { get; set; }

    // uuid v7 : links and the address bar
    public Guid PublicId { get; set; }

    // ENQ-SER-MM-YYYY-nnnnn
    public string EnquiryNo { get; set; } = string.Empty;

    public DateOnly EnquiryDate { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    // Service / Parts
    public string EnquiryType { get; set; } = "Service";

    public long SourceId { get; set; }

    public string SourceName { get; set; } = string.Empty;

    public long StatusId { get; set; }

    public string StatusName { get; set; } = string.Empty;

    public string StatusColor { get; set; } = string.Empty;

    public string StatusStage { get; set; } = string.Empty;

    // 0 = unassigned (website)
    public long ExecutiveUserId { get; set; }

    public string ExecutiveName { get; set; } = string.Empty;


    // Enquirer
    public long EnquiryContactId { get; set; }

    public string EnquirerMobile { get; set; } = string.Empty;

    public string EnquirerName { get; set; } = string.Empty;

    public string AltPhone { get; set; } = string.Empty;

    public long? LocationId { get; set; }

    public string LocationName { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;


    // Bike
    public long? ModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public long? BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public string RegistrationNo { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public int? KmReading { get; set; }


    // Request
    public string Complaint { get; set; } = string.Empty;

    public DateOnly? PreferredDate { get; set; }

    public string PreferredSlot { get; set; } = string.Empty;

    public bool PickupDrop { get; set; }

    public decimal EstimatedTotal { get; set; }

    public List<ServiceEnquiryLineDto> Lines { get; set; } = new();

    // List text, e.g. "1st Free Service - Revoo + 2 more"
    public string RequestSummary { get; set; } = string.Empty;


    // Follow-up
    public DateOnly? NextFollowUpDate { get; set; }

    public long? FollowUpMethodId { get; set; }

    public string FollowUpMethodName { get; set; } = string.Empty;

    public DateOnly? LastFollowUpDate { get; set; }

    public string LastFollowUpNote { get; set; } = string.Empty;

    public long? LostReasonId { get; set; }

    public string LostReasonName { get; set; } = string.Empty;

    public DateOnly? ClosedDate { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool FromWebsite { get; set; }

    // Raised by a sold bike's service schedule
    public long? ServiceVehicleScheduleId { get; set; }


    // Converted
    public bool IsConverted { get; set; }

    public DateOnly? ConvertedDate { get; set; }

    public string ConvertedDocType { get; set; } = string.Empty;

    public string ConvertedDocNo { get; set; } = string.Empty;


    public DateTime CreatedDate { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// One line (read and write)
//===============================================================

public class ServiceEnquiryLineDto
{
    // Service / Part
    public string LineType { get; set; } = "Service";

    // Scheduled / LaborChart / Customized / Membership / Other
    // SparePart / Accessory / Other
    public string ItemKind { get; set; } = "Other";

    public long? ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public decimal Quantity { get; set; } = 1;

    public decimal Rate { get; set; }

    public decimal Amount { get; set; }

    public string Note { get; set; } = string.Empty;
}
