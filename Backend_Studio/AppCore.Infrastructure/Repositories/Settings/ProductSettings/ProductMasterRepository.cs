//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ProductSettings;
using AppCore.Application.Settings.ProductSettings.ProductMaster.DTOs;

using ProductMasterEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductMaster;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using GeneralLedgersEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using AppCore.Infrastructure.Persistence;
using AppCore.Domain.Common;
using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ProductSettings;


//===============================================================
// Product Master Repository
//===============================================================

public class ProductMasterRepository :
    IProductMasterRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public ProductMasterRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Product Master Query
    //===========================================================

    private IQueryable<ProductMasterDto>
        ProductMasterQuery()
    {
        return _context
            .Set<ProductMasterEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new ProductMasterDto
                    {
                        //===================================================
                        // Primary Key
                        //===================================================

                        ProductMasterId =
                            x.ProductMasterId,

                        //===================================================
                        // Product Category
                        //===================================================

                        ProductCategoryId =
                            x.ProductCategoryId,

                        ProductCategoryName =
                            _context
                                .Set<ProductCategoryEntity>()
                                .Where
                                (
                                    c =>
                                        c.ProductCategoryId ==
                                        x.ProductCategoryId
                                )
                                .Select
                                (
                                    c =>
                                        c.CategoryName
                                )
                                .FirstOrDefault()
                                ??
                                string.Empty,

                        //===================================================
                        // Product Sub Category
                        //===================================================

                        ProductSubCategoryId =
                            x.ProductSubCategoryId,

                        ProductSubCategoryName =
                            _context
                                .Set<ProductSubCategoryEntity>()
                                .Where
                                (
                                    s =>
                                        s.ProductSubCategoryId ==
                                        x.ProductSubCategoryId
                                )
                                .Select
                                (
                                    s =>
                                        s.SubCategoryName
                                )
                                .FirstOrDefault()
                                ??
                                string.Empty,

                        SubCategoryCode =
                            x.SubCategoryCode,

                        //===================================================
                        // Basic Information
                        //===================================================

                        ProductCode =
                            x.ProductCode,

                        ProductName =
                            x.ProductName,

                        //===================================================
                        // Inventory Ledger
                        //===================================================

                        InventoryLedgerCode =
                            x.InventoryLedgerCode,

                        InventoryLedgerName =
                            x.InventoryLedgerName,

                        //===================================================
                        // WIP Ledger
                        //===================================================

                        WipLedgerCode =
                            x.WipLedgerCode,

                        WipLedgerName =
                            x.WipLedgerName,

                        //===================================================
                        // COGS Ledger
                        //===================================================

                        CogsLedgerCode =
                            x.CogsLedgerCode,

                        CogsLedgerName =
                            x.CogsLedgerName,

                        //===================================================
                        // Configuration
                        //===================================================

                        // TODO: Map Product Master specific configuration fields here

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

    public async Task<List<ProductMasterDto>>
        GetAllAsync()
    {
        return await ProductMasterQuery()
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

    public async Task<ProductMasterDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await ProductMasterQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.ProductMasterId ==
                    id
            );
    }


    //===========================================================
    // Resolve Product Sub Category
    //===========================================================

    private async Task<(ProductSubCategoryEntity SubCategory,
                        int ClassSequenceNo,
                        int CategorySequenceNo,
                        int SubCategorySequenceNo)>
        ResolveSubCategoryAsync
        (
            long productSubCategoryId
        )
    {
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
            throw new KeyNotFoundException(
                "Product Sub Category not found.");
        }

        if
        (
            !subCategory.IsActive
        )
        {
            throw new InvalidOperationException(
                "The selected Product Sub Category is inactive.");
        }

        string[] parts =
            subCategory.SubCategoryCode.Split
            (
                '-',
                StringSplitOptions.RemoveEmptyEntries
            );

        if
        (
            parts.Length !=
            4
            ||
            !string.Equals
            (
                parts[0].Trim(),
                "SCG",
                StringComparison.OrdinalIgnoreCase
            )
            ||
            !int.TryParse
            (
                parts[1].Trim(),
                out int classSequenceNo
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
            classSequenceNo < 1
            ||
            categorySequenceNo < 1
            ||
            subCategorySequenceNo < 1
        )
        {
            throw new InvalidOperationException(
                $"Invalid Product Sub Category code '{subCategory.SubCategoryCode}'.");
        }

        return
        (
            subCategory,
            classSequenceNo,
            categorySequenceNo,
            subCategorySequenceNo
        );
    }


    //===========================================================
    // Highest Sequence By Prefix
    //===========================================================

    private static int HighestSequence
    (
        IEnumerable<string> codes,
        string prefix
    )
    {
        int highest =
            0;

        foreach
        (
            string code
            in codes
        )
        {
            if
            (
                string.IsNullOrWhiteSpace(code)
                ||
                !code.StartsWith
                (
                    prefix,
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                continue;
            }

            if
            (
                int.TryParse
                (
                    code.Substring(prefix.Length).Trim(),
                    out int sequenceNo
                )
                &&
                sequenceNo >
                highest
            )
            {
                highest =
                    sequenceNo;
            }
        }

        return highest;
    }


    //===========================================================
    // Get Next Product Master Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync
        (
            long productSubCategoryId
        )
    {
        var resolved =
            await ResolveSubCategoryAsync(
                productSubCategoryId);

        //=======================================================
        // Existing Product Codes (including deleted records)
        //=======================================================

        string prefix =
            $"PRD-{resolved.ClassSequenceNo:D3}-{resolved.CategorySequenceNo:D3}-{resolved.SubCategorySequenceNo:D3}-";

        List<string> existingCodes =
            await _context
                .Set<ProductMasterEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductCode.StartsWith(
                            prefix)
                )
                .Select
                (
                    x =>
                        x.ProductCode
                )
                .ToListAsync();

        //=======================================================
        // Generate Next Product Master Code
        //=======================================================

        int nextSequenceNo =
            HighestSequence(
                existingCodes,
                prefix)
            +
            1;

        return CodeGenerator.GenerateProductMasterCode(
            resolved.ClassSequenceNo,
            resolved.CategorySequenceNo,
            resolved.SubCategorySequenceNo,
            nextSequenceNo);
    }


    //===========================================================
    // Get Next Ledger Sequence
    //===========================================================

    private async Task<int>
        GetNextLedgerSequenceAsync
        (
            int ledgerClassSequenceNo,
            int categorySequenceNo,
            int subCategorySequenceNo
        )
    {
        string prefix =
            $"GLR-{ledgerClassSequenceNo:D3}-{categorySequenceNo:D3}-{subCategorySequenceNo:D3}-";

        List<string> existingCodes =
            await _context
                .Set<GeneralLedgersEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.LedgerCode.StartsWith(
                            prefix)
                )
                .Select
                (
                    x =>
                        x.LedgerCode
                )
                .ToListAsync();

        return
            HighestSequence(
                existingCodes,
                prefix)
            +
            1;
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<ProductMasterDefaultsDto>
        GetDefaultsAsync
        (
            long productSubCategoryId
        )
    {
        var resolved =
            await ResolveSubCategoryAsync(
                productSubCategoryId);

        string productCode =
            await GetNextCodeAsync(
                productSubCategoryId);

        int inventorySequenceNo =
            await GetNextLedgerSequenceAsync(
                1,
                resolved.CategorySequenceNo,
                resolved.SubCategorySequenceNo);

        int wipSequenceNo =
            await GetNextLedgerSequenceAsync(
                2,
                resolved.CategorySequenceNo,
                resolved.SubCategorySequenceNo);

        int cogsSequenceNo =
            await GetNextLedgerSequenceAsync(
                3,
                resolved.CategorySequenceNo,
                resolved.SubCategorySequenceNo);

        return new ProductMasterDefaultsDto
        {
            Code =
                productCode,

            InventoryLedgerCode =
                CodeGenerator.GenerateInventoryLedgerCode(
                    resolved.CategorySequenceNo,
                    resolved.SubCategorySequenceNo,
                    inventorySequenceNo),

            WipLedgerCode =
                CodeGenerator.GenerateWipLedgerCode(
                    resolved.CategorySequenceNo,
                    resolved.SubCategorySequenceNo,
                    wipSequenceNo),

            CogsLedgerCode =
                CodeGenerator.GenerateCogsLedgerCode(
                    resolved.CategorySequenceNo,
                    resolved.SubCategorySequenceNo,
                    cogsSequenceNo)
        };
    }


    //===========================================================
    // Add Auto General Ledger
    //===========================================================

    private async Task
        AddAutoGeneralLedgerAsync
        (
            string subGroupCode,
            string ledgerCode,
            string ledgerName,
            bool isActive,
            long userId
        )
    {
        AccountSubGroupEntity? subGroup =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.SubGroupCode ==
                        subGroupCode
                        &&
                        !x.IsDeleted
                );

        if
        (
            subGroup ==
            null
        )
        {
            throw new KeyNotFoundException(
                $"Account Sub Group '{subGroupCode}' not found.");
        }

        _context
            .Set<GeneralLedgersEntity>()
            .Add
            (
                new GeneralLedgersEntity
                {
                    AccountClassId =
                        subGroup.AccountClassId,

                    AccountGroupId =
                        subGroup.AccountGroupId,

                    AccountSubGroupId =
                        subGroup.AccountSubGroupId,

                    ClassCode =
                        subGroup.ClassCode,

                    Mode =
                        subGroup.Mode,

                    GroupCode =
                        subGroup.GroupCode,

                    SubGroupCode =
                        subGroup.SubGroupCode,

                    LedgerCode =
                        ledgerCode,

                    LedgerName =
                        ledgerName,

                    Remarks =
                        "System generated from Product Master.",

                    IsActive =
                        isActive,

                    IsDeleted =
                        false,

                    CreatedBy =
                        userId,

                    CreatedDate =
                        DateTime.UtcNow
                }
            );
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateProductMasterDto dto,
            long userId
        )
    {
        //=======================================================
        // Resolve Product Sub Category
        //=======================================================

        var resolved =
            await ResolveSubCategoryAsync(
                dto.ProductSubCategoryId);

        ProductSubCategoryEntity subCategory =
            resolved.SubCategory;

        //=======================================================
        // Validate Product Name
        //=======================================================

        string productName =
            dto.ProductName?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(
                productName)
        )
        {
            throw new InvalidOperationException(
                "Product Name is required.");
        }

        //=======================================================
        // Validate Ledger Names
        //=======================================================

        string inventoryLedgerName =
            dto.InventoryLedgerName?.Trim()
            ??
            string.Empty;

        string wipLedgerName =
            dto.WipLedgerName?.Trim()
            ??
            string.Empty;

        string cogsLedgerName =
            dto.CogsLedgerName?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(inventoryLedgerName)
            ||
            string.IsNullOrWhiteSpace(wipLedgerName)
            ||
            string.IsNullOrWhiteSpace(cogsLedgerName)
        )
        {
            throw new InvalidOperationException(
                "Inventory, WIP and COGS Ledger Names are required.");
        }

        //=======================================================
        // Check Duplicate Product Name
        //=======================================================

        bool productExists =
            await _context
                .Set<ProductMasterEntity>()
                .AnyAsync
                (
                    x =>
                        x.ProductSubCategoryId ==
                        dto.ProductSubCategoryId
                        &&
                        !x.IsDeleted
                        &&
                        x.ProductName.ToLower() ==
                        productName.ToLower()
                );

        if
        (
            productExists
        )
        {
            throw new InvalidOperationException(
                "Product Master already exists under this Product Sub Category.");
        }

        //=======================================================
        // Generate Product Master Codes
        //=======================================================

        ProductMasterDefaultsDto defaults =
            await GetDefaultsAsync(
                dto.ProductSubCategoryId);

        //=======================================================
        // Generate Product Master Entity
        //=======================================================

        ProductMasterEntity entity =
            new ProductMasterEntity
            {
                ProductCategoryId =
                    subCategory.ProductCategoryId,

                ProductSubCategoryId =
                    subCategory.ProductSubCategoryId,

                SubCategoryCode =
                    subCategory.SubCategoryCode,

                //===================================================
                // Basic Information
                //===================================================

                ProductCode =
                    defaults.Code,

                ProductName =
                    productName,

                //===================================================
                // Inventory Ledger
                //===================================================

                InventoryLedgerCode =
                    defaults.InventoryLedgerCode,

                InventoryLedgerName =
                    inventoryLedgerName,

                //===================================================
                // WIP Ledger
                //===================================================

                WipLedgerCode =
                    defaults.WipLedgerCode,

                WipLedgerName =
                    wipLedgerName,

                //===================================================
                // COGS Ledger
                //===================================================

                CogsLedgerCode =
                    defaults.CogsLedgerCode,

                CogsLedgerName =
                    cogsLedgerName,

                //===================================================
                // Configuration
                //===================================================

                // TODO: Assign Product Master specific configuration fields here

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
        // Save Product Master and Auto General Ledgers
        //=======================================================

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            _context
                .Set<ProductMasterEntity>()
                .Add(entity);

            await AddAutoGeneralLedgerAsync(
                subCategory.InventorySubGroupCode,
                entity.InventoryLedgerCode,
                entity.InventoryLedgerName,
                entity.IsActive,
                userId);

            await AddAutoGeneralLedgerAsync(
                subCategory.WipSubGroupCode,
                entity.WipLedgerCode,
                entity.WipLedgerName,
                entity.IsActive,
                userId);

            await AddAutoGeneralLedgerAsync(
                subCategory.CogsSubGroupCode,
                entity.CogsLedgerCode,
                entity.CogsLedgerName,
                entity.IsActive,
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
                        "Product Master",

                    EntityId =
                        entity.ProductMasterId,

                    ActivityType =
                        "Create",

                    ActivityTitle =
                        "Product Master Created",

                    ActivityDescription =
                        $"Product Master '{entity.ProductName}' created.",

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

            return entity.ProductMasterId;
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
            UpdateProductMasterDto dto,
            long userId
        )
    {
        //=======================================================
        // Resolve Product Master
        //=======================================================

        ProductMasterEntity? entity =
            await _context
                .Set<ProductMasterEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ProductMasterId ==
                        dto.ProductMasterId
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
                "Product Master not found.");
        }

        //=======================================================
        // Validate Parent Consistency
        //=======================================================

        if
        (
            entity.ProductSubCategoryId !=
            dto.ProductSubCategoryId
        )
        {
            throw new InvalidOperationException(
                "The selected Product Sub Category does not match the existing Product Master.");
        }

        if
        (
            entity.ProductCategoryId !=
            dto.ProductCategoryId
        )
        {
            throw new InvalidOperationException(
                "The selected Product Category does not match the existing Product Master.");
        }

        //=======================================================
        // Validate Product Name
        //=======================================================

        string productName =
            dto.ProductName?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(
                productName)
        )
        {
            throw new InvalidOperationException(
                "Product Name is required.");
        }

        //=======================================================
        // Check Duplicate Product Name
        //=======================================================

        bool productExists =
            await _context
                .Set<ProductMasterEntity>()
                .AnyAsync
                (
                    x =>
                        x.ProductMasterId !=
                        dto.ProductMasterId
                        &&
                        x.ProductSubCategoryId ==
                        dto.ProductSubCategoryId
                        &&
                        !x.IsDeleted
                        &&
                        x.ProductName.ToLower() ==
                        productName.ToLower()
                );

        if
        (
            productExists
        )
        {
            throw new InvalidOperationException(
                "Product Master already exists under this Product Sub Category.");
        }

        //=======================================================
        // Update Entity
        // (codes and ledger names are locked after creation)
        //=======================================================

        entity.ProductName =
            productName;

        //=======================================================
        // Configuration
        //=======================================================

        // TODO: Update Product Master specific configuration fields here

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

        //=======================================================
        // Sync Auto General Ledger Status
        //=======================================================

        List<string> ledgerCodes =
            new List<string>
            {
                entity.InventoryLedgerCode,
                entity.WipLedgerCode,
                entity.CogsLedgerCode
            };

        List<GeneralLedgersEntity> ledgers =
            await _context
                .Set<GeneralLedgersEntity>()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        ledgerCodes.Contains(
                            x.LedgerCode)
                )
                .ToListAsync();

        foreach
        (
            GeneralLedgersEntity ledger
            in ledgers
        )
        {
            ledger.IsActive =
                entity.IsActive;

            ledger.ModifiedBy =
                userId;

            ledger.ModifiedDate =
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
                    "Product Master",

                EntityId =
                    entity.ProductMasterId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Product Master Updated",

                ActivityDescription =
                    $"Product Master '{entity.ProductName}' updated.",

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
        // Resolve Product Master
        //=======================================================

        ProductMasterEntity? entity =
            await _context
                .Set<ProductMasterEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ProductMasterId ==
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
                "Product Master not found.");
        }

        //=======================================================
        // Soft Delete Product Master
        //=======================================================

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            DateTime.UtcNow;

        //=======================================================
        // Delete Generated General Ledgers
        //=======================================================

        List<string> generatedLedgerCodes =
            new List<string>
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
            .Distinct(
                StringComparer.OrdinalIgnoreCase)
            .ToList();

        List<GeneralLedgersEntity> generatedLedgers =
            await _context
                .Set<GeneralLedgersEntity>()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        generatedLedgerCodes.Contains(
                            x.LedgerCode)
                )
                .ToListAsync();

        foreach
        (
            GeneralLedgersEntity ledger
            in generatedLedgers
        )
        {
            ledger.IsDeleted =
                true;

            ledger.DeletedBy =
                userId;

            ledger.DeletedDate =
                DateTime.UtcNow;

            ledger.ModifiedBy =
                userId;

            ledger.ModifiedDate =
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
                    "Product Master",

                EntityId =
                    entity.ProductMasterId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Product Master Deleted",

                ActivityDescription =
                    $"Product Master '{entity.ProductName}' deleted.",

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
        // Resolve Latest Deleted Product Master
        //=======================================================

        ProductMasterEntity? entity =
            await _context
                .Set<ProductMasterEntity>()
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
        // Restore Product Master
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
        // Restore Generated General Ledgers
        //=======================================================

        List<string> generatedLedgerCodes =
            new List<string>
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
            .Distinct(
                StringComparer.OrdinalIgnoreCase)
            .ToList();

        List<GeneralLedgersEntity> generatedLedgers =
            await _context
                .Set<GeneralLedgersEntity>()
                .Where
                (
                    x =>
                        x.IsDeleted
                        &&
                        generatedLedgerCodes.Contains(
                            x.LedgerCode)
                )
                .ToListAsync();

        foreach
        (
            GeneralLedgersEntity ledger
            in generatedLedgers
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

        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Product Settings",

                EntityName =
                    "Product Master",

                EntityId =
                    entity.ProductMasterId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Product Master Restored",

                ActivityDescription =
                    $"Product Master '{entity.ProductName}' restored.",

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
            .Set<ProductMasterEntity>()
            .AnyAsync
            (
                x =>
                    x.ProductMasterId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}