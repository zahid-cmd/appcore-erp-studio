//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Public.Website;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Service Enquiries Repository Interface
//
// Rules broken → InvalidOperationException (400 / 409),
// missing row → KeyNotFoundException (404).
//===============================================================

public interface IServiceEnquiriesRepository
{
    Task<List<ServiceEnquiriesDto>> GetAllAsync();


    // One list page with the tab / chip counts
    Task<ServiceEnquiryPagedResult> GetPagedAsync(
        ServiceEnquiryPageRequest request);


    // Internal id of a live row (null when missing or deleted)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);


    Task<ServiceEnquiriesDto?> GetByIdAsync(
        long id);


    // Next number for the date's month + every dropdown
    Task<ServiceEnquiriesDefaultsDto> GetDefaultsAsync(
        DateOnly? enquiryDate);


    // Spare parts and accessories with MRP and stock
    Task<List<PartOptionDto>> GetPartsAsync();


    // Known enquirer, matching customer, earlier enquiries
    // (sales and service)
    Task<EnquirerLookupDto> LookupEnquirerAsync(
        string mobile,
        long excludeEnquiryId);


    Task<long> CreateAsync(
        CreateServiceEnquiriesDto dto,
        long userId);


    Task UpdateAsync(
        UpdateServiceEnquiriesDto dto,
        long userId);


    Task DeleteAsync(
        long id,
        long userId);


    // The most recently deleted enquiry; false when none
    Task<bool> RestoreAsync(
        long userId);


    // Public website : Book a service / Ask for a part
    Task<PublicEnquiryResultDto> CreateFromWebsiteAsync(
        PublicServiceEnquiryRequestDto dto);



    //===========================================================
    // Sold bikes (our outlet) : service schedules
    //===========================================================

    // Every live sold bike with its schedule
    Task<List<ServiceVehicleDto>> GetVehiclesAsync();

    Task<ServiceVehicleDto?> GetVehicleByIdAsync(
        long id);

    // The schedule a model would get from a sale date (Add form)
    Task<List<ServiceVehicleScheduleDto>> PreviewScheduleAsync(
        long modelId,
        DateOnly saleDate);

    // Sold before the ERP (by hand)
    Task<long> CreateVehicleAsync(
        SaveServiceVehicleDto dto,
        long userId);

    Task UpdateVehicleAsync(
        SaveServiceVehicleDto dto,
        long userId);

    Task DeleteVehicleAsync(
        long id,
        long userId);

    Task<bool> RestoreVehicleAsync(
        long userId);

    // Called by Sales Invoices - MB on save (one call per bike)
    Task<long> CreateScheduleForSaleAsync(
        SoldBikeInput input);

    // Called by Sales Returns - MB : no more reminders
    Task VoidScheduleForSaleAsync(
        string saleDocType,
        long saleDocId,
        long userId);

    //===========================================================
    // Follow-ups : calls / visits logged on a service enquiry
    //===========================================================

    Task<List<ServiceFollowUpDto>> GetFollowUpsAsync(
        long serviceEnquiryId);

    Task<List<ServiceFollowUpDto>> GetRecentFollowUpsAsync(
        DateOnly fromDate);

    Task<long> LogFollowUpAsync(
        LogServiceFollowUpDto dto,
        long userId);


    //===========================================================
    // Appointments : workshop visits of Service enquiries, in
    // the slots of the default Service Appointment time slot
    //===========================================================

    Task<AppointmentDayDto> GetAppointmentDayAsync(
        DateOnly date,
        long branchId,
        DateOnly? weekFrom = null);

    Task<List<ActiveAppointmentDto>> GetActiveAppointmentsAsync(
        long branchId);

    Task<int> CountAppointmentsAsync(
        DateOnly date,
        long branchId);

    // Website : free slots of a day at a service centre
    Task<List<PublicServiceSlotDto>> GetWebsiteSlotsAsync(
        DateOnly date,
        string? branchCode);

    Task<List<ServiceAppointmentDto>> GetEnquiryAppointmentsAsync(
        long serviceEnquiryId);

    Task<long> BookAppointmentAsync(
        BookServiceAppointmentDto dto,
        long userId);

    Task RescheduleAppointmentAsync(
        RescheduleServiceAppointmentDto dto,
        long userId);

    Task SetAppointmentStatusAsync(
        ServiceAppointmentStatusDto dto,
        long userId);


    // Raises a Service Enquiry for every sold bike whose next
    // service is near (also run by every list read)
    Task<int> RaiseDueSchedulesAsync();
}
