//===============================================================
// Namespaces
//===============================================================

using AppCore.Infrastructure.Persistence.Paging;
using AppCore.Application.Common.Paging;
using System.Globalization;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.InventoryManagement.ProductReceiving;
using AppCore.Application.Platform.Accounting;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.InventoryManagement.ProductReceiving;
using AppCore.Domain.Entities.Procurement.Shared;
using AppCore.Domain.Platform.Accounting;
using AppCore.Infrastructure.CodeMaster;
using AppCore.Infrastructure.Persistence;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;

using WarehousesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Warehouses;

using RackManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.RackManagement;

using SparePartLocationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SparePartLocations;

using AccessoryLocationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.AccessoryLocations;

using MotorBikeUnitsEntity =
    AppCore.Domain.Entities.Procurement.MotorBikePurchase.MotorBikeUnits;

using StockBatchesEntity =
    AppCore.Domain.Platform.Inventory.StockBatches;

using BinOccupancy =
    AppCore.Infrastructure.Configurations.Settings.ProductSettings.BinOccupancy;

using RackLabels =
    AppCore.Infrastructure.Repositories.Settings.ProductSettings.RackLabels;

using RackMapDto =
    AppCore.Application.Settings.ProductSettings.RackMapDto;

using RackMapShelfDto =
    AppCore.Application.Settings.ProductSettings.RackMapShelfDto;

using RackMapBinDto =
    AppCore.Application.Settings.ProductSettings.RackMapBinDto;

using StockMovementsEntity =
    AppCore.Domain.Platform.Inventory.StockMovements;

using PurchaseAccessoryDuesEngine =
    AppCore.Infrastructure.Repositories.Procurement.MotorBikePurchase.PurchaseAccessoryDuesEngine;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InventoryManagement.ProductReceiving;


//===============================================================
// Product Receiving Repository : one engine for Motor Bike /
// Spare Parts & Lubricants / Accessories Receiving. Each page is
// a small class that gives its tables (THeader / TLine), its
// purchase tables (TPurchase / TPurchaseLine) and its
// ReceivingPage (type, prefix, switch codes).
//
// Create (posted on save) :
//   one posted purchase invoice of the branch with stock in
//   transit; per line the quantity received now (never above
//   what is still in transit) and, for spare parts / accessories,
//   the rack · shelf. Motor bikes : one row per bike (chassis /
//   engine unique system-wide; key / battery as the Purchases - MB
//   switches say); bikes already entered on the purchase are
//   matched by chassis.
//   Stock : per line two movements on the line's batch, at its
//   exact cost : In Transit out, On Hand in (warehouse). Batch
//   quantities follow. No accounting entry.
//   The purchase is "under receiving" until nothing of it is in
//   transit (then StockedIn).
// Cancel : while every received unit is still on hand in that
//   warehouse (nothing sold, moved or returned) : reverse
//   movements, batches back in transit, bikes taken off.
//===============================================================

