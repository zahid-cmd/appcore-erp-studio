//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Update Service Enquiry DTO (number / branch locked)
//===============================================================

public class UpdateServiceEnquiriesDto
    : CreateServiceEnquiriesDto
{
    public long ServiceEnquiryId { get; set; }
}
