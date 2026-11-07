//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Infrastructure.Persistence;

using SalesEnquiriesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.SalesEnquiries;

using ServiceEnquiriesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.ServiceEnquiries;

using EnquirySetupsEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.EnquirySetups;

using TestRidesEntity =
    AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments.TestRides;

using ServiceAppointmentsEntity =
    AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments.ServiceAppointments;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;


//===============================================================
// Namespace (the enquiry repositories' namespace)
//===============================================================

namespace AppCore.Infrastructure.Configurations.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Enquiry Dashboard Repository (read only)
//
// Period figures : enquiries whose Enquiry Date is in the period
// (branch / executive when chosen). A sales enquiry is Won when
// matured or its status stage is Won, Lost on a Lost stage, else
// Open; a service enquiry is Converted when converted or Won,
// Lost (Suspended) on a Lost stage. Interest : the level of the
// days left to the Expected Purchase Date when Auto Interest is
// ON (as the Sales Enquiries list), else the chosen level.
//
// "Now" figures (any enquiry date) : open enquiries whose next
// follow-up is today or past, today's test rides and service
// appointments that are not cancelled.
//===============================================================

public class EnquiryDashboardRepository
    : IEnquiryDashboardRepository
{
    private readonly AppDbContext _context;

    private const int AgendaLimit = 40;

    private const int TopModels = 6;


    public EnquiryDashboardRepository(
        AppDbContext context)
    {
        _context = context;
    }


    private sealed class Row
    {
        public long Id { get; init; }

        public Guid PublicId { get; init; }

        public string EnquiryNo { get; init; } = string.Empty;

        public DateOnly EnquiryDate { get; init; }

        public long SourceId { get; init; }

        public long StatusId { get; init; }

        public long? InterestLevelId { get; init; }

        public long ExecutiveUserId { get; init; }

        public string ExecutiveName { get; init; } = string.Empty;

        public string EnquirerName { get; init; } = string.Empty;

        public string EnquirerMobile { get; init; } = string.Empty;

        public string ModelName { get; init; } = string.Empty;

        public string RegistrationNo { get; init; } = string.Empty;

        public DateOnly? ExpectedPurchaseDate { get; init; }

        public DateOnly? NextFollowUpDate { get; init; }

        public long? LostReasonId { get; init; }

        // Sales : matured; service : converted
        public bool IsDone { get; init; }

        public DateOnly? DoneDate { get; init; }
    }


    private static decimal? Rate(int won, int lost) =>
        won + lost == 0
            ? null
            : Math.Round(won * 100m / (won + lost), 1);


    private static string OverdueText(int days) =>
        days <= 0
            ? "Due today"
            : days == 1
                ? "Overdue 1 day"
                : $"Overdue {days} days";


    private static string TimeText(TimeOnly time) =>
        time.ToString("hh:mm tt", System.Globalization.CultureInfo.InvariantCulture);


    public async Task<EnquiryDashboardDto> GetAsync(
        EnquiryDashboardRequest request)
    {
        DateOnly today =
            DateOnly.FromDateTime(DateTime.Now);

        DateOnly from =
            request.From ?? new DateOnly(today.Year, today.Month, 1);

        DateOnly to =
            request.To ?? today;

        if (to < from)
        {
            (from, to) = (to, from);
        }

        // Three years at most
        if (to.DayNumber - from.DayNumber > 1100)
        {
            from = to.AddDays(-1100);
        }

        long branchId = request.BranchId ?? 0;

        long executiveId = request.ExecutiveId ?? 0;

        Dictionary<long, EnquirySetupsEntity> setups =
            await _context.Set<EnquirySetupsEntity>()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.EnquirySetupId);

        EnquirySetupsEntity? Setup(long? id) =>
            id.HasValue && setups.TryGetValue(id.Value, out var setup)
                ? setup
                : null;

        string StageOf(long statusId) =>
            Setup(statusId)?.Stage ?? "Open";

        //-----------------------------------------------------------
        // Enquiries (branch / executive)
        //-----------------------------------------------------------

        IQueryable<SalesEnquiriesEntity> sales =
            _context.Set<SalesEnquiriesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted);

        IQueryable<ServiceEnquiriesEntity> service =
            _context.Set<ServiceEnquiriesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted);

        if (branchId > 0)
        {
            sales = sales.Where(x => x.BranchId == branchId);
            service = service.Where(x => x.BranchId == branchId);
        }

        if (executiveId > 0)
        {
            sales = sales.Where(x => x.ExecutiveUserId == executiveId);
            service = service.Where(x => x.ExecutiveUserId == executiveId);
        }

        List<Row> salesRows =
            await sales
                .Where(x => (x.EnquiryDate >= from && x.EnquiryDate <= to) || (x.NextFollowUpDate != null && x.NextFollowUpDate <= today && !x.IsMatured))
                .Select(x => new Row
                {
                    Id = x.SalesEnquiryId,
                    PublicId = x.PublicId,
                    EnquiryNo = x.EnquiryNo,
                    EnquiryDate = x.EnquiryDate,
                    SourceId = x.SourceId,
                    StatusId = x.StatusId,
                    InterestLevelId = x.InterestLevelId,
                    ExecutiveUserId = x.ExecutiveUserId,
                    ExecutiveName = x.ExecutiveName,
                    EnquirerName = x.EnquirerName,
                    EnquirerMobile = x.EnquirerMobile,
                    ModelName = x.ModelName,
                    ExpectedPurchaseDate = x.ExpectedPurchaseDate,
                    NextFollowUpDate = x.NextFollowUpDate,
                    LostReasonId = x.LostReasonId,
                    IsDone = x.IsMatured,
                    DoneDate = x.MaturedDate
                })
                .ToListAsync();

        List<Row> serviceRows =
            await service
                .Where(x => (x.EnquiryDate >= from && x.EnquiryDate <= to) || (x.NextFollowUpDate != null && x.NextFollowUpDate <= today && !x.IsConverted))
                .Select(x => new Row
                {
                    Id = x.ServiceEnquiryId,
                    PublicId = x.PublicId,
                    EnquiryNo = x.EnquiryNo,
                    EnquiryDate = x.EnquiryDate,
                    SourceId = x.SourceId,
                    StatusId = x.StatusId,
                    ExecutiveUserId = x.ExecutiveUserId,
                    ExecutiveName = x.ExecutiveName,
                    EnquirerName = x.EnquirerName,
                    EnquirerMobile = x.EnquirerMobile,
                    ModelName = x.ModelName,
                    RegistrationNo = x.RegistrationNo,
                    NextFollowUpDate = x.NextFollowUpDate,
                    LostReasonId = x.LostReasonId,
                    IsDone = x.IsConverted,
                    DoneDate = x.ConvertedDate
                })
                .ToListAsync();

        bool InPeriod(Row x) => x.EnquiryDate >= from && x.EnquiryDate <= to;

        bool Won(Row x) => x.IsDone || StageOf(x.StatusId) == "Won";

        bool Lost(Row x) => !Won(x) && StageOf(x.StatusId) == "Lost";

        bool Open(Row x) => !Won(x) && !Lost(x);

        List<Row> salesPeriod = salesRows.Where(InPeriod).ToList();

        List<Row> servicePeriod = serviceRows.Where(InPeriod).ToList();

        EnquiryDashboardDto result =
            new()
            {
                From = from,
                To = to,
                Today = today,
                SalesTotal = salesPeriod.Count,
                SalesOpen = salesPeriod.Count(Open),
                SalesWon = salesPeriod.Count(Won),
                SalesLost = salesPeriod.Count(Lost),
                ServiceTotal = servicePeriod.Count,
                ServiceOpen = servicePeriod.Count(Open),
                ServiceConverted = servicePeriod.Count(Won),
                ServiceLost = servicePeriod.Count(Lost)
            };

        result.ConversionRate = Rate(result.SalesWon, result.SalesLost);

        List<Row> matured =
            salesPeriod
                .Where(x => x.IsDone && x.DoneDate.HasValue)
                .ToList();

        result.AverageDaysToMaturity =
            matured.Count == 0
                ? null
                : Math.Round((decimal)matured.Average(x => Math.Max(0, x.DoneDate!.Value.DayNumber - x.EnquiryDate.DayNumber)), 1);

        //-----------------------------------------------------------
        // Funnel : enquiries of the period with a ridden test ride
        //-----------------------------------------------------------

        List<long> salesIds =
            salesPeriod.Select(x => x.Id).ToList();

        result.FunnelTestRidden =
            salesIds.Count == 0
                ? 0
                : await _context.Set<TestRidesEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.Status == "Ridden" && salesIds.Contains(x.SalesEnquiryId))
                    .Select(x => x.SalesEnquiryId)
                    .Distinct()
                    .CountAsync();

        //-----------------------------------------------------------
        // Sources, models, lost reasons (sales of the period)
        //-----------------------------------------------------------

        result.Sources =
            salesPeriod
                .GroupBy(x => x.SourceId)
                .Select(g => new EnquiryDashboardCountDto
                {
                    Name = Setup(g.Key)?.Name ?? "Not set",
                    Color = Setup(g.Key)?.ColorCode ?? string.Empty,
                    Count = g.Count()
                })
                .OrderByDescending(x => x.Count)
                .ThenBy(x => x.Name)
                .ToList();

        result.Models =
            salesPeriod
                .Where(x => !string.IsNullOrWhiteSpace(x.ModelName))
                .GroupBy(x => x.ModelName.Trim(), StringComparer.OrdinalIgnoreCase)
                .Select(g => new EnquiryDashboardCountDto { Name = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ThenBy(x => x.Name)
                .Take(TopModels)
                .ToList();

        result.LostReasons =
            salesPeriod
                .Where(Lost)
                .GroupBy(x => x.LostReasonId)
                .Select(g => new EnquiryDashboardCountDto
                {
                    Name = Setup(g.Key)?.Name ?? "No reason given",
                    Count = g.Count()
                })
                .OrderByDescending(x => x.Count)
                .ThenBy(x => x.Name)
                .ToList();

        //-----------------------------------------------------------
        // Interest of the open sales enquiries (period)
        //-----------------------------------------------------------

        bool autoInterest =
            await EnquirySwitches.OnAsync(_context, EnquirySwitches.AutoInterest, true);

        List<EnquirySetupsEntity> rules =
            autoInterest
                ? setups.Values
                    .Where(x => x.SetupType == "InterestLevel" && !x.IsDeleted && x.IsActive && x.DaysFrom != null)
                    .OrderBy(x => x.DaysFrom)
                    .ToList()
                : new List<EnquirySetupsEntity>();

        EnquirySetupsEntity? InterestOf(Row x)
        {
            if (rules.Count > 0 && x.ExpectedPurchaseDate.HasValue)
            {
                int days =
                    Math.Max(0, x.ExpectedPurchaseDate.Value.DayNumber - today.DayNumber);

                EnquirySetupsEntity? match =
                    rules.FirstOrDefault(r => days >= r.DaysFrom!.Value && (r.DaysTo == null || days <= r.DaysTo.Value));

                if (match != null)
                {
                    return match;
                }
            }

            return Setup(x.InterestLevelId);
        }

        result.Interest =
            salesPeriod
                .Where(Open)
                .Select(x => InterestOf(x))
                .GroupBy(x => x?.EnquirySetupId ?? 0)
                .Select(g => new
                {
                    Setup = g.First(),
                    Count = g.Count()
                })
                .OrderBy(x => x.Setup == null ? 1 : 0)
                .ThenBy(x => x.Setup?.DaysFrom ?? int.MaxValue)
                .ThenBy(x => x.Setup?.DisplayOrder ?? int.MaxValue)
                .ThenBy(x => x.Setup?.Name ?? string.Empty)
                .Select(x => new EnquiryDashboardCountDto
                {
                    Name = x.Setup?.Name ?? "Not set",
                    Color = x.Setup?.ColorCode ?? string.Empty,
                    Count = x.Count
                })
                .ToList();

        //-----------------------------------------------------------
        // Trend : per day (up to 62 days), else per month
        //-----------------------------------------------------------

        bool byDay =
            to.DayNumber - from.DayNumber <= 62;

        result.TrendUnit = byDay ? "Day" : "Month";

        if (byDay)
        {
            for (DateOnly day = from; day <= to; day = day.AddDays(1))
            {
                result.Trend.Add(
                    new EnquiryDashboardTrendDto
                    {
                        Label = day.ToString("dd-MMM", System.Globalization.CultureInfo.InvariantCulture),
                        Sales = salesPeriod.Count(x => x.EnquiryDate == day),
                        Service = servicePeriod.Count(x => x.EnquiryDate == day)
                    });
            }
        }
        else
        {
            for (DateOnly month = new(from.Year, from.Month, 1); month <= to; month = month.AddMonths(1))
            {
                result.Trend.Add(
                    new EnquiryDashboardTrendDto
                    {
                        Label = month.ToString("MMM-yy", System.Globalization.CultureInfo.InvariantCulture),
                        Sales = salesPeriod.Count(x => x.EnquiryDate.Year == month.Year && x.EnquiryDate.Month == month.Month),
                        Service = servicePeriod.Count(x => x.EnquiryDate.Year == month.Year && x.EnquiryDate.Month == month.Month)
                    });
            }
        }

        //-----------------------------------------------------------
        // Now : follow-ups due (open enquiries, any date)
        //-----------------------------------------------------------

        List<(Row Row, bool Sales)> due =
            salesRows
                .Where(x => Open(x) && x.NextFollowUpDate.HasValue && x.NextFollowUpDate.Value <= today)
                .Select(x => (Row: x, Sales: true))
                .Concat(
                    serviceRows
                        .Where(x => Open(x) && x.NextFollowUpDate.HasValue && x.NextFollowUpDate.Value <= today)
                        .Select(x => (Row: x, Sales: false)))
                .ToList();

        result.FollowUpsDue = due.Count;

        result.FollowUpsOverdue = due.Count(x => x.Row.NextFollowUpDate!.Value < today);

        List<EnquiryDashboardAgendaDto> agenda =
            due
                .OrderBy(x => x.Row.NextFollowUpDate)
                .Select(x =>
                {
                    int overdue =
                        today.DayNumber - x.Row.NextFollowUpDate!.Value.DayNumber;

                    string who =
                        string.IsNullOrWhiteSpace(x.Row.EnquirerName)
                            ? x.Row.EnquirerMobile
                            : x.Row.EnquirerName;

                    string about =
                        x.Sales
                            ? x.Row.ModelName
                            : (string.IsNullOrWhiteSpace(x.Row.RegistrationNo) ? x.Row.ModelName : x.Row.RegistrationNo);

                    return new EnquiryDashboardAgendaDto
                    {
                        Kind = x.Sales ? "SalesFollowUp" : "ServiceFollowUp",
                        Title = $"{(x.Sales ? "Sales" : "Service")} follow-up · {who}",
                        Detail = string.Join(" · ", new[] { x.Row.EnquiryNo, about, x.Row.ExecutiveName }.Where(s => !string.IsNullOrWhiteSpace(s))),
                        WhenText = OverdueText(overdue),
                        OverdueDays = Math.Max(0, overdue),
                        PublicId = x.Row.PublicId
                    };
                })
                .ToList();

        //-----------------------------------------------------------
        // Now : today's test rides and service appointments
        //-----------------------------------------------------------

        IQueryable<TestRidesEntity> rides =
            _context.Set<TestRidesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.RideDate == today && x.Status != "Cancelled");

        IQueryable<ServiceAppointmentsEntity> appointments =
            _context.Set<ServiceAppointmentsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.AppointmentDate == today && x.Status != "Cancelled");

        if (branchId > 0)
        {
            rides = rides.Where(x => x.BranchId == branchId);
            appointments = appointments.Where(x => x.BranchId == branchId);
        }

        if (executiveId > 0)
        {
            rides = rides.Where(x => x.AdvisorUserId == executiveId);
            appointments = appointments.Where(x => x.AdvisorUserId == executiveId);
        }

        var rideRows =
            await rides
                .OrderBy(x => x.SlotStart)
                .Select(x => new { x.PublicId, x.EnquiryNo, x.ModelName, x.SlotStart, x.Status, x.AdvisorName })
                .ToListAsync();

        var appointmentRows =
            await appointments
                .OrderBy(x => x.SlotStart)
                .Select(x => new { x.PublicId, x.ServiceEnquiryId, x.EnquiryNo, x.SlotStart, x.Status, x.AdvisorName })
                .ToListAsync();

        List<long> appointmentEnquiryIds =
            appointmentRows.Select(x => x.ServiceEnquiryId).Distinct().ToList();

        var appointmentEnquiries =
            appointmentEnquiryIds.Count == 0
                ? new Dictionary<long, (string Name, string Vehicle, bool Pickup)>()
                : (await _context.Set<ServiceEnquiriesEntity>()
                    .AsNoTracking()
                    .Where(x => appointmentEnquiryIds.Contains(x.ServiceEnquiryId))
                    .Select(x => new { x.ServiceEnquiryId, x.EnquirerName, x.RegistrationNo, x.ModelName, x.PickupDrop })
                    .ToListAsync())
                    .ToDictionary(
                        x => x.ServiceEnquiryId,
                        x => (Name: x.EnquirerName, Vehicle: string.IsNullOrWhiteSpace(x.RegistrationNo) ? x.ModelName : x.RegistrationNo, Pickup: x.PickupDrop));

        result.TestRidesToday = rideRows.Count;

        result.TestRidesTodayConfirmed = rideRows.Count(x => x.Status == "Confirmed");

        result.AppointmentsToday = appointmentRows.Count;

        result.AppointmentsTodayPickup =
            appointmentRows.Count(x => appointmentEnquiries.TryGetValue(x.ServiceEnquiryId, out var e) && e.Pickup);

        List<(TimeOnly At, EnquiryDashboardAgendaDto Line)> todayLines =
            rideRows
                .Select(x => (At: x.SlotStart, Line: new EnquiryDashboardAgendaDto
                {
                    Kind = "TestRide",
                    Title = $"Test ride · {x.ModelName}",
                    Detail = string.Join(" · ", new[] { x.EnquiryNo, x.Status, x.AdvisorName }.Where(s => !string.IsNullOrWhiteSpace(s))),
                    WhenText = TimeText(x.SlotStart),
                    PublicId = x.PublicId
                }))
                .Concat(
                    appointmentRows.Select(x =>
                    {
                        appointmentEnquiries.TryGetValue(x.ServiceEnquiryId, out var e);

                        return (At: x.SlotStart, Line: new EnquiryDashboardAgendaDto
                        {
                            Kind = "Appointment",
                            Title = $"Service appointment · {(string.IsNullOrWhiteSpace(e.Vehicle) ? x.EnquiryNo : e.Vehicle)}",
                            Detail = string.Join(" · ", new[] { e.Name, x.Status, e.Pickup ? "Pick-up" : string.Empty, x.AdvisorName }.Where(s => !string.IsNullOrWhiteSpace(s))),
                            WhenText = TimeText(x.SlotStart),
                            PublicId = x.PublicId
                        });
                    }))
                .OrderBy(x => x.At)
                .ToList();

        // Overdue follow-ups first, then today in time order
        agenda.AddRange(todayLines.Select(x => x.Line));

        result.AgendaMore = Math.Max(0, agenda.Count - AgendaLimit);

        result.Agenda = agenda.Take(AgendaLimit).ToList();

        //-----------------------------------------------------------
        // Executives (sales of the period) + overdue follow-ups now
        //-----------------------------------------------------------

        Dictionary<long, int> overdueBy =
            due
                .Where(x => x.Row.NextFollowUpDate!.Value < today)
                .GroupBy(x => x.Row.ExecutiveUserId)
                .ToDictionary(g => g.Key, g => g.Count());

        result.Executives =
            salesPeriod
                .GroupBy(x => x.ExecutiveUserId)
                .Select(g =>
                {
                    int won = g.Count(Won);
                    int lost = g.Count(Lost);

                    return new EnquiryDashboardExecutiveDto
                    {
                        UserId = g.Key,
                        Name =
                            g.Key == 0
                                ? "Unassigned (website)"
                                : g.Select(x => x.ExecutiveName).FirstOrDefault(n => !string.IsNullOrWhiteSpace(n)) ?? "Unknown",
                        Total = g.Count(),
                        Open = g.Count(Open),
                        Won = won,
                        Lost = lost,
                        ConversionRate = Rate(won, lost),
                        Overdue = overdueBy.GetValueOrDefault(g.Key)
                    };
                })
                .OrderBy(x => x.UserId == 0 ? 1 : 0)
                .ThenByDescending(x => x.Total)
                .ThenBy(x => x.Name)
                .ToList();

        //-----------------------------------------------------------
        // Filters
        //-----------------------------------------------------------

        result.Branches =
            await _context.Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.BranchName)
                .Select(x => new EnquiryDashboardOptionDto { Id = x.BranchId, Name = x.BranchName })
                .ToListAsync();

        var salesPeople =
            await _context.Set<SalesEnquiriesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.ExecutiveUserId > 0)
                .Select(x => new { x.ExecutiveUserId, x.ExecutiveName })
                .Distinct()
                .ToListAsync();

        var servicePeople =
            await _context.Set<ServiceEnquiriesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.ExecutiveUserId > 0)
                .Select(x => new { x.ExecutiveUserId, x.ExecutiveName })
                .Distinct()
                .ToListAsync();

        result.ExecutiveOptions =
            salesPeople
                .Concat(servicePeople)
                .GroupBy(x => x.ExecutiveUserId)
                .Select(g => new EnquiryDashboardOptionDto
                {
                    Id = g.Key,
                    Name = g.Select(x => x.ExecutiveName).FirstOrDefault(n => !string.IsNullOrWhiteSpace(n)) ?? $"User {g.Key}"
                })
                .OrderBy(x => x.Name)
                .ToList();

        return result;
    }
}
