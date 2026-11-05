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

using AppCore.Domain.Common;

using AppCore.Domain.Entities.InventoryManagement.StockMovement;

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

using BinHolderDto =
    AppCore.Application.Settings.ProductSettings.BinHolderDto;

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

using SparePartsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SpareParts;

using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using StockMovementsEntity =
    AppCore.Domain.Platform.Inventory.StockMovements;


//===============================================================
// Namespace (as generated : the DI registration uses it)
//===============================================================

namespace AppCore.Infrastructure.Configurations.InventoryManagement.StockMovement;


//===============================================================
// Mass Storing repository
//
// Bulk placement of spare parts / accessories on racks and
// shelves inside ONE warehouse. Location only : no quantity
// change, no stock movement, no journal.
//   No      : MST-<SP|AC>-0001, company-wide, one counter per
//             type, never reset, never reused (given on first
//             save).
//   Lines   : only the changed products. To = a rack + shelf of
//             the warehouse, or Unplaced (the location cleared).
//             From = the product's place in the warehouse when
//             saved; read again on Post.
//   Rules   : the warehouse's branch runs the type's business
//             line today (Business Configuration, strict, on save
//             and post); checked on the FINAL state : one item
//             per shelf (spare part OR accessory); a shelf whose
//             holder moves away / is cleared in this document can
//             be reused; a shelf held by an item NOT in the
//             document is refused; two lines never target the same
//             shelf; the product's own current place is "already
//             there"; clearing an unplaced product is "already
//             unplaced". All conflicts are listed in one message.
//   Post    : every line at once, set-based, one transaction :
//             the document's products' location rows (Spare Part /
//             Accessory Locations) deleted first, then the new
//             rows inserted (none for Unplaced).
//   Cancel  : all or nothing : each product's From place back
//             (same apply); refused (conflicts listed) when a
//             product is no longer at its posted To, or (final
//             state) its old shelf is held by an item outside the
//             document / its old rack was removed.
//===============================================================

