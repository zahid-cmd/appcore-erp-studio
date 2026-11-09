//===============================================================
// Namespaces
//===============================================================

using AppCore.Infrastructure.Persistence.Paging;
using AppCore.Application.Common.Paging;
using System.Globalization;

using Microsoft.EntityFrameworkCore;

using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Common.ActivityHistory.DTOs;

using AppCore.Application.InventoryManagement.PricingLabels;

using AppCore.Application.Platform.Accounting;

using AppCore.Domain.Common;

using AppCore.Domain.Entities.InventoryManagement.PricingLabels;

using AppCore.Domain.Platform.Accounting;

using AppCore.Infrastructure.Persistence;

using PostingLedgerCodes =
    AppCore.Infrastructure.Platform.Accounting.PostingLedgerCodes;

using PriceIndexWriter =
    AppCore.Infrastructure.Platform.Inventory.ProductPriceIndexWriter;

using MotorBikeCardPrices =
    AppCore.Infrastructure.Platform.Inventory.MotorBikeCardPrices;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using SupplierProfilesEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.SupplierProfiles;

using UserProfileEntity =
    AppCore.Domain.Entities.SecurityPermission.UserManagement.UserProfile;

using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;

using SparePartsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SpareParts;

using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using StockBatchesEntity =
    AppCore.Domain.Platform.Inventory.StockBatches;

using StockMovementsEntity =
    AppCore.Domain.Platform.Inventory.StockMovements;


//===============================================================
// Namespace (as generated : the DI registration uses it)
//===============================================================

namespace AppCore.Infrastructure.Configurations.InventoryManagement.PricingLabels;


//===============================================================
// Price Adjustment repository
//
// A price circular (increases and reductions mixed) applied to
// the stock on hand on its cut-off date.
//   No      : PA-<MB|SP|AC>-0001, company-wide, one counter per
//             type, never reset, never reused (given on first
//             save).
//   Analyse : per product, its priced batches (MRP > 0, not
//             cancelled / closed) with stock on hand on the cut-
//             off date (StockMovements, bucket OnHand, Σ in − Σ
//             out, dated on or before it). Per batch, excl. VAT :
//               old net MRP = MRP ÷ (1 + VAT %)
//               margin %    = (1 − cost ÷ old net MRP) × 100
//                             (or the user's, per batch)
//               new cost    = new net MRP × (1 − margin %)
//               difference  = new cost − cost (per unit)
//               amount      = difference × quantity at cut-off
//             A product without such a batch is a price-only
//             line (the price index takes its new MRP).
//   Draft   : saved (analysed again by the server), edited,
//             deleted, restored freely.
//   Post    : analysed again; each analysed batch still in stock
//             takes the new MRP (its MRP before is kept on the
//             line); the price index takes every product's new
//             MRP; ONE journal (voucher type PA) :
//               increase I  : Dr Stock Price Adjustment /
//                             Cr Supplier | Reserve | Income
//               reduction R : Dr Supplier | Expense /
//                             Cr Stock Price Adjustment
//               units sold since the cut-off (released at once) :
//                 increase  : Dr Price Adj. on Cost of Sales /
//                             Cr Stock Price Adjustment (+ Dr
//                             Reserve / Cr Income for Reserve)
//                 reduction : Dr Stock Price Adjustment /
//                             Cr Price Adj. on Cost of Sales
//   Motor Bikes (Product Pricing - Motor Bikes, 2026-11-10) : the
//             price cards drive it, nothing is typed. Per product
//             the new MRP = the selling MRP on the cut-off date
//             (newest posted card of any supplier); per batch the
//             new cost = the DP of the batch supplier's card on the
//             cut-off date (no supplier, or none on its cards : the
//             selling card's DP) less the batch's claimed 6.3 VAT per
//             unit (the book cost leaves claimed VAT out, as the
//             purchase allowance does); difference = that - the
//             batch's book cost. No margin edit, no price index.
//   Sale    : (sales page, later) each unit sold releases its
//             difference the same way : ReleaseOnSaleAsync.
//   Cancel  : refused once a sale released a unit or a later
//             price change touched a batch; else the journal is
//             reversed, the old MRPs come back and the price index
//             entries are cancelled.
//===============================================================

