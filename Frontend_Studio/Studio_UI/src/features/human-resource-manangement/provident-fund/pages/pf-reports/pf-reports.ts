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
    forkJoin,
    of
}
from 'rxjs';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import { PageHeaderComponent } from '../../../../../shared/components/layout/page-header/page-header';
import { DatepickerComponent } from '../../../../../shared/components/controls/datepicker/datepicker';
import { hrDateEvent, hrMonthEvent, hrMonthToDate, hrToDate } from '../../../services/hr-date';
import { PageToolbarComponent } from '../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../shared/components/layout/page-canvas/page-canvas';
import { CommandCenterComponent } from '../../../../../shared/components/utilities/command-center/command-center';
import { PaginationComponent } from '../../../../../shared/components/controls/pagination/pagination';
import { ControlTab, ControlTabsComponent } from '../../../../../shared/components/controls/control-tabs/control-tabs';
import { SearchDropdownComponent } from '../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { ToastComponent } from '../../../../../shared/components/utilities/toast/toast';
import { ConfirmDialogComponent } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { ToastService } from '../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { HrProgressService } from '../../../services/hr-progress.service';

import
{
    PfMember,
    PfRegisterRow,
    PfStatementRow,
    pfDay,
    pfMoney,
    pfToday
}
from '../../models/provident-fund.model';

import
{
    ProvidentFundService
}
from '../../services/provident-fund.service';


import
{
    HR_REPORT_PRINT_KEY,
    HrReportDoc,
    openHrPrint,
    saveHrReport
}
from '../../../print/hr-print';


type ReportKey =
    'summary' | 'statement' | 'register';


//===============================================================
// PF Reports (read only)
//
//   Fund Summary           every member with the balances
//   Member Statement       the ledger of one member with running
//                          balances
//   Contribution Register  the fund deductions of the salary
//                          sheets of a month
//===============================================================