public abstract class ReceivingRepositoryBase<THeader, TLine, TPurchase, TPurchaseLine>
    : IReceivingRepository
    where THeader : ReceivingHeader, new()
    where TLine : ReceivingLine, new()
    where TPurchase : PurchaseHeader
    where TPurchaseLine : PurchaseLine
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Inventory Management";

    private const string EntityName =
        "Receiving";

    private const string DateFormat =
        "yyyy-MM-dd";

    public const string StatusPosted = "Posted";

    public const string StatusCancelled = "Cancelled";

    // Purchase status that can be received
    private const string PurchasePosted = "Posted";

    // Stock batch statuses / buckets / movement types
    private const string BatchInTransit = "InTransit";

    private const string BatchOnHand = "OnHand";

    private const string BatchClosed = "Closed";

    private const string SourcePurchase = "Purchase";

    private const string MoveReceive = "Receive";

    private const string MoveReceiveCancel = "ReceiveCancel";

    // Motor bike unit status
    private const string UnitInStock = "InStock";

    private const string NotReceived = "Not Received";

    private const string PartlyReceived = "Partly Received";

    // MB : every bike received, free accessories still due
    private const string AccessoriesPending = "Received, Accessories Pending";

    private const int MaxLines = 500;


    //===========================================================
    // This page : type, prefix, tables, switch codes
    //===========================================================

    protected abstract ReceivingPage Page { get; }


    //===========================================================
    // Bins (Rack -> Shelf -> Bin; one live item per bin across
    // spare parts and accessories). The product's OWN current bin
    // counts as free for it. null = OK, else the reason.
    //===========================================================

    private static string HolderTypeOf(string type) =>
        type == "AC"
            ? BinOccupancy.AccessoryType
            : BinOccupancy.SparePartType;

    private static string? BinProblem
    (
        RackMapDto? rack,
        long warehouseId,
        int shelf,
        int bin,
        string type,
        long productId
    )
    {
        RackMapBinDto? cell =
            rack?.Shelves
                .FirstOrDefault(x => x.ShelfNumber == shelf)?
                .Bins
                .FirstOrDefault(x => x.BinNumber == bin);

        if (rack != null
            && rack.WarehouseId == warehouseId
            && cell != null
            && cell.Holder != null
            && cell.Holder.ItemType == HolderTypeOf(type)
            && cell.Holder.ItemId == productId)
        {
            return null;
        }

        return BinOccupancy.CheckBin(rack, warehouseId, shelf, bin);
    }

    // 0 / missing with a rack and shelf = bin 1 (old clients)
    private static int BinOf(int bin) =>
        bin > 0 ? bin : 1;




    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IVoucherNumberService _numberService;


    //===========================================================
    // Constructor
    //===========================================================

    protected ReceivingRepositoryBase(
        AppDbContext context,
        IVoucherNumberService numberService)
    {
        _context = context;

        _numberService = numberService;
    }


    //===========================================================
    // Helpers
    //===========================================================

    private void RequirePage
    (
        string? pageType
    )
    {
        if (!string.Equals((pageType ?? string.Empty).Trim(), Page.PageType, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"This is the {Page.Title} page.");
        }
    }

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

    // ON / OFF; fallback when the switch does not exist
    private async Task<bool>
        IsSwitchOnAsync
        (
            string? code,
            bool fallback
        )
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return fallback;
        }

        bool? value =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => x.ConfigurationCode == code && !x.IsDeleted)
                .Select(x => (bool?)x.IsEnabled)
                .FirstOrDefaultAsync();

        return value ?? fallback;
    }

    // ON / OFF and the whole-number Value (0 = none); missing
    // switch = (fallback, 0)
    private async Task<(bool IsOn, int Number)>
        SwitchStateAsync
        (
            string? code,
            bool fallback
        )
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return (fallback, 0);
        }

        var row =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => x.ConfigurationCode == code && !x.IsDeleted)
                .Select(x => new { x.IsEnabled, x.Value })
                .FirstOrDefaultAsync();

        if (row == null)
        {
            return (fallback, 0);
        }

        int number =
            int.TryParse((row.Value ?? string.Empty).Trim(), out int parsed) && parsed > 0
                ? parsed
                : 0;

        return (row.IsEnabled, number);
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
    // History
    //===========================================================

    private void AddHistory
    (
        THeader entity,
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
                EntityId = entity.ReceivingId,
                ActivityType = activityType,
                ActivityTitle = $"Receiving {verb}",
                ActivityDescription =
                    $"Receiving {entity.ReceivingNo} (purchase {entity.PurchaseNo}, {Qty(entity.TotalQuantity)} received into {entity.WarehouseName}) {verb.ToLowerInvariant()}.{(string.IsNullOrWhiteSpace(extra) ? string.Empty : " " + extra)}",
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = now
            });
    }


    //===========================================================
    // Get All (one page; newest first)
    //===========================================================

    public async Task<List<ReceivingDto>>
        GetAllAsync
        (
            string pageType
        )
    {
        RequirePage(pageType);

        List<THeader> rows =
            await _context
                .Set<THeader>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.PageType == Page.PageType)
                .OrderByDescending(x => x.ReceivingDate)
                .ThenByDescending(x => x.ReceivingId)
                .ToListAsync();

        return await MapListRowsAsync(rows);
    }


    //===========================================================
    // List rows : one row per document (shared by the full list
    // and the paged list)
    //===========================================================

    private async Task<List<ReceivingDto>>
        MapListRowsAsync
        (
            List<THeader> rows
        )
    {

        List<long> ids =
            rows.Select(x => x.ReceivingId).ToList();

        Dictionary<long, int> counts =
            await _context
                .Set<TLine>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.ReceivingId))
                .GroupBy(x => x.ReceivingId)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count);

        return rows
            .Select
            (
                x =>
                {
                    ReceivingDto dto =
                        ToDto(x);

                    dto.LineCount = counts.GetValueOrDefault(x.ReceivingId);

                    return dto;
                }
            )
            .ToList();
    }


    //===========================================================
    // Get By Id : header, lines, bikes
    //===========================================================

    public async Task<ReceivingDto?>
        GetByIdAsync
        (
            long id
        )
    {
        THeader? entity =
            await _context
                .Set<THeader>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ReceivingId == id && !x.IsDeleted);

        if (entity == null)
        {
            return null;
        }

        ReceivingDto dto =
            ToDto(entity);

        dto.Lines =
            await _context
                .Set<TLine>()
                .AsNoTracking()
                .Where(x => x.ReceivingId == id)
                .OrderBy(x => x.LineNo)
                .Select
                (
                    x =>
                        new ReceivingLineDto
                        {
                            ReceivingLineId = x.ReceivingLineId,
                            LineNo = x.LineNo,
                            PurchaseLineId = x.PurchaseLineId,
                            StockBatchId = x.StockBatchId,
                            BatchNo = x.BatchNo,
                            ProductId = x.ProductId,
                            ProductCode = x.ProductCode,
                            ProductName = x.ProductName,
                            Unit = x.Unit,
                            PurchasedQuantity = x.PurchasedQuantity,
                            ReceivedBefore = x.ReceivedBefore,
                            Quantity = x.Quantity,
                            RackManagementId = x.RackManagementId,
                            RackCode = x.RackCode,
                            ShelfNumber = x.ShelfNumber,
                            BinNumber = x.BinNumber,
                            ShortNotes = x.ShortNotes
                        }
                )
                .ToListAsync();

        // Shelf / bin labels from the racks' names
        List<long> lineRackIds =
            dto.Lines
                .Where(x => x.RackManagementId.HasValue && x.ShelfNumber > 0)
                .Select(x => x.RackManagementId!.Value)
                .Distinct()
                .ToList();

        Dictionary<long, string> lineRackNames =
            lineRackIds.Count == 0
                ? new Dictionary<long, string>()
                : await _context
                    .Set<RackManagementEntity>()
                    .AsNoTracking()
                    .Where(x => lineRackIds.Contains(x.RackManagementId))
                    .ToDictionaryAsync(x => x.RackManagementId, x => x.RackName);

        foreach (ReceivingLineDto placed in dto.Lines.Where(x => x.RackManagementId.HasValue && x.ShelfNumber > 0))
        {
            string rackName =
                lineRackNames.GetValueOrDefault(placed.RackManagementId!.Value, string.Empty);

            placed.ShelfLabel = RackLabels.Shelf(rackName, placed.ShelfNumber);

            placed.BinCode = RackLabels.BinCode(rackName, placed.ShelfNumber, placed.BinNumber);
        }

        dto.LineCount =
            dto.Lines.Count;

        if (Page.PageType == "MB")
        {
            // Bikes of this receiving (kept after a cancel, for
            // the record)
            dto.Units =
                await _context
                    .Set<MotorBikeUnitsEntity>()
                    .AsNoTracking()
                    .Where(x => x.ReceivingId == id)
                    .OrderBy(x => x.PurchaseLineId)
                    .ThenBy(x => x.MotorBikeUnitId)
                    .Select
                    (
                        x =>
                            new ReceivingUnitDto
                            {
                                PurchaseLineId = x.PurchaseLineId,
                                ChassisNo = x.ChassisNo,
                                EngineNo = x.EngineNo,
                                KeyNo = x.KeyNo,
                                BatteryNo = x.BatteryNo
                            }
                    )
                    .ToListAsync();

            // Free accessories received on it
            dto.Accessories =
                await PurchaseAccessoryDuesEngine.ReceiptsOfAsync(_context, id);
        }

        return dto;
    }


    private static ReceivingDto ToDto
    (
        THeader x
    )
    {
        return new ReceivingDto
        {
            ReceivingId = x.ReceivingId,
            PublicId = x.PublicId,
            PageType = x.PageType,
            ReceivingNo = x.ReceivingNo,
            ReceivingDate = DateText(x.ReceivingDate),
            BranchId = x.BranchId,
            BranchName = x.BranchName,
            WarehouseId = x.WarehouseId,
            WarehouseName = x.WarehouseName,
            PurchaseId = x.PurchaseId,
            PurchaseNo = x.PurchaseNo,
            PurchaseDate = DateText(x.PurchaseDate),
            SupplierCode = x.SupplierCode,
            SupplierName = x.SupplierName,
            SupplierInvoiceNo = x.SupplierInvoiceNo,
            MushakNo = x.MushakNo,
            DoReference = x.DoReference,
            GatePassNo = x.GatePassNo,
            ReceivedBy = x.ReceivedBy,
            Remarks = x.Remarks,
            TotalQuantity = x.TotalQuantity,
            Status = x.Status,
            CancelReason = x.CancelReason,
            CancelledDate = DateText(x.CancelledDate),
            CreatedDate = DateText(x.CreatedDate)
        };
    }


    //===========================================================
    // Defaults : number preview, warehouses, racks, switches
    //===========================================================

    public async Task<ReceivingDefaultsDto>
        GetDefaultsAsync
        (
            string pageType,
            long branchId,
            DateOnly date
        )
    {
        RequirePage(pageType);

        (bool backOn, int backDays) =
            await SwitchStateAsync(Page.SwitchBackDated, true);

        ReceivingDefaultsDto result =
            new()
            {
                PageType = Page.PageType,
                Today = DateText(BusinessToday()),
                BranchId = branchId,
                BackDatedAllowed = backOn,
                BackDatedDays = backOn ? backDays : 0,
                ShelfRequired = Page.HasShelves && await IsSwitchOnAsync(Page.SwitchShelfRequired, false),
                // Key & Battery Required (MB) : ON = Key No and Battery No
                // asked and required; OFF = not kept (columns hidden)
                UnitsRequired = await KeyBatteryOnAsync(),
                UniqueKeyNo = await KeyBatteryOnAsync() && await IsSwitchOnAsync(Page.SwitchUniqueKeyNo, false),
                UniqueBatteryNo = await KeyBatteryOnAsync() && await IsSwitchOnAsync(Page.SwitchUniqueBatteryNo, false)
            };

        result.Warehouses =
            await _context
                .Set<WarehousesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && (branchId <= 0 || x.BranchId == branchId))
                .OrderByDescending(x => x.IsDefault)
                .ThenBy(x => x.WarehouseName)
                .Select
                (
                    x =>
                        new ReceivingWarehouseDto
                        {
                            Id = x.WarehouseId,
                            BranchId = x.BranchId,
                            Code = x.WarehouseCode,
                            Name = x.WarehouseName,
                            IsDefault = x.IsDefault
                        }
                )
                .ToListAsync();

        if (Page.HasShelves)
        {
            List<long> warehouseIds =
                result.Warehouses.Select(x => x.Id).ToList();

            result.Racks =
                await _context
                    .Set<RackManagementEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive && warehouseIds.Contains(x.WarehouseId))
                    .OrderBy(x => x.RackCode)
                    .Select
                    (
                        x =>
                            new ReceivingRackDto
                            {
                                Id = x.RackManagementId,
                                WarehouseId = x.WarehouseId,
                                Code = x.RackCode,
                                Name = x.RackName,
                                ShelfCount = x.ShelfCount
                            }
                    )
                    .ToListAsync();

            // Zone and bins per shelf of every rack
            List<RackMapDto> rackMap =
                await BinOccupancy.GetRackMapAsync(
                    _context,
                    0,
                    0,
                    0,
                    true,
                    result.Racks.Select(x => x.Id).ToArray());

            foreach (ReceivingRackDto rack in result.Racks)
            {
                RackMapDto? map =
                    BinOccupancy.FindRack(rackMap, rack.Id);

                if (map == null)
                {
                    continue;
                }

                rack.ZoneCode = map.ZoneCode;

                rack.ZoneName = map.ZoneName;

                rack.Shelves =
                    map.Shelves
                        .Select(x => new ReceivingRackShelfDto { ShelfNumber = x.ShelfNumber, ShelfLabel = x.ShelfLabel, BinCount = x.BinCount })
                        .ToList();
            }
        }

        VoucherPeriodDto period;

        try
        {
            period =
                await _numberService.ResolvePeriodAsync(
                    branchId,
                    date);
        }
        catch (InvalidOperationException ex)
        {
            result.Message = ex.Message;

            return result;
        }

        result.BranchId = period.BranchId;

        result.BranchName = period.BranchName;

        result.FinancialYearName = period.FinancialYearName;

        string prefix =
            CodeGenerator.GenerateVoucherNoPrefix(
                Page.Prefix,
                period.BranchDigits,
                period.FinancialYearCode,
                period.PeriodMonth);

        int taken =
            await _context
                .Set<VoucherSequences>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.Prefix == Page.Prefix
                        &&
                        x.BranchDigits == period.BranchDigits
                        &&
                        x.FinancialYearCode == period.FinancialYearCode
                        &&
                        x.PeriodMonth == period.PeriodMonth
                )
                .Select(x => x.LastNumber)
                .FirstOrDefaultAsync();

        List<string> saved =
            await _context
                .Set<THeader>()
                .AsNoTracking()
                .Where(x => x.ReceivingNo.StartsWith(prefix))
                .Select(x => x.ReceivingNo)
                .ToListAsync();

        int highest =
            saved
                .Select(x => CodeGenerator.ParseVoucherSequence(x))
                .DefaultIfEmpty(0)
                .Max();

        int next =
            Math.Max(taken, highest) + 1;

        result.NextNumber =
            next > 99999
                ? string.Empty
                : CodeGenerator.GenerateVoucherNo(
                    Page.Prefix,
                    period.BranchDigits,
                    period.FinancialYearCode,
                    period.PeriodMonth,
                    next);

        return result;
    }


    //===========================================================
    // Key & Battery Required (MB only; switch CFG-MOD-007-0048) :
    // ON  : every bike's Key No and Battery No are asked and needed
    // OFF : the dealer does not keep them (columns hidden, never
    //       saved, Unique Key / Battery No not checked)
    // Chassis No and Engine No are always required.
    //===========================================================

    private async Task<bool>
        KeyBatteryOnAsync()
    {
        return Page.PageType == "MB"
            &&
            await IsSwitchOnAsync(Page.SwitchUnitsRequired, true);
    }


    //===========================================================
    // Purchases waiting to be received : posted, this branch,
    // something of them still in transit
    //===========================================================

    public async Task<List<ReceivingPurchaseOptionDto>>
        GetPendingPurchasesAsync
        (
            string pageType,
            long branchId
        )
    {
        RequirePage(pageType);

        // Batches of this type with stock in transit
        var batches =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductType == Page.PageType
                        &&
                        x.SourceType == SourcePurchase
                        &&
                        x.QuantityInTransit > 0
                        &&
                        (branchId <= 0 || x.BranchId == branchId)
                )
                .Select(x => new { x.SourceId })
                .Distinct()
                .ToListAsync();

        List<long> purchaseIds =
            batches.Select(x => x.SourceId).ToList();

        // MB : also purchases with free accessories still due
        if (Page.PageType == "MB")
        {
            purchaseIds =
                purchaseIds
                    .Union(await PurchaseAccessoryDuesEngine.PurchasesWithPendingAsync(_context, branchId))
                    .Distinct()
                    .ToList();
        }

        if (purchaseIds.Count == 0)
        {
            return new List<ReceivingPurchaseOptionDto>();
        }

        List<TPurchase> purchases =
            await _context
                .Set<TPurchase>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        purchaseIds.Contains(x.PurchaseId)
                        &&
                        !x.IsDeleted
                        &&
                        x.Status == PurchasePosted
                )
                .OrderBy(x => x.PurchaseDate)
                .ThenBy(x => x.PurchaseId)
                .ToListAsync();

        List<ReceivingPurchaseOptionDto> result =
            new();

        foreach (TPurchase purchase in purchases)
        {
            ReceivingPurchaseOptionDto option =
                await PurchaseOptionAsync(purchase);

            if (option.PendingQuantity > 0 || option.AccessoryPendingQuantity > 0)
            {
                result.Add(option);
            }
        }

        return result;
    }


    // One purchase with its lines : purchased / received before /
    // still in transit, default shelves, bikes already entered
    private async Task<ReceivingPurchaseOptionDto>
        PurchaseOptionAsync
        (
            TPurchase purchase
        )
    {
        List<TPurchaseLine> lines =
            await _context
                .Set<TPurchaseLine>()
                .AsNoTracking()
                .Where(x => x.PurchaseId == purchase.PurchaseId)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        List<long> lineIds =
            lines.Select(x => x.PurchaseLineId).ToList();

        Dictionary<long, StockBatchesEntity> batches =
            (
                await _context
                    .Set<StockBatchesEntity>()
                    .AsNoTracking()
                    .Where
                    (
                        x =>
                            x.ProductType == Page.PageType
                            &&
                            x.SourceType == SourcePurchase
                            &&
                            x.SourceId == purchase.PurchaseId
                            &&
                            lineIds.Contains(x.SourceLineId)
                    )
                    .ToListAsync()
            )
            .GroupBy(x => x.SourceLineId)
            .ToDictionary(g => g.Key, g => g.First());

        // Default shelves of the products (SP / AC)
        List<long> productIds =
            lines.Select(x => x.ProductId).Distinct().ToList();

        List<(long ProductId, long WarehouseId, long RackId, int Shelf, int Bin)> shelves =
            await ShelvesAsync(productIds);

        List<long> shelfRackIds =
            shelves.Select(x => x.RackId).Distinct().ToList();

        Dictionary<long, string> shelfRackNames =
            shelfRackIds.Count == 0
                ? new Dictionary<long, string>()
                : await _context
                    .Set<RackManagementEntity>()
                    .AsNoTracking()
                    .Where(x => shelfRackIds.Contains(x.RackManagementId))
                    .ToDictionaryAsync(x => x.RackManagementId, x => x.RackName);

        ReceivingPurchaseOptionDto option =
            new()
            {
                PurchaseId = purchase.PurchaseId,
                PurchaseNo = purchase.PurchaseNo,
                PurchaseDate = DateText(purchase.PurchaseDate),
                BranchId = purchase.BranchId,
                SupplierCode = purchase.SupplierCode,
                SupplierName = purchase.SupplierName,
                SupplierInvoiceNo = purchase.SupplierInvoiceNo,
                MushakNo = purchase.MushakNo,
                DoReference = purchase.DoReference,
                GatePassNo = purchase.GatePassNo
            };

        foreach (TPurchaseLine line in lines)
        {
            if (!batches.TryGetValue(line.PurchaseLineId, out StockBatchesEntity? batch))
            {
                continue;
            }

            decimal purchased =
                batch.Quantity;

            decimal pending =
                batch.QuantityInTransit;

            option.PurchasedQuantity += purchased;

            option.PendingQuantity += pending;

            option.Lines.Add(
                new ReceivingPurchaseLineDto
                {
                    PurchaseLineId = line.PurchaseLineId,
                    LineNo = line.LineNo,
                    StockBatchId = batch.StockBatchId,
                    BatchNo = batch.BatchNo,
                    ProductId = line.ProductId,
                    ProductCode = line.ProductCode,
                    ProductName = line.ProductName,
                    Unit = line.Unit,
                    PurchasedQuantity = purchased,
                    ReceivedBefore = Math.Max(0m, purchased - pending - batch.QuantityOut),
                    PendingQuantity = pending,
                    Shelves =
                        shelves
                            .Where(x => x.ProductId == line.ProductId)
                            .Select
                            (
                                x =>
                                    new ReceivingShelfDto
                                    {
                                        WarehouseId = x.WarehouseId,
                                        RackManagementId = x.RackId,
                                        ShelfNumber = x.Shelf,
                                        BinNumber = x.Bin,
                                        BinCode = RackLabels.BinCode(shelfRackNames.GetValueOrDefault(x.RackId, string.Empty), x.Shelf, x.Bin)
                                    }
                            )
                            .ToList()
                });
        }

        // MB : free accessories due from the supplier
        if (Page.PageType == "MB")
        {
            option.Accessories =
                await PurchaseAccessoryDuesEngine.DuesOfPurchaseAsync(_context, purchase.PurchaseId, true);

            option.AccessoryPendingQuantity =
                option.Accessories.Sum(x => x.PendingQuantity);
        }

        option.ReceivingStatus =
            option.PendingQuantity <= 0 && option.AccessoryPendingQuantity > 0
                ? AccessoriesPending
                : option.PendingQuantity >= option.PurchasedQuantity
                    ? NotReceived
                    : PartlyReceived;

        return option;
    }


    // (product, warehouse) → rack, shelf, bin of the page's products
    private async Task<List<(long ProductId, long WarehouseId, long RackId, int Shelf, int Bin)>>
        ShelvesAsync
        (
            List<long> productIds
        )
    {
        if (!Page.HasShelves || productIds.Count == 0)
        {
            return new List<(long, long, long, int, int)>();
        }

        if (Page.PageType == "SP")
        {
            return
                (
                    await _context
                        .Set<SparePartLocationsEntity>()
                        .AsNoTracking()
                        .Where(x => productIds.Contains(x.SparePartId))
                        .Select(x => new { x.SparePartId, x.WarehouseId, x.RackManagementId, x.ShelfNumber, x.BinNumber })
                        .ToListAsync()
                )
                .Select(x => (x.SparePartId, x.WarehouseId, x.RackManagementId, x.ShelfNumber, x.BinNumber))
                .ToList();
        }

        return
            (
                await _context
                    .Set<AccessoryLocationsEntity>()
                    .AsNoTracking()
                    .Where(x => productIds.Contains(x.AccessoryId))
                    .Select(x => new { x.AccessoryId, x.WarehouseId, x.RackManagementId, x.ShelfNumber, x.BinNumber })
                    .ToListAsync()
            )
            .Select(x => (x.AccessoryId, x.WarehouseId, x.RackManagementId, x.ShelfNumber, x.BinNumber))
            .ToList();
    }


    //===========================================================
    // Bike number check (live) : numbers already on a live bike
    //===========================================================

    public async Task<List<ReceivingUnitTakenDto>>
        CheckUnitsAsync
        (
            ReceivingUnitCheckDto dto
        )
    {
        List<ReceivingUnitTakenDto> result =
            new();

        List<ReceivingUnitDto> units =
            dto?.Units ?? new List<ReceivingUnitDto>();

        if (Page.PageType != "MB" || units.Count == 0)
        {
            return result;
        }

        bool uniqueKey =
            await KeyBatteryOnAsync() && await IsSwitchOnAsync(Page.SwitchUniqueKeyNo, false);

        bool uniqueBattery =
            await KeyBatteryOnAsync() && await IsSwitchOnAsync(Page.SwitchUniqueBatteryNo, false);

        List<long> lineIds =
            units.Select(x => x.PurchaseLineId).Distinct().ToList();

        return await TakenAsync(units, lineIds, uniqueKey, uniqueBattery);
    }


    // Live bikes holding the numbers, except the bikes of the
    // purchase lines being received that are not received yet
    // (those are matched, not new)
    private async Task<List<ReceivingUnitTakenDto>>
        TakenAsync
        (
            List<ReceivingUnitDto> units,
            List<long> purchaseLineIds,
            bool uniqueKey,
            bool uniqueBattery
        )
    {
        List<ReceivingUnitTakenDto> result =
            new();

        List<string> Pick(Func<ReceivingUnitDto, string?> pick) =>
            units
                .Select(x => Limit(pick(x), 50).ToUpperInvariant())
                .Where(x => x.Length > 0)
                .Distinct()
                .Take(500)
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
                .Select(x => new { x.ChassisNo, x.EngineNo, x.KeyNo, x.BatteryNo, x.PurchaseNo, x.PurchaseLineId, x.ReceivingId, x.WarehouseId })
                .Take(500)
                .ToListAsync();

        void Add(string field, string label, string? value, List<string> typed, string purchaseNo)
        {
            string key =
                (value ?? string.Empty).Trim().ToUpperInvariant();

            if (key.Length == 0 || !typed.Contains(key) || result.Any(x => x.Field == field && x.Value == key))
            {
                return;
            }

            result.Add(
                new ReceivingUnitTakenDto
                {
                    Field = field,
                    Value = key,
                    Message = $"{label} {key} is already on a bike of purchase {purchaseNo}."
                });
        }

        foreach (var row in rows)
        {
            // A bike entered on this purchase line, not received
            // yet : it is the bike being received
            bool own =
                purchaseLineIds.Contains(row.PurchaseLineId)
                &&
                row.ReceivingId == null
                &&
                row.WarehouseId == null;

            if (own)
            {
                continue;
            }

            Add("ChassisNo", "Chassis No", row.ChassisNo, chassis, row.PurchaseNo);
            Add("EngineNo", "Engine No", row.EngineNo, engines, row.PurchaseNo);
            Add("KeyNo", "Key No", row.KeyNo, keys, row.PurchaseNo);
            Add("BatteryNo", "Battery No", row.BatteryNo, batteries, row.PurchaseNo);
        }

        return result;
    }


    //===========================================================
    // Create : validate and post
    //===========================================================

    public async Task<ReceivingSavedDto>
        CreateAsync
        (
            CreateReceivingDto dto,
            long userId
        )
    {
        RequirePage(dto.PageType);

        DateTime now =
            DateTime.UtcNow;

        DateOnly today =
            BusinessToday();

        //=======================================================
        // Date
        //=======================================================

        DateOnly date =
            ParseDate(dto.ReceivingDate, "Receiving date");

        if (date > today)
        {
            throw new InvalidOperationException(
                "The receiving date cannot be after today.");
        }

        (bool backOn, int backDays) =
            await SwitchStateAsync(Page.SwitchBackDated, true);

        if (date < today)
        {
            if (!backOn)
            {
                throw new InvalidOperationException(
                    "Back dated receiving is off (System Configuration) : the receiving date must be today.");
            }

            if (backDays > 0 && date < today.AddDays(-backDays))
            {
                throw new InvalidOperationException(
                    $"The receiving date can be at most {backDays} day{(backDays == 1 ? string.Empty : "s")} back (System Configuration).");
            }
        }

        //=======================================================
        // Purchase, branch, warehouse
        //=======================================================

        TPurchase purchase =
            await _context
                .Set<TPurchase>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.PurchaseId == dto.PurchaseId && !x.IsDeleted)
            ??
            throw new InvalidOperationException(
                "Choose the purchase invoice to receive.");

        if (purchase.Status != PurchasePosted)
        {
            throw new InvalidOperationException(
                $"Purchase {purchase.PurchaseNo} is {purchase.Status}; only a posted purchase can be received.");
        }

        if (dto.BranchId > 0 && dto.BranchId != purchase.BranchId)
        {
            throw new InvalidOperationException(
                $"Purchase {purchase.PurchaseNo} belongs to {purchase.BranchName}; receive it in that branch.");
        }

        if (date < purchase.PurchaseDate)
        {
            throw new InvalidOperationException(
                $"The receiving date cannot be before the purchase date ({DateText(purchase.PurchaseDate)}).");
        }

        WarehousesEntity warehouse =
            await _context
                .Set<WarehousesEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.WarehouseId == dto.WarehouseId && !x.IsDeleted && x.IsActive)
            ??
            throw new InvalidOperationException(
                "Choose the warehouse to receive into.");

        if (warehouse.BranchId != purchase.BranchId)
        {
            throw new InvalidOperationException(
                $"Warehouse {warehouse.WarehouseName} is not in {purchase.BranchName}.");
        }

        VoucherPeriodDto period =
            await _numberService.ResolvePeriodAsync(
                purchase.BranchId,
                date);

        //=======================================================
        // Lines (quantity > 0 only)
        //=======================================================

        List<CreateReceivingLineDto> inputs =
            (dto.Lines ?? new List<CreateReceivingLineDto>())
                .Where(x => x.Quantity > 0)
                .ToList();

        // MB : free accessories received now
        List<CreateReceivingAccessoryDto> accessoryInputs =
            Page.PageType == "MB"
                ? (dto.Accessories ?? new List<CreateReceivingAccessoryDto>())
                    .Where(x => x.Quantity > 0)
                    .ToList()
                : new List<CreateReceivingAccessoryDto>();

        if (inputs.Count == 0 && accessoryInputs.Count == 0)
        {
            throw new InvalidOperationException(
                Page.PageType == "MB"
                    ? "Enter the quantity received on at least one bike line or accessory."
                    : "Enter the quantity received on at least one line.");
        }

        if (inputs.Count > MaxLines)
        {
            throw new InvalidOperationException(
                $"A receiving can have at most {MaxLines} lines.");
        }

        if (inputs.GroupBy(x => x.PurchaseLineId).Any(g => g.Count() > 1))
        {
            throw new InvalidOperationException(
                "A purchase line is on the receiving twice.");
        }

        List<long> lineIds =
            inputs.Select(x => x.PurchaseLineId).ToList();

        Dictionary<long, TPurchaseLine> purchaseLines =
            await _context
                .Set<TPurchaseLine>()
                .AsNoTracking()
                .Where(x => x.PurchaseId == purchase.PurchaseId && lineIds.Contains(x.PurchaseLineId))
                .ToDictionaryAsync(x => x.PurchaseLineId);

        bool shelfRequired =
            Page.HasShelves && await IsSwitchOnAsync(Page.SwitchShelfRequired, false);

        Dictionary<long, RackManagementEntity> racks =
            new();

        List<RackMapDto> rackMap =
            new();

        if (Page.HasShelves)
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

            rackMap =
                rackIds.Count == 0
                    ? new List<RackMapDto>()
                    : await BinOccupancy.GetRackMapAsync(
                        _context,
                        0,
                        0,
                        0,
                        false,
                        rackIds.ToArray());
        }

        // Bins taken by the lines of this receiving : bin -> product
        // (two lines of one product may share its bin)
        Dictionary<(long RackId, int Shelf, int Bin), long> takenBins =
            new();

        foreach (CreateReceivingLineDto input in inputs)
        {
            if (!purchaseLines.TryGetValue(input.PurchaseLineId, out TPurchaseLine? line))
            {
                throw new InvalidOperationException(
                    "A line is not on the purchase. Load the purchase again.");
            }

            if (Page.WholeUnits && input.Quantity != Math.Truncate(input.Quantity))
            {
                throw new InvalidOperationException(
                    $"{line.ProductName} : the quantity must be whole bikes.");
            }

            if (input.Quantity != Math.Round(input.Quantity, 2))
            {
                throw new InvalidOperationException(
                    $"{line.ProductName} : the quantity can have at most 2 decimals.");
            }

            if (!Page.HasShelves)
            {
                continue;
            }

            long rackId =
                input.RackManagementId ?? 0;

            if (rackId <= 0)
            {
                if (shelfRequired)
                {
                    throw new InvalidOperationException(
                        $"{line.ProductName} : choose the rack, shelf and bin (System Configuration : Shelf Required at Receiving).");
                }

                continue;
            }

            if (!racks.TryGetValue(rackId, out RackManagementEntity? rack) || rack.WarehouseId != warehouse.WarehouseId)
            {
                throw new InvalidOperationException(
                    $"{line.ProductName} : the rack is not in {warehouse.WarehouseName}.");
            }

            // Rack -> Shelf -> Bin : a free bin (or the product's own)
            input.BinNumber =
                BinOf(input.BinNumber);

            string? problem =
                BinProblem(
                    BinOccupancy.FindRack(rackMap, rackId),
                    warehouse.WarehouseId,
                    input.ShelfNumber,
                    input.BinNumber,
                    Page.PageType,
                    line.ProductId);

            if (problem != null)
            {
                throw new InvalidOperationException(
                    $"{line.ProductName} : {problem}");
            }

            (long RackId, int Shelf, int Bin) key =
                (rackId, input.ShelfNumber, input.BinNumber);

            if (takenBins.TryGetValue(key, out long other) && other != line.ProductId)
            {
                throw new InvalidOperationException(
                    $"{line.ProductName} : bin {RackLabels.BinCode(rack.RackName, input.ShelfNumber, input.BinNumber)} is chosen for another product too (one item per bin).");
            }

            takenBins[key] = line.ProductId;
        }

        //=======================================================
        // Motor bikes : one row per bike
        //=======================================================

        List<ReceivingUnitDto> units =
            new();

        if (Page.PageType == "MB")
        {
            // Chassis and Engine : always. Key and Battery : only when
            // Key & Battery Required is ON (OFF : not kept at all)
            bool keyBattery =
                await KeyBatteryOnAsync();

            bool uniqueKey =
                await KeyBatteryOnAsync() && await IsSwitchOnAsync(Page.SwitchUniqueKeyNo, false);

            bool uniqueBattery =
                await KeyBatteryOnAsync() && await IsSwitchOnAsync(Page.SwitchUniqueBatteryNo, false);

            units =
                (dto.Units ?? new List<ReceivingUnitDto>())
                    .Select
                    (
                        x =>
                            new ReceivingUnitDto
                            {
                                PurchaseLineId = x.PurchaseLineId,
                                ChassisNo = Limit(x.ChassisNo, 50).ToUpperInvariant(),
                                EngineNo = Limit(x.EngineNo, 50).ToUpperInvariant(),
                                KeyNo = keyBattery ? Limit(x.KeyNo, 50).ToUpperInvariant() : string.Empty,
                                BatteryNo = keyBattery ? Limit(x.BatteryNo, 50).ToUpperInvariant() : string.Empty
                            }
                    )
                    .Where(x => x.ChassisNo.Length + x.EngineNo.Length + x.KeyNo.Length + x.BatteryNo.Length > 0)
                    .ToList();

            foreach (CreateReceivingLineDto input in inputs)
            {
                TPurchaseLine line =
                    purchaseLines[input.PurchaseLineId];

                List<ReceivingUnitDto> of =
                    units.Where(x => x.PurchaseLineId == input.PurchaseLineId).ToList();

                if (of.Count != (int)input.Quantity)
                {
                    throw new InvalidOperationException(
                        $"{line.ProductName} : {Qty(input.Quantity)} bike{(input.Quantity == 1 ? string.Empty : "s")} received, {of.Count} entered. Enter one row per bike.");
                }

                foreach (ReceivingUnitDto unit in of)
                {
                    if (unit.ChassisNo.Length == 0 || unit.EngineNo.Length == 0)
                    {
                        throw new InvalidOperationException(
                            $"{line.ProductName} : every bike needs its Chassis No and Engine No.");
                    }

                    if (keyBattery && (unit.KeyNo.Length == 0 || unit.BatteryNo.Length == 0))
                    {
                        throw new InvalidOperationException(
                            $"{line.ProductName} : every bike needs its Key No and Battery No (System Configuration : Key & Battery Required).");
                    }
                }
            }

            if (units.Any(x => !lineIds.Contains(x.PurchaseLineId)))
            {
                throw new InvalidOperationException(
                    "A bike is on a line that is not being received.");
            }

            string? Repeat(Func<ReceivingUnitDto, string> pick, string label)
            {
                string? value =
                    units
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

            List<ReceivingUnitTakenDto> taken =
                await TakenAsync(units, lineIds, uniqueKey, uniqueBattery);

            if (taken.Count > 0)
            {
                throw new InvalidOperationException(
                    taken[0].Message);
            }
        }

        //=======================================================
        // Post
        //=======================================================

        THeader entity =
            new THeader
            {
                PageType = Page.PageType,
                ReceivingDate = date,
                BranchId = purchase.BranchId,
                BranchCode = purchase.BranchCode,
                BranchName = purchase.BranchName,
                FinancialYearId = period.FinancialYearId,
                WarehouseId = warehouse.WarehouseId,
                WarehouseName = Limit(warehouse.WarehouseName, 150),
                PurchaseId = purchase.PurchaseId,
                PurchaseNo = purchase.PurchaseNo,
                PurchaseDate = purchase.PurchaseDate,
                SupplierCode = purchase.SupplierCode,
                SupplierName = Limit(purchase.SupplierName, 200),
                SupplierInvoiceNo = purchase.SupplierInvoiceNo,
                MushakNo = purchase.MushakNo,
                DoReference = purchase.DoReference,
                GatePassNo = purchase.GatePassNo,
                ReceivedBy = Limit(dto.ReceivedBy, 150),
                Remarks = Limit(dto.Remarks, 500),
                TotalQuantity = inputs.Sum(x => x.Quantity),
                Status = StatusPosted,
                CancelReason = string.Empty,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = now
            };

        await InTransactionAsync(
            async () =>
            {
                // The purchase's batches, locked
                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT 1 FROM \"StockBatches\" WHERE \"SourceType\" = {0} AND \"SourceId\" = {1} AND \"ProductType\" = {2} FOR UPDATE",
                    SourcePurchase,
                    purchase.PurchaseId,
                    Page.PageType);

                Dictionary<long, StockBatchesEntity> batches =
                    (
                        await _context
                            .Set<StockBatchesEntity>()
                            .Where
                            (
                                x =>
                                    x.ProductType == Page.PageType
                                    &&
                                    x.SourceType == SourcePurchase
                                    &&
                                    x.SourceId == purchase.PurchaseId
                                    &&
                                    lineIds.Contains(x.SourceLineId)
                            )
                            .ToListAsync()
                    )
                    .GroupBy(x => x.SourceLineId)
                    .ToDictionary(g => g.Key, g => g.First());

                VoucherNumberDto number =
                    await _numberService.NextAsync(
                        Page.Prefix,
                        purchase.BranchId,
                        date);

                entity.ReceivingNo =
                    number.VoucherNo;

                _context.Set<THeader>().Add(entity);

                await _context.SaveChangesAsync();

                string narration =
                    Limit($"Received {entity.ReceivingNo} : purchase {purchase.PurchaseNo} from {purchase.SupplierName} into {warehouse.WarehouseName}", 300);

                int lineNo = 0;

                List<(TLine Line, StockBatchesEntity Batch)> posted =
                    new();

                foreach (CreateReceivingLineDto input in inputs.OrderBy(x => purchaseLines[x.PurchaseLineId].LineNo))
                {
                    TPurchaseLine source =
                        purchaseLines[input.PurchaseLineId];

                    if (!batches.TryGetValue(input.PurchaseLineId, out StockBatchesEntity? batch))
                    {
                        throw new InvalidOperationException(
                            $"{source.ProductName} : the purchase has no stock batch for this line.");
                    }

                    if (input.Quantity > batch.QuantityInTransit)
                    {
                        throw new InvalidOperationException(
                            $"{source.ProductName} : only {Qty(batch.QuantityInTransit)} {source.Unit} is still in transit.");
                    }

                    RackManagementEntity? rack =
                        input.RackManagementId.HasValue && racks.TryGetValue(input.RackManagementId.Value, out RackManagementEntity? found)
                            ? found
                            : null;

                    TLine line =
                        new TLine
                        {
                            ReceivingId = entity.ReceivingId,
                            LineNo = ++lineNo,
                            PurchaseLineId = source.PurchaseLineId,
                            StockBatchId = batch.StockBatchId,
                            BatchNo = Limit(batch.BatchNo, 50),
                            ProductType = Page.PageType,
                            ProductId = source.ProductId,
                            ProductCode = source.ProductCode,
                            ProductName = Limit(source.ProductName, 200),
                            Unit = Limit(source.Unit, 30),
                            PurchasedQuantity = batch.Quantity,
                            ReceivedBefore = Math.Max(0m, batch.Quantity - batch.QuantityInTransit - batch.QuantityOut),
                            Quantity = input.Quantity,
                            UnitCost = batch.UnitCost,
                            RackManagementId = rack?.RackManagementId,
                            RackCode = Limit(rack?.RackCode, 50),
                            ShelfNumber = rack == null ? 0 : input.ShelfNumber,
                            BinNumber = rack == null ? 0 : BinOf(input.BinNumber),
                            ShortNotes = Limit(input.ShortNotes, 200)
                        };

                    _context.Set<TLine>().Add(line);

                    batch.QuantityInTransit -= input.Quantity;

                    batch.QuantityOnHand += input.Quantity;

                    batch.Status =
                        batch.QuantityInTransit > 0
                            ? BatchInTransit
                            : batch.QuantityOnHand > 0
                                ? BatchOnHand
                                : BatchClosed;

                    batch.ModifiedBy = userId;

                    batch.ModifiedDate = now;

                    posted.Add((line, batch));

                    if (rack != null && input.SaveAsDefault)
                    {
                        await SaveShelfAsync(source.ProductId, warehouse.WarehouseId, rack.RackManagementId, input.ShelfNumber, BinOf(input.BinNumber), userId, now);
                    }
                }

                await _context.SaveChangesAsync();

                //===================================================
                // Movements : In Transit out, On Hand in
                //===================================================

                foreach ((TLine line, StockBatchesEntity batch) in posted)
                {
                    decimal value =
                        Money(line.Quantity * batch.UnitCost);

                    _context.Set<StockMovementsEntity>().Add(
                        Movement(entity, line, batch, BatchInTransit, null, 0m, line.Quantity, value, MoveReceive, false, narration, userId, now));

                    _context.Set<StockMovementsEntity>().Add(
                        Movement(entity, line, batch, BatchOnHand, warehouse.WarehouseId, line.Quantity, 0m, value, MoveReceive, false, narration, userId, now));
                }

                //===================================================
                // Bikes : a bike entered on the purchase line is
                // matched by chassis; the others are added
                //===================================================

                if (Page.PageType == "MB")
                {
                    List<MotorBikeUnitsEntity> existing =
                        await _context
                            .Set<MotorBikeUnitsEntity>()
                            .Where
                            (
                                x =>
                                    !x.IsDeleted
                                    &&
                                    lineIds.Contains(x.PurchaseLineId)
                                    &&
                                    x.ReceivingId == null
                                    &&
                                    x.WarehouseId == null
                            )
                            .ToListAsync();

                    foreach (ReceivingUnitDto unit in units)
                    {
                        TPurchaseLine source =
                            purchaseLines[unit.PurchaseLineId];

                        StockBatchesEntity batch =
                            batches[unit.PurchaseLineId];

                        MotorBikeUnitsEntity? bike =
                            existing.FirstOrDefault
                            (
                                x =>
                                    x.PurchaseLineId == unit.PurchaseLineId
                                    &&
                                    string.Equals(x.ChassisNo, unit.ChassisNo, StringComparison.OrdinalIgnoreCase)
                            );

                        if (bike == null)
                        {
                            bike =
                                new MotorBikeUnitsEntity
                                {
                                    ProductId = source.ProductId,
                                    ProductCode = source.ProductCode,
                                    ProductName = Limit(source.ProductName, 200),
                                    BranchId = purchase.BranchId,
                                    PurchaseId = purchase.PurchaseId,
                                    PurchaseLineId = source.PurchaseLineId,
                                    PurchaseNo = purchase.PurchaseNo,
                                    SupplierCode = purchase.SupplierCode,
                                    IsDeleted = false,
                                    CreatedBy = userId,
                                    CreatedDate = now
                                };

                            _context.Set<MotorBikeUnitsEntity>().Add(bike);
                        }
                        else
                        {
                            existing.Remove(bike);

                            bike.ModifiedBy = userId;

                            bike.ModifiedDate = now;
                        }

                        bike.ChassisNo = unit.ChassisNo;
                        bike.EngineNo = unit.EngineNo;
                        bike.KeyNo = unit.KeyNo;
                        bike.BatteryNo = unit.BatteryNo;
                        bike.UnitCost = batch.UnitCost;
                        bike.Status = UnitInStock;
                        bike.StockInDate = date;
                        bike.ReceivingId = entity.ReceivingId;
                        bike.WarehouseId = warehouse.WarehouseId;
                    }
                }

                await _context.SaveChangesAsync();

                //===================================================
                // MB : free accessories, zero cost, on hand
                //===================================================

                if (accessoryInputs.Count > 0)
                {
                    await PurchaseAccessoryDuesEngine.ReceiveAsync(
                        _context,
                        purchase.PurchaseId,
                        purchase.BranchId,
                        purchase.SupplierCode,
                        entity.ReceivingId,
                        entity.ReceivingNo,
                        entity.ReceivingDate,
                        warehouse.WarehouseId,
                        warehouse.WarehouseName,
                        Page.Prefix,
                        accessoryInputs,
                        userId,
                        now);
                }

                await MarkStockedInAsync(purchase.PurchaseId, userId, now);

                AddHistory(entity, "Create", "Posted", userId, now);

                await _context.SaveChangesAsync();
            });

        return new ReceivingSavedDto
        {
            ReceivingId = entity.ReceivingId,
            PublicId = entity.PublicId,
            ReceivingNo = entity.ReceivingNo
        };
    }


    private StockMovementsEntity Movement
    (
        THeader entity,
        TLine line,
        StockBatchesEntity batch,
        string bucket,
        long? warehouseId,
        decimal quantityIn,
        decimal quantityOut,
        decimal value,
        string movementType,
        bool reversal,
        string narration,
        long userId,
        DateTime now
    )
    {
        return new StockMovementsEntity
        {
            StockBatchId = batch.StockBatchId,
            ProductType = batch.ProductType,
            ProductId = batch.ProductId,
            BranchId = entity.BranchId,
            WarehouseId = warehouseId,
            Bucket = bucket,
            MovementType = movementType,
            QuantityIn = quantityIn,
            QuantityOut = quantityOut,
            UnitCost = batch.UnitCost,
            Value = value,
            DocumentType = Page.Prefix,
            DocumentId = entity.ReceivingId,
            DocumentLineId = line.ReceivingLineId,
            DocumentNo = entity.ReceivingNo,
            DocumentDate = reversal ? BusinessToday() : entity.ReceivingDate,
            IsReversal = reversal,
            Narration = narration,
            CreatedBy = userId,
            CreatedDate = now
        };
    }


    // The product's default rack · shelf in the warehouse
    private async Task SaveShelfAsync
    (
        long productId,
        long warehouseId,
        long rackId,
        int shelf,
        int bin,
        long userId,
        DateTime now
    )
    {
        if (Page.PageType == "SP")
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
                        BinNumber = bin,
                        CreatedBy = userId,
                        CreatedDate = now
                    });
            }
            else
            {
                row.RackManagementId = rackId;

                row.ShelfNumber = shelf;

                row.BinNumber = bin;
            }

            return;
        }

        if (Page.PageType == "AC")
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
                        BinNumber = bin,
                        CreatedBy = userId,
                        CreatedDate = now
                    });
            }
            else
            {
                row.RackManagementId = rackId;

                row.ShelfNumber = shelf;

                row.BinNumber = bin;
            }
        }
    }


    // Purchase StockedIn when nothing of it is in transit any more
    private async Task MarkStockedInAsync
    (
        long purchaseId,
        long userId,
        DateTime now
    )
    {
        bool inTransit =
            await _context
                .Set<StockBatchesEntity>()
                .AnyAsync
                (
                    x =>
                        x.ProductType == Page.PageType
                        &&
                        x.SourceType == SourcePurchase
                        &&
                        x.SourceId == purchaseId
                        &&
                        x.QuantityInTransit > 0
                );

        TPurchase? purchase =
            await _context
                .Set<TPurchase>()
                .FirstOrDefaultAsync(x => x.PurchaseId == purchaseId);

        if (purchase == null)
        {
            return;
        }

        purchase.StockedIn = !inTransit;

        purchase.StockedInDate = inTransit ? null : now;

        purchase.ModifiedBy = userId;

        purchase.ModifiedDate = now;
    }


    //===========================================================
    // Cancel : stock back in transit while all of it is still on
    // hand in the warehouse
    //===========================================================

    public async Task
        CancelAsync
        (
            long id,
            CancelReceivingDto dto,
            long userId
        )
    {
        string reason =
            Limit(dto?.Reason, 500);

        if (reason.Length == 0)
        {
            throw new InvalidOperationException(
                "A reason is required to cancel a receiving.");
        }

        DateTime now =
            DateTime.UtcNow;

        await InTransactionAsync(
            async () =>
            {
                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT 1 FROM \"" + Page.TableName + "\" WHERE \"ReceivingId\" = {0} FOR UPDATE",
                    id);

                THeader entity =
                    await _context
                        .Set<THeader>()
                        .FirstOrDefaultAsync(x => x.ReceivingId == id && !x.IsDeleted && x.PageType == Page.PageType)
                    ??
                    throw new KeyNotFoundException("Receiving not found.");

                if (entity.Status != StatusPosted)
                {
                    throw new InvalidOperationException(
                        $"Receiving {entity.ReceivingNo} is {entity.Status}; only a posted receiving can be cancelled.");
                }

                List<TLine> lines =
                    await _context
                        .Set<TLine>()
                        .Where(x => x.ReceivingId == id)
                        .ToListAsync();

                List<long> batchIds =
                    lines.Select(x => x.StockBatchId).Distinct().ToList();

                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT 1 FROM \"StockBatches\" WHERE \"SourceType\" = {0} AND \"SourceId\" = {1} AND \"ProductType\" = {2} FOR UPDATE",
                    SourcePurchase,
                    entity.PurchaseId,
                    Page.PageType);

                Dictionary<long, StockBatchesEntity> batches =
                    await _context
                        .Set<StockBatchesEntity>()
                        .Where(x => batchIds.Contains(x.StockBatchId))
                        .ToDictionaryAsync(x => x.StockBatchId);

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
                                x.Bucket == BatchOnHand
                                &&
                                x.WarehouseId == entity.WarehouseId
                        )
                        .GroupBy(x => x.StockBatchId)
                        .Select(g => new { g.Key, Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut) })
                        .ToDictionaryAsync(x => x.Key, x => x.Quantity);

                foreach (TLine line in lines)
                {
                    decimal held =
                        onHand.GetValueOrDefault(line.StockBatchId);

                    if (!batches.TryGetValue(line.StockBatchId, out StockBatchesEntity? batch)
                        || held < line.Quantity
                        || batch.QuantityOnHand < line.Quantity)
                    {
                        throw new InvalidOperationException(
                            $"{line.ProductName} : only {Qty(Math.Max(0m, held))} of the {Qty(line.Quantity)} received is still in {entity.WarehouseName}; the rest was sold, moved or returned. The receiving cannot be cancelled.");
                    }
                }

                List<MotorBikeUnitsEntity> bikes =
                    new();

                if (Page.PageType == "MB")
                {
                    bikes =
                        await _context
                            .Set<MotorBikeUnitsEntity>()
                            .Where(x => x.ReceivingId == id && !x.IsDeleted)
                            .ToListAsync();

                    MotorBikeUnitsEntity? gone =
                        bikes.FirstOrDefault(x => x.Status != UnitInStock || x.WarehouseId != entity.WarehouseId);

                    if (gone != null)
                    {
                        throw new InvalidOperationException(
                            $"Bike {gone.ChassisNo} is no longer in stock in {entity.WarehouseName}. The receiving cannot be cancelled.");
                    }
                }

                // MB : free accessories back off (refused when some
                // of them has left the warehouse)
                if (Page.PageType == "MB")
                {
                    await PurchaseAccessoryDuesEngine.CancelReceivingAsync(
                        _context,
                        entity.ReceivingId,
                        entity.ReceivingNo,
                        entity.ReceivingDate,
                        entity.BranchId,
                        entity.WarehouseId,
                        entity.WarehouseName,
                        Page.Prefix,
                        reason,
                        userId,
                        now);
                }

                string narration =
                    Limit($"Receiving {entity.ReceivingNo} cancelled : {reason}", 300);

                foreach (TLine line in lines)
                {
                    StockBatchesEntity batch =
                        batches[line.StockBatchId];

                    decimal value =
                        Money(line.Quantity * batch.UnitCost);

                    _context.Set<StockMovementsEntity>().Add(
                        Movement(entity, line, batch, BatchOnHand, entity.WarehouseId, 0m, line.Quantity, value, MoveReceiveCancel, true, narration, userId, now));

                    _context.Set<StockMovementsEntity>().Add(
                        Movement(entity, line, batch, BatchInTransit, null, line.Quantity, 0m, value, MoveReceiveCancel, true, narration, userId, now));

                    batch.QuantityOnHand -= line.Quantity;

                    batch.QuantityInTransit += line.Quantity;

                    batch.Status = BatchInTransit;

                    batch.ModifiedBy = userId;

                    batch.ModifiedDate = now;
                }

                // Bikes of this receiving are taken off (entered again
                // on the next receiving)
                foreach (MotorBikeUnitsEntity bike in bikes)
                {
                    bike.ReceivingId = null;

                    bike.WarehouseId = null;

                    bike.StockInDate = null;

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

                await _context.SaveChangesAsync();

                await MarkStockedInAsync(entity.PurchaseId, userId, now);

                AddHistory(entity, "Cancel", "Cancelled", userId, now, $"Reason : {reason}");

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // MB : Close Due : the rest of one accessory due row is
    // written off (the supplier will not send it)
    //===========================================================

    public async Task
        CloseAccessoryDueAsync
        (
            long dueId,
            long branchId,
            CloseAccessoryDueDto dto,
            long userId
        )
    {
        if (Page.PageType != "MB")
        {
            throw new InvalidOperationException(
                "Free accessories are due on Motor Bike Receiving only.");
        }

        await PurchaseAccessoryDuesEngine.CloseAsync(
            _context,
            dueId,
            branchId,
            dto?.Reason,
            userId);
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
            .Set<THeader>()
            .AsNoTracking()
            .Where(x => x.PublicId == publicId)
            .Select(x => (long?)x.ReceivingId)
            .FirstOrDefaultAsync();
    }


    //===========================================================
    // Get Paged (list page : tab, search, sort and page on the
    // server). Counts : All / Posted / Cancelled (search applied).
    //===========================================================

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

    public async Task<PagedResult<ReceivingDto>>
        GetPagedAsync
        (
            string pageType,
            ReceivingPageRequest request
        )
    {
        RequirePage(pageType);

        IQueryable<THeader> query =
            _context
                .Set<THeader>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.PageType == Page.PageType);

        foreach
        (
            string word in request.SafeSearch.Split(' ', StringSplitOptions.RemoveEmptyEntries)
        )
        {
            string like =
                PagingQuery.LikePattern(word);

            DateOnly? date =
                SearchDate(word);

            DateOnly day =
                date ?? DateOnly.MinValue;

            bool isDate =
                date.HasValue;

            query =
                query.Where
                (
                    x =>
                        (isDate && x.ReceivingDate == day) ||
                        EF.Functions.ILike(x.ReceivingNo, like) ||
                        EF.Functions.ILike(x.PurchaseNo, like) ||
                        EF.Functions.ILike(x.SupplierName, like) ||
                        EF.Functions.ILike(x.SupplierInvoiceNo, like) ||
                        EF.Functions.ILike(x.MushakNo, like) ||
                        EF.Functions.ILike(x.WarehouseName, like) ||
                        EF.Functions.ILike(x.ReceivedBy, like) ||
                        EF.Functions.ILike(x.Remarks, like) ||
                        EF.Functions.ILike(x.Status, like)
                );
        }

        var statusCounts =
            await query
                .GroupBy(x => x.Status)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToListAsync();

        string tab =
            (request.Tab ?? string.Empty).Trim().ToLowerInvariant();

        if (tab != string.Empty && tab != "all")
        {
            query = query.Where(x => x.Status.ToLower() == tab);
        }

        int total =
            await query.CountAsync();

        PagingQuery.FitPage(
            request,
            total);

        SortMap<THeader> sorts =
            new SortMap<THeader>("ReceivingNo")
                .Add("ReceivingNo", x => x.ReceivingNo)
                .Add("DateText", x => x.ReceivingDate)
                .Add("PurchaseNo", x => x.PurchaseNo)
                .Add("SupplierName", x => x.SupplierName)
                .Add("DocumentText", x => x.SupplierInvoiceNo)
                .Add("WarehouseName", x => x.WarehouseName)
                .Add("LineCount", x => _context.Set<TLine>().Count(l => l.ReceivingId == x.ReceivingId))
                .Add("QuantityText", x => x.TotalQuantity)
                .Add("Status", x => x.Status)
                .Tie(x => x.ReceivingId);

        IQueryable<THeader> ordered =
            string.IsNullOrWhiteSpace(request.Sort)
                ? query
                    .OrderByDescending(x => x.ReceivingDate)
                    .ThenByDescending(x => x.ReceivingId)
                : sorts.Apply(query, request);

        List<THeader> rows =
            await ordered
                .Page(request)
                .ToListAsync();

        Dictionary<string, int> counts =
            new()
            {
                ["All"] = statusCounts.Sum(x => x.Count)
            };

        foreach (var row in statusCounts)
        {
            counts[row.Key] = row.Count;
        }

        return new PagedResult<ReceivingDto>
        {
            Items = await MapListRowsAsync(rows),
            TotalCount = total,
            Page = request.SafePage,
            PageSize = request.SafePageSize,
            Counts = counts
        };
    }
}
