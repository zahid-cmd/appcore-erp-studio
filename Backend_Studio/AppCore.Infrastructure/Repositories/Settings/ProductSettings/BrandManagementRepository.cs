//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ProductSettings;
using AppCore.Application.Settings.ProductSettings.BrandManagement.DTOs;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.ProductSettings;


//===============================================================
// Brand Management Repository
//
// Code      : BRAND-nnn, always generated here (the form's code
//             is only a preview). Deleted rows are counted, so a
//             number is never reused.
// Name      : required, unique among non-deleted brands.
// Remarks   : optional.
// Image     : path only; the file is saved / removed by the
//             controller ({id}/image).
//===============================================================

public class BrandManagementRepository : IBrandManagementRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string CodePrefix =
        "BRAND";


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public BrandManagementRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Query
    //===========================================================

    private IQueryable<BrandManagementDto> BrandManagementQuery()
    {
        return _context
            .Set<BrandManagementEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new BrandManagementDto
                    {
                        BrandManagementId =
                            x.BrandManagementId,

                        BrandCode =
                            x.BrandCode,

                        BrandName =
                            x.BrandName,

                        BrandImagePath =
                            x.BrandImagePath,

                        Remarks =
                            x.Remarks,

                        Status =
                            x.Status,

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

    public async Task<List<BrandManagementDto>>
        GetAllAsync()
    {
        return await BrandManagementQuery()
            .OrderBy
            (
                x =>
                    x.BrandCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<BrandManagementDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await BrandManagementQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.BrandManagementId ==
                    id
            );
    }


    //===========================================================
    // Get Next Code (deleted rows included → never reused)
    //===========================================================

    public async Task<string>
        GetNextCodeAsync()
    {
        List<string> codes =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .Select
                (
                    x =>
                        x.BrandCode
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
    // Get Defaults
    //===========================================================

    public async Task<BrandManagementDefaultsDto>
        GetDefaultsAsync()
    {
        return new BrandManagementDefaultsDto
        {
            Code =
                await GetNextCodeAsync()
        };
    }


    //===========================================================
    // Normalize Name
    //===========================================================

    private static string NormalizeName
    (
        string? brandName
    )
    {
        string name =
            brandName?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(name)
        )
        {
            throw new InvalidOperationException(
                "Brand Name is required.");
        }

        if
        (
            name.Length >
            200
        )
        {
            throw new InvalidOperationException(
                "Brand Name cannot be longer than 200 characters.");
        }

        return name;
    }


    //===========================================================
    // Duplicate Check (non-deleted rows only)
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            string code,
            string name,
            long excludeId
        )
    {
        string codeKey =
            code.Trim().ToLower();

        string nameKey =
            name.Trim().ToLower();

        BrandManagementEntity? sameCode =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.BrandManagementId != excludeId
                        &&
                        x.BrandCode.ToLower() == codeKey
                );

        if
        (
            sameCode !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Brand Code '{code}' is already used by '{sameCode.BrandName}'.");
        }

        BrandManagementEntity? sameName =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.BrandManagementId != excludeId
                        &&
                        x.BrandName.ToLower() == nameKey
                );

        if
        (
            sameName !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Brand '{name}' already exists ({sameName.BrandCode}).");
        }
    }


    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory
    (
        BrandManagementEntity entity,
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
                    "BrandManagement",

                EntityId =
                    entity.BrandManagementId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Brand {verb}",

                ActivityDescription =
                    $"Brand '{entity.BrandName}' ({entity.BrandCode}) {verb.ToLower()}.",

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
            CreateBrandManagementDto dto,
            long userId
        )
    {
        string brandName =
            NormalizeName(
                dto.BrandName);

        string brandCode =
            await GetNextCodeAsync();

        await EnsureUniqueAsync(
            brandCode,
            brandName,
            0);

        BrandManagementEntity entity =
            new BrandManagementEntity
            {
                BrandCode =
                    brandCode,

                BrandName =
                    brandName,

                BrandImagePath =
                    string.Empty,

                Remarks =
                    dto.Remarks?.Trim()
                    ??
                    string.Empty,

                Status =
                    dto.Status,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };

        _context
            .Set<BrandManagementEntity>()
            .Add(
                entity);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        return entity.BrandManagementId;
    }


    //===========================================================
    // Update (code locked)
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateBrandManagementDto dto,
            long userId
        )
    {
        BrandManagementEntity? entity =
            await _context
                .Set<BrandManagementEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.BrandManagementId ==
                        dto.BrandManagementId
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
                "Brand not found.");
        }

        string brandName =
            NormalizeName(
                dto.BrandName);

        await EnsureUniqueAsync(
            entity.BrandCode,
            brandName,
            entity.BrandManagementId);

        entity.BrandName =
            brandName;

        entity.Remarks =
            dto.Remarks?.Trim()
            ??
            string.Empty;

        entity.Status =
            dto.Status;

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
    // Set Image Path
    //
    // Stores the new path ('' clears it) and returns the old one.
    //===========================================================

    public async Task<string>
        SetImagePathAsync
        (
            long id,
            string imagePath,
            long userId
        )
    {
        BrandManagementEntity? entity =
            await _context
                .Set<BrandManagementEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.BrandManagementId ==
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
                "Brand not found.");
        }

        string oldPath =
            entity.BrandImagePath
            ??
            string.Empty;

        entity.BrandImagePath =
            imagePath
            ??
            string.Empty;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return oldPath;
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
        BrandManagementEntity? entity =
            await _context
                .Set<BrandManagementEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.BrandManagementId ==
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
                "Brand not found.");
        }

        //=======================================================
        // Dependency : Product Categories (409)
        //=======================================================

        List<string> categoryNames =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.BrandManagementId ==
                        id
                        &&
                        !x.IsDeleted
                )
                .OrderBy
                (
                    x =>
                        x.CategoryCode
                )
                .Select
                (
                    x =>
                        x.CategoryName
                )
                .ToListAsync();

        if
        (
            categoryNames.Count >
            0
        )
        {
            throw new InvalidOperationException(
                $"Brand '{entity.BrandName}' cannot be deleted because it is used by " +
                $"{categoryNames.Count} product categor{(categoryNames.Count == 1 ? "y" : "ies")} " +
                $"({string.Join(", ", categoryNames)}).");
        }

        // TODO (Motor Bikes rebuild): also block while products use this brand.

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
    // Restore (latest deleted; blocked while code / name taken)
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        BrandManagementEntity? entity =
            await _context
                .Set<BrandManagementEntity>()
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
            await EnsureUniqueAsync(
                entity.BrandCode,
                entity.BrandName,
                entity.BrandManagementId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Brand '{entity.BrandName}' cannot be restored. {ex.Message}");
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
            .Set<BrandManagementEntity>()
            .AnyAsync
            (
                x =>
                    x.BrandManagementId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}