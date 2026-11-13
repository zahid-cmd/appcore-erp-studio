//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
    inject
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    Observable
}
from 'rxjs';

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { DatepickerComponent } from '../../../../../../shared/components/controls/datepicker/datepicker';
import { hrDateEvent, hrToDate } from '../../../../services/hr-date';
import { PageToolbarComponent } from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { EmptyStateComponent } from '../../../../../../shared/components/layout/empty-state/empty-state';
import { SearchBoxComponent } from '../../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../../services/hr-progress.service';

import
{
    SalarySheet,
    SalarySheetLine,
    payAmount,
    payDayText,
    payMoney,
    payMoneyOrBlank,
    payMonthText,
    payToday
}
from '../../../models/payroll.model';

import
{
    PayrollService
}
from '../../../services/payroll.service';

import
{
    printPayslips
}
from './payslip.print';


//===============================================================
// Salary Sheet (Human Resource > Payroll Management)
//
// One branch's salary of one month, a line per employee.
//   Draft    : Other Earning / Other Deduction / Remarks can be
//              typed (Save works the sheet out again);
//              Recalculate; Approve.
//   Approved : Post (writes the Journal Voucher); Return to Draft.
//   Posted   : Mark Paid (all, or one employee); Unpost.
// Payslips print for the whole sheet or one employee. Totals in
// the table foot; summary line below the canvas.
//===============================================================

