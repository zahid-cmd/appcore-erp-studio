//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation;


//===============================================================
// Check Deposit Slips (received checks deposited together)
//
// DS-<branch>-<FY>-<MM>-<seq>; the checks point to it through
// CheckReconciliations.DepositSlipId. Nothing is posted.
//===============================================================

public class CheckDepositSlips
{
    public long CheckDepositSlipId { get; set; }

    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string SlipNo { get; set; } = string.Empty;

    public DateOnly SlipDate { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string BankLedgerCode { get; set; } = string.Empty;

    public string BankLedgerName { get; set; } = string.Empty;

    public int CheckCount { get; set; }

    public decimal TotalAmount { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}