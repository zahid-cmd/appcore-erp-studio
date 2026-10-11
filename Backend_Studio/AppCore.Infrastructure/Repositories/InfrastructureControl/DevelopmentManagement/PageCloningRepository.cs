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
    // Restore Code To Baseline (needs the code sync engine)
    //===========================================================

    public async Task<PageCloningResultDto>
        RestoreToBaselineAsync
        (
            long id,
            long userId
        )
    {
        PageCloningEntity entity = await GetTrackedAsync(id);

        return new PageCloningResultDto
        {
            Success = false,
            RunStatus = entity.RunStatus,
            Messages =
            {
                "Restore needs the code sync engine's regenerate method. Not connected yet. No files were changed."
            }
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