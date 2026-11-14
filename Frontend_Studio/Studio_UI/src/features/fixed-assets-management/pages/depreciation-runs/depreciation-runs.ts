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
    Observable
}
from 'rxjs';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ListTableActions, ListTableColumn, ListTableComponent } from '../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../shared/components/controls/pagination/pagination';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HistoryDrawerComponent } from '../../../../shared/components/utilities/history-drawer/history-drawer';
import { HrProgressService } from '../../../human-resource-manangement/services/hr-progress.service';

import
{
    FA_REPORT_PRINT_KEY,
    openFaPrint,
    saveFaReport
}
from '../../print/fa-print';

import
{
    FaRun,
    FaRunBranch,
    FaRunLine,
    faDay,
    faMoney
}
from '../../shared/fa.models';

import
{
    FaService
}
from '../../shared/fa.service';


type ListRow =
    FaRun
    &
    {
        DateText: string;
        AmountText: string;
    };


//===============================================================
// Depreciation Runs (Fixed Assets Management > Depreciation)
//
// A run is one month of one branch. The months go in order with
// no gap : the server names the next month of every branch.
//
//   list       the runs
//   add        pick the branch : what its next month would charge
//              is worked out (nothing saved), then Post Run
//   view/:id   the run with its assets. The last run of a branch
//              can be undone, with a reason. Print.
//===============================================================

