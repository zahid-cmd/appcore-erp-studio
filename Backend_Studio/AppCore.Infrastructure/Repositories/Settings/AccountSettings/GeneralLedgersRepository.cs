//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.GeneralLedgers.DTOs;

using GeneralLedgersEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

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

namespace AppCore.Infrastructure.Configurations.Settings.AccountSettings;


//===============================================================
// General Ledgers Repository
//
// Code      : GLR-<ccc>-<ggg>-<sss>-<nnnnn>   e.g. GLR-001-001-001-00001
//             ccc / ggg / sss = parent class / group / sub group
//             numbers, nnnnn = the ledger's own number
// Numbering : restarts at 00001 for every Account Sub Group.
//             Deleted rows are included, so a number is never
//             reused and a restore can never clash.
// Parent    : sub groups of 'Account' type classes only, that are
//             active and allow manual ledgers (the fixed Cash /
//             Bank / MFS / POS sub groups do not; those have
//             their own pages).
// Locked    : class, group and sub group (and so the code)
//             cannot change after the ledger is saved.
// Name      : unique within its sub group.
//===============================================================

public class GeneralLedgersRepository : IGeneralLedgersRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string GroupPrefix =
        "GRP";

    private const string SubGroupPrefix =
        "SUB";

    private const string LedgerPrefix =
        "GLR";

    private const string AccountClassType =
        "Account";


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public GeneralLedgersRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // General Ledgers Query
    //===========================================================

    private IQueryable<GeneralLedgersDto> GeneralLedgersQuery()
    {
        return _context
            .Set<GeneralLedgersEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new GeneralLedgersDto
                    {
                        GeneralLedgerId =
                            x.GeneralLedgerId,

                        AccountClassId =
                            x.AccountClassId,

                        AccountClassName =
                            _context
                                .Set<AccountClassEntity>()
                                .Where
                                (
                                    c =>
                                        c.AccountClassId ==
                                        x.AccountClassId
                                )
                                .Select
                                (
                                    c =>
                                        c.ClassName
                                )
                                .FirstOrDefault()
                                ??
                                string.Empty,

                        AccountGroupId =
                            x.AccountGroupId,

                        AccountGroupName =
                            _context
                                .Set<AccountGroupEntity>()
                                .Where
                                (
                                    g =>
                                        g.AccountGroupId ==
                                        x.AccountGroupId
                                )
                                .Select
                                (
                                    g =>
                                        g.GroupName
                                )
                                .FirstOrDefault()
                                ??
                                string.Empty,

                        AccountSubGroupId =
                            x.AccountSubGroupId,

                        AccountSubGroupName =
                            _context
                                .Set<AccountSubGroupEntity>()
                                .Where
                                (
                                    s =>
                                        s.AccountSubGroupId ==
                                        x.AccountSubGroupId
                                )
                                .Select
                                (
                                    s =>
                                        s.SubGroupName
                                )
                                .FirstOrDefault()
                                ??
                                string.Empty,

                        ClassCode =
                            x.ClassCode,

                        Mode =
                            x.Mode,

                        GroupCode =
                            x.GroupCode,

                        SubGroupCode =
                            x.SubGroupCode,

                        LedgerCode =
                            x.LedgerCode,

                        LedgerName =
                            x.LedgerName,

                        //===================================================
                        // Configuration
                        //===================================================

                        // TODO: Map General Ledger specific configuration fields here

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

    public async Task<List<GeneralLedgersDto>>
        GetAllAsync()
    {
        return await GeneralLedgersQuery()
            .OrderBy
            (
                x =>
                    x.LedgerCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<GeneralLedgersDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await GeneralLedgersQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.GeneralLedgerId ==
                    id
            );
    }


    //===========================================================
    // Resolve Parent Hierarchy For A New Ledger
    //
    // Sub group: exists, active, allows manual ledgers.
    // Group / class: exist and are active; the class is of type
    // 'Account'. Ledgers of the Inventory / WIP / COGS classes
    // are the products themselves, never created here.
    //===========================================================

    private async Task<(AccountClassEntity AccountClass,
                        AccountGroupEntity AccountGroup,
                        AccountSubGroupEntity AccountSubGroup)>
        ResolveParentsAsync
        (
            long accountSubGroupId
        )
    {
        //=======================================================
        // Account Sub Group
        //=======================================================

        AccountSubGroupEntity? accountSubGroup =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountSubGroupId ==
                        accountSubGroupId
                        &&
                        !x.IsDeleted
                );

        if
        (
            accountSubGroup ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Account Sub Group not found.");
        }


        //=======================================================
        // Account Group
        //=======================================================

        AccountGroupEntity? accountGroup =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountGroupId ==
                        accountSubGroup.AccountGroupId
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
                "Parent Account Group not found.");
        }


        //=======================================================
        // Account Class
        //=======================================================

        AccountClassEntity? accountClass =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountClassId ==
                        accountSubGroup.AccountClassId
                        &&
                        !x.IsDeleted
                );

        if
        (
            accountClass ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Parent Account Class not found.");
        }


        //=======================================================
        // Validate
        //=======================================================

        if
        (
            !string.Equals(
                accountClass.ClassType?.Trim(),
                AccountClassType,
                StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                $"Ledgers of the {accountClass.ClassType} class '{accountClass.ClassName}' are the products themselves and cannot be created as General Ledgers.");
        }

        if
        (
            !accountClass.IsActive
        )
        {
            throw new InvalidOperationException(
                "The parent Account Class is inactive.");
        }

        if
        (
            !accountGroup.IsActive
        )
        {
            throw new InvalidOperationException(
                "The parent Account Group is inactive.");
        }

        if
        (
            !accountSubGroup.IsActive
        )
        {
            throw new InvalidOperationException(
                "The selected Account Sub Group is inactive.");
        }

        if
        (
            !accountSubGroup.AllowManualLedger
        )
        {
            throw new InvalidOperationException(
                "Manual ledger creation is not allowed for the selected Account Sub Group.");
        }


        return
        (
            accountClass,
            accountGroup,
            accountSubGroup
        );
    }


    //===========================================================
    // Class / Group / Sub Group Numbers From The Parent Codes
    //
    // CLS-001 / GRP-001-002 / SUB-001-002-003 → (1, 2, 3).
    // Each code must agree with its parent.
    //===========================================================

    private static (int ClassSequenceNo, int GroupSequenceNo, int SubGroupSequenceNo)
        ResolveSequences
        (
            string? classCode,
            string? groupCode,
            string? subGroupCode
        )
    {
        string[] classParts =
            SplitCode(classCode);

        if
        (
            classParts.Length !=
            2
            ||
            !int.TryParse(
                classParts[1],
                out int classSequenceNo)
            ||
            classSequenceNo < 1
        )
        {
            throw new InvalidOperationException(
                $"Invalid Account Class code '{classCode}'.");
        }


        string[] groupParts =
            SplitCode(groupCode);

        if
        (
            groupParts.Length !=
            3
            ||
            !string.Equals(
                groupParts[0],
                GroupPrefix,
                StringComparison.OrdinalIgnoreCase)
            ||
            !int.TryParse(
                groupParts[1],
                out int groupClassNo)
            ||
            groupClassNo !=
            classSequenceNo
            ||
            !int.TryParse(
                groupParts[2],
                out int groupSequenceNo)
            ||
            groupSequenceNo < 1
        )
        {
            throw new InvalidOperationException(
                $"Invalid Account Group code '{groupCode}' for class '{classCode}'.");
        }


        string[] subGroupParts =
            SplitCode(subGroupCode);

        if
        (
            subGroupParts.Length !=
            4
            ||
            !string.Equals(
                subGroupParts[0],
                SubGroupPrefix,
                StringComparison.OrdinalIgnoreCase)
            ||
            !int.TryParse(
                subGroupParts[1],
                out int subClassNo)
            ||
            subClassNo !=
            classSequenceNo
            ||
            !int.TryParse(
                subGroupParts[2],
                out int subGroupNo)
            ||
            subGroupNo !=
            groupSequenceNo
            ||
            !int.TryParse(
                subGroupParts[3],
                out int subGroupSequenceNo)
            ||
            subGroupSequenceNo < 1
        )
        {
            throw new InvalidOperationException(
                $"Invalid Account Sub Group code '{subGroupCode}' for group '{groupCode}'.");
        }


        return (classSequenceNo, groupSequenceNo, subGroupSequenceNo);
    }


    //===========================================================
    // Split Code Into Trimmed Parts
    //===========================================================

    private static string[] SplitCode
    (
        string? code
    )
    {
        return (code ?? string.Empty)
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
    }


    //===========================================================
    // Highest Ledger Sequence Within A Sub Group
    //
    // Reads the last part of every GLR-ccc-ggg-sss-nnnnn code
    // under this sub group, deleted rows included.
    //===========================================================

    private async Task<int>
        GetHighestSequenceAsync
        (
            long accountSubGroupId,
            string parentPart
        )
    {
        List<string> codes =
            await _context
                .Set<GeneralLedgersEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.AccountSubGroupId ==
                        accountSubGroupId
                )
                .Select
                (
                    x =>
                        x.LedgerCode
                )
                .ToListAsync();


        int highestSequenceNo =
            0;

        foreach
        (
            string code
            in codes
        )
        {
            string[] parts =
                SplitCode(code);

            if
            (
                parts.Length !=
                5
                ||
                !string.Equals(
                    parts[0],
                    LedgerPrefix,
                    StringComparison.OrdinalIgnoreCase)
                ||
                $"{parts[1]}-{parts[2]}-{parts[3]}" !=
                parentPart
            )
            {
                continue;
            }

            if
            (
                int.TryParse(
                    parts[4],
                    out int sequenceNo)
                &&
                sequenceNo >
                highestSequenceNo
            )
            {
                highestSequenceNo =
                    sequenceNo;
            }
        }

        return highestSequenceNo;
    }


    //===========================================================
    // Build Next Code For A Resolved Hierarchy
    //===========================================================

    private async Task<string>
        BuildNextCodeAsync
        (
            AccountClassEntity accountClass,
            AccountGroupEntity accountGroup,
            AccountSubGroupEntity accountSubGroup
        )
    {
        (int classSequenceNo, int groupSequenceNo, int subGroupSequenceNo) =
            ResolveSequences(
                accountClass.ClassCode,
                accountGroup.GroupCode,
                accountSubGroup.SubGroupCode);

        string parentPart =
            $"{classSequenceNo:D3}-{groupSequenceNo:D3}-{subGroupSequenceNo:D3}";

        int highestSequenceNo =
            await GetHighestSequenceAsync(
                accountSubGroup.AccountSubGroupId,
                parentPart);

        return CodeGenerator.GenerateGeneralLedgerCode(
            classSequenceNo,
            groupSequenceNo,
            subGroupSequenceNo,
            highestSequenceNo + 1);
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync
        (
            long accountSubGroupId
        )
    {
        (AccountClassEntity accountClass,
         AccountGroupEntity accountGroup,
         AccountSubGroupEntity accountSubGroup) =
            await ResolveParentsAsync(
                accountSubGroupId);

        return await BuildNextCodeAsync(
            accountClass,
            accountGroup,
            accountSubGroup);
    }


    //===========================================================
    // Get Defaults
    //
    // Next code of the first sub group a ledger can be created
    // under (empty when there is none yet).
    //===========================================================

    public async Task<GeneralLedgersDefaultsDto>
        GetDefaultsAsync()
    {
        List<long> accountClassIds =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.IsActive
                        &&
                        x.ClassType ==
                        AccountClassType
                )
                .Select
                (
                    x =>
                        x.AccountClassId
                )
                .ToListAsync();


        AccountSubGroupEntity? accountSubGroup =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.IsActive
                        &&
                        x.AllowManualLedger
                        &&
                        accountClassIds.Contains(
                            x.AccountClassId)
                )
                .OrderBy
                (
                    x =>
                        x.SubGroupCode
                )
                .FirstOrDefaultAsync();

        if
        (
            accountSubGroup ==
            null
        )
        {
            return new GeneralLedgersDefaultsDto
            {
                Code =
                    string.Empty
            };
        }

        try
        {
            return new GeneralLedgersDefaultsDto
            {
                Code =
                    await GetNextCodeAsync(
                        accountSubGroup.AccountSubGroupId)
            };
        }
        catch
        (
            InvalidOperationException
        )
        {
            // e.g. its group is inactive : no default to suggest
            return new GeneralLedgersDefaultsDto
            {
                Code =
                    string.Empty
            };
        }
    }


    //===========================================================
    // Normalize Ledger Name
    //===========================================================

    private static string NormalizeLedgerName
    (
        string? ledgerName
    )
    {
        string name =
            ledgerName?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(name)
        )
        {
            throw new InvalidOperationException(
                "Ledger Name is required.");
        }

        if
        (
            name.Length >
            200
        )
        {
            throw new InvalidOperationException(
                "Ledger Name cannot be longer than 200 characters.");
        }

        return name;
    }


    //===========================================================
    // Validate Unique Name / Code
    //
    // Ledger Name is unique within its sub group; Ledger Code is
    // unique everywhere. Only non-deleted rows are compared.
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            long accountSubGroupId,
            string ledgerCode,
            string ledgerName,
            long excludeId
        )
    {
        string lowerName =
            ledgerName.ToLower();

        GeneralLedgersEntity? sameName =
            await _context
                .Set<GeneralLedgersEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.GeneralLedgerId !=
                        excludeId
                        &&
                        x.AccountSubGroupId ==
                        accountSubGroupId
                        &&
                        x.LedgerName.ToLower() ==
                        lowerName
                );

        if
        (
            sameName !=
            null
        )
        {
            throw new InvalidOperationException(
                $"General Ledger '{ledgerName}' already exists in this sub group ({sameName.LedgerCode}).");
        }


        bool codeTaken =
            await _context
                .Set<GeneralLedgersEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.GeneralLedgerId !=
                        excludeId
                        &&
                        x.LedgerCode ==
                        ledgerCode
                );

        if
        (
            codeTaken
        )
        {
            throw new InvalidOperationException(
                $"Ledger Code '{ledgerCode}' is already in use.");
        }
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateGeneralLedgersDto dto,
            long userId
        )
    {
        //=======================================================
        // Resolve Parents
        //=======================================================

        (AccountClassEntity accountClass,
         AccountGroupEntity accountGroup,
         AccountSubGroupEntity accountSubGroup) =
            await ResolveParentsAsync(
                dto.AccountSubGroupId);


        if
        (
            (
                dto.AccountGroupId > 0
                &&
                dto.AccountGroupId !=
                accountGroup.AccountGroupId
            )
            ||
            (
                dto.AccountClassId > 0
                &&
                dto.AccountClassId !=
                accountClass.AccountClassId
            )
        )
        {
            throw new InvalidOperationException(
                "The selected Account Sub Group does not belong to the selected Account Class / Group.");
        }


        //=======================================================
        // Validate
        //=======================================================

        string ledgerName =
            NormalizeLedgerName(
                dto.LedgerName);


        //=======================================================
        // Generate Ledger Code (server side, never from the form)
        //=======================================================

        string ledgerCode =
            await BuildNextCodeAsync(
                accountClass,
                accountGroup,
                accountSubGroup);


        await EnsureUniqueAsync(
            accountSubGroup.AccountSubGroupId,
            ledgerCode,
            ledgerName,
            0);


        //=======================================================
        // Create Entity
        //=======================================================

        GeneralLedgersEntity entity =
            new GeneralLedgersEntity
            {
                AccountClassId =
                    accountClass.AccountClassId,

                AccountGroupId =
                    accountGroup.AccountGroupId,

                AccountSubGroupId =
                    accountSubGroup.AccountSubGroupId,

                ClassCode =
                    accountClass.ClassCode,

                Mode =
                    accountClass.Mode,

                GroupCode =
                    accountGroup.GroupCode,

                SubGroupCode =
                    accountSubGroup.SubGroupCode,

                LedgerCode =
                    ledgerCode,

                LedgerName =
                    ledgerName,

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
            .Set<GeneralLedgersEntity>()
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
                    "General Ledger",

                EntityId =
                    entity.GeneralLedgerId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "General Ledger Created",

                ActivityDescription =
                    $"General Ledger '{entity.LedgerName}' ({entity.LedgerCode}) created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );

        await _context.SaveChangesAsync();

        return entity.GeneralLedgerId;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateGeneralLedgersDto dto,
            long userId
        )
    {
        //=======================================================
        // Resolve General Ledger
        //=======================================================

        GeneralLedgersEntity? entity =
            await _context
                .Set<GeneralLedgersEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.GeneralLedgerId ==
                        dto.GeneralLedgerId
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
                "General Ledger not found.");
        }


        //=======================================================
        // Parents Are Locked
        //
        // The code is built from the class, group and sub group
        // numbers, so moving a ledger would break its code.
        //=======================================================

        if
        (
            (
                dto.AccountSubGroupId > 0
                &&
                dto.AccountSubGroupId !=
                entity.AccountSubGroupId
            )
            ||
            (
                dto.AccountGroupId > 0
                &&
                dto.AccountGroupId !=
                entity.AccountGroupId
            )
            ||
            (
                dto.AccountClassId > 0
                &&
                dto.AccountClassId !=
                entity.AccountClassId
            )
        )
        {
            throw new InvalidOperationException(
                "Account Class, Account Group and Account Sub Group cannot be changed after the ledger is created.");
        }


        //=======================================================
        // Refresh Parent Snapshot (Mode / Codes)
        //=======================================================

        AccountClassEntity? accountClass =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountClassId ==
                        entity.AccountClassId
                );

        if
        (
            accountClass !=
            null
        )
        {
            entity.ClassCode =
                accountClass.ClassCode;

            entity.Mode =
                accountClass.Mode;
        }


        AccountGroupEntity? accountGroup =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountGroupId ==
                        entity.AccountGroupId
                );

        if
        (
            accountGroup !=
            null
        )
        {
            entity.GroupCode =
                accountGroup.GroupCode;
        }


        AccountSubGroupEntity? accountSubGroup =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountSubGroupId ==
                        entity.AccountSubGroupId
                );

        if
        (
            accountSubGroup !=
            null
        )
        {
            entity.SubGroupCode =
                accountSubGroup.SubGroupCode;
        }


        //=======================================================
        // Validate
        //=======================================================

        string ledgerName =
            NormalizeLedgerName(
                dto.LedgerName);

        await EnsureUniqueAsync(
            entity.AccountSubGroupId,
            entity.LedgerCode,
            ledgerName,
            entity.GeneralLedgerId);


        //=======================================================
        // Update Entity
        //=======================================================

        entity.LedgerName =
            ledgerName;


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
                    "General Ledger",

                EntityId =
                    entity.GeneralLedgerId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "General Ledger Updated",

                ActivityDescription =
                    $"General Ledger '{entity.LedgerName}' ({entity.LedgerCode}) updated.",

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
        // Resolve General Ledger
        //=======================================================

        GeneralLedgersEntity? entity =
            await _context
                .Set<GeneralLedgersEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.GeneralLedgerId ==
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
                "General Ledger not found."
            );
        }


        //=======================================================
        // Soft Delete General Ledger
        //=======================================================

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
                    "General Ledger",

                EntityId =
                    entity.GeneralLedgerId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "General Ledger Deleted",

                ActivityDescription =
                    $"General Ledger '{entity.LedgerName}' deleted.",

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
    //
    // Restores the most recently deleted ledger. Blocked (409)
    // while its sub group, group or class is deleted, or its
    // name / code is taken.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        GeneralLedgersEntity? entity =
            await _context
                .Set<GeneralLedgersEntity>()
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
        // Parent Sub Group / Group / Class Must Exist
        //=======================================================

        bool subGroupExists =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        x.AccountSubGroupId ==
                        entity.AccountSubGroupId
                        &&
                        !x.IsDeleted
                );

        if
        (
            !subGroupExists
        )
        {
            throw new InvalidOperationException(
                $"General Ledger '{entity.LedgerName}' cannot be restored. " +
                "Its Account Sub Group is deleted; restore the sub group first.");
        }


        bool groupExists =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        x.AccountGroupId ==
                        entity.AccountGroupId
                        &&
                        !x.IsDeleted
                );

        if
        (
            !groupExists
        )
        {
            throw new InvalidOperationException(
                $"General Ledger '{entity.LedgerName}' cannot be restored. " +
                "Its Account Group is deleted; restore the group first.");
        }


        bool classExists =
            await _context
                .Set<AccountClassEntity>()
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
            !classExists
        )
        {
            throw new InvalidOperationException(
                $"General Ledger '{entity.LedgerName}' cannot be restored. " +
                "Its Account Class is deleted; restore the class first.");
        }


        //=======================================================
        // Name / Code Must Be Free
        //=======================================================

        try
        {
            await EnsureUniqueAsync(
                entity.AccountSubGroupId,
                entity.LedgerCode,
                entity.LedgerName,
                entity.GeneralLedgerId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"General Ledger '{entity.LedgerName}' cannot be restored. {ex.Message}");
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
                    "General Ledger",

                EntityId =
                    entity.GeneralLedgerId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "General Ledger Restored",

                ActivityDescription =
                    $"General Ledger '{entity.LedgerName}' ({entity.LedgerCode}) restored.",

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
            .Set<GeneralLedgersEntity>()
            .AnyAsync
            (
                x =>
                    x.GeneralLedgerId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}