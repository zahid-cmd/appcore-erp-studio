//===============================================================
// Namespaces
//===============================================================

using AppCore.Infrastructure.Persistence.Paging;
using AppCore.Application.Common.Paging;
using System.Globalization;

using Microsoft.EntityFrameworkCore;

using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Common.ActivityHistory.DTOs;

using AppCore.Application.InventoryManagement.StockMovement;

using AppCore.Application.Platform.Accounting;

using AppCore.Domain.Common;

using AppCore.Domain.Entities.InventoryManagement.StockMovement;

using AppCore.Domain.Platform.Accounting;

using AppCore.Infrastructure.Persistence;

using BusinessLineAccess =
    AppCore.Infrastructure.Repositories.Settings.GeneralSettings.BusinessLineAccess;

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

using RackManagementRepository =
    AppCore.Infrastructure.Configurations.Settings.ProductSettings.RackManagementRepository;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using WarehousesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Warehouses;

using UserProfileEntity =
    AppCore.Domain.Entities.SecurityPermission.UserManagement.UserProfile;

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

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using MotorBikeUnitsEntity =
    AppCore.Domain.Entities.Procurement.MotorBikePurchase.MotorBikeUnits;

using StockBatchesEntity =
    AppCore.Domain.Platform.Inventory.StockBatches;

using StockMovementsEntity =
    AppCore.Domain.Platform.Inventory.StockMovements;


//===============================================================
// Namespace (as generated : the DI registration uses it)
//===============================================================

namespace AppCore.Infrastructure.Configurations.InventoryManagement.StockMovement;


//===============================================================
// Product Transfer repository
//
// Stock moved from one warehouse (From) to another (To); batch
// and cost travel unchanged.
//   No      : TRF-<MB|SP|AC>-0001, company-wide, one counter per
//             type, never reset, never reused (given on first
//             save).
//   Lines   : SP / AC : product + quantity, batches taken FIFO
//             (oldest source date first) from the stock on hand
//             in the From warehouse (StockMovements, bucket
//             OnHand, Σ in − Σ out). MB : the bikes (In Stock in
//             the From warehouse), each with its batch.
//             Unpriced batches may transfer.
//   Draft   : saved with the planned FIFO split; edited, deleted,
//             restored freely. Availability checked on save and
//             again on post.
//   Post    : same branch → per batch Out OnHand (From) + In
//             OnHand (To), bikes to the To warehouse, places
//             saved; no journal; Completed.
//             other branch (Send) → per batch Out OnHand (From) +
//             In InTransit (To branch, no warehouse); batch
//             OnHand − q, InTransit + q; bikes In Transit (To
//             branch, no warehouse); journal TRF (number from the
//             voucher number service, From branch, transfer date,
//             reference = Transfer No) : per inventory ledger
//             Dr (To branch) / Cr (From branch) at batch cost —
//             each line carries its branch (VoucherPostingLine.
//             BranchId), the posting engine adds the Inter-Branch
//             Current Account lines; In Transit.
//   Receive : the To branch only; Out InTransit + In OnHand (To
//             warehouse); bikes In Stock there; places saved; no
//             journal; Received.
//   Cancel  : while the stock is still where the transfer put it
//             (on hand in the To warehouse / still in transit at
//             the To branch; bikes still there) : reversing
//             movements dated today, bikes back to the From
//             warehouse, journal reversed (inter-branch).
//===============================================================

