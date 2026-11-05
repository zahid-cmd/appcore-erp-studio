//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Application.Public.Website;
using AppCore.Domain.Common;
using AppCore.Infrastructure.CodeMaster;
using AppCore.Infrastructure.Persistence;
using ServiceEnquiriesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.ServiceEnquiries;
using ServiceEnquiryLinesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.ServiceEnquiryLines;
using SalesEnquiriesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.SalesEnquiries;
using EnquiryContactsEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.EnquiryContacts;
using EnquirySetupsEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.EnquirySetups;
using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;
using LocationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Locations;
using UserProfileEntity =
    AppCore.Domain.Entities.SecurityPermission.UserManagement.UserProfile;
using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;
using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;
using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;
using CustomerProfilesEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.CustomerProfiles;
using SparePartsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SpareParts;
using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;
using ScheduledServicesEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ScheduledServices;
using LaborChartEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.LaborChart;
using CustomizedServicesEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.CustomizedServices;
using MembershipServicesEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.MembershipServices;
using StockBatchesEntity =
    AppCore.Domain.Platform.Inventory.StockBatches;
using StockMovementsEntity =
    AppCore.Domain.Platform.Inventory.StockMovements;
using ProductPriceIndexEntity =
    AppCore.Domain.Platform.Inventory.ProductPriceIndex;


//===============================================================
// Namespace (as registered by Code Synchronization)
//===============================================================

namespace AppCore.Infrastructure.Configurations.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Service Enquiries Repository
//
// Number  : ENQ-SER-MM-YYYY-nnnnn (CodeGenerator.GenerateEnquiryNo
//           "SER"), own monthly series for all branches, taken on
//           the first save under an advisory lock (4502, yyyymm).
// Type    : Service (model required; at least one service line or
//           a complaint) / Parts (at least one part line).
// Lines   : services from Service Settings (Scheduled, Labor
//           Chart, Customized, Membership) and parts from the
//           Spare Parts / Accessories catalogue, or typed (Other).
//           Name / code are copied from the item; the rate is the
//           estimate the user keeps. Replaced as a whole on save.
// Enquirer: EnquiryContacts by mobile (shared with Sales).
// Status  : Open-stage or Suspended (Lost stage, reason needed).
//           Won / Converted only from a job card, a service
//           invoice or a counter sale (pages to come).
// Website : Book a service / Ask for a part → a new unassigned
//           enquiry, or a note on the mobile's open one.
//===============================================================

