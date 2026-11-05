//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.Paging;
using AppCore.Application.Settings.ProductSettings;
using AppCore.Domain.Common;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Persistence.Paging;

using BikeModelsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeModels;
using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;
using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;


//===============================================================
// Namespace (as registered by Code Synchronization)
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ProductSettings;


//===============================================================
// Bike Models Repository
//
// Code      : BMD-0001, given on save (deleted rows count, never
//             reused). Never changes.
// Brand     : required; must exist; an inactive brand only when
//             the model already has it.
// Name      : typed, unique within the brand (case-insensitive,
//             non-deleted rows).
// Bike Type : one of BikeTypes (checked here).
//===============================================================

public class BikeModelsRepository : IBikeModelsRepository
{
    private const string HistoryModule = "Product Settings";

    private const string HistoryEntity = "BikeModels";

    private const string CodePrefix = "BMD";

    // Fixed list (the form shows it from Defaults)
    public static readonly string[] BikeTypes =
    {
        "Scooter",
        "Commuter",
        "Sports",
        "Cruiser",
        "Electric Bike",
        "Electric Scooter",
        "Off-road"
    };


    private readonly AppDbContext _context;


    public BikeModelsRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    private DbSet<BikeModelsEntity> Models =>
        _context.Set<BikeModelsEntity>();



    //===========================================================
    // Query (live rows, with the brand)
    //===========================================================

