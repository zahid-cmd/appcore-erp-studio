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

import
{
    Observable,
    catchError,
    forkJoin,
    of
}
from 'rxjs';

import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../shared/components/layout/page-toolbar/page-toolbar';
import { ControlTab, ControlTabsComponent } from '../../../../shared/components/controls/control-tabs/control-tabs';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { DatepickerComponent } from '../../../../shared/components/controls/datepicker/datepicker';
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ListTableColumn, ListTableComponent, ListTableRowAction, ListTableRowActionEvent } from '../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../human-resource-manangement/services/hr-progress.service';
import { hrToDate, hrToText } from '../../../human-resource-manangement/services/hr-date';

import { WsService } from '../../shared/ws.service';
import { openServiceInvoicePrint } from '../../print/service-invoice.print';

import
{
    SaveServiceInvoice,
    ServiceInvoice,
    ServiceInvoiceLine,
    ServiceInvoiceLookups,
    WS_BILLING_PAGES,
    WsLedger,
    wsDateTime,
    wsDay,
    wsMoney,
    wsStatusColor
}
from '../../shared/ws.models';


//===============================================================
// Model
//===============================================================

type Mode =
    'list' | 'add' | 'view';

interface Option
{
    label: string;
    value: any;
}

// Outside work typed on the invoice
interface OutsideLine
{
    key: number;
    ItemName: string;
    Note: string;
    Cost: string;
    Amount: string;
}

// How the invoice is collected
interface PayLine
{
    key: number;
    Mode: string;
    LedgerCode: string;
    Amount: string;
    TransactionRef: string;

    // The user typed the amount : it is not filled again
    touched: boolean;
}

const MODES: Option[] =
[
    { label:'Cash', value:'Cash' },
    { label:'Bank', value:'Bank' },
    { label:'MFS', value:'MFS' }
];


//===============================================================
// Service Invoices (Service Operations > Service Billing)
//
// One invoice per job card whose work is done. The server prices it
// (labour of the job card, the parts issued to it, outside work,
// VAT) : the form only shows the figures. It is posted at once with
// its collection (a Receipt Voucher); a wrong invoice is reversed
// with a Service Return.
//===============================================================

@Component(
{
    selector:'service-invoices',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        SearchDropdownComponent,
        TextboxComponent,
        DatepickerComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./service-invoices.html',

    styleUrl:'./service-invoices.css'
})

