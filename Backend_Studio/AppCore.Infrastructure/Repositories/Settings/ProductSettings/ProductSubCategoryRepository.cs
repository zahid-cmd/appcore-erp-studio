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

using AppCore.Infrastructure.Persistence;
using AppCore.Domain.Common;
using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ProductSettings;


//===============================================================
// Product Sub Category Repository
//===============================================================

public class ProductSubCategoryRepository :
    IProductSubCategoryRepository
{
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
                        //===================================================
                        // Primary Key
                        //===================================================

                        ProductSubCategoryId =
                            x.ProductSubCategoryId,

                        //===================================================
                        // Product Category
                        //===================================================

                        ProductCategoryId =
                            x.ProductCategoryId,

                        //===================================================
                        // Basic Information
                        //===================================================

                        SubCategoryCode =
                            x.SubCategoryCode,

                        SubCategoryName =
                            x.SubCategoryName,

                        //===================================================
                        // Inventory Sub Group
                        //===================================================

                        InventorySubGroupCode =
                            x.InventorySubGroupCode,

                        InventorySubGroupName =
                            x.InventorySubGroupName,

                        //===================================================
                        // WIP Sub Group
                        //===================================================

                        WipSubGroupCode =
                            x.WipSubGroupCode,

                        WipSubGroupName =
                            x.WipSubGroupName,

                        //===================================================
                        // COGS Sub Group
                        //===================================================

                        CogsSubGroupCode =
                            x.CogsSubGroupCode,

                        CogsSubGroupName =
                            x.CogsSubGroupName,

                        //===================================================
                        // Configuration
                        //===================================================

                        SubCategoryCreationAllowed =
                            x.SubCategoryCreationAllowed,

                        Remarks =
                            x.Remarks,

                        //===================================================
                        // Status
                        //===================================================

                        IsActive =
                            x.IsActive,

                        //===================================================
                        // Soft Delete
                        //===================================================

                        IsDeleted =
                            x.IsDeleted,

                        DeletedBy =
                            x.DeletedBy,

                        DeletedDate =
                            x.DeletedDate,

                        //===================================================
                        // Audit
                        //===================================================

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
    // Get Next Product Sub Category Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync
    (
        long productCategoryId
    )
    {
        //=======================================================
        // Resolve Product Category
        //=======================================================

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

        //=======================================================
        // Resolve Product Category Sequence
        //=======================================================

        string categoryCode =
            category.CategoryCode;

        string[] categoryParts =
            categoryCode.Split
            (
                '-',
                StringSplitOptions.RemoveEmptyEntries
            );

        if
        (
            categoryParts.Length !=
            3
            ||
            !string.Equals
            (
                categoryParts[0].Trim(),
                "CAT",
                StringComparison.OrdinalIgnoreCase
            )
            ||
            !int.TryParse
            (
                categoryParts[1].Trim(),
                out int inventoryClassSequenceNo
            )
            ||
            !int.TryParse
            (
                categoryParts[2].Trim(),
                out int categorySequenceNo
            )
            ||
            inventoryClassSequenceNo < 1
            ||
            categorySequenceNo < 1
        )
        {
            throw new InvalidOperationException(
                $"Invalid Product Category code '{categoryCode}'.");
        }

        //=======================================================
        // Existing Product Sub Category Codes
        //=======================================================

        List<string> existingCodes =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductCategoryId ==
                        productCategoryId
                        &&
                        !x.IsDeleted
                )
                .Select
                (
                    x =>
                        x.SubCategoryCode
                )
                .ToListAsync();

        //=======================================================
        // Resolve Highest Sub Category Sequence
        //=======================================================

        int highestSequenceNo =
            0;

        foreach
        (
            string code
            in existingCodes
        )
        {
            if
            (
                string.IsNullOrWhiteSpace(code)
            )
            {
                continue;
            }

            string[] parts =
                code.Split
                (
                    '-',
                    StringSplitOptions.RemoveEmptyEntries
                );

            if
            (
                parts.Length !=
                4
            )
            {
                continue;
            }

            if
            (
                !string.Equals
                (
                    parts[0].Trim(),
                    "SCG",
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                continue;
            }

            if
            (
                !int.TryParse
                (
                    parts[1].Trim(),
                    out int existingInventoryClassSequenceNo
                )
            )
            {
                continue;
            }

            if
            (
                existingInventoryClassSequenceNo !=
                inventoryClassSequenceNo
            )
            {
                continue;
            }

            if
            (
                !int.TryParse
                (
                    parts[2].Trim(),
                    out int existingCategorySequenceNo
                )
            )
            {
                continue;
            }

            if
            (
                existingCategorySequenceNo !=
                categorySequenceNo
            )
            {
                continue;
            }

            if
            (
                !int.TryParse
                (
                    parts[3].Trim(),
                    out int sequenceNo
                )
                ||
                sequenceNo < 1
            )
            {
                continue;
            }

            if
            (
                sequenceNo >
                highestSequenceNo
            )
            {
                highestSequenceNo =
                    sequenceNo;
            }
        }

        //=======================================================
        // Generate Next Product Sub Category Code
        //=======================================================

        int nextSequenceNo =
            highestSequenceNo +
            1;

        return CodeGenerator.GenerateProductSubCategoryCode(
            inventoryClassSequenceNo,
            categorySequenceNo,
            nextSequenceNo);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<ProductSubCategoryDefaultsDto>
        GetDefaultsAsync
    (
        long productCategoryId
    )
    {
        //=======================================================
        // Generate Product Sub Category Code
        //=======================================================

        string subCategoryCode =
            await GetNextCodeAsync(
                productCategoryId);

        //=======================================================
        // Resolve Product Sub Category Sequence
        //=======================================================

        string[] parts =
            subCategoryCode.Split
            (
                '-',
                StringSplitOptions.RemoveEmptyEntries
            );

        if
        (
            parts.Length !=
            4
        )
        {
            throw new InvalidOperationException(
                "Invalid Product Sub Category code generated.");
        }

        if
        (
            !int.TryParse
            (
                parts[1].Trim(),
                out int inventoryClassSequenceNo
            )
            ||
            !int.TryParse
            (
                parts[2].Trim(),
                out int categorySequenceNo
            )
            ||
            !int.TryParse
            (
                parts[3].Trim(),
                out int subCategorySequenceNo
            )
            ||
            inventoryClassSequenceNo < 1
            ||
            categorySequenceNo < 1
            ||
            subCategorySequenceNo < 1
        )
        {
            throw new InvalidOperationException(
                "Invalid Product Sub Category code generated.");
        }

        //=======================================================
        // Return Defaults
        //=======================================================

        return new ProductSubCategoryDefaultsDto
        {
            Code =
                subCategoryCode,

            InventorySubGroupCode =
                CodeGenerator.GenerateInventorySubCategoryCode(
                    inventoryClassSequenceNo,
                    categorySequenceNo,
                    subCategorySequenceNo),

            WipSubGroupCode =
                CodeGenerator.GenerateWipSubCategoryCode(
                    inventoryClassSequenceNo,
                    categorySequenceNo,
                    subCategorySequenceNo),

            CogsSubGroupCode =
                CodeGenerator.GenerateCogsSubCategoryCode(
                    inventoryClassSequenceNo,
                    categorySequenceNo,
                    subCategorySequenceNo)
        };
    }


//===========================================================
// Ensure Inventory Account Sub Groups
//===========================================================

private async Task<bool>
    EnsureInventoryAccountSubGroupsAsync
    (
        ProductSubCategoryEntity entity,
        long userId
    )
{
    string[] accountClassCodes =
    {
        "INV-001",
        "INV-002",
        "INV-003"
    };

    List<AccountClassEntity> accountClasses =
        await _context
            .Set<AccountClassEntity>()
            .Where
            (
                x =>
                    accountClassCodes.Contains(
                        x.ClassCode)
                    &&
                    !x.IsDeleted
            )
            .ToListAsync();

    var definitions =
        new[]
        {
            new
            {
                ClassCode = "INV-001",
                GroupCode = entity.InventorySubGroupCode,
                GroupName = entity.InventorySubGroupName
            },
            new
            {
                ClassCode = "INV-002",
                GroupCode = entity.WipSubGroupCode,
                GroupName = entity.WipSubGroupName
            },
            new
            {
                ClassCode = "INV-003",
                GroupCode = entity.CogsSubGroupCode,
                GroupName = entity.CogsSubGroupName
            }
        };

    bool changed =
        false;

    foreach
    (
        var definition
        in definitions
    )
    {
        AccountClassEntity? accountClass =
            accountClasses.FirstOrDefault
            (
                x =>
                    string.Equals
                    (
                        x.ClassCode,
                        definition.ClassCode,
                        StringComparison.OrdinalIgnoreCase
                    )
            );

        if
        (
            accountClass ==
            null
        )
        {
            throw new KeyNotFoundException(
                $"Inventory Account Class '{definition.ClassCode}' not found.");
        }

        if
        (
            !accountClass.IsActive
        )
        {
            throw new InvalidOperationException(
                $"Inventory Account Class '{definition.ClassCode}' is inactive.");
        }

        if
        (
            string.IsNullOrWhiteSpace(
                definition.GroupCode)
        )
        {
            throw new InvalidOperationException(
                $"Generated Account Sub Group code is missing for {definition.ClassCode}.");
        }

        string[] codeParts =
            definition.GroupCode.Split
            (
                '-',
                StringSplitOptions.RemoveEmptyEntries
            );

        if
        (
            codeParts.Length !=
            4
        )
        {
            throw new InvalidOperationException(
                $"Invalid Account Sub Group code '{definition.GroupCode}'.");
        }

        if
        (
            !int.TryParse
            (
                codeParts[2],
                out int categorySequenceNo
            )
            ||
            categorySequenceNo < 1
        )
        {
            throw new InvalidOperationException(
                $"Invalid Product Category sequence in Account Sub Group code '{definition.GroupCode}'.");
        }

        string accountGroupCode =
            $"{definition.ClassCode}-{categorySequenceNo:D3}";

        AccountGroupEntity? accountGroup =
            await _context
                .Set<AccountGroupEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.GroupCode ==
                        accountGroupCode
                        &&
                        !x.IsDeleted
                );

        if
        (
            accountGroup ==
            null
        )
        {
            throw new KeyNotFoundException(
                $"Account Group '{accountGroupCode}' not found.");
        }

        if
        (
            accountGroup.AccountClassId !=
            accountClass.AccountClassId
        )
        {
            throw new InvalidOperationException(
                $"Account Group '{accountGroupCode}' belongs to a different Account Class.");
        }

        if
        (
            !accountGroup.IsActive
        )
        {
            accountGroup.IsActive =
                true;

            accountGroup.ModifiedBy =
                userId;

            accountGroup.ModifiedDate =
                DateTime.UtcNow;

            changed =
                true;
        }

        AccountSubGroupEntity? subGroup =
            await _context
                .Set<AccountSubGroupEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.SubGroupCode ==
                        definition.GroupCode
                        &&
                        !x.IsDeleted
                );

        if
        (
            subGroup ==
            null
        )
        {
            subGroup =
                new AccountSubGroupEntity
                {
                    AccountClassId =
                        accountClass.AccountClassId,

                    AccountGroupId =
                        accountGroup.AccountGroupId,

                    ClassCode =
                        accountClass.ClassCode,

                    Mode =
                        accountClass.Mode,

                    GroupCode =
                        accountGroup.GroupCode,

                    SubGroupCode =
                        definition.GroupCode,

                    SubGroupName =
                        definition.GroupName?.Trim()
                        ??
                        string.Empty,

                    AllowManualLedger =
                        false,

                    Remarks =
                        "System generated from Product Sub Category.",

                    IsActive =
                        true,

                    IsDeleted =
                        false,

                    CreatedBy =
                        userId,

                    CreatedDate =
                        DateTime.UtcNow
                };

            _context
                .Set<AccountSubGroupEntity>()
                .Add(subGroup);

            changed =
                true;

            continue;
        }

        if
        (
            subGroup.AccountClassId !=
            accountClass.AccountClassId
        )
        {
            throw new InvalidOperationException(
                $"Account Sub Group '{definition.GroupCode}' belongs to a different Account Class.");
        }

        if
        (
            subGroup.AccountGroupId !=
            accountGroup.AccountGroupId
        )
        {
            throw new InvalidOperationException(
                $"Account Sub Group '{definition.GroupCode}' belongs to a different Account Group.");
        }

        string subGroupName =
            definition.GroupName?.Trim()
            ??
            string.Empty;

        bool groupChanged =
            false;

        if
        (
            subGroup.SubGroupName !=
            subGroupName
        )
        {
            subGroup.SubGroupName =
                subGroupName;

            groupChanged =
                true;
        }

        if
        (
            subGroup.ClassCode !=
            accountClass.ClassCode
        )
        {
            subGroup.ClassCode =
                accountClass.ClassCode;

            groupChanged =
                true;
        }

        if
        (
            subGroup.Mode !=
            accountClass.Mode
        )
        {
            subGroup.Mode =
                accountClass.Mode;

            groupChanged =
                true;
        }

        if
        (
            subGroup.GroupCode !=
            accountGroup.GroupCode
        )
        {
            subGroup.GroupCode =
                accountGroup.GroupCode;

            groupChanged =
                true;
        }

        if
        (
            subGroup.IsDeleted
        )
        {
            subGroup.IsDeleted =
                false;

            subGroup.DeletedBy =
                null;

            subGroup.DeletedDate =
                null;

            groupChanged =
                true;
        }

        if
        (
            !subGroup.IsActive
        )
        {
            subGroup.IsActive =
                true;

            groupChanged =
                true;
        }

        if
        (
            groupChanged
        )
        {
            subGroup.ModifiedBy =
                userId;

            subGroup.ModifiedDate =
                DateTime.UtcNow;

            changed =
                true;
        }
    }

    return changed;
}

    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateProductSubCategoryDto dto,
            long userId
        )
    {
        //=======================================================
        // Resolve Product Category
        //=======================================================

        ProductCategoryEntity? category =
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
            category ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Product Category not found.");
        }

        //=======================================================
        // Validate Sub Category Name
        //=======================================================

        string subCategoryName =
            dto.SubCategoryName?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(
                subCategoryName)
        )
        {
            throw new InvalidOperationException(
                "Product Sub Category Name is required.");
        }

        //=======================================================
        // Check Duplicate Sub Category Name
        //=======================================================

        bool subCategoryExists =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AnyAsync
                (
                    x =>
                        x.ProductCategoryId ==
                        dto.ProductCategoryId
                        &&
                        !x.IsDeleted
                        &&
                        x.SubCategoryName.ToLower() ==
                        subCategoryName.ToLower()
                );

        if
        (
            subCategoryExists
        )
        {
            throw new InvalidOperationException(
                "Product Sub Category already exists under this Product Category.");
        }

        //=======================================================
        // Generate Product Sub Category Codes
        //=======================================================

        ProductSubCategoryDefaultsDto defaults =
            await GetDefaultsAsync(
                dto.ProductCategoryId);

        //=======================================================
        // Generate Product Sub Category Entity
        //=======================================================

        ProductSubCategoryEntity entity =
            new ProductSubCategoryEntity
            {
                ProductCategoryId =
                    dto.ProductCategoryId,

                //===================================================
                // Basic Information
                //===================================================

                SubCategoryCode =
                    defaults.Code,

                SubCategoryName =
                    subCategoryName,

                //===================================================
                // Inventory Sub Group
                //===================================================

                InventorySubGroupCode =
                    defaults.InventorySubGroupCode,

                InventorySubGroupName =
                    dto.InventorySubGroupName?.Trim()
                    ??
                    string.Empty,

                //===================================================
                // WIP Sub Group
                //===================================================

                WipSubGroupCode =
                    defaults.WipSubGroupCode,

                WipSubGroupName =
                    dto.WipSubGroupName?.Trim()
                    ??
                    string.Empty,

                //===================================================
                // COGS Sub Group
                //===================================================

                CogsSubGroupCode =
                    defaults.CogsSubGroupCode,

                CogsSubGroupName =
                    dto.CogsSubGroupName?.Trim()
                    ??
                    string.Empty,

                //===================================================
                // Configuration
                //===================================================

                SubCategoryCreationAllowed =
                    dto.SubCategoryCreationAllowed,

                Remarks =
                    dto.Remarks?.Trim()
                    ??
                    string.Empty,

                //===================================================
                // Status
                //===================================================

                IsActive =
                    dto.IsActive,

                IsDeleted =
                    false,

                //===================================================
                // Audit
                //===================================================

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };

        //=======================================================
        // Save Product Sub Category and Inventory Sub Groups
        //=======================================================

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            _context
                .Set<ProductSubCategoryEntity>()
                .Add(entity);

            await _context.SaveChangesAsync();

            await EnsureInventoryAccountSubGroupsAsync(
                entity,
                userId);

            //=======================================================
            // Activity History
            //=======================================================

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
                        "Create",

                    ActivityTitle =
                        "Product Sub Category Created",

                    ActivityDescription =
                        $"Product Sub Category '{entity.SubCategoryName}' created.",

                    PerformedBy =
                        userId,

                    PerformedByName =
                        "System",

                    PerformedDate =
                        DateTime.UtcNow
                }
            );

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return entity.ProductSubCategoryId;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateProductSubCategoryDto dto,
            long userId
        )
    {
        //=======================================================
        // Resolve Product Sub Category
        //=======================================================

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

        //=======================================================
        // Resolve Product Category
        //=======================================================

        ProductCategoryEntity? category =
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
            category ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Product Category not found.");
        }

        //=======================================================
        // Validate Sub Category Name
        //=======================================================

        string subCategoryName =
            dto.SubCategoryName?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(
                subCategoryName)
        )
        {
            throw new InvalidOperationException(
                "Product Sub Category Name is required.");
        }

        //=======================================================
        // Check Duplicate Sub Category Name
        //=======================================================

        bool subCategoryExists =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AnyAsync
                (
                    x =>
                        x.ProductSubCategoryId !=
                        dto.ProductSubCategoryId
                        &&
                        x.ProductCategoryId ==
                        dto.ProductCategoryId
                        &&
                        !x.IsDeleted
                        &&
                        x.SubCategoryName.ToLower() ==
                        subCategoryName.ToLower()
                );

        if
        (
            subCategoryExists
        )
        {
            throw new InvalidOperationException(
                "Product Sub Category already exists under this Product Category.");
        }

        //=======================================================
        // Resolve Codes
        //=======================================================

        if
        (
            entity.ProductCategoryId !=
            dto.ProductCategoryId
        )
        {
            ProductSubCategoryDefaultsDto defaults =
                await GetDefaultsAsync(
                    dto.ProductCategoryId);

            entity.SubCategoryCode =
                defaults.Code;

            entity.InventorySubGroupCode =
                defaults.InventorySubGroupCode;

            entity.WipSubGroupCode =
                defaults.WipSubGroupCode;

            entity.CogsSubGroupCode =
                defaults.CogsSubGroupCode;
        }

        //=======================================================
        // Update Entity
        //=======================================================

        entity.ProductCategoryId =
            dto.ProductCategoryId;

        entity.SubCategoryName =
            subCategoryName;

        entity.InventorySubGroupName =
            dto.InventorySubGroupName?.Trim()
            ??
            string.Empty;

        entity.WipSubGroupName =
            dto.WipSubGroupName?.Trim()
            ??
            string.Empty;

        entity.CogsSubGroupName =
            dto.CogsSubGroupName?.Trim()
            ??
            string.Empty;

        //=======================================================
        // Configuration
        //=======================================================

        entity.SubCategoryCreationAllowed =
            dto.SubCategoryCreationAllowed;

        entity.Remarks =
            dto.Remarks?.Trim()
            ??
            string.Empty;

        //=======================================================
        // Status
        //=======================================================

        entity.IsActive =
            dto.IsActive;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await EnsureInventoryAccountSubGroupsAsync(
            entity,
            userId);

        await _context.SaveChangesAsync();

        //=======================================================
        // Activity History
        //=======================================================

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
                    "Update",

                ActivityTitle =
                    "Product Sub Category Updated",

                ActivityDescription =
                    $"Product Sub Category '{entity.SubCategoryName}' updated.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Delete
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        //=======================================================
        // Resolve Product Sub Category
        //=======================================================

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

        //=======================================================
        // Soft Delete Product Sub Category
        //=======================================================

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            DateTime.UtcNow;

        //=======================================================
        // Delete Generated Inventory Account Sub Groups
        //=======================================================

        List<string> generatedSubGroupCodes =
            new List<string>
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
            .Distinct(
                StringComparer.OrdinalIgnoreCase)
            .ToList();

        List<AccountSubGroupEntity> generatedSubGroups =
            await _context
                .Set<AccountSubGroupEntity>()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        generatedSubGroupCodes.Contains(
                            x.SubGroupCode)
                )
                .ToListAsync();

        foreach
        (
            AccountSubGroupEntity group
            in generatedSubGroups
        )
        {
            group.IsDeleted =
                true;

            group.DeletedBy =
                userId;

            group.DeletedDate =
                DateTime.UtcNow;

            group.ModifiedBy =
                userId;

            group.ModifiedDate =
                DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        //=======================================================
        // Activity History
        //=======================================================

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
                    "Delete",

                ActivityTitle =
                    "Product Sub Category Deleted",

                ActivityDescription =
                    $"Product Sub Category '{entity.SubCategoryName}' deleted.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        //=======================================================
        // Resolve Latest Deleted Product Sub Category
        //=======================================================

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

        //=======================================================
        // Restore Product Sub Category
        //=======================================================

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

        //=======================================================
        // Restore Generated Inventory Account Sub Groups
        //=======================================================

        List<string> generatedSubGroupCodes =
            new List<string>
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
            .Distinct(
                StringComparer.OrdinalIgnoreCase)
            .ToList();

        List<AccountSubGroupEntity> generatedSubGroups =
            await _context
                .Set<AccountSubGroupEntity>()
                .Where
                (
                    x =>
                        x.IsDeleted
                        &&
                        generatedSubGroupCodes.Contains(
                            x.SubGroupCode)
                )
                .ToListAsync();

        foreach
        (
            AccountSubGroupEntity group
            in generatedSubGroups
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

        //=======================================================
        // Activity History
        //=======================================================

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
                    "Restore",

                ActivityTitle =
                    "Product Sub Category Restored",

                ActivityDescription =
                    $"Product Sub Category '{entity.SubCategoryName}' restored.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );

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
