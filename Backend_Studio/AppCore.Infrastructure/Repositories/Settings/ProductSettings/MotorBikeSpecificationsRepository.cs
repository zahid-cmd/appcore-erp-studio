//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.Paging;
using AppCore.Application.Settings.ProductSettings;
using AppCore.Domain.Common;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Persistence.Paging;

using SpecificationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikeSpecifications;

using SpecificationItemsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikeSpecificationItems;

using BikeModelsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeModels;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;


//===============================================================
// Namespace (as registered by Code Synchronization)
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ProductSettings;


//===============================================================
// Motor Bike Specifications Repository
//
// Code     : MBS-0001, given on save (deleted rows count, never
//            reused). Never changes.
// Model    : required; one live specification per bike model.
// Fuel     : Electric -> Motor Power (W; printed as kW on Form-17)
//                        and No. of Motors (in Cylinders) required,
//                        Engine CC 0;
//            others   -> Engine CC and Cylinders required.
// BRTA     : Vehicle Class, Seating Capacity and Country of
//            Origin required; Laden >= Unladen weight.
// Maker    : the brand's Maker's Name (Brand Management); a
//            brand without one cannot save a specification.
// Body     : required; the form offers MOTOR CYCLE (LARGE / MEDIUM
//            / SMALL) in BRTA wording.
//            Horse Power / Battery, RPM, wheel base, L / W / H,
//            tyres and axles optional (Form-17 items 29 - 41).
// Rows     : fixed sections; empty label or value rows dropped;
//            no repeated label inside a section.
//===============================================================

