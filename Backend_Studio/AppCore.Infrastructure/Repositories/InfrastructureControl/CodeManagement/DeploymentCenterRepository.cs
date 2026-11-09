//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Domain.Common;

using AppCore.Infrastructure.Persistence;

using global::AppCore.Application.InfrastructureControl.CodeManagement;

using DeploymentEntity = global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.DeploymentCenter;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InfrastructureControl.CodeManagement;


//===============================================================
// DeploymentCenterRepository
//
// Deployment / rollback records. A history row is written when a
// job starts and when it ends; progress in between only updates
// the record.
//===============================================================

public class DeploymentCenterRepository
    : IDeploymentCenterRepository
{
    private const string ModuleName = "InfrastructureControl";

    private const string EntityName = "DeploymentCenter";

    private readonly AppDbContext _context;

    public DeploymentCenterRepository(AppDbContext context)
    {
        _context = context;
    }


    //===========================================================
    // Get All (newest first; Log not loaded)
    //===========================================================

    public async Task<IReadOnlyList<DeploymentEntity>>
        GetAllAsync(long? serverManagementId)
    {
        return await _context
            .Set<DeploymentEntity>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted
                     && (serverManagementId == null || x.ServerManagementId == serverManagementId))
            .OrderByDescending(x => x.StartedDate ?? x.CreatedDate)
            .Select(x => new DeploymentEntity
            {
                Id = x.Id,
                PublicId = x.PublicId,
                Code = x.Code,
                Name = x.Name,
                ServerManagementId = x.ServerManagementId,
                ServerName = x.ServerName,
                Kind = x.Kind,
                DeployStatus = x.DeployStatus,
                Step = x.Step,
                Percent = x.Percent,
                AgentJobId = x.AgentJobId,
                BackupFile = x.BackupFile,
                PreviousRelease = x.PreviousRelease,
                PackageMb = x.PackageMb,
                StartedDate = x.StartedDate,
                FinishedDate = x.FinishedDate,
                DurationSeconds = x.DurationSeconds,
                Branch = x.Branch,
                CommitHash = x.CommitHash,
                CommitMessage = x.CommitMessage,
                PerformedByName = x.PerformedByName,
                Remarks = x.Remarks,
                CreatedDate = x.CreatedDate
            })
            .ToListAsync();
    }


    //===========================================================
    // Get By Id (with Log)
    //===========================================================

    public async Task<DeploymentEntity?>
        GetByIdAsync(long id)
    {
        return await _context
            .Set<DeploymentEntity>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
    }

    public async Task<long?>
        GetIdByPublicIdAsync(Guid publicId)
    {
        if (publicId == Guid.Empty)
        {
            return null;
        }

        return await _context
            .Set<DeploymentEntity>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.PublicId == publicId)
            .Select(x => (long?)x.Id)
            .FirstOrDefaultAsync();
    }


    //===========================================================
    // Next Release (R-0001), every row counted
    //===========================================================

    public async Task<string>
        GetNextReleaseAsync()
    {
        var codes = await _context
            .Set<DeploymentEntity>()
            .AsNoTracking()
            .Where(x => x.Kind == "Deploy" && x.Code.StartsWith("R-"))
            .Select(x => x.Code)
            .ToListAsync();

        var last = codes
            .Select(code => int.TryParse(code.Substring(2), out var n) ? n : 0)
            .DefaultIfEmpty(0)
            .Max();

        return $"R-{last + 1:0000}";
    }


    //===========================================================
    // Create (job started)
    //===========================================================

    public async Task<long>
        CreateAsync(DeploymentEntity entity)
    {
        const long userId = 1;

        entity.IsActive = true;
        entity.IsDeleted = false;
        entity.Status = true;
        entity.CreatedBy = userId;
        entity.CreatedDate = DateTime.UtcNow;

        if (entity.DeployStatus != "Draft")
        {
            entity.StartedDate ??= DateTime.UtcNow;
        }

        entity.Name = Cut(Ascii(entity.Name), 200);
        entity.ReleaseNotes = Ascii(entity.ReleaseNotes);
        entity.WhatsNew = Ascii(entity.WhatsNew);
        entity.ChangeType = ChangeTypeOf(entity.ChangeType);
        entity.Version = Cut(entity.Version, 20);
        entity.Remarks = Cut(Ascii(entity.Remarks), 1000);
        entity.CommitMessage = Cut(Ascii(entity.CommitMessage), 500);

        await _context.Set<DeploymentEntity>().AddAsync(entity);

        await _context.SaveChangesAsync();

        AddHistory(
            entity.Id,
            entity.Kind,
            entity.DeployStatus == "Draft"
                ? "Draft Created"
                : entity.Kind == "Rollback" ? "Rollback Started" : "Deployment Started",
            entity.DeployStatus == "Draft"
                ? $"{entity.Code} for {entity.ServerName} prepared.\nCommit: {Short(entity.CommitHash)} {entity.CommitMessage}"
                : entity.Kind == "Rollback"
                    ? $"Rollback of {entity.ServerName} to {entity.Code} started."
                    : $"{entity.Code} to {entity.ServerName} started.\nCommit: {Short(entity.CommitHash)} {entity.CommitMessage}");

        await _context.SaveChangesAsync();

        return entity.Id;
    }


    //===========================================================
    // Draft : Update / Delete
    //===========================================================

    public async Task<bool>
        UpdateDraftAsync(DeploymentEntity entity)
    {
        var existing = await _context
            .Set<DeploymentEntity>()
            .FirstOrDefaultAsync(x => x.Id == entity.Id && !x.IsDeleted);

        if (existing is null || existing.DeployStatus != "Draft")
        {
            return false;
        }

        existing.Name = Cut(Ascii(entity.Name), 200);
        existing.ServerManagementId = entity.ServerManagementId;
        existing.ServerName = Cut(Ascii(entity.ServerName), 200);
        existing.ReleaseNotes = Ascii(entity.ReleaseNotes);
        existing.WhatsNew = Ascii(entity.WhatsNew);
        existing.ChangeType = ChangeTypeOf(entity.ChangeType);
        existing.Remarks = Cut(Ascii(entity.Remarks), 1000);
        existing.Branch = Cut(entity.Branch, 100);
        existing.CommitHash = Cut(entity.CommitHash, 64);
        existing.CommitMessage = Cut(Ascii(entity.CommitMessage), 500);
        existing.ModifiedBy = 1;
        existing.ModifiedDate = DateTime.UtcNow;

        AddHistory(
            existing.Id,
            existing.Kind,
            "Draft Updated",
            $"{existing.Code} for {existing.ServerName}.\nCommit: {Short(existing.CommitHash)} {existing.CommitMessage}");

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool>
        DeleteDraftAsync(long id)
    {
        var existing = await _context
            .Set<DeploymentEntity>()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (existing is null || existing.DeployStatus != "Draft")
        {
            return false;
        }

        existing.IsDeleted = true;
        existing.IsActive = false;
        existing.ModifiedBy = 1;
        existing.ModifiedDate = DateTime.UtcNow;

        AddHistory(existing.Id, existing.Kind, "Draft Deleted", $"{existing.Code} for {existing.ServerName} deleted.");

        await _context.SaveChangesAsync();

        return true;
    }


    //===========================================================
    // Draft -> Running
    //===========================================================

    public async Task
        StartAsync(DeploymentEntity entity)
    {
        var existing = await _context
            .Set<DeploymentEntity>()
            .FirstOrDefaultAsync(x => x.Id == entity.Id && !x.IsDeleted);

        if (existing is null)
        {
            return;
        }

        existing.DeployStatus = "Running";
        existing.Version = Cut(entity.Version, 20);
        existing.Step = "Starting";
        existing.Percent = 0;
        existing.StartedDate = entity.StartedDate ?? DateTime.UtcNow;
        existing.FinishedDate = null;
        existing.DurationSeconds = 0;
        existing.PerformedByName = Cut(Ascii(entity.PerformedByName), 200);
        existing.Log = string.Empty;
        existing.ModifiedBy = 1;
        existing.ModifiedDate = DateTime.UtcNow;

        AddHistory(
            existing.Id,
            existing.Kind,
            "Deployment Started",
            $"{existing.Code} to {existing.ServerName} started by {existing.PerformedByName}.");

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Last successful deployment on a server
    //===========================================================

    public async Task<DeploymentEntity?>
        GetLastSucceededAsync(long serverManagementId)
    {
        return await _context
            .Set<DeploymentEntity>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted
                     && x.Kind == "Deploy"
                     && x.DeployStatus == "Succeeded"
                     && x.ServerManagementId == serverManagementId)
            .OrderByDescending(x => x.StartedDate)
            .Select(x => new DeploymentEntity
            {
                Id = x.Id,
                Code = x.Code,
                CommitHash = x.CommitHash,
                Version = x.Version
            })
            .FirstOrDefaultAsync();
    }


    //===========================================================
    // Version history : successful deployments with a version
    //===========================================================

    public async Task<IReadOnlyList<DeploymentEntity>>
        GetVersionHistoryAsync()
    {
        return await _context
            .Set<DeploymentEntity>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted
                     && x.Kind == "Deploy"
                     && x.DeployStatus == "Succeeded"
                     && x.Version != "")
            .OrderByDescending(x => x.FinishedDate ?? x.StartedDate)
            .Select(x => new DeploymentEntity
            {
                Id = x.Id,
                Code = x.Code,
                Version = x.Version,
                ChangeType = x.ChangeType,
                WhatsNew = x.WhatsNew,
                StartedDate = x.StartedDate,
                FinishedDate = x.FinishedDate
            })
            .Take(200)
            .ToListAsync();
    }


    private static string ChangeTypeOf(string? value)
    {
        return (value ?? string.Empty).Trim().ToLowerInvariant() switch
        {
            "fix" => "Fix",
            "major" => "Major",
            _ => "Feature"
        };
    }


    //===========================================================
    // Save Progress / Result
    //===========================================================

    public async Task
        SaveProgressAsync(DeploymentEntity entity)
    {
        var existing = await _context
            .Set<DeploymentEntity>()
            .FirstOrDefaultAsync(x => x.Id == entity.Id);

        if (existing is null)
        {
            return;
        }

        var wasRunning = existing.DeployStatus == "Running";

        existing.Name = Cut(entity.Name, 200);
        existing.CommitHash = Cut(entity.CommitHash, 64);
        existing.CommitMessage = Cut(entity.CommitMessage, 500);
        existing.DeployStatus = Cut(entity.DeployStatus, 30);
        existing.Step = Cut(entity.Step, 300);
        existing.Percent = Math.Clamp(entity.Percent, 0, 100);
        existing.AgentJobId = Cut(entity.AgentJobId, 64);
        existing.BackupFile = Cut(entity.BackupFile, 400);
        existing.PreviousRelease = Cut(entity.PreviousRelease, 30);
        existing.PackageMb = entity.PackageMb;
        existing.FinishedDate = entity.FinishedDate;
        existing.DurationSeconds = entity.DurationSeconds;
        existing.Log = entity.Log ?? string.Empty;
        existing.ModifiedBy = 1;
        existing.ModifiedDate = DateTime.UtcNow;

        if (wasRunning && existing.DeployStatus != "Running")
        {
            AddHistory(
                existing.Id,
                existing.Kind,
                $"{(existing.Kind == "Rollback" ? "Rollback" : "Deployment")} {existing.DeployStatus}",
                $"{existing.Code} on {existing.ServerName}: {existing.DeployStatus} after {existing.DurationSeconds} s.\n{existing.Step}"
                + (string.IsNullOrEmpty(existing.BackupFile) ? string.Empty : $"\nBackup: {existing.BackupFile}"));
        }

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Close jobs interrupted by an API restart
    //===========================================================

    public async Task<int>
        CloseInterruptedAsync()
    {
        var stuck = await _context
            .Set<DeploymentEntity>()
            .Where(x => !x.IsDeleted && x.DeployStatus == "Running")
            .ToListAsync();

        foreach (var row in stuck)
        {
            row.DeployStatus = "Failed";
            row.Step = "Stopped: the API was restarted while this job ran. Check the server (Test Connection / Releases).";
            row.FinishedDate = DateTime.UtcNow;
            row.ModifiedDate = DateTime.UtcNow;
        }

        if (stuck.Count > 0)
        {
            await _context.SaveChangesAsync();
        }

        return stuck.Count;
    }


    //===========================================================
    // Helpers
    //===========================================================

    private void AddHistory(long entityId, string type, string title, string description)
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = ModuleName,
                EntityName = EntityName,
                EntityId = entityId,
                ActivityType = type,
                ActivityTitle = title,
                ActivityDescription = description,
                PerformedBy = 1,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });
    }

    private static string Short(string hash) =>
        string.IsNullOrEmpty(hash) ? string.Empty : hash.Length > 7 ? hash.Substring(0, 7) : hash;

    // the database is WIN1252 : other letters -> '?'
    private static string Ascii(string? text)
    {
        if (string.IsNullOrEmpty(text))
        {
            return string.Empty;
        }

        return new string(text.Replace("\r", string.Empty).Select(c => c == '\n' || c == '\t' || (c >= ' ' && c <= '~') ? c : '?').ToArray());
    }

    private static string Cut(string? text, int max)
    {
        text ??= string.Empty;

        return text.Length <= max ? text : text.Substring(0, max);
    }
}
