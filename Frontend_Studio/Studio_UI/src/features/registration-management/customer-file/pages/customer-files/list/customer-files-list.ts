//===============================================================
// Customer Files (one page, NO Code Synchronization)
//
// Registration Management > Customer File > Customer Files. One
// record per chassis : the landing station of every customer
// after a sale. Three tabs :
//
//   File Register    the files; opening files (bikes sold before
//                    the system, CF-OPEN-0001) are added here;
//                    invoice files come from Sales Invoice - MB
//                    (<invoice no>/<line>). Status : Open ->
//                    Ready for Delivery -> Delivered (one step
//                    back allowed); Cancel / Reopen (opening
//                    files).
//   Name Transfer    transfers before registration under the
//                    policy in force (Customer File Configuration)
//                    : the new owner becomes the current customer;
//                    only the latest transfer can be cancelled.
//   Fees Collection  name transfer fees and custody charges :
//                    Collect opens the Payment Desk (as the Sales
//                    Invoice checkout) and posts one Receipt
//                    Voucher. Pay first : a transfer with a fee
//                    waits (Fee Pending) and a file with an unpaid
//                    custody charge is not delivered, unless the
//                    switch Allow Without Fee Payment is ON and
//                    the user ticks "without payment" (the fee
//                    becomes the customer's due).
//
// Add / Update / View / status dates in the panel on the right.
//===============================================================


//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    inject,
    ChangeDetectorRef
}
from '@angular/core';

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
    CustomerFilesTab,
    CustomerFileStatus,
    CustomerFile,
    CustomerFileTransfer,
    CustomerFilesDefaults,
    CustomerFileLookupItem,
    NameTransferQuote,
    SaveOpeningFile,
    SaveNameTransfer,
    CUSTOMER_FILE_STATUS_LABELS,
    CUSTOMER_FILE_STATUS_DOTS,
    CustomerFileFee,
    CustomerFileFeeStatus,
    CUSTOMER_FILE_FEE_DOTS,
    CustodyQuote
}
from '../../../models/customer-files.model';

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
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

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
    CheckboxComponent
}
from '../../../../../../shared/components/utilities/checkbox/checkbox';

import
{
    FormSectionComponent
}
from '../../../../../../shared/components/layout/form-section/form-section';

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

import
{
    CustomerFilesService
}
from '../../../services/customer-files.service';


//===============================================================
// Rows with their display texts
//===============================================================

type FileRow =
    CustomerFile
    &
    {
        Kind:'file';
        DateText:string;
        StatusText:string;
        StatusDot:string;
        CustomerText:string;
        TransfersText:string;
    };

type TransferRow =
    CustomerFileTransfer
    &
    {
        Kind:'transfer';
        DateText:string;
        FeeText:string;
        StatusText:string;
        StatusDot:string;
    };

type FeeRow =
    CustomerFileFee
    &
    {
        Kind:'fee';
        DateText:string;
        TypeText:string;
        AmountText:string;
        StatusText:string;
        StatusDot:string;
        VoucherText:string;
    };

type AnyRow =
    FileRow | TransferRow | FeeRow;

type PanelKind =
    'file' | 'status' | 'transfer' | 'fee';

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

type LookupOption =
    CustomerFileLookupItem
    &
    {
        label:string;
        value:number;
        badge:string;
    };


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'customer-files-list',

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
        CheckboxComponent,
        FormSectionComponent,
        TextboxComponent,
        DropdownComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        PaymentDeskComponent
    ],

    templateUrl:'./customer-files-list.html',

    styleUrl:'./customer-files-list.css'
})


//===============================================================
// Customer Files List
//===============================================================