@Component(
{
    selector:'depreciation-runs',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        SearchDropdownComponent,
        TextboxComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        HistoryDrawerComponent
    ],
    templateUrl:'./depreciation-runs.html',
    styleUrl:'./depreciation-runs.css'
})
export class DepreciationRunsPage
implements OnInit
{
    private readonly service = inject(FaService);

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

    money(value: number): string
    {
        return faMoney(value);
    }

    day(value: string): string
    {
        return faDay(value);
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

    searchText =
        '';

    currentPage =
        1;

    pageSize =
        10;

    totalRecords =
        0;

    branchFilter =
        0;

    branchFilterItems:
        { label: string; value: number }[] =
    [
        { label:'All Branches', value:0 }
    ];

    yearFilter =
        0;

    yearFilterItems:
        { label: string; value: number }[] =
    [
        { label:'All Years', value:0 }
    ];

    summaryItems:
        { label: string; value: string }[] = [];

    // A run is only opened : it is never edited or deleted here
    readonly listActions:
        ListTableActions =
    {
        view:true,
        edit:false,
        delete:false
    };

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Code', field:'Code', width:'120px', align:'center' },
        { header:'Month', field:'PeriodText', width:'110px', align:'center' },
        { header:'Branch', field:'BranchName', width:'220px', align:'left' },
        { header:'Assets', field:'AssetCount', width:'90px', align:'center' },
        { header:'Depreciation', field:'AmountText', width:'150px', align:'right' },
        { header:'Journal', field:'JournalVoucherNo', width:'190px', align:'center' },
        { header:'Run Date', field:'DateText', width:'120px', align:'center' },
        { header:'Actions', field:'actions', type:'actions', width:'90px', align:'center' }
    ];

    historyOpened =
        false;

    historyItems:
        any[] = [];

    //===========================================================
    // A new run
    //===========================================================

    branches:
        FaRunBranch[] = [];

    branchItems:
        { label: string; value: number }[] = [];

    branchId =
        0;

    remarks =
        '';

    // What the run would charge (nothing saved yet)
    preview:
        FaRun | null = null;

    previewing =
        false;

    // Why there is no preview (the server's words)
    previewMessage =
        '';

    get branch(): FaRunBranch | undefined
    {
        return this.branches.find(x => x.BranchId === this.branchId);
    }

    get monthText(): string
    {
        const branch = this.branch;

        return !branch ? '' : branch.NextPeriod > 0 ? branch.NextPeriodText : 'Nothing to run';
    }

    get lastRunText(): string
    {
        const branch = this.branch;

        return !branch ? '' : branch.LastPeriodText || 'None yet';
    }

    get assetsText(): string
    {
        const branch = this.branch;

        return branch ? String(branch.AssetCount) : '';
    }

    get previewEmptyText(): string
    {
        return this.previewing ? 'Working out the depreciation...'
            : this.previewMessage ? this.previewMessage
            : this.loadFailed ? 'The branches could not be loaded.'
            : !this.branchId ? 'Pick a branch : the depreciation of its next month is worked out here. Nothing is saved until you press Post Run.'
            : 'There is nothing to charge.';
    }

    //===========================================================
    // One run
    //===========================================================

    run:
        FaRun | null = null;

    undoing =
        false;

    undoReason =
        '';

    // The assets on screen : the preview (add) or the run (view)
    get lines(): FaRunLine[]
    {
        const source =
            (this.mode === 'add' ? this.preview?.Lines : this.run?.Lines) ?? [];

        const find =
            this.mode === 'view' ? this.searchText.trim().toLowerCase() : '';

        return source.filter(x =>
            !find || [x.AssetNo, x.Name, x.CategoryName, x.Note].some(v => (v ?? '').toLowerCase().includes(find)));
    }

    get costTotal(): number
    {
        return this.lines.reduce((sum, x) => sum + (Number(x.Cost) || 0), 0);
    }

    get chargeTotal(): number
    {
        return this.lines.reduce((sum, x) => sum + (Number(x.Charge) || 0), 0);
    }

    get bookValueTotal(): number
    {
        return this.lines.reduce((sum, x) => sum + (Number(x.BookValue) || 0), 0);
    }

    get viewEmptyText(): string
    {
        return this.loading ? 'Loading the run...'
            : this.loadFailed ? 'The run could not be loaded.'
            : 'No asset matches.';
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase().split('?')[0];

        this.mode =
            url.includes('/view/') || url.includes('/edit/') ? 'view' : url.endsWith('/add') ? 'add' : 'list';

        if (this.mode === 'list')
        {
            this.loadList();
        }
        else if (this.mode === 'view')
        {
            this.loadRun();
        }
        else
        {
            this.loadBranches();
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
            .getRuns()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        (rows ?? []).map(x => ({
                            ...x,
                            DateText:faDay(x.RunDate),
                            AmountText:faMoney(x.TotalAmount)
                        }));

                    this.branchFilterItems =
                    [
                        { label:'All Branches', value:0 },
                        ...[...new Map(this.all.map(x => [x.BranchId, x.BranchName])).entries()]
                            .map(([value, label]) => ({ label:label || `#${value}`, value }))
                            .sort((a, b) => a.label.localeCompare(b.label))
                    ];

                    this.yearFilterItems =
                    [
                        { label:'All Years', value:0 },
                        ...[...new Set(this.all.map(x => Math.floor(x.Period / 100)))]
                            .filter(x => x > 0)
                            .sort((a, b) => b - a)
                            .map(x => ({ label:String(x), value:x }))
                    ];

                    this.loading = false;
                    this.apply();
                },
                error:error => this.failed(error, 'The depreciation runs could not be loaded.')
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const matched =
            this.all.filter(x =>
                (!this.branchFilter || x.BranchId === this.branchFilter)
                &&
                (!this.yearFilter || Math.floor(x.Period / 100) === this.yearFilter)
                &&
                (!find || [x.Code, x.PeriodText, x.BranchName, x.JournalVoucherNo, x.DateText]
                    .some(v => (v ?? '').toLowerCase().includes(find))));

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
            { label:'Runs', value:matched.length.toLocaleString('en-US') },
            { label:'Total Depreciation', value:faMoney(matched.reduce((sum, x) => sum + (Number(x.TotalAmount) || 0), 0)) }
        ];

        this.cdr.detectChanges();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;

        if (this.mode === 'list')
        {
            this.apply();
        }
        else
        {
            this.cdr.detectChanges();
        }
    }

    onBranchFilter(value: any):
        void
    {
        this.branchFilter = Number(value) || 0;
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
        // Newest first, as the server sends them
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    open(row: FaRun):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    goToList():
        void
    {
        void this.router.navigate([this.mode === 'view' ? '../../list' : '../list'], { relativeTo:this.route });
    }

    openHistory():
        void
    {
        this.service
            .getHistory('depreciation/depreciation-runs')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:items =>
                {
                    this.historyItems = items;
                    this.historyOpened = true;
                    this.cdr.detectChanges();
                },
                error:() => this.toast.error('Error', 'The history could not be loaded.')
            });
    }

    closeHistory():
        void
    {
        this.historyOpened = false;
        this.cdr.detectChanges();
    }

    //===========================================================
    // A new run
    //===========================================================

    private loadBranches():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.service
            .getRunBranches()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:branches =>
                {
                    this.branches = branches ?? [];

                    this.branchItems =
                        this.branches.map(x => ({
                            label:`${x.BranchName}  (next : ${x.NextPeriod > 0 ? x.NextPeriodText : 'nothing to run'})`,
                            value:x.BranchId
                        }));

                    if (!this.branch)
                    {
                        this.branchId = 0;
                    }

                    this.loading = false;
                    this.workOut();
                },
                error:error => this.failed(error, 'The branches could not be loaded.')
            });
    }

    // Refresh : the branches again, then the preview again
    refreshAdd():
        void
    {
        this.loadBranches();
    }

    onBranch(value: any):
        void
    {
        this.branchId = Number(value) || 0;
        this.workOut();
    }

    onRemarks(value: any):
        void
    {
        this.remarks = String(value ?? '');
    }

    // What the next month of the branch would charge
    workOut():
        void
    {
        this.preview = null;
        this.previewMessage = '';

        const branch = this.branch;

        if (!branch)
        {
            this.previewing = false;
            this.cdr.detectChanges();
            return;
        }

        if (!(branch.NextPeriod > 0))
        {
            this.previewing = false;
            this.previewMessage = `There is nothing to run for ${branch.BranchName}.`;
            this.cdr.detectChanges();
            return;
        }

        this.previewing = true;
        this.cdr.detectChanges();

        this.service
            .previewRun(branch.BranchId, branch.NextPeriod)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:run =>
                {
                    // An answer for a branch that is no longer picked
                    if (this.branchId !== branch.BranchId)
                    {
                        return;
                    }

                    this.previewing = false;
                    this.preview = run;
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    if (this.branchId !== branch.BranchId)
                    {
                        return;
                    }

                    this.previewing = false;
                    this.previewMessage = error?.error?.message ?? 'The depreciation could not be worked out.';
                    this.cdr.detectChanges();
                }
            });
    }

    // Saves, then goes back to the list
    private save<T>(busy: string, call: Observable<T>, done: (result: T) => string, failure: string):
        void
    {
        this.isSaving = true;

        this.progressDialog.show('Saving', busy, false);

        call.subscribe(
        {
            next:result =>
                this.progressDialog.finish(() =>
                {
                    this.isSaving = false;
                    this.toast.success('Success', done(result));
                    this.goToList();
                }),
            error:error =>
            {
                this.progressDialog.fail();
                this.isSaving = false;
                this.toast.error('Error', error?.error?.message ?? failure);
                this.cdr.detectChanges();
            }
        });
    }

    onPost():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        const branch = this.branch;

        const preview = this.preview;

        const problem =
            !branch ? 'Pick the branch.'
            : this.previewing ? 'The depreciation is still being worked out.'
            : !preview || (preview.Lines ?? []).length === 0 ? (this.previewMessage || 'There is nothing to post for this branch.')
            : '';

        if (problem || !branch || !preview)
        {
            this.toast.error('Depreciation Run', problem);
            return;
        }

        const count = preview.AssetCount || preview.Lines.length;

        const total = preview.TotalAmount || this.chargeTotal;

        this.confirmDialog.open(
            'Post Depreciation Run',
            `Post the depreciation of ${branch.NextPeriodText} for ${branch.BranchName} : ${count} asset(s), ${faMoney(total)}? It posts one Journal Voucher : Depreciation Expense against Accumulated Depreciation for each asset group.`,
            () =>
                this.save(
                    'Posting the depreciation run...',
                    this.service.postRun(branch.BranchId, branch.NextPeriod, this.remarks.trim()),
                    (run: FaRun) => `${run?.Code ?? 'The run'} was posted. Journal Voucher ${run?.JournalVoucherNo || '-'}.`,
                    'The depreciation run could not be posted.'),
            'Post',
            'Cancel',
            'primary');
    }

    //===========================================================
    // One run
    //===========================================================

    private loadRun():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.service
            .getRun(this.route.snapshot.paramMap.get('id') ?? '')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:run =>
                {
                    this.run = run;
                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The depreciation run could not be loaded.')
            });
    }

    askUndo():
        void
    {
        if (!this.run?.IsLast)
        {
            return;
        }

        this.undoing = true;
        this.undoReason = '';
        this.cdr.detectChanges();
    }

    onUndoReason(value: any):
        void
    {
        this.undoReason = String(value ?? '');
    }

    keepRun():
        void
    {
        this.undoing = false;
        this.cdr.detectChanges();
    }

    confirmUndo():
        void
    {
        if (!this.run || this.isSaving)
        {
            return;
        }

        const reason = this.undoReason.trim();

        if (!reason)
        {
            this.toast.error('Depreciation Run', 'Write why the run is undone.');
            return;
        }

        const run = this.run;

        this.save(
            'Undoing the depreciation run...',
            this.service.undoRun(run.PublicId, reason),
            () => `${run.Code} was undone : ${run.PeriodText} of ${run.BranchName} can be run again.`,
            'The depreciation run could not be undone.');
    }

    // The run with its assets (Print Engine)
    print():
        void
    {
        const run = this.run;

        if (!run || (run.Lines ?? []).length === 0)
        {
            return;
        }

        const lines = run.Lines;

        const sum =
            (pick: (line: FaRunLine) => number): number => lines.reduce((total, x) => total + (Number(pick(x)) || 0), 0);

        const charge = sum(x => x.Charge);

        const token =
            saveFaReport(
            {
                title:'Depreciation Run',
                subtitle:`${run.PeriodText} · ${run.BranchName}`,
                meta:
                [
                    { label:'Run', value:run.Code },
                    { label:'Run Date', value:faDay(run.RunDate) },
                    { label:'Journal Voucher', value:run.JournalVoucherNo },
                    { label:'Remarks', value:run.Remarks }
                ].filter(x => !!x.value),
                band:
                [
                    { label:'Assets', value:String(lines.length) },
                    { label:'Cost', value:faMoney(sum(x => x.Cost)) },
                    { label:'Depreciation of the month', value:faMoney(charge) },
                    { label:'Book Value', value:faMoney(sum(x => x.BookValue)) }
                ],
                columns:
                [
                    { header:'Asset No', kind:'text' },
                    { header:'Asset', kind:'text' },
                    { header:'Asset Group', kind:'text' },
                    { header:'Cost', kind:'money' },
                    { header:'Depreciation Before', kind:'money' },
                    { header:'This Month', kind:'money', strong:true },
                    { header:'Depreciation After', kind:'money' },
                    { header:'Book Value', kind:'money' },
                    { header:'Note', kind:'text' }
                ],
                rows:lines.map(x =>
                [
                    x.AssetNo,
                    x.Name,
                    x.CategoryName,
                    faMoney(x.Cost),
                    faMoney(x.OpeningAccumulated),
                    faMoney(x.Charge),
                    faMoney(x.ClosingAccumulated),
                    faMoney(x.BookValue),
                    x.Note ?? ''
                ]),
                footer:
                [
                    '',
                    `Total (${lines.length})`,
                    '',
                    faMoney(sum(x => x.Cost)),
                    faMoney(sum(x => x.OpeningAccumulated)),
                    faMoney(charge),
                    faMoney(sum(x => x.ClosingAccumulated)),
                    faMoney(sum(x => x.BookValue)),
                    ''
                ],
                landscape:true
            });

        const problem =
            openFaPrint(this.router, FA_REPORT_PRINT_KEY, token, `${run.Code} ${run.PeriodText}`, true);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }
}
