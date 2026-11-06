//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.Common.Paging;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Application.EnquiryManagement.FollowUpsAppointments;
using AppCore.Infrastructure.Persistence.Paging;
using SalesEnquiriesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.SalesEnquiries;
using TestRidesEntity =
    AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments.TestRides;


//===============================================================
// Namespace (as registered by Code Synchronization)
//===============================================================

namespace AppCore.Infrastructure.Configurations.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Sales Enquiries Repository : Test Rides, list and form
// (Follow-ups & Appointments › Test Rides page, 2026-11-06)
//
// Paged list (period tab, status chip, branch, search), one ride,
// the form's save, delete and restore. Booking stays
// BookTestRideAsync; a move and a status change reuse
// RescheduleTestRideAsync / SetTestRideStatusAsync, so the
// enquiry's ride date / time, follow-up and call history follow
// exactly as on the board.
//
//   Delete  : closed rides only (Ridden / No-show / Cancelled); a
//             live one holds a slot and the enquiry's ride date :
//             cancel it first.
//   Restore : the most recently deleted one.
//===============================================================

public partial class SalesEnquiriesRepository
{
    // Columns the list may sort by besides the date (date + slot)
    private static readonly SortMap<TestRidesEntity> RideSorts =
        new SortMap<TestRidesEntity>("EnquiryNo")
            .Add("EnquiryNo", x => x.EnquiryNo)
            .Add("BranchName", x => x.BranchName)
            .Add("AdvisorName", x => x.AdvisorName)
            .Add("ModelName", x => x.ModelName)
            .Add("Status", x => x.Status)
            .Add("RescheduleCount", x => x.RescheduleCount)
            .Tie(x => x.SalesTestRideId);


    private static readonly string[] RideStatusList =
    {
        SalesTestRideStatuses.Booked,
        SalesTestRideStatuses.Confirmed,
        SalesTestRideStatuses.Ridden,
        SalesTestRideStatuses.NoShow,
        SalesTestRideStatuses.Cancelled
    };


    private static string RideWhenText(DateOnly date, TimeOnly start) =>
        $"{date:dd-MMM-yyyy} {Ampm(start)}";



    //===========================================================
    // LIST : one page + the status counts
    //===========================================================

