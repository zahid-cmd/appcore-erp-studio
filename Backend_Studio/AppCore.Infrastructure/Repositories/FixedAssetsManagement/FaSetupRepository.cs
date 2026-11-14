//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using Microsoft.EntityFrameworkCore;
using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.FixedAssetsManagement;
using AppCore.Application.Platform.Accounting;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.FixedAssetsManagement;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Entities.Settings.AccountSettings;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.Accounting;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.FixedAssetsManagement;


//===============================================================
// What the Fixed Assets repositories share (hand-written pages,
// 2026-11-14; NEVER run Code Sync for them; tables made by
// FixedAssets_Engine.sql)
//===============================================================

internal static class Fa
{
    public const string HistoryModule = "Fixed Assets";

    public const string General = "General Ledger";

    public const string StraightLine = "StraightLine";

    public const string ReducingBalance = "ReducingBalance";

    // Never depreciated (land ...)
    public const string NoDepreciation = "None";

    public const string InUse = "In Use";

    // The statuses of a card that is still owned
    public static readonly string[] Live = { "In Use", "Idle", "Under Repair" };

    public static string Money(decimal value) => value.ToString("#,0.00", CultureInfo.InvariantCulture);

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

    public static string NextCode(IEnumerable<string> codes, string prefix)
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

