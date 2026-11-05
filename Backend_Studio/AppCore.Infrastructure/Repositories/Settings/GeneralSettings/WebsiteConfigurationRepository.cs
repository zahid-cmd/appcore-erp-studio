//===============================================================
// Imports
//===============================================================

using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.WebsiteConfiguration.DTOs;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;

using CompanyEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Company;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using WingsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Wings;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.GeneralSettings;


//===============================================================
// Website Configuration Repository
//
//   GetAsync   the saved configuration, else defaults; always
//              every active brand (Brand Management) and branch,
//              so the page can set them before the first save
//   SaveAsync  checks, then in ONE transaction : the row (made
//              on the first save) and every list replaced;
//              one Activity History line naming the changed tabs
//===============================================================

public class WebsiteConfigurationRepository : IWebsiteConfigurationRepository
{
    private const string HistoryModule = "General Settings";

    private const string HistoryEntity = "WebsiteConfiguration";

    private const string MotorBikesType = "Motor Bikes";

    private static readonly string[] Themes = { "auto", "light", "deep" };

    private static readonly string[] Kinds = { "tag", "why-point", "why-stat", "service", "faq", "payment", "text" };

    private static readonly string[] PolicyKeys = { "warranty", "terms", "privacy" };

    private static readonly Regex TimePattern =
        new(@"^([01]\d|2[0-3]):[0-5]\d$", RegexOptions.Compiled);

