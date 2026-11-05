//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.Platform.Accounting;
using AppCore.Application.SalesOperations.Shared;
using AppCore.Application.Settings.ClientSettings;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.SalesOperations.Shared;
using AppCore.Domain.Platform.Accounting;
using AppCore.Infrastructure.Persistence;

using PostingLedgerCodes =
    AppCore.Infrastructure.Platform.Accounting.PostingLedgerCodes;

using PriceIndexWriter =
    AppCore.Infrastructure.Platform.Inventory.ProductPriceIndexWriter;

using PriceAdjustmentEngine =
    AppCore.Infrastructure.Configurations.InventoryManagement.PricingLabels.PriceAdjustmentRepository;

using CustomerProfilesEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.CustomerProfiles;

using MembershipStatusEntity =
    AppCore.Domain.Entities.MembershipManagement.MembershipAssignment.MembershipStatus;

using MembershipCardsEntity =
    AppCore.Domain.Entities.MembershipManagement.MembershipSetup.MembershipCards;

using SparePartsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SpareParts;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;

using WarehousesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Warehouses;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using BusinessLineAccess =
    AppCore.Infrastructure.Repositories.Settings.GeneralSettings.BusinessLineAccess;

using UserProfileEntity =
    AppCore.Domain.Entities.SecurityPermission.UserManagement.UserProfile;

using ReceiptVoucherPaymentsEntity =
    AppCore.Domain.Entities.AccountsFinance.VoucherManagement.ReceiptVoucherPayments;

using PriceAdjustmentEntity =
    AppCore.Domain.Entities.InventoryManagement.PricingLabels.PriceAdjustment;

using PriceAdjustmentLinesEntity =
    AppCore.Domain.Entities.InventoryManagement.PricingLabels.PriceAdjustmentLines;

using PriceAdjustmentReleasesEntity =
    AppCore.Domain.Entities.InventoryManagement.PricingLabels.PriceAdjustmentReleases;

using StockBatchesEntity =
    AppCore.Domain.Platform.Inventory.StockBatches;

using StockMovementsEntity =
    AppCore.Domain.Platform.Inventory.StockMovements;

using StockAllocationsEntity =
    AppCore.Domain.Platform.Inventory.StockAllocations;

using VatRegisterEntity =
    AppCore.Domain.Platform.Inventory.VatRegister;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.SalesOperations.Shared;


//===============================================================
// Sales Invoices Repository : one engine for Sales Invoices - SP /
// AC / MB. Each page (SP / AC / MB) is a small class that gives its
// tables (THeader / TLine / TPayment) and its SalesInvoicePage
// (type, prefix, switch codes, posting purposes).
//
// The server prices every invoice (Quote, Save, Approve and Post
// all use PriceAsync) :
//   Stock     : FIFO over the warehouse's on-hand batches with
//               MRP > 0 (MRP 0 = not saleable). Short : refused,
//               or (Allow Sale Without Stock) the rest is
//               unallocated : costed at the newest batch's cost,
//               no stock movement for that part.
//   Price     : Sell at Batch MRP ON = each batch at its own MRP;
//               OFF = the lowest MRP of the batches taken. Allow
//               Price Edit : one price for the line, not above the
//               lowest MRP, at most Value % below it.
//   Discounts : 1. campaign OR membership, the better one
//                  (campaigns not built yet : FindCampaignAsync)
//               2. special (Allow Discount + activity "Give Special
//                  Discount") : line % or invoice % / Tk spread by
//                  value (the last line takes the remainder)
//               3. fractional (Round Down to Whole Taka) : the
//                  paisa of the total, always down
//   VAT       : discounts do not reduce VAT (Case A, VAT final at
//               source) : VatInside = gross x r / (100 + r) per
//               batch, BaseVat = the VAT paid at source of the
//               units; Sales VAT not applicable = both 0.
//   Below cost: Net - the VAT inside it vs FIFO cost + open Price
//               Adjustment share (fractional not counted).
//
// Draft    : (Post on Approval ON) Create / Update / Delete /
//            Restore. Number SISP / SIAC / SIMB taken on the first
//            save; renumbered when branch, year or month changes.
//            Post on Approval OFF : Create / Update post at once.
// Approve  : Draft -> Approved (priced again; must not change)
// Return   : Approved -> Draft
// Post     : Approved -> Posted, one journal under the invoice
//            number :
//              Dr customer receivable   invoice total
//              Dr campaign / membership / special / fractional
//                 discounts (Posting Setup; membership : the
//                 card's Discount ledger)
//              Cr Sales                 gross - VAT inside
//              Cr VAT Current Account   base VAT
//              Cr Price Increase Income / Dr Price Reduction
//                 Expense               VAT inside - base VAT
//              Dr COGS / Cr Inventory   FIFO cost
//              + Price Adjustment release lines
//            stock out of the batches (movement Sale, allocation,
//            the batch's last unit takes the rest of its value;
//            closed at 0), VAT register Sale rows, and the
//            payments as a posted Receipt Voucher (own RV number).
// Cancel   : Approved -> Cancelled. Posted (Allow Cancel of
//            Posted Invoice, within its days) : journal reversed,
//            Receipt Voucher cancelled, stock back to the same
//            batches (movement SaleCancel), VAT register reversed.
//            Refused when a Price Adjustment was released by it
//            (no reverse there yet) or anything was returned.
//===============================================================

