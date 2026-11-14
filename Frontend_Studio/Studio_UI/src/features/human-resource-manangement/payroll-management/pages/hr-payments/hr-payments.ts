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

import { PageHeaderComponent } from '../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../shared/components/layout/page-canvas/page-canvas';
import { ControlTab, ControlTabsComponent } from '../../../../../shared/components/controls/control-tabs/control-tabs';
import { DropdownComponent } from '../../../../../shared/components/controls/dropdown/dropdown';
import { SearchDropdownComponent } from '../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../../shared/components/controls/textbox/textbox';
import { DatepickerComponent } from '../../../../../shared/components/controls/datepicker/datepicker';
import { SearchBoxComponent } from '../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../shared/components/utilities/command-center/command-center';
import { ListTableActions, ListTableColumn, ListTableComponent, ListTableRowAction, ListTableRowActionEvent } from '../../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../../shared/components/controls/pagination/pagination';
import { ToastComponent } from '../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { PaymentDeskComponent } from '../../../../../shared/components/accounting/payment-desk/payment-desk';
import { AccountingLookupService } from '../../../../../shared/components/accounting/accounting-lookup.service';

import
{
    PaymentMode,
    VoucherDebitLine,
    VoucherLedger,
    debitDetailIssue,
    emptyDebitLine,
    isDebitRowReady,
    needsDetails
}
from '../../../../../shared/components/accounting/accounting.models';

import { HrProgressService } from '../../../services/hr-progress.service';
import { hrToDate, hrToText } from '../../../services/hr-date';

import
{
    HR_PAYMENT_PAGES,
    HrPayment,
    HrPaymentGroup,
    HrPaymentLine,
    HrPaymentListItem,
    HrPaymentPage,
    HrPaymentSource,
    hrPayDay,
    hrPayMoney
}
from '../../models/hr-payments.model';

import
{
    HrPaymentsService
}
from '../../services/hr-payments.service';

import
{
    HR_REPORT_PRINT_KEY,
    openHrPrint,
    saveHrReport
}
from '../../../print/hr-print';


type ListRow =
    HrPaymentListItem
    &
    {
        DateText: string;
        AmountText: string;
        StatusText: string;
        StatusColor: string;
    };

// The money account of each payment mode (as the Payment Voucher)
const MODE_LEDGER_TYPES:
    Record<string, string> =
{
    Cash:'Cash',
    Bank:'Bank',
    Check:'Bank',
    MFS:'MFS'
};

const MODES:
    PaymentMode[] =
    ['Cash', 'Bank', 'Check', 'MFS'];

const money2 =
    (value: number): number => Math.round((Number(value) || 0) * 100) / 100;


//===============================================================
// Payments of Human Resource : ONE page for
//
//   Payroll Management > Payroll Payments   Salary, Overtime
//   Provident Fund     > PF Payments        PF Settlement, PF Loan
//
// (the route says which : data.hrPayGroup = 'payroll' | 'pf')
//
//   list       the payments : view, print, bank advice
//   add        pick what is paid and the source (a posted salary
//              sheet, a settlement, a loan) : its employees come
//              with Payable / Paid / Due; type what each gets (no
//              more than the due), then the money on the Payment
//              Desk. Saving writes a Payment Voucher, posted at
//              once.
//   view/:id   one payment; it is never edited : Cancel takes it
//              and its voucher back.
//===============================================================

