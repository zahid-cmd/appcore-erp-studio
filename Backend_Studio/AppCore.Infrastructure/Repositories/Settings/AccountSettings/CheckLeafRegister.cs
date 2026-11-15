//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Infrastructure.Persistence;

using CheckBookEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.CheckBooks;

using CheckBookLeafEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.CheckBookLeaves;

using SystemConfigurationEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.AccountSettings;


//===============================================================
// Check Leaf Register (Check Books phase 2, 2026-11-15)
//
// The vouchers that write our checks keep the check books' leaves
// in step. Runs inside the voucher's own transaction; changes are
// written by the voucher's SaveChanges.
//
//   Sync    : the voucher's check rows hold their leaves (Issued,
//             with voucher no, payee, amount, date); leaves it
//             held and no longer uses go back to Unused.
//   Release : every leaf of the voucher back to Unused (a draft
//             deleted).
//   Void    : the voucher's leaves become Void (a posted voucher
//             cancelled, a check voided on Check Reconciliation) :
//             that check number is never used again.
//
// A bank account with no check book is not tracked : its check
// numbers stay free text (older data, accounts without books).
// Switch "Check Leaf : Allow Choosing Another Leaf" (missing = ON) :
// OFF = a voucher must take the next unused leaf of the account.
//
// Source types : PV (Payment Voucher), FT (Fund Transfer).
//===============================================================

public sealed record CheckLeafUse
(
    long BankAccountId,
    string CheckNo,
    string PayeeName,
    decimal Amount,
    DateOnly? IssuedDate,
    string Label
);


public static class CheckLeafRegister
{
    public const string PaymentVoucher = "PV";

    public const string FundTransfer = "FT";

    private static string Norm(string? value) =>
        (value ?? string.Empty).Trim().ToUpperInvariant();

    private static string Limit(string? value, int max)
    {
        string text = (value ?? string.Empty).Trim();

        return text.Length > max ? text.Substring(0, max) : text;
    }

    private static async Task<bool> AllowChooseAsync(AppDbContext context)
    {
        bool? on =
            await context.Set<SystemConfigurationEntity>()
                .AsNoTracking()
                .Where(x => x.ConfigurationName == CheckBooksRepository.SwitchAllowChoose && !x.IsDeleted)
                .Select(x => (bool?)x.IsEnabled)
                .FirstOrDefaultAsync();

        return on ?? true;
    }

    private static void Clear(CheckBookLeafEntity leaf, string status, string reason, long userId)
    {
        leaf.Status = status;
        leaf.Reason = reason;
        leaf.StatusBy = userId;
        leaf.StatusDate = DateTime.UtcNow;

        if (status == CheckBooksRepository.Unused)
        {
            leaf.SourceType = string.Empty;
            leaf.SourceId = null;
            leaf.SourceNo = string.Empty;
            leaf.PayeeName = string.Empty;
            leaf.Amount = 0;
            leaf.IssuedDate = null;
        }
    }

