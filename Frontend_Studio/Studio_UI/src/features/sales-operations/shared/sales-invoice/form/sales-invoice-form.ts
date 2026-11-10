//===============================================================
// Imports
//===============================================================

import
{
    TextareaComponent
}
from '../../../../../shared/components/controls/textarea/textarea';

import
{
    ToastService
}
from '../../../../../shared/components/utilities/toast/toast.service';

import
{
    Component,
    OnInit,
    OnDestroy,
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
    HttpErrorResponse
}
from '@angular/common/http';

import
{
    Observable
}
from 'rxjs';

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
    CommandCenterComponent
}
from '../../../../../shared/components/utilities/command-center/command-center';

import
{
    DatepickerComponent
}
from '../../../../../shared/components/controls/datepicker/datepicker';

import
{
    TextboxComponent
}
from '../../../../../shared/components/controls/textbox/textbox';

import
{
    SearchDropdownComponent
}
from '../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    DropdownComponent
}
from '../../../../../shared/components/controls/dropdown/dropdown';

import
{
    ControlSegmentComponent,
    ControlSegmentItem
}
from '../../../../../shared/components/utilities/control-segment/control-segment';

import
{
    OrbitLoaderComponent
}
from '../../../../../shared/components/utilities/orbit-loader/orbit-loader';

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
// Accounting (Payment Desk, ledgers, RV switches)
//===============================================================

import
{
    PaymentDeskComponent
}
from '../../../../../shared/components/accounting/payment-desk/payment-desk';

import
{
    BikeShelfComponent,
    BikeCkdChange
}
from '../../bike-shelf/bike-shelf';

import
{
    AccountingLookupService
}
from '../../../../../shared/components/accounting/accounting-lookup.service';

import
{
    VoucherLedger,
    VoucherDebitLine,
    PaymentMode,
    VOUCHER_MODES,
    CHARGE_RECOVERY_LEDGERS,
    emptyDebitLine,
    needsDetails,
    isDebitRowReady,
    debitDetailIssue,
    roundMoney,
    formatMoney,
    parseMoney,
    toIsoDate,
    fromIsoDate,
    amountInWords
}
from '../../../../../shared/components/accounting/accounting.models';

import
{
    VoucherSwitchesService,
    VOUCHER_SWITCH,
    switchOn
}
from '../../../../../shared/components/accounting/voucher-switches';

//===============================================================
// Model, Service, Config
//===============================================================

import
{
    SalesInvoice,
    SalesInvoiceLine,
    SalesInvoiceBikeUnit,
    SalesInvoiceWarranty,
    SalesInvoiceDefaults,
    SalesInvoiceSwitches,
    SalesInvoiceCustomer,
    SalesInvoiceCustomerSearchItem,
    SalesInvoiceProduct,
    SalesInvoiceQuote,
    SalesInvoiceSaved,
    SalesInvoiceSpecialType,
    SalesInvoicePaymentRow,
    CreateSalesInvoice,
    UpdateSalesInvoice,
    SalesInvoiceListNotice,
    SalesInvoiceNoticeTone,
    isCustomerPhone,
    toAsciiText
}
from '../sales-invoice.model';

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
// Local Types
//===============================================================

type FormMode =
    'add' | 'edit' | 'view';

type FormCommand =
    '' | 'save' | 'checkout' | 'clear' | 'edit' | 'approve' | 'post' | 'return' | 'cancel' | 'print' | 'thermal';

interface CommandSlot
{
    command:
        FormCommand;

    text:
        string;

    icon:
        string;

    // Master Activity the button needs on this page; '' = the
    // command center's own Add / Update rule or none
    activity:
        string;
}

const NO_COMMAND:
    CommandSlot =
{
    command:'',
    text:'',
    icon:'',
    activity:''
};

interface SelectItem
{
    label:
        string;

    value:
        any;
}

// A line as the user entered it (the server prices it)
interface EntryLine
{
    ProductId:
        number;

    ProductCode:
        string;

    PartNumber:
        string;

    ProductName:
        string;

    ProductType:
        string;

    Unit:
        string;

    Quantity:
        number;

    // Price edit (0024); null = batch MRP(s)
    UnitPrice:
        number | null;

    // Special % (0025 + activity); null = none
    SpecialPercent:
        number | null;

    // From the product search (until the quote answers)
    OnHand:
        number;

    Mrp:
        number;

    // Cell texts
    qtyText:
        string;

    priceText:
        string;

    specialText:
        string;

    // MB : the bike (chassis) on the line
    MotorBikeUnitId?:
        number | null;

    ChassisNo?:
        string;

    EngineNo?:
        string;

    // Electric : a motor number ("Motor No")
    IsElectric?:
        boolean;

    ColorName?:
        string;

    ManufactureYear?:
        number | null;

    CkdStatus?:
        string;
}

// One row of the items table : what was entered + the server's
// figures for it (null while the quote is on its way)
interface ItemRow
{
    key:
        number;

    index:
        number;

    entry:
        EntryLine;

    priced:
        SalesInvoiceLine | null;
}

// Summary figures (quote while editing, the saved invoice in View)
interface InvoiceFigures
{
    Gross:
        number;

    CampaignMembership:
        number;

    Campaign:
        number;

    Membership:
        number;

    Special:
        number;

    Fractional:
        number;

    InvoiceTotal:
        number;

    VatInside:
        number;

    Paid:
        number;

    Due:
        number;
}

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


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'sales-invoice-form',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        CommandCenterComponent,
        DatepickerComponent,
        TextboxComponent,
        TextareaComponent,
        SearchDropdownComponent,
        DropdownComponent,
        ControlSegmentComponent,
        OrbitLoaderComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        PaymentDeskComponent,
        BikeShelfComponent
    ],

    templateUrl:'./sales-invoice-form.html',

    styleUrls:
    [
        './sales-invoice-form.css'
    ]
})

//===============================================================
// Sales Invoices Form (shared by SP / AC / MB : the page's config
// and service come from its own form file)
//
//   Invoice Information : No (preview), Date, Warehouse, Sales
//                         Person (branch = login branch, locked)
//   Customer            : phone -> card (tag, balance, credit
//                         limit, membership) / Add Customer
//                         (walk-in, switch 0031)
//   Add Items           : search or scan, Qty, Add
//   Items               : the server's priced lines (quote)
//   Summary             : Gross, Campaign / Membership, Special,
//                         Fractional, Invoice Total, Paid, Balance
//   Checkout            : the Payment Desk modal (as the Receipt
//                         Voucher page hosts it)
//
// The server is the single source of the figures : every change
// asks for a quote (debounced); save recomputes the same way.
// Messages go to the shared toast (no extra lines on the page).
// After Save / Post / Approve /
// Return / Cancel the page goes back to the list.
//===============================================================

