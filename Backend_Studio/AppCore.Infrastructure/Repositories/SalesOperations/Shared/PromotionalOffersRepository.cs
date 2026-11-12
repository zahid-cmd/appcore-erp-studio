//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Common.Paging;
using AppCore.Application.SalesOperations.Shared;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.SalesOperations.Shared;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Persistence.Paging;

using BrandEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using CategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using SubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;

using SparePartsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SpareParts;

using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;

using BranchEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using UserProfileEntity =
    AppCore.Domain.Entities.SecurityPermission.UserManagement.UserProfile;

using BusinessLineAccess =
    AppCore.Infrastructure.Repositories.Settings.GeneralSettings.BusinessLineAccess;

using AccountClassEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountClass;

using AccountGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using GeneralLedgerEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using VoucherEntryEntity =
    AppCore.Domain.Platform.Accounting.VoucherEntries;

using AppCore.Infrastructure.CodeMaster;
using AppCore.Infrastructure.Platform.Accounting;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.SalesOperations.Shared;


//===============================================================
// Business Promotions : Promotional Offers Repository (hand-
// written, owner 2026-11-12; NO Code Sync). One repository for
// the three pages, keyed by the channel :
//
//   SalesCenter   (POSC-0001) : Fixed Discount / Scratch Card /
//                  SMS Offer; targets : bike categories, models
//                  (sub categories) or one colour (product)
//   ServiceCenter (POSV-0001) : Parts Discount (spare parts and
//                  lubricants by category / sub category / part)
//                  / Free Service (bike models)
//   AccessoryShop (POAS-0001) : Direct Discount / Scratch Card
//
// Funded by the Company (own cost : Campaign Discount ledger) or
// the brand's Distributor (reimbursable : the brand's Offer
// Adjustment ledger). Draft : everything editable; Active : only
// name, end date, branches and terms. Draft -> Active -> Closed,
// or Cancelled with a reason; only a Draft is deleted.
// The discount types are applied by the sales invoices (the
// better of offer or membership).
//===============================================================

