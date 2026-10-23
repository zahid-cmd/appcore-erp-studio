//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.SystemConfigurations.DTOs;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;

using NavigationModuleEntity =
    AppCore.Domain.Entities.InfrastructureControl.NavigationManagement.NavigationModule;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.GeneralSettings;


//===============================================================
// System Configurations Repository
//===============================================================

public class SystemConfigurationsRepository : ISystemConfigurationsRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "General Settings";

    private const string EntityName =
        "SystemConfiguration";

    // Code : CFG-<ModuleCode>-0001
    private const string CodePrefix =
        "CFG";

    private const int CodeDigits =
        4;

    private const int CodeMaxLength =
        50;

    private const int NameMaxLength =
        200;

    private const int RemarksMaxLength =
        1000;

    private const int ValueMaxLength =
        100;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public SystemConfigurationsRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // System Configurations Query (joined with module)
    //===========================================================

    private IQueryable<SystemConfigurationsDto> SystemConfigurationsQuery()
    {
        return
            from x in _context.Set<SystemConfigurationsEntity>().AsNoTracking()

            join m in _context.Set<NavigationModuleEntity>().AsNoTracking()
                on x.NavigationModuleId equals m.Id

            where !x.IsDeleted

            select new SystemConfigurationsDto
            {
                SystemConfigurationId =
                    x.SystemConfigurationId,

                NavigationModuleId =
                    x.NavigationModuleId,

                ModuleCode =
                    m.Code,

                ModuleName =
                    m.Name,

                ModuleIcon =
                    m.Icon,

                ConfigurationCode =
                    x.ConfigurationCode,

                ConfigurationName =
                    x.ConfigurationName,

                IsEnabled =
                    x.IsEnabled,

                Value =
                    x.Value,

                Remarks =
                    x.Remarks,

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
            };
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<SystemConfigurationsDto>>
        GetAllAsync()
    {
        return await SystemConfigurationsQuery()
            .OrderBy(x => x.ModuleName)
            .ThenBy(x => x.ConfigurationCode)
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<SystemConfigurationsDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await SystemConfigurationsQuery()
            .FirstOrDefaultAsync(x => x.SystemConfigurationId == id);
    }


    //===========================================================
    // Resolve Module
    //
    // requireActive : new settings need an active module.
    //===========================================================

    private async Task<NavigationModuleEntity>
        ResolveModuleAsync
        (
            long navigationModuleId,
            bool requireActive
        )
    {
        if (navigationModuleId <= 0)
        {
            throw new InvalidOperationException(
                "Module is required.");
        }

        NavigationModuleEntity? module =
            await _context
                .Set<NavigationModuleEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id == navigationModuleId
                        &&
                        !x.IsDeleted
                );

        if (module == null)
        {
            throw new InvalidOperationException(
                "The selected module was not found in Navigation Management.");
        }

        if (requireActive && !module.IsActive)
        {
            throw new InvalidOperationException(
                $"Module '{module.Name}' is inactive. Activate it in Navigation Management first.");
        }

        return module;
    }


    //===========================================================
    // Code Prefix For Module : "CFG-<ModuleCode>-"
    //===========================================================

    private static string CodePrefixFor
    (
        NavigationModuleEntity module
    )
    {
        string moduleCode =
            (module.Code ?? string.Empty).Trim().ToUpperInvariant();

        if (string.IsNullOrWhiteSpace(moduleCode))
        {
            moduleCode =
                $"M{module.Id}";
        }

        return $"{CodePrefix}-{moduleCode}-";
    }


    //===========================================================
    // Get Next Code
    //
    // Deleted rows are included, because the unique index on
    // ConfigurationCode covers them too. A code is never reused.
    //===========================================================

    public async Task<string>
        GetNextCodeAsync
        (
            long navigationModuleId
        )
    {
        NavigationModuleEntity module =
            await ResolveModuleAsync(
                navigationModuleId,
                requireActive: false);

        return await BuildNextCodeAsync(
            module);
    }

    private async Task<string>
        BuildNextCodeAsync
        (
            NavigationModuleEntity module
        )
    {
        string prefix =
            CodePrefixFor(module);

        List<string> existingCodes =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => x.ConfigurationCode.StartsWith(prefix))
                .Select(x => x.ConfigurationCode)
                .ToListAsync();

        int highest = 0;

        foreach (string code in existingCodes)
        {
            string tail =
                code.Substring(prefix.Length);

            if (int.TryParse(tail, out int sequenceNo) && sequenceNo > highest)
            {
                highest = sequenceNo;
            }
        }

        string next =
            $"{prefix}{(highest + 1).ToString().PadLeft(CodeDigits, '0')}";

        if (next.Length > CodeMaxLength)
        {
            throw new InvalidOperationException(
                "The generated configuration code is too long. Shorten the module code.");
        }

        return next;
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<SystemConfigurationsDefaultsDto>
        GetDefaultsAsync
        (
            long navigationModuleId
        )
    {
        NavigationModuleEntity module =
            await ResolveModuleAsync(
                navigationModuleId,
                requireActive: false);

        return new SystemConfigurationsDefaultsDto
        {
            NavigationModuleId =
                module.Id,

            ModuleName =
                module.Name,

            Code =
                await BuildNextCodeAsync(module),

            IsEnabled =
                true
        };
    }


    //===========================================================
    // Validate Name & Remarks
    //===========================================================

    private static (string Name, string Remarks)
        NormalizeText
        (
            string? configurationName,
            string? remarks
        )
    {
        string name =
            (configurationName ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new InvalidOperationException(
                "Configuration Name is required.");
        }

        if (name.Length > NameMaxLength)
        {
            throw new InvalidOperationException(
                $"Configuration Name cannot be longer than {NameMaxLength} characters.");
        }

        string cleanRemarks =
            (remarks ?? string.Empty).Trim();

        if (cleanRemarks.Length > RemarksMaxLength)
        {
            throw new InvalidOperationException(
                $"Remarks cannot be longer than {RemarksMaxLength} characters.");
        }

        return (name, cleanRemarks);
    }


    //===========================================================
    // Validate Value (optional : number or short text)
    //===========================================================

    private static string
        NormalizeValue
        (
            string? value
        )
    {
        string clean =
            (value ?? string.Empty).Trim();

        if (clean.Length > ValueMaxLength)
        {
            throw new InvalidOperationException(
                $"Value cannot be longer than {ValueMaxLength} characters.");
        }

        return clean;
    }


    //===========================================================
    // Ensure Unique Name (per module, active rows)
    //===========================================================

    private async Task
        EnsureUniqueNameAsync
        (
            long navigationModuleId,
            string name,
            string moduleName,
            long? excludeId
        )
    {
        string key =
            name.Trim().ToUpper();

        bool exists =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.NavigationModuleId == navigationModuleId
                        &&
                        (excludeId == null || x.SystemConfigurationId != excludeId)
                        &&
                        x.ConfigurationName.Trim().ToUpper() == key
                );

        if (exists)
        {
            throw new InvalidOperationException(
                $"'{name}' already exists in {moduleName}.");
        }
    }


    //===========================================================
    // Add Activity History
    //===========================================================

    private void AddHistory
    (
        SystemConfigurationsEntity entity,
        string activityType,
        string title,
        string description,
        long userId,
        DateTime performedDate
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    ModuleName,

                EntityName =
                    EntityName,

                EntityId =
                    entity.SystemConfigurationId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    title,

                ActivityDescription =
                    description,

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    performedDate
            });
    }


    //===========================================================
    // Create
    //
    // Code is always generated here (value from the client is
    // ignored). The module must be active.
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateSystemConfigurationsDto dto,
            long userId
        )
    {
        NavigationModuleEntity module =
            await ResolveModuleAsync(
                dto.NavigationModuleId,
                requireActive: true);

        (string name, string remarks) =
            NormalizeText(
                dto.ConfigurationName,
                dto.Remarks);

        string value =
            NormalizeValue(
                dto.Value);

        await EnsureUniqueNameAsync(
            module.Id,
            name,
            module.Name,
            null);

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            DateTime now =
                DateTime.UtcNow;

            SystemConfigurationsEntity entity =
                new SystemConfigurationsEntity
                {
                    NavigationModuleId =
                        module.Id,

                    ConfigurationCode =
                        await BuildNextCodeAsync(module),

                    ConfigurationName =
                        name,

                    IsEnabled =
                        dto.IsEnabled,

                    Value =
                        value,

                    Remarks =
                        remarks,

                    IsDeleted =
                        false,

                    CreatedBy =
                        userId,

                    CreatedDate =
                        now
                };

            _context
                .Set<SystemConfigurationsEntity>()
                .Add(entity);

            await _context.SaveChangesAsync();

            AddHistory(
                entity,
                "Create",
                "Configuration Created",
                $"Configuration '{entity.ConfigurationName}' ({entity.ConfigurationCode}) created in {module.Name}" +
                (entity.IsEnabled ? " as enabled" : " as disabled") +
                (string.IsNullOrEmpty(entity.Value) ? "." : $", value '{entity.Value}'."),
                userId,
                now);

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            return entity.SystemConfigurationId;
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // Update
    //
    // Module and Code are locked after creation.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateSystemConfigurationsDto dto,
            long userId
        )
    {
        SystemConfigurationsEntity? entity =
            await _context
                .Set<SystemConfigurationsEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.SystemConfigurationId == dto.SystemConfigurationId
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Configuration not found.");
        }

        if (dto.NavigationModuleId > 0 && dto.NavigationModuleId != entity.NavigationModuleId)
        {
            throw new InvalidOperationException(
                "The module of a configuration cannot be changed. Create a new configuration in the other module instead.");
        }

        NavigationModuleEntity module =
            await ResolveModuleAsync(
                entity.NavigationModuleId,
                requireActive: false);

        (string name, string remarks) =
            NormalizeText(
                dto.ConfigurationName,
                dto.Remarks);

        string value =
            NormalizeValue(
                dto.Value);

        await EnsureUniqueNameAsync(
            module.Id,
            name,
            module.Name,
            entity.SystemConfigurationId);

        string oldValue =
            entity.Value ?? string.Empty;

        DateTime now =
            DateTime.UtcNow;

        entity.ConfigurationName =
            name;

        entity.IsEnabled =
            dto.IsEnabled;

        entity.Value =
            value;

        entity.Remarks =
            remarks;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            now;

        AddHistory(
            entity,
            "Update",
            "Configuration Updated",
            $"Configuration '{entity.ConfigurationName}' ({entity.ConfigurationCode}) updated" +
            (oldValue == value ? "." : $"; value changed from '{oldValue}' to '{value}'."),
            userId,
            now);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Set Enabled (on/off switch)
    //===========================================================

    public async Task
        SetEnabledAsync
        (
            long id,
            bool isEnabled,
            long userId
        )
    {
        SystemConfigurationsEntity? entity =
            await _context
                .Set<SystemConfigurationsEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.SystemConfigurationId == id
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Configuration not found.");
        }

        if (entity.IsEnabled == isEnabled)
        {
            return;
        }

        DateTime now =
            DateTime.UtcNow;

        entity.IsEnabled =
            isEnabled;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            now;

        AddHistory(
            entity,
            isEnabled ? "Enable" : "Disable",
            isEnabled ? "Configuration Enabled" : "Configuration Disabled",
            $"Configuration '{entity.ConfigurationName}' ({entity.ConfigurationCode}) {(isEnabled ? "enabled" : "disabled")}.",
            userId,
            now);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Delete
    //
    // TODO: when code reads a setting by its code, block (409)
    // deleting settings the system depends on.
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        SystemConfigurationsEntity? entity =
            await _context
                .Set<SystemConfigurationsEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.SystemConfigurationId == id
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Configuration not found.");
        }

        DateTime now =
            DateTime.UtcNow;

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            now;

        AddHistory(
            entity,
            "Delete",
            "Configuration Deleted",
            $"Configuration '{entity.ConfigurationName}' ({entity.ConfigurationCode}) deleted.",
            userId,
            now);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore
    //
    // Blocked (409) when the module was deleted, or the name is
    // now used by another setting in the same module.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        SystemConfigurationsEntity? entity =
            await _context
                .Set<SystemConfigurationsEntity>()
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        NavigationModuleEntity? module =
            await _context
                .Set<NavigationModuleEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id == entity.NavigationModuleId
                        &&
                        !x.IsDeleted
                );

        if (module == null)
        {
            throw new InvalidOperationException(
                $"Configuration '{entity.ConfigurationName}' cannot be restored because its module has been deleted.");
        }

        try
        {
            await EnsureUniqueNameAsync(
                module.Id,
                entity.ConfigurationName ?? string.Empty,
                module.Name,
                entity.SystemConfigurationId);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException(
                $"Configuration '{entity.ConfigurationName}' cannot be restored. {ex.Message}");
        }

        DateTime now =
            DateTime.UtcNow;

        entity.IsDeleted =
            false;

        entity.DeletedBy =
            null;

        entity.DeletedDate =
            null;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            now;

        AddHistory(
            entity,
            "Restore",
            "Configuration Restored",
            $"Configuration '{entity.ConfigurationName}' ({entity.ConfigurationCode}) restored.",
            userId,
            now);

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
            .Set<SystemConfigurationsEntity>()
            .AnyAsync
            (
                x =>
                    x.SystemConfigurationId == id
                    &&
                    !x.IsDeleted
            );
    }
}