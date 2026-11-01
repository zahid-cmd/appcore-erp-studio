//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Platform.Accounting;
using AppCore.Application.Procurement.Shared;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.Procurement.Shared;
using AppCore.Domain.Platform.Accounting;
using AppCore.Infrastructure.CodeMaster;
using AppCore.Infrastructure.Persistence;

using static AppCore.Infrastructure.Repositories.Procurement.Shared.PurchaseOrderPricing;

using PurchasesSpEntity =
    AppCore.Domain.Entities.Procurement.SparePartsLubricantPurchase.PurchasesSp;

using PurchasesSpLinesEntity =
    AppCore.Domain.Entities.Procurement.SparePartsLubricantPurchase.PurchasesSpLines;

using PurchasesAcEntity =
    AppCore.Domain.Entities.Procurement.AccessoriesPurchase.PurchasesAc;

using PurchasesAcLinesEntity =
    AppCore.Domain.Entities.Procurement.AccessoriesPurchase.PurchasesAcLines;

using SupplierProfilesEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.SupplierProfiles;

using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;

using SparePartsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SpareParts;

using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using PurchaseVatEntity =
    AppCore.Domain.Entities.VatManagement.VatSetup.PurchaseVat;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Procurement.Shared;


//===============================================================
// Purchase Orders Repository : one engine for every Purchase
// Order page. Each page (MB / SP / AC) is a small class that
// gives its tables (THeader / TLine) and its PurchaseOrderPage
// (type, number prefix, supply types, switch codes, pricing).
//
// Draft    : Create / Update / Delete / Restore. The number is
//            taken on the first save; a new number when branch,
//            financial year or month changes (old one = gap).
// Approve  : Draft → Approved (locked)
// Return   : Approved → Draft
// Place    : Approved → Placed (sent to the supplier)
// Close    : Placed → Closed Short (reason; rest will not come)
// Cancel   : Approved / Placed with nothing billed → Cancelled
//            (reason)
// Completed is set later by the purchase entries.
//
// Lines : one product per line, active and of the page's type.
// MRP pricing (SP / AC) : MRP / Profit % / DP, free qty, additional
// discount, whole-taka rounding. MB : unit price (DP) only.
// Supplier terms (Supplier Profile) fixed while the page's switch
// "Edit Supplier Terms" is OFF.
// Nothing is posted to the ledgers.
//===============================================================