export class CustomerFilesList
implements OnInit
{
    private readonly service =
        inject(CustomerFilesService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

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
    // Tabs and filters
    //===========================================================

    readonly tabs:
        ControlTab[] =
        [
            { id:'FileRegister', label:'File Register' },
            { id:'NameTransfer', label:'Name Transfer' },
            { id:'FeesCollection', label:'Fees Collection' }
        ];

    selectedTab:
        CustomerFilesTab =
        'FileRegister';

    readonly statusFilterItems:
        any[] =
        [
            { label:'All Statuses', value:'' },
            { label:'Open', value:'Open' },
            { label:'Ready for Delivery', value:'ReadyForDelivery' },
            { label:'Delivered', value:'Delivered' },
            { label:'Cancelled', value:'Cancelled' }
        ];

    statusFilter:
        string =
        '';

    branchFilterItems:
        any[] =
        [ { label:'All Branches', value:0 } ];

    branchFilter:
        number =
        0;

    get isRegister():
        boolean
    {
        return this.selectedTab === 'FileRegister';
    }

    get isTransfer():
        boolean
    {
        return this.selectedTab === 'NameTransfer';
    }

    get isFees():
        boolean
    {
        return this.selectedTab === 'FeesCollection';
    }

    get addTitle():
        string
    {
        return this.isTransfer ? 'Transfer the name of a file' : 'Add an opening file (a bike sold before the system)';
    }

    get searchPlaceholder():
        string
    {
        return this.isTransfer
            ? 'Search transfers, files, chassis, customers...'
            : this.isFees
                ? 'Search fees, files, chassis, customers, vouchers...'
                : 'Search files, chassis, engine, customers...';
    }

    get hint():
        string
    {
        return this.isTransfer
            ? 'Name transfers before registration, under the policy in force. A transfer with a fee takes effect when the fee is collected.'
            : this.isFees
                ? 'Collect a fee through the Payment Desk (one Receipt Voucher). A pending name transfer takes effect when its fee is collected.'
                : 'One file per chassis. Invoice files come from Sales Invoice - MB; add bikes sold before the system as opening files.';
    }


    //===========================================================
    // Data
    //===========================================================

    private fileRows:
        FileRow[] =
        [];

    private transferRows:
        TransferRow[] =
        [];

    private feeRows:
        FeeRow[] =
        [];

    // The user's branch (cash accounts of the Payment Desk)
    branchId:
        number =
        0;

    branchName:
        string =
        '';

    // Switch : Customer Files : Allow Without Fee Payment
    allowWithoutPayment:
        boolean =
        false;

    readonly feeStatusFilterItems:
        any[] =
        [
            { label:'To Collect', value:'Open' },
            { label:'All Statuses', value:'' },
            { label:'Pending', value:'Pending' },
            { label:'Due', value:'Due' },
            { label:'Paid', value:'Paid' },
            { label:'Cancelled', value:'Cancelled' }
        ];

    // 'Open' = Pending + Due
    feeStatusFilter:
        string =
        'Open';

    today:
        string =
        '';

    filteredRows:
        AnyRow[] =
        [];

    pagedRows:
        AnyRow[] =
        [];

    searchText:
        string =
        '';

    loading:
        boolean =
        false;

    loadFailed:
        boolean =
        false;

    currentPage:
        number =
        1;

    pageSize:
        number =
        10;

    historyOpened:
        boolean =
        false;

    historyTitle:
        string =
        'Customer Files History';

    historyItems:
        any[] =
        [];

    defaults:
        CustomerFilesDefaults | null =
        null;

    readonly registrationByItems:
        any[] =
        [
            { label:'Dealer', value:'Dealer' },
            { label:'Customer', value:'Customer' }
        ];

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
    // Columns and row actions
    //===========================================================

    private readonly fileColumns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'56px', align:'center' },
        { header:'File No', field:'CustomerFileNo', width:'150px', align:'left' },
        { header:'File Date', field:'DateText', width:'110px', align:'center' },
        { header:'Motor Bike', field:'BikeName', align:'left' },
        { header:'Chassis No', field:'ChassisNo', width:'170px', align:'left' },
        { header:'Engine No', field:'EngineNo', width:'150px', align:'left' },
        { header:'Customer', field:'CustomerText', align:'left' },
        { header:'Transfers', field:'TransfersText', width:'90px', align:'center' },
        { header:'Status', field:'StatusText', width:'160px', align:'left', dotField:'StatusDot' },
        { header:'Actions', field:'actions', type:'actions', width:'190px', align:'center' }
    ];

    private readonly transferColumns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'56px', align:'center' },
        { header:'Transfer No', field:'TransferNo', width:'120px', align:'center' },
        { header:'Date', field:'DateText', width:'110px', align:'center' },
        { header:'File No', field:'CustomerFileNo', width:'150px', align:'left' },
        { header:'Chassis No', field:'ChassisNo', width:'170px', align:'left' },
        { header:'From', field:'FromCustomerName', align:'left' },
        { header:'To', field:'ToCustomerName', align:'left' },
        { header:'Fee', field:'FeeText', width:'110px', align:'right' },
        { header:'Status', field:'StatusText', width:'170px', align:'left', dotField:'StatusDot' },
        { header:'Actions', field:'actions', type:'actions', width:'110px', align:'center' }
    ];

    private readonly feeColumns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'56px', align:'center' },
        { header:'Fee No', field:'FeeNo', width:'120px', align:'center' },
        { header:'Date', field:'DateText', width:'110px', align:'center' },
        { header:'Fee', field:'TypeText', width:'200px', align:'left' },
        { header:'File No', field:'CustomerFileNo', width:'150px', align:'left' },
        { header:'Customer', field:'CustomerName', align:'left' },
        { header:'Amount', field:'AmountText', width:'120px', align:'right' },
        { header:'Status', field:'StatusText', width:'110px', align:'left', dotField:'StatusDot' },
        { header:'Voucher', field:'VoucherText', width:'200px', align:'left' },
        { header:'Actions', field:'actions', type:'actions', width:'120px', align:'center' }
    ];

    get columns():
        ListTableColumn[]
    {
        return this.isTransfer ? this.transferColumns : this.isFees ? this.feeColumns : this.fileColumns;
    }

    get tableActions():
        { view:boolean; edit:boolean; delete:boolean }
    {
        return this.isRegister
            ? { view:true, edit:true, delete:false }
            : { view:true, edit:false, delete:false };
    }

    private readonly fileActions:
        ListTableRowAction[] =
    [
        {
            key:'transfer',
            icon:'fas fa-people-arrows',
            title:'Transfer the name',
            tone:'primary',
            visible:(r: FileRow) => r.Status === 'Open' && !r.PendingTransferNo
        },
        {
            key:'ready',
            icon:'fas fa-box-open',
            title:'Ready for delivery',
            tone:'primary',
            visible:(r: FileRow) => r.Status === 'Open'
        },
        {
            key:'deliver',
            icon:'fas fa-handshake',
            title:'Delivered to the customer',
            tone:'success',
            visible:(r: FileRow) => r.Status === 'ReadyForDelivery'
        },
        {
            key:'back',
            icon:'fas fa-rotate-left',
            title:'Take the last step back',
            tone:'default',
            visible:(r: FileRow) => r.Status === 'ReadyForDelivery' || r.Status === 'Delivered'
        },
        {
            key:'cancel',
            icon:'fas fa-ban',
            title:'Cancel the opening file',
            tone:'danger',
            visible:(r: FileRow) => r.Status === 'Open' && r.Source === 'Opening' && r.TransferCount === 0
        },
        {
            key:'reopen',
            icon:'fas fa-folder-open',
            title:'Reopen the file',
            tone:'primary',
            visible:(r: FileRow) => r.Status === 'Cancelled'
        }
    ];

    private readonly transferActions:
        ListTableRowAction[] =
    [
        {
            key:'cancelTransfer',
            icon:'fas fa-ban',
            title:'Cancel this transfer',
            tone:'danger',
            visible:(r: TransferRow) =>
                r.IsLatest
                && this.fileOf(r.CustomerFileId)?.Status === 'Open'
                && (r.Status === 'FeePending' || !r.FeeNo)
        }
    ];

    private readonly feeActions:
        ListTableRowAction[] =
    [
        {
            key:'collect',
            icon:'fas fa-cash-register',
            title:'Collect (Payment Desk)',
            tone:'success',
            visible:(r: FeeRow) => r.Status === 'Pending' || r.Status === 'Due'
        },
        {
            key:'cancelFee',
            icon:'fas fa-ban',
            title:'Cancel this pending fee',
            tone:'danger',
            visible:(r: FeeRow) => r.Status === 'Pending'
        }
    ];

    get rowActions():
        ListTableRowAction[]
    {
        return this.isTransfer ? this.transferActions : this.isFees ? this.feeActions : this.fileActions;
    }


    //===========================================================
    // Load
    //===========================================================

    ngOnInit():
        void
    {
        this.loadItems();
    }


    loadItems():
        void
    {
        this.loading = true;

        this.loadFailed = false;

        const money = CustomerFilesList.money;

        const dateLabel = CustomerFilesList.dateLabel;

        this.service
            .getAll()
            .subscribe
            ({
                next:
                (data): void =>
                {
                    this.today = data.Today;

                    this.fileRows =
                        data.Files.map(
                            x =>
                            ({
                                ...x,
                                Kind:'file' as const,
                                DateText:dateLabel(x.FileDate),
                                StatusText:CUSTOMER_FILE_STATUS_LABELS[x.Status] ?? x.Status,
                                StatusDot:CUSTOMER_FILE_STATUS_DOTS[x.Status] ?? '',
                                CustomerText:x.CurrentCustomerName,
                                TransfersText:x.TransferCount ? String(x.TransferCount) : '—'
                            }));

                    this.transferRows =
                        data.Transfers.map(
                            x =>
                            ({
                                ...x,
                                Kind:'transfer' as const,
                                DateText:dateLabel(x.TransferDate),
                                FeeText:x.FeeAmount > 0 ? money(x.FeeAmount) : '—',
                                StatusText:
                                    x.Status === 'FeePending'
                                        ? 'Fee Pending'
                                        : x.FeeStatus === 'Due' ? 'Completed · Fee Due' : 'Completed',
                                StatusDot:x.Status === 'FeePending' ? '#d97706' : x.FeeStatus === 'Due' ? '#be123c' : '#16a34a'
                            }));

                    this.feeRows =
                        data.Fees.map(
                            x =>
                            ({
                                ...x,
                                Kind:'fee' as const,
                                DateText:dateLabel(x.FeeDate),
                                TypeText:x.FeeType === 'Custody' ? 'Custody Charge' : `Name Transfer${x.TransferNo ? ' · ' + x.TransferNo : ''}`,
                                AmountText:money(x.Amount),
                                StatusText:x.Status,
                                StatusDot:CUSTOMER_FILE_FEE_DOTS[x.Status] ?? '',
                                VoucherText:[x.DueVoucherNo, x.ReceiptVoucherNo].filter(v => v).join(' · ') || '—'
                            }));

                    this.branchId = data.BranchId;

                    this.branchName = data.BranchName;

                    this.allowWithoutPayment = data.AllowWithoutPayment;

                    const branches =
                        new Map<number, string>();

                    this.fileRows.forEach(x => branches.set(x.BranchId, x.BranchName || `Branch ${x.BranchId}`));

                    this.branchFilterItems =
                        [
                            { label:'All Branches', value:0 },
                            ...[...branches.entries()]
                                .sort((a, b) => a[1].localeCompare(b[1]))
                                .map(([value, label]) => ({ label, value }))
                        ];

                    if (this.branchFilter && !branches.has(this.branchFilter))
                    {
                        this.branchFilter = 0;
                    }

                    this.loading = false;

                    this.applyFilters(false);

                    this.cdr.detectChanges();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('Load Customer Files Error:', error);

                    this.fileRows = [];
                    this.transferRows = [];
                    this.feeRows = [];
                    this.filteredRows = [];
                    this.pagedRows = [];

                    this.loading = false;

                    this.loadFailed = true;

                    this.toast.error('Load Failed', this.errorText(error, 'Unable to load the customer files.'));

                    this.cdr.detectChanges();
                }
            });
    }


    // Bikes, customers and documents for the forms (fresh every
    // time a form opens : new customers may have been added)
    private loadDefaults(then: () => void): void
    {
        this.service
            .getDefaults()
            .subscribe
            ({
                next:
                (data): void =>
                {
                    this.defaults = data;

                    then();

                    this.cdr.detectChanges();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('Load Customer File Defaults Error:', error);

                    this.toast.error('Load Failed', this.errorText(error, 'The bikes and customers could not be loaded.'));
                }
            });
    }


    private fileOf(customerFileId: number): FileRow | undefined
    {
        return this.fileRows.find(x => x.CustomerFileId === customerFileId);
    }


    //===========================================================
    // Formatting
    //===========================================================

    static money(value: number): string
    {
        return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
    }

    static parseDate(value: string): Date | null
    {
        const [y, m, d] =
            (value ?? '').slice(0, 10).split('-').map(Number);

        return y && m && d ? new Date(y, m - 1, d) : null;
    }

    static dateLabel(value: string): string
    {
        const date =
            CustomerFilesList.parseDate(value);

        return date
            ? date.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
            : value || '—';
    }

    static dateKey(date: Date | null): string
    {
        if (!date || isNaN(date.getTime()))
        {
            return '';
        }

        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    dateLabel(value: string): string
    {
        return CustomerFilesList.dateLabel(value);
    }

    money(value: number): string
    {
        return CustomerFilesList.money(value);
    }

    statusLabel(status: CustomerFileStatus): string
    {
        return CUSTOMER_FILE_STATUS_LABELS[status] ?? status;
    }

    private todayDate(): Date
    {
        return CustomerFilesList.parseDate(this.today) ?? new Date();
    }


    //===========================================================
    // Filters / Sort / Pagination
    //===========================================================

    private get viewRows():
        AnyRow[]
    {
        if (this.isTransfer)
        {
            return this.branchFilter
                ? this.transferRows.filter(x => this.fileOf(x.CustomerFileId)?.BranchId === this.branchFilter)
                : this.transferRows;
        }

        if (this.isFees)
        {
            return this.feeRows.filter(
                x =>
                    (!this.feeStatusFilter
                        || (this.feeStatusFilter === 'Open' ? x.Status === 'Pending' || x.Status === 'Due' : x.Status === this.feeStatusFilter))
                    &&
                    (!this.branchFilter || this.fileOf(x.CustomerFileId)?.BranchId === this.branchFilter));
        }

        return this.fileRows.filter(
            x =>
                (!this.statusFilter || x.Status === this.statusFilter)
                &&
                (!this.branchFilter || x.BranchId === this.branchFilter));
    }

    get viewCount():
        number
    {
        return this.viewRows.length;
    }


    applyFilters(resetPage: boolean = true): void
    {
        const keyword =
            this.searchText.trim().toLowerCase();

        this.filteredRows =
            this.viewRows.filter(
                row =>
                    !keyword
                    ||
                    Object.values(row)
                        .filter(v => typeof v === 'string' || typeof v === 'number')
                        .join(' ')
                        .toLowerCase()
                        .includes(keyword));

        if (resetPage)
        {
            this.currentPage = 1;
        }

        const pages =
            Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        this.updatePagination();
    }


    onTabChange(value: string): void
    {
        this.selectedTab = value as CustomerFilesTab;

        if (this.panelOpened && !this.progress.busy)
        {
            this.panelOpened = false;
        }

        this.searchText = '';

        this.applyFilters();

        this.cdr.detectChanges();
    }


    onStatusFilter(value: string): void
    {
        this.statusFilter = value ?? '';

        this.applyFilters();
    }


    onFeeStatusFilter(value: string): void
    {
        this.feeStatusFilter = value ?? '';

        this.applyFilters();
    }


    onBranchFilter(value: number): void
    {
        this.branchFilter = Number(value) || 0;

        this.applyFilters();
    }


    onSearch(value: string): void
    {
        this.searchText = value ?? '';

        this.applyFilters();
    }


    onSort(event: { field:string; direction:'asc' | 'desc' }): void
    {
        const sign =
            event.direction === 'asc' ? 1 : -1;

        const raw: Record<string, string> =
        {
            DateText:this.isTransfer ? 'TransferDate' : this.isFees ? 'FeeDate' : 'FileDate',
            FeeText:'FeeAmount',
            AmountText:'Amount',
            TransfersText:'TransferCount'
        };

        const field =
            raw[event.field] ?? event.field;

        this.filteredRows =
            [...this.filteredRows].sort(
                (a: any, b: any) =>
                {
                    const x = a?.[field];

                    const y = b?.[field];

                    if (x == null && y == null) { return 0; }

                    if (x == null) { return -sign; }

                    if (y == null) { return sign; }

                    if (typeof x === 'string' && typeof y === 'string')
                    {
                        return x.localeCompare(y, undefined, { numeric:true }) * sign;
                    }

                    return (x < y ? -1 : x > y ? 1 : 0) * sign;
                });

        this.currentPage = 1;

        this.updatePagination();
    }


    refresh(): void
    {
        this.searchText = '';

        this.currentPage = 1;

        this.loadItems();
    }


    updatePagination(): void
    {
        const start =
            (this.currentPage - 1) * this.pageSize;

        this.pagedRows =
            [...this.filteredRows.slice(start, start + this.pageSize)];
    }


    onPageChange(page: number): void
    {
        this.currentPage = page;

        this.updatePagination();
    }


    onPageSizeChange(size: number): void
    {
        this.pageSize = size;

        this.currentPage = 1;

        this.updatePagination();
    }


    //===========================================================
    // FORM PANEL
    //===========================================================

    panelOpened:
        boolean =
        false;

    panelKind:
        PanelKind =
        'file';

    panelMode:
        'add' | 'edit' | 'view' =
        'add';

    // The file in the panel (edit / view / status / transfer)
    panelFile:
        FileRow | null =
        null;

    // The transfer in the panel (view)
    panelTransfer:
        TransferRow | null =
        null;

    // The fee in the panel (view)
    panelFee:
        FeeRow | null =
        null;

    // Transfer / deliver before the fee is paid (switch ON)
    withoutPayment:
        boolean =
        false;

    // Deliver : the custody charge on the collected date
    custodyQuote:
        CustodyQuote | null =
        null;

    custodyLoading:
        boolean =
        false;

    // File : the opening file fields
    code:
        string =
        '';

    fileDate:
        Date =
        new Date();

    invoiceNo:
        string =
        '';

    invoiceDate:
        Date | null =
        null;

    salesman:
        string =
        '';

    bikeId:
        number | null =
        null;

    chassisNo:
        string =
        '';

    engineNo:
        string =
        '';

    customerId:
        number | null =
        null;

    registrationBy:
        string =
        'Dealer';

    remarks:
        string =
        '';

    // Status : ReadyForDelivery / Delivered and its date
    targetStatus:
        CustomerFileStatus =
        'ReadyForDelivery';

    statusDate:
        Date =
        new Date();

    // Transfer
    transferFileId:
        number | null =
        null;

    transferDate:
        Date =
        new Date();

    toCustomerId:
        number | null =
        null;

    tickedDocuments:
        Set<string> =
        new Set<string>();

    quote:
        NameTransferQuote | null =
        null;

    quoteLoading:
        boolean =
        false;


    get isView():
        boolean
    {
        return this.panelMode === 'view';
    }

    get panelIcon():
        string
    {
        return this.panelKind === 'fee'
            ? 'fas fa-receipt'
            : this.panelKind === 'transfer'
            ? 'fas fa-people-arrows'
            : this.panelKind === 'status'
                ? (this.targetStatus === 'Delivered' ? 'fas fa-handshake' : 'fas fa-box-open')
                : 'fas fa-folder-open';
    }

    get panelTitle():
        string
    {
        if (this.panelKind === 'status')
        {
            return this.targetStatus === 'Delivered' ? 'Deliver the File' : 'Ready for Delivery';
        }

        if (this.panelKind === 'transfer')
        {
            return this.isView ? 'Name Transfer' : 'New Name Transfer';
        }

        if (this.panelKind === 'fee')
        {
            return this.panelFee?.FeeType === 'Custody' ? 'Custody Charge' : 'Name Transfer Fee';
        }

        return this.panelMode === 'add'
            ? 'Add Opening File'
            : this.isView ? 'Customer File' : 'Update Opening File';
    }

    get panelSubtitle():
        string
    {
        if (this.panelKind === 'transfer')
        {
            return this.isView
                ? `${this.panelTransfer?.TransferNo ?? ''} · ${this.panelTransfer?.CustomerFileNo ?? ''}`
                : `Next No ${this.defaults?.NextTransferNo ?? '...'}`;
        }

        if (this.panelKind === 'fee')
        {
            return `${this.panelFee?.FeeNo ?? ''} · ${this.panelFee?.CustomerFileNo ?? ''}`;
        }

        if (this.panelFile)
        {
            return `${this.panelFile.CustomerFileNo} · ${this.panelFile.ChassisNo}`;
        }

        return `Next No ${this.code || '...'}`;
    }

    get saveText():
        string
    {
        if (this.panelKind === 'status')
        {
            return this.targetStatus === 'Delivered' ? 'Delivered' : 'Ready';
        }

        if (this.panelKind === 'transfer')
        {
            return this.withoutPayment || !(this.quote && this.quote.FeePerTransfer > 0) ? 'Transfer' : 'Save';
        }

        if (this.panelKind === 'fee')
        {
            return 'Collect';
        }

        return this.panelMode === 'add' ? 'Save' : 'Update';
    }

    get saveIcon():
        string
    {
        return this.panelKind === 'fee'
            ? 'fas fa-cash-register'
            : this.panelKind === 'transfer'
            ? 'fas fa-people-arrows'
            : this.panelKind === 'status'
                ? 'fas fa-check'
                : this.panelMode === 'add' ? 'fas fa-floppy-disk' : 'fas fa-pen-to-square';
    }

    // The panel's main command shows
    get saveVisible():
        boolean
    {
        if (this.panelKind === 'fee')
        {
            return this.panelFee?.Status === 'Pending' || this.panelFee?.Status === 'Due';
        }

        return !this.isView;
    }

    // Transfer : the fee is above 0 (pay first unless ticked)
    get transferHasFee():
        boolean
    {
        return !!this.quote && this.quote.Allowed && this.quote.FeePerTransfer > 0;
    }

    // Deliver : a custody charge is still to be collected
    get deliverNeedsCharge():
        boolean
    {
        return this.targetStatus === 'Delivered' && !!this.custodyQuote && this.custodyQuote.Remaining > 0;
    }

    onWithoutPaymentChange(value: boolean): void
    {
        this.withoutPayment = !!value;
    }

    // View of an opening file that may still be changed
    get canEditPanelFile():
        boolean
    {
        const f = this.panelFile;

        return this.panelKind === 'file' && this.isView && !!f && f.Source === 'Opening' && f.Status === 'Open' && f.TransferCount === 0;
    }


    // Lookups as dropdown items
    get bikeItems():
        LookupOption[]
    {
        return (this.defaults?.Bikes ?? []).map(
            x => ({ ...x, label:`${x.Name} (${x.Code})`, value:x.Id, badge:x.Extra }));
    }

    get customerItems():
        LookupOption[]
    {
        return (this.defaults?.Customers ?? []).map(
            x => ({ ...x, label:`${x.Name} (${x.Code})`, value:x.Id, badge:x.Extra }));
    }

    // New owner : not the current one
    get toCustomerItems():
        LookupOption[]
    {
        const current =
            this.transferFile?.CurrentCustomerId ?? 0;

        return this.customerItems.filter(x => x.Id !== current);
    }

    // Files that can take a transfer : Open
    get transferFileItems():
        any[]
    {
        return this.fileRows
            .filter(x => x.Status === 'Open')
            .map(x => ({ label:`${x.CustomerFileNo} · ${x.ChassisNo}`, value:x.CustomerFileId, badge:x.CurrentCustomerName }));
    }

    get transferFile():
        FileRow | undefined
    {
        return this.transferFileId ? this.fileOf(this.transferFileId) : undefined;
    }

    get documents():
        CustomerFileLookupItem[]
    {
        return this.defaults?.TransferDocuments ?? [];
    }

    get bikePower():
        string
    {
        return this.defaults?.Bikes.find(x => x.Id === this.bikeId)?.Extra ?? '';
    }

    get panelFileTransfers():
        TransferRow[]
    {
        const id = this.panelFile?.CustomerFileId;

        return id ? this.transferRows.filter(x => x.CustomerFileId === id) : [];
    }

    // View of a transfer : document names
    get panelTransferDocuments():
        string
    {
        const codes =
            (this.panelTransfer?.DocumentCodes ?? '').split(',').map(x => x.trim()).filter(x => x);

        if (codes.length === 0)
        {
            return 'None';
        }

        return codes
            .map(c => this.documents.find(d => d.Code === c)?.Name ?? c)
            .join(', ');
    }


    private resetFileFields(): void
    {
        this.code = '';
        this.fileDate = this.todayDate();
        this.invoiceNo = '';
        this.invoiceDate = null;
        this.salesman = '';
        this.bikeId = null;
        this.chassisNo = '';
        this.engineNo = '';
        this.customerId = null;
        this.registrationBy = 'Dealer';
        this.remarks = '';
    }


    private fillFileFields(f: FileRow): void
    {
        this.code = f.CustomerFileNo;
        this.fileDate = CustomerFilesList.parseDate(f.FileDate) ?? this.todayDate();
        this.invoiceNo = f.SalesInvoiceNo;
        this.invoiceDate = CustomerFilesList.parseDate(f.SalesInvoiceDate);
        this.salesman = f.SalesmanName;
        this.bikeId = f.MotorBikeId;
        this.chassisNo = f.ChassisNo;
        this.engineNo = f.EngineNo;
        this.customerId = f.OriginalCustomerId;
        this.registrationBy = f.RegistrationBy || 'Dealer';
        this.remarks = f.Remarks;
    }


    // Add : an opening file (File Register) or a transfer
    add(): void
    {
        if (this.progress.busy)
        {
            return;
        }

        if (this.isTransfer)
        {
            this.openTransfer(null);

            return;
        }

        if (this.isFees)
        {
            this.toast.info('Fees Collection', 'Press Collect on a Pending or Due fee to take the money through the Payment Desk.');

            return;
        }

        this.loadDefaults(
            (): void =>
            {
                this.panelKind = 'file';
                this.panelMode = 'add';
                this.panelFile = null;
                this.panelTransfer = null;

                this.resetFileFields();

                this.code = this.defaults?.NextOpeningNo ?? '';

                this.panelOpened = true;
            });
    }


    view(row: AnyRow): void
    {
        if (this.progress.busy)
        {
            return;
        }

        if (row.Kind === 'fee')
        {
            this.panelKind = 'fee';
            this.panelMode = 'view';
            this.panelFee = row;
            this.panelTransfer = null;
            this.panelFile = this.fileOf(row.CustomerFileId) ?? null;
            this.panelOpened = true;

            this.cdr.detectChanges();

            return;
        }

        this.loadDefaults(
            (): void =>
            {
                if (row.Kind === 'transfer')
                {
                    this.panelKind = 'transfer';
                    this.panelMode = 'view';
                    this.panelTransfer = row;
                    this.panelFile = this.fileOf(row.CustomerFileId) ?? null;
                    this.transferFileId = row.CustomerFileId;
                    this.transferDate = CustomerFilesList.parseDate(row.TransferDate) ?? this.todayDate();
                    this.toCustomerId = row.ToCustomerId;
                    this.tickedDocuments = new Set(row.DocumentCodes.split(',').map(x => x.trim()).filter(x => x));
                    this.remarks = row.Remarks;
                    this.quote = null;
                }
                else
                {
                    this.panelKind = 'file';
                    this.panelMode = 'view';
                    this.panelFile = row;
                    this.panelTransfer = null;

                    this.fillFileFields(row);
                }

                this.panelOpened = true;
            });
    }


    edit(row: AnyRow): void
    {
        if (this.progress.busy || row.Kind !== 'file')
        {
            return;
        }

        if (row.Source !== 'Opening')
        {
            this.toast.info('Invoice File', `${row.CustomerFileNo} comes from its sales invoice : change the invoice instead.`);

            return;
        }

        if (row.Status !== 'Open' || row.TransferCount > 0)
        {
            this.toast.info('Locked', `${row.CustomerFileNo} can only be changed while it is Open with no name transfer.`);

            return;
        }

        this.loadDefaults(
            (): void =>
            {
                this.panelKind = 'file';
                this.panelMode = 'edit';
                this.panelFile = row;
                this.panelTransfer = null;

                this.fillFileFields(row);

                this.panelOpened = true;
            });
    }


    // From the view of an opening file
    editPanelFile(): void
    {
        if (this.panelFile)
        {
            this.edit(this.panelFile);
        }
    }


    closePanel(): void
    {
        if (this.progress.busy)
        {
            return;
        }

        this.panelOpened = false;

        this.cdr.detectChanges();
    }


    // Field changes
    onFileDateChange(value: Date): void { this.fileDate = value; }

    onInvoiceNoChange(value: string | number): void { this.invoiceNo = String(value ?? ''); }

    onInvoiceDateChange(value: Date): void { this.invoiceDate = value; }

    onSalesmanChange(value: string | number): void { this.salesman = String(value ?? ''); }

    onBikeChange(value: number): void { this.bikeId = Number(value) || null; }

    onChassisChange(value: string | number): void { this.chassisNo = String(value ?? ''); }

    onEngineChange(value: string | number): void { this.engineNo = String(value ?? ''); }

    onCustomerChange(value: number): void { this.customerId = Number(value) || null; }

    onRegistrationByChange(value: string): void { this.registrationBy = value || 'Dealer'; }

    onRemarksChange(value: string | number): void { this.remarks = String(value ?? ''); }

    onStatusDateChange(value: Date): void
    {
        this.statusDate = value;

        this.loadCustodyQuote();
    }

    onToCustomerChange(value: number): void { this.toCustomerId = Number(value) || null; }


    onTransferFileChange(value: number): void
    {
        this.transferFileId = Number(value) || null;

        this.toCustomerId = null;

        this.loadQuote();
    }


    onTransferDateChange(value: Date): void
    {
        this.transferDate = value;

        this.loadQuote();
    }


    isTicked(code: string): boolean
    {
        return this.tickedDocuments.has(code);
    }


    onDocumentTick(code: string, value: boolean): void
    {
        const next = new Set(this.tickedDocuments);

        if (value)
        {
            next.add(code);
        }
        else
        {
            next.delete(code);
        }

        this.tickedDocuments = next;
    }


    //===========================================================
    // Row actions
    //===========================================================

    onRowAction(event: ListTableRowActionEvent): void
    {
        if (this.progress.busy)
        {
            return;
        }

        const row = event.row as AnyRow;

        if (row.Kind === 'transfer')
        {
            if (event.key === 'cancelTransfer')
            {
                this.cancelTransfer(row);
            }

            return;
        }

        if (row.Kind === 'fee')
        {
            if (event.key === 'collect')
            {
                this.openCollect(row);
            }
            else if (event.key === 'cancelFee')
            {
                this.cancelFee(row);
            }

            return;
        }

        switch (event.key)
        {
            case 'transfer':
                this.openTransfer(row);
                break;

            case 'ready':
                this.openStatus(row, 'ReadyForDelivery');
                break;

            case 'deliver':
                this.openStatus(row, 'Delivered');
                break;

            case 'back':
                this.confirmStatus(
                    row,
                    row.Status === 'Delivered' ? 'ReadyForDelivery' : 'Open',
                    'Take Back',
                    row.Status === 'Delivered'
                        ? `Take back the delivery of ${row.CustomerFileNo} (collected on ${this.dateLabel(row.CollectedDate)}) ? It goes back to Ready for Delivery.`
                        : `Take back the ready date of ${row.CustomerFileNo} (${this.dateLabel(row.FileReadyDate)}) ? It goes back to Open.`);
                break;

            case 'cancel':
                this.confirmStatus(
                    row,
                    'Cancelled',
                    'Cancel File',
                    `Cancel the opening file ${row.CustomerFileNo} (chassis ${row.ChassisNo}) ? Its chassis becomes free for another file.`);
                break;

            case 'reopen':
                this.confirmStatus(
                    row,
                    'Open',
                    'Reopen File',
                    `Reopen ${row.CustomerFileNo} (chassis ${row.ChassisNo}) ?`);
                break;
        }
    }


    private openStatus(row: FileRow, status: CustomerFileStatus): void
    {
        this.panelKind = 'status';
        this.panelMode = 'add';
        this.panelFile = row;
        this.panelTransfer = null;
        this.targetStatus = status;
        this.statusDate = this.todayDate();
        this.withoutPayment = false;
        this.custodyQuote = null;

        this.panelOpened = true;

        this.loadCustodyQuote();

        this.cdr.detectChanges();
    }


    // Deliver : the custody charge on the collected date
    private loadCustodyQuote(): void
    {
        const file = this.panelFile;

        const date = CustomerFilesList.dateKey(this.statusDate);

        if (this.panelKind !== 'status' || this.targetStatus !== 'Delivered' || !file || !date)
        {
            this.custodyQuote = null;

            return;
        }

        this.custodyLoading = true;

        this.service
            .getCustodyQuote(file.PublicId, date)
            .subscribe
            ({
                next:
                (quote): void =>
                {
                    this.custodyQuote = quote;

                    this.custodyLoading = false;

                    this.cdr.detectChanges();
                },
                error:
                (error: unknown): void =>
                {
                    this.custodyQuote = null;

                    this.custodyLoading = false;

                    this.toast.error('Custody Charge', this.errorText(error, 'The custody charge could not be worked out.'));

                    this.cdr.detectChanges();
                }
            });
    }


    private openTransfer(row: FileRow | null): void
    {
        this.loadDefaults(
            (): void =>
            {
                this.panelKind = 'transfer';
                this.panelMode = 'add';
                this.panelFile = null;
                this.panelTransfer = null;
                this.transferFileId = row?.CustomerFileId ?? null;
                this.transferDate = this.todayDate();
                this.toCustomerId = null;
                this.tickedDocuments = new Set<string>();
                this.remarks = '';
                this.quote = null;
                this.withoutPayment = false;

                this.panelOpened = true;

                this.loadQuote();
            });
    }


    private loadQuote(): void
    {
        const file = this.transferFile;

        const date = CustomerFilesList.dateKey(this.transferDate);

        if (!file || !date || this.isView)
        {
            this.quote = null;

            return;
        }

        this.quoteLoading = true;

        this.service
            .getQuote(file.PublicId, date)
            .subscribe
            ({
                next:
                (quote): void =>
                {
                    this.quote = quote;

                    this.quoteLoading = false;

                    this.cdr.detectChanges();
                },
                error:
                (error: unknown): void =>
                {
                    this.quote = null;

                    this.quoteLoading = false;

                    this.toast.error('Policy', this.errorText(error, 'The name transfer policy could not be loaded.'));

                    this.cdr.detectChanges();
                }
            });
    }


    private confirmStatus(row: FileRow, status: CustomerFileStatus, title: string, message: string): void
    {
        this.confirmDialog.open
        (
            title,
            message,
            (): void =>
            {
                setTimeout(() => this.sendStatus(row, status, '', false));
            },
            title,
            'Close',
            status === 'Cancelled' ? 'danger' : 'primary'
        );
    }


    private sendStatus(row: FileRow, status: CustomerFileStatus, date: string, withoutPayment: boolean): void
    {
        const label = this.statusLabel(status);

        this.progress
            .run<any>(
                'Changing Status',
                `Please wait while ${row.CustomerFileNo} becomes ${label}...`,
                `${row.CustomerFileNo} : ${label}.`,
                this.service.setStatus(row.PublicId, { Status:status, Date:date, WithoutPayment:withoutPayment }))
            .subscribe
            ({
                next:
                (result: any): void =>
                {
                    this.panelOpened = false;

                    if (result && result.Done === false)
                    {
                        // A custody charge was raised : collect it first
                        this.toast.warning('Collect the Custody Charge', result.Message || 'Collect the custody charge first.');
                    }
                    else
                    {
                        this.toast.success('Status Changed', result?.Message || `${row.CustomerFileNo} is now ${label}.`);
                    }

                    this.loadItems();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('Customer File Status Error', error);

                    this.toast.error('Status Not Changed', this.errorText(error, 'The status could not be changed.'));

                    this.cdr.detectChanges();
                }
            });
    }


    private cancelTransfer(row: TransferRow): void
    {
        this.confirmDialog.open
        (
            'Cancel Name Transfer',
            row.Status === 'FeePending'
                ? `Cancel ${row.TransferNo} of ${row.CustomerFileNo} and its fee ${row.FeeNo} ? The transfer never took effect.`
                : `Cancel ${row.TransferNo} of ${row.CustomerFileNo} ? The owner goes back to ${row.FromCustomerName}.`,
            (): void =>
            {
                setTimeout(
                    () =>
                        this.progress
                            .run(
                                'Cancelling Transfer',
                                `Please wait while ${row.TransferNo} is being cancelled...`,
                                `${row.TransferNo} cancelled.`,
                                this.service.cancelNameTransfer(row.PublicId))
                            .subscribe
                            ({
                                next:
                                (): void =>
                                {
                                    if (this.panelOpened && this.panelTransfer?.PublicId === row.PublicId)
                                    {
                                        this.panelOpened = false;
                                    }

                                    this.toast.success('Transfer Cancelled', `${row.TransferNo} cancelled : ${row.FromCustomerName} owns ${row.CustomerFileNo} again.`);

                                    this.loadItems();
                                },
                                error:
                                (error: unknown): void =>
                                {
                                    console.error('Cancel Name Transfer Error:', error);

                                    if (error instanceof HttpErrorResponse && error.status === 409)
                                    {
                                        this.toast.info('Cancel Blocked', this.errorText(error, 'The transfer cannot be cancelled.'));

                                        return;
                                    }

                                    this.toast.error('Cancel Failed', this.errorText(error, 'The transfer could not be cancelled.'));
                                }
                            }));
            },
            'Cancel Transfer',
            'Close',
            'danger'
        );
    }


    //===========================================================
    // Save (the panel's main command)
    //===========================================================

    save(): void
    {
        if (this.progress.busy)
        {
            return;
        }

        if (this.panelKind === 'fee')
        {
            if (this.panelFee && this.saveVisible)
            {
                this.openCollect(this.panelFee);
            }

            return;
        }

        if (this.isView)
        {
            return;
        }

        if (this.panelKind === 'status')
        {
            this.saveStatus();
        }
        else if (this.panelKind === 'transfer')
        {
            this.saveTransfer();
        }
        else
        {
            this.saveFile();
        }
    }


    private saveStatus(): void
    {
        const row = this.panelFile;

        const date = CustomerFilesList.dateKey(this.statusDate);

        if (!row)
        {
            return;
        }

        if (!date)
        {
            this.toast.warning('Check the Form', this.targetStatus === 'Delivered' ? 'Enter the Collected Date.' : 'Enter the Ready Date.');

            return;
        }

        this.sendStatus(row, this.targetStatus, date, this.deliverNeedsCharge && this.withoutPayment);
    }


    private saveFile(): void
    {
        const fileDate = CustomerFilesList.dateKey(this.fileDate);

        const problem =
            !fileDate ? 'Enter the File Date.'
            : !this.bikeId ? 'Choose the motor bike.'
            : !this.chassisNo.trim() ? 'Enter the Chassis No.'
            : !this.engineNo.trim() ? 'Enter the Engine No.'
            : !this.customerId ? 'Choose the customer.'
            : '';

        if (problem)
        {
            this.toast.warning('Check the Form', problem);

            return;
        }

        const body: SaveOpeningFile =
        {
            FileDate:fileDate,
            SalesInvoiceNo:this.invoiceNo.trim(),
            SalesInvoiceDate:CustomerFilesList.dateKey(this.invoiceDate),
            SalesmanName:this.salesman.trim(),
            MotorBikeId:this.bikeId ?? 0,
            ChassisNo:this.chassisNo.trim(),
            EngineNo:this.engineNo.trim(),
            CustomerId:this.customerId ?? 0,
            RegistrationBy:this.registrationBy,
            Remarks:this.remarks.trim()
        };

        const isAdd = this.panelMode === 'add';

        const call$ =
            isAdd
                ? this.service.createOpeningFile(body)
                : this.service.updateOpeningFile(this.panelFile?.PublicId ?? '', body);

        this.progress
            .run<unknown>(
                isAdd ? 'Saving Opening File' : 'Updating Opening File',
                `Please wait while chassis ${body.ChassisNo} is being saved...`,
                isAdd ? 'Opening file saved.' : 'Opening file updated.',
                call$)
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.panelOpened = false;

                    this.toast.success(
                        isAdd ? 'Save Successful' : 'Update Successful',
                        isAdd ? `Opening file for chassis ${body.ChassisNo} saved.` : `${this.code} updated.`);

                    this.loadItems();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('Save Customer File Error', error);

                    this.toast.error('Save Failed', this.errorText(error, 'The opening file could not be saved.'));

                    this.cdr.detectChanges();
                }
            });
    }


    private saveTransfer(): void
    {
        const file = this.transferFile;

        const date = CustomerFilesList.dateKey(this.transferDate);

        const missing =
            this.documents
                .filter(d => d.Extra === 'Required' && !this.tickedDocuments.has(d.Code))
                .map(d => d.Name);

        const problem =
            !file ? 'Choose the customer file.'
            : !date ? 'Enter the Transfer Date.'
            : !this.toCustomerId ? 'Choose the new owner.'
            : this.quote && !this.quote.Allowed ? this.quote.Message
            : missing.length ? `Tick the required document(s) : ${missing.join(', ')}.`
            : '';

        if (problem || !file)
        {
            this.toast.warning('Check the Form', problem);

            return;
        }

        const body: SaveNameTransfer =
        {
            CustomerFilePublicId:file.PublicId,
            TransferDate:date,
            ToCustomerId:this.toCustomerId ?? 0,
            DocumentCodes:[...this.tickedDocuments],
            Remarks:this.remarks.trim(),
            WithoutPayment:this.transferHasFee && this.withoutPayment
        };

        const toName =
            this.customerItems.find(x => x.Id === this.toCustomerId)?.Name ?? 'the new owner';

        this.progress
            .run<any>(
                'Transferring Name',
                `Please wait while the transfer of ${file.CustomerFileNo} to ${toName} is saved...`,
                'Name transfer saved.',
                this.service.createNameTransfer(body))
            .subscribe
            ({
                next:
                (saved: any): void =>
                {
                    this.panelOpened = false;

                    if (saved?.Status === 'FeePending')
                    {
                        this.toast.warning(
                            'Fee to Collect',
                            `${saved.TransferNo} saved : it takes effect when fee ${saved.FeeNo} (${this.money(saved.FeeAmount)}) is collected on Fees Collection.`);
                    }
                    else if (saved?.DueVoucherNo)
                    {
                        this.toast.success(
                            'Name Transferred',
                            `${file.CustomerFileNo} now belongs to ${toName}; fee ${saved.FeeNo} booked as a due (${saved.DueVoucherNo}).`);
                    }
                    else
                    {
                        this.toast.success('Name Transferred', `${file.CustomerFileNo} now belongs to ${toName}.`);
                    }

                    this.loadItems();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('Save Name Transfer Error', error);

                    this.toast.error('Transfer Failed', this.errorText(error, 'The name transfer could not be saved.'));

                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // FEES : cancel a pending fee
    //===========================================================

    private cancelFee(row: FeeRow): void
    {
        const message =
            row.FeeType === 'NameTransfer'
                ? `Cancel fee ${row.FeeNo} (${row.AmountText}) ? Its name transfer ${row.TransferNo} is cancelled too (it never took effect).`
                : `Cancel the custody charge ${row.FeeNo} (${row.AmountText}) ? Delivering the file will raise it again.`;

        this.confirmDialog.open
        (
            'Cancel Fee',
            message,
            (): void =>
            {
                setTimeout(
                    () =>
                        this.progress
                            .run(
                                'Cancelling Fee',
                                `Please wait while ${row.FeeNo} is being cancelled...`,
                                `${row.FeeNo} cancelled.`,
                                this.service.cancelFee(row.PublicId))
                            .subscribe
                            ({
                                next:
                                (): void =>
                                {
                                    if (this.panelOpened && this.panelFee?.PublicId === row.PublicId)
                                    {
                                        this.panelOpened = false;
                                    }

                                    this.toast.success('Fee Cancelled', `${row.FeeNo} cancelled.`);

                                    this.loadItems();
                                },
                                error:
                                (error: unknown): void =>
                                {
                                    console.error('Cancel Fee Error:', error);

                                    this.toast.error('Cancel Failed', this.errorText(error, 'The fee could not be cancelled.'));
                                }
                            }));
            },
            'Cancel Fee',
            'Close',
            'danger'
        );
    }



    //===========================================================
    // FEES : Collect (Payment Desk modal, as the Sales Invoice
    // checkout). One fee per collection; the payment must equal
    // the fee. Posts one Receipt Voucher.
    //===========================================================

    collectOpen:
        boolean =
        false;

    collectFee:
        FeeRow | null =
        null;

    deskRows:
        VoucherDebitLine[] =
        [];

    // Rows handed to app-payment-desk (new copy on add / remove)
    deskInput:
        VoucherDebitLine[] =
        [];

    private deskSnapshot:
        string =
        '[]';

    deskConfirmClose:
        boolean =
        false;

    deskError:
        string =
        '';

    deskMode:
        string =
        '';

    deskLedgerCode:
        string =
        '';

    deskAmountText:
        string =
        '';

    deskModeItems:
        { label:string; value:string }[] =
        [];

    deskLedgerItems:
        { label:string; value:string }[] =
        [];

    private ledgers:
        VoucherLedger[] =
        [];

    ledgersLoaded:
        boolean =
        false;

    // Receipt Voucher : Multi Mode (missing = one mode)
    private multiMode:
        boolean =
        false;


    private openCollect(row: FeeRow): void
    {
        if (row.Status !== 'Pending' && row.Status !== 'Due')
        {
            return;
        }

        this.collectFee = row;
        this.deskRows = [];
        this.deskInput = [];
        this.deskSnapshot = '[]';
        this.deskConfirmClose = false;
        this.deskError = '';
        this.deskMode = '';
        this.deskLedgerCode = '';

        this.buildDeskModeItems();

        this.deskAmountText = this.deskRemaining > 0 ? this.deskRemaining.toFixed(2) : '';

        this.collectOpen = true;

        this.loadPaymentSetup();

        this.cdr.detectChanges();
    }


    // Money ledgers + RV multi mode switch (once)
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


    get collectAmount(): number
    {
        return roundMoney(this.collectFee?.Amount ?? 0);
    }

    get deskTotal(): number
    {
        return roundMoney(this.deskRows.reduce((sum, row) => sum + (Number(row.Amount) || 0), 0));
    }

    get deskRemaining(): number
    {
        return roundMoney(Math.max(0, this.collectAmount - this.deskTotal));
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

    get canCollect(): boolean
    {
        return this.deskRows.length > 0 && this.deskRemaining === 0 && this.deskAllVerified && !this.progress.busy;
    }

    get deskFooterNote(): string
    {
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
            ? `${formatMoney(this.deskRemaining)} more to receive (the fee is collected in full).`
            : 'Fully paid. Press Collect to post the Receipt Voucher.';
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
                .filter(mode => !locked || mode === locked)
                .map(mode => ({ label:mode === 'MFS' ? 'MFS (mobile)' : mode === 'POS' ? 'POS (card)' : mode, value:mode }));

        if (!this.deskModeItems.some(item => item.value === this.deskMode))
        {
            this.deskMode = this.deskModeItems.length === 1 || !this.deskMode ? this.deskModeItems[0]?.value ?? '' : '';
        }

        this.buildDeskLedgerItems();
    }

    // Money accounts of the mode : active, collection, branch rule
    // (as the Receipt Voucher)
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
            this.deskError = `At most ${formatMoney(this.deskRemaining)} is left to receive (no change is given).`;

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
            // MFS : the account's charge % (amount on the desk)
            ChargePercent:mode === 'MFS' ? roundMoney(ledger.ChargePercent) : 0,
            ChargeAmount:mode === 'MFS' ? roundMoney(amount * (ledger.ChargePercent || 0) / 100) : 0,
            // MFS / POS : the customer pays the charge on top
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

    // Details from the Payment Desk (mode / ledger / amount stay)
    onDeskChange(lines: VoucherDebitLine[]): void
    {
        this.deskRows = (lines ?? []).map(row => ({ ...row }));

        this.deskError = '';

        this.cdr.detectChanges();
    }

    onDeskValidChange(value: boolean): void
    {
        // The footer reads the rows; nothing to keep
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
        this.collectOpen = false;

        this.deskConfirmClose = false;

        this.deskError = '';

        this.cdr.detectChanges();
    }


    collect(): void
    {
        const fee = this.collectFee;

        if (!fee || this.progress.busy)
        {
            return;
        }

        if (!this.canCollect)
        {
            this.deskError =
                this.deskRows.length === 0
                    ? 'Add the payment first.'
                    : this.deskRemaining > 0
                        ? `${formatMoney(this.deskRemaining)} more to receive.`
                        : 'Verify every row first.';

            return;
        }

        // Screen-only flag never goes to the server
        const debits =
            this.deskRows.map(
                row =>
                {
                    const copy: any = { ...row };

                    delete copy.Verified;

                    return copy;
                });

        this.progress
            .run<any>(
                'Collecting Fee',
                `Please wait while ${fee.FeeNo} (${fee.AmountText}) is collected...`,
                'Fee collected.',
                this.service.collectFees(
                {
                    FeePublicIds:[fee.PublicId],
                    Date:this.today,
                    Narration:'',
                    Debits:debits
                }))
            .subscribe
            ({
                next:
                (result: any): void =>
                {
                    this.collectOpen = false;

                    if (this.panelOpened && this.panelFee?.PublicId === fee.PublicId)
                    {
                        this.panelOpened = false;
                    }

                    const done =
                        result?.CompletedTransfers?.length
                            ? ` Transfer ${result.CompletedTransfers.join(', ')} took effect.`
                            : fee.FeeType === 'Custody' && fee.Status === 'Pending'
                                ? ' Now deliver the file.'
                                : '';

                    this.toast.success('Fee Collected', `${fee.FeeNo} collected by ${result?.ReceiptVoucherNo ?? 'a Receipt Voucher'}.${done}`);

                    this.loadItems();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('Collect Fee Error', error);

                    this.deskError = this.errorText(error, 'The fee could not be collected.');

                    this.toast.error('Collect Failed', this.deskError);

                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // History
    //===========================================================

    private showHistory(title: string, call$: ReturnType<CustomerFilesService['getHistory']>): void
    {
        call$
            .subscribe
            ({
                next:
                (response: any[]): void =>
                {
                    this.historyTitle = title;

                    this.historyItems =
                        (response ?? []).map(
                            h =>
                            ({
                                title:h.activityTitle ?? h.ActivityTitle,
                                description:h.activityDescription ?? h.ActivityDescription,
                                user:h.performedByName ?? h.PerformedByName ?? 'System',
                                dateTime:new Date(h.performedDate ?? h.PerformedDate).toLocaleString(),
                                badge:h.activityType ?? h.ActivityType
                            }));

                    this.historyOpened = true;

                    this.cdr.detectChanges();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('History Load Failed:', error);

                    this.toast.error('History', 'Failed to load the customer file history.');
                }
            });
    }


    openHistory(): void
    {
        this.showHistory('Customer Files History', this.service.getHistory());
    }


    openFileHistory(): void
    {
        const f = this.panelFile;

        if (f)
        {
            this.showHistory(`${f.CustomerFileNo} History`, this.service.getFileHistory(f.CustomerFileId));
        }
    }


    closeHistory(): void
    {
        this.historyOpened = false;

        this.cdr.detectChanges();
    }


    private errorText(error: unknown, fallback: string): string
    {
        const err = error as any;

        const body = err?.error;

        if (err?.status === 403)
        {
            return body?.message || body?.Message || 'You do not have permission for this action.';
        }

        if (typeof body === 'string' && body.trim())
        {
            return body.trim();
        }

        return body?.message || body?.Message || body?.title || fallback;
    }


    //===========================================================
    // Summary line
    //===========================================================

    countOf(status: CustomerFileStatus): number
    {
        return this.fileRows.filter(x => x.Status === status && (!this.branchFilter || x.BranchId === this.branchFilter)).length;
    }

    feeTotal(status: CustomerFileFeeStatus): number
    {
        return this.feeRows
            .filter(x => x.Status === status && (!this.branchFilter || this.fileOf(x.CustomerFileId)?.BranchId === this.branchFilter))
            .reduce((sum, x) => sum + (x.Amount || 0), 0);
    }

    get transferFeeTotal(): number
    {
        return (this.viewRows as TransferRow[]).reduce((sum, x) => sum + (x.FeeAmount || 0), 0);
    }

    summaryText(value: number): string
    {
        return value.toLocaleString('en-US');
    }
}
