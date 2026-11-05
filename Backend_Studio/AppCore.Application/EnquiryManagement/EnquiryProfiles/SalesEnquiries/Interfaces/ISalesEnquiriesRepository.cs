//===============================================================
// Namespace
//===============================================================

using AppCore.Application.Public.Website;

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Sales Enquiries Repository Interface
//
// Rules broken → InvalidOperationException (400 / 409),
// missing row → KeyNotFoundException (404).
//===============================================================

public interface ISalesEnquiriesRepository
{
    Task<List<SalesEnquiriesDto>> GetAllAsync();


    // One list page with the tab / chip counts
    Task<SalesEnquiryPagedResult> GetPagedAsync(
        SalesEnquiryPageRequest request);


    // Internal id of a live row (null when missing or deleted)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);


    Task<SalesEnquiriesDto?> GetByIdAsync(
        long id);


    // Next number for the date's month + every dropdown
    Task<SalesEnquiriesDefaultsDto> GetDefaultsAsync(
        DateOnly? enquiryDate);


    // Known enquirer, matching customer and earlier enquiries
    Task<EnquirerLookupDto> LookupEnquirerAsync(
        string mobile,
        long excludeEnquiryId);


    Task<long> CreateAsync(
        CreateSalesEnquiriesDto dto,
        long userId);


    Task UpdateAsync(
        UpdateSalesEnquiriesDto dto,
        long userId);


    Task DeleteAsync(
        long id,
        long userId);


    // The most recently deleted enquiry; false when none
    Task<bool> RestoreAsync(
        long userId);


    //===========================================================
    // Public website (anonymous)
    //===========================================================

    // Locations and showrooms for the website's Enquire form
    Task<PublicEnquiryOptionsDto> GetWebsiteOptionsAsync();


    // New sales enquiry from the website (unassigned), or a note
    // on the mobile's open enquiry
    Task<PublicEnquiryResultDto> CreateFromWebsiteAsync(
        PublicEnquiryRequestDto dto);

    // Website sends allowed per hour from one address (switch
    // CFG-MOD-010-0041; null = no hourly limit)
    Task<int?> WebsiteSendsPerHourAsync();



    //===========================================================
    // Sales Follow-ups (Follow-ups & Appointments)
    //===========================================================

    // Calls / visits logged on one enquiry, newest first
    Task<List<SalesFollowUpDto>> GetFollowUpsAsync(
        long salesEnquiryId);

    // Calls / visits logged from a date (all enquiries), newest first
    Task<List<SalesFollowUpDto>> GetRecentFollowUpsAsync(
        DateOnly fromDate);

    // Logs a call / visit and updates the enquiry
    Task<long> LogFollowUpAsync(
        LogSalesFollowUpDto dto,
        long userId);



    //===========================================================
    // Test Rides (Sales Enquiries · Test Rides page)
    //===========================================================

    // The day board : slots of the default Test Ride time slot, the
    // day's rides, the waiting list and the week strip
    Task<TestRideDayDto> GetTestRideDayAsync(
        DateOnly date,
        long branchId,
        DateOnly? weekFrom = null);

    // Live rides of every date + ride requests not booked yet
    Task<List<ActiveTestRideDto>> GetActiveTestRidesAsync(
        long branchId);

    // Booked / Confirmed / Ridden on a day
    Task<int> CountTestRidesAsync(
        DateOnly date,
        long branchId);

    Task<List<SalesTestRideDto>> GetEnquiryTestRidesAsync(
        long salesEnquiryId);

    Task<long> BookTestRideAsync(
        BookTestRideDto dto,
        long userId);

    Task RescheduleTestRideAsync(
        RescheduleTestRideDto dto,
        long userId);

    Task SetTestRideStatusAsync(
        TestRideStatusDto dto,
        long userId);

    // Website : free ride times of a day at a showroom
    Task<PublicRideSlotsDto> GetWebsiteRideSlotsAsync(
        DateOnly date,
        string? branchCode);
}
