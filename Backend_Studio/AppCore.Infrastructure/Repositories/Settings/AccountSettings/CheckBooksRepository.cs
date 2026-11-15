//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using Microsoft.EntityFrameworkCore;
using AppCore.Application.Settings.AccountSettings.CheckBooks;
using AppCore.Domain.Common;
using AppCore.Infrastructure.Persistence;

using CheckBookEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.CheckBooks;

using CheckBookLeafEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.CheckBookLeaves;

using BankAccountEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.BankAccounts;

using CheckPrintLayoutEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.CheckPrintLayouts;

using SystemConfigurationEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.AccountSettings;


//===============================================================
// Check Books Repository (hand-written page, 2026-11-15; NEVER run
// Code Sync for it)
//
//   Code CB-0001 (deleted rows count, never reused).
//   A book belongs to one of our bank accounts with Payment = Yes.
//   Range : Start No (as typed : leading zeros set the width of the
//   check numbers) + Leaves (1 - 200). Two live books of the same
//   account and prefix may not share a number.
//   One leaf row per number : Unused / Issued / Cancelled / Lost /
//   Void. Once a leaf is used the account, prefix and range are
//   fixed (only Book No, date, remarks and status change), and the
//   book cannot be deleted.
//   Cancelled / Lost are set here (Unused only, with a reason) and
//   can be undone; Issued / Void come from the vouchers (phase 2).
//
//   Switches (read by name; missing = the default) :
//     "Check Leaf : Allow Choosing Another Leaf"   default ON
//     "Low Check Leaf Warning" (value = leaves)     default ON, 10
//===============================================================

