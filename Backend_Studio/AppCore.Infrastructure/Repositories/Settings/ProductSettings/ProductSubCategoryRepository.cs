//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ProductSettings;
using AppCore.Application.Settings.ProductSettings.ProductSubCategory.DTOs;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using AccountGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup;

using AccountClassEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountClass;

using GeneralLedgersEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using BikeModelsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeModels;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Persistence.Paging;
using AppCore.Application.Common.Paging;
using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ProductSettings;


//===============================================================
// Product Sub Category Repository
//
// Four codes per sub category:
//
//   Sub Category Code   <category code>-sss    MB-001-001 / SP-001-001 / AC-001-001
//
//   One Account Sub Group under each of its category's three
//   account groups, all with the class prefix:
//
//   Category group     Sub group code        e.g.
//   INV-001-ggg        INV-001-ggg-sss       INV-001-001-001
//   WIP-001-ggg        WIP-001-ggg-sss       WIP-001-001-001
//   COGS-001-ggg       COGS-001-ggg-sss      COGS-001-001-001
//
//   sss = the sub category number inside its category, the
//   same in all four codes.
//
// Numbering : sss = highest number already used by any sub
//             category of the category or any sub group of its
//             three groups (deleted rows included) + 1, so it is
//             never reused. Restarts at 001 for every category.
// Parent    : the category must be active and allow sub
//             categories; its three account groups must exist.
// Sub groups: created with the sub category, renamed with it,
//             (de)activated with it, deleted / restored with it.
//             Names : "<class prefix> - <Sub Category Name>".
//             Manual ledgers are not allowed under them; products
//             create those.
// Locked    : category and codes never change after creation.
// Name      : unique within its category.
//===============================================================