public partial class ServiceEnquiriesRepository
    : IServiceEnquiriesRepository
{
    private const string HistoryModule = "Enquiry Management";

    private const string HistoryEntity = "ServiceEnquiries";

    private const string EnquiryNoType = "SER";

    // pg_advisory_xact_lock(LockKey, yyyymm) while numbering
    private const int LockKey = 4502;

    private const int WebsiteUserId = 0;

    private const int MaxLines = 50;

    private static readonly string[] EnquiryTypes = { "Service", "Parts" };

    private static readonly string[] Slots = { "Morning", "Afternoon", "Evening" };

    private static readonly string[] ServiceKinds = { "Scheduled", "LaborChart", "Customized", "Membership", "Other" };

    private static readonly string[] PartKinds = { "SparePart", "Accessory", "Other" };


    private readonly AppDbContext _context;


    public ServiceEnquiriesRepository(
        AppDbContext context)
    {
        _context = context;
    }


    private DbSet<ServiceEnquiriesEntity> Enquiries =>
        _context.Set<ServiceEnquiriesEntity>();

    private DbSet<ServiceEnquiryLinesEntity> Lines =>
        _context.Set<ServiceEnquiryLinesEntity>();

    private DbSet<EnquiryContactsEntity> Contacts =>
        _context.Set<EnquiryContactsEntity>();

    private DbSet<EnquirySetupsEntity> Setups =>
        _context.Set<EnquirySetupsEntity>();


    private static DateOnly Today() =>
        DateOnly.FromDateTime(DateTime.Now);


    private static string Squeeze(string? value) =>
        string.Join(" ", (value ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries));


    private static string Cut(string value, int max) =>
        value.Length <= max ? value : value[..max];


    private static string CleanPhone(string? value) =>
        new string((value ?? string.Empty).Where(char.IsDigit).ToArray());


    private static bool IsValidMobile(string digits) =>
        digits.Length == 11 && digits.StartsWith("01");


    // Registration / chassis : upper case, single spaces
    private static string CleanPlate(string? value, int max) =>
        Cut(Squeeze(value).ToUpperInvariant(), max);



    //===========================================================
    // READ
    //===========================================================

    private sealed record Lookups
    (
        Dictionary<long, EnquirySetupsEntity> Setups,
        Dictionary<long, EnquiryContactsEntity> Contacts,
        Dictionary<long, string> Locations,
        ILookup<long, ServiceEnquiryLinesEntity> Lines
    );


    private async Task<Lookups> LoadLookupsAsync
    (
        List<ServiceEnquiriesEntity> rows
    )
    {
        Dictionary<long, EnquirySetupsEntity> setups =
            await Setups.AsNoTracking().ToDictionaryAsync(x => x.EnquirySetupId);

        List<long> contactIds =
            rows.Select(x => x.EnquiryContactId).Distinct().ToList();

        Dictionary<long, EnquiryContactsEntity> contacts =
            await Contacts.AsNoTracking()
                .Where(x => contactIds.Contains(x.EnquiryContactId))
                .ToDictionaryAsync(x => x.EnquiryContactId);

        List<long> locationIds =
            contacts.Values.Where(x => x.LocationId.HasValue).Select(x => x.LocationId!.Value).Distinct().ToList();

        Dictionary<long, string> locations =
            await _context.Set<LocationsEntity>().AsNoTracking()
                .Where(x => locationIds.Contains(x.LocationId))
                .ToDictionaryAsync(x => x.LocationId, x => x.DisplayName);

        List<long> ids =
            rows.Select(x => x.ServiceEnquiryId).ToList();

        List<ServiceEnquiryLinesEntity> lines =
            await Lines.AsNoTracking()
                .Where(x => ids.Contains(x.ServiceEnquiryId))
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        return new Lookups(setups, contacts, locations, lines.ToLookup(x => x.ServiceEnquiryId));
    }


    private static ServiceEnquiriesDto ToDto
    (
        ServiceEnquiriesEntity x,
        Lookups lookups
    )
    {
        EnquirySetupsEntity? Setup(long? id) =>
            id.HasValue && lookups.Setups.TryGetValue(id.Value, out var row) ? row : null;

        EnquirySetupsEntity? status = Setup(x.StatusId);

        lookups.Contacts.TryGetValue(x.EnquiryContactId, out var contact);

        string locationName =
            contact?.LocationId != null && lookups.Locations.TryGetValue(contact.LocationId.Value, out var location)
                ? location
                : string.Empty;

        List<ServiceEnquiryLineDto> lines =
            lookups.Lines[x.ServiceEnquiryId]
                .Select(l => new ServiceEnquiryLineDto
                {
                    LineType = l.LineType,
                    ItemKind = l.ItemKind,
                    ItemId = l.ItemId,
                    ItemCode = l.ItemCode,
                    ItemName = l.ItemName,
                    Quantity = l.Quantity,
                    Rate = l.Rate,
                    Amount = l.Amount,
                    Note = l.Note
                })
                .ToList();

        // "1st Free Service - Revoo + 2 more" / the complaint
        string summary =
            lines.Count > 0
                ? lines[0].ItemName + (lines.Count > 1 ? $" + {lines.Count - 1} more" : string.Empty)
                : x.Complaint;

        return new ServiceEnquiriesDto
        {
            ServiceEnquiryId = x.ServiceEnquiryId,
            PublicId = x.PublicId,
            EnquiryNo = x.EnquiryNo,
            EnquiryDate = x.EnquiryDate,
            BranchId = x.BranchId,
            BranchName = x.BranchName,
            EnquiryType = x.EnquiryType,
            SourceId = x.SourceId,
            SourceName = Setup(x.SourceId)?.Name ?? string.Empty,
            StatusId = x.StatusId,
            StatusName = status?.Name ?? string.Empty,
            StatusColor = status?.ColorCode ?? string.Empty,
            StatusStage = status?.Stage ?? string.Empty,
            ExecutiveUserId = x.ExecutiveUserId,
            ExecutiveName = x.ExecutiveName,

            EnquiryContactId = x.EnquiryContactId,
            EnquirerMobile = x.EnquirerMobile,
            EnquirerName = x.EnquirerName,
            AltPhone = contact?.AltPhone ?? string.Empty,
            LocationId = contact?.LocationId,
            LocationName = locationName,
            Address = contact?.Address ?? string.Empty,

            ModelId = x.ModelId,
            ModelName = x.ModelName,
            BrandManagementId = x.BrandManagementId,
            BrandName = x.BrandName,
            RegistrationNo = x.RegistrationNo,
            ChassisNo = x.ChassisNo,
            KmReading = x.KmReading,

            Complaint = x.Complaint,
            PreferredDate = x.PreferredDate,
            PreferredSlot = x.PreferredSlot,
            PickupDrop = x.PickupDrop,
            EstimatedTotal = x.EstimatedTotal,
            Lines = lines,
            RequestSummary = summary,

            NextFollowUpDate = x.NextFollowUpDate,
            FollowUpMethodId = x.FollowUpMethodId,
            FollowUpMethodName = Setup(x.FollowUpMethodId)?.Name ?? string.Empty,
            LastFollowUpDate = x.LastFollowUpDate,
            LastFollowUpNote = x.LastFollowUpNote,
            LostReasonId = x.LostReasonId,
            LostReasonName = Setup(x.LostReasonId)?.Name ?? string.Empty,
            ClosedDate = x.ClosedDate,
            Remarks = x.Remarks,
            FromWebsite = x.FromWebsite,
            ServiceVehicleScheduleId = x.ServiceVehicleScheduleId,

            IsConverted = x.IsConverted,
            ConvertedDate = x.ConvertedDate,
            ConvertedDocType = x.ConvertedDocType,
            ConvertedDocNo = x.ConvertedDocNo,

            CreatedDate = x.CreatedDate,
            ModifiedDate = x.ModifiedDate
        };
    }


    public async Task<List<ServiceEnquiriesDto>> GetAllAsync()
    {
        await TryRaiseDueSchedulesAsync();

        return await LoadAllAsync();
    }


    // Sold bikes whose next service is near : raise their enquiries
    // (never blocks the list; run ServiceVehicles_Tables.sql)
    private async Task TryRaiseDueSchedulesAsync()
    {
        try
        {
            await RaiseDueSchedulesAsync();
        }
        catch (Exception)
        {
            _context.ChangeTracker.Clear();
        }
    }


    private async Task<List<ServiceEnquiriesDto>> LoadAllAsync()
    {
        List<ServiceEnquiriesEntity> rows =
            await Enquiries.AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.EnquiryDate)
                .ThenByDescending(x => x.ServiceEnquiryId)
                .ToListAsync();

        Lookups lookups =
            await LoadLookupsAsync(rows);

        return rows.Select(x => ToDto(x, lookups)).ToList();
    }


    //===========================================================
    // LIST PAGE (server paging)
    //
    // The rows are built as for the full list (stage, lines,
    // request summary), then filtered, counted, sorted and paged.
    //===========================================================

    private static bool IsOpenRow(ServiceEnquiriesDto x) =>
        !x.IsConverted && x.StatusStage != "Lost";


    private static bool IsWebsiteNew(ServiceEnquiriesDto x) =>
        x.FromWebsite && !(x.ExecutiveUserId > 0) && IsOpenRow(x);


    private static bool HasVisit(ServiceEnquiriesDto x) =>
        x.PreferredDate.HasValue && IsOpenRow(x);


    private static bool InTab
    (
        ServiceEnquiriesDto x,
        string tab,
        DateOnly today
    )
    {
        bool open = IsOpenRow(x);

        return tab switch
        {
            "website" => IsWebsiteNew(x),
            "visits" => HasVisit(x),
            "open" => open,

            // Due : follow-up today or earlier
            "due" => open && x.NextFollowUpDate.HasValue && x.NextFollowUpDate.Value <= today,

            "converted" => x.IsConverted,
            "suspended" => !x.IsConverted && x.StatusStage == "Lost",
            _ => true
        };
    }


    // The text the list shows in Status
    private static string StatusText(ServiceEnquiriesDto x) =>
        x.IsConverted
            ? "Converted" + (string.IsNullOrEmpty(x.ConvertedDocNo) ? string.Empty : " " + x.ConvertedDocNo)
            : x.StatusStage == "Lost" && string.IsNullOrEmpty(x.StatusName)
                ? "Suspended"
                : x.StatusName;


    private static readonly Dictionary<string, Func<ServiceEnquiriesDto, object?>> SortKeys =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["EnquiryNo"] = x => x.EnquiryNo,
            ["EnquiryDate"] = x => x.EnquiryDate,
            ["DateText"] = x => x.EnquiryDate,
            ["TypeText"] = x => x.EnquiryType,
            ["EnquirerText"] = x => x.EnquirerName,
            ["BikeText"] = x => string.IsNullOrEmpty(x.ModelName) ? x.RegistrationNo : x.ModelName,
            ["RequestText"] = x => x.RequestSummary,
            ["ExecutiveText"] = x => x.ExecutiveUserId > 0 ? x.ExecutiveName : "Unassigned",
            ["StatusText"] = x => StatusText(x),
            ["NextText"] = x => IsOpenRow(x) ? (x.PreferredDate ?? x.NextFollowUpDate) : null
        };


    public async Task<ServiceEnquiryPagedResult> GetPagedAsync
    (
        ServiceEnquiryPageRequest request
    )
    {
        if (request.Raise)
        {
            await TryRaiseDueSchedulesAsync();
        }

        List<ServiceEnquiriesDto> all =
            await LoadAllAsync();

        DateOnly today = DateOnly.FromDateTime(DateTime.Now);

        string tab = (request.Tab ?? "all").Trim().ToLowerInvariant();

        string type = (request.Type ?? "all").Trim();

        string[] words = EnquiryListQuery.Words(request);

        // Search
        List<ServiceEnquiriesDto> found =
            all
                .Where(
                    x =>
                        EnquiryListQuery.Matches(
                            words,
                            x.EnquiryNo,
                            EnquiryListQuery.DateText(x.EnquiryDate),
                            x.EnquiryType,
                            x.EnquirerName,
                            x.EnquirerMobile,
                            x.ModelName,
                            x.BrandName,
                            x.RegistrationNo,
                            x.ChassisNo,
                            x.Complaint,
                            string.Join(' ', x.Lines.Select(l => $"{l.ItemName} {l.ItemCode}")),
                            x.ExecutiveUserId > 0 ? x.ExecutiveName : "Unassigned",
                            x.SourceName,
                            StatusText(x),
                            x.LocationName,
                            x.BranchName,
                            x.Remarks))
                .ToList();

        // Tab + type
        List<ServiceEnquiriesDto> inView =
            found.Where(x => InTab(x, tab, today)).ToList();

        List<ServiceEnquiriesDto> rows =
            string.Equals(type, "all", StringComparison.OrdinalIgnoreCase)
                ? inView
                : inView.Where(x => string.Equals(x.EnquiryType, type, StringComparison.OrdinalIgnoreCase)).ToList();

        // Default order : newest first (Due : oldest follow-up
        // first; Visits : nearest visit first), then the asked column
        if (tab == "due")
        {
            rows = rows.OrderBy(x => x.NextFollowUpDate).ToList();
        }
        else if (tab == "visits")
        {
            rows = rows.OrderBy(x => x.PreferredDate).ToList();
        }

        rows = EnquiryListQuery.Sort(rows, request, SortKeys);

        ServiceEnquiryPagedResult result = new()
        {
            TotalCount = rows.Count,
            Items = EnquiryListQuery.Page(rows, request),
            Page = request.SafePage,
            PageSize = request.SafePageSize,
            WebsiteCount = all.Count(IsWebsiteNew),
            VisitsCount = all.Count(x => HasVisit(x) && x.PreferredDate!.Value >= today),
            ServiceCount = inView.Count(x => x.EnquiryType == "Service"),
            PartsCount = inView.Count(x => x.EnquiryType == "Parts")
        };

        result.Counts["All"] = found.Count;
        result.Counts["Open"] = found.Count(x => InTab(x, "open", today));
        result.Counts["Due"] = found.Count(x => InTab(x, "due", today));
        result.Counts["Converted"] = found.Count(x => InTab(x, "converted", today));
        result.Counts["Suspended"] = found.Count(x => InTab(x, "suspended", today));

        return result;
    }


    public async Task<long?> GetIdByPublicIdAsync
    (
        Guid publicId
    )
    {
        return await Enquiries.AsNoTracking()
            .Where(x => x.PublicId == publicId && !x.IsDeleted)
            .Select(x => (long?)x.ServiceEnquiryId)
            .FirstOrDefaultAsync();
    }


    public async Task<ServiceEnquiriesDto?> GetByIdAsync
    (
        long id
    )
    {
        ServiceEnquiriesEntity? row =
            await Enquiries.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ServiceEnquiryId == id && !x.IsDeleted);

        if (row == null)
        {
            return null;
        }

        Lookups lookups =
            await LoadLookupsAsync(new List<ServiceEnquiriesEntity> { row });

        return ToDto(row, lookups);
    }



    //===========================================================
    // NUMBER
    //===========================================================

    private async Task<int> GetNextSequenceAsync
    (
        int year,
        int month
    )
    {
        int highest =
            await Enquiries.AsNoTracking()
                .Where(x => x.EnquiryYear == year && x.EnquiryMonth == month)
                .Select(x => (int?)x.SequenceNo)
                .MaxAsync()
            ?? 0;

        return highest + 1;
    }



    //===========================================================
    // DEFAULTS (number preview + every dropdown)
    //===========================================================

    private async Task<List<EnquiryOptionDto>> SetupOptionsAsync
    (
        string setupType
    )
    {
        return await Setups.AsNoTracking()
            .Where(x => x.SetupType == setupType && !x.IsDeleted && x.IsActive)
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.Code)
            .Select(x => new EnquiryOptionDto
            {
                Id = x.EnquirySetupId,
                Code = x.Code,
                Name = x.Name,
                ColorCode = x.ColorCode,
                Stage = x.Stage,
                IsDefault = x.IsDefault,
                IsSystem = x.IsSystem
            })
            .ToListAsync();
    }


    // Motor bike models with their brand
    private async Task<List<EnquiryModelOptionDto>> ModelOptionsAsync()
    {
        Dictionary<long, string> brands =
            await _context.Set<BrandManagementEntity>().AsNoTracking()
                .ToDictionaryAsync(x => x.BrandManagementId, x => x.BrandName);

        var models =
            await (
                from s in _context.Set<ProductSubCategoryEntity>().AsNoTracking()
                join c in _context.Set<ProductCategoryEntity>().AsNoTracking()
                    on s.ProductCategoryId equals c.ProductCategoryId
                where !s.IsDeleted && s.IsActive && !c.IsDeleted && c.IsActive && c.CategoryType == "Motor Bikes"
                orderby s.SubCategoryName
                select new { s.ProductSubCategoryId, s.SubCategoryCode, s.SubCategoryName, c.BrandManagementId })
            .ToListAsync();

        return models
            .Select(x => new EnquiryModelOptionDto
            {
                Id = x.ProductSubCategoryId,
                Code = x.SubCategoryCode,
                Name = x.SubCategoryName,
                BrandManagementId = x.BrandManagementId,
                BrandName =
                    x.BrandManagementId.HasValue && brands.TryGetValue(x.BrandManagementId.Value, out var brand)
                        ? brand
                        : string.Empty
            })
            .ToList();
    }


    // Service Settings items that can be offered (active)
    private async Task<List<ServiceItemOptionDto>> ServiceItemsAsync()
    {
        List<ServiceItemOptionDto> items =
            new();

        var scheduled =
            await _context.Set<ScheduledServicesEntity>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && x.InPolicy && x.IsConfigured)
                .OrderBy(x => x.BrandManagementId).ThenBy(x => x.SequenceNo)
                .ToListAsync();

        items.AddRange(
            scheduled.Select(x => new ServiceItemOptionDto
            {
                Kind = "Scheduled",
                Id = x.ScheduledServiceId,
                Code = x.ServiceCode,
                Name = x.ServiceName,
                BrandManagementId = x.BrandManagementId,
                Rate = x.CustomerCharge,
                IsFree = string.Equals(x.ServiceType, "Free", StringComparison.OrdinalIgnoreCase),
                Info = $"{x.ServiceType} · due {x.IntervalDays} days" + (x.IntervalKm > 0 ? $" / {x.IntervalKm:N0} km" : string.Empty)
            }));

        var labor =
            await _context.Set<LaborChartEntity>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.Section).ThenBy(x => x.OperationName)
                .ToListAsync();

        items.AddRange(
            labor.Select(x => new ServiceItemOptionDto
            {
                Kind = "LaborChart",
                Id = x.LaborChartId,
                Code = x.LaborCode,
                Name = string.IsNullOrWhiteSpace(x.ServiceName) ? x.OperationName : x.ServiceName,
                BrandManagementId = x.BrandManagementId,
                Rate = x.ServiceCharge,
                Info = string.Join(" · ", new[] { x.Section, x.AppliesTo }.Where(s => !string.IsNullOrWhiteSpace(s)))
            }));

        var customized =
            await _context.Set<CustomizedServicesEntity>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.ServiceName)
                .ToListAsync();

        items.AddRange(
            customized.Select(x => new ServiceItemOptionDto
            {
                Kind = "Customized",
                Id = x.CustomizedServiceId,
                Code = x.ServiceCode,
                Name = x.ServiceName,
                Rate = x.ServiceCharge,
                Info = "Package · any brand"
            }));

        var membership =
            await _context.Set<MembershipServicesEntity>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.ServiceName)
                .ToListAsync();

        items.AddRange(
            membership.Select(x => new ServiceItemOptionDto
            {
                Kind = "Membership",
                Id = x.MembershipServiceId,
                Code = x.ServiceCode,
                Name = string.IsNullOrWhiteSpace(x.DisplayName) ? x.ServiceName : x.DisplayName,
                Rate = 0,
                IsFree = true,
                Info = "Membership" + (string.IsNullOrWhiteSpace(x.MembershipType) ? string.Empty : $" · {x.MembershipType}")
            }));

        return items;
    }


    public async Task<ServiceEnquiriesDefaultsDto> GetDefaultsAsync
    (
        DateOnly? enquiryDate
    )
    {
        DateOnly date =
            enquiryDate ?? Today();

        bool callNoteRequired =
            await EnquirySwitches.OnAsync(_context, EnquirySwitches.ServiceCallNoteRequired, true);

        return new ServiceEnquiriesDefaultsDto
        {
            CallNoteRequired = callNoteRequired,

            NextEnquiryNo =
                CodeGenerator.GenerateEnquiryNo(EnquiryNoType, date.Year, date.Month, await GetNextSequenceAsync(date.Year, date.Month)),

            Sources = await SetupOptionsAsync("Source"),

            Statuses = (await SetupOptionsAsync("Status")).Where(x => x.Stage != "Won").ToList(),

            FollowUpMethods = await SetupOptionsAsync("FollowUpMethod"),

            LostReasons = await SetupOptionsAsync("LostReason"),

            Models = await ModelOptionsAsync(),

            Executives =
                await _context.Set<UserProfileEntity>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.DisplayName)
                    .Select(x => new EnquiryOptionDto
                    {
                        Id = x.UserProfileId,
                        Code = x.ProfileCode,
                        Name = x.DisplayName != "" ? x.DisplayName : (x.FullName != "" ? x.FullName : x.UserName)
                    })
                    .ToListAsync(),

            Locations =
                await _context.Set<LocationsEntity>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.DisplayName)
                    .Select(x => new EnquiryOptionDto
                    {
                        Id = x.LocationId,
                        Code = x.LocationCode,
                        Name = x.DisplayName
                    })
                    .ToListAsync(),

            ServiceItems = await ServiceItemsAsync()
        };
    }



    //===========================================================
    // PARTS CATALOGUE (spare parts + accessories, MRP, stock)
    //===========================================================

    // Product → last MRP : the Product Price List (price index,
    // stock or not; latest live entry), else the MRP of its newest
    // batch that has one
    private async Task<Dictionary<long, decimal>> PricesAsync
    (
        string productType
    )
    {
        var batches =
            await _context.Set<StockBatchesEntity>().AsNoTracking()
                .Where(x => x.ProductType == productType && x.Mrp > 0m)
                .Select(x => new { x.ProductId, x.StockBatchId, x.Mrp })
                .ToListAsync();

        Dictionary<long, decimal> prices =
            batches
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.StockBatchId).First().Mrp);

        var declared =
            await _context.Set<ProductPriceIndexEntity>().AsNoTracking()
                .Where(x => x.ProductType == productType && !x.IsCancelled && x.Mrp > 0m)
                .Select(x => new { x.ProductId, x.EffectiveDate, x.ProductPriceIndexId, x.Mrp })
                .ToListAsync();

        foreach (var g in declared.GroupBy(x => x.ProductId))
        {
            prices[g.Key] =
                g.OrderByDescending(x => x.EffectiveDate)
                 .ThenByDescending(x => x.ProductPriceIndexId)
                 .First()
                 .Mrp;
        }

        return prices;
    }


    // Product → quantity on hand (all branches)
    private async Task<Dictionary<long, decimal>> OnHandAsync
    (
        string productType
    )
    {
        return await _context.Set<StockMovementsEntity>().AsNoTracking()
            .Where(x => x.ProductType == productType && x.Bucket == "OnHand")
            .GroupBy(x => x.ProductId)
            .Select(g => new { g.Key, Qty = g.Sum(x => x.QuantityIn - x.QuantityOut) })
            .ToDictionaryAsync(x => x.Key, x => x.Qty);
    }


    public async Task<List<PartOptionDto>> GetPartsAsync()
    {
        Dictionary<long, long?> categoryBrand =
            await _context.Set<ProductCategoryEntity>().AsNoTracking()
                .Where(x => !x.IsDeleted)
                .ToDictionaryAsync(x => x.ProductCategoryId, x => x.BrandManagementId);

        Dictionary<long, string> brands =
            await _context.Set<BrandManagementEntity>().AsNoTracking()
                .ToDictionaryAsync(x => x.BrandManagementId, x => x.BrandName);

        var spareParts =
            await _context.Set<SparePartsEntity>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .Select(x => new { Id = x.SparePartId, x.ProductCategoryId, x.ProductCode, x.PartNumber, Name = x.PartName, x.Unit })
                .ToListAsync();

        var accessories =
            await _context.Set<AccessoriesEntity>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .Select(x => new { Id = x.AccessoryId, x.ProductCategoryId, x.ProductCode, x.PartNumber, Name = x.AccessoryName, x.Unit })
                .ToListAsync();

        Dictionary<long, decimal> spPrice = await PricesAsync("SP");
        Dictionary<long, decimal> acPrice = await PricesAsync("AC");
        Dictionary<long, decimal> spStock = await OnHandAsync("SP");
        Dictionary<long, decimal> acStock = await OnHandAsync("AC");

        PartOptionDto Make(string kind, long id, long categoryId, string code, string number, string name, string unit, Dictionary<long, decimal> price, Dictionary<long, decimal> stock)
        {
            long? brandId = categoryBrand.GetValueOrDefault(categoryId);

            return new PartOptionDto
            {
                Kind = kind,
                Id = id,
                Code = code,
                PartNumber = number,
                Name = name,
                Unit = unit,
                BrandManagementId = brandId,
                BrandName = brandId.HasValue ? brands.GetValueOrDefault(brandId.Value, string.Empty) : string.Empty,
                Price = price.TryGetValue(id, out decimal mrp) ? mrp : null,
                OnHand = Math.Max(0, stock.GetValueOrDefault(id))
            };
        }

        return spareParts.Select(x => Make("SparePart", x.Id, x.ProductCategoryId, x.ProductCode, x.PartNumber, x.Name, x.Unit, spPrice, spStock))
            .Concat(accessories.Select(x => Make("Accessory", x.Id, x.ProductCategoryId, x.ProductCode, x.PartNumber, x.Name, x.Unit, acPrice, acStock)))
            .OrderBy(x => x.Name)
            .ThenBy(x => x.PartNumber)
            .ToList();
    }



    //===========================================================
    // ENQUIRER LOOKUP (by mobile) : sales and service history
    //===========================================================

    public async Task<EnquirerLookupDto> LookupEnquirerAsync
    (
        string mobile,
        long excludeEnquiryId
    )
    {
        string digits =
            CleanPhone(mobile);

        if (!IsValidMobile(digits))
        {
            throw new InvalidOperationException("Mobile must be 11 digits starting with 01.");
        }

        EnquirerLookupDto result =
            new() { Mobile = digits };

        EnquiryContactsEntity? contact =
            await Contacts.AsNoTracking().FirstOrDefaultAsync(x => x.Mobile == digits && !x.IsDeleted);

        if (contact != null)
        {
            result.EnquiryContactId = contact.EnquiryContactId;
            result.ContactName = contact.ContactName;
            result.AltPhone = contact.AltPhone;
            result.LocationId = contact.LocationId;
            result.Address = contact.Address;
        }

        CustomerProfilesEntity? customer =
            await _context.Set<CustomerProfilesEntity>().AsNoTracking()
                .Where(x => !x.IsDeleted && (x.Phone1 == digits || x.Phone2 == digits))
                .OrderByDescending(x => x.Phone1 == digits)
                .FirstOrDefaultAsync();

        if (customer != null)
        {
            result.CustomerId = customer.CustomerId;
            result.CustomerCode = customer.CustomerCode;
            result.CustomerName = customer.CustomerName;
        }

        Dictionary<long, EnquirySetupsEntity> setups =
            await Setups.AsNoTracking().ToDictionaryAsync(x => x.EnquirySetupId);

        string StatusName(long statusId) =>
            setups.TryGetValue(statusId, out var s) ? s.Name : string.Empty;

        string StatusStage(long statusId) =>
            setups.TryGetValue(statusId, out var s) ? s.Stage : string.Empty;

        var service =
            await Enquiries.AsNoTracking()
                .Where(x => !x.IsDeleted && x.EnquirerMobile == digits && x.ServiceEnquiryId != excludeEnquiryId)
                .OrderByDescending(x => x.EnquiryDate).ThenByDescending(x => x.ServiceEnquiryId)
                .Take(20)
                .Select(x => new { x.ServiceEnquiryId, x.EnquiryNo, x.EnquiryDate, x.EnquiryType, x.ModelName, x.RegistrationNo, x.StatusId, x.IsConverted })
                .ToListAsync();

        var sales =
            await _context.Set<SalesEnquiriesEntity>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.EnquirerMobile == digits)
                .OrderByDescending(x => x.EnquiryDate).ThenByDescending(x => x.SalesEnquiryId)
                .Take(20)
                .Select(x => new { x.SalesEnquiryId, x.EnquiryNo, x.EnquiryDate, x.ModelName, x.StatusId, x.IsMatured })
                .ToListAsync();

        result.Enquiries =
            service.Select(x => new EnquirerHistoryDto
                {
                    EnquiryType = x.EnquiryType,
                    EnquiryId = x.ServiceEnquiryId,
                    EnquiryNo = x.EnquiryNo,
                    EnquiryDate = x.EnquiryDate,
                    Subject = string.Join(" · ", new[] { x.ModelName, x.RegistrationNo }.Where(s => !string.IsNullOrWhiteSpace(s))),
                    StatusName = x.IsConverted ? "Converted" : StatusName(x.StatusId),
                    StatusStage = x.IsConverted ? "Won" : StatusStage(x.StatusId)
                })
            .Concat(
                sales.Select(x => new EnquirerHistoryDto
                {
                    EnquiryType = "Sales",
                    EnquiryId = x.SalesEnquiryId,
                    EnquiryNo = x.EnquiryNo,
                    EnquiryDate = x.EnquiryDate,
                    Subject = x.ModelName,
                    StatusName = x.IsMatured ? "Matured" : StatusName(x.StatusId),
                    StatusStage = x.IsMatured ? "Won" : StatusStage(x.StatusId)
                }))
            .OrderByDescending(x => x.EnquiryDate)
            .Take(20)
            .ToList();

        return result;
    }



    //===========================================================
    // VALIDATION
    //===========================================================

    private sealed class CleanInput
    {
        public BranchesEntity Branch { get; set; } = null!;

        public EnquirySetupsEntity Status { get; set; } = null!;

        public string EnquiryType { get; set; } = "Service";

        public string ExecutiveName { get; set; } = string.Empty;

        public string Mobile { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string AltPhone { get; set; } = string.Empty;

        public string Address { get; set; } = string.Empty;

        public string ModelName { get; set; } = string.Empty;

        public long? BrandId { get; set; }

        public string BrandName { get; set; } = string.Empty;

        public string RegistrationNo { get; set; } = string.Empty;

        public string ChassisNo { get; set; } = string.Empty;

        public string Complaint { get; set; } = string.Empty;

        public string Slot { get; set; } = string.Empty;

        public string Remarks { get; set; } = string.Empty;

        public long? LostReasonId { get; set; }

        public DateOnly? NextFollowUpDate { get; set; }

        public List<ServiceEnquiryLinesEntity> Lines { get; set; } = new();
    }


    // A setup row of the list; a NEW choice must be active
    private async Task<EnquirySetupsEntity> RequireSetupAsync
    (
        long id,
        string setupType,
        string label,
        long? currentId
    )
    {
        EnquirySetupsEntity? row =
            await Setups.AsNoTracking()
                .FirstOrDefaultAsync(x => x.EnquirySetupId == id && x.SetupType == setupType && !x.IsDeleted);

        if (row == null)
        {
            throw new InvalidOperationException($"Choose a valid {label}.");
        }

        if (!row.IsActive && currentId != id)
        {
            throw new InvalidOperationException($"{label} '{row.Name}' is inactive.");
        }

        return row;
    }


    // Model : a sub category of a Motor Bikes category
    private async Task<(string Name, long? BrandId, string Brand)> RequireModelAsync
    (
        long id,
        long? currentId
    )
    {
        var row =
            await (
                from s in _context.Set<ProductSubCategoryEntity>().AsNoTracking()
                join c in _context.Set<ProductCategoryEntity>().AsNoTracking()
                    on s.ProductCategoryId equals c.ProductCategoryId
                where s.ProductSubCategoryId == id && !s.IsDeleted && !c.IsDeleted && c.CategoryType == "Motor Bikes"
                select new { s.SubCategoryName, SubActive = s.IsActive, CatActive = c.IsActive, c.BrandManagementId })
            .FirstOrDefaultAsync();

        if (row == null)
        {
            throw new InvalidOperationException("Choose a valid Model (a Motor Bikes sub category).");
        }

        if ((!row.SubActive || !row.CatActive) && currentId != id)
        {
            throw new InvalidOperationException($"Model '{row.SubCategoryName}' is inactive.");
        }

        string brand =
            row.BrandManagementId.HasValue
                ? await _context.Set<BrandManagementEntity>().AsNoTracking()
                    .Where(x => x.BrandManagementId == row.BrandManagementId.Value)
                    .Select(x => x.BrandName)
                    .FirstOrDefaultAsync() ?? string.Empty
                : string.Empty;

        return (row.SubCategoryName, row.BrandManagementId, brand);
    }


    // Lines : kinds checked, catalogue names / codes copied
    private async Task<List<ServiceEnquiryLinesEntity>> CleanLinesAsync
    (
        List<ServiceEnquiryLineDto>? lines
    )
    {
        List<ServiceEnquiryLineDto> given =
            (lines ?? new List<ServiceEnquiryLineDto>())
                .Where(x => x != null)
                .ToList();

        if (given.Count > MaxLines)
        {
            throw new InvalidOperationException($"An enquiry can have up to {MaxLines} lines.");
        }

        // One scheduled (free / paid policy) service at a time
        if (given.Count(x => string.Equals(x.LineType, "Service", StringComparison.OrdinalIgnoreCase)
                             && string.Equals(x.ItemKind, "Scheduled", StringComparison.OrdinalIgnoreCase)) > 1)
        {
            throw new InvalidOperationException("Only one scheduled service can be on an enquiry at a time. Remove the other one.");
        }

        List<ServiceItemOptionDto>? serviceItems = null;

        List<ServiceEnquiryLinesEntity> result = new();

        int lineNo = 0;

        foreach (ServiceEnquiryLineDto dto in given)
        {
            lineNo++;

            string type =
                string.Equals(dto.LineType, "Part", StringComparison.OrdinalIgnoreCase) ? "Part" : "Service";

            string[] kinds =
                type == "Part" ? PartKinds : ServiceKinds;

            string kind =
                kinds.FirstOrDefault(x => string.Equals(x, (dto.ItemKind ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
                ?? throw new InvalidOperationException($"Line {lineNo} : unknown item kind '{dto.ItemKind}'.");

            if (dto.Quantity <= 0 || dto.Quantity > 9999)
            {
                throw new InvalidOperationException($"Line {lineNo} : quantity must be from 0.01 to 9,999.");
            }

            if (dto.Rate < 0 || dto.Rate > 99999999.99m)
            {
                throw new InvalidOperationException($"Line {lineNo} : rate must be from 0 to 99,999,999.99.");
            }

            string code = string.Empty;
            string name = Cut(Squeeze(dto.ItemName), 200);
            long? itemId = null;

            if (kind != "Other")
            {
                if (!(dto.ItemId > 0))
                {
                    throw new InvalidOperationException($"Line {lineNo} : choose the item.");
                }

                itemId = dto.ItemId;

                if (type == "Service")
                {
                    serviceItems ??= await ServiceItemsAsync();

                    ServiceItemOptionDto item =
                        serviceItems.FirstOrDefault(x => x.Kind == kind && x.Id == dto.ItemId)
                        ?? throw new InvalidOperationException($"Line {lineNo} : the service was not found or is inactive.");

                    code = item.Code;
                    name = item.Name;
                }
                else if (kind == "SparePart")
                {
                    var part =
                        await _context.Set<SparePartsEntity>().AsNoTracking()
                            .Where(x => x.SparePartId == dto.ItemId && !x.IsDeleted)
                            .Select(x => new { x.ProductCode, x.PartNumber, x.PartName })
                            .FirstOrDefaultAsync()
                        ?? throw new InvalidOperationException($"Line {lineNo} : the spare part was not found.");

                    code = string.IsNullOrWhiteSpace(part.PartNumber) ? part.ProductCode : part.PartNumber;
                    name = part.PartName;
                }
                else
                {
                    var part =
                        await _context.Set<AccessoriesEntity>().AsNoTracking()
                            .Where(x => x.AccessoryId == dto.ItemId && !x.IsDeleted)
                            .Select(x => new { x.ProductCode, x.PartNumber, x.AccessoryName })
                            .FirstOrDefaultAsync()
                        ?? throw new InvalidOperationException($"Line {lineNo} : the accessory was not found.");

                    code = string.IsNullOrWhiteSpace(part.PartNumber) ? part.ProductCode : part.PartNumber;
                    name = part.AccessoryName;
                }
            }
            else if (name.Length == 0)
            {
                throw new InvalidOperationException($"Line {lineNo} : type what is needed.");
            }

            decimal quantity = Math.Round(dto.Quantity, 2);

            decimal rate = Math.Round(dto.Rate, 2);

            result.Add(
                new ServiceEnquiryLinesEntity
                {
                    LineNo = lineNo,
                    LineType = type,
                    ItemKind = kind,
                    ItemId = itemId,
                    ItemCode = Cut(code ?? string.Empty, 50),
                    ItemName = Cut(name, 200),
                    Quantity = quantity,
                    Rate = rate,
                    Amount = Math.Round(quantity * rate, 2),
                    Note = Cut(Squeeze(dto.Note), 200)
                });
        }

        return result;
    }


    private async Task<CleanInput> NormalizeAsync
    (
        CreateServiceEnquiriesDto dto,
        ServiceEnquiriesEntity? current
    )
    {
        CleanInput input = new();

        // Date / type
        if (dto.EnquiryDate == default)
        {
            throw new InvalidOperationException("Enquiry Date is required.");
        }

        if (dto.EnquiryDate > Today())
        {
            throw new InvalidOperationException("Enquiry Date cannot be in the future.");
        }

        input.EnquiryType =
            EnquiryTypes.FirstOrDefault(x => string.Equals(x, (dto.EnquiryType ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("Enquiry Type must be Service or Parts.");

        // Branch
        input.Branch =
            await _context.Set<BranchesEntity>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchId == dto.BranchId && !x.IsDeleted)
            ?? throw new InvalidOperationException("Branch not found. Log in to a branch first.");

        // Enquiry Setup choices
        await RequireSetupAsync(dto.SourceId, "Source", "Source of Enquiry", current?.SourceId);

        input.Status =
            await RequireSetupAsync(dto.StatusId, "Status", "Enquiry Status", current?.StatusId);

        if (input.Status.Stage == "Won")
        {
            throw new InvalidOperationException(
                "A service enquiry closes only when the service is taken or the parts are sold. Choose an Open status, or Suspended.");
        }

        if (dto.FollowUpMethodId > 0)
        {
            await RequireSetupAsync(dto.FollowUpMethodId.Value, "FollowUpMethod", "Follow-up Method", current?.FollowUpMethodId);
        }

        if (input.Status.Stage == "Lost")
        {
            if (!(dto.LostReasonId > 0))
            {
                throw new InvalidOperationException("Suspend Reason is required for a Suspended status.");
            }

            await RequireSetupAsync(dto.LostReasonId!.Value, "LostReason", "Suspend Reason", current?.LostReasonId);

            input.LostReasonId = dto.LostReasonId;

            input.NextFollowUpDate = null;
        }
        else
        {
            input.NextFollowUpDate = dto.NextFollowUpDate;
        }

        // Executive
        UserProfileEntity user =
            await _context.Set<UserProfileEntity>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserProfileId == dto.ExecutiveUserId && !x.IsDeleted)
            ?? throw new InvalidOperationException("Choose the Executive.");

        if (!user.IsActive && current?.ExecutiveUserId != user.UserProfileId)
        {
            throw new InvalidOperationException($"Executive '{user.DisplayName}' is inactive.");
        }

        input.ExecutiveName =
            !string.IsNullOrWhiteSpace(user.DisplayName) ? user.DisplayName.Trim()
            : !string.IsNullOrWhiteSpace(user.FullName) ? user.FullName.Trim()
            : user.UserName;

        // Enquirer
        input.Mobile = CleanPhone(dto.EnquirerMobile);

        if (!IsValidMobile(input.Mobile))
        {
            throw new InvalidOperationException("Enquirer Mobile must be 11 digits starting with 01.");
        }

        input.Name = Squeeze(dto.EnquirerName);

        if (input.Name.Length == 0 || input.Name.Length > 150)
        {
            throw new InvalidOperationException("Enquirer Name is required (up to 150 characters).");
        }

        input.AltPhone = CleanPhone(dto.AltPhone);

        if (input.AltPhone.Length > 0 && !IsValidMobile(input.AltPhone))
        {
            throw new InvalidOperationException("Alternate Phone must be 11 digits starting with 01.");
        }

        if (dto.LocationId > 0
            && !await _context.Set<LocationsEntity>().AsNoTracking().AnyAsync(x => x.LocationId == dto.LocationId && !x.IsDeleted))
        {
            throw new InvalidOperationException("The selected Location was not found.");
        }

        input.Address = (dto.Address ?? string.Empty).Trim();

        if (input.Address.Length > 300)
        {
            throw new InvalidOperationException("Address cannot be longer than 300 characters.");
        }

        // Bike
        if (dto.ModelId > 0)
        {
            (input.ModelName, input.BrandId, input.BrandName) =
                await RequireModelAsync(dto.ModelId.Value, current?.ModelId);
        }
        else if (input.EnquiryType == "Service")
        {
            throw new InvalidOperationException("Choose the bike Model.");
        }

        input.RegistrationNo = CleanPlate(dto.RegistrationNo, 30);

        input.ChassisNo = CleanPlate(dto.ChassisNo, 50);

        if (dto.KmReading < 0 || dto.KmReading > 999999)
        {
            throw new InvalidOperationException("KM Reading must be from 0 to 999,999.");
        }

        // Request
        input.Complaint = (dto.Complaint ?? string.Empty).Trim();

        if (input.Complaint.Length > 500)
        {
            throw new InvalidOperationException("Complaint cannot be longer than 500 characters.");
        }

        input.Slot =
            Slots.FirstOrDefault(x => string.Equals(x, (dto.PreferredSlot ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
            ?? string.Empty;

        if (dto.PreferredDate.HasValue && dto.PreferredDate.Value < dto.EnquiryDate)
        {
            throw new InvalidOperationException("Preferred Date cannot be before the Enquiry Date.");
        }

        if (input.NextFollowUpDate.HasValue && input.NextFollowUpDate.Value < dto.EnquiryDate)
        {
            throw new InvalidOperationException("Next Follow-up Date cannot be before the Enquiry Date.");
        }

        input.Lines = await CleanLinesAsync(dto.Lines);

        if (input.EnquiryType == "Service"
            && !input.Lines.Any(x => x.LineType == "Service")
            && input.Complaint.Length == 0)
        {
            throw new InvalidOperationException("Add the service needed, or describe the complaint.");
        }

        if (input.EnquiryType == "Parts" && !input.Lines.Any(x => x.LineType == "Part"))
        {
            throw new InvalidOperationException("Add at least one part.");
        }

        // Remarks
        input.Remarks = (dto.Remarks ?? string.Empty).Trim();

        if (input.Remarks.Length > 500)
        {
            throw new InvalidOperationException("Remarks cannot be longer than 500 characters.");
        }

        return input;
    }



    //===========================================================
    // ENQUIRER : find or add by mobile, refresh his details
    //===========================================================

    private async Task<EnquiryContactsEntity> SaveContactAsync
    (
        string mobile,
        string name,
        string altPhone,
        string address,
        long? locationId,
        long userId
    )
    {
        EnquiryContactsEntity? contact =
            await Contacts.FirstOrDefaultAsync(x => x.Mobile == mobile && !x.IsDeleted);

        long? location =
            locationId > 0 ? locationId : null;

        if (contact == null)
        {
            contact =
                new EnquiryContactsEntity
                {
                    Mobile = mobile,
                    ContactName = name,
                    AltPhone = altPhone,
                    LocationId = location,
                    Address = address,
                    IsDeleted = false,
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow
                };

            Contacts.Add(contact);

            await _context.SaveChangesAsync();

            return contact;
        }

        contact.ContactName = name;

        if (altPhone.Length > 0) contact.AltPhone = altPhone;

        if (location.HasValue) contact.LocationId = location;

        if (address.Length > 0) contact.Address = address;

        contact.ModifiedBy = userId;

        contact.ModifiedDate = DateTime.UtcNow;

        return contact;
    }



    //===========================================================
    // History
    //===========================================================

    private void AddHistory
    (
        ServiceEnquiriesEntity entity,
        string activityType,
        string title,
        string description,
        long userId,
        string userName = "System"
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = entity.ServiceEnquiryId,
                ActivityType = activityType,
                ActivityTitle = $"Service Enquiry {title}",
                ActivityDescription = Cut(description, 500),
                PerformedBy = userId,
                PerformedByName = userName,
                PerformedDate = DateTime.UtcNow
            });
    }


    private static string Describe(ServiceEnquiriesEntity x, string verb) =>
        $"{x.EnquiryType} enquiry {x.EnquiryNo} ({x.EnquirerName} - {x.EnquirerMobile}{(x.ModelName.Length > 0 ? ", " + x.ModelName : string.Empty)}) {verb}.";


    private static void Apply
    (
        ServiceEnquiriesEntity entity,
        CreateServiceEnquiriesDto dto,
        CleanInput input,
        EnquiryContactsEntity contact
    )
    {
        entity.EnquiryDate = dto.EnquiryDate;
        entity.EnquiryType = input.EnquiryType;
        entity.SourceId = dto.SourceId;
        entity.StatusId = dto.StatusId;
        entity.ExecutiveUserId = dto.ExecutiveUserId;
        entity.ExecutiveName = input.ExecutiveName;

        entity.EnquiryContactId = contact.EnquiryContactId;
        entity.EnquirerMobile = input.Mobile;
        entity.EnquirerName = input.Name;

        entity.ModelId = dto.ModelId > 0 ? dto.ModelId : null;
        entity.ModelName = input.ModelName;
        entity.BrandManagementId = input.BrandId;
        entity.BrandName = input.BrandName;
        entity.RegistrationNo = input.RegistrationNo;
        entity.ChassisNo = input.ChassisNo;
        entity.KmReading = dto.KmReading;

        entity.Complaint = input.Complaint;
        entity.PreferredDate = dto.PreferredDate;
        entity.PreferredSlot = input.Slot;
        entity.PickupDrop = dto.PickupDrop;
        entity.EstimatedTotal = input.Lines.Sum(x => x.Amount);

        entity.NextFollowUpDate = input.NextFollowUpDate;
        entity.FollowUpMethodId = dto.FollowUpMethodId > 0 ? dto.FollowUpMethodId : null;
        entity.LostReasonId = input.LostReasonId;
        entity.Remarks = input.Remarks;

        if (input.Status.Stage == "Lost")
        {
            entity.ClosedDate ??= Today();
        }
        else
        {
            entity.ClosedDate = null;
        }
    }


    // Lines replaced as a whole
    private async Task ReplaceLinesAsync
    (
        long enquiryId,
        List<ServiceEnquiryLinesEntity> lines
    )
    {
        List<ServiceEnquiryLinesEntity> old =
            await Lines.Where(x => x.ServiceEnquiryId == enquiryId).ToListAsync();

        Lines.RemoveRange(old);

        foreach (ServiceEnquiryLinesEntity line in lines)
        {
            line.ServiceEnquiryLineId = 0;

            line.ServiceEnquiryId = enquiryId;

            Lines.Add(line);
        }
    }



    //===========================================================
    // CREATE (number taken here, under a lock for the month)
    //===========================================================

    public async Task<long> CreateAsync
    (
        CreateServiceEnquiriesDto dto,
        long userId
    )
    {
        CleanInput input =
            await NormalizeAsync(dto, null);

        int year = dto.EnquiryDate.Year;

        int month = dto.EnquiryDate.Month;

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await _context.Database.ExecuteSqlRawAsync(
            "SELECT pg_advisory_xact_lock({0}, {1})",
            LockKey,
            year * 100 + month);

        int sequence =
            await GetNextSequenceAsync(year, month);

        EnquiryContactsEntity contact =
            await SaveContactAsync(input.Mobile, input.Name, input.AltPhone, input.Address, dto.LocationId, userId);

        ServiceEnquiriesEntity entity =
            new()
            {
                EnquiryNo = CodeGenerator.GenerateEnquiryNo(EnquiryNoType, year, month, sequence),
                EnquiryYear = year,
                EnquiryMonth = month,
                SequenceNo = sequence,
                BranchId = input.Branch.BranchId,
                BranchName = input.Branch.BranchName,
                LastFollowUpNote = string.Empty,
                ConvertedDocType = string.Empty,
                ConvertedDocNo = string.Empty,
                IsConverted = false,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        Apply(entity, dto, input, contact);

        Enquiries.Add(entity);

        await _context.SaveChangesAsync();

        await ReplaceLinesAsync(entity.ServiceEnquiryId, input.Lines);

        AddHistory(entity, "Create", "Created", Describe(entity, "created"), userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.ServiceEnquiryId;
    }



    //===========================================================
    // UPDATE (number / branch locked; date only inside its month)
    //===========================================================

    public async Task UpdateAsync
    (
        UpdateServiceEnquiriesDto dto,
        long userId
    )
    {
        ServiceEnquiriesEntity entity =
            await Enquiries.FirstOrDefaultAsync(x => x.ServiceEnquiryId == dto.ServiceEnquiryId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Service enquiry not found. It may have been deleted.");

        if (entity.IsConverted)
        {
            throw new InvalidOperationException(
                $"Enquiry {entity.EnquiryNo} is closed by {entity.ConvertedDocType} {entity.ConvertedDocNo} and cannot be changed.");
        }

        if (dto.EnquiryDate.Year != entity.EnquiryYear || dto.EnquiryDate.Month != entity.EnquiryMonth)
        {
            throw new InvalidOperationException(
                $"The Enquiry Date must stay in {entity.EnquiryMonth:D2}-{entity.EnquiryYear} (the month of {entity.EnquiryNo}).");
        }

        // Branch stays as saved
        dto.BranchId = entity.BranchId;

        CleanInput input =
            await NormalizeAsync(dto, entity);

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        EnquiryContactsEntity contact =
            await SaveContactAsync(input.Mobile, input.Name, input.AltPhone, input.Address, dto.LocationId, userId);

        // Next follow-up and method change only by logging a call
        // (the call pop-up); the form shows them read-only
        DateOnly? keptNext = entity.NextFollowUpDate;

        long? keptMethod = entity.FollowUpMethodId;

        Apply(entity, dto, input, contact);

        entity.NextFollowUpDate = input.LostReasonId.HasValue ? null : keptNext;

        entity.FollowUpMethodId = keptMethod;

        entity.ModifiedBy = userId;

        entity.ModifiedDate = DateTime.UtcNow;

        await ReplaceLinesAsync(entity.ServiceEnquiryId, input.Lines);

        await _context.SaveChangesAsync();

        AddHistory(entity, "Update", "Updated", Describe(entity, "updated"), userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }



    //===========================================================
    // DELETE (soft; closed enquiries refused) / RESTORE
    //===========================================================

    public async Task DeleteAsync
    (
        long id,
        long userId
    )
    {
        ServiceEnquiriesEntity entity =
            await Enquiries.FirstOrDefaultAsync(x => x.ServiceEnquiryId == id && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Service enquiry not found. It may have been deleted already.");

        if (entity.IsConverted)
        {
            throw new InvalidOperationException(
                $"Enquiry {entity.EnquiryNo} is closed by {entity.ConvertedDocType} {entity.ConvertedDocNo} and cannot be deleted.");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity, "Delete", "Deleted", Describe(entity, "deleted"), userId);

        await _context.SaveChangesAsync();
    }


    public async Task<bool> RestoreAsync
    (
        long userId
    )
    {
        ServiceEnquiriesEntity? entity =
            await Enquiries.Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .ThenByDescending(x => x.ServiceEnquiryId)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity, "Restore", "Restored", Describe(entity, "restored"), userId);

        await _context.SaveChangesAsync();

        return true;
    }



    //===========================================================
    // PUBLIC WEBSITE : Book a service / Ask for a part
    //
    // New mobile (or no open enquiry of that type) → a new
    //   enquiry : Source Website, default Open status, executive 0
    //   (unassigned), next follow-up the day before the preferred
    //   date (or today), FromWebsite = true.
    // Mobile with an open enquiry of that type → no new number;
    //   the request goes on it as a note (+ its part lines), next
    //   follow-up today.
    //===========================================================

    public async Task<PublicEnquiryResultDto> CreateFromWebsiteAsync
    (
        PublicServiceEnquiryRequestDto dto
    )
    {
        DateOnly today = Today();

        string type =
            EnquiryTypes.FirstOrDefault(x => string.Equals(x, (dto.EnquiryType ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
            ?? "Service";

        string mobile = CleanPhone(dto.Mobile);

        if (!IsValidMobile(mobile))
        {
            throw new InvalidOperationException("Enter your 11-digit mobile number starting with 01.");
        }

        string name = Squeeze(dto.Name);

        if (name.Length < 2 || name.Length > 100)
        {
            throw new InvalidOperationException("Enter your name.");
        }

        BranchesEntity branch =
            await _context.Set<BranchesEntity>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.BranchCode == (dto.BranchCode ?? string.Empty).Trim() && !x.IsDeleted && x.IsActive)
            ?? throw new InvalidOperationException(type == "Service" ? "Choose your preferred service centre." : "Choose a branch.");

        long? locationId =
            await _context.Set<LocationsEntity>().AsNoTracking()
                .Where(x => x.LocationCode == (dto.LocationCode ?? string.Empty).Trim() && !x.IsDeleted && x.IsActive)
                .Select(x => (long?)x.LocationId)
                .FirstOrDefaultAsync();

        if (locationId == null)
        {
            throw new InvalidOperationException("Choose your area.");
        }

        // Bike (model by code; required for a service)
        string modelCode = (dto.ModelCode ?? string.Empty).Trim();

        long? modelId = null;
        string modelName = string.Empty;
        long? brandId = null;
        string brandName = string.Empty;

        if (modelCode.Length > 0)
        {
            var model =
                await (
                    from s in _context.Set<ProductSubCategoryEntity>().AsNoTracking()
                    join c in _context.Set<ProductCategoryEntity>().AsNoTracking()
                        on s.ProductCategoryId equals c.ProductCategoryId
                    where s.SubCategoryCode == modelCode && !s.IsDeleted && s.IsActive && !c.IsDeleted && c.IsActive && c.CategoryType == "Motor Bikes"
                    select new { s.ProductSubCategoryId, s.SubCategoryName, c.BrandManagementId })
                .FirstOrDefaultAsync();

            if (model != null)
            {
                modelId = model.ProductSubCategoryId;
                modelName = model.SubCategoryName;
                brandId = model.BrandManagementId;
                brandName =
                    brandId.HasValue
                        ? await _context.Set<BrandManagementEntity>().AsNoTracking()
                            .Where(x => x.BrandManagementId == brandId.Value)
                            .Select(x => x.BrandName)
                            .FirstOrDefaultAsync() ?? string.Empty
                        : string.Empty;
            }
        }

        if (type == "Service" && modelId == null)
        {
            throw new InvalidOperationException("Choose your bike model.");
        }

        string registration = CleanPlate(dto.RegistrationNo, 30);

        int? km = dto.KmReading is >= 0 and <= 999999 ? dto.KmReading : null;

        string complaint = Cut((dto.Complaint ?? string.Empty).Trim(), 500);

        string slot =
            Slots.FirstOrDefault(x => string.Equals(x, (dto.PreferredSlot ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
            ?? string.Empty;

        DateOnly? preferred = null;

        if (type == "Service")
        {
            if (!dto.PreferredDate.HasValue || dto.PreferredDate.Value < today || dto.PreferredDate.Value > today.AddDays(60))
            {
                throw new InvalidOperationException("Choose a service date (from today, within 60 days).");
            }

            // Time is optional (the website no longer asks for it)
            preferred = dto.PreferredDate;
        }

        // Lines : the service need, or the parts (matched to the
        // catalogue by part number or name when possible)
        List<ServiceEnquiryLinesEntity> lines = new();

        if (type == "Service")
        {
            string need = Cut(Squeeze(dto.ServiceNeed), 60);

            if (need.Length == 0 && complaint.Length == 0)
            {
                throw new InvalidOperationException("Tell us what service the bike needs.");
            }

            if (need.Length > 0)
            {
                lines.Add(new ServiceEnquiryLinesEntity
                {
                    LineType = "Service",
                    ItemKind = "Other",
                    ItemName = need,
                    ItemCode = string.Empty,
                    Quantity = 1,
                    Note = "Asked on the website"
                });
            }
        }
        else
        {
            List<PublicPartRequestDto> asked =
                (dto.Parts ?? new List<PublicPartRequestDto>())
                    .Where(x => !string.IsNullOrWhiteSpace(x?.Name))
                    .Take(10)
                    .ToList();

            if (asked.Count == 0)
            {
                throw new InvalidOperationException("Tell us which part you need.");
            }

            Dictionary<long, decimal> spPrice = await PricesAsync("SP");

            foreach (PublicPartRequestDto part in asked)
            {
                string text = Cut(Squeeze(part.Name), 200);

                string key = text.ToUpperInvariant();

                var match =
                    await _context.Set<SparePartsEntity>().AsNoTracking()
                        .Where(x => !x.IsDeleted && x.IsActive && (x.PartNumber.ToUpper() == key || x.PartName.ToUpper() == key))
                        .Select(x => new { x.SparePartId, x.PartNumber, x.PartName })
                        .FirstOrDefaultAsync();

                decimal qty = Math.Clamp(part.Quantity, 1, 99);

                decimal rate = match != null ? spPrice.GetValueOrDefault(match.SparePartId) : 0;

                lines.Add(new ServiceEnquiryLinesEntity
                {
                    LineType = "Part",
                    ItemKind = match != null ? "SparePart" : "Other",
                    ItemId = match?.SparePartId,
                    ItemCode = Cut(match?.PartNumber ?? string.Empty, 50),
                    ItemName = match?.PartName ?? text,
                    Quantity = qty,
                    Rate = rate,
                    Amount = Math.Round(qty * rate, 2),
                    Note = match != null ? string.Empty : "As typed on the website"
                });
            }
        }

        string asking =
            type == "Service"
                ? $"{string.Join(", ", lines.Select(x => x.ItemName))}{(complaint.Length > 0 ? $" ({complaint})" : string.Empty)}, {preferred:ddd dd-MMM} {slot}{(dto.PickupDrop ? ", pick-up / drop" : string.Empty)}"
                : string.Join(", ", lines.Select(x => $"{x.ItemName} x {x.Quantity:0.##}"));

        // The mobile's open enquiry of this type
        List<EnquirySetupsEntity> setups =
            await Setups.AsNoTracking().Where(x => !x.IsDeleted).ToListAsync();

        HashSet<long> openStatusIds =
            setups.Where(x => x.SetupType == "Status" && x.Stage == "Open").Select(x => x.EnquirySetupId).ToHashSet();

        ServiceEnquiriesEntity? open =
            await Enquiries
                .Where(x => x.EnquirerMobile == mobile && x.EnquiryType == type && !x.IsDeleted && !x.IsConverted && openStatusIds.Contains(x.StatusId))
                .OrderByDescending(x => x.EnquiryDate)
                .ThenByDescending(x => x.ServiceEnquiryId)
                .FirstOrDefaultAsync();

        if (open != null)
        {
            string note = $"[Website {today:dd-MMM-yyyy}] Asked again : {asking}.";

            string remarks = string.IsNullOrWhiteSpace(open.Remarks) ? note : $"{open.Remarks.TrimEnd()} {note}";

            open.Remarks = remarks.Length <= 500 ? remarks : remarks[^500..];

            open.NextFollowUpDate = today;

            if (preferred.HasValue)
            {
                open.PreferredDate = preferred;

                open.PreferredSlot = slot;

                open.PickupDrop = dto.PickupDrop;
            }

            if (type == "Parts")
            {
                int next =
                    await Lines.Where(x => x.ServiceEnquiryId == open.ServiceEnquiryId).Select(x => (int?)x.LineNo).MaxAsync() ?? 0;

                foreach (ServiceEnquiryLinesEntity line in lines.Take(MaxLines - next))
                {
                    line.LineNo = ++next;

                    line.ServiceEnquiryId = open.ServiceEnquiryId;

                    Lines.Add(line);
                }

                open.EstimatedTotal += lines.Sum(x => x.Amount);
            }

            open.ModifiedBy = WebsiteUserId;

            open.ModifiedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            AddHistory(open, "Update", "Website request added", note, WebsiteUserId, "Website");

            await _context.SaveChangesAsync();

            string openBooking =
                type == "Service" && preferred.HasValue
                    ? await TryBookFromWebsiteAsync(open.ServiceEnquiryId, preferred.Value, dto.SlotStart)
                    : string.Empty;

            return new PublicEnquiryResultDto
            {
                EnquiryNo = open.EnquiryNo,
                IsExisting = true,
                Message =
                    WebsiteBookingMessage(openBooking, preferred ?? today, dto.SlotStart, "We already have your request and added this to it. We will call you soon.")
            };
        }

        // New enquiry
        EnquirySetupsEntity source =
            setups.FirstOrDefault(x => x.SetupType == "Source" && x.IsActive && x.Name.ToLower() == "website")
            ?? setups.FirstOrDefault(x => x.SetupType == "Source" && x.IsActive && x.IsDefault)
            ?? setups.FirstOrDefault(x => x.SetupType == "Source" && x.IsActive)
            ?? throw new InvalidOperationException("Online requests are not available right now. Please call us.");

        EnquirySetupsEntity status =
            setups.FirstOrDefault(x => x.SetupType == "Status" && x.Stage == "Open" && x.IsActive && x.IsDefault)
            ?? setups.Where(x => x.SetupType == "Status" && x.Stage == "Open" && x.IsActive).OrderBy(x => x.DisplayOrder).FirstOrDefault()
            ?? throw new InvalidOperationException("Online requests are not available right now. Please call us.");

        EnquirySetupsEntity? method =
            setups.FirstOrDefault(x => x.SetupType == "FollowUpMethod" && x.IsActive && x.IsDefault);

        DateOnly followUp =
            preferred.HasValue && preferred.Value.AddDays(-1) > today ? preferred.Value.AddDays(-1) : today;

        int year = today.Year;

        int month = today.Month;

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await _context.Database.ExecuteSqlRawAsync(
            "SELECT pg_advisory_xact_lock({0}, {1})",
            LockKey,
            year * 100 + month);

        int sequence =
            await GetNextSequenceAsync(year, month);

        EnquiryContactsEntity contact =
            await SaveContactAsync(mobile, name, string.Empty, string.Empty, locationId, WebsiteUserId);

        ServiceEnquiriesEntity entity =
            new()
            {
                EnquiryNo = CodeGenerator.GenerateEnquiryNo(EnquiryNoType, year, month, sequence),
                EnquiryYear = year,
                EnquiryMonth = month,
                SequenceNo = sequence,
                EnquiryDate = today,
                BranchId = branch.BranchId,
                BranchName = branch.BranchName,
                EnquiryType = type,
                SourceId = source.EnquirySetupId,
                StatusId = status.EnquirySetupId,
                ExecutiveUserId = 0,
                ExecutiveName = string.Empty,
                EnquiryContactId = contact.EnquiryContactId,
                EnquirerMobile = mobile,
                EnquirerName = name,
                ModelId = modelId,
                ModelName = modelName,
                BrandManagementId = brandId,
                BrandName = brandName,
                RegistrationNo = registration,
                ChassisNo = string.Empty,
                KmReading = km,
                Complaint = complaint,
                PreferredDate = preferred,
                PreferredSlot = slot,
                PickupDrop = type == "Service" && dto.PickupDrop,
                EstimatedTotal = lines.Sum(x => x.Amount),
                NextFollowUpDate = followUp,
                FollowUpMethodId = method?.EnquirySetupId,
                LastFollowUpNote = string.Empty,
                Remarks = "Sent from the website.",
                FromWebsite = true,
                ConvertedDocType = string.Empty,
                ConvertedDocNo = string.Empty,
                CreatedBy = WebsiteUserId,
                CreatedDate = DateTime.UtcNow
            };

        Enquiries.Add(entity);

        await _context.SaveChangesAsync();

        int lineNo = 0;

        foreach (ServiceEnquiryLinesEntity line in lines)
        {
            line.LineNo = ++lineNo;

            line.ServiceEnquiryId = entity.ServiceEnquiryId;

            Lines.Add(line);
        }

        AddHistory(entity, "Create", "Received from the website", Describe(entity, "received from the website") + " " + asking, WebsiteUserId, "Website");

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        await transaction.DisposeAsync();

        string booking =
            type == "Service" && preferred.HasValue
                ? await TryBookFromWebsiteAsync(entity.ServiceEnquiryId, preferred.Value, dto.SlotStart)
                : string.Empty;

        return new PublicEnquiryResultDto
        {
            EnquiryNo = entity.EnquiryNo,
            IsExisting = false,
            Message =
                type == "Service"
                    ? WebsiteBookingMessage(booking, preferred ?? today, dto.SlotStart, "Thank you! We will call you to confirm your service booking.")
                    : "Thank you! We will check the part and call you soon."
        };
    }
}
