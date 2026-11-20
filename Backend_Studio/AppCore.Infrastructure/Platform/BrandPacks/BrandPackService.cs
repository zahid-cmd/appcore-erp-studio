//===============================================================
// Brand Pack Service (2026-11-20)
//
// Export : one brand of this database -> BrandPack (+ the list
//          of picture files to put in the zip).
// Install : BrandPack -> this database, through the pages' own
//          repositories (Brand, Product Category, Colour, Model
//          Onboarding, Motor Bikes, Specifications), so codes,
//          ledgers, account groups / sub groups and history are
//          exactly as when made by hand. Warranty and PDI rows
//          (no accounting) are written directly.
//
// Matching (never by id or code : those are this database's own)
//   brand by name; colour by name; model by brand + name;
//   bike by model + colour; warranty part by name; warranty
//   policy by brand + name; PDI template by name.
// Kept on update : the brand's supplier, stock levels, prices,
//   anything the dealer made himself. Never deleted : rows the
//   pack no longer has stay as they are.
// Each step is saved on its own : a failed install can simply be
// run again (finished steps are found and kept).
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Platform.BrandPacks;
using AppCore.Application.Settings.ProductSettings;
using AppCore.Application.Settings.ProductSettings.BrandManagement.DTOs;
using AppCore.Application.Settings.ProductSettings.ColorManagement.DTOs;
using AppCore.Application.Settings.ProductSettings.ProductCategory.DTOs;
using AppCore.Application.Settings.ProductSettings.ProductSubCategory.DTOs;
using BrandManagementEntity = AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;
using ProductCategoryEntity = AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;
using ColorManagementEntity = AppCore.Domain.Entities.Settings.ProductSettings.ColorManagement;
using BikeModelsEntity = AppCore.Domain.Entities.Settings.ProductSettings.BikeModels;
using ProductSubCategoryEntity = AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;
using MotorBikesEntity = AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;
using MotorBikeSpecificationsEntity = AppCore.Domain.Entities.Settings.ProductSettings.MotorBikeSpecifications;
using MotorBikeSpecificationItemsEntity = AppCore.Domain.Entities.Settings.ProductSettings.MotorBikeSpecificationItems;
using AppCore.Domain.Entities.Settings.ServiceSettings;
using AppCore.Domain.Entities.WarrantyManagement.WarrantyControl;
using AppCore.Infrastructure.Persistence;

namespace AppCore.Infrastructure.Platform.BrandPacks;

public sealed class BrandPackService
{
    private const string MotorBikesType = "Motor Bikes";

    private readonly AppDbContext _context;
    private readonly IBrandManagementRepository _brands;
    private readonly IProductCategoryRepository _categories;
    private readonly IColorManagementRepository _colours;
    private readonly IBikeModelsRepository _models;
    private readonly IProductSubCategoryRepository _subCategories;
    private readonly IMotorBikesRepository _bikes;
    private readonly IMotorBikeSpecificationsRepository _specifications;
    private readonly IModelOnboardingService _onboarding;

    public BrandPackService
    (
        AppDbContext context,
        IBrandManagementRepository brands,
        IProductCategoryRepository categories,
        IColorManagementRepository colours,
        IBikeModelsRepository models,
        IProductSubCategoryRepository subCategories,
        IMotorBikesRepository bikes,
        IMotorBikeSpecificationsRepository specifications,
        IModelOnboardingService onboarding
    )
    {
        _context = context;
        _brands = brands;
        _categories = categories;
        _colours = colours;
        _models = models;
        _subCategories = subCategories;
        _bikes = bikes;
        _specifications = specifications;
        _onboarding = onboarding;
    }

    private static string Key(string? text) =>
        string.Join(" ", (text ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries)).ToLowerInvariant();

    private static string FileOf(string? path) =>
        string.IsNullOrWhiteSpace(path) ? string.Empty : "images/" + Path.GetFileName(path.Replace('\\', '/'));


    //===========================================================
    // Brands of this database (for the export list)
    //===========================================================

    public async Task<List<(string Name, int Models, int Bikes)>> BrandsAsync()
    {
        var brands = await _context.Set<BrandManagementEntity>().AsNoTracking()
            .Where(b => !b.IsDeleted)
            .OrderBy(b => b.BrandName)
            .Select(b => new { b.BrandManagementId, b.BrandName })
            .ToListAsync();

        var models = await _context.Set<BikeModelsEntity>().AsNoTracking()
            .Where(m => !m.IsDeleted)
            .Select(m => new { m.BikeModelId, m.BrandManagementId })
            .ToListAsync();

        var subs = await _context.Set<ProductSubCategoryEntity>().AsNoTracking()
            .Where(s => !s.IsDeleted && s.BikeModelId != null)
            .Select(s => new { s.ProductSubCategoryId, s.BikeModelId })
            .ToListAsync();

        var bikes = await _context.Set<MotorBikesEntity>().AsNoTracking()
            .Where(x => !x.IsDeleted)
            .Select(x => x.ProductSubCategoryId)
            .ToListAsync();

        return brands.Select(b =>
        {
            var modelIds = models.Where(m => m.BrandManagementId == b.BrandManagementId).Select(m => m.BikeModelId).ToHashSet();
            var subIds = subs.Where(s => modelIds.Contains(s.BikeModelId!.Value)).Select(s => s.ProductSubCategoryId).ToHashSet();
            return (b.BrandName, modelIds.Count, bikes.Count(x => subIds.Contains(x)));
        }).ToList();
    }


