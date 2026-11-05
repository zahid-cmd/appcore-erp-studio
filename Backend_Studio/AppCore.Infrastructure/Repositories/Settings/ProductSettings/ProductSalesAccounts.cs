//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using AccountClassEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountClass;

using AccountGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using GeneralLedgersEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using VoucherEntriesEntity =
    AppCore.Domain.Platform.Accounting.VoucherEntries;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ProductSettings;


//===============================================================
// Product Sales Accounts (2026-11-04)
//
// The sales side of the product tree, one account per level, in
// the sales class of the Category Type (found by CODE only):
//
//   Motor Bikes                 CLS-005 Motor Bike Sales
//   Spare Parts, Lubricants     CLS-006 Spare Parts Sale
//   Accessories                 CLS-008 Accessories Sale
//
//   Product Category      Account Group      GRP-ccc-ggg
//   Product Sub Category  Account Sub Group  SUB-ccc-ggg-sss
//   Product (MB/SP/AC)    General Ledger     GLR-ccc-ggg-sss-nnnnn
//
// ccc = the sales class number; ggg / sss / nnnnn are taken
// from the record's INV code, so a product's INV / WIP / COGS
// and Sales ledgers carry the same numbers.
//
// Names : "Sales - <Category / Sub Category name>" and
//         "Sales - <product name as in its INV ledger>".
//
// Each account follows its record : name, active, deleted /
// restored. No manual sub groups / ledgers under them. A
// product cannot be deleted once its sales ledger has postings.
//
// Called by the five product repositories right after their own
// inventory sync, inside the same transaction.
//===============================================================

public static class ProductSalesAccounts
{
    //===========================================================
    // Sales classes (by code only)
    //===========================================================

    public const string MotorBikeSalesClassCode =
        "CLS-005";

    public const string SparePartsSalesClassCode =
        "CLS-006";

    public const string AccessoriesSalesClassCode =
        "CLS-008";

    private const string NamePrefix =
        "Sales - ";

    private const int MaxNameLength =
        200;


    //===========================================================
    // Codes
    //===========================================================

    // The sales class of a Category Type ('' = none)
    public static string ClassCodeOf
    (
        string? categoryType
    )
    {
        string type =
            (categoryType ?? string.Empty)
                .Trim()
                .ToLowerInvariant();

        return type switch
        {
            "motor bikes" => MotorBikeSalesClassCode,
            "spare parts" => SparePartsSalesClassCode,
            "lubricants"  => SparePartsSalesClassCode,
            "accessories" => AccessoriesSalesClassCode,
            _             => string.Empty
        };
    }


    // INV-001-002-008-00001 + CLS-006 + "GLR" -> GLR-006-002-008-00001
    private static string FromInventoryCode
    (
        string prefix,
        string? categoryType,
        string? inventoryCode
    )
    {
        string classCode =
            ClassCodeOf(categoryType);

        string[] parts =
            (inventoryCode ?? string.Empty)
                .Trim()
                .ToUpperInvariant()
                .Split('-');

        string[] classParts =
            classCode.Split('-');

        if
        (
            classCode.Length == 0
            ||
            classParts.Length < 2
            ||
            parts.Length < 3
        )
        {
            return string.Empty;
        }

        return $"{prefix}-{classParts[1]}-{string.Join('-', parts.Skip(2))}";
    }


    public static string GroupCodeOf
    (
        string? categoryType,
        string? inventoryGroupCode
    )
    {
        return FromInventoryCode("GRP", categoryType, inventoryGroupCode);
    }


    public static string SubGroupCodeOf
    (
        string? categoryType,
        string? inventorySubGroupCode
    )
    {
        return FromInventoryCode("SUB", categoryType, inventorySubGroupCode);
    }


    public static string LedgerCodeOf
    (
        string? categoryType,
        string? inventoryLedgerCode
    )
    {
        return FromInventoryCode("GLR", categoryType, inventoryLedgerCode);
    }


    public static string NameOf
    (
        string? name
    )
    {
        string text =
            NamePrefix + (name ?? string.Empty).Trim();

        return text.Length > MaxNameLength
            ? text[..MaxNameLength]
            : text;
    }


