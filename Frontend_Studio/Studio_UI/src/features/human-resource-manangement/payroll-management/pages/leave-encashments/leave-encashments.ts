//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
    DestroyRef,
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
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import { PageHeaderComponent } from '../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../shared/components/layout/page-canvas/page-canvas';
import { ControlTab, ControlTabsComponent } from '../../../../../shared/components/controls/control-tabs/control-tabs';
import { DropdownComponent } from '../../../../../shared/components/controls/dropdown/dropdown';
import { SearchDropdownComponent } from '../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../../shared/components/controls/textbox/textbox';
import { DatepickerComponent } from '../../../../../shared/components/controls/datepicker/datepicker';
import { SearchBoxComponent } from '../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../shared/components/utilities/command-center/command-center';
import { ListTableActions, ListTableColumn, ListTableComponent } from '../../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../../shared/components/controls/pagination/pagination';
import { ToastComponent } from '../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../services/hr-progress.service';
import { hrToDate, hrToText } from '../../../services/hr-date';

import
{
    EncashBalance,
    EncashEligibility,
    EncashEmployee,
    LeaveEncashment,
    PayrollExtrasService,
    payStatusColor,
    payStatusText
}
from '../../services/payroll-extras.service';

import
{
    hrPayDay,
    hrPayMoney
}
from '../../models/hr-payments.model';

import
{
    HR_REPORT_PRINT_KEY,
    openHrPrint,
    saveHrReport
}
from '../../../print/hr-print';


type ListRow =
    LeaveEncashment
    &
    {
        DateText: string;
        EmployeeText: string;
        DaysText: string;
        AmountText: string;
        StatusText: string;
        StatusColor: string;
    };

const days2 =
    (value: number): string => (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits:2 });


//===============================================================
// Leave Encashments (Human Resource > Payroll Management)
//
// Leave days an employee does not take, paid as money, by the
// employee's Leave Encashment Policy (Human Resource Setup : the
// one the Employee Profile names, otherwise the Default).
//
// It depends wholly on the leave balance and is paid on a year
// basis : ONE encashment of an employee for a leave year, on the
// whole balance left of every leave type the policy lets encash. The days and the rate are never typed :
// the balance and the policy give them.
//
//   Pending    saved : the days are held off the balance
//   Approved   the Journal Voucher is posted; the money goes out
//              on Payroll Payments
//   Rejected   the days go back to the balance
//
//   list       the encashments : view, delete
//   add        left the master data, right the leave balance
//   view/:id   one encashment (never edited : deleted)
//===============================================================

