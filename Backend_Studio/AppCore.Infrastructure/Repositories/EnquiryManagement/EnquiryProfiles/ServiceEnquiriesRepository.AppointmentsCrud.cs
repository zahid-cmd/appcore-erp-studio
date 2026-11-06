//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.Common.Paging;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Application.EnquiryManagement.FollowUpsAppointments;
using AppCore.Infrastructure.Persistence.Paging;
using ServiceEnquiriesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.ServiceEnquiries;
using ServiceAppointmentsEntity =
    AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments.ServiceAppointments;


//===============================================================
// Namespace (as registered by Code Synchronization)
//===============================================================

namespace AppCore.Infrastructure.Configurations.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Service Enquiries Repository : Appointments, list and form
// (Follow-ups & Appointments › Service Appointments page,
// 2026-11-06)
//
// Paged list (period tab, status chip, branch, search), one
// appointment, the form's save, delete and restore. Booking stays
// BookAppointmentAsync; a move and a status change reuse
// RescheduleAppointmentAsync / SetAppointmentStatusAsync, so the
// enquiry's visit date, follow-up and call history follow exactly
// as on the board.
//
//   Delete  : closed appointments only (Arrived / No-show /
//             Cancelled); a live one holds a slot and the
//             enquiry's visit date : cancel it first.
//   Restore : the most recently deleted one.
//===============================================================

public partial class ServiceEnquiriesRepository
{
    // Columns the list may sort by besides the date (date + slot)
    private static readonly SortMap<ServiceAppointmentsEntity> AppointmentSorts =
        new SortMap<ServiceAppointmentsEntity>("EnquiryNo")
            .Add("EnquiryNo", x => x.EnquiryNo)
            .Add("BranchName", x => x.BranchName)
            .Add("AdvisorName", x => x.AdvisorName)
            .Add("Status", x => x.Status)
            .Add("RescheduleCount", x => x.RescheduleCount)
            .Tie(x => x.ServiceAppointmentId);


    private static readonly string[] AppointmentStatusList =
    {
        ServiceAppointmentStatuses.Booked,
        ServiceAppointmentStatuses.Confirmed,
        ServiceAppointmentStatuses.Arrived,
        ServiceAppointmentStatuses.NoShow,
        ServiceAppointmentStatuses.Cancelled
    };


    private static string WhenText(DateOnly date, TimeOnly start) =>
        $"{date:dd-MMM-yyyy} {Ampm(start)}";



    //===========================================================
    // LIST : one page + the status counts
    //===========================================================

