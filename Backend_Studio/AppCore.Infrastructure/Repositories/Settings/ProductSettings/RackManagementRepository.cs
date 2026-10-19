//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ProductSettings;

using RackManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.RackManagement;

using SparePartLocationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SparePartLocations;

using SparePartsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SpareParts;

using AccessoryLocationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.AccessoryLocations;

using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;

using WarehousesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Warehouses;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using AppCore.Infrastructure.Persistence;
using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ProductSettings;


//===============================================================
// Rack Management Repository
//
// Warehouse : must exist; new racks need an active warehouse.
//             Locked after saving. The rack's BranchId is copied
//             from the warehouse.
// Code      : R-nnn per warehouse, always generated here; deleted
//             rows count, so a number is never reused.
// Name      : "Rack A", "Rack B" … built here, read-only. The
//             lowest letter not used by a live rack of the
//             warehouse, so a deleted rack's letter is reused.
//             After Z : AA, AB … Unique within the warehouse.
// Shelves   : 1 … 50, shown as SLF-<letter>-nn (SLF-A-01 …).
//             Lowering the count is refused while a spare part
//             sits on a shelf that would be removed.
// Type      : Open Shelf / Closed Cabinet / Bin Rack / Pallet Rack
//             (optional).
// Delete    : refused (409) while any spare part uses the rack.
//===============================================================

