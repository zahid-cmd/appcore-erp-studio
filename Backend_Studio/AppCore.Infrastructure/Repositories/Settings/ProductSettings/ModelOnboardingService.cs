//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ProductSettings;
using AppCore.Application.Settings.ProductSettings.ProductSubCategory.DTOs;
using AppCore.Infrastructure.Persistence;

using BikeModelsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeModels;
using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;
using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;
using ColorManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ColorManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ProductSettings;


//===============================================================
// Model Onboarding Service
//
// One save = Bike Model + Product Sub Category + one Motor Bike
// per colour, in ONE transaction (all or nothing). It calls the
// three pages' own repositories, so codes, names, ledgers, sub
// groups and history are exactly as when made by hand; their
// Create methods join this transaction instead of opening one.
//===============================================================

public class ModelOnboardingService :
    IModelOnboardingService
{
    private const string MotorBikesType =
        "Motor Bikes";

    // Stock levels when no motor bike has been saved yet
    private const int DefaultReorderLevel = 2;
    private const int DefaultRedLevel = 1;
    private const int DefaultMaxStockLevel = 3;


    private readonly AppDbContext _context;

    private readonly IBikeModelsRepository _bikeModels;

    private readonly IProductSubCategoryRepository _subCategories;

    private readonly IMotorBikesRepository _motorBikes;


    public ModelOnboardingService(
        AppDbContext context,
        IBikeModelsRepository bikeModels,
        IProductSubCategoryRepository subCategories,
        IMotorBikesRepository motorBikes)
    {
        _context = context;
        _bikeModels = bikeModels;
        _subCategories = subCategories;
        _motorBikes = motorBikes;
    }


    //===========================================================
    // Defaults
    //===========================================================

    public async Task<ModelOnboardingDefaultsDto> GetDefaultsAsync()
    {
        var categories =
            await (
                from c in _context.Set<ProductCategoryEntity>().AsNoTracking()
                join b in _context.Set<BrandManagementEntity>().AsNoTracking()
                    on c.BrandManagementId equals (long?)b.BrandManagementId
                where !c.IsDeleted && c.IsActive && c.SubCategoryCreationAllowed
                      && c.CategoryType == MotorBikesType
                      && !b.IsDeleted && b.Status
                orderby b.BrandName, c.CategoryCode
                select new
                {
                    b.BrandManagementId,
                    b.BrandName,
                    c.ProductCategoryId,
                    c.CategoryCode,
                    c.CategoryName
                })
            .ToListAsync();

        var existing =
            await _context.Set<BikeModelsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => new { x.BrandManagementId, x.ModelName })
                .ToListAsync();

        List<ModelOnboardingBrandDto> brands = new();

        // One row per brand (its first Motor Bikes category)
        foreach (var c in categories.GroupBy(x => x.BrandManagementId).Select(g => g.First()))
        {
            string nextSubCode;

            try
            {
                nextSubCode = await _subCategories.GetNextCodeAsync(c.ProductCategoryId);
            }
            catch (Exception)
            {
                // e.g. the category's account groups are missing;
                // the save explains it
                nextSubCode = string.Empty;
            }

            brands.Add(
                new ModelOnboardingBrandDto
                {
                    BrandManagementId = c.BrandManagementId,
                    BrandName = c.BrandName,
                    ProductCategoryId = c.ProductCategoryId,
                    CategoryCode = c.CategoryCode,
                    CategoryName = c.CategoryName,
                    NextSubCategoryCode = nextSubCode,
                    ExistingModels =
                        existing
                            .Where(x => x.BrandManagementId == c.BrandManagementId)
                            .Select(x => x.ModelName)
                            .OrderBy(x => x)
                            .ToList()
                });
        }

        List<ModelOnboardingColorDto> colors =
            await _context.Set<ColorManagementEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status)
                .OrderBy(x => x.ColorName)
                .Select(
                    x =>
                        new ModelOnboardingColorDto
                        {
                            ColorManagementId = x.ColorManagementId,
                            ColorName = x.ColorName
                        })
                .ToListAsync();

        BikeModelsDefaultsDto modelDefaults =
            await _bikeModels.GetDefaultsAsync();

        MotorBikesDefaultsDto bikeDefaults =
            await _motorBikes.GetDefaultsAsync(0);

        bool hasLastBike =
            bikeDefaults.LastProductCategoryId > 0;

        return new ModelOnboardingDefaultsDto
        {
            Brands = brands,
            BikeTypes = modelDefaults.BikeTypes,
            Colors = colors,
            NextModelCode = modelDefaults.Code,
            LastBikeType = modelDefaults.LastBikeType,
            ReorderLevel = hasLastBike ? bikeDefaults.LastReorderLevel : DefaultReorderLevel,
            RedLevel = hasLastBike ? bikeDefaults.LastRedLevel : DefaultRedLevel,
            MaxStockLevel = hasLastBike ? bikeDefaults.LastMaxStockLevel : DefaultMaxStockLevel
        };
    }


    //===========================================================
    // Onboard
    //===========================================================

    public async Task<ModelOnboardingResultDto> OnboardAsync(
        ModelOnboardingRequestDto request,
        long userId)
    {
        //-------------------------------------------------------
        // Checks first (nothing is written before they pass)
        //-------------------------------------------------------

        string modelName =
            string.Join(" ", (request.ModelName ?? string.Empty)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries));

        if (modelName.Length == 0)
        {
            throw new InvalidOperationException("Model Name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.BikeType))
        {
            throw new InvalidOperationException("Bike Type is required.");
        }

        if (request.ReorderLevel < 0 || request.RedLevel < 0 || request.MaxStockLevel < 0)
        {
            throw new InvalidOperationException("Stock levels cannot be negative.");
        }

        List<long> colorIds =
            (request.ColorManagementIds ?? new List<long>())
                .Where(x => x > 0)
                .Distinct()
                .ToList();

        if (colorIds.Count == 0)
        {
            throw new InvalidOperationException("Pick at least one colour.");
        }

        var category =
            await (
                from c in _context.Set<ProductCategoryEntity>().AsNoTracking()
                join b in _context.Set<BrandManagementEntity>().AsNoTracking()
                    on c.BrandManagementId equals (long?)b.BrandManagementId
                where b.BrandManagementId == request.BrandManagementId
                      && !c.IsDeleted && c.IsActive && c.SubCategoryCreationAllowed
                      && c.CategoryType == MotorBikesType
                      && !b.IsDeleted && b.Status
                orderby c.CategoryCode
                select new { c.ProductCategoryId, b.BrandName })
            .FirstOrDefaultAsync();

        if (category == null)
        {
            throw new InvalidOperationException(
                "This brand has no active Motor Bikes category. Create it in Product Category first.");
        }

        string lowerName =
            modelName.ToLower();

        bool duplicate =
            await _context.Set<BikeModelsEntity>()
                .AsNoTracking()
                .AnyAsync(
                    x =>
                        !x.IsDeleted
                        && x.BrandManagementId == request.BrandManagementId
                        && x.ModelName.ToLower() == lowerName);

        if (duplicate)
        {
            throw new InvalidOperationException(
                $"Model '{modelName}' already exists for {category.BrandName}. Duplicates are not allowed.");
        }

        int activeColors =
            await _context.Set<ColorManagementEntity>()
                .AsNoTracking()
                .CountAsync(x => colorIds.Contains(x.ColorManagementId) && !x.IsDeleted && x.Status);

        if (activeColors != colorIds.Count)
        {
            throw new InvalidOperationException("A picked colour is no longer active. Refresh the page.");
        }

        string remarks =
            request.Remarks?.Trim() ?? string.Empty;

        //-------------------------------------------------------
        // All in one transaction
        //-------------------------------------------------------

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        long bikeModelId =
            await _bikeModels.CreateAsync(
                new CreateBikeModelsDto
                {
                    BrandManagementId = request.BrandManagementId,
                    ModelName = modelName,
                    BikeType = request.BikeType.Trim(),
                    Remarks = remarks,
                    Status = true
                },
                userId);

        long subCategoryId =
            await _subCategories.CreateAsync(
                new CreateProductSubCategoryDto
                {
                    ProductCategoryId = category.ProductCategoryId,
                    BikeModelId = bikeModelId,
                    SubCategoryCreationAllowed = true,
                    Remarks = remarks,
                    IsActive = true
                },
                userId);

        List<long> bikeIds = new();

        foreach (long colorId in colorIds)
        {
            bikeIds.Add(
                await _motorBikes.CreateAsync(
                    new CreateMotorBikesDto
                    {
                        ProductCategoryId = category.ProductCategoryId,
                        ProductSubCategoryId = subCategoryId,
                        ColorManagementId = colorId,
                        ReorderLevel = request.ReorderLevel,
                        RedLevel = request.RedLevel,
                        MaxStockLevel = request.MaxStockLevel,
                        Remarks = remarks,
                        IsActive = true
                    },
                    userId));
        }

        await transaction.CommitAsync();

        //-------------------------------------------------------
        // Result (what was made)
        //-------------------------------------------------------

        BikeModelsDto? model =
            await _bikeModels.GetByIdAsync(bikeModelId);

        ProductSubCategoryDto? subCategory =
            await _subCategories.GetByIdAsync(subCategoryId);

        ModelOnboardingResultDto result =
            new()
            {
                BikeModelId = bikeModelId,
                ModelCode = model?.ModelCode ?? string.Empty,
                ProductSubCategoryId = subCategoryId,
                SubCategoryCode = subCategory?.SubCategoryCode ?? string.Empty,
                SubCategoryName = subCategory?.SubCategoryName ?? string.Empty
            };

        foreach (long bikeId in bikeIds)
        {
            MotorBikesDto? bike =
                await _motorBikes.GetByIdAsync(bikeId);

            if (bike != null)
            {
                result.Bikes.Add(
                    new ModelOnboardingBikeDto
                    {
                        ColorManagementId = bike.ColorManagementId,
                        PublicId = bike.PublicId,
                        ProductCode = bike.ProductCode,
                        ProductName = bike.ProductName
                    });
            }
        }

        return result;
    }
}