@Component(
{
    selector:'pf-reports',
    standalone:true,
    imports:
    [
        CommonModule,
        DatepickerComponent,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        CommandCenterComponent,
        ControlTabsComponent,
        SearchDropdownComponent,
        PaginationComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./pf-reports.html',
    styleUrl:'./pf-reports.css'
})
export class PfReportsPage
implements OnInit
{
    private readonly service = inject(ProvidentFundService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    // The shared date picker works with a Date; the page keeps
    // yyyy-MM-dd text
    readonly asDate = hrToDate;

    readonly dateEvent = hrDateEvent;

    // The shared date picker in month mode works with a Date; the
    // page keeps yyyy-MM text
    readonly asMonth = hrMonthToDate;

    readonly monthEvent = hrMonthEvent;

    readonly canvasConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:true,
        reserveFooterSpace:true,
        bodyScrollable:true,
        fixedHeight:true
    };

    //===========================================================
    // Paging : the screen shows a page of the report (the totals
    // under the table are those of the whole report)
    //===========================================================

    page =
        1;

    pageSize =
        10;

    // The rows of the report on screen
    private get allRows(): any[]
    {
        return this.report === 'summary' ? this.members
            : this.report === 'statement' ? this.statement
            : this.register;
    }

    get totalRecords(): number
    {
        return this.allRows.length;
    }

    // The first row of the page (0 based) : the # column goes on
    // from it
    get pageStart(): number
    {
        const pages =
            Math.max(1, Math.ceil(this.totalRecords / this.pageSize));

        return (Math.min(this.page, pages) - 1) * this.pageSize;
    }

    paged<T>(rows: T[]): T[]
    {
        return rows.slice(this.pageStart, this.pageStart + this.pageSize);
    }

    onPage(page: number):
        void
    {
        this.page = page;
        this.cdr.detectChanges();
    }

    onPageSize(size: number):
        void
    {
        this.pageSize = size;
        this.page = 1;
        this.cdr.detectChanges();
    }

    readonly tabs:
        ControlTab[] =
    [
        { id:'summary', label:'Fund Summary' },
        { id:'statement', label:'Member Statement' },
        { id:'register', label:'Contribution Register' }
    ];

    report:
        ReportKey =
        'summary';

    loading =
        false;

    // Fund Summary
    members:
        PfMember[] = [];

    // The income of the fund : loan interest received and company
    // parts forfeited (not the members' money)
    income =
        { LoanInterest:0, Forfeited:0, ForfeitedToCompany:0 };

    // Member Statement
    memberItems:
        { label: string; value: number }[] = [];

    memberId =
        0;

    statementMember:
        PfMember | null = null;

    statement:
        PfStatementRow[] = [];

    // Contribution Register
    month =
        pfToday().substring(0, 7);

    register:
        PfRegisterRow[] = [];

    money(value: number): string
    {
        return pfMoney(value);
    }

    // A ledger amount : blank for 0, (1,000.00) for a minus
    signed(value: number): string
    {
        return !value ? '' : value < 0 ? `(${pfMoney(-value)})` : pfMoney(value);
    }

    day(value: string): string
    {
        return pfDay(value);
    }

    sum(rows: any[], field: string): number
    {
        return rows.reduce((total, x) => total + (Number(x[field]) || 0), 0);
    }

    get summaryLine(): { label: string; value: string }[]
    {
        if (this.report === 'summary')
        {
            return [
                { label:'Members', value:String(this.members.length) },
                { label:'Own Part', value:`Tk ${pfMoney(this.sum(this.members, 'EmployeeBalance'))}` },
                { label:'Company Part', value:`Tk ${pfMoney(this.sum(this.members, 'CompanyBalance'))}` },
                { label:'Loans Out', value:`Tk ${pfMoney(this.sum(this.members, 'LoanOutstanding'))}` },
                { label:'Loan Interest Earned', value:`Tk ${pfMoney(this.income.LoanInterest)}` },
                { label:'Forfeited to the Fund', value:`Tk ${pfMoney(this.income.Forfeited)}` },
                { label:'Forfeited to the Company', value:`Tk ${pfMoney(this.income.ForfeitedToCompany)}` }
            ];
        }

        if (this.report === 'statement')
        {
            const m = this.statementMember;

            return m
                ? [
                    { label:'Member', value:`${m.Code}  ${m.EmployeeName}` },
                    { label:'Own Part', value:`Tk ${pfMoney(m.EmployeeBalance)}` },
                    { label:'Company Part', value:`Tk ${pfMoney(m.CompanyBalance)}` },
                    { label:'Loan Out', value:`Tk ${pfMoney(m.LoanOutstanding)}` }
                ]
                : [];
        }

        return [
            { label:'Employees', value:String(this.register.length) },
            { label:'Own Part', value:`Tk ${pfMoney(this.sum(this.register, 'EmployeeAmount'))}` },
            { label:'Company Part', value:`Tk ${pfMoney(this.sum(this.register, 'CompanyAmount'))}` },
            { label:'Loan Recovered', value:`Tk ${pfMoney(this.sum(this.register, 'LoanRecovered'))}` }
        ];
    }

    //===========================================================
    // Print : the report on the canvas goes to the Print Engine
    // viewer (company header, PDF, Excel)
    //===========================================================

    private printDoc(): HrReportDoc | null
    {
        const band =
            this.summaryLine.map(x => ({ label:x.label, value:x.value }));

        if (this.report === 'summary')
        {
            return this.members.length === 0 ? null :
            {
                title:'Provident Fund : Fund Summary',
                subtitle:`${this.members.length} member(s)`,
                band,
                columns:
                [
                    { header:'Member', kind:'center' },
                    { header:'Employee', kind:'text' },
                    { header:'Designation', kind:'text' },
                    { header:'Member Since', kind:'center' },
                    { header:'Own Part', kind:'money' },
                    { header:'Company Part', kind:'money' },
                    { header:'Fund Total', kind:'money', strong:true },
                    { header:'Loan Out', kind:'money' },
                    { header:'Status', kind:'center' }
                ],
                rows:this.members.map(m =>
                [
                    m.Code,
                    `${m.EmployeeCode}  ${m.EmployeeName}`,
                    m.DesignationName,
                    pfDay(m.MemberDate),
                    pfMoney(m.EmployeeBalance),
                    pfMoney(m.CompanyBalance),
                    pfMoney(m.EmployeeBalance + m.CompanyBalance),
                    m.LoanOutstanding ? pfMoney(m.LoanOutstanding) : '',
                    m.Status
                ]),
                footer:
                [
                    '',
                    `Total (${this.members.length})`,
                    '',
                    '',
                    pfMoney(this.sum(this.members, 'EmployeeBalance')),
                    pfMoney(this.sum(this.members, 'CompanyBalance')),
                    pfMoney(this.sum(this.members, 'EmployeeBalance') + this.sum(this.members, 'CompanyBalance')),
                    pfMoney(this.sum(this.members, 'LoanOutstanding')),
                    ''
                ],
                landscape:true
            };
        }

        if (this.report === 'statement')
        {
            const m = this.statementMember;

            return !m || this.statement.length === 0 ? null :
            {
                title:'Provident Fund : Member Statement',
                subtitle:`${m.Code}  ${m.EmployeeCode}  ${m.EmployeeName}`,
                meta:
                [
                    { label:'Designation', value:m.DesignationName },
                    { label:'Member Since', value:pfDay(m.MemberDate) },
                    { label:'Status', value:m.Status }
                ],
                band:band.slice(1),
                columns:
                [
                    { header:'Date', kind:'center' },
                    { header:'Entry', kind:'text' },
                    { header:'Details', kind:'text' },
                    { header:'Own Part', kind:'money' },
                    { header:'Company Part', kind:'money' },
                    { header:'Own Balance', kind:'money', strong:true },
                    { header:'Company Balance', kind:'money', strong:true }
                ],
                rows:this.statement.map(x =>
                [
                    pfDay(x.Date),
                    x.Type,
                    x.Remarks,
                    x.EmployeeAmount ? pfMoney(x.EmployeeAmount) : '',
                    x.CompanyAmount ? pfMoney(x.CompanyAmount) : '',
                    pfMoney(x.EmployeeBalance),
                    pfMoney(x.CompanyBalance)
                ]),
                footer:null,
                note:'An amount with a minus went out of the fund (a payment or a forfeiture).'
            };
        }

        return this.register.length === 0 ? null :
        {
            title:'Provident Fund : Contribution Register',
            subtitle:`Salary of ${this.month}`,
            band,
            columns:
            [
                { header:'Member', kind:'center' },
                { header:'Employee', kind:'text' },
                { header:'Salary Sheet', kind:'text' },
                { header:'Own Part', kind:'money' },
                { header:'Company Part', kind:'money' },
                { header:'Into the Fund', kind:'money', strong:true },
                { header:'Loan Recovered', kind:'money' }
            ],
            rows:this.register.map(x =>
            [
                x.MemberCode,
                `${x.EmployeeCode}  ${x.EmployeeName}`,
                x.SheetCode,
                pfMoney(x.EmployeeAmount),
                pfMoney(x.CompanyAmount),
                pfMoney(x.EmployeeAmount + x.CompanyAmount),
                x.LoanRecovered ? pfMoney(x.LoanRecovered) : ''
            ]),
            footer:
            [
                '',
                `Total (${this.register.length})`,
                '',
                pfMoney(this.sum(this.register, 'EmployeeAmount')),
                pfMoney(this.sum(this.register, 'CompanyAmount')),
                pfMoney(this.sum(this.register, 'EmployeeAmount') + this.sum(this.register, 'CompanyAmount')),
                pfMoney(this.sum(this.register, 'LoanRecovered'))
            ]
        };
    }

    print():
        void
    {
        const doc =
            this.printDoc();

        if (!doc)
        {
            this.toast.error('Print', 'There is nothing to print.');
            return;
        }

        const problem =
            openHrPrint(this.router, HR_REPORT_PRINT_KEY, saveHrReport(doc), 'report', !!doc.landscape);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }

    ngOnInit():
        void
    {
        this.load();
    }

    onTab(value: string):
        void
    {
        this.report = (value as ReportKey) || 'summary';
        this.page = 1;
        this.load();
    }

    onMember(value: any):
        void
    {
        this.memberId = Number(value) || 0;
        this.page = 1;
        this.load();
    }

    onMonth(event: Event):
        void
    {
        this.month = (event.target as HTMLInputElement).value ?? '';
        this.page = 1;
        this.load();
    }

    load():
        void
    {
        const fail =
            (error: any) =>
            {
                this.loading = false;
                this.toast.error('Error', error?.error?.message ?? 'The report could not be loaded.');
                this.cdr.detectChanges();
            };

        this.loading = true;
        this.cdr.detectChanges();

        this.service.getIncome().subscribe(
        {
            next:income =>
            {
                this.income = income;
                this.cdr.detectChanges();
            },
            error:() => undefined
        });

        // the members : the Fund Summary and the list of the statement
        this.service
            .getSummary()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:members =>
                {
                    this.members = members;

                    this.memberItems =
                        members.map(m => ({ label:`${m.Code}  ${m.EmployeeCode}  ${m.EmployeeName}${m.Status === 'Settled' ? '  (settled)' : ''}`, value:m.PfMemberId }));

                    // Member Statement : the first member is picked when
                    // none is (the dropdown changes it)
                    if (this.report === 'statement' && !members.some(m => m.PfMemberId === this.memberId))
                    {
                        this.memberId = members[0]?.PfMemberId ?? 0;
                    }

                    if (this.report === 'statement' && this.memberId)
                    {
                        this.service.getStatement(this.memberId).subscribe(
                        {
                            next:s =>
                            {
                                this.statementMember = s.Member;
                                this.statement = s.Rows ?? [];
                                this.loading = false;
                                this.cdr.detectChanges();
                            },
                            error:fail
                        });

                        return;
                    }

                    if (this.report === 'register' && /^\d{4}-\d{2}$/.test(this.month))
                    {
                        this.service.getRegister(Number(this.month.substring(0, 4)), Number(this.month.substring(5, 7))).subscribe(
                        {
                            next:rows =>
                            {
                                this.register = rows;
                                this.loading = false;
                                this.cdr.detectChanges();
                            },
                            error:fail
                        });

                        return;
                    }

                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:fail
            });
    }
}
