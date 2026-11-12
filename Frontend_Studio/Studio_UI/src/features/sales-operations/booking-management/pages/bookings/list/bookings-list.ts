//===============================================================
// Bookings - MB / SP / AC (Sales Operations > Booking Management;
// one component for the three pages : route data bookingType;
// NO Code Synchronization)
//
// MB : customer + model and colour. SP / AC : customer + items
// with quantity (item search by name / code / part number).
//
// Three tabs :
//   Bookings                 the bookings (status filter : Open /
//                            Expired / Converted / Cancelled).
//                            New Booking : customer, model +
//                            colour, the first advance on the
//                            Payment Desk (one Receipt Voucher to
//                            the customer's own ledger).
//                            Row actions : Collect more, Edit,
//                            Cancel ("Cancel Booking"), History.
//   Collections              every advance collected (Receipt
//                            Voucher per row).
//   Cancellations & Refunds  the cancelled bookings : forfeit
//                            (Journal Voucher, income) and the
//                            amount left on the customer's ledger
//                            to refund by Payment Voucher.
// The Sales Invoice - MB takes an open booking : its advance is
// paid already; posting converts the booking.
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
    ActivatedRoute
}
from '@angular/router';

import
{
    Booking,
    BookingCollection,
    BookingCustomer,
    BookingLine,
    BookingModel,
    BookingProduct,
    BookingSwitches,
    BookingType
}
from '../../../models/bookings.model';

import
{
    BookingsService
}
from '../../../services/bookings.service';

import
{
    PaymentDeskComponent
}
from '../../../../../../shared/components/accounting/payment-desk/payment-desk';

import
{
    AccountingLookupService
}
from '../../../../../../shared/components/accounting/accounting-lookup.service';

import
{
    VoucherLedger,
    VoucherDebitLine,
    PaymentMode,
    VOUCHER_MODES,
    emptyDebitLine,
    needsDetails,
    isDebitRowReady,
    debitDetailIssue,
    roundMoney,
    formatMoney,
    parseMoney
}
from '../../../../../../shared/components/accounting/accounting.models';

import
{
    VoucherSwitchesService,
    VOUCHER_SWITCH,
    switchOn
}
from '../../../../../../shared/components/accounting/voucher-switches';

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
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

import
{
    TextboxComponent
}
from '../../../../../../shared/components/controls/textbox/textbox';

import
{
    DropdownComponent
}
from '../../../../../../shared/components/controls/dropdown/dropdown';

import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    DatepickerComponent
}
from '../../../../../../shared/components/controls/datepicker/datepicker';


//===============================================================
// Rows with display texts
//===============================================================

type BookingRow =
    Booking
    &
    {
        DateText:string;
        AdvanceText:string;
        ValidText:string;
        StatusText:string;
        InvoiceText:string;
        ForfeitText:string;
        RefundText:string;
        CancelledText:string;
    };

type CollectionRow =
    BookingCollection
    &
    {
        DateText:string;
        AmountText:string;
    };

type TabId =
    'bookings' | 'collections' | 'cancellations';

// Money ledger type of each Payment Desk mode
const MODE_LEDGER_TYPES:
    Record<string, string> =
{
    Cash:'Cash',
    Bank:'Bank',
    Check:'Bank',
    MFS:'MFS',
    POS:'POS',
    EMI:'EMI'
};

const MONTHS =
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'bookings-list',

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
        ProgressDialogComponent,
        ToastComponent,
        TextboxComponent,
        DropdownComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        PaymentDeskComponent
    ],

    templateUrl:'./bookings-list.html',

    styleUrl:'./bookings-list.css'
})