@Component(
{
    selector:'hr-payments',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        DropdownComponent,
        SearchDropdownComponent,
        TextboxComponent,
        DatepickerComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        PaymentDeskComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./hr-payments.html',
    styleUrl:'./hr-payments.css'
})
export class HrPaymentsPage
implements OnInit
{
    private readonly service = inject(HrPaymentsService);

    private readonly lookup = inject(AccountingLookupService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    group:
        HrPaymentGroup = 'payroll';

    page:
        HrPaymentPage = HR_PAYMENT_PAGES['payroll'];

    mode:
        'list' | 'add' | 'view' = 'list';

    loading =
        false;

    loadFailed =
        false;

    isSaving =
        false;

    readonly asDate = hrToDate;

    money(value: number): string
    {
        return hrPayMoney(value);
    }

    day(value: string): string
    {
        return hrPayDay(value);
    }

    //===========================================================
    // The list
    //===========================================================

    readonly listConfig:
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

    readonly formConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:false,
        reserveFooterSpace:false,
        bodyScrollable:true,
        fixedHeight:true
    };

    private all:
        ListRow[] = [];

    rows:
        ListRow[] = [];

    searchText =
        '';

    currentPage =
        1;

    pageSize =
        10;

    totalRecords =
        0;

    typeFilter =
        '';

    statusFilter =
        '';

    // Tabs : every payment, those of this month, those of last month
    readonly tabs:
        ControlTab[] =
    [
        { id:'all', label:'All Payments' },
        { id:'this', label:'This Month' },
        { id:'last', label:'Last Month' }
    ];

    selectedTab =
        'all';

    // yyyy-MM of the tab ('' : every month)
    private get tabMonth(): string
    {
        if (this.selectedTab === 'all')
        {
            return '';
        }

        const now = new Date();

        const date = new Date(now.getFullYear(), now.getMonth() - (this.selectedTab === 'last' ? 1 : 0), 1);

        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    onTab(value: string):
        void
    {
        this.selectedTab = value || 'all';
        this.currentPage = 1;
        this.apply();
    }

    get typeFilterItems(): { label: string; value: string }[]
    {
        return [{ label:'All Types', value:'' }, ...this.page.types];
    }

    readonly statusItems =
    [
        { label:'All Status', value:'' },
        { label:'Paid', value:'active' },
        { label:'Cancelled', value:'cancelled' }
    ];

    summaryItems:
        { label: string; value: string }[] = [];

    readonly actions:
        ListTableActions =
    {
        view:true,
        edit:false,
        delete:false
    };

    readonly rowActions:
        ListTableRowAction[] =
    [
        { key:'print', icon:'fas fa-print', title:'Print the Payment Voucher of the payment', tone:'primary' }
    ];

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Code', field:'Code', width:'100px', align:'center' },
        { header:'Date', field:'DateText', width:'110px', align:'center' },
        { header:'Paid For', field:'PaymentTypeText', width:'120px', align:'left' },
        { header:'Reference', field:'SourceCode', width:'110px', align:'center' },
        { header:'Branch', field:'BranchName', width:'170px', align:'left' },
        { header:'Employees', field:'EmployeeCount', width:'95px', align:'center' },
        { header:'Amount', field:'AmountText', width:'130px', align:'right' },
        { header:'Modes', field:'PaymentModes', width:'130px', align:'left' },
        { header:'Payment Voucher', field:'PaymentVoucherNo', width:'190px', align:'center' },
        { header:'Status', field:'StatusText', width:'110px', align:'left', dotField:'StatusColor' },
        { header:'Actions', field:'actions', type:'actions', width:'100px', align:'center' }
    ];

    //===========================================================
    // Add
    //===========================================================

    // 1 : what is paid and to whom; 2 : how the money goes out
    step:
        1 | 2 = 1;

    paymentType =
        '';

    get paymentTypeText(): string
    {
        return this.page.types.find(x => x.value === this.paymentType)?.label ?? '';
    }

    // Step 1 is complete : on to the payment
    next():
        void
    {
        const problem =
            !this.sourceId ? `Pick the ${this.sourceLabel.toLowerCase()}.`
            : !this.paymentDate ? 'Payment Date is required.'
            : !(this.payTotal > 0) ? 'Type the amount to pay for at least one employee.'
            : '';

        if (problem)
        {
            this.toast.error('Validation', problem);
            return;
        }

        // (the modes entered before no longer fit the amount)
        if (this.deskTotal > this.payTotal)
        {
            this.clearDesk();
        }

        this.step = 2;
        this.afterAmounts();
    }

    back():
        void
    {
        this.step = 1;
        this.cdr.detectChanges();
    }

    sources:
        HrPaymentSource[] = [];

    sourceId =
        0;

    paymentDate =
        hrToText(new Date());

    remarks =
        '';

    // The employees of the source, with what each gets now
    dues:
        (HrPaymentLine & { AmountText: string })[] = [];

    get source(): HrPaymentSource | undefined
    {
        return this.sources.find(x => x.SourceId === this.sourceId);
    }

    get sourceLabel(): string
    {
        return this.page.sourceLabel[this.paymentType] ?? 'Reference';
    }

    get sourceItems(): { label: string; value: number }[]
    {
        return this.sources.map(x => ({ label:x.Text, value:x.SourceId }));
    }

    get payTotal(): number
    {
        return money2(this.dues.reduce((sum, x) => sum + (Number(x.Amount) || 0), 0));
    }

    get dueTotal(): number
    {
        return money2(this.dues.reduce((sum, x) => sum + x.Due, 0));
    }

    get payCount(): number
    {
        return this.dues.filter(x => x.Amount > 0).length;
    }

    //-----------------------------------------------------------
    // The money : payment mode rows, then the Payment Desk for the
    // details of the Check / MFS rows
    //-----------------------------------------------------------

    private ledgers:
        VoucherLedger[] = [];

    deskRows:
        VoucherDebitLine[] = [];

    deskInput:
        VoucherDebitLine[] = [];

    deskMode:
        PaymentMode = 'Cash';

    deskLedgerCode =
        '';

    deskAmountText =
        '';

    readonly modeItems =
        MODES.map(x => ({ label:x, value:x }));

    get ledgerItems(): { label: string; value: string }[]
    {
        const type = MODE_LEDGER_TYPES[this.deskMode] ?? '';

        return this.ledgers
            .filter(x => x.LedgerType === type && x.IsActive && x.PaymentAccount)
            .map(x => ({ label:x.LedgerName, value:x.LedgerCode }));
    }

    get deskTotal(): number
    {
        return money2(this.deskRows.reduce((sum, x) => sum + (Number(x.Amount) || 0), 0));
    }

    get deskRemaining(): number
    {
        return money2(Math.max(0, this.payTotal - this.deskTotal));
    }

    get deskNeedsDetails(): boolean
    {
        return this.deskRows.some(x => needsDetails(x.Mode));
    }

    get deskAllReady(): boolean
    {
        return this.deskRows.every(x => isDebitRowReady(x));
    }

    //-----------------------------------------------------------
    // The Payment Desk is a pop-up (as on the voucher pages) :
    // Okay keeps the details, Close leaves them as they were
    //-----------------------------------------------------------

    deskOpen =
        false;

    private deskBefore:
        VoucherDebitLine[] = [];

    needsDesk(row: VoucherDebitLine): boolean
    {
        return needsDetails(row.Mode);
    }

    get deskDetailCount(): number
    {
        return this.deskRows.filter(x => needsDetails(x.Mode)).length;
    }

    get deskVerified(): number
    {
        return this.deskRows.filter(x => needsDetails(x.Mode) && isDebitRowReady(x)).length;
    }

    openDesk():
        void
    {
        this.deskBefore = this.deskRows.map(x => ({ ...x }));
        this.deskInput = this.deskRows.map(x => ({ ...x }));
        this.deskOpen = true;
        this.cdr.detectChanges();
    }

    okDesk():
        void
    {
        this.deskOpen = false;
        this.cdr.detectChanges();
    }

    closeDesk():
        void
    {
        this.deskRows = this.deskBefore.map(x => ({ ...x }));
        this.deskInput = this.deskRows.map(x => ({ ...x }));
        this.deskOpen = false;
        this.cdr.detectChanges();
    }

    rowState(row: VoucherDebitLine): string
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

    //===========================================================
    // View
    //===========================================================

    payment:
        HrPayment | null = null;

    cancelling =
        false;

    cancelReason =
        '';

    get pageTitle(): string
    {
        return this.mode === 'list' ? this.page.title
            : this.mode === 'add' ? this.page.singular
            : `View ${this.page.singular}`;
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.group =
            this.route.snapshot.data['hrPayGroup'] === 'pf' ? 'pf' : 'payroll';

        this.page =
            HR_PAYMENT_PAGES[this.group];

        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/') ? 'view' : url.includes('/add') ? 'add' : 'list';

        if (this.mode === 'list')
        {
            this.loadList();
        }
        else if (this.mode === 'view')
        {
            this.loadPayment(this.route.snapshot.paramMap.get('id') ?? '');
        }
        else
        {
            this.lookup
                .getLedgers(true)
                .subscribe(
                {
                    next:ledgers =>
                    {
                        this.ledgers = ledgers ?? [];
                        this.cdr.detectChanges();
                    },
                    error:() => this.toast.error('Error', 'The money accounts could not be loaded.')
                });

            this.onType(this.page.types[0].value);
        }
    }

    private failed(error: any, fallback: string):
        void
    {
        this.loading = false;
        this.loadFailed = true;
        this.toast.error('Error', error?.error?.message ?? fallback);
        this.cdr.detectChanges();
    }

    //===========================================================
    // List
    //===========================================================

    loadList():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.service
            .getList(this.group)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        rows.map(x => ({
                            ...x,
                            DateText:hrPayDay(x.PaymentDate),
                            AmountText:hrPayMoney(x.TotalAmount),
                            StatusText:x.IsCancelled ? 'Cancelled' : 'Paid',
                            StatusColor:x.IsCancelled ? '#b4232c' : '#047857'
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error => this.failed(error, 'The payments could not be loaded.')
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const month =
            this.tabMonth;

        const matched =
            this.all.filter(x =>
                (!month || (x.PaymentDate ?? '').startsWith(month))
                &&
                (!this.typeFilter || x.PaymentType === this.typeFilter)
                &&
                (!this.statusFilter || (this.statusFilter === 'cancelled') === x.IsCancelled)
                &&
                (!find || [x.Code, x.DateText, x.PaymentTypeText, x.SourceCode, x.BranchName, x.PaymentModes, x.PaymentVoucherNo, x.Remarks]
                    .some(v => (v ?? '').toLowerCase().includes(find))));

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        const live = matched.filter(x => !x.IsCancelled);

        this.summaryItems =
        [
            { label:'Payments', value:live.length.toLocaleString('en-US') },
            { label:'Cancelled', value:(matched.length - live.length).toLocaleString('en-US') },
            { label:'Paid', value:`Tk ${hrPayMoney(live.reduce((sum, x) => sum + x.TotalAmount, 0))}` }
        ];

        this.cdr.detectChanges();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;
        this.apply();
    }

    onTypeFilter(value: any):
        void
    {
        this.typeFilter = String(value ?? '');
        this.currentPage = 1;
        this.apply();
    }

    onStatusFilter(value: any):
        void
    {
        this.statusFilter = String(value ?? '');
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
        // Newest first
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    open(row: ListRow):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    goToList():
        void
    {
        void this.router.navigate([this.mode === 'view' ? '../../list' : '../list'], { relativeTo:this.route });
    }

    onRowAction(event: ListTableRowActionEvent):
        void
    {
        if (event.key === 'print')
        {
            this.printVoucher(event.row as ListRow);
        }
    }

    //===========================================================
    // Add : what is paid, the source and its employees
    //===========================================================

    onType(value: any):
        void
    {
        this.step = 1;
        this.paymentType = String(value ?? '');
        this.sourceId = 0;
        this.sources = [];
        this.dues = [];
        this.clearDesk();
        this.loading = true;
        this.cdr.detectChanges();

        this.service
            .getSources(this.group, this.paymentType)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:sources =>
                {
                    this.sources = sources;
                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'What can be paid could not be loaded.')
            });
    }

    onSource(value: any):
        void
    {
        this.sourceId = Number(value) || 0;
        this.dues = [];
        this.clearDesk();

        if (!this.sourceId)
        {
            this.cdr.detectChanges();
            return;
        }

        this.loading = true;
        this.cdr.detectChanges();

        this.service
            .getDues(this.group, this.paymentType, this.sourceId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:lines =>
                {
                    // everything that is due, to begin with
                    this.dues =
                        lines
                            .filter(x => x.Due > 0)
                            .map(x => ({ ...x, Amount:x.Due, AmountText:String(x.Due) }));

                    this.loading = false;
                    this.afterAmounts();
                },
                error:error => this.failed(error, 'What is due could not be loaded.')
            });
    }

    onDate(date: Date | null):
        void
    {
        this.paymentDate = hrToText(date);
        this.cdr.detectChanges();
    }

    onRemarks(value: any):
        void
    {
        this.remarks = String(value ?? '');
    }

    // An amount typed for an employee : 0 up to what is due
    onAmount(line: HrPaymentLine & { AmountText: string }, event: Event):
        void
    {
        const text =
            ((event.target as HTMLInputElement).value ?? '').replace(/,/g, '').trim();

        let amount =
            money2(Number(text));

        if (!(amount > 0))
        {
            amount = 0;
        }

        if (amount > line.Due)
        {
            amount = line.Due;
            this.toast.info(this.page.singular, `${line.EmployeeCode} ${line.EmployeeName} : no more than the due, Tk ${hrPayMoney(line.Due)}.`);
        }

        line.Amount = amount;
        line.AmountText = amount ? String(amount) : '';

        (event.target as HTMLInputElement).value = line.AmountText;

        this.afterAmounts();
    }

    payAllDue():
        void
    {
        this.dues.forEach(x =>
        {
            x.Amount = x.Due;
            x.AmountText = String(x.Due);
        });

        this.afterAmounts();
    }

    payNone():
        void
    {
        this.dues.forEach(x =>
        {
            x.Amount = 0;
            x.AmountText = '';
        });

        this.afterAmounts();
    }

    // The amounts changed : the next payment mode row offers what
    // is left
    private afterAmounts():
        void
    {
        this.deskAmountText = this.deskRemaining > 0 ? String(this.deskRemaining) : '';
        this.cdr.detectChanges();
    }

    //===========================================================
    // Add : the money
    //===========================================================

    private clearDesk():
        void
    {
        this.deskRows = [];
        this.deskInput = [];
        this.deskAmountText = '';
        this.deskOpen = false;
    }

    onDeskMode(value: any):
        void
    {
        this.deskMode = (String(value ?? 'Cash') as PaymentMode);
        this.deskLedgerCode = '';
        this.cdr.detectChanges();
    }

    onDeskLedger(value: any):
        void
    {
        this.deskLedgerCode = String(value ?? '');
        this.cdr.detectChanges();
    }

    onDeskAmount(value: any):
        void
    {
        this.deskAmountText = String(value ?? '');
    }

    addDeskRow():
        void
    {
        const ledger =
            this.ledgers.find(x => x.LedgerCode === this.deskLedgerCode);

        if (!ledger)
        {
            this.toast.error(this.page.singular, 'Pick the account the money goes out of.');
            return;
        }

        const amount =
            money2(Number(this.deskAmountText.replace(/,/g, '')));

        if (!(amount > 0))
        {
            this.toast.error(this.page.singular, 'Amount must be more than 0.');
            return;
        }

        if (amount > this.deskRemaining)
        {
            this.toast.error(this.page.singular, `Only Tk ${hrPayMoney(this.deskRemaining)} is left to pay.`);
            return;
        }

        const mode = this.deskMode;

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
            // MFS : the account's charge % (the amount on the desk);
            // the company pays it unless the desk says the payee
            ChargePercent:mode === 'MFS' ? money2(ledger.ChargePercent) : 0,
            ChargeAmount:mode === 'MFS' ? money2(amount * (ledger.ChargePercent || 0) / 100) : 0,
            ChargeBorneBy:mode === 'MFS' ? 'Company' : ''
        };

        this.deskRows = [...this.deskRows, row];
        this.deskInput = this.deskRows.map(x => ({ ...x }));
        this.deskLedgerCode = '';
        this.afterAmounts();

        // a cheque / MFS row : its details, at once
        if (needsDetails(mode))
        {
            this.openDesk();
        }
    }

    removeDeskRow(index: number):
        void
    {
        this.deskRows = this.deskRows.filter((_, i) => i !== index);
        this.deskInput = this.deskRows.map(x => ({ ...x }));
        this.afterAmounts();
    }

    // The details typed on the Payment Desk (mode, account and
    // amount stay)
    onDeskChange(lines: VoucherDebitLine[]):
        void
    {
        this.deskRows = (lines ?? []).map(x => ({ ...x }));
        this.cdr.detectChanges();
    }

    onDeskValidChange(_value: boolean):
        void
    {
        this.cdr.detectChanges();
    }

    //===========================================================
    // Save / Clear
    //===========================================================

    private validate(): string
    {
        if (!this.sourceId)
        {
            return `Pick the ${this.sourceLabel.toLowerCase()}.`;
        }

        if (!this.paymentDate)
        {
            return 'Payment Date is required.';
        }

        if (!(this.payTotal > 0))
        {
            return 'Type the amount to pay for at least one employee.';
        }

        if (this.deskRows.length === 0)
        {
            return 'Add the payment mode : how the money goes out.';
        }

        if (this.deskTotal !== this.payTotal)
        {
            return `The payment modes add up to Tk ${hrPayMoney(this.deskTotal)}; the payment is Tk ${hrPayMoney(this.payTotal)}.`;
        }

        const waiting =
            this.deskRows.find(x => !isDebitRowReady(x));

        if (waiting)
        {
            return `${waiting.Mode} ${waiting.LedgerName} : ${debitDetailIssue(waiting) || 'verify the row'} (press Details on the row).`;
        }

        return '';
    }

    onSave():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        const problem =
            this.validate();

        if (problem)
        {
            this.toast.error('Validation', problem);
            return;
        }

        this.confirmDialog.open(
            this.page.singular,
            `Pay Tk ${hrPayMoney(this.payTotal)} to ${this.payCount} employee(s) of ${this.source?.Code ?? ''}? A Payment Voucher is written and posted.`,
            () => this.save(),
            'Pay',
            'Cancel',
            'primary');
    }

    private save():
        void
    {
        this.isSaving = true;

        this.progressDialog.show('Saving', 'Saving the payment and its voucher...', false);

        const body =
        {
            PaymentType:this.paymentType,
            SourceId:this.sourceId,
            PaymentDate:this.paymentDate,
            Remarks:this.remarks.trim(),
            Lines:
                this.dues
                    .filter(x => x.Amount > 0)
                    .map(x => ({ EmployeeId:x.EmployeeId, SalarySheetLineId:x.SalarySheetLineId, Amount:x.Amount })),
            Credits:
                this.deskRows.map(x => ({
                    Mode:x.Mode,
                    LedgerType:x.LedgerType,
                    SubGroupCode:x.SubGroupCode,
                    SubGroupName:x.SubGroupName,
                    LedgerCode:x.LedgerCode,
                    LedgerName:x.LedgerName,
                    AccountId:x.AccountId,
                    Amount:x.Amount,
                    ShortNotes:x.ShortNotes ?? '',
                    ChargePercent:x.ChargePercent || 0,
                    ChargeAmount:x.ChargeAmount || 0,
                    ChargeBorneBy:x.ChargeBorneBy || '',
                    TransactionRef:x.TransactionRef ?? '',
                    PayeeName:x.PayeeName ?? '',
                    PayeeAccount:x.PayeeAccount ?? '',
                    CheckNo:x.CheckNo ?? '',
                    CheckDate:x.CheckDate ?? '',
                    CheckBank:x.CheckBank ?? ''
                }))
        };

        this.service
            .create(this.group, body)
            .subscribe(
            {
                next:payment =>
                    this.progressDialog.finish(() =>
                    {
                        this.isSaving = false;
                        this.toast.success('Paid', `${payment.Code} : Tk ${hrPayMoney(payment.TotalAmount)}, Payment Voucher ${payment.PaymentVoucherNo}.`);
                        this.goToList();
                    }),
                error:error =>
                {
                    this.progressDialog.fail();
                    this.isSaving = false;
                    this.toast.error('Error', error?.error?.message ?? 'The payment could not be saved.');
                    this.cdr.detectChanges();
                }
            });
    }

    onClear():
        void
    {
        this.remarks = '';
        this.paymentDate = hrToText(new Date());
        this.onType(this.paymentType);
    }

    //===========================================================
    // View : cancel, print, bank advice
    //===========================================================

    private loadPayment(publicId: string):
        void
    {
        this.loading = true;
        this.cdr.detectChanges();

        this.service
            .get(this.group, publicId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:payment =>
                {
                    this.payment = payment;
                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The payment could not be loaded.')
            });
    }

    askCancel():
        void
    {
        if (!this.payment || this.payment.IsCancelled)
        {
            return;
        }

        this.cancelling = true;
        this.cancelReason = '';
        this.cdr.detectChanges();
    }

    onCancelReason(value: any):
        void
    {
        this.cancelReason = String(value ?? '');
    }

    keepPayment():
        void
    {
        this.cancelling = false;
        this.cdr.detectChanges();
    }

    confirmCancel():
        void
    {
        const payment = this.payment;

        if (!payment || this.isSaving)
        {
            return;
        }

        const reason =
            this.cancelReason.trim();

        if (!reason)
        {
            this.toast.error(this.page.singular, 'Write why the payment is cancelled.');
            return;
        }

        this.isSaving = true;

        this.progressDialog.show('Saving', `Cancelling ${payment.Code} and its voucher...`, false);

        this.service
            .cancel(this.group, payment.PublicId, reason)
            .subscribe(
            {
                next:() =>
                    this.progressDialog.finish(() =>
                    {
                        this.isSaving = false;
                        this.toast.success('Cancelled', `${payment.Code} and Payment Voucher ${payment.PaymentVoucherNo} were cancelled.`);
                        this.goToList();
                    }),
                error:error =>
                {
                    this.progressDialog.fail();
                    this.isSaving = false;
                    this.toast.error('Error', error?.error?.message ?? 'The payment could not be cancelled.');
                    this.cdr.detectChanges();
                }
            });
    }

    // The payment prints as its Payment Voucher : the standard
    // voucher format of the Print Engine (voucher and payment slip)
    printVoucher(payment: HrPaymentListItem | null):
        void
    {
        if (!payment)
        {
            return;
        }

        if (!payment.PaymentVoucherPublicId)
        {
            this.toast.error('Print', `${payment.Code} has no Payment Voucher to print.`);
            return;
        }

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', 'payment-voucher', payment.PaymentVoucherPublicId],
                    { queryParams:{ doc:'all' } }));

        if (!window.open(url, '_blank'))
        {
            this.toast.error('Print', 'The browser blocked the print window : allow pop-ups for this site.');
        }
    }

    // Who got how much, with a signature column
    printOpen():
        void
    {
        if (this.payment)
        {
            this.print(this.payment);
        }
    }

    // The payment : who got how much, with a signature column
    private print(payment: HrPayment):
        void
    {
        const lines = payment.Lines ?? [];

        const token =
            saveHrReport(
            {
                title:'Payment Sheet',
                subtitle:`${payment.PaymentTypeText} · ${payment.SourceCode} · ${payment.BranchName}`,
                meta:
                [
                    { label:'Payment', value:payment.Code },
                    { label:'Date', value:hrPayDay(payment.PaymentDate) },
                    { label:'Paid by', value:payment.PaymentModes },
                    { label:'Payment Voucher', value:payment.PaymentVoucherNo },
                    { label:'Status', value:payment.IsCancelled ? `Cancelled : ${payment.CancelReason}` : 'Paid' }
                ],
                band:
                [
                    { label:'Employees', value:String(lines.length) },
                    { label:'Paid', value:`Tk ${hrPayMoney(payment.TotalAmount)}` }
                ],
                columns:
                [
                    { header:'Code', kind:'text' },
                    { header:'Employee', kind:'text' },
                    { header:'Designation', kind:'text' },
                    { header:'Amount', kind:'money', strong:true },
                    { header:'Signature', kind:'text' }
                ],
                rows:lines.map((x, i) =>
                [
                    x.EmployeeCode,
                    x.EmployeeName,
                    x.DesignationName,
                    hrPayMoney(x.Amount),
                    ''
                ]),
                footer:['', `Total (${lines.length})`, '', hrPayMoney(payment.TotalAmount), ''],
                note:payment.Remarks
            });

        const problem =
            openHrPrint(this.router, HR_REPORT_PRINT_KEY, token, payment.Code);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }

    // For the bank : the account of each employee and the amount
    bankAdvice():
        void
    {
        const payment = this.payment;

        if (!payment)
        {
            return;
        }

        const lines =
            (payment.Lines ?? []).filter(x => (x.BankAccountNo ?? '').trim().length > 0);

        if (lines.length === 0)
        {
            this.toast.info('Bank Advice', 'No employee of this payment has a bank account on the Employee Profile.');
            return;
        }

        const missing =
            (payment.Lines ?? []).length - lines.length;

        const total =
            lines.reduce((sum, x) => sum + x.Amount, 0);

        const token =
            saveHrReport(
            {
                title:'Bank Advice',
                subtitle:`${payment.PaymentTypeText} · ${payment.SourceCode} · ${payment.BranchName}`,
                meta:
                [
                    { label:'Payment', value:payment.Code },
                    { label:'Date', value:hrPayDay(payment.PaymentDate) },
                    { label:'Payment Voucher', value:payment.PaymentVoucherNo }
                ],
                band:
                [
                    { label:'Accounts', value:String(lines.length) },
                    { label:'To transfer', value:`Tk ${hrPayMoney(total)}` }
                ],
                columns:
                [
                    { header:'Code', kind:'text' },
                    { header:'Account Name', kind:'text' },
                    { header:'Bank', kind:'text' },
                    { header:'Account No', kind:'text' },
                    { header:'Amount', kind:'money', strong:true }
                ],
                rows:lines.map((x, i) =>
                [
                    x.EmployeeCode,
                    x.EmployeeName,
                    x.BankName,
                    x.BankAccountNo,
                    hrPayMoney(x.Amount)
                ]),
                footer:['', `Total (${lines.length})`, '', '', hrPayMoney(total)],
                note:
                    'Please transfer the amounts above to the accounts named.'
                    + (missing > 0 ? ` ${missing} employee(s) of the payment have no bank account and are not on this advice.` : '')
            });

        const problem =
            openHrPrint(this.router, HR_REPORT_PRINT_KEY, token, `${payment.Code} bank advice`);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }
}
