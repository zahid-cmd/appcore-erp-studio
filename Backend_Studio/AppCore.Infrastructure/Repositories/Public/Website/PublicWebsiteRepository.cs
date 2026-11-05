//===============================================================
// Imports
//===============================================================

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
                    Colours = colourRows
                }
            );
        }

        return result;
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
