//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.GeneralSettings;

using LocationEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Locations;

using CustomerEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.CustomerProfiles;

using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.CodeMaster;
using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.GeneralSettings;


//===============================================================
// Locations Repository
//
// Areas / thanas / upazilas used on customer addresses.
//
// Code         LOC-0001 (central CodeGenerator), highest number
//              used (deleted rows included) + 1, never reused.
// Name         typed, single spaces, unique within its district
//              among live rows (case ignored).
// Display Name "<Location Name>, <District>" e.g. "Mirpur, Dhaka".
// Geography    Division / District from BangladeshGeography; the
//              district must belong to the division.
// Postal Code  optional, 4 digits.
//
// Delete : blocked (409) while a live customer uses the location.
//===============================================================

public class LocationsRepository :
    ILocationsRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const int MaxNameLength =
        100;

    private const string CodePrefix =
        "LOC-";


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public LocationsRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Query
    //===========================================================

    private IQueryable<LocationsDto>
        LocationQuery()
    {
        return _context
            .Set<LocationEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new LocationsDto
                    {
                        LocationId =
                            x.LocationId,

                        LocationCode =
                            x.LocationCode,

                        LocationName =
                            x.LocationName,

                        DisplayName =
                            x.DisplayName,

                        Division =
                            x.Division,

                        District =
                            x.District,

                        PostalCode =
                            x.PostalCode,

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

    public async Task<List<LocationsDto>>
        GetAllAsync()
    {
        return await LocationQuery()
            .OrderBy
            (
                x =>
                    x.LocationCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<LocationsDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await LocationQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.LocationId ==
                    id
            );
    }


    //===========================================================
    // Get Defaults (next code + divisions with districts)
    //===========================================================

    public async Task<LocationsDefaultsDto>
        GetDefaultsAsync()
    {
        return new LocationsDefaultsDto
        {
            NextLocationCode =
                NextLocationCode(
                    await AllCodesAsync()),

            Divisions =
                BangladeshGeography.Divisions
                    .Select
                    (
                        x =>
                            new LocationsDivisionOptionDto
                            {
                                Division =
                                    x.Division,

                                Districts =
                                    x.Districts.ToList()
                            }
                    )
                    .ToList()
        };
    }


    //===========================================================
    // Helpers
    //===========================================================

    // Trim, single spaces
    private static string Clean
    (
        string? value
    )
    {
        return string.Join(
            " ",
            (value ?? string.Empty)
                .Split(
                    ' ',
                    StringSplitOptions.RemoveEmptyEntries));
    }


    private static string BuildDisplayName
    (
        string locationName,
        string district
    )
    {
        return $"{locationName}, {district}";
    }


    //===========================================================
    // Validate input -> (name, division, district, postal code)
    //===========================================================

    private static (string Name, string Division, string District, string PostalCode)
        ValidateInput
        (
            string? locationName,
            string? division,
            string? district,
            string? postalCode
        )
    {
        string name =
            Clean(locationName);

        if
        (
            name.Length == 0
        )
        {
            throw new InvalidOperationException(
                "Location Name is required.");
        }

        if
        (
            name.Length > MaxNameLength
        )
        {
            throw new InvalidOperationException(
                $"Location Name cannot be longer than {MaxNameLength} characters.");
        }

        string? canonicalDivision =
            BangladeshGeography.FindDivision(
                division);

        if
        (
            canonicalDivision == null
        )
        {
            throw new InvalidOperationException(
                "Select a valid Division.");
        }

        string? canonicalDistrict =
            BangladeshGeography.FindDistrict(
                canonicalDivision,
                district);

        if
        (
            canonicalDistrict == null
        )
        {
            throw new InvalidOperationException(
                $"Select a District of {canonicalDivision} Division.");
        }

        string postal =
            (postalCode ?? string.Empty).Trim();

        if
        (
            postal.Length > 0
            &&
            !System.Text.RegularExpressions.Regex.IsMatch(
                postal,
                "^[0-9]{4}$")
        )
        {
            throw new InvalidOperationException(
                "Postal Code must be 4 digits (e.g. 1216), or left empty.");
        }

        return (name, canonicalDivision, canonicalDistrict, postal);
    }


    //===========================================================
    // Code Helpers (LOC-0001, central CodeGenerator)
    //===========================================================

    private static string NextLocationCode
    (
        IEnumerable<string> existingCodes
    )
    {
        int highest =
            existingCodes
                .Where
                (
                    code =>
                        (code ?? string.Empty).StartsWith(
                            CodePrefix,
                            StringComparison.OrdinalIgnoreCase)
                )
                .Select
                (
                    code =>
                        int.TryParse(
                            code.Substring(CodePrefix.Length),
                            out int number)
                            ? number
                            : 0
                )
                .DefaultIfEmpty(0)
                .Max();

        return CodeGenerator.GenerateLocationCode(
            highest + 1);
    }


    // Every code ever used (deleted rows included : never reused)
    private async Task<List<string>>
        AllCodesAsync()
    {
        return await _context
            .Set<LocationEntity>()
            .AsNoTracking()
            .Select
            (
                x =>
                    x.LocationCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Unique Name within the district / Code (live rows)
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            string locationName,
            string district,
            string locationCode,
            long currentId
        )
    {
        string nameKey =
            locationName.ToLower();

        LocationEntity? sameName =
            await _context
                .Set<LocationEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.LocationId != currentId
                        &&
                        x.District == district
                        &&
                        x.LocationName.ToLower() == nameKey
                );

        if
        (
            sameName != null
        )
        {
            throw new InvalidOperationException(
                $"Location '{sameName.LocationName}' already exists in {district} ({sameName.LocationCode}).");
        }

        bool sameCode =
            await _context
                .Set<LocationEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.LocationId != currentId
                        &&
                        x.LocationCode == locationCode
                );

        if
        (
            sameCode
        )
        {
            throw new InvalidOperationException(
                $"Location Code '{locationCode}' is already used.");
        }
    }


    //===========================================================
    // Create
    //
    // The code is always built here; the form's value is only a
    // preview.
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateLocationsDto dto,
            long userId
        )
    {
        (string name, string division, string district, string postal) =
            ValidateInput(
                dto.LocationName,
                dto.Division,
                dto.District,
                dto.PostalCode);

        string code =
            NextLocationCode(
                await AllCodesAsync());

        await EnsureUniqueAsync(
            name,
            district,
            code,
            0);

        LocationEntity entity =
            new LocationEntity
            {
                LocationCode =
                    code,

                LocationName =
                    name,

                DisplayName =
                    BuildDisplayName(
                        name,
                        district),

                Division =
                    division,

                District =
                    district,

                PostalCode =
                    postal,

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
            .Set<LocationEntity>()
            .Add(
                entity);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        return entity.LocationId;
    }


    //===========================================================
    // Update (code is locked)
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateLocationsDto dto,
            long userId
        )
    {
        LocationEntity? entity =
            await _context
                .Set<LocationEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.LocationId ==
                        dto.LocationId
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity == null
        )
        {
            throw new KeyNotFoundException(
                "Location not found.");
        }

        (string name, string division, string district, string postal) =
            ValidateInput(
                dto.LocationName,
                dto.Division,
                dto.District,
                dto.PostalCode);

        await EnsureUniqueAsync(
            name,
            district,
            entity.LocationCode,
            entity.LocationId);

        entity.LocationName =
            name;

        entity.DisplayName =
            BuildDisplayName(
                name,
                district);

        entity.Division =
            division;

        entity.District =
            district;

        entity.PostalCode =
            postal;

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
    // Delete
    //
    // Blocked (409) while a live customer uses this location.
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        LocationEntity? entity =
            await _context
                .Set<LocationEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.LocationId ==
                        id
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity == null
        )
        {
            throw new KeyNotFoundException(
                "Location not found.");
        }

        int customers =
            await _context
                .Set<CustomerEntity>()
                .CountAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.LocationId ==
                        entity.LocationId
                );

        if
        (
            customers > 0
        )
        {
            throw new InvalidOperationException(
                $"Location '{entity.DisplayName}' is used by {customers} customer(s) and cannot be deleted. Make it inactive instead.");
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
    // Restore (most recently deleted row)
    //
    // Blocked (409) while its name is taken in its district.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        LocationEntity? entity =
            await _context
                .Set<LocationEntity>()
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
            entity == null
        )
        {
            return false;
        }

        try
        {
            await EnsureUniqueAsync(
                entity.LocationName,
                entity.District,
                entity.LocationCode,
                entity.LocationId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Location '{entity.DisplayName}' cannot be restored. {ex.Message}");
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
    // Activity History
    //===========================================================

    private void AddHistory
    (
        LocationEntity entity,
        string activityType,
        string verb,
        long userId
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "General Settings",

                EntityName =
                    "Locations",

                EntityId =
                    entity.LocationId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Location {verb}",

                ActivityDescription =
                    $"Location '{entity.DisplayName}' ({entity.LocationCode}) {verb.ToLower()}.",

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
    // Exists
    //===========================================================

    public async Task<bool>
        ExistsAsync
        (
            long id
        )
    {
        return await _context
            .Set<LocationEntity>()
            .AnyAsync
            (
                x =>
                    x.LocationId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}