public class PriceAdjustmentRepository
    : IPriceAdjustmentRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Inventory Management";

    private const string EntityName =
        "PriceAdjustment";

    private const string DateFormat =
        "yyyy-MM-dd";

    private const string DateTimeFormat =
        "yyyy-MM-dd HH:mm";

    public const string StatusDraft = "Draft";

    public const string StatusPosted = "Posted";

    public const string StatusCancelled = "Cancelled";

    private const string BatchCancelled = "Cancelled";

    private const string BatchClosed = "Closed";

    private const string BucketOnHand = "OnHand";

    public const string DirectionIncrease = "Increase";

    public const string DirectionReduction = "Reduction";

    // Settlement of a supplier group
    public const string SettleSupplier = "Supplier";

    public const string SettleReserve = "Reserve";

    public const string SettleIncome = "Income";

    public const string SettleExpense = "Expense";

    // Release sources
    public const string ReleasePosting = "Posting";

    public const string ReleaseSale = "Sale";

    // Price index source of this page
    public const string PriceIndexSource = "PriceAdjustment";

    private const string NoSupplierName = "No supplier";

    private const string PartySupplier = "Supplier";

    private const int MaxProducts = 2000;

    // pg_advisory_xact_lock class for the numbers ("PA")
    private const int NumberLockClass = 0x5041;

    private const string VatLubricants = "Lubricants";


    //===========================================================
    // Dependencies
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IVoucherNumberService _numberService;

    private readonly IVoucherPostingService _postingService;


    //===========================================================
    // Constructor
    //===========================================================

    public PriceAdjustmentRepository(
        AppDbContext context,
        IVoucherNumberService numberService,
        IVoucherPostingService postingService)
    {
        _context = context;

        _numberService = numberService;

        _postingService = postingService;
    }


    //===========================================================
    // Page types
    //===========================================================

    private static string TypeOf
    (
        string? pageType
    )
    {
        string type =
            (pageType ?? string.Empty).Trim().ToUpperInvariant();

        return type is "MB" or "SP" or "AC"
            ? type
            : throw new InvalidOperationException(
                "Choose the product type (Motor Bikes, Spare Parts & Lubricants or Accessories).");
    }

    private static string TitleOf(string type) =>
        type switch
        {
            "MB" => "Motor Bikes",
            "SP" => "Spare Parts & Lubricants",
            _ => "Accessories"
        };

    // PA-MB-0001
    private static string NumberOf(string type, int sequence) =>
        $"PA-{type}-{sequence:D4}";


    //===========================================================
    // Helpers
    //===========================================================

    private static string DateText(DateOnly date) =>
        date.ToString(DateFormat, CultureInfo.InvariantCulture);

    private static string DateText(DateOnly? date) =>
        date.HasValue
            ? date.Value.ToString(DateFormat, CultureInfo.InvariantCulture)
            : string.Empty;

    // A stored UTC moment as a business date
    private static string DateText(DateTime? utc) =>
        utc.HasValue
            ? ToBusiness(utc.Value).ToString(DateFormat, CultureInfo.InvariantCulture)
            : string.Empty;

    // A stored UTC moment as business date and time
    private static string DateTimeText(DateTime? utc) =>
        utc.HasValue
            ? ToBusiness(utc.Value).ToString(DateTimeFormat, CultureInfo.InvariantCulture)
            : string.Empty;

    private static string Limit
    (
        string? value,
        int maxLength
    )
    {
        string text =
            (value ?? string.Empty).Trim();

        return text.Length <= maxLength
            ? text
            : text.Substring(0, maxLength);
    }

    private static decimal Money(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);

    private static decimal Round4(decimal value) =>
        Math.Round(value, 4, MidpointRounding.AwayFromZero);

    private static DateOnly ParseDate
    (
        string? text,
        string label
    )
    {
        if (DateOnly.TryParseExact(
                (text ?? string.Empty).Trim(),
                DateFormat,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out DateOnly date))
        {
            return date;
        }

        throw new InvalidOperationException(
            $"{label} is required (yyyy-MM-dd).");
    }

    // '' = none
    private static DateOnly? ParseOptionalDate
    (
        string? text,
        string label
    )
    {
        string value =
            (text ?? string.Empty).Trim();

        if (value.Length == 0)
        {
            return null;
        }

        if (DateOnly.TryParseExact(
                value,
                DateFormat,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out DateOnly date))
        {
            return date;
        }

        throw new InvalidOperationException(
            $"{label} is not a valid date (yyyy-MM-dd).");
    }

    private static string DirectionOf(decimal difference) =>
        difference > 0m
            ? DirectionIncrease
            : difference < 0m
                ? DirectionReduction
                : string.Empty;


    //===========================================================
    // Business date (Bangladesh time)
    //===========================================================

    private static readonly TimeZoneInfo BusinessZone =
        FindBusinessZone();

    private static TimeZoneInfo FindBusinessZone()
    {
        foreach (string id in new[] { "Asia/Dhaka", "Bangladesh Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        return TimeZoneInfo.Local;
    }

    private static DateOnly BusinessToday()
    {
        return DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                BusinessZone));
    }

    private static DateTime ToBusiness
    (
        DateTime utc
    )
    {
        return TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.SpecifyKind(utc, DateTimeKind.Utc),
            BusinessZone);
    }


    //===========================================================
    // Transaction
    //===========================================================

    private async Task InTransactionAsync
    (
        Func<Task> work
    )
    {
        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            await work();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // Users : display names
    //===========================================================

    private async Task<Dictionary<long, string>>
        UserNamesAsync
        (
            IEnumerable<long> userIds
        )
    {
        List<long> ids =
            userIds.Where(x => x > 0).Distinct().ToList();

        if (ids.Count == 0)
        {
            return new Dictionary<long, string>();
        }

        var rows =
            await _context
                .Set<UserProfileEntity>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.UserProfileId))
                .Select(x => new { x.UserProfileId, x.DisplayName, x.FullName, x.UserName })
                .ToListAsync();

        return rows
            .GroupBy(x => x.UserProfileId)
            .ToDictionary
            (
                g => g.Key,
                g =>
                {
                    var user =
                        g.First();

                    return !string.IsNullOrWhiteSpace(user.DisplayName)
                        ? user.DisplayName
                        : !string.IsNullOrWhiteSpace(user.FullName)
                            ? user.FullName
                            : user.UserName ?? string.Empty;
                }
            );
    }

    private async Task<string>
        UserNameAsync
        (
            long userId
        )
    {
        Dictionary<long, string> names =
            await UserNamesAsync(new[] { userId });

        string name =
            names.GetValueOrDefault(userId, string.Empty);

        return name.Length > 0
            ? name
            : "System";
    }


    //===========================================================
    // History
    //===========================================================

    private void AddHistory
    (
        PriceAdjustment entity,
        string activityType,
        string verb,
        long userId,
        string userName,
        DateTime now,
        string extra = ""
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = ModuleName,
                EntityName = $"{EntityName}{entity.PageType}",
                EntityId = entity.PriceAdjustmentId,
                ActivityType = activityType,
                ActivityTitle = $"Price Adjustment {verb}",
                ActivityDescription =
                    $"Price Adjustment {entity.AdjustmentNo} ({TitleOf(entity.PageType)}, cut-off {DateText(entity.CutOffDate)}, {entity.ProductCount} product{(entity.ProductCount == 1 ? string.Empty : "s")}, {entity.BatchCount} batch{(entity.BatchCount == 1 ? string.Empty : "es")}, increase {entity.IncreaseAmount:N2}, reduction {entity.ReductionAmount:N2}) {verb.ToLowerInvariant()}.{(string.IsNullOrWhiteSpace(extra) ? string.Empty : " " + extra)}",
                PerformedBy = userId,
                PerformedByName = Limit(userName, 150),
                PerformedDate = now
            });
    }


    //===========================================================
    // Read : list (deleted drafts included, for Restore)
    //===========================================================

    public async Task<List<PriceAdjustmentListRowDto>>
        GetAllAsync
        (
            string? pageType
        )
    {
        string type =
            (pageType ?? string.Empty).Trim().ToUpperInvariant();

        List<PriceAdjustment> rows =
            await _context
                .Set<PriceAdjustment>()
                .AsNoTracking()
                .Where(x => type == string.Empty || x.PageType == type)
                .OrderByDescending(x => x.CreatedDate)
                .ThenByDescending(x => x.PriceAdjustmentId)
                .ToListAsync();

        return await MapListRowsAsync(rows);
    }


    //===========================================================
    // List rows : one row per document (shared by the full list
    // and the paged list)
    //===========================================================

    private async Task<List<PriceAdjustmentListRowDto>>
        MapListRowsAsync
        (
            List<PriceAdjustment> rows
        )
    {

        Dictionary<long, string> users =
            await UserNamesAsync(rows.Select(x => x.CreatedBy));

        return rows
            .Select
            (
                x =>
                    new PriceAdjustmentListRowDto
                    {
                        Id = x.PriceAdjustmentId,
                        PublicId = x.PublicId,
                        AdjustmentNo = x.AdjustmentNo,
                        PageType = x.PageType,
                        CircularRef = x.CircularRef,
                        CircularDate = DateText(x.CircularDate),
                        CutOffDate = DateText(x.CutOffDate),
                        Status = x.Status,
                        ProductCount = x.ProductCount,
                        BatchCount = x.BatchCount,
                        IncreaseAmount = x.IncreaseAmount,
                        ReductionAmount = x.ReductionAmount,
                        NetAmount = x.NetAmount,
                        Remarks = x.Remarks,
                        IsDeleted = x.IsDeleted,
                        CreatedByName = users.GetValueOrDefault(x.CreatedBy, string.Empty),
                        CreatedDate = DateText(x.CreatedDate),
                        PostedDate = DateText(x.PostedDate)
                    }
            )
            .ToList();
    }


    //===========================================================
    // Read : one document
    //===========================================================

    public async Task<PriceAdjustmentDto?>
        GetByIdAsync
        (
            long id
        )
    {
        PriceAdjustment? entity =
            await _context
                .Set<PriceAdjustment>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.PriceAdjustmentId == id);

        if (entity == null)
        {
            return null;
        }

        List<PriceAdjustmentProducts> products =
            await _context
                .Set<PriceAdjustmentProducts>()
                .AsNoTracking()
                .Where(x => x.PriceAdjustmentId == id)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        List<PriceAdjustmentLines> lines =
            await _context
                .Set<PriceAdjustmentLines>()
                .AsNoTracking()
                .Where(x => x.PriceAdjustmentId == id)
                .ToListAsync();

        List<PriceAdjustmentSuppliers> suppliers =
            await _context
                .Set<PriceAdjustmentSuppliers>()
                .AsNoTracking()
                .Where(x => x.PriceAdjustmentId == id)
                .OrderBy(x => x.SupplierCode == string.Empty)
                .ThenBy(x => x.SupplierName)
                .ToListAsync();

        List<PriceAdjustmentReleases> releases =
            await _context
                .Set<PriceAdjustmentReleases>()
                .AsNoTracking()
                .Where(x => x.PriceAdjustmentId == id)
                .OrderBy(x => x.ReleaseDate)
                .ThenBy(x => x.PriceAdjustmentReleaseId)
                .ToListAsync();

        // The batches now (on hand)
        List<long> batchIds =
            lines.Select(x => x.StockBatchId).Distinct().ToList();

        Dictionary<long, decimal> onHandNow =
            batchIds.Count == 0
                ? new Dictionary<long, decimal>()
                : await _context
                    .Set<StockBatchesEntity>()
                    .AsNoTracking()
                    .Where(x => batchIds.Contains(x.StockBatchId))
                    .ToDictionaryAsync(x => x.StockBatchId, x => x.QuantityOnHand);

        string branchName =
            await _context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => x.BranchId == entity.BranchId)
                .Select(x => x.BranchName)
                .FirstOrDefaultAsync()
            ??
            string.Empty;

        Dictionary<long, string> users =
            await UserNamesAsync(
                new[] { entity.CreatedBy, entity.PostedBy ?? 0, entity.CancelledBy ?? 0 });

        Dictionary<long, PriceAdjustmentProducts> productOf =
            products
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => g.First());

        Dictionary<long, int> productOrder =
            products
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => g.First().LineNo);

        Dictionary<long, PriceAdjustmentLines> lineOf =
            lines.ToDictionary(x => x.PriceAdjustmentLineId);

        bool soldReleased =
            releases.Any(x => x.SourceType == ReleaseSale);

        bool draft =
            entity.Status == StatusDraft && !entity.IsDeleted;

        PriceAdjustmentDto dto =
            new()
            {
                Id = entity.PriceAdjustmentId,
                PublicId = entity.PublicId,
                PriceAdjustmentId = entity.PriceAdjustmentId,
                AdjustmentNo = entity.AdjustmentNo,
                PageType = entity.PageType,
                BranchId = entity.BranchId,
                BranchName = branchName,
                CircularRef = entity.CircularRef,
                CircularDate = DateText(entity.CircularDate),
                CutOffDate = DateText(entity.CutOffDate),
                Remarks = entity.Remarks,
                Status = entity.Status,
                ProductCount = entity.ProductCount,
                BatchCount = entity.BatchCount,
                IncreaseAmount = entity.IncreaseAmount,
                ReductionAmount = entity.ReductionAmount,
                NetAmount = entity.NetAmount,
                VoucherNo = entity.VoucherNo,
                IsDeleted = entity.IsDeleted,
                CreatedByName = users.GetValueOrDefault(entity.CreatedBy, string.Empty),
                CreatedDate = DateTimeText(entity.CreatedDate),
                PostedByName = users.GetValueOrDefault(entity.PostedBy ?? 0, string.Empty),
                PostedDate = DateTimeText(entity.PostedDate),
                CancelledByName = users.GetValueOrDefault(entity.CancelledBy ?? 0, string.Empty),
                CancelledDate = DateTimeText(entity.CancelledDate),
                CancelReason = entity.CancelReason,
                CanEdit = draft,
                CanPost = draft,
                CanCancel = entity.Status == StatusPosted && !entity.IsDeleted && !soldReleased,
                Products = products.Select(ToProductDto).ToList(),
                Suppliers = suppliers.Select(ToSupplierDto).ToList()
            };

        dto.Lines =
            lines
                .OrderBy(x => productOrder.GetValueOrDefault(x.ProductId, int.MaxValue))
                .ThenBy(x => x.StockBatchId)
                .Select
                (
                    x =>
                    {
                        PriceAdjustmentProducts? product =
                            productOf.GetValueOrDefault(x.ProductId);

                        decimal factor =
                            1m + (x.VatRate > 0m ? x.VatRate : 0m) / 100m;

                        decimal ownMargin =
                            x.OldMrp > 0m
                                ? Round4((1m - x.UnitCost / (x.OldMrp / factor)) * 100m)
                                : 0m;

                        return ToLineDto(
                            x,
                            product?.ProductCode ?? string.Empty,
                            product?.ProductName ?? string.Empty,
                            onHandNow.GetValueOrDefault(x.StockBatchId),
                            ownMargin);
                    }
                )
                .ToList();

        dto.Releases =
            releases
                .Select
                (
                    x =>
                    {
                        PriceAdjustmentLines? line =
                            lineOf.GetValueOrDefault(x.PriceAdjustmentLineId);

                        long productId =
                            line?.ProductId ?? 0;

                        PriceAdjustmentProducts? product =
                            productOf.GetValueOrDefault(productId);

                        return new PriceAdjustmentReleaseDto
                        {
                            PriceAdjustmentReleaseId = x.PriceAdjustmentReleaseId,
                            PriceAdjustmentLineId = x.PriceAdjustmentLineId,
                            StockBatchId = x.StockBatchId,
                            BatchNo = line?.BatchNo ?? string.Empty,
                            ProductId = productId,
                            ProductCode = product?.ProductCode ?? string.Empty,
                            ProductName = product?.ProductName ?? string.Empty,
                            Quantity = x.Quantity,
                            Amount = x.Amount,
                            SourceType = x.SourceType,
                            SourceNo = x.SourceNo,
                            ReleaseDate = DateText(x.ReleaseDate)
                        };
                    }
                )
                .ToList();

        return dto;
    }

    private static PriceAdjustmentProductDto ToProductDto
    (
        PriceAdjustmentProducts x
    )
    {
        return new PriceAdjustmentProductDto
        {
            PriceAdjustmentProductId = x.PriceAdjustmentProductId,
            LineNo = x.LineNo,
            ProductId = x.ProductId,
            ProductCode = x.ProductCode,
            ProductName = x.ProductName,
            PartNumber = x.PartNumber,
            OldMrp = x.OldMrp,
            NewMrp = x.NewMrp,
            Direction = x.Direction,
            ChangePercent =
                x.OldMrp > 0m
                    ? Math.Round((x.NewMrp - x.OldMrp) / x.OldMrp * 100m, 2, MidpointRounding.AwayFromZero)
                    : 0m,
            BatchCount = x.BatchCount,
            Quantity = x.Quantity,
            Amount = x.Amount,
            HasStock = x.BatchCount > 0
        };
    }

    private static PriceAdjustmentLineDto ToLineDto
    (
        PriceAdjustmentLines x,
        string productCode,
        string productName,
        decimal quantityOnHandNow,
        decimal batchMarginPercent
    )
    {
        return new PriceAdjustmentLineDto
        {
            PriceAdjustmentLineId = x.PriceAdjustmentLineId,
            ProductId = x.ProductId,
            ProductCode = productCode,
            ProductName = productName,
            StockBatchId = x.StockBatchId,
            BatchNo = x.BatchNo,
            SupplierCode = x.SupplierCode,
            SupplierName = x.SupplierName,
            VatRate = x.VatRate,
            Quantity = x.Quantity,
            QuantityOnHandNow = quantityOnHandNow,
            SoldSinceCutOff = x.SoldSinceCutOff,
            ReleasedQuantity = x.ReleasedQuantity,
            RemainingQuantity = x.Quantity - x.ReleasedQuantity,
            UnitCost = x.UnitCost,
            OldMrp = x.OldMrp,
            NewMrp = x.NewMrp,
            BatchMarginPercent = batchMarginPercent,
            MarginPercent = x.MarginPercent,
            MarginEdited = x.MarginEdited,
            NewUnitCost = x.NewUnitCost,
            DifferencePerUnit = x.DifferencePerUnit,
            Amount = x.Amount,
            Direction = DirectionOf(x.DifferencePerUnit),
            MrpApplied = x.MrpApplied
        };
    }

    private static PriceAdjustmentSupplierDto ToSupplierDto
    (
        PriceAdjustmentSuppliers x
    )
    {
        return new PriceAdjustmentSupplierDto
        {
            PriceAdjustmentSupplierId = x.PriceAdjustmentSupplierId,
            SupplierCode = x.SupplierCode,
            SupplierName = x.SupplierName,
            IncreaseAmount = x.IncreaseAmount,
            ReductionAmount = x.ReductionAmount,
            IncreaseTo = x.IncreaseTo,
            ReductionTo = x.ReductionTo,
            CanUseSupplier = x.SupplierCode.Length > 0
        };
    }


    //===========================================================
    // Defaults : next number, products, brands, suppliers
    //===========================================================

    public async Task<PriceAdjustmentDefaultsDto>
        GetDefaultsAsync
        (
            string pageType
        )
    {
        string type =
            TypeOf(pageType);

        int last =
            await _context
                .Set<PriceAdjustment>()
                .AsNoTracking()
                .Where(x => x.PageType == type)
                .Select(x => (int?)x.SequenceNo)
                .MaxAsync()
            ??
            0;

        PriceAdjustmentDefaultsDto result =
            new()
            {
                PageType = type,
                Today = DateText(BusinessToday()),
                NextNo = NumberOf(type, last + 1)
            };

        // Batches of the type still open : the latest priced MRP
        // and the stock on hand
        var batches =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where(x => x.ProductType == type && x.Status != BatchCancelled && x.Status != BatchClosed)
                .Select(x => new { x.ProductId, x.StockBatchId, x.Mrp, x.QuantityOnHand })
                .ToListAsync();

        Dictionary<long, decimal> lastMrp =
            batches
                .Where(x => x.Mrp > 0m)
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.StockBatchId).First().Mrp);

        Dictionary<long, decimal> stock =
            batches
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.QuantityOnHand));

        // The declared MRP (price index) wins over the batches'
        foreach (var current in await PriceIndexWriter.CurrentAsync(_context, type))
        {
            lastMrp[current.Key] = current.Value.Mrp;
        }

        List<ProductInfo> products =
            await ProductRowsAsync(type, null);

        result.Products =
            products
                .OrderBy(x => x.Code)
                .Select
                (
                    x =>
                        new PriceAdjustmentProductOptionDto
                        {
                            Id = x.Id,
                            Code = x.Code,
                            Name = x.Name,
                            PartNumber = x.PartNumber,
                            BrandId = x.BrandId,
                            BrandName = x.BrandName,
                            CategoryId = x.CategoryId,
                            CategoryName = x.CategoryName,
                            LastMrp = lastMrp.GetValueOrDefault(x.Id),
                            Stock = stock.GetValueOrDefault(x.Id)
                        }
                )
                .ToList();

        result.Brands =
            products
                .Where(x => x.BrandId != 0 && x.BrandName.Length > 0)
                .GroupBy(x => x.BrandId)
                .Select(g => new PriceAdjustmentBrandOptionDto { Id = g.Key, Name = g.First().BrandName })
                .OrderBy(x => x.Name)
                .ToList();

        var suppliers =
            await _context
                .Set<SupplierProfilesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .Select(x => new { x.SupplierCode, x.DisplayName, x.SupplierName })
                .ToListAsync();

        // No default on the Supplier Profile yet : Reserve / Expense
        result.Suppliers =
            suppliers
                .Select
                (
                    x =>
                        new PriceAdjustmentSupplierOptionDto
                        {
                            Code = x.SupplierCode,
                            Name = !string.IsNullOrWhiteSpace(x.DisplayName) ? x.DisplayName : x.SupplierName ?? string.Empty,
                            IncreaseTo = SettleReserve,
                            ReductionTo = SettleExpense
                        }
                )
                .OrderBy(x => x.Name)
                .ToList();

        return result;
    }


    //===========================================================
    // Products of a type (live) : code, name, part number,
    // category and brand (Product Pricing's rules)
    //===========================================================

    private sealed class ProductInfo
    {
        public long Id { get; set; }

        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        // The maker's part number (MB : none)
        public string PartNumber { get; set; } = string.Empty;

        public long CategoryId { get; set; }

        public string CategoryName { get; set; } = string.Empty;

        // Brand of its category (0 / '' = none; < 0 : the category
        // name stands for the brand)
        public long BrandId { get; set; }

        public string BrandName { get; set; } = string.Empty;
    }

    private async Task<List<ProductInfo>>
        ProductRowsAsync
        (
            string type,
            List<long>? ids
        )
    {
        List<ProductInfo> rows =
            await ProductRowsCoreAsync(type, ids);

        List<long> categoryIds =
            rows.Select(x => x.CategoryId).Distinct().ToList();

        var categories =
            (
                await _context
                    .Set<ProductCategoryEntity>()
                    .AsNoTracking()
                    .Where(x => categoryIds.Contains(x.ProductCategoryId))
                    .Select(x => new { x.ProductCategoryId, x.CategoryType, x.CategoryName, x.BrandManagementId })
                    .ToListAsync()
            )
            .ToDictionary(x => x.ProductCategoryId);

        List<long> brandIds =
            categories.Values
                .Where(x => x.BrandManagementId.HasValue)
                .Select(x => x.BrandManagementId!.Value)
                .Distinct()
                .ToList();

        Dictionary<long, string> brands =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .Where(x => brandIds.Contains(x.BrandManagementId))
                .ToDictionaryAsync(x => x.BrandManagementId, x => x.BrandName ?? string.Empty);

        rows.ForEach
        (
            x =>
            {
                var category =
                    categories.GetValueOrDefault(x.CategoryId);

                x.CategoryName = (category?.CategoryName ?? string.Empty).Trim();

                x.BrandId = category?.BrandManagementId ?? 0;

                x.BrandName = brands.GetValueOrDefault(x.BrandId, string.Empty);

                // A category saved before the brand field : its name
                // ("<Brand> <Type>") stands for the brand
                if (x.BrandId == 0 || x.BrandName.Length == 0)
                {
                    string name =
                        (category?.CategoryName ?? string.Empty).Trim();

                    string kind =
                        (category?.CategoryType ?? string.Empty).Trim();

                    if (kind.Length > 0 && name.EndsWith(kind, StringComparison.OrdinalIgnoreCase))
                    {
                        name = name[..^kind.Length].Trim();
                    }

                    x.BrandId = category != null ? -category.ProductCategoryId : 0;

                    x.BrandName = name;
                }
            }
        );

        return rows;
    }

    private async Task<List<ProductInfo>>
        ProductRowsCoreAsync
        (
            string type,
            List<long>? ids
        )
    {
        if (type == "MB")
        {
            return await _context
                .Set<MotorBikesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && (ids == null || ids.Contains(x.MotorBikeId)))
                .Select
                (
                    x =>
                        new ProductInfo
                        {
                            Id = x.MotorBikeId,
                            Code = x.ProductCode,
                            Name = x.ProductName,
                            PartNumber = string.Empty,
                            CategoryId = x.ProductCategoryId
                        }
                )
                .ToListAsync();
        }

        if (type == "SP")
        {
            return await _context
                .Set<SparePartsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && (ids == null || ids.Contains(x.SparePartId)))
                .Select
                (
                    x =>
                        new ProductInfo
                        {
                            Id = x.SparePartId,
                            Code = x.ProductCode,
                            Name = x.PartNumber + " - " + x.PartName,
                            PartNumber = x.PartNumber ?? string.Empty,
                            CategoryId = x.ProductCategoryId
                        }
                )
                .ToListAsync();
        }

        return
            (
                await _context
                    .Set<AccessoriesEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && (ids == null || ids.Contains(x.AccessoryId)))
                    .Select(x => new { x.AccessoryId, x.ProductCode, x.PartNumber, x.AccessoryName, x.ProductCategoryId })
                    .ToListAsync()
            )
            .Select
            (
                x =>
                    new ProductInfo
                    {
                        Id = x.AccessoryId,
                        Code = x.ProductCode,
                        Name = string.IsNullOrWhiteSpace(x.PartNumber) ? x.AccessoryName : $"{x.PartNumber} - {x.AccessoryName}",
                        PartNumber = x.PartNumber ?? string.Empty,
                        CategoryId = x.ProductCategoryId
                    }
            )
            .ToList();
    }


    //===========================================================
    // Analysis (the engine : Analyse, Save, Post all use it)
    //===========================================================

    private sealed class LineCalc
    {
        public PriceAdjustmentLines Line { get; set; } = new();

        public string ProductCode { get; set; } = string.Empty;

        public string ProductName { get; set; } = string.Empty;

        // On hand now / on hand + in transit now
        public decimal QuantityOnHandNow { get; set; }

        public decimal InStockNow { get; set; }

        // The batch's own margin %
        public decimal BatchMarginPercent { get; set; }

        // Posting : the units sold since the cut-off released at
        // once (signed amount)
        public decimal ReleaseAmount { get; set; }
    }

    private sealed class Analysis
    {
        public string Type { get; set; } = string.Empty;

        public DateOnly CutOff { get; set; }

        public List<PriceAdjustmentProducts> Products { get; set; } = new();

        public List<LineCalc> Lines { get; set; } = new();

        public List<PriceAdjustmentSuppliers> Suppliers { get; set; } = new();

        public decimal IncreaseAmount { get; set; }

        public decimal ReductionAmount { get; set; }

        public decimal NetAmount { get; set; }
    }

    private static string IncreaseToOf
    (
        string? value,
        bool hasSupplier,
        string supplierName
    )
    {
        string text =
            (value ?? string.Empty).Trim();

        if (text.Length == 0)
        {
            return SettleReserve;
        }

        string? match =
            new[] { SettleSupplier, SettleReserve, SettleIncome }
                .FirstOrDefault(x => string.Equals(x, text, StringComparison.OrdinalIgnoreCase));

        if (match == null)
        {
            throw new InvalidOperationException(
                $"{supplierName} : the increase goes to the Supplier, the Price Increase Reserve or the Price Increase Income.");
        }

        if (match == SettleSupplier && !hasSupplier)
        {
            throw new InvalidOperationException(
                "No supplier (opening stock) : the increase is kept as Reserve or Income.");
        }

        return match;
    }

    private static string ReductionToOf
    (
        string? value,
        bool hasSupplier,
        string supplierName
    )
    {
        string text =
            (value ?? string.Empty).Trim();

        if (text.Length == 0)
        {
            return SettleExpense;
        }

        string? match =
            new[] { SettleSupplier, SettleExpense }
                .FirstOrDefault(x => string.Equals(x, text, StringComparison.OrdinalIgnoreCase));

        if (match == null)
        {
            throw new InvalidOperationException(
                $"{supplierName} : the reduction is compensated by the Supplier or taken as Price Reduction Expense.");
        }

        if (match == SettleSupplier && !hasSupplier)
        {
            throw new InvalidOperationException(
                "No supplier (opening stock) : the reduction is taken as Price Reduction Expense.");
        }

        return match;
    }

    private async Task<Analysis>
        AnalyseCoreAsync
        (
            string type,
            DateOnly cutOff,
            List<PriceAdjustmentProductInputDto>? productInput,
            List<PriceAdjustmentMarginInputDto>? marginInput,
            List<PriceAdjustmentSupplierInputDto>? supplierInput
        )
    {
        List<PriceAdjustmentProductInputDto> input =
            (productInput ?? new List<PriceAdjustmentProductInputDto>())
                .Where(x => x != null && x.ProductId > 0)
                .ToList();

        if (input.Count == 0)
        {
            throw new InvalidOperationException(
                "Add at least one product with its new MRP.");
        }

        if (input.Count > MaxProducts)
        {
            throw new InvalidOperationException(
                $"At most {MaxProducts} products on one price adjustment.");
        }

        List<long> productIds =
            input.Select(x => x.ProductId).Distinct().ToList();

        Dictionary<long, ProductInfo> products =
            (await ProductRowsAsync(type, productIds))
                .ToDictionary(x => x.Id);

        if (productIds.Count != input.Count)
        {
            long twice =
                input.GroupBy(x => x.ProductId).First(g => g.Count() > 1).Key;

            throw new InvalidOperationException(
                $"{products.GetValueOrDefault(twice)?.Name ?? "A product"} is on the list twice.");
        }

        // Last MRP : the price index, else the latest priced batch
        Dictionary<long, decimal> lastMrp =
            (
                await _context
                    .Set<StockBatchesEntity>()
                    .AsNoTracking()
                    .Where(x => x.ProductType == type && productIds.Contains(x.ProductId) && x.Mrp > 0m && x.Status != BatchCancelled)
                    .Select(x => new { x.ProductId, x.StockBatchId, x.Mrp })
                    .ToListAsync()
            )
            .GroupBy(x => x.ProductId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.StockBatchId).First().Mrp);

        foreach (var current in await PriceIndexWriter.CurrentAsync(_context, type, productIds))
        {
            lastMrp[current.Key] = current.Value.Mrp;
        }

        // Motor Bikes : the price cards give the MRP and the DP
        bool cardMode =
            type == "MB";

        Dictionary<long, MotorBikeCardPrices.CardPrice> sellingCards =
            cardMode
                ? await MotorBikeCardPrices.MrpAsync(_context, cutOff, productIds)
                : new Dictionary<long, MotorBikeCardPrices.CardPrice>();

        foreach (PriceAdjustmentProductInputDto row in input)
        {
            if (!products.TryGetValue(row.ProductId, out ProductInfo? product))
            {
                throw new InvalidOperationException(
                    $"A product on the list is not a {TitleOf(type).ToLowerInvariant()} product (or was deleted).");
            }

            if (cardMode)
            {
                if (!sellingCards.TryGetValue(row.ProductId, out MotorBikeCardPrices.CardPrice? card) || card.Mrp <= 0m)
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : no posted price card on {DateText(cutOff)} (Product Pricing - Motor Bikes).");
                }

                row.NewMrp = card.Mrp;

                continue;
            }

            if (row.NewMrp <= 0m)
            {
                throw new InvalidOperationException(
                    $"{product.Name} : enter the new MRP (it is the sale price).");
            }

            if (row.NewMrp != Math.Round(row.NewMrp, 2))
            {
                throw new InvalidOperationException(
                    $"{product.Name} : the MRP can have at most 2 decimals.");
            }

            if (row.NewMrp == lastMrp.GetValueOrDefault(row.ProductId))
            {
                throw new InvalidOperationException(
                    $"{product.Name} : {row.NewMrp:N2} is already its MRP. Remove it or change the new MRP.");
            }
        }

        // The priced batches of the products, closed ones included :
        // a batch that held stock on the cut-off date and has sold
        // out since is still adjusted (supplier side) and released in
        // full at posting (its whole quantity is sold since the
        // cut-off; its MRP is not touched, nothing is left to sell)
        List<StockBatchesEntity> batches =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductType == type
                        &&
                        productIds.Contains(x.ProductId)
                        &&
                        (cardMode || x.Mrp > 0m)
                        &&
                        x.Status != BatchCancelled
                )
                .ToListAsync();

        // On hand on the cut-off date, per batch
        List<long> batchIds =
            batches.Select(x => x.StockBatchId).ToList();

        Dictionary<long, decimal> atCutOff =
            batchIds.Count == 0
                ? new Dictionary<long, decimal>()
                : (
                    await _context
                        .Set<StockMovementsEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                batchIds.Contains(x.StockBatchId)
                                &&
                                x.Bucket == BucketOnHand
                                &&
                                x.DocumentDate <= cutOff
                        )
                        .GroupBy(x => x.StockBatchId)
                        .Select(g => new { StockBatchId = g.Key, Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut) })
                        .ToListAsync()
                  )
                  .ToDictionary(x => x.StockBatchId, x => x.Quantity);

        batches =
            batches
                .Where(x => atCutOff.GetValueOrDefault(x.StockBatchId) > 0m)
                .ToList();

        // Supplier names
        List<string> supplierCodes =
            batches
                .Select(x => (x.SupplierCode ?? string.Empty).Trim())
                .Where(x => x.Length > 0)
                .Distinct()
                .ToList();

        Dictionary<string, string> supplierNames =
            (
                await _context
                    .Set<SupplierProfilesEntity>()
                    .AsNoTracking()
                    .Where(x => supplierCodes.Contains(x.SupplierCode))
                    .Select(x => new { x.SupplierCode, x.DisplayName, x.SupplierName })
                    .ToListAsync()
            )
            .GroupBy(x => x.SupplierCode)
            .ToDictionary
            (
                g => g.Key,
                g =>
                    !string.IsNullOrWhiteSpace(g.First().DisplayName)
                        ? g.First().DisplayName
                        : g.First().SupplierName ?? g.Key
            );

        // Motor Bikes : each batch supplier's card DP on the cut-off
        Dictionary<string, Dictionary<long, MotorBikeCardPrices.CardPrice>> supplierCards =
            new(StringComparer.OrdinalIgnoreCase);

        // Motor Bikes : purchase lines whose VAT was NOT claimable
        // (the VAT sits in the cost); every other batch keeps its
        // claimed 6.3 VAT out of the cost
        HashSet<long> vatInCost =
            new();

        if (cardMode)
        {
            foreach (string code in supplierCodes)
            {
                supplierCards[code] =
                    await MotorBikeCardPrices.DpAsync(_context, code, cutOff, productIds);
            }

            long[] purchaseLineIds =
                batches
                    .Where(x => x.SourceType == "Purchase" && x.SourceLineId > 0)
                    .Select(x => x.SourceLineId)
                    .Distinct()
                    .ToArray();

            if (purchaseLineIds.Length > 0)
            {
                vatInCost =
                    (
                        await _context.Database
                            .SqlQueryRaw<long>(
                                "SELECT \"PurchaseLineId\" AS \"Value\" FROM public.\"PurchasesMbLines\" " +
                                "WHERE NOT \"VatClaimable\" AND \"PurchaseLineId\" = ANY({0})",
                                purchaseLineIds)
                            .ToListAsync()
                    )
                    .ToHashSet();
            }
        }

        // The user's margins
        Dictionary<long, decimal> margins =
            (marginInput ?? new List<PriceAdjustmentMarginInputDto>())
                .Where(x => x != null && x.StockBatchId > 0)
                .GroupBy(x => x.StockBatchId)
                .ToDictionary(g => g.Key, g => g.Last().MarginPercent);

        Analysis result =
            new()
            {
                Type = type,
                CutOff = cutOff
            };

        int lineNo = 0;

        foreach (PriceAdjustmentProductInputDto row in input)
        {
            ProductInfo product =
                products[row.ProductId];

            decimal newMrp =
                row.NewMrp;

            decimal oldMrp =
                lastMrp.GetValueOrDefault(row.ProductId);

            List<LineCalc> productLines =
                new();

            foreach (StockBatchesEntity batch in batches.Where(x => x.ProductId == row.ProductId).OrderBy(x => x.StockBatchId))
            {
                decimal quantity =
                    atCutOff[batch.StockBatchId];

                decimal vatRate =
                    batch.SourceVatRate > 0m
                        ? batch.SourceVatRate
                        : 0m;

                decimal factor =
                    1m + vatRate / 100m;

                decimal oldNetMrp =
                    batch.Mrp / factor;

                decimal newNetMrp =
                    newMrp / factor;

                decimal ownMargin =
                    oldNetMrp > 0m
                        ? (1m - batch.UnitCost / oldNetMrp) * 100m
                        : 0m;

                bool found =
                    margins.TryGetValue(batch.StockBatchId, out decimal userMargin);

                bool edited =
                    !cardMode
                    &&
                    found
                    &&
                    Round4(userMargin) != Round4(ownMargin);

                if (edited && (userMargin >= 100m || userMargin < -100m))
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : the margin % of batch {batch.BatchNo} is -100 to below 100.");
                }

                decimal margin =
                    edited
                        ? Round4(userMargin)
                        : ownMargin;

                decimal newUnitCost =
                    Round4(newNetMrp * (1m - margin / 100m));

                // Motor Bikes : new cost = the supplier's card DP
                // (book cost basis : the stock sits at card DP)
                if (cardMode)
                {
                    string batchSupplier =
                        (batch.SupplierCode ?? string.Empty).Trim();

                    MotorBikeCardPrices.CardPrice? dpCard =
                        batchSupplier.Length > 0
                        &&
                        supplierCards.TryGetValue(batchSupplier, out Dictionary<long, MotorBikeCardPrices.CardPrice>? cards)
                            ? cards.GetValueOrDefault(batch.ProductId)
                            : null;

                    dpCard ??=
                        sellingCards[batch.ProductId];

                    // The card DP is VAT inclusive; the book cost leaves
                    // the claimed 6.3 VAT out (purchase : cost = card DP
                    // x qty - VAT, after the allowance), so the new cost
                    // does the same
                    decimal claimedVat =
                        batch.SourceType == "Purchase" && vatInCost.Contains(batch.SourceLineId)
                            ? 0m
                            : batch.SourceVatPerUnit;

                    newUnitCost =
                        Round4(dpCard.Dp - claimedVat);

                    margin =
                        newNetMrp > 0m
                            ? Round4((1m - dpCard.Dp / factor / newNetMrp) * 100m)
                            : 0m;
                }

                decimal difference =
                    Round4(newUnitCost - batch.UnitCost);

                decimal onHandNow =
                    batch.QuantityOnHand;

                decimal sold =
                    Math.Min(quantity, Math.Max(0m, quantity - onHandNow));

                string supplierCode =
                    Limit(batch.SupplierCode, 40);

                productLines.Add(
                    new LineCalc
                    {
                        ProductCode = product.Code,
                        ProductName = product.Name,
                        QuantityOnHandNow = onHandNow,
                        InStockNow = batch.QuantityOnHand + batch.QuantityInTransit,
                        BatchMarginPercent = Round4(ownMargin),
                        Line =
                            new PriceAdjustmentLines
                            {
                                ProductId = product.Id,
                                StockBatchId = batch.StockBatchId,
                                BatchNo = Limit(batch.BatchNo, 40),
                                SupplierCode = supplierCode,
                                SupplierName =
                                    Limit(
                                        supplierCode.Length == 0
                                            ? NoSupplierName
                                            : supplierNames.GetValueOrDefault(supplierCode, supplierCode),
                                        200),
                                VatRate = Round4(vatRate),
                                Quantity = quantity,
                                SoldSinceCutOff = sold,
                                ReleasedQuantity = 0m,
                                UnitCost = batch.UnitCost,
                                OldMrp = batch.Mrp,
                                NewMrp = newMrp,
                                MarginPercent = Round4(margin),
                                MarginEdited = edited,
                                NewUnitCost = newUnitCost,
                                DifferencePerUnit = difference,
                                Amount = Money(difference * quantity),
                                MrpApplied = false
                            }
                    });
            }

            result.Lines.AddRange(productLines);

            result.Products.Add(
                new PriceAdjustmentProducts
                {
                    LineNo = ++lineNo,
                    ProductId = product.Id,
                    ProductCode = Limit(product.Code, 40),
                    ProductName = Limit(product.Name, 250),
                    PartNumber = Limit(product.PartNumber, 100),
                    OldMrp = oldMrp,
                    NewMrp = newMrp,
                    // Motor Bikes : by the stock value (DP), not the MRP
                    Direction =
                        cardMode
                            ? (productLines.Sum(x => x.Line.Amount) >= 0m ? DirectionIncrease : DirectionReduction)
                            : (newMrp > oldMrp ? DirectionIncrease : DirectionReduction),
                    BatchCount = productLines.Count,
                    Quantity = productLines.Sum(x => x.Line.Quantity),
                    Amount = productLines.Sum(x => x.Line.Amount)
                });
        }

        // Supplier groups and their settlement
        Dictionary<string, PriceAdjustmentSupplierInputDto> settlement =
            (supplierInput ?? new List<PriceAdjustmentSupplierInputDto>())
                .Where(x => x != null)
                .GroupBy(x => (x.SupplierCode ?? string.Empty).Trim())
                .ToDictionary(g => g.Key, g => g.Last());

        foreach (IGrouping<string, LineCalc> group in result.Lines.GroupBy(x => x.Line.SupplierCode))
        {
            string name =
                group.First().Line.SupplierName;

            bool hasSupplier =
                group.Key.Length > 0;

            PriceAdjustmentSupplierInputDto? chosen =
                settlement.GetValueOrDefault(group.Key);

            result.Suppliers.Add(
                new PriceAdjustmentSuppliers
                {
                    SupplierCode = group.Key,
                    SupplierName = name,
                    IncreaseTo = IncreaseToOf(chosen?.IncreaseTo, hasSupplier, name),
                    ReductionTo = ReductionToOf(chosen?.ReductionTo, hasSupplier, name),
                    IncreaseAmount = group.Where(x => x.Line.Amount > 0m).Sum(x => x.Line.Amount),
                    ReductionAmount = group.Where(x => x.Line.Amount < 0m).Sum(x => -x.Line.Amount)
                });
        }

        result.Suppliers =
            result.Suppliers
                .OrderBy(x => x.SupplierCode.Length == 0)
                .ThenBy(x => x.SupplierName)
                .ToList();

        result.IncreaseAmount =
            result.Suppliers.Sum(x => x.IncreaseAmount);

        result.ReductionAmount =
            result.Suppliers.Sum(x => x.ReductionAmount);

        result.NetAmount =
            result.IncreaseAmount - result.ReductionAmount;

        return result;
    }

    private static PriceAdjustmentAnalysisDto ToAnalysisDto
    (
        Analysis analysis
    )
    {
        return new PriceAdjustmentAnalysisDto
        {
            CutOffDate = DateText(analysis.CutOff),
            Products = analysis.Products.Select(ToProductDto).ToList(),
            Lines =
                analysis.Lines
                    .Select(x => ToLineDto(x.Line, x.ProductCode, x.ProductName, x.QuantityOnHandNow, x.BatchMarginPercent))
                    .ToList(),
            Suppliers = analysis.Suppliers.Select(ToSupplierDto).ToList(),
            IncreaseAmount = analysis.IncreaseAmount,
            ReductionAmount = analysis.ReductionAmount,
            NetAmount = analysis.NetAmount
        };
    }


    //===========================================================
    // Analyse (read only)
    //===========================================================

    public async Task<PriceAdjustmentAnalysisDto>
        AnalyseAsync
        (
            PriceAdjustmentAnalyseInputDto input
        )
    {
        if (input == null)
        {
            throw new InvalidOperationException(
                "Add at least one product with its new MRP.");
        }

        string type =
            TypeOf(input.Type);

        DateOnly cutOff =
            ParseDate(input.CutOffDate, "The cut-off date");

        Analysis analysis =
            await AnalyseCoreAsync(type, cutOff, input.Products, input.Margins, input.Suppliers);

        return ToAnalysisDto(analysis);
    }


    //===========================================================
    // Draft : header, children
    //===========================================================

    private static void FillHeader
    (
        PriceAdjustment entity,
        CreatePriceAdjustmentDto dto,
        Analysis analysis
    )
    {
        entity.PageType = analysis.Type;
        entity.CutOffDate = analysis.CutOff;
        entity.CircularRef = Limit(dto.CircularRef, 100);
        entity.CircularDate = ParseOptionalDate(dto.CircularDate, "The circular date");
        entity.Remarks = Limit(dto.Remarks, 500);
        FillTotals(entity, analysis);
    }

    private static void FillTotals
    (
        PriceAdjustment entity,
        Analysis analysis
    )
    {
        entity.ProductCount = analysis.Products.Count;
        entity.BatchCount = analysis.Lines.Count;
        entity.IncreaseAmount = analysis.IncreaseAmount;
        entity.ReductionAmount = analysis.ReductionAmount;
        entity.NetAmount = analysis.NetAmount;
    }

    // The products, lines and supplier groups again (the caller
    // saves)
    private async Task WriteChildrenAsync
    (
        long priceAdjustmentId,
        Analysis analysis
    )
    {
        _context.Set<PriceAdjustmentProducts>().RemoveRange(
            await _context
                .Set<PriceAdjustmentProducts>()
                .Where(x => x.PriceAdjustmentId == priceAdjustmentId)
                .ToListAsync());

        _context.Set<PriceAdjustmentLines>().RemoveRange(
            await _context
                .Set<PriceAdjustmentLines>()
                .Where(x => x.PriceAdjustmentId == priceAdjustmentId)
                .ToListAsync());

        _context.Set<PriceAdjustmentSuppliers>().RemoveRange(
            await _context
                .Set<PriceAdjustmentSuppliers>()
                .Where(x => x.PriceAdjustmentId == priceAdjustmentId)
                .ToListAsync());

        foreach (PriceAdjustmentProducts product in analysis.Products)
        {
            product.PriceAdjustmentProductId = 0;

            product.PriceAdjustmentId = priceAdjustmentId;

            _context.Set<PriceAdjustmentProducts>().Add(product);
        }

        foreach (LineCalc calc in analysis.Lines)
        {
            calc.Line.PriceAdjustmentLineId = 0;

            calc.Line.PriceAdjustmentId = priceAdjustmentId;

            _context.Set<PriceAdjustmentLines>().Add(calc.Line);
        }

        foreach (PriceAdjustmentSuppliers supplier in analysis.Suppliers)
        {
            supplier.PriceAdjustmentSupplierId = 0;

            supplier.PriceAdjustmentId = priceAdjustmentId;

            _context.Set<PriceAdjustmentSuppliers>().Add(supplier);
        }
    }


    //===========================================================
    // Draft : save / change / delete / restore
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreatePriceAdjustmentDto dto,
            long branchId,
            long userId
        )
    {
        if (dto == null)
        {
            throw new InvalidOperationException(
                "Add at least one product with its new MRP.");
        }

        if (branchId <= 0)
        {
            throw new InvalidOperationException(
                "Your login has no branch. Sign in to a branch to make a price adjustment.");
        }

        string type =
            TypeOf(dto.Type);

        DateOnly cutOff =
            ParseDate(dto.CutOffDate, "The cut-off date");

        Analysis analysis =
            await AnalyseCoreAsync(type, cutOff, dto.Products, dto.Margins, dto.Suppliers);

        DateTime now =
            DateTime.UtcNow;

        string userName =
            await UserNameAsync(userId);

        PriceAdjustment entity =
            new()
            {
                BranchId = branchId,
                Status = StatusDraft,
                VoucherNo = string.Empty,
                CancelReason = string.Empty,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = now
            };

        FillHeader(entity, dto, analysis);

        await InTransactionAsync(
            async () =>
            {
                // One writer per type for the number
                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT pg_advisory_xact_lock({0}, {1})",
                    NumberLockClass,
                    Array.IndexOf(new[] { "MB", "SP", "AC" }, type));

                int last =
                    await _context
                        .Set<PriceAdjustment>()
                        .Where(x => x.PageType == type)
                        .Select(x => (int?)x.SequenceNo)
                        .MaxAsync()
                    ??
                    0;

                entity.SequenceNo =
                    last + 1;

                entity.AdjustmentNo =
                    NumberOf(type, entity.SequenceNo);

                _context.Set<PriceAdjustment>().Add(entity);

                await _context.SaveChangesAsync();

                await WriteChildrenAsync(entity.PriceAdjustmentId, analysis);

                AddHistory(entity, "Create", "Saved", userId, userName, now);

                await _context.SaveChangesAsync();
            });

        return entity.PriceAdjustmentId;
    }

    public async Task
        UpdateAsync
        (
            long id,
            UpdatePriceAdjustmentDto dto,
            long userId
        )
    {
        if (dto == null)
        {
            throw new InvalidOperationException(
                "Add at least one product with its new MRP.");
        }

        PriceAdjustment entity =
            await _context
                .Set<PriceAdjustment>()
                .FirstOrDefaultAsync(x => x.PriceAdjustmentId == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException("Price adjustment not found.");

        if (entity.Status != StatusDraft)
        {
            throw new InvalidOperationException(
                $"Price adjustment {entity.AdjustmentNo} is {entity.Status}; only a draft can be changed.");
        }

        // The type is fixed after the first save
        DateOnly cutOff =
            ParseDate(dto.CutOffDate, "The cut-off date");

        Analysis analysis =
            await AnalyseCoreAsync(entity.PageType, cutOff, dto.Products, dto.Margins, dto.Suppliers);

        DateTime now =
            DateTime.UtcNow;

        string userName =
            await UserNameAsync(userId);

        await InTransactionAsync(
            async () =>
            {
                FillHeader(entity, dto, analysis);

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                await WriteChildrenAsync(entity.PriceAdjustmentId, analysis);

                AddHistory(entity, "Update", "Updated", userId, userName, now);

                await _context.SaveChangesAsync();
            });
    }

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        PriceAdjustment entity =
            await _context
                .Set<PriceAdjustment>()
                .FirstOrDefaultAsync(x => x.PriceAdjustmentId == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException("Price adjustment not found.");

        if (entity.Status != StatusDraft)
        {
            throw new InvalidOperationException(
                $"Price adjustment {entity.AdjustmentNo} is {entity.Status}; only a draft can be deleted (cancel a posted one).");
        }

        DateTime now =
            DateTime.UtcNow;

        entity.IsDeleted = true;

        entity.DeletedBy = userId;

        entity.DeletedDate = now;

        AddHistory(entity, "Delete", "Deleted", userId, await UserNameAsync(userId), now);

        await _context.SaveChangesAsync();
    }

    public async Task
        RestoreAsync
        (
            long id,
            long userId
        )
    {
        PriceAdjustment entity =
            await _context
                .Set<PriceAdjustment>()
                .FirstOrDefaultAsync(x => x.PriceAdjustmentId == id)
            ??
            throw new KeyNotFoundException("Price adjustment not found.");

        if (!entity.IsDeleted)
        {
            throw new InvalidOperationException(
                $"Price adjustment {entity.AdjustmentNo} is not deleted.");
        }

        DateTime now =
            DateTime.UtcNow;

        entity.IsDeleted = false;

        entity.DeletedBy = null;

        entity.DeletedDate = null;

        entity.ModifiedBy = userId;

        entity.ModifiedDate = now;

        AddHistory(entity, "Restore", "Restored", userId, await UserNameAsync(userId), now);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Post : analysed again; new MRP on the batches, price index,
    // one journal, catch-up releases
    //===========================================================

    public async Task
        PostAsync
        (
            long id,
            long userId
        )
    {
        PriceAdjustment entity =
            await _context
                .Set<PriceAdjustment>()
                .FirstOrDefaultAsync(x => x.PriceAdjustmentId == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException("Price adjustment not found.");

        if (entity.Status != StatusDraft)
        {
            throw new InvalidOperationException(
                $"Price adjustment {entity.AdjustmentNo} is {entity.Status}; only a draft can be posted.");
        }

        DateOnly today =
            BusinessToday();

        if (entity.CutOffDate > today)
        {
            throw new InvalidOperationException(
                $"The cut-off date is {entity.CutOffDate:dd-MMM-yyyy} : post the price adjustment on or after it.");
        }

        if (entity.BranchId <= 0)
        {
            throw new InvalidOperationException(
                $"Price adjustment {entity.AdjustmentNo} has no branch for its journal.");
        }

        // The saved inputs : products, edited margins, settlement
        List<PriceAdjustmentProductInputDto> productInput =
            await _context
                .Set<PriceAdjustmentProducts>()
                .AsNoTracking()
                .Where(x => x.PriceAdjustmentId == id)
                .OrderBy(x => x.LineNo)
                .Select(x => new PriceAdjustmentProductInputDto { ProductId = x.ProductId, NewMrp = x.NewMrp })
                .ToListAsync();

        List<PriceAdjustmentMarginInputDto> marginInput =
            await _context
                .Set<PriceAdjustmentLines>()
                .AsNoTracking()
                .Where(x => x.PriceAdjustmentId == id && x.MarginEdited)
                .Select(x => new PriceAdjustmentMarginInputDto { StockBatchId = x.StockBatchId, MarginPercent = x.MarginPercent })
                .ToListAsync();

        List<PriceAdjustmentSupplierInputDto> supplierInput =
            await _context
                .Set<PriceAdjustmentSuppliers>()
                .AsNoTracking()
                .Where(x => x.PriceAdjustmentId == id)
                .Select(x => new PriceAdjustmentSupplierInputDto { SupplierCode = x.SupplierCode, IncreaseTo = x.IncreaseTo, ReductionTo = x.ReductionTo })
                .ToListAsync();

        DateTime now =
            DateTime.UtcNow;

        string userName =
            await UserNameAsync(userId);

        await InTransactionAsync(
            async () =>
            {
                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT 1 FROM \"PriceAdjustments\" WHERE \"PriceAdjustmentId\" = {0} FOR UPDATE",
                    id);

                Analysis analysis =
                    await AnalyseCoreAsync(entity.PageType, entity.CutOffDate, productInput, marginInput, supplierInput);

                //===================================================
                // Units sold since the cut-off : released at once
                //===================================================

                foreach (LineCalc calc in analysis.Lines)
                {
                    PriceAdjustmentLines line =
                        calc.Line;

                    if (line.SoldSinceCutOff <= 0m || line.Amount == 0m)
                    {
                        continue;
                    }

                    decimal release =
                        line.SoldSinceCutOff >= line.Quantity
                            ? line.Amount
                            : Money(line.SoldSinceCutOff * line.DifferencePerUnit);

                    if (Math.Abs(release) > Math.Abs(line.Amount))
                    {
                        release = line.Amount;
                    }

                    calc.ReleaseAmount = release;
                }

                //===================================================
                // Journal
                //===================================================

                List<VoucherPostingLine> journal =
                    await BuildJournalAsync(entity, analysis);

                //===================================================
                // Batches : the new MRP on those still in stock
                //===================================================

                List<long> batchIds =
                    analysis.Lines.Select(x => x.Line.StockBatchId).ToList();

                Dictionary<long, StockBatchesEntity> batches =
                    batchIds.Count == 0
                        ? new Dictionary<long, StockBatchesEntity>()
                        : await _context
                            .Set<StockBatchesEntity>()
                            .Where(x => batchIds.Contains(x.StockBatchId))
                            .ToDictionaryAsync(x => x.StockBatchId);

                foreach (LineCalc calc in analysis.Lines)
                {
                    if (!batches.TryGetValue(calc.Line.StockBatchId, out StockBatchesEntity? batch))
                    {
                        continue;
                    }

                    // The MRP it has now is the one to give back on cancel
                    calc.Line.OldMrp = batch.Mrp;

                    bool inStock =
                        batch.Status != BatchCancelled
                        &&
                        batch.Status != BatchClosed
                        &&
                        batch.QuantityOnHand + batch.QuantityInTransit > 0m;

                    if (inStock)
                    {
                        batch.Mrp = calc.Line.NewMrp;

                        batch.ModifiedBy = userId;

                        batch.ModifiedDate = now;

                        calc.Line.MrpApplied = true;
                    }

                    calc.Line.ReleasedQuantity = calc.Line.SoldSinceCutOff;
                }

                //===================================================
                // Price index : every product's new MRP from the
                // cut-off date
                //===================================================

                // Motor Bikes : the price cards are the price, no index
                foreach (PriceAdjustmentProducts product in analysis.Products.Where(x => entity.PageType != "MB"))
                {
                    PriceIndexWriter.Add(
                        _context,
                        entity.PageType,
                        product.ProductId,
                        product.ProductCode,
                        product.ProductName,
                        product.NewMrp,
                        entity.CutOffDate,
                        PriceIndexSource,
                        entity.PriceAdjustmentId,
                        entity.AdjustmentNo,
                        userId,
                        now);
                }

                //===================================================
                // The document again (fresh figures), then releases
                //===================================================

                FillTotals(entity, analysis);

                await WriteChildrenAsync(entity.PriceAdjustmentId, analysis);

                await _context.SaveChangesAsync();

                foreach (LineCalc calc in analysis.Lines.Where(x => x.ReleaseAmount != 0m))
                {
                    _context.Set<PriceAdjustmentReleases>().Add(
                        new PriceAdjustmentReleases
                        {
                            PriceAdjustmentLineId = calc.Line.PriceAdjustmentLineId,
                            PriceAdjustmentId = entity.PriceAdjustmentId,
                            StockBatchId = calc.Line.StockBatchId,
                            Quantity = calc.Line.SoldSinceCutOff,
                            Amount = calc.ReleaseAmount,
                            SourceType = ReleasePosting,
                            SourceNo = entity.AdjustmentNo,
                            ReleaseDate = today,
                            CreatedBy = userId,
                            CreatedDate = now
                        });
                }

                //===================================================
                // The journal under its own voucher number (type,
                // branch, month); the Adjustment No is its reference
                //===================================================

                entity.VoucherNo = string.Empty;

                if (journal.Count >= 2)
                {
                    VoucherNumberDto voucher =
                        await _numberService.NextAsync(
                            VoucherTypes.PriceAdjustment,
                            entity.BranchId,
                            today);

                    entity.VoucherNo =
                        voucher.VoucherNo;

                    await _postingService.PostAsync(
                        new VoucherPostingRequest
                        {
                            VoucherType = VoucherTypes.PriceAdjustment,
                            VoucherId = entity.PriceAdjustmentId,
                            VoucherNo = entity.VoucherNo,
                            VoucherDate = today,
                            BranchId = entity.BranchId,
                            ReferenceNo = entity.AdjustmentNo,
                            Narration =
                                Limit(
                                    $"Price adjustment {entity.AdjustmentNo}, cut-off {entity.CutOffDate:dd-MMM-yyyy}"
                                    + (entity.CircularRef.Length > 0 ? $", circular {entity.CircularRef}" : string.Empty),
                                    500),
                            Lines = journal
                        },
                        userId);
                }

                entity.Status = StatusPosted;

                entity.PostedBy = userId;

                entity.PostedDate = now;

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                AddHistory(
                    entity,
                    "Post",
                    "Posted",
                    userId,
                    userName,
                    now,
                    entity.VoucherNo.Length > 0
                        ? $"Journal {entity.VoucherNo}."
                        : "No amount to post : prices only.");

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // The journal of a posting (one group, balanced)
    //===========================================================

    private async Task<List<VoucherPostingLine>>
        BuildJournalAsync
        (
            PriceAdjustment entity,
            Analysis analysis
        )
    {
        List<VoucherPostingLine> journal =
            new();

        // Posting Setup ledgers, read when first needed
        Dictionary<string, string> ledgers =
            new(StringComparer.OrdinalIgnoreCase);

        string Ledger(string purpose)
        {
            if (!ledgers.TryGetValue(purpose, out string? code))
            {
                code = PostingLedgerCodes.Get(_context, purpose);

                ledgers[purpose] = code;
            }

            return code;
        }

        void Add(string ledgerCode, decimal debit, decimal credit, string narration, string partyCode = "")
        {
            if (debit == 0m && credit == 0m)
            {
                return;
            }

            journal.Add(
                new VoucherPostingLine
                {
                    GroupNo = 1,
                    LedgerCode = ledgerCode,
                    Debit = debit,
                    Credit = credit,
                    Narration = Limit(narration, 500),
                    PartyType = partyCode.Length > 0 ? PartySupplier : string.Empty,
                    PartyCode = partyCode
                });
        }

        // Supplier payables (only the groups settled with them)
        List<string> supplierCodes =
            analysis.Suppliers
                .Where
                (
                    x =>
                        x.SupplierCode.Length > 0
                        &&
                        (
                            (x.IncreaseTo == SettleSupplier && x.IncreaseAmount > 0m)
                            ||
                            (x.ReductionTo == SettleSupplier && x.ReductionAmount > 0m)
                        )
                )
                .Select(x => x.SupplierCode)
                .Distinct()
                .ToList();

        Dictionary<string, string> payables =
            new(StringComparer.OrdinalIgnoreCase);

        if (supplierCodes.Count > 0)
        {
            var profiles =
                await _context
                    .Set<SupplierProfilesEntity>()
                    .AsNoTracking()
                    .Where(x => supplierCodes.Contains(x.SupplierCode))
                    .Select(x => new { x.SupplierCode, x.DisplayName, x.PayableLedgerCode })
                    .ToListAsync();

            foreach (string code in supplierCodes)
            {
                var profile =
                    profiles.FirstOrDefault(x => x.SupplierCode == code)
                    ??
                    throw new InvalidOperationException(
                        $"Supplier {code} was not found (Supplier Profiles). Settle its group as Reserve / Income / Expense, or add the supplier.");

                string payable =
                    (profile.PayableLedgerCode ?? string.Empty).Trim();

                if (payable.Length == 0)
                {
                    throw new InvalidOperationException(
                        $"Supplier '{profile.DisplayName}' has no payable ledger (Supplier Profiles).");
                }

                payables[code] = payable;
            }
        }

        string no =
            entity.AdjustmentNo;

        foreach (PriceAdjustmentSuppliers group in analysis.Suppliers)
        {
            string name =
                group.SupplierName;

            List<LineCalc> lines =
                analysis.Lines
                    .Where(x => x.Line.SupplierCode == group.SupplierCode)
                    .ToList();

            //===================================================
            // Increase
            //===================================================

            if (group.IncreaseAmount > 0m)
            {
                Add(Ledger(PostingPurposes.StockPriceAdjustment), group.IncreaseAmount, 0m, $"Price increase {no}, {name}");

                switch (group.IncreaseTo)
                {
                    case SettleSupplier:
                        Add(payables[group.SupplierCode], 0m, group.IncreaseAmount, $"Price increase {no} to the supplier, {name}", group.SupplierCode);
                        break;

                    case SettleIncome:
                        Add(Ledger(PostingPurposes.PriceIncreaseIncome), 0m, group.IncreaseAmount, $"Price increase {no} kept as income, {name}");
                        break;

                    default:
                        Add(Ledger(PostingPurposes.PriceIncreaseReserve), 0m, group.IncreaseAmount, $"Price increase {no} held in reserve, {name}");
                        break;
                }
            }

            //===================================================
            // Reduction
            //===================================================

            if (group.ReductionAmount > 0m)
            {
                if (group.ReductionTo == SettleSupplier)
                {
                    Add(payables[group.SupplierCode], group.ReductionAmount, 0m, $"Price reduction {no} compensated by the supplier, {name}", group.SupplierCode);
                }
                else
                {
                    Add(Ledger(PostingPurposes.PriceReductionExpense), group.ReductionAmount, 0m, $"Price reduction {no}, {name}");
                }

                Add(Ledger(PostingPurposes.StockPriceAdjustment), 0m, group.ReductionAmount, $"Price reduction {no}, {name}");
            }

            //===================================================
            // Units sold since the cut-off : released at once
            //===================================================

            decimal increaseReleased =
                lines.Where(x => x.ReleaseAmount > 0m).Sum(x => x.ReleaseAmount);

            decimal reductionReleased =
                lines.Where(x => x.ReleaseAmount < 0m).Sum(x => -x.ReleaseAmount);

            if (increaseReleased > 0m)
            {
                Add(Ledger(PostingPurposes.PriceAdjustmentCost), increaseReleased, 0m, $"Price increase {no} on units sold since the cut-off, {name}");

                Add(Ledger(PostingPurposes.StockPriceAdjustment), 0m, increaseReleased, $"Price increase {no} on units sold since the cut-off, {name}");

                if (group.IncreaseTo == SettleReserve)
                {
                    Add(Ledger(PostingPurposes.PriceIncreaseReserve), increaseReleased, 0m, $"Price increase reserve {no} realised on units sold, {name}");

                    Add(Ledger(PostingPurposes.PriceIncreaseIncome), 0m, increaseReleased, $"Price increase reserve {no} realised on units sold, {name}");
                }
            }

            if (reductionReleased > 0m)
            {
                Add(Ledger(PostingPurposes.StockPriceAdjustment), reductionReleased, 0m, $"Price reduction {no} on units sold since the cut-off, {name}");

                Add(Ledger(PostingPurposes.PriceAdjustmentCost), 0m, reductionReleased, $"Price reduction {no} on units sold since the cut-off, {name}");
            }
        }

        decimal debit =
            journal.Sum(x => x.Debit);

        decimal credit =
            journal.Sum(x => x.Credit);

        if (debit != credit)
        {
            throw new InvalidOperationException(
                $"Price adjustment {no} does not balance (debit {debit:N2}, credit {credit:N2}).");
        }

        return journal;
    }


    //===========================================================
    // Cancel : journal reversed, old MRPs back, price index
    // entries cancelled
    //===========================================================

    public async Task
        CancelAsync
        (
            long id,
            CancelPriceAdjustmentDto dto,
            long userId
        )
    {
        string reason =
            Limit(dto?.Reason, 500);

        if (reason.Length < 5)
        {
            throw new InvalidOperationException(
                "Give the reason for cancelling (at least 5 characters).");
        }

        PriceAdjustment entity =
            await _context
                .Set<PriceAdjustment>()
                .FirstOrDefaultAsync(x => x.PriceAdjustmentId == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException("Price adjustment not found.");

        if (entity.Status != StatusPosted)
        {
            throw new InvalidOperationException(
                $"Price adjustment {entity.AdjustmentNo} is {entity.Status}; only a posted one can be cancelled.");
        }

        string? saleNo =
            await _context
                .Set<PriceAdjustmentReleases>()
                .AsNoTracking()
                .Where(x => x.PriceAdjustmentId == id && x.SourceType == ReleaseSale)
                .OrderBy(x => x.PriceAdjustmentReleaseId)
                .Select(x => x.SourceNo)
                .FirstOrDefaultAsync();

        if (saleNo != null)
        {
            throw new InvalidOperationException(
                $"Price adjustment {entity.AdjustmentNo} cannot be cancelled : sales have already released part of it (first : {saleNo}).");
        }

        List<PriceAdjustmentLines> lines =
            await _context
                .Set<PriceAdjustmentLines>()
                .AsNoTracking()
                .Where(x => x.PriceAdjustmentId == id && x.MrpApplied)
                .ToListAsync();

        List<long> batchIds =
            lines.Select(x => x.StockBatchId).Distinct().ToList();

        DateOnly today =
            BusinessToday();

        DateTime now =
            DateTime.UtcNow;

        string userName =
            await UserNameAsync(userId);

        await InTransactionAsync(
            async () =>
            {
                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT 1 FROM \"PriceAdjustments\" WHERE \"PriceAdjustmentId\" = {0} FOR UPDATE",
                    id);

                Dictionary<long, StockBatchesEntity> batches =
                    batchIds.Count == 0
                        ? new Dictionary<long, StockBatchesEntity>()
                        : await _context
                            .Set<StockBatchesEntity>()
                            .Where(x => batchIds.Contains(x.StockBatchId))
                            .ToDictionaryAsync(x => x.StockBatchId);

                // A later price change touched a batch : refused
                foreach (PriceAdjustmentLines line in lines)
                {
                    if (batches.TryGetValue(line.StockBatchId, out StockBatchesEntity? batch)
                        && batch.Mrp != line.NewMrp)
                    {
                        throw new InvalidOperationException(
                            $"Price adjustment {entity.AdjustmentNo} cannot be cancelled : the MRP of batch {line.BatchNo} was changed later (now {batch.Mrp:N2}, not {line.NewMrp:N2}). Cancel that price change first.");
                    }
                }

                if (entity.VoucherNo.Length > 0)
                {
                    await _postingService.ReverseAsync(
                        entity.VoucherNo,
                        today,
                        reason,
                        userId);
                }

                foreach (PriceAdjustmentLines line in lines)
                {
                    if (batches.TryGetValue(line.StockBatchId, out StockBatchesEntity? batch))
                    {
                        batch.Mrp = line.OldMrp;

                        batch.ModifiedBy = userId;

                        batch.ModifiedDate = now;
                    }
                }

                // Its price index entries are cancelled too
                await PriceIndexWriter.CancelAsync(
                    _context,
                    PriceIndexSource,
                    entity.PageType,
                    entity.PriceAdjustmentId,
                    now);

                entity.Status = StatusCancelled;

                entity.CancelReason = reason;

                entity.CancelledBy = userId;

                entity.CancelledDate = now;

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                AddHistory(
                    entity,
                    "Cancel",
                    "Cancelled",
                    userId,
                    userName,
                    now,
                    $"Reason : {reason}. The old MRPs are back{(entity.VoucherNo.Length > 0 ? $"; journal {entity.VoucherNo} reversed" : string.Empty)}.");

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Sale release (for the sales page; not called yet)
    //
    // Each unit sold of an adjusted batch releases its difference
    // per unit from Stock Price Adjustment, oldest adjustment
    // first, until the line's quantity (Quantity −
    // ReleasedQuantity) is used up :
    //   increase  : Dr Price Adj. on Cost of Sales /
    //               Cr Stock Price Adjustment
    //               (+ Dr Price Increase Reserve /
    //                  Cr Price Increase Income for a group whose
    //                  increase was kept as Reserve)
    //   reduction : Dr Stock Price Adjustment /
    //               Cr Price Adj. on Cost of Sales
    // The last unit of a line takes what is left of its amount (the
    // line closes at exactly its amount). Adds the release rows
    // (SourceType Sale) and the released quantity; returns the
    // journal lines for the sale's own voucher. The caller posts
    // them and saves, in its transaction.
    //===========================================================

    public async Task<List<VoucherPostingLine>>
        ReleaseOnSaleAsync
        (
            long stockBatchId,
            decimal quantity,
            string saleNo,
            DateOnly saleDate,
            long userId
        )
    {
        List<VoucherPostingLine> journal =
            new();

        if (quantity <= 0m || stockBatchId <= 0)
        {
            return journal;
        }

        List<long> postedIds =
            await _context
                .Set<PriceAdjustment>()
                .AsNoTracking()
                .Where(x => x.Status == StatusPosted && !x.IsDeleted)
                .Select(x => x.PriceAdjustmentId)
                .ToListAsync();

        List<PriceAdjustmentLines> lines =
            await _context
                .Set<PriceAdjustmentLines>()
                .Where
                (
                    x =>
                        x.StockBatchId == stockBatchId
                        &&
                        postedIds.Contains(x.PriceAdjustmentId)
                        &&
                        x.Quantity > x.ReleasedQuantity
                )
                .OrderBy(x => x.PriceAdjustmentLineId)
                .ToListAsync();

        if (lines.Count == 0)
        {
            return journal;
        }

        List<long> headIds =
            lines.Select(x => x.PriceAdjustmentId).Distinct().ToList();

        List<long> lineIds =
            lines.Select(x => x.PriceAdjustmentLineId).ToList();

        Dictionary<long, string> numbers =
            await _context
                .Set<PriceAdjustment>()
                .AsNoTracking()
                .Where(x => headIds.Contains(x.PriceAdjustmentId))
                .ToDictionaryAsync(x => x.PriceAdjustmentId, x => x.AdjustmentNo);

        List<PriceAdjustmentSuppliers> groups =
            await _context
                .Set<PriceAdjustmentSuppliers>()
                .AsNoTracking()
                .Where(x => headIds.Contains(x.PriceAdjustmentId))
                .ToListAsync();

        Dictionary<long, decimal> releasedAmount =
            (
                await _context
                    .Set<PriceAdjustmentReleases>()
                    .AsNoTracking()
                    .Where(x => lineIds.Contains(x.PriceAdjustmentLineId))
                    .GroupBy(x => x.PriceAdjustmentLineId)
                    .Select(g => new { LineId = g.Key, Amount = g.Sum(x => x.Amount) })
                    .ToListAsync()
            )
            .ToDictionary(x => x.LineId, x => x.Amount);

        string spa =
            PostingLedgerCodes.Get(_context, PostingPurposes.StockPriceAdjustment);

        string cost =
            PostingLedgerCodes.Get(_context, PostingPurposes.PriceAdjustmentCost);

        DateTime now =
            DateTime.UtcNow;

        decimal left =
            quantity;

        foreach (PriceAdjustmentLines line in lines)
        {
            if (left <= 0m)
            {
                break;
            }

            decimal remaining =
                line.Quantity - line.ReleasedQuantity;

            decimal units =
                Math.Min(left, remaining);

            decimal amount =
                units >= remaining
                    ? line.Amount - releasedAmount.GetValueOrDefault(line.PriceAdjustmentLineId)
                    : Money(units * line.DifferencePerUnit);

            line.ReleasedQuantity += units;

            left -= units;

            if (amount == 0m)
            {
                continue;
            }

            _context.Set<PriceAdjustmentReleases>().Add(
                new PriceAdjustmentReleases
                {
                    PriceAdjustmentLineId = line.PriceAdjustmentLineId,
                    PriceAdjustmentId = line.PriceAdjustmentId,
                    StockBatchId = line.StockBatchId,
                    Quantity = units,
                    Amount = amount,
                    SourceType = ReleaseSale,
                    SourceNo = Limit(saleNo, 40),
                    ReleaseDate = saleDate,
                    CreatedBy = userId,
                    CreatedDate = now
                });

            string no =
                numbers.GetValueOrDefault(line.PriceAdjustmentId, string.Empty);

            string narration =
                Limit($"Price adjustment {no} released on sale {saleNo}, batch {line.BatchNo}", 500);

            if (amount > 0m)
            {
                journal.Add(new VoucherPostingLine { GroupNo = 1, LedgerCode = cost, Debit = amount, Credit = 0m, Narration = narration });

                journal.Add(new VoucherPostingLine { GroupNo = 1, LedgerCode = spa, Debit = 0m, Credit = amount, Narration = narration });

                bool reserve =
                    groups.Any
                    (
                        x =>
                            x.PriceAdjustmentId == line.PriceAdjustmentId
                            &&
                            x.SupplierCode == line.SupplierCode
                            &&
                            x.IncreaseTo == SettleReserve
                    );

                if (reserve)
                {
                    journal.Add(new VoucherPostingLine { GroupNo = 1, LedgerCode = PostingLedgerCodes.Get(_context, PostingPurposes.PriceIncreaseReserve), Debit = amount, Credit = 0m, Narration = narration });

                    journal.Add(new VoucherPostingLine { GroupNo = 1, LedgerCode = PostingLedgerCodes.Get(_context, PostingPurposes.PriceIncreaseIncome), Debit = 0m, Credit = amount, Narration = narration });
                }
            }
            else
            {
                journal.Add(new VoucherPostingLine { GroupNo = 1, LedgerCode = spa, Debit = -amount, Credit = 0m, Narration = narration });

                journal.Add(new VoucherPostingLine { GroupNo = 1, LedgerCode = cost, Debit = 0m, Credit = -amount, Narration = narration });
            }
        }

        return journal;
    }


    //===========================================================
    // History : every price adjustment / one of them
    //===========================================================

    public async Task<IReadOnlyList<ActivityHistoryDto>>
        GetHistoryAsync()
    {
        return await HistoryQuery(null);
    }

    public async Task<IReadOnlyList<ActivityHistoryDto>>
        GetEntityHistoryAsync
        (
            long id
        )
    {
        return await HistoryQuery(id);
    }

    private async Task<List<ActivityHistoryDto>>
        HistoryQuery
        (
            long? id
        )
    {
        string[] names =
            new[] { $"{EntityName}MB", $"{EntityName}SP", $"{EntityName}AC" };

        return await _context.ActivityHistories
            .AsNoTracking()
            .Where
            (
                x =>
                    x.Module == ModuleName
                    &&
                    names.Contains(x.EntityName)
                    &&
                    (id == null || x.EntityId == id)
            )
            .OrderByDescending(x => x.PerformedDate)
            .Take(500)
            .Select
            (
                x =>
                    new ActivityHistoryDto
                    {
                        Id = x.Id,
                        Module = x.Module,
                        EntityName = x.EntityName,
                        EntityId = x.EntityId,
                        ActivityType = x.ActivityType,
                        ActivityTitle = x.ActivityTitle,
                        ActivityDescription = x.ActivityDescription,
                        PerformedBy = x.PerformedBy,
                        PerformedByName = x.PerformedByName,
                        PerformedDate = x.PerformedDate
                    }
            )
            .ToListAsync();
    }


    //===========================================================
    // Public Id -> internal id (deleted drafts too : the Deleted tab opens them)
    //===========================================================

    public async Task<long?>
        GetIdByPublicIdAsync
        (
            Guid publicId
        )
    {
        if
        (
            publicId == Guid.Empty
        )
        {
            return null;
        }

        return await _context
            .Set<global::AppCore.Domain.Entities.InventoryManagement.PricingLabels.PriceAdjustment>()
            .AsNoTracking()
            .Where(x => x.PublicId == publicId)
            .Select(x => (long?)x.PriceAdjustmentId)
            .FirstOrDefaultAsync();
    }


    //===========================================================
    // Get Paged (list page : tabs, type, search, sort and page on
    // the server). Deleted drafts are on the Deleted tab only.
    // Counts : All / <status> / Deleted (type + search applied),
    //          Type_<type> / Type_All (live, search applied).
    //===========================================================

    private static SortMap<PriceAdjustment> PagedSorts()
    {
        return new SortMap<PriceAdjustment>("AdjustmentNo")
            .Add("AdjustmentNo", x => x.AdjustmentNo)
            .Add("CutOffText", x => x.CutOffDate)
            .Add("TypeText", x => x.PageType)
            .Add("CircularText", x => x.CircularRef)
            .Add("ProductCount", x => x.ProductCount)
            .Add("BatchCount", x => x.BatchCount)
            .Add("IncreaseText", x => x.IncreaseAmount)
            .Add("ReductionText", x => x.ReductionAmount)
            .Add("NetText", x => x.NetAmount)
            .Add("StatusText", x => x.Status)
            .Tie(x => x.PriceAdjustmentId);
    }

    //===========================================================
    // Paged list : a search word that is a date (25-10-2026,
    // 25/10/2026 or 2026-10-25), null otherwise
    //===========================================================

    private static DateOnly? SearchDate(
        string text)
    {
        string[] formats =
        {
            "d-M-yyyy", "dd-MM-yyyy", "d/M/yyyy", "dd/MM/yyyy", "yyyy-MM-dd"
        };

        return DateOnly.TryParseExact(
            (text ?? string.Empty).Trim(),
            formats,
            System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.None,
            out DateOnly date)
            ? date
            : null;
    }

    public async Task<PagedResult<PriceAdjustmentListRowDto>>
        GetPagedAsync
        (
            PriceAdjustmentPageRequest request
        )
    {
        IQueryable<PriceAdjustment> query =
            _context
                .Set<PriceAdjustment>()
                .AsNoTracking();

        //-------------------------------------------------------
        // Search : every word must match (text columns or a date)
        //-------------------------------------------------------

        foreach
        (
            string word in request.SafeSearch.Split(' ', StringSplitOptions.RemoveEmptyEntries)
        )
        {
            string like =
                PagingQuery.LikePattern(word);

            DateOnly? date =
                SearchDate(word);

            if (date.HasValue)
            {
                DateOnly day = date.Value;

                query =
                    query.Where
                    (
                        x =>
                            x.CutOffDate == day ||
                            x.CircularDate == day ||
                            EF.Functions.ILike(x.AdjustmentNo, like) ||
                        EF.Functions.ILike(x.CircularRef, like) ||
                        EF.Functions.ILike(x.Remarks, like) ||
                        EF.Functions.ILike(x.Status, like) ||
                        EF.Functions.ILike(x.PageType, like)
                    );
            }
            else
            {
                query =
                    query.Where
                    (
                        x =>
                            EF.Functions.ILike(x.AdjustmentNo, like) ||
                        EF.Functions.ILike(x.CircularRef, like) ||
                        EF.Functions.ILike(x.Remarks, like) ||
                        EF.Functions.ILike(x.Status, like) ||
                        EF.Functions.ILike(x.PageType, like)
                    );
            }
        }

        //-------------------------------------------------------
        // Type buttons (live documents; search applied)
        //-------------------------------------------------------

        var typeCounts =
            await query
                .Where(x => !x.IsDeleted)
                .GroupBy(x => x.PageType)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToListAsync();

        string type =
            (request.Type ?? string.Empty).Trim().ToUpperInvariant();

        if (type != string.Empty)
        {
            query = query.Where(x => x.PageType == type);
        }

        //-------------------------------------------------------
        // Tab counts (type and search applied)
        //-------------------------------------------------------

        var statusCounts =
            await query
                .GroupBy(x => new { x.Status, x.IsDeleted })
                .Select(g => new { g.Key.Status, g.Key.IsDeleted, Count = g.Count() })
                .ToListAsync();

        string tab =
            (request.Tab ?? string.Empty).Trim().ToLowerInvariant();

        if (tab == "deleted")
        {
            query = query.Where(x => x.IsDeleted);
        }
        else
        {
            query = query.Where(x => !x.IsDeleted);

            if (tab != string.Empty && tab != "all")
            {
                query = query.Where(x => x.Status.ToLower() == tab);
            }
        }

        //-------------------------------------------------------
        // Total, then the page (newest first unless sorted)
        //-------------------------------------------------------

        int total =
            await query.CountAsync();

        PagingQuery.FitPage(
            request,
            total);

        IQueryable<PriceAdjustment> ordered =
            string.IsNullOrWhiteSpace(request.Sort)
                ? query
                    .OrderByDescending(x => x.CreatedDate)
                    .ThenByDescending(x => x.PriceAdjustmentId)
                : PagedSorts().Apply(query, request);

        List<PriceAdjustment> rows =
            await ordered
                .Page(request)
                .ToListAsync();

        Dictionary<string, int> counts =
            new()
            {
                ["All"] = statusCounts.Where(x => !x.IsDeleted).Sum(x => x.Count),
                ["Deleted"] = statusCounts.Where(x => x.IsDeleted).Sum(x => x.Count),
                ["Type_All"] = typeCounts.Sum(x => x.Count)
            };

        foreach (var row in statusCounts.Where(x => !x.IsDeleted).GroupBy(x => x.Status))
        {
            counts[row.Key] = row.Sum(x => x.Count);
        }

        foreach (var row in typeCounts)
        {
            counts["Type_" + row.Key] = row.Count;
        }

        return new PagedResult<PriceAdjustmentListRowDto>
        {
            Items = await MapListRowsAsync(rows),
            TotalCount = total,
            Page = request.SafePage,
            PageSize = request.SafePageSize,
            Counts = counts
        };
    }
}
