//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Update Sales Enquiry DTO (number, date month and branch are
// locked after saving; a matured enquiry cannot be changed)
//===============================================================

public class UpdateSalesEnquiriesDto
    : CreateSalesEnquiriesDto
{
    public long SalesEnquiryId { get; set; }
}
