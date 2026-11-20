//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Application.Platform.Accounting;
using AppCore.Application.ServiceOperations;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Entities.ServiceOperations;
using AppCore.Domain.Entities.Settings.ClientSettings;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Domain.Entities.Settings.ProductSettings;
using AppCore.Domain.Entities.Settings.ServiceSettings;
using AppCore.Domain.Platform.Accounting;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.ServiceOperations;


//===============================================================
// What the workshop repositories share (hand-written pages,
// 2026-11-15; NEVER run Code Sync for them; tables made by
// ServiceOperations_Workshop_Engine.sql)
//===============================================================

internal static class Ws
{
    public const string HistoryModule = "Service Operations";

    //-----------------------------------------------------------
    // Job card statuses
    //-----------------------------------------------------------

    public const string Open = "Open";

    // The service engineer, the bay and the technicians are given
    public const string Assigned = "Assigned";

    // Job Card Requirements : the parts and the service charges of
    // the job are allocated (ready for parts and service issue)
    public const string Allocated = "Allocated";

    public const string InProgress = "In Progress";

    public const string WaitingParts = "Waiting Parts";

    public const string WorkDone = "Work Done";

    public const string Ready = "Ready";

    public const string Invoiced = "Invoiced";

    public const string Delivered = "Delivered";

    public const string Cancelled = "Cancelled";

    // The lines of the card may still be changed
    public static readonly string[] Editable = { Open, Assigned, Allocated, InProgress, WaitingParts };

    // Work, parts and outsourcing can go on : the card is assigned
    // and not done (the stages go strictly in order)
    public static readonly string[] Workable = { Allocated, InProgress, WaitingParts };

    // Job Card Requirements : the parts and the service charges can
    // be allocated (an assigned card that is not in work yet)
    public static readonly string[] Allocatable = { Assigned, Allocated };

    public static string NotWorkable(string jobCardNo, string status) =>
        status == Open
            ? $"{jobCardNo} is not assigned yet : assign it first (Job Card Assignment)."
            : status == Assigned
                ? $"{jobCardNo} has no parts or service charges allocated yet : allocate them first (Job Card Requirements)."
                : $"{jobCardNo} is {status}";

    // The stage a card has reached : 1 Opening, 2 Assignment,
    // 3 Work, 4 Closing, 5 Billing, 6 Delivery (0 : cancelled).
    // Closing and Billing are one step (the service invoice)
    // until they are split.
    public static int StageNo(string status) =>
        status switch
        {
            Open => 1,
            Assigned or Allocated => 2,
            InProgress or WaitingParts or WorkDone or Ready => 3,
            Invoiced => 5,
            Delivered => 6,
            _ => 0
        };

    // The bike has left (or never came) : another card may be opened
    public static readonly string[] Closed = { Delivered, Cancelled };

    // Where a card can go from a status (Invoiced / Delivered are set
    // by Service Invoices, later)
    public static List<string> Next(string status) =>
        status switch
        {
            // Assigned comes by Job Card Assignment only
            Open => new() { Cancelled },
            // Allocated comes by Job Card Requirements only
            Assigned => new() { Open, Cancelled },
            Allocated => new() { InProgress, Cancelled },
            InProgress => new() { WaitingParts, WorkDone, Cancelled },
            WaitingParts => new() { InProgress, Cancelled },
            WorkDone => new() { Ready, InProgress },
            Ready => new() { InProgress },
            Cancelled => new() { Open },
            _ => new()
        };

    public static readonly string[] JobTypes =
    {
        "Free Service", "Paid Service", "General Repair", "Warranty", "Membership Service", "Rework", "Internal"
    };

    public const string Internal = "Internal";

    public static readonly string[] FuelLevels = { "Empty", "Quarter", "Half", "Three Quarter", "Full" };

    public static readonly string[] ChecklistResults = { "", "OK", "Not OK", "N/A" };

    //-----------------------------------------------------------
    // Helpers
    //-----------------------------------------------------------

    public static decimal Round(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    public static string Clean(string? value, int max, string label)
    {
        string text = (value ?? string.Empty).Trim();

        if (text.Length > max)
        {
            throw new InvalidOperationException($"{label} : {max} characters at most.");
        }

        return text;
    }

    // BAY-0001 (digits 4), JC-000001 (digits 6) : deleted rows count
    public static string NextCode(IEnumerable<string> codes, string prefix, int digits = 4)
    {
        int highest = 0;

        foreach (string code in codes)
        {
            string value = (code ?? string.Empty).Trim();

            if (value.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value.Substring(prefix.Length), out int number)
                && number > highest)
            {
                highest = number;
            }
        }

        return prefix + (highest + 1).ToString().PadLeft(digits, '0');
    }

    // Times go to the database as UTC
    public static DateTime? Utc(DateTime? value) =>
        value == null ? null
        : value.Value.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
        : value.Value.ToUniversalTime();

    public static void AddHistory(AppDbContext context, string entity, long id, string type, string title, string description, long userId)
    {
        context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = entity,
                EntityId = id,
                ActivityType = type,
                ActivityTitle = title,
                ActivityDescription = description.Length > 1000 ? description.Substring(0, 1000) : description,
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });
    }

    public static async Task<Dictionary<long, string>> BranchNamesAsync(AppDbContext context) =>
        (await context.Set<Branches>().AsNoTracking().Select(x => new { x.BranchId, x.BranchName }).ToListAsync())
        .ToDictionary(x => x.BranchId, x => x.BranchName);

    // The service centers : the active branches under the Service
    // Center wing. The wing is told by its number, as everywhere
    // (owner 2026-11-13) : wing code WNG-<company>-02, else branch
    // code BRN-<company>-02-<n>. No wing names are used.
    public static async Task<List<WsLookupDto>> BranchesAsync(AppDbContext context)
    {
        var branches =
            await context.Set<Branches>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.BranchName)
                .Select(x => new { x.BranchId, x.BranchCode, x.BranchName, x.WingId })
                .ToListAsync();

        Dictionary<long, string> wingCodes =
            (await context.Set<Wings>().AsNoTracking().Select(x => new { x.WingId, x.WingCode }).ToListAsync())
            .ToDictionary(x => x.WingId, x => x.WingCode);

        return branches
            .Where(x => WingNo(wingCodes.TryGetValue(x.WingId, out string? wingCode) ? wingCode : string.Empty, x.BranchCode) == ServiceCenterWingNo)
            .Select(x => new WsLookupDto { Id = x.BranchId, Code = x.BranchCode, Name = x.BranchName, BranchId = x.BranchId })
            .ToList();
    }

    // 01 Sales Center, 02 Service Center, 03 Accessory Shop
    private const int ServiceCenterWingNo = 2;

    // WNG-<company>-<wing>, else BRN-<company>-<wing>-<n>; 0 : not told
    private static int WingNo(string? wingCode, string? branchCode)
    {
        string[] wing = (wingCode ?? string.Empty).Trim().Split('-');

        if (wing.Length >= 3 && wing[2].Length > 0 && wing[2].All(char.IsDigit) && int.TryParse(wing[2], out int byWing))
        {
            return byWing;
        }

        string[] branch = (branchCode ?? string.Empty).Trim().Split('-');

        return branch.Length >= 4 && branch[2].Length > 0 && branch[2].All(char.IsDigit) && int.TryParse(branch[2], out int byBranch)
            ? byBranch
            : 0;
    }

    public static async Task<List<WsLookupDto>> EmployeesAsync(AppDbContext context) =>
        await context.Set<HrEmployees>().AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .OrderBy(x => x.Code)
            .Select(x => new WsLookupDto { Id = x.EmployeeId, Code = x.Code, Name = x.FullName, BranchId = x.BranchId })
            .ToListAsync();

    // The employees who can be technicians : active employees of the
    // departments under the Service Center wing (Department page >
    // Wing). An employee who is a technician already stays on the
    // list, so the technician can still be shown.
    public static async Task<List<WsLookupDto>> TechnicianEmployeesAsync(AppDbContext context)
    {
        List<long> wingIds =
            (await context.Set<Wings>().AsNoTracking().Select(x => new { x.WingId, x.WingCode }).ToListAsync())
            .Where(x => WingNo(x.WingCode, string.Empty) == ServiceCenterWingNo)
            .Select(x => x.WingId)
            .ToList();

        List<long> departmentIds =
            await context.Set<global::AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup.Department>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.WingId != null && wingIds.Contains(x.WingId.Value))
                .Select(x => x.DepartmentId)
                .ToListAsync();

        List<long> technicianIds =
            await context.Set<WorkshopTechnicians>().AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => x.EmployeeId)
                .ToListAsync();

        return await context.Set<HrEmployees>().AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive && (departmentIds.Contains(x.DepartmentId) || technicianIds.Contains(x.EmployeeId)))
            .OrderBy(x => x.Code)
            .Select(x => new WsLookupDto { Id = x.EmployeeId, Code = x.Code, Name = x.FullName, BranchId = x.BranchId })
            .ToListAsync();
    }

    // The business line a part belongs to (Business Configuration)
    public static string PartLine(string? kind) =>
        (kind ?? string.Empty).Trim() == "Accessory" ? AppCore.Infrastructure.Repositories.Settings.GeneralSettings.BusinessLineAccess.Accessories : AppCore.Infrastructure.Repositories.Settings.GeneralSettings.BusinessLineAccess.SpareParts;

    // The business lines a service center runs today : the core
    // lines of its wing and the extra ones granted to it
    public static async Task<HashSet<string>> BranchLinesAsync(AppDbContext context, long branchId)
    {
        Dictionary<long, HashSet<string>> lines =
            await AppCore.Infrastructure.Repositories.Settings.GeneralSettings.BusinessLineAccess.ActiveLinesByBranchAsync(context, AppCore.Infrastructure.Repositories.Settings.GeneralSettings.BusinessLineAccess.Today());

        return lines.TryGetValue(branchId, out HashSet<string>? own) ? own : new HashSet<string>();
    }

    public static async Task<WorkshopSwitchesDto> SwitchesAsync(AppDbContext context)
    {
        WorkshopConfiguration row =
            await context.Set<WorkshopConfiguration>().AsNoTracking().OrderBy(x => x.WorkshopConfigurationId).FirstOrDefaultAsync()
            ?? new WorkshopConfiguration();

        return new WorkshopSwitchesDto
        {
            RequireKm = row.RequireKm,
            RequireChecklist = row.RequireChecklist,
            RequireEstimate = row.RequireEstimate,
            IssueWithoutRequisition = row.IssueWithoutRequisition,
            IssueToMultipleJobs = row.IssueToMultipleJobs,
            IssueBulkPerJob = row.IssueBulkPerJob,
            AllowCreditInvoice = row.AllowCreditInvoice,
            EstimateChargeServiceId = row.EstimateChargeServiceId,
            DiagnosisSuggests = row.DiagnosisSuggests
        };
    }
}


//===============================================================
// Workshop Configuration : bays, technicians, the check-in
// checklist and the switches
//===============================================================

