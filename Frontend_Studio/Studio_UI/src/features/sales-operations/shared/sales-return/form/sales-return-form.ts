//===============================================================
// Sales Returns - MB / SP / AC : form (shared; each page gives its
// config with salesReturnProviders)
//
// One return = ONE posted invoice (owner) :
//   Add  : 1. find the invoice (invoice no, customer, phone; MB
//             chassis / engine no) among the posted invoices of
//             the login branch with something left to return;
//          2. type the quantity returned per line (MB : tick the
//             chassis), a reason, Save.
//             Post on Approval ON  : saved as Draft (Approve, Post)
//             Post on Approval OFF : posted at once
//   Edit : a draft (its invoice stays)
//   View : the return; Approve / Return to Draft / Post / Print
// The credit shown is a preview : the server takes the invoice
// line's own figures for the quantity (discounts, VAT) on save
// and again on posting.
//===============================================================


//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    OnDestroy,
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
    Observable
}
from 'rxjs';

import
{
    SALES_RETURN_PAGE
}
from '../sales-return.config';

import
{
    SalesReturn,
    SalesReturnInvoice,
    SalesReturnInvoiceItem,
    SalesReturnInvoiceLine,
    SalesReturnSaved,
    SalesReturnSwitches,
    SaveSalesReturn
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
    CommandCenterComponent
}
from '../../../../../shared/components/utilities/command-center/command-center';

import
{
    SearchBoxComponent
}
from '../../../../../shared/components/utilities/search-box/search-box';

import
{
    TextboxComponent
}
from '../../../../../shared/components/controls/textbox/textbox';

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
    formatMoney
}
from '../../../../../shared/components/accounting/accounting.models';


//===============================================================
// One invoice line on the form (what is typed)
//===============================================================

interface EntryLine
{
    line:SalesReturnInvoiceLine;
    qty:number;
    reason:string;
}

type FormMode =
    'add' | 'edit' | 'view';

const MONTHS =
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


@Component(
{
    selector:'sales-return-form',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        CommandCenterComponent,
        SearchBoxComponent,
        TextboxComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        ToastComponent
    ],

    templateUrl:'./sales-return-form.html',

    styleUrl:'./sales-return-form.css'
})

