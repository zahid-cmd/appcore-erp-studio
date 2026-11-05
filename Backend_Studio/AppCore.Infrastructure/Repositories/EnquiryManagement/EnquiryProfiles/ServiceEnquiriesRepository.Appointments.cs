//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Application.Public.Website;
using AppCore.Domain.Common;
using ServiceEnquiriesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.ServiceEnquiries;
using EnquirySetupsEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.EnquirySetups;
using ServiceAppointmentsEntity =
    AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments.ServiceAppointments;
using ServiceFollowUpsEntity =
    AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments.ServiceFollowUps;
using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;
using UserProfileEntity =
    AppCore.Domain.Entities.SecurityPermission.UserManagement.UserProfile;


//===============================================================
// Namespace (as registered by Code Synchronization)
//===============================================================

namespace AppCore.Infrastructure.Configurations.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Service Enquiries Repository : Appointments
//
// The Appointments page books a workshop visit for an open
// Service-type enquiry, in a slot of the day cut from the
// DEFAULT active "Service Appointment" time slot (Enquiry Setup ›
// Time Slots : interval, working hours, lunch break). No capacity
// limit yet (Workshop Configuration later) : the board shows how
// many are booked per slot.
//
//   Booked → Confirmed → Arrived, or NoShow / Cancelled (reason).
//   Booked / Confirmed = live : one live appointment per enquiry.
//   Reschedule : new date / slot on the same row, Booked again.
//
// Booking / rescheduling sets the enquiry's visit date
// (PreferredDate) and its next follow-up to the day before (today
// at the earliest) and writes a "Visit booked" line in its call
// history. No-show / Cancelled bring the enquiry back to the
// waiting list with a follow-up today.
//===============================================================

public partial class ServiceEnquiriesRepository
{
    private const string AppointmentEntity = "ServiceAppointments";

    // Booking window when switch CFG-MOD-010-0024 is OFF
    private const int NoLimitDays = 365;


    // Switch 0024 : days ahead an appointment may be booked
    private async Task<int> AppointmentWindowDaysAsync() =>
        await EnquirySwitches.NumberAsync(_context, EnquirySwitches.AppointmentWindow, 180, 1, 365) ?? NoLimitDays;


    // Switch 0022 : overbooking a full slot after a warning
    private async Task<bool> AppointmentOverbookAllowedAsync() =>
        await EnquirySwitches.OnAsync(_context, EnquirySwitches.AppointmentOverbooking, true);


    // Switch 0025 : follow-up days before the visit (null = OFF :
    // the next follow-up is left as it is)
    private async Task<int?> VisitLeadDaysAsync() =>
        await EnquirySwitches.NumberAsync(_context, EnquirySwitches.FollowUpBeforeVisit, 1, 0, 7);

    // pg_advisory_xact_lock(SlotLockKey, day number) while a slot is
    // counted and booked (two bookings of the last place)
    private const int SlotLockKey = 4504;


    private DbSet<ServiceAppointmentsEntity> Appointments =>
        _context.Set<ServiceAppointmentsEntity>();


    private static string Hm(TimeOnly time) =>
        time.ToString("HH:mm");


    // 10:30 AM
    private static string Ampm(TimeOnly time) =>
        time.ToString("hh:mm tt", System.Globalization.CultureInfo.InvariantCulture);


    private static TimeOnly? ParseHm(string? text) =>
        TimeOnly.TryParseExact((text ?? string.Empty).Trim(), new[] { "HH:mm", "H:mm", "HH:mm:ss" }, null, System.Globalization.DateTimeStyles.None, out TimeOnly time)
            ? time
            : null;


    // The default active Service Appointment time slot
    private async Task<EnquirySetupsEntity?> ServiceTimeSlotAsync()
    {
        return await Setups.AsNoTracking()
            .Where(
                x =>
                    !x.IsDeleted
                    && x.IsActive
                    && x.IsDefault
                    && x.SetupType == EnquirySetupTypes.TimeSlot
                    && x.UsedFor == TimeSlotUses.Service)
            .OrderBy(x => x.DisplayOrder)
            .FirstOrDefaultAsync();
    }


    private static List<(TimeOnly Start, TimeOnly End)> SlotsOf(EnquirySetupsEntity? slot)
    {
        return slot != null && slot.TimeFrom.HasValue && slot.TimeTo.HasValue && slot.IntervalMinutes.HasValue
            ? TimeSlotUses.BuildSlots(slot.TimeFrom.Value, slot.TimeTo.Value, slot.IntervalMinutes.Value, slot.BreakFrom, slot.BreakTo)
            : new List<(TimeOnly Start, TimeOnly End)>();
    }


    // Bookings per slot of a time slot (older rows : 1)
    private static int CapacityOf(EnquirySetupsEntity? slot) =>
        slot?.SlotCapacity is int n && n > 0 ? n : 1;


