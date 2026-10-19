//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ProductSettings;

using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using ColorManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ColorManagement;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using GeneralLedgersEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using AppCore.Infrastructure.Persistence;
using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ProductSettings;


//===============================================================
// Motor Bikes Repository
//
// One Motor Bike = one model (Product Sub Category) in one Color.
//
// Parent    : Product Category must be of Category Type
//             "Motor Bikes"; the Sub Category must belong to it.
//             New bikes need an active category, sub category and
//             color. All three are locked after saving.
// Codes     : nnnnn = highest number already used by any bike of
//             the sub category or any ledger of its three sub
//             groups (deleted rows included) + 1. Restarts at 00001
//             for every sub category, never reused.
//               Product Code   <sub category code>-nnnnn   MB-002-001-00001
//               Ledgers        <INV/WIP/COGS sub group>-nnnnn
//                              INV-001-002-001-00001 …
// Name      : "<Sub Category Name> - <Color Name>", built here;
//             one bike per sub category and color.
// Ledgers   : three General Ledgers, created with the bike,
//             renamed with it ("<prefix> - <Product Name>"),
//             (de)activated, deleted and restored with it.
// Levels    : whole numbers ≥ 0; Red Level below Re-order Level
//             (both 0 is allowed).
// Image     : path only; the file is saved / removed by the
//             controller ({id}/image).
//===============================================================

