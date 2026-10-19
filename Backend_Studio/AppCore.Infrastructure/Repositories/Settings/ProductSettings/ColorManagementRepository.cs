// PAGE-CLONED : Company -> Color Management (cleaned: Wings leftovers removed)
//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ProductSettings;
using AppCore.Application.Settings.ProductSettings.ColorManagement.DTOs;

using ColorManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ColorManagement;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;

using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.ProductSettings;


//===============================================================
// ColorManagement Repository
//===============================================================

public class ColorManagementRepository : IColorManagementRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public ColorManagementRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // ColorManagement Query
    //===========================================================

    private IQueryable<ColorManagementDto> ColorManagementQuery()
    {
        return _context
            .Set<ColorManagementEntity>()

            .AsNoTracking()

            .Where
            (
                x =>
                    !x.IsDeleted
            )

            .Select
            (
                x =>
                    new ColorManagementDto
                    {
                        ColorManagementId =
                            x.ColorManagementId,

                        ColorCode =
                            x.ColorCode,

                        ColorName =
                            x.ColorName,

                        Remarks =
                            x.Remarks,

                        Status =
                            x.Status,

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

    public async Task<List<ColorManagementDto>>
        GetAllAsync()
    {
        return await ColorManagementQuery()

            .OrderBy
            (
                x =>
                    x.ColorCode
            )

            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<ColorManagementDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await ColorManagementQuery()

            .FirstOrDefaultAsync
            (
                x =>
                    x.ColorManagementId ==
                    id
            );
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync()
    {
        List<string> existingCodes =
            await _context.Set<ColorManagementEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => x.ColorCode)
                .ToListAsync();

        int highest = 0;

        foreach (string code in existingCodes)
        {
            if (string.IsNullOrWhiteSpace(code)) continue;

            string[] parts = code.Split('-', StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length != 2) continue;

            if (!string.Equals(parts[0].Trim(), "CLR", StringComparison.OrdinalIgnoreCase)) continue;

            if (int.TryParse(parts[1].Trim(), out int sequenceNo) && sequenceNo > highest)
                highest = sequenceNo;
        }

        return CodeGenerator.GenerateColorManagementCode(highest + 1);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<ColorManagementDefaultsDto>
        GetDefaultsAsync()
    {
        return new ColorManagementDefaultsDto
        {
            Code =
                await GetNextCodeAsync()
        };
    }


    //===========================================================
    // Duplicate Check (code / name, deleted rows ignored)
    //===========================================================

    private async Task EnsureUniqueAsync
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


        bool codeTaken =
            await _context
                .Set<ColorManagementEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.ColorManagementId != excludeId
                        &&
                        x.ColorCode.ToLower() == codeKey
                );

        if
        (
            codeTaken
        )
        {
            throw new InvalidOperationException(
                $"Color code '{code}' already exists."
            );
        }


        bool nameTaken =
            await _context
                .Set<ColorManagementEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.ColorManagementId != excludeId
                        &&
                        x.ColorName.ToLower() == nameKey
                );

        if
        (
            nameTaken
        )
        {
            throw new InvalidOperationException(
                $"Color '{name}' already exists."
            );
        }
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateColorManagementDto dto,

            long userId
        )
    {
        string colorManagementCode =
            dto.ColorCode?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(colorManagementCode)
        )
        {
            colorManagementCode =
                await GetNextCodeAsync();
        }


        string colorName =
            dto.ColorName?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(colorName)
        )
        {
            throw new InvalidOperationException(
                "Color name is required."
            );
        }


        await EnsureUniqueAsync(
            colorManagementCode,
            colorName,
            0
        );


        ColorManagementEntity entity =
            new ColorManagementEntity
            {
                // Save the generated code when none was sent
                ColorCode =
                    colorManagementCode,

                ColorName =
                    colorName,

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
            .Set<ColorManagementEntity>()
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
                    "Product Settings",

                EntityName =
                    "ColorManagement",

                EntityId =
                    entity.ColorManagementId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Color Created",

                ActivityDescription =
                    $"Color '{entity.ColorName}' created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return entity.ColorManagementId;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateColorManagementDto dto,

            long userId
        )
    {
        ColorManagementEntity? entity =

            await _context
                .Set<ColorManagementEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.ColorManagementId ==
                        dto.ColorManagementId

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
                "Color not found."
            );
        }


        string colorCode =
            string.IsNullOrWhiteSpace(dto.ColorCode)
                ? entity.ColorCode
                : dto.ColorCode.Trim();

        string colorName =
            dto.ColorName?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(colorName)
        )
        {
            throw new InvalidOperationException(
                "Color name is required."
            );
        }


        await EnsureUniqueAsync(
            colorCode,
            colorName,
            entity.ColorManagementId
        );


        entity.ColorCode =
            colorCode;

        entity.ColorName =
            colorName;

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


        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(

            new ActivityHistory
            {
                Module =
                    "Product Settings",

                EntityName =
                    "ColorManagement",

                EntityId =
                    entity.ColorManagementId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Color Updated",

                ActivityDescription =
                    $"Color '{entity.ColorName}' updated.",

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
        //===========================================================
        // Resolve ColorManagement
        //===========================================================

        ColorManagementEntity? entity =

            await _context
                .Set<ColorManagementEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.ColorManagementId ==
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
                "Color not found."
            );
        }


        //===========================================================
        // Soft Delete ColorManagement
        //===========================================================

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
                    "Product Settings",

                EntityName =
                    "ColorManagement",

                EntityId =
                    entity.ColorManagementId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Color Deleted",

                ActivityDescription =
                    $"Color '{entity.ColorName}' deleted.",

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
        ColorManagementEntity? entity =

            await _context
                .Set<ColorManagementEntity>()

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


        //===========================================================
        // Restore Blocked : an active color now uses the same
        // code or name
        //===========================================================

        try
        {
            await EnsureUniqueAsync(
                entity.ColorCode,
                entity.ColorName,
                entity.ColorManagementId
            );
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Color '{entity.ColorName}' cannot be restored. {ex.Message}"
            );
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
                    "Product Settings",

                EntityName =
                    "ColorManagement",

                EntityId =
                    entity.ColorManagementId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Color Restored",

                ActivityDescription =
                    $"Color '{entity.ColorName}' restored.",

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
            .Set<ColorManagementEntity>()

            .AnyAsync
            (
                x =>

                    x.ColorManagementId ==
                    id

                    &&

                    !x.IsDeleted
            );
    }
}