    //===========================================================
    // Category -> Account Group
    //===========================================================

    public static async Task<AccountGroupEntity?>
        SyncCategoryAsync
        (
            AppDbContext context,
            ProductCategoryEntity category,
            long userId
        )
    {
        string code =
            GroupCodeOf(
                category.CategoryType,
                category.InventoryGroupCode);

        if (code.Length == 0)
        {
            return null;
        }

        category.SalesGroupCode =
            code;

        category.SalesGroupName =
            NameOf(category.CategoryName);

        AccountGroupEntity? group =
            await FindGroupAsync(
                context,
                code);

        if (group == null)
        {
            if (category.IsDeleted)
            {
                return null;
            }

            AccountClassEntity accountClass =
                await ResolveClassAsync(
                    context,
                    ClassCodeOf(category.CategoryType));

            group =
                new AccountGroupEntity
                {
                    AccountClassId = accountClass.AccountClassId,
                    ClassCode = accountClass.ClassCode,
                    Mode = accountClass.Mode,
                    GroupCode = code,
                    GroupName = category.SalesGroupName,
                    AllowManualSubGroup = false,
                    Remarks = $"System generated from Product Category {category.CategoryCode} (sales).",
                    IsActive = category.IsActive,
                    IsDeleted = false,
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow
                };

            context
                .Set<AccountGroupEntity>()
                .Add(group);

            // Its id is needed by the sub groups
            await context.SaveChangesAsync();

            return group;
        }

        DateTime now =
            DateTime.UtcNow;

        if
        (
            group.GroupName != category.SalesGroupName
            ||
            group.IsActive != category.IsActive
            ||
            group.IsDeleted != category.IsDeleted
        )
        {
            group.GroupName = category.SalesGroupName;
            group.IsActive = category.IsActive;

            if (category.IsDeleted && !group.IsDeleted)
            {
                group.IsDeleted = true;
                group.DeletedBy = userId;
                group.DeletedDate = now;
            }
            else if (!category.IsDeleted && group.IsDeleted)
            {
                group.IsDeleted = false;
                group.DeletedBy = null;
                group.DeletedDate = null;
            }

            group.ModifiedBy = userId;
            group.ModifiedDate = now;
        }

        return group;
    }


    //===========================================================
    // Sub Category -> Account Sub Group
    //===========================================================

    public static async Task<AccountSubGroupEntity?>
        SyncSubCategoryAsync
        (
            AppDbContext context,
            ProductSubCategoryEntity subCategory,
            long userId
        )
    {
        ProductCategoryEntity? category =
            await context
                .Set<ProductCategoryEntity>()
                .FirstOrDefaultAsync(
                    x => x.ProductCategoryId == subCategory.ProductCategoryId);

        if (category == null)
        {
            return null;
        }

        string code =
            SubGroupCodeOf(
                category.CategoryType,
                subCategory.InventorySubGroupCode);

        if (code.Length == 0)
        {
            return null;
        }

        subCategory.SalesSubGroupCode =
            code;

        subCategory.SalesSubGroupName =
            NameOf(subCategory.SubCategoryName);

        AccountSubGroupEntity? subGroup =
            await FindSubGroupAsync(
                context,
                code);

        if (subGroup == null)
        {
            if (subCategory.IsDeleted)
            {
                return null;
            }

            AccountGroupEntity? group =
                await SyncCategoryAsync(
                    context,
                    category,
                    userId);

            if (group == null || group.IsDeleted)
            {
                return null;
            }

            subGroup =
                new AccountSubGroupEntity
                {
                    AccountClassId = group.AccountClassId,
                    AccountGroupId = group.AccountGroupId,
                    ClassCode = group.ClassCode,
                    Mode = group.Mode,
                    GroupCode = group.GroupCode,
                    SubGroupCode = code,
                    SubGroupName = subCategory.SalesSubGroupName,
                    AllowManualLedger = false,
                    Remarks = $"System generated from Product Sub Category {subCategory.SubCategoryCode} (sales).",
                    IsActive = subCategory.IsActive,
                    IsDeleted = false,
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow
                };

            context
                .Set<AccountSubGroupEntity>()
                .Add(subGroup);

            // Its id is needed by the ledgers
            await context.SaveChangesAsync();

            return subGroup;
        }

        DateTime now =
            DateTime.UtcNow;

        if
        (
            subGroup.SubGroupName != subCategory.SalesSubGroupName
            ||
            subGroup.IsActive != subCategory.IsActive
            ||
            subGroup.IsDeleted != subCategory.IsDeleted
        )
        {
            subGroup.SubGroupName = subCategory.SalesSubGroupName;
            subGroup.IsActive = subCategory.IsActive;

            if (subCategory.IsDeleted && !subGroup.IsDeleted)
            {
                subGroup.IsDeleted = true;
                subGroup.DeletedBy = userId;
                subGroup.DeletedDate = now;
            }
            else if (!subCategory.IsDeleted && subGroup.IsDeleted)
            {
                subGroup.IsDeleted = false;
                subGroup.DeletedBy = null;
                subGroup.DeletedDate = null;
            }

            subGroup.ModifiedBy = userId;
            subGroup.ModifiedDate = now;
        }

        return subGroup;
    }