@Component(
{
    selector:'leave-encashments',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        DropdownComponent,
        SearchDropdownComponent,
        TextboxComponent,
        DatepickerComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./leave-encashments.html',
    styleUrl:'./leave-encashments.css'
})
export class LeaveEncashmentsPage
implements OnInit
{
    private readonly service = inject(PayrollExtrasService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    mode:
        'list' | 'add' | 'view' = 'list';

    loading =
        false;

    loadFailed =
        false;

    isSaving =
        false;

    readonly asDate = hrToDate;

    money(value: number): string
    {
        return hrPayMoney(value);
    }

    days(value: number): string
    {
        return days2(value);
    }

    day(value: string): string
    {
        return hrPayDay(value);
    }

    readonly listConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:true,
        reserveFooterSpace:true,
        bodyScrollable:true,
        fixedHeight:true,
        visibleRows:10,
        rowHeight:32,
        headerHeight:36,
        footerHeight:56
    };

    readonly formConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:false,
        reserveFooterSpace:false,
        bodyScrollable:true,
        fixedHeight:true
    };

    //===========================================================
    // List
    //===========================================================

    private all:
        ListRow[] = [];

    rows:
        ListRow[] = [];

    // Every row the tab, the year and the search leave (the print)
    private matched:
        ListRow[] = [];

    searchText =
        '';

    currentPage =
        1;

    pageSize =
        10;

    totalRecords =
        0;

    readonly tabs:
        ControlTab[] =
    [
        { id:'all', label:'All Encashments' },
        { id:'pending', label:'To Approve' },
        { id:'unpaid', label:'To Pay' },
        { id:'paid', label:'Paid' }
    ];

    selectedTab =
        'all';

    yearFilter =
        0;

    yearItems:
        { label: string; value: number }[] =
    [
        { label:'All Years', value:0 }
    ];

    summaryItems:
        { label: string; value: string }[] = [];

    readonly actions:
        ListTableActions =
    {
        view:true,
        edit:false,
        delete:true
    };

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Code', field:'Code', width:'100px', align:'center' },
        { header:'Date', field:'DateText', width:'110px', align:'center' },
        { header:'Employee', field:'EmployeeText', width:'250px', align:'left' },
        { header:'Leave (days)', field:'LeaveTypeName', width:'300px', align:'left' },
        { header:'Leave Year', field:'LeaveYearName', width:'120px', align:'center' },
        { header:'Days', field:'DaysText', width:'70px', align:'right' },
        { header:'Amount', field:'AmountText', width:'125px', align:'right' },
        { header:'Status', field:'StatusText', width:'150px', align:'left', dotField:'StatusColor' },
        { header:'Journal', field:'JournalVoucherNo', width:'190px', align:'center' },
        { header:'Actions', field:'actions', type:'actions', width:'100px', align:'center' }
    ];

    //===========================================================
    // Add
    //===========================================================

    nextCode =
        '';

    employees:
        EncashEmployee[] = [];

    employeeId =
        0;

    encashDate =
        hrToText(new Date());

    // 0 : the running leave year (the financial year of today)
    leaveYear =
        0;

    // What the employee's policy and leave balance say
    eligibility:
        EncashEligibility | null = null;

    balances:
        EncashBalance[] = [];

    remarks =
        '';

    // The leave years (financial years) the policy lets encash
    get yearChoices(): { label: string; value: number }[]
    {
        const e = this.eligibility;

        return (e?.Years ?? []).map((x, i) => ({ label:e?.YearNames[i] || String(x), value:x }));
    }

    get yearName(): string
    {
        return this.eligibility?.YearName ?? '';
    }

    get employeeItems(): { label: string; value: number }[]
    {
        return this.employees.map(x => ({ label:`${x.Code}  ${x.Name}`, value:x.Id }));
    }

    get employee(): EncashEmployee | undefined
    {
        return this.employees.find(x => x.Id === this.employeeId);
    }

    // The whole balance : the days and the money of every leave
    // type that has something to encash (never typed)
    get dayCount(): number
    {
        return this.balances.reduce((sum, x) => sum + x.Encashable, 0);
    }

    get amount(): number
    {
        return this.balances.reduce((sum, x) => sum + x.Amount, 0);
    }

    get leftCount(): number
    {
        return this.balances.reduce((sum, x) => sum + x.Remaining, 0);
    }

    get policyText(): string
    {
        const e = this.eligibility;

        return !e || !e.PolicyName ? '' : e.IsOwnPolicy ? `${e.PolicyName}  (Employee Profile)` : `${e.PolicyName}  (Default)`;
    }

    //===========================================================
    // View
    //===========================================================

    entity:
        LeaveEncashment | null = null;

    // Waiting for approval / Rejected / Unpaid, Partly paid, Paid
    statusOf(row: LeaveEncashment): string
    {
        return row.Status === 'Pending' ? 'Waiting for approval'
            : row.Status === 'Rejected' ? 'Rejected'
            : payStatusText(row.Amount, row.PaidAmount);
    }

    get isPending(): boolean
    {
        return this.entity?.Status === 'Pending';
    }

    get isApproved(): boolean
    {
        return this.entity?.Status === 'Approved';
    }

    // The reason of a rejection is being typed
    rejecting =
        false;

    rejectReason =
        '';

    get pageTitle(): string
    {
        return this.mode === 'list' ? 'Leave Encashments'
            : this.mode === 'add' ? 'Leave Encashment'
            : 'View Leave Encashment';
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/') ? 'view' : url.includes('/add') ? 'add' : 'list';

        if (this.mode === 'list')
        {
            this.loadList();
        }
        else if (this.mode === 'view')
        {
            this.loading = true;

            this.service
                .getEncashment(this.route.snapshot.paramMap.get('id') ?? '')
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(
                {
                    next:entity =>
                    {
                        this.entity = entity;
                        this.loading = false;
                        this.cdr.detectChanges();
                    },
                    error:error => this.failed(error, 'The leave encashment could not be loaded.')
                });
        }
        else
        {
            this.service
                .getEncashDefaults()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(
                {
                    next:defaults =>
                    {
                        this.nextCode = defaults.NextCode;
                        this.employees = defaults.Employees ?? [];
                        this.cdr.detectChanges();
                    },
                    error:error => this.failed(error, 'The leave encashment lists could not be loaded.')
                });
        }
    }

    private failed(error: any, fallback: string):
        void
    {
        this.loading = false;
        this.loadFailed = true;
        this.toast.error('Error', error?.error?.message ?? fallback);
        this.cdr.detectChanges();
    }

    //===========================================================
    // List
    //===========================================================

    loadList():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.service
            .getEncashments()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        rows.map(x => ({
                            ...x,
                            DateText:hrPayDay(x.EncashDate),
                            EmployeeText:`${x.EmployeeCode}  ${x.EmployeeName}`,
                            DaysText:days2(x.Days),
                            AmountText:hrPayMoney(x.Amount),
                            StatusText:this.statusOf(x),
                            StatusColor:x.Status === 'Pending' ? '#b45309' : x.Status === 'Rejected' ? '#b4232c' : payStatusColor(x.Amount, x.PaidAmount)
                        }));

                    this.yearItems =
                    [
                        { label:'All Years', value:0 },
                        ...[...new Set(this.all.map(x => x.LeaveYear))].sort((a, b) => b - a).map(value => ({ label:this.all.find(x => x.LeaveYear === value)?.LeaveYearName || String(value), value }))
                    ];

                    this.loading = false;
                    this.apply();
                },
                error:error => this.failed(error, 'Leave encashments could not be loaded.')
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const matched =
            this.all.filter(x =>
                (this.selectedTab === 'all'
                    || (this.selectedTab === 'pending' ? x.Status === 'Pending'
                        : x.Status === 'Approved' && (this.selectedTab === 'paid') === (x.PaidAmount >= x.Amount)))
                &&
                (!this.yearFilter || x.LeaveYear === this.yearFilter)
                &&
                (!find || [x.Code, x.DateText, x.EmployeeText, x.LeaveTypeName, x.JournalVoucherNo, x.Remarks]
                    .some(v => (v ?? '').toLowerCase().includes(find))));

        this.matched = matched;

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        this.summaryItems =
        [
            { label:'Encashments', value:matched.length.toLocaleString('en-US') },
            { label:'Days', value:days2(matched.reduce((sum, x) => sum + x.Days, 0)) },
            { label:'Amount', value:`Tk ${hrPayMoney(matched.reduce((sum, x) => sum + x.Amount, 0))}` },
            { label:'Paid', value:`Tk ${hrPayMoney(matched.reduce((sum, x) => sum + x.PaidAmount, 0))}` }
        ];

        this.cdr.detectChanges();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;
        this.apply();
    }

    onTab(value: string):
        void
    {
        this.selectedTab = value || 'all';
        this.currentPage = 1;
        this.apply();
    }

    onYearFilter(value: any):
        void
    {
        this.yearFilter = Number(value) || 0;
        this.currentPage = 1;
        this.apply();
    }

    onPageChange(page: number):
        void
    {
        this.currentPage = page;
        this.apply();
    }

    onPageSizeChange(size: number):
        void
    {
        this.pageSize = size;
        this.currentPage = 1;
        this.apply();
    }

    onSort(_event: any):
        void
    {
        // Newest first
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    open(row: ListRow):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    goToList():
        void
    {
        void this.router.navigate([this.mode === 'view' ? '../../list' : '../list'], { relativeTo:this.route });
    }

    delete(row: LeaveEncashment):
        void
    {
        this.confirmDialog.open(
            'Delete Leave Encashment',
            `Delete ${row.Code} : ${days2(row.Days)} day(s) of leave ${row.LeaveYearName}, ${row.EmployeeName}? ${row.JournalVoucherNo ? 'Its Journal Voucher is cancelled and the' : 'The'} days go back to the leave balance.`,
            () =>
                this.service.deleteEncashment(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);

                        if (this.mode === 'list')
                        {
                            this.loadList();
                        }
                        else
                        {
                            this.goToList();
                        }
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The leave encashment could not be deleted.')
                }),
            'Delete',
            'Keep',
            'danger');
    }

    //===========================================================
    // Add
    //===========================================================

    private loadBalance():
        void
    {
        this.eligibility = null;
        this.balances = [];

        if (!this.employeeId)
        {
            this.cdr.detectChanges();
            return;
        }

        this.loading = true;
        this.cdr.detectChanges();

        this.service
            .getEncashBalance(this.employeeId, this.leaveYear)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:eligibility =>
                {
                    this.eligibility = eligibility;
                    this.balances = eligibility.Rows;
                    // the policy may not let the year asked be encashed
                    this.leaveYear = eligibility.Year || this.leaveYear;
                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The leave balance could not be loaded.')
            });
    }

    onEmployee(value: any):
        void
    {
        this.employeeId = Number(value) || 0;
        this.loadBalance();
    }

    onYear(value: any):
        void
    {
        this.leaveYear = Number(value) || 0;
        this.loadBalance();
    }

    onDate(date: Date | null):
        void
    {
        this.encashDate = hrToText(date);
        this.cdr.detectChanges();
    }

    onRemarks(value: any):
        void
    {
        this.remarks = String(value ?? '');
    }

    private validate(): string
    {
        if (!this.employeeId)
        {
            return 'Pick the employee.';
        }

        if (!this.encashDate)
        {
            return 'Date is required.';
        }

        if (!this.eligibility)
        {
            return 'The leave balance is not loaded yet.';
        }

        if (this.eligibility.Problem)
        {
            return this.eligibility.Problem;
        }

        if (!(this.dayCount > 0) || !(this.amount > 0))
        {
            const why = this.balances.map(x => x.Note).find(x => !!x) ?? '';

            return `${this.employee?.Name ?? 'The employee'} has no leave balance to encash for ${this.yearName}. ${why}`.trim();
        }

        return '';
    }

    onSave():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        const problem =
            this.validate();

        if (problem)
        {
            this.toast.error('Validation', problem);
            return;
        }

        this.isSaving = true;

        this.progressDialog.show('Saving', 'Saving the leave encashment...', false);

        this.service
            .createEncashment(
            {
                EmployeeId:this.employeeId,
                LeaveYear:this.leaveYear,
                EncashDate:this.encashDate,
                Remarks:this.remarks.trim()
            })
            .subscribe(
            {
                next:saved =>
                    this.progressDialog.finish(() =>
                    {
                        this.isSaving = false;
                        this.toast.success('Saved', `${saved.Code} : Tk ${hrPayMoney(saved.Amount)}. It is waiting for approval.`);
                        this.goToList();
                    }),
                error:error =>
                {
                    this.progressDialog.fail();
                    this.isSaving = false;
                    this.toast.error('Error', error?.error?.message ?? 'The leave encashment could not be saved.');
                    this.cdr.detectChanges();
                }
            });
    }

    onClear():
        void
    {
        this.employeeId = 0;
        this.eligibility = null;
        this.balances = [];
        this.remarks = '';
        this.encashDate = hrToText(new Date());
        this.leaveYear = 0;
        this.cdr.detectChanges();
    }

    //===========================================================
    // View : approve / reject a Pending encashment
    //===========================================================

    private reload():
        void
    {
        if (!this.entity)
        {
            return;
        }

        this.service
            .getEncashment(this.entity.PublicId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:entity =>
                {
                    this.entity = entity;
                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The leave encashment could not be loaded.')
            });
    }

    approve():
        void
    {
        const row = this.entity;

        if (!row || !this.isPending || this.isSaving)
        {
            return;
        }

        this.confirmDialog.open(
            'Approve Leave Encashment',
            `Approve ${row.Code} : ${days2(row.Days)} day(s) of leave ${row.LeaveYearName}, ${row.EmployeeName}, Tk ${hrPayMoney(row.Amount)}? Its Journal Voucher is posted and it can then be paid on Payroll Payments.`,
            () =>
            {
                this.isSaving = true;

                this.service.approveEncashment(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.isSaving = false;
                        this.toast.success('Approved', `${row.Code} was approved and posted.`);
                        this.reload();
                    },
                    error:error =>
                    {
                        this.isSaving = false;
                        this.toast.error('Error', error?.error?.message ?? 'The leave encashment could not be approved.');
                        this.cdr.detectChanges();
                    }
                });
            },
            'Approve',
            'Cancel',
            'primary');
    }

    // Opens the reason line
    reject():
        void
    {
        if (this.isPending)
        {
            this.rejecting = true;
            this.rejectReason = '';
            this.cdr.detectChanges();
        }
    }

    onRejectReason(value: any):
        void
    {
        this.rejectReason = String(value ?? '');
    }

    keepPending():
        void
    {
        this.rejecting = false;
        this.cdr.detectChanges();
    }

    confirmReject():
        void
    {
        const row = this.entity;

        const reason = this.rejectReason.trim();

        if (!row || this.isSaving)
        {
            return;
        }

        if (!reason)
        {
            this.toast.error('Validation', 'Write why the leave encashment is rejected.');
            return;
        }

        this.isSaving = true;

        this.service.rejectEncashment(row.PublicId, reason).subscribe(
        {
            next:() =>
            {
                this.isSaving = false;
                this.rejecting = false;
                this.toast.success('Rejected', `${row.Code} was rejected : the days went back to the leave balance.`);
                this.reload();
            },
            error:error =>
            {
                this.isSaving = false;
                this.toast.error('Error', error?.error?.message ?? 'The leave encashment could not be rejected.');
                this.cdr.detectChanges();
            }
        });
    }

    //===========================================================
    // Print (the shared Print Engine)
    //===========================================================

    private openPrint(token: number, name: string):
        void
    {
        const problem =
            openHrPrint(this.router, HR_REPORT_PRINT_KEY, token, name, true);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }

    // The list as it is filtered now
    printList():
        void
    {
        const rows = this.matched;

        if (rows.length === 0)
        {
            this.toast.error('Print', 'There is nothing to print.');
            return;
        }

        const tab = this.tabs.find(x => x.id === this.selectedTab)?.label ?? 'All Encashments';

        const year = this.yearItems.find(x => x.value === this.yearFilter)?.label ?? 'All Years';

        const days = rows.reduce((sum, x) => sum + x.Days, 0);

        const amount = rows.reduce((sum, x) => sum + x.Amount, 0);

        const paid = rows.reduce((sum, x) => sum + x.PaidAmount, 0);

        this.openPrint(
            saveHrReport(
            {
                title:'Leave Encashments',
                subtitle:`${tab} · ${year}`,
                meta:this.searchText.trim() ? [{ label:'Search', value:this.searchText.trim() }] : [],
                band:
                [
                    { label:'Encashments', value:String(rows.length) },
                    { label:'Days', value:days2(days) },
                    { label:'Amount', value:`Tk ${hrPayMoney(amount)}` },
                    { label:'Paid', value:`Tk ${hrPayMoney(paid)}` }
                ],
                columns:
                [
                    { header:'Code', kind:'center' },
                    { header:'Date', kind:'center' },
                    { header:'Employee', kind:'text' },
                    { header:'Leave (days)', kind:'text' },
                    { header:'Leave Year', kind:'center' },
                    { header:'Days', kind:'num' },
                    { header:'Amount', kind:'money', strong:true },
                    { header:'Paid', kind:'money' },
                    { header:'Status', kind:'text' },
                    { header:'Journal', kind:'center' }
                ],
                rows:rows.map(x =>
                [
                    x.Code,
                    x.DateText,
                    x.EmployeeText,
                    x.LeaveTypeName,
                    x.LeaveYearName || String(x.LeaveYear),
                    x.DaysText,
                    x.AmountText,
                    hrPayMoney(x.PaidAmount),
                    x.StatusText,
                    x.JournalVoucherNo
                ]),
                footer:['', '', `Total (${rows.length})`, '', '', days2(days), hrPayMoney(amount), hrPayMoney(paid), '', ''],
                landscape:true
            }),
            'Leave Encashments');
    }

    // One encashment : the leave types, the days and the money
    printOne():
        void
    {
        const e = this.entity;

        if (!e)
        {
            return;
        }

        this.openPrint(
            saveHrReport(
            {
                title:'Leave Encashment',
                subtitle:`${e.EmployeeCode} ${e.EmployeeName} · ${e.BranchName}`,
                meta:
                [
                    { label:'Encashment', value:e.Code },
                    { label:'Date', value:hrPayDay(e.EncashDate) },
                    { label:'Leave year', value:e.LeaveYearName || String(e.LeaveYear) },
                    { label:'Policy', value:e.PolicyName },
                    { label:'Status', value:this.statusOf(e) },
                    { label:'Journal Voucher', value:e.JournalVoucherNo },
                    { label:'Reason of rejection', value:e.RejectReason }
                ].filter(x => !!x.value),
                band:
                [
                    { label:'Days encashed', value:days2(e.Days) },
                    { label:`Day rate (${e.RateBase} / ${e.MonthDays || 30})`, value:`Tk ${hrPayMoney(e.DayRate)}` },
                    { label:'Amount', value:`Tk ${hrPayMoney(e.Amount)}` },
                    { label:'Paid', value:`Tk ${hrPayMoney(e.PaidAmount)}` }
                ],
                columns:
                [
                    { header:'Leave Type', kind:'text' },
                    { header:'Entitled', kind:'num' },
                    { header:'Used', kind:'num' },
                    { header:'Days Encashed', kind:'num', strong:true },
                    { header:'Amount', kind:'money', strong:true }
                ],
                rows:e.Lines.map(l =>
                [
                    l.LeaveTypeName,
                    days2(l.Entitled),
                    days2(l.Used),
                    days2(l.Days),
                    hrPayMoney(l.Amount)
                ]),
                footer:['Total', '', '', days2(e.Days), hrPayMoney(e.Amount)],
                note:e.Remarks
            }),
            `${e.Code} ${e.EmployeeName}`);
    }

    goToPayments():
        void
    {
        void this.router.navigate(['../../../payroll-payments/add'], { relativeTo:this.route });
    }
}