    //===========================================================
    // Export
    //===========================================================

    public async Task<(BrandPack Pack, Dictionary<string, string> Images)> ExportAsync(string brandName, string source)
    {
        string key = Key(brandName);

        BrandManagementEntity brand =
            (await _context.Set<BrandManagementEntity>().AsNoTracking().Where(b => !b.IsDeleted).ToListAsync())
                .FirstOrDefault(b => Key(b.BrandName) == key)
            ?? throw new InvalidOperationException($"Brand '{brandName}' not found.");

        // pack file name -> web path of the picture
        Dictionary<string, string> images = new(StringComparer.OrdinalIgnoreCase);

        string AddImage(string? webPath)
        {
            string file = FileOf(webPath);
            if (file.Length > 0)
            {
                images[file] = webPath!;
            }
            return file;
        }

        BrandPack pack = new()
        {
            ExportedAt = DateTime.UtcNow,
            ExportedFrom = source,
            Brand = new BrandPackBrand
            {
                Name = brand.BrandName,
                MakerName = brand.MakerName,
                Remarks = brand.Remarks,
                Image = AddImage(brand.BrandImagePath)
            }
        };

        pack.CategoryTypes = await _context.Set<ProductCategoryEntity>().AsNoTracking()
            .Where(c => !c.IsDeleted && c.BrandManagementId == brand.BrandManagementId)
            .Select(c => c.CategoryType)
            .Distinct()
            .ToListAsync();

        if (!pack.CategoryTypes.Contains(MotorBikesType))
        {
            pack.CategoryTypes.Insert(0, MotorBikesType);
        }

        var colours = await _context.Set<ColorManagementEntity>().AsNoTracking()
            .Where(c => !c.IsDeleted)
            .ToDictionaryAsync(c => c.ColorManagementId);

        var models = await _context.Set<BikeModelsEntity>().AsNoTracking()
            .Where(m => !m.IsDeleted && m.BrandManagementId == brand.BrandManagementId)
            .OrderBy(m => m.DisplayOrder).ThenBy(m => m.ModelName)
            .ToListAsync();

        List<long> modelIds = models.Select(m => m.BikeModelId).ToList();

        var subs = await _context.Set<ProductSubCategoryEntity>().AsNoTracking()
            .Where(s => !s.IsDeleted && s.BikeModelId != null && modelIds.Contains(s.BikeModelId.Value))
            .ToListAsync();

        List<long> subIds = subs.Select(s => s.ProductSubCategoryId).ToList();

        var bikes = await _context.Set<MotorBikesEntity>().AsNoTracking()
            .Where(x => !x.IsDeleted && subIds.Contains(x.ProductSubCategoryId))
            .ToListAsync();

        var specs = await _context.Set<MotorBikeSpecificationsEntity>().AsNoTracking()
            .Where(s => !s.IsDeleted && modelIds.Contains(s.BikeModelId))
            .ToListAsync();

        List<long> specIds = specs.Select(s => s.MotorBikeSpecificationId).ToList();

        var specItems = await _context.Set<MotorBikeSpecificationItemsEntity>().AsNoTracking()
            .Where(i => specIds.Contains(i.MotorBikeSpecificationId))
            .ToListAsync();

        HashSet<long> usedColours = new();

        foreach (BikeModelsEntity m in models)
        {
            List<long> mySubs = subs.Where(s => s.BikeModelId == m.BikeModelId).Select(s => s.ProductSubCategoryId).ToList();

            BrandPackModel pm = new()
            {
                Name = m.ModelName,
                BikeType = m.BikeType,
                Tagline = m.Tagline,
                Description = m.Description,
                ShowOnWebsite = m.ShowOnWebsite,
                IsFeatured = m.IsFeatured,
                DisplayOrder = m.DisplayOrder,
                Remarks = m.Remarks,
                Active = m.Status
            };

            foreach (MotorBikesEntity b in bikes.Where(x => mySubs.Contains(x.ProductSubCategoryId)).OrderBy(x => x.ProductCode))
            {
                if (!colours.TryGetValue(b.ColorManagementId, out ColorManagementEntity? colour))
                {
                    continue;
                }

                usedColours.Add(colour.ColorManagementId);

                pm.Bikes.Add(new BrandPackBike
                {
                    Colour = colour.ColorName,
                    Image = AddImage(b.ImagePath),
                    Active = b.IsActive
                });
            }

            MotorBikeSpecificationsEntity? s = specs.FirstOrDefault(x => x.BikeModelId == m.BikeModelId);

            if (s != null)
            {
                pm.Specification = new BrandPackSpecification
                {
                    EngineCc = s.EngineCc,
                    MotorPowerWatts = s.MotorPowerWatts,
                    FuelType = s.FuelType,
                    Cylinders = s.Cylinders,
                    VehicleClass = s.VehicleClass,
                    BodyType = s.BodyType,
                    SeatingCapacity = s.SeatingCapacity,
                    UnladenWeightKg = s.UnladenWeightKg,
                    LadenWeightKg = s.LadenWeightKg,
                    Maker = s.Maker,
                    CountryOfOrigin = s.CountryOfOrigin,
                    HorsePower = s.HorsePower,
                    Rpm = s.Rpm,
                    Mileage = s.Mileage,
                    TopSpeedKmh = s.TopSpeedKmh,
                    TopSpeed = s.TopSpeed,
                    WheelBaseMm = s.WheelBaseMm,
                    LengthMm = s.LengthMm,
                    WidthMm = s.WidthMm,
                    HeightMm = s.HeightMm,
                    TyreCount = s.TyreCount,
                    FrontTyreSize = s.FrontTyreSize,
                    RearTyreSize = s.RearTyreSize,
                    AxleCount = s.AxleCount,
                    ShowOnWebsite = s.ShowOnWebsite,
                    Remarks = s.Remarks,
                    Items = specItems
                        .Where(i => i.MotorBikeSpecificationId == s.MotorBikeSpecificationId)
                        .OrderBy(i => i.Section).ThenBy(i => i.LineNo)
                        .Select(i => new BrandPackSpecificationItem { Section = i.Section, LineNo = i.LineNo, Label = i.Label, Value = i.Value })
                        .ToList()
                };
            }

            pack.Models.Add(pm);
        }

        pack.Colours = colours.Values
            .Where(c => usedColours.Contains(c.ColorManagementId))
            .OrderBy(c => c.ColorName)
            .Select(c => new BrandPackColour { Name = c.ColorName, Remarks = c.Remarks })
            .ToList();

        // Warranty
        var policies = await _context.Set<WarrantyPolicies>().AsNoTracking()
            .Where(p => !p.IsDeleted && p.BrandManagementId == brand.BrandManagementId)
            .ToListAsync();

        List<long> policyIds = policies.Select(p => p.WarrantyPolicyId).ToList();

        var coverages = await _context.Set<WarrantyCoverages>().AsNoTracking()
            .Where(c => !c.IsDeleted && policyIds.Contains(c.WarrantyPolicyId))
            .ToListAsync();

        List<long> partIds = coverages.Select(c => c.WarrantyPartId).Distinct().ToList();

        var parts = await _context.Set<WarrantyParts>().AsNoTracking()
            .Where(p => partIds.Contains(p.WarrantyPartId))
            .ToDictionaryAsync(p => p.WarrantyPartId);

        pack.WarrantyParts = parts.Values
            .OrderBy(p => p.DisplayOrder).ThenBy(p => p.Name)
            .Select(p => new BrandPackWarrantyPart { Name = p.Name, DisplayOrder = p.DisplayOrder, Remarks = p.Remarks })
            .ToList();

        foreach (WarrantyPolicies p in policies.OrderBy(p => p.Code))
        {
            pack.WarrantyPolicies.Add(new BrandPackWarrantyPolicy
            {
                Name = p.Name,
                Model = p.BikeModelId == null ? string.Empty : models.FirstOrDefault(m => m.BikeModelId == p.BikeModelId)?.ModelName ?? string.Empty,
                EffectiveFrom = p.EffectiveFrom,
                EffectiveTo = p.EffectiveTo,
                PeriodValue = p.PeriodValue,
                PeriodUnit = p.PeriodUnit,
                KmLimit = p.KmLimit,
                Terms = p.Terms,
                Exclusions = p.Exclusions,
                Remarks = p.Remarks,
                Active = p.IsActive,
                Coverages = coverages
                    .Where(c => c.WarrantyPolicyId == p.WarrantyPolicyId && parts.ContainsKey(c.WarrantyPartId))
                    .OrderBy(c => c.Code)
                    .Select(c => new BrandPackWarrantyCoverage
                    {
                        Part = parts[c.WarrantyPartId].Name,
                        PeriodValue = c.PeriodValue,
                        PeriodUnit = c.PeriodUnit,
                        KmLimit = c.KmLimit,
                        Notes = c.Notes,
                        Active = c.IsActive
                    })
                    .ToList()
            });
        }

        // PDI templates used by this brand's models
        var templateLinks = await _context.Set<PdiTemplateModels>().AsNoTracking()
            .Where(l => modelIds.Contains(l.BikeModelId))
            .ToListAsync();

        List<long> templateIds = templateLinks.Select(l => l.PdiTemplateId).Distinct().ToList();

        var templates = await _context.Set<PdiTemplates>().AsNoTracking()
            .Where(t => !t.IsDeleted && templateIds.Contains(t.PdiTemplateId))
            .ToListAsync();

        var sections = await _context.Set<PdiTemplateSections>().AsNoTracking()
            .Where(s => templateIds.Contains(s.PdiTemplateId))
            .ToListAsync();

        List<long> sectionIds = sections.Select(s => s.PdiTemplateSectionId).ToList();

        var items = await _context.Set<PdiTemplateItems>().AsNoTracking()
            .Where(i => sectionIds.Contains(i.PdiTemplateSectionId))
            .ToListAsync();

        foreach (PdiTemplates t in templates.OrderBy(t => t.Code))
        {
            pack.PdiTemplates.Add(new BrandPackPdiTemplate
            {
                Name = t.Name,
                NameBn = t.NameBn,
                SheetTitle = t.SheetTitle,
                SheetTitleBn = t.SheetTitleBn,
                FooterNote = t.FooterNote,
                FooterNoteBn = t.FooterNoteBn,
                ServiceProviderName = t.ServiceProviderName,
                Remarks = t.Remarks,
                Active = t.IsActive,
                Models = templateLinks
                    .Where(l => l.PdiTemplateId == t.PdiTemplateId)
                    .Select(l => models.FirstOrDefault(m => m.BikeModelId == l.BikeModelId)?.ModelName)
                    .Where(n => n != null)
                    .Select(n => n!)
                    .ToList(),
                Sections = sections
                    .Where(s => s.PdiTemplateId == t.PdiTemplateId)
                    .OrderBy(s => s.SortOrder)
                    .Select(s => new BrandPackPdiSection
                    {
                        SortOrder = s.SortOrder,
                        Title = s.Title,
                        TitleBn = s.TitleBn,
                        HasComments = s.HasComments,
                        Items = items
                            .Where(i => i.PdiTemplateSectionId == s.PdiTemplateSectionId)
                            .OrderBy(i => i.SortOrder)
                            .Select(i => new BrandPackPdiItem
                            {
                                SortOrder = i.SortOrder,
                                Text = i.Text,
                                TextBn = i.TextBn,
                                ItemType = i.ItemType,
                                Unit = i.Unit,
                                IsRequired = i.IsRequired
                            })
                            .ToList()
                    })
                    .ToList()
            });
        }

        return (pack, images);
    }