public class CheckBooksRepository
    : ICheckBooksRepository
{
    private const string HistoryModule = "Settings";

    private const string HistoryEntity = "CheckBooks";

    private const int MaxLeaves = 200;

    public const string SwitchAllowChoose = "Check Leaf : Allow Choosing Another Leaf";

    public const string SwitchLowLeaf = "Low Check Leaf Warning";

    public const string Unused = "Unused";

    public const string Issued = "Issued";

    public const string Cancelled = "Cancelled";

    public const string Lost = "Lost";

    public const string Voided = "Void";

    private readonly AppDbContext _context;

    public CheckBooksRepository(
        AppDbContext context)
    {
        _context = context;
    }

    private DbSet<CheckBookEntity> Books => _context.Set<CheckBookEntity>();

    private DbSet<CheckBookLeafEntity> Leaves => _context.Set<CheckBookLeafEntity>();

    private DbSet<BankAccountEntity> BankAccounts => _context.Set<BankAccountEntity>();

    private DbSet<CheckPrintLayoutEntity> PrintLayouts => _context.Set<CheckPrintLayoutEntity>();


    //===========================================================
    // Helpers
    //===========================================================

    private static string Clean(string? value) =>
        string.Join(" ", (value ?? string.Empty).Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries));

    private static string Limited(string? value, int max, string label)
    {
        string text = Clean(value);

        if (text.Length > max)
        {
            throw new InvalidOperationException($"{label} cannot be longer than {max} characters.");
        }

        return text;
    }

    private static string Day(DateOnly? value) =>
        value.HasValue ? value.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) : string.Empty;

    private static string Stamp(DateTime? value) =>
        value.HasValue ? value.Value.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture) : string.Empty;

    // Prefix + the number, padded to the width of the typed start
    public static string CheckNumber(string prefix, long number, int width) =>
        prefix + (width > 0 ? number.ToString(CultureInfo.InvariantCulture).PadLeft(width, '0') : number.ToString(CultureInfo.InvariantCulture));

    private static string NextCode(IEnumerable<string> codes)
    {
        int highest = 0;

        foreach (string code in codes)
        {
            string value = (code ?? string.Empty).Trim();

            if (value.StartsWith("CB-", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value.Substring(3), out int number)
                && number > highest)
            {
                highest = number;
            }
        }

        return $"CB-{highest + 1:D4}";
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

    private async Task<(bool Enabled, string Value)?> SwitchAsync(string name)
    {
        var row =
            await _context.Set<SystemConfigurationEntity>()
                .AsNoTracking()
                .Where(x => x.ConfigurationName == name && !x.IsDeleted)
                .Select(x => new { x.IsEnabled, x.Value })
                .FirstOrDefaultAsync();

        return row == null ? null : (row.IsEnabled, row.Value ?? string.Empty);
    }

    public async Task<bool> AllowChooseLeafAsync()
    {
        var s = await SwitchAsync(SwitchAllowChoose);

        return s?.Enabled ?? true;
    }

    // 0 = the warning is off
    public async Task<int> LowLeafThresholdAsync()
    {
        var s = await SwitchAsync(SwitchLowLeaf);

        if (s == null)
        {
            return 10;
        }

        if (!s.Value.Enabled)
        {
            return 0;
        }

        return int.TryParse(s.Value.Value, out int n) && n > 0 ? n : 10;
    }

    private static string AccountName(BankAccountEntity a) =>
        !string.IsNullOrWhiteSpace(a.DisplayName) ? a.DisplayName : a.BankAccountName;

    // Unused leaves of the active, live books, per bank account
    private async Task<Dictionary<long, int>> UnusedByAccountAsync()
    {
        var activeBooks =
            Books.AsNoTracking().Where(b => !b.IsDeleted && b.IsActive).Select(b => b.CheckBookId);

        return await Leaves.AsNoTracking()
            .Where(l => l.Status == Unused && activeBooks.Contains(l.CheckBookId))
            .GroupBy(l => l.BankAccountId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);
    }

    private async Task<CheckBookEntity> FindAsync(Guid publicId)
    {
        return await Books.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The check book was not found.");
    }

    private async Task<CheckBookDto> ReadAsync(CheckBookEntity b)
    {
        BankAccountEntity? account =
            await BankAccounts.AsNoTracking().FirstOrDefaultAsync(x => x.BankAccountId == b.BankAccountId);

        List<CheckBookLeafEntity> leaves =
            await Leaves.AsNoTracking()
                .Where(x => x.CheckBookId == b.CheckBookId)
                .OrderBy(x => x.LeafNo)
                .ToListAsync();

        return new CheckBookDto
        {
            CheckBookId = b.CheckBookId,
            PublicId = b.PublicId,
            Code = b.Code,
            BankAccountId = b.BankAccountId,
            BankAccountName = account == null ? string.Empty : AccountName(account),
            Bank = account?.Bank ?? string.Empty,
            AccountNumber = account?.FullAccountNumber ?? string.Empty,
            BookNo = b.BookNo,
            Prefix = b.Prefix,
            StartNo = CheckNumber(string.Empty, b.StartNo, b.NumberWidth),
            EndNo = CheckNumber(string.Empty, b.EndNo, b.NumberWidth),
            LeafCount = b.LeafCount,
            ReceivedDate = Day(b.ReceivedDate),
            Remarks = b.Remarks,
            IsActive = b.IsActive,
            RangeLocked = leaves.Any(l => l.Status != Unused),
            Leaves = leaves
                .Select(l => new CheckBookLeafDto
                {
                    CheckBookLeafId = l.CheckBookLeafId,
                    LeafNo = l.LeafNo,
                    CheckNo = l.CheckNo,
                    Status = l.Status,
                    SourceType = l.SourceType,
                    SourceNo = l.SourceNo,
                    PayeeName = l.PayeeName,
                    Amount = l.Amount,
                    IssuedDate = Day(l.IssuedDate),
                    Reason = l.Reason,
                    StatusDate = Stamp(l.StatusDate)
                })
                .ToList()
        };
    }


    //===========================================================
    // Read
    //===========================================================

    public async Task<List<CheckBookListItemDto>> GetListAsync()
    {
        List<CheckBookEntity> books =
            await Books.AsNoTracking().Where(x => !x.IsDeleted).OrderBy(x => x.Code).ToListAsync();

        List<long> ids = books.Select(x => x.CheckBookId).ToList();

        List<long> accountIds = books.Select(x => x.BankAccountId).Distinct().ToList();

        var accounts =
            await BankAccounts.AsNoTracking()
                .Where(x => accountIds.Contains(x.BankAccountId))
                .ToDictionaryAsync(x => x.BankAccountId);

        var counts =
            await Leaves.AsNoTracking()
                .Where(x => ids.Contains(x.CheckBookId))
                .GroupBy(x => new { x.CheckBookId, x.Status })
                .Select(g => new { g.Key.CheckBookId, g.Key.Status, Count = g.Count() })
                .ToListAsync();

        var nextLeaves =
            await Leaves.AsNoTracking()
                .Where(x => ids.Contains(x.CheckBookId) && x.Status == Unused)
                .GroupBy(x => x.CheckBookId)
                .Select(g => new { CheckBookId = g.Key, LeafNo = g.Min(l => l.LeafNo) })
                .ToListAsync();

        Dictionary<long, int> unused = await UnusedByAccountAsync();

        int threshold = await LowLeafThresholdAsync();

        int CountOf(long bookId, string status) =>
            counts.Where(c => c.CheckBookId == bookId && c.Status == status).Sum(c => c.Count);

        return books
            .Select(b =>
            {
                accounts.TryGetValue(b.BankAccountId, out BankAccountEntity? a);

                int accountUnused = unused.TryGetValue(b.BankAccountId, out int n) ? n : 0;

                var next = nextLeaves.FirstOrDefault(x => x.CheckBookId == b.CheckBookId);

                return new CheckBookListItemDto
                {
                    PublicId = b.PublicId,
                    Code = b.Code,
                    BankAccountId = b.BankAccountId,
                    BankAccountName = a == null ? $"Bank account {b.BankAccountId}" : AccountName(a),
                    Bank = a?.Bank ?? string.Empty,
                    AccountNumber = a?.FullAccountNumber ?? string.Empty,
                    BookNo = b.BookNo,
                    FirstCheckNo = CheckNumber(b.Prefix, b.StartNo, b.NumberWidth),
                    LastCheckNo = CheckNumber(b.Prefix, b.EndNo, b.NumberWidth),
                    LeafCount = b.LeafCount,
                    Unused = CountOf(b.CheckBookId, Unused),
                    Issued = CountOf(b.CheckBookId, Issued),
                    Cancelled = CountOf(b.CheckBookId, Cancelled),
                    Lost = CountOf(b.CheckBookId, Lost),
                    Void = CountOf(b.CheckBookId, Voided),
                    NextCheckNo = next == null ? string.Empty : CheckNumber(b.Prefix, next.LeafNo, b.NumberWidth),
                    ReceivedDate = Day(b.ReceivedDate),
                    IsActive = b.IsActive,
                    AccountUnused = accountUnused,
                    LowLeaf = threshold > 0 && accountUnused < threshold
                };
            })
            .ToList();
    }

    public async Task<CheckBookDto> GetAsync(Guid publicId)
    {
        CheckBookEntity b =
            await Books.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The check book was not found.");

        return await ReadAsync(b);
    }

    public async Task<CheckBookDefaultsDto> GetDefaultsAsync()
    {
        string next =
            NextCode(await Books.AsNoTracking().Select(x => x.Code).ToListAsync());

        List<BankAccountEntity> accounts =
            await BankAccounts.AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status && x.PaymentAccount)
                .OrderBy(x => x.BankAccountCode)
                .ToListAsync();

        Dictionary<long, int> unused = await UnusedByAccountAsync();

        int threshold = await LowLeafThresholdAsync();

        // the last live book of each account : the next start number
        var lastBooks =
            await Books.AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => new { x.BankAccountId, x.Prefix, x.EndNo, x.NumberWidth, x.CheckBookId })
                .ToListAsync();

        return new CheckBookDefaultsDto
        {
            NextCode = next,
            LowLeafThreshold = threshold,
            AllowChooseLeaf = await AllowChooseLeafAsync(),
            BankAccounts = accounts
                .Select(a =>
                {
                    int n = unused.TryGetValue(a.BankAccountId, out int c) ? c : 0;

                    var last =
                        lastBooks
                            .Where(x => x.BankAccountId == a.BankAccountId)
                            .OrderByDescending(x => x.EndNo)
                            .ThenByDescending(x => x.CheckBookId)
                            .FirstOrDefault();

                    return new CheckBookBankAccountDto
                    {
                        BankAccountId = a.BankAccountId,
                        Code = a.BankAccountCode,
                        Name = AccountName(a),
                        Bank = a.Bank,
                        AccountNumber = a.FullAccountNumber,
                        UnusedLeaves = n,
                        LowLeaf = threshold > 0 && n < threshold,
                        SuggestedStartNo = last == null ? string.Empty : CheckNumber(string.Empty, last.EndNo + 1, last.NumberWidth),
                        SuggestedPrefix = last?.Prefix ?? string.Empty
                    };
                })
                .ToList()
        };
    }

    public async Task<AvailableCheckLeavesDto> GetAvailableLeavesAsync(long bankAccountId, int take)
    {
        int limit = take <= 0 ? 50 : Math.Min(take, 500);

        var activeBooks =
            Books.AsNoTracking()
                .Where(b => !b.IsDeleted && b.IsActive && b.BankAccountId == bankAccountId);

        var query =
            from l in Leaves.AsNoTracking()
            join b in activeBooks on l.CheckBookId equals b.CheckBookId
            where l.Status == Unused
            select new { l.CheckBookLeafId, l.CheckNo, l.LeafNo, b.Code, b.ReceivedDate, b.CheckBookId };

        int count = await query.CountAsync();

        // oldest book first, then the lowest number
        var leaves =
            await query
                .OrderBy(x => x.ReceivedDate)
                .ThenBy(x => x.CheckBookId)
                .ThenBy(x => x.LeafNo)
                .Take(limit)
                .ToListAsync();

        int threshold = await LowLeafThresholdAsync();

        bool hasBooks =
            await Books.AsNoTracking().AnyAsync(b => !b.IsDeleted && b.BankAccountId == bankAccountId);

        return new AvailableCheckLeavesDto
        {
            BankAccountId = bankAccountId,
            HasBooks = hasBooks,
            AllowChooseLeaf = await AllowChooseLeafAsync(),
            LowLeafThreshold = threshold,
            LowLeaf = threshold > 0 && count < threshold,
            UnusedLeaves = count,
            Leaves = leaves
                .Select(x => new CheckLeafOptionDto
                {
                    CheckBookLeafId = x.CheckBookLeafId,
                    CheckNo = x.CheckNo,
                    BookCode = x.Code
                })
                .ToList()
        };
    }


    //===========================================================
    // Check + write
    //===========================================================

    private sealed class Checked
    {
        public long BankAccountId;
        public string BookNo = string.Empty;
        public string Prefix = string.Empty;
        public long StartNo;
        public long EndNo;
        public int Width;
        public int LeafCount;
        public DateOnly ReceivedDate;
        public string Remarks = string.Empty;
    }

    private async Task<Checked> CheckAsync(SaveCheckBookDto dto, long? selfId)
    {
        Checked c = new()
        {
            BankAccountId = dto.BankAccountId,
            BookNo = Limited(dto.BookNo, 50, "Book No"),
            Prefix = Limited(dto.Prefix, 10, "Prefix").Replace(" ", string.Empty).ToUpperInvariant(),
            Remarks = Limited(dto.Remarks, 500, "Remarks"),
            LeafCount = dto.LeafCount
        };

        bool accountOk =
            await BankAccounts.AsNoTracking()
                .AnyAsync(x => x.BankAccountId == c.BankAccountId && !x.IsDeleted && x.Status && x.PaymentAccount);

        if (!accountOk)
        {
            throw new InvalidOperationException("Pick the bank account (an active account with Payment = Yes).");
        }

        string start = (dto.StartNo ?? string.Empty).Trim();

        if (start.Length == 0 || start.Length > 15 || !start.All(char.IsDigit))
        {
            throw new InvalidOperationException("The first check number must be digits only (up to 15).");
        }

        c.StartNo = long.Parse(start, CultureInfo.InvariantCulture);
        c.Width = start.Length;

        if (c.LeafCount < 1 || c.LeafCount > MaxLeaves)
        {
            throw new InvalidOperationException($"A check book has 1 to {MaxLeaves} leaves.");
        }

        c.EndNo = c.StartNo + c.LeafCount - 1;

        if (c.EndNo.ToString(CultureInfo.InvariantCulture).Length > 15)
        {
            throw new InvalidOperationException("The last check number is too long (more than 15 digits).");
        }

        if (!DateOnly.TryParseExact((dto.ReceivedDate ?? string.Empty).Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly received))
        {
            throw new InvalidOperationException("Enter the date the book was received.");
        }

        c.ReceivedDate = received;

        // no number shared with another live book of the account
        // (same prefix)
        var clash =
            await Books.AsNoTracking()
                .Where(x => !x.IsDeleted
                    && x.BankAccountId == c.BankAccountId
                    && x.Prefix == c.Prefix
                    && (selfId == null || x.CheckBookId != selfId)
                    && x.StartNo <= c.EndNo
                    && x.EndNo >= c.StartNo)
                .Select(x => new { x.Code, x.Prefix, x.StartNo, x.EndNo, x.NumberWidth })
                .FirstOrDefaultAsync();

        if (clash != null)
        {
            throw new InvalidOperationException(
                $"The numbers overlap {clash.Code} ({CheckNumber(clash.Prefix, clash.StartNo, clash.NumberWidth)} - {CheckNumber(clash.Prefix, clash.EndNo, clash.NumberWidth)}) of the same bank account.");
        }

        return c;
    }

    private void AddLeaves(CheckBookEntity book)
    {
        for (long n = book.StartNo; n <= book.EndNo; n++)
        {
            Leaves.Add(new CheckBookLeafEntity
            {
                CheckBookId = book.CheckBookId,
                BankAccountId = book.BankAccountId,
                LeafNo = n,
                CheckNo = CheckNumber(book.Prefix, n, book.NumberWidth),
                Status = Unused
            });
        }
    }

    private static string Range(CheckBookEntity b) =>
        $"{CheckNumber(b.Prefix, b.StartNo, b.NumberWidth)} - {CheckNumber(b.Prefix, b.EndNo, b.NumberWidth)} ({b.LeafCount} leaves)";

    public async Task<CheckBookDto> CreateAsync(SaveCheckBookDto dto, long userId)
    {
        Checked c = await CheckAsync(dto, null);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        CheckBookEntity entity =
            new()
            {
                Code = NextCode(await Books.AsNoTracking().Select(x => x.Code).ToListAsync()),
                BankAccountId = c.BankAccountId,
                BookNo = c.BookNo,
                Prefix = c.Prefix,
                StartNo = c.StartNo,
                EndNo = c.EndNo,
                NumberWidth = c.Width,
                LeafCount = c.LeafCount,
                ReceivedDate = c.ReceivedDate,
                Remarks = c.Remarks,
                IsActive = dto.IsActive,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        Books.Add(entity);

        await _context.SaveChangesAsync();

        AddLeaves(entity);

        AddHistory(entity.CheckBookId, "Create", "Check Book Created", $"{entity.Code} : {Range(entity)}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await ReadAsync(entity);
    }

    public async Task UpdateAsync(Guid publicId, SaveCheckBookDto dto, long userId)
    {
        CheckBookEntity entity = await FindAsync(publicId);

        bool used =
            await Leaves.AsNoTracking().AnyAsync(x => x.CheckBookId == entity.CheckBookId && x.Status != Unused);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (used)
        {
            // a leaf is used : only the details change
            entity.BookNo = Limited(dto.BookNo, 50, "Book No");
            entity.Remarks = Limited(dto.Remarks, 500, "Remarks");

            if (DateOnly.TryParseExact((dto.ReceivedDate ?? string.Empty).Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly received))
            {
                entity.ReceivedDate = received;
            }

            entity.IsActive = dto.IsActive;
        }
        else
        {
            Checked c = await CheckAsync(dto, entity.CheckBookId);

            bool rangeChanged =
                c.BankAccountId != entity.BankAccountId
                || c.Prefix != entity.Prefix
                || c.StartNo != entity.StartNo
                || c.EndNo != entity.EndNo
                || c.Width != entity.NumberWidth;

            entity.BankAccountId = c.BankAccountId;
            entity.BookNo = c.BookNo;
            entity.Prefix = c.Prefix;
            entity.StartNo = c.StartNo;
            entity.EndNo = c.EndNo;
            entity.NumberWidth = c.Width;
            entity.LeafCount = c.LeafCount;
            entity.ReceivedDate = c.ReceivedDate;
            entity.Remarks = c.Remarks;
            entity.IsActive = dto.IsActive;

            if (rangeChanged)
            {
                Leaves.RemoveRange(await Leaves.Where(x => x.CheckBookId == entity.CheckBookId).ToListAsync());

                await _context.SaveChangesAsync();

                AddLeaves(entity);
            }
        }

        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.CheckBookId, "Update", "Check Book Updated", $"{entity.Code} : {Range(entity)}{(entity.IsActive ? string.Empty : ", Inactive")}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    public async Task DeleteAsync(Guid publicId, long userId)
    {
        CheckBookEntity entity = await FindAsync(publicId);

        bool used =
            await Leaves.AsNoTracking().AnyAsync(x => x.CheckBookId == entity.CheckBookId && x.Status != Unused);

        if (used)
        {
            throw new InvalidOperationException($"{entity.Code} has leaves that are used (issued, cancelled, lost or void) : it cannot be deleted. Make it Inactive instead.");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(entity.CheckBookId, "Delete", "Check Book Deleted", $"{entity.Code} : {Range(entity)}.", userId);

        await _context.SaveChangesAsync();
    }

    public async Task<bool> RestoreAsync(long userId)
    {
        CheckBookEntity? entity =
            await Books.Where(x => x.IsDeleted).OrderByDescending(x => x.DeletedDate).FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        var clash =
            await Books.AsNoTracking()
                .Where(x => !x.IsDeleted
                    && x.BankAccountId == entity.BankAccountId
                    && x.Prefix == entity.Prefix
                    && x.StartNo <= entity.EndNo
                    && x.EndNo >= entity.StartNo)
                .Select(x => x.Code)
                .FirstOrDefaultAsync();

        if (clash != null)
        {
            throw new InvalidOperationException($"{entity.Code} cannot be restored : its numbers overlap {clash} of the same bank account.");
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.CheckBookId, "Restore", "Check Book Restored", $"{entity.Code} : {Range(entity)}.", userId);

        await _context.SaveChangesAsync();

        return true;
    }


    //===========================================================
    // Leaves : Cancelled / Lost and back
    //===========================================================

    private async Task<(CheckBookEntity Book, CheckBookLeafEntity Leaf)> FindLeafAsync(Guid publicId, long leafId)
    {
        CheckBookEntity book = await FindAsync(publicId);

        CheckBookLeafEntity leaf =
            await Leaves.FirstOrDefaultAsync(x => x.CheckBookLeafId == leafId && x.CheckBookId == book.CheckBookId)
            ?? throw new KeyNotFoundException("The check leaf was not found.");

        return (book, leaf);
    }

    public async Task MarkLeafAsync(Guid publicId, long leafId, CheckBookLeafActionDto dto, long userId)
    {
        var (book, leaf) = await FindLeafAsync(publicId, leafId);

        string status =
            string.Equals(dto.Status, Lost, StringComparison.OrdinalIgnoreCase) ? Lost
            : string.Equals(dto.Status, Cancelled, StringComparison.OrdinalIgnoreCase) ? Cancelled
            : string.Empty;

        if (status.Length == 0)
        {
            throw new InvalidOperationException("A leaf can be marked Cancelled or Lost.");
        }

        string reason = Limited(dto.Reason, 300, "Reason");

        if (reason.Length == 0)
        {
            throw new InvalidOperationException("Give the reason.");
        }

        if (leaf.Status != Unused)
        {
            throw new InvalidOperationException($"Check {leaf.CheckNo} is {leaf.Status} : only an unused leaf can be marked {status}.");
        }

        leaf.Status = status;
        leaf.Reason = reason;
        leaf.StatusBy = userId;
        leaf.StatusDate = DateTime.UtcNow;

        AddHistory(book.CheckBookId, "Update", $"Check Leaf {status}", $"{book.Code} : check {leaf.CheckNo} {status.ToLowerInvariant()} ({reason}).", userId);

        await _context.SaveChangesAsync();
    }

    public async Task UndoLeafAsync(Guid publicId, long leafId, long userId)
    {
        var (book, leaf) = await FindLeafAsync(publicId, leafId);

        if (leaf.Status != Cancelled && leaf.Status != Lost)
        {
            throw new InvalidOperationException($"Check {leaf.CheckNo} is {leaf.Status} : only a cancelled or lost leaf goes back to unused.");
        }

        string was = leaf.Status;

        leaf.Status = Unused;
        leaf.Reason = string.Empty;
        leaf.StatusBy = userId;
        leaf.StatusDate = DateTime.UtcNow;

        AddHistory(book.CheckBookId, "Update", "Check Leaf Back To Unused", $"{book.Code} : check {leaf.CheckNo} was {was.ToLowerInvariant()}, now unused.", userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Cheque print layouts (2026-11-15) : one per bank account;
    // the page owns the JSON (mm positions), the server keeps it
    //===========================================================

    private const int MaxLayoutLength = 8000;

    private static CheckPrintLayoutDto LayoutDto(BankAccountEntity a, CheckPrintLayoutEntity? layout) =>
        new CheckPrintLayoutDto
        {
            BankAccountId = a.BankAccountId,
            BankAccountName = AccountName(a),
            Bank = a.Bank ?? string.Empty,
            AccountNumber = a.FullAccountNumber ?? string.Empty,
            LayoutJson = layout?.LayoutJson ?? string.Empty,
            IsSaved = layout != null,
            ModifiedDate = Stamp(layout?.ModifiedDate ?? layout?.CreatedDate)
        };

    public async Task<List<CheckPrintLayoutDto>> GetPrintLayoutsAsync(IReadOnlyCollection<long> bankAccountIds)
    {
        List<long> ids =
            (bankAccountIds ?? Array.Empty<long>()).Where(x => x > 0).Distinct().Take(50).ToList();

        if (ids.Count == 0)
        {
            return new List<CheckPrintLayoutDto>();
        }

        List<BankAccountEntity> accounts =
            await BankAccounts.AsNoTracking()
                .Where(x => ids.Contains(x.BankAccountId))
                .ToListAsync();

        Dictionary<long, CheckPrintLayoutEntity> layouts =
            await PrintLayouts.AsNoTracking()
                .Where(x => ids.Contains(x.BankAccountId))
                .ToDictionaryAsync(x => x.BankAccountId);

        return accounts
            .Select(a => LayoutDto(a, layouts.TryGetValue(a.BankAccountId, out CheckPrintLayoutEntity? l) ? l : null))
            .ToList();
    }

    public async Task<CheckPrintLayoutDto> SavePrintLayoutAsync(long bankAccountId, SaveCheckPrintLayoutDto dto, long userId)
    {
        BankAccountEntity account =
            await BankAccounts.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BankAccountId == bankAccountId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The bank account was not found.");

        string json = (dto?.LayoutJson ?? string.Empty).Trim();

        if (json.Length == 0)
        {
            throw new InvalidOperationException("The cheque layout is empty.");
        }

        if (json.Length > MaxLayoutLength)
        {
            throw new InvalidOperationException($"The cheque layout cannot be longer than {MaxLayoutLength} characters.");
        }

        try
        {
            using System.Text.Json.JsonDocument parsed = System.Text.Json.JsonDocument.Parse(json);

            if (parsed.RootElement.ValueKind != System.Text.Json.JsonValueKind.Object)
            {
                throw new InvalidOperationException("The cheque layout is not valid.");
            }
        }
        catch (System.Text.Json.JsonException)
        {
            throw new InvalidOperationException("The cheque layout is not valid.");
        }

        CheckPrintLayoutEntity? layout =
            await PrintLayouts.FirstOrDefaultAsync(x => x.BankAccountId == bankAccountId);

        bool isNew = layout == null;

        if (layout == null)
        {
            layout = new CheckPrintLayoutEntity
            {
                BankAccountId = bankAccountId,
                LayoutJson = json,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

            PrintLayouts.Add(layout);
        }
        else
        {
            layout.LayoutJson = json;
            layout.ModifiedBy = userId;
            layout.ModifiedDate = DateTime.UtcNow;
        }

        AddHistory(
            bankAccountId,
            "Update",
            isNew ? "Cheque Layout Added" : "Cheque Layout Updated",
            $"Cheque print layout of {AccountName(account)} {(isNew ? "added" : "updated")}.",
            userId);

        await _context.SaveChangesAsync();

        return LayoutDto(account, layout);
    }
}