export class SalesInvoiceForm
implements OnInit, OnDestroy
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

    private readonly lookup =
        inject(AccountingLookupService);

    private readonly voucherSwitches =
        inject(VoucherSwitchesService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly route =
        inject(ActivatedRoute);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);

    // Progress dialog around Save / Approve / Post / Return /
    // Cancel / Add Customer
    private readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges()
        );

    //===========================================================
    // Mode and record
    //===========================================================

    mode:
        FormMode =
        'add';

    entityId:
        number =
        0;

    // uuid from the address bar (the invoice is loaded by it)
    routePublicId:
        string =
        '';

    invoice:
        SalesInvoice | null =
        null;

    defaults:
        SalesInvoiceDefaults | null =
        null;

    loading:
        boolean =
        true;

    loadError:
        string =
        '';

    // Last action error (save / post / ...) : a toast
    private actionErrorText =
        '';

    get actionError():
        string
    {
        return this.actionErrorText;
    }

    set actionError
    (
        value:
            string
    )
    {
        this.actionErrorText =
            value ?? '';

        if (this.actionErrorText)
        {
            this.toast.error(
                this.page.fullTitle,
                this.actionErrorText);
        }
    }

    //===========================================================
    // Invoice Information
    //===========================================================

    invoiceDate:
        string =
        '';

    invoiceDateValue:
        Date | null =
        null;

    warehouseId:
        number | null =
        null;

    salesPersonId:
        number | null =
        null;

    narration:
        string =
        '';

    warehouseItems:
        SelectItem[] =
        [];

    salesPersonItems:
        SelectItem[] =
        [];

    //===========================================================
    // Customer
    //===========================================================

    phoneText:
        string =
        '';

    // Live search (phone 1 / 2, name or code) : the box text,
    // the matches, the highlighted row
    customerQuery:
        string =
        '';

    customerResults:
        SalesInvoiceCustomerSearchItem[] =
        [];

    customerResultsOpen:
        boolean =
        false;

    customerActive:
        number =
        -1;

    customerSearching:
        boolean =
        false;

    private customerSearchTimer:
        ReturnType<typeof setTimeout> | null =
        null;

    private customerSearchSeq:
        number =
        0;

    // Customer card minimized : only the name row shows
    customerCollapsed =
        false;

    customer:
        SalesInvoiceCustomer | null =
        null;

    // Items are added only after the customer is picked
    get hasCustomer():
        boolean
    {
        return !!this.customer && this.customer.CustomerId > 0;
    }

    customerLoading:
        boolean =
        false;

    // Inline message under the phone box
    customerMessage:
        string =
        '';

    // Not found and switch 0031 ON : Add Customer is offered
    canAddWalkIn:
        boolean =
        false;

    walkInOpen:
        boolean =
        false;

    walkInName:
        string =
        '';

    walkInPhone:
        string =
        '';

    walkInAddress:
        string =
        '';

    walkInError:
        string =
        '';

    // Last phone looked up (a repeat lookup is skipped)
    private lookedUpPhone:
        string =
        '';

    //===========================================================
    // Add Items
    //===========================================================

    searchText:
        string =
        '';

    searchResults:
        SalesInvoiceProduct[] =
        [];

    searchLoading:
        boolean =
        false;

    searchOpen:
        boolean =
        false;

    // Search ran and found nothing
    searchEmpty:
        boolean =
        false;

    selectedProduct:
        SalesInvoiceProduct | null =
        null;

    qtyText:
        string =
        '1';

    // Add Items messages : toasts
    private entryErrorText =
        '';

    private entryNoteText =
        '';

    get entryError():
        string
    {
        return this.entryErrorText;
    }

    set entryError
    (
        value:
            string
    )
    {
        this.entryErrorText =
            value ?? '';

        if (this.entryErrorText)
        {
            this.toast.warning(
                'Add Items',
                this.entryErrorText);
        }
    }

    get entryNote():
        string
    {
        return this.entryNoteText;
    }

    set entryNote
    (
        value:
            string
    )
    {
        this.entryNoteText =
            value ?? '';

        if (this.entryNoteText)
        {
            this.toast.info(
                'Add Items',
                this.entryNoteText);
        }
    }

    private searchTimer?:
        number;

    private searchSeq:
        number =
        0;

    // Keyboard row in the results (-1 : none)
    searchActive:
        number =
        -1;

    // Category / sub category filters (kept between items)
    categoryId:
        number | null =
        null;

    subCategoryId:
        number | null =
        null;

    categoryItems:
        SelectItem[] =
        [];

    // Product dropdown : the narrowed area (category / sub
    // category) in the warehouse; picking fills the search box
    productList:
        SalesInvoiceProduct[] =
        [];

    productItems:
        { label: string; value: number; badge: string }[] =
        [];

    productListLoading:
        boolean =
        false;

    private productListSeq:
        number =
        0;

    subCategoryItems:
        SelectItem[] =
        [];

    //===========================================================
    // Lines, discount, payments
    //===========================================================

    lines:
        EntryLine[] =
        [];

    rows:
        ItemRow[] =
        [];

    specialType:
        SalesInvoiceSpecialType =
        'None';

    specialValueText:
        string =
        '';

    readonly specialTypeItems:
        ControlSegmentItem[] =
    [
        {
            value:'None',
            text:'None'
        },
        {
            value:'Percent',
            text:'%'
        },
        {
            value:'Amount',
            text:'Tk'
        }
    ];

    // Payment Desk rows kept on the invoice
    payments:
        VoucherDebitLine[] =
        [];

    //===========================================================
    // Quote (server pricing)
    //===========================================================

    quote:
        SalesInvoiceQuote | null =
        null;

    quoteBusy:
        boolean =
        false;

    // A change is waiting for its quote
    quoteDirty:
        boolean =
        false;

    quoteFailed:
        string =
        '';

    private quoteTimer?:
        number;

    private quoteSeq:
        number =
        0;

    private quoteSubscription:
        any =
        null;

    //===========================================================
    // Change tracking
    //===========================================================

    hasChanges:
        boolean =
        false;

    private originalState:
        string =
        '';

    //===========================================================
    // Checkout (Payment Desk modal)
    //===========================================================

    checkoutOpen:
        boolean =
        false;

    // Working copy while the modal is open
    deskRows:
        VoucherDebitLine[] =
        [];

    // Rows handed to app-payment-desk (new copy on add / remove)
    deskInput:
        VoucherDebitLine[] =
        [];

    private deskSnapshot:
        string =
        '';

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
        SelectItem[] =
        [];

    deskLedgerItems:
        SelectItem[] =
        [];

    private ledgers:
        VoucherLedger[] =
        [];

    ledgersLoaded:
        boolean =
        false;

    // Receipt Voucher : several receipt modes (CFG-MOD-004-0001)
    multiMode:
        boolean =
        false;

    //===========================================================
    // Cancel (inline panel, no pop-up)
    //===========================================================

    cancelOpen:
        boolean =
        false;

    cancelReason:
        string =
        '';

    cancelError:
        string =
        '';


    //===========================================================
    // Initialize / Destroy
    //===========================================================

    ngOnInit():
        void
    {
        this.initializeMode();
    }

    ngOnDestroy():
        void
    {
        this.clearTimer('search');

        this.clearTimer('quote');

        this.quoteSubscription?.unsubscribe?.();
    }

    private clearTimer
    (
        which:
            'search' | 'quote'
    ):
        void
    {
        if
        (
            which === 'search'
            &&
            this.searchTimer
        )
        {
            clearTimeout(this.searchTimer);

            this.searchTimer =
                undefined;
        }

        if
        (
            which === 'quote'
            &&
            this.quoteTimer
        )
        {
            clearTimeout(this.quoteTimer);

            this.quoteTimer =
                undefined;
        }
    }

    // Renders now, and (zoneless) also asks the app for a full pass,
    // the same pass a click would give : results that arrive from the
    // server (customer, prices) show without waiting for an event
    private refresh():
        void
    {
        this.cdr.markForCheck();

        this.cdr.detectChanges();
    }


    //===========================================================
    // Mode
    //===========================================================

    private initializeMode():
        void
    {
        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/')
                ? 'view'
                : url.includes('/edit/')
                    ? 'edit'
                    : 'add';

        const id =
            this.resolveEntityId();

        if
        (
            id !== ''
            &&
            this.mode !== 'add'
        )
        {
            this.routePublicId =
                id;

            this.loadEntity();

            return;
        }

        this.mode =
            'add';

        this.initializeNew();
    }

    // The uuid in the address bar ('' = add)
    private resolveEntityId():
        string
    {
        let current:
            ActivatedRoute | null =
            this.route;

        while
        (
            current
        )
        {
            const id =
                (current.snapshot.paramMap.get('id') ?? '').trim();

            if
            (
                id !== ''
            )
            {
                return id;
            }

            current =
                current.parent;
        }

        return '';
    }

    get isAddMode():
        boolean
    {
        return this.mode === 'add';
    }

    get isEditMode():
        boolean
    {
        return this.mode === 'edit';
    }

    get isViewMode():
        boolean
    {
        return this.mode === 'view';
    }

    // Branch Assignment (user not allotted to the branch) or
    // Business Configuration (branch does not run the line) :
    // nothing can be entered or done on this page here
    get branchBlocked():
        boolean
    {
        return !!this.defaults
            &&
            (
                !this.defaults.UserAllottedToBranch
                ||
                !this.defaults.BranchRunsLine
            );
    }

    get branchBlockMessage():
        string
    {
        return this.defaults?.BranchLineMessage
            || 'This page is blocked for this branch.';
    }

    // Add, or Edit of a draft
    get isEditable():
        boolean
    {
        return !this.loading
            &&
            !this.loadError
            &&
            !this.branchBlocked
            &&
            (
                this.isAddMode
                ||
                (
                    this.isEditMode
                    &&
                    this.status === 'Draft'
                )
            );
    }

    get isReadonly():
        boolean
    {
        return !this.isEditable;
    }

    get status():
        string
    {
        return this.invoice?.Status
            ??
            'Draft';
    }

    get switches():
        SalesInvoiceSwitches | null
    {
        return this.defaults?.Switches
            ??
            null;
    }

    //===========================================================
    // Sale Rules (read only) : how this page behaves, from the
    // System Configurations switches and the VAT setup
    //===========================================================

    get saleRules():
        { icon: string; label: string; value: string; tone: 'ok' | 'off' | 'warn' }[]
    {
        const s =
            this.switches;

        if (!s)
        {
            return [];
        }

        const percent =
            (value: number | null) =>
                value !== null && value !== undefined && value > 0
                    ? `Up to ${value}%`
                    : 'Allowed';

        const vatSince =
            this.defaults?.VatApplicableSince
                ? ` since ${this.displayDate(this.defaults.VatApplicableSince)}`
                : '';

        return [
            {
                icon: 'fa-regular fa-credit-card',
                label: 'Credit Sale',
                value: s.AllowCreditSale ? (s.EnforceCreditLimit ? 'Within credit limit' : 'Allowed') : 'Cash only',
                tone: s.AllowCreditSale ? 'ok' : 'off'
            },
            {
                icon: 'fa-regular fa-pen-to-square',
                label: 'Price Edit',
                value: s.AllowPriceEdit ? percent(s.MaxPriceEditPercent) : 'Locked',
                tone: s.AllowPriceEdit ? 'ok' : 'off'
            },
            {
                icon: 'fa-solid fa-percent',
                label: 'Special Discount',
                value: s.AllowDiscount && this.canGiveSpecial ? percent(s.MaxDiscountPercent) : 'Not allowed',
                tone: s.AllowDiscount && this.canGiveSpecial ? 'ok' : 'off'
            },
            {
                icon: 'fa-solid fa-boxes-stacked',
                label: 'Stock',
                value: s.AllowSaleWithoutStock ? 'Sale without stock' : 'Stock required',
                tone: s.AllowSaleWithoutStock ? 'warn' : 'ok'
            },
            {
                icon: 'fa-solid fa-shield-halved',
                label: 'Below Cost',
                value: s.BlockSaleBelowCost ? 'Blocked' : 'Allowed',
                tone: s.BlockSaleBelowCost ? 'ok' : 'warn'
            },
            {
                icon: 'fa-solid fa-scale-balanced',
                label: 'VAT',
                value: this.defaults?.VatApplicable ? `Applicable${vatSince}` : 'Not applicable',
                tone: this.defaults?.VatApplicable ? 'ok' : 'off'
            },
        ];
    }

    get pageTitle():
        string
    {
        switch
        (
            this.mode
        )
        {
            case 'add':
                return this.page.fullTitle;

            case 'edit':
                return `Update ${this.page.fullTitle}`;

            default:
                return `View ${this.page.fullTitle}`;
        }
    }

    get pageSubtitle():
        string
    {
        return this.switches && !this.switches.PostOnApproval
            ? 'Counter sale : saving posts the invoice and its receipt'
            : 'Sales invoice : Draft -> Approved -> Posted';
    }


    //===========================================================
    // Load : new invoice
    //===========================================================

    private initializeNew():
        void
    {
        this.loading =
            true;

        this.loadError =
            '';

        this.refresh();

        this.salesInvoiceService
            .getDefaults()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    defaults =>
                    {
                        this.applyDefaults(
                            defaults,
                            true
                        );

                        this.resetEntry();

                        this.loading =
                            false;

                        this.setInitialState();

                        this.loadPaymentSetup();

                        this.pickReturnedCustomer();
                    },

                error:
                    error =>
                    {
                        this.loading =
                            false;

                        this.loadError =
                            this.errorText(error, 'The sales invoice defaults could not be loaded.');

                        this.refresh();
                    }
            });
    }

    // Defaults : options, switches, flags; fill = also the header
    // fields of a new invoice
    private applyDefaults
    (
        defaults:
            SalesInvoiceDefaults,
        fill:
            boolean
    ):
        void
    {
        this.defaults =
            defaults;

        this.categoryItems =
            (defaults.Categories ?? []).map
            (
                category =>
                ({
                    label:
                        category.Name,
                    value:
                        category.Id
                })
            );

        this.categoryId =
            null;

        this.subCategoryId =
            null;

        this.buildSubCategoryItems();

        this.warehouseItems =
            defaults.Warehouses.map
            (
                warehouse =>
                ({
                    label:
                        warehouse.IsDefault
                            ? `${warehouse.WarehouseName} (default)`
                            : warehouse.WarehouseName,
                    value:
                        warehouse.WarehouseId
                })
            );

        this.salesPersonItems =
            defaults.SalesPersons.map
            (
                person =>
                ({
                    label:
                        person.UserName && person.UserName !== person.DisplayName
                            ? `${person.DisplayName} (${person.UserName})`
                            : person.DisplayName || person.UserName,
                    value:
                        person.UserProfileId
                })
            );

        this.toastDefaultsIssue();

        if
        (
            !fill
        )
        {
            return;
        }

        this.setInvoiceDate(
            defaults.InvoiceDate || defaults.Today
        );

        this.warehouseId =
            defaults.DefaultWarehouseId
            ??
            defaults.Warehouses.find(x => x.IsDefault)?.WarehouseId
            ??
            defaults.Warehouses[0]?.WarehouseId
            ??
            null;

        this.salesPersonId =
            defaults.DefaultSalesPersonId > 0
                ? defaults.DefaultSalesPersonId
                : null;

        this.saleType =
            'Regular';

        this.paymentTerm =
            'Cash';

        this.emiAccountCode =
            '';

        this.loadProductList();
    }

    // Branch not allotted / not running the line, or no number
    // for the date : told once by a toast
    private toastDefaultsIssue():
        void
    {
        if (this.branchBlocked)
        {
            this.toast.error(
                this.page.fullTitle,
                this.branchBlockMessage);

            return;
        }

        if (this.periodError)
        {
            this.toast.warning(
                this.page.fullTitle,
                this.periodError);
        }
    }

    private resetEntry():
        void
    {
        this.invoice =
            null;

        this.narration =
            '';

        this.phoneText =
            '';

        this.customer =
            null;

        this.customerMessage =
            '';

        this.canAddWalkIn =
            false;

        this.lookedUpPhone =
            '';

        this.closeWalkIn();

        this.lines =
            [];

        this.payments =
            [];

        this.specialType =
            'None';

        this.specialValueText =
            '';

        this.quote =
            null;

        this.quoteDirty =
            false;

        this.quoteFailed =
            '';

        this.actionError =
            '';

        this.clearProductEntry();

        this.rebuildRows();
    }


    //===========================================================
    // Load : saved invoice (Edit / View)
    //===========================================================

    private loadEntity():
        void
    {
        this.loading =
            true;

        this.loadError =
            '';

        this.refresh();

        this.salesInvoiceService
            .getById(this.routePublicId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    invoice =>
                    {
                        // Internal id (actions use it; links use the uuid)
                        this.entityId =
                            invoice.SalesInvoiceId;

                        // Only a draft is edited; others open in View
                        if
                        (
                            this.isEditMode
                            &&
                            invoice.Status !== 'Draft'
                        )
                        {
                            this.mode =
                                'view';
                        }

                        this.salesInvoiceService
                            .getDefaults(invoice.InvoiceDate)
                            .pipe(takeUntilDestroyed(this.destroyRef))
                            .subscribe
                            ({
                                next:
                                    defaults =>
                                    {
                                        this.applyDefaults(
                                            defaults,
                                            false
                                        );

                                        this.fillFromInvoice(
                                            invoice
                                        );
                                    },

                                // The invoice still shows (no flags :
                                // workflow buttons stay hidden)
                                error:
                                    () =>
                                    {
                                        this.fillFromInvoice(
                                            invoice
                                        );
                                    }
                            });
                    },

                error:
                    error =>
                    {
                        this.loading =
                            false;

                        this.loadError =
                            error instanceof HttpErrorResponse && error.status === 404
                                ? 'Sales invoice not found.'
                                : this.errorText(error, 'The sales invoice could not be loaded.');

                        this.refresh();
                    }
            });
    }

    private fillFromInvoice
    (
        invoice:
            SalesInvoice
    ):
        void
    {
        this.invoice =
            invoice;

        this.setInvoiceDate(
            invoice.InvoiceDate
        );

        this.warehouseId =
            invoice.WarehouseId || null;

        this.loadProductList();

        this.salesPersonId =
            invoice.SalesPersonId;

        // The saved warehouse / person may be inactive now : keep
        // them in the lists so they show
        if
        (
            invoice.WarehouseId
            &&
            !this.warehouseItems.some(x => x.value === invoice.WarehouseId)
        )
        {
            this.warehouseItems =
            [
                ...this.warehouseItems,
                {
                    label:invoice.WarehouseName || `Warehouse ${invoice.WarehouseId}`,
                    value:invoice.WarehouseId
                }
            ];
        }

        if
        (
            invoice.SalesPersonId
            &&
            !this.salesPersonItems.some(x => x.value === invoice.SalesPersonId)
        )
        {
            this.salesPersonItems =
            [
                ...this.salesPersonItems,
                {
                    label:invoice.SalesPersonName || `User ${invoice.SalesPersonId}`,
                    value:invoice.SalesPersonId
                }
            ];
        }

        this.narration =
            invoice.Narration;

        this.phoneText =
            invoice.CustomerPhone;

        this.lookedUpPhone =
            invoice.CustomerPhone;

        // Customer card from the saved invoice (Edit refreshes it
        // with a look-up below : balance, membership)
        this.customer =
        {
            Found:true,
            CustomerId:invoice.CustomerId,
            CustomerCode:invoice.CustomerCode,
            DisplayName:invoice.CustomerName,
            Name:invoice.CustomerName,
            Phone:invoice.CustomerPhone,
            Address:invoice.CustomerAddress,
            CustomerType:invoice.CustomerType,
            IsWalkIn:invoice.CustomerIsWalkIn,
            CustomerTag:invoice.CustomerTag || (invoice.CustomerIsWalkIn ? 'Walk-in' : invoice.CustomerType),
            // A corporate invoice's customer was corporate (the
            // look-up below refreshes it)
            IsCorporate:invoice.SaleType === 'Corporate',
            IsActive:true,
            ReceivableLedgerCode:invoice.ReceivableLedgerCode,
            Balance:0,
            BalanceSide:'',
            CreditLimit:0,
            Membership:
                invoice.MembershipId
                    ? {
                        MembershipId:invoice.MembershipId,
                        MembershipNo:invoice.MembershipNo,
                        CardName:invoice.MembershipCardName,
                        SpDiscountPercent:invoice.MembershipDiscountPercent,
                        DiscountLedgerCode:'',
                        ExpiryDate:''
                    }
                    : null,
            CanAddWalkIn:false,
            Message:''
        };

        this.saleType =
            invoice.SaleType === 'Corporate'
                ? 'Corporate'
                : 'Regular';

        // Payment term ('' = saved before the terms : by the balance)
        this.paymentTerm =
            invoice.PaymentTerm === 'EMI' || invoice.PaymentTerm === 'Credit' || invoice.PaymentTerm === 'Cash'
                ? invoice.PaymentTerm
                : (invoice.DueAmount > 0 ? 'Credit' : 'Cash');

        this.emiAccountCode =
            invoice.EmiAccountCode ?? '';

        this.emiAccountName =
            invoice.EmiAccountName ?? '';

        // An item added : the customer card minimizes (more room)
        if (this.customer && invoice.Lines.length > 0) { this.customerCollapsed = true; }

        this.lines =
            invoice.Lines.map
            (
                line =>
                    this.entryFromLine(
                        line
                    )
            );

        this.payments =
            invoice.Payments.map
            (
                row =>
                ({
                    ...row,
                    Verified:true
                })
            );

        this.specialType =
            invoice.InvoiceSpecialType;

        this.specialValueText =
            invoice.InvoiceSpecialType !== 'None' && invoice.InvoiceSpecialValue > 0
                ? String(invoice.InvoiceSpecialValue)
                : '';

        this.quote =
            null;

        this.rebuildRows();

        this.loading =
            false;

        this.setInitialState();

        if
        (
            this.isEditable
        )
        {
            this.loadPaymentSetup();

            this.refreshCustomer();

            this.runQuote();
        }
    }

    private entryFromLine
    (
        line:
            SalesInvoiceLine
    ):
        EntryLine
    {
        const price =
            line.PriceEdited
                ? line.UnitPrice
                : null;

        const special =
            line.SpecialDiscountPercent > 0
                ? line.SpecialDiscountPercent
                : null;

        return {
            ProductId:line.ProductId,
            ProductCode:line.ProductCode,
            PartNumber:line.PartNumber,
            ProductName:line.ProductName,
            ProductType:line.ProductType,
            Unit:line.Unit,
            Quantity:line.Quantity,
            UnitPrice:price,
            SpecialPercent:special,
            OnHand:line.OnHand,
            Mrp:line.Mrp,
            qtyText:this.qtyString(line.Quantity),
            priceText:price != null ? String(price) : '',
            specialText:special != null ? String(special) : '',
            MotorBikeUnitId:line.MotorBikeUnitId ?? null,
            ChassisNo:line.ChassisNo ?? '',
            EngineNo:line.EngineNo ?? '',
            IsElectric:!!line.IsElectric,
            ColorName:line.ColorName ?? '',
            ManufactureYear:line.ManufactureYear ?? null,
            CkdStatus:line.CkdStatus ?? ''
        };
    }

    // Edit : the customer's balance, credit limit and membership
    private refreshCustomer():
        void
    {
        const phone =
            this.phoneText;

        if
        (
            !isCustomerPhone(phone)
        )
        {
            return;
        }

        this.salesInvoiceService
            .lookupCustomer(phone, this.invoiceDate)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    result =>
                    {
                        if
                        (
                            result.Found
                            &&
                            result.CustomerId === this.customer?.CustomerId
                        )
                        {
                            this.customer =
                                result;

                            this.refresh();
                        }
                    },

                error:
                    () =>
                    {
                        // The saved card stays
                    }
            });
    }


    //===========================================================
    // Payment setup : money ledgers + RV multi mode switch
    //===========================================================

    private loadPaymentSetup():
        void
    {
        if
        (
            this.ledgersLoaded
        )
        {
            return;
        }

        this.lookup
            .getLedgers(true)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    ledgers =>
                    {
                        this.ledgers =
                            ledgers ?? [];

                        this.ledgersLoaded =
                            true;

                        this.refresh();
                    },

                error:
                    () =>
                    {
                        this.ledgers =
                            [];

                        this.ledgersLoaded =
                            true;

                        this.refresh();
                    }
            });

        void this.voucherSwitches
            .load()
            .then
            (
                switches =>
                {
                    // Missing switch = one receipt mode (RV page)
                    this.multiMode =
                        switchOn(switches, VOUCHER_SWITCH.RV_MULTI_MODE, false);

                    this.refresh();
                }
            );
    }


    //===========================================================
    // Ribbon (branch, financial year, status)
    //===========================================================

    get branchName():
        string
    {
        return this.invoice?.BranchName
            ||
            this.defaults?.Branch?.BranchName
            ||
            '';
    }

    get financialYearText():
        string
    {
        return this.defaults?.FinancialYearName
            ||
            this.defaults?.FinancialYearCode
            ||
            'Not set';
    }

    // Why no number can be given (no open year, inactive branch)
    get periodError():
        string
    {
        return this.isAddMode
            &&
            this.defaults
            &&
            !this.defaults.NextNumberPreview
                ? (this.defaults.Message || 'No invoice number can be given for this date.')
                : '';
    }

    get statusClass():
        string
    {
        return `si-status si-status-${(this.invoice ? this.status : 'new').toLowerCase()}`;
    }

    get invoiceNoText():
        string
    {
        return this.invoice?.InvoiceNo
            ||
            this.defaults?.NextNumberPreview
            ||
            '';
    }


    //===========================================================
    // Date (today; earlier with 0028; never later)
    //===========================================================

    get maxDate():
        Date | null
    {
        return fromIsoDate(
            this.defaults?.Today
            ||
            toIsoDate(new Date())
        );
    }

    get minDate():
        Date | null
    {
        // Back Dated ON : any day of the open year (server checks)
        return this.switches?.BackDatedSales
            ? null
            : this.maxDate;
    }

    get dateLocked():
        boolean
    {
        return this.isReadonly
            ||
            !this.switches?.BackDatedSales;
    }

    private setInvoiceDate
    (
        iso:
            string
    ):
        void
    {
        this.invoiceDate =
            (iso ?? '').substring(0, 10);

        this.invoiceDateValue =
            fromIsoDate(
                this.invoiceDate
            );
    }

    onDateChange
    (
        value:
            Date | null
    ):
        void
    {
        if
        (
            !value
            ||
            this.isReadonly
        )
        {
            return;
        }

        const iso =
            toIsoDate(value);

        if
        (
            iso === this.invoiceDate
        )
        {
            return;
        }

        const today =
            this.defaults?.Today
            ||
            toIsoDate(new Date());

        if
        (
            iso > today
        )
        {
            this.actionError =
                'The invoice date cannot be later than today.';

            this.setInvoiceDate(
                this.invoiceDate
            );

            this.refresh();

            return;
        }

        this.actionError =
            '';

        this.setInvoiceDate(
            iso
        );

        // Number preview, VAT applicability and membership follow
        // the date
        this.salesInvoiceService
            .getDefaults(iso)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    defaults =>
                    {
                        this.applyDefaults(
                            defaults,
                            false
                        );

                        this.refresh();
                    },

                error:
                    () =>
                    {
                        // Keep the old preview; the server checks on save
                    }
            });

        this.refreshCustomer();

        this.onChanged();
    }

    onWarehouseChange
    (
        value:
            any
    ):
        void
    {
        const id =
            Number(value) || null;

        if
        (
            id === this.warehouseId
        )
        {
            return;
        }

        this.warehouseId =
            id;

        // Stock and MRP are per warehouse
        this.clearProductEntry();

        this.loadProductList();

        this.onChanged();
    }

    onSalesPersonChange
    (
        value:
            any
    ):
        void
    {
        this.salesPersonId =
            Number(value) || null;

        this.checkForChanges();
    }

    onNarrationChange
    (
        value:
            string | number
    ):
        void
    {
        this.narration =
            String(value ?? '');

        this.checkForChanges();
    }


    //===========================================================
    // Customer : live search (3+ characters, 300 ms after the
    // last key). Digits only = a phone : 11 digits look it up at
    // once (and offer Add Customer when new). Arrow keys + Enter
    // pick a match; Esc closes the list.
    //===========================================================

    get customerBoxText():
        string
    {
        return this.customerQuery !== ''
            ? this.customerQuery
            : this.phoneText;
    }

    onCustomerQuery
    (
        value:
            string | number
    ):
        void
    {
        const text =
            String(value ?? '').substring(0, 60);

        this.customerQuery =
            text;

        const digitsOnly =
            /^[\d\s-]*$/.test(text);

        const digits =
            text.replace(/\D/g, '');

        // Typing only filters : nothing is selected until a
        // row is picked from the list
        this.phoneText =
            digitsOnly
                ? digits.substring(0, 11)
                : '';

        if (this.customer)
        {
            this.customer =
                null;

            this.lookedUpPhone =
                '';

            this.onChanged();
        }

        this.customerMessage =
            '';

        this.canAddWalkIn =
            false;

        this.closeWalkIn();

        this.scheduleCustomerSearch(
            text);

        this.refresh();
    }

    private scheduleCustomerSearch
    (
        text:
            string
    ):
        void
    {
        if (this.customerSearchTimer)
        {
            clearTimeout(this.customerSearchTimer);

            this.customerSearchTimer =
                null;
        }

        const term =
            text.trim();

        if (term.length < 3)
        {
            this.customerSearchSeq++;

            this.closeCustomerResults();

            return;
        }

        this.customerSearchTimer =
            setTimeout(
                () =>
                {
                    this.customerSearchTimer =
                        null;

                    this.runCustomerSearch(term);
                },
                300);
    }

    private runCustomerSearch
    (
        term:
            string
    ):
        void
    {
        const seq =
            ++this.customerSearchSeq;

        this.customerSearching =
            true;

        this.refresh();

        this.salesInvoiceService
            .searchCustomers(term)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    items =>
                    {
                        if (seq !== this.customerSearchSeq)
                        {
                            return;
                        }

                        this.customerSearching =
                            false;

                        this.customerResults =
                            items ?? [];

                        // A full phone nobody has : offer Add Customer
                        if
                        (
                            this.customerResults.length === 0
                            &&
                            isCustomerPhone(this.phoneText)
                        )
                        {
                            this.closeCustomerResults();

                            this.customerMessage =
                                'No customer with this phone.';

                            this.canAddWalkIn =
                                !!this.switches?.AllowWalkInCustomers;

                            this.refresh();

                            return;
                        }

                        this.customerResultsOpen =
                            true;

                        this.customerActive =
                            this.customerResults.length > 0 ? 0 : -1;

                        this.refresh();
                    },

                error:
                    error =>
                    {
                        if (seq !== this.customerSearchSeq)
                        {
                            return;
                        }

                        this.customerSearching =
                            false;

                        this.closeCustomerResults();

                        this.customerMessage =
                            this.errorText(error, 'The customer search failed.');

                        this.refresh();
                    }
            });
    }

    closeCustomerResults():
        void
    {
        this.customerResultsOpen =
            false;

        this.customerResults =
            [];

        this.customerActive =
            -1;

        this.customerSearching =
            false;
    }

    onCustomerKey
    (
        event:
            KeyboardEvent
    ):
        void
    {
        if (!this.customerResultsOpen)
        {
            return;
        }

        const count =
            this.customerResults.length;

        if (event.key === 'ArrowDown' && count > 0)
        {
            event.preventDefault();

            this.customerActive =
                (this.customerActive + 1) % count;

            this.refresh();
        }
        else if (event.key === 'ArrowUp' && count > 0)
        {
            event.preventDefault();

            this.customerActive =
                (this.customerActive - 1 + count) % count;

            this.refresh();
        }
        else if (event.key === 'Escape')
        {
            event.preventDefault();

            this.closeCustomerResults();

            this.refresh();
        }
    }

    onCustomerEnter():
        void
    {
        if
        (
            this.customerResultsOpen
            &&
            this.customerActive >= 0
            &&
            this.customerResults[this.customerActive]
        )
        {
            this.pickCustomer(
                this.customerResults[this.customerActive]);

            return;
        }
    }

    // Closes after a click on a row has been handled
    onCustomerBlur():
        void
    {
        setTimeout(
            () =>
            {
                this.closeCustomerResults();

                this.refresh();
            },
            150);
    }

    pickCustomer
    (
        item:
            SalesInvoiceCustomerSearchItem
    ):
        void
    {
        if (this.customerSearchTimer)
        {
            clearTimeout(this.customerSearchTimer);

            this.customerSearchTimer =
                null;
        }

        this.customerSearchSeq++;

        this.closeCustomerResults();

        this.customerQuery =
            item.DisplayName || item.CustomerName;

        this.phoneText =
            item.Phone1;

        this.lookedUpPhone =
            '';

        // The credit check is told once, after the re-pricing for
        // this customer (only when there are items to owe for)
        this.creditToastPending =
            this.lines.length > 0;

        this.findCustomer();
    }

    //===========================================================
    // New customer : Customer Profiles opens with a returnUrl
    // (Motor Bikes : Inbound; Spare Parts / Accessories : Outside);
    // after saving it comes back with ?customerPhone=
    //===========================================================

    openNewCustomer():
        void
    {
        if (!this.isEditable || this.customer)
        {
            return;
        }

        const back =
            this.router.url.split('?')[0];

        const phone =
            isCustomerPhone(this.phoneText)
                ? this.phoneText
                : '';

        void this.router.navigate(
            [
                '/settings/client-settings/customer-profiles/add'
            ],
            {
                queryParams:
                {
                    type:
                        this.newCustomerType,

                    returnUrl:
                        back,

                    phone:
                        phone || null
                }
            }
        );
    }

    get newCustomerType():
        'Inbound' | 'Outside'
    {
        return this.isBikes
            ? 'Inbound'
            : 'Outside';
    }

    // Add mode only : picks the customer just saved, then removes
    // ?customerPhone= from the address bar
    private pickReturnedCustomer():
        void
    {
        const phone =
            String(
                this.route.snapshot.queryParamMap.get('customerPhone')
                ??
                ''
            ).trim();

        if (!phone)
        {
            return;
        }

        void this.router.navigate(
            [],
            {
                relativeTo:
                    this.route,

                queryParams:
                {
                    customerPhone:
                        null
                },

                queryParamsHandling:
                    'merge',

                replaceUrl:
                    true
            }
        );

        if (!isCustomerPhone(phone) || !this.isEditable)
        {
            return;
        }

        this.customerQuery =
            phone;

        this.phoneText =
            phone;

        this.lookedUpPhone =
            '';

        this.findCustomer();
    }

    customerTypeLabel
    (
        item:
            SalesInvoiceCustomerSearchItem
    ):
        string
    {
        return item.IsWalkIn
            ? 'Walk-in'
            : (item.CustomerType || 'Customer');
    }

    findCustomer():
        void
    {
        const phone =
            this.phoneText;

        if
        (
            !isCustomerPhone(phone)
        )
        {
            this.customerMessage =
                'Enter the customer\'s phone : 11 digits starting 01.';

            this.refresh();

            return;
        }

        if
        (
            phone === this.lookedUpPhone
            &&
            this.customer
        )
        {
            return;
        }

        this.customerLoading =
            true;

        this.customerMessage =
            '';

        this.refresh();

        this.salesInvoiceService
            .lookupCustomer(phone, this.invoiceDate)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    result =>
                    {
                        this.customerLoading =
                            false;

                        // Typed on meanwhile
                        if
                        (
                            phone !== this.phoneText
                        )
                        {
                            this.refresh();

                            return;
                        }

                        this.lookedUpPhone =
                            phone;

                        if
                        (
                            result.Found
                        )
                        {
                            try
                            {
                                this.setCustomer(
                                    result
                                );
                            }
                            finally
                            {
                                // Shown at once (zoneless : no waiting
                                // for the next event)
                                this.refresh();
                            }

                            return;
                        }

                        this.customer =
                            null;

                        this.canAddWalkIn =
                            result.CanAddWalkIn
                            &&
                            !!this.switches?.AllowWalkInCustomers;

                        this.customerMessage =
                            result.Message
                            ||
                            'Customer not found.';

                        this.onChanged();
                    },

                error:
                    error =>
                    {
                        this.customerLoading =
                            false;

                        this.customer =
                            null;

                        this.customerMessage =
                            this.errorText(error, 'The customer could not be looked up.');

                        this.refresh();
                    }
            });
    }

    private setCustomer
    (
        customer:
            SalesInvoiceCustomer
    ):
        void
    {
        this.customer =
            customer;

        this.customerMessage =
            customer.IsActive
                ? ''
                : 'This customer is inactive and cannot be invoiced.';

        this.canAddWalkIn =
            false;

        this.closeWalkIn();

        this.onChanged();
    }

    clearCustomer():
        void
    {
        this.customerCollapsed =
            false;

        if
        (
            this.isReadonly
        )
        {
            return;
        }

        this.customer =
            null;

        this.phoneText =
            '';

        this.customerQuery =
            '';

        this.closeCustomerResults();

        this.lookedUpPhone =
            '';

        this.customerMessage =
            '';

        this.canAddWalkIn =
            false;

        this.closeWalkIn();

        this.onChanged();
    }

    get customerTagClass():
        string
    {
        const tag =
            (this.customer?.CustomerTag ?? '').toLowerCase();

        return tag === 'walk-in'
            ? 'si-tag si-tag-walkin'
            : tag === 'inbound'
                ? 'si-tag si-tag-inbound'
                : 'si-tag si-tag-outside';
    }

    // Receivable : + Dr (owes us) / - Cr
    get balanceText():
        string
    {
        const balance =
            this.quote && this.isEditable
                ? this.quote.CustomerBalance
                : this.customer?.Balance ?? 0;

        if
        (
            !balance
        )
        {
            return '0.00';
        }

        const side =
            this.customer?.BalanceSide
            ||
            (balance > 0 ? 'Dr' : 'Cr');

        return `${formatMoney(Math.abs(balance))} ${side}`;
    }

    get balanceOwed():
        boolean
    {
        return (this.customer?.Balance ?? 0) > 0;
    }

    get creditLimitText():
        string
    {
        const limit =
            this.customer?.CreditLimit ?? 0;

        return limit > 0
            ? formatMoney(limit)
            : 'Cash only';
    }

    get membershipText():
        string
    {
        const membership =
            (this.isEditable ? this.quote?.Membership : null)
            ??
            this.customer?.Membership
            ??
            null;

        if
        (
            !membership
        )
        {
            return '';
        }

        const percent =
            membership.SpDiscountPercent > 0
                ? ` · ${this.percentText(membership.SpDiscountPercent)}% on ${this.page.items}`
                : '';

        return `${membership.CardName || 'Member'}${percent}`;
    }

    get membershipSub():
        string
    {
        const membership =
            (this.isEditable ? this.quote?.Membership : null)
            ??
            this.customer?.Membership
            ??
            null;

        if
        (
            !membership
        )
        {
            return '';
        }

        return [
            membership.MembershipNo,
            membership.ExpiryDate ? `till ${this.displayDate(membership.ExpiryDate)}` : ''
        ]
        .filter(x => !!x)
        .join(' · ');
    }


    //===========================================================
    // Add Customer (walk-in) : only by this button (0031)
    //===========================================================

    openWalkIn():
        void
    {
        if
        (
            this.isReadonly
            ||
            !this.canAddWalkIn
        )
        {
            return;
        }

        this.walkInOpen =
            true;

        this.walkInName =
            '';

        this.walkInPhone =
            this.phoneText;

        this.walkInAddress =
            '';

        this.walkInError =
            '';

        this.refresh();
    }

    closeWalkIn():
        void
    {
        this.walkInOpen =
            false;

        this.walkInError =
            '';
    }

    onWalkInName
    (
        value:
            string | number
    ):
        void
    {
        this.walkInName =
            String(value ?? '');

        this.walkInError =
            '';
    }

    onWalkInPhone
    (
        value:
            string | number
    ):
        void
    {
        this.walkInPhone =
            String(value ?? '')
                .replace(/\D/g, '')
                .substring(0, 11);

        this.walkInError =
            '';
    }

    onWalkInAddress
    (
        value:
            string | number
    ):
        void
    {
        this.walkInAddress =
            String(value ?? '');
    }

    saveWalkIn():
        void
    {
        if
        (
            this.progress.busy
        )
        {
            return;
        }

        const name =
            toAsciiText(this.walkInName).trim().replace(/\s+/g, ' ');

        const phone =
            this.walkInPhone.trim();

        if
        (
            name.length < 2
        )
        {
            this.walkInError =
                'Name is required.';

            this.refresh();

            return;
        }

        if
        (
            !isCustomerPhone(phone)
        )
        {
            this.walkInError =
                'Phone must be 11 digits starting 01.';

            this.refresh();

            return;
        }

        this.progress
            .run(
                'Adding Customer',
                'Creating the walk-in customer and its receivable ledger...',
                'Customer added.',
                this.salesInvoiceService.createWalkIn(
                {
                    Name:name,
                    Phone:phone,
                    Address:toAsciiText(this.walkInAddress).trim()
                })
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    customer =>
                    {
                        this.phoneText =
                            customer.Phone || phone;

                        this.lookedUpPhone =
                            this.phoneText;

                        this.setCustomer(
                        {
                            ...customer,
                            Found:true
                        });
                    },

                error:
                    error =>
                    {
                        this.walkInError =
                            this.errorText(error, 'The customer could not be added.');

                        this.refresh();
                    }
            });
    }


    //===========================================================
    // Add Items : search / scan
    //===========================================================

    onSearchChange
    (
        value:
            string | number
    ):
        void
    {
        this.searchText =
            String(value ?? '');

        this.entryError =
            '';

        this.entryNote =
            '';

        // Typing only filters : the picked item goes until a
        // row is chosen again
        this.selectedProduct =
            null;

        this.clearTimer('search');

        const term =
            this.searchText.trim();

        if
        (
            term.length < 2
        )
        {
            this.searchResults =
                [];

            this.searchOpen =
                false;

            this.searchEmpty =
                false;

            this.refresh();

            return;
        }

        this.searchTimer =
            window.setTimeout(
                () =>
                    this.runSearch(false),
                300
            );
    }

    get hasCategoryFilter():
        boolean
    {
        return !!this.categoryId || !!this.subCategoryId;
    }

    private buildSubCategoryItems():
        void
    {
        const all =
            this.defaults?.SubCategories ?? [];

        this.subCategoryItems =
            all
                .filter(x => !this.categoryId || x.ParentId === this.categoryId)
                .map
                (
                    sub =>
                    ({
                        label:
                            sub.Name,
                        value:
                            sub.Id
                    })
                );
    }

    onCategoryChange
    (
        value:
            any
    ):
        void
    {
        const id =
            Number(value) || null;

        if
        (
            id === this.categoryId
        )
        {
            return;
        }

        this.categoryId =
            id;

        // The sub category must belong to the category
        const sub =
            (this.defaults?.SubCategories ?? [])
                .find(x => x.Id === this.subCategoryId);

        if
        (
            sub
            &&
            id
            &&
            sub.ParentId !== id
        )
        {
            this.subCategoryId =
                null;
        }

        this.buildSubCategoryItems();

        this.loadProductList();

        this.refilter();
    }

    onSubCategoryChange
    (
        value:
            any
    ):
        void
    {
        const id =
            Number(value) || null;

        if
        (
            id === this.subCategoryId
        )
        {
            return;
        }

        this.subCategoryId =
            id;

        // Picking a sub category fixes its category
        const sub =
            (this.defaults?.SubCategories ?? [])
                .find(x => x.Id === id);

        if
        (
            sub
            &&
            sub.ParentId
            &&
            this.categoryId !== sub.ParentId
        )
        {
            this.categoryId =
                sub.ParentId;

            this.buildSubCategoryItems();
        }

        this.loadProductList();

        this.refilter();
    }

    // A filter changed : only narrows the search; the list is
    // run again only when there is text in the product box
    private refilter():
        void
    {
        this.clearTimer('search');

        this.selectedProduct =
            null;

        this.entryError =
            '';

        this.entryNote =
            '';

        const term =
            this.searchText.trim();

        if
        (
            term.length >= 2
        )
        {
            this.runSearch(false);

            return;
        }

        this.searchResults =
            [];

        this.searchOpen =
            false;

        this.searchEmpty =
            false;

        this.searchActive =
            -1;

        this.refresh();
    }

    // Add Items : Clear empties the section only (category, sub
    // category, search, picked item, quantity)
    clearAddSection():
        void
    {
        this.clearProductEntry();

        this.categoryId =
            null;

        this.subCategoryId =
            null;

        this.searchActive =
            -1;

        this.buildSubCategoryItems();

        this.loadProductList();

        this.refresh();
    }

    // The product dropdown's list for the warehouse and filters
    private loadProductList():
        void
    {
        // MB : bikes by chassis, not the product search
        if (this.isBikes)
        {
            this.loadBikeUnits();

            return;
        }

        const seq =
            ++this.productListSeq;

        if
        (
            !this.warehouseId
            ||
            this.branchBlocked
        )
        {
            this.productList =
                [];

            this.productItems =
                [];

            this.productListLoading =
                false;

            return;
        }

        this.productListLoading =
            true;

        this.salesInvoiceService
            .searchProducts(
                this.warehouseId,
                '',
                this.categoryId,
                this.subCategoryId,
                true)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    products =>
                    {
                        if (seq !== this.productListSeq)
                        {
                            return;
                        }

                        this.productListLoading =
                            false;

                        this.productList =
                            products.filter(x => x.IsActive);

                        this.productItems =
                            this.productList.map
                            (
                                product =>
                                ({
                                    label:
                                        `${product.PartNumber || product.ProductCode} - ${product.PartName || product.ProductName}`,
                                    value:
                                        product.ProductId,
                                    badge:
                                        `${this.qtyString(product.OnHand)} ${product.Unit}`.trim()
                                })
                            );

                        this.refresh();
                    },

                error:
                    () =>
                    {
                        if (seq !== this.productListSeq)
                        {
                            return;
                        }

                        this.productListLoading =
                            false;

                        this.productList =
                            [];

                        this.productItems =
                            [];

                        this.refresh();
                    }
            });
    }

    get productPlaceholder():
        string
    {
        if (this.productListLoading)
        {
            return 'Loading...';
        }

        if (this.productItems.length === 0)
        {
            return this.hasCategoryFilter
                ? 'No items in this category'
                : 'No items';
        }

        return `Select from ${this.productItems.length} item${this.productItems.length === 1 ? '' : 's'}`;
    }

    // Product dropdown : picks the item and fills the search box
    onProductPick
    (
        value:
            any
    ):
        void
    {
        const id =
            Number(value) || 0;

        const product =
            this.productList.find(x => x.ProductId === id);

        if
        (
            !product
            ||
            product.ProductId === this.selectedProduct?.ProductId
        )
        {
            return;
        }

        this.clearTimer('search');

        this.searchSeq++;

        this.searchLoading =
            false;

        this.selectProduct(product);
    }

    onSearchKey
    (
        event:
            KeyboardEvent
    ):
        void
    {
        if
        (
            !this.searchOpen
        )
        {
            return;
        }

        const count =
            this.searchResults.length;

        if (event.key === 'ArrowDown' && count > 0)
        {
            event.preventDefault();

            this.searchActive =
                (this.searchActive + 1) % count;

            this.refresh();
        }
        else if (event.key === 'ArrowUp' && count > 0)
        {
            event.preventDefault();

            this.searchActive =
                (this.searchActive - 1 + count) % count;

            this.refresh();
        }
        else if (event.key === 'Escape')
        {
            event.preventDefault();

            this.closeSearch();
        }
    }

    // Closes after a click on a row has been handled
    onSearchBlur():
        void
    {
        window.setTimeout(
            () =>
            {
                if (this.searchOpen)
                {
                    this.closeSearch();
                }
            },
            150);
    }

    // Enter : the highlighted row; otherwise search now, where a
    // scanned batch label (or a single match) is taken at once
    onSearchEnter():
        void
    {
        this.clearTimer('search');

        if
        (
            this.searchOpen
            &&
            this.searchActive >= 0
            &&
            this.searchResults[this.searchActive]
        )
        {
            this.selectProduct(
                this.searchResults[this.searchActive]);

            return;
        }

        this.runSearch(true);
    }

    private runSearch
    (
        pickSingle:
            boolean
    ):
        void
    {
        const text =
            this.searchText.trim();

        if
        (
            !text
            ||
            this.isReadonly
        )
        {
            return;
        }

        if
        (
            !this.warehouseId
        )
        {
            this.entryError =
                'Select the warehouse first.';

            this.refresh();

            return;
        }

        const seq =
            ++this.searchSeq;

        this.searchLoading =
            true;

        this.refresh();

        this.salesInvoiceService
            .searchProducts(
                this.warehouseId,
                toAsciiText(text),
                this.categoryId,
                this.subCategoryId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    products =>
                    {
                        if
                        (
                            seq !== this.searchSeq
                        )
                        {
                            return;
                        }

                        this.searchLoading =
                            false;

                        this.searchResults =
                            products.filter(x => x.IsActive);

                        this.searchEmpty =
                            this.searchResults.length === 0;

                        this.searchOpen =
                            true;

                        this.searchActive =
                            this.searchResults.length > 0 ? 0 : -1;

                        const scanned =
                            this.searchResults.find(x => !!x.ScannedBatchId);

                        if
                        (
                            scanned
                        )
                        {
                            // Barcode : one unit straight onto the invoice
                            this.selectProduct(scanned);

                            this.qtyText =
                                '1';

                            this.onAddLine();

                            return;
                        }

                        if
                        (
                            pickSingle
                            &&
                            this.searchResults.length === 1
                        )
                        {
                            this.selectProduct(
                                this.searchResults[0]
                            );

                            return;
                        }

                        this.refresh();
                    },

                error:
                    error =>
                    {
                        if
                        (
                            seq !== this.searchSeq
                        )
                        {
                            return;
                        }

                        this.searchLoading =
                            false;

                        this.searchResults =
                            [];

                        this.searchOpen =
                            false;

                        this.entryError =
                            this.errorText(error, 'The search could not be run.');

                        this.refresh();
                    }
            });
    }

    selectProduct
    (
        product:
            SalesInvoiceProduct
    ):
        void
    {
        this.selectedProduct =
            product;

        this.searchOpen =
            false;

        this.searchText =
            product.ProductName || product.ProductCode;

        this.entryError =
            product.Mrp > 0
                ? ''
                : `${product.ProductCode} has no MRP and cannot be sold.`;

        const existing =
            this.lines.find(x => x.ProductId === product.ProductId);

        this.entryNote =
            existing
                ? `Already on the invoice (${this.qtyString(existing.Quantity)} ${existing.Unit}); Add puts the quantity on that line.`
                : '';

        if
        (
            !parseMoney(this.qtyText)
        )
        {
            this.qtyText =
                '1';
        }

        this.refresh();
    }

    closeSearch():
        void
    {
        this.searchOpen =
            false;

        this.refresh();
    }

    onQtyTextChange
    (
        value:
            string | number
    ):
        void
    {
        this.qtyText =
            String(value ?? '');

        this.entryError =
            '';
    }

    private clearProductEntry():
        void
    {
        this.clearTimer('search');

        this.searchText =
            '';

        this.searchResults =
            [];

        this.searchOpen =
            false;

        this.searchEmpty =
            false;

        this.searchLoading =
            false;

        this.selectedProduct =
            null;

        this.qtyText =
            '1';

        this.entryError =
            '';

        this.entryNote =
            '';
    }

    get selectedStockText():
        string
    {
        const product =
            this.selectedProduct;

        if
        (
            !product
        )
        {
            return '';
        }

        return `${this.qtyString(product.OnHand)} ${product.Unit || ''}`.trim();
    }

    get selectedMrpText():
        string
    {
        const product =
            this.selectedProduct;

        if
        (
            !product
        )
        {
            return '';
        }

        return product.Mrp > 0
            ? formatMoney(product.Mrp)
            : 'Not priced';
    }

    // Quantity : more than 0, at most 2 decimals
    private quantityIssue
    (
        value:
            number,
        text:
            string
    ):
        string
    {
        if
        (
            !(value > 0)
        )
        {
            return 'Quantity must be more than 0.';
        }

        if
        (
            !/^\d+(\.\d{1,2})?$/.test(String(text ?? '').replace(/,/g, '').trim())
        )
        {
            return 'Quantity can have at most 2 decimals.';
        }

        return '';
    }

    //===========================================================
    // MB : Add Motor Bike (model -> colour -> chassis). One bike
    // per line, quantity 1; the chassis in stock in the warehouse,
    // oldest first
    //===========================================================

    get isBikes():
        boolean
    {
        return this.page.pageType === 'MB';
    }

    bikeUnits:
        SalesInvoiceBikeUnit[] =
        [];

    bikeUnitsLoading:
        boolean =
        false;

    bikeModelId:
        number | null =
        null;

    bikeColor:
        string =
        '';

    bikeUnitId:
        number | null =
        null;

    private bikeUnitsSeq:
        number =
        0;

    private loadBikeUnits():
        void
    {
        const seq =
            ++this.bikeUnitsSeq;

        if
        (
            !this.warehouseId
            ||
            this.branchBlocked
        )
        {
            this.bikeUnits =
                [];

            this.bikeUnitsLoading =
                false;

            return;
        }

        // Not "isEditable" : the defaults arrive while the page
        // is still loading (the list came back empty, 2026-11-09)
        this.bikeUnitsLoading =
            true;

        this.salesInvoiceService
            .getBikeUnits(this.warehouseId, this.invoice?.SalesInvoiceId ?? 0)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    units =>
                    {
                        if (seq !== this.bikeUnitsSeq)
                        {
                            return;
                        }

                        this.bikeUnitsLoading =
                            false;

                        this.bikeUnits =
                            units;

                        // The picked chassis may be gone
                        if (this.bikeUnitId && !units.some(x => x.MotorBikeUnitId === this.bikeUnitId))
                        {
                            this.bikeUnitId =
                                null;
                        }

                        this.refresh();
                    },

                error:
                    () =>
                    {
                        if (seq !== this.bikeUnitsSeq)
                        {
                            return;
                        }

                        this.bikeUnitsLoading =
                            false;

                        this.bikeUnits =
                            [];

                        this.toast.error('Not Loaded', 'The bikes in stock could not be loaded.');

                        this.refresh();
                    }
            });
    }

    // Bikes not on this invoice (lines) yet
    private get freeBikes():
        SalesInvoiceBikeUnit[]
    {
        const taken =
            new Set(this.lines.map(x => x.MotorBikeUnitId ?? 0));

        // Priced bikes only (no MRP : not saleable)
        return this.bikeUnits.filter(x => !taken.has(x.MotorBikeUnitId) && x.Mrp > 0);
    }

    // Bikes in stock here without an MRP (left out)
    get unpricedBikeCount():
        number
    {
        return this.bikeUnits.filter(x => !(x.Mrp > 0)).length;
    }

    // The dropdowns' bikes : the free ones, plus the bike of a
    // line loaded by a double click (it is on the invoice)
    private get pickerBikes():
        SalesInvoiceBikeUnit[]
    {
        const loaded =
            this.pickedBike;

        return loaded && !this.freeBikes.includes(loaded)
            ? [...this.freeBikes, loaded]
            : this.freeBikes;
    }

    // The picked bike is on this invoice (loaded from its line)
    get pickedOnInvoice():
        boolean
    {
        const unit =
            this.pickedBike;

        return !!unit && this.lines.some(x => x.MotorBikeUnitId === unit.MotorBikeUnitId);
    }

    get pickedLineNo():
        number
    {
        const unit =
            this.pickedBike;

        return unit ? this.lines.findIndex(x => x.MotorBikeUnitId === unit.MotorBikeUnitId) + 1 : 0;
    }

    // Items : a double click on a bike line loads it into the Add
    // card (its chassis, engine and CKD in full)
    onRowDblClick
    (
        row:
            any
    ):
        void
    {
        const id =
            row?.entry?.MotorBikeUnitId ?? 0;

        if (!this.isBikes || !id)
        {
            return;
        }

        const unit =
            this.bikeUnits.find(x => x.MotorBikeUnitId === id);

        if (!unit)
        {
            this.toast.error('Not Loaded', `Chassis ${row.entry.ChassisNo} is not in the bikes of this warehouse.`);

            return;
        }

        this.addCkdReasonOpen =
            false;

        this.bikeModelId =
            unit.ProductSubCategoryId;

        this.bikeColor =
            unit.ColorName || unit.ProductName;

        this.bikeUnitId =
            unit.MotorBikeUnitId;

        this.entryError =
            '';

        this.refresh();
    }

    get bikeModelItems():
        any[]
    {
        const models =
            new Map<number, { name:string; count:number }>();

        this.pickerBikes.forEach
        (
            x =>
            {
                const found =
                    models.get(x.ProductSubCategoryId);

                models.set(x.ProductSubCategoryId, { name:x.ModelName || x.ProductName, count:(found?.count ?? 0) + (x.OnInvoiceNo ? 0 : 1) });
            }
        );

        return [...models.entries()]
            .sort((a, b) => a[1].name.localeCompare(b[1].name))
            .map(([id, m]) => ({ label:m.name, value:id, badge:`${m.count} in stock` }));
    }

    get bikeColorItems():
        any[]
    {
        if (!this.bikeModelId)
        {
            return [];
        }

        const colors =
            new Map<string, number>();

        this.pickerBikes
            .filter(x => x.ProductSubCategoryId === this.bikeModelId)
            .forEach(x => colors.set(x.ColorName || x.ProductName, (colors.get(x.ColorName || x.ProductName) ?? 0) + (x.OnInvoiceNo ? 0 : 1)));

        return [...colors.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([name, count]) => ({ label:name, value:name, badge:`${count}` }));
    }

    private get bikeChoices():
        SalesInvoiceBikeUnit[]
    {
        return this.pickerBikes
            .filter(x => x.ProductSubCategoryId === this.bikeModelId && (x.ColorName || x.ProductName) === this.bikeColor);
    }

    get bikeChassisItems():
        any[]
    {
        if (!this.bikeModelId || !this.bikeColor)
        {
            return [];
        }

        return this.bikeChoices
            .map
            (
                x =>
                ({
                    label:`${x.ChassisNo} · ${x.IsElectric ? 'Motor ' : ''}${x.EngineNo}${x.ManufactureYear ? ' · ' + x.ManufactureYear : ''}`,
                    value:x.MotorBikeUnitId,
                    badge:x.OnInvoiceNo ? `on ${x.OnInvoiceNo}` : `CKD ${x.CkdStatus}`,
                    disabled:!!x.OnInvoiceNo
                })
            );
    }

    get pickedBike():
        SalesInvoiceBikeUnit | null
    {
        return this.bikeUnits.find(x => x.MotorBikeUnitId === this.bikeUnitId) ?? null;
    }

    //===========================================================
    // MB : warranty of the picked bike (brand Service Policy),
    // loaded once per model and kept
    //===========================================================

    private warranties:
        Map<number, SalesInvoiceWarranty | null> =
        new Map();

    private warrantyLoading:
        Set<number> =
        new Set();

    warrantyOf
    (
        productId:
            number
    ):
        SalesInvoiceWarranty | null | undefined
    {
        if (!(productId > 0))
        {
            return null;
        }

        if (this.warranties.has(productId))
        {
            return this.warranties.get(productId);
        }

        if (!this.warrantyLoading.has(productId))
        {
            this.warrantyLoading.add(productId);

            this.salesInvoiceService
                .getWarranty(productId, this.invoiceDate ? String(this.invoiceDate) : '')
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe
                ({
                    next:
                        warranty =>
                        {
                            this.warranties.set(productId, warranty);
                            this.warrantyLoading.delete(productId);
                            this.refresh();
                        },

                    error:
                        () =>
                        {
                            this.warranties.set(productId, null);
                            this.warrantyLoading.delete(productId);
                            this.refresh();
                        }
                });
        }

        return undefined;
    }

    // "2 Years / 20,000 km" ; '' when nothing is set
    warrantyText
    (
        w:
            { PeriodValue:number; PeriodUnit:string; KmLimit:number | null }
    ):
        string
    {
        const unit =
            w.PeriodValue === 1 ? (w.PeriodUnit || '').replace(/s$/, '') : w.PeriodUnit;

        const parts =
            [
                w.PeriodValue > 0 ? `${w.PeriodValue} ${unit}` : '',
                (w.KmLimit ?? 0) > 0 ? `${(w.KmLimit ?? 0).toLocaleString('en-US')} km` : ''
            ]
            .filter(x => x);

        return parts.join(' / ');
    }


    get bikeFreeCount():
        number
    {
        return this.freeBikes.filter(x => !x.OnInvoiceNo).length;
    }

    onBikeModel
    (
        value:
            any
    ):
        void
    {
        this.bikeModelId =
            Number(value) || null;

        this.bikeColor =
            '';

        this.bikeUnitId =
            null;

        // One colour only : picked
        const colors =
            this.bikeColorItems;

        if (colors.length === 1)
        {
            this.onBikeColor(colors[0].value);

            return;
        }

        this.refresh();
    }

    onBikeColor
    (
        value:
            any
    ):
        void
    {
        this.bikeColor =
            String(value ?? '');

        // Oldest chassis first : the first free one
        const first =
            this.bikeChoices.find(x => !x.OnInvoiceNo);

        this.bikeUnitId =
            first?.MotorBikeUnitId ?? null;

        this.refresh();
    }

    onBikeChassis
    (
        value:
            any
    ):
        void
    {
        const id =
            Number(value) || null;

        const unit =
            this.bikeUnits.find(x => x.MotorBikeUnitId === id);

        if (unit?.OnInvoiceNo)
        {
            this.entryError =
                `Chassis ${unit.ChassisNo} is on invoice ${unit.OnInvoiceNo}.`;

            this.refresh();

            return;
        }

        this.bikeUnitId =
            id;

        this.entryError =
            '';

        this.refresh();
    }

    clearBikeEntry():
        void
    {
        this.addCkdReasonOpen =
            false;

        this.bikeModelId =
            null;

        this.bikeColor =
            '';

        this.bikeUnitId =
            null;

        this.entryError =
            '';

        this.refresh();
    }

    addBike():
        void
    {
        if (!this.hasCustomer)
        {
            return;
        }

        if
        (
            this.isReadonly
        )
        {
            return;
        }

        const unit =
            this.pickedBike;

        if
        (
            !unit
        )
        {
            this.entryError =
                'Pick the model, colour and chassis first.';

            this.refresh();

            return;
        }

        const error =
            this.bikeProblem(unit);

        if
        (
            error
        )
        {
            this.entryError =
                error;

            this.refresh();

            return;
        }

        // An item added : the customer card minimizes (more room)
        if (this.customer) { this.customerCollapsed = true; }

        this.lines =
        [
            ...this.lines,
            this.bikeLine(unit)
        ];

        // Next bike of the same model / colour ready (corporate sale)
        this.bikeUnitId =
            this.bikeChoices.find(x => !x.OnInvoiceNo)?.MotorBikeUnitId ?? null;

        this.cancelAddCkd();

        this.entryError =
            '';

        this.onChanged();
    }

    // Why a chassis cannot go on the invoice ('' = it can)
    private bikeProblem
    (
        unit:
            SalesInvoiceBikeUnit
    ):
        string
    {
        if (!(unit.Mrp > 0))
        {
            return `${unit.ProductCode} (chassis ${unit.ChassisNo}) has no MRP and cannot be sold.`;
        }

        if (unit.OnInvoiceNo)
        {
            return `Chassis ${unit.ChassisNo} is on invoice ${unit.OnInvoiceNo}.`;
        }

        if (this.lines.some(x => x.MotorBikeUnitId === unit.MotorBikeUnitId))
        {
            return `Chassis ${unit.ChassisNo} is on the invoice already.`;
        }

        if (this.saleType === 'Regular' && this.lines.length >= 1)
        {
            return `Regular sale : one chassis per invoice. ${this.corporateAvailable ? 'Choose Corporate for several bikes.' : 'Remove the bike on the invoice first.'}`;
        }

        return '';
    }


    //===========================================================
    // Sale Type (MB) : Regular = one chassis; Corporate = several,
    // for a Corporate / Institution customer, while switch 0073 is
    // ON and the invoice date is inside its window (0074 / 0075)
    //===========================================================

    saleType:
        'Regular' | 'Corporate' =
        'Regular';

    // Switch ON and the date inside From / Until
    get corporateAvailable():
        boolean
    {
        return !this.corporateBlockText;
    }

    // Why the Corporate tab is closed ('' = open)
    get corporateBlockText():
        string
    {
        const sw =
            this.switches;

        if (!sw?.AllowCorporateSale)
        {
            return 'Corporate sales are OFF (System Configuration › Allow Corporate Sale).';
        }

        const date =
            this.invoiceDate;

        if (sw.CorporateSaleFrom && date && date < sw.CorporateSaleFrom)
        {
            return `Corporate sales start on ${this.dateLabel(sw.CorporateSaleFrom)}.`;
        }

        if (sw.CorporateSaleUntil && date && date > sw.CorporateSaleUntil)
        {
            return `Corporate sales ended on ${this.dateLabel(sw.CorporateSaleUntil)}.`;
        }

        return '';
    }

    private dateLabel
    (
        iso:
            string
    ):
        string
    {
        const m =
            /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');

        const months =
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return m ? `${m[3]}-${months[Number(m[2]) - 1]}-${m[1]}` : iso;
    }

    //===========================================================
    // Payment term (2026-11-10) : Cash / Credit / EMI
    //   Cash   : fully paid through Checkout
    //   Credit : the balance to the receivable (Allow Credit Sale,
    //            "Credit Sale" activity, not walk-in)
    //   EMI    : MB; the balance is collected through the chosen
    //            EMI account (Receipt Voucher, EMI row) - other
    //            modes still take the down payment ("EMI Sale")
    // A tab the switch / permission / customer closes is disabled.
    //===========================================================

    paymentTerm:
        'Cash' | 'Credit' | 'EMI' =
        'Cash';

    emiAccountCode:
        string =
        '';

    emiAccountName:
        string =
        '';

    // Why Credit is closed ('' = open)
    get creditBlockText():
        string
    {
        if (!this.switches?.AllowCreditSale)
        {
            return 'Credit sales are OFF (System Configuration › Allow Credit Sale).';
        }

        if (!this.defaults?.CanCreditSale)
        {
            return 'You do not have the "Credit Sale" permission on this page.';
        }

        if (this.customer?.IsWalkIn)
        {
            return 'Walk-in customers are cash only.';
        }

        return '';
    }

    // Why EMI is closed ('' = open)
    get emiBlockText():
        string
    {
        if (!this.defaults?.EmiAvailable)
        {
            return 'EMI : only motor bikes are sold on EMI.';
        }

        if (!this.defaults?.CanEmiSale)
        {
            return 'You do not have the "EMI Sale" permission on this page.';
        }

        if (this.customer?.IsWalkIn)
        {
            return 'EMI needs a named customer (not walk-in).';
        }

        return '';
    }

    get termItems():
        ControlSegmentItem[]
    {
        return [
            { value:'Cash', text:'Cash' },
            { value:'Credit', text:'Credit', disabled:this.paymentTerm !== 'Credit' && !!this.creditBlockText },
            { value:'EMI', text:'EMI', disabled:this.paymentTerm !== 'EMI' && !!this.emiBlockText }
        ];
    }

    get termTitle():
        string
    {
        const notes =
            [
                'Cash : fully paid through Checkout',
                this.creditBlockText ? `Credit : ${this.creditBlockText}` : 'Credit : the balance goes to the customer receivable',
                this.emiBlockText ? `EMI : ${this.emiBlockText}` : 'EMI : the balance is collected through the EMI account; take the down payment on Checkout'
            ];

        return notes.join('\n');
    }

    // EMI accounts (EMI Setup) : active, collection, branch rule
    get emiItems():
        SelectItem[]
    {
        const branch =
            this.branchName.trim().toUpperCase();

        return this.ledgers
            .filter
            (
                ledger =>
                    ledger.LedgerType === 'EMI'
                    &&
                    ledger.CollectionAccount
                    &&
                    ledger.IsActive
                    &&
                    (!ledger.BranchExclusive || (ledger.Branch ?? '').trim().toUpperCase() === branch)
            )
            .sort((a, b) => a.LedgerName.localeCompare(b.LedgerName))
            .map(ledger => ({ label:ledger.LedgerName, value:ledger.LedgerCode }));
    }

    get emiPlaceholder():
        string
    {
        return !this.ledgersLoaded
            ? 'Loading EMI accounts...'
            : this.emiItems.length
                ? 'Choose the EMI account (required)'
                : 'No EMI account for this branch (EMI Setup)';
    }

    // The term's line under the header ('' = none)
    get termHint():
        string
    {
        if (!this.isEditable)
        {
            return this.paymentTerm === 'EMI' && this.emiAccountName
                ? `EMI through ${this.emiAccountName}.`
                : '';
        }

        const due =
            this.figures.Due;

        if (this.paymentTerm === 'Cash')
        {
            return due > 0 && this.lines.length > 0
                ? `Cash sale : collect the full amount through Checkout (${formatMoney(due)} left).`
                : '';
        }

        if (this.paymentTerm === 'Credit')
        {
            return this.creditBlockText
                ? this.creditBlockText
                : due > 0
                    ? `Credit : ${formatMoney(due)} goes to the customer's receivable.`
                    : 'Credit : leave the balance unpaid on Checkout.';
        }

        if (this.emiBlockText)
        {
            return this.emiBlockText;
        }

        if (!this.emiAccountCode)
        {
            return 'EMI : choose the EMI account; take the down payment (if any) on Checkout.';
        }

        return due > 0
            ? `EMI : ${formatMoney(due)} is collected through ${this.emiAccountName || 'the EMI account'} (Receipt Voucher).`
            : 'EMI : nothing is left for EMI - take less on Checkout, or choose Cash.';
    }

    get termHintBad():
        boolean
    {
        if (!this.isEditable)
        {
            return false;
        }

        return (this.paymentTerm === 'Cash' && this.figures.Due > 0 && this.lines.length > 0)
            || (this.paymentTerm === 'Credit' && !!this.creditBlockText)
            || (this.paymentTerm === 'EMI' && (!!this.emiBlockText || !this.emiAccountCode || !(this.figures.Due > 0)));
    }

    // One hint line under the header : a problem first (term,
    // then sale type), else the term's note, else the sale type's
    get headHint():
        string
    {
        const sale =
            this.showSaleType ? this.saleTypeHint : '';

        if (this.termHintBad && this.termHint)
        {
            return this.termHint;
        }

        if (sale && this.saleTypeHintBad)
        {
            return sale;
        }

        return this.termHint || sale;
    }

    get headHintBad():
        boolean
    {
        return (this.termHintBad && !!this.termHint)
            || (!!this.saleTypeHint && this.showSaleType && this.saleTypeHintBad);
    }

    onTermChange
    (
        value:
            any
    ):
        void
    {
        const next =
            value === 'Credit' || value === 'EMI'
                ? value
                : 'Cash';

        if (this.isReadonly || next === this.paymentTerm)
        {
            this.refresh();

            return;
        }

        const blocked =
            next === 'Credit' ? this.creditBlockText
            : next === 'EMI' ? this.emiBlockText
            : '';

        if (blocked)
        {
            this.toast.error(next === 'EMI' ? 'EMI Sale' : 'Credit Sale', blocked);

            this.refresh();

            return;
        }

        this.paymentTerm =
            next;

        if (next === 'EMI')
        {
            this.loadPaymentSetup();

            const items =
                this.emiItems;

            if (!this.emiAccountCode && items.length === 1)
            {
                this.emiAccountCode = items[0].value;
                this.emiAccountName = items[0].label;
            }
        }

        this.onChanged();
    }

    onEmiAccountChange
    (
        value:
            any
    ):
        void
    {
        this.emiAccountCode =
            String(value ?? '');

        this.emiAccountName =
            this.emiItems.find(x => x.value === this.emiAccountCode)?.label ?? '';

        this.onChanged();
    }

    // The tab is shown when the switch is ON (or the invoice is
    // already Corporate)
    get showSaleType():
        boolean
    {
        // Always on Motor Bikes : Corporate is greyed out (with the
        // reason on hover) while the switch / window closes it
        return this.isBikes;
    }

    get saleTypeItems():
        ControlSegmentItem[]
    {
        return [
            { value:'Regular', text:'Regular' },
            { value:'Corporate', text:'Corporate', disabled:this.saleType !== 'Corporate' && !this.corporateAvailable }
        ];
    }

    // The customer on a Corporate invoice must be Corporate /
    // Institution ('' = fine)
    get saleTypeHint():
        string
    {
        if (this.saleType === 'Corporate')
        {
            if (this.customer && !this.customer.IsCorporate)
            {
                return `${this.customer.DisplayName} is not a Corporate / Institution customer : mark it in Customer Profiles, or choose Regular.`;
            }

            return this.corporateBlockText
                ? this.corporateBlockText
                : 'Corporate sale : several chassis on this invoice (one customer file each).';
        }

        return this.lines.length >= 1
            ? 'Regular sale : one chassis per invoice.'
            : '';
    }

    get saleTypeHintBad():
        boolean
    {
        return this.saleType === 'Corporate'
            &&
            (
                (!!this.customer && !this.customer.IsCorporate)
                ||
                !!this.corporateBlockText
            );
    }

    onSaleTypeChange
    (
        value:
            any
    ):
        void
    {
        const next =
            value === 'Corporate'
                ? 'Corporate'
                : 'Regular';

        if (next === this.saleType || this.isReadonly)
        {
            this.refresh();

            return;
        }

        if (next === 'Corporate' && !this.corporateAvailable)
        {
            this.toast.error('Corporate Sale', this.corporateBlockText);

            this.refresh();

            return;
        }

        if (next === 'Corporate' && this.customer && !this.customer.IsCorporate)
        {
            this.toast.error(
                'Corporate Sale',
                `${this.customer.DisplayName} is not a Corporate / Institution customer (Customer Profiles).`);

            this.refresh();

            return;
        }

        if (next === 'Regular' && this.lines.length > 1)
        {
            this.toast.error(
                'Regular Sale',
                `A regular sale has one chassis : remove ${this.lines.length - 1} of the ${this.lines.length} bikes first.`);

            this.refresh();

            return;
        }

        this.saleType =
            next;

        this.onChanged();
    }

    // Shelf : how many more chassis this invoice can take (null =
    // no limit)
    get bikeRoom():
        number | null
    {
        return this.saleType === 'Regular'
            ? Math.max(0, 1 - this.lines.length)
            : null;
    }

    // One invoice line for one chassis
    private bikeLine
    (
        unit:
            SalesInvoiceBikeUnit
    ):
        EntryLine
    {
        return {
            ProductId:unit.ProductId,
            ProductCode:unit.ProductCode,
            PartNumber:'',
            ProductName:unit.ProductName,
            ProductType:'Motor Bikes',
            Unit:'Pcs',
            Quantity:1,
            UnitPrice:null,
            SpecialPercent:null,
            OnHand:1,
            Mrp:unit.Mrp,
            qtyText:'1',
            priceText:'',
            specialText:'',
            MotorBikeUnitId:unit.MotorBikeUnitId,
            ChassisNo:unit.ChassisNo,
            EngineNo:unit.EngineNo,
            IsElectric:!!unit.IsElectric,
            ColorName:unit.ColorName,
            ManufactureYear:unit.ManufactureYear,
            CkdStatus:unit.CkdStatus
        } as EntryLine;
    }


    //===========================================================
    // Motor Bike Shelf : priced bikes as model cards, chassis
    // picked after the model
    //===========================================================

    bikeShelfOpen =
        false;

    get takenBikeIds():
        number[]
    {
        return this.lines
            .map(x => x.MotorBikeUnitId ?? 0)
            .filter(x => x > 0);
    }

    get bikeShelfSubtitle():
        string
    {
        const warehouse =
            (this.defaults?.Warehouses ?? []).find(x => x.WarehouseId === this.warehouseId);

        return `${warehouse?.WarehouseName ?? 'Warehouse'} · ${this.bikeFreeCount} priced ${this.bikeFreeCount === 1 ? 'bike' : 'bikes'} free · pick the model, then its chassis`;
    }

    openBikeShelf():
        void
    {
        if (!this.hasCustomer)
        {
            return;
        }

        if (this.isReadonly || this.bikeUnitsLoading)
        {
            return;
        }

        this.bikeShelfOpen =
            true;

        this.refresh();
    }

    closeBikeShelf():
        void
    {
        this.bikeShelfOpen =
            false;

        this.refresh();
    }

    onBikeShelfAdd
    (
        ids:
            number[]
    ):
        void
    {
        const added:
            EntryLine[] =
            [];

        const problems:
            string[] =
            [];

        ids.forEach
        (
            id =>
            {
                const unit =
                    this.bikeUnits.find(x => x.MotorBikeUnitId === id);

                if (!unit)
                {
                    return;
                }

                const error =
                    this.bikeProblem(unit)
                    ||
                    (this.saleType === 'Regular' && added.length >= 1 ? 'Regular sale : one chassis per invoice.' : '');

                if (error)
                {
                    problems.push(error);

                    return;
                }

                added.push(this.bikeLine(unit));
            }
        );

        if (added.length > 0)
        {
            // An item added : the customer card minimizes (more room)
            if (this.customer) { this.customerCollapsed = true; }

            this.lines =
            [
                ...this.lines,
                ...added
            ];

            this.toast.success(
                'Bikes Added',
                `${added.length} ${added.length === 1 ? 'chassis' : 'chassis'} added to the invoice.`);
        }

        if (problems.length > 0)
        {
            this.toast.error('Not Added', [...new Set(problems)].join(' '));
        }

        this.bikeShelfOpen =
            false;

        this.clearBikeEntry();

        // The last bike added shows in the Add card (green : on
        // this invoice)
        const last =
            added.length > 0
                ? this.bikeUnits.find(x => x.MotorBikeUnitId === added[added.length - 1].MotorBikeUnitId)
                : undefined;

        if (last)
        {
            this.bikeModelId =
                last.ProductSubCategoryId;

            this.bikeColor =
                last.ColorName || last.ProductName;

            this.bikeUnitId =
                last.MotorBikeUnitId;
        }

        this.onChanged();
    }


    //===========================================================
    // CKD status of a chassis (the shelf and the Add card) :
    // No -> Yes at once; Yes -> No with a reason. Saved on the
    // bike (CKD Documents Status) with its history.
    //===========================================================

    ckdBusyId:
        number | null =
        null;

    // Add card : the reason box (Yes -> No)
    addCkdReasonOpen =
        false;

    addCkdReason =
        '';

    flipPickedCkd():
        void
    {
        const unit =
            this.pickedBike;

        if (!unit || this.ckdBusyId)
        {
            return;
        }

        if (unit.CkdStatus === 'Yes')
        {
            this.addCkdReasonOpen =
                true;

            this.addCkdReason =
                '';

            this.refresh();

            return;
        }

        this.changeBikeCkd({ unitId:unit.MotorBikeUnitId, status:'Yes', remarks:'' });
    }

    onAddCkdReason
    (
        event:
            Event
    ):
        void
    {
        this.addCkdReason =
            (event.target as HTMLInputElement).value ?? '';
    }

    saveAddCkdNo():
        void
    {
        const unit =
            this.pickedBike;

        if (!unit || !this.addCkdReason.trim())
        {
            return;
        }

        this.changeBikeCkd({ unitId:unit.MotorBikeUnitId, status:'No', remarks:this.addCkdReason.trim() });

        this.cancelAddCkd();
    }

    cancelAddCkd():
        void
    {
        this.addCkdReasonOpen =
            false;

        this.addCkdReason =
            '';

        this.refresh();
    }

    changeBikeCkd
    (
        change:
            BikeCkdChange
    ):
        void
    {
        if (this.ckdBusyId)
        {
            return;
        }

        const unit =
            this.bikeUnits.find(x => x.MotorBikeUnitId === change.unitId);

        if (!unit)
        {
            return;
        }

        this.ckdBusyId =
            change.unitId;

        this.refresh();

        this.salesInvoiceService
            .setBikeCkd(change.unitId, change.status, change.remarks)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.ckdBusyId =
                            null;

                        // The chassis everywhere : the list, and its
                        // line when it is on the invoice
                        this.bikeUnits =
                            this.bikeUnits.map
                            (
                                x =>
                                    x.MotorBikeUnitId === change.unitId
                                        ? { ...x, CkdStatus:change.status }
                                        : x
                            );

                        this.lines =
                            this.lines.map
                            (
                                x =>
                                    x.MotorBikeUnitId === change.unitId
                                        ? { ...x, CkdStatus:change.status }
                                        : x
                            );

                        this.toast.success(
                            'CKD Status Changed',
                            `Chassis ${unit.ChassisNo} : CKD ${change.status}.`);

                        this.refresh();
                    },

                error:
                    error =>
                    {
                        this.ckdBusyId =
                            null;

                        this.toast.error(
                            'CKD Not Changed',
                            this.errorText(error, `The CKD status of chassis ${unit.ChassisNo} could not be changed.`));

                        this.refresh();
                    }
            });
    }


    onAddLine():
        void
    {
        if (!this.hasCustomer)
        {
            return;
        }

        if
        (
            this.isReadonly
        )
        {
            return;
        }

        const product =
            this.selectedProduct;

        if
        (
            !product
        )
        {
            this.entryError =
                `Search and select ${this.page.itemLower === 'motor bike' ? 'a motor bike' : 'an item'} first.`;

            this.refresh();

            return;
        }

        if
        (
            !(product.Mrp > 0)
        )
        {
            this.entryError =
                `${product.ProductCode} has no MRP and cannot be sold.`;

            this.refresh();

            return;
        }

        const quantity =
            roundMoney(parseMoney(this.qtyText));

        const issue =
            this.quantityIssue(quantity, this.qtyText);

        if
        (
            issue
        )
        {
            this.entryError =
                issue;

            this.refresh();

            return;
        }

        const existing =
            this.lines.find(x => x.ProductId === product.ProductId);

        const total =
            roundMoney((existing?.Quantity ?? 0) + quantity);

        // Stock (0027 OFF : no more than on hand; server checks too)
        if
        (
            !this.switches?.AllowSaleWithoutStock
            &&
            total > product.OnHand
        )
        {
            this.entryError =
                product.OnHand > 0
                    ? `Only ${this.qtyString(product.OnHand)} ${product.Unit} on hand in this warehouse${existing ? ` (${this.qtyString(existing.Quantity)} already on the invoice)` : ''}.`
                    : `${product.ProductCode} has no stock in this warehouse.`;

            this.refresh();

            return;
        }

        if
        (
            existing
        )
        {
            existing.Quantity =
                total;

            existing.qtyText =
                this.qtyString(total);

            existing.OnHand =
                product.OnHand;
        }
        else
        {
            // An item added : the customer card minimizes (more room)
            if (this.customer) { this.customerCollapsed = true; }

            this.lines =
            [
                ...this.lines,
                {
                    ProductId:product.ProductId,
                    ProductCode:product.ProductCode,
                    PartNumber:product.PartNumber,
                    ProductName:product.ProductName || [product.PartNumber, product.PartName].filter(x => !!x).join(' - '),
                    ProductType:product.ProductType,
                    Unit:product.Unit,
                    Quantity:quantity,
                    UnitPrice:null,
                    SpecialPercent:null,
                    OnHand:product.OnHand,
                    Mrp:product.Mrp,
                    qtyText:this.qtyString(quantity),
                    priceText:'',
                    specialText:''
                }
            ];
        }

        this.clearProductEntry();

        this.onChanged();
    }


    //===========================================================
    // Items table : quantity, price edit, special %, remove
    //===========================================================

    private rebuildRows():
        void
    {
        const priced =
            this.isEditable
                ? this.quote?.Lines ?? []
                : this.invoice?.Lines ?? [];

        this.rows =
            this.lines.map
            (
                (entry, index) =>
                ({
                    // MB : one row per chassis
                    key:entry.MotorBikeUnitId ? 1_000_000_000 + entry.MotorBikeUnitId : entry.ProductId,
                    index,
                    entry,
                    // Quote lines come in the order sent; a stale
                    // quote (other product) is not used
                    priced:
                        priced[index] && priced[index].ProductId === entry.ProductId
                            ? priced[index]
                            : null
                })
            );
    }

    onLineQty
    (
        row:
            ItemRow,
        value:
            string | number
    ):
        void
    {
        const text =
            String(value ?? '');

        row.entry.qtyText =
            text;

        const quantity =
            roundMoney(parseMoney(text));

        if
        (
            this.quantityIssue(quantity, text)
        )
        {
            // Not sent until it is a valid quantity
            this.refresh();

            return;
        }

        row.entry.Quantity =
            quantity;

        this.onChanged();
    }

    lineQtyIssue
    (
        row:
            ItemRow
    ):
        string
    {
        const quantity =
            roundMoney(parseMoney(row.entry.qtyText));

        return this.quantityIssue(quantity, row.entry.qtyText);
    }

    // 0024 ON : unit price of the whole line ('' = MRP)
    onLinePrice
    (
        row:
            ItemRow,
        value:
            string | number
    ):
        void
    {
        const text =
            String(value ?? '');

        row.entry.priceText =
            text;

        const price =
            roundMoney(parseMoney(text));

        row.entry.UnitPrice =
            text.trim() && price > 0
                ? price
                : null;

        this.onChanged();
    }

    // 0025 ON + activity : special % of the line
    onLineSpecial
    (
        row:
            ItemRow,
        value:
            string | number
    ):
        void
    {
        const text =
            String(value ?? '');

        row.entry.specialText =
            text;

        const percent =
            roundMoney(parseMoney(text));

        row.entry.SpecialPercent =
            text.trim() && percent > 0
                ? percent
                : null;

        this.onChanged();
    }

    removeLine
    (
        row:
            ItemRow
    ):
        void
    {
        if
        (
            this.isReadonly
        )
        {
            return;
        }

        this.lines =
            this.lines.filter(x => x !== row.entry);

        this.onChanged();
    }

    get canEditPrice():
        boolean
    {
        return this.isEditable
            &&
            !!this.switches?.AllowPriceEdit;
    }

    // 0025 ON and the role has "Give Special Discount"
    get canGiveSpecial():
        boolean
    {
        return this.isEditable
            &&
            !!this.switches?.AllowDiscount
            &&
            !!this.defaults?.CanGiveSpecialDiscount;
    }

    get showSpecialColumn():
        boolean
    {
        return this.canGiveSpecial
            ||
            this.figures.Special > 0;
    }

    // Line % or invoice special, never both
    get lineSpecialUsed():
        boolean
    {
        return this.lines.some(x => (x.SpecialPercent ?? 0) > 0);
    }

    get invoiceSpecialUsed():
        boolean
    {
        return this.specialType !== 'None'
            &&
            parseMoney(this.specialValueText) > 0;
    }

    get priceEditHint():
        string
    {
        const max =
            this.defaults?.MaxPriceEditPercent;

        return max != null && max > 0
            ? `Price edit : at most ${this.percentText(max)}% below the MRP.`
            : 'Price edit : not above the MRP.';
    }

    get specialHint():
        string
    {
        const max =
            this.defaults?.MaxDiscountPercent;

        const cap =
            max != null && max > 0
                ? `at most ${this.percentText(max)}%`
                : 'no limit';

        if
        (
            this.lineSpecialUsed
        )
        {
            return `Special discount per line (${cap}); clear the line % to give it on the invoice.`;
        }

        if
        (
            this.invoiceSpecialUsed
        )
        {
            return `Special discount on the invoice (${cap}), spread over the lines by value.`;
        }

        return `Special discount (${cap}) : per line %, or on the whole invoice (% or Tk).`;
    }

    onSpecialTypeChange
    (
        value:
            any
    ):
        void
    {
        const type:
            SalesInvoiceSpecialType =
            value === 'Percent' || value === 'Amount'
                ? value
                : 'None';

        this.specialType =
            type;

        if
        (
            type === 'None'
        )
        {
            this.specialValueText =
                '';
        }

        this.onChanged();
    }

    onSpecialValueChange
    (
        value:
            string | number
    ):
        void
    {
        this.specialValueText =
            String(value ?? '');

        this.onChanged();
    }

    // MRP cell : "500.00" or "6 @ 500.00 + 4 @ 550.00"
    mrpText
    (
        row:
            ItemRow
    ):
        string
    {
        if
        (
            row.priced
        )
        {
            return row.priced.MrpText
                ||
                formatMoney(row.priced.Mrp);
        }

        return row.entry.Mrp > 0
            ? formatMoney(row.entry.Mrp)
            : '-';
    }

    // "2 MRPs in stock" whenever the batches taken differ
    mrpNote
    (
        row:
            ItemRow
    ):
        string
    {
        const priced =
            row.priced;

        if
        (
            !priced
            ||
            !(priced.HasMixedMrp || priced.MrpCount > 1)
        )
        {
            return '';
        }

        return `${Math.max(2, priced.MrpCount)} MRPs in stock`;
    }

    lineMeta
    (
        row:
            ItemRow
    ):
        string
    {
        const code =
            row.priced?.ProductCode || row.entry.ProductCode;

        const part =
            row.priced?.PartNumber || row.entry.PartNumber;

        return part
            ? `${code} || ${part}`
            : code;
    }

    lineName
    (
        row:
            ItemRow
    ):
        string
    {
        const name =
            row.priced?.ProductName || row.entry.ProductName;

        const part =
            row.priced?.PartNumber || row.entry.PartNumber;

        // "<Part No> - <Part Name>" : the part number is in the meta line
        return part && name.startsWith(`${part} - `)
            ? name.substring(part.length + 3)
            : name;
    }

    // Batches taken (title of the MRP cell)
    allocationTitle
    (
        row:
            ItemRow
    ):
        string
    {
        const allocations =
            row.priced?.Allocations ?? [];

        if
        (
            allocations.length === 0
        )
        {
            return '';
        }

        return allocations
            .map
            (
                x =>
                    x.StockBatchId > 0
                        ? `${x.BatchNo} : ${this.qtyString(x.Quantity)} @ ${formatMoney(x.UnitPrice || x.Mrp)}`
                        : `Without stock : ${this.qtyString(x.Quantity)}`
            )
            .join('\n');
    }

    vatTitle
    (
        row:
            ItemRow
    ):
        string
    {
        const priced =
            row.priced;

        if
        (
            !priced
        )
        {
            return '';
        }

        return `VAT ${this.percentText(priced.VatRate)}% inside the MRP : ${formatMoney(priced.VatInside)} · VAT paid at source : ${formatMoney(priced.BaseVat)}`;
    }

    lineFlags
    (
        row:
            ItemRow
    ):
        { text: string; tone: 'warn' | 'error' }[]
    {
        const priced =
            row.priced;

        if
        (
            !priced
        )
        {
            return [];
        }

        const flags:
            { text: string; tone: 'warn' | 'error' }[] =
            [];

        if
        (
            priced.BelowCost
        )
        {
            flags.push(
            {
                text:priced.BelowCostMessage || 'Below cost',
                tone:this.switches?.BlockSaleBelowCost ? 'error' : 'warn'
            });
        }

        if
        (
            priced.StockShort
        )
        {
            flags.push(
            {
                text:
                    priced.UnallocatedQuantity > 0
                        ? `${this.qtyString(priced.UnallocatedQuantity)} without stock (on hand ${this.qtyString(priced.OnHand)})`
                        : `Short of stock (on hand ${this.qtyString(priced.OnHand)})`,
                tone:this.switches?.AllowSaleWithoutStock ? 'warn' : 'error'
            });
        }

        if
        (
            priced.ReturnedQuantity > 0
        )
        {
            flags.push(
            {
                text:`${this.qtyString(priced.ReturnedQuantity)} returned`,
                tone:'warn'
            });
        }

        return flags;
    }

    get totalQuantityText():
        string
    {
        const total =
            roundMoney(this.lines.reduce((sum, line) => sum + line.Quantity, 0));

        return this.qtyString(total);
    }

    // Some lines' batches have different MRPs (Sell at Batch MRP)
    get mixedMrpLines():
        number
    {
        return this.rows.filter(row => !!this.mrpNote(row)).length;
    }


    //===========================================================
    // Quote (debounced; the server prices everything)
    //===========================================================

    // Any change that moves the figures
    private onChanged():
        void
    {
        this.actionError =
            '';

        this.rebuildRows();

        this.checkForChanges();

        this.scheduleQuote();

        this.refresh();
    }

    private scheduleQuote():
        void
    {
        if
        (
            !this.isEditable
        )
        {
            return;
        }

        this.clearTimer('quote');

        if
        (
            this.lines.length === 0
        )
        {
            this.quoteSubscription?.unsubscribe?.();

            this.quote =
                null;

            this.quoteDirty =
                false;

            this.quoteBusy =
                false;

            this.quoteFailed =
                '';

            this.rebuildRows();

            return;
        }

        this.quoteDirty =
            true;

        this.quoteTimer =
            window.setTimeout(
                () =>
                    this.runQuote(),
                350
            );
    }

    private runQuote():
        void
    {
        this.clearTimer('quote');

        if
        (
            !this.isEditable
            ||
            this.lines.length === 0
            ||
            !this.warehouseId
        )
        {
            this.quoteDirty =
                false;

            this.refresh();

            return;
        }

        const seq =
            ++this.quoteSeq;

        this.quoteSubscription?.unsubscribe?.();

        this.quoteBusy =
            true;

        this.quoteDirty =
            false;

        this.refresh();

        this.quoteSubscription =
            this.salesInvoiceService
                .quote(this.buildPayload())
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe
                ({
                    next:
                        (quote: SalesInvoiceQuote) =>
                        {
                            if
                            (
                                seq !== this.quoteSeq
                            )
                            {
                                return;
                            }

                            this.quote =
                                quote;

                            this.quoteBusy =
                                false;

                            this.quoteFailed =
                                '';

                            this.syncFromQuote();

                            this.rebuildRows();

                            this.toastQuoteMessages();

                            this.refresh();
                        },

                    error:
                        (error: unknown) =>
                        {
                            if
                            (
                                seq !== this.quoteSeq
                            )
                            {
                                return;
                            }

                            this.quoteBusy =
                                false;

                            this.quoteFailed =
                                this.errorText(error, 'The prices could not be worked out. Check the lines and try again.');

                            this.toast.error(
                                this.page.fullTitle,
                                this.quoteFailed);

                            this.refresh();
                        }
                });
    }

    // The server's on hand / MRP onto the entered lines
    private syncFromQuote():
        void
    {
        const lines =
            this.quote?.Lines ?? [];

        this.lines.forEach
        (
            (entry, index) =>
            {
                const priced =
                    lines[index];

                if
                (
                    priced
                    &&
                    priced.ProductId === entry.ProductId
                )
                {
                    entry.OnHand =
                        priced.OnHand;

                    entry.Mrp =
                        priced.Mrp;
                }
            }
        );
    }

    // The server's checks : one toast each, only when a message is
    // new (amounts ignored, so adding an item does not repeat it).
    // Credit messages are told only when a customer is picked (and
    // by Save, which refuses with the same message).
    private quoteToasted =
        new Set<string>();

    private creditToastPending =
        false;

    private static isCreditMessage
    (
        text:
            string
    ):
        boolean
    {
        return /credit/i.test(text);
    }

    private static messageKey
    (
        text:
            string
    ):
        string
    {
        return text.replace(/[\d.,]+/g, '#');
    }

    private toastQuoteMessages():
        void
    {
        const errors =
            this.quote?.Errors ?? [];

        const warnings =
            this.quote?.Warnings ?? [];

        const all =
            [
                ...errors.map(text => ({ text, error: true })),
                ...warnings.map(text => ({ text, error: false }))
            ];

        const now =
            new Set<string>();

        for (const message of all)
        {
            const key =
                SalesInvoiceForm.messageKey(message.text);

            now.add(key);

            const credit =
                SalesInvoiceForm.isCreditMessage(message.text);

            const show =
                credit
                    ? this.creditToastPending
                    : !this.quoteToasted.has(key);

            if (!show)
            {
                continue;
            }

            if (message.error)
            {
                this.toast.error(this.page.fullTitle, message.text);
            }
            else
            {
                this.toast.warning(this.page.fullTitle, message.text);
            }
        }

        this.creditToastPending =
            false;

        this.quoteToasted =
            now;
    }

    get quoteErrors():
        string[]
    {
        return this.isEditable && !this.quoteDirty && !this.quoteBusy
            ? this.quote?.Errors ?? []
            : [];
    }

    get quoteWarnings():
        string[]
    {
        return this.isEditable && !this.quoteDirty && !this.quoteBusy
            ? this.quote?.Warnings ?? []
            : [];
    }


    //===========================================================
    // Summary figures
    //===========================================================

    get localPaid():
        number
    {
        return roundMoney(
            this.payments.reduce((sum, row) => sum + (Number(row.Amount) || 0), 0)
        );
    }

    get figures():
        InvoiceFigures
    {
        if
        (
            !this.isEditable
            &&
            this.invoice
        )
        {
            const invoice =
                this.invoice;

            return {
                Gross:invoice.GrossAmount,
                CampaignMembership:invoice.CampaignMembershipDiscount,
                Campaign:invoice.CampaignDiscount,
                Membership:invoice.MembershipDiscount,
                Special:invoice.SpecialDiscount,
                Fractional:invoice.FractionalDiscount,
                InvoiceTotal:invoice.InvoiceTotal,
                VatInside:invoice.TotalVatInside,
                Paid:invoice.PaidAmount,
                Due:invoice.DueAmount
            };
        }

        const quote =
            this.quote;

        const paid =
            this.localPaid;

        if
        (
            !quote
        )
        {
            return {
                Gross:0,
                CampaignMembership:0,
                Campaign:0,
                Membership:0,
                Special:0,
                Fractional:0,
                InvoiceTotal:0,
                VatInside:0,
                Paid:paid,
                Due:0
            };
        }

        return {
            Gross:quote.GrossAmount,
            CampaignMembership:quote.CampaignMembershipDiscount,
            Campaign:quote.CampaignDiscount,
            Membership:quote.MembershipDiscount,
            Special:quote.SpecialDiscount,
            Fractional:quote.FractionalDiscount,
            InvoiceTotal:quote.InvoiceTotal,
            VatInside:quote.TotalVatInside,
            Paid:paid,
            Due:roundMoney(Math.max(0, quote.InvoiceTotal - paid))
        };
    }

    // "Campaign / Membership" row label : which one applied
    get campaignMembershipLabel():
        string
    {
        const figures =
            this.figures;

        if
        (
            figures.Campaign > 0
            &&
            figures.Membership > 0
        )
        {
            return 'Campaign / Membership';
        }

        if
        (
            figures.Campaign > 0
        )
        {
            return 'Campaign Discount';
        }

        const card =
            this.invoice?.MembershipCardName
            ||
            this.quote?.Membership?.CardName
            ||
            this.customer?.Membership?.CardName
            ||
            '';

        return card
            ? `Membership (${card})`
            : 'Campaign / Membership';
    }

    get totalInWords():
        string
    {
        return amountInWords(
            this.figures.InvoiceTotal
        );
    }

    // Charges the customer pays on top (shown as RV does)
    get customerCharges():
        VoucherDebitLine[]
    {
        return this.payments.filter
        (
            row =>
                row.ChargeBorneBy === 'Customer'
                &&
                row.ChargeAmount > 0
        );
    }

    get customerChargeTotal():
        number
    {
        return roundMoney(
            this.customerCharges.reduce((sum, row) => sum + row.ChargeAmount, 0)
        );
    }

    // Balance > 0 : credit (0022, not walk-in, 0023 rules)
    get dueNote():
        string
    {
        const due =
            this.figures.Due;

        if
        (
            !this.isEditable
            ||
            !(due > 0)
            ||
            !this.quote
        )
        {
            return '';
        }

        if
        (
            this.customer?.IsWalkIn
        )
        {
            return 'Walk-in customers are cash only : collect the balance through Checkout.';
        }

        if
        (
            !this.switches?.AllowCreditSale
        )
        {
            return 'Credit sale is not allowed : collect the balance through Checkout.';
        }

        return `Tk ${formatMoney(due)} goes to the customer's receivable (credit sale).`;
    }

    get dueBlocked():
        boolean
    {
        // EMI : the balance is the EMI part (not credit)
        if (this.paymentTerm === 'EMI')
        {
            return false;
        }

        return this.isEditable
            &&
            this.figures.Due > 0
            &&
            (
                this.paymentTerm === 'Cash'
                ||
                !!this.customer?.IsWalkIn
                ||
                !this.switches?.AllowCreditSale
            );
    }


    //===========================================================
    // Checkout : Payment Desk modal
    //===========================================================

    get modeList():
        string[]
    {
        const allowed =
            VOUCHER_MODES.receipt as string[];

        // EMI is not a receipt on the invoice : the EMI term leaves
        // the balance for the EMI account (Receipt Voucher)
        return this.page.paymentModes.filter(mode => allowed.includes(mode) && mode !== 'EMI');
    }

    onCheckout():
        void
    {
        if
        (
            !this.isEditable
        )
        {
            this.openDeskView();

            return;
        }

        if
        (
            this.lines.length === 0
            ||
            !this.quote
            ||
            !(this.quote.InvoiceTotal > 0)
        )
        {
            this.actionError =
                'Add the items first : Checkout collects the invoice total.';

            this.refresh();

            return;
        }

        this.deskRows =
            this.payments.map(row => ({ ...row }));

        this.deskSnapshot =
            JSON.stringify(this.deskRows);

        this.deskInput =
            this.deskRows.map(row => ({ ...row }));

        this.deskConfirmClose =
            false;

        this.deskError =
            '';

        this.buildDeskModeItems();

        this.deskAmountText =
            this.deskRemaining > 0
                ? this.deskRemaining.toFixed(2)
                : '';

        this.checkoutOpen =
            true;

        this.loadPaymentSetup();

        this.refresh();
    }

    // View : the saved payments, read only
    private openDeskView():
        void
    {
        this.deskRows =
            this.payments.map(row => ({ ...row }));

        this.deskInput =
            this.deskRows.map(row => ({ ...row }));

        this.deskSnapshot =
            JSON.stringify(this.deskRows);

        this.deskConfirmClose =
            false;

        this.deskError =
            '';

        this.checkoutOpen =
            true;

        this.refresh();
    }

    get deskTotal():
        number
    {
        return roundMoney(
            this.deskRows.reduce((sum, row) => sum + (Number(row.Amount) || 0), 0)
        );
    }

    get deskRemaining():
        number
    {
        return roundMoney(
            Math.max(0, this.figures.InvoiceTotal - this.deskTotal)
        );
    }

    get deskNeedsDetails():
        boolean
    {
        return this.deskRows.some(row => needsDetails(row.Mode));
    }

    get deskRowCount():
        number
    {
        return this.deskRows.filter(row => needsDetails(row.Mode)).length;
    }

    get deskVerifiedCount():
        number
    {
        return this.deskRows.filter(row => needsDetails(row.Mode) && isDebitRowReady(row)).length;
    }

    get deskAllVerified():
        boolean
    {
        return this.deskVerifiedCount === this.deskRowCount;
    }

    get deskProgress():
        number
    {
        return this.deskRowCount > 0
            ? Math.round(this.deskVerifiedCount * 100 / this.deskRowCount)
            : 100;
    }

    get deskFooterNote():
        string
    {
        if
        (
            !this.isEditable
        )
        {
            return 'View only.';
        }

        if
        (
            this.deskRows.length === 0
        )
        {
            return 'No payment : the whole invoice is on credit.';
        }

        if
        (
            !this.deskAllVerified
        )
        {
            const left =
                this.deskRowCount - this.deskVerifiedCount;

            return `${left} row${left === 1 ? '' : 's'} left to verify.`;
        }

        return this.deskRemaining > 0
            ? this.paymentTerm === 'EMI'
                ? `Down payment ${formatMoney(this.deskTotal)} · ${formatMoney(this.deskRemaining)} through EMI.`
                : this.paymentTerm === 'Cash'
                    ? `Paid ${formatMoney(this.deskTotal)} · ${formatMoney(this.deskRemaining)} still to collect (cash sale).`
                    : `Paid ${formatMoney(this.deskTotal)} · balance ${formatMoney(this.deskRemaining)} on credit.`
            : 'Fully paid. Press Okay, then Save.';
    }

    // One receipt mode unless the RV switch Multi Mode is ON
    private get deskModeLocked():
        string
    {
        return !this.multiMode && this.deskRows.length > 0
            ? this.deskRows[0].Mode
            : '';
    }

    private buildDeskModeItems():
        void
    {
        const locked =
            this.deskModeLocked;

        this.deskModeItems =
            this.modeList
                .filter(mode => !locked || mode === locked)
                .map
                (
                    mode =>
                    ({
                        label:mode === 'MFS' ? 'MFS (mobile)' : mode === 'POS' ? 'POS (card)' : mode,
                        value:mode
                    })
                );

        if
        (
            !this.deskModeItems.some(item => item.value === this.deskMode)
        )
        {
            this.deskMode =
                this.deskModeItems.length === 1 || !this.deskMode
                    ? this.deskModeItems[0]?.value ?? ''
                    : '';
        }

        this.buildDeskLedgerItems();
    }

    // Money accounts of the mode : active, collection, branch rule
    // (as the Receipt Voucher)
    private deskCandidates():
        VoucherLedger[]
    {
        const type =
            MODE_LEDGER_TYPES[this.deskMode] ?? '';

        const branch =
            this.branchName.trim().toUpperCase();

        if
        (
            !type
        )
        {
            return [];
        }

        return this.ledgers.filter
        (
            ledger =>
            {
                if
                (
                    ledger.LedgerType !== type
                    ||
                    !ledger.CollectionAccount
                    ||
                    !ledger.IsActive
                )
                {
                    return false;
                }

                const ledgerBranch =
                    (ledger.Branch ?? '').trim().toUpperCase();

                return type === 'Cash'
                    ? ledgerBranch === branch
                    : !ledger.BranchExclusive || ledgerBranch === branch;
            }
        );
    }

    private buildDeskLedgerItems():
        void
    {
        this.deskLedgerItems =
            this.deskCandidates()
                .sort((a, b) => a.LedgerName.localeCompare(b.LedgerName))
                .map
                (
                    ledger =>
                    ({
                        label:ledger.LedgerName,
                        value:ledger.LedgerCode
                    })
                );

        if
        (
            this.deskLedgerItems.length === 1
        )
        {
            this.deskLedgerCode =
                this.deskLedgerItems[0].value;
        }
        else if
        (
            !this.deskLedgerItems.some(item => item.value === this.deskLedgerCode)
        )
        {
            this.deskLedgerCode =
                '';
        }
    }

    onDeskModeChange
    (
        value:
            any
    ):
        void
    {
        this.deskMode =
            String(value ?? '');

        this.deskLedgerCode =
            '';

        this.deskError =
            '';

        this.buildDeskLedgerItems();

        this.refresh();
    }

    onDeskLedgerChange
    (
        value:
            any
    ):
        void
    {
        this.deskLedgerCode =
            String(value ?? '');

        this.deskError =
            '';
    }

    onDeskAmountChange
    (
        value:
            string | number
    ):
        void
    {
        this.deskAmountText =
            String(value ?? '');

        this.deskError =
            '';
    }

    get deskLedgerPlaceholder():
        string
    {
        if
        (
            !this.ledgersLoaded
        )
        {
            return 'Loading accounts...';
        }

        if
        (
            !this.deskMode
        )
        {
            return 'Select mode first';
        }

        return this.deskLedgerItems.length
            ? 'Select account'
            : `No ${this.deskMode} collection account for this branch`;
    }

    addDeskRow():
        void
    {
        if
        (
            !this.isEditable
        )
        {
            return;
        }

        const mode =
            this.deskMode as PaymentMode;

        if
        (
            !mode
        )
        {
            this.deskError =
                'Select the receipt mode.';

            this.refresh();

            return;
        }

        const ledger =
            this.ledgers.find(x => x.LedgerCode === this.deskLedgerCode);

        if
        (
            !ledger
        )
        {
            this.deskError =
                'Select the account the money goes to.';

            this.refresh();

            return;
        }

        const amount =
            roundMoney(parseMoney(this.deskAmountText));

        if
        (
            !(amount > 0)
        )
        {
            this.deskError =
                'Amount must be more than 0.';

            this.refresh();

            return;
        }

        // No change returned in v1
        if
        (
            amount > this.deskRemaining
        )
        {
            this.deskError =
                `At most ${formatMoney(this.deskRemaining)} is left to pay (no change is given).`;

            this.refresh();

            return;
        }

        const row:
            VoucherDebitLine =
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
            ChargePercent:
                mode === 'MFS'
                    ? roundMoney(ledger.ChargePercent)
                    : 0,
            ChargeAmount:
                mode === 'MFS'
                    ? roundMoney(amount * (ledger.ChargePercent || 0) / 100)
                    : 0,
            // MFS / POS : the customer pays the charge on top by default
            ChargeBorneBy:
                mode === 'MFS' || mode === 'POS'
                    ? 'Customer'
                    : needsDetails(mode) && mode !== 'Check'
                        ? 'Company'
                        : ''
        };

        this.deskRows =
        [
            ...this.deskRows,
            row
        ];

        this.deskInput =
            this.deskRows.map(x => ({ ...x }));

        this.deskError =
            '';

        this.deskAmountText =
            this.deskRemaining > 0
                ? this.deskRemaining.toFixed(2)
                : '';

        this.buildDeskModeItems();

        this.refresh();
    }

    removeDeskRow
    (
        index:
            number
    ):
        void
    {
        if
        (
            !this.isEditable
        )
        {
            return;
        }

        this.deskRows =
            this.deskRows.filter((_, i) => i !== index);

        this.deskInput =
            this.deskRows.map(x => ({ ...x }));

        this.deskAmountText =
            this.deskRemaining > 0
                ? this.deskRemaining.toFixed(2)
                : '';

        this.buildDeskModeItems();

        this.refresh();
    }

    // Details from the Payment Desk (mode / ledger / amount stay)
    onDeskChange
    (
        lines:
            VoucherDebitLine[]
    ):
        void
    {
        this.deskRows =
            (lines ?? []).map(row => ({ ...row }));

        this.deskError =
            '';

        this.refresh();
    }

    onDeskValidChange
    (
        value:
            boolean
    ):
        void
    {
        // The footer reads the rows; nothing to keep
        void value;
    }

    deskRowState
    (
        row:
            VoucherDebitLine
    ):
        string
    {
        if
        (
            !needsDetails(row.Mode)
        )
        {
            return 'Ready';
        }

        if
        (
            isDebitRowReady(row)
        )
        {
            return 'Verified';
        }

        return debitDetailIssue(row)
            ? 'Details needed'
            : 'Ready to verify';
    }

    deskRowReady
    (
        row:
            VoucherDebitLine
    ):
        boolean
    {
        return isDebitRowReady(row);
    }

    private get deskChanged():
        boolean
    {
        return JSON.stringify(this.deskRows) !== this.deskSnapshot;
    }

    onDeskClose():
        void
    {
        if
        (
            this.isEditable
            &&
            this.deskChanged
        )
        {
            this.deskConfirmClose =
                true;

            this.refresh();

            return;
        }

        this.closeDesk();
    }

    onDeskKeepEditing():
        void
    {
        this.deskConfirmClose =
            false;

        this.refresh();
    }

    onDeskDiscard():
        void
    {
        this.closeDesk();
    }

    private closeDesk():
        void
    {
        this.checkoutOpen =
            false;

        this.deskConfirmClose =
            false;

        this.deskError =
            '';

        this.refresh();
    }

    // Okay : keep the rows on the invoice
    onDeskOkay():
        void
    {
        if
        (
            !this.isEditable
        )
        {
            this.closeDesk();

            return;
        }

        const notReady =
            this.deskRows.find(row => !isDebitRowReady(row));

        if
        (
            notReady
        )
        {
            this.deskError =
                `${notReady.Mode} ${formatMoney(notReady.Amount)} : ${debitDetailIssue(notReady) || 'press Verify Row on the Payment Desk.'}`;

            this.refresh();

            return;
        }

        if
        (
            this.deskTotal > this.figures.InvoiceTotal
        )
        {
            this.deskError =
                `The payments (${formatMoney(this.deskTotal)}) are more than the invoice total (${formatMoney(this.figures.InvoiceTotal)}).`;

            this.refresh();

            return;
        }

        this.payments =
            this.deskRows.map(row => ({ ...row }));

        this.closeDesk();

        this.onChanged();
    }

    chargeRecoveryCode
    (
        mode:
            string
    ):
        string
    {
        return CHARGE_RECOVERY_LEDGERS[mode] ?? '';
    }


    //===========================================================
    // Payload
    //===========================================================

    private paymentRow
    (
        row:
            VoucherDebitLine
    ):
        SalesInvoicePaymentRow
    {
        return {
            Mode:row.Mode,
            LedgerType:row.LedgerType,
            SubGroupCode:row.SubGroupCode,
            SubGroupName:toAsciiText(row.SubGroupName),
            LedgerCode:row.LedgerCode,
            LedgerName:toAsciiText(row.LedgerName),
            AccountId:row.AccountId,
            Amount:roundMoney(row.Amount),
            ShortNotes:toAsciiText(row.ShortNotes).trim(),
            ChargePercent:roundMoney(row.ChargePercent),
            ChargeAmount:roundMoney(row.ChargeAmount),
            ChargeBorneBy:row.ChargeBorneBy || '',
            CardSetupId:row.CardSetupId || 0,
            CardName:toAsciiText(row.CardName),
            TransactionRef:toAsciiText(row.TransactionRef).trim(),
            TenureMonths:row.TenureMonths || 0,
            InterestPercent:row.InterestPercent || 0,
            InterestAmount:row.InterestAmount || 0,
            TotalCharged:row.TotalCharged || 0,
            CheckNo:toAsciiText(row.CheckNo).trim(),
            CheckDate:row.CheckDate || '',
            CheckBank:toAsciiText(row.CheckBank).trim(),
            CheckStatus:'',
            ClearedVoucherNo:''
        };
    }

    private buildPayload():
        CreateSalesInvoice
    {
        const special =
            this.specialType !== 'None'
                ? roundMoney(parseMoney(this.specialValueText))
                : 0;

        return {
            PageType:this.page.pageType,
            InvoiceDate:this.invoiceDate,
            BranchId:this.defaults?.Branch?.BranchId ?? this.invoice?.BranchId ?? 0,
            WarehouseId:this.warehouseId ?? 0,
            SalesPersonId:this.salesPersonId,
            CustomerId:this.customer?.CustomerId ?? 0,
            Lines:
                this.lines.map
                (
                    line =>
                    ({
                        ProductId:line.ProductId,
                        Quantity:line.Quantity,
                        UnitPrice:this.canEditPrice || line.UnitPrice != null ? line.UnitPrice : null,
                        SpecialDiscountPercent:line.SpecialPercent,
                        MotorBikeUnitId:line.MotorBikeUnitId ?? null
                    })
                ),
            InvoiceSpecialType:special > 0 ? this.specialType : 'None',
            InvoiceSpecialValue:special > 0 ? special : 0,
            Payments:this.payments.map(row => this.paymentRow(row)),
            Narration:toAsciiText(this.narration).replace(/[\r\n]+/g, ' ').trim().substring(0, 500),
            SaleType:this.isBikes ? this.saleType : '',
            PaymentTerm:this.paymentTerm,
            EmiAccountCode:this.paymentTerm === 'EMI' ? this.emiAccountCode : ''
        };
    }


    //===========================================================
    // Change tracking
    //===========================================================

    private stateText():
        string
    {
        return JSON.stringify(
        {
            payload:this.buildPayload(),
            phone:this.phoneText
        });
    }

    private setInitialState():
        void
    {
        this.originalState =
            this.stateText();

        this.hasChanges =
            false;

        this.refresh();
    }

    private checkForChanges():
        void
    {
        this.hasChanges =
            this.isEditable
            &&
            this.stateText() !== this.originalState;
    }


    //===========================================================
    // Header Commands (by mode and status; at most 3)
    //
    // Add          : Save, Checkout, Clear
    // Edit (Draft) : Update, Checkout, Clear
    // View Draft   : Approve, Edit
    // Approved     : Post, Return, Cancel
    // Posted       : Print (A4), Receipt (80 mm), Cancel (0029)
    // Cancelled    : Print (A4), Receipt (80 mm)
    //
    // After any action the page goes back to the list
    //===========================================================

    private get commandSlots():
        SalesInvoiceCommandList
    {
        const save:
            CommandSlot =
        {
            command:'save',
            text:this.isEditMode ? 'Update' : 'Save',
            icon:this.isEditMode ? 'fas fa-pen-to-square' : 'fas fa-floppy-disk',
            activity:''
        };

        const checkout:
            CommandSlot =
        {
            command:'checkout',
            text:'Checkout',
            icon:'fas fa-cash-register',
            activity:''
        };

        const clear:
            CommandSlot =
        {
            command:'clear',
            text:'Clear',
            icon:'fas fa-broom',
            activity:''
        };

        const edit:
            CommandSlot =
        {
            command:'edit',
            text:'Edit',
            icon:'fas fa-pen',
            activity:'Update'
        };

        const approve:
            CommandSlot =
        {
            command:'approve',
            text:'Approve',
            icon:'fas fa-circle-check',
            activity:'Approve'
        };

        const post:
            CommandSlot =
        {
            command:'post',
            text:'Post',
            icon:'fas fa-book',
            activity:'Post'
        };

        const returnToDraft:
            CommandSlot =
        {
            command:'return',
            text:'Return',
            icon:'fas fa-rotate-left',
            activity:'Return'
        };

        const cancel:
            CommandSlot =
        {
            command:'cancel',
            text:'Cancel',
            icon:'fas fa-ban',
            activity:'Cancel'
        };

        const print:
            CommandSlot =
        {
            command:'print',
            text:'Print',
            icon:'fas fa-print',
            activity:'Print'
        };

        const thermal:
            CommandSlot =
        {
            command:'thermal',
            text:'Receipt',
            icon:'fas fa-receipt',
            activity:'Print'
        };

        if
        (
            this.loading
            ||
            this.loadError
            ||
            this.branchBlocked
        )
        {
            return [];
        }

        if
        (
            this.isAddMode
            ||
            this.isEditable
        )
        {
            return [save, checkout, clear];
        }

        const flags =
            this.defaults;

        const canPrint =
            flags?.CanPrint ?? false;

        switch
        (
            this.status
        )
        {
            case 'Draft':
                return [
                    ...(flags?.CanApprove ? [approve] : []),
                    edit
                ];

            case 'Approved':
                return [
                    ...(flags?.CanPost ? [post] : []),
                    ...(flags?.CanReturn ? [returnToDraft] : []),
                    ...(flags?.CanCancel ? [cancel] : [])
                ];

            case 'Posted':
                return [
                    ...(canPrint ? [print, thermal] : []),
                    ...(this.canCancelPosted ? [cancel] : [])
                ];

            case 'Cancelled':
                return canPrint
                    ? [print, thermal]
                    : [];

            default:
                return [];
        }
    }

    // 0029 ON, within its days, and the role may cancel
    get canCancelPosted():
        boolean
    {
        const switches =
            this.switches;

        if
        (
            !this.defaults?.CanCancel
            ||
            !switches?.AllowCancelPosted
            ||
            !this.invoice
        )
        {
            return false;
        }

        const days =
            switches.CancelWithinDays;

        if
        (
            days == null
            ||
            days <= 0
        )
        {
            return true;
        }

        const invoiceDay =
            fromIsoDate(this.invoice.InvoiceDate);

        const today =
            fromIsoDate(this.defaults.Today || toIsoDate(new Date()));

        if
        (
            !invoiceDay
            ||
            !today
        )
        {
            return true;
        }

        const age =
            Math.round((today.getTime() - invoiceDay.getTime()) / 86400000);

        return age <= days;
    }

    private slot
    (
        index:
            number
    ):
        CommandSlot
    {
        return this.commandSlots[index]
            ??
            NO_COMMAND;
    }

    get command1():
        CommandSlot
    {
        return this.slot(0);
    }

    get command2():
        CommandSlot
    {
        return this.slot(1);
    }

    get command3():
        CommandSlot
    {
        return this.slot(2);
    }

    onCommand
    (
        index:
            number
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

        switch
        (
            this.slot(index).command
        )
        {
            case 'save':
                this.onSave();
                break;

            case 'checkout':
                this.onCheckout();
                break;

            case 'clear':
                this.onClear();
                break;

            case 'edit':
                this.goTo('edit');
                break;

            case 'approve':
                this.onApprove();
                break;

            case 'post':
                this.onPost();
                break;

            case 'return':
                this.onReturnToDraft();
                break;

            case 'cancel':
                this.openCancel();
                break;

            case 'print':
                this.openPrint(this.page.a4DocKey);
                break;

            case 'thermal':
                this.openPrint(this.page.thermalDocKey);
                break;
        }
    }


    //===========================================================
    // Save (0021 OFF : the server posts at once)
    //===========================================================

    private saveIssue():
        string
    {
        if
        (
            this.periodError
        )
        {
            return this.periodError;
        }

        if
        (
            !this.invoiceDate
        )
        {
            return 'Invoice Date is required.';
        }

        if
        (
            !this.warehouseId
        )
        {
            return 'Warehouse is required.';
        }

        if
        (
            !this.customer
            ||
            !(this.customer.CustomerId > 0)
        )
        {
            return 'Customer is required : search the customer and pick from the list.';
        }

        if
        (
            !this.customer.IsActive
        )
        {
            return 'This customer is inactive and cannot be invoiced.';
        }

        if
        (
            this.lines.length === 0
        )
        {
            return `Add at least one ${this.page.itemLower}.`;
        }

        if
        (
            !this.narration.trim()
        )
        {
            return 'Narration is required.';
        }

        const badQty =
            this.rows.find(row => !!this.lineQtyIssue(row));

        if
        (
            badQty
        )
        {
            return `Line ${badQty.index + 1} : ${this.lineQtyIssue(badQty)}`;
        }

        const notReady =
            this.payments.find(row => !isDebitRowReady(row));

        if
        (
            notReady
        )
        {
            return `Payment ${notReady.Mode} ${formatMoney(notReady.Amount)} needs its details : open Checkout.`;
        }

        if
        (
            this.quoteFailed
        )
        {
            return this.quoteFailed;
        }

        // The latest quote is the server's verdict
        if
        (
            this.quote
            &&
            !this.quoteDirty
            &&
            !this.quoteBusy
            &&
            !this.quote.CanSave
        )
        {
            return this.quote.Errors[0]
                ||
                'The invoice cannot be saved yet : see the messages under the items.';
        }

        return '';
    }

    onSave():
        void
    {
        if
        (
            !this.isEditable
            ||
            this.progress.busy
        )
        {
            return;
        }

        const issue =
            this.saveIssue();

        if
        (
            issue
        )
        {
            this.actionError =
                issue;

            this.refresh();

            return;
        }

        const postsNow =
            !this.switches?.PostOnApproval;

        if
        (
            !postsNow
        )
        {
            this.save(false);

            return;
        }

        const paid =
            this.localPaid;

        this.confirmDialog.open(
            this.isEditMode ? 'Update and Post' : 'Save and Post',
            `The invoice (Tk ${formatMoney(this.figures.InvoiceTotal)}) is posted at once : stock goes out and the ledgers are posted${paid > 0 ? `, with a receipt of Tk ${formatMoney(paid)}` : ''}. Continue?`,
            () =>
            {
                setTimeout(
                    () =>
                        this.save(true)
                );
            },
            this.isEditMode ? 'Update & Post' : 'Save & Post',
            'Cancel',
            'primary'
        );
    }

    private save
    (
        postsNow:
            boolean
    ):
        void
    {
        const payload =
            this.buildPayload();

        const call$:
            Observable<SalesInvoiceSaved> =
            this.isEditMode && this.invoice
                ? this.salesInvoiceService.update(
                    this.invoice.PublicId || this.routePublicId,
                    {
                        ...payload,
                        SalesInvoiceId:this.invoice.SalesInvoiceId
                    } as UpdateSalesInvoice)
                : this.salesInvoiceService.create(payload);

        this.actionError =
            '';

        this.progress
            .run(
                postsNow
                    ? 'Saving and Posting Sales Invoice'
                    : this.isEditMode ? 'Updating Sales Invoice' : 'Saving Sales Invoice',
                postsNow
                    ? 'Saving the invoice, moving the stock and posting the ledgers and the receipt...'
                    : 'Please wait while the sales invoice is being saved...',
                postsNow
                    ? 'Sales invoice posted.'
                    : 'Sales invoice saved.',
                call$
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    saved =>
                    {
                        this.afterSaved(
                            saved
                        );
                    },

                error:
                    error =>
                    {
                        this.actionError =
                            this.errorText(error, 'Failed to save the sales invoice.');

                        this.refresh();

                        // Prices may have moved (stock, membership)
                        this.runQuote();
                    }
            });
    }

    private afterSaved
    (
        saved:
            SalesInvoiceSaved
    ):
        void
    {
        const posted =
            saved.Posted
            ||
            saved.Status === 'Posted';

        const parts:
            string[] =
            [
                `${saved.InvoiceNo || 'The invoice'} ${posted ? 'saved and posted' : this.isEditMode ? 'updated' : 'saved as Draft'}`
            ];

        if
        (
            saved.ReceiptVoucherNo
        )
        {
            parts.push(
                `receipt ${saved.ReceiptVoucherNo}`
            );
        }

        if
        (
            saved.Warnings.length > 0
        )
        {
            parts.push(
                saved.Warnings.join(' ')
            );
        }

        if
        (
            posted
            &&
            this.switches?.PrintAfterPosting
            &&
            this.defaults?.CanPrint
            &&
            !!saved.PublicId
        )
        {
            this.openPrint(
                this.page.a4DocKey,
                saved.PublicId
            );
        }

        this.goToList(
            `${parts.join(' · ')}.`,
            saved.Warnings.length > 0 ? 'warn' : 'ok',
            posted && this.defaults?.CanPrint ? saved.PublicId ?? '' : ''
        );
    }


    //===========================================================
    // Workflow (View)
    //===========================================================

    onApprove():
        void
    {
        const invoice =
            this.invoice;

        if
        (
            !invoice
            ||
            invoice.Status !== 'Draft'
        )
        {
            return;
        }

        this.confirmDialog.open(
            'Approve Sales Invoice',
            `Approve "${invoice.InvoiceNo}"? It can then be posted, returned to draft or cancelled.`,
            () =>
            {
                setTimeout(
                    () =>
                        this.runAction(
                            'Approving Sales Invoice',
                            'Sales invoice approved.',
                            this.salesInvoiceService.approve(invoice.PublicId ?? ''),
                            `${invoice.InvoiceNo} approved.`
                        )
                );
            },
            'Approve',
            'Cancel',
            'primary'
        );
    }

    onReturnToDraft():
        void
    {
        const invoice =
            this.invoice;

        if
        (
            !invoice
            ||
            invoice.Status !== 'Approved'
        )
        {
            return;
        }

        this.confirmDialog.open(
            'Return to Draft',
            `Return "${invoice.InvoiceNo}" to Draft so it can be changed?`,
            () =>
            {
                setTimeout(
                    () =>
                        this.runAction(
                            'Returning Sales Invoice',
                            'Sales invoice returned to draft.',
                            this.salesInvoiceService.returnToDraft(invoice.PublicId ?? ''),
                            `${invoice.InvoiceNo} returned to Draft.`
                        )
                );
            },
            'Return',
            'Cancel',
            'primary'
        );
    }

    onPost():
        void
    {
        const invoice =
            this.invoice;

        if
        (
            !invoice
            ||
            invoice.Status !== 'Approved'
        )
        {
            return;
        }

        this.confirmDialog.open(
            'Post Sales Invoice',
            `Post "${invoice.InvoiceNo}" (Tk ${formatMoney(invoice.InvoiceTotal)})? Stock goes out and the ledgers are posted${invoice.PaidAmount > 0 ? `, with a receipt of Tk ${formatMoney(invoice.PaidAmount)}` : ''}.`,
            () =>
            {
                setTimeout(
                    () =>
                        this.postInvoice(
                            invoice
                        )
                );
            },
            'Post',
            'Cancel',
            'primary'
        );
    }

    private postInvoice
    (
        invoice:
            SalesInvoice
    ):
        void
    {
        this.actionError =
            '';

        this.progress
            .run(
                'Posting Sales Invoice',
                'Moving the stock and posting the ledgers and the receipt...',
                'Sales invoice posted.',
                this.salesInvoiceService.post(invoice.PublicId ?? '')
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    saved =>
                    {
                        this.afterSaved(
                        {
                            ...saved,
                            SalesInvoiceId:saved.SalesInvoiceId || invoice.SalesInvoiceId,
                            PublicId:saved.PublicId || invoice.PublicId,
                            InvoiceNo:saved.InvoiceNo || invoice.InvoiceNo,
                            Status:'Posted',
                            Posted:true
                        });
                    },

                error:
                    error =>
                    {
                        this.actionError =
                            this.errorText(error, 'Failed to post the sales invoice.');

                        this.refresh();
                    }
            });
    }

    private runAction
    (
        title:
            string,
        doneMessage:
            string,
        call$:
            Observable<void>,
        notice:
            string
    ):
        void
    {
        this.actionError =
            '';

        this.progress
            .run(
                title,
                'Please wait...',
                doneMessage,
                call$
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.goToList(
                            notice,
                            'ok'
                        );
                    },

                error:
                    error =>
                    {
                        this.actionError =
                            this.errorText(error, 'The action could not be completed.');

                        this.refresh();
                    }
            });
    }


    //===========================================================
    // Cancel (inline panel; reason at least 5 characters)
    //===========================================================

    openCancel():
        void
    {
        if
        (
            !this.invoice
        )
        {
            return;
        }

        this.cancelOpen =
            true;

        this.cancelReason =
            '';

        this.cancelError =
            '';

        this.refresh();
    }

    closeCancel():
        void
    {
        this.cancelOpen =
            false;

        this.cancelError =
            '';

        this.refresh();
    }

    onCancelReasonChange
    (
        value:
            string | number
    ):
        void
    {
        this.cancelReason =
            String(value ?? '');

        this.cancelError =
            '';
    }

    get cancelNote():
        string
    {
        if
        (
            this.status === 'Approved'
        )
        {
            return 'Nothing was posted : the invoice is only marked Cancelled.';
        }

        return 'The journal, the receipt, the stock and the VAT are reversed and the invoice becomes Cancelled. This cannot be undone. Not allowed when anything was returned or a Price Adjustment was released by it.';
    }

    confirmCancel():
        void
    {
        const invoice =
            this.invoice;

        if
        (
            !invoice
        )
        {
            return;
        }

        const reason =
            toAsciiText(this.cancelReason).replace(/\s+/g, ' ').trim();

        if
        (
            reason.length < 5
        )
        {
            this.cancelError =
                'Reason is required : at least 5 characters.';

            this.refresh();

            return;
        }

        this.confirmDialog.open(
            'Cancel Sales Invoice',
            `Cancel "${invoice.InvoiceNo}"? ${invoice.Status === 'Posted' ? 'Everything it posted is reversed.' : ''}`.trim(),
            () =>
            {
                setTimeout(
                    () =>
                        this.runAction(
                            'Cancelling Sales Invoice',
                            'Sales invoice cancelled.',
                            this.salesInvoiceService.cancel(invoice.PublicId ?? '', reason),
                            `${invoice.InvoiceNo} cancelled.`
                        )
                );
            },
            'Cancel Invoice',
            'Keep Invoice',
            'danger'
        );
    }


    //===========================================================
    // Print : opens the Print Viewer in a new tab
    //   /print-viewer/<page print key>/<id>?doc=<document key>
    // (the viewer refuses a draft)
    //===========================================================

    openPrint
    (
        docKey:
            string,
        id:
            string =
            this.invoice?.PublicId ?? ''
    ):
        void
    {
        if
        (
            !id
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
            this.actionError =
                'The print tab was blocked by the browser. Allow pop-ups for this site and try again.';

            this.refresh();
        }
    }

    get canPrintHere():
        boolean
    {
        return !!this.defaults?.CanPrint
            &&
            !!this.invoice
            &&
            this.status !== 'Draft';
    }


    //===========================================================
    // Navigation, Clear
    //===========================================================

    private get listParent():
        ActivatedRoute
    {
        return this.route.parent
            ??
            this.route;
    }

    private goToList
    (
        notice:
            string =
            '',
        tone:
            SalesInvoiceNoticeTone =
            'ok',
        printId:
            string =
            ''
    ):
        void
    {
        const state:
            SalesInvoiceListNotice | undefined =
            notice
                ? { siNotice:notice, siTone:tone, siPrintId:printId || undefined }
                : undefined;

        void this.router.navigate(
            ['list'],
            {
                relativeTo:this.listParent,
                state
            }
        );
    }

    private goTo
    (
        mode:
            'edit' | 'view'
    ):
        void
    {
        void this.router.navigate(
            [mode, this.invoice?.PublicId || this.routePublicId],
            { relativeTo:this.listParent }
        );
    }

    onClear():
        void
    {
        if
        (
            !this.isEditable
            ||
            this.progress.busy
        )
        {
            return;
        }

        const clear =
            () =>
            {
                if
                (
                    this.isEditMode
                )
                {
                    this.loadEntity();

                    return;
                }

                this.resetEntry();

                if
                (
                    this.defaults
                )
                {
                    this.applyDefaults(
                        this.defaults,
                        true
                    );
                }

                this.setInitialState();
            };

        if
        (
            !this.hasChanges
        )
        {
            clear();

            return;
        }

        this.confirmDialog.open(
            'Clear Invoice',
            this.isEditMode
                ? 'Discard the changes and load the saved draft again?'
                : 'Clear the customer, items and payments?',
            clear,
            'Clear',
            'Keep',
            'danger'
        );
    }

    onBackToList():
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
            !this.hasChanges
            ||
            !this.isEditable
        )
        {
            this.goToList();

            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            () =>
                this.goToList(),
            'Leave',
            'Stay',
            'primary'
        );
    }


    //===========================================================
    // Display helpers
    //===========================================================

    money
    (
        value:
            number | null | undefined
    ):
        string
    {
        return formatMoney(value ?? 0);
    }

    // 10 -> "10", 1.5 -> "1.5"
    qtyString
    (
        value:
            number
    ):
        string
    {
        return String(
            roundMoney(value)
        );
    }

    percentText
    (
        value:
            number
    ):
        string
    {
        return String(roundMoney(value));
    }

    // yyyy-MM-dd or ISO -> 03-Nov-2026
    displayDate
    (
        value:
            string | null | undefined
    ):
        string
    {
        const date =
            fromIsoDate(
                (value ?? '').substring(0, 10)
            );

        if
        (
            !date
        )
        {
            return '';
        }

        const months =
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
    }

    trackRow
    (
        _:
            number,
        row:
            ItemRow
    ):
        number
    {
        return row.key;
    }

    private errorText
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

            if
            (
                error.status === 0
            )
            {
                return 'The server could not be reached.';
            }
        }

        if
        (
            error instanceof Error
            &&
            error.message
        )
        {
            return error.message;
        }

        return fallback;
    }
}


type SalesInvoiceCommandList =
    CommandSlot[];
