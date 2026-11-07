//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.Paging;
using AppCore.Application.Settings.ProductSettings;
using AppCore.Domain.Common;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Persistence.Paging;
using AppCore.Infrastructure.Repositories.Settings.ProductSettings;

using SchemesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeAccessorySchemes;

using SchemeModelsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeAccessorySchemeModels;

using SchemeItemsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeAccessorySchemeItems;

using BikeModelsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeModels;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;


//===============================================================
// Namespace (as registered by Code Synchronization)
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ProductSettings;


//===============================================================
// Bike Accessory Schemes Repository
//
// Code    : BAS-0001, given on save (deleted rows count, never
//           reused). Never changes.
// Name    : required, unique among live schemes.
// Kind    : Additional (no end date) / Promotional (From – To).
// Source  : Supplier : Additional / Promotional Accessories
//                      products (zero cost);
//           Company   : For Sale accessories (at cost).
// Models  : one or more bike models of the scheme's brand.
// Items   : one or more accessories, 1–99 per bike, no repeats.
// Overlap : an active model cannot be in two active schemes of
//           the same kind and source on the same day.
//===============================================================

public class BikeAccessorySchemesRepository
    : IBikeAccessorySchemesRepository
{
    private const string HistoryModule = "Product Settings";

    private const string HistoryEntity = "BikeAccessorySchemes";

    private const string CodePrefix = "BAS";

    public const string Additional = "Additional";

    public const string Promotional = "Promotional";

    public const string Supplier = "Supplier";

    public const string Company = "Company";

    public static readonly string[] Kinds = { Additional, Promotional };

    public static readonly string[] Sources = { Supplier, Company };

    private readonly AppDbContext _context;


    public BikeAccessorySchemesRepository(
        AppDbContext context)
    {
        _context = context;
    }


    private DbSet<SchemesEntity> Schemes =>
        _context.Set<SchemesEntity>();

    // Business day (Bangladesh)
    private static DateOnly Today() =>
        DateOnly.FromDateTime(DateTime.UtcNow.AddHours(6));


    //===========================================================
    // Query (live rows, with the brand and the validity today)
    //===========================================================

    private IQueryable<BikeAccessorySchemesDto> SchemesQuery()
    {
        DateOnly today = Today();

        return
            from x in Schemes.AsNoTracking()
            where !x.IsDeleted
            join b in _context.Set<BrandManagementEntity>().AsNoTracking()
                on x.BrandManagementId equals b.BrandManagementId into brands
            from b in brands.DefaultIfEmpty()
            select new BikeAccessorySchemesDto
            {
                BikeAccessorySchemeId = x.BikeAccessorySchemeId,
                PublicId = x.PublicId,
                SchemeCode = x.SchemeCode,
                SchemeName = x.SchemeName,
                SchemeKind = x.SchemeKind,
                SchemeSource = x.SchemeSource,
                BrandManagementId = x.BrandManagementId,
                BrandName = b != null ? b.BrandName : string.Empty,
                ValidFrom = x.ValidFrom,
                ValidTo = x.ValidTo,
                Validity =
                    x.ValidFrom > today
                        ? "Scheduled"
                        : x.ValidTo != null && x.ValidTo < today
                            ? "Expired"
                            : "Running",
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


    // Models and items of the given schemes (+ the texts)
    private async Task AttachChildrenAsync
    (
        List<BikeAccessorySchemesDto> rows
    )
    {
        if (rows.Count == 0)
        {
            return;
        }

        long[] ids =
            rows.Select(x => x.BikeAccessorySchemeId).ToArray();

        var models =
            await
            (
                from m in _context.Set<SchemeModelsEntity>().AsNoTracking()
                where ids.Contains(m.BikeAccessorySchemeId)
                join b in _context.Set<BikeModelsEntity>().AsNoTracking()
                    on m.BikeModelId equals b.BikeModelId into bikes
                from b in bikes.DefaultIfEmpty()
                orderby m.BikeAccessorySchemeModelId
                select new
                {
                    m.BikeAccessorySchemeId,
                    Dto = new BikeAccessorySchemeModelDto
                    {
                        BikeModelId = m.BikeModelId,
                        ModelCode = b != null ? b.ModelCode : string.Empty,
                        ModelName = b != null ? b.ModelName : string.Empty
                    }
                }
            )
            .ToListAsync();

        var items =
            await
            (
                from i in _context.Set<SchemeItemsEntity>().AsNoTracking()
                where ids.Contains(i.BikeAccessorySchemeId)
                join a in _context.Set<AccessoriesEntity>().AsNoTracking()
                    on i.AccessoryId equals a.AccessoryId into accessories
                from a in accessories.DefaultIfEmpty()
                orderby i.LineNo, i.BikeAccessorySchemeItemId
                select new
                {
                    i.BikeAccessorySchemeId,
                    Dto = new BikeAccessorySchemeItemDto
                    {
                        AccessoryId = i.AccessoryId,
                        ProductCode = a != null ? a.ProductCode : string.Empty,
                        AccessoryName = a != null ? a.AccessoryName : string.Empty,
                        AccessoryUse = a != null ? a.AccessoryUse : string.Empty,
                        QuantityPerBike = i.QuantityPerBike
                    }
                }
            )
            .ToListAsync();

        foreach (BikeAccessorySchemesDto row in rows)
        {
            row.Models =
                models
                    .Where(x => x.BikeAccessorySchemeId == row.BikeAccessorySchemeId)
                    .Select(x => x.Dto)
                    .ToList();

            row.Items =
                items
                    .Where(x => x.BikeAccessorySchemeId == row.BikeAccessorySchemeId)
                    .Select(x => x.Dto)
                    .ToList();

            row.ModelCount = row.Models.Count;

            row.ItemCount = row.Items.Count;

            row.ModelsText =
                string.Join(", ", row.Models.Select(x => x.ModelName).Where(x => x.Length > 0));

            row.ItemsText =
                string.Join(", ", row.Items.Select(x => $"{x.AccessoryName} x{x.QuantityPerBike}"));
        }
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<BikeAccessorySchemesDto>> GetAllAsync()
    {
        List<BikeAccessorySchemesDto> rows =
            await SchemesQuery()
                .OrderBy(x => x.SchemeCode)
                .ToListAsync();

        await AttachChildrenAsync(rows);

        return rows;
    }


    //===========================================================
    // Get Paged (the list page)
    //===========================================================

    private static SortMap<BikeAccessorySchemesDto> ListSorts()
    {
        return new SortMap<BikeAccessorySchemesDto>("SchemeCode")
            .Add("SchemeCode", x => x.SchemeCode)
            .Add("SchemeName", x => x.SchemeName)
            .Add("SchemeKind", x => x.SchemeKind)
            .Add("SchemeSource", x => x.SchemeSource)
            .Add("BrandName", x => x.BrandName)
            .Add("ValidFrom", x => x.ValidFrom)
            .Add("ValidTo", x => x.ValidTo)
            .Add("Status", x => x.Status)
            .Tie(x => x.BikeAccessorySchemeId);
    }


    public async Task<PagedResult<BikeAccessorySchemesDto>> GetPagedAsync
    (
        BikeAccessorySchemesPageRequest request
    )
    {
        IQueryable<BikeAccessorySchemesDto> query =
            SchemesQuery();

        //-------------------------------------------------------
        // Search (also the model and accessory names)
        //-------------------------------------------------------

        string search =
            request.SafeSearch;

        if (search.Length > 0)
        {
            string like =
                PagingQuery.LikePattern(search);

            IQueryable<long> byModel =
                from m in _context.Set<SchemeModelsEntity>().AsNoTracking()
                join b in _context.Set<BikeModelsEntity>().AsNoTracking()
                    on m.BikeModelId equals b.BikeModelId
                where EF.Functions.ILike(b.ModelName, like)
                select m.BikeAccessorySchemeId;

            IQueryable<long> byItem =
                from i in _context.Set<SchemeItemsEntity>().AsNoTracking()
                join a in _context.Set<AccessoriesEntity>().AsNoTracking()
                    on i.AccessoryId equals a.AccessoryId
                where EF.Functions.ILike(a.AccessoryName, like)
                      || EF.Functions.ILike(a.ProductCode, like)
                select i.BikeAccessorySchemeId;

            query =
                query.Where
                (
                    x =>
                        EF.Functions.ILike(x.SchemeCode, like) ||
                        EF.Functions.ILike(x.SchemeName, like) ||
                        EF.Functions.ILike(x.BrandName, like) ||
                        EF.Functions.ILike(x.Remarks, like) ||
                        byModel.Contains(x.BikeAccessorySchemeId) ||
                        byItem.Contains(x.BikeAccessorySchemeId)
                );
        }

        //-------------------------------------------------------
        // Filters
        //-------------------------------------------------------

        string kind =
            Kinds.FirstOrDefault(x => x.Equals((request.SchemeKind ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
            ?? string.Empty;

        if (kind.Length > 0)
        {
            query = query.Where(x => x.SchemeKind == kind);
        }

        string validity =
            (request.Validity ?? string.Empty).Trim();

        if (validity.Length > 0)
        {
            query = query.Where(x => x.Validity == validity);
        }

        if (request.BrandManagementId > 0)
        {
            long brandId = request.BrandManagementId.Value;

            query = query.Where(x => x.BrandManagementId == brandId);
        }

        //-------------------------------------------------------
        // Summary counts (search and filters applied; not status)
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

        if (request.Status.HasValue)
        {
            bool active = request.Status.Value;

            query = query.Where(x => x.Status == active);
        }

        int total =
            await query.CountAsync();

        PagingQuery.FitPage(request, total);

        List<BikeAccessorySchemesDto> rows =
            await ListSorts()
                .Apply(query, request)
                .Page(request)
                .ToListAsync();

        await AttachChildrenAsync(rows);

        return new PagedResult<BikeAccessorySchemesDto>
        {
            Items = rows,
            TotalCount = total,
            Page = request.SafePage,
            PageSize = request.SafePageSize,
            Counts = summaryCounts
        };
    }


    //===========================================================
    // Public Id -> internal id / Get By Id
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

        return await Schemes
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.PublicId == publicId)
            .Select(x => (long?)x.BikeAccessorySchemeId)
            .FirstOrDefaultAsync();
    }


    public async Task<BikeAccessorySchemesDto?> GetByIdAsync
    (
        long id
    )
    {
        BikeAccessorySchemesDto? row =
            await SchemesQuery()
                .FirstOrDefaultAsync(x => x.BikeAccessorySchemeId == id);

        if (row != null)
        {
            await AttachChildrenAsync(new List<BikeAccessorySchemesDto> { row });
        }

        return row;
    }


    //===========================================================
    // Next Code : highest BAS-nnnn (deleted rows count) + 1
    //===========================================================

    public async Task<string> GetNextCodeAsync()
    {
        List<string> codes =
            await Schemes
                .AsNoTracking()
                .Select(x => x.SchemeCode)
                .ToListAsync();

        int highest = 0;

        foreach (string code in codes)
        {
            if (string.IsNullOrWhiteSpace(code)) continue;

            string[] parts = code.Split('-', StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length != 2) continue;

            if (!string.Equals(parts[0].Trim(), CodePrefix, StringComparison.OrdinalIgnoreCase)) continue;

            if (int.TryParse(parts[1].Trim(), out int number) && number > highest)
            {
                highest = number;
            }
        }

        return $"{CodePrefix}-{highest + 1:D4}";
    }


    //===========================================================
    // Defaults : code, kinds, sources, brands, models, accessories
    //===========================================================

    public async Task<BikeAccessorySchemesDefaultsDto> GetDefaultsAsync()
    {
        List<BikeAccessorySchemeBrandOptionDto> brands =
            await _context.Set<BrandManagementEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.BrandName)
                .Select(
                    x =>
                        new BikeAccessorySchemeBrandOptionDto
                        {
                            BrandManagementId = x.BrandManagementId,
                            BrandName = x.BrandName,
                            Status = x.Status
                        })
                .ToListAsync();

        List<BikeAccessorySchemeModelOptionDto> models =
            await _context.Set<BikeModelsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.ModelName)
                .Select(
                    x =>
                        new BikeAccessorySchemeModelOptionDto
                        {
                            BikeModelId = x.BikeModelId,
                            BrandManagementId = x.BrandManagementId,
                            ModelCode = x.ModelCode,
                            ModelName = x.ModelName,
                            Status = x.Status
                        })
                .ToListAsync();

        // Brands that have bike models only
        HashSet<long> withModels =
            models.Select(x => x.BrandManagementId).ToHashSet();

        List<BikeAccessorySchemeAccessoryOptionDto> accessories =
            await
            (
                from a in _context.Set<AccessoriesEntity>().AsNoTracking()
                where !a.IsDeleted
                join s in _context.Set<ProductSubCategoryEntity>().AsNoTracking()
                    on a.ProductSubCategoryId equals s.ProductSubCategoryId into subs
                from s in subs.DefaultIfEmpty()
                orderby a.AccessoryName
                select new BikeAccessorySchemeAccessoryOptionDto
                {
                    AccessoryId = a.AccessoryId,
                    ProductCode = a.ProductCode,
                    AccessoryName = a.AccessoryName,
                    AccessoryUse = a.AccessoryUse,
                    SubCategoryName = s != null ? s.SubCategoryName : string.Empty,
                    IsActive = a.IsActive
                }
            )
            .ToListAsync();

        return new BikeAccessorySchemesDefaultsDto
        {
            Code = await GetNextCodeAsync(),
            Kinds = Kinds.ToList(),
            Sources = Sources.ToList(),
            Brands = brands.Where(x => withModels.Contains(x.BrandManagementId)).ToList(),
            Models = models,
            Accessories = accessories
        };
    }


    //===========================================================
    // Checks shared by create / update / restore
    //===========================================================

    private sealed record CleanInput
    (
        string Name,
        string Kind,
        string Source,
        BrandManagementEntity Brand,
        DateOnly ValidFrom,
        DateOnly? ValidTo,
        List<long> ModelIds,
        List<(long AccessoryId, int Quantity)> Items,
        string Remarks
    );


    private static string Squeeze(string? value) =>
        string.Join(" ", (value ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries));


    private static string Pick(string[] list, string? value, string what) =>
        list.FirstOrDefault(x => x.Equals((value ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
        ?? throw new InvalidOperationException($"Choose the {what} : {string.Join(" or ", list)}.");


    private async Task<CleanInput> CleanAsync
    (
        CreateBikeAccessorySchemesDto dto,
        long excludeId
    )
    {
        //-------------------------------------------------------
        // Name, kind, source
        //-------------------------------------------------------

        string name =
            Squeeze(dto.SchemeName);

        if (name.Length == 0)
        {
            throw new InvalidOperationException("Scheme Name is required.");
        }

        if (name.Length > 150)
        {
            throw new InvalidOperationException("Scheme Name cannot be longer than 150 characters.");
        }

        string key =
            name.ToLower();

        bool taken =
            await Schemes
                .AsNoTracking()
                .AnyAsync(x => !x.IsDeleted && x.BikeAccessorySchemeId != excludeId && x.SchemeName.ToLower() == key);

        if (taken)
        {
            throw new InvalidOperationException($"A scheme named '{name}' already exists.");
        }

        string kind =
            Pick(Kinds, dto.SchemeKind, "Accessory Type");

        string source =
            Pick(Sources, dto.SchemeSource, "Source");

        //-------------------------------------------------------
        // Saved rows (inactive brand / models / items stay
        // allowed when they were already on the scheme)
        //-------------------------------------------------------

        SchemesEntity? saved =
            excludeId > 0
                ? await Schemes.AsNoTracking().FirstOrDefaultAsync(x => x.BikeAccessorySchemeId == excludeId)
                : null;

        HashSet<long> savedModels =
            excludeId > 0
                ? (await _context.Set<SchemeModelsEntity>().AsNoTracking()
                    .Where(x => x.BikeAccessorySchemeId == excludeId)
                    .Select(x => x.BikeModelId)
                    .ToListAsync()).ToHashSet()
                : new HashSet<long>();

        HashSet<long> savedItems =
            excludeId > 0
                ? (await _context.Set<SchemeItemsEntity>().AsNoTracking()
                    .Where(x => x.BikeAccessorySchemeId == excludeId)
                    .Select(x => x.AccessoryId)
                    .ToListAsync()).ToHashSet()
                : new HashSet<long>();

        //-------------------------------------------------------
        // Brand
        //-------------------------------------------------------

        if (dto.BrandManagementId <= 0)
        {
            throw new InvalidOperationException("Brand is required.");
        }

        BrandManagementEntity brand =
            await _context.Set<BrandManagementEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.BrandManagementId == dto.BrandManagementId && !x.IsDeleted)
            ?? throw new InvalidOperationException("The selected Brand was not found. It may have been deleted.");

        if (!brand.Status && saved?.BrandManagementId != brand.BrandManagementId)
        {
            throw new InvalidOperationException($"Brand '{brand.BrandName}' is inactive.");
        }

        //-------------------------------------------------------
        // Dates
        //-------------------------------------------------------

        if (dto.ValidFrom == default)
        {
            throw new InvalidOperationException("Valid From is required.");
        }

        DateOnly? validTo = null;

        if (kind == Promotional)
        {
            if (dto.ValidTo == null || dto.ValidTo == default)
            {
                throw new InvalidOperationException("A Promotional scheme needs a Valid To date.");
            }

            if (dto.ValidTo < dto.ValidFrom)
            {
                throw new InvalidOperationException("Valid To cannot be before Valid From.");
            }

            validTo = dto.ValidTo;
        }

        //-------------------------------------------------------
        // Models : of the brand, no repeats
        //-------------------------------------------------------

        List<long> modelIds =
            (dto.BikeModelIds ?? new List<long>())
                .Where(x => x > 0)
                .Distinct()
                .ToList();

        if (modelIds.Count == 0)
        {
            throw new InvalidOperationException("Pick at least one bike model.");
        }

        var models =
            await _context.Set<BikeModelsEntity>()
                .AsNoTracking()
                .Where(x => modelIds.Contains(x.BikeModelId) && !x.IsDeleted)
                .Select(x => new { x.BikeModelId, x.ModelName, x.BrandManagementId, x.Status })
                .ToListAsync();

        foreach (long id in modelIds)
        {
            var model =
                models.FirstOrDefault(x => x.BikeModelId == id)
                ?? throw new InvalidOperationException("A picked bike model was not found. Refresh the page.");

            if (model.BrandManagementId != brand.BrandManagementId)
            {
                throw new InvalidOperationException($"Bike model '{model.ModelName}' is not a {brand.BrandName} model.");
            }

            if (!model.Status && !savedModels.Contains(id))
            {
                throw new InvalidOperationException($"Bike model '{model.ModelName}' is inactive.");
            }
        }

        //-------------------------------------------------------
        // Items : 1–99 each, no repeats, the right use
        //-------------------------------------------------------

        List<(long AccessoryId, int Quantity)> items =
            new();

        foreach (BikeAccessorySchemeItemInputDto item in dto.Items ?? new List<BikeAccessorySchemeItemInputDto>())
        {
            if (item.AccessoryId <= 0)
            {
                continue;
            }

            if (items.Any(x => x.AccessoryId == item.AccessoryId))
            {
                throw new InvalidOperationException("The same accessory is listed twice.");
            }

            if (item.QuantityPerBike < 1 || item.QuantityPerBike > 99)
            {
                throw new InvalidOperationException("Quantity per bike must be between 1 and 99.");
            }

            items.Add((item.AccessoryId, item.QuantityPerBike));
        }

        if (items.Count == 0)
        {
            throw new InvalidOperationException("Add at least one accessory.");
        }

        long[] accessoryIds =
            items.Select(x => x.AccessoryId).ToArray();

        var accessories =
            await _context.Set<AccessoriesEntity>()
                .AsNoTracking()
                .Where(x => accessoryIds.Contains(x.AccessoryId) && !x.IsDeleted)
                .Select(x => new { x.AccessoryId, x.AccessoryName, x.AccessoryUse, x.IsActive })
                .ToListAsync();

        foreach (var (accessoryId, _) in items)
        {
            var accessory =
                accessories.FirstOrDefault(x => x.AccessoryId == accessoryId)
                ?? throw new InvalidOperationException("A picked accessory was not found. Refresh the page.");

            if (!accessory.IsActive && !savedItems.Contains(accessoryId))
            {
                throw new InvalidOperationException($"Accessory '{accessory.AccessoryName}' is inactive.");
            }

            // Supplier : the product's use must match the Accessory
            //            Type (Additional -> Additional Accessories,
            //            Promotional -> Promotional Accessories)
            // Company  : For Sale accessories only
            string use;

            try
            {
                use = AccessoryUses.Normalize(accessory.AccessoryUse);
            }
            catch (Exception)
            {
                use = (accessory.AccessoryUse ?? string.Empty).Trim();
            }

            string wanted =
                source == Company
                    ? AccessoryUses.ForSale
                    : kind == Promotional
                        ? AccessoryUses.Promotional
                        : AccessoryUses.Additional;

            if (use != wanted)
            {
                throw new InvalidOperationException(
                    $"'{accessory.AccessoryName}' is {use} : a {kind} / {source} scheme takes {wanted} only.");
            }
        }

        string remarks =
            (dto.Remarks ?? string.Empty).Trim();

        if (remarks.Length > 1000)
        {
            throw new InvalidOperationException("Remarks cannot be longer than 1000 characters.");
        }

        return new CleanInput(name, kind, source, brand, dto.ValidFrom, validTo, modelIds, items, remarks);
    }


    // An active model cannot be in two active schemes of the
    // same kind and source on the same day
    private async Task EnsureNoOverlapAsync
    (
        string kind,
        string source,
        DateOnly fromDate,
        DateOnly? toDate,
        List<long> modelIds,
        long excludeId
    )
    {
        var clash =
            await
            (
                from s in Schemes.AsNoTracking()
                where !s.IsDeleted
                      && s.Status
                      && s.BikeAccessorySchemeId != excludeId
                      && s.SchemeKind == kind
                      && s.SchemeSource == source
                      && (s.ValidTo == null || s.ValidTo >= fromDate)
                      && (toDate == null || s.ValidFrom <= toDate)
                join m in _context.Set<SchemeModelsEntity>().AsNoTracking()
                    on s.BikeAccessorySchemeId equals m.BikeAccessorySchemeId
                where modelIds.Contains(m.BikeModelId)
                join b in _context.Set<BikeModelsEntity>().AsNoTracking()
                    on m.BikeModelId equals b.BikeModelId
                select new { s.SchemeCode, s.SchemeName, b.ModelName }
            )
            .FirstOrDefaultAsync();

        if (clash != null)
        {
            throw new InvalidOperationException(
                $"Bike model '{clash.ModelName}' is already in the active {kind} / {source} scheme {clash.SchemeCode} '{clash.SchemeName}' for these dates.");
        }
    }


    // Replaces the models and items of a scheme
    private async Task ReplaceChildrenAsync
    (
        long schemeId,
        List<long> modelIds,
        List<(long AccessoryId, int Quantity)> items
    )
    {
        // Straight deletes (inside the caller's transaction), so
        // the unique (scheme, model / accessory) rows can come back
        await _context.Set<SchemeModelsEntity>()
            .Where(x => x.BikeAccessorySchemeId == schemeId)
            .ExecuteDeleteAsync();

        await _context.Set<SchemeItemsEntity>()
            .Where(x => x.BikeAccessorySchemeId == schemeId)
            .ExecuteDeleteAsync();

        foreach (long modelId in modelIds)
        {
            _context.Set<SchemeModelsEntity>().Add(
                new SchemeModelsEntity
                {
                    BikeAccessorySchemeId = schemeId,
                    BikeModelId = modelId
                });
        }

        int lineNo = 0;

        foreach ((long accessoryId, int quantity) in items)
        {
            _context.Set<SchemeItemsEntity>().Add(
                new SchemeItemsEntity
                {
                    BikeAccessorySchemeId = schemeId,
                    LineNo = ++lineNo,
                    AccessoryId = accessoryId,
                    QuantityPerBike = quantity
                });
        }
    }


    private void AddHistory
    (
        SchemesEntity entity,
        string activityType,
        string verb,
        long userId
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = entity.BikeAccessorySchemeId,
                ActivityType = activityType,
                ActivityTitle = $"Bike Accessory Scheme {verb}",
                ActivityDescription = $"Bike accessory scheme {entity.SchemeCode} '{entity.SchemeName}' ({entity.SchemeKind} / {entity.SchemeSource}) {verb.ToLower()}.",
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
        CreateBikeAccessorySchemesDto dto,
        long userId
    )
    {
        CleanInput input =
            await CleanAsync(dto, 0);

        if (dto.Status)
        {
            await EnsureNoOverlapAsync(input.Kind, input.Source, input.ValidFrom, input.ValidTo, input.ModelIds, 0);
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        SchemesEntity entity =
            new()
            {
                SchemeCode = await GetNextCodeAsync(),
                SchemeName = input.Name,
                SchemeKind = input.Kind,
                SchemeSource = input.Source,
                BrandManagementId = input.Brand.BrandManagementId,
                ValidFrom = input.ValidFrom,
                ValidTo = input.ValidTo,
                Remarks = input.Remarks,
                Status = dto.Status,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        Schemes.Add(entity);

        await _context.SaveChangesAsync();

        await ReplaceChildrenAsync(entity.BikeAccessorySchemeId, input.ModelIds, input.Items);

        AddHistory(entity, "Create", "Created", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.BikeAccessorySchemeId;
    }


    //===========================================================
    // Update (the code never changes)
    //===========================================================

    public async Task UpdateAsync
    (
        UpdateBikeAccessorySchemesDto dto,
        long userId
    )
    {
        SchemesEntity entity =
            await Schemes.FirstOrDefaultAsync(x => x.BikeAccessorySchemeId == dto.BikeAccessorySchemeId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Bike accessory scheme not found.");

        CleanInput input =
            await CleanAsync(dto, entity.BikeAccessorySchemeId);

        if (dto.Status)
        {
            await EnsureNoOverlapAsync(input.Kind, input.Source, input.ValidFrom, input.ValidTo, input.ModelIds, entity.BikeAccessorySchemeId);
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        entity.SchemeName = input.Name;
        entity.SchemeKind = input.Kind;
        entity.SchemeSource = input.Source;
        entity.BrandManagementId = input.Brand.BrandManagementId;
        entity.ValidFrom = input.ValidFrom;
        entity.ValidTo = input.ValidTo;
        entity.Remarks = input.Remarks;
        entity.Status = dto.Status;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await ReplaceChildrenAsync(entity.BikeAccessorySchemeId, input.ModelIds, input.Items);

        AddHistory(entity, "Update", "Updated", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    //===========================================================
    // Delete (soft; models and items are kept for a restore)
    //===========================================================

    public async Task DeleteAsync
    (
        long id,
        long userId
    )
    {
        SchemesEntity entity =
            await Schemes.FirstOrDefaultAsync(x => x.BikeAccessorySchemeId == id && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Bike accessory scheme not found.");

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(entity, "Delete", "Deleted", userId);

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
        SchemesEntity? entity =
            await Schemes
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        string key =
            entity.SchemeName.ToLower();

        bool nameTaken =
            await Schemes
                .AsNoTracking()
                .AnyAsync(x => !x.IsDeleted && x.BikeAccessorySchemeId != entity.BikeAccessorySchemeId && x.SchemeName.ToLower() == key);

        if (nameTaken)
        {
            throw new InvalidOperationException(
                $"Scheme '{entity.SchemeName}' cannot be restored : another live scheme has the same name.");
        }

        if (entity.Status)
        {
            List<long> modelIds =
                await _context.Set<SchemeModelsEntity>()
                    .AsNoTracking()
                    .Where(x => x.BikeAccessorySchemeId == entity.BikeAccessorySchemeId)
                    .Select(x => x.BikeModelId)
                    .ToListAsync();

            try
            {
                await EnsureNoOverlapAsync(entity.SchemeKind, entity.SchemeSource, entity.ValidFrom, entity.ValidTo, modelIds, entity.BikeAccessorySchemeId);
            }
            catch (InvalidOperationException ex)
            {
                throw new InvalidOperationException(
                    $"Scheme '{entity.SchemeName}' cannot be restored. {ex.Message}");
            }
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity, "Restore", "Restored", userId);

        await _context.SaveChangesAsync();

        return true;
    }
}