public class MotorBikesRepository : IMotorBikesRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string MotorBikesCategoryType =
        "Motor Bikes";

    private const int MaxNumber =
        99999;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public MotorBikesRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Query (with category / brand / sub category / color names)
    //===========================================================

    private IQueryable<MotorBikesDto> MotorBikesQuery()
    {
        return
            from x in _context.Set<MotorBikesEntity>().AsNoTracking()

            where !x.IsDeleted

            join c in _context.Set<ProductCategoryEntity>().AsNoTracking()
                on x.ProductCategoryId equals c.ProductCategoryId into cj
            from c in cj.DefaultIfEmpty()

            join s in _context.Set<ProductSubCategoryEntity>().AsNoTracking()
                on x.ProductSubCategoryId equals s.ProductSubCategoryId into sj
            from s in sj.DefaultIfEmpty()

            join col in _context.Set<ColorManagementEntity>().AsNoTracking()
                on x.ColorManagementId equals col.ColorManagementId into colj
            from col in colj.DefaultIfEmpty()

            join b in _context.Set<BrandManagementEntity>().AsNoTracking()
                on c.BrandManagementId equals (long?)b.BrandManagementId into bj
            from b in bj.DefaultIfEmpty()

            select new MotorBikesDto
            {
                MotorBikeId =
                    x.MotorBikeId,

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

                ColorManagementId =
                    x.ColorManagementId,

                ColorName =
                    col != null ? col.ColorName : string.Empty,

                ProductCode =
                    x.ProductCode,

                ProductName =
                    x.ProductName,

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

                ImagePath =
                    x.ImagePath,

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

    public async Task<List<MotorBikesDto>>
        GetAllAsync()
    {
        return await MotorBikesQuery()
            .OrderBy
            (
                x =>
                    x.ProductCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<MotorBikesDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await MotorBikesQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.MotorBikeId ==
                    id
            );
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
            bool forNewBike
        )
    {
        //=======================================================
        // Product Category (Motor Bikes type only)
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
                MotorBikesCategoryType,
                StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                $"Product Category '{category.CategoryName}' is not a Motor Bikes category.");
        }

        if
        (
            forNewBike
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
            forNewBike
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
    // Color (an inactive color is refused unless the bike
    // already uses it)
    //===========================================================

    private async Task<ColorManagementEntity>
        ResolveColorAsync
        (
            long colorId,
            long? currentColorId
        )
    {
        if
        (
            colorId <=
            0
        )
        {
            throw new InvalidOperationException(
                "Color is required.");
        }

        ColorManagementEntity? color =
            await _context
                .Set<ColorManagementEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ColorManagementId ==
                        colorId
                        &&
                        !x.IsDeleted
                );

        if
        (
            color ==
            null
        )
        {
            throw new InvalidOperationException(
                "The selected Color was not found. It may have been deleted.");
        }

        if
        (
            !color.Status
            &&
            colorId !=
            currentColorId
        )
        {
            throw new InvalidOperationException(
                $"Color '{color.ColorName}' is inactive.");
        }

        return color;
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


    // "INV - Revoo C32 - Red" (prefix = first part of the ledger code)
    private static string LedgerName
    (
        string ledgerCode,
        string productName
    )
    {
        string prefix =
            (ledgerCode ?? string.Empty)
                .Split('-')[0]
                .Trim()
                .ToUpperInvariant();

        return string.IsNullOrWhiteSpace(prefix)
            ? productName
            : $"{prefix} - {productName}";
    }


    // "<Sub Category Name> - <Color Name>"
    private static string BuildProductName
    (
        ProductSubCategoryEntity subCategory,
        ColorManagementEntity color
    )
    {
        string name =
            $"{(subCategory.SubCategoryName ?? string.Empty).Trim()} - {(color.ColorName ?? string.Empty).Trim()}";

        if
        (
            name.Length >
            190
        )
        {
            // 190 leaves room for the "COGS - " ledger name prefix
            throw new InvalidOperationException(
                "Product Name cannot be longer than 190 characters.");
        }

        return name;
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
                .Set<MotorBikesEntity>()
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
                $"Product Sub Category '{parent.SubCategory.SubCategoryName}' already has the maximum of {MaxNumber} products.");
        }

        return highest + 1;
    }


    //===========================================================
    // Get Defaults (preview of the four codes)
    //===========================================================

    public async Task<MotorBikesDefaultsDto>
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
            return new MotorBikesDefaultsDto();
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

        return new MotorBikesDefaultsDto
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
    // One bike per sub category and color; code unique everywhere.
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            long subCategoryId,
            long colorId,
            string productCode,
            string productName,
            long excludeId
        )
    {
        MotorBikesEntity? sameModelColor =
            await _context
                .Set<MotorBikesEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.MotorBikeId != excludeId
                        &&
                        x.ProductSubCategoryId == subCategoryId
                        &&
                        x.ColorManagementId == colorId
                );

        if
        (
            sameModelColor !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Motor Bike '{productName}' already exists ({sameModelColor.ProductCode}).");
        }

        bool codeTaken =
            await _context
                .Set<MotorBikesEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.MotorBikeId != excludeId
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
            MotorBikesEntity entity
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
    // the bike : name, active state, sub group data.
    //===========================================================

    private async Task
        SyncLedgersAsync
        (
            MotorBikesEntity entity,
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
                    entity.ProductName);

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
                                $"System generated from Motor Bike {entity.ProductCode}.",

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
        MotorBikesEntity entity,
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
                    "MotorBikes",

                EntityId =
                    entity.MotorBikeId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Motor Bike {verb}",

                ActivityDescription =
                    $"Motor Bike '{entity.ProductName}' ({entity.ProductCode}) {verb.ToLower()}.",

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
            CreateMotorBikesDto dto,
            long userId
        )
    {
        Parent parent =
            await ResolveParentAsync(
                dto.ProductCategoryId,
                dto.ProductSubCategoryId,
                true);

        ColorManagementEntity color =
            await ResolveColorAsync(
                dto.ColorManagementId,
                null);

        ValidateLevels(
            dto.ReorderLevel,
            dto.RedLevel);

        string productName =
            BuildProductName(
                parent.SubCategory,
                color);

        int number =
            await GetNextNumberAsync(
                parent);

        string productCode =
            ChildCode(
                parent.SubCategory.SubCategoryCode,
                number);

        await EnsureUniqueAsync(
            parent.SubCategory.ProductSubCategoryId,
            color.ColorManagementId,
            productCode,
            productName,
            0);


        MotorBikesEntity entity =
            new MotorBikesEntity
            {
                ProductCategoryId =
                    parent.Category.ProductCategoryId,

                ProductSubCategoryId =
                    parent.SubCategory.ProductSubCategoryId,

                ColorManagementId =
                    color.ColorManagementId,

                ProductCode =
                    productCode,

                ProductName =
                    productName,

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

                ImagePath =
                    string.Empty,

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
        // Bike + its three ledgers in one transaction
        //=======================================================

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        _context
            .Set<MotorBikesEntity>()
            .Add(
                entity);

        await SyncLedgersAsync(
            entity,
            parent,
            userId);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.MotorBikeId;
    }


    //===========================================================
    // Update
    //
    // Category, Sub Category, Color and codes are locked. The name
    // is rebuilt (the sub category or color may have been
    // renamed) and the three ledgers follow it.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateMotorBikesDto dto,
            long userId
        )
    {
        MotorBikesEntity? entity =
            await _context
                .Set<MotorBikesEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MotorBikeId ==
                        dto.MotorBikeId
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
                "Motor Bike not found.");
        }

        if
        (
            (dto.ProductCategoryId > 0 && dto.ProductCategoryId != entity.ProductCategoryId)
            ||
            (dto.ProductSubCategoryId > 0 && dto.ProductSubCategoryId != entity.ProductSubCategoryId)
            ||
            (dto.ColorManagementId > 0 && dto.ColorManagementId != entity.ColorManagementId)
        )
        {
            throw new InvalidOperationException(
                "Product Category, Sub Category and Color cannot be changed after saving.");
        }


        Parent parent =
            await ResolveParentAsync(
                entity.ProductCategoryId,
                entity.ProductSubCategoryId,
                false);

        ColorManagementEntity color =
            await ResolveColorAsync(
                entity.ColorManagementId,
                entity.ColorManagementId);

        ValidateLevels(
            dto.ReorderLevel,
            dto.RedLevel);

        string productName =
            BuildProductName(
                parent.SubCategory,
                color);

        await EnsureUniqueAsync(
            entity.ProductSubCategoryId,
            entity.ColorManagementId,
            entity.ProductCode,
            productName,
            entity.MotorBikeId);


        entity.ProductName =
            productName;

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
    // Soft deletes the bike and its three ledgers together.
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
        MotorBikesEntity? entity =
            await _context
                .Set<MotorBikesEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MotorBikeId ==
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
                "Motor Bike not found.");
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
    // Restores the most recently deleted bike and its ledgers.
    // Blocked (409) while its parent or color is deleted, or its
    // model + color / code is taken again.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        MotorBikesEntity? entity =
            await _context
                .Set<MotorBikesEntity>()
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

            await ResolveColorAsync(
                entity.ColorManagementId,
                entity.ColorManagementId);

            await EnsureUniqueAsync(
                entity.ProductSubCategoryId,
                entity.ColorManagementId,
                entity.ProductCode,
                entity.ProductName,
                entity.MotorBikeId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Motor Bike '{entity.ProductName}' cannot be restored. {ex.Message}");
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
    // Set Image Path
    //
    // Stores the new path ('' clears it) and returns the old one.
    //===========================================================

    public async Task<string>
        SetImagePathAsync
        (
            long id,
            string imagePath,
            long userId
        )
    {
        MotorBikesEntity? entity =
            await _context
                .Set<MotorBikesEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MotorBikeId ==
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
                "Motor Bike not found.");
        }

        string oldPath =
            entity.ImagePath
            ??
            string.Empty;

        entity.ImagePath =
            imagePath
            ??
            string.Empty;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return oldPath;
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
            .Set<MotorBikesEntity>()
            .AnyAsync
            (
                x =>
                    x.MotorBikeId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}