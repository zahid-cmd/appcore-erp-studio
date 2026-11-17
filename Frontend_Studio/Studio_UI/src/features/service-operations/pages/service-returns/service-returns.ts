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

import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { DatepickerComponent } from '../../../../shared/components/controls/datepicker/datepicker';
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ListTableColumn, ListTableComponent } from '../../../../shared/components/layout/list-table/list-table';
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

import
{
    ServiceInvoice,
    ServiceReturn,
    WS_BILLING_PAGES,
    wsDay,
    wsMoney
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


//===============================================================
// Service Returns (Service Operations > Service Billing)
//
// A wrong or refused service invoice is reversed as a whole : its
// journal and its VAT; optionally its receipt is cancelled and the
// parts of the job go back to the store. The job card is Work Done
// again, so it can be invoiced anew.
//===============================================================

@Component(
{
    selector:'service-returns',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageCanvasComponent,
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

    templateUrl:'./service-returns.html',

    styleUrl:'../service-invoices/service-invoices.css'
})

export class ServiceReturnsPage
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

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Return No', field:'ReturnNo', width:'115px', align:'center' },
        { header:'Date', field:'DateText', width:'105px', align:'center' },
        { header:'Invoice No', field:'InvoiceNo', width:'190px', align:'center' },
        { header:'Job Card', field:'JobCardNo', width:'105px', align:'center' },
        { header:'Customer', field:'CustomerName', width:'180px', align:'left' },
        { header:'Amount', field:'AmountText', width:'110px', align:'right' },
        { header:'Receipt', field:'ReceiptText', width:'120px', align:'left' },
        { header:'Parts', field:'PartsText', width:'120px', align:'left' },
        { header:'Reason', field:'Reason', width:'240px', align:'left' },
        { header:'Actions', field:'actions', type:'actions', width:'80px', align:'center' }
    ];

    readonly listActions =
        { view:true, edit:false, delete:false };

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

    // Form

    doc:
        ServiceReturn | null = null;

    invoice:
        ServiceInvoice | null = null;

    invoiceItems:
        Option[] = [];

    invoicePublicId =
        '';

    returnDate =
        '';

    reason =
        '';

    cancelReceipt =
        true;

    returnParts =
        false;

    get canEdit(): boolean
    {
        return this.mode === 'add' && !!this.invoice;
    }

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
            .getServiceReturns()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:returns =>
                {
                    this.all =
                        (returns ?? []).map(x => ({
                            ...x,
                            DateText:wsDay(x.ReturnDate),
                            AmountText:wsMoney(x.Amount),
                            ReceiptText:x.ReceiptCancelled ? 'Cancelled' : (x.ReceiptVoucherNo ? 'Kept' : ''),
                            PartsText:x.PartsReturned ? 'Back in store' : 'With the job'
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.failed(error, 'Service returns could not be loaded.');
                }
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const matched =
            this.all.filter(x =>
                !find
                || [x.ReturnNo, x.InvoiceNo, x.JobCardNo, x.CustomerName, x.Mobile, x.Reason]
                    .some(v => String(v ?? '').toLowerCase().includes(find)));

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

    openHistory():
        void
    {
        this.ws
            .getHistory(WS_BILLING_PAGES.returns)
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
    // Form
    //===========================================================

    private loadForm():
        void
    {
        this.loading = true;
        this.cdr.detectChanges();

        if (this.mode === 'view')
        {
            this.ws
                .getServiceReturn(this.entityId)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(
                {
                    next:doc =>
                    {
                        this.loading = false;
                        this.doc = doc;
                        this.returnDate = (doc.ReturnDate ?? '').substring(0, 10);
                        this.reason = doc.Reason ?? '';
                        this.cancelReceipt = doc.ReceiptCancelled;
                        this.returnParts = doc.PartsReturned;
                        this.cdr.detectChanges();
                    },
                    error:error =>
                    {
                        this.loading = false;
                        this.failed(error, 'The service return could not be loaded.');
                    }
                });

            return;
        }

        this.returnDate = hrToText(new Date());

        this.ws
            .getReturnableInvoices()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:invoices =>
                {
                    this.loading = false;
                    this.invoiceItems = (invoices ?? []).map(x => ({ label:x.Text, value:x.PublicId }));

                    const wanted = this.route.snapshot.queryParamMap.get('invoice') ?? '';

                    if (wanted && this.invoiceItems.some(x => x.value === wanted))
                    {
                        this.onInvoice(wanted);
                    }

                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.failed(error, 'The invoices could not be loaded.');
                }
            });
    }

    onInvoice(value: any):
        void
    {
        this.invoicePublicId = value ? String(value) : '';
        this.invoice = null;
        this.cdr.detectChanges();

        if (!this.invoicePublicId)
        {
            return;
        }

        this.ws
            .getReturnInvoice(this.invoicePublicId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:invoice =>
                {
                    this.invoice = invoice;
                    this.cancelReceipt = !!invoice.ReceiptVoucherNo;
                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The service invoice could not be loaded.')
            });
    }

    onDate(date: Date | null):
        void
    {
        this.returnDate = date ? hrToText(date) : '';
    }

    onReason(value: any):
        void
    {
        this.reason = String(value ?? '');
    }

    onSwitch(field: 'cancelReceipt' | 'returnParts', event: Event):
        void
    {
        this[field] = (event.target as HTMLInputElement).checked;
        this.cdr.detectChanges();
    }

    onSave():
        void
    {
        if (this.isSaving || this.loading || !this.canEdit || !this.invoice)
        {
            return;
        }

        if (!this.returnDate)
        {
            this.toast.error('Validation', 'Choose the date.');
            return;
        }

        if (!this.reason.trim())
        {
            this.toast.error('Validation', 'Say why the invoice is returned.');
            return;
        }

        const invoice = this.invoice;

        const cancelReceipt = this.cancelReceipt && !!invoice.ReceiptVoucherNo;

        this.confirmDialog.open(
            'Service Return',
            `Reverse ${invoice.InvoiceNo} (${wsMoney(invoice.GrandTotal)}) as a whole? Its journal and its VAT are reversed`
                + (cancelReceipt ? `, its receipt ${invoice.ReceiptVoucherNo} is cancelled` : '')
                + (this.returnParts ? ', the parts of the job go back to the store' : '')
                + '. The job card becomes Work Done again. This cannot be undone.',
            () =>
            {
                this.isSaving = true;

                this.progress.show('Posting', 'Posting the service return...');

                this.ws
                    .postServiceReturn({ InvoicePublicId:invoice.PublicId, ReturnDate:this.returnDate, Reason:this.reason.trim(), CancelReceipt:cancelReceipt, ReturnParts:this.returnParts })
                    .subscribe(
                    {
                        next:saved =>
                            this.progress.finish(() =>
                            {
                                this.isSaving = false;

                                if (saved.Message)
                                {
                                    this.toast.error('Parts', saved.Message);
                                }
                                else
                                {
                                    this.toast.success('Success', `${saved.ReturnNo} was posted.`);
                                }

                                void this.router.navigate(['../view', saved.PublicId], { relativeTo:this.route });
                            }),
                        error:error =>
                        {
                            this.progress.fail();
                            this.isSaving = false;
                            this.failed(error, 'The service return could not be posted.');
                        }
                    });
            },
            'Return',
            'Not yet',
            'danger');
    }

    openInvoice():
        void
    {
        const id = this.doc?.InvoicePublicId || this.invoice?.PublicId;

        if (id)
        {
            void this.router.navigate([this.mode === 'add' ? '../../service-invoices/view' : '../../../service-invoices/view', id], { relativeTo:this.route });
        }
    }
}
