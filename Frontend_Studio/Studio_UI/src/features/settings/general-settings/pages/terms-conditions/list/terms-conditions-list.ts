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
    TermsConditionListItem,
    TermsOperation
}
from '../../../models/terms-conditions.model';

import
{
    TermsConditionsService
}
from '../../../services/terms-conditions.service';


type TermsRow =
    TermsConditionListItem
    &
    {
        LinesInfo:
            string;

        DefaultText:
            string;
    };


//===============================================================
// Terms & Conditions List (Settings > General Settings)
//
// Short setup list : loaded once, filtered / paged in the page.
// Tabs All / Active / Inactive; Operation filter on the toolbar
// right; summary line below the canvas.
//===============================================================

@Component(
{
    selector:'terms-conditions-list',
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
    templateUrl:'./terms-conditions-list.html',
    styleUrl:'./terms-conditions-list.css'
})
export class TermsConditionsList
implements OnInit
{
    private readonly service = inject(TermsConditionsService);

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

    operationItems:
        { label: string; value: string }[] =
    [
        { label:'All Operations', value:'' }
    ];

    selectedOperation =
        '';

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    private all:
        TermsRow[] = [];

    rows:
        TermsRow[] = [];

    totalRecords =
        0;

    currentPage =
        1;

    pageSize =
        10;

    summaryItems:
        { label: string; value: string; tone: '' | 'ok' | 'bad' }[] = [];

    historyOpened =
        false;

    historyTitle =
        'Terms & Conditions History';

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
        { header:'Code', field:'Code', width:'100px', align:'center' },
        { header:'Title', field:'Title', width:'300px', align:'left' },
        { header:'Operation', field:'OperationName', width:'210px', align:'left' },
        { header:'Lines', field:'LinesInfo', width:'190px', align:'center' },
        { header:'Default', field:'DefaultText', width:'110px', align:'center' },
        { header:'Status', field:'IsActive', type:'status', width:'110px', align:'center' },
        { header:'Actions', field:'actions', type:'actions', width:'120px', align:'center' }
    ];

    ngOnInit():
        void
    {
        this.loadOperations();
        this.load();
    }

    private loadOperations():
        void
    {
        this.service
            .getDefaults()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:d =>
                {
                    this.operationItems =
                    [
                        { label:'All Operations', value:'' },
                        ...d.Operations.map((o: TermsOperation) => ({ label:o.Name, value:o.Code }))
                    ];
                    this.cdr.detectChanges();
                },
                error:() =>
                {
                    // the list still works without the filter
                }
            });
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
                        rows.map(x => ({
                            ...x,
                            LinesInfo:`${x.LineCount} line${x.LineCount === 1 ? '' : 's'}${x.BanglaCount > 0 ? ` · ${x.BanglaCount === x.LineCount ? 'all' : x.BanglaCount} in Bangla` : ''}`,
                            DefaultText:x.IsDefault ? 'Default' : ''
                        }));
                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'Terms & conditions could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        // search + operation (the tab is applied after : the
        // summary counts all statuses)
        const base =
            this.all.filter(x =>
                (!this.selectedOperation || x.OperationCode === this.selectedOperation)
                &&
                (!find || [x.Code, x.Title, x.OperationName, x.LinesText].some(v => (v ?? '').toLowerCase().includes(find))));

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

        this.summaryItems =
        [
            { label:'Total', value:count(base.length), tone:'' },
            { label:'Active', value:count(base.filter(x => x.IsActive).length), tone:'ok' },
            { label:'Inactive', value:count(base.filter(x => !x.IsActive).length), tone:'bad' },
            { label:'Defaults', value:count(base.filter(x => x.IsDefault).length), tone:'' }
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

    onOperationChange(value: any):
        void
    {
        this.selectedOperation = String(value ?? '');
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

    view(row: TermsRow):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    edit(row: TermsRow):
        void
    {
        void this.router.navigate(['../edit', row.PublicId], { relativeTo:this.route });
    }

    refresh():
        void
    {
        this.load();
    }

    delete(row: TermsRow):
        void
    {
        this.confirmDialog.open(
            'Delete Terms & Conditions',
            row.IsDefault
                ? `Delete ${row.Code} ${row.Title}? It is the Default of ${row.OperationName} : that document will print no terms until another set is made the Default.`
                : `Delete ${row.Code} ${row.Title}?`,
            () =>
                this.service.delete(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);
                        this.load();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The set could not be deleted.')
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
            'Restore Terms & Conditions',
            'Bring back the most recently deleted set? It comes back as a normal set (not the Default).',
            () =>
                this.service.restore().subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Restored', 'The set was restored.');
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
