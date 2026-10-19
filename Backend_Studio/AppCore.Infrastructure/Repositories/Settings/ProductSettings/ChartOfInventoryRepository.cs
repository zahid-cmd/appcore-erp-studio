//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ProductSettings;
using AppCore.Application.Settings.ProductSettings.ChartOfInventory.DTOs;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;

using SparePartsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SpareParts;

using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;

using AccountGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using GeneralLedgersEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.ProductSettings;


//===============================================================
// Chart of Inventory Repository (read-only)
//
// The page owns no data. Every call reads the live tables, so
// whatever is added, renamed, moved, deactivated or deleted on
// the Product Category / Sub Category / Motor Bikes / Spare
// Parts / Accessories pages shows up on the next load.
//
// Tree     : Category Type (fixed MB / SP / AC) → Category →
//            Sub Category, linked by ID only.
// Products : every product table is registered ONCE in
//            ProductSources below. Counts, product lists,
//            printing and link checks all read from that single
//            list, so a new product table is one entry.
// Issues   : GetIssuesAsync reports broken links instead of
//            hiding them (missing / deleted parents, a code that
//            does not match its parent, a product under a category
//            of another type, missing account groups / ledgers).
//
// Deleted records are never shown. Nothing is written.
//===============================================================

public class ChartOfInventoryRepository : IChartOfInventoryRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public ChartOfInventoryRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Category Types (fixed, in display order)
    //===========================================================

    private sealed class TypeDef
    {
        public long Id { get; init; }

        public string Code { get; init; } = string.Empty;

        public string Name { get; init; } = string.Empty;

        public string ItemType { get; init; } = string.Empty;
    }


    private static readonly TypeDef[] Types =
    {
        new TypeDef { Id = 1, Code = "MB", Name = "Motor Bikes", ItemType = ChartOfInventoryItemTypes.MotorBike },

        new TypeDef { Id = 2, Code = "SP", Name = "Spare Parts", ItemType = ChartOfInventoryItemTypes.SparePart },

        new TypeDef { Id = 3, Code = "AC", Name = "Accessories", ItemType = ChartOfInventoryItemTypes.Accessory }
    };


    // "spare parts" → the Spare Parts type, unknown → null
    private static TypeDef? TypeOf
    (
        string? categoryType
    )
    {
        return Types.FirstOrDefault
        (
            x =>
                string.Equals(
                    x.Name,
                    categoryType?.Trim(),
                    StringComparison.OrdinalIgnoreCase)
        );
    }


    //===========================================================
    // Product Sources (THE ONLY PLACE PRODUCT TABLES ARE LISTED)
    //
    // Each source returns its non-deleted rows in one shape.
    // subCategoryId = null → all rows of that table.
    //===========================================================

    private sealed class ProductSource
    {
        public string ItemType { get; init; } = string.Empty;

        public Func<AppDbContext, long?, IQueryable<ChartOfInventoryDto>> Query { get; init; } =
            (_, _) => Enumerable.Empty<ChartOfInventoryDto>().AsQueryable();
    }


    private static readonly ProductSource[] ProductSources =
    {
        //=======================================================
        // Motor Bikes
        //=======================================================

        new ProductSource
        {
            ItemType =
                ChartOfInventoryItemTypes.MotorBike,

            Query =
                (db, subCategoryId) =>
                    db.Set<MotorBikesEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                (subCategoryId == null || x.ProductSubCategoryId == subCategoryId)
                        )
                        .Select
                        (
                            x =>
                                new ChartOfInventoryDto
                                {
                                    Id = x.MotorBikeId,
                                    SubCategoryId = x.ProductSubCategoryId,
                                    CategoryId = x.ProductCategoryId,
                                    ItemType = ChartOfInventoryItemTypes.MotorBike,
                                    Code = x.ProductCode,
                                    Name = x.ProductName,
                                    Unit = "Pcs",
                                    InventoryLedger = x.InventoryLedgerCode,
                                    WipLedger = x.WipLedgerCode,
                                    CogsLedger = x.CogsLedgerCode,
                                    Status = x.IsActive
                                }
                        )
        },


        //=======================================================
        // Spare Parts
        //=======================================================

        new ProductSource
        {
            ItemType =
                ChartOfInventoryItemTypes.SparePart,

            Query =
                (db, subCategoryId) =>
                    db.Set<SparePartsEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                (subCategoryId == null || x.ProductSubCategoryId == subCategoryId)
                        )
                        .Select
                        (
                            x =>
                                new ChartOfInventoryDto
                                {
                                    Id = x.SparePartId,
                                    SubCategoryId = x.ProductSubCategoryId,
                                    CategoryId = x.ProductCategoryId,
                                    ItemType = ChartOfInventoryItemTypes.SparePart,
                                    Code = x.ProductCode,
                                    Name = x.PartNumber + " - " + x.PartName,
                                    Unit = x.Unit,
                                    InventoryLedger = x.InventoryLedgerCode,
                                    WipLedger = x.WipLedgerCode,
                                    CogsLedger = x.CogsLedgerCode,
                                    Status = x.IsActive
                                }
                        )
        },


        //=======================================================
        // Accessories (Part Number optional)
        //=======================================================

        new ProductSource
        {
            ItemType =
                ChartOfInventoryItemTypes.Accessory,

            Query =
                (db, subCategoryId) =>
                    db.Set<AccessoriesEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                (subCategoryId == null || x.ProductSubCategoryId == subCategoryId)
                        )
                        .Select
                        (
                            x =>
                                new ChartOfInventoryDto
                                {
                                    Id = x.AccessoryId,
                                    SubCategoryId = x.ProductSubCategoryId,
                                    CategoryId = x.ProductCategoryId,
                                    ItemType = ChartOfInventoryItemTypes.Accessory,
                                    Code = x.ProductCode,
                                    Name =
                                        x.PartNumber == null || x.PartNumber == ""
                                            ? x.AccessoryName
                                            : x.PartNumber + " - " + x.AccessoryName,
                                    Unit = x.Unit,
                                    InventoryLedger = x.InventoryLedgerCode,
                                    WipLedger = x.WipLedgerCode,
                                    CogsLedger = x.CogsLedgerCode,
                                    Status = x.IsActive
                                }
                        )
        }
    };


    //===========================================================
    // Load Products (one sub category, or all when null)
    //
    // Sorted by sub category, then code.
    //===========================================================

    private async Task<List<ChartOfInventoryDto>>
        LoadProductsAsync
        (
            long? subCategoryId
        )
    {
        List<ChartOfInventoryDto> rows =
            new List<ChartOfInventoryDto>();

        foreach
        (
            ProductSource source
            in ProductSources
        )
        {
            rows.AddRange(
                await source
                    .Query(
                        _context,
                        subCategoryId)
                    .ToListAsync());
        }

        return rows
            .OrderBy(x => x.SubCategoryId)
            .ThenBy(x => x.Code, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }


    //===========================================================
    // Live Structure (categories / sub categories)
    //===========================================================

    private sealed class CategoryRow
    {
        public long Id { get; init; }

        public string Code { get; init; } = string.Empty;

        public string Name { get; init; } = string.Empty;

        public string CategoryType { get; init; } = string.Empty;

        public string InventoryGroupCode { get; init; } = string.Empty;

        public string WipGroupCode { get; init; } = string.Empty;

        public string CogsGroupCode { get; init; } = string.Empty;

        public bool Status { get; init; }
    }

    private sealed class SubCategoryRow
    {
        public long Id { get; init; }

        public long CategoryId { get; init; }

        public string Code { get; init; } = string.Empty;

        public string Name { get; init; } = string.Empty;

        public string InventorySubGroupCode { get; init; } = string.Empty;

        public string WipSubGroupCode { get; init; } = string.Empty;

        public string CogsSubGroupCode { get; init; } = string.Empty;

        public bool Status { get; init; }
    }


    private async Task<List<CategoryRow>>
        LoadCategoriesAsync()
    {
        List<CategoryRow> rows =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select
                (
                    x =>
                        new CategoryRow
                        {
                            Id = x.ProductCategoryId,
                            Code = x.CategoryCode ?? string.Empty,
                            Name = x.CategoryName ?? string.Empty,
                            CategoryType = x.CategoryType ?? string.Empty,
                            InventoryGroupCode = x.InventoryGroupCode ?? string.Empty,
                            WipGroupCode = x.WipGroupCode ?? string.Empty,
                            CogsGroupCode = x.CogsGroupCode ?? string.Empty,
                            Status = x.IsActive
                        }
                )
                .ToListAsync();

        return rows
            .OrderBy(x => x.Code, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }


    private async Task<List<SubCategoryRow>>
        LoadSubCategoriesAsync()
    {
        List<SubCategoryRow> rows =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select
                (
                    x =>
                        new SubCategoryRow
                        {
                            Id = x.ProductSubCategoryId,
                            CategoryId = x.ProductCategoryId,
                            Code = x.SubCategoryCode ?? string.Empty,
                            Name = x.SubCategoryName ?? string.Empty,
                            InventorySubGroupCode = x.InventorySubGroupCode ?? string.Empty,
                            WipSubGroupCode = x.WipSubGroupCode ?? string.Empty,
                            CogsSubGroupCode = x.CogsSubGroupCode ?? string.Empty,
                            Status = x.IsActive
                        }
                )
                .ToListAsync();

        return rows
            .OrderBy(x => x.Code, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }


    //===========================================================
    // Get Tree
    //
    // Type → Category → Sub Category, linked by ID. Product
    // counts per sub category come from every registered source.
    //===========================================================

    public async Task<List<ChartOfInventoryTypeDto>>
        GetTreeAsync()
    {
        List<CategoryRow> categories =
            await LoadCategoriesAsync();

        List<SubCategoryRow> subCategories =
            await LoadSubCategoriesAsync();


        //=======================================================
        // Product counts (SubCategoryId + Status only)
        //=======================================================

        Dictionary<long, (int Total, int Active)> counts =
            new Dictionary<long, (int Total, int Active)>();

        foreach
        (
            ProductSource source
            in ProductSources
        )
        {
            var rows =
                await source
                    .Query(
                        _context,
                        null)
                    .Select
                    (
                        x =>
                            new
                            {
                                x.SubCategoryId,
                                x.Status
                            }
                    )
                    .ToListAsync();

            foreach
            (
                var row
                in rows
            )
            {
                counts.TryGetValue(
                    row.SubCategoryId,
                    out (int Total, int Active) current);

                counts[row.SubCategoryId] =
                (
                    current.Total + 1,
                    current.Active + (row.Status ? 1 : 0)
                );
            }
        }


        //=======================================================
        // Assemble by ID
        //=======================================================

        ILookup<long, ChartOfInventorySubCategoryDto> subCategoriesByCategory =
            subCategories.ToLookup
            (
                x =>
                    x.CategoryId,
                x =>
                {
                    counts.TryGetValue(
                        x.Id,
                        out (int Total, int Active) count);

                    return new ChartOfInventorySubCategoryDto
                    {
                        Id = x.Id,
                        Code = x.Code,
                        Name = x.Name,
                        Status = x.Status,
                        ProductCount = count.Total,
                        ActiveProductCount = count.Active
                    };
                }
            );

        ILookup<long, ChartOfInventoryCategoryDto> categoriesByType =
            categories
                .Where(x => TypeOf(x.CategoryType) != null)
                .ToLookup
                (
                    x =>
                        TypeOf(x.CategoryType)!.Id,
                    x =>
                        new ChartOfInventoryCategoryDto
                        {
                            Id = x.Id,
                            Code = x.Code,
                            Name = x.Name,
                            Status = x.Status,
                            SubCategories = subCategoriesByCategory[x.Id].ToList()
                        }
                );

        return Types
            .Select
            (
                x =>
                    new ChartOfInventoryTypeDto
                    {
                        Id = x.Id,
                        Code = x.Code,
                        Name = x.Name,
                        CategoryType = x.Name,
                        Status = true,
                        Categories = categoriesByType[x.Id].ToList()
                    }
            )
            .ToList();
    }


    //===========================================================
    // Get Sub Category Products
    //===========================================================

    public async Task<List<ChartOfInventoryDto>>
        GetSubCategoryProductsAsync
        (
            long subCategoryId
        )
    {
        return await LoadProductsAsync(
            subCategoryId);
    }


    //===========================================================
    // Get All Products (printing)
    //===========================================================

    public async Task<List<ChartOfInventoryDto>>
        GetAllProductsAsync()
    {
        return await LoadProductsAsync(
            null);
    }


    //===========================================================
    // Code Helpers
    //
    // "MB-001-002-00003" → prefix "MB", numbers ["001","002","00003"].
    //===========================================================

    private static string Prefix
    (
        string? code
    )
    {
        return (code ?? string.Empty)
            .Trim()
            .Split('-')[0]
            .Trim()
            .ToUpperInvariant();
    }


    private static string[] NumberParts
    (
        string? code
    )
    {
        string[] parts =
            (code ?? string.Empty)
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

        return parts.Length > 1
            ? parts.Skip(1).ToArray()
            : Array.Empty<string>();
    }


    // True when the child has the parent's prefix and its leading
    // number parts equal the parent's (MB-001-002 under MB-001).
    private static bool CodeFollowsParent
    (
        string? parentCode,
        string? childCode
    )
    {
        if
        (
            Prefix(parentCode) != Prefix(childCode)
        )
        {
            return false;
        }

        string[] parent =
            NumberParts(parentCode);

        string[] child =
            NumberParts(childCode);

        if
        (
            parent.Length == 0
            ||
            child.Length != parent.Length + 1
        )
        {
            return false;
        }

        for
        (
            int i = 0;
            i < parent.Length;
            i++
        )
        {
            if
            (
                !int.TryParse(parent[i], out int p)
                ||
                !int.TryParse(child[i], out int c)
                ||
                p != c
            )
            {
                return false;
            }
        }

        return true;
    }


    //===========================================================
    // Get Issues (link check)
    //
    // Categories     : unknown Category Type, code prefix ≠ type,
    //                  INV / WIP / COGS account group missing
    // Sub Categories : category missing / deleted, code ≠ category
    //                  numbers, INV / WIP / COGS sub group missing
    // Products       : sub category missing / deleted, category ≠
    //                  sub category's category, product under a
    //                  category of another type, code ≠ sub category
    //                  numbers, INV / WIP / COGS ledger missing
    //===========================================================

    public async Task<List<ChartOfInventoryIssueDto>>
        GetIssuesAsync()
    {
        List<ChartOfInventoryIssueDto> issues =
            new List<ChartOfInventoryIssueDto>();

        Dictionary<long, CategoryRow> categories =
            (await LoadCategoriesAsync())
                .ToDictionary(x => x.Id);

        List<SubCategoryRow> subCategoryList =
            await LoadSubCategoriesAsync();

        Dictionary<long, SubCategoryRow> subCategories =
            subCategoryList
                .ToDictionary(x => x.Id);


        //=======================================================
        // Live account codes (groups / sub groups / ledgers)
        //=======================================================

        HashSet<string> groupCodes =
            (
                await _context
                    .Set<AccountGroupEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted)
                    .Select(x => x.GroupCode)
                    .ToListAsync()
            )
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        HashSet<string> subGroupCodes =
            (
                await _context
                    .Set<AccountSubGroupEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted)
                    .Select(x => x.SubGroupCode)
                    .ToListAsync()
            )
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        HashSet<string> ledgerCodes =
            (
                await _context
                    .Set<GeneralLedgersEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted)
                    .Select(x => x.LedgerCode)
                    .ToListAsync()
            )
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);


        // "INV-001-002" missing from the set → "INV (INV-001-002)"
        static List<string> Missing
        (
            HashSet<string> live,
            params (string Label, string Code)[] codes
        )
        {
            return codes
                .Where
                (
                    x =>
                        string.IsNullOrWhiteSpace(x.Code)
                        ||
                        !live.Contains(x.Code.Trim())
                )
                .Select
                (
                    x =>
                        string.IsNullOrWhiteSpace(x.Code)
                            ? $"{x.Label} (not set)"
                            : $"{x.Label} ({x.Code})"
                )
                .ToList();
        }


        //=======================================================
        // Categories
        //=======================================================

        foreach
        (
            CategoryRow cat
            in categories.Values
        )
        {
            TypeDef? type =
                TypeOf(
                    cat.CategoryType);

            if
            (
                type == null
            )
            {
                issues.Add(
                    Issue(
                        "Category",
                        cat.Id,
                        cat.Code,
                        cat.Name,
                        $"Category Type '{cat.CategoryType}' is not Motor Bikes, Spare Parts or Accessories, so it is not shown in the tree."));

                continue;
            }

            if
            (
                Prefix(cat.Code) != type.Code
            )
            {
                issues.Add(
                    Issue(
                        "Category",
                        cat.Id,
                        cat.Code,
                        cat.Name,
                        $"Code does not start with {type.Code} ({type.Name})."));
            }

            List<string> missingGroups =
                Missing(
                    groupCodes,
                    ("INV", cat.InventoryGroupCode),
                    ("WIP", cat.WipGroupCode),
                    ("COGS", cat.CogsGroupCode));

            if
            (
                missingGroups.Count > 0
            )
            {
                issues.Add(
                    Issue(
                        "Category",
                        cat.Id,
                        cat.Code,
                        cat.Name,
                        $"Account group missing or deleted : {string.Join(", ", missingGroups)}."));
            }
        }


        //=======================================================
        // Sub Categories
        //=======================================================

        foreach
        (
            SubCategoryRow sub
            in subCategoryList
        )
        {
            if
            (
                !categories.TryGetValue(
                    sub.CategoryId,
                    out CategoryRow? cat)
            )
            {
                issues.Add(
                    Issue(
                        "Sub Category",
                        sub.Id,
                        sub.Code,
                        sub.Name,
                        "Its Product Category is missing or deleted, so it is not shown in the tree."));

                continue;
            }

            if
            (
                !CodeFollowsParent(
                    cat.Code,
                    sub.Code)
            )
            {
                issues.Add(
                    Issue(
                        "Sub Category",
                        sub.Id,
                        sub.Code,
                        sub.Name,
                        $"Code does not follow its category {cat.Code}."));
            }

            List<string> missingSubGroups =
                Missing(
                    subGroupCodes,
                    ("INV", sub.InventorySubGroupCode),
                    ("WIP", sub.WipSubGroupCode),
                    ("COGS", sub.CogsSubGroupCode));

            if
            (
                missingSubGroups.Count > 0
            )
            {
                issues.Add(
                    Issue(
                        "Sub Category",
                        sub.Id,
                        sub.Code,
                        sub.Name,
                        $"Account sub group missing or deleted : {string.Join(", ", missingSubGroups)}."));
            }
        }


        //=======================================================
        // Products (every registered source)
        //=======================================================

        foreach
        (
            ChartOfInventoryDto product
            in await LoadProductsAsync(null)
        )
        {
            string level =
                $"Product ({product.ItemType})";

            if
            (
                !subCategories.TryGetValue(
                    product.SubCategoryId,
                    out SubCategoryRow? sub)
            )
            {
                issues.Add(
                    Issue(
                        level,
                        product.Id,
                        product.Code,
                        product.Name,
                        "Its Product Sub Category is missing or deleted, so it is not shown in the tree."));

                continue;
            }

            if
            (
                product.CategoryId != sub.CategoryId
            )
            {
                issues.Add(
                    Issue(
                        level,
                        product.Id,
                        product.Code,
                        product.Name,
                        $"Saved under another category than its sub category {sub.Code}."));
            }

            if
            (
                categories.TryGetValue(
                    sub.CategoryId,
                    out CategoryRow? cat)
                &&
                TypeOf(cat.CategoryType) is TypeDef type
                &&
                type.ItemType != product.ItemType
            )
            {
                issues.Add(
                    Issue(
                        level,
                        product.Id,
                        product.Code,
                        product.Name,
                        $"A {product.ItemType} under {cat.Code}, a {type.Name} category."));
            }

            if
            (
                !CodeFollowsParent(
                    sub.Code,
                    product.Code)
            )
            {
                issues.Add(
                    Issue(
                        level,
                        product.Id,
                        product.Code,
                        product.Name,
                        $"Code does not follow its sub category {sub.Code} ({sub.Name})."));
            }

            List<string> missingLedgers =
                Missing(
                    ledgerCodes,
                    ("INV", product.InventoryLedger),
                    ("WIP", product.WipLedger),
                    ("COGS", product.CogsLedger));

            if
            (
                missingLedgers.Count > 0
            )
            {
                issues.Add(
                    Issue(
                        level,
                        product.Id,
                        product.Code,
                        product.Name,
                        $"General ledger missing or deleted : {string.Join(", ", missingLedgers)}."));
            }
        }


        return issues;
    }


    private static ChartOfInventoryIssueDto Issue
    (
        string level,
        long id,
        string code,
        string name,
        string problem
    )
    {
        return new ChartOfInventoryIssueDto
        {
            Level = level,
            Id = id,
            Code = code ?? string.Empty,
            Name = name ?? string.Empty,
            Problem = problem
        };
    }


    //===========================================================
    // Sub Category Exists
    //===========================================================

    public async Task<bool>
        SubCategoryExistsAsync
        (
            long subCategoryId
        )
    {
        return await _context
            .Set<ProductSubCategoryEntity>()
            .AnyAsync
            (
                x =>
                    x.ProductSubCategoryId == subCategoryId
                    &&
                    !x.IsDeleted
            );
    }
}