        return $"{prefix}{highest + 1:D4}";
    }

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

    //-----------------------------------------------------------
    // Periods (yyyymm)
    //-----------------------------------------------------------

    public static int Period(DateOnly date) => date.Year * 100 + date.Month;

    public static bool IsPeriod(int period) =>
        period / 100 >= 1990 && period / 100 <= 2100 && period % 100 >= 1 && period % 100 <= 12;

    public static DateOnly PeriodStart(int period) => new(period / 100, period % 100, 1);

    public static DateOnly PeriodEnd(int period) => PeriodStart(period).AddMonths(1).AddDays(-1);

    public static int NextPeriod(int period) => Period(PeriodStart(period).AddMonths(1));

    public static string PeriodText(int period) =>
        IsPeriod(period) ? PeriodStart(period).ToString("MMM yyyy", CultureInfo.InvariantCulture) : string.Empty;

    //-----------------------------------------------------------
    // Depreciation of one month
    //
    //   Straight line    (cost - residual) / (life x 12), or
    //                    cost x rate % / 12 when no life is given
    //   Reducing balance (cost - depreciation so far) x rate % / 12
    //
    // never below the residual value.
    //-----------------------------------------------------------

    public static decimal Charge(string method, decimal ratePercent, int lifeYears, decimal cost, decimal residual, decimal accumulated)
    {
        decimal left = cost - residual - accumulated;

        if (left <= 0 || method == NoDepreciation || method.Length == 0)
        {
            return 0;
        }

        decimal charge =
            method == ReducingBalance
                ? (cost - accumulated) * ratePercent / 100m / 12m
                : lifeYears > 0
                    ? (cost - residual) / (lifeYears * 12m)
                    : cost * ratePercent / 100m / 12m;

        charge = Round(charge);

        return charge <= 0 ? 0 : Math.Min(charge, left);
    }

    public static decimal Charge(FaAssets a) =>
        Charge(a.Method, a.RatePercent, a.LifeYears, a.Cost + a.ImprovementCost, a.ResidualValue, a.AccumulatedDepreciation);

    //-----------------------------------------------------------
    // Journal Voucher lines
    //-----------------------------------------------------------

    public static JournalVoucherLineDto Line(string side, int group, string ledgerType, string ledgerCode, decimal amount, string note) =>
        new()
        {
            Side = side,
            GroupNo = group,
            LedgerType = ledgerType,
            LedgerCode = ledgerCode,
            Amount = amount,
            ShortNotes = note.Length > 200 ? note.Substring(0, 200) : note
        };

    public static JournalVoucherLineDto Debit(int group, string ledgerCode, decimal amount, string note, string ledgerType = General) =>
        Line("Debit", group, ledgerType, ledgerCode, amount, note);

    public static JournalVoucherLineDto Credit(int group, string ledgerCode, decimal amount, string note, string ledgerType = General) =>
        Line("Credit", group, ledgerType, ledgerCode, amount, note);

    public static string Short(string? voucherNo)
    {
        string text = voucherNo ?? string.Empty;

        return text.Length > 30 ? text.Substring(0, 30) : text;
    }

    // The depreciation of an asset group is declared
    // (Depreciation of Fixed Assets)
    public static bool Declared(FaCategories c) =>
        c.Method == NoDepreciation
        || (c.ExpenseLedgerCode.Length > 0
            && (c.Method == ReducingBalance ? c.RatePercent > 0
                : c.Method == StraightLine && (c.LifeYears > 0 || c.RatePercent > 0)));

    public static string RuleText(string method, decimal ratePercent, int lifeYears) =>
        method == NoDepreciation ? "No depreciation"
        : method == ReducingBalance ? $"Reducing balance {ratePercent:0.###} %"
        : method == StraightLine ? (lifeYears > 0 ? $"Straight line over {lifeYears} year(s)" : $"Straight line {ratePercent:0.###} %")
        : "Not declared";

    public static void NeedDeclared(FaCategories c)
    {
        if (!Declared(c))
        {
            throw new InvalidOperationException($"Asset group {c.Code} {c.Name} : declare its depreciation on Asset Setup > Depreciation of Fixed Assets first.");
        }
    }

    // The ledgers of an asset group, checked
    public static void NeedLedgers(FaCategories category)
    {
        if (category.CostLedgerCode.Length == 0 || category.AccumLedgerCode.Length == 0)
        {
            throw new InvalidOperationException($"Asset group {category.Code} {category.Name} has no ledgers : open it on Asset Groups and save it again.");
        }

        NeedDeclared(category);
    }

    //-----------------------------------------------------------
    // Names
    //-----------------------------------------------------------

    public static async Task<FaNames> NamesAsync(AppDbContext context) =>
        new()
        {
            Branches =
                (await context.Set<Branches>().AsNoTracking().Select(x => new { x.BranchId, x.BranchName }).ToListAsync())
                .ToDictionary(x => x.BranchId, x => x.BranchName),
            Categories =
                (await context.Set<FaCategories>().AsNoTracking().ToListAsync())
                .ToDictionary(x => x.FaCategoryId),
            Locations =
                (await context.Set<FaLocations>().AsNoTracking().Select(x => new { x.FaLocationId, x.Name }).ToListAsync())
                .ToDictionary(x => x.FaLocationId, x => x.Name),
            Employees =
                (await context.Set<HrEmployees>().AsNoTracking().Select(x => new { x.EmployeeId, x.Code, x.FullName }).ToListAsync())
                .ToDictionary(x => x.EmployeeId, x => x.Code + "  " + x.FullName)
        };

    public static FaAssetDto ToDto(FaAssets a, FaNames names)
    {
        decimal total = a.Cost + a.ImprovementCost;

        bool live = Live.Contains(a.Status);

        return new FaAssetDto
        {
            FaAssetId = a.FaAssetId,
            PublicId = a.PublicId,
            AssetNo = a.AssetNo,
            JournalVoucherNo = a.JournalVoucherNo,
            Name = a.Name,
            FaCategoryId = a.FaCategoryId,
            CategoryName = names.Category(a.FaCategoryId),
            Description = a.Description,
            Brand = a.Brand,
            Model = a.Model,
            SerialNo = a.SerialNo,
            BranchId = a.BranchId,
            BranchName = names.Branch(a.BranchId),
            FaLocationId = a.FaLocationId ?? 0,
            LocationName = names.Location(a.FaLocationId),
            CustodianEmployeeId = a.CustodianEmployeeId ?? 0,
            CustodianName = names.Employee(a.CustodianEmployeeId),
            SupplierName = a.SupplierName,
            PurchaseRef = a.PurchaseRef,
            PurchaseDate = HrCalendar.Day(a.PurchaseDate),
            UseDate = HrCalendar.Day(a.UseDate),
            Quantity = a.Quantity,
            Cost = a.Cost,
            ImprovementCost = a.ImprovementCost,
            TotalCost = total,
            ResidualValue = a.ResidualValue,
            Method = a.Method,
            RatePercent = a.RatePercent,
            LifeYears = a.LifeYears,
            OpeningAccumulated = a.OpeningAccumulated,
            AccumulatedDepreciation = a.AccumulatedDepreciation,
            BookValue = total - a.AccumulatedDepreciation,
            MonthlyCharge = live ? Charge(a) : 0,
            LastRunPeriod = a.LastRunPeriod,
            LastRunText = PeriodText(a.LastRunPeriod),
            Status = a.Status,
            Source = a.Source,
            DisposedDate = HrCalendar.Day(a.DisposedDate),
            Remarks = a.Remarks
        };
    }
}

internal sealed class FaNames
{
    public Dictionary<long, string> Branches { get; init; } = new();

    public Dictionary<long, FaCategories> Categories { get; init; } = new();

    public Dictionary<long, string> Locations { get; init; } = new();

    public Dictionary<long, string> Employees { get; init; } = new();

    public string Branch(long id) => Branches.TryGetValue(id, out string? name) ? name : string.Empty;

    public string Category(long id) => Categories.TryGetValue(id, out FaCategories? c) ? c.Name : string.Empty;

    public string Location(long? id) => id != null && Locations.TryGetValue(id.Value, out string? name) ? name : string.Empty;

    public string Employee(long? id) => id != null && Employees.TryGetValue(id.Value, out string? name) ? name : string.Empty;
}


