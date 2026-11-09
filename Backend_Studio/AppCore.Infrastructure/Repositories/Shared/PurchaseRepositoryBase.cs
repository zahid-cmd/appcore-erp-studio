

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

using BusinessLineAccess =
    AppCore.Infrastructure.Repositories.Settings.GeneralSettings.BusinessLineAccess;

using static AppCore.Infrastructure.Repositories.Procurement.Shared.PurchaseOrderPricing;

using PostingLedgerCodes =
    AppCore.Infrastructure.Platform.Accounting.PostingLedgerCodes;

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

using WarehousesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Warehouses;

using MotorBikeUnitsEntity =
    AppCore.Domain.Entities.Procurement.MotorBikePurchase.MotorBikeUnits;

using StockBatchesEntity =
    AppCore.Domain.Platform.Inventory.StockBatches;

using StockMovementsEntity =
    AppCore.Domain.Platform.Inventory.StockMovements;

using AccessoryDuesEngine =
    AppCore.Infrastructure.Repositories.Procurement.MotorBikePurchase.PurchaseAccessoryDuesEngine;

using AccessoryDuesEntity =
    AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchaseAccessoryDues;

using AccessoryReceiptsEntity =
    AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchaseAccessoryReceipts;

using AccessoryTakesEntity =
    AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchaseAccessoryTakes;

using CreateReceivingAccessoryDto =
    AppCore.Application.InventoryManagement.ProductReceiving.CreateReceivingAccessoryDto;

using VatRegisterEntity =
    AppCore.Domain.Platform.Inventory.VatRegister;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Procurement.Shared;


//===============================================================
// Purchases Repository : one engine for Purchases - MB / SP / AC.
// The supplier's Mushak 6.3 is entered as the purchase invoice.
// Each page (MB / SP / AC) is a small class that gives its tables
// (THeader / TLine), its Purchase Order tables (TPoHeader /
// TPoLine) and its PurchasePage (type, prefix, switch codes).
//
// Draft    : Create / Update / Delete / Restore. Number PIMB /
//            PISP / PIAC taken on the first save; renumbered when
//            branch, financial year or month changes.
// Approve  : Draft → Approved. The PO lines are billed. Switch
//            "Post On Approval" ON : posts at once.
// Return   : Approved → Draft (PO lines unbilled)
// Post     : Approved → Posted :
//              journal (voucher type = the page prefix, number =
//              the purchase number) :
//                Dr item Inventory ledger  net cost (+ VAT that
//                                          cannot be claimed)
//                Dr VAT Current Account    claimable VAT (Posting
//                                          Setup, per type)
//                Cr Supplier payable       total payable
//              one stock batch per line (exact unit cost),
//              In transit (or On hand when "Products Received on
//              Purchase" is ON), VAT register rows, motor bike
//              units in stock.
// Cancel   : Approved / Posted while nothing has left the batches,
//            been received or returned, and (Posted) the supplier's
//            payable balance still covers it → Cancelled (reversing
//            journal, batches cancelled, PO unbilled).
//
// Lines :
//   PO Required ON  : one PO of the supplier (same branch,
//                     Approved / Placed); a line may not take more
//                     than the PO line's quantity left; its price
//                     may be above the PO price only within
//                     "Price Above PO" %.
//   PO Required OFF : direct lines; Max Stock Level is a hard cap
//                     (stock + on order + this line).
// Pricing, discount, VAT split and rounding as on the Purchase
// Order engine (PurchaseOrderPricing). Additional discount and
// payable-only rounding are shared by line value; free units are
// in the unit cost divisor.
//===============================================================