    //===========================================================
    // Product -> General Ledger
    //
    // Returns the sales ledger code for the product ('' when its
    // category has no sales class). Deleting is refused once the
    // ledger has postings.
    //===========================================================

    public static async Task<string>
        SyncProductAsync
        (
            AppDbContext context,
            long productSubCategoryId,
            string inventoryLedgerCode,
            string productCode,
            string sourceLabel,
            bool isActive,
            bool isDeleted,
            long userId
        )
    {
        ProductSubCategoryEntity? subCategory =
            await context
                .Set<ProductSubCategoryEntity>()
                .FirstOrDefaultAsync(
                    x => x.ProductSubCategoryId == productSubCategoryId);

        if (subCategory == null)
        {
            return string.Empty;
        }

        ProductCategoryEntity? category =
            await context
                .Set<ProductCategoryEntity>()
                .FirstOrDefaultAsync(
                    x => x.ProductCategoryId == subCategory.ProductCategoryId);

        if (category == null)
        {
            return string.Empty;
        }

        string code =
            LedgerCodeOf(
                category.CategoryType,
                inventoryLedgerCode);

        if (code.Length == 0)
        {
            return string.Empty;
        }

        GeneralLedgersEntity? ledger =
            await FindLedgerAsync(
                context,
                code);

        DateTime now =
            DateTime.UtcNow;

        //=======================================================
        // Delete : refused once the sales ledger is used
        //=======================================================

        if (isDeleted)
        {
            if (ledger != null && !ledger.IsDeleted)
            {
                bool posted =
                    await context
                        .Set<VoucherEntriesEntity>()
                        .AnyAsync(x => x.LedgerCode == code);

                if (posted)
                {
                    throw new InvalidOperationException(
                        $"{sourceLabel} {productCode} cannot be deleted : its sales ledger {code} has postings.");
                }

                ledger.IsDeleted = true;
                ledger.DeletedBy = userId;
                ledger.DeletedDate = now;
                ledger.IsActive = isActive;
                ledger.ModifiedBy = userId;
                ledger.ModifiedDate = now;
            }

            return code;
        }

        string name =
            NameOf(
                await InventoryNameAsync(
                    context,
                    inventoryLedgerCode,
                    productCode));

        if (ledger == null)
        {
            AccountSubGroupEntity? subGroup =
                await SyncSubCategoryAsync(
                    context,
                    subCategory,
                    userId);

            if (subGroup == null || subGroup.IsDeleted)
            {
                return string.Empty;
            }

            context
                .Set<GeneralLedgersEntity>()
                .Add(
                    new GeneralLedgersEntity
                    {
                        AccountClassId = subGroup.AccountClassId,
                        AccountGroupId = subGroup.AccountGroupId,
                        AccountSubGroupId = subGroup.AccountSubGroupId,
                        ClassCode = subGroup.ClassCode,
                        Mode = subGroup.Mode,
                        GroupCode = subGroup.GroupCode,
                        SubGroupCode = subGroup.SubGroupCode,
                        LedgerCode = code,
                        LedgerName = name,
                        Remarks = $"System generated from {sourceLabel} {productCode} (sales).",
                        IsActive = isActive,
                        IsDeleted = false,
                        CreatedBy = userId,
                        CreatedDate = now
                    });

            return code;
        }

        if
        (
            ledger.LedgerName != name
            ||
            ledger.IsActive != isActive
            ||
            ledger.IsDeleted
        )
        {
            ledger.LedgerName = name;
            ledger.IsActive = isActive;

            if (ledger.IsDeleted)
            {
                ledger.IsDeleted = false;
                ledger.DeletedBy = null;
                ledger.DeletedDate = null;
            }

            ledger.ModifiedBy = userId;
            ledger.ModifiedDate = now;
        }

        return code;
    }