public abstract class PurchaseOrderRepositoryBase<THeader, TLine>
    : IPurchaseOrderRepository
    where THeader : PurchaseOrderHeader, new()
    where TLine : PurchaseOrderLine, new()
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Procurement";

    private const string EntityName =
        "PurchaseOrder";

    private const string DateFormat =
        "yyyy-MM-dd";

    public const string StatusDraft = "Draft";

    public const string StatusApproved = "Approved";

    public const string StatusPlaced = "Placed";

    public const string StatusCompleted = "Completed";

    public const string StatusClosedShort = "Closed Short";

    public const string StatusCancelled = "Cancelled";

    private const string General = "General";

    private const string TypeMotorBikes = "Motor Bikes";

    private const string TypeSpareParts = "Spare Parts";

    private const string TypeLubricants = "Lubricants";

    private const string TypeAccessories = "Accessories";

    private const decimal MaxMoney =
        9_999_999_999_999_999.99m;


    //===========================================================
    // This page : type, prefix, tables, switch codes, pricing
    //===========================================================

    protected abstract PurchaseOrderPage Page { get; }


    // The page type sent must be this page's
    private PurchaseOrderPage PageOf
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
    // Supplier terms (Supplier Profile) vs the order : the first
    // term that differs, or null. A term not set is free.
    //===========================================================

    private static string? SupplierTermsProblem
    (
        SupplierProfilesEntity supplier,
        PoInput input,
        bool mrpPricing
    )
    {
        string priceEntry =
            (supplier.DefaultPriceEntry ?? string.Empty).Trim();

        if (priceEntry.Length > 0 && input.PurchaseVatApplicable)
        {
            string orderEntry =
                input.NoVatInvoice
                    ? "None"
                    : input.PriceIncludesVat
                        ? "Incl"
                        : "Excl";

            if (!string.Equals(priceEntry, orderEntry, StringComparison.OrdinalIgnoreCase))
            {
                return "Prices (Incl. VAT / Excl. VAT / No VAT)";
            }
        }

        if (!mrpPricing)
        {
            return null;
        }

        string invoicePrice =
            (supplier.DefaultInvoicePrice ?? string.Empty).Trim();

        if (invoicePrice.Length > 0 && !string.Equals(invoicePrice, input.InvoicePriceBasis, StringComparison.OrdinalIgnoreCase))
        {
            return "Invoice Price";
        }

        // Margin % : MRP invoice only, always on MRP
        // (a Profit % on DP is the Pricing page's, not a purchase term)
        if (supplier.DefaultProfitPercent.HasValue
            && !string.Equals((supplier.DefaultProfitOn ?? string.Empty).Trim(), BasisDp, StringComparison.OrdinalIgnoreCase)
            && input.InvoicePriceBasis == BasisMrp)
        {
            if (input.DefaultProfitPercent != supplier.DefaultProfitPercent.Value)
            {
                return $"Margin % ({supplier.DefaultProfitPercent.Value:0.##}% on MRP)";
            }
        }

        return null;
    }


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IVoucherNumberService _numberService;

    private readonly IVatApplicabilityService _vatApplicability;


    //===========================================================
    // Constructor
    //===========================================================

    protected PurchaseOrderRepositoryBase(
        AppDbContext context,
        IVoucherNumberService numberService,
        IVatApplicabilityService vatApplicability)
    {
        _context = context;

        _numberService = numberService;

        _vatApplicability = vatApplicability;
    }


    //===========================================================
    // Normalized Input
    //===========================================================

    private sealed class PoInput
    {
        public PurchaseOrderPage Page { get; set; } = new();

        public DateOnly OrderDate { get; set; }

        public DateOnly? ExpectedDate { get; set; }

        public VoucherPeriodDto Period { get; set; } = new();

        public SupplierProfilesEntity Supplier { get; set; } = new();

        public bool PriceIncludesVat { get; set; }

        public string InvoicePriceBasis { get; set; } = "DP";

        public string ProfitBasis { get; set; } = "MRP";

        public decimal DefaultProfitPercent { get; set; }

        public string AdditionalDiscountType { get; set; } = "None";

        public decimal AdditionalDiscountValue { get; set; }

        public decimal AdditionalDiscountAmount { get; set; }

        public string RoundingMethod { get; set; } = "None";

        public bool WholeTakaLines { get; set; }

        public decimal RoundingAdjustment { get; set; }

        public bool PurchaseVatApplicable { get; set; } = true;

        public bool SalesVatApplicable { get; set; } = true;

        public bool NoVatInvoice { get; set; }

        public bool VatCharged { get; set; } = true;

        public string Narration { get; set; } = string.Empty;

        public List<TLine> Lines { get; set; } = new();
    }


    // A product of the page, resolved by code
    private sealed class ProductRow
    {
        public string ProductType { get; set; } = string.Empty;

        public long ProductId { get; set; }

        public string ProductCode { get; set; } = string.Empty;

        public string ProductName { get; set; } = string.Empty;

        public string Unit { get; set; } = string.Empty;

        public long CategoryId { get; set; }

        public string CategoryName { get; set; } = string.Empty;

        public long SubCategoryId { get; set; }

        public string SubCategoryName { get; set; } = string.Empty;

        // Saved image path (MB / SP; accessories have none)
        public string ImagePath { get; set; } = string.Empty;

        // Stock levels of the item (company wide; 0 = not set)
        public int ReorderLevel { get; set; }

        public int RedLevel { get; set; }

        public int MaxStockLevel { get; set; }

        // Brand of the category (null : category saved without one)
        public long? BrandId { get; set; }

        public bool IsActive { get; set; }
    }


    //===========================================================
    // Get All (list : header only, one page)
    //===========================================================

    public async Task<List<PurchaseOrderDto>>
        GetAllAsync
        (
            string pageType
        )
    {
        PurchaseOrderPage page =
            PageOf(pageType);

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
                )
                .OrderByDescending(x => x.OrderDate)
                .ThenByDescending(x => x.OrderNo)
                .ToListAsync();

        return rows
            .Select(ToDto)
            .ToList();
    }


    //===========================================================
    // Get By Id (header + lines)
    //===========================================================

    public async Task<PurchaseOrderDto?>
        GetByIdAsync
        (
            long id
        )
    {
        THeader? row =
            await _context
                .Set<THeader>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.PurchaseOrderId == id
                        &&
                        !x.IsDeleted
                );

        if (row == null)
        {
            return null;
        }

        PurchaseOrderDto dto =
            ToDto(row);

        dto.Lines =
            await _context
                .Set<TLine>()
                .AsNoTracking()
                .Where(x => x.PurchaseOrderId == id)
                .OrderBy(x => x.LineNo)
                .Select
                (
                    x =>
                        new PurchaseOrderLineDto
                        {
                            LineNo = x.LineNo,
                            ProductType = x.ProductType,
                            ProductId = x.ProductId,
                            ProductCode = x.ProductCode,
                            ProductName = x.ProductName,
                            Unit = x.Unit,
                            Quantity = x.Quantity,
                            FreeQuantity = x.FreeQuantity,
                            Mrp = x.Mrp,
                            ProfitPercent = x.ProfitPercent,
                            UnitPrice = x.UnitPrice,
                            IsAdjusted = x.IsAdjusted,
                            IsTotalTyped = x.IsTotalTyped,
                            GrossMrp = x.GrossMrp,
                            DpAmount = x.DpAmount,
                            ProfitAmount = x.ProfitAmount,
                            DiscountShare = x.DiscountShare,
                            NetAmount = x.NetAmount,
                            VatRate = x.VatRate,
                            VatClaimable = x.VatClaimable,
                            Amount = x.Amount,
                            VatAmount = x.VatAmount,
                            LineTotal = x.LineTotal,
                            RoundingShare = x.RoundingShare,
                            NetUnitCost = x.NetUnitCost,
                            BilledQuantity = x.BilledQuantity,
                            ShortNotes = x.ShortNotes
                        }
                )
                .ToListAsync();

        return dto;
    }


    private static PurchaseOrderDto ToDto
    (
        THeader x
    )
    {
        return new PurchaseOrderDto
        {
            PurchaseOrderId = x.PurchaseOrderId,
            PageType = x.PageType,
            OrderNo = x.OrderNo,
            OrderDate = x.OrderDate.ToString(DateFormat, CultureInfo.InvariantCulture),
            ExpectedDate = x.ExpectedDate?.ToString(DateFormat, CultureInfo.InvariantCulture) ?? string.Empty,
            BranchId = x.BranchId,
            BranchCode = x.BranchCode,
            BranchName = x.BranchName,
            FinancialYearId = x.FinancialYearId,
            SupplierCode = x.SupplierCode,
            SupplierName = x.SupplierName,
            PriceIncludesVat = x.PriceIncludesVat,
            InvoicePriceBasis = x.InvoicePriceBasis,
            ProfitBasis = x.ProfitBasis,
            DefaultProfitPercent = x.DefaultProfitPercent,
            AdditionalDiscountType = x.AdditionalDiscountType,
            AdditionalDiscountValue = x.AdditionalDiscountValue,
            AdditionalDiscountAmount = x.AdditionalDiscountAmount,
            RoundingMethod = x.RoundingMethod,
            WholeTakaLines = x.WholeTakaLines,
            RoundingAdjustment = x.RoundingAdjustment,
            PurchaseVatApplicable = x.PurchaseVatApplicable,
            SalesVatApplicable = x.SalesVatApplicable,
            NoVatInvoice = x.NoVatInvoice,
            VatCharged = x.VatCharged,
            TotalFreeQuantity = x.TotalFreeQuantity,
            TotalMrp = x.TotalMrp,
            TotalProfit = x.TotalProfit,
            TotalDp = x.TotalDp,
            TotalQuantity = x.TotalQuantity,
            TotalAmount = x.TotalAmount,
            TotalVat = x.TotalVat,
            TotalPayable = x.TotalPayable,
            Narration = x.Narration,
            Status = x.Status,
            CloseReason = x.CloseReason,
            ApprovedDate = x.ApprovedDate,
            PlacedDate = x.PlacedDate,
            ClosedDate = x.ClosedDate,
            CreatedDate = x.CreatedDate,
            ModifiedDate = x.ModifiedDate
        };
    }


    //===========================================================
    // Get Defaults : number preview, period, suppliers, products
    //===========================================================

    public async Task<PurchaseOrderDefaultsDto>
        GetDefaultsAsync
        (
            string pageType,
            long branchId,
            DateOnly orderDate
        )
    {
        PurchaseOrderPage page =
            PageOf(pageType);

        PurchaseOrderDefaultsDto result =
            new()
            {
                BranchId = branchId,
                Today = BusinessToday().ToString(DateFormat, CultureInfo.InvariantCulture),
                Suppliers = await SupplierOptionsAsync(page),
                Products = await ProductOptionsAsync(page, null)
            };

        VoucherPeriodDto period;

        try
        {
            period =
                await _numberService.ResolvePeriodAsync(
                    branchId,
                    orderDate);
        }
        catch (InvalidOperationException ex)
        {
            result.Message = ex.Message;

            return result;
        }

        result.BranchId = period.BranchId;
        result.BranchName = period.BranchName;
        result.FinancialYearId = period.FinancialYearId;
        result.FinancialYearName = period.FinancialYearName;
        result.FinancialYearCode = period.FinancialYearCode;
        result.PeriodMonth = period.PeriodMonth;

        string prefix =
            CodeGenerator.GenerateVoucherNoPrefix(
                page.Prefix,
                period.BranchDigits,
                period.FinancialYearCode,
                period.PeriodMonth);

        int taken =
            await _context
                .Set<VoucherSequences>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.Prefix == page.Prefix
                        &&
                        x.BranchDigits == period.BranchDigits
                        &&
                        x.FinancialYearCode == period.FinancialYearCode
                        &&
                        x.PeriodMonth == period.PeriodMonth
                )
                .Select(x => x.LastNumber)
                .FirstOrDefaultAsync();

        List<string> saved =
            await _context
                .Set<THeader>()
                .AsNoTracking()
                .Where(x => x.OrderNo.StartsWith(prefix))
                .Select(x => x.OrderNo)
                .ToListAsync();

        int highest =
            saved
                .Select(x => CodeGenerator.ParseVoucherSequence(x))
                .DefaultIfEmpty(0)
                .Max();

        int next =
            Math.Max(taken, highest) + 1;

        if (next > 99999)
        {
            result.Message =
                $"{page.Prefix} numbers for {period.FinancialYearCode}-{period.PeriodMonth:D2} are exhausted (99999).";

            return result;
        }

        result.OrderNo =
            CodeGenerator.GenerateVoucherNo(
                page.Prefix,
                period.BranchDigits,
                period.FinancialYearCode,
                period.PeriodMonth,
                next);

        return result;
    }


    //===========================================================
    // Last terms per item (page prefill)
    //   MRP    : latest order line with an MRP (any supplier)
    //   Profit : latest order line of this supplier (with its basis)
    //   Deleted and cancelled orders are not counted.
    //===========================================================

    public async Task<List<PurchaseOrderLastTermsDto>>
        GetLastTermsAsync
        (
            string pageType,
            string supplierCode
        )
    {
        PurchaseOrderPage page =
            PageOf(pageType);

        string supplier =
            (supplierCode ?? string.Empty).Trim();

        var rows =
            await
            (
                from l in _context.Set<TLine>().AsNoTracking()

                join h in _context.Set<THeader>().AsNoTracking()
                    on l.PurchaseOrderId equals h.PurchaseOrderId

                where !h.IsDeleted
                      &&
                      h.PageType == page.PageType
                      &&
                      h.Status != StatusCancelled
                      &&
                      (l.Mrp > 0 || h.SupplierCode == supplier)

                select new
                {
                    l.ProductCode,
                    l.Mrp,
                    l.ProfitPercent,
                    l.UnitPrice,
                    l.VatRate,
                    h.ProfitBasis,
                    h.InvoicePriceBasis,
                    h.PriceIncludesVat,
                    h.SupplierCode,
                    h.OrderNo,
                    h.OrderDate,
                    h.PurchaseOrderId
                }
            )
            .ToListAsync();

        List<PurchaseOrderLastTermsDto> result =
            rows
            .GroupBy(x => x.ProductCode, StringComparer.OrdinalIgnoreCase)
            .Select
            (
                g =>
                {
                    var mrp =
                        g.Where(x => x.Mrp > 0)
                         .OrderByDescending(x => x.OrderDate)
                         .ThenByDescending(x => x.PurchaseOrderId)
                         .FirstOrDefault();

                    // This supplier's latest line : its DP
                    var last =
                        supplier.Length == 0
                            ? null
                            : g.Where(x => x.SupplierCode == supplier)
                               .OrderByDescending(x => x.OrderDate)
                               .ThenByDescending(x => x.PurchaseOrderId)
                               .FirstOrDefault();

                    // Margin : only from this supplier's MRP invoices
                    var profit =
                        supplier.Length == 0
                            ? null
                            : g.Where(x => x.SupplierCode == supplier && x.InvoicePriceBasis == BasisMrp)
                               .OrderByDescending(x => x.OrderDate)
                               .ThenByDescending(x => x.PurchaseOrderId)
                               .FirstOrDefault();

                    return new PurchaseOrderLastTermsDto
                    {
                        ProductCode = g.Key,
                        LastMrp = mrp?.Mrp ?? 0m,
                        LastMrpOrderNo = mrp?.OrderNo ?? string.Empty,
                        HasProfit = profit != null,
                        ProfitPercent = profit?.ProfitPercent ?? 0m,
                        ProfitBasis = profit?.ProfitBasis ?? string.Empty,
                        ProfitOrderNo = profit?.OrderNo ?? string.Empty,
                        ProfitDate = profit?.OrderDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
                        LastDp = last?.UnitPrice ?? 0m,
                        LastDpIncludesVat = last?.PriceIncludesVat ?? true,
                        LastVatRate = last?.VatRate ?? 0m,
                        LastDpOrderNo = last?.OrderNo ?? string.Empty
                    };
                }
            )
            .ToList();

        // Margin : the latest of this supplier's POs and purchases
        // (MRP invoices) for each item
        if (supplier.Length > 0)
        {
            Dictionary<string, MarginRow> other =
                (await PurchaseMarginRowsAsync(page.PageType, supplier))
                    .GroupBy(x => x.ProductCode, StringComparer.OrdinalIgnoreCase)
                    .ToDictionary(
                        g => g.Key,
                        g => g.OrderByDescending(x => x.Date).ThenByDescending(x => x.Id).First(),
                        StringComparer.OrdinalIgnoreCase);

            foreach (PurchaseOrderLastTermsDto item in result)
            {
                if (!other.TryGetValue(item.ProductCode, out MarginRow? o))
                {
                    continue;
                }

                bool newer =
                    !item.HasProfit
                    ||
                    !DateOnly.TryParseExact(item.ProfitDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly own)
                    ||
                    o.Date >= own;

                if (newer)
                {
                    item.HasProfit = true;
                    item.ProfitPercent = o.ProfitPercent;
                    item.ProfitBasis = o.ProfitBasis;
                    item.ProfitOrderNo = o.DocNo;
                    item.ProfitDate = o.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                }
            }

            HashSet<string> have =
                new(result.Select(x => x.ProductCode), StringComparer.OrdinalIgnoreCase);

            foreach (MarginRow o in other.Values.Where(x => !have.Contains(x.ProductCode)))
            {
                result.Add(
                    new PurchaseOrderLastTermsDto
                    {
                        ProductCode = o.ProductCode,
                        HasProfit = true,
                        ProfitPercent = o.ProfitPercent,
                        ProfitBasis = o.ProfitBasis,
                        ProfitOrderNo = o.DocNo,
                        ProfitDate = o.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
                    });
            }
        }

        return result;
    }

    // One margin of a supplier's item on a PO / purchase (MRP invoice)
    private sealed record MarginRow
    (
        string ProductCode,
        decimal ProfitPercent,
        string ProfitBasis,
        string DocNo,
        DateOnly Date,
        long Id
    );


    // A supplier's header Margin % on a PO / purchase (MRP invoice);
    // Rank : purchase 1, PO 0 (same date : the purchase wins)
    private sealed record HeaderMarginRow
    (
        string SupplierCode,
        decimal Percent,
        string DocNo,
        DateOnly Date,
        int Rank,
        long Id
    );

    // Header margins of the page's POs and purchases (MRP invoices)
    private async Task<List<HeaderMarginRow>> HeaderMarginRowsAsync
    (
        string pageType
    )
    {
        List<HeaderMarginRow> rows =
            await _context
                .Set<THeader>()
                .AsNoTracking()
                .Where(h => !h.IsDeleted && h.PageType == pageType && h.Status != StatusCancelled && h.InvoicePriceBasis == BasisMrp)
                .Select(h => new HeaderMarginRow(h.SupplierCode, h.DefaultProfitPercent, h.OrderNo, h.OrderDate, 0, h.PurchaseOrderId))
                .ToListAsync();

        rows.AddRange(
            pageType switch
            {
                "SP" => await PurchaseHeaderMarginRowsAsync<PurchasesSpEntity>(pageType),
                "AC" => await PurchaseHeaderMarginRowsAsync<PurchasesAcEntity>(pageType),
                _ => new List<HeaderMarginRow>()
            });

        return rows;
    }

    private async Task<List<HeaderMarginRow>> PurchaseHeaderMarginRowsAsync<TPurchase>
    (
        string pageType
    )
        where TPurchase : PurchaseHeader
    {
        return
            await _context
                .Set<TPurchase>()
                .AsNoTracking()
                .Where(h => !h.IsDeleted && h.PageType == pageType && h.Status != StatusCancelled && h.InvoicePriceBasis == BasisMrp)
                .Select(h => new HeaderMarginRow(h.SupplierCode, h.DefaultProfitPercent, h.PurchaseNo, h.PurchaseDate, 1, h.PurchaseId))
                .ToListAsync();
    }

    // Purchases of the page type (SP / AC) : MB has no margin
    private Task<List<MarginRow>> PurchaseMarginRowsAsync
    (
        string pageType,
        string supplier
    )
    {
        return pageType switch
        {
            "SP" => PurchaseMarginRowsAsync<PurchasesSpEntity, PurchasesSpLinesEntity>(pageType, supplier),
            "AC" => PurchaseMarginRowsAsync<PurchasesAcEntity, PurchasesAcLinesEntity>(pageType, supplier),
            _ => Task.FromResult(new List<MarginRow>())
        };
    }

    private async Task<List<MarginRow>> PurchaseMarginRowsAsync<TPurchase, TPurchaseLine>
    (
        string pageType,
        string supplier
    )
        where TPurchase : PurchaseHeader
        where TPurchaseLine : PurchaseLine
    {
        return
            await
            (
                from l in _context.Set<TPurchaseLine>().AsNoTracking()
                join h in _context.Set<TPurchase>().AsNoTracking()
                    on l.PurchaseId equals h.PurchaseId
                where !h.IsDeleted
                      &&
                      h.PageType == pageType
                      &&
                      h.Status != StatusCancelled
                      &&
                      h.SupplierCode == supplier
                      &&
                      h.InvoicePriceBasis == BasisMrp
                select new MarginRow(l.ProductCode, l.ProfitPercent, h.ProfitBasis, h.PurchaseNo, h.PurchaseDate, h.PurchaseId)
            )
            .ToListAsync();
    }


    //===========================================================
    // Suppliers of the page (live ; inactive ones flagged)
    //===========================================================

    private async Task<List<PurchaseOrderSupplierOptionDto>>
        SupplierOptionsAsync
        (
            PurchaseOrderPage page
        )
    {
        List<string> types =
            page.SupplyTypes.ToList();

        Dictionary<long, string> brands =
            await BrandNamesAsync();

        // Each supplier's last order : "No VAT on this invoice"
        Dictionary<string, bool> lastNoVat =
            (
                await _context
                    .Set<THeader>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.PageType == page.PageType)
                    .OrderByDescending(x => x.OrderDate)
                    .ThenByDescending(x => x.PurchaseOrderId)
                    .Select(x => new { x.SupplierCode, x.NoVatInvoice })
                    .ToListAsync()
            )
            .GroupBy(x => x.SupplierCode)
            .ToDictionary(g => g.Key, g => g.First().NoVatInvoice);

        List<PurchaseOrderSupplierOptionDto> suppliers =
            await _context
            .Set<SupplierProfilesEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
                    &&
                    types.Contains(x.SupplyType)
            )
            .OrderBy(x => x.DisplayName)
            .Select
            (
                x =>
                    new PurchaseOrderSupplierOptionDto
                    {
                        SupplierCode = x.SupplierCode,
                        DisplayName = x.DisplayName,
                        SupplyType = x.SupplyType,
                        Phone = x.Phone1,
                        BinNo = x.BinNo,
                        CreditDays = x.CreditDays,
                        BrandManagementId = x.BrandManagementId,
                        DefaultPriceEntry = x.DefaultPriceEntry ?? string.Empty,
                        DefaultInvoicePrice = x.DefaultInvoicePrice ?? string.Empty,
                        DefaultProfitPercent = x.DefaultProfitPercent,
                        DefaultProfitOn = x.DefaultProfitOn ?? string.Empty,
                        IsActive = x.IsActive
                    }
            )
            .ToListAsync();

        Dictionary<string, HeaderMarginRow> lastMargins =
            (await HeaderMarginRowsAsync(page.PageType))
                .GroupBy(x => x.SupplierCode, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderByDescending(x => x.Date).ThenByDescending(x => x.Rank).ThenByDescending(x => x.Id).First(),
                    StringComparer.OrdinalIgnoreCase);

        foreach (PurchaseOrderSupplierOptionDto supplier in suppliers)
        {
            supplier.LastNoVatInvoice =
                lastNoVat.GetValueOrDefault(supplier.SupplierCode);

            if (lastMargins.TryGetValue(supplier.SupplierCode, out HeaderMarginRow? lastMargin))
            {
                supplier.LastMarginPercent = lastMargin.Percent;

                supplier.LastMarginNo = lastMargin.DocNo;
            }

            supplier.BrandName =
                supplier.BrandManagementId.HasValue
                &&
                brands.TryGetValue(supplier.BrandManagementId.Value, out string? name)
                    ? name
                    : string.Empty;
        }

        return suppliers;
    }


    // Brand names by id (deleted brands included : old suppliers
    // and categories still point to them)
    private async Task<Dictionary<long, string>>
        BrandNamesAsync()
    {
        return (
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .Select(x => new { x.BrandManagementId, x.BrandName })
                .ToListAsync()
        )
        .ToDictionary(
            x => x.BrandManagementId,
            x => x.BrandName ?? string.Empty);
    }


    //===========================================================
    // Products of the page (live). codes = null → all.
    //===========================================================

    private async Task<List<PurchaseOrderProductOptionDto>>
        ProductOptionsAsync
        (
            PurchaseOrderPage page,
            List<string>? codes
        )
    {
        Dictionary<string, decimal> onOrder =
            await OnOrderAsync(page);

        Dictionary<string, List<PurchaseOrderStockBranchDto>> byBranch =
            await CompanyStock.LoadAsync(_context, page.PageType);

        Dictionary<string, decimal> stock =
            CompanyStock.Totals(byBranch);

        return (
            await ProductRowsAsync(
                page,
                codes)
        )
        .Select
        (
            x =>
                new PurchaseOrderProductOptionDto
                {
                    ProductType = x.ProductType,
                    ProductId = x.ProductId,
                    ProductCode = x.ProductCode,
                    ProductName = x.ProductName,
                    Unit = x.Unit,
                    CategoryId = x.CategoryId,
                    CategoryName = x.CategoryName,
                    SubCategoryId = x.SubCategoryId,
                    SubCategoryName = x.SubCategoryName,
                    BrandManagementId = x.BrandId,
                    ImagePath = x.ImagePath,
                    ReorderLevel = x.ReorderLevel,
                    RedLevel = x.RedLevel,
                    MaxStockLevel = x.MaxStockLevel,
                    OnOrder = onOrder.GetValueOrDefault(x.ProductCode),
                    TotalStock = stock.TryGetValue(x.ProductCode, out decimal held) ? held : null,
                    StockByBranch = byBranch.GetValueOrDefault(x.ProductCode) ?? new List<PurchaseOrderStockBranchDto>(),
                    IsActive = x.IsActive
                }
        )
        .ToList();
    }


    //===========================================================
    // On order : quantity (with free) on this page's approved /
    // placed orders not yet billed, company wide, per product.
    // Drafts do not count.
    //===========================================================

    private async Task<Dictionary<string, decimal>>
        OnOrderAsync
        (
            PurchaseOrderPage page
        )
    {
        var rows =
            await
            (
                from l in _context.Set<TLine>().AsNoTracking()

                join h in _context.Set<THeader>().AsNoTracking()
                    on l.PurchaseOrderId equals h.PurchaseOrderId

                where !h.IsDeleted
                      &&
                      h.PageType == page.PageType
                      &&
                      (h.Status == StatusApproved || h.Status == StatusPlaced)

                select new
                {
                    l.ProductCode,
                    Open = l.Quantity + l.FreeQuantity - l.BilledQuantity
                }
            )
            .ToListAsync();

        return rows
            .GroupBy(x => x.ProductCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                g => g.Key,
                g => Math.Max(0m, g.Sum(x => x.Open)),
                StringComparer.OrdinalIgnoreCase);
    }


    //===========================================================
    // Company stock per product (all branches) : In Transit + On
    // Hand, from the stock movements (CompanyStock)
    //===========================================================

    private async Task<Dictionary<string, decimal>>
        CompanyStockAsync
        (
            PurchaseOrderPage page
        )
    {
        return CompanyStock.Totals(
            await CompanyStock.LoadAsync(_context, page.PageType));
    }


    private async Task<List<ProductRow>>
        ProductRowsAsync
        (
            PurchaseOrderPage page,
            List<string>? codes
        )
    {
        Dictionary<long, (string Name, string Type, long? BrandId)> categories =
            (
                await _context
                    .Set<ProductCategoryEntity>()
                    .AsNoTracking()
                    .Select(x => new { x.ProductCategoryId, x.CategoryName, x.CategoryType, x.BrandManagementId })
                    .ToListAsync()
            )
            .ToDictionary(
                x => x.ProductCategoryId,
                x => (x.CategoryName ?? string.Empty, x.CategoryType ?? string.Empty, x.BrandManagementId));

        Dictionary<long, string> subCategories =
            (
                await _context
                    .Set<ProductSubCategoryEntity>()
                    .AsNoTracking()
                    .Select(x => new { x.ProductSubCategoryId, x.SubCategoryName })
                    .ToListAsync()
            )
            .ToDictionary(
                x => x.ProductSubCategoryId,
                x => x.SubCategoryName ?? string.Empty);

        List<ProductRow> rows =
            new();

        if (page.PageType == "MB")
        {
            var bikes =
                await _context
                    .Set<MotorBikesEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && (codes == null || codes.Contains(x.ProductCode)))
                    .Select(x => new { x.MotorBikeId, x.ProductCode, x.ProductName, x.ProductCategoryId, x.ProductSubCategoryId, x.IsActive, x.ImagePath, x.ReorderLevel, x.RedLevel, x.MaxStockLevel })
                    .ToListAsync();

            rows.AddRange(
                bikes.Select
                (
                    x =>
                        new ProductRow
                        {
                            ProductType = TypeMotorBikes,
                            ProductId = x.MotorBikeId,
                            ProductCode = x.ProductCode,
                            ProductName = x.ProductName,
                            Unit = "Pcs",
                            CategoryId = x.ProductCategoryId,
                            SubCategoryId = x.ProductSubCategoryId,
                            ImagePath = x.ImagePath ?? string.Empty,
                            ReorderLevel = x.ReorderLevel,
                            RedLevel = x.RedLevel,
                            MaxStockLevel = x.MaxStockLevel,
                            IsActive = x.IsActive
                        }
                ));
        }
        else if (page.PageType == "SP")
        {
            var parts =
                await _context
                    .Set<SparePartsEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && (codes == null || codes.Contains(x.ProductCode)))
                    .Select(x => new { x.SparePartId, x.ProductCode, x.PartNumber, x.PartName, x.Unit, x.ProductCategoryId, x.ProductSubCategoryId, x.IsActive, x.ImagePath, x.ReorderLevel, x.RedLevel, x.MaxStockLevel })
                    .ToListAsync();

            rows.AddRange(
                parts.Select
                (
                    x =>
                        new ProductRow
                        {
                            // Spare Parts or Lubricants, from the category
                            ProductType =
                                categories.TryGetValue(x.ProductCategoryId, out var cat)
                                &&
                                string.Equals(cat.Type, TypeLubricants, StringComparison.OrdinalIgnoreCase)
                                    ? TypeLubricants
                                    : TypeSpareParts,
                            ProductId = x.SparePartId,
                            ProductCode = x.ProductCode,
                            ProductName = $"{x.PartNumber} - {x.PartName}",
                            Unit = x.Unit,
                            CategoryId = x.ProductCategoryId,
                            SubCategoryId = x.ProductSubCategoryId,
                            ImagePath = x.ImagePath ?? string.Empty,
                            ReorderLevel = x.ReorderLevel,
                            RedLevel = x.RedLevel,
                            MaxStockLevel = x.MaxStockLevel,
                            IsActive = x.IsActive
                        }
                ));
        }
        else
        {
            var items =
                await _context
                    .Set<AccessoriesEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && (codes == null || codes.Contains(x.ProductCode)))
                    .Select(x => new { x.AccessoryId, x.ProductCode, x.PartNumber, x.AccessoryName, x.Unit, x.ProductCategoryId, x.ProductSubCategoryId, x.IsActive, x.ReorderLevel, x.RedLevel, x.MaxStockLevel })
                    .ToListAsync();

            rows.AddRange(
                items.Select
                (
                    x =>
                        new ProductRow
                        {
                            ProductType = TypeAccessories,
                            ProductId = x.AccessoryId,
                            ProductCode = x.ProductCode,
                            ProductName =
                                string.IsNullOrWhiteSpace(x.PartNumber)
                                    ? x.AccessoryName
                                    : $"{x.PartNumber} - {x.AccessoryName}",
                            Unit = x.Unit,
                            CategoryId = x.ProductCategoryId,
                            SubCategoryId = x.ProductSubCategoryId,
                            ReorderLevel = x.ReorderLevel,
                            RedLevel = x.RedLevel,
                            MaxStockLevel = x.MaxStockLevel,
                            IsActive = x.IsActive
                        }
                ));
        }

        foreach (ProductRow row in rows)
        {
            row.CategoryName =
                categories.TryGetValue(row.CategoryId, out var category)
                    ? category.Name
                    : string.Empty;

            row.BrandId =
                categories.TryGetValue(row.CategoryId, out var branded)
                    ? branded.BrandId
                    : null;

            row.SubCategoryName =
                subCategories.TryGetValue(row.SubCategoryId, out string? sub)
                    ? sub
                    : string.Empty;
        }

        return rows
            .OrderBy(x => x.CategoryName)
            .ThenBy(x => x.SubCategoryName)
            .ThenBy(x => x.ProductName)
            .ToList();
    }


    //===========================================================
    // Helpers
    //===========================================================

    private static DateOnly ParseDate
    (
        string? text,
        string label
    )
    {
        if (DateOnly.TryParseExact(
                (text ?? string.Empty).Trim(),
                DateFormat,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out DateOnly date))
        {
            return date;
        }

        throw new InvalidOperationException(
            $"{label} is required (yyyy-MM-dd).");
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


    // One of the allowed words ('' = fallback), any case
    private static string ParseChoice
    (
        string? text,
        string fallback,
        string label,
        params string[] allowed
    )
    {
        string clean =
            (text ?? string.Empty).Trim();

        if (clean.Length == 0)
        {
            return fallback;
        }

        string? match =
            allowed.FirstOrDefault(x => string.Equals(x, clean, StringComparison.OrdinalIgnoreCase));

        return match
            ?? throw new InvalidOperationException(
                $"{label} must be {string.Join(" or ", allowed)}.");
    }


    // Purchase VAT rule of a type on a date : Input Credit Allowed
    // (no active rule = allowed)
    private async Task<bool>
        InputCreditAllowedAsync
        (
            string vatType,
            DateOnly date
        )
    {
        bool? allowed =
            await _context
                .Set<PurchaseVatEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.Status
                        &&
                        x.VatType == vatType
                        &&
                        x.EffectiveFrom <= date
                        &&
                        x.ValidTo >= date
                )
                .OrderByDescending(x => x.EffectiveFrom)
                .Select(x => (bool?)x.InputCreditAllowed)
                .FirstOrDefaultAsync();

        return allowed ?? true;
    }


    //===========================================================
    // Normalize & Validate (Create / Update)
    //===========================================================

    private async Task<PoInput>
        NormalizeAsync
        (
            CreatePurchaseOrderDto dto,
            string? lockedPageType,
            DateOnly? savedOrderDate = null
        )
    {
        PurchaseOrderPage page =
            PageOf(
                lockedPageType ?? dto.PageType);

        if
        (
            lockedPageType != null
            &&
            !string.IsNullOrWhiteSpace(dto.PageType)
            &&
            !string.Equals(dto.PageType.Trim(), lockedPageType, StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                "This order belongs to another Purchase Order page.");
        }

        PoInput input =
            new()
            {
                Page = page,

                OrderDate =
                    ParseDate(
                        dto.OrderDate,
                        "Order Date"),

                PriceIncludesVat =
                    dto.PriceIncludesVat,

                Narration =
                    Limit(dto.Narration, 1000)
            };

        // PO date window (an unchanged date of a saved draft is
        // not checked again)
        await EnsureDateAllowedAsync(
            input.OrderDate,
            savedOrderDate);

        if (string.IsNullOrWhiteSpace(dto.ExpectedDate)
            && await IsSwitchOnAsync(Page.SwitchExpectedRequired, false))
        {
            throw new InvalidOperationException(
                "Expected Delivery is required.");
        }

        if (!string.IsNullOrWhiteSpace(dto.ExpectedDate))
        {
            input.ExpectedDate =
                ParseDate(
                    dto.ExpectedDate,
                    "Expected Delivery");

            if (input.ExpectedDate < input.OrderDate)
            {
                throw new InvalidOperationException(
                    "Expected Delivery cannot be before the Order Date.");
            }
        }

        if (input.Narration.Length == 0)
        {
            throw new InvalidOperationException(
                "Terms & Narration is required.");
        }

        //=======================================================
        // Pricing terms (Invoice Price, Profit On, discount)
        //=======================================================

        // MB : unit price (DP) only - no MRP, profit or discount
        if (!page.MrpPricing)
        {
            dto.InvoicePriceBasis = BasisDp;

            dto.ProfitBasis = BasisMrp;

            dto.DefaultProfitPercent = 0m;

            dto.AdditionalDiscountType = DiscountNone;

            dto.AdditionalDiscountValue = 0m;

            foreach (CreatePurchaseOrderLineDto row in dto.Lines ?? new List<CreatePurchaseOrderLineDto>())
            {
                row.Mrp = 0m;

                row.ProfitPercent = 0m;
            }
        }

        input.InvoicePriceBasis =
            ParseChoice(dto.InvoicePriceBasis, BasisDp, "Invoice Price", BasisMrp, BasisDp);

        // A margin is always on MRP
        input.ProfitBasis =
            BasisMrp;

        // DP invoice : no margin (the DP is as the supplier bills it)
        // DP invoice : no margin and no MRP (selling prices are the
        // Pricing page's)
        if (input.InvoicePriceBasis == BasisDp)
        {
            dto.DefaultProfitPercent = 0m;

            foreach (CreatePurchaseOrderLineDto row in dto.Lines ?? new List<CreatePurchaseOrderLineDto>())
            {
                row.ProfitPercent = 0m;

                row.Mrp = 0m;
            }
        }

        if (input.InvoicePriceBasis == BasisMrp && !input.PriceIncludesVat)
        {
            throw new InvalidOperationException(
                "An MRP invoice is always VAT Inclusive (MRP includes VAT).");
        }

        CheckProfit(dto.DefaultProfitPercent, input.ProfitBasis, "Margin %");

        input.DefaultProfitPercent =
            dto.DefaultProfitPercent;

        input.AdditionalDiscountType =
            ParseChoice(dto.AdditionalDiscountType, DiscountNone, "Additional Discount", DiscountNone, DiscountPercent, DiscountAmount);

        input.AdditionalDiscountValue =
            input.AdditionalDiscountType == DiscountNone
                ? 0m
                : dto.AdditionalDiscountValue;

        if (input.AdditionalDiscountValue < 0 || !IsMoney(input.AdditionalDiscountValue) || input.AdditionalDiscountValue > MaxMoney)
        {
            throw new InvalidOperationException(
                "Additional Discount must be 0 or more with at most 2 decimals.");
        }

        if (input.AdditionalDiscountType == DiscountPercent && input.AdditionalDiscountValue >= 100)
        {
            throw new InvalidOperationException(
                "Additional Discount must be less than 100%.");
        }

        if (dto.BranchId <= 0)
        {
            throw new InvalidOperationException(
                "Branch is required.");
        }

        input.Period =
            await _numberService.ResolvePeriodAsync(
                dto.BranchId,
                input.OrderDate);

        //=======================================================
        // VAT applicability on the order date (VAT Management)
        //   Purchase OFF        : no VAT on this order
        //   "No VAT" ticked     : no VAT on this order
        //   Claimable           : charged + Sales VAT ON + the
        //                         rule allows input credit
        //=======================================================

        VatApplicabilityDto applicability =
            await _vatApplicability.GetAsync(
                page.PageType,
                input.OrderDate);

        input.PurchaseVatApplicable =
            applicability.PurchaseVatApplicable;

        input.SalesVatApplicable =
            applicability.SalesVatApplicable;

        input.NoVatInvoice =
            applicability.PurchaseVatApplicable && dto.NoVatInvoice;

        input.VatCharged =
            applicability.PurchaseVatApplicable && !input.NoVatInvoice;

        // No VAT : prices are plain prices
        if (!input.VatCharged)
        {
            input.PriceIncludesVat = true;
        }

        //=======================================================
        // Supplier : live, active, of the page's supply types
        //=======================================================

        string supplierCode =
            (dto.SupplierCode ?? string.Empty).Trim();

        if (supplierCode.Length == 0)
        {
            throw new InvalidOperationException(
                "Supplier is required.");
        }

        SupplierProfilesEntity supplier =
            await _context
                .Set<SupplierProfilesEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.SupplierCode == supplierCode
                        &&
                        !x.IsDeleted
                )
            ??
            throw new InvalidOperationException(
                $"Supplier {supplierCode} was not found. It may have been deleted.");

        if (!supplier.IsActive)
        {
            throw new InvalidOperationException(
                $"Supplier '{supplier.DisplayName}' is inactive.");
        }

        if (!page.SupplyTypes.Contains(supplier.SupplyType))
        {
            throw new InvalidOperationException(
                $"Supplier '{supplier.DisplayName}' supplies {supplier.SupplyType}; this page takes {string.Join(" or ", page.SupplyTypes)} suppliers.");
        }

        input.Supplier =
            supplier;

        // Supplier terms fixed (switch "Edit Supplier Terms" OFF) :
        // every term set on the Supplier Profile must be the order's
        if (!await IsSwitchOnAsync(Page.SwitchEditSupplierTerms, true))
        {
            string? problem =
                SupplierTermsProblem(
                    supplier,
                    input,
                    page.MrpPricing);

            if (problem != null)
            {
                throw new InvalidOperationException(
                    $"{problem} is fixed by the supplier (System Configuration › Edit Supplier Terms is OFF). Open the order again to take the supplier's terms.");
            }
        }

        //=======================================================
        // Lines
        //=======================================================

        List<CreatePurchaseOrderLineDto> lines =
            dto.Lines ?? new List<CreatePurchaseOrderLineDto>();

        if (lines.Count == 0)
        {
            throw new InvalidOperationException(
                "Add at least one product.");
        }

        int maxLines =
            await SwitchNumberAsync(Page.SwitchMaxLines);

        if (maxLines > 0 && lines.Count > maxLines)
        {
            throw new InvalidOperationException(
                $"A purchase order can have at most {maxLines} lines (System Configuration).");
        }

        List<string> codes =
            lines
                .Select(x => (x.ProductCode ?? string.Empty).Trim())
                .ToList();

        if (codes.Any(x => x.Length == 0))
        {
            throw new InvalidOperationException(
                "Every line needs a product.");
        }

        string? repeated =
            codes
                .GroupBy(x => x, StringComparer.OrdinalIgnoreCase)
                .Where(x => x.Count() > 1)
                .Select(x => x.Key)
                .FirstOrDefault();

        if (repeated != null)
        {
            throw new InvalidOperationException(
                $"Product {repeated} is on more than one line. Put it on one line and change its quantity.");
        }

        Dictionary<string, ProductRow> products =
            (
                await ProductRowsAsync(
                    page,
                    codes)
            )
            .ToDictionary(x => x.ProductCode, StringComparer.OrdinalIgnoreCase);

        // Max Stock Level : stock + on order + this line may not go
        // above it (drafts, this one too, are not on order)
        Dictionary<string, decimal> onOrderNow =
            await OnOrderAsync(page);

        Dictionary<string, decimal> stockNow =
            await CompanyStockAsync(page);

        // A supplier with a brand supplies only that brand's
        // products (a category saved without a brand is allowed)
        long? supplierBrandId =
            supplier.BrandManagementId;

        Dictionary<long, string> brandNames =
            supplierBrandId.HasValue
                ? await BrandNamesAsync()
                : new Dictionary<long, string>();

        bool freeGoodsAllowed =
            await IsSwitchOnAsync(Page.SwitchFreeGoods, false);

        // Input credit per product type (Purchase VAT rule on the
        // order date; no rule = allowed)
        Dictionary<string, bool> creditAllowed =
            new(StringComparer.OrdinalIgnoreCase);

        int lineNo = 0;

        // MB says "unit price", SP / AC "DP"
        string priceWord =
            page.MrpPricing ? "DP" : "unit price";

        foreach (CreatePurchaseOrderLineDto row in lines)
        {
            lineNo++;

            string label =
                $"Line {lineNo}";

            string code =
                row.ProductCode.Trim();

            if (!products.TryGetValue(code, out ProductRow? product))
            {
                throw new InvalidOperationException(
                    $"{label} : product {code} was not found on this page. It may have been deleted.");
            }

            if (!product.IsActive)
            {
                throw new InvalidOperationException(
                    $"{label} : '{product.ProductName}' is inactive.");
            }

            if
            (
                supplierBrandId.HasValue
                &&
                product.BrandId.HasValue
                &&
                product.BrandId.Value != supplierBrandId.Value
            )
            {
                string supplierBrand =
                    brandNames.GetValueOrDefault(supplierBrandId.Value, "its brand");

                string productBrand =
                    brandNames.GetValueOrDefault(product.BrandId.Value, "another brand");

                throw new InvalidOperationException(
                    $"{label} : '{product.ProductName}' is {productBrand}; supplier '{supplier.DisplayName}' supplies {supplierBrand} only.");
            }

            if (!(row.Quantity > 0) || !IsMoney(row.Quantity) || row.Quantity > MaxMoney)
            {
                throw new InvalidOperationException(
                    $"{label} : quantity must be more than 0 with at most 2 decimals.");
            }

            if (product.ProductType == TypeMotorBikes && decimal.Truncate(row.Quantity) != row.Quantity)
            {
                throw new InvalidOperationException(
                    $"{label} : motor bikes are counted in whole numbers.");
            }

            if (row.FreeQuantity < 0 || !IsMoney(row.FreeQuantity) || row.FreeQuantity > MaxMoney)
            {
                throw new InvalidOperationException(
                    $"{label} : free quantity must be 0 or more with at most 2 decimals.");
            }

            if (product.MaxStockLevel > 0)
            {
                decimal held =
                    stockNow.GetValueOrDefault(product.ProductCode)
                    +
                    onOrderNow.GetValueOrDefault(product.ProductCode);

                decimal room =
                    Math.Max(0m, product.MaxStockLevel - held);

                if (row.Quantity + row.FreeQuantity > room)
                {
                    throw new InvalidOperationException(
                        $"{label} : '{product.ProductName}' would go above its Max Stock Level ({product.MaxStockLevel}) : stock and orders already hold {held:0.##}, so at most {room:0.##} can be ordered.");
                }
            }

            if (row.FreeQuantity > 0 && !freeGoodsAllowed)
            {
                throw new InvalidOperationException(
                    $"{label} : free quantity is not allowed (System Configuration › Free Goods Allowed is OFF).");
            }

            if (row.VatRate < 0 || row.VatRate > 100 || !IsMoney(row.VatRate))
            {
                throw new InvalidOperationException(
                    $"{label} : VAT must be from 0 to 100% with at most 2 decimals.");
            }

            if (!creditAllowed.TryGetValue(product.ProductType, out bool allowed))
            {
                allowed =
                    await InputCreditAllowedAsync(
                        product.ProductType,
                        input.OrderDate);

                creditAllowed[product.ProductType] =
                    allowed;
            }

            bool claimable =
                input.VatCharged
                &&
                input.SalesVatApplicable
                &&
                allowed;

            // MRP / Profit % / DP : any two give the third
            decimal mrp =
                row.Mrp;

            if (mrp < 0 || !IsMoney(mrp) || mrp > MaxMoney)
            {
                throw new InvalidOperationException(
                    $"{label} : MRP must be 0 or more with at most 2 decimals.");
            }

            if (input.InvoicePriceBasis == BasisMrp && !(mrp > 0))
            {
                throw new InvalidOperationException(
                    $"{label} : MRP is required on an MRP invoice.");
            }

            CheckProfit(row.ProfitPercent, input.ProfitBasis, $"{label} : margin %");

            decimal formulaDp =
                mrp > 0
                    ? DpFromMrp(mrp, row.ProfitPercent, input.ProfitBasis)
                    : 0m;

            decimal dp;

            decimal dpAmount;

            if (row.IsTotalTyped)
            {
                if (!(row.DpAmount > 0) || !IsMoney(row.DpAmount) || row.DpAmount > MaxMoney)
                {
                    throw new InvalidOperationException(
                        $"{label} : line total must be more than 0 with at most 2 decimals.");
                }

                dpAmount =
                    row.DpAmount;

                dp =
                    decimal.Round(dpAmount / row.Quantity, 4, MidpointRounding.AwayFromZero);
            }
            else
            {
                dp =
                    row.UnitPrice;

                if (!(dp > 0) || decimal.Round(dp, 4) != dp || dp > MaxMoney)
                {
                    throw new InvalidOperationException(
                        $"{label} : {priceWord} must be more than 0 with at most 4 decimals.");
                }

                dpAmount =
                    Money(dp * row.Quantity);
            }

            if (!(dp > 0))
            {
                throw new InvalidOperationException(
                    $"{label} : {priceWord} must be more than 0.");
            }

            if (mrp > 0 && dp > mrp)
            {
                throw new InvalidOperationException(
                    $"{label} : DP ({dp:N2}) cannot be more than MRP ({mrp:N2}).");
            }

            decimal grossMrp =
                mrp > 0
                    ? Money(mrp * row.Quantity)
                    : 0m;

            if (mrp > 0 && dpAmount > grossMrp)
            {
                throw new InvalidOperationException(
                    $"{label} : the line total at DP cannot be more than at MRP ({grossMrp:N2}).");
            }

            bool adjusted =
                input.InvoicePriceBasis == BasisDp
                ||
                row.IsAdjusted
                ||
                row.IsTotalTyped
                ||
                (mrp > 0 && dp != formulaDp);

            // A typed DP or line total keeps the figure; the profit %
            // follows it
            decimal profit =
                input.InvoicePriceBasis == BasisDp
                    ? 0m
                    : adjusted && mrp > 0
                        ? ProfitFrom(mrp, dp, input.ProfitBasis)
                        : row.ProfitPercent;

            input.Lines.Add(
                new TLine
                {
                    LineNo = lineNo,
                    ProductType = product.ProductType,
                    ProductId = product.ProductId,
                    ProductCode = product.ProductCode,
                    ProductName = Limit(product.ProductName, 250),
                    Unit = Limit(product.Unit, 20),
                    Quantity = row.Quantity,
                    FreeQuantity = row.FreeQuantity,
                    Mrp = mrp,
                    ProfitPercent = profit,
                    UnitPrice = dp,
                    IsAdjusted = adjusted,
                    IsTotalTyped = row.IsTotalTyped,
                    GrossMrp = grossMrp,
                    DpAmount = dpAmount,
                    ProfitAmount = mrp > 0 ? grossMrp - dpAmount : 0m,
                    VatRate = input.VatCharged ? row.VatRate : 0m,
                    VatClaimable = claimable,
                    BilledQuantity = 0,
                    ShortNotes = Limit(row.ShortNotes, 250)
                });
        }

        ApplyDiscountAndVat(input);

        await ApplyRoundingAsync(input);

        return input;
    }


    //===========================================================
    // Additional discount (spread by line value; the last line
    // takes the remainder), VAT, net unit cost
    //===========================================================

    private static void ApplyDiscountAndVat
    (
        PoInput input
    )
    {
        decimal totalDp =
            input.Lines.Sum(x => x.DpAmount);

        decimal discount =
            input.AdditionalDiscountType switch
            {
                DiscountPercent => Money(totalDp * input.AdditionalDiscountValue / 100m),
                DiscountAmount => input.AdditionalDiscountValue,
                _ => 0m
            };

        if (discount > 0 && discount >= totalDp)
        {
            throw new InvalidOperationException(
                $"Additional Discount ({discount:N2}) must be less than the total at DP ({totalDp:N2}).");
        }

        input.AdditionalDiscountAmount =
            discount;

        decimal given = 0m;

        for (int i = 0; i < input.Lines.Count; i++)
        {
            TLine line =
                input.Lines[i];

            decimal share =
                i == input.Lines.Count - 1
                    ? discount - given
                    : totalDp > 0
                        ? Money(discount * line.DpAmount / totalDp)
                        : 0m;

            given += share;

            line.DiscountShare = share;

            line.NetAmount = line.DpAmount - share;

            if (line.NetAmount < 0)
            {
                throw new InvalidOperationException(
                    $"Line {line.LineNo} : the Additional Discount is more than the line.");
            }

            (decimal amount, decimal vat, decimal total) =
                SplitVat(
                    line.NetAmount,
                    line.VatRate,
                    input.PriceIncludesVat);

            line.Amount = amount;

            line.VatAmount = vat;

            line.LineTotal = total;

            line.RoundingShare = 0m;

            // VAT not claimable (or none) : it is part of the cost
            line.NetUnitCost =
                UnitCost(line.VatClaimable ? amount : total, line.Quantity + line.FreeQuantity);
        }
    }


    //===========================================================
    // Whole-taka rounding (switches)
    //   Payable only : the difference shows as Round off
    //   Whole-taka lines : largest remainder - every line rounded
    //   down, the taka left go to the largest fractions (earlier
    //   line first on a tie); VAT is taken out of the new payable
    //===========================================================

    private async Task
        ApplyRoundingAsync
        (
            PoInput input
        )
    {
        (bool isOn, string text) =
            await SwitchTextAsync(Page.SwitchRoundPayable);

        input.RoundingMethod =
            !isOn
                ? RoundNone
                : text.Trim().ToLowerInvariant() switch
                {
                    "up" => RoundUp,
                    "down" => RoundDown,
                    _ => RoundNearest
                };

        input.WholeTakaLines =
            input.RoundingMethod != RoundNone
            &&
            await IsSwitchOnAsync(Page.SwitchWholeTakaLines, false);

        input.RoundingAdjustment =
            0m;

        if (input.RoundingMethod == RoundNone || input.Lines.Count == 0)
        {
            return;
        }

        decimal exact =
            input.Lines.Sum(x => x.LineTotal);

        decimal rounded =
            input.RoundingMethod switch
            {
                RoundUp => decimal.Ceiling(exact),
                RoundDown => decimal.Floor(exact),
                _ => decimal.Round(exact, 0, MidpointRounding.AwayFromZero)
            };

        if (!input.WholeTakaLines)
        {
            input.RoundingAdjustment =
                rounded - exact;

            return;
        }

        List<decimal> floors =
            input.Lines
                .Select(x => decimal.Floor(x.LineTotal))
                .ToList();

        int leftover =
            (int)(rounded - floors.Sum());

        List<int> order =
            input.Lines
                .Select((x, i) => (Index: i, Fraction: x.LineTotal - floors[i]))
                .OrderByDescending(x => x.Fraction)
                .ThenBy(x => x.Index)
                .Select(x => x.Index)
                .ToList();

        for (int k = 0; k < order.Count; k++)
        {
            TLine line =
                input.Lines[order[k]];

            decimal payable =
                floors[order[k]] + (k < leftover ? 1m : 0m);

            line.RoundingShare =
                payable - line.LineTotal;

            line.LineTotal =
                payable;

            line.Amount =
                Money(payable * 100m / (100m + line.VatRate));

            line.VatAmount =
                payable - line.Amount;

            line.NetUnitCost =
                UnitCost(line.VatClaimable ? line.Amount : payable, line.Quantity + line.FreeQuantity);
        }
    }


    //===========================================================
    // Apply
    //===========================================================

    private static void ApplyHeader
    (
        THeader entity,
        PoInput input
    )
    {
        entity.PageType = input.Page.PageType;
        entity.OrderDate = input.OrderDate;
        entity.ExpectedDate = input.ExpectedDate;
        entity.BranchId = input.Period.BranchId;
        entity.BranchCode = input.Period.BranchCode;
        entity.BranchName = input.Period.BranchName;
        entity.FinancialYearId = input.Period.FinancialYearId;
        entity.SupplierCode = input.Supplier.SupplierCode;
        entity.SupplierName = Limit(input.Supplier.DisplayName, 250);
        entity.PriceIncludesVat = input.PriceIncludesVat;
        entity.InvoicePriceBasis = input.InvoicePriceBasis;
        entity.ProfitBasis = input.ProfitBasis;
        entity.DefaultProfitPercent = input.DefaultProfitPercent;
        entity.AdditionalDiscountType = input.AdditionalDiscountType;
        entity.AdditionalDiscountValue = input.AdditionalDiscountValue;
        entity.AdditionalDiscountAmount = input.AdditionalDiscountAmount;
        entity.RoundingMethod = input.RoundingMethod;
        entity.WholeTakaLines = input.WholeTakaLines;
        entity.RoundingAdjustment = input.RoundingAdjustment;
        entity.PurchaseVatApplicable = input.PurchaseVatApplicable;
        entity.SalesVatApplicable = input.SalesVatApplicable;
        entity.NoVatInvoice = input.NoVatInvoice;
        entity.VatCharged = input.VatCharged;
        entity.Narration = input.Narration;
        entity.TotalQuantity = input.Lines.Sum(x => x.Quantity);
        entity.TotalFreeQuantity = input.Lines.Sum(x => x.FreeQuantity);
        entity.TotalMrp = input.Lines.Sum(x => x.GrossMrp);
        entity.TotalProfit = input.Lines.Sum(x => x.ProfitAmount);
        entity.TotalDp = input.Lines.Sum(x => x.DpAmount);
        entity.TotalAmount = input.Lines.Sum(x => x.Amount);
        entity.TotalVat = input.Lines.Sum(x => x.VatAmount);
        entity.TotalPayable = input.Lines.Sum(x => x.LineTotal) + input.RoundingAdjustment;
    }


    private async Task ReplaceLinesAsync
    (
        long orderId,
        PoInput input
    )
    {
        List<TLine> oldLines =
            await _context
                .Set<TLine>()
                .Where(x => x.PurchaseOrderId == orderId)
                .ToListAsync();

        _context.Set<TLine>().RemoveRange(oldLines);

        foreach (TLine line in input.Lines)
        {
            line.PurchaseOrderId = orderId;
        }

        _context.Set<TLine>().AddRange(input.Lines);
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
                EntityName = $"{EntityName}{entity.PageType}",
                EntityId = entity.PurchaseOrderId,
                ActivityType = activityType,
                ActivityTitle = $"Purchase Order {verb}",
                ActivityDescription =
                    $"Purchase Order {entity.OrderNo} ({entity.SupplierName}, {entity.TotalPayable:N2}) {verb.ToLowerInvariant()}.{(string.IsNullOrWhiteSpace(extra) ? string.Empty : " " + extra)}",
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = now
            });
    }


    //===========================================================
    // Load a live order for change (row locked FOR UPDATE inside
    // the caller's transaction)
    //===========================================================

    private async Task<THeader>
        LoadAsync
        (
            long id
        )
    {
        await _context.Database.ExecuteSqlRawAsync(
            "SELECT 1 FROM \"" + Page.TableName + "\" WHERE \"PurchaseOrderId\" = {0} FOR UPDATE",
            id);

        THeader? entity =
            await _context
                .Set<THeader>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.PurchaseOrderId == id
                        &&
                        !x.IsDeleted
                );

        return entity
            ??
            throw new KeyNotFoundException(
                "Purchase Order not found.");
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
                $"Purchase Order {entity.OrderNo} is {entity.Status}; only a {string.Join(" or ", statuses)} order can be {action}.");
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


    //===========================================================
    // Create (Draft)
    //===========================================================

    public async Task<PurchaseOrderSavedDto>
        CreateAsync
        (
            CreatePurchaseOrderDto dto,
            long userId
        )
    {
        PoInput input =
            await NormalizeAsync(dto, null);

        THeader entity =
            new THeader
            {
                Status = StatusDraft,
                CloseReason = string.Empty,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        ApplyHeader(entity, input);

        await InTransactionAsync(
            async () =>
            {
                VoucherNumberDto number =
                    await _numberService.NextAsync(
                        input.Page.Prefix,
                        input.Period.BranchId,
                        input.OrderDate);

                entity.OrderNo =
                    number.VoucherNo;

                _context.Set<THeader>().Add(entity);

                await _context.SaveChangesAsync();

                await ReplaceLinesAsync(
                    entity.PurchaseOrderId,
                    input);

                AddHistory(entity, "Create", "Created", userId, entity.CreatedDate);

                await _context.SaveChangesAsync();
            });

        return new PurchaseOrderSavedDto
        {
            PurchaseOrderId = entity.PurchaseOrderId,
            OrderNo = entity.OrderNo
        };
    }


    //===========================================================
    // Update (Draft)
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdatePurchaseOrderDto dto,
            long userId
        )
    {
        await InTransactionAsync(
            async () =>
            {
                THeader entity =
                    await LoadAsync(dto.PurchaseOrderId);

                RequireStatus(entity, "edited", StatusDraft);

                PoInput input =
                    await NormalizeAsync(dto, entity.PageType, entity.OrderDate);

                string expectedStart =
                    $"{input.Page.Prefix}-{input.Period.BranchDigits}-{input.Period.FinancialYearCode}-{input.Period.PeriodMonth:D2}-";

                if (!entity.OrderNo.StartsWith(expectedStart, StringComparison.Ordinal))
                {
                    VoucherNumberDto number =
                        await _numberService.NextAsync(
                            input.Page.Prefix,
                            input.Period.BranchId,
                            input.OrderDate);

                    entity.OrderNo =
                        number.VoucherNo;
                }

                ApplyHeader(entity, input);

                entity.ModifiedBy = userId;

                entity.ModifiedDate = DateTime.UtcNow;

                await ReplaceLinesAsync(
                    entity.PurchaseOrderId,
                    input);

                AddHistory(entity, "Update", "Updated", userId, entity.ModifiedDate.Value);

                await _context.SaveChangesAsync();
            });
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
        PurchaseOrderPage page =
            PageOf(pageType);

        THeader? entity =
            await _context
                .Set<THeader>()
                .Where
                (
                    x =>
                        x.IsDeleted
                        &&
                        x.PageType == page.PageType
                )
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
    // Approve (Draft → Approved)
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

                DateTime now =
                    DateTime.UtcNow;

                entity.Status = StatusApproved;

                entity.ApprovedBy = userId;

                entity.ApprovedDate = now;

                AddHistory(entity, "Approve", "Approved", userId, now);

                // Switch "Place Order On Approval" : Approve also places
                if (await IsSwitchOnAsync(Page.SwitchPlaceOnApproval, false))
                {
                    entity.Status = StatusPlaced;

                    entity.PlacedBy = userId;

                    entity.PlacedDate = now;

                    AddHistory(entity, "Place", "Placed (on approval)", userId, now);
                }

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Return to Draft (Approved → Draft)
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
    // Place (Approved → Placed : sent to the supplier)
    //===========================================================

    public async Task
        PlaceAsync
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

                RequireStatus(entity, "placed", StatusApproved);

                DateTime now =
                    DateTime.UtcNow;

                entity.Status = StatusPlaced;

                entity.PlacedBy = userId;

                entity.PlacedDate = now;

                AddHistory(entity, "Place", "Placed", userId, now);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Close Short (Placed → Closed Short)
    //===========================================================

    public async Task
        CloseShortAsync
        (
            long id,
            ClosePurchaseOrderDto dto,
            long userId
        )
    {
        string reason =
            Limit(dto?.Reason, 500);

        if (reason.Length == 0)
        {
            throw new InvalidOperationException(
                "A reason is required to close the order short.");
        }

        await InTransactionAsync(
            async () =>
            {
                THeader entity =
                    await LoadAsync(id);

                RequireStatus(entity, "closed short", StatusPlaced);

                DateTime now =
                    DateTime.UtcNow;

                entity.Status = StatusClosedShort;

                entity.CloseReason = reason;

                entity.ClosedBy = userId;

                entity.ClosedDate = now;

                AddHistory(entity, "CloseShort", "Closed Short", userId, now, $"Reason : {reason}");

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Cancel (Approved / Placed with nothing billed → Cancelled)
    //===========================================================

    public async Task
        CancelAsync
        (
            long id,
            ClosePurchaseOrderDto dto,
            long userId
        )
    {
        string reason =
            Limit(dto?.Reason, 500);

        if (reason.Length == 0)
        {
            throw new InvalidOperationException(
                "A reason is required to cancel the order.");
        }

        await InTransactionAsync(
            async () =>
            {
                THeader entity =
                    await LoadAsync(id);

                RequireStatus(entity, "cancelled", StatusApproved, StatusPlaced);

                bool billed =
                    await _context
                        .Set<TLine>()
                        .AnyAsync
                        (
                            x =>
                                x.PurchaseOrderId == id
                                &&
                                x.BilledQuantity > 0
                        );

                if (billed)
                {
                    throw new InvalidOperationException(
                        $"Purchase Order {entity.OrderNo} is already billed on a purchase; close it short instead.");
                }

                DateTime now =
                    DateTime.UtcNow;

                entity.Status = StatusCancelled;

                entity.CloseReason = reason;

                entity.ClosedBy = userId;

                entity.ClosedDate = now;

                AddHistory(entity, "Cancel", "Cancelled", userId, now, $"Reason : {reason}");

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // System Configuration readers (by code)
    //===========================================================

    // ON / OFF; fallback when the switch does not exist
    private async Task<bool>
        IsSwitchOnAsync
        (
            string? code,
            bool fallback
        )
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return fallback;
        }

        bool? value =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => x.ConfigurationCode == code && !x.IsDeleted)
                .Select(x => (bool?)x.IsEnabled)
                .FirstOrDefaultAsync();

        return value ?? fallback;
    }


    // ON / OFF (missing = ON) and the whole-number Value (0 = none)
    private async Task<(bool IsOn, int Number)>
        SwitchStateAsync
        (
            string? code
        )
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return (true, 0);
        }

        var row =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => x.ConfigurationCode == code && !x.IsDeleted)
                .Select(x => new { x.IsEnabled, x.Value })
                .FirstOrDefaultAsync();

        if (row == null)
        {
            return (true, 0);
        }

        int number =
            int.TryParse((row.Value ?? string.Empty).Trim(), out int parsed) && parsed > 0
                ? parsed
                : 0;

        return (row.IsEnabled, number);
    }


    // ON / OFF (missing = OFF) and the text Value
    private async Task<(bool IsOn, string Value)>
        SwitchTextAsync
        (
            string? code
        )
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return (false, string.Empty);
        }

        var row =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => x.ConfigurationCode == code && !x.IsDeleted)
                .Select(x => new { x.IsEnabled, x.Value })
                .FirstOrDefaultAsync();

        return row == null
            ? (false, string.Empty)
            : (row.IsEnabled, row.Value ?? string.Empty);
    }


    // Whole number when ON and positive, otherwise 0 (= no limit)
    private async Task<int>
        SwitchNumberAsync
        (
            string? code
        )
    {
        (bool isOn, int number) =
            await SwitchStateAsync(code);

        return isOn ? number : 0;
    }


    //===========================================================
    // PO date window (Back Dated / Post Dated switches)
    //===========================================================

    private async Task
        EnsureDateAllowedAsync
        (
            DateOnly date,
            DateOnly? savedDate
        )
    {
        if (savedDate.HasValue && savedDate.Value == date)
        {
            return;
        }

        DateOnly today =
            BusinessToday();

        if (date < today)
        {
            (bool backOn, int backDays) =
                await SwitchStateAsync(Page.SwitchBackDated);

            if (!backOn)
            {
                throw new InvalidOperationException(
                    "Back dated entry is not allowed : the PO date cannot be before today.");
            }

            if (backDays > 0 && date < today.AddDays(-backDays))
            {
                throw new InvalidOperationException(
                    $"Back dated entry is allowed up to {today.AddDays(-backDays):dd-MMM-yyyy} only.");
            }
        }

        if (date > today)
        {
            (bool postOn, int postDays) =
                await SwitchStateAsync(Page.SwitchPostDated);

            if (!postOn)
            {
                throw new InvalidOperationException(
                    "Post dated entry is not allowed : the PO date cannot be after today.");
            }

            if (postDays > 0 && date > today.AddDays(postDays))
            {
                throw new InvalidOperationException(
                    $"Post dated entry is allowed up to {today.AddDays(postDays):dd-MMM-yyyy} only.");
            }
        }
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
                    x.PurchaseOrderId == id
                    &&
                    !x.IsDeleted
            );
    }
}
