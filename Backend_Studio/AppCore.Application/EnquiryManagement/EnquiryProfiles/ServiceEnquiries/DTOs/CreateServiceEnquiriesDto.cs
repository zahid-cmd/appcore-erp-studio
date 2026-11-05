//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Create Service Enquiry DTO (number set by the server)
//===============================================================

public class CreateServiceEnquiriesDto
{
    public DateOnly EnquiryDate { get; set; }

    public long BranchId { get; set; }

    // Service / Parts
    public string EnquiryType { get; set; } = "Service";

    public long SourceId { get; set; }

    public long StatusId { get; set; }

    public long ExecutiveUserId { get; set; }


    // Enquirer
    public string EnquirerMobile { get; set; } = string.Empty;

    public string EnquirerName { get; set; } = string.Empty;

    public string AltPhone { get; set; } = string.Empty;

    public long? LocationId { get; set; }

    public string Address { get; set; } = string.Empty;


    // Bike (model required for Service)
    public long? ModelId { get; set; }

    public string RegistrationNo { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public int? KmReading { get; set; }


    // Request
    public string Complaint { get; set; } = string.Empty;

    public DateOnly? PreferredDate { get; set; }

    public string PreferredSlot { get; set; } = string.Empty;

    public bool PickupDrop { get; set; }

    public List<ServiceEnquiryLineDto> Lines { get; set; } = new();


    // Follow-up
    public DateOnly? NextFollowUpDate { get; set; }

    public long? FollowUpMethodId { get; set; }

    // Required for a Suspended (Lost-stage) status
    public long? LostReasonId { get; set; }

    public string Remarks { get; set; } = string.Empty;
}
