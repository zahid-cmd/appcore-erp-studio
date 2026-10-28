//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ProductSettings;
using AppCore.Application.Settings.ProductSettings.ProductCategory.DTOs;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using AccountGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using AccountClassEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountClass;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using AppCore.Infrastructure.Persistence;
using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ProductSettings;


//===============================================================
// Product Category Repository
//
// Four codes per category:
//
//   Category Code      <type prefix>-nnn   MB-001 / SP-001 / AC-001
//                      numbered per Category Type, restarting at 001
//                      for each type:
//                        Motor Bikes → MB, Spare Parts → SP,
//                        Lubricants → LB, Accessories → AC
//
//   One Account Group in each of the three inventory classes (found
//   by Class Type, never by a fixed code), all with the class's own
//   prefix:
//
//   Class Type            Group code        e.g.
//   Inventory             INV-ccc-ggg       INV-001-001
//   Work In Progress      WIP-ccc-ggg       WIP-001-001
//   Cost of Goods Sold    COGS-ccc-ggg      COGS-001-001
//
//   ccc = that class's own number, ggg = the group number,
//   identical in all three.
//
// Numbering : Category Code : highest number used by that type
//             (deleted rows included) + 1.
//             ggg : highest number used by any category or any
//             group of the three classes (deleted rows included)
//             + 1. All types share the three classes, so ggg runs
//             across types (MB-001 → 001, SP-001 → 002, …).
//             Neither number is ever reused.
// Groups    : created with the category, renamed with it,
//             (de)activated with it, deleted / restored with it.
//             Names : "<class prefix> - <Category Name>".
//             Manual sub groups are not allowed under them; Sub
//             Categories create those.
// Locked    : codes and Category Type never change after creation.
// Name      : built here as "<Brand Name> <Category Type>",
//             e.g. "Yadea Motor Bikes"; never typed. Unique among
//             non-deleted categories, so each brand has at most one
//             category per type.
//===============================================================

