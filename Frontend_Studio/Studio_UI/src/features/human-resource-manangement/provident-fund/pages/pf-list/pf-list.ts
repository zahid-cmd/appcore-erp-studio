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
import { PageToolbarComponent } from '../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../shared/components/layout/page-canvas/page-canvas';
import { SearchDropdownComponent } from '../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { SearchBoxComponent } from '../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../shared/components/utilities/command-center/command-center';
import { ListTableComponent, ListTableColumn } from '../../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../../shared/components/utilities/toast/toast';
import { ConfirmDialogComponent } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { ToastService } from '../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { HrProgressService } from '../../../services/hr-progress.service';
import { hrDateEvent, hrToDate } from '../../../services/hr-date';

import
{
    pfDay,
    pfMoney
}
from '../../models/provident-fund.model';

import
{
    ProvidentFundService
}
from '../../services/provident-fund.service';


type PfKind =
    'members' | 'loans' | 'settlements';

interface PfListPage
{
    kind: PfKind;
    title: string;
    singular: string;
    subtitle: string;
    icon: string;
    columns: ListTableColumn[];
    // What the list shows of a row
    display: (row: any) => Record<string, any>;
    search: string[];
    // The toolbar dropdown
    filterAll: string;
    filterField: string;
    filterItems: string[];
    actions: { view: boolean; edit: boolean; delete: boolean };
    // The summary line : label and the field added up
    totals: { label: string; field: string }[];
    note: string;
    deleteText: (row: any) => string;
}

const money =
    (header: string, field: string, width = '130px'): ListTableColumn =>
        ({ header, field, width, align:'right' });