@Component(
{
    selector:'salary-sheet',
    standalone:true,
    imports:
    [
        CommonModule,
        DatepickerComponent,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        EmptyStateComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./salary-sheet.html',
    styleUrl:'./salary-sheet.css'
})
export class SalarySheetPage
implements OnInit
{
    // The shared date picker works with a Date; the page keeps
    // yyyy-MM-dd text
    readonly asDate = hrToDate;

    readonly dateEvent = hrDateEvent;

    private readonly service = inject(PayrollService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    sheetId =
        '';

    sheet:
        SalarySheet | null = null;

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    isSaving =
        false;

    hasChanges =
        false;

    private initialJson =
        '';

    // The small panel under the toolbar : '' = closed
    panel:
        '' | 'unpost' | 'pay' =
        '';

    panelText =
        '';

    panelDate =
        payToday();

    readonly today =
        payToday();

    get status(): string
    {
        return this.sheet?.Status ?? '';
    }

    get isDraft(): boolean
    {
        return this.status === 'Draft';
    }

    get isApproved(): boolean
    {
        return this.status === 'Approved';
    }

    get isPosted(): boolean
    {
        return this.status === 'Posted';
    }

    get pageTitle(): string
    {
        return this.sheet
            ? `Salary Sheet ${this.sheet.Code}`
            : 'Salary Sheet';
    }

    get pageSubtitle(): string
    {
        return this.sheet
            ? `${payMonthText(this.sheet.Year, this.sheet.Month)} · ${this.sheet.BranchName}`
            : 'The salary of a branch for a month';
    }

    get lines(): SalarySheetLine[]
    {
        return this.sheet?.Lines ?? [];
    }

    get visibleLines(): SalarySheetLine[]
    {
        const find =
            this.searchText.trim().toLowerCase();

        return !find
            ? this.lines
            : this.lines.filter(l =>
                [l.EmployeeCode, l.EmployeeName, l.DesignationName, l.DepartmentName]
                    .some(v => (v ?? '').toLowerCase().includes(find)));
    }

    get unpaidCount(): number
    {
        return this.lines.filter(l => !l.IsPaid).length;
    }

    get paidCount(): number
    {
        return this.lines.length - this.unpaidCount;
    }

    // Totals of the whole sheet (whatever the search)
    total(field: keyof SalarySheetLine): number
    {
        return this.lines.reduce((sum, l) => sum + (Number(l[field]) || 0), 0);
    }

    get summaryItems(): { label: string; value: string; tone: '' | 'ok' | 'bad' }[]
    {
        const items:
            { label: string; value: string; tone: '' | 'ok' | 'bad' }[] =
        [
            { label:'Employees', value:this.lines.length.toLocaleString('en-US'), tone:'' },
            { label:'Gross', value:payMoney(this.total('GrossSalary')), tone:'' },
            { label:'Earned', value:payMoney(this.total('EarnedSalary')), tone:'' },
            {
                label:'Deductions',
                value:payMoney(this.total('StructureDeduction') + this.total('AdvanceDeduction') + this.total('OtherDeduction') + this.total('PfEmployee') + this.total('PfLoan')),
                tone:'bad'
            },
            { label:'Net Pay', value:`Tk ${payMoney(this.total('NetPay'))}`, tone:'ok' }
        ];

        if (this.isPosted)
        {
            items.push({ label:'Paid', value:`${this.paidCount} / ${this.lines.length}`, tone:this.unpaidCount === 0 ? 'ok' : '' });
        }

        return items;
    }

    // The centred state shown instead of the lines : loading,
    // failed, or a sheet without employees
    get emptyState(): { icon: string; title: string; subtitle: string } | null
    {
        if (this.lines.length > 0)
        {
            return null;
        }

        if (this.loading)
        {
            return { icon:'fas fa-spinner fa-spin', title:'Loading', subtitle:'Loading the salary sheet...' };
        }

        if (this.loadFailed)
        {
            return { icon:'fas fa-triangle-exclamation', title:'Unable to Load Data', subtitle:'An error occurred while loading the salary sheet. Press Refresh to try again.' };
        }

        return { icon:'fas fa-file-circle-xmark', title:'No Employees on the Sheet', subtitle:'Set the salary structures on Employee Profiles, then Recalculate.' };
    }

    money(value: number): string
    {
        return payMoney(value);
    }

    blank(value: number): string
    {
        return payMoneyOrBlank(value);
    }

    dayText(value: string): string
    {
        return payDayText(value);
    }

    //===========================================================
    // Load
    //===========================================================

    ngOnInit():
        void
    {
        this.sheetId =
            this.route.snapshot.paramMap.get('id') ?? '';

        this.load();
    }

    private load():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.service
            .getSheet(this.sheetId)
            .subscribe(
            {
                next:sheet =>
                {
                    this.sheet = sheet;
                    this.loading = false;
                    this.panel = '';
                    this.initialJson = JSON.stringify(this.typed());
                    this.hasChanges = false;
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'The salary sheet could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    // What the user can type on a Draft sheet
    private typed(): any
    {
        return {
            Remarks:this.sheet?.Remarks ?? '',
            Lines:this.lines.map(l => [l.SalarySheetLineId, l.OtherEarning, l.OtherDeduction, l.Remarks])
        };
    }

    private changed():
        void
    {
        this.hasChanges = JSON.stringify(this.typed()) !== this.initialJson;
        this.cdr.detectChanges();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.cdr.detectChanges();
    }

    //===========================================================
    // Draft : the typed amounts
    //===========================================================

    onTyped(line: SalarySheetLine, field: 'OtherEarning' | 'OtherDeduction', event: Event):
        void
    {
        line[field] = payAmount((event.target as HTMLInputElement).value);
        this.changed();
    }

    onTypedBlur(line: SalarySheetLine, field: 'OtherEarning' | 'OtherDeduction', event: Event):
        void
    {
        (event.target as HTMLInputElement).value = line[field] ? String(line[field]) : '';
    }

    onLineRemarks(line: SalarySheetLine, event: Event):
        void
    {
        line.Remarks = (event.target as HTMLInputElement).value ?? '';
        this.changed();
    }

    // Runs a call with the progress dialog, then goes back to the
    // list of salary sheets. stay : the sheet is loaded again instead
    // (recalculate, and marking one employee paid / not paid, which
    // are done again and again on the same sheet).
    private run(title: string, text: string, call: Observable<any>, done: (result: any) => string, failure: string, stay = false):
        void
    {
        if (this.isSaving)
        {
            return;
        }

        this.isSaving = true;

        this.progressDialog.show(title, text, false);

        call.subscribe(
        {
            next:result =>
            {
                this.progressDialog.finish(() =>
                {
                    this.isSaving = false;
                    this.toast.success('Success', done(result));

                    if (stay)
                    {
                        this.load();
                    }
                    else
                    {
                        this.goToList();
                    }
                });
            },
            error:error =>
            {
                this.progressDialog.fail();
                this.isSaving = false;
                this.toast.error('Error', error?.error?.message ?? failure);
                this.cdr.detectChanges();
            }
        });
    }

    // Typed amounts must be saved before the sheet moves on
    private needsSave(action: string): boolean
    {
        if (this.hasChanges)
        {
            this.toast.error('Salary Sheet', `Save the typed amounts first, then ${action}.`);
            return true;
        }

        return false;
    }

    onSave():
        void
    {
        if (!this.sheet || !this.isDraft)
        {
            return;
        }

        if (!this.hasChanges)
        {
            this.toast.info('Salary Sheet', 'There is nothing to save.');
            return;
        }

        this.run(
            'Saving',
            'Saving and working the sheet out again...',
            this.service.saveSheet(this.sheet),
            () => `${this.sheet?.Code} saved.`,
            'The salary sheet could not be saved.');
    }

    onRecalculate():
        void
    {
        if (!this.sheet || !this.isDraft || this.needsSave('recalculate'))
        {
            return;
        }

        this.confirmDialog.open(
            'Recalculate',
            `Work ${this.sheet.Code} out again from the attendance, the salary structures and the advances as they are now? The typed amounts stay.`,
            () =>
                this.run(
                    'Recalculating',
                    'Working the sheet out again...',
                    this.service.stepSheet(this.sheetId, 'recalculate'),
                    () => `${this.sheet?.Code} recalculated.`,
                    'The salary sheet could not be recalculated.',
                    true),
            'Recalculate',
            'Cancel',
            'primary');
    }

    //===========================================================
    // Workflow
    //===========================================================

    onApprove():
        void
    {
        if (!this.sheet || !this.isDraft || this.needsSave('approve'))
        {
            return;
        }

        this.confirmDialog.open(
            'Approve Salary Sheet',
            `Approve ${this.sheet.Code} : ${this.lines.length} employee(s), net pay Tk ${this.money(this.total('NetPay'))}? An approved sheet is locked.`,
            () =>
                this.run(
                    'Approving',
                    'Approving the salary sheet...',
                    this.service.stepSheet(this.sheetId, 'approve'),
                    () => `${this.sheet?.Code} approved.`,
                    'The salary sheet could not be approved.'),
            'Approve',
            'Cancel',
            'primary');
    }

    onReturnToDraft():
        void
    {
        if (!this.sheet || !this.isApproved)
        {
            return;
        }

        this.confirmDialog.open(
            'Return to Draft',
            `Take ${this.sheet.Code} back to Draft so it can be changed?`,
            () =>
                this.run(
                    'Saving',
                    'Returning the sheet to Draft...',
                    this.service.stepSheet(this.sheetId, 'return-to-draft'),
                    () => `${this.sheet?.Code} is a Draft again.`,
                    'The salary sheet could not be returned to Draft.'),
            'Return to Draft',
            'Cancel',
            'primary');
    }

    onPost():
        void
    {
        if (!this.sheet || !this.isApproved)
        {
            return;
        }

        this.confirmDialog.open(
            'Post Salary Sheet',
            `Post ${this.sheet.Code} to the accounts? One Journal Voucher is written : salary expense Tk ${this.money(this.total('EarnedSalary'))}, salary payable Tk ${this.money(this.total('NetPay'))}.`,
            () =>
                this.run(
                    'Posting',
                    'Writing the Journal Voucher...',
                    this.service.stepSheet(this.sheetId, 'post'),
                    () => `${this.sheet?.Code} posted.`,
                    'The salary sheet could not be posted.'),
            'Post',
            'Cancel',
            'primary');
    }

    openPanel(panel: 'unpost' | 'pay'):
        void
    {
        this.panel = this.panel === panel ? '' : panel;
        this.panelText = '';
        this.panelDate = this.today;
        this.cdr.detectChanges();
    }

    closePanel():
        void
    {
        this.panel = '';
        this.cdr.detectChanges();
    }

    onPanelText(event: Event):
        void
    {
        this.panelText = (event.target as HTMLInputElement).value ?? '';
    }

    onPanelDate(event: Event):
        void
    {
        this.panelDate = (event.target as HTMLInputElement).value ?? '';
    }

    confirmUnpost():
        void
    {
        if (!this.sheet || !this.isPosted)
        {
            return;
        }

        if (!this.panelText.trim())
        {
            this.toast.error('Unpost', 'Write why the salary sheet is unposted.');
            return;
        }

        this.run(
            'Unposting',
            'Cancelling the Journal Voucher...',
            this.service.unpostSheet(this.sheetId, this.panelText),
            () => `${this.sheet?.Code} unposted : its Journal Voucher is cancelled.`,
            'The salary sheet could not be unposted.');
    }

    // Everyone who is not paid yet
    confirmPayAll():
        void
    {
        if (!this.sheet || !this.isPosted)
        {
            return;
        }

        if (!this.panelDate || this.panelDate > this.today)
        {
            this.toast.error('Mark Paid', 'Pick the paid date (today or before).');
            return;
        }

        this.run(
            'Saving',
            'Marking the salaries paid...',
            this.service.paySheet(this.sheetId, [], true, this.panelDate, this.panelText),
            (changed: number) => `${changed} employee(s) marked paid on ${this.dayText(this.panelDate)}.`,
            'The salaries could not be marked paid.');
    }

    // One employee : paid today, or not paid again
    togglePaid(line: SalarySheetLine):
        void
    {
        if (!this.sheet || !this.isPosted || this.isSaving)
        {
            return;
        }

        if (!line.IsPaid)
        {
            this.run(
                'Saving',
                `Marking ${line.EmployeeName} paid...`,
                this.service.paySheet(this.sheetId, [line.SalarySheetLineId], true, this.today, ''),
                () => `${line.EmployeeCode} ${line.EmployeeName} marked paid (Tk ${this.money(line.NetPay)}).`,
                'The salary could not be marked paid.',
                true);
            return;
        }

        this.confirmDialog.open(
            'Mark Not Paid',
            `Mark ${line.EmployeeCode} ${line.EmployeeName} as not paid again?`,
            () =>
                this.run(
                    'Saving',
                    `Marking ${line.EmployeeName} not paid...`,
                    this.service.paySheet(this.sheetId, [line.SalarySheetLineId], false, '', ''),
                    () => `${line.EmployeeCode} ${line.EmployeeName} marked not paid.`,
                    'The salary could not be changed.',
                    true),
            'Mark Not Paid',
            'Cancel',
            'primary');
    }

    //===========================================================
    // Payslips
    //===========================================================

    printSlips(lines: SalarySheetLine[]):
        void
    {
        if (!this.sheet || lines.length === 0)
        {
            return;
        }

        if (this.hasChanges)
        {
            this.toast.error('Payslips', 'Save the typed amounts first : the payslips print the saved sheet.');
            return;
        }

        const problem =
            printPayslips(this.router, this.sheet, lines);

        if (problem)
        {
            this.toast.error('Payslips', problem);
        }
    }

    //===========================================================
    // Back
    //===========================================================

    refresh():
        void
    {
        if (!this.hasChanges)
        {
            this.load();
            return;
        }

        this.confirmDialog.open(
            'Unsaved Amounts',
            'The typed amounts are not saved. Refresh without saving?',
            () => this.load(),
            'Refresh',
            'Stay',
            'primary');
    }

    private goToList():
        void
    {
        void this.router.navigate(['/human-resource-manangement/payroll-management/salary-sheets/list']);
    }

    onBackToList():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        if (!this.hasChanges)
        {
            this.goToList();
            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'The typed amounts are not saved. Do you want to leave this page?',
            () => this.goToList(),
            'Leave',
            'Stay',
            'primary');
    }
}