public abstract class PurchaseRepositoryBase<THeader, TLine, TPoHeader, TPoLine>
    : IPurchaseRepository
    where THeader : PurchaseHeader, new()
    where TLine : PurchaseLine, new()
    where TPoHeader : PurchaseOrderHeader
    where TPoLine : PurchaseOrderLine
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Procurement";

    private const string EntityName =
        "Purchase";

    private const string DateFormat =
        "yyyy-MM-dd";

    public const string StatusDraft = "Draft";

    public const string StatusApproved = "Approved";

    public const string StatusPosted = "Posted";

    public const string StatusCancelled = "Cancelled";

    // Purchase Order statuses
    private const string PoApproved = "Approved";

    private const string PoPlaced = "Placed";

    private const string PoCompleted = "Completed";

    private const string PoClosedShort = "Closed Short";

    // Close reason written when the balance is not carried
    private const string NotCarriedReason =
        "Balance not carried (System Configuration) : purchase ";

    // Stock batch statuses / buckets / movement types
    private const string BatchInTransit = "InTransit";

    private const string BatchOnHand = "OnHand";

    private const string BatchCancelled = "Cancelled";

    private const string MovePurchase = "Purchase";

    private const string MoveCancel = "PurchaseCancel";

    // Product Receiving movements (In Transit → On Hand and back)
    private const string MoveReceive = "Receive";

    private const string MoveReceiveCancel = "ReceiveCancel";

    private const string SourcePurchase = "Purchase";

    // Motor bike unit statuses
    private const string UnitPending = "Pending";

    private const string UnitInStock = "InStock";

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

    protected abstract PurchasePage Page { get; }


    // The page type sent must be this page's
    private PurchasePage PageOf
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


    //===========================================================
    // Constructor
    //===========================================================

    protected PurchaseRepositoryBase(
        AppDbContext context,
        IVoucherNumberService numberService,
        IVatApplicabilityService vatApplicability,
        IVoucherPostingService postingService)
    {
        _context = context;

        _numberService = numberService;

        _vatApplicability = vatApplicability;

        _postingService = postingService;
    }


    //===========================================================
    // Normalized Input
    //===========================================================

    private sealed class PurchaseInput
    {
        public PurchasePage Page { get; set; } = new();

        public DateOnly PurchaseDate { get; set; }

        public VoucherPeriodDto Period { get; set; } = new();

        public SupplierProfilesEntity Supplier { get; set; } = new();

        public long? PurchaseOrderId { get; set; }

        public string OrderNo { get; set; } = string.Empty;

        public string SupplierInvoiceNo { get; set; } = string.Empty;

        public DateOnly? SupplierInvoiceDate { get; set; }

        public string MushakNo { get; set; } = string.Empty;

        public DateOnly? MushakDate { get; set; }

        public string DoReference { get; set; } = string.Empty;

        public string GatePassNo { get; set; } = string.Empty;

        public long? WarehouseId { get; set; }

        public string WarehouseName { get; set; } = string.Empty;

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

        // Motor bike units per line number (Products Received on
        // Purchase ON)
        public Dictionary<int, List<PurchaseUnitDto>> Units { get; set; } = new();

        // MB, Products Received on Purchase ON : free accessories
        // received with the purchase (taken in on Post)
        public List<PurchaseAccessoryTakeDto> Accessories { get; set; } = new();
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

        public string ImagePath { get; set; } = string.Empty;

        public int ReorderLevel { get; set; }

        public int RedLevel { get; set; }

        public int MaxStockLevel { get; set; }

        public long? BrandId { get; set; }

        public bool IsActive { get; set; }
    }


    // Purchase VAT rule of a type on a date (null rate = no rule)
    private sealed class VatRule
    {
        public decimal? Rate { get; set; }

        public bool InputCreditAllowed { get; set; } = true;
    }


    //===========================================================
    // Supplier terms (Supplier Profile) vs the purchase : the
    // first term that differs, or null. A term not set is free.
    //===========================================================

    private static string? SupplierTermsProblem
    (
        SupplierProfilesEntity supplier,
        PurchaseInput input,
        bool mrpPricing
    )
    {
        string priceEntry =
            (supplier.DefaultPriceEntry ?? string.Empty).Trim();

        if (priceEntry.Length > 0 && input.PurchaseVatApplicable)
        {
            string entry =
                input.NoVatInvoice
                    ? "None"
                    : input.PriceIncludesVat
                        ? "Incl"
                        : "Excl";

            if (!string.Equals(priceEntry, entry, StringComparison.OrdinalIgnoreCase))
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
    // Get All (list : header only, one page)
    //===========================================================

    public async Task<List<PurchaseDto>>
        GetAllAsync
        (
            string pageType
        )
    {
        PurchasePage page =
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
                .OrderByDescending(x => x.PurchaseDate)
                .ThenByDescending(x => x.PurchaseNo)
                .ToListAsync();

        return rows
            .Select(ToDto)
            .ToList();
    }


    //===========================================================
    // Get By Id (header + lines + bikes)
    //===========================================================

    public async Task<PurchaseDto?>
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
                        x.PurchaseId == id
                        &&
                        !x.IsDeleted
                );

        if (row == null)
        {
            return null;
        }

        PurchaseDto dto =
            ToDto(row);

        dto.Lines =
            await _context
                .Set<TLine>()
                .AsNoTracking()
                .Where(x => x.PurchaseId == id)
                .OrderBy(x => x.LineNo)
                .Select
                (
                    x =>
                        new PurchaseLineDto
                        {
                            PurchaseLineId = x.PurchaseLineId,
                            LineNo = x.LineNo,
                            PurchaseOrderLineId = x.PurchaseOrderLineId,
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
                            ReturnedQuantity = x.ReturnedQuantity,
                            ShortNotes = x.ShortNotes
                        }
                )
                .ToListAsync();

        if (row.PageType == "MB")
        {
            // Free accessories due on the bikes
            dto.Accessories =
                await AccessoryLinesAsync(row, dto.Lines);

            List<MotorBikeUnitsEntity> units =
                await _context
                    .Set<MotorBikeUnitsEntity>()
                    .AsNoTracking()
                    .Where(x => x.PurchaseId == id && !x.IsDeleted)
                    .OrderBy(x => x.MotorBikeUnitId)
                    .ToListAsync();

            foreach (PurchaseLineDto line in dto.Lines)
            {
                line.Units =
                    units
                        .Where(x => x.PurchaseLineId == line.PurchaseLineId)
                        .Select
                        (
                            x =>
                                new PurchaseUnitDto
                                {
                                    MotorBikeUnitId = x.MotorBikeUnitId,
                                    ChassisNo = x.ChassisNo,
                                    EngineNo = x.EngineNo,
                                    KeyNo = x.KeyNo,
                                    BatteryNo = x.BatteryNo,
                                    Status = x.Status,
                                    CkdStatus = x.CkdStatus,
                                    ManufactureYear = x.ManufactureYear
                                }
                        )
                        .ToList();
            }
        }

        return dto;
    }


    private static string? DateText
    (
        DateOnly? date
    )
    {
        return date?.ToString(DateFormat, CultureInfo.InvariantCulture);
    }


    private static PurchaseDto ToDto
    (
        THeader x
    )
    {
        return new PurchaseDto
        {
            PurchaseId = x.PurchaseId,
            PublicId = x.PublicId,
            PageType = x.PageType,
            PurchaseNo = x.PurchaseNo,
            PurchaseDate = x.PurchaseDate.ToString(DateFormat, CultureInfo.InvariantCulture),
            BranchId = x.BranchId,
            BranchCode = x.BranchCode,
            BranchName = x.BranchName,
            FinancialYearId = x.FinancialYearId,
            SupplierCode = x.SupplierCode,
            SupplierName = x.SupplierName,
            PurchaseOrderId = x.PurchaseOrderId,
            OrderNo = x.OrderNo,
            SupplierInvoiceNo = x.SupplierInvoiceNo,
            SupplierInvoiceDate = DateText(x.SupplierInvoiceDate) ?? string.Empty,
            MushakNo = x.MushakNo,
            MushakDate = DateText(x.MushakDate) ?? string.Empty,
            DoReference = x.DoReference,
            GatePassNo = x.GatePassNo,
            WarehouseId = x.WarehouseId,
            WarehouseName = x.WarehouseName,
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
            TotalQuantity = x.TotalQuantity,
            TotalFreeQuantity = x.TotalFreeQuantity,
            TotalMrp = x.TotalMrp,
            TotalProfit = x.TotalProfit,
            TotalDp = x.TotalDp,
            TotalAmount = x.TotalAmount,
            TotalVat = x.TotalVat,
            TotalVatClaimable = x.TotalVatClaimable,
            TotalPayable = x.TotalPayable,
            Narration = x.Narration,
            Status = x.Status,
            StockedIn = x.StockedIn,
            VoucherNo = x.VoucherNo,
            CancelReason = x.CancelReason,
            ApprovedDate = x.ApprovedDate,
            PostedDate = x.PostedDate,
            CancelledDate = x.CancelledDate,
            CreatedDate = x.CreatedDate,
            ModifiedDate = x.ModifiedDate
        };
    }


    //===========================================================
    // Get Defaults : number preview, period, switches, options
    //===========================================================

    //===========================================================
    // Business Configuration : the branch must run the page's
    // business line today (wing core business + the branch's
    // active extra business). Checked on defaults, save,
    // approve and post.
    //===========================================================

    private static string BusinessLineOfPage
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

    // null = the branch runs the line; otherwise the message
    private async Task<string?> BranchLineProblemAsync
    (
        long branchId
    )
    {
        string line =
            BusinessLineOfPage(Page.PageType);

        Dictionary<long, HashSet<string>> lines =
            await BusinessLineAccess.ActiveLinesByBranchAsync(
                _context,
                BusinessLineAccess.Today());

        if (lines.TryGetValue(branchId, out HashSet<string>? branchLines) && branchLines.Contains(line))
        {
            return null;
        }

        string branchName =
            await _context
                .Set<AppCore.Domain.Entities.Settings.GeneralSettings.Branches>()
                .AsNoTracking()
                .Where(x => x.BranchId == branchId)
                .Select(x => x.BranchName)
                .FirstOrDefaultAsync()
            ?? "This branch";

        return $"{branchName} does not run {line} purchases (Business Configuration). Switch to a branch that does.";
    }

    private async Task RequireBranchLineAsync
    (
        long branchId
    )
    {
        string? problem =
            await BranchLineProblemAsync(branchId);

        if (problem != null)
        {
            throw new InvalidOperationException(problem);
        }
    }


    public async Task<PurchaseDefaultsDto>
        GetDefaultsAsync
        (
            string pageType,
            long branchId,
            DateOnly purchaseDate
        )
    {
        PurchasePage page =
            PageOf(pageType);

        PurchaseDefaultsDto result =
            new()
            {
                BranchId = branchId,
                Today = BusinessToday().ToString(DateFormat, CultureInfo.InvariantCulture),
                Rules = await RulesAsync(),
                Suppliers = await SupplierOptionsAsync(page),
                Products = await ProductOptionsAsync(page, null),
                Warehouses = await WarehouseOptionsAsync(branchId),
                VatRates = await VatRatesAsync(page, purchaseDate)
            };

        VoucherPeriodDto period;

        try
        {
            period =
                await _numberService.ResolvePeriodAsync(
                    branchId,
                    purchaseDate);
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

        // Business Configuration : blocked like a closed period
        string? lineProblem =
            await BranchLineProblemAsync(period.BranchId);

        if (lineProblem != null)
        {
            result.Message = lineProblem;

            result.BranchBlocked = true;

            return result;
        }

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
                .Where(x => x.PurchaseNo.StartsWith(prefix))
                .Select(x => x.PurchaseNo)
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

        result.PurchaseNo =
            CodeGenerator.GenerateVoucherNo(
                page.Prefix,
                period.BranchDigits,
                period.FinancialYearCode,
                period.PeriodMonth,
                next);

        return result;
    }


    //===========================================================
    // The page's switches, as the form needs them
    //===========================================================

    private async Task<PurchaseRulesDto>
        RulesAsync()
    {
        (bool backOn, int backDays) =
            await SwitchStateAsync(Page.SwitchBackDated);

        (bool postOn, int postDays) =
            await SwitchStateAsync(Page.SwitchPostDated);

        return new PurchaseRulesDto
        {
            PoRequired = await IsSwitchOnAsync(Page.SwitchPoRequired, false),
            ReceivedOnPurchase = await IsSwitchOnAsync(Page.SwitchReceivedOnPurchase, false),
            // Key & Battery Required (MB) : ON = asked and required;
            // OFF = not kept (Unit Desk columns hidden)
            UnitsRequired = await KeyBatteryOnAsync(),
            UniqueKeyNo = await KeyBatteryOnAsync() && await IsSwitchOnAsync(Page.SwitchUniqueKeyNo, false),
            UniqueBatteryNo = await KeyBatteryOnAsync() && await IsSwitchOnAsync(Page.SwitchUniqueBatteryNo, false),
            MushakRequired = await IsSwitchOnAsync(Page.SwitchMushakRequired, false),
            SupplierInvoiceRequired = await IsSwitchOnAsync(Page.SwitchInvoiceNoRequired, false),
            DoReferenceRequired = await IsSwitchOnAsync(Page.SwitchDoRequired, false),
            GatePassRequired = await IsSwitchOnAsync(Page.SwitchGatePassRequired, false),
            PriceAbovePoPercent = await PriceAbovePoPercentAsync(),
            VatEditable = await IsSwitchOnAsync(Page.SwitchVatAsPer63, false),
            FreeGoodsAllowed = await IsSwitchOnAsync(Page.SwitchFreeGoods, false),
            MaxLines = await SwitchNumberAsync(Page.SwitchMaxLines),
            PostOnApproval = await IsSwitchOnAsync(Page.SwitchPostOnApproval, false),
            EditSupplierTerms = await IsSwitchOnAsync(Page.SwitchEditSupplierTerms, true),
            BackDatedAllowed = backOn,
            BackDatedDays = backDays,
            PostDatedAllowed = postOn,
            PostDatedDays = postDays
        };
    }


    // "Price Above PO" : null = not allowed; else the tolerance %
    // (ON with no / bad value = 0 %)
    private async Task<decimal?>
        PriceAbovePoPercentAsync()
    {
        (bool isOn, string text) =
            await SwitchTextAsync(Page.SwitchPriceAbovePo);

        if (!isOn)
        {
            return null;
        }

        return decimal.TryParse(
                   (text ?? string.Empty).Trim(),
                   NumberStyles.Number,
                   CultureInfo.InvariantCulture,
                   out decimal percent)
               && percent > 0
            ? Math.Min(percent, 100m)
            : 0m;
    }


    //===========================================================
    // Warehouses of a branch (live, active)
    //===========================================================

    private async Task<List<PurchaseWarehouseOptionDto>>
        WarehouseOptionsAsync
        (
            long branchId
        )
    {
        return await _context
            .Set<WarehousesEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
                    &&
                    x.IsActive
                    &&
                    x.BranchId == branchId
            )
            .OrderByDescending(x => x.IsDefault)
            .ThenBy(x => x.WarehouseName)
            .Select
            (
                x =>
                    new PurchaseWarehouseOptionDto
                    {
                        WarehouseId = x.WarehouseId,
                        WarehouseCode = x.WarehouseCode,
                        WarehouseName = x.WarehouseName,
                        IsDefault = x.IsDefault
                    }
            )
            .ToListAsync();
    }


    //===========================================================
    // Purchase VAT rules of the page's types on a date
    //===========================================================

    private static string[] VatTypesOf
    (
        PurchasePage page
    )
    {
        return page.PageType switch
        {
            "MB" => new[] { TypeMotorBikes },
            "SP" => new[] { TypeSpareParts, TypeLubricants },
            _ => new[] { TypeAccessories }
        };
    }


    private async Task<List<PurchaseVatRateDto>>
        VatRatesAsync
        (
            PurchasePage page,
            DateOnly date
        )
    {
        List<PurchaseVatRateDto> result =
            new();

        foreach (string type in VatTypesOf(page))
        {
            VatRule rule =
                await VatRuleAsync(type, date);

            result.Add(
                new PurchaseVatRateDto
                {
                    ProductType = type,
                    VatRate = rule.Rate,
                    InputCreditAllowed = rule.InputCreditAllowed
                });
        }

        return result;
    }


    // Active Purchase VAT rule of a type on a date (none : no rate,
    // credit allowed)
    private async Task<VatRule>
        VatRuleAsync
        (
            string vatType,
            DateOnly date
        )
    {
        var rule =
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
                .Select(x => new { x.VatRate, x.InputCreditAllowed })
                .FirstOrDefaultAsync();

        return rule == null
            ? new VatRule()
            : new VatRule
            {
                Rate = rule.VatRate,
                InputCreditAllowed = rule.InputCreditAllowed
            };
    }


    //===========================================================
    // Mushak 6.3 No check (live, from the form) : once per
    // supplier in the financial year of the purchase date
    //===========================================================

    public async Task<PurchaseMushakCheckDto>
        CheckMushakAsync
        (
            string supplierCode,
            string mushakNo,
            long branchId,
            DateOnly purchaseDate,
            long? purchaseId
        )
    {
        PurchaseMushakCheckDto result =
            new();

        string supplier =
            (supplierCode ?? string.Empty).Trim();

        string number =
            Limit(mushakNo, 50);

        if (supplier.Length == 0 || number.Length == 0 || branchId <= 0)
        {
            return result;
        }

        VoucherPeriodDto period;

        try
        {
            period =
                await _numberService.ResolvePeriodAsync(
                    branchId,
                    purchaseDate);
        }
        catch (InvalidOperationException)
        {
            // No open period : the save says so
            return result;
        }

        string? taken =
            await MushakTakenAsync(
                supplier,
                number,
                period.FinancialYearId,
                purchaseId ?? 0);

        if (taken != null)
        {
            result.Taken = true;
            result.PurchaseNo = taken;
            result.Message =
                $"Mushak 6.3 No {number} is already on purchase {taken} in FY {period.FinancialYearName}.";
        }

        return result;
    }


    // The purchase (not cancelled, not deleted) that holds a
    // supplier's Mushak 6.3 No in a financial year; null = free
    private async Task<string?> MushakTakenAsync(
        string supplierCode,
        string mushakNo,
        long financialYearId,
        long currentPurchaseId)
    {
        string key =
            mushakNo.Trim().ToUpper();

        return
            await _context
                .Set<THeader>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.Status != StatusCancelled
                        &&
                        x.PurchaseId != currentPurchaseId
                        &&
                        x.FinancialYearId == financialYearId
                        &&
                        x.SupplierCode == supplierCode
                        &&
                        x.MushakNo.ToUpper() == key
                )
                .Select(x => x.PurchaseNo)
                .FirstOrDefaultAsync();
    }


    //===========================================================
    // Unit Desk check (live, from the form) : the numbers typed
    // that live bikes of other purchases already carry. Same
    // rule as the save : Chassis / Engine always, Key / Battery
    // only when their "unique" switch is ON.
    //===========================================================

    public async Task<List<PurchaseUnitTakenDto>>
        CheckUnitsAsync
        (
            PurchaseUnitCheckDto dto
        )
    {
        List<PurchaseUnitTakenDto> result =
            new();

        List<PurchaseUnitDto> units =
            dto?.Units ?? new List<PurchaseUnitDto>();

        if (Page.PageType != "MB" || units.Count == 0)
        {
            return result;
        }

        bool uniqueKey =
            await KeyBatteryOnAsync() && await IsSwitchOnAsync(Page.SwitchUniqueKeyNo, false);

        bool uniqueBattery =
            await KeyBatteryOnAsync() && await IsSwitchOnAsync(Page.SwitchUniqueBatteryNo, false);

        List<string> Pick(Func<PurchaseUnitDto, string?> pick) =>
            units
                .Select(x => Limit(pick(x), 50).ToUpperInvariant())
                .Where(x => x.Length > 0)
                .Distinct()
                .Take(500)
                .ToList();

        List<string> chassis = Pick(x => x.ChassisNo);

        List<string> engines = Pick(x => x.EngineNo);

        List<string> keys = uniqueKey ? Pick(x => x.KeyNo) : new List<string>();

        List<string> batteries = uniqueBattery ? Pick(x => x.BatteryNo) : new List<string>();

        if (chassis.Count + engines.Count + keys.Count + batteries.Count == 0)
        {
            return result;
        }

        long current =
            dto?.PurchaseId ?? 0;

        var rows =
            await _context
                .Set<MotorBikeUnitsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.PurchaseId != current
                        &&
                        (
                            chassis.Contains(x.ChassisNo.ToUpper())
                            ||
                            engines.Contains(x.EngineNo.ToUpper())
                            ||
                            keys.Contains(x.KeyNo.ToUpper())
                            ||
                            batteries.Contains(x.BatteryNo.ToUpper())
                        )
                )
                .Select(x => new { x.ChassisNo, x.EngineNo, x.KeyNo, x.BatteryNo, x.PurchaseNo })
                .Take(500)
                .ToListAsync();

        void Add(string field, string label, string? value, List<string> typed, string purchaseNo)
        {
            string key =
                (value ?? string.Empty).Trim().ToUpperInvariant();

            if (key.Length == 0 || !typed.Contains(key) || result.Any(x => x.Field == field && x.Value == key))
            {
                return;
            }

            result.Add(
                new PurchaseUnitTakenDto
                {
                    Field = field,
                    Value = key,
                    PurchaseNo = purchaseNo,
                    Message = $"{label} {key} is already on purchase {purchaseNo}."
                });
        }

        foreach (var row in rows)
        {
            Add("ChassisNo", "Chassis No", row.ChassisNo, chassis, row.PurchaseNo);
            Add("EngineNo", "Engine No", row.EngineNo, engines, row.PurchaseNo);
            Add("KeyNo", "Key No", row.KeyNo, keys, row.PurchaseNo);
            Add("BatteryNo", "Battery No", row.BatteryNo, batteries, row.PurchaseNo);
        }

        return result;
    }


    //===========================================================
    // Open Purchase Orders of a supplier (Approved / Placed with
    // quantity left). keepOrderId : the order a draft already uses
    // (shown even when nothing is left).
    //===========================================================

    public async Task<List<PurchaseOpenOrderDto>>
        GetOpenOrdersAsync
        (
            string pageType,
            string supplierCode,
            long? keepOrderId
        )
    {
        PurchasePage page =
            PageOf(pageType);

        string supplier =
            (supplierCode ?? string.Empty).Trim();

        if (supplier.Length == 0)
        {
            return new List<PurchaseOpenOrderDto>();
        }

        List<TPoHeader> orders =
            await _context
                .Set<TPoHeader>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.PageType == page.PageType
                        &&
                        x.SupplierCode == supplier
                        &&
                        (
                            x.Status == PoApproved
                            ||
                            x.Status == PoPlaced
                            ||
                            (keepOrderId.HasValue && x.PurchaseOrderId == keepOrderId.Value)
                        )
                )
                .OrderBy(x => x.OrderDate)
                .ThenBy(x => x.OrderNo)
                .ToListAsync();

        if (orders.Count == 0)
        {
            return new List<PurchaseOpenOrderDto>();
        }

        List<long> ids =
            orders
                .Select(x => x.PurchaseOrderId)
                .ToList();

        List<TPoLine> lines =
            await _context
                .Set<TPoLine>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.PurchaseOrderId))
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        List<PurchaseOpenOrderDto> result =
            new();

        foreach (TPoHeader order in orders)
        {
            List<PurchaseOpenOrderLineDto> open =
                lines
                    .Where(x => x.PurchaseOrderId == order.PurchaseOrderId)
                    .Select
                    (
                        x =>
                            new PurchaseOpenOrderLineDto
                            {
                                PurchaseOrderLineId = x.PurchaseOrderLineId,
                                LineNo = x.LineNo,
                                ProductType = x.ProductType,
                                ProductId = x.ProductId,
                                ProductCode = x.ProductCode,
                                ProductName = x.ProductName,
                                Unit = x.Unit,
                                Quantity = x.Quantity,
                                FreeQuantity = x.FreeQuantity,
                                BilledQuantity = x.BilledQuantity,
                                Remaining = Math.Max(0m, x.Quantity + x.FreeQuantity - x.BilledQuantity),
                                Mrp = x.Mrp,
                                ProfitPercent = x.ProfitPercent,
                                UnitPrice = x.UnitPrice,
                                VatRate = x.VatRate
                            }
                    )
                    .ToList();

            bool keep =
                keepOrderId.HasValue
                &&
                order.PurchaseOrderId == keepOrderId.Value;

            if (!keep && !open.Any(x => x.Remaining > 0))
            {
                continue;
            }

            result.Add(
                new PurchaseOpenOrderDto
                {
                    PurchaseOrderId = order.PurchaseOrderId,
                    OrderNo = order.OrderNo,
                    OrderDate = order.OrderDate.ToString(DateFormat, CultureInfo.InvariantCulture),
                    Status = order.Status,
                    BranchId = order.BranchId,
                    BranchName = order.BranchName,
                    PriceIncludesVat = order.PriceIncludesVat,
                    InvoicePriceBasis = order.InvoicePriceBasis,
                    DefaultProfitPercent = order.DefaultProfitPercent,
                    AdditionalDiscountType = order.AdditionalDiscountType,
                    AdditionalDiscountValue = order.AdditionalDiscountValue,
                    NoVatInvoice = order.NoVatInvoice,
                    TotalPayable = order.TotalPayable,
                    Lines = open
                });
        }

        return result;
    }


    //===========================================================
    // Last terms per item (direct lines' prefill) from this
    // page's purchases (cancelled and deleted not counted)
    //   MRP    : latest line with an MRP (any supplier)
    //   DP     : this supplier's latest line
    //   Margin : this supplier's latest MRP invoice
    //===========================================================

    public async Task<List<PurchaseOrderLastTermsDto>>
        GetLastTermsAsync
        (
            string pageType,
            string supplierCode
        )
    {
        PurchasePage page =
            PageOf(pageType);

        string supplier =
            (supplierCode ?? string.Empty).Trim();

        var rows =
            await
            (
                from l in _context.Set<TLine>().AsNoTracking()
                join h in _context.Set<THeader>().AsNoTracking()
                    on l.PurchaseId equals h.PurchaseId
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
                    h.PurchaseNo,
                    h.PurchaseDate,
                    h.PurchaseId
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
                         .OrderByDescending(x => x.PurchaseDate)
                         .ThenByDescending(x => x.PurchaseId)
                         .FirstOrDefault();

                    var last =
                        supplier.Length == 0
                            ? null
                            : g.Where(x => x.SupplierCode == supplier)
                               .OrderByDescending(x => x.PurchaseDate)
                               .ThenByDescending(x => x.PurchaseId)
                               .FirstOrDefault();

                    var profit =
                        supplier.Length == 0
                            ? null
                            : g.Where(x => x.SupplierCode == supplier && x.InvoicePriceBasis == BasisMrp)
                               .OrderByDescending(x => x.PurchaseDate)
                               .ThenByDescending(x => x.PurchaseId)
                               .FirstOrDefault();

                    return new PurchaseOrderLastTermsDto
                    {
                        ProductCode = g.Key,
                        LastMrp = mrp?.Mrp ?? 0m,
                        LastMrpOrderNo = mrp?.PurchaseNo ?? string.Empty,
                        HasProfit = profit != null,
                        ProfitPercent = profit?.ProfitPercent ?? 0m,
                        ProfitBasis = profit?.ProfitBasis ?? string.Empty,
                        ProfitOrderNo = profit?.PurchaseNo ?? string.Empty,
                        ProfitDate = profit?.PurchaseDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty,
                        LastDp = last?.UnitPrice ?? 0m,
                        LastDpIncludesVat = last?.PriceIncludesVat ?? true,
                        LastVatRate = last?.VatRate ?? 0m,
                        LastDpOrderNo = last?.PurchaseNo ?? string.Empty
                    };
                }
            )
            .ToList();

        // Margin : the latest of this supplier's purchases and POs
        // (MRP invoices) for each item
        if (supplier.Length > 0)
        {
            Dictionary<string, MarginRow> other =
                (await PoMarginRowsAsync(page.PageType, supplier))
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
                    o.Date > own;

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

    // Header margins of the page's purchases and POs (MRP invoices)
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
                .Select(h => new HeaderMarginRow(h.SupplierCode, h.DefaultProfitPercent, h.PurchaseNo, h.PurchaseDate, 1, h.PurchaseId))
                .ToListAsync();

        rows.AddRange(
            await _context
                .Set<TPoHeader>()
                .AsNoTracking()
                .Where(h => !h.IsDeleted && h.PageType == pageType && h.Status != StatusCancelled && h.InvoicePriceBasis == BasisMrp)
                .Select(h => new HeaderMarginRow(h.SupplierCode, h.DefaultProfitPercent, h.OrderNo, h.OrderDate, 0, h.PurchaseOrderId))
                .ToListAsync());

        return rows;
    }

    private async Task<List<MarginRow>> PoMarginRowsAsync
    (
        string pageType,
        string supplier
    )
    {
        return
            await
            (
                from l in _context.Set<TPoLine>().AsNoTracking()
                join h in _context.Set<TPoHeader>().AsNoTracking()
                    on l.PurchaseOrderId equals h.PurchaseOrderId
                where !h.IsDeleted
                      &&
                      h.PageType == pageType
                      &&
                      h.Status != StatusCancelled
                      &&
                      h.SupplierCode == supplier
                      &&
                      h.InvoicePriceBasis == BasisMrp
                select new MarginRow(l.ProductCode, l.ProfitPercent, h.ProfitBasis, h.OrderNo, h.OrderDate, h.PurchaseOrderId)
            )
            .ToListAsync();
    }


    //===========================================================
    // Suppliers of the page (live ; inactive ones flagged)
    //===========================================================

    private async Task<List<PurchaseOrderSupplierOptionDto>>
        SupplierOptionsAsync
        (
            PurchasePage page
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
                    .OrderByDescending(x => x.PurchaseDate)
                    .ThenByDescending(x => x.PurchaseId)
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
            PurchasePage page,
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
            PurchasePage page
        )
    {
        var rows =
            await
            (
                from l in _context.Set<TPoLine>().AsNoTracking()

                join h in _context.Set<TPoHeader>().AsNoTracking()
                    on l.PurchaseOrderId equals h.PurchaseOrderId

                where !h.IsDeleted
                      &&
                      h.PageType == page.PageType
                      &&
                      (h.Status == PoApproved || h.Status == PoPlaced)

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
    // Hand, from the stock movements (CompanyStock, shared with
    // the Purchase Order page)
    //===========================================================

    private async Task<Dictionary<string, decimal>>
        CompanyStockAsync
        (
            PurchasePage page
        )
    {
        return CompanyStock.Totals(
            await CompanyStock.LoadAsync(_context, page.PageType));
    }


    private async Task<List<ProductRow>>
        ProductRowsAsync
        (
            PurchasePage page,
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


    //===========================================================
    // System text, then the text typed on the page after " | "
    // (either alone when the other is empty)
    //===========================================================

    private static string WithTyped
    (
        string system,
        string? typed
    )
    {
        string a =
            (system ?? string.Empty).Trim();

        string b =
            (typed ?? string.Empty).Trim();

        return a.Length == 0
            ? b
            : b.Length == 0
                ? a
                : $"{a} | {b}";
    }

    // Year of manufacture : null / 0 = not given (the purchase
    // invoice's year is used); otherwise 2000 .. next year
    private static int? CheckYear
    (
        int? year,
        string label
    )
    {
        if (year == null || year == 0)
        {
            return null;
        }

        int max =
            DateTime.UtcNow.Year + 1;

        if (year < 2000 || year > max)
        {
            throw new InvalidOperationException(
                $"{label} : Year of Manufacture {year} is not valid (2000 - {max}).");
        }

        return year;
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


    //===========================================================
    // Normalize & Validate (Create / Update)
    //===========================================================

    private async Task<PurchaseInput>
        NormalizeAsync
        (
            CreatePurchaseDto dto,
            string? lockedPageType,
            long currentPurchaseId,
            DateOnly? savedDate = null
        )
    {
        PurchasePage page =
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
                "This purchase belongs to another Purchases page.");
        }

        PurchaseInput input =
            new()
            {
                Page = page,
                PurchaseDate =
                    ParseDate(
                        dto.PurchaseDate,
                        "Purchase Date"),
                PriceIncludesVat =
                    dto.PriceIncludesVat,
                Narration =
                    Limit(dto.Narration, 1000),
                DoReference =
                    Limit(dto.DoReference, 50),
                GatePassNo =
                    Limit(dto.GatePassNo, 50)
            };

        // Date window (an unchanged date of a saved draft is not
        // checked again)
        await EnsureDateAllowedAsync(
            input.PurchaseDate,
            savedDate);

        // Narration : required on every purchase (goes to the
        // journal)
        if (input.Narration.Length == 0)
        {
            throw new InvalidOperationException(
                "Narration is required.");
        }

        //=======================================================
        // Supplier documents (Mushak 6.3, invoice, DO, gate pass)
        //=======================================================

        input.SupplierInvoiceNo =
            Limit(dto.SupplierInvoiceNo, 50);

        input.SupplierInvoiceDate =
            OptionalDate(dto.SupplierInvoiceDate, "Supplier Invoice Date");

        // Switch "Supplier Invoice No Required" : No and Date together;
        // OFF : both optional
        if (await IsSwitchOnAsync(page.SwitchInvoiceNoRequired, false)
            && (input.SupplierInvoiceNo.Length == 0 || !input.SupplierInvoiceDate.HasValue))
        {
            throw new InvalidOperationException(
                "Supplier Invoice No and Date are required.");
        }

        input.MushakNo =
            Limit(dto.MushakNo, 50);

        input.MushakDate =
            OptionalDate(dto.MushakDate, "Mushak 6.3 Date");

        if (await IsSwitchOnAsync(page.SwitchMushakRequired, false)
            && (input.MushakNo.Length == 0 || !input.MushakDate.HasValue))
        {
            throw new InvalidOperationException(
                "Mushak 6.3 No and Date are required.");
        }

        if (input.MushakNo.Length > 0 && !input.MushakDate.HasValue)
        {
            throw new InvalidOperationException(
                "Mushak 6.3 Date is required with the Mushak 6.3 No.");
        }

        // Never both missing : a purchase needs the supplier's invoice
        // (No + Date) or the Mushak 6.3 (No + Date), whatever the
        // switches
        bool hasInvoice =
            input.SupplierInvoiceNo.Length > 0 && input.SupplierInvoiceDate.HasValue;

        bool hasMushak =
            input.MushakNo.Length > 0 && input.MushakDate.HasValue;

        if (!hasInvoice && !hasMushak)
        {
            throw new InvalidOperationException(
                "Enter the Supplier Invoice No and Date, or the Mushak 6.3 No and Date : a purchase needs at least one of them.");
        }

        if (input.SupplierInvoiceDate > input.PurchaseDate)
        {
            throw new InvalidOperationException(
                "Supplier Invoice Date cannot be after the Purchase Date.");
        }

        if (input.MushakDate > input.PurchaseDate)
        {
            throw new InvalidOperationException(
                "Mushak 6.3 Date cannot be after the Purchase Date.");
        }

        if (input.DoReference.Length == 0
            && await IsSwitchOnAsync(page.SwitchDoRequired, false))
        {
            throw new InvalidOperationException(
                "DO Reference is required.");
        }

        if (input.GatePassNo.Length == 0
            && await IsSwitchOnAsync(page.SwitchGatePassRequired, false))
        {
            throw new InvalidOperationException(
                "Gate Pass No is required.");
        }

        //=======================================================
        // Branch, period, VAT applicability
        //=======================================================

        if (dto.BranchId <= 0)
        {
            throw new InvalidOperationException(
                "Branch is required.");
        }

        input.Period =
            await _numberService.ResolvePeriodAsync(
                dto.BranchId,
                input.PurchaseDate);

        await RequireBranchLineAsync(input.Period.BranchId);

        VatApplicabilityDto applicability =
            await _vatApplicability.GetAsync(
                page.PageType,
                input.PurchaseDate);

        input.PurchaseVatApplicable =
            applicability.PurchaseVatApplicable;

        input.SalesVatApplicable =
            applicability.SalesVatApplicable;

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

        // The supplier's invoice number : once per supplier
        if (input.SupplierInvoiceNo.Length > 0)
        {
            string invoiceKey =
                input.SupplierInvoiceNo.ToUpper();

            string? taken =
                await _context
                    .Set<THeader>()
                    .AsNoTracking()
                    .Where
                    (
                        x =>
                            !x.IsDeleted
                            &&
                            x.Status != StatusCancelled
                            &&
                            x.PurchaseId != currentPurchaseId
                            &&
                            x.SupplierCode == supplier.SupplierCode
                            &&
                            x.SupplierInvoiceNo.ToUpper() == invoiceKey
                    )
                    .Select(x => x.PurchaseNo)
                    .FirstOrDefaultAsync();

            if (taken != null)
            {
                throw new InvalidOperationException(
                    $"Invoice {input.SupplierInvoiceNo} of '{supplier.DisplayName}' is already on purchase {taken}.");
            }
        }

        // Mushak 6.3 No : once per supplier in the financial year
        if (input.MushakNo.Length > 0)
        {
            string? mushakTaken =
                await MushakTakenAsync(
                    supplier.SupplierCode,
                    input.MushakNo,
                    input.Period.FinancialYearId,
                    currentPurchaseId);

            if (mushakTaken != null)
            {
                throw new InvalidOperationException(
                    $"Mushak 6.3 No {input.MushakNo} of '{supplier.DisplayName}' is already on purchase {mushakTaken} in FY {input.Period.FinancialYearName}.");
            }
        }

        //=======================================================
        // Purchase Order (PO Required ON : one PO, its terms)
        //=======================================================

        bool poRequired =
            await IsSwitchOnAsync(page.SwitchPoRequired, false);

        TPoHeader? order =
            null;

        Dictionary<long, TPoLine> orderLines =
            new();

        if (poRequired)
        {
            if (!dto.PurchaseOrderId.HasValue || dto.PurchaseOrderId.Value <= 0)
            {
                throw new InvalidOperationException(
                    "Pick the Purchase Order (System Configuration › PO Required is ON).");
            }

            order =
                await _context
                    .Set<TPoHeader>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync
                    (
                        x =>
                            x.PurchaseOrderId == dto.PurchaseOrderId.Value
                            &&
                            !x.IsDeleted
                    )
                ??
                throw new InvalidOperationException(
                    "The Purchase Order was not found. It may have been deleted.");

            if (order.PageType != page.PageType)
            {
                throw new InvalidOperationException(
                    $"Purchase Order {order.OrderNo} belongs to another page.");
            }

            if (order.SupplierCode != supplier.SupplierCode)
            {
                throw new InvalidOperationException(
                    $"Purchase Order {order.OrderNo} is of another supplier ({order.SupplierName}).");
            }

            if (order.BranchId != input.Period.BranchId)
            {
                throw new InvalidOperationException(
                    $"Purchase Order {order.OrderNo} is of branch {order.BranchName}; the purchase must be made there.");
            }

            if (order.Status != PoApproved && order.Status != PoPlaced)
            {
                throw new InvalidOperationException(
                    $"Purchase Order {order.OrderNo} is {order.Status}; only an Approved or Placed order can be billed.");
            }

            if (order.OrderDate > input.PurchaseDate)
            {
                throw new InvalidOperationException(
                    $"The Purchase Date cannot be before the order date of {order.OrderNo} ({order.OrderDate:dd-MMM-yyyy}).");
            }

            orderLines =
                (
                    await _context
                        .Set<TPoLine>()
                        .AsNoTracking()
                        .Where(x => x.PurchaseOrderId == order.PurchaseOrderId)
                        .ToListAsync()
                )
                .ToDictionary(x => x.PurchaseOrderLineId);

            input.PurchaseOrderId = order.PurchaseOrderId;

            input.OrderNo = order.OrderNo;

            // The order's terms
            input.PriceIncludesVat = order.PriceIncludesVat;

            dto.InvoicePriceBasis = order.InvoicePriceBasis;

            dto.DefaultProfitPercent = order.DefaultProfitPercent;

            dto.NoVatInvoice = order.NoVatInvoice;
        }

        input.NoVatInvoice =
            applicability.PurchaseVatApplicable && dto.NoVatInvoice;

        input.VatCharged =
            applicability.PurchaseVatApplicable && !input.NoVatInvoice;

        if (!input.VatCharged)
        {
            input.PriceIncludesVat = true;
        }

        //=======================================================
        // Pricing terms (Invoice Price, margin, discount)
        //=======================================================

        if (!page.MrpPricing)
        {
            dto.InvoicePriceBasis = BasisDp;
            dto.DefaultProfitPercent = 0m;
            dto.AdditionalDiscountType = DiscountNone;
            dto.AdditionalDiscountValue = 0m;

            foreach (CreatePurchaseLineDto row in dto.Lines ?? new List<CreatePurchaseLineDto>())
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

        // DP invoice : no margin and no MRP (selling prices are the
        // Pricing page's)
        if (input.InvoicePriceBasis == BasisDp)
        {
            dto.DefaultProfitPercent = 0m;

            foreach (CreatePurchaseLineDto row in dto.Lines ?? new List<CreatePurchaseLineDto>())
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

        // Supplier terms fixed (direct purchases; a PO already took
        // the supplier's terms)
        if (order == null && !await IsSwitchOnAsync(page.SwitchEditSupplierTerms, true))
        {
            string? problem =
                SupplierTermsProblem(
                    supplier,
                    input,
                    page.MrpPricing);

            if (problem != null)
            {
                throw new InvalidOperationException(
                    $"{problem} is fixed by the supplier (System Configuration › Edit Supplier Terms is OFF). Open the purchase again to take the supplier's terms.");
            }
        }

        //=======================================================
        // Warehouse (Products Received on Purchase ON)
        //=======================================================

        bool received =
            await IsSwitchOnAsync(page.SwitchReceivedOnPurchase, false);

        // Key & Battery Required (MB) : OFF = not kept on the bikes
        bool keyBattery =
            await KeyBatteryOnAsync();

        if (received)
        {
            if (!dto.WarehouseId.HasValue || dto.WarehouseId.Value <= 0)
            {
                throw new InvalidOperationException(
                    "Warehouse is required (System Configuration › Products Received on Purchase is ON).");
            }

            WarehousesEntity warehouse =
                await _context
                    .Set<WarehousesEntity>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync
                    (
                        x =>
                            x.WarehouseId == dto.WarehouseId.Value
                            &&
                            !x.IsDeleted
                    )
                ??
                throw new InvalidOperationException(
                    "The warehouse was not found. It may have been deleted.");

            if (!warehouse.IsActive)
            {
                throw new InvalidOperationException(
                    $"Warehouse '{warehouse.WarehouseName}' is inactive.");
            }

            if (warehouse.BranchId != input.Period.BranchId)
            {
                throw new InvalidOperationException(
                    $"Warehouse '{warehouse.WarehouseName}' is not of branch {input.Period.BranchName}.");
            }

            input.WarehouseId = warehouse.WarehouseId;

            input.WarehouseName = Limit(warehouse.WarehouseName, 150);
        }

        //=======================================================
        // Lines
        //=======================================================

        List<CreatePurchaseLineDto> lines =
            dto.Lines ?? new List<CreatePurchaseLineDto>();

        if (lines.Count == 0)
        {
            throw new InvalidOperationException(
                "Add at least one product.");
        }

        int maxLines =
            await SwitchNumberAsync(page.SwitchMaxLines);

        if (maxLines > 0 && lines.Count > maxLines)
        {
            throw new InvalidOperationException(
                $"A purchase can have at most {maxLines} lines (System Configuration).");
        }

        // PO-driven : the product comes from the PO line
        if (order != null)
        {
            foreach (CreatePurchaseLineDto row in lines)
            {
                if (!row.PurchaseOrderLineId.HasValue || !orderLines.TryGetValue(row.PurchaseOrderLineId.Value, out TPoLine? poLine))
                {
                    throw new InvalidOperationException(
                        $"Every line must be a line of Purchase Order {order.OrderNo}.");
                }

                row.ProductCode = poLine.ProductCode;
            }
        }
        else
        {
            foreach (CreatePurchaseLineDto row in lines)
            {
                row.PurchaseOrderLineId = null;
            }
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

        // Direct lines : Max Stock Level (stock + on order + line)
        Dictionary<string, decimal> onOrderNow =
            order == null
                ? await OnOrderAsync(page)
                : new Dictionary<string, decimal>();

        Dictionary<string, decimal> stockNow =
            order == null
                ? await CompanyStockAsync(page)
                : new Dictionary<string, decimal>();

        // ON = Max Stock Level is a warning only (page), not a cap
        bool aboveMaxAllowed =
            await IsSwitchOnAsync(Page.SwitchAboveMaxStock, false);

        long? supplierBrandId =
            supplier.BrandManagementId;

        Dictionary<long, string> brandNames =
            supplierBrandId.HasValue
                ? await BrandNamesAsync()
                : new Dictionary<long, string>();

        bool freeGoodsAllowed =
            await IsSwitchOnAsync(page.SwitchFreeGoods, false);

        bool vatEditable =
            await IsSwitchOnAsync(page.SwitchVatAsPer63, false);

        decimal? abovePo =
            await PriceAbovePoPercentAsync();

        Dictionary<string, VatRule> rules =
            new(StringComparer.OrdinalIgnoreCase);

        int lineNo = 0;

        string priceWord =
            page.MrpPricing ? "DP" : "unit price";

        foreach (CreatePurchaseLineDto row in lines)
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
                order == null
                &&
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

            if (product.ProductType == TypeMotorBikes
                && (decimal.Truncate(row.Quantity) != row.Quantity || decimal.Truncate(row.FreeQuantity) != row.FreeQuantity))
            {
                throw new InvalidOperationException(
                    $"{label} : motor bikes are counted in whole numbers.");
            }

            if (row.FreeQuantity < 0 || !IsMoney(row.FreeQuantity) || row.FreeQuantity > MaxMoney)
            {
                throw new InvalidOperationException(
                    $"{label} : free quantity must be 0 or more with at most 2 decimals.");
            }

            if (row.FreeQuantity > 0 && !freeGoodsAllowed)
            {
                throw new InvalidOperationException(
                    $"{label} : free quantity is not allowed (System Configuration › Free Goods Allowed is OFF).");
            }

            TPoLine? poLine =
                row.PurchaseOrderLineId.HasValue
                    ? orderLines.GetValueOrDefault(row.PurchaseOrderLineId.Value)
                    : null;

            if (poLine != null)
            {
                decimal left =
                    Math.Max(0m, poLine.Quantity + poLine.FreeQuantity - poLine.BilledQuantity);

                if (row.Quantity + row.FreeQuantity > left)
                {
                    throw new InvalidOperationException(
                        $"{label} : '{product.ProductName}' has {left:0.##} left on {order!.OrderNo}; this line takes {row.Quantity + row.FreeQuantity:0.##}.");
                }
            }
            else if (product.MaxStockLevel > 0 && !aboveMaxAllowed)
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
                        $"{label} : '{product.ProductName}' would go above its Max Stock Level ({product.MaxStockLevel}) : stock and orders already hold {held:0.##}, so at most {room:0.##} can be bought.");
                }
            }

            //===================================================
            // VAT : the Purchase VAT rule of the type on the date
            // (VAT as per 6.3 ON : the line's typed rate)
            //===================================================

            if (!rules.TryGetValue(product.ProductType, out VatRule? rule))
            {
                rule =
                    await VatRuleAsync(
                        product.ProductType,
                        input.PurchaseDate);

                rules[product.ProductType] =
                    rule;
            }

            decimal vatRate =
                0m;

            if (input.VatCharged)
            {
                if (!rule.Rate.HasValue)
                {
                    throw new InvalidOperationException(
                        $"No Purchase VAT rule for {product.ProductType} on {input.PurchaseDate:dd-MMM-yyyy}. Extend or add the rule first (VAT Management › VAT Setup).");
                }

                vatRate =
                    vatEditable
                        ? row.VatRate
                        : rule.Rate.Value;

                if (vatRate < 0 || vatRate > 100 || !IsMoney(vatRate))
                {
                    throw new InvalidOperationException(
                        $"{label} : VAT must be from 0 to 100% with at most 2 decimals.");
                }
            }

            bool claimable =
                input.VatCharged
                &&
                input.SalesVatApplicable
                &&
                rule.InputCreditAllowed;

            //===================================================
            // MRP / Profit % / DP : any two give the third
            //===================================================

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

            // PO price : above it only within "Price Above PO" %
            if (poLine != null && dp > poLine.UnitPrice)
            {
                if (!abovePo.HasValue)
                {
                    throw new InvalidOperationException(
                        $"{label} : {priceWord} ({dp:N2}) is above the PO price ({poLine.UnitPrice:N2}) (System Configuration › Price Above PO is OFF).");
                }

                decimal ceiling =
                    decimal.Round(poLine.UnitPrice * (1m + abovePo.Value / 100m), 4, MidpointRounding.AwayFromZero);

                if (dp > ceiling)
                {
                    throw new InvalidOperationException(
                        $"{label} : {priceWord} ({dp:N2}) is more than {abovePo.Value:0.##}% above the PO price ({poLine.UnitPrice:N2}); at most {ceiling:N2}.");
                }
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
                    PurchaseOrderLineId = poLine?.PurchaseOrderLineId,
                    ProductType = product.ProductType,
                    ProductId = product.ProductId,
                    ProductCode = product.ProductCode,
                    ProductName = Limit(product.ProductName, 200),
                    Unit = Limit(product.Unit, 30),
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
                    VatRate = vatRate,
                    VatClaimable = claimable,
                    ReturnedQuantity = 0m,
                    ShortNotes = Limit(row.ShortNotes, 200)
                });

            //===================================================
            // Motor bikes : the Unit Desk (received on purchase)
            //===================================================

            if (received && page.PageType == "MB")
            {
                input.Units[lineNo] =
                    NormalizeUnits(
                        row.Units,
                        row.Quantity + row.FreeQuantity,
                        label,
                        keyBattery);
            }
        }

        if (input.Units.Count > 0)
        {
            await CheckUnitsUniqueAsync(
                input.Units.Values.SelectMany(x => x).ToList(),
                currentPurchaseId);
        }

        // MB free accessories received with the purchase (checked
        // against the schemes when saved)
        if (received && page.PageType == "MB")
        {
            input.Accessories =
                (dto.Accessories ?? new List<PurchaseAccessoryTakeDto>())
                    .Where(x => x.Quantity > 0m)
                    .ToList();
        }

        ApplyDiscountAndVat(input);

        await ApplyRoundingAsync(input);

        return input;
    }


    //===========================================================
    // Key & Battery Required (MB only; switch CFG-MOD-007-0048) :
    // ON  : every bike's Key No and Battery No are asked and needed
    // OFF : the dealer does not keep them (Unit Desk columns
    //       hidden, never saved, Unique Key / Battery No not checked)
    // Chassis No and Engine No are always required.
    //===========================================================

    private async Task<bool>
        KeyBatteryOnAsync()
    {
        return Page.PageType == "MB"
            &&
            await IsSwitchOnAsync(Page.SwitchUnitsRequired, true);
    }


    //===========================================================
    // Unit Desk rows of one line : trimmed, capitals, empty rows
    // dropped; chassis and engine needed on every row given; not
    // more rows than bikes; no repeat inside the line
    //===========================================================

    private static List<PurchaseUnitDto>
        NormalizeUnits
        (
            List<PurchaseUnitDto>? rows,
            decimal bikes,
            string label,
            bool keyBattery
        )
    {
        List<PurchaseUnitDto> result =
            (rows ?? new List<PurchaseUnitDto>())
                .Select
                (
                    x =>
                        new PurchaseUnitDto
                        {
                            ChassisNo = Limit(x.ChassisNo, 50).ToUpperInvariant(),
                            EngineNo = Limit(x.EngineNo, 50).ToUpperInvariant(),
                            // Key & Battery Required OFF : not kept
                            KeyNo = keyBattery ? Limit(x.KeyNo, 50).ToUpperInvariant() : string.Empty,
                            BatteryNo = keyBattery ? Limit(x.BatteryNo, 50).ToUpperInvariant() : string.Empty,
                            // CKD documents : Yes / No (anything else = No)
                            CkdStatus = string.Equals((x.CkdStatus ?? string.Empty).Trim(), "Yes", StringComparison.OrdinalIgnoreCase) ? "Yes" : "No",
                            // Year of manufacture (null = the purchase's year)
                            ManufactureYear = CheckYear(x.ManufactureYear, label)
                        }
                )
                .Where
                (
                    x =>
                        x.ChassisNo.Length > 0
                        ||
                        x.EngineNo.Length > 0
                        ||
                        x.KeyNo.Length > 0
                        ||
                        x.BatteryNo.Length > 0
                )
                .ToList();

        if (result.Count > bikes)
        {
            throw new InvalidOperationException(
                $"{label} : {result.Count} bikes entered for {bikes:0} on the line.");
        }

        for (int i = 0; i < result.Count; i++)
        {
            if (result[i].ChassisNo.Length == 0 || result[i].EngineNo.Length == 0)
            {
                throw new InvalidOperationException(
                    $"{label}, bike {i + 1} : Chassis No and Engine No are required.");
            }
        }

        return result;
    }


    //===========================================================
    // Chassis / Engine (always) and Key / Battery (their switch)
    // unique among live bikes of other purchases and this one
    //===========================================================

    private async Task
        CheckUnitsUniqueAsync
        (
            List<PurchaseUnitDto> units,
            long currentPurchaseId
        )
    {
        bool uniqueKey =
            await KeyBatteryOnAsync() && await IsSwitchOnAsync(Page.SwitchUniqueKeyNo, false);

        bool uniqueBattery =
            await KeyBatteryOnAsync() && await IsSwitchOnAsync(Page.SwitchUniqueBatteryNo, false);

        void Repeats(Func<PurchaseUnitDto, string> pick, string name)
        {
            string? twice =
                units
                    .Select(pick)
                    .Where(x => x.Length > 0)
                    .GroupBy(x => x)
                    .Where(x => x.Count() > 1)
                    .Select(x => x.Key)
                    .FirstOrDefault();

            if (twice != null)
            {
                throw new InvalidOperationException(
                    $"{name} {twice} is entered on more than one bike.");
            }
        }

        Repeats(x => x.ChassisNo, "Chassis No");

        Repeats(x => x.EngineNo, "Engine No");

        if (uniqueKey)
        {
            Repeats(x => x.KeyNo, "Key No");
        }

        if (uniqueBattery)
        {
            Repeats(x => x.BatteryNo, "Battery No");
        }

        List<string> chassis = units.Select(x => x.ChassisNo).ToList();

        List<string> engines = units.Select(x => x.EngineNo).ToList();

        List<string> keys = uniqueKey ? units.Select(x => x.KeyNo).Where(x => x.Length > 0).ToList() : new List<string>();

        List<string> batteries = uniqueBattery ? units.Select(x => x.BatteryNo).Where(x => x.Length > 0).ToList() : new List<string>();

        var clash =
            await _context
                .Set<MotorBikeUnitsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.PurchaseId != currentPurchaseId
                        &&
                        (
                            chassis.Contains(x.ChassisNo.ToUpper())
                            ||
                            engines.Contains(x.EngineNo.ToUpper())
                            ||
                            keys.Contains(x.KeyNo.ToUpper())
                            ||
                            batteries.Contains(x.BatteryNo.ToUpper())
                        )
                )
                .Select(x => new { x.ChassisNo, x.EngineNo, x.KeyNo, x.BatteryNo, x.PurchaseNo })
                .FirstOrDefaultAsync();

        if (clash != null)
        {
            string what =
                chassis.Contains(clash.ChassisNo.ToUpper())
                    ? $"Chassis No {clash.ChassisNo}"
                    : engines.Contains(clash.EngineNo.ToUpper())
                        ? $"Engine No {clash.EngineNo}"
                        : keys.Contains(clash.KeyNo.ToUpper())
                            ? $"Key No {clash.KeyNo}"
                            : $"Battery No {clash.BatteryNo}";

            throw new InvalidOperationException(
                $"{what} is already on purchase {clash.PurchaseNo}.");
        }
    }


    // Optional yyyy-MM-dd ('' = none)
    private static DateOnly? OptionalDate
    (
        string? text,
        string label
    )
    {
        return string.IsNullOrWhiteSpace(text)
            ? null
            : ParseDate(text, label);
    }


    //===========================================================
    // Additional discount (spread by line value; the last line
    // takes the remainder), VAT, net unit cost
    //===========================================================

    private static void ApplyDiscountAndVat
    (
        PurchaseInput input
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

            line.NetUnitCost =
                UnitCost(CostBase(line), line.Quantity + line.FreeQuantity);
        }
    }


    // The cost part of a line before payable-only rounding :
    // without the VAT that can be claimed
    private static decimal CostBase
    (
        TLine line
    )
    {
        return line.VatClaimable
            ? line.Amount
            : line.LineTotal;
    }


    // The line's cost on the books (2 decimals) : cost base +
    // payable-only rounding share. Whole-taka lines carry the
    // rounding inside LineTotal / Amount already.
    private static decimal LineCost
    (
        TLine line,
        bool wholeTakaLines
    )
    {
        return CostBase(line) + (wholeTakaLines ? 0m : line.RoundingShare);
    }


    //===========================================================
    // Whole-taka rounding (switches)
    //   Payable only : the difference is shared by the lines by
    //   value (last line takes the remainder) and goes into each
    //   line's cost
    //   Whole-taka lines : largest remainder (as on the PO); VAT
    //   is taken out of the new payable
    //===========================================================

    private async Task
        ApplyRoundingAsync
        (
            PurchaseInput input
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
            decimal adjustment =
                rounded - exact;

            input.RoundingAdjustment =
                adjustment;

            decimal given = 0m;

            for (int i = 0; i < input.Lines.Count; i++)
            {
                TLine line =
                    input.Lines[i];

                decimal share =
                    i == input.Lines.Count - 1
                        ? adjustment - given
                        : exact != 0
                            ? Money(adjustment * line.LineTotal / exact)
                            : 0m;

                given += share;

                line.RoundingShare =
                    share;

                line.NetUnitCost =
                    UnitCost(CostBase(line) + share, line.Quantity + line.FreeQuantity);
            }

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
                UnitCost(CostBase(line), line.Quantity + line.FreeQuantity);
        }
    }


    //===========================================================
    // Apply
    //===========================================================

    private static void ApplyHeader
    (
        THeader entity,
        PurchaseInput input
    )
    {
        entity.PageType = input.Page.PageType;
        entity.PurchaseDate = input.PurchaseDate;
        entity.BranchId = input.Period.BranchId;
        entity.BranchCode = Limit(input.Period.BranchCode, 30);
        entity.BranchName = Limit(input.Period.BranchName, 150);
        entity.FinancialYearId = input.Period.FinancialYearId;
        entity.SupplierCode = input.Supplier.SupplierCode;
        entity.SupplierName = Limit(input.Supplier.DisplayName, 200);
        entity.PurchaseOrderId = input.PurchaseOrderId;
        entity.OrderNo = input.OrderNo;
        entity.SupplierInvoiceNo = input.SupplierInvoiceNo;
        entity.SupplierInvoiceDate = input.SupplierInvoiceDate;
        entity.MushakNo = input.MushakNo;
        entity.MushakDate = input.MushakDate;
        entity.DoReference = input.DoReference;
        entity.GatePassNo = input.GatePassNo;
        entity.WarehouseId = input.WarehouseId;
        entity.WarehouseName = input.WarehouseName;
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
        entity.TotalVatClaimable = input.Lines.Where(x => x.VatClaimable).Sum(x => x.VatAmount);
        entity.TotalPayable = input.Lines.Sum(x => x.LineTotal) + input.RoundingAdjustment;
    }


    //===========================================================
    // MB : free accessories received with the purchase
    // (Products Received on Purchase ON)
    //===========================================================

    // Draft : the dues of the bikes on the page
    public async Task<List<PurchaseAccessoryLineDto>>
        PreviewAccessoriesAsync
        (
            PurchaseAccessoryPreviewDto dto
        )
    {
        if (Page.PageType != "MB")
        {
            return new List<PurchaseAccessoryLineDto>();
        }

        DateOnly date =
            ParseDate(dto?.PurchaseDate, "Purchase Date");

        return await AccessoryDuesEngine.PreviewAsync(
            _context,
            date,
            (dto?.Lines ?? new List<PurchaseAccessoryPreviewLineDto>())
                .Select(x => (x.ProductId, x.Bikes)));
    }


    // Draft save : the quantities to take in on Post, checked
    // against the dues of the bikes (schemes on the purchase date)
    private async Task SaveAccessoryTakesAsync
    (
        THeader entity,
        PurchaseInput input,
        long userId,
        DateTime now
    )
    {
        if (entity.PageType != "MB")
        {
            return;
        }

        List<AccessoryTakesEntity> old =
            await _context
                .Set<AccessoryTakesEntity>()
                .Where(x => x.PurchaseId == entity.PurchaseId)
                .ToListAsync();

        _context.Set<AccessoryTakesEntity>().RemoveRange(old);

        if (input.Accessories.Count == 0)
        {
            return;
        }

        if (input.Accessories.GroupBy(x => new { x.BikeAccessorySchemeId, x.AccessoryId }).Any(g => g.Count() > 1))
        {
            throw new InvalidOperationException(
                "A free accessory is on the purchase twice.");
        }

        List<PurchaseAccessoryLineDto> dues =
            await AccessoryDuesEngine.PreviewAsync(
                _context,
                entity.PurchaseDate,
                input.Lines.Select(x => (x.ProductId, x.Quantity + x.FreeQuantity)));

        foreach (PurchaseAccessoryTakeDto take in input.Accessories)
        {
            PurchaseAccessoryLineDto due =
                dues.FirstOrDefault(x => x.BikeAccessorySchemeId == take.BikeAccessorySchemeId && x.AccessoryId == take.AccessoryId)
                ??
                throw new InvalidOperationException(
                    "A free accessory is no longer due on these bikes (the schemes of the purchase date). Open Accessories Due again.");

            if (take.Quantity != Math.Truncate(take.Quantity))
            {
                throw new InvalidOperationException(
                    $"{due.AccessoryName} : the quantity must be whole pieces.");
            }

            if (take.Quantity > due.QuantityDue)
            {
                throw new InvalidOperationException(
                    $"{due.AccessoryName} : only {due.QuantityDue:0.##} {due.Unit} is due on these bikes.");
            }

            _context.Set<AccessoryTakesEntity>().Add(
                new AccessoryTakesEntity
                {
                    PurchaseId = entity.PurchaseId,
                    BikeAccessorySchemeId = take.BikeAccessorySchemeId,
                    AccessoryId = take.AccessoryId,
                    Quantity = take.Quantity,
                    CreatedBy = userId,
                    CreatedDate = now
                });
        }
    }


    // View / edit : the dues with the quantity taken here
    private async Task<List<PurchaseAccessoryLineDto>>
        AccessoryLinesAsync
        (
            THeader row,
            List<PurchaseLineDto> lines
        )
    {
        List<AccessoryDuesEntity> dues =
            await _context
                .Set<AccessoryDuesEntity>()
                .AsNoTracking()
                .Where(x => x.PurchaseId == row.PurchaseId && x.Status != AccessoryDuesEngine.StatusCancelled)
                .OrderBy(x => x.SchemeCode)
                .ThenBy(x => x.AccessoryName)
                .ToListAsync();

        // Posted : the due rows, received here / elsewhere
        if (dues.Count > 0)
        {
            Dictionary<long, decimal> here =
                await _context
                    .Set<AccessoryReceiptsEntity>()
                    .AsNoTracking()
                    .Where
                    (
                        x =>
                            x.PurchaseId == row.PurchaseId
                            &&
                            x.ReceivedOn == AccessoryDuesEngine.ReceivedOnPurchase
                            &&
                            !x.IsCancelled
                    )
                    .GroupBy(x => x.PurchaseAccessoryDueId)
                    .Select(g => new { g.Key, Quantity = g.Sum(x => x.Quantity) })
                    .ToDictionaryAsync(x => x.Key, x => x.Quantity);

            return dues
                .Select
                (
                    x =>
                    {
                        decimal taken =
                            here.GetValueOrDefault(x.PurchaseAccessoryDueId);

                        return new PurchaseAccessoryLineDto
                        {
                            BikeAccessorySchemeId = x.BikeAccessorySchemeId,
                            SchemeCode = x.SchemeCode,
                            SchemeName = x.SchemeName,
                            SchemeKind = x.SchemeKind,
                            AccessoryId = x.AccessoryId,
                            ProductCode = x.ProductCode,
                            AccessoryName = x.AccessoryName,
                            Unit = x.Unit,
                            QuantityDue = x.QuantityDue,
                            ReceivedElsewhere = Math.Max(0m, x.QuantityReceived - taken) + x.QuantityClosed,
                            QuantityTaken = taken
                        };
                    }
                )
                .ToList();
        }

        // Draft / approved : worked out, with the saved quantities
        List<PurchaseAccessoryLineDto> preview =
            await AccessoryDuesEngine.PreviewAsync(
                _context,
                row.PurchaseDate,
                lines.Select(x => (x.ProductId, x.Quantity + x.FreeQuantity)));

        if (preview.Count == 0)
        {
            return preview;
        }

        List<AccessoryTakesEntity> takes =
            await _context
                .Set<AccessoryTakesEntity>()
                .AsNoTracking()
                .Where(x => x.PurchaseId == row.PurchaseId)
                .ToListAsync();

        foreach (PurchaseAccessoryLineDto line in preview)
        {
            AccessoryTakesEntity? take =
                takes.FirstOrDefault(x => x.BikeAccessorySchemeId == line.BikeAccessorySchemeId && x.AccessoryId == line.AccessoryId);

            line.QuantityTaken =
                Math.Min(take?.Quantity ?? 0m, line.QuantityDue);
        }

        return preview;
    }


    // Post (received on purchase) : the saved quantities taken in,
    // zero cost, on hand in the purchase's warehouse
    private async Task ReceiveAccessoryTakesAsync
    (
        THeader entity,
        long userId,
        DateTime now
    )
    {
        List<AccessoryTakesEntity> takes =
            await _context
                .Set<AccessoryTakesEntity>()
                .AsNoTracking()
                .Where(x => x.PurchaseId == entity.PurchaseId && x.Quantity > 0m)
                .ToListAsync();

        if (takes.Count == 0 || !entity.WarehouseId.HasValue)
        {
            return;
        }

        // The due rows just made
        await _context.SaveChangesAsync();

        List<AccessoryDuesEntity> dues =
            await _context
                .Set<AccessoryDuesEntity>()
                .AsNoTracking()
                .Where(x => x.PurchaseId == entity.PurchaseId && x.Status == AccessoryDuesEngine.StatusPending)
                .ToListAsync();

        List<CreateReceivingAccessoryDto> inputs =
            new();

        foreach (AccessoryTakesEntity take in takes)
        {
            AccessoryDuesEntity? due =
                dues.FirstOrDefault(x => x.BikeAccessorySchemeId == take.BikeAccessorySchemeId && x.AccessoryId == take.AccessoryId);

            if (due == null)
            {
                continue;
            }

            decimal quantity =
                Math.Min(take.Quantity, Math.Max(0m, due.QuantityDue - due.QuantityReceived - due.QuantityClosed));

            if (quantity > 0m)
            {
                inputs.Add(
                    new CreateReceivingAccessoryDto
                    {
                        PurchaseAccessoryDueId = due.PurchaseAccessoryDueId,
                        Quantity = quantity
                    });
            }
        }

        if (inputs.Count == 0)
        {
            return;
        }

        await AccessoryDuesEngine.ReceiveAsync(
            _context,
            entity.PurchaseId,
            entity.BranchId,
            entity.SupplierCode,
            entity.PurchaseId,
            entity.PurchaseNo,
            entity.PurchaseDate,
            entity.WarehouseId.Value,
            entity.WarehouseName,
            Page.Prefix,
            inputs,
            userId,
            now,
            AccessoryDuesEngine.ReceivedOnPurchase);
    }


    // Lines (and the Unit Desk bikes) replaced on every draft save
    private async Task ReplaceLinesAsync
    (
        THeader entity,
        PurchaseInput input,
        long userId,
        DateTime now
    )
    {
        List<TLine> oldLines =
            await _context
                .Set<TLine>()
                .Where(x => x.PurchaseId == entity.PurchaseId)
                .ToListAsync();

        // CKD documents of the bikes saved before (by chassis) : a
        // Yes kept on the desk keeps its checked date / by / remarks
        Dictionary<string, MotorBikeUnitsEntity> oldCkd =
            new(StringComparer.OrdinalIgnoreCase);

        if (entity.PageType == "MB")
        {
            List<MotorBikeUnitsEntity> oldUnits =
                await _context
                    .Set<MotorBikeUnitsEntity>()
                    .Where(x => x.PurchaseId == entity.PurchaseId)
                    .ToListAsync();

            foreach (MotorBikeUnitsEntity old in oldUnits.Where(x => !x.IsDeleted && x.CkdStatus == "Yes"))
            {
                oldCkd[old.ChassisNo] = old;
            }

            _context.Set<MotorBikeUnitsEntity>().RemoveRange(oldUnits);
        }

        _context.Set<TLine>().RemoveRange(oldLines);

        foreach (TLine line in input.Lines)
        {
            line.PurchaseId = entity.PurchaseId;
        }

        _context.Set<TLine>().AddRange(input.Lines);

        await _context.SaveChangesAsync();

        foreach (TLine line in input.Lines)
        {
            if (!input.Units.TryGetValue(line.LineNo, out List<PurchaseUnitDto>? units))
            {
                continue;
            }

            foreach (PurchaseUnitDto unit in units)
            {
                bool ckd = unit.CkdStatus == "Yes";

                oldCkd.TryGetValue(unit.ChassisNo, out MotorBikeUnitsEntity? before);

                _context.Set<MotorBikeUnitsEntity>().Add(
                    new MotorBikeUnitsEntity
                    {
                        CkdStatus = ckd ? "Yes" : "No",
                        CkdCheckedDate = ckd ? (before?.CkdCheckedDate ?? BusinessToday()) : null,
                        CkdCheckedBy = ckd ? (before?.CkdCheckedBy ?? userId) : null,
                        CkdCheckedByName = ckd ? (before?.CkdCheckedByName ?? string.Empty) : string.Empty,
                        CkdRemarks = ckd ? (before?.CkdRemarks ?? $"Purchase {entity.PurchaseNo} Unit Desk") : string.Empty,
                        ManufactureYear = unit.ManufactureYear ?? entity.PurchaseDate.Year,
                        ProductId = line.ProductId,
                        ProductCode = line.ProductCode,
                        ProductName = line.ProductName,
                        ChassisNo = unit.ChassisNo,
                        EngineNo = unit.EngineNo,
                        KeyNo = unit.KeyNo,
                        BatteryNo = unit.BatteryNo,
                        BranchId = entity.BranchId,
                        PurchaseId = entity.PurchaseId,
                        PurchaseLineId = line.PurchaseLineId,
                        PurchaseNo = entity.PurchaseNo,
                        SupplierCode = entity.SupplierCode,
                        UnitCost = line.NetUnitCost,
                        Status = UnitPending,
                        IsDeleted = false,
                        CreatedBy = userId,
                        CreatedDate = now
                    });
            }
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
                EntityName = $"{EntityName}{entity.PageType}",
                EntityId = entity.PurchaseId,
                ActivityType = activityType,
                ActivityTitle = $"Purchase {verb}",
                ActivityDescription =
                    $"Purchase {entity.PurchaseNo} ({entity.SupplierName}, {entity.TotalPayable:N2}) {verb.ToLowerInvariant()}.{(string.IsNullOrWhiteSpace(extra) ? string.Empty : " " + extra)}",
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = now
            });
    }


    //===========================================================
    // Load a live purchase for change (row locked FOR UPDATE
    // inside the caller's transaction)
    //===========================================================

    private async Task<THeader>
        LoadAsync
        (
            long id
        )
    {
        await _context.Database.ExecuteSqlRawAsync(
            "SELECT 1 FROM \"" + Page.TableName + "\" WHERE \"PurchaseId\" = {0} FOR UPDATE",
            id);

        THeader? entity =
            await _context
                .Set<THeader>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.PurchaseId == id
                        &&
                        !x.IsDeleted
                );

        return entity
            ??
            throw new KeyNotFoundException(
                "Purchase not found.");
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
                $"Purchase {entity.PurchaseNo} is {entity.Status}; only a {string.Join(" or ", statuses)} purchase can be {action}.");
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

    public async Task<PurchaseSavedDto>
        CreateAsync
        (
            CreatePurchaseDto dto,
            long userId
        )
    {
        PurchaseInput input =
            await NormalizeAsync(dto, null, 0);

        DateTime now =
            DateTime.UtcNow;

        THeader entity =
            new THeader
            {
                Status = StatusDraft,
                CancelReason = string.Empty,
                VoucherNo = string.Empty,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = now
            };

        ApplyHeader(entity, input);

        await InTransactionAsync(
            async () =>
            {
                VoucherNumberDto number =
                    await _numberService.NextAsync(
                        input.Page.Prefix,
                        input.Period.BranchId,
                        input.PurchaseDate);

                entity.PurchaseNo =
                    number.VoucherNo;

                _context.Set<THeader>().Add(entity);

                await _context.SaveChangesAsync();

                await ReplaceLinesAsync(
                    entity,
                    input,
                    userId,
                    now);

                await SaveAccessoryTakesAsync(entity, input, userId, now);

                AddHistory(entity, "Create", "Created", userId, now);

                await _context.SaveChangesAsync();
            });

        return new PurchaseSavedDto
        {
            PurchaseId = entity.PurchaseId,
            PublicId = entity.PublicId,
            PurchaseNo = entity.PurchaseNo
        };
    }


    //===========================================================
    // Update (Draft)
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdatePurchaseDto dto,
            long userId
        )
    {
        await InTransactionAsync(
            async () =>
            {
                THeader entity =
                    await LoadAsync(dto.PurchaseId);

                RequireStatus(entity, "edited", StatusDraft);

                PurchaseInput input =
                    await NormalizeAsync(dto, entity.PageType, entity.PurchaseId, entity.PurchaseDate);

                string expectedStart =
                    $"{input.Page.Prefix}-{input.Period.BranchDigits}-{input.Period.FinancialYearCode}-{input.Period.PeriodMonth:D2}-";

                if (!entity.PurchaseNo.StartsWith(expectedStart, StringComparison.Ordinal))
                {
                    VoucherNumberDto number =
                        await _numberService.NextAsync(
                            input.Page.Prefix,
                            input.Period.BranchId,
                            input.PurchaseDate);

                    entity.PurchaseNo =
                        number.VoucherNo;
                }

                ApplyHeader(entity, input);

                DateTime now =
                    DateTime.UtcNow;

                entity.ModifiedBy = userId;
                entity.ModifiedDate = now;

                await ReplaceLinesAsync(
                    entity,
                    input,
                    userId,
                    now);

                await SaveAccessoryTakesAsync(entity, input, userId, now);

                AddHistory(entity, "Update", "Updated", userId, now);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Delete (Draft only, soft; its bikes are removed)
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

                if (entity.PageType == "MB")
                {
                    List<MotorBikeUnitsEntity> units =
                        await _context
                            .Set<MotorBikeUnitsEntity>()
                            .Where(x => x.PurchaseId == id)
                            .ToListAsync();

                    _context.Set<MotorBikeUnitsEntity>().RemoveRange(units);
                }

                AddHistory(entity, "Delete", "Deleted", userId, now);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Restore (most recently deleted draft of the page; its bikes
    // must be entered again)
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            string pageType,
            long userId
        )
    {
        PurchasePage page =
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
    // Approve (Draft → Approved; Post On Approval : → Posted)
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

                await RequireBranchLineAsync(entity.BranchId);

                List<TLine> lines =
                    await LinesOfAsync(id);

                await EnsureReadyAsync(entity, lines);

                DateTime now =
                    DateTime.UtcNow;

                await BillOrderAsync(entity, lines, +1, userId, now);

                entity.Status = StatusApproved;
                entity.ApprovedBy = userId;
                entity.ApprovedDate = now;

                AddHistory(entity, "Approve", "Approved", userId, now);

                await _context.SaveChangesAsync();

                if (await IsSwitchOnAsync(Page.SwitchPostOnApproval, false))
                {
                    await PostCoreAsync(entity, lines, userId, now, "Posted (on approval)");
                }
            });
    }


    //===========================================================
    // Return to Draft (Approved → Draft, PO lines unbilled)
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

                List<TLine> lines =
                    await LinesOfAsync(id);

                DateTime now =
                    DateTime.UtcNow;

                await BillOrderAsync(entity, lines, -1, userId, now);

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
    // Post (Approved → Posted)
    //===========================================================

    public async Task
        PostAsync
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

                RequireStatus(entity, "posted", StatusApproved);

                List<TLine> lines =
                    await LinesOfAsync(id);

                await PostCoreAsync(entity, lines, userId, DateTime.UtcNow, "Posted");
            });
    }


    private async Task<List<TLine>>
        LinesOfAsync
        (
            long id
        )
    {
        return await _context
            .Set<TLine>()
            .Where(x => x.PurchaseId == id)
            .OrderBy(x => x.LineNo)
            .ToListAsync();
    }


    //===========================================================
    // Ready to approve : warehouse and bikes when the purchase
    // receives (switch read now, not when the draft was saved)
    //===========================================================

    private async Task
        EnsureReadyAsync
        (
            THeader entity,
            List<TLine> lines
        )
    {
        if (lines.Count == 0)
        {
            throw new InvalidOperationException(
                $"Purchase {entity.PurchaseNo} has no lines.");
        }

        bool received =
            await IsSwitchOnAsync(Page.SwitchReceivedOnPurchase, false);

        if (!received)
        {
            return;
        }

        if (!entity.WarehouseId.HasValue)
        {
            throw new InvalidOperationException(
                "Warehouse is required (System Configuration › Products Received on Purchase is ON). Edit the draft and pick it.");
        }

        if (entity.PageType != "MB")
        {
            return;
        }

        // Chassis and Engine of every bike : always (the bike's
        // identity). Key and Battery : Key & Battery Required.
        bool keyBattery =
            await KeyBatteryOnAsync();

        List<MotorBikeUnitsEntity> units =
            await _context
                .Set<MotorBikeUnitsEntity>()
                .AsNoTracking()
                .Where(x => x.PurchaseId == entity.PurchaseId && !x.IsDeleted)
                .ToListAsync();

        foreach (TLine line in lines)
        {
            List<MotorBikeUnitsEntity> mine =
                units
                    .Where(x => x.PurchaseLineId == line.PurchaseLineId)
                    .ToList();

            decimal bikes =
                line.Quantity + line.FreeQuantity;

            if (mine.Count != bikes)
            {
                throw new InvalidOperationException(
                    $"Line {line.LineNo} ({line.ProductName}) : {mine.Count} of {bikes:0} bikes entered on the Unit Desk. Every bike needs its Chassis No and Engine No.");
            }

            if (keyBattery && mine.Any(x => x.KeyNo.Length == 0 || x.BatteryNo.Length == 0))
            {
                throw new InvalidOperationException(
                    $"Line {line.LineNo} ({line.ProductName}) : every bike needs Chassis, Engine, Key and Battery No (System Configuration › Key & Battery Required is ON).");
            }
        }
    }


    //===========================================================
    // Bill / unbill the Purchase Order lines (sign +1 / -1)
    //   +1 : billed += qty + free (never more than ordered); all
    //        billed → Completed; otherwise Carry Balance OFF →
    //        Closed Short (the rest will not come)
    //   -1 : billed -= …; an order this purchase completed / closed
    //        opens again (Placed, or Approved if never placed)
    //===========================================================

    private async Task
        BillOrderAsync
        (
            THeader entity,
            List<TLine> lines,
            int sign,
            long userId,
            DateTime now
        )
    {
        if (!entity.PurchaseOrderId.HasValue)
        {
            return;
        }

        await _context.Database.ExecuteSqlRawAsync(
            "SELECT 1 FROM \"" + Page.OrderTableName + "\" WHERE \"PurchaseOrderId\" = {0} FOR UPDATE",
            entity.PurchaseOrderId.Value);

        TPoHeader order =
            await _context
                .Set<TPoHeader>()
                .FirstOrDefaultAsync(x => x.PurchaseOrderId == entity.PurchaseOrderId.Value)
            ??
            throw new InvalidOperationException(
                $"Purchase Order {entity.OrderNo} was not found.");

        if (sign > 0)
        {
            if (order.IsDeleted || (order.Status != PoApproved && order.Status != PoPlaced))
            {
                throw new InvalidOperationException(
                    $"Purchase Order {order.OrderNo} is {(order.IsDeleted ? "deleted" : order.Status)}; it can no longer be billed.");
            }
        }

        List<TPoLine> orderLines =
            await _context
                .Set<TPoLine>()
                .Where(x => x.PurchaseOrderId == order.PurchaseOrderId)
                .ToListAsync();

        foreach (TLine line in lines)
        {
            if (!line.PurchaseOrderLineId.HasValue)
            {
                continue;
            }

            TPoLine poLine =
                orderLines.FirstOrDefault(x => x.PurchaseOrderLineId == line.PurchaseOrderLineId.Value)
                ??
                throw new InvalidOperationException(
                    $"Line {line.LineNo} : its Purchase Order line is gone from {order.OrderNo}.");

            decimal units =
                line.Quantity + line.FreeQuantity;

            poLine.BilledQuantity =
                Math.Max(0m, poLine.BilledQuantity + sign * units);

            if (sign > 0 && poLine.BilledQuantity > poLine.Quantity + poLine.FreeQuantity)
            {
                decimal left =
                    Math.Max(0m, poLine.Quantity + poLine.FreeQuantity - (poLine.BilledQuantity - units));

                throw new InvalidOperationException(
                    $"Line {line.LineNo} : '{line.ProductName}' has only {left:0.##} left on {order.OrderNo} (another purchase billed it). Edit the draft.");
            }
        }

        if (sign > 0)
        {
            bool complete =
                orderLines.All(x => x.BilledQuantity >= x.Quantity + x.FreeQuantity);

            if (complete)
            {
                order.Status = PoCompleted;
                order.ClosedBy = userId;
                order.ClosedDate = now;
            }
            else if (!await IsSwitchOnAsync(Page.SwitchCarryBalance, true))
            {
                order.Status = PoClosedShort;
                order.CloseReason = NotCarriedReason + entity.PurchaseNo;
                order.ClosedBy = userId;
                order.ClosedDate = now;
            }
        }
        else
        {
            bool closedByThis =
                order.Status == PoCompleted
                ||
                (order.Status == PoClosedShort && (order.CloseReason ?? string.Empty).StartsWith(NotCarriedReason, StringComparison.Ordinal));

            if (closedByThis && !order.IsDeleted)
            {
                order.Status = order.PlacedDate.HasValue ? PoPlaced : PoApproved;
                order.CloseReason = string.Empty;
                order.ClosedBy = null;
                order.ClosedDate = null;
            }
        }

        order.ModifiedBy = userId;
        order.ModifiedDate = now;
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
    // Purchase date window (Back Dated / Post Dated switches)
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
                    "Back dated entry is not allowed : the purchase date cannot be before today.");
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
                    "Post dated entry is not allowed : the purchase date cannot be after today.");
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
    // Post : journal, stock batches + movements, VAT register,
    // bikes in stock. Runs inside the caller's transaction.
    //===========================================================

    private async Task
        PostCoreAsync
        (
            THeader entity,
            List<TLine> lines,
            long userId,
            DateTime now,
            string verb
        )
    {
        await RequireBranchLineAsync(entity.BranchId);

        //=======================================================
        // Ledgers : supplier payable, item inventory, VAT
        //=======================================================

        SupplierProfilesEntity supplier =
            await _context
                .Set<SupplierProfilesEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.SupplierCode == entity.SupplierCode)
            ??
            throw new InvalidOperationException(
                $"Supplier {entity.SupplierCode} was not found.");

        string payableLedger =
            (supplier.PayableLedgerCode ?? string.Empty).Trim();

        if (payableLedger.Length == 0)
        {
            throw new InvalidOperationException(
                $"Supplier '{supplier.DisplayName}' has no payable ledger (Supplier Profiles).");
        }

        Dictionary<long, string> inventoryLedgers =
            await InventoryLedgersAsync(
                lines.Select(x => x.ProductId).Distinct().ToList());

        bool received =
            await IsSwitchOnAsync(Page.SwitchReceivedOnPurchase, false);

        if (received && !entity.WarehouseId.HasValue)
        {
            throw new InvalidOperationException(
                "Warehouse is required (System Configuration › Products Received on Purchase is ON). Return the purchase to draft and pick it.");
        }

        string reference =
            entity.SupplierInvoiceNo.Length > 0
                ? entity.SupplierInvoiceNo
                : entity.MushakNo;

        // Narration : the system text, then the one typed on the
        // purchase after " | " (no voucher no : it has its own
        // column on every statement)
        string narration =
            Limit(
                WithTyped(
                    $"Purchase from {entity.SupplierName}"
                    + (entity.MushakNo.Length > 0 ? $", Mushak 6.3 {entity.MushakNo}" : string.Empty)
                    + (entity.SupplierInvoiceNo.Length > 0 ? $", invoice {entity.SupplierInvoiceNo}" : string.Empty),
                    entity.Narration),
                500);

        List<VoucherPostingLine> journal =
            new();

        Dictionary<string, decimal> vatByLedger =
            new(StringComparer.OrdinalIgnoreCase);

        Dictionary<int, string> vatLedgerOfLine =
            new();

        foreach (TLine line in lines)
        {
            if (!inventoryLedgers.TryGetValue(line.ProductId, out string? inventory) || string.IsNullOrWhiteSpace(inventory))
            {
                throw new InvalidOperationException(
                    $"Line {line.LineNo} : '{line.ProductName}' has no inventory ledger.");
            }

            decimal cost =
                LineCost(line, entity.WholeTakaLines);

            if (cost < 0)
            {
                throw new InvalidOperationException(
                    $"Line {line.LineNo} : the cost cannot be below zero.");
            }

            if (cost > 0)
            {
                journal.Add(
                    new VoucherPostingLine
                    {
                        GroupNo = 1,
                        LedgerCode = inventory,
                        Debit = cost,
                        Credit = 0m,
                        // Short note : the quantity (the product is the
                        // ledger itself), then the line's typed note
                        Narration = Limit(
                            WithTyped(
                                $"{line.Quantity + line.FreeQuantity:0.##} {line.Unit}",
                                line.ShortNotes),
                            500)
                    });
            }

            if (entity.VatCharged && line.VatAmount != 0)
            {
                string vatLedger =
                    PostingLedgerCodes.Get(
                        _context,
                        PostingPurposes.VatForVatType(line.ProductType));

                vatLedgerOfLine[line.LineNo] =
                    vatLedger;

                if (line.VatClaimable)
                {
                    vatByLedger[vatLedger] =
                        vatByLedger.GetValueOrDefault(vatLedger) + line.VatAmount;
                }
            }
        }

        foreach (KeyValuePair<string, decimal> vat in vatByLedger)
        {
            if (vat.Value > 0)
            {
                journal.Add(
                    new VoucherPostingLine
                    {
                        GroupNo = 1,
                        LedgerCode = vat.Key,
                        Debit = vat.Value,
                        Credit = 0m,
                        Narration = "Input VAT"
                    });
            }
        }

        decimal debit =
            journal.Sum(x => x.Debit);

        if (debit != entity.TotalPayable)
        {
            throw new InvalidOperationException(
                $"Purchase {entity.PurchaseNo} does not balance (lines {debit:N2}, payable {entity.TotalPayable:N2}). Return it to draft and save it again.");
        }

        journal.Add(
            new VoucherPostingLine
            {
                GroupNo = 1,
                LedgerCode = payableLedger,
                Debit = 0m,
                Credit = entity.TotalPayable,
                Narration = narration,
                PartyType = "Supplier",
                PartyCode = entity.SupplierCode
            });

        await _postingService.PostAsync(
            new VoucherPostingRequest
            {
                VoucherType = Page.Prefix,
                VoucherId = entity.PurchaseId,
                VoucherNo = entity.PurchaseNo,
                VoucherDate = entity.PurchaseDate,
                BranchId = entity.BranchId,
                PartyType = "Supplier",
                PartyCode = entity.SupplierCode,
                ReferenceNo = Limit(reference, 100),
                Narration = narration,
                Lines = journal
            },
            userId);

        //=======================================================
        // Stock : one batch per line (exact cost)
        //=======================================================

        string bucket =
            received
                ? BatchOnHand
                : BatchInTransit;

        List<(TLine Line, StockBatchesEntity Batch)> batches =
            new();

        foreach (TLine line in lines)
        {
            decimal units =
                line.Quantity + line.FreeQuantity;

            decimal cost =
                LineCost(line, entity.WholeTakaLines);

            StockBatchesEntity batch =
                new()
                {
                    BatchNo = Limit($"{entity.PurchaseNo}-{line.LineNo:D3}", 40),
                    ProductType = Page.PageType,
                    ProductId = line.ProductId,
                    ProductCode = line.ProductCode,
                    ProductName = Limit(line.ProductName, 250),
                    InventoryLedgerCode = inventoryLedgers[line.ProductId],
                    SourceType = SourcePurchase,
                    SourceId = entity.PurchaseId,
                    SourceLineId = line.PurchaseLineId,
                    SourceNo = entity.PurchaseNo,
                    SourceDate = entity.PurchaseDate,
                    SupplierCode = entity.SupplierCode,
                    BranchId = entity.BranchId,
                    Quantity = units,
                    UnitCost = UnitCost(cost, units),
                    TotalValue = cost,
                    QuantityInTransit = received ? 0m : units,
                    QuantityOnHand = received ? units : 0m,
                    QuantityOut = 0m,
                    RemainingValue = cost,
                    // MRP is the sale price of the batch
                    Mrp = line.Mrp,
                    // VAT paid at source (base VAT), per unit
                    SourceVatRate = entity.VatCharged ? line.VatRate : 0m,
                    SourceVatPerUnit =
                        entity.VatCharged && units > 0m
                            ? Math.Round(line.VatAmount / units, 4, MidpointRounding.AwayFromZero)
                            : 0m,
                    Status = bucket,
                    CreatedBy = userId,
                    CreatedDate = now
                };

            _context.Set<StockBatchesEntity>().Add(batch);

            batches.Add((line, batch));

            // MRP invoice : the product's declared MRP (price index)
            AppCore.Infrastructure.Platform.Inventory.ProductPriceIndexWriter.Add(
                _context,
                Page.PageType,
                line.ProductId,
                line.ProductCode,
                line.ProductName,
                line.Mrp,
                entity.PurchaseDate,
                AppCore.Infrastructure.Platform.Inventory.ProductPriceIndexWriter.SourcePurchase,
                entity.PurchaseId,
                entity.PurchaseNo,
                userId,
                now);
        }

        await _context.SaveChangesAsync();

        foreach ((TLine line, StockBatchesEntity batch) in batches)
        {
            _context.Set<StockMovementsEntity>().Add(
                new StockMovementsEntity
                {
                    StockBatchId = batch.StockBatchId,
                    ProductType = batch.ProductType,
                    ProductId = batch.ProductId,
                    BranchId = entity.BranchId,
                    WarehouseId = received ? entity.WarehouseId : null,
                    Bucket = bucket,
                    MovementType = MovePurchase,
                    QuantityIn = batch.Quantity,
                    QuantityOut = 0m,
                    UnitCost = batch.UnitCost,
                    Value = batch.TotalValue,
                    DocumentType = Page.Prefix,
                    DocumentId = entity.PurchaseId,
                    DocumentLineId = line.PurchaseLineId,
                    DocumentNo = entity.PurchaseNo,
                    DocumentDate = entity.PurchaseDate,
                    IsReversal = false,
                    Narration = Limit(narration, 300),
                    CreatedBy = userId,
                    CreatedDate = now
                });

            //===================================================
            // VAT register (VAT charged lines)
            //===================================================

            if (entity.VatCharged && line.VatAmount != 0)
            {
                _context.Set<VatRegisterEntity>().Add(
                    new VatRegisterEntity
                    {
                        Direction = "Purchase",
                        DocumentType = Page.Prefix,
                        DocumentId = entity.PurchaseId,
                        DocumentLineId = line.PurchaseLineId,
                        DocumentNo = entity.PurchaseNo,
                        DocumentDate = entity.PurchaseDate,
                        MushakNo = entity.MushakNo,
                        MushakDate = entity.MushakDate,
                        PartyType = "Supplier",
                        PartyCode = entity.SupplierCode,
                        PartyName = Limit(entity.SupplierName, 200),
                        PartyBin = Limit(supplier.BinNo, 30),
                        BranchId = entity.BranchId,
                        ProductType = Page.PageType,
                        ProductId = line.ProductId,
                        ProductCode = line.ProductCode,
                        ProductName = Limit(line.ProductName, 250),
                        Quantity = line.Quantity + line.FreeQuantity,
                        TaxableValue = line.Amount,
                        VatRate = line.VatRate,
                        VatAmount = line.VatAmount,
                        VatClaimable = line.VatClaimable ? line.VatAmount : 0m,
                        VatLedgerCode = vatLedgerOfLine.GetValueOrDefault(line.LineNo, string.Empty),
                        IsReversal = false,
                        CreatedBy = userId,
                        CreatedDate = now
                    });
            }
        }

        //=======================================================
        // Bikes : in stock at their exact cost (received here)
        //=======================================================

        if (received && entity.PageType == "MB")
        {
            List<MotorBikeUnitsEntity> units =
                await _context
                    .Set<MotorBikeUnitsEntity>()
                    .Where(x => x.PurchaseId == entity.PurchaseId && !x.IsDeleted)
                    .ToListAsync();

            foreach (MotorBikeUnitsEntity unit in units)
            {
                StockBatchesEntity? batch =
                    batches
                        .Where(x => x.Line.PurchaseLineId == unit.PurchaseLineId)
                        .Select(x => x.Batch)
                        .FirstOrDefault();

                unit.Status = UnitInStock;
                unit.UnitCost = batch?.UnitCost ?? unit.UnitCost;
                unit.StockInDate = entity.PurchaseDate;
                unit.BranchId = entity.BranchId;
                unit.WarehouseId = entity.WarehouseId;
                unit.ModifiedBy = userId;
                unit.ModifiedDate = now;
            }
        }

        //=======================================================
        // MB : free accessories due from the supplier (Bike
        // Accessory Schemes valid on the purchase date)
        //=======================================================

        if (entity.PageType == "MB")
        {
            await AppCore.Infrastructure.Repositories.Procurement.MotorBikePurchase.PurchaseAccessoryDuesEngine.CreateForPurchaseAsync(
                _context,
                entity,
                lines,
                userId,
                now);

            // Received on purchase : the free accessories entered
            // on the purchase come in with the bikes
            if (received)
            {
                await ReceiveAccessoryTakesAsync(entity, userId, now);
            }
        }

        entity.Status = StatusPosted;
        entity.PostedBy = userId;
        entity.PostedDate = now;
        entity.VoucherNo = entity.PurchaseNo;
        entity.StockedIn = received;
        entity.StockedInDate = received ? now : null;

        AddHistory(entity, "Post", verb, userId, now, received ? $"Received into {entity.WarehouseName}." : "In transit until Product Receiving.");

        await _context.SaveChangesAsync();
    }


    // Inventory ledger of each product of the page, by id
    private async Task<Dictionary<long, string>>
        InventoryLedgersAsync
        (
            List<long> ids
        )
    {
        if (Page.PageType == "MB")
        {
            return await _context
                .Set<MotorBikesEntity>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.MotorBikeId))
                .ToDictionaryAsync(x => x.MotorBikeId, x => x.InventoryLedgerCode);
        }

        if (Page.PageType == "SP")
        {
            return await _context
                .Set<SparePartsEntity>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.SparePartId))
                .ToDictionaryAsync(x => x.SparePartId, x => x.InventoryLedgerCode);
        }

        return await _context
            .Set<AccessoriesEntity>()
            .AsNoTracking()
            .Where(x => ids.Contains(x.AccessoryId))
            .ToDictionaryAsync(x => x.AccessoryId, x => x.InventoryLedgerCode);
    }


    //===========================================================
    // Cancel (Approved / Posted → Cancelled, reason)
    //   Posted : only while nothing has left its batches, been
    //   received or returned. Reversing journal dated today,
    //   batches cancelled, VAT register reversed, bikes removed.
    //   Payments are not linked to invoices, so the supplier's
    //   payable ledger must still hold at least this purchase
    //   (credit balance ≥ Total Payable); otherwise payments /
    //   adjustments already used it and they come first.
    //===========================================================

    public async Task
        CancelAsync
        (
            long id,
            CancelPurchaseDto dto,
            long userId
        )
    {
        string reason =
            Limit(dto?.Reason, 500);

        if (reason.Length == 0)
        {
            throw new InvalidOperationException(
                "A reason is required to cancel the purchase.");
        }

        await InTransactionAsync(
            async () =>
            {
                THeader entity =
                    await LoadAsync(id);

                RequireStatus(entity, "cancelled", StatusApproved, StatusPosted);

                List<TLine> lines =
                    await LinesOfAsync(id);

                if (lines.Any(x => x.ReturnedQuantity > 0))
                {
                    throw new InvalidOperationException(
                        $"Purchase {entity.PurchaseNo} has returns; it cannot be cancelled.");
                }

                DateTime now =
                    DateTime.UtcNow;

                if (entity.Status == StatusPosted)
                {
                    List<StockBatchesEntity> batches =
                        await _context
                            .Set<StockBatchesEntity>()
                            .Where
                            (
                                x =>
                                    x.SourceType == SourcePurchase
                                    &&
                                    x.ProductType == Page.PageType
                                    &&
                                    x.SourceId == entity.PurchaseId
                            )
                            .ToListAsync();

                    List<long> batchIds =
                        batches
                            .Select(x => x.StockBatchId)
                            .ToList();

                    // Product Receiving moves stock In Transit → On
                    // Hand (and back on its cancel); anything else
                    // means the stock was used
                    bool moved =
                        batches.Any(x => x.QuantityOut > 0)
                        ||
                        await _context
                            .Set<StockMovementsEntity>()
                            .AnyAsync
                            (
                                x =>
                                    batchIds.Contains(x.StockBatchId)
                                    &&
                                    x.MovementType != MovePurchase
                                    &&
                                    x.MovementType != MoveReceive
                                    &&
                                    x.MovementType != MoveReceiveCancel
                            );

                    if (moved)
                    {
                        throw new InvalidOperationException(
                            $"Purchase {entity.PurchaseNo} has stock already moved or sold; it cannot be cancelled.");
                    }

                    // Received (and not cancelled) : cancel the
                    // receiving first
                    decimal received =
                        await _context
                            .Set<StockMovementsEntity>()
                            .Where
                            (
                                x =>
                                    batchIds.Contains(x.StockBatchId)
                                    &&
                                    x.Bucket == BatchOnHand
                                    &&
                                    (x.MovementType == MoveReceive || x.MovementType == MoveReceiveCancel)
                            )
                            .SumAsync(x => (decimal?)(x.QuantityIn - x.QuantityOut))
                        ??
                        0m;

                    if (received != 0)
                    {
                        throw new InvalidOperationException(
                            $"Purchase {entity.PurchaseNo} has been received into stock; cancel its Product Receiving first.");
                    }

                    await RequirePayableCoversAsync(entity);

                    await _postingService.ReverseAsync(
                        entity.VoucherNo.Length > 0 ? entity.VoucherNo : entity.PurchaseNo,
                        BusinessToday(),
                        reason,
                        userId);

                    // Its price index entries are cancelled too
                    await AppCore.Infrastructure.Platform.Inventory.ProductPriceIndexWriter.CancelAsync(
                        _context,
                        AppCore.Infrastructure.Platform.Inventory.ProductPriceIndexWriter.SourcePurchase,
                        Page.PageType,
                        entity.PurchaseId,
                        now);

                    foreach (StockBatchesEntity batch in batches)
                    {
                        string bucket =
                            batch.QuantityOnHand > 0
                                ? BatchOnHand
                                : BatchInTransit;

                        decimal left =
                            batch.QuantityOnHand + batch.QuantityInTransit;

                        if (left > 0)
                        {
                            _context.Set<StockMovementsEntity>().Add(
                                new StockMovementsEntity
                                {
                                    StockBatchId = batch.StockBatchId,
                                    ProductType = batch.ProductType,
                                    ProductId = batch.ProductId,
                                    BranchId = batch.BranchId,
                                    WarehouseId = bucket == BatchOnHand ? entity.WarehouseId : null,
                                    Bucket = bucket,
                                    MovementType = MoveCancel,
                                    QuantityIn = 0m,
                                    QuantityOut = left,
                                    UnitCost = batch.UnitCost,
                                    Value = batch.RemainingValue,
                                    DocumentType = Page.Prefix,
                                    DocumentId = entity.PurchaseId,
                                    DocumentLineId = batch.SourceLineId,
                                    DocumentNo = entity.PurchaseNo,
                                    DocumentDate = BusinessToday(),
                                    IsReversal = true,
                                    Narration = Limit($"Cancelled : {reason}", 300),
                                    CreatedBy = userId,
                                    CreatedDate = now
                                });
                        }

                        batch.QuantityInTransit = 0m;
                        batch.QuantityOnHand = 0m;
                        batch.RemainingValue = 0m;
                        batch.Status = BatchCancelled;
                        batch.ModifiedBy = userId;
                        batch.ModifiedDate = now;
                    }

                    List<VatRegisterEntity> vatRows =
                        await _context
                            .Set<VatRegisterEntity>()
                            .AsNoTracking()
                            .Where
                            (
                                x =>
                                    x.DocumentType == Page.Prefix
                                    &&
                                    x.DocumentId == entity.PurchaseId
                                    &&
                                    !x.IsReversal
                            )
                            .ToListAsync();

                    foreach (VatRegisterEntity row in vatRows)
                    {
                        row.VatRegisterId = 0;
                        row.DocumentDate = BusinessToday();
                        row.IsReversal = true;
                        row.CreatedBy = userId;
                        row.CreatedDate = now;

                        _context.Set<VatRegisterEntity>().Add(row);
                    }
                }

                if (entity.PageType == "MB")
                {
                    // Free accessories received with the purchase :
                    // back out while all of them are still on hand
                    if (entity.WarehouseId.HasValue)
                    {
                        await AccessoryDuesEngine.CancelReceivingAsync(
                            _context,
                            entity.PurchaseId,
                            entity.PurchaseNo,
                            BusinessToday(),
                            entity.BranchId,
                            entity.WarehouseId.Value,
                            entity.WarehouseName,
                            Page.Prefix,
                            reason,
                            userId,
                            now,
                            AccessoryDuesEngine.ReceivedOnPurchase);
                    }

                    // Free accessories due : cancelled with it
                    // (refused when some were received elsewhere)
                    await AppCore.Infrastructure.Repositories.Procurement.MotorBikePurchase.PurchaseAccessoryDuesEngine.CancelForPurchaseAsync(
                        _context,
                        entity.PurchaseId,
                        entity.PurchaseNo,
                        userId,
                        now);

                    List<MotorBikeUnitsEntity> units =
                        await _context
                            .Set<MotorBikeUnitsEntity>()
                            .Where(x => x.PurchaseId == entity.PurchaseId && !x.IsDeleted)
                            .ToListAsync();

                    foreach (MotorBikeUnitsEntity unit in units)
                    {
                        unit.IsDeleted = true;
                        unit.DeletedBy = userId;
                        unit.DeletedDate = now;
                    }
                }

                await BillOrderAsync(entity, lines, -1, userId, now);

                entity.Status = StatusCancelled;
                entity.CancelReason = reason;
                entity.CancelledBy = userId;
                entity.CancelledDate = now;

                AddHistory(entity, "Cancel", "Cancelled", userId, now, $"Reason : {reason}");

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Cancel guard : the supplier's payable ledger (the one this
    // purchase was posted to) must still have a credit balance
    // of at least the purchase's Total Payable. Less means
    // payments / debit adjustments have used it : reverse or
    // adjust them before cancelling.
    //===========================================================

    private async Task
        RequirePayableCoversAsync
        (
            THeader entity
        )
    {
        string? ledger =
            await _context
                .Set<VoucherEntries>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.VoucherType == Page.Prefix
                        &&
                        x.VoucherId == entity.PurchaseId
                        &&
                        !x.IsReversal
                        &&
                        x.PartyType == "Supplier"
                        &&
                        x.Credit > 0
                )
                .Select(x => x.LedgerCode)
                .FirstOrDefaultAsync();

        if (string.IsNullOrWhiteSpace(ledger))
        {
            // Nothing posted to a supplier ledger : nothing to guard
            return;
        }

        decimal credit =
            await _context
                .Set<VoucherEntries>()
                .AsNoTracking()
                .Where(x => x.LedgerCode == ledger)
                .SumAsync(x => (decimal?)(x.Credit - x.Debit))
            ??
            0m;

        if (credit < entity.TotalPayable)
        {
            string balance =
                credit >= 0
                    ? $"{credit:N2} Cr"
                    : $"{-credit:N2} Dr";

            throw new InvalidOperationException(
                $"Purchase {entity.PurchaseNo} cannot be cancelled : {entity.SupplierName}'s payable balance is {balance}, less than this purchase ({entity.TotalPayable:N2}). Payments or adjustments to the supplier have used it; reverse or adjust them first.");
        }
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
                    x.PurchaseId == id
                    &&
                    !x.IsDeleted
            );
    }


    //===========================================================
    // List page (server paging) : supplier, search, tab, sort
    // and page on the server. Counts : All and one per status
    // (supplier and search applied).
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

    public async Task<AppCore.Application.Common.Paging.PagedResult<PurchaseDto>>
        GetPagedAsync
        (
            string pageType,
            PurchasePageRequest request
        )
    {
        string type =
            PageOf(pageType).PageType;

        IQueryable<THeader> query =
            _context
                .Set<THeader>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.PageType == type);

        string supplier =
            (request.Supplier ?? string.Empty).Trim();

        if (supplier != string.Empty)
        {
            query = query.Where(x => x.SupplierCode == supplier);
        }

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

            query =
                query.Where
                (
                    x =>
                        (isDate && (x.PurchaseDate == day || x.SupplierInvoiceDate == day || x.MushakDate == day)) ||
                        EF.Functions.ILike(x.PurchaseNo, like) ||
                        EF.Functions.ILike(x.OrderNo, like) ||
                        EF.Functions.ILike(x.SupplierName, like) ||
                        EF.Functions.ILike(x.SupplierCode, like) ||
                        EF.Functions.ILike(x.SupplierInvoiceNo, like) ||
                        EF.Functions.ILike(x.MushakNo, like) ||
                        EF.Functions.ILike(x.DoReference, like) ||
                        EF.Functions.ILike(x.GatePassNo, like) ||
                        EF.Functions.ILike(x.VoucherNo, like) ||
                        EF.Functions.ILike(x.InvoicePriceBasis, like) ||
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

        AppCore.Infrastructure.Persistence.Paging.PagingQuery.FitPage(
            request,
            total);

        AppCore.Infrastructure.Persistence.Paging.SortMap<THeader> sorts =
            new AppCore.Infrastructure.Persistence.Paging.SortMap<THeader>("PurchaseNo")
                .Add("PurchaseNo", x => x.PurchaseNo)
                .Add("PurchaseDateText", x => x.PurchaseDate)
                .Add("SupplierName", x => x.SupplierName)
                .Add("InvoiceText", x => x.InvoicePriceBasis)
                .Add("DocumentText", x => x.SupplierInvoiceNo)
                .Add("OrderNo", x => x.OrderNo)
                .Add("TotalQuantityText", x => x.TotalQuantity)
                .Add("TotalPayableText", x => x.TotalPayable)
                .Add("Status", x => x.Status)
                .Tie(x => x.PurchaseId);

        IQueryable<THeader> ordered =
            string.IsNullOrWhiteSpace(request.Sort)
                ? query
                    .OrderByDescending(x => x.PurchaseDate)
                    .ThenByDescending(x => x.PurchaseNo)
                : sorts.Apply(query, request);

        List<THeader> rows =
            await AppCore.Infrastructure.Persistence.Paging.PagingQuery
                .Page(ordered, request)
                .ToListAsync();

        Dictionary<string, int> counts =
            new()
            {
                ["All"] = statusCounts.Sum(x => x.Count)
            };

        foreach (var row in statusCounts)
        {
            counts[row.Key] = row.Count;
        }

        return new AppCore.Application.Common.Paging.PagedResult<PurchaseDto>
        {
            Items = rows.Select(ToDto).ToList(),
            TotalCount = total,
            Page = request.SafePage,
            PageSize = request.SafePageSize,
            Counts = counts
        };
    }


    //===========================================================
    // Supplier filter options : the suppliers on this page's
    // live documents
    //===========================================================

    public async Task<List<PurchaseListSupplierDto>>
        GetListSuppliersAsync
        (
            string pageType
        )
    {
        string type =
            PageOf(pageType).PageType;

        return await _context
            .Set<THeader>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.PageType == type && x.SupplierCode != "")
            .GroupBy(x => x.SupplierCode)
            .Select
            (
                g =>
                    new PurchaseListSupplierDto
                    {
                        SupplierCode = g.Key,
                        SupplierName = g.Max(x => x.SupplierName) ?? g.Key
                    }
            )
            .OrderBy(x => x.SupplierName)
            .ToListAsync();
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
            .Select(x => (long?)x.PurchaseId)
            .FirstOrDefaultAsync();
    }
}