const PAGES:
    Record<PfKind, PfListPage> =
{
    members:
    {
        kind:'members',
        title:'PF Members',
        singular:'PF Member',
        subtitle:'Employees in the provident fund, with their balances',
        icon:'fas fa-id-card-clip',
        columns:
        [
            { header:'Code', field:'Code', width:'110px', align:'center' },
            { header:'Employee', field:'EmployeeText', width:'260px', align:'left' },
            { header:'Designation', field:'DesignationName', width:'180px', align:'left' },
            { header:'Member Since', field:'MemberText', width:'130px', align:'center' },
            money('Own Balance', 'OwnText'),
            money('Company Balance', 'CompanyText', '150px'),
            money('Loan Out', 'LoanText', '120px'),
            { header:'Status', field:'Status', width:'100px', align:'center' }
        ],
        display:x => ({
            EmployeeText:`${x.EmployeeCode}  ${x.EmployeeName}`,
            MemberText:pfDay(x.MemberDate),
            OwnText:pfMoney(x.EmployeeBalance),
            CompanyText:pfMoney(x.CompanyBalance),
            LoanText:x.LoanOutstanding ? pfMoney(x.LoanOutstanding) : ''
        }),
        search:['Code', 'EmployeeCode', 'EmployeeName', 'DesignationName', 'NomineeName'],
        filterAll:'All Status',
        filterField:'Status',
        filterItems:['Active', 'Settled'],
        actions:{ view:true, edit:true, delete:true },
        totals:
        [
            { label:'Own Balance', field:'EmployeeBalance' },
            { label:'Company Balance', field:'CompanyBalance' },
            { label:'Loans Out', field:'LoanOutstanding' }
        ],
        note:'The fund deduction comes from the salary sheet of every month',
        deleteText:x => `Delete ${x.Code} (${x.EmployeeName}) from the provident fund? Only a member with no contributions can be deleted.`
    },

    loans:
    {
        kind:'loans',
        title:'PF Loans',
        singular:'PF Loan',
        subtitle:'Loans against the provident fund, recovered from the salary',
        icon:'fas fa-hand-holding-dollar',
        columns:
        [
            { header:'Code', field:'Code', width:'110px', align:'center' },
            { header:'Member', field:'MemberCode', width:'110px', align:'center' },
            { header:'Employee', field:'EmployeeText', width:'220px', align:'left' },
            { header:'Loan Date', field:'DateText', width:'120px', align:'center' },
            money('Amount', 'AmountText', '120px'),
            money('Interest', 'InterestText', '110px'),
            money('Instalment', 'InstallmentText', '150px'),
            money('Recovered', 'RecoveredText', '120px'),
            money('Still to Recover', 'OutstandingText', '140px'),
            { header:'Status', field:'Status', width:'100px', align:'center' }
        ],
        display:x => ({
            EmployeeText:`${x.EmployeeCode}  ${x.EmployeeName}`,
            DateText:pfDay(x.LoanDate),
            AmountText:pfMoney(x.Amount),
            InterestText:x.TotalInterest ? pfMoney(x.TotalInterest) : '',
            InstallmentText:`${pfMoney(x.InstallmentAmount)} x ${x.Installments}`,
            RecoveredText:pfMoney(x.Recovered),
            OutstandingText:pfMoney(x.Outstanding)
        }),
        search:['Code', 'MemberCode', 'EmployeeCode', 'EmployeeName'],
        filterAll:'All Status',
        filterField:'Status',
        filterItems:['Running', 'Closed'],
        actions:{ view:true, edit:false, delete:true },
        totals:
        [
            { label:'Loans Given', field:'Amount' },
            { label:'Recovered', field:'Recovered' },
            { label:'Interest Earned', field:'InterestPaid' },
            { label:'Still to Recover', field:'Outstanding' }
        ],
        note:'An instalment is taken from every salary sheet until the loan is back',
        deleteText:x => `Delete the loan ${x.Code} of Tk ${pfMoney(x.Amount)} (${x.EmployeeName})? Only a loan nothing was recovered of can be deleted.`
    },

    settlements:
    {
        kind:'settlements',
        title:'PF Settlements',
        singular:'PF Settlement',
        subtitle:'Payment, cancellation and forfeiture : what a member gets on leaving the fund',
        icon:'fas fa-money-check-dollar',
        columns:
        [
            { header:'Code', field:'Code', width:'110px', align:'center' },
            { header:'Employee', field:'EmployeeText', width:'240px', align:'left' },
            { header:'Date', field:'DateText', width:'120px', align:'center' },
            { header:'Reason', field:'Reason', width:'170px', align:'left' },
            money('Own Part', 'OwnText', '120px'),
            money('Company Paid', 'PaidText'),
            money('Forfeited', 'ForfeitText', '120px'),
            money('Loan', 'LoanText', '110px'),
            money('Net Payable', 'NetText')
        ],
        display:x => ({
            EmployeeText:`${x.EmployeeCode}  ${x.EmployeeName}`,
            DateText:pfDay(x.SettlementDate),
            OwnText:pfMoney(x.EmployeeBalance),
            PaidText:pfMoney(x.CompanyPaid),
            ForfeitText:x.CompanyForfeited ? pfMoney(x.CompanyForfeited) : '',
            LoanText:x.LoanOutstanding ? pfMoney(x.LoanOutstanding) : '',
            NetText:pfMoney(x.NetPayable)
        }),
        search:['Code', 'MemberCode', 'EmployeeCode', 'EmployeeName', 'Reason'],
        filterAll:'All Reasons',
        filterField:'Reason',
        filterItems:['Resignation', 'Retirement', 'Termination', 'Misconduct', 'Death', 'Membership Cancelled', 'Other'],
        actions:{ view:true, edit:false, delete:true },
        totals:
        [
            { label:'Own Part', field:'EmployeeBalance' },
            { label:'Company Paid', field:'CompanyPaid' },
            { label:'Forfeited', field:'CompanyForfeited' },
            { label:'Net Paid', field:'NetPayable' }
        ],
        note:'The company part is decided by the Provident Fund Policy',
        deleteText:x => `Delete the settlement ${x.Code} of ${x.EmployeeName}? The member becomes Active again and the payment and the forfeiture are taken back.`
    }
};


