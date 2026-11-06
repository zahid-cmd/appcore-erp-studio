//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Application.Public.Website;
using AppCore.Domain.Common;
using SalesEnquiriesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.SalesEnquiries;
using EnquirySetupsEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.EnquirySetups;
using SalesTestRidesEntity =
    AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments.TestRides;
using SalesFollowUpsEntity =
    AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments.SalesFollowUps;
using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;
using UserProfileEntity =
    AppCore.Domain.Entities.SecurityPermission.UserManagement.UserProfile;


//===============================================================
// Namespace (as registered by Code Synchronization)
//===============================================================

namespace AppCore.Infrastructure.Configurations.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Sales Enquiries Repository : Test Rides
//
// The Test Rides page books a test ride for an open sales enquiry
// (not matured, status stage Open), in a slot of the day cut from
// the DEFAULT active "Test Ride" time slot (Enquiry Setup › Time
// Slots : interval, working hours, lunch, bookings per slot).
//
//   Booked → Confirmed → Ridden, or NoShow / Cancelled (reason).
//   Booked / Confirmed = live : one live ride per enquiry.
//   Reschedule : new date / slot on the same row, Booked again.
//
// A full slot is refused unless the user overbooks after a warning
// (the website never overbooks). Booking / rescheduling sets the
// enquiry's TestRideDate / TestRideSlot, its next follow-up to the
// day before (today at the earliest) and writes a "Test ride
// booked" line in its call history. Ridden : follow-up tomorrow
// (ask how it went). No-show / Cancelled : follow-up today, back on
// the waiting list.
//===============================================================

public partial class SalesEnquiriesRepository
{
    private const string RideEntity = "SalesTestRides";

    // Booking window when switch CFG-MOD-010-0007 is OFF
    private const int RideNoLimitDays = 365;

    // pg_advisory_xact_lock(RideLockKey, day number) while a slot is
    // counted and booked
    private const int RideLockKey = 4505;


    private DbSet<SalesTestRidesEntity> Rides =>
        _context.Set<SalesTestRidesEntity>();


    private static string Hm(TimeOnly time) =>
        time.ToString("HH:mm");


    // 10:30 AM
    private static string Ampm(TimeOnly time) =>
        time.ToString("hh:mm tt", System.Globalization.CultureInfo.InvariantCulture);


    private static TimeOnly? ParseHm(string? text) =>
        TimeOnly.TryParseExact((text ?? string.Empty).Trim(), new[] { "HH:mm", "H:mm", "HH:mm:ss" }, null, System.Globalization.DateTimeStyles.None, out TimeOnly time)
            ? time
            : null;


    private static string Cut(string? value, int max)
    {
        string text = value ?? string.Empty;

        return text.Length <= max ? text : text[..max];
    }


    // Switch 0007 : days ahead a ride may be booked (OFF : a year)
    private async Task<int> RideWindowDaysAsync() =>
        await EnquirySwitches.NumberAsync(_context, EnquirySwitches.RideWindow, 90, 1, 365) ?? RideNoLimitDays;


    // Switch 0005 : overbooking a full slot after a warning
    private async Task<bool> RideOverbookAllowedAsync() =>
        await EnquirySwitches.OnAsync(_context, EnquirySwitches.RideOverbooking, true);


    // The default active Test Ride time slot
    private async Task<EnquirySetupsEntity?> RideTimeSlotAsync()
    {
        return await Setups.AsNoTracking()
            .Where(
                x =>
                    !x.IsDeleted
                    && x.IsActive
                    && x.IsDefault
                    && x.SetupType == EnquirySetupTypes.TimeSlot
                    && x.UsedFor == TimeSlotUses.TestRide)
            .OrderBy(x => x.DisplayOrder)
            .FirstOrDefaultAsync();
    }


    private static List<(TimeOnly Start, TimeOnly End)> SlotsOf(EnquirySetupsEntity? slot)
    {
        return slot != null && slot.TimeFrom.HasValue && slot.TimeTo.HasValue && slot.IntervalMinutes.HasValue
            ? TimeSlotUses.BuildSlots(slot.TimeFrom.Value, slot.TimeTo.Value, slot.IntervalMinutes.Value, slot.BreakFrom, slot.BreakTo)
            : new List<(TimeOnly Start, TimeOnly End)>();
    }


    // Rides per slot of a time slot (older rows : 1)
    private static int CapacityOf(EnquirySetupsEntity? slot) =>
        slot?.SlotCapacity is int n && n > 0 ? n : 1;


    private static bool HoldsSlot(string status) =>
        status == SalesTestRideStatuses.Booked || status == SalesTestRideStatuses.Confirmed || status == SalesTestRideStatuses.Ridden;


    // Rides holding the slot (Booked / Confirmed / Ridden)
    private async Task<int> RidesTakenAsync(long branchId, DateOnly date, TimeOnly start, long excludeId)
    {
        return await Rides.AsNoTracking()
            .CountAsync(
                x =>
                    !x.IsDeleted
                    && x.BranchId == branchId
                    && x.RideDate == date
                    && x.SlotStart == start
                    && x.SalesTestRideId != excludeId
                    && (x.Status == SalesTestRideStatuses.Booked || x.Status == SalesTestRideStatuses.Confirmed || x.Status == SalesTestRideStatuses.Ridden));
    }


    private async Task LockRideSlotsAsync(DateOnly date)
    {
        await _context.Database.ExecuteSqlRawAsync(
            "SELECT pg_advisory_xact_lock({0}, {1})",
            RideLockKey,
            date.DayNumber);
    }


    private async Task<(string Name, long Id)> UserNameAsync(long userId)
    {
        UserProfileEntity? user =
            await _context.Set<UserProfileEntity>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserProfileId == userId && !x.IsDeleted);

        if (user == null)
        {
            return (string.Empty, 0);
        }

