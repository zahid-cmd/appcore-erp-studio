//===============================================================
// Payments of Human Resource : one page, four kinds.
//
//   group 'payroll'  Payroll Management > Payroll Payments
//                    Salary, Overtime (a posted salary sheet),
//                    Advance (a salary advance paid out), Bonus (a
//                    posted bonus sheet), Encashment (a leave
//                    encashment)
//   group 'pf'       Provident Fund > PF Payments
//                    PfSettlement, PfLoan
//
// A payment pays one source, in full or in part; every payment
// writes a Payment Voucher (posted at once). Dates : yyyy-MM-dd.
//===============================================================

export type HrPaymentGroup =
    'payroll' | 'pf';

export interface HrPaymentListItem
{
    PublicId: string;
    Code: string;
    // Salary / Overtime / PfSettlement / PfLoan
    PaymentType: string;
    PaymentTypeText: string;
    // SAL-0001 / OTS-0001 / PFS-0001 / PFL-0001
    SourceCode: string;
    BranchId: number;
    BranchName: string;
    PaymentDate: string;
    TotalAmount: number;
    PaymentModes: string;
    EmployeeCount: number;
    PaymentVoucherNo: string;
    // (to open the print of the voucher; '' : none)
    PaymentVoucherPublicId: string;
    IsCancelled: boolean;
    CancelReason: string;
    Remarks: string;
}

// An employee of a source (what is due) / of a payment (Amount)
export interface HrPaymentLine
{
    EmployeeId: number;
    // The line of the salary sheet (0 : a settlement / a loan)
    SalarySheetLineId: number;
    EmployeeCode: string;
    EmployeeName: string;
    DesignationName: string;
    BankName: string;
    BankAccountNo: string;
    MfsName: string;
    MfsNo: string;
    Payable: number;
    Paid: number;
    Due: number;
    // Paid by this payment
    Amount: number;
}

export interface HrPayment
extends HrPaymentListItem
{
    Lines: HrPaymentLine[];
}

// A salary sheet / settlement / loan with something still due
export interface HrPaymentSource
{
    SourceId: number;
    Code: string;
    Text: string;
    BranchId: number;
    BranchName: string;
    Payable: number;
    Paid: number;
    Due: number;
}

export interface HrPaymentPage
{
    title: string;
    singular: string;
    subtitle: string;
    icon: string;
    // What the source is called on the page
    sourceLabel: Record<string, string>;
    types: { label: string; value: string }[];
}

export const HR_PAYMENT_PAGES:
    Record<HrPaymentGroup, HrPaymentPage> =
{
    payroll:
    {
        title:'Payroll Payments',
        singular:'Payroll Payment',
        subtitle:'Pays salary, overtime, festival bonus, leave encashment and salary advances, in full or in part',
        icon:'fas fa-money-bill-transfer',
        sourceLabel:
        {
            Salary:'Salary Sheet',
            Overtime:'Overtime Sheet',
            Bonus:'Bonus Sheet',
            Encashment:'Leave Encashment',
            Advance:'Salary Advance'
        },
        types:
        [
            { label:'Salary', value:'Salary' },
            { label:'Overtime', value:'Overtime' },
            { label:'Festival Bonus', value:'Bonus' },
            { label:'Leave Encashment', value:'Encashment' },
            { label:'Salary Advance', value:'Advance' }
        ]
    },
    pf:
    {
        title:'PF Payments',
        singular:'PF Payment',
        subtitle:'Pays the provident fund settlements and the loans of the fund',
        icon:'fas fa-money-bill-transfer',
        sourceLabel:{ PfSettlement:'PF Settlement', PfLoan:'PF Loan' },
        types:
        [
            { label:'PF Settlement', value:'PfSettlement' },
            { label:'PF Loan', value:'PfLoan' }
        ]
    }
};

// 12,500.00
export function hrPayMoney(value: number): string
{
    return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

// yyyy-MM-dd -> 13 Nov 2026
export function hrPayDay(value: string): string
{
    const m =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

    const months =
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return m ? `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}` : '';
}
