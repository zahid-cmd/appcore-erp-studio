//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ProductSettings;

using SparePartsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SpareParts;

using SparePartLocationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SparePartLocations;

using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;

using AccessoryLocationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.AccessoryLocations;

using RackManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.RackManagement;

using RackShelvesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.RackShelves;

using RackSubCategoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.RackSubCategories;

using RackZonesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.RackZones;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using WarehousesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Warehouses;

using AppCore.Infrastructure.Persistence;

// RackLabels : shelf / bin labels
using AppCore.Infrastructure.Repositories.Settings.ProductSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ProductSettings;


//===============================================================
// Bin Occupancy (replaces Shelf Occupancy)
//
// Warehouse -> Zone -> Rack -> Shelf -> Bin. The BIN is the
// location : a bin (rack + shelf + bin number) holds ONE item
// only, a spare part OR an accessory, locked to it until it is
// moved / cleared / the item is deleted (even at zero stock).
// Only items that are not deleted hold a bin.
//
// Bins per shelf come from RackShelves; a shelf without a row
// counts 1 bin.
//
// Used by Spare Parts / Accessories (refuse a taken bin), Rack
// Management (items on a rack, form preview) and every page that
// places products (Opening Stock, Receiving, Product Transfer,
// Mass Storing, Product Pricing). See BINS-API.md.
//===============================================================

public static class BinOccupancy
{
    //===========================================================
    // Constants
    //===========================================================

    public const string SparePartType =
        "Spare Part";

    public const string AccessoryType =
        "Accessory";

    public const int MaxShelves =
        50;

    public const int MaxBinsPerShelf =
        60;


    //===========================================================
    // Holders of the bins of these racks
    //
    // excludeSparePartId / excludeAccessoryId : the item being
    // saved (its own bins don't block it); 0 = none.
    //===========================================================

    public static async Task<List<BinHolderDto>>
        GetHoldersAsync
        (
            AppDbContext context,
            long[] rackIds,
            long excludeSparePartId,
            long excludeAccessoryId
        )
    {
        if
        (
            rackIds == null
            ||
            rackIds.Length == 0
        )
        {
            return new List<BinHolderDto>();
        }

        List<BinHolderDto> spareParts =
            await
            (
                from l in context.Set<SparePartLocationsEntity>().AsNoTracking()

                join p in context.Set<SparePartsEntity>().AsNoTracking()
                    on l.SparePartId equals p.SparePartId

                where rackIds.Contains(l.RackManagementId)
                    && l.SparePartId != excludeSparePartId
                    && !p.IsDeleted

                select new BinHolderDto
                {
                    RackManagementId =
                        l.RackManagementId,

                    WarehouseId =
                        l.WarehouseId,

                    ShelfNumber =
                        l.ShelfNumber,

                    BinNumber =
                        l.BinNumber,

                    ItemType =
                        SparePartType,

                    ItemId =
                        p.SparePartId,

                    ProductCode =
                        p.ProductCode,

                    ItemName =
                        p.PartName
                }
            )
            .ToListAsync();

        List<BinHolderDto> accessories =
            await
            (
                from l in context.Set<AccessoryLocationsEntity>().AsNoTracking()

                join a in context.Set<AccessoriesEntity>().AsNoTracking()
                    on l.AccessoryId equals a.AccessoryId

                where rackIds.Contains(l.RackManagementId)
                    && l.AccessoryId != excludeAccessoryId
                    && !a.IsDeleted

                select new BinHolderDto
                {
                    RackManagementId =
                        l.RackManagementId,

                    WarehouseId =
                        l.WarehouseId,

                    ShelfNumber =
                        l.ShelfNumber,

                    BinNumber =
                        l.BinNumber,

                    ItemType =
                        AccessoryType,

                    ItemId =
                        a.AccessoryId,

                    ProductCode =
                        a.ProductCode,

                    ItemName =
                        a.AccessoryName
                }
            )
            .ToListAsync();

        return spareParts
            .Concat(
                accessories)
            .ToList();
    }


