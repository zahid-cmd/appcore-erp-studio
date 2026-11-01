//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.InventoryManagement.StoreSetup;
using AppCore.Application.Platform.Accounting;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.InventoryManagement.StoreSetup;
using AppCore.Domain.Platform.Accounting;
using AppCore.Infrastructure.Persistence;

using PostingLedgerCodes =
    AppCore.Infrastructure.Platform.Accounting.PostingLedgerCodes;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;

using WarehousesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Warehouses;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using GeneralLedgersEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using RackManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.RackManagement;

using SparePartLocationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SparePartLocations;

using AccessoryLocationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.AccessoryLocations;

using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;

using SparePartsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SpareParts;

using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using MotorBikeUnitsEntity =
    AppCore.Domain.Entities.Procurement.MotorBikePurchase.MotorBikeUnits;

using StockBatchesEntity =
    AppCore.Domain.Platform.Inventory.StockBatches;

using StockMovementsEntity =
    AppCore.Domain.Platform.Inventory.StockMovements;

using VatRegisterEntity =
    AppCore.Domain.Platform.Inventory.VatRegister;

using PurchaseVatEntity =
    AppCore.Domain.Entities.VatManagement.VatSetup.PurchaseVat;

using SalesVatEntity =
    AppCore.Domain.Entities.VatManagement.VatSetup.SalesVat;


//===============================================================
// Namespace (as generated : the DI registration uses it)
//===============================================================

namespace AppCore.Infrastructure.Configurations.InventoryManagement.StoreSetup;


//===============================================================
// Opening Stock repository
//
// One document = one branch's warehouse + one product type (MB /
// SP / AC). Opening Voucher No OS-<branch code>-<type>-0001 :
// per branch and type, never reset, never reused.
// Cost is excl. VAT : typed (Cost basis) or, for SP / AC, from
// MRP less the supplier margin with the Purchase VAT taken out
// (MRP basis, as an MRP purchase invoice). MRP and Sale Price are
// VAT inclusive, kept on the batch (Product Pricing later); both
// are needed to post (an unpriced batch is not saleable).
//   Draft  : saved, edited, deleted freely. The number is given
//            on the first save. MB bikes are kept as Pending
//            bikes (MotorBikeUnits, OpeningStockId) so their
//            numbers are reserved like a purchase draft's.
//   Post   : per line one stock batch (SourceType Opening, exact
//            cost, sale price), On Hand in the warehouse at once
//            (movement Opening). Journal under the opening number :
//            Dr each product's Inventory ledger / Cr the document's
//            Opening Stock ledger. Bikes In Stock in the warehouse.
//            SP / AC : rack · shelf, optionally saved as default.
//   Cancel : while every batch is untouched (all still on hand in
//            the warehouse, nothing out) : reversing journal dated
//            today, reversal movements, batches Cancelled, bikes
//            taken off.
// Not a purchase : no supplier, no VAT, no In Transit.
//===============================================================