export class BookingsList
    implements OnInit
{
    private readonly service =
        inject(BookingsService);

    // MB / SP / AC (route data; one page each)
    readonly type: BookingType =
        ((((inject(ActivatedRoute).snapshot as any).data ?? {})['bookingType'] as BookingType) || 'MB');

    readonly isBikes =
        this.type === 'MB';

    readonly pageTitle =
        `Bookings - ${this.type}`;

    readonly pageSubtitle =
        this.type === 'MB'
            ? 'Motor bike bookings : advance, conversion to sale, cancellation'
            : this.type === 'SP'
                ? 'Spare parts / lubricant bookings : items, advance, conversion to sale, cancellation'
                : 'Accessories bookings : items, advance, conversion to sale, cancellation';

    // Column / field label of what is booked
    readonly itemLabel =
        this.isBikes ? 'Model' : 'Items';

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly lookup =
        inject(AccountingLookupService);

    private readonly voucherSwitches =
        inject(VoucherSwitchesService);

    readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges()
        );


    //===========================================================
    // Page data
    //===========================================================

    loading = false;

    loadFailed = false;

    today = '';

    branchId = 0;

    branchName = '';

    canCancel = false;

    switches: BookingSwitches =
        { MinimumAmount:null, ValidityDays:null, RefundOnCancel:true, ForfeitPercent:0 };

    bookingRows: BookingRow[] = [];

    collectionRows: CollectionRow[] = [];

    models: BookingModel[] = [];

    modelItems: { label:string; value:number }[] = [];

    branchItems: { label:string; value:number }[] = [{ label:'All Branches', value:0 }];

    branchFilter = 0;

    statusFilter = 'all';

    readonly statusItems =
    [
        { label:'All Bookings', value:'all' },
        { label:'Open', value:'Open' },
        { label:'Expired', value:'Expired' },
        { label:'Converted (sold)', value:'Converted' },
        { label:'Cancelled', value:'Cancelled' }
    ];

    tab: TabId = 'bookings';

    searchText = '';

    filteredRows: any[] = [];

    pagedRows: any[] = [];

    currentPage = 1;

    pageSize = 10;

    tabs: ControlTab[] =
    [
        { id:'bookings', label:'Bookings' },
        { id:'collections', label:'Collections' },
        { id:'cancellations', label:'Cancellations & Refunds' }
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

    private readonly bookingColumns: ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'45px', align:'center' },
        { header:'Booking No', field:'BookingNo', width:'200px', align:'left', sortable:true },
        { header:'Date', field:'DateText', width:'100px', align:'center', sortable:true },
        { header:'Customer', field:'CustomerName', width:'190px', align:'left', sortable:true },
        { header:'Phone', field:'CustomerPhone', width:'115px', align:'left', sortable:true, priority:3 },
        { header:this.itemLabel, field:'ModelName', width:'210px', align:'left', sortable:true },
        { header:'Advance', field:'AdvanceText', width:'105px', align:'right', sortable:true },
        { header:'Valid Until', field:'ValidText', width:'100px', align:'center', sortable:true, priority:2 },
        { header:'Invoice', field:'InvoiceText', width:'190px', align:'left', sortable:true, priority:2 },
        { header:'Status', field:'StatusText', type:'status', width:'110px', align:'center', sortable:true },
        { header:'Actions', field:'actions', type:'actions', width:'150px', align:'center' }
    ];

    private readonly collectionColumns: ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'45px', align:'center' },
        { header:'Date', field:'DateText', width:'100px', align:'center', sortable:true },
        { header:'Booking No', field:'BookingNo', width:'200px', align:'left', sortable:true },
        { header:'Customer', field:'CustomerName', width:'200px', align:'left', sortable:true },
        { header:this.itemLabel, field:'ModelName', width:'220px', align:'left', sortable:true },
        { header:'Amount', field:'AmountText', width:'110px', align:'right', sortable:true },
        { header:'Receipt Voucher', field:'ReceiptVoucherNo', width:'190px', align:'left', sortable:true },
        { header:'Remarks', field:'Remarks', width:'200px', align:'left', priority:3 }
    ];

    private readonly cancellationColumns: ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'45px', align:'center' },
        { header:'Booking No', field:'BookingNo', width:'200px', align:'left', sortable:true },
        { header:'Cancelled', field:'CancelledText', width:'100px', align:'center', sortable:true },
        { header:'Customer', field:'CustomerName', width:'190px', align:'left', sortable:true },
        { header:this.itemLabel, field:'ModelName', width:'190px', align:'left', sortable:true, priority:2 },
        { header:'Advance', field:'AdvanceText', width:'100px', align:'right', sortable:true },
        { header:'Forfeit', field:'ForfeitText', width:'100px', align:'right', sortable:true },
        { header:'To Refund', field:'RefundText', width:'100px', align:'right', sortable:true },
        { header:'Forfeit Voucher', field:'ForfeitVoucherNo', width:'180px', align:'left', priority:3 },
        { header:'Reason', field:'CancelReason', width:'220px', align:'left', priority:2 },
        { header:'Actions', field:'actions', type:'actions', width:'90px', align:'center' }
    ];

    get columns(): ListTableColumn[]
    {
        return this.tab === 'collections'
            ? this.collectionColumns
            : this.tab === 'cancellations'
                ? this.cancellationColumns
                : this.bookingColumns;
    }

    private readonly bookingActions: ListTableRowAction[] =
    [
        {
            key:'collect',
            icon:'fas fa-cash-register',
            title:'Collect more advance (Payment Desk)',
            tone:'success',
            visible:(r: BookingRow) => r.Status === 'Open' && !r.HeldByInvoiceNo
        },
        {
            key:'edit',
            icon:'fas fa-pen',
            title:'Edit the booking',
            tone:'primary',
            visible:(r: BookingRow) => r.Status === 'Open'
        },
        {
            key:'cancel',
            icon:'fas fa-ban',
            title:'Cancel the booking',
            tone:'danger',
            visible:(r: BookingRow) => r.Status === 'Open' && !r.HeldByInvoiceNo && this.canCancel
        },
        {
            key:'history',
            icon:'fas fa-clock-rotate-left',
            title:'History',
            tone:'default'
        }
    ];

    private readonly noActions: ListTableRowAction[] = [];

    private readonly cancellationActions: ListTableRowAction[] =
    [
        {
            key:'history',
            icon:'fas fa-clock-rotate-left',
            title:'History',
            tone:'default'
        }
    ];

    get rowActions(): ListTableRowAction[]
    {
        return this.tab === 'collections'
            ? this.noActions
            : this.tab === 'cancellations'
                ? this.cancellationActions
                : this.bookingActions;
    }

    readonly tableActions =
        { view:true, edit:false, delete:false };

    readonly noTableActions =
        { view:false, edit:false, delete:false };


    //===========================================================
    // Helpers
    //===========================================================

    money(value: number): string
    {
        return formatMoney(Number(value) || 0);
    }

    dateText(value: string): string
    {
        if (!/^\d{4}-\d{2}-\d{2}/.test(value || ''))
        {
            return value ? value : '-';
        }

        return `${value.substring(8, 10)}-${MONTHS[Number(value.substring(5, 7)) - 1]}-${value.substring(0, 4)}`;
    }

    private toDate(value: string): Date | null
    {
        if (!/^\d{4}-\d{2}-\d{2}/.test(value || ''))
        {
            return null;
        }

        return new Date(Number(value.substring(0, 4)), Number(value.substring(5, 7)) - 1, Number(value.substring(8, 10)));
    }

    private daysFromToday(days: number): Date
    {
        const base = this.toDate(this.today) ?? new Date();

        return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
    }

    get todayDate(): Date
    {
        return this.toDate(this.today) ?? new Date();
    }

    private isoDate(date: Date | null): string
    {
        if (!date || isNaN(date.getTime()))
        {
            return '';
        }

        const pad = (n: number) => String(n).padStart(2, '0');

        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    private errorText(error: unknown, fallback: string): string
    {
        const e = error as HttpErrorResponse;

        return e?.error?.message
            || (typeof e?.error === 'string' ? e.error : '')
            || fallback;
    }

    statusText(r: Booking): string
    {
        return r.Status === 'Open'
            ? (r.IsExpired ? 'Expired' : 'Open')
            : r.Status === 'Converted'
                ? 'Converted'
                : 'Cancelled';
    }


    //===========================================================
    // Load
    //===========================================================

    ngOnInit(): void
    {
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
            .getPage(this.type)
            .subscribe
            ({
                next:
                    page =>
                    {
                        this.loading = false;

                        this.today = page.Today;
                        this.branchId = page.BranchId;
                        this.branchName = page.BranchName;
                        this.canCancel = page.CanCancel;
                        this.switches = page.Switches;
                        this.models = page.Models;

                        this.modelItems =
                            page.Models.map(m => ({ label:m.ProductName, value:m.MotorBikeId }));

                        this.bookingRows =
                            page.Bookings.map
                            (
                                b =>
                                ({
                                    ...b,
                                    DateText:this.dateText(b.BookingDate),
                                    AdvanceText:formatMoney(b.AdvanceAmount),
                                    ValidText:b.ValidUntil ? this.dateText(b.ValidUntil) : '-',
                                    StatusText:this.statusText(b),
                                    InvoiceText:b.SalesInvoiceNo || (b.HeldByInvoiceNo ? `${b.HeldByInvoiceNo} (draft)` : '-'),
                                    ForfeitText:formatMoney(b.ForfeitAmount),
                                    RefundText:formatMoney(b.RefundAmount),
                                    CancelledText:this.dateText(b.CancelledDate)
                                })
                            );

                        this.collectionRows =
                            page.Collections.map
                            (
                                c =>
                                ({
                                    ...c,
                                    DateText:this.dateText(c.CollectionDate),
                                    AmountText:formatMoney(c.Amount)
                                })
                            );

                        const branches = new Map<number, string>();

                        this.bookingRows.forEach(x => branches.set(x.BranchId, x.BranchName || `Branch ${x.BranchId}`));

                        this.branchItems =
                        [
                            { label:'All Branches', value:0 },
                            ...Array.from(branches.entries())
                                .sort((a, b) => a[1].localeCompare(b[1]))
                                .map(([value, label]) => ({ label, value }))
                        ];

                        if (this.viewRow)
                        {
                            this.viewRow =
                                this.bookingRows.find(x => x.BookingId === this.viewRow!.BookingId) ?? null;
                        }

                        this.buildTabs();

                        this.applyFilters();
                    },

                error:
                    error =>
                    {
                        this.loading = false;

                        this.loadFailed = true;

                        this.applyFilters();

                        this.toast.error('Load Failed', this.errorText(error, 'The bookings could not be loaded.'));
                    }
            });
    }

    // Tab labels without counts (owner 2026-11-11)
    private buildTabs(): void
    {
        this.tabs =
        [
            { id:'bookings', label:'Bookings' },
            { id:'collections', label:'Collections' },
            { id:'cancellations', label:'Cancellations & Refunds' }
        ];
    }


    //===========================================================
    // Filters, paging, sort
    //===========================================================

    get totalRecords(): number
    {
        return this.filteredRows.length;
    }

    private applyFilters(): void
    {
        const text =
            this.searchText.trim().toLowerCase();

        const matches =
            (values: any[]) =>
                !text
                ||
                values.some(v => String(v ?? '').toLowerCase().includes(text));

        const branch =
            (id: number) =>
                !this.branchFilter || id === this.branchFilter;

        if (this.tab === 'collections')
        {
            this.filteredRows =
                this.collectionRows
                    .filter(x => branch(x.BranchId))
                    .filter(x => matches([x.BookingNo, x.CustomerName, x.ModelName, x.ReceiptVoucherNo, x.Remarks]));
        }
        else if (this.tab === 'cancellations')
        {
            this.filteredRows =
                this.bookingRows
                    .filter(x => x.Status === 'Cancelled' && branch(x.BranchId))
                    .filter(x => matches([x.BookingNo, x.CustomerName, x.CustomerPhone, x.ModelName, x.ForfeitVoucherNo, x.CancelReason]));
        }
        else
        {
            this.filteredRows =
                this.bookingRows
                    .filter(x => branch(x.BranchId))
                    .filter(x => this.statusFilter === 'all' || x.StatusText === this.statusFilter)
                    .filter(x => matches([x.BookingNo, x.CustomerName, x.CustomerPhone, x.CustomerCode, x.ModelName, x.SalesInvoiceNo, x.HeldByInvoiceNo]));
        }

        const pages =
            Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        this.paginate();
    }

    private paginate(): void
    {
        const start =
            (this.currentPage - 1) * this.pageSize;

        this.pagedRows =
            this.filteredRows.slice(start, start + this.pageSize);

        this.cdr.detectChanges();
    }

    onTabChange(tab: string): void
    {
        this.tab = (tab as TabId) || 'bookings';

        this.currentPage = 1;

        this.applyFilters();
    }

    onSearch(text: string): void
    {
        this.searchText = text ?? '';

        this.currentPage = 1;

        this.applyFilters();
    }

    onStatusChange(value: any): void
    {
        this.statusFilter = String(value || 'all');

        this.currentPage = 1;

        this.applyFilters();
    }

    onBranchChange(value: any): void
    {
        this.branchFilter = Number(value) || 0;

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
            DateText:this.tab === 'collections' ? 'CollectionDate' : 'BookingDate',
            AdvanceText:'AdvanceAmount',
            AmountText:'Amount',
            ValidText:'ValidUntil',
            ForfeitText:'ForfeitAmount',
            RefundText:'RefundAmount',
            CancelledText:'CancelledDate'
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

    onRowAction(event: ListTableRowActionEvent | { key:string; row:any }): void
    {
        const row = event.row as BookingRow;

        switch (event.key)
        {
            case 'collect':
                this.openCollect(row);
                break;

            case 'edit':
                this.openEdit(row);
                break;

            case 'cancel':
                this.openCancel(row);
                break;

            case 'history':
                this.showHistory(row);
                break;
        }
    }


    //===========================================================
    // View panel (right)
    //===========================================================

    viewRow: BookingRow | null = null;

    view(row: any): void
    {
        this.viewRow =
            this.bookingRows.find(x => x.BookingId === Number(row?.BookingId)) ?? null;

        this.cdr.detectChanges();
    }

    closeView(): void
    {
        this.viewRow = null;

        this.cdr.detectChanges();
    }

    countOf(status: string): number
    {
        return this.bookingRows
            .filter(x => !this.branchFilter || x.BranchId === this.branchFilter)
            .filter(x => x.StatusText === status)
            .length;
    }

    get openAdvance(): number
    {
        return roundMoney(
            this.bookingRows
                .filter(x => x.Status === 'Open' && (!this.branchFilter || x.BranchId === this.branchFilter))
                .reduce((sum, x) => sum + x.AdvanceAmount, 0));
    }

    sumOf(field: string): number
    {
        return roundMoney(this.filteredRows.reduce((sum, x: any) => sum + (Number(x[field]) || 0), 0));
    }

    get viewCollections(): CollectionRow[]
    {
        const id = this.viewRow?.BookingId ?? 0;

        return this.collectionRows.filter(x => x.BookingId === id);
    }


    //===========================================================
    // History
    //===========================================================

    historyOpened = false;

    historyTitle = '';

    historyItems: any[] = [];

    private showHistory(row: Booking): void
    {
        this.service
            .getHistory(this.type, row.BookingId)
            .subscribe
            ({
                next:
                    (response: any[]) =>
                    {
                        this.historyTitle = `${row.BookingNo} · History`;

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
                    () => this.toast.error('History', 'The booking history could not be loaded.')
            });
    }

    closeHistory(): void
    {
        this.historyOpened = false;

        this.cdr.detectChanges();
    }


    //===========================================================
    // DESK : New Booking / Collect (Payment Desk modal)
    //===========================================================

    deskOpen = false;

    deskKind: 'new' | 'collect' = 'new';

    deskBooking: BookingRow | null = null;

    // New booking details
    newCustomer: BookingCustomer | null = null;

    customerQuery = '';

    customerResults: BookingCustomer[] = [];

    customerSearching = false;

    private customerTimer: any = null;

    private customerSeq = 0;

    newModelId: number | null = null;

    newExpected: Date = new Date();

    newSalesPerson = '';

    newRemarks = '';

    // The amount to collect now (the desk rows must equal it)
    targetText = '';

    deskRows: VoucherDebitLine[] = [];

    deskInput: VoucherDebitLine[] = [];

    deskError = '';

    deskMode = '';

    deskLedgerCode = '';

    deskAmountText = '';

    deskModeItems: { label:string; value:string }[] = [];

    deskLedgerItems: { label:string; value:string }[] = [];

    private ledgers: VoucherLedger[] = [];

    ledgersLoaded = false;

    private multiMode = false;

    deskConfirmClose = false;

    private deskSnapshot = '[]';


    openNew(): void
    {
        this.deskKind = 'new';
        this.deskBooking = null;
        this.newCustomer = null;
        this.customerQuery = '';
        this.customerResults = [];
        this.newModelId = null;
        this.resetItems([]);
        this.newExpected = this.daysFromToday(7);
        this.newSalesPerson = '';
        this.newRemarks = '';
        this.targetText = this.switches.MinimumAmount ? String(this.switches.MinimumAmount) : '';

        this.resetDesk();
    }

    private openCollect(row: BookingRow): void
    {
        this.deskKind = 'collect';
        this.deskBooking = row;
        this.targetText = '';
        this.newRemarks = '';

        this.resetDesk();
    }

    private resetDesk(): void
    {
        this.deskRows = [];
        this.deskInput = [];
        this.deskSnapshot = '[]';
        this.deskConfirmClose = false;
        this.deskError = '';
        this.deskMode = '';
        this.deskLedgerCode = '';

        this.buildDeskModeItems();

        this.deskAmountText = this.deskRemaining > 0 ? this.deskRemaining.toFixed(2) : '';

        this.deskOpen = true;

        this.loadPaymentSetup();

        this.cdr.detectChanges();
    }

    private loadPaymentSetup(): void
    {
        if (this.ledgersLoaded)
        {
            return;
        }

        this.lookup
            .getLedgers(true)
            .subscribe
            ({
                next:
                    (ledgers): void =>
                    {
                        this.ledgers = ledgers ?? [];

                        this.ledgersLoaded = true;

                        this.buildDeskLedgerItems();

                        this.cdr.detectChanges();
                    },
                error:
                    (): void =>
                    {
                        this.ledgers = [];

                        this.ledgersLoaded = true;

                        this.cdr.detectChanges();
                    }
            });

        void this.voucherSwitches
            .load()
            .then(
                switches =>
                {
                    this.multiMode = switchOn(switches, VOUCHER_SWITCH.RV_MULTI_MODE, false);

                    this.buildDeskModeItems();

                    this.cdr.detectChanges();
                });
    }

    // Customer : live search (3+ characters)
    onCustomerQuery(value: string | number): void
    {
        this.customerQuery = String(value ?? '');

        this.newCustomer = null;

        this.deskError = '';

        if (this.customerTimer)
        {
            clearTimeout(this.customerTimer);
        }

        const term = this.customerQuery.trim();

        if (term.length < 3)
        {
            this.customerSeq++;

            this.customerResults = [];

            this.customerSearching = false;

            this.cdr.detectChanges();

            return;
        }

        this.customerTimer =
            setTimeout(
                () =>
                {
                    const seq = ++this.customerSeq;

                    this.customerSearching = true;

                    this.cdr.detectChanges();

                    this.service
                        .searchCustomers(term)
                        .subscribe
                        ({
                            next:
                                rows =>
                                {
                                    if (seq !== this.customerSeq)
                                    {
                                        return;
                                    }

                                    this.customerSearching = false;

                                    this.customerResults = rows ?? [];

                                    this.cdr.detectChanges();
                                },
                            error:
                                () =>
                                {
                                    this.customerSearching = false;

                                    this.customerResults = [];

                                    this.cdr.detectChanges();
                                }
                        });
                },
                300);

        this.cdr.detectChanges();
    }

    pickCustomer(item: BookingCustomer): void
    {
        this.newCustomer = item;

        this.customerQuery = '';

        this.customerResults = [];

        this.deskError = '';

        this.cdr.detectChanges();
    }

    clearCustomer(): void
    {
        this.newCustomer = null;

        this.cdr.detectChanges();
    }

    onNewModel(value: any): void
    {
        this.newModelId = Number(value) || null;

        this.deskError = '';
    }

    onNewExpected(date: Date): void
    {
        this.newExpected = date ?? this.newExpected;
    }

    onNewSalesPerson(value: string | number): void
    {
        this.newSalesPerson = String(value ?? '');
    }

    onNewRemarks(value: string | number): void
    {
        this.newRemarks = String(value ?? '');
    }

    onTargetChange(value: string | number): void
    {
        this.targetText = String(value ?? '');

        this.deskError = '';

        if (this.deskRows.length === 0)
        {
            this.deskAmountText = this.deskRemaining > 0 ? this.deskRemaining.toFixed(2) : '';
        }

        this.cdr.detectChanges();
    }

    get targetAmount(): number
    {
        return roundMoney(parseMoney(this.targetText));
    }

    get deskTotal(): number
    {
        return roundMoney(this.deskRows.reduce((sum, row) => sum + (Number(row.Amount) || 0), 0));
    }

    get deskRemaining(): number
    {
        return roundMoney(Math.max(0, this.targetAmount - this.deskTotal));
    }

    get deskNeedsDetails(): boolean
    {
        return this.deskRows.some(row => needsDetails(row.Mode));
    }

    get deskRowCount(): number
    {
        return this.deskRows.filter(row => needsDetails(row.Mode)).length;
    }

    get deskVerifiedCount(): number
    {
        return this.deskRows.filter(row => needsDetails(row.Mode) && isDebitRowReady(row)).length;
    }

    get deskAllVerified(): boolean
    {
        return this.deskVerifiedCount === this.deskRowCount;
    }

    get deskProgress(): number
    {
        return this.deskRowCount > 0 ? Math.round(this.deskVerifiedCount * 100 / this.deskRowCount) : 100;
    }

    // The rule broken by the details ('' = fine)
    get detailsIssue(): string
    {
        if (this.deskKind === 'new')
        {
            if (!this.newCustomer)
            {
                return 'Pick the customer.';
            }

            if (this.isBikes && !this.newModelId)
            {
                return 'Choose the model and colour.';
            }

            if (!this.isBikes)
            {
                const issue = this.linesIssue;

                if (issue)
                {
                    return issue;
                }
            }
        }

        const target = this.targetAmount;

        if (!(target > 0))
        {
            return 'Type the amount to collect.';
        }

        if (this.deskKind === 'new' && this.switches.MinimumAmount && target < this.switches.MinimumAmount)
        {
            return `The first collection must be at least ${formatMoney(this.switches.MinimumAmount)} (Minimum Booking Amount).`;
        }

        return '';
    }

    get canSubmit(): boolean
    {
        return !this.detailsIssue
            && this.deskRows.length > 0
            && this.deskRemaining === 0
            && this.deskAllVerified
            && !this.progress.busy;
    }

    get deskFooterNote(): string
    {
        const issue = this.detailsIssue;

        if (issue)
        {
            return issue;
        }

        if (this.deskRows.length === 0)
        {
            return 'Add the payment : mode, account and amount.';
        }

        if (!this.deskAllVerified)
        {
            const left = this.deskRowCount - this.deskVerifiedCount;

            return `${left} row${left === 1 ? '' : 's'} left to verify.`;
        }

        return this.deskRemaining > 0
            ? `${formatMoney(this.deskRemaining)} more to receive.`
            : 'Ready. The Receipt Voucher credits the customer\'s own ledger (advance).';
    }

    private get deskModeLocked(): string
    {
        return !this.multiMode && this.deskRows.length > 0 ? this.deskRows[0].Mode : '';
    }

    private buildDeskModeItems(): void
    {
        const locked = this.deskModeLocked;

        const allowed = VOUCHER_MODES.receipt as string[];

        this.deskModeItems =
            allowed
                .filter(mode => mode !== 'EMI')
                .filter(mode => !locked || mode === locked)
                .map(mode => ({ label:mode === 'MFS' ? 'MFS (mobile)' : mode === 'POS' ? 'POS (card)' : mode, value:mode }));

        if (!this.deskModeItems.some(item => item.value === this.deskMode))
        {
            this.deskMode = this.deskModeItems.length === 1 || !this.deskMode ? this.deskModeItems[0]?.value ?? '' : '';
        }

        this.buildDeskLedgerItems();
    }

    private deskCandidates(): VoucherLedger[]
    {
        const type = MODE_LEDGER_TYPES[this.deskMode] ?? '';

        const branch = this.branchName.trim().toUpperCase();

        if (!type)
        {
            return [];
        }

        return this.ledgers.filter(
            ledger =>
            {
                if (ledger.LedgerType !== type || !ledger.CollectionAccount || !ledger.IsActive)
                {
                    return false;
                }

                const ledgerBranch = (ledger.Branch ?? '').trim().toUpperCase();

                return type === 'Cash'
                    ? ledgerBranch === branch
                    : !ledger.BranchExclusive || ledgerBranch === branch;
            });
    }

    private buildDeskLedgerItems(): void
    {
        this.deskLedgerItems =
            this.deskCandidates()
                .sort((a, b) => a.LedgerName.localeCompare(b.LedgerName))
                .map(ledger => ({ label:ledger.LedgerName, value:ledger.LedgerCode }));

        if (this.deskLedgerItems.length === 1)
        {
            this.deskLedgerCode = this.deskLedgerItems[0].value;
        }
        else if (!this.deskLedgerItems.some(item => item.value === this.deskLedgerCode))
        {
            this.deskLedgerCode = '';
        }
    }

    get deskLedgerPlaceholder(): string
    {
        if (!this.ledgersLoaded)
        {
            return 'Loading accounts...';
        }

        if (!this.deskMode)
        {
            return 'Select mode first';
        }

        return this.deskLedgerItems.length
            ? 'Select account'
            : `No ${this.deskMode} collection account for ${this.branchName || 'this branch'}`;
    }

    onDeskModeChange(value: any): void
    {
        this.deskMode = String(value ?? '');

        this.deskLedgerCode = '';

        this.deskError = '';

        this.buildDeskLedgerItems();

        this.cdr.detectChanges();
    }

    onDeskLedgerChange(value: any): void
    {
        this.deskLedgerCode = String(value ?? '');

        this.deskError = '';
    }

    onDeskAmountChange(value: string | number): void
    {
        this.deskAmountText = String(value ?? '');

        this.deskError = '';
    }

    addDeskRow(): void
    {
        const mode = this.deskMode as PaymentMode;

        if (!mode)
        {
            this.deskError = 'Select the receipt mode.';

            return;
        }

        const ledger = this.ledgers.find(x => x.LedgerCode === this.deskLedgerCode);

        if (!ledger)
        {
            this.deskError = 'Select the account the money goes to.';

            return;
        }

        const amount = roundMoney(parseMoney(this.deskAmountText));

        if (!(amount > 0))
        {
            this.deskError = 'Amount must be more than 0.';

            return;
        }

        if (amount > this.deskRemaining)
        {
            this.deskError = this.targetAmount > 0
                ? `At most ${formatMoney(this.deskRemaining)} is left to receive (type a bigger amount to collect first).`
                : 'Type the amount to collect first.';

            return;
        }

        const row: VoucherDebitLine =
        {
            ...emptyDebitLine(mode),
            LedgerType:ledger.LedgerType,
            SubGroupCode:ledger.SubGroupCode,
            SubGroupName:ledger.SubGroupName,
            LedgerCode:ledger.LedgerCode,
            LedgerName:ledger.LedgerName,
            AccountId:ledger.AccountId,
            Amount:amount,
            ChargePercent:mode === 'MFS' ? roundMoney(ledger.ChargePercent) : 0,
            ChargeAmount:mode === 'MFS' ? roundMoney(amount * (ledger.ChargePercent || 0) / 100) : 0,
            ChargeBorneBy:
                mode === 'MFS' || mode === 'POS'
                    ? 'Customer'
                    : needsDetails(mode) && mode !== 'Check'
                        ? 'Company'
                        : ''
        };

        this.deskRows = [...this.deskRows, row];

        this.deskInput = this.deskRows.map(x => ({ ...x }));

        this.deskError = '';

        this.deskAmountText = this.deskRemaining > 0 ? this.deskRemaining.toFixed(2) : '';

        this.buildDeskModeItems();

        this.cdr.detectChanges();
    }

    removeDeskRow(index: number): void
    {
        this.deskRows = this.deskRows.filter((_, i) => i !== index);

        this.deskInput = this.deskRows.map(x => ({ ...x }));

        this.deskAmountText = this.deskRemaining > 0 ? this.deskRemaining.toFixed(2) : '';

        this.buildDeskModeItems();

        this.cdr.detectChanges();
    }

    onDeskChange(lines: VoucherDebitLine[]): void
    {
        this.deskRows = (lines ?? []).map(row => ({ ...row }));

        this.deskError = '';

        this.cdr.detectChanges();
    }

    onDeskValidChange(value: boolean): void
    {
        void value;
    }

    deskRowState(row: VoucherDebitLine): string
    {
        if (!needsDetails(row.Mode))
        {
            return 'Ready';
        }

        if (isDebitRowReady(row))
        {
            return 'Verified';
        }

        return debitDetailIssue(row) ? 'Details needed' : 'Ready to verify';
    }

    deskRowReady(row: VoucherDebitLine): boolean
    {
        return isDebitRowReady(row);
    }

    onDeskClose(): void
    {
        if (this.progress.busy)
        {
            return;
        }

        if (JSON.stringify(this.deskRows) !== this.deskSnapshot)
        {
            this.deskConfirmClose = true;

            return;
        }

        this.closeDesk();
    }

    onDeskKeepEditing(): void
    {
        this.deskConfirmClose = false;
    }

    onDeskDiscard(): void
    {
        this.closeDesk();
    }

    private closeDesk(): void
    {
        this.deskOpen = false;

        this.deskConfirmClose = false;

        this.deskError = '';

        this.cdr.detectChanges();
    }

    submitDesk(): void
    {
        if (this.progress.busy)
        {
            return;
        }

        if (!this.canSubmit)
        {
            this.deskError =
                this.detailsIssue
                || (this.deskRows.length === 0
                    ? 'Add the payment first.'
                    : this.deskRemaining > 0
                        ? `${formatMoney(this.deskRemaining)} more to receive.`
                        : 'Verify every row first.');

            this.cdr.detectChanges();

            return;
        }

        const debits =
            this.deskRows.map(
                row =>
                {
                    const copy: any = { ...row };

                    delete copy.Verified;

                    return copy;
                });

        const booking = this.deskBooking;

        const call$ =
            this.deskKind === 'new'
                ? this.service.create(
                    this.type,
                    {
                        Date:this.today,
                        CustomerId:this.newCustomer!.CustomerId,
                        MotorBikeId:this.isBikes ? this.newModelId! : 0,
                        Lines:this.isBikes ? [] : this.cleanLines(),
                        ExpectedDate:this.isoDate(this.newExpected),
                        SalesPersonName:this.newSalesPerson.trim(),
                        Remarks:this.newRemarks.trim(),
                        Debits:debits
                    })
                : this.service.collect(
                    this.type,
                    booking!.PublicId,
                    {
                        Date:this.today,
                        Remarks:this.newRemarks.trim(),
                        Debits:debits
                    });

        this.progress
            .run<any>(
                this.deskKind === 'new' ? 'Saving Booking' : 'Collecting Advance',
                `Please wait while ${formatMoney(this.targetAmount)} is received...`,
                this.deskKind === 'new' ? 'Booking saved.' : 'Advance collected.',
                call$)
            .subscribe
            ({
                next:
                    (saved: any): void =>
                    {
                        this.deskOpen = false;

                        this.toast.success(
                            this.deskKind === 'new' ? 'Booking Saved' : 'Advance Collected',
                            `${saved?.BookingNo ?? booking?.BookingNo ?? 'Booking'} : ${formatMoney(this.targetAmount)} by ${saved?.ReceiptVoucherNo || 'a Receipt Voucher'}.`);

                        this.load();
                    },
                error:
                    (error: unknown): void =>
                    {
                        this.deskError = this.errorText(error, 'The booking could not be saved.');

                        this.toast.error('Save Failed', this.deskError);

                        this.cdr.detectChanges();
                    }
            });
    }


    //===========================================================
    // SP / AC : items (New Booking and Edit share one list; only
    // one of the two is open at a time)
    //===========================================================

    itemLines: BookingLine[] = [];

    // Quantities as typed (one per line)
    itemQtyTexts: string[] = [];

    itemQuery = '';

    itemResults: BookingProduct[] = [];

    itemSearching = false;

    private itemTimer: any = null;

    private itemSeq = 0;

    private resetItems(lines: BookingLine[]): void
    {
        this.itemLines = (lines ?? []).map(x => ({ ...x }));
        this.itemQtyTexts = this.itemLines.map(x => String(x.Quantity));
        this.itemQuery = '';
        this.itemResults = [];
        this.itemSearching = false;
    }

    // The rule the items break ('' = fine)
    get linesIssue(): string
    {
        if (this.itemLines.length === 0)
        {
            return 'Add at least one item.';
        }

        const bad =
            this.itemLines.findIndex((_, i) => !(parseMoney(this.itemQtyTexts[i] ?? '') > 0));

        return bad >= 0
            ? `${this.itemLines[bad].ProductName} : type a quantity above 0.`
            : '';
    }

    // The lines with the typed quantities
    cleanLines(): BookingLine[]
    {
        return this.itemLines.map
        (
            (x, i) =>
            ({
                ...x,
                Quantity:roundMoney(parseMoney(this.itemQtyTexts[i] ?? '')),
                Remarks:(x.Remarks ?? '').trim()
            })
        );
    }

    get itemCount(): number
    {
        return this.itemLines.length;
    }

    get itemQtyTotal(): number
    {
        return roundMoney(this.itemQtyTexts.reduce((sum, q) => sum + (parseMoney(q) || 0), 0));
    }

    onItemQuery(value: string | number): void
    {
        this.itemQuery = String(value ?? '');

        if (this.itemTimer)
        {
            clearTimeout(this.itemTimer);
        }

        const term = this.itemQuery.trim();

        if (term.length < 2)
        {
            this.itemSeq++;
            this.itemResults = [];
            this.itemSearching = false;
            this.cdr.detectChanges();

            return;
        }

        this.itemTimer =
            setTimeout(
                () =>
                {
                    const seq = ++this.itemSeq;

                    this.itemSearching = true;

                    this.cdr.detectChanges();

                    this.service
                        .searchProducts(this.type, term)
                        .subscribe
                        ({
                            next:
                                rows =>
                                {
                                    if (seq !== this.itemSeq)
                                    {
                                        return;
                                    }

                                    this.itemSearching = false;
                                    this.itemResults = rows ?? [];
                                    this.cdr.detectChanges();
                                },
                            error:
                                () =>
                                {
                                    this.itemSearching = false;
                                    this.itemResults = [];
                                    this.cdr.detectChanges();
                                }
                        });
                },
                300);

        this.cdr.detectChanges();
    }

    // Picked : a new line (qty 1), or one more of a line already there
    pickItem(item: BookingProduct): void
    {
        const at = this.itemLines.findIndex(x => x.ProductId === item.ProductId);

        if (at >= 0)
        {
            this.itemQtyTexts = this.itemQtyTexts.map((q, i) => i === at ? String(roundMoney((parseMoney(q) || 0) + 1)) : q);
        }
        else
        {
            this.itemLines = [...this.itemLines, { ...item, Quantity:1, Remarks:'' }];
            this.itemQtyTexts = [...this.itemQtyTexts, '1'];
        }

        this.itemQuery = '';
        this.itemResults = [];
        this.deskError = '';
        this.editError = '';
        this.cdr.detectChanges();
    }

    onItemQty(index: number, value: string | number): void
    {
        this.itemQtyTexts = this.itemQtyTexts.map((q, i) => i === index ? String(value ?? '') : q);
        this.deskError = '';
        this.editError = '';
        this.cdr.detectChanges();
    }

    removeItem(index: number): void
    {
        this.itemLines = this.itemLines.filter((_, i) => i !== index);
        this.itemQtyTexts = this.itemQtyTexts.filter((_, i) => i !== index);
        this.cdr.detectChanges();
    }

    qtyText(value: number): string
    {
        return String(roundMoney(Number(value) || 0));
    }


    //===========================================================
    // EDIT (open booking : model, expected date, notes)
    //===========================================================

    editRow: BookingRow | null = null;

    editModelId: number | null = null;

    editExpected: Date = new Date();

    editSalesPerson = '';

    editRemarks = '';

    editError = '';

    private openEdit(row: BookingRow): void
    {
        this.editRow = row;
        this.editModelId = row.MotorBikeId;
        this.resetItems(row.Lines);
        this.editExpected = this.toDate(row.ExpectedDate) ?? this.daysFromToday(7);
        this.editSalesPerson = row.SalesPersonName;
        this.editRemarks = row.Remarks;
        this.editError = '';

        this.cdr.detectChanges();
    }

    closeEdit(): void
    {
        this.editRow = null;

        this.cdr.detectChanges();
    }

    onEditModel(value: any): void { this.editModelId = Number(value) || null; this.editError = ''; }

    onEditExpected(date: Date): void { this.editExpected = date ?? this.editExpected; }

    onEditSalesPerson(value: string | number): void { this.editSalesPerson = String(value ?? ''); }

    onEditRemarks(value: string | number): void { this.editRemarks = String(value ?? ''); }

    saveEdit(): void
    {
        const row = this.editRow;

        if (!row || this.progress.busy)
        {
            return;
        }

        if (this.isBikes && !this.editModelId)
        {
            this.editError = 'Choose the model and colour.';

            this.cdr.detectChanges();

            return;
        }

        if (!this.isBikes && this.linesIssue)
        {
            this.editError = this.linesIssue;

            this.cdr.detectChanges();

            return;
        }

        this.progress
            .run<any>(
                'Saving Booking',
                `Please wait while ${row.BookingNo} is updated...`,
                'Booking updated.',
                this.service.update(
                    this.type,
                    row.PublicId,
                    {
                        MotorBikeId:this.isBikes ? this.editModelId! : 0,
                        Lines:this.isBikes ? [] : this.cleanLines(),
                        ExpectedDate:this.isoDate(this.editExpected),
                        SalesPersonName:this.editSalesPerson.trim(),
                        Remarks:this.editRemarks.trim()
                    }))
            .subscribe
            ({
                next:
                    (): void =>
                    {
                        this.editRow = null;

                        this.toast.success('Booking Updated', `${row.BookingNo} saved.`);

                        this.load();
                    },
                error:
                    (error: unknown): void =>
                    {
                        this.editError = this.errorText(error, 'The booking could not be updated.');

                        this.cdr.detectChanges();
                    }
            });
    }


    //===========================================================
    // CANCEL (reason; forfeit; the rest to refund)
    //===========================================================

    cancelRow: BookingRow | null = null;

    cancelReason = '';

    forfeitText = '';

    cancelError = '';

    private openCancel(row: BookingRow): void
    {
        this.cancelRow = row;
        this.cancelReason = '';
        this.cancelError = '';

        const forfeit =
            this.switches.RefundOnCancel
                ? roundMoney(row.AdvanceAmount * (this.switches.ForfeitPercent || 0) / 100)
                : row.AdvanceAmount;

        this.forfeitText = forfeit > 0 ? forfeit.toFixed(2) : '0';

        this.cdr.detectChanges();
    }

    closeCancel(): void
    {
        this.cancelRow = null;

        this.cdr.detectChanges();
    }

    onCancelReason(value: string | number): void { this.cancelReason = String(value ?? ''); this.cancelError = ''; }

    onForfeit(value: string | number): void { this.forfeitText = String(value ?? ''); this.cancelError = ''; this.cdr.detectChanges(); }

    get forfeitAmount(): number
    {
        return roundMoney(parseMoney(this.forfeitText));
    }

    get refundAmount(): number
    {
        return roundMoney(Math.max(0, (this.cancelRow?.AdvanceAmount ?? 0) - this.forfeitAmount));
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

        const forfeit = this.switches.RefundOnCancel ? this.forfeitAmount : row.AdvanceAmount;

        if (forfeit < 0 || forfeit > row.AdvanceAmount)
        {
            this.cancelError = `The forfeit must be between 0 and ${formatMoney(row.AdvanceAmount)}.`;

            this.cdr.detectChanges();

            return;
        }

        this.progress
            .run<any>(
                'Cancelling Booking',
                `Please wait while ${row.BookingNo} is cancelled...`,
                'Booking cancelled.',
                this.service.cancel(this.type, row.PublicId, reason, forfeit))
            .subscribe
            ({
                next:
                    (saved: any): void =>
                    {
                        this.cancelRow = null;

                        const refund = roundMoney(row.AdvanceAmount - forfeit);

                        this.toast.success(
                            'Booking Cancelled',
                            `${row.BookingNo} cancelled.${forfeit > 0 ? ` Forfeit ${formatMoney(forfeit)} by ${saved?.ForfeitVoucherNo || 'a Journal Voucher'}.` : ''}${refund > 0 ? ` ${formatMoney(refund)} stays on the customer's ledger : refund it by Payment Voucher.` : ''}`);

                        this.load();
                    },
                error:
                    (error: unknown): void =>
                    {
                        this.cancelError = this.errorText(error, 'The booking could not be cancelled.');

                        this.cdr.detectChanges();
                    }
            });
    }
}
