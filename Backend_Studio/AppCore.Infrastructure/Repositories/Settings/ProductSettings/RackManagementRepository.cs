//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ProductSettings;

using RackManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.RackManagement;

using SparePartLocationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SparePartLocations;

using SparePartsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SpareParts;

using AccessoryLocationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.AccessoryLocations;

using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;

using WarehousesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Warehouses;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using RackZonesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.RackZones;

using RackShelvesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.RackShelves;

using RackSubCategoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.RackSubCategories;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using AppCore.Infrastructure.Persistence;
using AppCore.Domain.Common;

// RackLabels : shelf / bin labels
using AppCore.Infrastructure.Repositories.Settings.ProductSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ProductSettings;


//===============================================================
// Rack Management Repository
//
// Warehouse : must exist; new racks need an active warehouse.
//             Locked after saving. The rack's BranchId is copied
//             from the warehouse.
// Code      : R-nnn per warehouse, always generated here; deleted
//             rows count, so a number is never reused.
// Name      : "Rack A", "Rack B" … built here, read-only. The
//             lowest letter not used by a live rack of the
//             warehouse, so a deleted rack's letter is reused.
//             After Z : AA, AB … Unique within the warehouse.
// Shelves   : 1 … 50, shown as SLF-<letter>-nn (SLF-A-01 …).
//             Lowering the count is refused while an item sits on
//             a shelf that would be removed.
// Bins      : per shelf, 1 … 60 (RackShelves; one row per shelf,
//             created / trimmed on save). Bin code A-03-05.
//             Lowering a shelf's bins is refused while an item
//             sits in a bin that would be removed.
// Zone      : a zone of the same warehouse; required when the
//             warehouse has at least one active zone.
// Assignment: category of type Spare Parts / Lubricants /
//             Accessories (none = General rack) + its sub
//             categories (none = the whole category) + prime
//             shelves From / To (both or none). A plan for
//             allocation; it never blocks manual placement.
// Type      : Open Shelf / Closed Cabinet / Bin Rack / Pallet Rack
//             (optional).
// Delete    : refused (409) while any item uses the rack.
//
// Zones (Zones tab) : Z-nn per warehouse (deleted rows count,
//             never reused); name unique per warehouse ignoring
//             case; Priority >= 1. Delete refused (409) while a
//             live rack uses the zone.
//===============================================================

