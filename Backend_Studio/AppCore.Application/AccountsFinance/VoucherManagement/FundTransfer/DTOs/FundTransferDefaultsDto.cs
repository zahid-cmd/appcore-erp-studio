//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.AccountsFinance.VoucherManagement;


//===============================================================
// Defaults (Add form) : next voucher number for branch + date
//
// Preview only : nothing is reserved. The number actually taken
// on save may be higher when another computer saves first.
// Message is set (and VoucherNo empty) when vouchers are not
// allowed for the date (no open financial year, inactive branch,
// ...).
//===============================================================

public class FundTransferDefaultsDto
{
    public string VoucherNo { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long FinancialYearId { get; set; }

    public string FinancialYearName { get; set; } = string.Empty;

    public string FinancialYearCode { get; set; } = string.Empty;

    public int PeriodMonth { get; set; }

    public string Message { get; set; } = string.Empty;
}