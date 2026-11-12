//===============================================================
// Sales Quotations - MB / SP / AC : list (shared; each page gives
// its config with salesInvoiceProviders, as the invoice pages)
//
// Status filter (All / Open / Expired / Converted / Cancelled).
// Row actions : Edit, Convert to Invoice, Print, Cancel (reason),
// Delete (open, no invoice made from it), History. Add / View /
// Edit open the Sales Invoice page in quotation mode.
//===============================================================


//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    OnInit,
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
    HttpErrorResponse
}
from '@angular/common/http';

import
{
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    SALES_INVOICE_PAGE
}
from '../sales-invoice.config';

import
{
    SalesQuotationListItem
}
from '../sales-invoice.model';

import
{
    SalesQuotationService
}
from '../sales-quotation.service';

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
    ConfirmDialogComponent
}
from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ConfirmDialogService
}
from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

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

import
{
    ToastService
}
from '../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../shared/components/utilities/toast/toast';

import
{
    TextboxComponent
}
from '../../../../../shared/components/controls/textbox/textbox';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    formatMoney
}
from '../../../../../shared/components/accounting/accounting.models';


//===============================================================
// Row with display texts
//===============================================================

type QuotationRow =
    SalesQuotationListItem
    &
    {
        DateText:string;
        ValidText:string;
        TotalText:string;
        StatusText:string;
        CustomerText:string;
        InvoiceText:string;
    };

const MONTHS =
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


@Component(
{
    selector:'sales-quotation-list',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        ToastComponent,
        TextboxComponent,
        ControlTabsComponent
    ],

    templateUrl:'./sales-quotation-list.html',

    styleUrl:'./sales-quotation-list.css'
})

