//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Platform.Accounting;


//===============================================================
// Voucher Sequences
//
// Last number handed out, one row per
// Prefix + Branch Digits + Financial Year + Calendar Month.
// Updated with one atomic SQL statement, so two users saving
// at the same moment never get the same number.
//===============================================================

public class VoucherSequences
{
    public long VoucherSequenceId { get; set; }

    // RV / PV / JV / FT / RRV / RRP
    public string Prefix { get; set; } = string.Empty;

    // Branch code digits, e.g. BRN-01-01-01 → 010101
    public string BranchDigits { get; set; } = string.Empty;

    // e.g. 2627 for FY 2026-2027
    public string FinancialYearCode { get; set; } = string.Empty;

    // Calendar month 1 - 12
    public int PeriodMonth { get; set; }

    public int LastNumber { get; set; }

    public DateTime ModifiedDate { get; set; }
}