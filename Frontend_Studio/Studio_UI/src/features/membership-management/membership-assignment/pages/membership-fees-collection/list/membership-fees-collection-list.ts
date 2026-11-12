//===============================================================
// Membership Fees Collection : list (hand-written page, owner
// 2026-11-11 : NEVER run Code Sync for it again)
//
// Tabs : To Collect / Collected / Refunded / Cancelled / All.
//   To Collect : Pending memberships with a fee (Membership Status
//                enrolls them). Collect opens the Payment Desk (as
//                Customer Files / Sales Invoice); the payment must
//                equal the fee; one Receipt Voucher is posted and
//                the membership turns Active.
//   Collected  : Cancel (reason) while nothing was used : the
//                Receipt Voucher is cancelled, the membership is
//                Pending again. Refund (reason) once the membership
//                was cancelled on Membership Status and nothing was
//                used : the whole fee is credited to the customer's
//                ledger by a Journal Voucher. Used = no cancel, no
//                refund.
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
    Router
}
from '@angular/router';

import
{
    MembershipFeeRow
}
from '../../../models/membership-fees-collection.model';

import
{
    MembershipFeesCollectionService
}
from '../../../services/membership-fees-collection.service';

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
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';

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
    TextboxComponent
}
from '../../../../../../shared/components/controls/textbox/textbox';

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


//===============================================================
// Row with display texts
//===============================================================

type FeeRow =
    MembershipFeeRow
    &
    {
        RowKey:string;
        DateText:string;
        AmountText:string;
        CustomerText:string;
        VoucherText:string;
        StatusText:string;
    };

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


@Component(
{
    selector:'membership-fees-collection-list',

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
        ControlTabsComponent,
        DropdownComponent,
        SearchDropdownComponent,
        TextboxComponent,
        PaymentDeskComponent,
        HistoryDrawerComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        ToastComponent
    ],

    templateUrl:'./membership-fees-collection-list.html',

    styleUrl:'./membership-fees-collection-list.css'
})