    public async Task<PagedResult<ServiceAppointmentDto>> GetAppointmentPageAsync
    (
        ServiceAppointmentsPageRequest request
    )
    {
        DateOnly today =
            Today();

        string period =
            FollowUpPeriods.Normalize(request.Period);

        IQueryable<ServiceAppointmentsEntity> query =
            Appointments.AsNoTracking()
                .Where(x => !x.IsDeleted);

        if (request.BranchId > 0)
        {
            query = query.Where(x => x.BranchId == request.BranchId);
        }

        query =
            period switch
            {
                FollowUpPeriods.Today => query.Where(x => x.AppointmentDate == today),
                FollowUpPeriods.Past => query.Where(x => x.AppointmentDate < today),
                FollowUpPeriods.All => query,
                _ => query.Where(x => x.AppointmentDate >= today)
            };

        if (request.SafeSearch != string.Empty)
        {
            string like =
                PagingQuery.LikePattern(request.SafeSearch);

            IQueryable<ServiceEnquiriesEntity> enquiries =
                Enquiries;

            query =
                query.Where(
                    x =>
                        EF.Functions.ILike(x.EnquiryNo, like)
                        || EF.Functions.ILike(x.AdvisorName, like)
                        || EF.Functions.ILike(x.BranchName, like)
                        || EF.Functions.ILike(x.Note, like)
                        || EF.Functions.ILike(x.CancelReason, like)
                        || enquiries.Any(
                            e =>
                                e.ServiceEnquiryId == x.ServiceEnquiryId
                                && (EF.Functions.ILike(e.EnquirerName, like)
                                    || EF.Functions.ILike(e.EnquirerMobile, like)
                                    || EF.Functions.ILike(e.ModelName, like))));
        }

        // Counts : the period, branch and search; not the status
        var byStatus =
            await query
                .GroupBy(x => x.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync();

        int overdue =
            await query.CountAsync(
                x =>
                    (x.Status == ServiceAppointmentStatuses.Booked || x.Status == ServiceAppointmentStatuses.Confirmed)
                    && x.AppointmentDate < today);

        Dictionary<string, int> counts =
            AppointmentStatusList.ToDictionary(
                s => s,
                s => byStatus.Where(x => x.Status == s).Sum(x => x.Count));

        counts["Total"] = byStatus.Sum(x => x.Count);

        counts[FollowUpStatusFilters.Live] =
            counts[ServiceAppointmentStatuses.Booked] + counts[ServiceAppointmentStatuses.Confirmed];

        counts[FollowUpStatusFilters.Overdue] = overdue;

        // Status chip
        string status =
            (request.Status ?? string.Empty).Trim();

        if (status.Equals(FollowUpStatusFilters.Live, StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.Status == ServiceAppointmentStatuses.Booked || x.Status == ServiceAppointmentStatuses.Confirmed);
        }
        else if (status.Equals(FollowUpStatusFilters.Overdue, StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(
                x =>
                    (x.Status == ServiceAppointmentStatuses.Booked || x.Status == ServiceAppointmentStatuses.Confirmed)
                    && x.AppointmentDate < today);
        }
        else
        {
            string? exact =
                AppointmentStatusList.FirstOrDefault(s => s.Equals(status, StringComparison.OrdinalIgnoreCase));

            if (exact != null)
            {
                query = query.Where(x => x.Status == exact);
            }
        }

        int total =
            await query.CountAsync();

        PagingQuery.FitPage(request, total);

        // Date + slot (default) : upcoming / today soonest first,
        // past / all newest first
        bool byDate =
            string.IsNullOrWhiteSpace(request.Sort)
            || request.Sort.Equals("AppointmentDate", StringComparison.OrdinalIgnoreCase)
            || request.Sort.Equals("SlotStart", StringComparison.OrdinalIgnoreCase);

        IOrderedQueryable<ServiceAppointmentsEntity> ordered;

        if (byDate)
        {
            bool descending =
                string.IsNullOrWhiteSpace(request.Sort)
                    ? period == FollowUpPeriods.Past || period == FollowUpPeriods.All
                    : request.Descending;

            ordered =
                descending
                    ? query.OrderByDescending(x => x.AppointmentDate).ThenByDescending(x => x.SlotStart).ThenByDescending(x => x.ServiceAppointmentId)
                    : query.OrderBy(x => x.AppointmentDate).ThenBy(x => x.SlotStart).ThenBy(x => x.ServiceAppointmentId);
        }
        else
        {
            ordered = AppointmentSorts.Apply(query, request);
        }

        List<ServiceAppointmentsEntity> rows =
            await ordered
                .Page(request)
                .ToListAsync();

        List<long> enquiryIds =
            rows.Select(x => x.ServiceEnquiryId).Distinct().ToList();

        List<ServiceEnquiriesEntity> enquiryRows =
            await Enquiries.AsNoTracking()
                .Where(x => enquiryIds.Contains(x.ServiceEnquiryId))
                .ToListAsync();

        Dictionary<long, ServiceEnquiriesDto> enquiryDtos =
            await EnquiryDtosAsync(enquiryRows);

        return new PagedResult<ServiceAppointmentDto>
        {
            Items =
                rows
                    .Select(a => ToAppointmentDto(a, enquiryDtos.TryGetValue(a.ServiceEnquiryId, out ServiceEnquiriesDto? e) ? e : null))
                    .ToList(),
            TotalCount = total,
            Page = request.SafePage,
            PageSize = request.SafePageSize,
            Counts = counts
        };
    }



    //===========================================================
    // ONE APPOINTMENT
    //===========================================================

    public async Task<long?> GetAppointmentIdByPublicIdAsync
    (
        Guid publicId
    )
    {
        return await Appointments.AsNoTracking()
            .Where(x => x.PublicId == publicId && !x.IsDeleted)
            .Select(x => (long?)x.ServiceAppointmentId)
            .FirstOrDefaultAsync();
    }


    public async Task<ServiceAppointmentDto?> GetAppointmentAsync
    (
        long id
    )
    {
        ServiceAppointmentsEntity? row =
            await Appointments.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ServiceAppointmentId == id && !x.IsDeleted);

        if (row == null)
        {
            return null;
        }

        List<ServiceEnquiriesEntity> enquiryRows =
            await Enquiries.AsNoTracking()
                .Where(x => x.ServiceEnquiryId == row.ServiceEnquiryId)
                .ToListAsync();

        Dictionary<long, ServiceEnquiriesDto> enquiryDtos =
            await EnquiryDtosAsync(enquiryRows);

        return ToAppointmentDto(row, enquiryDtos.TryGetValue(row.ServiceEnquiryId, out ServiceEnquiriesDto? e) ? e : null);
    }



    //===========================================================
    // UPDATE (the form) : move → advisor / note → status
    //===========================================================

    public async Task UpdateAppointmentAsync
    (
        long id,
        UpdateServiceAppointmentsDto dto,
        long userId
    )
    {
        ServiceAppointmentsEntity current =
            await Appointments.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ServiceAppointmentId == id && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Appointment not found. It may have been deleted.");

        string asked =
            (dto.Status ?? string.Empty).Trim();

        string wanted =
            asked.Length == 0
                ? current.Status
                : AppointmentStatusList.FirstOrDefault(s => s.Equals(asked, StringComparison.OrdinalIgnoreCase))
                    ?? throw new InvalidOperationException("Choose Booked, Confirmed, Arrived, No-show or Cancelled.");

        bool live =
            ServiceAppointmentStatuses.IsLive(current.Status);

        TimeOnly? askedStart =
            ParseHm(dto.SlotStart);

        DateOnly date =
            dto.AppointmentDate == default ? current.AppointmentDate : dto.AppointmentDate;

        TimeOnly start =
            askedStart ?? current.SlotStart;

        bool moved =
            date != current.AppointmentDate || start != current.SlotStart;

        string currentLabel =
            ServiceAppointmentStatuses.Label(current.Status);

        // Closed : the advisor and the note only
        if (!live)
        {
            if (moved)
            {
                throw new InvalidOperationException(
                    $"A {currentLabel} appointment cannot be moved. Book a new one for {current.EnquiryNo}.");
            }

            if (wanted != current.Status)
            {
                throw new InvalidOperationException(
                    $"This appointment is already {currentLabel} : its status cannot change. Book a new one for {current.EnquiryNo}.");
            }
        }

        // The status the row has after a move
        string afterMove =
            moved ? ServiceAppointmentStatuses.Booked : current.Status;

        if (live && wanted != afterMove)
        {
            if (wanted == ServiceAppointmentStatuses.Booked)
            {
                throw new InvalidOperationException(
                    "A confirmed appointment goes back to Booked only with a new date or slot.");
            }

            if (moved && wanted != ServiceAppointmentStatuses.Confirmed)
            {
                throw new InvalidOperationException(
                    $"Save the new date first, then mark it {ServiceAppointmentStatuses.Label(wanted)}.");
            }

            if ((wanted == ServiceAppointmentStatuses.Arrived || wanted == ServiceAppointmentStatuses.NoShow) && date > Today())
            {
                throw new InvalidOperationException(
                    $"{ServiceAppointmentStatuses.Label(wanted)} can be marked on {date:dd-MMM-yyyy} or later.");
            }

            if (wanted == ServiceAppointmentStatuses.Cancelled && Squeeze(dto.Reason).Length < 2)
            {
                throw new InvalidOperationException("Write why the appointment is cancelled.");
            }
        }

        // 1. Move (Booked again; the enquiry's visit date follows)
        if (moved)
        {
            await RescheduleAppointmentAsync(
                new RescheduleServiceAppointmentDto
                {
                    ServiceAppointmentId = id,
                    AppointmentDate = date,
                    SlotStart = Hm(start),
                    Note = string.Empty,
                    AllowOverbook = dto.AllowOverbook
                },
                userId);
        }

        // 2. Advisor / note
        ServiceAppointmentsEntity row =
            await Appointments.FirstAsync(x => x.ServiceAppointmentId == id);

        string note =
            Cut(Squeeze(dto.Note), 500);

        List<string> changes = new();

        if (dto.AdvisorUserId > 0 && dto.AdvisorUserId != row.AdvisorUserId)
        {
            (string advisorName, long advisorId) =
                await UserNameAsync(dto.AdvisorUserId);

            if (advisorId <= 0)
            {
                throw new InvalidOperationException("The advisor was not found. Choose another one.");
            }

            changes.Add($"advisor {(row.AdvisorName.Length > 0 ? row.AdvisorName : "none")} to {advisorName}");

            row.AdvisorUserId = advisorId;
            row.AdvisorName = advisorName;
        }

        if (note != row.Note)
        {
            changes.Add(note.Length > 0 ? $"note : {note}" : "note cleared");

            row.Note = note;
        }

        if (changes.Count > 0)
        {
            (string userName, _) =
                await UserNameAsync(userId);

            row.ModifiedBy = userId;
            row.ModifiedDate = DateTime.UtcNow;

            AddAppointmentHistory(row, "Update", "Updated", $"{row.EnquiryNo} {WhenText(row.AppointmentDate, row.SlotStart)} : {string.Join("; ", changes)}.", userId, userName);

            await _context.SaveChangesAsync();
        }

        // 3. Status (Confirmed / Arrived / No-show / Cancelled)
        if (live && wanted != row.Status && wanted != ServiceAppointmentStatuses.Booked)
        {
            await SetAppointmentStatusAsync(
                new ServiceAppointmentStatusDto
                {
                    ServiceAppointmentId = id,
                    Status = wanted,
                    Reason = dto.Reason ?? string.Empty
                },
                userId);
        }
    }



    //===========================================================
    // DELETE (closed only) / RESTORE (latest deleted)
    //===========================================================

    public async Task DeleteAppointmentAsync
    (
        long id,
        long userId
    )
    {
        ServiceAppointmentsEntity row =
            await Appointments.FirstOrDefaultAsync(x => x.ServiceAppointmentId == id && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Appointment not found. It may have been deleted.");

        if (ServiceAppointmentStatuses.IsLive(row.Status))
        {
            throw new InvalidOperationException(
                $"{row.EnquiryNo} {WhenText(row.AppointmentDate, row.SlotStart)} is still {ServiceAppointmentStatuses.Label(row.Status)} : it holds the slot and the enquiry's visit date. Cancel it first.");
        }

        (string userName, _) =
            await UserNameAsync(userId);

        row.IsDeleted = true;
        row.DeletedBy = userId;
        row.DeletedDate = DateTime.UtcNow;

        AddAppointmentHistory(row, "Delete", "Deleted", $"{row.EnquiryNo} {WhenText(row.AppointmentDate, row.SlotStart)} ({ServiceAppointmentStatuses.Label(row.Status)}) deleted.", userId, userName);

        await _context.SaveChangesAsync();
    }


    public async Task<bool> RestoreAppointmentAsync
    (
        long userId
    )
    {
        ServiceAppointmentsEntity? row =
            await Appointments
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .ThenByDescending(x => x.ServiceAppointmentId)
                .FirstOrDefaultAsync();

        if (row == null)
        {
            return false;
        }

        // A live row (deleted some other way) must not make a second
        // live appointment for its enquiry
        if (ServiceAppointmentStatuses.IsLive(row.Status))
        {
            bool otherLive =
                await Appointments.AsNoTracking()
                    .AnyAsync(
                        x =>
                            !x.IsDeleted
                            && x.ServiceEnquiryId == row.ServiceEnquiryId
                            && x.ServiceAppointmentId != row.ServiceAppointmentId
                            && (x.Status == ServiceAppointmentStatuses.Booked || x.Status == ServiceAppointmentStatuses.Confirmed));

            if (otherLive)
            {
                throw new InvalidOperationException(
                    $"{row.EnquiryNo} has another live appointment now : {row.EnquiryNo} {WhenText(row.AppointmentDate, row.SlotStart)} cannot come back.");
            }
        }

        (string userName, _) =
            await UserNameAsync(userId);

        row.IsDeleted = false;
        row.DeletedBy = null;
        row.DeletedDate = null;
        row.ModifiedBy = userId;
        row.ModifiedDate = DateTime.UtcNow;

        AddAppointmentHistory(row, "Restore", "Restored", $"{row.EnquiryNo} {WhenText(row.AppointmentDate, row.SlotStart)} ({ServiceAppointmentStatuses.Label(row.Status)}) restored.", userId, userName);

        await _context.SaveChangesAsync();

        return true;
    }
}
