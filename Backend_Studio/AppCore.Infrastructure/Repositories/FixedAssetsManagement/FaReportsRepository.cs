//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.FixedAssetsManagement;
using AppCore.Domain.Entities.FixedAssetsManagement;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.FixedAssetsManagement;


//===============================================================
// Asset Reports (hand-written pages, 2026-11-14; NEVER run Code
// Sync for them)
//
// FIXED ASSET SCHEDULE : by category, for a period
//     Cost          opening + additions - disposals = closing
//     Depreciation  opening + charge - on disposals = closing
//     Book value    opening, closing
//   Additions : the cards bought in the period and the
//   improvements of the period. Charge : the depreciation runs of
//   the period. A branch : the cards that are in it now (an asset
//   moved between branches shows in its present branch).
//
// ASSET VERIFICATION (FAV-0001) : the physical count of a branch
//   (or one location) against the register. Making it lists every
//   card that is still owned; each is marked Found or Missing.
//   Closing it locks the count. It changes nothing on the cards.
//===============================================================

public class FaReportsRepository
    : IFaReportsRepository
{
    private const string Draft = "Draft";

    private static readonly string[] Results = { "Pending", "Found", "Missing" };

    private readonly AppDbContext _context;

    public FaReportsRepository(
        AppDbContext context)
    {
        _context = context;
    }

    private DbSet<FaVerifications> Verifications => _context.Set<FaVerifications>();

    private DbSet<FaVerificationLines> VerificationLines => _context.Set<FaVerificationLines>();


    //===========================================================
    // Fixed Asset Schedule
    //===========================================================

    public async Task<FaScheduleReportDto> GetScheduleReportAsync(string? from, string? to, long branchId)
    {
        DateOnly today = HrCalendar.Today();

        // none given : the financial year of today, to today
        DateOnly? yearStart =
            await _context.Set<FinancialYears>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.StartDate <= today && x.EndDate >= today)
                .Select(x => (DateOnly?)x.StartDate)
                .FirstOrDefaultAsync();

        DateOnly first = HrCalendar.ParseDay(from) ?? yearStart ?? new DateOnly(today.Year, 1, 1);

        DateOnly last = HrCalendar.ParseDay(to) ?? today;

        if (last < first)
        {
            throw new InvalidOperationException("The period ends before it starts.");
        }

        FaNames names = await Fa.NamesAsync(_context);

        List<FaAssets> assets =
            await _context.Set<FaAssets>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.PurchaseDate <= last && (branchId <= 0 || x.BranchId == branchId))
                .ToListAsync();

        List<long> ids = assets.Select(x => x.FaAssetId).ToList();

        var disposals =
            await _context.Set<FaDisposals>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.DisposalDate <= last)
                .Select(x => new { x.FaAssetId, x.DisposalDate, x.Cost, x.Accumulated })
                .ToListAsync();

        var charges =
            await (
                from l in _context.Set<FaDepreciationLines>().AsNoTracking()
                join r in _context.Set<FaDepreciationRuns>().AsNoTracking() on l.FaDepreciationRunId equals r.FaDepreciationRunId
                where !r.IsDeleted && r.RunDate <= last
                select new { l.FaAssetId, r.RunDate, l.Charge })
            .ToListAsync();

        ILookup<long, (DateOnly Date, decimal Amount)> chargedBy = charges.Where(x => ids.Contains(x.FaAssetId)).ToLookup(x => x.FaAssetId, x => (x.RunDate, x.Charge));

        Dictionary<long, FaScheduleReportRowDto> rows = new();

        foreach (FaAssets a in assets)
        {
            var disposal = disposals.FirstOrDefault(x => x.FaAssetId == a.FaAssetId);

            // gone before the period : not in the schedule
            if (disposal != null && disposal.DisposalDate < first)
            {
                continue;
            }

            if (!rows.TryGetValue(a.FaCategoryId, out FaScheduleReportRowDto? row))
            {
                names.Categories.TryGetValue(a.FaCategoryId, out FaCategories? category);

                row = new FaScheduleReportRowDto { GroupName = category?.GroupName ?? string.Empty, CategoryName = category?.Name ?? string.Empty };

                rows[a.FaCategoryId] = row;
            }

            bool before = a.PurchaseDate < first;

            decimal chargedBefore = chargedBy[a.FaAssetId].Where(x => x.Date < first).Sum(x => x.Amount);

            decimal chargedIn = chargedBy[a.FaAssetId].Where(x => x.Date >= first).Sum(x => x.Amount);

            row.CostOpening += before ? a.Cost : 0;
            row.Additions += before ? 0 : a.Cost;

            // the depreciation an opening card came with : before
            // the period when the card is, otherwise of the period
            row.DepOpening += before ? a.OpeningAccumulated + chargedBefore : 0;
            row.Charge += (before ? 0 : a.OpeningAccumulated + chargedBefore) + chargedIn;

            if (disposal != null)
            {
                row.Disposals += disposal.Cost;
                row.DepOnDisposals += disposal.Accumulated;
            }
        }

        FaScheduleReportDto report = new()
        {
            FromDate = HrCalendar.Day(first),
            ToDate = HrCalendar.Day(last),
            BranchName = branchId > 0 ? names.Branch(branchId) : string.Empty,
            Rows = rows.Values.OrderBy(x => x.GroupName).ThenBy(x => x.CategoryName).ToList()
        };

        foreach (FaScheduleReportRowDto row in report.Rows)
        {
            row.CostClosing = row.CostOpening + row.Additions - row.Disposals;
            row.DepClosing = row.DepOpening + row.Charge - row.DepOnDisposals;
            row.NbvOpening = row.CostOpening - row.DepOpening;
            row.NbvClosing = row.CostClosing - row.DepClosing;

            report.Total.CostOpening += row.CostOpening;
            report.Total.Additions += row.Additions;
            report.Total.Disposals += row.Disposals;
            report.Total.CostClosing += row.CostClosing;
            report.Total.DepOpening += row.DepOpening;
            report.Total.Charge += row.Charge;
            report.Total.DepOnDisposals += row.DepOnDisposals;
            report.Total.DepClosing += row.DepClosing;
            report.Total.NbvOpening += row.NbvOpening;
            report.Total.NbvClosing += row.NbvClosing;
        }

        report.Total.CategoryName = "Total";

        return report;
    }


    //===========================================================
    // Asset Verification
    //===========================================================

    private async Task<List<FaVerificationDto>> ReadAsync(IQueryable<FaVerifications> source, bool withLines)
    {
        List<FaVerifications> rows =
            await source.OrderByDescending(x => x.VerificationDate).ThenByDescending(x => x.FaVerificationId).ToListAsync();

        List<long> ids = rows.Select(x => x.FaVerificationId).ToList();

        FaNames names = await Fa.NamesAsync(_context);

        var lines =
            await (
                from l in VerificationLines.AsNoTracking()
                where ids.Contains(l.FaVerificationId)
                join a in _context.Set<FaAssets>().AsNoTracking() on l.FaAssetId equals a.FaAssetId
                orderby a.AssetNo
                select new { l.FaVerificationId, l.FaAssetId, a.AssetNo, a.Name, a.FaCategoryId, a.FaLocationId, a.CustodianEmployeeId, l.Result, l.Note })
            .ToListAsync();

        return rows
            .Select(v =>
            {
                var mine = lines.Where(l => l.FaVerificationId == v.FaVerificationId).ToList();

                return new FaVerificationDto
                {
                    PublicId = v.PublicId,
                    Code = v.Code,
                    VerificationDate = HrCalendar.Day(v.VerificationDate),
                    BranchId = v.BranchId,
                    BranchName = names.Branch(v.BranchId),
                    FaLocationId = v.FaLocationId ?? 0,
                    LocationName = v.FaLocationId == null ? "All locations" : names.Location(v.FaLocationId),
                    Status = v.Status,
                    ExtraItems = v.ExtraItems,
                    Remarks = v.Remarks,
                    AssetCount = mine.Count,
                    FoundCount = mine.Count(l => l.Result == "Found"),
                    MissingCount = mine.Count(l => l.Result == "Missing"),
                    PendingCount = mine.Count(l => l.Result == "Pending"),
                    Lines =
                        !withLines
                            ? new List<FaVerificationLineDto>()
                            : mine
                                .Select(l => new FaVerificationLineDto
                                {
                                    FaAssetId = l.FaAssetId,
                                    AssetNo = l.AssetNo,
                                    Name = l.Name,
                                    CategoryName = names.Category(l.FaCategoryId),
                                    LocationName = names.Location(l.FaLocationId),
                                    CustodianName = names.Employee(l.CustodianEmployeeId),
                                    Result = l.Result,
                                    Note = l.Note
                                })
                                .ToList()
                };
            })
            .ToList();
    }

    public Task<List<FaVerificationDto>> GetVerificationsAsync() =>
        ReadAsync(Verifications.AsNoTracking().Where(x => !x.IsDeleted), false);

    public async Task<FaVerificationDto> GetVerificationAsync(Guid publicId) =>
        (await ReadAsync(Verifications.AsNoTracking().Where(x => x.PublicId == publicId && !x.IsDeleted), true)).FirstOrDefault()
        ?? throw new KeyNotFoundException("The asset verification was not found.");

    public async Task<FaVerificationDto> CreateVerificationAsync(FaVerificationDto dto, long userId)
    {
        DateOnly date =
            HrCalendar.ParseDay(dto.VerificationDate)
            ?? throw new InvalidOperationException("Date is required.");

        if (date > HrCalendar.Today())
        {
            throw new InvalidOperationException("The date cannot be in the future.");
        }

        if (!await _context.Set<Branches>().AsNoTracking().AnyAsync(x => x.BranchId == dto.BranchId && !x.IsDeleted))
        {
            throw new InvalidOperationException("Pick the branch.");
        }

        long? locationId = dto.FaLocationId > 0 ? dto.FaLocationId : null;

        if (locationId != null
            && !await _context.Set<FaLocations>().AsNoTracking().AnyAsync(x => x.FaLocationId == locationId && !x.IsDeleted && x.BranchId == dto.BranchId))
        {
            throw new InvalidOperationException("The location is not a location of the branch.");
        }

        List<long> assetIds =
            await _context.Set<FaAssets>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.BranchId == dto.BranchId && Fa.Live.Contains(x.Status) && (locationId == null || x.FaLocationId == locationId))
                .OrderBy(x => x.AssetNo)
                .Select(x => x.FaAssetId)
                .ToListAsync();

        if (assetIds.Count == 0)
        {
            throw new InvalidOperationException("There is no asset to count for that branch / location.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        FaVerifications entity = new()
        {
            Code = Fa.NextCode(await Verifications.AsNoTracking().Select(x => x.Code).ToListAsync(), "FAV-"),
            VerificationDate = date,
            BranchId = dto.BranchId,
            FaLocationId = locationId,
            Status = Draft,
            Remarks = Fa.Clean(dto.Remarks, 500, "Remarks"),
            IsDeleted = false,
            CreatedBy = userId,
            CreatedDate = DateTime.UtcNow
        };

        Verifications.Add(entity);

        await _context.SaveChangesAsync();

        foreach (long assetId in assetIds)
        {
            VerificationLines.Add(new FaVerificationLines { FaVerificationId = entity.FaVerificationId, FaAssetId = assetId, Result = "Pending" });
        }

        Fa.AddHistory(_context, "FaVerifications", entity.FaVerificationId, "Create", "Asset Verification Started", $"{entity.Code} : {assetIds.Count} asset(s) to count.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetVerificationAsync(entity.PublicId);
    }

    private async Task<FaVerifications> DraftAsync(Guid publicId)
    {
        FaVerifications entity =
            await Verifications.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The asset verification was not found.");

        if (entity.Status != Draft)
        {
            throw new InvalidOperationException($"{entity.Code} is closed : it cannot be changed.");
        }

        return entity;
    }

    public async Task SaveVerificationAsync(Guid publicId, FaVerificationDto dto, long userId)
    {
        FaVerifications entity = await DraftAsync(publicId);

        List<FaVerificationLines> lines = await VerificationLines.Where(x => x.FaVerificationId == entity.FaVerificationId).ToListAsync();

        foreach (FaVerificationLineDto row in dto?.Lines ?? new List<FaVerificationLineDto>())
        {
            FaVerificationLines? line = lines.FirstOrDefault(x => x.FaAssetId == row.FaAssetId);

            if (line == null)
            {
                continue;
            }

            line.Result = Results.FirstOrDefault(x => string.Equals(x, row.Result, StringComparison.OrdinalIgnoreCase)) ?? "Pending";
            line.Note = Fa.Clean(row.Note, 200, "Note");
        }

        entity.ExtraItems = Fa.Clean(dto?.ExtraItems, 1000, "Things not in the register");
        entity.Remarks = Fa.Clean(dto?.Remarks, 500, "Remarks");
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        Fa.AddHistory(_context, "FaVerifications", entity.FaVerificationId, "Update", "Asset Verification Saved", $"{entity.Code} : {lines.Count(x => x.Result == "Found")} found, {lines.Count(x => x.Result == "Missing")} missing, {lines.Count(x => x.Result == "Pending")} not counted yet.", userId);

        await _context.SaveChangesAsync();
    }

    public async Task CloseVerificationAsync(Guid publicId, long userId)
    {
        FaVerifications entity = await DraftAsync(publicId);

        int pending = await VerificationLines.AsNoTracking().CountAsync(x => x.FaVerificationId == entity.FaVerificationId && x.Result == "Pending");

        if (pending > 0)
        {
            throw new InvalidOperationException($"{entity.Code} : {pending} asset(s) are not counted yet. Mark each one Found or Missing first.");
        }

        entity.Status = "Closed";
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        Fa.AddHistory(_context, "FaVerifications", entity.FaVerificationId, "Post", "Asset Verification Closed", $"{entity.Code}", userId);

        await _context.SaveChangesAsync();
    }

    public async Task DeleteVerificationAsync(Guid publicId, long userId)
    {
        FaVerifications entity = await DraftAsync(publicId);

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        Fa.AddHistory(_context, "FaVerifications", entity.FaVerificationId, "Delete", "Asset Verification Deleted", $"{entity.Code}", userId);

        await _context.SaveChangesAsync();
    }
}
