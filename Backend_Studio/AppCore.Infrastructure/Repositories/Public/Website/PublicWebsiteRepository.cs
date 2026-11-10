//===============================================================
// Imports
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Public.Website;
using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.WebsiteConfiguration.DTOs;
using AppCore.Infrastructure.Persistence;

using CompanyEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Company;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using WingsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Wings;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using BikeModelsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeModels;

using MotorBikeSpecificationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikeSpecifications;

using MotorBikeSpecificationItemsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikeSpecificationItems;

using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using ColorManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ColorManagement;

using SparePartsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SpareParts;

using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;

using StockBatchesEntity =
    AppCore.Domain.Platform.Inventory.StockBatches;

using StockMovementsEntity =
    AppCore.Domain.Platform.Inventory.StockMovements;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Public.Website;


//===============================================================
// Public Website Repository
//---------------------------------------------------------------
// Reads the ERP data the company's website shows :
//
//   Company   the first active company (else the first one)
//   Branches  active branches, with their wing as the type
//   Models    active Motor Bikes, grouped by model (sub
//             category); each colour keeps its own image
//   Price     MRP of the newest batch that has one
//   Stock     a badge only, never the count :
//               on hand, above the levels  → in-stock
//               on hand, at / under Red or
//               Re-order level             → few-left
//               none on hand               → pre-order
//===============================================================

public class PublicWebsiteRepository : IPublicWebsiteRepository
{
    private const string MotorBikesType = "Motor Bikes";

    private const string ProductTypeMotorBikes = "MB";

    private const string ProductTypeSpareParts = "SP";

    private const string ProductTypeAccessories = "AC";

    private const string KindSpareParts = "Spare Parts";

    private const string KindLubricants = "Lubricants";

    private const string KindAccessories = "Accessories";

    private const string StockOrder = "order";

    private const string BucketOnHand = "OnHand";

    private const string StockIn = "in-stock";

    private const string StockFew = "few-left";

    private const string StockPre = "pre-order";

    private readonly AppDbContext _context;

    private readonly IWebsiteConfigurationRepository _configuration;


    public PublicWebsiteRepository(
        AppDbContext context,
        IWebsiteConfigurationRepository configuration)
    {
        _context = context;

        _configuration = configuration;
    }


    public async Task<PublicWebsiteDto> GetAsync()
    {
        return new PublicWebsiteDto
        {
            Company = await LoadCompanyAsync(),
            Branches = await LoadBranchesAsync(),
            Models = await LoadModelsAsync(),
            Brands = await LoadBrandsAsync(),
            Configuration = await LoadConfigurationAsync()
        };
    }


    //===============================================================
    // Website Configuration page → its public parts (null when it
    // was never saved)
    //===============================================================