public class ProductSubCategoryRepository :
    IProductSubCategoryRepository
{
    //===========================================================
    // Constants
    //===========================================================

    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public ProductSubCategoryRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Product Sub Category Query
    //===========================================================

    private IQueryable<ProductSubCategoryDto>
        ProductSubCategoryQuery()
    {
        return _context
            .Set<ProductSubCategoryEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new ProductSubCategoryDto
                    {
                        ProductSubCategoryId =
                            x.ProductSubCategoryId,

                        PublicId =
                            x.PublicId,

                        ProductCategoryId =
                            x.ProductCategoryId,

                        BikeModelId =
                            x.BikeModelId,

                        ProductCategoryName =

                            _context

                                .Set<ProductCategoryEntity>()

                                .Where(c => c.ProductCategoryId == x.ProductCategoryId)

                                .Select(c => c.CategoryName)

                                .FirstOrDefault()

                            ??

                            string.Empty,

                        SubCategoryCode =
                            x.SubCategoryCode,

                        SubCategoryName =
                            x.SubCategoryName,

                        InventorySubGroupCode =
                            x.InventorySubGroupCode,

                        InventorySubGroupName =
                            x.InventorySubGroupName,

                        WipSubGroupCode =
                            x.WipSubGroupCode,

                        WipSubGroupName =
                            x.WipSubGroupName,

                        CogsSubGroupCode =
                            x.CogsSubGroupCode,

                        CogsSubGroupName =
                            x.CogsSubGroupName,

                        SalesSubGroupCode =
                            x.SalesSubGroupCode,

                        SalesSubGroupName =
                            x.SalesSubGroupName,

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

    public async Task<List<ProductSubCategoryDto>>
        GetAllAsync()
    {
        return await ProductSubCategoryQuery()
            .OrderBy
            (
                x =>
                    x.SubCategoryCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get Paged (the list page)
    //
    // Filters and search on the list query, the counts for the
    // summary line, then the status, the total and one page.
    //===========================================================

    private SortMap<ProductSubCategoryDto> ListSorts()
    {
        return new SortMap<ProductSubCategoryDto>("SubCategoryCode")
            .Add("SubCategoryCode", x => x.SubCategoryCode)
            .Add("SubCategoryName", x => x.SubCategoryName)
            .Add("ProductCategoryName", x => x.ProductCategoryName)
            .Add("InventorySubGroupCode", x => x.InventorySubGroupCode)
            .Add("WipSubGroupCode", x => x.WipSubGroupCode)
            .Add("CogsSubGroupCode", x => x.CogsSubGroupCode)
            .Add("IsActive", x => x.IsActive)
            .Tie(x => x.ProductSubCategoryId);
    }

    public async Task<PagedResult<ProductSubCategoryDto>>
        GetPagedAsync
        (
            ProductSubCategoryPageRequest request
        )
    {
        IQueryable<ProductSubCategoryDto> query =
            ProductSubCategoryQuery();

        //-------------------------------------------------------
        // Search (case-insensitive "contains")
        //-------------------------------------------------------

        string search =
            request.SafeSearch;

        if
        (
            search.Length > 0
        )
        {
            string like =
                PagingQuery.LikePattern(search);

            query =
                query.Where
                (
                    x =>
                        EF.Functions.ILike(x.SubCategoryCode, like) ||
                        EF.Functions.ILike(x.SubCategoryName, like) ||
                        EF.Functions.ILike(x.ProductCategoryName, like) ||
                        EF.Functions.ILike(x.InventorySubGroupCode, like) ||
                        EF.Functions.ILike(x.WipSubGroupCode, like) ||
                        EF.Functions.ILike(x.CogsSubGroupCode, like) ||
                        EF.Functions.ILike(x.SalesSubGroupCode, like) ||
                        EF.Functions.ILike(x.Remarks, like)
                );
        }

        //-------------------------------------------------------
        // Product Category filter
        //-------------------------------------------------------

        if
        (
            request.ProductCategoryId > 0
        )
        {
            long productCategoryId =
                request.ProductCategoryId.Value;

            query =
                query.Where(x => x.ProductCategoryId == productCategoryId);
        }

        //-------------------------------------------------------
        // Summary counts (search and filters applied; not the
        // status)
        //-------------------------------------------------------

        int countAll =
            await query.CountAsync();

        int countActive =
            await query.CountAsync(x => x.IsActive);

        Dictionary<string, int> summaryCounts =
            new()
            {
                ["Total"] = countAll,
                ["Active"] = countActive,
                ["Inactive"] = countAll - countActive
            };

        //-------------------------------------------------------
        // Status
        //-------------------------------------------------------

        if
        (
            request.Status.HasValue
        )
        {
            bool active =
                request.Status.Value;

            query =
                query.Where(x => x.IsActive == active);
        }

        //-------------------------------------------------------
        // Total, then the page
        //-------------------------------------------------------

        int total =
            await query.CountAsync();

        PagingQuery.FitPage(
            request,
            total);

        List<ProductSubCategoryDto> rows =
            await ListSorts()
                .Apply(query, request)
                .Page(request)
                .ToListAsync();

        return new PagedResult<ProductSubCategoryDto>
        {
            Items = rows,
            TotalCount = total,
            Page = request.SafePage,
            PageSize = request.SafePageSize,
            Counts = summaryCounts
        };
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
            .Set<ProductSubCategoryEntity>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.PublicId == publicId)
            .Select(x => (long?)x.ProductSubCategoryId)
            .FirstOrDefaultAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<ProductSubCategoryDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await ProductSubCategoryQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.ProductSubCategoryId ==
                    id
            );
    }


    //===========================================================
    // Parent : category + its three account groups
    //===========================================================

    private sealed class Parent
    {
        public ProductCategoryEntity Category { get; init; } = null!;

        public AccountGroupEntity InventoryGroup { get; init; } = null!;

        public AccountGroupEntity WipGroup { get; init; } = null!;

        public AccountGroupEntity CogsGroup { get; init; } = null!;

        public Dictionary<long, AccountClassEntity> Classes { get; init; } = new();

        public IEnumerable<AccountGroupEntity> Groups =>
            new[] { InventoryGroup, WipGroup, CogsGroup };
    }


    private async Task<Parent>
        ResolveParentAsync
        (
            long productCategoryId,
            bool forNewSubCategory
        )
    {
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
            throw new KeyNotFoundException(
                "Product Category not found.");
        }

        if
        (
            forNewSubCategory
            &&
            !category.IsActive
        )
        {
            throw new InvalidOperationException(
                $"Product Category '{category.CategoryName}' is inactive.");
        }

        if
        (
            forNewSubCategory
            &&
            !category.SubCategoryCreationAllowed
        )
        {
            throw new InvalidOperationException(
                $"Sub Category creation is not allowed for '{category.CategoryName}'.");
        }


        string[] groupCodes =
        {
            category.InventoryGroupCode,
            category.WipGroupCode,
            category.CogsGroupCode
        };

        List<AccountGroupEntity> groups =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        groupCodes.Contains(
                            x.GroupCode)
                )
                .ToListAsync();

        AccountGroupEntity Pick
        (
            string code,
            string label
        )
        {
            return groups.FirstOrDefault
                (
                    x =>
                        x.GroupCode ==
                        code
                )
                ??
                throw new InvalidOperationException(
                    $"The {label} account group {code} of '{category.CategoryName}' was not found. " +
                    "Save the Product Category again to rebuild it.");
        }


        long[] classIds =
            groups
                .Select
                (
                    x =>
                        x.AccountClassId
                )
                .Distinct()
                .ToArray();

        Dictionary<long, AccountClassEntity> classes =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        classIds.Contains(
                            x.AccountClassId)
                )
                .ToDictionaryAsync
                (
                    x =>
                        x.AccountClassId
                );

        return new Parent
        {
            Category =
                category,

            InventoryGroup =
                Pick(category.InventoryGroupCode, "Inventory"),

            WipGroup =
                Pick(category.WipGroupCode, "WIP"),

            CogsGroup =
                Pick(category.CogsGroupCode, "COGS"),

            Classes =
                classes
        };
    }


    //===========================================================
    // Code Helpers
    //===========================================================

    // "WIP-001-002" → ("WIP", "001-002")
    private static (string Prefix, string Numbers) SplitGroupCode
    (
        string? groupCode
    )
    {
        string[] parts =
            (groupCode ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries)
                .Select
                (
                    x =>
                        x.Trim()
                )
                .ToArray();

        if
        (
            parts.Length != 3
            ||
            !int.TryParse(parts[1], out _)
            ||
            !int.TryParse(parts[2], out _)
        )
        {
            throw new InvalidOperationException(
                $"Invalid Account Group code '{groupCode}'.");
        }

        return (parts[0].ToUpperInvariant(), $"{parts[1]}-{parts[2]}");
    }


    // Sub group code under a group : "<group code>-sss",
    // e.g. INV-001-001 → INV-001-001-001 (WIP / COGS the same)
    private static string SubGroupCode
    (
        AccountGroupEntity group,
        int subNumber
    )
    {
        (string prefix, string numbers) =
            SplitGroupCode(
                group.GroupCode);

        return $"{prefix}-{numbers}-{subNumber:D3}";
    }


    // Sub Category Code : "<category code>-sss", e.g. MB-001-001
    private static string SubCategoryCode
    (
        Parent parent,
        int subNumber
    )
    {
        string categoryCode =
            (parent.Category.CategoryCode ?? string.Empty)
                .Trim()
                .ToUpperInvariant();

        if
        (
            string.IsNullOrWhiteSpace(categoryCode)
        )
        {
            throw new InvalidOperationException(
                $"Product Category '{parent.Category.CategoryName}' has no Category Code. Save the category again first.");
        }

        return $"{categoryCode}-{subNumber:D3}";
    }


    // "<class prefix> - <Sub Category Name>"
    private static string SubGroupName
    (
        Parent parent,
        AccountGroupEntity group,
        string subCategoryName
    )
    {
        string prefix =
            parent.Classes.TryGetValue(
                group.AccountClassId,
                out AccountClassEntity? accountClass)
                ? (accountClass.ClassPrefix ?? string.Empty).Trim().ToUpperInvariant()
                : string.Empty;

        return string.IsNullOrWhiteSpace(prefix)
            ? subCategoryName
            : $"{prefix} - {subCategoryName}";
    }


    // Last number part of a sub category / sub group code
    // ("MB-001-007" → 7, "INV-001-001-007" → 7, else 0)
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

        return parts.Length >= 3
            &&
            int.TryParse(
                parts[^1].Trim(),
                out int number)
                ? number
                : 0;
    }


    //===========================================================
    // Next Sub Category Number (inside one category)
    //===========================================================

    private async Task<int>
        GetNextSubNumberAsync
        (
            Parent parent
        )
    {
        long categoryId =
            parent.Category.ProductCategoryId;

        List<string> subCategoryCodes =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductCategoryId ==
                        categoryId
                )
                .Select
                (
                    x =>
                        x.SubCategoryCode
                )
                .ToListAsync();

        long[] groupIds =
            parent.Groups
                .Select
                (
                    x =>
                        x.AccountGroupId
                )
                .ToArray();

        List<string> subGroupCodes =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        groupIds.Contains(
                            x.AccountGroupId)
                )
                .Select
                (
                    x =>
                        x.SubGroupCode
                )
                .ToListAsync();

        int highest =
            subCategoryCodes
                .Concat(subGroupCodes)
                .Select(LastNumber)
                .DefaultIfEmpty(0)
                .Max();

        if
        (
            highest >= 999
        )
        {
            throw new InvalidOperationException(
                $"Product Category '{parent.Category.CategoryName}' already has the maximum of 999 sub categories.");
        }

        return highest + 1;
    }


    //===========================================================
    // Get Next Code (Sub Category Code : <category code>-sss)
    //===========================================================

    public async Task<string>
        GetNextCodeAsync
        (
            long productCategoryId
        )
    {
        Parent parent =
            await ResolveParentAsync(
                productCategoryId,
                true);

        int number =
            await GetNextSubNumberAsync(
                parent);

        return SubCategoryCode(
            parent,
            number);
    }


    //===========================================================
    // Get Defaults (preview of all four codes)
    //===========================================================

    public async Task<ProductSubCategoryDefaultsDto>
        GetDefaultsAsync
        (
            long productCategoryId
        )
    {
        Parent parent =
            await ResolveParentAsync(
                productCategoryId,
                true);

        int number =
            await GetNextSubNumberAsync(
                parent);

        return new ProductSubCategoryDefaultsDto
        {
            Code =
                SubCategoryCode(
                    parent,
                    number),

            InventorySubGroupCode =
                SubGroupCode(
                    parent.InventoryGroup,
                    number),

            WipSubGroupCode =
                SubGroupCode(
                    parent.WipGroup,
                    number),

            CogsSubGroupCode =
                SubGroupCode(
                    parent.CogsGroup,
                    number),

            SalesSubGroupCode =
                ProductSalesAccounts.SubGroupCodeOf(
                    parent.Category.CategoryType,
                    SubGroupCode(
                        parent.InventoryGroup,
                        number))
        };
    }


    //===========================================================
    // Normalize Name
    //===========================================================

    private static string NormalizeName
    (
        string? subCategoryName
    )
    {
        string name =
            subCategoryName?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(name)
        )
        {
            throw new InvalidOperationException(
                "Sub Category Name is required.");
        }

        if
        (
            name.Length >
            190
        )
        {
            // 190 leaves room for the "COGS - " sub group name prefix
            throw new InvalidOperationException(
                "Sub Category Name cannot be longer than 190 characters.");
        }

        return name;
    }


    //===========================================================
    // Name + Bike Model
    //
        // Motor Bikes / Spare Parts / Accessories :
    //     a Bike Model of the category's brand is required; the
    //     name is built by the server as
    //     "<Category Type> - <Brand> - <Model>".
    //     A model is used once per category (A04 can have one
    //     Motor Bikes, one Spare Parts and one Accessories sub
    //     category).
    // Lubricants : no model; the name is typed.
    //===========================================================

    private static readonly HashSet<string> ModelCategoryTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "Motor Bikes",
            "Spare Parts",
            "Accessories"
        };


    private async Task<(string Name, long? BikeModelId)>
        ResolveNameAsync
        (
            ProductCategoryEntity category,
            long? bikeModelId,
            string? typedName,
            long excludeSubCategoryId,
            long? currentBikeModelId
        )
    {
        string categoryType =
            category.CategoryType?.Trim()
            ??
            string.Empty;

        if
        (
            !ModelCategoryTypes.Contains(
                categoryType)
        )
        {
            return (NormalizeName(typedName), null);
        }

        if
        (
            !(bikeModelId > 0)
        )
        {
            throw new InvalidOperationException(
                $"Model is required for a {categoryType} sub category.");
        }

        BikeModelsEntity? model =
            await _context
                .Set<BikeModelsEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.BikeModelId ==
                        bikeModelId.Value
                        &&
                        !x.IsDeleted
                );

        if
        (
            model ==
            null
        )
        {
            throw new InvalidOperationException(
                "The selected Bike Model was not found.");
        }

        // An inactive model is kept only when it is not changed
        if
        (
            !model.Status
            &&
            model.BikeModelId !=
            currentBikeModelId
        )
        {
            throw new InvalidOperationException(
                $"Bike Model '{model.ModelName}' is inactive.");
        }

        if
        (
            model.BrandManagementId !=
            category.BrandManagementId
        )
        {
            throw new InvalidOperationException(
                $"Bike Model '{model.ModelName}' does not belong to the brand of '{category.CategoryName}'.");
        }

        await EnsureBikeModelFreeAsync(
            category.ProductCategoryId,
            model.BikeModelId,
            excludeSubCategoryId,
            false);

        string brandName =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.BrandManagementId ==
                        model.BrandManagementId
                )
                .Select
                (
                    x =>
                        x.BrandName
                )
                .FirstOrDefaultAsync()
            ??
            string.Empty;

        string name =
            string.Join(
                " - ",
                new[]
                {
                    categoryType,
                    brandName.Trim(),
                    model.ModelName.Trim()
                }
                .Where(x => x.Length > 0));

        return (NormalizeName(name), model.BikeModelId);
    }


    //===========================================================
    // A Bike Model is linked to one sub category per category
    //===========================================================

    private async Task
        EnsureBikeModelFreeAsync
        (
            long productCategoryId,
            long? bikeModelId,
            long excludeSubCategoryId,
            bool forRestore
        )
    {
        if
        (
            !(bikeModelId > 0)
        )
        {
            return;
        }

        if
        (
            forRestore
            &&
            !await _context
                .Set<BikeModelsEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        x.BikeModelId ==
                        bikeModelId.Value
                        &&
                        !x.IsDeleted
                )
        )
        {
            throw new InvalidOperationException(
                "Its Bike Model is deleted; restore the bike model first.");
        }

        string? usedBy =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductCategoryId ==
                        productCategoryId
                        &&
                        x.BikeModelId ==
                        bikeModelId
                        &&
                        !x.IsDeleted
                        &&
                        x.ProductSubCategoryId !=
                        excludeSubCategoryId
                )
                .Select
                (
                    x =>
                        x.SubCategoryName
                )
                .FirstOrDefaultAsync();

        if
        (
            usedBy !=
            null
        )
        {
            throw new InvalidOperationException(
                $"This Bike Model is already used by sub category '{usedBy}' in this category.");
        }
    }


    //===========================================================
    // Validate Unique Name / Code (non-deleted rows only)
    //
    // Name is unique within its category; code everywhere.
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            long productCategoryId,
            string subCategoryCode,
            string subCategoryName,
            long excludeId
        )
    {
        string lowerName =
            subCategoryName.ToLower();

        ProductSubCategoryEntity? sameName =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.ProductSubCategoryId !=
                        excludeId
                        &&
                        x.ProductCategoryId ==
                        productCategoryId
                        &&
                        x.SubCategoryName.ToLower() ==
                        lowerName
                );

        if
        (
            sameName !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Sub Category '{subCategoryName}' already exists in this category ({sameName.SubCategoryCode}).");
        }

        bool codeTaken =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.ProductSubCategoryId !=
                        excludeId
                        &&
                        x.SubCategoryCode ==
                        subCategoryCode
                );

        if
        (
            codeTaken
        )
        {
            throw new InvalidOperationException(
                $"Sub Category Code '{subCategoryCode}' is already in use.");
        }
    }


    //===========================================================
    // Linked Account Sub Groups (by code, deleted ones included)
    //===========================================================

    private async Task<List<AccountSubGroupEntity>>
        LoadLinkedSubGroupsAsync
        (
            ProductSubCategoryEntity entity
        )
    {
        string[] codes =
            new[]
            {
                entity.InventorySubGroupCode,
                entity.WipSubGroupCode,
                entity.CogsSubGroupCode
            }
            .Where
            (
                x =>
                    !string.IsNullOrWhiteSpace(x)
            )
            .ToArray();

        return await _context
            .Set<AccountSubGroupEntity>()
            .Where
            (
                x =>
                    codes.Contains(
                        x.SubGroupCode)
            )
            .ToListAsync();
    }


    //===========================================================
    // Sync Account Sub Groups
    //
    // Creates any missing sub group and keeps the three in line
    // with the sub category : name, active state, parent data.
    //===========================================================

    private async Task
        SyncAccountSubGroupsAsync
        (
            ProductSubCategoryEntity entity,
            Parent parent,
            long userId
        )
    {
        List<AccountSubGroupEntity> existing =
            await LoadLinkedSubGroupsAsync(
                entity);

        var definitions =
            new[]
            {
                new { Group = parent.InventoryGroup, Code = entity.InventorySubGroupCode, Name = entity.InventorySubGroupName },
                new { Group = parent.WipGroup,       Code = entity.WipSubGroupCode,       Name = entity.WipSubGroupName },
                new { Group = parent.CogsGroup,      Code = entity.CogsSubGroupCode,      Name = entity.CogsSubGroupName }
            };

        foreach
        (
            var definition
            in definitions
        )
        {
            AccountClassEntity? accountClass =
                parent.Classes.GetValueOrDefault(
                    definition.Group.AccountClassId);

            AccountSubGroupEntity? subGroup =
                existing.FirstOrDefault
                (
                    x =>
                        x.SubGroupCode ==
                        definition.Code
                        &&
                        !x.IsDeleted
                );

            if
            (
                subGroup ==
                null
            )
            {
                _context
                    .Set<AccountSubGroupEntity>()
                    .Add
                    (
                        new AccountSubGroupEntity
                        {
                            AccountClassId =
                                definition.Group.AccountClassId,

                            AccountGroupId =
                                definition.Group.AccountGroupId,

                            ClassCode =
                                accountClass?.ClassCode
                                ??
                                definition.Group.ClassCode,

                            Mode =
                                accountClass?.Mode
                                ??
                                definition.Group.Mode,

                            GroupCode =
                                definition.Group.GroupCode,

                            SubGroupCode =
                                definition.Code,

                            SubGroupName =
                                definition.Name,

                            AllowManualLedger =
                                false,

                            Remarks =
                                $"System generated from Product Sub Category {entity.SubCategoryCode}.",

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
                subGroup.AccountGroupId !=
                definition.Group.AccountGroupId
            )
            {
                throw new InvalidOperationException(
                    $"Account Sub Group '{definition.Code}' belongs to a different Account Group.");
            }

            bool changed =
                subGroup.SubGroupName != definition.Name
                ||
                subGroup.IsActive != entity.IsActive
                ||
                subGroup.GroupCode != definition.Group.GroupCode;

            if
            (
                changed
            )
            {
                subGroup.SubGroupName =
                    definition.Name;

                subGroup.IsActive =
                    entity.IsActive;

                subGroup.GroupCode =
                    definition.Group.GroupCode;

                subGroup.ModifiedBy =
                    userId;

                subGroup.ModifiedDate =
                    DateTime.UtcNow;
            }
        }
    }


    //===========================================================
    // Repair Codes (runs on every Update)
    //
    // A sub category saved by older code may carry codes of the
    // old pattern (e.g. SCG-001-001-001) or codes that no longer
    // match its category's groups. They are rebuilt from its own
    // number to <category code>-sss and INV / WIP / COGS -…-sss
    // under the category's current groups. Sub groups
    // left under the old codes are soft deleted — only when they
    // have no ledgers; otherwise the update is refused.
    //===========================================================

    private async Task
        RepairCodesAsync
        (
            ProductSubCategoryEntity entity,
            Parent parent,
            long userId
        )
    {
        // Keep the sub category's own sss
        int number =
            new[]
            {
                entity.InventorySubGroupCode,
                entity.WipSubGroupCode,
                entity.CogsSubGroupCode,
                entity.SubCategoryCode
            }
            .Select(LastNumber)
            .FirstOrDefault
            (
                x =>
                    x >= 1
                    &&
                    x <= 999
            );

        if
        (
            number < 1
        )
        {
            number =
                await GetNextSubNumberAsync(
                    parent);
        }

        string subCategoryCode =
            SubCategoryCode(
                parent,
                number);

        string inventoryCode =
            SubGroupCode(
                parent.InventoryGroup,
                number);

        string wipCode =
            SubGroupCode(
                parent.WipGroup,
                number);

        string cogsCode =
            SubGroupCode(
                parent.CogsGroup,
                number);

        if
        (
            entity.SubCategoryCode == subCategoryCode
            &&
            entity.InventorySubGroupCode == inventoryCode
            &&
            entity.WipSubGroupCode == wipCode
            &&
            entity.CogsSubGroupCode == cogsCode
        )
        {
            return;
        }


        //=======================================================
        // Sub groups under the old codes
        //=======================================================

        string[] expected =
        {
            inventoryCode,
            wipCode,
            cogsCode
        };

        List<AccountSubGroupEntity> oldSubGroups =
            (await LoadLinkedSubGroupsAsync(entity))
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        !expected.Contains(
                            x.SubGroupCode)
                )
                .ToList();

        long[] oldIds =
            oldSubGroups
                .Select
                (
                    x =>
                        x.AccountSubGroupId
                )
                .ToArray();

        bool hasLedgers =
            await _context
                .Set<GeneralLedgersEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        oldIds.Contains(
                            x.AccountSubGroupId)
                        &&
                        !x.IsDeleted
                );

        if
        (
            hasLedgers
        )
        {
            throw new InvalidOperationException(
                $"Product Sub Category '{entity.SubCategoryName}' still uses old account sub group codes that have ledgers. " +
                "Remove those ledgers first, then save the sub category again.");
        }

        DateTime now =
            DateTime.UtcNow;

        foreach
        (
            AccountSubGroupEntity subGroup
            in oldSubGroups
        )
        {
            subGroup.IsDeleted =
                true;

            subGroup.DeletedBy =
                userId;

            subGroup.DeletedDate =
                now;
        }


        //=======================================================
        // New codes
        //=======================================================

        await EnsureUniqueAsync(
            entity.ProductCategoryId,
            subCategoryCode,
            entity.SubCategoryName,
            entity.ProductSubCategoryId);

        entity.SubCategoryCode =
            subCategoryCode;

        entity.InventorySubGroupCode =
            inventoryCode;

        entity.WipSubGroupCode =
            wipCode;

        entity.CogsSubGroupCode =
            cogsCode;
    }


    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory
    (
        ProductSubCategoryEntity entity,
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
                    "Product Sub Category",

                EntityId =
                    entity.ProductSubCategoryId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Product Sub Category {verb}",

                ActivityDescription =
                    $"Product Sub Category '{entity.SubCategoryName}' ({entity.SubCategoryCode}) {verb.ToLower()}.",

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
    // Codes and sub group names are always built here; the
    // form's values are only a preview.
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateProductSubCategoryDto dto,
            long userId
        )
    {
        Parent parent =
            await ResolveParentAsync(
                dto.ProductCategoryId,
                true);

        (string subCategoryName, long? bikeModelId) =
            await ResolveNameAsync(
                parent.Category,
                dto.BikeModelId,
                dto.SubCategoryName,
                0,
                null);

        int number =
            await GetNextSubNumberAsync(
                parent);

        string subCategoryCode =
            SubCategoryCode(
                parent,
                number);

        string inventoryCode =
            SubGroupCode(
                parent.InventoryGroup,
                number);

        await EnsureUniqueAsync(
            parent.Category.ProductCategoryId,
            subCategoryCode,
            subCategoryName,
            0);


        ProductSubCategoryEntity entity =
            new ProductSubCategoryEntity
            {
                ProductCategoryId =
                    parent.Category.ProductCategoryId,

                SubCategoryCode =
                    subCategoryCode,

                SubCategoryName =
                    subCategoryName,

                BikeModelId =
                    bikeModelId,

                InventorySubGroupCode =
                    inventoryCode,

                InventorySubGroupName =
                    SubGroupName(
                        parent,
                        parent.InventoryGroup,
                        subCategoryName),

                WipSubGroupCode =
                    SubGroupCode(
                        parent.WipGroup,
                        number),

                WipSubGroupName =
                    SubGroupName(
                        parent,
                        parent.WipGroup,
                        subCategoryName),

                CogsSubGroupCode =
                    SubGroupCode(
                        parent.CogsGroup,
                        number),

                CogsSubGroupName =
                    SubGroupName(
                        parent,
                        parent.CogsGroup,
                        subCategoryName),

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
        // Sub category + its three sub groups in one transaction
        //=======================================================

        // Joins the caller's transaction when one is open (Model
        // Onboarding saves model, sub category and bikes as one)
        await using var transaction =
            _context.Database.CurrentTransaction == null
                ? await _context.Database.BeginTransactionAsync()
                : null;

        _context
            .Set<ProductSubCategoryEntity>()
            .Add(
                entity);

        await SyncAccountSubGroupsAsync(
            entity,
            parent,
            userId);

        // Sales account sub group (CLS-005 / 006 / 008)
        await ProductSalesAccounts.SyncSubCategoryAsync(_context, entity, userId);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        if (transaction != null)
        {
            await transaction.CommitAsync();
        }

        return entity.ProductSubCategoryId;
    }


    //===========================================================
    // Update
    //
    // Category and codes are locked. Renaming the sub category
    // renames its three sub groups; the active state is copied.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateProductSubCategoryDto dto,
            long userId
        )
    {
        ProductSubCategoryEntity? entity =
            await _context
                .Set<ProductSubCategoryEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ProductSubCategoryId ==
                        dto.ProductSubCategoryId
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
                "Product Sub Category not found.");
        }

        if
        (
            dto.ProductCategoryId > 0
            &&
            dto.ProductCategoryId !=
            entity.ProductCategoryId
        )
        {
            throw new InvalidOperationException(
                "Product Category cannot be changed after the sub category is created.");
        }


        Parent parent =
            await ResolveParentAsync(
                entity.ProductCategoryId,
                false);

        (string subCategoryName, long? bikeModelId) =
            await ResolveNameAsync(
                parent.Category,
                dto.BikeModelId,
                dto.SubCategoryName,
                entity.ProductSubCategoryId,
                entity.BikeModelId);

        await EnsureUniqueAsync(
            entity.ProductCategoryId,
            entity.SubCategoryCode,
            subCategoryName,
            entity.ProductSubCategoryId);


        entity.SubCategoryName =
            subCategoryName;

        entity.BikeModelId =
            bikeModelId;

        entity.InventorySubGroupName =
            SubGroupName(
                parent,
                parent.InventoryGroup,
                subCategoryName);

        entity.WipSubGroupName =
            SubGroupName(
                parent,
                parent.WipGroup,
                subCategoryName);

        entity.CogsSubGroupName =
            SubGroupName(
                parent,
                parent.CogsGroup,
                subCategoryName);

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
            parent,
            userId);

        // Then any missing sub group is inserted, and all three
        // are brought in line with the sub category
        await SyncAccountSubGroupsAsync(
            entity,
            parent,
            userId);

        // Sales account sub group (CLS-005 / 006 / 008)
        await ProductSalesAccounts.SyncSubCategoryAsync(_context, entity, userId);

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
    // Blocked while any of the three sub groups still has
    // ledgers. Deletes the sub category and its sub groups.
    //
    // TODO (Motor Bikes rebuild): also block while products
    // (Motor Bikes) exist under this sub category.
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        ProductSubCategoryEntity? entity =
            await _context
                .Set<ProductSubCategoryEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ProductSubCategoryId ==
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
                "Product Sub Category not found.");
        }


        List<AccountSubGroupEntity> subGroups =
            (await LoadLinkedSubGroupsAsync(entity))
                .Where
                (
                    x =>
                        !x.IsDeleted
                )
                .ToList();

        long[] subGroupIds =
            subGroups
                .Select
                (
                    x =>
                        x.AccountSubGroupId
                )
                .ToArray();

        int ledgerCount =
            await _context
                .Set<GeneralLedgersEntity>()
                .AsNoTracking()
                .CountAsync
                (
                    x =>
                        subGroupIds.Contains(
                            x.AccountSubGroupId)
                        &&
                        !x.IsDeleted
                );

        if
        (
            ledgerCount >
            0
        )
        {
            throw new InvalidOperationException(
                $"Product Sub Category '{entity.SubCategoryName}' cannot be deleted because " +
                $"its account sub groups still have {ledgerCount} ledger(s).");
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
            AccountSubGroupEntity subGroup
            in subGroups
        )
        {
            subGroup.IsDeleted =
                true;

            subGroup.DeletedBy =
                userId;

            subGroup.DeletedDate =
                now;
        }

        // Sales account sub group follows
        await ProductSalesAccounts.SyncSubCategoryAsync(_context, entity, userId);

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
    // Restores the most recently deleted sub category and its
    // three sub groups. Blocked (409) while its category is
    // deleted, or its name / code is taken.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        ProductSubCategoryEntity? entity =
            await _context
                .Set<ProductSubCategoryEntity>()
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
                    false);

            await EnsureUniqueAsync(
                entity.ProductCategoryId,
                entity.SubCategoryCode,
                entity.SubCategoryName,
                entity.ProductSubCategoryId);

            await EnsureBikeModelFreeAsync(
                entity.ProductCategoryId,
                entity.BikeModelId,
                entity.ProductSubCategoryId,
                true);
        }
        catch
        (
            KeyNotFoundException
        )
        {
            throw new InvalidOperationException(
                $"Product Sub Category '{entity.SubCategoryName}' cannot be restored. " +
                "Its Product Category is deleted; restore the category first.");
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Product Sub Category '{entity.SubCategoryName}' cannot be restored. {ex.Message}");
        }


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        foreach
        (
            AccountSubGroupEntity subGroup
            in (await LoadLinkedSubGroupsAsync(entity))
                .Where(x => x.IsDeleted)
        )
        {
            subGroup.IsDeleted =
                false;

            subGroup.DeletedBy =
                null;

            subGroup.DeletedDate =
                null;

            subGroup.ModifiedBy =
                userId;

            subGroup.ModifiedDate =
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

        await SyncAccountSubGroupsAsync(
            entity,
            parent,
            userId);

        // Sales account sub group (CLS-005 / 006 / 008)
        await ProductSalesAccounts.SyncSubCategoryAsync(_context, entity, userId);

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
            .Set<ProductSubCategoryEntity>()
            .AnyAsync
            (
                x =>
                    x.ProductSubCategoryId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}