//===============================================================
// Provident Fund List : PF Members, PF Loans and PF Settlements
// (the page comes from the route data 'pf').
//
// Short lists : loaded once, filtered / paged in the page. The
// status (or the reason) is a dropdown on the toolbar; summary
// line below the canvas.
//===============================================================

@Component(
{
    selector:'pf-list',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        SearchDropdownComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./pf-list.html',
    styleUrl:'./pf-list.css'
})
export class PfList
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

    page:
        PfListPage =
        PAGES['members'];

    columns:
        ListTableColumn[] = [];

    filterOptions:
        { label: string; value: string }[] = [];

    selectedFilter =
        '';

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    private all:
        any[] = [];

    rows:
        any[] = [];

    totalRecords =
        0;

    currentPage =
        1;

    pageSize =
        10;

    summaryItems:
        { label: string; value: string }[] = [];

    historyOpened =
        false;

    historyItems:
        any[] = [];

    readonly canvasConfig:
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

    ngOnInit():
        void
    {
        this.page =
            PAGES[this.route.snapshot.data['pf'] as PfKind] ?? PAGES['members'];

        this.columns =
        [
            { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
            ...this.page.columns,
            { header:'Actions', field:'actions', type:'actions', width:'120px', align:'center' }
        ];

        this.filterOptions =
        [
            { label:this.page.filterAll, value:'' },
            ...this.page.filterItems.map(x => ({ label:x, value:x }))
        ];

        this.load();
    }

    private load():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.service
            .getAll<any>(this.page.kind)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all = rows.map(x => ({ ...x, ...this.page.display(x) }));
                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? `${this.page.title} could not be loaded.`);
                    this.cdr.detectChanges();
                }
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const matched =
            this.all.filter(x =>
                (!this.selectedFilter || x[this.page.filterField] === this.selectedFilter)
                && (!find || this.page.search.some(f => String(x[f] ?? '').toLowerCase().includes(find))));

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
            { label:'Total', value:matched.length.toLocaleString('en-US') },
            ...this.page.totals.map(t => ({
                label:t.label,
                value:`Tk ${pfMoney(matched.reduce((sum, x) => sum + (Number(x[t.field]) || 0), 0))}`
            }))
        ];

        this.cdr.detectChanges();
    }

    onFilterChange(value: any):
        void
    {
        this.selectedFilter = String(value ?? '');
        this.currentPage = 1;
        this.apply();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
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
        // Short list : it stays in code order
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    view(row: any):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    edit(row: any):
        void
    {
        void this.router.navigate(['../edit', row.PublicId], { relativeTo:this.route });
    }

    refresh():
        void
    {
        this.load();
    }

    delete(row: any):
        void
    {
        this.confirmDialog.open(
            `Delete ${this.page.singular}`,
            this.page.deleteText(row),
            () =>
                this.service.delete(this.page.kind, row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);
                        this.load();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? `The ${this.page.singular} could not be deleted.`)
                }),
            'Delete',
            'Keep',
            'danger'
        );
    }

    openHistory():
        void
    {
        this.service
            .getHistory(this.page.kind)
            .subscribe(
            {
                next:items =>
                {
                    this.historyItems =
                        (Array.isArray(items) ? items : []).map(h => ({
                            title:h.ActivityTitle ?? h.activityTitle,
                            description:h.ActivityDescription ?? h.activityDescription,
                            user:h.PerformedByName ?? h.performedByName ?? 'System',
                            dateTime:new Date(h.PerformedDate ?? h.performedDate).toLocaleString(),
                            badge:h.ActivityType ?? h.activityType
                        }));
                    this.historyOpened = true;
                    this.cdr.detectChanges();
                },
                error:() =>
                    this.toast.error('Error', 'The history could not be loaded.')
            });
    }

    closeHistory():
        void
    {
        this.historyOpened = false;
        this.cdr.detectChanges();
    }
}
