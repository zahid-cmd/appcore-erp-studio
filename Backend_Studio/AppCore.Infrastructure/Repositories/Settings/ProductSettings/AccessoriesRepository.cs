//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ProductSettings;

using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using GeneralLedgersEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using AccessoryLocationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.AccessoryLocations;

using RackManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.RackManagement;

using WarehousesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Warehouses;

using AppCore.Infrastructure.Persistence;
using AppCore.Domain.Common;

// BusinessLineAccess : warehouses whose branch runs a business line
using AppCore.Infrastructure.Repositories.Settings.GeneralSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ProductSettings;


//===============================================================
// Accessories Repository
//
// One Accessory = one item inside a Product Sub Category.
//
// Parent    : Product Category must be of Category Type
//             "Accessories"; the Sub Category must belong to it.
//             New accessories need an active category and sub
//             category. Both are locked after saving.
// Codes     : nnnnn = highest number already used by any accessory
//             of the sub category or any ledger of its three sub
//             groups (deleted rows included) + 1. Restarts at 00001
//             for every sub category, never reused.
//               Product Code   <sub category code>-nnnnn   AC-001-001-00001
//               Ledgers        <INV/WIP/COGS sub group>-nnnnn
//                              INV-001-005-001-00001 …
// Part No.  : OPTIONAL. When given, unique within the brand
//             (category) ignoring spaces, hyphens, dots and case
//             (PartNumberKey; '' when no part number).
// Name      : Accessory Name, typed, required. Unit : fixed list.
// Ledgers   : three General Ledgers, created with the accessory,
//             renamed with it, (de)activated, deleted and restored
//             with it. Names :
//               "<prefix> - <Part No.> - <Accessory Name>"
//               "<prefix> - <Product Code> - <Accessory Name>"  (no part no.)
// Levels    : whole numbers ≥ 0; Red Level below Re-order Level
//             (both 0 is allowed).
// Image     : none for accessories.
// Locations : optional, one per warehouse (Warehouse → Rack →
//             Shelf). The rack must belong to the warehouse and the
//             shelf must exist on it; a shelf holds one item only
//             (spare part or accessory). Replaced on every save.
//===============================================================

