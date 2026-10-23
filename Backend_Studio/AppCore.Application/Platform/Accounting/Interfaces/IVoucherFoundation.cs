//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.Accounting;


//===============================================================
// Voucher Number Service
//
// Number : <PREFIX>-<BRANCH DIGITS>-<FY>-<MM>-<seq5>
//          RV-010101-2627-10-00001
// The sequence restarts every calendar month, per prefix and
// branch. Numbers are taken when a draft is first saved.
//===============================================================

public interface IVoucherNumberService
{
    // Branch + open financial year for a date (no number taken).
    // Throws InvalidOperationException when the branch is
    // missing / inactive or no OPEN financial year covers the
    // date.
    Task<VoucherPeriodDto> ResolvePeriodAsync(
        long branchId,
        DateOnly voucherDate);

    // Preview of the next number (nothing is reserved; the
    // number actually taken on save may be higher when another
    // computer saves first).
    Task<VoucherNumberDto> PeekAsync(
        string prefix,
        long branchId,
        DateOnly voucherDate);

    // Takes the next number (atomic). Call inside the same
    // transaction that saves the voucher header.
    Task<VoucherNumberDto> NextAsync(
        string prefix,
        long branchId,
        DateOnly voucherDate);
}


//===============================================================
// Voucher Ledger Repository
//
// Every postable ledger : General Ledgers + Cash / Bank / MFS /
// POS / EMI accounts, in one shape.
//===============================================================

public interface IVoucherLedgerRepository
{
    Task<List<VoucherLedgerDto>> GetAllAsync(
        bool activeOnly);

    Task<Dictionary<string, VoucherLedgerDto>> GetByCodesAsync(
        IEnumerable<string> ledgerCodes);
}


//===============================================================
// Voucher Posting Service
//
// Writes the debit / credit lines of a voucher into
// VoucherEntries after checking :
//   • open financial year for the date
//   • every line is debit OR credit, positive, 2 decimals
//   • debit = credit for the voucher AND for every group
//   • every ledger exists and is active
//   • the voucher is not already posted
//===============================================================

public interface IVoucherPostingService
{
    Task PostAsync(
        VoucherPostingRequest request,
        long userId);

    // Adds reversing rows (debit / credit swapped) dated
    // cancelDate. Throws when not posted or already reversed.
    Task ReverseAsync(
        string voucherNo,
        DateOnly cancelDate,
        string reason,
        long userId);

    Task<bool> IsPostedAsync(
        string voucherNo);
}