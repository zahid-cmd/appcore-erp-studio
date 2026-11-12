//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.MembershipManagement.MembershipAssignment;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.MembershipManagement.MembershipAssignment;
using AppCore.Infrastructure.Persistence;

using MembershipEntity =
    AppCore.Domain.Entities.MembershipManagement.MembershipAssignment.MembershipStatus;

using WindowEntity =
    AppCore.Domain.Entities.MembershipManagement.MembershipAssignment.MembershipServiceWindows;

using MembershipCardEntity =
    AppCore.Domain.Entities.MembershipManagement.MembershipSetup.MembershipCards;

using CustomerEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.CustomerProfiles;

using BranchEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using SalesInvoicesSpEntity =
    AppCore.Domain.Entities.SalesOperations.SparePartsLubricantSales.SalesInvoicesSp;

using SalesInvoicesAcEntity =
    AppCore.Domain.Entities.SalesOperations.AccessoriesSales.SalesInvoicesAc;

using SalesInvoicesMbEntity =
    AppCore.Domain.Entities.SalesOperations.MotorBikeSales.SalesInvoicesMb;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.MembershipManagement.MembershipAssignment;


//===============================================================
// Membership Fees Collection Repository (hand-written, owner
// 2026-11-11; NO Code Sync)
//
// To collect : every Pending membership with a fee not collected
//   (Membership Status makes it; no row here until collected).
// Collect   : Payment Desk, one membership per collection, the
//   payment = the fee exactly; one posted Receipt Voucher :
//   Dr cash / bank / MFS / POS, Cr the card's Membership Fees
//   ledger (MembershipCards.FeeLedgerCode). The membership turns
//   Active (FeeCollected, collected date).
// Cancel collection (owner : only if unused) : membership Active /
//   Suspended, no free service taken, no member discount on an
//   approved / posted sales invoice. The Receipt Voucher is
//   cancelled (its own checks : reconciled cheques etc.), the row
//   is Cancelled and the membership Pending again.
// Refund (owner : full if unused, else none; to the customer's
//   ledger) : the membership was Cancelled on Membership Status,
//   nothing used. Journal Voucher Dr Membership Fees - <card> /
//   Cr the customer's receivable for the whole fee; paid out
//   later by a Payment Voucher. Used = no refund.
// No "without payment" : a membership is Active only once paid.
//===============================================================

