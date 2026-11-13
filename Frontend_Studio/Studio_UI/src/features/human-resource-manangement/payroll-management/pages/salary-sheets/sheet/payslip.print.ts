//===============================================================
// Payslips of a salary sheet : printed by the Print Engine
//
// The payslips are made from the sheet already on screen and
// handed to the shared print viewer (company header, PDF, Excel) :
// human-resource-manangement/print/hr-print.ts.
//===============================================================

import
{
    Router
}
from '@angular/router';

import
{
    HR_PAYSLIP_PRINT_KEY,
    HrPayslip,
    openHrPrint,
    saveHrPayslips
}
from '../../../../print/hr-print';

import
{
    SalarySheet,
    SalarySheetLine,
    payDayText,
    payMoney,
    payMonthText
}
from '../../../models/payroll.model';

// A line of a payslip : label and Tk
function row(label: string, amount: number): [string, string]
{
    return [label, payMoney(amount)];
}

function slip(line: SalarySheetLine): HrPayslip
{
    // Earnings : the structure's earning heads, then what the
    // month added
    const earnings =
    [
        ...line.Heads.filter(h => h.HeadType === 'Earning').map(h => row(h.HeadName, h.Amount)),
        ...(line.OvertimeAmount ? [row(`Overtime (${[line.OvertimeHours ? line.OvertimeHours + ' h' : '', line.OvertimeDays ? line.OvertimeDays + ' extra day(s)' : ''].filter(Boolean).join(', ') || '-'})`, line.OvertimeAmount)] : []),
        ...(line.OtherEarning ? [row('Other Earning', line.OtherEarning)] : [])
    ];

    const totalEarnings =
        line.GrossSalary + line.OvertimeAmount + line.OtherEarning;

    // Deductions : what the month cut, then what was kept back
    const deductions =
    [
        ...(line.AbsenceDeduction ? [row(`Absence (${line.UnpaidDays} unpaid day(s))`, line.AbsenceDeduction)] : []),
        ...(line.LateDeduction ? [row(`Late (${line.LateDays} day(s))`, line.LateDeduction)] : []),
        ...(line.StructureDeduction
            ? line.Heads.filter(h => h.HeadType === 'Deduction').length === 1
                ? [row(line.Heads.find(h => h.HeadType === 'Deduction')!.HeadName, line.StructureDeduction)]
                : [row('Tax / Other (salary structure)', line.StructureDeduction)]
            : []),
        ...(line.PfEmployee ? [row('Provident Fund', line.PfEmployee)] : []),
        ...(line.PfLoan ? [row('Provident Fund Loan', line.PfLoan)] : []),
        ...(line.AdvanceDeduction ? [row('Advance / Loan Recovery', line.AdvanceDeduction)] : []),
        ...(line.OtherDeduction ? [row('Other Deduction', line.OtherDeduction)] : [])
    ];

    const totalDeductions =
        totalEarnings - line.NetPay;

    return {
        employeeName:line.EmployeeName,
        employeeCode:line.EmployeeCode,
        designation:line.DesignationName,
        department:line.DepartmentName,
        monthDays:String(line.MonthDays),
        payDays:String(line.PayableDays),
        unpaidLate:`${line.UnpaidDays} / ${line.LateDays}`,
        status:line.IsPaid ? 'Paid' : 'Not paid yet',
        paidOn:line.IsPaid ? payDayText(line.PaidDate) : '-',
        earnings,
        totalEarnings:payMoney(totalEarnings),
        deductions,
        totalDeductions:payMoney(totalDeductions),
        netPay:payMoney(line.NetPay),
        remarks:line.Remarks ?? ''
    };
}

// Opens the Print Engine viewer with the payslips of the lines.
// '' when it opened; otherwise what to tell the user.
export function printPayslips
(
    router: Router,
    sheet: SalarySheet,
    lines: SalarySheetLine[]
):
    string
{
    const token =
        saveHrPayslips(
        {
            month:payMonthText(sheet.Year, sheet.Month),
            branch:sheet.BranchName,
            sheet:`${sheet.Code} · ${sheet.Status}`,
            slips:lines.map(slip)
        });

    return openHrPrint(router, HR_PAYSLIP_PRINT_KEY, token, 'payslips');
}
