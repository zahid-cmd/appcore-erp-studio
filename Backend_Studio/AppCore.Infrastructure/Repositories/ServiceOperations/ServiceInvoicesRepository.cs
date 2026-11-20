//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.Platform.Accounting;
using AppCore.Application.ServiceOperations;
using AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles;
using AppCore.Domain.Entities.MembershipManagement.MembershipAssignment;
using AppCore.Domain.Entities.ServiceOperations;
using AppCore.Domain.Entities.Settings.ClientSettings;
using AppCore.Domain.Entities.Settings.ProductSettings;
using AppCore.Domain.Entities.Settings.ServiceSettings;
using AppCore.Domain.Entities.VatManagement.VatSetup;
using AppCore.Domain.Platform.Accounting;
using AppCore.Domain.Platform.Inventory;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.Accounting;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.ServiceOperations;


//===============================================================
// What the billing documents share (hand-written pages, 2026-11-16;
// NEVER run Code Sync for them; tables made by ServiceOperations_
// Billing_Engine.sql)
//===============================================================

internal static class Sb
{
    public const string Posted = "Posted";

    public const string Returned = "Returned";

    public const string Service = "Service";

    public const string Part = "Part";

    public const string Outside = "Outside";

    public const string PartyCustomer = "Customer";

    // Posting Setup, group Service Operations
    public const string PurposeDiscount = "SERVICE-DISCOUNT";

    public const string PurposeOtherIncome = "SERVICE-OTHER-INCOME";

    public const string PurposeOutsideIncome = "OUTSIDE-WORK-INCOME";

    public const string PurposeOutsideCost = "OUTSIDE-WORK-COST";

    public const string PurposeOutsidePayable = "OUTSIDE-WORK-PAYABLE";

    public const string PostingPage = "Settings > Account Settings > Posting Setup (group Service Operations)";

    // VAT Setup types
    public const string VatService = "Service Charges";

    public const string VatSpareParts = "Spare Parts";

    public const string VatAccessories = "Accessories";

    public static readonly string[] Modes = { "Cash", "Bank", "MFS" };

    // A job card can be invoiced from here
    public static readonly string[] Billable = { Ws.WorkDone, Ws.Ready };

    // Job Closing (owner 2026-11-19) : a job in work is closed and
    // billed in one step
    public static readonly string[] Closable = { Ws.InProgress, Ws.WaitingParts, Ws.WorkDone, Ws.Ready };

    public const string MembershipJob = "Membership Service";

    public static void Add(Dictionary<string, decimal> sums, string ledger, decimal amount)
    {
        if (amount != 0m)
        {
            sums[ledger] = (sums.TryGetValue(ledger, out decimal now) ? now : 0m) + amount;
        }
    }

    // A job card goes to another status (with its history line)
    public static void SetStatus(AppDbContext context, JobCards card, string status, string note, long userId)
    {
        card.Status = status;
        card.StatusDate = DateTime.UtcNow;
        card.ModifiedBy = userId;
        card.ModifiedDate = DateTime.UtcNow;

        context.Set<JobCardStatusHistory>().Add(
            new JobCardStatusHistory { JobCardId = card.JobCardId, Status = status, Note = Wp.Limit(note, 300), ChangedBy = userId, ChangedAt = DateTime.UtcNow });
    }
}


//===============================================================
// Service Invoices and Service Returns
//
// One invoice per job card, posted at once under its own voucher
// number (SVI) :
//   Dr customer receivable (the total)     Dr service discount
//   Cr the income ledger of every service, the sales ledger of
//      every part, outside work income     Cr VAT (VAT Setup)
//   Dr brand free service claim ledger     Cr scheduled service income
//      (a free service : what the brand pays back)
//   Dr membership service expense          Cr membership service income
//   Dr cost of goods sold                  Cr Workshop WIP (the FIFO
//      cost of the parts issued to the job, less returns)
//   Dr outside work cost                   Cr outside work payable
// The collection is a posted Receipt Voucher of its own number.
//
// The parts billed are the parts ISSUED to the job card (Parts
// Issues less Parts Returns), not its "parts needed" list, and the
// parts OUTSOURCED for it (bought from a local vendor, no stock) at
// their selling rate; their cost leaves Workshop WIP too.
//
// A Service Return reverses the whole invoice : the journal and the
// VAT register; optionally the receipt; then the parts can go back
// to the store. The job card is Work Done again.
//===============================================================