public class MembershipFeesCollectionRepository
    : IMembershipFeesCollectionRepository
{
    private const string Paid = "Paid";

    private const string Cancelled = "Cancelled";

    private const string Refunded = "Refunded";

    private const string ToCollect = "To Collect";

    private const string FeePrefix = "MFC-";

    private const string FeeEnrollment = "Enrollment";

    private const string HistoryModule = "Membership Management";

    private const string FeeHistoryEntity = "Membership Fee";

    private const string MembershipHistoryEntity = "Membership Status";

    private const string LedgerTypeCustomer = "Customer";

    private const string LedgerTypeGeneral = "General Ledger";

    // Membership Status values (MembershipStatusRepository)
    private const string MPending = "Pending";

    private const string MActive = "Active";

    private const string MSuspended = "Suspended";

    private const string MCancelled = "Cancelled";


    private readonly AppDbContext _context;

    private readonly IReceiptVoucherRepository _receiptVouchers;

    private readonly IJournalVoucherRepository _journalVouchers;


    public MembershipFeesCollectionRepository(
        AppDbContext context,
        IReceiptVoucherRepository receiptVouchers,
        IJournalVoucherRepository journalVouchers)
    {
        _context = context;
        _receiptVouchers = receiptVouchers;
        _journalVouchers = journalVouchers;
    }


    private DbSet<MembershipFeesCollection> Fees =>
        _context.Set<MembershipFeesCollection>();


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

    private static string DateText(DateOnly? date) =>
        date.HasValue ? DateText(date.Value) : string.Empty;

    private static string Money(decimal value) =>
        value.ToString("N2", CultureInfo.InvariantCulture);

    private static string Limit(string? value, int max)
    {
        string text = (value ?? string.Empty).Replace("\r", " ").Replace("\n", " ").Trim();

        return text.Length > max ? text.Substring(0, max) : text;
    }

    private static DateOnly ParseDate(string text, string label)
    {
        if (DateOnly.TryParseExact(text.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly date))
        {
            return date;
        }

        throw new InvalidOperationException($"{label} is not a valid date.");
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

    private void AddHistory(string entityName, long entityId, string type, string title, string description, long userId)
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = entityName,
                EntityId = entityId,
                ActivityType = type,
                ActivityTitle = title,
                ActivityDescription = Limit(description, 1000),
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });
    }

    private async Task<string> NextFeeNoAsync()
    {
        List<string> nos =
            await Fees.AsNoTracking()
                .Where(x => x.FeeNo.StartsWith(FeePrefix))
                .Select(x => x.FeeNo)
                .ToListAsync();

        int max =
            nos.Select(x => int.TryParse(x.Substring(FeePrefix.Length), NumberStyles.Integer, CultureInfo.InvariantCulture, out int n) ? n : 0)
                .DefaultIfEmpty(0)
                .Max();

        return $"{FeePrefix}{max + 1:000000}";
    }

    // What used a membership since its fee was collected : free
    // services taken, member discounts on approved / posted invoices
    private async Task<Dictionary<long, string>> UsageAsync(List<long> membershipIds)
    {
        Dictionary<long, string> used = new();

        if (membershipIds.Count == 0)
        {
            return used;
        }

        var services =
            await _context.Set<WindowEntity>()
                .AsNoTracking()
                .Where(x => membershipIds.Contains(x.MembershipId) && x.UsedDate != null)
                .GroupBy(x => x.MembershipId)
                .Select(g => new { Id = g.Key, Count = g.Count() })
                .ToListAsync();

        foreach (var s in services)
        {
            used[s.Id] = $"{s.Count} free service{(s.Count == 1 ? string.Empty : "s")} taken";
        }

        List<(long Id, string No)> invoices = new();

        invoices.AddRange(
            (await _context.Set<SalesInvoicesSpEntity>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.MembershipId.HasValue && membershipIds.Contains(x.MembershipId.Value)
                            && x.MembershipDiscount > 0m && (x.Status == "Approved" || x.Status == "Posted"))
                .Select(x => new { Id = x.MembershipId!.Value, x.InvoiceNo })
                .ToListAsync())
            .Select(x => (x.Id, x.InvoiceNo)));

        invoices.AddRange(
            (await _context.Set<SalesInvoicesAcEntity>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.MembershipId.HasValue && membershipIds.Contains(x.MembershipId.Value)
                            && x.MembershipDiscount > 0m && (x.Status == "Approved" || x.Status == "Posted"))
                .Select(x => new { Id = x.MembershipId!.Value, x.InvoiceNo })
                .ToListAsync())
            .Select(x => (x.Id, x.InvoiceNo)));

        invoices.AddRange(
            (await _context.Set<SalesInvoicesMbEntity>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.MembershipId.HasValue && membershipIds.Contains(x.MembershipId.Value)
                            && x.MembershipDiscount > 0m && (x.Status == "Approved" || x.Status == "Posted"))
                .Select(x => new { Id = x.MembershipId!.Value, x.InvoiceNo })
                .ToListAsync())
            .Select(x => (x.Id, x.InvoiceNo)));

        foreach (var group in invoices.GroupBy(x => x.Id))
        {
            string text =
                $"member discount on {string.Join(", ", group.Select(x => x.No).Distinct().Take(2))}{(group.Count() > 2 ? $" (+{group.Count() - 2} more)" : string.Empty)}";

            used[group.Key] =
                used.TryGetValue(group.Key, out string? before)
                    ? $"{before}; {text}"
                    : text;
        }

        return used;
    }


    //===========================================================
    // List : to collect + collections
    //===========================================================

    public async Task<MembershipFeesPageDto> GetAllAsync(long branchId)
    {
        List<MembershipEntity> pending =
            await _context.Set<MembershipEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status == MPending && !x.FeeCollected && x.FeeAmount > 0m)
                .OrderByDescending(x => x.EnrollmentDate)
                .ThenByDescending(x => x.MembershipId)
                .ToListAsync();

        List<MembershipFeesCollection> fees =
            await Fees.AsNoTracking()
                .OrderByDescending(x => x.CollectedDate)
                .ThenByDescending(x => x.MembershipFeeId)
                .ToListAsync();

        List<long> membershipIds =
            pending.Select(x => x.MembershipId)
                .Concat(fees.Select(x => x.MembershipId))
                .Distinct()
                .ToList();

        Dictionary<long, MembershipEntity> memberships =
            await _context.Set<MembershipEntity>()
                .AsNoTracking()
                .Where(x => membershipIds.Contains(x.MembershipId))
                .ToDictionaryAsync(x => x.MembershipId);

        List<long> cardIds = memberships.Values.Select(x => x.MembershipCardId).Distinct().ToList();

        Dictionary<long, string> cards =
            await _context.Set<MembershipCardEntity>()
                .AsNoTracking()
                .Where(x => cardIds.Contains(x.MembershipCardId))
                .ToDictionaryAsync(x => x.MembershipCardId, x => x.CardName);

        List<long> customerIds =
            memberships.Values.Select(x => x.CustomerId)
                .Concat(fees.Select(x => x.CustomerId))
                .Distinct()
                .ToList();

        var customers =
            await _context.Set<CustomerEntity>()
                .AsNoTracking()
                .Where(x => customerIds.Contains(x.CustomerId))
                .Select(x => new { x.CustomerId, x.CustomerCode, x.CustomerName, x.DisplayName, x.Phone1 })
                .ToDictionaryAsync(x => x.CustomerId);

        List<long> branchIds = fees.Select(x => x.BranchId).Distinct().ToList();

        Dictionary<long, string> branches =
            await _context.Set<BranchEntity>()
                .AsNoTracking()
                .Where(x => branchIds.Contains(x.BranchId))
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName);

        List<long> paidIds =
            fees.Where(x => x.Status == Paid).Select(x => x.MembershipId).Distinct().ToList();

        Dictionary<long, string> used = await UsageAsync(paidIds);

        // The live collection of a membership (the latest Paid)
        HashSet<long> latestPaid =
            fees.Where(x => x.Status == Paid)
                .GroupBy(x => x.MembershipId)
                .Select(g => g.OrderByDescending(x => x.MembershipFeeId).First().MembershipFeeId)
                .ToHashSet();

        string CustomerName(long id, string fallback) =>
            customers.TryGetValue(id, out var c)
                ? (string.IsNullOrWhiteSpace(c.DisplayName) ? c.CustomerName : c.DisplayName) ?? fallback
                : fallback;

        List<MembershipFeeRowDto> rows = new();

        foreach (MembershipEntity m in pending)
        {
            customers.TryGetValue(m.CustomerId, out var c);

            rows.Add(
                new MembershipFeeRowDto
                {
                    Kind = "ToCollect",
                    MembershipId = m.MembershipId,
                    MembershipNo = m.MembershipNo,
                    MembershipStatus = m.Status,
                    FeeType = FeeEnrollment,
                    CardName = cards.GetValueOrDefault(m.MembershipCardId, string.Empty),
                    CustomerId = m.CustomerId,
                    CustomerCode = c?.CustomerCode ?? string.Empty,
                    CustomerName = CustomerName(m.CustomerId, string.Empty),
                    CustomerPhone = c?.Phone1 ?? string.Empty,
                    ChassisNo = m.ChassisNo,
                    StartDate = DateText(m.StartDate),
                    ExpiryDate = DateText(m.ExpiryDate),
                    Amount = m.FeeAmount,
                    Date = DateText(m.EnrollmentDate),
                    Status = ToCollect,
                    Note = m.ExpiryDate < Today ? "Its expiry date has passed : cancel the membership on Membership Status." : string.Empty
                });
        }

        foreach (MembershipFeesCollection f in fees)
        {
            memberships.TryGetValue(f.MembershipId, out MembershipEntity? m);

            customers.TryGetValue(f.CustomerId, out var c);

            string mStatus = m?.Status ?? string.Empty;

            bool isUsed = used.TryGetValue(f.MembershipId, out string? usedText);

            bool live = f.Status == Paid && latestPaid.Contains(f.MembershipFeeId);

            bool canCancel = live && !isUsed && (mStatus == MActive || mStatus == MSuspended);

            bool canRefund = live && !isUsed && mStatus == MCancelled;

            string note =
                f.Status != Paid
                    ? string.Empty
                    : isUsed
                        ? $"Used ({usedText}) : no cancel, no refund."
                        : mStatus == MActive || mStatus == MSuspended
                            ? "Refund : cancel the membership on Membership Status first."
                            : mStatus == MCancelled
                                ? string.Empty
                                : $"The membership is {mStatus}.";

            rows.Add(
                new MembershipFeeRowDto
                {
                    Kind = "Fee",
                    MembershipFeeId = f.MembershipFeeId,
                    PublicId = f.PublicId,
                    FeeNo = f.FeeNo,
                    FeeType = f.FeeType,
                    MembershipId = f.MembershipId,
                    MembershipNo = f.MembershipNo,
                    MembershipStatus = mStatus,
                    CardName = f.CardName,
                    CustomerId = f.CustomerId,
                    CustomerCode = f.CustomerCode,
                    CustomerName = f.CustomerName,
                    CustomerPhone = c?.Phone1 ?? string.Empty,
                    ChassisNo = f.ChassisNo,
                    StartDate = m != null ? DateText(m.StartDate) : string.Empty,
                    ExpiryDate = m != null ? DateText(m.ExpiryDate) : string.Empty,
                    Amount = f.Amount,
                    Date = DateText(f.CollectedDate),
                    BranchName = branches.GetValueOrDefault(f.BranchId, string.Empty),
                    ReceiptVoucherNo = f.ReceiptVoucherNo,
                    RefundJournalVoucherNo = f.RefundJournalVoucherNo,
                    RefundDate = DateText(f.RefundDate),
                    Status = f.Status,
                    Reason = f.Status == Cancelled ? f.CancelReason : f.Status == Refunded ? f.RefundReason : string.Empty,
                    Used = f.Status == Paid && isUsed,
                    UsedText = f.Status == Paid ? usedText ?? string.Empty : string.Empty,
                    CanCancel = canCancel,
                    CanRefund = canRefund,
                    Note = note
                });
        }

        string branchName =
            branchId > 0
                ? await _context.Set<BranchEntity>()
                      .AsNoTracking()
                      .Where(x => x.BranchId == branchId)
                      .Select(x => x.BranchName)
                      .FirstOrDefaultAsync() ?? string.Empty
                : string.Empty;

        return new MembershipFeesPageDto
        {
            Today = DateText(Today),
            BranchId = branchId,
            BranchName = branchName,
            Rows = rows
        };
    }


    //===========================================================
    // Collect (Payment Desk -> Receipt Voucher)
    //===========================================================

    public async Task<MembershipFeeResultDto> CollectAsync(
        CollectMembershipFeeDto dto,
        long branchId,
        long userId)
    {
        dto ??= new CollectMembershipFeeDto();

        if (branchId <= 0)
        {
            throw new InvalidOperationException("Choose your branch (top bar) before collecting.");
        }

        DateOnly date =
            string.IsNullOrWhiteSpace(dto.Date) ? Today : ParseDate(dto.Date, "Receipt Date");

        if (date > Today)
        {
            throw new InvalidOperationException("Receipt Date cannot be in the future.");
        }

        List<ReceiptVoucherDebitDto> debits = dto.Debits ?? new List<ReceiptVoucherDebitDto>();

        if (debits.Count == 0)
        {
            throw new InvalidOperationException("Add the payment (Payment Desk).");
        }

        MembershipFeeResultDto result = new();

        await InTransactionAsync(
            async () =>
            {
                MembershipEntity m =
                    await _context.Set<MembershipEntity>()
                        .FirstOrDefaultAsync(x => x.MembershipId == dto.MembershipId && !x.IsDeleted)
                    ?? throw new KeyNotFoundException("The membership was not found (refresh the page).");

                if (m.Status != MPending || m.FeeCollected)
                {
                    throw new InvalidOperationException(
                        $"Membership {m.MembershipNo} is {m.Status}{(m.FeeCollected ? " and its fee is collected" : string.Empty)} : nothing to collect.");
                }

                if (m.FeeAmount <= 0m)
                {
                    throw new InvalidOperationException($"Membership {m.MembershipNo} has no fee.");
                }

                if (m.ExpiryDate < date)
                {
                    throw new InvalidOperationException(
                        $"Membership {m.MembershipNo} expired on {m.ExpiryDate:dd-MMM-yyyy} : cancel it on Membership Status and enroll again.");
                }

                decimal paid = Math.Round(debits.Sum(x => x.Amount), 2);

                if (paid != Math.Round(m.FeeAmount, 2))
                {
                    throw new InvalidOperationException(
                        $"The payment ({Money(paid)}) must equal the fee ({Money(m.FeeAmount)}).");
                }

                MembershipCardEntity card =
                    await _context.Set<MembershipCardEntity>()
                        .AsNoTracking()
                        .FirstOrDefaultAsync(x => x.MembershipCardId == m.MembershipCardId)
                    ?? throw new InvalidOperationException("The membership card was not found.");

                string feeLedger = (card.FeeLedgerCode ?? string.Empty).Trim();

                if (feeLedger.Length == 0)
                {
                    throw new InvalidOperationException(
                        $"Card {card.CardName} has no Membership Fees ledger : save the card once on Membership Cards.");
                }

                CustomerEntity customer =
                    await _context.Set<CustomerEntity>()
                        .AsNoTracking()
                        .FirstOrDefaultAsync(x => x.CustomerId == m.CustomerId)
                    ?? throw new InvalidOperationException("The customer was not found.");

                string customerName =
                    string.IsNullOrWhiteSpace(customer.DisplayName) ? customer.CustomerName : customer.DisplayName;

                string feeNo = await NextFeeNoAsync();

                string narration =
                    string.IsNullOrWhiteSpace(dto.Narration)
                        ? $"Membership fee {m.MembershipNo} ({card.CardName}, chassis {m.ChassisNo}) from {customerName} ({customer.CustomerCode})"
                        : dto.Narration.Trim();

                ReceiptVoucherSavedDto receipt =
                    await _receiptVouchers.CreatePostedAsync(
                        new CreateReceiptVoucherDto
                        {
                            VoucherDate = DateText(date),
                            BranchId = branchId,
                            Narration = Limit(narration, 500),
                            Debits = debits,
                            Credits =
                                new List<ReceiptVoucherCreditDto>
                                {
                                    new ReceiptVoucherCreditDto
                                    {
                                        LedgerType = LedgerTypeGeneral,
                                        LedgerCode = feeLedger,
                                        Amount = m.FeeAmount,
                                        ShortNotes = Limit($"Membership fee {m.MembershipNo} {feeNo}", 250)
                                    }
                                }
                        },
                        Limit($"{m.MembershipNo} {feeNo}", 100),
                        userId);

                DateTime now = DateTime.UtcNow;

                MembershipFeesCollection fee =
                    new()
                    {
                        FeeNo = feeNo,
                        FeeType = FeeEnrollment,
                        MembershipId = m.MembershipId,
                        MembershipNo = Limit(m.MembershipNo, 30),
                        MembershipCardId = card.MembershipCardId,
                        CardName = Limit(card.CardName, 100),
                        FeeLedgerCode = Limit(feeLedger, 30),
                        CustomerId = customer.CustomerId,
                        CustomerCode = Limit(customer.CustomerCode, 20),
                        CustomerName = Limit(customerName, 200),
                        ChassisNo = Limit(m.ChassisNo, 50),
                        Amount = m.FeeAmount,
                        CollectedDate = date,
                        BranchId = branchId,
                        Narration = Limit(narration, 500),
                        ReceiptVoucherId = receipt.ReceiptVoucherId,
                        ReceiptVoucherNo = Limit(receipt.VoucherNo, 50),
                        Status = Paid,
                        CreatedBy = userId,
                        CreatedDate = now
                    };

                Fees.Add(fee);

                m.Status = MActive;
                m.FeeCollected = true;
                m.FeeCollectedDate = date;
                m.StatusDate = date;
                m.StatusReason = string.Empty;
                m.ModifiedBy = userId;
                m.ModifiedDate = now;

                await _context.SaveChangesAsync();

                AddHistory(FeeHistoryEntity, fee.MembershipFeeId, "Create", "Membership Fee Collected",
                    $"{feeNo} : {Money(fee.Amount)} for {m.MembershipNo} collected by {receipt.VoucherNo} on {date:dd-MMM-yyyy}.", userId);

                AddHistory(MembershipHistoryEntity, m.MembershipId, "Update", "Membership Fee Collected",
                    $"Membership {m.MembershipNo} ({m.ChassisNo}) : fee {Money(fee.Amount)} collected ({feeNo}, {receipt.VoucherNo}); now Active.", userId);

                await _context.SaveChangesAsync();

                result.PublicId = fee.PublicId;
                result.FeeNo = feeNo;
                result.MembershipNo = m.MembershipNo;
                result.Amount = fee.Amount;
                result.VoucherNo = receipt.VoucherNo;
                result.VoucherPublicId = receipt.PublicId;
            });

        return result;
    }


    //===========================================================
    // Cancel a collection (unused only)
    //===========================================================

    private async Task<(MembershipFeesCollection Fee, MembershipEntity Membership)> LiveFeeAsync(Guid publicId)
    {
        MembershipFeesCollection fee =
            await Fees.FirstOrDefaultAsync(x => x.PublicId == publicId)
            ?? throw new KeyNotFoundException("The collection was not found (refresh the page).");

        if (fee.Status != Paid)
        {
            throw new InvalidOperationException($"{fee.FeeNo} is {fee.Status}.");
        }

        bool later =
            await Fees.AsNoTracking()
                .AnyAsync(x => x.MembershipId == fee.MembershipId && x.Status == Paid && x.MembershipFeeId > fee.MembershipFeeId);

        if (later)
        {
            throw new InvalidOperationException($"{fee.FeeNo} is not the membership's latest collection.");
        }

        MembershipEntity m =
            await _context.Set<MembershipEntity>()
                .FirstOrDefaultAsync(x => x.MembershipId == fee.MembershipId && !x.IsDeleted)
            ?? throw new InvalidOperationException($"The membership of {fee.FeeNo} was not found.");

        Dictionary<long, string> used = await UsageAsync(new List<long> { m.MembershipId });

        if (used.TryGetValue(m.MembershipId, out string? usedText))
        {
            throw new InvalidOperationException(
                $"Membership {m.MembershipNo} was used ({usedText}) : its fee can no longer be cancelled or refunded.");
        }

        return (fee, m);
    }

    private static string ReasonOf(MembershipFeeReasonDto? dto, string action)
    {
        string reason = Limit(dto?.Reason, 500);

        if (reason.Length < 5)
        {
            throw new InvalidOperationException($"A reason (at least 5 characters) is required to {action}.");
        }

        return reason;
    }

    public async Task<MembershipFeeResultDto> CancelCollectionAsync(
        Guid publicId,
        MembershipFeeReasonDto dto,
        long userId)
    {
        string reason = ReasonOf(dto, "cancel the collection");

        MembershipFeeResultDto result = new();

        await InTransactionAsync(
            async () =>
            {
                (MembershipFeesCollection fee, MembershipEntity m) = await LiveFeeAsync(publicId);

                if (m.Status != MActive && m.Status != MSuspended)
                {
                    throw new InvalidOperationException(
                        m.Status == MCancelled
                            ? $"Membership {m.MembershipNo} is Cancelled : refund the fee instead."
                            : $"Membership {m.MembershipNo} is {m.Status} : its collection cannot be cancelled.");
                }

                if (fee.ReceiptVoucherId.HasValue)
                {
                    await _receiptVouchers.CancelAsync(
                        fee.ReceiptVoucherId.Value,
                        new CancelReceiptVoucherDto
                        {
                            CancelDate = string.Empty,
                            Reason = Limit($"Membership fee {fee.FeeNo} ({m.MembershipNo}) cancelled : {reason}", 500)
                        },
                        userId);
                }

                DateTime now = DateTime.UtcNow;

                fee.Status = Cancelled;
                fee.CancelReason = reason;
                fee.CancelledBy = userId;
                fee.CancelledDate = now;
                fee.ModifiedBy = userId;
                fee.ModifiedDate = now;

                m.Status = MPending;
                m.FeeCollected = false;
                m.FeeCollectedDate = null;
                m.StatusDate = null;
                m.StatusReason = string.Empty;
                m.ModifiedBy = userId;
                m.ModifiedDate = now;

                AddHistory(FeeHistoryEntity, fee.MembershipFeeId, "Cancel", "Membership Fee Collection Cancelled",
                    $"{fee.FeeNo} ({Money(fee.Amount)}, {fee.ReceiptVoucherNo}) cancelled : {reason}", userId);

                AddHistory(MembershipHistoryEntity, m.MembershipId, "Update", "Membership Fee Collection Cancelled",
                    $"Membership {m.MembershipNo} ({m.ChassisNo}) : collection {fee.FeeNo} cancelled ({reason}); Pending again.", userId);

                await _context.SaveChangesAsync();

                result.PublicId = fee.PublicId;
                result.FeeNo = fee.FeeNo;
                result.MembershipNo = m.MembershipNo;
                result.Amount = fee.Amount;
                result.VoucherNo = fee.ReceiptVoucherNo;
            });

        return result;
    }


    //===========================================================
    // Refund (membership cancelled, unused) : Journal Voucher
    //===========================================================

    public async Task<MembershipFeeResultDto> RefundAsync(
        Guid publicId,
        MembershipFeeReasonDto dto,
        long branchId,
        long userId)
    {
        string reason = ReasonOf(dto, "refund the fee");

        MembershipFeeResultDto result = new();

        await InTransactionAsync(
            async () =>
            {
                (MembershipFeesCollection fee, MembershipEntity m) = await LiveFeeAsync(publicId);

                if (m.Status != MCancelled)
                {
                    throw new InvalidOperationException(
                        $"Membership {m.MembershipNo} is {m.Status} : cancel it on Membership Status first (a refund is given only for a cancelled membership).");
                }

                CustomerEntity customer =
                    await _context.Set<CustomerEntity>()
                        .AsNoTracking()
                        .FirstOrDefaultAsync(x => x.CustomerId == fee.CustomerId)
                    ?? throw new InvalidOperationException("The customer was not found.");

                string receivable = (customer.ReceivableLedgerCode ?? string.Empty).Trim();

                if (receivable.Length == 0)
                {
                    throw new InvalidOperationException(
                        $"{fee.CustomerName} ({fee.CustomerCode}) has no receivable ledger (Customer Profiles).");
                }

                string feeLedger = fee.FeeLedgerCode.Trim();

                if (feeLedger.Length == 0)
                {
                    feeLedger =
                        (await _context.Set<MembershipCardEntity>()
                            .AsNoTracking()
                            .Where(x => x.MembershipCardId == fee.MembershipCardId)
                            .Select(x => x.FeeLedgerCode)
                            .FirstOrDefaultAsync() ?? string.Empty).Trim();
                }

                if (feeLedger.Length == 0)
                {
                    throw new InvalidOperationException($"Card {fee.CardName} has no Membership Fees ledger.");
                }

                long branch = branchId > 0 ? branchId : fee.BranchId;

                DateOnly today = Today;

                string reference = Limit($"{fee.MembershipNo} {fee.FeeNo} refund", 100);

                JournalVoucherSavedDto journal =
                    await _journalVouchers.CreatePostedAsync(
                        new CreateJournalVoucherDto
                        {
                            VoucherDate = DateText(today),
                            BranchId = branch,
                            Narration = Limit($"Membership fee refund {fee.FeeNo} ({fee.MembershipNo}, {fee.CardName}) to {fee.CustomerName} ({fee.CustomerCode}) : {reason}", 500),
                            Lines =
                                new List<JournalVoucherLineDto>
                                {
                                    new JournalVoucherLineDto
                                    {
                                        Side = "Debit",
                                        GroupNo = 1,
                                        LedgerType = LedgerTypeGeneral,
                                        LedgerCode = feeLedger,
                                        Amount = fee.Amount,
                                        ShortNotes = Limit(reference, 250)
                                    },
                                    new JournalVoucherLineDto
                                    {
                                        Side = "Credit",
                                        GroupNo = 1,
                                        LedgerType = LedgerTypeCustomer,
                                        LedgerCode = receivable,
                                        Amount = fee.Amount,
                                        ShortNotes = Limit(reference, 250)
                                    }
                                }
                        },
                        reference,
                        userId);

                DateTime now = DateTime.UtcNow;

                fee.Status = Refunded;
                fee.RefundDate = today;
                fee.RefundReason = reason;
                fee.RefundJournalVoucherId = journal.JournalVoucherId;
                fee.RefundJournalVoucherNo = Limit(journal.VoucherNo, 50);
                fee.RefundedBy = userId;
                fee.ModifiedBy = userId;
                fee.ModifiedDate = now;

                AddHistory(FeeHistoryEntity, fee.MembershipFeeId, "Refund", "Membership Fee Refunded",
                    $"{fee.FeeNo} : {Money(fee.Amount)} credited to {fee.CustomerName} ({fee.CustomerCode}) by {journal.VoucherNo} : {reason}", userId);

                AddHistory(MembershipHistoryEntity, m.MembershipId, "Update", "Membership Fee Refunded",
                    $"Membership {m.MembershipNo} ({m.ChassisNo}) : fee {Money(fee.Amount)} refunded to the customer's ledger ({journal.VoucherNo}).", userId);

                await _context.SaveChangesAsync();

                result.PublicId = fee.PublicId;
                result.FeeNo = fee.FeeNo;
                result.MembershipNo = m.MembershipNo;
                result.Amount = fee.Amount;
                result.VoucherNo = journal.VoucherNo;
                result.VoucherPublicId = journal.PublicId;
            });

        return result;
    }
}
