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
//===============================================================

public class GeneralLedgersRepository : IGeneralLedgersRepository
{
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
    // Validate Parent Hierarchy
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
        // Resolve Account Sub Group
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
                "Account Sub Group not found."
            );
        }


        if
        (
            !accountSubGroup.IsActive
        )
        {
            throw new InvalidOperationException(
                "The selected Account Sub Group is inactive."
            );
        }


        if
        (
            !accountSubGroup.AllowManualLedger
        )
        {
            throw new InvalidOperationException(
                "Manual ledger creation is not allowed for the selected Account Sub Group."
            );
        }


        //=======================================================
        // Resolve Account Group
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
                "Account Group not found."
            );
        }


        if
        (
            !accountGroup.IsActive
        )
        {
            throw new InvalidOperationException(
                "The parent Account Group is inactive."
            );
        }


        //=======================================================
        // Resolve Account Class
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
                "Account Class not found."
            );
        }


        if
        (
            !accountClass.IsActive
        )
        {
            throw new InvalidOperationException(
                "The parent Account Class is inactive."
            );
        }


        return
        (
            accountClass,
            accountGroup,
            accountSubGroup
        );
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync(
            long accountSubGroupId)
    {
        //=======================================================
        // Resolve Parents
        //=======================================================

        var parents =
            await ResolveParentsAsync(
                accountSubGroupId);

        AccountSubGroupEntity accountSubGroup =
            parents.AccountSubGroup;


        //=======================================================
        // Resolve Sub Group Sequence
        //=======================================================

        string subGroupCode =
            accountSubGroup.SubGroupCode?.Trim()
            ??
            string.Empty;

        string[] subGroupCodeParts =
            subGroupCode.Split(
                '-',
                StringSplitOptions.RemoveEmptyEntries);

        if
        (
            subGroupCodeParts.Length !=
            4
            ||
            !string.Equals(
                subGroupCodeParts[0].Trim(),
                "SUB",
                StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                "Invalid Account Sub Group code."
            );
        }


        if
        (
            !int.TryParse(
                subGroupCodeParts[1].Trim(),
                out int classSequenceNo)
            ||
            !int.TryParse(
                subGroupCodeParts[2].Trim(),
                out int groupSequenceNo)
            ||
            !int.TryParse(
                subGroupCodeParts[3].Trim(),
                out int subGroupSequenceNo)
            ||
            classSequenceNo < 1
            ||
            groupSequenceNo < 1
            ||
            subGroupSequenceNo < 1
        )
        {
            throw new InvalidOperationException(
                "Invalid Account Sub Group sequence number."
            );
        }


        //=======================================================
        // Existing Ledger Codes (including deleted records)
        //=======================================================

        List<string> existingCodes =
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


        //=======================================================
        // Resolve Highest Ledger Sequence
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
                code.Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

            if
            (
                parts.Length !=
                5
            )
            {
                continue;
            }


            if
            (
                !string.Equals(
                    parts[0].Trim(),
                    "GLR",
                    StringComparison.OrdinalIgnoreCase)
                ||
                !string.Equals(
                    parts[1].Trim(),
                    classSequenceNo.ToString("D3"),
                    StringComparison.OrdinalIgnoreCase)
                ||
                !string.Equals(
                    parts[2].Trim(),
                    groupSequenceNo.ToString("D3"),
                    StringComparison.OrdinalIgnoreCase)
                ||
                !string.Equals(
                    parts[3].Trim(),
                    subGroupSequenceNo.ToString("D3"),
                    StringComparison.OrdinalIgnoreCase)
            )
            {
                continue;
            }


            if
            (
                int.TryParse(
                    parts[4].Trim(),
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


        //=======================================================
        // Generate Next Ledger Code
        //=======================================================

        int nextSequenceNo =
            highestSequenceNo +
            1;

        return CodeGenerator.GenerateGeneralLedgerCode(
            classSequenceNo,
            groupSequenceNo,
            subGroupSequenceNo,
            nextSequenceNo);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<GeneralLedgersDefaultsDto>
        GetDefaultsAsync()
    {
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
                Code = string.Empty
            };
        }


        return new GeneralLedgersDefaultsDto
        {
            Code =
                await GetNextCodeAsync(
                    accountSubGroup.AccountSubGroupId)
        };
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
        // Resolve and Validate Parents
        //=======================================================

        var parents =
            await ResolveParentsAsync(
                dto.AccountSubGroupId);

        AccountClassEntity accountClass =
            parents.AccountClass;

        AccountGroupEntity accountGroup =
            parents.AccountGroup;

        AccountSubGroupEntity accountSubGroup =
            parents.AccountSubGroup;


        //=======================================================
        // Generate Ledger Code
        //=======================================================

        string ledgerCode =
            await GetNextCodeAsync(
                accountSubGroup.AccountSubGroupId);


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
                    dto.LedgerName?.Trim()
                    ??
                    string.Empty,

                //=======================================================
                // Configuration
                //=======================================================

                // TODO: Assign General Ledger specific configuration fields here

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
                    $"General Ledger '{entity.LedgerName}' created.",

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
                "General Ledger not found."
            );
        }


        //=======================================================
        // Validate Parent Consistency
        //=======================================================

        if
        (
            entity.AccountSubGroupId !=
            dto.AccountSubGroupId
        )
        {
            throw new InvalidOperationException(
                "The selected Account Sub Group does not match the existing General Ledger."
            );
        }


        if
        (
            entity.AccountGroupId !=
            dto.AccountGroupId
        )
        {
            throw new InvalidOperationException(
                "The selected Account Group does not match the existing General Ledger."
            );
        }


        if
        (
            entity.AccountClassId !=
            dto.AccountClassId
        )
        {
            throw new InvalidOperationException(
                "The selected Account Class does not match the existing General Ledger."
            );
        }


        //=======================================================
        // Update Entity
        //=======================================================

        entity.LedgerName =
            dto.LedgerName?.Trim()
            ??
            string.Empty;

        //===========================================================
        // Configuration
        //===========================================================

        // TODO: Update General Ledger specific configuration fields here

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
                    $"General Ledger '{entity.LedgerName}' updated.",

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
                    $"General Ledger '{entity.LedgerName}' restored.",

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