    // Appointments holding the slot (Booked / Confirmed / Arrived)
    private async Task<int> TakenAsync(long branchId, DateOnly date, TimeOnly start, long excludeId)
    {
        return await Appointments.AsNoTracking()
            .CountAsync(
                x =>
                    !x.IsDeleted
                    && x.BranchId == branchId
                    && x.AppointmentDate == date
                    && x.SlotStart == start
                    && x.ServiceAppointmentId != excludeId
                    && (x.Status == ServiceAppointmentStatuses.Booked || x.Status == ServiceAppointmentStatuses.Confirmed || x.Status == ServiceAppointmentStatuses.Arrived));
    }


    private async Task LockSlotsAsync(DateOnly date)
    {
        await _context.Database.ExecuteSqlRawAsync(
            "SELECT pg_advisory_xact_lock({0}, {1})",
            SlotLockKey,
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


    private void AddAppointmentHistory
    (
        ServiceAppointmentsEntity appointment,
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
                EntityName = AppointmentEntity,
                EntityId = appointment.ServiceAppointmentId,
                ActivityType = activityType,
                ActivityTitle = $"Appointment {title}",
                ActivityDescription = Cut(description, 500),
                PerformedBy = userId,
                PerformedByName = string.IsNullOrWhiteSpace(userName) ? "System" : userName,
                PerformedDate = DateTime.UtcNow
            });
    }


    private static ServiceAppointmentDto ToAppointmentDto
    (
        ServiceAppointmentsEntity x,
        ServiceEnquiriesDto? enquiry
    )
    {
        return new ServiceAppointmentDto
        {
            ServiceAppointmentId = x.ServiceAppointmentId,
            ServiceEnquiryId = x.ServiceEnquiryId,
            EnquiryNo = x.EnquiryNo,
            BranchId = x.BranchId,
            BranchName = x.BranchName,
            AppointmentDate = x.AppointmentDate,
            SlotStart = Hm(x.SlotStart),
            SlotEnd = Hm(x.SlotEnd),
            TimeSlotId = x.TimeSlotId,
            Status = x.Status,
            StatusDate = x.StatusDate,
            CancelReason = x.CancelReason,
            AdvisorUserId = x.AdvisorUserId,
            AdvisorName = x.AdvisorName,
            Note = x.Note,
            RescheduleCount = x.RescheduleCount,
            EnquirerName = enquiry?.EnquirerName ?? string.Empty,
            EnquirerMobile = enquiry?.EnquirerMobile ?? string.Empty,
            ModelName = enquiry?.ModelName ?? string.Empty,
            BrandName = enquiry?.BrandName ?? string.Empty,
            RegistrationNo = enquiry?.RegistrationNo ?? string.Empty,
            RequestSummary = enquiry?.RequestSummary ?? string.Empty,
            EnquiryStatusName = enquiry?.StatusName ?? string.Empty,
            EnquiryStatusColor = enquiry?.StatusColor ?? string.Empty,
            CreatedDate = x.CreatedDate
        };
    }


    // Enquiry DTOs (with request summary, status) by id
    private async Task<Dictionary<long, ServiceEnquiriesDto>> EnquiryDtosAsync(List<ServiceEnquiriesEntity> rows)
    {
        if (rows.Count == 0)
        {
            return new Dictionary<long, ServiceEnquiriesDto>();
        }

        Lookups lookups =
            await LoadLookupsAsync(rows);

        return rows.ToDictionary(x => x.ServiceEnquiryId, x => ToDto(x, lookups));
    }



    //===========================================================
    // READ : the day board
    //===========================================================

    public async Task<AppointmentDayDto> GetAppointmentDayAsync
    (
        DateOnly date,
        long branchId,
        DateOnly? weekFrom = null
    )
    {
        EnquirySetupsEntity? timeSlot =
            await ServiceTimeSlotAsync();

        List<(TimeOnly Start, TimeOnly End)> slots =
            SlotsOf(timeSlot);

        List<ServiceAppointmentsEntity> appointments =
            await Appointments.AsNoTracking()
                .Where(x => !x.IsDeleted && x.AppointmentDate == date && (branchId <= 0 || x.BranchId == branchId))
                .OrderBy(x => x.SlotStart)
                .ThenBy(x => x.ServiceAppointmentId)
                .ToListAsync();

        // Waiting : open Service enquiries of the branch with no live
        // appointment
        List<long> openStatusIds =
            await Setups.AsNoTracking()
                .Where(x => x.SetupType == EnquirySetupTypes.Status && x.Stage == EnquiryStages.Open && !x.IsDeleted)
                .Select(x => x.EnquirySetupId)
                .ToListAsync();

        List<long> liveEnquiryIds =
            await Appointments.AsNoTracking()
                .Where(x => !x.IsDeleted && (x.Status == ServiceAppointmentStatuses.Booked || x.Status == ServiceAppointmentStatuses.Confirmed))
                .Select(x => x.ServiceEnquiryId)
                .Distinct()
                .ToListAsync();

        List<ServiceEnquiriesEntity> waitingRows =
            await Enquiries.AsNoTracking()
                .Where(
                    x =>
                        !x.IsDeleted
                        && !x.IsConverted
                        && x.EnquiryType == "Service"
                        && openStatusIds.Contains(x.StatusId)
                        && !liveEnquiryIds.Contains(x.ServiceEnquiryId)
                        && (branchId <= 0 || x.BranchId == branchId))
                .ToListAsync();

        List<long> boardEnquiryIds =
            appointments.Select(x => x.ServiceEnquiryId).Distinct().ToList();

        List<ServiceEnquiriesEntity> boardRows =
            await Enquiries.AsNoTracking()
                .Where(x => boardEnquiryIds.Contains(x.ServiceEnquiryId))
                .ToListAsync();

        Dictionary<long, ServiceEnquiriesDto> enquiries =
            await EnquiryDtosAsync(boardRows.Concat(waitingRows).GroupBy(x => x.ServiceEnquiryId).Select(g => g.First()).ToList());

        // Last appointment of the waiting ones (No-show / Cancelled)
        List<long> waitingIds =
            waitingRows.Select(x => x.ServiceEnquiryId).ToList();

        Dictionary<long, ServiceAppointmentsEntity> lastOfWaiting =
            (await Appointments.AsNoTracking()
                .Where(x => !x.IsDeleted && waitingIds.Contains(x.ServiceEnquiryId))
                .ToListAsync())
            .GroupBy(x => x.ServiceEnquiryId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.ServiceAppointmentId).First());

