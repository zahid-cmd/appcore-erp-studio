//===============================================================
// Namespaces
//===============================================================

using System.Text.Json;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;

using PageCloningEntity =
    AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement.PageCloning;

using AppCore.Infrastructure.Persistence;
using AppCore.Domain.Common;

using AppCore.Infrastructure.Platform.PageCloneEngine;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Page Cloning Repository
//===============================================================

public class PageCloningRepository : IPageCloningRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public PageCloningRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Page Cloning Query
    //===========================================================

    private IQueryable<PageCloningDto> PageCloningQuery()
    {
        return _context
            .Set<PageCloningEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new PageCloningDto
                    {
                        PageCloningId =
                            x.PageCloningId,

                        CloneFromId =
                            x.CloneFromId,

                        CloneFromCode =
                            x.CloneFromCode,

                        CloneFromName =
                            x.CloneFromName,

                        CloneToId =
                            x.CloneToId,

                        CloneToCode =
                            x.CloneToCode,

                        CloneToName =
                            x.CloneToName,

                        EntityName =
                            x.EntityName,

                        BlueprintJson =
                            x.BlueprintJson,

                        NumberOfFiles =
                            x.NumberOfFiles,

                        RunStatus =
                            x.RunStatus,

                        LastRunDate =
                            x.LastRunDate,

                        BuildOutput =
                            x.BuildOutput,

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

    public async Task<List<PageCloningDto>>
        GetAllAsync()
    {
        return await PageCloningQuery()
            .OrderByDescending
            (
                x =>
                    x.PageCloningId
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<PageCloningDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await PageCloningQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.PageCloningId ==
                    id
            );
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public Task<PageCloningDefaultsDto>
        GetDefaultsAsync()
    {
        return Task.FromResult
        (
            new PageCloningDefaultsDto
            {
                NumberOfFiles = 15,
                RunStatus = "Draft"
            }
        );
    }


    //===========================================================
    // Analyze Source Page (reads files, writes nothing)
    //===========================================================

    public EntityAnalysisDto
        Analyze
        (
            string name
        )
    {
        return new SourceAnalyzer().Analyze(name);
    }


    //===========================================================
    // Validate Input
    //===========================================================

    private static void Validate
    (
        long cloneFromId,
        long cloneToId,
        string entityName,
        string blueprintJson
    )
    {
        if
        (
            cloneFromId <= 0
        )
        {
            throw new InvalidOperationException(
                "Clone From page is required.");
        }

        if
        (
            cloneToId <= 0
        )
        {
            throw new InvalidOperationException(
                "Clone To page is required.");
        }

        if
        (
            cloneFromId == cloneToId
        )
        {
            throw new InvalidOperationException(
                "Clone From and Clone To cannot be the same page.");
        }

        if
        (
            string.IsNullOrWhiteSpace(entityName)
        )
        {
            throw new InvalidOperationException(
                "Entity Name is required.");
        }

        if
        (
            string.IsNullOrWhiteSpace(blueprintJson)
        )
        {
            throw new InvalidOperationException(
                "Blueprint is required.");
        }

        try
        {
            using JsonDocument document =
                JsonDocument.Parse(
                    blueprintJson);
        }
        catch (JsonException)
        {
            throw new InvalidOperationException(
                "Blueprint is not valid JSON.");
        }
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreatePageCloningDto dto,
            long userId
        )
    {
        string entityName =
            dto.EntityName?.Trim()
            ??
            string.Empty;

        Validate(
            dto.CloneFromId,
            dto.CloneToId,
            entityName,
            dto.BlueprintJson);

        PageCloningEntity entity =
            new PageCloningEntity
            {
                CloneFromId =
                    dto.CloneFromId,

                CloneFromCode =
                    dto.CloneFromCode?.Trim()
                    ??
                    string.Empty,

                CloneFromName =
                    dto.CloneFromName?.Trim()
                    ??
                    string.Empty,

                CloneToId =
                    dto.CloneToId,

                CloneToCode =
                    dto.CloneToCode?.Trim()
                    ??
                    string.Empty,

                CloneToName =
                    dto.CloneToName?.Trim()
                    ??
                    string.Empty,

                EntityName =
                    entityName,

                BlueprintJson =
                    dto.BlueprintJson,

                NumberOfFiles =
                    15,

                RunStatus =
                    "Draft",

                BuildOutput =
                    string.Empty,

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

        _context
            .Set<PageCloningEntity>()
            .Add(
                entity
            );

        await _context.SaveChangesAsync();

        await AddHistoryAsync(
            entity,
            "Create",
            "Page Cloning Created",
            $"Page Cloning '{entity.CloneFromName}' to '{entity.CloneToName}' created.",
            userId);

        return entity.PageCloningId;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdatePageCloningDto dto,
            long userId
        )
    {
        PageCloningEntity? entity =
            await _context
                .Set<PageCloningEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.PageCloningId ==
                        dto.PageCloningId
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
                "Page Cloning not found.");
        }

        string entityName =
            dto.EntityName?.Trim()
            ??
            string.Empty;

        Validate(
            dto.CloneFromId,
            dto.CloneToId,
            entityName,
            dto.BlueprintJson);

        //=======================================================
        // A changed blueprint or pair must be previewed again
        //=======================================================

        bool changed =
            entity.CloneFromId != dto.CloneFromId
            ||
            entity.CloneToId != dto.CloneToId
            ||
            entity.EntityName != entityName
            ||
            entity.BlueprintJson != dto.BlueprintJson;

        entity.CloneFromId =
            dto.CloneFromId;

        entity.CloneFromCode =
            dto.CloneFromCode?.Trim()
            ??
            string.Empty;

        entity.CloneFromName =
            dto.CloneFromName?.Trim()
            ??
            string.Empty;

        entity.CloneToId =
            dto.CloneToId;

        entity.CloneToCode =
            dto.CloneToCode?.Trim()
            ??
            string.Empty;

        entity.CloneToName =
            dto.CloneToName?.Trim()
            ??
            string.Empty;

        entity.EntityName =
            entityName;

        entity.BlueprintJson =
            dto.BlueprintJson;

        if
        (
            changed
        )
        {
            entity.RunStatus =
                "Draft";
        }

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

        await _context.SaveChangesAsync();

        await AddHistoryAsync(
            entity,
            "Update",
            "Page Cloning Updated",
            $"Page Cloning '{entity.CloneFromName}' to '{entity.CloneToName}' updated.",
            userId);
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
        PageCloningEntity? entity =
            await _context
                .Set<PageCloningEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.PageCloningId ==
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
                "Page Cloning not found.");
        }

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await AddHistoryAsync(
            entity,
            "Delete",
            "Page Cloning Deleted",
            $"Page Cloning '{entity.CloneFromName}' to '{entity.CloneToName}' deleted.",
            userId);
    }


    //===========================================================
    // Restore Deleted Record
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        PageCloningEntity? entity =
            await _context
                .Set<PageCloningEntity>()
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

        await AddHistoryAsync(
            entity,
            "Restore",
            "Page Cloning Restored",
            $"Page Cloning '{entity.CloneFromName}' to '{entity.CloneToName}' restored.",
            userId);

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
            .Set<PageCloningEntity>()
            .AnyAsync
            (
                x =>
                    x.PageCloningId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }


    //===========================================================
    // Preview From The Wizard Plan
    // No saved record is needed and nothing is written.
    //===========================================================

    public Task<PageCloningPreviewDto>
        PreviewPlanAsync
        (
            ClonePlanDto plan
        )
    {
        if
        (
            plan == null
        )
        {
            throw new InvalidOperationException(
                "The clone plan is required.");
        }

        if
        (
            string.IsNullOrWhiteSpace(plan.CloneFromName)
        )
        {
            throw new InvalidOperationException(
                "Clone From page is required.");
        }

        if
        (
            string.IsNullOrWhiteSpace(plan.EntityName)
        )
        {
            throw new InvalidOperationException(
                "Entity Name is required.");
        }

        if
        (
            plan.CloneFromId > 0
            &&
            plan.CloneFromId == plan.CloneToId
        )
        {
            throw new InvalidOperationException(
                "Clone From and Clone To cannot be the same page.");
        }

        PageCloneBlueprint blueprint =
            ClonePlanMapper.ToBlueprint(plan);

        EnginePlan result =
            new PageCloneEngine().Plan(
                blueprint,
                plan.CloneFromName,
                plan.CloneToName);

        if
        (
            result.Errors.Count > 0
        )
        {
            throw new InvalidOperationException(
                string.Join(" | ", result.Errors));
        }

        return Task.FromResult
        (
            new PageCloningPreviewDto
            {
                PageCloningId = 0,
                Warnings = result.Warnings,
                Files = result.Files.Select
                (
                    f =>
                        new PageCloningFileChangeDto
                        {
                            LogicalKey = f.Key,
                            Path = f.Path,
                            Before = f.Before,
                            After = f.After,
                            EditedSinceBaseline = f.Edited
                        }
                ).ToList()
            }
        );
    }


    //===========================================================
    // Preview Clone
    //===========================================================

    public async Task<PageCloningPreviewDto>
        PreviewAsync
        (
            long id
        )
    {
        PageCloningEntity entity = await GetTrackedAsync(id);

        EnginePlan plan = new PageCloneEngine().Plan(entity);

        if
        (
            plan.Errors.Count > 0
        )
        {
            throw new InvalidOperationException(
                string.Join(" | ", plan.Errors));
        }

        entity.RunStatus = "Previewed";
        entity.ModifiedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new PageCloningPreviewDto
        {
            PageCloningId = id,
            Warnings = plan.Warnings,
            Files = plan.Files.Select
            (
                f =>
                    new PageCloningFileChangeDto
                    {
                        LogicalKey = f.Key,
                        Path = f.Path,
                        Before = f.Before,
                        After = f.After,
                        EditedSinceBaseline = f.Edited
                    }
            ).ToList()
        };
    }


    //===========================================================
    // Apply Clone
    //===========================================================

    public async Task<PageCloningResultDto>
        ApplyAsync
        (
            long id,
            bool overwriteEdited,
            long userId
        )
    {
        PageCloningEntity entity = await GetTrackedAsync(id);

        // Server-side safety net: Apply is only allowed after a Preview
        if
        (
            entity.RunStatus == "Draft"
        )
        {
            throw new InvalidOperationException(
                "Run Preview before Apply.");
        }

        EngineResult result =
            await new PageCloneEngine().ApplyAsync(
                entity,
                overwriteEdited);

        if
        (
            result.Written
        )
        {
            entity.RunStatus =
                result.Success ? "Applied" : "BuildFailed";

            entity.LastRunDate = DateTime.UtcNow;
            entity.BuildOutput = result.BuildOutput;
            entity.ModifiedBy = userId;
            entity.ModifiedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await AddHistoryAsync(
                entity,
                "Apply",
                "Page Clone Applied",
                $"'{entity.CloneFromName}' cloned to '{entity.CloneToName}'. Result: {entity.RunStatus}.",
                userId);
        }

        return new PageCloningResultDto
        {
            Success = result.Success,
            Messages = result.Messages,
            BuildOutput = result.BuildOutput,
            RunStatus = entity.RunStatus
        };
    }

    //===========================================================
    // Save Plan (write files, then create or update the record)
    //===========================================================

    public async Task<PageCloningResultDto>
        SavePlanAsync
        (
            ClonePlanDto plan,
            bool overwriteEdited,
            long userId
        )
    {
        if (plan.CloneFromId <= 0 || plan.CloneToId <= 0)
            throw new InvalidOperationException("Clone From and Clone To pages are required.");

        if (plan.CloneFromId == plan.CloneToId)
            throw new InvalidOperationException("Clone From and Clone To cannot be the same page.");

        PageCloneBlueprint bp = ClonePlanMapper.ToBlueprint(plan);

        EngineResult result =
            await new PageCloneEngine().ApplyAsync(
                bp,
                plan.CloneFromName,
                plan.CloneToName,
                overwriteEdited,
                verify: false);

        if (!result.Written)
        {
            return new PageCloningResultDto
            {
                Success = false,
                Messages = result.Messages,
                BuildOutput = result.BuildOutput,
                RunStatus = "Draft"
            };
        }

        PageCloningEntity? entity =
            await _context
                .Set<PageCloningEntity>()
                .FirstOrDefaultAsync(
                    x => x.CloneToId == plan.CloneToId && !x.IsDeleted);

        bool isNew = entity == null;

        if (entity == null)
        {
            entity = new PageCloningEntity
            {
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow,
                Remarks = string.Empty
            };

            _context.Set<PageCloningEntity>().Add(entity);
        }
        else
        {
            entity.ModifiedBy = userId;
            entity.ModifiedDate = DateTime.UtcNow;
        }

        entity.CloneFromId = plan.CloneFromId;
        entity.CloneFromCode = plan.CloneFromCode?.Trim() ?? string.Empty;
        entity.CloneFromName = plan.CloneFromName?.Trim() ?? string.Empty;
        entity.CloneToId = plan.CloneToId;
        entity.CloneToCode = plan.CloneToCode?.Trim() ?? string.Empty;
        entity.CloneToName = plan.CloneToName?.Trim() ?? string.Empty;
        entity.EntityName = bp.EntityName;
        entity.BlueprintJson = bp.ToJson();
        entity.NumberOfFiles = 15;
        entity.RunStatus = "Applied";
        entity.LastRunDate = DateTime.UtcNow;
        entity.BuildOutput = string.Empty;
        entity.IsActive = true;

        await _context.SaveChangesAsync();

        await AddHistoryAsync(
            entity,
            isNew ? "Create" : "Update",
            isNew ? "Page Clone Saved" : "Page Clone Updated",
            $"'{entity.CloneFromName}' cloned to '{entity.CloneToName}' and files written.",
            userId);

        return new PageCloningResultDto
        {
            Success = true,
            Messages = result.Messages,
            BuildOutput = string.Empty,
            RunStatus = entity.RunStatus,
            PageCloningId = entity.PageCloningId
        };
    }

    //===========================================================
    // Restore Code To Baseline
    //===========================================================

    public async Task<PageCloningResultDto>
        RestoreToBaselineAsync
        (
            long id,
            long userId
        )
    {
        PageCloningEntity entity = await GetTrackedAsync(id);

        EngineResult result =
            await new PageCloneEngine().RestoreAsync(entity);

        if (result.Written)
        {
            entity.RunStatus = "Restored";
            entity.LastRunDate = DateTime.UtcNow;
            entity.BuildOutput = string.Empty;
            entity.ModifiedBy = userId;
            entity.ModifiedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await AddHistoryAsync(
                entity,
                "Restore",
                "Page Clone Restored To Baseline",
                $"'{entity.CloneToName}' was restored to its sync baseline.",
                userId);
        }

        return new PageCloningResultDto
        {
            Success = result.Success,
            Messages = result.Messages,
            BuildOutput = result.BuildOutput,
            RunStatus = entity.RunStatus,
            PageCloningId = entity.PageCloningId
        };
    }

    //===========================================================
    // Get Tracked Entity
    //===========================================================

    private async Task<PageCloningEntity>
        GetTrackedAsync
        (
            long id
        )
    {
        PageCloningEntity? entity =
            await _context
                .Set<PageCloningEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.PageCloningId == id
                        &&
                        !x.IsDeleted
                );

        return entity
            ?? throw new KeyNotFoundException(
                "Page Cloning not found.");
    }

    //===========================================================
    // Activity History
    //===========================================================

    private async Task AddHistoryAsync
    (
        PageCloningEntity entity,
        string activityType,
        string title,
        string description,
        long userId
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Development Management",

                EntityName =
                    "Page Cloning",

                EntityId =
                    entity.PageCloningId,

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
                    DateTime.UtcNow
            }
        );

        await _context.SaveChangesAsync();
    }
}