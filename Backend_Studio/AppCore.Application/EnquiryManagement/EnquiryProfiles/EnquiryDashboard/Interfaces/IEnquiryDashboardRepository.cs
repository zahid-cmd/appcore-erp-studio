//===============================================================
// Enquiry Dashboard repository (read only)
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


public interface IEnquiryDashboardRepository
{
    Task<EnquiryDashboardDto> GetAsync(
        EnquiryDashboardRequest request);
}