export class MembershipFeesCollectionList
    implements OnInit
{
    private readonly service =
        inject(MembershipFeesCollectionService);

    private readonly lookup =
        inject(AccountingLookupService);

    private readonly voucherSwitches =
        inject(VoucherSwitchesService);

    private readonly router =
        inject(Router);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges()
        );


    loading = false;

    loadFailed = false;

    rows: FeeRow[] = [];

    filteredRows: FeeRow[] = [];

    pagedRows: FeeRow[] = [];

    searchText = '';

    selectedTab = 'To Collect';

    currentPage = 1;

    pageSize = 10;

    today = '';

    branchId = 0;

    branchName = '';

    readonly tabs: ControlTab[] =
    [
        { id:'To Collect', label:'To Collect' },
        { id:'Paid', label:'Collected' },
        { id:'Refunded', label:'Refunded' },
        { id:'Cancelled', label:'Cancelled' },
        { id:'all', label:'All' }
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
        { header:'Membership No', field:'MembershipNo', width:'130px', align:'left', sortable:true },
        { header:'Card', field:'CardName', width:'110px', align:'left', sortable:true },
        { header:'Customer', field:'CustomerText', width:'200px', align:'left', sortable:true },
        { header:'Chassis', field:'ChassisNo', width:'150px', align:'left', sortable:true, priority:2 },
        { header:'Date', field:'DateText', width:'100px', align:'center', sortable:true },
        { header:'Fee (Tk)', field:'AmountText', width:'100px', align:'right', sortable:true },
        { header:'Voucher', field:'VoucherText', width:'200px', align:'left', sortable:true, priority:2 },
        { header:'Status', field:'StatusText', type:'status', width:'110px', align:'center', sortable:true },
        { header:'Actions', field:'actions', type:'actions', width:'150px', align:'center' }
    ];

    readonly rowActions: ListTableRowAction[] =
    [
        { key:'collect', icon:'fas fa-cash-register', title:'Collect the fee (Payment Desk)', tone:'success', visible:(r: FeeRow) => r.Kind === 'ToCollect' && !r.Note },
        { key:'cancel', icon:'fas fa-ban', title:'Cancel the collection (nothing used yet)', tone:'danger', visible:(r: FeeRow) => r.CanCancel },
        { key:'refund', icon:'fas fa-hand-holding-dollar', title:'Refund to the customer\'s ledger (membership cancelled, unused)', tone:'primary', visible:(r: FeeRow) => r.CanRefund },
        { key:'info', icon:'fas fa-circle-info', title:'Why no action', tone:'default', visible:(r: FeeRow) => !!r.Note && !r.CanCancel && !r.CanRefund },
        { key:'history', icon:'fas fa-clock-rotate-left', title:'History', tone:'default', visible:(r: FeeRow) => r.Kind === 'Fee' }
    ];

    readonly tableActions =
        { view:false, edit:false, delete:false };


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

    goToStatus(): void
    {
        void this.router.navigate(['/membership-management/membership-assignment/membership-status/list']);
    }

    private load(): void
    {
        this.loading = true;

        this.loadFailed = false;

        this.cdr.detectChanges();

        this.service
            .getAll()
            .subscribe
            ({
                next:
                    page =>
                    {
                        this.loading = false;

                        this.today = page.Today;

                        this.branchId = page.BranchId;

                        this.branchName = page.BranchName;

                        this.rows =
                            page.Rows.map
                            (
                                x =>
                                ({
                                    ...x,
                                    RowKey:x.Kind === 'Fee' ? x.PublicId : `m${x.MembershipId}`,
                                    DateText:this.dateText(x.Date),
                                    AmountText:formatMoney(x.Amount),
                                    CustomerText:x.CustomerCode ? `${x.CustomerName} (${x.CustomerCode})` : x.CustomerName,
                                    VoucherText:
                                        x.Kind === 'ToCollect'
                                            ? (x.Note ? x.Note : 'Not collected')
                                            : x.Status === 'Refunded'
                                                ? `${x.ReceiptVoucherNo} · refund ${x.RefundJournalVoucherNo}`
                                                : x.Status === 'Paid' && x.Used
                                                    ? `${x.ReceiptVoucherNo} · used`
                                                    : x.ReceiptVoucherNo,
                                    StatusText:x.Status === 'Paid' ? 'Collected' : x.Status
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

                        this.toast.error('Load Failed', this.errorText(error, 'The membership fees could not be loaded.'));
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

    totalOf(status: string): number
    {
        return this.rows.filter(x => x.Status === status).reduce((sum, x) => sum + x.Amount, 0);
    }

    private applyFilters(): void
    {
        const text = this.searchText.trim().toLowerCase();

        this.filteredRows =
            this.rows
                .filter(x => this.selectedTab === 'all' || x.Status === this.selectedTab)
                .filter
                (
                    x =>
                        !text
                        ||
                        [x.MembershipNo, x.FeeNo, x.CardName, x.CustomerName, x.CustomerCode, x.CustomerPhone, x.ChassisNo, x.ReceiptVoucherNo, x.RefundJournalVoucherNo]
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
        this.selectedTab = String(value || 'all');
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
            DateText:'Date',
            AmountText:'Amount'
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
    // Row actions
    //===========================================================

    onRowAction(event: ListTableRowActionEvent): void
    {
        const row = event.row as FeeRow;

        switch (event.key)
        {
            case 'collect':
                this.openCollect(row);
                break;

            case 'cancel':
                this.openReason(row, 'cancel');
                break;

            case 'refund':
                this.openReason(row, 'refund');
                break;

            case 'info':
                this.toast.info(row.MembershipNo, row.Note);
                break;

            case 'history':
                this.showHistory(row);
                break;
        }
    }


    //===========================================================
    // Cancel / Refund (reason)
    //===========================================================

    reasonRow: FeeRow | null = null;

    reasonKind: 'cancel' | 'refund' = 'cancel';

    reasonText = '';

    reasonError = '';

    private openReason(row: FeeRow, kind: 'cancel' | 'refund'): void
    {
        this.reasonRow = row;
        this.reasonKind = kind;
        this.reasonText = '';
        this.reasonError = '';
        this.cdr.detectChanges();
    }

    closeReason(): void
    {
        this.reasonRow = null;
        this.cdr.detectChanges();
    }

    onReasonText(value: string | number): void
    {
        this.reasonText = String(value ?? '');
        this.reasonError = '';
    }

    confirmReason(): void
    {
        const row = this.reasonRow;

        if (!row || this.progress.busy)
        {
            return;
        }

        const reason = this.reasonText.replace(/\s+/g, ' ').trim();

        if (reason.length < 5)
        {
            this.reasonError = 'Reason is required : at least 5 characters.';
            this.cdr.detectChanges();

            return;
        }

        const refund = this.reasonKind === 'refund';

        this.progress
            .run<any>(
                refund ? 'Refunding Fee' : 'Cancelling Collection',
                refund
                    ? `Please wait while ${this.money(row.Amount)} is credited to ${row.CustomerName}...`
                    : `Please wait while ${row.FeeNo} is cancelled...`,
                refund ? 'Fee refunded.' : 'Collection cancelled.',
                refund ? this.service.refund(row.PublicId, reason) : this.service.cancel(row.PublicId, reason))
            .subscribe
            ({
                next:
                    (result: any) =>
                    {
                        this.reasonRow = null;

                        this.toast.success(
                            refund ? 'Fee Refunded' : 'Collection Cancelled',
                            refund
                                ? `${row.FeeNo} : Tk ${this.money(row.Amount)} credited to ${row.CustomerName}'s ledger by ${result?.VoucherNo ?? 'a Journal Voucher'}.`
                                : `${row.FeeNo} cancelled (${row.ReceiptVoucherNo} cancelled); ${row.MembershipNo} is Pending again.`);

                        this.load();
                    },
                error:
                    error =>
                    {
                        this.reasonError = this.errorText(error, refund ? 'The fee could not be refunded.' : 'The collection could not be cancelled.');
                        this.cdr.detectChanges();
                    }
            });
    }


    //===========================================================
    // Collect (Payment Desk modal, as Customer Files). One
    // membership per collection; the payment must equal the fee.
    //===========================================================

    collectOpen = false;

    collectRow: FeeRow | null = null;

    deskRows: VoucherDebitLine[] = [];

    // Rows handed to app-payment-desk (new copy on add / remove)
    deskInput: VoucherDebitLine[] = [];

    private deskSnapshot = '[]';

    deskConfirmClose = false;

    deskError = '';

    deskMode = '';

    deskLedgerCode = '';

    deskAmountText = '';

    deskModeItems: { label:string; value:string }[] = [];

    deskLedgerItems: { label:string; value:string }[] = [];

    private ledgers: VoucherLedger[] = [];

    ledgersLoaded = false;

    // Receipt Voucher : Multi Mode (missing = one mode)
    private multiMode = false;

    private openCollect(row: FeeRow): void
    {
        if (row.Kind !== 'ToCollect')
        {
            return;
        }

        this.collectRow = row;
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
                    (ledgers: VoucherLedger[]) =>
                    {
                        this.ledgers = ledgers ?? [];

                        this.ledgersLoaded = true;

                        this.buildDeskLedgerItems();

                        this.cdr.detectChanges();
                    },
                error:
                    () =>
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
        return roundMoney(this.collectRow?.Amount ?? 0);
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
            : 'Fully paid. Press Collect to post the Receipt Voucher; the membership turns Active.';
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
        const row = this.collectRow;

        if (!row || this.progress.busy)
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
                line =>
                {
                    const copy: any = { ...line };

                    delete copy.Verified;

                    return copy;
                });

        this.progress
            .run<any>(
                'Collecting Fee',
                `Please wait while ${row.MembershipNo} (${row.AmountText}) is collected...`,
                'Fee collected.',
                this.service.collect(
                {
                    MembershipId:row.MembershipId,
                    Date:this.today,
                    Narration:'',
                    Debits:debits
                }))
            .subscribe
            ({
                next:
                    (result: any) =>
                    {
                        this.collectOpen = false;

                        this.toast.success(
                            'Fee Collected',
                            `${row.MembershipNo} : ${result?.FeeNo ?? ''} collected by ${result?.VoucherNo ?? 'a Receipt Voucher'}; the membership is Active.`);

                        this.load();
                    },
                error:
                    error =>
                    {
                        this.deskError = this.errorText(error, 'The fee could not be collected.');

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

    private showHistory(row: FeeRow): void
    {
        this.service
            .getHistory(row.MembershipFeeId)
            .subscribe
            ({
                next:
                    (response: any[]) =>
                    {
                        this.historyTitle = `${row.FeeNo} · History`;

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
                    () => this.toast.error('History', 'The history could not be loaded.')
            });
    }

    closeHistory(): void
    {
        this.historyOpened = false;

        this.cdr.detectChanges();
    }
}
