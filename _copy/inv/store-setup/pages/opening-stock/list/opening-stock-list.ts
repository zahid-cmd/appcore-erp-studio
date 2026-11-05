//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    DestroyRef,
    OnInit,
    inject
}
from '@angular/core';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import
{
    CommonModule
}
from '@angular/common';

import
{
    Router
}
from '@angular/router';

import
{
    PageHeaderComponent
}
from '../../../../../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    PageCanvasComponent,
    PageCanvasConfig
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    SearchBoxComponent
}
from '../../../../../../shared/components/utilities/search-box/search-box';

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    ListTableComponent,
    ListTableColumn
}
from '../../../../../../shared/components/layout/list-table/list-table';

import
{
    PaginationComponent
}
from '../../../../../../shared/components/controls/pagination/pagination';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

import
{
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    HistoryDrawerComponent
}
from '../../../../../../shared/components/utilities/history-drawer/history-drawer';

import
{
    ConfirmDialogComponent
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    ProgressDialogComponent
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

import
{
    ProgressRunner
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-runner';

import
{
    OPENING_STOCK_ROUTE,
    OPENING_STOCK_TYPES,
    OpeningStock,
    formatOpeningDate,
    formatOpeningMoney,
    formatOpeningQty,
    openingStockMatches,
    openingStockType
}
from '../../../models/opening-stock.model';

import
{
    OpeningStockService
}
from '../../../services/opening-stock.service';


// A row with its display texts
type OpeningStockRow =
    OpeningStock
    &
    {
        DateText:string;
        TypeText:string;
        QuantityText:string;
        ValueText:string;
    };


//===============================================================
// Opening Stock list : every type; a type filter on the
// toolbar. A draft opens for editing, a posted / cancelled one
// opens to view (print, cancel).
//===============================================================

@Component(
{
    selector:'app-opening-stock-list',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        ToastComponent,
        HistoryDrawerComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./opening-stock-list.html',

    styleUrl:'./opening-stock-list.css'
})

export class OpeningStockList
    implements OnInit
{
    private readonly service =
        inject(OpeningStockService);

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly toast =
        inject(ToastService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    // Progress dialog around delete / restore
    readonly progress =
        new ProgressRunner(inject(ProgressDialogService), () => this.cdr.detectChanges());

    //===========================================================
    // History
    //===========================================================

    historyOpened:
        boolean = false;

    historyTitle:
        string = 'Opening Stock History';

    historyItems:
        any[] = [];

    private readonly destroyRef =
        inject(DestroyRef);

    //===========================================================
    // Tabs : All / Draft / Posted / Cancelled ; type filter
    //===========================================================

    tabs:
        ControlTab[] =
        [
            { id:'all', label:'All' },
            { id:'draft', label:'Draft' },
            { id:'posted', label:'Posted' },
            { id:'cancelled', label:'Cancelled' }
        ];

    selectedTab:
        string = 'all';

    readonly types =
        [
            { id:'', label:'All Types', icon:'fas fa-layer-group' },
            ...OPENING_STOCK_TYPES.map(x => ({ id:x.type as string, label:x.title, icon:x.icon }))
        ];

    selectedType:
        string = '';

    //===========================================================
    // Data
    //===========================================================

    rows:
        OpeningStockRow[] = [];

    filteredRows:
        OpeningStockRow[] = [];

    pagedRows:
        OpeningStockRow[] = [];

    searchText:
        string = '';

    loading:
        boolean = false;

    loadFailed:
        boolean = false;

    currentPage:
        number = 1;

    pageSize:
        number = 10;

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
        { header:'Opening Voucher No', field:'OpeningNo', width:'260px', align:'center', sortable:true },
        { header:'Date', field:'DateText', width:'135px', align:'center', sortable:true },
        { header:'Product Type', field:'TypeText', width:'160px', align:'left', sortable:true },
        { header:'Branch', field:'BranchName', width:'190px', align:'left', sortable:true },
        { header:'Warehouse', field:'WarehouseName', align:'left', sortable:true },
        { header:'Credit Ledger', field:'LedgerName', align:'left', sortable:true },
        { header:'Lines', field:'LineCount', width:'70px', align:'right', sortable:true },
        { header:'Quantity', field:'QuantityText', width:'95px', align:'right', sortable:true },
        { header:'Value', field:'ValueText', width:'130px', align:'right', sortable:true },
        { header:'Status', field:'Status', type:'status', width:'140px', align:'center', sortable:true },
        { header:'Actions', field:'actions', type:'actions', width:'150px', align:'center' }
    ];

    //===========================================================
    // Start
    //===========================================================

    ngOnInit():
        void
    {
        this.load();
    }

    load():
        void
    {
        this.loading = true;

        this.loadFailed = false;

        this.cdr.detectChanges();

        this.service
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    rows =>
                    {
                        this.rows =
                            rows.map
                            (
                                x =>
                                ({
                                    ...x,
                                    DateText:formatOpeningDate(x.OpeningDate),
                                    TypeText:openingStockType(x.PageType).title,
                                    QuantityText:formatOpeningQty(x.TotalQuantity),
                                    ValueText:formatOpeningMoney(x.TotalValue)
                                })
                            );

                        this.loading = false;

                        this.applyFilters();
                    },

                error:
                    () =>
                    {
                        this.loading = false;

                        this.loadFailed = true;

                        this.rows = [];

                        this.applyFilters();
                    }
            });
    }

    //===========================================================
    // Filters
    //===========================================================

    onTabChange
    (
        tab:
            string
    ):
        void
    {
        this.selectedTab = tab;

        this.applyFilters();
    }

    onTypeChange
    (
        type:
            string
    ):
        void
    {
        this.selectedType = type;

        this.applyFilters();
    }

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText = value ?? '';

        this.applyFilters();
    }

    typeCount
    (
        type:
            string
    ):
        number
    {
        return type
            ? this.rows.filter(x => x.PageType === type).length
            : this.rows.length;
    }

    private applyFilters():
        void
    {
        this.filteredRows =
            this.rows.filter
            (
                x =>
                    (this.selectedTab === 'all' || x.Status.toLowerCase() === this.selectedTab)
                    &&
                    (!this.selectedType || x.PageType === this.selectedType)
                    &&
                    openingStockMatches(x, this.searchText)
            );

        this.currentPage = 1;

        this.paginate();
    }

    onSort
    (
        event:
            { field:string; direction:'asc' | 'desc' }
    ):
        void
    {
        const field =
            event.field === 'DateText'
                ? 'OpeningDate'
                : event.field === 'QuantityText'
                    ? 'TotalQuantity'
                    : event.field === 'ValueText'
                        ? 'TotalValue'
                        : event.field;

        const sign =
            event.direction === 'asc' ? 1 : -1;

        this.filteredRows =
            [...this.filteredRows].sort
            (
                (a: any, b: any) =>
                {
                    const x = a[field];

                    const y = b[field];

                    return (typeof x === 'number' && typeof y === 'number'
                        ? x - y
                        : String(x ?? '').localeCompare(String(y ?? ''))) * sign;
                }
            );

        this.paginate();
    }

    onPageChange
    (
        page:
            number
    ):
        void
    {
        this.currentPage = page;

        this.paginate();
    }

    onPageSizeChange
    (
        size:
            number
    ):
        void
    {
        this.pageSize = size;

        this.currentPage = 1;

        this.paginate();
    }

    private paginate():
        void
    {
        const start =
            (this.currentPage - 1) * this.pageSize;

        this.pagedRows =
            this.filteredRows.slice(start, start + this.pageSize);

        this.cdr.detectChanges();
    }

    //===========================================================
    // Commands
    //===========================================================

    add():
        void
    {
        this.router.navigate(
            [OPENING_STOCK_ROUTE, 'add'],
            this.selectedType ? { queryParams:{ type:this.selectedType } } : {});
    }

    refresh():
        void
    {
        this.searchText = '';

        this.selectedTab = 'all';

        this.selectedType = '';

        this.load();
    }

    view
    (
        row:
            OpeningStock
    ):
        void
    {
        if
        (
            row?.OpeningStockId
        )
        {
            this.router.navigate([OPENING_STOCK_ROUTE, 'view', row.OpeningStockId]);
        }
    }

    // Only a draft is edited; a posted / cancelled one opens to view
    edit
    (
        row:
            OpeningStock
    ):
        void
    {
        if
        (
            !row?.OpeningStockId
        )
        {
            return;
        }

        if
        (
            row.Status !== 'Draft'
        )
        {
            this.toast.info('Edit Not Allowed', `${row.OpeningNo} is ${row.Status}. Only a draft can be edited; it opens to view.`);

            this.view(row);

            return;
        }

        this.router.navigate([OPENING_STOCK_ROUTE, 'edit', row.OpeningStockId]);
    }

    //===========================================================
    // Delete (draft)
    //===========================================================

    delete
    (
        row:
            OpeningStock
    ):
        void
    {
        if
        (
            this.progress.busy || !row?.OpeningStockId
        )
        {
            return;
        }

        if
        (
            row.Status !== 'Draft'
        )
        {
            this.toast.info('Delete Not Allowed', `${row.OpeningNo} is ${row.Status}. Only a draft can be deleted; a posted one is cancelled from its page.`);

            return;
        }

        this.confirmDialog.open
        (
            'Delete Opening Stock',
            `Are you sure you want to delete draft "${row.OpeningNo}"?`,
            () =>
                // Next tick : let the confirm dialog close first
                setTimeout(() => this.deleteRow(row))
        );
    }

    private deleteRow
    (
        row:
            OpeningStock
    ):
        void
    {
        this.progress
            .run(
                'Deleting Opening Stock',
                `Please wait while "${row.OpeningNo}" is being deleted...`,
                'Opening stock deleted.',
                this.service.delete(row.OpeningStockId))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.toast.success('Delete Successful', `${row.OpeningNo} deleted successfully.`);

                        this.load();
                    },

                error:
                    err =>
                        this.toast.error('Delete Failed', errorText(err, 'Failed to delete the opening stock.'))
            });
    }

    //===========================================================
    // Restore (the most recently deleted draft)
    //===========================================================

    restore():
        void
    {
        if
        (
            this.progress.busy
        )
        {
            return;
        }

        this.confirmDialog.open
        (
            'Restore Opening Stock',
            'Are you sure you want to restore the most recently deleted draft opening stock?',
            () =>
                setTimeout(() => this.restoreLast()),
            'Restore',
            'Cancel',
            'primary'
        );
    }

    private restoreLast():
        void
    {
        this.progress
            .run(
                'Restoring Opening Stock',
                'Please wait while the most recently deleted draft is being restored...',
                'Opening stock restored.',
                this.service.restore())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.toast.success('Restore Successful', 'The most recently deleted draft has been restored.');

                        this.load();
                    },

                error:
                    err =>
                    {
                        if
                        (
                            err?.status === 404
                        )
                        {
                            this.toast.info('No Data to Restore', 'There is no deleted opening stock draft to restore.');

                            return;
                        }

                        this.toast.error('Restore Failed', errorText(err, 'Failed to restore the opening stock.'));
                    }
            });
    }

    //===========================================================
    // History
    //===========================================================

    openHistory():
        void
    {
        this.service
            .getHistory()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    rows =>
                    {
                        this.historyItems = (rows ?? []).map(toHistoryItem);

                        this.historyTitle = 'Opening Stock History';

                        this.historyOpened = true;

                        this.cdr.detectChanges();
                    },

                error:
                    () =>
                        this.toast.error('History', 'Failed to load the opening stock history.')
            });
    }

    closeHistory():
        void
    {
        this.historyOpened = false;

        this.cdr.detectChanges();
    }
}


//===============================================================
// Helpers
//===============================================================

function errorText
(
    err:
        any,
    fallback:
        string
):
    string
{
    const body =
        err?.error;

    return typeof body === 'string' && body.trim()
        ? body.trim()
        : body?.message || body?.title || fallback;
}

// An activity row → a history drawer item
export function toHistoryItem
(
    row:
        any
):
    any
{
    return {
        title:row?.activityTitle ?? row?.ActivityTitle,
        description:row?.activityDescription ?? row?.ActivityDescription,
        user:row?.performedByName ?? row?.PerformedByName ?? 'System',
        dateTime:new Date(row?.performedDate ?? row?.PerformedDate).toLocaleString(),
        badge:row?.activityType ?? row?.ActivityType
    };
}