    private async Task<PublicWebsiteConfigDto?> LoadConfigurationAsync()
    {
        WebsiteConfigurationDto c;

        // Tables missing (script not run yet) or any read error :
        // the website keeps working from its JSON file
        try
        {
            c = await _configuration.GetAsync();
        }
        catch (Exception)
        {
            return null;
        }

        if (!c.Exists)
        {
            return null;
        }

        Dictionary<long, string> brandNames =
            c.Brands.ToDictionary(x => x.BrandManagementId, x => x.BrandName);

        return new PublicWebsiteConfigDto
        {
            IsEnabled = c.IsEnabled,
            DefaultTheme = c.DefaultTheme,
            CurrencySymbol = string.IsNullOrWhiteSpace(c.CurrencySymbol) ? "৳" : c.CurrencySymbol,
            OfferTitle = c.OfferTitle,
            OfferText = c.OfferText,
            OfferEndsOn = c.OfferEndsOn.HasValue ? c.OfferEndsOn.Value.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture) : string.Empty,
            Tagline = c.Tagline,
            About = c.About,
            Hotline = c.Hotline,
            WhatsApp = c.WhatsApp,
            Email = c.Email,
            MapQuery = c.MapQuery,
            FacebookUrl = c.FacebookUrl,
            YoutubeUrl = c.YoutubeUrl,
            InstagramUrl = c.InstagramUrl,
            TiktokUrl = c.TiktokUrl,
            ShowBrandsMenu = c.ShowBrandsMenu,
            ShowOfferRibbon = c.ShowOfferRibbon,
            ShowMovingStrip = c.ShowMovingStrip,
            StripSpeed = c.StripSpeed is >= 1 and <= 10 ? c.StripSpeed : 5,
            ShowWhyUs = c.ShowWhyUs,
            ShowEmi = c.ShowEmi,
            ShowService = c.ShowService,
            ShowBranches = c.ShowBranches,
            ShowFaq = c.ShowFaq,
            WhyPhotoPath = c.WhyPhotoPath,
            HeroPhotoPath = c.HeroPhotoPath,
            HeroWelcome = c.HeroWelcome,
            HeroBackground = c.HeroBackground,
            HeroStrength = c.HeroStrength is >= 1 and <= 5 ? c.HeroStrength : 2,
            HeroTitle = c.HeroTitle,
            HeroText = c.HeroText,
            HeroShowAddress = c.HeroShowAddress,
            HeroRoundOn = c.HeroRoundOn,
            HeroRoundPath = c.HeroRoundPath,
            HeroRoundStrength = c.HeroRoundStrength is >= 1 and <= 5 ? c.HeroRoundStrength : 2,
            EmiExamplePrice = c.EmiExamplePrice,
            EmiDownPercents = c.EmiDownPercents,
            EmiMonths = c.EmiMonths,
            EmiNote = c.EmiNote,
            OpeningHours =
                c.OpeningHours
                    .Select(x => new PublicHourDto { Days = x.Days, OpensAt = x.OpensAt, ClosesAt = x.ClosesAt, IsClosed = x.IsClosed })
                    .ToList(),
            Items =
                c.Items
                    .Select(x => new PublicItemDto { Kind = x.Kind, Title = x.Title, Text = x.Text, PhotoPath = x.PhotoPath })
                    .ToList(),
            Brands =
                c.Brands
                    .Select(x => new PublicBrandSettingDto { Code = x.BrandCode, Name = x.BrandName, ShowOnWebsite = x.ShowOnWebsite, ShowBrandPage = x.ShowBrandPage, About = x.About })
                    .ToList(),
            BranchBrands =
                c.Branches
                    .Where(x => x.BrandIds.Count > 0)
                    .Select
                    (
                        x =>
                            new PublicBranchBrandsDto
                            {
                                Branch = x.BranchName,
                                Brands = x.BrandIds.Select(id => brandNames.GetValueOrDefault(id, string.Empty)).Where(n => n.Length > 0).ToList()
                            }
                    )
                    .ToList(),
            Policies =
                c.Policies
                    .Select
                    (
                        x =>
                            new PublicPolicyDto
                            {
                                Key = x.PolicyKey,
                                Brand = x.BrandName,
                                Title = x.Title,
                                UpdatedOn = x.UpdatedOn.HasValue ? x.UpdatedOn.Value.ToString("d MMM yyyy", System.Globalization.CultureInfo.InvariantCulture) : string.Empty,
                                Sections = x.Sections.Select(s => new PublicPolicySectionDto { Heading = s.Heading, Text = s.Text }).ToList()
                            }
                    )
                    .ToList()
        };
    }


    //===============================================================
    // Brands : active brands used by an active product category
    //===============================================================

    private async Task<List<PublicBrandDto>> LoadBrandsAsync()
    {
        List<long> used =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && x.BrandManagementId.HasValue)
                .Select(x => x.BrandManagementId!.Value)
                .Distinct()
                .ToListAsync();

        return
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status && used.Contains(x.BrandManagementId))
                .OrderBy(x => x.BrandCode)
                .Select
                (
                    x =>
                        new PublicBrandDto
                        {
                            Code = x.BrandCode ?? string.Empty,
                            Name = x.BrandName ?? string.Empty,
                            LogoPath = x.BrandImagePath ?? string.Empty
                        }
                )
                .ToListAsync();
    }


    //===============================================================
    // Parts catalogue of one brand : spare parts, lubricants and
    // accessories of its active categories. MRP of the newest
    // batch; availability only (in-stock / order).
    //===============================================================

    public async Task<List<PublicPartDto>> GetPartsAsync(
        string brandCode)
    {
        string code =
            Clean(brandCode);

        BrandManagementEntity? brand =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => !x.IsDeleted && x.Status && x.BrandCode == code);

        if (brand is null)
        {
            return new List<PublicPartDto>();
        }

        Dictionary<long, string> categories =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && x.BrandManagementId == brand.BrandManagementId)
                .ToDictionaryAsync(x => x.ProductCategoryId, x => x.CategoryType ?? string.Empty);

        if (categories.Count == 0)
        {
            return new List<PublicPartDto>();
        }

        List<long> categoryIds =
            categories.Keys.ToList();

        var spareParts =
            await _context
                .Set<SparePartsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && categoryIds.Contains(x.ProductCategoryId))
                .Select(x => new { Id = x.SparePartId, x.ProductCategoryId, x.PartNumber, Name = x.PartName, x.Unit })
                .ToListAsync();

        var accessories =
            await _context
                .Set<AccessoriesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && categoryIds.Contains(x.ProductCategoryId))
                .Select(x => new { Id = x.AccessoryId, x.ProductCategoryId, x.PartNumber, Name = x.AccessoryName, x.Unit })
                .ToListAsync();

        Dictionary<long, decimal> spPrices =
            await LoadPricesAsync(ProductTypeSpareParts, spareParts.Select(x => x.Id).ToList());

        Dictionary<long, decimal> acPrices =
            await LoadPricesAsync(ProductTypeAccessories, accessories.Select(x => x.Id).ToList());

        HashSet<long> spOnHand =
            await LoadOnHandAsync(ProductTypeSpareParts, spareParts.Select(x => x.Id).ToList());

        HashSet<long> acOnHand =
            await LoadOnHandAsync(ProductTypeAccessories, accessories.Select(x => x.Id).ToList());

        List<PublicPartDto> result =
            new List<PublicPartDto>();

        foreach (var x in spareParts)
        {
            result.Add
            (
                new PublicPartDto
                {
                    Kind =
                        string.Equals(categories.GetValueOrDefault(x.ProductCategoryId), KindLubricants, StringComparison.OrdinalIgnoreCase)
                            ? KindLubricants
                            : KindSpareParts,
                    PartNumber = Clean(x.PartNumber),
                    Name = Clean(x.Name),
                    Unit = Clean(x.Unit),
                    Price = spPrices.TryGetValue(x.Id, out decimal mrp) ? mrp : null,
                    Stock = spOnHand.Contains(x.Id) ? StockIn : StockOrder
                }
            );
        }

        foreach (var x in accessories)
        {
            result.Add
            (
                new PublicPartDto
                {
                    Kind = KindAccessories,
                    PartNumber = Clean(x.PartNumber),
                    Name = Clean(x.Name),
                    Unit = Clean(x.Unit),
                    Price = acPrices.TryGetValue(x.Id, out decimal mrp) ? mrp : null,
                    Stock = acOnHand.Contains(x.Id) ? StockIn : StockOrder
                }
            );
        }

        return result
            .OrderBy(x => x.Kind)
            .ThenBy(x => x.Name)
            .ThenBy(x => x.PartNumber)
            .ToList();
    }


    // Products of a type with stock on hand (any branch)
    private async Task<HashSet<long>> LoadOnHandAsync(
        string productType,
        List<long> ids)
    {
        if (ids.Count == 0)
        {
            return new HashSet<long>();
        }

        List<long> found =
            await _context
                .Set<StockMovementsEntity>()
                .AsNoTracking()
                .Where(x => x.ProductType == productType && x.Bucket == BucketOnHand && ids.Contains(x.ProductId))
                .GroupBy(x => x.ProductId)
                .Where(g => g.Sum(x => x.QuantityIn - x.QuantityOut) > 0m)
                .Select(g => g.Key)
                .ToListAsync();

        return found.ToHashSet();
    }


    //===============================================================
    // Company
    //===============================================================

    private async Task<PublicCompanyDto> LoadCompanyAsync()
    {
        CompanyEntity? company =
            await _context
                .Set<CompanyEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.IsActive)
                .ThenBy(x => x.CompanyId)
                .FirstOrDefaultAsync();

        if (company is null)
        {
            return new PublicCompanyDto();
        }

        string address =
            string.Join
            (
                ", ",
                new[] { company.AddressLine1, company.AddressLine2 }
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Select(x => x.Trim())
            );

        return new PublicCompanyDto
        {
            Name = Clean(company.CompanyName),
            ShortName = Clean(company.CompanyShortName),
            Address = address,
            Phone = Clean(company.Phone),
            Mobile = Clean(company.Mobile),
            Email = Clean(company.Email),
            Website = Clean(company.Website),
            LogoPath = Clean(company.CompanyLogoPath)
        };
    }


    //===============================================================
    // Branches
    //===============================================================

    private async Task<List<PublicBranchDto>> LoadBranchesAsync()
    {
        Dictionary<long, string> wings =
            await _context
                .Set<WingsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .ToDictionaryAsync(x => x.WingId, x => x.WingName ?? string.Empty);

        List<BranchesEntity> branches =
            await _context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.WingId)
                .ThenBy(x => x.BranchCode)
                .ToListAsync();

        return branches
            .Select
            (
                x =>
                    new PublicBranchDto
                    {
                        Name = Clean(x.BranchName),
                        ShortName = Clean(x.ShortName),
                        Type = Clean(wings.GetValueOrDefault(x.WingId, string.Empty)),
                        Address = Clean(x.Address),
                        Mobile = Clean(x.Mobile),
                        Email = Clean(x.Email)
                    }
            )
            .ToList();
    }


    //===============================================================
    // Bike models
    //===============================================================

    private async Task<List<PublicBikeModelDto>> LoadModelsAsync()
    {
        List<ProductCategoryEntity> categories =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && x.CategoryType == MotorBikesType)
                .ToListAsync();

        if (categories.Count == 0)
        {
            return new List<PublicBikeModelDto>();
        }

        List<long> categoryIds =
            categories.Select(x => x.ProductCategoryId).ToList();

        List<ProductSubCategoryEntity> models =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && categoryIds.Contains(x.ProductCategoryId))
                .OrderBy(x => x.SubCategoryCode)
                .ToListAsync();

        List<MotorBikesEntity> bikes =
            await _context
                .Set<MotorBikesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && categoryIds.Contains(x.ProductCategoryId))
                .OrderBy(x => x.ProductCode)
                .ToListAsync();

        if (bikes.Count == 0)
        {
            return new List<PublicBikeModelDto>();
        }

        List<long> brandIds =
            categories
                .Where(x => x.BrandManagementId.HasValue)
                .Select(x => x.BrandManagementId!.Value)
                .Distinct()
                .ToList();

        Dictionary<long, BrandManagementEntity> brands =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && brandIds.Contains(x.BrandManagementId))
                .ToDictionaryAsync(x => x.BrandManagementId);

        List<long> colourIds =
            bikes.Select(x => x.ColorManagementId).Distinct().ToList();

        Dictionary<long, string> colours =
            await _context
                .Set<ColorManagementEntity>()
                .AsNoTracking()
                .Where(x => colourIds.Contains(x.ColorManagementId))
                .ToDictionaryAsync(x => x.ColorManagementId, x => x.ColorName ?? string.Empty);

        List<long> bikeIds =
            bikes.Select(x => x.MotorBikeId).ToList();

        Dictionary<long, decimal> prices =
            await LoadPricesAsync(ProductTypeMotorBikes, bikeIds);

        Dictionary<long, (decimal OnHand, decimal InTransit)> stock =
            await LoadStockAsync(bikeIds);

        Dictionary<long, ProductCategoryEntity> categoryById =
            categories.ToDictionary(x => x.ProductCategoryId);

        // Website fields of the linked Bike Models
        // (Website Configuration › Bikes)
        List<long> bikeModelIds =
            models
                .Where(x => x.BikeModelId.HasValue)
                .Select(x => x.BikeModelId!.Value)
                .Distinct()
                .ToList();

        Dictionary<long, BikeModelsEntity> bikeModels =
            await _context
                .Set<BikeModelsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && bikeModelIds.Contains(x.BikeModelId))
                .ToDictionaryAsync(x => x.BikeModelId);

        // Specification sheets (Motor Bike Specifications), one per
        // Bike Model : the oldest active record
        Dictionary<long, MotorBikeSpecificationsEntity> specOfModel =
            (await _context
                .Set<MotorBikeSpecificationsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status && bikeModelIds.Contains(x.BikeModelId))
                .OrderBy(x => x.MotorBikeSpecificationId)
                .ToListAsync())
            .GroupBy(x => x.BikeModelId)
            .ToDictionary(g => g.Key, g => g.First());

        List<long> specIds =
            specOfModel.Values
                .Where(x => x.ShowOnWebsite)
                .Select(x => x.MotorBikeSpecificationId)
                .ToList();

        List<MotorBikeSpecificationItemsEntity> specItems =
            specIds.Count == 0
                ? new List<MotorBikeSpecificationItemsEntity>()
                : await _context
                    .Set<MotorBikeSpecificationItemsEntity>()
                    .AsNoTracking()
                    .Where(x => specIds.Contains(x.MotorBikeSpecificationId))
                    .OrderBy(x => x.LineNo)
                    .ToListAsync();

        List<PublicBikeModelDto> result =
            new List<PublicBikeModelDto>();

        foreach (ProductSubCategoryEntity model in models)
        {
            List<MotorBikesEntity> modelBikes =
                bikes.Where(x => x.ProductSubCategoryId == model.ProductSubCategoryId).ToList();

            if (modelBikes.Count == 0)
            {
                continue;
            }

            BrandManagementEntity? brand = null;

            if
            (
                categoryById.TryGetValue(model.ProductCategoryId, out ProductCategoryEntity? category)
                &&
                category.BrandManagementId.HasValue
            )
            {
                brands.TryGetValue(category.BrandManagementId.Value, out brand);
            }

            List<PublicBikeColourDto> colourRows =
                modelBikes
                    .Select
                    (
                        bike =>
                            new PublicBikeColourDto
                            {
                                ProductCode = Clean(bike.ProductCode),
                                Colour = Clean(colours.GetValueOrDefault(bike.ColorManagementId, string.Empty)),
                                ImagePath = Clean(bike.ImagePath),
                                Price = prices.TryGetValue(bike.MotorBikeId, out decimal mrp) ? mrp : null,
                                Stock = Badge(bike, stock)
                            }
                    )
                    .ToList();

            List<decimal> colourPrices =
                colourRows.Where(x => x.Price.HasValue).Select(x => x.Price!.Value).ToList();

            BikeModelsEntity? bikeModel =
                model.BikeModelId.HasValue
                    ? bikeModels.GetValueOrDefault(model.BikeModelId.Value)
                    : null;

            // Featured colour (Website Configuration > Bikes) goes
            // first : its photo is the card / hero photo and the
            // colour chosen when the bike page opens
            if (bikeModel?.FeaturedMotorBikeId is long featuredId)
            {
                MotorBikesEntity? featuredBike =
                    modelBikes.FirstOrDefault(x => x.MotorBikeId == featuredId);

                if (featuredBike != null)
                {
                    string featuredCode =
                        Clean(featuredBike.ProductCode);

                    colourRows =
                        colourRows
                            .OrderBy(x => x.ProductCode == featuredCode && !string.IsNullOrEmpty(x.ImagePath) ? 0 : 1)
                            .ToList();
                }
            }

            MotorBikeSpecificationsEntity? spec =
                model.BikeModelId.HasValue
                    ? specOfModel.GetValueOrDefault(model.BikeModelId.Value)
                    : null;

            result.Add
            (
                new PublicBikeModelDto
                {
                    ModelCode = Clean(model.SubCategoryCode),
                    Model = Clean(model.SubCategoryName),
                    Brand = Clean(brand?.BrandName),
                    BrandCode = Clean(brand?.BrandCode),
                    BrandLogoPath = Clean(brand?.BrandImagePath),
                    Price = colourPrices.Count > 0 ? colourPrices.Min() : null,
                    Stock = Best(colourRows.Select(x => x.Stock)),
                    Colours = colourRows,
                    ShowOnWebsite = bikeModel?.ShowOnWebsite,
                    Featured = bikeModel?.IsFeatured,
                    Tagline = Clean(bikeModel?.Tagline),
                    Description = Clean(bikeModel?.Description),
                    DisplayOrder = bikeModel?.DisplayOrder,
                    ShowSpecs = spec?.ShowOnWebsite,
                    Engine = spec is { ShowOnWebsite: true } ? EngineLine(spec) : string.Empty,
                    Mileage = spec is { ShowOnWebsite: true } ? Clean(spec.Mileage) : string.Empty,
                    TopSpeed = spec is { ShowOnWebsite: true } && spec.TopSpeedKmh > 0 ? $"{spec.TopSpeedKmh} km/h" : string.Empty,
                    Specs = spec is { ShowOnWebsite: true } ? SpecSheet(spec, specItems) : new()
                }
            );
        }

        return result;
    }


    // "1200 W" for a motor, "125 cc" for an engine, else empty
    private static string EngineLine(
        MotorBikeSpecificationsEntity spec)
    {
        if (spec.MotorPowerWatts > 0)
        {
            return $"{spec.MotorPowerWatts} W";
        }

        return spec.EngineCc > 0
            ? $"{spec.EngineCc.ToString("0.##", CultureInfo.InvariantCulture)} cc"
            : string.Empty;
    }


    // Key figures first, then the technical rows by section
    private static List<PublicSpecGroupDto> SpecSheet(
        MotorBikeSpecificationsEntity spec,
        List<MotorBikeSpecificationItemsEntity> items)
    {
        string N(decimal v, string unit) =>
            v > 0 ? $"{v.ToString("0.##", CultureInfo.InvariantCulture)} {unit}" : string.Empty;

        List<PublicSpecRowDto> key =
            new List<(string Label, string Value)>
            {
                ("Fuel type", Clean(spec.FuelType)),
                ("Motor power", N(spec.MotorPowerWatts, "W")),
                ("Engine", N(spec.EngineCc, "cc")),
                (spec.MotorPowerWatts > 0 ? "Battery" : "Horse power", Clean(spec.HorsePower)),
                (spec.MotorPowerWatts > 0 ? "Range" : "Mileage", Clean(spec.Mileage)),
                ("Top speed", spec.TopSpeedKmh > 0 ? $"{spec.TopSpeedKmh} km/h" : string.Empty),
                ("RPM", spec.Rpm > 0 ? spec.Rpm.ToString(CultureInfo.InvariantCulture) : string.Empty),
                ("Body type", Clean(spec.BodyType)),
                ("Seating", spec.SeatingCapacity > 0 ? $"{spec.SeatingCapacity} person" : string.Empty),
                ("Weight", N(spec.UnladenWeightKg, "kg")),
                ("Wheel base", N(spec.WheelBaseMm, "mm")),
                ("Size (L x W x H)", spec.LengthMm > 0 && spec.WidthMm > 0 && spec.HeightMm > 0 ? $"{spec.LengthMm} x {spec.WidthMm} x {spec.HeightMm} mm" : string.Empty),
                ("Front tyre", Clean(spec.FrontTyreSize)),
                ("Rear tyre", Clean(spec.RearTyreSize)),
                ("Maker", Clean(spec.Maker)),
                ("Country of origin", Clean(spec.CountryOfOrigin))
            }
            .Where(x => x.Value.Length > 0)
            .Select(x => new PublicSpecRowDto { Label = x.Label, Value = x.Value })
            .ToList();

        List<PublicSpecGroupDto> groups =
            new List<PublicSpecGroupDto>();

        if (key.Count > 0)
        {
            groups.Add(new PublicSpecGroupDto { Title = "Key figures", Rows = key });
        }

        foreach (var section in items
            .Where(x => x.MotorBikeSpecificationId == spec.MotorBikeSpecificationId
                && !string.IsNullOrWhiteSpace(x.Label)
                && !string.IsNullOrWhiteSpace(x.Value))
            .GroupBy(x => Clean(x.Section)))
        {
            groups.Add
            (
                new PublicSpecGroupDto
                {
                    Title = section.Key.Length > 0 ? section.Key : "More",
                    Rows = section
                        .OrderBy(x => x.LineNo)
                        .Select(x => new PublicSpecRowDto { Label = Clean(x.Label), Value = Clean(x.Value) })
                        .ToList()
                }
            );
        }

        return groups;
    }


    // Product → MRP of its newest batch that has an MRP
    private async Task<Dictionary<long, decimal>> LoadPricesAsync(
        string productType,
        List<long> bikeIds)
    {
        if (bikeIds.Count == 0)
        {
            return new Dictionary<long, decimal>();
        }

        var batches =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductType == productType
                        &&
                        bikeIds.Contains(x.ProductId)
                        &&
                        x.Mrp > 0m
                )
                .Select(x => new { x.ProductId, x.StockBatchId, x.Mrp })
                .ToListAsync();

        return batches
            .GroupBy(x => x.ProductId)
            .ToDictionary
            (
                g => g.Key,
                g => g.OrderByDescending(x => x.StockBatchId).First().Mrp
            );
    }


    // Motor bike → On Hand and In Transit, all branches
    private async Task<Dictionary<long, (decimal OnHand, decimal InTransit)>> LoadStockAsync(
        List<long> bikeIds)
    {
        var sums =
            await _context
                .Set<StockMovementsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductType == ProductTypeMotorBikes
                        &&
                        bikeIds.Contains(x.ProductId)
                )
                .GroupBy(x => x.ProductId)
                .Select
                (
                    g =>
                        new
                        {
                            ProductId = g.Key,
                            OnHand = g.Sum(x => x.Bucket == BucketOnHand ? x.QuantityIn - x.QuantityOut : 0m),
                            InTransit = g.Sum(x => x.Bucket != BucketOnHand ? x.QuantityIn - x.QuantityOut : 0m)
                        }
                )
                .ToListAsync();

        return sums.ToDictionary(x => x.ProductId, x => (x.OnHand, x.InTransit));
    }


    private static string Badge(
        MotorBikesEntity bike,
        Dictionary<long, (decimal OnHand, decimal InTransit)> stock)
    {
        if
        (
            !stock.TryGetValue(bike.MotorBikeId, out (decimal OnHand, decimal InTransit) row)
            ||
            row.OnHand <= 0m
        )
        {
            return StockPre;
        }

        decimal total =
            row.OnHand + Math.Max(row.InTransit, 0m);

        bool low =
            (bike.RedLevel > 0 && total <= bike.RedLevel)
            ||
            (bike.ReorderLevel > 0 && total <= bike.ReorderLevel);

        return low ? StockFew : StockIn;
    }


    private static string Best(
        IEnumerable<string> badges)
    {
        List<string> list =
            badges.ToList();

        if (list.Contains(StockIn))
        {
            return StockIn;
        }

        if (list.Contains(StockFew))
        {
            return StockFew;
        }

        return StockPre;
    }


    private static string Clean(
        string? value)
    {
        return (value ?? string.Empty).Trim();
    }
}
