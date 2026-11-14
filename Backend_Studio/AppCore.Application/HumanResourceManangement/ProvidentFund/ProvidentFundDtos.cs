//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.ProvidentFund;


//===============================================================
// Provident Fund (hand-written pages). Dates are yyyy-MM-dd
// ('' = none).
//===============================================================

// The policy : one record, edited in place
public class PfPolicyDto
{
    public decimal EmployeePercent { get; set; } = 10;

    public bool CompanyContributes { get; set; } = true;

    public decimal CompanyPercent { get; set; } = 10;

    // Basic / Gross
    public string ContributionBase { get; set; } = "Basic";

    // Joining / Confirmation / Months
    public string EligibilityRule { get; set; } = "Confirmation";

    public int EligibilityMonths { get; set; }

    public bool InterestEnabled { get; set; }

    public decimal InterestRate { get; set; }

    // Monthly / Closing
    public string InterestBasis { get; set; } = "Monthly";

    public bool LoanEnabled { get; set; } = true;

    public decimal LoanMaxPercent { get; set; } = 80;

    public int LoanMaxInstallments { get; set; } = 24;

    // Interest on the loans : Flat / Reducing
    public bool LoanInterestEnabled { get; set; }

    public decimal LoanInterestRate { get; set; }

    public string LoanInterestMethod { get; set; } = "Flat";

    public decimal VestingYears { get; set; } = 2;

    // Joining / Membership
    public string VestingFrom { get; set; } = "Joining";

    public bool ForfeitOnMisconduct { get; set; } = true;

    public bool FullOnDeathRetirement { get; set; } = true;

    // The company part forfeited goes back to the company (not
    // kept by the fund)
    public bool ForfeitToCompany { get; set; }

    public string Remarks { get; set; } = string.Empty;

    // Read only
    public int ActiveMembers { get; set; }
}

public class PfLookupDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Employees : the date the policy lets them join; members : the
    // membership date
    public string Date { get; set; } = string.Empty;

    // Members : the balances now
    public decimal EmployeeBalance { get; set; }

    public decimal CompanyBalance { get; set; }

    public decimal LoanOutstanding { get; set; }

    public string Note { get; set; } = string.Empty;
}

public class PfMemberDto
{
    public long PfMemberId { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long EmployeeId { get; set; }

    public string EmployeeCode { get; set; } = string.Empty;

    public string EmployeeName { get; set; } = string.Empty;

    public string DesignationName { get; set; } = string.Empty;

    public string JoiningDate { get; set; } = string.Empty;

    public string MemberDate { get; set; } = string.Empty;

    public decimal OpeningEmployee { get; set; }

    public decimal OpeningCompany { get; set; }

    public string NomineeName { get; set; } = string.Empty;

    public string NomineeRelation { get; set; } = string.Empty;

    public string NomineePhone { get; set; } = string.Empty;

    // Active / Settled
    public string Status { get; set; } = "Active";

    public string Remarks { get; set; } = string.Empty;

    // Read only : the balances now
    public decimal EmployeeBalance { get; set; }

    public decimal CompanyBalance { get; set; }

    public decimal LoanOutstanding { get; set; }
}

public class PfMemberDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;

    public PfPolicyDto Policy { get; set; } = new();

    // Active employees not in the fund yet (Date : eligible from)
    public List<PfLookupDto> Employees { get; set; } = new();
}

public class PfLoanDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long PfMemberId { get; set; }

    public string MemberCode { get; set; } = string.Empty;

    public string EmployeeCode { get; set; } = string.Empty;

    public string EmployeeName { get; set; } = string.Empty;

    public string LoanDate { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public int Installments { get; set; }

    public decimal InstallmentAmount { get; set; }

    // yyyy-MM : the first salary month it is recovered from
    public string StartMonth { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // Read only : the terms the loan was given with
    public decimal InterestRate { get; set; }

    // '' (no interest) / Flat / Reducing
    public string InterestMethod { get; set; } = string.Empty;

    // The interest of the whole loan as planned
    public decimal TotalInterest { get; set; }

    // Read only : what came back (interest included), the interest
    // in it, the principal still out and what settling it now takes
    public decimal Recovered { get; set; }

    public decimal InterestPaid { get; set; }

    public decimal PrincipalOutstanding { get; set; }

    public decimal Outstanding { get; set; }

    // Running / Closed
    public string Status { get; set; } = string.Empty;
}

public class PfLoanDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;

    public PfPolicyDto Policy { get; set; } = new();

    // Active members with their balances
    public List<PfLookupDto> Members { get; set; } = new();
}