    //===========================================================
    // Helpers
    //===========================================================

    private static async Task<AccountClassEntity>
        ResolveClassAsync
        (
            AppDbContext context,
            string classCode
        )
    {
        AccountClassEntity? accountClass =
            await context
                .Set<AccountClassEntity>()
                .FirstOrDefaultAsync(
                    x => x.ClassCode == classCode && !x.IsDeleted);

        if (accountClass == null)
        {
            throw new InvalidOperationException(
                $"Account Class {classCode} (sales) was not found. Create it on the Account Classes page first.");
        }

        if (!accountClass.IsActive)
        {
            throw new InvalidOperationException(
                $"Account Class {classCode} - {accountClass.ClassName} is inactive. Activate it first.");
        }

        return accountClass;
    }


    // Tracked first (added in this unit of work), then the database;
    // a live row is preferred over a deleted one
    private static async Task<AccountGroupEntity?>
        FindGroupAsync
        (
            AppDbContext context,
            string code
        )
    {
        AccountGroupEntity? local =
            context.Set<AccountGroupEntity>().Local
                .FirstOrDefault(x => x.GroupCode == code);

        return local
            ??
            await context
                .Set<AccountGroupEntity>()
                .Where(x => x.GroupCode == code)
                .OrderBy(x => x.IsDeleted)
                .FirstOrDefaultAsync();
    }


    private static async Task<AccountSubGroupEntity?>
        FindSubGroupAsync
        (
            AppDbContext context,
            string code
        )
    {
        AccountSubGroupEntity? local =
            context.Set<AccountSubGroupEntity>().Local
                .FirstOrDefault(x => x.SubGroupCode == code);

        return local
            ??
            await context
                .Set<AccountSubGroupEntity>()
                .Where(x => x.SubGroupCode == code)
                .OrderBy(x => x.IsDeleted)
                .FirstOrDefaultAsync();
    }


    private static async Task<GeneralLedgersEntity?>
        FindLedgerAsync
        (
            AppDbContext context,
            string code
        )
    {
        GeneralLedgersEntity? local =
            context.Set<GeneralLedgersEntity>().Local
                .FirstOrDefault(x => x.LedgerCode == code);

        return local
            ??
            await context
                .Set<GeneralLedgersEntity>()
                .Where(x => x.LedgerCode == code)
                .OrderBy(x => x.IsDeleted)
                .FirstOrDefaultAsync();
    }


    // The product's name as its INV ledger carries it, without the
    // "INV - " prefix (e.g. "BF-7001 - Front Mudguard")
    private static async Task<string>
        InventoryNameAsync
        (
            AppDbContext context,
            string inventoryLedgerCode,
            string productCode
        )
    {
        GeneralLedgersEntity? inventory =
            await FindLedgerAsync(
                context,
                inventoryLedgerCode);

        string name =
            (inventory?.LedgerName ?? string.Empty).Trim();

        int cut =
            name.IndexOf(" - ", StringComparison.Ordinal);

        if (cut > 0 && cut <= 6)
        {
            name = name[(cut + 3)..].Trim();
        }

        return name.Length > 0
            ? name
            : productCode;
    }
}