    private IQueryable<BikeModelsDto> BikeModelsQuery()
    {
        return
            from x in Models.AsNoTracking()
            where !x.IsDeleted
            join b in _context.Set<BrandManagementEntity>().AsNoTracking()
                on x.BrandManagementId equals b.BrandManagementId into brands
            from b in brands.DefaultIfEmpty()
            select new BikeModelsDto
            {
                BikeModelId = x.BikeModelId,
                PublicId = x.PublicId,
                ModelCode = x.ModelCode,
                BrandManagementId = x.BrandManagementId,
                BrandCode = b != null ? b.BrandCode : string.Empty,
                BrandName = b != null ? b.BrandName : string.Empty,
                ModelName = x.ModelName,
                BikeType = x.BikeType,
                ShowOnWebsite = x.ShowOnWebsite,
                IsFeatured = x.IsFeatured,
                Tagline = x.Tagline,
                Description = x.Description,
                DisplayOrder = x.DisplayOrder,
                Remarks = x.Remarks,
                Status = x.Status,
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
    // Get All (brand, then display order, then name)
    //===========================================================

    public async Task<List<BikeModelsDto>> GetAllAsync()
    {
        return await BikeModelsQuery()
            .OrderBy(x => x.BrandName)
            .ThenBy(x => x.DisplayOrder)
            .ThenBy(x => x.ModelName)
            .ToListAsync();
    }



    //===========================================================
    // Get Paged (the list page)
    //
    // Search on the list query, the counts for the summary line,
    // then the status, the total and one page.
    //===========================================================

    private static SortMap<BikeModelsDto> ListSorts()
    {
        return new SortMap<BikeModelsDto>("ModelCode")
            .Add("ModelCode", x => x.ModelCode)
            .Add("BrandName", x => x.BrandName)
            .Add("ModelName", x => x.ModelName)
            .Add("BikeType", x => x.BikeType)
            .Add("ShowOnWebsite", x => x.ShowOnWebsite)
            .Add("IsFeatured", x => x.IsFeatured)
            .Add("DisplayOrder", x => x.DisplayOrder)
            .Add("Status", x => x.Status)
            .Tie(x => x.BikeModelId);
    }

    public async Task<PagedResult<BikeModelsDto>> GetPagedAsync
    (
        BikeModelsPageRequest request
    )
    {
        IQueryable<BikeModelsDto> query =
            BikeModelsQuery();

        //-------------------------------------------------------
        // Search (case-insensitive "contains")
        //-------------------------------------------------------

        string search =
            request.SafeSearch;

        if (search.Length > 0)
        {
            string like =
                PagingQuery.LikePattern(search);

            query =
                query.Where
                (
                    x =>
                        EF.Functions.ILike(x.ModelCode, like) ||
                        EF.Functions.ILike(x.ModelName, like) ||
                        EF.Functions.ILike(x.BrandName, like) ||
                        EF.Functions.ILike(x.BikeType, like) ||
                        EF.Functions.ILike(x.Tagline, like) ||
                        EF.Functions.ILike(x.Remarks, like)
                );
        }

        //-------------------------------------------------------
        // Brand / Bike Type filters
        //-------------------------------------------------------

        if (request.BrandManagementId > 0)
        {
            long brandId = request.BrandManagementId.Value;

            query = query.Where(x => x.BrandManagementId == brandId);
        }

        string bikeType =
            request.BikeType?.Trim() ?? string.Empty;

        if (bikeType.Length > 0)
        {
            query = query.Where(x => x.BikeType == bikeType);
        }

        //-------------------------------------------------------
        // Summary counts (search and filters applied; not the
        // status)
        //-------------------------------------------------------

        int countAll =
            await query.CountAsync();

        int countActive =
            await query.CountAsync(x => x.Status);

        Dictionary<string, int> summaryCounts =
            new()
            {
                ["Total"] = countAll,
                ["Active"] = countActive,
                ["Inactive"] = countAll - countActive
            };

        //-------------------------------------------------------
        // Status
        //-------------------------------------------------------

        if (request.Status.HasValue)
        {
            bool active =
                request.Status.Value;

            query =
                query.Where(x => x.Status == active);
        }

        //-------------------------------------------------------
        // Total, then the page
        //-------------------------------------------------------

        int total =
            await query.CountAsync();

        PagingQuery.FitPage(
            request,
            total);

        List<BikeModelsDto> rows =
            await ListSorts()
                .Apply(query, request)
                .Page(request)
                .ToListAsync();

        return new PagedResult<BikeModelsDto>
        {
            Items = rows,
            TotalCount = total,
            Page = request.SafePage,
            PageSize = request.SafePageSize,
            Counts = summaryCounts
        };
    }



    //===========================================================
    // Public Id -> internal id (live rows only)
    //===========================================================

    public async Task<long?> GetIdByPublicIdAsync
    (
        Guid publicId
    )
    {
        if (publicId == Guid.Empty)
        {
            return null;
        }

        return await Models
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.PublicId == publicId)
            .Select(x => (long?)x.BikeModelId)
            .FirstOrDefaultAsync();
    }


    public async Task<BikeModelsDto?> GetByIdAsync
    (
        long id
    )
    {
        return await BikeModelsQuery()
            .FirstOrDefaultAsync(x => x.BikeModelId == id);
    }


    public async Task<bool> ExistsAsync
    (
        long id
    )
    {
        return await Models
            .AnyAsync(x => x.BikeModelId == id && !x.IsDeleted);
    }



    //===========================================================
    // Next Code : highest BMD-nnnn (deleted rows count) + 1
    //===========================================================

    public async Task<string> GetNextCodeAsync()
    {
        List<string> codes =
            await Models
                .AsNoTracking()
                .Select(x => x.ModelCode)
                .ToListAsync();

        int highest = 0;

        foreach (string code in codes)
        {
            if (string.IsNullOrWhiteSpace(code)) continue;

            string[] parts = code.Split('-', StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length != 2) continue;

            if (!string.Equals(parts[0].Trim(), CodePrefix, StringComparison.OrdinalIgnoreCase)) continue;

            if (int.TryParse(parts[1].Trim(), out int sequenceNo) && sequenceNo > highest)
                highest = sequenceNo;
        }

        return $"{CodePrefix}-{highest + 1:D4}";
    }


    public async Task<BikeModelsDefaultsDto> GetDefaultsAsync()
    {
        List<BikeModelBrandOptionDto> brands =
            await _context.Set<BrandManagementEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status)
                .OrderBy(x => x.BrandName)
                .Select(
                    x =>
                        new BikeModelBrandOptionDto
                        {
                            BrandManagementId = x.BrandManagementId,
                            BrandCode = x.BrandCode,
                            BrandName = x.BrandName,
                            Status = x.Status
                        })
                .ToListAsync();

        // Last saved model (created or edited) : its type is
        // pre-selected for the next new model
        string lastBikeType =
            await _context.Set<BikeModelsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.ModifiedDate ?? x.CreatedDate)
                .ThenByDescending(x => x.BikeModelId)
                .Select(x => x.BikeType)
                .FirstOrDefaultAsync()
            ?? string.Empty;

