//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.Platform.Accounting;
using AppCore.Application.SalesOperations.BookingManagement;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.SalesOperations.AccessoriesSales;
using AppCore.Domain.Entities.SalesOperations.BookingManagement;
using AppCore.Domain.Entities.SalesOperations.MotorBikeSales;
using AppCore.Domain.Entities.SalesOperations.SparePartsLubricantSales;
using AppCore.Domain.Entities.Settings.ClientSettings;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Domain.Entities.Settings.ProductSettings;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.Accounting;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.SalesOperations.BookingManagement;


//===============================================================
// Bookings repository (MB / SP / AC; Bookings_Engine.sql)
//
//   One page per type : Bookings - MB / SP / AC. Every call names
//   the type; a booking of another type is "not found".
//   MB      : customer + model and colour.
//   SP / AC : customer + items with quantity (BookingLines).
//   Create  : booking (BKMB / BKSP / BKAC number) + its first
//             collection : one Receipt Voucher, Dr the Payment
//             Desk rows / Cr the customer's own ledger (advance).
//   Collect : more advance on an open booking (same voucher).
//   Cancel  : reason; forfeit (Refund on Cancel OFF : all) by a
//             Journal Voucher Dr customer / Cr BOOKING-FORFEIT-
//             <type>; the rest stays on the customer's ledger
//             (refund by Payment Voucher).
//   Sales Invoice of the type : takes the advance as paid; Post
//   converts the booking, cancelling the invoice re-opens it
//   (sales engine).
//===============================================================