    public async Task<PagedResult<SalesTestRideDto>> GetTestRidePageAsync
    (
        TestRidesPageRequest request
    )
    {
        DateOnly today =
            Today();

        string period =
            FollowUpPeriods.Normalize(request.Period);

        IQueryable<TestRidesEntity> query =
            Rides.AsNoTracking()
                .Where(x => !x.IsDeleted);

        if (request.BranchId > 0)
        {
            query = query.Where(x => x.BranchId == request.BranchId);
        }

        query =
            period switch
            {
                FollowUpPeriods.Today => query.Where(x => x.RideDate == today),
                FollowUpPeriods.Past => query.Where(x => x.RideDate < today),
                FollowUpPeriods.All => query,
                _ => query.Where(x => x.RideDate >= today)
            };

        if (request.SafeSearch != string.Empty)
        {
            string like =
                PagingQuery.LikePattern(request.SafeSearch);

            IQueryable<SalesEnquiriesEntity> enquiries =
                Enquiries;

            query =
                query.Where(
                    x =>
                        EF.Functions.ILike(x.EnquiryNo, like)
                        || EF.Functions.ILike(x.AdvisorName, like)
                        || EF.Functions.ILike(x.ModelName, like)
                        || EF.Functions.ILike(x.BranchName, like)
                        || EF.Functions.ILike(x.Note, like)
                        || EF.Functions.ILike(x.CancelReason, like)
                        || enquiries.Any(
                            e =>
                                e.SalesEnquiryId == x.SalesEnquiryId
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
                    (x.Status == SalesTestRideStatuses.Booked || x.Status == SalesTestRideStatuses.Confirmed)
                    && x.RideDate < today);

        Dictionary<string, int> counts =
            RideStatusList.ToDictionary(
                s => s,
                s => byStatus.Where(x => x.Status == s).Sum(x => x.Count));

        counts["Total"] = byStatus.Sum(x => x.Count);

        counts[FollowUpStatusFilters.Live] =
            counts[SalesTestRideStatuses.Booked] + counts[SalesTestRideStatuses.Confirmed];

        counts[FollowUpStatusFilters.Overdue] = overdue;

        // Status chip
        string status =
            (request.Status ?? string.Empty).Trim();

        if (status.Equals(FollowUpStatusFilters.Live, StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.Status == SalesTestRideStatuses.Booked || x.Status == SalesTestRideStatuses.Confirmed);
        }
        else if (status.Equals(FollowUpStatusFilters.Overdue, StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(
                x =>
                    (x.Status == SalesTestRideStatuses.Booked || x.Status == SalesTestRideStatuses.Confirmed)
                    && x.RideDate < today);
        }
        else
        {
            string? exact =
                RideStatusList.FirstOrDefault(s => s.Equals(status, StringComparison.OrdinalIgnoreCase));

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
            || request.Sort.Equals("RideDate", StringComparison.OrdinalIgnoreCase)
            || request.Sort.Equals("SlotStart", StringComparison.OrdinalIgnoreCase);

        IOrderedQueryable<TestRidesEntity> ordered;

        if (byDate)
        {
            bool descending =
                string.IsNullOrWhiteSpace(request.Sort)
                    ? period == FollowUpPeriods.Past || period == FollowUpPeriods.All
                    : request.Descending;

            ordered =
                descending
                    ? query.OrderByDescending(x => x.RideDate).ThenByDescending(x => x.SlotStart).ThenByDescending(x => x.SalesTestRideId)
                    : query.OrderBy(x => x.RideDate).ThenBy(x => x.SlotStart).ThenBy(x => x.SalesTestRideId);
        }
        else
        {
            ordered = RideSorts.Apply(query, request);
        }

        List<TestRidesEntity> rows =
            await ordered
                .Page(request)
                .ToListAsync();

        List<long> enquiryIds =
            rows.Select(x => x.SalesEnquiryId).Distinct().ToList();

        List<SalesEnquiriesEntity> enquiryRows =
            await Enquiries.AsNoTracking()
                .Where(x => enquiryIds.Contains(x.SalesEnquiryId))
                .ToListAsync();

        Dictionary<long, SalesEnquiriesDto> enquiryDtos =
            await RideEnquiryDtosAsync(enquiryRows);

        return new PagedResult<SalesTestRideDto>
        {
            Items =
                rows
                    .Select(a => ToRideDto(a, enquiryDtos.TryGetValue(a.SalesEnquiryId, out SalesEnquiriesDto? e) ? e : null))
                    .ToList(),
            TotalCount = total,
            Page = request.SafePage,
            PageSize = request.SafePageSize,
            Counts = counts
        };
    }



    //===========================================================
    // ONE TEST RIDE
    //===========================================================

    public async Task<long?> GetTestRideIdByPublicIdAsync
    (
        Guid publicId
    )
    {
        return await Rides.AsNoTracking()
            .Where(x => x.PublicId == publicId && !x.IsDeleted)
            .Select(x => (long?)x.SalesTestRideId)
            .FirstOrDefaultAsync();
    }


    public async Task<SalesTestRideDto?> GetTestRideAsync
    (
        long id
    )
    {
        TestRidesEntity? row =
            await Rides.AsNoTracking()
                .FirstOrDefaultAsync(x => x.SalesTestRideId == id && !x.IsDeleted);

        if (row == null)
        {
            return null;
        }

        List<SalesEnquiriesEntity> enquiryRows =
            await Enquiries.AsNoTracking()
                .Where(x => x.SalesEnquiryId == row.SalesEnquiryId)
                .ToListAsync();

        Dictionary<long, SalesEnquiriesDto> enquiryDtos =
            await RideEnquiryDtosAsync(enquiryRows);

        return ToRideDto(row, enquiryDtos.TryGetValue(row.SalesEnquiryId, out SalesEnquiriesDto? e) ? e : null);
    }



    //===========================================================
    // UPDATE (the form) : move → bike / executive / note → status
    //===========================================================

    public async Task UpdateTestRideAsync
    (
        long id,
        UpdateTestRidesDto dto,
        long userId
    )
    {
        TestRidesEntity current =
            await Rides.AsNoTracking()
                .FirstOrDefaultAsync(x => x.SalesTestRideId == id && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Test ride not found. It may have been deleted.");

        string asked =
            (dto.Status ?? string.Empty).Trim();

        string wanted =
            asked.Length == 0
                ? current.Status
                : RideStatusList.FirstOrDefault(s => s.Equals(asked, StringComparison.OrdinalIgnoreCase))
                    ?? throw new InvalidOperationException("Choose Booked, Confirmed, Ridden, No-show or Cancelled.");

        bool live =
            SalesTestRideStatuses.IsLive(current.Status);

        TimeOnly? askedStart =
            ParseHm(dto.SlotStart);

        DateOnly date =
            dto.RideDate == default ? current.RideDate : dto.RideDate;

        TimeOnly start =
            askedStart ?? current.SlotStart;

        bool moved =
            date != current.RideDate || start != current.SlotStart;

        string currentLabel =
            SalesTestRideStatuses.Label(current.Status);

        // Closed : the executive and the note only
        if (!live)
        {
            if (moved)
            {
                throw new InvalidOperationException(
                    $"A {currentLabel} test ride cannot be moved. Book a new one for {current.EnquiryNo}.");
            }

            if (wanted != current.Status)
            {
                throw new InvalidOperationException(
                    $"This test ride is already {currentLabel} : its status cannot change. Book a new one for {current.EnquiryNo}.");
            }
        }

        // The status the row has after a move
        string afterMove =
            moved ? SalesTestRideStatuses.Booked : current.Status;

        if (live && wanted != afterMove)
        {
            if (wanted == SalesTestRideStatuses.Booked)
            {
                throw new InvalidOperationException(
                    "A confirmed test ride goes back to Booked only with a new date or slot.");
            }

            if (moved && wanted != SalesTestRideStatuses.Confirmed)
            {
                throw new InvalidOperationException(
                    $"Save the new date first, then mark it {SalesTestRideStatuses.Label(wanted)}.");
            }

            if ((wanted == SalesTestRideStatuses.Ridden || wanted == SalesTestRideStatuses.NoShow) && date > Today())
            {
                throw new InvalidOperationException(
                    $"{SalesTestRideStatuses.Label(wanted)} can be marked on {date:dd-MMM-yyyy} or later.");
            }

            if (wanted == SalesTestRideStatuses.Cancelled && Squeeze(dto.Reason).Length < 2)
            {
                throw new InvalidOperationException("Write why the test ride is cancelled.");
            }
        }

        // 1. Move (Booked again; the enquiry's visit date follows)
        if (moved)
        {
            await RescheduleTestRideAsync(
                new RescheduleTestRideDto
                {
                    SalesTestRideId = id,
                    RideDate = date,
                    SlotStart = Hm(start),
                    Note = string.Empty,
                    AllowOverbook = dto.AllowOverbook
                },
                userId);
        }

        // 2. Bike / executive / note
        TestRidesEntity row =
            await Rides.FirstAsync(x => x.SalesTestRideId == id);

        string note =
            Cut(Squeeze(dto.Note), 500);

        List<string> changes = new();

        // The bike : the enquiry's model or its second model
        if (SalesTestRideStatuses.IsLive(row.Status) && dto.ModelId > 0 && dto.ModelId != (row.ModelId ?? 0))
        {
            SalesEnquiriesEntity enquiry =
                await Enquiries.AsNoTracking().FirstOrDefaultAsync(x => x.SalesEnquiryId == row.SalesEnquiryId)
                ?? throw new KeyNotFoundException("Its sales enquiry was deleted.");

            if (dto.ModelId != enquiry.ModelId && dto.ModelId != (enquiry.SecondModelId ?? 0))
            {
                throw new InvalidOperationException($"Choose {enquiry.EnquiryNo}'s model or its second model as the bike to ride.");
            }

            (long? modelId, string modelName) =
                RideModelOf(enquiry, dto.ModelId);

            changes.Add($"bike {(row.ModelName.Length > 0 ? row.ModelName : "none")} to {modelName}");

            row.ModelId = modelId;
            row.ModelName = Cut(modelName, 200);
        }

        if (dto.AdvisorUserId > 0 && dto.AdvisorUserId != row.AdvisorUserId)
        {
            (string advisorName, long advisorId) =
                await UserNameAsync(dto.AdvisorUserId);

            if (advisorId <= 0)
            {
                throw new InvalidOperationException("The sales executive was not found. Choose another one.");
            }

            changes.Add($"executive {(row.AdvisorName.Length > 0 ? row.AdvisorName : "none")} to {advisorName}");

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

            AddRideHistory(row, "Update", "Updated", $"{row.EnquiryNo} {RideWhenText(row.RideDate, row.SlotStart)} : {string.Join("; ", changes)}.", userId, userName);

            await _context.SaveChangesAsync();
        }

        // 3. Status (Confirmed / Ridden / No-show / Cancelled)
        if (live && wanted != row.Status && wanted != SalesTestRideStatuses.Booked)
        {
            await SetTestRideStatusAsync(
                new TestRideStatusDto
                {
                    SalesTestRideId = id,
                    Status = wanted,
                    Reason = dto.Reason ?? string.Empty
                },
                userId);
        }
    }



    //===========================================================
    // DELETE (closed only) / RESTORE (latest deleted)
    //===========================================================

    public async Task DeleteTestRideAsync
    (
        long id,
        long userId
    )
    {
        TestRidesEntity row =
            await Rides.FirstOrDefaultAsync(x => x.SalesTestRideId == id && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Test ride not found. It may have been deleted.");

        if (SalesTestRideStatuses.IsLive(row.Status))
        {
            throw new InvalidOperationException(
                $"{row.EnquiryNo} {RideWhenText(row.RideDate, row.SlotStart)} is still {SalesTestRideStatuses.Label(row.Status)} : it holds the slot and the enquiry's visit date. Cancel it first.");
        }

        (string userName, _) =
            await UserNameAsync(userId);

        row.IsDeleted = true;
        row.DeletedBy = userId;
        row.DeletedDate = DateTime.UtcNow;

        AddRideHistory(row, "Delete", "Deleted", $"{row.EnquiryNo} {RideWhenText(row.RideDate, row.SlotStart)} ({SalesTestRideStatuses.Label(row.Status)}) deleted.", userId, userName);

        await _context.SaveChangesAsync();
    }


    public async Task<bool> RestoreTestRideAsync
    (
        long userId
    )
    {
        TestRidesEntity? row =
            await Rides
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .ThenByDescending(x => x.SalesTestRideId)
                .FirstOrDefaultAsync();

        if (row == null)
        {
            return false;
        }

        // A live row (deleted some other way) must not make a second
        // live ride for its enquiry
        if (SalesTestRideStatuses.IsLive(row.Status))
        {
            bool otherLive =
                await Rides.AsNoTracking()
                    .AnyAsync(
                        x =>
                            !x.IsDeleted
                            && x.SalesEnquiryId == row.SalesEnquiryId
                            && x.SalesTestRideId != row.SalesTestRideId
                            && (x.Status == SalesTestRideStatuses.Booked || x.Status == SalesTestRideStatuses.Confirmed));

            if (otherLive)
            {
                throw new InvalidOperationException(
                    $"{row.EnquiryNo} has another live test ride now : {row.EnquiryNo} {RideWhenText(row.RideDate, row.SlotStart)} cannot come back.");
            }
        }

        (string userName, _) =
            await UserNameAsync(userId);

        row.IsDeleted = false;
        row.DeletedBy = null;
        row.DeletedDate = null;
        row.ModifiedBy = userId;
        row.ModifiedDate = DateTime.UtcNow;

        AddRideHistory(row, "Restore", "Restored", $"{row.EnquiryNo} {RideWhenText(row.RideDate, row.SlotStart)} ({SalesTestRideStatuses.Label(row.Status)}) restored.", userId, userName);

        await _context.SaveChangesAsync();

        return true;
    }
}