public class MotorBikeSpecificationsRepository
    : IMotorBikeSpecificationsRepository
{
    private const string HistoryModule = "Product Settings";

    private const string HistoryEntity = "MotorBikeSpecifications";

    private const string CodePrefix = "MBS";

    public const string Electric = "Electric";

    public static readonly string[] FuelTypes =
        { "Petrol", "Octane", Electric, "Hybrid", "Diesel", "CNG" };

    public static readonly string[] VehicleClasses =
        { "MOTOR CYCLE", "SCOOTER", "MOPED" };


    public static readonly string[] Sections =
    {
        "Engine / Motor",
        "Transmission",
        "Chassis & Suspension",
        "Brakes & Wheels",
        "Dimensions & Capacity",
        "Electricals",
        "Features"
    };

    // Suggested labels for a new specification (all editable)
    private static readonly (string Section, string[] Labels)[] Suggested =
    {
        ("Engine / Motor", new[] { "Engine Type", "Displacement", "Max Power", "Max Torque", "Bore x Stroke", "Compression Ratio", "Fuel System", "Cooling System", "Starting System" }),
        ("Transmission", new[] { "Gearbox", "Clutch", "Final Drive" }),
        ("Chassis & Suspension", new[] { "Frame Type", "Front Suspension", "Rear Suspension" }),
        ("Brakes & Wheels", new[] { "Front Brake", "Rear Brake", "ABS", "Wheel Type", "Tyre Type" }),
        ("Dimensions & Capacity", new[] { "Ground Clearance", "Seat Height", "Kerb Weight", "Fuel Tank Capacity" }),
        ("Electricals", new[] { "Battery", "Charging Time", "Controller", "Headlamp", "Tail Lamp" }),
        ("Features", new[] { "Instrument Cluster", "Mobile Charging", "Mileage / Range", "Top Speed" })
    };

    private const int MaxRows = 200;

    private readonly AppDbContext _context;


    public MotorBikeSpecificationsRepository(
        AppDbContext context)
    {
        _context = context;
    }


    private DbSet<SpecificationsEntity> Specifications =>
        _context.Set<SpecificationsEntity>();

    private DbSet<SpecificationItemsEntity> Items =>
        _context.Set<SpecificationItemsEntity>();


    //===========================================================
    // Query (live rows, with the model, brand and row count)
    //===========================================================

    private IQueryable<MotorBikeSpecificationsDto> SpecificationsQuery()
    {
        return
            from x in Specifications.AsNoTracking()
            where !x.IsDeleted
            join m in _context.Set<BikeModelsEntity>().AsNoTracking()
                on x.BikeModelId equals m.BikeModelId
            join b in _context.Set<BrandManagementEntity>().AsNoTracking()
                on m.BrandManagementId equals b.BrandManagementId into brands
            from b in brands.DefaultIfEmpty()
            select new MotorBikeSpecificationsDto
            {
                MotorBikeSpecificationId = x.MotorBikeSpecificationId,
                PublicId = x.PublicId,
                SpecificationCode = x.SpecificationCode,
                BikeModelId = x.BikeModelId,
                ModelCode = m.ModelCode,
                ModelName = m.ModelName,
                BrandManagementId = m.BrandManagementId,
                BrandName = b != null ? b.BrandName : string.Empty,
                EngineCc = x.EngineCc,
                MotorPowerWatts = x.MotorPowerWatts,
                FuelType = x.FuelType,
                Cylinders = x.Cylinders,
                VehicleClass = x.VehicleClass,
                BodyType = x.BodyType,
                SeatingCapacity = x.SeatingCapacity,
                UnladenWeightKg = x.UnladenWeightKg,
                LadenWeightKg = x.LadenWeightKg,
                // The brand's Maker's Name (saved copy when it is gone)
                Maker = b != null && b.MakerName != "" ? b.MakerName : x.Maker,
                CountryOfOrigin = x.CountryOfOrigin,
                HorsePower = x.HorsePower,
                Rpm = x.Rpm,
                Mileage = x.Mileage,
                TopSpeedKmh = x.TopSpeedKmh,
                WheelBaseMm = x.WheelBaseMm,
                LengthMm = x.LengthMm,
                WidthMm = x.WidthMm,
                HeightMm = x.HeightMm,
                TyreCount = x.TyreCount,
                FrontTyreSize = x.FrontTyreSize,
                RearTyreSize = x.RearTyreSize,
                AxleCount = x.AxleCount,
                ItemCount =
                    _context.Set<SpecificationItemsEntity>()
                        .Count(i => i.MotorBikeSpecificationId == x.MotorBikeSpecificationId),
                ShowOnWebsite = x.ShowOnWebsite,
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


    // The rows of the given specifications, section order then line
    private async Task AttachItemsAsync
    (
        List<MotorBikeSpecificationsDto> rows
    )
    {
        if (rows.Count == 0)
        {
            return;
        }

        long[] ids =
            rows.Select(x => x.MotorBikeSpecificationId).ToArray();

        var items =
            await Items
                .AsNoTracking()
                .Where(i => ids.Contains(i.MotorBikeSpecificationId))
                .Select(
                    i =>
                        new
                        {
                            i.MotorBikeSpecificationId,
                            i.Section,
                            i.LineNo,
                            i.Label,
                            i.Value
                        })
                .ToListAsync();

        foreach (MotorBikeSpecificationsDto row in rows)
        {
            row.Items =
                items
                    .Where(i => i.MotorBikeSpecificationId == row.MotorBikeSpecificationId)
                    .OrderBy(i => SectionOrder(i.Section))
                    .ThenBy(i => i.LineNo)
                    .Select(
                        i =>
                            new MotorBikeSpecificationItemDto
                            {
                                Section = i.Section,
                                LineNo = i.LineNo,
                                Label = i.Label,
                                Value = i.Value
                            })
                    .ToList();

            row.ItemCount = row.Items.Count;
        }
    }


    private static int SectionOrder(string section)
    {
        int index =
            Array.IndexOf(Sections, section);

        return index < 0 ? Sections.Length : index;
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<MotorBikeSpecificationsDto>> GetAllAsync()
    {
        List<MotorBikeSpecificationsDto> rows =
            await SpecificationsQuery()
                .OrderBy(x => x.SpecificationCode)
                .ToListAsync();

        await AttachItemsAsync(rows);

        return rows;
    }


    //===========================================================
    // Get Paged (the list page)
    //===========================================================

    private static SortMap<MotorBikeSpecificationsDto> ListSorts()
    {
        return new SortMap<MotorBikeSpecificationsDto>("SpecificationCode")
            .Add("SpecificationCode", x => x.SpecificationCode)
            .Add("ModelName", x => x.ModelName)
            .Add("BrandName", x => x.BrandName)
            .Add("EngineCc", x => x.EngineCc)
            .Add("VehicleClass", x => x.VehicleClass)
            .Add("FuelType", x => x.FuelType)
            .Add("ItemCount", x => x.ItemCount)
            .Add("ShowOnWebsite", x => x.ShowOnWebsite)
            .Add("Status", x => x.Status)
            .Tie(x => x.MotorBikeSpecificationId);
    }


    public async Task<PagedResult<MotorBikeSpecificationsDto>> GetPagedAsync
    (
        MotorBikeSpecificationsPageRequest request
    )
    {
        IQueryable<MotorBikeSpecificationsDto> query =
            SpecificationsQuery();

        //-------------------------------------------------------
        // Search (also the row labels and values)
        //-------------------------------------------------------

        string search =
            request.SafeSearch;

        if (search.Length > 0)
        {
            string like =
                PagingQuery.LikePattern(search);

            IQueryable<long> byRow =
                from i in Items.AsNoTracking()
                where EF.Functions.ILike(i.Label, like)
                      || EF.Functions.ILike(i.Value, like)
                select i.MotorBikeSpecificationId;

            query =
                query.Where
                (
                    x =>
                        EF.Functions.ILike(x.SpecificationCode, like) ||
                        EF.Functions.ILike(x.ModelName, like) ||
                        EF.Functions.ILike(x.ModelCode, like) ||
                        EF.Functions.ILike(x.BrandName, like) ||
                        EF.Functions.ILike(x.VehicleClass, like) ||
                        EF.Functions.ILike(x.BodyType, like) ||
                        EF.Functions.ILike(x.FuelType, like) ||
                        EF.Functions.ILike(x.Maker, like) ||
                        EF.Functions.ILike(x.CountryOfOrigin, like) ||
                        EF.Functions.ILike(x.Remarks, like) ||
                        byRow.Contains(x.MotorBikeSpecificationId)
                );
        }

        //-------------------------------------------------------
        // Brand filter
        //-------------------------------------------------------

        long brandId =
            request.BrandManagementId > 0
                ? request.BrandManagementId.Value
                : 0;

        if (brandId > 0)
        {
            query = query.Where(x => x.BrandManagementId == brandId);
        }

        //-------------------------------------------------------
        // Summary counts (search and brand applied; not the tab)
        //-------------------------------------------------------

        int countAll =
            await query.CountAsync();

        int countActive =
            await query.CountAsync(x => x.Status);

        int countWebsite =
            await query.CountAsync(x => x.ShowOnWebsite);

        IQueryable<long> specified =
            Specifications
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => x.BikeModelId);

        int countWithout =
            await _context.Set<BikeModelsEntity>()
                .AsNoTracking()
                .Where(
                    m =>
                        !m.IsDeleted
                        && m.Status
                        && (brandId == 0 || m.BrandManagementId == brandId)
                        && !specified.Contains(m.BikeModelId))
                .CountAsync();

        Dictionary<string, int> summaryCounts =
            new()
            {
                ["Total"] = countAll,
                ["Active"] = countActive,
                ["Inactive"] = countAll - countActive,
                ["OnWebsite"] = countWebsite,
                ["WithoutSpecification"] = countWithout
            };

        //-------------------------------------------------------
        // Tab (Website / Hidden) and status
        //-------------------------------------------------------

        if (request.ShowOnWebsite.HasValue)
        {
            bool shown = request.ShowOnWebsite.Value;

            query = query.Where(x => x.ShowOnWebsite == shown);
        }

        if (request.Status.HasValue)
        {
            bool active = request.Status.Value;

            query = query.Where(x => x.Status == active);
        }

        int total =
            await query.CountAsync();

        PagingQuery.FitPage(request, total);

        List<MotorBikeSpecificationsDto> rows =
            await ListSorts()
                .Apply(query, request)
                .Page(request)
                .ToListAsync();

        return new PagedResult<MotorBikeSpecificationsDto>
        {
            Items = rows,
            TotalCount = total,
            Page = request.SafePage,
            PageSize = request.SafePageSize,
            Counts = summaryCounts
        };
    }


    //===========================================================
    // Public Id -> internal id / Get By Id / Get For Model
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

        return await Specifications
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.PublicId == publicId)
            .Select(x => (long?)x.MotorBikeSpecificationId)
            .FirstOrDefaultAsync();
    }


    public async Task<MotorBikeSpecificationsDto?> GetByIdAsync
    (
        long id
    )
    {
        MotorBikeSpecificationsDto? row =
            await SpecificationsQuery()
                .FirstOrDefaultAsync(x => x.MotorBikeSpecificationId == id);

        if (row != null)
        {
            await AttachItemsAsync(new List<MotorBikeSpecificationsDto> { row });
        }

        return row;
    }


    public async Task<MotorBikeSpecificationsDto?> GetForModelAsync
    (
        long bikeModelId
    )
    {
        MotorBikeSpecificationsDto? row =
            await SpecificationsQuery()
                .FirstOrDefaultAsync(x => x.BikeModelId == bikeModelId && x.Status);

        if (row != null)
        {
            await AttachItemsAsync(new List<MotorBikeSpecificationsDto> { row });
        }

        return row;
    }


    //===========================================================
    // Next Code : highest MBS-nnnn (deleted rows count) + 1
    //===========================================================

    public async Task<string> GetNextCodeAsync()
    {
        List<string> codes =
            await Specifications
                .AsNoTracking()
                .Select(x => x.SpecificationCode)
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
    // Defaults : code, lists, suggested rows, brands, models
    //===========================================================

    public async Task<MotorBikeSpecificationsDefaultsDto> GetDefaultsAsync()
    {
        var live =
            await Specifications
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => new { x.BikeModelId, x.PublicId, x.SpecificationCode })
                .ToListAsync();

        List<MotorBikeSpecificationModelOptionDto> models =
            await
            (
                from m in _context.Set<BikeModelsEntity>().AsNoTracking()
                where !m.IsDeleted
                join b in _context.Set<BrandManagementEntity>().AsNoTracking()
                    on m.BrandManagementId equals b.BrandManagementId into brands
                from b in brands.DefaultIfEmpty()
                orderby m.ModelName
                select new MotorBikeSpecificationModelOptionDto
                {
                    BikeModelId = m.BikeModelId,
                    BrandManagementId = m.BrandManagementId,
                    BrandName = b != null ? b.BrandName : string.Empty,
                    MakerName = b != null ? b.MakerName : string.Empty,
                    ModelCode = m.ModelCode,
                    ModelName = m.ModelName,
                    Status = m.Status
                }
            )
            .ToListAsync();

        foreach (MotorBikeSpecificationModelOptionDto model in models)
        {
            var own =
                live.FirstOrDefault(x => x.BikeModelId == model.BikeModelId);

            if (own != null)
            {
                model.SpecificationPublicId = own.PublicId;
                model.SpecificationCode = own.SpecificationCode;
            }
        }

        // Brands that have bike models only
        HashSet<long> withModels =
            models.Select(x => x.BrandManagementId).ToHashSet();

        List<MotorBikeSpecificationBrandOptionDto> brandRows =
            await _context.Set<BrandManagementEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.BrandName)
                .Select(
                    x =>
                        new MotorBikeSpecificationBrandOptionDto
                        {
                            BrandManagementId = x.BrandManagementId,
                            BrandName = x.BrandName,
                            Status = x.Status
                        })
                .ToListAsync();

        List<MotorBikeSpecificationItemDto> suggested =
            new();

        foreach ((string section, string[] labels) in Suggested)
        {
            int lineNo = 0;

            foreach (string label in labels)
            {
                suggested.Add(
                    new MotorBikeSpecificationItemDto
                    {
                        Section = section,
                        LineNo = ++lineNo,
                        Label = label,
                        Value = string.Empty
                    });
            }
        }

        return new MotorBikeSpecificationsDefaultsDto
        {
            Code = await GetNextCodeAsync(),
            FuelTypes = FuelTypes.ToList(),
            VehicleClasses = VehicleClasses.ToList(),
            Sections = Sections.ToList(),
            SuggestedItems = suggested,
            Brands = brandRows.Where(x => withModels.Contains(x.BrandManagementId)).ToList(),
            Models = models
        };
    }


    //===========================================================
    // Checks shared by create / update
    //===========================================================

    private sealed record CleanInput
    (
        BikeModelsEntity Model,
        decimal EngineCc,
        int MotorPowerWatts,
        string FuelType,
        int Cylinders,
        string VehicleClass,
        string BodyType,
        int SeatingCapacity,
        decimal UnladenWeightKg,
        decimal LadenWeightKg,
        string Maker,
        string CountryOfOrigin,
        string HorsePower,
        int Rpm,
        string Mileage,
        int TopSpeedKmh,
        int WheelBaseMm,
        int LengthMm,
        int WidthMm,
        int HeightMm,
        int TyreCount,
        string FrontTyreSize,
        string RearTyreSize,
        int AxleCount,
        List<(string Section, string Label, string Value)> Items,
        string Remarks
    );


    private static string Squeeze(string? value) =>
        string.Join(" ", (value ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries));


    private static string Text
    (
        string? value,
        int max,
        string what
    )
    {
        string text =
            Squeeze(value);

        if (text.Length > max)
        {
            throw new InvalidOperationException($"{what} cannot be longer than {max} characters.");
        }

        return text;
    }


    private async Task<CleanInput> CleanAsync
    (
        CreateMotorBikeSpecificationsDto dto,
        long excludeId
    )
    {
        //-------------------------------------------------------
        // Bike model : one live specification each
        //-------------------------------------------------------

        if (dto.BikeModelId <= 0)
        {
            throw new InvalidOperationException("Bike Model is required.");
        }

        BikeModelsEntity model =
            await _context.Set<BikeModelsEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.BikeModelId == dto.BikeModelId && !x.IsDeleted)
            ?? throw new InvalidOperationException("The selected Bike Model was not found. It may have been deleted.");

        long savedModelId =
            excludeId > 0
                ? await Specifications
                    .AsNoTracking()
                    .Where(x => x.MotorBikeSpecificationId == excludeId)
                    .Select(x => x.BikeModelId)
                    .FirstOrDefaultAsync()
                : 0;

        if (!model.Status && savedModelId != model.BikeModelId)
        {
            throw new InvalidOperationException($"Bike model '{model.ModelName}' is inactive.");
        }

        string? taken =
            await Specifications
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.MotorBikeSpecificationId != excludeId && x.BikeModelId == model.BikeModelId)
                .Select(x => x.SpecificationCode)
                .FirstOrDefaultAsync();

        if (taken != null)
        {
            throw new InvalidOperationException(
                $"Bike model '{model.ModelName}' already has a specification ({taken}). Edit that one instead.");
        }

        //-------------------------------------------------------
        // Fuel, CC / motor power, cylinders
        //-------------------------------------------------------

        string fuel =
            FuelTypes.FirstOrDefault(x => x.Equals((dto.FuelType ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException($"Choose the Fuel Type : {string.Join(", ", FuelTypes)}.");

        bool electric =
            fuel == Electric;

        decimal cc =
            Math.Round(dto.EngineCc, 2);

        int watts =
            dto.MotorPowerWatts;

        int cylinders =
            dto.Cylinders;

        if (electric)
        {
            if (watts < 1 || watts > 100000)
            {
                throw new InvalidOperationException("An electric bike needs its Motor Power (1 - 100,000 W).");
            }

            cc = 0;

            // BRTA "Number of Motor" (Cylinders holds it for electric)
            if (cylinders < 1 || cylinders > 4)
            {
                throw new InvalidOperationException("No. of Motors must be between 1 and 4.");
            }
        }
        else
        {
            if (cc <= 0 || cc > 5000)
            {
                throw new InvalidOperationException("Engine CC is required (more than 0, up to 5,000).");
            }

            if (watts < 0 || watts > 100000)
            {
                throw new InvalidOperationException("Motor Power must be between 0 and 100,000 W.");
            }

            if (cylinders < 1 || cylinders > 12)
            {
                throw new InvalidOperationException("Cylinders must be between 1 and 12.");
            }
        }

        //-------------------------------------------------------
        // BRTA fields
        //-------------------------------------------------------

        string vehicleClass =
            Text(dto.VehicleClass, 60, "Vehicle Class");

        if (vehicleClass.Length == 0)
        {
            throw new InvalidOperationException("Vehicle Class is required.");
        }

        string bodyType =
            Text(dto.BodyType, 60, "Body Type");

        if (bodyType.Length == 0)
        {
            throw new InvalidOperationException("Body Type is required.");
        }

        if (dto.SeatingCapacity < 1 || dto.SeatingCapacity > 9)
        {
            throw new InvalidOperationException("Seating Capacity must be between 1 and 9.");
        }

        decimal unladen =
            Math.Round(dto.UnladenWeightKg, 2);

        decimal laden =
            Math.Round(dto.LadenWeightKg, 2);

        if (unladen < 0 || unladen > 9999 || laden < 0 || laden > 9999)
        {
            throw new InvalidOperationException("Weights must be between 0 and 9,999 kg.");
        }

        if (unladen <= 0)
        {
            throw new InvalidOperationException("Unladen Weight is required.");
        }

        if (laden <= 0)
        {
            throw new InvalidOperationException("Laden Weight is required.");
        }

        if (laden < unladen)
        {
            throw new InvalidOperationException("Laden Weight cannot be less than Unladen Weight.");
        }

        // Maker : the brand's Maker's Name (Brand Management)
        var brand =
            await _context.Set<BrandManagementEntity>()
                .AsNoTracking()
                .Where(x => x.BrandManagementId == model.BrandManagementId)
                .Select(x => new { x.BrandName, x.MakerName })
                .FirstOrDefaultAsync();

        string maker =
            Squeeze(brand?.MakerName);

        if (maker.Length == 0)
        {
            throw new InvalidOperationException(
                $"Brand '{brand?.BrandName ?? model.ModelName}' has no Maker's Name. Set it on Brand Management first.");
        }

        string country =
            Text(dto.CountryOfOrigin, 80, "Country of Origin");

        if (country.Length == 0)
        {
            throw new InvalidOperationException("Country of Origin is required.");
        }

        //-------------------------------------------------------
        // Power text, RPM, size and tyres (optional)
        //-------------------------------------------------------

        string horsePower =
            Text(dto.HorsePower, 60, electric ? "Battery Capacity" : "Horse Power");

        if (dto.Rpm < 0 || dto.Rpm > 30000)
        {
            throw new InvalidOperationException("RPM must be between 0 and 30,000.");
        }

        string mileage =
            Text(dto.Mileage, 60, electric ? "Range" : "Mileage");

        if (dto.TopSpeedKmh < 0 || dto.TopSpeedKmh > 400)
        {
            throw new InvalidOperationException("Top Speed must be between 0 and 400 km/h.");
        }

        foreach ((int mm, string what) in new[]
        {
            (dto.WheelBaseMm, "Wheel Base"),
            (dto.LengthMm, "Overall Length"),
            (dto.WidthMm, "Overall Width"),
            (dto.HeightMm, "Overall Height")
        })
        {
            if (mm < 0 || mm > 20000)
            {
                throw new InvalidOperationException($"{what} must be between 0 and 20,000 mm.");
            }
        }

        if (dto.TyreCount < 1 || dto.TyreCount > 10)
        {
            throw new InvalidOperationException("No. of Tyres must be between 1 and 10.");
        }

        if (dto.AxleCount < 1 || dto.AxleCount > 5)
        {
            throw new InvalidOperationException("No. of Axles must be between 1 and 5.");
        }

        string frontTyre =
            Text(dto.FrontTyreSize, 40, "Front Tyre Size");

        string rearTyre =
            Text(dto.RearTyreSize, 40, "Rear Tyre Size");

        if (dto.WheelBaseMm <= 0)
        {
            throw new InvalidOperationException("Wheel Base is required.");
        }

        if (frontTyre.Length == 0 || rearTyre.Length == 0)
        {
            throw new InvalidOperationException("Front and Rear Tyre Size are required.");
        }

        //-------------------------------------------------------
        // Rows : fixed sections, empty rows dropped, no repeated
        // label inside a section
        //-------------------------------------------------------

        List<(string Section, string Label, string Value)> items =
            new();

        foreach (MotorBikeSpecificationItemInputDto item in dto.Items ?? new List<MotorBikeSpecificationItemInputDto>())
        {
            string label =
                Squeeze(item.Label);

            string value =
                Squeeze(item.Value);

            if (label.Length == 0 || value.Length == 0)
            {
                continue;
            }

            string section =
                Sections.FirstOrDefault(x => x.Equals((item.Section ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
                ?? throw new InvalidOperationException($"Unknown section '{item.Section}'.");

            if (label.Length > 80)
            {
                throw new InvalidOperationException($"'{label[..20]}...' : a label cannot be longer than 80 characters.");
            }

            if (value.Length > 250)
            {
                throw new InvalidOperationException($"{label} : a value cannot be longer than 250 characters.");
            }

            if (items.Any(x => x.Section == section && x.Label.Equals(label, StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException($"'{label}' is listed twice under {section}.");
            }

            items.Add((section, label, value));
        }

        if (items.Count > MaxRows)
        {
            throw new InvalidOperationException($"A specification can hold up to {MaxRows} rows.");
        }

        string remarks =
            (dto.Remarks ?? string.Empty).Trim();

        if (remarks.Length > 1000)
        {
            throw new InvalidOperationException("Remarks cannot be longer than 1000 characters.");
        }

        return new CleanInput(
            model, cc, watts, fuel, cylinders, vehicleClass, bodyType, dto.SeatingCapacity,
            unladen, laden, maker, country, horsePower, dto.Rpm, mileage, dto.TopSpeedKmh,
            dto.WheelBaseMm, dto.LengthMm, dto.WidthMm, dto.HeightMm,
            dto.TyreCount, frontTyre, rearTyre, dto.AxleCount, items, remarks);
    }


    private static void Apply
    (
        SpecificationsEntity entity,
        CleanInput input,
        CreateMotorBikeSpecificationsDto dto
    )
    {
        entity.BikeModelId = input.Model.BikeModelId;
        entity.EngineCc = input.EngineCc;
        entity.MotorPowerWatts = input.MotorPowerWatts;
        entity.FuelType = input.FuelType;
        entity.Cylinders = input.Cylinders;
        entity.VehicleClass = input.VehicleClass;
        entity.BodyType = input.BodyType;
        entity.SeatingCapacity = input.SeatingCapacity;
        entity.UnladenWeightKg = input.UnladenWeightKg;
        entity.LadenWeightKg = input.LadenWeightKg;
        entity.Maker = input.Maker;
        entity.CountryOfOrigin = input.CountryOfOrigin;
        entity.HorsePower = input.HorsePower;
        entity.Rpm = input.Rpm;
        entity.Mileage = input.Mileage;
        entity.TopSpeedKmh = input.TopSpeedKmh;
        entity.WheelBaseMm = input.WheelBaseMm;
        entity.LengthMm = input.LengthMm;
        entity.WidthMm = input.WidthMm;
        entity.HeightMm = input.HeightMm;
        entity.TyreCount = input.TyreCount;
        entity.FrontTyreSize = input.FrontTyreSize;
        entity.RearTyreSize = input.RearTyreSize;
        entity.AxleCount = input.AxleCount;
        entity.ShowOnWebsite = dto.ShowOnWebsite;
        entity.Remarks = input.Remarks;
        entity.Status = dto.Status;
    }


    // Replaces the rows of a specification (line numbers per section)
    private async Task ReplaceItemsAsync
    (
        long specificationId,
        List<(string Section, string Label, string Value)> items
    )
    {
        await Items
            .Where(x => x.MotorBikeSpecificationId == specificationId)
            .ExecuteDeleteAsync();

        foreach (string section in Sections)
        {
            int lineNo = 0;

            foreach (var (_, label, value) in items.Where(x => x.Section == section))
            {
                Items.Add(
                    new SpecificationItemsEntity
                    {
                        MotorBikeSpecificationId = specificationId,
                        Section = section,
                        LineNo = ++lineNo,
                        Label = label,
                        Value = value
                    });
            }
        }
    }


    private void AddHistory
    (
        SpecificationsEntity entity,
        string modelName,
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
                EntityId = entity.MotorBikeSpecificationId,
                ActivityType = activityType,
                ActivityTitle = $"Motor Bike Specification {verb}",
                ActivityDescription = $"Motor bike specification {entity.SpecificationCode} for '{modelName}' {verb.ToLower()}.",
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });
    }


    private async Task<string> ModelNameAsync(long bikeModelId) =>
        await _context.Set<BikeModelsEntity>()
            .AsNoTracking()
            .Where(x => x.BikeModelId == bikeModelId)
            .Select(x => x.ModelName)
            .FirstOrDefaultAsync()
        ?? string.Empty;


    //===========================================================
    // Create
    //===========================================================

    public async Task<long> CreateAsync
    (
        CreateMotorBikeSpecificationsDto dto,
        long userId
    )
    {
        CleanInput input =
            await CleanAsync(dto, 0);

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        SpecificationsEntity entity =
            new()
            {
                SpecificationCode = await GetNextCodeAsync(),
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        Apply(entity, input, dto);

        Specifications.Add(entity);

        await _context.SaveChangesAsync();

        await ReplaceItemsAsync(entity.MotorBikeSpecificationId, input.Items);

        AddHistory(entity, input.Model.ModelName, "Create", "Created", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.MotorBikeSpecificationId;
    }


    //===========================================================
    // Update (the code never changes)
    //===========================================================

    public async Task UpdateAsync
    (
        UpdateMotorBikeSpecificationsDto dto,
        long userId
    )
    {
        SpecificationsEntity entity =
            await Specifications.FirstOrDefaultAsync(x => x.MotorBikeSpecificationId == dto.MotorBikeSpecificationId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Motor bike specification not found.");

        CleanInput input =
            await CleanAsync(dto, entity.MotorBikeSpecificationId);

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        Apply(entity, input, dto);

        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await ReplaceItemsAsync(entity.MotorBikeSpecificationId, input.Items);

        AddHistory(entity, input.Model.ModelName, "Update", "Updated", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    //===========================================================
    // Delete (soft; rows are kept for a restore)
    //===========================================================

    public async Task DeleteAsync
    (
        long id,
        long userId
    )
    {
        SpecificationsEntity entity =
            await Specifications.FirstOrDefaultAsync(x => x.MotorBikeSpecificationId == id && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Motor bike specification not found.");

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(entity, await ModelNameAsync(entity.BikeModelId), "Delete", "Deleted", userId);

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
        SpecificationsEntity? entity =
            await Specifications
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        string modelName =
            await ModelNameAsync(entity.BikeModelId);

        string? other =
            await Specifications
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.MotorBikeSpecificationId != entity.MotorBikeSpecificationId && x.BikeModelId == entity.BikeModelId)
                .Select(x => x.SpecificationCode)
                .FirstOrDefaultAsync();

        if (other != null)
        {
            throw new InvalidOperationException(
                $"Specification {entity.SpecificationCode} cannot be restored : bike model '{modelName}' already has {other}.");
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity, modelName, "Restore", "Restored", userId);

        await _context.SaveChangesAsync();

        return true;
    }
}