export class SalesReturnForm
    implements OnInit, OnDestroy
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


    mode: FormMode = 'add';

    loading = false;

    switches: SalesReturnSwitches | null = null;

    // Step 1 : the invoice finder
    searchText = '';

    searching = false;

    invoices: SalesReturnInvoiceItem[] = [];

    private searchTimer: any = null;

    // Step 2 : the invoice and the quantities
    invoice: SalesReturnInvoice | null = null;

    entries: EntryLine[] = [];

    reason = '';

    narration = '';

    formError = '';

    // Edit / View : the return
    saved: SalesReturn | null = null;

    get isMb(): boolean
    {
        return this.page.pageType === 'MB';
    }

    get isView(): boolean
    {
        return this.mode === 'view';
    }

    get headerTitle(): string
    {
        return this.mode === 'add'
            ? this.page.fullTitle
            : `${this.mode === 'edit' ? 'Update' : 'View'} ${this.page.fullTitle}`;
    }

    get headerSubtitle(): string
    {
        if (this.saved)
        {
            return `${this.saved.ReturnNo} · ${this.saved.Status} · invoice ${this.saved.SalesInvoiceNo}`;
        }

        if (this.invoice)
        {
            return `From invoice ${this.invoice.InvoiceNo} · ${this.invoice.CustomerName}`;
        }

        return 'Step 1 : find the posted invoice the goods were sold on (one invoice per return)';
    }

    get postOnApproval(): boolean
    {
        return this.switches?.PostOnApproval ?? false;
    }

    get noteText(): string
    {
        return this.saveText === 'Post Return'
            ? 'Post Return credits the customer\'s ledger at once (no cash here : a refund is a Payment Voucher) and puts the goods back into their batches. The amounts are the invoice\'s own (discounts and VAT pro-rata).'
            : 'Saved as Draft : approve and post it from the list. Posting credits the customer\'s ledger and puts the goods back into stock.';
    }

    get saveText(): string
    {
        return this.mode === 'edit' || this.postOnApproval
            ? 'Save Draft'
            : 'Post Return';
    }


    //===========================================================
    // Helpers
    //===========================================================

    money(value: number): string
    {
        return formatMoney(Number(value) || 0);
    }

    qtyText(value: number): string
    {
        return String(Math.round((Number(value) || 0) * 100) / 100);
    }

    dateText(value: string): string
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

    // The page's route is its API path (sales-operations/<menu>/<page>)
    private get pageRoute(): string
    {
        return '/' + this.page.apiPath;
    }

    private get listRoute(): any[]
    {
        return [this.pageRoute, 'list'];
    }

    goToList(notice: string = ''): void
    {
        void this.router.navigate(this.listRoute, notice ? { state:{ srNotice:notice } } : {});
    }


    //===========================================================
    // Load
    //===========================================================

    ngOnInit(): void
    {
        const segment: string =
            (this.route.snapshot as any).url?.[0]?.path ?? 'add';

        this.mode =
            segment === 'edit'
                ? 'edit'
                : segment === 'view'
                    ? 'view'
                    : 'add';

        this.service
            .getSwitches(this.page.apiPath)
            .subscribe
            ({
                next:
                    s =>
                    {
                        this.switches = s;
                        this.cdr.detectChanges();
                    },
                error:
                    () => undefined
            });

        const id =
            this.route.snapshot.paramMap.get('id') ?? '';

        if (this.mode === 'add')
        {
            const invoice =
                this.route.snapshot.queryParamMap.get('invoice') ?? '';

            if (invoice)
            {
                this.pickInvoice(invoice);
            }
            else
            {
                this.find('');
            }

            return;
        }

        this.loadReturn(id);
    }

    ngOnDestroy(): void
    {
        if (this.searchTimer)
        {
            clearTimeout(this.searchTimer);
        }
    }

    private loadReturn(publicId: string): void
    {
        this.loading = true;

        this.cdr.detectChanges();

        this.service
            .getById(this.page.apiPath, publicId)
            .subscribe
            ({
                next:
                    r =>
                    {
                        this.saved = r;

                        this.reason = r.Reason;

                        this.narration = r.Narration;

                        if (this.mode === 'edit' && r.Status !== 'Draft')
                        {
                            this.mode = 'view';
                        }

                        if (this.mode === 'edit')
                        {
                            this.loadInvoice(r.InvoicePublicId, r);

                            return;
                        }

                        this.loading = false;

                        this.cdr.detectChanges();
                    },
                error:
                    error =>
                    {
                        this.loading = false;

                        this.toast.error('Load Failed', this.errorText(error, 'The return could not be loaded.'));

                        this.cdr.detectChanges();
                    }
            });
    }


    //===========================================================
    // Step 1 : find the invoice
    //===========================================================

    onSearch(text: string): void
    {
        this.searchText = text ?? '';

        if (this.searchTimer)
        {
            clearTimeout(this.searchTimer);
        }

        this.searchTimer =
            setTimeout(() => this.find(this.searchText), 350);
    }

    find(text: string): void
    {
        this.searching = true;

        this.cdr.detectChanges();

        this.service
            .findInvoices(this.page.apiPath, text.trim())
            .subscribe
            ({
                next:
                    rows =>
                    {
                        this.searching = false;

                        this.invoices = rows;

                        this.cdr.detectChanges();
                    },
                error:
                    error =>
                    {
                        this.searching = false;

                        this.invoices = [];

                        this.toast.error('Search Failed', this.errorText(error, 'The invoices could not be loaded.'));

                        this.cdr.detectChanges();
                    }
            });
    }

    pickInvoice(publicId: string): void
    {
        this.loadInvoice(publicId, null);
    }

    changeInvoice(): void
    {
        if (this.mode !== 'add')
        {
            return;
        }

        this.invoice = null;

        this.entries = [];

        this.formError = '';

        if (this.invoices.length === 0)
        {
            this.find(this.searchText);
        }

        this.cdr.detectChanges();
    }

    private loadInvoice(publicId: string, editing: SalesReturn | null): void
    {
        this.loading = true;

        this.formError = '';

        this.cdr.detectChanges();

        this.service
            .getInvoice(this.page.apiPath, publicId, editing?.PublicId ?? '')
            .subscribe
            ({
                next:
                    invoice =>
                    {
                        this.loading = false;

                        this.invoice = invoice;

                        this.entries =
                            invoice.Lines.map
                            (
                                line =>
                                {
                                    const mine = editing?.Lines.find(x => x.SalesInvoiceLineId === line.SalesInvoiceLineId);

                                    return {
                                        line,
                                        qty:mine?.Quantity ?? 0,
                                        reason:mine?.Reason ?? ''
                                    };
                                }
                            );

                        this.cdr.detectChanges();
                    },
                error:
                    error =>
                    {
                        this.loading = false;

                        this.toast.error('Invoice', this.errorText(error, 'The invoice could not be loaded.'));

                        this.cdr.detectChanges();
                    }
            });
    }


    //===========================================================
    // Step 2 : quantities
    //===========================================================

    // Can still be returned on this return (edit : its own
    // quantity counts as returnable again)
    canReturn(entry: EntryLine): number
    {
        return entry.line.ReturnableQuantity;
    }

    isLocked(entry: EntryLine): boolean
    {
        return this.isView
            || !!this.invoice?.Blocked
            || !!entry.line.Blocked
            || this.canReturn(entry) <= 0;
    }

    onQty(entry: EntryLine, value: string): void
    {
        let qty = Number(value);

        if (!Number.isFinite(qty) || qty < 0)
        {
            qty = 0;
        }

        qty = Math.round(qty * 100) / 100;

        entry.qty = Math.min(qty, this.canReturn(entry));

        this.formError = '';

        this.cdr.detectChanges();
    }

    onBike(entry: EntryLine, checked: boolean): void
    {
        entry.qty = checked && !this.isLocked(entry) ? 1 : 0;

        this.formError = '';

        this.cdr.detectChanges();
    }

    returnAll(entry: EntryLine): void
    {
        if (this.isLocked(entry))
        {
            return;
        }

        entry.qty = this.canReturn(entry);

        this.formError = '';

        this.cdr.detectChanges();
    }

    onLineReason(entry: EntryLine, value: string): void
    {
        entry.reason = value ?? '';
    }

    onReason(value: string | number): void
    {
        this.reason = String(value ?? '');

        this.formError = '';
    }

    onNarration(value: string | number): void
    {
        this.narration = String(value ?? '');
    }

    // Preview of the credit of a line (the server takes the
    // invoice line's own figures)
    lineCredit(entry: EntryLine): number
    {
        if (entry.qty <= 0)
        {
            return 0;
        }

        return entry.qty >= entry.line.SoldQuantity - entry.line.ReturnedQuantity && entry.line.ReturnedQuantity === 0
            ? entry.line.LineTotal
            : Math.round(entry.line.NetPerUnit * entry.qty * 100) / 100;
    }

    get chosen(): EntryLine[]
    {
        return this.entries.filter(x => x.qty > 0);
    }

    get totalQty(): number
    {
        return this.chosen.reduce((sum, x) => sum + x.qty, 0);
    }

    get itemsCredit(): number
    {
        return Math.round(this.chosen.reduce((sum, x) => sum + this.lineCredit(x), 0) * 100) / 100;
    }

    get registrationRefund(): number
    {
        return this.chosen.reduce((sum, x) => sum + (this.isMb ? x.line.RegistrationRefund : 0), 0);
    }

    get totalCredit(): number
    {
        return Math.round((this.itemsCredit + this.registrationRefund) * 100) / 100;
    }


    //===========================================================
    // Save
    //===========================================================

    private issue(): string
    {
        if (!this.invoice)
        {
            return 'Find and pick the invoice first.';
        }

        if (this.invoice.Blocked)
        {
            return this.invoice.Blocked;
        }

        if (this.chosen.length === 0)
        {
            return this.isMb
                ? 'Tick the bike(s) returned.'
                : 'Type the quantity returned on at least one line.';
        }

        const over =
            this.chosen.find(x => x.qty > this.canReturn(x));

        if (over)
        {
            return `${over.line.ProductName} : at most ${this.qtyText(this.canReturn(over))} can be returned.`;
        }

        if (this.reason.replace(/\s+/g, ' ').trim().length < 5)
        {
            return 'Type why the goods are returned (at least 5 characters).';
        }

        return '';
    }

    save(): void
    {
        if (this.isView || this.progress.busy)
        {
            return;
        }

        const issue = this.issue();

        if (issue)
        {
            this.formError = issue;

            this.toast.error(this.page.title, issue);

            this.cdr.detectChanges();

            return;
        }

        const model: SaveSalesReturn =
        {
            InvoicePublicId:this.invoice!.PublicId,
            Reason:this.reason.replace(/\s+/g, ' ').trim(),
            Narration:this.narration.replace(/\s+/g, ' ').trim(),
            Lines:
                this.chosen.map
                (
                    x =>
                    ({
                        SalesInvoiceLineId:x.line.SalesInvoiceLineId,
                        Quantity:x.qty,
                        Reason:(x.reason ?? '').trim()
                    })
                )
        };

        const posting =
            this.mode === 'add' && !this.postOnApproval;

        const run =
            () =>
            {
                const call: Observable<SalesReturnSaved> =
                    this.mode === 'edit' && this.saved
                        ? this.service.update(this.page.apiPath, this.saved.PublicId, model)
                        : this.service.create(this.page.apiPath, model);

                this.progress
                    .run<SalesReturnSaved>(
                        posting ? 'Posting Return' : 'Saving Return',
                        posting
                            ? 'Please wait : the customer is credited and the goods go back to stock...'
                            : 'Please wait while the return is saved...',
                        posting ? 'Return posted.' : 'Return saved.',
                        call)
                    .subscribe
                    ({
                        next:
                            saved =>
                                this.goToList(
                                    saved.Status === 'Posted'
                                        ? `${saved.ReturnNo} posted : Tk ${formatMoney(saved.ReturnTotal)} credited to ${this.invoice?.CustomerName ?? 'the customer'}.`
                                        : `${saved.ReturnNo} saved as ${saved.Status}.`),
                        error:
                            error =>
                            {
                                this.formError = this.errorText(error, 'The return could not be saved.');

                                this.toast.error(this.page.title, this.formError);

                                this.cdr.detectChanges();
                            }
                    });
            };

        if (!posting)
        {
            run();

            return;
        }

        this.confirm.open(
            'Post Return',
            `Post the return of ${this.qtyText(this.totalQty)} unit(s) from ${this.invoice!.InvoiceNo}? About Tk ${formatMoney(this.totalCredit)} is credited to ${this.invoice!.CustomerName}'s ledger and the goods go back to stock. A posted return is final.`,
            () => setTimeout(run),
            'Post',
            'Close',
            'primary'
        );
    }

    clear(): void
    {
        for (const entry of this.entries)
        {
            entry.qty = 0;

            entry.reason = '';
        }

        this.reason = '';

        this.narration = '';

        this.formError = '';

        this.cdr.detectChanges();
    }


    //===========================================================
    // View : Approve / Return to Draft / Post / Print / Edit
    //===========================================================

    edit(): void
    {
        if (!this.saved)
        {
            return;
        }

        void this.router.navigate([this.pageRoute, 'edit', this.saved.PublicId]);
    }

    print(): void
    {
        if (!this.saved)
        {
            return;
        }

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', this.page.printKey, this.saved.PublicId],
                    { queryParams:{ doc:this.page.a4DocKey } }
                )
            );

        if (!window.open(url, '_blank'))
        {
            this.toast.error('Print', 'The print tab was blocked by the browser. Allow pop-ups for this site and try again.');
        }
    }

    step(action: 'approve' | 'draft' | 'post'): void
    {
        const row = this.saved;

        if (!row || this.progress.busy)
        {
            return;
        }

        const credit = `Tk ${formatMoney(row.ReturnTotal)}`;

        const plan =
            action === 'approve'
                ? { title:'Approve Return', message:`Approve ${row.ReturnNo} (${row.CustomerName}, ${credit})?`, ok:'Approve', done:'Return approved.', call:() => this.service.approve(this.page.apiPath, row.PublicId) as Observable<any> }
                : action === 'draft'
                    ? { title:'Return to Draft', message:`Send ${row.ReturnNo} back to draft?`, ok:'Return to Draft', done:'Return sent back to draft.', call:() => this.service.returnToDraft(this.page.apiPath, row.PublicId) as Observable<any> }
                    : { title:'Post Return', message:`Post ${row.ReturnNo}? ${credit} is credited to ${row.CustomerName}'s ledger and the goods go back to stock. A posted return is final.`, ok:'Post', done:'Return posted.', call:() => this.service.post(this.page.apiPath, row.PublicId) as Observable<any> };

        this.confirm.open(
            plan.title,
            plan.message,
            () =>
                setTimeout(
                    () =>
                        this.progress
                            .run<any>(plan.title, `Please wait while ${row.ReturnNo} is processed...`, plan.done, plan.call())
                            .subscribe
                            ({
                                next:
                                    () =>
                                    {
                                        this.toast.success(plan.title, `${row.ReturnNo} : ${plan.done}`);

                                        this.loadReturn(row.PublicId);
                                    },
                                error:
                                    error =>
                                        this.toast.error(`${plan.title} Failed`, this.errorText(error, 'The return could not be processed.'))
                            })),
            plan.ok,
            'Close',
            'primary'
        );
    }
}