        string name =
            Cut(Squeeze(user.DisplayName != "" ? user.DisplayName : (user.FullName != "" ? user.FullName : user.UserName)), 150);

        return (name, user.UserProfileId);
    }


    private void AddRideHistory
    (
        SalesTestRidesEntity ride,
        string activityType,
        string title,
        string description,
        long userId,
        string userName
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = RideEntity,
                EntityId = ride.SalesTestRideId,
                ActivityType = activityType,
                ActivityTitle = $"Test Ride {title}",
                ActivityDescription = Cut(description, 500),
                PerformedBy = userId,
                PerformedByName = string.IsNullOrWhiteSpace(userName) ? "System" : userName,
                PerformedDate = DateTime.UtcNow
            });
    }


    // A line on the enquiry's own history
    private void AddEnquiryRideHistory
    (
        SalesEnquiriesEntity enquiry,
        string title,
        string description,
        long userId,
        string userName
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = enquiry.SalesEnquiryId,
                ActivityType = "Update",
                ActivityTitle = title,
                ActivityDescription = Cut(description, 500),
                PerformedBy = userId,
                PerformedByName = string.IsNullOrWhiteSpace(userName) ? "System" : userName,
                PerformedDate = DateTime.UtcNow
            });
    }


    private static SalesTestRideDto ToRideDto
    (
        SalesTestRidesEntity x,
        SalesEnquiriesDto? enquiry
    )
    {
        return new SalesTestRideDto
        {
            SalesTestRideId = x.SalesTestRideId,
            PublicId = x.PublicId,
            SalesEnquiryId = x.SalesEnquiryId,
            EnquiryNo = x.EnquiryNo,
            BranchId = x.BranchId,
            BranchName = x.BranchName,
            RideDate = x.RideDate,
            SlotStart = Hm(x.SlotStart),
            SlotEnd = Hm(x.SlotEnd),
            TimeSlotId = x.TimeSlotId,
            ModelId = x.ModelId,
            ModelName = x.ModelName,
            Status = x.Status,
            StatusDate = x.StatusDate,
            CancelReason = x.CancelReason,
            AdvisorUserId = x.AdvisorUserId,
            AdvisorName = x.AdvisorName,
            Note = x.Note,
            RescheduleCount = x.RescheduleCount,
            EnquirerName = enquiry?.EnquirerName ?? string.Empty,
            EnquirerMobile = enquiry?.EnquirerMobile ?? string.Empty,
            EnquiryModelName = enquiry?.ModelName ?? string.Empty,
            BrandName = enquiry?.BrandName ?? string.Empty,
            SecondModelName = enquiry?.SecondModelName ?? string.Empty,
            InterestLevelName = enquiry?.InterestLevelName ?? string.Empty,
            InterestLevelColor = enquiry?.InterestLevelColor ?? string.Empty,
            EnquiryStatusName = enquiry?.StatusName ?? string.Empty,
            EnquiryStatusColor = enquiry?.StatusColor ?? string.Empty,
            CreatedDate = x.CreatedDate,
            IsLive = SalesTestRideStatuses.IsLive(x.Status),
            IsOverdue = SalesTestRideStatuses.IsLive(x.Status) && x.RideDate < Today()
        };
    }


    // Enquiry DTOs (status, interest) by id
    private async Task<Dictionary<long, SalesEnquiriesDto>> RideEnquiryDtosAsync(List<SalesEnquiriesEntity> rows)
    {
        if (rows.Count == 0)
        {
            return new Dictionary<long, SalesEnquiriesDto>();
        }

        Lookups lookups =
            await LoadLookupsAsync(rows);

        return rows.ToDictionary(x => x.SalesEnquiryId, x => ToDto(x, lookups));
    }


    private async Task<List<long>> OpenStatusIdsAsync()
    {
        return await Setups.AsNoTracking()
            .Where(x => x.SetupType == EnquirySetupTypes.Status && x.Stage == EnquiryStages.Open && !x.IsDeleted)
            .Select(x => x.EnquirySetupId)
            .ToListAsync();
    }



    //===========================================================
    // READ : the day board
    //===========================================================

    public async Task<TestRideDayDto> GetTestRideDayAsync
    (
        DateOnly date,
        long branchId,
        DateOnly? weekFrom = null
    )
    {
        EnquirySetupsEntity? timeSlot =
            await RideTimeSlotAsync();

        List<(TimeOnly Start, TimeOnly End)> slots =
            SlotsOf(timeSlot);

        List<SalesTestRidesEntity> rides =
            await Rides.AsNoTracking()
                .Where(x => !x.IsDeleted && x.RideDate == date && (branchId <= 0 || x.BranchId == branchId))
                .OrderBy(x => x.SlotStart)
                .ThenBy(x => x.SalesTestRideId)
                .ToListAsync();

        // Waiting : open sales enquiries of the branch with no live ride
        List<long> openStatusIds =
            await OpenStatusIdsAsync();

        List<long> liveEnquiryIds =
            await Rides.AsNoTracking()
                .Where(x => !x.IsDeleted && (x.Status == SalesTestRideStatuses.Booked || x.Status == SalesTestRideStatuses.Confirmed))
                .Select(x => x.SalesEnquiryId)
                .Distinct()
                .ToListAsync();

        List<SalesEnquiriesEntity> waitingRows =
            await Enquiries.AsNoTracking()
                .Where(
                    x =>
                        !x.IsDeleted
                        && !x.IsMatured
                        && openStatusIds.Contains(x.StatusId)
                        && !liveEnquiryIds.Contains(x.SalesEnquiryId)
                        && (branchId <= 0 || x.BranchId == branchId))
                .ToListAsync();

        List<long> boardEnquiryIds =
            rides.Select(x => x.SalesEnquiryId).Distinct().ToList();

        List<SalesEnquiriesEntity> boardRows =
            await Enquiries.AsNoTracking()
                .Where(x => boardEnquiryIds.Contains(x.SalesEnquiryId))
                .ToListAsync();

        Dictionary<long, SalesEnquiriesDto> enquiries =
            await RideEnquiryDtosAsync(boardRows.Concat(waitingRows).GroupBy(x => x.SalesEnquiryId).Select(g => g.First()).ToList());

        // Last ride of the waiting ones (No-show / Cancelled)
        List<long> waitingIds =
            waitingRows.Select(x => x.SalesEnquiryId).ToList();

        Dictionary<long, SalesTestRidesEntity> lastOfWaiting =
            (await Rides.AsNoTracking()
                .Where(x => !x.IsDeleted && waitingIds.Contains(x.SalesEnquiryId))
                .ToListAsync())
            .GroupBy(x => x.SalesEnquiryId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.SalesTestRideId).First());

        List<TestRideWaitingDto> waiting =
            waitingRows
                .Select(
                    x =>
                    {
                        enquiries.TryGetValue(x.SalesEnquiryId, out SalesEnquiriesDto? e);

                        lastOfWaiting.TryGetValue(x.SalesEnquiryId, out SalesTestRidesEntity? last);

                        return new TestRideWaitingDto
                        {
                            SalesEnquiryId = x.SalesEnquiryId,
                            EnquiryNo = x.EnquiryNo,
                            EnquiryDate = x.EnquiryDate,
                            EnquirerName = x.EnquirerName,
                            EnquirerMobile = x.EnquirerMobile,
                            ModelId = x.ModelId,
                            ModelName = x.ModelName,
                            BrandName = x.BrandName,
                            SecondModelId = x.SecondModelId,
                            SecondModelName = x.SecondModelName,
                            TestRideDate = x.TestRideDate,
                            TestRideSlot = x.TestRideSlot,
                            SourceName = e?.SourceName ?? string.Empty,
                            FromWebsite = x.FromWebsite,
                            InterestLevelName = e?.InterestLevelName ?? string.Empty,
                            InterestLevelColor = e?.InterestLevelColor ?? string.Empty,
                            StatusName = e?.StatusName ?? string.Empty,
                            StatusColor = e?.StatusColor ?? string.Empty,
                            ExecutiveUserId = x.ExecutiveUserId,
                            ExecutiveName = x.ExecutiveName,
                            LastRide =
                                last == null
                                    ? string.Empty
                                    : $"{SalesTestRideStatuses.Label(last.Status)} {last.RideDate:dd-MMM} {Ampm(last.SlotStart)}"
                        };
                    })
                // asked date first (nearest), then the newest enquiry
                .OrderBy(x => x.TestRideDate.HasValue ? 0 : 1)
                .ThenBy(x => x.TestRideDate)
                .ThenByDescending(x => x.EnquiryDate)
                .ThenByDescending(x => x.SalesEnquiryId)
                .ToList();

        // Week strip : live + ridden per day, 7 days from weekFrom
        DateOnly weekStart =
            weekFrom ?? date;

        DateOnly weekEnd =
            weekStart.AddDays(6);

        var week =
            await Rides.AsNoTracking()
                .Where(
                    x =>
                        !x.IsDeleted
                        && x.RideDate >= weekStart
                        && x.RideDate <= weekEnd
                        && (branchId <= 0 || x.BranchId == branchId)
                        && (x.Status == SalesTestRideStatuses.Booked || x.Status == SalesTestRideStatuses.Confirmed || x.Status == SalesTestRideStatuses.Ridden))
                .GroupBy(x => x.RideDate)
                .Select(g => new { Day = g.Key, Count = g.Count() })
                .ToListAsync();

        int capacity =
            CapacityOf(timeSlot);

        bool allowOverbook =
            await RideOverbookAllowedAsync();

        return new TestRideDayDto
        {
            Date = date,
            BranchId = branchId,
            AllowOverbook = allowOverbook,
            TimeSlotId = timeSlot?.EnquirySetupId,
            TimeSlotName = timeSlot?.Name ?? string.Empty,
            IntervalMinutes = timeSlot?.IntervalMinutes ?? 0,
            Capacity = timeSlot == null ? 0 : capacity,
            TimeFrom = timeSlot?.TimeFrom is TimeOnly timefrom ? Hm(timefrom) : string.Empty,
            TimeTo = timeSlot?.TimeTo is TimeOnly timeto ? Hm(timeto) : string.Empty,
            BreakFrom = timeSlot?.BreakFrom is TimeOnly breakfrom ? Hm(breakfrom) : string.Empty,
            BreakTo = timeSlot?.BreakTo is TimeOnly breakto ? Hm(breakto) : string.Empty,
            Message =
                timeSlot == null
                    ? "No default Test Ride time slot. Set one in Enquiry Setup › Time Slots (Used For : Test Ride, active and Default : Yes)."
                    : string.Empty,
            Slots =
                slots
                    .Select(
                        s =>
                        {
                            int booked =
                                rides.Count(a => a.SlotStart == s.Start && HoldsSlot(a.Status));

                            return new AppointmentSlotDto
                            {
                                Start = Hm(s.Start),
                                End = Hm(s.End),
                                Booked = booked,
                                Capacity = capacity,
                                Full = booked >= capacity
                            };
                        })
                    .ToList(),
            Rides =
                rides
                    .Select(a => ToRideDto(a, enquiries.TryGetValue(a.SalesEnquiryId, out var e) ? e : null))
                    .ToList(),
            Waiting = waiting,
            Counts =
                new[] { SalesTestRideStatuses.Booked, SalesTestRideStatuses.Confirmed, SalesTestRideStatuses.Ridden, SalesTestRideStatuses.NoShow, SalesTestRideStatuses.Cancelled }
                    .ToDictionary(s => s, s => rides.Count(a => a.Status == s)),
            Week =
                Enumerable.Range(0, 7)
                    .Select(i => weekStart.AddDays(i))
                    .ToDictionary(d => d.ToString("yyyy-MM-dd"), d => week.FirstOrDefault(w => w.Day == d)?.Count ?? 0)
        };
    }


    // Live + ridden rides of a day
    public async Task<int> CountTestRidesAsync
    (
        DateOnly date,
        long branchId
    )
    {
        return await Rides.AsNoTracking()
            .CountAsync(
                x =>
                    !x.IsDeleted
                    && x.RideDate == date
                    && (branchId <= 0 || x.BranchId == branchId)
                    && (x.Status == SalesTestRideStatuses.Booked || x.Status == SalesTestRideStatuses.Confirmed || x.Status == SalesTestRideStatuses.Ridden));
    }


    // Active : live rides of every date + ride requests (open
    // enquiries with an asked test ride date and no live ride;
    // website requests included), nearest first
    public async Task<List<ActiveTestRideDto>> GetActiveTestRidesAsync
    (
        long branchId
    )
    {
        List<SalesTestRidesEntity> live =
            await Rides.AsNoTracking()
                .Where(
                    x =>
                        !x.IsDeleted
                        && (x.Status == SalesTestRideStatuses.Booked || x.Status == SalesTestRideStatuses.Confirmed)
                        && (branchId <= 0 || x.BranchId == branchId))
                .ToListAsync();

        List<long> liveIds =
            live.Select(x => x.SalesEnquiryId).Distinct().ToList();

        List<long> openStatusIds =
            await OpenStatusIdsAsync();

        List<SalesEnquiriesEntity> requests =
            await Enquiries.AsNoTracking()
                .Where(
                    x =>
                        !x.IsDeleted
                        && !x.IsMatured
                        && x.TestRideDate != null
                        && openStatusIds.Contains(x.StatusId)
                        && !liveIds.Contains(x.SalesEnquiryId)
                        && (branchId <= 0 || x.BranchId == branchId))
                .ToListAsync();

        List<SalesEnquiriesEntity> liveEnquiries =
            await Enquiries.AsNoTracking()
                .Where(x => liveIds.Contains(x.SalesEnquiryId))
                .ToListAsync();

        Dictionary<long, SalesEnquiriesDto> enquiries =
            await RideEnquiryDtosAsync(liveEnquiries.Concat(requests).GroupBy(x => x.SalesEnquiryId).Select(g => g.First()).ToList());

        List<ActiveTestRideDto> rows = new();

        foreach (SalesTestRidesEntity a in live)
        {
            enquiries.TryGetValue(a.SalesEnquiryId, out SalesEnquiriesDto? e);

            rows.Add(
                new ActiveTestRideDto
                {
                    Kind = "Ride",
                    SalesTestRideId = a.SalesTestRideId,
                    SalesEnquiryId = a.SalesEnquiryId,
                    EnquiryNo = a.EnquiryNo,
                    Date = a.RideDate,
                    SlotStart = Hm(a.SlotStart),
                    SlotEnd = Hm(a.SlotEnd),
                    AskedSlot = string.Empty,
                    Status = a.Status,
                    SourceName = e?.SourceName ?? string.Empty,
                    FromWebsite = e?.FromWebsite ?? false,
                    EnquirerName = e?.EnquirerName ?? string.Empty,
                    EnquirerMobile = e?.EnquirerMobile ?? string.Empty,
                    ModelName = a.ModelName.Length > 0 ? a.ModelName : (e?.ModelName ?? string.Empty),
                    BrandName = e?.BrandName ?? string.Empty,
                    InterestLevelName = e?.InterestLevelName ?? string.Empty,
                    InterestLevelColor = e?.InterestLevelColor ?? string.Empty,
                    AdvisorName = a.AdvisorName,
                    Note = a.Note,
                    RescheduleCount = a.RescheduleCount
                });
        }

        foreach (SalesEnquiriesEntity x in requests)
        {
            enquiries.TryGetValue(x.SalesEnquiryId, out SalesEnquiriesDto? e);

            rows.Add(
                new ActiveTestRideDto
                {
                    Kind = "Request",
                    SalesTestRideId = 0,
                    SalesEnquiryId = x.SalesEnquiryId,
                    EnquiryNo = x.EnquiryNo,
                    Date = x.TestRideDate!.Value,
                    SlotStart = string.Empty,
                    SlotEnd = string.Empty,
                    AskedSlot = x.TestRideSlot,
                    Status = "Requested",
                    SourceName = e?.SourceName ?? string.Empty,
                    FromWebsite = x.FromWebsite,
                    EnquirerName = x.EnquirerName,
                    EnquirerMobile = x.EnquirerMobile,
                    ModelName = x.ModelName,
                    BrandName = x.BrandName,
                    InterestLevelName = e?.InterestLevelName ?? string.Empty,
                    InterestLevelColor = e?.InterestLevelColor ?? string.Empty,
                    AdvisorName = x.ExecutiveUserId > 0 ? x.ExecutiveName : string.Empty,
                    Note = string.Empty,
                    RescheduleCount = 0
                });
        }

        return rows
            .OrderBy(x => x.Date)
            .ThenBy(x => x.SlotStart.Length == 0 ? 1 : 0)
            .ThenBy(x => x.SlotStart)
            .ThenBy(x => x.EnquiryNo)
            .ToList();
    }


    // The enquiry's test rides (newest first)
    public async Task<List<SalesTestRideDto>> GetEnquiryTestRidesAsync
    (
        long salesEnquiryId
    )
    {
        List<SalesTestRidesEntity> rows =
            await Rides.AsNoTracking()
                .Where(x => !x.IsDeleted && x.SalesEnquiryId == salesEnquiryId)
                .OrderByDescending(x => x.RideDate)
                .ThenByDescending(x => x.SalesTestRideId)
                .ToListAsync();

        List<SalesEnquiriesEntity> enquiryRows =
            await Enquiries.AsNoTracking()
                .Where(x => x.SalesEnquiryId == salesEnquiryId)
                .ToListAsync();

        Dictionary<long, SalesEnquiriesDto> enquiries =
            await RideEnquiryDtosAsync(enquiryRows);

        return rows
            .Select(a => ToRideDto(a, enquiries.TryGetValue(a.SalesEnquiryId, out var e) ? e : null))
            .ToList();
    }



    //===========================================================
    // Checks shared by book and reschedule
    //===========================================================

    private async Task<(TimeOnly Start, TimeOnly End, long TimeSlotId, int Capacity)> RequireRideSlotAsync
    (
        DateOnly date,
        string? slotStart
    )
    {
        DateOnly today =
            Today();

        if (date < today)
        {
            throw new InvalidOperationException("Choose today or a later date.");
        }

        int window =
            await RideWindowDaysAsync();

        if (date > today.AddDays(window))
        {
            throw new InvalidOperationException($"A test ride can be booked up to {window} days ahead.");
        }

        EnquirySetupsEntity timeSlot =
            await RideTimeSlotAsync()
            ?? throw new InvalidOperationException("No default Test Ride time slot. Set one in Enquiry Setup › Time Slots.");

        TimeOnly start =
            ParseHm(slotStart)
            ?? throw new InvalidOperationException("Choose a slot.");

        (TimeOnly Start, TimeOnly End) slot =
            SlotsOf(timeSlot).FirstOrDefault(x => x.Start == start);

        if (slot == default)
        {
            throw new InvalidOperationException($"{Ampm(start)} is not a slot of '{timeSlot.Name}'.");
        }

        if (date == today && slot.End <= TimeOnly.FromDateTime(DateTime.Now))
        {
            throw new InvalidOperationException($"The {Ampm(slot.Start)} slot is already over today.");
        }

        return (slot.Start, slot.End, timeSlot.EnquirySetupId, CapacityOf(timeSlot));
    }


    // Open (stage Open) and not matured
    private async Task RequireOpenForRideAsync(SalesEnquiriesEntity enquiry)
    {
        if (enquiry.IsMatured)
        {
            throw new InvalidOperationException($"{enquiry.EnquiryNo} is matured by sale {enquiry.SaleNo}.");
        }

        EnquirySetupsEntity? status =
            await Setups.AsNoTracking().FirstOrDefaultAsync(x => x.EnquirySetupId == enquiry.StatusId);

        if (status?.Stage != EnquiryStages.Open)
        {
            throw new InvalidOperationException($"{enquiry.EnquiryNo} is suspended. Reopen it with a follow-up first.");
        }
    }


    // Ride date / time on the enquiry + follow-up the day before
    // (today at the earliest) + a "Test ride booked" call line
    private void MarkRide
    (
        SalesEnquiriesEntity enquiry,
        DateOnly date,
        TimeOnly start,
        string note,
        long userId,
        string userName,
        long callerId
    )
    {
        DateOnly today =
            Today();

        DateOnly next =
            date.AddDays(-1) < today ? today : date.AddDays(-1);

        string text =
            Cut($"Test ride {date:dd-MMM-yyyy} {Ampm(start)}{(note.Length > 0 ? " : " + note : string.Empty)}", 500);

        FollowUps.Add(
            new SalesFollowUpsEntity
            {
                SalesEnquiryId = enquiry.SalesEnquiryId,
                EnquiryNo = enquiry.EnquiryNo,
                FollowUpAt = DateTime.UtcNow,
                FollowUpDate = today,
                MethodId = null,
                MethodName = string.Empty,
                Outcome = "Test ride booked",
                Note = text,
                NextFollowUpDate = next,
                StatusFromId = enquiry.StatusId,
                StatusFromName = string.Empty,
                StatusToId = enquiry.StatusId,
                StatusToName = string.Empty,
                StatusToStage = EnquiryStages.Open,
                InterestFromId = enquiry.InterestLevelId,
                InterestFromName = string.Empty,
                InterestToId = enquiry.InterestLevelId,
                InterestToName = string.Empty,
                ExpectedPurchaseFrom = enquiry.ExpectedPurchaseDate,
                ExpectedPurchaseTo = enquiry.ExpectedPurchaseDate,
                LostReasonId = null,
                LostReasonName = string.Empty,
                ExecutiveUserId = callerId,
                ExecutiveName = userName,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            });

        enquiry.TestRideDate = date;
        enquiry.TestRideSlot = Ampm(start);
        enquiry.NextFollowUpDate = next;
        enquiry.LastFollowUpDate = today;
        enquiry.LastFollowUpNote = Cut("Test ride booked : " + text, 500);

        if (!(enquiry.ExecutiveUserId > 0) && callerId > 0)
        {
            enquiry.ExecutiveUserId = callerId;
            enquiry.ExecutiveName = userName;
        }

        enquiry.ModifiedBy = userId;
        enquiry.ModifiedDate = DateTime.UtcNow;
    }


    // The bike : the enquiry's model (default) or its second model
    private static (long? Id, string Name) RideModelOf(SalesEnquiriesEntity enquiry, long modelId)
    {
        if (modelId > 0 && enquiry.SecondModelId == modelId)
        {
            return (enquiry.SecondModelId, enquiry.SecondModelName);
        }

        return (enquiry.ModelId > 0 ? (long?)enquiry.ModelId : null, enquiry.ModelName);
    }



    //===========================================================
    // BOOK
    //===========================================================

    public async Task<long> BookTestRideAsync
    (
        BookTestRideDto dto,
        long userId
    )
    {
        SalesEnquiriesEntity enquiry =
            await Enquiries.FirstOrDefaultAsync(x => x.SalesEnquiryId == dto.SalesEnquiryId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Sales enquiry not found. It may have been deleted.");

        await RequireOpenForRideAsync(enquiry);

        SalesTestRidesEntity? live =
            await Rides.AsNoTracking()
                .FirstOrDefaultAsync(
                    x =>
                        !x.IsDeleted
                        && x.SalesEnquiryId == enquiry.SalesEnquiryId
                        && (x.Status == SalesTestRideStatuses.Booked || x.Status == SalesTestRideStatuses.Confirmed));

        if (live != null)
        {
            throw new InvalidOperationException(
                $"{enquiry.EnquiryNo} already has a test ride on {live.RideDate:dd-MMM-yyyy} {Ampm(live.SlotStart)}. Reschedule it instead.");
        }

        (TimeOnly start, TimeOnly end, long timeSlotId, int capacity) =
            await RequireRideSlotAsync(dto.RideDate, dto.SlotStart);

        long branchId =
            dto.BranchId > 0 ? dto.BranchId : enquiry.BranchId;

        BranchesEntity branch =
            await _context.Set<BranchesEntity>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchId == branchId && !x.IsDeleted)
            ?? throw new InvalidOperationException("Branch not found. Log in to a branch first.");

        (string userName, long callerId) =
            await UserNameAsync(userId);

        (string advisorName, long advisorId) =
            dto.AdvisorUserId > 0 && dto.AdvisorUserId != userId
                ? await UserNameAsync(dto.AdvisorUserId)
                : (userName, callerId);

        (long? modelId, string modelName) =
            RideModelOf(enquiry, dto.ModelId);

        string note =
            Cut(Squeeze(dto.Note), 500);

        SalesTestRidesEntity row =
            new()
            {
                SalesEnquiryId = enquiry.SalesEnquiryId,
                EnquiryNo = enquiry.EnquiryNo,
                BranchId = branch.BranchId,
                BranchName = branch.BranchName,
                RideDate = dto.RideDate,
                SlotStart = start,
                SlotEnd = end,
                TimeSlotId = timeSlotId,
                ModelId = modelId,
                ModelName = Cut(modelName, 200),
                Status = SalesTestRideStatuses.Booked,
                StatusDate = DateTime.UtcNow,
                CancelReason = string.Empty,
                AdvisorUserId = advisorId,
                AdvisorName = advisorName,
                Note = note,
                RescheduleCount = 0,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await LockRideSlotsAsync(dto.RideDate);

        int taken =
            await RidesTakenAsync(branch.BranchId, dto.RideDate, start, 0);

        if (taken >= capacity && !(dto.AllowOverbook && await RideOverbookAllowedAsync()))
        {
            throw new InvalidOperationException(
                $"The {Ampm(start)} slot is full ({taken} of {capacity}). Pick another slot.");
        }

        Rides.Add(row);

        MarkRide(enquiry, dto.RideDate, start, note, userId, userName, callerId);

        await _context.SaveChangesAsync();

        string when =
            $"{row.RideDate:dd-MMM-yyyy} {Ampm(start)} - {Ampm(end)}";

        AddRideHistory(row, "Create", "Booked", $"{enquiry.EnquiryNo} ({enquiry.EnquirerName} - {enquiry.EnquirerMobile}) booked a {modelName} test ride for {when}, with {advisorName}. {note}", userId, userName);

        AddEnquiryRideHistory(enquiry, "Test ride booked", $"{enquiry.EnquiryNo} : {modelName} test ride {when}. {note}", userId, userName);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return row.SalesTestRideId;
    }



    //===========================================================
    // RESCHEDULE (live only; Booked again)
    //===========================================================

    public async Task RescheduleTestRideAsync
    (
        RescheduleTestRideDto dto,
        long userId
    )
    {
        SalesTestRidesEntity row =
            await Rides.FirstOrDefaultAsync(x => x.SalesTestRideId == dto.SalesTestRideId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Test ride not found. It may have been removed.");

        if (!SalesTestRideStatuses.IsLive(row.Status))
        {
            throw new InvalidOperationException($"A {SalesTestRideStatuses.Label(row.Status)} test ride cannot be moved. Book a new one from the waiting list.");
        }

        SalesEnquiriesEntity enquiry =
            await Enquiries.FirstOrDefaultAsync(x => x.SalesEnquiryId == row.SalesEnquiryId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Its sales enquiry was deleted.");

        if (enquiry.IsMatured)
        {
            throw new InvalidOperationException($"{enquiry.EnquiryNo} is matured by sale {enquiry.SaleNo}.");
        }

        (TimeOnly start, TimeOnly end, long timeSlotId, int capacity) =
            await RequireRideSlotAsync(dto.RideDate, dto.SlotStart);

        if (row.RideDate == dto.RideDate && row.SlotStart == start)
        {
            throw new InvalidOperationException("Choose another date or slot.");
        }

        (string userName, long callerId) =
            await UserNameAsync(userId);

        string note =
            Cut(Squeeze(dto.Note), 500);

        string from =
            $"{row.RideDate:dd-MMM-yyyy} {Ampm(row.SlotStart)}";

        string to =
            $"{dto.RideDate:dd-MMM-yyyy} {Ampm(start)}";

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await LockRideSlotsAsync(dto.RideDate);

        int taken =
            await RidesTakenAsync(row.BranchId, dto.RideDate, start, row.SalesTestRideId);

        if (taken >= capacity && !(dto.AllowOverbook && await RideOverbookAllowedAsync()))
        {
            throw new InvalidOperationException(
                $"The {Ampm(start)} slot is full ({taken} of {capacity}). Pick another slot.");
        }

        row.RideDate = dto.RideDate;
        row.SlotStart = start;
        row.SlotEnd = end;
        row.TimeSlotId = timeSlotId;
        row.Status = SalesTestRideStatuses.Booked;
        row.StatusDate = DateTime.UtcNow;
        row.RescheduleCount += 1;
        row.Note = note.Length > 0 ? note : row.Note;
        row.ModifiedBy = userId;
        row.ModifiedDate = DateTime.UtcNow;

        MarkRide(enquiry, dto.RideDate, start, $"moved from {from}{(note.Length > 0 ? ", " + note : string.Empty)}", userId, userName, callerId);

        AddRideHistory(row, "Update", "Rescheduled", $"{row.EnquiryNo} moved from {from} to {to}. {note}", userId, userName);

        AddEnquiryRideHistory(enquiry, "Test ride rescheduled", $"{enquiry.EnquiryNo} : test ride moved from {from} to {to}. {note}", userId, userName);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }



    //===========================================================
    // STATUS : Confirmed / Ridden / NoShow / Cancelled
    //===========================================================

    public async Task SetTestRideStatusAsync
    (
        TestRideStatusDto dto,
        long userId
    )
    {
        SalesTestRidesEntity row =
            await Rides.FirstOrDefaultAsync(x => x.SalesTestRideId == dto.SalesTestRideId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Test ride not found. It may have been removed.");

        string status =
            new[] { SalesTestRideStatuses.Confirmed, SalesTestRideStatuses.Ridden, SalesTestRideStatuses.NoShow, SalesTestRideStatuses.Cancelled }
                .FirstOrDefault(x => string.Equals(x, (dto.Status ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("Choose Confirmed, Ridden, No-show or Cancelled.");

        if (!SalesTestRideStatuses.IsLive(row.Status))
        {
            throw new InvalidOperationException($"This test ride is already {SalesTestRideStatuses.Label(row.Status)}.");
        }

        if (status == row.Status)
        {
            throw new InvalidOperationException($"This test ride is already {SalesTestRideStatuses.Label(status)}.");
        }

        DateOnly today =
            Today();

        if ((status == SalesTestRideStatuses.Ridden || status == SalesTestRideStatuses.NoShow) && row.RideDate > today)
        {
            throw new InvalidOperationException($"{SalesTestRideStatuses.Label(status)} can be marked on {row.RideDate:dd-MMM-yyyy} or later.");
        }

        string reason =
            Cut(Squeeze(dto.Reason), 300);

        if (status == SalesTestRideStatuses.Cancelled && reason.Length < 2)
        {
            throw new InvalidOperationException("Write why the test ride is cancelled.");
        }

        SalesEnquiriesEntity? enquiry =
            await Enquiries.FirstOrDefaultAsync(x => x.SalesEnquiryId == row.SalesEnquiryId && !x.IsDeleted);

        (string userName, _) =
            await UserNameAsync(userId);

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        row.Status = status;
        row.StatusDate = DateTime.UtcNow;
        row.CancelReason = status == SalesTestRideStatuses.Cancelled ? reason : row.CancelReason;
        row.ModifiedBy = userId;
        row.ModifiedDate = DateTime.UtcNow;

        string when =
            $"{row.RideDate:dd-MMM-yyyy} {Ampm(row.SlotStart)}";

        if (enquiry != null && !enquiry.IsMatured)
        {
            // Ridden : call for the feedback after the switch's days
            // (OFF : next follow-up left as it is). No-show /
            // Cancelled : back on the waiting list, call today.
            if (status == SalesTestRideStatuses.Ridden)
            {
                int? after =
                    await EnquirySwitches.NumberAsync(_context, EnquirySwitches.FollowUpAfterRide, 1, 0, 30);

                if (after.HasValue)
                {
                    enquiry.NextFollowUpDate = today.AddDays(after.Value);
                }

                enquiry.LastFollowUpNote = Cut($"Test ride {when} done ({row.ModelName}).", 500);
                enquiry.ModifiedBy = userId;
                enquiry.ModifiedDate = DateTime.UtcNow;
            }
            else if (status == SalesTestRideStatuses.NoShow || status == SalesTestRideStatuses.Cancelled)
            {
                enquiry.NextFollowUpDate = today;
                enquiry.LastFollowUpNote = Cut($"Test ride {when} {SalesTestRideStatuses.Label(status).ToLower()}{(reason.Length > 0 ? " : " + reason : string.Empty)}", 500);
                enquiry.ModifiedBy = userId;
                enquiry.ModifiedDate = DateTime.UtcNow;
            }
        }

        string text =
            $"{row.EnquiryNo} {when} : {SalesTestRideStatuses.Label(status)}{(reason.Length > 0 ? " (" + reason + ")" : string.Empty)}.";

        AddRideHistory(row, "Update", SalesTestRideStatuses.Label(status), text, userId, userName);

        if (enquiry != null)
        {
            AddEnquiryRideHistory(enquiry, $"Test ride {SalesTestRideStatuses.Label(status).ToLower()}", text, userId, userName);
        }

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }



    //===========================================================
    // WEBSITE : free ride times of a day, and booking one with the
    // website request (strict : a full slot is never overbooked)
    //===========================================================

    public async Task<PublicRideSlotsDto> GetWebsiteRideSlotsAsync
    (
        DateOnly date,
        string? branchCode
    )
    {
        EnquirySetupsEntity? timeSlot =
            await RideTimeSlotAsync();

        // Switch 0006 OFF : the website keeps Morning / Afternoon /
        // Evening and books nothing
        bool online =
            timeSlot != null
            && await EnquirySwitches.OnAsync(_context, EnquirySwitches.WebsiteRideBooking, true);

        PublicRideSlotsDto result =
            new()
            {
                Configured = online
            };

        DateOnly today =
            Today();

        if (!online || date < today || date > today.AddDays(60))
        {
            return result;
        }

        BranchesEntity? branch =
            await _context.Set<BranchesEntity>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchCode == (branchCode ?? string.Empty).Trim() && !x.IsDeleted && x.IsActive);

        if (branch == null)
        {
            return result;
        }

        int capacity =
            CapacityOf(timeSlot);

        var taken =
            await Rides.AsNoTracking()
                .Where(
                    x =>
                        !x.IsDeleted
                        && x.BranchId == branch.BranchId
                        && x.RideDate == date
                        && (x.Status == SalesTestRideStatuses.Booked || x.Status == SalesTestRideStatuses.Confirmed || x.Status == SalesTestRideStatuses.Ridden))
                .GroupBy(x => x.SlotStart)
                .Select(g => new { Start = g.Key, Count = g.Count() })
                .ToListAsync();

        TimeOnly now =
            TimeOnly.FromDateTime(DateTime.Now);

        result.Slots =
            SlotsOf(timeSlot)
                .Where(s => date > today || s.Start > now)
                .Select(
                    s =>
                        new PublicServiceSlotDto
                        {
                            Start = Hm(s.Start),
                            End = Hm(s.End),
                            Label = Ampm(s.Start),
                            Free = capacity - (taken.FirstOrDefault(t => t.Start == s.Start)?.Count ?? 0)
                        })
                .Where(s => s.Free > 0)
                .ToList();

        return result;
    }


    // The website ride time : a slot of the default Test Ride time
    // slot ("HH:mm"), or null
    private async Task<(TimeOnly Start, TimeOnly End)?> WebsiteRideSlotAsync(string? rideStart)
    {
        TimeOnly? start =
            ParseHm(rideStart);

        if (start == null || !await EnquirySwitches.OnAsync(_context, EnquirySwitches.WebsiteRideBooking, true))
        {
            return null;
        }

        (TimeOnly Start, TimeOnly End) slot =
            SlotsOf(await RideTimeSlotAsync()).FirstOrDefault(x => x.Start == start.Value);

        return slot == default ? null : ((TimeOnly Start, TimeOnly End)?)slot;
    }


    // Books the website request's ride. "booked" / "full" / "" (no
    // time asked, no time slot, or the enquiry already booked)
    private async Task<string> TryBookRideFromWebsiteAsync
    (
        long salesEnquiryId,
        DateOnly date,
        string? rideStart
    )
    {
        TimeOnly? start =
            ParseHm(rideStart);

        if (start == null)
        {
            return string.Empty;
        }

        if (!await EnquirySwitches.OnAsync(_context, EnquirySwitches.WebsiteRideBooking, true))
        {
            return string.Empty;
        }

        EnquirySetupsEntity? timeSlot =
            await RideTimeSlotAsync();

        (TimeOnly Start, TimeOnly End) slot =
            SlotsOf(timeSlot).FirstOrDefault(x => x.Start == start.Value);

        if (timeSlot == null || slot == default)
        {
            return string.Empty;
        }

        if (date < Today() || (date == Today() && slot.Start <= TimeOnly.FromDateTime(DateTime.Now)))
        {
            return "full";
        }

        SalesEnquiriesEntity? enquiry =
            await Enquiries.FirstOrDefaultAsync(x => x.SalesEnquiryId == salesEnquiryId && !x.IsDeleted);

        if (enquiry == null || enquiry.IsMatured)
        {
            return string.Empty;
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await LockRideSlotsAsync(date);

        bool hasLive =
            await Rides.AsNoTracking()
                .AnyAsync(
                    x =>
                        !x.IsDeleted
                        && x.SalesEnquiryId == salesEnquiryId
                        && (x.Status == SalesTestRideStatuses.Booked || x.Status == SalesTestRideStatuses.Confirmed));

        if (hasLive)
        {
            return string.Empty;
        }

        int taken =
            await RidesTakenAsync(enquiry.BranchId, date, slot.Start, 0);

        if (taken >= CapacityOf(timeSlot))
        {
            return "full";
        }

        SalesTestRidesEntity row =
            new()
            {
                SalesEnquiryId = enquiry.SalesEnquiryId,
                EnquiryNo = enquiry.EnquiryNo,
                BranchId = enquiry.BranchId,
                BranchName = enquiry.BranchName,
                RideDate = date,
                SlotStart = slot.Start,
                SlotEnd = slot.End,
                TimeSlotId = timeSlot.EnquirySetupId,
                ModelId = enquiry.ModelId > 0 ? (long?)enquiry.ModelId : null,
                ModelName = Cut(enquiry.ModelName, 200),
                Status = SalesTestRideStatuses.Booked,
                StatusDate = DateTime.UtcNow,
                CancelReason = string.Empty,
                AdvisorUserId = 0,
                AdvisorName = string.Empty,
                Note = "Booked on the website.",
                RescheduleCount = 0,
                IsDeleted = false,
                CreatedBy = WebsiteUserId,
                CreatedDate = DateTime.UtcNow
            };

        Rides.Add(row);

        MarkRide(enquiry, date, slot.Start, "booked on the website", WebsiteUserId, "Website", 0);

        // Call to confirm today (a website booking is not confirmed yet)
        enquiry.NextFollowUpDate = Today();

        await _context.SaveChangesAsync();

        string when =
            $"{date:dd-MMM-yyyy} {Ampm(slot.Start)} - {Ampm(slot.End)}";

        AddRideHistory(row, "Create", "Booked on the website", $"{enquiry.EnquiryNo} ({enquiry.EnquirerName} - {enquiry.EnquirerMobile}) booked a {enquiry.ModelName} test ride for {when} on the website.", WebsiteUserId, "Website");

        AddEnquiryRideHistory(enquiry, "Test ride booked (website)", $"{enquiry.EnquiryNo} : {enquiry.ModelName} test ride {when}, booked on the website.", WebsiteUserId, "Website");

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return "booked";
    }


    // The website's thank-you text after a booking try
    private static string WebsiteRideMessage(string result, DateOnly date, string? rideStart, string fallback)
    {
        TimeOnly? start =
            ParseHm(rideStart);

        return result switch
        {
            "booked" when start.HasValue =>
                $"Thank you! Your test ride is booked for {date:dd MMM yyyy}, {Ampm(start.Value)}. We will call you to confirm.",
            "full" =>
                "Thank you! That time has just filled up, so we will call you to fix another time for your test ride.",
            _ => fallback
        };
    }
}