public class MassStoringRepository
    : IMassStoringRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Inventory Management";

    private const string EntityName =
        "MassStoring";

    private const string DateFormat =
        "yyyy-MM-dd";

    private const string DateTimeFormat =
        "yyyy-MM-dd HH:mm";

    public const string StatusDraft = "Draft";

    public const string StatusPosted = "Posted";

    public const string StatusCancelled = "Cancelled";

    private const string BucketOnHand = "OnHand";

    private const int MaxLines = 2000;

    // Conflicts listed in one message
    private const int MaxConflicts = 15;

    // pg_advisory_xact_lock classes : the numbers ("MS") and the
    // places of a warehouse ("MT")
    private const int NumberLockClass = 0x4D53;

    private const int PlaceLockClass = 0x4D54;


    //===========================================================
    // Dependencies
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public MassStoringRepository(
        AppDbContext context)
    {
        _context = context;
    }


    //===========================================================
    // Page types (SP / AC only : bikes are not shelved)
    //===========================================================

    private static string TypeOf
    (
        string? pageType
    )
    {
        string type =
            (pageType ?? string.Empty).Trim().ToUpperInvariant();

        return type is "SP" or "AC"
            ? type
            : throw new InvalidOperationException(
                "Choose the product type (Spare Parts & Lubricants or Accessories).");
    }

    private static string TitleOf(string type) =>
        type == "SP"
            ? "Spare Parts & Lubricants"
            : "Accessories";

    // The business line the warehouse's branch must run
    private static string LineOf(string type) =>
        type == "SP"
            ? BusinessLineAccess.SpareParts
            : BusinessLineAccess.Accessories;

    // BinOccupancy's item type of the page type
    private static string HolderTypeOf(string type) =>
        type == "SP"
            ? BinOccupancy.SparePartType
            : BinOccupancy.AccessoryType;

    // MST-SP-0001
    private static string NumberOf(string type, int sequence) =>
        $"MST-{type}-{sequence:D4}";


    //===========================================================
    // Helpers
    //===========================================================

    private static string DateText(DateOnly date) =>
        date.ToString(DateFormat, CultureInfo.InvariantCulture);

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

    // "Rack A / SLF-A-03" (plain characters : also used in texts
    // saved to the database)
    private static string PlaceText(RackManagementEntity? rack, int? shelf, int? bin)
    {
        if (rack == null)
        {
            return "Unplaced";
        }

        return shelf.HasValue && shelf.Value > 0
            ? $"{rack.RackName} / {RackLabels.BinCode(rack.RackName, shelf.Value, bin ?? 1)}"
            : rack.RackName;
    }

    // "Rack A · SLF-A-03" for the page ('' = Unplaced)
    private static string LocationText(string rackName, string shelfLabel) =>
        rackName.Length == 0
            ? string.Empty
            : shelfLabel.Length > 0
                ? $"{rackName} · {shelfLabel}"
                : rackName;

    private static string Conflicts(List<string> conflicts) =>
        string.Join(" ", conflicts.Take(MaxConflicts))
        + (conflicts.Count > MaxConflicts ? $" ... and {conflicts.Count - MaxConflicts} more." : string.Empty);


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
    // Transaction and locks
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

    private async Task LockStoringAsync(long id)
    {
        await _context.Database.ExecuteSqlRawAsync(
            "SELECT 1 FROM \"MassStorings\" WHERE \"MassStoringId\" = {0} FOR UPDATE",
            id);
    }

    // One Post / Cancel at a time per warehouse
    private async Task LockWarehousePlacesAsync(long warehouseId)
    {
        await _context.Database.ExecuteSqlRawAsync(
            "SELECT pg_advisory_xact_lock({0}, {1})",
            PlaceLockClass,
            (int)(warehouseId % int.MaxValue));
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

        public string BranchName { get; set; } = string.Empty;

        public bool IsDefault { get; set; }

        public bool IsActive { get; set; }

        public bool IsDeleted { get; set; }

        // "Uttara Store - Uttara" (plain characters : saved in
        // the history)
        public string Label =>
            BranchName.Length > 0 ? $"{Name} - {BranchName}" : Name;
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

        Dictionary<long, string> branches =
            await _context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => branchIds.Contains(x.BranchId))
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName ?? string.Empty);

        return warehouses
            .ToDictionary
            (
                x => x.WarehouseId,
                x =>
                    new WarehouseInfo
                    {
                        Id = x.WarehouseId,
                        Code = x.WarehouseCode ?? string.Empty,
                        Name = x.WarehouseName ?? string.Empty,
                        BranchId = x.BranchId,
                        BranchName = branches.GetValueOrDefault(x.BranchId, string.Empty),
                        IsDefault = x.IsDefault,
                        IsActive = x.IsActive,
                        IsDeleted = x.IsDeleted
                    }
            );
    }

    private async Task<WarehouseInfo?> WarehouseAsync(long warehouseId) =>
        (await WarehousesAsync(new List<long> { warehouseId })).GetValueOrDefault(warehouseId);


    //===========================================================
    // History (plain characters only : the database is WIN1252)
    //===========================================================

    private void AddHistory
    (
        MassStoring entity,
        string warehouse,
        int placed,
        int cleared,
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
                EntityId = entity.MassStoringId,
                ActivityType = activityType,
                ActivityTitle = $"Mass Storing {verb}",
                ActivityDescription =
                    Limit(
                        $"Mass Storing {entity.StoringNo} ({TitleOf(entity.PageType)}, {DateText(entity.StoringDate)}, {warehouse}, {entity.LineCount} line{(entity.LineCount == 1 ? string.Empty : "s")} : {placed} placed, {cleared} cleared) {verb.ToLowerInvariant()}.{(string.IsNullOrWhiteSpace(extra) ? string.Empty : " " + extra)}",
                        1000),
                PerformedBy = userId,
                PerformedByName = Limit(userName, 150),
                PerformedDate = now
            });
    }

    private async Task<string> WarehouseTextAsync(long warehouseId)
    {
        WarehouseInfo? warehouse =
            await WarehouseAsync(warehouseId);

        return warehouse?.Label ?? $"warehouse #{warehouseId}";
    }

    private async Task<(int Placed, int Cleared)> CountsAsync(long id)
    {
        List<long?> targets =
            await _context
                .Set<MassStoringLines>()
                .AsNoTracking()
                .Where(x => x.MassStoringId == id)
                .Select(x => x.ToRackId)
                .ToListAsync();

        return (targets.Count(x => x.HasValue), targets.Count(x => !x.HasValue));
    }


    //===========================================================
    // Products of a type (live) : code, name, part number, unit,
    // category and brand (Product Transfer's rules)
    //===========================================================

    private sealed class ProductInfo
    {
        public long Id { get; set; }

        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string PartNumber { get; set; } = string.Empty;

        public string Unit { get; set; } = string.Empty;

        public long CategoryId { get; set; }

        public string CategoryName { get; set; } = string.Empty;

        // Brand of its category (0 / '' = none; < 0 : the category
        // name stands for the brand)
        public long BrandId { get; set; }

        public string BrandName { get; set; } = string.Empty;

        public long SubCategoryId { get; set; }

        public string SubCategoryName { get; set; } = string.Empty;

        // Stored value (SuperFast ... Slow)
        public string MovementClass { get; set; } = string.Empty;
    }

    // Sub category names by id
    private async Task<Dictionary<long, string>>
        SubCategoryNamesAsync
        (
            IEnumerable<long> subCategoryIds
        )
    {
        List<long> ids =
            subCategoryIds.Where(x => x > 0).Distinct().ToList();

        return ids.Count == 0
            ? new Dictionary<long, string>()
            : await _context
                .Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.ProductSubCategoryId))
                .ToDictionaryAsync(x => x.ProductSubCategoryId, x => x.SubCategoryName ?? string.Empty);
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

        Dictionary<long, string> subCategories =
            await SubCategoryNamesAsync(rows.Select(x => x.SubCategoryId));

        rows.ForEach(x => x.SubCategoryName = subCategories.GetValueOrDefault(x.SubCategoryId, string.Empty));

        return rows;
    }

    private async Task<List<ProductInfo>>
        ProductRowsCoreAsync
        (
            string type,
            List<long>? ids
        )
    {
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
                            CategoryId = x.ProductCategoryId,
                            SubCategoryId = x.ProductSubCategoryId,
                            MovementClass = x.MovementClass
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
                    .Select(x => new { x.AccessoryId, x.ProductCode, x.PartNumber, x.AccessoryName, x.Unit, x.ProductCategoryId, x.ProductSubCategoryId, x.MovementClass })
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
                        CategoryId = x.ProductCategoryId,
                        SubCategoryId = x.ProductSubCategoryId,
                        MovementClass = x.MovementClass ?? string.Empty
                    }
            )
            .ToList();
    }


    //===========================================================
    // Stock on hand per product in a warehouse (OnHand movements :
    // Σ in − Σ out; only > 0)
    //===========================================================

    private async Task<Dictionary<long, decimal>>
        StockByProductAsync
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
                .GroupBy(x => x.ProductId)
                .Select(g => new { ProductId = g.Key, Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut) })
                .ToListAsync();

        return rows
            .Where(x => x.Quantity > 0m)
            .ToDictionary(x => x.ProductId, x => x.Quantity);
    }


    //===========================================================
    // Current places of the products in a warehouse (one row per
    // product per warehouse; the first when there are more)
    //===========================================================

    private async Task<Dictionary<long, (long RackId, int Shelf, int Bin)>>
        LocationsAsync
        (
            string type,
            long warehouseId,
            List<long>? productIds
        )
    {
        List<(long ProductId, long RackId, int Shelf, int Bin, long RowId)> rows =
            type == "SP"
                ? (
                    await _context
                        .Set<SparePartLocationsEntity>()
                        .AsNoTracking()
                        .Where(x => x.WarehouseId == warehouseId && (productIds == null || productIds.Contains(x.SparePartId)))
                        .Select(x => new { x.SparePartId, x.RackManagementId, x.ShelfNumber, x.BinNumber, x.SparePartLocationId })
                        .ToListAsync()
                  )
                  .Select(x => (x.SparePartId, x.RackManagementId, x.ShelfNumber, x.BinNumber, x.SparePartLocationId))
                  .ToList()
                : (
                    await _context
                        .Set<AccessoryLocationsEntity>()
                        .AsNoTracking()
                        .Where(x => x.WarehouseId == warehouseId && (productIds == null || productIds.Contains(x.AccessoryId)))
                        .Select(x => new { x.AccessoryId, x.RackManagementId, x.ShelfNumber, x.BinNumber, x.AccessoryLocationId })
                        .ToListAsync()
                  )
                  .Select(x => (x.AccessoryId, x.RackManagementId, x.ShelfNumber, x.BinNumber, x.AccessoryLocationId))
                  .ToList();

        return rows
            .GroupBy(x => x.ProductId)
            .ToDictionary
            (
                g => g.Key,
                g =>
                {
                    var first =
                        g.OrderBy(x => x.RowId).First();

                    return (first.RackId, first.Shelf, first.Bin);
                }
            );
    }

    // Racks by id (deleted ones too : old places stay readable)
    private async Task<Dictionary<long, RackManagementEntity>>
        RacksAsync
        (
            IEnumerable<long> rackIds
        )
    {
        List<long> ids =
            rackIds.Where(x => x > 0).Distinct().ToList();

        return ids.Count == 0
            ? new Dictionary<long, RackManagementEntity>()
            : await _context
                .Set<RackManagementEntity>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.RackManagementId))
                .ToDictionaryAsync(x => x.RackManagementId);
    }


    //===========================================================
    // Writing the places of many products in a warehouse at once
    // (set-based, one transaction : the caller's). Safe order :
    //   1. every location row of these products in the warehouse
    //      is deleted (moved away, cleared, duplicates) and saved
    //   2. the new rows are inserted and saved
    // So a shelf vacated in the same document can be taken by
    // another product, whatever order the database applies rows in.
    //===========================================================

    private async Task ApplyPlacesAsync
    (
        string type,
        long warehouseId,
        List<(long ProductId, long? RackId, int? Shelf, int? Bin)> changes,
        long userId,
        DateTime now
    )
    {
        if (changes.Count == 0)
        {
            return;
        }

        List<long> productIds =
            changes.Select(x => x.ProductId).Distinct().ToList();

        List<(long ProductId, long RackId, int Shelf, int Bin)> placed =
            changes
                .Where(x => x.RackId.HasValue && x.RackId.Value > 0)
                .Select(x => (x.ProductId, x.RackId!.Value, x.Shelf ?? 0, BinOf(x.Bin ?? 0)))
                .ToList();

        if (type == "SP")
        {
            // 1. Deletes
            _context.Set<SparePartLocationsEntity>().RemoveRange(
                await _context
                    .Set<SparePartLocationsEntity>()
                    .Where(x => x.WarehouseId == warehouseId && productIds.Contains(x.SparePartId))
                    .ToListAsync());

            await _context.SaveChangesAsync();

            // 2. Writes
            _context.Set<SparePartLocationsEntity>().AddRange(
                placed.Select
                (
                    x =>
                        new SparePartLocationsEntity
                        {
                            SparePartId = x.ProductId,
                            WarehouseId = warehouseId,
                            RackManagementId = x.RackId,
                            ShelfNumber = x.Shelf,
                            BinNumber = x.Bin,
                            CreatedBy = userId,
                            CreatedDate = now
                        }
                ));

            await _context.SaveChangesAsync();

            return;
        }

        // 1. Deletes
        _context.Set<AccessoryLocationsEntity>().RemoveRange(
            await _context
                .Set<AccessoryLocationsEntity>()
                .Where(x => x.WarehouseId == warehouseId && productIds.Contains(x.AccessoryId))
                .ToListAsync());

        await _context.SaveChangesAsync();

        // 2. Writes
        _context.Set<AccessoryLocationsEntity>().AddRange(
            placed.Select
            (
                x =>
                    new AccessoryLocationsEntity
                    {
                        AccessoryId = x.ProductId,
                        WarehouseId = warehouseId,
                        RackManagementId = x.RackId,
                        ShelfNumber = x.Shelf,
                        BinNumber = x.Bin,
                        CreatedBy = userId,
                        CreatedDate = now
                    }
            ));

        await _context.SaveChangesAsync();
    }

    // Holders of bins by (rack, shelf, bin)
    private static Dictionary<(long RackId, int Shelf, int Bin), List<BinHolderDto>> HoldersByShelf(List<BinHolderDto> holders) =>
        holders
            .GroupBy(x => (x.RackManagementId, x.ShelfNumber, x.BinNumber))
            .ToDictionary(g => (g.Key.RackManagementId, g.Key.ShelfNumber, g.Key.BinNumber), g => g.ToList());

    // 0 / missing with a rack and shelf = bin 1 (old clients)
    private static int BinOf(int bin) =>
        bin > 0 ? bin : 1;

    // The item that will still hold a shelf in the final state : a
    // holder that is NOT one of the products moving in this document
    // (every product of a valid document leaves its current shelf)
    private static BinHolderDto? StayingHolder
    (
        Dictionary<(long RackId, int Shelf, int Bin), List<BinHolderDto>> held,
        long rackId,
        int shelf,
        int bin,
        string ownType,
        HashSet<long> moving
    )
    {
        return held.TryGetValue((rackId, shelf, bin), out List<BinHolderDto>? list)
            ? list.FirstOrDefault(x => !(x.ItemType == ownType && moving.Contains(x.ItemId)))
            : null;
    }


    //===========================================================
    // Plan : the checked document (Save and Post use it)
    //===========================================================

    private sealed class PlanLine
    {
        public ProductInfo Product { get; set; } = new();

        public long? FromRackId { get; set; }

        public int? FromShelfNo { get; set; }

        public int? FromBinNo { get; set; }

        // null = Unplaced
        public long? ToRackId { get; set; }

        public int? ToShelfNo { get; set; }

        public int? ToBinNo { get; set; }

        public decimal Stock { get; set; }

        public string Notes { get; set; } = string.Empty;
    }

    private sealed class Plan
    {
        public string Type { get; set; } = string.Empty;

        public DateOnly Date { get; set; }

        public WarehouseInfo Warehouse { get; set; } = new();

        public string Remarks { get; set; } = string.Empty;

        public List<PlanLine> Lines { get; set; } = new();

        public int Placed => Lines.Count(x => x.ToRackId.HasValue);

        public int Cleared => Lines.Count(x => !x.ToRackId.HasValue);
    }

    private async Task<Plan>
        ResolveAsync
        (
            string type,
            CreateMassStoringDto dto
        )
    {
        DateOnly date =
            ParseDate(dto.StoringDate, "The storing date");

        //=======================================================
        // Warehouse : its branch runs the type's line today
        //=======================================================

        if (dto.WarehouseId <= 0)
        {
            throw new InvalidOperationException(
                "Choose the warehouse.");
        }

        WarehouseInfo warehouse =
            await WarehouseAsync(dto.WarehouseId)
            ??
            throw new InvalidOperationException(
                "The warehouse was not found.");

        if (warehouse.IsDeleted || !warehouse.IsActive)
        {
            throw new InvalidOperationException(
                $"Warehouse {warehouse.Name} is not active.");
        }

        HashSet<long> allowed =
            await BusinessLineAccess.AllowedWarehouseIdsAsync(
                _context,
                LineOf(type));

        if (!allowed.Contains(warehouse.Id))
        {
            throw new InvalidOperationException(
                $"{(warehouse.BranchName.Length > 0 ? warehouse.BranchName : "The warehouse's branch")} does not run the {LineOf(type)} business today (Business Configuration) : {TitleOf(type).ToLowerInvariant()} cannot be placed in {warehouse.Name}.");
        }

        //=======================================================
        // Lines
        //=======================================================

        List<CreateMassStoringLineDto> inputs =
            (dto.Lines ?? new List<CreateMassStoringLineDto>())
                .Where(x => x != null)
                .ToList();

        if (inputs.Count == 0)
        {
            throw new InvalidOperationException(
                "Change the place of at least one product.");
        }

        if (inputs.Count > MaxLines)
        {
            throw new InvalidOperationException(
                $"A mass storing can have at most {MaxLines} products.");
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
                $"{products.GetValueOrDefault(twice)?.Name ?? "A product"} is listed twice : keep one line per product.");
        }

        long? missing =
            productIds.Where(x => !products.ContainsKey(x)).Select(x => (long?)x).FirstOrDefault();

        if (missing.HasValue)
        {
            throw new InvalidOperationException(
                $"Product #{missing.Value} was not found ({TitleOf(type)}).");
        }

        Dictionary<long, (long RackId, int Shelf, int Bin)> current =
            await LocationsAsync(type, warehouse.Id, productIds);

        Dictionary<long, decimal> stock =
            await StockByProductAsync(type, warehouse.Id, productIds);

        Dictionary<long, RackManagementEntity> racks =
            await RacksAsync(
                inputs
                    .Where(x => x.ToRackId.HasValue && x.ToRackId.Value > 0)
                    .Select(x => x.ToRackId!.Value));

        // Who holds the target shelves now (spare parts AND
        // accessories : one item per shelf). A holder that is one
        // of this document's products leaves its shelf (moved or
        // cleared), so the shelf is free in the final state.
        Dictionary<(long RackId, int Shelf, int Bin), List<BinHolderDto>> held =
            HoldersByShelf(
                await BinOccupancy.GetHoldersAsync(
                    _context,
                    racks.Keys.ToArray(),
                    0,
                    0));

        string ownType =
            HolderTypeOf(type);

        HashSet<long> moving =
            productIds.ToHashSet();

        // Bins per shelf of the target racks (missing row = 1 bin)
        Dictionary<(long RackId, int Shelf), int> binCounts =
            await BinOccupancy.GetBinCountsAsync(
                _context,
                racks.Keys.ToArray());

        Plan plan =
            new()
            {
                Type = type,
                Date = date,
                Warehouse = warehouse,
                Remarks = Limit(dto.Remarks, 500)
            };

        List<string> conflicts =
            new();

        HashSet<(long RackId, int Shelf, int Bin)> targets =
            new();

        foreach (CreateMassStoringLineDto input in inputs)
        {
            ProductInfo product =
                products[input.ProductId];

            string who =
                product.Code.Length > 0 ? $"{product.Code} ({product.Name})" : product.Name;

            bool placed =
                current.TryGetValue(product.Id, out (long RackId, int Shelf, int Bin) now);

            PlanLine line =
                new()
                {
                    Product = product,
                    FromRackId = placed ? now.RackId : null,
                    FromShelfNo = placed ? now.Shelf : null,
                    FromBinNo = placed ? now.Bin : null,
                    Stock = stock.GetValueOrDefault(product.Id),
                    Notes = Limit(input.Notes, 200)
                };

            long rackId =
                input.ToRackId ?? 0;

            if (rackId <= 0)
            {
                // Unplaced : clear the place
                if (!placed)
                {
                    conflicts.Add($"{who} : already unplaced in {warehouse.Name}.");
                }

                plan.Lines.Add(line);

                continue;
            }

            int shelf =
                input.ToShelfNo ?? 0;

            int bin =
                BinOf(input.ToBinNo ?? 0);

            if (!racks.TryGetValue(rackId, out RackManagementEntity? rack)
                || rack.IsDeleted
                || rack.WarehouseId != warehouse.Id)
            {
                conflicts.Add($"{who} : the rack is not in {warehouse.Name}.");

                continue;
            }

            string rackText =
                RackText(rack.RackCode, rack.RackName);

            if (!rack.IsActive)
            {
                conflicts.Add($"{who} : rack {rackText} is not active.");

                continue;
            }

            if (rack.ShelfCount <= 0)
            {
                conflicts.Add($"{who} : rack {rackText} has no shelves.");

                continue;
            }

            if (shelf < 1 || shelf > rack.ShelfCount)
            {
                conflicts.Add($"{who} : choose a shelf of rack {rackText} (1 to {rack.ShelfCount}).");

                continue;
            }

            int binCount =
                BinOccupancy.BinCountOf(binCounts, rackId, shelf);

            if (bin < 1 || bin > binCount)
            {
                conflicts.Add($"{who} : choose a bin of {RackLabels.Shelf(rack.RackName, shelf)} ({rack.RackName}, 01 to {binCount:00}).");

                continue;
            }

            string label =
                RackLabels.BinCode(rack.RackName, shelf, bin);

            if (placed && now.RackId == rackId && now.Shelf == shelf && now.Bin == bin)
            {
                conflicts.Add($"{who} : already there ({rack.RackName} / {label}).");

                continue;
            }

            BinHolderDto? holder =
                StayingHolder(held, rackId, shelf, bin, ownType, moving);

            if (holder != null)
            {
                conflicts.Add($"{who} : bin {label} of {rack.RackName} holds {holder.ItemType.ToLowerInvariant()} {holder.ProductCode} - {holder.ItemName}, which is not moved in this document.");

                continue;
            }

            if (!targets.Add((rackId, shelf, bin)))
            {
                conflicts.Add($"{who} : bin {label} of {rack.RackName} is chosen for another product too.");

                continue;
            }

            line.ToRackId = rackId;

            line.ToShelfNo = shelf;

            line.ToBinNo = bin;

            plan.Lines.Add(line);
        }

        if (conflicts.Count > 0)
        {
            throw new InvalidOperationException(
                Conflicts(conflicts));
        }

        return plan;
    }


    //===========================================================
    // Draft : header, lines
    //===========================================================

    private static void FillHeader
    (
        MassStoring entity,
        Plan plan
    )
    {
        entity.PageType = plan.Type;
        entity.StoringDate = plan.Date;
        entity.BranchId = plan.Warehouse.BranchId;
        entity.WarehouseId = plan.Warehouse.Id;
        entity.Remarks = plan.Remarks;
        entity.LineCount = plan.Lines.Count;
    }

    private async Task WriteLinesAsync
    (
        long massStoringId,
        Plan plan
    )
    {
        _context.Set<MassStoringLines>().RemoveRange(
            await _context
                .Set<MassStoringLines>()
                .Where(x => x.MassStoringId == massStoringId)
                .ToListAsync());

        // The old lines go first : one line per product per
        // document is a unique index (the caller's transaction)
        await _context.SaveChangesAsync();

        int lineNo = 0;

        foreach (PlanLine line in plan.Lines)
        {
            lineNo++;

            _context.Set<MassStoringLines>().Add(
                new MassStoringLines
                {
                    MassStoringId = massStoringId,
                    LineNo = lineNo,
                    ProductId = line.Product.Id,
                    ProductCode = Limit(line.Product.Code, 40),
                    ProductName = Limit(line.Product.Name, 250),
                    PartNumber = Limit(line.Product.PartNumber, 100),
                    Unit = Limit(line.Product.Unit, 20),
                    FromRackId = line.FromRackId,
                    FromShelfNo = line.FromShelfNo,
                    FromBinNo = line.FromBinNo,
                    ToRackId = line.ToRackId,
                    ToShelfNo = line.ToShelfNo,
                    ToBinNo = line.ToBinNo,
                    StockQuantity = line.Stock,
                    Notes = line.Notes
                });
        }
    }

    // The saved draft as input (Post checks it again)
    private async Task<CreateMassStoringDto>
        SavedInputAsync
        (
            MassStoring entity
        )
    {
        List<MassStoringLines> lines =
            await _context
                .Set<MassStoringLines>()
                .AsNoTracking()
                .Where(x => x.MassStoringId == entity.MassStoringId)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        return new CreateMassStoringDto
        {
            Type = entity.PageType,
            StoringDate = DateText(entity.StoringDate),
            WarehouseId = entity.WarehouseId,
            Remarks = entity.Remarks,
            Lines =
                lines
                    .Select
                    (
                        x =>
                            new CreateMassStoringLineDto
                            {
                                ProductId = x.ProductId,
                                ToRackId = x.ToRackId,
                                ToShelfNo = x.ToShelfNo,
                                ToBinNo = x.ToBinNo,
                                Notes = x.Notes
                            }
                    )
                    .ToList()
        };
    }


    //===========================================================
    // Read : list (deleted drafts included, for Restore)
    //===========================================================

    public async Task<List<MassStoringListRowDto>>
        GetAllAsync
        (
            string? pageType
        )
    {
        string type =
            (pageType ?? string.Empty).Trim().ToUpperInvariant();

        List<MassStoring> rows =
            await _context
                .Set<MassStoring>()
                .AsNoTracking()
                .Where(x => type == string.Empty || x.PageType == type)
                .OrderByDescending(x => x.CreatedDate)
                .ThenByDescending(x => x.MassStoringId)
                .ToListAsync();

        return await MapListRowsAsync(rows);
    }


    //===========================================================
    // List rows : one row per document (shared by the full list
    // and the paged list)
    //===========================================================

    private async Task<List<MassStoringListRowDto>>
        MapListRowsAsync
        (
            List<MassStoring> rows
        )
    {

        List<long> ids =
            rows.Select(x => x.MassStoringId).ToList();

        var targets =
            ids.Count == 0
                ? new List<(long MassStoringId, bool Placed)>()
                : (
                    await _context
                        .Set<MassStoringLines>()
                        .AsNoTracking()
                        .Where(x => ids.Contains(x.MassStoringId))
                        .Select(x => new { x.MassStoringId, x.ToRackId })
                        .ToListAsync()
                  )
                  .Select(x => (x.MassStoringId, Placed: x.ToRackId.HasValue))
                  .ToList();

        Dictionary<long, (int Placed, int Cleared)> counts =
            targets
                .GroupBy(x => x.MassStoringId)
                .ToDictionary(g => g.Key, g => (g.Count(x => x.Placed), g.Count(x => !x.Placed)));

        Dictionary<long, WarehouseInfo> warehouses =
            await WarehousesAsync(rows.Select(x => x.WarehouseId).Distinct().ToList());

        Dictionary<long, string> users =
            await UserNamesAsync(rows.Select(x => x.CreatedBy));

        return rows
            .Select
            (
                x =>
                {
                    WarehouseInfo? warehouse =
                        warehouses.GetValueOrDefault(x.WarehouseId);

                    (int Placed, int Cleared) count =
                        counts.GetValueOrDefault(x.MassStoringId);

                    return new MassStoringListRowDto
                    {
                        Id = x.MassStoringId,
                        PublicId = x.PublicId,
                        StoringNo = x.StoringNo,
                        PageType = x.PageType,
                        StoringDate = DateText(x.StoringDate),
                        BranchId = x.BranchId,
                        BranchName = warehouse?.BranchName ?? string.Empty,
                        WarehouseId = x.WarehouseId,
                        WarehouseCode = warehouse?.Code ?? string.Empty,
                        WarehouseName = warehouse?.Name ?? string.Empty,
                        Status = x.Status,
                        LineCount = x.LineCount,
                        PlacedCount = count.Placed,
                        ClearedCount = count.Cleared,
                        Remarks = x.Remarks,
                        IsDeleted = x.IsDeleted,
                        CreatedByName = users.GetValueOrDefault(x.CreatedBy, string.Empty),
                        CreatedDate = DateText(x.CreatedDate),
                        PostedDate = DateText(x.PostedDate)
                    };
                }
            )
            .ToList();
    }


    //===========================================================
    // Read : one document
    //===========================================================

    public async Task<MassStoringDto?>
        GetByIdAsync
        (
            long id
        )
    {
        MassStoring? entity =
            await _context
                .Set<MassStoring>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MassStoringId == id);

        if (entity == null)
        {
            return null;
        }

        List<MassStoringLines> lines =
            await _context
                .Set<MassStoringLines>()
                .AsNoTracking()
                .Where(x => x.MassStoringId == id)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        WarehouseInfo? warehouse =
            await WarehouseAsync(entity.WarehouseId);

        Dictionary<long, RackManagementEntity> racks =
            await RacksAsync(
                lines
                    .Select(x => x.FromRackId ?? 0)
                    .Concat(lines.Select(x => x.ToRackId ?? 0)));

        Dictionary<long, string> users =
            await UserNamesAsync(
                new[] { entity.CreatedBy, entity.PostedBy ?? 0, entity.CancelledBy ?? 0 });

        bool draft =
            entity.Status == StatusDraft && !entity.IsDeleted;

        bool posted =
            entity.Status == StatusPosted && !entity.IsDeleted;

        string blocker =
            posted
                ? Conflicts(await CancelConflictsAsync(entity, lines))
                : string.Empty;

        MassStoringDto dto =
            new()
            {
                Id = entity.MassStoringId,
                PublicId = entity.PublicId,
                MassStoringId = entity.MassStoringId,
                StoringNo = entity.StoringNo,
                PageType = entity.PageType,
                StoringDate = DateText(entity.StoringDate),
                BranchId = entity.BranchId,
                BranchName = warehouse?.BranchName ?? string.Empty,
                WarehouseId = entity.WarehouseId,
                WarehouseCode = warehouse?.Code ?? string.Empty,
                WarehouseName = warehouse?.Name ?? string.Empty,
                Remarks = entity.Remarks,
                Status = entity.Status,
                LineCount = entity.LineCount,
                PlacedCount = lines.Count(x => x.ToRackId.HasValue),
                ClearedCount = lines.Count(x => !x.ToRackId.HasValue),
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
                CanCancel = posted && blocker.Length == 0,
                CancelBlockedReason = blocker
            };

        dto.Lines =
            lines
                .Select
                (
                    x =>
                    {
                        RackManagementEntity? from =
                            x.FromRackId.HasValue ? racks.GetValueOrDefault(x.FromRackId.Value) : null;

                        RackManagementEntity? to =
                            x.ToRackId.HasValue ? racks.GetValueOrDefault(x.ToRackId.Value) : null;

                        string fromLabel =
                            from != null && x.FromShelfNo.HasValue && x.FromShelfNo.Value > 0
                                ? RackLabels.Shelf(from.RackName, x.FromShelfNo.Value)
                                : string.Empty;

                        string fromBin =
                            from != null && x.FromShelfNo.HasValue && x.FromShelfNo.Value > 0
                                ? RackLabels.BinCode(from.RackName, x.FromShelfNo.Value, x.FromBinNo ?? 1)
                                : string.Empty;

                        string toLabel =
                            to != null && x.ToShelfNo.HasValue && x.ToShelfNo.Value > 0
                                ? RackLabels.Shelf(to.RackName, x.ToShelfNo.Value)
                                : string.Empty;

                        string toBin =
                            to != null && x.ToShelfNo.HasValue && x.ToShelfNo.Value > 0
                                ? RackLabels.BinCode(to.RackName, x.ToShelfNo.Value, x.ToBinNo ?? 1)
                                : string.Empty;

                        return new MassStoringLineDto
                        {
                            MassStoringLineId = x.MassStoringLineId,
                            LineNo = x.LineNo,
                            ProductId = x.ProductId,
                            ProductCode = x.ProductCode,
                            ProductName = x.ProductName,
                            PartNumber = x.PartNumber,
                            Unit = x.Unit,
                            StockQuantity = x.StockQuantity,
                            FromRackId = x.FromRackId,
                            FromRackCode = from?.RackCode ?? string.Empty,
                            FromRackName = from?.RackName ?? string.Empty,
                            FromShelfNo = x.FromShelfNo,
                            FromShelfLabel = fromLabel,
                            FromBinNo = x.FromBinNo,
                            FromBinCode = fromBin,
                            FromLocation = LocationText(from?.RackName ?? string.Empty, fromBin),
                            ToRackId = x.ToRackId,
                            ToRackCode = to?.RackCode ?? string.Empty,
                            ToRackName = to?.RackName ?? string.Empty,
                            ToShelfNo = x.ToShelfNo,
                            ToShelfLabel = toLabel,
                            ToBinNo = x.ToBinNo,
                            ToBinCode = toBin,
                            ToLocation = LocationText(to?.RackName ?? string.Empty, toBin),
                            IsClear = !x.ToRackId.HasValue,
                            Notes = x.Notes
                        };
                    }
                )
                .ToList();

        return dto;
    }


    //===========================================================
    // Defaults : next number, warehouses (business line), brands,
    // categories, login branch
    //===========================================================

    public async Task<MassStoringDefaultsDto>
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
                .Set<MassStoring>()
                .AsNoTracking()
                .Where(x => x.PageType == type)
                .Select(x => (int?)x.SequenceNo)
                .MaxAsync()
            ??
            0;

        MassStoringDefaultsDto result =
            new()
            {
                PageType = type,
                Today = DateText(BusinessToday()),
                NextNo = NumberOf(type, last + 1),
                CurrentBranchId = Math.Max(0, currentBranchId)
            };

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

        HashSet<long> allowed =
            await BusinessLineAccess.AllowedWarehouseIdsAsync(
                _context,
                LineOf(type));

        List<WarehouseInfo> warehouses =
            (await WarehousesAsync(null)).Values
                .Where(x => !x.IsDeleted && x.IsActive && allowed.Contains(x.Id))
                .OrderBy(x => x.BranchName)
                .ThenByDescending(x => x.IsDefault)
                .ThenBy(x => x.Name)
                .ToList();

        result.Warehouses =
            warehouses
                .Select
                (
                    x =>
                        new MassStoringWarehouseOptionDto
                        {
                            Id = x.Id,
                            Code = x.Code,
                            Name = x.Name,
                            BranchId = x.BranchId,
                            BranchName = x.BranchName,
                            IsDefault = x.IsDefault,
                            CanReceiveType = true
                        }
                )
                .ToList();

        result.DefaultWarehouseId =
            warehouses
                .Where(x => currentBranchId > 0 && x.BranchId == currentBranchId)
                .OrderByDescending(x => x.IsDefault)
                .ThenBy(x => x.Name)
                .Select(x => x.Id)
                .FirstOrDefault();

        List<ProductInfo> products =
            await ProductRowsAsync(type, null);

        result.Brands =
            products
                .Where(x => x.BrandId != 0 && x.BrandName.Length > 0)
                .GroupBy(x => x.BrandId)
                .Select(g => new MassStoringBrandOptionDto { Id = g.Key, Name = g.First().BrandName })
                .OrderBy(x => x.Name)
                .ToList();

        result.Categories =
            products
                .Where(x => x.CategoryId > 0)
                .GroupBy(x => x.CategoryId)
                .Select
                (
                    g =>
                        new MassStoringCategoryOptionDto
                        {
                            Id = g.Key,
                            Name = g.First().CategoryName,
                            BrandId = g.First().BrandId,
                            BrandName = g.First().BrandName
                        }
                )
                .OrderBy(x => x.Name)
                .ToList();

        return result;
    }


    //===========================================================
    // Grid rows : products with stock in the warehouse (or every
    // live product) and their current place there
    //===========================================================

    public async Task<List<MassStoringProductDto>>
        GetProductsAsync
        (
            string pageType,
            long warehouseId,
            bool includeNoStock,
            bool includePlaced,
            long? rackId
        )
    {
        string type =
            TypeOf(pageType);

        if (warehouseId <= 0)
        {
            return new List<MassStoringProductDto>();
        }

        if (await WarehouseAsync(warehouseId) == null)
        {
            throw new KeyNotFoundException("Warehouse not found.");
        }

        Dictionary<long, decimal> stock =
            await StockByProductAsync(type, warehouseId, null);

        // Every product of the type placed in the warehouse (stock
        // or not)
        Dictionary<long, (long RackId, int Shelf, int Bin)> places =
            await LocationsAsync(type, warehouseId, null);

        List<long>? ids;

        if (rackId.HasValue && rackId.Value > 0)
        {
            // "Clear a whole rack" / "Move rack to rack" : every
            // product on that rack, whatever its stock
            long onRack =
                rackId.Value;

            ids =
                places
                    .Where(x => x.Value.RackId == onRack)
                    .Select(x => x.Key)
                    .ToList();
        }
        else if (includeNoStock)
        {
            ids = null;
        }
        else
        {
            ids =
                stock.Keys
                    .Concat(includePlaced ? places.Keys : Enumerable.Empty<long>())
                    .Distinct()
                    .ToList();
        }

        if (ids != null && ids.Count == 0)
        {
            return new List<MassStoringProductDto>();
        }

        List<ProductInfo> products =
            await ProductRowsAsync(type, ids);

        Dictionary<long, RackManagementEntity> racks =
            await RacksAsync(places.Values.Select(x => x.RackId));

        return products
            .Select
            (
                x =>
                {
                    MassStoringProductDto row =
                        new()
                        {
                            ProductId = x.Id,
                            Code = x.Code,
                            Name = x.Name,
                            PartNumber = x.PartNumber,
                            Unit = x.Unit,
                            BrandId = x.BrandId,
                            BrandName = x.BrandName,
                            CategoryId = x.CategoryId,
                            CategoryName = x.CategoryName,
                            Stock = stock.GetValueOrDefault(x.Id),
                            SubCategoryId = x.SubCategoryId,
                            SubCategoryName = x.SubCategoryName,
                            MovementClass = RackLabels.NormalizeMovementClass(x.MovementClass),
                            MovementRank = RackLabels.MovementRank(x.MovementClass)
                        };

                    if (places.TryGetValue(x.Id, out (long RackId, int Shelf, int Bin) place))
                    {
                        RackManagementEntity? rack =
                            racks.GetValueOrDefault(place.RackId);

                        string label =
                            place.Shelf > 0
                                ? RackLabels.Shelf(rack?.RackName, place.Shelf)
                                : string.Empty;

                        string binCode =
                            place.Shelf > 0
                                ? RackLabels.BinCode(rack?.RackName, place.Shelf, place.Bin)
                                : string.Empty;

                        row.RackId = place.RackId;
                        row.RackCode = rack?.RackCode ?? string.Empty;
                        row.RackName = rack?.RackName ?? string.Empty;
                        row.ShelfNo = place.Shelf > 0 ? place.Shelf : null;
                        row.ShelfLabel = label;
                        row.BinNo = place.Shelf > 0 ? place.Bin : null;
                        row.BinCode = binCode;
                        row.Location = LocationText(rack?.RackName ?? $"Rack #{place.RackId}", binCode);
                        row.IsPlaced = true;
                    }

                    return row;
                }
            )
            .OrderBy(x => x.BrandName)
            .ThenBy(x => x.Name)
            .ToList();
    }


    //===========================================================
    // Places : saved places in a warehouse and its racks with the
    // shelves (free / held by whom), Product Transfer's shape
    //===========================================================

    public async Task<MassStoringPlacesDto>
        GetPlacesAsync
        (
            string pageType,
            long warehouseId
        )
    {
        string type =
            TypeOf(pageType);

        MassStoringPlacesDto result =
            new();

        if (warehouseId <= 0)
        {
            return result;
        }

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

        //=======================================================
        // Holders' details (set-based : one query per item table,
        // one for the stock, one for the sub category names)
        //=======================================================

        List<BinHolderDto> holders =
            map
                .SelectMany(x => x.Shelves)
                .SelectMany(x => x.Bins)
                .Where(x => x.Holder != null)
                .Select(x => x.Holder!)
                .ToList();

        List<long> spIds =
            holders.Where(x => x.ItemType == BinOccupancy.SparePartType).Select(x => x.ItemId).Distinct().ToList();

        List<long> acIds =
            holders.Where(x => x.ItemType == BinOccupancy.AccessoryType).Select(x => x.ItemId).Distinct().ToList();

        Dictionary<(string ItemType, long ItemId), (long SubCategoryId, string MovementClass, string PartNumber)> holderInfo =
            new();

        if (spIds.Count > 0)
        {
            foreach (var part in await _context
                         .Set<SparePartsEntity>()
                         .AsNoTracking()
                         .Where(x => spIds.Contains(x.SparePartId))
                         .Select(x => new { x.SparePartId, x.ProductSubCategoryId, x.MovementClass, x.PartNumber })
                         .ToListAsync())
            {
                holderInfo[(BinOccupancy.SparePartType, part.SparePartId)] =
                    (part.ProductSubCategoryId, part.MovementClass ?? string.Empty, part.PartNumber ?? string.Empty);
            }
        }

        if (acIds.Count > 0)
        {
            foreach (var accessory in await _context
                         .Set<AccessoriesEntity>()
                         .AsNoTracking()
                         .Where(x => acIds.Contains(x.AccessoryId))
                         .Select(x => new { x.AccessoryId, x.ProductSubCategoryId, x.MovementClass, x.PartNumber })
                         .ToListAsync())
            {
                holderInfo[(BinOccupancy.AccessoryType, accessory.AccessoryId)] =
                    (accessory.ProductSubCategoryId, accessory.MovementClass ?? string.Empty, accessory.PartNumber ?? string.Empty);
            }
        }

        // On hand in this warehouse, both types (SP / AC movements)
        Dictionary<(string ItemType, long ItemId), decimal> holderStock =
            new();

        if (spIds.Count > 0 || acIds.Count > 0)
        {
            var stockRows =
                await _context
                    .Set<StockMovementsEntity>()
                    .AsNoTracking()
                    .Where
                    (
                        x =>
                            x.Bucket == BucketOnHand
                            &&
                            x.WarehouseId == warehouseId
                            &&
                            (
                                (x.ProductType == "SP" && spIds.Contains(x.ProductId))
                                ||
                                (x.ProductType == "AC" && acIds.Contains(x.ProductId))
                            )
                    )
                    .GroupBy(x => new { x.ProductType, x.ProductId })
                    .Select(g => new { g.Key.ProductType, g.Key.ProductId, Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut) })
                    .ToListAsync();

            foreach (var row in stockRows)
            {
                holderStock[(row.ProductType == "SP" ? BinOccupancy.SparePartType : BinOccupancy.AccessoryType, row.ProductId)] =
                    Math.Max(0m, row.Quantity);
            }
        }

        // Sub category names : holders' and racks' assignments
        Dictionary<long, string> subCategoryNames =
            await SubCategoryNamesAsync(
                holderInfo.Values.Select(x => x.SubCategoryId)
                    .Concat(map.SelectMany(x => x.SubCategoryIds)));

        (long SubCategoryId, string MovementClass, string PartNumber) HolderInfo(BinHolderDto? holder) =>
            holder != null && holderInfo.TryGetValue((holder.ItemType, holder.ItemId), out var info)
                ? info
                : (0L, string.Empty, string.Empty);

        foreach (RackMapDto rack in map)
        {
            List<MassStoringShelfDto> shelves =
                rack.Shelves
                    .Select
                    (
                        shelf =>
                        {
                            RackMapBinDto? first =
                                shelf.Bins.FirstOrDefault(x => x.Holder != null);

                            return new MassStoringShelfDto
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
                                IsOwnType = first?.Holder != null && first.Holder.ItemType == ownType,
                                Bins =
                                    shelf.Bins
                                        .Select
                                        (
                                            bin =>
                                                new MassStoringBinDto
                                                {
                                                    BinNo = bin.BinNumber,
                                                    BinCode = bin.BinCode,
                                                    BinLabel = bin.BinLabel,
                                                    IsFree = bin.IsFree,
                                                    HeldByType = bin.Holder?.ItemType ?? string.Empty,
                                                    HeldById = bin.Holder?.ItemId ?? 0,
                                                    HeldByCode = bin.Holder?.ProductCode ?? string.Empty,
                                                    HeldByName = bin.Holder?.ItemName ?? string.Empty,
                                                    IsOwnType = bin.Holder != null && bin.Holder.ItemType == ownType,
                                                    HeldBySubCategoryId = HolderInfo(bin.Holder).SubCategoryId,
                                                    HeldBySubCategoryName = subCategoryNames.GetValueOrDefault(HolderInfo(bin.Holder).SubCategoryId, string.Empty),
                                                    HeldByMovementClass =
                                                        bin.Holder == null
                                                            ? string.Empty
                                                            : RackLabels.NormalizeMovementClass(HolderInfo(bin.Holder).MovementClass),
                                                    HeldByPartNumber = HolderInfo(bin.Holder).PartNumber,
                                                    HeldByStock =
                                                        bin.Holder == null
                                                            ? 0m
                                                            : holderStock.GetValueOrDefault((bin.Holder.ItemType, bin.Holder.ItemId))
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
                new MassStoringRackDto
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
                    Shelves = shelves,
                    ProductCategoryId = rack.ProductCategoryId,
                    CategoryName = rack.CategoryName,
                    SubCategoryIds = rack.SubCategoryIds.ToList(),
                    SubCategoryNames =
                        rack.SubCategoryIds
                            .Select(id => subCategoryNames.GetValueOrDefault(id, string.Empty))
                            .ToList(),
                    IsGeneral = rack.IsGeneral,
                    PrimeShelfFrom = rack.PrimeShelfFrom,
                    PrimeShelfTo = rack.PrimeShelfTo,
                    RackLetter = rack.RackLetter,
                    IsActive = rack.IsActive
                });
        }

        List<(long ProductId, long RackId, int Shelf, int Bin)> places =
            type == "SP"
                ? (
                    await _context
                        .Set<SparePartLocationsEntity>()
                        .AsNoTracking()
                        .Where(x => x.WarehouseId == warehouseId)
                        .Select(x => new { x.SparePartId, x.RackManagementId, x.ShelfNumber, x.BinNumber })
                        .ToListAsync()
                  )
                  .Select(x => (x.SparePartId, x.RackManagementId, x.ShelfNumber, x.BinNumber))
                  .ToList()
                : (
                    await _context
                        .Set<AccessoryLocationsEntity>()
                        .AsNoTracking()
                        .Where(x => x.WarehouseId == warehouseId)
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
                        new MassStoringPlaceDto
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
            CreateMassStoringDto dto,
            long userId
        )
    {
        if (dto == null)
        {
            throw new InvalidOperationException(
                "Change the place of at least one product.");
        }

        string type =
            TypeOf(dto.Type);

        Plan plan =
            await ResolveAsync(type, dto);

        DateTime now =
            DateTime.UtcNow;

        string userName =
            await UserNameAsync(userId);

        MassStoring entity =
            new()
            {
                Status = StatusDraft,
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
                    type == "SP" ? 1 : 2);

                int last =
                    await _context
                        .Set<MassStoring>()
                        .Where(x => x.PageType == type)
                        .Select(x => (int?)x.SequenceNo)
                        .MaxAsync()
                    ??
                    0;

                entity.SequenceNo =
                    last + 1;

                entity.StoringNo =
                    NumberOf(type, entity.SequenceNo);

                _context.Set<MassStoring>().Add(entity);

                await _context.SaveChangesAsync();

                await WriteLinesAsync(entity.MassStoringId, plan);

                AddHistory(entity, plan.Warehouse.Label, plan.Placed, plan.Cleared, "Create", "Saved", userId, userName, now);

                await _context.SaveChangesAsync();
            });

        return entity.MassStoringId;
    }

    public async Task
        UpdateAsync
        (
            long id,
            UpdateMassStoringDto dto,
            long userId
        )
    {
        if (dto == null)
        {
            throw new InvalidOperationException(
                "Change the place of at least one product.");
        }

        MassStoring entity =
            await _context
                .Set<MassStoring>()
                .FirstOrDefaultAsync(x => x.MassStoringId == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException("Mass storing not found.");

        if (entity.Status != StatusDraft)
        {
            throw new InvalidOperationException(
                $"Mass storing {entity.StoringNo} is {entity.Status}; only a draft can be changed.");
        }

        // The type is fixed after the first save
        Plan plan =
            await ResolveAsync(entity.PageType, dto);

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

                await WriteLinesAsync(entity.MassStoringId, plan);

                AddHistory(entity, plan.Warehouse.Label, plan.Placed, plan.Cleared, "Update", "Updated", userId, userName, now);

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
        MassStoring entity =
            await _context
                .Set<MassStoring>()
                .FirstOrDefaultAsync(x => x.MassStoringId == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException("Mass storing not found.");

        if (entity.Status != StatusDraft)
        {
            throw new InvalidOperationException(
                $"Mass storing {entity.StoringNo} is {entity.Status}; only a draft can be deleted (cancel a posted one).");
        }

        DateTime now =
            DateTime.UtcNow;

        (int placed, int cleared) =
            await CountsAsync(id);

        entity.IsDeleted = true;

        entity.DeletedBy = userId;

        entity.DeletedDate = now;

        AddHistory(entity, await WarehouseTextAsync(entity.WarehouseId), placed, cleared, "Delete", "Deleted", userId, await UserNameAsync(userId), now);

        await _context.SaveChangesAsync();
    }

    public async Task
        RestoreAsync
        (
            long id,
            long userId
        )
    {
        MassStoring entity =
            await _context
                .Set<MassStoring>()
                .FirstOrDefaultAsync(x => x.MassStoringId == id)
            ??
            throw new KeyNotFoundException("Mass storing not found.");

        if (!entity.IsDeleted)
        {
            throw new InvalidOperationException(
                $"Mass storing {entity.StoringNo} is not deleted.");
        }

        DateTime now =
            DateTime.UtcNow;

        (int placed, int cleared) =
            await CountsAsync(id);

        entity.IsDeleted = false;

        entity.DeletedBy = null;

        entity.DeletedDate = null;

        entity.ModifiedBy = userId;

        entity.ModifiedDate = now;

        AddHistory(entity, await WarehouseTextAsync(entity.WarehouseId), placed, cleared, "Restore", "Restored", userId, await UserNameAsync(userId), now);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Post : every line at once (From read again)
    //===========================================================

    public async Task<string>
        PostAsync
        (
            long id,
            long userId
        )
    {
        MassStoring found =
            await _context
                .Set<MassStoring>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MassStoringId == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException("Mass storing not found.");

        if (found.Status != StatusDraft)
        {
            throw new InvalidOperationException(
                $"Mass storing {found.StoringNo} is {found.Status}; only a draft can be posted.");
        }

        CreateMassStoringDto input =
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
                await LockStoringAsync(id);

                await LockWarehousePlacesAsync(found.WarehouseId);

                MassStoring entity =
                    await _context
                        .Set<MassStoring>()
                        .FirstAsync(x => x.MassStoringId == id);

                if (entity.Status != StatusDraft || entity.IsDeleted)
                {
                    throw new InvalidOperationException(
                        $"Mass storing {entity.StoringNo} was changed meanwhile ({entity.Status}). Open it again.");
                }

                // Checked again with the places as they are now
                Plan plan =
                    await ResolveAsync(entity.PageType, input);

                FillHeader(entity, plan);

                await WriteLinesAsync(entity.MassStoringId, plan);

                // Every line at once : deletes first, then writes
                await ApplyPlacesAsync(
                    entity.PageType,
                    entity.WarehouseId,
                    plan.Lines
                        .Select(x => (x.Product.Id, x.ToRackId, x.ToShelfNo, x.ToBinNo))
                        .ToList(),
                    userId,
                    now);

                entity.Status = StatusPosted;

                entity.PostedBy = userId;

                entity.PostedDate = now;

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                AddHistory(entity, plan.Warehouse.Label, plan.Placed, plan.Cleared, "Post", "Posted", userId, userName, now, "Locations applied.");

                await _context.SaveChangesAsync();

                status = entity.Status;
            });

        return status;
    }


    //===========================================================
    // Cancel : what stops putting the From places back ('' list
    // = nothing)
    //===========================================================

    private async Task<List<string>>
        CancelConflictsAsync
        (
            MassStoring entity,
            List<MassStoringLines> lines
        )
    {
        List<string> conflicts =
            new();

        if (lines.Count == 0)
        {
            return conflicts;
        }

        string type =
            entity.PageType;

        List<long> productIds =
            lines.Select(x => x.ProductId).Distinct().ToList();

        Dictionary<long, (long RackId, int Shelf, int Bin)> current =
            await LocationsAsync(type, entity.WarehouseId, productIds);

        Dictionary<long, RackManagementEntity> racks =
            await RacksAsync(
                lines
                    .Select(x => x.FromRackId ?? 0)
                    .Concat(lines.Select(x => x.ToRackId ?? 0))
                    .Concat(current.Values.Select(x => x.RackId)));

        long[] fromRackIds =
            lines
                .Where(x => x.FromRackId.HasValue)
                .Select(x => x.FromRackId!.Value)
                .Distinct()
                .ToArray();

        // Every product of the document leaves its posted place, so
        // only holders that are not among them block an old bin
        Dictionary<(long RackId, int Shelf, int Bin), List<BinHolderDto>> held =
            HoldersByShelf(
                await BinOccupancy.GetHoldersAsync(
                    _context,
                    fromRackIds,
                    0,
                    0));

        // Bins per shelf of the old racks (a bin removed since)
        Dictionary<(long RackId, int Shelf), int> binCounts =
            await BinOccupancy.GetBinCountsAsync(
                _context,
                fromRackIds);

        string ownType =
            HolderTypeOf(type);

        HashSet<long> moving =
            productIds.ToHashSet();

        HashSet<(long RackId, int Shelf, int Bin)> backTo =
            new();

        foreach (MassStoringLines line in lines)
        {
            string who =
                line.ProductCode.Length > 0 ? line.ProductCode : $"#{line.ProductId}";

            // Still where the posting put it
            bool placed =
                current.TryGetValue(line.ProductId, out (long RackId, int Shelf, int Bin) now);

            bool same =
                line.ToRackId.HasValue
                    ? placed && now.RackId == line.ToRackId.Value && now.Shelf == (line.ToShelfNo ?? 0) && now.Bin == BinOf(line.ToBinNo ?? 0)
                    : !placed;

            if (!same)
            {
                string nowText =
                    placed ? PlaceText(racks.GetValueOrDefault(now.RackId), now.Shelf, now.Bin) : "Unplaced";

                string postedText =
                    line.ToRackId.HasValue ? PlaceText(racks.GetValueOrDefault(line.ToRackId.Value), line.ToShelfNo, line.ToBinNo) : "Unplaced";

                conflicts.Add($"{who} : now at {nowText}, not at {postedText} as posted.");

                continue;
            }

            if (!line.FromRackId.HasValue)
            {
                continue;
            }

            // Its old bin must still exist and be free (final state)
            long fromRackId =
                line.FromRackId.Value;

            int fromShelf =
                line.FromShelfNo ?? 0;

            int fromBin =
                BinOf(line.FromBinNo ?? 0);

            if (!racks.TryGetValue(fromRackId, out RackManagementEntity? rack)
                || rack.IsDeleted
                || rack.WarehouseId != entity.WarehouseId)
            {
                conflicts.Add($"{who} : its old rack was removed.");

                continue;
            }

            string oldText =
                PlaceText(rack, fromShelf, fromBin);

            if (fromShelf < 1
                || fromShelf > rack.ShelfCount
                || fromBin > BinOccupancy.BinCountOf(binCounts, fromRackId, fromShelf))
            {
                conflicts.Add($"{who} : its old bin {oldText} no longer exists on the rack.");

                continue;
            }

            BinHolderDto? holder =
                StayingHolder(held, fromRackId, fromShelf, fromBin, ownType, moving);

            if (holder != null)
            {
                conflicts.Add($"{who} : its old bin {oldText} now holds {holder.ItemType.ToLowerInvariant()} {holder.ProductCode}.");

                continue;
            }

            if (!backTo.Add((fromRackId, fromShelf, fromBin)))
            {
                conflicts.Add($"{who} : its old bin {oldText} goes back to another product too.");
            }
        }

        return conflicts;
    }

    public async Task
        CancelAsync
        (
            long id,
            CancelMassStoringDto dto,
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

        MassStoring found =
            await _context
                .Set<MassStoring>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MassStoringId == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException("Mass storing not found.");

        DateTime now =
            DateTime.UtcNow;

        string userName =
            await UserNameAsync(userId);

        await InTransactionAsync(
            async () =>
            {
                await LockStoringAsync(id);

                await LockWarehousePlacesAsync(found.WarehouseId);

                MassStoring entity =
                    await _context
                        .Set<MassStoring>()
                        .FirstAsync(x => x.MassStoringId == id);

                if (entity.Status != StatusPosted || entity.IsDeleted)
                {
                    throw new InvalidOperationException(
                        $"Mass storing {entity.StoringNo} is {entity.Status}; only a posted one can be cancelled (delete a draft).");
                }

                List<MassStoringLines> lines =
                    await _context
                        .Set<MassStoringLines>()
                        .AsNoTracking()
                        .Where(x => x.MassStoringId == id)
                        .OrderBy(x => x.LineNo)
                        .ToListAsync();

                List<string> conflicts =
                    await CancelConflictsAsync(entity, lines);

                if (conflicts.Count > 0)
                {
                    throw new InvalidOperationException(
                        $"Mass storing {entity.StoringNo} cannot be cancelled : {Conflicts(conflicts)}");
                }

                // All or nothing : every From place back (deletes
                // first, then writes)
                await ApplyPlacesAsync(
                    entity.PageType,
                    entity.WarehouseId,
                    lines
                        .Select(x => (x.ProductId, x.FromRackId, x.FromShelfNo, x.FromBinNo))
                        .ToList(),
                    userId,
                    now);

                entity.Status = StatusCancelled;

                entity.CancelReason = reason;

                entity.CancelledBy = userId;

                entity.CancelledDate = now;

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                AddHistory(
                    entity,
                    await WarehouseTextAsync(entity.WarehouseId),
                    lines.Count(x => x.ToRackId.HasValue),
                    lines.Count(x => !x.ToRackId.HasValue),
                    "Cancel",
                    "Cancelled",
                    userId,
                    userName,
                    now,
                    $"Reason : {reason}. The previous places are back.");

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // History : every mass storing / one of them
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
            new[] { $"{EntityName}SP", $"{EntityName}AC" };

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
            .Set<global::AppCore.Domain.Entities.InventoryManagement.StockMovement.MassStoring>()
            .AsNoTracking()
            .Where(x => x.PublicId == publicId)
            .Select(x => (long?)x.MassStoringId)
            .FirstOrDefaultAsync();
    }


    //===========================================================
    // Get Paged (list page : tabs, type, search, sort and page on
    // the server). Deleted drafts are on the Deleted tab only.
    // Counts : All / <status> / Deleted (type + search applied),
    //          Type_<type> / Type_All (live, search applied).
    //===========================================================

    private static SortMap<MassStoring> PagedSorts()
    {
        return new SortMap<MassStoring>("StoringNo")
            .Add("StoringNo", x => x.StoringNo)
            .Add("DateText", x => x.StoringDate)
            .Add("TypeText", x => x.PageType)
            .Add("WarehouseText", x => x.WarehouseId)
            .Add("LineCount", x => x.LineCount)
            .Add("StatusText", x => x.Status)
            .Add("CreatedByName", x => x.CreatedBy)
            .Tie(x => x.MassStoringId);
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

    public async Task<PagedResult<MassStoringListRowDto>>
        GetPagedAsync
        (
            MassStoringPageRequest request
        )
    {
        IQueryable<MassStoring> query =
            _context
                .Set<MassStoring>()
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
                            x.StoringDate == day ||
                            EF.Functions.ILike(x.StoringNo, like) ||
                        EF.Functions.ILike(x.Remarks, like) ||
                        EF.Functions.ILike(x.Status, like) ||
                        EF.Functions.ILike(x.PageType, like) ||
                        _context.Set<WarehousesEntity>().Any(w => w.WarehouseId == x.WarehouseId && EF.Functions.ILike(w.WarehouseName, like))
                    );
            }
            else
            {
                query =
                    query.Where
                    (
                        x =>
                            EF.Functions.ILike(x.StoringNo, like) ||
                        EF.Functions.ILike(x.Remarks, like) ||
                        EF.Functions.ILike(x.Status, like) ||
                        EF.Functions.ILike(x.PageType, like) ||
                        _context.Set<WarehousesEntity>().Any(w => w.WarehouseId == x.WarehouseId && EF.Functions.ILike(w.WarehouseName, like))
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

        IQueryable<MassStoring> ordered =
            string.IsNullOrWhiteSpace(request.Sort)
                ? query
                    .OrderByDescending(x => x.CreatedDate)
                    .ThenByDescending(x => x.MassStoringId)
                : PagedSorts().Apply(query, request);

        List<MassStoring> rows =
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

        return new PagedResult<MassStoringListRowDto>
        {
            Items = await MapListRowsAsync(rows),
            TotalCount = total,
            Page = request.SafePage,
            PageSize = request.SafePageSize,
            Counts = counts
        };
    }
}
