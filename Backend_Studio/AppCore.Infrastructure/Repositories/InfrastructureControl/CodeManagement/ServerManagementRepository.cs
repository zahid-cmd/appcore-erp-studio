//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.ActivityHistory.DTOs;

using AppCore.Domain.Common;

using AppCore.Infrastructure.Persistence;

using global::AppCore.Application.InfrastructureControl.CodeManagement;

using ServerEntity = global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.ServerManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.InfrastructureControl.CodeManagement;


//===============================================================
// ServerManagementRepository
//
// Live servers for the Deployment Center. The agent token arrives
// here already encrypted (the API encrypts / decrypts it).
//===============================================================

public class ServerManagementRepository
    : IServerManagementRepository
{
    private const string ModuleName = "InfrastructureControl";

    private const string EntityName = "ServerManagement";

    private readonly AppDbContext _context;

    public ServerManagementRepository(AppDbContext context)
    {
        _context = context;
    }


    //===========================================================
    // Get All / By Id
    //===========================================================

    public async Task<IReadOnlyList<ServerEntity>>
        GetAllAsync()
    {
        return await _context
            .Set<ServerEntity>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.Code)
            .ToListAsync();
    }

    public async Task<ServerEntity?>
        GetByIdAsync(long id)
    {
        return await _context
            .Set<ServerEntity>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
    }


    //===========================================================
    // Next Code (SRV-0001), deleted rows included
    //===========================================================

    public async Task<string>
        GetNextCodeAsync()
    {
        var codes = await _context
            .Set<ServerEntity>()
            .AsNoTracking()
            .Where(x => x.Code.StartsWith("SRV-"))
            .Select(x => x.Code)
            .ToListAsync();

        var last = codes
            .Select(code => int.TryParse(code.Substring(4), out var n) ? n : 0)
            .DefaultIfEmpty(0)
            .Max();

        return $"SRV-{last + 1:0000}";
    }


    //===========================================================
    // Duplicate host + port
    //===========================================================

    public async Task<string?>
        FindDuplicateHostAsync(string hostAddress, int agentPort, long exceptId)
    {
        var host = (hostAddress ?? string.Empty).Trim().ToLower();

        return await _context
            .Set<ServerEntity>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted
                     && x.Id != exceptId
                     && x.AgentPort == agentPort
                     && x.HostAddress.ToLower() == host)
            .Select(x => x.Code + " - " + x.Name)
            .FirstOrDefaultAsync();
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync(ServerEntity entity)
    {
        const long userId = 1;

        entity.Code = await GetNextCodeAsync();
        entity.IsActive = true;
        entity.IsDeleted = false;
        entity.CreatedBy = userId;
        entity.CreatedDate = DateTime.UtcNow;
        entity.ModifiedBy = null;
        entity.ModifiedDate = null;

        await _context.Set<ServerEntity>().AddAsync(entity);

        await _context.SaveChangesAsync();

        AddHistory(
            entity.Id,
            "Create",
            "Server Created",
            $"Server {entity.Code} '{entity.Name}' ({entity.HostAddress}:{entity.AgentPort}) was added.");

        await _context.SaveChangesAsync();

        return entity.Id;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync(ServerEntity entity)
    {
        const long userId = 1;

        var existing = await _context
            .Set<ServerEntity>()
            .FirstOrDefaultAsync(x => x.Id == entity.Id && !x.IsDeleted)
            ?? throw new InvalidOperationException("Server record was not found.");

        var changes = new List<string>();

        void Track(string label, string from, string to)
        {
            if (!string.Equals(from ?? string.Empty, to ?? string.Empty, StringComparison.Ordinal))
            {
                changes.Add($"{label}: {(string.IsNullOrEmpty(from) ? "-" : from)} -> {(string.IsNullOrEmpty(to) ? "-" : to)}");
            }
        }

        Track("Name", existing.Name, entity.Name);
        Track("Host", existing.HostAddress, entity.HostAddress);
        Track("Agent port", existing.AgentPort.ToString(), entity.AgentPort.ToString());
        Track("App URL", existing.AppUrl, entity.AppUrl);
        Track("Environment", existing.Environment, entity.Environment);
        Track("Status", existing.Status ? "Active" : "Inactive", entity.Status ? "Active" : "Inactive");

        if (!string.Equals(existing.AgentToken, entity.AgentToken, StringComparison.Ordinal))
        {
            // never write the token itself into history
            changes.Add("Agent token: changed");
        }

        existing.Name = entity.Name;
        existing.HostAddress = entity.HostAddress;
        existing.AgentPort = entity.AgentPort;
        existing.AgentToken = entity.AgentToken;
        existing.AppUrl = entity.AppUrl;
        existing.Environment = entity.Environment;
        existing.Status = entity.Status;
        existing.Remarks = entity.Remarks;
        existing.ModifiedBy = userId;
        existing.ModifiedDate = DateTime.UtcNow;

        AddHistory(
            existing.Id,
            "Update",
            "Server Updated",
            changes.Count == 0
                ? $"Server {existing.Code} '{existing.Name}' was saved (no field changed)."
                : $"Server {existing.Code} '{existing.Name}':\n" + string.Join("\n", changes));

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Save Test Connection result
    //===========================================================

    public async Task
        SaveCheckResultAsync(long id, ServerConnectionTestDto result)
    {
        var existing = await _context
            .Set<ServerEntity>()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (existing is null)
        {
            return;
        }

        existing.LastCheckedDate = DateTime.UtcNow;
        existing.LastCheckStatus = Cut(result.Status, 30);
        existing.LastCheckMessage = Cut(result.Message, 500);

        if (result.Success)
        {
            existing.AgentVersion = Cut(result.AgentVersion, 30);
            existing.CurrentRelease = Cut(result.CurrentRelease, 30);
        }

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Delete / Restore
    //===========================================================

    public async Task
        DeleteAsync(long id)
    {
        const long userId = 1;

        var entity = await _context
            .Set<ServerEntity>()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (entity is null)
        {
            return;
        }

        entity.IsDeleted = true;
        entity.IsActive = false;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(
            entity.Id,
            "Delete",
            "Server Deleted",
            $"Server {entity.Code} '{entity.Name}' was deleted.");

        await _context.SaveChangesAsync();
    }

    public async Task
        RestoreAsync(long id)
    {
        var entity = await _context
            .Set<ServerEntity>()
            .FirstOrDefaultAsync(x => x.Id == id && x.IsDeleted);

        if (entity is not null)
        {
            await RestoreEntityAsync(entity);
        }
    }

    public async Task<bool>
        RestoreLastDeletedAsync()
    {
        var entity = await _context
            .Set<ServerEntity>()
            .Where(x => x.IsDeleted)
            .OrderByDescending(x => x.ModifiedDate ?? x.CreatedDate)
            .FirstOrDefaultAsync();

        if (entity is null)
        {
            return false;
        }

        await RestoreEntityAsync(entity);

        return true;
    }

    private async Task RestoreEntityAsync(ServerEntity entity)
    {
        const long userId = 1;

        entity.IsDeleted = false;
        entity.IsActive = true;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(
            entity.Id,
            "Restore",
            "Server Restored",
            $"Server {entity.Code} '{entity.Name}' was restored.");

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // History
    //===========================================================

    public async Task<IReadOnlyList<ActivityHistoryDto>>
        GetHistoryAsync()
    {
        return await HistoryQuery(null);
    }

    public async Task<IReadOnlyList<ActivityHistoryDto>>
        GetEntityHistoryAsync(long id)
    {
        return await HistoryQuery(id);
    }

    private async Task<List<ActivityHistoryDto>> HistoryQuery(long? id)
    {
        return await _context.ActivityHistories
            .AsNoTracking()
            .Where(x => x.Module == ModuleName
                     && x.EntityName == EntityName
                     && (id == null || x.EntityId == id))
            .OrderByDescending(x => x.PerformedDate)
            .Select(x => new ActivityHistoryDto
            {
                Id = x.Id,
                Module = x.Module,
                EntityName = x.EntityName,
                EntityId = x.EntityId,
                ActivityType = x.ActivityType,
                ActivityTitle = x.ActivityTitle,
                ActivityDescription = x.ActivityDescription,
                PerformedBy = x.PerformedBy,
                PerformedByName = x.PerformedByName,
                PerformedDate = x.PerformedDate
            })
            .ToListAsync();
    }


    //===========================================================
    // Public Id -> internal id (live rows only)
    //===========================================================

    public async Task<long?>
        GetIdByPublicIdAsync(Guid publicId)
    {
        if (publicId == Guid.Empty)
        {
            return null;
        }

        return await _context
            .Set<ServerEntity>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.PublicId == publicId)
            .Select(x => (long?)x.Id)
            .FirstOrDefaultAsync();
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

    private static string Cut(string? text, int max)
    {
        text ??= string.Empty;

        return text.Length <= max ? text : text.Substring(0, max);
    }
}
