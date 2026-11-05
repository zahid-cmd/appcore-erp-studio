//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    inject,
    ChangeDetectorRef,
    DestroyRef
}
from '@angular/core';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import
{
    HttpErrorResponse
}
from '@angular/common/http';

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

//===============================================================
// Models
//===============================================================

import
{
    SalesInvoiceListItem,
    SalesInvoiceListNotice,
    SalesInvoiceNoticeTone
}
from '../sales-invoice.model';

import
{
    formatMoney,
    roundMoney
}
from '../../../../../shared/components/accounting/accounting.models';

//===============================================================
// Shared Components
//===============================================================

import
{
    PageHeaderComponent
}
from '../../../../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    PageCanvasComponent,
    PageCanvasConfig
}
from '../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    SearchBoxComponent
}
from '../../../../../shared/components/utilities/search-box/search-box';

import
{
    CommandCenterComponent
}
from '../../../../../shared/components/utilities/command-center/command-center';

import
{
    ListTableComponent,
    ListTableColumn,
    ListTableRowAction,
    ListTableRowActionEvent
}
from '../../../../../shared/components/layout/list-table/list-table';

import
{
    PaginationComponent
}
from '../../../../../shared/components/controls/pagination/pagination';

import
{
    HistoryDrawerComponent
}
from '../../../../../shared/components/utilities/history-drawer/history-drawer';

import
{
    ConfirmDialogService
}
from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    ConfirmDialogComponent
}
from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ProgressDialogComponent
}
from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

import
{
    ProgressRunner
}
from '../../../../../shared/components/utilities/progress-dialog/progress-runner';

//===============================================================
// Service
//===============================================================

import
{
    SalesInvoiceService
}
from '../sales-invoice.service';

import
{
    SALES_INVOICE_PAGE,
    SalesInvoicePageConfig
}
from '../sales-invoice.config';


//===============================================================
// List Row (adds display values)
//===============================================================

type SalesInvoiceRow =
    SalesInvoiceListItem
    &
    {
        // dd-MM-yyyy
        InvoiceDateText:
            string;

        // "Display Name" (the phone is in it)
        CustomerText:
            string;

        // Walk-in tag on the customer cell
        IsWalkIn:
            boolean;

        CustomerTitle:
            string;

        LineCountText:
            string;

        InvoiceTotalText:
            string;

        PaidText:
            string;

        DueText:
            string;
    };


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'sales-invoice-list',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        ControlTabsComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        PageCanvasComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./sales-invoice-list.html',

    styleUrl:'./sales-invoice-list.css'
})

//===============================================================
// Sales Invoices List (shared by SP / AC / MB : the page's
// config and service come from its own list file)
//
// No toasts : every message shows inline in the toolbar.
//===============================================================

