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
// Test Rides Repository (Follow-ups & Appointments ›
// Test Rides page : list + form)
//
// The bookings themselves stay with the Sales Enquiries
// repository (the board and the enquiry pages use the same rules);
// this repository is the page's view of them.
//
// Rules broken → InvalidOperationException (400 / 409), missing
// row → KeyNotFoundException (404).
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06).
//===============================================================

public interface ITestRidesRepository
{
    // One list page + the status counts
    Task<PagedResult<SalesTestRideDto>> GetPagedAsync(
        TestRidesPageRequest request);

    // Slots, waiting enquiries and sales executives of a day (the form)
    Task<TestRidesDefaultsDto> GetDefaultsAsync(
        DateOnly date,
        long branchId);

    // Internal id of a live row (null when missing or deleted)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);

    Task<SalesTestRideDto?> GetByIdAsync(
        long id);

    // Books it; answers the new test ride's PublicId
    Task<Guid> CreateAsync(
        CreateTestRidesDto dto,
        long userId);

    Task UpdateAsync(
        long id,
        UpdateTestRidesDto dto,
        long userId);

    // Closed test rides only (a live one is cancelled first)
    Task DeleteAsync(
        long id,
        long userId);

    // The most recently deleted test ride; false when none
    Task<bool> RestoreAsync(
        long userId);
}
