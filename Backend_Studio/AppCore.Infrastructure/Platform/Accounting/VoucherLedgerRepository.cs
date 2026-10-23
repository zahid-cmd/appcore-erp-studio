//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Platform.Accounting;

using AppCore.Infrastructure.Persistence;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using GeneralLedgersEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using CashAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.CashAccounts;

using BankAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.BankAccounts;

using MFSAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.MFSAccounts;

using POSAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.POSAccounts;

using EmiAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.EmiAccounts;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Accounting;


//===============================================================
// Voucher Ledger Repository
//
// Every postable ledger in one shape :
//   General Ledgers (GLR / INV / WIP / COGS, customer and
//   supplier ledgers included) + Cash / Bank / MFS / POS / EMI
//   accounts.
// Deleted rows are never returned.
//===============================================================

public class VoucherLedgerRepository : IVoucherLedgerRepository
{
    //===========================================================
    // Ledger Types
    //===========================================================

    public const string GeneralLedger = "General Ledger";

    public const string Cash = "Cash";

    public const string Bank = "Bank";

    public const string MFS = "MFS";

    public const string POS = "POS";

    public const string EMI = "EMI";


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public VoucherLedgerRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<VoucherLedgerDto>>
        GetAllAsync
        (
            bool activeOnly
        )
    {
        List<VoucherLedgerDto> rows =
            await LoadAsync(null);

        return rows
            .Where(x => !activeOnly || x.IsActive)
            .OrderBy(x => x.SubGroupCode)
            .ThenBy(x => x.LedgerCode)
            .ToList();
    }


    //===========================================================
    // Get By Codes
    //===========================================================

    public async Task<Dictionary<string, VoucherLedgerDto>>
        GetByCodesAsync
        (
            IEnumerable<string> ledgerCodes
        )
    {
        HashSet<string> codes =
            ledgerCodes
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim())
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (codes.Count == 0)
        {
            return new Dictionary<string, VoucherLedgerDto>(
                StringComparer.OrdinalIgnoreCase);
        }

        // Codes are stored in capitals; the database comparison
        // is case-sensitive
        List<VoucherLedgerDto> rows =
            await LoadAsync(
                codes
                    .Select(x => x.ToUpperInvariant())
                    .Distinct()
                    .ToList());

        Dictionary<string, VoucherLedgerDto> result =
            new(StringComparer.OrdinalIgnoreCase);

        foreach (VoucherLedgerDto row in rows)
        {
            result.TryAdd(
                row.LedgerCode,
                row);
        }

