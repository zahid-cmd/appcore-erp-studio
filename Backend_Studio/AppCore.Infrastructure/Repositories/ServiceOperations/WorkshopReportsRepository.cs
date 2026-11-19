//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.ServiceOperations;
using AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles;
using AppCore.Domain.Entities.ServiceOperations;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.ServiceOperations;


//===============================================================
// Workshop Dashboard and Service Reports (read-only, hand-written
// pages, 2026-11-16; NEVER run Code Sync). Nothing is written.
//
// Reports : service-history, job-card-register,
// technician-performance, parts-consumption, service-due-list,
// work-in-progress
//===============================================================

public class WorkshopReportsRepository
    : IWorkshopReportsRepository
{
    // A report shows at most this many rows
    private const int Limit = 2000;

    private readonly AppDbContext _context;

    public WorkshopReportsRepository(AppDbContext context)
    {
        _context = context;
    }

    private static string Money(decimal value) => value.ToString("N2");

    private static string Bike(string registrationNo, string chassisNo) =>
        registrationNo.Length > 0 ? registrationNo : chassisNo;

    private static WsReportColumnDto Col(string header, string width, string align = "left") =>
        new() { Header = header, Width = width, Align = align };

    // A column shown as the small second line under another one
    private static WsReportColumnDto Sub(string header, int under) =>
        new() { Header = header, Width = "0px", Under = under };

    private static string Time(int minutes) =>
        minutes < 60 ? $"{minutes} m" : $"{minutes / 60} h {minutes % 60} m";

    // Technician id -> "code  name"
    private async Task<Dictionary<long, string>> TechnicianNamesAsync()
    {
        Dictionary<long, string> employees = (await Ws.EmployeesAsync(_context)).ToDictionary(x => x.Id, x => x.Name);

        return (await _context.Set<WorkshopTechnicians>().AsNoTracking().Select(x => new { x.WorkshopTechnicianId, x.Code, x.EmployeeId }).ToListAsync())
            .ToDictionary(x => x.WorkshopTechnicianId, x => employees.TryGetValue(x.EmployeeId, out string? name) ? name : x.Code);
    }


    //===========================================================
    // Workshop Dashboard
    //===========================================================

    public async Task<WorkshopDashboardDto> GetDashboardAsync(long? branchId)
    {
        DateOnly today = HrCalendar.Today();

        DateTime now = DateTime.UtcNow;

        Dictionary<long, string> branches = await Ws.BranchNamesAsync(_context);

        List<JobCards> open =
            await _context.Set<JobCards>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status != Ws.Delivered && x.Status != Ws.Cancelled && (branchId == null || x.BranchId == branchId))
                .OrderBy(x => x.CheckInAt)
                .ToListAsync();

        List<long> openIds = open.Select(x => x.JobCardId).ToList();

        // Work that is running now
        var running =
            await _context.Set<JobCardWorkEntries>().AsNoTracking()
                .Where(x => x.EndAt == null && openIds.Contains(x.JobCardId))
                .Select(x => new { x.JobCardId, x.WorkshopTechnicianId, x.WorkshopBayId })
                .ToListAsync();

        Dictionary<long, string> technicians = await TechnicianNamesAsync();

        List<WorkshopBays> bays =
            await _context.Set<WorkshopBays>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && (branchId == null || x.BranchId == branchId))
                .OrderBy(x => x.BranchId).ThenBy(x => x.Code)
                .ToListAsync();

        Dictionary<long, string> bayNames = bays.ToDictionary(x => x.WorkshopBayId, x => x.Name);

        var jobs =
            open.Select(x =>
            {
                var work = running.Where(r => r.JobCardId == x.JobCardId).ToList();

                bool done = x.Status == Ws.WorkDone || x.Status == Ws.Ready || x.Status == Ws.Invoiced;

                return new WorkshopDashboardJobDto
                {
                    PublicId = x.PublicId,
                    JobCardNo = x.JobCardNo,
                    BranchName = branches.TryGetValue(x.BranchId, out string? name) ? name : string.Empty,
                    CustomerName = x.CustomerName,
                    Mobile = x.Mobile,
                    ModelName = x.ModelName,
                    BikeNo = Bike(x.RegistrationNo, x.ChassisNo),
                    JobType = x.JobType,
                    Status = x.Status,
                    CheckInAt = Ws.Utc(x.CheckInAt),
                    PromisedAt = Ws.Utc(x.PromisedAt),
                    IsLate = !done && x.PromisedAt != null && x.PromisedAt < now,
                    Technicians = string.Join(", ", work.Select(r => technicians.TryGetValue(r.WorkshopTechnicianId, out string? t) ? t : string.Empty).Where(t => t.Length > 0).Distinct()),
                    Bays = string.Join(", ", work.Where(r => r.WorkshopBayId != null).Select(r => bayNames.TryGetValue(r.WorkshopBayId!.Value, out string? b) ? b : string.Empty).Where(b => b.Length > 0).Distinct())
                };
            })
            .ToList();

        // Today
        int checkedIn =
            await _context.Set<JobCards>().AsNoTracking()
                .CountAsync(x => !x.IsDeleted && x.Status != Ws.Cancelled && x.JobDate == today && (branchId == null || x.BranchId == branchId));

        var invoices =
            await _context.Set<ServiceInvoices>().AsNoTracking()
                .Where(x => x.Status == Sb.Posted && (branchId == null || x.BranchId == branchId))
                .Select(x => new { x.InvoiceDate, x.GrandTotal, x.PaidAmount })
                .ToListAsync();

        var todayInvoices = invoices.Where(x => x.InvoiceDate == today).ToList();

        decimal due = invoices.Sum(x => x.GrandTotal - x.PaidAmount);

        int waiting = open.Count(x => x.Status == Ws.WaitingParts);

        int ready = open.Count(x => x.Status == Ws.Ready || x.Status == Ws.Invoiced);

        int late = jobs.Count(x => x.IsLate);

        var busy =
            running.Where(r => r.WorkshopBayId != null)
                .GroupBy(r => r.WorkshopBayId!.Value)
                .ToDictionary(g => g.Key, g => string.Join(", ", g.Select(r => open.First(c => c.JobCardId == r.JobCardId).JobCardNo).Distinct()));

        // The jobs of the technicians (owner 2026-11-19) : the first
        // job that is not done is in hand; the later ones, not
        // started yet, wait (as the Job Cards list marks them).
        string[] inHand = { Ws.Assigned, Ws.Allocated, Ws.InProgress, Ws.WaitingParts };

        Dictionary<long, string> employeeNames = (await Ws.EmployeesAsync(_context)).ToDictionary(x => x.Id, x => x.Name);

        static WorkshopQueueJobDto QueueJob(JobCards x) =>
            new() { PublicId = x.PublicId, JobCardNo = x.JobCardNo, CustomerName = x.CustomerName, Status = x.Status };

        List<WorkshopQueueDto> queues =
            open.Where(x => x.TechnicianEmployeeId != null && inHand.Contains(x.Status))
                .OrderBy(x => x.JobCardId)
                .GroupBy(x => x.TechnicianEmployeeId!.Value)
                .Select(g => new WorkshopQueueDto
                {
                    TechnicianName = employeeNames.TryGetValue(g.Key, out string? who) ? who : string.Empty,
                    InHand = QueueJob(g.First()),
                    Waiting = g.Skip(1).Where(x => x.Status == Ws.Assigned || x.Status == Ws.Allocated).Select(QueueJob).ToList()
                })
                .OrderByDescending(x => x.Waiting.Count).ThenBy(x => x.TechnicianName)
                .ToList();

        // The service ramps (owner 2026-11-19) : the jobs given to a
        // bay that are not done, the oldest first - it is on the ramp,
        // the later ones wait for it.
        List<WorkshopRampDto> ramps =
            bays.Select(bay => new WorkshopRampDto
            {
                Name = bay.Name,
                BranchName = branches.TryGetValue(bay.BranchId, out string? center) ? center : string.Empty,
                Jobs =
                    open.Where(x => x.WorkshopBayId == bay.WorkshopBayId && inHand.Contains(x.Status))
                        .OrderBy(x => x.JobCardId)
                        .Select(x => new WorkshopRampJobDto
                        {
                            PublicId = x.PublicId,
                            JobCardNo = x.JobCardNo,
                            CustomerName = x.CustomerName,
                            BikeNo = Bike(x.RegistrationNo, x.ChassisNo),
                            ModelName = x.ModelName,
                            Status = x.Status,
                            TechnicianName = x.TechnicianEmployeeId != null && employeeNames.TryGetValue(x.TechnicianEmployeeId.Value, out string? name) ? name : string.Empty,
                            Working = running.Any(r => r.JobCardId == x.JobCardId),
                            PromisedAt = Ws.Utc(x.PromisedAt),
                            IsLate = x.PromisedAt != null && x.PromisedAt < now
                        })
                        .ToList()
            })
            .ToList();

        return new WorkshopDashboardDto
        {
            Today = HrCalendar.Day(today),
            Queues = queues,
            Ramps = ramps,
            Branches = await Ws.BranchesAsync(_context),
            Tiles =
                new List<WsTileDto>
                {
                    new() { Label = "In the workshop", Value = open.Count.ToString(), Hint = "Job cards not delivered yet", Tone = "blue" },
                    new() { Label = "Checked in today", Value = checkedIn.ToString(), Hint = "Job cards of today", Tone = "slate" },
                    new() { Label = "Waiting for parts", Value = waiting.ToString(), Hint = "See Parts Back-Orders", Tone = waiting > 0 ? "amber" : "slate" },
                    new() { Label = "Ready for delivery", Value = ready.ToString(), Hint = "Ready or invoiced, bike still here", Tone = "green" },
                    new() { Label = "Late", Value = late.ToString(), Hint = "Promised time is over", Tone = late > 0 ? "red" : "slate" },
                    new() { Label = "Invoiced today", Value = Money(todayInvoices.Sum(x => x.GrandTotal)), Hint = $"{todayInvoices.Count} service invoice(s)", Tone = "blue" },
                    new() { Label = "Collected today", Value = Money(todayInvoices.Sum(x => x.PaidAmount)), Hint = "On the invoices of today", Tone = "green" },
                    new() { Label = "Due on invoices", Value = Money(due), Hint = "All posted service invoices", Tone = due > 0m ? "amber" : "slate" }
                },
            Statuses =
                new[] { Ws.Open, Ws.Assigned, Ws.Allocated, Ws.InProgress, Ws.WaitingParts, Ws.WorkDone, Ws.Ready, Ws.Invoiced }
                    .Select(s => new WsTileDto { Label = s, Value = open.Count(x => x.Status == s).ToString() })
                    .ToList(),
            Jobs = jobs,
            Bays =
                bays.Select(x => new WsTileDto
                {
                    Label = x.Name,
                    Hint = branches.TryGetValue(x.BranchId, out string? name) ? name : string.Empty,
                    Value = busy.TryGetValue(x.WorkshopBayId, out string? cards) ? cards : "Free",
                    Tone = busy.ContainsKey(x.WorkshopBayId) ? "blue" : "green"
                }).ToList()
        };
    }


    //===========================================================
    // Service Reports
    //===========================================================

    public async Task<WsReportDto> GetReportAsync(string report, string? from, string? to, long? branchId, string? text)
    {
        DateOnly today = HrCalendar.Today();

        bool dueList = report == "service-due-list";

        // The due list looks ahead; the others look back
        DateOnly start = HrCalendar.ParseDay(from) ?? (dueList ? today.AddDays(-30) : new DateOnly(today.Year, today.Month, 1));
        DateOnly end = HrCalendar.ParseDay(to) ?? (dueList ? today.AddDays(30) : today);

        if (end < start)
        {
            throw new InvalidOperationException("The To date cannot be before the From date.");
        }

        string find = (text ?? string.Empty).Trim().ToLower();

        var result =
            new WsReportDto
            {
                From = HrCalendar.Day(start),
                To = HrCalendar.Day(end),
                Branches = await Ws.BranchesAsync(_context)
            };

        switch (report)
        {
            case "service-history":
                await ServiceHistoryAsync(result, start, end, branchId, find);
                break;

            case "job-card-register":
                await JobCardRegisterAsync(result, start, end, branchId, find);
                break;

            case "technician-performance":
                await TechnicianPerformanceAsync(result, start, end, branchId, find);
                break;

            case "parts-consumption":
                await PartsConsumptionAsync(result, start, end, branchId, find);
                break;

            case "service-due-list":
                await ServiceDueListAsync(result, start, end, branchId, find);
                break;

            case "work-in-progress":
                await WorkInProgressAsync(result, branchId, find);
                break;

            default:
                throw new KeyNotFoundException("The report was not found.");
        }

        if (result.Rows.Count > Limit)
        {
            result.Rows = result.Rows.Take(Limit).ToList();
            result.Cut = true;
        }

        return result;
    }

    private IQueryable<JobCards> CardsOf(DateOnly start, DateOnly end, long? branchId, string find) =>
        _context.Set<JobCards>().AsNoTracking()
            .Where(x => !x.IsDeleted && x.JobDate >= start && x.JobDate <= end && (branchId == null || x.BranchId == branchId))
            .Where(x => find == string.Empty
                        || x.JobCardNo.ToLower().Contains(find)
                        || x.CustomerName.ToLower().Contains(find)
                        || x.Mobile.ToLower().Contains(find)
                        || x.ChassisNo.ToLower().Contains(find)
                        || x.RegistrationNo.ToLower().Contains(find)
                        || x.EngineNo.ToLower().Contains(find)
                        || x.ModelName.ToLower().Contains(find));

    private async Task<Dictionary<long, ServiceInvoices>> InvoicesOfAsync(List<long> cardIds) =>
        (await _context.Set<ServiceInvoices>().AsNoTracking().Where(x => x.Status == Sb.Posted && cardIds.Contains(x.JobCardId)).ToListAsync())
        .GroupBy(x => x.JobCardId)
        .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.ServiceInvoiceId).First());

    // What was done to a bike, newest first : find it by chassis,
    // registration, mobile or customer
    private async Task ServiceHistoryAsync(WsReportDto result, DateOnly start, DateOnly end, long? branchId, string find)
    {
        List<JobCards> cards =
            await CardsOf(start, end, branchId, find).Where(x => x.Status != Ws.Cancelled).OrderByDescending(x => x.JobDate).ThenByDescending(x => x.JobCardId).Take(Limit + 1).ToListAsync();

        List<long> ids = cards.Select(x => x.JobCardId).ToList();

        var services =
            (await _context.Set<JobCardServices>().AsNoTracking().Where(x => ids.Contains(x.JobCardId)).OrderBy(x => x.LineNo).Select(x => new { x.JobCardId, x.ItemName }).ToListAsync())
            .ToLookup(x => x.JobCardId, x => x.ItemName);

        var parts =
            (await (from line in _context.Set<PartsIssueLines>().AsNoTracking()
                    join issue in _context.Set<PartsIssues>().AsNoTracking() on line.PartsIssueId equals issue.PartsIssueId
                    where ids.Contains(issue.JobCardId) && line.Quantity > line.ReturnedQuantity
                    select new { issue.JobCardId, line.ItemName }).ToListAsync())
            .ToLookup(x => x.JobCardId, x => x.ItemName);

        Dictionary<long, ServiceInvoices> invoices = await InvoicesOfAsync(ids);

        result.Columns =
            new()
            {
                Sub("Date", 1), Col("Job Card", "210px"), Col("Type", "115px"), Col("Customer", "160px"), Sub("Mobile", 3),
                Col("Model", "140px"), Sub("Bike", 5), Col("Km", "65px", "right"), Col("Work Done", "200px"), Col("Parts Used", "200px"),
                Col("Invoice", "205px"), Col("Total", "100px", "right"), Col("Status", "105px")
            };

        decimal total = 0m;

        foreach (JobCards x in cards)
        {
            invoices.TryGetValue(x.JobCardId, out ServiceInvoices? invoice);

            total += invoice?.GrandTotal ?? 0m;

            result.Rows.Add(new()
            {
                HrCalendar.Day(x.JobDate), x.JobCardNo, x.JobType, x.CustomerName, x.Mobile, x.ModelName, Bike(x.RegistrationNo, x.ChassisNo),
                x.KmReading?.ToString() ?? string.Empty,
                string.Join(", ", services[x.JobCardId]),
                string.Join(", ", parts[x.JobCardId].Distinct()),
                invoice?.InvoiceNo ?? string.Empty,
                invoice == null ? string.Empty : Money(invoice.GrandTotal),
                x.Status
            });
        }

        result.Totals = new() { string.Empty, $"{cards.Count} job(s)", "", "", "", "", "", "", "", "", "", Money(total), "" };
    }

    private async Task JobCardRegisterAsync(WsReportDto result, DateOnly start, DateOnly end, long? branchId, string find)
    {
        List<JobCards> cards =
            await CardsOf(start, end, branchId, find).OrderBy(x => x.JobDate).ThenBy(x => x.JobCardId).Take(Limit + 1).ToListAsync();

        List<long> ids = cards.Select(x => x.JobCardId).ToList();

        Dictionary<long, ServiceInvoices> invoices = await InvoicesOfAsync(ids);

        Dictionary<long, string> branches = await Ws.BranchNamesAsync(_context);

        Dictionary<long, string> employees = (await Ws.EmployeesAsync(_context)).ToDictionary(x => x.Id, x => x.Name);

        result.Columns =
            new()
            {
                Col("Job Card", "210px"), Sub("Date", 0), Col("Center / Advisor", "160px"), Col("Customer", "160px"), Sub("Mobile", 3),
                Col("Model", "140px"), Sub("Bike", 5), Col("Type", "115px"), Sub("Advisor", 2), Col("Status", "105px"),
                Col("Labour", "95px", "right"), Col("Parts", "95px", "right"), Col("Invoice", "205px"), Col("Invoiced", "100px", "right"), Col("Due", "90px", "right")
            };

        decimal labour = 0m, parts = 0m, billed = 0m, due = 0m;

        foreach (JobCards x in cards)
        {
            invoices.TryGetValue(x.JobCardId, out ServiceInvoices? invoice);

            labour += x.LabourTotal;
            parts += x.PartsTotal;
            billed += invoice?.GrandTotal ?? 0m;
            due += invoice == null ? 0m : invoice.GrandTotal - invoice.PaidAmount;

            result.Rows.Add(new()
            {
                x.JobCardNo, HrCalendar.Day(x.JobDate), branches.TryGetValue(x.BranchId, out string? branch) ? branch : string.Empty, x.CustomerName, x.Mobile,
                x.ModelName, Bike(x.RegistrationNo, x.ChassisNo), x.JobType,
                x.AdvisorEmployeeId != null && employees.TryGetValue(x.AdvisorEmployeeId.Value, out string? advisor) ? advisor : string.Empty,
                x.Status, Money(x.LabourTotal), Money(x.PartsTotal),
                invoice?.InvoiceNo ?? string.Empty,
                invoice == null ? string.Empty : Money(invoice.GrandTotal),
                invoice == null || invoice.GrandTotal == invoice.PaidAmount ? string.Empty : Money(invoice.GrandTotal - invoice.PaidAmount)
            });
        }

        result.Totals = new() { $"{cards.Count} job(s)", "", "", "", "", "", "", "", "", "", Money(labour), Money(parts), "", Money(billed), Money(due) };
    }

    // The time stamps of the technicians (work entries started in
    // the period)
    private async Task TechnicianPerformanceAsync(WsReportDto result, DateOnly start, DateOnly end, long? branchId, string find)
    {
        DateTime fromAt = DateTime.SpecifyKind(start.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        DateTime toAt = DateTime.SpecifyKind(end.AddDays(1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);

        var entries =
            await (from entry in _context.Set<JobCardWorkEntries>().AsNoTracking()
                   join card in _context.Set<JobCards>().AsNoTracking() on entry.JobCardId equals card.JobCardId
                   where !card.IsDeleted && entry.StartAt >= fromAt && entry.StartAt < toAt && (branchId == null || card.BranchId == branchId)
                   select new { entry.WorkshopTechnicianId, entry.JobCardId, entry.StartAt, entry.EndAt, card.Status, card.LabourTotal })
                .ToListAsync();

        Dictionary<long, string> names = await TechnicianNamesAsync();

        Dictionary<long, string> codes =
            (await _context.Set<WorkshopTechnicians>().AsNoTracking().Select(x => new { x.WorkshopTechnicianId, x.Code }).ToListAsync())
            .ToDictionary(x => x.WorkshopTechnicianId, x => x.Code);

        result.Columns =
            new()
            {
                Col("Technician", "110px", "center"), Col("Name", "220px"), Col("Jobs", "80px", "right"), Col("Jobs Finished", "110px", "right"),
                Col("Work Entries", "110px", "right"), Col("Time Worked", "120px", "right"), Col("Average per Job", "130px", "right"),
                Col("Running Now", "110px", "right"), Col("Labour of the Jobs", "150px", "right")
            };

        int allMinutes = 0;

        var groups =
            entries.GroupBy(x => x.WorkshopTechnicianId)
                .Select(g => new
                {
                    Code = codes.TryGetValue(g.Key, out string? code) ? code : string.Empty,
                    Name = names.TryGetValue(g.Key, out string? name) ? name : string.Empty,
                    Jobs = g.Select(x => x.JobCardId).Distinct().Count(),
                    Finished = g.Where(x => x.Status != Ws.Open && x.Status != Ws.Assigned && x.Status != Ws.InProgress && x.Status != Ws.WaitingParts && x.Status != Ws.Cancelled).Select(x => x.JobCardId).Distinct().Count(),
                    Entries = g.Count(),
                    Minutes = (int)Math.Round(g.Where(x => x.EndAt != null).Sum(x => (x.EndAt!.Value - x.StartAt).TotalMinutes)),
                    Running = g.Count(x => x.EndAt == null),
                    Labour = g.GroupBy(x => x.JobCardId).Sum(j => j.First().LabourTotal)
                })
                .Where(x => find.Length == 0 || x.Name.ToLower().Contains(find) || x.Code.ToLower().Contains(find))
                .OrderByDescending(x => x.Minutes)
                .ToList();

        foreach (var x in groups)
        {
            allMinutes += x.Minutes;

            result.Rows.Add(new()
            {
                x.Code, x.Name, x.Jobs.ToString(), x.Finished.ToString(), x.Entries.ToString(), Time(x.Minutes),
                x.Jobs == 0 ? string.Empty : Time(x.Minutes / x.Jobs), x.Running.ToString(), Money(x.Labour)
            });
        }

        result.Totals = new() { $"{groups.Count} technician(s)", "", "", "", groups.Sum(x => x.Entries).ToString(), Time(allMinutes), "", groups.Sum(x => x.Running).ToString(), "" };
    }

    // The parts issued to job cards in the period, less what came back
    private async Task PartsConsumptionAsync(WsReportDto result, DateOnly start, DateOnly end, long? branchId, string find)
    {
        var lines =
            await (from line in _context.Set<PartsIssueLines>().AsNoTracking()
                   join issue in _context.Set<PartsIssues>().AsNoTracking() on line.PartsIssueId equals issue.PartsIssueId
                   where issue.IssueDate >= start && issue.IssueDate <= end && (branchId == null || issue.BranchId == branchId)
                   select new { line.ItemKind, line.ItemId, line.ItemCode, line.ItemName, line.Quantity, line.ReturnedQuantity, line.Cost, line.ReturnedCost, issue.JobCardId })
                .ToListAsync();

        result.Columns =
            new()
            {
                Sub("Part No", 1), Col("Part", "300px"), Col("Kind", "130px"), Col("Jobs", "100px", "right"), Col("Issued", "110px", "right"),
                Col("Returned", "110px", "right"), Col("Used", "110px", "right"), Col("Cost of Used", "140px", "right"), Col("Average Cost", "140px", "right")
            };

        var groups =
            lines.GroupBy(x => new { x.ItemKind, x.ItemId })
                .Select(g => new
                {
                    g.First().ItemCode,
                    g.First().ItemName,
                    Kind = g.Key.ItemKind == Wp.Accessory ? "Accessory" : "Spare Part",
                    Jobs = g.Select(x => x.JobCardId).Distinct().Count(),
                    Issued = g.Sum(x => x.Quantity),
                    Returned = g.Sum(x => x.ReturnedQuantity),
                    Cost = g.Sum(x => x.Cost - x.ReturnedCost)
                })
                .Where(x => find.Length == 0 || x.ItemCode.ToLower().Contains(find) || x.ItemName.ToLower().Contains(find))
                .OrderByDescending(x => x.Cost)
                .ToList();

        foreach (var x in groups)
        {
            decimal used = x.Issued - x.Returned;

            result.Rows.Add(new()
            {
                x.ItemCode, x.ItemName, x.Kind, x.Jobs.ToString(), Wp.Qty(x.Issued), Wp.Qty(x.Returned), Wp.Qty(used), Money(x.Cost),
                used > 0m ? Money(Ws.Round(x.Cost / used)) : string.Empty
            });
        }

        result.Totals = new() { $"{groups.Count} item(s)", "", "", "", Wp.Qty(groups.Sum(x => x.Issued)), Wp.Qty(groups.Sum(x => x.Returned)), Wp.Qty(groups.Sum(x => x.Issued - x.Returned)), Money(groups.Sum(x => x.Cost)), "" };
    }

    // Work In Progress (owner 2026-11-19) : the parts that sit on the
    // jobs not invoiced yet, job by job - issued from the store (less
    // what came back) and bought outside for the job. As of now : the
    // period is not used. Its total is what the Workshop WIP ledgers
    // hold for parts.
    //
    // A line a part of the job (owner 2026-11-19) : what the job was
    // allocated (Job Card Requirements), what it has got, what is
    // still to issue. A part allocated and not issued yet is listed
    // too, once the job has a part on it.
    private sealed record WipLine(string ItemCode, string ItemName, string No, DateOnly? Date, decimal? Allocated, decimal Issued, decimal Returned, decimal Cost)
    {
        public decimal OnJob => Issued - Returned;

        // a bought part has no allocation : nothing remains
        public decimal Remaining => Allocated.HasValue ? Math.Max(0m, Allocated.Value - OnJob) : 0m;
    }

    private async Task WorkInProgressAsync(WsReportDto result, long? branchId, string find)
    {
        DateOnly today = HrCalendar.Today();

        result.From = HrCalendar.Day(today);
        result.To = HrCalendar.Day(today);

        var cards =
            await _context.Set<JobCards>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status != Ws.Invoiced && x.Status != Ws.Delivered && (branchId == null || x.BranchId == branchId))
                .Select(x => new { x.JobCardId, x.JobCardNo, x.JobDate, x.WelcomeTokenNo, x.CustomerName, x.RegistrationNo, x.ChassisNo, x.TechnicianEmployeeId, x.Status })
                .ToListAsync();

        List<long> cardIds = cards.Select(x => x.JobCardId).ToList();

        var issued =
            await (from line in _context.Set<PartsIssueLines>().AsNoTracking()
                   join issue in _context.Set<PartsIssues>().AsNoTracking() on line.PartsIssueId equals issue.PartsIssueId
                   where cardIds.Contains(issue.JobCardId) && line.Quantity - line.ReturnedQuantity > 0m
                   orderby issue.IssueDate, issue.PartsIssueId, line.LineNo
                   select new { issue.JobCardId, line.ItemKind, line.ItemId, line.ItemCode, line.ItemName, issue.MisNo, issue.IssueNo, issue.IssueDate, line.Quantity, line.ReturnedQuantity, line.Cost, line.ReturnedCost })
                .ToListAsync();

        // what the jobs were allocated (Job Card Requirements)
        var allocated =
            await _context.Set<JobCardParts>().AsNoTracking()
                .Where(x => cardIds.Contains(x.JobCardId) && x.ItemId != null && (x.ItemKind == Wp.SparePart || x.ItemKind == Wp.Accessory))
                .OrderBy(x => x.LineNo)
                .Select(x => new { x.JobCardId, x.ItemKind, ItemId = x.ItemId!.Value, x.ItemCode, x.ItemName, x.Quantity })
                .ToListAsync();

        var bought =
            await _context.Set<JobCardOutsourcedParts>().AsNoTracking()
                .Where(x => cardIds.Contains(x.JobCardId) && x.Status != "Cancelled")
                .OrderBy(x => x.PurchaseDate).ThenBy(x => x.JobCardOutsourcedPartId)
                .Select(x => new { x.JobCardId, x.ItemCode, x.ItemName, x.PurchaseNo, x.PurchaseDate, x.Quantity, x.CostAmount })
                .ToListAsync();

        Dictionary<long, string> employees = (await Ws.EmployeesAsync(_context)).ToDictionary(x => x.Id, x => x.Name);

        result.Columns =
            new()
            {
                // no bike, no technician here (owner 2026-11-19)
                // under the job card no : its date || its serial token
                Col("Job Card", "260px"), Sub("Job Date", 0), new() { Header = "Token", Width = "0px", Under = 0, Figure = true }, Col("Days", "70px", "right"),
                Col("Customer", "210px"),
                Sub("Part No", 6), Col("Part", "240px"), Col("Issue", "250px"), Sub("Date", 7),
                Col("Allocated", "95px", "right"), Col("Issued", "85px", "right"), Col("Returned", "90px", "right"), Col("On Job", "85px", "right"),
                // the rate (owner 2026-11-19) : the cost on the job a piece
                Col("Remaining", "100px", "right"), Col("Rate", "100px", "right"), Col("Cost", "115px", "right")
            };

        result.GroupColumns = 5;

        int jobs = 0;
        decimal allAllocated = 0m, allIssued = 0m, allReturned = 0m, allRemaining = 0m, allCost = 0m;

        foreach (var card in cards.OrderBy(x => x.JobDate).ThenBy(x => x.JobCardNo))
        {
            // 1118004 : the month and the day of the job, the serial
            // of its welcome token
            string serial = (card.WelcomeTokenNo ?? string.Empty).Trim();

            if (serial.StartsWith("W-", StringComparison.OrdinalIgnoreCase))
            {
                serial = serial.Substring(2);
            }

            string token = serial.Length == 0 ? string.Empty : card.JobDate.ToString("MMdd") + serial;

            string technician =
                card.TechnicianEmployeeId.HasValue && employees.TryGetValue(card.TechnicianEmployeeId.Value, out string? name) ? name : string.Empty;

            bool jobMatches =
                find.Length == 0
                || card.JobCardNo.ToLower().Contains(find)
                || card.CustomerName.ToLower().Contains(find)
                || card.RegistrationNo.ToLower().Contains(find)
                || card.ChassisNo.ToLower().Contains(find)
                || token.Contains(find)
                || technician.ToLower().Contains(find);

            var cardIssued = issued.Where(x => x.JobCardId == card.JobCardId).ToList();
            var cardBought = bought.Where(x => x.JobCardId == card.JobCardId).ToList();

            // nothing sits on the job
            if (cardIssued.Count == 0 && cardBought.Count == 0)
            {
                continue;
            }

            Dictionary<string, decimal> allocatedOf =
                allocated.Where(x => x.JobCardId == card.JobCardId)
                    .GroupBy(x => $"{x.ItemKind}:{x.ItemId}")
                    .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity));

            HashSet<string> got = cardIssued.Select(x => $"{x.ItemKind}:{x.ItemId}").ToHashSet();

            List<WipLine> lines =
                // issued from the store : a line a part, its slips together
                cardIssued
                    .GroupBy(x => $"{x.ItemKind}:{x.ItemId}")
                    .Select(g => new WipLine(
                        g.First().ItemCode,
                        g.First().ItemName,
                        string.Join(", ", g.Select(x => x.MisNo.Length > 0 ? x.MisNo : x.IssueNo).Distinct()),
                        g.Max(x => x.IssueDate),
                        allocatedOf.GetValueOrDefault(g.Key, 0m),
                        g.Sum(x => x.Quantity),
                        g.Sum(x => x.ReturnedQuantity),
                        g.Sum(x => x.Cost - x.ReturnedCost)))
                    // allocated, not issued yet
                    .Concat(
                        allocated.Where(x => x.JobCardId == card.JobCardId && !got.Contains($"{x.ItemKind}:{x.ItemId}"))
                            .GroupBy(x => $"{x.ItemKind}:{x.ItemId}")
                            .Select(g => new WipLine(g.First().ItemCode, g.First().ItemName, "Not issued yet", null, g.Sum(x => x.Quantity), 0m, 0m, 0m)))
                    // bought outside for the job : no allocation
                    .Concat(
                        cardBought.Select(x => new WipLine(x.ItemCode, x.ItemName, x.PurchaseNo + " (bought)", x.PurchaseDate, null, x.Quantity, 0m, x.CostAmount)))
                    .Where(x => jobMatches || x.ItemCode.ToLower().Contains(find) || x.ItemName.ToLower().Contains(find))
                    .ToList();

            if (lines.Count == 0)
            {
                continue;
            }

            jobs++;

            List<string> head =
                new()
                {
                    card.JobCardNo, HrCalendar.Day(card.JobDate), token, (today.DayNumber - card.JobDate.DayNumber).ToString(),
                    card.CustomerName
                };

            foreach (var x in lines)
            {
                List<string> row = new(head);

                row.AddRange(new[]
                {
                    x.ItemCode, x.ItemName, x.No, x.Date.HasValue ? HrCalendar.Day(x.Date.Value) : string.Empty,
                    x.Allocated.HasValue ? Wp.Qty(x.Allocated.Value) : string.Empty,
                    Wp.Qty(x.Issued), Wp.Qty(x.Returned), Wp.Qty(x.OnJob),
                    x.Allocated.HasValue ? Wp.Qty(x.Remaining) : string.Empty,
                    x.OnJob > 0m ? Money(Ws.Round(x.Cost / x.OnJob)) : string.Empty, Money(x.Cost)
                });

                result.Rows.Add(row);
            }

            result.GroupTotals.Add(new()
            {
                "", "", "", "", "", "", $"{lines.Count} line(s)", "", "",
                Wp.Qty(lines.Sum(x => x.Allocated ?? 0m)), Wp.Qty(lines.Sum(x => x.Issued)), Wp.Qty(lines.Sum(x => x.Returned)), Wp.Qty(lines.Sum(x => x.OnJob)),
                Wp.Qty(lines.Sum(x => x.Remaining)), "", Money(lines.Sum(x => x.Cost))
            });

            allAllocated += lines.Sum(x => x.Allocated ?? 0m);
            allRemaining += lines.Sum(x => x.Remaining);
            allIssued += lines.Sum(x => x.Issued);
            allReturned += lines.Sum(x => x.Returned);
            allCost += lines.Sum(x => x.Cost);
        }

        result.Totals = new()
        {
            $"{jobs} job(s)", "", "", "", "", "", "", "", "",
            Wp.Qty(allAllocated), Wp.Qty(allIssued), Wp.Qty(allReturned), Wp.Qty(allIssued - allReturned), Wp.Qty(allRemaining), "", Money(allCost)
        };
    }

    // The bikes whose next service falls due in the period (not
    // taken, not skipped)
    private async Task ServiceDueListAsync(WsReportDto result, DateOnly start, DateOnly end, long? branchId, string find)
    {
        DateOnly today = HrCalendar.Today();

        var rows =
            await (from schedule in _context.Set<ServiceVehicleSchedules>().AsNoTracking()
                   join vehicle in _context.Set<ServiceVehicles>().AsNoTracking() on schedule.ServiceVehicleId equals vehicle.ServiceVehicleId
                   where !vehicle.IsDeleted && vehicle.IsActive
                         && (schedule.Status == "Upcoming" || schedule.Status == "Enquired")
                         && schedule.DueDate >= start && schedule.DueDate <= end
                         && (branchId == null || vehicle.BranchId == branchId)
                         && (find == string.Empty
                             || vehicle.CustomerName.ToLower().Contains(find)
                             || vehicle.Mobile.ToLower().Contains(find)
                             || vehicle.ChassisNo.ToLower().Contains(find)
                             || vehicle.RegistrationNo.ToLower().Contains(find)
                             || vehicle.ModelName.ToLower().Contains(find))
                   orderby schedule.DueDate, vehicle.CustomerName
                   select new
                   {
                       schedule.DueDate, schedule.LastDate, schedule.DueKm, schedule.ServiceType, schedule.ServiceName, schedule.SequenceNo, schedule.Status, schedule.EnquiryNo,
                       vehicle.CustomerName, vehicle.Mobile, vehicle.ModelName, vehicle.RegistrationNo, vehicle.ChassisNo, vehicle.BranchName, vehicle.LastKm
                   })
                .Take(Limit + 1)
                .ToListAsync();

        result.Columns =
            new()
            {
                Col("Due Date", "115px", "center"), Col("Last Date", "115px", "center"), Col("State", "105px"), Col("Customer", "170px"), Sub("Mobile", 3),
                Col("Model", "150px"), Sub("Bike", 5), Col("Service", "200px"), Sub("Type", 7), Col("Due Km", "85px", "right"),
                Col("Last Km", "85px", "right"), Col("Enquiry", "190px"), Col("Service Center", "160px")
            };

        foreach (var x in rows)
        {
            string state =
                x.Status == "Enquired" ? "Enquired"
                : x.LastDate < today ? "Missed"
                : x.DueDate <= today ? "Due now"
                : "Coming";

            result.Rows.Add(new()
            {
                HrCalendar.Day(x.DueDate), HrCalendar.Day(x.LastDate), state, x.CustomerName, x.Mobile, x.ModelName, Bike(x.RegistrationNo, x.ChassisNo),
                x.ServiceName.Length > 0 ? x.ServiceName : $"Service {x.SequenceNo}", x.ServiceType, x.DueKm > 0 ? x.DueKm.ToString() : string.Empty,
                x.LastKm?.ToString() ?? string.Empty, x.EnquiryNo, x.BranchName
            });
        }

        result.Totals = new() { $"{rows.Count} service(s)", "", "", "", "", "", "", "", "", "", "", "", "" };
    }
}
