//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.GeneralSettings;

using BusinessConfigurationEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.BusinessConfiguration;

using WingBusinessLinesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.WingBusinessLines;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using WingsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Wings;

using AppCore.Infrastructure.Persistence;
using AppCore.Domain.Common;

// BusinessLineAccess (shared helper)
using AppCore.Infrastructure.Repositories.Settings.GeneralSettings;


//===============================================================
// Namespace
//
// Same namespace the Code Synchronization DI registration uses
// (DependencyInjection.cs : ...Configurations.Settings.GeneralSettings)
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.GeneralSettings;


//===============================================================
// Business Configuration Repository
//
// Core lines : per wing (WingBusinessLines), always on for every
//              branch of the wing, set on "Wing Core Business".
// Extra lines: per branch (BusinessConfigurations), granted on top
//              of the core lines :
//                Fixed      no end date, until revoked
//                Temporary  Valid From → Valid Until (required)
//              One live grant per branch + line. Branch and line
//              are locked after saving. Revoke = soft delete.
// Errors     : 400 create / update, 404 not found, 409 restore.
//===============================================================

public class BusinessConfigurationRepository : IBusinessConfigurationRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public BusinessConfigurationRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Get All (extra grants, with wing / branch names)
    //===========================================================

    public async Task<List<BusinessConfigurationDto>>
        GetAllAsync()
    {
        DateOnly today =
            BusinessLineAccess.Today();

        var rows =
            await
            (
                from x in _context.Set<BusinessConfigurationEntity>().AsNoTracking()

                where !x.IsDeleted

                join b in _context.Set<BranchesEntity>().AsNoTracking()
                    on x.BranchId equals b.BranchId into bj
                from b in bj.DefaultIfEmpty()

                join w in _context.Set<WingsEntity>().AsNoTracking()
                    on x.WingId equals w.WingId into wj
                from w in wj.DefaultIfEmpty()

                select new
                {
                    Entity = x,

                    WingCode = w != null ? w.WingCode : string.Empty,

                    WingName = w != null ? w.WingName : string.Empty,

                    BranchCode = b != null ? b.BranchCode : string.Empty,

                    BranchName = b != null ? b.BranchName : string.Empty
                }
            )
            .ToListAsync();

        return rows
            .Select
            (
                r =>
                    ToDto(
                        r.Entity,
                        r.WingCode,
                        r.WingName,
                        r.BranchCode,
                        r.BranchName,
                        today)
            )
            .OrderBy(x => x.BranchCode)
            .ThenBy(x => Array.IndexOf(BusinessLineAccess.Lines, x.BusinessLine))
            .ToList();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<BusinessConfigurationDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return
        (
            await GetAllAsync()
        )
        .FirstOrDefault
        (
            x =>
                x.BusinessConfigurationId ==
                id
        );
    }


    private static BusinessConfigurationDto ToDto
    (
        BusinessConfigurationEntity x,
        string wingCode,
        string wingName,
        string branchCode,
        string branchName,
        DateOnly today
    )
    {
        return new BusinessConfigurationDto
        {
            BusinessConfigurationId = x.BusinessConfigurationId,

            CompanyId = x.CompanyId,

            WingId = x.WingId,

            WingCode = wingCode,

            WingName = wingName,

            BranchId = x.BranchId,

            BranchCode = branchCode,

            BranchName = branchName,

            BusinessLine = x.BusinessLine,

            AccessType = x.AccessType,

            ValidFrom = x.ValidFrom,

            ValidUntil = x.ValidUntil,

            State =
                BusinessLineAccess.GrantState(
                    x,
                    today),

            IsCurrentlyActive =
                BusinessLineAccess.IsGrantActive(
                    x,
                    today),

            Remarks = x.Remarks,

            IsActive = x.IsActive,

            IsDeleted = x.IsDeleted,

            DeletedBy = x.DeletedBy,

            DeletedDate = x.DeletedDate,

            CreatedBy = x.CreatedBy,

            CreatedDate = x.CreatedDate,

            ModifiedBy = x.ModifiedBy,

            ModifiedDate = x.ModifiedDate
        };
    }


    //===========================================================
    // Validate a grant (create / update)
    //===========================================================

    private sealed class ValidGrant
    {
        public BranchesEntity Branch { get; init; } = null!;

        public string BusinessLine { get; init; } = string.Empty;

        public string AccessType { get; init; } = string.Empty;

        public DateOnly? ValidFrom { get; init; }

        public DateOnly? ValidUntil { get; init; }
    }


    private async Task<ValidGrant>
        ValidateAsync
        (
            long branchId,
            string? businessLine,
            string? accessType,
            DateOnly? validFrom,
            DateOnly? validUntil,
            long excludeId
        )
    {
        //=======================================================
        // Branch
        //=======================================================

        if (branchId <= 0)
        {
            throw new InvalidOperationException(
                "Branch is required.");
        }

        BranchesEntity? branch =
            await _context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.BranchId ==
                        branchId
                        &&
                        !x.IsDeleted
                );

        if (branch == null)
        {
            throw new InvalidOperationException(
                "The selected Branch was not found. It may have been deleted.");
        }


        //=======================================================
        // Business Line (not a core line of the branch's wing)
        //=======================================================

        string line =
            BusinessLineAccess.Canonical(
                businessLine)
            ??
            throw new InvalidOperationException(
                $"Business Line is required ({string.Join(", ", BusinessLineAccess.Lines)}).");

        bool isCore =
            await _context
                .Set<WingBusinessLinesEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        x.WingId ==
                        branch.WingId
                        &&
                        x.BusinessLine ==
                        line
                );

        if (isCore)
        {
            throw new InvalidOperationException(
                $"{line} is already a core business of {branch.BranchName}'s wing; it does not need a grant.");
        }


        //=======================================================
        // Access Type + dates
        //=======================================================

        string type =
            string.Equals(
                accessType?.Trim(),
                BusinessLineAccess.Temporary,
                StringComparison.OrdinalIgnoreCase)
                ? BusinessLineAccess.Temporary
                : string.Equals(
                    accessType?.Trim(),
                    BusinessLineAccess.Fixed,
                    StringComparison.OrdinalIgnoreCase)
                    ? BusinessLineAccess.Fixed
                    : throw new InvalidOperationException(
                        "Access Type is required (Fixed or Temporary).");

        DateOnly? from =
            validFrom;

        DateOnly? until =
            validUntil;

        if (type == BusinessLineAccess.Fixed)
        {
            // Fixed : no end date
            until =
                null;
        }
        else
        {
            if (until == null)
            {
                throw new InvalidOperationException(
                    "Valid Until is required for Temporary access.");
            }

            if (from != null && until < from)
            {
                throw new InvalidOperationException(
                    "Valid Until cannot be before Valid From.");
            }
        }


        //=======================================================
        // One live grant per branch + line
        //=======================================================

        bool taken =
            await _context
                .Set<BusinessConfigurationEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.BusinessConfigurationId !=
                        excludeId
                        &&
                        x.BranchId ==
                        branchId
                        &&
                        x.BusinessLine ==
                        line
                );

        if (taken)
        {
            throw new InvalidOperationException(
                $"{branch.BranchName} already has a {line} grant. Edit that grant instead.");
        }

        return new ValidGrant
        {
            Branch = branch,

            BusinessLine = line,

            AccessType = type,

            ValidFrom = from,

            ValidUntil = until
        };
    }


    //===========================================================
    // Create (grant)
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateBusinessConfigurationDto dto,
            long userId
        )
    {
        ValidGrant grant =
            await ValidateAsync(
                dto.BranchId,
                dto.BusinessLine,
                dto.AccessType,
                dto.ValidFrom,
                dto.ValidUntil,
                0);

        BusinessConfigurationEntity entity =
            new()
            {
                CompanyId =
                    grant.Branch.CompanyId,

                WingId =
                    grant.Branch.WingId,

                BranchId =
                    grant.Branch.BranchId,

                BusinessLine =
                    grant.BusinessLine,

                AccessType =
                    grant.AccessType,

                ValidFrom =
                    grant.ValidFrom,

                ValidUntil =
                    grant.ValidUntil,

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
            .Set<BusinessConfigurationEntity>()
            .Add(
                entity);

        await _context.SaveChangesAsync();

        AddHistory(
            entity.BusinessConfigurationId,
            "Create",
            "Business Granted",
            $"{grant.BusinessLine} granted to {grant.Branch.BranchName} ({Period(entity)}).",
            userId);

        await _context.SaveChangesAsync();

        return entity.BusinessConfigurationId;
    }


    //===========================================================
    // Update (access type, dates, remarks, status)
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateBusinessConfigurationDto dto,
            long userId
        )
    {
        BusinessConfigurationEntity? entity =
            await _context
                .Set<BusinessConfigurationEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.BusinessConfigurationId ==
                        dto.BusinessConfigurationId
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Business grant not found.");
        }

        // Branch and line are locked after saving
        if
        (
            dto.BranchId != entity.BranchId
            ||
            !string.Equals(
                BusinessLineAccess.Canonical(dto.BusinessLine),
                entity.BusinessLine,
                StringComparison.Ordinal)
        )
        {
            throw new InvalidOperationException(
                "Branch and Business Line cannot be changed after saving. Revoke this grant and add a new one.");
        }

        ValidGrant grant =
            await ValidateAsync(
                entity.BranchId,
                entity.BusinessLine,
                dto.AccessType,
                dto.ValidFrom,
                dto.ValidUntil,
                entity.BusinessConfigurationId);

        entity.AccessType =
            grant.AccessType;

        entity.ValidFrom =
            grant.ValidFrom;

        entity.ValidUntil =
            grant.ValidUntil;

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

        AddHistory(
            entity.BusinessConfigurationId,
            "Update",
            "Business Grant Updated",
            $"{entity.BusinessLine} for {grant.Branch.BranchName} updated ({Period(entity)}, {(entity.IsActive ? "Active" : "Inactive")}).",
            userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Delete = Revoke
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        BusinessConfigurationEntity? entity =
            await _context
                .Set<BusinessConfigurationEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.BusinessConfigurationId ==
                        id
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Business grant not found.");
        }

        string branchName =
            await BranchNameAsync(
                entity.BranchId);

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            DateTime.UtcNow;

        AddHistory(
            entity.BusinessConfigurationId,
            "Delete",
            "Business Revoked",
            $"{entity.BusinessLine} revoked from {branchName}.",
            userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore (latest revoked grant)
    //
    // 409 when the branch is gone, the line has become core, or
    // a new grant for the same branch + line exists.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        BusinessConfigurationEntity? entity =
            await _context
                .Set<BusinessConfigurationEntity>()
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

        if (entity == null)
        {
            return false;
        }

        try
        {
            await ValidateAsync(
                entity.BranchId,
                entity.BusinessLine,
                entity.AccessType,
                entity.ValidFrom,
                entity.ValidUntil,
                entity.BusinessConfigurationId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"The {entity.BusinessLine} grant cannot be restored. {ex.Message}");
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

        AddHistory(
            entity.BusinessConfigurationId,
            "Restore",
            "Business Grant Restored",
            $"{entity.BusinessLine} grant restored for {await BranchNameAsync(entity.BranchId)}.",
            userId);

        await _context.SaveChangesAsync();

        return true;
    }


    //===========================================================
    // Wing Core Business : read
    //===========================================================

    public async Task<List<WingBusinessLinesDto>>
        GetWingLinesAsync()
    {
        Dictionary<long, List<string>> core =
            await BusinessLineAccess.CoreLinesByWingAsync(
                _context);

        List<WingsEntity> wings =
            await _context
                .Set<WingsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                )
                .OrderBy
                (
                    x =>
                        x.WingCode
                )
                .ToListAsync();

        return wings
            .Select
            (
                w =>
                    new WingBusinessLinesDto
                    {
                        WingId = w.WingId,

                        WingCode = w.WingCode,

                        WingName = w.WingName,

                        IsActive = w.IsActive,

                        BusinessLines =
                            core.TryGetValue(w.WingId, out List<string>? lines)
                                ? lines
                                : new List<string>()
                    }
            )
            .ToList();
    }


    //===========================================================
    // Wing Core Business : save (replace the wing's lines)
    //===========================================================

    public async Task
        UpdateWingLinesAsync
        (
            UpdateWingBusinessLinesDto dto,
            long userId
        )
    {
        WingsEntity? wing =
            await _context
                .Set<WingsEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.WingId ==
                        dto.WingId
                        &&
                        !x.IsDeleted
                );

        if (wing == null)
        {
            throw new KeyNotFoundException(
                "Wing not found.");
        }

        List<string> lines =
            new();

        foreach (string? value in dto.BusinessLines ?? new List<string>())
        {
            string line =
                BusinessLineAccess.Canonical(
                    value)
                ??
                throw new InvalidOperationException(
                    $"Unknown Business Line '{value}'.");

            if (!lines.Contains(line))
            {
                lines.Add(line);
            }
        }

        if (lines.Count == 0)
        {
            throw new InvalidOperationException(
                $"Wing '{wing.WingName}' needs at least one core business line.");
        }

        List<WingBusinessLinesEntity> existing =
            await _context
                .Set<WingBusinessLinesEntity>()
                .Where
                (
                    x =>
                        x.WingId ==
                        wing.WingId
                )
                .ToListAsync();

        string before =
            string.Join(
                ", ",
                BusinessLineAccess.Lines.Where(l => existing.Any(e => e.BusinessLine == l)));

        _context
            .Set<WingBusinessLinesEntity>()
            .RemoveRange(
                existing);

        // Remove first, so the unique (wing, line) index never
        // sees the same line twice
        await _context.SaveChangesAsync();

        foreach (string line in BusinessLineAccess.Lines.Where(lines.Contains))
        {
            _context
                .Set<WingBusinessLinesEntity>()
                .Add
                (
                    new WingBusinessLinesEntity
                    {
                        WingId =
                            wing.WingId,

                        BusinessLine =
                            line,

                        CreatedBy =
                            userId,

                        CreatedDate =
                            DateTime.UtcNow
                    }
                );
        }

        AddHistory(
            wing.WingId,
            "Update",
            "Wing Core Business Updated",
            $"Core business of {wing.WingName}: {(before == string.Empty ? "none" : before)} to {string.Join(", ", BusinessLineAccess.Lines.Where(lines.Contains))}.",
            userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Branch Overview (all four lines of every branch, today)
    //===========================================================

    public async Task<List<BranchBusinessLinesDto>>
        GetBranchOverviewAsync()
    {
        DateOnly today =
            BusinessLineAccess.Today();

        Dictionary<long, List<string>> core =
            await BusinessLineAccess.CoreLinesByWingAsync(
                _context);

        var branches =
            await
            (
                from b in _context.Set<BranchesEntity>().AsNoTracking()

                where !b.IsDeleted

                join w in _context.Set<WingsEntity>().AsNoTracking()
                    on b.WingId equals w.WingId into wj
                from w in wj.DefaultIfEmpty()

                orderby b.BranchCode

                select new
                {
                    b.BranchId,
                    b.BranchCode,
                    b.BranchName,
                    b.IsActive,
                    b.WingId,

                    WingCode = w != null ? w.WingCode : string.Empty,

                    WingName = w != null ? w.WingName : string.Empty
                }
            )
            .ToListAsync();

        List<BusinessConfigurationEntity> grants =
            await _context
                .Set<BusinessConfigurationEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                )
                .ToListAsync();

        List<BranchBusinessLinesDto> result =
            new();

        foreach (var branch in branches)
        {
            List<string> wingLines =
                core.TryGetValue(branch.WingId, out List<string>? lines)
                    ? lines
                    : new List<string>();

            BranchBusinessLinesDto row =
                new()
                {
                    WingId = branch.WingId,

                    WingCode = branch.WingCode,

                    WingName = branch.WingName,

                    BranchId = branch.BranchId,

                    BranchCode = branch.BranchCode,

                    BranchName = branch.BranchName,

                    IsActive = branch.IsActive
                };

            foreach (string line in BusinessLineAccess.Lines)
            {
                BranchLineStatusDto status =
                    new()
                    {
                        BusinessLine =
                            line
                    };

                BusinessConfigurationEntity? grant =
                    grants.FirstOrDefault
                    (
                        g =>
                            g.BranchId == branch.BranchId
                            &&
                            g.BusinessLine == line
                    );

                if (wingLines.Contains(line))
                {
                    status.Source = "Core";

                    status.IsActiveToday = true;
                }
                else if (grant != null)
                {
                    string state =
                        BusinessLineAccess.GrantState(
                            grant,
                            today);

                    status.Source =
                        state == "Active"
                            ? "Granted"
                            : state;

                    status.IsActiveToday =
                        BusinessLineAccess.IsGrantActive(
                            grant,
                            today);

                    status.AccessType =
                        grant.AccessType;

                    status.ValidFrom =
                        grant.ValidFrom;

                    status.ValidUntil =
                        grant.ValidUntil;

                    status.BusinessConfigurationId =
                        grant.BusinessConfigurationId;
                }
                else
                {
                    status.Source = "None";
                }

                row.Lines.Add(status);

                if (status.IsActiveToday)
                {
                    row.ActiveLines.Add(line);
                }
            }

            result.Add(row);
        }

        return result;
    }


    //===========================================================
    // Warehouses allowed for a line today
    //===========================================================

    public async Task<List<AllowedWarehouseDto>>
        GetAllowedWarehousesAsync
        (
            string? businessLine
        )
    {
        if
        (
            !string.IsNullOrWhiteSpace(businessLine)
            &&
            BusinessLineAccess.Canonical(businessLine) == null
        )
        {
            throw new InvalidOperationException(
                $"Unknown Business Line '{businessLine}'.");
        }

        return
        (
            await BusinessLineAccess.WarehousesAsync(
                _context,
                businessLine)
        )
        .Select
        (
            x =>
                new AllowedWarehouseDto
                {
                    WarehouseId = x.WarehouseId,

                    BranchId = x.BranchId,

                    WingId = x.WingId,

                    ActiveLines =
                        BusinessLineAccess.Lines
                            .Where(x.Lines.Contains)
                            .ToList()
                }
        )
        .ToList();
    }


    //===========================================================
    // Helpers
    //===========================================================

    private async Task<string> BranchNameAsync
    (
        long branchId
    )
    {
        return await _context
            .Set<BranchesEntity>()
            .AsNoTracking()
            .Where(x => x.BranchId == branchId)
            .Select(x => x.BranchName)
            .FirstOrDefaultAsync()
            ??
            $"Branch #{branchId}";
    }


    // "Fixed from 2026-10-19" / "Temporary 2026-10-19 to 2026-12-31"
    // (plain ASCII : the database uses WIN1252, which has no "→")
    private static string Period
    (
        BusinessConfigurationEntity x
    )
    {
        string from =
            x.ValidFrom?.ToString("yyyy-MM-dd")
            ??
            "now";

        return x.AccessType == BusinessLineAccess.Fixed
            ? $"Fixed from {from}"
            : $"Temporary {from} to {x.ValidUntil:yyyy-MM-dd}";
    }


    private void AddHistory
    (
        long entityId,
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
                    "General Settings",

                EntityName =
                    "BusinessConfiguration",

                EntityId =
                    entityId,

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
            });
    }
}