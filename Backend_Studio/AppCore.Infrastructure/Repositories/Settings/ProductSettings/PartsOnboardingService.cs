//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ProductSettings;
using AppCore.Infrastructure.Persistence;

// RackLabels : movement classes
using AppCore.Infrastructure.Repositories.Settings.ProductSettings;

using SparePartsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SpareParts;
using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;
using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;
using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ProductSettings;


//===============================================================
// Parts & Accessories Onboarding Service
//
// Many Spare Parts (or Accessories) into one Product Sub Category
// in ONE transaction (all or nothing). It calls the two pages'
// own repositories, so codes, ledgers, the sales ledger and
// history are exactly as when made by hand; their CreateAsync
// joins this transaction instead of opening one.
//
// Analyze checks every row without writing :
//   Exists     part number already in (or linked to) this sub
//              category
//   Link       part number saved under another model of the brand :
//              not made again, linked to this sub category ("Fits
//              models"); stock, price and ledgers stay at home
//   Duplicate  part number of an earlier row of the file
//   Invalid    required / too long / unit / levels / movement
//   Ready      will be created (code preview given)
// The part number is compared as the pages do : spaces, hyphens,
// dots and case ignored. Accessories may have no part number.
//===============================================================

public class PartsOnboardingService :
    IPartsOnboardingService
{
    //===========================================================
    // Constants (same rules as the Spare Parts / Accessories
    // repositories)
    //===========================================================

    private static readonly string[] SparePartsCategoryTypes =
        { "Spare Parts", "Lubricants" };

    private const string AccessoriesCategoryType =
        "Accessories";

    private static readonly string[] Units =
        { "Pcs", "Set", "Pair", "Box", "Packet", "Litre", "Kg", "Meter", "Roll" };

    private const int PartNumberMaxLength = 50;

    private const int NameMaxLength = 140;

    private const int RemarksMaxLength = 200;

    private const int MaxLevel = 999999;

    private const int MaxRows = 1000;

    // Stock levels when no item of the type has been saved yet
    private const int DefaultReorderLevel = 2;
    private const int DefaultRedLevel = 1;
    private const int DefaultMaxStockLevel = 3;


    private readonly AppDbContext _context;

    private readonly ISparePartsRepository _spareParts;

    private readonly IAccessoriesRepository _accessories;


    public PartsOnboardingService(
        AppDbContext context,
        ISparePartsRepository spareParts,
        IAccessoriesRepository accessories)
    {
        _context = context;
        _spareParts = spareParts;
        _accessories = accessories;
    }


    //===========================================================
    // Helpers
    //===========================================================

    // "Spare Parts" / "Lubricants" -> SpareParts,
    // "Accessories" -> Accessories, else ''
    private static string TypeOf(
        string? categoryType)
    {
        string type =
            categoryType?.Trim() ?? string.Empty;

        if (SparePartsCategoryTypes.Any(x => string.Equals(x, type, StringComparison.OrdinalIgnoreCase)))
        {
            return PartsOnboardingTypes.SpareParts;
        }

        if (string.Equals(AccessoriesCategoryType, type, StringComparison.OrdinalIgnoreCase))
        {
            return PartsOnboardingTypes.Accessories;
        }

        return string.Empty;
    }

    private static string NormalizeType(
        string? productType)
    {
        string type =
            (productType ?? string.Empty).Replace(" ", string.Empty);

        if (string.Equals(type, PartsOnboardingTypes.SpareParts, StringComparison.OrdinalIgnoreCase))
        {
            return PartsOnboardingTypes.SpareParts;
        }

        if (string.Equals(type, PartsOnboardingTypes.Accessories, StringComparison.OrdinalIgnoreCase))
        {
            return PartsOnboardingTypes.Accessories;
        }

        throw new InvalidOperationException(
            "Product Type must be Spare Parts or Accessories.");
    }

    // "ab-12.34 " -> "AB1234" (as the repositories)
    private static string PartNumberKey(
        string? partNumber)
    {
        return new string(
                (partNumber ?? string.Empty)
                    .Where(c => !char.IsWhiteSpace(c) && c != '-' && c != '.')
                    .ToArray())
            .ToUpperInvariant();
    }

    private static string Tidy(
        string? value)
    {
        return string.Join(
            " ",
            (value ?? string.Empty)
                .Replace('\t', ' ')
                .Replace('\r', ' ')
                .Replace('\n', ' ')
                .Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    // "Fast Moving" / "super-fast" / "SLOW" -> the class;
    // '' -> Slow; unknown -> null
    private static string? MovementOf(
        string? value)
    {
        string key =
            (value ?? string.Empty)
                .Replace(" ", string.Empty)
                .Replace("-", string.Empty)
                .Replace("_", string.Empty);

        if (key.EndsWith("moving", StringComparison.OrdinalIgnoreCase))
        {
            key = key[..^6];
        }

        if (key.Length == 0)
        {
            return RackLabels.Slow;
        }

        return RackLabels.MovementClasses
            .FirstOrDefault(x => string.Equals(x, key, StringComparison.OrdinalIgnoreCase));
    }

    // Whole number 0 … 999999 ("2", "2.00", "1,200"); '' = 0
    private static bool TryLevel(
        string? text,
        out int value)
    {
        value = 0;

        string clean =
            (text ?? string.Empty).Replace(",", string.Empty).Trim();

        if (clean.Length == 0)
        {
            return true;
        }

        if (!decimal.TryParse(clean, NumberStyles.Number, CultureInfo.InvariantCulture, out decimal number)
            || number < 0
            || number > MaxLevel
            || number != decimal.Truncate(number))
        {
            return false;
        }

        value = (int)number;

        return true;
    }

    // Last number part of a code ("SP-001-001-00007" -> 7)
    private static int LastNumber(
        string? code)
    {
        string text =
            code ?? string.Empty;

        int dash =
            text.LastIndexOf('-');

        return dash >= 0 && int.TryParse(text[(dash + 1)..], NumberStyles.None, CultureInfo.InvariantCulture, out int n)
            ? n
            : 0;
    }

    private async Task<PartsOnboardingLevelsDto> LastLevelsAsync(
        string productType)
    {
        PartsOnboardingLevelsDto? last =
            productType == PartsOnboardingTypes.SpareParts
                ? await _context.Set<SparePartsEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted)
                    .OrderByDescending(x => x.SparePartId)
                    .Select(
                        x =>
                            new PartsOnboardingLevelsDto
                            {
                                ReorderLevel = x.ReorderLevel,
                                RedLevel = x.RedLevel,
                                MaxStockLevel = x.MaxStockLevel,
                                Unit = x.Unit,
                                MovementClass = x.MovementClass
                            })
                    .FirstOrDefaultAsync()
                : await _context.Set<AccessoriesEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted)
                    .OrderByDescending(x => x.AccessoryId)
                    .Select(
                        x =>
                            new PartsOnboardingLevelsDto
                            {
                                ReorderLevel = x.ReorderLevel,
                                RedLevel = x.RedLevel,
                                MaxStockLevel = x.MaxStockLevel,
                                Unit = x.Unit,
                                MovementClass = x.MovementClass
                            })
                    .FirstOrDefaultAsync();

        return last
            ?? new PartsOnboardingLevelsDto
            {
                ReorderLevel = DefaultReorderLevel,
                RedLevel = DefaultRedLevel,
                MaxStockLevel = DefaultMaxStockLevel,
                Unit = "Pcs",
                MovementClass = RackLabels.Slow
            };
    }


    //===========================================================
    // Defaults
    //===========================================================

    public async Task<PartsOnboardingDefaultsDto> GetDefaultsAsync()
    {
        List<ProductCategoryEntity> categories =
            (await _context.Set<ProductCategoryEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.CategoryCode)
                .ToListAsync())
            .Where(x => TypeOf(x.CategoryType).Length > 0)
            .ToList();

        List<long> categoryIds =
            categories.Select(x => x.ProductCategoryId).ToList();

        List<ProductSubCategoryEntity> subCategories =
            await _context.Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && categoryIds.Contains(x.ProductCategoryId))
                .OrderBy(x => x.SubCategoryCode)
                .ToListAsync();

        Dictionary<long, int> partCounts =
            await _context.Set<SparePartsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .GroupBy(x => x.ProductSubCategoryId)
                .Select(g => new { Id = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Id, x => x.Count);

        Dictionary<long, int> accessoryCounts =
            await _context.Set<AccessoriesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .GroupBy(x => x.ProductSubCategoryId)
                .Select(g => new { Id = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Id, x => x.Count);

        PartsOnboardingDefaultsDto result =
            new()
            {
                Units = Units.ToList(),
                MovementClasses = RackLabels.MovementClasses.ToList(),
                SpareParts = await LastLevelsAsync(PartsOnboardingTypes.SpareParts),
                Accessories = await LastLevelsAsync(PartsOnboardingTypes.Accessories)
            };

        foreach (ProductCategoryEntity c in categories)
        {
            string type =
                TypeOf(c.CategoryType);

            Dictionary<long, int> counts =
                type == PartsOnboardingTypes.SpareParts ? partCounts : accessoryCounts;

            result.Categories.Add(
                new PartsOnboardingCategoryDto
                {
                    ProductCategoryId = c.ProductCategoryId,
                    CategoryCode = c.CategoryCode,
                    CategoryName = c.CategoryName,
                    CategoryType = c.CategoryType,
                    ProductType = type,
                    SubCategories =
                        subCategories
                            .Where(s => s.ProductCategoryId == c.ProductCategoryId)
                            .Select(
                                s =>
                                    new PartsOnboardingSubCategoryDto
                                    {
                                        ProductSubCategoryId = s.ProductSubCategoryId,
                                        SubCategoryCode = s.SubCategoryCode,
                                        SubCategoryName = s.SubCategoryName,
                                        ItemCount = counts.TryGetValue(s.ProductSubCategoryId, out int n) ? n : 0
                                    })
                            .ToList()
                });
        }

        return result;
    }


    //===========================================================
    // Existing items of a sub category
    //===========================================================

    public async Task<List<PartsOnboardingExistingDto>> GetExistingAsync(
        string productType,
        long productSubCategoryId)
    {
        string type =
            NormalizeType(productType);

        if (type == PartsOnboardingTypes.SpareParts)
        {
            return await _context.Set<SparePartsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.ProductSubCategoryId == productSubCategoryId)
                .OrderBy(x => x.ProductCode)
                .Select(
                    x =>
                        new PartsOnboardingExistingDto
                        {
                            ProductCode = x.ProductCode,
                            PartNumber = x.PartNumber,
                            Name = x.PartName,
                            Unit = x.Unit,
                            ReorderLevel = x.ReorderLevel,
                            RedLevel = x.RedLevel,
                            MaxStockLevel = x.MaxStockLevel,
                            MovementClass = x.MovementClass
                        })
                .ToListAsync();
        }

        return await _context.Set<AccessoriesEntity>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.ProductSubCategoryId == productSubCategoryId)
            .OrderBy(x => x.ProductCode)
            .Select(
                x =>
                    new PartsOnboardingExistingDto
                    {
                        ProductCode = x.ProductCode,
                        PartNumber = x.PartNumber,
                        Name = x.AccessoryName,
                        Unit = x.Unit,
                        ReorderLevel = x.ReorderLevel,
                        RedLevel = x.RedLevel,
                        MaxStockLevel = x.MaxStockLevel,
                        MovementClass = x.MovementClass
                    })
            .ToListAsync();
    }


    //===========================================================
    // Analyze
    //===========================================================

    // A checked row with the values to save
    private sealed class SavedItem
    {
        public long Id { get; init; }

        public long HomeSubCategoryId { get; init; }

        public string HomeSubCategoryName { get; init; } = string.Empty;

        public string Text { get; init; } = string.Empty;

        public string ProductCode { get; init; } = string.Empty;
    }

    private sealed class CheckedRow
    {
        public PartsOnboardingCheckDto Check { get; init; } = null!;

        // Link rows : the saved item to link to the sub category
        public long LinkItemId { get; init; }

        public int ReorderLevel { get; set; }

        public int RedLevel { get; set; }

        public int MaxStockLevel { get; set; }

        public string Remarks { get; set; } = string.Empty;
    }

    private sealed class Analysis
    {
        public string ProductType { get; init; } = string.Empty;

        public ProductCategoryEntity? Category { get; set; }

        public ProductSubCategoryEntity? SubCategory { get; set; }

        public string Message { get; set; } = string.Empty;

        public List<CheckedRow> Rows { get; } = new();
    }


    public async Task<PartsOnboardingAnalysisDto> AnalyzeAsync(
        PartsOnboardingRequestDto request)
    {
        Analysis analysis =
            await AnalyzeCoreAsync(request);

        return new PartsOnboardingAnalysisDto
        {
            Rows = analysis.Rows.Select(x => x.Check).ToList(),
            ReadyCount = analysis.Rows.Count(x => x.Check.Status == PartsOnboardingStatus.Ready),
            LinkCount = analysis.Rows.Count(x => x.Check.Status == PartsOnboardingStatus.Link),
            Message = analysis.Message
        };
    }


    private async Task<Analysis> AnalyzeCoreAsync(
        PartsOnboardingRequestDto request)
    {
        string type =
            NormalizeType(request.ProductType);

        bool spare =
            type == PartsOnboardingTypes.SpareParts;

        string nameLabel =
            spare ? "Part Name" : "Accessory Name";

        List<PartsOnboardingRowDto> rows =
            request.Rows ?? new List<PartsOnboardingRowDto>();

        if (rows.Count == 0)
        {
            throw new InvalidOperationException("There is no row to check.");
        }

        if (rows.Count > MaxRows)
        {
            throw new InvalidOperationException(
                $"At most {MaxRows} rows can be onboarded at a time. Split the file.");
        }

        Analysis analysis =
            new() { ProductType = type };

        //-------------------------------------------------------
        // Category and sub category
        //-------------------------------------------------------

        analysis.Category =
            await _context.Set<ProductCategoryEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ProductCategoryId == request.ProductCategoryId && !x.IsDeleted);

        analysis.SubCategory =
            await _context.Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ProductSubCategoryId == request.ProductSubCategoryId && !x.IsDeleted);

        if (analysis.Category == null)
        {
            analysis.Message = "Pick the Product Category.";
        }
        else if (TypeOf(analysis.Category.CategoryType) != type)
        {
            analysis.Message =
                spare
                    ? $"'{analysis.Category.CategoryName}' is not a Spare Parts or Lubricants category."
                    : $"'{analysis.Category.CategoryName}' is not an Accessories category.";
        }
        else if (!analysis.Category.IsActive)
        {
            analysis.Message = $"Product Category '{analysis.Category.CategoryName}' is inactive.";
        }
        else if (analysis.SubCategory == null)
        {
            analysis.Message = "Pick the Product Sub Category.";
        }
        else if (analysis.SubCategory.ProductCategoryId != analysis.Category.ProductCategoryId)
        {
            analysis.Message =
                $"Sub Category '{analysis.SubCategory.SubCategoryName}' does not belong to '{analysis.Category.CategoryName}'.";
        }
        else if (!analysis.SubCategory.IsActive)
        {
            analysis.Message = $"Sub Category '{analysis.SubCategory.SubCategoryName}' is inactive.";
        }

        //-------------------------------------------------------
        // Next code (the repositories' own preview; it also
        // proves the sub category's ledger groups exist)
        //-------------------------------------------------------

        int nextNumber = 0;

        string subCode =
            analysis.SubCategory?.SubCategoryCode ?? string.Empty;

        if (analysis.Message.Length == 0)
        {
            try
            {
                string code =
                    spare
                        ? (await _spareParts.GetDefaultsAsync(request.ProductSubCategoryId)).Code
                        : (await _accessories.GetDefaultsAsync(request.ProductSubCategoryId)).Code;

                nextNumber = LastNumber(code);
            }
            catch (InvalidOperationException ex)
            {
                analysis.Message = ex.Message;
            }
        }

        //-------------------------------------------------------
        // Part numbers already saved for the brand (category)
        //-------------------------------------------------------

        Dictionary<string, SavedItem> saved = new();

        HashSet<long> linkedHere = new();

        long targetSubId =
            analysis.SubCategory?.ProductSubCategoryId ?? 0;

        if (analysis.Category != null)
        {
            long categoryId =
                analysis.Category.ProductCategoryId;

            var existing =
                spare
                    ? await (
                        from x in _context.Set<SparePartsEntity>().AsNoTracking()
                        where !x.IsDeleted && x.ProductCategoryId == categoryId && x.PartNumberKey != ""
                        join s in _context.Set<ProductSubCategoryEntity>().AsNoTracking()
                            on x.ProductSubCategoryId equals s.ProductSubCategoryId into sj
                        from s in sj.DefaultIfEmpty()
                        select new { Id = x.SparePartId, x.PartNumberKey, x.PartNumber, Name = x.PartName, x.ProductCode, x.ProductSubCategoryId, SubName = s != null ? s.SubCategoryName : string.Empty })
                        .ToListAsync()
                    : await (
                        from x in _context.Set<AccessoriesEntity>().AsNoTracking()
                        where !x.IsDeleted && x.ProductCategoryId == categoryId && x.PartNumberKey != ""
                        join s in _context.Set<ProductSubCategoryEntity>().AsNoTracking()
                            on x.ProductSubCategoryId equals s.ProductSubCategoryId into sj
                        from s in sj.DefaultIfEmpty()
                        select new { Id = x.AccessoryId, x.PartNumberKey, x.PartNumber, Name = x.AccessoryName, x.ProductCode, x.ProductSubCategoryId, SubName = s != null ? s.SubCategoryName : string.Empty })
                        .ToListAsync();

            foreach (var e in existing)
            {
                saved.TryAdd(
                    e.PartNumberKey,
                    new SavedItem
                    {
                        Id = e.Id,
                        HomeSubCategoryId = e.ProductSubCategoryId,
                        HomeSubCategoryName = e.SubName,
                        Text = $"{e.PartNumber} - {e.Name} ({e.ProductCode})",
                        ProductCode = e.ProductCode
                    });
            }

            // Items already linked to the target sub category
            if (targetSubId > 0)
            {
                linkedHere =
                    (spare
                        ? await ProductFitments.SparePartsFitting(_context, targetSubId).ToListAsync()
                        : await ProductFitments.AccessoriesFitting(_context, targetSubId).ToListAsync())
                    .ToHashSet();
            }
        }

        //-------------------------------------------------------
        // Every row
        //-------------------------------------------------------

        Dictionary<string, int> seen = new();

        int ready = 0;

        foreach (PartsOnboardingRowDto row in rows)
        {
            string number =
                Tidy(row.PartNumber);

            string key =
                PartNumberKey(number);

            if (key.Length == 0)
            {
                number = string.Empty;
            }

            string name =
                Tidy(row.Name);

            string? unit =
                Units.FirstOrDefault(x => string.Equals(x, Tidy(row.Unit), StringComparison.OrdinalIgnoreCase));

            string? movement =
                MovementOf(row.MovementClass);

            string remarks =
                Tidy(row.Remarks);

            if (remarks.Length > RemarksMaxLength)
            {
                remarks = remarks[..RemarksMaxLength];
            }

            List<string> problems = new();

            if (spare && key.Length == 0)
            {
                problems.Add("Part Number is required");
            }

            if (number.Length > PartNumberMaxLength)
            {
                problems.Add($"Part Number is longer than {PartNumberMaxLength} characters");
            }

            if (name.Length == 0)
            {
                problems.Add($"{nameLabel} is required");
            }
            else if (name.Length > NameMaxLength)
            {
                problems.Add($"{nameLabel} is longer than {NameMaxLength} characters");
            }

            if (unit == null)
            {
                problems.Add(
                    Tidy(row.Unit).Length == 0
                        ? "Unit is required"
                        : $"Unit '{Tidy(row.Unit)}' not found");
            }

            bool levelsOk = true;

            if (!TryLevel(row.ReorderLevel, out int reorder))
            {
                problems.Add("Re-order must be a whole number");
                levelsOk = false;
            }

            if (!TryLevel(row.RedLevel, out int red))
            {
                problems.Add("Red must be a whole number");
                levelsOk = false;
            }

            if (!TryLevel(row.MaxStockLevel, out int max))
            {
                problems.Add("Max must be a whole number");
                levelsOk = false;
            }

            if (levelsOk)
            {
                if (max > 0 && max <= reorder)
                {
                    problems.Add("Max must be higher than Re-order");
                }

                if (!(reorder == 0 && red == 0) && red >= reorder)
                {
                    problems.Add("Red must be lower than Re-order");
                }
            }

            if (movement == null)
            {
                problems.Add($"Movement '{Tidy(row.MovementClass)}' not found");
            }

            PartsOnboardingCheckDto check =
                new()
                {
                    Row = row.Row,
                    PartNumber = number,
                    Name = name,
                    Unit = unit ?? Tidy(row.Unit),
                    MovementClass = movement ?? RackLabels.Slow
                };

            SavedItem? savedItem =
                key.Length > 0 && saved.TryGetValue(key, out SavedItem? found) ? found : null;

            long linkId = 0;

            if (savedItem != null
                && (savedItem.HomeSubCategoryId == targetSubId || linkedHere.Contains(savedItem.Id)))
            {
                check.Status = PartsOnboardingStatus.Exists;
                check.Message =
                    savedItem.HomeSubCategoryId == targetSubId
                        ? $"Already in this sub category as {savedItem.Text}"
                        : $"Already linked here : {savedItem.Text}, home {savedItem.HomeSubCategoryName}";
            }
            else if (key.Length > 0 && seen.TryGetValue(key, out int firstRow))
            {
                check.Status = PartsOnboardingStatus.Duplicate;
                check.Message = $"Same Part Number as row {firstRow}";
            }
            else if (savedItem != null && analysis.Message.Length > 0)
            {
                check.Status = PartsOnboardingStatus.Invalid;
                check.Message = analysis.Message;
            }
            else if (savedItem != null)
            {
                // Saved under another model : linked here, not made
                // again (its stock, price and ledgers stay at home)
                check.Status = PartsOnboardingStatus.Link;
                check.Message = $"Saved under {savedItem.HomeSubCategoryName} as {savedItem.ProductCode} - will be linked here";
                check.ProductCode = savedItem.ProductCode;
                linkId = savedItem.Id;
            }
            else if (problems.Count > 0)
            {
                check.Status = PartsOnboardingStatus.Invalid;
                check.Message = string.Join(" · ", problems);
            }
            else if (analysis.Message.Length > 0)
            {
                check.Status = PartsOnboardingStatus.Invalid;
                check.Message = analysis.Message;
            }
            else
            {
                check.Status = PartsOnboardingStatus.Ready;
                check.Message = "Ready";
                check.ProductCode = $"{subCode}-{(nextNumber + ready).ToString("D5", CultureInfo.InvariantCulture)}";
                ready++;
            }

            if (key.Length > 0)
            {
                seen.TryAdd(key, row.Row);
            }

            analysis.Rows.Add(
                new CheckedRow
                {
                    Check = check,
                    LinkItemId = linkId,
                    ReorderLevel = reorder,
                    RedLevel = red,
                    MaxStockLevel = max,
                    Remarks = remarks
                });
        }

        return analysis;
    }


    //===========================================================
    // Onboard
    //===========================================================

    public async Task<PartsOnboardingResultDto> OnboardAsync(
        PartsOnboardingRequestDto request,
        long userId)
    {
        //-------------------------------------------------------
        // Checks first (nothing is written before they pass)
        //-------------------------------------------------------

        Analysis analysis =
            await AnalyzeCoreAsync(request);

        if (analysis.Message.Length > 0)
        {
            throw new InvalidOperationException(analysis.Message);
        }

        List<CheckedRow> notReady =
            analysis.Rows
                .Where(x => x.Check.Status != PartsOnboardingStatus.Ready && x.Check.Status != PartsOnboardingStatus.Link)
                .ToList();

        if (notReady.Count > 0)
        {
            string list =
                string.Join(
                    "; ",
                    notReady.Take(3).Select(x => $"row {x.Check.Row}: {x.Check.Message}"));

            string more =
                notReady.Count > 3 ? $" and {notReady.Count - 3} more" : string.Empty;

            throw new InvalidOperationException(
                $"Nothing was saved. {notReady.Count} row(s) are not ready ({list}{more}). Analyze again.");
        }

        bool spare =
            analysis.ProductType == PartsOnboardingTypes.SpareParts;

        long categoryId =
            analysis.Category!.ProductCategoryId;

        long subCategoryId =
            analysis.SubCategory!.ProductSubCategoryId;

        //-------------------------------------------------------
        // All in one transaction
        //-------------------------------------------------------

        List<(int Row, long Id)> created = new();

        List<(int Row, string ProductCode, string PartNumber, string Name)> linked = new();

        await using (var transaction = await _context.Database.BeginTransactionAsync())
        {
            foreach (CheckedRow row in analysis.Rows)
            {
                PartsOnboardingCheckDto c =
                    row.Check;

                // Saved under another model : only the link is added
                if (c.Status == PartsOnboardingStatus.Link)
                {
                    bool added =
                        spare
                            ? await ProductFitments.AddSparePartLinkAsync(_context, row.LinkItemId, subCategoryId, userId)
                            : await ProductFitments.AddAccessoryLinkAsync(_context, row.LinkItemId, subCategoryId, userId);

                    if (added)
                    {
                        linked.Add((c.Row, c.ProductCode, c.PartNumber, c.Name));
                    }

                    continue;
                }

                try
                {
                    long id =
                        spare
                            ? await _spareParts.CreateAsync(
                                new CreateSparePartsDto
                                {
                                    ProductCategoryId = categoryId,
                                    ProductSubCategoryId = subCategoryId,
                                    PartNumber = c.PartNumber,
                                    PartName = c.Name,
                                    Unit = c.Unit,
                                    ReorderLevel = row.ReorderLevel,
                                    RedLevel = row.RedLevel,
                                    MaxStockLevel = row.MaxStockLevel,
                                    MovementClass = c.MovementClass,
                                    Remarks = row.Remarks,
                                    IsActive = true
                                },
                                userId)
                            : await _accessories.CreateAsync(
                                new CreateAccessoriesDto
                                {
                                    ProductCategoryId = categoryId,
                                    ProductSubCategoryId = subCategoryId,
                                    PartNumber = c.PartNumber,
                                    AccessoryName = c.Name,
                                    Unit = c.Unit,
                                    ReorderLevel = row.ReorderLevel,
                                    RedLevel = row.RedLevel,
                                    MaxStockLevel = row.MaxStockLevel,
                                    MovementClass = c.MovementClass,
                                    Remarks = row.Remarks,
                                    IsActive = true
                                },
                                userId);

                    created.Add((c.Row, id));
                }
                catch (InvalidOperationException ex)
                {
                    // The transaction is rolled back on dispose
                    throw new InvalidOperationException(
                        $"Nothing was saved. Row {c.Row} ({c.PartNumber} {c.Name}): {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
        }

        //-------------------------------------------------------
        // Result (what was made)
        //-------------------------------------------------------

        List<long> ids =
            created.Select(x => x.Id).ToList();

        var saved =
            spare
                ? await _context.Set<SparePartsEntity>()
                    .AsNoTracking()
                    .Where(x => ids.Contains(x.SparePartId))
                    .Select(x => new { Id = x.SparePartId, x.PublicId, x.ProductCode, x.PartNumber, Name = x.PartName })
                    .ToListAsync()
                : await _context.Set<AccessoriesEntity>()
                    .AsNoTracking()
                    .Where(x => ids.Contains(x.AccessoryId))
                    .Select(x => new { Id = x.AccessoryId, x.PublicId, x.ProductCode, x.PartNumber, Name = x.AccessoryName })
                    .ToListAsync();

        PartsOnboardingResultDto result =
            new()
            {
                ProductType = analysis.ProductType,
                SubCategoryCode = analysis.SubCategory!.SubCategoryCode,
                SubCategoryName = analysis.SubCategory!.SubCategoryName
            };

        result.Linked =
            linked
                .Select(
                    x =>
                        new PartsOnboardingItemDto
                        {
                            Row = x.Row,
                            ProductCode = x.ProductCode,
                            PartNumber = x.PartNumber,
                            Name = x.Name
                        })
                .ToList();

        foreach ((int rowNumber, long id) in created)
        {
            var item =
                saved.FirstOrDefault(x => x.Id == id);

            if (item != null)
            {
                result.Items.Add(
                    new PartsOnboardingItemDto
                    {
                        Row = rowNumber,
                        PublicId = item.PublicId,
                        ProductCode = item.ProductCode,
                        PartNumber = item.PartNumber,
                        Name = item.Name
                    });
            }
        }

        return result;
    }
}