        return result;
    }


    //===========================================================
    // Load (all sources; codes = null → every ledger)
    //===========================================================

    private async Task<List<VoucherLedgerDto>>
        LoadAsync
        (
            List<string>? codes
        )
    {
        Dictionary<long, AccountSubGroupEntity> subGroups =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.AccountSubGroupId);

        List<VoucherLedgerDto> result =
            new();

        //=======================================================
        // General Ledgers
        //=======================================================

        var ledgers =
            await _context
                .Set<GeneralLedgersEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (codes == null || codes.Contains(x.LedgerCode))
                )
                .Select
                (
                    x =>
                        new
                        {
                            x.GeneralLedgerId,
                            x.LedgerCode,
                            x.LedgerName,
                            x.AccountSubGroupId,
                            x.ClassCode,
                            x.GroupCode,
                            x.SubGroupCode,
                            x.IsActive
                        }
                )
                .ToListAsync();

        foreach (var x in ledgers)
        {
            subGroups.TryGetValue(
                x.AccountSubGroupId,
                out AccountSubGroupEntity? subGroup);

            result.Add(
                new VoucherLedgerDto
                {
                    AccountId = x.GeneralLedgerId,

                    LedgerCode = x.LedgerCode,

                    LedgerName = x.LedgerName,

                    LedgerType = GeneralLedger,

                    ClassCode = x.ClassCode,

                    GroupCode = x.GroupCode,

                    SubGroupCode = x.SubGroupCode,

                    SubGroupName = subGroup?.SubGroupName ?? string.Empty,

                    IsMoneyLedger = false,

                    IsActive = x.IsActive
                });
        }

        //=======================================================
        // Cash Accounts
        //=======================================================

        var cash =
            await _context
                .Set<CashAccountsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (codes == null || codes.Contains(x.CashAccountCode))
                )
                .Select
                (
                    x =>
                        new MoneyRow
                        {
                            Id = x.CashAccountId,
                            Code = x.CashAccountCode,
                            Name = x.DisplayName != null && x.DisplayName != ""
                                ? x.DisplayName
                                : x.CashAccountName,
                            SubGroupId = x.AccountSubGroupsId,
                            Branch = x.Branch,
                            BranchExclusive = false,
                            Collection = x.CollectionAccount,
                            Payment = x.PaymentAccount,
                            Active = x.Status
                        }
                )
                .ToListAsync();

        AddMoneyRows(result, cash, Cash, subGroups);

        //=======================================================
        // Bank Accounts
        //=======================================================

        var bank =
            await _context
                .Set<BankAccountsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (codes == null || codes.Contains(x.BankAccountCode))
                )
                .Select
                (
                    x =>
                        new MoneyRow
                        {
                            Id = x.BankAccountId,
                            Code = x.BankAccountCode,
                            Name = x.DisplayName != null && x.DisplayName != ""
                                ? x.DisplayName
                                : x.BankAccountName,
                            SubGroupId = x.AccountSubGroupsId,
                            Branch = x.Branch,
                            BranchExclusive = x.BranchExclusive,
                            Collection = x.CollectionAccount,
                            Payment = x.PaymentAccount,
                            Active = x.Status
                        }
                )
                .ToListAsync();

        AddMoneyRows(result, bank, Bank, subGroups);

        //=======================================================
        // MFS Accounts
        //=======================================================

        var mfs =
            await _context
                .Set<MFSAccountsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (codes == null || codes.Contains(x.MFSAccountCode))
                )
                .Select
                (
                    x =>
                        new MoneyRow
                        {
                            Id = x.MFSAccountId,
                            Code = x.MFSAccountCode,
                            ChargePercent = x.MFSCharges,
                            Name = x.DisplayName != null && x.DisplayName != ""
                                ? x.DisplayName
                                : x.MFSAccountName,
                            SubGroupId = x.AccountSubGroupsId,
                            Branch = x.Branch,
                            BranchExclusive = x.BranchExclusive,
                            Collection = x.CollectionAccount,
                            Payment = x.PaymentAccount,
                            Active = x.Status
                        }
                )
                .ToListAsync();

        AddMoneyRows(result, mfs, MFS, subGroups);

        //=======================================================
        // POS Accounts
        //=======================================================

        var pos =
            await _context
                .Set<POSAccountsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (codes == null || codes.Contains(x.POSAccountCode))
                )
                .Select
                (
                    x =>
                        new MoneyRow
                        {
                            Id = x.POSAccountId,
                            Code = x.POSAccountCode,
                            Name = x.POSAccountName,
                            SubGroupId = x.AccountSubGroupsId,
                            Branch = x.Branch,
                            BranchExclusive = x.BranchExclusive,
                            Collection = x.CollectionAccount,
                            Payment = x.PaymentAccount,
                            Active = x.Status
                        }
                )
                .ToListAsync();

        AddMoneyRows(result, pos, POS, subGroups);

        //=======================================================
        // EMI Accounts
        //=======================================================

        var emi =
            await _context
                .Set<EmiAccountsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (codes == null || codes.Contains(x.EmiAccountCode))
                )
                .Select
                (
                    x =>
                        new MoneyRow
                        {
                            Id = x.EmiAccountId,
                            Code = x.EmiAccountCode,
                            Name = x.EmiAccountName,
                            SubGroupId = x.AccountSubGroupsId,
                            Branch = x.Branch,
                            BranchExclusive = x.BranchExclusive,
                            Collection = x.CollectionAccount,
                            Payment = x.PaymentAccount,
                            Active = x.Status
                        }
                )
                .ToListAsync();

        AddMoneyRows(result, emi, EMI, subGroups);

        return result;
    }


    //===========================================================
    // Money Row (Cash / Bank / MFS / POS / EMI)
    //===========================================================

    private sealed class MoneyRow
    {
        public long Id { get; set; }

        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public long SubGroupId { get; set; }

        public decimal ChargePercent { get; set; }

        public string Branch { get; set; } = string.Empty;

        public bool BranchExclusive { get; set; }

        public bool Collection { get; set; }

        public bool Payment { get; set; }

        public bool Active { get; set; }
    }


    private static void AddMoneyRows
    (
        List<VoucherLedgerDto> result,
        List<MoneyRow> rows,
        string ledgerType,
        Dictionary<long, AccountSubGroupEntity> subGroups
    )
    {
        foreach (MoneyRow x in rows)
        {
            subGroups.TryGetValue(
                x.SubGroupId,
                out AccountSubGroupEntity? subGroup);

            result.Add(
                new VoucherLedgerDto
                {
                    AccountId = x.Id,

                    LedgerCode = x.Code,

                    LedgerName = x.Name,

                    LedgerType = ledgerType,

                    ClassCode = subGroup?.ClassCode ?? string.Empty,

                    GroupCode = subGroup?.GroupCode ?? string.Empty,

                    SubGroupCode = subGroup?.SubGroupCode ?? string.Empty,

                    SubGroupName = subGroup?.SubGroupName ?? string.Empty,

                    Branch = x.Branch ?? string.Empty,

                    BranchExclusive = x.BranchExclusive,

                    CollectionAccount = x.Collection,

                    PaymentAccount = x.Payment,

                    IsMoneyLedger = true,

                    ChargePercent = x.ChargePercent,

                    IsActive = x.Active
                });
        }
    }
}