    //===========================================================
    // Bins per shelf : (rack, shelf) -> BinCount
    //===========================================================

    public static async Task<Dictionary<(long RackId, int Shelf), int>>
        GetBinCountsAsync
        (
            AppDbContext context,
            long[] rackIds
        )
    {
        Dictionary<(long RackId, int Shelf), int> counts =
            new();

        if
        (
            rackIds == null
            ||
            rackIds.Length == 0
        )
        {
            return counts;
        }

        List<RackShelvesEntity> rows =
            await context
                .Set<RackShelvesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        rackIds.Contains(x.RackManagementId)
                )
                .ToListAsync();

        foreach
        (
            RackShelvesEntity row
            in rows
        )
        {
            counts[(row.RackManagementId, row.ShelfNumber)] =
                Math.Max(1, row.BinCount);
        }

        return counts;
    }


    // A shelf without a RackShelves row counts 1 bin
    public static int BinCountOf
    (
        IReadOnlyDictionary<(long RackId, int Shelf), int> counts,
        long rackId,
        int shelfNumber
    )
    {
        return counts.TryGetValue(
                (rackId, shelfNumber),
                out int count)
            ? Math.Max(1, count)
            : 1;
    }


    //===========================================================
    // Free bins of one rack (shelf-then-bin order). The excluded
    // item's own bin counts as free.
    //===========================================================

    public static async Task<List<(int ShelfNumber, int BinNumber)>>
        FreeBinsAsync
        (
            AppDbContext context,
            long rackId,
            long excludeSparePartId,
            long excludeAccessoryId
        )
    {
        List<RackMapDto> map =
            await GetRackMapAsync(
                context,
                0,
                excludeSparePartId,
                excludeAccessoryId,
                false,
                new[] { rackId });

        RackMapDto? rack =
            FindRack(
                map,
                rackId);

        if
        (
            rack == null
        )
        {
            return new List<(int ShelfNumber, int BinNumber)>();
        }

        return rack.Shelves
            .SelectMany
            (
                shelf =>
                    shelf.Bins
                        .Where(bin => bin.IsFree)
                        .Select(bin => (shelf.ShelfNumber, bin.BinNumber))
            )
            .ToList();
    }


    //===========================================================
    // Rack Map : racks -> shelves -> bins with the holder of each
    // bin, zone, assignment and prime flags.
    //
    // warehouseId : every live rack of that warehouse (when
    //               rackIds is null / empty).
    // rackIds     : only these live racks (any warehouse).
    // activeOnly  : leave out inactive racks.
    // Order : zone priority, zone code, rack code (racks without
    // a zone last).
    //===========================================================

    public static async Task<List<RackMapDto>>
        GetRackMapAsync
        (
            AppDbContext context,
            long warehouseId,
            long excludeSparePartId = 0,
            long excludeAccessoryId = 0,
            bool activeOnly = false,
            long[]? rackIds = null
        )
    {
        bool byIds =
            rackIds != null
            &&
            rackIds.Length > 0;

        if
        (
            !byIds
            &&
            warehouseId <= 0
        )
        {
            return new List<RackMapDto>();
        }

        long[] wantedIds =
            rackIds ?? Array.Empty<long>();

        IQueryable<RackManagementEntity> query =
            context
                .Set<RackManagementEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted);

        query =
            byIds
                ? query.Where(x => wantedIds.Contains(x.RackManagementId))
                : query.Where(x => x.WarehouseId == warehouseId);

        if
        (
            activeOnly
        )
        {
            query =
                query.Where(x => x.IsActive);
        }

        List<RackManagementEntity> racks =
            await query.ToListAsync();

        if
        (
            racks.Count ==
            0
        )
        {
            return new List<RackMapDto>();
        }

        long[] ids =
            racks
                .Select(x => x.RackManagementId)
                .ToArray();

        long[] warehouseIds =
            racks
                .Select(x => x.WarehouseId)
                .Distinct()
                .ToArray();

        long[] zoneIds =
            racks
                .Where(x => x.RackZoneId.HasValue)
                .Select(x => x.RackZoneId!.Value)
                .Distinct()
                .ToArray();

        long[] categoryIds =
            racks
                .Where(x => x.ProductCategoryId.HasValue)
                .Select(x => x.ProductCategoryId!.Value)
                .Distinct()
                .ToArray();

        Dictionary<long, string> warehouseCodes =
            await context
                .Set<WarehousesEntity>()
                .AsNoTracking()
                .Where(x => warehouseIds.Contains(x.WarehouseId))
                .ToDictionaryAsync
                (
                    x => x.WarehouseId,
                    x => x.WarehouseCode
                );

        Dictionary<long, RackZonesEntity> zones =
            await context
                .Set<RackZonesEntity>()
                .AsNoTracking()
                .Where(x => zoneIds.Contains(x.RackZoneId))
                .ToDictionaryAsync
                (
                    x => x.RackZoneId
                );

        Dictionary<long, ProductCategoryEntity> categories =
            await context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .Where(x => categoryIds.Contains(x.ProductCategoryId))
                .ToDictionaryAsync
                (
                    x => x.ProductCategoryId
                );

        List<RackSubCategoriesEntity> subCategories =
            await context
                .Set<RackSubCategoriesEntity>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.RackManagementId))
                .ToListAsync();

        Dictionary<(long RackId, int Shelf), int> counts =
            await GetBinCountsAsync(
                context,
                ids);

        // Every holder (the excluded item is marked IsOwn below)
        List<BinHolderDto> holders =
            await GetHoldersAsync(
                context,
                ids,
                0,
                0);

        // One holder per bin (old data could hold two; the first wins)
        Dictionary<(long RackId, int Shelf, int Bin), BinHolderDto> holderOf =
            holders
                .GroupBy(x => (x.RackManagementId, x.ShelfNumber, x.BinNumber))
                .ToDictionary
                (
                    g => (g.Key.RackManagementId, g.Key.ShelfNumber, g.Key.BinNumber),
                    g => g.First()
                );

        List<RackMapDto> map =
            new();

        foreach
        (
            RackManagementEntity rack
            in racks
        )
        {
            RackZonesEntity? zone =
                rack.RackZoneId.HasValue
                && zones.TryGetValue(rack.RackZoneId.Value, out RackZonesEntity? z)
                    ? z
                    : null;

            ProductCategoryEntity? category =
                rack.ProductCategoryId.HasValue
                && categories.TryGetValue(rack.ProductCategoryId.Value, out ProductCategoryEntity? c)
                    ? c
                    : null;

            List<long> subIds =
                subCategories
                    .Where(x => x.RackManagementId == rack.RackManagementId)
                    .Select(x => x.ProductSubCategoryId)
                    .Distinct()
                    .ToList();

            string warehouseCode =
                warehouseCodes.TryGetValue(rack.WarehouseId, out string? code)
                    ? code
                    : string.Empty;

            RackMapDto item =
                new RackMapDto
                {
                    RackManagementId =
                        rack.RackManagementId,

                    WarehouseId =
                        rack.WarehouseId,

                    WarehouseCode =
                        warehouseCode,

                    RackCode =
                        rack.RackCode,

                    FullRackCode =
                        warehouseCode.Length > 0
                            ? $"{warehouseCode}-{rack.RackCode}"
                            : rack.RackCode,

                    RackName =
                        rack.RackName,

                    RackLetter =
                        RackLabels.Letter(rack.RackName),

                    RackType =
                        rack.RackType,

                    IsActive =
                        rack.IsActive,

                    RackZoneId =
                        rack.RackZoneId,

                    ZoneCode =
                        zone?.ZoneCode ?? string.Empty,

                    ZoneName =
                        zone?.ZoneName ?? string.Empty,

                    ZonePriority =
                        zone?.Priority ?? 0,

                    ProductCategoryId =
                        rack.ProductCategoryId,

                    CategoryName =
                        category?.CategoryName ?? string.Empty,

                    CategoryType =
                        category?.CategoryType ?? string.Empty,

                    SubCategoryIds =
                        subIds,

                    IsGeneral =
                        !rack.ProductCategoryId.HasValue,

                    AssignmentText =
                        AssignmentText(
                            rack.ProductCategoryId.HasValue
                                ? category?.CategoryName ?? "(deleted category)"
                                : null,
                            subIds.Count),

                    PrimeShelfFrom =
                        rack.PrimeShelfFrom,

                    PrimeShelfTo =
                        rack.PrimeShelfTo,

                    ShelfCount =
                        rack.ShelfCount
                };

            for
            (
                int shelfNumber = 1;
                shelfNumber <= rack.ShelfCount;
                shelfNumber++
            )
            {
                int binCount =
                    BinCountOf(
                        counts,
                        rack.RackManagementId,
                        shelfNumber);

                RackMapShelfDto shelf =
                    new RackMapShelfDto
                    {
                        ShelfNumber =
                            shelfNumber,

                        ShelfLabel =
                            RackLabels.Shelf(rack.RackName, shelfNumber),

                        BinCount =
                            binCount,

                        IsPrime =
                            IsPrime(rack.PrimeShelfFrom, rack.PrimeShelfTo, shelfNumber)
                    };

                for
                (
                    int binNumber = 1;
                    binNumber <= binCount;
                    binNumber++
                )
                {
                    holderOf.TryGetValue(
                        (rack.RackManagementId, shelfNumber, binNumber),
                        out BinHolderDto? holder);

                    bool own =
                        holder != null
                        &&
                        (
                            (holder.ItemType == SparePartType && excludeSparePartId > 0 && holder.ItemId == excludeSparePartId)
                            ||
                            (holder.ItemType == AccessoryType && excludeAccessoryId > 0 && holder.ItemId == excludeAccessoryId)
                        );

                    shelf.Bins.Add(
                        new RackMapBinDto
                        {
                            BinNumber =
                                binNumber,

                            BinCode =
                                RackLabels.BinCode(rack.RackName, shelfNumber, binNumber),

                            BinLabel =
                                RackLabels.BinLabel(rack.RackName, shelfNumber, binNumber),

                            IsFree =
                                holder == null || own,

                            IsOwn =
                                own,

                            Holder =
                                holder
                        });
                }

                shelf.FreeBins =
                    shelf.Bins.Count(x => x.IsFree);

                item.Shelves.Add(
                    shelf);
            }

            item.TotalBins =
                item.Shelves.Sum(x => x.BinCount);

            item.FreeBins =
                item.Shelves.Sum(x => x.FreeBins);

            map.Add(
                item);
        }

        return map
            .OrderBy(x => x.RackZoneId.HasValue ? 0 : 1)
            .ThenBy(x => x.ZonePriority)
            .ThenBy(x => x.ZoneCode)
            .ThenBy(x => x.RackCode)
            .ToList();
    }


    //===========================================================
    // Check one (rack, shelf, bin) for a warehouse
    //
    // null = OK, else the reason (callers add their own prefix,
    // e.g. "Line 3: "). An inactive rack is NOT refused here.
    //===========================================================

    public static async Task<string?>
        CheckBinAsync
        (
            AppDbContext context,
            long warehouseId,
            long rackId,
            int shelfNumber,
            int binNumber,
            long excludeSparePartId,
            long excludeAccessoryId
        )
    {
        if
        (
            rackId <=
            0
        )
        {
            return "select a rack.";
        }

        List<RackMapDto> map =
            await GetRackMapAsync(
                context,
                0,
                excludeSparePartId,
                excludeAccessoryId,
                false,
                new[] { rackId });

        return CheckBin(
            FindRack(map, rackId),
            warehouseId,
            shelfNumber,
            binNumber);
    }


    // The same check against a map already loaded (bins marked
    // IsOwn count as free)
    public static string? CheckBin
    (
        RackMapDto? rack,
        long warehouseId,
        int shelfNumber,
        int binNumber
    )
    {
        if
        (
            rack == null
        )
        {
            return "select a rack (the rack was not found or has been deleted).";
        }

        if
        (
            warehouseId > 0
            &&
            rack.WarehouseId != warehouseId
        )
        {
            return $"rack {rack.RackCode} - {rack.RackName} is not in this warehouse.";
        }

        RackMapShelfDto? shelf =
            rack.Shelves.FirstOrDefault(x => x.ShelfNumber == shelfNumber);

        if
        (
            shelf == null
        )
        {
            return rack.ShelfCount > 0
                ? $"select a shelf between {RackLabels.Shelf(rack.RackName, 1)} and " +
                  $"{RackLabels.Shelf(rack.RackName, rack.ShelfCount)} on {rack.RackName}."
                : $"{rack.RackName} has no shelves.";
        }

        RackMapBinDto? bin =
            shelf.Bins.FirstOrDefault(x => x.BinNumber == binNumber);

        if
        (
            bin == null
        )
        {
            return $"select a bin between 01 and {shelf.BinCount:00} on {shelf.ShelfLabel} ({rack.RackName}).";
        }

        if
        (
            !bin.IsFree
            &&
            bin.Holder != null
        )
        {
            return $"bin {bin.BinCode} ({rack.RackName}) is already used by " +
                   $"{bin.Holder.ItemType.ToLowerInvariant()} {bin.Holder.ProductCode} - {bin.Holder.ItemName}. Choose another bin.";
        }

        return null;
    }


    //===========================================================
    // Lookups
    //===========================================================

    public static RackMapDto? FindRack
    (
        IEnumerable<RackMapDto> map,
        long rackId
    )
    {
        return map.FirstOrDefault(x => x.RackManagementId == rackId);
    }


    public static RackMapBinDto? FindBin
    (
        IEnumerable<RackMapDto> map,
        long rackId,
        int shelfNumber,
        int binNumber
    )
    {
        return FindRack(map, rackId)?
            .Shelves.FirstOrDefault(x => x.ShelfNumber == shelfNumber)?
            .Bins.FirstOrDefault(x => x.BinNumber == binNumber);
    }


    //===========================================================
    // Assignment plan (a hint, never a block)
    //
    // General rack : anything fits. Assigned rack : same category
    // and (no sub categories OR the sub category is listed).
    //===========================================================

    public static bool FitsPlan
    (
        RackMapDto rack,
        long productCategoryId,
        long productSubCategoryId
    )
    {
        if
        (
            !rack.ProductCategoryId.HasValue
        )
        {
            return true;
        }

        if
        (
            rack.ProductCategoryId.Value !=
            productCategoryId
        )
        {
            return false;
        }

        return rack.SubCategoryIds.Count == 0
            ||
            rack.SubCategoryIds.Contains(productSubCategoryId);
    }


    // "General" / "<Category>" / "<Category> (n sub categories)"
    public static string AssignmentText
    (
        string? categoryName,
        int subCategoryCount
    )
    {
        if
        (
            categoryName == null
        )
        {
            return "General";
        }

        return subCategoryCount switch
        {
            0 => categoryName,
            1 => $"{categoryName} (1 sub category)",
            _ => $"{categoryName} ({subCategoryCount} sub categories)"
        };
    }


    // Shelf inside the prime range (both ends set)
    public static bool IsPrime
    (
        int? primeShelfFrom,
        int? primeShelfTo,
        int shelfNumber
    )
    {
        return primeShelfFrom.HasValue
            && primeShelfTo.HasValue
            && shelfNumber >= primeShelfFrom.Value
            && shelfNumber <= primeShelfTo.Value;
    }
}