    private static readonly Regex EmailPattern =
        new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);

    private readonly AppDbContext _context;


    public WebsiteConfigurationRepository(
        AppDbContext context)
    {
        _context = context;
    }


    //===============================================================
    // Read
    //===============================================================

    public async Task<WebsiteConfigurationDto> GetAsync()
    {
        WebsiteConfigurations? row =
            await _context
                .Set<WebsiteConfigurations>()
                .AsNoTracking()
                .OrderBy(x => x.WebsiteConfigurationId)
                .FirstOrDefaultAsync();

        WebsiteConfigurationDto dto =
            row is null
                ? new WebsiteConfigurationDto()
                : FromRow(row);

        dto.Company = await LoadCompanyAsync();

        dto.OpeningHours =
            await _context
                .Set<WebsiteOpeningHours>()
                .AsNoTracking()
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.WebsiteOpeningHourId)
                .Select(x => new WebsiteHourDto { Days = x.Days, OpensAt = x.OpensAt, ClosesAt = x.ClosesAt, IsClosed = x.IsClosed })
                .ToListAsync();

        dto.Items =
            await _context
                .Set<WebsiteContentItems>()
                .AsNoTracking()
                .OrderBy(x => x.Kind)
                .ThenBy(x => x.DisplayOrder)
                .ThenBy(x => x.WebsiteContentItemId)
                .Select(x => new WebsiteItemDto { Kind = x.Kind, Title = x.Title, Text = x.Text, PhotoPath = x.PhotoPath })
                .ToListAsync();

        dto.Brands = await LoadBrandsAsync();

        dto.Branches = await LoadBranchesAsync();

        dto.Policies = await LoadPoliciesAsync(dto.Brands);

        return dto;
    }


    private static WebsiteConfigurationDto FromRow(
        WebsiteConfigurations x)
    {
        return new WebsiteConfigurationDto
        {
            Exists = true,
            IsEnabled = x.IsEnabled,
            DefaultTheme = x.DefaultTheme,
            Template = x.Template,
            CurrencySymbol = string.IsNullOrWhiteSpace(x.CurrencySymbol) ? "৳" : x.CurrencySymbol,
            OfferTitle = x.OfferTitle,
            OfferText = x.OfferText,
            OfferEndsOn = x.OfferEndsOn,
            Tagline = x.Tagline,
            About = x.About,
            Hotline = x.Hotline,
            WhatsApp = x.WhatsApp,
            Email = x.Email,
            MapQuery = x.MapQuery,
            MapLink = x.MapLink,
            FacebookUrl = x.FacebookUrl,
            YoutubeUrl = x.YoutubeUrl,
            InstagramUrl = x.InstagramUrl,
            TiktokUrl = x.TiktokUrl,
            ShowBrandsMenu = x.ShowBrandsMenu,
            ShowOfferRibbon = x.ShowOfferRibbon,
            ShowMovingStrip = x.ShowMovingStrip,
            StripSpeed = x.StripSpeed,
            ShowWhyUs = x.ShowWhyUs,
            ShowEmi = x.ShowEmi,
            ShowService = x.ShowService,
            ShowBranches = x.ShowBranches,
            ShowFaq = x.ShowFaq,
            WhyPhotoPath = x.WhyPhotoPath,
            HeroPhotoPath = x.HeroPhotoPath,
            HeroWelcome = x.HeroWelcome,
            HeroBackground = x.HeroBackground,
            HeroStrength = x.HeroStrength,
            HeroTitle = x.HeroTitle,
            HeroText = x.HeroText,
            HeroShowAddress = x.HeroShowAddress,
            HeroRoundOn = x.HeroRoundOn,
            HeroRoundPath = x.HeroRoundPath,
            HeroRoundStrength = x.HeroRoundStrength,
            EmiExamplePrice = x.EmiExamplePrice,
            EmiDownPercents = ParseNumbers(x.EmiDownPercents),
            EmiMonths = ParseNumbers(x.EmiMonths),
            EmiNote = x.EmiNote,
            ModifiedDate = x.ModifiedDate ?? x.CreatedDate
        };
    }


    private async Task<WebsiteCompanyInfoDto> LoadCompanyAsync()
    {
        CompanyEntity? c =
            await _context
                .Set<CompanyEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.IsActive)
                .ThenBy(x => x.CompanyId)
                .FirstOrDefaultAsync();

        if (c is null)
        {
            return new WebsiteCompanyInfoDto();
        }

        return new WebsiteCompanyInfoDto
        {
            Name = c.CompanyName ?? string.Empty,
            LogoPath = c.CompanyLogoPath ?? string.Empty,
            Phone = c.Phone ?? string.Empty,
            Mobile = c.Mobile ?? string.Empty,
            Email = c.Email ?? string.Empty,
            Address =
                string.Join(
                    ", ",
                    new[] { c.AddressLine1, c.AddressLine2 }
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Select(x => x!.Trim()))
        };
    }


    // Every active brand used by an active category, plus any
    // brand already set on the website; saved order first
    private async Task<List<WebsiteBrandDto>> LoadBrandsAsync()
    {
        List<WebsiteBrands> saved =
            await _context
                .Set<WebsiteBrands>()
                .AsNoTracking()
                .ToListAsync();

        List<ProductCategoryEntity> categories =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && x.BrandManagementId.HasValue)
                .ToListAsync();

        HashSet<long> used =
            categories.Select(x => x.BrandManagementId!.Value).ToHashSet();

        List<long> savedIds =
            saved.Select(x => x.BrandManagementId).ToList();

        List<BrandManagementEntity> brands =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && ((x.Status && used.Contains(x.BrandManagementId)) || savedIds.Contains(x.BrandManagementId)))
                .ToListAsync();

        // Active bike models (sub categories with an active bike) per brand
        List<long> mbCategoryIds =
            categories.Where(x => x.CategoryType == MotorBikesType).Select(x => x.ProductCategoryId).ToList();

        var bikeModels =
            await _context
                .Set<MotorBikesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && mbCategoryIds.Contains(x.ProductCategoryId))
                .Select(x => new { x.ProductCategoryId, x.ProductSubCategoryId })
                .Distinct()
                .ToListAsync();

        Dictionary<long, long> brandOfCategory =
            categories.ToDictionary(x => x.ProductCategoryId, x => x.BrandManagementId!.Value);

        Dictionary<long, int> modelCount =
            bikeModels
                .GroupBy(x => brandOfCategory.GetValueOrDefault(x.ProductCategoryId))
                .ToDictionary(g => g.Key, g => g.Count());

        Dictionary<long, WebsiteBrands> savedById =
            saved.ToDictionary(x => x.BrandManagementId);

        return brands
            .OrderBy(x => savedById.TryGetValue(x.BrandManagementId, out WebsiteBrands? s) ? s.DisplayOrder : int.MaxValue)
            .ThenByDescending(x => modelCount.GetValueOrDefault(x.BrandManagementId))
            .ThenBy(x => x.BrandCode)
            .Select
            (
                x =>
                {
                    savedById.TryGetValue(x.BrandManagementId, out WebsiteBrands? s);

                    return new WebsiteBrandDto
                    {
                        BrandManagementId = x.BrandManagementId,
                        BrandCode = x.BrandCode ?? string.Empty,
                        BrandName = x.BrandName ?? string.Empty,
                        LogoPath = x.BrandImagePath ?? string.Empty,
                        BikeModels = modelCount.GetValueOrDefault(x.BrandManagementId),
                        ShowOnWebsite = s?.ShowOnWebsite ?? true,
                        ShowBrandPage = s?.ShowBrandPage ?? true,
                        About = s?.About ?? string.Empty
                    };
                }
            )
            .ToList();
    }


    private async Task<List<WebsiteBranchDto>> LoadBranchesAsync()
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

        List<WebsiteBranchBrands> pairs =
            await _context
                .Set<WebsiteBranchBrands>()
                .AsNoTracking()
                .ToListAsync();

        return branches
            .Select
            (
                x =>
                    new WebsiteBranchDto
                    {
                        BranchId = x.BranchId,
                        BranchName = x.BranchName ?? string.Empty,
                        WingName = wings.GetValueOrDefault(x.WingId, string.Empty),
                        BrandIds = pairs.Where(p => p.BranchId == x.BranchId).Select(p => p.BrandManagementId).ToList()
                    }
            )
            .ToList();
    }


    private async Task<List<WebsitePolicyDto>> LoadPoliciesAsync(
        List<WebsiteBrandDto> brands)
    {
        List<WebsitePolicies> policies =
            await _context
                .Set<WebsitePolicies>()
                .AsNoTracking()
                .ToListAsync();

        List<WebsitePolicySections> sections =
            await _context
                .Set<WebsitePolicySections>()
                .AsNoTracking()
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.WebsitePolicySectionId)
                .ToListAsync();

        Dictionary<long, string> brandNames =
            brands.ToDictionary(x => x.BrandManagementId, x => x.BrandName);

        return policies
            .OrderBy(x => Array.IndexOf(PolicyKeys, x.PolicyKey))
            .ThenBy(x => x.BrandManagementId == 0 ? 0 : 1)
            .ThenBy(x => brandNames.GetValueOrDefault(x.BrandManagementId, string.Empty))
            .Select
            (
                p =>
                    new WebsitePolicyDto
                    {
                        PolicyKey = p.PolicyKey,
                        BrandManagementId = p.BrandManagementId,
                        BrandName = p.BrandManagementId == 0 ? string.Empty : brandNames.GetValueOrDefault(p.BrandManagementId, string.Empty),
                        Title = p.Title,
                        UpdatedOn = p.UpdatedOn,
                        Sections =
                            sections
                                .Where(s => s.WebsitePolicyId == p.WebsitePolicyId)
                                .Select(s => new WebsitePolicySectionDto { Heading = s.Heading, Text = s.Text })
                                .ToList()
                    }
            )
            .ToList();
    }


    //===============================================================
    // Save
    //===============================================================

    public async Task SaveAsync(
        WebsiteConfigurationDto dto,
        long userId,
        string userName)
    {
        Check(dto);

        WebsiteConfigurationDto before =
            await GetAsync();

        // Google Maps link → the pin. Read again only when the link
        // changed or no pin is known; a link that cannot be read keeps
        // a typed place name, else it is refused.
        string mapLink =
            Clean(dto.MapLink);

        if (mapLink.Length > 0 && (mapLink != Clean(before.MapLink) || Clean(dto.MapQuery).Length == 0))
        {
            WebsiteMapPinDto? pin =
                await GoogleMapsLink.TryResolveAsync(mapLink);

            if (pin != null)
            {
                dto.MapQuery = pin.Query;
            }
            else if (Clean(dto.MapQuery).Length == 0)
            {
                throw new InvalidOperationException("The Google Maps link could not be read. Copy it again from Google Maps (Share › Copy link), or type the place name or coordinates.");
            }
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        DateTime now =
            DateTime.UtcNow;

        WebsiteConfigurations? row =
            await _context
                .Set<WebsiteConfigurations>()
                .OrderBy(x => x.WebsiteConfigurationId)
                .FirstOrDefaultAsync();

        bool created =
            row is null;

        if (row is null)
        {
            row = new WebsiteConfigurations { CreatedBy = userId, CreatedDate = now };

            _context.Set<WebsiteConfigurations>().Add(row);
        }
        else
        {
            row.ModifiedBy = userId;
            row.ModifiedDate = now;
        }

        row.IsEnabled = dto.IsEnabled;
        row.DefaultTheme = dto.DefaultTheme.Trim().ToLowerInvariant();
        row.Template = string.IsNullOrWhiteSpace(dto.Template) ? "website-page-1" : dto.Template.Trim();
        // The database is WIN1252 and cannot hold "৳" : store it as empty
        // (empty means ৳ everywhere)
        row.CurrencySymbol = string.IsNullOrWhiteSpace(dto.CurrencySymbol) || dto.CurrencySymbol.Trim() == "৳" ? string.Empty : dto.CurrencySymbol.Trim();
        row.OfferTitle = Clean(dto.OfferTitle);
        row.OfferText = Clean(dto.OfferText);
        row.OfferEndsOn = dto.OfferEndsOn;
        row.Tagline = Clean(dto.Tagline);
        row.About = Clean(dto.About);
        row.Hotline = Clean(dto.Hotline);
        row.WhatsApp = Clean(dto.WhatsApp);
        row.Email = Clean(dto.Email);
        row.MapQuery = Clean(dto.MapQuery);
        row.MapLink = Clean(dto.MapLink);
        row.FacebookUrl = Clean(dto.FacebookUrl);
        row.YoutubeUrl = Clean(dto.YoutubeUrl);
        row.InstagramUrl = Clean(dto.InstagramUrl);
        row.TiktokUrl = Clean(dto.TiktokUrl);
        row.ShowBrandsMenu = dto.ShowBrandsMenu;
        row.ShowOfferRibbon = dto.ShowOfferRibbon;
        row.ShowMovingStrip = dto.ShowMovingStrip;
        row.StripSpeed = dto.StripSpeed;
        row.ShowWhyUs = dto.ShowWhyUs;
        row.ShowEmi = dto.ShowEmi;
        row.ShowService = dto.ShowService;
        row.ShowBranches = dto.ShowBranches;
        row.ShowFaq = dto.ShowFaq;
        row.WhyPhotoPath = Clean(dto.WhyPhotoPath);
        row.HeroPhotoPath = Clean(dto.HeroPhotoPath);
        row.HeroWelcome = dto.HeroWelcome;
        row.HeroBackground = dto.HeroBackground;
        row.HeroStrength = dto.HeroStrength;
        row.HeroTitle = Clean(dto.HeroTitle);
        row.HeroText = Clean(dto.HeroText);
        row.HeroShowAddress = dto.HeroShowAddress;
        row.HeroRoundOn = dto.HeroRoundOn;
        row.HeroRoundPath = Clean(dto.HeroRoundPath);
        row.HeroRoundStrength = dto.HeroRoundStrength;
        row.EmiExamplePrice = Math.Round(dto.EmiExamplePrice, 2);
        row.EmiDownPercents = string.Join(",", dto.EmiDownPercents.Distinct().OrderBy(x => x));
        row.EmiMonths = string.Join(",", dto.EmiMonths.Distinct().OrderBy(x => x));
        row.EmiNote = Clean(dto.EmiNote);

        // Lists : replaced as a whole
        _context.Set<WebsiteOpeningHours>().RemoveRange(_context.Set<WebsiteOpeningHours>());
        _context.Set<WebsiteContentItems>().RemoveRange(_context.Set<WebsiteContentItems>());
        _context.Set<WebsiteBrands>().RemoveRange(_context.Set<WebsiteBrands>());
        _context.Set<WebsiteBranchBrands>().RemoveRange(_context.Set<WebsiteBranchBrands>());
        _context.Set<WebsitePolicySections>().RemoveRange(_context.Set<WebsitePolicySections>());
        _context.Set<WebsitePolicies>().RemoveRange(_context.Set<WebsitePolicies>());

        await _context.SaveChangesAsync();

        int order = 0;

        foreach (WebsiteHourDto h in dto.OpeningHours)
        {
            _context.Set<WebsiteOpeningHours>().Add(
                new WebsiteOpeningHours
                {
                    Days = Clean(h.Days),
                    OpensAt = h.IsClosed ? string.Empty : Clean(h.OpensAt),
                    ClosesAt = h.IsClosed ? string.Empty : Clean(h.ClosesAt),
                    IsClosed = h.IsClosed,
                    DisplayOrder = ++order
                });
        }

        foreach (IGrouping<string, WebsiteItemDto> kind in dto.Items.GroupBy(x => x.Kind.Trim().ToLowerInvariant()))
        {
            order = 0;

            foreach (WebsiteItemDto item in kind)
            {
                _context.Set<WebsiteContentItems>().Add(
                    new WebsiteContentItems
                    {
                        Kind = kind.Key,
                        Title = Clean(item.Title),
                        Text = Clean(item.Text),
                        PhotoPath = Clean(item.PhotoPath),
                        DisplayOrder = ++order
                    });
            }
        }

        order = 0;

        foreach (WebsiteBrandDto b in dto.Brands)
        {
            _context.Set<WebsiteBrands>().Add(
                new WebsiteBrands
                {
                    BrandManagementId = b.BrandManagementId,
                    ShowOnWebsite = b.ShowOnWebsite,
                    ShowBrandPage = b.ShowBrandPage,
                    About = Clean(b.About),
                    DisplayOrder = ++order
                });
        }

        foreach (WebsiteBranchDto branch in dto.Branches)
        {
            foreach (long brandId in branch.BrandIds.Distinct())
            {
                _context.Set<WebsiteBranchBrands>().Add(
                    new WebsiteBranchBrands { BranchId = branch.BranchId, BrandManagementId = brandId });
            }
        }

        foreach (WebsitePolicyDto p in dto.Policies)
        {
            WebsitePolicies policy =
                new WebsitePolicies
                {
                    PolicyKey = p.PolicyKey.Trim().ToLowerInvariant(),
                    BrandManagementId = p.BrandManagementId,
                    Title = Clean(p.Title),
                    UpdatedOn = p.UpdatedOn
                };

            _context.Set<WebsitePolicies>().Add(policy);

            await _context.SaveChangesAsync();

            order = 0;

            foreach (WebsitePolicySectionDto s in p.Sections)
            {
                _context.Set<WebsitePolicySections>().Add(
                    new WebsitePolicySections
                    {
                        WebsitePolicyId = policy.WebsitePolicyId,
                        Heading = Clean(s.Heading),
                        Text = Clean(s.Text),
                        DisplayOrder = ++order
                    });
            }
        }

        await _context.SaveChangesAsync();

        string changed =
            ChangedTabs(before, dto);

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = row.WebsiteConfigurationId,
                ActivityType = created ? "Create" : "Update",
                ActivityTitle = created ? "Website Configuration saved for the first time" : "Website Configuration updated",
                ActivityDescription = changed,
                PerformedBy = userId,
                PerformedByName = userName,
                PerformedDate = now
            });

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    public Task<WebsiteMapPinDto?> ResolveMapAsync(
        string link)
    {
        return GoogleMapsLink.TryResolveAsync(link);
    }


    public async Task<List<ActivityHistoryDto>> GetHistoryAsync()
    {
        return
            await _context.ActivityHistories
                .AsNoTracking()
                .Where(x => x.Module == HistoryModule && x.EntityName == HistoryEntity)
                .OrderByDescending(x => x.PerformedDate)
                .Select
                (
                    x =>
                        new ActivityHistoryDto
                        {
                            Id = x.Id,
                            Module = x.Module,
                            EntityName = x.EntityName,
                            EntityId = x.EntityId,
                            ActivityType = x.ActivityType,
                            ActivityTitle = x.ActivityTitle,
                            ActivityDescription = x.ActivityDescription,
                            PerformedBy = x.PerformedBy,
                            PerformedByName = x.PerformedByName,
                            PerformedDate = x.PerformedDate
                        }
                )
                .ToListAsync();
    }


    //===============================================================
    // Checks (InvalidOperationException → 400 with the message)
    //===============================================================

    private void Check(
        WebsiteConfigurationDto dto)
    {
        dto.OpeningHours ??= new();
        dto.Items ??= new();
        dto.Brands ??= new();
        dto.Branches ??= new();
        dto.Policies ??= new();
        dto.EmiDownPercents ??= new();
        dto.EmiMonths ??= new();

        if (!Themes.Contains((dto.DefaultTheme ?? string.Empty).Trim().ToLowerInvariant()))
        {
            throw new InvalidOperationException("Default theme must be Follow device, Light or Deep.");
        }

        dto.DefaultTheme ??= "auto";

        Max(dto.Tagline, 200, "Tagline");
        Max(dto.About, 1000, "About");
        Max(dto.Hotline, 30, "Hotline");
        Max(dto.WhatsApp, 30, "WhatsApp number");
        Max(dto.Email, 150, "Email");
        Max(dto.MapQuery, 300, "Map location");
        Max(dto.MapLink, 1000, "Google Maps link");

        if (Clean(dto.MapLink).Length > 0 && !GoogleMapsLink.IsGoogleMapsUrl(Clean(dto.MapLink)))
        {
            throw new InvalidOperationException("Google Maps link : paste a link copied from Google Maps (Share › Copy link).");
        }
        Max(dto.FacebookUrl, 300, "Facebook link");
        Max(dto.YoutubeUrl, 300, "YouTube link");
        Max(dto.InstagramUrl, 300, "Instagram link");
        Max(dto.TiktokUrl, 300, "TikTok link");
        Max(dto.EmiNote, 500, "EMI note");

        Max(dto.HeroPhotoPath, 300, "Hero photo");
        Max(dto.HeroTitle, 150, "Welcome title");
        Max(dto.HeroText, 300, "Welcome line");

        Max(dto.HeroRoundPath, 300, "Round image");

        if (dto.HeroRoundStrength < 1 || dto.HeroRoundStrength > 5)
        {
            throw new InvalidOperationException("Round image strength must be from 1 (subtle) to 5 (strong).");
        }

        if (dto.HeroStrength < 1 || dto.HeroStrength > 5)
        {
            throw new InvalidOperationException("Hero background strength must be from 1 (subtle) to 5 (strong).");
        }

        if (dto.StripSpeed < 1 || dto.StripSpeed > 10)
        {
            throw new InvalidOperationException("Moving strip speed must be from 1 (slowest) to 10 (fastest).");
        }
        Max(dto.CurrencySymbol, 5, "Currency symbol");
        Max(dto.OfferTitle, 150, "Offer title");
        Max(dto.OfferText, 300, "Offer details");

        if (!string.IsNullOrWhiteSpace(dto.Email) && !EmailPattern.IsMatch(dto.Email.Trim()))
        {
            throw new InvalidOperationException("Email is not a valid email address.");
        }

        if (!string.IsNullOrWhiteSpace(dto.WhatsApp) && !Regex.IsMatch(dto.WhatsApp.Trim(), @"^\+?\d{6,15}$"))
        {
            throw new InvalidOperationException("WhatsApp number: digits only (a leading + is allowed).");
        }

        foreach (string link in new[] { dto.FacebookUrl, dto.YoutubeUrl, dto.InstagramUrl, dto.TiktokUrl })
        {
            if (!string.IsNullOrWhiteSpace(link) && !link.Trim().StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException($"Social links must start with https:// (\"{link.Trim()}\").");
            }
        }

        if (dto.EmiExamplePrice < 0)
        {
            throw new InvalidOperationException("EMI example price cannot be below 0.");
        }

        if (dto.EmiDownPercents.Any(x => x < 0 || x > 90))
        {
            throw new InvalidOperationException("EMI down payment options must be between 0 and 90 %.");
        }

        if (dto.EmiMonths.Any(x => x < 1 || x > 120))
        {
            throw new InvalidOperationException("EMI months must be between 1 and 120.");
        }

        if (dto.ShowEmi && (dto.EmiDownPercents.Count == 0 || dto.EmiMonths.Count == 0))
        {
            throw new InvalidOperationException("The EMI calculator needs at least one down payment option and one month option.");
        }

        foreach (WebsiteHourDto h in dto.OpeningHours)
        {
            if (string.IsNullOrWhiteSpace(h.Days))
            {
                throw new InvalidOperationException("Every opening-hours row needs its days.");
            }

            Max(h.Days, 80, "Opening-hours days");

            if (!h.IsClosed && (!TimePattern.IsMatch(h.OpensAt ?? string.Empty) || !TimePattern.IsMatch(h.ClosesAt ?? string.Empty)))
            {
                throw new InvalidOperationException($"Opening hours \"{h.Days.Trim()}\": give both times, or tick Closed.");
            }
        }

        foreach (WebsiteItemDto item in dto.Items)
        {
            if (!Kinds.Contains((item.Kind ?? string.Empty).Trim().ToLowerInvariant()))
            {
                throw new InvalidOperationException($"Unknown list kind \"{item.Kind}\".");
            }

            if (string.IsNullOrWhiteSpace(item.Title))
            {
                throw new InvalidOperationException("Every list entry needs its title (question, number, name or selling point).");
            }

            Max(item.Title, 200, "List title");
            Max(item.Text, 2000, "List text");
            Max(item.PhotoPath, 300, "Photo");
        }

        if (dto.Brands.Select(x => x.BrandManagementId).Distinct().Count() != dto.Brands.Count)
        {
            throw new InvalidOperationException("A brand is listed twice.");
        }

        foreach (WebsiteBrandDto b in dto.Brands)
        {
            Max(b.About, 1000, $"About {b.BrandName}");
        }

        HashSet<long> brandIds =
            dto.Brands.Select(x => x.BrandManagementId).ToHashSet();

        if (dto.Branches.SelectMany(x => x.BrandIds).Any(x => !brandIds.Contains(x)))
        {
            throw new InvalidOperationException("A branch names a brand that is not in the Brands list.");
        }

        foreach (WebsitePolicyDto p in dto.Policies)
        {
            string key =
                (p.PolicyKey ?? string.Empty).Trim().ToLowerInvariant();

            if (!PolicyKeys.Contains(key))
            {
                throw new InvalidOperationException($"Unknown policy page \"{p.PolicyKey}\".");
            }

            if (p.BrandManagementId != 0 && key != "warranty")
            {
                throw new InvalidOperationException("Only Warranty can have a part per brand.");
            }

            if (p.BrandManagementId != 0 && !brandIds.Contains(p.BrandManagementId))
            {
                throw new InvalidOperationException("A warranty part names a brand that is not in the Brands list.");
            }

            Max(p.Title, 150, "Policy title");

            p.Sections ??= new();

            foreach (WebsitePolicySectionDto s in p.Sections)
            {
                Max(s.Heading, 200, "Section heading");
                Max(s.Text, 4000, "Section text");
            }

            p.Sections =
                p.Sections
                    .Where(s => !string.IsNullOrWhiteSpace(s.Heading) || !string.IsNullOrWhiteSpace(s.Text))
                    .ToList();
        }

        if (dto.Policies.GroupBy(x => new { Key = x.PolicyKey.Trim().ToLowerInvariant(), x.BrandManagementId }).Any(g => g.Count() > 1))
        {
            throw new InvalidOperationException("A policy part is listed twice.");
        }
    }


    private static void Max(
        string? value,
        int max,
        string label)
    {
        if ((value ?? string.Empty).Trim().Length > max)
        {
            throw new InvalidOperationException($"{label} is too long (at most {max} characters).");
        }
    }


    private static string Clean(
        string? value)
    {
        return (value ?? string.Empty).Trim();
    }


    private static List<int> ParseNumbers(
        string? value)
    {
        return (value ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => int.TryParse(x, NumberStyles.Integer, CultureInfo.InvariantCulture, out int n) ? n : -1)
            .Where(x => x >= 0)
            .ToList();
    }


    // Names the tabs whose content changed, for the history line
    private static string ChangedTabs(
        WebsiteConfigurationDto a,
        WebsiteConfigurationDto b)
    {
        static string J(object o) => JsonSerializer.Serialize(o);

        List<string> tabs = new();

        if (J(new { a.IsEnabled, a.DefaultTheme, a.CurrencySymbol, a.Tagline, a.About, a.ShowBrandsMenu, a.ShowOfferRibbon, a.ShowMovingStrip, a.ShowWhyUs, a.ShowEmi, a.ShowService, a.ShowBranches, a.ShowFaq })
            != J(new { b.IsEnabled, DefaultTheme = b.DefaultTheme.Trim().ToLowerInvariant(), CurrencySymbol = string.IsNullOrWhiteSpace(b.CurrencySymbol) ? "৳" : b.CurrencySymbol.Trim(), Tagline = Clean(b.Tagline), About = Clean(b.About), b.ShowBrandsMenu, b.ShowOfferRibbon, b.ShowMovingStrip, b.ShowWhyUs, b.ShowEmi, b.ShowService, b.ShowBranches, b.ShowFaq }))
        {
            tabs.Add("General");
        }

        // List entries of some kinds, cleaned, kind by kind in order
        static string Rows(IEnumerable<WebsiteItemDto> items, params string[] kinds) =>
            J(items
                .Where(x => kinds.Contains(x.Kind.Trim().ToLowerInvariant()))
                .GroupBy(x => x.Kind.Trim().ToLowerInvariant())
                .OrderBy(g => g.Key)
                .SelectMany(g => g.Select(x => new { Kind = g.Key, Title = Clean(x.Title), Text = Clean(x.Text), PhotoPath = Clean(x.PhotoPath) })));

        if (Rows(a.Items, "payment") != Rows(b.Items, "payment"))
        {
            tabs.Add("Payments");
        }

        if (Rows(a.Items, "text") != Rows(b.Items, "text"))
        {
            tabs.Add("Section Headings");
        }

        if (J(new { a.Hotline, a.WhatsApp, a.Email, a.MapQuery, a.MapLink })
            != J(new { Hotline = Clean(b.Hotline), WhatsApp = Clean(b.WhatsApp), Email = Clean(b.Email), MapQuery = Clean(b.MapQuery), MapLink = Clean(b.MapLink) }))
        {
            tabs.Add("Contact & Location");
        }

        if (J(new { a.FacebookUrl, a.YoutubeUrl, a.InstagramUrl, a.TiktokUrl, a.OpeningHours })
            != J(new { FacebookUrl = Clean(b.FacebookUrl), YoutubeUrl = Clean(b.YoutubeUrl), InstagramUrl = Clean(b.InstagramUrl), TiktokUrl = Clean(b.TiktokUrl), b.OpeningHours }))
        {
            tabs.Add("Hours & Social");
        }

        if (J(a.Brands.Select(x => new { x.BrandManagementId, x.ShowOnWebsite, x.ShowBrandPage, x.About }))
            + J(a.Branches.Select(x => new { x.BranchId, BrandIds = x.BrandIds.OrderBy(i => i) }))
            != J(b.Brands.Select(x => new { x.BrandManagementId, x.ShowOnWebsite, x.ShowBrandPage, About = Clean(x.About) }))
            + J(b.Branches.Where(x => x.BrandIds.Count > 0 || a.Branches.Any(o => o.BranchId == x.BranchId)).Select(x => new { x.BranchId, BrandIds = x.BrandIds.Distinct().OrderBy(i => i) })))
        {
            tabs.Add("Brands");
        }

        if (J(new { a.StripSpeed, a.OfferTitle, a.OfferText, a.OfferEndsOn, a.WhyPhotoPath }) + Rows(a.Items, "tag", "why-point", "why-stat")
            != J(new { b.StripSpeed, OfferTitle = Clean(b.OfferTitle), OfferText = Clean(b.OfferText), b.OfferEndsOn, WhyPhotoPath = Clean(b.WhyPhotoPath) }) + Rows(b.Items, "tag", "why-point", "why-stat"))
        {
            tabs.Add("Home Sections");
        }

        if (J(new { a.HeroPhotoPath, a.HeroWelcome, a.HeroBackground, a.HeroStrength, a.HeroTitle, a.HeroText, a.HeroShowAddress, a.HeroRoundOn, a.HeroRoundPath, a.HeroRoundStrength })
            != J(new { HeroPhotoPath = Clean(b.HeroPhotoPath), b.HeroWelcome, b.HeroBackground, b.HeroStrength, HeroTitle = Clean(b.HeroTitle), HeroText = Clean(b.HeroText), b.HeroShowAddress, b.HeroRoundOn, HeroRoundPath = Clean(b.HeroRoundPath), b.HeroRoundStrength }))
        {
            tabs.Add("Hero");
        }

        if (Rows(a.Items, "service", "faq") != Rows(b.Items, "service", "faq"))
        {
            tabs.Add("Service & FAQ");
        }

        if (J(new { a.EmiExamplePrice, a.EmiDownPercents, a.EmiMonths, a.EmiNote })
            != J(new { EmiExamplePrice = Math.Round(b.EmiExamplePrice, 2), EmiDownPercents = b.EmiDownPercents.Distinct().OrderBy(x => x).ToList(), EmiMonths = b.EmiMonths.Distinct().OrderBy(x => x).ToList(), EmiNote = Clean(b.EmiNote) }))
        {
            tabs.Add("EMI");
        }

        if (J(a.Policies.Select(x => new { x.PolicyKey, x.BrandManagementId, x.Title, x.UpdatedOn, x.Sections }))
            != J(b.Policies.Select(x => new { PolicyKey = x.PolicyKey.Trim().ToLowerInvariant(), x.BrandManagementId, Title = Clean(x.Title), x.UpdatedOn, Sections = x.Sections.Select(s => new WebsitePolicySectionDto { Heading = Clean(s.Heading), Text = Clean(s.Text) }) })))
        {
            tabs.Add("Policies");
        }

        return tabs.Count == 0
            ? "Saved with no changes."
            : "Changed : " + string.Join(", ", tabs) + ".";
    }
}