public class PfSettlementDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public long PfMemberId { get; set; }

    public string MemberCode { get; set; } = string.Empty;

    public string EmployeeCode { get; set; } = string.Empty;

    public string EmployeeName { get; set; } = string.Empty;

    public string SettlementDate { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // Worked out by the policy (read only)
    public decimal ServiceYears { get; set; }

    public decimal EmployeeBalance { get; set; }

    public decimal CompanyBalance { get; set; }

    public decimal CompanyPaid { get; set; }

    public decimal CompanyForfeited { get; set; }

    public decimal LoanOutstanding { get; set; }

    public decimal NetPayable { get; set; }

    public bool ForfeitedToCompany { get; set; }

    public string JournalVoucherNo { get; set; } = string.Empty;

    public string RuleNote { get; set; } = string.Empty;

    // The member's latest settlement : it can be deleted
    public bool IsLatest { get; set; }
}

public class PfSettlementDefaultsDto
{
    public string NextCode { get; set; } = string.Empty;

    public PfPolicyDto Policy { get; set; } = new();

    public List<string> Reasons { get; set; } = new();

    public List<PfLookupDto> Members { get; set; } = new();
}

// The yearly interest
public class PfInterestRowDto
{
    public string MemberCode { get; set; } = string.Empty;

    public string EmployeeCode { get; set; } = string.Empty;

    public string EmployeeName { get; set; } = string.Empty;

    // The balances the interest is worked out on
    public decimal EmployeeBalance { get; set; }

    public decimal CompanyBalance { get; set; }

    public decimal EmployeeInterest { get; set; }

    public decimal CompanyInterest { get; set; }
}

// A financial year (Settings > General Settings > Financial Years)
public class PfFinancialYearDto
{
    public long FinancialYearId { get; set; }

    // FY 2026-2027
    public string Name { get; set; } = string.Empty;

    public string StartDate { get; set; } = string.Empty;

    public string EndDate { get; set; } = string.Empty;

    public bool IsCurrent { get; set; }

    // The year is over : its interest can be credited
    public bool Ended { get; set; }

    // The interest of the year is credited already
    public bool IsPosted { get; set; }
}

public class PfInterestYearDto
{
    public PfFinancialYearDto Year { get; set; } = new();

    public decimal Rate { get; set; }

    // Monthly / Closing (the policy)
    public string Basis { get; set; } = "Monthly";

    public List<PfInterestRowDto> Rows { get; set; } = new();
}

// The interest credited for one year
public class PfInterestRunDto
{
    // The financial year (an interest credited before financial
    // years : the calendar year)
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    // The Journal Voucher(s) of it : one a branch
    public string JournalVoucherNo { get; set; } = string.Empty;

    public int Members { get; set; }

    public decimal EmployeeInterest { get; set; }

    public decimal CompanyInterest { get; set; }
}

// The PF Interest page : the financial years and what is credited
public class PfInterestHomeDto
{
    public List<PfFinancialYearDto> Years { get; set; } = new();

    public List<PfInterestRunDto> Runs { get; set; } = new();
}

// Reports
public class PfStatementRowDto
{
    public string Date { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public decimal EmployeeAmount { get; set; }

    public decimal CompanyAmount { get; set; }

    public decimal EmployeeBalance { get; set; }

    public decimal CompanyBalance { get; set; }
}

public class PfStatementDto
{
    public PfMemberDto Member { get; set; } = new();

    public List<PfStatementRowDto> Rows { get; set; } = new();
}

public class PfRegisterRowDto
{
    public string MemberCode { get; set; } = string.Empty;

    public string EmployeeCode { get; set; } = string.Empty;

    public string EmployeeName { get; set; } = string.Empty;

    public string SheetCode { get; set; } = string.Empty;

    public decimal EmployeeAmount { get; set; }

    public decimal CompanyAmount { get; set; }

    public decimal LoanRecovered { get; set; }
}

// The income of the fund : not the members' money
public class PfIncomeDto
{
    // Interest received on the loans
    public decimal LoanInterest { get; set; }

    // Company parts forfeited on settlements, kept by the fund
    public decimal Forfeited { get; set; }

    // Company parts forfeited that went back to the company
    public decimal ForfeitedToCompany { get; set; }
}