export class ServiceInvoicesPage
implements OnInit
{
    private readonly ws = inject(WsService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly progress = inject(HrProgressService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroyRef = inject(DestroyRef);

    readonly asDate = hrToDate;
    readonly money = wsMoney;
    readonly day = wsDay;
    readonly dateTime = wsDateTime;
    readonly modeItems = MODES;

    mode:
        Mode = 'list';

    entityId =
        '';

    loading =
        false;

    loadFailed =
        false;

    isSaving =
        false;

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


    //===========================================================
    // List
    //===========================================================

    readonly tabs:
        ControlTab[] =
    [
        { id:'all', label:'All' },
        { id:'Posted', label:'Posted' },
        { id:'Due', label:'With Due' },
        { id:'Undelivered', label:'Not Delivered' },
        { id:'Returned', label:'Returned' }
    ];

    selectedTab =
        'all';

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Invoice No', field:'InvoiceNo', width:'190px', align:'center' },
        { header:'Date', field:'DateText', width:'105px', align:'center' },
        { header:'Job Card', field:'JobCardNo', width:'105px', align:'center' },
        { header:'Customer', field:'CustomerName', width:'180px', align:'left' },
        { header:'Mobile', field:'Mobile', width:'115px', align:'left' },
        { header:'Total', field:'TotalText', width:'110px', align:'right' },
        { header:'Collected', field:'PaidText', width:'110px', align:'right' },
        { header:'Due', field:'DueText', width:'100px', align:'right' },
        { header:'Bike', field:'DeliveredText', width:'110px', align:'left' },
        { header:'Status', field:'Status', width:'105px', align:'left', dotField:'StatusColor' },
        { header:'Actions', field:'actions', type:'actions', width:'100px', align:'center' }
    ];

    readonly listActions =
        { view:true, edit:false, delete:false };

    readonly rowActions:
        ListTableRowAction[] =
    [
        { key:'print', icon:'fas fa-print', title:'Print', tone:'primary' }
    ];

    private all:
        any[] = [];

    rows:
        any[] = [];

    searchText =
        '';

    currentPage =
        1;

    pageSize =
        10;

    totalRecords =
        0;

    historyOpened =
        false;

    historyItems:
        any[] = [];


    //===========================================================
    // Form
    //===========================================================

    lookups:
        ServiceInvoiceLookups | null = null;

    // The saved invoice (view), or the figures the server priced (add)
    doc:
        ServiceInvoice | null = null;

    jobCardItems:
        Option[] = [];

    private ledgers:
        WsLedger[] = [];

    invoiceDate =
        '';

    jobCardPublicId =
        '';

    discount =
        '';

    remarks =
        '';

    deliver =
        true;

    private nextKey =
        1;

    outside:
        OutsideLine[] = [];

    payments:
        PayLine[] = [];

    pricing =
        false;

    private priceTimer:
        any = null;

    // The last pricing asked for : an older answer is dropped
    private priceRun =
        0;

    get canEdit(): boolean
    {
        return this.mode === 'add' && !!this.jobCardPublicId;
    }

    get pageTitle(): string
    {
        return this.mode === 'add' ? 'Add Service Invoice' : 'View Service Invoice';
    }

    get statusColor(): string
    {
        return wsStatusColor(this.doc?.Status ?? 'Posted');
    }

    get serviceLines(): ServiceInvoiceLine[]
    {
        return (this.doc?.Lines ?? []).filter(x => x.LineType === 'Service');
    }

    get partLines(): ServiceInvoiceLine[]
    {
        return (this.doc?.Lines ?? []).filter(x => x.LineType === 'Part');
    }

    get outsideSaved(): ServiceInvoiceLine[]
    {
        return (this.doc?.Lines ?? []).filter(x => x.LineType === 'Outside');
    }

    // The outside works entered on the job card (they carry the code
    // of the list of outside works) : billed as they are
    get outsideOfCard(): ServiceInvoiceLine[]
    {
        return this.outsideSaved.filter(x => !!x.ItemCode);
    }

    get grandTotal(): number
    {
        return this.doc?.GrandTotal ?? 0;
    }

    get paid(): number
    {
        return this.mode === 'add'
            ? Math.round(this.payments.reduce((sum, x) => sum + (Number(x.Amount) || 0), 0) * 100) / 100
            : (this.doc?.PaidAmount ?? 0);
    }

    get due(): number
    {
        return Math.round((this.grandTotal - this.paid) * 100) / 100;
    }

    // What stops the posting (the server says so)
    get blockers(): string[]
    {
        return (this.doc?.Warnings ?? []).filter(x => x.startsWith('Cannot be posted'));
    }

    get notes(): string[]
    {
        return (this.doc?.Warnings ?? []).filter(x => !x.startsWith('Cannot be posted'));
    }

    ledgerItems(mode: string): Option[]
    {
        return this.ledgers
            .filter(x => x.CollectionAccount && x.LedgerType === mode)
            .map(x => ({ label:`${x.LedgerName}  (${x.LedgerCode})${x.Branch ? '  |  ' + x.Branch : ''}`, value:x.LedgerCode }));
    }


    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/') ? 'view' : url.includes('/add') ? 'add' : 'list';

        this.entityId =
            this.route.snapshot.paramMap.get('id') ?? '';

        if (this.mode === 'list')
        {
            this.loadList();
        }
        else
        {
            this.loadForm();
        }
    }

    private failed(error: any, fallback: string):
        void
    {
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

        this.ws
            .getInvoices()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:invoices =>
                {
                    this.all =
                        (invoices ?? []).map(x => ({
                            ...x,
                            DateText:wsDay(x.InvoiceDate),
                            TotalText:wsMoney(x.GrandTotal),
                            PaidText:wsMoney(x.PaidAmount),
                            DueText:x.Status === 'Posted' && x.DueAmount > 0 ? wsMoney(x.DueAmount) : '',
                            DeliveredText:x.IsDelivered ? 'Delivered' : (x.Status === 'Posted' ? 'In workshop' : ''),
                            StatusColor:wsStatusColor(x.Status)
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.failed(error, 'Service invoices could not be loaded.');
                }
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const tab =
            (x: any): boolean =>
                this.selectedTab === 'all'
                || (this.selectedTab === 'Due' ? x.Status === 'Posted' && x.DueAmount > 0
                    : this.selectedTab === 'Undelivered' ? x.Status === 'Posted' && !x.IsDelivered
                    : x.Status === this.selectedTab);

        const matched =
            this.all.filter(x =>
                tab(x)
                && (!find
                    || [x.InvoiceNo, x.JobCardNo, x.CustomerName, x.Mobile, x.ModelName, x.RegistrationNo, x.ChassisNo, x.ReceiptVoucherNo, x.Status]
                        .some(v => String(v ?? '').toLowerCase().includes(find))));

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        this.cdr.detectChanges();
    }

    onTab(value: string):
        void
    {
        this.selectedTab = value || 'all';
        this.currentPage = 1;
        this.apply();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
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

    view(row: any):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    goToList():
        void
    {
        void this.router.navigate([this.mode === 'add' ? '../list' : '../../list'], { relativeTo:this.route });
    }

    onRowAction(event: ListTableRowActionEvent):
        void
    {
        if (event.key === 'print')
        {
            this.print(event.row?.PublicId);
        }
    }

    print(publicId?: string):
        void
    {
        const id = publicId || (this.mode === 'view' ? this.doc?.PublicId : '') || '';

        if (!id)
        {
            return;
        }

        const problem = openServiceInvoicePrint(this.router, id);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }

    openHistory():
        void
    {
        this.ws
            .getHistory(WS_BILLING_PAGES.invoices)
            .subscribe(
            {
                next:items =>
                {
                    this.historyItems = items;
                    this.historyOpened = true;
                    this.cdr.detectChanges();
                },
                error:() => this.toast.error('Error', 'The history could not be loaded.')
            });
    }

    closeHistory():
        void
    {
        this.historyOpened = false;
        this.cdr.detectChanges();
    }


    //===========================================================
    // Form : load
    //===========================================================

    private loadForm():
        void
    {
        this.loading = true;
        this.cdr.detectChanges();

        if (this.mode === 'view')
        {
            this.ws
                .getInvoice(this.entityId)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(
                {
                    next:doc =>
                    {
                        this.loading = false;
                        this.show(doc);
                    },
                    error:error =>
                    {
                        this.loading = false;
                        this.failed(error, 'The service invoice could not be loaded.');
                    }
                });

            return;
        }

        // the money accounts are not needed to see the page : without
        // them the collection lines have nothing to pick
        forkJoin({ lookups:this.ws.getInvoiceLookups(), ledgers:this.ws.getLedgers().pipe(catchError(() => of([] as WsLedger[]))) })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:({ lookups, ledgers }) =>
                {
                    this.lookups = lookups;
                    this.ledgers = ledgers ?? [];
                    this.loading = false;

                    this.jobCardItems = (lookups.JobCards ?? []).map(x => ({ label:x.Text, value:x.PublicId }));
                    this.invoiceDate = (lookups.Today ?? '').substring(0, 10) || hrToText(new Date());

                    this.payments = [];
                    this.addPayment();

                    const wanted = this.route.snapshot.queryParamMap.get('jobCard') ?? '';

                    if (wanted && this.jobCardItems.some(x => x.value === wanted))
                    {
                        this.onJobCard(wanted);
                    }

                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.failed(error, 'The invoice form could not be loaded.');
                }
            });
    }

    // A saved invoice on the page
    private show(doc: ServiceInvoice):
        void
    {
        this.doc = doc;
        this.invoiceDate = (doc.InvoiceDate ?? '').substring(0, 10);
        this.jobCardPublicId = doc.JobCardPublicId;
        this.discount = doc.Discount ? String(doc.Discount) : '';
        this.remarks = doc.Remarks ?? '';
        this.cdr.detectChanges();
    }


    //===========================================================
    // Form : the figures (the server prices the job card)
    //===========================================================

    private body(): SaveServiceInvoice
    {
        return {
            JobCardPublicId:this.jobCardPublicId,
            InvoiceDate:this.invoiceDate,
            Discount:Number(this.discount) || 0,
            Remarks:this.remarks.trim(),
            Deliver:this.deliver,
            OutsideLines:
                this.outside
                    .filter(x => x.ItemName.trim() || Number(x.Amount) || Number(x.Cost))
                    .map(x => ({ ItemName:x.ItemName.trim(), Note:x.Note.trim(), Cost:Number(x.Cost) || 0, Amount:Number(x.Amount) || 0 })),
            Payments:
                this.payments
                    .filter(x => (Number(x.Amount) || 0) > 0 || !!x.LedgerCode)
                    .map(x => ({
                        Mode:x.Mode,
                        LedgerCode:x.LedgerCode,
                        LedgerName:this.ledgers.find(l => l.LedgerCode === x.LedgerCode)?.LedgerName ?? '',
                        Amount:Number(x.Amount) || 0,
                        TransactionRef:x.TransactionRef.trim()
                    }))
        };
    }

    private price():
        void
    {
        if (this.mode !== 'add' || !this.jobCardPublicId || !this.invoiceDate)
        {
            return;
        }

        const run = ++this.priceRun;

        this.pricing = true;
        this.cdr.detectChanges();

        this.ws
            .priceInvoice({ ...this.body(), Payments:[] })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:doc =>
                {
                    if (run !== this.priceRun)
                    {
                        return;
                    }

                    this.pricing = false;
                    this.doc = doc;

                    // one collection line the user did not type : the whole invoice
                    if (this.payments.length === 1 && !this.payments[0].touched)
                    {
                        this.payments[0].Amount = doc.GrandTotal > 0 ? String(doc.GrandTotal) : '';
                    }

                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    if (run !== this.priceRun)
                    {
                        return;
                    }

                    this.pricing = false;
                    this.doc = null;
                    this.failed(error, 'The job card could not be priced.');
                }
            });
    }

    // After typing : the figures follow a moment later
    private priceSoon():
        void
    {
        clearTimeout(this.priceTimer);

        this.priceTimer = setTimeout(() => this.price(), 600);
    }

    onJobCard(value: any):
        void
    {
        this.jobCardPublicId = value ? String(value) : '';
        this.doc = null;
        this.outside = [];

        if (this.payments.length === 1)
        {
            this.payments[0].touched = false;
            this.payments[0].Amount = '';
        }

        this.price();
        this.cdr.detectChanges();
    }

    onDate(date: Date | null):
        void
    {
        this.invoiceDate = date ? hrToText(date) : '';
        this.price();
    }

    onDiscount(value: any):
        void
    {
        this.discount = String(value ?? '').replace(/[^0-9.]/g, '');
        this.priceSoon();
    }

    onRemarks(value: any):
        void
    {
        this.remarks = String(value ?? '');
    }

    onDeliver(event: Event):
        void
    {
        this.deliver = (event.target as HTMLInputElement).checked;
        this.cdr.detectChanges();
    }

    // Outside work

    addOutside():
        void
    {
        this.outside = [...this.outside, { key:this.nextKey++, ItemName:'', Note:'', Cost:'', Amount:'' }];
        this.cdr.detectChanges();
    }

    onOutside(line: OutsideLine, field: 'ItemName' | 'Note' | 'Cost' | 'Amount', event: Event):
        void
    {
        const input = event.target as HTMLInputElement;

        if (field === 'Cost' || field === 'Amount')
        {
            const clean = input.value.replace(/[^0-9.]/g, '');

            if (clean !== input.value)
            {
                input.value = clean;
            }
        }

        line[field] = input.value;

        this.priceSoon();
    }

    removeOutside(line: OutsideLine):
        void
    {
        this.outside = this.outside.filter(x => x !== line);
        this.price();
        this.cdr.detectChanges();
    }

    // The collection

    addPayment():
        void
    {
        const cash = this.ledgerItems('Cash');

        this.payments =
            [
                ...this.payments,
                { key:this.nextKey++, Mode:'Cash', LedgerCode:cash.length === 1 ? cash[0].value : '', Amount:'', TransactionRef:'', touched:this.payments.length > 0 }
            ];

        this.cdr.detectChanges();
    }

    onPayMode(line: PayLine, value: any):
        void
    {
        line.Mode = value ? String(value) : 'Cash';

        const items = this.ledgerItems(line.Mode);

        line.LedgerCode = items.length === 1 ? items[0].value : '';
        line.TransactionRef = '';

        this.cdr.detectChanges();
    }

    onPayLedger(line: PayLine, value: any):
        void
    {
        line.LedgerCode = value ? String(value) : '';
        this.cdr.detectChanges();
    }

    onPay(line: PayLine, field: 'Amount' | 'TransactionRef', event: Event):
        void
    {
        const input = event.target as HTMLInputElement;

        if (field === 'Amount')
        {
            const clean = input.value.replace(/[^0-9.]/g, '');

            if (clean !== input.value)
            {
                input.value = clean;
            }

            line.touched = true;
        }

        line[field] = input.value;

        this.cdr.detectChanges();
    }

    removePayment(line: PayLine):
        void
    {
        this.payments = this.payments.filter(x => x !== line);
        this.cdr.detectChanges();
    }


    //===========================================================
    // Form : post
    //===========================================================

    onSave():
        void
    {
        if (this.isSaving || this.loading || this.pricing || !this.canEdit)
        {
            return;
        }

        if (!this.invoiceDate)
        {
            this.toast.error('Validation', 'Choose the date.');
            return;
        }

        if (!this.doc)
        {
            this.toast.error('Validation', 'The job card is not priced yet.');
            return;
        }

        if (this.blockers.length > 0)
        {
            this.toast.error('Validation', this.blockers[0].replace('Cannot be posted : ', ''));
            return;
        }

        const body = this.body();

        for (const pay of body.Payments)
        {
            if (!pay.LedgerCode)
            {
                this.toast.error('Validation', `Choose the ${pay.Mode} account the money goes to.`);
                return;
            }

            if (pay.Amount <= 0)
            {
                this.toast.error('Validation', `${pay.Mode} : give the amount collected.`);
                return;
            }

            if (pay.Mode === 'MFS' && !pay.TransactionRef)
            {
                this.toast.error('Validation', 'MFS : give the transaction ID.');
                return;
            }
        }

        if (this.due < 0)
        {
            this.toast.error('Validation', 'The collection is more than the invoice.');
            return;
        }

        if (this.due > 0 && !(this.lookups?.AllowCredit && this.lookups?.CanCredit))
        {
            this.toast.error(
                'Validation',
                this.lookups?.AllowCredit
                    ? `A due of ${wsMoney(this.due)} needs a user with the page action Credit Sale.`
                    : `Collect the full ${wsMoney(this.grandTotal)} : credit on service invoices is off (Workshop Configuration).`);
            return;
        }

        const run =
            (): void =>
            {
                this.isSaving = true;

                this.progress.show('Posting', 'Posting the service invoice...');

                this.ws.postInvoice(body).subscribe(
                {
                    next:saved =>
                        this.progress.finish(() =>
                        {
                            this.isSaving = false;
                            this.toast.success('Success', `${saved.InvoiceNo} was posted.`);

                            void this.router.navigate(['../view', saved.PublicId], { relativeTo:this.route });
                        }),
                    error:error =>
                    {
                        this.progress.fail();
                        this.isSaving = false;
                        this.failed(error, 'The service invoice could not be posted.');
                    }
                });
            };

        this.confirmDialog.open(
            'Post Service Invoice',
            `Post the invoice of ${this.doc.JobCardNo} for ${wsMoney(this.grandTotal)}`
                + (this.paid > 0 ? `, collected ${wsMoney(this.paid)}` : '')
                + (this.due > 0 ? `, due ${wsMoney(this.due)}` : '')
                + `? It is posted to the accounts at once and cannot be changed : a wrong invoice is reversed with a Service Return.`
                + (this.deliver ? ' The bike is marked as delivered.' : ''),
            run,
            'Post',
            'Not yet',
            'primary');
    }


    //===========================================================
    // A saved invoice : what can be done next
    //===========================================================

    deliverBike():
        void
    {
        if (!this.doc || this.isSaving)
        {
            return;
        }

        const id = this.doc.PublicId;

        this.confirmDialog.open(
            'Deliver the Bike',
            `Hand the bike of ${this.doc.JobCardNo} over to the customer? The job card becomes Delivered.`,
            () =>
            {
                this.isSaving = true;

                this.ws.deliverInvoice(id).subscribe(
                {
                    next:saved =>
                    {
                        this.isSaving = false;
                        this.toast.success('Success', 'The bike was delivered.');
                        this.show(saved);
                    },
                    error:error =>
                    {
                        this.isSaving = false;
                        this.failed(error, 'The delivery could not be saved.');
                    }
                });
            },
            'Deliver',
            'Not yet',
            'primary');
    }

    returnInvoice():
        void
    {
        if (this.doc)
        {
            void this.router.navigate(['../../../service-returns/add'], { relativeTo:this.route, queryParams:{ invoice:this.doc.PublicId } });
        }
    }
}
