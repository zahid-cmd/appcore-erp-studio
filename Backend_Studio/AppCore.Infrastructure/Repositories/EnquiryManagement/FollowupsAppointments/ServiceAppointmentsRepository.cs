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
// Service Appointments Repository (Follow-ups & Appointments ›
// Service Appointments page)
//
// The page's list and form over the appointments the Service
// Enquiries repository books : every rule (one live appointment
// per enquiry, slots, capacity, booking window, the enquiry's
// visit date and call history) stays in one place,
// ServiceEnquiriesRepository.Appointments.cs / .AppointmentsCrud.cs.
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06). Never
// run Code Synchronization or its rollback again for the Service
// Appointments submenu.
//===============================================================

public class ServiceAppointmentsRepository
    : IServiceAppointmentsRepository
{
    private readonly IServiceEnquiriesRepository _enquiries;


    public ServiceAppointmentsRepository
    (
        IServiceEnquiriesRepository enquiries
    )
    {
        _enquiries = enquiries;
    }


    public Task<PagedResult<ServiceAppointmentDto>> GetPagedAsync
    (
        ServiceAppointmentsPageRequest request
    )
    {
        return _enquiries.GetAppointmentPageAsync(request);
    }


    public async Task<ServiceAppointmentsDefaultsDto> GetDefaultsAsync
    (
        DateOnly date,
        long branchId
    )
    {
        AppointmentDayDto day =
            await _enquiries.GetAppointmentDayAsync(date, branchId);

        ServiceEnquiriesDefaultsDto defaults =
            await _enquiries.GetDefaultsAsync(null);

        return new ServiceAppointmentsDefaultsDto
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
        return _enquiries.GetAppointmentIdByPublicIdAsync(publicId);
    }


    public Task<ServiceAppointmentDto?> GetByIdAsync
    (
        long id
    )
    {
        return _enquiries.GetAppointmentAsync(id);
    }


    public async Task<Guid> CreateAsync
    (
        CreateServiceAppointmentsDto dto,
        long userId
    )
    {
        long id =
            await _enquiries.BookAppointmentAsync(dto, userId);

        ServiceAppointmentDto? saved =
            await _enquiries.GetAppointmentAsync(id);

        return saved?.PublicId ?? Guid.Empty;
    }


    public Task UpdateAsync
    (
        long id,
        UpdateServiceAppointmentsDto dto,
        long userId
    )
    {
        return _enquiries.UpdateAppointmentAsync(id, dto, userId);
    }


    public Task DeleteAsync
    (
        long id,
        long userId
    )
    {
        return _enquiries.DeleteAppointmentAsync(id, userId);
    }


    public Task<bool> RestoreAsync
    (
        long userId
    )
    {
        return _enquiries.RestoreAppointmentAsync(userId);
    }
}
