//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Application.EnquiryManagement.FollowUpsAppointments;


//===============================================================
// Namespace (as registered by Code Synchronization)
//===============================================================

namespace AppCore.Infrastructure.Configurations.EnquiryManagement.FollowUpsAppointments;


//===============================================================
// Test Rides Repository (Follow-ups & Appointments ›
// Test Rides page)
//
// The page's list and form over the test rides the Sales
// Enquiries repository books : every rule (one live ride per
// enquiry, slots, capacity, booking window, the enquiry's ride
// date / time and call history) stays in one place,
// SalesEnquiriesRepository.TestRides.cs / .TestRidesCrud.cs.
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06). Never
// run Code Synchronization or its rollback again for the Test
// Rides submenu.
//===============================================================

public class TestRidesRepository
    : ITestRidesRepository
{
    private readonly ISalesEnquiriesRepository _enquiries;


    public TestRidesRepository
    (
        ISalesEnquiriesRepository enquiries
    )
    {
        _enquiries = enquiries;
    }


    public Task<PagedResult<SalesTestRideDto>> GetPagedAsync
    (
        TestRidesPageRequest request
    )
    {
        return _enquiries.GetTestRidePageAsync(request);
    }


    public async Task<TestRidesDefaultsDto> GetDefaultsAsync
    (
        DateOnly date,
        long branchId
    )
    {
        TestRideDayDto day =
            await _enquiries.GetTestRideDayAsync(date, branchId);

        SalesEnquiriesDefaultsDto defaults =
            await _enquiries.GetDefaultsAsync(null);

        return new TestRidesDefaultsDto
        {
            Date = day.Date,
            BranchId = day.BranchId,
            TimeSlotName = day.TimeSlotName,
            Capacity = day.Capacity,
            AllowOverbook = day.AllowOverbook,
            Message = day.Message,
            Slots = day.Slots,
            Waiting = day.Waiting,
            Advisors = defaults.Executives
        };
    }


    public Task<long?> GetIdByPublicIdAsync
    (
        Guid publicId
    )
    {
        return _enquiries.GetTestRideIdByPublicIdAsync(publicId);
    }


    public Task<SalesTestRideDto?> GetByIdAsync
    (
        long id
    )
    {
        return _enquiries.GetTestRideAsync(id);
    }


    public async Task<Guid> CreateAsync
    (
        CreateTestRidesDto dto,
        long userId
    )
    {
        long id =
            await _enquiries.BookTestRideAsync(dto, userId);

        SalesTestRideDto? saved =
            await _enquiries.GetTestRideAsync(id);

        return saved?.PublicId ?? Guid.Empty;
    }


    public Task UpdateAsync
    (
        long id,
        UpdateTestRidesDto dto,
        long userId
    )
    {
        return _enquiries.UpdateTestRideAsync(id, dto, userId);
    }


    public Task DeleteAsync
    (
        long id,
        long userId
    )
    {
        return _enquiries.DeleteTestRideAsync(id, userId);
    }


    public Task<bool> RestoreAsync
    (
        long userId
    )
    {
        return _enquiries.RestoreTestRideAsync(userId);
    }
}