public class WorkshopSetupRepository
    : IWorkshopSetupRepository
{
    private const string BayPrefix = "BAY-";

    private const string TechnicianPrefix = "TEC-";

    private const string ChecklistPrefix = "CHK-";

    private const string Entity = "Workshop";

    private readonly AppDbContext _context;

    public WorkshopSetupRepository(AppDbContext context)
    {
        _context = context;
    }

    private DbSet<WorkshopBays> Bays => _context.Set<WorkshopBays>();

    private DbSet<WorkshopTechnicians> Technicians => _context.Set<WorkshopTechnicians>();

    private DbSet<WorkshopChecklistItems> ChecklistItems => _context.Set<WorkshopChecklistItems>();


    //===========================================================
    // The page
    //===========================================================

    public async Task<WorkshopSetupDto> GetSetupAsync()
    {
        Dictionary<long, string> branches = await Ws.BranchNamesAsync(_context);

        List<WsLookupDto> employees = await Ws.TechnicianEmployeesAsync(_context);

        var employeeNames =
            (await _context.Set<HrEmployees>().AsNoTracking().Select(x => new { x.EmployeeId, x.Code, x.FullName }).ToListAsync())
            .ToDictionary(x => x.EmployeeId);

        string Branch(long id) => branches.TryGetValue(id, out string? name) ? name : string.Empty;

        return new WorkshopSetupDto
        {
            Bays =
                (await Bays.AsNoTracking().Where(x => !x.IsDeleted).OrderBy(x => x.Code).ToListAsync())
                .Select(x => ToDto(x, Branch(x.BranchId)))
                .ToList(),
            Technicians =
                (await Technicians.AsNoTracking().Where(x => !x.IsDeleted).OrderBy(x => x.Code).ToListAsync())
                .Select(x =>
                {
                    employeeNames.TryGetValue(x.EmployeeId, out var employee);

                    return ToDto(x, Branch(x.BranchId), employee?.Code ?? string.Empty, employee?.FullName ?? string.Empty);
                })
                .ToList(),
            ChecklistItems =
                (await ChecklistItems.AsNoTracking().Where(x => !x.IsDeleted).OrderBy(x => x.SortOrder).ThenBy(x => x.Code).ToListAsync())
                .Select(ToDto)
                .ToList(),
            Switches = await Ws.SwitchesAsync(_context),
            ChargeServices =
                (await _context.Set<CustomizedServices>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.ServiceName)
                    .Select(x => new { x.CustomizedServiceId, x.ServiceCode, x.ServiceName, x.ServiceCharge })
                    .ToListAsync())
                .Select(x => new WsLookupDto { Id = x.CustomizedServiceId, Code = x.ServiceCode ?? string.Empty, Name = $"{x.ServiceName}  ({x.ServiceCharge:N2})" })
                .ToList(),
            Branches = await Ws.BranchesAsync(_context),
            Employees = employees,
            NextBayCode = Ws.NextCode(await Bays.AsNoTracking().Select(x => x.Code).ToListAsync(), BayPrefix),
            NextTechnicianCode = Ws.NextCode(await Technicians.AsNoTracking().Select(x => x.Code).ToListAsync(), TechnicianPrefix),
            NextChecklistCode = Ws.NextCode(await ChecklistItems.AsNoTracking().Select(x => x.Code).ToListAsync(), ChecklistPrefix)
        };
    }

    private static WorkshopBayDto ToDto(WorkshopBays x, string branchName) =>
        new()
        {
            WorkshopBayId = x.WorkshopBayId,
            PublicId = x.PublicId,
            Code = x.Code,
            Name = x.Name,
            BranchId = x.BranchId,
            BranchName = branchName,
            Remarks = x.Remarks,
            IsActive = x.IsActive
        };

    private static WorkshopTechnicianDto ToDto(WorkshopTechnicians x, string branchName, string employeeCode, string employeeName) =>
        new()
        {
            WorkshopTechnicianId = x.WorkshopTechnicianId,
            PublicId = x.PublicId,
            Code = x.Code,
            EmployeeId = x.EmployeeId,
            EmployeeCode = employeeCode,
            EmployeeName = employeeName,
            BranchId = x.BranchId,
            BranchName = branchName,
            Skill = x.Skill,
            Remarks = x.Remarks,
            IsActive = x.IsActive
        };

    private static WorkshopChecklistItemDto ToDto(WorkshopChecklistItems x) =>
        new()
        {
            WorkshopChecklistItemId = x.WorkshopChecklistItemId,
            PublicId = x.PublicId,
            Code = x.Code,
            Name = x.Name,
            SortOrder = x.SortOrder,
            Remarks = x.Remarks,
            IsActive = x.IsActive
        };

    private async Task<string> BranchNameAsync(long branchId)
    {
        string? name =
            await _context.Set<Branches>().AsNoTracking()
                .Where(x => x.BranchId == branchId && !x.IsDeleted)
                .Select(x => x.BranchName)
                .FirstOrDefaultAsync();

        return name ?? throw new InvalidOperationException("Pick the branch.");
    }


    //===========================================================
    // Bays
    //===========================================================

    public async Task<WorkshopBayDto> SaveBayAsync(Guid? publicId, WorkshopBayDto dto, long userId)
    {
        string name = Ws.Clean(dto.Name, 100, "Bay Name");

        if (name.Length == 0)
        {
            throw new InvalidOperationException("Bay Name is required.");
        }

        string branchName = await BranchNameAsync(dto.BranchId);

        if (await Bays.AsNoTracking().AnyAsync(x => !x.IsDeleted && x.PublicId != (publicId ?? Guid.Empty) && x.BranchId == dto.BranchId && x.Name.ToLower() == name.ToLower()))
        {
            throw new InvalidOperationException($"{branchName} has a bay named \"{name}\" already.");
        }

        WorkshopBays entity;

        if (publicId == null)
        {
            entity = new WorkshopBays
            {
                Code = Ws.NextCode(await Bays.AsNoTracking().Select(x => x.Code).ToListAsync(), BayPrefix),
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

            Bays.Add(entity);
        }
        else
        {
            entity =
                await Bays.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
                ?? throw new KeyNotFoundException("The bay was not found.");

            entity.ModifiedBy = userId;
            entity.ModifiedDate = DateTime.UtcNow;
        }

        entity.Name = name;
        entity.BranchId = dto.BranchId;
        entity.Remarks = Ws.Clean(dto.Remarks, 500, "Remarks");
        entity.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        Ws.AddHistory(_context, Entity, entity.WorkshopBayId, publicId == null ? "Create" : "Update", publicId == null ? "Bay Created" : "Bay Updated", $"{entity.Code} {entity.Name}, {branchName}.{(entity.IsActive ? string.Empty : " Inactive.")}", userId);

        await _context.SaveChangesAsync();

        return ToDto(entity, branchName);
    }

    // Bays made in one go (like Model Onboarding : all or nothing).
    // They are named "Service Bay n" after the highest bay number of
    // the service center; every bay gets its own code.
    public async Task<List<WorkshopBayDto>> CreateBaysAsync(WorkshopBaysCreateDto dto, long userId)
    {
        List<WorkshopBayNewDto> wanted = dto.Bays ?? new List<WorkshopBayNewDto>();

        if (wanted.Count < 1 || wanted.Count > MaxBaysAtOnce)
        {
            throw new InvalidOperationException($"Number of Bays must be 1 to {MaxBaysAtOnce}.");
        }

        var branchNames = new Dictionary<long, string>();

        foreach (long branchId in wanted.Select(x => x.BranchId).Distinct())
        {
            branchNames[branchId] = await BranchNameAsync(branchId);
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var existing =
            await Bays.AsNoTracking().Where(x => !x.IsDeleted).Select(x => new { x.BranchId, x.Name }).ToListAsync();

        // the highest bay number of every service center
        var numbers = new Dictionary<long, int>();

        foreach (long branchId in branchNames.Keys)
        {
            numbers[branchId] = HighestBayNumber(existing.Where(x => x.BranchId == branchId).Select(x => x.Name));
        }

        List<string> codes =
            await Bays.AsNoTracking().Select(x => x.Code).ToListAsync();

        var made = new List<WorkshopBays>();

        foreach (WorkshopBayNewDto bay in wanted)
        {
            numbers[bay.BranchId]++;

            string code = Ws.NextCode(codes, BayPrefix);

            codes.Add(code);

            var entity = new WorkshopBays
            {
                Code = code,
                Name = $"{BayName} {numbers[bay.BranchId]}",
                BranchId = bay.BranchId,
                Remarks = Ws.Clean(bay.Remarks, 500, "Remarks"),
                IsActive = true,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

            Bays.Add(entity);

            made.Add(entity);
        }

        await _context.SaveChangesAsync();

        foreach (WorkshopBays entity in made)
        {
            Ws.AddHistory(_context, Entity, entity.WorkshopBayId, "Create", "Bay Created", $"{entity.Code} {entity.Name}, {branchNames[entity.BranchId]}.", userId);
        }

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return made.Select(x => ToDto(x, branchNames[x.BranchId])).ToList();
    }

    private const int MaxBaysAtOnce = 50;

    private const string BayName = "Service Bay";

    // "Service Bay 3", "service bay 12" : 12 (other names do not count)
    private static int HighestBayNumber(IEnumerable<string> names)
    {
        int highest = 0;

        foreach (string name in names)
        {
            string value = (name ?? string.Empty).Trim();

            if (value.StartsWith(BayName + " ", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value.Substring(BayName.Length + 1).Trim(), System.Globalization.NumberStyles.None, System.Globalization.CultureInfo.InvariantCulture, out int number)
                && number > highest)
            {
                highest = number;
            }
        }

        return highest;
    }

    public async Task DeleteBayAsync(Guid publicId, long userId)
    {
        WorkshopBays entity =
            await Bays.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The bay was not found.");

        if (await _context.Set<JobCardWorkEntries>().AsNoTracking().AnyAsync(x => x.WorkshopBayId == entity.WorkshopBayId))
        {
            throw new InvalidOperationException($"{entity.Code} {entity.Name} was used on job cards : it cannot be deleted. Make it Inactive to stop using it.");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        Ws.AddHistory(_context, Entity, entity.WorkshopBayId, "Delete", "Bay Deleted", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Technicians
    //===========================================================

    public async Task<WorkshopTechnicianDto> SaveTechnicianAsync(Guid? publicId, WorkshopTechnicianDto dto, long userId)
    {
        var employee =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => x.EmployeeId == dto.EmployeeId && !x.IsDeleted)
                .Select(x => new { x.EmployeeId, x.Code, x.FullName })
                .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("Pick the employee.");

        string branchName = await BranchNameAsync(dto.BranchId);

        if (await Technicians.AsNoTracking().AnyAsync(x => !x.IsDeleted && x.PublicId != (publicId ?? Guid.Empty) && x.EmployeeId == dto.EmployeeId))
        {
            throw new InvalidOperationException($"{employee.Code} {employee.FullName} is a technician already.");
        }

        WorkshopTechnicians entity;

        if (publicId == null)
        {
            entity = new WorkshopTechnicians
            {
                Code = Ws.NextCode(await Technicians.AsNoTracking().Select(x => x.Code).ToListAsync(), TechnicianPrefix),
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

            Technicians.Add(entity);
        }
        else
        {
            entity =
                await Technicians.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
                ?? throw new KeyNotFoundException("The technician was not found.");

            if (entity.EmployeeId != dto.EmployeeId
                && await _context.Set<JobCardWorkEntries>().AsNoTracking().AnyAsync(x => x.WorkshopTechnicianId == entity.WorkshopTechnicianId))
            {
                throw new InvalidOperationException($"{entity.Code} worked on job cards : the employee cannot be changed. Add the other employee as a new technician.");
            }

            entity.ModifiedBy = userId;
            entity.ModifiedDate = DateTime.UtcNow;
        }

        entity.EmployeeId = dto.EmployeeId;
        entity.BranchId = dto.BranchId;
        entity.Skill = Ws.Clean(dto.Skill, 100, "Skill");
        entity.Remarks = Ws.Clean(dto.Remarks, 500, "Remarks");
        entity.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        Ws.AddHistory(_context, Entity, entity.WorkshopTechnicianId, publicId == null ? "Create" : "Update", publicId == null ? "Technician Created" : "Technician Updated", $"{entity.Code} {employee.FullName}, {branchName}.{(entity.IsActive ? string.Empty : " Inactive.")}", userId);

        await _context.SaveChangesAsync();

        return ToDto(entity, branchName, employee.Code, employee.FullName);
    }

    public async Task DeleteTechnicianAsync(Guid publicId, long userId)
    {
        WorkshopTechnicians entity =
            await Technicians.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The technician was not found.");

        if (await _context.Set<JobCardWorkEntries>().AsNoTracking().AnyAsync(x => x.WorkshopTechnicianId == entity.WorkshopTechnicianId))
        {
            throw new InvalidOperationException($"{entity.Code} worked on job cards : the technician cannot be deleted. Make the technician Inactive instead.");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        Ws.AddHistory(_context, Entity, entity.WorkshopTechnicianId, "Delete", "Technician Deleted", entity.Code, userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Check-in checklist
    //===========================================================

    public async Task<WorkshopChecklistItemDto> SaveChecklistItemAsync(Guid? publicId, WorkshopChecklistItemDto dto, long userId)
    {
        string name = Ws.Clean(dto.Name, 100, "Checklist Item");

        if (name.Length == 0)
        {
            throw new InvalidOperationException("Checklist Item is required.");
        }

        if (await ChecklistItems.AsNoTracking().AnyAsync(x => !x.IsDeleted && x.PublicId != (publicId ?? Guid.Empty) && x.Name.ToLower() == name.ToLower()))
        {
            throw new InvalidOperationException($"The checklist has \"{name}\" already.");
        }

        WorkshopChecklistItems entity;

        if (publicId == null)
        {
            entity = new WorkshopChecklistItems
            {
                Code = Ws.NextCode(await ChecklistItems.AsNoTracking().Select(x => x.Code).ToListAsync(), ChecklistPrefix),
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

            ChecklistItems.Add(entity);
        }
        else
        {
            entity =
                await ChecklistItems.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
                ?? throw new KeyNotFoundException("The checklist item was not found.");

            entity.ModifiedBy = userId;
            entity.ModifiedDate = DateTime.UtcNow;
        }

        entity.Name = name;
        entity.SortOrder = dto.SortOrder > 0 ? dto.SortOrder : (await ChecklistItems.AsNoTracking().Where(x => !x.IsDeleted).Select(x => (int?)x.SortOrder).MaxAsync() ?? 0) + 1;
        entity.Remarks = Ws.Clean(dto.Remarks, 500, "Remarks");
        entity.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        Ws.AddHistory(_context, Entity, entity.WorkshopChecklistItemId, publicId == null ? "Create" : "Update", publicId == null ? "Checklist Item Created" : "Checklist Item Updated", $"{entity.Code} {entity.Name}.{(entity.IsActive ? string.Empty : " Inactive.")}", userId);

        await _context.SaveChangesAsync();

        return ToDto(entity);
    }

    // A deleted item stays on the job cards that were filled with it
    public async Task DeleteChecklistItemAsync(Guid publicId, long userId)
    {
        WorkshopChecklistItems entity =
            await ChecklistItems.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The checklist item was not found.");

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        Ws.AddHistory(_context, Entity, entity.WorkshopChecklistItemId, "Delete", "Checklist Item Deleted", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Switches (one row)
    //===========================================================

    public Task<WorkshopSwitchesDto> GetSwitchesAsync() =>
        Ws.SwitchesAsync(_context);

    public async Task SaveSwitchesAsync(WorkshopSwitchesDto dto, long userId)
    {
        WorkshopConfiguration? row = await _context.Set<WorkshopConfiguration>().OrderBy(x => x.WorkshopConfigurationId).FirstOrDefaultAsync();

        if (row == null)
        {
            row = new WorkshopConfiguration();

            _context.Set<WorkshopConfiguration>().Add(row);
        }

        row.RequireKm = dto.RequireKm;
        row.RequireChecklist = dto.RequireChecklist;
        row.RequireEstimate = dto.RequireEstimate;
        row.IssueWithoutRequisition = dto.IssueWithoutRequisition;
        row.IssueToMultipleJobs = dto.IssueToMultipleJobs;
        row.IssueBulkPerJob = dto.IssueBulkPerJob;
        row.AllowCreditInvoice = dto.AllowCreditInvoice;
        row.DiagnosisSuggests = dto.DiagnosisSuggests;

        string chargeName = "none";

        if (dto.EstimateChargeServiceId != null)
        {
            chargeName =
                await _context.Set<CustomizedServices>().AsNoTracking()
                    .Where(x => x.CustomizedServiceId == dto.EstimateChargeServiceId && !x.IsDeleted && x.IsActive)
                    .Select(x => x.ServiceName)
                    .FirstOrDefaultAsync()
                ?? throw new InvalidOperationException("The Estimate Charge service was not found (Service Setup > Customized Services).");
        }

        row.EstimateChargeServiceId = dto.EstimateChargeServiceId;
        row.ModifiedBy = userId;
        row.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        Ws.AddHistory(_context, Entity, row.WorkshopConfigurationId, "Update", "Workshop Switches Updated", $"Km reading needed : {(row.RequireKm ? "yes" : "no")}; checklist needed before work starts : {(row.RequireChecklist ? "yes" : "no")}; Estimate Driven Job Card : {(row.RequireEstimate ? "yes" : "no")}; Estimate Charge : {chargeName}; parts issue without a requisition : {(row.IssueWithoutRequisition ? "yes" : "no")}; parts issue to multiple job cards : {(row.IssueToMultipleJobs ? "yes" : "no")}; bulk parts issue per job : {(row.IssueBulkPerJob ? "yes" : "no")}; credit on service invoices : {(row.AllowCreditInvoice ? "yes" : "no")}; a diagnosis puts its labour and parts on the estimate : {(row.DiagnosisSuggests ? "yes" : "no")}.", userId);

        await _context.SaveChangesAsync();
    }
}


//===============================================================
// Job Cards
//===============================================================

public class JobCardsRepository
    : IJobCardsRepository
{
    private const string Entity = "JobCards";

    private readonly AppDbContext _context;

    // The service catalogue, the bike models and the parts are the
    // ones the Service Enquiries use
    private readonly IServiceEnquiriesRepository _enquiries;

    // The job card is numbered like the other operational documents :
    // JC-<branch>-<FY>-<MM>-00001, by service center and month
    private readonly IVoucherNumberService _numberService;

    public JobCardsRepository(
        AppDbContext context,
        IServiceEnquiriesRepository enquiries,
        IVoucherNumberService numberService)
    {
        _context = context;
        _enquiries = enquiries;
        _numberService = numberService;
    }

    private DbSet<JobCards> Cards => _context.Set<JobCards>();


    //===========================================================
    // Lookups
    //===========================================================

    public async Task<JobCardLookupsDto> GetLookupsAsync()
    {
        DateOnly today = HrCalendar.Today();

        ServiceEnquiriesDefaultsDto defaults = await _enquiries.GetDefaultsAsync(today);

        var employees =
            (await _context.Set<HrEmployees>().AsNoTracking().Select(x => new { x.EmployeeId, x.FullName }).ToListAsync())
            .ToDictionary(x => x.EmployeeId, x => x.FullName);

        // The token serial the next job card of today gets, by
        // service center (shown on the New Job page before saving)
        var serials =
            await Cards.AsNoTracking()
                .Where(x => x.JobDate == today)
                .GroupBy(x => x.BranchId)
                .Select(g => new { BranchId = g.Key, Last = g.Max(x => x.TokenSerial) })
                .ToListAsync();

        // The number the next job card of today gets, by service
        // center (a preview; a service center with no open financial
        // year has none)
        var centers = await Ws.BranchesAsync(_context);

        Dictionary<long, string> nextNos = new();

        foreach (var center in centers)
        {
            try
            {
                nextNos[center.Id] = (await _numberService.PeekAsync(VoucherTypes.JobCard, center.Id, today)).VoucherNo;
            }
            catch (InvalidOperationException)
            {
            }
        }

        // The Motor Bikes (one model in one colour) of the models
        // above : the New Job page picks the bike from them
        List<long> modelIds = defaults.Models.Select(x => x.Id).ToList();

        List<JobCardMotorBikeDto> motorBikes =
            await (
                from b in _context.Set<MotorBikes>().AsNoTracking()
                join c in _context.Set<ColorManagement>().AsNoTracking() on b.ColorManagementId equals c.ColorManagementId
                where !b.IsDeleted && b.IsActive && modelIds.Contains(b.ProductSubCategoryId)
                orderby b.ProductName
                select new JobCardMotorBikeDto
                {
                    Id = b.MotorBikeId,
                    Code = b.ProductCode,
                    Name = b.ProductName,
                    ModelId = b.ProductSubCategoryId,
                    ColorName = c.ColorName
                })
                .ToListAsync();

        // ... and the bikes we do not sell, added from the New Job
        // page (nothing when ServiceOperations_JobCard_ServiceBikes.sql
        // was not run yet)
        try
        {
            motorBikes.AddRange(await ServiceBikesAsync(null));
        }
        catch (Exception)
        {
        }

        // The Assignment page : the standard time of the services ...
        List<ServiceMinutesDto> serviceMinutes =
            (await _context.Set<LaborChart>().AsNoTracking()
                .Select(x => new ServiceMinutesDto { Kind = "LaborChart", Id = x.LaborChartId, Minutes = x.StandardMinutes })
                .ToListAsync())
            .Concat(
                await _context.Set<CustomizedServices>().AsNoTracking()
                    .Select(x => new ServiceMinutesDto { Kind = "Customized", Id = x.CustomizedServiceId, Minutes = x.StandardMinutes })
                    .ToListAsync())
            .ToList();

        // ... and the bays and the technicians that have a job now
        var busy =
            await Cards.AsNoTracking()
                .Where(x => !x.IsDeleted && (x.Status == Ws.Assigned || Ws.Workable.Contains(x.Status)))
                .OrderByDescending(x => x.JobCardId)
                .Select(x => new { x.JobCardNo, x.WorkshopBayId, x.TechnicianEmployeeId })
                .ToListAsync();

        Dictionary<long, string> busyBays = new();
        Dictionary<long, string> busyTechnicians = new();

        foreach (var x in busy)
        {
            if (x.WorkshopBayId != null)
            {
                busyBays[x.WorkshopBayId.Value] = x.JobCardNo;
            }

            if (x.TechnicianEmployeeId != null)
            {
                busyTechnicians[x.TechnicianEmployeeId.Value] = x.JobCardNo;
            }
        }

        List<WsLookupDto> brands =
            await _context.Set<BrandManagement>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status)
                .OrderBy(x => x.BrandName)
                .Select(x => new WsLookupDto { Id = x.BrandManagementId, Code = x.BrandCode, Name = x.BrandName })
                .ToListAsync();

        List<WsLookupDto> colors =
            await _context.Set<ColorManagement>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status)
                .OrderBy(x => x.ColorName)
                .Select(x => new WsLookupDto { Id = x.ColorManagementId, Name = x.ColorName })
                .ToListAsync();

        return new JobCardLookupsDto
        {
            Today = HrCalendar.Day(today),
            NextJobCardNo = "Given when it is saved",
            NextJobCardNos = nextNos,
            MotorBikes = motorBikes,
            Brands = brands,
            Colors = colors,
            ServiceMinutes = serviceMinutes,
            BusyBays = busyBays,
            BusyTechnicians = busyTechnicians,
            NextTokens = serials.ToDictionary(x => (long)x.BranchId, x => x.Last + 1),
            Branches = centers,
            Models = defaults.Models,
            ServiceItems = defaults.ServiceItems,
            Employees = await Ws.EmployeesAsync(_context),
            Technicians =
                (await _context.Set<WorkshopTechnicians>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.Code)
                    .ToListAsync())
                .Select(x => new WsLookupDto
                {
                    Id = x.WorkshopTechnicianId,
                    Code = x.Code,
                    Name = employees.TryGetValue(x.EmployeeId, out string? name) ? name : x.Code,
                    BranchId = x.BranchId
                })
                .ToList(),
            Bays =
                await _context.Set<WorkshopBays>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.Code)
                    .Select(x => new WsLookupDto { Id = x.WorkshopBayId, Code = x.Code, Name = x.Name, BranchId = x.BranchId })
                    .ToListAsync(),
            Checklist =
                await _context.Set<WorkshopChecklistItems>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.SortOrder).ThenBy(x => x.Code)
                    .Select(x => new JobCardChecklistDto { WorkshopChecklistItemId = x.WorkshopChecklistItemId, ItemName = x.Name })
                    .ToListAsync(),
            Engineers = await Ws.TechnicianEmployeesAsync(_context),
            Switches = await Ws.SwitchesAsync(_context),
            // an off module's job type is not offered (job cards
            // saved with it before stay valid)
            JobTypes = Ws.JobTypes
                .Where(x => x != "Warranty"
                            || AppCore.Application.Platform.Tenancy.ModuleSwitch.IsOn(
                                AppCore.Application.Platform.Tenancy.ModuleKeys.Warranty))
                .Where(x => x != "Membership Service"
                            || AppCore.Application.Platform.Tenancy.ModuleSwitch.IsOn(
                                AppCore.Application.Platform.Tenancy.ModuleKeys.Membership))
                .ToList(),
            FuelLevels = Ws.FuelLevels.ToList()
        };
    }

    // A service center is offered the parts of its own business
    // lines only : no accessories where Accessories is not its line
    public async Task<List<PartOptionDto>> GetPartsAsync(long? branchId = null)
    {
        List<PartOptionDto> parts = await _enquiries.GetPartsAsync();

        if (branchId == null)
        {
            return parts;
        }

        HashSet<string> lines = await Ws.BranchLinesAsync(_context, branchId.Value);

        return parts.Where(x => lines.Contains(Ws.PartLine(x.Kind))).ToList();
    }


    //===========================================================
    // Finding the bike
    //===========================================================

    // A new job card, not saved yet, with what an estimate has
    public async Task<JobCardDto> GetFromEstimateAsync(Guid estimatePublicId)
    {
        ServiceEstimates estimate =
            await _context.Set<ServiceEstimates>().AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == estimatePublicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The estimate was not found.");

        string name = Est.Name(estimate.EstimateNo, estimate.Version);

        if (estimate.JobCardId != null)
        {
            throw new InvalidOperationException($"{name} became a job card already.");
        }

        if (!Est.Live.Contains(estimate.Status))
        {
            throw new InvalidOperationException($"{name} is {estimate.Status} : a job card cannot be made from it.");
        }

        List<ServiceEstimateLines> lines =
            await _context.Set<ServiceEstimateLines>().AsNoTracking()
                .Where(x => x.ServiceEstimateId == estimate.ServiceEstimateId)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        // The observations of the estimate are the complaints of the
        // job card : "Observation : Diagnosis"
        List<ServiceEstimateObservations> observations =
            await _context.Set<ServiceEstimateObservations>().AsNoTracking()
                .Where(x => x.ServiceEstimateId == estimate.ServiceEstimateId)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        return new JobCardDto
        {
            Complaints =
                observations
                    .Select(x => x.Diagnosis.Length == 0 ? x.Observation : $"{x.Observation} : {x.Diagnosis}")
                    .Select(x => new JobCardComplaintDto { Complaint = x.Length > 300 ? x.Substring(0, 300) : x })
                    .ToList(),
            JobDate = HrCalendar.Day(HrCalendar.Today()),
            BranchId = estimate.BranchId,
            ServiceVehicleId = estimate.ServiceVehicleId,
            ChassisNo = estimate.ChassisNo,
            EngineNo = estimate.EngineNo,
            RegistrationNo = estimate.RegistrationNo,
            ModelId = estimate.ModelId,
            ModelName = estimate.ModelName,
            BrandManagementId = estimate.BrandManagementId,
            BrandName = estimate.BrandName,
            ColorName = estimate.ColorName,
            CustomerId = estimate.CustomerId,
            CustomerName = estimate.CustomerName,
            Mobile = estimate.Mobile,
            KmReading = estimate.KmReading,
            BasicRequirement = estimate.Requirement,
            EstimateNo = name,
            EstimateStatus = estimate.Status,
            EstimatePublicId = estimate.PublicId,
            Services =
                lines.Where(x => x.LineType == Est.Service)
                    .Select(x => new JobCardServiceDto { ItemKind = x.ItemKind, ItemId = x.ItemId, ItemCode = x.ItemCode, ItemName = x.ItemName, Quantity = x.Quantity, Rate = x.Rate, Amount = x.Amount, IsFree = x.IsFree, Note = x.Note })
                    .ToList(),
            Parts =
                lines.Where(x => x.LineType == Est.Part)
                    .Select(x => new JobCardPartDto { ItemKind = x.ItemKind, ItemId = x.ItemId, ItemCode = x.ItemCode, ItemName = x.ItemName, Quantity = x.Quantity, Rate = x.Rate, Amount = x.Amount, Note = x.Note })
                    .ToList()
        };
    }

    // The bikes we do not sell (the workshop's own list); id : one only
    private async Task<List<JobCardMotorBikeDto>> ServiceBikesAsync(long? id) =>
        await (
            from s in _context.Set<WorkshopServiceBikes>().AsNoTracking()
            join b in _context.Set<BrandManagement>().AsNoTracking() on s.BrandManagementId equals b.BrandManagementId
            join c in _context.Set<ColorManagement>().AsNoTracking() on s.ColorManagementId equals c.ColorManagementId
            where !s.IsDeleted && (id == null || s.WorkshopServiceBikeId == id)
            orderby b.BrandName, s.ModelName, c.ColorName
            select new JobCardMotorBikeDto
            {
                Id = s.WorkshopServiceBikeId,
                Name = b.BrandName + " " + s.ModelName + " - " + c.ColorName,
                ColorName = c.ColorName,
                ServiceOnly = true,
                BrandManagementId = b.BrandManagementId,
                BrandName = b.BrandName,
                ModelName = s.ModelName
            })
            .ToListAsync();

    public async Task<JobCardMotorBikeDto> AddServiceBikeAsync(SaveServiceBikeDto dto, long userId)
    {
        string model = Ws.Clean(dto.ModelName, 150, "Model");

        if (model.Length == 0)
        {
            throw new InvalidOperationException("Give the model of the bike.");
        }

        if (!await _context.Set<BrandManagement>().AnyAsync(x => x.BrandManagementId == dto.BrandManagementId && !x.IsDeleted))
        {
            throw new InvalidOperationException("Pick the brand (Brand Management).");
        }

        if (!await _context.Set<ColorManagement>().AnyAsync(x => x.ColorManagementId == dto.ColorManagementId && !x.IsDeleted))
        {
            throw new InvalidOperationException("Pick the colour (Color Management).");
        }

        // the same bike is there already : that one
        // (letters and digits only : CB150 = CB 150 = cb-150)
        static string Plain(string text) => new string(text.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();

        string plain = Plain(model);

        WorkshopServiceBikes? entity =
            (await _context.Set<WorkshopServiceBikes>()
                .Where(x =>
                    !x.IsDeleted
                    && x.BrandManagementId == dto.BrandManagementId
                    && x.ColorManagementId == dto.ColorManagementId)
                .ToListAsync())
            .FirstOrDefault(x => Plain(x.ModelName) == plain);

        if (entity == null)
        {
            entity = new WorkshopServiceBikes
            {
                BrandManagementId = dto.BrandManagementId,
                ModelName = model,
                ColorManagementId = dto.ColorManagementId,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

            _context.Set<WorkshopServiceBikes>().Add(entity);

            await _context.SaveChangesAsync();
        }

        return (await ServiceBikesAsync(entity.WorkshopServiceBikeId)).First();
    }

    public async Task<List<JobCardBikeDto>> FindBikesAsync(string? find)
    {
        string text = (find ?? string.Empty).Trim().ToLower();

        if (text.Length < 3)
        {
            return new List<JobCardBikeDto>();
        }

        DateOnly today = HrCalendar.Today();

        // Enquiry Management off for this company : its sold bikes
        // and their service positions are not offered (bikes of
        // earlier job cards still are)
        bool enquiryOn =
            AppCore.Application.Platform.Tenancy.ModuleSwitch.IsOn(AppCore.Application.Platform.Tenancy.ModuleKeys.Enquiry);

        List<ServiceVehicles> vehicles =
            await _context.Set<ServiceVehicles>().AsNoTracking()
                .Where(x => enquiryOn
                         && !x.IsDeleted
                         && (x.ChassisNo.ToLower().Contains(text)
                             || x.EngineNo.ToLower().Contains(text)
                             || x.RegistrationNo.ToLower().Contains(text)
                             || x.Mobile.ToLower().Contains(text)
                             || x.CustomerName.ToLower().Contains(text)))
                .OrderByDescending(x => x.SaleDate)
                .Take(20)
                .ToListAsync();

        List<long> vehicleIds = vehicles.Select(x => x.ServiceVehicleId).ToList();

        List<ServiceVehicleSchedules> schedules =
            await _context.Set<ServiceVehicleSchedules>().AsNoTracking()
                .Where(x => vehicleIds.Contains(x.ServiceVehicleId) && x.Status != "Taken" && x.Status != "Skipped")
                .OrderBy(x => x.SequenceNo)
                .ToListAsync();

        // Bikes typed on earlier job cards (not Service Vehicles)
        List<JobCards> typed =
            await Cards.AsNoTracking()
                .Where(x => !x.IsDeleted && x.ServiceVehicleId == null
                         && (x.ChassisNo.ToLower().Contains(text)
                             || x.EngineNo.ToLower().Contains(text)
                             || x.RegistrationNo.ToLower().Contains(text)
                             || x.Mobile.ToLower().Contains(text)
                             || x.CustomerName.ToLower().Contains(text)))
                .OrderByDescending(x => x.JobCardId)
                .Take(60)
                .ToListAsync();

        // The cards still open, by bike
        var open =
            await Cards.AsNoTracking()
                .Where(x => !x.IsDeleted && !Ws.Closed.Contains(x.Status))
                .Select(x => new { x.ServiceVehicleId, x.ChassisNo, x.RegistrationNo, x.JobCardNo })
                .ToListAsync();

        List<JobCardBikeDto> bikes =
            vehicles
                .Select(v => new JobCardBikeDto
                {
                    ServiceVehicleId = v.ServiceVehicleId,
                    ChassisNo = v.ChassisNo,
                    EngineNo = v.EngineNo,
                    RegistrationNo = v.RegistrationNo,
                    ModelId = v.ModelId,
                    ModelName = v.ModelName,
                    BrandManagementId = v.BrandManagementId,
                    BrandName = v.BrandName,
                    ColorName = v.ColorName,
                    CustomerId = v.CustomerId,
                    CustomerName = v.CustomerName,
                    Mobile = v.Mobile,
                    LastKm = v.LastKm,
                    InWarranty =
                        v.WarrantyUntil.HasValue
                        && today <= v.WarrantyUntil.Value
                        && !(v.WarrantyKm > 0 && v.LastKm.HasValue && v.LastKm.Value > v.WarrantyKm),
                    SaleDate = HrCalendar.Day(v.SaleDate),
                    OpenJobCardNo = open.FirstOrDefault(o => o.ServiceVehicleId == v.ServiceVehicleId)?.JobCardNo ?? string.Empty,
                    Schedules =
                        schedules
                            .Where(s => s.ServiceVehicleId == v.ServiceVehicleId)
                            .Select(s => new JobCardScheduleOptionDto
                            {
                                ServiceVehicleScheduleId = s.ServiceVehicleScheduleId,
                                ScheduledServiceId = s.ScheduledServiceId,
                                ServiceType = s.ServiceType,
                                ServiceName = s.ServiceName,
                                DueDate = HrCalendar.Day(s.DueDate),
                                StatusText = today > s.LastDate ? "Missed" : today >= s.DueDate ? "Due" : s.Status,
                                ServiceEnquiryId = s.ServiceEnquiryId,
                                EnquiryNo = s.EnquiryNo
                            })
                            .ToList()
                })
                .ToList();

        // Sold by us : bought on the sale date; serviced last on the
        // newest job card of the bike
        var lastServices =
            await Cards.AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status != Ws.Cancelled && x.ServiceVehicleId != null && vehicleIds.Contains(x.ServiceVehicleId.Value))
                .GroupBy(x => x.ServiceVehicleId!.Value)
                .Select(g => new { Id = g.Key, Date = g.Max(x => x.JobDate) })
                .ToListAsync();

        foreach (JobCardBikeDto bike in bikes)
        {
            bike.PurchaseDate = bike.SaleDate;

            var service = lastServices.FirstOrDefault(x => x.Id == bike.ServiceVehicleId);

            bike.LastServiceDate = service == null ? string.Empty : HrCalendar.Day(service.Date);
        }

        foreach (var group in typed.GroupBy(x => (x.ChassisNo + "|" + x.RegistrationNo).ToLower()))
        {
            JobCards last = group.First();

            bikes.Add(
                new JobCardBikeDto
                {
                    ChassisNo = last.ChassisNo,
                    EngineNo = last.EngineNo,
                    RegistrationNo = last.RegistrationNo,
                    ModelId = last.ModelId,
                    ModelName = last.ModelName,
                    BrandManagementId = last.BrandManagementId,
                    BrandName = last.BrandName,
                    ColorName = last.ColorName,
                    CustomerId = last.CustomerId,
                    CustomerName = last.CustomerName,
                    Mobile = last.Mobile,
                    PurchaseDate = last.PurchaseDate == null ? string.Empty : HrCalendar.Day(last.PurchaseDate),
                    LastServiceDate = HrCalendar.Day(group.Max(x => x.JobDate)),
                    LastKm = group.Max(x => x.KmReading),
                    OpenJobCardNo =
                        open.FirstOrDefault(o => o.ServiceVehicleId == null
                                              && string.Equals(o.ChassisNo, last.ChassisNo, StringComparison.OrdinalIgnoreCase)
                                              && string.Equals(o.RegistrationNo, last.RegistrationNo, StringComparison.OrdinalIgnoreCase))?.JobCardNo
                        ?? string.Empty
                });
        }

        bikes = bikes.Take(30).ToList();

        // The customers of Customer Profiles with no bike here yet
        // (a new customer, made for this job card) : found by phone
        // or name, the bike is typed on the card
        List<long> known = bikes.Where(x => x.CustomerId != null).Select(x => x.CustomerId!.Value).Distinct().ToList();

        var customers =
            await _context.Set<CustomerProfiles>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && !known.Contains(x.CustomerId)
                         && (x.Phone1.ToLower().Contains(text)
                             || x.Phone2.ToLower().Contains(text)
                             || x.CustomerName.ToLower().Contains(text)))
                .OrderBy(x => x.CustomerName)
                .Take(10)
                .Select(x => new { x.CustomerId, x.CustomerName, x.Phone1 })
                .ToListAsync();

        bikes.AddRange(
            customers.Select(x => new JobCardBikeDto
            {
                CustomerId = x.CustomerId,
                CustomerName = x.CustomerName ?? string.Empty,
                Mobile = x.Phone1 ?? string.Empty,
                CustomerOnly = true
            }));

        return bikes;
    }


    //===========================================================
    // Reading
    //===========================================================

    private sealed class Names
    {
        public Dictionary<long, string> Branches { get; init; } = new();

        public Dictionary<long, string> Employees { get; init; } = new();

        // technician id : the employee's name
        public Dictionary<long, string> Technicians { get; init; } = new();

        public Dictionary<long, string> Bays { get; init; } = new();

        public static string Of(Dictionary<long, string> names, long? id) =>
            id != null && names.TryGetValue(id.Value, out string? name) ? name : string.Empty;
    }

    private async Task<Names> NamesAsync()
    {
        Dictionary<long, string> employees =
            (await _context.Set<HrEmployees>().AsNoTracking().Select(x => new { x.EmployeeId, x.FullName }).ToListAsync())
            .ToDictionary(x => x.EmployeeId, x => x.FullName);

        return new Names
        {
            Branches = await Ws.BranchNamesAsync(_context),
            Employees = employees,
            Technicians =
                (await _context.Set<WorkshopTechnicians>().AsNoTracking().Select(x => new { x.WorkshopTechnicianId, x.EmployeeId, x.Code }).ToListAsync())
                .ToDictionary(x => x.WorkshopTechnicianId, x => employees.TryGetValue(x.EmployeeId, out string? name) ? name : x.Code),
            Bays =
                (await _context.Set<WorkshopBays>().AsNoTracking().Select(x => new { x.WorkshopBayId, x.Name }).ToListAsync())
                .ToDictionary(x => x.WorkshopBayId, x => x.Name)
        };
    }

    private static JobCardDto Head(JobCards c, Names names) =>
        new()
        {
            JobCardId = c.JobCardId,
            PublicId = c.PublicId,
            JobCardNo = c.JobCardNo,
            JobDate = HrCalendar.Day(c.JobDate),
            CheckInAt = c.CheckInAt,
            BranchId = c.BranchId,
            BranchName = Names.Of(names.Branches, c.BranchId),
            ServiceVehicleId = c.ServiceVehicleId,
            ChassisNo = c.ChassisNo,
            EngineNo = c.EngineNo,
            RegistrationNo = c.RegistrationNo,
            ModelId = c.ModelId,
            ModelName = c.ModelName,
            BrandManagementId = c.BrandManagementId,
            BrandName = c.BrandName,
            ColorName = c.ColorName,
            CustomerId = c.CustomerId,
            CustomerName = c.CustomerName,
            Mobile = c.Mobile,
            KmReading = c.KmReading,
            FuelLevel = c.FuelLevel,
            JobType = c.JobType,
            ServiceVehicleScheduleId = c.ServiceVehicleScheduleId,
            ServiceEnquiryId = c.ServiceEnquiryId,
            AdvisorEmployeeId = c.AdvisorEmployeeId,
            AdvisorName = Names.Of(names.Employees, c.AdvisorEmployeeId),
            BasicRequirement = c.BasicRequirement,
            PromisedAt = c.PromisedAt,
            PickupDrop = c.PickupDrop,
            Status = c.Status,
            StatusDate = c.StatusDate,
            CancelReason = c.CancelReason,
            LabourTotal = c.LabourTotal,
            PartsTotal = c.PartsTotal,
            Remarks = c.Remarks,
            CanEdit = Ws.Editable.Contains(c.Status),
            NextStatuses = Ws.Next(c.Status),
            StageNo = Ws.StageNo(c.Status),
            ServiceEngineerEmployeeId = c.ServiceEngineerEmployeeId,
            ServiceEngineerName = Names.Of(names.Employees, c.ServiceEngineerEmployeeId),
            SupervisorEmployeeId = c.SupervisorEmployeeId,
            SupervisorName = Names.Of(names.Employees, c.SupervisorEmployeeId),
            TechnicianEmployeeId = c.TechnicianEmployeeId,
            TechnicianName = Names.Of(names.Employees, c.TechnicianEmployeeId),
            StandardMinutes = c.StandardMinutes,
            AllowedMinutes = c.AllowedMinutes,
            WorkshopBayId = c.WorkshopBayId,
            BayName = Names.Of(names.Bays, c.WorkshopBayId),
            AssignedAt = c.AssignedAt,
            CanAssign = Ws.Editable.Contains(c.Status),
            CanAllocate = Ws.Allocatable.Contains(c.Status),
            CanWorkOn = Ws.Workable.Contains(c.Status),
            WelcomeTokenNo = c.WelcomeTokenNo,
            PurchaseDate = c.PurchaseDate == null ? string.Empty : HrCalendar.Day(c.PurchaseDate),
            LastServiceDate = c.LastServiceDate == null ? string.Empty : HrCalendar.Day(c.LastServiceDate),
            DeliveryTokenNo = c.DeliveryTokenNo
        };

    // The technicians a card is assigned to (the first : the lead)
    private static void SetTechnicians(JobCardDto dto, IEnumerable<JobCardTechnicians> rows, Names names)
    {
        dto.Technicians =
            rows.OrderBy(x => x.LineNo)
                .Select((x, i) => new JobCardTechnicianDto
                {
                    WorkshopTechnicianId = x.WorkshopTechnicianId,
                    TechnicianName = Names.Of(names.Technicians, x.WorkshopTechnicianId),
                    IsLead = i == 0
                })
                .ToList();

        dto.TechnicianNames = string.Join(", ", dto.Technicians.Select(x => x.TechnicianName));
    }

    public async Task<List<JobCardDto>> GetAllAsync()
    {
        List<JobCards> cards =
            await Cards.AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.JobCardId)
                .ToListAsync();

        Names names = await NamesAsync();

        // Who is on which card now
        var working =
            await _context.Set<JobCardWorkEntries>().AsNoTracking()
                .Where(x => x.EndAt == null)
                .Select(x => new { x.JobCardId, x.WorkshopTechnicianId })
                .ToListAsync();

        Dictionary<long, ServiceEstimates> estimates = await Est.LiveByCardAsync(_context);

        ILookup<long, JobCardTechnicians> assigned =
            (await _context.Set<JobCardTechnicians>().AsNoTracking().ToListAsync()).ToLookup(x => x.JobCardId);

        // A technician takes several jobs (owner 2026-11-19) : the
        // first that is not done is the job in hand, the later ones
        // wait until their work starts.
        string[] inHand = { Ws.Assigned, Ws.Allocated, Ws.InProgress, Ws.WaitingParts };

        var waitingBehind = new Dictionary<long, string>();

        foreach (var queue in cards
            .Where(x => x.TechnicianEmployeeId != null && inHand.Contains(x.Status))
            .OrderBy(x => x.JobCardId)
            .GroupBy(x => x.TechnicianEmployeeId!.Value))
        {
            JobCards first = queue.First();

            foreach (JobCards later in queue.Skip(1).Where(x => x.Status == Ws.Assigned || x.Status == Ws.Allocated))
            {
                waitingBehind[later.JobCardId] = first.JobCardNo;
            }
        }

        return cards
            .Select(c =>
            {
                JobCardDto dto = Head(c, names);

                dto.WaitingBehind = waitingBehind.GetValueOrDefault(c.JobCardId, string.Empty);

                if (estimates.TryGetValue(c.JobCardId, out ServiceEstimates? estimate))
                {
                    dto.EstimateNo = Est.Name(estimate.EstimateNo, estimate.Version);
                    dto.EstimateStatus = estimate.Status;
                    dto.EstimatePublicId = estimate.PublicId;
                    dto.LinesLocked = estimate.Status == Est.Approved;
                }

                SetTechnicians(dto, assigned[c.JobCardId], names);

                dto.WorkingNow =
                    string.Join(", ", working.Where(w => w.JobCardId == c.JobCardId).Select(w => Names.Of(names.Technicians, w.WorkshopTechnicianId)).Distinct());

                return dto;
            })
            .ToList();
    }

    public async Task<JobCardDto> GetAsync(Guid publicId)
    {
        JobCards card =
            await Cards.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The job card was not found.");

        return await FullAsync(card);
    }

    private async Task<JobCardDto> FullAsync(JobCards card)
    {
        Names names = await NamesAsync();

        JobCardDto dto = Head(card, names);

        long id = card.JobCardId;

        if ((await Est.LiveByCardAsync(_context, id)).TryGetValue(id, out ServiceEstimates? estimate))
        {
            dto.EstimateNo = Est.Name(estimate.EstimateNo, estimate.Version);
            dto.EstimateStatus = estimate.Status;
            dto.EstimatePublicId = estimate.PublicId;
            dto.LinesLocked = estimate.Status == Est.Approved;
        }

        SetTechnicians(dto, await _context.Set<JobCardTechnicians>().AsNoTracking().Where(x => x.JobCardId == id).ToListAsync(), names);

        DateTime now = DateTime.UtcNow;

        if (card.ServiceVehicleScheduleId != null)
        {
            dto.ScheduleName =
                await _context.Set<ServiceVehicleSchedules>().AsNoTracking()
                    .Where(x => x.ServiceVehicleScheduleId == card.ServiceVehicleScheduleId)
                    .Select(x => x.ServiceName)
                    .FirstOrDefaultAsync()
                ?? string.Empty;
        }

        if (card.ServiceEnquiryId != null)
        {
            dto.EnquiryNo =
                await _context.Set<ServiceEnquiries>().AsNoTracking()
                    .Where(x => x.ServiceEnquiryId == card.ServiceEnquiryId)
                    .Select(x => x.EnquiryNo)
                    .FirstOrDefaultAsync()
                ?? string.Empty;
        }

        dto.Complaints =
            await _context.Set<JobCardComplaints>().AsNoTracking()
                .Where(x => x.JobCardId == id)
                .OrderBy(x => x.LineNo)
                .Select(x => new JobCardComplaintDto { Complaint = x.Complaint })
                .ToListAsync();

        dto.Observations =
            await _context.Set<JobCardObservations>().AsNoTracking()
                .Where(x => x.JobCardId == id)
                .OrderBy(x => x.LineNo)
                .Select(x => new JobCardObservationDto { WorkshopObservationId = x.WorkshopObservationId, Observation = x.Observation, Note = x.Note })
                .ToListAsync();

        dto.Services =
            await _context.Set<JobCardServices>().AsNoTracking()
                .Where(x => x.JobCardId == id)
                .OrderBy(x => x.LineNo)
                .Select(x => new JobCardServiceDto
                {
                    JobCardServiceId = x.JobCardServiceId,
                    ItemKind = x.ItemKind,
                    ItemId = x.ItemId,
                    ItemCode = x.ItemCode,
                    ItemName = x.ItemName,
                    Quantity = x.Quantity,
                    Rate = x.Rate,
                    Amount = x.Amount,
                    IsFree = x.IsFree,
                    Note = x.Note
                })
                .ToListAsync();

        dto.Parts =
            await _context.Set<JobCardParts>().AsNoTracking()
                .Where(x => x.JobCardId == id)
                .OrderBy(x => x.LineNo)
                .Select(x => new JobCardPartDto
                {
                    JobCardPartId = x.JobCardPartId,
                    ItemKind = x.ItemKind,
                    ItemId = x.ItemId,
                    ItemCode = x.ItemCode,
                    ItemName = x.ItemName,
                    Quantity = x.Quantity,
                    Rate = x.Rate,
                    Amount = x.Amount,
                    Note = x.Note
                })
                .ToListAsync();

        dto.WorkEntries =
            (await _context.Set<JobCardWorkEntries>().AsNoTracking()
                .Where(x => x.JobCardId == id)
                .OrderBy(x => x.StartAt)
                .ToListAsync())
            .Select(x => new JobCardWorkEntryDto
            {
                JobCardWorkEntryId = x.JobCardWorkEntryId,
                WorkshopTechnicianId = x.WorkshopTechnicianId,
                TechnicianName = Names.Of(names.Technicians, x.WorkshopTechnicianId),
                WorkshopBayId = x.WorkshopBayId,
                BayName = Names.Of(names.Bays, x.WorkshopBayId),
                WorkNote = x.WorkNote,
                StartAt = x.StartAt,
                EndAt = x.EndAt,
                Minutes = Math.Max(0, (int)((x.EndAt ?? now) - x.StartAt).TotalMinutes)
            })
            .ToList();

        dto.WorkingNow =
            string.Join(", ", dto.WorkEntries.Where(x => x.EndAt == null).Select(x => x.TechnicianName).Distinct());

        dto.Checklist =
            await _context.Set<JobCardChecklist>().AsNoTracking()
                .Where(x => x.JobCardId == id)
                .OrderBy(x => x.LineNo)
                .Select(x => new JobCardChecklistDto
                {
                    WorkshopChecklistItemId = x.WorkshopChecklistItemId,
                    ItemName = x.ItemName,
                    Result = x.Result,
                    Note = x.Note
                })
                .ToListAsync();

        dto.StatusHistory =
            await _context.Set<JobCardStatusHistory>().AsNoTracking()
                .Where(x => x.JobCardId == id)
                .OrderBy(x => x.ChangedAt)
                .Select(x => new JobCardStatusDto { Status = x.Status, Note = x.Note, ChangedAt = x.ChangedAt })
                .ToListAsync();

        return dto;
    }


    //===========================================================
    // Saving
    //===========================================================

    public async Task<JobCardDto> SaveAsync(Guid? publicId, SaveJobCardDto dto, long userId)
    {
        DateOnly jobDate =
            HrCalendar.ParseDay(dto.JobDate)
            ?? throw new InvalidOperationException("Give the date of the job card.");

        if (jobDate > HrCalendar.Today())
        {
            throw new InvalidOperationException("The date of a job card cannot be in the future.");
        }

        if (!await _context.Set<Branches>().AsNoTracking().AnyAsync(x => x.BranchId == dto.BranchId && !x.IsDeleted))
        {
            throw new InvalidOperationException("Pick the service center.");
        }

        string jobType = (dto.JobType ?? string.Empty).Trim();

        if (!Ws.JobTypes.Contains(jobType))
        {
            throw new InvalidOperationException("Pick the job type.");
        }

        string fuel = (dto.FuelLevel ?? string.Empty).Trim();

        if (fuel.Length > 0 && !Ws.FuelLevels.Contains(fuel))
        {
            throw new InvalidOperationException("Pick the fuel level.");
        }

        WorkshopSwitchesDto switches = await Ws.SwitchesAsync(_context);

        if (dto.KmReading is < 0 or > 9999999)
        {
            throw new InvalidOperationException("The km reading is not right.");
        }

        if (switches.RequireKm && dto.KmReading == null)
        {
            throw new InvalidOperationException("Give the km reading of the bike.");
        }

        ServiceEstimates? fromEstimate = null;

        if (publicId == null)
        {
            if (dto.EstimatePublicId != null)
            {
                fromEstimate =
                    await _context.Set<ServiceEstimates>().FirstOrDefaultAsync(x => x.PublicId == dto.EstimatePublicId && !x.IsDeleted)
                    ?? throw new InvalidOperationException("The estimate of this job card was not found.");

                string estimateName = Est.Name(fromEstimate.EstimateNo, fromEstimate.Version);

                if (fromEstimate.JobCardId != null)
                {
                    throw new InvalidOperationException($"{estimateName} became a job card already.");
                }

                if (!Est.Live.Contains(fromEstimate.Status))
                {
                    throw new InvalidOperationException($"{estimateName} is {fromEstimate.Status} : a job card cannot be made from it.");
                }
            }

            // The switch Estimate Driven Job Card blocks nothing any
            // more (owner 2026-11-18) : it only brings the estimate of
            // the job to Job Card Requirements
        }

        JobCards entity;

        if (publicId == null)
        {
            entity = new JobCards
            {
                JobCardNo = string.Empty,
                CheckInAt = DateTime.UtcNow,
                Status = Ws.Open,
                StatusDate = DateTime.UtcNow,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };
        }
        else
        {
            entity =
                await Cards.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
                ?? throw new KeyNotFoundException("The job card was not found.");

            if (!Ws.Editable.Contains(entity.Status))
            {
                throw new InvalidOperationException($"{entity.JobCardNo} is {entity.Status} : it cannot be changed. Take it back to In Progress first.");
            }

            entity.ModifiedBy = userId;
            entity.ModifiedDate = DateTime.UtcNow;
        }

        //-------------------------------------------------------
        // The bike
        //-------------------------------------------------------

        ServiceEnquiriesDefaultsDto catalogue = await _enquiries.GetDefaultsAsync(jobDate);

        if (dto.ServiceVehicleId != null)
        {
            ServiceVehicles vehicle =
                await _context.Set<ServiceVehicles>().AsNoTracking().FirstOrDefaultAsync(x => x.ServiceVehicleId == dto.ServiceVehicleId && !x.IsDeleted)
                ?? throw new InvalidOperationException("The bike was not found : find it again.");

            entity.ServiceVehicleId = vehicle.ServiceVehicleId;
            entity.ChassisNo = vehicle.ChassisNo;
            entity.EngineNo = vehicle.EngineNo;
            entity.RegistrationNo = vehicle.RegistrationNo;
            entity.ModelId = vehicle.ModelId;
            entity.ModelName = vehicle.ModelName;
            entity.BrandManagementId = vehicle.BrandManagementId;
            entity.BrandName = vehicle.BrandName;
            entity.ColorName = vehicle.ColorName;
            entity.CustomerId = dto.CustomerId ?? vehicle.CustomerId;

            // sold by us : the sale date
            entity.PurchaseDate = vehicle.SaleDate;
        }
        else
        {
            string chassis = Ws.Clean(dto.ChassisNo, 50, "Chassis No").ToUpperInvariant();

            string registration = Ws.Clean(dto.RegistrationNo, 50, "Registration No").ToUpperInvariant();

            if (chassis.Length == 0 && registration.Length == 0)
            {
                throw new InvalidOperationException("Give the chassis no or the registration no of the bike.");
            }

            entity.ServiceVehicleId = null;
            entity.ChassisNo = chassis;
            entity.EngineNo = Ws.Clean(dto.EngineNo, 50, "Engine No").ToUpperInvariant();
            entity.RegistrationNo = registration;
            entity.ColorName = Ws.Clean(dto.ColorName, 60, "Colour");
            entity.CustomerId = dto.CustomerId;

            // a bike of another showroom : what the customer says
            if (dto.PurchaseDate != null)
            {
                entity.PurchaseDate = HrCalendar.ParseDay(dto.PurchaseDate);
            }

            EnquiryModelOptionDto? model = dto.ModelId == null ? null : catalogue.Models.FirstOrDefault(x => x.Id == dto.ModelId);

            if (model != null)
            {
                entity.ModelId = model.Id;
                entity.ModelName = model.Name;
                entity.BrandManagementId = model.BrandManagementId;
                entity.BrandName = model.BrandName;
            }
            else
            {
                entity.ModelId = null;
                entity.ModelName = Ws.Clean(dto.ModelName, 150, "Model");
                entity.BrandManagementId = null;
                entity.BrandName = Ws.Clean(dto.BrandName, 100, "Brand");

                // a bike of the workshop's own list (we do not sell
                // it) : its brand, model and colour
                JobCardMotorBikeDto? own =
                    dto.ServiceBikeId == null ? null : (await ServiceBikesAsync(dto.ServiceBikeId)).FirstOrDefault();

                if (own != null)
                {
                    entity.ModelName = own.ModelName;
                    entity.BrandManagementId = own.BrandManagementId;
                    entity.BrandName = own.BrandName;
                    entity.ColorName = own.ColorName.Length > 60 ? own.ColorName.Substring(0, 60) : own.ColorName;
                }

                if (entity.ModelName.Length == 0)
                {
                    throw new InvalidOperationException("Give the model of the bike.");
                }
            }
        }

        // One card for a bike at a time
        string? other = await OtherOpenCardAsync(entity);

        if (other != null)
        {
            throw new InvalidOperationException($"This bike is on job card {other}, which is still open.");
        }

        //-------------------------------------------------------
        // The customer and the job
        //-------------------------------------------------------

        // Serviced last : the immediate previous job card of the bike
        // (a bike sold by us : by the bike; another one : by its
        // chassis no); otherwise what the opening desk was told
        string lastChassis = (entity.ChassisNo ?? string.Empty).Trim();

        DateOnly? servicedHere =
            entity.ServiceVehicleId != null
                ? await Cards.AsNoTracking()
                    .Where(x => !x.IsDeleted && x.Status != Ws.Cancelled
                             && x.ServiceVehicleId == entity.ServiceVehicleId && x.JobCardId != entity.JobCardId)
                    .MaxAsync(x => (DateOnly?)x.JobDate)
                : lastChassis.Length == 0
                    ? null
                    : await Cards.AsNoTracking()
                        .Where(x => !x.IsDeleted && x.Status != Ws.Cancelled
                                 && x.ChassisNo == lastChassis && x.JobCardId != entity.JobCardId && x.JobDate <= jobDate)
                        .MaxAsync(x => (DateOnly?)x.JobDate);

        if (servicedHere != null)
        {
            entity.LastServiceDate = servicedHere;
        }
        else if (dto.LastServiceDate != null)
        {
            entity.LastServiceDate = HrCalendar.ParseDay(dto.LastServiceDate);
        }

        // The New Job page (it sends the two dates) : the purchase
        // date or the last service date is needed, one of the two
        if ((dto.PurchaseDate != null || dto.LastServiceDate != null)
            && jobType != Ws.Internal
            && entity.PurchaseDate == null && entity.LastServiceDate == null)
        {
            throw new InvalidOperationException("Give the purchase date or the last service date of the bike : one of the two is needed.");
        }

        if (entity.PurchaseDate > jobDate || entity.LastServiceDate > jobDate)
        {
            throw new InvalidOperationException("The purchase date and the last service date cannot be after the date of the job card.");
        }

        entity.CustomerName = Ws.Clean(dto.CustomerName, 150, "Customer Name");
        entity.Mobile = Ws.Clean(dto.Mobile, 20, "Mobile");

        if (jobType != Ws.Internal && (entity.CustomerName.Length == 0 || entity.Mobile.Length == 0))
        {
            throw new InvalidOperationException("Give the name and the mobile no of the customer.");
        }

        if (dto.AdvisorEmployeeId != null
            && !await _context.Set<HrEmployees>().AsNoTracking().AnyAsync(x => x.EmployeeId == dto.AdvisorEmployeeId && !x.IsDeleted))
        {
            throw new InvalidOperationException("The service advisor was not found.");
        }

        entity.ServiceVehicleScheduleId = null;

        if (dto.ServiceVehicleScheduleId != null)
        {
            ServiceVehicleSchedules schedule =
                await _context.Set<ServiceVehicleSchedules>().AsNoTracking().FirstOrDefaultAsync(x => x.ServiceVehicleScheduleId == dto.ServiceVehicleScheduleId)
                ?? throw new InvalidOperationException("The scheduled service was not found.");

            if (entity.ServiceVehicleId == null || schedule.ServiceVehicleId != entity.ServiceVehicleId)
            {
                throw new InvalidOperationException("The scheduled service is not of this bike.");
            }

            if (schedule.Status == "Taken")
            {
                throw new InvalidOperationException($"{schedule.ServiceName} was taken already.");
            }

            entity.ServiceVehicleScheduleId = schedule.ServiceVehicleScheduleId;

            // The enquiry the schedule raised goes with it
            dto.ServiceEnquiryId ??= schedule.ServiceEnquiryId;
        }

        entity.ServiceEnquiryId = dto.ServiceEnquiryId;
        entity.JobDate = jobDate;
        entity.BranchId = dto.BranchId;
        entity.KmReading = dto.KmReading;
        entity.FuelLevel = fuel;
        entity.JobType = jobType;
        entity.AdvisorEmployeeId = dto.AdvisorEmployeeId;
        entity.BasicRequirement = Ws.Clean(dto.BasicRequirement, 1000, "Basic Requirement");
        entity.PromisedAt = Ws.Utc(dto.PromisedAt);
        entity.PickupDrop = dto.PickupDrop;
        entity.Remarks = Ws.Clean(dto.Remarks, 500, "Remarks");

        //-------------------------------------------------------
        // The lines
        //-------------------------------------------------------

        // The observations (null : not sent, they stay)
        List<JobCardObservations>? observations =
            dto.Observations?
                .Select(x => new
                {
                    x.WorkshopObservationId,
                    Text = Ws.Clean(x.Observation, 200, "Observation"),
                    Note = Ws.Clean(x.Note, 300, "Observation note")
                })
                .Where(x => x.Text.Length > 0)
                .Select((x, i) => new JobCardObservations
                {
                    LineNo = i + 1,
                    WorkshopObservationId = x.WorkshopObservationId,
                    Observation = x.Text,
                    Note = x.Note
                })
                .ToList();

        // The New Job page : no job card without an observation (the
        // customer has no complaint : "No complaint or problem")
        if (observations != null && observations.Count == 0)
        {
            throw new InvalidOperationException("Pick one observation at least. The customer has no complaint : pick No complaint or problem.");
        }

        List<JobCardComplaints> complaints =
            (dto.Complaints ?? new())
                .Select(x => Ws.Clean(x.Complaint, 300, "Complaint"))
                .Where(x => x.Length > 0)
                .Select((x, i) => new JobCardComplaints { LineNo = i + 1, Complaint = x })
                .ToList();

        var services = new List<JobCardServices>();

        foreach (JobCardServiceDto line in dto.Services ?? new())
        {
            string kind = (line.ItemKind ?? string.Empty).Trim();

            ServiceItemOptionDto? item =
                kind == "Other" || line.ItemId == null
                    ? null
                    : catalogue.ServiceItems.FirstOrDefault(x => x.Kind == kind && x.Id == line.ItemId);

            string name = item?.Name ?? Ws.Clean(line.ItemName, 200, "Service");

            if (name.Length == 0)
            {
                continue;
            }

            decimal quantity = line.Quantity <= 0 ? 1 : Ws.Round(line.Quantity);

            // A catalogue service is charged at its rate; a typed one
            // (or one no longer in the catalogue) at what was typed
            decimal rate = item != null ? item.Rate : Ws.Round(line.Rate);

            if (rate < 0)
            {
                throw new InvalidOperationException($"{name} : the rate cannot be below zero.");
            }

            services.Add(
                new JobCardServices
                {
                    LineNo = services.Count + 1,
                    ItemKind = item != null || line.ItemId != null ? kind : "Other",
                    ItemId = item != null ? item.Id : (kind == "Other" ? null : line.ItemId),
                    ItemCode = item?.Code ?? Ws.Clean(line.ItemCode, 40, "Service Code"),
                    ItemName = name,
                    Quantity = quantity,
                    Rate = rate,
                    Amount = Ws.Round(quantity * rate),
                    IsFree = item != null ? item.IsFree : line.IsFree,
                    Note = Ws.Clean(line.Note, 200, "Note")
                });
        }

        var parts = new List<JobCardParts>();

        if ((dto.Parts ?? new()).Count > 0)
        {
            List<PartOptionDto> partCatalogue = await _enquiries.GetPartsAsync();

            // A part of a business line the service center does not run
            // cannot be put on the card (the ones the card has already
            // stay)
            HashSet<string> branchLines = await Ws.BranchLinesAsync(_context, dto.BranchId);

            HashSet<string> hadParts =
                (await _context.Set<JobCardParts>().AsNoTracking()
                    .Where(x => x.JobCardId == entity.JobCardId && x.ItemId != null)
                    .Select(x => new { x.ItemKind, x.ItemId })
                    .ToListAsync())
                .Select(x => $"{x.ItemKind}:{x.ItemId}")
                .ToHashSet();

            foreach (JobCardPartDto line in dto.Parts!)
            {
                string kind = (line.ItemKind ?? string.Empty).Trim();

                if (kind != "Other" && line.ItemId != null && !branchLines.Contains(Ws.PartLine(kind)) && !hadParts.Contains($"{kind}:{line.ItemId}"))
                {
                    throw new InvalidOperationException($"{Ws.Clean(line.ItemName, 200, "Part")} : {Ws.PartLine(kind)} is not a business line of this service center (Settings > Business Configuration). Remove the line.");
                }

                PartOptionDto? item =
                    kind == "Other" || line.ItemId == null
                        ? null
                        : partCatalogue.FirstOrDefault(x => x.Kind == kind && x.Id == line.ItemId);

                string name = item?.Name ?? Ws.Clean(line.ItemName, 200, "Part");

                if (name.Length == 0)
                {
                    continue;
                }

                decimal quantity = Ws.Round(line.Quantity);

                if (quantity <= 0)
                {
                    throw new InvalidOperationException($"{name} : give the quantity.");
                }

                decimal rate = item?.Price ?? Ws.Round(line.Rate);

                if (rate < 0)
                {
                    throw new InvalidOperationException($"{name} : the rate cannot be below zero.");
                }

                parts.Add(
                    new JobCardParts
                    {
                        LineNo = parts.Count + 1,
                        ItemKind = item != null || line.ItemId != null ? kind : "Other",
                        ItemId = item != null ? item.Id : (kind == "Other" ? null : line.ItemId),
                        ItemCode = item?.Code ?? Ws.Clean(line.ItemCode, 40, "Part Code"),
                        ItemName = name,
                        Quantity = quantity,
                        Rate = rate,
                        Amount = Ws.Round(quantity * rate),
                        Note = Ws.Clean(line.Note, 200, "Note")
                    });
            }
        }

        // The card follows an approved estimate : its labour and
        // part lines stay as the estimate says
        bool linesLocked = false;

        if (!linesLocked)
        {
            entity.LabourTotal = services.Sum(x => x.Amount);
            entity.PartsTotal = parts.Sum(x => x.Amount);
        }

        //-------------------------------------------------------
        // The checklist : the active items on a new card; the
        // card's own rows afterwards
        //-------------------------------------------------------

        foreach (JobCardChecklistDto line in dto.Checklist ?? new())
        {
            if (!Ws.ChecklistResults.Contains((line.Result ?? string.Empty).Trim()))
            {
                throw new InvalidOperationException("A checklist item is OK, Not OK or N/A.");
            }
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        bool isNew = publicId == null;

        if (isNew)
        {
            entity.JobCardNo = (await _numberService.NextAsync(VoucherTypes.JobCard, entity.BranchId, jobDate)).VoucherNo;

            // The two tokens of the customer : the serial runs by
            // service center and day (deleted cards count)
            if (jobType != Ws.Internal)
            {
                long tokenBranchId = entity.BranchId;

                int serial =
                    ((await Cards.AsNoTracking().Where(x => x.BranchId == tokenBranchId && x.JobDate == jobDate).MaxAsync(x => (int?)x.TokenSerial)) ?? 0) + 1;

                entity.TokenSerial = serial;
                entity.WelcomeTokenNo = $"W-{serial:000}";
                entity.DeliveryTokenNo = $"D-{serial:000}-{Random.Shared.Next(1000, 10000)}";
            }

            Cards.Add(entity);
        }

        await _context.SaveChangesAsync();

        // The estimate the card was made from carries the card
        if (fromEstimate != null)
        {
            string estimateName = Est.Name(fromEstimate.EstimateNo, fromEstimate.Version);

            fromEstimate.JobCardId = entity.JobCardId;
            fromEstimate.Status = Est.Converted;
            fromEstimate.StatusDate = DateTime.UtcNow;
            fromEstimate.StatusNote = $"Job card {entity.JobCardNo}";
            fromEstimate.ModifiedBy = userId;
            fromEstimate.ModifiedDate = DateTime.UtcNow;

            Ws.AddHistory(_context, "ServiceEstimates", fromEstimate.ServiceEstimateId, "Status", "Estimate Converted", $"{estimateName} became job card {entity.JobCardNo}.", userId);
        }

        long id = entity.JobCardId;

        if (!isNew)
        {
            _context.Set<JobCardComplaints>().RemoveRange(await _context.Set<JobCardComplaints>().Where(x => x.JobCardId == id).ToListAsync());

            if (!linesLocked)
            {
                _context.Set<JobCardServices>().RemoveRange(await _context.Set<JobCardServices>().Where(x => x.JobCardId == id).ToListAsync());
                _context.Set<JobCardParts>().RemoveRange(await _context.Set<JobCardParts>().Where(x => x.JobCardId == id).ToListAsync());
            }
        }

        complaints.ForEach(x => x.JobCardId = id);
        services.ForEach(x => x.JobCardId = id);
        parts.ForEach(x => x.JobCardId = id);

        _context.Set<JobCardComplaints>().AddRange(complaints);

        if (observations != null)
        {
            if (!isNew)
            {
                _context.Set<JobCardObservations>().RemoveRange(await _context.Set<JobCardObservations>().Where(x => x.JobCardId == id).ToListAsync());
            }

            observations.ForEach(x => x.JobCardId = id);

            _context.Set<JobCardObservations>().AddRange(observations);
        }

        if (!linesLocked)
        {
            _context.Set<JobCardServices>().AddRange(services);
            _context.Set<JobCardParts>().AddRange(parts);
        }

        Dictionary<long, JobCardChecklistDto> marks =
            (dto.Checklist ?? new())
                .GroupBy(x => x.WorkshopChecklistItemId)
                .ToDictionary(g => g.Key, g => g.Last());

        if (isNew)
        {
            List<WorkshopChecklistItems> items =
                await _context.Set<WorkshopChecklistItems>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.SortOrder).ThenBy(x => x.Code)
                    .ToListAsync();

            int lineNo = 0;

            foreach (WorkshopChecklistItems item in items)
            {
                marks.TryGetValue(item.WorkshopChecklistItemId, out JobCardChecklistDto? mark);

                _context.Set<JobCardChecklist>().Add(
                    new JobCardChecklist
                    {
                        JobCardId = id,
                        WorkshopChecklistItemId = item.WorkshopChecklistItemId,
                        LineNo = ++lineNo,
                        ItemName = item.Name,
                        Result = (mark?.Result ?? string.Empty).Trim(),
                        Note = Ws.Clean(mark?.Note, 200, "Checklist Note")
                    });
            }

            _context.Set<JobCardStatusHistory>().Add(
                new JobCardStatusHistory { JobCardId = id, Status = Ws.Open, Note = "Checked in", ChangedBy = userId, ChangedAt = DateTime.UtcNow });
        }
        else
        {
            foreach (JobCardChecklist row in await _context.Set<JobCardChecklist>().Where(x => x.JobCardId == id).ToListAsync())
            {
                if (marks.TryGetValue(row.WorkshopChecklistItemId, out JobCardChecklistDto? mark))
                {
                    row.Result = (mark.Result ?? string.Empty).Trim();
                    row.Note = Ws.Clean(mark.Note, 200, "Checklist Note");
                }
            }
        }

        Ws.AddHistory(_context, Entity, id, isNew ? "Create" : "Update", isNew ? "Job Card Created" : "Job Card Updated", $"{entity.JobCardNo} : {entity.JobType}, {entity.ModelName} {(entity.RegistrationNo.Length > 0 ? entity.RegistrationNo : entity.ChassisNo)}, {entity.CustomerName}. {services.Count} service(s), {parts.Count} part(s).", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await FullAsync(entity);
    }


    //===========================================================
    // Status
    //===========================================================

    // The open job card another card's bike is on (null : none)
    private async Task<string?> OtherOpenCardAsync(JobCards card)
    {
        long cardId = card.JobCardId;

        long? vehicleId = card.ServiceVehicleId;

        string chassis = card.ChassisNo;

        string registration = card.RegistrationNo;

        IQueryable<JobCards> open =
            Cards.AsNoTracking().Where(x => !x.IsDeleted && x.JobCardId != cardId && !Ws.Closed.Contains(x.Status));

        open =
            vehicleId != null
                ? open.Where(x => x.ServiceVehicleId == vehicleId)
                : open.Where(x => x.ServiceVehicleId == null && x.ChassisNo == chassis && x.RegistrationNo == registration);

        return await open.Select(x => x.JobCardNo).FirstOrDefaultAsync();
    }

    private async Task<JobCards> LoadAsync(Guid publicId) =>
        await Cards.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
        ?? throw new KeyNotFoundException("The job card was not found.");

    // Work starts : the checklist must be marked when the switch says so
    private async Task NeedChecklistAsync(JobCards card)
    {
        if (!(await Ws.SwitchesAsync(_context)).RequireChecklist)
        {
            return;
        }

        int left = await _context.Set<JobCardChecklist>().AsNoTracking().CountAsync(x => x.JobCardId == card.JobCardId && x.Result == "");

        if (left > 0)
        {
            throw new InvalidOperationException($"{card.JobCardNo} : {left} checklist item(s) are not marked yet. Mark the check-in checklist before work starts.");
        }
    }

    // Work starts : the job card must be made from an estimate when
    // the switch says so (not for jobs the customer does not pay for)
    // (owner 2026-11-18 : the switch blocks nothing any more; a job
    // without an estimate works like any other)
    private Task NeedEstimateAsync(JobCards card) =>
        Task.CompletedTask;

    private void SetStatus(JobCards card, string status, string note, long userId)
    {
        card.Status = status;
        card.StatusDate = DateTime.UtcNow;
        card.ModifiedBy = userId;
        card.ModifiedDate = DateTime.UtcNow;

        _context.Set<JobCardStatusHistory>().Add(
            new JobCardStatusHistory { JobCardId = card.JobCardId, Status = status, Note = note, ChangedBy = userId, ChangedAt = DateTime.UtcNow });

        Ws.AddHistory(_context, Entity, card.JobCardId, "Status", $"Job Card {status}", $"{card.JobCardNo} is {status}.{(note.Length > 0 ? " " + note : string.Empty)}", userId);
    }

    public async Task<string> GetStatusAsync(Guid publicId) =>
        await Cards.AsNoTracking().Where(x => x.PublicId == publicId && !x.IsDeleted).Select(x => x.Status).FirstOrDefaultAsync()
        ?? throw new KeyNotFoundException("The job card was not found.");

    //-----------------------------------------------------------
    // Job Card Assignment (stage 2) : the service engineer, the
    // bay and the technicians (the first : the lead). An Open card
    // becomes Assigned; a card in work can be assigned again.
    //-----------------------------------------------------------

    public async Task<JobCardDto> AssignAsync(Guid publicId, AssignJobCardDto dto, long userId)
    {
        JobCards card = await LoadAsync(publicId);

        if (!Ws.Editable.Contains(card.Status))
        {
            throw new InvalidOperationException($"{card.JobCardNo} is {card.Status} : it cannot be assigned.");
        }

        // the Assignment page
        if (dto.Simple)
        {
            return await AssignSimpleAsync(card, dto, userId);
        }

        if (dto.ServiceEngineerEmployeeId == null
            || !await _context.Set<HrEmployees>().AsNoTracking().AnyAsync(x => x.EmployeeId == dto.ServiceEngineerEmployeeId && !x.IsDeleted))
        {
            throw new InvalidOperationException("Pick the service engineer.");
        }

        WorkshopBays bay =
            await _context.Set<WorkshopBays>().AsNoTracking().FirstOrDefaultAsync(x => x.WorkshopBayId == dto.WorkshopBayId && !x.IsDeleted && x.IsActive)
            ?? throw new InvalidOperationException("Pick the bay.");

        if (bay.BranchId != card.BranchId)
        {
            throw new InvalidOperationException($"{bay.Name} is not a bay of the service center of {card.JobCardNo}.");
        }

        List<long> technicianIds = (dto.TechnicianIds ?? new()).Distinct().ToList();

        if (technicianIds.Count == 0)
        {
            throw new InvalidOperationException("Pick the technician (the first is the lead).");
        }

        List<long> known =
            await _context.Set<WorkshopTechnicians>().AsNoTracking()
                .Where(x => technicianIds.Contains(x.WorkshopTechnicianId) && !x.IsDeleted && x.IsActive)
                .Select(x => x.WorkshopTechnicianId)
                .ToListAsync();

        if (known.Count != technicianIds.Count)
        {
            throw new InvalidOperationException("A technician was not found (or is not active) : pick the technicians again.");
        }

        // A technician who is working on the card now stays on it
        List<long> working =
            await _context.Set<JobCardWorkEntries>().AsNoTracking()
                .Where(x => x.JobCardId == card.JobCardId && x.EndAt == null)
                .Select(x => x.WorkshopTechnicianId)
                .ToListAsync();

        if (working.Any(x => !technicianIds.Contains(x)))
        {
            throw new InvalidOperationException($"A technician who is working on {card.JobCardNo} now cannot be taken off it : stop the work first.");
        }

        string note = Ws.Clean(dto.Note, 300, "Note");

        _context.Set<JobCardTechnicians>().RemoveRange(await _context.Set<JobCardTechnicians>().Where(x => x.JobCardId == card.JobCardId).ToListAsync());

        _context.Set<JobCardTechnicians>().AddRange(
            technicianIds.Select((x, i) => new JobCardTechnicians { JobCardId = card.JobCardId, LineNo = i + 1, WorkshopTechnicianId = x }));

        card.ServiceEngineerEmployeeId = dto.ServiceEngineerEmployeeId;
        card.WorkshopBayId = bay.WorkshopBayId;
        card.AssignedAt = DateTime.UtcNow;
        card.AssignedBy = userId;
        card.ModifiedBy = userId;
        card.ModifiedDate = DateTime.UtcNow;

        if (card.Status == Ws.Open)
        {
            SetStatus(card, Ws.Assigned, note.Length > 0 ? note : $"Bay {bay.Name}, {technicianIds.Count} technician(s)", userId);
        }
        else
        {
            Ws.AddHistory(_context, Entity, card.JobCardId, "Update", "Job Card Assigned Again", $"{card.JobCardNo} : bay {bay.Name}, {technicianIds.Count} technician(s).{(note.Length > 0 ? " " + note : string.Empty)}", userId);
        }

        await _context.SaveChangesAsync();

        return await FullAsync(card);
    }

    // The Assignment page (owner 2026-11-18) : the service engineer,
    // one technician (an employee for now), a foreman / supervisor
    // and a bay (both optional), the services with their standard
    // time, the allowed time and the expected delivery
    private async Task<JobCardDto> AssignSimpleAsync(JobCards card, AssignJobCardDto dto, long userId)
    {
        async Task<bool> EmployeeAsync(long? id) =>
            id != null && await _context.Set<HrEmployees>().AsNoTracking().AnyAsync(x => x.EmployeeId == id && !x.IsDeleted);

        if (!await EmployeeAsync(dto.ServiceEngineerEmployeeId))
        {
            throw new InvalidOperationException("Pick the service engineer.");
        }

        if (!await EmployeeAsync(dto.TechnicianEmployeeId))
        {
            throw new InvalidOperationException("Pick the technician.");
        }

        if (dto.SupervisorEmployeeId != null && !await EmployeeAsync(dto.SupervisorEmployeeId))
        {
            throw new InvalidOperationException("The foreman / supervisor was not found : pick again.");
        }

        WorkshopBays? bay = null;

        if (dto.WorkshopBayId != null)
        {
            bay =
                await _context.Set<WorkshopBays>().AsNoTracking().FirstOrDefaultAsync(x => x.WorkshopBayId == dto.WorkshopBayId && !x.IsDeleted && x.IsActive)
                ?? throw new InvalidOperationException("The bay was not found (or is not active) : pick again.");

            if (bay.BranchId != card.BranchId)
            {
                throw new InvalidOperationException($"{bay.Name} is not a bay of the service center of {card.JobCardNo}.");
            }
        }

        if (dto.AllowedMinutes < 1 || dto.AllowedMinutes > 43200)
        {
            throw new InvalidOperationException("Give the allowed time (1 minute to 30 days).");
        }

        if (dto.StandardMinutes < 0 || dto.StandardMinutes > 43200)
        {
            throw new InvalidOperationException("The standard time is not right.");
        }

        if (dto.ExpectedAt == null)
        {
            throw new InvalidOperationException("Give the delivery date.");
        }

        string note = Ws.Clean(dto.Note, 300, "Note");

        // The services picked on the page : the ones of the catalogue,
        // one each, at their rate
        if (dto.Services != null)
        {
            ServiceEnquiriesDefaultsDto catalogue = await _enquiries.GetDefaultsAsync(card.JobDate);

            var lines = new List<JobCardServices>();

            foreach (JobCardServiceDto line in dto.Services)
            {
                string kind = (line.ItemKind ?? string.Empty).Trim();

                ServiceItemOptionDto? item =
                    line.ItemId == null ? null : catalogue.ServiceItems.FirstOrDefault(x => x.Kind == kind && x.Id == line.ItemId);

                if (item == null || lines.Any(x => x.ItemKind == kind && x.ItemId == item.Id))
                {
                    continue;
                }

                lines.Add(
                    new JobCardServices
                    {
                        JobCardId = card.JobCardId,
                        LineNo = lines.Count + 1,
                        ItemKind = kind,
                        ItemId = item.Id,
                        ItemCode = item.Code,
                        ItemName = item.Name,
                        Quantity = 1,
                        Rate = item.Rate,
                        Amount = Ws.Round(item.Rate),
                        IsFree = item.IsFree
                    });
            }

            _context.Set<JobCardServices>().RemoveRange(await _context.Set<JobCardServices>().Where(x => x.JobCardId == card.JobCardId).ToListAsync());

            _context.Set<JobCardServices>().AddRange(lines);

            card.LabourTotal = lines.Sum(x => x.Amount);
        }

        card.ServiceEngineerEmployeeId = dto.ServiceEngineerEmployeeId;
        card.SupervisorEmployeeId = dto.SupervisorEmployeeId;
        card.TechnicianEmployeeId = dto.TechnicianEmployeeId;
        card.WorkshopBayId = bay?.WorkshopBayId;
        card.StandardMinutes = dto.StandardMinutes;
        card.AllowedMinutes = dto.AllowedMinutes;
        card.PromisedAt = Ws.Utc(dto.ExpectedAt);
        card.AssignedAt = DateTime.UtcNow;
        card.AssignedBy = userId;
        card.ModifiedBy = userId;
        card.ModifiedDate = DateTime.UtcNow;

        string technician =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => x.EmployeeId == dto.TechnicianEmployeeId)
                .Select(x => x.FullName)
                .FirstOrDefaultAsync() ?? string.Empty;

        string what = $"Technician {technician}, allowed {dto.AllowedMinutes} min{(bay != null ? ", bay " + bay.Name : string.Empty)}.{(note.Length > 0 ? " " + note : string.Empty)}";

        if (card.Status == Ws.Open)
        {
            SetStatus(card, Ws.Assigned, what.Length > 300 ? what.Substring(0, 300) : what, userId);
        }
        else
        {
            Ws.AddHistory(_context, Entity, card.JobCardId, "Update", "Job Card Assigned Again", $"{card.JobCardNo} : {what}", userId);
        }

        await _context.SaveChangesAsync();

        return await FullAsync(card);
    }

    //-----------------------------------------------------------
    // Job Card Requirements (owner 2026-11-18) : the parts and the
    // service charges an assigned job needs - its projection. They
    // are the lines of the card. An Assigned card becomes Allocated
    // (ready for parts and service issue); with every line taken
    // off again it goes back to Assigned.
    //-----------------------------------------------------------

    // The estimate of a job : the one the card carries; else, with
    // the switch Estimate Driven Job Card on, the newest live
    // estimate of the same bike in the same service center
    private async Task<ServiceEstimates?> EstimateOfAsync(JobCards card, WorkshopSwitchesDto switches)
    {
        ServiceEstimates? linked =
            (await Est.LiveByCardAsync(_context, card.JobCardId)).Values.FirstOrDefault();

        if (linked != null || !switches.RequireEstimate)
        {
            return linked;
        }

        string chassis = (card.ChassisNo ?? string.Empty).Trim();

        if (card.ServiceVehicleId == null && chassis.Length == 0)
        {
            return null;
        }

        return await _context.Set<ServiceEstimates>().AsNoTracking()
            .Where(x => !x.IsDeleted && x.JobCardId == null && x.BranchId == card.BranchId && Est.Live.Contains(x.Status)
                && ((card.ServiceVehicleId != null && x.ServiceVehicleId == card.ServiceVehicleId)
                    || (chassis.Length > 0 && x.ChassisNo == chassis)))
            .OrderByDescending(x => x.ServiceEstimateId)
            .FirstOrDefaultAsync();
    }

    public async Task<JobRequirementDto> GetRequirementAsync(Guid publicId)
    {
        JobCards card = await LoadAsync(publicId);

        var result = new JobRequirementDto { Card = await FullAsync(card) };

        WorkshopSwitchesDto switches = await Ws.SwitchesAsync(_context);

        // The switch off : the estimate does not come here
        ServiceEstimates? estimate = switches.RequireEstimate ? await EstimateOfAsync(card, switches) : null;

        if (estimate != null)
        {
            List<ServiceEstimateLines> lines =
                await _context.Set<ServiceEstimateLines>().AsNoTracking()
                    .Where(x => x.ServiceEstimateId == estimate.ServiceEstimateId)
                    .OrderBy(x => x.LineNo)
                    .ToListAsync();

            result.Estimate =
                new JobRequirementEstimateDto
                {
                    PublicId = estimate.PublicId,
                    Name = Est.Name(estimate.EstimateNo, estimate.Version),
                    Status = estimate.Status,
                    Linked = estimate.JobCardId == card.JobCardId,
                    ChargeTotal = estimate.ChargeTotal,
                    ChargeCollected = estimate.ChargeCollected,
                    Services =
                        lines.Where(x => x.LineType == Est.Service)
                            .Select(x => new JobCardServiceDto { ItemKind = x.ItemKind, ItemId = x.ItemId, ItemCode = x.ItemCode, ItemName = x.ItemName, Quantity = x.Quantity, Rate = x.Rate, Amount = x.Amount, IsFree = x.IsFree, Note = x.Note })
                            .ToList(),
                    Parts =
                        lines.Where(x => x.LineType == Est.Part)
                            .Select(x => new JobCardPartDto { ItemKind = x.ItemKind, ItemId = x.ItemId, ItemCode = x.ItemCode, ItemName = x.ItemName, Quantity = x.Quantity, Rate = x.Rate, Amount = x.Amount, Note = x.Note })
                            .ToList()
                };
        }

        Dictionary<string, decimal> issuedItems = await Wp.IssuedByItemAsync(_context, card.JobCardId);

        result.IssuedQuantity = issuedItems.Values.Sum();

        result.IssuedItems =
            issuedItems
                .Where(x => x.Value > 0m)
                .Select(x => new JobIssuedItemDto { ItemKind = x.Key.Split(':')[0], ItemId = long.Parse(x.Key.Split(':')[1]), Quantity = x.Value })
                .ToList();

        return result;
    }

    public async Task<JobRequirementDto> SaveRequirementAsync(Guid publicId, SaveJobRequirementDto dto, long userId)
    {
        JobCards card = await LoadAsync(publicId);

        if (!Ws.Allocatable.Contains(card.Status))
        {
            throw new InvalidOperationException(
                card.Status == Ws.Open
                    ? Ws.NotWorkable(card.JobCardNo, card.Status)
                    : $"{card.JobCardNo} is {card.Status} : its requirement cannot be changed any more.");
        }

        //-------------------------------------------------------
        // The service charges : a catalogue service at its rate, a
        // typed one at what was typed
        //-------------------------------------------------------

        ServiceEnquiriesDefaultsDto catalogue = await _enquiries.GetDefaultsAsync(card.JobDate);

        var services = new List<JobCardServices>();

        foreach (JobCardServiceDto line in dto.Services ?? new())
        {
            string kind = (line.ItemKind ?? string.Empty).Trim();

            ServiceItemOptionDto? item =
                kind == "Other" || line.ItemId == null
                    ? null
                    : catalogue.ServiceItems.FirstOrDefault(x => x.Kind == kind && x.Id == line.ItemId);

            string name = item?.Name ?? Ws.Clean(line.ItemName, 200, "Service");

            if (name.Length == 0)
            {
                continue;
            }

            decimal quantity = line.Quantity <= 0 ? 1 : Ws.Round(line.Quantity);

            // The charge of a service can be changed here (the
            // service manager allocates it); a free one stays free
            decimal rate = Ws.Round(line.Rate);

            if (rate < 0)
            {
                throw new InvalidOperationException($"{name} : the charge cannot be below zero.");
            }

            services.Add(
                new JobCardServices
                {
                    JobCardId = card.JobCardId,
                    LineNo = services.Count + 1,
                    ItemKind = item != null || line.ItemId != null ? kind : "Other",
                    ItemId = item != null ? item.Id : (kind == "Other" ? null : line.ItemId),
                    ItemCode = item?.Code ?? Ws.Clean(line.ItemCode, 40, "Service Code"),
                    ItemName = name,
                    Quantity = quantity,
                    Rate = rate,
                    Amount = Ws.Round(quantity * rate),
                    IsFree = item != null ? item.IsFree : line.IsFree,
                    Note = Ws.Clean(line.Note, 200, "Note")
                });
        }

        //-------------------------------------------------------
        // The parts : of the business lines the service center runs
        //-------------------------------------------------------

        var parts = new List<JobCardParts>();

        if ((dto.Parts ?? new()).Count > 0)
        {
            List<PartOptionDto> partCatalogue = await _enquiries.GetPartsAsync();

            HashSet<string> branchLines = await Ws.BranchLinesAsync(_context, card.BranchId);

            HashSet<string> hadParts =
                (await _context.Set<JobCardParts>().AsNoTracking()
                    .Where(x => x.JobCardId == card.JobCardId && x.ItemId != null)
                    .Select(x => new { x.ItemKind, x.ItemId })
                    .ToListAsync())
                .Select(x => $"{x.ItemKind}:{x.ItemId}")
                .ToHashSet();

            foreach (JobCardPartDto line in dto.Parts!)
            {
                string kind = (line.ItemKind ?? string.Empty).Trim();

                if (kind != "Other" && line.ItemId != null && !branchLines.Contains(Ws.PartLine(kind)) && !hadParts.Contains($"{kind}:{line.ItemId}"))
                {
                    throw new InvalidOperationException($"{Ws.Clean(line.ItemName, 200, "Part")} : {Ws.PartLine(kind)} is not a business line of this service center (Settings > Business Configuration). Remove the line.");
                }

                PartOptionDto? item =
                    kind == "Other" || line.ItemId == null
                        ? null
                        : partCatalogue.FirstOrDefault(x => x.Kind == kind && x.Id == line.ItemId);

                string name = item?.Name ?? Ws.Clean(line.ItemName, 200, "Part");

                if (name.Length == 0)
                {
                    continue;
                }

                decimal quantity = Ws.Round(line.Quantity);

                if (quantity <= 0)
                {
                    throw new InvalidOperationException($"{name} : give the quantity.");
                }

                if (parts.Any(x => x.ItemKind == kind && x.ItemId != null && x.ItemId == line.ItemId))
                {
                    throw new InvalidOperationException($"{name} is on the requirement twice : keep one line and change its quantity.");
                }

                decimal rate = item?.Price ?? Ws.Round(line.Rate);

                if (rate < 0)
                {
                    throw new InvalidOperationException($"{name} : the rate cannot be below zero.");
                }

                parts.Add(
                    new JobCardParts
                    {
                        JobCardId = card.JobCardId,
                        LineNo = parts.Count + 1,
                        ItemKind = item != null || line.ItemId != null ? kind : "Other",
                        ItemId = item != null ? item.Id : (kind == "Other" ? null : line.ItemId),
                        ItemCode = item?.Code ?? Ws.Clean(line.ItemCode, 40, "Part Code"),
                        ItemName = name,
                        Quantity = quantity,
                        Rate = rate,
                        Amount = Ws.Round(quantity * rate),
                        Note = Ws.Clean(line.Note, 200, "Note")
                    });
            }
        }

        bool empty = services.Count == 0 && parts.Count == 0;

        if (empty && card.Status == Ws.Assigned)
        {
            throw new InvalidOperationException("Add a part or a service charge at least.");
        }

        // A part that is with the job (issued, not returned) cannot
        // leave the requirement, nor go below what was issued
        foreach (KeyValuePair<string, decimal> issued in await Wp.IssuedByItemAsync(_context, card.JobCardId))
        {
            if (issued.Value <= 0m)
            {
                continue;
            }

            JobCardParts? kept = parts.FirstOrDefault(x => x.ItemId != null && $"{x.ItemKind}:{x.ItemId}" == issued.Key);

            if (kept == null)
            {
                throw new InvalidOperationException($"{card.JobCardNo} holds an issued part ({Wp.Qty(issued.Value)}) that is not on the requirement any more : return it first (Parts Returns).");
            }

            if (kept.Quantity < issued.Value)
            {
                throw new InvalidOperationException($"{kept.ItemName} : {Wp.Qty(issued.Value)} is issued to {card.JobCardNo} already. The quantity cannot go below that (return the parts first, Parts Returns).");
            }
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        _context.Set<JobCardServices>().RemoveRange(await _context.Set<JobCardServices>().Where(x => x.JobCardId == card.JobCardId).ToListAsync());
        _context.Set<JobCardParts>().RemoveRange(await _context.Set<JobCardParts>().Where(x => x.JobCardId == card.JobCardId).ToListAsync());

        _context.Set<JobCardServices>().AddRange(services);
        _context.Set<JobCardParts>().AddRange(parts);

        card.LabourTotal = services.Sum(x => x.Amount);
        card.PartsTotal = parts.Sum(x => x.Amount);
        card.ModifiedBy = userId;
        card.ModifiedDate = DateTime.UtcNow;

        // The estimate the lines came from carries the card
        WorkshopSwitchesDto switches = await Ws.SwitchesAsync(_context);

        if (dto.EstimatePublicId != null && switches.RequireEstimate && !empty)
        {
            ServiceEstimates? estimate =
                await _context.Set<ServiceEstimates>().FirstOrDefaultAsync(x => x.PublicId == dto.EstimatePublicId && !x.IsDeleted);

            if (estimate != null && estimate.JobCardId == null && Est.Live.Contains(estimate.Status))
            {
                string estimateName = Est.Name(estimate.EstimateNo, estimate.Version);

                estimate.JobCardId = card.JobCardId;
                estimate.Status = Est.Converted;
                estimate.StatusDate = DateTime.UtcNow;
                estimate.StatusNote = $"Job card {card.JobCardNo}";
                estimate.ModifiedBy = userId;
                estimate.ModifiedDate = DateTime.UtcNow;

                Ws.AddHistory(_context, "ServiceEstimates", estimate.ServiceEstimateId, "Status", "Estimate Converted", $"{estimateName} is the requirement of job card {card.JobCardNo}.", userId);
            }
        }

        string note = Ws.Clean(dto.Note, 200, "Note");

        string what = $"{parts.Count} part line(s) {card.PartsTotal:N2}, {services.Count} service charge(s) {card.LabourTotal:N2}.{(note.Length > 0 ? " " + note : string.Empty)}";

        if (empty)
        {
            SetStatus(card, Ws.Assigned, "The requirement was taken off.", userId);
        }
        else if (card.Status == Ws.Assigned)
        {
            SetStatus(card, Ws.Allocated, what, userId);
        }
        else
        {
            Ws.AddHistory(_context, Entity, card.JobCardId, "Update", "Job Card Requirement Changed", $"{card.JobCardNo} : {what}", userId);
        }

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetRequirementAsync(publicId);
    }

    public async Task<JobCardDto> ChangeStatusAsync(Guid publicId, JobCardStatusChangeDto dto, long userId)
    {
        JobCards card = await LoadAsync(publicId);

        string status = (dto.Status ?? string.Empty).Trim();

        string note = Ws.Clean(dto.Note, 300, "Note");

        if (!Ws.Next(card.Status).Contains(status))
        {
            throw new InvalidOperationException($"{card.JobCardNo} is {card.Status} : it cannot be made {(status.Length > 0 ? status : "that")}.");
        }

        List<JobCardWorkEntries> running =
            await _context.Set<JobCardWorkEntries>().Where(x => x.JobCardId == card.JobCardId && x.EndAt == null).ToListAsync();

        if (status == Ws.Cancelled)
        {
            if (note.Length == 0)
            {
                throw new InvalidOperationException("Say why the job card is cancelled.");
            }

            // Its parts go back to the store first
            if (await Wp.NetIssuedAsync(_context, card.JobCardId) > 0m)
            {
                throw new InvalidOperationException($"{card.JobCardNo} holds issued parts : return them (Parts Returns) before it is cancelled.");
            }

            // Not yet in work : nothing may be allocated to it (the
            // parts of the requirement are taken off first)
            if (Ws.Allocatable.Contains(card.Status)
                && await _context.Set<JobCardParts>().AsNoTracking().AnyAsync(x => x.JobCardId == card.JobCardId))
            {
                throw new InvalidOperationException($"{card.JobCardNo} has parts allocated : remove them (Job Card Requirements) before it is cancelled.");
            }

            // Its service charges are taken off first
            if (await _context.Set<JobCardServices>().AsNoTracking().AnyAsync(x => x.JobCardId == card.JobCardId))
            {
                throw new InvalidOperationException($"{card.JobCardNo} has service charges allocated : remove them (Job Card Requirements) before it is cancelled.");
            }

            // A job with an estimate : not before the Estimate Charge
            // is collected (the estimate work is paid for)
            ServiceEstimates? estimate = await EstimateOfAsync(card, await Ws.SwitchesAsync(_context));

            if (estimate != null && estimate.ChargeTotal > 0m && !estimate.ChargeCollected)
            {
                throw new InvalidOperationException($"{card.JobCardNo} has the estimate {Est.Name(estimate.EstimateNo, estimate.Version)} : collect its Estimate Charge (Service Estimates) before the job card is cancelled.");
            }

            // The parts bought outside for it are cancelled first
            if ((await Wo.PostedAsync(_context, card.JobCardId)).Count > 0)
            {
                throw new InvalidOperationException($"{card.JobCardNo} has outsourced parts : cancel them (tab Parts Needed) before it is cancelled.");
            }

            card.CancelReason = note;
        }
        else if (card.Status == Ws.Cancelled)
        {
            // Opened again : not while the bike is on another card
            string? other = await OtherOpenCardAsync(card);

            if (other != null)
            {
                throw new InvalidOperationException($"This bike is on job card {other}, which is still open.");
            }

            card.CancelReason = string.Empty;
        }

        if (status == Ws.InProgress && card.Status == Ws.Allocated)
        {
            await NeedChecklistAsync(card);
        }

        if (status == Ws.InProgress)
        {
            await NeedEstimateAsync(card);
        }

        // Nobody works on a card that waits, is done or is cancelled
        if (status != Ws.InProgress)
        {
            DateTime now = DateTime.UtcNow;

            running.ForEach(x => x.EndAt = now);
        }

        SetStatus(card, status, note, userId);

        await _context.SaveChangesAsync();

        return await FullAsync(card);
    }


    //===========================================================
    // Work : a technician on the job, with time stamps
    //===========================================================

    public async Task<JobCardDto> StartWorkAsync(Guid publicId, StartJobCardWorkDto dto, long userId)
    {
        JobCards card = await LoadAsync(publicId);

        // The stages go in order : work starts on an assigned card
        if (!Ws.Workable.Contains(card.Status))
        {
            throw new InvalidOperationException(
                card.Status == Ws.Open ? Ws.NotWorkable(card.JobCardNo, card.Status) : $"{card.JobCardNo} is {card.Status} : nobody can start work on it.");
        }

        WorkshopTechnicians technician =
            await _context.Set<WorkshopTechnicians>().AsNoTracking().FirstOrDefaultAsync(x => x.WorkshopTechnicianId == dto.WorkshopTechnicianId && !x.IsDeleted && x.IsActive)
            ?? throw new InvalidOperationException("Pick the technician.");

        if (dto.WorkshopBayId != null
            && !await _context.Set<WorkshopBays>().AsNoTracking().AnyAsync(x => x.WorkshopBayId == dto.WorkshopBayId && !x.IsDeleted && x.IsActive))
        {
            throw new InvalidOperationException("The bay was not found.");
        }

        // Only a technician the card is assigned to works on it
        if (!await _context.Set<JobCardTechnicians>().AsNoTracking().AnyAsync(x => x.JobCardId == card.JobCardId && x.WorkshopTechnicianId == technician.WorkshopTechnicianId))
        {
            throw new InvalidOperationException($"{card.JobCardNo} is not assigned to this technician : add the technician in Job Card Assignment first.");
        }

        if (await _context.Set<JobCardWorkEntries>().AsNoTracking().AnyAsync(x => x.JobCardId == card.JobCardId && x.WorkshopTechnicianId == technician.WorkshopTechnicianId && x.EndAt == null))
        {
            throw new InvalidOperationException("The technician is working on this job card already.");
        }

        if (card.Status == Ws.Allocated)
        {
            await NeedChecklistAsync(card);
        }

        await NeedEstimateAsync(card);

        _context.Set<JobCardWorkEntries>().Add(
            new JobCardWorkEntries
            {
                JobCardId = card.JobCardId,
                WorkshopTechnicianId = technician.WorkshopTechnicianId,
                // the bay of the assignment unless another is told
                WorkshopBayId = dto.WorkshopBayId ?? card.WorkshopBayId,
                WorkNote = Ws.Clean(dto.WorkNote, 200, "Work"),
                StartAt = DateTime.UtcNow,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            });

        // Work started : the card is In Progress
        if (card.Status != Ws.InProgress)
        {
            SetStatus(card, Ws.InProgress, "Work started", userId);
        }

        await _context.SaveChangesAsync();

        return await FullAsync(card);
    }

    public async Task<JobCardDto> StopWorkAsync(Guid publicId, long workEntryId, long userId)
    {
        JobCards card = await LoadAsync(publicId);

        JobCardWorkEntries entry =
            await _context.Set<JobCardWorkEntries>().FirstOrDefaultAsync(x => x.JobCardWorkEntryId == workEntryId && x.JobCardId == card.JobCardId)
            ?? throw new KeyNotFoundException("The work entry was not found.");

        if (entry.EndAt != null)
        {
            throw new InvalidOperationException("That work was stopped already.");
        }

        entry.EndAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await FullAsync(card);
    }

    public async Task<JobCardDto> DeleteWorkAsync(Guid publicId, long workEntryId, long userId)
    {
        JobCards card = await LoadAsync(publicId);

        if (!Ws.Editable.Contains(card.Status))
        {
            throw new InvalidOperationException($"{card.JobCardNo} is {card.Status} : its work cannot be changed.");
        }

        JobCardWorkEntries entry =
            await _context.Set<JobCardWorkEntries>().FirstOrDefaultAsync(x => x.JobCardWorkEntryId == workEntryId && x.JobCardId == card.JobCardId)
            ?? throw new KeyNotFoundException("The work entry was not found.");

        _context.Set<JobCardWorkEntries>().Remove(entry);

        Ws.AddHistory(_context, Entity, card.JobCardId, "Update", "Job Card Work Removed", $"{card.JobCardNo} : a work entry started {entry.StartAt:yyyy-MM-dd HH:mm} UTC was removed.", userId);

        await _context.SaveChangesAsync();

        return await FullAsync(card);
    }


    //===========================================================
    // Delete / Restore
    //===========================================================

    public async Task DeleteAsync(Guid publicId, long userId)
    {
        JobCards card = await LoadAsync(publicId);

        if (card.Status != Ws.Open && card.Status != Ws.Cancelled)
        {
            throw new InvalidOperationException($"{card.JobCardNo} is {card.Status} : only an Open or a Cancelled job card can be deleted. Cancel it instead.");
        }

        if (await _context.Set<JobCardWorkEntries>().AsNoTracking().AnyAsync(x => x.JobCardId == card.JobCardId))
        {
            throw new InvalidOperationException($"{card.JobCardNo} has work on it : it cannot be deleted. Cancel it instead.");
        }

        card.IsDeleted = true;
        card.DeletedBy = userId;
        card.DeletedDate = DateTime.UtcNow;

        Ws.AddHistory(_context, Entity, card.JobCardId, "Delete", "Job Card Deleted", card.JobCardNo, userId);

        await _context.SaveChangesAsync();
    }

    public async Task<string?> RestoreAsync(long userId)
    {
        JobCards? card = await Cards.Where(x => x.IsDeleted).OrderByDescending(x => x.DeletedDate).FirstOrDefaultAsync();

        if (card == null)
        {
            return null;
        }

        if (!Ws.Closed.Contains(card.Status))
        {
            string? other = await OtherOpenCardAsync(card);

            if (other != null)
            {
                throw new InvalidOperationException($"{card.JobCardNo} cannot come back : its bike is on job card {other}, which is still open.");
            }
        }

        card.IsDeleted = false;
        card.DeletedBy = null;
        card.DeletedDate = null;
        card.ModifiedBy = userId;
        card.ModifiedDate = DateTime.UtcNow;

        Ws.AddHistory(_context, Entity, card.JobCardId, "Restore", "Job Card Restored", card.JobCardNo, userId);

        await _context.SaveChangesAsync();

        return card.JobCardNo;
    }
}