//===============================================================
// Google Maps link reader
//
// Accepts the links Google Maps gives :
//   https://maps.app.goo.gl/AbCd…          (Share › Copy link)
//   https://www.google.com/maps/place/Name/@23.87,90.39,17z/data=…!3d…!4d…
//   https://maps.google.com/?q=23.87,90.39  ·  …/maps?cid=…
// Short links are followed (only to Google hosts, at most 6 hops).
// The pin is the place's own point (!3d…!4d…), else the map centre
// (@lat,lng), else a coordinate or text in q / query / ll, else the
// place name.
//===============================================================

internal static class GoogleMapsLink
{
    private static readonly HttpClient Http =
        CreateClient();

    private static readonly string[] ShortHosts =
        { "maps.app.goo.gl", "goo.gl", "g.co", "g.page" };

    private static readonly Regex GoogleHost =
        new(@"^(www\.|maps\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex PlacePoint =
        new(@"!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)", RegexOptions.CultureInvariant);

    private static readonly Regex MapCentre =
        new(@"@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)", RegexOptions.CultureInvariant);

    private static readonly Regex Coordinates =
        new(@"^\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$", RegexOptions.CultureInvariant);

    private static readonly Regex PlaceName =
        new(@"/maps/(?:place|search)/([^/@?]+)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex PageMapLink =
        new(@"https://www\.google\.[a-z.]+/maps/[^""'\s<>\\]+", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex PageCentre =
        new(@"center=(-?\d{1,3}\.\d+)%2C(-?\d{1,3}\.\d+)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);


    private static HttpClient CreateClient()
    {
        HttpClient client =
            new(new HttpClientHandler { AllowAutoRedirect = false })
            {
                Timeout = TimeSpan.FromSeconds(8)
            };

        client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36");

        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("en");

        return client;
    }


    private static bool IsGoogleHost(
        string host)
    {
        host = host.ToLowerInvariant();

        return ShortHosts.Contains(host)
            || GoogleHost.IsMatch(host)
            || host == "consent.google.com";
    }


    public static bool IsGoogleMapsUrl(
        string text)
    {
        return Uri.TryCreate((text ?? string.Empty).Trim(), UriKind.Absolute, out Uri? uri)
            && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)
            && IsGoogleHost(uri.Host);
    }


    public static async Task<WebsiteMapPinDto?> TryResolveAsync(
        string link)
    {
        link = (link ?? string.Empty).Trim();

        if (!IsGoogleMapsUrl(link))
        {
            return null;
        }

        Uri current =
            new(link);

        try
        {
            for (int hop = 0; hop < 6; hop++)
            {
                WebsiteMapPinDto? pin =
                    Parse(current, link);

                if (pin != null)
                {
                    return pin;
                }

                using HttpResponseMessage response =
                    await Http.GetAsync(current, HttpCompletionOption.ResponseHeadersRead);

                int status =
                    (int)response.StatusCode;

                if (status >= 300 && status < 400 && response.Headers.Location != null)
                {
                    Uri next =
                        response.Headers.Location.IsAbsoluteUri
                            ? response.Headers.Location
                            : new Uri(current, response.Headers.Location);

                    // The cookie-consent page carries the real address
                    if (next.Host.Equals("consent.google.com", StringComparison.OrdinalIgnoreCase))
                    {
                        string? target =
                            QueryValue(next, "continue");

                        if (target != null && Uri.TryCreate(target, UriKind.Absolute, out Uri? inner))
                        {
                            next = inner;
                        }
                    }

                    if (!IsGoogleHost(next.Host))
                    {
                        return null;
                    }

                    current = next;

                    continue;
                }

                if (!response.IsSuccessStatusCode)
                {
                    return null;
                }

                // A page instead of a redirect : look inside it
                string html =
                    await response.Content.ReadAsStringAsync();

                Match found =
                    PageMapLink.Match(html);

                if (found.Success && Uri.TryCreate(System.Net.WebUtility.HtmlDecode(found.Value), UriKind.Absolute, out Uri? inPage))
                {
                    WebsiteMapPinDto? fromPage =
                        Parse(inPage, link);

                    if (fromPage != null)
                    {
                        return fromPage;
                    }
                }

                Match centre =
                    PageCentre.Match(html);

                return centre.Success
                    ? Pin(link, centre.Groups[1].Value, centre.Groups[2].Value, string.Empty)
                    : null;
            }
        }
        catch
        {
            // Offline, timeout or a page Google changed : not readable
        }

        return null;
    }


    private static WebsiteMapPinDto? Parse(
        Uri uri,
        string link)
    {
        string text =
            uri.OriginalString;

        string name =
            string.Empty;

        Match place =
            PlaceName.Match(uri.AbsolutePath);

        if (place.Success)
        {
            name = Uri.UnescapeDataString(place.Groups[1].Value.Replace('+', ' ')).Trim();
        }

        Match point =
            PlacePoint.Match(text);

        if (point.Success)
        {
            return Pin(link, point.Groups[1].Value, point.Groups[2].Value, name);
        }

        Match centre =
            MapCentre.Match(Uri.UnescapeDataString(text));

        if (centre.Success)
        {
            return Pin(link, centre.Groups[1].Value, centre.Groups[2].Value, name);
        }

        foreach (string key in new[] { "q", "query", "ll", "destination", "daddr" })
        {
            string? value =
                QueryValue(uri, key);

            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            Match pair =
                Coordinates.Match(value);

            if (pair.Success)
            {
                return Pin(link, pair.Groups[1].Value, pair.Groups[2].Value, name);
            }

            if (key != "ll")
            {
                return new WebsiteMapPinDto { Link = link, Query = Short(value.Trim()), Name = value.Trim() };
            }
        }

        return name.Length > 0 && uri.AbsolutePath.Contains("/maps/place/", StringComparison.OrdinalIgnoreCase)
            ? new WebsiteMapPinDto { Link = link, Query = Short(name), Name = name }
            : null;
    }


    private static WebsiteMapPinDto? Pin(
        string link,
        string latText,
        string lngText,
        string name)
    {
        if (!double.TryParse(latText, NumberStyles.Float, CultureInfo.InvariantCulture, out double lat)
            || !double.TryParse(lngText, NumberStyles.Float, CultureInfo.InvariantCulture, out double lng)
            || lat < -90 || lat > 90 || lng < -180 || lng > 180
            || (lat == 0 && lng == 0))
        {
            return null;
        }

        return new WebsiteMapPinDto
        {
            Link = link,
            Query = string.Create(CultureInfo.InvariantCulture, $"{Math.Round(lat, 6)},{Math.Round(lng, 6)}"),
            Name = name
        };
    }


    private static string? QueryValue(
        Uri uri,
        string key)
    {
        foreach (string part in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            int equals =
                part.IndexOf('=');

            string name =
                equals < 0 ? part : part[..equals];

            if (name.Equals(key, StringComparison.OrdinalIgnoreCase))
            {
                return equals < 0
                    ? string.Empty
                    : Uri.UnescapeDataString(part[(equals + 1)..].Replace('+', ' '));
            }
        }

        return null;
    }


    private static string Short(
        string text)
    {
        return text.Length > 300 ? text[..300] : text;
    }
}