public class RackManagementRepository : IRackManagementRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string CodePrefix =
        "R";

    private const string NamePrefix =
        "Rack ";

    private const int MaxShelves =
        BinOccupancy.MaxShelves;

    private const int MaxBins =
        BinOccupancy.MaxBinsPerShelf;

    private const string ZoneCodePrefix =
        "Z";

    private const int ZoneNameMaxLength =
        100;

    // Category Types a rack can be assigned to (racks don't hold bikes)
    private static readonly string[] AssignableCategoryTypes =
        new[]
        {
            "Spare Parts",
            "Lubricants",
            "Accessories"
        };

    private static readonly string[] RackTypes =
        new[]
        {
            "Open Shelf",
            "Closed Cabinet",
            "Bin Rack",
            "Pallet Rack"
        };


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public RackManagementRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Live spare part locations (parts not deleted)
    //===========================================================

    private IQueryable<SparePartLocationsEntity> LiveLocations()
    {
        return
            from l in _context.Set<SparePartLocationsEntity>().AsNoTracking()

            join p in _context.Set<SparePartsEntity>().AsNoTracking()
                on l.SparePartId equals p.SparePartId

            where !p.IsDeleted

            select l;
    }


    //===========================================================
    // Live accessory locations (accessories not deleted)
    //
    // A shelf holds one item : a spare part OR an accessory, so
    // both kinds count as "placed" on a rack.
    //===========================================================

    private IQueryable<AccessoryLocationsEntity> LiveAccessoryLocations()
    {
        return
            from l in _context.Set<AccessoryLocationsEntity>().AsNoTracking()

            join a in _context.Set<AccessoriesEntity>().AsNoTracking()
                on l.AccessoryId equals a.AccessoryId

            where !a.IsDeleted

            select l;
    }


    //===========================================================
    // Query (with branch / warehouse names and parts placed)
    //===========================================================

    private IQueryable<RackManagementDto> RackManagementQuery()
    {
        // Captured as a variable so EF inlines it as a sub query
        IQueryable<SparePartLocationsEntity> liveLocations =
            LiveLocations();

        IQueryable<AccessoryLocationsEntity> liveAccessoryLocations =
            LiveAccessoryLocations();

        return
            from x in _context.Set<RackManagementEntity>().AsNoTracking()

            where !x.IsDeleted

            join w in _context.Set<WarehousesEntity>().AsNoTracking()
                on x.WarehouseId equals w.WarehouseId into wj
            from w in wj.DefaultIfEmpty()

            join b in _context.Set<BranchesEntity>().AsNoTracking()
                on x.BranchId equals b.BranchId into bj
            from b in bj.DefaultIfEmpty()

            join z in _context.Set<RackZonesEntity>().AsNoTracking()
                on x.RackZoneId equals (long?)z.RackZoneId into zj
            from z in zj.DefaultIfEmpty()

            join c in _context.Set<ProductCategoryEntity>().AsNoTracking()
                on x.ProductCategoryId equals (long?)c.ProductCategoryId into cj
            from c in cj.DefaultIfEmpty()

            select new RackManagementDto
            {
                RackManagementId =
                    x.RackManagementId,
                PublicId = x.PublicId,

                BranchId =
                    x.BranchId,

                BranchName =
                    b != null ? b.BranchName : string.Empty,

                WarehouseId =
                    x.WarehouseId,

                WarehouseCode =
                    w != null ? w.WarehouseCode : string.Empty,

                WarehouseName =
                    w != null ? w.WarehouseName : string.Empty,

                RackCode =
                    x.RackCode,

                FullRackCode =
                    w != null
                        ? w.WarehouseCode + "-" + x.RackCode
                        : x.RackCode,

                RackName =
                    x.RackName,

                ShelfCount =
                    x.ShelfCount,

                RackZoneId =
                    x.RackZoneId,

                ZoneCode =
                    z != null ? z.ZoneCode : string.Empty,

                ZoneName =
                    z != null ? z.ZoneName : string.Empty,

                ZonePriority =
                    z != null ? z.Priority : 0,

                ProductCategoryId =
                    x.ProductCategoryId,

                CategoryCode =
                    c != null ? c.CategoryCode : string.Empty,

                CategoryName =
                    c != null ? c.CategoryName : string.Empty,

                CategoryType =
                    c != null ? c.CategoryType : string.Empty,

                IsGeneral =
                    x.ProductCategoryId == null,

                PrimeShelfFrom =
                    x.PrimeShelfFrom,

                PrimeShelfTo =
                    x.PrimeShelfTo,

                ZoneAisle =
                    x.ZoneAisle,

                RackType =
                    x.RackType,

                // Spare parts + accessories placed on the rack
                PartsPlaced =
                    liveLocations
                        .Count
                        (
                            l =>
                                l.RackManagementId ==
                                x.RackManagementId
                        )
                    +
                    liveAccessoryLocations
                        .Count
                        (
                            l =>
                                l.RackManagementId ==
                                x.RackManagementId
                        ),

                Remarks =
                    x.Remarks,

                IsActive =
                    x.IsActive,

                IsDeleted =
                    x.IsDeleted,

                DeletedBy =
                    x.DeletedBy,

                DeletedDate =
                    x.DeletedDate,

                CreatedBy =
                    x.CreatedBy,

                CreatedDate =
                    x.CreatedDate,

                ModifiedBy =
                    x.ModifiedBy,

                ModifiedDate =
                    x.ModifiedDate
            };
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<RackManagementDto>>
        GetAllAsync()
    {
        List<RackManagementDto> items =
            await RackManagementQuery()
                .OrderBy
                (
                    x =>
                        x.WarehouseCode
                )
                .ThenBy
                (
                    x =>
                        x.RackCode
                )
                .ToListAsync();

        await AttachDetailsAsync(
            items);

        return items;
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<RackManagementDto?>
        GetByIdAsync
        (
            long id
        )
    {
        RackManagementDto? item =
            await RackManagementQuery()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.RackManagementId ==
                        id
                );

        if
        (
            item !=
            null
        )
        {
            await AttachDetailsAsync(
                new List<RackManagementDto> { item });
        }

        return item;
    }


    //===========================================================
    // Shelves (bins per shelf), sub categories, totals and the
    // assignment text
    //===========================================================

    private async Task
        AttachDetailsAsync
        (
            List<RackManagementDto> items
        )
    {
        if
        (
            items.Count ==
            0
        )
        {
            return;
        }

        long[] ids =
            items
                .Select(x => x.RackManagementId)
                .ToArray();

        Dictionary<(long RackId, int Shelf), int> counts =
            await BinOccupancy.GetBinCountsAsync(
                _context,
                ids);

        var subCategories =
            await
            (
                from r in _context.Set<RackSubCategoriesEntity>().AsNoTracking()

                where ids.Contains(r.RackManagementId)

                join s in _context.Set<ProductSubCategoryEntity>().AsNoTracking()
                    on r.ProductSubCategoryId equals s.ProductSubCategoryId into sj
                from s in sj.DefaultIfEmpty()

                select new
                {
                    r.RackManagementId,

                    Item =
                        new RackSubCategoryDto
                        {
                            ProductSubCategoryId =
                                r.ProductSubCategoryId,

                            SubCategoryCode =
                                s != null ? s.SubCategoryCode : string.Empty,

                            SubCategoryName =
                                s != null ? s.SubCategoryName : string.Empty
                        }
                }
            )
            .ToListAsync();

        foreach
        (
            RackManagementDto item
            in items
        )
        {
            item.RackLetter =
                RackLabels.Letter(
                    item.RackName);

            item.Shelves =
                Enumerable
                    .Range(1, Math.Max(0, item.ShelfCount))
                    .Select
                    (
                        n =>
                            new RackShelfDto
                            {
                                ShelfNumber =
                                    n,

                                ShelfLabel =
                                    RackLabels.Shelf(item.RackName, n),

                                BinCount =
                                    BinOccupancy.BinCountOf(counts, item.RackManagementId, n),

                                IsPrime =
                                    BinOccupancy.IsPrime(item.PrimeShelfFrom, item.PrimeShelfTo, n)
                            }
                    )
                    .ToList();

            item.TotalBins =
                item.Shelves.Sum(x => x.BinCount);

            item.SubCategories =
                subCategories
                    .Where(x => x.RackManagementId == item.RackManagementId)
                    .Select(x => x.Item)
                    .OrderBy(x => x.SubCategoryCode)
                    .ToList();

            item.SubCategoryIds =
                item.SubCategories
                    .Select(x => x.ProductSubCategoryId)
                    .ToList();

            item.AssignmentText =
                BinOccupancy.AssignmentText(
                    item.ProductCategoryId.HasValue
                        ? (item.CategoryName.Length > 0 ? item.CategoryName : "(deleted category)")
                        : null,
                    item.SubCategories.Count);
        }
    }


    //===========================================================
    // Bins : one rack (form preview) / every rack of a warehouse
    //===========================================================

    public async Task<RackMapDto?>
        GetBinsAsync
        (
            long id
        )
    {
        List<RackMapDto> map =
            await BinOccupancy.GetRackMapAsync(
                _context,
                0,
                0,
                0,
                false,
                new[] { id });

        return BinOccupancy.FindRack(
            map,
            id);
    }


    public Task<List<RackMapDto>>
        GetWarehouseBinsAsync
        (
            long warehouseId,
            long sparePartId,
            long accessoryId,
            bool activeOnly
        )
    {
        return BinOccupancy.GetRackMapAsync(
            _context,
            warehouseId,
            sparePartId,
            accessoryId,
            activeOnly);
    }


    //===========================================================
    // Warehouse
    //===========================================================

    private async Task<WarehousesEntity>
        ResolveWarehouseAsync
        (
            long warehouseId,
            bool forNewRack
        )
    {
        if
        (
            warehouseId <=
            0
        )
        {
            throw new InvalidOperationException(
                "Warehouse is required.");
        }

        WarehousesEntity? warehouse =
            await _context
                .Set<WarehousesEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.WarehouseId ==
                        warehouseId
                        &&
                        !x.IsDeleted
                );

        if
        (
            warehouse ==
            null
        )
        {
            throw new InvalidOperationException(
                "The selected Warehouse was not found. It may have been deleted.");
        }

        if
        (
            forNewRack
            &&
            !warehouse.IsActive
        )
        {
            throw new InvalidOperationException(
                $"Warehouse '{warehouse.WarehouseName}' is inactive.");
        }

        return warehouse;
    }


    //===========================================================
    // Next Code (per warehouse; deleted rows included)
    //===========================================================

    private async Task<string>
        GetNextCodeAsync
        (
            long warehouseId
        )
    {
        List<string> codes =
            await _context
                .Set<RackManagementEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.WarehouseId ==
                        warehouseId
                )
                .Select
                (
                    x =>
                        x.RackCode
                )
                .ToListAsync();

        int highest =
            0;

        foreach
        (
            string code
            in codes
        )
        {
            string[] parts =
                (code ?? string.Empty)
                    .Trim()
                    .Split(
                        '-',
                        StringSplitOptions.RemoveEmptyEntries);

            if
            (
                parts.Length == 2
                &&
                string.Equals(
                    parts[0].Trim(),
                    CodePrefix,
                    StringComparison.OrdinalIgnoreCase)
                &&
                int.TryParse(
                    parts[1].Trim(),
                    out int number)
                &&
                number > highest
            )
            {
                highest =
                    number;
            }
        }

        return $"{CodePrefix}-{highest + 1:D3}";
    }


    //===========================================================
    // Rack Letters : 0 → A … 25 → Z, 26 → AA, 27 → AB …
    //===========================================================

    private static string LetterFor
    (
        int index
    )
    {
        string letters =
            string.Empty;

        int n =
            index + 1;

        while
        (
            n > 0
        )
        {
            n--;

            letters =
                (char)('A' + n % 26)
                +
                letters;

            n /=
                26;
        }

        return letters;
    }


    // "Rack B" → "B" (anything else → '')
    public static string RackLetter
    (
        string? rackName
    )
    {
        string name =
            (rackName ?? string.Empty).Trim();

        return name.StartsWith(
                NamePrefix,
                StringComparison.OrdinalIgnoreCase)
            ? name[NamePrefix.Length..].Trim().ToUpperInvariant()
            : string.Empty;
    }


    // SLF-A-03
    public static string ShelfLabel
    (
        string? rackName,
        int shelfNumber
    )
    {
        string letter =
            RackLetter(
                rackName);

        return string.IsNullOrEmpty(letter)
            ? $"SLF-{shelfNumber:D2}"
            : $"SLF-{letter}-{shelfNumber:D2}";
    }


    //===========================================================
    // Next Name : lowest free letter among live racks of the
    // warehouse (deleted racks free their letter)
    //===========================================================

    private async Task<string>
        GetNextNameAsync
        (
            long warehouseId
        )
    {
        List<string> names =
            await _context
                .Set<RackManagementEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.WarehouseId ==
                        warehouseId
                        &&
                        !x.IsDeleted
                )
                .Select
                (
                    x =>
                        x.RackName
                )
                .ToListAsync();

        HashSet<string> used =
            names
                .Select(RackLetter)
                .Where(x => x.Length > 0)
                .ToHashSet();

        int index =
            0;

        while
        (
            used.Contains(
                LetterFor(index))
        )
        {
            index++;
        }

        return $"{NamePrefix}{LetterFor(index)}";
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<RackManagementDefaultsDto>
        GetDefaultsAsync
        (
            long warehouseId
        )
    {
        RackManagementDefaultsDto defaults =
            new RackManagementDefaultsDto
            {
                MaxShelves =
                    MaxShelves,

                MaxBinsPerShelf =
                    MaxBins,

                Categories =
                    await GetAssignableCategoriesAsync()
            };

        if
        (
            warehouseId <=
            0
        )
        {
            return defaults;
        }

        WarehousesEntity warehouse =
            await ResolveWarehouseAsync(
                warehouseId,
                false);

        string code =
            await GetNextCodeAsync(
                warehouseId);

        defaults.Code =
            code;

        defaults.FullCode =
            $"{warehouse.WarehouseCode}-{code}";

        defaults.Name =
            await GetNextNameAsync(
                warehouseId);

        defaults.Zones =
            (await GetZonesAsync(warehouseId))
                .Where(x => x.IsActive)
                .ToList();

        defaults.ZoneRequired =
            defaults.Zones.Count > 0;

        return defaults;
    }


    //===========================================================
    // Assignable categories : live + active, of type Spare Parts
    // / Lubricants / Accessories, with their live sub categories
    //===========================================================

    private async Task<List<RackCategoryOptionDto>>
        GetAssignableCategoriesAsync()
    {
        string[] types =
            AssignableCategoryTypes
                .Select(x => x.ToLower())
                .ToArray();

        List<RackCategoryOptionDto> categories =
            await
            (
                from c in _context.Set<ProductCategoryEntity>().AsNoTracking()

                where !c.IsDeleted
                    && c.IsActive
                    && types.Contains(c.CategoryType.Trim().ToLower())

                join b in _context.Set<BrandManagementEntity>().AsNoTracking()
                    on c.BrandManagementId equals (long?)b.BrandManagementId into bj
                from b in bj.DefaultIfEmpty()

                orderby c.CategoryType, c.CategoryName

                select new RackCategoryOptionDto
                {
                    ProductCategoryId =
                        c.ProductCategoryId,

                    CategoryCode =
                        c.CategoryCode,

                    CategoryName =
                        c.CategoryName,

                    CategoryType =
                        c.CategoryType,

                    BrandName =
                        b != null ? b.BrandName : string.Empty
                }
            )
            .ToListAsync();

        long[] categoryIds =
            categories
                .Select(x => x.ProductCategoryId)
                .ToArray();

        var subCategories =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        categoryIds.Contains(x.ProductCategoryId)
                        &&
                        !x.IsDeleted
                )
                .OrderBy(x => x.SubCategoryCode)
                .Select
                (
                    x =>
                        new
                        {
                            x.ProductCategoryId,
                            x.ProductSubCategoryId,
                            x.SubCategoryCode,
                            x.SubCategoryName
                        }
                )
                .ToListAsync();

        foreach
        (
            RackCategoryOptionDto category
            in categories
        )
        {
            category.SubCategories =
                subCategories
                    .Where(x => x.ProductCategoryId == category.ProductCategoryId)
                    .Select
                    (
                        x =>
                            new RackSubCategoryDto
                            {
                                ProductSubCategoryId =
                                    x.ProductSubCategoryId,

                                SubCategoryCode =
                                    x.SubCategoryCode,

                                SubCategoryName =
                                    x.SubCategoryName
                            }
                    )
                    .ToList();
        }

        return categories;
    }


    //===========================================================
    // Normalize Input
    //===========================================================

    private static (int Shelves, string Zone, string Type)
        Normalize
        (
            int shelfCount,
            string? zoneAisle,
            string? rackType
        )
    {
        if
        (
            shelfCount < 1
            ||
            shelfCount > MaxShelves
        )
        {
            throw new InvalidOperationException(
                $"Number of Shelves must be between 1 and {MaxShelves}.");
        }

        string zone =
            zoneAisle?.Trim()
            ??
            string.Empty;

        if
        (
            zone.Length >
            100
        )
        {
            throw new InvalidOperationException(
                "Zone / Aisle cannot be longer than 100 characters.");
        }

        string type =
            string.IsNullOrWhiteSpace(rackType)
                ? string.Empty
                : RackTypes.FirstOrDefault
                  (
                      x =>
                          string.Equals(
                              x,
                              rackType.Trim(),
                              StringComparison.OrdinalIgnoreCase)
                  )
                  ??
                  throw new InvalidOperationException(
                      $"Rack Type must be one of: {string.Join(", ", RackTypes)}.");

        return
        (
            shelfCount,
            zone,
            type
        );
    }


    //===========================================================
    // Shelves : shelf number -> bins (1 … ShelfCount, each
    // 1 … 60). A shelf missing from the list keeps its saved
    // bins (update), else gets BinsPerShelf.
    //===========================================================

    private static Dictionary<int, int>
        NormalizeShelves
        (
            int shelfCount,
            int binsPerShelf,
            List<RackShelfInputDto>? shelves,
            IReadOnlyDictionary<(long RackId, int Shelf), int>? saved = null,
            long rackId = 0
        )
    {
        int fallback =
            binsPerShelf <= 0
                ? 1
                : binsPerShelf;

        if
        (
            fallback > MaxBins
        )
        {
            throw new InvalidOperationException(
                $"Bins on every shelf must be between 1 and {MaxBins}.");
        }

        Dictionary<int, int> result =
            new();

        for
        (
            int n = 1;
            n <= shelfCount;
            n++
        )
        {
            result[n] =
                saved != null
                && saved.TryGetValue((rackId, n), out int savedBins)
                    ? savedBins
                    : fallback;
        }

        foreach
        (
            RackShelfInputDto shelf
            in (shelves ?? new List<RackShelfInputDto>())
                .Where(x => x != null)
        )
        {
            // Rows beyond the shelf count are ignored (trimmed)
            if
            (
                shelf.ShelfNumber < 1
                ||
                shelf.ShelfNumber > shelfCount
            )
            {
                continue;
            }

            if
            (
                shelf.BinCount < 1
                ||
                shelf.BinCount > MaxBins
            )
            {
                throw new InvalidOperationException(
                    $"Shelf {shelf.ShelfNumber:00}: bins must be between 1 and {MaxBins}.");
            }

            result[shelf.ShelfNumber] =
                shelf.BinCount;
        }

        return result;
    }


    //===========================================================
    // Prime shelves : both or none (0 = none),
    // 1 <= From <= To <= ShelfCount
    //===========================================================

    private static (int? From, int? To)
        NormalizePrime
        (
            int? primeFrom,
            int? primeTo,
            int shelfCount
        )
    {
        int? from =
            primeFrom.HasValue && primeFrom.Value > 0
                ? primeFrom
                : null;

        int? to =
            primeTo.HasValue && primeTo.Value > 0
                ? primeTo
                : null;

        if
        (
            from == null
            &&
            to == null
        )
        {
            return (null, null);
        }

        if
        (
            from == null
            ||
            to == null
        )
        {
            throw new InvalidOperationException(
                "Prime Shelves : choose both From and To, or leave both empty.");
        }

        if
        (
            from.Value > to.Value
        )
        {
            throw new InvalidOperationException(
                "Prime Shelves : From cannot be after To.");
        }

        if
        (
            to.Value > shelfCount
        )
        {
            throw new InvalidOperationException(
                $"Prime Shelves : the rack has only {shelfCount} shelves.");
        }

        return (from, to);
    }


    //===========================================================
    // Zone : of the same warehouse, not deleted. Required when
    // the warehouse has at least one active zone. An inactive
    // zone is refused unless the rack already uses it.
    //===========================================================

    private async Task<long?>
        ResolveZoneAsync
        (
            long warehouseId,
            long? rackZoneId,
            long? currentZoneId
        )
    {
        long zoneId =
            rackZoneId ?? 0;

        if
        (
            zoneId <=
            0
        )
        {
            bool hasZones =
                await _context
                    .Set<RackZonesEntity>()
                    .AsNoTracking()
                    .AnyAsync
                    (
                        x =>
                            x.WarehouseId == warehouseId
                            &&
                            !x.IsDeleted
                            &&
                            x.IsActive
                    );

            if
            (
                hasZones
            )
            {
                throw new InvalidOperationException(
                    "Zone is required. Choose a zone of this warehouse (manage zones on the Zones tab).");
            }

            return null;
        }

        RackZonesEntity? zone =
            await _context
                .Set<RackZonesEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.RackZoneId == zoneId
                        &&
                        !x.IsDeleted
                );

        if
        (
            zone == null
        )
        {
            throw new InvalidOperationException(
                "The selected Zone was not found. It may have been deleted.");
        }

        if
        (
            zone.WarehouseId !=
            warehouseId
        )
        {
            throw new InvalidOperationException(
                $"Zone {zone.ZoneCode} - {zone.ZoneName} is not in this warehouse.");
        }

        if
        (
            !zone.IsActive
            &&
            currentZoneId != zone.RackZoneId
        )
        {
            throw new InvalidOperationException(
                $"Zone {zone.ZoneCode} - {zone.ZoneName} is inactive.");
        }

        return zone.RackZoneId;
    }


    //===========================================================
    // Assignment : category (null / 0 = General rack) of type
    // Spare Parts / Lubricants / Accessories + sub categories of
    // that category (none = the whole category). An inactive
    // category is refused unless the rack already uses it.
    //===========================================================

    private async Task<(long? CategoryId, List<long> SubCategoryIds)>
        ResolveAssignmentAsync
        (
            long? productCategoryId,
            List<long>? subCategoryIds,
            long? currentCategoryId
        )
    {
        long categoryId =
            productCategoryId ?? 0;

        List<long> subIds =
            (subCategoryIds ?? new List<long>())
                .Where(x => x > 0)
                .Distinct()
                .ToList();

        if
        (
            categoryId <=
            0
        )
        {
            if
            (
                subIds.Count > 0
            )
            {
                throw new InvalidOperationException(
                    "Choose the Category before its Sub Categories (or clear the Sub Categories for a General rack).");
            }

            return (null, subIds);
        }

        ProductCategoryEntity? category =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ProductCategoryId == categoryId
                        &&
                        !x.IsDeleted
                );

        if
        (
            category == null
        )
        {
            throw new InvalidOperationException(
                "The selected Category was not found. It may have been deleted.");
        }

        if
        (
            !AssignableCategoryTypes.Any
            (
                x =>
                    string.Equals(
                        x,
                        category.CategoryType?.Trim(),
                        StringComparison.OrdinalIgnoreCase)
            )
        )
        {
            throw new InvalidOperationException(
                $"Category '{category.CategoryName}' is of type {category.CategoryType}. " +
                $"A rack can be assigned to {string.Join(" / ", AssignableCategoryTypes)} categories only.");
        }

        if
        (
            !category.IsActive
            &&
            currentCategoryId != category.ProductCategoryId
        )
        {
            throw new InvalidOperationException(
                $"Category '{category.CategoryName}' is inactive.");
        }

        if
        (
            subIds.Count > 0
        )
        {
            List<long> valid =
                await _context
                    .Set<ProductSubCategoryEntity>()
                    .AsNoTracking()
                    .Where
                    (
                        x =>
                            subIds.Contains(x.ProductSubCategoryId)
                            &&
                            x.ProductCategoryId == categoryId
                            &&
                            !x.IsDeleted
                    )
                    .Select(x => x.ProductSubCategoryId)
                    .ToListAsync();

            if
            (
                valid.Count !=
                subIds.Count
            )
            {
                throw new InvalidOperationException(
                    $"Every Sub Category must belong to '{category.CategoryName}' (a chosen sub category was not found or has been deleted).");
            }
        }

        return (category.ProductCategoryId, subIds);
    }


    //===========================================================
    // Items must still fit : no item on a shelf / in a bin that
    // the new layout removes
    //===========================================================

    private async Task
        EnsureItemsFitAsync
        (
            RackManagementEntity rack,
            int shelves,
            Dictionary<int, int> bins
        )
    {
        List<BinHolderDto> holders =
            await BinOccupancy.GetHoldersAsync(
                _context,
                new[] { rack.RackManagementId },
                0,
                0);

        List<BinHolderDto> offShelf =
            holders
                .Where(x => x.ShelfNumber > shelves)
                .OrderBy(x => x.ShelfNumber)
                .ThenBy(x => x.BinNumber)
                .ToList();

        if
        (
            offShelf.Count > 0
        )
        {
            throw new InvalidOperationException(
                $"Number of Shelves cannot be lowered to {shelves}: " +
                $"{Describe(rack.RackName, offShelf)}. Move them first.");
        }

        List<BinHolderDto> offBin =
            holders
                .Where
                (
                    x =>
                        bins.TryGetValue(x.ShelfNumber, out int count)
                        &&
                        x.BinNumber > count
                )
                .OrderBy(x => x.ShelfNumber)
                .ThenBy(x => x.BinNumber)
                .ToList();

        if
        (
            offBin.Count > 0
        )
        {
            throw new InvalidOperationException(
                $"Bins cannot be lowered: " +
                $"{Describe(rack.RackName, offBin)}. Move them first.");
        }
    }


    // "A-04-02 holds spare part SP-001-001-00003 - Brake Pad, …"
    // (first five, then "and n more")
    private static string Describe
    (
        string rackName,
        List<BinHolderDto> holders
    )
    {
        List<string> texts =
            holders
                .Take(5)
                .Select
                (
                    x =>
                        $"{RackLabels.BinCode(rackName, x.ShelfNumber, x.BinNumber)} holds " +
                        $"{x.ItemType.ToLowerInvariant()} {x.ProductCode} - {x.ItemName}"
                )
                .ToList();

        if
        (
            holders.Count > 5
        )
        {
            texts.Add(
                $"and {holders.Count - 5} more");
        }

        return string.Join(
            ", ",
            texts);
    }


    //===========================================================
    // Save shelves (one row per shelf; extra rows removed) and
    // sub categories (replaced)
    //===========================================================

    private async Task
        SaveShelvesAsync
        (
            long rackId,
            Dictionary<int, int> bins
        )
    {
        List<RackShelvesEntity> rows =
            await _context
                .Set<RackShelvesEntity>()
                .Where(x => x.RackManagementId == rackId)
                .ToListAsync();

        _context
            .Set<RackShelvesEntity>()
            .RemoveRange(
                rows.Where(x => !bins.ContainsKey(x.ShelfNumber)));

        foreach
        (
            KeyValuePair<int, int> shelf
            in bins.OrderBy(x => x.Key)
        )
        {
            RackShelvesEntity? row =
                rows.FirstOrDefault(x => x.ShelfNumber == shelf.Key);

            if
            (
                row == null
            )
            {
                _context
                    .Set<RackShelvesEntity>()
                    .Add(
                        new RackShelvesEntity
                        {
                            RackManagementId =
                                rackId,

                            ShelfNumber =
                                shelf.Key,

                            BinCount =
                                shelf.Value
                        });
            }
            else
            {
                row.BinCount =
                    shelf.Value;
            }
        }
    }


    private async Task
        SaveSubCategoriesAsync
        (
            long rackId,
            List<long> subCategoryIds
        )
    {
        List<RackSubCategoriesEntity> rows =
            await _context
                .Set<RackSubCategoriesEntity>()
                .Where(x => x.RackManagementId == rackId)
                .ToListAsync();

        _context
            .Set<RackSubCategoriesEntity>()
            .RemoveRange(
                rows.Where(x => !subCategoryIds.Contains(x.ProductSubCategoryId)));

        foreach
        (
            long subCategoryId
            in subCategoryIds.Where(id => !rows.Any(x => x.ProductSubCategoryId == id))
        )
        {
            _context
                .Set<RackSubCategoriesEntity>()
                .Add(
                    new RackSubCategoriesEntity
                    {
                        RackManagementId =
                            rackId,

                        ProductSubCategoryId =
                            subCategoryId
                    });
        }
    }


    //===========================================================
    // Duplicate Check (non-deleted rows only, per warehouse)
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            long warehouseId,
            string code,
            string name,
            long excludeId
        )
    {
        string codeKey =
            code.Trim().ToLower();

        string nameKey =
            name.Trim().ToLower();

        RackManagementEntity? sameCode =
            await _context
                .Set<RackManagementEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.RackManagementId != excludeId
                        &&
                        x.WarehouseId == warehouseId
                        &&
                        x.RackCode.ToLower() == codeKey
                );

        if
        (
            sameCode !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Rack Code '{code}' is already used by '{sameCode.RackName}' in this warehouse.");
        }

        RackManagementEntity? sameName =
            await _context
                .Set<RackManagementEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.RackManagementId != excludeId
                        &&
                        x.WarehouseId == warehouseId
                        &&
                        x.RackName.ToLower() == nameKey
                );

        if
        (
            sameName !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Rack '{name}' already exists in this warehouse ({sameName.RackCode}).");
        }
    }


    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory
    (
        RackManagementEntity entity,
        string activityType,
        string verb,
        long userId,
        string detail = ""
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Product Settings",

                EntityName =
                    "RackManagement",

                EntityId =
                    entity.RackManagementId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Rack {verb}",

                ActivityDescription =
                    $"Rack '{entity.RackName}' ({entity.RackCode}) {verb.ToLower()}.{detail}",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );
    }


    //===========================================================
    // Create (code always generated here)
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateRackManagementDto dto,
            long userId
        )
    {
        WarehousesEntity warehouse =
            await ResolveWarehouseAsync(
                dto.WarehouseId,
                true);

        (int shelves, string zone, string type) =
            Normalize(
                dto.ShelfCount,
                dto.ZoneAisle,
                dto.RackType);

        Dictionary<int, int> bins =
            NormalizeShelves(
                shelves,
                dto.BinsPerShelf,
                dto.Shelves);

        (int? primeFrom, int? primeTo) =
            NormalizePrime(
                dto.PrimeShelfFrom,
                dto.PrimeShelfTo,
                shelves);

        long? rackZoneId =
            await ResolveZoneAsync(
                warehouse.WarehouseId,
                dto.RackZoneId,
                null);

        (long? categoryId, List<long> subCategoryIds) =
            await ResolveAssignmentAsync(
                dto.ProductCategoryId,
                dto.SubCategoryIds,
                null);

        string code =
            await GetNextCodeAsync(
                warehouse.WarehouseId);

        // "Rack A", "Rack B" … (the form's name is only a preview)
        string name =
            await GetNextNameAsync(
                warehouse.WarehouseId);

        await EnsureUniqueAsync(
            warehouse.WarehouseId,
            code,
            name,
            0);

        RackManagementEntity entity =
            new RackManagementEntity
            {
                BranchId =
                    warehouse.BranchId,

                WarehouseId =
                    warehouse.WarehouseId,

                RackCode =
                    code,

                RackName =
                    name,

                ShelfCount =
                    shelves,

                RackZoneId =
                    rackZoneId,

                ProductCategoryId =
                    categoryId,

                PrimeShelfFrom =
                    primeFrom,

                PrimeShelfTo =
                    primeTo,

                ZoneAisle =
                    zone,

                RackType =
                    type,

                Remarks =
                    dto.Remarks?.Trim()
                    ??
                    string.Empty,

                IsActive =
                    dto.IsActive,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };


        //=======================================================
        // Rack + its shelves + sub categories in one transaction
        //=======================================================

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        _context
            .Set<RackManagementEntity>()
            .Add(
                entity);

        await _context.SaveChangesAsync();

        await SaveShelvesAsync(
            entity.RackManagementId,
            bins);

        await SaveSubCategoriesAsync(
            entity.RackManagementId,
            subCategoryIds);

        AddHistory(
            entity,
            "Create",
            "Created",
            userId,
            $" {shelves} shelves, {bins.Values.Sum()} bins.");

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.RackManagementId;
    }


    //===========================================================
    // Update (warehouse, code and name locked)
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateRackManagementDto dto,
            long userId
        )
    {
        RackManagementEntity? entity =
            await _context
                .Set<RackManagementEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.RackManagementId ==
                        dto.RackManagementId
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Rack not found.");
        }

        if
        (
            dto.WarehouseId > 0
            &&
            dto.WarehouseId != entity.WarehouseId
        )
        {
            throw new InvalidOperationException(
                "Warehouse cannot be changed after saving.");
        }

        (int shelves, string zone, string type) =
            Normalize(
                dto.ShelfCount,
                dto.ZoneAisle,
                dto.RackType);

        Dictionary<int, int> bins =
            NormalizeShelves(
                shelves,
                dto.BinsPerShelf,
                dto.Shelves,
                await BinOccupancy.GetBinCountsAsync(
                    _context,
                    new[] { entity.RackManagementId }),
                entity.RackManagementId);

        (int? primeFrom, int? primeTo) =
            NormalizePrime(
                dto.PrimeShelfFrom,
                dto.PrimeShelfTo,
                shelves);

        long? rackZoneId =
            await ResolveZoneAsync(
                entity.WarehouseId,
                dto.RackZoneId,
                entity.RackZoneId);

        (long? categoryId, List<long> subCategoryIds) =
            await ResolveAssignmentAsync(
                dto.ProductCategoryId,
                dto.SubCategoryIds,
                entity.ProductCategoryId);


        //=======================================================
        // Fewer shelves / bins : no item may sit on a removed
        // shelf or in a removed bin
        //=======================================================

        await EnsureItemsFitAsync(
            entity,
            shelves,
            bins);

        // Name is read-only after creation
        entity.ShelfCount =
            shelves;

        entity.RackZoneId =
            rackZoneId;

        entity.ProductCategoryId =
            categoryId;

        entity.PrimeShelfFrom =
            primeFrom;

        entity.PrimeShelfTo =
            primeTo;

        // Legacy text : kept when the form does not send it
        if
        (
            dto.ZoneAisle !=
            null
        )
        {
            entity.ZoneAisle =
                zone;
        }

        entity.RackType =
            type;

        entity.Remarks =
            dto.Remarks?.Trim()
            ??
            string.Empty;

        entity.IsActive =
            dto.IsActive;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await SaveShelvesAsync(
            entity.RackManagementId,
            bins);

        await SaveSubCategoriesAsync(
            entity.RackManagementId,
            subCategoryIds);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Update",
            "Updated",
            userId,
            $" {shelves} shelves, {bins.Values.Sum()} bins.");

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    //===========================================================
    // Delete (409 while items use the rack)
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        RackManagementEntity? entity =
            await _context
                .Set<RackManagementEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.RackManagementId ==
                        id
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Rack not found.");
        }

        int partsPlaced =
            await LiveLocations()
                .CountAsync
                (
                    l =>
                        l.RackManagementId ==
                        id
                )
            +
            await LiveAccessoryLocations()
                .CountAsync
                (
                    l =>
                        l.RackManagementId ==
                        id
                );

        if
        (
            partsPlaced >
            0
        )
        {
            throw new InvalidOperationException(
                $"Rack '{entity.RackName}' cannot be deleted because {partsPlaced} item(s) (spare parts / accessories) are placed on it. " +
                "Move them to another rack first.");
        }

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Delete",
            "Deleted",
            userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore (latest deleted; 409 while its warehouse is deleted
    // or its code / name is taken)
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        RackManagementEntity? entity =
            await _context
                .Set<RackManagementEntity>()
                .Where
                (
                    x =>
                        x.IsDeleted
                )
                .OrderByDescending
                (
                    x =>
                        x.DeletedDate
                )
                .FirstOrDefaultAsync();

        if
        (
            entity ==
            null
        )
        {
            return false;
        }

        try
        {
            await ResolveWarehouseAsync(
                entity.WarehouseId,
                false);

            await EnsureUniqueAsync(
                entity.WarehouseId,
                entity.RackCode,
                entity.RackName,
                entity.RackManagementId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Rack '{entity.RackName}' cannot be restored. {ex.Message} " +
                "Its letter may have been reused by a newer rack.");
        }

        // A zone deleted meanwhile is dropped (choose a new one on edit)
        if
        (
            entity.RackZoneId.HasValue
            &&
            !await _context
                .Set<RackZonesEntity>()
                .AnyAsync
                (
                    x =>
                        x.RackZoneId == entity.RackZoneId.Value
                        &&
                        !x.IsDeleted
                )
        )
        {
            entity.RackZoneId =
                null;
        }

        entity.IsDeleted =
            false;

        entity.DeletedBy =
            null;

        entity.DeletedDate =
            null;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Restore",
            "Restored",
            userId);

        await _context.SaveChangesAsync();

        return true;
    }


    //===========================================================
    // Exists
    //===========================================================

    public async Task<bool>
        ExistsAsync
        (
            long id
        )
    {
        return await _context
            .Set<RackManagementEntity>()
            .AnyAsync
            (
                x =>
                    x.RackManagementId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }


    //===========================================================
    //===========================================================
    // ZONES (Zones tab of Rack Management)
    //===========================================================
    //===========================================================


    //===========================================================
    // Zone Query (with warehouse / branch names, live racks)
    //===========================================================

    private IQueryable<RackZoneDto> ZoneQuery()
    {
        IQueryable<RackManagementEntity> liveRacks =
            _context
                .Set<RackManagementEntity>()
                .AsNoTracking()
                .Where(r => !r.IsDeleted);

        return
            from z in _context.Set<RackZonesEntity>().AsNoTracking()

            where !z.IsDeleted

            join w in _context.Set<WarehousesEntity>().AsNoTracking()
                on z.WarehouseId equals w.WarehouseId into wj
            from w in wj.DefaultIfEmpty()

            join b in _context.Set<BranchesEntity>().AsNoTracking()
                on z.BranchId equals b.BranchId into bj
            from b in bj.DefaultIfEmpty()

            select new RackZoneDto
            {
                RackZoneId =
                    z.RackZoneId,

                BranchId =
                    z.BranchId,

                BranchName =
                    b != null ? b.BranchName : string.Empty,

                WarehouseId =
                    z.WarehouseId,

                WarehouseCode =
                    w != null ? w.WarehouseCode : string.Empty,

                WarehouseName =
                    w != null ? w.WarehouseName : string.Empty,

                ZoneCode =
                    z.ZoneCode,

                ZoneName =
                    z.ZoneName,

                Priority =
                    z.Priority,

                RackCount =
                    liveRacks.Count(r => r.RackZoneId == (long?)z.RackZoneId),

                Remarks =
                    z.Remarks,

                IsActive =
                    z.IsActive,

                IsDeleted =
                    z.IsDeleted,

                DeletedBy =
                    z.DeletedBy,

                DeletedDate =
                    z.DeletedDate,

                CreatedBy =
                    z.CreatedBy,

                CreatedDate =
                    z.CreatedDate,

                ModifiedBy =
                    z.ModifiedBy,

                ModifiedDate =
                    z.ModifiedDate
            };
    }


    //===========================================================
    // Get Zones (warehouseId 0 = every warehouse)
    //===========================================================

    public async Task<List<RackZoneDto>>
        GetZonesAsync
        (
            long warehouseId
        )
    {
        IQueryable<RackZoneDto> query =
            ZoneQuery();

        if
        (
            warehouseId > 0
        )
        {
            query =
                query.Where(x => x.WarehouseId == warehouseId);
        }

        return await query
            .OrderBy(x => x.WarehouseCode)
            .ThenBy(x => x.Priority)
            .ThenBy(x => x.ZoneCode)
            .ToListAsync();
    }


    public async Task<RackZoneDto?>
        GetZoneByIdAsync
        (
            long id
        )
    {
        return await ZoneQuery()
            .FirstOrDefaultAsync(x => x.RackZoneId == id);
    }


    //===========================================================
    // Next Zone Code (per warehouse; deleted rows included)
    //===========================================================

    private async Task<string>
        GetNextZoneCodeAsync
        (
            long warehouseId
        )
    {
        List<string> codes =
            await _context
                .Set<RackZonesEntity>()
                .AsNoTracking()
                .Where(x => x.WarehouseId == warehouseId)
                .Select(x => x.ZoneCode)
                .ToListAsync();

        int highest =
            0;

        foreach
        (
            string code
            in codes
        )
        {
            string[] parts =
                (code ?? string.Empty)
                    .Trim()
                    .Split(
                        '-',
                        StringSplitOptions.RemoveEmptyEntries);

            if
            (
                parts.Length == 2
                &&
                string.Equals(
                    parts[0].Trim(),
                    ZoneCodePrefix,
                    StringComparison.OrdinalIgnoreCase)
                &&
                int.TryParse(
                    parts[1].Trim(),
                    out int number)
                &&
                number > highest
            )
            {
                highest =
                    number;
            }
        }

        return $"{ZoneCodePrefix}-{highest + 1:D2}";
    }


    //===========================================================
    // Zone Defaults : next code and priority
    //===========================================================

    public async Task<RackZoneDefaultsDto>
        GetZoneDefaultsAsync
        (
            long warehouseId
        )
    {
        if
        (
            warehouseId <=
            0
        )
        {
            return new RackZoneDefaultsDto();
        }

        await ResolveWarehouseAsync(
            warehouseId,
            false);

        int highestPriority =
            await _context
                .Set<RackZonesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.WarehouseId == warehouseId
                        &&
                        !x.IsDeleted
                )
                .Select(x => (int?)x.Priority)
                .MaxAsync()
            ?? 0;

        return new RackZoneDefaultsDto
        {
            Code =
                await GetNextZoneCodeAsync(
                    warehouseId),

            NextPriority =
                highestPriority + 1
        };
    }


    //===========================================================
    // Zone Input
    //===========================================================

    private static (string Name, int Priority, string Remarks)
        NormalizeZone
        (
            string? zoneName,
            int priority,
            string? remarks
        )
    {
        string name =
            string.Join(
                " ",
                (zoneName ?? string.Empty)
                    .Split(
                        ' ',
                        StringSplitOptions.RemoveEmptyEntries));

        if
        (
            name.Length ==
            0
        )
        {
            throw new InvalidOperationException(
                "Zone Name is required.");
        }

        if
        (
            name.Length >
            ZoneNameMaxLength
        )
        {
            throw new InvalidOperationException(
                $"Zone Name cannot be longer than {ZoneNameMaxLength} characters.");
        }

        if
        (
            priority < 1
        )
        {
            throw new InvalidOperationException(
                "Priority must be 1 or more (1 = nearest the counter).");
        }

        string text =
            remarks?.Trim()
            ??
            string.Empty;

        if
        (
            text.Length >
            1000
        )
        {
            throw new InvalidOperationException(
                "Remarks cannot be longer than 1000 characters.");
        }

        return
        (
            name,
            priority,
            text
        );
    }


    //===========================================================
    // Zone Duplicate Check (live rows, per warehouse; the name
    // ignores case)
    //===========================================================

    private async Task
        EnsureZoneUniqueAsync
        (
            long warehouseId,
            string code,
            string name,
            long excludeId
        )
    {
        string codeKey =
            code.Trim().ToLower();

        string nameKey =
            name.Trim().ToLower();

        RackZonesEntity? sameCode =
            await _context
                .Set<RackZonesEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.RackZoneId != excludeId
                        &&
                        x.WarehouseId == warehouseId
                        &&
                        x.ZoneCode.ToLower() == codeKey
                );

        if
        (
            sameCode !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Zone Code '{code}' is already used by '{sameCode.ZoneName}' in this warehouse.");
        }

        RackZonesEntity? sameName =
            await _context
                .Set<RackZonesEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.RackZoneId != excludeId
                        &&
                        x.WarehouseId == warehouseId
                        &&
                        x.ZoneName.ToLower() == nameKey
                );

        if
        (
            sameName !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Zone '{name}' already exists in this warehouse ({sameName.ZoneCode}).");
        }
    }


    //===========================================================
    // Zone Activity History
    //===========================================================

    private void AddZoneHistory
    (
        RackZonesEntity entity,
        string activityType,
        string verb,
        long userId
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Product Settings",

                EntityName =
                    "RackZones",

                EntityId =
                    entity.RackZoneId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Zone {verb}",

                ActivityDescription =
                    $"Zone '{entity.ZoneName}' ({entity.ZoneCode}, priority {entity.Priority}) {verb.ToLower()}.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );
    }


    //===========================================================
    // Create Zone (code always generated here)
    //===========================================================

    public async Task<long>
        CreateZoneAsync
        (
            CreateRackZoneDto dto,
            long userId
        )
    {
        WarehousesEntity warehouse =
            await ResolveWarehouseAsync(
                dto.WarehouseId,
                true);

        (string name, int priority, string remarks) =
            NormalizeZone(
                dto.ZoneName,
                dto.Priority,
                dto.Remarks);

        string code =
            await GetNextZoneCodeAsync(
                warehouse.WarehouseId);

        await EnsureZoneUniqueAsync(
            warehouse.WarehouseId,
            code,
            name,
            0);

        RackZonesEntity entity =
            new RackZonesEntity
            {
                BranchId =
                    warehouse.BranchId,

                WarehouseId =
                    warehouse.WarehouseId,

                ZoneCode =
                    code,

                ZoneName =
                    name,

                Priority =
                    priority,

                Remarks =
                    remarks,

                IsActive =
                    dto.IsActive,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };

        _context
            .Set<RackZonesEntity>()
            .Add(
                entity);

        await _context.SaveChangesAsync();

        AddZoneHistory(
            entity,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        return entity.RackZoneId;
    }


    //===========================================================
    // Update Zone (warehouse and code locked)
    //===========================================================

    public async Task
        UpdateZoneAsync
        (
            long id,
            UpdateRackZoneDto dto,
            long userId
        )
    {
        long zoneId =
            id > 0
                ? id
                : dto.RackZoneId;

        RackZonesEntity? entity =
            await _context
                .Set<RackZonesEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.RackZoneId == zoneId
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Zone not found.");
        }

        if
        (
            dto.WarehouseId > 0
            &&
            dto.WarehouseId != entity.WarehouseId
        )
        {
            throw new InvalidOperationException(
                "Warehouse cannot be changed after saving.");
        }

        (string name, int priority, string remarks) =
            NormalizeZone(
                dto.ZoneName,
                dto.Priority,
                dto.Remarks);

        await EnsureZoneUniqueAsync(
            entity.WarehouseId,
            entity.ZoneCode,
            name,
            entity.RackZoneId);

        entity.ZoneName =
            name;

        entity.Priority =
            priority;

        entity.Remarks =
            remarks;

        entity.IsActive =
            dto.IsActive;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddZoneHistory(
            entity,
            "Update",
            "Updated",
            userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Delete Zone (409 while a live rack uses it)
    //===========================================================

    public async Task
        DeleteZoneAsync
        (
            long id,
            long userId
        )
    {
        RackZonesEntity? entity =
            await _context
                .Set<RackZonesEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.RackZoneId == id
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Zone not found.");
        }

        List<string> racks =
            await _context
                .Set<RackManagementEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.RackZoneId == (long?)id
                        &&
                        !x.IsDeleted
                )
                .OrderBy(x => x.RackCode)
                .Select(x => x.RackName)
                .ToListAsync();

        if
        (
            racks.Count > 0
        )
        {
            throw new InvalidOperationException(
                $"Zone '{entity.ZoneName}' cannot be deleted because {racks.Count} rack(s) use it " +
                $"({string.Join(", ", racks.Take(10))}{(racks.Count > 10 ? " ..." : string.Empty)}). " +
                "Move them to another zone first.");
        }

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddZoneHistory(
            entity,
            "Delete",
            "Deleted",
            userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore Zone (id 0 = the latest deleted; 409 while its
    // warehouse is deleted or its code / name is taken)
    //===========================================================

    public async Task<bool>
        RestoreZoneAsync
        (
            long id,
            long userId
        )
    {
        IQueryable<RackZonesEntity> deleted =
            _context
                .Set<RackZonesEntity>()
                .Where(x => x.IsDeleted);

        RackZonesEntity? entity =
            id > 0
                ? await deleted.FirstOrDefaultAsync(x => x.RackZoneId == id)
                : await deleted
                    .OrderByDescending(x => x.DeletedDate)
                    .FirstOrDefaultAsync();

        if
        (
            entity ==
            null
        )
        {
            return false;
        }

        try
        {
            await ResolveWarehouseAsync(
                entity.WarehouseId,
                false);

            await EnsureZoneUniqueAsync(
                entity.WarehouseId,
                entity.ZoneCode,
                entity.ZoneName,
                entity.RackZoneId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Zone '{entity.ZoneName}' cannot be restored. {ex.Message}");
        }

        entity.IsDeleted =
            false;

        entity.DeletedBy =
            null;

        entity.DeletedDate =
            null;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddZoneHistory(
            entity,
            "Restore",
            "Restored",
            userId);

        await _context.SaveChangesAsync();

        return true;
    }


    //===========================================================
    // Public Id -> internal id (live rows only)
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
            .Set<global::AppCore.Domain.Entities.Settings.ProductSettings.RackManagement>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.PublicId == publicId)
            .Select(x => (long?)x.RackManagementId)
            .FirstOrDefaultAsync();
    }
}
