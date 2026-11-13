//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;
using AppCore.Domain.Entities.HumanResourceManangement.PayrollManagement;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.HumanResourceSetup;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.PayrollManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.HumanResourceManangement.EmployeeManagement;


//===============================================================
// Employee Movements Repository (hand-written page, 2026-11-13;
// NEVER run Code Sync for it)
//
//   Code MOV-0001 (deleted rows count, never reused).
//   Saving a movement changes the employee in the same
//   transaction; the row keeps what was before and after.
//     Increment     a new gross salary and / or another salary
//                   structure (Human Resource Setup > Salary
//                   Structures); one of the two must change
//     Promotion     a new designation; the salary too when a new
//                   gross / structure is given
//     Transfer      branch / department / shift (one must change)
//     Confirmation  Probation (or other) -> Permanent, with the
//                   confirmation date
//     Separation    the employee becomes Inactive on the last
//                   working day (not in the future); the final
//                   settlement is a note, paid by Payment Voucher
//   The effective date is not before joining nor before the
//   employee's latest movement, and not after this month. The
//   change applies from the day it is saved : a salary sheet made
//   afterwards uses the new salary for its whole month.
//   A movement is never edited. Only the employee's latest one
//   can be deleted : the employee goes back to what was before.
//===============================================================

public class EmployeeMovementsRepository
    : IEmployeeMovementsRepository
{
    private const string HistoryModule = "Human Resource";

    public const string HistoryEntity = "HrEmployeeMovements";

    private const string TypeIncrement = "Increment";

    private const string TypePromotion = "Promotion";

    private const string TypeTransfer = "Transfer";

    private const string TypeConfirmation = "Confirmation";

    private const string TypeSeparation = "Separation";

    private static readonly string[] MovementTypes =
        { TypeIncrement, TypePromotion, TypeTransfer, TypeConfirmation, TypeSeparation };

    private static readonly string[] SeparationTypes =
        { "Resignation", "Termination", "Retirement", "Contract End", "Other" };

    private static readonly string[] MonthNames =
    {
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    };

    private readonly AppDbContext _context;

    public EmployeeMovementsRepository(
        AppDbContext context)
    {
        _context = context;
    }

    private DbSet<HrEmployeeMovements> Movements => _context.Set<HrEmployeeMovements>();

    private DbSet<HrEmployeeMovementLines> MovementLines => _context.Set<HrEmployeeMovementLines>();

    private DbSet<HrEmployeeSalaryLines> SalaryLines => _context.Set<HrEmployeeSalaryLines>();


    //===========================================================
    // Helpers
    //===========================================================

    private static string Clean(string? value) =>
        string.Join(" ", (value ?? string.Empty).Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries));

    private static string Limited(string? value, int max, string label)
    {
        string text = Clean(value);

        if (text.Length > max)
        {
            throw new InvalidOperationException($"{label} cannot be longer than {max} characters.");
        }

        return text;
    }

    private static string Money(decimal amount) =>
        amount.ToString("#,0.##");

    private static string NextCode(IEnumerable<string> codes)
    {
        int highest = 0;

        foreach (string code in codes)
        {
            string value = (code ?? string.Empty).Trim();

            if (value.StartsWith("MOV-", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value.Substring(4), out int number)
                && number > highest)
            {
                highest = number;
            }
        }

        return $"MOV-{highest + 1:D4}";
    }

    private void AddHistory(long id, string type, string title, string description, long userId)
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = id,
                ActivityType = type,
                ActivityTitle = title,
                ActivityDescription = description.Length > 1000 ? description.Substring(0, 1000) : description,
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });
    }

    // The names behind the ids (short setup lists)
    private sealed class Names
    {
        public Dictionary<long, string> Branches = new();
        public Dictionary<long, string> Departments = new();
        public Dictionary<long, string> Designations = new();
        public Dictionary<long, string> Shifts = new();
        public Dictionary<long, string> Structures = new();

        public static string Of(Dictionary<long, string> map, long id) =>
            map.TryGetValue(id, out string? name) ? name : string.Empty;
    }

    private async Task<Names> NamesAsync()
    {
        return new Names
        {
            Branches =
                await _context.Set<Branches>().AsNoTracking().ToDictionaryAsync(x => x.BranchId, x => x.BranchName),
            Departments =
                await _context.Set<Department>().AsNoTracking().ToDictionaryAsync(x => x.DepartmentId, x => x.DepartmentName),
            Designations =
                await _context.Set<Designation>().AsNoTracking().ToDictionaryAsync(x => x.DesignationId, x => x.DesignationName),
            Shifts =
                await _context.Set<HrShifts>().AsNoTracking().ToDictionaryAsync(x => x.ShiftId, x => x.Name),
            Structures =
                await _context.Set<HrSalaryStructures>().AsNoTracking().ToDictionaryAsync(x => x.SalaryStructureId, x => x.Code + "  " + x.Name)
        };
    }

    // What changed, in a line
    private static string Summary(HrEmployeeMovements m, Names names)
    {
        List<string> parts = new();

        if (m.MovementType == TypeSeparation)
        {
            parts.Add(m.SeparationType);

            if (m.SettlementAmount > 0)
            {
                parts.Add($"settlement Tk {Money(m.SettlementAmount)}");
            }

            return string.Join(", ", parts);
        }

        if (m.NewDesignationId != m.OldDesignationId)
        {
            parts.Add($"{Names.Of(names.Designations, m.OldDesignationId)} -> {Names.Of(names.Designations, m.NewDesignationId)}");
        }

        if (m.NewBranchId != m.OldBranchId)
        {
            parts.Add($"{Names.Of(names.Branches, m.OldBranchId)} -> {Names.Of(names.Branches, m.NewBranchId)}");
        }

        if (m.NewDepartmentId != m.OldDepartmentId)
        {
            parts.Add($"{Names.Of(names.Departments, m.OldDepartmentId)} -> {Names.Of(names.Departments, m.NewDepartmentId)}");
        }

        if (m.NewShiftId != m.OldShiftId)
        {
            parts.Add($"{Names.Of(names.Shifts, m.OldShiftId)} -> {Names.Of(names.Shifts, m.NewShiftId)}");
        }

        if (m.NewEmploymentType != m.OldEmploymentType)
        {
            parts.Add($"{m.OldEmploymentType} -> {m.NewEmploymentType}");
        }

        if (m.NewSalaryStructureId != m.OldSalaryStructureId)
        {
            string before = m.OldSalaryStructureId == null ? "no structure" : Names.Of(names.Structures, m.OldSalaryStructureId.Value);
            string after = m.NewSalaryStructureId == null ? "no structure" : Names.Of(names.Structures, m.NewSalaryStructureId.Value);

            parts.Add($"salary {before} -> {after}");
        }

        if (m.NewGrossSalary != m.OldGrossSalary)
        {
            parts.Add($"gross Tk {Money(m.OldGrossSalary)} -> {Money(m.NewGrossSalary)}");
        }

        return string.Join(", ", parts);
    }


    //===========================================================
    // Read
    //===========================================================

    private async Task<List<EmployeeMovementDto>> ReadAsync(IQueryable<HrEmployeeMovements> source, bool withLines)
    {
        var rows =
            await (
                from m in source
                join e in _context.Set<HrEmployees>().AsNoTracking() on m.EmployeeId equals e.EmployeeId
                orderby m.MovementId descending
                select new { M = m, EmployeeCode = e.Code, EmployeeName = e.FullName })
            .ToListAsync();

        Names names = await NamesAsync();

        List<long> employeeIds = rows.Select(x => x.M.EmployeeId).Distinct().ToList();

        // the latest live movement of each employee
        var latest =
            await Movements.AsNoTracking()
                .Where(x => !x.IsDeleted && employeeIds.Contains(x.EmployeeId))
                .GroupBy(x => x.EmployeeId)
                .Select(g => new { EmployeeId = g.Key, MovementId = g.Max(x => x.MovementId) })
                .ToListAsync();

        List<long> movementIds = withLines ? rows.Select(x => x.M.MovementId).ToList() : new List<long>();

        var lines =
            await (
                from l in MovementLines.AsNoTracking()
                where movementIds.Contains(l.MovementId)
                join h in _context.Set<HrSalaryHeads>().AsNoTracking() on l.SalaryHeadId equals h.SalaryHeadId
                orderby (h.HeadType == "Earning" ? 0 : 1), h.DisplayOrder, h.Code
                select new { l.MovementId, l.SalaryHeadId, h.Name, h.HeadType, l.OldAmount, l.NewAmount })
            .ToListAsync();

        return rows
            .Select(x =>
            {
                HrEmployeeMovements m = x.M;

                return new EmployeeMovementDto
                {
                    PublicId = m.PublicId,
                    Code = m.Code,
                    EmployeeId = m.EmployeeId,
                    EmployeeCode = x.EmployeeCode,
                    EmployeeName = x.EmployeeName,
                    MovementType = m.MovementType,
                    EffectiveDate = HrCalendar.Day(m.EffectiveDate),
                    OldBranchId = m.OldBranchId,
                    OldBranchName = Names.Of(names.Branches, m.OldBranchId),
                    NewBranchId = m.NewBranchId,
                    NewBranchName = Names.Of(names.Branches, m.NewBranchId),
                    OldDepartmentId = m.OldDepartmentId,
                    OldDepartmentName = Names.Of(names.Departments, m.OldDepartmentId),
                    NewDepartmentId = m.NewDepartmentId,
                    NewDepartmentName = Names.Of(names.Departments, m.NewDepartmentId),
                    OldDesignationId = m.OldDesignationId,
                    OldDesignationName = Names.Of(names.Designations, m.OldDesignationId),
                    NewDesignationId = m.NewDesignationId,
                    NewDesignationName = Names.Of(names.Designations, m.NewDesignationId),
                    OldShiftId = m.OldShiftId,
                    OldShiftName = Names.Of(names.Shifts, m.OldShiftId),
                    NewShiftId = m.NewShiftId,
                    NewShiftName = Names.Of(names.Shifts, m.NewShiftId),
                    OldEmploymentType = m.OldEmploymentType,
                    NewEmploymentType = m.NewEmploymentType,
                    OldSalaryStructureId = m.OldSalaryStructureId ?? 0,
                    OldSalaryStructureName = m.OldSalaryStructureId == null ? string.Empty : Names.Of(names.Structures, m.OldSalaryStructureId.Value),
                    NewSalaryStructureId = m.NewSalaryStructureId ?? 0,
                    NewSalaryStructureName = m.NewSalaryStructureId == null ? string.Empty : Names.Of(names.Structures, m.NewSalaryStructureId.Value),
                    OldGrossSalary = m.OldGrossSalary,
                    NewGrossSalary = m.NewGrossSalary,
                    SalaryLines =
                        lines
                            .Where(l => l.MovementId == m.MovementId)
                            .Select(l => new MovementSalaryLineDto
                            {
                                SalaryHeadId = l.SalaryHeadId,
                                HeadName = l.Name,
                                HeadType = l.HeadType,
                                OldAmount = l.OldAmount,
                                NewAmount = l.NewAmount
                            })
                            .ToList(),
                    SeparationType = m.SeparationType,
                    SettlementAmount = m.SettlementAmount,
                    SettlementNote = m.SettlementNote,
                    Remarks = m.Remarks,
                    Summary = Summary(m, names),
                    IsLatest = latest.Any(l => l.EmployeeId == m.EmployeeId && l.MovementId == m.MovementId)
                };
            })
            .ToList();
    }

    public Task<List<EmployeeMovementDto>> GetListAsync() =>
        ReadAsync(Movements.AsNoTracking().Where(x => !x.IsDeleted), false);

    public async Task<EmployeeMovementDto> GetAsync(Guid publicId)
    {
        return (await ReadAsync(Movements.AsNoTracking().Where(x => x.PublicId == publicId && !x.IsDeleted), true)).FirstOrDefault()
            ?? throw new KeyNotFoundException("The employee movement was not found.");
    }

    public async Task<EmployeeMovementDefaultsDto> GetDefaultsAsync()
    {
        List<HrSalaryStructures> structures =
            await _context.Set<HrSalaryStructures>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.Code)
                .ToListAsync();

        List<long> structureIds = structures.Select(x => x.SalaryStructureId).ToList();

        var structureLines =
            await (
                from l in _context.Set<HrSalaryStructureLines>().AsNoTracking()
                where structureIds.Contains(l.SalaryStructureId)
                join h in _context.Set<HrSalaryHeads>().AsNoTracking() on l.SalaryHeadId equals h.SalaryHeadId
                orderby (h.HeadType == "Earning" ? 0 : 1), h.DisplayOrder, h.Code
                select new { l.SalaryStructureId, l.SalaryHeadId, h.Name, h.HeadType, h.SystemKey, l.Percent, l.Basis, l.FixedAmount })
            .ToListAsync();

        return new EmployeeMovementDefaultsDto
        {
            SalaryStructures =
                structures
                    .Select(x => new MovementSalaryStructureDto
                    {
                        Id = x.SalaryStructureId,
                        Name = x.Code + "  " + x.Name,
                        IsDefault = x.IsDefault,
                        Lines =
                            structureLines
                                .Where(l => l.SalaryStructureId == x.SalaryStructureId)
                                .Select(l => new MovementSalaryLineDto
                                {
                                    SalaryHeadId = l.SalaryHeadId,
                                    HeadName = l.Name,
                                    HeadType = l.HeadType,
                                    Percent = l.Percent,
                                    IsBasic = l.SystemKey == "BASIC",
                                    Basis = l.Basis,
                                    FixedAmount = l.FixedAmount
                                })
                                .ToList()
                    })
                    .ToList(),

            NextCode = NextCode(await Movements.AsNoTracking().Select(x => x.Code).ToListAsync()),

            Employees =
                await _context.Set<HrEmployees>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.Code)
                    .Select(x => new MovementEmployeeDto { Id = x.EmployeeId, Code = x.Code, Name = x.FullName })
                    .ToListAsync(),

            Branches =
                await _context.Set<Branches>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.BranchName)
                    .Select(x => new MovementLookupDto { Id = x.BranchId, Name = x.BranchName })
                    .ToListAsync(),

            Departments =
                await _context.Set<Department>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.DepartmentName)
                    .Select(x => new MovementLookupDto { Id = x.DepartmentId, Name = x.DepartmentName })
                    .ToListAsync(),

            Designations =
                await _context.Set<Designation>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.DesignationName)
                    .Select(x => new MovementLookupDto { Id = x.DesignationId, Name = x.DesignationName })
                    .ToListAsync(),

            Shifts =
                await _context.Set<HrShifts>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.Code)
                    .Select(x => new MovementLookupDto { Id = x.ShiftId, Name = x.Name })
                    .ToListAsync()
        };
    }

    public async Task<MovementEmployeeStateDto> GetEmployeeStateAsync(long employeeId)
    {
        HrEmployees e =
            await _context.Set<HrEmployees>().AsNoTracking().FirstOrDefaultAsync(x => x.EmployeeId == employeeId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The employee was not found.");

        Names names = await NamesAsync();

        var mine =
            await (
                from l in SalaryLines.AsNoTracking()
                where l.EmployeeId == employeeId
                join h in _context.Set<HrSalaryHeads>().AsNoTracking() on l.SalaryHeadId equals h.SalaryHeadId
                orderby (h.HeadType == "Earning" ? 0 : 1), h.DisplayOrder, h.Code
                select new { l.SalaryHeadId, l.Amount, h.Name, h.HeadType })
            .ToListAsync();

        List<MovementSalaryLineDto> lines =
            mine
                .Select(x => new MovementSalaryLineDto
                {
                    SalaryHeadId = x.SalaryHeadId,
                    HeadName = x.Name,
                    HeadType = x.HeadType,
                    OldAmount = x.Amount,
                    NewAmount = x.Amount
                })
                .ToList();

        DateOnly? lastMovement =
            await Movements.AsNoTracking()
                .Where(x => !x.IsDeleted && x.EmployeeId == employeeId)
                .OrderByDescending(x => x.EffectiveDate)
                .Select(x => (DateOnly?)x.EffectiveDate)
                .FirstOrDefaultAsync();

        // what the advances still owe
        List<HrSalaryAdvances> advances =
            await _context.Set<HrSalaryAdvances>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.EmployeeId == employeeId)
                .ToListAsync();

        Dictionary<long, decimal> recovered =
            await SalaryAdvancesRepository.RecoveredAsync(_context, advances.Select(x => x.AdvanceId).ToList());

        decimal advanceBalance =
            advances.Sum(a => Math.Max(0, a.Amount - (recovered.TryGetValue(a.AdvanceId, out decimal done) ? done : 0)));

        var lastSheet =
            await (
                from l in _context.Set<HrSalarySheetLines>().AsNoTracking()
                where l.EmployeeId == employeeId
                join s in _context.Set<HrSalarySheets>().AsNoTracking() on l.SalarySheetId equals s.SalarySheetId
                where !s.IsDeleted
                orderby s.Year descending, s.Month descending
                select new { s.Year, s.Month })
            .FirstOrDefaultAsync();

        return new MovementEmployeeStateDto
        {
            EmployeeId = e.EmployeeId,
            Code = e.Code,
            FullName = e.FullName,
            JoiningDate = HrCalendar.Day(e.JoiningDate),
            ConfirmationDate = HrCalendar.Day(e.ConfirmationDate),
            IsActive = e.IsActive,
            BranchId = e.BranchId,
            BranchName = Names.Of(names.Branches, e.BranchId),
            DepartmentId = e.DepartmentId,
            DepartmentName = Names.Of(names.Departments, e.DepartmentId),
            DesignationId = e.DesignationId,
            DesignationName = Names.Of(names.Designations, e.DesignationId),
            ShiftId = e.ShiftId,
            ShiftName = Names.Of(names.Shifts, e.ShiftId),
            EmploymentType = e.EmploymentType,
            SalaryStructureId = e.SalaryStructureId ?? 0,
            SalaryStructureName = e.SalaryStructureId == null ? string.Empty : Names.Of(names.Structures, e.SalaryStructureId.Value),
            GrossSalary = e.GrossSalary,
            SalaryLines = lines,
            LastMovementDate = HrCalendar.Day(lastMovement),
            AdvanceBalance = advanceBalance,
            LastSalaryMonth = lastSheet == null ? string.Empty : $"{MonthNames[lastSheet.Month - 1]} {lastSheet.Year}",
            HasLogin = e.UserProfileId != null
        };
    }


    //===========================================================
    // Write
    //===========================================================

    // Gives the employee the gross salary and the structure, and
    // returns the salary head by head before and after
    private async Task<List<HrEmployeeMovementLines>> ApplySalaryAsync(HrEmployees employee, long structureId, decimal gross)
    {
        if (!await _context.Set<HrSalaryStructures>().AsNoTracking()
                .AnyAsync(x => x.SalaryStructureId == structureId && !x.IsDeleted && x.IsActive))
        {
            throw new InvalidOperationException("The salary structure was not found (or is Inactive) : pick another one.");
        }

        var before =
            await SalaryLines.AsNoTracking()
                .Where(x => x.EmployeeId == employee.EmployeeId)
                .Select(x => new { x.SalaryHeadId, x.Amount })
                .ToListAsync();

        List<(long SalaryHeadId, decimal Amount)> after =
            SalaryStructuresRepository.Split(gross, await SalaryStructuresRepository.SplitLinesAsync(_context, structureId));

        await SalaryStructuresRepository.ApplyToEmployeeAsync(_context, employee, structureId, gross);

        // every head that has an amount on either side
        return before.Select(x => x.SalaryHeadId).Union(after.Select(x => x.SalaryHeadId))
            .Select(id => new HrEmployeeMovementLines
            {
                SalaryHeadId = id,
                OldAmount = before.FirstOrDefault(x => x.SalaryHeadId == id)?.Amount ?? 0,
                NewAmount = after.Where(x => x.SalaryHeadId == id).Select(x => x.Amount).FirstOrDefault()
            })
            .ToList();
    }

    public async Task<EmployeeMovementDto> CreateAsync(EmployeeMovementDto dto, long userId)
    {
        HrEmployees employee =
            await _context.Set<HrEmployees>().FirstOrDefaultAsync(x => x.EmployeeId == dto.EmployeeId && !x.IsDeleted)
            ?? throw new InvalidOperationException("Pick the employee.");

        string who = $"{employee.Code} {employee.FullName}";

        if (!employee.IsActive)
        {
            throw new InvalidOperationException($"{who} is Inactive : a movement is for an active employee.");
        }

        string type =
            MovementTypes.FirstOrDefault(x => string.Equals(x, Clean(dto.MovementType), StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("Pick the movement type.");

        DateOnly effective =
            HrCalendar.ParseDay(dto.EffectiveDate)
            ?? throw new InvalidOperationException("Effective Date is required.");

        DateOnly today = HrCalendar.Today();

        if (effective < employee.JoiningDate)
        {
            throw new InvalidOperationException($"{who} joined on {HrCalendar.Day(employee.JoiningDate)} : the effective date is before that.");
        }

        DateOnly? last =
            await Movements.AsNoTracking()
                .Where(x => !x.IsDeleted && x.EmployeeId == employee.EmployeeId)
                .OrderByDescending(x => x.EffectiveDate)
                .Select(x => (DateOnly?)x.EffectiveDate)
                .FirstOrDefaultAsync();

        if (last != null && effective < last)
        {
            throw new InvalidOperationException($"The latest movement of {who} is dated {HrCalendar.Day(last)} : a new one cannot be before it.");
        }

        if (type == TypeSeparation)
        {
            if (effective > today)
            {
                throw new InvalidOperationException("The last working day cannot be in the future : save the separation on or after that day.");
            }
        }
        else if (effective > new DateOnly(today.Year, today.Month, 1).AddMonths(1).AddDays(-1))
        {
            throw new InvalidOperationException("The effective date cannot be after this month : the change applies as soon as it is saved.");
        }

        HrEmployeeMovements movement = new()
        {
            EmployeeId = employee.EmployeeId,
            MovementType = type,
            EffectiveDate = effective,
            OldBranchId = employee.BranchId,
            NewBranchId = employee.BranchId,
            OldDepartmentId = employee.DepartmentId,
            NewDepartmentId = employee.DepartmentId,
            OldDesignationId = employee.DesignationId,
            NewDesignationId = employee.DesignationId,
            OldShiftId = employee.ShiftId,
            NewShiftId = employee.ShiftId,
            OldEmploymentType = employee.EmploymentType,
            NewEmploymentType = employee.EmploymentType,
            OldConfirmationDate = employee.ConfirmationDate,
            OldSalaryStructureId = employee.SalaryStructureId,
            NewSalaryStructureId = employee.SalaryStructureId,
            OldGrossSalary = employee.GrossSalary,
            NewGrossSalary = employee.GrossSalary,
            Remarks = Limited(dto.Remarks, 500, "Remarks"),
            IsDeleted = false,
            CreatedBy = userId,
            CreatedDate = DateTime.UtcNow
        };

        List<HrEmployeeMovementLines> lines = new();

        await using var transaction = await _context.Database.BeginTransactionAsync();

        switch (type)
        {
            case TypeIncrement:
            {
                // the structure stays when none is picked
                long structureId = dto.NewSalaryStructureId > 0 ? dto.NewSalaryStructureId : employee.SalaryStructureId ?? 0;

                decimal gross = Math.Round(dto.NewGrossSalary, 2);

                if (gross <= 0)
                {
                    throw new InvalidOperationException("Type the new gross salary.");
                }

                if (structureId <= 0)
                {
                    throw new InvalidOperationException("Pick the salary structure : it splits the gross salary into the salary heads.");
                }

                if (structureId == employee.SalaryStructureId && gross == employee.GrossSalary)
                {
                    throw new InvalidOperationException("The gross salary and the salary structure are the same as now : there is nothing to save.");
                }

                lines = await ApplySalaryAsync(employee, structureId, gross);

                break;
            }

            case TypePromotion:

                if (dto.NewDesignationId == employee.DesignationId)
                {
                    throw new InvalidOperationException("Pick the new designation.");
                }

                if (!await _context.Set<Designation>().AsNoTracking().AnyAsync(x => x.DesignationId == dto.NewDesignationId && !x.IsDeleted))
                {
                    throw new InvalidOperationException("Pick the new designation.");
                }

                employee.DesignationId = dto.NewDesignationId;

                // the salary too, when a new gross / structure was given
                if (dto.NewGrossSalary > 0 || dto.NewSalaryStructureId > 0)
                {
                    long promotedStructureId = dto.NewSalaryStructureId > 0 ? dto.NewSalaryStructureId : employee.SalaryStructureId ?? 0;

                    decimal promotedGross = dto.NewGrossSalary > 0 ? Math.Round(dto.NewGrossSalary, 2) : employee.GrossSalary;

                    if (promotedStructureId != employee.SalaryStructureId || promotedGross != employee.GrossSalary)
                    {
                        if (promotedStructureId <= 0)
                        {
                            throw new InvalidOperationException("Pick the salary structure : it splits the gross salary into the salary heads.");
                        }

                        if (promotedGross <= 0)
                        {
                            throw new InvalidOperationException("Type the new gross salary.");
                        }

                        lines = await ApplySalaryAsync(employee, promotedStructureId, promotedGross);
                    }
                }

                break;

            case TypeTransfer:

                long branchId = dto.NewBranchId > 0 ? dto.NewBranchId : employee.BranchId;
                long departmentId = dto.NewDepartmentId > 0 ? dto.NewDepartmentId : employee.DepartmentId;
                long shiftId = dto.NewShiftId > 0 ? dto.NewShiftId : employee.ShiftId;

                if (branchId == employee.BranchId && departmentId == employee.DepartmentId && shiftId == employee.ShiftId)
                {
                    throw new InvalidOperationException("Pick the new branch, department or shift.");
                }

                if (!await _context.Set<Branches>().AsNoTracking().AnyAsync(x => x.BranchId == branchId && !x.IsDeleted))
                {
                    throw new InvalidOperationException("The new branch was not found.");
                }

                if (!await _context.Set<Department>().AsNoTracking().AnyAsync(x => x.DepartmentId == departmentId && !x.IsDeleted))
                {
                    throw new InvalidOperationException("The new department was not found.");
                }

                if (!await _context.Set<HrShifts>().AsNoTracking().AnyAsync(x => x.ShiftId == shiftId && !x.IsDeleted))
                {
                    throw new InvalidOperationException("The new shift was not found.");
                }

                employee.BranchId = branchId;
                employee.DepartmentId = departmentId;
                employee.ShiftId = shiftId;

                break;

            case TypeConfirmation:

                if (employee.EmploymentType == "Permanent")
                {
                    throw new InvalidOperationException($"{who} is already Permanent.");
                }

                employee.EmploymentType = "Permanent";
                employee.ConfirmationDate = effective;

                break;

            case TypeSeparation:

                movement.SeparationType =
                    SeparationTypes.FirstOrDefault(x => string.Equals(x, Clean(dto.SeparationType), StringComparison.OrdinalIgnoreCase))
                    ?? throw new InvalidOperationException("Pick the kind of separation (Resignation, Termination ...).");

                if (dto.SettlementAmount < 0)
                {
                    throw new InvalidOperationException("The settlement amount cannot be negative.");
                }

                movement.SettlementAmount = Math.Round(dto.SettlementAmount, 2);
                movement.SettlementNote = Limited(dto.SettlementNote, 300, "Settlement Note");

                employee.IsActive = false;

                break;
        }

        movement.NewBranchId = employee.BranchId;
        movement.NewDepartmentId = employee.DepartmentId;
        movement.NewDesignationId = employee.DesignationId;
        movement.NewShiftId = employee.ShiftId;
        movement.NewEmploymentType = employee.EmploymentType;
        movement.NewSalaryStructureId = employee.SalaryStructureId;
        movement.NewGrossSalary = employee.GrossSalary;

        employee.ModifiedBy = userId;
        employee.ModifiedDate = DateTime.UtcNow;

        movement.Code = NextCode(await Movements.AsNoTracking().Select(x => x.Code).ToListAsync());

        Movements.Add(movement);

        await _context.SaveChangesAsync();

        foreach (HrEmployeeMovementLines line in lines)
        {
            line.MovementId = movement.MovementId;

            MovementLines.Add(line);
        }

        string summary = Summary(movement, await NamesAsync());

        AddHistory(
            movement.MovementId,
            "Create",
            $"Employee {type}",
            $"{movement.Code} : {who}, {type} from {HrCalendar.Day(effective)}{(summary.Length > 0 ? $" : {summary}" : string.Empty)}.",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetAsync(movement.PublicId);
    }

    public async Task DeleteAsync(Guid publicId, long userId)
    {
        HrEmployeeMovements movement =
            await Movements.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The employee movement was not found.");

        long latest =
            await Movements.AsNoTracking()
                .Where(x => !x.IsDeleted && x.EmployeeId == movement.EmployeeId)
                .MaxAsync(x => x.MovementId);

        if (latest != movement.MovementId)
        {
            throw new InvalidOperationException($"{movement.Code} is not the employee's latest movement : delete the later ones first.");
        }

        HrEmployees employee =
            await _context.Set<HrEmployees>().FirstOrDefaultAsync(x => x.EmployeeId == movement.EmployeeId && !x.IsDeleted)
            ?? throw new InvalidOperationException("The employee of the movement was deleted : restore the employee first.");

        await using var transaction = await _context.Database.BeginTransactionAsync();

        // the employee goes back to what was before
        employee.BranchId = movement.OldBranchId;
        employee.DepartmentId = movement.OldDepartmentId;
        employee.DesignationId = movement.OldDesignationId;
        employee.ShiftId = movement.OldShiftId;
        employee.EmploymentType = movement.OldEmploymentType;

        if (movement.MovementType == TypeConfirmation)
        {
            employee.ConfirmationDate = movement.OldConfirmationDate;
        }

        if (movement.MovementType == TypeSeparation)
        {
            employee.IsActive = true;
        }

        List<HrEmployeeMovementLines> lines =
            await MovementLines.AsNoTracking().Where(x => x.MovementId == movement.MovementId).ToListAsync();

        if (lines.Count > 0 || movement.NewSalaryStructureId != movement.OldSalaryStructureId)
        {
            // the structure and the lines the employee had before
            employee.SalaryStructureId = movement.OldSalaryStructureId;

            SalaryLines.RemoveRange(await SalaryLines.Where(x => x.EmployeeId == employee.EmployeeId).ToListAsync());

            foreach (HrEmployeeMovementLines line in lines.Where(x => x.OldAmount > 0))
            {
                SalaryLines.Add(new HrEmployeeSalaryLines { EmployeeId = employee.EmployeeId, SalaryHeadId = line.SalaryHeadId, Amount = line.OldAmount });
            }

            employee.GrossSalary = movement.OldGrossSalary;
        }

        employee.ModifiedBy = userId;
        employee.ModifiedDate = DateTime.UtcNow;

        movement.IsDeleted = true;
        movement.DeletedBy = userId;
        movement.DeletedDate = DateTime.UtcNow;

        AddHistory(
            movement.MovementId,
            "Delete",
            "Employee Movement Deleted",
            $"{movement.Code} : {employee.Code} {employee.FullName}, {movement.MovementType} of {HrCalendar.Day(movement.EffectiveDate)} taken back; the employee is as before.",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }
}