//===============================================================
// Asset Setup : Asset Categories, Asset Locations, Asset
// Configuration, and the lists every page needs
//===============================================================

public class FaSetupRepository
    : IFaSetupRepository
{
        private readonly AppDbContext _context;

    private readonly IVoucherLedgerRepository _ledgers;

    public FaSetupRepository(
        AppDbContext context,
        IVoucherLedgerRepository ledgers)
    {
        _context = context;
        _ledgers = ledgers;
    }

    private DbSet<FaCategories> Categories => _context.Set<FaCategories>();

    private DbSet<FaLocations> Locations => _context.Set<FaLocations>();


    //===========================================================
    // Lookups
    //===========================================================

    public async Task<FaLookupsDto> GetLookupsAsync()
    {
        var ledgers = await _ledgers.GetAllAsync(true);

        // Payable To : the ledgers of one sub group, by its code
        string payableCode =
            ((await _context.Set<FaConfiguration>().AsNoTracking().OrderBy(x => x.FaConfigurationId).FirstOrDefaultAsync())?.PayableSubGroupCode
             ?? string.Empty).Trim();

        AccountSubGroup? payableSubGroup =
            payableCode.Length == 0
                ? null
                : await _context.Set<AccountSubGroup>().AsNoTracking().FirstOrDefaultAsync(x => !x.IsDeleted && x.SubGroupCode == payableCode);

        return new FaLookupsDto
        {
            PayableSubGroup = payableSubGroup == null ? payableCode : SubGroupText(payableSubGroup),
            PayableLedgers =
                ledgers
                    .Where(x => x.IsActive && !x.IsMoneyLedger && payableCode.Length > 0
                             && string.Equals((x.SubGroupCode ?? string.Empty).Trim(), payableCode, StringComparison.OrdinalIgnoreCase))
                    .OrderBy(x => x.LedgerName)
                    .Select(x => new FaLedgerDto { LedgerCode = x.LedgerCode, LedgerName = x.LedgerName, LedgerType = x.LedgerType })
                    .ToList(),
            Today = HrCalendar.Day(HrCalendar.Today()),
            Branches =
                await _context.Set<Branches>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.BranchName)
                    .Select(x => new FaLookupDto { Id = x.BranchId, Name = x.BranchName })
                    .ToListAsync(),
            Categories = (await GetCategoriesAsync()).Where(x => x.IsActive).ToList(),
            Locations =
                await Locations.AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.Name)
                    .Select(x => new FaLookupDto { Id = x.FaLocationId, Code = x.Code, Name = x.Name, BranchId = x.BranchId })
                    .ToListAsync(),
            Employees =
                await _context.Set<HrEmployees>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.Code)
                    .Select(x => new FaLookupDto { Id = x.EmployeeId, Code = x.Code, Name = x.FullName, BranchId = x.BranchId })
                    .ToListAsync(),
            Ledgers =
                ledgers
                    .Where(x => x.IsActive && !x.IsMoneyLedger
                             && (x.LedgerType == "Supplier" || x.LedgerType == "Customer"
                                 || (x.LedgerType == Fa.General && x.LedgerCode.StartsWith("GLR-", StringComparison.OrdinalIgnoreCase))))
                    .OrderBy(x => x.LedgerName)
                    .Select(x => new FaLedgerDto { LedgerCode = x.LedgerCode, LedgerName = x.LedgerName, LedgerType = x.LedgerType })
                    .ToList(),
            Configuration = await GetConfigurationAsync(),
            NextGroupCode = Fa.NextCode(await Categories.AsNoTracking().Select(x => x.Code).ToListAsync(), "FAC-"),
            NextLocationCode = Fa.NextCode(await Locations.AsNoTracking().Select(x => x.Code).ToListAsync(), "FAL-"),
            NextAcquisitionCode = Fa.NextCode(await _context.Set<FaAcquisitions>().AsNoTracking().Select(x => x.Code).ToListAsync(), "FAQ-"),
            PpeSubGroup = SubGroupText(await FindSubGroupAsync(true)),
            AcdSubGroup = SubGroupText(await FindSubGroupAsync(false)),
            PayableLedgerCode = PostingLedgerCodes.TryGet(_context, "ASSET-PURCHASE-PAYABLE") ?? string.Empty,
            ReceivableLedgerCode = PostingLedgerCodes.TryGet(_context, "ASSET-SALE-RECEIVABLE") ?? string.Empty
        };
    }


    //===========================================================
    // Asset Categories
    //===========================================================

    private async Task<List<FaCategoryDto>> ReadCategoriesAsync(IQueryable<FaCategories> source)
    {
        List<FaCategories> rows = await source.OrderBy(x => x.Code).ToListAsync();

        var used =
            await _context.Set<FaAssets>().AsNoTracking()
                .Where(x => !x.IsDeleted)
                .GroupBy(x => x.FaCategoryId)
                .Select(g => new { FaCategoryId = g.Key, Count = g.Count() })
                .ToListAsync();

        var names =
            await _ledgers.GetByCodesAsync(
                rows.SelectMany(c => new[] { c.CostLedgerCode, c.AccumLedgerCode, c.ExpenseLedgerCode })
                    .Where(x => x.Length > 0)
                    .Distinct()
                    .ToList());

        string NameOf(string code) => names.TryGetValue(code, out var ledger) ? ledger.LedgerName : string.Empty;

        return rows
            .Select(c => new FaCategoryDto
            {
                FaCategoryId = c.FaCategoryId,
                PublicId = c.PublicId,
                Code = c.Code,
                Name = c.Name,
                GroupName = c.GroupName,
                Method = c.Method,
                RatePercent = c.RatePercent,
                LifeYears = c.LifeYears,
                ResidualPercent = c.ResidualPercent,
                CostLedgerCode = c.CostLedgerCode,
                CostLedgerName = NameOf(c.CostLedgerCode),
                AccumLedgerCode = c.AccumLedgerCode,
                AccumLedgerName = NameOf(c.AccumLedgerCode),
                ExpenseLedgerCode = c.ExpenseLedgerCode,
                ExpenseLedgerName = NameOf(c.ExpenseLedgerCode),
                IsDeclared = Fa.Declared(c),
                RuleText = Fa.RuleText(c.Method, c.RatePercent, c.LifeYears),
                GainLedgerCode = c.GainLedgerCode,
                LossLedgerCode = c.LossLedgerCode,
                CapitalThreshold = c.CapitalThreshold,
                AllowGroupCard = c.AllowGroupCard,
                Remarks = c.Remarks,
                IsActive = c.IsActive,
                AssetCount = used.FirstOrDefault(u => u.FaCategoryId == c.FaCategoryId)?.Count ?? 0
            })
            .ToList();
    }

    public Task<List<FaCategoryDto>> GetCategoriesAsync() =>
        ReadCategoriesAsync(Categories.AsNoTracking().Where(x => !x.IsDeleted));

    public async Task<FaCategoryDto> GetCategoryAsync(Guid publicId) =>
        (await ReadCategoriesAsync(Categories.AsNoTracking().Where(x => x.PublicId == publicId && !x.IsDeleted))).FirstOrDefault()
        ?? throw new KeyNotFoundException("The asset group was not found.");

    //-----------------------------------------------------------
    // The ledgers of an asset group
    //
    // Making an asset group makes two General Ledgers with its
    // name :
    //     PPE - <name>   under the sub group "Property, Plant &
    //                    Equipment" (the cost)
    //     ACD - <name>   under the sub group "Accumulated
    //                    Depreciation" (the depreciation so far)
    // The two sub groups are found by name (or by the codes kept
    // on FaConfiguration). Renaming the group renames them.
    //-----------------------------------------------------------

    private const string CostPrefix = "PPE - ";

    private const string AccumPrefix = "ACD - ";

    private async Task<AccountSubGroup?> FindSubGroupAsync(bool cost)
    {
        FaConfiguration? config =
            await _context.Set<FaConfiguration>().AsNoTracking().OrderBy(x => x.FaConfigurationId).FirstOrDefaultAsync();

        string configured = ((cost ? config?.PpeSubGroupCode : config?.AcdSubGroupCode) ?? string.Empty).Trim();

        List<AccountSubGroup> all =
            await _context.Set<AccountSubGroup>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.SubGroupCode)
                .ToListAsync();

        if (configured.Length > 0)
        {
            return all.FirstOrDefault(x => string.Equals(x.SubGroupCode.Trim(), configured, StringComparison.OrdinalIgnoreCase));
        }

        return all.FirstOrDefault(x =>
        {
            string name = x.SubGroupName.ToLowerInvariant();

            return cost
                ? name.Contains("property") && name.Contains("plant")
                : name.Contains("accumulated") && name.Contains("deprec");
        });
    }

    private static string SubGroupText(AccountSubGroup? sub) =>
        sub == null ? string.Empty : $"{sub.SubGroupCode}  {sub.SubGroupName}";

    private static int LastNumber(string? code)
    {
        string[] parts = (code ?? string.Empty).Trim().Split('-', StringSplitOptions.RemoveEmptyEntries);

        return parts.Length >= 2 && int.TryParse(parts[^1], out int number) ? number : 0;
    }

    // The ledger of that name in the sub group (made when it is not
    // there) : its code
    private async Task<string> LedgerAsync(bool cost, string name, string groupCode, long userId)
    {
        AccountSubGroup sub =
            await FindSubGroupAsync(cost)
            ?? throw new InvalidOperationException(
                cost
                    ? "The account sub group \"Property, Plant & Equipment\" was not found : make it on Settings > Account Settings > Account Sub Groups (under Non Current Assets) first."
                    : "The account sub group \"Accumulated Depreciation\" was not found : make it on Settings > Account Settings > Account Sub Groups (under Non Current Assets) first.");

        DbSet<GeneralLedgers> ledgers = _context.Set<GeneralLedgers>();

        List<GeneralLedgers> inSubGroup = await ledgers.Where(x => x.AccountSubGroupId == sub.AccountSubGroupId).ToListAsync();

        GeneralLedgers? existing =
            inSubGroup.FirstOrDefault(x => !x.IsDeleted && string.Equals(x.LedgerName.Trim(), name, StringComparison.OrdinalIgnoreCase));

        if (existing != null)
        {
            existing.IsActive = true;

            return existing.LedgerCode;
        }

        // GLR-ccc-ggg-sss-nnnnn : the next number of the sub group
        // (deleted ledgers keep theirs)
        int next = inSubGroup.Select(x => LastNumber(x.LedgerCode)).DefaultIfEmpty(0).Max() + 1;

        string code = $"GLR-{LastNumber(sub.ClassCode):D3}-{LastNumber(sub.GroupCode):D3}-{LastNumber(sub.SubGroupCode):D3}-{next:D5}";

        ledgers.Add(
            new GeneralLedgers
            {
                AccountClassId = sub.AccountClassId,
                AccountGroupId = sub.AccountGroupId,
                AccountSubGroupId = sub.AccountSubGroupId,
                ClassCode = sub.ClassCode,
                Mode = sub.Mode,
                GroupCode = sub.GroupCode,
                SubGroupCode = sub.SubGroupCode,
                LedgerCode = code,
                LedgerName = name,
                Remarks = $"Auto : Fixed Assets asset group ({groupCode})",
                IsActive = true,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            });

        return code;
    }

    private async Task RenameLedgerAsync(string code, string prefix, string name, long userId)
    {
        if (code.Length == 0)
        {
            return;
        }

        GeneralLedgers? ledger = await _context.Set<GeneralLedgers>().FirstOrDefaultAsync(x => x.LedgerCode == code && !x.IsDeleted);

        // only a ledger the group made (it still carries the prefix)
        if (ledger != null && ledger.LedgerName.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            ledger.LedgerName = prefix + name;
            ledger.ModifiedBy = userId;
            ledger.ModifiedDate = DateTime.UtcNow;
        }
    }

    private async Task SetLedgersActiveAsync(FaCategories entity, bool active, long userId)
    {
        foreach (string code in new[] { entity.CostLedgerCode, entity.AccumLedgerCode }.Where(x => x.Length > 0))
        {
            GeneralLedgers? ledger = await _context.Set<GeneralLedgers>().FirstOrDefaultAsync(x => x.LedgerCode == code && !x.IsDeleted);

            if (ledger != null)
            {
                ledger.IsActive = active;
                ledger.ModifiedBy = userId;
                ledger.ModifiedDate = DateTime.UtcNow;
            }
        }
    }

    public async Task<FaCategoryDto> SaveCategoryAsync(Guid? publicId, FaCategoryDto dto, long userId)
    {
        string name = Fa.Clean(dto.Name, 90, "Asset Group Name");

        if (name.Length == 0)
        {
            throw new InvalidOperationException("Asset Group Name is required.");
        }

        if (await Categories.AsNoTracking().AnyAsync(x => !x.IsDeleted && x.PublicId != (publicId ?? Guid.Empty) && x.Name.ToLower() == name.ToLower()))
        {
            throw new InvalidOperationException($"An asset group named \"{name}\" exists already.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        FaCategories entity;

        if (publicId == null)
        {
            entity = new FaCategories
            {
                Code = Fa.NextCode(await Categories.AsNoTracking().Select(x => x.Code).ToListAsync(), "FAC-"),
                Method = string.Empty,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

            Categories.Add(entity);
        }
        else
        {
            entity =
                await Categories.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
                ?? throw new KeyNotFoundException("The asset group was not found.");

            entity.ModifiedBy = userId;
            entity.ModifiedDate = DateTime.UtcNow;
        }

        bool renamed = publicId != null && !string.Equals(entity.Name, name, StringComparison.Ordinal);

        entity.Name = name;
        // (the capitalisation limit was taken out : owner, 2026-11-14)
        entity.CapitalThreshold = 0;
        entity.AllowGroupCard = dto.AllowGroupCard;
        entity.Remarks = Fa.Clean(dto.Remarks, 500, "Remarks");
        entity.IsActive = dto.IsActive;

        // its two ledgers
        if (entity.CostLedgerCode.Length == 0)
        {
            entity.CostLedgerCode = await LedgerAsync(true, CostPrefix + name, entity.Code, userId);
        }
        else if (renamed)
        {
            await RenameLedgerAsync(entity.CostLedgerCode, CostPrefix, name, userId);
        }

        if (entity.AccumLedgerCode.Length == 0)
        {
            entity.AccumLedgerCode = await LedgerAsync(false, AccumPrefix + name, entity.Code, userId);
        }
        else if (renamed)
        {
            await RenameLedgerAsync(entity.AccumLedgerCode, AccumPrefix, name, userId);
        }

        await _context.SaveChangesAsync();

        Fa.AddHistory(_context, "FaCategories", entity.FaCategoryId, publicId == null ? "Create" : "Update", publicId == null ? "Asset Group Created" : "Asset Group Updated", $"{entity.Code} {entity.Name} : ledgers {CostPrefix}{entity.Name} ({entity.CostLedgerCode}) and {AccumPrefix}{entity.Name} ({entity.AccumLedgerCode}).{(entity.IsActive ? string.Empty : " Inactive.")}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetCategoryAsync(entity.PublicId);
    }

    //-----------------------------------------------------------
    // Depreciation of Fixed Assets : the rule of an asset group
    //-----------------------------------------------------------

    public async Task<FaCategoryDto> SaveDepreciationAsync(Guid publicId, FaCategoryDto dto, long userId)
    {
        FaCategories entity =
            await Categories.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The asset group was not found.");

        string method =
            new[] { Fa.NoDepreciation, Fa.StraightLine, Fa.ReducingBalance }
                .FirstOrDefault(x => string.Equals(x, dto.Method, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("Pick the depreciation method.");

        decimal rate = Math.Round(dto.RatePercent, 3);

        decimal residual = Math.Round(dto.ResidualPercent, 3);

        int life = dto.LifeYears;

        string[] codes =
            new[] { dto.ExpenseLedgerCode, dto.GainLedgerCode, dto.LossLedgerCode }
                .Select(x => (x ?? string.Empty).Trim())
                .ToArray();

        if (method == Fa.NoDepreciation)
        {
            rate = 0;
            life = 0;
            residual = 0;
            codes[0] = string.Empty;
        }
        else
        {
            if (rate < 0 || rate > 100 || residual < 0 || residual >= 100)
            {
                throw new InvalidOperationException("Rate must be 0 to 100 %, and the residual value below 100 %.");
            }

            if (life < 0 || life > 100)
            {
                throw new InvalidOperationException("Useful life must be 0 to 100 years.");
            }

            if (method == Fa.ReducingBalance && rate <= 0)
            {
                throw new InvalidOperationException("Reducing balance needs a rate (% a year).");
            }

            if (method == Fa.StraightLine && life <= 0 && rate <= 0)
            {
                throw new InvalidOperationException("Straight line needs a useful life (years) or a rate (% a year).");
            }

            if (method == Fa.ReducingBalance)
            {
                life = 0;
            }

            if (codes[0].Length == 0)
            {
                throw new InvalidOperationException("Pick the Depreciation Expense ledger.");
            }
        }

        var found = await _ledgers.GetByCodesAsync(codes.Where(x => x.Length > 0).Distinct().ToList());

        foreach (string code in codes.Where(x => x.Length > 0))
        {
            if (!found.TryGetValue(code, out var ledger) || !ledger.IsActive || ledger.IsMoneyLedger)
            {
                throw new InvalidOperationException($"Ledger '{code}' was not found, is inactive, or is a cash / bank ledger.");
            }
        }

        entity.Method = method;
        entity.RatePercent = rate;
        entity.LifeYears = life;
        entity.ResidualPercent = residual;
        entity.ExpenseLedgerCode = codes[0];
        entity.GainLedgerCode = codes[1];
        entity.LossLedgerCode = codes[2];
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        // the cards of the group that are not depreciated yet take
        // the rule (a card that was depreciated keeps its own)
        HashSet<long> depreciated =
            (await (
                from l in _context.Set<FaDepreciationLines>().AsNoTracking()
                join r in _context.Set<FaDepreciationRuns>().AsNoTracking() on l.FaDepreciationRunId equals r.FaDepreciationRunId
                where !r.IsDeleted && l.FaCategoryId == entity.FaCategoryId
                select l.FaAssetId)
            .Distinct()
            .ToListAsync())
            .ToHashSet();

        List<FaAssets> cards =
            await _context.Set<FaAssets>()
                .Where(x => !x.IsDeleted && x.FaCategoryId == entity.FaCategoryId && Fa.Live.Contains(x.Status))
                .ToListAsync();

        int changed = 0;

        foreach (FaAssets card in cards.Where(x => !depreciated.Contains(x.FaAssetId)))
        {
            decimal cardResidual = Fa.Round(card.Cost * residual / 100m);

            // an opening card : never above what is left of it
            cardResidual = Math.Min(cardResidual, Math.Max(0, card.Cost - card.OpeningAccumulated));

            card.Method = method;
            card.RatePercent = rate;
            card.LifeYears = life;
            card.ResidualValue = cardResidual;

            changed++;
        }

        string rule = Fa.RuleText(method, rate, life);

        Fa.AddHistory(_context, "FaDepreciationRules", entity.FaCategoryId, "Update", "Depreciation Declared", $"{entity.Code} {entity.Name} : {rule}{(method == Fa.NoDepreciation ? string.Empty : $", residual {residual:0.###} %, expense ledger {entity.ExpenseLedgerCode}")}. {changed} asset card(s) not yet depreciated took the rule.", userId);

        await _context.SaveChangesAsync();

        return await GetCategoryAsync(entity.PublicId);
    }

    public async Task DeleteCategoryAsync(Guid publicId, long userId)
    {
        FaCategories entity =
            await Categories.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The asset group was not found.");

        int used = await _context.Set<FaAssets>().AsNoTracking().CountAsync(x => !x.IsDeleted && x.FaCategoryId == entity.FaCategoryId);

        if (used > 0)
        {
            throw new InvalidOperationException($"{entity.Code} {entity.Name} has {used} asset card(s) : it cannot be deleted. Make it Inactive to stop using it.");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        // its ledgers stay, switched off
        await SetLedgersActiveAsync(entity, false, userId);

        Fa.AddHistory(_context, "FaCategories", entity.FaCategoryId, "Delete", "Asset Group Deleted", $"{entity.Code} {entity.Name} : its two ledgers were made Inactive.", userId);

        await _context.SaveChangesAsync();
    }

    public async Task<string?> RestoreCategoryAsync(long userId)
    {
        FaCategories? entity = await Categories.Where(x => x.IsDeleted).OrderByDescending(x => x.DeletedDate).FirstOrDefaultAsync();

        if (entity == null)
        {
            return null;
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await SetLedgersActiveAsync(entity, true, userId);

        Fa.AddHistory(_context, "FaCategories", entity.FaCategoryId, "Restore", "Asset Group Restored", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();

        return entity.Code;
    }


    //===========================================================
    // Asset Locations
    //===========================================================

    private async Task<List<FaLocationDto>> ReadLocationsAsync(IQueryable<FaLocations> source)
    {
        List<FaLocations> rows = await source.OrderBy(x => x.Code).ToListAsync();

        FaNames names = await Fa.NamesAsync(_context);

        var used =
            await _context.Set<FaAssets>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.FaLocationId != null)
                .GroupBy(x => x.FaLocationId)
                .Select(g => new { FaLocationId = g.Key, Count = g.Count() })
                .ToListAsync();

        return rows
            .Select(l => new FaLocationDto
            {
                FaLocationId = l.FaLocationId,
                PublicId = l.PublicId,
                Code = l.Code,
                Name = l.Name,
                BranchId = l.BranchId,
                BranchName = names.Branch(l.BranchId),
                Remarks = l.Remarks,
                IsActive = l.IsActive,
                AssetCount = used.FirstOrDefault(u => u.FaLocationId == l.FaLocationId)?.Count ?? 0
            })
            .ToList();
    }

    public Task<List<FaLocationDto>> GetLocationsAsync() =>
        ReadLocationsAsync(Locations.AsNoTracking().Where(x => !x.IsDeleted));

    public async Task<FaLocationDto> GetLocationAsync(Guid publicId) =>
        (await ReadLocationsAsync(Locations.AsNoTracking().Where(x => x.PublicId == publicId && !x.IsDeleted))).FirstOrDefault()
        ?? throw new KeyNotFoundException("The asset location was not found.");

    public async Task<FaLocationDto> SaveLocationAsync(Guid? publicId, FaLocationDto dto, long userId)
    {
        string name = Fa.Clean(dto.Name, 100, "Location Name");

        if (name.Length == 0)
        {
            throw new InvalidOperationException("Location Name is required.");
        }

        if (!await _context.Set<Branches>().AsNoTracking().AnyAsync(x => x.BranchId == dto.BranchId && !x.IsDeleted))
        {
            throw new InvalidOperationException("Pick the branch.");
        }

        if (await Locations.AsNoTracking().AnyAsync(x => !x.IsDeleted && x.PublicId != (publicId ?? Guid.Empty) && x.BranchId == dto.BranchId && x.Name.ToLower() == name.ToLower()))
        {
            throw new InvalidOperationException($"The branch has a location named \"{name}\" already.");
        }

        FaLocations entity;

        if (publicId == null)
        {
            entity = new FaLocations
            {
                Code = Fa.NextCode(await Locations.AsNoTracking().Select(x => x.Code).ToListAsync(), "FAL-"),
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

            Locations.Add(entity);
        }
        else
        {
            entity =
                await Locations.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
                ?? throw new KeyNotFoundException("The asset location was not found.");

            if (entity.BranchId != dto.BranchId
                && await _context.Set<FaAssets>().AsNoTracking().AnyAsync(x => !x.IsDeleted && x.FaLocationId == entity.FaLocationId))
            {
                throw new InvalidOperationException($"{entity.Code} {entity.Name} holds asset cards : its branch cannot be changed.");
            }

            entity.ModifiedBy = userId;
            entity.ModifiedDate = DateTime.UtcNow;
        }

        entity.Name = name;
        entity.BranchId = dto.BranchId;
        entity.Remarks = Fa.Clean(dto.Remarks, 500, "Remarks");
        entity.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        Fa.AddHistory(_context, "FaLocations", entity.FaLocationId, publicId == null ? "Create" : "Update", publicId == null ? "Asset Location Created" : "Asset Location Updated", $"{entity.Code} {entity.Name}.{(entity.IsActive ? string.Empty : " Inactive.")}", userId);

        await _context.SaveChangesAsync();

        return await GetLocationAsync(entity.PublicId);
    }

    public async Task DeleteLocationAsync(Guid publicId, long userId)
    {
        FaLocations entity =
            await Locations.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The asset location was not found.");

        int used = await _context.Set<FaAssets>().AsNoTracking().CountAsync(x => !x.IsDeleted && x.FaLocationId == entity.FaLocationId);

        if (used > 0)
        {
            throw new InvalidOperationException($"{entity.Code} {entity.Name} holds {used} asset card(s) : it cannot be deleted. Make it Inactive to stop using it.");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        Fa.AddHistory(_context, "FaLocations", entity.FaLocationId, "Delete", "Asset Location Deleted", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();
    }

    public async Task<string?> RestoreLocationAsync(long userId)
    {
        FaLocations? entity = await Locations.Where(x => x.IsDeleted).OrderByDescending(x => x.DeletedDate).FirstOrDefaultAsync();

        if (entity == null)
        {
            return null;
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        Fa.AddHistory(_context, "FaLocations", entity.FaLocationId, "Restore", "Asset Location Restored", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();

        return entity.Code;
    }


    //===========================================================
    // Asset Configuration (one row)
    //===========================================================

    public async Task<FaConfigurationDto> GetConfigurationAsync()
    {
        FaConfiguration row =
            await _context.Set<FaConfiguration>().AsNoTracking().OrderBy(x => x.FaConfigurationId).FirstOrDefaultAsync()
            ?? new FaConfiguration();

        return new FaConfigurationDto
        {
            RequireLocation = row.RequireLocation,
            RequireCustodian = row.RequireCustodian,
            AllowAssetRule = row.AllowAssetRule,
            AllowRunningMonth = row.AllowRunningMonth,
            AssetNoPrefix = row.AssetNoPrefix,
            AssetNoDigits = row.AssetNoDigits
        };
    }

    public async Task SaveConfigurationAsync(FaConfigurationDto dto, long userId)
    {
        string prefix = Fa.Clean(dto.AssetNoPrefix, 10, "Asset No prefix").ToUpperInvariant();

        if (prefix.Length == 0 || !prefix.All(char.IsLetterOrDigit))
        {
            throw new InvalidOperationException("The Asset No prefix is letters and digits only (e.g. FA).");
        }

        if (dto.AssetNoDigits < 3 || dto.AssetNoDigits > 8)
        {
            throw new InvalidOperationException("The running number of an Asset No has 3 to 8 digits.");
        }

        FaConfiguration? row = await _context.Set<FaConfiguration>().OrderBy(x => x.FaConfigurationId).FirstOrDefaultAsync();

        if (row == null)
        {
            row = new FaConfiguration();

            _context.Set<FaConfiguration>().Add(row);
        }

        row.RequireLocation = dto.RequireLocation;
        row.RequireCustodian = dto.RequireCustodian;
        row.AllowAssetRule = dto.AllowAssetRule;
        row.AllowRunningMonth = dto.AllowRunningMonth;
        row.AssetNoPrefix = prefix;
        row.AssetNoDigits = dto.AssetNoDigits;
        row.ModifiedBy = userId;
        row.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        Fa.AddHistory(_context, "FaConfiguration", row.FaConfigurationId, "Update", "Asset Configuration Updated", $"Location needed : {(row.RequireLocation ? "yes" : "no")}; custodian needed : {(row.RequireCustodian ? "yes" : "no")}; own rule on a card : {(row.AllowAssetRule ? "yes" : "no")}; run a month before it ends : {(row.AllowRunningMonth ? "yes" : "no")}; Asset No {row.AssetNoPrefix}-..., {row.AssetNoDigits} digits.", userId);

        await _context.SaveChangesAsync();
    }
}
