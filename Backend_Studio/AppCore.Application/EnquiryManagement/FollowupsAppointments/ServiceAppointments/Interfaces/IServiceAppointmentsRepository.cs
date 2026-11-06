//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.FollowUpsAppointments;


//===============================================================
// Service Appointments Repository (Follow-ups & Appointments ›
// Service Appointments page : list + form)
//
// The bookings themselves stay with the Service Enquiries
// repository (the board and the enquiry pages use the same rules);
// this repository is the page's view of them.
//
// Rules broken → InvalidOperationException (400 / 409), missing
// row → KeyNotFoundException (404).
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06).
//===============================================================

public interface IServiceAppointmentsRepository
{
    // One list page + the status counts
    Task<PagedResult<ServiceAppointmentDto>> GetPagedAsync(
        ServiceAppointmentsPageRequest request);

    // Slots, waiting enquiries and advisors of a day (the form)
    Task<ServiceAppointmentsDefaultsDto> GetDefaultsAsync(
        DateOnly date,
        long branchId);

    // Internal id of a live row (null when missing or deleted)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);

    Task<ServiceAppointmentDto?> GetByIdAsync(
        long id);

    // Books it; answers the new appointment's PublicId
    Task<Guid> CreateAsync(
        CreateServiceAppointmentsDto dto,
        long userId);

    Task UpdateAsync(
        long id,
        UpdateServiceAppointmentsDto dto,
        long userId);

    // Closed appointments only (a live one is cancelled first)
    Task DeleteAsync(
        long id,
        long userId);

    // The most recently deleted appointment; false when none
    Task<bool> RestoreAsync(
        long userId);
}
