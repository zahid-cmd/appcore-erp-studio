//===============================================================
// Provident Fund (Human Resource, hand-written pages : NEVER run
// Code Sync for them). Dates are yyyy-MM-dd ('' = none).
//
//   Policy       one record : contributions, eligibility,
//                interest, loans and the forfeiture rules
//   Members      an employee in the fund
//   Loans        a loan against the fund, recovered from salary
//   Settlements  payment / cancellation / forfeiture
//   Interest     the yearly interest
//===============================================================

export interface PfPolicy
{
    EmployeePercent: number;
    CompanyContributes: boolean;
    CompanyPercent: number;
    // Basic / Gross
    ContributionBase: string;
    // Joining / Confirmation / Months
    EligibilityRule: string;
    EligibilityMonths: number;
    InterestEnabled: boolean;
    InterestRate: number;
    // The yearly interest is worked out on : Monthly / Closing
    InterestBasis: string;
    LoanEnabled: boolean;
    // Percent of the member's own balance that can be on loan
    LoanMaxPercent: number;
    LoanMaxInstallments: number;
    // Interest on the loans (income of the fund) : Flat / Reducing
    LoanInterestEnabled: boolean;
    LoanInterestRate: number;
    LoanInterestMethod: string;
    // The company part needs this many years (0 = always paid)
    VestingYears: number;
    // Joining / Membership
    VestingFrom: string;
    ForfeitOnMisconduct: boolean;
    FullOnDeathRetirement: boolean;
    // The company part forfeited goes back to the company (not
    // kept by the fund)
    ForfeitToCompany: boolean;
    Remarks: string;
    ActiveMembers: number;
}

export interface PfLookup
{
    Id: number;
    Code: string;
    Name: string;
    Date: string;
    EmployeeBalance: number;
    CompanyBalance: number;
    LoanOutstanding: number;
    Note: string;
}

export interface PfMember
{
    PfMemberId: number;
    PublicId: string;
    Code: string;
    EmployeeId: number;
    EmployeeCode: string;
    EmployeeName: string;
    DesignationName: string;
    JoiningDate: string;
    MemberDate: string;
    OpeningEmployee: number;
    OpeningCompany: number;
    NomineeName: string;
    NomineeRelation: string;
    NomineePhone: string;
    // Active / Settled
    Status: string;
    Remarks: string;
    EmployeeBalance: number;
    CompanyBalance: number;
    LoanOutstanding: number;
}

export interface PfLoan
{
    PublicId: string;
    Code: string;
    PfMemberId: number;
    MemberCode: string;
    EmployeeCode: string;
    EmployeeName: string;
    LoanDate: string;
    Amount: number;
    Installments: number;
    InstallmentAmount: number;
    // yyyy-MM
    StartMonth: string;
    Remarks: string;
    // The terms the loan was given with : percent a year;
    // '' (no interest) / Flat / Reducing; the interest as planned
    InterestRate: number;
    InterestMethod: string;
    TotalInterest: number;
    // What came back (interest included), the interest in it, the
    // principal still out and what is still due in all
    Recovered: number;
    InterestPaid: number;
    PrincipalOutstanding: number;
    Outstanding: number;
    // Running / Closed
    Status: string;
}

export interface PfSettlement
{
    PublicId: string;
    Code: string;
    PfMemberId: number;
    MemberCode: string;
    EmployeeCode: string;
    EmployeeName: string;
    SettlementDate: string;
    Reason: string;
    Remarks: string;
    ServiceYears: number;
    EmployeeBalance: number;
    CompanyBalance: number;
    CompanyPaid: number;
    CompanyForfeited: number;
    LoanOutstanding: number;
    NetPayable: number;
    // The forfeited part went back to the company (not the fund)
    ForfeitedToCompany: boolean;
    // The Journal Voucher of the settlement ('' : none)
    JournalVoucherNo: string;
    RuleNote: string;
    IsLatest: boolean;
}

export interface PfDefaults
{
    NextCode: string;
    Policy: PfPolicy;
    // Members form : employees not in the fund yet
    Employees: PfLookup[];
    // Loans and settlements forms : active members
    Members: PfLookup[];
    Reasons: string[];
}

export interface PfInterestRow
{
    MemberCode: string;
    EmployeeCode: string;
    EmployeeName: string;
    EmployeeBalance: number;
    CompanyBalance: number;
    EmployeeInterest: number;
    CompanyInterest: number;
}

// A financial year (Settings > General Settings > Financial Years)
export interface PfFinancialYear
{
    FinancialYearId: number;
    Name: string;
    StartDate: string;
    EndDate: string;
    IsCurrent: boolean;
    Ended: boolean;
    IsPosted: boolean;
}

export interface PfInterestYear
{
    Year: PfFinancialYear;
    Rate: number;
    // Monthly / Closing (the policy)
    Basis: string;
    Rows: PfInterestRow[];
}

// The interest credited for one year (Id : the financial year)
export interface PfInterestRun
{
    Id: number;
    Name: string;
    // The Journal Voucher(s) of it, one a branch ('' : none)
    JournalVoucherNo: string;
    Members: number;
    EmployeeInterest: number;
    CompanyInterest: number;
}

export interface PfInterestHome
{
    Years: PfFinancialYear[];
    Runs: PfInterestRun[];
}