    //===========================================================
    // Install
    //===========================================================

    // saveImage(packFile) -> the web path it was saved at ('' = not in the zip)
    public async Task<BrandPackReport> InstallAsync(BrandPack pack, Func<string, string, Task<string>> saveImage, long userId)
    {
        BrandPackReport report = new() { Brand = pack.Brand.Name };

        void Line(string text) => report.Lines.Add(text);

        try
        {
            if (pack.Format != "appcore-brand-pack" || pack.Version != 1)
            {
                throw new InvalidOperationException("This is not an AppCore brand pack (or a newer version).");
            }

            if (string.IsNullOrWhiteSpace(pack.Brand.Name))
            {
                throw new InvalidOperationException("The pack has no brand name.");
            }

            //---------------------------------------------------
            // 1. Brand
            //---------------------------------------------------
            string brandKey = Key(pack.Brand.Name);

            BrandManagementEntity? brand =
                (await _context.Set<BrandManagementEntity>().Where(b => !b.IsDeleted).ToListAsync())
                    .FirstOrDefault(b => Key(b.BrandName) == brandKey);

            if (brand == null)
            {
                long id = await _brands.CreateAsync(new CreateBrandManagementDto
                {
                    BrandName = pack.Brand.Name,
                    MakerName = pack.Brand.MakerName,
                    Remarks = pack.Brand.Remarks,
                    Status = true,
                    MotorBikesSupplierCode = string.Empty
                }, userId);

                brand = await _context.Set<BrandManagementEntity>().FirstAsync(b => b.BrandManagementId == id);
                report.Created++;
                Line($"Brand {brand.BrandName} created ({brand.BrandCode}).");
            }
            else
            {
                if (string.IsNullOrWhiteSpace(brand.MakerName) && !string.IsNullOrWhiteSpace(pack.Brand.MakerName))
                {
                    brand.MakerName = pack.Brand.MakerName;
                    brand.ModifiedBy = userId;
                    brand.ModifiedDate = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                report.Kept++;
                Line($"Brand {brand.BrandName} already here ({brand.BrandCode}) : kept, supplier unchanged.");
            }

            if (!string.IsNullOrWhiteSpace(pack.Brand.Image))
            {
                string path = await saveImage(pack.Brand.Image, "brand-images");
                if (path.Length > 0)
                {
                    brand.BrandImagePath = path;
                    await _context.SaveChangesAsync();
                }
            }

            //---------------------------------------------------
            // 2. Categories of the brand
            //---------------------------------------------------
            foreach (string type in pack.CategoryTypes.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                bool exists = await _context.Set<ProductCategoryEntity>().AnyAsync(c =>
                    !c.IsDeleted && c.BrandManagementId == brand.BrandManagementId && c.CategoryType == type);

                if (exists)
                {
                    report.Kept++;
                    continue;
                }

                await _categories.CreateAsync(new CreateProductCategoryDto
                {
                    CategoryType = type,
                    BrandManagementId = brand.BrandManagementId,
                    SubCategoryCreationAllowed = true,
                    IsActive = true,
                    Remarks = "Brand pack"
                }, userId);

                report.Created++;
                Line($"Category {type} - {brand.BrandName} created, with its account groups.");
            }

            long motorBikesCategoryId = await _context.Set<ProductCategoryEntity>()
                .Where(c => !c.IsDeleted && c.BrandManagementId == brand.BrandManagementId && c.CategoryType == MotorBikesType)
                .OrderBy(c => c.CategoryCode)
                .Select(c => c.ProductCategoryId)
                .FirstOrDefaultAsync();

            if (motorBikesCategoryId == 0)
            {
                throw new InvalidOperationException("The brand has no Motor Bikes category.");
            }

            if (!await _context.Set<ProductCategoryEntity>().AnyAsync(c => c.ProductCategoryId == motorBikesCategoryId && c.IsActive && c.SubCategoryCreationAllowed))
            {
                throw new InvalidOperationException("The brand's Motor Bikes category is inactive or does not allow sub categories. Fix it in Product Category, then install again.");
            }

            //---------------------------------------------------
            // 3. Colours
            //---------------------------------------------------
            Dictionary<string, long> colourIds = new();

            foreach (BrandPackColour c in pack.Colours)
            {
                string k = Key(c.Name);
                if (k.Length == 0 || colourIds.ContainsKey(k)) { continue; }

                ColorManagementEntity? found =
                    (await _context.Set<ColorManagementEntity>().Where(x => !x.IsDeleted).ToListAsync())
                        .FirstOrDefault(x => Key(x.ColorName) == k);

                if (found == null)
                {
                    long id = await _colours.CreateAsync(new CreateColorManagementDto
                    {
                        ColorCode = string.Empty,
                        ColorName = c.Name.Trim(),
                        Remarks = c.Remarks,
                        Status = true
                    }, userId);

                    colourIds[k] = id;
                    report.Created++;
                    Line($"Colour {c.Name} created.");
                }
                else
                {
                    if (!found.Status)
                    {
                        found.Status = true;
                        await _context.SaveChangesAsync();
                    }

                    colourIds[k] = found.ColorManagementId;
                }
            }

            //---------------------------------------------------
            // 4. Models, their sub category and bikes
            //---------------------------------------------------
            Dictionary<string, long> modelIds = new();

            foreach (BrandPackModel pm in pack.Models)
            {
                string mk = Key(pm.Name);
                if (mk.Length == 0) { continue; }

                List<long> wanted = pm.Bikes
                    .Select(b => colourIds.TryGetValue(Key(b.Colour), out long id) ? id : 0)
                    .Where(id => id > 0)
                    .Distinct()
                    .ToList();

                BikeModelsEntity? model =
                    (await _context.Set<BikeModelsEntity>().Where(m => !m.IsDeleted && m.BrandManagementId == brand.BrandManagementId).ToListAsync())
                        .FirstOrDefault(m => Key(m.ModelName) == mk);

                if (model == null)
                {
                    long modelId;

                    if (wanted.Count > 0)
                    {
                        ModelOnboardingResultDto r = await _onboarding.OnboardAsync(new ModelOnboardingRequestDto
                        {
                            BrandManagementId = brand.BrandManagementId,
                            ModelName = pm.Name,
                            BikeType = string.IsNullOrWhiteSpace(pm.BikeType) ? "Commuter" : pm.BikeType,
                            ReorderLevel = 0,
                            RedLevel = 0,
                            MaxStockLevel = 0,
                            ColorManagementIds = wanted,
                            Remarks = pm.Remarks
                        }, userId);

                        modelId = r.BikeModelId;
                        report.Created += 2 + r.Bikes.Count;
                        Line($"Model {pm.Name} created ({r.ModelCode}) with sub category {r.SubCategoryCode} and {r.Bikes.Count} bike(s), with their ledgers.");
                    }
                    else
                    {
                        modelId = await _models.CreateAsync(new CreateBikeModelsDto
                        {
                            BrandManagementId = brand.BrandManagementId,
                            ModelName = pm.Name,
                            BikeType = string.IsNullOrWhiteSpace(pm.BikeType) ? "Commuter" : pm.BikeType,
                            Remarks = pm.Remarks,
                            Status = true
                        }, userId);

                        await _subCategories.CreateAsync(new CreateProductSubCategoryDto
                        {
                            ProductCategoryId = motorBikesCategoryId,
                            BikeModelId = modelId,
                            SubCategoryCreationAllowed = true,
                            Remarks = pm.Remarks,
                            IsActive = true
                        }, userId);

                        report.Created += 2;
                        Line($"Model {pm.Name} created (no colours in the pack).");
                    }

                    model = await _context.Set<BikeModelsEntity>().FirstAsync(m => m.BikeModelId == modelId);
                }
                else
                {
                    report.Updated++;
                    Line($"Model {pm.Name} already here ({model.ModelCode}) : texts refreshed.");

                    long subId = await _context.Set<ProductSubCategoryEntity>()
                        .Where(s => !s.IsDeleted && s.BikeModelId == model.BikeModelId && s.ProductCategoryId == motorBikesCategoryId)
                        .Select(s => s.ProductSubCategoryId)
                        .FirstOrDefaultAsync();

                    if (subId == 0)
                    {
                        subId = await _subCategories.CreateAsync(new CreateProductSubCategoryDto
                        {
                            ProductCategoryId = motorBikesCategoryId,
                            BikeModelId = model.BikeModelId,
                            SubCategoryCreationAllowed = true,
                            Remarks = pm.Remarks,
                            IsActive = true
                        }, userId);

                        report.Created++;
                        Line($"  sub category for {pm.Name} created.");
                    }

                    List<long> have = await _context.Set<MotorBikesEntity>()
                        .Where(b => !b.IsDeleted && b.ProductSubCategoryId == subId)
                        .Select(b => b.ColorManagementId)
                        .ToListAsync();

                    foreach (long colourId in wanted.Where(c => !have.Contains(c)))
                    {
                        await _bikes.CreateAsync(new CreateMotorBikesDto
                        {
                            ProductCategoryId = motorBikesCategoryId,
                            ProductSubCategoryId = subId,
                            ColorManagementId = colourId,
                            ReorderLevel = 0,
                            RedLevel = 0,
                            MaxStockLevel = 0,
                            Remarks = "Brand pack",
                            IsActive = true
                        }, userId);

                        report.Created++;
                        Line($"  new colour bike for {pm.Name} created, with its ledgers.");
                    }
                }

                // brand-owned texts (no accounting)
                model.BikeType = string.IsNullOrWhiteSpace(pm.BikeType) ? model.BikeType : pm.BikeType;
                model.Tagline = pm.Tagline ?? string.Empty;
                model.Description = pm.Description ?? string.Empty;
                model.ShowOnWebsite = pm.ShowOnWebsite;
                model.IsFeatured = pm.IsFeatured;
                model.DisplayOrder = pm.DisplayOrder;
                model.ModifiedBy = userId;
                model.ModifiedDate = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                modelIds[mk] = model.BikeModelId;

                // bike pictures
                List<long> modelSubs = await _context.Set<ProductSubCategoryEntity>()
                    .Where(s => !s.IsDeleted && s.BikeModelId == model.BikeModelId)
                    .Select(s => s.ProductSubCategoryId)
                    .ToListAsync();

                foreach (BrandPackBike pb in pm.Bikes.Where(b => !string.IsNullOrWhiteSpace(b.Image)))
                {
                    if (!colourIds.TryGetValue(Key(pb.Colour), out long colourId)) { continue; }

                    MotorBikesEntity? bike = await _context.Set<MotorBikesEntity>()
                        .FirstOrDefaultAsync(b => !b.IsDeleted && modelSubs.Contains(b.ProductSubCategoryId) && b.ColorManagementId == colourId);

                    if (bike == null) { continue; }

                    string path = await saveImage(pb.Image, "motor-bike-images");

                    if (path.Length > 0)
                    {
                        bike.ImagePath = path;
                        await _context.SaveChangesAsync();
                    }
                }

                //-----------------------------------------------
                // specification
                //-----------------------------------------------
                if (pm.Specification is BrandPackSpecification ps)
                {
                    MotorBikeSpecificationsEntity? spec = await _context.Set<MotorBikeSpecificationsEntity>().AsNoTracking()
                        .FirstOrDefaultAsync(s => !s.IsDeleted && s.BikeModelId == model.BikeModelId);

                    UpdateMotorBikeSpecificationsDto dto = new()
                    {
                        BikeModelId = model.BikeModelId,
                        EngineCc = ps.EngineCc,
                        MotorPowerWatts = ps.MotorPowerWatts,
                        FuelType = ps.FuelType,
                        Cylinders = ps.Cylinders,
                        VehicleClass = ps.VehicleClass,
                        BodyType = ps.BodyType,
                        SeatingCapacity = ps.SeatingCapacity,
                        UnladenWeightKg = ps.UnladenWeightKg,
                        LadenWeightKg = ps.LadenWeightKg,
                        Maker = ps.Maker,
                        CountryOfOrigin = ps.CountryOfOrigin,
                        HorsePower = ps.HorsePower,
                        Rpm = ps.Rpm,
                        Mileage = ps.Mileage,
                        TopSpeedKmh = ps.TopSpeedKmh,
                        TopSpeed = ps.TopSpeed,
                        WheelBaseMm = ps.WheelBaseMm,
                        LengthMm = ps.LengthMm,
                        WidthMm = ps.WidthMm,
                        HeightMm = ps.HeightMm,
                        TyreCount = ps.TyreCount,
                        FrontTyreSize = ps.FrontTyreSize,
                        RearTyreSize = ps.RearTyreSize,
                        AxleCount = ps.AxleCount,
                        ShowOnWebsite = ps.ShowOnWebsite,
                        Remarks = ps.Remarks,
                        Status = true,
                        Items = ps.Items
                            .OrderBy(i => i.Section).ThenBy(i => i.LineNo)
                            .Select(i => new MotorBikeSpecificationItemInputDto { Section = i.Section, Label = i.Label, Value = i.Value })
                            .ToList()
                    };

                    if (spec == null)
                    {
                        await _specifications.CreateAsync(dto, userId);
                        report.Created++;
                        Line($"  specification of {pm.Name} created ({ps.Items.Count} lines).");
                    }
                    else
                    {
                        dto.MotorBikeSpecificationId = spec.MotorBikeSpecificationId;
                        await _specifications.UpdateAsync(dto, userId);
                        report.Updated++;
                        Line($"  specification of {pm.Name} updated ({ps.Items.Count} lines).");
                    }
                }
            }

            //---------------------------------------------------
            // 5. Warranty (no accounting : written directly)
            //---------------------------------------------------
            DateTime now = DateTime.UtcNow;

            Dictionary<string, long> partIds = new();

            foreach (BrandPackWarrantyPart p in pack.WarrantyParts)
            {
                string k = Key(p.Name);
                if (k.Length == 0 || partIds.ContainsKey(k)) { continue; }

                WarrantyParts? found = (await _context.Set<WarrantyParts>().Where(x => !x.IsDeleted).ToListAsync())
                    .FirstOrDefault(x => Key(x.Name) == k);

                if (found == null)
                {
                    found = new WarrantyParts
                    {
                        PublicId = Guid.CreateVersion7(),
                        Code = await NextCodeAsync("WPT", _context.Set<WarrantyParts>().Select(x => x.Code)),
                        Name = p.Name.Trim(),
                        DisplayOrder = p.DisplayOrder,
                        Remarks = p.Remarks,
                        IsActive = true,
                        CreatedBy = userId,
                        CreatedDate = now
                    };

                    _context.Set<WarrantyParts>().Add(found);
                    await _context.SaveChangesAsync();
                    report.Created++;
                    Line($"Warranty part {p.Name} created ({found.Code}).");
                }

                partIds[k] = found.WarrantyPartId;
            }

            foreach (BrandPackWarrantyPolicy pp in pack.WarrantyPolicies)
            {
                string k = Key(pp.Name);
                if (k.Length == 0) { continue; }

                long? modelId = string.IsNullOrWhiteSpace(pp.Model) ? null
                    : modelIds.TryGetValue(Key(pp.Model), out long mid) ? mid : null;

                WarrantyPolicies? policy = (await _context.Set<WarrantyPolicies>()
                        .Where(x => !x.IsDeleted && x.BrandManagementId == brand.BrandManagementId).ToListAsync())
                    .FirstOrDefault(x => Key(x.Name) == k);

                bool isNew = policy == null;

                if (policy == null)
                {
                    policy = new WarrantyPolicies
                    {
                        PublicId = Guid.CreateVersion7(),
                        Code = await NextCodeAsync("WPO", _context.Set<WarrantyPolicies>().Select(x => x.Code)),
                        BrandManagementId = brand.BrandManagementId,
                        CreatedBy = userId,
                        CreatedDate = now
                    };

                    _context.Set<WarrantyPolicies>().Add(policy);
                }
                else
                {
                    policy.ModifiedBy = userId;
                    policy.ModifiedDate = now;
                }

                policy.Name = pp.Name.Trim();
                policy.BikeModelId = modelId;
                policy.EffectiveFrom = pp.EffectiveFrom;
                policy.EffectiveTo = pp.EffectiveTo;
                policy.PeriodValue = pp.PeriodValue;
                policy.PeriodUnit = pp.PeriodUnit;
                policy.KmLimit = pp.KmLimit;
                policy.Terms = pp.Terms;
                policy.Exclusions = pp.Exclusions;
                policy.Remarks = pp.Remarks;
                policy.IsActive = pp.Active;

                await _context.SaveChangesAsync();

                foreach (BrandPackWarrantyCoverage pc in pp.Coverages)
                {
                    if (!partIds.TryGetValue(Key(pc.Part), out long partId)) { continue; }

                    WarrantyCoverages? cov = await _context.Set<WarrantyCoverages>()
                        .FirstOrDefaultAsync(x => !x.IsDeleted && x.WarrantyPolicyId == policy.WarrantyPolicyId && x.WarrantyPartId == partId);

                    if (cov == null)
                    {
                        cov = new WarrantyCoverages
                        {
                            PublicId = Guid.CreateVersion7(),
                            Code = await NextCodeAsync("WCV", _context.Set<WarrantyCoverages>().Select(x => x.Code)),
                            WarrantyPolicyId = policy.WarrantyPolicyId,
                            WarrantyPartId = partId,
                            CreatedBy = userId,
                            CreatedDate = now
                        };

                        _context.Set<WarrantyCoverages>().Add(cov);
                    }
                    else
                    {
                        cov.ModifiedBy = userId;
                        cov.ModifiedDate = now;
                    }

                    cov.PeriodValue = pc.PeriodValue;
                    cov.PeriodUnit = pc.PeriodUnit;
                    cov.KmLimit = pc.KmLimit;
                    cov.Notes = pc.Notes;
                    cov.IsActive = pc.Active;

                    await _context.SaveChangesAsync();
                }

                if (isNew) { report.Created++; } else { report.Updated++; }
                Line($"Warranty policy {pp.Name} {(isNew ? "created" : "updated")} ({policy.Code}, {pp.Coverages.Count} coverage(s)).");
            }

            //---------------------------------------------------
            // 6. PDI templates : made once; an existing template is
            //    kept (past deliveries point to its items), only
            //    missing model links are added
            //---------------------------------------------------
            foreach (BrandPackPdiTemplate pt in pack.PdiTemplates)
            {
                string k = Key(pt.Name);
                if (k.Length == 0) { continue; }

                PdiTemplates? template = (await _context.Set<PdiTemplates>().Where(x => !x.IsDeleted).ToListAsync())
                    .FirstOrDefault(x => Key(x.Name) == k);

                if (template == null)
                {
                    template = new PdiTemplates
                    {
                        PublicId = Guid.CreateVersion7(),
                        Code = await NextCodeAsync("PDI", _context.Set<PdiTemplates>().Select(x => x.Code)),
                        Name = pt.Name.Trim(),
                        NameBn = pt.NameBn,
                        SheetTitle = pt.SheetTitle,
                        SheetTitleBn = pt.SheetTitleBn,
                        FooterNote = pt.FooterNote,
                        FooterNoteBn = pt.FooterNoteBn,
                        ServiceProviderName = pt.ServiceProviderName,
                        Remarks = pt.Remarks,
                        IsActive = pt.Active,
                        CreatedBy = userId,
                        CreatedDate = now
                    };

                    _context.Set<PdiTemplates>().Add(template);
                    await _context.SaveChangesAsync();

                    foreach (BrandPackPdiSection ps in pt.Sections)
                    {
                        PdiTemplateSections section = new()
                        {
                            PdiTemplateId = template.PdiTemplateId,
                            SortOrder = ps.SortOrder,
                            Title = ps.Title,
                            TitleBn = ps.TitleBn,
                            HasComments = ps.HasComments
                        };

                        _context.Set<PdiTemplateSections>().Add(section);
                        await _context.SaveChangesAsync();

                        foreach (BrandPackPdiItem pi in ps.Items)
                        {
                            _context.Set<PdiTemplateItems>().Add(new PdiTemplateItems
                            {
                                PdiTemplateSectionId = section.PdiTemplateSectionId,
                                SortOrder = pi.SortOrder,
                                Text = pi.Text,
                                TextBn = pi.TextBn,
                                ItemType = pi.ItemType,
                                Unit = pi.Unit,
                                IsRequired = pi.IsRequired
                            });
                        }

                        await _context.SaveChangesAsync();
                    }

                    report.Created++;
                    Line($"PDI template {pt.Name} created ({template.Code}, {pt.Sections.Sum(s => s.Items.Count)} items).");
                }
                else
                {
                    report.Kept++;
                    Line($"PDI template {pt.Name} already here ({template.Code}) : kept.");
                }

                List<long> linked = await _context.Set<PdiTemplateModels>()
                    .Where(l => l.PdiTemplateId == template.PdiTemplateId)
                    .Select(l => l.BikeModelId)
                    .ToListAsync();

                int added = 0;

                foreach (string modelName in pt.Models)
                {
                    if (modelIds.TryGetValue(Key(modelName), out long mid) && !linked.Contains(mid))
                    {
                        _context.Set<PdiTemplateModels>().Add(new PdiTemplateModels { PdiTemplateId = template.PdiTemplateId, BikeModelId = mid });
                        linked.Add(mid);
                        added++;
                    }
                }

                if (added > 0)
                {
                    await _context.SaveChangesAsync();
                    Line($"  {added} model(s) linked to PDI template {pt.Name}.");
                }
            }

            report.Success = true;
            Line($"Done : {report.Created} created, {report.Updated} updated, {report.Kept} kept.");
        }
        catch (Exception ex)
        {
            Exception root = ex;
            while (root.InnerException != null) { root = root.InnerException; }

            report.Success = false;
            report.Error = root.Message;
            Line($"Stopped : {root.Message} Finished steps are saved; fix the cause and install again.");
        }

        return report;
    }

    // <prefix>-nnn : highest number used (deleted rows included) + 1
    private static async Task<string> NextCodeAsync(string prefix, IQueryable<string> codes)
    {
        int highest = 0;

        foreach (string code in await codes.ToListAsync())
        {
            string[] parts = (code ?? string.Empty).Trim().Split('-', StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length == 2
                && string.Equals(parts[0], prefix, StringComparison.OrdinalIgnoreCase)
                && int.TryParse(parts[1], out int n)
                && n > highest)
            {
                highest = n;
            }
        }

        return $"{prefix}-{highest + 1:D3}";
    }
}