public abstract class SalesInvoiceRepositoryBase<THeader, TLine, TPayment>
    : ISalesInvoiceRepository
    where THeader : SalesInvoiceHeader, new()
    where TLine : SalesInvoiceLine, new()
    where TPayment : SalesInvoicePayment, new()
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Sales Operations";

    private const string EntityPrefix =
        "SalesInvoices";

    private const string DateFormat =
        "yyyy-MM-dd";

    public const string StatusDraft = "Draft";

    public const string StatusApproved = "Approved";

    public const string StatusPosted = "Posted";

    public const string StatusCancelled = "Cancelled";

    private static readonly string[] Statuses =
    {
        StatusDraft,
        StatusApproved,
        StatusPosted,
        StatusCancelled
    };

    // Stock batch statuses / bucket / movement types
    private const string BatchOnHand = "OnHand";

    private const string BatchClosed = "Closed";

    private const string BatchInTransit = "InTransit";

    private const string BatchCancelled = "Cancelled";

    private const string MoveSale = "Sale";

    private const string MoveSaleCancel = "SaleCancel";

    // Customer types / tags
    private const string CustomerInbound = "Inbound";

    private const string CustomerOutside = "Outside";

    private const string TagWalkIn = "Walk-in";

    private const string PartyCustomer = "Customer";

    // Discount sources
    private const string SourceNone = "None";

    private const string SourceCampaign = "Campaign";

    private const string SourceMembership = "Membership";

    // Invoice special discount types
    private const string SpecialNone = "None";

    private const string SpecialPercent = "Percent";

    private const string SpecialAmount = "Amount";

    private const string TypeSpareParts = "Spare Parts";

    private const string TypeLubricants = "Lubricants";

    private const string MembershipActive = "Active";

    private const string PriceAdjustmentPosted = "Posted";

    private const string ReleaseSale = "Sale";

    private const string ActivitySpecial = "Give Special Discount";

    private const int MaxLines = 500;

    private const int MaxProductResults = 50;

    // Product dropdown (browse) : the narrowed area, at most this
    private const int MaxBrowseResults = 1000;

    private const decimal MaxMoney =
        9_999_999_999_999_999.99m;

    // Receipt modes taken on a sales invoice (EMI : not on SP / AC)
    private static readonly string[] PaymentModes =
    {
        "Cash",
        "Bank",
        "Check",
        "MFS",
        "POS"
    };

    // Scanned barcode : <product code without hyphens>B<StockBatchId>
    private static readonly Regex BarcodePattern =
        new("^([A-Za-z0-9]+)B([0-9]+)$", RegexOptions.CultureInvariant);

    private static readonly Regex PhonePattern =
        new("^01[0-9]{9}$", RegexOptions.CultureInvariant);


    //===========================================================
    // This page : type, prefix, tables, switch codes, purposes
    //===========================================================

    protected abstract SalesInvoicePage Page { get; }


    // The page type sent must be this page's
    //===========================================================
    // Business line of a page (Business Configuration) :
    // MB -> Motor Bikes, SP -> Spare Parts, AC -> Accessories
    //===========================================================

    private static string BusinessLineOf
    (
        string pageType
    )
    {
        return (pageType ?? string.Empty).ToUpperInvariant() switch
        {
            "MB" => BusinessLineAccess.MotorBikes,
            "AC" => BusinessLineAccess.Accessories,
            _ => BusinessLineAccess.SpareParts
        };
    }

    // Does the branch run the page's business line today
    // (wing core business + the branch's active extra business)
    private async Task<bool> BranchRunsLineAsync
    (
        long branchId,
        string businessLine
    )
    {
        Dictionary<long, HashSet<string>> lines =
            await BusinessLineAccess.ActiveLinesByBranchAsync(
                _context,
                BusinessLineAccess.Today());

        return lines.TryGetValue(branchId, out HashSet<string>? branchLines)
            && branchLines.Contains(businessLine);
    }

    // Is the user allotted to the branch (Security & Permission ›
    // Branch Assignment : active assignment + active detail + an
    // active branch) : the same rule the login uses
    private async Task<bool> UserAllottedToBranchAsync
    (
        long userId,
        long branchId
    )
    {
        if (userId <= 0 || branchId <= 0)
        {
            return false;
        }

        return await
        (
            from assignment in _context.Set<AppCore.Domain.Entities.SecurityPermission.UserManagement.BranchAssignment>().AsNoTracking()

            join detail in _context.Set<AppCore.Domain.Entities.SecurityPermission.UserManagement.BranchAssignmentDetail>().AsNoTracking()
                on assignment.BranchAssignmentId equals detail.BranchAssignmentId

            join branch in _context.Set<BranchesEntity>().AsNoTracking()
                on detail.BranchId equals branch.BranchId

            where assignment.UserProfileId == userId
                  && assignment.IsActive
                  && !assignment.IsDeleted
                  && detail.IsActive
                  && !detail.IsDeleted
                  && detail.BranchId == branchId
                  && branch.IsActive
                  && !branch.IsDeleted

            select detail.BranchId
        )
        .AnyAsync();
    }

    private const string NotAllottedMessage =
        "You are not allotted to this branch (Security & Permission > Branch Assignment) : the page is blocked for you here, even with the page permission.";

    private static string BranchLineMessage
    (
        string branchName,
        string businessLine
    )
    {
        return $"{branchName} does not run {businessLine} sales (Business Configuration). Switch to a branch that does.";
    }

    private SalesInvoicePage PageOf
    (
        string? pageType
    )
    {
        string clean =
            (pageType ?? string.Empty).Trim();

        if (clean.Length > 0 && !string.Equals(clean, Page.PageType, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"This is the {Page.Title} page.");
        }

        return Page;
    }


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IVoucherNumberService _numberService;

    private readonly IVatApplicabilityService _vatApplicability;

    private readonly IVoucherPostingService _postingService;

    // Payments become a Receipt Voucher (same rules and posting)
    private readonly IReceiptVoucherRepository _receiptVouchers;

    // Add Customer (walk-in) : created exactly as Customer Profiles
    private readonly ICustomerProfilesRepository _customers;


    //===========================================================
    // Constructor
    //===========================================================

    protected SalesInvoiceRepositoryBase(
        AppDbContext context,
        IVoucherNumberService numberService,
        IVatApplicabilityService vatApplicability,
        IVoucherPostingService postingService,
        IReceiptVoucherRepository receiptVouchers,
        ICustomerProfilesRepository customers)
    {
        _context = context;

        _numberService = numberService;

        _vatApplicability = vatApplicability;

        _postingService = postingService;

        _receiptVouchers = receiptVouchers;

        _customers = customers;
    }


    //===========================================================
    // Working classes
    //===========================================================

    // The page's switches, read by code (missing = default)
    private sealed class SwitchSet
    {
        public bool PostOnApproval { get; set; }

        public bool AllowCreditSale { get; set; }

        // Effective only with Allow Credit Sale
        public bool EnforceCreditLimit { get; set; } = true;

        public bool AllowPriceEdit { get; set; }

        public decimal? MaxPriceEditPercent { get; set; }

        public bool AllowDiscount { get; set; }

        public decimal? MaxDiscountPercent { get; set; }

        public bool BlockBelowCost { get; set; } = true;

        public bool AllowWithoutStock { get; set; }

        public bool BackDated { get; set; }

        public bool AllowCancelPosted { get; set; }

        public int? CancelWithinDays { get; set; }

        public bool PrintAfterPosting { get; set; } = true;

        public bool AllowWalkIn { get; set; } = true;

        public bool SellAtBatchMrp { get; set; } = true;

        public bool RoundDown { get; set; } = true;
    }


    // A product of the page
    private sealed class ProductInfo
    {
        public long ProductId { get; set; }

        public string ProductCode { get; set; } = string.Empty;

        public string PartNumber { get; set; } = string.Empty;

        public string PartName { get; set; } = string.Empty;

        public string ProductName { get; set; } = string.Empty;

        // Spare Parts / Lubricants
        public string ProductType { get; set; } = string.Empty;

        public string Unit { get; set; } = string.Empty;

        public string InventoryLedgerCode { get; set; } = string.Empty;

        public string CogsLedgerCode { get; set; } = string.Empty;

        // The product's own sales ledger (CLS-005 / 006 / 008)
        public string SalesLedgerCode { get; set; } = string.Empty;

        public bool IsActive { get; set; }
    }


    // A saleable batch with its stock on hand in the warehouse
    private sealed class BatchStock
    {
        public StockBatchesEntity Batch { get; set; } = new();

        public decimal OnHand { get; set; }
    }


    // Stock of the products in one warehouse
    private sealed class StockView
    {
        // ProductId -> saleable batches, FIFO
        public Dictionary<long, List<BatchStock>> Saleable { get; set; } = new();

        // ProductId -> on hand in batches without MRP (not saleable)
        public Dictionary<long, decimal> Unpriced { get; set; } = new();
    }


    // An open Price Adjustment line of a batch (oldest first)
    private sealed class OpenAdjustment
    {
        public decimal Remaining { get; set; }

        public decimal AmountLeft { get; set; }

        public decimal DifferencePerUnit { get; set; }
    }


    // Campaign offer (Business Promotions; not built yet)
    private sealed class CampaignOffer
    {
        public long CampaignId { get; set; }

        public string Name { get; set; } = string.Empty;

        public decimal Percent { get; set; }
    }


    // The customer's membership used for the discount
    private sealed class MembershipChoice
    {
        public long MembershipId { get; set; }

        public string MembershipNo { get; set; } = string.Empty;

        public string CardName { get; set; } = string.Empty;

        public decimal Percent { get; set; }

        public string DiscountLedgerCode { get; set; } = string.Empty;

        public DateOnly ExpiryDate { get; set; }
    }


    // One batch part of a line (Batch null = unallocated)
    private sealed class Slice
    {
        public StockBatchesEntity? Batch { get; set; }

        public decimal Quantity { get; set; }

        public decimal Mrp { get; set; }

        public decimal Price { get; set; }

        public decimal Gross { get; set; }

        public decimal UnitCost { get; set; }

        public decimal Cost { get; set; }

        public decimal VatRate { get; set; }

        public decimal VatPerUnit { get; set; }

        public decimal PaShare { get; set; }

        public string InventoryLedgerCode { get; set; } = string.Empty;
    }


    // A priced line
    private sealed class PricedLine
    {
        public int LineNo { get; set; }

        public ProductInfo Product { get; set; } = new();

        public decimal Quantity { get; set; }

        public List<Slice> Slices { get; set; } = new();

        public decimal OnHand { get; set; }

        public decimal Unallocated { get; set; }

        public bool StockShort { get; set; }

        public decimal Mrp { get; set; }

        public string MrpText { get; set; } = string.Empty;

        public bool HasMixedMrp { get; set; }

        public int MrpCount { get; set; }

        public bool PriceEdited { get; set; }

        public decimal UnitPrice { get; set; }

        public decimal Gross { get; set; }

        public string DiscountSource { get; set; } = SourceNone;

        public string DiscountLabel { get; set; } = string.Empty;

        public decimal CmPercent { get; set; }

        public decimal CmAmount { get; set; }

        public decimal SpecialPercentTyped { get; set; }

        public decimal SpecialAmount { get; set; }

        public decimal Net { get; set; }

        public decimal FractionalShare { get; set; }

        public decimal LineTotal { get; set; }

        public decimal VatRate { get; set; }

        public decimal VatInside { get; set; }

        public decimal BaseVat { get; set; }

        public decimal Cost { get; set; }

        public decimal PaShare { get; set; }

        public decimal NetExclVat { get; set; }

        public bool BelowCost { get; set; }

        public string BelowCostMessage { get; set; } = string.Empty;
    }


    // A priced invoice
    private sealed class PricedInvoice
    {
        public SwitchSet Switches { get; set; } = new();

        public DateOnly InvoiceDate { get; set; }

        public VoucherPeriodDto? Period { get; set; }

        public WarehousesEntity? Warehouse { get; set; }

        public long? SalesPersonId { get; set; }

        public string SalesPersonName { get; set; } = string.Empty;

        public CustomerProfilesEntity? Customer { get; set; }

        public MembershipChoice? Membership { get; set; }

        public decimal CustomerBalance { get; set; }

        public bool VatApplicable { get; set; } = true;

        public string SpecialType { get; set; } = SpecialNone;

        public decimal SpecialValue { get; set; }

        public string Narration { get; set; } = string.Empty;

        public List<PricedLine> Lines { get; set; } = new();

        public List<TPayment> Payments { get; set; } = new();

        public decimal TotalQuantity { get; set; }

        public decimal Gross { get; set; }

        public decimal CampaignDiscount { get; set; }

        public decimal MembershipDiscount { get; set; }

        public decimal SpecialDiscount { get; set; }

        public decimal FractionalDiscount { get; set; }

        public decimal InvoiceTotal { get; set; }

        public decimal VatInside { get; set; }

        public decimal BaseVat { get; set; }

        public decimal Cost { get; set; }

        public decimal Paid { get; set; }

        public decimal Due { get; set; }

        public List<string> Warnings { get; set; } = new();

        public List<string> Errors { get; set; } = new();
    }


    // How to price
    private sealed class PriceOptions
    {
        // The user has "Give Special Discount"
        public bool CanSpecial { get; set; }

        // The saved date of a draft (an unchanged date is not
        // checked against the date window again)
        public DateOnly? SavedDate { get; set; }

        // Posting now : batches locked (FOR UPDATE) and tracked
        public bool Posting { get; set; }

        public long UserId { get; set; }

        // For the receipt check narration ('' = not numbered yet)
        public string InvoiceNo { get; set; } = string.Empty;
    }


    //===========================================================
    // Helpers
    //===========================================================

    private static decimal Money
    (
        decimal value
    )
    {
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }


    private static bool IsMoney
    (
        decimal value
    )
    {
        return decimal.Round(value, 2) == value;
    }


    private static string Limit
    (
        string? value,
        int maxLength
    )
    {
        string text =
            (value ?? string.Empty).Trim();

        return text.Length <= maxLength
            ? text
            : text.Substring(0, maxLength);
    }


    // One line of text (the narration is a single line)
    private static string OneLine
    (
        string? value,
        int maxLength
    )
    {
        string text =
            string.Join(
                " ",
                (value ?? string.Empty)
                    .Split(
                        new[] { ' ', '\t', '\r', '\n' },
                        StringSplitOptions.RemoveEmptyEntries));

        return Limit(text, maxLength);
    }


    private static string DateText
    (
        DateOnly date
    )
    {
        return date.ToString(DateFormat, CultureInfo.InvariantCulture);
    }


    private static string Amount
    (
        decimal value
    )
    {
        return value.ToString("0.00", CultureInfo.InvariantCulture);
    }


    private static string Qty
    (
        decimal value
    )
    {
        return value.ToString("0.##", CultureInfo.InvariantCulture);
    }


    private static bool TryParseDate
    (
        string? text,
        out DateOnly date
    )
    {
        return DateOnly.TryParseExact(
            (text ?? string.Empty).Trim(),
            DateFormat,
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out date);
    }


    private static string CustomerTagOf
    (
        string customerType,
        bool isWalkIn
    )
    {
        return isWalkIn
            ? TagWalkIn
            : customerType;
    }


    // Spread an amount over the lines by their base, the last line
    // with a base taking the remainder (or the largest one)
    private static List<decimal> Spread
    (
        decimal total,
        List<decimal> bases,
        bool remainderToLargest
    )
    {
        List<decimal> shares =
            bases.Select(_ => 0m).ToList();

        decimal baseTotal =
            bases.Where(x => x > 0).Sum();

        if (total == 0 || baseTotal <= 0)
        {
            return shares;
        }

        int target =
            remainderToLargest
                ? bases.IndexOf(bases.Max())
                : bases.FindLastIndex(x => x > 0);

        decimal given = 0m;

        for (int i = 0; i < bases.Count; i++)
        {
            if (i == target || bases[i] <= 0)
            {
                continue;
            }

            shares[i] =
                Money(total * bases[i] / baseTotal);

            given += shares[i];
        }

        shares[target] =
            total - given;

        return shares;
    }


    //===========================================================
    // Business date (Bangladesh time)
    //===========================================================

    private static readonly TimeZoneInfo BusinessZone =
        FindBusinessZone();


    private static TimeZoneInfo FindBusinessZone()
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

        return TimeZoneInfo.Local;
    }


    private static DateOnly BusinessToday()
    {
        return DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                BusinessZone));
    }


    //===========================================================
    // Switches (System Configurations, by code; missing = the
    // default)
    //===========================================================

    private async Task<SwitchSet>
        SwitchesAsync()
    {
        List<string> codes =
            new[]
            {
                Page.SwitchPostOnApproval,
                Page.SwitchAllowCreditSale,
                Page.SwitchEnforceCreditLimit,
                Page.SwitchAllowPriceEdit,
                Page.SwitchAllowDiscount,
                Page.SwitchBlockBelowCost,
                Page.SwitchAllowWithoutStock,
                Page.SwitchBackDated,
                Page.SwitchAllowCancelPosted,
                Page.SwitchPrintAfterPosting,
                Page.SwitchAllowWalkIn,
                Page.SwitchSellAtBatchMrp,
                Page.SwitchRoundDownWholeTaka
            }
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x!)
            .ToList();

        var rows =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => codes.Contains(x.ConfigurationCode) && !x.IsDeleted)
                .Select(x => new { x.ConfigurationCode, x.IsEnabled, x.Value })
                .ToListAsync();

        Dictionary<string, (bool IsOn, string Value)> found =
            rows
                .GroupBy(x => x.ConfigurationCode, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(
                    g => g.Key,
                    g => (g.First().IsEnabled, g.First().Value ?? string.Empty),
                    StringComparer.OrdinalIgnoreCase);

        // ON / OFF; a switch not on the page or not found = default
        bool On(string? code, bool fallback)
        {
            return !string.IsNullOrWhiteSpace(code) && found.TryGetValue(code, out var row)
                ? row.IsOn
                : (string.IsNullOrWhiteSpace(code) ? false : fallback);
        }

        // Value % of a switch that is ON (empty / unreadable = no limit)
        decimal? Percent(string? code)
        {
            if (string.IsNullOrWhiteSpace(code) || !found.TryGetValue(code, out var row) || !row.IsOn)
            {
                return null;
            }

            return decimal.TryParse(
                       row.Value.Trim(),
                       NumberStyles.Number,
                       CultureInfo.InvariantCulture,
                       out decimal percent)
                   && percent > 0
                ? Math.Min(percent, 100m)
                : null;
        }

        int? Days(string? code)
        {
            if (string.IsNullOrWhiteSpace(code) || !found.TryGetValue(code, out var row) || !row.IsOn)
            {
                return null;
            }

            return int.TryParse(row.Value.Trim(), out int days) && days > 0
                ? days
                : null;
        }

        bool credit =
            On(Page.SwitchAllowCreditSale, false);

        return new SwitchSet
        {
            PostOnApproval = On(Page.SwitchPostOnApproval, false),
            AllowCreditSale = credit,
            EnforceCreditLimit = credit && On(Page.SwitchEnforceCreditLimit, true),
            AllowPriceEdit = On(Page.SwitchAllowPriceEdit, false),
            MaxPriceEditPercent = Percent(Page.SwitchAllowPriceEdit),
            AllowDiscount = On(Page.SwitchAllowDiscount, false),
            MaxDiscountPercent = Percent(Page.SwitchAllowDiscount),
            BlockBelowCost = On(Page.SwitchBlockBelowCost, true),
            AllowWithoutStock = On(Page.SwitchAllowWithoutStock, false),
            BackDated = On(Page.SwitchBackDated, false),
            AllowCancelPosted = On(Page.SwitchAllowCancelPosted, false),
            CancelWithinDays = Days(Page.SwitchAllowCancelPosted),
            PrintAfterPosting = On(Page.SwitchPrintAfterPosting, true),
            AllowWalkIn = On(Page.SwitchAllowWalkIn, true),
            SellAtBatchMrp = On(Page.SwitchSellAtBatchMrp, true),
            RoundDown = On(Page.SwitchRoundDownWholeTaka, true)
        };
    }


    private static SalesInvoiceSwitchesDto ToSwitchesDto
    (
        SwitchSet x
    )
    {
        return new SalesInvoiceSwitchesDto
        {
            PostOnApproval = x.PostOnApproval,
            AllowCreditSale = x.AllowCreditSale,
            EnforceCreditLimit = x.EnforceCreditLimit,
            AllowPriceEdit = x.AllowPriceEdit,
            MaxPriceEditPercent = x.MaxPriceEditPercent,
            AllowDiscount = x.AllowDiscount,
            MaxDiscountPercent = x.MaxDiscountPercent,
            BlockSaleBelowCost = x.BlockBelowCost,
            AllowSaleWithoutStock = x.AllowWithoutStock,
            BackDatedSales = x.BackDated,
            AllowCancelPosted = x.AllowCancelPosted,
            CancelWithinDays = x.CancelWithinDays,
            PrintAfterPosting = x.PrintAfterPosting,
            AllowWalkInCustomers = x.AllowWalkIn,
            SellAtBatchMrp = x.SellAtBatchMrp,
            RoundDownWholeTaka = x.RoundDown
        };
    }


    //===========================================================
    // Products of the page (SP : Spare Parts; Spare Parts or
    // Lubricants from the category)
    //===========================================================

    private void RequireWiredPage()
    {
        if (Page.PageType != "SP")
        {
            throw new InvalidOperationException(
                $"{Page.Title} is not built yet.");
        }
    }


    private async Task<Dictionary<long, ProductInfo>>
        ProductsAsync
        (
            List<long> ids
        )
    {
        RequireWiredPage();

        var parts =
            await _context
                .Set<SparePartsEntity>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.SparePartId) && !x.IsDeleted)
                .Select(x => new { x.SparePartId, x.ProductCode, x.PartNumber, x.PartName, x.Unit, x.ProductCategoryId, x.InventoryLedgerCode, x.CogsLedgerCode, x.SalesLedgerCode, x.IsActive })
                .ToListAsync();

        Dictionary<long, string> categoryTypes =
            await CategoryTypesAsync(
                parts.Select(x => x.ProductCategoryId).Distinct().ToList());

        return parts.ToDictionary
        (
            x => x.SparePartId,
            x => new ProductInfo
            {
                ProductId = x.SparePartId,
                ProductCode = x.ProductCode,
                PartNumber = x.PartNumber ?? string.Empty,
                PartName = x.PartName ?? string.Empty,
                ProductName = $"{x.PartNumber} - {x.PartName}",
                ProductType = TypeOf(categoryTypes, x.ProductCategoryId),
                Unit = x.Unit ?? string.Empty,
                InventoryLedgerCode = (x.InventoryLedgerCode ?? string.Empty).Trim(),
                CogsLedgerCode = (x.CogsLedgerCode ?? string.Empty).Trim(),
                SalesLedgerCode = (x.SalesLedgerCode ?? string.Empty).Trim(),
                IsActive = x.IsActive
            }
        );
    }


    private async Task<Dictionary<long, string>>
        CategoryTypesAsync
        (
            List<long> categoryIds
        )
    {
        return await _context
            .Set<ProductCategoryEntity>()
            .AsNoTracking()
            .Where(x => categoryIds.Contains(x.ProductCategoryId))
            .ToDictionaryAsync(
                x => x.ProductCategoryId,
                x => x.CategoryType ?? string.Empty);
    }


    private static string TypeOf
    (
        Dictionary<long, string> categoryTypes,
        long categoryId
    )
    {
        return categoryTypes.TryGetValue(categoryId, out string? type)
               && string.Equals(type, TypeLubricants, StringComparison.OrdinalIgnoreCase)
            ? TypeLubricants
            : TypeSpareParts;
    }


    //===========================================================
    // Stock on hand in a warehouse : saleable batches (MRP > 0,
    // not cancelled) FIFO, and the units without MRP
    //===========================================================

    private async Task<StockView>
        StockAsync
        (
            long warehouseId,
            List<long> productIds,
            bool tracking
        )
    {
        StockView view =
            new();

        if (warehouseId <= 0 || productIds.Count == 0)
        {
            return view;
        }

        var sums =
            await _context
                .Set<StockMovementsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductType == Page.PageType
                        &&
                        x.Bucket == BatchOnHand
                        &&
                        x.WarehouseId == warehouseId
                        &&
                        productIds.Contains(x.ProductId)
                )
                .GroupBy(x => x.StockBatchId)
                .Select(g => new { StockBatchId = g.Key, Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut) })
                .ToListAsync();

        Dictionary<long, decimal> onHand =
            sums
                .Where(x => x.Quantity > 0)
                .ToDictionary(x => x.StockBatchId, x => x.Quantity);

        if (onHand.Count == 0)
        {
            return view;
        }

        List<long> batchIds =
            onHand.Keys.ToList();

        IQueryable<StockBatchesEntity> query =
            _context
                .Set<StockBatchesEntity>()
                .Where(x => batchIds.Contains(x.StockBatchId) && x.ProductType == Page.PageType);

        if (!tracking)
        {
            query = query.AsNoTracking();
        }

        List<StockBatchesEntity> batches =
            (await query.ToListAsync())
                .OrderBy(x => x.SourceDate)
                .ThenBy(x => x.StockBatchId)
                .ToList();

        foreach (StockBatchesEntity batch in batches)
        {
            decimal quantity =
                onHand[batch.StockBatchId];

            if (batch.Status == BatchCancelled)
            {
                continue;
            }

            if (!(batch.Mrp > 0))
            {
                view.Unpriced[batch.ProductId] =
                    view.Unpriced.GetValueOrDefault(batch.ProductId) + quantity;

                continue;
            }

            if (!view.Saleable.TryGetValue(batch.ProductId, out List<BatchStock>? list))
            {
                list = new List<BatchStock>();

                view.Saleable[batch.ProductId] = list;
            }

            list.Add(
                new BatchStock
                {
                    Batch = batch,
                    OnHand = quantity
                });
        }

        return view;
    }


    // Newest batch of each product (any branch; not cancelled) :
    // prices and costs the unallocated part of a sale without stock
    private async Task<Dictionary<long, StockBatchesEntity>>
        LastBatchesAsync
        (
            List<long> productIds
        )
    {
        List<StockBatchesEntity> rows =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductType == Page.PageType
                        &&
                        productIds.Contains(x.ProductId)
                        &&
                        x.Status != BatchCancelled
                )
                .ToListAsync();

        return rows
            .GroupBy(x => x.ProductId)
            .ToDictionary
            (
                g => g.Key,
                g => g
                    .OrderByDescending(x => x.SourceDate)
                    .ThenByDescending(x => x.StockBatchId)
                    .First()
            );
    }


    //===========================================================
    // Open Price Adjustment lines of batches (posted adjustments,
    // units not yet released), oldest first : the share a sale
    // will release (same steps as PriceAdjustmentRepository
    // .ReleaseOnSaleAsync)
    //===========================================================

    private async Task<Dictionary<long, List<OpenAdjustment>>>
        OpenAdjustmentsAsync
        (
            List<long> batchIds
        )
    {
        Dictionary<long, List<OpenAdjustment>> result =
            new();

        if (batchIds.Count == 0)
        {
            return result;
        }

        List<long> postedIds =
            await _context
                .Set<PriceAdjustmentEntity>()
                .AsNoTracking()
                .Where(x => x.Status == PriceAdjustmentPosted && !x.IsDeleted)
                .Select(x => x.PriceAdjustmentId)
                .ToListAsync();

        if (postedIds.Count == 0)
        {
            return result;
        }

        var lines =
            await _context
                .Set<PriceAdjustmentLinesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        batchIds.Contains(x.StockBatchId)
                        &&
                        postedIds.Contains(x.PriceAdjustmentId)
                        &&
                        x.Quantity > x.ReleasedQuantity
                )
                .OrderBy(x => x.PriceAdjustmentLineId)
                .Select(x => new { x.PriceAdjustmentLineId, x.StockBatchId, x.Quantity, x.ReleasedQuantity, x.Amount, x.DifferencePerUnit })
                .ToListAsync();

        if (lines.Count == 0)
        {
            return result;
        }

        List<long> lineIds =
            lines.Select(x => x.PriceAdjustmentLineId).ToList();

        Dictionary<long, decimal> released =
            (
                await _context
                    .Set<PriceAdjustmentReleasesEntity>()
                    .AsNoTracking()
                    .Where(x => lineIds.Contains(x.PriceAdjustmentLineId))
                    .GroupBy(x => x.PriceAdjustmentLineId)
                    .Select(g => new { LineId = g.Key, Amount = g.Sum(x => x.Amount) })
                    .ToListAsync()
            )
            .ToDictionary(x => x.LineId, x => x.Amount);

        foreach (var line in lines)
        {
            if (!result.TryGetValue(line.StockBatchId, out List<OpenAdjustment>? list))
            {
                list = new List<OpenAdjustment>();

                result[line.StockBatchId] = list;
            }

            list.Add(
                new OpenAdjustment
                {
                    Remaining = line.Quantity - line.ReleasedQuantity,
                    AmountLeft = line.Amount - released.GetValueOrDefault(line.PriceAdjustmentLineId),
                    DifferencePerUnit = line.DifferencePerUnit
                });
        }

        return result;
    }


    private static decimal AdjustmentShare
    (
        List<OpenAdjustment>? lines,
        decimal quantity
    )
    {
        if (lines == null || quantity <= 0)
        {
            return 0m;
        }

        decimal left =
            quantity;

        decimal total =
            0m;

        foreach (OpenAdjustment line in lines)
        {
            if (left <= 0m)
            {
                break;
            }

            decimal units =
                Math.Min(left, line.Remaining);

            total +=
                units >= line.Remaining
                    ? line.AmountLeft
                    : Money(units * line.DifferencePerUnit);

            left -= units;
        }

        return total;
    }


    //===========================================================
    // Customer : receivable balance and the best active membership
    //===========================================================

    // Receivable balance (+ = Dr, the customer owes)
    private async Task<decimal>
        BalanceAsync
        (
            string ledgerCode
        )
    {
        string code =
            (ledgerCode ?? string.Empty).Trim();

        if (code.Length == 0)
        {
            return 0m;
        }

        return await _context
                   .Set<VoucherEntries>()
                   .AsNoTracking()
                   .Where(x => x.LedgerCode == code)
                   .SumAsync(x => (decimal?)(x.Debit - x.Credit))
               ?? 0m;
    }


    // Active on the date (status Active, start .. expiry); the
    // highest % of the page's product line wins
    private async Task<MembershipChoice?>
        MembershipAsync
        (
            long customerId,
            DateOnly date
        )
    {
        if (string.IsNullOrWhiteSpace(Page.MembershipDiscountOf))
        {
            return null;
        }

        bool accessories =
            Page.MembershipDiscountOf == SalesInvoicePages.MembershipAccessories;

        var rows =
            await _context
                .Set<MembershipStatusEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.CustomerId == customerId
                        &&
                        !x.IsDeleted
                        &&
                        x.Status == MembershipActive
                        &&
                        x.StartDate <= date
                        &&
                        x.ExpiryDate >= date
                )
                .Select
                (
                    x =>
                        new
                        {
                            x.MembershipId,
                            x.MembershipNo,
                            x.MembershipCardId,
                            x.ExpiryDate,
                            Percent = accessories
                                ? x.AccessoriesDiscountPercent
                                : x.SparePartsDiscountPercent
                        }
                )
                .ToListAsync();

        var best =
            rows
                .Where(x => x.Percent > 0)
                .OrderByDescending(x => x.Percent)
                .ThenByDescending(x => x.ExpiryDate)
                .ThenBy(x => x.MembershipId)
                .FirstOrDefault();

        if (best == null)
        {
            return null;
        }

        var card =
            await _context
                .Set<MembershipCardsEntity>()
                .AsNoTracking()
                .Where(x => x.MembershipCardId == best.MembershipCardId)
                .Select(x => new { x.CardName, x.DiscountLedgerCode })
                .FirstOrDefaultAsync();

        return new MembershipChoice
        {
            MembershipId = best.MembershipId,
            MembershipNo = best.MembershipNo ?? string.Empty,
            CardName = card?.CardName ?? string.Empty,
            Percent = Math.Min(best.Percent, 100m),
            DiscountLedgerCode = (card?.DiscountLedgerCode ?? string.Empty).Trim(),
            ExpiryDate = best.ExpiryDate
        };
    }


    private static SalesInvoiceMembershipDto? ToMembershipDto
    (
        MembershipChoice? x
    )
    {
        return x == null
            ? null
            : new SalesInvoiceMembershipDto
            {
                MembershipId = x.MembershipId,
                MembershipNo = x.MembershipNo,
                CardName = x.CardName,
                SpDiscountPercent = x.Percent,
                DiscountLedgerCode = x.DiscountLedgerCode,
                ExpiryDate = DateText(x.ExpiryDate)
            };
    }


    //===========================================================
    // Campaign hook (Business Promotions › Promotional Offers).
    //
    // NOT BUILT YET : no campaign is offered, so only the
    // membership discount applies today. When the promotions page
    // exists, return the best active offer of the product for the
    // customer on the date (the engine already takes the better of
    // campaign and membership per line and posts a campaign to
    // Posting Setup CAMPAIGN-DISCOUNT-<type>).
    //===========================================================

    private static Task<CampaignOffer?>
        FindCampaignAsync
        (
            long productId,
            long customerId,
            DateOnly date
        )
    {
        return Task.FromResult<CampaignOffer?>(null);
    }


    //===========================================================
    // Payment rows (Payment Desk = Receipt Voucher debit rows)
    //===========================================================

    private static ReceiptVoucherDebitDto ToDebitDto
    (
        SalesInvoicePayment x
    )
    {
        return new ReceiptVoucherDebitDto
        {
            Mode = x.Mode,
            LedgerType = x.LedgerType,
            SubGroupCode = x.SubGroupCode,
            SubGroupName = x.SubGroupName,
            LedgerCode = x.LedgerCode,
            LedgerName = x.LedgerName,
            AccountId = x.AccountId,
            Amount = x.Amount,
            ShortNotes = x.ShortNotes,
            ChargePercent = x.ChargePercent,
            ChargeAmount = x.ChargeAmount,
            ChargeBorneBy = x.ChargeBorneBy,
            CardSetupId = x.CardSetupId,
            CardName = x.CardName,
            TransactionRef = x.TransactionRef,
            TenureMonths = x.TenureMonths,
            InterestPercent = x.InterestPercent,
            InterestAmount = x.InterestAmount,
            TotalCharged = x.TotalCharged,
            CheckNo = x.CheckNo,
            CheckDate = x.CheckDate.HasValue ? DateText(x.CheckDate.Value) : string.Empty,
            CheckBank = x.CheckBank,
            CheckStatus = string.Empty,
            ClearedVoucherNo = string.Empty
        };
    }


    // The receipt of the invoice : debits = the payment rows,
    // credit = the customer's receivable for the amount paid
    private static CreateReceiptVoucherDto ReceiptOf
    (
        DateOnly date,
        long branchId,
        string invoiceNo,
        string customerName,
        string receivableLedgerCode,
        decimal paid,
        IEnumerable<SalesInvoicePayment> payments
    )
    {
        string against =
            invoiceNo.Length > 0
                ? $"Against {invoiceNo}"
                : "Against this sales invoice";

        return new CreateReceiptVoucherDto
        {
            VoucherDate = DateText(date),
            BranchId = branchId,
            Narration = Limit($"{against} ({customerName})", 500),
            Debits = payments.Select(p => ToDebitDto(p)).ToList(),
            Credits =
                new List<ReceiptVoucherCreditDto>
                {
                    new ReceiptVoucherCreditDto
                    {
                        LedgerType = PartyCustomer,
                        LedgerCode = receivableLedgerCode,
                        Amount = paid,
                        ShortNotes = Limit(against, 250)
                    }
                }
        };
    }


    //===========================================================
    // Price : the single source of every figure (quote, save,
    // approve, post). Problems go to Errors (save refuses) and
    // Warnings (allowed).
    //===========================================================

    private async Task<PricedInvoice>
        PriceAsync
        (
            CreateSalesInvoiceDto dto,
            SwitchSet switches,
            PriceOptions options
        )
    {
        PricedInvoice result =
            new()
            {
                Switches = switches,
                Narration = OneLine(dto.Narration, 500)
            };

        //=======================================================
        // Date (Back Dated Sales; never after today)
        //=======================================================

        if (!TryParseDate(dto.InvoiceDate, out DateOnly date))
        {
            result.Errors.Add("Invoice Date is required (yyyy-MM-dd).");

            return result;
        }

        result.InvoiceDate = date;

        if (!(options.SavedDate.HasValue && options.SavedDate.Value == date))
        {
            DateOnly today =
                BusinessToday();

            if (date > today)
            {
                result.Errors.Add("The invoice date cannot be after today.");
            }
            else if (date < today && !switches.BackDated)
            {
                result.Errors.Add($"Back dated sales are not allowed (System Configuration › Back Dated Sales - {Page.PageType} is OFF) : the invoice date must be today.");
            }
        }

        //=======================================================
        // Branch, open financial year, warehouse
        //=======================================================

        if (dto.BranchId <= 0)
        {
            result.Errors.Add("Branch is required.");

            return result;
        }

        try
        {
            result.Period =
                await _numberService.ResolvePeriodAsync(
                    dto.BranchId,
                    date);
        }
        catch (InvalidOperationException ex)
        {
            result.Errors.Add(ex.Message);

            return result;
        }

        if (dto.WarehouseId <= 0)
        {
            result.Errors.Add("Warehouse is required.");

            return result;
        }

        WarehousesEntity? warehouse =
            await _context
                .Set<WarehousesEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.WarehouseId == dto.WarehouseId && !x.IsDeleted);

        if (warehouse == null)
        {
            result.Errors.Add("The warehouse was not found. It may have been deleted.");

            return result;
        }

        if (!warehouse.IsActive)
        {
            result.Errors.Add($"Warehouse '{warehouse.WarehouseName}' is inactive.");
        }

        if (warehouse.BranchId != result.Period.BranchId)
        {
            result.Errors.Add($"Warehouse '{warehouse.WarehouseName}' is not of branch {result.Period.BranchName}.");

            return result;
        }

        // Branch Assignment : the user must be allotted to the
        // branch (page permission alone is not enough)
        if
        (
            !await UserAllottedToBranchAsync(
                options.UserId,
                result.Period.BranchId)
        )
        {
            result.Errors.Add(
                NotAllottedMessage);

            return result;
        }

        // Business Configuration : the branch must run the line,
        // and the warehouse must be allowed for it
        string businessLine =
            BusinessLineOf(
                Page.PageType);

        if
        (
            !await BranchRunsLineAsync(
                result.Period.BranchId,
                businessLine)
        )
        {
            result.Errors.Add(
                BranchLineMessage(
                    result.Period.BranchName,
                    businessLine));

            return result;
        }

        HashSet<long> allowedWarehouseIds =
            await BusinessLineAccess.AllowedWarehouseIdsAsync(
                _context,
                businessLine);

        if (!allowedWarehouseIds.Contains(warehouse.WarehouseId))
        {
            result.Errors.Add($"Warehouse '{warehouse.WarehouseName}' is not allowed for {businessLine} (Business Configuration).");

            return result;
        }

        result.Warehouse = warehouse;

        //=======================================================
        // Sales person (active user profile; none = the user)
        //=======================================================

        long salesPersonId =
            dto.SalesPersonId.HasValue && dto.SalesPersonId.Value > 0
                ? dto.SalesPersonId.Value
                : options.UserId;

        var person =
            await _context
                .Set<UserProfileEntity>()
                .AsNoTracking()
                .Where(x => x.UserProfileId == salesPersonId && !x.IsDeleted)
                .Select(x => new { x.UserProfileId, x.DisplayName, x.FullName, x.UserName, x.IsActive })
                .FirstOrDefaultAsync();

        if (person == null || !person.IsActive)
        {
            if (dto.SalesPersonId.HasValue && dto.SalesPersonId.Value > 0)
            {
                result.Errors.Add("The sales person was not found or is inactive.");
            }
        }
        else
        {
            result.SalesPersonId = person.UserProfileId;

            result.SalesPersonName =
                Limit(
                    !string.IsNullOrWhiteSpace(person.DisplayName)
                        ? person.DisplayName
                        : !string.IsNullOrWhiteSpace(person.FullName)
                            ? person.FullName
                            : person.UserName,
                    150);
        }

        //=======================================================
        // Customer, membership, balance
        //=======================================================

        if (dto.CustomerId <= 0)
        {
            result.Errors.Add("Customer is required.");
        }
        else
        {
            CustomerProfilesEntity? customer =
                await _context
                    .Set<CustomerProfilesEntity>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.CustomerId == dto.CustomerId && !x.IsDeleted);

            if (customer == null)
            {
                result.Errors.Add("The customer was not found. It may have been deleted.");
            }
            else
            {
                if (!customer.IsActive)
                {
                    result.Errors.Add($"Customer '{customer.DisplayName}' is inactive.");
                }

                if (string.IsNullOrWhiteSpace(customer.ReceivableLedgerCode))
                {
                    result.Errors.Add($"Customer '{customer.DisplayName}' has no receivable ledger (Customer Profiles).");
                }

                result.Customer = customer;

                result.Membership =
                    await MembershipAsync(
                        customer.CustomerId,
                        date);

                result.CustomerBalance =
                    await BalanceAsync(
                        customer.ReceivableLedgerCode);
            }
        }

        //=======================================================
        // Sales VAT applicable on the date
        //=======================================================

        VatApplicabilityDto applicability =
            await _vatApplicability.GetAsync(
                Page.VatLine,
                date);

        result.VatApplicable =
            applicability.SalesVatApplicable;

        //=======================================================
        // Lines : products, quantities
        //=======================================================

        List<CreateSalesInvoiceLineDto> input =
            dto.Lines ?? new List<CreateSalesInvoiceLineDto>();

        if (input.Count == 0)
        {
            result.Errors.Add("Add at least one item.");

            return result;
        }

        if (input.Count > MaxLines)
        {
            result.Errors.Add($"At most {MaxLines} lines per invoice.");

            return result;
        }

        List<long> productIds =
            input
                .Select(x => x.ProductId)
                .Where(x => x > 0)
                .Distinct()
                .ToList();

        Dictionary<long, ProductInfo> products =
            await ProductsAsync(productIds);

        Dictionary<long, int> seen =
            new();

        for (int i = 0; i < input.Count; i++)
        {
            CreateSalesInvoiceLineDto row =
                input[i];

            int lineNo =
                i + 1;

            if (!products.TryGetValue(row.ProductId, out ProductInfo? product))
            {
                result.Errors.Add($"Line {lineNo} : the item was not found. It may have been deleted.");

                continue;
            }

            if (!product.IsActive)
            {
                result.Errors.Add($"Line {lineNo} : '{product.ProductName}' is inactive.");
            }

            if (seen.TryGetValue(product.ProductId, out int first))
            {
                result.Errors.Add($"Line {lineNo} : '{product.ProductName}' is already on line {first}; change its quantity there.");

                continue;
            }

            seen[product.ProductId] = lineNo;

            if (!(row.Quantity > 0) || !IsMoney(row.Quantity) || row.Quantity > MaxMoney)
            {
                result.Errors.Add($"Line {lineNo} : quantity must be more than 0 with at most 2 decimals.");

                continue;
            }

            result.Lines.Add(
                new PricedLine
                {
                    LineNo = lineNo,
                    Product = product,
                    Quantity = row.Quantity,
                    SpecialPercentTyped = row.SpecialDiscountPercent ?? 0m
                });
        }

        if (result.Lines.Count == 0)
        {
            return result;
        }

        //=======================================================
        // Stock : FIFO over the saleable batches on hand (locked
        // FOR UPDATE when posting)
        //=======================================================

        List<long> lineProductIds =
            result.Lines.Select(x => x.Product.ProductId).ToList();

        if (options.Posting)
        {
            await _context.Database.ExecuteSqlRawAsync(
                "SELECT 1 FROM \"StockBatches\" WHERE \"ProductType\" = {0} AND \"ProductId\" = ANY({1}) FOR UPDATE",
                Page.PageType,
                lineProductIds.ToArray());
        }

        StockView stock =
            await StockAsync(
                warehouse.WarehouseId,
                lineProductIds,
                options.Posting);

        Dictionary<long, StockBatchesEntity>? lastBatches =
            null;

        Dictionary<long, (decimal Mrp, DateOnly Date, string SourceNo)>? currentMrps =
            null;

        foreach (PricedLine line in result.Lines)
        {
            string label =
                $"Line {line.LineNo} : '{line.Product.ProductName}'";

            List<BatchStock> fifo =
                stock.Saleable.GetValueOrDefault(line.Product.ProductId)
                ?? new List<BatchStock>();

            line.OnHand =
                fifo.Sum(x => x.OnHand);

            decimal left =
                line.Quantity;

            foreach (BatchStock held in fifo)
            {
                if (left <= 0m)
                {
                    break;
                }

                decimal take =
                    Math.Min(left, held.OnHand);

                if (take <= 0m)
                {
                    continue;
                }

                line.Slices.Add(
                    new Slice
                    {
                        Batch = held.Batch,
                        Quantity = take,
                        Mrp = held.Batch.Mrp,
                        UnitCost = held.Batch.UnitCost,
                        VatRate = held.Batch.SourceVatRate,
                        VatPerUnit = held.Batch.SourceVatPerUnit,
                        InventoryLedgerCode =
                            string.IsNullOrWhiteSpace(held.Batch.InventoryLedgerCode)
                                ? line.Product.InventoryLedgerCode
                                : held.Batch.InventoryLedgerCode.Trim()
                    });

                left -= take;
            }

            if (left > 0m)
            {
                line.StockShort = true;

                decimal unpriced =
                    stock.Unpriced.GetValueOrDefault(line.Product.ProductId);

                string unpricedNote =
                    unpriced > 0m
                        ? $" ({Qty(unpriced)} more without MRP cannot be sold)"
                        : string.Empty;

                if (!switches.AllowWithoutStock)
                {
                    result.Errors.Add($"{label} : only {Qty(line.OnHand)} {line.Product.Unit} in stock in {warehouse.WarehouseName}{unpricedNote}.");

                    continue;
                }

                lastBatches ??=
                    await LastBatchesAsync(lineProductIds);

                if (!lastBatches.TryGetValue(line.Product.ProductId, out StockBatchesEntity? last))
                {
                    result.Errors.Add($"{label} has never been in stock : its cost is not known, so it cannot be sold without stock.");

                    continue;
                }

                decimal mrp =
                    last.Mrp;

                if (!(mrp > 0))
                {
                    currentMrps ??=
                        await PriceIndexWriter.CurrentAsync(
                            _context,
                            Page.PageType,
                            lineProductIds);

                    mrp =
                        currentMrps.TryGetValue(line.Product.ProductId, out var current)
                            ? current.Mrp
                            : 0m;
                }

                if (!(mrp > 0))
                {
                    result.Errors.Add($"{label} has no MRP : price it first.");

                    continue;
                }

                line.Slices.Add(
                    new Slice
                    {
                        Batch = null,
                        Quantity = left,
                        Mrp = mrp,
                        UnitCost = last.UnitCost,
                        VatRate = last.SourceVatRate,
                        VatPerUnit = last.SourceVatPerUnit,
                        InventoryLedgerCode = line.Product.InventoryLedgerCode
                    });

                line.Unallocated = left;

                result.Warnings.Add($"{label} : {Qty(left)} {line.Product.Unit} sold without stock (costed at the last batch {last.BatchNo}){unpricedNote}.");
            }
        }

        // Lines without their slices (refused) stop here
        if (result.Lines.Any(x => x.Slices.Sum(s => s.Quantity) != x.Quantity))
        {
            return result;
        }

        //=======================================================
        // Price : batch MRP or the line's lowest, price edit
        //=======================================================

        for (int i = 0; i < result.Lines.Count; i++)
        {
            PricedLine line =
                result.Lines[i];

            CreateSalesInvoiceLineDto row =
                input[line.LineNo - 1];

            string label =
                $"Line {line.LineNo} : '{line.Product.ProductName}'";

            decimal lowest =
                line.Slices.Min(x => x.Mrp);

            line.Mrp = lowest;

            line.MrpCount =
                line.Slices.Select(x => x.Mrp).Distinct().Count();

            line.HasMixedMrp =
                line.MrpCount > 1;

            foreach (Slice slice in line.Slices)
            {
                slice.Price =
                    switches.SellAtBatchMrp
                        ? slice.Mrp
                        : lowest;
            }

            decimal typed =
                row.UnitPrice ?? 0m;

            if (typed > 0m && line.Slices.Any(x => x.Price != typed))
            {
                if (!switches.AllowPriceEdit)
                {
                    result.Errors.Add($"{label} : the price cannot be changed (System Configuration › Allow Price Edit is OFF).");
                }
                else if (!IsMoney(typed))
                {
                    result.Errors.Add($"{label} : the price can have at most 2 decimals.");
                }
                else if (typed > lowest)
                {
                    result.Errors.Add($"{label} : the price cannot be above the MRP ({Amount(lowest)}).");
                }
                else if (switches.MaxPriceEditPercent.HasValue
                         && typed < Money(lowest * (1m - switches.MaxPriceEditPercent.Value / 100m)))
                {
                    result.Errors.Add($"{label} : the price can be at most {switches.MaxPriceEditPercent.Value:0.##}% below the MRP (lowest {Amount(Money(lowest * (1m - switches.MaxPriceEditPercent.Value / 100m)))}).");
                }
                else
                {
                    line.PriceEdited = true;

                    foreach (Slice slice in line.Slices)
                    {
                        slice.Price = typed;
                    }
                }
            }

            foreach (Slice slice in line.Slices)
            {
                slice.Gross =
                    Money(slice.Quantity * slice.Price);
            }

            line.Gross =
                line.Slices.Sum(x => x.Gross);

            line.UnitPrice =
                line.PriceEdited
                    ? typed
                    : decimal.Round(line.Gross / line.Quantity, 4, MidpointRounding.AwayFromZero);

            // "6 @ 500.00 + 4 @ 550.00" (consecutive batches at the
            // same price together)
            List<(decimal Quantity, decimal Price)> parts =
                new();

            foreach (Slice slice in line.Slices)
            {
                if (parts.Count > 0 && parts[^1].Price == slice.Price)
                {
                    parts[^1] = (parts[^1].Quantity + slice.Quantity, slice.Price);
                }
                else
                {
                    parts.Add((slice.Quantity, slice.Price));
                }
            }

            line.MrpText =
                Limit(
                    parts.Select(x => x.Price).Distinct().Count() > 1
                        ? string.Join(" + ", parts.Select(x => $"{Qty(x.Quantity)} @ {Amount(x.Price)}"))
                        : Amount(parts[0].Price),
                    200);
        }

        //=======================================================
        // Discount 1 : campaign OR membership (the better one)
        //=======================================================

        MembershipChoice? membership =
            result.Membership;

        foreach (PricedLine line in result.Lines)
        {
            decimal memberAmount =
                membership == null
                    ? 0m
                    : Money(line.Gross * membership.Percent / 100m);

            CampaignOffer? campaign =
                await FindCampaignAsync(
                    line.Product.ProductId,
                    dto.CustomerId,
                    date);

            decimal campaignAmount =
                campaign == null
                    ? 0m
                    : Money(line.Gross * Math.Min(campaign.Percent, 100m) / 100m);

            if (campaign != null && campaignAmount > 0m && campaignAmount >= memberAmount)
            {
                line.DiscountSource = SourceCampaign;
                line.CmPercent = Math.Min(campaign.Percent, 100m);
                line.CmAmount = campaignAmount;
                line.DiscountLabel = Limit($"Campaign {campaign.Name} {line.CmPercent:0.##}%", 100);
            }
            else if (membership != null && memberAmount > 0m)
            {
                line.DiscountSource = SourceMembership;
                line.CmPercent = membership.Percent;
                line.CmAmount = memberAmount;
                line.DiscountLabel = Limit($"Membership {membership.CardName} {line.CmPercent:0.##}%", 100);
            }
        }

        if (membership != null
            && result.Lines.Any(x => x.DiscountSource == SourceMembership)
            && membership.DiscountLedgerCode.Length == 0)
        {
            result.Errors.Add($"Membership card '{membership.CardName}' has no Discount ledger (Membership Cards).");
        }

        //=======================================================
        // Discount 2 : special (line % or invoice % / Tk)
        //=======================================================

        string specialType =
            new[] { SpecialNone, SpecialPercent, SpecialAmount }
                .FirstOrDefault(x => string.Equals(x, (dto.InvoiceSpecialType ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
            ?? (string.IsNullOrWhiteSpace(dto.InvoiceSpecialType) ? SpecialNone : string.Empty);

        if (specialType.Length == 0)
        {
            result.Errors.Add("Invoice special discount must be None, Percent or Amount.");

            specialType = SpecialNone;
        }

        decimal specialValue =
            specialType == SpecialNone
                ? 0m
                : dto.InvoiceSpecialValue;

        if (specialType != SpecialNone && specialValue == 0m)
        {
            specialType = SpecialNone;
        }

        result.SpecialType = specialType;

        result.SpecialValue = specialValue;

        bool lineSpecial =
            result.Lines.Any(x => x.SpecialPercentTyped != 0m);

        bool anySpecial =
            lineSpecial || specialType != SpecialNone;

        decimal? maxSpecial =
            switches.MaxDiscountPercent;

        if (anySpecial)
        {
            if (!switches.AllowDiscount)
            {
                result.Errors.Add("A special discount cannot be given (System Configuration › Allow Discount is OFF).");
            }

            if (!options.CanSpecial)
            {
                result.Errors.Add($"You do not have the \"{ActivitySpecial}\" permission.");
            }

            if (lineSpecial && specialType != SpecialNone)
            {
                result.Errors.Add("Use either line special discounts or the invoice special discount, not both.");
            }
        }

        List<decimal> bases =
            result.Lines.Select(x => x.Gross - x.CmAmount).ToList();

        decimal baseTotal =
            bases.Sum();

        if (lineSpecial && specialType == SpecialNone)
        {
            for (int i = 0; i < result.Lines.Count; i++)
            {
                PricedLine line =
                    result.Lines[i];

                decimal percent =
                    line.SpecialPercentTyped;

                if (percent == 0m)
                {
                    continue;
                }

                if (percent < 0m || percent > 100m || !IsMoney(percent))
                {
                    result.Errors.Add($"Line {line.LineNo} : special discount % must be more than 0 and at most 100 with 2 decimals.");

                    continue;
                }

                if (maxSpecial.HasValue && percent > maxSpecial.Value)
                {
                    result.Errors.Add($"Line {line.LineNo} : special discount can be at most {maxSpecial.Value:0.##}%.");

                    continue;
                }

                line.SpecialAmount =
                    Money(bases[i] * percent / 100m);
            }
        }
        else if (specialType == SpecialPercent)
        {
            if (specialValue < 0m || specialValue > 100m || !IsMoney(specialValue))
            {
                result.Errors.Add("Invoice special discount % must be more than 0 and at most 100 with 2 decimals.");
            }
            else if (maxSpecial.HasValue && specialValue > maxSpecial.Value)
            {
                result.Errors.Add($"Special discount can be at most {maxSpecial.Value:0.##}%.");
            }
            else
            {
                List<decimal> shares =
                    Spread(Money(baseTotal * specialValue / 100m), bases, false);

                for (int i = 0; i < result.Lines.Count; i++)
                {
                    result.Lines[i].SpecialAmount = shares[i];
                }
            }
        }
        else if (specialType == SpecialAmount)
        {
            if (specialValue < 0m || !IsMoney(specialValue))
            {
                result.Errors.Add("Invoice special discount must be more than 0 with at most 2 decimals.");
            }
            else if (specialValue > baseTotal)
            {
                result.Errors.Add($"Invoice special discount ({Amount(specialValue)}) cannot be more than the invoice ({Amount(baseTotal)}).");
            }
            else if (maxSpecial.HasValue && baseTotal > 0m && specialValue * 100m > maxSpecial.Value * baseTotal)
            {
                result.Errors.Add($"Special discount is {Money(specialValue * 100m / baseTotal):0.##}% of the invoice; at most {maxSpecial.Value:0.##}% is allowed.");
            }
            else
            {
                List<decimal> shares =
                    Spread(specialValue, bases, false);

                for (int i = 0; i < result.Lines.Count; i++)
                {
                    result.Lines[i].SpecialAmount = shares[i];
                }
            }
        }

        //=======================================================
        // Net, VAT (Case A), cost, below cost
        //=======================================================

        Dictionary<long, List<OpenAdjustment>> adjustments =
            await OpenAdjustmentsAsync(
                result.Lines
                    .SelectMany(x => x.Slices)
                    .Where(x => x.Batch != null)
                    .Select(x => x.Batch!.StockBatchId)
                    .Distinct()
                    .ToList());

        foreach (PricedLine line in result.Lines)
        {
            string label =
                $"Line {line.LineNo} : '{line.Product.ProductName}'";

            line.Net =
                line.Gross - line.CmAmount - line.SpecialAmount;

            if (line.Net < 0m)
            {
                result.Errors.Add($"{label} : the discounts are more than the price.");
            }

            if (result.VatApplicable)
            {
                line.VatInside =
                    Money(line.Slices.Sum(x => x.Gross * x.VatRate / (100m + x.VatRate)));

                line.BaseVat =
                    Money(line.Slices.Sum(x => x.Quantity * x.VatPerUnit));

                line.VatRate =
                    decimal.Round(line.Slices.Max(x => x.VatRate), 2, MidpointRounding.AwayFromZero);
            }

            foreach (Slice slice in line.Slices)
            {
                if (slice.Batch == null)
                {
                    slice.Cost =
                        Money(slice.Quantity * slice.UnitCost);

                    continue;
                }

                StockBatchesEntity batch =
                    slice.Batch;

                decimal unitsLeft =
                    batch.QuantityOnHand + batch.QuantityInTransit;

                // The batch's last units take what is left of its value
                slice.Cost =
                    slice.Quantity >= unitsLeft
                        ? batch.RemainingValue
                        : Math.Min(Money(slice.Quantity * batch.UnitCost), batch.RemainingValue);

                slice.PaShare =
                    AdjustmentShare(
                        adjustments.GetValueOrDefault(batch.StockBatchId),
                        slice.Quantity);
            }

            line.Cost =
                line.Slices.Sum(x => x.Cost);

            line.PaShare =
                line.Slices.Sum(x => x.PaShare);

            line.NetExclVat =
                line.Gross > 0m
                    ? line.Net - Money(line.Net * line.VatInside / line.Gross)
                    : line.Net;

            decimal cost =
                line.Cost + line.PaShare;

            if (line.NetExclVat < cost)
            {
                line.BelowCost = true;

                line.BelowCostMessage =
                    $"{label} sells below cost (net {Amount(line.NetExclVat)} excl. VAT, cost {Amount(cost)}).";

                if (switches.BlockBelowCost)
                {
                    result.Errors.Add(line.BelowCostMessage + " System Configuration › Block Sale Below Cost is ON.");
                }
                else
                {
                    result.Warnings.Add(line.BelowCostMessage);
                }
            }
        }

        //=======================================================
        // Discount 3 : fractional (whole taka, always down)
        //=======================================================

        decimal totalNet =
            result.Lines.Sum(x => x.Net);

        decimal invoiceTotal =
            switches.RoundDown && totalNet > 0m
                ? decimal.Floor(totalNet)
                : totalNet;

        List<decimal> fractions =
            Spread(
                totalNet - invoiceTotal,
                result.Lines.Select(x => x.Net).ToList(),
                true);

        for (int i = 0; i < result.Lines.Count; i++)
        {
            PricedLine line =
                result.Lines[i];

            line.FractionalShare = fractions[i];

            line.LineTotal = line.Net - line.FractionalShare;
        }

        //=======================================================
        // Totals
        //=======================================================

        result.TotalQuantity = result.Lines.Sum(x => x.Quantity);
        result.Gross = result.Lines.Sum(x => x.Gross);
        result.CampaignDiscount = result.Lines.Where(x => x.DiscountSource == SourceCampaign).Sum(x => x.CmAmount);
        result.MembershipDiscount = result.Lines.Where(x => x.DiscountSource == SourceMembership).Sum(x => x.CmAmount);
        result.SpecialDiscount = result.Lines.Sum(x => x.SpecialAmount);
        result.FractionalDiscount = result.Lines.Sum(x => x.FractionalShare);
        result.InvoiceTotal = result.Lines.Sum(x => x.LineTotal);
        result.VatInside = result.Lines.Sum(x => x.VatInside);
        result.BaseVat = result.Lines.Sum(x => x.BaseVat);
        result.Cost = result.Lines.Sum(x => x.Cost);

        if (result.InvoiceTotal > MaxMoney)
        {
            result.Errors.Add("The invoice total is too large.");
        }

        //=======================================================
        // Payments (Payment Desk rows)
        //=======================================================

        List<ReceiptVoucherDebitDto> rows =
            dto.Payments ?? new List<ReceiptVoucherDebitDto>();

        for (int i = 0; i < rows.Count; i++)
        {
            ReceiptVoucherDebitDto row =
                rows[i];

            int no =
                i + 1;

            string mode =
                PaymentModes.FirstOrDefault(x => string.Equals(x, (row.Mode ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
                ?? string.Empty;

            if (mode.Length == 0)
            {
                result.Errors.Add(
                    string.Equals((row.Mode ?? string.Empty).Trim(), "EMI", StringComparison.OrdinalIgnoreCase)
                        ? $"Payment {no} : EMI is not taken on this page."
                        : $"Payment {no} : unknown receipt mode '{row.Mode}'.");

                continue;
            }

            if (!(row.Amount > 0m) || !IsMoney(row.Amount) || row.Amount > MaxMoney)
            {
                result.Errors.Add($"Payment {no} ({mode}) : amount must be more than 0 with at most 2 decimals.");

                continue;
            }

            DateOnly? checkDate =
                null;

            if (mode == "Check")
            {
                if (!TryParseDate(row.CheckDate, out DateOnly parsed))
                {
                    result.Errors.Add($"Payment {no} (Check) : Check Date is required (yyyy-MM-dd).");

                    continue;
                }

                checkDate = parsed;
            }

            result.Payments.Add(
                new TPayment
                {
                    LineNo = result.Payments.Count + 1,
                    Mode = mode,
                    LedgerType = Limit(row.LedgerType, 20),
                    SubGroupCode = Limit(row.SubGroupCode, 40),
                    SubGroupName = Limit(row.SubGroupName, 200),
                    LedgerCode = Limit(row.LedgerCode, 30),
                    LedgerName = Limit(row.LedgerName, 250),
                    AccountId = row.AccountId,
                    Amount = row.Amount,
                    ShortNotes = Limit(row.ShortNotes, 250),
                    ChargePercent = row.ChargePercent,
                    ChargeAmount = row.ChargeAmount,
                    ChargeBorneBy = Limit(row.ChargeBorneBy, 20),
                    CardSetupId = row.CardSetupId,
                    CardName = Limit(row.CardName, 200),
                    TransactionRef = Limit(row.TransactionRef, 100),
                    TenureMonths = 0,
                    InterestPercent = 0m,
                    InterestAmount = 0m,
                    TotalCharged = 0m,
                    CheckNo = Limit(row.CheckNo, 50),
                    CheckDate = checkDate,
                    CheckBank = Limit(row.CheckBank, 200)
                });
        }

        result.Paid =
            result.Payments.Sum(x => x.Amount);

        result.Due =
            result.InvoiceTotal - result.Paid;

        if (result.Paid > result.InvoiceTotal)
        {
            result.Errors.Add($"Paid ({Amount(result.Paid)}) is more than the invoice total ({Amount(result.InvoiceTotal)}); no change is given.");
        }

        // The Receipt Voucher rules for each row (accounts, modes,
        // check / MFS / POS details, charges)
        if (result.Paid > 0m
            && result.Customer != null
            && !string.IsNullOrWhiteSpace(result.Customer.ReceivableLedgerCode)
            && result.Payments.Count == rows.Count)
        {
            try
            {
                await _receiptVouchers.ValidateAsync(
                    ReceiptOf(
                        date,
                        result.Period.BranchId,
                        options.InvoiceNo,
                        result.Customer.DisplayName,
                        result.Customer.ReceivableLedgerCode,
                        result.Paid,
                        result.Payments));
            }
            catch (InvalidOperationException ex)
            {
                result.Errors.Add($"Payment : {ex.Message}");
            }
        }

        //=======================================================
        // Credit (balance left unpaid)
        //=======================================================

        if (result.Due > 0m && result.Customer != null)
        {
            CustomerProfilesEntity customer =
                result.Customer;

            if (customer.IsWalkIn)
            {
                result.Errors.Add($"'{customer.DisplayName}' is a walk-in customer : cash only. Collect the full {Amount(result.InvoiceTotal)}.");
            }
            else if (!switches.AllowCreditSale)
            {
                result.Errors.Add($"Credit sale is not allowed (System Configuration › Allow Credit Sale is OFF) : collect the full {Amount(result.InvoiceTotal)}.");
            }
            else
            {
                decimal after =
                    result.CustomerBalance + result.Due;

                string problem =
                    customer.CreditLimit <= 0m
                        ? $"'{customer.DisplayName}' has no credit limit (0 = cash only)."
                        : after > customer.CreditLimit
                            ? $"'{customer.DisplayName}' would owe {Amount(after)}, above the credit limit {Amount(customer.CreditLimit)}."
                            : string.Empty;

                if (problem.Length > 0)
                {
                    if (switches.EnforceCreditLimit)
                    {
                        result.Errors.Add(problem + " System Configuration › Enforce Credit Limit is ON.");
                    }
                    else
                    {
                        result.Warnings.Add(problem);
                    }
                }
            }
        }

        return result;
    }


    // Save / post : the first problem stops it
    private static void ThrowIfErrors
    (
        PricedInvoice priced
    )
    {
        if (priced.Errors.Count > 0)
        {
            throw new InvalidOperationException(
                priced.Errors[0]);
        }

        // Asked on save / post only (not on every quote)
        if (string.IsNullOrWhiteSpace(priced.Narration))
        {
            throw new InvalidOperationException(
                "Narration is required.");
        }
    }


    //===========================================================
    // Mapping
    //===========================================================

    private static List<SalesInvoiceAllocationDto> AllocationsOf
    (
        PricedLine line
    )
    {
        return line.Slices
            .Select
            (
                x =>
                    new SalesInvoiceAllocationDto
                    {
                        StockBatchId = x.Batch?.StockBatchId ?? 0,
                        BatchNo = x.Batch?.BatchNo ?? string.Empty,
                        Quantity = x.Quantity,
                        Mrp = x.Mrp,
                        UnitPrice = x.Price,
                        UnitCost = x.Batch?.UnitCost ?? x.UnitCost,
                        Value = x.Cost,
                        VatRate = x.VatRate,
                        BaseVatPerUnit = x.VatPerUnit
                    }
            )
            .ToList();
    }


    private static SalesInvoiceLineDto ToLineDto
    (
        PricedLine x
    )
    {
        return new SalesInvoiceLineDto
        {
            SalesInvoiceLineId = 0,
            LineNo = x.LineNo,
            ProductType = x.Product.ProductType,
            ProductId = x.Product.ProductId,
            ProductCode = x.Product.ProductCode,
            PartNumber = x.Product.PartNumber,
            ProductName = x.Product.ProductName,
            Unit = x.Product.Unit,
            Quantity = x.Quantity,
            Mrp = x.Mrp,
            MrpText = x.MrpText,
            HasMixedMrp = x.HasMixedMrp,
            MrpCount = x.MrpCount,
            PriceEdited = x.PriceEdited,
            UnitPrice = x.UnitPrice,
            GrossAmount = x.Gross,
            DiscountSource = x.DiscountSource,
            DiscountLabel = x.DiscountLabel,
            CampaignMembershipPercent = x.CmPercent,
            CampaignMembershipAmount = x.CmAmount,
            SpecialDiscountPercent = x.SpecialPercentTyped,
            SpecialAmount = x.SpecialAmount,
            NetAmount = x.Net,
            FractionalShare = x.FractionalShare,
            LineTotal = x.LineTotal,
            VatRate = x.VatRate,
            VatInside = x.VatInside,
            BaseVat = x.BaseVat,
            CostAmount = x.Cost,
            PriceAdjustmentShare = x.PaShare,
            NetExclVat = x.NetExclVat,
            BelowCost = x.BelowCost,
            BelowCostMessage = x.BelowCostMessage,
            StockShort = x.StockShort,
            OnHand = x.OnHand,
            UnallocatedQuantity = x.Unallocated,
            ReturnedQuantity = 0m,
            Allocations = AllocationsOf(x)
        };
    }


    private static List<SalesInvoiceAllocationDto> ReadAllocations
    (
        string? json
    )
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new List<SalesInvoiceAllocationDto>();
        }

        try
        {
            return JsonSerializer.Deserialize<List<SalesInvoiceAllocationDto>>(json)
                   ?? new List<SalesInvoiceAllocationDto>();
        }
        catch (JsonException)
        {
            return new List<SalesInvoiceAllocationDto>();
        }
    }


    private static SalesInvoiceLineDto ToLineDto
    (
        TLine x
    )
    {
        List<SalesInvoiceAllocationDto> allocations =
            ReadAllocations(x.PlannedAllocations);

        return new SalesInvoiceLineDto
        {
            SalesInvoiceLineId = x.SalesInvoiceLineId,
            LineNo = x.LineNo,
            ProductType = x.ProductType,
            ProductId = x.ProductId,
            ProductCode = x.ProductCode,
            PartNumber = x.PartNumber,
            ProductName = x.ProductName,
            Unit = x.Unit,
            Quantity = x.Quantity,
            Mrp = x.Mrp,
            MrpText = x.MrpText,
            HasMixedMrp = x.HasMixedMrp,
            MrpCount = allocations.Select(a => a.Mrp).Distinct().Count(),
            PriceEdited = x.PriceEdited,
            UnitPrice = x.UnitPrice,
            GrossAmount = x.GrossAmount,
            DiscountSource = x.DiscountSource,
            DiscountLabel = x.DiscountLabel,
            CampaignMembershipPercent = x.CampaignMembershipPercent,
            CampaignMembershipAmount = x.CampaignMembershipAmount,
            SpecialDiscountPercent = x.SpecialDiscountPercent,
            SpecialAmount = x.SpecialAmount,
            NetAmount = x.NetAmount,
            FractionalShare = x.FractionalShare,
            LineTotal = x.LineTotal,
            VatRate = x.VatRate,
            VatInside = x.VatInside,
            BaseVat = x.BaseVat,
            CostAmount = x.CostAmount,
            PriceAdjustmentShare = x.PriceAdjustmentShare,
            NetExclVat =
                x.GrossAmount > 0m
                    ? x.NetAmount - Money(x.NetAmount * x.VatInside / x.GrossAmount)
                    : x.NetAmount,
            BelowCost = x.BelowCost,
            BelowCostMessage = string.Empty,
            StockShort = x.UnallocatedQuantity > 0m,
            OnHand = 0m,
            UnallocatedQuantity = x.UnallocatedQuantity,
            ReturnedQuantity = x.ReturnedQuantity,
            Allocations = allocations
        };
    }


    private static SalesInvoiceListItemDto ToListDto
    (
        THeader x,
        int lineCount
    )
    {
        return new SalesInvoiceListItemDto
        {
            SalesInvoiceId = x.SalesInvoiceId,
            PublicId = x.PublicId,
            PageType = x.PageType,
            InvoiceNo = x.InvoiceNo,
            InvoiceDate = DateText(x.InvoiceDate),
            BranchName = x.BranchName,
            WarehouseName = x.WarehouseName,
            CustomerCode = x.CustomerCode,
            CustomerName = x.CustomerName,
            CustomerPhone = x.CustomerPhone,
            CustomerTag = CustomerTagOf(x.CustomerType, x.CustomerIsWalkIn),
            LineCount = lineCount,
            InvoiceTotal = x.InvoiceTotal,
            PaidAmount = x.PaidAmount,
            DueAmount = x.DueAmount,
            Status = x.Status,
            CreatedDate = x.CreatedDate
        };
    }


    //===========================================================
    // Get All (list, one page; ?status optional)
    //===========================================================

    public async Task<List<SalesInvoiceListItemDto>>
        GetAllAsync
        (
            string pageType,
            string? status
        )
    {
        SalesInvoicePage page =
            PageOf(pageType);

        string wanted =
            (status ?? string.Empty).Trim();

        string? match =
            wanted.Length == 0 || string.Equals(wanted, "All", StringComparison.OrdinalIgnoreCase)
                ? null
                : Statuses.FirstOrDefault(x => string.Equals(x, wanted, StringComparison.OrdinalIgnoreCase))
                  ?? throw new InvalidOperationException(
                      $"Status must be All, {string.Join(", ", Statuses)}.");

        List<THeader> rows =
            await _context
                .Set<THeader>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.PageType == page.PageType
                        &&
                        (match == null || x.Status == match)
                )
                .OrderByDescending(x => x.InvoiceDate)
                .ThenByDescending(x => x.InvoiceNo)
                .ToListAsync();

        List<long> ids =
            rows.Select(x => x.SalesInvoiceId).ToList();

        Dictionary<long, int> counts =
            ids.Count == 0
                ? new Dictionary<long, int>()
                : await _context
                    .Set<TLine>()
                    .AsNoTracking()
                    .Where(x => ids.Contains(x.SalesInvoiceId))
                    .GroupBy(x => x.SalesInvoiceId)
                    .Select(g => new { Id = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.Id, x => x.Count);

        return rows
            .Select(x => ToListDto(x, counts.GetValueOrDefault(x.SalesInvoiceId)))
            .ToList();
    }


    //===========================================================
    // Get By Id (header + lines + payments)
    //===========================================================

    public async Task<SalesInvoiceDto?>
        GetByIdAsync
        (
            long id
        )
    {
        THeader? x =
            await _context
                .Set<THeader>()
                .AsNoTracking()
                .FirstOrDefaultAsync(h => h.SalesInvoiceId == id && !h.IsDeleted);

        if (x == null)
        {
            return null;
        }

        Dictionary<long, string> users =
            await UserNamesAsync(
                new[] { (long?)x.CreatedBy, x.ApprovedBy, x.PostedBy, x.CancelledBy });

        string NameOf(long? userId) =>
            userId.HasValue
                ? users.GetValueOrDefault(userId.Value, string.Empty)
                : string.Empty;

        SalesInvoiceDto dto =
            new()
            {
                SalesInvoiceId = x.SalesInvoiceId,
                PublicId = x.PublicId,
                PageType = x.PageType,
                InvoiceNo = x.InvoiceNo,
                InvoiceDate = DateText(x.InvoiceDate),
                BranchId = x.BranchId,
                BranchCode = x.BranchCode,
                BranchName = x.BranchName,
                FinancialYearId = x.FinancialYearId,
                WarehouseId = x.WarehouseId,
                WarehouseName = x.WarehouseName,
                SalesPersonId = x.SalesPersonId,
                SalesPersonName = x.SalesPersonName,
                CustomerId = x.CustomerId,
                CustomerCode = x.CustomerCode,
                CustomerName = x.CustomerName,
                CustomerPhone = x.CustomerPhone,
                CustomerAddress = x.CustomerAddress,
                CustomerType = x.CustomerType,
                CustomerIsWalkIn = x.CustomerIsWalkIn,
                CustomerTag = CustomerTagOf(x.CustomerType, x.CustomerIsWalkIn),
                ReceivableLedgerCode = x.ReceivableLedgerCode,
                MembershipId = x.MembershipId,
                MembershipNo = x.MembershipNo,
                MembershipCardName = x.MembershipCardName,
                MembershipDiscountPercent = x.MembershipDiscountPercent,
                VatApplicable = x.VatApplicable,
                InvoiceSpecialType = x.InvoiceSpecialType,
                InvoiceSpecialValue = x.InvoiceSpecialValue,
                TotalQuantity = x.TotalQuantity,
                GrossAmount = x.GrossAmount,
                CampaignDiscount = x.CampaignDiscount,
                MembershipDiscount = x.MembershipDiscount,
                CampaignMembershipDiscount = x.CampaignDiscount + x.MembershipDiscount,
                SpecialDiscount = x.SpecialDiscount,
                FractionalDiscount = x.FractionalDiscount,
                InvoiceTotal = x.InvoiceTotal,
                TotalVatInside = x.TotalVatInside,
                TotalBaseVat = x.TotalBaseVat,
                CostAmount = x.CostAmount,
                PaidAmount = x.PaidAmount,
                DueAmount = x.DueAmount,
                Narration = x.Narration,
                Status = x.Status,
                JournalNo = x.VoucherNo,
                ReceiptVoucherId = x.ReceiptVoucherId,
                ReceiptVoucherNo = x.ReceiptVoucherNo,
                CancelReason = x.CancelReason,
                CreatedBy = x.CreatedBy,
                CreatedByName = NameOf(x.CreatedBy),
                CreatedDate = x.CreatedDate,
                ModifiedBy = x.ModifiedBy,
                ModifiedDate = x.ModifiedDate,
                ApprovedBy = x.ApprovedBy,
                ApprovedByName = NameOf(x.ApprovedBy),
                ApprovedDate = x.ApprovedDate,
                PostedBy = x.PostedBy,
                PostedByName = NameOf(x.PostedBy),
                PostedDate = x.PostedDate,
                CancelledBy = x.CancelledBy,
                CancelledByName = NameOf(x.CancelledBy),
                CancelledDate = x.CancelledDate
            };

        List<TLine> lines =
            await _context
                .Set<TLine>()
                .AsNoTracking()
                .Where(l => l.SalesInvoiceId == id)
                .OrderBy(l => l.LineNo)
                .ToListAsync();

        dto.Lines =
            lines.Select(l => ToLineDto(l)).ToList();

        List<TPayment> payments =
            await _context
                .Set<TPayment>()
                .AsNoTracking()
                .Where(p => p.SalesInvoiceId == id)
                .OrderBy(p => p.LineNo)
                .ToListAsync();

        dto.Payments =
            payments.Select(p => ToDebitDto(p)).ToList();

        // Check status / clearing voucher from the Receipt Voucher
        if (x.ReceiptVoucherId.HasValue)
        {
            long voucherId =
                x.ReceiptVoucherId.Value;

            Dictionary<int, (string Status, string Cleared)> checks =
                (
                    await _context
                        .Set<ReceiptVoucherPaymentsEntity>()
                        .AsNoTracking()
                        .Where(p => p.ReceiptVoucherId == voucherId)
                        .Select(p => new { p.LineNo, p.CheckStatus, p.ClearedVoucherNo })
                        .ToListAsync()
                )
                .GroupBy(p => p.LineNo)
                .ToDictionary(
                    g => g.Key,
                    g => (g.First().CheckStatus ?? string.Empty, g.First().ClearedVoucherNo ?? string.Empty));

            for (int i = 0; i < payments.Count; i++)
            {
                if (checks.TryGetValue(payments[i].LineNo, out var check))
                {
                    dto.Payments[i].CheckStatus = check.Status;

                    dto.Payments[i].ClearedVoucherNo = check.Cleared;
                }
            }
        }

        return dto;
    }


    private async Task<Dictionary<long, string>>
        UserNamesAsync
        (
            IEnumerable<long?> userIds
        )
    {
        List<long> ids =
            userIds
                .Where(x => x.HasValue)
                .Select(x => x!.Value)
                .Distinct()
                .ToList();

        var rows =
            await _context
                .Set<UserProfileEntity>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.UserProfileId))
                .Select(x => new { x.UserProfileId, x.DisplayName, x.FullName, x.UserName })
                .ToListAsync();

        return rows
            .GroupBy(x => x.UserProfileId)
            .ToDictionary
            (
                g => g.Key,
                g =>
                {
                    var row = g.First();

                    return !string.IsNullOrWhiteSpace(row.DisplayName)
                        ? row.DisplayName
                        : !string.IsNullOrWhiteSpace(row.FullName)
                            ? row.FullName
                            : row.UserName ?? string.Empty;
                }
            );
    }


    //===========================================================
    // Get Defaults : number preview, branch, warehouses, sales
    // persons, switches, VAT
    //===========================================================

    public async Task<SalesInvoiceDefaultsDto>
        GetDefaultsAsync
        (
            string pageType,
            long branchId,
            DateOnly invoiceDate,
            long userId
        )
    {
        SalesInvoicePage page =
            PageOf(pageType);

        SwitchSet switches =
            await SwitchesAsync();

        SalesInvoiceDefaultsDto result =
            new()
            {
                PageType = page.PageType,
                Today = DateText(BusinessToday()),
                InvoiceDate = DateText(invoiceDate),
                Switches = ToSwitchesDto(switches),
                MaxPriceEditPercent = switches.AllowPriceEdit ? switches.MaxPriceEditPercent : null,
                MaxDiscountPercent = switches.AllowDiscount ? switches.MaxDiscountPercent : null,
                DefaultSalesPersonId = userId
            };

        // Branch Assignment : a user not allotted to the branch
        // gets no branch at all (nothing loads, everything blocked)
        result.UserAllottedToBranch =
            await UserAllottedToBranchAsync(
                userId,
                branchId);

        var branch =
            result.UserAllottedToBranch
                ? await _context
                    .Set<BranchesEntity>()
                    .AsNoTracking()
                    .Where(x => x.BranchId == branchId && !x.IsDeleted)
                    .Select(x => new { x.BranchId, x.BranchCode, x.BranchName })
                    .FirstOrDefaultAsync()
                : null;

        if (branch != null)
        {
            result.Branch =
                new SalesInvoiceBranchDto
                {
                    BranchId = branch.BranchId,
                    BranchCode = branch.BranchCode ?? string.Empty,
                    BranchName = branch.BranchName ?? string.Empty
                };
        }

        //=======================================================
        // Business Configuration : the branch must run the page's
        // business line (wing core business or an active extra
        // business). If not, no warehouse is offered and the page
        // blocks entry; save / quote refuse it too.
        //=======================================================

        string businessLine =
            BusinessLineOf(
                page.PageType);

        result.BusinessLine =
            businessLine;

        result.BranchRunsLine =
            branch != null
            &&
            await BranchRunsLineAsync(
                branchId,
                businessLine);

        if (!result.UserAllottedToBranch)
        {
            result.BranchLineMessage =
                NotAllottedMessage;
        }
        else if (!result.BranchRunsLine)
        {
            result.BranchLineMessage =
                BranchLineMessage(
                    branch?.BranchName ?? "This branch",
                    businessLine);
        }

        HashSet<long> allowedWarehouseIds =
            result.BranchRunsLine
                ? await BusinessLineAccess.AllowedWarehouseIdsAsync(
                    _context,
                    businessLine)
                : new HashSet<long>();

        //=======================================================
        // Warehouses : active, of the branch, allowed for the
        // business line; those holding saleable stock of the page
        // come first (the default is one of them when possible)
        //=======================================================

        List<WarehousesEntity> warehouses =
            (
                await _context
                    .Set<WarehousesEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive && x.BranchId == branchId)
                    .ToListAsync()
            )
            .Where(x => allowedWarehouseIds.Contains(x.WarehouseId))
            .ToList();

        List<long> warehouseIds =
            warehouses.Select(x => x.WarehouseId).ToList();

        List<long?> nullableIds =
            warehouseIds.Select(x => (long?)x).ToList();

        var held =
            await
            (
                from m in _context.Set<StockMovementsEntity>().AsNoTracking()

                join b in _context.Set<StockBatchesEntity>().AsNoTracking()
                    on m.StockBatchId equals b.StockBatchId

                where m.ProductType == page.PageType
                      &&
                      m.Bucket == BatchOnHand
                      &&
                      nullableIds.Contains(m.WarehouseId)
                      &&
                      b.Mrp > 0
                      &&
                      b.Status != BatchCancelled

                group m by m.WarehouseId into g

                select new
                {
                    WarehouseId = g.Key,
                    Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut)
                }
            )
            .ToListAsync();

        HashSet<long> withStock =
            held
                .Where(x => x.WarehouseId.HasValue && x.Quantity > 0)
                .Select(x => x.WarehouseId!.Value)
                .ToHashSet();

        result.Warehouses =
            warehouses
                .OrderByDescending(x => withStock.Contains(x.WarehouseId))
                .ThenByDescending(x => x.IsDefault)
                .ThenBy(x => x.WarehouseName)
                .Select
                (
                    x =>
                        new SalesInvoiceWarehouseDto
                        {
                            WarehouseId = x.WarehouseId,
                            WarehouseCode = x.WarehouseCode,
                            WarehouseName = x.WarehouseName,
                            IsDefault = x.IsDefault,
                            HasStock = withStock.Contains(x.WarehouseId)
                        }
                )
                .ToList();

        // Default : the branch default if it holds the page's stock,
        // else the first one holding it, else the branch default,
        // else the first allowed one
        result.DefaultWarehouseId =
            result.Warehouses.FirstOrDefault(x => x.IsDefault && x.HasStock)?.WarehouseId
            ?? result.Warehouses.FirstOrDefault(x => x.HasStock)?.WarehouseId
            ?? result.Warehouses.FirstOrDefault(x => x.IsDefault)?.WarehouseId
            ?? result.Warehouses.FirstOrDefault()?.WarehouseId;

        //=======================================================
        // Sales persons : active user profiles
        //=======================================================

        result.SalesPersons =
            (
                await _context
                    .Set<UserProfileEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .Select(x => new { x.UserProfileId, x.DisplayName, x.FullName, x.UserName })
                    .ToListAsync()
            )
            .Select
            (
                x =>
                    new SalesInvoicePersonDto
                    {
                        UserProfileId = x.UserProfileId,
                        DisplayName =
                            !string.IsNullOrWhiteSpace(x.DisplayName)
                                ? x.DisplayName
                                : !string.IsNullOrWhiteSpace(x.FullName)
                                    ? x.FullName
                                    : x.UserName ?? string.Empty,
                        UserName = x.UserName ?? string.Empty
                    }
            )
            .OrderBy(x => x.DisplayName)
            .ToList();

        //=======================================================
        // Add Items filters : categories / sub categories that
        // hold the page's active products
        //=======================================================

        await LoadCategoriesAsync(
            result);

        //=======================================================
        // Sales VAT applicable on the date
        //=======================================================

        VatApplicabilityDto applicability =
            await _vatApplicability.GetAsync(
                page.VatLine,
                invoiceDate);

        result.VatApplicable =
            applicability.SalesVatApplicable;

        result.VatApplicableSince =
            applicability.SalesSince;

        //=======================================================
        // Period and number preview (nothing reserved)
        //=======================================================

        try
        {
            VoucherPeriodDto period =
                await _numberService.ResolvePeriodAsync(
                    branchId,
                    invoiceDate);

            result.Branch =
                new SalesInvoiceBranchDto
                {
                    BranchId = period.BranchId,
                    BranchCode = period.BranchCode,
                    BranchName = period.BranchName
                };

            result.FinancialYearId = period.FinancialYearId;
            result.FinancialYearName = period.FinancialYearName;
            result.FinancialYearCode = period.FinancialYearCode;

            VoucherNumberDto number =
                await _numberService.PeekAsync(
                    page.Prefix,
                    branchId,
                    invoiceDate);

            result.NextNumberPreview =
                number.VoucherNo;
        }
        catch (InvalidOperationException ex)
        {
            result.Message = ex.Message;
        }

        return result;
    }


    private async Task LoadCategoriesAsync
    (
        SalesInvoiceDefaultsDto result
    )
    {
        var used =
            await _context
                .Set<SparePartsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .Select(x => new { x.ProductCategoryId, x.ProductSubCategoryId })
                .Distinct()
                .ToListAsync();

        List<long> categoryIds =
            used.Select(x => x.ProductCategoryId).Distinct().ToList();

        List<long> subCategoryIds =
            used.Select(x => x.ProductSubCategoryId).Distinct().ToList();

        result.Categories =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && categoryIds.Contains(x.ProductCategoryId))
                .OrderBy(x => x.CategoryName)
                .Select
                (
                    x =>
                        new SalesInvoiceCategoryDto
                        {
                            Id = x.ProductCategoryId,
                            Code = x.CategoryCode,
                            Name = x.CategoryName
                        }
                )
                .ToListAsync();

        result.SubCategories =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && subCategoryIds.Contains(x.ProductSubCategoryId))
                .OrderBy(x => x.SubCategoryName)
                .Select
                (
                    x =>
                        new SalesInvoiceCategoryDto
                        {
                            Id = x.ProductSubCategoryId,
                            ParentId = x.ProductCategoryId,
                            Code = x.SubCategoryCode,
                            Name = x.SubCategoryName
                        }
                )
                .ToListAsync();
    }


    //===========================================================
    // Products : search by code / part no / name, or a scanned
    // barcode (<code without hyphens>B<StockBatchId>). A
    // category / sub category narrows the search, and alone it
    // lists that category's products. A scan ignores them.
    // browse : the product dropdown's list (no text needed).
    //===========================================================

    public async Task<List<SalesInvoiceProductDto>>
        GetProductsAsync
        (
            string pageType,
            long warehouseId,
            string? search,
            long? categoryId = null,
            long? subCategoryId = null,
            bool browse = false
        )
    {
        PageOf(pageType);

        RequireWiredPage();

        string text =
            (search ?? string.Empty).Trim();

        long category =
            categoryId.GetValueOrDefault();

        long subCategory =
            subCategoryId.GetValueOrDefault();

        if (text.Length == 0 && category <= 0 && subCategory <= 0 && !browse)
        {
            return new List<SalesInvoiceProductDto>();
        }

        long? scannedBatchId =
            null;

        List<long> ids;

        Match barcode =
            BarcodePattern.Match(text);

        if (text.Length > 0 && barcode.Success)
        {
            string key =
                barcode.Groups[1].Value.ToUpperInvariant();

            ids =
                await _context
                    .Set<SparePartsEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.ProductCode.Replace("-", "").ToUpper() == key)
                    .Select(x => x.SparePartId)
                    .Take(1)
                    .ToListAsync();

            if (ids.Count > 0 && long.TryParse(barcode.Groups[2].Value, out long batchId))
            {
                scannedBatchId = batchId;
            }
        }
        else
        {
            ids = new List<long>();
        }

        if (ids.Count == 0)
        {
            string upper =
                text.ToUpperInvariant();

            ids =
                await _context
                    .Set<SparePartsEntity>()
                    .AsNoTracking()
                    .Where
                    (
                        x =>
                            !x.IsDeleted
                            &&
                            x.IsActive
                            &&
                            (category <= 0 || x.ProductCategoryId == category)
                            &&
                            (subCategory <= 0 || x.ProductSubCategoryId == subCategory)
                            &&
                            (
                                upper == ""
                                ||
                                x.ProductCode.ToUpper().Contains(upper)
                                ||
                                x.PartNumber.ToUpper().Contains(upper)
                                ||
                                x.PartName.ToUpper().Contains(upper)
                            )
                    )
                    .OrderBy(x => x.PartNumber)
                    .Select(x => x.SparePartId)
                    .Take(browse ? MaxBrowseResults : 200)
                    .ToListAsync();

            scannedBatchId = null;
        }

        if (ids.Count == 0)
        {
            return new List<SalesInvoiceProductDto>();
        }

        Dictionary<long, ProductInfo> products =
            await ProductsAsync(ids);

        StockView stock =
            await StockAsync(
                warehouseId,
                ids,
                false);

        Dictionary<long, (decimal Mrp, DateOnly Date, string SourceNo)> current =
            await PriceIndexWriter.CurrentAsync(
                _context,
                Page.PageType,
                ids);

        return products.Values
            .Select
            (
                p =>
                {
                    List<BatchStock> fifo =
                        stock.Saleable.GetValueOrDefault(p.ProductId)
                        ?? new List<BatchStock>();

                    decimal indexMrp =
                        current.TryGetValue(p.ProductId, out var row)
                            ? row.Mrp
                            : 0m;

                    return new SalesInvoiceProductDto
                    {
                        ProductId = p.ProductId,
                        ProductCode = p.ProductCode,
                        PartNumber = p.PartNumber,
                        PartName = p.PartName,
                        ProductName = p.ProductName,
                        ProductType = p.ProductType,
                        Unit = p.Unit,
                        OnHand = fifo.Sum(x => x.OnHand),
                        Mrp = fifo.Count > 0 ? fifo.Min(x => x.Batch.Mrp) : indexMrp,
                        LatestMrp = fifo.Count > 0 ? fifo[^1].Batch.Mrp : indexMrp,
                        MrpCount = fifo.Select(x => x.Batch.Mrp).Distinct().Count(),
                        HasMixedMrp = fifo.Select(x => x.Batch.Mrp).Distinct().Count() > 1,
                        ScannedBatchId = scannedBatchId,
                        IsActive = p.IsActive
                    };
                }
            )
            .OrderByDescending(x => x.OnHand > 0)
            .ThenBy(x => x.ProductName)
            .Take(browse ? MaxBrowseResults : MaxProductResults)
            .ToList();
    }


    //===========================================================
    // Customer lookup by phone (11 digits, starts 01)
    //===========================================================

    private static string CheckPhone
    (
        string? phone
    )
    {
        string clean =
            (phone ?? string.Empty).Trim();

        if (!PhonePattern.IsMatch(clean))
        {
            throw new InvalidOperationException(
                "Phone must be 11 digits starting with 01 (e.g. 01711223344).");
        }

        return clean;
    }


    private async Task<SalesInvoiceCustomerDto>
        CustomerDtoAsync
        (
            CustomerProfilesEntity x,
            DateOnly date
        )
    {
        decimal balance =
            await BalanceAsync(
                x.ReceivableLedgerCode);

        return new SalesInvoiceCustomerDto
        {
            Found = true,
            CustomerId = x.CustomerId,
            CustomerCode = x.CustomerCode,
            DisplayName = x.DisplayName,
            Name = x.CustomerName,
            Phone = x.Phone1,
            Address = x.PresentAddress,
            CustomerType = x.CustomerType,
            IsWalkIn = x.IsWalkIn,
            CustomerTag = CustomerTagOf(x.CustomerType, x.IsWalkIn),
            IsActive = x.IsActive,
            ReceivableLedgerCode = x.ReceivableLedgerCode,
            Balance = balance,
            BalanceSide = balance > 0m ? "Dr" : balance < 0m ? "Cr" : string.Empty,
            CreditLimit = x.CreditLimit,
            Membership =
                ToMembershipDto(
                    await MembershipAsync(
                        x.CustomerId,
                        date)),
            CanAddWalkIn = false,
            Message = x.IsActive ? string.Empty : "This customer is inactive."
        };
    }


    private async Task<CustomerProfilesEntity?>
        CustomerByPhoneAsync
        (
            string phone
        )
    {
        return await _context
                   .Set<CustomerProfilesEntity>()
                   .AsNoTracking()
                   .Where(x => !x.IsDeleted && x.Phone1 == phone)
                   .OrderBy(x => x.CustomerId)
                   .FirstOrDefaultAsync()
               ??
               await _context
                   .Set<CustomerProfilesEntity>()
                   .AsNoTracking()
                   .Where(x => !x.IsDeleted && x.Phone2 == phone)
                   .OrderBy(x => x.CustomerId)
                   .FirstOrDefaultAsync();
    }


    //===========================================================
    // Customer live search (counter) : phone 1 / phone 2 start
    // with the digits, or name / code contain the text; active
    // customers only; exact phone first, then name; at most 10
    //===========================================================

    private const int CustomerSearchLimit =
        10;

    public async Task<List<SalesInvoiceCustomerSearchItemDto>>
        SearchCustomersAsync
        (
            string pageType,
            string? text
        )
    {
        PageOf(pageType);

        string term =
            (text ?? string.Empty).Trim();

        if (term.Length < 3)
        {
            return new List<SalesInvoiceCustomerSearchItemDto>();
        }

        string digits =
            new string(term.Where(char.IsDigit).ToArray());

        bool isPhone =
            digits.Length >= 3
            &&
            digits.Length == term.Replace(" ", string.Empty).Replace("-", string.Empty).Length;

        string like =
            "%" + term.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";

        IQueryable<CustomerProfilesEntity> query =
            _context
                .Set<CustomerProfilesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive);

        List<CustomerProfilesEntity> rows =
            isPhone
                ? await query
                    .Where
                    (
                        x =>
                            x.Phone1.StartsWith(digits)
                            ||
                            x.Phone2.StartsWith(digits)
                    )
                    .OrderBy(x => x.Phone1 == digits ? 0 : x.Phone2 == digits ? 1 : 2)
                    .ThenBy(x => x.CustomerName)
                    .Take(CustomerSearchLimit)
                    .ToListAsync()
                : await query
                    .Where
                    (
                        x =>
                            EF.Functions.ILike(x.CustomerName, like)
                            ||
                            EF.Functions.ILike(x.CustomerCode, like)
                            ||
                            EF.Functions.ILike(x.DisplayName, like)
                    )
                    .OrderBy(x => x.CustomerName)
                    .Take(CustomerSearchLimit)
                    .ToListAsync();

        return rows
            .Select
            (
                x =>
                    new SalesInvoiceCustomerSearchItemDto
                    {
                        CustomerId = x.CustomerId,
                        CustomerCode = x.CustomerCode ?? string.Empty,
                        CustomerName = x.CustomerName ?? string.Empty,
                        DisplayName = x.DisplayName ?? string.Empty,
                        Phone1 = x.Phone1 ?? string.Empty,
                        Phone2 = x.Phone2 ?? string.Empty,
                        CustomerType = x.CustomerType ?? string.Empty,
                        IsWalkIn = x.IsWalkIn,
                        MatchedOn =
                            isPhone
                                ? ((x.Phone1 ?? string.Empty).StartsWith(digits) ? "Phone 1" : "Phone 2")
                                : (x.CustomerCode ?? string.Empty).Contains(term, StringComparison.OrdinalIgnoreCase)
                                    ? "Code"
                                    : "Name"
                    }
            )
            .ToList();
    }


    public async Task<SalesInvoiceCustomerDto>
        LookupCustomerAsync
        (
            string pageType,
            string? phone,
            DateOnly date
        )
    {
        PageOf(pageType);

        string clean =
            CheckPhone(phone);

        CustomerProfilesEntity? customer =
            await CustomerByPhoneAsync(clean);

        if (customer != null)
        {
            return await CustomerDtoAsync(
                customer,
                date);
        }

        SwitchSet switches =
            await SwitchesAsync();

        return new SalesInvoiceCustomerDto
        {
            Found = false,
            Phone = clean,
            CanAddWalkIn = switches.AllowWalkIn,
            Message = "Customer not found."
        };
    }


    //===========================================================
    // Add Customer (walk-in) : an Outside customer tagged Walk-in,
    // made by Customer Profiles (COS code, receivable ledger).
    // Only by this button, never on invoice save.
    //===========================================================

    public async Task<SalesInvoiceCustomerDto>
        CreateWalkInCustomerAsync
        (
            string pageType,
            SalesInvoiceWalkInDto dto,
            long userId
        )
    {
        PageOf(pageType);

        SwitchSet switches =
            await SwitchesAsync();

        if (!switches.AllowWalkIn)
        {
            throw new InvalidOperationException(
                "Walk-in customers cannot be added (System Configuration › Allow Walk-in Customers is OFF). Add the customer on Customer Profiles.");
        }

        string phone =
            CheckPhone(dto?.Phone);

        string name =
            OneLine(dto?.Name, 150);

        if (name.Length == 0)
        {
            throw new InvalidOperationException(
                "Name is required.");
        }

        CustomerProfilesEntity? taken =
            await CustomerByPhoneAsync(phone);

        if (taken != null)
        {
            throw new InvalidOperationException(
                $"Phone {phone} already belongs to {taken.DisplayName} ({taken.CustomerCode}).");
        }

        long customerId =
            await _customers.CreateAsync(
                new CreateCustomerProfilesDto
                {
                    CustomerType = CustomerOutside,
                    CustomerName = name,
                    Phone1 = phone,
                    PresentAddress = OneLine(dto?.Address, 500),
                    CreditLimit = 0m,
                    IsWalkIn = true,
                    IsActive = true,
                    Remarks = $"Walk-in customer added on {Page.Title}."
                },
                userId);

        CustomerProfilesEntity created =
            await _context
                .Set<CustomerProfilesEntity>()
                .AsNoTracking()
                .FirstAsync(x => x.CustomerId == customerId);

        return await CustomerDtoAsync(
            created,
            BusinessToday());
    }


    //===========================================================
    // Quote (nothing saved)
    //===========================================================

    public async Task<SalesInvoiceQuoteDto>
        QuoteAsync
        (
            CreateSalesInvoiceDto dto,
            bool canGiveSpecialDiscount,
            long userId
        )
    {
        PageOf(dto.PageType);

        PricedInvoice priced =
            await PriceAsync(
                dto,
                await SwitchesAsync(),
                new PriceOptions
                {
                    CanSpecial = canGiveSpecialDiscount,
                    Posting = false,
                    UserId = userId
                });

        return new SalesInvoiceQuoteDto
        {
            Lines = priced.Lines.Select(l => ToLineDto(l)).ToList(),
            TotalQuantity = priced.TotalQuantity,
            GrossAmount = priced.Gross,
            CampaignDiscount = priced.CampaignDiscount,
            MembershipDiscount = priced.MembershipDiscount,
            CampaignMembershipDiscount = priced.CampaignDiscount + priced.MembershipDiscount,
            SpecialDiscount = priced.SpecialDiscount,
            FractionalDiscount = priced.FractionalDiscount,
            InvoiceTotal = priced.InvoiceTotal,
            TotalVatInside = priced.VatInside,
            TotalBaseVat = priced.BaseVat,
            CostAmount = priced.Cost,
            PaidAmount = priced.Paid,
            DueAmount = priced.Due,
            VatApplicable = priced.VatApplicable,
            Membership = ToMembershipDto(priced.Membership),
            CustomerBalance = priced.CustomerBalance,
            CreditLimit = priced.Customer?.CreditLimit ?? 0m,
            Warnings = priced.Warnings,
            Errors = priced.Errors,
            CanSave = priced.Errors.Count == 0
        };
    }


    //===========================================================
    // Apply
    //===========================================================

    private static void ApplyHeader
    (
        THeader entity,
        SalesInvoicePage page,
        PricedInvoice priced
    )
    {
        VoucherPeriodDto period =
            priced.Period!;

        CustomerProfilesEntity customer =
            priced.Customer!;

        entity.PageType = page.PageType;
        entity.InvoiceDate = priced.InvoiceDate;
        entity.BranchId = period.BranchId;
        entity.BranchCode = Limit(period.BranchCode, 30);
        entity.BranchName = Limit(period.BranchName, 150);
        entity.FinancialYearId = period.FinancialYearId;
        entity.WarehouseId = priced.Warehouse!.WarehouseId;
        entity.WarehouseName = Limit(priced.Warehouse.WarehouseName, 150);
        entity.SalesPersonId = priced.SalesPersonId;
        entity.SalesPersonName = Limit(priced.SalesPersonName, 150);
        entity.CustomerId = customer.CustomerId;
        entity.CustomerCode = Limit(customer.CustomerCode, 20);
        entity.CustomerName = Limit(customer.DisplayName, 200);
        entity.CustomerPhone = Limit(customer.Phone1, 20);
        entity.CustomerAddress = Limit(customer.PresentAddress, 500);
        entity.CustomerType = Limit(customer.CustomerType, 20);
        entity.CustomerIsWalkIn = customer.IsWalkIn;
        entity.ReceivableLedgerCode = Limit(customer.ReceivableLedgerCode, 30);
        entity.MembershipId = priced.Membership?.MembershipId;
        entity.MembershipNo = Limit(priced.Membership?.MembershipNo, 30);
        entity.MembershipCardName = Limit(priced.Membership?.CardName, 100);
        entity.MembershipDiscountPercent = priced.Membership?.Percent ?? 0m;
        entity.MembershipDiscountLedgerCode = Limit(priced.Membership?.DiscountLedgerCode, 30);
        entity.VatApplicable = priced.VatApplicable;
        entity.InvoiceSpecialType = priced.SpecialType;
        entity.InvoiceSpecialValue = priced.SpecialValue;
        entity.TotalQuantity = priced.TotalQuantity;
        entity.GrossAmount = priced.Gross;
        entity.CampaignDiscount = priced.CampaignDiscount;
        entity.MembershipDiscount = priced.MembershipDiscount;
        entity.SpecialDiscount = priced.SpecialDiscount;
        entity.FractionalDiscount = priced.FractionalDiscount;
        entity.InvoiceTotal = priced.InvoiceTotal;
        entity.TotalVatInside = priced.VatInside;
        entity.TotalBaseVat = priced.BaseVat;
        entity.CostAmount = priced.Cost;
        entity.PaidAmount = priced.Paid;
        entity.DueAmount = priced.Due;
        entity.Narration = priced.Narration;
    }


    private static void ApplyLine
    (
        TLine entity,
        PricedLine x
    )
    {
        entity.LineNo = x.LineNo;
        entity.ProductType = Limit(x.Product.ProductType, 50);
        entity.ProductId = x.Product.ProductId;
        entity.ProductCode = Limit(x.Product.ProductCode, 40);
        entity.PartNumber = Limit(x.Product.PartNumber, 100);
        entity.ProductName = Limit(x.Product.ProductName, 250);
        entity.Unit = Limit(x.Product.Unit, 30);
        entity.Quantity = x.Quantity;
        entity.Mrp = x.Mrp;
        entity.MrpText = x.MrpText;
        entity.HasMixedMrp = x.HasMixedMrp;
        entity.PriceEdited = x.PriceEdited;
        entity.UnitPrice = x.UnitPrice;
        entity.GrossAmount = x.Gross;
        entity.DiscountSource = x.DiscountSource;
        entity.DiscountLabel = x.DiscountLabel;
        entity.CampaignMembershipPercent = x.CmPercent;
        entity.CampaignMembershipAmount = x.CmAmount;
        entity.SpecialDiscountPercent = x.SpecialPercentTyped;
        entity.SpecialAmount = x.SpecialAmount;
        entity.NetAmount = x.Net;
        entity.FractionalShare = x.FractionalShare;
        entity.LineTotal = x.LineTotal;
        entity.VatRate = x.VatRate;
        entity.VatInside = x.VatInside;
        entity.BaseVat = x.BaseVat;
        entity.CostAmount = x.Cost;
        entity.PriceAdjustmentShare = x.PaShare;
        entity.BelowCost = x.BelowCost;
        entity.UnallocatedQuantity = x.Unallocated;
        entity.PlannedAllocations = JsonSerializer.Serialize(AllocationsOf(x));
    }


    // Lines and payments replaced on every draft save; returns the
    // new lines (ids given)
    private async Task<List<TLine>> ReplaceDetailsAsync
    (
        THeader entity,
        PricedInvoice priced
    )
    {
        List<TLine> oldLines =
            await _context
                .Set<TLine>()
                .Where(x => x.SalesInvoiceId == entity.SalesInvoiceId)
                .ToListAsync();

        List<TPayment> oldPayments =
            await _context
                .Set<TPayment>()
                .Where(x => x.SalesInvoiceId == entity.SalesInvoiceId)
                .ToListAsync();

        _context.Set<TLine>().RemoveRange(oldLines);

        _context.Set<TPayment>().RemoveRange(oldPayments);

        List<TLine> lines =
            new();

        foreach (PricedLine priceLine in priced.Lines)
        {
            TLine line =
                new()
                {
                    SalesInvoiceId = entity.SalesInvoiceId,
                    ReturnedQuantity = 0m
                };

            ApplyLine(line, priceLine);

            lines.Add(line);
        }

        foreach (TPayment payment in priced.Payments)
        {
            payment.SalesInvoiceId = entity.SalesInvoiceId;
        }

        _context.Set<TLine>().AddRange(lines);

        _context.Set<TPayment>().AddRange(priced.Payments);

        await _context.SaveChangesAsync();

        return lines;
    }


    // The saved invoice as a create DTO (to price it again)
    private static CreateSalesInvoiceDto AsInput
    (
        THeader entity,
        List<TLine> lines,
        List<TPayment> payments
    )
    {
        return new CreateSalesInvoiceDto
        {
            PageType = entity.PageType,
            InvoiceDate = DateText(entity.InvoiceDate),
            BranchId = entity.BranchId,
            WarehouseId = entity.WarehouseId,
            SalesPersonId = entity.SalesPersonId,
            CustomerId = entity.CustomerId,
            Lines =
                lines
                    .OrderBy(x => x.LineNo)
                    .Select
                    (
                        x =>
                            new CreateSalesInvoiceLineDto
                            {
                                ProductId = x.ProductId,
                                Quantity = x.Quantity,
                                UnitPrice = x.PriceEdited ? x.UnitPrice : null,
                                SpecialDiscountPercent = x.SpecialDiscountPercent != 0m ? x.SpecialDiscountPercent : null
                            }
                    )
                    .ToList(),
            InvoiceSpecialType = entity.InvoiceSpecialType,
            InvoiceSpecialValue = entity.InvoiceSpecialValue,
            Payments =
                payments
                    .OrderBy(x => x.LineNo)
                    .Select(x => ToDebitDto(x))
                    .ToList(),
            Narration = entity.Narration
        };
    }


    // Approve / Post : priced again, the figures must not change
    private static void RequireSameFigures
    (
        THeader entity,
        List<TLine> lines,
        PricedInvoice priced
    )
    {
        ThrowIfErrors(priced);

        bool same =
            entity.InvoiceTotal == priced.InvoiceTotal
            &&
            entity.GrossAmount == priced.Gross
            &&
            entity.TotalVatInside == priced.VatInside
            &&
            entity.TotalBaseVat == priced.BaseVat
            &&
            entity.PaidAmount == priced.Paid
            &&
            entity.MembershipId == priced.Membership?.MembershipId
            &&
            lines.Count == priced.Lines.Count;

        if (same)
        {
            foreach (TLine line in lines)
            {
                PricedLine? now =
                    priced.Lines.FirstOrDefault(x => x.LineNo == line.LineNo);

                if (now == null
                    || now.Product.ProductId != line.ProductId
                    || now.Quantity != line.Quantity
                    || now.Gross != line.GrossAmount
                    || now.CmAmount != line.CampaignMembershipAmount
                    || now.SpecialAmount != line.SpecialAmount
                    || now.LineTotal != line.LineTotal
                    || now.VatInside != line.VatInside
                    || now.BaseVat != line.BaseVat)
                {
                    same = false;

                    break;
                }
            }
        }

        if (!same)
        {
            throw new InvalidOperationException(
                $"Sales invoice {entity.InvoiceNo} : the stock, prices or discounts have changed since it was saved (total now {Amount(priced.InvoiceTotal)}, saved {Amount(entity.InvoiceTotal)}). Return it to draft and save it again.");
        }
    }


    //===========================================================
    // History
    //===========================================================

    private void AddHistory
    (
        THeader entity,
        string activityType,
        string verb,
        long userId,
        DateTime now,
        string extra = ""
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = ModuleName,
                EntityName = $"{EntityPrefix}{entity.PageType}",
                EntityId = entity.SalesInvoiceId,
                ActivityType = activityType,
                ActivityTitle = $"Sales Invoice {verb}",
                ActivityDescription =
                    $"Sales invoice {entity.InvoiceNo} ({entity.CustomerName}, {entity.InvoiceTotal:N2}) {verb.ToLowerInvariant()}.{(string.IsNullOrWhiteSpace(extra) ? string.Empty : " " + extra)}",
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = now
            });
    }


    //===========================================================
    // Load a live invoice for change (row locked FOR UPDATE
    // inside the caller's transaction)
    //===========================================================

    private async Task<THeader>
        LoadAsync
        (
            long id
        )
    {
        await _context.Database.ExecuteSqlRawAsync(
            "SELECT 1 FROM \"" + Page.TableName + "\" WHERE \"SalesInvoiceId\" = {0} FOR UPDATE",
            id);

        THeader? entity =
            await _context
                .Set<THeader>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.SalesInvoiceId == id
                        &&
                        !x.IsDeleted
                );

        if (entity == null || entity.PageType != Page.PageType)
        {
            throw new KeyNotFoundException(
                "Sales invoice not found.");
        }

        return entity;
    }


    private static void RequireStatus
    (
        THeader entity,
        string action,
        params string[] statuses
    )
    {
        if (!statuses.Contains(entity.Status))
        {
            throw new InvalidOperationException(
                $"Sales invoice {entity.InvoiceNo} is {entity.Status}; only a {string.Join(" or ", statuses)} invoice can be {action}.");
        }
    }


    private async Task InTransactionAsync
    (
        Func<Task> work
    )
    {
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


    private async Task<List<TLine>>
        LinesOfAsync
        (
            long id
        )
    {
        return await _context
            .Set<TLine>()
            .Where(x => x.SalesInvoiceId == id)
            .OrderBy(x => x.LineNo)
            .ToListAsync();
    }


    private async Task<List<TPayment>>
        PaymentsOfAsync
        (
            long id
        )
    {
        return await _context
            .Set<TPayment>()
            .Where(x => x.SalesInvoiceId == id)
            .OrderBy(x => x.LineNo)
            .ToListAsync();
    }


    private static SalesInvoiceSavedDto Saved
    (
        THeader entity,
        List<string> warnings
    )
    {
        return new SalesInvoiceSavedDto
        {
            SalesInvoiceId = entity.SalesInvoiceId,
            PublicId = entity.PublicId,
            InvoiceNo = entity.InvoiceNo,
            Status = entity.Status,
            Posted = entity.Status == StatusPosted,
            ReceiptVoucherNo = entity.ReceiptVoucherNo,
            Warnings = warnings
        };
    }


    //===========================================================
    // Create (Draft; Post on Approval OFF : posted at once)
    //===========================================================

    public async Task<SalesInvoiceSavedDto>
        CreateAsync
        (
            CreateSalesInvoiceDto dto,
            bool canGiveSpecialDiscount,
            long userId
        )
    {
        SalesInvoicePage page =
            PageOf(dto.PageType);

        SwitchSet switches =
            await SwitchesAsync();

        bool postNow =
            !switches.PostOnApproval;

        DateTime now =
            DateTime.UtcNow;

        THeader entity =
            new THeader
            {
                Status = StatusDraft,
                VoucherNo = string.Empty,
                ReceiptVoucherNo = string.Empty,
                CancelReason = string.Empty,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = now
            };

        List<string> warnings =
            new();

        await InTransactionAsync(
            async () =>
            {
                PricedInvoice priced =
                    await PriceAsync(
                        dto,
                        switches,
                        new PriceOptions
                        {
                            CanSpecial = canGiveSpecialDiscount,
                            Posting = postNow,
                            UserId = userId
                        });

                ThrowIfErrors(priced);

                warnings = priced.Warnings;

                ApplyHeader(entity, page, priced);

                VoucherNumberDto number =
                    await _numberService.NextAsync(
                        page.Prefix,
                        priced.Period!.BranchId,
                        priced.InvoiceDate);

                entity.InvoiceNo =
                    number.VoucherNo;

                _context.Set<THeader>().Add(entity);

                await _context.SaveChangesAsync();

                List<TLine> lines =
                    await ReplaceDetailsAsync(
                        entity,
                        priced);

                AddHistory(entity, "Create", "Created", userId, now);

                await _context.SaveChangesAsync();

                if (postNow)
                {
                    entity.Status = StatusApproved;
                    entity.ApprovedBy = userId;
                    entity.ApprovedDate = now;

                    await PostCoreAsync(
                        entity,
                        lines,
                        priced.Payments,
                        priced,
                        userId,
                        now,
                        "Posted (on save)");
                }
            });

        return Saved(entity, warnings);
    }


    //===========================================================
    // Update (Draft; Post on Approval OFF : posted at once)
    //===========================================================

    public async Task<SalesInvoiceSavedDto>
        UpdateAsync
        (
            UpdateSalesInvoiceDto dto,
            bool canGiveSpecialDiscount,
            long userId
        )
    {
        SalesInvoicePage page =
            PageOf(dto.PageType);

        SwitchSet switches =
            await SwitchesAsync();

        bool postNow =
            !switches.PostOnApproval;

        THeader? saved =
            null;

        List<string> warnings =
            new();

        await InTransactionAsync(
            async () =>
            {
                THeader entity =
                    await LoadAsync(dto.SalesInvoiceId);

                RequireStatus(entity, "edited", StatusDraft);

                PricedInvoice priced =
                    await PriceAsync(
                        dto,
                        switches,
                        new PriceOptions
                        {
                            CanSpecial = canGiveSpecialDiscount,
                            SavedDate = entity.InvoiceDate,
                            Posting = postNow,
                            UserId = userId,
                            InvoiceNo = entity.InvoiceNo
                        });

                ThrowIfErrors(priced);

                warnings = priced.Warnings;

                string expectedStart =
                    $"{page.Prefix}-{priced.Period!.BranchDigits}-{priced.Period.FinancialYearCode}-{priced.Period.PeriodMonth:D2}-";

                if (!entity.InvoiceNo.StartsWith(expectedStart, StringComparison.Ordinal))
                {
                    VoucherNumberDto number =
                        await _numberService.NextAsync(
                            page.Prefix,
                            priced.Period.BranchId,
                            priced.InvoiceDate);

                    entity.InvoiceNo =
                        number.VoucherNo;
                }

                ApplyHeader(entity, page, priced);

                DateTime now =
                    DateTime.UtcNow;

                entity.ModifiedBy = userId;
                entity.ModifiedDate = now;

                List<TLine> lines =
                    await ReplaceDetailsAsync(
                        entity,
                        priced);

                AddHistory(entity, "Update", "Updated", userId, now);

                await _context.SaveChangesAsync();

                if (postNow)
                {
                    entity.Status = StatusApproved;
                    entity.ApprovedBy = userId;
                    entity.ApprovedDate = now;

                    await PostCoreAsync(
                        entity,
                        lines,
                        priced.Payments,
                        priced,
                        userId,
                        now,
                        "Posted (on save)");
                }

                saved = entity;
            });

        return Saved(saved!, warnings);
    }


    //===========================================================
    // Delete (Draft only, soft)
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        await InTransactionAsync(
            async () =>
            {
                THeader entity =
                    await LoadAsync(id);

                RequireStatus(entity, "deleted", StatusDraft);

                DateTime now =
                    DateTime.UtcNow;

                entity.IsDeleted = true;
                entity.DeletedBy = userId;
                entity.DeletedDate = now;

                AddHistory(entity, "Delete", "Deleted", userId, now);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Restore (most recently deleted draft of the page)
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            string pageType,
            long userId
        )
    {
        SalesInvoicePage page =
            PageOf(pageType);

        THeader? entity =
            await _context
                .Set<THeader>()
                .Where(x => x.IsDeleted && x.PageType == page.PageType)
                .OrderByDescending(x => x.DeletedDate)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        DateTime now =
            DateTime.UtcNow;

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = now;

        AddHistory(entity, "Restore", "Restored", userId, now);

        await _context.SaveChangesAsync();

        return true;
    }


    //===========================================================
    // Approve (Draft -> Approved; priced again, must not change)
    //===========================================================

    public async Task
        ApproveAsync
        (
            long id,
            long userId
        )
    {
        await InTransactionAsync(
            async () =>
            {
                THeader entity =
                    await LoadAsync(id);

                RequireStatus(entity, "approved", StatusDraft);

                List<TLine> lines =
                    await LinesOfAsync(id);

                List<TPayment> payments =
                    await PaymentsOfAsync(id);

                PricedInvoice priced =
                    await PriceAsync(
                        AsInput(entity, lines, payments),
                        await SwitchesAsync(),
                        new PriceOptions
                        {
                            // Given by the user who saved it
                            CanSpecial = true,
                            SavedDate = entity.InvoiceDate,
                            Posting = false,
                            UserId = userId,
                            InvoiceNo = entity.InvoiceNo
                        });

                RequireSameFigures(entity, lines, priced);

                DateTime now =
                    DateTime.UtcNow;

                entity.Status = StatusApproved;
                entity.ApprovedBy = userId;
                entity.ApprovedDate = now;

                AddHistory(entity, "Approve", "Approved", userId, now);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Return to Draft (Approved -> Draft)
    //===========================================================

    public async Task
        ReturnToDraftAsync
        (
            long id,
            long userId
        )
    {
        await InTransactionAsync(
            async () =>
            {
                THeader entity =
                    await LoadAsync(id);

                RequireStatus(entity, "returned to draft", StatusApproved);

                DateTime now =
                    DateTime.UtcNow;

                entity.Status = StatusDraft;
                entity.ApprovedBy = null;
                entity.ApprovedDate = null;
                entity.ModifiedBy = userId;
                entity.ModifiedDate = now;

                AddHistory(entity, "ReturnToDraft", "Returned To Draft", userId, now);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Post (Approved -> Posted; priced again, must not change)
    //===========================================================

    public async Task<SalesInvoiceSavedDto>
        PostAsync
        (
            long id,
            long userId
        )
    {
        THeader? posted =
            null;

        List<string> warnings =
            new();

        await InTransactionAsync(
            async () =>
            {
                THeader entity =
                    await LoadAsync(id);

                RequireStatus(entity, "posted", StatusApproved);

                List<TLine> lines =
                    await LinesOfAsync(id);

                List<TPayment> payments =
                    await PaymentsOfAsync(id);

                PricedInvoice priced =
                    await PriceAsync(
                        AsInput(entity, lines, payments),
                        await SwitchesAsync(),
                        new PriceOptions
                        {
                            CanSpecial = true,
                            SavedDate = entity.InvoiceDate,
                            Posting = true,
                            UserId = userId,
                            InvoiceNo = entity.InvoiceNo
                        });

                RequireSameFigures(entity, lines, priced);

                warnings = priced.Warnings;

                // The batches taken now (costs may have moved)
                foreach (TLine line in lines)
                {
                    PricedLine now =
                        priced.Lines.First(x => x.LineNo == line.LineNo);

                    line.CostAmount = now.Cost;
                    line.PriceAdjustmentShare = now.PaShare;
                    line.BelowCost = now.BelowCost;
                    line.UnallocatedQuantity = now.Unallocated;
                    line.PlannedAllocations = JsonSerializer.Serialize(AllocationsOf(now));
                }

                entity.CostAmount = priced.Cost;

                await PostCoreAsync(
                    entity,
                    lines,
                    payments,
                    priced,
                    userId,
                    DateTime.UtcNow,
                    "Posted");

                posted = entity;
            });

        return Saved(posted!, warnings);
    }


    //===========================================================
    // Post core : journal, stock out, VAT register, Price
    // Adjustment release, Receipt Voucher. Runs inside the
    // caller's transaction; the lines are saved (ids given) and
    // match priced.Lines by LineNo.
    //===========================================================

    private async Task
        PostCoreAsync
        (
            THeader entity,
            List<TLine> lines,
            List<TPayment> payments,
            PricedInvoice priced,
            long userId,
            DateTime now,
            string verb
        )
    {
        string receivable =
            (entity.ReceivableLedgerCode ?? string.Empty).Trim();

        if (receivable.Length == 0)
        {
            throw new InvalidOperationException(
                $"Customer '{entity.CustomerName}' has no receivable ledger (Customer Profiles).");
        }

        string narration =
            Limit($"Sales invoice {entity.InvoiceNo} to {entity.CustomerName}", 500);

        List<VoucherPostingLine> journal =
            new();

        void Debit(string ledger, decimal amount, string text, bool party = false)
        {
            if (amount > 0m)
            {
                journal.Add(
                    new VoucherPostingLine
                    {
                        GroupNo = 1,
                        LedgerCode = ledger,
                        Debit = amount,
                        Credit = 0m,
                        Narration = Limit(text, 500),
                        PartyType = party ? PartyCustomer : string.Empty,
                        PartyCode = party ? entity.CustomerCode : string.Empty
                    });
            }
        }

        void Credit(string ledger, decimal amount, string text)
        {
            if (amount > 0m)
            {
                journal.Add(
                    new VoucherPostingLine
                    {
                        GroupNo = 1,
                        LedgerCode = ledger,
                        Debit = 0m,
                        Credit = amount,
                        Narration = Limit(text, 500)
                    });
            }
        }

        //=======================================================
        // Customer and discounts
        //=======================================================

        Debit(receivable, priced.InvoiceTotal, narration, true);

        if (priced.CampaignDiscount > 0m)
        {
            Debit(
                PostingLedgerCodes.Get(_context, Page.PurposeCampaignDiscount),
                priced.CampaignDiscount,
                $"Campaign discount, sales invoice {entity.InvoiceNo}");
        }

        if (priced.MembershipDiscount > 0m)
        {
            string ledger =
                priced.Membership?.DiscountLedgerCode ?? string.Empty;

            if (ledger.Length == 0)
            {
                throw new InvalidOperationException(
                    $"Membership card '{priced.Membership?.CardName}' has no Discount ledger (Membership Cards).");
            }

            Debit(
                ledger,
                priced.MembershipDiscount,
                $"Membership discount ({priced.Membership!.CardName}, {priced.Membership.MembershipNo}), sales invoice {entity.InvoiceNo}");
        }

        if (priced.SpecialDiscount > 0m)
        {
            Debit(
                PostingLedgerCodes.Get(_context, Page.PurposeSpecialDiscount),
                priced.SpecialDiscount,
                $"Special discount, sales invoice {entity.InvoiceNo}");
        }

        if (priced.FractionalDiscount > 0m)
        {
            Debit(
                PostingLedgerCodes.Get(_context, Page.PurposeFractionalDiscount),
                priced.FractionalDiscount,
                $"Fractional discount, sales invoice {entity.InvoiceNo}");
        }

        //=======================================================
        // Sales (gross - VAT inside) to each product's own sales
        // ledger (Product Sales Accounts, 2026-11-04), VAT (base
        // VAT), the VAT difference per line (Case A)
        //=======================================================

        PricedLine? noSalesLedger =
            priced.Lines.FirstOrDefault(x => x.Product.SalesLedgerCode.Length == 0);

        if (noSalesLedger != null)
        {
            throw new InvalidOperationException(
                $"{noSalesLedger.Product.ProductCode} ({noSalesLedger.Product.ProductName}) has no sales ledger. Save it once on its product page (or run ProductSales_Accounts.sql).");
        }

        foreach
        (
            var sales
            in priced.Lines
                .GroupBy(x => x.Product.SalesLedgerCode)
                .OrderBy(x => x.Min(l => l.LineNo))
        )
        {
            Credit(
                sales.Key,
                sales.Sum(x => x.Gross - x.VatInside),
                sales.Count() == 1
                    ? $"{sales.First().Product.ProductName}, sales invoice {entity.InvoiceNo}"
                    : $"{sales.Count()} lines, sales invoice {entity.InvoiceNo}");
        }

        decimal increase =
            priced.Lines.Sum(x => Math.Max(x.VatInside - x.BaseVat, 0m));

        decimal reduction =
            priced.Lines.Sum(x => Math.Max(x.BaseVat - x.VatInside, 0m));

        string vatLedger =
            string.Empty;

        if (priced.BaseVat > 0m)
        {
            vatLedger =
                PostingLedgerCodes.Get(_context, Page.PurposeVat);

            Credit(
                vatLedger,
                priced.BaseVat,
                $"VAT (paid at source), sales invoice {entity.InvoiceNo}");
        }

        if (increase > 0m)
        {
            Credit(
                PostingLedgerCodes.Get(_context, PostingPurposes.PriceIncreaseIncome),
                increase,
                $"VAT inside the price above the VAT paid at source, sales invoice {entity.InvoiceNo}");
        }

        if (reduction > 0m)
        {
            Debit(
                PostingLedgerCodes.Get(_context, PostingPurposes.PriceReductionExpense),
                reduction,
                $"VAT paid at source above the VAT inside the price, sales invoice {entity.InvoiceNo}");
        }

        //=======================================================
        // Cost of sales : Dr COGS / Cr inventory (FIFO cost)
        //=======================================================

        Dictionary<string, decimal> cogs =
            new(StringComparer.OrdinalIgnoreCase);

        Dictionary<string, decimal> inventory =
            new(StringComparer.OrdinalIgnoreCase);

        // Both sides from the same slices (debit = credit exactly)
        foreach (PricedLine line in priced.Lines)
        {
            foreach (Slice slice in line.Slices.Where(x => x.Cost > 0m))
            {
                if (line.Product.CogsLedgerCode.Length == 0)
                {
                    throw new InvalidOperationException(
                        $"Line {line.LineNo} : '{line.Product.ProductName}' has no COGS ledger (Product Settings).");
                }

                if (slice.InventoryLedgerCode.Length == 0)
                {
                    throw new InvalidOperationException(
                        $"Line {line.LineNo} : '{line.Product.ProductName}' has no inventory ledger.");
                }

                cogs[line.Product.CogsLedgerCode] =
                    cogs.GetValueOrDefault(line.Product.CogsLedgerCode) + slice.Cost;

                inventory[slice.InventoryLedgerCode] =
                    inventory.GetValueOrDefault(slice.InventoryLedgerCode) + slice.Cost;
            }
        }

        foreach (KeyValuePair<string, decimal> row in cogs)
        {
            Debit(row.Key, row.Value, $"Cost of sales, sales invoice {entity.InvoiceNo}");
        }

        foreach (KeyValuePair<string, decimal> row in inventory)
        {
            Credit(row.Key, row.Value, $"Cost of sales, sales invoice {entity.InvoiceNo}");
        }

        //=======================================================
        // Price Adjustment release of the units sold
        //=======================================================

        PriceAdjustmentEngine adjustments =
            new(
                _context,
                _numberService,
                _postingService);

        foreach (PricedLine line in priced.Lines)
        {
            foreach (Slice slice in line.Slices.Where(x => x.Batch != null))
            {
                journal.AddRange(
                    await adjustments.ReleaseOnSaleAsync(
                        slice.Batch!.StockBatchId,
                        slice.Quantity,
                        entity.InvoiceNo,
                        entity.InvoiceDate,
                        userId));
            }
        }

        decimal debit =
            journal.Sum(x => x.Debit);

        decimal credit =
            journal.Sum(x => x.Credit);

        if (debit != credit)
        {
            throw new InvalidOperationException(
                $"Sales invoice {entity.InvoiceNo} does not balance (debit {debit:N2}, credit {credit:N2}).");
        }

        await _postingService.PostAsync(
            new VoucherPostingRequest
            {
                VoucherType = Page.Prefix,
                VoucherId = entity.SalesInvoiceId,
                VoucherNo = entity.InvoiceNo,
                VoucherDate = entity.InvoiceDate,
                BranchId = entity.BranchId,
                PartyType = PartyCustomer,
                PartyCode = entity.CustomerCode,
                ReferenceNo = string.Empty,
                Narration = narration,
                Lines = journal
            },
            userId);

        //=======================================================
        // Stock : out of the batches (movement, allocation, value
        // depleted; the batch closes at 0)
        //=======================================================

        foreach (PricedLine line in priced.Lines)
        {
            TLine saved =
                lines.First(x => x.LineNo == line.LineNo);

            foreach (Slice slice in line.Slices.Where(x => x.Batch != null))
            {
                StockBatchesEntity batch =
                    slice.Batch!;

                if (slice.Quantity > batch.QuantityOnHand)
                {
                    throw new InvalidOperationException(
                        $"Line {line.LineNo} : batch {batch.BatchNo} has only {Qty(batch.QuantityOnHand)} on hand.");
                }

                _context.Set<StockMovementsEntity>().Add(
                    new StockMovementsEntity
                    {
                        StockBatchId = batch.StockBatchId,
                        ProductType = Page.PageType,
                        ProductId = batch.ProductId,
                        BranchId = entity.BranchId,
                        WarehouseId = entity.WarehouseId,
                        Bucket = BatchOnHand,
                        MovementType = MoveSale,
                        QuantityIn = 0m,
                        QuantityOut = slice.Quantity,
                        UnitCost = batch.UnitCost,
                        Value = slice.Cost,
                        DocumentType = Page.Prefix,
                        DocumentId = entity.SalesInvoiceId,
                        DocumentLineId = saved.SalesInvoiceLineId,
                        DocumentNo = entity.InvoiceNo,
                        DocumentDate = entity.InvoiceDate,
                        IsReversal = false,
                        Narration = Limit(narration, 300),
                        CreatedBy = userId,
                        CreatedDate = now
                    });

                _context.Set<StockAllocationsEntity>().Add(
                    new StockAllocationsEntity
                    {
                        StockBatchId = batch.StockBatchId,
                        DocumentType = Page.Prefix,
                        DocumentId = entity.SalesInvoiceId,
                        DocumentLineId = saved.SalesInvoiceLineId,
                        Quantity = slice.Quantity,
                        UnitCost = batch.UnitCost,
                        Value = slice.Cost,
                        IsReversed = false,
                        CreatedBy = userId,
                        CreatedDate = now
                    });

                batch.QuantityOnHand -= slice.Quantity;
                batch.QuantityOut += slice.Quantity;
                batch.RemainingValue -= slice.Cost;

                if (batch.QuantityOnHand + batch.QuantityInTransit <= 0m)
                {
                    batch.Status = BatchClosed;
                }

                batch.ModifiedBy = userId;
                batch.ModifiedDate = now;
            }

            //===================================================
            // VAT register : one Sale row per line (VAT = the base
            // VAT credited to the VAT Current Account)
            //===================================================

            if (entity.VatApplicable && (line.BaseVat != 0m || line.VatInside != 0m))
            {
                _context.Set<VatRegisterEntity>().Add(
                    new VatRegisterEntity
                    {
                        Direction = "Sale",
                        DocumentType = Page.Prefix,
                        DocumentId = entity.SalesInvoiceId,
                        DocumentLineId = saved.SalesInvoiceLineId,
                        DocumentNo = entity.InvoiceNo,
                        DocumentDate = entity.InvoiceDate,
                        MushakNo = string.Empty,
                        MushakDate = null,
                        PartyType = PartyCustomer,
                        PartyCode = Limit(entity.CustomerCode, 30),
                        PartyName = Limit(entity.CustomerName, 200),
                        PartyBin = string.Empty,
                        BranchId = entity.BranchId,
                        ProductType = Page.PageType,
                        ProductId = line.Product.ProductId,
                        ProductCode = Limit(line.Product.ProductCode, 40),
                        ProductName = Limit(line.Product.ProductName, 250),
                        Quantity = line.Quantity,
                        TaxableValue = line.Gross - line.VatInside,
                        VatRate = line.VatRate,
                        VatAmount = line.BaseVat,
                        VatClaimable = 0m,
                        VatLedgerCode = Limit(vatLedger, 30),
                        IsReversal = false,
                        CreatedBy = userId,
                        CreatedDate = now
                    });
            }
        }

        await _context.SaveChangesAsync();

        //=======================================================
        // Payments : a posted Receipt Voucher (own RV number)
        //=======================================================

        if (entity.PaidAmount > 0m)
        {
            ReceiptVoucherSavedDto receipt =
                await _receiptVouchers.CreatePostedAsync(
                    ReceiptOf(
                        entity.InvoiceDate,
                        entity.BranchId,
                        entity.InvoiceNo,
                        entity.CustomerName,
                        receivable,
                        entity.PaidAmount,
                        payments),
                    entity.InvoiceNo,
                    userId);

            entity.ReceiptVoucherId = receipt.ReceiptVoucherId;
            entity.ReceiptVoucherNo = receipt.VoucherNo;
        }

        entity.Status = StatusPosted;
        entity.PostedBy = userId;
        entity.PostedDate = now;
        entity.VoucherNo = entity.InvoiceNo;

        AddHistory(
            entity,
            "Post",
            verb,
            userId,
            now,
            entity.ReceiptVoucherNo.Length > 0
                ? $"Receipt {entity.ReceiptVoucherNo} ({entity.PaidAmount:N2})."
                : string.Empty);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Cancel
    //   Approved : -> Cancelled (nothing was posted)
    //   Posted   : Allow Cancel of Posted Invoice ON and within its
    //              days; journal reversed (dated today), Receipt
    //              Voucher cancelled, stock back to the same batches
    //              at their cost, VAT register reversed. Refused
    //              when a Price Adjustment was released by it or
    //              anything was returned.
    //===========================================================

    public async Task
        CancelAsync
        (
            long id,
            CancelSalesInvoiceDto dto,
            long userId
        )
    {
        string reason =
            OneLine(dto?.Reason, 500);

        if (reason.Length < 5)
        {
            throw new InvalidOperationException(
                "A reason (at least 5 characters) is required to cancel the invoice.");
        }

        await InTransactionAsync(
            async () =>
            {
                THeader entity =
                    await LoadAsync(id);

                RequireStatus(entity, "cancelled", StatusApproved, StatusPosted);

                DateTime now =
                    DateTime.UtcNow;

                DateOnly today =
                    BusinessToday();

                if (entity.Status == StatusPosted)
                {
                    SwitchSet switches =
                        await SwitchesAsync();

                    if (!switches.AllowCancelPosted)
                    {
                        throw new InvalidOperationException(
                            "A posted invoice cannot be cancelled (System Configuration › Allow Cancel of Posted Invoice is OFF); use Sales Returns.");
                    }

                    if (switches.CancelWithinDays.HasValue
                        && today.DayNumber - entity.InvoiceDate.DayNumber > switches.CancelWithinDays.Value)
                    {
                        throw new InvalidOperationException(
                            $"Sales invoice {entity.InvoiceNo} can be cancelled only within {switches.CancelWithinDays.Value} days of its date; use Sales Returns.");
                    }

                    List<TLine> lines =
                        await LinesOfAsync(id);

                    if (lines.Any(x => x.ReturnedQuantity > 0m))
                    {
                        throw new InvalidOperationException(
                            $"Sales invoice {entity.InvoiceNo} has returns; it cannot be cancelled.");
                    }

                    bool released =
                        await _context
                            .Set<PriceAdjustmentReleasesEntity>()
                            .AsNoTracking()
                            .AnyAsync(x => x.SourceType == ReleaseSale && x.SourceNo == entity.InvoiceNo);

                    if (released)
                    {
                        throw new InvalidOperationException(
                            $"Sales invoice {entity.InvoiceNo} released a Price Adjustment, which cannot be taken back yet; it cannot be cancelled. Use Sales Returns.");
                    }

                    await _postingService.ReverseAsync(
                        entity.VoucherNo.Length > 0 ? entity.VoucherNo : entity.InvoiceNo,
                        today,
                        reason,
                        userId);

                    //===================================================
                    // Receipt Voucher : cancelled (its own checks : a
                    // cheque / MFS / card already reconciled stops it)
                    //===================================================

                    if (entity.ReceiptVoucherId.HasValue)
                    {
                        ReceiptVoucherDto? receipt =
                            await _receiptVouchers.GetByIdAsync(entity.ReceiptVoucherId.Value);

                        if (receipt != null && receipt.Status == StatusPosted)
                        {
                            await _receiptVouchers.CancelAsync(
                                receipt.ReceiptVoucherId,
                                new CancelReceiptVoucherDto
                                {
                                    CancelDate = string.Empty,
                                    Reason = Limit($"Sales invoice {entity.InvoiceNo} cancelled : {reason}", 500)
                                },
                                userId);
                        }
                    }

                    //===================================================
                    // Stock back to the same batches at their cost
                    //===================================================

                    List<StockAllocationsEntity> allocations =
                        await _context
                            .Set<StockAllocationsEntity>()
                            .Where
                            (
                                x =>
                                    x.DocumentType == Page.Prefix
                                    &&
                                    x.DocumentId == entity.SalesInvoiceId
                                    &&
                                    !x.IsReversed
                            )
                            .ToListAsync();

                    List<long> batchIds =
                        allocations.Select(x => x.StockBatchId).Distinct().ToList();

                    if (batchIds.Count > 0)
                    {
                        await _context.Database.ExecuteSqlRawAsync(
                            "SELECT 1 FROM \"StockBatches\" WHERE \"StockBatchId\" = ANY({0}) FOR UPDATE",
                            batchIds.ToArray());
                    }

                    Dictionary<long, StockBatchesEntity> batches =
                        await _context
                            .Set<StockBatchesEntity>()
                            .Where(x => batchIds.Contains(x.StockBatchId))
                            .ToDictionaryAsync(x => x.StockBatchId);

                    foreach (StockAllocationsEntity allocation in allocations)
                    {
                        StockBatchesEntity batch =
                            batches[allocation.StockBatchId];

                        _context.Set<StockMovementsEntity>().Add(
                            new StockMovementsEntity
                            {
                                StockBatchId = batch.StockBatchId,
                                ProductType = Page.PageType,
                                ProductId = batch.ProductId,
                                BranchId = entity.BranchId,
                                WarehouseId = entity.WarehouseId,
                                Bucket = BatchOnHand,
                                MovementType = MoveSaleCancel,
                                QuantityIn = allocation.Quantity,
                                QuantityOut = 0m,
                                UnitCost = allocation.UnitCost,
                                Value = allocation.Value,
                                DocumentType = Page.Prefix,
                                DocumentId = entity.SalesInvoiceId,
                                DocumentLineId = allocation.DocumentLineId,
                                DocumentNo = entity.InvoiceNo,
                                DocumentDate = today,
                                IsReversal = true,
                                Narration = Limit($"Cancelled : {reason}", 300),
                                CreatedBy = userId,
                                CreatedDate = now
                            });

                        batch.QuantityOnHand += allocation.Quantity;
                        batch.QuantityOut -= allocation.Quantity;
                        batch.RemainingValue += allocation.Value;

                        // A closed batch opens again (same rule as
                        // Product Receiving : units still in transit
                        // keep it InTransit)
                        if (batch.Status == BatchClosed)
                        {
                            batch.Status =
                                batch.QuantityInTransit > 0m
                                    ? BatchInTransit
                                    : BatchOnHand;
                        }

                        batch.ModifiedBy = userId;
                        batch.ModifiedDate = now;

                        allocation.IsReversed = true;
                    }

                    //===================================================
                    // VAT register reversed
                    //===================================================

                    List<VatRegisterEntity> vatRows =
                        await _context
                            .Set<VatRegisterEntity>()
                            .AsNoTracking()
                            .Where
                            (
                                x =>
                                    x.DocumentType == Page.Prefix
                                    &&
                                    x.DocumentId == entity.SalesInvoiceId
                                    &&
                                    !x.IsReversal
                            )
                            .ToListAsync();

                    foreach (VatRegisterEntity row in vatRows)
                    {
                        row.VatRegisterId = 0;
                        row.DocumentDate = today;
                        row.IsReversal = true;
                        row.CreatedBy = userId;
                        row.CreatedDate = now;

                        _context.Set<VatRegisterEntity>().Add(row);
                    }
                }

                entity.Status = StatusCancelled;
                entity.CancelReason = reason;
                entity.CancelledBy = userId;
                entity.CancelledDate = now;

                AddHistory(entity, "Cancel", "Cancelled", userId, now, $"Reason : {reason}");

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Exists
    //===========================================================

    public async Task<bool>
        ExistsAsync
        (
            long id
        )
    {
        return await _context
            .Set<THeader>()
            .AnyAsync
            (
                x =>
                    x.SalesInvoiceId == id
                    &&
                    !x.IsDeleted
            );
    }


    //===========================================================
    // List page (server paging) : search, tab, sort and page on
    // the server. Counts : All and one per status (search
    // applied).
    //===========================================================

    //===========================================================
    // Paged list : a search word that is a date (25-10-2026,
    // 25/10/2026 or 2026-10-25), null otherwise
    //===========================================================

    private static DateOnly? SearchDate(
        string text)
    {
        string[] formats =
        {
            "d-M-yyyy", "dd-MM-yyyy", "d/M/yyyy", "dd/MM/yyyy", "yyyy-MM-dd"
        };

        return DateOnly.TryParseExact(
            (text ?? string.Empty).Trim(),
            formats,
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out DateOnly date)
            ? date
            : null;
    }

    public async Task<SalesInvoicePagedResult>
        GetPagedAsync
        (
            string pageType,
            SalesInvoicePageRequest request
        )
    {
        string type =
            PageOf(pageType).PageType;

        IQueryable<THeader> query =
            _context
                .Set<THeader>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.PageType == type);

        foreach
        (
            string word in request.SafeSearch.Split(' ', StringSplitOptions.RemoveEmptyEntries)
        )
        {
            string like =
                AppCore.Infrastructure.Persistence.Paging.PagingQuery.LikePattern(word);

            DateOnly? date =
                SearchDate(word);

            DateOnly day =
                date ?? DateOnly.MinValue;

            bool isDate =
                date.HasValue;

            bool walkIn =
                word.Trim().ToLowerInvariant() is "walk-in" or "walkin" or "walk";

            query =
                query.Where
                (
                    x =>
                        (isDate && x.InvoiceDate == day) ||
                        (walkIn && x.CustomerIsWalkIn) ||
                        EF.Functions.ILike(x.InvoiceNo, like) ||
                        EF.Functions.ILike(x.CustomerName, like) ||
                        EF.Functions.ILike(x.CustomerCode, like) ||
                        EF.Functions.ILike(x.CustomerPhone, like) ||
                        EF.Functions.ILike(x.CustomerType, like) ||
                        EF.Functions.ILike(x.WarehouseName, like) ||
                        EF.Functions.ILike(x.SalesPersonName, like) ||
                        EF.Functions.ILike(x.Narration, like) ||
                        EF.Functions.ILike(x.Status, like)
                );
        }

        var statusCounts =
            await query
                .GroupBy(x => x.Status)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToListAsync();

        string tab =
            (request.Tab ?? string.Empty).Trim().ToLowerInvariant();

        if (tab != string.Empty && tab != "all")
        {
            query = query.Where(x => x.Status.ToLower() == tab);
        }

        int total =
            await query.CountAsync();

        decimal dueTotal =
            await query
                .Where(x => x.Status == StatusPosted)
                .SumAsync(x => (decimal?)x.DueAmount) ?? 0m;

        AppCore.Infrastructure.Persistence.Paging.PagingQuery.FitPage(
            request,
            total);

        AppCore.Infrastructure.Persistence.Paging.SortMap<THeader> sorts =
            new AppCore.Infrastructure.Persistence.Paging.SortMap<THeader>("InvoiceNo")
                .Add("InvoiceNo", x => x.InvoiceNo)
                .Add("InvoiceDateText", x => x.InvoiceDate)
                .Add("CustomerText", x => x.CustomerName)
                .Add("LineCountText", x => _context.Set<TLine>().Count(l => l.SalesInvoiceId == x.SalesInvoiceId))
                .Add("InvoiceTotalText", x => x.InvoiceTotal)
                .Add("PaidText", x => x.PaidAmount)
                .Add("DueText", x => x.DueAmount)
                .Add("Status", x => x.Status)
                .Tie(x => x.SalesInvoiceId);

        IQueryable<THeader> ordered =
            string.IsNullOrWhiteSpace(request.Sort)
                ? query
                    .OrderByDescending(x => x.InvoiceDate)
                    .ThenByDescending(x => x.InvoiceNo)
                : sorts.Apply(query, request);

        List<THeader> rows =
            await AppCore.Infrastructure.Persistence.Paging.PagingQuery
                .Page(ordered, request)
                .ToListAsync();

        List<long> ids =
            rows.Select(x => x.SalesInvoiceId).ToList();

        Dictionary<long, int> lineCounts =
            ids.Count == 0
                ? new Dictionary<long, int>()
                : await _context
                    .Set<TLine>()
                    .AsNoTracking()
                    .Where(x => ids.Contains(x.SalesInvoiceId))
                    .GroupBy(x => x.SalesInvoiceId)
                    .Select(g => new { Id = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.Id, x => x.Count);

        Dictionary<string, int> counts =
            new()
            {
                ["All"] = statusCounts.Sum(x => x.Count)
            };

        foreach (var row in statusCounts)
        {
            counts[row.Key] = row.Count;
        }

        return new SalesInvoicePagedResult
        {
            Items = rows.Select(x => ToListDto(x, lineCounts.GetValueOrDefault(x.SalesInvoiceId))).ToList(),
            TotalCount = total,
            Page = request.SafePage,
            PageSize = request.SafePageSize,
            Counts = counts,
            DueTotal = dueTotal
        };
    }


    //===========================================================
    // Public Id -> internal id (live rows only)
    //===========================================================

    public async Task<long?>
        GetIdByPublicIdAsync
        (
            Guid publicId
        )
    {
        if
        (
            publicId == Guid.Empty
        )
        {
            return null;
        }

        return await _context
            .Set<THeader>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.PublicId == publicId)
            .Select(x => (long?)x.SalesInvoiceId)
            .FirstOrDefaultAsync();
    }
}
