//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Application.Public.Website;
using AppCore.Domain.Common;
using AppCore.Infrastructure.CodeMaster;
using AppCore.Infrastructure.Persistence;
using SalesEnquiriesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.SalesEnquiries;
using EnquiryContactsEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.EnquiryContacts;
using EnquirySetupsEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.EnquirySetups;
using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;
using WingsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Wings;
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


//===============================================================
// Namespace (as registered by Code Synchronization)
//===============================================================

namespace AppCore.Infrastructure.Configurations.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Sales Enquiries Repository
//
// Number  : ENQ-SAL-MM-YYYY-nnnnn from CodeGenerator.GenerateEnquiryNo;
//           one series per calendar month for all branches, taken
//           on the first save under an advisory lock; deleted rows
//           keep their number. The date can change only inside the
//           same month after saving.
// Enquirer: found / added in EnquiryContacts by mobile (11 digits,
//           starts 01); his details are refreshed from the enquiry.
// Status  : an Enquiry Setup status of the Open or Lost stage. Won
//           only comes from a sale (maturity). Lost needs a lost
//           reason and clears the next follow-up.
// Model   : a sub category of a Motor Bikes category (no colour);
//           optional second model, not the same one.
// Interest: an open enquiry with an Expected Purchase Date takes
//           the interest level whose days range (Enquiry Setup)
//           holds the days left to that date — on save, and again
//           on every read, so it heats up as the date comes near.
//           Without a date (or no matching range) it stays as
//           chosen.
// Matured : read-only; cannot be updated or deleted.
//===============================================================

