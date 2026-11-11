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
using AppCore.Domain.Entities.SalesOperations.BookingManagement;
using AppCore.Domain.Entities.SalesOperations.MotorBikeSales;
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
// Bookings repository (motor bikes; BookingsMB_Engine.sql)
//
//   Create  : booking (BKMB number) + its first collection : one
//             Receipt Voucher, Dr the Payment Desk rows / Cr the
//             customer's own ledger (advance).
//   Collect : more advance on an open booking (same voucher).
//   Cancel  : reason; forfeit (Refund on Cancel OFF : all) by a
//             Journal Voucher Dr customer / Cr BOOKING-FORFEIT-MB;
//             the rest stays on the customer's ledger (refund by
//             Payment Voucher).
//   Sales Invoice - MB : takes the advance as paid; Post converts
//   the booking, cancelling the invoice re-opens it (sales engine).
//===============================================================

public class BookingsRepository
    : IBookingsRepository
{
    private const string Prefix = "BKMB";

    private const string StatusOpen = "Open";

    private const string StatusConverted = "Converted";

    private const string StatusCancelled = "Cancelled";

    private const string LedgerTypeCustomer = "Customer";

    private const string LedgerTypeGeneral = "General Ledger";

    private const string PurposeForfeit = "BOOKING-FORFEIT-MB";

    private const string HistoryModule = "Sales Operations";

    private const string HistoryEntity = "Booking";

    // Switches (Bookings page)
    private const string SwitchMinimum = "CFG-MOD-008-0091";

    private const string SwitchValidity = "CFG-MOD-008-0092";

    private const string SwitchRefund = "CFG-MOD-008-0093";

    private const string SwitchForfeit = "CFG-MOD-008-0094";

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
    // Switches
    //===========================================================

    private async Task<BookingSwitchesDto> SwitchesAsync()
    {
        string[] codes = { SwitchMinimum, SwitchValidity, SwitchRefund, SwitchForfeit };

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
        bool refundRow = rows.Any(x => x.ConfigurationCode == SwitchRefund);

        decimal? minimum = rows.Any(x => x.ConfigurationCode == SwitchMinimum) ? Number(SwitchMinimum) : 1000m;

        decimal? validity = rows.Any(x => x.ConfigurationCode == SwitchValidity) ? Number(SwitchValidity) : 30m;

        return new BookingSwitchesDto
        {
            MinimumAmount = minimum.HasValue && minimum.Value > 0 ? minimum : null,
            ValidityDays = validity.HasValue && validity.Value >= 1 ? (int)Math.Min(validity.Value, 3650m) : null,
            RefundOnCancel = !refundRow || rows.First(x => x.ConfigurationCode == SwitchRefund).IsEnabled,
            ForfeitPercent = Math.Clamp(Number(SwitchForfeit) ?? 0m, 0m, 100m)
        };
    }


    //===========================================================
    // Page
    //===========================================================

    public async Task<BookingsPageDto> GetPageAsync(long branchId)
    {
        List<Bookings> bookings =
            await BookingRows
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
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

        Dictionary<long, string> held = await HeldByAsync(ids);

        List<long> branchIds =
            bookings.Select(x => x.BranchId).Append(branchId).Distinct().ToList();

        Dictionary<long, string> branches =
            await _context.Set<Branches>()
                .AsNoTracking()
                .Where(x => branchIds.Contains(x.BranchId))
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName);

        List<string> voucherNos =
            collections.Select(x => x.ReceiptVoucherNo).Where(x => x.Length > 0).Distinct().ToList();

        DateOnly today = Today;

        Dictionary<long, Bookings> byId = bookings.ToDictionary(x => x.BookingId);

        BookingsPageDto result =
            new()
            {
                Today = DateText(today),
                BranchId = branchId,
                BranchName = branches.GetValueOrDefault(branchId, string.Empty),
                Switches = await SwitchesAsync(),
                Models =
                    await _context.Set<MotorBikes>()
                        .AsNoTracking()
                        .Where(x => !x.IsDeleted && x.IsActive)
                        .OrderBy(x => x.ProductName)
                        .Select(x => new BookingModelDto { MotorBikeId = x.MotorBikeId, ProductCode = x.ProductCode, ProductName = x.ProductName })
                        .ToListAsync()
            };

        foreach (Bookings x in bookings)
        {
            result.Bookings.Add(
                new BookingRowDto
                {
                    BookingId = x.BookingId,
                    PublicId = x.PublicId,
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


    // Bookings held by a draft / approved Sales Invoice - MB
    private async Task<Dictionary<long, string>> HeldByAsync(List<long> bookingIds)
    {
        if (bookingIds.Count == 0)
        {
            return new Dictionary<long, string>();
        }

        var rows =
            await _context.Set<SalesInvoicesMb>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted
                            && x.BookingId.HasValue
                            && bookingIds.Contains(x.BookingId.Value)
                            && (x.Status == "Draft" || x.Status == "Approved"))
                .Select(x => new { BookingId = x.BookingId!.Value, x.InvoiceNo })
                .ToListAsync();

        return rows
            .GroupBy(x => x.BookingId)
            .ToDictionary(g => g.Key, g => g.First().InvoiceNo);
    }


    private async Task<Bookings> FindAsync(Guid publicId)
    {
        return await BookingRows.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
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

    public async Task<BookingSavedDto> CreateAsync(CreateBookingDto dto, long branchId, long userId)
    {
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

        MotorBikes model = await FindModelAsync(dto.MotorBikeId);

        BookingSwitchesDto switches = await SwitchesAsync();

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
                VoucherNumberDto number = await _numberService.NextAsync(Prefix, branchId, date);

                DateTime now = DateTime.UtcNow;

                Bookings booking =
                    new()
                    {
                        BookingNo = number.VoucherNo,
                        BookingDate = date,
                        BranchId = branchId,
                        CustomerId = customer.CustomerId,
                        CustomerCode = Limit(customer.CustomerCode, 20),
                        CustomerName = Limit(customer.CustomerName, 200),
                        CustomerPhone = Limit(customer.Phone1, 20),
                        MotorBikeId = model.MotorBikeId,
                        ModelName = Limit(model.ProductName, 250),
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
    // Update (open booking : model, dates, notes)
    //===========================================================

    public async Task UpdateAsync(Guid publicId, UpdateBookingDto dto, long userId)
    {
        Bookings booking = await FindAsync(publicId);

        if (booking.Status != StatusOpen)
        {
            throw new InvalidOperationException($"{booking.BookingNo} is {booking.Status} : it cannot be changed.");
        }

        string held = (await HeldByAsync(new List<long> { booking.BookingId })).GetValueOrDefault(booking.BookingId, string.Empty);

        MotorBikes model = await FindModelAsync(dto.MotorBikeId);

        if (held.Length > 0 && model.MotorBikeId != booking.MotorBikeId)
        {
            throw new InvalidOperationException($"{booking.BookingNo} is on Sales Invoice {held} : the model cannot be changed.");
        }

        DateOnly? expected = OptionalDate(dto.ExpectedDate, "Expected Date");

        if (expected.HasValue && expected.Value < booking.BookingDate)
        {
            throw new InvalidOperationException("Expected Date cannot be before the booking date.");
        }

        string before = booking.ModelName;

        booking.MotorBikeId = model.MotorBikeId;
        booking.ModelName = Limit(model.ProductName, 250);
        booking.ExpectedDate = expected;
        booking.SalesPersonName = Limit(dto.SalesPersonName, 150);
        booking.Remarks = Limit(dto.Remarks, 500);
        booking.ModifiedBy = userId;
        booking.ModifiedDate = DateTime.UtcNow;

        AddHistory(booking.BookingId, "Update", "Booking Updated",
            before == booking.ModelName
                ? $"{booking.BookingNo} : details updated."
                : $"{booking.BookingNo} : model {before} -> {booking.ModelName}.",
            userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Collect more advance
    //===========================================================

    public async Task<BookingSavedDto> CollectAsync(Guid publicId, CollectBookingDto dto, long branchId, long userId)
    {
        Bookings booking = await FindAsync(publicId);

        if (booking.Status != StatusOpen)
        {
            throw new InvalidOperationException($"{booking.BookingNo} is {booking.Status} : no more collection.");
        }

        string held = (await HeldByAsync(new List<long> { booking.BookingId })).GetValueOrDefault(booking.BookingId, string.Empty);

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

    public async Task<BookingSavedDto> CancelAsync(Guid publicId, CancelBookingDto dto, long branchId, long userId)
    {
        Bookings booking = await FindAsync(publicId);

        if (booking.Status != StatusOpen)
        {
            throw new InvalidOperationException($"{booking.BookingNo} is {booking.Status}.");
        }

        string reason = Limit((dto?.Reason ?? string.Empty).Replace("\r", " ").Replace("\n", " "), 500);

        if (reason.Length < 5)
        {
            throw new InvalidOperationException("A reason (at least 5 characters) is required to cancel the booking.");
        }

        string held = (await HeldByAsync(new List<long> { booking.BookingId })).GetValueOrDefault(booking.BookingId, string.Empty);

        if (held.Length > 0)
        {
            throw new InvalidOperationException(
                $"{booking.BookingNo} is on Sales Invoice {held} : remove it from the invoice (or delete the draft) first.");
        }

        BookingSwitchesDto switches = await SwitchesAsync();

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
                    string income = PostingLedgerCodes.Get(_context, PurposeForfeit);

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
    // Open bookings of a customer (Sales Invoice - MB)
    //===========================================================

    public async Task<List<OpenBookingDto>> GetOpenForCustomerAsync(long customerId)
    {
        List<Bookings> rows =
            await BookingRows
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.CustomerId == customerId && x.Status == StatusOpen)
                .OrderBy(x => x.BookingDate)
                .ToListAsync();

        Dictionary<long, string> held = await HeldByAsync(rows.Select(x => x.BookingId).ToList());

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
                        AdvanceAmount = x.AdvanceAmount,
                        IsExpired = x.ValidUntil.HasValue && x.ValidUntil.Value < today,
                        ValidUntil = DateText(x.ValidUntil),
                        HeldByInvoiceNo = held.GetValueOrDefault(x.BookingId, string.Empty)
                    }
            )
            .ToList();
    }
}
