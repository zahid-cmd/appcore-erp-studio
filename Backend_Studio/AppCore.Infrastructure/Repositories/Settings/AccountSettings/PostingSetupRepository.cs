//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Platform.Accounting;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.PostingSetup.DTOs;

using AppCore.Domain.Platform.Accounting;

using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.Accounting;

using PostingSetupsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.PostingSetups;

using PostingSetupHistoryEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.PostingSetupHistory;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.AccountSettings;


//===============================================================
// Posting Setup Repository
//
// Purposes are fixed (PostingSetup_StockLedger.sql). A ledger
// may be :
//   · a General Ledger (GLR-), active, not deleted
//   · under one of the purpose's AllowedSubGroupCodes (when set)
// A change needs the Update activity on the Posting Setup page
// (checked here, by route) and a reason; it is written to
// PostingSetupHistory. Old postings keep their ledger.
//===============================================================

public class PostingSetupRepository : IPostingSetupRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string PageRoute =
        "/settings/account-settings/posting-setup";

    private const string UpdateActivity =
        "Update";

    private const string GeneralLedgerPrefix =
        "GLR-";

    private const int ReasonMinLength = 5;

    private const int ReasonMaxLength = 500;

    // Row status
    private const string StatusReady = "Ready";

    private const string StatusNotSet = "NotSet";

    private const string StatusNotFound = "NotFound";

    private const string StatusInactive = "Inactive";

    private const string StatusOutsideGroup = "OutsideGroup";

    // Posting switches shown read-only (System Configurations,
    // by code) : page, name
    private static readonly (string Code, string Page, string Name)[] PostingSwitches =
    {
        ("CFG-MOD-004-0003", "Receipt Voucher", "Post on approval"),
        ("CFG-MOD-004-0012", "Payment Voucher", "Post on approval"),
        ("CFG-MOD-004-0019", "Journal Voucher", "Post on approval"),
        ("CFG-MOD-004-0024", "Fund Transfer", "Post on approval"),
        ("CFG-MOD-007-0046", "Purchases - MB", "Post on approval"),
        ("CFG-MOD-007-0056", "Purchases - SP", "Post on approval"),
        ("CFG-MOD-007-0063", "Purchases - AC", "Post on approval"),
        ("CFG-MOD-004-0051", "MFS Reconciliation", "Auto settlement"),
        ("CFG-MOD-004-0054", "POS Reconciliation", "Auto settlement")
    };


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IVoucherLedgerRepository _ledgerRepository;

    private readonly IEffectiveAccessRepository _effectiveAccess;


    //===========================================================
    // Constructor
    //===========================================================

    public PostingSetupRepository(
        AppDbContext context,
        IVoucherLedgerRepository ledgerRepository,
        IEffectiveAccessRepository effectiveAccess)
    {
        _context = context;

        _ledgerRepository = ledgerRepository;

        _effectiveAccess = effectiveAccess;
    }


    //===========================================================
    // Workspace
    //===========================================================

    public async Task<PostingSetupWorkspaceDto>
        GetWorkspaceAsync
        (
            long userId
        )
    {
        List<PostingSetupsEntity> setups =
            await _context
                .Set<PostingSetupsEntity>()
                .AsNoTracking()
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.PurposeCode)
                .ToListAsync();

        // All ledgers (inactive too, to explain a row's status)
        List<VoucherLedgerDto> ledgers =
            await _ledgerRepository.GetAllAsync(false);

        Dictionary<string, VoucherLedgerDto> byCode =
            ledgers
                .GroupBy(x => x.LedgerCode, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(x => x.Key, x => x.First(), StringComparer.OrdinalIgnoreCase);

        List<string> chosen =
            setups
                .Select(x => x.LedgerCode)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .ToList();

        Dictionary<string, decimal> balances =
            await GetBalancesAsync(chosen);

        PostingSetupWorkspaceDto result =
            new()
            {
                CanChange = await CanChangeAsync(userId),

                Rows =
                    setups
                        .Select(x => ToRow(x, byCode, balances))
                        .ToList(),

                Ledgers =
                    ledgers
                        .Where(x => x.IsActive && IsGeneralLedger(x))
                        .OrderBy(x => x.SubGroupCode)
                        .ThenBy(x => x.LedgerCode)
                        .Select
                        (
                            x =>
                                new PostingSetupLedgerOptionDto
                                {
                                    LedgerCode = x.LedgerCode,
                                    LedgerName = x.LedgerName,
                                    SubGroupCode = x.SubGroupCode,
                                    SubGroupName = x.SubGroupName
                                }
                        )
                        .ToList(),

                Switches =
                    await GetSwitchesAsync()
            };

        return result;
    }


    //===========================================================
    // Update one purpose's ledger
    //===========================================================

    public async Task<PostingSetupRowDto>
        UpdateAsync
        (
            string purposeCode,
            UpdatePostingSetupDto dto,
            long userId,
            string userName
        )
    {
        if (!await CanChangeAsync(userId))
        {
            throw new UnauthorizedAccessException(
                "You need the Update activity on Posting Setup to change a ledger.");
        }

        string code =
            (purposeCode ?? string.Empty).Trim().ToUpperInvariant();

        string ledgerCode =
            (dto?.LedgerCode ?? string.Empty).Trim().ToUpperInvariant();

        string reason =
            (dto?.Reason ?? string.Empty).Trim();

        PostingSetupsEntity? setup =
            await _context
                .Set<PostingSetupsEntity>()
                .FirstOrDefaultAsync(x => x.PurposeCode == code);

        if (setup == null)
        {
            throw new KeyNotFoundException(
                $"Posting purpose '{code}' was not found.");
        }

        string oldCode =
            (setup.LedgerCode ?? string.Empty).Trim();

        if (string.Equals(oldCode, ledgerCode, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "This ledger is already chosen. Nothing to change.");
        }

        if (reason.Length < ReasonMinLength)
        {
            throw new InvalidOperationException(
                $"Give a reason for the change (at least {ReasonMinLength} characters).");
        }

        if (reason.Length > ReasonMaxLength)
        {
            throw new InvalidOperationException(
                $"The reason can have at most {ReasonMaxLength} characters.");
        }

        Dictionary<string, VoucherLedgerDto> found =
            await _ledgerRepository.GetByCodesAsync(
                new[] { ledgerCode, oldCode });

        VoucherLedgerDto? newLedger =
            null;

        if (ledgerCode.Length == 0)
        {
            if (setup.IsRequired)
            {
                throw new InvalidOperationException(
                    $"'{setup.PurposeName}' needs a ledger; it cannot be cleared.");
            }
        }
        else
        {
            if (!found.TryGetValue(ledgerCode, out newLedger))
            {
                throw new InvalidOperationException(
                    $"Ledger {ledgerCode} was not found.");
            }

            if (!newLedger.IsActive)
            {
                throw new InvalidOperationException(
                    $"Ledger {ledgerCode} is inactive.");
            }

            if (!IsGeneralLedger(newLedger))
            {
                throw new InvalidOperationException(
                    "Only a General Ledger (GLR-) can be chosen here.");
            }

            List<string> allowed =
                SplitCodes(setup.AllowedSubGroupCodes);

            if (allowed.Count > 0
                &&
                !allowed.Contains(newLedger.SubGroupCode, StringComparer.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    $"'{setup.PurposeName}' takes a ledger under {string.Join(" / ", allowed)}; {ledgerCode} is under {newLedger.SubGroupCode}.");
            }
        }

        found.TryGetValue(oldCode, out VoucherLedgerDto? oldLedger);

        DateTime now =
            DateTime.UtcNow;

        IDbContextTransaction? transaction =
            _context.Database.CurrentTransaction == null
                ? await _context.Database.BeginTransactionAsync()
                : null;

        try
        {
            setup.LedgerCode = newLedger?.LedgerCode ?? string.Empty;

            setup.ModifiedBy = userId;

            setup.ModifiedDate = now;

            _context
                .Set<PostingSetupHistoryEntity>()
                .Add(
                    new PostingSetupHistoryEntity
                    {
                        PurposeCode = setup.PurposeCode,
                        OldLedgerCode = oldCode,
                        OldLedgerName = oldLedger?.LedgerName ?? string.Empty,
                        NewLedgerCode = setup.LedgerCode,
                        NewLedgerName = newLedger?.LedgerName ?? string.Empty,
                        Reason = reason,
                        ChangedBy = userId,
                        ChangedByName = Limit(userName, 150),
                        ChangedDate = now
                    });

            await _context.SaveChangesAsync();

            if (transaction != null)
            {
                await transaction.CommitAsync();
            }
        }
        catch
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync();
            }

            throw;
        }
        finally
        {
            if (transaction != null)
            {
                await transaction.DisposeAsync();
            }
        }

        Dictionary<string, VoucherLedgerDto> byCode =
            new(StringComparer.OrdinalIgnoreCase);

        if (newLedger != null)
        {
            byCode[newLedger.LedgerCode] = newLedger;
        }

        Dictionary<string, decimal> balances =
            await GetBalancesAsync(
                newLedger == null
                    ? new List<string>()
                    : new List<string> { newLedger.LedgerCode });

        return ToRow(setup, byCode, balances);
    }


    //===========================================================
    // History (newest first)
    //===========================================================

    public async Task<List<PostingSetupHistoryDto>>
        GetHistoryAsync
        (
            string? purposeCode
        )
    {
        string code =
            (purposeCode ?? string.Empty).Trim().ToUpperInvariant();

        Dictionary<string, string> names =
            await _context
                .Set<PostingSetupsEntity>()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.PurposeCode, x => x.PurposeName);

        IQueryable<PostingSetupHistoryEntity> query =
            _context
                .Set<PostingSetupHistoryEntity>()
                .AsNoTracking();

        if (code.Length > 0)
        {
            query = query.Where(x => x.PurposeCode == code);
        }

        List<PostingSetupHistoryEntity> rows =
            await query
                .OrderByDescending(x => x.ChangedDate)
                .ThenByDescending(x => x.PostingSetupHistoryId)
                .Take(500)
                .ToListAsync();

        return rows
            .Select
            (
                x =>
                    new PostingSetupHistoryDto
                    {
                        PurposeCode = x.PurposeCode,
                        PurposeName = names.TryGetValue(x.PurposeCode, out string? name) ? name : x.PurposeCode,
                        OldLedgerCode = x.OldLedgerCode,
                        OldLedgerName = x.OldLedgerName,
                        NewLedgerCode = x.NewLedgerCode,
                        NewLedgerName = x.NewLedgerName,
                        Reason = x.Reason,
                        ChangedByName = x.ChangedByName,
                        ChangedDate = x.ChangedDate
                    }
            )
            .ToList();
    }


    //===========================================================
    // Posting switches (read-only)
    //===========================================================

    private async Task<List<PostingSwitchDto>>
        GetSwitchesAsync()
    {
        List<string> codes =
            PostingSwitches
                .Select(x => x.Code)
                .ToList();

        var rows =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && codes.Contains(x.ConfigurationCode))
                .Select(x => new { x.ConfigurationCode, x.IsEnabled, x.Value })
                .ToListAsync();

        return PostingSwitches
            .Select
            (
                item =>
                {
                    var row =
                        rows.FirstOrDefault(x => x.ConfigurationCode == item.Code);

                    return new PostingSwitchDto
                    {
                        ConfigurationCode = item.Code,
                        Page = item.Page,
                        Name = item.Name,
                        Found = row != null,
                        IsEnabled = row?.IsEnabled ?? false,
                        Value = row?.Value ?? string.Empty
                    };
                }
            )
            .ToList();
    }


    //===========================================================
    // Helpers
    //===========================================================

    private async Task<bool>
        CanChangeAsync
        (
            long userId
        )
    {
        if (userId <= 0)
        {
            return false;
        }

        return await _effectiveAccess.HasActivityAsync(
            userId,
            PageRoute,
            UpdateActivity);
    }


    private async Task<Dictionary<string, decimal>>
        GetBalancesAsync
        (
            List<string> ledgerCodes
        )
    {
        if (ledgerCodes.Count == 0)
        {
            return new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        }

        List<string> codes =
            ledgerCodes
                .Select(x => x.Trim().ToUpperInvariant())
                .Distinct()
                .ToList();

        var rows =
            await _context
                .Set<VoucherEntries>()
                .AsNoTracking()
                .Where(x => codes.Contains(x.LedgerCode))
                .GroupBy(x => x.LedgerCode)
                .Select
                (
                    g =>
                        new
                        {
                            LedgerCode = g.Key,
                            Balance = g.Sum(x => x.Debit - x.Credit)
                        }
                )
                .ToListAsync();

        return rows.ToDictionary(
            x => x.LedgerCode,
            x => x.Balance,
            StringComparer.OrdinalIgnoreCase);
    }


    private static PostingSetupRowDto
        ToRow
        (
            PostingSetupsEntity setup,
            Dictionary<string, VoucherLedgerDto> byCode,
            Dictionary<string, decimal> balances
        )
    {
        List<string> allowed =
            SplitCodes(setup.AllowedSubGroupCodes);

        string code =
            (setup.LedgerCode ?? string.Empty).Trim();

        PostingSetupRowDto row =
            new()
            {
                PurposeCode = setup.PurposeCode,
                PurposeName = setup.PurposeName,
                GroupName = setup.GroupName,
                Description = setup.Description,
                UsedBy = setup.UsedBy,
                AllowedSubGroupCodes = allowed,
                IsRequired = setup.IsRequired,
                DisplayOrder = setup.DisplayOrder,
                LedgerCode = code,
                ModifiedDate = setup.ModifiedDate
            };

        if (code.Length == 0)
        {
            row.Status = StatusNotSet;

            row.StatusText =
                setup.IsRequired
                    ? "No ledger : postings that need it will stop."
                    : "Not set yet.";

            return row;
        }

        if (!byCode.TryGetValue(code, out VoucherLedgerDto? ledger))
        {
            row.Status = StatusNotFound;

            row.StatusText = $"Ledger {code} was not found (deleted or never created).";

            return row;
        }

        row.LedgerName = ledger.LedgerName;

        row.SubGroupCode = ledger.SubGroupCode;

        row.SubGroupName = ledger.SubGroupName;

        row.Balance =
            balances.TryGetValue(code, out decimal balance)
                ? balance
                : 0m;

        if (!ledger.IsActive)
        {
            row.Status = StatusInactive;

            row.StatusText = "The ledger is inactive : postings that need it will stop.";

            return row;
        }

        if (allowed.Count > 0
            &&
            !allowed.Contains(ledger.SubGroupCode, StringComparer.OrdinalIgnoreCase))
        {
            row.Status = StatusOutsideGroup;

            row.StatusText = $"The ledger is no longer under {string.Join(" / ", allowed)}.";

            return row;
        }

        row.Status = StatusReady;

        row.StatusText = "Ready";

        return row;
    }


    private static bool
        IsGeneralLedger
        (
            VoucherLedgerDto ledger
        )
    {
        return ledger.LedgerType == VoucherLedgerRepository.GeneralLedger
               &&
               ledger.LedgerCode.StartsWith(GeneralLedgerPrefix, StringComparison.OrdinalIgnoreCase);
    }


    private static List<string>
        SplitCodes
        (
            string? value
        )
    {
        return (value ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => x.ToUpperInvariant())
            .Distinct()
            .ToList();
    }


    private static string
        Limit
        (
            string? value,
            int length
        )
    {
        string text =
            (value ?? string.Empty).Trim();

        return text.Length <= length
            ? text
            : text[..length];
    }
}
