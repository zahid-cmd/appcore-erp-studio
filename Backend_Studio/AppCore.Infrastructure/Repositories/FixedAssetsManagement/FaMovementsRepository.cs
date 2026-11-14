//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.FixedAssetsManagement;
using AppCore.Application.Platform.Accounting;
using AppCore.Domain.Entities.FixedAssetsManagement;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.Accounting;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.FixedAssetsManagement;


//===============================================================
// Asset Disposal (hand-written page, 2026-11-14; NEVER run Code
// Sync for it). Asset Movements (transfers, improvements,
// maintenance) were removed 2026-11-15 : not required.
//
// DISPOSAL (FAD-0001) : Sale / Scrap / Write Off / Lost. No
//   depreciation in the month of the disposal. One Journal
//   Voucher, in pairs :
//     Dr Accumulated Depreciation   Cr Asset Cost   (depreciation)
//     Dr the customer / receivable  Cr Asset Cost   (the price, up
//                                                    to book value)
//     Dr the customer / receivable  Cr Gain         (price above
//                                                    book value)
//     Dr Loss                       Cr Asset Cost   (book value
//                                                    above price)
//   Deleting it cancels the voucher and puts the asset back.
//===============================================================

public class FaMovementsRepository
    : IFaMovementsRepository
{
    private static readonly string[] DisposalKinds = { "Sale", "Scrap", "Write Off", "Lost" };

    private readonly AppDbContext _context;

    private readonly IJournalVoucherRepository _journalVouchers;

    private readonly IVoucherLedgerRepository _ledgers;

    public FaMovementsRepository(
        AppDbContext context,
        IJournalVoucherRepository journalVouchers,
        IVoucherLedgerRepository ledgers)
    {
        _context = context;
        _journalVouchers = journalVouchers;
        _ledgers = ledgers;
    }

    private DbSet<FaAssets> Assets => _context.Set<FaAssets>();

    private async Task<FaAssets> LiveAssetAsync(long assetId)
    {
        FaAssets asset =
            await Assets.FirstOrDefaultAsync(x => x.FaAssetId == assetId && !x.IsDeleted)
            ?? throw new InvalidOperationException("Pick the asset.");

        if (!Fa.Live.Contains(asset.Status))
        {
            throw new InvalidOperationException($"{asset.AssetNo} is {asset.Status} : it is no longer owned.");
        }

        return asset;
    }

    private static DateOnly Day(string? text, FaAssets asset, string label)
    {
        DateOnly date =
            HrCalendar.ParseDay(text)
            ?? throw new InvalidOperationException($"{label} is required.");

        if (date > HrCalendar.Today())
        {
            throw new InvalidOperationException($"{label} cannot be in the future.");
        }

        if (date < asset.PurchaseDate)
        {
            throw new InvalidOperationException($"{label} is before {asset.AssetNo} was bought ({HrCalendar.Day(asset.PurchaseDate)}).");
        }

        return date;
    }

    private async Task<FaCategories> CategoryAsync(long categoryId)
    {
        FaCategories category = await _context.Set<FaCategories>().AsNoTracking().FirstAsync(x => x.FaCategoryId == categoryId);

        Fa.NeedLedgers(category);

        return category;
    }

    private async Task<Dictionary<long, (string AssetNo, string Name, long FaCategoryId, long BranchId)>> AssetNamesAsync(IEnumerable<long> ids)
    {
        List<long> list = ids.Distinct().ToList();

        return (await Assets.AsNoTracking()
                .Where(x => list.Contains(x.FaAssetId))
                .Select(x => new { x.FaAssetId, x.AssetNo, x.Name, x.FaCategoryId, x.BranchId })
                .ToListAsync())
            .ToDictionary(x => x.FaAssetId, x => (x.AssetNo, x.Name, x.FaCategoryId, x.BranchId));
    }


    //===========================================================
    // Asset Disposals
    //===========================================================

    public async Task<List<FaDisposalDto>> GetDisposalsAsync()
    {
        List<FaDisposals> rows =
            await _context.Set<FaDisposals>().AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.DisposalDate).ThenByDescending(x => x.FaDisposalId)
                .ToListAsync();

        FaNames names = await Fa.NamesAsync(_context);

        var assets = await AssetNamesAsync(rows.Select(x => x.FaAssetId));

        var ledgers = await _ledgers.GetByCodesAsync(rows.Select(x => x.DebitLedgerCode).Where(x => x.Length > 0).Distinct().ToList());

        return rows
            .Select(d => new FaDisposalDto
            {
                PublicId = d.PublicId,
                Code = d.Code,
                DisposalDate = HrCalendar.Day(d.DisposalDate),
                FaAssetId = d.FaAssetId,
                AssetNo = assets.TryGetValue(d.FaAssetId, out var a) ? a.AssetNo : string.Empty,
                AssetName = assets.TryGetValue(d.FaAssetId, out var b) ? b.Name : string.Empty,
                CategoryName = assets.TryGetValue(d.FaAssetId, out var c) ? names.Category(c.FaCategoryId) : string.Empty,
                BranchName = names.Branch(d.BranchId),
                Kind = d.Kind,
                BuyerName = d.BuyerName,
                SalePrice = d.SalePrice,
                DebitLedgerCode = d.DebitLedgerCode,
                DebitLedgerType = d.DebitLedgerType,
                DebitLedgerName = ledgers.TryGetValue(d.DebitLedgerCode, out var ledger) ? ledger.LedgerName : string.Empty,
                Cost = d.Cost,
                Accumulated = d.Accumulated,
                BookValue = d.BookValue,
                GainLoss = d.GainLoss,
                JournalVoucherNo = d.JournalVoucherNo,
                Remarks = d.Remarks
            })
            .ToList();
    }

    public async Task<FaDisposalDto> CreateDisposalAsync(FaDisposalDto dto, long userId)
    {
        FaAssets asset = await LiveAssetAsync(dto.FaAssetId);

        DateOnly date = Day(dto.DisposalDate, asset, "Disposal Date");

        string kind =
            DisposalKinds.FirstOrDefault(x => string.Equals(x, dto.Kind, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("Pick the kind : Sale, Scrap, Write Off or Lost.");

        // no depreciation in the month of the disposal
        if (asset.LastRunPeriod >= Fa.Period(date))
        {
            throw new InvalidOperationException($"{asset.AssetNo} is depreciated up to {Fa.PeriodText(asset.LastRunPeriod)} : an asset is not charged in the month it is disposed. Date the disposal after that month, or undo the depreciation run.");
        }

        decimal price = kind == "Sale" || kind == "Scrap" ? Fa.Round(dto.SalePrice) : 0;

        if (price < 0)
        {
            throw new InvalidOperationException("The price cannot be negative.");
        }

        if (kind == "Sale" && price <= 0)
        {
            throw new InvalidOperationException("A sale needs its price. Use Scrap or Write Off for an asset that brings nothing.");
        }

        FaCategories category = await CategoryAsync(asset.FaCategoryId);

        decimal cost = asset.Cost + asset.ImprovementCost;

        decimal accumulated = asset.AccumulatedDepreciation;

        decimal bookValue = cost - accumulated;

        decimal gainLoss = price - bookValue;

        (string Code, string Type, string Name) debit = (string.Empty, Fa.General, string.Empty);

        if (price > 0)
        {
            debit = await FaAssetsRepository.PartyLedgerAsync(_context, _ledgers, dto.DebitLedgerCode, "ASSET-SALE-RECEIVABLE", "Customer");
        }

        // the voucher, in pairs (one debit against one credit)
        string note = $"Asset disposal : {asset.AssetNo}";

        List<JournalVoucherLineDto> lines = new();

        int group = 0;

        void Pair(string debitCode, string debitType, string creditCode, decimal amount)
        {
            if (amount <= 0)
            {
                return;
            }

            group++;

            lines.Add(Fa.Debit(group, debitCode, amount, note, debitType));
            lines.Add(Fa.Credit(group, creditCode, amount, note));
        }

        // the depreciation leaves with the asset
        Pair(category.AccumLedgerCode, Fa.General, category.CostLedgerCode, accumulated);

        // the price, up to the book value
        Pair(debit.Code, debit.Type, category.CostLedgerCode, Math.Min(price, bookValue));

        if (gainLoss > 0)
        {
            string gain = category.GainLedgerCode.Length > 0 ? category.GainLedgerCode : PostingLedgerCodes.Get(_context, "ASSET-DISPOSAL-GAIN");

            Pair(debit.Code, debit.Type, gain, gainLoss);
        }
        else if (gainLoss < 0)
        {
            string loss = category.LossLedgerCode.Length > 0 ? category.LossLedgerCode : PostingLedgerCodes.Get(_context, "ASSET-DISPOSAL-LOSS");

            Pair(loss, Fa.General, category.CostLedgerCode, -gainLoss);
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        FaDisposals entity = new()
        {
            Code = Fa.NextCode(await _context.Set<FaDisposals>().AsNoTracking().Select(x => x.Code).ToListAsync(), "FAD-"),
            DisposalDate = date,
            FaAssetId = asset.FaAssetId,
            BranchId = asset.BranchId,
            Kind = kind,
            BuyerName = Fa.Clean(dto.BuyerName, 150, "Buyer"),
            SalePrice = price,
            DebitLedgerCode = debit.Code,
            DebitLedgerType = debit.Type,
            Cost = cost,
            Accumulated = accumulated,
            BookValue = bookValue,
            GainLoss = gainLoss,
            PrevStatus = asset.Status,
            Remarks = Fa.Clean(dto.Remarks, 500, "Remarks"),
            IsDeleted = false,
            CreatedBy = userId,
            CreatedDate = DateTime.UtcNow
        };

        _context.Set<FaDisposals>().Add(entity);

        await _context.SaveChangesAsync();

        if (lines.Count > 0)
        {
            JournalVoucherSavedDto voucher =
                await _journalVouchers.CreatePostedAsync(
                    new CreateJournalVoucherDto
                    {
                        VoucherDate = HrCalendar.Day(date),
                        BranchId = asset.BranchId,
                        Narration = $"{kind} of asset {asset.AssetNo} {asset.Name} : cost Tk {Fa.Money(cost)}, depreciation Tk {Fa.Money(accumulated)}, price Tk {Fa.Money(price)}, {(gainLoss >= 0 ? "gain" : "loss")} Tk {Fa.Money(Math.Abs(gainLoss))} | {entity.Code}",
                        Lines = lines
                    },
                    entity.Code,
                    userId);

            entity.JournalVoucherId = voucher.JournalVoucherId;
            entity.JournalVoucherNo = Fa.Short(voucher.VoucherNo);
        }

        asset.Status = kind == "Write Off" ? "Written Off" : kind == "Lost" ? "Lost" : "Disposed";
        asset.DisposedDate = date;
        asset.ModifiedBy = userId;
        asset.ModifiedDate = DateTime.UtcNow;

        Fa.AddHistory(_context, "FaDisposals", entity.FaDisposalId, "Create", "Asset Disposed", $"{entity.Code} : {kind} of {asset.AssetNo} {asset.Name}. Book value Tk {Fa.Money(bookValue)}, price Tk {Fa.Money(price)}, {(gainLoss >= 0 ? "gain" : "loss")} Tk {Fa.Money(Math.Abs(gainLoss))}. Journal Voucher {entity.JournalVoucherNo}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return (await GetDisposalsAsync()).First(x => x.PublicId == entity.PublicId);
    }

    public async Task DeleteDisposalAsync(Guid publicId, long userId)
    {
        FaDisposals entity =
            await _context.Set<FaDisposals>().FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The asset disposal was not found.");

        FaAssets asset =
            await Assets.FirstOrDefaultAsync(x => x.FaAssetId == entity.FaAssetId && !x.IsDeleted)
            ?? throw new InvalidOperationException("The asset card of the disposal was not found.");

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (entity.JournalVoucherId != null)
        {
            await _journalVouchers.CancelAsync(
                entity.JournalVoucherId.Value,
                new CancelJournalVoucherDto { CancelDate = HrCalendar.Day(HrCalendar.Today()), Reason = $"{entity.Code} deleted" },
                userId);
        }

        asset.Status = Fa.Live.Contains(entity.PrevStatus) ? entity.PrevStatus : Fa.InUse;
        asset.DisposedDate = null;
        asset.ModifiedBy = userId;
        asset.ModifiedDate = DateTime.UtcNow;

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        Fa.AddHistory(_context, "FaDisposals", entity.FaDisposalId, "Delete", "Asset Disposal Deleted", $"{entity.Code} : {asset.AssetNo} is {asset.Status} again. Journal Voucher {entity.JournalVoucherNo} cancelled.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }
}