export class SalesInvoiceList
implements OnInit
{
    //===========================================================
    // This page (SP / AC / MB)
    //===========================================================

    readonly page:
        SalesInvoicePageConfig =
        inject(SALES_INVOICE_PAGE);

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly salesInvoiceService =
        inject(SalesInvoiceService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly router =
        inject(Router);

    private readonly route =
        inject(ActivatedRoute);

    private readonly cdr =
        inject(ChangeDetectorRef);

    // Requests stop when the page is left
    private readonly destroyRef =
        inject(DestroyRef);

    // Progress dialog around Delete / Restore
    private readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges()
        );

    //===========================================================
    // Page Tabs
    //===========================================================

    tabs:
        ControlTab[] =
    [
        {
            id:'all',
            label:'All'
        },
        {
            id:'Draft',
            label:'Draft'
        },
        {
            id:'Approved',
            label:'Approved'
        },
        {
            id:'Posted',
            label:'Posted'
        },
        {
            id:'Cancelled',
            label:'Cancelled'
        }
    ];

    selectedTab:
        string =
        'all';

    //===========================================================
    // Data
    //===========================================================

    invoices:
        SalesInvoiceRow[] =
    [];

    filteredInvoices:
        SalesInvoiceRow[] =
    [];

    pagedInvoices:
        SalesInvoiceRow[] =
    [];

    //===========================================================
    // Search, Loading, Notice
    //===========================================================

    searchText:
        string =
        '';

    loading:
        boolean =
        false;

    loadFailed:
        boolean =
        false;

    notice:
        string =
        '';

    noticeTone:
        SalesInvoiceNoticeTone =
        'ok';

    // Invoice the notice is about (Print / Receipt links)
    noticePrintId:
        number =
        0;

    //===========================================================
    // Pagination
    //===========================================================

    currentPage:
        number =
        1;

    pageSize:
        number =
        10;

    //===========================================================
    // History
    //===========================================================

    historyOpened:
        boolean =
        false;

    historyTitle:
        string =
        'Sales Invoice History';

    historyItems:
        any[] =
    [];

    //===========================================================
    // Page Canvas Configuration
    //===========================================================

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

    //===========================================================
    // Table Columns
    //===========================================================

    readonly columns:
        ListTableColumn[] =
    [
        {
            header:'#',
            field:'serial',
            type:'serial',
            width:'50px',
            align:'center'
        },
        {
            header:'Invoice No',
            field:'InvoiceNo',
            width:'200px',
            align:'center'
        },
        {
            header:'Date',
            field:'InvoiceDateText',
            width:'105px',
            align:'center'
        },
        {
            header:'Customer',
            field:'CustomerText',
            width:'260px',
            align:'left',
            flagField:'IsWalkIn',
            flagText:'Walk-in',
            flagTitleField:'CustomerTitle'
        },
        {
            header:'Items',
            field:'LineCountText',
            width:'70px',
            align:'center'
        },
        {
            header:'Invoice Total',
            field:'InvoiceTotalText',
            width:'130px',
            align:'right'
        },
        {
            header:'Paid',
            field:'PaidText',
            width:'120px',
            align:'right'
        },
        {
            header:'Due',
            field:'DueText',
            width:'120px',
            align:'right'
        },
        {
            header:'Status',
            field:'Status',
            type:'status',
            width:'140px',
            align:'center'
        },
        {
            header:'Actions',
            field:'actions',
            type:'actions',
            width:'110px',
            align:'center'
        }
    ];

    // Print (A4) on rows that print : Approved / Posted / Cancelled
    readonly rowActions:
        ListTableRowAction[] =
    [
        {
            key:'print',
            icon:'fas fa-print',
            title:'Print Sales Invoice',
            tone:'primary',
            visible:
                (row: SalesInvoiceRow) =>
                    row.Status !== 'Draft'
        }
    ];

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.readNotice();

        this.loadItems();
    }

    //===========================================================
    // Notice left by the form (router state)
    //===========================================================

    private readNotice():
        void
    {
        const state =
            (typeof history !== 'undefined' ? history.state : null) as Partial<SalesInvoiceListNotice> | null;

        const text =
            String(state?.siNotice ?? '').trim();

        if
        (
            text
        )
        {
            this.noticePrintId =
                Number(state?.siPrintId ?? 0) || 0;

            this.setNotice(
                text,
                state?.siTone ?? 'ok'
            );

            // Shown once : a reload of the list does not repeat it
            try
            {
                history.replaceState(
                    {
                        ...history.state,
                        siNotice:undefined,
                        siTone:undefined,
                        siPrintId:undefined
                    },
                    ''
                );
            }
            catch
            {
                // Not important
            }
        }
    }

    private setNotice
    (
        text:
            string,
        tone:
            SalesInvoiceNoticeTone
    ):
        void
    {
        if
        (
            text !== this.notice
            &&
            this.notice
        )
        {
            // A new message : the old print links go
            this.noticePrintId =
                0;
        }

        this.notice =
            text;

        this.noticeTone =
            tone;

        this.cdr.detectChanges();
    }

    clearNotice():
        void
    {
        this.notice =
            '';

        this.noticePrintId =
            0;

        this.cdr.detectChanges();
    }

    get noticeIcon():
        string
    {
        switch
        (
            this.noticeTone
        )
        {
            case 'error':
                return 'fas fa-circle-exclamation';

            case 'warn':
                return 'fas fa-triangle-exclamation';

            default:
                return 'fa-regular fa-circle-check';
        }
    }

    //===========================================================
    // Helpers
    //===========================================================

    money
    (
        value:
            number
    ):
        string
    {
        return formatMoney(value);
    }

    get dueTotal():
        number
    {
        return roundMoney(
            this.filteredInvoices
                .filter(item => item.Status === 'Posted')
                .reduce((sum, item) => sum + (item.DueAmount || 0), 0)
        );
    }

    private extractErrorMessage
    (
        error:
            unknown,
        fallback:
            string
    ):
        string
    {
        if
        (
            error instanceof HttpErrorResponse
        )
        {
            if
            (
                typeof error.error === 'string'
                &&
                error.error.trim()
            )
            {
                return error.error.trim();
            }

            if
            (
                error.error?.message
            )
            {
                return error.error.message;
            }

            if
            (
                error.error?.title
            )
            {
                return error.error.title;
            }
        }

        return fallback;
    }

    // yyyy-MM-dd -> dd-MM-yyyy
    private toDisplayDate
    (
        value:
            string
    ):
        string
    {
        const parts =
            (value ?? '').substring(0, 10).split('-');

        return parts.length === 3
            ? `${parts[2]}-${parts[1]}-${parts[0]}`
            : value ?? '';
    }

    //===========================================================
    // Load Items
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        this.cdr.detectChanges();

        this.salesInvoiceService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    response:
                        SalesInvoiceListItem[]
                ):
                    void =>
                {
                    this.invoices =
                        (response ?? []).map
                        (
                            item =>
                            ({
                                ...item,

                                InvoiceDateText:
                                    this.toDisplayDate(
                                        item.InvoiceDate
                                    ),

                                CustomerText:
                                    item.CustomerName
                                    ||
                                    [item.CustomerCode, item.CustomerPhone].filter(x => !!x).join(' - ')
                                    ||
                                    '-',

                                IsWalkIn:
                                    item.CustomerTag === 'Walk-in',

                                CustomerTitle:
                                    [item.CustomerCode, item.CustomerTag].filter(x => !!x).join(' · '),

                                LineCountText:
                                    String(item.LineCount || 0),

                                InvoiceTotalText:
                                    formatMoney(item.InvoiceTotal),

                                PaidText:
                                    item.PaidAmount > 0
                                        ? formatMoney(item.PaidAmount)
                                        : '-',

                                DueText:
                                    item.DueAmount > 0
                                        ? formatMoney(item.DueAmount)
                                        : '-'
                            })
                        );

                    this.applyFilters();

                    this.loading =
                        false;

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Sales Invoices Error:',
                        error
                    );

                    this.invoices =
                        [];

                    this.filteredInvoices =
                        [];

                    this.pagedInvoices =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.setNotice(
                        this.extractErrorMessage(error, 'Unable to load the sales invoices.'),
                        'error'
                    );
                }
            });
    }

    //===========================================================
    // Filters
    //===========================================================

    applyFilters():
        void
    {
        const keyword =
            this.searchText
                .trim()
                .toLowerCase();

        this.filteredInvoices =
            this.invoices.filter
            (
                item =>
                {
                    const tabMatch =
                        this.selectedTab === 'all'
                        ||
                        item.Status === this.selectedTab;

                    if
                    (
                        !tabMatch
                    )
                    {
                        return false;
                    }

                    if
                    (
                        !keyword
                    )
                    {
                        return true;
                    }

                    const text =
                        [
                            item.InvoiceNo,
                            item.InvoiceDate,
                            item.InvoiceDateText,
                            item.CustomerName,
                            item.CustomerCode,
                            item.CustomerPhone,
                            item.CustomerTag,
                            item.WarehouseName,
                            item.InvoiceTotalText,
                            item.Status
                        ]
                        .join(' ')
                        .toLowerCase();

                    return text.includes(keyword);
                }
            );

        this.currentPage =
            1;

        this.updatePagination();
    }

    onTabChange
    (
        value:
            string
    ):
        void
    {
        this.selectedTab =
            value;

        this.applyFilters();

        this.cdr.detectChanges();
    }

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText =
            value
            ??
            '';

        this.applyFilters();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Sort
    //===========================================================

    onSort
    (
        event:
        {
            field:
                string;
            direction:
                'asc' | 'desc';
        }
    ):
        void
    {
        const direction =
            event.direction === 'asc'
                ? 1
                : -1;

        // Display columns sort on their raw values
        const rawFields:
            Record<string, string> =
        {
            InvoiceDateText:'InvoiceDate',
            CustomerText:'CustomerName',
            LineCountText:'LineCount',
            InvoiceTotalText:'InvoiceTotal',
            PaidText:'PaidAmount',
            DueText:'DueAmount'
        };

        const field =
            rawFields[event.field]
            ??
            event.field;

        this.filteredInvoices =
        [
            ...this.filteredInvoices
        ]
        .sort
        (
            (a: any, b: any): number =>
            {
                const valueA =
                    a[field];

                const valueB =
                    b[field];

                if
                (
                    valueA == null
                    &&
                    valueB == null
                )
                {
                    return 0;
                }

                if
                (
                    valueA == null
                )
                {
                    return -1 * direction;
                }

                if
                (
                    valueB == null
                )
                {
                    return 1 * direction;
                }

                if
                (
                    typeof valueA === 'string'
                    &&
                    typeof valueB === 'string'
                )
                {
                    return valueA.localeCompare(valueB) * direction;
                }

                return (valueA < valueB ? -1 : valueA > valueB ? 1 : 0) * direction;
            }
        );

        this.currentPage =
            1;

        this.updatePagination();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Refresh
    //===========================================================

    refresh():
        void
    {
        this.searchText =
            '';

        this.selectedTab =
            'all';

        this.currentPage =
            1;

        this.notice =
            '';

        this.loadItems();
    }

    //===========================================================
    // Pagination
    //===========================================================

    updatePagination():
        void
    {
        const start:
            number =
            (this.currentPage - 1) * this.pageSize;

        this.pagedInvoices =
        [
            ...this.filteredInvoices.slice
            (
                start,
                start + this.pageSize
            )
        ];
    }

    onPageChange
    (
        page:
            number
    ):
        void
    {
        this.currentPage =
            page;

        this.updatePagination();

        this.cdr.detectChanges();
    }

    onPageSizeChange
    (
        size:
            number
    ):
        void
    {
        this.pageSize =
            size;

        this.currentPage =
            1;

        this.updatePagination();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Add / View / Edit
    //===========================================================

    add():
        void
    {
        void this.router.navigate(
            ['add'],
            { relativeTo:this.route.parent }
        );
    }

    view
    (
        item:
            SalesInvoiceRow
    ):
        void
    {
        void this.router.navigate(
            ['view', item.SalesInvoiceId],
            { relativeTo:this.route.parent }
        );
    }

    // Only drafts can be changed; others open in View
    edit
    (
        item:
            SalesInvoiceRow
    ):
        void
    {
        void this.router.navigate(
            [item.Status === 'Draft' ? 'edit' : 'view', item.SalesInvoiceId],
            { relativeTo:this.route.parent }
        );
    }

    //===========================================================
    // Row actions : Print (A4)
    //===========================================================

    onRowAction
    (
        event:
            ListTableRowActionEvent
    ):
        void
    {
        if
        (
            event.key !== 'print'
        )
        {
            return;
        }

        const row =
            event.row as SalesInvoiceRow;

        this.openPrint(
            row.SalesInvoiceId,
            this.page.a4DocKey
        );
    }

    // /print-viewer/<page print key>/<id>?doc=<document key>
    openPrint
    (
        id:
            number,
        docKey:
            string
    ):
        void
    {
        if
        (
            !(id > 0)
        )
        {
            return;
        }

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', this.page.printKey, id],
                    { queryParams:{ doc:docKey } }
                )
            );

        // Not "noopener" : the new tab keeps this session's login
        const tab =
            window.open(
                url,
                '_blank'
            );

        if
        (
            !tab
        )
        {
            this.setNotice(
                'The print tab was blocked by the browser. Allow pop-ups for this site and try again.',
                'warn'
            );
        }
    }

    //===========================================================
    // Delete (drafts only)
    //===========================================================

    delete
    (
        item:
            SalesInvoiceRow
    ):
        void
    {
        if
        (
            this.progress.busy
        )
        {
            return;
        }

        if
        (
            item.Status !== 'Draft'
        )
        {
            this.setNotice(
                `${item.InvoiceNo} is ${item.Status}. Only a draft can be deleted; an approved or posted invoice is cancelled from its page.`,
                'warn'
            );

            return;
        }

        this.confirmDialog.open(
            'Delete Sales Invoice',
            `Are you sure you want to delete draft "${item.InvoiceNo}"?`,
            ():
                void =>
            {
                // Next tick : let the confirm dialog close first
                setTimeout(
                    () =>
                        this.deleteItem(
                            item
                        )
                );
            }
        );
    }

    private deleteItem
    (
        item:
            SalesInvoiceRow
    ):
        void
    {
        this.progress
            .run(
                'Deleting Sales Invoice',
                `Please wait while "${item.InvoiceNo}" is being deleted...`,
                'Sales invoice deleted.',
                this.salesInvoiceService.delete(item.SalesInvoiceId)
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.setNotice(
                        `${item.InvoiceNo} deleted. Restore brings back the latest deleted draft.`,
                        'ok'
                    );

                    this.loadItems();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Delete Sales Invoice Error:',
                        error
                    );

                    this.setNotice(
                        this.extractErrorMessage(error, 'Failed to delete the sales invoice.'),
                        'error'
                    );
                }
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

        this.confirmDialog.open(
            'Restore Sales Invoice',
            'Are you sure you want to restore the most recently deleted draft sales invoice?',
            ():
                void =>
            {
                setTimeout(
                    () =>
                        this.restoreItem()
                );
            },
            'Restore',
            'Cancel',
            'primary'
        );
    }

    private restoreItem():
        void
    {
        this.progress
            .run(
                'Restoring Sales Invoice',
                'Please wait while the most recently deleted draft is being restored...',
                'Sales invoice restored.',
                this.salesInvoiceService.restore()
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.setNotice(
                        'The most recently deleted draft has been restored.',
                        'ok'
                    );

                    this.loadItems();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Restore Sales Invoice Error:',
                        error
                    );

                    const nothing =
                        error instanceof HttpErrorResponse
                        &&
                        error.status === 404;

                    this.setNotice(
                        nothing
                            ? 'There are no deleted sales invoices available to restore.'
                            : this.extractErrorMessage(error, 'Failed to restore the sales invoice.'),
                        nothing ? 'warn' : 'error'
                    );
                }
            });
    }

    //===========================================================
    // History
    //===========================================================

    openHistory():
        void
    {
        this.salesInvoiceService
            .getHistory()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ):
                    void =>
                {
                    this.historyItems =
                        (Array.isArray(response) ? response : []).map
                        (
                            history =>
                            ({
                                title:
                                    history.ActivityTitle
                                    ??
                                    history.activityTitle,

                                description:
                                    history.ActivityDescription
                                    ??
                                    history.activityDescription,

                                user:
                                    history.PerformedByName
                                    ??
                                    history.performedByName
                                    ??
                                    'System',

                                dateTime:
                                    new Date(
                                        history.PerformedDate
                                        ??
                                        history.performedDate
                                    )
                                    .toLocaleString(),

                                badge:
                                    history.ActivityType
                                    ??
                                    history.activityType
                            })
                        );

                    this.historyTitle =
                        'Sales Invoice History';

                    this.historyOpened =
                        true;

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'History Load Failed:',
                        error
                    );

                    this.setNotice(
                        'Failed to load the sales invoice history.',
                        'error'
                    );
                }
            });
    }

    closeHistory():
        void
    {
        this.historyOpened =
            false;

        this.cdr.detectChanges();
    }
}