public class RackManagementRepository : IRackManagementRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string CodePrefix =
        "R";

    private const string NamePrefix =
        "Rack ";

    private const int MaxShelves =
        50;

    private static readonly string[] RackTypes =
        new[]
        {
            "Open Shelf",
            "Closed Cabinet",
            "Bin Rack",
            "Pallet Rack"
        };


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public RackManagementRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Live spare part locations (parts not deleted)
    //===========================================================

    private IQueryable<SparePartLocationsEntity> LiveLocations()
    {
        return
            from l in _context.Set<SparePartLocationsEntity>().AsNoTracking()

            join p in _context.Set<SparePartsEntity>().AsNoTracking()
                on l.SparePartId equals p.SparePartId

            where !p.IsDeleted

            select l;
    }


    //===========================================================
    // Live accessory locations (accessories not deleted)
    //
    // A shelf holds one item : a spare part OR an accessory, so
    // both kinds count as "placed" on a rack.
    //===========================================================

    private IQueryable<AccessoryLocationsEntity> LiveAccessoryLocations()
    {
        return
            from l in _context.Set<AccessoryLocationsEntity>().AsNoTracking()

            join a in _context.Set<AccessoriesEntity>().AsNoTracking()
                on l.AccessoryId equals a.AccessoryId

            where !a.IsDeleted

            select l;
    }


    //===========================================================
    // Query (with branch / warehouse names and parts placed)
    //===========================================================

    private IQueryable<RackManagementDto> RackManagementQuery()
    {
        // Captured as a variable so EF inlines it as a sub query
        IQueryable<SparePartLocationsEntity> liveLocations =
            LiveLocations();

        IQueryable<AccessoryLocationsEntity> liveAccessoryLocations =
            LiveAccessoryLocations();

        return
            from x in _context.Set<RackManagementEntity>().AsNoTracking()

            where !x.IsDeleted

            join w in _context.Set<WarehousesEntity>().AsNoTracking()
                on x.WarehouseId equals w.WarehouseId into wj
            from w in wj.DefaultIfEmpty()

            join b in _context.Set<BranchesEntity>().AsNoTracking()
                on x.BranchId equals b.BranchId into bj
            from b in bj.DefaultIfEmpty()

            select new RackManagementDto
            {
                RackManagementId =
                    x.RackManagementId,

                BranchId =
                    x.BranchId,

                BranchName =
                    b != null ? b.BranchName : string.Empty,

                WarehouseId =
                    x.WarehouseId,

                WarehouseCode =
                    w != null ? w.WarehouseCode : string.Empty,

                WarehouseName =
                    w != null ? w.WarehouseName : string.Empty,

                RackCode =
                    x.RackCode,

                FullRackCode =
                    w != null
                        ? w.WarehouseCode + "-" + x.RackCode
                        : x.RackCode,

                RackName =
                    x.RackName,

                ShelfCount =
                    x.ShelfCount,

                ZoneAisle =
                    x.ZoneAisle,

                RackType =
                    x.RackType,

                // Spare parts + accessories placed on the rack
                PartsPlaced =
                    liveLocations
                        .Count
                        (
                            l =>
                                l.RackManagementId ==
                                x.RackManagementId
                        )
                    +
                    liveAccessoryLocations
                        .Count
                        (
                            l =>
                                l.RackManagementId ==
                                x.RackManagementId
                        ),

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
            };
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<RackManagementDto>>
        GetAllAsync()
    {
        return await RackManagementQuery()
            .OrderBy
            (
                x =>
                    x.WarehouseCode
            )
            .ThenBy
            (
                x =>
                    x.RackCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<RackManagementDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await RackManagementQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.RackManagementId ==
                    id
            );
    }


    //===========================================================
    // Warehouse
    //===========================================================

    private async Task<WarehousesEntity>
        ResolveWarehouseAsync
        (
            long warehouseId,
            bool forNewRack
        )
    {
        if
        (
            warehouseId <=
            0
        )
        {
            throw new InvalidOperationException(
                "Warehouse is required.");
        }

        WarehousesEntity? warehouse =
            await _context
                .Set<WarehousesEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.WarehouseId ==
                        warehouseId
                        &&
                        !x.IsDeleted
                );

        if
        (
            warehouse ==
            null
        )
        {
            throw new InvalidOperationException(
                "The selected Warehouse was not found. It may have been deleted.");
        }

        if
        (
            forNewRack
            &&
            !warehouse.IsActive
        )
        {
            throw new InvalidOperationException(
                $"Warehouse '{warehouse.WarehouseName}' is inactive.");
        }

        return warehouse;
    }


    //===========================================================
    // Next Code (per warehouse; deleted rows included)
    //===========================================================

    private async Task<string>
        GetNextCodeAsync
        (
            long warehouseId
        )
    {
        List<string> codes =
            await _context
                .Set<RackManagementEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.WarehouseId ==
                        warehouseId
                )
                .Select
                (
                    x =>
                        x.RackCode
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
            string[] parts =
                (code ?? string.Empty)
                    .Trim()
                    .Split(
                        '-',
                        StringSplitOptions.RemoveEmptyEntries);

            if
            (
                parts.Length == 2
                &&
                string.Equals(
                    parts[0].Trim(),
                    CodePrefix,
                    StringComparison.OrdinalIgnoreCase)
                &&
                int.TryParse(
                    parts[1].Trim(),
                    out int number)
                &&
                number > highest
            )
            {
                highest =
                    number;
            }
        }

        return $"{CodePrefix}-{highest + 1:D3}";
    }


    //===========================================================
    // Rack Letters : 0 → A … 25 → Z, 26 → AA, 27 → AB …
    //===========================================================

    private static string LetterFor
    (
        int index
    )
    {
        string letters =
            string.Empty;

        int n =
            index + 1;

        while
        (
            n > 0
        )
        {
            n--;

            letters =
                (char)('A' + n % 26)
                +
                letters;

            n /=
                26;
        }

        return letters;
    }


    // "Rack B" → "B" (anything else → '')
    public static string RackLetter
    (
        string? rackName
    )
    {
        string name =
            (rackName ?? string.Empty).Trim();

        return name.StartsWith(
                NamePrefix,
                StringComparison.OrdinalIgnoreCase)
            ? name[NamePrefix.Length..].Trim().ToUpperInvariant()
            : string.Empty;
    }


    // SLF-A-03
    public static string ShelfLabel
    (
        string? rackName,
        int shelfNumber
    )
    {
        string letter =
            RackLetter(
                rackName);

        return string.IsNullOrEmpty(letter)
            ? $"SLF-{shelfNumber:D2}"
            : $"SLF-{letter}-{shelfNumber:D2}";
    }


    //===========================================================
    // Next Name : lowest free letter among live racks of the
    // warehouse (deleted racks free their letter)
    //===========================================================

    private async Task<string>
        GetNextNameAsync
        (
            long warehouseId
        )
    {
        List<string> names =
            await _context
                .Set<RackManagementEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.WarehouseId ==
                        warehouseId
                        &&
                        !x.IsDeleted
                )
                .Select
                (
                    x =>
                        x.RackName
                )
                .ToListAsync();

        HashSet<string> used =
            names
                .Select(RackLetter)
                .Where(x => x.Length > 0)
                .ToHashSet();

        int index =
            0;

        while
        (
            used.Contains(
                LetterFor(index))
        )
        {
            index++;
        }

        return $"{NamePrefix}{LetterFor(index)}";
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<RackManagementDefaultsDto>
        GetDefaultsAsync
        (
            long warehouseId
        )
    {
        if
        (
            warehouseId <=
            0
        )
        {
            return new RackManagementDefaultsDto();
        }

        WarehousesEntity warehouse =
            await ResolveWarehouseAsync(
                warehouseId,
                false);

        string code =
            await GetNextCodeAsync(
                warehouseId);

        return new RackManagementDefaultsDto
        {
            Code =
                code,

            FullCode =
                $"{warehouse.WarehouseCode}-{code}",

            Name =
                await GetNextNameAsync(
                    warehouseId)
        };
    }


    //===========================================================
    // Normalize Input
    //===========================================================

    private static (int Shelves, string Zone, string Type)
        Normalize
        (
            int shelfCount,
            string? zoneAisle,
            string? rackType
        )
    {
        if
        (
            shelfCount < 1
            ||
            shelfCount > MaxShelves
        )
        {
            throw new InvalidOperationException(
                $"Number of Shelves must be between 1 and {MaxShelves}.");
        }

        string zone =
            zoneAisle?.Trim()
            ??
            string.Empty;

        if
        (
            zone.Length >
            100
        )
        {
            throw new InvalidOperationException(
                "Zone / Aisle cannot be longer than 100 characters.");
        }

        string type =
            string.IsNullOrWhiteSpace(rackType)
                ? string.Empty
                : RackTypes.FirstOrDefault
                  (
                      x =>
                          string.Equals(
                              x,
                              rackType.Trim(),
                              StringComparison.OrdinalIgnoreCase)
                  )
                  ??
                  throw new InvalidOperationException(
                      $"Rack Type must be one of: {string.Join(", ", RackTypes)}.");

        return
        (
            shelfCount,
            zone,
            type
        );
    }


    //===========================================================
    // Duplicate Check (non-deleted rows only, per warehouse)
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            long warehouseId,
            string code,
            string name,
            long excludeId
        )
    {
        string codeKey =
            code.Trim().ToLower();

        string nameKey =
            name.Trim().ToLower();

        RackManagementEntity? sameCode =
            await _context
                .Set<RackManagementEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.RackManagementId != excludeId
                        &&
                        x.WarehouseId == warehouseId
                        &&
                        x.RackCode.ToLower() == codeKey
                );

        if
        (
            sameCode !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Rack Code '{code}' is already used by '{sameCode.RackName}' in this warehouse.");
        }

        RackManagementEntity? sameName =
            await _context
                .Set<RackManagementEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.RackManagementId != excludeId
                        &&
                        x.WarehouseId == warehouseId
                        &&
                        x.RackName.ToLower() == nameKey
                );

        if
        (
            sameName !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Rack '{name}' already exists in this warehouse ({sameName.RackCode}).");
        }
    }


    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory
    (
        RackManagementEntity entity,
        string activityType,
        string verb,
        long userId
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Product Settings",

                EntityName =
                    "RackManagement",

                EntityId =
                    entity.RackManagementId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Rack {verb}",

                ActivityDescription =
                    $"Rack '{entity.RackName}' ({entity.RackCode}) {verb.ToLower()}.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );
    }


    //===========================================================
    // Create (code always generated here)
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateRackManagementDto dto,
            long userId
        )
    {
        WarehousesEntity warehouse =
            await ResolveWarehouseAsync(
                dto.WarehouseId,
                true);

        (int shelves, string zone, string type) =
            Normalize(
                dto.ShelfCount,
                dto.ZoneAisle,
                dto.RackType);

        string code =
            await GetNextCodeAsync(
                warehouse.WarehouseId);

        // "Rack A", "Rack B" … (the form's name is only a preview)
        string name =
            await GetNextNameAsync(
                warehouse.WarehouseId);

        await EnsureUniqueAsync(
            warehouse.WarehouseId,
            code,
            name,
            0);

        RackManagementEntity entity =
            new RackManagementEntity
            {
                BranchId =
                    warehouse.BranchId,

                WarehouseId =
                    warehouse.WarehouseId,

                RackCode =
                    code,

                RackName =
                    name,

                ShelfCount =
                    shelves,

                ZoneAisle =
                    zone,

                RackType =
                    type,

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
            .Set<RackManagementEntity>()
            .Add(
                entity);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        return entity.RackManagementId;
    }


    //===========================================================
    // Update (warehouse, code and name locked)
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateRackManagementDto dto,
            long userId
        )
    {
        RackManagementEntity? entity =
            await _context
                .Set<RackManagementEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.RackManagementId ==
                        dto.RackManagementId
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
                "Rack not found.");
        }

        if
        (
            dto.WarehouseId > 0
            &&
            dto.WarehouseId != entity.WarehouseId
        )
        {
            throw new InvalidOperationException(
                "Warehouse cannot be changed after saving.");
        }

        (int shelves, string zone, string type) =
            Normalize(
                dto.ShelfCount,
                dto.ZoneAisle,
                dto.RackType);


        //=======================================================
        // Fewer shelves : no part may sit on a removed shelf
        //=======================================================

        if
        (
            shelves <
            entity.ShelfCount
        )
        {
            List<int> usedShelves =
                (
                    await LiveLocations()
                        .Where
                        (
                            l =>
                                l.RackManagementId ==
                                entity.RackManagementId
                                &&
                                l.ShelfNumber >
                                shelves
                        )
                        .Select
                        (
                            l =>
                                l.ShelfNumber
                        )
                        .ToListAsync()
                )
                .Concat
                (
                    await LiveAccessoryLocations()
                        .Where
                        (
                            l =>
                                l.RackManagementId ==
                                entity.RackManagementId
                                &&
                                l.ShelfNumber >
                                shelves
                        )
                        .Select
                        (
                            l =>
                                l.ShelfNumber
                        )
                        .ToListAsync()
                )
                .Distinct()
                .OrderBy
                (
                    n =>
                        n
                )
                .ToList();

            if
            (
                usedShelves.Count >
                0
            )
            {
                throw new InvalidOperationException(
                    $"Number of Shelves cannot be lowered to {shelves}: items (spare parts / accessories) are placed on " +
                    $"{string.Join(", ", usedShelves.Select(n => ShelfLabel(entity.RackName, n)))}. Move them first.");
            }
        }

        // Name is read-only after creation
        entity.ShelfCount =
            shelves;

        entity.ZoneAisle =
            zone;

        entity.RackType =
            type;

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

        AddHistory(
            entity,
            "Update",
            "Updated",
            userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Delete (409 while spare parts use the rack)
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        RackManagementEntity? entity =
            await _context
                .Set<RackManagementEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.RackManagementId ==
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
                "Rack not found.");
        }

        int partsPlaced =
            await LiveLocations()
                .CountAsync
                (
                    l =>
                        l.RackManagementId ==
                        id
                )
            +
            await LiveAccessoryLocations()
                .CountAsync
                (
                    l =>
                        l.RackManagementId ==
                        id
                );

        if
        (
            partsPlaced >
            0
        )
        {
            throw new InvalidOperationException(
                $"Rack '{entity.RackName}' cannot be deleted because {partsPlaced} item(s) (spare parts / accessories) are placed on it. " +
                "Move them to another rack first.");
        }

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Delete",
            "Deleted",
            userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore (latest deleted; 409 while its warehouse is deleted
    // or its code / name is taken)
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        RackManagementEntity? entity =
            await _context
                .Set<RackManagementEntity>()
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

        try
        {
            await ResolveWarehouseAsync(
                entity.WarehouseId,
                false);

            await EnsureUniqueAsync(
                entity.WarehouseId,
                entity.RackCode,
                entity.RackName,
                entity.RackManagementId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Rack '{entity.RackName}' cannot be restored. {ex.Message} " +
                "Its letter may have been reused by a newer rack.");
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

        AddHistory(
            entity,
            "Restore",
            "Restored",
            userId);

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
            .Set<RackManagementEntity>()
            .AnyAsync
            (
                x =>
                    x.RackManagementId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}