public class PromotionalOffersRepository
    : IPromotionalOffersRepository
{
    private const string Draft = "Draft";

    private const string Active = "Active";

    private const string Closed = "Closed";

    private const string Cancelled = "Cancelled";

    private const string Company = "Company";

    private const string Distributor = "Distributor";

    private const string Percent = "Percent";

    private const string Amount = "Amount";

    private const string HistoryModule = "Sales Operations";

    // History : one entity name per page ("Promotional Offers -
    // Sales Center"), the controller reads the same name
    public static string HistoryEntityOf(string channel) =>
        $"Promotional Offers - {ChannelOf(channel).Title}";

    private const string BikeType = "Motor Bikes";


    private sealed class ChannelInfo
    {
        public string Name { get; init; } = string.Empty;

        public string Title { get; init; } = string.Empty;

        public string Prefix { get; init; } = string.Empty;

        public string[] OfferTypes { get; init; } = Array.Empty<string>();

        public string[] CategoryTypes { get; init; } = Array.Empty<string>();

        // Offer types with a discount (invoices apply them)
        public string[] DiscountTypes { get; init; } = Array.Empty<string>();

        public string[] PrizeTypes { get; init; } = Array.Empty<string>();

        // Business lines whose branches may run the offer (Business
        // Configuration : wing core lines + extra grants)
        public string[] BusinessLines { get; init; } = Array.Empty<string>();
    }


    private static readonly Dictionary<string, ChannelInfo> Channels =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["SalesCenter"] =
                new ChannelInfo
                {
                    Name = "SalesCenter",
                    Title = "Sales Center",
                    Prefix = "POSC-",
                    OfferTypes = new[] { "Fixed Discount", "Scratch Card", "SMS Offer" },
                    CategoryTypes = new[] { BikeType },
                    DiscountTypes = new[] { "Fixed Discount" },
                    PrizeTypes = new[] { "Scratch Card", "SMS Offer" },
                    BusinessLines = new[] { BusinessLineAccess.MotorBikes }
                },
            ["ServiceCenter"] =
                new ChannelInfo
                {
                    Name = "ServiceCenter",
                    Title = "Service Center",
                    Prefix = "POSV-",
                    // One "Service Campaign" (owner 2026-11-13 01:56) :
                    // free service (labour only) and / or a parts
                    // discount. Older offers keep "Parts Discount" /
                    // "Free Service" (read, run, closed; not new).
                    OfferTypes = new[] { ServiceCampaign },
                    CategoryTypes = new[] { "Spare Parts", "Lubricants" },
                    DiscountTypes = new[] { ServiceCampaign, "Parts Discount" },
                    PrizeTypes = Array.Empty<string>(),
                    BusinessLines = new[] { BusinessLineAccess.SpareParts, BusinessLineAccess.Services }
                },
            ["AccessoryShop"] =
                new ChannelInfo
                {
                    Name = "AccessoryShop",
                    Title = "Accessory Shop",
                    Prefix = "POAS-",
                    OfferTypes = new[] { "Direct Discount", "Scratch Card" },
                    CategoryTypes = new[] { "Accessories" },
                    DiscountTypes = new[] { "Direct Discount" },
                    PrizeTypes = new[] { "Scratch Card" },
                    BusinessLines = new[] { BusinessLineAccess.Accessories }
                }
        };

    private const string FreeService = "Free Service";

    private const string ServiceCampaign = "Service Campaign";

    // Service Campaign : the bike models it is for (no Model row =
    // every customer)
    private const string ModelTarget = "Model";

    // Service Campaign : all of one product type (1 = Spare Parts,
    // 2 = Lubricants; the category type)
    private const string ProductTypeTarget = "ProductType";

    private static string? ProductTypeName(long id) =>
        id switch
        {
            1 => "Spare Parts",
            2 => "Lubricants",
            _ => null
        };


    private readonly AppDbContext _context;


    public PromotionalOffersRepository(AppDbContext context)
    {
        _context = context;
    }


    private DbSet<PromotionalOffers> Offers =>
        _context.Set<PromotionalOffers>();

    private DbSet<PromotionalOfferTargets> Targets =>
        _context.Set<PromotionalOfferTargets>();

    private DbSet<PromotionalOfferPrizes> Prizes =>
        _context.Set<PromotionalOfferPrizes>();


    //===========================================================
    // Helpers
    //===========================================================

    private static readonly TimeZoneInfo BusinessZone = FindZone();

    private static TimeZoneInfo FindZone()
    {
        foreach (string id in new[] { "Asia/Dhaka", "Bangladesh Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        return TimeZoneInfo.CreateCustomTimeZone("BDT", TimeSpan.FromHours(6), "BDT", "BDT");
    }

    private static DateOnly Today =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, BusinessZone));

    private static string DateText(DateOnly date) =>
        date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static string Money(decimal value) =>
        value.ToString("#,##0.##", CultureInfo.InvariantCulture);

    private static string Limit(string? value, int max)
    {
        string text = (value ?? string.Empty).Replace("\r", " ").Replace("\n", " ").Trim();

        return text.Length > max ? text.Substring(0, max) : text;
    }

    private static string LimitBlock(string? value, int max)
    {
        string text = (value ?? string.Empty).Replace("\r\n", "\n").Trim();

        return text.Length > max ? text.Substring(0, max) : text;
    }

    private static DateOnly ParseDate(string? text, string label)
    {
        if (DateOnly.TryParseExact((text ?? string.Empty).Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly date))
        {
            return date;
        }

        throw new InvalidOperationException($"{label} is not a valid date.");
    }

    private static ChannelInfo ChannelOf(string channel)
    {
        if (Channels.TryGetValue(channel ?? string.Empty, out ChannelInfo? info))
        {
            return info;
        }

        throw new InvalidOperationException($"Unknown promotion channel \"{channel}\".");
    }

    private static string PhaseOf(PromotionalOffers offer, DateOnly today)
    {
        if (offer.Status != Active)
        {
            return offer.Status;
        }

        if (today < offer.StartDate)
        {
            return "Upcoming";
        }

        return today > offer.EndDate ? "Ended" : "Running";
    }

    private static List<long> BranchIdList(string? csv) =>
        (csv ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => long.TryParse(x, NumberStyles.Integer, CultureInfo.InvariantCulture, out long id) ? id : 0)
            .Where(x => x > 0)
            .Distinct()
            .ToList();

    private static string DiscountText(string? type, decimal value) =>
        type == Amount
            ? $"Tk {Money(value)}"
            : $"{Money(value)}%";

    // "Tk 5,000 off" / "Tk 3,000 - Tk 5,000 off" / "3 prize(s)"
    private static string BenefitText(PromotionalOffers offer, int prizeCount, IEnumerable<PromotionalOfferTargets> rows)
    {
        if (offer.OfferType == ServiceCampaign)
        {
            List<(string? Type, decimal Value)> parts =
                rows.Where(t => !t.IsExcluded && t.TargetType != ModelTarget && !string.IsNullOrWhiteSpace(t.DiscountType))
                    .Select(t => (t.DiscountType, t.DiscountValue ?? 0))
                    .Where(x => x.Item2 > 0)
                    .Distinct()
                    .OrderBy(x => x.Item1)
                    .ThenBy(x => x.Item2)
                    .ToList();

            List<string> bits = new();

            if (offer.FreeServiceCount > 0)
            {
                bits.Add("1 free service");
            }

            if (parts.Count == 1)
            {
                bits.Add($"{DiscountText(parts[0].Type, parts[0].Value)} off parts");
            }
            else if (parts.Count > 1)
            {
                bits.Add($"{DiscountText(parts[0].Type, parts[0].Value)} - {DiscountText(parts[^1].Type, parts[^1].Value)} off parts");
            }

            return bits.Count == 0 ? "-" : string.Join(" + ", bits);
        }

        if (offer.OfferType == FreeService)
        {
            return $"{offer.FreeServiceCount} free service(s)"
                   + (offer.ClaimDays > 0 ? $" within {offer.ClaimDays} days" : string.Empty);
        }

        if (prizeCount > 0)
        {
            return $"{prizeCount} prize(s)";
        }

        // Each covered row's discount (its own, else the offer's)
        List<(string? Type, decimal Value)> discounts =
            rows.Where(t => !t.IsExcluded)
                .Select(t => string.IsNullOrWhiteSpace(t.DiscountType)
                    ? ((string?)offer.DiscountType, offer.DiscountValue)
                    : (t.DiscountType, t.DiscountValue ?? 0))
                .Where(x => x.Item2 > 0)
                .Distinct()
                .OrderBy(x => x.Item1)
                .ThenBy(x => x.Item2)
                .ToList();

        if (discounts.Count == 0)
        {
            return "-";
        }

        if (discounts.Count == 1)
        {
            return $"{DiscountText(discounts[0].Type, discounts[0].Value)} off";
        }

        return $"{DiscountText(discounts[0].Type, discounts[0].Value)} - {DiscountText(discounts[^1].Type, discounts[^1].Value)} off";
    }

    private async Task InTransactionAsync(Func<Task> work)
    {
        if (_context.Database.CurrentTransaction != null)
        {
            await work();

            return;
        }

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            await work();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }

    private void AddHistory(PromotionalOffers offer, string type, string title, string description, long userId)
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntityOf(offer.Channel),
                EntityId = offer.PromotionalOfferId,
                ActivityType = type,
                ActivityTitle = title,
                ActivityDescription = Limit(description, 1000),
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });
    }

    private async Task<string> NextOfferNoAsync(ChannelInfo info)
    {
        List<string> nos =
            await Offers.AsNoTracking()
                .Where(x => x.OfferNo.StartsWith(info.Prefix))
                .Select(x => x.OfferNo)
                .ToListAsync();

        int max =
            nos.Select(x => int.TryParse(x.Substring(info.Prefix.Length), NumberStyles.Integer, CultureInfo.InvariantCulture, out int n) ? n : 0)
                .DefaultIfEmpty(0)
                .Max();

        return $"{info.Prefix}{max + 1:0000}";
    }

    private async Task<PromotionalOffers> FindAsync(ChannelInfo info, Guid publicId)
    {
        return await Offers
                   .FirstOrDefaultAsync(x => x.PublicId == publicId && x.Channel == info.Name && !x.IsDeleted)
               ?? throw new KeyNotFoundException("The promotional offer was not found.");
    }

    // Branches that run the channel's business line today
    // (Business Configuration); a Sales Center offer never runs at
    // a service center, etc.
    private async Task<HashSet<long>> LineBranchIdsAsync(ChannelInfo info)
    {
        Dictionary<long, HashSet<string>> lines =
            await BusinessLineAccess.ActiveLinesByBranchAsync(_context, BusinessLineAccess.Today());

        return lines
            .Where(x => x.Value.Overlaps(info.BusinessLines))
            .Select(x => x.Key)
            .ToHashSet();
    }

    // The channel's categories (id -> name, brand)
    private async Task<Dictionary<long, (string Name, long? BrandId)>> CategoriesAsync(string[] types)
    {
        return await _context
            .Set<CategoryEntity>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted && types.Contains(x.CategoryType))
            .ToDictionaryAsync(x => x.ProductCategoryId, x => (x.CategoryName, x.BrandManagementId));
    }


    //===========================================================
    // Read
    //===========================================================

    public async Task<List<PromotionalOfferListItemDto>> GetAllAsync(string channel)
    {
        ChannelInfo info = ChannelOf(channel);

        List<PromotionalOffers> offers =
            await Offers.AsNoTracking()
                .Where(x => x.Channel == info.Name && !x.IsDeleted)
                .OrderByDescending(x => x.PromotionalOfferId)
                .ToListAsync();

        return await ListItemsAsync(info, offers);
    }


    //===========================================================
    // One page of the list (server paging) : tab = status, brand
    // filter, search; Counts for the summary line (brand and
    // search applied, not the tab)
    //===========================================================

    public async Task<PagedResult<PromotionalOfferListItemDto>> GetPagedAsync(string channel, PromotionalOfferPageRequest request)
    {
        ChannelInfo info = ChannelOf(channel);

        request ??= new PromotionalOfferPageRequest();

        DateOnly today = Today;

        IQueryable<PromotionalOffers> query =
            Offers.AsNoTracking()
                .Where(x => x.Channel == info.Name && !x.IsDeleted);

        if (request.BrandId is > 0)
        {
            long brandId = request.BrandId.Value;

            query = query.Where(x => x.BrandManagementId == brandId);
        }

        string search = request.SafeSearch;

        if (search.Length > 0)
        {
            string like = PagingQuery.LikePattern(search);

            query =
                query.Where
                (
                    x =>
                        EF.Functions.ILike(x.OfferNo, like)
                        || EF.Functions.ILike(x.OfferName, like)
                        || EF.Functions.ILike(x.OfferType, like)
                        || EF.Functions.ILike(x.BrandName, like)
                        || EF.Functions.ILike(x.FundedBy, like)
                        || EF.Functions.ILike(x.Status, like)
                        || Targets.Any(t => t.PromotionalOfferId == x.PromotionalOfferId && EF.Functions.ILike(t.TargetName, like))
                );
        }

        // Summary counts
        var groups =
            await query
                .GroupBy(x => new { x.Status, Upcoming = x.StartDate > today, Ended = x.EndDate < today })
                .Select(g => new { g.Key.Status, g.Key.Upcoming, g.Key.Ended, Count = g.Count() })
                .ToListAsync();

        Dictionary<string, int> counts =
            new()
            {
                ["All"] = groups.Sum(g => g.Count),
                [Draft] = groups.Where(g => g.Status == Draft).Sum(g => g.Count),
                [Active] = groups.Where(g => g.Status == Active).Sum(g => g.Count),
                ["Running"] = groups.Where(g => g.Status == Active && !g.Upcoming && !g.Ended).Sum(g => g.Count),
                ["Upcoming"] = groups.Where(g => g.Status == Active && g.Upcoming).Sum(g => g.Count),
                ["Ended"] = groups.Where(g => g.Status == Active && g.Ended).Sum(g => g.Count),
                [Closed] = groups.Where(g => g.Status == Closed).Sum(g => g.Count),
                [Cancelled] = groups.Where(g => g.Status == Cancelled).Sum(g => g.Count)
            };

        // Tab = status
        string tab = (request.Tab ?? string.Empty).Trim();

        if (tab == Draft || tab == Active || tab == Closed || tab == Cancelled)
        {
            query = query.Where(x => x.Status == tab);
        }

        int total = await query.CountAsync();

        PagingQuery.FitPage(request, total);

        SortMap<PromotionalOffers> sort =
            new SortMap<PromotionalOffers>("PromotionalOfferId", defaultDescending:true)
                .Add("PromotionalOfferId", x => x.PromotionalOfferId)
                .Add("OfferNo", x => x.OfferNo)
                .Add("OfferName", x => x.OfferName)
                .Add("OfferType", x => x.OfferType)
                .Add("BrandName", x => x.BrandName)
                .Add("FundedBy", x => x.FundedBy)
                .Add("PeriodText", x => x.StartDate)
                .Add("StatusText", x => x.Status)
                .Tie(x => x.PromotionalOfferId);

        List<PromotionalOffers> rows =
            await sort.Apply(query, request).Page(request).ToListAsync();

        return new PagedResult<PromotionalOfferListItemDto>
        {
            Items = await ListItemsAsync(info, rows),
            TotalCount = total,
            Page = request.SafePage,
            PageSize = request.SafePageSize,
            Counts = counts
        };
    }


    // The internal id of a live offer of the page (history)
    public async Task<long?> GetIdAsync(string channel, Guid publicId)
    {
        ChannelInfo info = ChannelOf(channel);

        return await Offers.AsNoTracking()
            .Where(x => x.PublicId == publicId && x.Channel == info.Name && !x.IsDeleted)
            .Select(x => (long?)x.PromotionalOfferId)
            .FirstOrDefaultAsync();
    }


    // Display rows (targets, prizes, branches) of the offers given
    private async Task<List<PromotionalOfferListItemDto>> ListItemsAsync(ChannelInfo info, List<PromotionalOffers> offers)
    {
        DateOnly today = Today;

        List<long> ids = offers.Select(x => x.PromotionalOfferId).ToList();

        List<PromotionalOfferTargets> targets =
            await Targets.AsNoTracking()
                .Where(x => ids.Contains(x.PromotionalOfferId))
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        Dictionary<long, int> prizes =
            await Prizes.AsNoTracking()
                .Where(x => ids.Contains(x.PromotionalOfferId))
                .GroupBy(x => x.PromotionalOfferId)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count);

        Dictionary<long, string> branches =
            await _context.Set<BranchEntity>()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.BranchId, x => x.ShortName == "" ? x.BranchName : x.ShortName);

        return offers
            .Select
            (
                o =>
                {
                    List<string> names =
                        targets.Where(t => t.PromotionalOfferId == o.PromotionalOfferId && !t.IsExcluded)
                            .Select(t => t.TargetType == "All" ? (o.OfferType == ServiceCampaign ? "All parts" : "Everything") : t.TargetName)
                            .ToList();

                    int exceptions =
                        targets.Count(t => t.PromotionalOfferId == o.PromotionalOfferId && t.IsExcluded);

                    return new PromotionalOfferListItemDto
                    {
                        PromotionalOfferId = o.PromotionalOfferId,
                        PublicId = o.PublicId,
                        OfferNo = o.OfferNo,
                        OfferName = o.OfferName,
                        OfferType = o.OfferType,
                        BrandName = string.IsNullOrWhiteSpace(o.BrandName) ? "All brands" : o.BrandName,
                        FundedBy = o.FundedBy,
                        StartDate = DateText(o.StartDate),
                        EndDate = DateText(o.EndDate),
                        BenefitText = BenefitText(o, prizes.GetValueOrDefault(o.PromotionalOfferId), targets.Where(t => t.PromotionalOfferId == o.PromotionalOfferId)),
                        TargetsText =
                            (names.Count <= 3
                                ? string.Join(", ", names)
                                : $"{string.Join(", ", names.Take(3))} +{names.Count - 3} more")
                            + (exceptions > 0 ? $" (except {exceptions})" : string.Empty),
                        BranchesText =
                            o.AllBranches
                                ? $"All {string.Join(" / ", info.BusinessLines)} branches"
                                : string.Join(", ", BranchIdList(o.BranchIds).Select(id => branches.GetValueOrDefault(id, $"#{id}"))),
                        Status = o.Status,
                        Phase = PhaseOf(o, today)
                    };
                }
            )
            .ToList();
    }


    public async Task<PromotionalOfferDto?> GetAsync(string channel, Guid publicId)
    {
        ChannelInfo info = ChannelOf(channel);

        PromotionalOffers? o =
            await Offers.AsNoTracking()
                .FirstOrDefaultAsync(x => x.PublicId == publicId && x.Channel == info.Name && !x.IsDeleted);

        if (o == null)
        {
            return null;
        }

        List<PromotionalOfferTargets> targets =
            await Targets.AsNoTracking()
                .Where(x => x.PromotionalOfferId == o.PromotionalOfferId)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        List<PromotionalOfferPrizes> prizes =
            await Prizes.AsNoTracking()
                .Where(x => x.PromotionalOfferId == o.PromotionalOfferId)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        string createdBy =
            await _context.Set<UserProfileEntity>()
                .AsNoTracking()
                .Where(x => x.UserProfileId == o.CreatedBy)
                .Select(x => x.DisplayName != "" ? x.DisplayName : (x.FullName != "" ? x.FullName : x.UserName))
                .FirstOrDefaultAsync()
            ?? string.Empty;

        return new PromotionalOfferDto
        {
            PromotionalOfferId = o.PromotionalOfferId,
            PublicId = o.PublicId,
            Channel = o.Channel,
            OfferNo = o.OfferNo,
            OfferName = o.OfferName,
            OfferType = o.OfferType,
            BrandManagementId = o.BrandManagementId,
            BrandName = o.BrandName,
            FundedBy = o.FundedBy,
            StartDate = DateText(o.StartDate),
            EndDate = DateText(o.EndDate),
            AllBranches = o.AllBranches,
            BranchIds = BranchIdList(o.BranchIds),
            DiscountType = o.DiscountType,
            DiscountValue = o.DiscountValue,
            FreeServiceCount = o.FreeServiceCount,
            ClaimDays = o.ClaimDays,
            Terms = o.Terms,
            Status = o.Status,
            Phase = PhaseOf(o, Today),
            StatusReason = o.StatusReason,
            LedgerCode = o.LedgerCode,
            LedgerName = o.LedgerName,
            CreatedByName = createdBy,
            CreatedDate = o.CreatedDate,
            Targets =
                targets.Select
                (
                    t =>
                        new PromotionalOfferTargetDto
                        {
                            TargetType = t.TargetType,
                            TargetId = t.TargetId,
                            TargetName = t.TargetName,
                            DiscountType = t.DiscountType,
                            DiscountValue = t.DiscountValue,
                            IsExcluded = t.IsExcluded
                        }
                ).ToList(),
            Prizes =
                prizes.Select
                (
                    p =>
                        new PromotionalOfferPrizeDto
                        {
                            PrizeName = p.PrizeName,
                            PrizeKind = p.PrizeKind,
                            PrizeValue = p.PrizeValue,
                            Quantity = p.Quantity,
                            GivenQuantity = p.GivenQuantity
                        }
                ).ToList()
        };
    }


    public async Task<PromotionalOfferDefaultsDto> GetDefaultsAsync(string channel)
    {
        ChannelInfo info = ChannelOf(channel);

        PromotionalOfferDefaultsDto result =
            new()
            {
                Channel = info.Name,
                NextOfferNo = await NextOfferNoAsync(info),
                Today = DateText(Today),
                OfferTypes = info.OfferTypes.ToList()
            };

        result.Brands =
            await _context.Set<BrandEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status)
                .OrderBy(x => x.BrandName)
                .Select
                (
                    x =>
                        new PromotionalOfferOptionDto
                        {
                            Id = x.BrandManagementId,
                            Name = x.BrandName,
                            Note = x.OfferAdjustmentLedgerCode == "" ? "no Offer Adjustment ledger" : x.OfferAdjustmentLedgerCode
                        }
                )
                .ToListAsync();

        HashSet<long> lineBranches = await LineBranchIdsAsync(info);

        result.BusinessLine = string.Join(" / ", info.BusinessLines);

        result.Branches =
            await _context.Set<BranchEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && lineBranches.Contains(x.BranchId))
                .OrderBy(x => x.BranchName)
                .Select(x => new PromotionalOfferOptionDto { Id = x.BranchId, Name = x.BranchName, Note = x.BranchCode })
                .ToListAsync();

        Dictionary<long, (string Name, long? BrandId)> categories = await CategoriesAsync(info.CategoryTypes);

        // Note = the category type (Spare Parts / Lubricants ...) : the
        // Service Campaign's Product Type dropdown filters by it
        List<long> categoryKeys = categories.Keys.ToList();

        Dictionary<long, string> categoryTypes =
            await _context.Set<CategoryEntity>()
                .AsNoTracking()
                .Where(x => categoryKeys.Contains(x.ProductCategoryId))
                .ToDictionaryAsync(x => x.ProductCategoryId, x => x.CategoryType);

        result.Categories =
            categories
                .OrderBy(x => x.Value.Name)
                .Select(x => new PromotionalOfferOptionDto { Id = x.Key, Name = x.Value.Name, BrandId = x.Value.BrandId, Note = categoryTypes.GetValueOrDefault(x.Key, string.Empty) })
                .ToList();

        result.SubCategories = await SubCategoriesAsync(categories);

        if (info.Name != "SalesCenter")
        {
            // Every part / accessory of the channel (the coverage
            // grid picks from them)
            result.Products = await SearchProductsAsync(info.Name, null, int.MaxValue);
        }

        if (info.Name == "SalesCenter")
        {
            List<long> categoryIds = categories.Keys.ToList();

            result.Products =
                await _context.Set<MotorBikesEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive && categoryIds.Contains(x.ProductCategoryId))
                    .OrderBy(x => x.ProductName)
                    .Select
                    (
                        x =>
                            new PromotionalOfferOptionDto
                            {
                                Id = x.MotorBikeId,
                                Name = x.ProductName,
                                ParentId = x.ProductSubCategoryId,
                                Note = x.ProductCode
                            }
                    )
                    .ToListAsync();

            foreach (PromotionalOfferOptionDto p in result.Products)
            {
                p.BrandId = result.SubCategories.FirstOrDefault(s => s.Id == p.ParentId)?.BrandId;
            }
        }

        if (info.Name == "ServiceCenter")
        {
            result.BikeModels = await SubCategoriesAsync(await CategoriesAsync(new[] { BikeType }));
        }

        return result;
    }

    private async Task<List<PromotionalOfferOptionDto>> SubCategoriesAsync(Dictionary<long, (string Name, long? BrandId)> categories)
    {
        List<long> categoryIds = categories.Keys.ToList();

        List<PromotionalOfferOptionDto> rows =
            await _context.Set<SubCategoryEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && categoryIds.Contains(x.ProductCategoryId))
                .OrderBy(x => x.SubCategoryName)
                .Select
                (
                    x =>
                        new PromotionalOfferOptionDto
                        {
                            Id = x.ProductSubCategoryId,
                            Name = x.SubCategoryName,
                            ParentId = x.ProductCategoryId
                        }
                )
                .ToListAsync();

        foreach (PromotionalOfferOptionDto row in rows)
        {
            if (row.ParentId.HasValue && categories.TryGetValue(row.ParentId.Value, out var category))
            {
                row.BrandId = category.BrandId;
                row.Note = category.Name;
            }
        }

        return rows;
    }


    public Task<List<PromotionalOfferOptionDto>> SearchProductsAsync(string channel, string? search) =>
        SearchProductsAsync(channel, search, 50);

    private async Task<List<PromotionalOfferOptionDto>> SearchProductsAsync(string channel, string? search, int take)
    {
        ChannelInfo info = ChannelOf(channel);

        string text = (search ?? string.Empty).Trim();

        Dictionary<long, (string Name, long? BrandId)> categories = await CategoriesAsync(info.CategoryTypes);

        List<long> categoryIds = categories.Keys.ToList();

        List<PromotionalOfferOptionDto> rows;

        if (info.Name == "SalesCenter")
        {
            rows =
                await _context.Set<MotorBikesEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && categoryIds.Contains(x.ProductCategoryId)
                                && (text == "" || EF.Functions.ILike(x.ProductName, $"%{text}%") || EF.Functions.ILike(x.ProductCode, $"%{text}%")))
                    .OrderBy(x => x.ProductName)
                    .Take(take)
                    .Select(x => new PromotionalOfferOptionDto { Id = x.MotorBikeId, Name = x.ProductName, ParentId = x.ProductSubCategoryId, BrandId = x.ProductCategoryId, Note = x.ProductCode })
                    .ToListAsync();
        }
        else if (info.Name == "ServiceCenter")
        {
            rows =
                await _context.Set<SparePartsEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && categoryIds.Contains(x.ProductCategoryId)
                                && (text == "" || EF.Functions.ILike(x.PartName, $"%{text}%") || EF.Functions.ILike(x.PartNumber, $"%{text}%")))
                    .OrderBy(x => x.PartNumber)
                    .Take(take)
                    .Select(x => new PromotionalOfferOptionDto { Id = x.SparePartId, Name = x.PartNumber + " - " + x.PartName, ParentId = x.ProductSubCategoryId, BrandId = x.ProductCategoryId, Note = x.Unit })
                    .ToListAsync();
        }
        else
        {
            rows =
                await _context.Set<AccessoriesEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && categoryIds.Contains(x.ProductCategoryId)
                                && (text == "" || EF.Functions.ILike(x.AccessoryName, $"%{text}%") || EF.Functions.ILike(x.PartNumber, $"%{text}%")))
                    .OrderBy(x => x.PartNumber)
                    .Take(take)
                    .Select(x => new PromotionalOfferOptionDto { Id = x.AccessoryId, Name = x.PartNumber + " - " + x.AccessoryName, ParentId = x.ProductSubCategoryId, BrandId = x.ProductCategoryId, Note = x.Unit })
                    .ToListAsync();
        }

        // ParentId = the product's model / sub category (the form
        // filters the products by it); BrandId held the category
        // id until here : it becomes the category's brand
        foreach (PromotionalOfferOptionDto row in rows)
        {
            row.BrandId =
                row.BrandId.HasValue && categories.TryGetValue(row.BrandId.Value, out var category)
                    ? category.BrandId
                    : null;
        }

        return rows;
    }


    //===========================================================
    // Validation
    //===========================================================

    // One checked target : type, id, name (from the database), its
    // brand, own discount
    private sealed record CheckedTarget(string Type, long Id, string Name, string? DiscountType, decimal? DiscountValue, bool Excluded);

    private sealed record CheckedOffer
    (
        string OfferName,
        string OfferType,
        long? BrandId,
        string BrandName,
        string FundedBy,
        DateOnly Start,
        DateOnly End,
        bool AllBranches,
        string BranchIds,
        string DiscountType,
        decimal DiscountValue,
        int FreeServiceCount,
        int ClaimDays,
        string Terms,
        List<CheckedTarget> Targets,
        List<PromotionalOfferPrizeDto> Prizes
    );

    private static void CheckDiscount(string type, decimal value, string label)
    {
        if (type != Percent && type != Amount)
        {
            throw new InvalidOperationException($"{label} : choose Percent or Amount.");
        }

        if (value <= 0)
        {
            throw new InvalidOperationException($"{label} : the discount must be more than zero.");
        }

        if (type == Percent && value > 100)
        {
            throw new InvalidOperationException($"{label} : a percent discount cannot be more than 100.");
        }
    }

    // All branches = every branch of the channel's business line
    // (Business Configuration); a choice only among those
    private async Task<string> BranchCsvAsync(ChannelInfo info, bool allBranches, List<long>? ids)
    {
        if (allBranches)
        {
            return string.Empty;
        }

        List<long> chosen = (ids ?? new List<long>()).Where(x => x > 0).Distinct().ToList();

        if (chosen.Count == 0)
        {
            throw new InvalidOperationException($"Choose at least one branch, or all {string.Join(" / ", info.BusinessLines)} branches.");
        }

        HashSet<long> lineBranches = await LineBranchIdsAsync(info);

        int found =
            await _context.Set<BranchEntity>()
                .AsNoTracking()
                .CountAsync(x => chosen.Contains(x.BranchId) && !x.IsDeleted);

        if (found != chosen.Count)
        {
            throw new InvalidOperationException("A chosen branch was not found.");
        }

        if (chosen.Any(x => !lineBranches.Contains(x)))
        {
            throw new InvalidOperationException($"A chosen branch does not run {string.Join(" / ", info.BusinessLines)} (Business Configuration).");
        }

        string csv = string.Join(",", chosen.OrderBy(x => x).Select(x => x.ToString(CultureInfo.InvariantCulture)));

        if (csv.Length > 1000)
        {
            throw new InvalidOperationException("Too many branches : use All branches.");
        }

        return csv;
    }

    private async Task<CheckedOffer> CheckAsync(ChannelInfo info, SavePromotionalOfferDto dto)
    {
        string name = Limit(dto.OfferName, 150);

        if (name.Length == 0)
        {
            throw new InvalidOperationException("Enter the offer name.");
        }

        string type = (dto.OfferType ?? string.Empty).Trim();

        if (!info.OfferTypes.Contains(type))
        {
            throw new InvalidOperationException($"{info.Title} offers are {string.Join(" / ", info.OfferTypes)}.");
        }

        DateOnly start = ParseDate(dto.StartDate, "Start date");

        DateOnly end = ParseDate(dto.EndDate, "End date");

        if (end < start)
        {
            throw new InvalidOperationException("The end date cannot be before the start date.");
        }

        string fundedBy = (dto.FundedBy ?? string.Empty).Trim();

        if (fundedBy != Company && fundedBy != Distributor)
        {
            throw new InvalidOperationException("Funded by : choose Company or Distributor.");
        }

        // The brand
        long? brandId = dto.BrandManagementId is > 0 ? dto.BrandManagementId : null;

        string brandName = string.Empty;

        if (brandId.HasValue)
        {
            var brand =
                await _context.Set<BrandEntity>()
                    .AsNoTracking()
                    .Where(x => x.BrandManagementId == brandId.Value && !x.IsDeleted)
                    .Select(x => new { x.BrandName, x.OfferAdjustmentLedgerCode })
                    .FirstOrDefaultAsync()
                ?? throw new InvalidOperationException("The brand was not found.");

            brandName = Limit(brand.BrandName, 100);

        }
        else if (fundedBy == Distributor)
        {
            throw new InvalidOperationException("A distributor-funded offer needs its brand.");
        }

        string branchCsv = await BranchCsvAsync(info, dto.AllBranches, dto.BranchIds);

        // The benefit
        bool isDiscount = info.DiscountTypes.Contains(type);

        bool hasPrizes = info.PrizeTypes.Contains(type);

        bool isFreeService = type == FreeService;

        bool isServiceCampaign = type == ServiceCampaign;

        string discountType = (dto.DiscountType ?? Percent).Trim();

        decimal discountValue = Math.Round(dto.DiscountValue, 2);

        // The offer-wide discount is optional : the coverage rows
        // carry their own (2026-11-13)
        if (isDiscount && discountValue > 0)
        {
            CheckDiscount(discountType, discountValue, "Discount");
        }
        else if (isDiscount)
        {
            discountType = Percent;
            discountValue = 0;
        }
        else
        {
            discountType = Percent;
            discountValue = 0;
        }

        int freeServices = 0;

        int claimDays = 0;

        if (isFreeService)
        {
            freeServices = dto.FreeServiceCount;

            claimDays = dto.ClaimDays;

            if (freeServices <= 0 || freeServices > 50)
            {
                throw new InvalidOperationException("Free Service : enter how many free services (1 to 50).");
            }

            if (claimDays < 0 || claimDays > 3650)
            {
                throw new InvalidOperationException("Free Service : claim days must be 0 to 3650.");
            }
        }

        // Service Campaign : free services per bike (0 = none). They
        // are taken only within the offer dates (no claim days), are
        // labour / service charge only, and never use a membership or
        // scheduled free service.
        if (isServiceCampaign)
        {
            // One free service per bike, fixed (owner 2026-11-13 02:21 /
            // 02:24) : no choice on the form
            freeServices = 1;

            claimDays = 0;
        }

        // Prizes (Scratch Card / SMS Offer)
        List<PromotionalOfferPrizeDto> prizes = new();

        if (hasPrizes)
        {
            foreach (PromotionalOfferPrizeDto p in dto.Prizes ?? new List<PromotionalOfferPrizeDto>())
            {
                string prizeName = Limit(p.PrizeName, 150);

                if (prizeName.Length == 0)
                {
                    continue;
                }

                string kind = (p.PrizeKind ?? "Cash").Trim();

                if (kind != "Cash" && kind != "Item" && kind != "Service")
                {
                    throw new InvalidOperationException($"Prize \"{prizeName}\" : the kind is Cash, Item or Service.");
                }

                if (p.PrizeValue < 0 || p.Quantity < 0)
                {
                    throw new InvalidOperationException($"Prize \"{prizeName}\" : value and quantity cannot be negative.");
                }

                prizes.Add(new PromotionalOfferPrizeDto { PrizeName = prizeName, PrizeKind = kind, PrizeValue = Math.Round(p.PrizeValue, 2), Quantity = p.Quantity });
            }

            if (prizes.Count == 0)
            {
                throw new InvalidOperationException($"A {type} offer needs at least one prize.");
            }

            if (prizes.Select(x => x.PrizeName.ToUpperInvariant()).Distinct().Count() != prizes.Count)
            {
                throw new InvalidOperationException("A prize is listed twice.");
            }
        }

        List<CheckedTarget> targets;

        if (isServiceCampaign)
        {
            List<PromotionalOfferTargetDto> all = dto.Targets ?? new List<PromotionalOfferTargetDto>();

            List<PromotionalOfferTargetDto> modelRows =
                all.Where(t => string.Equals((t.TargetType ?? string.Empty).Trim(), ModelTarget, StringComparison.Ordinal)).ToList();

            List<PromotionalOfferTargetDto> partRows = all.Except(modelRows).ToList();

            // Parts are optional when the campaign gives free service
            targets = await CheckTargetsAsync(info, type, brandId, isDiscount, false, partRows, freeServices == 0);

            if (freeServices == 0 && !targets.Any(x => !x.Excluded))
            {
                throw new InvalidOperationException("Switch on Free Service, or add the parts the campaign discounts.");
            }

            targets.AddRange(await CheckModelTargetsAsync(brandId, modelRows));
        }
        else
        {
            targets = await CheckTargetsAsync(info, type, brandId, isDiscount, isDiscount && discountValue > 0, dto.Targets);
        }

        return new CheckedOffer(
            name, type, brandId, brandName, fundedBy, start, end, dto.AllBranches, branchCsv,
            discountType, discountValue, freeServices, claimDays, LimitBlock(dto.Terms, 1000), targets, prizes);
    }

    private async Task<List<CheckedTarget>> CheckTargetsAsync
    (
        ChannelInfo info,
        string offerType,
        long? brandId,
        bool isDiscount,
        bool hasOfferDiscount,
        List<PromotionalOfferTargetDto>? rows,
        bool requireCovered = true
    )
    {
        // Free Service covers bike models; the rest the channel's
        // own products
        string[] categoryTypes = offerType == FreeService ? new[] { BikeType } : info.CategoryTypes;

        Dictionary<long, (string Name, long? BrandId)> categories = await CategoriesAsync(categoryTypes);

        List<CheckedTarget> result = new();

        // (category, sub category) of each row : exceptions are
        // checked against them
        List<(long Category, long Sub)> places = new();

        foreach (PromotionalOfferTargetDto row in rows ?? new List<PromotionalOfferTargetDto>())
        {
            string type = (row.TargetType ?? string.Empty).Trim();

            bool excluded = row.IsExcluded;

            string? ownType = string.IsNullOrWhiteSpace(row.DiscountType) ? null : row.DiscountType!.Trim();

            decimal? ownValue = ownType == null ? null : Math.Round(row.DiscountValue ?? 0, 2);

            // Prizes / Free Service and exceptions carry no discount
            if (!isDiscount || excluded)
            {
                ownType = null;
                ownValue = null;
            }

            long? categoryId;

            long subCategoryId = 0;

            string name;

            switch (type)
            {
                case "All":
                    if (excluded)
                    {
                        throw new InvalidOperationException("Everything cannot be an exception.");
                    }

                    if (isDiscount && !hasOfferDiscount && ownType == null)
                    {
                        throw new InvalidOperationException("Everything : enter its discount.");
                    }

                    if (ownType != null)
                    {
                        CheckDiscount(ownType, ownValue ?? 0, "Everything");
                    }

                    result.Add(new CheckedTarget("All", 0, brandId.HasValue ? "Everything of the brand" : "Everything", ownType, ownValue, false));
                    places.Add((0, 0));
                    continue;

                // Service Campaign (2026-11-13 02:39) : everything of
                // one product type, 1 = Spare Parts, 2 = Lubricants
                case ProductTypeTarget:
                {
                    if (info.Name != "ServiceCenter" || offerType != ServiceCampaign)
                    {
                        throw new InvalidOperationException("A product type row is for a Service Campaign only.");
                    }

                    string? typeName = ProductTypeName(row.TargetId);

                    if (typeName == null)
                    {
                        throw new InvalidOperationException("The product type is Spare Parts or Lubricants.");
                    }

                    string label = $"All {typeName}";

                    if (isDiscount && !excluded && ownType == null)
                    {
                        throw new InvalidOperationException($"{label} : enter its discount.");
                    }

                    if (ownType != null)
                    {
                        CheckDiscount(ownType, ownValue ?? 0, label);
                    }

                    result.Add(new CheckedTarget(ProductTypeTarget, row.TargetId, label, ownType, ownValue, excluded));
                    places.Add((0, 0));
                    continue;
                }

                case "Category":
                    categoryId = categories.ContainsKey(row.TargetId) ? row.TargetId : null;
                    name = categoryId.HasValue ? categories[row.TargetId].Name : string.Empty;
                    break;

                case "SubCategory":
                {
                    var sub =
                        await _context.Set<SubCategoryEntity>()
                            .AsNoTracking()
                            .Where(x => x.ProductSubCategoryId == row.TargetId && !x.IsDeleted)
                            .Select(x => new { x.ProductCategoryId, x.SubCategoryName })
                            .FirstOrDefaultAsync();

                    categoryId = sub != null && categories.ContainsKey(sub.ProductCategoryId) ? sub.ProductCategoryId : null;
                    subCategoryId = row.TargetId;
                    name = sub?.SubCategoryName ?? string.Empty;
                    break;
                }

                case "Product":
                {
                    if (offerType == FreeService)
                    {
                        throw new InvalidOperationException("Free Service covers bike models (or everything), not single products.");
                    }

                    var product = await ProductAsync(info, row.TargetId);

                    categoryId = product != null && categories.ContainsKey(product.Value.CategoryId) ? product.Value.CategoryId : null;
                    subCategoryId = product?.SubCategoryId ?? 0;
                    name = product?.Name ?? string.Empty;
                    break;
                }

                default:
                    throw new InvalidOperationException("A target is All, Category, SubCategory or Product.");
            }

            if (!categoryId.HasValue)
            {
                throw new InvalidOperationException($"A {type} target was not found among the {info.Title} products.");
            }

            long? targetBrand = categories[categoryId.Value].BrandId;

            if (brandId.HasValue && targetBrand.HasValue && targetBrand != brandId)
            {
                throw new InvalidOperationException($"{name} belongs to another brand than the offer's.");
            }

            // Discount offers : every covered row has its discount
            // (the offer itself has none since 2026-11-13)
            if (isDiscount && !excluded && !hasOfferDiscount && ownType == null)
            {
                throw new InvalidOperationException($"{name} : enter its discount.");
            }

            if (ownType != null)
            {
                CheckDiscount(ownType, ownValue ?? 0, name);
            }

            result.Add(new CheckedTarget(type, row.TargetId, Limit(name, 200), ownType, ownValue, excluded));
            places.Add((categoryId.Value, subCategoryId));
        }

        if (requireCovered && result.Count(x => !x.Excluded) == 0)
        {
            throw new InvalidOperationException("Add at least one coverage row (what the offer covers).");
        }

        // Exceptions (2026-11-13 00:48, owner) : any model / bike row
        // can be marked an exception on the Coverage table (a bike of
        // a covered model, or a model / bike row itself); it only
        // leaves that item out, so no wider row is required

        if (result.Select(x => $"{x.Type}:{x.Id}").Distinct().Count() != result.Count)
        {
            throw new InvalidOperationException("A target is listed twice.");
        }

        return result;
    }

    // Service Campaign : the eligible bike models (sub categories of
    // the motor bike categories); exceptions allowed, no discount
    private async Task<List<CheckedTarget>> CheckModelTargetsAsync(long? brandId, List<PromotionalOfferTargetDto> rows)
    {
        List<CheckedTarget> result = new();

        if (rows.Count == 0)
        {
            return result;
        }

        Dictionary<long, (string Name, long? BrandId)> categories = await CategoriesAsync(new[] { BikeType });

        List<long> ids = rows.Select(x => x.TargetId).Distinct().ToList();

        var models =
            await _context.Set<SubCategoryEntity>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.ProductSubCategoryId) && !x.IsDeleted)
                .Select(x => new { x.ProductSubCategoryId, x.ProductCategoryId, x.SubCategoryName })
                .ToDictionaryAsync(x => x.ProductSubCategoryId);

        foreach (PromotionalOfferTargetDto row in rows)
        {
            if (!models.TryGetValue(row.TargetId, out var model) || !categories.TryGetValue(model.ProductCategoryId, out var category))
            {
                throw new InvalidOperationException("An eligible model was not found among the motor bike models.");
            }

            if (brandId.HasValue && category.BrandId.HasValue && category.BrandId != brandId)
            {
                throw new InvalidOperationException($"{model.SubCategoryName} belongs to another brand than the offer's.");
            }

            result.Add(new CheckedTarget(ModelTarget, row.TargetId, Limit(model.SubCategoryName, 200), null, null, row.IsExcluded));
        }

        if (result.Select(x => x.Id).Distinct().Count() != result.Count)
        {
            throw new InvalidOperationException("A model is listed twice.");
        }

        // Only exceptions = every customer except those models

        return result;
    }

    private async Task<(long CategoryId, long SubCategoryId, string Name)?> ProductAsync(ChannelInfo info, long id)
    {
        if (info.Name == "SalesCenter")
        {
            var bike =
                await _context.Set<MotorBikesEntity>().AsNoTracking()
                    .Where(x => x.MotorBikeId == id && !x.IsDeleted)
                    .Select(x => new { x.ProductCategoryId, x.ProductSubCategoryId, x.ProductName })
                    .FirstOrDefaultAsync();

            return bike == null ? null : (bike.ProductCategoryId, bike.ProductSubCategoryId, bike.ProductName);
        }

        if (info.Name == "ServiceCenter")
        {
            var part =
                await _context.Set<SparePartsEntity>().AsNoTracking()
                    .Where(x => x.SparePartId == id && !x.IsDeleted)
                    .Select(x => new { x.ProductCategoryId, x.ProductSubCategoryId, Name = x.PartNumber + " - " + x.PartName })
                    .FirstOrDefaultAsync();

            return part == null ? null : (part.ProductCategoryId, part.ProductSubCategoryId, part.Name);
        }

        var accessory =
            await _context.Set<AccessoriesEntity>().AsNoTracking()
                .Where(x => x.AccessoryId == id && !x.IsDeleted)
                .Select(x => new { x.ProductCategoryId, x.ProductSubCategoryId, Name = x.PartNumber + " - " + x.AccessoryName })
                .FirstOrDefaultAsync();

        return accessory == null ? null : (accessory.ProductCategoryId, accessory.ProductSubCategoryId, accessory.Name);
    }


    //===========================================================
    // The offer's own ledger (owner 2026-11-13) : created on save,
    // the invoices post the offer's discount to it.
    //   Company funded     : in the sub group of the page's
    //                        Campaign Discount ledger (Posting
    //                        Setup CAMPAIGN-DISCOUNT-MB / SP / AC)
    //   Distributor funded : in SUB-002-002-008 Offer Adjustment
    //                        Account (the brands' claim sub group,
    //                        Brand Management)
    // Name "<Offer No> - <Offer Name>" (+ " (<Brand>)" when the
    // distributor pays). A Draft may change who pays : its unused
    // ledger moves (deleted + a new one in the other sub group).
    //===========================================================

    //===========================================================
    // One running offer per motor bike (owner 2026-11-13 01:37)
    //   Sales Center only. A motor bike cannot be on two Active
    //   offers (any offer type : Fixed Discount, Scratch Card,
    //   SMS Offer) whose dates overlap and that share a branch.
    //   Checked on Activate, and when an Active offer's end date
    //   or branches change.
    //   An offer's bikes : its covered rows (All of the brand,
    //   Category, Model, Motor Bike) less its exceptions.
    //===========================================================

    private sealed record BikeRow(long Id, long CategoryId, long SubCategoryId, string Name);

    private static bool BranchesOverlap(bool allA, string csvA, bool allB, string csvB)
    {
        if (allA || allB)
        {
            return true;
        }

        return BranchIdList(csvA).Intersect(BranchIdList(csvB)).Any();
    }

    private static HashSet<long> OfferBikes
    (
        long? brandId,
        List<PromotionalOfferTargets> rows,
        List<BikeRow> bikes,
        Dictionary<long, (string Name, long? BrandId)> categories
    )
    {
        bool Matches(PromotionalOfferTargets t, BikeRow b) =>
            t.TargetType switch
            {
                "All"         => !brandId.HasValue
                                 || (categories.TryGetValue(b.CategoryId, out var c) && c.BrandId == brandId),
                "Category"    => b.CategoryId == t.TargetId,
                "SubCategory" => b.SubCategoryId == t.TargetId,
                "Product"     => b.Id == t.TargetId,
                _             => false
            };

        List<PromotionalOfferTargets> covered = rows.Where(t => !t.IsExcluded).ToList();

        List<PromotionalOfferTargets> excluded = rows.Where(t => t.IsExcluded).ToList();

        return bikes
            .Where(b => covered.Any(t => Matches(t, b)) && !excluded.Any(t => Matches(t, b)))
            .Select(b => b.Id)
            .ToHashSet();
    }

    private async Task CheckBikeClashAsync
    (
        ChannelInfo info,
        PromotionalOffers offer,
        DateOnly start,
        DateOnly end,
        bool allBranches,
        string branchCsv
    )
    {
        if (info.Name != "SalesCenter")
        {
            return;
        }

        List<PromotionalOffers> others =
            await Offers
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.Channel == info.Name
                        && !x.IsDeleted
                        && x.Status == Active
                        && x.PromotionalOfferId != offer.PromotionalOfferId
                        && x.StartDate <= end
                        && start <= x.EndDate
                )
                .ToListAsync();

        others =
            others
                .Where(x => BranchesOverlap(allBranches, branchCsv, x.AllBranches, x.BranchIds))
                .ToList();

        if (others.Count == 0)
        {
            return;
        }

        List<long> ids = others.Select(x => x.PromotionalOfferId).Append(offer.PromotionalOfferId).ToList();

        List<PromotionalOfferTargets> rows =
            await Targets
                .AsNoTracking()
                .Where(t => ids.Contains(t.PromotionalOfferId))
                .ToListAsync();

        List<BikeRow> bikes =
            await _context.Set<MotorBikesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => new BikeRow(x.MotorBikeId, x.ProductCategoryId, x.ProductSubCategoryId, x.ProductName))
                .ToListAsync();

        Dictionary<long, (string Name, long? BrandId)> categories = await CategoriesAsync(new[] { BikeType });

        HashSet<long> mine =
            OfferBikes(offer.BrandManagementId, rows.Where(t => t.PromotionalOfferId == offer.PromotionalOfferId).ToList(), bikes, categories);

        if (mine.Count == 0)
        {
            return;
        }

        List<string> clashes = new();

        foreach (PromotionalOffers other in others.OrderBy(x => x.StartDate).ThenBy(x => x.OfferNo))
        {
            HashSet<long> theirs =
                OfferBikes(other.BrandManagementId, rows.Where(t => t.PromotionalOfferId == other.PromotionalOfferId).ToList(), bikes, categories);

            List<string> names =
                bikes
                    .Where(b => mine.Contains(b.Id) && theirs.Contains(b.Id))
                    .Select(b => b.Name)
                    .OrderBy(n => n)
                    .ToList();

            if (names.Count == 0)
            {
                continue;
            }

            string list = string.Join(", ", names.Take(5)) + (names.Count > 5 ? $" and {names.Count - 5} more" : string.Empty);

            clashes.Add($"{other.OfferNo} {other.OfferName} ({DateText(other.StartDate)} to {DateText(other.EndDate)}) already runs {list}");
        }

        if (clashes.Count > 0)
        {
            throw new InvalidOperationException(
                "A motor bike can be on only one running offer at a time. "
                + string.Join("; ", clashes)
                + ". Close that offer, mark these bikes as exceptions, or change the dates or branches so they do not overlap.");
        }
    }


    private const string OfferClaimSubGroupCode = "SUB-002-002-008";

    private const string LedgerPrefix = "GLR";

    private static string CampaignPurposeOf(string channel) =>
        channel switch
        {
            "SalesCenter" => "CAMPAIGN-DISCOUNT-MB",
            "ServiceCenter" => "CAMPAIGN-DISCOUNT-SP",
            _ => "CAMPAIGN-DISCOUNT-AC"
        };

    private sealed record LedgerParent(AccountClassEntity Class, AccountGroupEntity Group, AccountSubGroupEntity SubGroup);

    // "SUB-002-002-008" -> 8
    private static int LastNumber(string? code)
    {
        string[] parts = (code ?? string.Empty).Trim().Split('-', StringSplitOptions.RemoveEmptyEntries);

        if (parts.Length < 2 || !int.TryParse(parts[^1], out int number) || number < 1)
        {
            throw new InvalidOperationException($"Invalid account code '{code}'.");
        }

        return number;
    }

    // The sub group the offer's ledger belongs in (with its group
    // and class; all active)
    private async Task<LedgerParent> OfferLedgerParentAsync(PromotionalOffers offer)
    {
        string subGroupCode;

        if (offer.FundedBy == Distributor)
        {
            subGroupCode = OfferClaimSubGroupCode;
        }
        else
        {
            string purpose = CampaignPurposeOf(offer.Channel);

            string campaignLedger = PostingLedgerCodes.TryGet(_context, purpose);

            if (campaignLedger.Length == 0)
            {
                throw new InvalidOperationException(
                    $"Posting Setup : {purpose} (Campaign Discount) has no ledger. The offer's ledger is created in that ledger's sub group : choose it on Settings > Account Settings > Posting Setup.");
            }

            subGroupCode =
                await _context.Set<GeneralLedgerEntity>()
                    .AsNoTracking()
                    .Where(x => x.LedgerCode == campaignLedger && !x.IsDeleted)
                    .Select(x => x.SubGroupCode)
                    .FirstOrDefaultAsync()
                ?? throw new InvalidOperationException($"Posting Setup : the Campaign Discount ledger {campaignLedger} ({purpose}) was not found.");
        }

        AccountSubGroupEntity? subGroup =
            await _context.Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.SubGroupCode == subGroupCode && !x.IsDeleted);

        AccountGroupEntity? group =
            subGroup == null
                ? null
                : await _context.Set<AccountGroupEntity>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.AccountGroupId == subGroup.AccountGroupId && !x.IsDeleted);

        AccountClassEntity? accountClass =
            subGroup == null
                ? null
                : await _context.Set<AccountClassEntity>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.AccountClassId == subGroup.AccountClassId && !x.IsDeleted);

        if (subGroup == null || group == null || accountClass == null)
        {
            throw new InvalidOperationException($"Account sub group {subGroupCode} was not found : the offer's ledger is created under it.");
        }

        if (!subGroup.IsActive || !group.IsActive || !accountClass.IsActive)
        {
            throw new InvalidOperationException($"Account sub group {subGroupCode} - {subGroup.SubGroupName} (or its group / class) is inactive. Activate it first.");
        }

        return new LedgerParent(accountClass, group, subGroup);
    }

    private static string OfferLedgerName(PromotionalOffers offer)
    {
        string name = $"{offer.OfferNo} - {offer.OfferName}";

        if (offer.FundedBy == Distributor && !string.IsNullOrWhiteSpace(offer.BrandName))
        {
            name += $" ({offer.BrandName})";
        }

        return Limit(name, 200);
    }

    // Next code in the sub group : GLR-ccc-ggg-sss-nnnnn (deleted
    // ledgers and the codes stored on offers / brands counted)
    private async Task<string> NextLedgerCodeAsync(LedgerParent parent)
    {
        int classNo = LastNumber(parent.Class.ClassCode);

        int groupNo = LastNumber(parent.Group.GroupCode);

        int subGroupNo = LastNumber(parent.SubGroup.SubGroupCode);

        string parentPart = $"{classNo:D3}-{groupNo:D3}-{subGroupNo:D3}";

        List<string> codes =
            await _context.Set<GeneralLedgerEntity>()
                .AsNoTracking()
                .Where(x => x.AccountSubGroupId == parent.SubGroup.AccountSubGroupId)
                .Select(x => x.LedgerCode)
                .ToListAsync();

        codes.AddRange(await Offers.AsNoTracking().Select(x => x.LedgerCode).ToListAsync());

        codes.AddRange(await _context.Set<BrandEntity>().AsNoTracking().Select(x => x.OfferAdjustmentLedgerCode).ToListAsync());

        int highest =
            codes
                .Select
                (
                    code =>
                    {
                        string[] parts = (code ?? string.Empty).Trim().Split('-', StringSplitOptions.RemoveEmptyEntries);

                        return parts.Length == 5
                               && string.Equals(parts[0], LedgerPrefix, StringComparison.OrdinalIgnoreCase)
                               && $"{parts[1]}-{parts[2]}-{parts[3]}" == parentPart
                               && int.TryParse(parts[4], out int number)
                            ? number
                            : 0;
                    }
                )
                .DefaultIfEmpty(0)
                .Max();

        return CodeGenerator.GenerateGeneralLedgerCode(classNo, groupNo, subGroupNo, highest + 1);
    }

    private Task<bool> LedgerHasPostingsAsync(string code) =>
        _context.Set<VoucherEntryEntity>().AsNoTracking().AnyAsync(x => x.LedgerCode == code);

    // Creates the offer's ledger, or keeps its name / sub group in
    // step. The caller saves.
    private async Task EnsureOfferLedgerAsync(PromotionalOffers offer, long userId)
    {
        LedgerParent parent = await OfferLedgerParentAsync(offer);

        string name = OfferLedgerName(offer);

        string code = (offer.LedgerCode ?? string.Empty).Trim();

        GeneralLedgerEntity? ledger =
            code.Length == 0
                ? null
                : await _context.Set<GeneralLedgerEntity>()
                    .FirstOrDefaultAsync(x => x.LedgerCode == code && !x.IsDeleted);

        if (ledger != null && ledger.AccountSubGroupId != parent.SubGroup.AccountSubGroupId)
        {
            // Who pays changed : the old ledger goes (only unused)
            if (await LedgerHasPostingsAsync(ledger.LedgerCode))
            {
                throw new InvalidOperationException($"The offer's ledger {ledger.LedgerCode} already has postings : who pays cannot change.");
            }

            ledger.IsDeleted = true;
            ledger.DeletedBy = userId;
            ledger.DeletedDate = DateTime.UtcNow;

            ledger = null;
        }

        if (ledger != null)
        {
            if (ledger.LedgerName != name)
            {
                ledger.LedgerName = name;
                ledger.ModifiedBy = userId;
                ledger.ModifiedDate = DateTime.UtcNow;
            }

            offer.LedgerName = name;

            return;
        }

        string newCode = await NextLedgerCodeAsync(parent);

        _context.Set<GeneralLedgerEntity>().Add(
            new GeneralLedgerEntity
            {
                AccountClassId = parent.Class.AccountClassId,
                AccountGroupId = parent.Group.AccountGroupId,
                AccountSubGroupId = parent.SubGroup.AccountSubGroupId,
                ClassCode = parent.Class.ClassCode,
                Mode = parent.Class.Mode,
                GroupCode = parent.Group.GroupCode,
                SubGroupCode = parent.SubGroup.SubGroupCode,
                LedgerCode = newCode,
                LedgerName = name,
                Remarks = $"Auto : Promotional Offers ({offer.OfferNo})",
                IsActive = true,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            });

        offer.LedgerCode = newCode;

        offer.LedgerName = name;
    }

    // Delete / Restore carry the offer's (unused) ledger
    private async Task SetOfferLedgerDeletedAsync(PromotionalOffers offer, bool deleted, long userId)
    {
        string code = (offer.LedgerCode ?? string.Empty).Trim();

        if (code.Length == 0)
        {
            return;
        }

        GeneralLedgerEntity? ledger =
            await _context.Set<GeneralLedgerEntity>()
                .Where(x => x.LedgerCode == code && x.IsDeleted == !deleted)
                .OrderByDescending(x => x.GeneralLedgerId)
                .FirstOrDefaultAsync();

        if (ledger == null)
        {
            return;
        }

        if (deleted && await LedgerHasPostingsAsync(code))
        {
            throw new InvalidOperationException($"The offer's ledger {code} has postings : the offer cannot be deleted.");
        }

        ledger.IsDeleted = deleted;
        ledger.DeletedBy = deleted ? userId : null;
        ledger.DeletedDate = deleted ? DateTime.UtcNow : null;
    }


    //===========================================================
    // Write
    //===========================================================

    private void Apply(PromotionalOffers offer, CheckedOffer c)
    {
        offer.OfferName = c.OfferName;
        offer.OfferType = c.OfferType;
        offer.BrandManagementId = c.BrandId;
        offer.BrandName = c.BrandName;
        offer.FundedBy = c.FundedBy;
        offer.StartDate = c.Start;
        offer.EndDate = c.End;
        offer.AllBranches = c.AllBranches;
        offer.BranchIds = c.BranchIds;
        offer.DiscountType = c.DiscountType;
        offer.DiscountValue = c.DiscountValue;
        offer.FreeServiceCount = c.FreeServiceCount;
        offer.ClaimDays = c.ClaimDays;
        offer.Terms = c.Terms;
    }

    private async Task ReplaceLinesAsync(long offerId, CheckedOffer c)
    {
        Targets.RemoveRange(await Targets.Where(x => x.PromotionalOfferId == offerId).ToListAsync());

        Prizes.RemoveRange(await Prizes.Where(x => x.PromotionalOfferId == offerId).ToListAsync());

        int line = 0;

        foreach (CheckedTarget t in c.Targets)
        {
            Targets.Add(
                new PromotionalOfferTargets
                {
                    PromotionalOfferId = offerId,
                    LineNo = ++line,
                    TargetType = t.Type,
                    TargetId = t.Id,
                    TargetName = t.Name,
                    DiscountType = t.DiscountType,
                    DiscountValue = t.DiscountValue,
                    IsExcluded = t.Excluded
                });
        }

        line = 0;

        foreach (PromotionalOfferPrizeDto p in c.Prizes)
        {
            Prizes.Add(
                new PromotionalOfferPrizes
                {
                    PromotionalOfferId = offerId,
                    LineNo = ++line,
                    PrizeName = p.PrizeName,
                    PrizeKind = p.PrizeKind,
                    PrizeValue = p.PrizeValue,
                    Quantity = p.Quantity,
                    GivenQuantity = 0
                });
        }
    }


    public async Task<PromotionalOfferSavedDto> CreateAsync(string channel, SavePromotionalOfferDto dto, long userId)
    {
        ChannelInfo info = ChannelOf(channel);

        CheckedOffer c = await CheckAsync(info, dto ?? new SavePromotionalOfferDto());

        PromotionalOffers offer =
            new()
            {
                Channel = info.Name,
                Status = Draft,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        Apply(offer, c);

        await InTransactionAsync(
            async () =>
            {
                offer.OfferNo = await NextOfferNoAsync(info);

                await EnsureOfferLedgerAsync(offer, userId);

                Offers.Add(offer);

                await _context.SaveChangesAsync();

                await ReplaceLinesAsync(offer.PromotionalOfferId, c);

                AddHistory(offer, "Create", "Promotional Offer Created",
                    $"{offer.OfferNo} {offer.OfferName} ({offer.OfferType}, {offer.FundedBy}) {DateText(offer.StartDate)} to {DateText(offer.EndDate)}.", userId);

                await _context.SaveChangesAsync();
            });

        return new PromotionalOfferSavedDto { PublicId = offer.PublicId, OfferNo = offer.OfferNo, Status = offer.Status };
    }


    public async Task<PromotionalOfferSavedDto> UpdateAsync(string channel, Guid publicId, SavePromotionalOfferDto dto, long userId)
    {
        ChannelInfo info = ChannelOf(channel);

        dto ??= new SavePromotionalOfferDto();

        PromotionalOffers offer = await FindAsync(info, publicId);

        if (offer.Status == Draft)
        {
            CheckedOffer c = await CheckAsync(info, dto);

            await InTransactionAsync(
                async () =>
                {
                    Apply(offer, c);

                    offer.ModifiedBy = userId;
                    offer.ModifiedDate = DateTime.UtcNow;

                    await EnsureOfferLedgerAsync(offer, userId);

                    await ReplaceLinesAsync(offer.PromotionalOfferId, c);

                    AddHistory(offer, "Update", "Promotional Offer Updated", $"{offer.OfferNo} {offer.OfferName} changed (draft).", userId);

                    await _context.SaveChangesAsync();
                });
        }
        else if (offer.Status == Active)
        {
            // A running offer : only name, end date, branches, terms
            string name = Limit(dto.OfferName, 150);

            if (name.Length == 0)
            {
                throw new InvalidOperationException("Enter the offer name.");
            }

            DateOnly end = ParseDate(dto.EndDate, "End date");

            if (end < offer.StartDate)
            {
                throw new InvalidOperationException("The end date cannot be before the start date.");
            }

            if (end < Today && end != offer.EndDate)
            {
                throw new InvalidOperationException("The end date cannot be moved into the past : Close the offer instead.");
            }

            string branchCsv = await BranchCsvAsync(info, dto.AllBranches, dto.BranchIds);

            // A longer period or more branches may now meet another
            // running offer's bikes
            if (end > offer.EndDate || dto.AllBranches != offer.AllBranches || branchCsv != offer.BranchIds)
            {
                await CheckBikeClashAsync(info, offer, offer.StartDate, end, dto.AllBranches, branchCsv);
            }

            string before = $"{offer.OfferName}, ends {DateText(offer.EndDate)}";

            offer.OfferName = name;
            offer.EndDate = end;
            offer.AllBranches = dto.AllBranches;
            offer.BranchIds = branchCsv;
            offer.Terms = LimitBlock(dto.Terms, 1000);
            offer.ModifiedBy = userId;
            offer.ModifiedDate = DateTime.UtcNow;

            await EnsureOfferLedgerAsync(offer, userId);

            AddHistory(offer, "Update", "Active Promotional Offer Updated",
                $"{offer.OfferNo} : was {before}; now {offer.OfferName}, ends {DateText(offer.EndDate)}.", userId);

            await _context.SaveChangesAsync();
        }
        else
        {
            throw new InvalidOperationException($"A {offer.Status.ToLowerInvariant()} offer cannot be changed.");
        }

        return new PromotionalOfferSavedDto { PublicId = offer.PublicId, OfferNo = offer.OfferNo, Status = offer.Status };
    }


    public async Task ActivateAsync(string channel, Guid publicId, long userId)
    {
        ChannelInfo info = ChannelOf(channel);

        PromotionalOffers offer = await FindAsync(info, publicId);

        if (offer.Status != Draft)
        {
            throw new InvalidOperationException("Only a draft offer is activated.");
        }

        if (offer.EndDate < Today)
        {
            throw new InvalidOperationException("The offer's end date has passed : change the dates first.");
        }

        // Check it again (brand ledger, targets may have changed)
        SavePromotionalOfferDto again = (await GetAsync(channel, publicId))!;

        await CheckAsync(info, again);

        // Sales Center : no motor bike on two running offers
        await CheckBikeClashAsync(info, offer, offer.StartDate, offer.EndDate, offer.AllBranches, offer.BranchIds);

        await EnsureOfferLedgerAsync(offer, userId);

        offer.Status = Active;
        offer.StatusReason = string.Empty;
        offer.ModifiedBy = userId;
        offer.ModifiedDate = DateTime.UtcNow;

        AddHistory(offer, "Activate", "Promotional Offer Activated",
            $"{offer.OfferNo} {offer.OfferName} is active {DateText(offer.StartDate)} to {DateText(offer.EndDate)}.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task CloseAsync(string channel, Guid publicId, PromotionalOfferReasonDto dto, long userId)
    {
        ChannelInfo info = ChannelOf(channel);

        PromotionalOffers offer = await FindAsync(info, publicId);

        if (offer.Status != Active)
        {
            throw new InvalidOperationException("Only an active offer is closed.");
        }

        DateOnly today = Today;

        // Closed today : no new invoice gets it from tomorrow
        if (offer.EndDate > today)
        {
            offer.EndDate = today < offer.StartDate ? offer.StartDate : today;
        }

        offer.Status = Closed;
        offer.StatusReason = Limit(dto?.Reason, 300);
        offer.ModifiedBy = userId;
        offer.ModifiedDate = DateTime.UtcNow;

        AddHistory(offer, "Close", "Promotional Offer Closed",
            $"{offer.OfferNo} closed, last day {DateText(offer.EndDate)}. {offer.StatusReason}", userId);

        await _context.SaveChangesAsync();
    }


    public async Task CancelAsync(string channel, Guid publicId, PromotionalOfferReasonDto dto, long userId)
    {
        ChannelInfo info = ChannelOf(channel);

        PromotionalOffers offer = await FindAsync(info, publicId);

        if (offer.Status != Draft && offer.Status != Active)
        {
            throw new InvalidOperationException($"A {offer.Status.ToLowerInvariant()} offer cannot be cancelled.");
        }

        string reason = Limit(dto?.Reason, 300);

        if (reason.Length == 0)
        {
            throw new InvalidOperationException("Enter the reason for cancelling.");
        }

        offer.Status = Cancelled;
        offer.StatusReason = reason;
        offer.ModifiedBy = userId;
        offer.ModifiedDate = DateTime.UtcNow;

        AddHistory(offer, "Cancel", "Promotional Offer Cancelled", $"{offer.OfferNo} cancelled : {reason}", userId);

        await _context.SaveChangesAsync();
    }


    // The most recently deleted offer of the page comes back (as
    // it was : a Draft); false when nothing is deleted
    public async Task<bool> RestoreAsync(string channel, long userId)
    {
        ChannelInfo info = ChannelOf(channel);

        PromotionalOffers? offer =
            await Offers
                .Where(x => x.Channel == info.Name && x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .ThenByDescending(x => x.PromotionalOfferId)
                .FirstOrDefaultAsync();

        if (offer == null)
        {
            return false;
        }

        await SetOfferLedgerDeletedAsync(offer, false, userId);

        offer.IsDeleted = false;
        offer.DeletedBy = null;
        offer.DeletedDate = null;
        offer.ModifiedBy = userId;
        offer.ModifiedDate = DateTime.UtcNow;

        AddHistory(offer, "Restore", "Promotional Offer Restored", $"{offer.OfferNo} {offer.OfferName} restored.", userId);

        await _context.SaveChangesAsync();

        return true;
    }


    public async Task DeleteAsync(string channel, Guid publicId, long userId)
    {
        ChannelInfo info = ChannelOf(channel);

        PromotionalOffers offer = await FindAsync(info, publicId);

        if (offer.Status != Draft)
        {
            throw new InvalidOperationException("Only a draft offer is deleted; cancel or close the others.");
        }

        await SetOfferLedgerDeletedAsync(offer, true, userId);

        offer.IsDeleted = true;
        offer.DeletedBy = userId;
        offer.DeletedDate = DateTime.UtcNow;

        AddHistory(offer, "Delete", "Promotional Offer Deleted", $"{offer.OfferNo} {offer.OfferName} deleted.", userId);

        await _context.SaveChangesAsync();
    }
}