public class AccessoriesRepository : IAccessoriesRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string AccessoriesCategoryType =
        "Accessories";

    // Allowed units
    private static readonly string[] Units =
        new[]
        {
            "Pcs",
            "Set",
            "Pair",
            "Box",
            "Packet",
            "Litre",
            "Kg",
            "Meter",
            "Roll"
        };

    private const int PartNumberMaxLength =
        50;

    private const int AccessoryNameMaxLength =
        140;

    private const int MaxNumber =
        99999;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public AccessoriesRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Query (with category / brand / sub category names)
    //===========================================================

    private IQueryable<AccessoriesDto> AccessoriesQuery()
    {
        return
            from x in _context.Set<AccessoriesEntity>().AsNoTracking()

            where !x.IsDeleted

            join c in _context.Set<ProductCategoryEntity>().AsNoTracking()
                on x.ProductCategoryId equals c.ProductCategoryId into cj
            from c in cj.DefaultIfEmpty()

            join s in _context.Set<ProductSubCategoryEntity>().AsNoTracking()
                on x.ProductSubCategoryId equals s.ProductSubCategoryId into sj
            from s in sj.DefaultIfEmpty()

            join b in _context.Set<BrandManagementEntity>().AsNoTracking()
                on c.BrandManagementId equals (long?)b.BrandManagementId into bj
            from b in bj.DefaultIfEmpty()

            select new AccessoriesDto
            {
                AccessoryId =
                    x.AccessoryId,

                ProductCategoryId =
                    x.ProductCategoryId,

                CategoryCode =
                    c != null ? c.CategoryCode : string.Empty,

                CategoryName =
                    c != null ? c.CategoryName : string.Empty,

                BrandName =
                    b != null ? b.BrandName : string.Empty,

                ProductSubCategoryId =
                    x.ProductSubCategoryId,

                SubCategoryCode =
                    s != null ? s.SubCategoryCode : string.Empty,

                SubCategoryName =
                    s != null ? s.SubCategoryName : string.Empty,

                PartNumber =
                    x.PartNumber,

                AccessoryName =
                    x.AccessoryName,

                Unit =
                    x.Unit,

                ProductCode =
                    x.ProductCode,

                InventoryLedgerCode =
                    x.InventoryLedgerCode,

                WipLedgerCode =
                    x.WipLedgerCode,

                CogsLedgerCode =
                    x.CogsLedgerCode,

                ReorderLevel =
                    x.ReorderLevel,

                RedLevel =
                    x.RedLevel,

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

    public async Task<List<AccessoriesDto>>
        GetAllAsync()
    {
        List<AccessoriesDto> items =
            await AccessoriesQuery()
                .OrderBy
                (
                    x =>
                        x.ProductCode
                )
                .ToListAsync();

        await AttachLocationsAsync(
            items);

        return items;
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<AccessoriesDto?>
        GetByIdAsync
        (
            long id
        )
    {
        AccessoriesDto? item =
            await AccessoriesQuery()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccessoryId ==
                        id
                );

        if
        (
            item !=
            null
        )
        {
            await AttachLocationsAsync(
                new List<AccessoriesDto> { item });
        }

        return item;
    }


    //===========================================================
    // Storage Locations : read
    //===========================================================

    private async Task
        AttachLocationsAsync
        (
            List<AccessoriesDto> items
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
                .Select
                (
                    x =>
                        x.AccessoryId
                )
                .ToArray();

        var rows =
            await
            (
                from l in _context.Set<AccessoryLocationsEntity>().AsNoTracking()

                where ids.Contains(l.AccessoryId)

                join w in _context.Set<WarehousesEntity>().AsNoTracking()
                    on l.WarehouseId equals w.WarehouseId into wj
                from w in wj.DefaultIfEmpty()

                join r in _context.Set<RackManagementEntity>().AsNoTracking()
                    on l.RackManagementId equals r.RackManagementId into rj
                from r in rj.DefaultIfEmpty()

                select new
                {
                    l.AccessoryId,

                    Location =
                        new AccessoryLocationDto
                        {
                            WarehouseId =
                                l.WarehouseId,

                            WarehouseCode =
                                w != null ? w.WarehouseCode : string.Empty,

                            WarehouseName =
                                w != null ? w.WarehouseName : string.Empty,

                            RackManagementId =
                                l.RackManagementId,

                            RackCode =
                                r != null ? r.RackCode : string.Empty,

                            RackName =
                                r != null ? r.RackName : string.Empty,

                            ShelfNumber =
                                l.ShelfNumber
                        }
                }
            )
            .ToListAsync();

        foreach
        (
            AccessoriesDto item
            in items
        )
        {
            item.Locations =
                rows
                    .Where
                    (
                        x =>
                            x.AccessoryId ==
                            item.AccessoryId
                    )
                    .Select
                    (
                        x =>
                            x.Location
                    )
                    .OrderBy
                    (
                        x =>
                            x.WarehouseCode
                    )
                    .ToList();

            foreach
            (
                AccessoryLocationDto location
                in item.Locations
            )
            {
                // "WH-001: Rack A / SLF-A-03"
                location.LocationText =
                    $"{location.WarehouseCode}: {location.RackName} / " +
                    RackManagementRepository.ShelfLabel(
                        location.RackName,
                        location.ShelfNumber);
            }

            item.LocationsText =
                string.Join(
                    ", ",
                    item.Locations
                        .Select
                        (
                            x =>
                                x.LocationText
                        ));
        }
    }


    //===========================================================
    // Storage Locations : validate
    //
    // Empty rows are ignored. Each row needs a warehouse, a rack
    // of that warehouse and a shelf on that rack; one row per
    // warehouse. An inactive warehouse / rack is refused unless
    // the part already uses it.
    //
    // A shelf holds ONE item only : a shelf already linked to
    // another (not deleted) spare part or accessory is refused.
    //
    // Business line : a new warehouse must belong to a branch that
    // runs the Accessories business today (Business Configuration).
    //===========================================================

    private async Task<List<AccessoryLocationInputDto>>
        ValidateLocationsAsync
        (
            List<AccessoryLocationInputDto>? input,
            long accessoryId
        )
    {
        List<AccessoryLocationInputDto> rows =
            (input ?? new List<AccessoryLocationInputDto>())
                .Where
                (
                    x =>
                        x != null
                        &&
                        (
                            x.WarehouseId > 0
                            ||
                            x.RackManagementId > 0
                            ||
                            x.ShelfNumber > 0
                        )
                )
                .ToList();

        if
        (
            rows.Count ==
            0
        )
        {
            return rows;
        }

        var duplicate =
            rows
                .GroupBy
                (
                    x =>
                        x.WarehouseId
                )
                .FirstOrDefault
                (
                    g =>
                        g.Count() > 1
                );

        if
        (
            duplicate !=
            null
        )
        {
            throw new InvalidOperationException(
                "Each warehouse can have only one storage location for an accessory.");
        }

        // The same shelf cannot be used twice by this part
        bool sameShelfTwice =
            rows
                .GroupBy
                (
                    x =>
                        new
                        {
                            x.RackManagementId,
                            x.ShelfNumber
                        }
                )
                .Any
                (
                    g =>
                        g.Count() > 1
                );

        if
        (
            sameShelfTwice
        )
        {
            throw new InvalidOperationException(
                "The same shelf cannot be added twice for an accessory.");
        }

        long[] warehouseIds =
            rows
                .Select(x => x.WarehouseId)
                .Distinct()
                .ToArray();

        long[] rackIds =
            rows
                .Select(x => x.RackManagementId)
                .Distinct()
                .ToArray();

        Dictionary<long, WarehousesEntity> warehouses =
            await _context
                .Set<WarehousesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        warehouseIds.Contains(x.WarehouseId)
                        &&
                        !x.IsDeleted
                )
                .ToDictionaryAsync
                (
                    x =>
                        x.WarehouseId
                );

        Dictionary<long, RackManagementEntity> racks =
            await _context
                .Set<RackManagementEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        rackIds.Contains(x.RackManagementId)
                        &&
                        !x.IsDeleted
                )
                .ToDictionaryAsync
                (
                    x =>
                        x.RackManagementId
                );

        // What the part already uses (inactive ones may stay)
        List<AccessoryLocationsEntity> current =
            accessoryId > 0
                ? await _context
                    .Set<AccessoryLocationsEntity>()
                    .AsNoTracking()
                    .Where
                    (
                        x =>
                            x.AccessoryId ==
                            accessoryId
                    )
                    .ToListAsync()
                : new List<AccessoryLocationsEntity>();

        // Warehouses whose branch runs the Accessories business today
        // (core line of its wing or an active grant)
        HashSet<long> allowedWarehouses =
            await BusinessLineAccess.AllowedWarehouseIdsAsync(
                _context,
                BusinessLineAccess.Accessories);

        // Shelves of these racks held by other items
        List<ShelfHolder> taken =
            await GetTakenShelvesAsync(
                rackIds,
                accessoryId);

        int rowNumber =
            0;

        foreach
        (
            AccessoryLocationInputDto row
            in rows
        )
        {
            rowNumber++;

            string label =
                $"Storage Location {rowNumber}";

            if
            (
                !warehouses.TryGetValue(
                    row.WarehouseId,
                    out WarehousesEntity? warehouse)
            )
            {
                throw new InvalidOperationException(
                    $"{label}: select a warehouse.");
            }

            // A NEW warehouse must run the Accessories business; a
            // warehouse the accessory already uses may stay after its
            // access was revoked (so it can still be edited / moved)
            if
            (
                !allowedWarehouses.Contains(
                    row.WarehouseId)
                &&
                !current.Any(
                    x =>
                        x.WarehouseId ==
                        row.WarehouseId)
            )
            {
                throw new InvalidOperationException(
                    $"{label}: {warehouse.WarehouseName} does not run the Accessories business. " +
                    "Grant Accessories to its branch in Business Configuration first.");
            }

            if
            (
                !racks.TryGetValue(
                    row.RackManagementId,
                    out RackManagementEntity? rack)
            )
            {
                throw new InvalidOperationException(
                    $"{label}: select a rack in {warehouse.WarehouseName}.");
            }

            if
            (
                rack.WarehouseId !=
                warehouse.WarehouseId
            )
            {
                throw new InvalidOperationException(
                    $"{label}: rack {rack.RackCode} is not in {warehouse.WarehouseName}.");
            }

            if
            (
                row.ShelfNumber < 1
                ||
                row.ShelfNumber > rack.ShelfCount
            )
            {
                throw new InvalidOperationException(
                    $"{label}: select a shelf between " +
                    $"{RackManagementRepository.ShelfLabel(rack.RackName, 1)} and " +
                    $"{RackManagementRepository.ShelfLabel(rack.RackName, rack.ShelfCount)} on {rack.RackName}.");
            }

            ShelfHolder? holder =
                taken.FirstOrDefault
                (
                    x =>
                        x.RackManagementId == row.RackManagementId
                        &&
                        x.ShelfNumber == row.ShelfNumber
                );

            if
            (
                holder !=
                null
            )
            {
                throw new InvalidOperationException(
                    $"{label}: shelf " +
                    $"{RackManagementRepository.ShelfLabel(rack.RackName, row.ShelfNumber)} " +
                    $"on {rack.RackName} ({warehouse.WarehouseName}) is already used by " +
                    $"{holder.ItemType.ToLowerInvariant()} {holder.ProductCode} - {holder.ItemName}. Choose another shelf.");
            }

            bool alreadyUsed =
                current.Any
                (
                    x =>
                        x.WarehouseId == row.WarehouseId
                        &&
                        x.RackManagementId == row.RackManagementId
                );

            if
            (
                !alreadyUsed
                &&
                !warehouse.IsActive
            )
            {
                throw new InvalidOperationException(
                    $"{label}: warehouse {warehouse.WarehouseName} is inactive.");
            }

            if
            (
                !alreadyUsed
                &&
                !rack.IsActive
            )
            {
                throw new InvalidOperationException(
                    $"{label}: rack {rack.RackCode} - {rack.RackName} is inactive.");
            }
        }

        return rows;
    }


    //===========================================================
    // Storage Locations : shelves held by other items
    //
    // A shelf holds ONE item only : a spare part OR an accessory
    // (see ShelfOccupancy). This accessory's own shelves don't
    // block it.
    //===========================================================

    private Task<List<ShelfHolder>>
        GetTakenShelvesAsync
        (
            long[] rackIds,
            long excludeAccessoryId
        )
    {
        return ShelfOccupancy.GetHoldersAsync(
            _context,
            rackIds,
            0,
            excludeAccessoryId);
    }


    //===========================================================
    // Storage Locations : save (replace)
    //===========================================================

    private async Task
        ReplaceLocationsAsync
        (
            long accessoryId,
            List<AccessoryLocationInputDto> rows,
            long userId
        )
    {
        List<AccessoryLocationsEntity> existing =
            await _context
                .Set<AccessoryLocationsEntity>()
                .Where
                (
                    x =>
                        x.AccessoryId ==
                        accessoryId
                )
                .ToListAsync();

        _context
            .Set<AccessoryLocationsEntity>()
            .RemoveRange(
                existing);

        // Remove first, so the unique (part, warehouse) index
        // never sees two rows for the same warehouse
        await _context.SaveChangesAsync();

        foreach
        (
            AccessoryLocationInputDto row
            in rows
        )
        {
            _context
                .Set<AccessoryLocationsEntity>()
                .Add
                (
                    new AccessoryLocationsEntity
                    {
                        AccessoryId =
                            accessoryId,

                        WarehouseId =
                            row.WarehouseId,

                        RackManagementId =
                            row.RackManagementId,

                        ShelfNumber =
                            row.ShelfNumber,

                        CreatedBy =
                            userId,

                        CreatedDate =
                            DateTime.UtcNow
                    }
                );
        }
    }


    //===========================================================
    // Parent : category + sub category + its three sub groups
    //===========================================================

    private sealed class Parent
    {
        public ProductCategoryEntity Category { get; init; } = null!;

        public ProductSubCategoryEntity SubCategory { get; init; } = null!;

        public AccountSubGroupEntity InventorySubGroup { get; init; } = null!;

        public AccountSubGroupEntity WipSubGroup { get; init; } = null!;

        public AccountSubGroupEntity CogsSubGroup { get; init; } = null!;

        public IEnumerable<AccountSubGroupEntity> SubGroups =>
            new[] { InventorySubGroup, WipSubGroup, CogsSubGroup };
    }


    private async Task<Parent>
        ResolveParentAsync
        (
            long productCategoryId,
            long productSubCategoryId,
            bool forNewPart
        )
    {
        //=======================================================
        // Product Category (Accessories type only)
        //=======================================================

        if
        (
            productCategoryId <=
            0
        )
        {
            throw new InvalidOperationException(
                "Product Category is required.");
        }

        ProductCategoryEntity? category =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ProductCategoryId ==
                        productCategoryId
                        &&
                        !x.IsDeleted
                );

        if
        (
            category ==
            null
        )
        {
            throw new InvalidOperationException(
                "The selected Product Category was not found. It may have been deleted.");
        }

        if
        (
            !string.Equals(
                category.CategoryType?.Trim(),
                AccessoriesCategoryType,
                StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                $"Product Category '{category.CategoryName}' is not a Accessories category.");
        }

        if
        (
            forNewPart
            &&
            !category.IsActive
        )
        {
            throw new InvalidOperationException(
                $"Product Category '{category.CategoryName}' is inactive.");
        }


        //=======================================================
        // Product Sub Category (must belong to the category)
        //=======================================================

        if
        (
            productSubCategoryId <=
            0
        )
        {
            throw new InvalidOperationException(
                "Product Sub Category is required.");
        }

        ProductSubCategoryEntity? subCategory =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ProductSubCategoryId ==
                        productSubCategoryId
                        &&
                        !x.IsDeleted
                );

        if
        (
            subCategory ==
            null
        )
        {
            throw new InvalidOperationException(
                "The selected Product Sub Category was not found. It may have been deleted.");
        }

        if
        (
            subCategory.ProductCategoryId !=
            category.ProductCategoryId
        )
        {
            throw new InvalidOperationException(
                $"Product Sub Category '{subCategory.SubCategoryName}' does not belong to '{category.CategoryName}'.");
        }

        if
        (
            forNewPart
            &&
            !subCategory.IsActive
        )
        {
            throw new InvalidOperationException(
                $"Product Sub Category '{subCategory.SubCategoryName}' is inactive.");
        }


        //=======================================================
        // The sub category's three account sub groups
        //=======================================================

        string[] codes =
        {
            subCategory.InventorySubGroupCode,
            subCategory.WipSubGroupCode,
            subCategory.CogsSubGroupCode
        };

        List<AccountSubGroupEntity> subGroups =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        codes.Contains(
                            x.SubGroupCode)
                )
                .ToListAsync();

        AccountSubGroupEntity Pick
        (
            string code,
            string label
        )
        {
            return subGroups.FirstOrDefault
                (
                    x =>
                        x.SubGroupCode ==
                        code
                )
                ??
                throw new InvalidOperationException(
                    $"The {label} account sub group {code} of '{subCategory.SubCategoryName}' was not found. " +
                    "Save the Product Sub Category again to rebuild it.");
        }

        return new Parent
        {
            Category =
                category,

            SubCategory =
                subCategory,

            InventorySubGroup =
                Pick(subCategory.InventorySubGroupCode, "Inventory"),

            WipSubGroup =
                Pick(subCategory.WipSubGroupCode, "WIP"),

            CogsSubGroup =
                Pick(subCategory.CogsSubGroupCode, "COGS")
        };
    }


    //===========================================================
    // Part Number / Name / Unit
    //===========================================================

    // "ab-12.34 " → "AB1234" (spaces, hyphens, dots removed)
    private static string PartNumberKey
    (
        string? partNumber
    )
    {
        return new string(
            (partNumber ?? string.Empty)
                .Where
                (
                    c =>
                        !char.IsWhiteSpace(c)
                        &&
                        c != '-'
                        &&
                        c != '.'
                )
                .ToArray())
            .ToUpperInvariant();
    }


    private static (string Number, string Key, string Name, string Unit)
        NormalizePart
        (
            string? partNumber,
            string? accessoryName,
            string? unit
        )
    {
        // Keep the typed form (only outer / repeated spaces tidied)
        string number =
            string.Join(
                " ",
                (partNumber ?? string.Empty)
                    .Split(
                        ' ',
                        StringSplitOptions.RemoveEmptyEntries));

        string key =
            PartNumberKey(
                number);

        // Part Number is optional : nothing usable typed → none
        if
        (
            string.IsNullOrWhiteSpace(key)
        )
        {
            number =
                string.Empty;

            key =
                string.Empty;
        }

        if
        (
            number.Length >
            PartNumberMaxLength
        )
        {
            throw new InvalidOperationException(
                $"Part Number cannot be longer than {PartNumberMaxLength} characters.");
        }

        string name =
            accessoryName?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(name)
        )
        {
            throw new InvalidOperationException(
                "Accessory Name is required.");
        }

        if
        (
            name.Length >
            AccessoryNameMaxLength
        )
        {
            throw new InvalidOperationException(
                $"Accessory Name cannot be longer than {AccessoryNameMaxLength} characters.");
        }

        string canonicalUnit =
            Units.FirstOrDefault
            (
                x =>
                    string.Equals(
                        x,
                        unit?.Trim(),
                        StringComparison.OrdinalIgnoreCase)
            )
            ??
            throw new InvalidOperationException(
                $"Unit is required ({string.Join(", ", Units)}).");

        return
        (
            number,
            key,
            name,
            canonicalUnit
        );
    }


    //===========================================================
    // Code Helpers
    //===========================================================

    // Last number part of a code ("MB-002-001-00007" → 7, else 0)
    private static int LastNumber
    (
        string? code
    )
    {
        string[] parts =
            (code ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

        return parts.Length >= 2
            &&
            int.TryParse(
                parts[^1].Trim(),
                out int number)
                ? number
                : 0;
    }


    // "<parent code>-nnnnn"
    private static string ChildCode
    (
        string parentCode,
        int number
    )
    {
        return $"{(parentCode ?? string.Empty).Trim().ToUpperInvariant()}-{number:D5}";
    }


    // "INV - AB-1234 - Helmet" (prefix = first part of the ledger code);
    // without a part number : "INV - AC-001-001-00001 - Helmet"
    private static string LedgerName
    (
        string ledgerCode,
        string partNumber,
        string accessoryName,
        string productCode
    )
    {
        string prefix =
            (ledgerCode ?? string.Empty)
                .Split('-')[0]
                .Trim()
                .ToUpperInvariant();

        string name =
            $"{(string.IsNullOrWhiteSpace(partNumber) ? productCode : partNumber)} - {accessoryName}";

        return string.IsNullOrWhiteSpace(prefix)
            ? name
            : $"{prefix} - {name}";
    }


    // "AB-1234 - Helmet", or just "Helmet" without a part number
    private static string DisplayName
    (
        string? partNumber,
        string? accessoryName
    )
    {
        return string.IsNullOrWhiteSpace(partNumber)
            ? (accessoryName ?? string.Empty)
            : $"{partNumber} - {accessoryName}";
    }


    //===========================================================
    // Next Number (inside one sub category)
    //===========================================================

    private async Task<int>
        GetNextNumberAsync
        (
            Parent parent
        )
    {
        long subCategoryId =
            parent.SubCategory.ProductSubCategoryId;

        List<string> productCodes =
            await _context
                .Set<AccessoriesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductSubCategoryId ==
                        subCategoryId
                )
                .Select
                (
                    x =>
                        x.ProductCode
                )
                .ToListAsync();

        long[] subGroupIds =
            parent.SubGroups
                .Select
                (
                    x =>
                        x.AccountSubGroupId
                )
                .ToArray();

        List<string> ledgerCodes =
            await _context
                .Set<GeneralLedgersEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        subGroupIds.Contains(
                            x.AccountSubGroupId)
                )
                .Select
                (
                    x =>
                        x.LedgerCode
                )
                .ToListAsync();

        int highest =
            productCodes
                .Concat(ledgerCodes)
                .Select(LastNumber)
                .DefaultIfEmpty(0)
                .Max();

        if
        (
            highest >=
            MaxNumber
        )
        {
            throw new InvalidOperationException(
                $"Product Sub Category '{parent.SubCategory.SubCategoryName}' already has the maximum of {MaxNumber} accessories.");
        }

        return highest + 1;
    }


    //===========================================================
    // Get Defaults (preview of the four codes)
    //===========================================================

    public async Task<AccessoriesDefaultsDto>
        GetDefaultsAsync
        (
            long productSubCategoryId
        )
    {
        if
        (
            productSubCategoryId <=
            0
        )
        {
            return new AccessoriesDefaultsDto();
        }

        long categoryId =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductSubCategoryId ==
                        productSubCategoryId
                        &&
                        !x.IsDeleted
                )
                .Select
                (
                    x =>
                        x.ProductCategoryId
                )
                .FirstOrDefaultAsync();

        Parent parent =
            await ResolveParentAsync(
                categoryId,
                productSubCategoryId,
                true);

        int number =
            await GetNextNumberAsync(
                parent);

        return new AccessoriesDefaultsDto
        {
            Code =
                ChildCode(
                    parent.SubCategory.SubCategoryCode,
                    number),

            InventoryLedgerCode =
                ChildCode(
                    parent.InventorySubGroup.SubGroupCode,
                    number),

            WipLedgerCode =
                ChildCode(
                    parent.WipSubGroup.SubGroupCode,
                    number),

            CogsLedgerCode =
                ChildCode(
                    parent.CogsSubGroup.SubGroupCode,
                    number)
        };
    }


    //===========================================================
    // Validate Stock Levels
    //===========================================================

    private static void ValidateLevels
    (
        int reorderLevel,
        int redLevel
    )
    {
        if
        (
            reorderLevel < 0
            ||
            redLevel < 0
        )
        {
            throw new InvalidOperationException(
                "Re-order Level and Red Level cannot be negative.");
        }

        if
        (
            !(reorderLevel == 0 && redLevel == 0)
            &&
            redLevel >= reorderLevel
        )
        {
            throw new InvalidOperationException(
                "Red Level must be lower than Re-order Level.");
        }
    }


    //===========================================================
    // Duplicate Check (non-deleted rows only)
    //
    // Part Number unique within the brand (category), ignoring
    // spaces, hyphens, dots and case; code unique everywhere.
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            long categoryId,
            string partNumber,
            string partNumberKey,
            string productCode,
            long excludeId
        )
    {
        // No part number : nothing to compare
        AccessoriesEntity? samePart =
            string.IsNullOrEmpty(partNumberKey)
                ? null
                : await _context
                .Set<AccessoriesEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.AccessoryId != excludeId
                        &&
                        x.ProductCategoryId == categoryId
                        &&
                        x.PartNumberKey == partNumberKey
                );

        if
        (
            samePart !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Part Number '{partNumber}' already exists for this brand as '{DisplayName(samePart.PartNumber, samePart.AccessoryName)}' ({samePart.ProductCode}).");
        }

        bool codeTaken =
            await _context
                .Set<AccessoriesEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.AccessoryId != excludeId
                        &&
                        x.ProductCode == productCode
                );

        if
        (
            codeTaken
        )
        {
            throw new InvalidOperationException(
                $"Product Code '{productCode}' is already in use.");
        }
    }


    //===========================================================
    // Linked Ledgers (by code, deleted ones included)
    //===========================================================

    private async Task<List<GeneralLedgersEntity>>
        LoadLinkedLedgersAsync
        (
            AccessoriesEntity entity
        )
    {
        string[] codes =
            new[]
            {
                entity.InventoryLedgerCode,
                entity.WipLedgerCode,
                entity.CogsLedgerCode
            }
            .Where
            (
                x =>
                    !string.IsNullOrWhiteSpace(x)
            )
            .ToArray();

        return await _context
            .Set<GeneralLedgersEntity>()
            .Where
            (
                x =>
                    codes.Contains(
                        x.LedgerCode)
            )
            .ToListAsync();
    }


    //===========================================================
    // Sync Ledgers
    //
    // Creates any missing ledger and keeps the three in line with
    // the part : name, active state, sub group data.
    //===========================================================

    private async Task
        SyncLedgersAsync
        (
            AccessoriesEntity entity,
            Parent parent,
            long userId
        )
    {
        List<GeneralLedgersEntity> existing =
            await LoadLinkedLedgersAsync(
                entity);

        var definitions =
            new[]
            {
                new { SubGroup = parent.InventorySubGroup, Code = entity.InventoryLedgerCode },
                new { SubGroup = parent.WipSubGroup,       Code = entity.WipLedgerCode },
                new { SubGroup = parent.CogsSubGroup,      Code = entity.CogsLedgerCode }
            };

        foreach
        (
            var definition
            in definitions
        )
        {
            string ledgerName =
                LedgerName(
                    definition.Code,
                    entity.PartNumber,
                    entity.AccessoryName,
                    entity.ProductCode);

            GeneralLedgersEntity? ledger =
                existing.FirstOrDefault
                (
                    x =>
                        x.LedgerCode ==
                        definition.Code
                        &&
                        !x.IsDeleted
                );

            if
            (
                ledger ==
                null
            )
            {
                _context
                    .Set<GeneralLedgersEntity>()
                    .Add
                    (
                        new GeneralLedgersEntity
                        {
                            AccountClassId =
                                definition.SubGroup.AccountClassId,

                            AccountGroupId =
                                definition.SubGroup.AccountGroupId,

                            AccountSubGroupId =
                                definition.SubGroup.AccountSubGroupId,

                            ClassCode =
                                definition.SubGroup.ClassCode,

                            Mode =
                                definition.SubGroup.Mode,

                            GroupCode =
                                definition.SubGroup.GroupCode,

                            SubGroupCode =
                                definition.SubGroup.SubGroupCode,

                            LedgerCode =
                                definition.Code,

                            LedgerName =
                                ledgerName,

                            Remarks =
                                $"System generated from Accessory {entity.ProductCode}.",

                            IsActive =
                                entity.IsActive,

                            IsDeleted =
                                false,

                            CreatedBy =
                                userId,

                            CreatedDate =
                                DateTime.UtcNow
                        }
                    );

                continue;
            }

            if
            (
                ledger.AccountSubGroupId !=
                definition.SubGroup.AccountSubGroupId
            )
            {
                throw new InvalidOperationException(
                    $"General Ledger '{definition.Code}' belongs to a different account sub group.");
            }

            bool changed =
                ledger.LedgerName != ledgerName
                ||
                ledger.IsActive != entity.IsActive;

            if
            (
                changed
            )
            {
                ledger.LedgerName =
                    ledgerName;

                ledger.IsActive =
                    entity.IsActive;

                ledger.ModifiedBy =
                    userId;

                ledger.ModifiedDate =
                    DateTime.UtcNow;
            }
        }
    }


    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory
    (
        AccessoriesEntity entity,
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
                    "Accessories",

                EntityId =
                    entity.AccessoryId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Accessory {verb}",

                ActivityDescription =
                    $"Accessory '{DisplayName(entity.PartNumber, entity.AccessoryName)}' ({entity.ProductCode}) {verb.ToLower()}.",

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
    // Create
    //
    // Codes, name and ledger names are always built here; the
    // form's values are only a preview.
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateAccessoriesDto dto,
            long userId
        )
    {
        Parent parent =
            await ResolveParentAsync(
                dto.ProductCategoryId,
                dto.ProductSubCategoryId,
                true);

        (string partNumber, string partKey, string accessoryName, string unit) =
            NormalizePart(
                dto.PartNumber,
                dto.AccessoryName,
                dto.Unit);

        ValidateLevels(
            dto.ReorderLevel,
            dto.RedLevel);

        List<AccessoryLocationInputDto> locations =
            await ValidateLocationsAsync(
                dto.Locations,
                0);

        int number =
            await GetNextNumberAsync(
                parent);

        string productCode =
            ChildCode(
                parent.SubCategory.SubCategoryCode,
                number);

        await EnsureUniqueAsync(
            parent.Category.ProductCategoryId,
            partNumber,
            partKey,
            productCode,
            0);


        AccessoriesEntity entity =
            new AccessoriesEntity
            {
                ProductCategoryId =
                    parent.Category.ProductCategoryId,

                ProductSubCategoryId =
                    parent.SubCategory.ProductSubCategoryId,

                PartNumber =
                    partNumber,

                PartNumberKey =
                    partKey,

                AccessoryName =
                    accessoryName,

                Unit =
                    unit,

                ProductCode =
                    productCode,

                InventoryLedgerCode =
                    ChildCode(
                        parent.InventorySubGroup.SubGroupCode,
                        number),

                WipLedgerCode =
                    ChildCode(
                        parent.WipSubGroup.SubGroupCode,
                        number),

                CogsLedgerCode =
                    ChildCode(
                        parent.CogsSubGroup.SubGroupCode,
                        number),

                ReorderLevel =
                    dto.ReorderLevel,

                RedLevel =
                    dto.RedLevel,

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
        // Part + its three ledgers in one transaction
        //=======================================================

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        _context
            .Set<AccessoriesEntity>()
            .Add(
                entity);

        await SyncLedgersAsync(
            entity,
            parent,
            userId);

        await _context.SaveChangesAsync();

        await ReplaceLocationsAsync(
            entity.AccessoryId,
            locations,
            userId);

        AddHistory(
            entity,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.AccessoryId;
    }


    //===========================================================
    // Update
    //
    // Category, Sub Category and codes are locked. Part Number,
    // Accessory Name and Unit may change; the three ledgers follow.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateAccessoriesDto dto,
            long userId
        )
    {
        AccessoriesEntity? entity =
            await _context
                .Set<AccessoriesEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccessoryId ==
                        dto.AccessoryId
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
                "Accessory not found.");
        }

        if
        (
            (dto.ProductCategoryId > 0 && dto.ProductCategoryId != entity.ProductCategoryId)
            ||
            (dto.ProductSubCategoryId > 0 && dto.ProductSubCategoryId != entity.ProductSubCategoryId)
        )
        {
            throw new InvalidOperationException(
                "Product Category and Sub Category cannot be changed after saving.");
        }


        Parent parent =
            await ResolveParentAsync(
                entity.ProductCategoryId,
                entity.ProductSubCategoryId,
                false);

        (string partNumber, string partKey, string accessoryName, string unit) =
            NormalizePart(
                dto.PartNumber,
                dto.AccessoryName,
                dto.Unit);

        ValidateLevels(
            dto.ReorderLevel,
            dto.RedLevel);

        await EnsureUniqueAsync(
            entity.ProductCategoryId,
            partNumber,
            partKey,
            entity.ProductCode,
            entity.AccessoryId);

        List<AccessoryLocationInputDto> locations =
            await ValidateLocationsAsync(
                dto.Locations,
                entity.AccessoryId);


        entity.PartNumber =
            partNumber;

        entity.PartNumberKey =
            partKey;

        entity.AccessoryName =
            accessoryName;

        entity.Unit =
            unit;

        entity.ReorderLevel =
            dto.ReorderLevel;

        entity.RedLevel =
            dto.RedLevel;

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

        await SyncLedgersAsync(
            entity,
            parent,
            userId);

        await _context.SaveChangesAsync();

        await ReplaceLocationsAsync(
            entity.AccessoryId,
            locations,
            userId);

        AddHistory(
            entity,
            "Update",
            "Updated",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    //===========================================================
    // Delete
    //
    // Soft deletes the part and its three ledgers together.
    //
    // TODO (stock / purchase / sales): block while transactions
    // use this product or its ledgers.
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        AccessoriesEntity? entity =
            await _context
                .Set<AccessoriesEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccessoryId ==
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
                "Accessory not found.");
        }

        DateTime now =
            DateTime.UtcNow;

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            now;

        foreach
        (
            GeneralLedgersEntity ledger
            in (await LoadLinkedLedgersAsync(entity))
                .Where(x => !x.IsDeleted)
        )
        {
            ledger.IsDeleted =
                true;

            ledger.DeletedBy =
                userId;

            ledger.DeletedDate =
                now;
        }

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Delete",
            "Deleted",
            userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore
    //
    // Restores the most recently deleted part and its ledgers.
    // Blocked (409) while its parent is deleted, or its part
    // number / code is taken again.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        AccessoriesEntity? entity =
            await _context
                .Set<AccessoriesEntity>()
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


        Parent parent;

        try
        {
            parent =
                await ResolveParentAsync(
                    entity.ProductCategoryId,
                    entity.ProductSubCategoryId,
                    false);

            await EnsureUniqueAsync(
                entity.ProductCategoryId,
                entity.PartNumber,
                entity.PartNumberKey,
                entity.ProductCode,
                entity.AccessoryId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Accessory '{DisplayName(entity.PartNumber, entity.AccessoryName)}' cannot be restored. {ex.Message}");
        }


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        //=======================================================
        // Restore the deleted ledgers first, then let Sync create
        // any that are missing and bring names / state in line.
        //=======================================================

        foreach
        (
            GeneralLedgersEntity ledger
            in (await LoadLinkedLedgersAsync(entity))
                .Where(x => x.IsDeleted)
        )
        {
            ledger.IsDeleted =
                false;

            ledger.DeletedBy =
                null;

            ledger.DeletedDate =
                null;

            ledger.ModifiedBy =
                userId;

            ledger.ModifiedDate =
                DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

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

        await SyncLedgersAsync(
            entity,
            parent,
            userId);

        await _context.SaveChangesAsync();

        await DropInvalidLocationsAsync(
            entity.AccessoryId);

        AddHistory(
            entity,
            "Restore",
            "Restored",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return true;
    }


    //===========================================================
    // Restore : drop locations whose rack was deleted, whose
    // shelf no longer exists, or whose shelf was given to
    // another accessory while this part was deleted
    //===========================================================

    private async Task
        DropInvalidLocationsAsync
        (
            long accessoryId
        )
    {
        List<AccessoryLocationsEntity> locations =
            await _context
                .Set<AccessoryLocationsEntity>()
                .Where
                (
                    x =>
                        x.AccessoryId ==
                        accessoryId
                )
                .ToListAsync();

        if
        (
            locations.Count ==
            0
        )
        {
            return;
        }

        long[] rackIds =
            locations
                .Select(x => x.RackManagementId)
                .Distinct()
                .ToArray();

        Dictionary<long, RackManagementEntity> racks =
            await _context
                .Set<RackManagementEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        rackIds.Contains(x.RackManagementId)
                        &&
                        !x.IsDeleted
                )
                .ToDictionaryAsync
                (
                    x =>
                        x.RackManagementId
                );

        List<ShelfHolder> taken =
            await GetTakenShelvesAsync(
                rackIds,
                accessoryId);

        List<AccessoryLocationsEntity> invalid =
            locations
                .Where
                (
                    x =>
                        !racks.TryGetValue(
                            x.RackManagementId,
                            out RackManagementEntity? rack)
                        ||
                        rack.WarehouseId != x.WarehouseId
                        ||
                        x.ShelfNumber > rack.ShelfCount
                        ||
                        taken.Any
                        (
                            t =>
                                t.RackManagementId == x.RackManagementId
                                &&
                                t.ShelfNumber == x.ShelfNumber
                        )
                )
                .ToList();

        _context
            .Set<AccessoryLocationsEntity>()
            .RemoveRange(
                invalid);
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
            .Set<AccessoriesEntity>()
            .AnyAsync
            (
                x =>
                    x.AccessoryId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}