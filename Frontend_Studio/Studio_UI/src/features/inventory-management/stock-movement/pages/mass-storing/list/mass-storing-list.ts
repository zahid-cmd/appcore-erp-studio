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
    MASS_STORING_PRINT_KEY,
    MASS_STORING_ROUTE,
    MASS_STORING_TYPES,
    MassStoringListRow,
    formatStoringDate,
    massStoringType,
    storingWarehouseText
}
from '../../../models/mass-storing.model';

import
{
    MassStoringService
}
from '../../../services/mass-storing.service';


// A row with its display texts
type MassStoringRow =
    MassStoringListRow
    &
    {
        DateText:string;
        TypeText:string;
        WarehouseText:string;
        // Draft / Posted / Cancelled / Deleted
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
// Mass Storing list : the storings of both types (SP / AC); a
// type filter on the toolbar. A draft opens for editing; a posted
// / cancelled one opens to view (print, cancel). Deleted drafts
// show on the Deleted tab, each with Restore.
//===============================================================

@Component(
{
    selector:'app-mass-storing-list',

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

    templateUrl:'./mass-storing-list.html',

    styleUrl:'./mass-storing-list.css'
})

export class MassStoringList
    implements OnInit
{
    private readonly service =
        inject(MassStoringService);

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
        string = 'Mass Storing History';

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
    // Tabs : All / Draft / Posted / Cancelled / Deleted ; type
    //===========================================================

    tabs:
        ControlTab[] =
        [
            { id:'all', label:'All' },
            { id:'draft', label:'Draft' },
            { id:'posted', label:'Posted' },
            { id:'cancelled', label:'Cancelled' },
            { id:'deleted', label:'Deleted' }
        ];

    selectedTab:
        string = 'all';

    readonly types =
        [
            { id:'', label:'All Types', icon:'fas fa-layer-group' },
            ...MASS_STORING_TYPES.map(x => ({ id:x.type as string, label:x.title, icon:x.icon }))
        ];

    selectedType:
        string = '';

    //===========================================================
    // Data
    //===========================================================

    rows:
        MassStoringRow[] = [];

    // Rows on all pages after the tab / type / search (server)
    totalRecords:
        number = 0;

    // Tab / type / status counts from the server
    counts:
        Record<string, number> = {};

    // Server sort ('' = newest first)
    private sortField:
        string = '';

    private sortDirection:
        'asc' | 'desc' = 'asc';

    private searchTimer?:
        number;

    // A load that is out of date is ignored
    private loadSeq:
        number = 0;

    pagedRows:
        MassStoringRow[] = [];

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
        { header:'Storing No', field:'StoringNo', width:'150px', align:'center', sortable:true },
        { header:'Date', field:'DateText', width:'115px', align:'center', sortable:true },
        { header:'Product Type', field:'TypeText', width:'190px', align:'left', sortable:true },
        { header:'Warehouse', field:'WarehouseText', align:'left', sortable:true },
        { header:'Lines', field:'LineCount', width:'80px', align:'right', sortable:true },
        { header:'Status', field:'StatusText', type:'status', width:'120px', align:'center', sortable:true },
        { header:'Saved By', field:'CreatedByName', width:'150px', align:'left', sortable:true },
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
            visible:(row: MassStoringRow) => row.IsDeleted
        },
        {
            key:'print',
            icon:'fas fa-print',
            title:'Print',
            tone:'primary',
            visible:(row: MassStoringRow) => !row.IsDeleted
        },
        {
            key:'history',
            icon:'fas fa-clock-rotate-left',
            title:'History of this mass storing',
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

        const seq =
            ++this.loadSeq;

        this.cdr.detectChanges();

        this.service
            .getPaged
            ({
                page:
                    this.currentPage,
                pageSize:
                    this.pageSize,
                search:
                    this.searchText,
                sort:
                    this.sortField,
                dir:
                    this.sortDirection,
                type:
                    this.selectedType,
                tab:
                    this.selectedTab
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    result =>
                    {
                        if
                        (
                            seq !== this.loadSeq
                        )
                        {
                            return;
                        }

                        this.rows =
                            result.items.map(x => this.toRow(x));

                        this.pagedRows =
                            this.rows;

                        this.totalRecords =
                            result.totalCount;

                        this.currentPage =
                            result.page || 1;

                        this.counts =
                            result.counts ?? {};

                        this.loading = false;

                        this.cdr.detectChanges();
                    },

                error:
                    () =>
                    {
                        if
                        (
                            seq !== this.loadSeq
                        )
                        {
                            return;
                        }

                        this.loading = false;

                        this.loadFailed = true;

                        this.rows = [];

                        this.pagedRows = [];

                        this.totalRecords = 0;

                        this.counts = {};

                        this.cdr.detectChanges();
                    }
            });
    }

    // A list row with its display texts
    private toRow
    (
        x:
            any
    ):
        MassStoringRow
    {
        return ({
            ...x,
            DateText:formatStoringDate(x.StoringDate),
            TypeText:massStoringType(x.PageType).title,
            WarehouseText:storingWarehouseText(x.WarehouseName, x.BranchName) || '—',
            StatusText:x.IsDeleted ? 'Deleted' : x.Status
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
    // Filters (tab / type / search / sort / page on the server)
    //===========================================================

    onTabChange
    (
        tab:
            string
    ):
        void
    {
        this.selectedTab = tab;

        this.reload();
    }

    onTypeChange
    (
        type:
            string
    ):
        void
    {
        this.selectedType = type;

        this.reload();
    }

    // Live documents of a type (search applied) ; '' = all types
    typeCount
    (
        type:
            string
    ):
        number
    {
        return Number(this.counts['Type_' + (type || 'All')] ?? 0);
    }

    // Search after a short pause in typing
    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText = value ?? '';

        if
        (
            this.searchTimer
        )
        {
            clearTimeout(this.searchTimer);
        }

        this.searchTimer =
            window.setTimeout
            (
                () =>
                {
                    this.searchTimer = undefined;

                    this.reload();
                },
                300
            );
    }

    // Back to page 1 and load
    private reload():
        void
    {
        this.currentPage = 1;

        this.load();
    }

    onSort
    (
        event:
            { field:string; direction:'asc' | 'desc' }
    ):
        void
    {
        this.sortField = event?.field ?? '';

        this.sortDirection = event?.direction === 'desc' ? 'desc' : 'asc';

        this.reload();
    }

    onPageChange
    (
        page:
            number
    ):
        void
    {
        this.currentPage = page;

        this.load();
    }

    onPageSizeChange
    (
        size:
            number
    ):
        void
    {
        this.pageSize = size;

        this.reload();
    }

    //===========================================================
    // Summary Line (below the canvas) : documents by status
    // (search and type applied)
    //===========================================================

    get summaryTotal():
        number
    {
        return Number(this.counts['All'] ?? 0);
    }

    // A status count ; the server keys are the status names
    countOf
    (
        status:
            string
    ):
        number
    {
        const key =
            Object.keys(this.counts).find(k => k.toLowerCase() === status.toLowerCase());

        return key ? Number(this.counts[key] ?? 0) : 0;
    }

    get summaryNote():
        string
    {
        return this.searchText.trim() || this.selectedType
            ? 'Filtered records'
            : 'All records';
    }

    summaryText(
        value: number
    ):
        string
    {
        return value.toLocaleString('en-US');
    }

    //===========================================================
    // Commands
    //===========================================================

    add():
        void
    {
        this.router.navigate(
            [MASS_STORING_ROUTE, 'add'],
            this.selectedType ? { queryParams:{ type:this.selectedType } } : {});
    }

    refresh():
        void
    {
        this.searchText = '';

        this.sortField = '';

        this.currentPage = 1;

        this.selectedTab = 'all';

        this.selectedType = '';

        this.notice = null;

        this.load();
    }

    view
    (
        row:
            MassStoringRow
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
            this.say('info', `${row.StoringNo} is deleted. Restore it first to open it.`);

            return;
        }

        this.router.navigate([MASS_STORING_ROUTE, 'view', row.PublicId]);
    }

    // Only a draft is edited; any other opens to view
    edit
    (
        row:
            MassStoringRow
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
            this.say('info', `${row.StoringNo} is deleted. Restore it first to edit it.`);

            return;
        }

        if
        (
            row.Status !== 'Draft'
        )
        {
            this.router.navigate([MASS_STORING_ROUTE, 'view', row.PublicId]);

            return;
        }

        this.router.navigate([MASS_STORING_ROUTE, 'edit', row.PublicId]);
    }

    onRowAction
    (
        event:
            ListTableRowActionEvent
    ):
        void
    {
        const row =
            event?.row as MassStoringRow;

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
            MassStoringRow
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
            this.say('info', `${row.StoringNo} is already deleted.`);

            return;
        }

        if
        (
            row.Status !== 'Draft'
        )
        {
            this.say('info', `${row.StoringNo} is ${row.Status}. Only a draft can be deleted; a posted one is cancelled from its page (Cancel).`);

            return;
        }

        this.confirmDialog.open
        (
            'Delete Mass Storing',
            `Are you sure you want to delete draft "${row.StoringNo}"?`,
            () =>
                // Next tick : let the confirm dialog close first
                setTimeout(() => this.deleteRow(row))
        );
    }

    private deleteRow
    (
        row:
            MassStoringRow
    ):
        void
    {
        this.progress
            .run(
                'Deleting Mass Storing',
                `Please wait while "${row.StoringNo}" is being deleted...`,
                'Mass storing deleted.',
                this.service.delete(row.PublicId ?? ''))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.say('ok', `${row.StoringNo} deleted. It stays on the Deleted tab for Restore.`);

                        this.load();
                    },

                error:
                    err =>
                        this.say('error', errorText(err, 'Failed to delete the mass storing.'))
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

        // The newest deleted draft (the first row of the Deleted tab)
        this.service
            .getPaged({ page:1, pageSize:1, tab:'deleted' })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    result =>
                    {
                        const last =
                            result.items[0];

                        if
                        (
                            !last
                        )
                        {
                            this.say('info', 'There is no deleted mass storing draft to restore.');

                            return;
                        }

                        this.restoreRow(this.toRow(last));
                    },

                error:
                    err =>
                        this.say('error', errorText(err, 'Failed to find the deleted draft.'))
            });
    }

    private restoreRow
    (
        row:
            MassStoringRow
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
            'Restore Mass Storing',
            `Are you sure you want to restore draft "${row.StoringNo}"?`,
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
            MassStoringRow
    ):
        void
    {
        this.progress
            .run(
                'Restoring Mass Storing',
                `Please wait while "${row.StoringNo}" is being restored...`,
                'Mass storing restored.',
                this.service.restore(row.PublicId ?? ''))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.say('ok', `${row.StoringNo} restored as a draft.`);

                        this.selectedTab = 'all';

                        this.load();
                    },

                error:
                    err =>
                        this.say('error', errorText(err, 'Failed to restore the mass storing.'))
            });
    }

    //===========================================================
    // Print (the Print Engine in a new tab)
    //===========================================================

    print
    (
        row:
            MassStoringRow
    ):
        void
    {
        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(['/print-viewer', MASS_STORING_PRINT_KEY, row.PublicId])
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

                        this.historyTitle = 'Mass Storing History';

                        this.historyOpened = true;

                        this.cdr.detectChanges();
                    },

                error:
                    err =>
                        this.say('error', errorText(err, 'Failed to load the mass storing history.'))
            });
    }

    private openRowHistory
    (
        row:
            MassStoringRow
    ):
        void
    {
        this.service
            .getEntityHistory(row.PublicId ?? '')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    rows =>
                    {
                        this.historyItems = (rows ?? []).map(toHistoryItem);

                        this.historyTitle = `History · ${row.StoringNo}`;

                        this.historyOpened = true;

                        this.cdr.detectChanges();
                    },

                error:
                    err =>
                        this.say('error', errorText(err, `Failed to load the history of ${row.StoringNo}.`))
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