    public static async Task SyncAsync
    (
        AppDbContext context,
        string sourceType,
        long sourceId,
        string sourceNo,
        IReadOnlyList<CheckLeafUse> uses,
        long userId
    )
    {
        DbSet<CheckBookLeafEntity> leaves = context.Set<CheckBookLeafEntity>();

        List<CheckBookLeafEntity> held =
            await leaves
                .Where(l => l.SourceType == sourceType && l.SourceId == sourceId && l.Status == CheckBooksRepository.Issued)
                .ToListAsync();

        List<long> accountIds =
            uses.Select(u => u.BankAccountId).Distinct().ToList();

        // accounts with a live check book : their checks are tracked
        List<long> tracked =
            accountIds.Count == 0
                ? new List<long>()
                : await context.Set<CheckBookEntity>()
                    .AsNoTracking()
                    .Where(b => !b.IsDeleted && accountIds.Contains(b.BankAccountId))
                    .Select(b => b.BankAccountId)
                    .Distinct()
                    .ToListAsync();

        bool allowChoose =
            tracked.Count == 0 || await AllowChooseAsync(context);

        HashSet<long> keep = new();

        HashSet<string> seen = new();

        foreach (CheckLeafUse use in uses)
        {
            string number = Norm(use.CheckNo);

            if (!seen.Add($"{use.BankAccountId}|{number}"))
            {
                throw new InvalidOperationException($"{use.Label} : check {use.CheckNo} is used twice in this voucher.");
            }

            if (!tracked.Contains(use.BankAccountId))
            {
                continue;
            }

            CheckBookLeafEntity? leaf =
                held.FirstOrDefault(l => l.BankAccountId == use.BankAccountId && Norm(l.CheckNo) == number && !keep.Contains(l.CheckBookLeafId));

            if (leaf == null)
            {
                // the unused leaves of the account's active books,
                // oldest book first, lowest number first
                List<CheckBookLeafEntity> unused =
                    await (
                        from l in leaves
                        join b in context.Set<CheckBookEntity>() on l.CheckBookId equals b.CheckBookId
                        where !b.IsDeleted && b.IsActive
                              && l.BankAccountId == use.BankAccountId
                              && l.Status == CheckBooksRepository.Unused
                        orderby b.ReceivedDate, b.CheckBookId, l.LeafNo
                        select l)
                    .ToListAsync();

                unused = unused.Where(l => !keep.Contains(l.CheckBookLeafId)).ToList();

                leaf = unused.FirstOrDefault(l => Norm(l.CheckNo) == number);

                if (leaf == null)
                {
                    throw new InvalidOperationException(
                        $"{use.Label} : check {use.CheckNo} is not an unused leaf of this bank account's check books (Settings > Account Settings > Check Books).");
                }

                if (!allowChoose && unused.Count > 0 && unused[0].CheckBookLeafId != leaf.CheckBookLeafId)
                {
                    throw new InvalidOperationException(
                        $"{use.Label} : the next check of this bank account is {unused[0].CheckNo} (choosing another leaf is off).");
                }
            }

            leaf.Status = CheckBooksRepository.Issued;
            leaf.SourceType = sourceType;
            leaf.SourceId = sourceId;
            leaf.SourceNo = Limit(sourceNo, 40);
            leaf.PayeeName = Limit(use.PayeeName, 200);
            leaf.Amount = use.Amount;
            leaf.IssuedDate = use.IssuedDate;
            leaf.Reason = string.Empty;
            leaf.StatusBy = userId;
            leaf.StatusDate = DateTime.UtcNow;

            keep.Add(leaf.CheckBookLeafId);
        }

        foreach (CheckBookLeafEntity old in held.Where(l => !keep.Contains(l.CheckBookLeafId)))
        {
            Clear(old, CheckBooksRepository.Unused, string.Empty, userId);
        }
    }

    // A draft deleted : its leaves are free again
    public static async Task ReleaseAsync
    (
        AppDbContext context,
        string sourceType,
        long sourceId,
        long userId
    )
    {
        List<CheckBookLeafEntity> held =
            await context.Set<CheckBookLeafEntity>()
                .Where(l => l.SourceType == sourceType && l.SourceId == sourceId && l.Status == CheckBooksRepository.Issued)
                .ToListAsync();

        foreach (CheckBookLeafEntity leaf in held)
        {
            Clear(leaf, CheckBooksRepository.Unused, string.Empty, userId);
        }
    }

    // A posted voucher cancelled / a check voided : the leaves are
    // never used again (checkNo : only that check)
    public static async Task VoidAsync
    (
        AppDbContext context,
        string sourceType,
        long sourceId,
        string reason,
        long userId,
        string? checkNo = null
    )
    {
        List<CheckBookLeafEntity> held =
            await context.Set<CheckBookLeafEntity>()
                .Where(l => l.SourceType == sourceType && l.SourceId == sourceId && l.Status == CheckBooksRepository.Issued)
                .ToListAsync();

        string only = Norm(checkNo);

        foreach (CheckBookLeafEntity leaf in held.Where(l => only.Length == 0 || Norm(l.CheckNo) == only))
        {
            Clear(leaf, CheckBooksRepository.Voided, Limit(reason, 300), userId);
        }
    }

    // A voided check made pending again (Check Reconciliation's
    // Undo Void) : its leaf is Issued again
    public static async Task UnvoidAsync
    (
        AppDbContext context,
        string sourceType,
        long sourceId,
        string checkNo,
        long userId
    )
    {
        string only = Norm(checkNo);

        List<CheckBookLeafEntity> voided =
            await context.Set<CheckBookLeafEntity>()
                .Where(l => l.SourceType == sourceType && l.SourceId == sourceId && l.Status == CheckBooksRepository.Voided)
                .ToListAsync();

        foreach (CheckBookLeafEntity leaf in voided.Where(l => Norm(l.CheckNo) == only))
        {
            leaf.Status = CheckBooksRepository.Issued;
            leaf.Reason = string.Empty;
            leaf.StatusBy = userId;
            leaf.StatusDate = DateTime.UtcNow;
        }
    }
}
