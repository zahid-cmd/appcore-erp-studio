//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Platform.Accounting;
using AppCore.Application.Procurement.MotorBikePurchase;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.Procurement.MotorBikePurchase;
using AppCore.Domain.Platform.Accounting;
using AppCore.Infrastructure.CodeMaster;
using AppCore.Infrastructure.Persistence;

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

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Procurement.MotorBikePurchase;


//===============================================================
// Purchase Orders Repository (one backend for the three pages)
//
// Page MB : Motor Bikes             · number POMB · suppliers of
//           Supply Type Motor Bikes or General
// Page SP : Spare Parts & Lubricants · number POSP · Spare Parts
//           or General
// Page AC : Accessories             · number POAC · Accessories
//           or General
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
// Lines : one product per line, active and of the page's type;
// Quantity > 0 ; Unit Price > 0 ; VAT 0 – 100 % (estimate).
// Inclusive price : Amount = round(qty × price × 100 / (100 + VAT))
// Exclusive price : Amount = qty × price, VAT = round(Amount × VAT%)
// Nothing is posted to the ledgers.
//===============================================================

public class PurchaseOrdersMbRepository : IPurchaseOrdersMbRepository
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
    // System Configuration switches (Procurement › Motor Bike
    // Purchase › Purchase Orders - MB), always read BY CODE.
    // A missing switch uses its fallback (= today's behaviour).
    //===========================================================

    // Read by Purchases - MB (purchase entry must pick a placed PO)
    public const string SwitchPoRequired = "CFG-MOD-007-0001";

    // Read by Purchases - MB (OFF : unbilled qty closes short
    // after one purchase entry)
    public const string SwitchCarryBalance = "CFG-MOD-007-0002";

    // Value = most days back (empty = any day). OFF = not before today
    private const string SwitchBackDated = "CFG-MOD-007-0003";

    // Value = most days ahead (empty = any day). OFF = not after today
    private const string SwitchPostDated = "CFG-MOD-007-0004";

    // Value = most lines on one PO. OFF = no limit
    private const string SwitchMaxLines = "CFG-MOD-007-0005";

    // ON = Expected Delivery must be entered
    private const string SwitchExpectedRequired = "CFG-MOD-007-0006";

    // Read by the page / print : ON = an Approved PO prints
    public const string SwitchPrintOnApproval = "CFG-MOD-007-0007";

    // Read by the page : ON = new PO starts VAT Inclusive
    public const string SwitchPriceInclusive = "CFG-MOD-007-0008";

    // ON = Approve also places the order (Draft → Placed)
    private const string SwitchPlaceOnApproval = "CFG-MOD-007-0009";


    //===========================================================
    // Page definitions
    //===========================================================

    private sealed class PageDef
    {
        public string PageType { get; init; } = string.Empty;

        public string Prefix { get; init; } = string.Empty;

        public string Title { get; init; } = string.Empty;

        public string[] SupplyTypes { get; init; } = Array.Empty<string>();
    }


    private static readonly PageDef[] Pages =
    {
        new PageDef
        {
            PageType = "MB",
            Prefix = VoucherTypes.PurchaseOrderMotorBikes,
            Title = "Motor Bike Purchase Order",
            SupplyTypes = new[] { TypeMotorBikes, General }
        },

        new PageDef
        {
            PageType = "SP",
            Prefix = VoucherTypes.PurchaseOrderSpareParts,
            Title = "Spare Parts & Lubricants Purchase Order",
            SupplyTypes = new[] { TypeSpareParts, General }
        },

        new PageDef
        {
            PageType = "AC",
            Prefix = VoucherTypes.PurchaseOrderAccessories,
            Title = "Accessories Purchase Order",
            SupplyTypes = new[] { TypeAccessories, General }
        }
    };


    private static PageDef PageOf
    (
        string? pageType
    )
    {
        return Pages.FirstOrDefault
        (
            x =>
                string.Equals(
                    x.PageType,
                    (pageType ?? string.Empty).Trim(),
                    StringComparison.OrdinalIgnoreCase)
        )
        ??
        throw new InvalidOperationException(
            "Page Type must be MB, SP or AC.");
    }


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IVoucherNumberService _numberService;


    //===========================================================
    // Constructor
    //===========================================================

    public PurchaseOrdersMbRepository(
        AppDbContext context,
        IVoucherNumberService numberService)
    {
        _context = context;

        _numberService = numberService;
    }


    //===========================================================
    // Normalized Input
    //===========================================================

    private sealed class PoInput
    {
        public PageDef Page { get; set; } = new();

        public DateOnly OrderDate { get; set; }

        public DateOnly? ExpectedDate { get; set; }

        public VoucherPeriodDto Period { get; set; } = new();

        public SupplierProfilesEntity Supplier { get; set; } = new();

        public bool PriceIncludesVat { get; set; }

        public string Narration { get; set; } = string.Empty;

        public List<PurchaseOrdersMbLines> Lines { get; set; } = new();
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

        // Brand of the category (null : category saved without one)
        public long? BrandId { get; set; }

        public bool IsActive { get; set; }
    }


    //===========================================================
    // Get All (list : header only, one page)
    //===========================================================

    public async Task<List<PurchaseOrdersMbDto>>
        GetAllAsync
        (
            string pageType
        )
    {
        PageDef page =
            PageOf(pageType);

        List<PurchaseOrdersMb> rows =
            await _context
                .Set<PurchaseOrdersMb>()
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

    public async Task<PurchaseOrdersMbDto?>
        GetByIdAsync
        (
            long id
        )
    {
        PurchaseOrdersMb? row =
            await _context
                .Set<PurchaseOrdersMb>()
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

        PurchaseOrdersMbDto dto =
            ToDto(row);

        dto.Lines =
            await _context
                .Set<PurchaseOrdersMbLines>()
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
                            UnitPrice = x.UnitPrice,
                            VatRate = x.VatRate,
                            Amount = x.Amount,
                            VatAmount = x.VatAmount,
                            LineTotal = x.LineTotal,
                            BilledQuantity = x.BilledQuantity,
                            ShortNotes = x.ShortNotes
                        }
                )
                .ToListAsync();

        return dto;
    }


    private static PurchaseOrdersMbDto ToDto
    (
        PurchaseOrdersMb x
    )
    {
        return new PurchaseOrdersMbDto
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

    public async Task<PurchaseOrdersMbDefaultsDto>
        GetDefaultsAsync
        (
            string pageType,
            long branchId,
            DateOnly orderDate
        )
    {
        PageDef page =
            PageOf(pageType);

        PurchaseOrdersMbDefaultsDto result =
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
                .Set<PurchaseOrdersMb>()
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
    // Suppliers of the page (live ; inactive ones flagged)
    //===========================================================

    private async Task<List<PurchaseOrderSupplierOptionDto>>
        SupplierOptionsAsync
        (
            PageDef page
        )
    {
        List<string> types =
            page.SupplyTypes.ToList();

        Dictionary<long, string> brands =
            await BrandNamesAsync();

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
                        IsActive = x.IsActive
                    }
            )
            .ToListAsync();

        foreach (PurchaseOrderSupplierOptionDto supplier in suppliers)
        {
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
            PageDef page,
            List<string>? codes
        )
    {
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
                    IsActive = x.IsActive
                }
        )
        .ToList();
    }


    private async Task<List<ProductRow>>
        ProductRowsAsync
        (
            PageDef page,
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
                    .Select(x => new { x.MotorBikeId, x.ProductCode, x.ProductName, x.ProductCategoryId, x.ProductSubCategoryId, x.IsActive })
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
                    .Select(x => new { x.SparePartId, x.ProductCode, x.PartNumber, x.PartName, x.Unit, x.ProductCategoryId, x.ProductSubCategoryId, x.IsActive })
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
                    .Select(x => new { x.AccessoryId, x.ProductCode, x.PartNumber, x.AccessoryName, x.Unit, x.ProductCategoryId, x.ProductSubCategoryId, x.IsActive })
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


    private static bool IsMoney
    (
        decimal value
    )
    {
        return decimal.Round(value, 2) == value;
    }


    //===========================================================
    // Line amounts (Amount without VAT, VAT, Line Total)
    //===========================================================

    private static (decimal Amount, decimal Vat, decimal Total)
        LineAmounts
        (
            decimal quantity,
            decimal unitPrice,
            decimal vatRate,
            bool priceIncludesVat
        )
    {
        decimal gross =
            decimal.Round(quantity * unitPrice, 2, MidpointRounding.AwayFromZero);

        if (priceIncludesVat)
        {
            decimal amount =
                decimal.Round(gross * 100m / (100m + vatRate), 2, MidpointRounding.AwayFromZero);

            return (amount, gross - amount, gross);
        }

        decimal vat =
            decimal.Round(gross * vatRate / 100m, 2, MidpointRounding.AwayFromZero);

        return (gross, vat, gross + vat);
    }


    //===========================================================
    // Normalize & Validate (Create / Update)
    //===========================================================

    private async Task<PoInput>
        NormalizeAsync
        (
            CreatePurchaseOrdersMbDto dto,
            string? lockedPageType,
            DateOnly? savedOrderDate = null
        )
    {
        PageDef page =
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
            && await IsSwitchOnAsync(SwitchExpectedRequired, false))
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
            await SwitchNumberAsync(SwitchMaxLines);

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

        // A supplier with a brand supplies only that brand's
        // products (a category saved without a brand is allowed)
        long? supplierBrandId =
            supplier.BrandManagementId;

        Dictionary<long, string> brandNames =
            supplierBrandId.HasValue
                ? await BrandNamesAsync()
                : new Dictionary<long, string>();

        int lineNo = 0;

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

            if (!(row.UnitPrice > 0) || !IsMoney(row.UnitPrice) || row.UnitPrice > MaxMoney)
            {
                throw new InvalidOperationException(
                    $"{label} : unit price must be more than 0 with at most 2 decimals.");
            }

            if (row.VatRate < 0 || row.VatRate > 100 || !IsMoney(row.VatRate))
            {
                throw new InvalidOperationException(
                    $"{label} : VAT must be from 0 to 100% with at most 2 decimals.");
            }

            (decimal amount, decimal vat, decimal total) =
                LineAmounts(
                    row.Quantity,
                    row.UnitPrice,
                    row.VatRate,
                    input.PriceIncludesVat);

            input.Lines.Add(
                new PurchaseOrdersMbLines
                {
                    LineNo = lineNo,
                    ProductType = product.ProductType,
                    ProductId = product.ProductId,
                    ProductCode = product.ProductCode,
                    ProductName = Limit(product.ProductName, 250),
                    Unit = Limit(product.Unit, 20),
                    Quantity = row.Quantity,
                    UnitPrice = row.UnitPrice,
                    VatRate = row.VatRate,
                    Amount = amount,
                    VatAmount = vat,
                    LineTotal = total,
                    BilledQuantity = 0,
                    ShortNotes = Limit(row.ShortNotes, 250)
                });
        }

        return input;
    }


    //===========================================================
    // Apply
    //===========================================================

    private static void ApplyHeader
    (
        PurchaseOrdersMb entity,
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
        entity.Narration = input.Narration;
        entity.TotalQuantity = input.Lines.Sum(x => x.Quantity);
        entity.TotalAmount = input.Lines.Sum(x => x.Amount);
        entity.TotalVat = input.Lines.Sum(x => x.VatAmount);
        entity.TotalPayable = input.Lines.Sum(x => x.LineTotal);
    }


    private async Task ReplaceLinesAsync
    (
        long orderId,
        PoInput input
    )
    {
        List<PurchaseOrdersMbLines> oldLines =
            await _context
                .Set<PurchaseOrdersMbLines>()
                .Where(x => x.PurchaseOrderId == orderId)
                .ToListAsync();

        _context.Set<PurchaseOrdersMbLines>().RemoveRange(oldLines);

        foreach (PurchaseOrdersMbLines line in input.Lines)
        {
            line.PurchaseOrderId = orderId;
        }

        _context.Set<PurchaseOrdersMbLines>().AddRange(input.Lines);
    }


    //===========================================================
    // History
    //===========================================================

    private void AddHistory
    (
        PurchaseOrdersMb entity,
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

    private async Task<PurchaseOrdersMb>
        LoadAsync
        (
            long id
        )
    {
        await _context.Database.ExecuteSqlInterpolatedAsync(
            $@"SELECT 1 FROM ""PurchaseOrdersMb"" WHERE ""PurchaseOrderId"" = {id} FOR UPDATE");

        PurchaseOrdersMb? entity =
            await _context
                .Set<PurchaseOrdersMb>()
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
        PurchaseOrdersMb entity,
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
            CreatePurchaseOrdersMbDto dto,
            long userId
        )
    {
        PoInput input =
            await NormalizeAsync(dto, null);

        PurchaseOrdersMb entity =
            new()
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

                _context.Set<PurchaseOrdersMb>().Add(entity);

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
            UpdatePurchaseOrdersMbDto dto,
            long userId
        )
    {
        await InTransactionAsync(
            async () =>
            {
                PurchaseOrdersMb entity =
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
                PurchaseOrdersMb entity =
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
        PageDef page =
            PageOf(pageType);

        PurchaseOrdersMb? entity =
            await _context
                .Set<PurchaseOrdersMb>()
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
                PurchaseOrdersMb entity =
                    await LoadAsync(id);

                RequireStatus(entity, "approved", StatusDraft);

                DateTime now =
                    DateTime.UtcNow;

                entity.Status = StatusApproved;

                entity.ApprovedBy = userId;

                entity.ApprovedDate = now;

                AddHistory(entity, "Approve", "Approved", userId, now);

                // Switch "Place Order On Approval" : Approve also places
                if (await IsSwitchOnAsync(SwitchPlaceOnApproval, false))
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
                PurchaseOrdersMb entity =
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
                PurchaseOrdersMb entity =
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
                PurchaseOrdersMb entity =
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
                PurchaseOrdersMb entity =
                    await LoadAsync(id);

                RequireStatus(entity, "cancelled", StatusApproved, StatusPlaced);

                bool billed =
                    await _context
                        .Set<PurchaseOrdersMbLines>()
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
            string code,
            bool fallback
        )
    {
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
            string code
        )
    {
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


    // Whole number when ON and positive, otherwise 0 (= no limit)
    private async Task<int>
        SwitchNumberAsync
        (
            string code
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
                await SwitchStateAsync(SwitchBackDated);

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
                await SwitchStateAsync(SwitchPostDated);

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
            .Set<PurchaseOrdersMb>()
            .AnyAsync
            (
                x =>
                    x.PurchaseOrderId == id
                    &&
                    !x.IsDeleted
            );
    }
}