public class ServiceInvoicesRepository
    : IServiceInvoicesRepository
{
    private const string InvoiceEntity = "ServiceInvoices";

    private const string ReturnEntity = "ServiceReturns";


    private readonly AppDbContext _context;

    private readonly IVoucherNumberService _numberService;

    private readonly IVoucherPostingService _postingService;

    private readonly IVatApplicabilityService _vatApplicability;

    private readonly IReceiptVoucherRepository _receiptVouchers;

    private readonly IServiceEstimatesRepository _estimates;

    private readonly IWorkshopPartsRepository _parts;

    public ServiceInvoicesRepository(
        AppDbContext context,
        IVoucherNumberService numberService,
        IVoucherPostingService postingService,
        IVatApplicabilityService vatApplicability,
        IReceiptVoucherRepository receiptVouchers,
        IServiceEstimatesRepository estimates,
        IWorkshopPartsRepository parts)
    {
        _context = context;
        _numberService = numberService;
        _postingService = postingService;
        _vatApplicability = vatApplicability;
        _receiptVouchers = receiptVouchers;
        _estimates = estimates;
        _parts = parts;
    }

    private DbSet<JobCards> Cards => _context.Set<JobCards>();

    private DbSet<ServiceInvoices> Invoices => _context.Set<ServiceInvoices>();

    private DbSet<ServiceInvoiceLines> Lines => _context.Set<ServiceInvoiceLines>();

    private DbSet<ServiceReturns> Returns => _context.Set<ServiceReturns>();


    //===========================================================
    // Lookups
    //===========================================================

    public async Task<ServiceInvoiceLookupsDto> GetLookupsAsync(bool canCredit)
    {
        List<long> invoiced =
            await Invoices.AsNoTracking().Where(x => x.Status == Sb.Posted).Select(x => x.JobCardId).ToListAsync();

        List<JobCards> cards =
            await Cards.AsNoTracking()
                .Where(x => !x.IsDeleted && Sb.Billable.Contains(x.Status) && !invoiced.Contains(x.JobCardId))
                .OrderByDescending(x => x.JobCardId)
                .ToListAsync();

        return new ServiceInvoiceLookupsDto
        {
            Today = HrCalendar.Day(HrCalendar.Today()),
            JobCards =
                cards.Select(x => new PartsOptionDto
                {
                    PublicId = x.PublicId,
                    No = x.JobCardNo,
                    Text = string.Join("  |  ", new[] { x.JobCardNo, x.CustomerName, x.ModelName, x.RegistrationNo.Length > 0 ? x.RegistrationNo : x.ChassisNo, x.Status }.Where(v => !string.IsNullOrWhiteSpace(v))),
                    BranchId = x.BranchId,
                    JobCardPublicId = x.PublicId
                }).ToList(),
            AllowCredit = (await Ws.SwitchesAsync(_context)).AllowCreditInvoice,
            CanCredit = canCredit
        };
    }


    //===========================================================
    // Pricing : the single source of every figure (the form and
    // the posting)
    //===========================================================

    // A line with where it is posted
    private sealed class PricedLine
    {
        public ServiceInvoiceLineDto Dto { get; init; } = new();

        public string IncomeLedger { get; set; } = string.Empty;

        public string VatLedger { get; set; } = string.Empty;

        // SV / SP / AC (VAT register)
        public string ProductType { get; set; } = "SV";

        // A free scheduled service
        public string ClaimLedger { get; set; } = string.Empty;

        public long? BrandManagementId { get; set; }

        // A free membership service
        public decimal MemberValue { get; set; }

        public string MemberExpenseLedger { get; set; } = string.Empty;

        // A part : cost of goods sold, and the WIP ledgers its cost sits on
        public string CogsLedger { get; set; } = string.Empty;

        public Dictionary<string, decimal> Wip { get; } = new();
    }

    private sealed class Priced
    {
        public JobCards Card { get; init; } = null!;

        public DateOnly Date { get; set; }

        public CustomerProfiles? Customer { get; set; }

        public List<PricedLine> Lines { get; } = new();

        public List<string> Errors { get; } = new();

        public List<string> Warnings { get; } = new();

        public decimal Discount { get; set; }

        public string DiscountLedger { get; set; } = string.Empty;

        public string OutsideCostLedger { get; set; } = string.Empty;

        public string OutsidePayableLedger { get; set; } = string.Empty;

        // The estimate whose collected charge comes off this invoice
        public long? EstimateId { get; set; }

        // (the totals of the lines are after their discounts)
        public decimal Gross => Lines.Sum(x => x.Dto.Total);

        public decimal LineDiscount => Lines.Sum(x => x.Dto.Discount);

        public decimal Grand => Gross - Discount;
    }

    private async Task<SalesVat?> RuleAsync(string vatType, DateOnly date) =>
        await _context.Set<SalesVat>().AsNoTracking()
            .Where(x => !x.IsDeleted && x.Status && x.VatType == vatType && x.EffectiveFrom <= date && x.ValidTo >= date)
            .OrderByDescending(x => x.EffectiveFrom)
            .FirstOrDefaultAsync();

    // VAT of a line : inside the price, or on top of it
    private static void ApplyVat(PricedLine line, SalesVat? rule, string vatLedger, Priced priced)
    {
        ServiceInvoiceLineDto dto = line.Dto;

        dto.Total = dto.Amount;

        if (rule == null || rule.VatRate <= 0m || dto.Amount <= 0m)
        {
            return;
        }

        dto.VatRate = rule.VatRate;

        if (rule.PriceIncludesVat)
        {
            dto.VatAmount = Ws.Round(dto.Amount * rule.VatRate / (100m + rule.VatRate));
        }
        else
        {
            dto.VatAmount = Ws.Round(dto.Amount * rule.VatRate / 100m);
            dto.Total = dto.Amount + dto.VatAmount;
        }

        if (dto.VatAmount > 0m)
        {
            line.VatLedger = vatLedger;

            if (vatLedger.Length == 0)
            {
                priced.Errors.Add($"{dto.ItemName} carries VAT, but the VAT ledger is not selected ({Sb.PostingPage.Replace("group Service Operations", "the VAT purposes")}).");
            }
        }
    }

    private async Task<Priced> PriceAsync(SaveServiceInvoiceDto dto)
    {
        JobCards card =
            await Cards.FirstOrDefaultAsync(x => x.PublicId == dto.JobCardPublicId && !x.IsDeleted)
            ?? throw new InvalidOperationException("Pick the job card.");

        var priced = new Priced { Card = card };

        priced.Date =
            HrCalendar.ParseDay(dto.InvoiceDate)
            ?? throw new InvalidOperationException("Give the date of the invoice.");

        DateOnly date = priced.Date;

        if (date > HrCalendar.Today())
        {
            priced.Errors.Add("The date of an invoice cannot be in the future.");
        }

        if (date < card.JobDate)
        {
            priced.Errors.Add($"The invoice cannot be dated before the job card ({HrCalendar.Day(card.JobDate)}).");
        }

        if (dto.Closing)
        {
            if (!Sb.Closable.Contains(card.Status))
            {
                priced.Errors.Add($"{card.JobCardNo} is {card.Status} : a job is closed when it is in work (In Progress).");
            }
        }
        else if (!Sb.Billable.Contains(card.Status))
        {
            priced.Errors.Add($"{card.JobCardNo} is {card.Status} : a job card is invoiced when its work is done (Work Done or Ready).");
        }

        if (await Invoices.AsNoTracking().AnyAsync(x => x.JobCardId == card.JobCardId && x.Status == Sb.Posted))
        {
            priced.Errors.Add($"{card.JobCardNo} has a service invoice already.");
        }

        // An internal job (own stock bike) bills nobody : only the
        // cost of its parts is posted
        bool billed = card.JobType != Ws.Internal;

        SalesVat? serviceRule = billed ? await RuleAsync(Sb.VatService, date) : null;

        string serviceVatLedger = PostingLedgerCodes.TryGet(_context, PostingPurposes.VatServiceCharges);

        string otherIncome = PostingLedgerCodes.TryGet(_context, Sb.PurposeOtherIncome);

        //-------------------------------------------------------
        // Labour : the services of the job card
        //-------------------------------------------------------

        List<JobCardServices> services =
            await _context.Set<JobCardServices>().AsNoTracking().Where(x => x.JobCardId == card.JobCardId).OrderBy(x => x.LineNo).ToListAsync();

        List<long> Ids(string kind) => services.Where(x => x.ItemKind == kind && x.ItemId != null).Select(x => x.ItemId!.Value).Distinct().ToList();

        List<long> scheduledIds = Ids("Scheduled");
        List<long> laborIds = Ids("LaborChart");
        List<long> customizedIds = Ids("Customized");
        List<long> membershipIds = Ids("Membership");

        Dictionary<long, ScheduledServices> scheduled =
            (await _context.Set<ScheduledServices>().AsNoTracking().Where(x => scheduledIds.Contains(x.ScheduledServiceId)).ToListAsync()).ToDictionary(x => x.ScheduledServiceId);

        List<long> policyIds = scheduled.Values.Select(x => x.ServicePolicyId).Distinct().ToList();

        Dictionary<long, string> claimLedgers =
            (await _context.Set<ServicePolicy>().AsNoTracking().Where(x => policyIds.Contains(x.ServicePolicyId)).Select(x => new { x.ServicePolicyId, x.AssociatedLedgerCode }).ToListAsync())
            .ToDictionary(x => x.ServicePolicyId, x => (x.AssociatedLedgerCode ?? string.Empty).Trim());

        Dictionary<long, string> labor =
            (await _context.Set<LaborChart>().AsNoTracking().Where(x => laborIds.Contains(x.LaborChartId)).Select(x => new { x.LaborChartId, x.IncomeLedgerCode }).ToListAsync())
            .ToDictionary(x => x.LaborChartId, x => (x.IncomeLedgerCode ?? string.Empty).Trim());

        Dictionary<long, string> customized =
            (await _context.Set<CustomizedServices>().AsNoTracking().Where(x => customizedIds.Contains(x.CustomizedServiceId)).Select(x => new { x.CustomizedServiceId, x.IncomeLedgerCode }).ToListAsync())
            .ToDictionary(x => x.CustomizedServiceId, x => (x.IncomeLedgerCode ?? string.Empty).Trim());

        Dictionary<long, MembershipServices> membership =
            (await _context.Set<MembershipServices>().AsNoTracking().Where(x => membershipIds.Contains(x.MembershipServiceId)).ToListAsync()).ToDictionary(x => x.MembershipServiceId);

        foreach (JobCardServices s in services)
        {
            var line =
                new PricedLine
                {
                    Dto =
                        new ServiceInvoiceLineDto
                        {
                            LineType = Sb.Service,
                            ItemKind = s.ItemKind,
                            ItemId = s.ItemId,
                            ItemCode = s.ItemCode,
                            ItemName = s.ItemName,
                            Quantity = s.Quantity,
                            Rate = s.Rate,
                            IsFree = s.IsFree,
                            Amount = !billed || s.IsFree ? 0m : Ws.Round(s.Quantity * s.Rate),
                            Note = s.Note
                        }
                };

            switch (s.ItemKind)
            {
                case "Scheduled" when s.ItemId != null && scheduled.TryGetValue(s.ItemId.Value, out ScheduledServices? row):

                    line.IncomeLedger = (row.IncomeLedgerCode ?? string.Empty).Trim();

                    // A free service : the brand pays its reimbursement back
                    if (billed && s.IsFree && row.BrandReimbursement > 0m)
                    {
                        string claimLedger = claimLedgers.TryGetValue(row.ServicePolicyId, out string? code) ? code : string.Empty;

                        if (claimLedger.Length == 0 || line.IncomeLedger.Length == 0)
                        {
                            priced.Warnings.Add($"{s.ItemName} : the brand reimbursement is not posted, because the Service Policy has no claim ledger or the service has no income ledger.");
                        }
                        else
                        {
                            line.Dto.ClaimAmount = Ws.Round(row.BrandReimbursement * s.Quantity);
                            line.ClaimLedger = claimLedger;
                            line.BrandManagementId = row.BrandManagementId;
                        }
                    }

                    break;

                case "LaborChart" when s.ItemId != null && labor.TryGetValue(s.ItemId.Value, out string? code):
                    line.IncomeLedger = code;
                    break;

                case "Customized" when s.ItemId != null && customized.TryGetValue(s.ItemId.Value, out string? code):
                    line.IncomeLedger = code;
                    break;

                case "Membership" when s.ItemId != null && membership.TryGetValue(s.ItemId.Value, out MembershipServices? row):

                    line.IncomeLedger = (row.IncomeLedgerCode ?? string.Empty).Trim();

                    // Free under the membership : its value moves from
                    // the membership expense to the service income
                    if (billed && line.Dto.Amount == 0m && row.ServiceValue > 0m)
                    {
                        string expense = (row.ExpenseLedgerCode ?? string.Empty).Trim();

                        if (expense.Length == 0 || line.IncomeLedger.Length == 0)
                        {
                            priced.Warnings.Add($"{s.ItemName} : the membership service value is not posted, because the service has no income or expense ledger.");
                        }
                        else
                        {
                            line.MemberValue = Ws.Round(row.ServiceValue * s.Quantity);
                            line.MemberExpenseLedger = expense;
                        }
                    }

                    break;

                default:
                    line.IncomeLedger = otherIncome;
                    break;
            }

            if (line.Dto.Amount > 0m && line.IncomeLedger.Length == 0)
            {
                priced.Errors.Add(
                    s.ItemKind == "Other" || s.ItemId == null
                        ? $"{s.ItemName} is typed labour : select the Other Service Income ledger ({Sb.PostingPage})."
                        : $"{s.ItemName} has no income ledger (Service Setup).");
            }

            ApplyVat(line, serviceRule, serviceVatLedger, priced);

            priced.Lines.Add(line);
        }

        //-------------------------------------------------------
        // Parts : what was issued to the job card, less returns
        //-------------------------------------------------------

        List<long> issueIds =
            await _context.Set<PartsIssues>().AsNoTracking().Where(x => x.JobCardId == card.JobCardId).Select(x => x.PartsIssueId).ToListAsync();

        List<PartsIssueLines> issued =
            issueIds.Count == 0
                ? new List<PartsIssueLines>()
                : await _context.Set<PartsIssueLines>().AsNoTracking().Where(x => issueIds.Contains(x.PartsIssueId)).OrderBy(x => x.PartsIssueLineId).ToListAsync();

        List<JobCardParts> needed =
            await _context.Set<JobCardParts>().AsNoTracking().Where(x => x.JobCardId == card.JobCardId).OrderBy(x => x.LineNo).ToListAsync();

        var groups =
            issued
                .GroupBy(x => new { x.ItemKind, x.ItemId })
                .Select(g => new
                {
                    g.Key.ItemKind,
                    g.Key.ItemId,
                    First = g.First(),
                    Quantity = g.Sum(x => x.Quantity - x.ReturnedQuantity),
                    Cost = g.Sum(x => x.Cost - x.ReturnedCost),
                    Wip = g.GroupBy(x => x.WipLedgerCode.Trim()).Select(w => new { Ledger = w.Key, Cost = w.Sum(x => x.Cost - x.ReturnedCost) }).ToList()
                })
                .Where(x => x.Quantity > 0m)
                .ToList();

        List<long> spareIds = groups.Where(x => x.ItemKind == Wp.SparePart).Select(x => x.ItemId).ToList();
        List<long> accessoryIds = groups.Where(x => x.ItemKind == Wp.Accessory).Select(x => x.ItemId).ToList();

        var spareLedgers =
            (await _context.Set<SpareParts>().AsNoTracking().Where(x => spareIds.Contains(x.SparePartId)).Select(x => new { x.SparePartId, x.SalesLedgerCode, x.CogsLedgerCode }).ToListAsync())
            .ToDictionary(x => x.SparePartId);

        var accessoryLedgers =
            (await _context.Set<Accessories>().AsNoTracking().Where(x => accessoryIds.Contains(x.AccessoryId)).Select(x => new { x.AccessoryId, x.SalesLedgerCode, x.CogsLedgerCode }).ToListAsync())
            .ToDictionary(x => x.AccessoryId);

        // The price list, read only when a part has no price on the job card
        Dictionary<string, decimal>? prices = null;

        SalesVat? spareRule = null;
        SalesVat? accessoryRule = null;

        if (billed && spareIds.Count > 0 && (await _vatApplicability.GetAsync("SP", date)).SalesVatApplicable)
        {
            spareRule = await RuleAsync(Sb.VatSpareParts, date);
        }

        if (billed && accessoryIds.Count > 0 && (await _vatApplicability.GetAsync("AC", date)).SalesVatApplicable)
        {
            accessoryRule = await RuleAsync(Sb.VatAccessories, date);
        }

        string spareVatLedger = PostingLedgerCodes.TryGet(_context, PostingPurposes.VatSpareParts);
        string accessoryVatLedger = PostingLedgerCodes.TryGet(_context, PostingPurposes.VatAccessories);

        foreach (var g in groups)
        {
            bool accessory = g.ItemKind == Wp.Accessory;

            JobCardParts? onCard = needed.FirstOrDefault(x => x.ItemKind == g.ItemKind && x.ItemId == g.ItemId);

            decimal rate = onCard?.Rate ?? 0m;

            if (onCard == null && billed)
            {
                prices ??=
                    (await _estimates.GetPartsAsync())
                    .GroupBy(x => $"{x.Kind}:{x.Id}")
                    .ToDictionary(x => x.Key, x => x.First().Price ?? 0m);

                rate = prices.TryGetValue($"{g.ItemKind}:{g.ItemId}", out decimal price) ? price : 0m;

                if (rate <= 0m)
                {
                    priced.Warnings.Add($"{g.First.ItemName} has no price : it is billed at 0. Put it on the job card (or the estimate) with its price before invoicing.");
                }
            }

            string sales = string.Empty;
            string cogs = string.Empty;

            if (accessory && accessoryLedgers.TryGetValue(g.ItemId, out var a))
            {
                sales = (a.SalesLedgerCode ?? string.Empty).Trim();
                cogs = (a.CogsLedgerCode ?? string.Empty).Trim();
            }
            else if (!accessory && spareLedgers.TryGetValue(g.ItemId, out var p))
            {
                sales = (p.SalesLedgerCode ?? string.Empty).Trim();
                cogs = (p.CogsLedgerCode ?? string.Empty).Trim();
            }

            var line =
                new PricedLine
                {
                    Dto =
                        new ServiceInvoiceLineDto
                        {
                            LineType = Sb.Part,
                            ItemKind = g.ItemKind,
                            ItemId = g.ItemId,
                            ItemCode = g.First.ItemCode,
                            ItemName = g.First.ItemName,
                            Quantity = g.Quantity,
                            Rate = rate,
                            Amount = billed ? Ws.Round(g.Quantity * rate) : 0m,
                            Cost = g.Cost,
                            Note = onCard?.Note ?? string.Empty
                        },
                    IncomeLedger = sales,
                    CogsLedger = cogs,
                    ProductType = accessory ? "AC" : "SP"
                };

            foreach (var w in g.Wip)
            {
                Sb.Add(line.Wip, w.Ledger, w.Cost);
            }

            if (line.Dto.Amount > 0m && sales.Length == 0)
            {
                priced.Errors.Add($"{g.First.ItemName} has no sales ledger (Product Settings).");
            }

            if (g.Cost > 0m && cogs.Length == 0)
            {
                priced.Errors.Add($"{g.First.ItemName} has no cost of goods sold ledger (Product Settings).");
            }

            ApplyVat(line, accessory ? accessoryRule : spareRule, accessory ? accessoryVatLedger : spareVatLedger, priced);

            priced.Lines.Add(line);
        }

        // Parts typed on the job card (not of the product lists, so
        // not from the store) are billed as they are
        foreach (JobCardParts part in needed.Where(x => x.ItemId == null || (x.ItemKind != Wp.SparePart && x.ItemKind != Wp.Accessory)))
        {
            var line =
                new PricedLine
                {
                    Dto =
                        new ServiceInvoiceLineDto
                        {
                            LineType = Sb.Part,
                            ItemKind = "Other",
                            ItemCode = part.ItemCode,
                            ItemName = part.ItemName,
                            Quantity = part.Quantity,
                            Rate = part.Rate,
                            Amount = billed ? Ws.Round(part.Quantity * part.Rate) : 0m,
                            Note = part.Note
                        },
                    IncomeLedger = otherIncome,
                    ProductType = "SP"
                };

            if (line.Dto.Amount > 0m && otherIncome.Length == 0)
            {
                priced.Errors.Add($"{part.ItemName} is a typed part : select the Other Service Income ledger ({Sb.PostingPage}).");
            }

            ApplyVat(line, spareRule ?? (billed && (await _vatApplicability.GetAsync("SP", date)).SalesVatApplicable ? await RuleAsync(Sb.VatSpareParts, date) : null), spareVatLedger, priced);

            priced.Lines.Add(line);
        }

        //-------------------------------------------------------
        // Parts outsourced for the job card : bought from a local
        // vendor, never in stock. Billed at their selling rate;
        // the cost was put on Workshop WIP when they were bought
        //-------------------------------------------------------

        List<JobCardOutsourcedParts> allBought = await Wo.PostedAsync(_context, card.JobCardId);

        // (the outside works entered on the job card are billed with
        // the outside work, below)
        List<JobCardOutsourcedParts> outsourced = allBought.Where(x => x.ItemKind != Wo.OutsideWork).ToList();

        if (outsourced.Count > 0)
        {
            List<long> boughtSpareIds = outsourced.Where(x => x.ItemKind == Wp.SparePart && x.ItemId != null).Select(x => x.ItemId!.Value).Distinct().ToList();
            List<long> boughtAccessoryIds = outsourced.Where(x => x.ItemKind == Wp.Accessory && x.ItemId != null).Select(x => x.ItemId!.Value).Distinct().ToList();

            var boughtSpares =
                (await _context.Set<SpareParts>().AsNoTracking().Where(x => boughtSpareIds.Contains(x.SparePartId)).Select(x => new { x.SparePartId, x.SalesLedgerCode, x.CogsLedgerCode }).ToListAsync())
                .ToDictionary(x => x.SparePartId);

            var boughtAccessories =
                (await _context.Set<Accessories>().AsNoTracking().Where(x => boughtAccessoryIds.Contains(x.AccessoryId)).Select(x => new { x.AccessoryId, x.SalesLedgerCode, x.CogsLedgerCode }).ToListAsync())
                .ToDictionary(x => x.AccessoryId);

            string outsourcedCost = PostingLedgerCodes.TryGet(_context, Wo.PurposeCost);

            SalesVat? boughtSpareRule =
                spareRule ?? (billed && (await _vatApplicability.GetAsync("SP", date)).SalesVatApplicable ? await RuleAsync(Sb.VatSpareParts, date) : null);

            SalesVat? boughtAccessoryRule =
                accessoryRule ?? (billed && boughtAccessoryIds.Count > 0 && (await _vatApplicability.GetAsync("AC", date)).SalesVatApplicable ? await RuleAsync(Sb.VatAccessories, date) : null);

            foreach (JobCardOutsourcedParts bought in outsourced)
            {
                bool accessory = bought.ItemKind == Wp.Accessory;

                string sales = otherIncome;
                string cogs = outsourcedCost;

                if (accessory && bought.ItemId != null && boughtAccessories.TryGetValue(bought.ItemId.Value, out var a))
                {
                    sales = (a.SalesLedgerCode ?? string.Empty).Trim();
                    cogs = (a.CogsLedgerCode ?? string.Empty).Trim();
                }
                else if (bought.ItemKind == Wp.SparePart && bought.ItemId != null && boughtSpares.TryGetValue(bought.ItemId.Value, out var p))
                {
                    sales = (p.SalesLedgerCode ?? string.Empty).Trim();
                    cogs = (p.CogsLedgerCode ?? string.Empty).Trim();
                }

                bool typed = bought.ItemId == null;

                var line =
                    new PricedLine
                    {
                        Dto =
                            new ServiceInvoiceLineDto
                            {
                                LineType = Sb.Part,
                                ItemKind = bought.ItemKind,
                                ItemId = bought.ItemId,
                                ItemCode = bought.ItemCode,
                                ItemName = bought.ItemName,
                                Quantity = bought.Quantity,
                                Rate = bought.SellRate,
                                Amount = billed ? bought.SellAmount : 0m,
                                Cost = bought.CostAmount,
                                IsOutsourced = true,
                                Note = Wp.Limit($"Outsourced {bought.PurchaseNo} : {bought.VendorName}", 200)
                            },
                        IncomeLedger = sales,
                        CogsLedger = cogs,
                        ProductType = accessory ? "AC" : "SP"
                    };

                Sb.Add(line.Wip, bought.WipLedgerCode.Trim(), bought.CostAmount);

                if (line.Dto.Amount > 0m && sales.Length == 0)
                {
                    priced.Errors.Add(typed
                        ? $"{bought.ItemName} is a typed outsourced part : select the Other Service Income ledger ({Sb.PostingPage})."
                        : $"{bought.ItemName} has no sales ledger (Product Settings).");
                }

                if (bought.CostAmount > 0m && cogs.Length == 0)
                {
                    priced.Errors.Add(typed
                        ? $"{bought.ItemName} is a typed outsourced part : select the Outsourced Parts Cost ledger ({Sb.PostingPage})."
                        : $"{bought.ItemName} has no cost of goods sold ledger (Product Settings).");
                }

                ApplyVat(line, accessory ? boughtAccessoryRule : boughtSpareRule, accessory ? accessoryVatLedger : spareVatLedger, priced);

                priced.Lines.Add(line);
            }
        }

        // Parts of the list that the store never issued (and that were
        // not bought outside) are not billed
        foreach (JobCardParts part in needed.Where(x => x.ItemId != null && (x.ItemKind == Wp.SparePart || x.ItemKind == Wp.Accessory)))
        {
            decimal got =
                groups.Where(x => x.ItemKind == part.ItemKind && x.ItemId == part.ItemId).Sum(x => x.Quantity)
                + outsourced.Where(x => x.ItemKind == part.ItemKind && x.ItemId == part.ItemId).Sum(x => x.Quantity);

            if (got < part.Quantity && !dto.Closing)
            {
                priced.Warnings.Add($"{part.ItemName} : the job card needs {Wp.Qty(part.Quantity)}, {Wp.Qty(got)} was issued or outsourced. Only issued and outsourced parts are billed.");
            }
        }

        //-------------------------------------------------------
        // Outside work : entered on the job card (the vendor was
        // credited there, the cost sits on Workshop WIP), or typed
        // on the invoice
        //-------------------------------------------------------

        string outsideIncome = PostingLedgerCodes.TryGet(_context, Sb.PurposeOutsideIncome);

        priced.OutsideCostLedger = PostingLedgerCodes.TryGet(_context, Sb.PurposeOutsideCost);
        priced.OutsidePayableLedger = PostingLedgerCodes.TryGet(_context, Sb.PurposeOutsidePayable);

        foreach (JobCardOutsourcedParts done in allBought.Where(x => x.ItemKind == Wo.OutsideWork))
        {
            var line =
                new PricedLine
                {
                    Dto =
                        new ServiceInvoiceLineDto
                        {
                            LineType = Sb.Outside,
                            ItemKind = "Other",
                            ItemCode = done.ItemCode,
                            ItemName = done.ItemName,
                            Quantity = done.Quantity,
                            Rate = done.SellRate,
                            Amount = billed ? done.SellAmount : 0m,
                            Cost = done.CostAmount,
                            Note = Wp.Limit($"{done.PurchaseNo} : {done.VendorName}", 200)
                        },
                    IncomeLedger = outsideIncome
                };

            Sb.Add(line.Wip, done.WipLedgerCode.Trim(), done.CostAmount);

            if (line.Dto.Amount > 0m && outsideIncome.Length == 0)
            {
                priced.Errors.Add($"Outside work is billed : select the Outside Work Income ledger ({Sb.PostingPage}).");
            }

            if (done.CostAmount > 0m && priced.OutsideCostLedger.Length == 0)
            {
                priced.Errors.Add($"Outside work has a cost : select the Outside Work Cost ledger ({Sb.PostingPage}).");
            }

            ApplyVat(line, serviceRule, serviceVatLedger, priced);

            priced.Lines.Add(line);
        }

        foreach (ServiceInvoiceLineDto o in dto.OutsideLines ?? new())
        {
            string name = Ws.Clean(o.ItemName, 200, "Outside Work");

            if (name.Length == 0)
            {
                priced.Errors.Add("Say what the outside work is, or remove the empty line.");
                continue;
            }

            decimal amount = billed ? Ws.Round(o.Amount) : 0m;
            decimal cost = Ws.Round(o.Cost);

            if (amount < 0m || cost < 0m)
            {
                priced.Errors.Add($"{name} : the charge and the cost cannot be less than 0.");
                continue;
            }

            var line =
                new PricedLine
                {
                    Dto =
                        new ServiceInvoiceLineDto
                        {
                            LineType = Sb.Outside,
                            ItemKind = "Other",
                            ItemName = name,
                            Quantity = 1m,
                            Rate = amount,
                            Amount = amount,
                            Cost = cost,
                            Note = Ws.Clean(o.Note, 200, "Vendor")
                        },
                    IncomeLedger = outsideIncome
                };

            if (amount > 0m && outsideIncome.Length == 0)
            {
                priced.Errors.Add($"Outside work is billed : select the Outside Work Income ledger ({Sb.PostingPage}).");
            }

            if (cost > 0m && (priced.OutsideCostLedger.Length == 0 || priced.OutsidePayableLedger.Length == 0))
            {
                priced.Errors.Add($"Outside work has a cost : select the Outside Work Cost and the Outside Work Payable ledgers ({Sb.PostingPage}).");
            }

            ApplyVat(line, serviceRule, serviceVatLedger, priced);

            priced.Lines.Add(line);
        }

        //-------------------------------------------------------
        // The item discount (owner 2026-11-19) : a percent that
        // every charged line takes, then an amount the charged
        // lines absorb by their value (the last one takes what the
        // rounding leaves). VAT is counted after the discount.
        //-------------------------------------------------------

        for (int i = 0; i < priced.Lines.Count; i++)
        {
            priced.Lines[i].Dto.LineNo = i + 1;
        }

        decimal itemPercent = billed ? dto.ItemDiscountPercent : 0m;

        decimal itemAmount = billed ? Ws.Round(dto.ItemDiscountAmount) : 0m;

        if (itemPercent < 0m || itemPercent > 100m)
        {
            priced.Errors.Add("The item discount percent is between 0 and 100.");
            itemPercent = 0m;
        }

        List<ServiceInvoiceLineDto> charged = priced.Lines.Select(l => l.Dto).Where(l => l.Amount > 0m).ToList();

        if (itemPercent > 0m)
        {
            foreach (ServiceInvoiceLineDto x in charged)
            {
                x.Discount = Ws.Round(x.Amount * itemPercent / 100m);
                x.DiscountText = itemPercent.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture) + "%";
            }
        }

        decimal open = charged.Sum(x => x.Amount - x.Discount);

        if (itemAmount < 0m || itemAmount > open)
        {
            priced.Errors.Add($"The item discount amount cannot be less than 0 or more than the lines ({open:N2}).");
            itemAmount = 0m;
        }

        if (itemAmount > 0m && open > 0m)
        {
            decimal left = itemAmount;

            ServiceInvoiceLineDto last = charged.Last(x => x.Amount - x.Discount > 0m);

            foreach (ServiceInvoiceLineDto x in charged.Where(x => x.Amount - x.Discount > 0m))
            {
                decimal room = x.Amount - x.Discount;

                decimal share = x == last ? left : Math.Min(left, Ws.Round(itemAmount * room / open));

                share = Math.Min(share, room);

                x.Discount += share;

                left -= share;
            }
        }

        foreach (ServiceInvoiceLineDto x in charged.Where(x => x.Discount > 0m))
        {
            // VAT inside the price : the total of the line is its amount
            bool inside = x.VatAmount > 0m && x.Total == x.Amount;

            decimal net = x.Amount - x.Discount;

            if (x.VatAmount > 0m && x.VatRate > 0m)
            {
                x.VatAmount = inside ? Ws.Round(net * x.VatRate / (100m + x.VatRate)) : Ws.Round(net * x.VatRate / 100m);
                x.Total = inside ? net : net + x.VatAmount;
            }
            else
            {
                x.Total = net;
            }
        }

        //-------------------------------------------------------
        // The Estimate Charge the customer paid on the estimate of
        // this job card comes off : the customer took the service
        //-------------------------------------------------------

        ServiceEstimates? paidEstimate =
            !billed
                ? null
                : await _context.Set<ServiceEstimates>().AsNoTracking()
                    .Where(x => x.JobCardId == card.JobCardId && !x.IsDeleted && x.ChargeCollected && x.ChargeInvoiceNo == "" && x.Status != Est.Revised && x.ChargeTotal > 0m)
                    .OrderByDescending(x => x.ServiceEstimateId)
                    .FirstOrDefaultAsync();

        if (paidEstimate != null)
        {
            if (priced.Gross < paidEstimate.ChargeTotal)
            {
                priced.Warnings.Add($"The Estimate Charge paid ({paidEstimate.ChargeTotal:N2}) is more than this invoice : it does not come off.");
            }
            else
            {
                priced.EstimateId = paidEstimate.ServiceEstimateId;

                priced.Lines.Add(
                    new PricedLine
                    {
                        Dto =
                            new ServiceInvoiceLineDto
                            {
                                LineType = Sb.Service,
                                ItemKind = "Other",
                                ItemCode = "EST-CHARGE",
                                ItemName = Wp.Limit($"Less : {paidEstimate.ChargeName} paid on {Est.Name(paidEstimate.EstimateNo, paidEstimate.Version)}", 200),
                                Quantity = 1m,
                                Rate = -paidEstimate.ChargeAmount,
                                Amount = -paidEstimate.ChargeAmount,
                                VatRate = paidEstimate.ChargeVatRate,
                                VatAmount = -paidEstimate.ChargeVatAmount,
                                Total = -paidEstimate.ChargeTotal,
                                Note = paidEstimate.ChargeReceiptVoucherNo,
                                LineNo = priced.Lines.Count + 1
                            },
                        IncomeLedger = paidEstimate.ChargeIncomeLedgerCode,
                        VatLedger = paidEstimate.ChargeVatLedgerCode
                    });
            }
        }

        //-------------------------------------------------------
        // Discount, customer
        //-------------------------------------------------------

        priced.Discount = billed ? Ws.Round(dto.Discount) : 0m;

        if (priced.Discount < 0m || priced.Discount > priced.Gross)
        {
            priced.Errors.Add("The discount cannot be less than 0 or more than the invoice.");
            priced.Discount = 0m;
        }

        if (priced.Discount > 0m || priced.LineDiscount > 0m)
        {
            priced.DiscountLedger = PostingLedgerCodes.TryGet(_context, Sb.PurposeDiscount);

            if (priced.DiscountLedger.Length == 0)
            {
                priced.Errors.Add($"A discount is given : select the Service Discount ledger ({Sb.PostingPage}).");
            }
        }

        if (card.CustomerId != null)
        {
            priced.Customer =
                await _context.Set<CustomerProfiles>().AsNoTracking().FirstOrDefaultAsync(x => x.CustomerId == card.CustomerId && !x.IsDeleted);
        }

        if (priced.Grand > 0m && string.IsNullOrWhiteSpace(priced.Customer?.ReceivableLedgerCode))
        {
            priced.Errors.Add(
                priced.Customer == null
                    ? $"{card.JobCardNo} has no customer of the customer profiles : pick the customer on the job card (move it back to In Progress to change it)."
                    : $"{priced.Customer.CustomerName} has no receivable ledger (Customer Profiles).");
        }

        if (priced.Lines.Count == 0)
        {
            priced.Errors.Add($"{card.JobCardNo} has no labour and no issued parts : there is nothing to invoice.");
        }

        return priced;
    }

    private async Task<ServiceInvoiceDto> DraftAsync(Priced priced, SaveServiceInvoiceDto dto)
    {
        JobCards card = priced.Card;

        var result =
            new ServiceInvoiceDto
            {
                InvoiceDate = HrCalendar.Day(priced.Date),
                Status = string.Empty,
                Discount = priced.Discount,
                Remarks = dto.Remarks ?? string.Empty,
                Lines = priced.Lines.Select(x => x.Dto).ToList(),
                Payments = dto.Payments ?? new()
            };

        FillCard(result, card, await Ws.BranchNamesAsync(_context));

        result.CustomerCode = priced.Customer?.CustomerCode ?? string.Empty;

        Totals(result);

        result.PaidAmount = Ws.Round(result.Payments.Sum(x => x.Amount));
        result.DueAmount = result.GrandTotal - result.PaidAmount;

        result.Warnings.AddRange(priced.Errors.Select(x => "Cannot be posted : " + x));
        result.Warnings.AddRange(priced.Warnings);

        return result;
    }

    private static void Totals(ServiceInvoiceDto dto)
    {
        dto.LabourTotal = dto.Lines.Where(x => x.LineType == Sb.Service).Sum(x => x.Amount);
        dto.PartsTotal = dto.Lines.Where(x => x.LineType == Sb.Part).Sum(x => x.Amount);
        dto.OutsideTotal = dto.Lines.Where(x => x.LineType == Sb.Outside).Sum(x => x.Amount);
        dto.VatTotal = dto.Lines.Sum(x => x.VatAmount);
        dto.PartsCost = dto.Lines.Where(x => x.LineType == Sb.Part).Sum(x => x.Cost);
        dto.LineDiscount = dto.Lines.Sum(x => x.Discount);
        dto.GrandTotal = dto.Lines.Sum(x => x.Total) - dto.Discount;
    }

    private static void FillCard(ServiceInvoiceDto dto, JobCards card, Dictionary<long, string> branches)
    {
        dto.BranchId = card.BranchId;
        dto.BranchName = branches.TryGetValue(card.BranchId, out string? name) ? name : string.Empty;
        dto.JobCardPublicId = card.PublicId;
        dto.JobCardNo = card.JobCardNo;
        dto.JobCardStatus = card.Status;
        dto.JobType = card.JobType;
        dto.CustomerName = card.CustomerName;
        dto.Mobile = card.Mobile;
        dto.BrandName = card.BrandName;
        dto.ModelName = card.ModelName;
        dto.ChassisNo = card.ChassisNo;
        dto.EngineNo = card.EngineNo;
        dto.RegistrationNo = card.RegistrationNo;
        dto.KmReading = card.KmReading;
    }

    // The figures of a job card as an invoice, nothing saved
    public async Task<ServiceInvoiceDto> PriceAsync(SaveServiceInvoiceDto dto, bool canCredit)
    {
        if (dto.Closing)
        {
            // no money at the closing
            dto.Payments = new();
            dto.Deliver = false;
        }

        Priced priced = await PriceAsync(dto);

        // (a closing : the parts not issued show on its Parts tab)
        return await DraftAsync(priced, dto);
    }

    // Job Closing : the parts of a job (allocated, issued, returned,
    // on the job, remaining), its issues and returns, its complaints
    // and observations with what became of them
    public async Task<ClosingDetailDto> GetClosingDetailAsync(Guid jobCardPublicId)
    {
        JobCards card =
            await Cards.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == jobCardPublicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The job card was not found.");

        var result = new ClosingDetailDto();

        List<JobCardParts> needed =
            await _context.Set<JobCardParts>().AsNoTracking().Where(x => x.JobCardId == card.JobCardId).OrderBy(x => x.LineNo).ToListAsync();

        var issued =
            await (from line in _context.Set<PartsIssueLines>().AsNoTracking()
                   join issue in _context.Set<PartsIssues>().AsNoTracking() on line.PartsIssueId equals issue.PartsIssueId
                   where issue.JobCardId == card.JobCardId
                   orderby issue.PartsIssueId, line.LineNo
                   select new { issue.PartsIssueId, issue.IssueNo, issue.MisNo, issue.IssueDate, line.ItemKind, line.ItemId, line.ItemCode, line.ItemName, line.Quantity, line.ReturnedQuantity, line.Cost })
                .ToListAsync();

        var returned =
            await (from line in _context.Set<PartsReturnLines>().AsNoTracking()
                   join back in _context.Set<PartsReturns>().AsNoTracking() on line.PartsReturnId equals back.PartsReturnId
                   where back.JobCardId == card.JobCardId
                   orderby back.PartsReturnId, line.LineNo
                   select new { back.ReturnNo, back.ReturnDate, back.PartsIssueId, line.ItemCode, line.ItemName, line.Quantity, line.Cost })
                .ToListAsync();

        Dictionary<long, string> issueNos = issued.GroupBy(x => x.PartsIssueId).ToDictionary(g => g.Key, g => g.First().IssueNo);

        // the parts of the store, by item : the job card first, then
        // what was issued without being on it
        var keys = new List<(string Kind, long Id)>();

        foreach (JobCardParts part in needed.Where(x => x.ItemId != null && (x.ItemKind == Wp.SparePart || x.ItemKind == Wp.Accessory)))
        {
            if (!keys.Contains((part.ItemKind, part.ItemId!.Value)))
            {
                keys.Add((part.ItemKind, part.ItemId!.Value));
            }
        }

        foreach (var line in issued)
        {
            if (!keys.Contains((line.ItemKind, line.ItemId)))
            {
                keys.Add((line.ItemKind, line.ItemId));
            }
        }

        foreach ((string kind, long id) in keys)
        {
            List<JobCardParts> own = needed.Where(x => x.ItemKind == kind && x.ItemId == id).ToList();

            var moved = issued.Where(x => x.ItemKind == kind && x.ItemId == id).ToList();

            decimal allocated = own.Sum(x => x.Quantity);
            decimal given = moved.Sum(x => x.Quantity);
            decimal back = moved.Sum(x => x.ReturnedQuantity);

            result.Parts.Add(
                new ClosingPartDto
                {
                    ItemKind = kind,
                    ItemCode = own.FirstOrDefault()?.ItemCode ?? moved.First().ItemCode,
                    ItemName = own.FirstOrDefault()?.ItemName ?? moved.First().ItemName,
                    Allocated = allocated,
                    Issued = given,
                    Returned = back,
                    OnJob = given - back,
                    Remaining = Math.Max(0m, allocated - (given - back)),
                    Rate = own.FirstOrDefault()?.Rate ?? 0m
                });
        }

        // parts typed on the job card : never from the store, billed
        // as they are
        foreach (JobCardParts part in needed.Where(x => x.ItemId == null || (x.ItemKind != Wp.SparePart && x.ItemKind != Wp.Accessory)))
        {
            result.Parts.Add(
                new ClosingPartDto
                {
                    ItemKind = "Other",
                    ItemCode = part.ItemCode,
                    ItemName = part.ItemName,
                    Allocated = part.Quantity,
                    OnJob = part.Quantity,
                    Rate = part.Rate
                });
        }

        result.Issues =
            issued.Select(x => new ClosingMoveDto
            {
                DocNo = x.IssueNo,
                RefNo = x.MisNo,
                Date = HrCalendar.Day(x.IssueDate),
                ItemCode = x.ItemCode,
                ItemName = x.ItemName,
                Quantity = x.Quantity,
                Returned = x.ReturnedQuantity,
                Cost = x.Cost
            }).ToList();

        result.Returns =
            returned.Select(x => new ClosingMoveDto
            {
                DocNo = x.ReturnNo,
                RefNo = issueNos.TryGetValue(x.PartsIssueId, out string? no) ? no : string.Empty,
                Date = HrCalendar.Day(x.ReturnDate),
                ItemCode = x.ItemCode,
                ItemName = x.ItemName,
                Quantity = x.Quantity,
                Cost = x.Cost
            }).ToList();

        result.Findings.AddRange(
            (await _context.Set<JobCardComplaints>().AsNoTracking().Where(x => x.JobCardId == card.JobCardId).OrderBy(x => x.LineNo).ToListAsync())
            .Select(x => new ClosingFindingDto { Kind = FindingComplaint, Id = x.JobCardComplaintId, Text = x.Complaint, Result = x.Result, ResultNote = x.ResultNote }));

        result.Findings.AddRange(
            (await _context.Set<JobCardObservations>().AsNoTracking().Where(x => x.JobCardId == card.JobCardId).OrderBy(x => x.LineNo).ToListAsync())
            .Select(x => new ClosingFindingDto { Kind = FindingObservation, Id = x.JobCardObservationId, Text = x.Observation, Note = x.Note, Result = x.Result, ResultNote = x.ResultNote }));

        // the outside works and the parts bought outside for the job
        result.Outsourced =
            (await Wo.PostedAsync(_context, card.JobCardId))
            .Select(x => new ClosingOutsourcedDto
            {
                Kind = x.ItemKind == Wo.OutsideWork ? "Work" : "Part",
                DocNo = x.PurchaseNo,
                Date = HrCalendar.Day(x.PurchaseDate),
                ItemCode = x.ItemCode,
                ItemName = x.ItemName,
                VendorName = x.VendorName,
                BillNo = x.BillNo,
                Quantity = x.Quantity,
                Cost = x.CostAmount,
                Amount = x.SellAmount
            }).ToList();

        return result;
    }

    private const string FindingComplaint = "Complaint";

    private const string FindingObservation = "Observation";

    private static readonly string[] FindingResults = { "Solved", "Needs Further Work", "Not Done" };

    // Job Closing : what became of each complaint and observation is
    // written on the job card. Every one must be marked (owner
    // 2026-11-19) : a job with one left unmarked is not closed
    private async Task SaveFindingsAsync(long jobCardId, List<ClosingFindingDto>? findings)
    {
        findings ??= new List<ClosingFindingDto>();

        List<JobCardComplaints> complaints = await _context.Set<JobCardComplaints>().Where(x => x.JobCardId == jobCardId).ToListAsync();

        List<JobCardObservations> observations = await _context.Set<JobCardObservations>().Where(x => x.JobCardId == jobCardId).ToListAsync();

        foreach (ClosingFindingDto f in findings)
        {
            string result = FindingResults.FirstOrDefault(x => string.Equals(x, (f.Result ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase)) ?? string.Empty;

            string note = Ws.Clean(f.ResultNote, 300, "Note");

            if (f.Kind == FindingComplaint)
            {
                JobCardComplaints? row = complaints.FirstOrDefault(x => x.JobCardComplaintId == f.Id);

                if (row != null)
                {
                    row.Result = result;
                    row.ResultNote = note;
                }
            }
            else
            {
                JobCardObservations? row = observations.FirstOrDefault(x => x.JobCardObservationId == f.Id);

                if (row != null)
                {
                    row.Result = result;
                    row.ResultNote = note;
                }
            }
        }

        int unmarked =
            complaints.Count(x => string.IsNullOrWhiteSpace(x.Result))
            + observations.Count(x => string.IsNullOrWhiteSpace(x.Result));

        if (unmarked > 0)
        {
            throw new InvalidOperationException($"{unmarked} observation(s) of the job are not marked : mark each one Solved, Needs Further Work or Not Done (tab Observations).");
        }
    }

    //-----------------------------------------------------------
    // Job Closing (owner 2026-11-19)
    //-----------------------------------------------------------

    // The parts allocated to the jobs and not issued : job card ->
    // (parts, quantity)
    private async Task<Dictionary<long, (int Parts, decimal Quantity)>> UnissuedAsync(List<long> cardIds)
    {
        var allocated =
            await _context.Set<JobCardParts>().AsNoTracking()
                .Where(x => cardIds.Contains(x.JobCardId) && x.ItemId != null && (x.ItemKind == Wp.SparePart || x.ItemKind == Wp.Accessory))
                .GroupBy(x => new { x.JobCardId, x.ItemKind, x.ItemId })
                .Select(g => new { g.Key.JobCardId, g.Key.ItemKind, g.Key.ItemId, Quantity = g.Sum(x => x.Quantity) })
                .ToListAsync();

        var issued =
            (await (from line in _context.Set<PartsIssueLines>().AsNoTracking()
                    join issue in _context.Set<PartsIssues>().AsNoTracking() on line.PartsIssueId equals issue.PartsIssueId
                    where cardIds.Contains(issue.JobCardId)
                    group line by new { issue.JobCardId, line.ItemKind, line.ItemId } into g
                    select new { g.Key.JobCardId, g.Key.ItemKind, g.Key.ItemId, Quantity = g.Sum(x => x.Quantity - x.ReturnedQuantity) })
                .ToListAsync())
            .ToDictionary(x => $"{x.JobCardId}:{x.ItemKind}:{x.ItemId}", x => x.Quantity);

        return allocated
            .Select(x => new { x.JobCardId, Waiting = x.Quantity - issued.GetValueOrDefault($"{x.JobCardId}:{x.ItemKind}:{x.ItemId}", 0m) })
            .Where(x => x.Waiting > 0m)
            .GroupBy(x => x.JobCardId)
            .ToDictionary(g => g.Key, g => (g.Count(), g.Sum(x => x.Waiting)));
    }

    // The jobs in work that have no bill yet
    public async Task<ClosingLookupsDto> GetClosingLookupsAsync()
    {
        List<long> invoiced =
            await Invoices.AsNoTracking().Where(x => x.Status == Sb.Posted).Select(x => x.JobCardId).ToListAsync();

        List<JobCards> cards =
            await Cards.AsNoTracking()
                .Where(x => !x.IsDeleted && Sb.Closable.Contains(x.Status) && !invoiced.Contains(x.JobCardId))
                .OrderBy(x => x.JobCardId)
                .ToListAsync();

        Dictionary<long, string> branches = await Ws.BranchNamesAsync(_context);

        var unissued = await UnissuedAsync(cards.Select(x => x.JobCardId).ToList());

        return new ClosingLookupsDto
        {
            Today = HrCalendar.Day(HrCalendar.Today()),
            Jobs =
                cards.Select(x =>
                {
                    string serial = (x.WelcomeTokenNo ?? string.Empty).Trim();

                    if (serial.StartsWith("W-", StringComparison.OrdinalIgnoreCase))
                    {
                        serial = serial.Substring(2);
                    }

                    var (parts, quantity) = unissued.GetValueOrDefault(x.JobCardId);

                    return new ClosingJobDto
                    {
                        PublicId = x.PublicId,
                        BranchId = x.BranchId,
                        BranchName = branches.TryGetValue(x.BranchId, out string? name) ? name : string.Empty,
                        JobCardNo = x.JobCardNo,
                        JobDate = HrCalendar.Day(x.JobDate),
                        Status = x.Status,
                        JobType = x.JobType,
                        CustomerName = x.CustomerName,
                        Mobile = x.Mobile,
                        ModelName = x.ModelName,
                        BikeNo = x.RegistrationNo.Length > 0 ? x.RegistrationNo : x.ChassisNo,
                        // 1118004 : the month and the day of the job, the serial of its token
                        SerialToken = serial.Length == 0 ? string.Empty : x.JobDate.ToString("MMdd") + serial,
                        UnissuedParts = parts,
                        UnissuedQuantity = quantity
                    };
                })
                .ToList()
        };
    }


    //===========================================================
    // Reading
    //===========================================================

    private static ServiceInvoiceDto Head(ServiceInvoices x, JobCards? card, Dictionary<long, string> branches)
    {
        var dto = new ServiceInvoiceDto();

        if (card != null)
        {
            FillCard(dto, card, branches);
        }

        dto.Id = x.ServiceInvoiceId;
        dto.PublicId = x.PublicId;
        dto.InvoiceNo = x.InvoiceNo;
        dto.InvoiceDate = HrCalendar.Day(x.InvoiceDate);
        dto.BranchId = x.BranchId;
        dto.BranchName = branches.TryGetValue(x.BranchId, out string? name) ? name : string.Empty;
        dto.JobType = x.JobType;
        dto.CustomerCode = x.CustomerCode;
        dto.CustomerName = x.CustomerName;
        dto.Mobile = x.Mobile;
        dto.BrandName = x.BrandName;
        dto.LabourTotal = x.LabourTotal;
        dto.PartsTotal = x.PartsTotal;
        dto.OutsideTotal = x.OutsideTotal;
        dto.VatTotal = x.VatTotal;
        dto.Discount = x.Discount;
        dto.LineDiscount = x.LineDiscount;
        dto.GrandTotal = x.GrandTotal;
        dto.PaidAmount = x.PaidAmount;
        dto.DueAmount = x.GrandTotal - x.PaidAmount;
        dto.PartsCost = x.PartsCost;
        dto.ReceiptVoucherNo = x.ReceiptVoucherNo;
        dto.Status = x.Status;
        dto.IsDelivered = x.IsDelivered;
        dto.DeliveredAt = Ws.Utc(x.DeliveredAt);
        dto.ReturnNo = x.ReturnNo;
        dto.Remarks = x.Remarks;
        dto.CanDeliver = x.Status == Sb.Posted && !x.IsDelivered;
        dto.CanReturn = x.Status == Sb.Posted;

        return dto;
    }

    public async Task<List<ServiceInvoiceDto>> GetAllAsync()
    {
        List<ServiceInvoices> rows = await Invoices.AsNoTracking().OrderByDescending(x => x.ServiceInvoiceId).ToListAsync();

        List<long> cardIds = rows.Select(x => x.JobCardId).Distinct().ToList();

        Dictionary<long, JobCards> cards =
            (await Cards.AsNoTracking().Where(x => cardIds.Contains(x.JobCardId)).ToListAsync()).ToDictionary(x => x.JobCardId);

        Dictionary<long, string> branches = await Ws.BranchNamesAsync(_context);

        return rows.Select(x => Head(x, cards.TryGetValue(x.JobCardId, out JobCards? card) ? card : null, branches)).ToList();
    }

    private async Task<ServiceInvoiceDto> FullAsync(ServiceInvoices invoice)
    {
        JobCards? card = await Cards.AsNoTracking().FirstOrDefaultAsync(x => x.JobCardId == invoice.JobCardId);

        ServiceInvoiceDto dto = Head(invoice, card, await Ws.BranchNamesAsync(_context));

        dto.Lines =
            (await Lines.AsNoTracking().Where(x => x.ServiceInvoiceId == invoice.ServiceInvoiceId).OrderBy(x => x.LineNo).ToListAsync())
            .Select(x => new ServiceInvoiceLineDto
            {
                LineId = x.ServiceInvoiceLineId,
                LineNo = x.LineNo,
                DiscountText = x.DiscountText,
                Discount = x.Discount,
                LineType = x.LineType,
                ItemKind = x.ItemKind,
                ItemId = x.ItemId,
                ItemCode = x.ItemCode,
                ItemName = x.ItemName,
                Quantity = x.Quantity,
                Rate = x.Rate,
                Amount = x.Amount,
                IsFree = x.IsFree,
                ClaimAmount = x.ClaimAmount,
                VatRate = x.VatRate,
                VatAmount = x.VatAmount,
                Total = x.Total,
                Cost = x.Cost,
                Note = x.Note
            })
            .ToList();

        dto.Payments =
            (await _context.Set<ServiceInvoicePayments>().AsNoTracking().Where(x => x.ServiceInvoiceId == invoice.ServiceInvoiceId).OrderBy(x => x.LineNo).ToListAsync())
            .Select(x => new ServiceInvoicePaymentDto { Mode = x.Mode, LedgerCode = x.LedgerCode, LedgerName = x.LedgerName, Amount = x.Amount, TransactionRef = x.TransactionRef })
            .ToList();

        return dto;
    }

    public async Task<ServiceInvoiceDto> GetAsync(Guid publicId)
    {
        ServiceInvoices invoice =
            await Invoices.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId)
            ?? throw new KeyNotFoundException("The service invoice was not found.");

        return await FullAsync(invoice);
    }


    //===========================================================
    // Posting
    //===========================================================

    public async Task<ServiceInvoiceDto> PostAsync(SaveServiceInvoiceDto dto, bool canCredit, long userId)
    {
        if (dto.Closing)
        {
            // Job Closing : the bill only - the Billing stage collects
            dto.Payments = new();
            dto.Deliver = false;
        }

        Priced priced = await PriceAsync(dto);

        if (priced.Errors.Count > 0)
        {
            throw new InvalidOperationException(priced.Errors[0]);
        }

        JobCards card = priced.Card;

        DateOnly date = priced.Date;

        decimal grand = priced.Grand;

        //-------------------------------------------------------
        // The collection
        //-------------------------------------------------------

        List<ServiceInvoicePaymentDto> payments = (dto.Payments ?? new()).Where(x => x.Amount != 0m || !string.IsNullOrWhiteSpace(x.LedgerCode)).ToList();

        foreach (ServiceInvoicePaymentDto p in payments)
        {
            p.Mode = Sb.Modes.FirstOrDefault(x => string.Equals(x, (p.Mode ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
                     ?? throw new InvalidOperationException("A collection line needs its mode : Cash, Bank or MFS.");

            p.LedgerCode = (p.LedgerCode ?? string.Empty).Trim();
            p.Amount = Ws.Round(p.Amount);
            p.TransactionRef = Ws.Clean(p.TransactionRef, 100, "Transaction ID");

            if (p.LedgerCode.Length == 0)
            {
                throw new InvalidOperationException($"Pick the {p.Mode} account the money goes to.");
            }

            if (p.Amount <= 0m)
            {
                throw new InvalidOperationException($"{p.Mode} : give the amount collected.");
            }

            if (p.Mode == "MFS" && p.TransactionRef.Length == 0)
            {
                throw new InvalidOperationException("MFS : give the transaction ID.");
            }
        }

        decimal paid = payments.Sum(x => x.Amount);

        if (paid > grand)
        {
            throw new InvalidOperationException($"The collection ({paid:N2}) is more than the invoice ({grand:N2}).");
        }

        // (a closing leaves the whole bill on the receivable : that
        // is the stage, not a credit sale)
        if (paid < grand && !dto.Closing)
        {
            WorkshopSwitchesDto switches = await Ws.SwitchesAsync(_context);

            if (!switches.AllowCreditInvoice)
            {
                throw new InvalidOperationException($"A service invoice is paid at delivery : collect the full {grand:N2}. (Credit is off : Workshop Configuration, switch Credit on Service Invoices.)");
            }

            if (!canCredit)
            {
                throw new InvalidOperationException($"A due of {grand - paid:N2} needs the approval of a manager : only a user with the page action Credit Sale can post this invoice.");
            }
        }

        // Fails here when the financial year of the date is not open
        await _numberService.ResolvePeriodAsync(card.BranchId, date);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        DateTime now = DateTime.UtcNow;

        string invoiceNo = (await _numberService.NextAsync(VoucherTypes.ServiceInvoice, card.BranchId, date)).VoucherNo;

        CustomerProfiles? customer = priced.Customer;

        string receivable = (customer?.ReceivableLedgerCode ?? string.Empty).Trim();

        var invoice =
            new ServiceInvoices
            {
                InvoiceNo = invoiceNo,
                InvoiceDate = date,
                BranchId = card.BranchId,
                JobCardId = card.JobCardId,
                JobType = Wp.Limit(card.JobType, 30),
                CustomerId = customer?.CustomerId,
                CustomerCode = Wp.Limit(customer?.CustomerCode, 30),
                CustomerName = Wp.Limit(customer?.CustomerName ?? card.CustomerName, 200),
                Mobile = Wp.Limit(card.Mobile, 30),
                ReceivableLedgerCode = Wp.Limit(receivable, 40),
                BrandName = Wp.Limit(card.BrandName, 100),
                LabourTotal = priced.Lines.Where(x => x.Dto.LineType == Sb.Service).Sum(x => x.Dto.Amount),
                PartsTotal = priced.Lines.Where(x => x.Dto.LineType == Sb.Part).Sum(x => x.Dto.Amount),
                OutsideTotal = priced.Lines.Where(x => x.Dto.LineType == Sb.Outside).Sum(x => x.Dto.Amount),
                VatTotal = priced.Lines.Sum(x => x.Dto.VatAmount),
                Discount = priced.Discount,
                LineDiscount = priced.LineDiscount,
                GrandTotal = grand,
                PaidAmount = paid,
                PartsCost = priced.Lines.Where(x => x.Dto.LineType == Sb.Part).Sum(x => x.Dto.Cost),
                Status = Sb.Posted,
                Remarks = Ws.Clean(dto.Remarks, 500, "Remarks"),
                CreatedBy = userId,
                CreatedDate = now
            };

        Invoices.Add(invoice);

        await _context.SaveChangesAsync();

        //-------------------------------------------------------
        // The lines, the journal sums
        //-------------------------------------------------------

        var debit = new Dictionary<string, decimal>();
        var credit = new Dictionary<string, decimal>();

        var saved = new List<(PricedLine Priced, ServiceInvoiceLines Row)>();

        int lineNo = 0;

        foreach (PricedLine line in priced.Lines)
        {
            ServiceInvoiceLineDto x = line.Dto;

            var row =
                new ServiceInvoiceLines
                {
                    ServiceInvoiceId = invoice.ServiceInvoiceId,
                    LineNo = ++lineNo,
                    LineType = x.LineType,
                    ItemKind = Wp.Limit(x.ItemKind, 15),
                    ItemId = x.ItemId,
                    ItemCode = Wp.Limit(x.ItemCode, 40),
                    ItemName = Wp.Limit(x.ItemName, 200),
                    Quantity = x.Quantity,
                    Rate = x.Rate,
                    Amount = x.Amount,
                    DiscountText = Wp.Limit(x.DiscountText, 20),
                    Discount = x.Discount,
                    IsFree = x.IsFree,
                    ClaimAmount = x.ClaimAmount,
                    ClaimLedgerCode = Wp.Limit(line.ClaimLedger, 40),
                    BrandManagementId = line.BrandManagementId,
                    VatRate = x.VatRate,
                    VatAmount = x.VatAmount,
                    Total = x.Total,
                    Cost = x.Cost,
                    IncomeLedgerCode = Wp.Limit(line.IncomeLedger, 40),
                    Note = Wp.Limit(x.Note, 200)
                };

            Lines.Add(row);

            saved.Add((line, row));

            // the sale : income before VAT, and the VAT
            // (a line discount : the income is credited in full, the
            // discount goes to the Service Discount ledger below)
            if (x.Total > 0m || x.Discount > 0m)
            {
                Sb.Add(credit, line.IncomeLedger, x.Total - x.VatAmount + x.Discount);

                if (x.VatAmount > 0m)
                {
                    Sb.Add(credit, line.VatLedger, x.VatAmount);
                }
            }

            // the Estimate Charge that comes off : its income and
            // its VAT go back
            if (x.Total < 0m)
            {
                Sb.Add(debit, line.IncomeLedger, -(x.Total - x.VatAmount));

                if (x.VatAmount < 0m)
                {
                    Sb.Add(debit, line.VatLedger, -x.VatAmount);
                }
            }

            // a free service : the brand owes its reimbursement
            if (x.ClaimAmount > 0m)
            {
                Sb.Add(debit, line.ClaimLedger, x.ClaimAmount);
                Sb.Add(credit, line.IncomeLedger, x.ClaimAmount);
            }

            // a free membership service
            if (line.MemberValue > 0m)
            {
                Sb.Add(debit, line.MemberExpenseLedger, line.MemberValue);
                Sb.Add(credit, line.IncomeLedger, line.MemberValue);
            }

            // a part : its cost leaves Workshop WIP
            if (x.LineType == Sb.Part && x.Cost > 0m)
            {
                Sb.Add(debit, line.CogsLedger, x.Cost);

                foreach (KeyValuePair<string, decimal> w in line.Wip)
                {
                    Sb.Add(credit, w.Key, w.Value);
                }
            }

            // outside work : what the vendor is owed. One entered on
            // the job card credited the vendor there : its cost
            // leaves Workshop WIP
            if (x.LineType == Sb.Outside && x.Cost > 0m)
            {
                Sb.Add(debit, priced.OutsideCostLedger, x.Cost);

                if (line.Wip.Count > 0)
                {
                    foreach (KeyValuePair<string, decimal> w in line.Wip)
                    {
                        Sb.Add(credit, w.Key, w.Value);
                    }
                }
                else
                {
                    Sb.Add(credit, priced.OutsidePayableLedger, x.Cost);
                }
            }
        }

        // the discounts : of the lines, and of the bill (round off)
        if (priced.Discount + priced.LineDiscount > 0m)
        {
            Sb.Add(debit, priced.DiscountLedger, priced.Discount + priced.LineDiscount);
        }

        await _context.SaveChangesAsync();

        //-------------------------------------------------------
        // VAT register : one Sale row per line that carries VAT
        //-------------------------------------------------------

        foreach ((PricedLine line, ServiceInvoiceLines row) in saved.Where(x => x.Priced.Dto.VatAmount != 0m))
        {
            _context.Set<VatRegister>().Add(
                new VatRegister
                {
                    Direction = "Sale",
                    DocumentType = VoucherTypes.ServiceInvoice,
                    DocumentId = invoice.ServiceInvoiceId,
                    DocumentLineId = row.ServiceInvoiceLineId,
                    DocumentNo = invoice.InvoiceNo,
                    DocumentDate = invoice.InvoiceDate,
                    MushakNo = string.Empty,
                    MushakDate = null,
                    PartyType = Sb.PartyCustomer,
                    PartyCode = invoice.CustomerCode,
                    PartyName = invoice.CustomerName,
                    PartyBin = Wp.Limit(customer?.BinNo, 30),
                    BranchId = invoice.BranchId,
                    ProductType = line.ProductType,
                    ProductId = row.ItemId,
                    ProductCode = row.ItemCode,
                    ProductName = row.ItemName,
                    Quantity = row.Quantity,
                    TaxableValue = row.Total - row.VatAmount,
                    VatRate = row.VatRate,
                    VatAmount = row.VatAmount,
                    VatClaimable = 0m,
                    VatLedgerCode = Wp.Limit(line.VatLedger, 30),
                    IsReversal = false,
                    CreatedBy = userId,
                    CreatedDate = now
                });
        }

        //-------------------------------------------------------
        // The journal
        //-------------------------------------------------------

        string narration = Wp.Limit($"Service invoice of job card {card.JobCardNo} ({invoice.CustomerName})", 300);

        var postingLines = new List<VoucherPostingLine>();

        if (grand > 0m)
        {
            postingLines.Add(
                new VoucherPostingLine { GroupNo = 1, LedgerCode = receivable, Debit = grand, Narration = narration, PartyType = Sb.PartyCustomer, PartyCode = invoice.CustomerCode });
        }

        postingLines.AddRange(debit.Where(x => x.Value > 0m).Select(x => new VoucherPostingLine { GroupNo = 1, LedgerCode = x.Key, Debit = x.Value, Narration = narration }));
        postingLines.AddRange(credit.Where(x => x.Value > 0m).Select(x => new VoucherPostingLine { GroupNo = 1, LedgerCode = x.Key, Credit = x.Value, Narration = narration }));

        if (postingLines.Count >= 2)
        {
            await _postingService.PostAsync(
                new VoucherPostingRequest
                {
                    VoucherType = VoucherTypes.ServiceInvoice,
                    VoucherId = invoice.ServiceInvoiceId,
                    VoucherNo = invoice.InvoiceNo,
                    VoucherDate = invoice.InvoiceDate,
                    BranchId = invoice.BranchId,
                    PartyType = grand > 0m ? Sb.PartyCustomer : string.Empty,
                    PartyCode = grand > 0m ? invoice.CustomerCode : string.Empty,
                    ReferenceNo = card.JobCardNo,
                    Narration = narration,
                    Lines = postingLines
                },
                userId);
        }

        //-------------------------------------------------------
        // The collection : a posted Receipt Voucher of its own number
        //-------------------------------------------------------

        if (paid > 0m)
        {
            string against = $"Against {invoice.InvoiceNo}";

            ReceiptVoucherSavedDto receipt =
                await _receiptVouchers.CreatePostedAsync(
                    new CreateReceiptVoucherDto
                    {
                        VoucherDate = HrCalendar.Day(date),
                        BranchId = invoice.BranchId,
                        Narration = Wp.Limit($"{against} ({invoice.CustomerName})", 500),
                        Debits =
                            payments.Select(p => new ReceiptVoucherDebitDto
                            {
                                Mode = p.Mode,
                                LedgerCode = p.LedgerCode,
                                Amount = p.Amount,
                                TransactionRef = p.TransactionRef,
                                ShortNotes = against
                            }).ToList(),
                        Credits =
                            new List<ReceiptVoucherCreditDto>
                            {
                                new ReceiptVoucherCreditDto
                                {
                                    LedgerType = Sb.PartyCustomer,
                                    LedgerCode = receivable,
                                    PartyCode = invoice.CustomerCode,
                                    Amount = paid,
                                    ShortNotes = against
                                }
                            }
                    },
                    invoice.InvoiceNo,
                    userId);

            invoice.ReceiptVoucherId = receipt.ReceiptVoucherId;
            invoice.ReceiptVoucherNo = receipt.VoucherNo;

            int payNo = 0;

            foreach (ServiceInvoicePaymentDto p in payments)
            {
                _context.Set<ServiceInvoicePayments>().Add(
                    new ServiceInvoicePayments
                    {
                        ServiceInvoiceId = invoice.ServiceInvoiceId,
                        LineNo = ++payNo,
                        Mode = p.Mode,
                        LedgerCode = Wp.Limit(p.LedgerCode, 40),
                        LedgerName = Wp.Limit(p.LedgerName, 250),
                        Amount = p.Amount,
                        TransactionRef = p.TransactionRef
                    });
            }
        }

        //-------------------------------------------------------
        // The job card
        //-------------------------------------------------------

        Sb.SetStatus(_context, card, Ws.Invoiced, $"Service invoice {invoice.InvoiceNo}", userId);

        if (dto.Closing)
        {
            await SaveFindingsAsync(card.JobCardId, dto.Findings);
        }

        // The Estimate Charge came off this invoice
        if (priced.EstimateId != null)
        {
            ServiceEstimates? estimate = await _context.Set<ServiceEstimates>().FirstOrDefaultAsync(x => x.ServiceEstimateId == priced.EstimateId);

            if (estimate != null)
            {
                estimate.ChargeInvoiceNo = Wp.Limit(invoice.InvoiceNo, 30);
            }
        }

        Ws.AddHistory(_context, InvoiceEntity, invoice.ServiceInvoiceId, "Create", "Service Invoice Posted", $"{invoice.InvoiceNo} : job card {card.JobCardNo}, {invoice.CustomerName}, total {grand:N2}, collected {paid:N2}{(invoice.ReceiptVoucherNo.Length > 0 ? $" ({invoice.ReceiptVoucherNo})" : string.Empty)}.", userId);

        if (dto.Deliver)
        {
            await DeliverAsync(invoice, card, userId);
        }

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await FullAsync(invoice);
    }


    //===========================================================
    // Delivery : the bike is handed over. Closes the schedule line
    // of the bike, the service enquiry and the membership window.
    //===========================================================

    private async Task DeliverAsync(ServiceInvoices invoice, JobCards card, long userId)
    {
        DateOnly today = HrCalendar.Today();

        invoice.IsDelivered = true;
        invoice.DeliveredAt = DateTime.UtcNow;
        invoice.DeliveredBy = userId;

        Sb.SetStatus(_context, card, Ws.Delivered, $"Delivered ({invoice.InvoiceNo})", userId);

        // The schedule position of the bike is taken
        if (card.ServiceVehicleScheduleId != null)
        {
            ServiceVehicleSchedules? schedule =
                await _context.Set<ServiceVehicleSchedules>().FirstOrDefaultAsync(x => x.ServiceVehicleScheduleId == card.ServiceVehicleScheduleId);

            if (schedule != null && schedule.Status != "Taken")
            {
                schedule.Status = "Taken";
                schedule.TakenDate = today;
                schedule.TakenKm = card.KmReading;
                schedule.TakenDocType = "Job Card";
                schedule.TakenDocNo = card.JobCardNo;
            }
        }

        // The service enquiry became a job
        if (card.ServiceEnquiryId != null)
        {
            ServiceEnquiries? enquiry =
                await _context.Set<ServiceEnquiries>().FirstOrDefaultAsync(x => x.ServiceEnquiryId == card.ServiceEnquiryId);

            if (enquiry != null && !enquiry.IsConverted)
            {
                enquiry.IsConverted = true;
                enquiry.ConvertedDate = today;
                enquiry.ConvertedDocType = "Job Card";
                enquiry.ConvertedDocId = card.JobCardId;
                enquiry.ConvertedDocNo = card.JobCardNo;
            }
        }

        // A membership free service : the window of today is used
        // (not with Membership Management off for this company)
        if (card.JobType == Sb.MembershipJob && card.ChassisNo.Length > 0
            && AppCore.Application.Platform.Tenancy.ModuleSwitch.IsOn(AppCore.Application.Platform.Tenancy.ModuleKeys.Membership))
        {
            List<long> membershipIds =
                await _context.Set<MembershipStatus>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.ChassisNo == card.ChassisNo)
                    .Select(x => x.MembershipId)
                    .ToListAsync();

            MembershipServiceWindows? window =
                membershipIds.Count == 0
                    ? null
                    : await _context.Set<MembershipServiceWindows>()
                        .Where(x => membershipIds.Contains(x.MembershipId) && x.UsedDate == null && x.FromDate <= today && x.ToDate >= today)
                        .OrderBy(x => x.FromDate)
                        .FirstOrDefaultAsync();

            if (window != null)
            {
                window.UsedDate = today;
                window.UsedReference = card.JobCardNo;
                window.UsedBy = userId;
            }
        }

        Ws.AddHistory(_context, InvoiceEntity, invoice.ServiceInvoiceId, "Status", "Bike Delivered", $"{invoice.InvoiceNo} : the bike of job card {card.JobCardNo} was delivered.", userId);
    }

    public async Task<ServiceInvoiceDto> DeliverAsync(Guid publicId, long userId)
    {
        ServiceInvoices invoice =
            await Invoices.FirstOrDefaultAsync(x => x.PublicId == publicId)
            ?? throw new KeyNotFoundException("The service invoice was not found.");

        if (invoice.Status != Sb.Posted || invoice.IsDelivered)
        {
            throw new InvalidOperationException($"{invoice.InvoiceNo} is {(invoice.IsDelivered ? "delivered already" : invoice.Status)}.");
        }

        JobCards card =
            await Cards.FirstOrDefaultAsync(x => x.JobCardId == invoice.JobCardId)
            ?? throw new InvalidOperationException("The job card of the invoice was not found.");

        await DeliverAsync(invoice, card, userId);

        await _context.SaveChangesAsync();

        return await FullAsync(invoice);
    }


    //===========================================================
    // Service Returns
    //===========================================================

    private async Task<List<ServiceReturnDto>> ReturnDtosAsync(List<ServiceReturns> rows)
    {
        List<long> invoiceIds = rows.Select(x => x.ServiceInvoiceId).Distinct().ToList();

        Dictionary<long, ServiceInvoices> invoices =
            (await Invoices.AsNoTracking().Where(x => invoiceIds.Contains(x.ServiceInvoiceId)).ToListAsync()).ToDictionary(x => x.ServiceInvoiceId);

        List<long> cardIds = rows.Select(x => x.JobCardId).Distinct().ToList();

        Dictionary<long, string> cards =
            (await Cards.AsNoTracking().Where(x => cardIds.Contains(x.JobCardId)).Select(x => new { x.JobCardId, x.JobCardNo }).ToListAsync())
            .ToDictionary(x => x.JobCardId, x => x.JobCardNo);

        Dictionary<long, string> branches = await Ws.BranchNamesAsync(_context);

        return rows
            .Select(x =>
            {
                invoices.TryGetValue(x.ServiceInvoiceId, out ServiceInvoices? invoice);

                return new ServiceReturnDto
                {
                    Id = x.ServiceReturnId,
                    PublicId = x.PublicId,
                    ReturnNo = x.ReturnNo,
                    ReturnDate = HrCalendar.Day(x.ReturnDate),
                    BranchName = branches.TryGetValue(x.BranchId, out string? name) ? name : string.Empty,
                    InvoicePublicId = invoice?.PublicId ?? Guid.Empty,
                    InvoiceNo = invoice?.InvoiceNo ?? string.Empty,
                    InvoiceDate = invoice == null ? string.Empty : HrCalendar.Day(invoice.InvoiceDate),
                    JobCardNo = cards.TryGetValue(x.JobCardId, out string? no) ? no : string.Empty,
                    CustomerName = invoice?.CustomerName ?? string.Empty,
                    Mobile = invoice?.Mobile ?? string.Empty,
                    Amount = x.Amount,
                    Reason = x.Reason,
                    ReceiptCancelled = x.ReceiptCancelled,
                    ReceiptVoucherNo = invoice?.ReceiptVoucherNo ?? string.Empty,
                    PartsReturned = x.PartsReturned
                };
            })
            .ToList();
    }

    public async Task<List<ServiceReturnDto>> GetReturnsAsync() =>
        await ReturnDtosAsync(await Returns.AsNoTracking().OrderByDescending(x => x.ServiceReturnId).ToListAsync());

    public async Task<ServiceReturnDto> GetReturnAsync(Guid publicId)
    {
        ServiceReturns row =
            await Returns.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId)
            ?? throw new KeyNotFoundException("The service return was not found.");

        return (await ReturnDtosAsync(new List<ServiceReturns> { row }))[0];
    }

    // Posted invoices, newest first, for the return form
    public async Task<List<PartsOptionDto>> GetReturnableAsync() =>
        (await Invoices.AsNoTracking().Where(x => x.Status == Sb.Posted).OrderByDescending(x => x.ServiceInvoiceId).ToListAsync())
        .Select(x => new PartsOptionDto
        {
            PublicId = x.PublicId,
            No = x.InvoiceNo,
            Text = $"{x.InvoiceNo}  |  {x.CustomerName}  |  {x.GrandTotal:N2}{(x.IsDelivered ? "  |  Delivered" : string.Empty)}",
            BranchId = x.BranchId
        })
        .ToList();

    public async Task<ServiceReturnDto> PostReturnAsync(PostServiceReturnDto dto, long userId)
    {
        DateOnly date =
            HrCalendar.ParseDay(dto.ReturnDate)
            ?? throw new InvalidOperationException("Give the date of the return.");

        if (date > HrCalendar.Today())
        {
            throw new InvalidOperationException("The date of a return cannot be in the future.");
        }

        string reason = Ws.Clean(dto.Reason, 500, "Reason");

        if (reason.Length == 0)
        {
            throw new InvalidOperationException("Say why the invoice is returned.");
        }

        ServiceReturns entity;
        ServiceInvoices invoice;
        JobCards card;

        await using (var transaction = await _context.Database.BeginTransactionAsync())
        {
            invoice =
                await Invoices.FirstOrDefaultAsync(x => x.PublicId == dto.InvoicePublicId)
                ?? throw new InvalidOperationException("Pick the service invoice.");

            if (invoice.Status != Sb.Posted)
            {
                throw new InvalidOperationException($"{invoice.InvoiceNo} is {invoice.Status} already.");
            }

            if (date < invoice.InvoiceDate)
            {
                throw new InvalidOperationException($"The return cannot be dated before the invoice ({HrCalendar.Day(invoice.InvoiceDate)}).");
            }

            card =
                await Cards.FirstOrDefaultAsync(x => x.JobCardId == invoice.JobCardId)
                ?? throw new InvalidOperationException("The job card of the invoice was not found.");

            // A free service that is on a brand claim : the claim first
            List<long> claimIds =
                await Lines.AsNoTracking()
                    .Where(x => x.ServiceInvoiceId == invoice.ServiceInvoiceId && x.FreeServiceClaimId != null)
                    .Select(x => x.FreeServiceClaimId!.Value)
                    .Distinct()
                    .ToListAsync();

            if (claimIds.Count > 0)
            {
                string claimNo =
                    await _context.Set<FreeServiceClaims>().AsNoTracking().Where(x => claimIds.Contains(x.FreeServiceClaimId)).Select(x => x.ClaimNo).FirstAsync();

                throw new InvalidOperationException($"The free service of {invoice.InvoiceNo} is on claim {claimNo} : cancel the claim first (Free Service Claims).");
            }

            DateTime now = DateTime.UtcNow;

            // The journal of the invoice (when it had one)
            if (await _postingService.IsPostedAsync(invoice.InvoiceNo))
            {
                await _postingService.ReverseAsync(invoice.InvoiceNo, date, reason, userId);
            }

            // The VAT register
            foreach (VatRegister row in await _context.Set<VatRegister>().AsNoTracking()
                         .Where(x => x.DocumentType == VoucherTypes.ServiceInvoice && x.DocumentId == invoice.ServiceInvoiceId && !x.IsReversal)
                         .ToListAsync())
            {
                row.VatRegisterId = 0;
                row.DocumentDate = date;
                row.IsReversal = true;
                row.CreatedBy = userId;
                row.CreatedDate = now;

                _context.Set<VatRegister>().Add(row);
            }

            // The collection is handed back
            bool receiptCancelled = false;

            if (dto.CancelReceipt && invoice.ReceiptVoucherId != null)
            {
                await _receiptVouchers.CancelAsync(
                    invoice.ReceiptVoucherId.Value,
                    new CancelReceiptVoucherDto { CancelDate = HrCalendar.Day(date), Reason = Wp.Limit($"Service return of {invoice.InvoiceNo} : {reason}", 500) },
                    userId);

                receiptCancelled = true;
            }

            entity =
                new ServiceReturns
                {
                    ReturnNo = (await _numberService.NextAsync(VoucherTypes.ServiceReturn, invoice.BranchId, date)).VoucherNo,
                    ReturnDate = date,
                    BranchId = invoice.BranchId,
                    ServiceInvoiceId = invoice.ServiceInvoiceId,
                    JobCardId = invoice.JobCardId,
                    Amount = invoice.GrandTotal,
                    Reason = reason,
                    ReceiptCancelled = receiptCancelled,
                    PartsReturned = false,
                    CreatedBy = userId,
                    CreatedDate = now
                };

            Returns.Add(entity);

            invoice.Status = Sb.Returned;
            invoice.ReturnNo = entity.ReturnNo;

            // An Estimate Charge that came off this invoice is free
            // again for the next invoice of the job card
            string returnedInvoiceNo = invoice.InvoiceNo;

            foreach (ServiceEstimates estimate in await _context.Set<ServiceEstimates>().Where(x => x.ChargeInvoiceNo == returnedInvoiceNo).ToListAsync())
            {
                estimate.ChargeInvoiceNo = string.Empty;
            }
            invoice.ModifiedBy = userId;
            invoice.ModifiedDate = now;

            // The job is open for billing again (or for its parts to
            // go back and the card to be reopened)
            Sb.SetStatus(_context, card, Ws.WorkDone, $"Service return {entity.ReturnNo} of {invoice.InvoiceNo}", userId);

            await _context.SaveChangesAsync();

            Ws.AddHistory(_context, ReturnEntity, entity.ServiceReturnId, "Create", "Service Invoice Returned", $"{entity.ReturnNo} : {invoice.InvoiceNo} ({invoice.CustomerName}, {invoice.GrandTotal:N2}) reversed. {reason}{(receiptCancelled ? $" Receipt {invoice.ReceiptVoucherNo} cancelled." : string.Empty)}", userId);

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
        }

        //-------------------------------------------------------
        // The parts go back to the store : one Parts Return per
        // Parts Issue that still has something out. After the
        // return is saved, so a part that cannot go back does not
        // undo it.
        //-------------------------------------------------------

        string message = string.Empty;

        if (dto.ReturnParts)
        {
            try
            {
                List<PartsIssues> issues =
                    await _context.Set<PartsIssues>().AsNoTracking().Where(x => x.JobCardId == card.JobCardId).OrderBy(x => x.PartsIssueId).ToListAsync();

                foreach (PartsIssues issue in issues)
                {
                    List<PartsLineDto> lines =
                        (await _context.Set<PartsIssueLines>().AsNoTracking()
                            .Where(x => x.PartsIssueId == issue.PartsIssueId && x.Quantity > x.ReturnedQuantity)
                            .ToListAsync())
                        .Select(x => new PartsLineDto { SourceLineId = x.PartsIssueLineId, Quantity = x.Quantity - x.ReturnedQuantity })
                        .ToList();

                    if (lines.Count > 0)
                    {
                        await _parts.PostReturnAsync(
                            new PostPartsReturnDto
                            {
                                IssuePublicId = issue.PublicId,
                                ReturnDate = HrCalendar.Day(date < issue.IssueDate ? issue.IssueDate : date),
                                Remarks = $"Service return {entity.ReturnNo}",
                                Lines = lines
                            },
                            userId);
                    }
                }

                entity.PartsReturned = true;

                await _context.SaveChangesAsync();
            }
            catch (InvalidOperationException error)
            {
                message = $"{entity.ReturnNo} is saved, but the parts did not all go back to the store : {error.Message} Return them on Parts Returns.";
            }
        }

        ServiceReturnDto result = await GetReturnAsync(entity.PublicId);

        result.Message = message;

        return result;
    }
}