public class OpeningStockRepository
    : IOpeningStockRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Inventory Management";

    private const string EntityName =
        "OpeningStock";

    private const string DateFormat =
        "yyyy-MM-dd";

    public const string StatusDraft = "Draft";

    public const string StatusPosted = "Posted";

    public const string StatusCancelled = "Cancelled";

    private const string SourceOpening = "Opening";

    private const string BucketOnHand = "OnHand";

    private const string BatchCancelled = "Cancelled";

    private const string MoveOpening = "Opening";

    private const string MoveOpeningCancel = "OpeningCancel";

    private const string UnitPending = "Pending";

    private const string UnitInStock = "InStock";

    private const int MaxLines = 1000;

    private const string BasisCost = "Cost";

    private const string BasisMrp = "MRP";

    // Advisory lock class of the Opening Voucher No ('OS')
    private const int NumberLockClass = 0x4F53;

    private const string VatMotorBikes = "Motor Bikes";

    private const string VatSpareParts = "Spare Parts";

    private const string VatLubricants = "Lubricants";

    private const string VatAccessories = "Accessories";

    // Purchases - MB switches for the bike numbers
    private const string SwitchKeyBattery = "CFG-MOD-007-0048";

    private const string SwitchUniqueKeyNo = "CFG-MOD-007-0049";

    private const string SwitchUniqueBatteryNo = "CFG-MOD-007-0050";

    // Inventory Management : Lock Opening Stock Ledger (critical).
    // ON = the credit ledger is always the Posting Setup one
    // (OPENING-STOCK); OFF = chosen per document
    private const string SwitchLedgerLocked = "CFG-MOD-012-0006";

    // Opening Stock Includes Unclaimed VAT, per type (critical).
    // ON = the cost is typed incl. VAT : the VAT part (Purchase VAT
    // rule, input credit allowed) goes Dr VAT Current Account and
    // into the VAT register; inventory takes the net cost
    private static string SwitchVatIncluded(string type) =>
        type switch
        {
            "MB" => "CFG-MOD-012-0007",
            "SP" => "CFG-MOD-012-0008",
            _ => "CFG-MOD-012-0009"
        };


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IVoucherNumberService _numberService;

    private readonly IVoucherPostingService _postingService;

    private readonly IVatApplicabilityService _vatApplicability;


    //===========================================================
    // Constructor
    //===========================================================

    public OpeningStockRepository(
        AppDbContext context,
        IVoucherNumberService numberService,
        IVoucherPostingService postingService,
        IVatApplicabilityService vatApplicability)
    {
        _context = context;

        _numberService = numberService;

        _postingService = postingService;

        _vatApplicability = vatApplicability;
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

    private static string PrefixOf(string type) =>
        type switch
        {
            "MB" => VoucherTypes.OpeningMotorBikes,
            "SP" => VoucherTypes.OpeningSpareParts,
            _ => VoucherTypes.OpeningAccessories
        };

    private static string TitleOf(string type) =>
        type switch
        {
            "MB" => "Motor Bikes",
            "SP" => "Spare Parts & Lubricants",
            _ => "Accessories"
        };

    private static bool HasShelves(string type) =>
        type is "SP" or "AC";

        private static string[] VatTypesOf(string type) =>
        type switch
        {
            "MB" => new[] { VatMotorBikes },
            "SP" => new[] { VatSpareParts, VatLubricants },
            _ => new[] { VatAccessories }
        };


    //===========================================================
    // Opening Voucher No : OS-<branch code>-<type>-0001
    //===========================================================

    private static string NumberOf
    (
        string branchCode,
        string type,
        int sequence
    )
    {
        // The branch code without its letter prefix : BRN-01-01-01 →
        // 01-01-01
        string code =
            System.Text.RegularExpressions.Regex.Replace(
                (branchCode ?? string.Empty).Trim(),
                "^[A-Za-z]+-",
                string.Empty);

        return $"OS-{code}-{type}-{sequence:D4}";
    }

    // Last 0001 used per branch for the type (deleted drafts too :
    // a number is never reused)
    private async Task<Dictionary<long, int>>
        LastSequencesAsync
        (
            string type
        )
    {
        return await _context
            .Set<OpeningStock>()
            .AsNoTracking()
            .Where(x => x.PageType == type)
            .GroupBy(x => x.BranchId)
            .Select(g => new { g.Key, Last = g.Max(x => x.SequenceNo) })
            .ToDictionaryAsync(x => x.Key, x => x.Last);
    }

    //===========================================================
    // Helpers
    //===========================================================

    private static string DateText(DateOnly date) =>
        date.ToString(DateFormat, CultureInfo.InvariantCulture);

    private static string DateText(DateTime? date) =>
        date.HasValue
            ? date.Value.ToString(DateFormat, CultureInfo.InvariantCulture)
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

    private static string Qty(decimal value) =>
        value.ToString("0.##", CultureInfo.InvariantCulture);

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


    //===========================================================
    // Switches
    //===========================================================

    private async Task<bool>
        IsSwitchOnAsync
        (
            string code,
            bool fallback
        )
    {
        bool? value =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => x.ConfigurationCode == code && !x.IsDeleted)
                .Select(x => (bool?)x.IsEnabled)
                .FirstOrDefaultAsync();

        return value ?? fallback;
    }

    // Key & Battery Required (MB) : ON = asked and required; OFF =
    // not kept. Chassis and Engine are always required.
    private async Task<bool> KeyBatteryOnAsync() =>
        await IsSwitchOnAsync(SwitchKeyBattery, true);

    // Lock Opening Stock Ledger : missing switch = locked
    private async Task<bool> LedgerLockedAsync() =>
        await IsSwitchOnAsync(SwitchLedgerLocked, true);

    // Includes Unclaimed VAT : missing switch = MB on, others off
    private async Task<bool> VatIncludedAsync(string type) =>
        await IsSwitchOnAsync(SwitchVatIncluded(type), type == "MB");


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
    // History
    //===========================================================

    private void AddHistory
    (
        OpeningStock entity,
        string activityType,
        string verb,
        long userId,
        DateTime now,
        string extra = ""
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = ModuleName,
                EntityName = $"{EntityName}{entity.PageType}",
                EntityId = entity.OpeningStockId,
                ActivityType = activityType,
                ActivityTitle = $"Opening Stock {verb}",
                ActivityDescription =
                    $"Opening Stock {entity.OpeningNo} ({TitleOf(entity.PageType)}, {Qty(entity.TotalQuantity)} into {entity.WarehouseName}, {entity.TotalValue:N2}) {verb.ToLowerInvariant()}.{(string.IsNullOrWhiteSpace(extra) ? string.Empty : " " + extra)}",
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = now
            });
    }


    //===========================================================
    // Read
    //===========================================================

    public async Task<List<OpeningStockDto>>
        GetAllAsync
        (
            string? pageType
        )
    {
        string type =
            (pageType ?? string.Empty).Trim().ToUpperInvariant();

        List<OpeningStock> rows =
            await _context
                .Set<OpeningStock>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && (type == string.Empty || x.PageType == type))
                .OrderByDescending(x => x.OpeningDate)
                .ThenByDescending(x => x.OpeningStockId)
                .ToListAsync();

        List<long> ids =
            rows.Select(x => x.OpeningStockId).ToList();

        Dictionary<long, int> counts =
            await _context
                .Set<OpeningStockLines>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.OpeningStockId))
                .GroupBy(x => x.OpeningStockId)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count);

        return rows
            .Select
            (
                x =>
                {
                    OpeningStockDto dto =
                        ToDto(x);

                    dto.LineCount = counts.GetValueOrDefault(x.OpeningStockId);

                    return dto;
                }
            )
            .ToList();
    }


    public async Task<OpeningStockDto?>
        GetByIdAsync
        (
            long id
        )
    {
        OpeningStock? entity =
            await _context
                .Set<OpeningStock>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OpeningStockId == id && !x.IsDeleted);

        if (entity == null)
        {
            return null;
        }

        OpeningStockDto dto =
            ToDto(entity);

        dto.Lines =
            await _context
                .Set<OpeningStockLines>()
                .AsNoTracking()
                .Where(x => x.OpeningStockId == id)
                .OrderBy(x => x.LineNo)
                .Select
                (
                    x =>
                        new OpeningStockLineDto
                        {
                            OpeningStockLineId = x.OpeningStockLineId,
                            LineNo = x.LineNo,
                            ProductId = x.ProductId,
                            ProductCode = x.ProductCode,
                            ProductName = x.ProductName,
                            Unit = x.Unit,
                            Quantity = x.Quantity,
                            UnitCost = x.UnitCost,
                            LineValue = x.LineValue,
                            SalePrice = x.SalePrice,
                            Mrp = x.Mrp,
                            MarginPercent = x.MarginPercent,
                            GrossUnitCost = x.GrossUnitCost,
                            VatRate = x.VatRate,
                            VatAmount = x.VatAmount,
                            RackManagementId = x.RackManagementId,
                            RackCode = x.RackCode,
                            ShelfNumber = x.ShelfNumber,
                            SaveAsDefault = x.SaveAsDefault,
                            ShortNotes = x.ShortNotes,
                            BatchNo = x.BatchNo
                        }
                )
                .ToListAsync();

        dto.LineCount =
            dto.Lines.Count;

        if (entity.PageType == "MB")
        {
            // Draft / posted : live bikes; cancelled : kept for the
            // record (deleted ones)
            bool cancelled =
                entity.Status == StatusCancelled;

            dto.Units =
                await _context
                    .Set<MotorBikeUnitsEntity>()
                    .AsNoTracking()
                    .Where(x => x.OpeningStockId == id && (cancelled || !x.IsDeleted))
                    .OrderBy(x => x.ProductId)
                    .ThenBy(x => x.MotorBikeUnitId)
                    .Select
                    (
                        x =>
                            new OpeningStockUnitDto
                            {
                                ProductId = x.ProductId,
                                ChassisNo = x.ChassisNo,
                                EngineNo = x.EngineNo,
                                KeyNo = x.KeyNo,
                                BatteryNo = x.BatteryNo
                            }
                    )
                    .ToListAsync();
        }

        return dto;
    }


    private static OpeningStockDto ToDto
    (
        OpeningStock x
    )
    {
        return new OpeningStockDto
        {
            OpeningStockId = x.OpeningStockId,
            PageType = x.PageType,
            OpeningNo = x.OpeningNo,
            OpeningDate = DateText(x.OpeningDate),
            BranchId = x.BranchId,
            BranchCode = x.BranchCode,
            BranchName = x.BranchName,
            CostBasis = x.CostBasis,
            JournalNo = x.JournalNo,
            VatIncluded = x.VatIncluded,
            TotalVat = x.TotalVat,
            WarehouseId = x.WarehouseId,
            WarehouseName = x.WarehouseName,
            LedgerCode = x.LedgerCode,
            LedgerName = x.LedgerName,
            Remarks = x.Remarks,
            TotalQuantity = x.TotalQuantity,
            TotalValue = x.TotalValue,
            Status = x.Status,
            PostedDate = DateText(x.PostedDate),
            CancelReason = x.CancelReason,
            CancelledDate = DateText(x.CancelledDate),
            CreatedDate = DateText(x.CreatedDate)
        };
    }


    //===========================================================
    // Defaults : warehouses, racks, products, ledgers, switches
    //===========================================================

    public async Task<OpeningStockDefaultsDto>
        GetDefaultsAsync
        (
            string pageType
        )
    {
        string type =
            TypeOf(pageType);

        bool keyBattery =
            type == "MB" && await KeyBatteryOnAsync();

        OpeningStockDefaultsDto result =
            new()
            {
                PageType = type,
                Today = DateText(BusinessToday()),
                DefaultLedgerCode = PostingLedgerCodes.TryGet(_context, PostingPurposes.OpeningStock) ?? string.Empty,
                LedgerLocked = await LedgerLockedAsync(),
                VatIncluded = await VatIncludedAsync(type),
                UnitsRequired = keyBattery,
                UniqueKeyNo = keyBattery && await IsSwitchOnAsync(SwitchUniqueKeyNo, false),
                UniqueBatteryNo = keyBattery && await IsSwitchOnAsync(SwitchUniqueBatteryNo, false)
            };

        var branchRows =
            await _context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .Select(x => new { x.BranchId, x.BranchCode, x.BranchName, x.IsActive, x.IsDeleted })
                .ToListAsync();

        Dictionary<long, string> branches =
            branchRows.ToDictionary(x => x.BranchId, x => x.BranchName ?? string.Empty);

        result.Warehouses =
            (
                await _context
                    .Set<WarehousesEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .Select(x => new { x.WarehouseId, x.BranchId, x.WarehouseCode, x.WarehouseName, x.IsDefault })
                    .ToListAsync()
            )
            .Select
            (
                x =>
                    new OpeningStockWarehouseDto
                    {
                        Id = x.WarehouseId,
                        BranchId = x.BranchId,
                        BranchName = branches.GetValueOrDefault(x.BranchId, string.Empty),
                        Code = x.WarehouseCode ?? string.Empty,
                        Name = x.WarehouseName ?? string.Empty,
                        IsDefault = x.IsDefault
                    }
            )
            .OrderBy(x => x.BranchName)
            .ThenByDescending(x => x.IsDefault)
            .ThenBy(x => x.Name)
            .ToList();

        // Branches with an active warehouse, with their next number
        HashSet<long> stocked =
            result.Warehouses.Select(x => x.BranchId).ToHashSet();

        Dictionary<long, int> lastNumbers =
            await LastSequencesAsync(type);

        result.Branches =
            branchRows
                .Where(x => !x.IsDeleted && x.IsActive && stocked.Contains(x.BranchId))
                .OrderBy(x => x.BranchName)
                .Select
                (
                    x =>
                        new OpeningStockBranchDto
                        {
                            Id = x.BranchId,
                            Code = x.BranchCode ?? string.Empty,
                            Name = x.BranchName ?? string.Empty,
                            NextNumber = NumberOf(x.BranchCode ?? string.Empty, type, lastNumbers.GetValueOrDefault(x.BranchId) + 1)
                        }
                )
                .ToList();

        // VAT : applicability today, the active rules of the type
        VatApplicabilityDto applicability =
            await _vatApplicability.GetAsync(type, BusinessToday());

        result.PurchaseVatApplicable =
            applicability.PurchaseVatApplicable;

        result.SalesVatApplicable =
            applicability.SalesVatApplicable;

        string[] vatTypes =
            VatTypesOf(type);

        result.PurchaseVatRules =
            (
                await _context
                    .Set<PurchaseVatEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.Status && vatTypes.Contains(x.VatType))
                    .Select(x => new { x.VatType, x.VatRate, x.InputCreditAllowed, x.EffectiveFrom, x.ValidTo })
                    .ToListAsync()
            )
            .Select
            (
                x =>
                    new OpeningStockVatRuleDto
                    {
                        VatType = x.VatType,
                        Rate = x.VatRate,
                        InputCreditAllowed = x.InputCreditAllowed,
                        EffectiveFrom = DateText(x.EffectiveFrom),
                        ValidTo = DateText(x.ValidTo)
                    }
            )
            .ToList();

        result.SalesVatRules =
            (
                await _context
                    .Set<SalesVatEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.Status && vatTypes.Contains(x.VatType))
                    .Select(x => new { x.VatType, x.VatRate, x.EffectiveFrom, x.ValidTo })
                    .ToListAsync()
            )
            .Select
            (
                x =>
                    new OpeningStockVatRuleDto
                    {
                        VatType = x.VatType,
                        Rate = x.VatRate,
                        EffectiveFrom = DateText(x.EffectiveFrom),
                        ValidTo = DateText(x.ValidTo)
                    }
            )
            .ToList();

        if (HasShelves(type))
        {
            result.Racks =
                await _context
                    .Set<RackManagementEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.RackCode)
                    .Select
                    (
                        x =>
                            new OpeningStockRackDto
                            {
                                Id = x.RackManagementId,
                                WarehouseId = x.WarehouseId,
                                Code = x.RackCode,
                                Name = x.RackName,
                                ShelfCount = x.ShelfCount
                            }
                    )
                    .ToListAsync();
        }

        result.Products =
            await ProductsAsync(type, null, true);

        result.Ledgers =
            await _context
                .Set<GeneralLedgersEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.LedgerName)
                .Select
                (
                    x =>
                        new OpeningStockLedgerDto
                        {
                            Code = x.LedgerCode,
                            Name = x.LedgerName
                        }
                )
                .ToListAsync();

        return result;
    }


    //===========================================================
    // Products of a type (live), with ledger, last batch figures
    // and default places
    //===========================================================

    private sealed class ProductInfo
    {
        public long Id { get; set; }

        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string Unit { get; set; } = string.Empty;

        public long CategoryId { get; set; }

        public long SubCategoryId { get; set; }

        public string InventoryLedgerCode { get; set; } = string.Empty;

        // Motor Bikes / Spare Parts / Lubricants / Accessories
        public string VatType { get; set; } = string.Empty;
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

        if (type != "SP")
        {
            string vatType =
                type == "MB" ? VatMotorBikes : VatAccessories;

            rows.ForEach(x => x.VatType = vatType);

            return rows;
        }

        // Spare Parts or Lubricants, from the category
        List<long> categoryIds =
            rows.Select(x => x.CategoryId).Distinct().ToList();

        Dictionary<long, string> kinds =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .Where(x => categoryIds.Contains(x.ProductCategoryId))
                .ToDictionaryAsync(x => x.ProductCategoryId, x => x.CategoryType ?? string.Empty);

        rows.ForEach
        (
            x =>
                x.VatType =
                    string.Equals(kinds.GetValueOrDefault(x.CategoryId, string.Empty).Trim(), VatLubricants, StringComparison.OrdinalIgnoreCase)
                        ? VatLubricants
                        : VatSpareParts
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
                            Unit = "Pcs",
                            CategoryId = x.ProductCategoryId,
                            SubCategoryId = x.ProductSubCategoryId,
                            InventoryLedgerCode = x.InventoryLedgerCode ?? string.Empty
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
                            Unit = x.Unit,
                            CategoryId = x.ProductCategoryId,
                            SubCategoryId = x.ProductSubCategoryId,
                            InventoryLedgerCode = x.InventoryLedgerCode ?? string.Empty
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
                    .Select(x => new { x.AccessoryId, x.ProductCode, x.PartNumber, x.AccessoryName, x.Unit, x.ProductCategoryId, x.ProductSubCategoryId, x.InventoryLedgerCode })
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
                        Unit = x.Unit,
                        CategoryId = x.ProductCategoryId,
                        SubCategoryId = x.ProductSubCategoryId,
                        InventoryLedgerCode = x.InventoryLedgerCode ?? string.Empty
                    }
            )
            .ToList();
    }

    private async Task<List<OpeningStockProductDto>>
        ProductsAsync
        (
            string type,
            List<long>? ids,
            bool details
        )
    {
        List<ProductInfo> rows =
            await ProductRowsAsync(type, ids);

        Dictionary<long, string> categories =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.ProductCategoryId, x => x.CategoryName ?? string.Empty);

        Dictionary<long, string> subCategories =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.ProductSubCategoryId, x => x.SubCategoryName ?? string.Empty);

        Dictionary<long, (decimal Cost, decimal Price, decimal Mrp)> last =
            new();

        List<(long ProductId, long WarehouseId, long RackId, int Shelf)> shelves =
            new();

        if (details)
        {
            // Latest batch (not cancelled) of each product
            last =
                (
                    await _context
                        .Set<StockBatchesEntity>()
                        .AsNoTracking()
                        .Where(x => x.ProductType == type && x.Status != BatchCancelled)
                        .Select(x => new { x.ProductId, x.StockBatchId, x.UnitCost, x.SalePrice, x.Mrp })
                        .ToListAsync()
                )
                .GroupBy(x => x.ProductId)
                .ToDictionary
                (
                    g => g.Key,
                    g =>
                    {
                        var row = g.OrderByDescending(x => x.StockBatchId).First();

                        return (row.UnitCost, row.SalePrice, row.Mrp);
                    }
                );

            shelves =
                await ShelvesAsync(type, rows.Select(x => x.Id).ToList());
        }

        return rows
            .Select
            (
                x =>
                    new OpeningStockProductDto
                    {
                        Id = x.Id,
                        Code = x.Code,
                        Name = x.Name,
                        Unit = x.Unit,
                        CategoryName = categories.GetValueOrDefault(x.CategoryId, string.Empty),
                        SubCategoryName = subCategories.GetValueOrDefault(x.SubCategoryId, string.Empty),
                        HasLedger = !string.IsNullOrWhiteSpace(x.InventoryLedgerCode),
                        LastCost = last.TryGetValue(x.Id, out var figures) ? figures.Cost : 0m,
                        LastSalePrice = last.TryGetValue(x.Id, out var prices) ? prices.Price : 0m,
                        LastMrp = last.TryGetValue(x.Id, out var mrps) ? mrps.Mrp : 0m,
                        VatType = x.VatType,
                        Shelves =
                            shelves
                                .Where(s => s.ProductId == x.Id)
                                .Select(s => new OpeningStockShelfDto { WarehouseId = s.WarehouseId, RackManagementId = s.RackId, ShelfNumber = s.Shelf })
                                .ToList()
                    }
            )
            .OrderBy(x => x.CategoryName)
            .ThenBy(x => x.SubCategoryName)
            .ThenBy(x => x.Name)
            .ToList();
    }


    private async Task<List<(long ProductId, long WarehouseId, long RackId, int Shelf)>>
        ShelvesAsync
        (
            string type,
            List<long> productIds
        )
    {
        if (!HasShelves(type) || productIds.Count == 0)
        {
            return new List<(long, long, long, int)>();
        }

        if (type == "SP")
        {
            return
                (
                    await _context
                        .Set<SparePartLocationsEntity>()
                        .AsNoTracking()
                        .Where(x => productIds.Contains(x.SparePartId))
                        .Select(x => new { x.SparePartId, x.WarehouseId, x.RackManagementId, x.ShelfNumber })
                        .ToListAsync()
                )
                .Select(x => (x.SparePartId, x.WarehouseId, x.RackManagementId, x.ShelfNumber))
                .ToList();
        }

        return
            (
                await _context
                    .Set<AccessoryLocationsEntity>()
                    .AsNoTracking()
                    .Where(x => productIds.Contains(x.AccessoryId))
                    .Select(x => new { x.AccessoryId, x.WarehouseId, x.RackManagementId, x.ShelfNumber })
                    .ToListAsync()
            )
            .Select(x => (x.AccessoryId, x.WarehouseId, x.RackManagementId, x.ShelfNumber))
            .ToList();
    }


    //===========================================================
    // Bike numbers : live check and the rule check on save
    //===========================================================

    public async Task<List<OpeningStockUnitTakenDto>>
        CheckUnitsAsync
        (
            OpeningStockUnitCheckDto dto
        )
    {
        List<OpeningStockUnitDto> units =
            dto?.Units ?? new List<OpeningStockUnitDto>();

        if (units.Count == 0)
        {
            return new List<OpeningStockUnitTakenDto>();
        }

        bool keyBattery =
            await KeyBatteryOnAsync();

        return await TakenAsync(
            units,
            dto!.OpeningStockId,
            keyBattery && await IsSwitchOnAsync(SwitchUniqueKeyNo, false),
            keyBattery && await IsSwitchOnAsync(SwitchUniqueBatteryNo, false));
    }


    // Live bikes (any purchase, receiving or opening) holding the
    // numbers, except this document's own
    private async Task<List<OpeningStockUnitTakenDto>>
        TakenAsync
        (
            List<OpeningStockUnitDto> units,
            long ownId,
            bool uniqueKey,
            bool uniqueBattery
        )
    {
        List<OpeningStockUnitTakenDto> result =
            new();

        List<string> Pick(Func<OpeningStockUnitDto, string?> pick) =>
            units
                .Select(x => Limit(pick(x), 50).ToUpperInvariant())
                .Where(x => x.Length > 0)
                .Distinct()
                .Take(1000)
                .ToList();

        List<string> chassis = Pick(x => x.ChassisNo);

        List<string> engines = Pick(x => x.EngineNo);

        List<string> keys = uniqueKey ? Pick(x => x.KeyNo) : new List<string>();

        List<string> batteries = uniqueBattery ? Pick(x => x.BatteryNo) : new List<string>();

        if (chassis.Count + engines.Count + keys.Count + batteries.Count == 0)
        {
            return result;
        }

        var rows =
            await _context
                .Set<MotorBikeUnitsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (ownId <= 0 || x.OpeningStockId == null || x.OpeningStockId != ownId)
                        &&
                        (
                            chassis.Contains(x.ChassisNo.ToUpper())
                            ||
                            engines.Contains(x.EngineNo.ToUpper())
                            ||
                            keys.Contains(x.KeyNo.ToUpper())
                            ||
                            batteries.Contains(x.BatteryNo.ToUpper())
                        )
                )
                .Select(x => new { x.ChassisNo, x.EngineNo, x.KeyNo, x.BatteryNo, x.PurchaseNo })
                .Take(1000)
                .ToListAsync();

        void Add(string field, string label, string? value, List<string> typed, string documentNo)
        {
            string key =
                (value ?? string.Empty).Trim().ToUpperInvariant();

            if (key.Length == 0 || !typed.Contains(key) || result.Any(x => x.Field == field && x.Value == key))
            {
                return;
            }

            result.Add(
                new OpeningStockUnitTakenDto
                {
                    Field = field,
                    Value = key,
                    Message = $"{label} {key} is already on a bike of {(string.IsNullOrWhiteSpace(documentNo) ? "another document" : documentNo)}."
                });
        }

        foreach (var row in rows)
        {
            Add("ChassisNo", "Chassis No", row.ChassisNo, chassis, row.PurchaseNo);
            Add("EngineNo", "Engine No", row.EngineNo, engines, row.PurchaseNo);
            Add("KeyNo", "Key No", row.KeyNo, keys, row.PurchaseNo);
            Add("BatteryNo", "Battery No", row.BatteryNo, batteries, row.PurchaseNo);
        }

        return result;
    }


    //===========================================================
    // Input : checked and resolved (draft save and post)
    //===========================================================

    private sealed class ResolvedLine
    {
        public CreateOpeningStockLineDto Input { get; set; } = new();

        public ProductInfo Product { get; set; } = new();

        public RackManagementEntity? Rack { get; set; }

        // Excl. VAT, 4 decimals : typed, or from MRP less margin
        public decimal UnitCost { get; set; }

        // Incl. VAT (= UnitCost when no VAT is carried)
        public decimal GrossUnitCost { get; set; }

        // Purchase VAT taken out (0 = none)
        public decimal VatRate { get; set; }
    }

    private sealed class Resolved
    {
        public string Type { get; set; } = string.Empty;

        public DateOnly Date { get; set; }

        public WarehousesEntity Warehouse { get; set; } = null!;

        public long BranchId { get; set; }

        public string CostBasis { get; set; } = BasisCost;

        // Includes Unclaimed VAT (switch of the type)
        public bool VatIncluded { get; set; }

        public string BranchCode { get; set; } = string.Empty;

        public string BranchName { get; set; } = string.Empty;

        public long FinancialYearId { get; set; }

        public string LedgerCode { get; set; } = string.Empty;

        public string LedgerName { get; set; } = string.Empty;

        public List<ResolvedLine> Lines { get; set; } = new();

        public List<OpeningStockUnitDto> Units { get; set; } = new();
    }

    // posting = the full rules (bike count, key / battery, every
    // product with its Inventory ledger); a draft may be partial
    private async Task<Resolved>
        ResolveAsync
        (
            CreateOpeningStockDto dto,
            long ownId,
            bool posting
        )
    {
        string type =
            TypeOf(dto.PageType);

        DateOnly today =
            BusinessToday();

        DateOnly date =
            ParseDate(dto.OpeningDate, "Opening date");

        if (date > today)
        {
            throw new InvalidOperationException(
                "The opening date cannot be after today.");
        }

        var branch =
            await _context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => x.BranchId == dto.BranchId && !x.IsDeleted && x.IsActive)
                .Select(x => new { x.BranchId, x.BranchCode, x.BranchName })
                .FirstOrDefaultAsync()
            ??
            throw new InvalidOperationException(
                "Choose the branch receiving the stock.");

        if (string.IsNullOrWhiteSpace(branch.BranchCode))
        {
            throw new InvalidOperationException(
                $"Branch {branch.BranchName} has no code; the Opening Voucher No needs it.");
        }

        WarehousesEntity warehouse =
            await _context
                .Set<WarehousesEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.WarehouseId == dto.WarehouseId && !x.IsDeleted && x.IsActive)
            ??
            throw new InvalidOperationException(
                "Choose the warehouse the stock is in.");

        if (warehouse.BranchId != branch.BranchId)
        {
            throw new InvalidOperationException(
                $"Warehouse {warehouse.WarehouseName} is not in {branch.BranchName}.");
        }

        // Open financial year of the branch
        VoucherPeriodDto period =
            await _numberService.ResolvePeriodAsync(
                branch.BranchId,
                date);

        string basis =
            type != "MB" && string.Equals((dto.CostBasis ?? string.Empty).Trim(), BasisMrp, StringComparison.OrdinalIgnoreCase)
                ? BasisMrp
                : BasisCost;

        // MRP basis : the purchase VAT inside the DP comes out of the
        // cost (when VAT applies and input credit is allowed)
        VatApplicabilityDto applicability =
            await _vatApplicability.GetAsync(type, date);

        Dictionary<string, (bool Found, decimal Rate, bool Credit)> purchaseVat =
            new();

        bool vatIncluded =
            await VatIncludedAsync(type);

        if (basis == BasisMrp || vatIncluded)
        {
            foreach (string vatType in VatTypesOf(type))
            {
                var rule =
                    await _context
                        .Set<PurchaseVatEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                x.Status
                                &&
                                x.VatType == vatType
                                &&
                                x.EffectiveFrom <= date
                                &&
                                x.ValidTo >= date
                        )
                        .OrderByDescending(x => x.EffectiveFrom)
                        .Select(x => new { x.VatRate, x.InputCreditAllowed })
                        .FirstOrDefaultAsync();

                purchaseVat[vatType] =
                    rule == null
                        ? (false, 0m, true)
                        : (true, rule.VatRate, rule.InputCreditAllowed);
            }
        }

        string ledgerCode =
            Limit(dto.LedgerCode, 40);

        // Locked : always the Posting Setup ledger
        if (await LedgerLockedAsync())
        {
            ledgerCode =
                PostingLedgerCodes.TryGet(_context, PostingPurposes.OpeningStock) ?? string.Empty;

            if (ledgerCode.Length == 0)
            {
                throw new InvalidOperationException(
                    "Set the Opening Stock ledger on Settings › Account Settings › Posting Setup (the ledger is locked to it by System Configuration : Lock Opening Stock Ledger).");
            }
        }

        if (ledgerCode.Length == 0)
        {
            throw new InvalidOperationException(
                "Choose the Opening Stock ledger (credit side), or set it on Settings › Account Settings › Posting Setup.");
        }

        var ledger =
            await _context
                .Set<GeneralLedgersEntity>()
                .AsNoTracking()
                .Where(x => x.LedgerCode == ledgerCode && !x.IsDeleted)
                .Select(x => new { x.LedgerCode, x.LedgerName, x.IsActive })
                .FirstOrDefaultAsync()
            ??
            throw new InvalidOperationException(
                $"Ledger {ledgerCode} was not found.");

        if (!ledger.IsActive)
        {
            throw new InvalidOperationException(
                $"Ledger {ledger.LedgerName} is inactive.");
        }

        List<CreateOpeningStockLineDto> inputs =
            dto.Lines ?? new List<CreateOpeningStockLineDto>();

        if (inputs.Count == 0)
        {
            throw new InvalidOperationException(
                "Add at least one product.");
        }

        if (inputs.Count > MaxLines)
        {
            throw new InvalidOperationException(
                $"An opening stock can have at most {MaxLines} lines. Split it into two documents.");
        }

        if (inputs.GroupBy(x => x.ProductId).Any(g => g.Count() > 1))
        {
            throw new InvalidOperationException(
                "A product is on the list twice. Put its whole quantity on one line.");
        }

        List<long> productIds =
            inputs.Select(x => x.ProductId).ToList();

        Dictionary<long, ProductInfo> products =
            (await ProductRowsAsync(type, productIds))
                .ToDictionary(x => x.Id);

        Dictionary<long, RackManagementEntity> racks =
            new();

        if (HasShelves(type))
        {
            List<long> rackIds =
                inputs
                    .Where(x => x.RackManagementId.HasValue && x.RackManagementId.Value > 0)
                    .Select(x => x.RackManagementId!.Value)
                    .Distinct()
                    .ToList();

            racks =
                await _context
                    .Set<RackManagementEntity>()
                    .AsNoTracking()
                    .Where(x => rackIds.Contains(x.RackManagementId) && !x.IsDeleted)
                    .ToDictionaryAsync(x => x.RackManagementId);
        }

        Resolved result =
            new()
            {
                Type = type,
                Date = date,
                Warehouse = warehouse,
                BranchId = branch.BranchId,
                CostBasis = basis,
                VatIncluded = vatIncluded,
                BranchCode = (branch.BranchCode ?? string.Empty).Trim(),
                BranchName = branch.BranchName ?? period.BranchName,
                FinancialYearId = period.FinancialYearId,
                LedgerCode = ledger.LedgerCode,
                LedgerName = ledger.LedgerName
            };

        foreach (CreateOpeningStockLineDto input in inputs)
        {
            if (!products.TryGetValue(input.ProductId, out ProductInfo? product))
            {
                throw new InvalidOperationException(
                    "A product on the list was not found (deleted?). Remove it and add it again.");
            }

            if (input.Quantity <= 0)
            {
                throw new InvalidOperationException(
                    $"{product.Name} : enter the quantity.");
            }

            if (type == "MB" && input.Quantity != Math.Truncate(input.Quantity))
            {
                throw new InvalidOperationException(
                    $"{product.Name} : the quantity must be whole bikes.");
            }

            if (input.Quantity != Math.Round(input.Quantity, 2))
            {
                throw new InvalidOperationException(
                    $"{product.Name} : the quantity can have at most 2 decimals.");
            }

            if (input.Mrp < 0 || input.SalePrice < 0)
            {
                throw new InvalidOperationException(
                    $"{product.Name} : MRP and sale price cannot be below zero.");
            }

            if (input.Mrp != Math.Round(input.Mrp, 2) || input.SalePrice != Math.Round(input.SalePrice, 2))
            {
                throw new InvalidOperationException(
                    $"{product.Name} : MRP and sale price can have at most 2 decimals.");
            }

            if (input.Mrp > 0 && input.SalePrice > input.Mrp)
            {
                throw new InvalidOperationException(
                    $"{product.Name} : the sale price {input.SalePrice:N2} is above the MRP {input.Mrp:N2}.");
            }

            if (posting && (input.Mrp <= 0 || input.SalePrice <= 0))
            {
                throw new InvalidOperationException(
                    $"{product.Name} : enter the MRP and the sale price (an unpriced batch cannot be sold).");
            }

            // Purchase VAT rate of the product on the date (input
            // credit allowed; not applicable / no credit = 0)
            decimal VatRateOf()
            {
                if (!applicability.PurchaseVatApplicable)
                {
                    return 0m;
                }

                (bool found, decimal ruleRate, bool credit) =
                    purchaseVat.GetValueOrDefault(product.VatType, (false, 0m, true));

                if (!found)
                {
                    throw new InvalidOperationException(
                        $"No Purchase VAT rule for {product.VatType} on {DateText(date)}. Extend or add the rule first (the VAT is taken out of the cost).");
                }

                return credit ? ruleRate : 0m;
            }

            decimal grossCost;

            if (basis == BasisMrp)
            {
                if (input.Mrp <= 0)
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : enter the MRP (the cost is MRP less the margin).");
                }

                if (input.MarginPercent < 0 || input.MarginPercent >= 100 || input.MarginPercent != Math.Round(input.MarginPercent, 4))
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : the margin is 0 to below 100 % (at most 4 decimals).");
                }

                // DP = MRP × (1 − margin) : incl. VAT
                grossCost =
                    Math.Round(input.Mrp * (1m - input.MarginPercent / 100m), 4, MidpointRounding.AwayFromZero);
            }
            else
            {
                if (input.UnitCost != Math.Round(input.UnitCost, 4))
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : the unit cost can have at most 4 decimals.");
                }

                // Typed : incl. VAT when the type carries VAT
                grossCost =
                    input.UnitCost;
            }

            // VAT out : always on MRP basis (the DP holds it); on the
            // typed cost only when the switch carries VAT
            decimal vatRate =
                basis == BasisMrp || vatIncluded
                    ? VatRateOf()
                    : 0m;

            decimal unitCost =
                vatRate > 0
                    ? Math.Round(grossCost / (1m + vatRate / 100m), 4, MidpointRounding.AwayFromZero)
                    : grossCost;

            // Carried VAT : only with the switch ON (otherwise the VAT
            // in an MRP cost was claimed before go-live)
            if (!vatIncluded)
            {
                grossCost = unitCost;

                vatRate = 0m;
            }

            if (unitCost <= 0)
            {
                throw new InvalidOperationException(
                    $"{product.Name} : enter the unit cost (excl. VAT).");
            }

            if (posting && string.IsNullOrWhiteSpace(product.InventoryLedgerCode))
            {
                throw new InvalidOperationException(
                    $"{product.Name} has no Inventory ledger. Set it on the product first.");
            }

            RackManagementEntity? rack =
                null;

            long rackId =
                HasShelves(type) ? input.RackManagementId ?? 0 : 0;

            if (rackId > 0)
            {
                if (!racks.TryGetValue(rackId, out rack) || rack.WarehouseId != warehouse.WarehouseId)
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : the rack is not in {warehouse.WarehouseName}.");
                }

                if (rack.ShelfCount > 0 && (input.ShelfNumber < 1 || input.ShelfNumber > rack.ShelfCount))
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : rack {rack.RackCode} has shelves 1 to {rack.ShelfCount}.");
                }
            }

            result.Lines.Add(
                new ResolvedLine
                {
                    Input = input,
                    Product = product,
                    Rack = rack,
                    UnitCost = unitCost,
                    GrossUnitCost = grossCost,
                    VatRate = vatRate
                });
        }

        //=======================================================
        // Bikes (MB)
        //=======================================================

        if (type == "MB")
        {
            bool keyBattery =
                await KeyBatteryOnAsync();

            result.Units =
                (dto.Units ?? new List<OpeningStockUnitDto>())
                    .Select
                    (
                        x =>
                            new OpeningStockUnitDto
                            {
                                ProductId = x.ProductId,
                                ChassisNo = Limit(x.ChassisNo, 50).ToUpperInvariant(),
                                EngineNo = Limit(x.EngineNo, 50).ToUpperInvariant(),
                                KeyNo = keyBattery ? Limit(x.KeyNo, 50).ToUpperInvariant() : string.Empty,
                                BatteryNo = keyBattery ? Limit(x.BatteryNo, 50).ToUpperInvariant() : string.Empty
                            }
                    )
                    .Where(x => x.ChassisNo.Length + x.EngineNo.Length + x.KeyNo.Length + x.BatteryNo.Length > 0)
                    .ToList();

            if (result.Units.Any(x => !products.ContainsKey(x.ProductId) || !productIds.Contains(x.ProductId)))
            {
                throw new InvalidOperationException(
                    "A bike is on a product that is not on the list.");
            }

            foreach (ResolvedLine line in result.Lines)
            {
                List<OpeningStockUnitDto> of =
                    result.Units.Where(x => x.ProductId == line.Product.Id).ToList();

                if (of.Count > (int)line.Input.Quantity)
                {
                    throw new InvalidOperationException(
                        $"{line.Product.Name} : {of.Count} bikes entered for {Qty(line.Input.Quantity)}.");
                }

                if (of.Any(x => x.ChassisNo.Length == 0 || x.EngineNo.Length == 0))
                {
                    throw new InvalidOperationException(
                        $"{line.Product.Name} : every bike needs its Chassis No and Engine No.");
                }

                if (!posting)
                {
                    continue;
                }

                if (of.Count != (int)line.Input.Quantity)
                {
                    throw new InvalidOperationException(
                        $"{line.Product.Name} : {of.Count} of {Qty(line.Input.Quantity)} bikes entered. Enter every bike's numbers (bikes button on the line).");
                }

                if (keyBattery && of.Any(x => x.KeyNo.Length == 0 || x.BatteryNo.Length == 0))
                {
                    throw new InvalidOperationException(
                        $"{line.Product.Name} : every bike needs its Key No and Battery No (System Configuration : Key & Battery Required).");
                }
            }

            bool uniqueKey =
                keyBattery && await IsSwitchOnAsync(SwitchUniqueKeyNo, false);

            bool uniqueBattery =
                keyBattery && await IsSwitchOnAsync(SwitchUniqueBatteryNo, false);

            string? Repeat(Func<OpeningStockUnitDto, string> pick, string label)
            {
                string? value =
                    result.Units
                        .Select(pick)
                        .Where(x => x.Length > 0)
                        .GroupBy(x => x)
                        .Where(g => g.Count() > 1)
                        .Select(g => g.Key)
                        .FirstOrDefault();

                return value == null
                    ? null
                    : $"{label} {value} is entered twice.";
            }

            string? repeat =
                Repeat(x => x.ChassisNo, "Chassis No")
                ??
                Repeat(x => x.EngineNo, "Engine No")
                ??
                (uniqueKey ? Repeat(x => x.KeyNo, "Key No") : null)
                ??
                (uniqueBattery ? Repeat(x => x.BatteryNo, "Battery No") : null);

            if (repeat != null)
            {
                throw new InvalidOperationException(repeat);
            }

            List<OpeningStockUnitTakenDto> taken =
                await TakenAsync(result.Units, ownId, uniqueKey, uniqueBattery);

            if (taken.Count > 0)
            {
                throw new InvalidOperationException(
                    taken[0].Message);
            }
        }

        return result;
    }


    //===========================================================
    // Draft : header, lines and (MB) pending bikes written
    //===========================================================

    private void FillHeader
    (
        OpeningStock entity,
        Resolved input,
        string remarks
    )
    {
        entity.PageType = input.Type;
        entity.OpeningDate = input.Date;
        entity.BranchId = input.BranchId;
        entity.BranchCode = Limit(input.BranchCode, 30);
        entity.BranchName = Limit(input.BranchName, 150);
        entity.FinancialYearId = input.FinancialYearId;
        entity.WarehouseId = input.Warehouse.WarehouseId;
        entity.WarehouseName = Limit(input.Warehouse.WarehouseName, 150);
        entity.LedgerCode = input.LedgerCode;
        entity.LedgerName = Limit(input.LedgerName, 250);
        entity.Remarks = Limit(remarks, 500);
        entity.CostBasis = input.CostBasis;
        entity.VatIncluded = input.VatIncluded;
        entity.TotalQuantity = input.Lines.Sum(x => x.Input.Quantity);
        entity.TotalValue = input.Lines.Sum(x => Money(x.Input.Quantity * x.UnitCost));
        entity.TotalVat = input.Lines.Sum(x => Money(x.Input.Quantity * x.GrossUnitCost) - Money(x.Input.Quantity * x.UnitCost));
    }

    private async Task WriteLinesAsync
    (
        OpeningStock entity,
        Resolved input,
        long userId,
        DateTime now
    )
    {
        List<OpeningStockLines> old =
            await _context
                .Set<OpeningStockLines>()
                .Where(x => x.OpeningStockId == entity.OpeningStockId)
                .ToListAsync();

        _context.Set<OpeningStockLines>().RemoveRange(old);

        List<MotorBikeUnitsEntity> bikes =
            input.Type == "MB"
                ? await _context
                    .Set<MotorBikeUnitsEntity>()
                    .Where(x => x.OpeningStockId == entity.OpeningStockId && !x.IsDeleted)
                    .ToListAsync()
                : new List<MotorBikeUnitsEntity>();

        _context.Set<MotorBikeUnitsEntity>().RemoveRange(bikes);

        // Old rows go first (the same numbers may be written again)
        await _context.SaveChangesAsync();

        int lineNo = 0;

        foreach (ResolvedLine line in input.Lines)
        {
            _context.Set<OpeningStockLines>().Add(
                new OpeningStockLines
                {
                    OpeningStockId = entity.OpeningStockId,
                    LineNo = ++lineNo,
                    ProductId = line.Product.Id,
                    ProductCode = Limit(line.Product.Code, 40),
                    ProductName = Limit(line.Product.Name, 250),
                    Unit = Limit(line.Product.Unit, 30),
                    Quantity = line.Input.Quantity,
                    UnitCost = line.UnitCost,
                    LineValue = Money(line.Input.Quantity * line.UnitCost),
                    GrossUnitCost = line.GrossUnitCost,
                    VatRate = line.VatRate,
                    VatAmount = Money(line.Input.Quantity * line.GrossUnitCost) - Money(line.Input.Quantity * line.UnitCost),
                    SalePrice = line.Input.SalePrice,
                    Mrp = line.Input.Mrp,
                    MarginPercent = input.CostBasis == BasisMrp ? line.Input.MarginPercent : 0m,
                    RackManagementId = line.Rack?.RackManagementId,
                    RackCode = Limit(line.Rack?.RackCode, 50),
                    ShelfNumber = line.Rack == null ? 0 : line.Input.ShelfNumber,
                    SaveAsDefault = line.Rack != null && line.Input.SaveAsDefault,
                    ShortNotes = Limit(line.Input.ShortNotes, 200),
                    BatchNo = string.Empty
                });
        }

        if (input.Type != "MB")
        {
            return;
        }

        Dictionary<long, ResolvedLine> lines =
            input.Lines.ToDictionary(x => x.Product.Id);

        foreach (OpeningStockUnitDto unit in input.Units)
        {
            ResolvedLine line =
                lines[unit.ProductId];

            _context.Set<MotorBikeUnitsEntity>().Add(
                new MotorBikeUnitsEntity
                {
                    ProductId = line.Product.Id,
                    ProductCode = line.Product.Code,
                    ProductName = Limit(line.Product.Name, 200),
                    ChassisNo = unit.ChassisNo,
                    EngineNo = unit.EngineNo,
                    KeyNo = unit.KeyNo,
                    BatteryNo = unit.BatteryNo,
                    BranchId = entity.BranchId,
                    PurchaseId = 0,
                    PurchaseLineId = 0,
                    PurchaseNo = entity.OpeningNo,
                    SupplierCode = string.Empty,
                    UnitCost = line.UnitCost,
                    Status = UnitPending,
                    OpeningStockId = entity.OpeningStockId,
                    IsDeleted = false,
                    CreatedBy = userId,
                    CreatedDate = now
                });
        }
    }


    public async Task<OpeningStockSavedDto>
        CreateAsync
        (
            CreateOpeningStockDto dto,
            long userId
        )
    {
        Resolved input =
            await ResolveAsync(dto, 0, false);

        DateTime now =
            DateTime.UtcNow;

        OpeningStock entity =
            new()
            {
                Status = StatusDraft,
                CancelReason = string.Empty,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = now
            };

        FillHeader(entity, input, dto.Remarks);

        await InTransactionAsync(
            async () =>
            {
                // One writer per branch + type for the number
                int lockKey =
                    (int)(entity.BranchId * 4 + Array.IndexOf(new[] { "MB", "SP", "AC" }, input.Type));

                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT pg_advisory_xact_lock({0}, {1})",
                    NumberLockClass,
                    lockKey);

                int last =
                    await _context
                        .Set<OpeningStock>()
                        .Where(x => x.PageType == input.Type && x.BranchId == entity.BranchId)
                        .Select(x => (int?)x.SequenceNo)
                        .MaxAsync()
                    ??
                    0;

                entity.SequenceNo =
                    last + 1;

                entity.OpeningNo =
                    Limit(NumberOf(input.BranchCode, input.Type, entity.SequenceNo), 30);

                _context.Set<OpeningStock>().Add(entity);

                await _context.SaveChangesAsync();

                await WriteLinesAsync(entity, input, userId, now);

                AddHistory(entity, "Create", "Saved", userId, now);

                await _context.SaveChangesAsync();
            });

        return new OpeningStockSavedDto
        {
            OpeningStockId = entity.OpeningStockId,
            OpeningNo = entity.OpeningNo,
            Status = entity.Status
        };
    }


    public async Task<OpeningStockSavedDto>
        UpdateAsync
        (
            long id,
            UpdateOpeningStockDto dto,
            long userId
        )
    {
        DateTime now =
            DateTime.UtcNow;

        OpeningStock entity =
            await _context
                .Set<OpeningStock>()
                .FirstOrDefaultAsync(x => x.OpeningStockId == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException("Opening stock not found.");

        if (entity.Status != StatusDraft)
        {
            throw new InvalidOperationException(
                $"Opening stock {entity.OpeningNo} is {entity.Status}; only a draft can be changed.");
        }

        // The type and branch never change (the number carries them)
        dto.PageType = entity.PageType;

        dto.BranchId = entity.BranchId;

        Resolved input =
            await ResolveAsync(dto, id, false);

        await InTransactionAsync(
            async () =>
            {
                FillHeader(entity, input, dto.Remarks);

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                await WriteLinesAsync(entity, input, userId, now);

                AddHistory(entity, "Update", "Updated", userId, now);

                await _context.SaveChangesAsync();
            });

        return new OpeningStockSavedDto
        {
            OpeningStockId = entity.OpeningStockId,
            OpeningNo = entity.OpeningNo,
            Status = entity.Status
        };
    }


    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        DateTime now =
            DateTime.UtcNow;

        OpeningStock entity =
            await _context
                .Set<OpeningStock>()
                .FirstOrDefaultAsync(x => x.OpeningStockId == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException("Opening stock not found.");

        if (entity.Status != StatusDraft)
        {
            throw new InvalidOperationException(
                $"Opening stock {entity.OpeningNo} is {entity.Status}; only a draft can be deleted (cancel a posted one).");
        }

        await InTransactionAsync(
            async () =>
            {
                List<MotorBikeUnitsEntity> bikes =
                    await _context
                        .Set<MotorBikeUnitsEntity>()
                        .Where(x => x.OpeningStockId == id && !x.IsDeleted)
                        .ToListAsync();

                foreach (MotorBikeUnitsEntity bike in bikes)
                {
                    bike.IsDeleted = true;
                    bike.DeletedBy = userId;
                    bike.DeletedDate = now;
                }

                entity.IsDeleted = true;

                entity.DeletedBy = userId;

                entity.DeletedDate = now;

                AddHistory(entity, "Delete", "Deleted", userId, now);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Post : batches, movements, journal, bikes, shelves
    //===========================================================

    public async Task<OpeningStockSavedDto>
        PostAsync
        (
            long id,
            long userId
        )
    {
        DateTime now =
            DateTime.UtcNow;

        OpeningStock found =
            await _context
                .Set<OpeningStock>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OpeningStockId == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException("Opening stock not found.");

        if (found.Status != StatusDraft)
        {
            throw new InvalidOperationException(
                $"Opening stock {found.OpeningNo} is {found.Status}; only a draft can be posted.");
        }

        // The saved draft, checked again with the full rules
        OpeningStockDto saved =
            await GetByIdAsync(id)
            ??
            throw new KeyNotFoundException("Opening stock not found.");

        CreateOpeningStockDto again =
            new()
            {
                PageType = saved.PageType,
                OpeningDate = saved.OpeningDate,
                BranchId = saved.BranchId,
                CostBasis = saved.CostBasis,
                WarehouseId = saved.WarehouseId,
                LedgerCode = saved.LedgerCode,
                Remarks = saved.Remarks,
                Lines =
                    saved.Lines
                        .Select
                        (
                            x =>
                                new CreateOpeningStockLineDto
                                {
                                    ProductId = x.ProductId,
                                    Quantity = x.Quantity,
                                    // The cost as typed : the saved line keeps
                                    // the net cost in UnitCost and the typed
                                    // (incl. VAT) cost in GrossUnitCost. Sending
                                    // the net one took the VAT out a second time.
                                    UnitCost = x.GrossUnitCost > 0 ? x.GrossUnitCost : x.UnitCost,
                                    SalePrice = x.SalePrice,
                                    Mrp = x.Mrp,
                                    MarginPercent = x.MarginPercent,
                                    RackManagementId = x.RackManagementId,
                                    ShelfNumber = x.ShelfNumber,
                                    SaveAsDefault = x.SaveAsDefault,
                                    ShortNotes = x.ShortNotes
                                }
                        )
                        .ToList(),
                Units = saved.Units
            };

        Resolved input =
            await ResolveAsync(again, id, true);

        string type =
            input.Type;

        string prefix =
            PrefixOf(type);

        await InTransactionAsync(
            async () =>
            {
                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT 1 FROM \"OpeningStock\" WHERE \"OpeningStockId\" = {0} FOR UPDATE",
                    id);

                OpeningStock entity =
                    await _context
                        .Set<OpeningStock>()
                        .FirstAsync(x => x.OpeningStockId == id);

                if (entity.Status != StatusDraft || entity.IsDeleted)
                {
                    throw new InvalidOperationException(
                        $"Opening stock {entity.OpeningNo} was changed meanwhile ({entity.Status}). Open it again.");
                }

                List<OpeningStockLines> lines =
                    await _context
                        .Set<OpeningStockLines>()
                        .Where(x => x.OpeningStockId == id)
                        .OrderBy(x => x.LineNo)
                        .ToListAsync();

                Dictionary<long, ResolvedLine> resolved =
                    input.Lines.ToDictionary(x => x.Product.Id);

                // Cost as checked now (MRP basis : today's VAT rule)
                foreach (OpeningStockLines line in lines)
                {
                    ResolvedLine now =
                        resolved[line.ProductId];

                    line.UnitCost = now.UnitCost;

                    line.LineValue = Money(line.Quantity * now.UnitCost);

                    line.GrossUnitCost = now.GrossUnitCost;

                    line.VatRate = now.VatRate;

                    line.VatAmount = Money(line.Quantity * now.GrossUnitCost) - line.LineValue;
                }

                entity.VatIncluded =
                    input.VatIncluded;

                entity.TotalValue =
                    lines.Sum(x => x.LineValue);

                entity.TotalVat =
                    lines.Sum(x => x.VatAmount);

                // VAT Current Account of each VAT type (Posting Setup)
                Dictionary<string, string> vatLedgers =
                    new();

                string VatLedgerOf(string vatType)
                {
                    if (!vatLedgers.TryGetValue(vatType, out string? code))
                    {
                        code =
                            PostingLedgerCodes.Get(
                                _context,
                                PostingPurposes.VatForVatType(vatType));

                        vatLedgers[vatType] = code;
                    }

                    return code;
                }

                string narration =
                    Limit(
                        $"Opening stock {entity.OpeningNo} : {TitleOf(type)} in {entity.WarehouseName}"
                        + (entity.Remarks.Length > 0 ? $", {entity.Remarks}" : string.Empty),
                        500);

                //===================================================
                // Journal : Dr Inventory (per ledger) / Cr Opening
                //===================================================

                List<VoucherPostingLine> journal =
                    lines
                        .Where(x => x.LineValue > 0)
                        .GroupBy(x => resolved[x.ProductId].Product.InventoryLedgerCode)
                        .Select
                        (
                            g =>
                                new VoucherPostingLine
                                {
                                    GroupNo = 1,
                                    LedgerCode = g.Key,
                                    Debit = g.Sum(x => x.LineValue),
                                    Credit = 0m,
                                    Narration =
                                        Limit(
                                            g.Count() == 1
                                                ? $"{g.First().ProductName} : {Qty(g.First().Quantity)} {g.First().Unit}"
                                                : $"{g.Count()} products : {Qty(g.Sum(x => x.Quantity))} units",
                                            500)
                                }
                        )
                        .ToList();

                decimal total =
                    journal.Sum(x => x.Debit);

                if (total <= 0)
                {
                    throw new InvalidOperationException(
                        "The opening stock has no value to post.");
                }

                // Unclaimed VAT carried in : Dr VAT Current Account
                List<VoucherPostingLine> vatLines =
                    lines
                        .Where(x => x.VatAmount > 0)
                        .GroupBy(x => VatLedgerOf(resolved[x.ProductId].Product.VatType))
                        .Select
                        (
                            g =>
                                new VoucherPostingLine
                                {
                                    GroupNo = 1,
                                    LedgerCode = g.Key,
                                    Debit = g.Sum(x => x.VatAmount),
                                    Credit = 0m,
                                    Narration = "Unclaimed input VAT"
                                }
                        )
                        .ToList();

                journal.AddRange(vatLines);

                total +=
                    vatLines.Sum(x => x.Debit);

                journal.Add(
                    new VoucherPostingLine
                    {
                        GroupNo = 1,
                        LedgerCode = entity.LedgerCode,
                        Debit = 0m,
                        Credit = total,
                        Narration = narration
                    });

                // VAT register : opening input credit, one row per line
                foreach (OpeningStockLines line in lines.Where(x => x.VatAmount > 0))
                {
                    ProductInfo product =
                        resolved[line.ProductId].Product;

                    _context.Set<VatRegisterEntity>().Add(
                        new VatRegisterEntity
                        {
                            Direction = "Purchase",
                            DocumentType = prefix,
                            DocumentId = entity.OpeningStockId,
                            DocumentLineId = line.OpeningStockLineId,
                            DocumentNo = entity.OpeningNo,
                            DocumentDate = entity.OpeningDate,
                            MushakNo = string.Empty,
                            MushakDate = null,
                            PartyType = "Opening",
                            PartyCode = string.Empty,
                            PartyName = "Opening Stock",
                            PartyBin = string.Empty,
                            BranchId = entity.BranchId,
                            ProductType = type,
                            ProductId = line.ProductId,
                            ProductCode = line.ProductCode,
                            ProductName = Limit(line.ProductName, 250),
                            Quantity = line.Quantity,
                            TaxableValue = line.LineValue,
                            VatRate = line.VatRate,
                            VatAmount = line.VatAmount,
                            VatClaimable = line.VatAmount,
                            VatLedgerCode = VatLedgerOf(product.VatType),
                            IsReversal = false,
                            CreatedBy = userId,
                            CreatedDate = now
                        });
                }

                // The journal has its own voucher number (type, branch,
                // month : OPMB-010101-2627-11-00001); the Opening
                // Voucher No is its reference
                VoucherNumberDto journalNo =
                    await _numberService.NextAsync(
                        prefix,
                        entity.BranchId,
                        entity.OpeningDate);

                entity.JournalNo =
                    journalNo.VoucherNo;

                await _postingService.PostAsync(
                    new VoucherPostingRequest
                    {
                        VoucherType = prefix,
                        VoucherId = entity.OpeningStockId,
                        VoucherNo = entity.JournalNo,
                        VoucherDate = entity.OpeningDate,
                        BranchId = entity.BranchId,
                        ReferenceNo = entity.OpeningNo,
                        Narration = narration,
                        Lines = journal
                    },
                    userId);

                //===================================================
                // Batches (one per line), On Hand at once
                //===================================================

                List<(OpeningStockLines Line, StockBatchesEntity Batch)> batches =
                    new();

                foreach (OpeningStockLines line in lines)
                {
                    StockBatchesEntity batch =
                        new()
                        {
                            BatchNo = Limit($"{entity.OpeningNo}-{line.LineNo:D3}", 40),
                            ProductType = type,
                            ProductId = line.ProductId,
                            ProductCode = line.ProductCode,
                            ProductName = Limit(line.ProductName, 250),
                            InventoryLedgerCode = resolved[line.ProductId].Product.InventoryLedgerCode,
                            SourceType = SourceOpening,
                            SourceId = entity.OpeningStockId,
                            SourceLineId = line.OpeningStockLineId,
                            SourceNo = entity.OpeningNo,
                            SourceDate = entity.OpeningDate,
                            SupplierCode = string.Empty,
                            BranchId = entity.BranchId,
                            Quantity = line.Quantity,
                            UnitCost = line.UnitCost,
                            TotalValue = line.LineValue,
                            QuantityInTransit = 0m,
                            QuantityOnHand = line.Quantity,
                            QuantityOut = 0m,
                            RemainingValue = line.LineValue,
                            SalePrice = line.SalePrice,
                            Mrp = line.Mrp,
                            Status = BucketOnHand,
                            CreatedBy = userId,
                            CreatedDate = now
                        };

                    _context.Set<StockBatchesEntity>().Add(batch);

                    batches.Add((line, batch));
                }

                await _context.SaveChangesAsync();

                foreach ((OpeningStockLines line, StockBatchesEntity batch) in batches)
                {
                    line.StockBatchId = batch.StockBatchId;

                    line.BatchNo = batch.BatchNo;

                    _context.Set<StockMovementsEntity>().Add(
                        new StockMovementsEntity
                        {
                            StockBatchId = batch.StockBatchId,
                            ProductType = type,
                            ProductId = line.ProductId,
                            BranchId = entity.BranchId,
                            WarehouseId = entity.WarehouseId,
                            Bucket = BucketOnHand,
                            MovementType = MoveOpening,
                            QuantityIn = line.Quantity,
                            QuantityOut = 0m,
                            UnitCost = line.UnitCost,
                            Value = line.LineValue,
                            DocumentType = prefix,
                            DocumentId = entity.OpeningStockId,
                            DocumentLineId = line.OpeningStockLineId,
                            DocumentNo = entity.OpeningNo,
                            DocumentDate = entity.OpeningDate,
                            IsReversal = false,
                            Narration = Limit(narration, 300),
                            CreatedBy = userId,
                            CreatedDate = now
                        });

                    if (line.RackManagementId.HasValue && line.SaveAsDefault)
                    {
                        await SaveShelfAsync(type, line.ProductId, entity.WarehouseId, line.RackManagementId.Value, line.ShelfNumber, userId, now);
                    }
                }

                //===================================================
                // Bikes : In Stock in the warehouse
                //===================================================

                if (type == "MB")
                {
                    List<MotorBikeUnitsEntity> bikes =
                        await _context
                            .Set<MotorBikeUnitsEntity>()
                            .Where(x => x.OpeningStockId == id && !x.IsDeleted)
                            .ToListAsync();

                    foreach (MotorBikeUnitsEntity bike in bikes)
                    {
                        OpeningStockLines? line =
                            lines.FirstOrDefault(x => x.ProductId == bike.ProductId);

                        bike.Status = UnitInStock;
                        bike.StockInDate = entity.OpeningDate;
                        bike.WarehouseId = entity.WarehouseId;
                        bike.BranchId = entity.BranchId;
                        bike.PurchaseNo = entity.OpeningNo;
                        bike.UnitCost = line?.UnitCost ?? bike.UnitCost;
                        bike.ModifiedBy = userId;
                        bike.ModifiedDate = now;
                    }
                }

                entity.Status = StatusPosted;

                entity.PostedBy = userId;

                entity.PostedDate = now;

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                AddHistory(entity, "Post", "Posted", userId, now);

                await _context.SaveChangesAsync();
            });

        return new OpeningStockSavedDto
        {
            OpeningStockId = id,
            OpeningNo = found.OpeningNo,
            Status = StatusPosted
        };
    }


    // The product's default rack · shelf in the warehouse
    private async Task SaveShelfAsync
    (
        string type,
        long productId,
        long warehouseId,
        long rackId,
        int shelf,
        long userId,
        DateTime now
    )
    {
        if (type == "SP")
        {
            SparePartLocationsEntity? row =
                await _context
                    .Set<SparePartLocationsEntity>()
                    .FirstOrDefaultAsync(x => x.SparePartId == productId && x.WarehouseId == warehouseId);

            if (row == null)
            {
                _context.Set<SparePartLocationsEntity>().Add(
                    new SparePartLocationsEntity
                    {
                        SparePartId = productId,
                        WarehouseId = warehouseId,
                        RackManagementId = rackId,
                        ShelfNumber = shelf,
                        CreatedBy = userId,
                        CreatedDate = now
                    });
            }
            else
            {
                row.RackManagementId = rackId;

                row.ShelfNumber = shelf;
            }

            return;
        }

        if (type == "AC")
        {
            AccessoryLocationsEntity? row =
                await _context
                    .Set<AccessoryLocationsEntity>()
                    .FirstOrDefaultAsync(x => x.AccessoryId == productId && x.WarehouseId == warehouseId);

            if (row == null)
            {
                _context.Set<AccessoryLocationsEntity>().Add(
                    new AccessoryLocationsEntity
                    {
                        AccessoryId = productId,
                        WarehouseId = warehouseId,
                        RackManagementId = rackId,
                        ShelfNumber = shelf,
                        CreatedBy = userId,
                        CreatedDate = now
                    });
            }
            else
            {
                row.RackManagementId = rackId;

                row.ShelfNumber = shelf;
            }
        }
    }


    //===========================================================
    // Cancel : while every batch is untouched
    //===========================================================

    public async Task
        CancelAsync
        (
            long id,
            CancelOpeningStockDto dto,
            long userId
        )
    {
        string reason =
            Limit(dto?.Reason, 500);

        if (reason.Length == 0)
        {
            throw new InvalidOperationException(
                "A reason is required to cancel an opening stock.");
        }

        DateTime now =
            DateTime.UtcNow;

        DateOnly today =
            BusinessToday();

        await InTransactionAsync(
            async () =>
            {
                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT 1 FROM \"OpeningStock\" WHERE \"OpeningStockId\" = {0} FOR UPDATE",
                    id);

                OpeningStock entity =
                    await _context
                        .Set<OpeningStock>()
                        .FirstOrDefaultAsync(x => x.OpeningStockId == id && !x.IsDeleted)
                    ??
                    throw new KeyNotFoundException("Opening stock not found.");

                if (entity.Status != StatusPosted)
                {
                    throw new InvalidOperationException(
                        $"Opening stock {entity.OpeningNo} is {entity.Status}; only a posted one can be cancelled (delete a draft).");
                }

                string prefix =
                    PrefixOf(entity.PageType);

                List<OpeningStockLines> lines =
                    await _context
                        .Set<OpeningStockLines>()
                        .Where(x => x.OpeningStockId == id)
                        .ToListAsync();

                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT 1 FROM \"StockBatches\" WHERE \"SourceType\" = {0} AND \"SourceId\" = {1} FOR UPDATE",
                    SourceOpening,
                    id);

                Dictionary<long, StockBatchesEntity> batches =
                    await _context
                        .Set<StockBatchesEntity>()
                        .Where(x => x.SourceType == SourceOpening && x.SourceId == id)
                        .ToDictionaryAsync(x => x.SourceLineId);

                List<long> batchIds =
                    batches.Values.Select(x => x.StockBatchId).ToList();

                // On hand of each batch in this warehouse
                Dictionary<long, decimal> onHand =
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
                                x.WarehouseId == entity.WarehouseId
                        )
                        .GroupBy(x => x.StockBatchId)
                        .Select(g => new { g.Key, Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut) })
                        .ToDictionaryAsync(x => x.Key, x => x.Quantity);

                foreach (OpeningStockLines line in lines)
                {
                    if (!batches.TryGetValue(line.OpeningStockLineId, out StockBatchesEntity? batch))
                    {
                        throw new InvalidOperationException(
                            $"{line.ProductName} : its stock batch was not found.");
                    }

                    decimal held =
                        onHand.GetValueOrDefault(batch.StockBatchId);

                    if (batch.QuantityOut > 0 || held < line.Quantity || batch.QuantityOnHand < line.Quantity)
                    {
                        throw new InvalidOperationException(
                            $"{line.ProductName} : only {Qty(Math.Max(0m, held))} of the {Qty(line.Quantity)} is still in {entity.WarehouseName}; the rest was sold, moved or returned. The opening stock cannot be cancelled.");
                    }
                }

                List<MotorBikeUnitsEntity> bikes =
                    new();

                if (entity.PageType == "MB")
                {
                    bikes =
                        await _context
                            .Set<MotorBikeUnitsEntity>()
                            .Where(x => x.OpeningStockId == id && !x.IsDeleted)
                            .ToListAsync();

                    MotorBikeUnitsEntity? gone =
                        bikes.FirstOrDefault(x => x.Status != UnitInStock || x.WarehouseId != entity.WarehouseId);

                    if (gone != null)
                    {
                        throw new InvalidOperationException(
                            $"Bike {gone.ChassisNo} is no longer in stock in {entity.WarehouseName}. The opening stock cannot be cancelled.");
                    }
                }

                // VAT register : the opening credit reversed today
                List<VatRegisterEntity> vatRows =
                    await _context
                        .Set<VatRegisterEntity>()
                        .AsNoTracking()
                        .Where(x => x.DocumentType == prefix && x.DocumentId == entity.OpeningStockId && !x.IsReversal)
                        .ToListAsync();

                foreach (VatRegisterEntity row in vatRows)
                {
                    row.VatRegisterId = 0;
                    row.DocumentDate = today;
                    row.IsReversal = true;
                    row.CreatedBy = userId;
                    row.CreatedDate = now;

                    _context.Set<VatRegisterEntity>().Add(row);
                }

                await _postingService.ReverseAsync(
                    string.IsNullOrWhiteSpace(entity.JournalNo) ? entity.OpeningNo : entity.JournalNo,
                    today,
                    reason,
                    userId);

                string narration =
                    Limit($"Opening stock {entity.OpeningNo} cancelled : {reason}", 300);

                foreach (OpeningStockLines line in lines)
                {
                    StockBatchesEntity batch =
                        batches[line.OpeningStockLineId];

                    _context.Set<StockMovementsEntity>().Add(
                        new StockMovementsEntity
                        {
                            StockBatchId = batch.StockBatchId,
                            ProductType = batch.ProductType,
                            ProductId = batch.ProductId,
                            BranchId = entity.BranchId,
                            WarehouseId = entity.WarehouseId,
                            Bucket = BucketOnHand,
                            MovementType = MoveOpeningCancel,
                            QuantityIn = 0m,
                            QuantityOut = line.Quantity,
                            UnitCost = batch.UnitCost,
                            Value = line.LineValue,
                            DocumentType = prefix,
                            DocumentId = entity.OpeningStockId,
                            DocumentLineId = line.OpeningStockLineId,
                            DocumentNo = entity.OpeningNo,
                            DocumentDate = today,
                            IsReversal = true,
                            Narration = narration,
                            CreatedBy = userId,
                            CreatedDate = now
                        });

                    batch.QuantityOnHand = 0m;

                    batch.RemainingValue = 0m;

                    batch.Status = BatchCancelled;

                    batch.ModifiedBy = userId;

                    batch.ModifiedDate = now;
                }

                foreach (MotorBikeUnitsEntity bike in bikes)
                {
                    bike.IsDeleted = true;
                    bike.DeletedBy = userId;
                    bike.DeletedDate = now;
                    bike.ModifiedBy = userId;
                    bike.ModifiedDate = now;
                }

                entity.Status = StatusCancelled;

                entity.CancelReason = reason;

                entity.CancelledBy = userId;

                entity.CancelledDate = now;

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                AddHistory(entity, "Cancel", "Cancelled", userId, now, $"Reason : {reason}");

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Restore : the most recently deleted draft, with its bikes
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        OpeningStock? entity =
            await _context
                .Set<OpeningStock>()
                .Where(x => x.IsDeleted && x.Status == StatusDraft)
                .OrderByDescending(x => x.DeletedDate)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        DateTime now =
            DateTime.UtcNow;

        // Bikes deleted with it (by the same delete)
        List<MotorBikeUnitsEntity> bikes =
            entity.PageType == "MB"
                ? await _context
                    .Set<MotorBikeUnitsEntity>()
                    .Where(x => x.OpeningStockId == entity.OpeningStockId && x.IsDeleted && x.DeletedDate == entity.DeletedDate)
                    .ToListAsync()
                : new List<MotorBikeUnitsEntity>();

        if (bikes.Count > 0)
        {
            List<OpeningStockUnitTakenDto> taken =
                await TakenAsync(
                    bikes
                        .Select
                        (
                            x =>
                                new OpeningStockUnitDto
                                {
                                    ProductId = x.ProductId,
                                    ChassisNo = x.ChassisNo,
                                    EngineNo = x.EngineNo
                                }
                        )
                        .ToList(),
                    entity.OpeningStockId,
                    false,
                    false);

            if (taken.Count > 0)
            {
                throw new InvalidOperationException(
                    $"Draft {entity.OpeningNo} cannot be restored : {taken[0].Message}");
            }
        }

        await InTransactionAsync(
            async () =>
            {
                foreach (MotorBikeUnitsEntity bike in bikes)
                {
                    bike.IsDeleted = false;
                    bike.DeletedBy = null;
                    bike.DeletedDate = null;
                    bike.ModifiedBy = userId;
                    bike.ModifiedDate = now;
                }

                entity.IsDeleted = false;

                entity.DeletedBy = null;

                entity.DeletedDate = null;

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                AddHistory(entity, "Restore", "Restored", userId, now);

                await _context.SaveChangesAsync();
            });

        return true;
    }


    //===========================================================
    // History : every opening stock / one of them
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
}
