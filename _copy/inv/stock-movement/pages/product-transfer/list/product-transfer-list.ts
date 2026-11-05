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
    ListTableColumn,
    ListTableRowAction,
    ListTableRowActionEvent
}
from '../../../../../../shared/components/layout/list-table/list-table';

import
{
    PaginationComponent
}
from '../../../../../../shared/components/controls/pagination/pagination';

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
    PRODUCT_TRANSFER_PRINT_KEY,
    PRODUCT_TRANSFER_ROUTE,
    PRODUCT_TRANSFER_TYPES,
    ProductTransferListRow,
    formatTransferDate,
    formatTransferMoney,
    formatTransferQty,
    productTransferMatches,
    productTransferType,
    warehouseText
}
from '../../../models/product-transfer.model';

import
{
    ProductTransferService
}
from '../../../services/product-transfer.service';


// A row with its display texts
type ProductTransferRow =
    ProductTransferListRow
    &
    {
        DateText:string;
        TypeText:string;
        FromText:string;
        ToText:string;
        QtyText:string;
        ValueText:string;
        // Draft / In Transit / Completed / Received / Cancelled /
        // Deleted
        StatusText:string;
    };

// The line under the toolbar : what an action did (no toast on
// this page)
interface ListNotice
{
    tone:'info' | 'ok' | 'error';
    text:string;
}


//===============================================================
// Product Transfer list : the transfers of every type; a type
// filter on the toolbar. A draft opens for editing; a sent /
// completed / received / cancelled one opens to view (print,
// receive, cancel). Deleted drafts show on the Deleted tab, each
// with Restore.
//===============================================================

@Component(
{
    selector:'app-product-transfer-list',

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
        HistoryDrawerComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./product-transfer-list.html',

    styleUrl:'./product-transfer-list.css'
})