        List<AppointmentWaitingDto> waiting =
            waitingRows
                .Select(
                    x =>
                    {
                        enquiries.TryGetValue(x.ServiceEnquiryId, out ServiceEnquiriesDto? e);

                        lastOfWaiting.TryGetValue(x.ServiceEnquiryId, out ServiceAppointmentsEntity? last);

                        return new AppointmentWaitingDto
                        {
                            ServiceEnquiryId = x.ServiceEnquiryId,
                            EnquiryNo = x.EnquiryNo,
                            EnquiryDate = x.EnquiryDate,
                            EnquirerName = x.EnquirerName,
                            EnquirerMobile = x.EnquirerMobile,
                            ModelName = x.ModelName,
                            BrandName = x.BrandName,
                            RequestSummary = e?.RequestSummary ?? string.Empty,
                            PreferredDate = x.PreferredDate,
                            SourceName = e?.SourceName ?? string.Empty,
                            FromWebsite = x.FromWebsite,
                            FromSchedule = x.ServiceVehicleScheduleId.HasValue,
                            StatusName = e?.StatusName ?? string.Empty,
                            StatusColor = e?.StatusColor ?? string.Empty,
                            ExecutiveUserId = x.ExecutiveUserId,
                            ExecutiveName = x.ExecutiveName,
                            LastAppointment =
                                last == null
                                    ? string.Empty
                                    : $"{ServiceAppointmentStatuses.Label(last.Status)} {last.AppointmentDate:dd-MMM} {Ampm(last.SlotStart)}"
                        };
                    })
                // asked date first (nearest), then the oldest enquiry
                .OrderBy(x => x.PreferredDate.HasValue ? 0 : 1)
                .ThenBy(x => x.PreferredDate)
                .ThenBy(x => x.EnquiryDate)
                .ThenBy(x => x.ServiceEnquiryId)
                .ToList();

        // Week strip : live + arrived per day, 7 days from weekFrom
        DateOnly weekStart =
            weekFrom ?? date;

        DateOnly weekEnd =
            weekStart.AddDays(6);

        var week =
            await Appointments.AsNoTracking()
                .Where(
                    x =>
                        !x.IsDeleted
                        && x.AppointmentDate >= weekStart
                        && x.AppointmentDate <= weekEnd
                        && (branchId <= 0 || x.BranchId == branchId)
                        && (x.Status == ServiceAppointmentStatuses.Booked || x.Status == ServiceAppointmentStatuses.Confirmed || x.Status == ServiceAppointmentStatuses.Arrived))
                .GroupBy(x => x.AppointmentDate)
                .Select(g => new { Day = g.Key, Count = g.Count() })
                .ToListAsync();

        bool Holds(ServiceAppointmentsEntity x) =>
            ServiceAppointmentStatuses.IsLive(x.Status) || x.Status == ServiceAppointmentStatuses.Arrived;

        bool allowOverbook =
            await AppointmentOverbookAllowedAsync();

