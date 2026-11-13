//===============================================================
// Payroll (Human Resource > Payroll Management, hand-written
// pages : NEVER run Code Sync for them). Dates are yyyy-MM-dd
// ('' = none).
//===============================================================

export interface PayrollLookup
{
    Id: number;
    Name: string;
}

export interface PayrollEmployee
{
    Id: number;
    Code: string;
    Name: string;
    DesignationName: string;
    GrossSalary: number;
}

//---------------------------------------------------------------
// Salary Advances
//---------------------------------------------------------------

export interface SalaryAdvance
{
    PublicId: string;
    Code: string;
    EmployeeId: number;
    EmployeeCode: string;
    EmployeeName: string;
    DesignationName: string;
    BranchName: string;
    // Advance / Loan
    AdvanceType: string;
    AdvanceDate: string;
    Amount: number;
    // Taken from each month's salary
    InstallmentAmount: number;
    // The first salary month the installment is taken from
    StartYear: number;
    StartMonth: number;
    Reason: string;
    // The Payment Voucher that paid it out (typed)
    VoucherNo: string;
    // Recovery is stopped
    IsClosed: boolean;
    Recovered: number;
    Balance: number;
    // Running / Recovered / Closed
    Status: string;
}

export interface SalaryAdvanceDefaults
{
    NextCode: string;
    Employees: PayrollEmployee[];
}

export function emptySalaryAdvance(): SalaryAdvance
{
    return {
        PublicId:'',
        Code:'',
        EmployeeId:0,
        EmployeeCode:'',
        EmployeeName:'',
        DesignationName:'',
        BranchName:'',
        AdvanceType:'Advance',
        AdvanceDate:'',
        Amount:0,
        InstallmentAmount:0,
        StartYear:0,
        StartMonth:0,
        Reason:'',
        VoucherNo:'',
        IsClosed:false,
        Recovered:0,
        Balance:0,
        Status:'Running'
    };
}

//---------------------------------------------------------------
// Salary Sheets
//---------------------------------------------------------------

export interface SalarySheetListItem
{
    PublicId: string;
    Code: string;
    Year: number;
    Month: number;
    BranchId: number;
    BranchName: string;
    // Draft / Approved / Posted
    Status: string;
    EmployeeCount: number;
    PaidCount: number;
    TotalGross: number;
    TotalEarned: number;
    TotalDeductions: number;
    TotalNet: number;
    JournalVoucherNo: string;
}

// A head of the salary structure as it was (payslip)
export interface SalarySheetHead
{
    HeadName: string;
    // Earning / Deduction
    HeadType: string;
    Amount: number;
}

export interface SalarySheetLine
{
    SalarySheetLineId: number;
    EmployeeId: number;
    EmployeeCode: string;
    EmployeeName: string;
    DesignationName: string;
    DepartmentName: string;
    PaymentMode: string;
    PaymentAccount: string;
    MonthDays: number;
    PayableDays: number;
    UnpaidDays: number;
    LateDays: number;
    OvertimeHours: number;
    // Extra days paid as overtime
    OvertimeDays: number;
    BasicSalary: number;
    GrossSalary: number;
    AbsenceDeduction: number;
    LateDeduction: number;
    OvertimeAmount: number;
    // Typed on a Draft sheet
    OtherEarning: number;
    OtherDeduction: number;
    EarnedSalary: number;
    StructureDeduction: number;
    AdvanceDeduction: number;
    // Provident fund : kept back from the employee, added by the
    // company (not part of the pay), and the fund loan instalment
    PfEmployee: number;
    PfCompany: number;
    PfLoan: number;
    NetPay: number;
    Remarks: string;
    IsPaid: boolean;
    PaidDate: string;
    PaidNote: string;
    Heads: SalarySheetHead[];
}

export interface SalarySheet extends SalarySheetListItem
{
    // This many late days cut one day of Basic (0 = no cut)
    LateDaysPerCut: number;
    Remarks: string;
    ApprovedDate: string;
    PostedDate: string;
    // Active employees left off : no salary structure
    NoSalaryCount: number;
    Lines: SalarySheetLine[];
}

export interface SalarySheetDefaults
{
    NextCode: string;
    Year: number;
    Month: number;
    LateDaysPerCut: number;
    Branches: PayrollLookup[];
}

export interface GenerateSalarySheet
{
    Year: number;
    Month: number;
    BranchId: number;
    LateDaysPerCut: number;
    Remarks: string;
}


//===============================================================
// Helpers
//===============================================================

export const PAYROLL_MONTHS =
    ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// November 2026
export function payMonthText(year: number, month: number): string
{
    return month >= 1 && month <= 12 ? `${PAYROLL_MONTHS[month - 1]} ${year}` : '';
}

// yyyy-MM-dd -> 13 Nov 2026
export function payDayText(value: string): string
{
    const m =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

    return m ? `${Number(m[3])} ${PAYROLL_MONTHS[Number(m[2]) - 1].slice(0, 3)} ${m[1]}` : '';
}

// 12,500.00
export function payMoney(value: number): string
{
    return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

// 12,500.00, or '' for nothing (table cells)
export function payMoneyOrBlank(value: number): string
{
    return Number(value) ? payMoney(value) : '';
}

// A typed amount : 0 or more, two decimals
export function payAmount(value: any): number
{
    const number =
        Number(String(value ?? '').replace(/,/g, ''));

    return Number.isFinite(number) && number > 0
        ? Math.round(number * 100) / 100
        : 0;
}

export function payToday(): string
{
    const now = new Date();

    const two =
        (value: number): string => String(value).padStart(2, '0');

    return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}

export const PAYROLL_STATUS_COLORS:
    Record<string, string> =
{
    Draft:'#b45309',
    Approved:'#1d4ed8',
    Posted:'#047857',
    Running:'#1d4ed8',
    Recovered:'#047857',
    Closed:'#64748b'
};
