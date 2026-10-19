//===============================================================
// Namespaces
//===============================================================

using System.Text.RegularExpressions;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.AccountClass.DTOs;

using AccountClassEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountClass;

using AccountGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup;

using AppCore.Infrastructure.Persistence;
using AppCore.Domain.Common;
using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.AccountSettings;


//===============================================================
// Account Class Repository
//
// Code      : <ClassPrefix>-<nnn>     e.g. CLS-001, INV-001, WIP-001, COGS-001
// Prefix    : typed on the form (2–5 capital letters), never
//             hard-coded here. Locked after creation, because the
//             groups / sub groups / ledgers below build on it.
// Types     : Account · Inventory · Work In Progress ·
//             Cost of Goods Sold
// Numbering : every Class Type has its own count, starting at
//             001 — CLS-001, CLS-002 … / INV-001 / WIP-001 /
//             COGS-001. Deleted rows are included, so a number is
//             never reused and a restore can never clash.
// Inventory : only one class of each inventory type may exist,
//             each with its own prefix, and none allow manual
//             groups (Product Category creates them).
//===============================================================

public class AccountClassRepository : IAccountClassRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string AccountClassType =
        "Account";

    private static readonly string[] InventoryClassTypes =
    {
        "Inventory",
        "Work In Progress",
        "Cost of Goods Sold"
    };

    private static readonly string[] AllowedClassTypes =
        new[] { AccountClassType }
            .Concat(InventoryClassTypes)
            .ToArray();


    //===========================================================
    // Inventory Family (Inventory · WIP · COGS)
    //===========================================================

    private static bool IsInventoryFamily
    (
        string classType
    )
    {
        return InventoryClassTypes.Contains(
            classType);
    }


    private static readonly string[] AllowedModes =
    {
        "Debit",
        "Credit"
    };

    private static readonly Regex PrefixPattern =
        new Regex(
            "^[A-Z]{2,5}$",
            RegexOptions.Compiled);


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public AccountClassRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Account Class Query
    //===========================================================

    private IQueryable<AccountClassDto> AccountClassQuery()
    {
        return _context
            .Set<AccountClassEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new AccountClassDto
                    {
                        AccountClassId =
                            x.AccountClassId,

                        ClassType =
                            x.ClassType,

                        ClassCode =
                            x.ClassCode,

                        ClassName =
                            x.ClassName,

                        Mode =
                            x.Mode,

                        ClassPrefix =
                            x.ClassPrefix,

                        AllowManualGroupCreation =
                            x.AllowManualGroupCreation,

                        //===================================================
                        // Configuration
                        //===================================================

                        Remarks =
                            x.Remarks,

                        //===================================================
                        // Status
                        //===================================================

                        IsActive =
                            x.IsActive,

                        IsDeleted =
                            x.IsDeleted,

                        //===================================================
                        // Soft Delete
                        //===================================================

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

    public async Task<List<AccountClassDto>>
        GetAllAsync()
    {
        return await AccountClassQuery()
            .OrderBy
            (
                x =>
                    x.ClassType
            )
            .ThenBy
            (
                x =>
                    x.ClassCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<AccountClassDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await AccountClassQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.AccountClassId ==
                    id
            );
    }


    //===========================================================
    // Normalize Helpers
    //===========================================================

    private static string NormalizeClassType
    (
        string? classType
    )
    {
        string value =
            classType?.Trim()
            ??
            string.Empty;

        string? match =
            AllowedClassTypes.FirstOrDefault
            (
                x =>
                    string.Equals(
                        x,
                        value,
                        StringComparison.OrdinalIgnoreCase)
            );

        if
        (
            match ==
            null
        )
        {
            throw new InvalidOperationException(
                "Class Type must be Account, Inventory, Work In Progress or Cost of Goods Sold.");
        }

        return match;
    }


    private static string NormalizePrefix
    (
        string? classPrefix
    )
    {
        string value =
            (classPrefix ?? string.Empty)
                .Trim()
                .ToUpperInvariant();

        if
        (
            !PrefixPattern.IsMatch(value)
        )
        {
            throw new InvalidOperationException(
                "Class Prefix must be 2 to 5 letters (A–Z), e.g. CLS, INV, WIP, COGS.");
        }

        return value;
    }


    private static string NormalizeMode
    (
        string? mode
    )
    {
        string value =
            mode?.Trim()
            ??
            string.Empty;

        string? match =
            AllowedModes.FirstOrDefault
            (
                x =>
                    string.Equals(
                        x,
                        value,
                        StringComparison.OrdinalIgnoreCase)
            );

        if
        (
            match ==
            null
        )
        {
            throw new InvalidOperationException(
                "Mode must be 'Debit' or 'Credit'.");
        }

        return match;
    }


    //===========================================================
    // Highest Sequence Within A Class Type
    //
    // Each Class Type numbers on its own. Reads the number part
    // of every code of this type (any prefix, deleted rows
    // included).
    //===========================================================

    private async Task<int>
        GetHighestSequenceAsync
        (
            string classType
        )
    {
        List<string> codes =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ClassType ==
                        classType
                )
                .Select
                (
                    x =>
                        x.ClassCode
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
                parts.Length ==
                2
                &&
                int.TryParse
                (
                    parts[1].Trim(),
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
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync
        (
            string classType,
            string classPrefix
        )
    {
        string normalizedClassType =
            NormalizeClassType(
                classType);

        string normalizedPrefix =
            NormalizePrefix(
                classPrefix);

        int nextSequenceNo =
            await GetHighestSequenceAsync(
                normalizedClassType)
            +
            1;

        return CodeGenerator.GenerateAccountClassCode(
            normalizedPrefix,
            nextSequenceNo);
    }


    //===========================================================
    // Get Defaults
    //
    // Suggests the prefix last used for Account Classes (if any)
    // and the code it would produce. Nothing is hard-coded: on a
    // fresh database both come back empty and the user types the
    // prefix.
    //===========================================================

    public async Task<AccountClassDefaultsDto>
        GetDefaultsAsync()
    {
        string lastPrefix =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.ClassType ==
                        AccountClassType
                )
                .OrderByDescending
                (
                    x =>
                        x.CreatedDate
                )
                .Select
                (
                    x =>
                        x.ClassPrefix
                )
                .FirstOrDefaultAsync()
            ??
            string.Empty;

        return new AccountClassDefaultsDto
        {
            ClassPrefix =
                lastPrefix,

            Code =
                string.IsNullOrWhiteSpace(lastPrefix)
                    ? string.Empty
                    : await GetNextCodeAsync(
                        AccountClassType,
                        lastPrefix)
        };
    }


    //===========================================================
    // Validate Prefix Ownership
    //
    // A prefix belongs to one Class Type only. Each inventory
    // type has its own unique prefix (INV / WIP / COGS), while all
    // Account classes may share one prefix (CLS). Only one class
    // of each inventory type may exist.
    //===========================================================

    private async Task EnsurePrefixAllowedAsync
    (
        string classType,
        string classPrefix,
        long excludeId
    )
    {
        List<AccountClassEntity> samePrefix =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.AccountClassId !=
                        excludeId
                        &&
                        x.ClassPrefix ==
                        classPrefix
                )
                .ToListAsync();

        AccountClassEntity? otherType =
            samePrefix.FirstOrDefault
            (
                x =>
                    x.ClassType !=
                    classType
            );

        if
        (
            otherType !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Prefix '{classPrefix}' is already used by {otherType.ClassType} '{otherType.ClassName}'.");
        }

        if
        (
            IsInventoryFamily(classType)
            &&
            samePrefix.Count >
            0
        )
        {
            throw new InvalidOperationException(
                $"Prefix '{classPrefix}' is already used by '{samePrefix[0].ClassName}'. " +
                "Each inventory class needs its own prefix.");
        }

        if
        (
            IsInventoryFamily(classType)
        )
        {
            AccountClassEntity? sameType =
                await _context
                    .Set<AccountClassEntity>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync
                    (
                        x =>
                            !x.IsDeleted
                            &&
                            x.AccountClassId !=
                            excludeId
                            &&
                            x.ClassType ==
                            classType
                    );

            if
            (
                sameType !=
                null
            )
            {
                throw new InvalidOperationException(
                    $"A {classType} class already exists ('{sameType.ClassName}', {sameType.ClassCode}). " +
                    "Only one class of each inventory type is allowed.");
            }
        }
    }


    //===========================================================
    // Validate Unique Name / Code
    //===========================================================

    private async Task EnsureUniqueAsync
    (
        string classCode,
        string className,
        long excludeId
    )
    {
        string codeKey =
            classCode.ToLower();

        string nameKey =
            className.ToLower();

        bool codeTaken =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.AccountClassId !=
                        excludeId
                        &&
                        x.ClassCode.ToLower() ==
                        codeKey
                );

        if
        (
            codeTaken
        )
        {
            throw new InvalidOperationException(
                $"Class Code '{classCode}' already exists.");
        }

        bool nameTaken =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.AccountClassId !=
                        excludeId
                        &&
                        x.ClassName.ToLower() ==
                        nameKey
                );

        if
        (
            nameTaken
        )
        {
            throw new InvalidOperationException(
                $"Account Class '{className}' already exists.");
        }
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateAccountClassDto dto,
            long userId
        )
    {
        //=======================================================
        // Validate Input
        //=======================================================

        string classType =
            NormalizeClassType(
                dto.ClassType);

        string classPrefix =
            NormalizePrefix(
                dto.ClassPrefix);

        string mode =
            NormalizeMode(
                dto.Mode);

        string className =
            dto.ClassName?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(className)
        )
        {
            throw new InvalidOperationException(
                "Class Name is required.");
        }

        await EnsurePrefixAllowedAsync(
            classType,
            classPrefix,
            0);

        //=======================================================
        // Generate Code (always on the server)
        //=======================================================

        string classCode =
            await GetNextCodeAsync(
                classType,
                classPrefix);

        await EnsureUniqueAsync(
            classCode,
            className,
            0);

        //=======================================================
        // Build Entity
        //=======================================================

        AccountClassEntity entity =
            new AccountClassEntity
            {
                ClassType =
                    classType,

                ClassCode =
                    classCode,

                ClassName =
                    className,

                Mode =
                    mode,

                ClassPrefix =
                    classPrefix,

                // Inventory classes only get groups from Product Category
                AllowManualGroupCreation =
                    IsInventoryFamily(classType)
                        ? false
                        : dto.AllowManualGroupCreation,

                //=======================================================
                // Configuration
                //=======================================================

                Remarks =
                    dto.Remarks?.Trim()
                    ??
                    string.Empty,

                //=======================================================
                // Status
                //=======================================================

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
            .Set<AccountClassEntity>()
            .Add(
                entity
            );

        await _context.SaveChangesAsync();

        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Account Settings",

                EntityName =
                    "Account Class",

                EntityId =
                    entity.AccountClassId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Account Class Created",

                ActivityDescription =
                    $"Account Class '{entity.ClassName}' ({entity.ClassCode}) created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );

        await _context.SaveChangesAsync();

        return entity.AccountClassId;
    }


    //===========================================================
    // Update
    //
    // Class Type, Prefix and Code are locked after creation.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateAccountClassDto dto,
            long userId
        )
    {
        AccountClassEntity? entity =
            await _context
                .Set<AccountClassEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountClassId ==
                        dto.AccountClassId
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
                "Account Class not found."
            );
        }

        //=======================================================
        // Locked Fields
        //=======================================================

        if
        (
            !string.IsNullOrWhiteSpace(dto.ClassType)
            &&
            !string.Equals(
                dto.ClassType.Trim(),
                entity.ClassType,
                StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                "Class Type cannot be changed after the Account Class is created.");
        }

        if
        (
            !string.IsNullOrWhiteSpace(dto.ClassPrefix)
            &&
            !string.Equals(
                dto.ClassPrefix.Trim(),
                entity.ClassPrefix,
                StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                "Class Prefix cannot be changed after the Account Class is created.");
        }

        //=======================================================
        // Validate Editable Fields
        //=======================================================

        string className =
            dto.ClassName?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(className)
        )
        {
            throw new InvalidOperationException(
                "Class Name is required.");
        }

        string mode =
            NormalizeMode(
                dto.Mode);

        await EnsureUniqueAsync(
            entity.ClassCode,
            className,
            entity.AccountClassId);

        //=======================================================
        // Mode Is Locked Once Groups Exist
        //=======================================================

        if
        (
            !string.Equals(
                mode,
                entity.Mode,
                StringComparison.OrdinalIgnoreCase)
        )
        {
            bool hasGroups =
                await _context
                    .Set<AccountGroupEntity>()
                    .AsNoTracking()
                    .AnyAsync
                    (
                        x =>
                            x.AccountClassId ==
                            entity.AccountClassId
                            &&
                            !x.IsDeleted
                    );

            if
            (
                hasGroups
            )
            {
                throw new InvalidOperationException(
                    $"Mode cannot be changed because account groups already exist under '{entity.ClassName}'.");
            }
        }

        //=======================================================
        // Apply
        //=======================================================

        entity.ClassName =
            className;

        entity.Mode =
            mode;

        entity.AllowManualGroupCreation =
            IsInventoryFamily(entity.ClassType)
                ? false
                : dto.AllowManualGroupCreation;

        //===========================================================
        // Configuration
        //===========================================================

        entity.Remarks =
            dto.Remarks?.Trim()
            ??
            string.Empty;

        //===========================================================
        // Status
        //===========================================================

        entity.IsActive =
            dto.IsActive;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Account Settings",

                EntityName =
                    "Account Class",

                EntityId =
                    entity.AccountClassId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Account Class Updated",

                ActivityDescription =
                    $"Account Class '{entity.ClassName}' updated.",

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
        //===========================================================
        // Resolve Account Class
        //===========================================================

        AccountClassEntity? entity =
            await _context
                .Set<AccountClassEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountClassId ==
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
                "Account Class not found."
            );
        }

        //===========================================================
        // Dependency Check : Account Groups
        //
        // A soft delete is an UPDATE, so the database foreign key
        // never fires. Block the delete here while any
        // non-deleted Account Group still belongs to this class.
        //===========================================================

        int accountGroupCount =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .CountAsync
                (
                    x =>
                        x.AccountClassId ==
                        id
                        &&
                        !x.IsDeleted
                );

        if
        (
            accountGroupCount >
            0
        )
        {
            throw new InvalidOperationException(
                $"Account Class '{entity.ClassName}' cannot be deleted because " +
                $"{accountGroupCount} account group(s) are created under it. " +
                "Delete those account groups first."
            );
        }

        //===========================================================
        // Soft Delete Account Class
        //===========================================================

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Account Settings",

                EntityName =
                    "Account Class",

                EntityId =
                    entity.AccountClassId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Account Class Deleted",

                ActivityDescription =
                    $"Account Class '{entity.ClassName}' deleted.",

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
        AccountClassEntity? entity =
            await _context
                .Set<AccountClassEntity>()
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

        //===========================================================
        // Restore Blocked : name / code / prefix now used elsewhere
        //===========================================================

        try
        {
            await EnsureUniqueAsync(
                entity.ClassCode,
                entity.ClassName,
                entity.AccountClassId);

            await EnsurePrefixAllowedAsync(
                entity.ClassType,
                entity.ClassPrefix,
                entity.AccountClassId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Account Class '{entity.ClassName}' cannot be restored. {ex.Message}");
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

        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Account Settings",

                EntityName =
                    "Account Class",

                EntityId =
                    entity.AccountClassId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Account Class Restored",

                ActivityDescription =
                    $"Account Class '{entity.ClassName}' restored.",

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
            .Set<AccountClassEntity>()
            .AnyAsync
            (
                x =>
                    x.AccountClassId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}