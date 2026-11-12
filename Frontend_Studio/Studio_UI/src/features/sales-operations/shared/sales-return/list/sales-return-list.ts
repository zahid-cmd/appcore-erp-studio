//===============================================================
// Sales Returns - MB / SP / AC : list (shared; each page gives its
// config with salesReturnProviders)
//
// Status filter (All / Draft / Approved / Posted / Cancelled).
// Row actions : Edit (draft), Approve (draft), Return to Draft /
// Post (approved), Print, Cancel (reason; draft / approved),
// Delete (draft), History. Add opens the form : find the invoice
// first, then the quantities.
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
    SALES_RETURN_PAGE
}
from '../sales-return.config';

import
{
    SalesReturnListItem
}
from '../sales-return.model';

import
{
    SalesReturnService
}
from '../sales-return.service';

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

type ReturnRow =
    SalesReturnListItem
    &
    {
        DateText:string;
        InvoiceText:string;
        TotalText:string;
        QtyText:string;
    };

const MONTHS =
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


@Component(
{
    selector:'sales-return-list',

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

    templateUrl:'./sales-return-list.html',

    styleUrl:'./sales-return-list.css'
})

export class SalesReturnList
    implements OnInit
{
    readonly page =
        inject(SALES_RETURN_PAGE);

    private readonly service =
        inject(SalesReturnService);

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

    rows: ReturnRow[] = [];

    filteredRows: ReturnRow[] = [];

    pagedRows: ReturnRow[] = [];

    searchText = '';

    statusFilter = 'all';

    currentPage = 1;

    pageSize = 10;

    // Status tabs (as Sales Invoices)
    readonly tabs: ControlTab[] =
    [
        { id:'all', label:'All' },
        { id:'Draft', label:'Draft' },
        { id:'Approved', label:'Approved' },
        { id:'Posted', label:'Posted' },
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
        { header:'Return No', field:'ReturnNo', width:'200px', align:'left', sortable:true },
        { header:'Date', field:'DateText', width:'100px', align:'center', sortable:true },
        { header:'Invoice', field:'InvoiceText', width:'200px', align:'left', sortable:true },
        { header:'Customer', field:'CustomerName', width:'190px', align:'left', sortable:true },
        { header:this.page.pageType === 'MB' ? 'Bikes' : 'Items', field:'ItemsText', width:'240px', align:'left', sortable:true, priority:2 },
        { header:'Qty', field:'QtyText', width:'60px', align:'right', sortable:true, priority:3 },
        { header:'Credit (Tk)', field:'TotalText', width:'115px', align:'right', sortable:true },
        { header:'Status', field:'Status', type:'status', width:'105px', align:'center', sortable:true },
        { header:'Actions', field:'actions', type:'actions', width:'220px', align:'center' }
    ];

    readonly rowActions: ListTableRowAction[] =
    [
        { key:'edit', icon:'fas fa-pen', title:'Edit the return', tone:'primary', visible:(r: ReturnRow) => r.Status === 'Draft' },
        { key:'approve', icon:'fas fa-circle-check', title:'Approve', tone:'success', visible:(r: ReturnRow) => r.Status === 'Draft' },
        { key:'draft', icon:'fas fa-rotate-left', title:'Return to draft', tone:'default', visible:(r: ReturnRow) => r.Status === 'Approved' },
        { key:'post', icon:'fas fa-paper-plane', title:'Post (credit the customer, stock back)', tone:'success', visible:(r: ReturnRow) => r.Status === 'Approved' },
        { key:'print', icon:'fas fa-print', title:'Print the credit note', tone:'default' },
        { key:'cancel', icon:'fas fa-ban', title:'Cancel the return', tone:'danger', visible:(r: ReturnRow) => r.Status === 'Draft' || r.Status === 'Approved' },
        { key:'delete', icon:'fa-regular fa-trash-can', title:'Delete the draft', tone:'danger', visible:(r: ReturnRow) => r.Status === 'Draft' },
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
        // Notice from the form (saved / posted)
        const state = history.state ?? {};

        if (state.srNotice)
        {
            setTimeout(() => this.toast.success(this.page.title, String(state.srNotice)));
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
            .getAll(this.page.apiPath)
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
                                    DateText:this.dateText(x.ReturnDate),
                                    InvoiceText:`${x.SalesInvoiceNo} (${this.dateText(x.SalesInvoiceDate)})`,
                                    TotalText:formatMoney(x.ReturnTotal),
                                    QtyText:String(Math.round(x.TotalQuantity * 100) / 100)
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

                        this.toast.error('Load Failed', this.errorText(error, 'The returns could not be loaded.'));
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
        return this.rows.filter(x => x.Status === status).length;
    }

    get postedTotal(): number
    {
        return this.rows
            .filter(x => x.Status === 'Posted')
            .reduce((sum, x) => sum + x.ReturnTotal, 0);
    }

    private applyFilters(): void
    {
        const text = this.searchText.trim().toLowerCase();

        this.filteredRows =
            this.rows
                .filter(x => this.statusFilter === 'all' || x.Status === this.statusFilter)
                .filter
                (
                    x =>
                        !text
                        ||
                        [x.ReturnNo, x.SalesInvoiceNo, x.CustomerName, x.CustomerPhone, x.ItemsText, x.Reason]
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
            DateText:'ReturnDate',
            TotalText:'ReturnTotal',
            QtyText:'TotalQuantity',
            InvoiceText:'SalesInvoiceNo'
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
        const row = event.row as ReturnRow;

        switch (event.key)
        {
            case 'edit':
                void this.router.navigate(['edit', row.PublicId], { relativeTo:this.parent });
                break;

            case 'approve':
                this.step(row, 'approve');
                break;

            case 'draft':
                this.step(row, 'draft');
                break;

            case 'post':
                this.step(row, 'post');
                break;

            case 'print':
                this.print(row);
                break;

            case 'cancel':
                this.openCancel(row);
                break;

            case 'delete':
                this.step(row, 'delete');
                break;

            case 'history':
                this.showHistory(row);
                break;
        }
    }

    private print(row: ReturnRow): void
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

    // Approve / Return to Draft / Post / Delete (confirmed)
    private step(row: ReturnRow, action: 'approve' | 'draft' | 'post' | 'delete'): void
    {
        const credit = `Tk ${formatMoney(row.ReturnTotal)}`;

        const steps =
        {
            approve:
            {
                title:'Approve Return',
                message:`Approve ${row.ReturnNo} (${row.CustomerName}, ${credit})?`,
                ok:'Approve',
                tone:'primary',
                busy:'Approving Return',
                done:'Return approved.',
                call:() => this.service.approve(this.page.apiPath, row.PublicId)
            },
            draft:
            {
                title:'Return to Draft',
                message:`Send ${row.ReturnNo} back to draft?`,
                ok:'Return to Draft',
                tone:'primary',
                busy:'Returning to Draft',
                done:'Return sent back to draft.',
                call:() => this.service.returnToDraft(this.page.apiPath, row.PublicId)
            },
            post:
            {
                title:'Post Return',
                message:`Post ${row.ReturnNo}? ${credit} is credited to ${row.CustomerName}'s ledger and the goods go back to stock. A posted return is final.`,
                ok:'Post',
                tone:'primary',
                busy:'Posting Return',
                done:'Return posted.',
                call:() => this.service.post(this.page.apiPath, row.PublicId)
            },
            delete:
            {
                title:'Delete Return',
                message:`Delete the draft ${row.ReturnNo} (${row.CustomerName}, ${credit})?`,
                ok:'Delete',
                tone:'danger',
                busy:'Deleting Return',
                done:'Return deleted.',
                call:() => this.service.remove(this.page.apiPath, row.PublicId)
            }
        }[action];

        this.confirm.open(
            steps.title,
            steps.message,
            () =>
            {
                setTimeout(
                    () =>
                        this.progress
                            .run<any>(
                                steps.busy,
                                `Please wait while ${row.ReturnNo} is processed...`,
                                steps.done,
                                steps.call() as any)
                            .subscribe
                            ({
                                next:
                                    () =>
                                    {
                                        this.toast.success(steps.title, `${row.ReturnNo} : ${steps.done}`);

                                        this.load();
                                    },
                                error:
                                    error =>
                                        this.toast.error(`${steps.title} Failed`, this.errorText(error, 'The return could not be processed.'))
                            }));
            },
            steps.ok,
            'Close',
            steps.tone as any
        );
    }


    //===========================================================
    // Cancel (reason)
    //===========================================================

    cancelRow: ReturnRow | null = null;

    cancelReason = '';

    cancelError = '';

    private openCancel(row: ReturnRow): void
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
                'Cancelling Return',
                `Please wait while ${row.ReturnNo} is cancelled...`,
                'Return cancelled.',
                this.service.cancel(this.page.apiPath, row.PublicId, reason))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.cancelRow = null;

                        this.toast.success('Return Cancelled', `${row.ReturnNo} cancelled.`);

                        this.load();
                    },
                error:
                    error =>
                    {
                        this.cancelError = this.errorText(error, 'The return could not be cancelled.');
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

    private showHistory(row: ReturnRow): void
    {
        this.service
            .getHistory(this.page.apiPath, row.SalesReturnId)
            .subscribe
            ({
                next:
                    (response: any[]) =>
                    {
                        this.historyTitle = `${row.ReturnNo} · History`;

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
                    () => this.toast.error('History', 'The return history could not be loaded.')
            });
    }

    closeHistory(): void
    {
        this.historyOpened = false;

        this.cdr.detectChanges();
    }
}