public class ProductTransferRepository
    : IProductTransferRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Inventory Management";

    private const string EntityName =
        "ProductTransfer";

    private const string DateFormat =
        "yyyy-MM-dd";

    private const string DateTimeFormat =
        "yyyy-MM-dd HH:mm";

    public const string StatusDraft = "Draft";

    public const string StatusInTransit = "In Transit";

    public const string StatusCompleted = "Completed";

    public const string StatusReceived = "Received";

    public const string StatusCancelled = "Cancelled";

    // Stock batch statuses and buckets
    private const string BatchInTransit = "InTransit";

    private const string BatchOnHand = "OnHand";

    private const string BatchCancelled = "Cancelled";

    private const string BucketOnHand = "OnHand";

    private const string BucketInTransit = "InTransit";

    // Batch sources (a bike's batch : its purchase line or its
    // opening stock document + product)
    private const string SourcePurchase = "Purchase";

    private const string SourceOpening = "Opening";

    // Movement types of this page
    private const string MoveTransfer = "Transfer";

    private const string MoveSend = "TransferSend";

    private const string MoveReceive = "TransferReceive";

    private const string MoveCancel = "TransferCancel";

    // Motor bike unit statuses
    private const string UnitInStock = "InStock";

    private const string UnitInTransit = "InTransit";

    private const int MaxLines = 500;

    // pg_advisory_xact_lock class for the numbers ("TR")
    private const int NumberLockClass = 0x5452;


    //===========================================================
    // Dependencies
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IVoucherNumberService _numberService;

    private readonly IVoucherPostingService _postingService;


    //===========================================================
    // Constructor
    //===========================================================

    public ProductTransferRepository(
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

    // The business line a warehouse's branch must run to hold
    // the type (Business Configuration)
    private static string LineOf(string type) =>
        type switch
        {
            "MB" => BusinessLineAccess.MotorBikes,
            "SP" => BusinessLineAccess.SpareParts,
            _ => BusinessLineAccess.Accessories
        };

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


    private static bool HasShelves(string type) =>
        type is "SP" or "AC";

    // TRF-MB-0001
    private static string NumberOf(string type, int sequence) =>
        $"TRF-{type}-{sequence:D4}";


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

    private static string RackText(string code, string name) =>
        code.Length > 0 && name.Length > 0
            ? $"{code} - {name}"
            : code.Length > 0 ? code : name;


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

    private async Task LockTransferAsync(long id)
    {
        await _context.Database.ExecuteSqlRawAsync(
            "SELECT 1 FROM \"ProductTransfers\" WHERE \"ProductTransferId\" = {0} FOR UPDATE",
            id);
    }

    // Every batch of these products (one writer at a time)
    private async Task LockProductBatchesAsync(string type, List<long> productIds)
    {
        if (productIds.Count == 0)
        {
            return;
        }

        await _context.Database.ExecuteSqlRawAsync(
            "SELECT 1 FROM \"StockBatches\" WHERE \"ProductType\" = {0} AND \"ProductId\" = ANY({1}) FOR UPDATE",
            type,
            productIds.Distinct().ToArray());
    }

    private async Task LockBatchesAsync(List<long> batchIds)
    {
        if (batchIds.Count == 0)
        {
            return;
        }

        await _context.Database.ExecuteSqlRawAsync(
            "SELECT 1 FROM \"StockBatches\" WHERE \"StockBatchId\" = ANY({0}) FOR UPDATE",
            new object[] { batchIds.Distinct().ToArray() });
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
    // Warehouses (with their branch)
    //===========================================================

    private sealed class WarehouseInfo
    {
        public long Id { get; set; }

        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public long BranchId { get; set; }

        public string BranchCode { get; set; } = string.Empty;

        public string BranchName { get; set; } = string.Empty;

        public bool IsDefault { get; set; }

        public bool IsActive { get; set; }

        public bool IsDeleted { get; set; }

        // "Main Warehouse · Uttara"
        public string Label =>
            BranchName.Length > 0 ? $"{Name} · {BranchName}" : Name;
    }

    // ids null = every warehouse
    private async Task<Dictionary<long, WarehouseInfo>>
        WarehousesAsync
        (
            List<long>? ids
        )
    {
        var warehouses =
            await _context
                .Set<WarehousesEntity>()
                .AsNoTracking()
                .Where(x => ids == null || ids.Contains(x.WarehouseId))
                .Select(x => new { x.WarehouseId, x.WarehouseCode, x.WarehouseName, x.BranchId, x.IsDefault, x.IsActive, x.IsDeleted })
                .ToListAsync();

        List<long> branchIds =
            warehouses.Select(x => x.BranchId).Distinct().ToList();

        var branches =
            (
                await _context
                    .Set<BranchesEntity>()
                    .AsNoTracking()
                    .Where(x => branchIds.Contains(x.BranchId))
                    .Select(x => new { x.BranchId, x.BranchCode, x.BranchName })
                    .ToListAsync()
            )
            .ToDictionary(x => x.BranchId);

        return warehouses
            .ToDictionary
            (
                x => x.WarehouseId,
                x =>
                {
                    var branch =
                        branches.GetValueOrDefault(x.BranchId);

                    return new WarehouseInfo
                    {
                        Id = x.WarehouseId,
                        Code = x.WarehouseCode ?? string.Empty,
                        Name = x.WarehouseName ?? string.Empty,
                        BranchId = x.BranchId,
                        BranchCode = branch?.BranchCode ?? string.Empty,
                        BranchName = branch?.BranchName ?? string.Empty,
                        IsDefault = x.IsDefault,
                        IsActive = x.IsActive,
                        IsDeleted = x.IsDeleted
                    };
                }
            );
    }


    //===========================================================
    // History
    //===========================================================

    private void AddHistory
    (
        ProductTransfer entity,
        string route,
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
                EntityId = entity.ProductTransferId,
                ActivityType = activityType,
                ActivityTitle = $"Product Transfer {verb}",
                // ActivityHistories.ActivityDescription is 1000 long
                ActivityDescription =
                    Limit(
                        $"Product Transfer {entity.TransferNo} ({TitleOf(entity.PageType)}, {DateText(entity.TransferDate)}, {route}, {entity.LineCount} line{(entity.LineCount == 1 ? string.Empty : "s")}, quantity {Qty(entity.TotalQuantity)}, value {entity.TotalValue:N2}) {verb.ToLowerInvariant()}.{(string.IsNullOrWhiteSpace(extra) ? string.Empty : " " + extra)}",
                        1000),
                PerformedBy = userId,
                PerformedByName = Limit(userName, 150),
                PerformedDate = now
            });
    }

    private async Task<string> RouteTextAsync(ProductTransfer entity)
    {
        Dictionary<long, WarehouseInfo> warehouses =
            await WarehousesAsync(new List<long> { entity.FromWarehouseId, entity.ToWarehouseId });

        string from =
            warehouses.TryGetValue(entity.FromWarehouseId, out WarehouseInfo? f) ? f.Label : $"#{entity.FromWarehouseId}";

        string to =
            warehouses.TryGetValue(entity.ToWarehouseId, out WarehouseInfo? t) ? t.Label : $"#{entity.ToWarehouseId}";

        return $"{from} -> {to}";
    }


    //===========================================================
    // Products of a type (live) : code, name, part number, unit,
    // inventory ledger, category and brand (Price Adjustment's
    // rules)
    //===========================================================

    private sealed class ProductInfo
    {
        public long Id { get; set; }

        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        // The maker's part number (MB : none)
        public string PartNumber { get; set; } = string.Empty;

        public string Unit { get; set; } = string.Empty;

        public string InventoryLedgerCode { get; set; } = string.Empty;

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
                            Unit = "Pcs",
                            InventoryLedgerCode = x.InventoryLedgerCode,
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
                            PartNumber = x.PartNumber,
                            Unit = x.Unit,
                            InventoryLedgerCode = x.InventoryLedgerCode,
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
                    .Select(x => new { x.AccessoryId, x.ProductCode, x.PartNumber, x.AccessoryName, x.Unit, x.InventoryLedgerCode, x.ProductCategoryId })
                    .ToListAsync()
            )
            .Select
            (
                x =>
                    new ProductInfo
                    {
                        Id = x.AccessoryId,
                        Code = x.ProductCode ?? string.Empty,
                        Name = string.IsNullOrWhiteSpace(x.PartNumber) ? x.AccessoryName ?? string.Empty : $"{x.PartNumber} - {x.AccessoryName}",
                        PartNumber = x.PartNumber ?? string.Empty,
                        Unit = x.Unit ?? string.Empty,
                        InventoryLedgerCode = x.InventoryLedgerCode ?? string.Empty,
                        CategoryId = x.ProductCategoryId
                    }
            )
            .ToList();
    }


    //===========================================================
    // Stock on hand per batch in a warehouse (OnHand movements :
    // Σ in − Σ out)
    //===========================================================

    private async Task<Dictionary<long, decimal>>
        OnHandInWarehouseAsync
        (
            string type,
            long warehouseId,
            List<long>? productIds
        )
    {
        var rows =
            await _context
                .Set<StockMovementsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductType == type
                        &&
                        x.Bucket == BucketOnHand
                        &&
                        x.WarehouseId == warehouseId
                        &&
                        (productIds == null || productIds.Contains(x.ProductId))
                )
                .GroupBy(x => x.StockBatchId)
                .Select(g => new { StockBatchId = g.Key, Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut) })
                .ToListAsync();

        return rows
            .Where(x => x.Quantity > 0m)
            .ToDictionary(x => x.StockBatchId, x => x.Quantity);
    }

    // On hand of these batches in a warehouse
    private async Task<Dictionary<long, decimal>>
        OnHandOfBatchesAsync
        (
            List<long> batchIds,
            long warehouseId
        )
    {
        if (batchIds.Count == 0)
        {
            return new Dictionary<long, decimal>();
        }

        var rows =
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
                        x.WarehouseId == warehouseId
                )
                .GroupBy(x => x.StockBatchId)
                .Select(g => new { StockBatchId = g.Key, Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut) })
                .ToListAsync();

        return rows.ToDictionary(x => x.StockBatchId, x => x.Quantity);
    }

    // In transit at a branch (no warehouse) of these batches
    private async Task<Dictionary<long, decimal>>
        InTransitOfBatchesAsync
        (
            List<long> batchIds,
            long branchId
        )
    {
        if (batchIds.Count == 0)
        {
            return new Dictionary<long, decimal>();
        }

        var rows =
            await _context
                .Set<StockMovementsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        batchIds.Contains(x.StockBatchId)
                        &&
                        x.Bucket == BucketInTransit
                        &&
                        x.BranchId == branchId
                        &&
                        x.WarehouseId == null
                )
                .GroupBy(x => x.StockBatchId)
                .Select(g => new { StockBatchId = g.Key, Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut) })
                .ToListAsync();

        return rows.ToDictionary(x => x.StockBatchId, x => x.Quantity);
    }

    // Open batches (not cancelled), oldest first (FIFO)
    private async Task<List<StockBatchesEntity>>
        BatchesFifoAsync
        (
            string type,
            List<long> batchIds
        )
    {
        if (batchIds.Count == 0)
        {
            return new List<StockBatchesEntity>();
        }

        return
            (
                await _context
                    .Set<StockBatchesEntity>()
                    .AsNoTracking()
                    .Where(x => batchIds.Contains(x.StockBatchId) && x.ProductType == type && x.Status != BatchCancelled)
                    .ToListAsync()
            )
            .OrderBy(x => x.SourceDate)
            .ThenBy(x => x.StockBatchId)
            .ToList();
    }


    //===========================================================
    // Motor bikes : each bike's batch (its purchase line, or its
    // opening stock document + product)
    //===========================================================

    private async Task<Dictionary<long, StockBatchesEntity>>
        BatchOfBikesAsync
        (
            List<MotorBikeUnitsEntity> bikes
        )
    {
        Dictionary<long, StockBatchesEntity> result =
            new();

        if (bikes.Count == 0)
        {
            return result;
        }

        List<long> purchaseIds =
            bikes
                .Where(x => !(x.OpeningStockId > 0))
                .Select(x => x.PurchaseId)
                .Distinct()
                .ToList();

        List<long> openingIds =
            bikes
                .Where(x => x.OpeningStockId > 0)
                .Select(x => x.OpeningStockId!.Value)
                .Distinct()
                .ToList();

        List<StockBatchesEntity> batches =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductType == "MB"
                        &&
                        x.Status != BatchCancelled
                        &&
                        (
                            (x.SourceType == SourcePurchase && purchaseIds.Contains(x.SourceId))
                            ||
                            (x.SourceType == SourceOpening && openingIds.Contains(x.SourceId))
                        )
                )
                .ToListAsync();

        foreach (MotorBikeUnitsEntity bike in bikes)
        {
            StockBatchesEntity? batch =
                bike.OpeningStockId > 0
                    ? batches.FirstOrDefault
                    (
                        x =>
                            x.SourceType == SourceOpening
                            &&
                            x.SourceId == bike.OpeningStockId!.Value
                            &&
                            x.ProductId == bike.ProductId
                    )
                    : batches.FirstOrDefault
                    (
                        x =>
                            x.SourceType == SourcePurchase
                            &&
                            x.SourceId == bike.PurchaseId
                            &&
                            x.SourceLineId == bike.PurchaseLineId
                    );

            if (batch != null)
            {
                result[bike.MotorBikeUnitId] = batch;
            }
        }

        return result;
    }

    // Bikes In Stock in a warehouse whose batch has stock there. A
    // bike received on the purchase itself has no warehouse
    // recorded : it counts when it is in the warehouse's branch
    // and its batch is on hand in the warehouse.
    private async Task<List<(MotorBikeUnitsEntity Bike, StockBatchesEntity Batch)>>
        BikesInWarehouseAsync
        (
            WarehouseInfo warehouse,
            List<long>? productIds,
            List<long>? unitIds,
            Dictionary<long, decimal> onHand
        )
    {
        long warehouseId =
            warehouse.Id;

        long branchId =
            warehouse.BranchId;

        List<MotorBikeUnitsEntity> bikes =
            await _context
                .Set<MotorBikeUnitsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.Status == UnitInStock
                        &&
                        (
                            x.WarehouseId == warehouseId
                            ||
                            (x.WarehouseId == null && x.BranchId == branchId)
                        )
                        &&
                        (productIds == null || productIds.Contains(x.ProductId))
                        &&
                        (unitIds == null || unitIds.Contains(x.MotorBikeUnitId))
                )
                .OrderBy(x => x.ChassisNo)
                .ToListAsync();

        Dictionary<long, StockBatchesEntity> batchOf =
            await BatchOfBikesAsync(bikes);

        return bikes
            .Where(x => batchOf.ContainsKey(x.MotorBikeUnitId))
            .Select(x => (Bike: x, Batch: batchOf[x.MotorBikeUnitId]))
            .Where(x => onHand.GetValueOrDefault(x.Batch.StockBatchId) > 0m)
            .ToList();
    }


    //===========================================================
    // Plan : the checked document with its batch split
    //===========================================================

    private sealed class PlanBatch
    {
        public long StockBatchId { get; set; }

        public string BatchNo { get; set; } = string.Empty;

        public decimal Quantity { get; set; }

        public decimal UnitCost { get; set; }

        public decimal Value { get; set; }

        public string InventoryLedgerCode { get; set; } = string.Empty;
    }

    private sealed class PlanUnit
    {
        public long MotorBikeUnitId { get; set; }

        public string ChassisNo { get; set; } = string.Empty;

        public string EngineNo { get; set; } = string.Empty;

        public long StockBatchId { get; set; }
    }

    private sealed class PlanLine
    {
        public ProductInfo Product { get; set; } = new();

        public decimal Quantity { get; set; }

        public decimal Available { get; set; }

        public long? RackId { get; set; }

        public int? ShelfNo { get; set; }

        public int? BinNo { get; set; }

        public bool SavePlace { get; set; }

        public string Notes { get; set; } = string.Empty;

        public decimal Value { get; set; }

        public List<PlanBatch> Batches { get; set; } = new();

        public List<PlanUnit> Units { get; set; } = new();
    }

    private sealed class Plan
    {
        public string Type { get; set; } = string.Empty;

        public DateOnly Date { get; set; }

        public WarehouseInfo From { get; set; } = new();

        public WarehouseInfo To { get; set; } = new();

        public bool InterBranch { get; set; }

        public string Remarks { get; set; } = string.Empty;

        public List<PlanLine> Lines { get; set; } = new();

        public decimal TotalQuantity { get; set; }

        public decimal TotalValue { get; set; }

        public string Route =>
            $"{From.Label} -> {To.Label}";
    }


    //===========================================================
    // Resolve : checks the input against the stock now and splits
    // each line into batches (Save and Post use it)
    //===========================================================

    private async Task<Plan>
        ResolveAsync
        (
            string type,
            CreateProductTransferDto dto,
            bool posting
        )
    {
        DateOnly date =
            ParseDate(dto.TransferDate, "The transfer date");

        if (posting && date > BusinessToday())
        {
            throw new InvalidOperationException(
                $"The transfer date is {date:dd-MMM-yyyy} : post the transfer on or after it.");
        }

        //=======================================================
        // Warehouses
        //=======================================================

        if (dto.FromWarehouseId <= 0)
        {
            throw new InvalidOperationException(
                "Choose the From warehouse.");
        }

        if (dto.ToWarehouseId <= 0)
        {
            throw new InvalidOperationException(
                "Choose the To warehouse.");
        }

        if (dto.FromWarehouseId == dto.ToWarehouseId)
        {
            throw new InvalidOperationException(
                "The From and To warehouses must be different.");
        }

        Dictionary<long, WarehouseInfo> warehouses =
            await WarehousesAsync(new List<long> { dto.FromWarehouseId, dto.ToWarehouseId });

        WarehouseInfo from =
            warehouses.GetValueOrDefault(dto.FromWarehouseId)
            ??
            throw new InvalidOperationException(
                "The From warehouse was not found.");

        WarehouseInfo to =
            warehouses.GetValueOrDefault(dto.ToWarehouseId)
            ??
            throw new InvalidOperationException(
                "The To warehouse was not found.");

        if (from.IsDeleted || !from.IsActive)
        {
            throw new InvalidOperationException(
                $"Warehouse {from.Name} is not active.");
        }

        if (to.IsDeleted || !to.IsActive)
        {
            throw new InvalidOperationException(
                $"Warehouse {to.Name} is not active.");
        }

        if (from.BranchId <= 0 || to.BranchId <= 0)
        {
            throw new InvalidOperationException(
                "Both warehouses must belong to a branch (General Settings › Warehouses).");
        }

        // The To warehouse's branch must run the type's business
        // line today (Business Configuration)
        HashSet<long> allowed =
            await BusinessLineAccess.AllowedWarehouseIdsAsync(
                _context,
                LineOf(type));

        if (!allowed.Contains(to.Id))
        {
            throw new InvalidOperationException(
                $"{to.BranchName} does not run the {LineOf(type)} business today (Business Configuration) : {to.Name} cannot receive {TitleOf(type).ToLowerInvariant()}.");
        }

        Plan plan =
            new()
            {
                Type = type,
                Date = date,
                From = from,
                To = to,
                InterBranch = from.BranchId != to.BranchId,
                Remarks = Limit(dto.Remarks, 500)
            };

        //=======================================================
        // Lines
        //=======================================================

        List<CreateProductTransferLineDto> inputs =
            (dto.Lines ?? new List<CreateProductTransferLineDto>())
                .Where(x => x != null)
                .ToList();

        if (inputs.Count == 0)
        {
            throw new InvalidOperationException(
                "Add at least one product to transfer.");
        }

        if (inputs.Count > MaxLines)
        {
            throw new InvalidOperationException(
                $"A transfer can have at most {MaxLines} products.");
        }

        if (inputs.Any(x => x.ProductId <= 0))
        {
            throw new InvalidOperationException(
                "A line has no product.");
        }

        List<long> productIds =
            inputs.Select(x => x.ProductId).Distinct().ToList();

        Dictionary<long, ProductInfo> products =
            (await ProductRowsAsync(type, productIds))
                .ToDictionary(x => x.Id);

        if (productIds.Count != inputs.Count)
        {
            long twice =
                inputs.GroupBy(x => x.ProductId).First(g => g.Count() > 1).Key;

            throw new InvalidOperationException(
                $"{products.GetValueOrDefault(twice)?.Name ?? "A product"} is added twice : keep one line per product.");
        }

        foreach (long productId in productIds)
        {
            if (!products.ContainsKey(productId))
            {
                throw new InvalidOperationException(
                    $"Product #{productId} was not found ({TitleOf(type)}).");
            }
        }

        // Stock on hand in the From warehouse, per batch
        Dictionary<long, decimal> onHand =
            await OnHandInWarehouseAsync(type, from.Id, productIds);

        List<StockBatchesEntity> batches =
            await BatchesFifoAsync(type, onHand.Keys.ToList());

        Dictionary<long, List<StockBatchesEntity>> batchesOf =
            batches
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => g.ToList());

        // Places (SP / AC) : racks of the To warehouse and their bins
        Dictionary<long, RackManagementEntity> racks =
            new();

        List<RackMapDto> rackMap =
            new();

        if (HasShelves(type))
        {
            List<long> rackIds =
                inputs
                    .Where(x => x.ToRackId.HasValue && x.ToRackId.Value > 0)
                    .Select(x => x.ToRackId!.Value)
                    .Distinct()
                    .ToList();

            racks =
                rackIds.Count == 0
                    ? new Dictionary<long, RackManagementEntity>()
                    : await _context
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

        // Bins chosen by the lines (one item per bin)
        HashSet<(long RackId, int Shelf, int Bin)> takenBins =
            new();

        //=======================================================
        // MB : the chosen bikes
        //=======================================================

        Dictionary<long, (MotorBikeUnitsEntity Bike, StockBatchesEntity Batch)> bikes =
            new();

        if (type == "MB")
        {
            List<long> allUnitIds =
                inputs
                    .SelectMany(x => x.UnitIds ?? new List<long>())
                    .ToList();

            if (allUnitIds.Count != allUnitIds.Distinct().Count())
            {
                throw new InvalidOperationException(
                    "A bike is chosen twice.");
            }

            List<long> unitIds =
                allUnitIds.Distinct().ToList();

            bikes =
                (await BikesInWarehouseAsync(from, productIds, unitIds, onHand))
                    .ToDictionary(x => x.Bike.MotorBikeUnitId);

            List<long> missing =
                unitIds.Where(x => !bikes.ContainsKey(x)).ToList();

            if (missing.Count > 0)
            {
                List<string> chassis =
                    await _context
                        .Set<MotorBikeUnitsEntity>()
                        .AsNoTracking()
                        .Where(x => missing.Contains(x.MotorBikeUnitId))
                        .Select(x => x.ChassisNo)
                        .ToListAsync();

                throw new InvalidOperationException(
                    chassis.Count > 0
                        ? $"Bike {string.Join(", ", chassis.Take(5))} is no longer in stock in {from.Name} (sold, moved or not received). Remove it and choose again."
                        : "A chosen bike was not found. Choose the bikes again.");
            }
        }

        //=======================================================
        // Each line
        //=======================================================

        foreach (CreateProductTransferLineDto input in inputs)
        {
            ProductInfo product =
                products[input.ProductId];

            List<StockBatchesEntity> productBatches =
                batchesOf.GetValueOrDefault(product.Id) ?? new List<StockBatchesEntity>();

            decimal available =
                productBatches.Sum(x => onHand.GetValueOrDefault(x.StockBatchId));

            PlanLine line =
                new()
                {
                    Product = product,
                    Available = available,
                    Notes = Limit(input.Notes, 200)
                };

            if (type == "MB")
            {
                List<long> unitIds =
                    (input.UnitIds ?? new List<long>()).Distinct().ToList();

                if (unitIds.Count == 0)
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : choose the bikes to transfer (by chassis no).");
                }

                List<(MotorBikeUnitsEntity Bike, StockBatchesEntity Batch)> chosen =
                    unitIds.Select(x => bikes[x]).ToList();

                MotorBikeUnitsEntity? other =
                    chosen.Select(x => x.Bike).FirstOrDefault(x => x.ProductId != product.Id);

                if (other != null)
                {
                    throw new InvalidOperationException(
                        $"Bike {other.ChassisNo} is not a {product.Name}.");
                }

                line.Quantity = chosen.Count;

                line.Units =
                    chosen
                        .OrderBy(x => x.Bike.ChassisNo)
                        .Select
                        (
                            x =>
                                new PlanUnit
                                {
                                    MotorBikeUnitId = x.Bike.MotorBikeUnitId,
                                    ChassisNo = x.Bike.ChassisNo,
                                    EngineNo = x.Bike.EngineNo,
                                    StockBatchId = x.Batch.StockBatchId
                                }
                        )
                        .ToList();

                foreach (var group in chosen.GroupBy(x => x.Batch.StockBatchId).OrderBy(g => g.First().Batch.SourceDate).ThenBy(g => g.Key))
                {
                    StockBatchesEntity batch =
                        group.First().Batch;

                    decimal count =
                        group.Count();

                    decimal there =
                        onHand.GetValueOrDefault(batch.StockBatchId);

                    if (count > there)
                    {
                        throw new InvalidOperationException(
                            $"{product.Name} : batch {batch.BatchNo} has only {Qty(there)} on hand in {from.Name}, {Qty(count)} bikes chosen.");
                    }

                    line.Batches.Add(
                        new PlanBatch
                        {
                            StockBatchId = batch.StockBatchId,
                            BatchNo = batch.BatchNo,
                            Quantity = count,
                            UnitCost = batch.UnitCost,
                            Value = Money(count * batch.UnitCost),
                            InventoryLedgerCode = batch.InventoryLedgerCode
                        });
                }
            }
            else
            {
                decimal quantity =
                    input.Quantity;

                if (quantity <= 0m)
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : enter the quantity to transfer.");
                }

                if (quantity != Math.Round(quantity, 2))
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : the quantity can have at most 2 decimals.");
                }

                if (quantity > available)
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : only {Qty(available)} {product.Unit} on hand in {from.Name}.");
                }

                line.Quantity = quantity;

                // FIFO : oldest batch first
                decimal left =
                    quantity;

                foreach (StockBatchesEntity batch in productBatches)
                {
                    if (left <= 0m)
                    {
                        break;
                    }

                    decimal there =
                        onHand.GetValueOrDefault(batch.StockBatchId);

                    if (there <= 0m)
                    {
                        continue;
                    }

                    decimal take =
                        Math.Min(there, left);

                    line.Batches.Add(
                        new PlanBatch
                        {
                            StockBatchId = batch.StockBatchId,
                            BatchNo = batch.BatchNo,
                            Quantity = take,
                            UnitCost = batch.UnitCost,
                            Value = Money(take * batch.UnitCost),
                            InventoryLedgerCode = batch.InventoryLedgerCode
                        });

                    left -= take;
                }

                if (left > 0m)
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : only {Qty(quantity - left)} {product.Unit} on hand in {from.Name}.");
                }

                //===================================================
                // Place in the To warehouse
                //===================================================

                long rackId =
                    input.ToRackId ?? 0;

                if (rackId > 0)
                {
                    if (!racks.TryGetValue(rackId, out RackManagementEntity? rack) || rack.WarehouseId != to.Id)
                    {
                        throw new InvalidOperationException(
                            $"{product.Name} : the rack is not in {to.Name}.");
                    }

                    if (!rack.IsActive)
                    {
                        throw new InvalidOperationException(
                            $"{product.Name} : rack {RackText(rack.RackCode, rack.RackName)} is not active.");
                    }

                    int shelf =
                        input.ToShelfNo ?? 0;

                    int bin =
                        BinOf(input.ToBinNo ?? 0);

                    // Rack -> Shelf -> Bin : a free bin (or the
                    // product's own) in the To warehouse
                    string? problem =
                        BinProblem(
                            BinOccupancy.FindRack(rackMap, rackId),
                            to.Id,
                            shelf,
                            bin,
                            type,
                            product.Id);

                    if (problem != null)
                    {
                        throw new InvalidOperationException(
                            $"{product.Name} : {problem}");
                    }

                    if (!takenBins.Add((rackId, shelf, bin)))
                    {
                        throw new InvalidOperationException(
                            $"{product.Name} : bin {RackLabels.BinCode(rack.RackName, shelf, bin)} is chosen for another product too (one item per bin).");
                    }

                    line.RackId = rackId;

                    line.ShelfNo = shelf;

                    line.BinNo = bin;

                    line.SavePlace = input.SavePlace;
                }
                else if (input.SavePlace)
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : choose the rack, shelf and bin to save this place.");
                }
            }

            line.Value =
                line.Batches.Sum(x => x.Value);

            plan.Lines.Add(line);
        }

        plan.TotalQuantity =
            plan.Lines.Sum(x => x.Quantity);

        plan.TotalValue =
            plan.Lines.Sum(x => x.Value);

        return plan;
    }

    //===========================================================
    // Draft : header, children
    //===========================================================

    private static void FillHeader
    (
        ProductTransfer entity,
        Plan plan
    )
    {
        entity.PageType = plan.Type;
        entity.TransferDate = plan.Date;
        entity.FromWarehouseId = plan.From.Id;
        entity.FromBranchId = plan.From.BranchId;
        entity.ToWarehouseId = plan.To.Id;
        entity.ToBranchId = plan.To.BranchId;
        entity.IsInterBranch = plan.InterBranch;
        entity.Remarks = plan.Remarks;
        entity.LineCount = plan.Lines.Count;
        entity.TotalQuantity = plan.TotalQuantity;
        entity.TotalValue = plan.TotalValue;
    }

    // The lines, batches and bikes again (saves : the line ids are
    // needed); returns each saved line with its plan
    private async Task<List<(ProductTransferLines Line, PlanLine Plan)>>
        WriteChildrenAsync
        (
            long productTransferId,
            Plan plan
        )
    {
        _context.Set<ProductTransferUnits>().RemoveRange(
            await _context
                .Set<ProductTransferUnits>()
                .Where(x => x.ProductTransferId == productTransferId)
                .ToListAsync());

        _context.Set<ProductTransferBatches>().RemoveRange(
            await _context
                .Set<ProductTransferBatches>()
                .Where(x => x.ProductTransferId == productTransferId)
                .ToListAsync());

        _context.Set<ProductTransferLines>().RemoveRange(
            await _context
                .Set<ProductTransferLines>()
                .Where(x => x.ProductTransferId == productTransferId)
                .ToListAsync());

        List<(ProductTransferLines Line, PlanLine Plan)> saved =
            new();

        int lineNo = 0;

        foreach (PlanLine planLine in plan.Lines)
        {
            lineNo++;

            ProductTransferLines line =
                new()
                {
                    ProductTransferId = productTransferId,
                    LineNo = lineNo,
                    ProductId = planLine.Product.Id,
                    ProductCode = Limit(planLine.Product.Code, 40),
                    ProductName = Limit(planLine.Product.Name, 250),
                    PartNumber = Limit(planLine.Product.PartNumber, 100),
                    Unit = Limit(planLine.Product.Unit, 20),
                    Quantity = planLine.Quantity,
                    UnitCostAvg = planLine.Quantity > 0m ? Round4(planLine.Value / planLine.Quantity) : 0m,
                    Value = planLine.Value,
                    ToRackId = planLine.RackId,
                    ToShelfNo = planLine.ShelfNo,
                    ToBinNo = planLine.BinNo,
                    SavePlace = planLine.SavePlace,
                    Notes = planLine.Notes
                };

            _context.Set<ProductTransferLines>().Add(line);

            saved.Add((line, planLine));
        }

        await _context.SaveChangesAsync();

        foreach ((ProductTransferLines line, PlanLine planLine) in saved)
        {
            foreach (PlanBatch batch in planLine.Batches)
            {
                _context.Set<ProductTransferBatches>().Add(
                    new ProductTransferBatches
                    {
                        ProductTransferId = productTransferId,
                        ProductTransferLineId = line.ProductTransferLineId,
                        StockBatchId = batch.StockBatchId,
                        BatchNo = Limit(batch.BatchNo, 40),
                        Quantity = batch.Quantity,
                        UnitCost = batch.UnitCost,
                        Value = batch.Value
                    });
            }

            foreach (PlanUnit unit in planLine.Units)
            {
                _context.Set<ProductTransferUnits>().Add(
                    new ProductTransferUnits
                    {
                        ProductTransferId = productTransferId,
                        ProductTransferLineId = line.ProductTransferLineId,
                        MotorBikeUnitId = unit.MotorBikeUnitId,
                        ChassisNo = Limit(unit.ChassisNo, 60),
                        EngineNo = Limit(unit.EngineNo, 60),
                        StockBatchId = unit.StockBatchId
                    });
            }
        }

        return saved;
    }

    // The saved draft as input (Post checks it again)
    private async Task<CreateProductTransferDto>
        SavedInputAsync
        (
            ProductTransfer entity
        )
    {
        List<ProductTransferLines> lines =
            await _context
                .Set<ProductTransferLines>()
                .AsNoTracking()
                .Where(x => x.ProductTransferId == entity.ProductTransferId)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        List<ProductTransferUnits> units =
            await _context
                .Set<ProductTransferUnits>()
                .AsNoTracking()
                .Where(x => x.ProductTransferId == entity.ProductTransferId)
                .ToListAsync();

        return new CreateProductTransferDto
        {
            Type = entity.PageType,
            TransferDate = DateText(entity.TransferDate),
            FromWarehouseId = entity.FromWarehouseId,
            ToWarehouseId = entity.ToWarehouseId,
            Remarks = entity.Remarks,
            Lines =
                lines
                    .Select
                    (
                        x =>
                            new CreateProductTransferLineDto
                            {
                                ProductId = x.ProductId,
                                Quantity = x.Quantity,
                                UnitIds =
                                    units
                                        .Where(u => u.ProductTransferLineId == x.ProductTransferLineId)
                                        .Select(u => u.MotorBikeUnitId)
                                        .ToList(),
                                ToRackId = x.ToRackId,
                                ToShelfNo = x.ToShelfNo,
                                ToBinNo = x.ToBinNo,
                                SavePlace = x.SavePlace,
                                Notes = x.Notes
                            }
                    )
                    .ToList()
        };
    }


    //===========================================================
    // Read : list (deleted drafts included, for Restore)
    //===========================================================

    public async Task<List<ProductTransferListRowDto>>
        GetAllAsync
        (
            string? pageType
        )
    {
        string type =
            (pageType ?? string.Empty).Trim().ToUpperInvariant();

        List<ProductTransfer> rows =
            await _context
                .Set<ProductTransfer>()
                .AsNoTracking()
                .Where(x => type == string.Empty || x.PageType == type)
                .OrderByDescending(x => x.CreatedDate)
                .ThenByDescending(x => x.ProductTransferId)
                .ToListAsync();

        return await MapListRowsAsync(rows);
    }


    //===========================================================
    // List rows : one row per document (shared by the full list
    // and the paged list)
    //===========================================================

    private async Task<List<ProductTransferListRowDto>>
        MapListRowsAsync
        (
            List<ProductTransfer> rows
        )
    {

        Dictionary<long, WarehouseInfo> warehouses =
            await WarehousesAsync(
                rows.SelectMany(x => new[] { x.FromWarehouseId, x.ToWarehouseId }).Distinct().ToList());

        Dictionary<long, string> users =
            await UserNamesAsync(rows.Select(x => x.CreatedBy));

        return rows
            .Select
            (
                x =>
                {
                    WarehouseInfo? from =
                        warehouses.GetValueOrDefault(x.FromWarehouseId);

                    WarehouseInfo? to =
                        warehouses.GetValueOrDefault(x.ToWarehouseId);

                    return new ProductTransferListRowDto
                    {
                        Id = x.ProductTransferId,
                        PublicId = x.PublicId,
                        TransferNo = x.TransferNo,
                        PageType = x.PageType,
                        TransferDate = DateText(x.TransferDate),
                        FromWarehouseId = x.FromWarehouseId,
                        FromWarehouseName = from?.Name ?? string.Empty,
                        FromBranchId = x.FromBranchId,
                        FromBranchName = from?.BranchName ?? string.Empty,
                        ToWarehouseId = x.ToWarehouseId,
                        ToWarehouseName = to?.Name ?? string.Empty,
                        ToBranchId = x.ToBranchId,
                        ToBranchName = to?.BranchName ?? string.Empty,
                        IsInterBranch = x.IsInterBranch,
                        Status = x.Status,
                        LineCount = x.LineCount,
                        TotalQuantity = x.TotalQuantity,
                        TotalValue = x.TotalValue,
                        VoucherNo = x.VoucherNo,
                        Remarks = x.Remarks,
                        IsDeleted = x.IsDeleted,
                        CreatedByName = users.GetValueOrDefault(x.CreatedBy, string.Empty),
                        CreatedDate = DateText(x.CreatedDate),
                        PostedDate = DateText(x.PostedDate),
                        ReceiveDate = DateText(x.ReceiveDate)
                    };
                }
            )
            .ToList();
    }


    //===========================================================
    // Read : one document
    //===========================================================

    public async Task<ProductTransferDto?>
        GetByIdAsync
        (
            long id,
            long currentBranchId
        )
    {
        ProductTransfer? entity =
            await _context
                .Set<ProductTransfer>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ProductTransferId == id);

        if (entity == null)
        {
            return null;
        }

        List<ProductTransferLines> lines =
            await _context
                .Set<ProductTransferLines>()
                .AsNoTracking()
                .Where(x => x.ProductTransferId == id)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        List<ProductTransferBatches> batchRows =
            await _context
                .Set<ProductTransferBatches>()
                .AsNoTracking()
                .Where(x => x.ProductTransferId == id)
                .OrderBy(x => x.ProductTransferBatchId)
                .ToListAsync();

        List<ProductTransferUnits> units =
            await _context
                .Set<ProductTransferUnits>()
                .AsNoTracking()
                .Where(x => x.ProductTransferId == id)
                .OrderBy(x => x.ChassisNo)
                .ToListAsync();

        Dictionary<long, WarehouseInfo> warehouses =
            await WarehousesAsync(new List<long> { entity.FromWarehouseId, entity.ToWarehouseId });

        WarehouseInfo? from =
            warehouses.GetValueOrDefault(entity.FromWarehouseId);

        WarehouseInfo? to =
            warehouses.GetValueOrDefault(entity.ToWarehouseId);

        Dictionary<long, string> users =
            await UserNamesAsync(
                new[] { entity.CreatedBy, entity.PostedBy ?? 0, entity.ReceivedBy ?? 0, entity.CancelledBy ?? 0 });

        // Batch numbers of the bikes
        List<long> unitBatchIds =
            units.Select(x => x.StockBatchId).Distinct().ToList();

        Dictionary<long, string> batchNos =
            unitBatchIds.Count == 0
                ? new Dictionary<long, string>()
                : await _context
                    .Set<StockBatchesEntity>()
                    .AsNoTracking()
                    .Where(x => unitBatchIds.Contains(x.StockBatchId))
                    .ToDictionaryAsync(x => x.StockBatchId, x => x.BatchNo);

        // Racks of the places
        List<long> rackIds =
            lines
                .Where(x => x.ToRackId.HasValue)
                .Select(x => x.ToRackId!.Value)
                .Distinct()
                .ToList();

        var racks =
            rackIds.Count == 0
                ? new Dictionary<long, (string Code, string Name)>()
                : (
                    await _context
                        .Set<RackManagementEntity>()
                        .AsNoTracking()
                        .Where(x => rackIds.Contains(x.RackManagementId))
                        .Select(x => new { x.RackManagementId, x.RackCode, x.RackName })
                        .ToListAsync()
                  )
                  .ToDictionary(x => x.RackManagementId, x => (Code: x.RackCode, Name: x.RackName));

        bool draft =
            entity.Status == StatusDraft && !entity.IsDeleted;

        // Draft : what the From warehouse holds now (per product)
        Dictionary<long, decimal> available =
            new();

        if (draft && lines.Count > 0)
        {
            List<long> productIds =
                lines.Select(x => x.ProductId).Distinct().ToList();

            Dictionary<long, decimal> onHand =
                await OnHandInWarehouseAsync(entity.PageType, entity.FromWarehouseId, productIds);

            List<long> batchIds =
                onHand.Keys.ToList();

            Dictionary<long, long> productOfBatch =
                batchIds.Count == 0
                    ? new Dictionary<long, long>()
                    : await _context
                        .Set<StockBatchesEntity>()
                        .AsNoTracking()
                        .Where(x => batchIds.Contains(x.StockBatchId) && x.Status != BatchCancelled)
                        .ToDictionaryAsync(x => x.StockBatchId, x => x.ProductId);

            available =
                onHand
                    .Where(x => productOfBatch.ContainsKey(x.Key))
                    .GroupBy(x => productOfBatch[x.Key])
                    .ToDictionary(g => g.Key, g => g.Sum(x => x.Value));
        }

        bool posted =
            !entity.IsDeleted
            &&
            (entity.Status == StatusCompleted || entity.Status == StatusInTransit || entity.Status == StatusReceived);

        string blocker =
            posted
                ? await CancelBlockerAsync(entity, batchRows, units)
                : string.Empty;

        ProductTransferDto dto =
            new()
            {
                Id = entity.ProductTransferId,
                PublicId = entity.PublicId,
                ProductTransferId = entity.ProductTransferId,
                TransferNo = entity.TransferNo,
                PageType = entity.PageType,
                TransferDate = DateText(entity.TransferDate),
                FromWarehouseId = entity.FromWarehouseId,
                FromWarehouseCode = from?.Code ?? string.Empty,
                FromWarehouseName = from?.Name ?? string.Empty,
                FromBranchId = entity.FromBranchId,
                FromBranchName = from?.BranchName ?? string.Empty,
                ToWarehouseId = entity.ToWarehouseId,
                ToWarehouseCode = to?.Code ?? string.Empty,
                ToWarehouseName = to?.Name ?? string.Empty,
                ToBranchId = entity.ToBranchId,
                ToBranchName = to?.BranchName ?? string.Empty,
                IsInterBranch = entity.IsInterBranch,
                Remarks = entity.Remarks,
                Status = entity.Status,
                LineCount = entity.LineCount,
                TotalQuantity = entity.TotalQuantity,
                TotalValue = entity.TotalValue,
                VoucherNo = entity.VoucherNo,
                IsDeleted = entity.IsDeleted,
                CreatedByName = users.GetValueOrDefault(entity.CreatedBy, string.Empty),
                CreatedDate = DateTimeText(entity.CreatedDate),
                PostedByName = users.GetValueOrDefault(entity.PostedBy ?? 0, string.Empty),
                PostedDate = DateTimeText(entity.PostedDate),
                ReceivedByName = users.GetValueOrDefault(entity.ReceivedBy ?? 0, string.Empty),
                ReceivedDate = DateTimeText(entity.ReceivedDate),
                ReceiveDate = DateText(entity.ReceiveDate),
                CancelledByName = users.GetValueOrDefault(entity.CancelledBy ?? 0, string.Empty),
                CancelledDate = DateTimeText(entity.CancelledDate),
                CancelReason = entity.CancelReason,
                CanEdit = draft,
                CanPost = draft,
                CanReceive =
                    entity.Status == StatusInTransit
                    &&
                    !entity.IsDeleted
                    &&
                    currentBranchId > 0
                    &&
                    currentBranchId == entity.ToBranchId,
                CanCancel = posted && blocker.Length == 0,
                CancelBlockedReason = blocker
            };

        dto.Lines =
            lines
                .Select
                (
                    x =>
                    {
                        (string Code, string Name) rack =
                            x.ToRackId.HasValue && racks.TryGetValue(x.ToRackId.Value, out var found)
                                ? found
                                : (Code: string.Empty, Name: string.Empty);

                        string shelfLabel =
                            x.ToShelfNo.HasValue && x.ToShelfNo.Value > 0
                                ? RackLabels.Shelf(rack.Name, x.ToShelfNo.Value)
                                : string.Empty;

                        string binCode =
                            x.ToShelfNo.HasValue && x.ToShelfNo.Value > 0
                                ? RackLabels.BinCode(rack.Name, x.ToShelfNo.Value, x.ToBinNo ?? 1)
                                : string.Empty;

                        List<ProductTransferUnits> lineUnits =
                            units.Where(u => u.ProductTransferLineId == x.ProductTransferLineId).ToList();

                        return new ProductTransferLineDto
                        {
                            ProductTransferLineId = x.ProductTransferLineId,
                            LineNo = x.LineNo,
                            ProductId = x.ProductId,
                            ProductCode = x.ProductCode,
                            ProductName = x.ProductName,
                            PartNumber = x.PartNumber,
                            Unit = x.Unit,
                            Quantity = x.Quantity,
                            UnitCostAvg = x.UnitCostAvg,
                            Value = x.Value,
                            Available = available.GetValueOrDefault(x.ProductId),
                            ToRackId = x.ToRackId,
                            ToRackName = rack.Name,
                            ToShelfNo = x.ToShelfNo,
                            ToShelfLabel = shelfLabel,
                            ToBinNo = x.ToBinNo,
                            ToBinCode = binCode,
                            Place =
                                rack.Name.Length == 0
                                    ? string.Empty
                                    : binCode.Length > 0
                                        ? $"{rack.Name} · {binCode}"
                                        : rack.Name,
                            SavePlace = x.SavePlace,
                            Notes = x.Notes,
                            UnitIds = lineUnits.Select(u => u.MotorBikeUnitId).ToList(),
                            Batches =
                                batchRows
                                    .Where(b => b.ProductTransferLineId == x.ProductTransferLineId)
                                    .Select
                                    (
                                        b =>
                                            new ProductTransferBatchDto
                                            {
                                                ProductTransferBatchId = b.ProductTransferBatchId,
                                                StockBatchId = b.StockBatchId,
                                                BatchNo = b.BatchNo,
                                                Quantity = b.Quantity,
                                                UnitCost = b.UnitCost,
                                                Value = b.Value
                                            }
                                    )
                                    .ToList(),
                            Units =
                                lineUnits
                                    .Select
                                    (
                                        u =>
                                            new ProductTransferUnitDto
                                            {
                                                ProductTransferUnitId = u.ProductTransferUnitId,
                                                MotorBikeUnitId = u.MotorBikeUnitId,
                                                ChassisNo = u.ChassisNo,
                                                EngineNo = u.EngineNo,
                                                StockBatchId = u.StockBatchId,
                                                BatchNo = batchNos.GetValueOrDefault(u.StockBatchId, string.Empty)
                                            }
                                    )
                                    .ToList()
                        };
                    }
                )
                .ToList();

        return dto;
    }


    //===========================================================
    // Defaults : next number, warehouses, brands, login branch
    //===========================================================

    public async Task<ProductTransferDefaultsDto>
        GetDefaultsAsync
        (
            string pageType,
            long currentBranchId
        )
    {
        string type =
            TypeOf(pageType);

        int last =
            await _context
                .Set<ProductTransfer>()
                .AsNoTracking()
                .Where(x => x.PageType == type)
                .Select(x => (int?)x.SequenceNo)
                .MaxAsync()
            ??
            0;

        ProductTransferDefaultsDto result =
            new()
            {
                PageType = type,
                Today = DateText(BusinessToday()),
                NextNo = NumberOf(type, last + 1),
                CurrentBranchId = Math.Max(0, currentBranchId)
            };

        HashSet<long> allowed =
            await BusinessLineAccess.AllowedWarehouseIdsAsync(
                _context,
                LineOf(type));

        List<WarehouseInfo> warehouses =
            (await WarehousesAsync(null)).Values
                .Where(x => !x.IsDeleted && x.IsActive)
                .ToList();

        // Warehouses that still hold stock of the type (on hand > 0)
        HashSet<long> holding =
            (
                await _context
                    .Set<StockMovementsEntity>()
                    .AsNoTracking()
                    .Where(x => x.ProductType == type && x.Bucket == BucketOnHand && x.WarehouseId != null)
                    .GroupBy(x => x.WarehouseId!.Value)
                    .Select(g => new { WarehouseId = g.Key, Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut) })
                    .Where(x => x.Quantity > 0m)
                    .Select(x => x.WarehouseId)
                    .ToListAsync()
            )
            .ToHashSet();

        result.CurrentBranchName =
            currentBranchId > 0
                ? await _context
                    .Set<BranchesEntity>()
                    .AsNoTracking()
                    .Where(x => x.BranchId == currentBranchId)
                    .Select(x => x.BranchName)
                    .FirstOrDefaultAsync()
                  ?? string.Empty
                : string.Empty;

        result.Warehouses =
            warehouses
                .OrderBy(x => x.BranchName)
                .ThenByDescending(x => x.IsDefault)
                .ThenBy(x => x.Name)
                .Select
                (
                    x =>
                        new ProductTransferWarehouseOptionDto
                        {
                            Id = x.Id,
                            Code = x.Code,
                            Name = x.Name,
                            BranchId = x.BranchId,
                            BranchName = x.BranchName,
                            // No central flag on Warehouses yet
                            IsCentral = false,
                            IsDefault = x.IsDefault,
                            CanReceiveType = allowed.Contains(x.Id),
                            HoldsTypeStock = holding.Contains(x.Id)
                        }
                )
                .ToList();

        List<ProductInfo> products =
            await ProductRowsAsync(type, null);

        result.Brands =
            products
                .Where(x => x.BrandId != 0 && x.BrandName.Length > 0)
                .GroupBy(x => x.BrandId)
                .Select(g => new ProductTransferBrandOptionDto { Id = g.Key, Name = g.First().BrandName })
                .OrderBy(x => x.Name)
                .ToList();

        return result;
    }


    //===========================================================
    // Stock on hand in a warehouse : products, batches (FIFO
    // order), bikes
    //===========================================================

    public async Task<List<ProductTransferStockProductDto>>
        GetStockAsync
        (
            string pageType,
            long warehouseId
        )
    {
        string type =
            TypeOf(pageType);

        if (warehouseId <= 0)
        {
            return new List<ProductTransferStockProductDto>();
        }

        WarehouseInfo warehouse =
            (await WarehousesAsync(new List<long> { warehouseId })).GetValueOrDefault(warehouseId)
            ??
            throw new KeyNotFoundException("Warehouse not found.");

        Dictionary<long, decimal> onHand =
            await OnHandInWarehouseAsync(type, warehouseId, null);

        List<StockBatchesEntity> batches =
            await BatchesFifoAsync(type, onHand.Keys.ToList());

        List<long> productIds =
            batches.Select(x => x.ProductId).Distinct().ToList();

        if (productIds.Count == 0)
        {
            return new List<ProductTransferStockProductDto>();
        }

        Dictionary<long, ProductInfo> products =
            (await ProductRowsAsync(type, productIds))
                .ToDictionary(x => x.Id);

        Dictionary<long, List<(MotorBikeUnitsEntity Bike, StockBatchesEntity Batch)>> bikesOf =
            new();

        if (type == "MB")
        {
            bikesOf =
                (await BikesInWarehouseAsync(warehouse, productIds, null, onHand))
                    .GroupBy(x => x.Bike.ProductId)
                    .ToDictionary(g => g.Key, g => g.ToList());
        }

        List<ProductTransferStockProductDto> result =
            new();

        foreach (IGrouping<long, StockBatchesEntity> group in batches.GroupBy(x => x.ProductId))
        {
            if (!products.TryGetValue(group.Key, out ProductInfo? product))
            {
                continue;
            }

            ProductTransferStockProductDto row =
                new()
                {
                    ProductId = product.Id,
                    Code = product.Code,
                    Name = product.Name,
                    PartNumber = product.PartNumber,
                    Unit = product.Unit,
                    BrandId = product.BrandId,
                    BrandName = product.BrandName,
                    CategoryId = product.CategoryId,
                    CategoryName = product.CategoryName,
                    Batches =
                        group
                            .Select
                            (
                                x =>
                                    new ProductTransferStockBatchDto
                                    {
                                        StockBatchId = x.StockBatchId,
                                        BatchNo = x.BatchNo,
                                        Available = onHand.GetValueOrDefault(x.StockBatchId),
                                        UnitCost = x.UnitCost,
                                        Mrp = x.Mrp,
                                        SourceDate = DateText(x.SourceDate)
                                    }
                            )
                            .ToList()
                };

            if (type == "MB")
            {
                List<(MotorBikeUnitsEntity Bike, StockBatchesEntity Batch)> bikes =
                    bikesOf.GetValueOrDefault(product.Id) ?? new List<(MotorBikeUnitsEntity Bike, StockBatchesEntity Batch)>();

                // A bike model on hand without bikes found : nothing
                // can be chosen
                if (bikes.Count == 0)
                {
                    continue;
                }

                row.Units =
                    bikes
                        .Select
                        (
                            x =>
                                new ProductTransferStockUnitDto
                                {
                                    MotorBikeUnitId = x.Bike.MotorBikeUnitId,
                                    ChassisNo = x.Bike.ChassisNo,
                                    EngineNo = x.Bike.EngineNo,
                                    Color = string.Empty,
                                    StockBatchId = x.Batch.StockBatchId,
                                    BatchNo = x.Batch.BatchNo
                                }
                        )
                        .ToList();

                row.Available = row.Units.Count;
            }
            else
            {
                row.Available = row.Batches.Sum(x => x.Available);
            }

            result.Add(row);
        }

        return result
            .OrderBy(x => x.BrandName)
            .ThenBy(x => x.Name)
            .ToList();
    }


    //===========================================================
    // Places : the products' saved places in a warehouse, and its
    // racks with the free shelves (one item per shelf)
    //===========================================================

    public async Task<ProductTransferPlacesDto>
        GetPlacesAsync
        (
            string pageType,
            long warehouseId,
            string? productIds
        )
    {
        string type =
            TypeOf(pageType);

        ProductTransferPlacesDto result =
            new();

        if (!HasShelves(type) || warehouseId <= 0)
        {
            return result;
        }

        List<long> ids =
            (productIds ?? string.Empty)
                .Split(new[] { ',', ';', ' ' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(x => long.TryParse(x, NumberStyles.Integer, CultureInfo.InvariantCulture, out long value) ? value : 0)
                .Where(x => x > 0)
                .Distinct()
                .ToList();

        // Every active rack of the warehouse with its shelves, bins
        // and holders (one item per bin, spare parts and accessories)
        List<RackMapDto> map =
            await BinOccupancy.GetRackMapAsync(
                _context,
                warehouseId,
                0,
                0,
                true);

        string ownType =
            HolderTypeOf(type);

        foreach (RackMapDto rack in map)
        {
            List<ProductTransferShelfDto> shelves =
                rack.Shelves
                    .Select
                    (
                        shelf =>
                        {
                            RackMapBinDto? first =
                                shelf.Bins.FirstOrDefault(x => x.Holder != null);

                            return new ProductTransferShelfDto
                            {
                                ShelfNo = shelf.ShelfNumber,
                                Label = shelf.ShelfLabel,
                                BinCount = shelf.BinCount,
                                FreeBins = shelf.FreeBins,
                                IsFree = shelf.FreeBins > 0,
                                IsPrime = shelf.IsPrime,
                                HeldByType = first?.Holder?.ItemType ?? string.Empty,
                                HeldById = first?.Holder?.ItemId ?? 0,
                                HeldByCode = first?.Holder?.ProductCode ?? string.Empty,
                                HeldByName = first?.Holder?.ItemName ?? string.Empty,
                                Bins =
                                    shelf.Bins
                                        .Select
                                        (
                                            bin =>
                                                new ProductTransferBinDto
                                                {
                                                    BinNo = bin.BinNumber,
                                                    BinCode = bin.BinCode,
                                                    BinLabel = bin.BinLabel,
                                                    IsFree = bin.IsFree,
                                                    HeldByType = bin.Holder?.ItemType ?? string.Empty,
                                                    HeldById = bin.Holder?.ItemId ?? 0,
                                                    HeldByCode = bin.Holder?.ProductCode ?? string.Empty,
                                                    HeldByName = bin.Holder?.ItemName ?? string.Empty,
                                                    IsOwnType = bin.Holder != null && bin.Holder.ItemType == ownType
                                                }
                                        )
                                        .ToList()
                            };
                        }
                    )
                    .ToList();

            bool full =
                rack.TotalBins > 0 && rack.FreeBins == 0;

            result.Racks.Add(
                new ProductTransferRackDto
                {
                    Id = rack.RackManagementId,
                    Code = rack.RackCode,
                    Name = rack.RackName,
                    DisplayName = RackText(rack.RackCode, rack.RackName) + (full ? " (Full)" : string.Empty),
                    ZoneCode = rack.ZoneCode,
                    ZoneName = rack.ZoneName,
                    ZonePriority = rack.ZonePriority,
                    AssignmentText = rack.AssignmentText,
                    ShelfCount = rack.ShelfCount,
                    TotalBins = rack.TotalBins,
                    FreeBinCount = rack.FreeBins,
                    FreeShelves = shelves.Where(x => x.IsFree).Select(x => x.ShelfNo).ToList(),
                    IsFull = full,
                    Shelves = shelves
                });
        }

        List<(long ProductId, long RackId, int Shelf, int Bin)> places =
            type == "SP"
                ? (
                    await _context
                        .Set<SparePartLocationsEntity>()
                        .AsNoTracking()
                        .Where(x => x.WarehouseId == warehouseId && (ids.Count == 0 || ids.Contains(x.SparePartId)))
                        .Select(x => new { x.SparePartId, x.RackManagementId, x.ShelfNumber, x.BinNumber })
                        .ToListAsync()
                  )
                  .Select(x => (x.SparePartId, x.RackManagementId, x.ShelfNumber, x.BinNumber))
                  .ToList()
                : (
                    await _context
                        .Set<AccessoryLocationsEntity>()
                        .AsNoTracking()
                        .Where(x => x.WarehouseId == warehouseId && (ids.Count == 0 || ids.Contains(x.AccessoryId)))
                        .Select(x => new { x.AccessoryId, x.RackManagementId, x.ShelfNumber, x.BinNumber })
                        .ToListAsync()
                  )
                  .Select(x => (x.AccessoryId, x.RackManagementId, x.ShelfNumber, x.BinNumber))
                  .ToList();

        Dictionary<long, RackMapDto> rackOf =
            map.ToDictionary(x => x.RackManagementId);

        result.Places =
            places
                .Where(x => rackOf.ContainsKey(x.RackId))
                .Select
                (
                    x =>
                        new ProductTransferPlaceDto
                        {
                            ProductId = x.ProductId,
                            RackId = x.RackId,
                            RackName = rackOf[x.RackId].RackName,
                            ShelfNo = x.Shelf,
                            ShelfLabel = RackLabels.Shelf(rackOf[x.RackId].RackName, x.Shelf),
                            BinNo = x.Bin,
                            BinCode = RackLabels.BinCode(rackOf[x.RackId].RackName, x.Shelf, x.Bin)
                        }
                )
                .ToList();

        return result;
    }


    //===========================================================
    // Draft : save / change / delete / restore
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateProductTransferDto dto,
            long userId
        )
    {
        if (dto == null)
        {
            throw new InvalidOperationException(
                "Add at least one product to transfer.");
        }

        string type =
            TypeOf(dto.Type);

        Plan plan =
            await ResolveAsync(type, dto, false);

        DateTime now =
            DateTime.UtcNow;

        string userName =
            await UserNameAsync(userId);

        ProductTransfer entity =
            new()
            {
                Status = StatusDraft,
                VoucherNo = string.Empty,
                CancelReason = string.Empty,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = now
            };

        FillHeader(entity, plan);

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
                        .Set<ProductTransfer>()
                        .Where(x => x.PageType == type)
                        .Select(x => (int?)x.SequenceNo)
                        .MaxAsync()
                    ??
                    0;

                entity.SequenceNo =
                    last + 1;

                entity.TransferNo =
                    NumberOf(type, entity.SequenceNo);

                _context.Set<ProductTransfer>().Add(entity);

                await _context.SaveChangesAsync();

                await WriteChildrenAsync(entity.ProductTransferId, plan);

                AddHistory(entity, plan.Route, "Create", "Saved", userId, userName, now);

                await _context.SaveChangesAsync();
            });

        return entity.ProductTransferId;
    }

    public async Task
        UpdateAsync
        (
            long id,
            UpdateProductTransferDto dto,
            long userId
        )
    {
        if (dto == null)
        {
            throw new InvalidOperationException(
                "Add at least one product to transfer.");
        }

        ProductTransfer entity =
            await _context
                .Set<ProductTransfer>()
                .FirstOrDefaultAsync(x => x.ProductTransferId == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException("Product transfer not found.");

        if (entity.Status != StatusDraft)
        {
            throw new InvalidOperationException(
                $"Product transfer {entity.TransferNo} is {entity.Status}; only a draft can be changed.");
        }

        // The type is fixed after the first save
        Plan plan =
            await ResolveAsync(entity.PageType, dto, false);

        DateTime now =
            DateTime.UtcNow;

        string userName =
            await UserNameAsync(userId);

        await InTransactionAsync(
            async () =>
            {
                FillHeader(entity, plan);

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                await WriteChildrenAsync(entity.ProductTransferId, plan);

                AddHistory(entity, plan.Route, "Update", "Updated", userId, userName, now);

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
        ProductTransfer entity =
            await _context
                .Set<ProductTransfer>()
                .FirstOrDefaultAsync(x => x.ProductTransferId == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException("Product transfer not found.");

        if (entity.Status != StatusDraft)
        {
            throw new InvalidOperationException(
                $"Product transfer {entity.TransferNo} is {entity.Status}; only a draft can be deleted (cancel a posted one).");
        }

        DateTime now =
            DateTime.UtcNow;

        entity.IsDeleted = true;

        entity.DeletedBy = userId;

        entity.DeletedDate = now;

        AddHistory(entity, await RouteTextAsync(entity), "Delete", "Deleted", userId, await UserNameAsync(userId), now);

        await _context.SaveChangesAsync();
    }

    public async Task
        RestoreAsync
        (
            long id,
            long userId
        )
    {
        ProductTransfer entity =
            await _context
                .Set<ProductTransfer>()
                .FirstOrDefaultAsync(x => x.ProductTransferId == id)
            ??
            throw new KeyNotFoundException("Product transfer not found.");

        if (!entity.IsDeleted)
        {
            throw new InvalidOperationException(
                $"Product transfer {entity.TransferNo} is not deleted.");
        }

        DateTime now =
            DateTime.UtcNow;

        entity.IsDeleted = false;

        entity.DeletedBy = null;

        entity.DeletedDate = null;

        entity.ModifiedBy = userId;

        entity.ModifiedDate = now;

        AddHistory(entity, await RouteTextAsync(entity), "Restore", "Restored", userId, await UserNameAsync(userId), now);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Movements
    //===========================================================

    private static StockMovementsEntity Movement
    (
        ProductTransfer entity,
        long lineId,
        long stockBatchId,
        long productId,
        decimal unitCost,
        long branchId,
        long? warehouseId,
        string bucket,
        decimal quantityIn,
        decimal quantityOut,
        decimal value,
        string movementType,
        DateOnly date,
        bool reversal,
        string narration,
        long userId,
        DateTime now
    )
    {
        return new StockMovementsEntity
        {
            StockBatchId = stockBatchId,
            ProductType = entity.PageType,
            ProductId = productId,
            BranchId = branchId,
            WarehouseId = warehouseId,
            Bucket = bucket,
            MovementType = movementType,
            QuantityIn = quantityIn,
            QuantityOut = quantityOut,
            UnitCost = unitCost,
            Value = value,
            DocumentType = VoucherTypes.ProductTransfer,
            DocumentId = entity.ProductTransferId,
            DocumentLineId = lineId,
            DocumentNo = entity.TransferNo,
            DocumentDate = date,
            IsReversal = reversal,
            Narration = Limit(narration, 300),
            CreatedBy = userId,
            CreatedDate = now
        };
    }

    // As Product Receiving : InTransit while anything of the batch
    // is in transit, else OnHand while anything is on hand
    // (Cancelled never changes)
    private static void SetBatchStatus(StockBatchesEntity batch)
    {
        if (batch.Status == BatchCancelled)
        {
            return;
        }

        batch.Status =
            batch.QuantityInTransit > 0m
                ? BatchInTransit
                : batch.QuantityOnHand > 0m
                    ? BatchOnHand
                    : batch.Status;
    }


    //===========================================================
    // Post : same branch → Completed; other branch → In Transit
    //===========================================================

    public async Task<string>
        PostAsync
        (
            long id,
            long userId
        )
    {
        ProductTransfer found =
            await _context
                .Set<ProductTransfer>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ProductTransferId == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException("Product transfer not found.");

        if (found.Status != StatusDraft)
        {
            throw new InvalidOperationException(
                $"Product transfer {found.TransferNo} is {found.Status}; only a draft can be posted.");
        }

        // The saved draft, checked again against the stock now
        CreateProductTransferDto input =
            await SavedInputAsync(found);

        DateTime now =
            DateTime.UtcNow;

        string userName =
            await UserNameAsync(userId);

        string status =
            string.Empty;

        await InTransactionAsync(
            async () =>
            {
                await LockTransferAsync(id);

                ProductTransfer entity =
                    await _context
                        .Set<ProductTransfer>()
                        .FirstAsync(x => x.ProductTransferId == id);

                if (entity.Status != StatusDraft || entity.IsDeleted)
                {
                    throw new InvalidOperationException(
                        $"Product transfer {entity.TransferNo} was changed meanwhile ({entity.Status}). Open it again.");
                }

                await LockProductBatchesAsync(
                    entity.PageType,
                    input.Lines.Select(x => x.ProductId).ToList());

                Plan plan =
                    await ResolveAsync(entity.PageType, input, true);

                FillHeader(entity, plan);

                List<(ProductTransferLines Line, PlanLine Plan)> saved =
                    await WriteChildrenAsync(entity.ProductTransferId, plan);

                List<long> batchIds =
                    plan.Lines
                        .SelectMany(x => x.Batches)
                        .Select(x => x.StockBatchId)
                        .Distinct()
                        .ToList();

                Dictionary<long, StockBatchesEntity> batches =
                    await _context
                        .Set<StockBatchesEntity>()
                        .Where(x => batchIds.Contains(x.StockBatchId))
                        .ToDictionaryAsync(x => x.StockBatchId);

                List<long> unitIds =
                    plan.Lines
                        .SelectMany(x => x.Units)
                        .Select(x => x.MotorBikeUnitId)
                        .ToList();

                List<MotorBikeUnitsEntity> bikes =
                    unitIds.Count == 0
                        ? new List<MotorBikeUnitsEntity>()
                        : await _context
                            .Set<MotorBikeUnitsEntity>()
                            .Where(x => unitIds.Contains(x.MotorBikeUnitId))
                            .ToListAsync();

                string narration =
                    $"Transfer {entity.TransferNo} : {plan.Route}"
                    + (entity.Remarks.Length > 0 ? $", {entity.Remarks}" : string.Empty);

                string extra;

                if (!plan.InterBranch)
                {
                    //===============================================
                    // Same branch : moved at once
                    //===============================================

                    foreach ((ProductTransferLines line, PlanLine planLine) in saved)
                    {
                        foreach (PlanBatch part in planLine.Batches)
                        {
                            StockBatchesEntity batch =
                                batches[part.StockBatchId];

                            _context.Set<StockMovementsEntity>().Add(
                                Movement(entity, line.ProductTransferLineId, batch.StockBatchId, batch.ProductId, batch.UnitCost,
                                    entity.FromBranchId, entity.FromWarehouseId, BucketOnHand, 0m, part.Quantity, part.Value,
                                    MoveTransfer, entity.TransferDate, false, narration, userId, now));

                            _context.Set<StockMovementsEntity>().Add(
                                Movement(entity, line.ProductTransferLineId, batch.StockBatchId, batch.ProductId, batch.UnitCost,
                                    entity.ToBranchId, entity.ToWarehouseId, BucketOnHand, part.Quantity, 0m, part.Value,
                                    MoveTransfer, entity.TransferDate, false, narration, userId, now));
                        }

                        if (planLine.SavePlace && planLine.RackId.HasValue)
                        {
                            await SaveShelfAsync(entity.PageType, line.ProductId, entity.ToWarehouseId, planLine.RackId.Value, planLine.ShelfNo ?? 0, planLine.BinNo ?? 1, userId, now);
                        }
                    }

                    foreach (MotorBikeUnitsEntity bike in bikes)
                    {
                        bike.WarehouseId = entity.ToWarehouseId;
                        bike.BranchId = entity.ToBranchId;
                        bike.ModifiedBy = userId;
                        bike.ModifiedDate = now;
                    }

                    entity.VoucherNo = string.Empty;

                    entity.Status = StatusCompleted;

                    extra = "Same branch : stock moved at once, no journal.";
                }
                else
                {
                    //===============================================
                    // Other branch : Send (into transit, owned by
                    // the receiving branch)
                    //===============================================

                    foreach ((ProductTransferLines line, PlanLine planLine) in saved)
                    {
                        foreach (PlanBatch part in planLine.Batches)
                        {
                            StockBatchesEntity batch =
                                batches[part.StockBatchId];

                            _context.Set<StockMovementsEntity>().Add(
                                Movement(entity, line.ProductTransferLineId, batch.StockBatchId, batch.ProductId, batch.UnitCost,
                                    entity.FromBranchId, entity.FromWarehouseId, BucketOnHand, 0m, part.Quantity, part.Value,
                                    MoveSend, entity.TransferDate, false, narration, userId, now));

                            _context.Set<StockMovementsEntity>().Add(
                                Movement(entity, line.ProductTransferLineId, batch.StockBatchId, batch.ProductId, batch.UnitCost,
                                    entity.ToBranchId, null, BucketInTransit, part.Quantity, 0m, part.Value,
                                    MoveSend, entity.TransferDate, false, narration, userId, now));

                            batch.QuantityOnHand -= part.Quantity;

                            batch.QuantityInTransit += part.Quantity;

                            SetBatchStatus(batch);

                            batch.ModifiedBy = userId;

                            batch.ModifiedDate = now;
                        }
                    }

                    foreach (MotorBikeUnitsEntity bike in bikes)
                    {
                        bike.Status = UnitInTransit;
                        bike.WarehouseId = null;
                        bike.BranchId = entity.ToBranchId;
                        bike.ModifiedBy = userId;
                        bike.ModifiedDate = now;
                    }

                    List<VoucherPostingLine> journal =
                        BuildJournal(entity, plan);

                    entity.VoucherNo = string.Empty;

                    if (journal.Count >= 2)
                    {
                        VoucherNumberDto voucher =
                            await _numberService.NextAsync(
                                VoucherTypes.ProductTransfer,
                                entity.FromBranchId,
                                entity.TransferDate);

                        entity.VoucherNo =
                            voucher.VoucherNo;

                        await _postingService.PostAsync(
                            new VoucherPostingRequest
                            {
                                VoucherType = VoucherTypes.ProductTransfer,
                                VoucherId = entity.ProductTransferId,
                                VoucherNo = entity.VoucherNo,
                                VoucherDate = entity.TransferDate,
                                BranchId = entity.FromBranchId,
                                ReferenceNo = entity.TransferNo,
                                Narration = Limit(narration, 500),
                                Lines = journal
                            },
                            userId);
                    }

                    entity.Status = StatusInTransit;

                    extra =
                        entity.VoucherNo.Length > 0
                            ? $"Sent to {plan.To.BranchName}; journal {entity.VoucherNo}."
                            : $"Sent to {plan.To.BranchName}; no value to post.";
                }

                entity.PostedBy = userId;

                entity.PostedDate = now;

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                AddHistory(entity, plan.Route, "Post", plan.InterBranch ? "Sent" : "Posted", userId, userName, now, extra);

                await _context.SaveChangesAsync();

                status = entity.Status;
            });

        return status;
    }


    //===========================================================
    // The journal of a send : per inventory ledger, Dr the To
    // branch / Cr the From branch (the engine adds the Inter-
    // Branch Current Account line of each branch)
    //===========================================================

    private static List<VoucherPostingLine>
        BuildJournal
        (
            ProductTransfer entity,
            Plan plan
        )
    {
        List<(string Ledger, string ProductName, decimal Quantity, decimal Value)> parts =
            new();

        foreach (PlanLine line in plan.Lines)
        {
            foreach (PlanBatch batch in line.Batches)
            {
                string ledger =
                    (batch.InventoryLedgerCode ?? string.Empty).Trim();

                if (ledger.Length == 0)
                {
                    ledger = (line.Product.InventoryLedgerCode ?? string.Empty).Trim();
                }

                if (ledger.Length == 0)
                {
                    throw new InvalidOperationException(
                        $"{line.Product.Name} has no Inventory ledger. Set it on the product first.");
                }

                parts.Add((ledger, line.Product.Name, batch.Quantity, batch.Value));
            }
        }

        List<VoucherPostingLine> journal =
            new();

        foreach (var group in parts.Where(x => x.Value > 0m).GroupBy(x => x.Ledger))
        {
            decimal value =
                group.Sum(x => x.Value);

            List<string> names =
                group.Select(x => x.ProductName).Distinct().ToList();

            string what =
                names.Count == 1
                    ? $"{names[0]} : {Qty(group.Sum(x => x.Quantity))}"
                    : $"{names.Count} products : {Qty(group.Sum(x => x.Quantity))} units";

            journal.Add(
                new VoucherPostingLine
                {
                    GroupNo = 1,
                    LedgerCode = group.Key,
                    Debit = value,
                    Credit = 0m,
                    Narration = Limit($"Transfer {entity.TransferNo} in from {plan.From.Label} : {what}", 500),
                    BranchId = entity.ToBranchId
                });

            journal.Add(
                new VoucherPostingLine
                {
                    GroupNo = 1,
                    LedgerCode = group.Key,
                    Debit = 0m,
                    Credit = value,
                    Narration = Limit($"Transfer {entity.TransferNo} out to {plan.To.Label} : {what}", 500),
                    BranchId = entity.FromBranchId
                });
        }

        return journal;
    }


    //===========================================================
    // Receive : at the destination (the To branch only)
    //===========================================================

    public async Task
        ReceiveAsync
        (
            long id,
            ReceiveProductTransferDto dto,
            long currentBranchId,
            long userId
        )
    {
        DateOnly today =
            BusinessToday();

        string text =
            (dto?.ReceiveDate ?? string.Empty).Trim();

        DateOnly receiveDate =
            text.Length == 0
                ? today
                : ParseDate(text, "The receive date");

        if (receiveDate > today)
        {
            throw new InvalidOperationException(
                "The receive date cannot be in the future.");
        }

        DateTime now =
            DateTime.UtcNow;

        string userName =
            await UserNameAsync(userId);

        await InTransactionAsync(
            async () =>
            {
                await LockTransferAsync(id);

                ProductTransfer entity =
                    await _context
                        .Set<ProductTransfer>()
                        .FirstOrDefaultAsync(x => x.ProductTransferId == id && !x.IsDeleted)
                    ??
                    throw new KeyNotFoundException("Product transfer not found.");

                if (entity.Status != StatusInTransit)
                {
                    throw new InvalidOperationException(
                        $"Product transfer {entity.TransferNo} is {entity.Status}; only one in transit can be received.");
                }

                Dictionary<long, WarehouseInfo> warehouses =
                    await WarehousesAsync(new List<long> { entity.FromWarehouseId, entity.ToWarehouseId });

                WarehouseInfo? to =
                    warehouses.GetValueOrDefault(entity.ToWarehouseId);

                string toBranch =
                    to?.BranchName ?? "the receiving branch";

                if (currentBranchId <= 0 || currentBranchId != entity.ToBranchId)
                {
                    throw new UnauthorizedAccessException(
                        $"Only {toBranch} can receive transfer {entity.TransferNo} : sign in to {toBranch}.");
                }

                if (receiveDate < entity.TransferDate)
                {
                    throw new InvalidOperationException(
                        $"The receive date cannot be before the transfer date ({entity.TransferDate:dd-MMM-yyyy}).");
                }

                if (to == null || to.IsDeleted)
                {
                    throw new InvalidOperationException(
                        "The To warehouse was not found.");
                }

                List<ProductTransferLines> lines =
                    await _context
                        .Set<ProductTransferLines>()
                        .AsNoTracking()
                        .Where(x => x.ProductTransferId == id)
                        .OrderBy(x => x.LineNo)
                        .ToListAsync();

                List<ProductTransferBatches> batchRows =
                    await _context
                        .Set<ProductTransferBatches>()
                        .AsNoTracking()
                        .Where(x => x.ProductTransferId == id)
                        .ToListAsync();

                List<long> batchIds =
                    batchRows.Select(x => x.StockBatchId).Distinct().ToList();

                await LockBatchesAsync(batchIds);

                Dictionary<long, StockBatchesEntity> batches =
                    await _context
                        .Set<StockBatchesEntity>()
                        .Where(x => batchIds.Contains(x.StockBatchId))
                        .ToDictionaryAsync(x => x.StockBatchId);

                Dictionary<long, decimal> onRoad =
                    await InTransitOfBatchesAsync(batchIds, entity.ToBranchId);

                foreach (IGrouping<long, ProductTransferBatches> group in batchRows.GroupBy(x => x.StockBatchId))
                {
                    decimal quantity =
                        group.Sum(x => x.Quantity);

                    if (!batches.TryGetValue(group.Key, out StockBatchesEntity? batch))
                    {
                        throw new InvalidOperationException(
                            $"Batch {group.First().BatchNo} was not found.");
                    }

                    if (batch.QuantityInTransit < quantity || onRoad.GetValueOrDefault(group.Key) < quantity)
                    {
                        throw new InvalidOperationException(
                            $"Batch {batch.BatchNo} : {Qty(quantity)} should be in transit to {toBranch}, but only {Qty(Math.Max(0m, Math.Min(batch.QuantityInTransit, onRoad.GetValueOrDefault(group.Key))))} is.");
                    }
                }

                List<long> unitIds =
                    await _context
                        .Set<ProductTransferUnits>()
                        .AsNoTracking()
                        .Where(x => x.ProductTransferId == id)
                        .Select(x => x.MotorBikeUnitId)
                        .ToListAsync();

                List<MotorBikeUnitsEntity> bikes =
                    unitIds.Count == 0
                        ? new List<MotorBikeUnitsEntity>()
                        : await _context
                            .Set<MotorBikeUnitsEntity>()
                            .Where(x => unitIds.Contains(x.MotorBikeUnitId))
                            .ToListAsync();

                MotorBikeUnitsEntity? moved =
                    bikes.FirstOrDefault(x => x.IsDeleted || x.Status != UnitInTransit);

                if (moved != null || bikes.Count != unitIds.Count)
                {
                    throw new InvalidOperationException(
                        moved != null
                            ? $"Bike {moved.ChassisNo} is no longer in transit ({moved.Status})."
                            : "A bike of this transfer was not found.");
                }

                string narration =
                    $"Transfer {entity.TransferNo} received : {await RouteTextAsync(entity)}";

                foreach (ProductTransferBatches part in batchRows)
                {
                    StockBatchesEntity batch =
                        batches[part.StockBatchId];

                    _context.Set<StockMovementsEntity>().Add(
                        Movement(entity, part.ProductTransferLineId, batch.StockBatchId, batch.ProductId, batch.UnitCost,
                            entity.ToBranchId, null, BucketInTransit, 0m, part.Quantity, part.Value,
                            MoveReceive, receiveDate, false, narration, userId, now));

                    _context.Set<StockMovementsEntity>().Add(
                        Movement(entity, part.ProductTransferLineId, batch.StockBatchId, batch.ProductId, batch.UnitCost,
                            entity.ToBranchId, entity.ToWarehouseId, BucketOnHand, part.Quantity, 0m, part.Value,
                            MoveReceive, receiveDate, false, narration, userId, now));

                    batch.QuantityInTransit -= part.Quantity;

                    batch.QuantityOnHand += part.Quantity;

                    SetBatchStatus(batch);

                    batch.ModifiedBy = userId;

                    batch.ModifiedDate = now;
                }

                foreach (MotorBikeUnitsEntity bike in bikes)
                {
                    bike.Status = UnitInStock;
                    bike.WarehouseId = entity.ToWarehouseId;
                    bike.BranchId = entity.ToBranchId;
                    bike.ModifiedBy = userId;
                    bike.ModifiedDate = now;
                }

                // Places : saved now (a shelf taken meanwhile is
                // skipped, never forced)
                List<string> skipped =
                    new();

                if (HasShelves(entity.PageType))
                {
                    List<long> rackIds =
                        lines
                            .Where(x => x.SavePlace && x.ToRackId.HasValue)
                            .Select(x => x.ToRackId!.Value)
                            .Distinct()
                            .ToList();

                    Dictionary<long, RackManagementEntity> racks =
                        rackIds.Count == 0
                            ? new Dictionary<long, RackManagementEntity>()
                            : await _context
                                .Set<RackManagementEntity>()
                                .AsNoTracking()
                                .Where(x => rackIds.Contains(x.RackManagementId))
                                .ToDictionaryAsync(x => x.RackManagementId);

                    HashSet<(long RackId, int Shelf, int Bin)> savedBins =
                        new();

                    foreach (ProductTransferLines line in lines.Where(x => x.SavePlace && x.ToRackId.HasValue))
                    {
                        if (!racks.TryGetValue(line.ToRackId!.Value, out RackManagementEntity? rack)
                            || rack.IsDeleted
                            || rack.WarehouseId != entity.ToWarehouseId)
                        {
                            skipped.Add(line.ProductName);

                            continue;
                        }

                        int shelf =
                            line.ToShelfNo ?? 0;

                        int bin =
                            BinOf(line.ToBinNo ?? 0);

                        // The bin taken meanwhile : skipped, never forced
                        string? problem =
                            await BinOccupancy.CheckBinAsync(
                                _context,
                                entity.ToWarehouseId,
                                rack.RackManagementId,
                                shelf,
                                bin,
                                entity.PageType == "SP" ? line.ProductId : 0,
                                entity.PageType == "AC" ? line.ProductId : 0);

                        if (problem != null || !savedBins.Add((rack.RackManagementId, shelf, bin)))
                        {
                            skipped.Add(line.ProductName);

                            continue;
                        }

                        await SaveShelfAsync(entity.PageType, line.ProductId, entity.ToWarehouseId, rack.RackManagementId, shelf, bin, userId, now);
                    }
                }

                entity.Status = StatusReceived;

                entity.ReceivedBy = userId;

                entity.ReceivedDate = now;

                entity.ReceiveDate = receiveDate;

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                AddHistory(
                    entity,
                    await RouteTextAsync(entity),
                    "Receive",
                    "Received",
                    userId,
                    userName,
                    now,
                    $"Received on {receiveDate:dd-MMM-yyyy}."
                    + (skipped.Count > 0 ? $" Place not saved (bin taken or rack removed) : {string.Join(", ", skipped.Take(10))}." : string.Empty));

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Cancel : allowed while the stock is still where the
    // transfer put it. '' = can cancel, else the reason.
    //===========================================================

    private async Task<string>
        CancelBlockerAsync
        (
            ProductTransfer entity,
            List<ProductTransferBatches> batchRows,
            List<ProductTransferUnits> units
        )
    {
        List<long> batchIds =
            batchRows.Select(x => x.StockBatchId).Distinct().ToList();

        Dictionary<long, decimal> batchQty =
            batchRows
                .GroupBy(x => x.StockBatchId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity));

        Dictionary<long, string> batchNo =
            batchRows
                .GroupBy(x => x.StockBatchId)
                .ToDictionary(g => g.Key, g => g.First().BatchNo);

        Dictionary<long, (decimal OnHand, decimal InTransit)> totals =
            batchIds.Count == 0
                ? new Dictionary<long, (decimal OnHand, decimal InTransit)>()
                : (
                    await _context
                        .Set<StockBatchesEntity>()
                        .AsNoTracking()
                        .Where(x => batchIds.Contains(x.StockBatchId))
                        .Select(x => new { x.StockBatchId, x.QuantityOnHand, x.QuantityInTransit })
                        .ToListAsync()
                  )
                  .ToDictionary(x => x.StockBatchId, x => (OnHand: x.QuantityOnHand, InTransit: x.QuantityInTransit));

        List<long> unitIds =
            units.Select(x => x.MotorBikeUnitId).Distinct().ToList();

        List<MotorBikeUnitsEntity> bikes =
            unitIds.Count == 0
                ? new List<MotorBikeUnitsEntity>()
                : await _context
                    .Set<MotorBikeUnitsEntity>()
                    .AsNoTracking()
                    .Where(x => unitIds.Contains(x.MotorBikeUnitId))
                    .ToListAsync();

        if (bikes.Count != unitIds.Count)
        {
            return "A bike of this transfer was not found.";
        }

        if (entity.Status == StatusInTransit)
        {
            Dictionary<long, decimal> onRoad =
                await InTransitOfBatchesAsync(batchIds, entity.ToBranchId);

            foreach (long batchId in batchIds)
            {
                decimal quantity =
                    batchQty[batchId];

                decimal held =
                    Math.Min(
                        onRoad.GetValueOrDefault(batchId),
                        totals.TryGetValue(batchId, out var t) ? t.InTransit : 0m);

                if (held < quantity)
                {
                    return $"Batch {batchNo[batchId]} : only {Qty(Math.Max(0m, held))} of the {Qty(quantity)} is still in transit.";
                }
            }

            MotorBikeUnitsEntity? gone =
                bikes.FirstOrDefault(x => x.IsDeleted || x.Status != UnitInTransit);

            return gone != null
                ? $"Bike {gone.ChassisNo} is no longer in transit ({gone.Status})."
                : string.Empty;
        }

        // Completed / Received : still on hand in the To warehouse
        Dictionary<long, decimal> onHand =
            await OnHandOfBatchesAsync(batchIds, entity.ToWarehouseId);

        foreach (long batchId in batchIds)
        {
            decimal quantity =
                batchQty[batchId];

            decimal held =
                Math.Min(
                    onHand.GetValueOrDefault(batchId),
                    totals.TryGetValue(batchId, out var t) ? t.OnHand : 0m);

            if (held < quantity)
            {
                return $"Batch {batchNo[batchId]} : only {Qty(Math.Max(0m, held))} of the {Qty(quantity)} is still in the To warehouse; the rest was sold, moved or returned.";
            }
        }

        MotorBikeUnitsEntity? away =
            bikes.FirstOrDefault(x => x.IsDeleted || x.Status != UnitInStock || x.WarehouseId != entity.ToWarehouseId);

        return away != null
            ? $"Bike {away.ChassisNo} is no longer in stock in the To warehouse ({away.Status})."
            : string.Empty;
    }

    public async Task
        CancelAsync
        (
            long id,
            CancelProductTransferDto dto,
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

        DateOnly today =
            BusinessToday();

        DateTime now =
            DateTime.UtcNow;

        string userName =
            await UserNameAsync(userId);

        await InTransactionAsync(
            async () =>
            {
                await LockTransferAsync(id);

                ProductTransfer entity =
                    await _context
                        .Set<ProductTransfer>()
                        .FirstOrDefaultAsync(x => x.ProductTransferId == id && !x.IsDeleted)
                    ??
                    throw new KeyNotFoundException("Product transfer not found.");

                string before =
                    entity.Status;

                if (before != StatusCompleted && before != StatusInTransit && before != StatusReceived)
                {
                    throw new InvalidOperationException(
                        $"Product transfer {entity.TransferNo} is {entity.Status}; only a posted one can be cancelled (delete a draft).");
                }

                List<ProductTransferBatches> batchRows =
                    await _context
                        .Set<ProductTransferBatches>()
                        .AsNoTracking()
                        .Where(x => x.ProductTransferId == id)
                        .ToListAsync();

                List<ProductTransferUnits> units =
                    await _context
                        .Set<ProductTransferUnits>()
                        .AsNoTracking()
                        .Where(x => x.ProductTransferId == id)
                        .ToListAsync();

                List<long> batchIds =
                    batchRows.Select(x => x.StockBatchId).Distinct().ToList();

                await LockBatchesAsync(batchIds);

                string blocker =
                    await CancelBlockerAsync(entity, batchRows, units);

                if (blocker.Length > 0)
                {
                    throw new InvalidOperationException(
                        $"Product transfer {entity.TransferNo} cannot be cancelled : {blocker}");
                }

                Dictionary<long, StockBatchesEntity> batches =
                    await _context
                        .Set<StockBatchesEntity>()
                        .Where(x => batchIds.Contains(x.StockBatchId))
                        .ToDictionaryAsync(x => x.StockBatchId);

                string narration =
                    $"Transfer {entity.TransferNo} cancelled : {reason}";

                foreach (ProductTransferBatches part in batchRows)
                {
                    StockBatchesEntity batch =
                        batches[part.StockBatchId];

                    long lineId =
                        part.ProductTransferLineId;

                    void Add(long branchId, long? warehouseId, string bucket, decimal quantityIn, decimal quantityOut)
                    {
                        _context.Set<StockMovementsEntity>().Add(
                            Movement(entity, lineId, batch.StockBatchId, batch.ProductId, batch.UnitCost,
                                branchId, warehouseId, bucket, quantityIn, quantityOut, part.Value,
                                MoveCancel, today, true, narration, userId, now));
                    }

                    if (before == StatusCompleted)
                    {
                        // Back from the To warehouse to the From one
                        Add(entity.ToBranchId, entity.ToWarehouseId, BucketOnHand, 0m, part.Quantity);

                        Add(entity.FromBranchId, entity.FromWarehouseId, BucketOnHand, part.Quantity, 0m);
                    }
                    else if (before == StatusInTransit)
                    {
                        // Off the road, back into the From warehouse
                        Add(entity.ToBranchId, null, BucketInTransit, 0m, part.Quantity);

                        Add(entity.FromBranchId, entity.FromWarehouseId, BucketOnHand, part.Quantity, 0m);

                        batch.QuantityInTransit -= part.Quantity;

                        batch.QuantityOnHand += part.Quantity;

                        SetBatchStatus(batch);
                    }
                    else
                    {
                        // Receive reversed (To warehouse → transit),
                        // then the send (transit → From warehouse)
                        Add(entity.ToBranchId, entity.ToWarehouseId, BucketOnHand, 0m, part.Quantity);

                        Add(entity.ToBranchId, null, BucketInTransit, part.Quantity, 0m);

                        Add(entity.ToBranchId, null, BucketInTransit, 0m, part.Quantity);

                        Add(entity.FromBranchId, entity.FromWarehouseId, BucketOnHand, part.Quantity, 0m);
                    }

                    batch.ModifiedBy = userId;

                    batch.ModifiedDate = now;
                }

                List<long> unitIds =
                    units.Select(x => x.MotorBikeUnitId).Distinct().ToList();

                if (unitIds.Count > 0)
                {
                    List<MotorBikeUnitsEntity> bikes =
                        await _context
                            .Set<MotorBikeUnitsEntity>()
                            .Where(x => unitIds.Contains(x.MotorBikeUnitId))
                            .ToListAsync();

                    foreach (MotorBikeUnitsEntity bike in bikes)
                    {
                        bike.Status = UnitInStock;
                        bike.WarehouseId = entity.FromWarehouseId;
                        bike.BranchId = entity.FromBranchId;
                        bike.ModifiedBy = userId;
                        bike.ModifiedDate = now;
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

                entity.Status = StatusCancelled;

                entity.CancelReason = reason;

                entity.CancelledBy = userId;

                entity.CancelledDate = now;

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                AddHistory(
                    entity,
                    await RouteTextAsync(entity),
                    "Cancel",
                    "Cancelled",
                    userId,
                    userName,
                    now,
                    $"Was {before}. Reason : {reason}. Stock back in the From warehouse{(entity.VoucherNo.Length > 0 ? $"; journal {entity.VoucherNo} reversed" : string.Empty)}.");

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // The product's location (rack · shelf) in a warehouse, as
    // Receiving / Opening Stock save it
    //===========================================================

    private async Task SaveShelfAsync
    (
        string type,
        long productId,
        long warehouseId,
        long rackId,
        int shelf,
        int bin,
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


    //===========================================================
    // History : every product transfer / one of them
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
            .Set<global::AppCore.Domain.Entities.InventoryManagement.StockMovement.ProductTransfer>()
            .AsNoTracking()
            .Where(x => x.PublicId == publicId)
            .Select(x => (long?)x.ProductTransferId)
            .FirstOrDefaultAsync();
    }


    //===========================================================
    // Get Paged (list page : tabs, type, search, sort and page on
    // the server). Deleted drafts are on the Deleted tab only.
    // Counts : All / <status> / Deleted (type + search applied),
    //          Type_<type> / Type_All (live, search applied).
    //===========================================================

    private static SortMap<ProductTransfer> PagedSorts()
    {
        return new SortMap<ProductTransfer>("TransferNo")
            .Add("TransferNo", x => x.TransferNo)
            .Add("DateText", x => x.TransferDate)
            .Add("TypeText", x => x.PageType)
            .Add("FromText", x => x.FromWarehouseId)
            .Add("ToText", x => x.ToWarehouseId)
            .Add("LineCount", x => x.LineCount)
            .Add("QtyText", x => x.TotalQuantity)
            .Add("ValueText", x => x.TotalValue)
            .Add("StatusText", x => x.Status)
            .Tie(x => x.ProductTransferId);
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

    public async Task<PagedResult<ProductTransferListRowDto>>
        GetPagedAsync
        (
            ProductTransferPageRequest request
        )
    {
        IQueryable<ProductTransfer> query =
            _context
                .Set<ProductTransfer>()
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
                            x.TransferDate == day ||
                            EF.Functions.ILike(x.TransferNo, like) ||
                        EF.Functions.ILike(x.VoucherNo, like) ||
                        EF.Functions.ILike(x.Remarks, like) ||
                        EF.Functions.ILike(x.Status, like) ||
                        EF.Functions.ILike(x.PageType, like) ||
                        _context.Set<WarehousesEntity>().Any(w => (w.WarehouseId == x.FromWarehouseId || w.WarehouseId == x.ToWarehouseId) && EF.Functions.ILike(w.WarehouseName, like))
                    );
            }
            else
            {
                query =
                    query.Where
                    (
                        x =>
                            EF.Functions.ILike(x.TransferNo, like) ||
                        EF.Functions.ILike(x.VoucherNo, like) ||
                        EF.Functions.ILike(x.Remarks, like) ||
                        EF.Functions.ILike(x.Status, like) ||
                        EF.Functions.ILike(x.PageType, like) ||
                        _context.Set<WarehousesEntity>().Any(w => (w.WarehouseId == x.FromWarehouseId || w.WarehouseId == x.ToWarehouseId) && EF.Functions.ILike(w.WarehouseName, like))
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

        IQueryable<ProductTransfer> ordered =
            string.IsNullOrWhiteSpace(request.Sort)
                ? query
                    .OrderByDescending(x => x.CreatedDate)
                    .ThenByDescending(x => x.ProductTransferId)
                : PagedSorts().Apply(query, request);

        List<ProductTransfer> rows =
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

        return new PagedResult<ProductTransferListRowDto>
        {
            Items = await MapListRowsAsync(rows),
            TotalCount = total,
            Page = request.SafePage,
            PageSize = request.SafePageSize,
            Counts = counts
        };
    }
}