export class SalesQuotationList
    implements OnInit
{
    readonly page =
        inject(SALES_INVOICE_PAGE);

    private readonly service =
        inject(SalesQuotationService);

    private readonly router =
        inject(Router);

    private readonly route =
        inject(ActivatedRoute);

    private readonly toast =
        inject(ToastService);

    private readonly confirm =
        inject(ConfirmDialogService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges()
        );


    loading = false;

    loadFailed = false;

    rows: QuotationRow[] = [];

    filteredRows: QuotationRow[] = [];

    pagedRows: QuotationRow[] = [];

    searchText = '';

    statusFilter = 'all';

    currentPage = 1;

    pageSize = 10;

    // Status tabs (as Sales Invoices)
    readonly tabs: ControlTab[] =
    [
        { id:'all', label:'All' },
        { id:'Open', label:'Open' },
        { id:'Expired', label:'Expired' },
        { id:'Converted', label:'Converted' },
        { id:'Cancelled', label:'Cancelled' }
    ];

    readonly canvasConfig: PageCanvasConfig =
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

    readonly columns: ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'45px', align:'center' },
        { header:'Quotation No', field:'QuotationNo', width:'200px', align:'left', sortable:true },
        { header:'Date', field:'DateText', width:'100px', align:'center', sortable:true },
        { header:'Customer', field:'CustomerText', width:'200px', align:'left', sortable:true },
        { header:'Phone', field:'CustomerPhone', width:'115px', align:'left', sortable:true, priority:3 },
        { header:this.page.pageType === 'MB' ? 'Models' : 'Items', field:'ItemsText', width:'240px', align:'left', sortable:true, priority:2 },
        { header:'Total', field:'TotalText', width:'110px', align:'right', sortable:true },
        { header:'Valid Until', field:'ValidText', width:'100px', align:'center', sortable:true, priority:2 },
        { header:'Invoice', field:'InvoiceText', width:'180px', align:'left', sortable:true, priority:2 },
        { header:'Status', field:'StatusText', type:'status', width:'110px', align:'center', sortable:true },
        { header:'Actions', field:'actions', type:'actions', width:'190px', align:'center' }
    ];

    private open(r: QuotationRow): boolean
    {
        return r.Status === 'Open' && !r.HeldByInvoiceNo;
    }

    readonly rowActions: ListTableRowAction[] =
    [
        { key:'edit', icon:'fas fa-pen', title:'Edit the quotation', tone:'primary', visible:(r: QuotationRow) => this.open(r) },
        { key:'convert', icon:'fas fa-file-invoice', title:'Convert to Sales Invoice', tone:'success', visible:(r: QuotationRow) => this.open(r) },
        { key:'print', icon:'fas fa-print', title:'Print the quotation', tone:'default' },
        { key:'cancel', icon:'fas fa-ban', title:'Cancel the quotation', tone:'danger', visible:(r: QuotationRow) => this.open(r) },
        { key:'delete', icon:'fa-regular fa-trash-can', title:'Delete the quotation', tone:'danger', visible:(r: QuotationRow) => this.open(r) },
        { key:'history', icon:'fas fa-clock-rotate-left', title:'History', tone:'default' }
    ];

    readonly tableActions =
        { view:true, edit:false, delete:false };


    //===========================================================
    // Helpers
    //===========================================================

    money(value: number): string
    {
        return formatMoney(Number(value) || 0);
    }

    private dateText(value: string): string
    {
        if (!/^\d{4}-\d{2}-\d{2}/.test(value || ''))
        {
            return value ? value : '-';
        }

        return `${value.substring(8, 10)}-${MONTHS[Number(value.substring(5, 7)) - 1]}-${value.substring(0, 4)}`;
    }

    private errorText(error: unknown, fallback: string): string
    {
        const e = error as HttpErrorResponse;

        return e?.error?.message
            || (typeof e?.error === 'string' ? e.error : '')
            || fallback;
    }

    private get parent(): ActivatedRoute
    {
        return this.route.parent ?? this.route;
    }


    //===========================================================
    // Load
    //===========================================================

    ngOnInit(): void
    {
        // Notice from the form (saved / updated)
        const state = history.state ?? {};

        if (state.siNotice)
        {
            setTimeout(() => this.toast.success(this.page.title, String(state.siNotice)));
        }

        this.load();
    }

    refresh(): void
    {
        this.load();
    }

    private load(): void
    {
        this.loading = true;

        this.loadFailed = false;

        this.cdr.detectChanges();

        this.service
            .getAll(this.page.quotationApiPath)
            .subscribe
            ({
                next:
                    rows =>
                    {
                        this.loading = false;

                        this.rows =
                            rows.map
                            (
                                x =>
                                ({
                                    ...x,
                                    DateText:this.dateText(x.QuotationDate),
                                    ValidText:x.ValidUntil ? this.dateText(x.ValidUntil) : '-',
                                    TotalText:formatMoney(x.QuotationTotal),
                                    StatusText:x.Status === 'Open' ? (x.IsExpired ? 'Expired' : 'Open') : x.Status,
                                    CustomerText:x.IsProspect ? `${x.CustomerName} (prospect)` : x.CustomerName,
                                    InvoiceText:x.SalesInvoiceNo || (x.HeldByInvoiceNo ? `${x.HeldByInvoiceNo} (draft)` : '-')
                                })
                            );

                        this.applyFilters();
                    },
                error:
                    error =>
                    {
                        this.loading = false;

                        this.loadFailed = true;

                        this.applyFilters();

                        this.toast.error('Load Failed', this.errorText(error, 'The quotations could not be loaded.'));
                    }
            });
    }


    //===========================================================
    // Filters, paging, sort
    //===========================================================

    get totalRecords(): number
    {
        return this.filteredRows.length;
    }

    countOf(status: string): number
    {
        return this.rows.filter(x => x.StatusText === status).length;
    }

    get openTotal(): number
    {
        return this.rows
            .filter(x => x.Status === 'Open')
            .reduce((sum, x) => sum + x.QuotationTotal, 0);
    }

    private applyFilters(): void
    {
        const text = this.searchText.trim().toLowerCase();

        this.filteredRows =
            this.rows
                .filter(x => this.statusFilter === 'all' || x.StatusText === this.statusFilter)
                .filter
                (
                    x =>
                        !text
                        ||
                        [x.QuotationNo, x.CustomerName, x.CustomerPhone, x.ItemsText, x.SalesInvoiceNo, x.SalesPersonName]
                            .some(v => String(v ?? '').toLowerCase().includes(text))
                );

        const pages = Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        this.paginate();
    }

    private paginate(): void
    {
        const start = (this.currentPage - 1) * this.pageSize;

        this.pagedRows = this.filteredRows.slice(start, start + this.pageSize);

        this.cdr.detectChanges();
    }

    onSearch(text: string): void
    {
        this.searchText = text ?? '';
        this.currentPage = 1;
        this.applyFilters();
    }

    onTabChange(value: string): void
    {
        this.statusFilter = String(value || 'all');
        this.currentPage = 1;
        this.applyFilters();
    }

    onPageChange(page: number): void
    {
        this.currentPage = page;
        this.paginate();
    }

    onPageSizeChange(size: number): void
    {
        this.pageSize = size;
        this.currentPage = 1;
        this.paginate();
    }

    onSort(event: { field:string; direction:'asc' | 'desc' }): void
    {
        const raw: Record<string, string> =
        {
            DateText:'QuotationDate',
            ValidText:'ValidUntil',
            TotalText:'QuotationTotal'
        };

        const field = raw[event.field] ?? event.field;

        const direction = event.direction === 'asc' ? 1 : -1;

        this.filteredRows =
            [...this.filteredRows].sort
            (
                (a: any, b: any) =>
                    typeof a[field] === 'number' && typeof b[field] === 'number'
                        ? (a[field] - b[field]) * direction
                        : String(a[field] ?? '').localeCompare(String(b[field] ?? ''), undefined, { numeric:true }) * direction
            );

        this.paginate();
    }


    //===========================================================
    // Actions
    //===========================================================

    add(): void
    {
        void this.router.navigate(['add'], { relativeTo:this.parent });
    }

    view(row: any): void
    {
        void this.router.navigate(['view', row.PublicId], { relativeTo:this.parent });
    }

    onRowAction(event: ListTableRowActionEvent): void
    {
        const row = event.row as QuotationRow;

        switch (event.key)
        {
            case 'edit':
                void this.router.navigate(['edit', row.PublicId], { relativeTo:this.parent });
                break;

            case 'convert':
                void this.router.navigate(['/' + this.page.invoiceRoute, 'add'], { queryParams:{ quotation:row.PublicId } });
                break;

            case 'print':
                this.print(row);
                break;

            case 'cancel':
                this.openCancel(row);
                break;

            case 'delete':
                this.remove(row);
                break;

            case 'history':
                this.showHistory(row);
                break;
        }
    }

    private print(row: QuotationRow): void
    {
        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', this.page.printKey, row.PublicId],
                    { queryParams:{ doc:this.page.a4DocKey } }
                )
            );

        if (!window.open(url, '_blank'))
        {
            this.toast.error('Print', 'The print tab was blocked by the browser. Allow pop-ups for this site and try again.');
        }
    }

    private remove(row: QuotationRow): void
    {
        this.confirm.open(
            'Delete Quotation',
            `Delete ${row.QuotationNo} (${row.CustomerName}, Tk ${formatMoney(row.QuotationTotal)})?`,
            () =>
            {
                setTimeout(
                    () =>
                        this.progress
                            .run<any>(
                                'Deleting Quotation',
                                `Please wait while ${row.QuotationNo} is deleted...`,
                                'Quotation deleted.',
                                this.service.remove(this.page.quotationApiPath, row.PublicId))
                            .subscribe
                            ({
                                next:
                                    () =>
                                    {
                                        this.toast.success('Quotation Deleted', `${row.QuotationNo} deleted.`);

                                        this.load();
                                    },
                                error:
                                    error =>
                                        this.toast.error('Delete Failed', this.errorText(error, 'The quotation could not be deleted.'))
                            }));
            },
            'Delete',
            'Keep',
            'danger'
        );
    }


    //===========================================================
    // Cancel (reason)
    //===========================================================

    cancelRow: QuotationRow | null = null;

    cancelReason = '';

    cancelError = '';

    private openCancel(row: QuotationRow): void
    {
        this.cancelRow = row;
        this.cancelReason = '';
        this.cancelError = '';
        this.cdr.detectChanges();
    }

    closeCancel(): void
    {
        this.cancelRow = null;
        this.cdr.detectChanges();
    }

    onCancelReason(value: string | number): void
    {
        this.cancelReason = String(value ?? '');
        this.cancelError = '';
    }

    confirmCancel(): void
    {
        const row = this.cancelRow;

        if (!row || this.progress.busy)
        {
            return;
        }

        const reason = this.cancelReason.replace(/\s+/g, ' ').trim();

        if (reason.length < 5)
        {
            this.cancelError = 'Reason is required : at least 5 characters.';
            this.cdr.detectChanges();

            return;
        }

        this.progress
            .run<any>(
                'Cancelling Quotation',
                `Please wait while ${row.QuotationNo} is cancelled...`,
                'Quotation cancelled.',
                this.service.cancel(this.page.quotationApiPath, row.PublicId, reason))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.cancelRow = null;

                        this.toast.success('Quotation Cancelled', `${row.QuotationNo} cancelled.`);

                        this.load();
                    },
                error:
                    error =>
                    {
                        this.cancelError = this.errorText(error, 'The quotation could not be cancelled.');
                        this.cdr.detectChanges();
                    }
            });
    }


    //===========================================================
    // History
    //===========================================================

    historyOpened = false;

    historyTitle = '';

    historyItems: any[] = [];

    private showHistory(row: QuotationRow): void
    {
        this.service
            .getHistory(this.page.quotationApiPath, row.SalesQuotationId)
            .subscribe
            ({
                next:
                    (response: any[]) =>
                    {
                        this.historyTitle = `${row.QuotationNo} · History`;

                        this.historyItems =
                            (response ?? []).map
                            (
                                h =>
                                ({
                                    title:h.activityTitle ?? h.ActivityTitle,
                                    description:h.activityDescription ?? h.ActivityDescription,
                                    user:h.performedByName ?? h.PerformedByName ?? 'System',
                                    dateTime:new Date(h.performedDate ?? h.PerformedDate).toLocaleString(),
                                    badge:h.activityType ?? h.ActivityType
                                })
                            );

                        this.historyOpened = true;

                        this.cdr.detectChanges();
                    },
                error:
                    () => this.toast.error('History', 'The quotation history could not be loaded.')
            });
    }

    closeHistory(): void
    {
        this.historyOpened = false;

        this.cdr.detectChanges();
    }
}
