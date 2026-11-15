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

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { ControlTab, ControlTabsComponent } from '../../../../../../shared/components/controls/control-tabs/control-tabs';
import { SearchDropdownComponent } from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { SearchBoxComponent } from '../../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { ListTableComponent, ListTableColumn } from '../../../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    CheckBookListItem,
    showDay
}
from '../../../models/check-books.model';

import
{
    CheckBooksService
}
from '../../../services/check-books.service';


type CheckBookRow =
    CheckBookListItem
    &
    {
        AccountText: string;
        RangeText: string;
        LeavesText: string;
        UsedText: string;
        ReceivedText: string;
    };


//===============================================================
// Check Books List (Settings > Account Settings)
//
// Short setup list : loaded once, filtered / paged in the page.
// Tabs All / Active / Inactive; bank account filter on the
// toolbar; a warning line for the bank accounts low on leaves
// (switch "Low Check Leaf Warning"); summary below the canvas.
//===============================================================

@Component(
{
    selector:'check-books-list',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
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
    templateUrl:'./check-books-list.html',
    styleUrl:'./check-books-list.css'
})
export class CheckBooksList
implements OnInit
{
    private readonly service = inject(CheckBooksService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    readonly tabs:
        ControlTab[] =
    [
        { id:'all', label:'All' },
        { id:'active', label:'Active' },
        { id:'inactive', label:'Inactive' }
    ];

    selectedTab =
        'all';

    accountItems:
        { label: string; value: string }[] =
    [
        { label:'All Bank Accounts', value:'' }
    ];

    selectedAccount =
        '';

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    private all:
        CheckBookRow[] = [];

    rows:
        CheckBookRow[] = [];

    totalRecords =
        0;

    currentPage =
        1;

    pageSize =
        10;

    summaryItems:
        { label: string; value: string; tone: '' | 'ok' | 'bad' }[] = [];

    // Bank accounts low on leaves : "DBBL Current (8 left)"
    lowAccounts:
        string[] = [];

    historyOpened =
        false;

    historyTitle =
        'Check Books History';

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

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Code', field:'Code', width:'95px', align:'center' },
        { header:'Bank Account', field:'AccountText', width:'260px', align:'left' },
        { header:'Check Numbers', field:'RangeText', width:'220px', align:'center' },
        { header:'Unused', field:'LeavesText', width:'130px', align:'center' },
        { header:'Used', field:'UsedText', width:'170px', align:'center', priority:2 },
        { header:'Next Check', field:'NextCheckNo', width:'120px', align:'center' },
        { header:'Received', field:'ReceivedText', width:'115px', align:'center', priority:3 },
        { header:'Status', field:'IsActive', type:'status', width:'110px', align:'center' },
        { header:'Actions', field:'actions', type:'actions', width:'120px', align:'center' }
    ];

    ngOnInit():
        void
    {
        this.load();
    }

    private load():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.service
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        rows.map(x =>
                        {
                            const used =
                                [
                                    x.Issued ? `${x.Issued} issued` : '',
                                    x.Cancelled ? `${x.Cancelled} cancelled` : '',
                                    x.Lost ? `${x.Lost} lost` : '',
                                    x.Void ? `${x.Void} void` : ''
                                ]
                                .filter(t => t)
                                .join(' · ');

                            return {
                                ...x,
                                AccountText:[x.BankAccountName, x.AccountNumber].filter(t => t).join(' · '),
                                RangeText:`${x.FirstCheckNo} - ${x.LastCheckNo}`,
                                LeavesText:`${x.Unused} of ${x.LeafCount}`,
                                UsedText:used || '-',
                                ReceivedText:showDay(x.ReceivedDate)
                            };
                        });

                    const accounts =
                        new Map<number, string>();

                    this.all.forEach(x => accounts.set(x.BankAccountId, x.BankAccountName));

                    this.accountItems =
                    [
                        { label:'All Bank Accounts', value:'' },
                        ...[...accounts.entries()]
                            .sort((a, b) => a[1].localeCompare(b[1]))
                            .map(([id, name]) => ({ label:name, value:String(id) }))
                    ];

                    const low =
                        new Map<number, string>();

                    this.all
                        .filter(x => x.LowLeaf)
                        .forEach(x => low.set(x.BankAccountId, `${x.BankAccountName} (${x.AccountUnused} left)`));

                    this.lowAccounts = [...low.values()];

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'The check books could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const base =
            this.all.filter(x =>
                (!this.selectedAccount || String(x.BankAccountId) === this.selectedAccount)
                &&
                (!find || [x.Code, x.BankAccountName, x.Bank, x.AccountNumber, x.BookNo, x.FirstCheckNo, x.LastCheckNo]
                    .some(v => (v ?? '').toLowerCase().includes(find))));

        const matched =
            base.filter(x =>
                this.selectedTab === 'all' || (this.selectedTab === 'active') === x.IsActive);

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        const count =
            (value: number): string => value.toLocaleString('en-US');

        const sum =
            (f: (x: CheckBookRow) => number) => base.reduce((s, x) => s + f(x), 0);

        this.summaryItems =
        [
            { label:'Books', value:count(base.length), tone:'' },
            { label:'Leaves', value:count(sum(x => x.LeafCount)), tone:'' },
            { label:'Unused', value:count(sum(x => x.Unused)), tone:'ok' },
            { label:'Issued', value:count(sum(x => x.Issued)), tone:'' },
            { label:'Cancelled / Lost / Void', value:count(sum(x => x.Cancelled + x.Lost + x.Void)), tone:'bad' }
        ];

        this.cdr.detectChanges();
    }

    onTabChange(value: string):
        void
    {
        this.selectedTab = value || 'all';
        this.currentPage = 1;
        this.apply();
    }

    onAccountChange(value: any):
        void
    {
        this.selectedAccount = String(value ?? '');
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

    view(row: CheckBookRow):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    edit(row: CheckBookRow):
        void
    {
        void this.router.navigate(['../edit', row.PublicId], { relativeTo:this.route });
    }

    refresh():
        void
    {
        this.load();
    }

    delete(row: CheckBookRow):
        void
    {
        if (row.Unused < row.LeafCount)
        {
            this.toast.error('Delete', `${row.Code} has used leaves : it cannot be deleted. Make it Inactive instead.`);
            return;
        }

        this.confirmDialog.open(
            'Delete Check Book',
            `Delete ${row.Code} (${row.RangeText}) of ${row.BankAccountName}? None of its leaves is used.`,
            () =>
                this.service.delete(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);
                        this.load();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The check book could not be deleted.')
                }),
            'Delete',
            'Keep',
            'danger'
        );
    }

    restore():
        void
    {
        this.confirmDialog.open(
            'Restore Check Book',
            'Bring back the most recently deleted check book?',
            () =>
                this.service.restore().subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Restored', 'The check book was restored.');
                        this.load();
                    },
                    error:error =>
                        this.toast.error('Restore', error?.error?.message ?? 'Nothing was restored.')
                }),
            'Restore',
            'Cancel',
            'primary'
        );
    }

    openHistory():
        void
    {
        this.service
            .getHistory()
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