public partial class SalesEnquiriesRepository
    : ISalesEnquiriesRepository
{
    private const string HistoryModule = "Enquiry Management";

    private const string HistoryEntity = "SalesEnquiries";

    private const string EnquiryType = "SAL";

    // pg_advisory_xact_lock(LockKey, yyyymm)
    private const int LockKey = 4501;

    private static readonly string[] PaymentModes = { "Cash", "EMI", "Exchange" };

    private static readonly string[] EnquiryForValues = { "Self", "Referrer" };


    private readonly AppDbContext _context;


    public SalesEnquiriesRepository(
        AppDbContext context)
    {
        _context = context;
    }


    private DbSet<SalesEnquiriesEntity> Enquiries =>
        _context.Set<SalesEnquiriesEntity>();

    private DbSet<EnquiryContactsEntity> Contacts =>
        _context.Set<EnquiryContactsEntity>();

    private DbSet<EnquirySetupsEntity> Setups =>
        _context.Set<EnquirySetupsEntity>();



    //===========================================================
    // READ
    //===========================================================

    private sealed record Lookups
    (
        Dictionary<long, EnquirySetupsEntity> Setups,
        Dictionary<long, EnquiryContactsEntity> Contacts,
        Dictionary<long, string> Locations,
        List<EnquirySetupsEntity> InterestRules,
        DateOnly Today
    );



    //===========================================================
    // INTEREST BY DAYS TO PURCHASE
    //===========================================================

    // Active, live interest levels that carry a days range
    private static List<EnquirySetupsEntity> InterestRulesOf
    (
        IEnumerable<EnquirySetupsEntity> setups
    )
    {
        return setups
            .Where(
                x =>
                    x.SetupType == "InterestLevel"
                    &&
                    !x.IsDeleted
                    &&
                    x.IsActive
                    &&
                    x.DaysFrom != null)
            .OrderBy(x => x.DaysFrom)
            .ToList();
    }


    // Days left to the date (0 when due or past)
    private static int DaysLeft
    (
        DateOnly expected,
        DateOnly today
    )
    {
        return Math.Max(0, expected.DayNumber - today.DayNumber);
    }


    private static EnquirySetupsEntity? MatchInterest
    (
        List<EnquirySetupsEntity> rules,
        int days
    )
    {
        return rules.FirstOrDefault(
            x =>
                days >= x.DaysFrom!.Value
                &&
                (x.DaysTo == null || days <= x.DaysTo.Value));
    }


    private static DateOnly Today() =>
        DateOnly.FromDateTime(DateTime.Now);


    private async Task<Lookups> LoadLookupsAsync
    (
        List<SalesEnquiriesEntity> rows
    )
    {
        // Setup rows, deleted ones too (an old enquiry keeps its name)
        Dictionary<long, EnquirySetupsEntity> setups =
            await Setups
                .AsNoTracking()
                .ToDictionaryAsync(x => x.EnquirySetupId);

        List<long> contactIds =
            rows.Select(x => x.EnquiryContactId).Distinct().ToList();

        Dictionary<long, EnquiryContactsEntity> contacts =
            await Contacts
                .AsNoTracking()
                .Where(x => contactIds.Contains(x.EnquiryContactId))
                .ToDictionaryAsync(x => x.EnquiryContactId);

        List<long> locationIds =
            contacts.Values
                .Where(x => x.LocationId.HasValue)
                .Select(x => x.LocationId!.Value)
                .Distinct()
                .ToList();

        Dictionary<long, string> locations =
            await _context.Set<LocationsEntity>()
                .AsNoTracking()
                .Where(x => locationIds.Contains(x.LocationId))
                .ToDictionaryAsync(x => x.LocationId, x => x.DisplayName);

        // Switch : interest level by days (OFF : as chosen)
        bool auto =
            await EnquirySwitches.OnAsync(_context, EnquirySwitches.AutoInterest, true);

        return new Lookups(
            setups,
            contacts,
            locations,
            auto ? InterestRulesOf(setups.Values) : new List<EnquirySetupsEntity>(),
            Today());
    }


    private static SalesEnquiriesDto ToDto
    (
        SalesEnquiriesEntity x,
        Lookups lookups
    )
    {
        EnquirySetupsEntity? Setup(long? id) =>
            id.HasValue && lookups.Setups.TryGetValue(id.Value, out var row)
                ? row
                : null;

        EnquirySetupsEntity? status = Setup(x.StatusId);

        EnquirySetupsEntity? interest = Setup(x.InterestLevelId);

        // Open enquiry with a purchase date : the level of the days left
        bool isOpen =
            !x.IsMatured
            &&
            status?.Stage == "Open";

        int? daysLeft =
            isOpen && x.ExpectedPurchaseDate.HasValue
                ? DaysLeft(x.ExpectedPurchaseDate.Value, lookups.Today)
                : null;

        EnquirySetupsEntity? auto =
            daysLeft.HasValue
                ? MatchInterest(lookups.InterestRules, daysLeft.Value)
                : null;

        if
        (
            auto != null
        )
        {
            interest = auto;
        }

        lookups.Contacts.TryGetValue(x.EnquiryContactId, out var contact);

        string locationName =
            contact?.LocationId != null
            && lookups.Locations.TryGetValue(contact.LocationId.Value, out var location)
                ? location
                : string.Empty;

        return new SalesEnquiriesDto
        {
            SalesEnquiryId = x.SalesEnquiryId,
            PublicId = x.PublicId,
            EnquiryNo = x.EnquiryNo,

            EnquiryDate = x.EnquiryDate,
            BranchId = x.BranchId,
            BranchName = x.BranchName,
            SourceId = x.SourceId,
            SourceName = Setup(x.SourceId)?.Name ?? string.Empty,
            StatusId = x.StatusId,
            StatusName = status?.Name ?? string.Empty,
            StatusColor = status?.ColorCode ?? string.Empty,
            StatusStage = status?.Stage ?? string.Empty,
            InterestLevelId = interest?.EnquirySetupId ?? x.InterestLevelId,
            InterestLevelName = interest?.Name ?? string.Empty,
            InterestLevelColor = interest?.ColorCode ?? string.Empty,
            InterestAuto = auto != null,
            DaysToPurchase = daysLeft,
            ExecutiveUserId = x.ExecutiveUserId,
            ExecutiveName = x.ExecutiveName,

            EnquiryContactId = x.EnquiryContactId,
            EnquirerMobile = x.EnquirerMobile,
            EnquirerName = x.EnquirerName,
            AltPhone = contact?.AltPhone ?? string.Empty,
            LocationId = contact?.LocationId,
            LocationName = locationName,
            Address = contact?.Address ?? string.Empty,
            EnquiryFor = x.EnquiryFor,

            ModelId = x.ModelId,
            ModelName = x.ModelName,
            BrandName = x.BrandName,
            SecondModelId = x.SecondModelId,
            SecondModelName = x.SecondModelName,
            Quantity = x.Quantity,
            Budget = x.Budget,
            PaymentMode = x.PaymentMode,
            ExchangeBike = x.ExchangeBike,
            ExpectedPurchaseDate = x.ExpectedPurchaseDate,
            PreferredColor = x.PreferredColor,
            FromWebsite = x.FromWebsite,
            TestRideDate = x.TestRideDate,
            TestRideSlot = x.TestRideSlot,

            NextFollowUpDate = x.NextFollowUpDate,
            FollowUpMethodId = x.FollowUpMethodId,
            FollowUpMethodName = Setup(x.FollowUpMethodId)?.Name ?? string.Empty,
            LastFollowUpDate = x.LastFollowUpDate,
            LastFollowUpNote = x.LastFollowUpNote,
            LostReasonId = x.LostReasonId,
            LostReasonName = Setup(x.LostReasonId)?.Name ?? string.Empty,
            ClosedDate = x.ClosedDate,
            Remarks = x.Remarks,

            IsMatured = x.IsMatured,
            MaturedDate = x.MaturedDate,
            SaleNo = x.SaleNo,
            CustomerId = x.CustomerId,
            CustomerName = x.CustomerName,
            MaturityDays =
                x.IsMatured && x.MaturedDate.HasValue
                    ? x.MaturedDate.Value.DayNumber - x.EnquiryDate.DayNumber
                    : null,

            CreatedDate = x.CreatedDate,
            ModifiedDate = x.ModifiedDate
        };
    }


    public async Task<List<SalesEnquiriesDto>>
        GetAllAsync()
    {
        List<SalesEnquiriesEntity> rows =
            await Enquiries
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.EnquiryDate)
                .ThenByDescending(x => x.SalesEnquiryId)
                .ToListAsync();

        Lookups lookups =
            await LoadLookupsAsync(rows);

        return rows
            .Select(x => ToDto(x, lookups))
            .ToList();
    }


    public async Task<SalesEnquiriesDto?>
        GetByIdAsync
        (
            long id
        )
    {
        SalesEnquiriesEntity? row =
            await Enquiries
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x =>
                        x.SalesEnquiryId == id
                        &&
                        !x.IsDeleted);

        if
        (
            row == null
        )
        {
            return null;
        }

        Lookups lookups =
            await LoadLookupsAsync(new List<SalesEnquiriesEntity> { row });

        return ToDto(row, lookups);
    }



    //===========================================================
    // LIST PAGE (server paging)
    //
    // The rows are built as for the full list (stage, interest by
    // days left), then filtered, counted, sorted and paged.
    //===========================================================

    private static bool IsOpenRow(SalesEnquiriesDto x) =>
        !x.IsMatured && x.StatusStage != "Lost";


    private static bool IsWebsiteNew(SalesEnquiriesDto x) =>
        x.FromWebsite && !(x.ExecutiveUserId > 0) && IsOpenRow(x);


    private static bool InTab
    (
        SalesEnquiriesDto x,
        string tab,
        DateOnly today
    )
    {
        bool open = IsOpenRow(x);

        return tab switch
        {
            "website" => IsWebsiteNew(x),
            "open" => open,

            // Due : follow-up today
            "due" => open && x.NextFollowUpDate.HasValue && x.NextFollowUpDate.Value == today,

            // Lapsed : follow-up date passed, no call logged
            "lapsed" => open && x.NextFollowUpDate.HasValue && x.NextFollowUpDate.Value < today,

            "matured" => x.IsMatured,
            "lost" => !x.IsMatured && x.StatusStage == "Lost",
            _ => true
        };
    }


    private static string InterestKey(SalesEnquiriesDto x) =>
        x.InterestLevelId.HasValue && x.InterestLevelId.Value > 0
            ? x.InterestLevelId.Value.ToString()
            : "none";


    // The text the list shows in Status
    private static string StatusText(SalesEnquiriesDto x) =>
        x.IsMatured
            ? "Matured" + (string.IsNullOrEmpty(x.SaleNo) ? string.Empty : " " + x.SaleNo)
            : x.StatusName;


    private static readonly Dictionary<string, Func<SalesEnquiriesDto, object?>> SortKeys =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["EnquiryNo"] = x => x.EnquiryNo,
            ["EnquiryDate"] = x => x.EnquiryDate,
            ["DateText"] = x => x.EnquiryDate,
            ["EnquirerText"] = x => x.EnquirerName,
            ["ModelColourText"] = x => x.ModelName,
            ["ModelText"] = x => x.ModelName,
            ["ExecutiveText"] = x => x.ExecutiveUserId > 0 ? x.ExecutiveName : "Unassigned",
            ["InterestText"] = x => x.InterestLevelName,
            ["StatusText"] = x => StatusText(x),
            ["NextFollowUpDate"] = x => x.NextFollowUpDate,
            ["NextFollowUpText"] = x => x.NextFollowUpDate
        };


    public async Task<SalesEnquiryPagedResult>
        GetPagedAsync
        (
            SalesEnquiryPageRequest request
        )
    {
        List<SalesEnquiriesDto> all =
            await GetAllAsync();

        DateOnly today = Today();

        string tab = (request.Tab ?? "all").Trim().ToLowerInvariant();

        string interest = (request.Interest ?? "all").Trim().ToLowerInvariant();

        string[] words = EnquiryListQuery.Words(request);

        // Search
        List<SalesEnquiriesDto> found =
            all
                .Where(
                    x =>
                        EnquiryListQuery.Matches(
                            words,
                            x.EnquiryNo,
                            EnquiryListQuery.DateText(x.EnquiryDate),
                            x.EnquirerName,
                            x.EnquirerMobile,
                            x.ModelName,
                            x.SecondModelName,
                            x.BrandName,
                            x.ExecutiveUserId > 0 ? x.ExecutiveName : "Unassigned",
                            x.PreferredColor,
                            x.SourceName,
                            StatusText(x),
                            x.InterestLevelName,
                            x.PaymentMode,
                            x.LocationName,
                            x.BranchName,
                            x.Remarks))
                .ToList();

        // Tab + interest
        List<SalesEnquiriesDto> inView =
            found.Where(x => InTab(x, tab, today)).ToList();

        List<SalesEnquiriesDto> rows =
            interest == "all"
                ? inView
                : inView.Where(x => InterestKey(x) == interest).ToList();

        // Default order : newest first (Due / Lapsed : oldest
        // follow-up first), then the asked column
        if
        (
            tab == "due"
            ||
            tab == "lapsed"
        )
        {
            rows = rows.OrderBy(x => x.NextFollowUpDate).ToList();
        }

        rows = EnquiryListQuery.Sort(rows, request, SortKeys);

        SalesEnquiryPagedResult result = new()
        {
            TotalCount = rows.Count,
            Items = EnquiryListQuery.Page(rows, request),
            Page = request.SafePage,
            PageSize = request.SafePageSize,
            WebsiteCount = all.Count(IsWebsiteNew),
            Ids = rows.Select(x => x.SalesEnquiryId).ToList(),
            Interests =
                inView
                    .GroupBy(InterestKey)
                    .Select(
                        g =>
                            new EnquiryChipCountDto
                            {
                                Key = g.Key,
                                Name = g.First().InterestLevelName,
                                Color = g.First().InterestLevelColor,
                                Count = g.Count()
                            })
                    .ToList()
        };

        result.Counts["All"] = found.Count;
        result.Counts["Open"] = found.Count(x => InTab(x, "open", today));
        result.Counts["Due"] = found.Count(x => InTab(x, "due", today));
        result.Counts["Lapsed"] = found.Count(x => InTab(x, "lapsed", today));
        result.Counts["Matured"] = found.Count(x => InTab(x, "matured", today));
        result.Counts["Suspended"] = found.Count(x => InTab(x, "lost", today));

        return result;
    }


    public async Task<long?>
        GetIdByPublicIdAsync
        (
            Guid publicId
        )
    {
        return await Enquiries
            .AsNoTracking()
            .Where(
                x =>
                    x.PublicId == publicId
                    &&
                    !x.IsDeleted)
            .Select(x => (long?)x.SalesEnquiryId)
            .FirstOrDefaultAsync();
    }



    //===========================================================
    // NUMBER
    //===========================================================

    private async Task<int>
        GetNextSequenceAsync
        (
            int year,
            int month
        )
    {
        int highest =
            await Enquiries
                .AsNoTracking()
                .Where(
                    x =>
                        x.EnquiryYear == year
                        &&
                        x.EnquiryMonth == month)
                .Select(x => (int?)x.SequenceNo)
                .MaxAsync()
            ?? 0;

        return highest + 1;
    }



    //===========================================================
    // DEFAULTS (number preview + every dropdown)
    //===========================================================

    private async Task<List<EnquiryOptionDto>>
        SetupOptionsAsync
        (
            string setupType
        )
    {
        return await Setups
            .AsNoTracking()
            .Where(
                x =>
                    x.SetupType == setupType
                    &&
                    !x.IsDeleted
                    &&
                    x.IsActive)
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.Code)
            .Select(
                x =>
                    new EnquiryOptionDto
                    {
                        Id = x.EnquirySetupId,
                        Code = x.Code,
                        Name = x.Name,
                        ColorCode = x.ColorCode,
                        Stage = x.Stage,
                        DaysFrom = x.DaysFrom,
                        DaysTo = x.DaysTo,
                        IsDefault = x.IsDefault,
                        IsSystem = x.IsSystem
                    })
            .ToListAsync();
    }


    private async Task<Dictionary<long, string>>
        BrandNamesAsync()
    {
        return await _context.Set<BrandManagementEntity>()
            .AsNoTracking()
            .ToDictionaryAsync(x => x.BrandManagementId, x => x.BrandName);
    }


    public async Task<SalesEnquiriesDefaultsDto>
        GetDefaultsAsync
        (
            DateOnly? enquiryDate
        )
    {
        DateOnly date =
            enquiryDate ?? DateOnly.FromDateTime(DateTime.Now);

        Dictionary<long, string> brands =
            await BrandNamesAsync();

        var models =
            await (
                from s in _context.Set<ProductSubCategoryEntity>().AsNoTracking()
                join c in _context.Set<ProductCategoryEntity>().AsNoTracking()
                    on s.ProductCategoryId equals c.ProductCategoryId
                where !s.IsDeleted
                      && s.IsActive
                      && !c.IsDeleted
                      && c.IsActive
                      && c.CategoryType == "Motor Bikes"
                orderby s.SubCategoryName
                select new
                {
                    s.ProductSubCategoryId,
                    s.SubCategoryCode,
                    s.SubCategoryName,
                    c.BrandManagementId
                })
            .ToListAsync();

        bool purchaseDateRequired =
            await EnquirySwitches.OnAsync(_context, EnquirySwitches.PurchaseDateRequired, true);

        bool autoInterest =
            await EnquirySwitches.OnAsync(_context, EnquirySwitches.AutoInterest, true);

        bool callNoteRequired =
            await EnquirySwitches.OnAsync(_context, EnquirySwitches.SalesCallNoteRequired, true);

        return new SalesEnquiriesDefaultsDto
        {
            PurchaseDateRequired = purchaseDateRequired,

            AutoInterest = autoInterest,

            CallNoteRequired = callNoteRequired,

            NextEnquiryNo =
                CodeGenerator.GenerateEnquiryNo(
                    EnquiryType,
                    date.Year,
                    date.Month,
                    await GetNextSequenceAsync(date.Year, date.Month)),

            Sources = await SetupOptionsAsync("Source"),

            Statuses =
                (await SetupOptionsAsync("Status"))
                    .Where(x => x.Stage != "Won")
                    .ToList(),

            InterestLevels = await SetupOptionsAsync("InterestLevel"),

            FollowUpMethods = await SetupOptionsAsync("FollowUpMethod"),

            LostReasons = await SetupOptionsAsync("LostReason"),

            Models =
                models
                    .Select(
                        x =>
                            new EnquiryModelOptionDto
                            {
                                Id = x.ProductSubCategoryId,
                                Code = x.SubCategoryCode,
                                Name = x.SubCategoryName,
                                BrandManagementId = x.BrandManagementId,
                                BrandName =
                                    x.BrandManagementId.HasValue
                                    && brands.TryGetValue(x.BrandManagementId.Value, out var brand)
                                        ? brand
                                        : string.Empty
                            })
                    .ToList(),

            Executives =
                await _context.Set<UserProfileEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.DisplayName)
                    .Select(
                        x =>
                            new EnquiryOptionDto
                            {
                                Id = x.UserProfileId,
                                Code = x.ProfileCode,
                                Name =
                                    x.DisplayName != ""
                                        ? x.DisplayName
                                        : (x.FullName != "" ? x.FullName : x.UserName)
                            })
                    .ToListAsync(),

            Locations =
                await _context.Set<LocationsEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.DisplayName)
                    .Select(
                        x =>
                            new EnquiryOptionDto
                            {
                                Id = x.LocationId,
                                Code = x.LocationCode,
                                Name = x.DisplayName
                            })
                    .ToListAsync()
        };
    }



    //===========================================================
    // ENQUIRER LOOKUP (by mobile)
    //===========================================================

    private static string CleanPhone
    (
        string? value
    )
    {
        return new string(
            (value ?? string.Empty)
                .Where(char.IsDigit)
                .ToArray());
    }


    private static bool IsValidMobile
    (
        string digits
    )
    {
        return digits.Length == 11
            &&
            digits.StartsWith("01");
    }


    public async Task<EnquirerLookupDto>
        LookupEnquirerAsync
        (
            string mobile,
            long excludeEnquiryId
        )
    {
        string digits =
            CleanPhone(mobile);

        if
        (
            !IsValidMobile(digits)
        )
        {
            throw new InvalidOperationException(
                "Mobile must be 11 digits starting with 01.");
        }

        EnquirerLookupDto result =
            new()
            {
                Mobile = digits
            };

        EnquiryContactsEntity? contact =
            await Contacts
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x =>
                        x.Mobile == digits
                        &&
                        !x.IsDeleted);

        if
        (
            contact != null
        )
        {
            result.EnquiryContactId = contact.EnquiryContactId;
            result.ContactName = contact.ContactName;
            result.AltPhone = contact.AltPhone;
            result.LocationId = contact.LocationId;
            result.Address = contact.Address;
        }

        CustomerProfilesEntity? customer =
            await _context.Set<CustomerProfilesEntity>()
                .AsNoTracking()
                .Where(
                    x =>
                        !x.IsDeleted
                        &&
                        (x.Phone1 == digits || x.Phone2 == digits))
                .OrderByDescending(x => x.Phone1 == digits)
                .FirstOrDefaultAsync();

        if
        (
            customer != null
        )
        {
            result.CustomerId = customer.CustomerId;
            result.CustomerCode = customer.CustomerCode;
            result.CustomerName = customer.CustomerName;
        }

        Dictionary<long, EnquirySetupsEntity> setups =
            await Setups
                .AsNoTracking()
                .ToDictionaryAsync(x => x.EnquirySetupId);

        var sales =
            await Enquiries
                .AsNoTracking()
                .Where(
                    x =>
                        !x.IsDeleted
                        &&
                        x.EnquirerMobile == digits
                        &&
                        x.SalesEnquiryId != excludeEnquiryId)
                .OrderByDescending(x => x.EnquiryDate)
                .ThenByDescending(x => x.SalesEnquiryId)
                .Take(20)
                .Select(
                    x =>
                        new
                        {
                            x.SalesEnquiryId,
                            x.EnquiryNo,
                            x.EnquiryDate,
                            x.ModelName,
                            x.StatusId,
                            x.IsMatured
                        })
                .ToListAsync();

        // Service Enquiries join this list when that page is built
        result.Enquiries =
            sales
                .Select(
                    x =>
                    {
                        setups.TryGetValue(x.StatusId, out var status);

                        return new EnquirerHistoryDto
                        {
                            EnquiryType = "Sales",
                            EnquiryId = x.SalesEnquiryId,
                            EnquiryNo = x.EnquiryNo,
                            EnquiryDate = x.EnquiryDate,
                            Subject = x.ModelName,
                            StatusName =
                                x.IsMatured
                                    ? "Matured"
                                    : status?.Name ?? string.Empty,
                            StatusStage =
                                x.IsMatured
                                    ? "Won"
                                    : status?.Stage ?? string.Empty
                        };
                    })
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

        public string ExecutiveName { get; set; } = string.Empty;

        public string Mobile { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string AltPhone { get; set; } = string.Empty;

        public string Address { get; set; } = string.Empty;

        public string EnquiryFor { get; set; } = "Self";

        public string ModelName { get; set; } = string.Empty;

        public string BrandName { get; set; } = string.Empty;

        public string SecondModelName { get; set; } = string.Empty;

        public string PaymentMode { get; set; } = "Cash";

        public string ExchangeBike { get; set; } = string.Empty;

        public string Remarks { get; set; } = string.Empty;

        public long? LostReasonId { get; set; }

        public DateOnly? NextFollowUpDate { get; set; }
    }


    private static string Squeeze
    (
        string? value
    )
    {
        return string.Join(
            " ",
            (value ?? string.Empty)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }


    // A setup row of the list; a NEW choice must be active
    private async Task<EnquirySetupsEntity>
        RequireSetupAsync
        (
            long id,
            string setupType,
            string label,
            long? currentId
        )
    {
        EnquirySetupsEntity? row =
            await Setups
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x =>
                        x.EnquirySetupId == id
                        &&
                        x.SetupType == setupType
                        &&
                        !x.IsDeleted);

        if
        (
            row == null
        )
        {
            throw new InvalidOperationException(
                $"Choose a valid {label}.");
        }

        if
        (
            !row.IsActive
            &&
            currentId != id
        )
        {
            throw new InvalidOperationException(
                $"{label} '{row.Name}' is inactive.");
        }

        return row;
    }


    private async Task<(string Name, string Brand)>
        RequireModelAsync
        (
            long id,
            string label,
            long? currentId
        )
    {
        // A sub category of a Motor Bikes category (no colour)
        var row =
            await (
                from s in _context.Set<ProductSubCategoryEntity>().AsNoTracking()
                join c in _context.Set<ProductCategoryEntity>().AsNoTracking()
                    on s.ProductCategoryId equals c.ProductCategoryId
                where s.ProductSubCategoryId == id
                      && !s.IsDeleted
                      && !c.IsDeleted
                      && c.CategoryType == "Motor Bikes"
                select new
                {
                    s.SubCategoryName,
                    SubActive = s.IsActive,
                    CatActive = c.IsActive,
                    c.BrandManagementId
                })
            .FirstOrDefaultAsync();

        if
        (
            row == null
        )
        {
            throw new InvalidOperationException(
                $"Choose a valid {label} (a Motor Bikes sub category).");
        }

        if
        (
            (!row.SubActive || !row.CatActive)
            &&
            currentId != id
        )
        {
            throw new InvalidOperationException(
                $"{label} '{row.SubCategoryName}' is inactive.");
        }

        string brand =
            row.BrandManagementId.HasValue
                ? await _context.Set<BrandManagementEntity>()
                    .AsNoTracking()
                    .Where(x => x.BrandManagementId == row.BrandManagementId.Value)
                    .Select(x => x.BrandName)
                    .FirstOrDefaultAsync()
                  ?? string.Empty
                : string.Empty;

        return (row.SubCategoryName, brand);
    }


    private async Task<CleanInput>
        NormalizeAsync
        (
            CreateSalesEnquiriesDto dto,
            SalesEnquiriesEntity? current
        )
    {
        CleanInput input =
            new();


        // Date
        if
        (
            dto.EnquiryDate == default
        )
        {
            throw new InvalidOperationException(
                "Enquiry Date is required.");
        }

        if
        (
            dto.EnquiryDate > DateOnly.FromDateTime(DateTime.Now)
        )
        {
            throw new InvalidOperationException(
                "Enquiry Date cannot be in the future.");
        }


        // Branch
        BranchesEntity? branch =
            await _context.Set<BranchesEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x =>
                        x.BranchId == dto.BranchId
                        &&
                        !x.IsDeleted);

        if
        (
            branch == null
        )
        {
            throw new InvalidOperationException(
                "Branch not found. Log in to a branch first.");
        }

        input.Branch = branch;


        // Enquiry Setup choices
        await RequireSetupAsync(dto.SourceId, "Source", "Source of Enquiry", current?.SourceId);

        input.Status =
            await RequireSetupAsync(dto.StatusId, "Status", "Enquiry Status", current?.StatusId);

        if
        (
            input.Status.Stage == "Won"
        )
        {
            throw new InvalidOperationException(
                "An enquiry becomes Won only through its sale. Choose an Open status, or Suspended.");
        }

        // Interest Level : required (user, 2026-11-03)
        if
        (
            !dto.InterestLevelId.HasValue
            ||
            dto.InterestLevelId.Value <= 0
        )
        {
            throw new InvalidOperationException(
                "Choose the Interest Level.");
        }

        await RequireSetupAsync(dto.InterestLevelId.Value, "InterestLevel", "Interest Level", current?.InterestLevelId);

        if
        (
            dto.FollowUpMethodId.HasValue
            &&
            dto.FollowUpMethodId.Value > 0
        )
        {
            await RequireSetupAsync(dto.FollowUpMethodId.Value, "FollowUpMethod", "Follow-up Method", current?.FollowUpMethodId);
        }

        if
        (
            input.Status.Stage == "Lost"
        )
        {
            if
            (
                !(dto.LostReasonId > 0)
            )
            {
                throw new InvalidOperationException(
                    "Suspend Reason is required for a Suspended status.");
            }

            await RequireSetupAsync(dto.LostReasonId!.Value, "LostReason", "Lost Reason", current?.LostReasonId);

            input.LostReasonId = dto.LostReasonId;

            // A lost enquiry has no next follow-up
            input.NextFollowUpDate = null;
        }
        else
        {
            input.LostReasonId = null;

            input.NextFollowUpDate = dto.NextFollowUpDate;
        }


        // Executive (User Profile)
        UserProfileEntity? user =
            await _context.Set<UserProfileEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x =>
                        x.UserProfileId == dto.ExecutiveUserId
                        &&
                        !x.IsDeleted);

        if
        (
            user == null
        )
        {
            throw new InvalidOperationException(
                "Choose the Executive.");
        }

        if
        (
            !user.IsActive
            &&
            current?.ExecutiveUserId != user.UserProfileId
        )
        {
            throw new InvalidOperationException(
                $"Executive '{user.DisplayName}' is inactive.");
        }

        input.ExecutiveName =
            !string.IsNullOrWhiteSpace(user.DisplayName)
                ? user.DisplayName.Trim()
                : !string.IsNullOrWhiteSpace(user.FullName)
                    ? user.FullName.Trim()
                    : user.UserName;


        // Enquirer
        input.Mobile =
            CleanPhone(dto.EnquirerMobile);

        if
        (
            !IsValidMobile(input.Mobile)
        )
        {
            throw new InvalidOperationException(
                "Enquirer Mobile must be 11 digits starting with 01.");
        }

        input.Name =
            Squeeze(dto.EnquirerName);

        if
        (
            input.Name.Length == 0
        )
        {
            throw new InvalidOperationException(
                "Enquirer Name is required.");
        }

        if
        (
            input.Name.Length > 150
        )
        {
            throw new InvalidOperationException(
                "Enquirer Name cannot be longer than 150 characters.");
        }

        input.AltPhone =
            CleanPhone(dto.AltPhone);

        if
        (
            input.AltPhone.Length > 0
            &&
            !IsValidMobile(input.AltPhone)
        )
        {
            throw new InvalidOperationException(
                "Alternate Phone must be 11 digits starting with 01.");
        }

        if
        (
            dto.LocationId.HasValue
            &&
            dto.LocationId.Value > 0
        )
        {
            bool locationOk =
                await _context.Set<LocationsEntity>()
                    .AsNoTracking()
                    .AnyAsync(
                        x =>
                            x.LocationId == dto.LocationId.Value
                            &&
                            !x.IsDeleted);

            if
            (
                !locationOk
            )
            {
                throw new InvalidOperationException(
                    "The selected Location was not found.");
            }
        }

        input.Address =
            (dto.Address ?? string.Empty).Trim();

        if
        (
            input.Address.Length > 300
        )
        {
            throw new InvalidOperationException(
                "Address cannot be longer than 300 characters.");
        }

        input.EnquiryFor =
            EnquiryForValues.FirstOrDefault(
                x =>
                    string.Equals(x, (dto.EnquiryFor ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException(
                "Enquiry For must be Self or Referrer.");


        // Models
        (input.ModelName, input.BrandName) =
            await RequireModelAsync(dto.ModelId, "Model", current?.ModelId);

        if
        (
            dto.SecondModelId.HasValue
            &&
            dto.SecondModelId.Value > 0
        )
        {
            if
            (
                dto.SecondModelId.Value == dto.ModelId
            )
            {
                throw new InvalidOperationException(
                    "Second Model must differ from the Model.");
            }

            (input.SecondModelName, _) =
                await RequireModelAsync(dto.SecondModelId.Value, "Second Model", current?.SecondModelId);
        }


        // Quantity / Budget / Payment
        if
        (
            dto.Quantity < 1
            ||
            dto.Quantity > 99
        )
        {
            throw new InvalidOperationException(
                "Quantity must be from 1 to 99.");
        }

        if
        (
            dto.Budget < 0
            ||
            dto.Budget > 99999999.99m
        )
        {
            throw new InvalidOperationException(
                "Budget must be from 0 to 99,999,999.99.");
        }

        input.PaymentMode =
            PaymentModes.FirstOrDefault(
                x =>
                    string.Equals(x, (dto.PaymentMode ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException(
                "Payment Mode must be Cash, EMI or Exchange.");

        input.ExchangeBike =
            input.PaymentMode == "Exchange"
                ? Squeeze(dto.ExchangeBike)
                : string.Empty;

        if
        (
            input.PaymentMode == "Exchange"
            &&
            input.ExchangeBike.Length == 0
        )
        {
            throw new InvalidOperationException(
                "Exchange Bike is required for an exchange (model, year …).");
        }

        if
        (
            input.ExchangeBike.Length > 200
        )
        {
            throw new InvalidOperationException(
                "Exchange Bike cannot be longer than 200 characters.");
        }


        // Dates : Expected Purchase Date required (user, 2026-11-03;
        // switch CFG-MOD-010-0001)
        if
        (
            !dto.ExpectedPurchaseDate.HasValue
            &&
            await EnquirySwitches.OnAsync(_context, EnquirySwitches.PurchaseDateRequired, true)
        )
        {
            throw new InvalidOperationException(
                "Expected Purchase Date is required.");
        }

        if
        (
            dto.ExpectedPurchaseDate.HasValue
            &&
            dto.ExpectedPurchaseDate.Value < dto.EnquiryDate
        )
        {
            throw new InvalidOperationException(
                "Expected Purchase Date cannot be before the Enquiry Date.");
        }

        if
        (
            input.NextFollowUpDate.HasValue
            &&
            input.NextFollowUpDate.Value < dto.EnquiryDate
        )
        {
            throw new InvalidOperationException(
                "Next Follow-up Date cannot be before the Enquiry Date.");
        }


        // Remarks
        input.Remarks =
            (dto.Remarks ?? string.Empty).Trim();

        if
        (
            input.Remarks.Length > 500
        )
        {
            throw new InvalidOperationException(
                "Remarks cannot be longer than 500 characters.");
        }

        return input;
    }



    //===========================================================
    // ENQUIRER : find or add by mobile, refresh his details
    //===========================================================

    private async Task<EnquiryContactsEntity>
        SaveContactAsync
        (
            CleanInput input,
            long? locationId,
            long userId
        )
    {
        EnquiryContactsEntity? contact =
            await Contacts
                .FirstOrDefaultAsync(
                    x =>
                        x.Mobile == input.Mobile
                        &&
                        !x.IsDeleted);

        long? location =
            locationId > 0
                ? locationId
                : null;

        if
        (
            contact == null
        )
        {
            contact =
                new EnquiryContactsEntity
                {
                    Mobile = input.Mobile,
                    ContactName = input.Name,
                    AltPhone = input.AltPhone,
                    LocationId = location,
                    Address = input.Address,
                    IsDeleted = false,
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow
                };

            Contacts.Add(contact);

            await _context.SaveChangesAsync();

            return contact;
        }

        contact.ContactName = input.Name;

        if (input.AltPhone.Length > 0) contact.AltPhone = input.AltPhone;

        if (location.HasValue) contact.LocationId = location;

        if (input.Address.Length > 0) contact.Address = input.Address;

        contact.ModifiedBy = userId;

        contact.ModifiedDate = DateTime.UtcNow;

        return contact;
    }



    //===========================================================
    // History
    //===========================================================

    private void AddHistory
    (
        SalesEnquiriesEntity entity,
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
                EntityId = entity.SalesEnquiryId,
                ActivityType = activityType,
                ActivityTitle = $"Sales Enquiry {verb}",
                ActivityDescription =
                    $"Sales enquiry {entity.EnquiryNo} ({entity.EnquirerName} - {entity.EnquirerMobile}, {entity.ModelName}) {verb.ToLower()}.",
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            }
        );
    }


    private static void Apply
    (
        SalesEnquiriesEntity entity,
        CreateSalesEnquiriesDto dto,
        CleanInput input,
        EnquiryContactsEntity contact
    )
    {
        entity.EnquiryDate = dto.EnquiryDate;
        entity.SourceId = dto.SourceId;
        entity.StatusId = dto.StatusId;
        entity.InterestLevelId = dto.InterestLevelId > 0 ? dto.InterestLevelId : null;
        entity.ExecutiveUserId = dto.ExecutiveUserId;
        entity.ExecutiveName = input.ExecutiveName;

        entity.EnquiryContactId = contact.EnquiryContactId;
        entity.EnquirerMobile = input.Mobile;
        entity.EnquirerName = input.Name;
        entity.EnquiryFor = input.EnquiryFor;

        entity.ModelId = dto.ModelId;
        entity.ModelName = input.ModelName;
        entity.BrandName = input.BrandName;
        entity.SecondModelId = dto.SecondModelId > 0 ? dto.SecondModelId : null;
        entity.SecondModelName = input.SecondModelName;
        entity.Quantity = dto.Quantity;
        entity.Budget = Math.Round(dto.Budget, 2);
        entity.PaymentMode = input.PaymentMode;
        entity.ExchangeBike = input.ExchangeBike;
        entity.ExpectedPurchaseDate = dto.ExpectedPurchaseDate;

        string color = Squeeze(dto.PreferredColor);
        entity.PreferredColor = color.Length <= ColorMaxLength ? color : color[..ColorMaxLength];

        entity.NextFollowUpDate = input.NextFollowUpDate;
        entity.FollowUpMethodId = dto.FollowUpMethodId > 0 ? dto.FollowUpMethodId : null;
        entity.LostReasonId = input.LostReasonId;
        entity.Remarks = input.Remarks;

        // Closed date follows the Lost stage
        if
        (
            input.Status.Stage == "Lost"
        )
        {
            entity.ClosedDate ??= DateOnly.FromDateTime(DateTime.Now);
        }
        else
        {
            entity.ClosedDate = null;
        }
    }



    //===========================================================
    // CREATE (number taken here, under a lock for the month)
    //===========================================================

    // Open enquiry with a purchase date : store the level of the
    // days left (a hand choice stays when no range matches)
    private async Task ApplyAutoInterestAsync
    (
        SalesEnquiriesEntity entity,
        CleanInput input
    )
    {
        if
        (
            input.Status.Stage != "Open"
            ||
            !entity.ExpectedPurchaseDate.HasValue
            ||
            !await EnquirySwitches.OnAsync(_context, EnquirySwitches.AutoInterest, true)
        )
        {
            return;
        }

        List<EnquirySetupsEntity> rules =
            InterestRulesOf(
                await Setups
                    .AsNoTracking()
                    .Where(x => x.SetupType == "InterestLevel")
                    .ToListAsync());

        EnquirySetupsEntity? auto =
            MatchInterest(
                rules,
                DaysLeft(entity.ExpectedPurchaseDate.Value, Today()));

        if
        (
            auto != null
        )
        {
            entity.InterestLevelId = auto.EnquirySetupId;
        }
    }



    public async Task<long>
        CreateAsync
        (
            CreateSalesEnquiriesDto dto,
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
            await SaveContactAsync(input, dto.LocationId, userId);

        SalesEnquiriesEntity entity =
            new()
            {
                EnquiryNo = CodeGenerator.GenerateEnquiryNo(EnquiryType, year, month, sequence),
                EnquiryYear = year,
                EnquiryMonth = month,
                SequenceNo = sequence,
                BranchId = input.Branch.BranchId,
                BranchName = input.Branch.BranchName,
                LastFollowUpNote = string.Empty,
                SaleNo = string.Empty,
                CustomerName = string.Empty,
                IsMatured = false,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        Apply(entity, dto, input, contact);

        await ApplyAutoInterestAsync(entity, input);

        Enquiries.Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(entity, "Create", "Created", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.SalesEnquiryId;
    }



    //===========================================================
    // UPDATE (number / branch locked; date only inside its month)
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateSalesEnquiriesDto dto,
            long userId
        )
    {
        SalesEnquiriesEntity? entity =
            await Enquiries
                .FirstOrDefaultAsync(
                    x =>
                        x.SalesEnquiryId == dto.SalesEnquiryId
                        &&
                        !x.IsDeleted);

        if
        (
            entity == null
        )
        {
            throw new KeyNotFoundException(
                "Sales enquiry not found. It may have been deleted.");
        }

        if
        (
            entity.IsMatured
        )
        {
            throw new InvalidOperationException(
                $"Enquiry {entity.EnquiryNo} is matured by sale {entity.SaleNo} and cannot be changed.");
        }

        if
        (
            dto.EnquiryDate.Year != entity.EnquiryYear
            ||
            dto.EnquiryDate.Month != entity.EnquiryMonth
        )
        {
            throw new InvalidOperationException(
                $"The Enquiry Date must stay in {entity.EnquiryMonth:D2}-{entity.EnquiryYear} (the month of {entity.EnquiryNo}).");
        }

        // Branch stays as saved
        dto.BranchId = entity.BranchId;

        // Next follow-up and method change only by logging a call
        // (Sales Follow-ups); the form shows them read-only
        DateOnly? keptNext = entity.NextFollowUpDate;

        long? keptMethod = entity.FollowUpMethodId;

        CleanInput input =
            await NormalizeAsync(dto, entity);

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        EnquiryContactsEntity contact =
            await SaveContactAsync(input, dto.LocationId, userId);

        Apply(entity, dto, input, contact);

        entity.NextFollowUpDate = input.Status.Stage == "Lost" ? null : keptNext;

        entity.FollowUpMethodId = keptMethod;

        await ApplyAutoInterestAsync(entity, input);

        entity.ModifiedBy = userId;

        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity, "Update", "Updated", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }



    //===========================================================
    // DELETE (soft; matured enquiries refused)
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        SalesEnquiriesEntity? entity =
            await Enquiries
                .FirstOrDefaultAsync(
                    x =>
                        x.SalesEnquiryId == id
                        &&
                        !x.IsDeleted);

        if
        (
            entity == null
        )
        {
            throw new KeyNotFoundException(
                "Sales enquiry not found. It may have been deleted already.");
        }

        if
        (
            entity.IsMatured
        )
        {
            throw new InvalidOperationException(
                $"Enquiry {entity.EnquiryNo} is matured by sale {entity.SaleNo} and cannot be deleted.");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity, "Delete", "Deleted", userId);

        await _context.SaveChangesAsync();
    }



    //===========================================================
    // RESTORE (the most recently deleted enquiry)
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        SalesEnquiriesEntity? entity =
            await Enquiries
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .ThenByDescending(x => x.SalesEnquiryId)
                .FirstOrDefaultAsync();

        if
        (
            entity == null
        )
        {
            return false;
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity, "Restore", "Restored", userId);

        await _context.SaveChangesAsync();

        return true;
    }


    //===========================================================
    // PUBLIC WEBSITE : Enquire form (anonymous)
    //
    // New mobile (or no open enquiry) → a new sales enquiry :
    //   Source Website, default Open status, interest by the days
    //   left, Executive 0 = unassigned (the first ERP user who
    //   saves it becomes its executive), next follow-up today,
    //   FromWebsite = true. Created by 0 (the website).
    // Mobile with an open enquiry → no new number; a note goes on
    //   that enquiry and its next follow-up becomes today.
    //===========================================================

    private const int WebsiteUserId = 0;

    private const int ColorMaxLength = 50;


    public async Task<PublicEnquiryOptionsDto>
        GetWebsiteOptionsAsync()
    {
        Dictionary<long, string> wings =
            await _context.Set<WingsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .ToDictionaryAsync(x => x.WingId, x => x.WingName ?? string.Empty);

        List<BranchesEntity> branches =
            await _context.Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.WingId)
                .ThenBy(x => x.BranchCode)
                .ToListAsync();

        return new PublicEnquiryOptionsDto
        {
            Locations =
                await _context.Set<LocationsEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.DisplayName)
                    .Select(
                        x =>
                            new PublicOptionDto
                            {
                                Code = x.LocationCode,
                                Name = x.DisplayName
                            })
                    .ToListAsync(),

            Branches =
                branches
                    .Select(
                        x =>
                            new PublicOptionDto
                            {
                                Code = x.BranchCode,
                                Name = x.BranchName,
                                Type = wings.GetValueOrDefault(x.WingId, string.Empty)
                            })
                    .ToList()
        };
    }


    public async Task<PublicEnquiryResultDto>
        CreateFromWebsiteAsync
        (
            PublicEnquiryRequestDto dto
        )
    {
        //-------------------------------------------------------
        // Checks (messages are shown to the visitor)
        //-------------------------------------------------------

        string mobile =
            CleanPhone(dto.Mobile);

        if
        (
            !IsValidMobile(mobile)
        )
        {
            throw new InvalidOperationException(
                "Enter your 11-digit mobile number starting with 01.");
        }

        string name =
            Squeeze(dto.Name);

        if
        (
            name.Length < 2
            ||
            name.Length > 100
        )
        {
            throw new InvalidOperationException(
                "Enter your name.");
        }

        DateOnly today =
            Today();

        if
        (
            !dto.ExpectedPurchaseDate.HasValue
            ||
            dto.ExpectedPurchaseDate.Value < today
            ||
            dto.ExpectedPurchaseDate.Value > today.AddDays(365)
        )
        {
            throw new InvalidOperationException(
                "Choose when you plan to buy (from today, within a year).");
        }

        // Test ride : date, slot, licence. With a Test Ride time slot
        // the website sends a real time (RideStart, booked after the
        // save) or none when the day has no free time; without one,
        // Morning / Afternoon / Evening.
        string[] slots = { "Morning", "Afternoon", "Evening" };

        bool rideSlotsSet =
            dto.IsTestRide
            && await RideTimeSlotAsync() != null
            && await EnquirySwitches.OnAsync(_context, EnquirySwitches.WebsiteRideBooking, true);

        (TimeOnly Start, TimeOnly End)? rideTime =
            dto.IsTestRide ? await WebsiteRideSlotAsync(dto.RideStart) : null;

        string rideStart =
            rideTime.HasValue ? Hm(rideTime.Value.Start) : string.Empty;

        string rideSlot =
            rideTime.HasValue
                ? Ampm(rideTime.Value.Start)
                : slots.FirstOrDefault(
                    x =>
                        string.Equals(x, (dto.RideSlot ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
                  ?? string.Empty;

        if
        (
            dto.IsTestRide
        )
        {
            if
            (
                !dto.RideDate.HasValue
                ||
                dto.RideDate.Value < today
                ||
                dto.RideDate.Value > today.AddDays(60)
            )
            {
                throw new InvalidOperationException(
                    "Choose a test ride date (from today, within 60 days).");
            }

            if
            (
                rideSlot.Length == 0
                &&
                !rideSlotsSet
            )
            {
                throw new InvalidOperationException(
                    "Choose a time for the test ride : Morning, Afternoon or Evening.");
            }

            if
            (
                !dto.HasLicence.HasValue
            )
            {
                throw new InvalidOperationException(
                    "Tell us whether you have a driving licence.");
            }

            // Switch : a test ride needs a driving licence
            if
            (
                dto.HasLicence == false
                &&
                await EnquirySwitches.OnAsync(_context, EnquirySwitches.RideLicenceRequired, false)
            )
            {
                throw new InvalidOperationException(
                    "A driving licence is needed for a test ride. Send an enquiry instead and we will call you.");
            }
        }

        bool emi =
            string.Equals((dto.PaymentMode ?? string.Empty).Trim(), "EMI", StringComparison.OrdinalIgnoreCase);

        string emiNote =
            Squeeze(dto.EmiNote);

        if
        (
            emiNote.Length > 60
        )
        {
            emiNote =
                emiNote[..60];
        }

        // Extra lines for Remarks
        string extra =
            (emi ? $" EMI plan asked{(emiNote.Length > 0 ? $" : {emiNote}" : string.Empty)}." : string.Empty)
            +
            (dto.IsTestRide
                ? $" Test ride asked : {dto.RideDate!.Value:ddd dd-MMM-yyyy}{(rideSlot.Length > 0 ? ", " + rideSlot : ", no time picked")}; driving licence : {(dto.HasLicence == true ? "yes" : "no")}."
                : string.Empty);

        // Call before the ride (the day before, or today)
        DateOnly followUp =
            dto.IsTestRide
                ? (dto.RideDate!.Value.AddDays(-1) > today ? dto.RideDate.Value.AddDays(-1) : today)
                : today;

        string colour =
            Squeeze(dto.Colour);

        if
        (
            colour.Length > ColorMaxLength
        )
        {
            colour =
                colour[..ColorMaxLength];
        }

        // Model : a sub category of an active Motor Bikes category
        string modelCode =
            (dto.ModelCode ?? string.Empty).Trim();

        var model =
            await (
                from s in _context.Set<ProductSubCategoryEntity>().AsNoTracking()
                join c in _context.Set<ProductCategoryEntity>().AsNoTracking()
                    on s.ProductCategoryId equals c.ProductCategoryId
                where s.SubCategoryCode == modelCode
                      && !s.IsDeleted
                      && s.IsActive
                      && !c.IsDeleted
                      && c.IsActive
                      && c.CategoryType == "Motor Bikes"
                select new
                {
                    s.ProductSubCategoryId,
                    s.SubCategoryName,
                    c.BrandManagementId
                })
            .FirstOrDefaultAsync();

        if
        (
            modelCode.Length == 0
            ||
            model == null
        )
        {
            throw new InvalidOperationException(
                "Choose the bike you are interested in.");
        }

        string brandName =
            model.BrandManagementId.HasValue
                ? await _context.Set<BrandManagementEntity>()
                    .AsNoTracking()
                    .Where(x => x.BrandManagementId == model.BrandManagementId.Value)
                    .Select(x => x.BrandName)
                    .FirstOrDefaultAsync()
                  ?? string.Empty
                : string.Empty;

        string branchCode =
            (dto.BranchCode ?? string.Empty).Trim();

        BranchesEntity? branch =
            await _context.Set<BranchesEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x =>
                        x.BranchCode == branchCode
                        &&
                        !x.IsDeleted
                        &&
                        x.IsActive);

        if
        (
            branch == null
        )
        {
            throw new InvalidOperationException(
                "Choose your preferred showroom.");
        }

        string locationCode =
            (dto.LocationCode ?? string.Empty).Trim();

        long? locationId =
            await _context.Set<LocationsEntity>()
                .AsNoTracking()
                .Where(
                    x =>
                        x.LocationCode == locationCode
                        &&
                        !x.IsDeleted
                        &&
                        x.IsActive)
                .Select(x => (long?)x.LocationId)
                .FirstOrDefaultAsync();

        if
        (
            locationId == null
        )
        {
            throw new InvalidOperationException(
                "Choose your area.");
        }


        //-------------------------------------------------------
        // The mobile's open enquiry (not matured, Open stage)
        //-------------------------------------------------------

        List<EnquirySetupsEntity> setups =
            await Setups
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .ToListAsync();

        HashSet<long> openStatusIds =
            setups
                .Where(x => x.SetupType == "Status" && x.Stage == "Open")
                .Select(x => x.EnquirySetupId)
                .ToHashSet();

        // Switch : a repeat mobile joins its open enquiry (OFF : always
        // a new enquiry)
        bool joinOpen =
            await EnquirySwitches.OnAsync(_context, EnquirySwitches.RepeatMobileJoins, true);

        SalesEnquiriesEntity? open =
            !joinOpen
                ? null
                : await Enquiries
                .Where(
                    x =>
                        x.EnquirerMobile == mobile
                        &&
                        !x.IsDeleted
                        &&
                        !x.IsMatured
                        &&
                        openStatusIds.Contains(x.StatusId))
                .OrderByDescending(x => x.EnquiryDate)
                .ThenByDescending(x => x.SalesEnquiryId)
                .FirstOrDefaultAsync();

        string when =
            dto.ExpectedPurchaseDate.Value.ToString("dd-MMM-yyyy");

        if
        (
            open != null
        )
        {
            string note =
                $"[Website {today:dd-MMM-yyyy}] Asked again : {model.SubCategoryName}"
                + (colour.Length > 0 ? $" ({colour})" : string.Empty)
                + $", buying by {when}, {branch.BranchName}."
                + extra;

            string remarks =
                string.IsNullOrWhiteSpace(open.Remarks)
                    ? note
                    : $"{open.Remarks.TrimEnd()} {note}";

            // Newest note kept when the remarks are full
            open.Remarks =
                remarks.Length <= 500
                    ? remarks
                    : remarks[^500..];

            open.NextFollowUpDate = today;

            if (emi) open.PaymentMode = "EMI";

            if
            (
                dto.IsTestRide
            )
            {
                open.TestRideDate = dto.RideDate;

                open.TestRideSlot = rideSlot;
            }

            open.ModifiedBy = WebsiteUserId;

            open.ModifiedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            AddWebsiteHistory(open, "Update", "Website request added", note);

            await _context.SaveChangesAsync();

            string openBooking =
                dto.IsTestRide
                    ? await TryBookRideFromWebsiteAsync(open.SalesEnquiryId, dto.RideDate!.Value, rideStart)
                    : string.Empty;

            return new PublicEnquiryResultDto
            {
                EnquiryNo = open.EnquiryNo,
                IsExisting = true,
                Message =
                    dto.IsTestRide
                        ? WebsiteRideMessage(openBooking, dto.RideDate!.Value, rideStart, "We already have your enquiry and added this test ride request to it. We will call you to confirm the ride.")
                        : "We already have your enquiry and added this request to it. Our executive will call you soon."
            };
        }


        //-------------------------------------------------------
        // New enquiry
        //-------------------------------------------------------

        EnquirySetupsEntity? source =
            setups.FirstOrDefault(
                x =>
                    x.SetupType == "Source"
                    &&
                    x.IsActive
                    &&
                    x.Name.ToLower() == "website")
            ?? setups.FirstOrDefault(x => x.SetupType == "Source" && x.IsActive && x.IsDefault)
            ?? setups.FirstOrDefault(x => x.SetupType == "Source" && x.IsActive);

        EnquirySetupsEntity? status =
            setups.FirstOrDefault(x => x.SetupType == "Status" && x.Stage == "Open" && x.IsActive && x.IsDefault)
            ?? setups
                .Where(x => x.SetupType == "Status" && x.Stage == "Open" && x.IsActive)
                .OrderBy(x => x.DisplayOrder)
                .FirstOrDefault();

        if
        (
            source == null
            ||
            status == null
        )
        {
            throw new InvalidOperationException(
                "Online enquiries are not available right now. Please call us.");
        }

        EnquirySetupsEntity? interest =
            (await EnquirySwitches.OnAsync(_context, EnquirySwitches.AutoInterest, true)
                ? MatchInterest(
                    InterestRulesOf(setups),
                    DaysLeft(dto.ExpectedPurchaseDate.Value, today))
                : null)
            ?? setups.FirstOrDefault(x => x.SetupType == "InterestLevel" && x.IsActive && x.IsDefault);

        EnquirySetupsEntity? method =
            setups.FirstOrDefault(x => x.SetupType == "FollowUpMethod" && x.IsActive && x.IsDefault);

        string newRemarks =
            "Sent from the website." + extra;

        if
        (
            newRemarks.Length > 500
        )
        {
            newRemarks =
                newRemarks[..500];
        }

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
            await SaveContactAsync(
                new CleanInput
                {
                    Mobile = mobile,
                    Name = name
                },
                locationId,
                WebsiteUserId);

        SalesEnquiriesEntity entity =
            new()
            {
                EnquiryNo = CodeGenerator.GenerateEnquiryNo(EnquiryType, year, month, sequence),
                EnquiryYear = year,
                EnquiryMonth = month,
                SequenceNo = sequence,
                EnquiryDate = today,
                BranchId = branch.BranchId,
                BranchName = branch.BranchName,
                SourceId = source.EnquirySetupId,
                StatusId = status.EnquirySetupId,
                InterestLevelId = interest?.EnquirySetupId,

                // Unassigned
                ExecutiveUserId = 0,
                ExecutiveName = string.Empty,

                EnquiryContactId = contact.EnquiryContactId,
                EnquirerMobile = mobile,
                EnquirerName = name,
                EnquiryFor = "Self",

                ModelId = model.ProductSubCategoryId,
                ModelName = model.SubCategoryName,
                BrandName = brandName,
                SecondModelName = string.Empty,
                Quantity = 1,
                Budget = 0,
                PaymentMode = emi ? "EMI" : "Cash",
                ExchangeBike = string.Empty,
                ExpectedPurchaseDate = dto.ExpectedPurchaseDate,
                PreferredColor = colour,
                FromWebsite = true,
                TestRideDate = dto.IsTestRide ? dto.RideDate : null,
                TestRideSlot = dto.IsTestRide ? rideSlot : string.Empty,

                NextFollowUpDate = followUp,
                FollowUpMethodId = method?.EnquirySetupId,
                LastFollowUpNote = string.Empty,
                Remarks = newRemarks,

                SaleNo = string.Empty,
                CustomerName = string.Empty,
                IsMatured = false,
                IsDeleted = false,
                CreatedBy = WebsiteUserId,
                CreatedDate = DateTime.UtcNow
            };

        Enquiries.Add(entity);

        await _context.SaveChangesAsync();

        AddWebsiteHistory(
            entity,
            "Create",
            "Received from the website",
            $"Sales enquiry {entity.EnquiryNo} ({name} - {mobile}, {model.SubCategoryName}) received from the website.");

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        await transaction.DisposeAsync();

        string booking =
            dto.IsTestRide
                ? await TryBookRideFromWebsiteAsync(entity.SalesEnquiryId, dto.RideDate!.Value, rideStart)
                : string.Empty;

        return new PublicEnquiryResultDto
        {
            EnquiryNo = entity.EnquiryNo,
            IsExisting = false,
            Message =
                dto.IsTestRide
                    ? WebsiteRideMessage(booking, dto.RideDate!.Value, rideStart, "Thank you! We will call you to confirm your test ride.")
                    : "Thank you! Our executive will call you soon."
        };
    }


    // Switch : website sends per hour from one address (null = no
    // hourly limit; the other spam checks stay)
    public async Task<int?> WebsiteSendsPerHourAsync()
    {
        return await EnquirySwitches.NumberAsync(_context, EnquirySwitches.WebsiteSendsPerHour, 5, 1, 100);
    }


    private void AddWebsiteHistory
    (
        SalesEnquiriesEntity entity,
        string activityType,
        string title,
        string description
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = entity.SalesEnquiryId,
                ActivityType = activityType,
                ActivityTitle = $"Sales Enquiry {title}",
                ActivityDescription = description.Length <= 500 ? description : description[..500],
                PerformedBy = WebsiteUserId,
                PerformedByName = "Website",
                PerformedDate = DateTime.UtcNow
            }
        );
    }
}
