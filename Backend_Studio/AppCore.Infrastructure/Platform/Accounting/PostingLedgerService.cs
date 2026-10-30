//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Platform.Accounting;

using AppCore.Infrastructure.Persistence;

using PostingSetupsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.PostingSetups;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Accounting;


//===============================================================
// Posting Ledger Service
//
// Reads a purpose's ledger from PostingSetups (by code) and
// checks it through the voucher ledger list :
//   not set   → "Posting Setup : <purpose> has no ledger ..."
//   not found → "... ledger <code> was not found"
//   inactive  → "... ledger <code> is inactive"
//===============================================================

public class PostingLedgerService : IPostingLedgerService
{
    //===========================================================
    // Constants
    //===========================================================

    private const string PageHint =
        "Choose it on Settings › Account Settings › Posting Setup.";


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IVoucherLedgerRepository _ledgerRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public PostingLedgerService(
        AppDbContext context,
        IVoucherLedgerRepository ledgerRepository)
    {
        _context = context;

        _ledgerRepository = ledgerRepository;
    }


    //===========================================================
    // Get Ledger
    //===========================================================

    public async Task<VoucherLedgerDto>
        GetLedgerAsync
        (
            string purposeCode
        )
    {
        string code =
            (purposeCode ?? string.Empty).Trim().ToUpperInvariant();

        var setup =
            await _context
                .Set<PostingSetupsEntity>()
                .AsNoTracking()
                .Where(x => x.PurposeCode == code)
                .Select(x => new { x.PurposeName, x.LedgerCode })
                .FirstOrDefaultAsync();

        if (setup == null)
        {
            throw new InvalidOperationException(
                $"Posting Setup : purpose '{code}' does not exist. Run PostingSetup_StockLedger.sql.");
        }

        string ledgerCode =
            (setup.LedgerCode ?? string.Empty).Trim();

        if (ledgerCode.Length == 0)
        {
            throw new InvalidOperationException(
                $"Posting Setup : '{setup.PurposeName}' has no ledger. {PageHint}");
        }

        Dictionary<string, VoucherLedgerDto> found =
            await _ledgerRepository.GetByCodesAsync(
                new[] { ledgerCode });

        if (!found.TryGetValue(ledgerCode, out VoucherLedgerDto? ledger))
        {
            throw new InvalidOperationException(
                $"Posting Setup : the ledger of '{setup.PurposeName}' ({ledgerCode}) was not found. {PageHint}");
        }

        if (!ledger.IsActive)
        {
            throw new InvalidOperationException(
                $"Posting Setup : the ledger of '{setup.PurposeName}' ({ledgerCode}) is inactive. {PageHint}");
        }

        return ledger;
    }
}