export class ProductTransferList
    implements OnInit
{
    private readonly service =
        inject(ProductTransferService);

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly destroyRef =
        inject(DestroyRef);

    // Progress dialog around delete / restore
    readonly progress =
        new ProgressRunner(inject(ProgressDialogService), () => this.cdr.detectChanges());

    //===========================================================
    // History
    //===========================================================

    historyOpened:
        boolean = false;

    historyTitle:
        string = 'Product Transfer History';

    historyItems:
        any[] = [];

    //===========================================================
    // Notice (instead of toasts)
    //===========================================================

    notice:
        ListNotice | null = null;

    private noticeTimer?:
        number;

    //===========================================================
    // Tabs : All / Draft / In Transit / Completed / Received /
    // Cancelled / Deleted ; type
    //===========================================================

    tabs:
        ControlTab[] =
        [
            { id:'all', label:'All' },
            { id:'draft', label:'Draft' },
            { id:'in transit', label:'In Transit' },
            { id:'completed', label:'Completed' },
            { id:'received', label:'Received' },
            { id:'cancelled', label:'Cancelled' },
            { id:'deleted', label:'Deleted' }
        ];

    selectedTab:
        string = 'all';

    readonly types =
        [
            { id:'', label:'All Types', icon:'fas fa-layer-group' },
            ...PRODUCT_TRANSFER_TYPES.map(x => ({ id:x.type as string, label:x.title, icon:x.icon }))
        ];

    selectedType:
        string = '';

    //===========================================================
    // Data
    //===========================================================

    rows:
        ProductTransferRow[] = [];

    filteredRows:
        ProductTransferRow[] = [];

    pagedRows:
        ProductTransferRow[] = [];

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
        { header:'Transfer No', field:'TransferNo', width:'150px', align:'center', sortable:true },
        { header:'Date', field:'DateText', width:'115px', align:'center', sortable:true },
        { header:'Product Type', field:'TypeText', width:'180px', align:'left', sortable:true },
        { header:'From', field:'FromText', align:'left', sortable:true },
        { header:'To', field:'ToText', align:'left', sortable:true },
        { header:'Lines', field:'LineCount', width:'75px', align:'right', sortable:true },
        { header:'Qty', field:'QtyText', width:'90px', align:'right', sortable:true },
        { header:'Value', field:'ValueText', width:'130px', align:'right', sortable:true },
        { header:'Status', field:'StatusText', type:'status', width:'120px', align:'center', sortable:true },
        { header:'Actions', field:'actions', type:'actions', width:'200px', align:'center' }
    ];

    // Extra row buttons before View / Edit / Delete
    readonly rowActions:
        ListTableRowAction[] =
    [
        {
            key:'restore',
            icon:'fas fa-trash-arrow-up',
            title:'Restore the deleted draft',
            tone:'success',
            visible:(row: ProductTransferRow) => row.IsDeleted
        },
        {
            key:'print',
            icon:'fas fa-print',
            title:'Print',
            tone:'primary',
            visible:(row: ProductTransferRow) => !row.IsDeleted
        },
        {
            key:'history',
            icon:'fas fa-clock-rotate-left',
            title:'History of this product transfer',
            tone:'default'
        }
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
                                    DateText:formatTransferDate(x.TransferDate),
                                    TypeText:productTransferType(x.PageType).title,
                                    FromText:warehouseText(x.FromWarehouseName, x.FromBranchName) || '—',
                                    ToText:warehouseText(x.ToWarehouseName, x.ToBranchName) || '—',
                                    QtyText:formatTransferQty(x.TotalQuantity),
                                    ValueText:formatTransferMoney(x.TotalValue),
                                    StatusText:x.IsDeleted ? 'Deleted' : x.Status
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
    // Notice
    //===========================================================

    private say
    (
        tone:
            ListNotice['tone'],
        message:
            string
    ):
        void
    {
        this.notice = { tone, text:message };

        if
        (
            this.noticeTimer
        )
        {
            clearTimeout(this.noticeTimer);
        }

        this.noticeTimer =
            window.setTimeout
            (
                () =>
                {
                    this.notice = null;

                    this.cdr.detectChanges();
                },
                tone === 'error' ? 9000 : 6000
            );

        this.cdr.detectChanges();
    }

    closeNotice():
        void
    {
        this.notice = null;

        this.cdr.detectChanges();
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

    // Deleted drafts are counted on the Deleted tab only
    typeCount
    (
        type:
            string
    ):
        number
    {
        return this.rows.filter(x => !x.IsDeleted && (!type || x.PageType === type)).length;
    }

    private tabMatches
    (
        row:
            ProductTransferRow
    ):
        boolean
    {
        if
        (
            this.selectedTab === 'deleted'
        )
        {
            return row.IsDeleted;
        }

        return !row.IsDeleted
            && (this.selectedTab === 'all' || row.Status.toLowerCase() === this.selectedTab);
    }

    private applyFilters():
        void
    {
        this.filteredRows =
            this.rows.filter
            (
                x =>
                    this.tabMatches(x)
                    &&
                    (!this.selectedType || x.PageType === this.selectedType)
                    &&
                    productTransferMatches(x, this.searchText)
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
        const fields:
            Record<string, string> =
        {
            DateText:'TransferDate',
            QtyText:'TotalQuantity',
            ValueText:'TotalValue'
        };

        const field =
            fields[event.field] ?? event.field;

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
            [PRODUCT_TRANSFER_ROUTE, 'add'],
            this.selectedType ? { queryParams:{ type:this.selectedType } } : {});
    }

    refresh():
        void
    {
        this.searchText = '';

        this.selectedTab = 'all';

        this.selectedType = '';

        this.notice = null;

        this.load();
    }

    view
    (
        row:
            ProductTransferRow
    ):
        void
    {
        if
        (
            !row?.Id
        )
        {
            return;
        }

        if
        (
            row.IsDeleted
        )
        {
            this.say('info', `${row.TransferNo} is deleted. Restore it first to open it.`);

            return;
        }

        this.router.navigate([PRODUCT_TRANSFER_ROUTE, 'view', row.Id]);
    }

    // Only a draft is edited; any other opens to view
    edit
    (
        row:
            ProductTransferRow
    ):
        void
    {
        if
        (
            !row?.Id
        )
        {
            return;
        }

        if
        (
            row.IsDeleted
        )
        {
            this.say('info', `${row.TransferNo} is deleted. Restore it first to edit it.`);

            return;
        }

        if
        (
            row.Status !== 'Draft'
        )
        {
            this.router.navigate([PRODUCT_TRANSFER_ROUTE, 'view', row.Id]);

            return;
        }

        this.router.navigate([PRODUCT_TRANSFER_ROUTE, 'edit', row.Id]);
    }

    onRowAction
    (
        event:
            ListTableRowActionEvent
    ):
        void
    {
        const row =
            event?.row as ProductTransferRow;

        if
        (
            !row?.Id
        )
        {
            return;
        }

        switch
        (
            event.key
        )
        {
            case 'restore':
                this.restoreRow(row);
                break;

            case 'print':
                this.print(row);
                break;

            case 'history':
                this.openRowHistory(row);
                break;
        }
    }

    //===========================================================
    // Delete (draft)
    //===========================================================

    delete
    (
        row:
            ProductTransferRow
    ):
        void
    {
        if
        (
            this.progress.busy || !row?.Id
        )
        {
            return;
        }

        if
        (
            row.IsDeleted
        )
        {
            this.say('info', `${row.TransferNo} is already deleted.`);

            return;
        }

        if
        (
            row.Status !== 'Draft'
        )
        {
            this.say('info', `${row.TransferNo} is ${row.Status}. Only a draft can be deleted; a posted one is cancelled from its page (Cancel).`);

            return;
        }

        this.confirmDialog.open
        (
            'Delete Product Transfer',
            `Are you sure you want to delete draft "${row.TransferNo}"?`,
            () =>
                // Next tick : let the confirm dialog close first
                setTimeout(() => this.deleteRow(row))
        );
    }

    private deleteRow
    (
        row:
            ProductTransferRow
    ):
        void
    {
        this.progress
            .run(
                'Deleting Product Transfer',
                `Please wait while "${row.TransferNo}" is being deleted...`,
                'Product transfer deleted.',
                this.service.delete(row.Id))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.say('ok', `${row.TransferNo} deleted. It stays on the Deleted tab for Restore.`);

                        this.load();
                    },

                error:
                    err =>
                        this.say('error', errorText(err, 'Failed to delete the product transfer.'))
            });
    }

    //===========================================================
    // Restore : a row's own button, or the command (the most
    // recently deleted draft)
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

        // The newest deleted draft (highest id)
        const last =
            this.rows
                .filter(x => x.IsDeleted)
                .sort((a, b) => b.Id - a.Id)[0];

        if
        (
            !last
        )
        {
            this.say('info', 'There is no deleted product transfer draft to restore.');

            return;
        }

        this.restoreRow(last);
    }

    private restoreRow
    (
        row:
            ProductTransferRow
    ):
        void
    {
        if
        (
            this.progress.busy || !row.IsDeleted
        )
        {
            return;
        }

        this.confirmDialog.open
        (
            'Restore Product Transfer',
            `Are you sure you want to restore draft "${row.TransferNo}"?`,
            () =>
                setTimeout(() => this.runRestore(row)),
            'Restore',
            'Cancel',
            'primary'
        );
    }

    private runRestore
    (
        row:
            ProductTransferRow
    ):
        void
    {
        this.progress
            .run(
                'Restoring Product Transfer',
                `Please wait while "${row.TransferNo}" is being restored...`,
                'Product transfer restored.',
                this.service.restore(row.Id))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.say('ok', `${row.TransferNo} restored as a draft.`);

                        this.selectedTab = 'all';

                        this.load();
                    },

                error:
                    err =>
                        this.say('error', errorText(err, 'Failed to restore the product transfer.'))
            });
    }

    //===========================================================
    // Print (the Print Engine in a new tab)
    //===========================================================

    print
    (
        row:
            ProductTransferRow
    ):
        void
    {
        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(['/print-viewer', PRODUCT_TRANSFER_PRINT_KEY, row.Id])
            );

        const tab =
            window.open(url, '_blank');

        if
        (
            !tab
        )
        {
            this.say('error', 'The browser blocked the print tab. Allow pop-ups for this site.');
        }
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

                        this.historyTitle = 'Product Transfer History';

                        this.historyOpened = true;

                        this.cdr.detectChanges();
                    },

                error:
                    err =>
                        this.say('error', errorText(err, 'Failed to load the product transfer history.'))
            });
    }

    private openRowHistory
    (
        row:
            ProductTransferRow
    ):
        void
    {
        this.service
            .getEntityHistory(row.Id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    rows =>
                    {
                        this.historyItems = (rows ?? []).map(toHistoryItem);

                        this.historyTitle = `History · ${row.TransferNo}`;

                        this.historyOpened = true;

                        this.cdr.detectChanges();
                    },

                error:
                    err =>
                        this.say('error', errorText(err, `Failed to load the history of ${row.TransferNo}.`))
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

    if
    (
        err?.status === 403
    )
    {
        return body?.message || 'You do not have permission for this action.';
    }

    return typeof body === 'string' && body.trim()
        ? body.trim()
        : body?.message || body?.Message || body?.title || fallback;
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