public class ProductCategoryRepository :
    IProductCategoryRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string InventoryType =
        "Inventory";

    private const string WipType =
        "Work In Progress";

    private const string CogsType =
        "Cost of Goods Sold";

    // Allowed Category Types and their Category Code prefixes
    private static readonly IReadOnlyDictionary<string, string> CategoryTypePrefixes =
        new Dictionary<string, string>
        {
            ["Motor Bikes"] = "MB",
            ["Spare Parts"] = "SP",
            ["Lubricants"] = "LB",
            ["Accessories"] = "AC"
        };

    private static IEnumerable<string> CategoryTypes =>
        CategoryTypePrefixes.Keys;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public ProductCategoryRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Product Category Query
    //===========================================================

    private IQueryable<ProductCategoryDto>
        ProductCategoryQuery()
    {
        return _context
            .Set<ProductCategoryEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new ProductCategoryDto
                    {
                        ProductCategoryId =
                            x.ProductCategoryId,

                        CategoryCode =
                            x.CategoryCode,

                        CategoryName =
                            x.CategoryName,

                        CategoryType =
                            x.CategoryType,

                        BrandManagementId =
                            x.BrandManagementId,

                        BrandName =
                            _context
                                .Set<BrandManagementEntity>()
                                .Where
                                (
                                    b =>
                                        b.BrandManagementId ==
                                        x.BrandManagementId
                                )
                                .Select
                                (
                                    b =>
                                        b.BrandName
                                )
                                .FirstOrDefault()
                            ??
                            string.Empty,

                        InventoryGroupCode =
                            x.InventoryGroupCode,

                        InventoryGroupName =
                            x.InventoryGroupName,

                        WipGroupCode =
                            x.WipGroupCode,

                        WipGroupName =
                            x.WipGroupName,

                        CogsGroupCode =
                            x.CogsGroupCode,

                        CogsGroupName =
                            x.CogsGroupName,

                        SubCategoryCreationAllowed =
                            x.SubCategoryCreationAllowed,

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
                    }
            );
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<ProductCategoryDto>>
        GetAllAsync()
    {
        return await ProductCategoryQuery()
            .OrderBy
            (
                x =>
                    x.CategoryCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<ProductCategoryDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await ProductCategoryQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.ProductCategoryId ==
                    id
            );
    }


    //===========================================================
    // Inventory Classes (resolved by Class Type)
    //===========================================================

    private sealed class InventoryClasses
    {
        public AccountClassEntity Inventory { get; init; } = null!;

        public AccountClassEntity Wip { get; init; } = null!;

        public AccountClassEntity Cogs { get; init; } = null!;

        public IEnumerable<AccountClassEntity> All =>
            new[] { Inventory, Wip, Cogs };
    }


    private async Task<InventoryClasses>
        ResolveInventoryClassesAsync
        (
            bool requireActive
        )
    {
        string[] types =
        {
            InventoryType,
            WipType,
            CogsType
        };

        List<AccountClassEntity> classes =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        types.Contains(
                            x.ClassType)
                )
                .ToListAsync();

        AccountClassEntity Pick
        (
            string type
        )
        {
            AccountClassEntity? found =
                classes.FirstOrDefault
                (
                    x =>
                        x.ClassType ==
                        type
                );

            if
            (
                found ==
                null
            )
            {
                throw new InvalidOperationException(
                    $"No '{type}' Account Class found. Create it on the Account Classes page first.");
            }

            if
            (
                requireActive
                &&
                !found.IsActive
            )
            {
                throw new InvalidOperationException(
                    $"The '{type}' Account Class ({found.ClassCode}) is inactive.");
            }

            return found;
        }

        return new InventoryClasses
        {
            Inventory =
                Pick(InventoryType),

            Wip =
                Pick(WipType),

            Cogs =
                Pick(CogsType)
        };
    }


    //===========================================================
    // Code Helpers
    //===========================================================

    // "WIP-001" → 1
    private static int ClassNumber
    (
        AccountClassEntity accountClass
    )
    {
        string[] parts =
            (accountClass.ClassCode ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

        if
        (
            parts.Length != 2
            ||
            !int.TryParse(
                parts[1].Trim(),
                out int number)
            ||
            number < 1
        )
        {
            throw new InvalidOperationException(
                $"Invalid Account Class code '{accountClass.ClassCode}'.");
        }

        return number;
    }


    // Group prefix : the class prefix (INV / WIP / COGS)
    private static string GroupPrefix
    (
        AccountClassEntity accountClass
    )
    {
        string prefix =
            (accountClass.ClassPrefix ?? string.Empty)
                .Trim()
                .ToUpperInvariant();

        if
        (
            string.IsNullOrWhiteSpace(prefix)
        )
        {
            // Fall back to the prefix part of the class code
            prefix =
                (accountClass.ClassCode ?? string.Empty)
                    .Split('-')[0]
                    .Trim()
                    .ToUpperInvariant();
        }

        return prefix;
    }


    // "<class prefix>-ccc-ggg", e.g. INV-001-001
    private static string GroupCode
    (
        AccountClassEntity accountClass,
        int groupNumber
    )
    {
        return $"{GroupPrefix(accountClass)}-{ClassNumber(accountClass):D3}-{groupNumber:D3}";
    }


    // Category Code prefix for a type : MB / SP / LB / AC
    private static string TypePrefix
    (
        string categoryType
    )
    {
        return CategoryTypePrefixes.TryGetValue(
            categoryType,
            out string? prefix)
            ? prefix
            : throw new InvalidOperationException(
                $"Unknown Category Type '{categoryType}'.");
    }


    // Canonical Category Type ("motor bikes" → "Motor Bikes"), or null
    private static string? CanonicalType
    (
        string? categoryType
    )
    {
        return CategoryTypes.FirstOrDefault
        (
            x =>
                string.Equals(
                    x,
                    categoryType?.Trim(),
                    StringComparison.OrdinalIgnoreCase)
        );
    }


    // "MB-007" with prefix MB → 7, otherwise 0
    private static int TypeNumber
    (
        string? code,
        string prefix
    )
    {
        string[] parts =
            (code ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

        return parts.Length == 2
            &&
            string.Equals(
                parts[0],
                prefix,
                StringComparison.OrdinalIgnoreCase)
            &&
            int.TryParse(
                parts[1],
                out int number)
                ? number
                : 0;
    }


    // "<class prefix> - <Category Name>"
    private static string GroupName
    (
        AccountClassEntity accountClass,
        string categoryName
    )
    {
        string prefix =
            (accountClass.ClassPrefix ?? string.Empty)
                .Trim()
                .ToUpperInvariant();

        return string.IsNullOrWhiteSpace(prefix)
            ? categoryName
            : $"{prefix} - {categoryName}";
    }


    // Last number part of a 3-part code ("INV-001-007" → 7, else 0)
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

        return parts.Length == 3
            &&
            int.TryParse(
                parts[2].Trim(),
                out int number)
                ? number
                : 0;
    }


    //===========================================================
    // Next Group Number (ggg)
    //
    // Highest number used by any category's group codes or any
    // group of the three inventory classes (deleted rows
    // included) + 1.
    //===========================================================

    private async Task<int>
        GetNextGroupNumberAsync
        (
            InventoryClasses classes
        )
    {
        List<string> categoryGroupCodes =
            (
                await _context
                    .Set<ProductCategoryEntity>()
                    .AsNoTracking()
                    .Select
                    (
                        x =>
                            new
                            {
                                x.InventoryGroupCode,
                                x.WipGroupCode,
                                x.CogsGroupCode
                            }
                    )
                    .ToListAsync()
            )
            .SelectMany
            (
                x =>
                    new[]
                    {
                        x.InventoryGroupCode,
                        x.WipGroupCode,
                        x.CogsGroupCode
                    }
            )
            .ToList();

        long[] classIds =
            classes.All
                .Select
                (
                    x =>
                        x.AccountClassId
                )
                .ToArray();

        List<string> groupCodes =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        classIds.Contains(
                            x.AccountClassId)
                )
                .Select
                (
                    x =>
                        x.GroupCode
                )
                .ToListAsync();

        int highest =
            categoryGroupCodes
                .Concat(groupCodes)
                .Select(LastNumber)
                .DefaultIfEmpty(0)
                .Max();

        return highest + 1;
    }


    //===========================================================
    // Next Category Code (per Category Type)
    //
    // MB-001, MB-002 … ; SP-001 … ; AC-001 …
    // Highest number of that type (deleted rows included) + 1.
    //===========================================================

    private async Task<string>
        GetNextCategoryCodeAsync
        (
            string categoryType
        )
    {
        string prefix =
            TypePrefix(
                categoryType);

        string start =
            $"{prefix}-";

        List<string> codes =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.CategoryCode.StartsWith(
                            start)
                )
                .Select
                (
                    x =>
                        x.CategoryCode
                )
                .ToListAsync();

        int highest =
            codes
                .Select
                (
                    x =>
                        TypeNumber(
                            x,
                            prefix)
                )
                .DefaultIfEmpty(0)
                .Max();

        return $"{prefix}-{highest + 1:D3}";
    }


    //===========================================================
    // Get Next Code (needs the Category Type; '' without it)
    //===========================================================

    public async Task<string>
        GetNextCodeAsync
        (
            string? categoryType
        )
    {
        string? type =
            CanonicalType(
                categoryType);

        return type == null
            ? string.Empty
            : await GetNextCategoryCodeAsync(
                type);
    }


    //===========================================================
    // Get Defaults (preview of all four codes)
    //
    // The Category Code needs the Category Type; it is '' until
    // one is chosen. TypeCodes carries the next code of every
    // type, so the form can switch codes without another call.
    // The group codes do not depend on the type.
    //===========================================================

    public async Task<ProductCategoryDefaultsDto>
        GetDefaultsAsync
        (
            string? categoryType
        )
    {
        InventoryClasses classes =
            await ResolveInventoryClassesAsync(
                false);

        int number =
            await GetNextGroupNumberAsync(
                classes);

        Dictionary<string, string> typeCodes =
            new();

        foreach
        (
            string type
            in CategoryTypes
        )
        {
            typeCodes[type] =
                await GetNextCategoryCodeAsync(
                    type);
        }

        string? selectedType =
            CanonicalType(
                categoryType);

        return new ProductCategoryDefaultsDto
        {
            Code =
                selectedType == null
                    ? string.Empty
                    : typeCodes[selectedType],

            TypeCodes =
                typeCodes,

            InventoryGroupCode =
                GroupCode(
                    classes.Inventory,
                    number),

            WipGroupCode =
                GroupCode(
                    classes.Wip,
                    number),

            CogsGroupCode =
                GroupCode(
                    classes.Cogs,
                    number)
        };
    }


    //===========================================================
    // Normalize Category Name
    //===========================================================

    private static string NormalizeName
    (
        string? categoryName
    )
    {
        string name =
            categoryName?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(name)
        )
        {
            throw new InvalidOperationException(
                "Product Category Name is required.");
        }

        if
        (
            name.Length >
            190
        )
        {
            // 190 leaves room for the "COGS - " group name prefix
            throw new InvalidOperationException(
                "Product Category Name cannot be longer than 190 characters.");
        }

        return name;
    }


    //===========================================================
    // Category Type + Brand → Category Name
    //
    // Returns the canonical Category Type and the name :
    //   Motor Bikes / Spare Parts / Lubricants :
    //                           generated "<Brand Name> <Category Type>"
    //   Accessories           : the name typed on the form
    // An inactive brand is refused unless the category already
    // uses it. Brand is required for every type.
    //===========================================================

    private const string AccessoriesType =
        "Accessories";


    private async Task<(string CategoryType, string CategoryName)>
        BuildCategoryNameAsync
        (
            string? categoryType,
            long brandId,
            long? currentBrandId,
            string? typedName
        )
    {
        string type =
            CanonicalType(
                categoryType)
            ??
            throw new InvalidOperationException(
                "Category Type is required (Motor Bikes, Spare Parts, Lubricants or Accessories).");

        if
        (
            brandId <=
            0
        )
        {
            throw new InvalidOperationException(
                "Brand is required.");
        }

        BrandManagementEntity? brand =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.BrandManagementId ==
                        brandId
                        &&
                        !x.IsDeleted
                );

        if
        (
            brand ==
            null
        )
        {
            throw new InvalidOperationException(
                "The selected Brand was not found. It may have been deleted.");
        }

        if
        (
            !brand.Status
            &&
            brandId !=
            currentBrandId
        )
        {
            throw new InvalidOperationException(
                $"Brand '{brand.BrandName}' is inactive.");
        }

        // Accessories : typed name (required, same length rule)
        if
        (
            string.Equals(
                type,
                AccessoriesType,
                StringComparison.OrdinalIgnoreCase)
        )
        {
            return
            (
                type,
                NormalizeName(
                    string.Join(
                        " ",
                        (typedName ?? string.Empty)
                            .Split(
                                ' ',
                                StringSplitOptions.RemoveEmptyEntries)))
            );
        }

        return
        (
            type,
            NormalizeName(
                $"{brand.BrandName.Trim()} {type}")
        );
    }


    //===========================================================
    // Validate Unique Name / Code (non-deleted rows only)
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            string categoryCode,
            string categoryName,
            long excludeId
        )
    {
        string lowerName =
            categoryName.ToLower();

        ProductCategoryEntity? sameName =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.ProductCategoryId !=
                        excludeId
                        &&
                        x.CategoryName.ToLower() ==
                        lowerName
                );

        if
        (
            sameName !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Product Category '{categoryName}' already exists ({sameName.CategoryCode}).");
        }

        bool codeTaken =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.ProductCategoryId !=
                        excludeId
                        &&
                        x.CategoryCode ==
                        categoryCode
                );

        if
        (
            codeTaken
        )
        {
            throw new InvalidOperationException(
                $"Category Code '{categoryCode}' is already in use.");
        }
    }


    //===========================================================
    // Linked Account Groups (by code, deleted ones included)
    //===========================================================

    private async Task<List<AccountGroupEntity>>
        LoadLinkedGroupsAsync
        (
            ProductCategoryEntity entity
        )
    {
        string[] codes =
            new[]
            {
                entity.InventoryGroupCode,
                entity.WipGroupCode,
                entity.CogsGroupCode
            }
            .Where
            (
                x =>
                    !string.IsNullOrWhiteSpace(x)
            )
            .ToArray();

        return await _context
            .Set<AccountGroupEntity>()
            .Where
            (
                x =>
                    codes.Contains(
                        x.GroupCode)
            )
            .ToListAsync();
    }


    //===========================================================
    // Sync Account Groups
    //
    // Creates any missing group and keeps the three groups in
    // line with the category : name, active state, class data.
    //===========================================================

    private async Task
        SyncAccountGroupsAsync
        (
            ProductCategoryEntity entity,
            InventoryClasses classes,
            long userId
        )
    {
        List<AccountGroupEntity> existing =
            await LoadLinkedGroupsAsync(
                entity);

        var definitions =
            new[]
            {
                new { Class = classes.Inventory, Code = entity.InventoryGroupCode, Name = entity.InventoryGroupName },
                new { Class = classes.Wip,       Code = entity.WipGroupCode,       Name = entity.WipGroupName },
                new { Class = classes.Cogs,      Code = entity.CogsGroupCode,      Name = entity.CogsGroupName }
            };

        foreach
        (
            var definition
            in definitions
        )
        {
            AccountGroupEntity? group =
                existing.FirstOrDefault
                (
                    x =>
                        x.GroupCode ==
                        definition.Code
                        &&
                        !x.IsDeleted
                );

            if
            (
                group ==
                null
            )
            {
                _context
                    .Set<AccountGroupEntity>()
                    .Add
                    (
                        new AccountGroupEntity
                        {
                            AccountClassId =
                                definition.Class.AccountClassId,

                            ClassCode =
                                definition.Class.ClassCode,

                            Mode =
                                definition.Class.Mode,

                            GroupCode =
                                definition.Code,

                            GroupName =
                                definition.Name,

                            AllowManualSubGroup =
                                false,

                            Remarks =
                                $"System generated from Product Category {entity.CategoryCode}.",

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
                group.AccountClassId !=
                definition.Class.AccountClassId
            )
            {
                throw new InvalidOperationException(
                    $"Account Group '{definition.Code}' belongs to a different Account Class.");
            }

            bool changed =
                group.GroupName != definition.Name
                ||
                group.IsActive != entity.IsActive
                ||
                group.ClassCode != definition.Class.ClassCode
                ||
                group.Mode != definition.Class.Mode;

            if
            (
                changed
            )
            {
                group.GroupName =
                    definition.Name;

                group.IsActive =
                    entity.IsActive;

                group.ClassCode =
                    definition.Class.ClassCode;

                group.Mode =
                    definition.Class.Mode;

                group.ModifiedBy =
                    userId;

                group.ModifiedDate =
                    DateTime.UtcNow;
            }
        }
    }


    //===========================================================
    // Repair Codes (runs on every Update)
    //
    // Brings a category saved by older code to the current four
    // codes:
    //   Category Code  <type prefix>-nnn  (old CAT-001-004 → MB-001)
    //   Groups         INV / WIP / COGS -ccc-ggg, keeping its own ggg
    //                  (old CAT-001-004 → INV-001-004)
    // Groups are renamed in place (their sub groups follow), so
    // sub categories already created keep working. A group found
    // in the wrong class is soft deleted when it has no sub groups;
    // otherwise the update is refused.
    //===========================================================

    private async Task
        RepairCodesAsync
        (
            ProductCategoryEntity entity,
            InventoryClasses classes,
            long userId
        )
    {
        //=======================================================
        // Category Code : per Category Type
        //=======================================================

        string prefix =
            TypePrefix(
                entity.CategoryType);

        if
        (
            TypeNumber(
                entity.CategoryCode,
                prefix) < 1
        )
        {
            string categoryCode =
                await GetNextCategoryCodeAsync(
                    entity.CategoryType);

            await EnsureUniqueAsync(
                categoryCode,
                entity.CategoryName,
                entity.ProductCategoryId);

            entity.CategoryCode =
                categoryCode;
        }


        //=======================================================
        // Group number : keep the category's own ggg
        //=======================================================

        int number =
            new[]
            {
                entity.InventoryGroupCode,
                entity.WipGroupCode,
                entity.CogsGroupCode
            }
            .Select(LastNumber)
            .FirstOrDefault
            (
                x =>
                    x > 0
            );

        if
        (
            number < 1
        )
        {
            number =
                await GetNextGroupNumberAsync(
                    classes);
        }

        var targets =
            new[]
            {
                new { Class = classes.Inventory, Old = entity.InventoryGroupCode, New = GroupCode(classes.Inventory, number) },
                new { Class = classes.Wip,       Old = entity.WipGroupCode,       New = GroupCode(classes.Wip, number) },
                new { Class = classes.Cogs,      Old = entity.CogsGroupCode,      New = GroupCode(classes.Cogs, number) }
            };

        if
        (
            targets.All
            (
                x =>
                    x.Old ==
                    x.New
            )
        )
        {
            return;
        }


        //=======================================================
        // Rename / retire groups under the old codes
        //=======================================================

        List<AccountGroupEntity> linked =
            (await LoadLinkedGroupsAsync(entity))
                .Where
                (
                    x =>
                        !x.IsDeleted
                )
                .ToList();

        DateTime now =
            DateTime.UtcNow;

        foreach
        (
            var target
            in targets.Where(x => x.Old != x.New)
        )
        {
            AccountGroupEntity? group =
                linked.FirstOrDefault
                (
                    x =>
                        x.GroupCode ==
                        target.Old
                );

            if
            (
                group ==
                null
            )
            {
                // Nothing under the old code : Sync creates it
                continue;
            }

            List<AccountSubGroupEntity> subGroups =
                await _context
                    .Set<AccountSubGroupEntity>()
                    .Where
                    (
                        x =>
                            x.AccountGroupId ==
                            group.AccountGroupId
                    )
                    .ToListAsync();

            if
            (
                group.AccountClassId ==
                target.Class.AccountClassId
            )
            {
                bool taken =
                    await _context
                        .Set<AccountGroupEntity>()
                        .AsNoTracking()
                        .AnyAsync
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                x.AccountGroupId !=
                                group.AccountGroupId
                                &&
                                x.GroupCode ==
                                target.New
                        );

                if
                (
                    taken
                )
                {
                    throw new InvalidOperationException(
                        $"Account Group code '{target.New}' is already used by another group.");
                }

                // Same class : rename in place, sub groups follow
                group.GroupCode =
                    target.New;

                group.ModifiedBy =
                    userId;

                group.ModifiedDate =
                    now;

                foreach
                (
                    AccountSubGroupEntity subGroup
                    in subGroups
                )
                {
                    subGroup.GroupCode =
                        target.New;
                }

                continue;
            }

            // Wrong class : retire it, only when it has no sub groups
            if
            (
                subGroups.Any
                (
                    x =>
                        !x.IsDeleted
                )
            )
            {
                throw new InvalidOperationException(
                    $"Product Category '{entity.CategoryName}' uses account group '{target.Old}' from the wrong account class, " +
                    "and it has sub groups. Delete those sub categories first, then save the category again.");
            }

            group.IsDeleted =
                true;

            group.DeletedBy =
                userId;

            group.DeletedDate =
                now;
        }

        entity.InventoryGroupCode =
            targets[0].New;

        entity.WipGroupCode =
            targets[1].New;

        entity.CogsGroupCode =
            targets[2].New;
    }


    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory
    (
        ProductCategoryEntity entity,
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
                    "Product Category",

                EntityId =
                    entity.ProductCategoryId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Product Category {verb}",

                ActivityDescription =
                    $"Product Category '{entity.CategoryName}' ({entity.CategoryCode}) {verb.ToLower()}.",

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
    // Codes, name and group names are always built here; the
    // form's values are only a preview.
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateProductCategoryDto dto,
            long userId
        )
    {
        InventoryClasses classes =
            await ResolveInventoryClassesAsync(
                true);

        (string categoryType, string categoryName) =
            await BuildCategoryNameAsync(
                dto.CategoryType,
                dto.BrandManagementId,
                null,
                dto.CategoryName);

        int number =
            await GetNextGroupNumberAsync(
                classes);

        string categoryCode =
            await GetNextCategoryCodeAsync(
                categoryType);

        string inventoryCode =
            GroupCode(
                classes.Inventory,
                number);

        await EnsureUniqueAsync(
            categoryCode,
            categoryName,
            0);


        ProductCategoryEntity entity =
            new ProductCategoryEntity
            {
                CategoryCode =
                    categoryCode,

                CategoryName =
                    categoryName,

                CategoryType =
                    categoryType,

                BrandManagementId =
                    dto.BrandManagementId,

                InventoryGroupCode =
                    inventoryCode,

                InventoryGroupName =
                    GroupName(
                        classes.Inventory,
                        categoryName),

                WipGroupCode =
                    GroupCode(
                        classes.Wip,
                        number),

                WipGroupName =
                    GroupName(
                        classes.Wip,
                        categoryName),

                CogsGroupCode =
                    GroupCode(
                        classes.Cogs,
                        number),

                CogsGroupName =
                    GroupName(
                        classes.Cogs,
                        categoryName),

                SubCategoryCreationAllowed =
                    dto.SubCategoryCreationAllowed,

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
        // Category + its three account groups in one transaction
        //=======================================================

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        _context
            .Set<ProductCategoryEntity>()
            .Add(
                entity);

        await SyncAccountGroupsAsync(
            entity,
            classes,
            userId);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.ProductCategoryId;
    }


    //===========================================================
    // Update
    //
    // Codes and Category Type are locked. A new Brand gives a new
    // name, which renames the three groups; the active state is
    // copied to them too. Older rows are brought to the current
    // codes first (RepairCodesAsync).
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateProductCategoryDto dto,
            long userId
        )
    {
        ProductCategoryEntity? entity =
            await _context
                .Set<ProductCategoryEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ProductCategoryId ==
                        dto.ProductCategoryId
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
                "Product Category not found.");
        }


        InventoryClasses classes =
            await ResolveInventoryClassesAsync(
                false);

        (string categoryType, string categoryName) =
            await BuildCategoryNameAsync(
                dto.CategoryType,
                dto.BrandManagementId,
                entity.BrandManagementId,
                dto.CategoryName);

        // Category Type decides the Category Code prefix, so it is
        // locked once set (older rows without one may set it now).
        if
        (
            !string.IsNullOrWhiteSpace(entity.CategoryType)
            &&
            !string.Equals(
                entity.CategoryType,
                categoryType,
                StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                $"Category Type cannot be changed after saving (this category is {entity.CategoryType}).");
        }

        await EnsureUniqueAsync(
            entity.CategoryCode,
            categoryName,
            entity.ProductCategoryId);


        entity.CategoryName =
            categoryName;

        entity.CategoryType =
            categoryType;

        entity.BrandManagementId =
            dto.BrandManagementId;

        entity.InventoryGroupName =
            GroupName(
                classes.Inventory,
                categoryName);

        entity.WipGroupName =
            GroupName(
                classes.Wip,
                categoryName);

        entity.CogsGroupName =
            GroupName(
                classes.Cogs,
                categoryName);

        entity.SubCategoryCreationAllowed =
            dto.SubCategoryCreationAllowed;

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

        // Old / wrong codes are rebuilt to the current pattern first
        await RepairCodesAsync(
            entity,
            classes,
            userId);

        // Then any missing group is inserted, and all three are
        // brought in line with the category
        await SyncAccountGroupsAsync(
            entity,
            classes,
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
    // Blocked while sub categories exist, or while any of the
    // three groups still has sub groups. Deletes the category and
    // its three groups together.
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        ProductCategoryEntity? entity =
            await _context
                .Set<ProductCategoryEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ProductCategoryId ==
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
                "Product Category not found.");
        }


        //=======================================================
        // Dependency : Product Sub Categories
        //=======================================================

        int subCategoryCount =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .CountAsync
                (
                    x =>
                        x.ProductCategoryId ==
                        id
                        &&
                        !x.IsDeleted
                );

        if
        (
            subCategoryCount >
            0
        )
        {
            throw new InvalidOperationException(
                $"Product Category '{entity.CategoryName}' cannot be deleted because " +
                $"{subCategoryCount} sub categor{(subCategoryCount == 1 ? "y is" : "ies are")} created under it. " +
                "Delete those sub categories first.");
        }


        //=======================================================
        // Dependency : sub groups under the three groups
        //=======================================================

        List<AccountGroupEntity> groups =
            (await LoadLinkedGroupsAsync(entity))
                .Where
                (
                    x =>
                        !x.IsDeleted
                )
                .ToList();

        long[] groupIds =
            groups
                .Select
                (
                    x =>
                        x.AccountGroupId
                )
                .ToArray();

        int subGroupCount =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .CountAsync
                (
                    x =>
                        groupIds.Contains(
                            x.AccountGroupId)
                        &&
                        !x.IsDeleted
                );

        if
        (
            subGroupCount >
            0
        )
        {
            throw new InvalidOperationException(
                $"Product Category '{entity.CategoryName}' cannot be deleted because " +
                $"its account groups still have {subGroupCount} sub group(s).");
        }


        //=======================================================
        // Soft Delete Category + Groups
        //=======================================================

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
            AccountGroupEntity group
            in groups
        )
        {
            group.IsDeleted =
                true;

            group.DeletedBy =
                userId;

            group.DeletedDate =
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
    // Restores the most recently deleted category and its three
    // groups. Blocked (409) while its name / code is taken.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        ProductCategoryEntity? entity =
            await _context
                .Set<ProductCategoryEntity>()
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
            await EnsureUniqueAsync(
                entity.CategoryCode,
                entity.CategoryName,
                entity.ProductCategoryId);

            if
            (
                entity.BrandManagementId.HasValue
                &&
                !await _context
                    .Set<BrandManagementEntity>()
                    .AnyAsync
                    (
                        x =>
                            x.BrandManagementId ==
                            entity.BrandManagementId
                            &&
                            !x.IsDeleted
                    )
            )
            {
                throw new InvalidOperationException(
                    "Its brand has been deleted. Restore the brand first.");
            }
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Product Category '{entity.CategoryName}' cannot be restored. {ex.Message}");
        }


        InventoryClasses classes =
            await ResolveInventoryClassesAsync(
                false);


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        //=======================================================
        // Restore the deleted groups first, then let Sync create
        // any that are missing and bring names / state in line.
        //=======================================================

        foreach
        (
            AccountGroupEntity group
            in (await LoadLinkedGroupsAsync(entity))
                .Where(x => x.IsDeleted)
        )
        {
            group.IsDeleted =
                false;

            group.DeletedBy =
                null;

            group.DeletedDate =
                null;

            group.ModifiedBy =
                userId;

            group.ModifiedDate =
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

        await SyncAccountGroupsAsync(
            entity,
            classes,
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
    // Exists
    //===========================================================

    public async Task<bool>
        ExistsAsync
        (
            long id
        )
    {
        return await _context
            .Set<ProductCategoryEntity>()
            .AnyAsync
            (
                x =>
                    x.ProductCategoryId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}