        return new AppointmentDayDto
        {
            Date = date,
            BranchId = branchId,
            AllowOverbook = allowOverbook,
            TimeSlotId = timeSlot?.EnquirySetupId,
            TimeSlotName = timeSlot?.Name ?? string.Empty,
            IntervalMinutes = timeSlot?.IntervalMinutes ?? 0,
            Capacity = timeSlot == null ? 0 : CapacityOf(timeSlot),
            TimeFrom = timeSlot?.TimeFrom is TimeOnly timefrom ? Hm(timefrom) : string.Empty,
            TimeTo = timeSlot?.TimeTo is TimeOnly timeto ? Hm(timeto) : string.Empty,
            BreakFrom = timeSlot?.BreakFrom is TimeOnly breakfrom ? Hm(breakfrom) : string.Empty,
            BreakTo = timeSlot?.BreakTo is TimeOnly breakto ? Hm(breakto) : string.Empty,
            Message =
                timeSlot == null
                    ? "No default Service Appointment time slot. Set one in Enquiry Setup › Time Slots (active and Default : Yes)."
                    : string.Empty,
            Slots =
                slots
                    .Select(
                        s =>
                            new AppointmentSlotDto
                            {
                                Start = Hm(s.Start),
                                End = Hm(s.End),
                                Booked = appointments.Count(a => a.SlotStart == s.Start && Holds(a)),
                                Capacity = CapacityOf(timeSlot),
                                Full = appointments.Count(a => a.SlotStart == s.Start && Holds(a)) >= CapacityOf(timeSlot)
                            })
                    .ToList(),
            Appointments =
                appointments
                    .Select(a => ToAppointmentDto(a, enquiries.TryGetValue(a.ServiceEnquiryId, out var e) ? e : null))
                    .ToList(),
            Waiting = waiting,
            Counts =
                new[] { ServiceAppointmentStatuses.Booked, ServiceAppointmentStatuses.Confirmed, ServiceAppointmentStatuses.Arrived, ServiceAppointmentStatuses.NoShow, ServiceAppointmentStatuses.Cancelled }
                    .ToDictionary(s => s, s => appointments.Count(a => a.Status == s)),
            Week =
                Enumerable.Range(0, 7)
                    .Select(i => weekStart.AddDays(i))
                    .ToDictionary(d => d.ToString("yyyy-MM-dd"), d => week.FirstOrDefault(w => w.Day == d)?.Count ?? 0)
        };
    }


    // Live + arrived appointments of a day (the list's pill)
    public async Task<int> CountAppointmentsAsync
    (
        DateOnly date,
        long branchId
    )
    {
        return await Appointments.AsNoTracking()
            .CountAsync(
                x =>
                    !x.IsDeleted
                    && x.AppointmentDate == date
                    && (branchId <= 0 || x.BranchId == branchId)
                    && (x.Status == ServiceAppointmentStatuses.Booked || x.Status == ServiceAppointmentStatuses.Confirmed || x.Status == ServiceAppointmentStatuses.Arrived));
    }


    // Active : live appointments of every date + visit requests
    // (open Service enquiries with an asked date and no live
    // appointment; website bookings included), nearest first
    public async Task<List<ActiveAppointmentDto>> GetActiveAppointmentsAsync
    (
        long branchId
    )
    {
        List<ServiceAppointmentsEntity> live =
            await Appointments.AsNoTracking()
                .Where(
                    x =>
                        !x.IsDeleted
                        && (x.Status == ServiceAppointmentStatuses.Booked || x.Status == ServiceAppointmentStatuses.Confirmed)
                        && (branchId <= 0 || x.BranchId == branchId))
                .ToListAsync();

        List<long> liveIds =
            live.Select(x => x.ServiceEnquiryId).Distinct().ToList();

        List<long> openStatusIds =
            await Setups.AsNoTracking()
                .Where(x => x.SetupType == EnquirySetupTypes.Status && x.Stage == EnquiryStages.Open && !x.IsDeleted)
                .Select(x => x.EnquirySetupId)
                .ToListAsync();

        List<ServiceEnquiriesEntity> requests =
            await Enquiries.AsNoTracking()
                .Where(
                    x =>
                        !x.IsDeleted
                        && !x.IsConverted
                        && x.EnquiryType == "Service"
                        && x.PreferredDate != null
                        && openStatusIds.Contains(x.StatusId)
                        && !liveIds.Contains(x.ServiceEnquiryId)
                        && (branchId <= 0 || x.BranchId == branchId))
                .ToListAsync();

        List<ServiceEnquiriesEntity> liveEnquiries =
            await Enquiries.AsNoTracking()
                .Where(x => liveIds.Contains(x.ServiceEnquiryId))
                .ToListAsync();

        Dictionary<long, ServiceEnquiriesDto> enquiries =
            await EnquiryDtosAsync(liveEnquiries.Concat(requests).GroupBy(x => x.ServiceEnquiryId).Select(g => g.First()).ToList());

        List<ActiveAppointmentDto> rows = new();

        foreach (ServiceAppointmentsEntity a in live)
        {
            enquiries.TryGetValue(a.ServiceEnquiryId, out ServiceEnquiriesDto? e);

            rows.Add(
                new ActiveAppointmentDto
                {
                    Kind = "Appointment",
                    ServiceAppointmentId = a.ServiceAppointmentId,
                    ServiceEnquiryId = a.ServiceEnquiryId,
                    EnquiryNo = a.EnquiryNo,
                    Date = a.AppointmentDate,
                    SlotStart = Hm(a.SlotStart),
                    SlotEnd = Hm(a.SlotEnd),
                    Status = a.Status,
                    SourceName = e?.SourceName ?? string.Empty,
                    FromWebsite = e?.FromWebsite ?? false,
                    FromSchedule = e?.ServiceVehicleScheduleId != null,
                    EnquirerName = e?.EnquirerName ?? string.Empty,
                    EnquirerMobile = e?.EnquirerMobile ?? string.Empty,
                    ModelName = e?.ModelName ?? string.Empty,
                    BrandName = e?.BrandName ?? string.Empty,
                    RequestSummary = e?.RequestSummary ?? string.Empty,
                    AdvisorName = a.AdvisorName,
                    Note = a.Note,
                    RescheduleCount = a.RescheduleCount
                });
        }

        foreach (ServiceEnquiriesEntity x in requests)
        {
            enquiries.TryGetValue(x.ServiceEnquiryId, out ServiceEnquiriesDto? e);

            rows.Add(
                new ActiveAppointmentDto
                {
                    Kind = "Request",
                    ServiceAppointmentId = 0,
                    ServiceEnquiryId = x.ServiceEnquiryId,
                    EnquiryNo = x.EnquiryNo,
                    Date = x.PreferredDate!.Value,
                    SlotStart = string.Empty,
                    SlotEnd = string.Empty,
                    Status = "Requested",
                    SourceName = e?.SourceName ?? string.Empty,
                    FromWebsite = x.FromWebsite,
                    FromSchedule = x.ServiceVehicleScheduleId.HasValue,
                    EnquirerName = x.EnquirerName,
                    EnquirerMobile = x.EnquirerMobile,
                    ModelName = x.ModelName,
                    BrandName = x.BrandName,
                    RequestSummary = e?.RequestSummary ?? string.Empty,
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


    // The enquiry's appointments (newest first)
    public async Task<List<ServiceAppointmentDto>> GetEnquiryAppointmentsAsync
    (
        long serviceEnquiryId
    )
    {
        List<ServiceAppointmentsEntity> rows =
            await Appointments.AsNoTracking()
                .Where(x => !x.IsDeleted && x.ServiceEnquiryId == serviceEnquiryId)
                .OrderByDescending(x => x.AppointmentDate)
                .ThenByDescending(x => x.ServiceAppointmentId)
                .ToListAsync();

        List<ServiceEnquiriesEntity> enquiryRows =
            await Enquiries.AsNoTracking()
                .Where(x => x.ServiceEnquiryId == serviceEnquiryId)
                .ToListAsync();

        Dictionary<long, ServiceEnquiriesDto> enquiries =
            await EnquiryDtosAsync(enquiryRows);

        return rows
            .Select(a => ToAppointmentDto(a, enquiries.TryGetValue(a.ServiceEnquiryId, out var e) ? e : null))
            .ToList();
    }



    //===========================================================
    // Checks shared by book and reschedule
    //===========================================================

    private async Task<(TimeOnly Start, TimeOnly End, long TimeSlotId, int Capacity)> RequireSlotAsync
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
            await AppointmentWindowDaysAsync();

        if (date > today.AddDays(window))
        {
            throw new InvalidOperationException($"An appointment can be booked up to {window} days ahead.");
        }

        EnquirySetupsEntity timeSlot =
            await ServiceTimeSlotAsync()
            ?? throw new InvalidOperationException("No default Service Appointment time slot. Set one in Enquiry Setup › Time Slots.");

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


    // Visit date + follow-up the day before (today at the earliest)
    // + a "Visit booked" call-history line
    private void MarkVisit
    (
        ServiceEnquiriesEntity enquiry,
        DateOnly date,
        TimeOnly start,
        string note,
        long userId,
        string userName,
        long callerId,
        int? daysBefore
    )
    {
        DateOnly today =
            Today();

        DateOnly? before =
            enquiry.PreferredDate;

        // Switch 0025 OFF : the next follow-up stays as it is
        DateOnly? next =
            daysBefore.HasValue
                ? (date.AddDays(-daysBefore.Value) < today ? today : date.AddDays(-daysBefore.Value))
                : enquiry.NextFollowUpDate;

        string text =
            Cut($"Appointment {date:dd-MMM-yyyy} {Ampm(start)}{(note.Length > 0 ? " : " + note : string.Empty)}", 500);

        FollowUps.Add(
            new ServiceFollowUpsEntity
            {
                ServiceEnquiryId = enquiry.ServiceEnquiryId,
                EnquiryNo = enquiry.EnquiryNo,
                FollowUpAt = DateTime.UtcNow,
                FollowUpDate = today,
                MethodId = null,
                MethodName = string.Empty,
                Outcome = "Visit booked",
                Note = text,
                NextFollowUpDate = next,
                StatusFromId = enquiry.StatusId,
                StatusFromName = string.Empty,
                StatusToId = enquiry.StatusId,
                StatusToName = string.Empty,
                StatusToStage = EnquiryStages.Open,
                PreferredDateFrom = before,
                PreferredDateTo = date,
                LostReasonId = null,
                LostReasonName = string.Empty,
                ExecutiveUserId = callerId,
                ExecutiveName = userName,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            });

        enquiry.PreferredDate = date;
        enquiry.NextFollowUpDate = next;
        enquiry.LastFollowUpDate = today;
        enquiry.LastFollowUpNote = Cut("Visit booked : " + text, 500);

        if (!(enquiry.ExecutiveUserId > 0) && callerId > 0)
        {
            enquiry.ExecutiveUserId = callerId;
            enquiry.ExecutiveName = userName;
        }

        enquiry.ModifiedBy = userId;
        enquiry.ModifiedDate = DateTime.UtcNow;
    }


    //===========================================================
    // BOOK
    //===========================================================

    public async Task<long> BookAppointmentAsync
    (
        BookServiceAppointmentDto dto,
        long userId
    )
    {
        ServiceEnquiriesEntity enquiry =
            await Enquiries.FirstOrDefaultAsync(x => x.ServiceEnquiryId == dto.ServiceEnquiryId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Service enquiry not found. It may have been deleted.");

        if (enquiry.EnquiryType != "Service")
        {
            throw new InvalidOperationException($"{enquiry.EnquiryNo} is a Parts enquiry : appointments are for Service enquiries only.");
        }

        if (enquiry.IsConverted)
        {
            throw new InvalidOperationException($"{enquiry.EnquiryNo} is closed by {enquiry.ConvertedDocType} {enquiry.ConvertedDocNo}.");
        }

        EnquirySetupsEntity? status =
            await Setups.AsNoTracking().FirstOrDefaultAsync(x => x.EnquirySetupId == enquiry.StatusId);

        if (status?.Stage != EnquiryStages.Open)
        {
            throw new InvalidOperationException($"{enquiry.EnquiryNo} is suspended. Reopen it with a follow-up first.");
        }

        ServiceAppointmentsEntity? live =
            await Appointments.AsNoTracking()
                .FirstOrDefaultAsync(
                    x =>
                        !x.IsDeleted
                        && x.ServiceEnquiryId == enquiry.ServiceEnquiryId
                        && (x.Status == ServiceAppointmentStatuses.Booked || x.Status == ServiceAppointmentStatuses.Confirmed));

        if (live != null)
        {
            throw new InvalidOperationException(
                $"{enquiry.EnquiryNo} already has an appointment on {live.AppointmentDate:dd-MMM-yyyy} {Ampm(live.SlotStart)}. Reschedule it instead.");
        }

        (TimeOnly start, TimeOnly end, long timeSlotId, int capacity) =
            await RequireSlotAsync(dto.AppointmentDate, dto.SlotStart);

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

        string note =
            Cut(Squeeze(dto.Note), 500);

        ServiceAppointmentsEntity row =
            new()
            {
                ServiceEnquiryId = enquiry.ServiceEnquiryId,
                EnquiryNo = enquiry.EnquiryNo,
                BranchId = branch.BranchId,
                BranchName = branch.BranchName,
                AppointmentDate = dto.AppointmentDate,
                SlotStart = start,
                SlotEnd = end,
                TimeSlotId = timeSlotId,
                Status = ServiceAppointmentStatuses.Booked,
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

        await LockSlotsAsync(dto.AppointmentDate);

        int taken =
            await TakenAsync(branch.BranchId, dto.AppointmentDate, start, 0);

        if (taken >= capacity && !(dto.AllowOverbook && await AppointmentOverbookAllowedAsync()))
        {
            throw new InvalidOperationException(
                $"The {Ampm(start)} slot is full ({taken} of {capacity}). Pick another slot.");
        }

        Appointments.Add(row);

        MarkVisit(enquiry, dto.AppointmentDate, start, note, userId, userName, callerId, await VisitLeadDaysAsync());

        await _context.SaveChangesAsync();

        string when =
            $"{row.AppointmentDate:dd-MMM-yyyy} {Ampm(start)} - {Ampm(end)}";

        AddAppointmentHistory(row, "Create", "Booked", $"{enquiry.EnquiryNo} ({enquiry.EnquirerName} - {enquiry.EnquirerMobile}) booked for {when}, advisor {advisorName}. {note}", userId, userName);

        AddHistory(enquiry, "Update", "Appointment booked", $"{enquiry.EnquiryNo} : appointment {when}. {note}", userId, userName);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return row.ServiceAppointmentId;
    }



    //===========================================================
    // RESCHEDULE (live only; Booked again)
    //===========================================================

    public async Task RescheduleAppointmentAsync
    (
        RescheduleServiceAppointmentDto dto,
        long userId
    )
    {
        ServiceAppointmentsEntity row =
            await Appointments.FirstOrDefaultAsync(x => x.ServiceAppointmentId == dto.ServiceAppointmentId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Appointment not found. It may have been removed.");

        if (!ServiceAppointmentStatuses.IsLive(row.Status))
        {
            throw new InvalidOperationException($"A {ServiceAppointmentStatuses.Label(row.Status)} appointment cannot be moved. Book a new one from the waiting list.");
        }

        ServiceEnquiriesEntity enquiry =
            await Enquiries.FirstOrDefaultAsync(x => x.ServiceEnquiryId == row.ServiceEnquiryId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Its service enquiry was deleted.");

        if (enquiry.IsConverted)
        {
            throw new InvalidOperationException($"{enquiry.EnquiryNo} is closed by {enquiry.ConvertedDocType} {enquiry.ConvertedDocNo}.");
        }

        (TimeOnly start, TimeOnly end, long timeSlotId, int capacity) =
            await RequireSlotAsync(dto.AppointmentDate, dto.SlotStart);

        if (row.AppointmentDate == dto.AppointmentDate && row.SlotStart == start)
        {
            throw new InvalidOperationException("Choose another date or slot.");
        }

        (string userName, long callerId) =
            await UserNameAsync(userId);

        string note =
            Cut(Squeeze(dto.Note), 500);

        string from =
            $"{row.AppointmentDate:dd-MMM-yyyy} {Ampm(row.SlotStart)}";

        string to =
            $"{dto.AppointmentDate:dd-MMM-yyyy} {Ampm(start)}";

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await LockSlotsAsync(dto.AppointmentDate);

        int taken =
            await TakenAsync(row.BranchId, dto.AppointmentDate, start, row.ServiceAppointmentId);

        if (taken >= capacity && !(dto.AllowOverbook && await AppointmentOverbookAllowedAsync()))
        {
            throw new InvalidOperationException(
                $"The {Ampm(start)} slot is full ({taken} of {capacity}). Pick another slot.");
        }

        row.AppointmentDate = dto.AppointmentDate;
        row.SlotStart = start;
        row.SlotEnd = end;
        row.TimeSlotId = timeSlotId;
        row.Status = ServiceAppointmentStatuses.Booked;
        row.StatusDate = DateTime.UtcNow;
        row.RescheduleCount += 1;
        row.Note = note.Length > 0 ? note : row.Note;
        row.ModifiedBy = userId;
        row.ModifiedDate = DateTime.UtcNow;

        MarkVisit(enquiry, dto.AppointmentDate, start, $"moved from {from}{(note.Length > 0 ? ", " + note : string.Empty)}", userId, userName, callerId, await VisitLeadDaysAsync());

        AddAppointmentHistory(row, "Update", "Rescheduled", $"{row.EnquiryNo} moved from {from} to {to}. {note}", userId, userName);

        AddHistory(enquiry, "Update", "Appointment rescheduled", $"{enquiry.EnquiryNo} : appointment moved from {from} to {to}. {note}", userId, userName);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }



    //===========================================================
    // STATUS : Confirmed / Arrived / NoShow / Cancelled
    //===========================================================

    public async Task SetAppointmentStatusAsync
    (
        ServiceAppointmentStatusDto dto,
        long userId
    )
    {
        ServiceAppointmentsEntity row =
            await Appointments.FirstOrDefaultAsync(x => x.ServiceAppointmentId == dto.ServiceAppointmentId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Appointment not found. It may have been removed.");

        string status =
            new[] { ServiceAppointmentStatuses.Confirmed, ServiceAppointmentStatuses.Arrived, ServiceAppointmentStatuses.NoShow, ServiceAppointmentStatuses.Cancelled }
                .FirstOrDefault(x => string.Equals(x, (dto.Status ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("Choose Confirmed, Arrived, No-show or Cancelled.");

        if (!ServiceAppointmentStatuses.IsLive(row.Status))
        {
            throw new InvalidOperationException($"This appointment is already {ServiceAppointmentStatuses.Label(row.Status)}.");
        }

        if (status == row.Status)
        {
            throw new InvalidOperationException($"This appointment is already {ServiceAppointmentStatuses.Label(status)}.");
        }

        DateOnly today =
            Today();

        if ((status == ServiceAppointmentStatuses.Arrived || status == ServiceAppointmentStatuses.NoShow) && row.AppointmentDate > today)
        {
            throw new InvalidOperationException($"{ServiceAppointmentStatuses.Label(status)} can be marked on {row.AppointmentDate:dd-MMM-yyyy} or later.");
        }

        string reason =
            Cut(Squeeze(dto.Reason), 300);

        if (status == ServiceAppointmentStatuses.Cancelled && reason.Length < 2)
        {
            throw new InvalidOperationException("Write why the appointment is cancelled.");
        }

        ServiceEnquiriesEntity? enquiry =
            await Enquiries.FirstOrDefaultAsync(x => x.ServiceEnquiryId == row.ServiceEnquiryId && !x.IsDeleted);

        (string userName, _) =
            await UserNameAsync(userId);

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        row.Status = status;
        row.StatusDate = DateTime.UtcNow;
        row.CancelReason = status == ServiceAppointmentStatuses.Cancelled ? reason : row.CancelReason;
        row.ModifiedBy = userId;
        row.ModifiedDate = DateTime.UtcNow;

        string when =
            $"{row.AppointmentDate:dd-MMM-yyyy} {Ampm(row.SlotStart)}";

        // Back to the waiting list : call the customer today
        if (enquiry != null && (status == ServiceAppointmentStatuses.NoShow || status == ServiceAppointmentStatuses.Cancelled) && !enquiry.IsConverted)
        {
            enquiry.NextFollowUpDate = today;
            enquiry.LastFollowUpNote = Cut($"Appointment {when} {ServiceAppointmentStatuses.Label(status).ToLower()}{(reason.Length > 0 ? " : " + reason : string.Empty)}", 500);
            enquiry.ModifiedBy = userId;
            enquiry.ModifiedDate = DateTime.UtcNow;
        }

        string text =
            $"{row.EnquiryNo} {when} : {ServiceAppointmentStatuses.Label(status)}{(reason.Length > 0 ? " (" + reason + ")" : string.Empty)}.";

        AddAppointmentHistory(row, "Update", ServiceAppointmentStatuses.Label(status), text, userId, userName);

        if (enquiry != null)
        {
            AddHistory(enquiry, "Update", $"Appointment {ServiceAppointmentStatuses.Label(status).ToLower()}", text, userId, userName);
        }

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }



    //===========================================================
    // WEBSITE : free slots of a day, and booking one with the
    // website request (strict : a full slot is never overbooked)
    //===========================================================

    public async Task<List<PublicServiceSlotDto>> GetWebsiteSlotsAsync
    (
        DateOnly date,
        string? branchCode
    )
    {
        DateOnly today =
            Today();

        if (date < today || date > today.AddDays(60))
        {
            return new List<PublicServiceSlotDto>();
        }

        BranchesEntity? branch =
            await _context.Set<BranchesEntity>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchCode == (branchCode ?? string.Empty).Trim() && !x.IsDeleted && x.IsActive);

        EnquirySetupsEntity? timeSlot =
            await ServiceTimeSlotAsync();

        // Switch 0023 OFF : no times online (the request still goes)
        if (branch == null || timeSlot == null || !await EnquirySwitches.OnAsync(_context, EnquirySwitches.WebsiteServiceBooking, true))
        {
            return new List<PublicServiceSlotDto>();
        }

        int capacity =
            CapacityOf(timeSlot);

        var taken =
            await Appointments.AsNoTracking()
                .Where(
                    x =>
                        !x.IsDeleted
                        && x.BranchId == branch.BranchId
                        && x.AppointmentDate == date
                        && (x.Status == ServiceAppointmentStatuses.Booked || x.Status == ServiceAppointmentStatuses.Confirmed || x.Status == ServiceAppointmentStatuses.Arrived))
                .GroupBy(x => x.SlotStart)
                .Select(g => new { Start = g.Key, Count = g.Count() })
                .ToListAsync();

        TimeOnly now =
            TimeOnly.FromDateTime(DateTime.Now);

        return SlotsOf(timeSlot)
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
    }


    // Books the website request's slot. "booked" / "full" / "" (no
    // slot asked, no time slot, or the enquiry already booked)
    private async Task<string> TryBookFromWebsiteAsync
    (
        long serviceEnquiryId,
        DateOnly date,
        string? slotStart
    )
    {
        TimeOnly? start =
            ParseHm(slotStart);

        if (start == null || !await EnquirySwitches.OnAsync(_context, EnquirySwitches.WebsiteServiceBooking, true))
        {
            return string.Empty;
        }

        EnquirySetupsEntity? timeSlot =
            await ServiceTimeSlotAsync();

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

        ServiceEnquiriesEntity? enquiry =
            await Enquiries.FirstOrDefaultAsync(x => x.ServiceEnquiryId == serviceEnquiryId && !x.IsDeleted);

        if (enquiry == null || enquiry.EnquiryType != "Service" || enquiry.IsConverted)
        {
            return string.Empty;
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await LockSlotsAsync(date);

        bool hasLive =
            await Appointments.AsNoTracking()
                .AnyAsync(
                    x =>
                        !x.IsDeleted
                        && x.ServiceEnquiryId == serviceEnquiryId
                        && (x.Status == ServiceAppointmentStatuses.Booked || x.Status == ServiceAppointmentStatuses.Confirmed));

        if (hasLive)
        {
            return string.Empty;
        }

        int taken =
            await TakenAsync(enquiry.BranchId, date, slot.Start, 0);

        if (taken >= CapacityOf(timeSlot))
        {
            return "full";
        }

        ServiceAppointmentsEntity row =
            new()
            {
                ServiceEnquiryId = enquiry.ServiceEnquiryId,
                EnquiryNo = enquiry.EnquiryNo,
                BranchId = enquiry.BranchId,
                BranchName = enquiry.BranchName,
                AppointmentDate = date,
                SlotStart = slot.Start,
                SlotEnd = slot.End,
                TimeSlotId = timeSlot.EnquirySetupId,
                Status = ServiceAppointmentStatuses.Booked,
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

        Appointments.Add(row);

        MarkVisit(enquiry, date, slot.Start, "booked on the website", WebsiteUserId, "Website", 0, await VisitLeadDaysAsync());

        // Call to confirm today (a website booking is not confirmed yet)
        enquiry.NextFollowUpDate = Today();

        await _context.SaveChangesAsync();

        string when =
            $"{date:dd-MMM-yyyy} {Ampm(slot.Start)} - {Ampm(slot.End)}";

        AddAppointmentHistory(row, "Create", "Booked on the website", $"{enquiry.EnquiryNo} ({enquiry.EnquirerName} - {enquiry.EnquirerMobile}) booked {when} on the website.", WebsiteUserId, "Website");

        AddHistory(enquiry, "Update", "Appointment booked (website)", $"{enquiry.EnquiryNo} : appointment {when}, booked on the website.", WebsiteUserId, "Website");

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return "booked";
    }


    // The website's thank-you text after a booking try
    private static string WebsiteBookingMessage(string result, DateOnly date, string? slotStart, string fallback)
    {
        TimeOnly? start =
            ParseHm(slotStart);

        return result switch
        {
            "booked" when start.HasValue =>
                $"Thank you! Your service is booked for {date:dd MMM yyyy}, {Ampm(start.Value)}. We will call you to confirm.",
            "full" =>
                "Thank you! That time has just filled up, so we will call you to fix another time.",
            _ => fallback
        };
    }
}
