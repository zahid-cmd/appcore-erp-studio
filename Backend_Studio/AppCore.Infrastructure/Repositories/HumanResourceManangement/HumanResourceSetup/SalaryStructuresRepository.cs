//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.HumanResourceManangement.HumanResourceSetup;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;
using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Salary Structures Repository (hand-written page, 2026-11-14;
// NEVER run Code Sync for it)
//
//   Code SST-001 (deleted rows count, never reused). The name is
//   not typed : Salary Structure - 1 / 2 / 3, from the code.
//   A deduction is worked out in one of three ways : a percent of
//   the gross salary, a percent of the basic salary or a fixed
//   amount (Basis Gross / Basic / Fixed).
//   A structure is a split of the gross salary : a percent for
//   each salary head (live normal heads and Basic; the payroll
//   heads Overtime / Absence / Late / Advance are worked out by
//   payroll and never stored). The earning percents add up to
//   exactly 100; the deduction percents (provident fund, tax ...)
//   are percents of the gross too and cannot be more than 100.
//   Lines are written again on every update.
//   One Default among live, active structures : saving a new
//   Default clears the old one first (same transaction). A new
//   Employee Profile starts with it.
//   The Employee Profile takes the gross salary (Tk a month) and
//   one structure. The employee's own lines
//   (HrEmployeeSalaryLines, read by payroll, the reports and the
//   movements) are worked out from the two by
//   ApplyToEmployeeAsync : amount = gross x percent / 100 to two
//   decimals; what rounding leaves over goes to the Basic line so
//   the earnings add up to the gross exactly. An update of the
//   structure works them out again for every live employee on it.
//   A structure with employees on it cannot be deleted.
//===============================================================

public class SalaryStructuresRepository
    : ISalaryStructuresRepository
{
    private const string HistoryModule = "Human Resource";

    public const string HistoryEntity = "HrSalaryStructures";

    private const string BasicKey = "BASIC";

    // How a line is worked out. An earning is always Gross; a
    // deduction is one of the three.
    public const string BasisGross = "Gross";

    public const string BasisBasic = "Basic";

    public const string BasisFixed = "Fixed";

    private readonly AppDbContext _context;

    public SalaryStructuresRepository(
        AppDbContext context)
    {
        _context = context;
    }

    private DbSet<HrSalaryStructures> Structures => _context.Set<HrSalaryStructures>();

    private DbSet<HrSalaryStructureLines> Lines => _context.Set<HrSalaryStructureLines>();


    //===========================================================
    // For the Employee Profile and the Employee Movements
    //===========================================================

    // A line of a structure with what the split needs of its head
    public sealed class SplitLine
    {
        public long SalaryHeadId;
        public string HeadType = string.Empty;
        public bool IsBasic;
        public decimal Percent;
        public string Basis = BasisGross;
        public decimal FixedAmount;
    }

    // The gross salary split by a structure : Tk for each head.
    // The earnings add up to the gross exactly (what rounding
    // leaves over goes to Basic, or to the largest earning when
    // the structure has no Basic line).
    public static List<(long SalaryHeadId, decimal Amount)> Split(decimal gross, List<SplitLine> lines)
    {
        List<(long SalaryHeadId, decimal Amount)> result = new();

        if (gross <= 0)
        {
            return result;
        }

        List<SplitLine> earnings = lines.Where(x => x.HeadType == "Earning" && x.Percent > 0).ToList();

        Dictionary<long, decimal> amounts =
            earnings.ToDictionary(
                x => x.SalaryHeadId,
                x => Math.Round(gross * x.Percent / 100m, 2, MidpointRounding.AwayFromZero));

        decimal left = gross - amounts.Values.Sum();

        if (left != 0 && earnings.Count > 0)
        {
            SplitLine keeper =
                earnings.FirstOrDefault(x => x.IsBasic)
                ?? earnings.OrderByDescending(x => x.Percent).First();

            amounts[keeper.SalaryHeadId] += left;
        }

        foreach (SplitLine line in earnings)
        {
            if (amounts[line.SalaryHeadId] > 0)
            {
                result.Add((line.SalaryHeadId, amounts[line.SalaryHeadId]));
            }
        }

        // the basic salary as it came out (0 without a Basic line)
        decimal basic =
            earnings.Where(x => x.IsBasic).Select(x => amounts[x.SalaryHeadId]).FirstOrDefault();

        // a deduction : a fixed amount, a percent of the basic
        // salary or a percent of the gross salary
        foreach (SplitLine line in lines.Where(x => x.HeadType != "Earning"))
        {
            decimal amount =
                line.Basis == BasisFixed ? line.FixedAmount
                : line.Basis == BasisBasic ? basic * line.Percent / 100m
                : gross * line.Percent / 100m;

            amount = Math.Round(amount, 2, MidpointRounding.AwayFromZero);

            if (amount > 0)
            {
                result.Add((line.SalaryHeadId, amount));
            }
        }

        return result;
    }

    // The lines of a structure, ready for Split
    public static async Task<List<SplitLine>> SplitLinesAsync(AppDbContext context, long structureId)
    {
        return await (
                from line in context.Set<HrSalaryStructureLines>().AsNoTracking()
                where line.SalaryStructureId == structureId
                join head in context.Set<HrSalaryHeads>().AsNoTracking() on line.SalaryHeadId equals head.SalaryHeadId
                select new SplitLine
                {
                    SalaryHeadId = line.SalaryHeadId,
                    HeadType = head.HeadType,
                    IsBasic = head.SystemKey == BasicKey,
                    Percent = line.Percent,
                    Basis = line.Basis,
                    FixedAmount = line.FixedAmount
                })
            .ToListAsync();
    }

    // Puts the gross salary and the structure on the employee : the
    // employee's salary lines are worked out from the two (no
    // structure, or no gross : no lines). The caller saves.
    public static async Task ApplyToEmployeeAsync(AppDbContext context, HrEmployees employee, long? structureId, decimal gross)
    {
        DbSet<HrEmployeeSalaryLines> mine = context.Set<HrEmployeeSalaryLines>();

        mine.RemoveRange(await mine.Where(x => x.EmployeeId == employee.EmployeeId).ToListAsync());

        if (structureId == null)
        {
            employee.SalaryStructureId = null;
            employee.GrossSalary = 0;

            return;
        }

        if (!await context.Set<HrSalaryStructures>().AsNoTracking()
                .AnyAsync(x => x.SalaryStructureId == structureId && !x.IsDeleted))
        {
            throw new InvalidOperationException("The salary structure was not found.");
        }

        gross = Math.Round(Math.Max(0, gross), 2);

        foreach ((long headId, decimal amount) in Split(gross, await SplitLinesAsync(context, structureId.Value)))
        {
            mine.Add(new HrEmployeeSalaryLines
            {
                EmployeeId = employee.EmployeeId,
                SalaryHeadId = headId,
                Amount = amount
            });
        }

        employee.SalaryStructureId = structureId;
        employee.GrossSalary = gross;
    }


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

    private static string NextCode(IEnumerable<string> codes)
    {
        int highest = 0;

        foreach (string code in codes)
        {
            string value = (code ?? string.Empty).Trim();

            if (value.StartsWith("SST-", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value.Substring(4), out int number)
                && number > highest)
            {
                highest = number;
            }
        }

        return $"SST-{highest + 1:D3}";
    }

    // SST-003 : Salary Structure - 3 (the name is not typed)
    private static string NameOf(string code) =>
        $"Salary Structure - {int.Parse(code.Substring(4))}";

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

    private async Task<HrSalaryStructures> FindAsync(Guid publicId)
    {
        return await Structures.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The salary structure was not found.");
    }

    // Heads that can go on a structure : live normal heads and
    // Basic (inactive ones too when asked : an old line keeps its
    // head)
    private async Task<List<HrSalaryHeads>> StructureHeadsAsync(bool activeOnly)
    {
        return await _context.Set<HrSalaryHeads>().AsNoTracking()
            .Where(x => !x.IsDeleted
                     && (x.SystemKey == string.Empty || x.SystemKey == BasicKey)
                     && (!activeOnly || x.IsActive))
            .OrderBy(x => x.HeadType == "Earning" ? 0 : 1).ThenBy(x => x.DisplayOrder).ThenBy(x => x.Code)
            .ToListAsync();
    }

    private static string Described(HrSalaryStructures s) =>
        $"{s.Code} {s.Name} : earnings {s.EarningPercent:0.###} % of the gross{(s.IsDefault ? ", Default" : string.Empty)}.";


    //===========================================================
    // Read
    //===========================================================

    private async Task<List<SalaryStructureDto>> ReadAsync(IQueryable<HrSalaryStructures> source)
    {
        List<HrSalaryStructures> structures = await source.OrderBy(x => x.Code).ToListAsync();

        List<long> ids = structures.Select(x => x.SalaryStructureId).ToList();

        var lines =
            await (
                from l in Lines.AsNoTracking()
                where ids.Contains(l.SalaryStructureId)
                join h in _context.Set<HrSalaryHeads>().AsNoTracking() on l.SalaryHeadId equals h.SalaryHeadId
                orderby (h.HeadType == "Earning" ? 0 : 1), h.DisplayOrder, h.Code
                select new { l.SalaryStructureId, l.SalaryHeadId, h.Name, h.HeadType, h.SystemKey, l.Percent, l.Basis, l.FixedAmount })
            .ToListAsync();

        var employees =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.SalaryStructureId != null && ids.Contains(x.SalaryStructureId.Value))
                .GroupBy(x => x.SalaryStructureId)
                .Select(g => new { SalaryStructureId = g.Key, Count = g.Count() })
                .ToListAsync();

        return structures
            .Select(s => new SalaryStructureDto
            {
                SalaryStructureId = s.SalaryStructureId,
                PublicId = s.PublicId,
                Code = s.Code,
                Name = s.Name,
                EarningPercent = s.EarningPercent,
                DeductionPercent = s.DeductionPercent,
                IsDefault = s.IsDefault && s.IsActive,
                Remarks = s.Remarks,
                IsActive = s.IsActive,
                EmployeeCount = employees.FirstOrDefault(e => e.SalaryStructureId == s.SalaryStructureId)?.Count ?? 0,
                Lines =
                    lines
                        .Where(l => l.SalaryStructureId == s.SalaryStructureId)
                        .Select(l => new SalaryStructureLineDto
                        {
                            SalaryHeadId = l.SalaryHeadId,
                            HeadName = l.Name,
                            HeadType = l.HeadType,
                            IsBasic = l.SystemKey == BasicKey,
                            Percent = l.Percent,
                            Basis = l.Basis,
                            FixedAmount = l.FixedAmount
                        })
                        .ToList()
            })
            .ToList();
    }

    public Task<List<SalaryStructureDto>> GetListAsync() =>
        ReadAsync(Structures.AsNoTracking().Where(x => !x.IsDeleted));

    public async Task<SalaryStructureDto> GetAsync(Guid publicId)
    {
        return (await ReadAsync(Structures.AsNoTracking().Where(x => x.PublicId == publicId && !x.IsDeleted))).FirstOrDefault()
            ?? throw new KeyNotFoundException("The salary structure was not found.");
    }

    public async Task<SalaryStructureDefaultsDto> GetDefaultsAsync()
    {
        var current =
            await Structures.AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && x.IsDefault)
                .Select(x => new { x.Code, x.PublicId })
                .FirstOrDefaultAsync();

        string nextCode = NextCode(await Structures.AsNoTracking().Select(x => x.Code).ToListAsync());

        return new SalaryStructureDefaultsDto
        {
            NextCode = nextCode,

            NextName = NameOf(nextCode),

            SalaryHeads =
                (await StructureHeadsAsync(true))
                    .Select(h => new SalaryStructureHeadDto
                    {
                        SalaryHeadId = h.SalaryHeadId,
                        Name = h.Name,
                        HeadType = h.HeadType,
                        IsBasic = h.SystemKey == BasicKey
                    })
                    .ToList(),

            DefaultCode = current?.Code ?? string.Empty,
            DefaultPublicId = current?.PublicId
        };
    }


    //===========================================================
    // Check + write
    //===========================================================

    // Checks the form, copies the status / totals to the structure
    // and returns its lines. The name is not typed : a new structure
    // is named from its code, an old one keeps its name.
    private async Task<List<HrSalaryStructureLines>> ApplyAsync(HrSalaryStructures entity, SalaryStructureDto dto)
    {
        List<HrSalaryHeads> heads = await StructureHeadsAsync(false);

        List<HrSalaryStructureLines> lines = new();

        decimal earnings = 0;
        decimal deductions = 0;

        bool hasBasic = false;
        bool needsBasic = false;

        foreach (SalaryStructureLineDto line in dto.Lines ?? new())
        {
            decimal percent = Math.Round(line.Percent, 3);
            decimal fixedAmount = Math.Round(line.FixedAmount, 2);

            HrSalaryHeads? head = heads.FirstOrDefault(x => x.SalaryHeadId == line.SalaryHeadId);

            bool isEarning = head?.HeadType == "Earning";

            // an earning is always a percent of the gross
            string basis =
                isEarning ? BasisGross
                : string.Equals(line.Basis, BasisFixed, StringComparison.OrdinalIgnoreCase) ? BasisFixed
                : string.Equals(line.Basis, BasisBasic, StringComparison.OrdinalIgnoreCase) ? BasisBasic
                : BasisGross;

            if (basis == BasisFixed)
            {
                percent = 0;
            }
            else
            {
                fixedAmount = 0;
            }

            if (percent == 0 && fixedAmount == 0)
            {
                // an empty line is simply dropped
                continue;
            }

            if (head == null)
            {
                throw new InvalidOperationException("A line has a head that is not on the Salary Heads page (or is worked out by payroll).");
            }

            if (percent < 0 || percent > 100)
            {
                throw new InvalidOperationException($"{head.Name} must be 0 to 100 percent.");
            }

            if (fixedAmount < 0)
            {
                throw new InvalidOperationException($"{head.Name} cannot be a negative amount.");
            }

            if (lines.Any(x => x.SalaryHeadId == head.SalaryHeadId))
            {
                throw new InvalidOperationException($"{head.Name} is on the structure twice.");
            }

            lines.Add(new HrSalaryStructureLines
            {
                SalaryHeadId = head.SalaryHeadId,
                Percent = percent,
                Basis = basis,
                FixedAmount = fixedAmount
            });

            if (isEarning)
            {
                earnings += percent;

                hasBasic = hasBasic || head.SystemKey == BasicKey;
            }
            else if (basis == BasisGross)
            {
                deductions += percent;
            }
            else if (basis == BasisBasic)
            {
                needsBasic = true;
            }
        }

        if (earnings != 100)
        {
            throw new InvalidOperationException($"The earnings must add up to 100 % of the gross salary : they add up to {earnings:0.###} %.");
        }

        if (deductions > 100)
        {
            throw new InvalidOperationException("The deductions cannot be more than 100 % of the gross salary.");
        }

        if (needsBasic && !hasBasic)
        {
            throw new InvalidOperationException("A deduction is a percent of the basic salary, but Basic Salary has no percent on this structure.");
        }

        entity.EarningPercent = earnings;
        entity.DeductionPercent = deductions;
        entity.Remarks = Limited(dto.Remarks, 500, "Remarks");
        entity.IsActive = dto.IsActive;

        // an inactive structure is never the Default
        entity.IsDefault = dto.IsDefault && dto.IsActive;

        return lines;
    }

    // Clears the other Default (before this one is saved as the
    // Default : the database allows one)
    private async Task ClearOtherDefaultsAsync(long selfId, long userId)
    {
        List<HrSalaryStructures> others =
            await Structures
                .Where(x => !x.IsDeleted && x.IsDefault && x.SalaryStructureId != selfId)
                .ToListAsync();

        foreach (HrSalaryStructures other in others)
        {
            other.IsDefault = false;
            other.ModifiedBy = userId;
            other.ModifiedDate = DateTime.UtcNow;

            AddHistory(other.SalaryStructureId, "Update", "Salary Structure Default Moved", $"{other.Code} {other.Name} : no longer the Default.", userId);
        }

        if (others.Count > 0)
        {
            await _context.SaveChangesAsync();
        }
    }

    private async Task WriteLinesAsync(long structureId, List<HrSalaryStructureLines> lines)
    {
        Lines.RemoveRange(await Lines.Where(x => x.SalaryStructureId == structureId).ToListAsync());

        await _context.SaveChangesAsync();

        foreach (HrSalaryStructureLines line in lines)
        {
            line.SalaryStructureId = structureId;

            Lines.Add(line);
        }

        await _context.SaveChangesAsync();
    }

    public async Task<SalaryStructureDto> CreateAsync(SalaryStructureDto dto, long userId)
    {
        HrSalaryStructures entity = new();

        List<HrSalaryStructureLines> lines = await ApplyAsync(entity, dto);

        bool isDefault = entity.IsDefault;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (isDefault)
        {
            await ClearOtherDefaultsAsync(0, userId);
        }

        entity.Code = NextCode(await Structures.AsNoTracking().Select(x => x.Code).ToListAsync());
        entity.Name = NameOf(entity.Code);

        string lower = entity.Name.ToLower();

        if (await Structures.AsNoTracking().AnyAsync(x => !x.IsDeleted && x.Name.ToLower() == lower))
        {
            throw new InvalidOperationException($"A salary structure named \"{entity.Name}\" already exists : rename or delete it first.");
        }

        entity.IsDeleted = false;
        entity.CreatedBy = userId;
        entity.CreatedDate = DateTime.UtcNow;

        Structures.Add(entity);

        await _context.SaveChangesAsync();

        await WriteLinesAsync(entity.SalaryStructureId, lines);

        AddHistory(entity.SalaryStructureId, "Create", "Salary Structure Created", Described(entity), userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetAsync(entity.PublicId);
    }

    public async Task UpdateAsync(Guid publicId, SalaryStructureDto dto, long userId)
    {
        HrSalaryStructures entity = await FindAsync(publicId);

        // the Default flag waits : the other Default is cleared first
        bool wasDefault = entity.IsDefault;

        List<HrSalaryStructureLines> lines = await ApplyAsync(entity, dto);

        bool isDefault = entity.IsDefault;

        entity.IsDefault = wasDefault && isDefault;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (isDefault)
        {
            await ClearOtherDefaultsAsync(entity.SalaryStructureId, userId);
        }

        entity.IsDefault = isDefault;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await WriteLinesAsync(entity.SalaryStructureId, lines);

        // the employees on the structure : their salary is worked
        // out again from their own gross
        List<HrEmployees> employees =
            await _context.Set<HrEmployees>()
                .Where(x => !x.IsDeleted && x.SalaryStructureId == entity.SalaryStructureId)
                .ToListAsync();

        foreach (HrEmployees employee in employees)
        {
            await ApplyToEmployeeAsync(_context, employee, entity.SalaryStructureId, employee.GrossSalary);
        }

        AddHistory(
            entity.SalaryStructureId,
            "Update",
            "Salary Structure Updated",
            $"{Described(entity)}{(employees.Count > 0 ? $" The salary of {employees.Count} employee(s) on it was worked out again." : string.Empty)}",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    public async Task DeleteAsync(Guid publicId, long userId)
    {
        HrSalaryStructures entity = await FindAsync(publicId);

        int used =
            await _context.Set<HrEmployees>().AsNoTracking()
                .CountAsync(x => !x.IsDeleted && x.SalaryStructureId == entity.SalaryStructureId);

        if (used > 0)
        {
            throw new InvalidOperationException($"{entity.Code} {entity.Name} is the salary structure of {used} employee(s) : move them to another structure first (or make this one Inactive).");
        }

        entity.IsDeleted = true;
        entity.IsDefault = false;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(entity.SalaryStructureId, "Delete", "Salary Structure Deleted", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();
    }

    public async Task<string?> RestoreAsync(long userId)
    {
        HrSalaryStructures? entity =
            await Structures.Where(x => x.IsDeleted).OrderByDescending(x => x.DeletedDate).FirstOrDefaultAsync();

        if (entity == null)
        {
            return null;
        }

        string lower = entity.Name.ToLower();

        if (await Structures.AsNoTracking().AnyAsync(x => !x.IsDeleted && x.Name.ToLower() == lower))
        {
            throw new InvalidOperationException($"{entity.Code} cannot be restored : a salary structure named \"{entity.Name}\" already exists.");
        }

        // comes back as a normal (not Default) structure
        entity.IsDeleted = false;
        entity.IsDefault = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.SalaryStructureId, "Restore", "Salary Structure Restored", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();

        return entity.Code;
    }
}