        if (!BikeTypes.Contains(lastBikeType))
        {
            lastBikeType = string.Empty;
        }

        return new BikeModelsDefaultsDto
        {
            Code = await GetNextCodeAsync(),
            Brands = brands,
            BikeTypes = BikeTypes.ToList(),
            LastBikeType = lastBikeType
        };
    }



    //===========================================================
    // Checks shared by create / update
    //===========================================================

    private sealed record CleanInput
    (
        BrandManagementEntity Brand,
        string ModelName,
        string BikeType,
        string Tagline,
        string Description,
        int DisplayOrder,
        string Remarks
    );


    private static string Squeeze(string? value) =>
        string.Join(" ", (value ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries));


    private async Task<CleanInput> CleanAsync
    (
        long brandId,
        string? modelName,
        string? bikeType,
        string? tagline,
        string? description,
        int displayOrder,
        string? remarks,
        long? currentBrandId
    )
    {
        if (brandId <= 0)
        {
            throw new InvalidOperationException("Brand is required.");
        }

        BrandManagementEntity brand =
            await _context.Set<BrandManagementEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.BrandManagementId == brandId && !x.IsDeleted)
            ?? throw new InvalidOperationException("The selected Brand was not found. It may have been deleted.");

        if (!brand.Status && brandId != currentBrandId)
        {
            throw new InvalidOperationException($"Brand '{brand.BrandName}' is inactive.");
        }

        string name =
            Squeeze(modelName);

        if (name.Length == 0)
        {
            throw new InvalidOperationException("Model Name is required.");
        }

        if (name.Length > 150)
        {
            throw new InvalidOperationException("Model Name cannot be longer than 150 characters.");
        }

        string type =
            BikeTypes.FirstOrDefault(x => string.Equals(x, (bikeType ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException($"Choose the Bike Type : {string.Join(", ", BikeTypes)}.");

        string line =
            Squeeze(tagline);

        if (line.Length > 200)
        {
            throw new InvalidOperationException("Short Tagline cannot be longer than 200 characters.");
        }

        string text =
            (description ?? string.Empty).Trim();

        if (text.Length > 2000)
        {
            throw new InvalidOperationException("Description cannot be longer than 2000 characters.");
        }

        if (displayOrder < 0 || displayOrder > 9999)
        {
            throw new InvalidOperationException("Display Order must be between 0 and 9999.");
        }

        string note =
            (remarks ?? string.Empty).Trim();

        if (note.Length > 1000)
        {
            throw new InvalidOperationException("Remarks cannot be longer than 1000 characters.");
        }

        return new CleanInput(brand, name, type, line, text, displayOrder, note);
    }


    // Model Name unique within the brand (non-deleted rows)
    private async Task EnsureUniqueAsync
    (
        long brandId,
        string name,
        string brandName,
        long excludeId
    )
    {
        string key =
            name.Trim().ToLower();

        bool taken =
            await Models
                .AsNoTracking()
                .AnyAsync(
                    x =>
                        !x.IsDeleted
                        && x.BikeModelId != excludeId
                        && x.BrandManagementId == brandId
                        && x.ModelName.ToLower() == key);

        if (taken)
        {
            throw new InvalidOperationException($"{brandName} already has a model named '{name}'.");
        }
    }


    private void AddHistory
    (
        BikeModelsEntity entity,
        string activityType,
        string verb,
        string brandName,
        long userId
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = entity.BikeModelId,
                ActivityType = activityType,
                ActivityTitle = $"Bike Model {verb}",
                ActivityDescription = $"Bike model {entity.ModelCode} '{brandName} {entity.ModelName}' {verb.ToLower()}.",
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });
    }



    //===========================================================
    // Create
    //===========================================================

    public async Task<long> CreateAsync
    (
        CreateBikeModelsDto dto,
        long userId
    )
    {
        CleanInput input =
            await CleanAsync(dto.BrandManagementId, dto.ModelName, dto.BikeType, dto.Tagline, dto.Description, dto.DisplayOrder, dto.Remarks, null);

        await EnsureUniqueAsync(input.Brand.BrandManagementId, input.ModelName, input.Brand.BrandName, 0);

        BikeModelsEntity entity =
            new()
            {
                ModelCode = await GetNextCodeAsync(),
                BrandManagementId = input.Brand.BrandManagementId,
                ModelName = input.ModelName,
                BikeType = input.BikeType,
                ShowOnWebsite = dto.ShowOnWebsite,
                IsFeatured = dto.IsFeatured,
                Tagline = input.Tagline,
                Description = input.Description,
                DisplayOrder = input.DisplayOrder,
                Remarks = input.Remarks,
                Status = dto.Status,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        Models.Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(entity, "Create", "Created", input.Brand.BrandName, userId);

        await _context.SaveChangesAsync();

        return entity.BikeModelId;
    }



    //===========================================================
    // Update (Model Code never changes)
    //===========================================================

    public async Task UpdateAsync
    (
        UpdateBikeModelsDto dto,
        long userId
    )
    {
        BikeModelsEntity entity =
            await Models.FirstOrDefaultAsync(x => x.BikeModelId == dto.BikeModelId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Bike model not found.");

        CleanInput input =
            await CleanAsync(dto.BrandManagementId, dto.ModelName, dto.BikeType, dto.Tagline, dto.Description, dto.DisplayOrder, dto.Remarks, entity.BrandManagementId);

        await EnsureUniqueAsync(input.Brand.BrandManagementId, input.ModelName, input.Brand.BrandName, entity.BikeModelId);

        entity.BrandManagementId = input.Brand.BrandManagementId;
        entity.ModelName = input.ModelName;
        entity.BikeType = input.BikeType;
        entity.ShowOnWebsite = dto.ShowOnWebsite;
        entity.IsFeatured = dto.IsFeatured;
        entity.Tagline = input.Tagline;
        entity.Description = input.Description;
        entity.DisplayOrder = input.DisplayOrder;
        entity.Remarks = input.Remarks;
        entity.Status = dto.Status;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity, "Update", "Updated", input.Brand.BrandName, userId);

        await _context.SaveChangesAsync();
    }



    //===========================================================
    // Delete (soft)
    //===========================================================

    private async Task<string> BrandNameAsync(long brandId)
    {
        return await _context.Set<BrandManagementEntity>()
            .AsNoTracking()
            .Where(x => x.BrandManagementId == brandId)
            .Select(x => x.BrandName)
            .FirstOrDefaultAsync()
            ?? string.Empty;
    }


    public async Task DeleteAsync
    (
        long id,
        long userId
    )
    {
        BikeModelsEntity entity =
            await Models.FirstOrDefaultAsync(x => x.BikeModelId == id && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Bike model not found.");

        // Blocked while a Product Sub Category is linked to it
        string? linkedTo =
            await _context.Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .Where(x => x.BikeModelId == id && !x.IsDeleted)
                .Select(x => x.SubCategoryName)
                .FirstOrDefaultAsync();

        if (linkedTo != null)
        {
            throw new InvalidOperationException(
                $"Bike model '{entity.ModelName}' cannot be deleted because it is linked to product sub category '{linkedTo}'.");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity, "Delete", "Deleted", await BrandNameAsync(entity.BrandManagementId), userId);

        await _context.SaveChangesAsync();
    }



    //===========================================================
    // Restore (the most recently deleted)
    //===========================================================

    public async Task<bool> RestoreAsync
    (
        long userId
    )
    {
        BikeModelsEntity? entity =
            await Models
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        string brandName =
            await BrandNameAsync(entity.BrandManagementId);

        bool brandLive =
            await _context.Set<BrandManagementEntity>()
                .AsNoTracking()
                .AnyAsync(x => x.BrandManagementId == entity.BrandManagementId && !x.IsDeleted);

        if (!brandLive)
        {
            throw new InvalidOperationException(
                $"Bike model '{entity.ModelName}' cannot be restored : its brand was deleted.");
        }

        try
        {
            await EnsureUniqueAsync(entity.BrandManagementId, entity.ModelName, brandName, entity.BikeModelId);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException(
                $"Bike model '{entity.ModelName}' cannot be restored. {ex.Message}");
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity, "Restore", "Restored", brandName, userId);

        await _context.SaveChangesAsync();

        return true;
    }
}
