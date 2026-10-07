//===============================================================

// Namespaces

//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.Settings.ProductSettings;
using AppCore.Application.Settings.ProductSettings.ProductCategory.DTOs;
using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;
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

// Product Category Repository

//===============================================================

public class ProductCategoryRepository :
    IProductCategoryRepository
{

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

                        //===================================================

                        // Primary Key

                        //===================================================

                        ProductCategoryId =
                            x.ProductCategoryId,

                        //===================================================

                        // Basic Information

                        //===================================================

                        CategoryCode =
                            x.CategoryCode,
                        CategoryName =
                            x.CategoryName,

                        //===================================================

                        // Inventory Group

                        //===================================================

                        InventoryGroupCode =
                            x.InventoryGroupCode,
                        InventoryGroupName =
                            x.InventoryGroupName,

                        //===================================================

                        // WIP Group

                        //===================================================

                        WipGroupCode =
                            x.WipGroupCode,
                        WipGroupName =
                            x.WipGroupName,

                        //===================================================

                        // COGS Group

                        //===================================================

                        CogsGroupCode =
                            x.CogsGroupCode,
                        CogsGroupName =
                            x.CogsGroupName,

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
    // Get Next Product Category Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync()
    {
        //=======================================================
        // Resolve Inventory Class Sequence
        //=======================================================

        string inventoryClassCode =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.ClassType ==
                        "Inventory Class"
                        &&
                        x.IsActive
                )
                .OrderBy
                (
                    x =>
                        x.ClassCode
                )
                .Select
                (
                    x =>
                        x.ClassCode
                )
                .FirstOrDefaultAsync()
                ??
                string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(
                inventoryClassCode
            )
        )
        {
            throw new InvalidOperationException(
                "Inventory Account Class was not found.");
        }

        string[] inventoryClassParts =
            inventoryClassCode.Split(
                '-',
                StringSplitOptions.RemoveEmptyEntries);

        if
        (
            inventoryClassParts.Length !=
            2
            ||
            !string.Equals(
                inventoryClassParts[0].Trim(),
                "INV",
                StringComparison.OrdinalIgnoreCase)
            ||
            !int.TryParse(
                inventoryClassParts[1].Trim(),
                out int resolvedInventoryClassSequenceNo)
            ||
            resolvedInventoryClassSequenceNo < 1
        )
        {
            throw new InvalidOperationException(
                "Invalid Inventory Account Class code.");
        }

        //=======================================================
        // Existing Product Category Codes
        //=======================================================

        List<string> existingCodes =
            await _context
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
                        x.CategoryCode
                )
                .ToListAsync();

        //=======================================================
        // Resolve Highest Category Sequence
        //=======================================================

        int highestCategorySequenceNo =
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
                code.Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

            if
            (
                parts.Length !=
                3
            )
            {
                continue;
            }

            if
            (
                !string.Equals(
                    parts[0].Trim(),
                    "CAT",
                    StringComparison.OrdinalIgnoreCase)
            )
            {
                continue;
            }

            if
            (
                !int.TryParse(
                    parts[1].Trim(),
                    out int categoryInventoryClassSequenceNo)
            )
            {
                continue;
            }

            if
            (
                categoryInventoryClassSequenceNo !=
                resolvedInventoryClassSequenceNo
            )
            {
                continue;
            }

            if
            (
                !int.TryParse(
                    parts[2].Trim(),
                    out int categorySequenceNo)
            )
            {
                continue;
            }

            if
            (
                categorySequenceNo >
                highestCategorySequenceNo
            )
            {
                highestCategorySequenceNo =
                    categorySequenceNo;
            }
        }

        //=======================================================
        // Generate Next Product Category Code
        //=======================================================

        int nextCategorySequenceNo =
            highestCategorySequenceNo +
            1;

        return CodeGenerator.GenerateProductCategoryCode(
            resolvedInventoryClassSequenceNo,
            nextCategorySequenceNo);
    }
    
    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<ProductCategoryDefaultsDto>
        GetDefaultsAsync()
    {
        //=======================================================
        // Generate Product Category Code
        //=======================================================

        string categoryCode =
            await GetNextCodeAsync();

        //=======================================================
        // Resolve Product Category Sequence
        //=======================================================

        int categorySequenceNo =
            1;

        string[] categoryParts =
            categoryCode.Split(
                '-',
                StringSplitOptions.RemoveEmptyEntries);

        if
        (
            categoryParts.Length ==
            3
            &&
            int.TryParse(
                categoryParts[2].Trim(),
                out int parsedSequenceNo)
            &&
            parsedSequenceNo >
            0
        )
        {
            categorySequenceNo =
                parsedSequenceNo;
        }

        //=======================================================
        // Generate Inventory Group Code
        //=======================================================

        string inventoryGroupCode =
            $"INV-001-{categorySequenceNo:D3}";

        //=======================================================
        // Generate WIP Group Code
        //=======================================================

        string wipGroupCode =
            $"INV-002-{categorySequenceNo:D3}";

        //=======================================================
        // Generate COGS Group Code
        //=======================================================

        string cogsGroupCode =
            $"INV-003-{categorySequenceNo:D3}";

        //=======================================================
        // Return Defaults
        //=======================================================

        return new ProductCategoryDefaultsDto
        {
            Code =
                categoryCode,
            InventoryGroupCode =
                inventoryGroupCode,
            WipGroupCode =
                wipGroupCode,
            CogsGroupCode =
                cogsGroupCode
        };
    }

    //===========================================================
    // Ensure Inventory Account Groups
    //===========================================================

    private async Task<bool>
        EnsureInventoryAccountGroupsAsync
        (
            ProductCategoryEntity entity,
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
        List<AccountGroupEntity> existingGroups =
            await _context
                .Set<AccountGroupEntity>()
                .Where
                (
                    x =>
                        new[]
                        {
                            entity.InventoryGroupCode,
                            entity.WipGroupCode,
                            entity.CogsGroupCode
                        }
                        .Contains(
                            x.GroupCode)
                )
                .ToListAsync();
        var groupDefinitions =
            new[]
            {
                new
                {
                    ClassCode = "INV-001",
                    GroupCode = entity.InventoryGroupCode,
                    GroupName = entity.InventoryGroupName
                },
                new
                {
                    ClassCode = "INV-002",
                    GroupCode = entity.WipGroupCode,
                    GroupName = entity.WipGroupName
                },
                new
                {
                    ClassCode = "INV-003",
                    GroupCode = entity.CogsGroupCode,
                    GroupName = entity.CogsGroupName
                }
            };
        bool changed = false;
        foreach
        (
            var definition
            in groupDefinitions
        )
        {
            if
            (
                string.IsNullOrWhiteSpace(
                    definition.GroupCode)
            )
            {
                throw new InvalidOperationException(
                    $"Generated Account Group code is missing for {definition.ClassCode}."
                );
            }
            AccountClassEntity? accountClass =
                accountClasses.FirstOrDefault
                (
                    x =>
                        string.Equals(
                            x.ClassCode,
                            definition.ClassCode,
                            StringComparison.OrdinalIgnoreCase)
                );
            if
            (
                accountClass ==
                null
            )
            {
                throw new KeyNotFoundException(
                    $"Inventory Account Class '{definition.ClassCode}' not found."
                );
            }
            if
            (
                !accountClass.IsActive
            )
            {
                throw new InvalidOperationException(
                    $"Inventory Account Class '{definition.ClassCode}' is inactive."
                );
            }
            AccountGroupEntity? group =
                existingGroups.FirstOrDefault
                (
                    x =>
                        string.Equals(
                            x.GroupCode,
                            definition.GroupCode,
                            StringComparison.OrdinalIgnoreCase)
                );
            bool groupChanged = false;
            if
            (
                group ==
                null
            )
            {
                group =
                    new AccountGroupEntity
                    {
                        AccountClassId =
                            accountClass.AccountClassId,
                        ClassCode =
                            accountClass.ClassCode,
                        Mode =
                            accountClass.Mode,
                        GroupCode =
                            definition.GroupCode,
                        GroupName =
                            definition.GroupName?.Trim()
                            ??
                            string.Empty,
                        AllowManualSubGroup =
                            false,
                        Remarks =
                            "System generated from Product Category.",
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
                    .Set<AccountGroupEntity>()
                    .Add(group);
                changed =
                    true;
                continue;
            }
            if
            (
                group.AccountClassId !=
                accountClass.AccountClassId
            )
            {
                throw new InvalidOperationException(
                    $"Account Group '{definition.GroupCode}' belongs to a different Account Class."
                );
            }
            string groupName =
                definition.GroupName?.Trim()
                ??
                string.Empty;
            if
            (
                group.GroupName !=
                groupName
            )
            {
                group.GroupName =
                    groupName;
                groupChanged =
                    true;
            }
            if
            (
                group.ClassCode !=
                accountClass.ClassCode
            )
            {
                group.ClassCode =
                    accountClass.ClassCode;
                groupChanged =
                    true;
            }
            if
            (
                group.Mode !=
                accountClass.Mode
            )
            {
                group.Mode =
                    accountClass.Mode;
                groupChanged =
                    true;
            }
            if
            (
                group.IsDeleted
            )
            {
                group.IsDeleted =
                    false;
                group.DeletedBy =
                    null;
                group.DeletedDate =
                    null;
                groupChanged =
                    true;
            }
            if
            (
                !group.IsActive
            )
            {
                group.IsActive =
                    true;
                groupChanged =
                    true;
            }
            if
            (
                groupChanged
            )
            {
                group.ModifiedBy =
                    userId;
                group.ModifiedDate =
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
            CreateProductCategoryDto dto,
            long userId
        )
    {

        //=======================================================

        // Generate Product Category Code

        //=======================================================

        string categoryCode =
            await GetNextCodeAsync();

        //=======================================================

        // Validate Category Name

        //=======================================================

        string categoryName =
            dto.CategoryName?.Trim()
            ??
            string.Empty;
        if
        (
            string.IsNullOrWhiteSpace(categoryName)
        )
        {
            throw new InvalidOperationException(
                "Product Category Name is required.");
        }

        //=======================================================

        // Check Duplicate Category Name

        //=======================================================

        bool categoryExists =
            await _context
                .Set<ProductCategoryEntity>()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.CategoryName.ToLower() ==
                        categoryName.ToLower()
                );
        if
        (
            categoryExists
        )
        {
            throw new InvalidOperationException(
                "Product Category already exists.");
        }

        //=======================================================

        // Generate Product Category Entity

        //=======================================================

        ProductCategoryEntity entity =
            new ProductCategoryEntity
            {

                //===================================================

                // Basic Information

                //===================================================

                CategoryCode =
                    categoryCode,
                CategoryName =
                    categoryName,

                //===================================================

                // Inventory Group

                //===================================================

                InventoryGroupCode =
                    dto.InventoryGroupCode?.Trim()
                    ??
                    string.Empty,
                InventoryGroupName =
                    dto.InventoryGroupName?.Trim()
                    ??
                    string.Empty,

                //===================================================

                // WIP Group

                //===================================================

                WipGroupCode =
                    dto.WipGroupCode?.Trim()
                    ??
                    string.Empty,
                WipGroupName =
                    dto.WipGroupName?.Trim()
                    ??
                    string.Empty,

                //===================================================

                // COGS Group

                //===================================================

                CogsGroupCode =
                    dto.CogsGroupCode?.Trim()
                    ??
                    string.Empty,
                CogsGroupName =
                    dto.CogsGroupName?.Trim()
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

        // Save Product Category and Inventory Groups

        //=======================================================

        await using var transaction =
            await _context.Database.BeginTransactionAsync();
        try
        {
            _context
                .Set<ProductCategoryEntity>()
                .Add(entity);
            await _context.SaveChangesAsync();
            await EnsureInventoryAccountGroupsAsync(
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
                        "Product Category",
                    EntityId =
                        entity.ProductCategoryId,
                    ActivityType =
                        "Create",
                    ActivityTitle =
                        "Product Category Created",
                    ActivityDescription =
                        $"Product Category '{entity.CategoryName}' created.",
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
            return entity.ProductCategoryId;
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
            UpdateProductCategoryDto dto,
            long userId
        )
    {

        //=======================================================

        // Resolve Product Category

        //=======================================================

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

        //=======================================================

        // Validate Category Name

        //=======================================================

        string categoryName =
            dto.CategoryName?.Trim()
            ??
            string.Empty;
        if
        (
            string.IsNullOrWhiteSpace(categoryName)
        )
        {
            throw new InvalidOperationException(
                "Product Category Name is required.");
        }

        //=======================================================

        // Check Duplicate Category Name

        //=======================================================

        bool categoryExists =
            await _context
                .Set<ProductCategoryEntity>()
                .AnyAsync
                (
                    x =>
                        x.ProductCategoryId !=
                        dto.ProductCategoryId
                        &&
                        !x.IsDeleted
                        &&
                        x.CategoryName.ToLower() ==
                        categoryName.ToLower()
                );
        if
        (
            categoryExists
        )
        {
            throw new InvalidOperationException(
                "Product Category already exists.");
        }

        //=======================================================

        // Update Entity

        //=======================================================

        entity.CategoryName =
            categoryName;
        entity.InventoryGroupCode =
            dto.InventoryGroupCode?.Trim()
            ??
            string.Empty;
        entity.InventoryGroupName =
            dto.InventoryGroupName?.Trim()
            ??
            string.Empty;
        entity.WipGroupCode =
            dto.WipGroupCode?.Trim()
            ??
            string.Empty;
        entity.WipGroupName =
            dto.WipGroupName?.Trim()
            ??
            string.Empty;
        entity.CogsGroupCode =
            dto.CogsGroupCode?.Trim()
            ??
            string.Empty;
        entity.CogsGroupName =
            dto.CogsGroupName?.Trim()
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
        await EnsureInventoryAccountGroupsAsync(
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
                    "Product Category",
                EntityId =
                    entity.ProductCategoryId,
                ActivityType =
                    "Update",
                ActivityTitle =
                    "Product Category Updated",
                ActivityDescription =
                    $"Product Category '{entity.CategoryName}' updated.",
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

        // Resolve Product Category

        //=======================================================

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

        // Soft Delete Product Category

        //=======================================================

        entity.IsDeleted =
            true;
        entity.DeletedBy =
            userId;
        entity.DeletedDate =
            DateTime.UtcNow;

        //=======================================================

        // Delete Generated Inventory Groups

        //=======================================================

        List<string> generatedGroupCodes =
            new List<string>
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
            .Distinct(
                StringComparer.OrdinalIgnoreCase)
            .ToList();
        List<AccountGroupEntity> generatedGroups =
            await _context
                .Set<AccountGroupEntity>()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        generatedGroupCodes.Contains(
                            x.GroupCode)
                )
                .ToListAsync();
        foreach
        (
            AccountGroupEntity group
            in generatedGroups
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
                    "Product Category",
                EntityId =
                    entity.ProductCategoryId,
                ActivityType =
                    "Delete",
                ActivityTitle =
                    "Product Category Deleted",
                ActivityDescription =
                    $"Product Category '{entity.CategoryName}' deleted.",
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

        // Resolve Latest Deleted Product Category

        //=======================================================

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

        //=======================================================

        // Restore Product Category

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

        // Restore Generated Inventory Groups

        //=======================================================

        List<string> generatedGroupCodes =
            new List<string>
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
            .Distinct(
                StringComparer.OrdinalIgnoreCase)
            .ToList();
        List<AccountGroupEntity> generatedGroups =
            await _context
                .Set<AccountGroupEntity>()
                .Where
                (
                    x =>
                        x.IsDeleted
                        &&
                        generatedGroupCodes.Contains(
                            x.GroupCode)
                )
                .ToListAsync();
        foreach
        (
            AccountGroupEntity group
            in generatedGroups
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
                    "Product Category",
                EntityId =
                    entity.ProductCategoryId,
                ActivityType =
                    "Restore",
                ActivityTitle =
                    "Product Category Restored",
                ActivityDescription =
                    $"Product Category '{entity.CategoryName}' restored.",
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
