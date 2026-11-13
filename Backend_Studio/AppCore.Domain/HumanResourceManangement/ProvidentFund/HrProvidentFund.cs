//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.HumanResourceManangement.ProvidentFund;


//===============================================================
// Provident Fund (Human Resource, hand-written pages : NEVER run
// Code Sync for them; tables made by
// HumanResource_ProvidentFund_Engine.sql)
//
//   HrPfPolicy          ONE row : the rules of the fund
//   HrPfMembers         PFM-0001  an employee in the fund
//   HrPfTransactions              the ledger (employee part and
//                                 company part; + in, - out)
//   HrPfLoans           PFL-0001  a loan against the fund
//   HrPfLoanRecoveries            what was taken back of a loan
//   HrPfSettlements     PFS-0001  payment / cancellation /
//                                 forfeiture
//===============================================================

public class HrPfPolicy
{
    public long PfPolicyId { get; set; }

    // Contributions : percent of the base, every month
    public decimal EmployeePercent { get; set; } = 10;

    public bool CompanyContributes { get; set; } = true;

    public decimal CompanyPercent { get; set; } = 10;

    // Basic / Gross
    public string ContributionBase { get; set; } = "Basic";

    // Joining / Confirmation / Months (after joining)
    public string EligibilityRule { get; set; } = "Confirmation";

    public int EligibilityMonths { get; set; }

    public bool InterestEnabled { get; set; }

    // Percent a year
    public decimal InterestRate { get; set; }

    public bool LoanEnabled { get; set; } = true;

    // Percent of the member's own balance that can be on loan
    public decimal LoanMaxPercent { get; set; } = 80;

    public int LoanMaxInstallments { get; set; } = 24;

    // Interest on the loans : income of the fund. Flat (rate x the
    // whole loan x the years) or Reducing (every month on what is
    // still unpaid)
    public bool LoanInterestEnabled { get; set; }

    public decimal LoanInterestRate { get; set; }

    public string LoanInterestMethod { get; set; } = "Flat";

    // Not used : a loan settled early pays the interest of the
    // months used only (always false)
    public bool LoanEarlyFullInterest { get; set; }

    // The company part needs this many years (0 = always paid),
    // counted from Joining / Membership
    public decimal VestingYears { get; set; } = 2;

    public string VestingFrom { get; set; } = "Joining";

    // Termination for misconduct : no company part, whatever the years
    public bool ForfeitOnMisconduct { get; set; } = true;

    // Death / retirement : the whole company part, whatever the years
    public bool FullOnDeathRetirement { get; set; } = true;

    public string Remarks { get; set; } = string.Empty;

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class HrPfMembers
{
    public long PfMemberId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long EmployeeId { get; set; }

    public DateOnly MemberDate { get; set; }

    public decimal OpeningEmployee { get; set; }

    public decimal OpeningCompany { get; set; }

    public string NomineeName { get; set; } = string.Empty;

    public string NomineeRelation { get; set; } = string.Empty;

    public string NomineePhone { get; set; } = string.Empty;

    // Active / Settled
    public string Status { get; set; } = "Active";

    public string Remarks { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class HrPfTransactions
{
    public long PfTransactionId { get; set; }

    public long PfMemberId { get; set; }

    public long EmployeeId { get; set; }

    public DateOnly TxnDate { get; set; }

    // Opening / Contribution / Interest / Payment / Forfeit
    public string TxnType { get; set; } = string.Empty;

    // + into the fund, - out of it
    public decimal EmployeeAmount { get; set; }

    public decimal CompanyAmount { get; set; }

    // Member / SalarySheet / Interest / Settlement, and its id
    // (Interest : the year)
    public string SourceType { get; set; } = string.Empty;

    public long SourceId { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}

public class HrPfLoans
{
    public long PfLoanId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long PfMemberId { get; set; }

    public long EmployeeId { get; set; }

    public DateOnly LoanDate { get; set; }

    public decimal Amount { get; set; }

    public int Installments { get; set; }

    public decimal InstallmentAmount { get; set; }

    // The first salary month it is recovered from
    public int StartYear { get; set; }

    public int StartMonth { get; set; }

    // The terms the loan was given with (the policy of that day) :
    // percent a year; '' (no interest) / Flat / Reducing; the
    // interest of the whole loan as planned. EarlyFullInterest is
    // not used (always false : settling early pays the interest of
    // the months used only). InstallmentAmount holds the interest
    // too.
    public decimal InterestRate { get; set; }

    public string InterestMethod { get; set; } = string.Empty;

    public decimal TotalInterest { get; set; }

    public bool EarlyFullInterest { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}

public class HrPfLoanRecoveries
{
    public long PfLoanRecoveryId { get; set; }

    public long PfLoanId { get; set; }

    // A salary sheet line, or (0) the settlement of the member
    public long SalarySheetId { get; set; }

    public long SalarySheetLineId { get; set; }

    public long PfSettlementId { get; set; }

    public long EmployeeId { get; set; }

    public decimal Amount { get; set; }

    // The part of Amount that is interest (income of the fund)
    public decimal InterestAmount { get; set; }
}

public class HrPfSettlements
{
    public long PfSettlementId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long PfMemberId { get; set; }

    public long EmployeeId { get; set; }

    public DateOnly SettlementDate { get; set; }

    // Resignation / Retirement / Termination / Misconduct / Death /
    // Membership Cancelled / Other
    public string Reason { get; set; } = string.Empty;

    public decimal ServiceYears { get; set; }

    public decimal EmployeeBalance { get; set; }

    public decimal CompanyBalance { get; set; }

    public decimal CompanyPaid { get; set; }

    public decimal CompanyForfeited { get; set; }

    public decimal LoanOutstanding { get; set; }

    public decimal NetPayable { get; set; }

    // The rule of the policy that decided the company part
    public string RuleNote { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