export interface PfStatementRow
{
    Date: string;
    Type: string;
    Remarks: string;
    EmployeeAmount: number;
    CompanyAmount: number;
    EmployeeBalance: number;
    CompanyBalance: number;
}

export interface PfRegisterRow
{
    MemberCode: string;
    EmployeeCode: string;
    EmployeeName: string;
    SheetCode: string;
    EmployeeAmount: number;
    CompanyAmount: number;
    LoanRecovered: number;
}

export function emptyPfPolicy(): PfPolicy
{
    return {
        EmployeePercent:10,
        CompanyContributes:true,
        CompanyPercent:10,
        ContributionBase:'Basic',
        EligibilityRule:'Confirmation',
        EligibilityMonths:0,
        InterestEnabled:false,
        InterestRate:0,
        InterestBasis:'Monthly',
        LoanEnabled:true,
        LoanMaxPercent:80,
        LoanMaxInstallments:24,
        LoanInterestEnabled:false,
        LoanInterestRate:0,
        LoanInterestMethod:'Flat',
        VestingYears:2,
        VestingFrom:'Joining',
        ForfeitOnMisconduct:true,
        FullOnDeathRetirement:true,
        ForfeitToCompany:false,
        Remarks:'',
        ActiveMembers:0
    };
}

// 12,500.00
export function pfMoney(value: number): string
{
    return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

// 12.5 (up to three decimals)
export function pfNumber(value: number): string
{
    return (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits:3 });
}

// 2026-11-14 : 14-Nov-2026
export function pfDay(value: string): string
{
    const m =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));

    if (!m)
    {
        return '';
    }

    const months =
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${m[3]}-${months[Number(m[2]) - 1]}-${m[1]}`;
}

export function pfToday(): string
{
    const now = new Date();

    const two =
        (value: number): string => String(value).padStart(2, '0');

    return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}

// A typed amount : two decimals, never negative
export function pfAmount(value: any): number
{
    const number =
        Number(String(value ?? '').replace(/,/g, ''));

    return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : 0;
}

// The eligibility of the policy in words
export function pfEligibleText(p: PfPolicy): string
{
    return p.EligibilityRule === 'Joining' ? 'from the joining date'
        : p.EligibilityRule === 'Months' ? `${p.EligibilityMonths} month(s) after joining`
        : 'from the confirmation date';
}

// The contribution of the policy in words
export function pfContributionText(p: PfPolicy): string
{
    return `Employee ${pfNumber(p.EmployeePercent)} %`
        + (p.CompanyContributes ? ` + company ${pfNumber(p.CompanyPercent)} %` : ' (no company part)')
        + ` of the ${p.ContributionBase.toLowerCase()} salary`;
}

// The forfeiture rules of the policy, a line each
export function pfForfeitLines(p: PfPolicy): string[]
{
    const counted =
        p.VestingFrom === 'Membership' ? 'membership' : 'service';

    const lines:
        string[] = [];

    lines.push(
        p.VestingYears > 0
            ? `Leaving before ${pfNumber(p.VestingYears)} year(s) of ${counted} : the company part is forfeited, the member gets the own part only.`
            : 'The company part is paid whatever the years.');

    lines.push(
        p.ForfeitOnMisconduct
            ? `Termination for misconduct or an illegal activity : no company part, even after ${pfNumber(p.VestingYears)} year(s).`
            : 'Termination for misconduct follows the years like any other reason.');

    lines.push(
        p.FullOnDeathRetirement
            ? 'Death or retirement : the whole company part is paid, whatever the years.'
            : 'Death or retirement follows the years like any other reason.');

    lines.push(
        p.ForfeitToCompany
            ? 'A company part that is forfeited goes back to the company (its income).'
            : 'A company part that is forfeited stays in the fund (income of the fund).');

    return lines;
}

// The interest of a whole loan and its instalment, as planned when
// the loan is given (the same rule as the server).
//   Flat      rate x the whole loan x the years, spread over the
//             instalments
//   Reducing  equal instalments; every month the interest is rate /
//             12 on what is still unpaid
export function pfPlanLoan
(
    amount: number,
    installments: number,
    rate: number,
    method: string
):
    { interest: number; installment: number }
{
    const up =
        (value: number): number => Math.ceil(Math.round(value * 1000000) / 10000) / 100;

    if (!(amount > 0) || !(installments > 0))
    {
        return { interest:0, installment:0 };
    }

    if (!(rate > 0) || !method)
    {
        return { interest:0, installment:up(amount / installments) };
    }

    if (method === 'Reducing')
    {
        const i = rate / 1200;

        const emi = up(amount * i / (1 - Math.pow(1 + i, -installments)));

        return { interest:Math.max(0, Math.round((emi * installments - amount) * 100) / 100), installment:emi };
    }

    const interest =
        Math.round((amount * rate / 100 * installments / 12 + Number.EPSILON) * 100) / 100;

    return { interest, installment:up((amount + interest) / installments) };
}

// The loan interest of the policy in words
export function pfLoanInterestText(p: PfPolicy): string
{
    return p.LoanEnabled && p.LoanInterestEnabled
        ? `${pfNumber(p.LoanInterestRate)} % a year, ${p.LoanInterestMethod === 'Reducing' ? 'on the reducing balance' : 'flat'}`
        : 'no interest';
}
