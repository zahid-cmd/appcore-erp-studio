//===============================================================
// Namespaces
//===============================================================

using AppCore.Infrastructure.Persistence;

using PostingSetupsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.PostingSetups;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Accounting;


//===============================================================
// Posting Ledger Codes (synchronous lookup)
//
// The ledger CODE of a Posting Setup purpose, for repositories
// that work with ledger codes directly (vouchers, reconciliations,
// VAT Setup). Each repository still checks that the ledger is
// found and active, as before; this only replaces the codes that
// used to be written in the code.
//
//   Get    : throws "Posting Setup : <purpose> has no ledger"
//   TryGet : "" when the purpose or its ledger is missing
//===============================================================

public static class PostingLedgerCodes
{
    private const string PageHint =
        "Choose it on Settings › Account Settings › Posting Setup.";


    public static string Get(
        AppDbContext context,
        string purposeCode)
    {
        string code =
            Normalize(purposeCode);

        var setup =
            context
                .Set<PostingSetupsEntity>()
                .Where(x => x.PurposeCode == code)
                .Select(x => new { x.PurposeName, x.LedgerCode })
                .FirstOrDefault();

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

        return ledgerCode;
    }


    public static string TryGet(
        AppDbContext context,
        string purposeCode)
    {
        string code =
            Normalize(purposeCode);

        string? ledgerCode =
            context
                .Set<PostingSetupsEntity>()
                .Where(x => x.PurposeCode == code)
                .Select(x => x.LedgerCode)
                .FirstOrDefault();

        return (ledgerCode ?? string.Empty).Trim();
    }


    private static string Normalize(
        string purposeCode)
    {
        return (purposeCode ?? string.Empty).Trim().ToUpperInvariant();
    }
}