public class BookingsRepository
    : IBookingsRepository
{
    private const string StatusOpen = "Open";

    private const string StatusConverted = "Converted";

    private const string StatusCancelled = "Cancelled";

    private const string LedgerTypeCustomer = "Customer";

    private const string LedgerTypeGeneral = "General Ledger";

    private const string HistoryModule = "Sales Operations";

    private const string HistoryEntity = "Booking";


    // Per type : number prefix, forfeit purpose, switches
    private sealed record TypeInfo
    (
        string Code,
        string Name,
        string Prefix,
        string PurposeForfeit,
        string SwitchMinimum,
        string SwitchValidity,
        string SwitchRefund,
        string SwitchForfeit,
        decimal DefaultMinimum
    );

    private static readonly Dictionary<string, TypeInfo> Types =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["MB"] = new("MB", "Motor Bikes", "BKMB", "BOOKING-FORFEIT-MB",
                         "CFG-MOD-008-0091", "CFG-MOD-008-0092", "CFG-MOD-008-0093", "CFG-MOD-008-0094", 1000m),
            ["SP"] = new("SP", "Spare Parts", "BKSP", "BOOKING-FORFEIT-SP",
                         "CFG-MOD-008-0095", "CFG-MOD-008-0096", "CFG-MOD-008-0097", "CFG-MOD-008-0098", 500m),
            ["AC"] = new("AC", "Accessories", "BKAC", "BOOKING-FORFEIT-AC",
                         "CFG-MOD-008-0099", "CFG-MOD-008-0100", "CFG-MOD-008-0101", "CFG-MOD-008-0102", 500m)
        };

    private static TypeInfo TypeOf(string? productType)
    {
        return Types.TryGetValue((productType ?? string.Empty).Trim(), out TypeInfo? info)
            ? info
            : throw new InvalidOperationException("Booking type must be MB, SP or AC.");
    }


    private readonly AppDbContext _context;

    private readonly IVoucherNumberService _numberService;

    private readonly IReceiptVoucherRepository _receiptVouchers;

    private readonly IJournalVoucherRepository _journalVouchers;


    public BookingsRepository(
        AppDbContext context,
        IVoucherNumberService numberService,
        IReceiptVoucherRepository receiptVouchers,
        IJournalVoucherRepository journalVouchers)
    {
        _context = context;
        _numberService = numberService;
        _receiptVouchers = receiptVouchers;
        _journalVouchers = journalVouchers;
    }


    private DbSet<Bookings> BookingRows =>
        _context.Set<Bookings>();

    private DbSet<BookingCollections> CollectionRows =>
        _context.Set<BookingCollections>();

    private DbSet<BookingLines> LineRows =>
        _context.Set<BookingLines>();


    //===========================================================
    // Helpers
    //===========================================================

    // Business date : Bangladesh time
    private static DateOnly Today =>
        DateOnly.FromDateTime(DateTime.UtcNow.AddHours(6));

    private static string DateText(DateOnly? date) =>
        date.HasValue ? date.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) : string.Empty;

    private static string Money(decimal value) =>
        value.ToString("N2", CultureInfo.InvariantCulture);

    private static string Qty(decimal value) =>
        value.ToString("0.##", CultureInfo.InvariantCulture);

    private static string Limit(string? value, int max)
    {
        string text = (value ?? string.Empty).Trim();

        return text.Length > max ? text.Substring(0, max) : text;
    }

    private static DateOnly? OptionalDate(string? text, string label)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        if (DateOnly.TryParseExact(text.Trim().Substring(0, Math.Min(10, text.Trim().Length)), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly date))
        {
            return date;
        }

        throw new InvalidOperationException($"{label} is not a valid date.");
    }

    private static DateOnly DateOrToday(string? text, string label)
    {
        DateOnly date = OptionalDate(text, label) ?? Today;

        if (date > Today)
        {
            throw new InvalidOperationException($"{label} cannot be in the future.");
        }

        return date;
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

    private void AddHistory(long id, string type, string title, string description, long userId)
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = id,
                ActivityType = type,
                ActivityTitle = title,
                ActivityDescription = description.Length > 1000 ? description.Substring(0, 1000) : description,
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });
    }


    //===========================================================
    // Switches (of the type's page)
    //===========================================================

    private async Task<BookingSwitchesDto> SwitchesAsync(TypeInfo type)
    {
        string[] codes = { type.SwitchMinimum, type.SwitchValidity, type.SwitchRefund, type.SwitchForfeit };

        var rows =
            await _context.Set<SystemConfigurations>()
                .AsNoTracking()
                .Where(x => codes.Contains(x.ConfigurationCode) && !x.IsDeleted)
                .Select(x => new { x.ConfigurationCode, x.IsEnabled, x.Value })
                .ToListAsync();

        decimal? Number(string code)
        {
            var row = rows.FirstOrDefault(x => x.ConfigurationCode == code);

            if (row == null || !row.IsEnabled)
            {
                return null;
            }

            return decimal.TryParse((row.Value ?? string.Empty).Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out decimal value)
                ? value
                : null;
        }

        // A missing switch behaves as its default
        bool refundRow = rows.Any(x => x.ConfigurationCode == type.SwitchRefund);

        decimal? minimum = rows.Any(x => x.ConfigurationCode == type.SwitchMinimum) ? Number(type.SwitchMinimum) : type.DefaultMinimum;

        decimal? validity = rows.Any(x => x.ConfigurationCode == type.SwitchValidity) ? Number(type.SwitchValidity) : 30m;

        return new BookingSwitchesDto
        {
            MinimumAmount = minimum.HasValue && minimum.Value > 0 ? minimum : null,
            ValidityDays = validity.HasValue && validity.Value >= 1 ? (int)Math.Min(validity.Value, 3650m) : null,
            RefundOnCancel = !refundRow || rows.First(x => x.ConfigurationCode == type.SwitchRefund).IsEnabled,
            ForfeitPercent = Math.Clamp(Number(type.SwitchForfeit) ?? 0m, 0m, 100m)
        };
    }


    //===========================================================
    // Page
    //===========================================================

    public async Task<BookingsPageDto> GetPageAsync(string productType, long branchId)
    {
        TypeInfo type = TypeOf(productType);

        List<Bookings> bookings =
            await BookingRows
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.ProductType == type.Code)
                .OrderByDescending(x => x.BookingDate)
                .ThenByDescending(x => x.BookingId)
                .ToListAsync();

        List<long> ids = bookings.Select(x => x.BookingId).ToList();

        List<BookingCollections> collections =
            await CollectionRows
                .AsNoTracking()
                .Where(x => ids.Contains(x.BookingId))
                .OrderByDescending(x => x.CollectionDate)
                .ThenByDescending(x => x.BookingCollectionId)
                .ToListAsync();

        Dictionary<long, List<BookingLineDto>> lines = await LinesOfAsync(type, ids);

        Dictionary<long, string> held = await HeldByAsync(type, ids);

        List<long> branchIds =
            bookings.Select(x => x.BranchId).Append(branchId).Distinct().ToList();

        Dictionary<long, string> branches =
            await _context.Set<Branches>()
                .AsNoTracking()
                .Where(x => branchIds.Contains(x.BranchId))
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName);

        DateOnly today = Today;

        Dictionary<long, Bookings> byId = bookings.ToDictionary(x => x.BookingId);

        BookingsPageDto result =
            new()
            {
                ProductType = type.Code,
                Today = DateText(today),
                BranchId = branchId,
                BranchName = branches.GetValueOrDefault(branchId, string.Empty),
                Switches = await SwitchesAsync(type)
            };

        if (type.Code == "MB")
        {
            result.Models =
                await _context.Set<MotorBikes>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.ProductName)
                    .Select(x => new BookingModelDto { MotorBikeId = x.MotorBikeId, ProductCode = x.ProductCode, ProductName = x.ProductName })
                    .ToListAsync();
        }
        else
        {
            await LoadCategoriesAsync(type, result);
        }

        foreach (Bookings x in bookings)
        {
            result.Bookings.Add(
                new BookingRowDto
                {
                    BookingId = x.BookingId,
                    PublicId = x.PublicId,
                    ProductType = x.ProductType,
                    BookingNo = x.BookingNo,
                    BookingDate = DateText(x.BookingDate),
                    BranchId = x.BranchId,
                    BranchName = branches.GetValueOrDefault(x.BranchId, string.Empty),
                    CustomerId = x.CustomerId,
                    CustomerCode = x.CustomerCode,
                    CustomerName = x.CustomerName,
                    CustomerPhone = x.CustomerPhone,
                    MotorBikeId = x.MotorBikeId,
                    ModelName = x.ModelName,
                    Lines = lines.GetValueOrDefault(x.BookingId) ?? new List<BookingLineDto>(),
                    ValidUntil = DateText(x.ValidUntil),
                    ExpectedDate = DateText(x.ExpectedDate),
                    SalesPersonName = x.SalesPersonName,
                    Remarks = x.Remarks,
                    AdvanceAmount = x.AdvanceAmount,
                    Status = x.Status,
                    IsExpired = x.Status == StatusOpen && x.ValidUntil.HasValue && x.ValidUntil.Value < today,
                    SalesInvoiceNo = x.SalesInvoiceNo,
                    ConvertedDate = DateText(x.ConvertedDate),
                    HeldByInvoiceNo = held.GetValueOrDefault(x.BookingId, string.Empty),
                    CancelReason = x.CancelReason,
                    CancelledDate = x.CancelledDate.HasValue ? DateText(DateOnly.FromDateTime(x.CancelledDate.Value.AddHours(6))) : string.Empty,
                    ForfeitAmount = x.ForfeitAmount,
                    ForfeitVoucherNo = x.ForfeitVoucherNo,
                    RefundAmount = x.RefundAmount,
                    CollectionCount = collections.Count(c => c.BookingId == x.BookingId)
                });
        }

        foreach (BookingCollections c in collections)
        {
            Bookings? booking = byId.GetValueOrDefault(c.BookingId);

            result.Collections.Add(
                new BookingCollectionRowDto
                {
                    BookingCollectionId = c.BookingCollectionId,
                    PublicId = c.PublicId,
                    BookingId = c.BookingId,
                    BookingNo = booking?.BookingNo ?? string.Empty,
                    CustomerName = booking?.CustomerName ?? string.Empty,
                    ModelName = booking?.ModelName ?? string.Empty,
                    BranchId = booking?.BranchId ?? 0,
                    CollectionDate = DateText(c.CollectionDate),
                    Amount = c.Amount,
                    ReceiptVoucherNo = c.ReceiptVoucherNo,
                    Remarks = c.Remarks
                });
        }

        return result;
    }


    // SP / AC : the items of the bookings
    private async Task<Dictionary<long, List<BookingLineDto>>> LinesOfAsync(TypeInfo type, List<long> bookingIds)
    {
        if (type.Code == "MB" || bookingIds.Count == 0)
        {
            return new Dictionary<long, List<BookingLineDto>>();
        }

        List<BookingLines> rows =
            await LineRows
                .AsNoTracking()
                .Where(x => bookingIds.Contains(x.BookingId))
                .OrderBy(x => x.BookingId)
                .ThenBy(x => x.LineNo)
                .ToListAsync();

        return rows
            .GroupBy(x => x.BookingId)
            .ToDictionary
            (
                g => g.Key,
                g => g.Select
                     (
                         x =>
                             new BookingLineDto
                             {
                                 ProductId = x.ProductId,
                                 ProductCode = x.ProductCode,
                                 PartNumber = x.PartNumber,
                                 ProductName = x.ProductName,
                                 Unit = x.Unit,
                                 Quantity = x.Quantity,
                                 Remarks = x.Remarks
                             }
                     )
                     .ToList()
            );
    }


    // Bookings held by a draft / approved Sales Invoice of the type
    private async Task<Dictionary<long, string>> HeldByAsync(TypeInfo type, List<long> bookingIds)
    {
        if (bookingIds.Count == 0)
        {
            return new Dictionary<long, string>();
        }

        List<(long BookingId, string InvoiceNo)> rows =
            type.Code switch
            {
                "SP" => (await _context.Set<SalesInvoicesSp>()
                            .AsNoTracking()
                            .Where(x => !x.IsDeleted && x.BookingId.HasValue && bookingIds.Contains(x.BookingId.Value)
                                        && (x.Status == "Draft" || x.Status == "Approved"))
                            .Select(x => new { BookingId = x.BookingId!.Value, x.InvoiceNo })
                            .ToListAsync())
                        .Select(x => (x.BookingId, x.InvoiceNo)).ToList(),

                "AC" => (await _context.Set<SalesInvoicesAc>()
                            .AsNoTracking()
                            .Where(x => !x.IsDeleted && x.BookingId.HasValue && bookingIds.Contains(x.BookingId.Value)
                                        && (x.Status == "Draft" || x.Status == "Approved"))
                            .Select(x => new { BookingId = x.BookingId!.Value, x.InvoiceNo })
                            .ToListAsync())
                        .Select(x => (x.BookingId, x.InvoiceNo)).ToList(),

                _ => (await _context.Set<SalesInvoicesMb>()
                            .AsNoTracking()
                            .Where(x => !x.IsDeleted && x.BookingId.HasValue && bookingIds.Contains(x.BookingId.Value)
                                        && (x.Status == "Draft" || x.Status == "Approved"))
                            .Select(x => new { BookingId = x.BookingId!.Value, x.InvoiceNo })
                            .ToListAsync())
                        .Select(x => (x.BookingId, x.InvoiceNo)).ToList()
            };

        return rows
            .GroupBy(x => x.BookingId)
            .ToDictionary(g => g.Key, g => g.First().InvoiceNo);
    }


    private async Task<Bookings> FindAsync(TypeInfo type, Guid publicId)
    {
        return await BookingRows.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted && x.ProductType == type.Code)
               ?? throw new KeyNotFoundException("Booking not found (refresh the page).");
    }


    private async Task<MotorBikes> FindModelAsync(long motorBikeId)
    {
        MotorBikes? bike =
            await _context.Set<MotorBikes>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MotorBikeId == motorBikeId && !x.IsDeleted);

        if (bike == null)
        {
            throw new InvalidOperationException("Choose the model and colour.");
        }

        if (!bike.IsActive)
        {
            throw new InvalidOperationException($"{bike.ProductName} is inactive.");
        }

        return bike;
    }


    //===========================================================
    // SP / AC : products (item search, checks)
    //===========================================================

    private IQueryable<BookingProductDto> Products(TypeInfo type, bool activeOnly)
    {
        if (type.Code == "AC")
        {
            return _context.Set<Accessories>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && (!activeOnly || x.IsActive))
                .Select(x => new BookingProductDto
                {
                    ProductId = x.AccessoryId,
                    ProductCode = x.ProductCode,
                    PartNumber = x.PartNumber,
                    ProductName = x.AccessoryName,
                    Unit = x.Unit
                });
        }

        return _context.Set<SpareParts>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted && (!activeOnly || x.IsActive))
            .Select(x => new BookingProductDto
            {
                ProductId = x.SparePartId,
                ProductCode = x.ProductCode,
                PartNumber = x.PartNumber,
                ProductName = x.PartName,
                Unit = x.Unit
            });
    }


    // SP / AC : the categories / sub categories that have active
    // items (the Add Item filters)
    private async Task LoadCategoriesAsync(TypeInfo type, BookingsPageDto result)
    {
        List<(long CategoryId, long SubCategoryId)> used =
            type.Code == "AC"
                ? (await _context.Set<Accessories>()
                        .AsNoTracking()
                        .Where(x => !x.IsDeleted && x.IsActive)
                        .Select(x => new { x.ProductCategoryId, x.ProductSubCategoryId })
                        .Distinct()
                        .ToListAsync())
                    .Select(x => (x.ProductCategoryId, x.ProductSubCategoryId))
                    .ToList()
                : (await _context.Set<SpareParts>()
                        .AsNoTracking()
                        .Where(x => !x.IsDeleted && x.IsActive)
                        .Select(x => new { x.ProductCategoryId, x.ProductSubCategoryId })
                        .Distinct()
                        .ToListAsync())
                    .Select(x => (x.ProductCategoryId, x.ProductSubCategoryId))
                    .ToList();

        List<long> categoryIds = used.Select(x => x.CategoryId).Distinct().ToList();

        List<long> subCategoryIds = used.Select(x => x.SubCategoryId).Distinct().ToList();

        result.Categories =
            await _context.Set<AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && categoryIds.Contains(x.ProductCategoryId))
                .OrderBy(x => x.CategoryName)
                .Select(x => new BookingCategoryDto { Id = x.ProductCategoryId, Name = x.CategoryName })
                .ToListAsync();

        result.SubCategories =
            await _context.Set<AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && subCategoryIds.Contains(x.ProductSubCategoryId))
                .OrderBy(x => x.SubCategoryName)
                .Select(x => new BookingCategoryDto { Id = x.ProductSubCategoryId, ParentId = x.ProductCategoryId, Name = x.SubCategoryName })
                .ToListAsync();
    }


    // SP / AC items : 2+ letters (name / code / part no), or a
    // category / sub category alone (its items); both narrow
    public async Task<List<BookingProductDto>> SearchProductsAsync(string productType, string term, long categoryId = 0, long subCategoryId = 0)
    {
        TypeInfo type = TypeOf(productType);

        if (type.Code == "MB")
        {
            return new List<BookingProductDto>();
        }

        string text = (term ?? string.Empty).Trim().ToLower();

        bool narrowed = categoryId > 0 || subCategoryId > 0;

        if (text.Length < 2 && !narrowed)
        {
            return new List<BookingProductDto>();
        }

        IQueryable<BookingProductDto> query = Products(type, true);

        if (narrowed)
        {
            List<long> ids =
                type.Code == "AC"
                    ? await _context.Set<Accessories>()
                        .AsNoTracking()
                        .Where(x => !x.IsDeleted && x.IsActive
                                    && (categoryId == 0 || x.ProductCategoryId == categoryId)
                                    && (subCategoryId == 0 || x.ProductSubCategoryId == subCategoryId))
                        .Select(x => x.AccessoryId)
                        .ToListAsync()
                    : await _context.Set<SpareParts>()
                        .AsNoTracking()
                        .Where(x => !x.IsDeleted && x.IsActive
                                    && (categoryId == 0 || x.ProductCategoryId == categoryId)
                                    && (subCategoryId == 0 || x.ProductSubCategoryId == subCategoryId))
                        .Select(x => x.SparePartId)
                        .ToListAsync();

            query = query.Where(x => ids.Contains(x.ProductId));
        }

        if (text.Length >= 2)
        {
            query = query.Where(x => x.ProductName.ToLower().Contains(text)
                                     || x.ProductCode.ToLower().Contains(text)
                                     || x.PartNumber.ToLower().Contains(text));
        }

        return await query
            .OrderBy(x => x.ProductName)
            .Take(text.Length >= 2 ? 30 : 200)
            .ToListAsync();
    }


    // The items asked for : products of the type (active), whole
    // quantities > 0, one row per product (quantities added up)
    private async Task<List<BookingLineDto>> CheckLinesAsync(TypeInfo type, List<BookingLineDto>? lines)
    {
        List<BookingLineDto> asked =
            (lines ?? new())
                .Where(x => x != null && x.ProductId > 0)
                .ToList();

        if (asked.Count == 0)
        {
            throw new InvalidOperationException("Add at least one item.");
        }

        if (asked.Any(x => !(x.Quantity > 0m)))
        {
            throw new InvalidOperationException("Every item needs a quantity above 0.");
        }

        List<long> productIds = asked.Select(x => x.ProductId).Distinct().ToList();

        Dictionary<long, BookingProductDto> products =
            await Products(type, false)
                .Where(x => productIds.Contains(x.ProductId))
                .ToDictionaryAsync(x => x.ProductId);

        List<long> active =
            await Products(type, true)
                .Where(x => productIds.Contains(x.ProductId))
                .Select(x => x.ProductId)
                .ToListAsync();

        List<BookingLineDto> result = new();

        foreach (var group in asked.GroupBy(x => x.ProductId))
        {
            if (!products.TryGetValue(group.Key, out BookingProductDto? product))
            {
                throw new InvalidOperationException($"An item ({group.Key}) is not a {type.Name.ToLower()} product : pick it again.");
            }

            if (!active.Contains(group.Key))
            {
                throw new InvalidOperationException($"{product.ProductName} is inactive.");
            }

            result.Add(
                new BookingLineDto
                {
                    ProductId = product.ProductId,
                    ProductCode = product.ProductCode,
                    PartNumber = product.PartNumber,
                    ProductName = product.ProductName,
                    Unit = product.Unit,
                    Quantity = Math.Round(group.Sum(x => x.Quantity), 2),
                    Remarks = Limit(string.Join("; ", group.Select(x => (x.Remarks ?? string.Empty).Trim()).Where(x => x.Length > 0)), 250)
                });
        }

        if (result.Count > 100)
        {
            throw new InvalidOperationException("A booking holds at most 100 items.");
        }

        return result;
    }


    // "Brake Shoe x 2, Chain Kit x 1 (+3 more)"
    private static string Summary(List<BookingLineDto> lines)
    {
        string text =
            string.Join(", ", lines.Take(2).Select(x => $"{x.ProductName} x {Qty(x.Quantity)}"));

        return Limit(lines.Count > 2 ? $"{text} (+{lines.Count - 2} more)" : text, 250);
    }


    private async Task SaveLinesAsync(Bookings booking, List<BookingLineDto> lines, long userId, DateTime now)
    {
        List<BookingLines> old =
            await LineRows
                .Where(x => x.BookingId == booking.BookingId)
                .ToListAsync();

        LineRows.RemoveRange(old);

        int lineNo = 1;

        foreach (BookingLineDto x in lines)
        {
            LineRows.Add(
                new BookingLines
                {
                    BookingId = booking.BookingId,
                    LineNo = lineNo++,
                    ProductId = x.ProductId,
                    ProductCode = Limit(x.ProductCode, 50),
                    PartNumber = Limit(x.PartNumber, 50),
                    ProductName = Limit(x.ProductName, 250),
                    Unit = Limit(x.Unit, 20),
                    Quantity = x.Quantity,
                    Remarks = Limit(x.Remarks, 250),
                    CreatedBy = userId,
                    CreatedDate = now
                });
        }
    }


    //===========================================================
    // The Receipt Voucher of a collection : Dr the Payment Desk
    // rows / Cr the customer's own ledger
    //===========================================================

    private async Task<ReceiptVoucherSavedDto> ReceiveAsync
    (
        Bookings booking,
        CustomerProfiles customer,
        List<ReceiptVoucherDebitDto>? debits,
        DateOnly date,
        long branchId,
        string note,
        long userId
    )
    {
        List<ReceiptVoucherDebitDto> rows = debits ?? new();

        if (rows.Count == 0)
        {
            throw new InvalidOperationException("Add the payment (Payment Desk).");
        }

        decimal amount = Math.Round(rows.Sum(x => x.Amount), 2);

        if (!(amount > 0m))
        {
            throw new InvalidOperationException("The amount must be more than 0.");
        }

        string receivable = (customer.ReceivableLedgerCode ?? string.Empty).Trim();

        if (receivable.Length == 0)
        {
            throw new InvalidOperationException(
                $"{customer.CustomerName} ({customer.CustomerCode}) has no receivable ledger (Customer Profiles).");
        }

        return await _receiptVouchers.CreatePostedAsync(
            new CreateReceiptVoucherDto
            {
                VoucherDate = DateText(date),
                BranchId = branchId,
                Narration = Limit($"Booking advance {booking.BookingNo} : {booking.ModelName} - {customer.CustomerName} ({customer.CustomerCode}){(note.Length > 0 ? " | " + note : string.Empty)}", 500),
                Debits = rows,
                Credits =
                    new List<ReceiptVoucherCreditDto>
                    {
                        new()
                        {
                            LedgerType = LedgerTypeCustomer,
                            LedgerCode = receivable,
                            Amount = amount,
                            ShortNotes = Limit($"Booking advance {booking.BookingNo}", 250)
                        }
                    }
            },
            Limit(booking.BookingNo, 100),
            userId);
    }


    //===========================================================
    // Create : booking + its first collection
    //===========================================================

    public async Task<BookingSavedDto> CreateAsync(string productType, CreateBookingDto dto, long branchId, long userId)
    {
        TypeInfo type = TypeOf(productType);

        if (dto == null)
        {
            throw new InvalidOperationException("Nothing to save.");
        }

        if (branchId <= 0)
        {
            throw new InvalidOperationException("Log in with a branch first.");
        }

        DateOnly date = DateOrToday(dto.Date, "Booking Date");

        DateOnly? expected = OptionalDate(dto.ExpectedDate, "Expected Date");

        if (expected.HasValue && expected.Value < date)
        {
            throw new InvalidOperationException("Expected Date cannot be before the booking date.");
        }

        CustomerProfiles customer =
            await _context.Set<CustomerProfiles>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.CustomerId == dto.CustomerId && !x.IsDeleted)
            ?? throw new InvalidOperationException("Choose the customer.");

        if (!customer.IsActive)
        {
            throw new InvalidOperationException($"{customer.CustomerName} is inactive.");
        }

        if (customer.IsWalkIn)
        {
            throw new InvalidOperationException(
                $"{customer.CustomerName} is a walk-in customer : complete the Customer Profile first (a booking needs a named customer).");
        }

        // MB : the model; SP / AC : the items
        MotorBikes? model = null;

        List<BookingLineDto> lines = new();

        if (type.Code == "MB")
        {
            model = await FindModelAsync(dto.MotorBikeId);
        }
        else
        {
            lines = await CheckLinesAsync(type, dto.Lines);
        }

        BookingSwitchesDto switches = await SwitchesAsync(type);

        decimal amount = Math.Round((dto.Debits ?? new()).Sum(x => x.Amount), 2);

        if (switches.MinimumAmount.HasValue && amount < switches.MinimumAmount.Value)
        {
            throw new InvalidOperationException(
                $"The first collection must be at least {Money(switches.MinimumAmount.Value)} (Minimum Booking Amount).");
        }

        BookingSavedDto result = new();

        await InTransactionAsync(
            async () =>
            {
                VoucherNumberDto number = await _numberService.NextAsync(type.Prefix, branchId, date);

                DateTime now = DateTime.UtcNow;

                Bookings booking =
                    new()
                    {
                        ProductType = type.Code,
                        BookingNo = number.VoucherNo,
                        BookingDate = date,
                        BranchId = branchId,
                        CustomerId = customer.CustomerId,
                        CustomerCode = Limit(customer.CustomerCode, 20),
                        CustomerName = Limit(customer.CustomerName, 200),
                        CustomerPhone = Limit(customer.Phone1, 20),
                        MotorBikeId = model?.MotorBikeId ?? 0,
                        ModelName = model != null ? Limit(model.ProductName, 250) : Summary(lines),
                        ValidUntil = switches.ValidityDays.HasValue ? date.AddDays(switches.ValidityDays.Value) : null,
                        ExpectedDate = expected,
                        SalesPersonName = Limit(dto.SalesPersonName, 150),
                        Remarks = Limit(dto.Remarks, 500),
                        AdvanceAmount = amount,
                        Status = StatusOpen,
                        CreatedBy = userId,
                        CreatedDate = now
                    };

                BookingRows.Add(booking);

                await _context.SaveChangesAsync();

                if (lines.Count > 0)
                {
                    await SaveLinesAsync(booking, lines, userId, now);
                }

                ReceiptVoucherSavedDto receipt =
                    await ReceiveAsync(booking, customer, dto.Debits, date, branchId, Limit(dto.Remarks, 200), userId);

                CollectionRows.Add(
                    new BookingCollections
                    {
                        BookingId = booking.BookingId,
                        CollectionDate = date,
                        Amount = amount,
                        ReceiptVoucherId = receipt.ReceiptVoucherId,
                        ReceiptVoucherNo = Limit(receipt.VoucherNo, 30),
                        Remarks = "Booking advance",
                        CreatedBy = userId,
                        CreatedDate = now
                    });

                AddHistory(booking.BookingId, "Create", "Booking Created",
                    $"{booking.BookingNo} : {booking.ModelName} for {booking.CustomerName} ({booking.CustomerCode}); advance {Money(amount)} by {receipt.VoucherNo}.",
                    userId);

                await _context.SaveChangesAsync();

                result.PublicId = booking.PublicId;
                result.BookingNo = booking.BookingNo;
                result.ReceiptVoucherNo = receipt.VoucherNo;
                result.ReceiptVoucherPublicId = receipt.PublicId;
            });

        if (result.PublicId == Guid.Empty)
        {
            result.PublicId =
                await BookingRows.Where(x => x.BookingNo == result.BookingNo).Select(x => x.PublicId).FirstAsync();
        }

        return result;
    }


    //===========================================================
    // Update (open booking : model / items, dates, notes)
    //===========================================================

    public async Task UpdateAsync(string productType, Guid publicId, UpdateBookingDto dto, long userId)
    {
        TypeInfo type = TypeOf(productType);

        Bookings booking = await FindAsync(type, publicId);

        if (booking.Status != StatusOpen)
        {
            throw new InvalidOperationException($"{booking.BookingNo} is {booking.Status} : it cannot be changed.");
        }

        string held = (await HeldByAsync(type, new List<long> { booking.BookingId })).GetValueOrDefault(booking.BookingId, string.Empty);

        DateOnly? expected = OptionalDate(dto?.ExpectedDate, "Expected Date");

        if (expected.HasValue && expected.Value < booking.BookingDate)
        {
            throw new InvalidOperationException("Expected Date cannot be before the booking date.");
        }

        string before = booking.ModelName;

        DateTime now = DateTime.UtcNow;

        await InTransactionAsync(
            async () =>
            {
                if (type.Code == "MB")
                {
                    MotorBikes model = await FindModelAsync(dto?.MotorBikeId ?? 0);

                    if (held.Length > 0 && model.MotorBikeId != booking.MotorBikeId)
                    {
                        throw new InvalidOperationException($"{booking.BookingNo} is on Sales Invoice {held} : the model cannot be changed.");
                    }

                    booking.MotorBikeId = model.MotorBikeId;
                    booking.ModelName = Limit(model.ProductName, 250);
                }
                else
                {
                    List<BookingLineDto> lines = await CheckLinesAsync(type, dto?.Lines);

                    string summary = Summary(lines);

                    if (held.Length > 0)
                    {
                        // The invoice holding it may not see the items change
                        List<BookingLineDto> current =
                            (await LinesOfAsync(type, new List<long> { booking.BookingId }))
                                .GetValueOrDefault(booking.BookingId) ?? new List<BookingLineDto>();

                        string Key(IEnumerable<BookingLineDto> rows) =>
                            string.Join("|", rows.OrderBy(x => x.ProductId).Select(x => $"{x.ProductId}:{x.Quantity:0.##}"));

                        if (Key(current) != Key(lines))
                        {
                            throw new InvalidOperationException($"{booking.BookingNo} is on Sales Invoice {held} : the items cannot be changed.");
                        }
                    }
                    else
                    {
                        await SaveLinesAsync(booking, lines, userId, now);
                    }

                    booking.ModelName = summary;
                }

                booking.ExpectedDate = expected;
                booking.SalesPersonName = Limit(dto?.SalesPersonName, 150);
                booking.Remarks = Limit(dto?.Remarks, 500);
                booking.ModifiedBy = userId;
                booking.ModifiedDate = now;

                AddHistory(booking.BookingId, "Update", "Booking Updated",
                    before == booking.ModelName
                        ? $"{booking.BookingNo} : details updated."
                        : $"{booking.BookingNo} : {before} -> {booking.ModelName}.",
                    userId);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Collect more advance
    //===========================================================

    public async Task<BookingSavedDto> CollectAsync(string productType, Guid publicId, CollectBookingDto dto, long branchId, long userId)
    {
        TypeInfo type = TypeOf(productType);

        Bookings booking = await FindAsync(type, publicId);

        if (booking.Status != StatusOpen)
        {
            throw new InvalidOperationException($"{booking.BookingNo} is {booking.Status} : no more collection.");
        }

        string held = (await HeldByAsync(type, new List<long> { booking.BookingId })).GetValueOrDefault(booking.BookingId, string.Empty);

        if (held.Length > 0)
        {
            throw new InvalidOperationException(
                $"{booking.BookingNo} is on Sales Invoice {held} : collect the money on that invoice (Checkout).");
        }

        if (branchId <= 0)
        {
            throw new InvalidOperationException("Log in with a branch first.");
        }

        DateOnly date = DateOrToday(dto?.Date, "Collection Date");

        if (date < booking.BookingDate)
        {
            throw new InvalidOperationException("Collection Date cannot be before the booking date.");
        }

        CustomerProfiles customer =
            await _context.Set<CustomerProfiles>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.CustomerId == booking.CustomerId)
            ?? throw new InvalidOperationException("The booking's customer was not found.");

        decimal amount = Math.Round((dto?.Debits ?? new()).Sum(x => x.Amount), 2);

        BookingSavedDto result = new() { PublicId = booking.PublicId, BookingNo = booking.BookingNo };

        await InTransactionAsync(
            async () =>
            {
                ReceiptVoucherSavedDto receipt =
                    await ReceiveAsync(booking, customer, dto?.Debits, date, branchId, Limit(dto?.Remarks, 200), userId);

                DateTime now = DateTime.UtcNow;

                CollectionRows.Add(
                    new BookingCollections
                    {
                        BookingId = booking.BookingId,
                        CollectionDate = date,
                        Amount = amount,
                        ReceiptVoucherId = receipt.ReceiptVoucherId,
                        ReceiptVoucherNo = Limit(receipt.VoucherNo, 30),
                        Remarks = Limit(dto?.Remarks, 500),
                        CreatedBy = userId,
                        CreatedDate = now
                    });

                booking.AdvanceAmount += amount;
                booking.ModifiedBy = userId;
                booking.ModifiedDate = now;

                AddHistory(booking.BookingId, "Update", "Advance Collected",
                    $"{booking.BookingNo} : {Money(amount)} by {receipt.VoucherNo}; advance now {Money(booking.AdvanceAmount)}.",
                    userId);

                await _context.SaveChangesAsync();

                result.ReceiptVoucherNo = receipt.VoucherNo;
                result.ReceiptVoucherPublicId = receipt.PublicId;
            });

        return result;
    }


    //===========================================================
    // Cancel : forfeit by Journal Voucher, the rest to refund
    //===========================================================

    public async Task<BookingSavedDto> CancelAsync(string productType, Guid publicId, CancelBookingDto dto, long branchId, long userId)
    {
        TypeInfo type = TypeOf(productType);

        Bookings booking = await FindAsync(type, publicId);

        if (booking.Status != StatusOpen)
        {
            throw new InvalidOperationException($"{booking.BookingNo} is {booking.Status}.");
        }

        string reason = Limit((dto?.Reason ?? string.Empty).Replace("\r", " ").Replace("\n", " "), 500);

        if (reason.Length < 5)
        {
            throw new InvalidOperationException("A reason (at least 5 characters) is required to cancel the booking.");
        }

        string held = (await HeldByAsync(type, new List<long> { booking.BookingId })).GetValueOrDefault(booking.BookingId, string.Empty);

        if (held.Length > 0)
        {
            throw new InvalidOperationException(
                $"{booking.BookingNo} is on Sales Invoice {held} : remove it from the invoice (or delete the draft) first.");
        }

        BookingSwitchesDto switches = await SwitchesAsync(type);

        decimal advance = booking.AdvanceAmount;

        decimal forfeit =
            switches.RefundOnCancel
                ? Math.Round(dto?.ForfeitAmount ?? 0m, 2)
                : advance;

        if (forfeit < 0m || forfeit > advance)
        {
            throw new InvalidOperationException($"The forfeit must be between 0 and the advance ({Money(advance)}).");
        }

        BookingSavedDto result = new() { PublicId = booking.PublicId, BookingNo = booking.BookingNo };

        await InTransactionAsync(
            async () =>
            {
                DateTime now = DateTime.UtcNow;

                if (forfeit > 0m)
                {
                    string income = PostingLedgerCodes.Get(_context, type.PurposeForfeit);

                    CustomerProfiles customer =
                        await _context.Set<CustomerProfiles>()
                            .AsNoTracking()
                            .FirstOrDefaultAsync(x => x.CustomerId == booking.CustomerId)
                        ?? throw new InvalidOperationException("The booking's customer was not found.");

                    string receivable = (customer.ReceivableLedgerCode ?? string.Empty).Trim();

                    if (receivable.Length == 0)
                    {
                        throw new InvalidOperationException(
                            $"{customer.CustomerName} ({customer.CustomerCode}) has no receivable ledger (Customer Profiles).");
                    }

                    string note = Limit($"Booking {booking.BookingNo} forfeit", 250);

                    JournalVoucherSavedDto voucher =
                        await _journalVouchers.CreatePostedAsync(
                            new CreateJournalVoucherDto
                            {
                                VoucherDate = DateText(Today),
                                BranchId = branchId > 0 ? branchId : booking.BranchId,
                                Narration = Limit($"Booking {booking.BookingNo} cancelled ({booking.CustomerName}) : {Money(forfeit)} of the advance forfeited | {reason}", 500),
                                Lines =
                                    new List<JournalVoucherLineDto>
                                    {
                                        new() { Side = "Debit", GroupNo = 1, LedgerType = LedgerTypeCustomer, LedgerCode = receivable, Amount = forfeit, ShortNotes = note },
                                        new() { Side = "Credit", GroupNo = 1, LedgerType = LedgerTypeGeneral, LedgerCode = income, Amount = forfeit, ShortNotes = note }
                                    }
                            },
                            booking.BookingNo,
                            userId);

                    booking.ForfeitVoucherId = voucher.JournalVoucherId;
                    booking.ForfeitVoucherNo = Limit(voucher.VoucherNo, 30);

                    result.ForfeitVoucherNo = voucher.VoucherNo;
                }

                booking.Status = StatusCancelled;
                booking.CancelReason = reason;
                booking.CancelledBy = userId;
                booking.CancelledDate = now;
                booking.ForfeitAmount = forfeit;
                booking.RefundAmount = advance - forfeit;
                booking.ModifiedBy = userId;
                booking.ModifiedDate = now;

                AddHistory(booking.BookingId, "Cancel", "Booking Cancelled",
                    $"{booking.BookingNo} : {reason}. Advance {Money(advance)}; forfeit {Money(forfeit)}{(booking.ForfeitVoucherNo.Length > 0 ? " (" + booking.ForfeitVoucherNo + ")" : string.Empty)}; to refund {Money(booking.RefundAmount)} (customer's ledger).",
                    userId);

                await _context.SaveChangesAsync();
            });

        return result;
    }


    //===========================================================
    // Open bookings of a customer (Sales Invoice of the type)
    //===========================================================

    //===========================================================
    // Delete (soft) : an open booking entered by mistake. Every
    // receipt voucher of its collections is cancelled (Posted ->
    // Cancelled, reversed out of the ledgers), then the booking
    // is hidden. Restore brings it back with new receipts.
    //===========================================================

    public async Task DeleteAsync(string productType, Guid publicId, long userId)
    {
        TypeInfo type = TypeOf(productType);

        Bookings booking = await FindAsync(type, publicId);

        if (booking.Status != StatusOpen)
        {
            throw new InvalidOperationException(
                $"{booking.BookingNo} is {booking.Status}. Only an open booking can be deleted.");
        }

        string held = (await HeldByAsync(type, new List<long> { booking.BookingId })).GetValueOrDefault(booking.BookingId, string.Empty);

        if (held.Length > 0)
        {
            throw new InvalidOperationException(
                $"{booking.BookingNo} is on Sales Invoice {held} : remove it from the invoice (or delete the draft) first.");
        }

        List<BookingCollections> collections =
            await CollectionRows
                .Where(x => x.BookingId == booking.BookingId && x.ReceiptVoucherId.HasValue)
                .OrderBy(x => x.BookingCollectionId)
                .ToListAsync();

        string reason = Limit($"Booking {booking.BookingNo} deleted", 500);

        await InTransactionAsync(
            async () =>
            {
                foreach (BookingCollections c in collections)
                {
                    ReceiptVoucherDto? voucher = await _receiptVouchers.GetByIdAsync(c.ReceiptVoucherId!.Value);

                    // Already cancelled on the Receipt Voucher page
                    if (voucher == null || !string.Equals(voucher.Status, "Posted", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    await _receiptVouchers.CancelAsync(
                        c.ReceiptVoucherId!.Value,
                        new CancelReceiptVoucherDto { CancelDate = DateText(Today), Reason = reason },
                        userId);
                }

                DateTime now = DateTime.UtcNow;

                booking.IsDeleted = true;
                booking.DeletedBy = userId;
                booking.DeletedDate = now;
                booking.ModifiedBy = userId;
                booking.ModifiedDate = now;

                string vouchers = string.Join(", ", collections.Select(x => x.ReceiptVoucherNo).Where(x => x.Length > 0));

                AddHistory(booking.BookingId, "Delete", "Booking Deleted",
                    $"{booking.BookingNo} : {booking.ModelName} for {booking.CustomerName} ({booking.CustomerCode}); advance {Money(booking.AdvanceAmount)} reversed{(vouchers.Length > 0 ? " (" + vouchers + " cancelled)" : string.Empty)}.",
                    userId);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Restore : the most recently deleted booking of the type in
    // the branch. Each collection is received again with a new
    // posted Receipt Voucher (same rows as the cancelled one,
    // dated today).
    //===========================================================

    public async Task<string> RestoreAsync(string productType, long branchId, long userId)
    {
        TypeInfo type = TypeOf(productType);

        Bookings booking =
            await BookingRows
                .Where(x => x.IsDeleted && x.ProductType == type.Code && x.BranchId == branchId)
                .OrderByDescending(x => x.DeletedDate)
                .ThenByDescending(x => x.BookingId)
                .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("There is no deleted booking to restore in this branch.");

        CustomerProfiles customer =
            await _context.Set<CustomerProfiles>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.CustomerId == booking.CustomerId)
            ?? throw new InvalidOperationException("The booking's customer was not found.");

        List<BookingCollections> collections =
            await CollectionRows
                .Where(x => x.BookingId == booking.BookingId && x.ReceiptVoucherId.HasValue)
                .OrderBy(x => x.BookingCollectionId)
                .ToListAsync();

        List<string> receipts = new();

        await InTransactionAsync(
            async () =>
            {
                foreach (BookingCollections c in collections)
                {
                    ReceiptVoucherDto old =
                        await _receiptVouchers.GetByIdAsync(c.ReceiptVoucherId!.Value)
                        ?? throw new InvalidOperationException($"Receipt Voucher {c.ReceiptVoucherNo} was not found.");

                    // Still posted (its cancel was undone) : keep it
                    if (string.Equals(old.Status, "Posted", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    List<ReceiptVoucherDebitDto> debits =
                        old.Debits
                            .Select
                            (
                                d =>
                                    new ReceiptVoucherDebitDto
                                    {
                                        Mode = d.Mode,
                                        LedgerType = d.LedgerType,
                                        SubGroupCode = d.SubGroupCode,
                                        SubGroupName = d.SubGroupName,
                                        LedgerCode = d.LedgerCode,
                                        LedgerName = d.LedgerName,
                                        AccountId = d.AccountId,
                                        Amount = d.Amount,
                                        ShortNotes = d.ShortNotes,
                                        ChargePercent = d.ChargePercent,
                                        ChargeAmount = d.ChargeAmount,
                                        ChargeBorneBy = d.ChargeBorneBy,
                                        CardSetupId = d.CardSetupId,
                                        CardName = d.CardName,
                                        TransactionRef = d.TransactionRef,
                                        TenureMonths = d.TenureMonths,
                                        InterestPercent = d.InterestPercent,
                                        InterestAmount = d.InterestAmount,
                                        TotalCharged = d.TotalCharged,
                                        CheckNo = d.CheckNo,
                                        CheckDate = d.CheckDate,
                                        CheckBank = d.CheckBank
                                    }
                            )
                            .ToList();

                    ReceiptVoucherSavedDto receipt =
                        await ReceiveAsync(booking, customer, debits, Today, booking.BranchId, $"restored (was {c.ReceiptVoucherNo})", userId);

                    c.ReceiptVoucherId = receipt.ReceiptVoucherId;

                    c.ReceiptVoucherNo = Limit(receipt.VoucherNo, 30);

                    receipts.Add(receipt.VoucherNo);
                }

                DateTime now = DateTime.UtcNow;

                booking.IsDeleted = false;
                booking.DeletedBy = null;
                booking.DeletedDate = null;
                booking.ModifiedBy = userId;
                booking.ModifiedDate = now;

                AddHistory(booking.BookingId, "Restore", "Booking Restored",
                    $"{booking.BookingNo} : advance {Money(booking.AdvanceAmount)} received again{(receipts.Count > 0 ? " by " + string.Join(", ", receipts) : string.Empty)}.",
                    userId);

                await _context.SaveChangesAsync();
            });

        return booking.BookingNo;
    }


    // Every booking id of the type (deleted too) : page history
    public async Task<List<long>> BookingIdsAsync(string productType)
    {
        TypeInfo type = TypeOf(productType);

        return await BookingRows
            .AsNoTracking()
            .Where(x => x.ProductType == type.Code)
            .Select(x => x.BookingId)
            .ToListAsync();
    }


    public async Task<List<OpenBookingDto>> GetOpenForCustomerAsync(string productType, long customerId)
    {
        TypeInfo type = TypeOf(productType);

        List<Bookings> rows =
            await BookingRows
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.CustomerId == customerId && x.Status == StatusOpen && x.ProductType == type.Code)
                .OrderBy(x => x.BookingDate)
                .ToListAsync();

        List<long> ids = rows.Select(x => x.BookingId).ToList();

        Dictionary<long, string> held = await HeldByAsync(type, ids);

        Dictionary<long, List<BookingLineDto>> lines = await LinesOfAsync(type, ids);

        DateOnly today = Today;

        return rows
            .Select
            (
                x =>
                    new OpenBookingDto
                    {
                        BookingId = x.BookingId,
                        BookingNo = x.BookingNo,
                        BookingDate = DateText(x.BookingDate),
                        MotorBikeId = x.MotorBikeId,
                        ModelName = x.ModelName,
                        Lines = lines.GetValueOrDefault(x.BookingId) ?? new List<BookingLineDto>(),
                        AdvanceAmount = x.AdvanceAmount,
                        IsExpired = x.ValidUntil.HasValue && x.ValidUntil.Value < today,
                        ValidUntil = DateText(x.ValidUntil),
                        HeldByInvoiceNo = held.GetValueOrDefault(x.BookingId, string.Empty)
                    }
            )
            .ToList();
    }
}