//===============================================================
// Imports
//===============================================================

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
    Observable,
    defer,
    timer,
    throwError,
    delayWhen,
    catchError,
    switchMap,
    forkJoin,
    of,
    map
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
    TextareaComponent
}
from '../../../../../shared/components/controls/textarea/textarea';

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
    ControlSegmentComponent,
    ControlSegmentItem
}
from '../../../../../shared/components/utilities/control-segment/control-segment';

import
{
    ToastComponent
}
from '../../../../../shared/components/utilities/toast/toast';

import
{
    OrbitLoaderComponent
}
from '../../../../../shared/components/utilities/orbit-loader/orbit-loader';

import
{
    ToastService
}
from '../../../../../shared/components/utilities/toast/toast.service';

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

//===============================================================
// Login session (active branch)
//===============================================================

import
{
    AuthenticationStorageService
}
from '../../../../../core/authentication/authentication-storage.service';

//===============================================================
// Accounting helpers
//===============================================================

import
{
    roundMoney,
    formatMoney,
    parseMoney,
    toIsoDate,
    fromIsoDate,
    amountInWords
}
from '../../../../../shared/components/accounting/accounting.models';

//===============================================================
// Purchase VAT (VAT Management › VAT Setup)
//===============================================================

import
{
    PurchaseVatService
}
from '../../../../vat-management/vat-setup/services/purchase-vat.service';

//===============================================================
// System Configuration switches (shared reader)
//===============================================================

import
{
    VoucherSwitchesService,
    SwitchMap,
    SwitchValueMap,
    VoucherDateWindow,
    switchOn,
    switchNumber,
    voucherDateWindow,
    voucherDateIssue
}
from '../../../../../shared/components/accounting/voucher-switches';

//===============================================================
// Model & Service
//===============================================================

import
{
    PurchaseOrderSupplierOption,
    PurchaseOrderProductOption,
    PurchaseOrderStockBranch,
    PurchaseOrderInvoicePrice,
    PurchaseOrderProfitBasis,
    PurchaseOrderDiscountType,
    PurchaseOrderRounding,
    PurchaseOrderLastTerms,
    PurchaseOrderVatApplicability,
    pricePurchaseOrder,
    poRound,
    poDpFromMrp,
    poMrpFromDp,
    poProfitFrom,
    poConvertProfit
}
from '../../purchase-order/purchase-order.model';

import
{
    Purchase,
    PurchaseLine,
    PurchaseUnit,
    PurchaseDefaults,
    PurchasePageType,
    PurchaseOpenOrder,
    PurchaseOpenOrderLine,
    CreatePurchase
}
from '../purchase.model';

import
{
    PurchaseService
}
from '../purchase.service';

import
{
    PURCHASE_PAGE,
    PurchasePageConfig
}
from '../purchase.config';

import
{
    ProductShelfComponent
}
from '../../product-shelf/product-shelf';

import
{
    ShelfOptions,
    ShelfPick,
    ShelfProduct
}
from '../../product-shelf/product-shelf.model';

//===============================================================
// Header Commands
//===============================================================

type FormCommand =
    'save' | 'clear' | 'shelf' | 'edit' | 'approve' | 'post' | 'return' | 'cancel' | 'print' | '';

// Stock position of an item (see stockPosition)
export interface StockPosition
{
    // null = not tracked yet
    stock:
        number | null;

    onOrder:
        number;

    available:
        number;

    reorder:
        number;

    red:
        number;

    max:
        number;

    status:
        'red' | 'amber' | 'green' | '';

    statusText:
        string;

    // null = levels not set
    suggested:
        number | null;

    // null = no Max Stock Level
    room:
        number | null;
}

interface CommandSlot
{
    command:
        FormCommand;

    text:
        string;

    icon:
        string;

    // Master Activity the button needs on this page; '' = the
    // command center's own Add / Update / Restore rule (Save,
    // Update) or none (Clear)
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


//===============================================================
// Component
//
// Purchase form (shared by MB / SP / AC : the page's
// config and service come from its own form file)
//
//   Header : Branch (login branch) + Financial Year chips,
//            status in the center, commands on the right
//   Left   : Pricing Terms (supplier terms, one line), PO
//            Information, Add <item>
//   Right  : Terms & Narration, Order Summary with totals
//
// The PO number is only previewed; the real one is taken when
// the draft is first saved. VAT is an estimate from the Purchase
// VAT rule on the PO date (the 6.3 decides at purchase entry).
//===============================================================

// The four numbers of a bike (Unit Desk)
type UnitField =
    'ChassisNo' | 'EngineNo' | 'KeyNo' | 'BatteryNo';

@Component(
{
    selector:'purchase-form',

    standalone:true,

    imports:
    [
        CommonModule,

        //=======================================================
        // Layout
        //=======================================================

        PageHeaderComponent,
        CommandCenterComponent,

        //=======================================================
        // Controls
        //=======================================================

        DatepickerComponent,
        TextareaComponent,
        TextboxComponent,
        SearchDropdownComponent,
        ControlSegmentComponent,

        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,
        OrbitLoaderComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,

        //=======================================================
        // Product Shelf (pick several items at once)
        //=======================================================

        ProductShelfComponent
    ],

    templateUrl:'./purchase-form.html',

    styleUrls:
    [
        './purchase-form.css'
    ]
})

//===============================================================
// Purchases Form
//===============================================================

export class PurchaseForm
implements OnInit, OnDestroy
{
    //===========================================================
    // This page (MB / SP / AC)
    //===========================================================

    readonly page:
        PurchasePageConfig =
        inject(PURCHASE_PAGE);

    private readonly pageType:
        PurchasePageType =
        this.page.pageType;

    // Purchase VAT rules used for the lines, by product type
    private readonly vatTypes:
        string[] =
        this.page.vatTypes;

    readonly entityName:
        string =
        this.page.title;

    // MRP / Profit % / DP pricing (SP / AC); MB : unit price only
    readonly mrpPricing:
        boolean =
        this.page.mrpPricing;

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly purchasesService =
        inject(PurchaseService);

    private readonly purchaseVatService =
        inject(PurchaseVatService);

    private readonly switchesService =
        inject(VoucherSwitchesService);

    // Settings › System Configuration (code → ON / Value)
    private switches:
        SwitchMap =
        {};

    private switchValues:
        SwitchValueMap =
        {};

    // PO Date limits from the Back / Post Dated switches
    dateWindow:
        VoucherDateWindow =
        {
            min:null,
            max:null
        };

    // PO date as saved ('' = new); an unchanged date of an older
    // draft is not checked against the window again
    private savedOrderDate:
        string =
        '';

    private readonly authenticationStorage =
        inject(AuthenticationStorageService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    // Requests and timers stop when the page is left
    private readonly destroyRef =
        inject(DestroyRef);

    private destroyed =
        false;

    private completeTimer:
        number | null =
        null;

    //===========================================================
    // Progress Configuration
    //===========================================================

    private readonly MIN_PROGRESS_MS:
        number =
        3000;

    private readonly PROGRESS_TICK_MS:
        number =
        100;

    private readonly PROGRESS_CEILING:
        number =
        90;

    private readonly PROGRESS_COMPLETE_HOLD_MS:
        number =
        600;

    private progressTimer?:
        number;

    private progressValue:
        number =
        0;

    // Prevents double submit while any command is running
    isSaving:
        boolean =
        false;

    //===========================================================
    // Mode
    //===========================================================

    mode:
        'add' | 'edit' | 'view' =
        'add';

    entityId:
        number =
        0;

    // uuid from the address bar (the record is loaded by it)
    routePublicId:
        string =
        '';

    loading:
        boolean =
        false;

    //===========================================================
    // Login branch (active session)
    //===========================================================

    loginBranchId:
        number =
        0;

    loginBranchName:
        string =
        '';

    //===========================================================
    // Loaded order (edit / view) and lookups
    //===========================================================

    order:
        Purchase | null =
        null;

    defaults:
        PurchaseDefaults | null =
        null;

    // Ignores an older defaults answer when the date changes fast
    private defaultsRequest =
        0;

    private vatRequest =
        0;

    //===========================================================
    // Header fields
    //===========================================================

    orderDateValue:
        Date =
        new Date();


    priceIncludesVat:
        boolean =
        true;

    supplierCode:
        string =
        '';

    narration:
        string =
        '';

    // Pricing terms
    invoicePriceBasis:
        PurchaseOrderInvoicePrice =
        'DP';

    profitBasis:
        PurchaseOrderProfitBasis =
        'MRP';

    defaultProfitText:
        string =
        '';

    discountType:
        PurchaseOrderDiscountType =
        'None';

    discountValueText:
        string =
        '';

    // Payable rounding of the order (saved or worked out)
    roundingAdjustment:
        number =
        0;

    roundingMethod:
        PurchaseOrderRounding =
        'None';

    wholeTakaLines:
        boolean =
        false;

    pricingProblem:
        string =
        '';

    // VAT applicability on the PO date (VAT Management switches)
    applicability:
        PurchaseOrderVatApplicability =
    {
        PurchaseVatApplicable:true,
        SalesVatApplicable:true,
        PurchaseSince:'',
        SalesSince:''
    };

    private applicabilityRequest =
        0;

    // "No VAT on this invoice" (supplier not VAT-registered)
    noVatInvoice:
        boolean =
        false;

    // Input credit per product type (Purchase VAT rule)
    private inputCredit =
        new Map<string, boolean>();

    // Set when a draft's saved VAT terms differ from today's
    vatTermsChanged:
        string =
        '';

    // Excl. VAT cannot be picked on an MRP invoice (MRP includes
    // VAT)
    private readonly priceModeItemsAll:
        ControlSegmentItem[] =
    [
        {
            value:'incl',
            text:'Incl. VAT'
        },
        {
            value:'excl',
            text:'Excl. VAT'
        },
        {
            value:'none',
            text:'No VAT'
        }
    ];

    private readonly priceModeItemsMrp:
        ControlSegmentItem[] =
    [
        {
            value:'incl',
            text:'Incl. VAT'
        },
        {
            value:'excl',
            text:'Excl. VAT',
            disabled:true
        },
        {
            value:'none',
            text:'No VAT'
        }
    ];

    get priceModeItems():
        ControlSegmentItem[]
    {
        return this.invoicePriceBasis === 'MRP'
            ? this.priceModeItemsMrp
            : this.priceModeItemsAll;
    }

    // Last MRP / this supplier's profit per item
    private lastTerms =
        new Map<string, PurchaseOrderLastTerms>();

    private lastTermsRequest =
        0;

    readonly invoicePriceItems:
        ControlSegmentItem[] =
    [
        {
            value:'DP',
            text:'DP'
        },
        {
            value:'MRP',
            text:'MRP'
        }
    ];

    readonly profitBasisItems:
        ControlSegmentItem[] =
    [
        {
            value:'DP',
            text:'on DP'
        },
        {
            value:'MRP',
            text:'on MRP'
        }
    ];

    readonly discountTypeItems:
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

    readonly priceEntryItems:
        ControlSegmentItem[] =
    [
        {
            value:true,
            text:'Incl. VAT'
        },
        {
            value:false,
            text:'Excl. VAT'
        }
    ];

    //===========================================================
    // Lines
    //===========================================================

    lines:
        PurchaseLine[] =
    [];

    //===========================================================
    // Add Spare Part / Lubricant (picker)
    //===========================================================

    categoryId:
        number | null =
        null;

    subCategoryId:
        number | null =
        null;

    productCode:
        string =
        '';

    quantityText:
        string =
        '';

    // DP per unit (typed or worked out)
    unitPriceText:
        string =
        '';

    mrpText:
        string =
        '';

    profitText:
        string =
        '';

    freeText:
        string =
        '';

    // Line total at DP (typed or worked out)
    totalText:
        string =
        '';

    // DP / line total typed over the calculated figure
    private dpTyped =
        false;

    private totalTyped =
        false;

    // MRP / Profit % / DP filled in by the page (not typed). A
    // filled-in figure follows the typed ones; it never counts as
    // typed itself.
    private mrpAuto =
        false;

    private profitAuto =
        false;

    private dpAuto =
        false;

    shortNotes:
        string =
        '';

    lineError:
        string =
        '';

    // Line opened by double-click (null = adding a new line)
    editingIndex:
        number | null =
        null;

    // Purchase VAT rate per product type on the PO date (a type
    // missing = still loading)
    private vatRates =
        new Map<string, number>();

    vatMessage:
        string =
        '';

    vatWarn:
        boolean =
        false;

    //===========================================================
    // Dropdown items (rebuilt only when their source changes)
    //===========================================================

    supplierItems:
        any[] =
    [];

    categoryItems:
        any[] =
    [];

    subCategoryItems:
        any[] =
    [];

    productItems:
        any[] =
    [];

    //===========================================================
    // PO No preview / Financial Year
    //===========================================================

    orderNoText:
        string =
        '';

    periodError:
        string =
        '';

    periodChecking:
        boolean =
        false;

    //===========================================================
    // Change Tracking
    //===========================================================

    private originalState:
        string =
        '';

    hasChanges:
        boolean =
        false;

    //===========================================================
    // Reason Overlay (Close Short / Cancel)
    //===========================================================

    reasonOpened:
        boolean =
        false;

    reasonAction:
        'cancel' =
        'cancel';

    //===========================================================
    // Purchase : supplier documents, warehouse, Purchase Order
    //===========================================================

    supplierInvoiceNo:
        string =
        '';

    supplierInvoiceDate:
        Date | null =
        null;

    mushakNo:
        string =
        '';

    mushakDate:
        Date | null =
        null;

    doReference:
        string =
        '';

    gatePassNo:
        string =
        '';

    warehouseId:
        number | null =
        null;

    warehouseItems:
        any[] =
        [];

    // The Purchase Order billed (PO Required ON)
    orderId:
        number | null =
        null;

    openOrders:
        PurchaseOpenOrder[] =
        [];

    orderItems:
        any[] =
        [];

    ordersLoading:
        boolean =
        false;

    private ordersRequest =
        0;

    // Mushak 6.3 No already used by this supplier this FY
    // ('' = free); checked while typing
    mushakError:
        string =
        '';

    mushakChecking:
        boolean =
        false;

    private mushakTimer?:
        ReturnType<typeof setTimeout>;

    private mushakRequest =
        0;

    // Line VAT % typed (VAT as per 6.3 ON)
    vatText:
        string =
        '';

    // Unit Desk (MB, received here) : the line being edited
    unitLineIndex:
        number | null =
        null;

    unitRows:
        PurchaseUnit[] =
        [];

    unitError:
        string =
        '';

    // Numbers the server refused (live check or save : already
    // on another purchase / entered twice) : the line and the box
    // show red
    unitClashes:
        { field:UnitField; value:string; text:string }[] =
        [];

    // Live check of the desk numbers against other purchases
    unitChecking:
        boolean =
        false;

    private unitTimer?:
        ReturnType<typeof setTimeout>;

    private unitRequest =
        0;

    reasonText:
        string =
        '';

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.readLoginBranch();

        // Switches first : they decide the defaults and limits
        this.loading =
            true;

        void this.loadSwitches()
            .then(
                () =>
                {
                    if
                    (
                        this.destroyed
                    )
                    {
                        return;
                    }

                    this.loading =
                        false;

                    this.initializeMode();
                }
            );
    }

    //===========================================================
    // Switches (read by code)
    //===========================================================

    private async loadSwitches():
        Promise<void>
    {
        try
        {
            this.switches =
                await this.switchesService.load();

            this.switchValues =
                this.switchesService.lastValues;
        }
        catch
        {
            this.switches =
                {};

            this.switchValues =
                {};
        }

        this.dateWindow =
            voucherDateWindow(
                this.switches,
                this.switchValues,
                this.page.switches.BACK_DATED,
                this.page.switches.POST_DATED
            );
    }

    // Max Lines (0 = no limit)
    get maxLines():
        number
    {
        return switchNumber(
            this.switches,
            this.switchValues,
            this.page.switches.MAX_LINES
        );
    }

    // PO Required : lines come from one Purchase Order
    get poRequired():
        boolean
    {
        return switchOn(
            this.switches,
            this.page.switches.PO_REQUIRED,
            false
        );
    }

    // Products Received on Purchase : warehouse + Unit Desk here
    get receivedOnPurchase():
        boolean
    {
        return switchOn(
            this.switches,
            this.page.switches.RECEIVED_ON_PURCHASE,
            false
        );
    }

    // MB : Key & Battery Required (CFG-MOD-007-0048). ON = every
    // bike's Key No and Battery No asked and required; OFF = not
    // kept (Unit Desk columns hidden). Chassis No and Engine No
    // are always required.
    get unitsRequired():
        boolean
    {
        return switchOn(
            this.switches,
            this.page.switches.UNITS_REQUIRED,
            true
        );
    }

    // Unit Desk columns typed / pasted into, left to right
    get unitFields():
        UnitField[]
    {
        return this.unitsRequired
            ? ['ChassisNo', 'EngineNo', 'KeyNo', 'BatteryNo']
            : ['ChassisNo', 'EngineNo'];
    }

    // Key / Battery columns on the desk : the switch ON, or (read
    // only) a bike saved with them
    get unitKeysShown():
        boolean
    {
        return this.unitsRequired
            ||
            (this.isReadonly && this.unitRows.some(x => !!x.KeyNo || !!x.BatteryNo));
    }

    // Unit Desk on this page (MB, received here)
    get unitDesk():
        boolean
    {
        return this.pageType === 'MB'
            &&
            this.receivedOnPurchase;
    }

    // Neither switch asks : one of the two (invoice / Mushak) is
    // still needed
    get oneDocumentNeeded():
        boolean
    {
        return !this.invoiceRequired
               &&
               !this.mushakRequired
               &&
               !(this.supplierInvoiceNo && this.supplierInvoiceDate)
               &&
               !(this.mushakNo && this.mushakDate);
    }

    get mushakRequired():
        boolean
    {
        return switchOn(
            this.switches,
            this.page.switches.MUSHAK_REQUIRED,
            false
        );
    }

    get invoiceRequired():
        boolean
    {
        return switchOn(
            this.switches,
            this.page.switches.INVOICE_NO_REQUIRED,
            false
        );
    }

    get doRequired():
        boolean
    {
        return switchOn(
            this.switches,
            this.page.switches.DO_REQUIRED,
            false
        );
    }

    get gatePassRequired():
        boolean
    {
        return switchOn(
            this.switches,
            this.page.switches.GATE_PASS_REQUIRED,
            false
        );
    }

    // Price Above PO : null = not allowed; else the tolerance %
    get priceAbovePo():
        number | null
    {
        if
        (
            !switchOn(this.switches, this.page.switches.PRICE_ABOVE_PO, false)
        )
        {
            return null;
        }

        const value =
            Number((this.switchValues?.[this.page.switches.PRICE_ABOVE_PO] ?? '').trim());

        return value > 0
            ? Math.min(value, 100)
            : 0;
    }

    // VAT as per 6.3 : the line VAT % can be typed
    get vatEditable():
        boolean
    {
        return switchOn(
            this.switches,
            this.page.switches.VAT_AS_PER_63,
            false
        );
    }

    get printOnApproval():
        boolean
    {
        return switchOn(
            this.switches,
            this.page.switches.PRINT_ON_APPROVAL,
            true
        );
    }

    get postOnApproval():
        boolean
    {
        return switchOn(
            this.switches,
            this.page.switches.POST_ON_APPROVAL,
            false
        );
    }

    // Free Qty on the lines (OFF / missing = no Free Qty)
    get freeGoodsAllowed():
        boolean
    {
        return switchOn(
            this.switches,
            this.page.switches.FREE_GOODS,
            false
        );
    }

    // Whole-taka rounding from the switches (OFF / missing = None)
    private get roundingSetting():
        { method:PurchaseOrderRounding; whole:boolean }
    {
        if
        (
            !switchOn(this.switches, this.page.switches.ROUND_PAYABLE, false)
        )
        {
            return { method:'None', whole:false };
        }

        const value =
            (this.switchValues?.[this.page.switches.ROUND_PAYABLE] ?? '').trim().toLowerCase();

        return {
            method:
                value === 'up'
                    ? 'Up'
                    : value === 'down'
                        ? 'Down'
                        : 'Nearest',
            whole:
                switchOn(this.switches, this.page.switches.WHOLE_TAKA_LINES, false)
        };
    }

    // PO Date limits for the calendar (Add / Edit only)
    get minOrderDate():
        Date | null
    {
        return this.isEditable
            ? this.dateWindow.min
            : null;
    }

    get maxOrderDate():
        Date | null
    {
        return this.isEditable
            ? this.dateWindow.max
            : null;
    }

    // '' when the PO date may be used
    private get orderDateIssue():
        string
    {
        const date =
            toIsoDate(this.orderDateValue);

        if
        (
            !this.isEditable
            ||
            date === this.savedOrderDate
        )
        {
            return '';
        }

        return voucherDateIssue(
            date,
            this.dateWindow
        )
        .replace(/voucher date/g, 'purchase date');
    }

    //===========================================================
    // Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        this.destroyed =
            true;

        this.clearProgressTimer();

        if
        (
            this.completeTimer !== null
        )
        {
            window.clearTimeout(
                this.completeTimer
            );

            this.completeTimer =
                null;
        }

        if
        (
            this.isSaving
        )
        {
            this.progressDialog.close();
        }
    }

    //===========================================================
    // Login branch
    //===========================================================

    private readLoginBranch():
        void
    {
        const user =
            this.authenticationStorage.getUser();

        this.loginBranchId =
            Number(user?.branchId) || 0;

        this.loginBranchName =
            (user?.branchName ?? '').trim();
    }

    // The order's own branch once saved, else the login branch
    get branchId():
        number
    {
        return this.order?.BranchId
            ||
            this.loginBranchId;
    }

    get branchName():
        string
    {
        return this.order?.BranchName
            ||
            this.loginBranchName;
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
        )
        {
            this.routePublicId =
                id;

            this.loadEntity();

            return;
        }

        this.mode =
            'add';

        this.initializeEntity();
    }

    // The uuid in the address bar ('' = add)
    private resolveEntityId():
        string
    {
        let currentRoute:
            ActivatedRoute | null =
            this.route;

        while
        (
            currentRoute
        )
        {
            const id =
                (currentRoute.snapshot.paramMap.get('id') ?? '').trim();

            if
            (
                id !== ''
            )
            {
                return id;
            }

            currentRoute =
                currentRoute.parent;
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

    //===========================================================
    // Status
    //===========================================================

    get status():
        string
    {
        return this.order?.Status
            ||
            'Draft';
    }

    // "Closed Short" → pof-status-closed-short
    get statusClass():
        string
    {
        return `pof-status pof-status-${this.status.toLowerCase().replace(/\s+/g, '-')}`;
    }

    // Only a draft in Add / Edit can be changed
    get isEditable():
        boolean
    {
        return !this.isViewMode
            &&
            this.status === 'Draft'
            &&
            !this.loading;
    }

    get isReadonly():
        boolean
    {
        return !this.isEditable
            ||
            this.isSaving;
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
                return `Add ${this.entityName}`;

            case 'edit':
                return `Update ${this.entityName}`;

            default:
                return `View ${this.entityName}`;
        }
    }

    get financialYearText():
        string
    {
        if
        (
            this.periodChecking
            &&
            !this.defaults
        )
        {
            return 'Checking...';
        }

        return this.defaults?.FinancialYearName
            ||
            this.defaults?.FinancialYearCode
            ||
            'Not set';
    }

    //===========================================================
    // Header Commands (by mode and status; at most 3)
    //
    // Add          : Save, Clear
    // Edit (Draft) : Update, Approve, Clear
    // View Draft   : Approve, Edit
    // Approved     : Post, Return, Print (Print on Approval)
    // Posted       : Cancel, Print
    // Cancelled    : Print
    //
    // Print is always the last button. An approved purchase that is
    // not wanted : Return to Draft, then delete it from the list.
    //
    // After any action the page goes back to the list
    //===========================================================

    private get commandSlots():
        CommandSlot[]
    {
        const save:
            CommandSlot =
        {
            command:'save',
            text:this.isEditMode ? 'Update' : 'Save',
            icon:'fas fa-floppy-disk',
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

        // Product Shelf (same as the Shelf button in the Add card)
        const shelf:
            CommandSlot =
        {
            command:'shelf',
            text:'Shelf',
            icon:'fas fa-store',
            activity:''
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

        if
        (
            this.loading
        )
        {
            return [];
        }

        if
        (
            this.isAddMode
        )
        {
            // PO Required : lines come from the order (no Shelf)
            return this.poRequired
                ? [save, clear]
                : [save, shelf, clear];
        }

        switch
        (
            this.status
        )
        {
            case 'Draft':
                // Edit : the Shelf takes Clear's place (3 commands)
                return this.isEditMode
                    ? (this.poRequired ? [save, approve] : [save, shelf, approve])
                    : [approve, edit];

            case 'Approved':
                // Print while Approved only when the switch allows
                return this.printOnApproval
                    ? [post, returnToDraft, print]
                    : [post, returnToDraft];

            // Cancel only while nothing was received out, moved or
            // returned (server checks)
            case 'Posted':
                return [cancel, print];

            case 'Cancelled':
                return [print];

            default:
                return [];
        }
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
            this.isSaving
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

            case 'clear':
                this.onClear();
                break;

            case 'shelf':
                this.onShelfCommand();
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
                this.openReason('cancel');
                break;

            case 'print':
                this.onPrint();
                break;
        }
    }

    //===========================================================
    // Print : opens the Print Viewer in a new tab
    //   /print-viewer/<page print key>/<id>?doc=all
    // (the viewer refuses a draft)
    //===========================================================

    onPrint():
        void
    {
        const id =
            this.order?.PublicId
            ??
            '';

        if
        (
            id === ''
            ||
            this.status === 'Draft'
            ||
            (
                this.status === 'Approved'
                &&
                !this.printOnApproval
            )
        )
        {
            this.toast.info(
                'Not Printable',
                this.printOnApproval
                    ? 'A purchase prints once it is approved.'
                    : 'A purchase prints once it is posted.'
            );

            return;
        }

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', this.page.printKey, id],
                    {
                        queryParams:{ doc:'all' }
                    }
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
            this.toast.error(
                'Print Failed',
                'The browser blocked the new tab. Allow pop-ups for this site.'
            );
        }
    }

    //===========================================================
    // Initialize Entity (Add)
    //===========================================================

    private initializeEntity():
        void
    {
        this.order =
            null;

        this.orderDateValue =
            new Date();

        this.supplierInvoiceNo =
            '';

        this.supplierInvoiceDate =
            null;

        this.mushakNo =
            '';

        this.mushakDate =
            null;

        this.doReference =
            '';

        this.gatePassNo =
            '';

        this.warehouseId =
            null;

        this.orderId =
            null;

        this.openOrders =
            [];

        this.orderItems =
            [];

        this.vatText =
            '';

        this.unitClashes =
            [];

        this.mushakError =
            '';

        // New order : VAT inclusive, DP invoice, profit on MRP until a
        // supplier is picked (its terms then decide)
        this.priceIncludesVat =
            true;

        this.invoicePriceBasis =
            'DP';

        this.profitBasis =
            'MRP';

        this.termsOpen =
            false;

        this.defaultProfitText =
            '';

        this.discountType =
            'None';

        this.discountValueText =
            '';

        this.roundingAdjustment =
            0;

        this.pricingProblem =
            '';

        this.lastTerms =
            new Map<string, PurchaseOrderLastTerms>();

        this.noVatInvoice =
            false;

        this.vatTermsChanged =
            '';

        this.savedOrderDate =
            '';

        this.supplierCode =
            '';

        this.narration =
            '';

        this.lines =
            [];

        this.orderNoText =
            '';

        this.resetPicker();

        this.setInitialFormState();

        this.loadDefaults(true);

        this.loadVatRate(false);

        this.loadApplicability();
    }

    //===========================================================
    // Load Entity (Edit / View)
    //===========================================================

    private loadEntity():
        void
    {
        this.loading =
            true;

        this.purchasesService
            .getById(this.routePublicId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    item:
                        Purchase
                ):
                    void =>
                {
                    this.order =
                        item;

                    // Internal id (actions and save use it; links use the uuid)
                    this.entityId =
                        item.PurchaseId;

                    // Only a draft opens in Edit
                    if
                    (
                        this.isEditMode
                        &&
                        item.Status !== 'Draft'
                    )
                    {
                        this.mode =
                            'view';
                    }

                    this.orderDateValue =
                        fromIsoDate(item.PurchaseDate)
                        ??
                        new Date();

                    this.savedOrderDate =
                        item.PurchaseDate;

                    this.supplierInvoiceNo =
                        item.SupplierInvoiceNo;

                    this.supplierInvoiceDate =
                        fromIsoDate(item.SupplierInvoiceDate);

                    this.mushakNo =
                        item.MushakNo;

                    this.mushakDate =
                        fromIsoDate(item.MushakDate);

                    this.doReference =
                        item.DoReference;

                    this.gatePassNo =
                        item.GatePassNo;

                    this.warehouseId =
                        item.WarehouseId;

                    this.orderId =
                        item.PurchaseOrderId;

                    this.priceIncludesVat =
                        item.PriceIncludesVat;

                    this.invoicePriceBasis =
                        item.InvoicePriceBasis === 'MRP' ? 'MRP' : 'DP';

                    // A margin is always on MRP
                    this.profitBasis =
                        'MRP';

                    this.defaultProfitText =
                        item.DefaultProfitPercent ? String(item.DefaultProfitPercent) : '';

                    this.discountType =
                        item.AdditionalDiscountType === 'Percent' || item.AdditionalDiscountType === 'Amount'
                            ? item.AdditionalDiscountType
                            : 'None';

                    this.discountValueText =
                        item.AdditionalDiscountValue ? String(item.AdditionalDiscountValue) : '';

                    this.roundingAdjustment =
                        item.RoundingAdjustment;

                    this.roundingMethod =
                        (['Nearest', 'Up', 'Down'].includes(item.RoundingMethod) ? item.RoundingMethod : 'None') as PurchaseOrderRounding;

                    this.wholeTakaLines =
                        item.WholeTakaLines;

                    this.noVatInvoice =
                        item.NoVatInvoice;

                    this.vatTermsChanged =
                        '';

                    this.pricingProblem =
                        '';

                    this.supplierCode =
                        item.SupplierCode;

                    this.narration =
                        item.Narration;

                    this.lines =
                        item.Lines.map(line => ({ ...line }));

                    this.orderNoText =
                        item.PurchaseNo;

                    // Add lists follow the saved supplier's brand
                    if
                    (
                        this.defaults
                    )
                    {
                        this.buildCategoryItems();
                    }

                    this.resetPicker();

                    this.loading =
                        false;

                    this.setInitialFormState();

                    // Lookups (suppliers / spare parts / lubricants / period) for a draft
                    this.loadDefaults(false);

                    if
                    (
                        this.isEditable
                    )
                    {
                        this.loadVatRate(false);

                        this.loadLastTerms();

                        this.loadApplicability();
                    }

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Purchase Error',
                        error
                    );

                    this.loading =
                        false;

                    this.toast.error(
                        'Load Failed',
                        this.extractErrorMessage(
                            error,
                            'Unable to load the purchase.'
                        )
                    );

                    void this.router.navigate(
                        ['list'],
                        {
                            relativeTo:
                                this.listParent
                        }
                    );
                }
            });
    }

    //===========================================================
    // Defaults : PO No preview, Financial Year, suppliers, spare parts / lubricants
    // (branch + PO date)
    //===========================================================

    private loadDefaults
    (
        previewNumber:
            boolean
    ):
        void
    {
        const request =
            ++this.defaultsRequest;

        this.periodChecking =
            true;

        this.purchasesService
            .getDefaults(
                this.pageType,
                this.branchId,
                toIsoDate(this.orderDateValue)
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    item:
                        PurchaseDefaults
                ):
                    void =>
                {
                    if
                    (
                        request !== this.defaultsRequest
                    )
                    {
                        return;
                    }

                    this.defaults =
                        item;

                    this.periodChecking =
                        false;

                    this.periodError =
                        item.Message;

                    // Add : number preview; a saved order keeps its own
                    if
                    (
                        previewNumber
                        &&
                        this.isAddMode
                    )
                    {
                        this.orderNoText =
                            item.PurchaseNo;
                    }

                    this.buildSupplierItems();

                    this.buildWarehouseItems();

                    this.buildCategoryItems();

                    this.syncSupplierTerms(false);

                    // A saved draft : its order stays in the list
                    this.loadOpenOrders();

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    if
                    (
                        request !== this.defaultsRequest
                    )
                    {
                        return;
                    }

                    console.error(
                        'Purchase Defaults Error',
                        error
                    );

                    this.periodChecking =
                        false;

                    this.periodError =
                        this.extractErrorMessage(
                            error,
                            `Unable to load suppliers, ${this.page.items} and the financial year.`
                        );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Purchase VAT rate on the PO date
    //   rerate : true when the date changed (lines take the rate)
    //===========================================================

    private loadVatRate
    (
        rerate:
            boolean
    ):
        void
    {
        const request =
            ++this.vatRequest;

        const date =
            toIsoDate(this.orderDateValue);

        this.vatRates =
            new Map<string, number>();

        this.vatWarn =
            false;

        this.vatMessage =
            'Checking the Purchase VAT rules...';

        forkJoin
        (
            this.vatTypes.map
            (
                type =>
                    this.purchaseVatService
                        .getRate(
                            type,
                            date
                        )
                        .pipe(
                            map(rule => ({ type, rate:Number(rule?.VatRate) || 0, credit:rule?.InputCreditAllowed !== false, problem:'' })),
                            catchError
                            (
                                (error: unknown) =>
                                    of({
                                        type,
                                        rate:0,
                                        credit:true,
                                        problem:
                                            error instanceof HttpErrorResponse && error.status === 404
                                                ? 'missing'
                                                : 'failed'
                                    })
                            )
                        )
            )
        )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe
        (
            results =>
            {
                if
                (
                    request !== this.vatRequest
                )
                {
                    return;
                }

                this.applyVatRates(
                    results,
                    date,
                    rerate
                );
            }
        );
    }

    private applyVatRates
    (
        results:
            { type: string; rate: number; credit: boolean; problem: string }[],
        date:
            string,
        rerate:
            boolean
    ):
        void
    {
        this.vatRates =
            new Map(results.map(x => [x.type, x.rate] as const));

        this.inputCredit =
            new Map(results.map(x => [x.type, x.credit] as const));

        const missing =
            results.filter(x => x.problem === 'missing').map(x => x.type);

        const failed =
            results.some(x => x.problem === 'failed');

        const rates =
            results.map(x => `${x.type} ${x.rate}%`).join(', ');

        this.vatWarn =
            missing.length > 0
            ||
            failed;

        this.vatMessage =
            failed
                ? 'Unable to read the Purchase VAT rules. VAT is taken as 0% where it could not be read.'
                : missing.length > 0
                    ? `No active Purchase VAT rule for ${missing.join(' / ')} on ${this.displayDate(date)}. VAT is taken as 0% — create or extend the rule in VAT Setup › Purchase VAT.`
                    : `VAT rate on ${this.displayDate(date)} : ${rates} (estimate; the 6.3 decides at purchase entry).`;

        if
        (
            rerate
            &&
            this.isEditable
        )
        {
            this.lines =
                this.lines.map
                (
                    line =>
                        ({
                            ...line,
                            VatRate:this.rateFor(line.ProductType) ?? line.VatRate
                        })
                );

            this.checkForChanges();
        }

        this.cdr.detectChanges();
    }

    // Rate of a product type (null : not loaded yet)
    private rateFor
    (
        productType:
            string
    ):
        number | null
    {
        return this.vatRates.get(productType) ?? null;
    }

    // VAT % shown on the picker : the selected product's type, or
    // the only type of the page
    get vatRate():
        number | null
    {
        if
        (
            !this.vatCharged
        )
        {
            return 0;
        }

        const product =
            (this.defaults?.Products ?? []).find(x => x.ProductCode === this.productCode);

        if
        (
            product
        )
        {
            return this.rateFor(product.ProductType);
        }

        return this.vatTypes.length === 1
            ? this.rateFor(this.vatTypes[0])
            : null;
    }

    get vatRateText():
        string
    {
        return this.vatRate === null
            ? ''
            : `${this.vatRate}`;
    }

    //===========================================================
    // Dropdown items
    //===========================================================

    private buildSupplierItems():
        void
    {
        const suppliers:
            PurchaseOrderSupplierOption[] =
            (this.defaults?.Suppliers ?? []).filter(x => x.IsActive);

        this.supplierItems =
            suppliers.map
            (
                x =>
                ({
                    label:`${x.DisplayName} || ${x.SupplierCode}`,
                    value:x.SupplierCode
                })
            );

        // A saved order keeps its supplier even when it left the list
        if
        (
            this.supplierCode
            &&
            !this.supplierItems.some(x => x.value === this.supplierCode)
        )
        {
            this.supplierItems =
            [
                {
                    label:`${this.order?.SupplierName || this.supplierCode} || ${this.supplierCode}`,
                    value:this.supplierCode
                },
                ...this.supplierItems
            ];
        }
    }

    // Brand of a supplier (null : no supplier, or one without a
    // brand → every product is offered)
    private brandOfSupplier
    (
        supplierCode:
            string
    ):
        number | null
    {
        return (this.defaults?.Suppliers ?? [])
            .find(x => x.SupplierCode === supplierCode)
            ?.BrandManagementId
            ??
            null;
    }

    // A product fits the brand when either side has no brand
    private fitsBrand
    (
        product:
            PurchaseOrderProductOption | undefined,
        brandId:
            number | null
    ):
        boolean
    {
        return (
            brandId === null
            ||
            !product
            ||
            product.BrandManagementId == null
            ||
            product.BrandManagementId === brandId
        );
    }

    // Active products of the selected supplier's brand
    private get activeProducts():
        PurchaseOrderProductOption[]
    {
        const brandId =
            this.brandOfSupplier(this.supplierCode);

        // PO Required : only the products of the order picked
        const order =
            this.poRequired
                ? this.selectedOrder
                : null;

        const onOrder =
            order
                ? new Set(order.Lines.map(x => x.ProductCode))
                : null;

        return (this.defaults?.Products ?? [])
            .filter(x => x.IsActive && this.fitsBrand(x, brandId))
            .filter(x => !onOrder || onOrder.has(x.ProductCode));
    }

    private buildCategoryItems():
        void
    {
        const categories =
            new Map<number, string>();

        for
        (
            const item of this.activeProducts
        )
        {
            if
            (
                item.CategoryId
            )
            {
                categories.set(
                    item.CategoryId,
                    item.CategoryName || `Category ${item.CategoryId}`
                );
            }
        }

        this.categoryItems =
        [
            {
                label:'All',
                value:null
            },

            ...[...categories.entries()]
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([id, name]) => ({ label:name, value:id }))
        ];

        this.buildSubCategoryItems();
    }

    private buildSubCategoryItems():
        void
    {
        const subCategories =
            new Map<number, string>();

        for
        (
            const item of this.activeProducts
        )
        {
            if
            (
                item.SubCategoryId
                &&
                (
                    this.categoryId === null
                    ||
                    item.CategoryId === this.categoryId
                )
            )
            {
                subCategories.set(
                    item.SubCategoryId,
                    item.SubCategoryName || `Sub-Category ${item.SubCategoryId}`
                );
            }
        }

        this.subCategoryItems =
        [
            {
                label:'All',
                value:null
            },

            ...[...subCategories.entries()]
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([id, name]) => ({ label:name, value:id }))
        ];

        if
        (
            this.subCategoryId !== null
            &&
            !subCategories.has(this.subCategoryId)
        )
        {
            this.subCategoryId =
                null;
        }

        this.buildProductItems();
    }

    // Products already on the order are not offered again; the
    // line being edited keeps its own product in the list
    private get takenProductCodes():
        Set<string>
    {
        return new Set(
            this.lines
                .filter((_, i) => i !== this.editingIndex)
                .map(x => x.ProductCode)
        );
    }

    private buildProductItems():
        void
    {
        const taken =
            this.takenProductCodes;

        this.productItems =
            this.activeProducts
                .filter
                (
                    x =>
                        !taken.has(x.ProductCode)
                        &&
                        (this.categoryId === null || x.CategoryId === this.categoryId)
                        &&
                        (this.subCategoryId === null || x.SubCategoryId === this.subCategoryId)
                )
                .sort((a, b) => a.ProductName.localeCompare(b.ProductName))
                .map
                (
                    x =>
                    ({
                        label:`${x.ProductName} || ${x.ProductCode}`,
                        value:x.ProductCode
                    })
                );

        if
        (
            this.productCode
            &&
            !this.productItems.some(x => x.value === this.productCode)
        )
        {
            this.productCode =
                '';
        }
    }

    //===========================================================
    // Header field events
    //===========================================================

    onOrderDateChange
    (
        value:
            Date
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

        const changed =
            toIsoDate(value) !== toIsoDate(this.orderDateValue);

        this.orderDateValue =
            value;

        this.checkForChanges();

        if
        (
            changed
        )
        {
            // New month / year → new number preview and period
            this.loadDefaults(true);

            // Another financial year may free / take the Mushak No
            this.queueMushakCheck();

            this.loadVatRate(true);

            this.loadApplicability();
        }
    }

    //===========================================================
    // Supplier documents (Mushak 6.3, invoice, DO, gate pass)
    //===========================================================

    onInvoiceNoChange
    (
        value:
            string | number
    ):
        void
    {
        this.supplierInvoiceNo =
            String(value ?? '').trim();

        this.checkForChanges();
    }

    onInvoiceDateChange
    (
        value:
            Date | null
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

        this.supplierInvoiceDate =
            value
            ??
            null;

        this.checkForChanges();
    }

    onMushakNoChange
    (
        value:
            string | number
    ):
        void
    {
        this.mushakNo =
            String(value ?? '').trim();

        this.checkForChanges();

        this.queueMushakCheck();
    }

    // Check a moment after typing stops
    private queueMushakCheck():
        void
    {
        if
        (
            this.mushakTimer
        )
        {
            clearTimeout(this.mushakTimer);
        }

        this.mushakTimer =
            setTimeout(
                () =>
                    this.checkMushak(),
                400
            );
    }

    // Mushak 6.3 No : once per supplier in the financial year
    private checkMushak():
        void
    {
        const request =
            ++this.mushakRequest;

        if
        (
            !this.isEditable
            ||
            !this.mushakNo
            ||
            !this.supplierCode
        )
        {
            this.mushakError =
                '';

            this.mushakChecking =
                false;

            this.cdr.detectChanges();

            return;
        }

        this.mushakChecking =
            true;

        this.purchasesService
            .checkMushak(
                this.supplierCode,
                this.mushakNo,
                this.branchId,
                toIsoDate(this.orderDateValue),
                this.order?.PurchaseId ?? null
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    result =>
                    {
                        if
                        (
                            request !== this.mushakRequest
                        )
                        {
                            return;
                        }

                        this.mushakChecking =
                            false;

                        this.mushakError =
                            result.Taken
                                ? result.Message || `Mushak 6.3 No ${this.mushakNo} is already on purchase ${result.PurchaseNo}.`
                                : '';

                        this.cdr.detectChanges();
                    },
                error:
                    () =>
                    {
                        // The save checks it again
                        if
                        (
                            request === this.mushakRequest
                        )
                        {
                            this.mushakChecking =
                                false;

                            this.cdr.detectChanges();
                        }
                    }
            });
    }

    onMushakDateChange
    (
        value:
            Date | null
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

        this.mushakDate =
            value
            ??
            null;

        this.checkForChanges();
    }

    onDoReferenceChange
    (
        value:
            string | number
    ):
        void
    {
        this.doReference =
            String(value ?? '').trim();

        this.checkForChanges();
    }

    onGatePassChange
    (
        value:
            string | number
    ):
        void
    {
        this.gatePassNo =
            String(value ?? '').trim();

        this.checkForChanges();
    }

    onWarehouseChange
    (
        value:
            number | null
    ):
        void
    {
        this.warehouseId =
            value
            ??
            null;

        this.checkForChanges();
    }


    // Warehouses of the branch (default first); a saved one that
    // is no longer listed stays selectable
    private buildWarehouseItems():
        void
    {
        const warehouses =
            this.defaults?.Warehouses ?? [];

        this.warehouseItems =
            warehouses.map
            (
                x =>
                ({
                    label:`${x.WarehouseName} || ${x.WarehouseCode}${x.IsDefault ? ' · Default' : ''}`,
                    value:x.WarehouseId
                })
            );

        if
        (
            this.warehouseId
            &&
            !warehouses.some(x => x.WarehouseId === this.warehouseId)
        )
        {
            this.warehouseItems =
            [
                {
                    label:this.order?.WarehouseName || `Warehouse ${this.warehouseId}`,
                    value:this.warehouseId
                },
                ...this.warehouseItems
            ];
        }

        // New purchase : the branch's default warehouse
        if
        (
            this.isEditable
            &&
            this.receivedOnPurchase
            &&
            !this.warehouseId
        )
        {
            const pick =
                warehouses.find(x => x.IsDefault)
                ??
                (warehouses.length === 1 ? warehouses[0] : undefined);

            if
            (
                pick
            )
            {
                this.warehouseId =
                    pick.WarehouseId;
            }
        }
    }


    //===========================================================
    // Purchase Order (PO Required ON)
    //===========================================================

    // Open orders of the supplier (and the one this draft uses)
    private loadOpenOrders():
        void
    {
        const request =
            ++this.ordersRequest;

        if
        (
            !this.poRequired
            ||
            !this.supplierCode
        )
        {
            this.openOrders =
                [];

            this.buildOrderItems();

            return;
        }

        this.ordersLoading =
            true;

        this.purchasesService
            .getOpenOrders(
                this.supplierCode,
                this.orderId
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    orders:
                        PurchaseOpenOrder[]
                ):
                    void =>
                {
                    if
                    (
                        request !== this.ordersRequest
                    )
                    {
                        return;
                    }

                    this.ordersLoading =
                        false;

                    // Same branch only
                    this.openOrders =
                        orders.filter(x => !x.BranchId || x.BranchId === this.branchId || x.PurchaseOrderId === this.orderId);

                    this.buildOrderItems();

                    this.buildCategoryItems();

                    this.cdr.detectChanges();
                },
                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    if
                    (
                        request !== this.ordersRequest
                    )
                    {
                        return;
                    }

                    this.ordersLoading =
                        false;

                    this.openOrders =
                        [];

                    this.buildOrderItems();

                    this.toast.error(
                        'Purchase Orders',
                        this.extractErrorMessage(
                            error,
                            'Unable to load the open purchase orders.'
                        )
                    );
                }
            });
    }

    private buildOrderItems():
        void
    {
        this.orderItems =
            this.openOrders.map
            (
                x =>
                ({
                    label:`${x.OrderNo} || ${this.displayDate(x.OrderDate)} · ${x.Status} · ${this.money(x.TotalPayable)}`,
                    value:x.PurchaseOrderId
                })
            );

        if
        (
            this.orderId
            &&
            !this.orderItems.some(x => x.value === this.orderId)
        )
        {
            this.orderItems =
            [
                {
                    label:this.order?.OrderNo || `Order ${this.orderId}`,
                    value:this.orderId
                },
                ...this.orderItems
            ];
        }
    }

    // The order picked
    get selectedOrder():
        PurchaseOpenOrder | null
    {
        return this.openOrders.find(x => x.PurchaseOrderId === this.orderId)
            ??
            null;
    }

    // The PO line of a purchase line (null : direct, or not loaded)
    poLineOf
    (
        purchaseOrderLineId:
            number | null | undefined
    ):
        PurchaseOpenOrderLine | null
    {
        if
        (
            !purchaseOrderLineId
        )
        {
            return null;
        }

        return this.selectedOrder?.Lines.find(x => x.PurchaseOrderLineId === purchaseOrderLineId)
            ??
            null;
    }

    // PO line of the product being picked
    private get pickedPoLine():
        PurchaseOpenOrderLine | null
    {
        return this.selectedOrder?.Lines.find(x => x.ProductCode === this.productCode)
            ??
            null;
    }

    // Quantity (with free) this purchase may still take of a PO line
    poLeft
    (
        purchaseOrderLineId:
            number | null | undefined
    ):
        number | null
    {
        const poLine =
            this.poLineOf(purchaseOrderLineId);

        return poLine
            ? poLine.Remaining
            : null;
    }

    onOrderChange
    (
        value:
            number | null
    ):
        void
    {
        const next =
            value
            ??
            null;

        if
        (
            next === this.orderId
            ||
            this.isReadonly
        )
        {
            return;
        }

        const apply =
            ():
                void =>
            {
                this.orderId =
                    next;

                this.resetPicker();

                this.fillFromOrder();

                this.reprice();

                this.buildCategoryItems();

                this.checkForChanges();
            };

        if
        (
            this.lines.length === 0
        )
        {
            apply();

            return;
        }

        const previous =
            this.orderId;

        this.orderId =
            next;

        this.confirmDialog.open(
            'Change Purchase Order',
            `The ${this.lines.length} line${this.lines.length === 1 ? '' : 's'} on this purchase will be replaced by the lines left on the new order. Continue?`,
            () =>
            {
                this.orderId =
                    previous;

                apply();
            },
            'Replace Lines',
            'Keep Order',
            'danger',
            () =>
            {
                this.orderId =
                    null;

                setTimeout(
                    () =>
                    {
                        this.orderId =
                            previous;
                    }
                );
            }
        );
    }

    // The order's terms and every line with quantity left
    private fillFromOrder():
        void
    {
        const order =
            this.selectedOrder;

        if
        (
            !order
        )
        {
            this.lines =
                [];

            return;
        }

        this.priceIncludesVat =
            order.PriceIncludesVat;

        this.invoicePriceBasis =
            order.InvoicePriceBasis === 'MRP' && this.mrpPricing ? 'MRP' : 'DP';

        this.defaultProfitText =
            this.marginMode && order.DefaultProfitPercent
                ? String(order.DefaultProfitPercent)
                : '';

        this.discountType =
            order.AdditionalDiscountType === 'Percent' || order.AdditionalDiscountType === 'Amount'
                ? order.AdditionalDiscountType
                : 'None';

        this.discountValueText =
            order.AdditionalDiscountValue ? String(order.AdditionalDiscountValue) : '';

        if
        (
            this.applicability.PurchaseVatApplicable
        )
        {
            this.noVatInvoice =
                order.NoVatInvoice;
        }

        const products =
            new Map(
                (this.defaults?.Products ?? []).map(x => [x.ProductCode, x] as const)
            );

        this.lines =
            order.Lines
                .filter(x => x.Remaining > 0)
                .map
                (
                    x =>
                    {
                        const free =
                            this.freeGoodsAllowed
                                ? Math.min(x.FreeQuantity, x.Remaining)
                                : 0;

                        const quantity =
                            x.Remaining - free > 0
                                ? x.Remaining - free
                                : x.Remaining;

                        const product =
                            products.get(x.ProductCode);

                        const line:
                            PurchaseLine =
                        {
                            LineNo:0,
                            PurchaseOrderLineId:x.PurchaseOrderLineId,
                            Units:[],
                            ProductType:x.ProductType || product?.ProductType || '',
                            ProductId:x.ProductId,
                            ProductCode:x.ProductCode,
                            ProductName:x.ProductName,
                            Unit:x.Unit,
                            Quantity:quantity,
                            FreeQuantity:quantity === x.Remaining ? 0 : free,
                            Mrp:this.showMrp ? x.Mrp : 0,
                            ProfitPercent:this.marginMode ? x.ProfitPercent : 0,
                            UnitPrice:x.UnitPrice,
                            IsAdjusted:true,
                            IsTotalTyped:false,
                            GrossMrp:0,
                            DpAmount:0,
                            ProfitAmount:0,
                            DiscountShare:0,
                            NetAmount:0,
                            VatRate:x.VatRate,
                            VatClaimable:true,
                            Amount:0,
                            VatAmount:0,
                            LineTotal:0,
                            RoundingShare:0,
                            NetUnitCost:0,
                            BilledQuantity:0,
                            ShortNotes:''
                        };

                        return line;
                    }
                );
    }


    onPriceEntryChange
    (
        value:
            boolean
    ):
        void
    {
        if
        (
            this.isReadonly
            ||
            value === this.priceIncludesVat
        )
        {
            return;
        }

        // An MRP invoice is always VAT Inclusive
        if
        (
            this.invoicePriceBasis === 'MRP'
            &&
            value !== true
        )
        {
            return;
        }

        this.priceIncludesVat =
            value === true;

        // Same typed prices, amounts worked out the other way
        this.checkForChanges();
    }

    //===========================================================
    // VAT applicability (VAT Management switches, PO date)
    //===========================================================

    private loadApplicability():
        void
    {
        const request =
            ++this.applicabilityRequest;

        this.purchasesService
            .getVatApplicability(
                this.pageType,
                toIsoDate(this.orderDateValue)
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    item
                ):
                    void =>
                {
                    if
                    (
                        request !== this.applicabilityRequest
                    )
                    {
                        return;
                    }

                    this.applicability =
                        item;

                    if
                    (
                        !item.PurchaseVatApplicable
                    )
                    {
                        this.noVatInvoice =
                            false;
                    }

                    // A saved draft whose VAT terms changed since
                    this.vatTermsChanged =
                        this.order
                        &&
                        this.isEditable
                        &&
                        (
                            this.order.PurchaseVatApplicable !== item.PurchaseVatApplicable
                            ||
                            this.order.SalesVatApplicable !== item.SalesVatApplicable
                        )
                            ? 'VAT applicability changed since this draft was saved; saving applies the current terms.'
                            : '';

                    if
                    (
                        this.isEditable
                        &&
                        this.lines.length > 0
                    )
                    {
                        this.checkForChanges();
                    }

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.warn(
                        'VAT applicability could not be read; VAT applies',
                        error
                    );
                }
            });
    }

    // Purchase VAT applicable (saved value on a read-only order)
    get purchaseVatOn():
        boolean
    {
        return this.isEditable || !this.order
            ? this.applicability.PurchaseVatApplicable
            : this.order.PurchaseVatApplicable;
    }

    // VAT on this order
    get vatCharged():
        boolean
    {
        return this.isEditable || !this.order
            ? this.applicability.PurchaseVatApplicable && !this.noVatInvoice
            : this.order.VatCharged;
    }

    // Claimable : charged, Sales VAT applicable, rule allows credit
    private claimableFor
    (
        productType:
            string
    ):
        boolean
    {
        return this.vatCharged
            &&
            this.applicability.SalesVatApplicable
            &&
            (this.inputCredit.get(productType) ?? true);
    }

    get anyVatInCost():
        boolean
    {
        return this.vatCharged
            &&
            this.lines.some(x => !x.VatClaimable);
    }

    get priceMode():
        string
    {
        return this.noVatInvoice
            ? 'none'
            : this.priceIncludesVat
                ? 'incl'
                : 'excl';
    }

    onPriceModeChange
    (
        value:
            string
    ):
        void
    {
        if
        (
            this.isReadonly
            ||
            value === this.priceMode
        )
        {
            return;
        }

        // MRP invoice : Excl. VAT is disabled (MRP includes VAT)
        if
        (
            value === 'excl'
            &&
            this.invoicePriceBasis === 'MRP'
        )
        {
            return;
        }

        this.noVatInvoice =
            value === 'none';

        this.priceIncludesVat =
            value !== 'excl';

        this.checkForChanges();
    }

    // Pricing Terms notes (VAT applicability)
    get vatTermsNote():
        { text:string; warn:boolean } | null
    {
        if
        (
            !this.isEditable
        )
        {
            return null;
        }

        if
        (
            this.vatTermsChanged
        )
        {
            return {
                text:this.vatTermsChanged,
                warn:true
            };
        }

        if
        (
            !this.applicability.PurchaseVatApplicable
        )
        {
            return {
                text:`No VAT on this purchase : suppliers don't charge VAT on ${this.page.goods}${this.applicability.PurchaseSince ? ' (from ' + this.displayDate(this.applicability.PurchaseSince) + ')' : ''}.`,
                warn:false
            };
        }

        if
        (
            !this.vatCharged
        )
        {
            return null;
        }

        if
        (
            !this.applicability.SalesVatApplicable
        )
        {
            return {
                text:`VAT on this purchase is a cost : it can't be claimed back and is added to the stock cost. Reason : ${this.page.goods} are sold without VAT${this.applicability.SalesSince ? ' from ' + this.displayDate(this.applicability.SalesSince) : ''}.`,
                warn:false
            };
        }

        // Purchase VAT rule with no input credit for a type
        const noCredit =
            [...this.inputCredit]
                .filter(([, credit]) => !credit)
                .map(([type]) => type);

        if
        (
            noCredit.length > 0
        )
        {
            return {
                text:`VAT on ${noCredit.join(' / ')} in this purchase is a cost : the Purchase VAT rule allows no input credit, so it is added to the stock cost.`,
                warn:false
            };
        }

        return {
            text:'VAT on this purchase is claimable as input VAT.',
            warn:false
        };
    }

    // The VAT notice as a chip on the Pricing Terms line; the full
    // text shows as its tip. A changed-terms warning stays a row.
    get vatChip():
        { label:string; tone:'claim' | 'cost' | 'none'; tip:string } | null
    {
        const note =
            this.vatTermsNote;

        if
        (
            !note
            ||
            note.warn
        )
        {
            return null;
        }

        if
        (
            !this.applicability.PurchaseVatApplicable
        )
        {
            // The line already says No VAT : only the tip
            return {
                label:'',
                tone:'none',
                tip:note.text
            };
        }

        const claimable =
            this.applicability.SalesVatApplicable
            &&
            ![...this.inputCredit].some(([, credit]) => !credit);

        return {
            label:claimable ? 'VAT claimable' : 'VAT in cost',
            tone:claimable ? 'claim' : 'cost',
            tip:note.text
        };
    }

    // The VAT rate notice as a tip on VAT % (a warning stays a row)
    get vatRateTip():
        string
    {
        return this.vatMessage && this.isEditable && this.vatCharged && !this.vatWarn
            ? this.vatMessage
            : '';
    }

    //===========================================================
    // Pricing terms (header)
    //===========================================================

    onInvoicePriceChange
    (
        value:
            PurchaseOrderInvoicePrice
    ):
        void
    {
        if
        (
            this.isReadonly
            ||
            value === this.invoicePriceBasis
        )
        {
            return;
        }

        this.invoicePriceBasis =
            value === 'MRP' ? 'MRP' : 'DP';

        // MRP includes VAT
        if
        (
            this.invoicePriceBasis === 'MRP'
        )
        {
            this.priceIncludesVat =
                true;
        }

        // DP invoice : no margin, the DP stays as typed. MRP
        // invoice : the margin is read from MRP and DP.
        const margin =
            this.marginMode;

        this.lines =
            this.lines.map
            (
                line =>
                ({
                    ...line,
                    ProfitPercent:
                        margin && line.Mrp > 0
                            ? poProfitFrom(line.Mrp, line.UnitPrice, 'MRP')
                            : 0,
                    IsAdjusted:
                        margin
                            ? line.IsAdjusted
                            : true
                })
            );

        // MRP invoice without a margin : the supplier's latest one
        this.fillLastMargin();

        if
        (
            margin
            &&
            this.profitText.trim() === ''
        )
        {
            this.profitText =
                this.defaultProfitText;
        }

        this.checkForChanges();
    }

    // Margin % only on an MRP invoice (SP / AC) : the supplier
    // bills MRP less its margin. A DP invoice has no margin.
    get marginMode():
        boolean
    {
        return this.mrpPricing && this.invoicePriceBasis === 'MRP';
    }

    // MRP is only on an MRP invoice (the DP is worked out of it);
    // a DP invoice has no MRP - selling prices are the Pricing
    // page's
    get showMrp():
        boolean
    {
        return this.marginMode;
    }

    // The deal stays the same : DP is kept, the profit % is told
    // on the other basis (25% on DP = 20% on MRP)
    onProfitBasisChange
    (
        value:
            PurchaseOrderProfitBasis
    ):
        void
    {
        if
        (
            this.isReadonly
            ||
            value === this.profitBasis
        )
        {
            return;
        }

        const from =
            this.profitBasis;

        const to:
            PurchaseOrderProfitBasis =
            value === 'DP' ? 'DP' : 'MRP';

        this.profitBasis =
            to;

        this.lines =
            this.lines.map
            (
                line =>
                ({
                    ...line,
                    ProfitPercent:
                        line.Mrp > 0
                            ? poProfitFrom(line.Mrp, line.UnitPrice, to)
                            : poConvertProfit(line.ProfitPercent, from, to)
                })
            );

        const fallback =
            this.parseNumber(this.defaultProfitText);

        if
        (
            this.defaultProfitText.trim()
        )
        {
            this.defaultProfitText =
                this.numberText(poConvertProfit(fallback, from, to));
        }

        if
        (
            this.profitText.trim()
        )
        {
            this.profitText =
                this.numberText(poConvertProfit(this.parseNumber(this.profitText), from, to));
        }

        this.checkForChanges();
    }

    //===========================================================
    // Supplier terms (Supplier Profile)
    //
    // Picking a supplier takes its terms : Prices (Incl / Excl /
    // No VAT), Invoice Price, Profit On, Default Profit % (a term
    // not set keeps the page's own). Switch "Edit Supplier Terms"
    // OFF : the terms the supplier has are fixed on the order
    // (each line's Profit % stays editable).
    //===========================================================

    // Pricing Terms : one summary line; Change opens the controls
    termsOpen:
        boolean =
        false;

    private get supplierOption():
        PurchaseOrderSupplierOption | undefined
    {
        return (this.defaults?.Suppliers ?? [])
            .find(x => x.SupplierCode === this.supplierCode);
    }

    // The picked supplier's terms ('' / null = not set)
    get supplierTerms():
        {
            priceMode:string;
            invoice:'' | PurchaseOrderInvoicePrice;
            profitOn:'' | PurchaseOrderProfitBasis;
            profitPercent:number | null;
        } | null
    {
        const supplier =
            this.supplierOption;

        if
        (
            !supplier
        )
        {
            return null;
        }

        const entry =
            String(supplier.DefaultPriceEntry ?? '');

        const invoice =
            String(supplier.DefaultInvoicePrice ?? '');

        return {
            priceMode:
                entry === 'Incl'
                    ? 'incl'
                    : entry === 'Excl'
                        ? 'excl'
                        : entry === 'None'
                            ? 'none'
                            : '',
            invoice:
                this.mrpPricing && (invoice === 'DP' || invoice === 'MRP')
                    ? invoice
                    : '',
            // A margin is always on MRP
            profitOn:
                '',
            // Margin % on MRP only (a Profit % on DP is the Pricing
            // page's, never a purchase term)
            profitPercent:
                this.mrpPricing
                &&
                supplier.DefaultProfitOn !== 'DP'
                &&
                supplier.DefaultProfitPercent !== null
                &&
                supplier.DefaultProfitPercent !== undefined
                    ? supplier.DefaultProfitPercent
                    : null
        };
    }

    // Switch "Edit Supplier Terms" OFF
    private get termsFixed():
        boolean
    {
        return !switchOn(this.switches, this.page.switches.EDIT_SUPPLIER_TERMS, true);
    }

    // A term is locked when it is fixed and the supplier has it
    get priceLocked():
        boolean
    {
        return this.termsFixed && !!this.supplierTerms?.priceMode;
    }

    get invoiceLocked():
        boolean
    {
        return this.termsFixed && !!this.supplierTerms?.invoice;
    }

    get profitLocked():
        boolean
    {
        return this.termsFixed
               &&
               this.supplierTerms?.profitPercent !== null
               &&
               this.supplierTerms?.profitPercent !== undefined;
    }

    get anyTermLocked():
        boolean
    {
        return this.priceLocked || this.invoiceLocked || this.profitLocked;
    }

    // Summary line : "Incl. VAT · DP invoice · 20% on DP"
    get termsSummary():
        string[]
    {
        const parts:
            string[] =
            [];

        parts.push(
            !this.purchaseVatOn
                ? 'No VAT'
                : this.priceMode === 'none'
                    ? 'No VAT'
                    : this.priceIncludesVat
                        ? 'Incl. VAT'
                        : 'Excl. VAT'
        );

        if
        (
            this.mrpPricing
        )
        {
            parts.push(
                this.invoicePriceBasis === 'MRP'
                    ? 'MRP invoice'
                    : 'DP invoice'
            );

            // Margin : MRP invoice only
            if
            (
                this.marginMode
            )
            {
                const profit =
                    this.defaultProfitText.trim();

                parts.push(
                    profit
                        ? `${profit}% margin`
                        : 'Margin not set'
                );
            }
        }

        return parts;
    }

    // Where the terms came from (summary line)
    get termsSource():
        string
    {
        if
        (
            !this.supplierCode
        )
        {
            return 'Pick a supplier : its terms fill in.';
        }

        const terms =
            this.supplierTerms;

        const has =
            !!terms
            &&
            (
                !!terms.priceMode
                ||
                !!terms.invoice
                ||
                !!terms.profitOn
                ||
                terms.profitPercent !== null
            );

        if
        (
            !has
        )
        {
            return 'This supplier has no terms : set them on the Supplier Profile.';
        }

        return this.anyTermLocked
            ? 'Supplier terms (fixed)'
            : 'Supplier terms';
    }

    toggleTerms():
        void
    {
        this.termsOpen =
            !this.termsOpen;
    }

    // Notice under Pricing Terms when the terms are fixed
    get profitNote():
        string
    {
        if
        (
            !this.isEditable
            ||
            !this.supplierCode
            ||
            !this.defaults
            ||
            !this.anyTermLocked
        )
        {
            return '';
        }

        return this.mrpPricing
            ? 'The supplier\'s terms are fixed (System Configuration › Edit Supplier Terms).' + (this.marginMode ? ' Each line\'s Margin % can still be changed.' : '')
            : 'The supplier\'s Prices are fixed (System Configuration › Edit Supplier Terms).';
    }

    // Takes the supplier's terms.
    // pick = true : a supplier was just picked (always taken);
    // false : only the fixed ones that differ (a draft opened)
    private syncSupplierTerms
    (
        pick:
            boolean
    ):
        void
    {
        if
        (
            this.isReadonly
            ||
            !this.isEditable
        )
        {
            return;
        }

        const terms =
            this.supplierTerms;

        if
        (
            !terms
            ||
            (!pick && !this.anyTermLocked)
        )
        {
            return;
        }

        // Invoice Price first (an MRP invoice is always VAT inclusive)
        if
        (
            terms.invoice
            &&
            terms.invoice !== this.invoicePriceBasis
            &&
            (pick || this.invoiceLocked)
        )
        {
            this.onInvoicePriceChange(terms.invoice);
        }

        if
        (
            terms.priceMode
            &&
            this.purchaseVatOn
            &&
            terms.priceMode !== this.priceMode
            &&
            (pick || this.priceLocked)
        )
        {
            this.onPriceModeChange(terms.priceMode);
        }

        if
        (
            terms.profitOn
            &&
            terms.profitOn !== this.profitBasis
            &&
            (pick || this.profitLocked)
        )
        {
            this.onProfitBasisChange(terms.profitOn);
        }

        if
        (
            terms.profitPercent !== null
            &&
            roundMoney(parseMoney(this.defaultProfitText)) !== terms.profitPercent
            &&
            (pick || this.profitLocked)
        )
        {
            this.onDefaultProfitText(this.numberText(terms.profitPercent));
        }

        // No margin from the supplier : its latest one on a PO / purchase
        this.fillLastMargin();
    }

    onDefaultProfitText
    (
        value:
            string | number
    ):
        void
    {
        const previous =
            this.defaultProfitText;

        this.defaultProfitText =
            String(value ?? '');

        // The line being added follows the default while its
        // Profit % is empty or still the old default, and its DP /
        // line total were not typed (it stays editable)
        if
        (
            !this.isReadonly
            &&
            this.editingIndex === null
            &&
            !this.dpTyped
            &&
            !this.totalTyped
            &&
            (
                this.profitText.trim() === ''
                ||
                this.profitText === previous
            )
        )
        {
            this.profitText =
                this.defaultProfitText;

            this.recalcPicker('profit');
        }

        this.checkForChanges();
    }

    // Every line takes the Default Profit % (DP worked out again
    // from the MRP; a line without MRP keeps its DP)
    applyProfitToAll():
        void
    {
        if
        (
            this.isReadonly
            ||
            this.lines.length === 0
        )
        {
            return;
        }

        const percent =
            poRound(this.parseNumber(this.defaultProfitText), 2);

        const problem =
            this.profitProblem(percent, 'Default Profit %');

        if
        (
            problem
        )
        {
            this.toast.warning(
                'Apply to all lines',
                problem
            );

            return;
        }

        this.lines =
            this.lines.map
            (
                line =>
                    line.Mrp > 0
                        ? {
                            ...line,
                            ProfitPercent:percent,
                            UnitPrice:poDpFromMrp(line.Mrp, percent, this.profitBasis),
                            IsAdjusted:false,
                            IsTotalTyped:false
                        }
                        : {
                            ...line,
                            ProfitPercent:percent
                        }
            );

        if
        (
            this.editingIndex !== null
        )
        {
            this.resetPicker();
        }

        this.checkForChanges();
    }

    onDiscountTypeChange
    (
        value:
            PurchaseOrderDiscountType
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

        this.discountType =
            value === 'Percent' || value === 'Amount' ? value : 'None';

        if
        (
            this.discountType === 'None'
        )
        {
            this.discountValueText =
                '';
        }

        this.checkForChanges();
    }

    onDiscountValueText
    (
        value:
            string | number
    ):
        void
    {
        this.discountValueText =
            String(value ?? '');

        this.checkForChanges();
    }

    private profitProblem
    (
        percent:
            number,
        label:
            string
    ):
        string
    {
        if
        (
            percent < 0
        )
        {
            return `${label} cannot be negative.`;
        }

        if
        (
            this.profitBasis === 'MRP'
            &&
            percent >= 100
        )
        {
            return `${label} on MRP must be less than 100%.`;
        }

        if
        (
            this.profitBasis === 'DP'
            &&
            percent > 999.99
        )
        {
            return `${label} on DP cannot be more than 999.99%.`;
        }

        return '';
    }

    private parseNumber
    (
        text:
            string
    ):
        number
    {
        return parseMoney(text);
    }

    // '' for 0, otherwise the plain number
    private numberText
    (
        value:
            number
    ):
        string
    {
        return value
            ? String(value)
            : '';
    }

    //===========================================================
    // Last terms (MRP : any supplier ; profit : this supplier)
    //===========================================================

    private loadLastTerms():
        void
    {
        const request =
            ++this.lastTermsRequest;

        this.purchasesService
            .getLastTerms(this.supplierCode)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    rows
                ):
                    void =>
                {
                    if
                    (
                        request !== this.lastTermsRequest
                    )
                    {
                        return;
                    }

                    this.lastTerms =
                        new Map(rows.map(x => [x.ProductCode, x] as const));

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.warn(
                        'Last prices could not be loaded',
                        error
                    );
                }
            });
    }

    // Hint under the picker : last MRP of the item
    get mrpHint():
        { text:string; warn:boolean } | null
    {
        if
        (
            !this.showMrp
            ||
            !this.productCode
            ||
            this.isReadonly
        )
        {
            return null;
        }

        const terms =
            this.lastTerms.get(this.productCode);

        const typed =
            poRound(this.parseNumber(this.mrpText), 2);

        if
        (
            !terms
            ||
            !(terms.LastMrp > 0)
        )
        {
            return {
                text:'No MRP on any order yet : type it.',
                warn:false
            };
        }

        if
        (
            typed > 0
            &&
            typed !== terms.LastMrp
        )
        {
            return {
                text:`MRP was ${this.money(terms.LastMrp)} on ${terms.LastMrpOrderNo}. Check the change.`,
                warn:true
            };
        }

        return {
            text:`Last MRP ${this.money(terms.LastMrp)} (${terms.LastMrpOrderNo}).`,
            warn:false
        };
    }

    onSupplierChange
    (
        value:
            string | null
    ):
        void
    {
        const previous =
            this.supplierCode;

        const next =
            value
            ??
            '';

        if
        (
            next === previous
        )
        {
            return;
        }

        // PO Required : the lines belong to the old supplier's order
        if
        (
            this.poRequired
            &&
            this.lines.length > 0
        )
        {
            this.supplierCode =
                next;

            this.confirmDialog.open(
                'Change Supplier',
                `The ${this.lines.length} line${this.lines.length === 1 ? '' : 's'} came from ${this.selectedOrder?.OrderNo ?? 'the order'} of the old supplier and will be removed. Continue?`,
                () =>
                {
                    this.resetPicker();

                    this.lines =
                        [];

                    this.applySupplier(next);
                },
                'Remove Lines',
                'Keep Supplier',
                'danger',
                () =>
                {
                    this.supplierCode =
                        '';

                    setTimeout(
                        () =>
                        {
                            this.supplierCode =
                                previous;
                        }
                    );
                }
            );

            return;
        }

        // Lines of another brand than the new supplier's
        const brandId =
            this.brandOfSupplier(next);

        const products =
            new Map(
                (this.defaults?.Products ?? []).map(x => [x.ProductCode, x] as const)
            );

        const misfits =
            this.lines.filter
            (
                line =>
                    !this.fitsBrand(products.get(line.ProductCode), brandId)
            );

        if
        (
            misfits.length === 0
        )
        {
            this.applySupplier(next);

            return;
        }

        const brandName =
            (this.defaults?.Suppliers ?? [])
                .find(x => x.SupplierCode === next)
                ?.BrandName
            ||
            'its brand';

        // Show the new choice while asking; put the old one back
        // when the user keeps the lines
        this.supplierCode =
            next;

        this.confirmDialog.open(
            'Change Supplier',
            `This supplier supplies ${brandName} only. ${misfits.length} line${misfits.length === 1 ? '' : 's'} of another brand (${misfits.map(x => x.ProductName).join(', ')}) will be removed. Continue?`,
            () =>
            {
                const removed =
                    new Set(misfits.map(x => x.ProductCode));

                this.resetPicker();

                this.lines =
                    this.lines.filter(x => !removed.has(x.ProductCode));

                this.applySupplier(next);
            },
            'Remove Lines',
            'Keep Supplier',
            'danger',
            () =>
            {
                this.supplierCode =
                    '';

                setTimeout(
                    () =>
                    {
                        this.supplierCode =
                            previous;
                    }
                );
            }
        );
    }

    // Supplier set : the Add lists follow its brand
    private applySupplier
    (
        supplierCode:
            string
    ):
        void
    {
        this.supplierCode =
            supplierCode;

        // A new supplier : its own open orders
        this.orderId =
            null;

        this.loadOpenOrders();

        // Mushak No is per supplier
        this.queueMushakCheck();

        this.loadLastTerms();

        // "No VAT on this invoice" follows the supplier's last order
        if
        (
            this.applicability.PurchaseVatApplicable
        )
        {
            this.noVatInvoice =
                (this.defaults?.Suppliers ?? [])
                    .find(x => x.SupplierCode === supplierCode)
                    ?.LastNoVatInvoice
                ??
                false;
        }

        // The supplier's terms (Supplier Profile) decide
        this.syncSupplierTerms(true);

        // A supplier with no terms : its latest margin still applies
        this.fillLastMargin();

        this.lineError =
            '';

        if
        (
            this.categoryId !== null
            &&
            !this.activeProducts.some(x => x.CategoryId === this.categoryId)
        )
        {
            this.categoryId =
                null;
        }

        this.buildCategoryItems();

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
    // Add Spare Part / Lubricant events
    //===========================================================

    onCategoryChange
    (
        value:
            number | null
    ):
        void
    {
        this.categoryId =
            value
            ??
            null;

        this.lineError =
            '';

        this.buildSubCategoryItems();
    }

    onSubCategoryChange
    (
        value:
            number | null
    ):
        void
    {
        this.subCategoryId =
            value
            ??
            null;

        this.lineError =
            '';

        this.buildProductItems();
    }

    onProductChange
    (
        value:
            string | null
    ):
        void
    {
        this.productCode =
            value
            ??
            '';

        this.lineError =
            '';

        // The product sets its own Category and Sub-Category, so
        // both lists narrow to it (the product stays selected)
        const product =
            this.activeProducts.find(x => x.ProductCode === this.productCode);

        if
        (
            product
            &&
            (
                this.categoryId !== (product.CategoryId || null)
                ||
                this.subCategoryId !== (product.SubCategoryId || null)
            )
        )
        {
            this.categoryId =
                product.CategoryId || null;

            this.subCategoryId =
                product.SubCategoryId || null;

            this.buildSubCategoryItems();
        }

        // Prefill : last MRP (any supplier), this supplier's last
        // profit % told on this order's basis, else the default
        if
        (
            product
            &&
            this.editingIndex === null
        )
        {
            const terms =
                this.lastTerms.get(product.ProductCode);

            // Quantity : the suggestion when the item needs ordering
            const suggested =
                this.stockPosition(product.ProductCode)?.suggested ?? 0;

            this.quantityText =
                suggested > 0
                    ? String(suggested)
                    : '';

            this.mrpText =
                terms && terms.LastMrp > 0
                    ? String(terms.LastMrp)
                    : '';

            this.profitText =
                terms?.HasProfit
                    ? String(poConvertProfit(terms.ProfitPercent, terms.ProfitBasis, this.profitBasis))
                    : this.defaultProfitText;

            this.unitPriceText =
                '';

            this.totalText =
                '';

            this.dpTyped =
                false;

            this.totalTyped =
                false;

            this.mrpAuto =
                false;

            this.profitAuto =
                false;

            this.dpAuto =
                false;

            this.recalcPicker('profit');
        }
    }

    //===========================================================
    // Picker prices : any two of MRP / Profit % / DP give the
    // third; a typed DP or line total is kept as typed
    //===========================================================

    private recalcPicker
    (
        source:
            'mrp' | 'profit' | 'dp' | 'qty' | 'total'
    ):
        void
    {
        let dp =
            poRound(this.parseNumber(this.unitPriceText), 4);

        const quantity =
            this.parseNumber(this.quantityText);

        // MB / DP invoice : unit price only; no MRP or margin
        if
        (
            !this.showMrp
        )
        {
            this.mrpText =
                '';

            this.profitText =
                '';
        }

        switch
        (
            source
        )
        {
            case 'mrp':
            case 'profit':
            case 'dp':
            {
                if
                (
                    source === 'dp'
                )
                {
                    this.totalTyped =
                        false;
                }

                dp =
                    this.derivePrices(source);

                break;
            }

            case 'total':
            case 'qty':
            {
                if
                (
                    source === 'total'
                )
                {
                    this.totalTyped =
                        this.totalText.trim() !== '';
                }

                const total =
                    poRound(this.parseNumber(this.totalText), 2);

                if
                (
                    this.totalTyped
                    &&
                    quantity > 0
                    &&
                    total > 0
                )
                {
                    this.unitPriceText =
                        this.numberText(poRound(total / quantity, 4));

                    // DP from the line total counts as typed
                    this.dpAuto =
                        false;

                    dp =
                        this.derivePrices('dp');
                }

                break;
            }
        }

        if
        (
            !this.totalTyped
        )
        {
            this.totalText =
                quantity > 0 && dp > 0
                    ? this.numberText(poRound(dp * quantity, 2))
                    : '';
        }
    }

    //===========================================================
    // Any two TYPED of MRP / Profit % / DP give the third. A figure
    // the page filled in is never used to work out another one, so
    // typing 1, 10, 100 ... in one box keeps the others following.
    // Profit % is optional : with it empty, MRP and DP stay as
    // typed (Profit % is then shown from them).
    // Returns the DP now in the box.
    //===========================================================

    private derivePrices
    (
        source:
            'mrp' | 'profit' | 'dp'
    ):
        number
    {
        if
        (
            source === 'mrp'
        )
        {
            this.mrpAuto =
                false;
        }
        else if
        (
            source === 'profit'
        )
        {
            this.profitAuto =
                false;
        }
        else
        {
            this.dpAuto =
                false;
        }

        const mrp =
            poRound(this.parseNumber(this.mrpText), 2);

        const percent =
            poRound(this.parseNumber(this.profitText), 2);

        const dp =
            poRound(this.parseNumber(this.unitPriceText), 4);

        const hasMrp =
            this.showMrp
            &&
            !this.mrpAuto
            &&
            mrp > 0;

        const hasProfit =
            this.marginMode
            &&
            !this.profitAuto
            &&
            this.profitText.trim() !== '';

        const hasDp =
            !this.dpAuto
            &&
            dp > 0;

        // What to fill in (one figure at most)
        let fill:
            'mrp' | 'profit' | 'dp' | '' =
            '';

        if
        (
            hasMrp && hasProfit && hasDp
        )
        {
            // All three typed : the one not just typed follows
            fill =
                source === 'profit'
                    ? 'dp'
                    : 'profit';
        }
        else if
        (
            hasMrp && hasProfit
        )
        {
            fill =
                'dp';
        }
        else if
        (
            hasDp && hasProfit
        )
        {
            fill =
                'mrp';
        }
        else if
        (
            hasMrp && hasDp
        )
        {
            fill =
                'profit';
        }

        // A filled-in figure no longer backed by two typed ones
        // is cleared
        if
        (
            this.mrpAuto
            &&
            fill !== 'mrp'
        )
        {
            this.mrpText =
                '';

            this.mrpAuto =
                false;
        }

        if
        (
            this.profitAuto
            &&
            fill !== 'profit'
        )
        {
            this.profitText =
                '';

            this.profitAuto =
                false;
        }

        if
        (
            this.dpAuto
            &&
            fill !== 'dp'
        )
        {
            this.unitPriceText =
                '';

            this.dpAuto =
                false;

            this.totalTyped =
                false;
        }

        switch
        (
            fill
        )
        {
            case 'dp':
            {
                this.unitPriceText =
                    this.numberText(poDpFromMrp(mrp, percent, this.profitBasis));

                this.dpAuto =
                    true;

                this.totalTyped =
                    false;

                break;
            }

            case 'mrp':
            {
                this.mrpText =
                    this.numberText(poMrpFromDp(dp, percent, this.profitBasis));

                this.mrpAuto =
                    true;

                break;
            }

            case 'profit':
            {
                this.profitText =
                    this.numberText(poProfitFrom(mrp, dp, this.profitBasis));

                this.profitAuto =
                    true;

                break;
            }
        }

        // DP counts as typed only when the user typed it
        this.dpTyped =
            !this.dpAuto
            &&
            this.parseNumber(this.unitPriceText) > 0;

        return poRound(this.parseNumber(this.unitPriceText), 4);
    }

    onMrpText
    (
        value:
            string | number
    ):
        void
    {
        this.mrpText =
            String(value ?? '');

        this.lineError =
            '';

        this.recalcPicker('mrp');
    }

    onProfitText
    (
        value:
            string | number
    ):
        void
    {
        this.profitText =
            String(value ?? '');

        this.lineError =
            '';

        this.recalcPicker('profit');
    }

    onFreeText
    (
        value:
            string | number
    ):
        void
    {
        this.freeText =
            String(value ?? '');

        this.lineError =
            '';
    }

    onTotalText
    (
        value:
            string | number
    ):
        void
    {
        this.totalText =
            String(value ?? '');

        this.lineError =
            '';

        this.recalcPicker('total');
    }

    onQuantityText
    (
        value:
            string | number
    ):
        void
    {
        this.quantityText =
            String(value ?? '');

        this.lineError =
            '';

        this.recalcPicker('qty');
    }

    onUnitPriceText
    (
        value:
            string | number
    ):
        void
    {
        this.unitPriceText =
            String(value ?? '');

        this.lineError =
            '';

        this.recalcPicker('dp');
    }

    onVatTextChange
    (
        value:
            string | number
    ):
        void
    {
        this.vatText =
            String(value ?? '').trim();
    }

    onShortNotes
    (
        value:
            string | number
    ):
        void
    {
        this.shortNotes =
            String(value ?? '');
    }

    private resetPicker():
        void
    {
        this.productCode =
            '';

        this.quantityText =
            '';

        this.unitPriceText =
            '';

        this.mrpText =
            '';

        this.profitText =
            '';

        this.freeText =
            '';

        this.totalText =
            '';

        // Next line : the margin comes with the item (its last
        // margin, else the supplier's default shown as placeholder)
        this.profitText =
            '';

        this.dpTyped =
            false;

        this.totalTyped =
            false;

        this.mrpAuto =
            false;

        this.profitAuto =
            false;

        this.dpAuto =
            false;

        this.shortNotes =
            '';

        this.vatText =
            '';

        this.lineError =
            '';

        this.editingIndex =
            null;

        this.buildProductItems();
    }

    //===========================================================
    // Edit a line (double-click on the Order Summary row)
    //   The line loads into the left card; Add becomes Update.
    //===========================================================

    //===========================================================
    // Stock position of an item (company wide levels)
    //   available = stock (all branches) + on order (approved /
    //   placed orders not yet billed; drafts do not count)
    //   Red      : available <= Red Level
    //   Re-order : available <= Re-order Level
    //   Suggested: at / below Re-order -> Max - available;
    //              above it -> 0 (not needed yet)
    //   Room     : Max - available = the most this order may take
    //              (hard cap; the server checks it too)
    // Stock is not tracked until Product Receiving : it counts
    // as 0 and shows "—".
    //===========================================================

    stockPosition
    (
        code:
            string
    ):
        StockPosition | null
    {
        const item =
            (this.defaults?.Products ?? []).find(x => x.ProductCode === code);

        if
        (
            !item
        )
        {
            return null;
        }

        const stock =
            item.TotalStock;

        const available =
            poRound((stock ?? 0) + item.OnOrder, 2);

        const status:
            StockPosition['status'] =
            item.RedLevel > 0 && available <= item.RedLevel
                ? 'red'
                : item.ReorderLevel > 0 && available <= item.ReorderLevel
                    ? 'amber'
                    : item.ReorderLevel > 0
                        ? 'green'
                        : '';

        const suggested =
            item.ReorderLevel > 0 && item.MaxStockLevel > 0
                ? (available <= item.ReorderLevel ? Math.max(0, Math.ceil(item.MaxStockLevel - available)) : 0)
                : null;

        return {
            stock,
            onOrder:item.OnOrder,
            available,
            reorder:item.ReorderLevel,
            red:item.RedLevel,
            max:item.MaxStockLevel,
            status,
            statusText:
                status === 'red'
                    ? 'Below red level'
                    : status === 'amber'
                        ? 'At re-order level'
                        : status === 'green'
                            ? 'Above re-order level'
                            : 'Levels not set',
            suggested,
            room:
                item.MaxStockLevel > 0
                    ? Math.max(0, poRound(item.MaxStockLevel - available, 2))
                    : null
        };
    }

    // The picked item's position (Add card)
    get pickedStock():
        StockPosition | null
    {
        return this.productCode
            ? this.stockPosition(this.productCode)
            : null;
    }

    get stockText():
        string
    {
        const stock =
            this.pickedStock?.stock;

        return stock === null || stock === undefined
            ? ''
            : String(stock);
    }

    get reorderText():
        string
    {
        const level =
            this.pickedStock?.reorder ?? 0;

        return level > 0
            ? String(level)
            : '';
    }

    get suggestedText():
        string
    {
        const suggested =
            this.pickedStock?.suggested;

        return suggested === null || suggested === undefined
            ? ''
            : String(suggested);
    }

    // Line under the Add card : on order, max and what is left
    get stockNote():
        { text:string; tone:string } | null
    {
        const pos =
            this.pickedStock;

        if
        (
            !pos
            ||
            this.isReadonly
        )
        {
            return null;
        }

        const parts:
            string[] =
            [
                `On order ${pos.onOrder}`,
                pos.max > 0 ? `Max ${pos.max}` : 'Max not set',
            ];

        if
        (
            pos.room !== null
        )
        {
            parts.push(`at most ${pos.room} more`);
        }

        const lead =
            pos.status === 'green'
                ? 'Above re-order level : order not needed yet'
                : pos.statusText;

        return {
            text:`${lead} · ${parts.join(' · ')}`,
            tone:pos.status
        };
    }

    // Sub-line of an order line (Order Summary)
    lineStock
    (
        code:
            string
    ):
        { text:string; tone:string } | null
    {
        const pos =
            this.stockPosition(code);

        if
        (
            !pos
        )
        {
            return null;
        }

        return {
            text:`Stock ${pos.stock ?? '—'} · On order ${pos.onOrder}${pos.reorder > 0 ? ' · Re-order ' + pos.reorder : ''}`,
            tone:pos.status
        };
    }

    // Branch list (Total Stock) : shown on demand
    stockListOpen =
        false;

    // The picked item's stock by branch (📍 list)
    get stockBranches():
        PurchaseOrderStockBranch[]
    {
        const code =
            this.productCode;

        return code
            ? ((this.defaults?.Products ?? []).find(x => x.ProductCode === code)?.StockByBranch ?? [])
            : [];
    }

    stockBranchTotal
    (
        field:
            'InTransit' | 'OnHand'
    ):
        number
    {
        return this.stockBranches.reduce((t, x) => t + (x[field] || 0), 0);
    }

    toggleStockList():
        void
    {
        this.stockListOpen =
            !this.stockListOpen;
    }

    get isEditingLine():
        boolean
    {
        return this.editingIndex !== null;
    }

    // The Add <item> card opens once a supplier is picked
    get needsSupplier():
        boolean
    {
        return !this.isReadonly && !this.supplierCode;
    }

    get lineLocked():
        boolean
    {
        return this.isReadonly || !this.supplierCode;
    }

    get lineCardTitle():
        string
    {
        return this.editingIndex === null
            ? `Add ${this.page.item}`
            : `Edit Line ${this.editingIndex + 1}`;
    }

    startEdit
    (
        index:
            number
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

        const line =
            this.lines[index];

        if
        (
            !line
        )
        {
            return;
        }

        this.editingIndex =
            index;

        this.lineError =
            '';

        const product =
            this.activeProducts.find(x => x.ProductCode === line.ProductCode);

        this.categoryId =
            product?.CategoryId || null;

        this.subCategoryId =
            product?.SubCategoryId || null;

        // Rebuilds the lists with this line's product available again
        this.buildSubCategoryItems();

        this.productCode =
            product
                ? line.ProductCode
                : '';

        this.quantityText =
            String(line.Quantity);

        this.unitPriceText =
            String(line.UnitPrice);

        this.mrpText =
            this.numberText(line.Mrp);

        this.profitText =
            String(line.ProfitPercent);

        this.freeText =
            this.numberText(line.FreeQuantity);

        this.totalText =
            String(line.DpAmount);

        this.totalTyped =
            line.IsTotalTyped;

        this.dpTyped =
            line.IsAdjusted && !line.IsTotalTyped;

        // MRP invoice : DP is worked out from MRP and Margin % (read
        // only), so the margin box drives it
        if
        (
            this.marginMode
        )
        {
            this.dpTyped =
                false;

            this.totalTyped =
                false;
        }

        this.mrpAuto =
            false;

        this.profitAuto =
            false;

        this.dpAuto =
            false;

        this.shortNotes =
            line.ShortNotes;

        // VAT as per 6.3 : the line's VAT % comes back to the picker
        this.vatText =
            this.vatEditable
                ? String(line.VatRate)
                : '';

        if
        (
            !product
        )
        {
            this.lineError =
                `${line.ProductName} is no longer active. Pick another ${this.page.itemLower} or remove the line.`;
        }

        this.cdr.detectChanges();
    }

    //===========================================================
    // Product Shelf : pick several items at once. The products
    // are the Add card's (this supplier's, active); their start
    // figures come from the order line, else this supplier's last
    // order (DP told in this order's VAT mode) and the last MRP.
    //===========================================================

    shelfOpen =
        false;

    shelfError =
        '';

    shelfProducts:
        ShelfProduct[] =
        [];

    get shelfOptions():
        ShelfOptions
    {
        return {
            showMrp:this.showMrp,
            showMargin:this.marginMode,
            showFree:this.freeGoodsAllowed,
            mrpRequired:this.marginMode,
            priceWord:this.priceWord,
            itemWord:this.page.itemLower,
            itemsWord:this.page.items,
            icon:this.page.icon,
            docWord:'purchase'
        };
    }

    get shelfSubtitle():
        string
    {
        const supplier =
            this.supplierOption;

        return supplier
            ? `${supplier.DisplayName} · ${supplier.SupplierCode} — only this supplier's ${this.page.items}`
            : '';
    }

    openShelf():
        void
    {
        if
        (
            this.lineLocked
        )
        {
            return;
        }

        const lastDpText =
            (t:PurchaseOrderLastTerms | undefined): string =>
                t && t.LastDp > 0
                    ? `Last ${this.priceWord} ${this.money(t.LastDp)}${t.LastDpOrderNo ? ' · ' + t.LastDpOrderNo : ''}`
                    : 'No order from this supplier yet';

        const margin =
            this.defaultProfitText.trim() === ''
                ? null
                : roundMoney(parseMoney(this.defaultProfitText));

        this.shelfProducts =
            this.activeProducts.map
            (
                item =>
                {
                    const terms =
                        this.lastTerms.get(item.ProductCode);

                    const line =
                        this.lines.find(x => x.ProductCode === item.ProductCode);

                    const lastMrp =
                        this.showMrp && terms && terms.LastMrp > 0
                            ? terms.LastMrp
                            : 0;

                    // Last DP in this order's VAT mode
                    let dp =
                        terms && terms.LastDp > 0
                            ? terms.LastDp
                            : 0;

                    if
                    (
                        dp > 0
                        &&
                        terms
                        &&
                        terms.LastVatRate > 0
                        &&
                        terms.LastDpIncludesVat !== this.priceIncludesVat
                    )
                    {
                        dp =
                            this.priceIncludesVat
                                ? dp * (1 + terms.LastVatRate / 100)
                                : dp / (1 + terms.LastVatRate / 100);
                    }

                    dp =
                        poRound(dp, 2);

                    const lastMargin =
                        this.marginMode
                            ? (terms?.HasProfit ? terms.ProfitPercent : margin)
                            : null;

                    const pos =
                        this.stockPosition(item.ProductCode);

                    return {
                        code:item.ProductCode,
                        name:item.ProductName,
                        unit:item.Unit,
                        categoryId:item.CategoryId || null,
                        categoryName:item.CategoryName,
                        subCategoryId:item.SubCategoryId || null,
                        subCategoryName:item.SubCategoryName,
                        imageUrl:item.ImageUrl,
                        lastText:lastDpText(terms),
                        boughtBefore:!!terms && terms.LastDp > 0,
                        mrpText:
                            this.showMrp
                                ? (lastMrp > 0 ? `MRP ${this.money(lastMrp)}` : 'MRP —')
                                : '',
                        stockText:
                            pos
                                ? `Stock ${pos.stock ?? '—'} · On order ${pos.onOrder}${pos.reorder > 0 ? ' · Re-order ' + pos.reorder : ''}`
                                : '',
                        stockQty:pos ? pos.stock : undefined,
                        onOrderQty:pos ? pos.onOrder : undefined,
                        reorderLevel:pos ? pos.reorder : undefined,
                        stockTone:pos?.status ?? '',
                        room:pos?.room ?? null,
                        inOrderQty:line?.Quantity ?? 0,
                        start:
                            line
                                ? {
                                    qty:line.Quantity,
                                    free:line.FreeQuantity,
                                    mrp:line.Mrp,
                                    margin:this.marginMode ? line.ProfitPercent : null,
                                    dp:line.UnitPrice
                                }
                                : {
                                    // The suggestion when it needs ordering
                                    qty:pos?.suggested && pos.suggested > 0 ? pos.suggested : 0,
                                    free:0,
                                    mrp:lastMrp,
                                    margin:lastMargin,
                                    // MRP invoice : DP from MRP and margin
                                    dp:this.marginMode && lastMrp > 0 && lastMargin !== null ? 0 : dp
                                }
                    };
                }
            );

        this.shelfError =
            '';

        this.shelfOpen =
            true;
    }

    // Command center Shelf : says why when it cannot open yet
    onShelfCommand():
        void
    {
        if
        (
            this.isReadonly
        )
        {
            return;
        }

        if
        (
            !this.supplierCode
        )
        {
            this.toast.info(
                'Product Shelf',
                'Select a supplier first : the shelf shows that supplier\'s items.');

            return;
        }

        this.openShelf();
    }

    closeShelf():
        void
    {
        this.shelfOpen =
            false;

        this.shelfError =
            '';
    }

    // Each pick goes through the Add card's own checks (addLine);
    // a pick already on the order updates its line. All or none :
    // one problem puts the order back as it was.
    onShelfAdd
    (
        picks:
            ShelfPick[]
    ):
        void
    {
        // Lines on the record before : picks of these update them
        const onRecord =
            new Set(this.lines.map(x => x.ProductCode));

        if
        (
            this.isReadonly
            ||
            picks.length === 0
        )
        {
            return;
        }

        if
        (
            this.isEditingLine
        )
        {
            this.cancelEdit();
        }

        const before =
            this.lines;

        for
        (
            const pick of picks
        )
        {
            const index =
                this.lines.findIndex(x => x.ProductCode === pick.code);

            const existing =
                index >= 0
                    ? this.lines[index]
                    : null;

            this.editingIndex =
                index >= 0 ? index : null;

            this.productCode =
                pick.code;

            this.quantityText =
                String(pick.figures.qty);

            this.freeText =
                pick.figures.free > 0 ? String(pick.figures.free) : '';

            this.mrpText =
                pick.figures.mrp > 0 ? String(pick.figures.mrp) : '';

            this.profitText =
                pick.figures.margin !== null ? String(pick.figures.margin) : '';

            this.unitPriceText =
                String(pick.figures.dp);

            this.totalText =
                '';

            this.totalTyped =
                false;

            this.dpTyped =
                pick.dpTyped;

            this.mrpAuto =
                false;

            this.profitAuto =
                false;

            this.dpAuto =
                false;

            this.shortNotes =
                existing?.ShortNotes ?? '';

            this.lineError =
                '';

            this.addLine();

            if
            (
                this.lineError
            )
            {
                const name =
                    this.activeProducts.find(x => x.ProductCode === pick.code)?.ProductName ?? pick.code;

                this.shelfError =
                    `${name} : ${this.lineError}`;

                this.lines =
                    before;

                this.editingIndex =
                    null;

                this.resetPicker();

                this.checkForChanges();

                return;
            }
        }

        this.closeShelf();

        const updated =
            picks.filter(x => onRecord.has(x.code)).length;

        const added =
            picks.length - updated;

        this.toast.success(
            'From the Shelf',
            [
                added > 0 ? `${added} ${added === 1 ? this.page.itemLower : this.page.items} added` : '',
                updated > 0 ? `${updated} line${updated === 1 ? '' : 's'} updated` : ''
            ]
            .filter(x => !!x)
            .join(' · ') + ' on the purchase.');
    }

    cancelEdit():
        void
    {
        this.resetPicker();
    }

    //===========================================================
    // Add / Remove line
    //===========================================================

    // Add / Update pressed (button or Enter) : a problem also shows
    // as a toast, so it is seen even when the card has no room for
    // the message line
    onAddLine():
        void
    {
        this.addLine();

        if
        (
            this.lineError
        )
        {
            this.toast.warning(
                this.isEditingLine ? 'Line Not Updated' : 'Line Not Added',
                this.lineError
            );
        }
    }

    addLine():
        void
    {
        if
        (
            this.isReadonly
        )
        {
            return;
        }

        if
        (
            !this.supplierCode
        )
        {
            this.lineError =
                'Select a supplier first.';

            return;
        }

        // Switch "Max Lines" : a new line only while below the limit
        if
        (
            this.editingIndex === null
            &&
            this.maxLines > 0
            &&
            this.lines.length >= this.maxLines
        )
        {
            this.lineError =
                `A purchase can have at most ${this.maxLines} lines.`;

            return;
        }

        // PO Required : the order first
        if
        (
            this.poRequired
            &&
            !this.orderId
        )
        {
            this.lineError =
                'Select the Purchase Order first.';

            return;
        }

        const product =
            this.activeProducts.find(x => x.ProductCode === this.productCode);

        if
        (
            !product
        )
        {
            this.lineError =
                `Select ${this.page.itemArticle}.`;

            return;
        }

        const quantity =
            parseMoney(this.quantityText);

        if
        (
            !(quantity > 0)
            ||
            roundMoney(quantity) !== quantity
        )
        {
            this.lineError =
                'Quantity must be greater than zero, with at most 2 decimals.';

            return;
        }

        const freeQuantity =
            this.freeGoodsAllowed
                ? parseMoney(this.freeText)
                : 0;

        if
        (
            freeQuantity < 0
            ||
            roundMoney(freeQuantity) !== freeQuantity
        )
        {
            this.lineError =
                'Free Qty must be 0 or more, with at most 2 decimals.';

            return;
        }

        // The PO line of the product (null : direct purchase)
        const poLine =
            this.pickedPoLine;

        if
        (
            this.poRequired
            &&
            !poLine
        )
        {
            this.lineError =
                `${product.ProductName} is not on the Purchase Order.`;

            return;
        }

        // Never more than the order has left
        if
        (
            poLine
            &&
            quantity + freeQuantity > poLine.Remaining
        )
        {
            this.lineError =
                `At most ${poLine.Remaining} : the Purchase Order has ${poLine.Remaining} left of ${poLine.ProductName}.`;

            return;
        }

        // Max Stock Level : only on a direct purchase (a PO line was
        // checked when the order was made)
        const position =
            poLine
                ? null
                : this.stockPosition(product.ProductCode);

        if
        (
            position
            &&
            position.room !== null
            &&
            quantity + freeQuantity > position.room
        )
        {
            this.lineError =
                `At most ${position.room} : Max Stock Level ${position.max}, stock and orders already hold ${position.available}.`;

            return;
        }

        // MB / DP invoice : no MRP
        const mrp =
            this.showMrp
                ? roundMoney(parseMoney(this.mrpText))
                : 0;

        if
        (
            mrp < 0
        )
        {
            this.lineError =
                'MRP cannot be negative.';

            return;
        }

        if
        (
            this.invoicePriceBasis === 'MRP'
            &&
            !(mrp > 0)
        )
        {
            this.lineError =
                'MRP is required on an MRP invoice.';

            return;
        }

        // DP invoice : no margin
        const typedProfit =
            this.marginMode
                ? roundMoney(parseMoney(this.profitText))
                : 0;

        const profitProblem =
            this.profitProblem(typedProfit, 'Profit %');

        if
        (
            profitProblem
        )
        {
            this.lineError =
                profitProblem;

            return;
        }

        const typedTotal =
            roundMoney(parseMoney(this.totalText));

        if
        (
            this.totalTyped
            &&
            !(typedTotal > 0)
        )
        {
            this.lineError =
                'Line Total must be greater than zero.';

            return;
        }

        const unitPrice =
            this.totalTyped
                ? poRound(typedTotal / quantity, 4)
                : poRound(parseMoney(this.unitPriceText), 4);

        if
        (
            !(unitPrice > 0)
        )
        {
            this.lineError =
                'DP must be greater than zero.';

            return;
        }

        if
        (
            mrp > 0
            &&
            unitPrice > mrp
        )
        {
            this.lineError =
                'DP cannot be more than MRP.';

            return;
        }

        // Price Above PO : off = never above the PO price; on = within
        // the tolerance %
        if
        (
            poLine
            &&
            poLine.UnitPrice > 0
        )
        {
            const tolerance =
                this.priceAbovePo;

            const ceiling =
                poRound(poLine.UnitPrice * (1 + (tolerance ?? 0) / 100), 4);

            if
            (
                unitPrice > ceiling
            )
            {
                this.lineError =
                    tolerance === null
                        ? `DP cannot be above the PO price (${this.money(poLine.UnitPrice)}).`
                        : `DP cannot be more than ${tolerance}% above the PO price (at most ${this.money(ceiling)}).`;

                return;
            }
        }

        const adjusted =
            !this.marginMode
            ||
            this.dpTyped
            ||
            this.totalTyped
            ||
            (mrp > 0 && unitPrice !== poDpFromMrp(mrp, typedProfit, this.profitBasis));

        // VAT as per 6.3 : the VAT % typed (blank = the rule's rate)
        const typedVat =
            this.vatEditable && this.vatText !== ''
                ? roundMoney(parseMoney(this.vatText))
                : null;

        if
        (
            typedVat !== null
            &&
            (typedVat < 0 || typedVat > 100)
        )
        {
            this.lineError =
                'VAT % must be between 0 and 100.';

            return;
        }

        const rate =
            this.vatCharged
                ? (typedVat ?? this.rateFor(product.ProductType))
                : 0;

        if
        (
            rate === null
        )
        {
            this.lineError =
                'The Purchase VAT rate is still loading. Try again in a moment.';

            return;
        }

        const line:
            PurchaseLine =
                {
                    LineNo:0,
                    PurchaseOrderLineId:poLine?.PurchaseOrderLineId ?? null,
                    Units:[],
                    ProductType:product.ProductType,
                    ProductId:product.ProductId,
                    ProductCode:product.ProductCode,
                    ProductName:product.ProductName,
                    Unit:product.Unit,
                    Quantity:quantity,
                    FreeQuantity:freeQuantity,
                    Mrp:mrp,
                    ProfitPercent:
                        !this.marginMode
                            ? 0
                            : adjusted && mrp > 0
                                ? poProfitFrom(mrp, unitPrice, this.profitBasis)
                                : typedProfit,
                    UnitPrice:unitPrice,
                    IsAdjusted:adjusted,
                    IsTotalTyped:this.totalTyped,
                    GrossMrp:0,
                    DpAmount:this.totalTyped ? typedTotal : 0,
                    ProfitAmount:0,
                    DiscountShare:0,
                    NetAmount:0,
                    VatRate:rate,
                    VatClaimable:this.claimableFor(product.ProductType),
                    Amount:0,
                    VatAmount:0,
                    LineTotal:0,
                    RoundingShare:0,
                    NetUnitCost:0,
                    BilledQuantity:0,
                    ShortNotes:this.shortNotes.trim()
                };

        // One line per product (the server checks it too)
        if
        (
            this.takenProductCodes.has(line.ProductCode)
        )
        {
            this.lineError =
                `${line.ProductName} is already on the purchase.`;

            return;
        }

        const editing =
            this.editingIndex;

        if
        (
            editing !== null
        )
        {
            // Update in place : the line keeps its SL and billed qty
            this.lines =
                this.lines.map
                (
                    (x, i) =>
                        i === editing
                            ? { ...line, LineNo:x.LineNo, BilledQuantity:x.BilledQuantity, Units:x.Units.slice(0, Math.ceil(line.Quantity + line.FreeQuantity)) }
                            : x
                );
        }
        else
        {
            this.lines =
            [
                ...this.lines,
                line
            ];
        }

        this.resetPicker();

        this.checkForChanges();
    }

    removeLine
    (
        index:
            number
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

        if
        (
            index === this.editingIndex
        )
        {
            return;
        }

        this.lines =
            this.lines.filter((_, i) => i !== index);

        if
        (
            this.editingIndex !== null
            &&
            index < this.editingIndex
        )
        {
            this.editingIndex--;
        }

        // The removed product is offered again
        this.buildProductItems();

        this.checkForChanges();
    }

    // All lines priced again (terms, discount, VAT, rounding);
    // a saved order shown read-only keeps its saved figures
    private reprice():
        void
    {
        if
        (
            !this.isEditable
        )
        {
            return;
        }

        const rounding =
            this.roundingSetting;

        const charged =
            this.vatCharged;

        this.lines =
            this.lines.map
            (
                line =>
                ({
                    ...line,
                    Mrp:this.showMrp ? line.Mrp : 0,
                    // VAT as per 6.3 : a typed VAT % stays
                    VatRate:
                        !charged
                            ? 0
                            : this.vatEditable && line.VatRate > 0
                                ? line.VatRate
                                : (this.rateFor(line.ProductType) ?? line.VatRate),
                    VatClaimable:this.claimableFor(line.ProductType)
                })
            );

        const result =
            pricePurchaseOrder(
                {
                    InvoicePriceBasis:this.invoicePriceBasis,
                    ProfitBasis:this.profitBasis,
                    PriceIncludesVat:this.priceIncludesVat,
                    AdditionalDiscountType:this.discountType,
                    AdditionalDiscountValue:this.discountValue,
                    RoundingMethod:rounding.method,
                    WholeTakaLines:rounding.whole,
                    VatCharged:charged
                },
                this.lines
            );

        this.lines =
            result.lines as PurchaseLine[];

        this.roundingAdjustment =
            result.roundingAdjustment;

        this.roundingMethod =
            rounding.method;

        this.wholeTakaLines =
            rounding.whole;

        this.pricingProblem =
            result.problem;
    }

    get discountValue():
        number
    {
        return this.discountType === 'None'
            ? 0
            : roundMoney(parseMoney(this.discountValueText));
    }

    //===========================================================
    // Totals
    //===========================================================

    get totalQuantity():
        number
    {
        return this.lines.reduce((sum, x) => sum + x.Quantity, 0);
    }

    get billedQuantity():
        number
    {
        return this.lines.reduce((sum, x) => sum + (x.BilledQuantity || 0), 0);
    }

    get totalAmount():
        number
    {
        return roundMoney(this.lines.reduce((sum, x) => sum + x.Amount, 0));
    }

    get totalVat():
        number
    {
        return roundMoney(this.lines.reduce((sum, x) => sum + x.VatAmount, 0));
    }

    get totalPayable():
        number
    {
        return roundMoney(this.lines.reduce((sum, x) => sum + x.LineTotal, 0) + this.roundingAdjustment);
    }

    get totalFreeQuantity():
        number
    {
        return roundMoney(this.lines.reduce((sum, x) => sum + (x.FreeQuantity || 0), 0));
    }

    get totalMrp():
        number
    {
        return roundMoney(this.lines.reduce((sum, x) => sum + x.GrossMrp, 0));
    }

    get totalProfit():
        number
    {
        return roundMoney(this.lines.reduce((sum, x) => sum + x.ProfitAmount, 0));
    }

    get totalDp():
        number
    {
        return roundMoney(this.lines.reduce((sum, x) => sum + x.DpAmount, 0));
    }

    get discountAmount():
        number
    {
        return roundMoney(this.lines.reduce((sum, x) => sum + x.DiscountShare, 0));
    }

    get netAmount():
        number
    {
        return roundMoney(this.lines.reduce((sum, x) => sum + x.NetAmount, 0));
    }

    // Payable before the Round off
    get exactPayable():
        number
    {
        return roundMoney(this.lines.reduce((sum, x) => sum + x.LineTotal, 0));
    }

    get showRoundOff():
        boolean
    {
        return this.roundingMethod !== 'None'
            &&
            !this.wholeTakaLines;
    }

    // DP invoice : MRP value and overall margin (net vs MRP)
    get marginText():
        string
    {
        if
        (
            !(this.totalMrp > 0)
        )
        {
            return '';
        }

        const margin =
            poRound((1 - this.netAmount / this.totalMrp) * 100, 2);

        return `MRP value ${this.money(this.totalMrp)} · overall margin ${margin}%`;
    }

    get itemLabel():
        string
    {
        return this.page.item;
    }

    // Margin % suggestion of the picked item (MRP invoice) : the
    // latest margin of this supplier on a PO or a purchase, else
    // the supplier's default
    get marginHint():
        { short:string; text:string; last:boolean } | null
    {
        if
        (
            !this.marginMode
            ||
            !this.productCode
            ||
            this.isReadonly
        )
        {
            return null;
        }

        const terms =
            this.lastTerms.get(this.productCode);

        if
        (
            terms?.HasProfit
        )
        {
            const percent =
                poConvertProfit(terms.ProfitPercent, terms.ProfitBasis, this.profitBasis);

            return {
                short:`last ${percent}%`,
                text:`Last margin ${percent}% · ${terms.ProfitOrderNo}${terms.ProfitDate ? ' (' + this.displayDate(terms.ProfitDate) + ')' : ''}`,
                last:true
            };
        }

        const fallback =
            this.defaultProfitText.trim();

        return {
            short:fallback ? `default ${fallback}%` : 'not set',
            text:fallback
                ? `Supplier default ${fallback}% : this item was never bought from this supplier on an MRP invoice.`
                : 'No margin yet for this item from this supplier : type it.',
            last:false
        };
    }

    // Margin box label : with the suggestion
    get marginBoxLabel():
        string
    {
        const hint =
            this.marginHint;

        return hint
            ? `Margin % · ${hint.short}`
            : this.profitLabel;
    }

    get profitLabel():
        string
    {
        return 'Margin % (on MRP)';
    }

    // MRP invoice with no Margin % yet (the supplier sets none) :
    // the supplier's latest header margin on a PO / purchase
    private fillLastMargin():
        void
    {
        if
        (
            !this.marginMode
            ||
            this.isReadonly
            ||
            this.defaultProfitText.trim() !== ''
        )
        {
            return;
        }

        const supplier =
            (this.defaults?.Suppliers ?? []).find(x => x.SupplierCode === this.supplierCode);

        const last =
            supplier?.LastMarginPercent;

        if
        (
            last === null
            ||
            last === undefined
        )
        {
            return;
        }

        this.onDefaultProfitText(this.numberText(last));
    }

    // Header Margin % : where it came from (tip on the box)
    get headerMarginTip():
        string
    {
        const supplier =
            (this.defaults?.Suppliers ?? []).find(x => x.SupplierCode === this.supplierCode);

        if
        (
            supplier?.DefaultProfitPercent !== null
            &&
            supplier?.DefaultProfitPercent !== undefined
            &&
            supplier.DefaultProfitOn !== 'DP'
        )
        {
            return `Supplier's margin ${supplier.DefaultProfitPercent}% (Supplier Profile)`;
        }

        if
        (
            supplier?.LastMarginPercent !== null
            &&
            supplier?.LastMarginPercent !== undefined
        )
        {
            return `Last margin ${supplier.LastMarginPercent}% · ${supplier.LastMarginNo}`;
        }

        return 'No margin from this supplier yet';
    }

    get marginPlaceholder():
        string
    {
        const fallback =
            this.defaultProfitText.trim();

        return fallback
            ? `Default ${fallback}%`
            : '0';
    }

    get dpLabel():
        string
    {
        const word =
            this.mrpPricing ? 'DP' : 'Unit Price';

        return this.priceIncludesVat
            ? `${word} (incl. VAT)`
            : `${word} (excl. VAT)`;
    }

    // Column / total words : DP (SP / AC) or Unit Price (MB)
    get priceWord():
        string
    {
        return this.mrpPricing ? 'DP' : 'Unit Price';
    }

    // Order Summary columns : SL, item, Qty, [MRP], [Margin %],
    // price, Line Total, VAT, [Net Cost], Action
    get tableCols():
        number
    {
        return 7 + (this.mrpPricing ? 1 : 0) + (this.showMrp ? 1 : 0) + (this.marginMode ? 1 : 0);
    }

    // Cells before Line Total
    get leadSpan():
        number
    {
        return 4 + (this.showMrp ? 1 : 0) + (this.marginMode ? 1 : 0);
    }

    // Cells between Qty and Line Total
    get qtyGapSpan():
        number
    {
        return 1 + (this.showMrp ? 1 : 0) + (this.marginMode ? 1 : 0);
    }

    get totalPayableInWords():
        string
    {
        return this.totalPayable > 0
            ? amountInWords(this.totalPayable)
            : 'Zero';
    }

    //===========================================================
    // Change Tracking
    //===========================================================

    //===========================================================
    // Unit Desk (MB, received here) : one row per bike
    //===========================================================

    // Bikes on a line (quantity + free, whole units)
    unitsWanted
    (
        line:
            PurchaseLine
    ):
        number
    {
        return Math.max(
            0,
            Math.floor(line.Quantity + (line.FreeQuantity || 0))
        );
    }

    // Bikes still without chassis and engine
    unitsShort
    (
        line:
            PurchaseLine
    ):
        number
    {
        const done =
            (line.Units ?? []).filter(x => x.ChassisNo.trim() && x.EngineNo.trim()).length;

        return Math.max(
            0,
            this.unitsWanted(line) - done
        );
    }

    get unitLine():
        PurchaseLine | null
    {
        return this.unitLineIndex === null
            ? null
            : this.lines[this.unitLineIndex] ?? null;
    }

    openUnits
    (
        index:
            number
    ):
        void
    {
        const line =
            this.lines[index];

        if
        (
            !line
            ||
            !this.unitDesk
        )
        {
            return;
        }

        const wanted =
            this.unitsWanted(line);

        const saved =
            (line.Units ?? []).map(x => ({ ...x }));

        // One row per bike (a read-only purchase shows what was saved)
        this.unitRows =
            this.isReadonly
                ? saved
                : Array.from(
                    { length:wanted },
                    (_, i) =>
                        saved[i]
                        ??
                        {
                            ChassisNo:'',
                            EngineNo:'',
                            KeyNo:'',
                            BatteryNo:''
                        }
                );

        this.unitLineIndex =
            index;

        // A number refused on save : say which, the box is red
        this.unitError =
            this.unitRows
                .flatMap(row => (['ChassisNo', 'EngineNo', 'KeyNo', 'BatteryNo'] as UnitField[]).map(field => this.clashOf(field, row[field])))
                .find(text => !!text)
            ??
            '';

        this.cdr.detectChanges();

        // Numbers saved earlier may have been taken since
        this.queueUnitCheck(0);
    }

    closeUnits():
        void
    {
        if
        (
            this.unitTimer
        )
        {
            clearTimeout(this.unitTimer);
        }

        this.unitRequest++;

        this.unitChecking =
            false;

        this.unitLineIndex =
            null;

        this.unitRows =
            [];

        this.unitError =
            '';

        this.cdr.detectChanges();
    }

    onUnitChange
    (
        index:
            number,
        field:
            UnitField,
        value:
            string | number
    ):
        void
    {
        const row =
            this.unitRows[index];

        if
        (
            !row
            ||
            this.isReadonly
        )
        {
            return;
        }

        row[field] =
            String(value ?? '').trim().toUpperCase();

        this.unitError =
            '';

        this.queueUnitCheck();
    }

    // Clear one bike's four numbers
    clearUnitRow
    (
        index:
            number
    ):
        void
    {
        if
        (
            this.isReadonly
            ||
            !this.unitRows[index]
        )
        {
            return;
        }

        this.unitRows =
            this.unitRows.map
            (
                (row, i) =>
                    i === index
                        ? { ...row, ChassisNo:'', EngineNo:'', KeyNo:'', BatteryNo:'' }
                        : row
            );

        this.unitError =
            '';

        this.cdr.detectChanges();

        this.queueUnitCheck();
    }

    // Paste from Excel : the cells copied (tab between columns, a
    // line per bike) fill the desk from the box pasted into, to the
    // right and down. One value with no tab / line goes in as typed.
    // A header row (Chassis / Engine ...) is skipped.
    onUnitPaste
    (
        event:
            ClipboardEvent,
        rowIndex:
            number,
        colIndex:
            number
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

        const text =
            (event.clipboardData?.getData('text/plain') ?? '')
                .replace(/\r\n?/g, '\n')
                .replace(/\n+$/, '');

        // A single value : the box takes it itself
        if
        (
            !/[\t\n]/.test(text)
        )
        {
            return;
        }

        event.preventDefault();

        const fields:
            UnitField[] =
            this.unitFields;

        let rows =
            text
                .split('\n')
                .map(line => line.split('\t').map(cell => cell.trim().toUpperCase()))
                .filter(cells => cells.some(cell => cell.length > 0));

        // Header copied with the data
        if
        (
            rows.length > 0
            &&
            /^(CHASSIS|ENGINE|KEY|BATTERY)/.test(rows[0][0] ?? '')
            &&
            !/\d/.test(rows[0].join(''))
        )
        {
            rows =
                rows.slice(1);
        }

        let filled =
            0;

        rows.forEach
        (
            (cells, r) =>
            {
                const target =
                    rowIndex + r;

                if
                (
                    target >= this.unitRows.length
                )
                {
                    return;
                }

                const row =
                    { ...this.unitRows[target] };

                cells.forEach
                (
                    (cell, c) =>
                    {
                        const field =
                            fields[colIndex + c];

                        if
                        (
                            field
                        )
                        {
                            row[field] =
                                cell;
                        }
                    }
                );

                this.unitRows[target] =
                    row;

                filled++;
            }
        );

        this.unitRows =
            [...this.unitRows];

        this.unitError =
            rows.length > filled
                ? `${rows.length - filled} pasted row${rows.length - filled === 1 ? '' : 's'} left out : this line has ${this.unitRows.length} bike${this.unitRows.length === 1 ? '' : 's'}.`
                : '';

        this.cdr.detectChanges();

        this.queueUnitCheck(0);
    }

    // Check the desk a moment after typing stops
    private queueUnitCheck
    (
        delay:
            number = 400
    ):
        void
    {
        if
        (
            this.unitTimer
        )
        {
            clearTimeout(this.unitTimer);
        }

        this.unitTimer =
            setTimeout(
                () =>
                    this.checkUnits(),
                delay
            );
    }

    // Live check : numbers on the desk (and on the other lines)
    // that bikes of other purchases already carry. A number found
    // is marked red like a save refusal; one no longer taken is
    // cleared.
    private checkUnits():
        void
    {
        const request =
            ++this.unitRequest;

        if
        (
            this.unitLineIndex === null
            ||
            this.isReadonly
            ||
            !this.unitDesk
        )
        {
            this.unitChecking =
                false;

            return;
        }

        const fields:
            UnitField[] =
            ['ChassisNo', 'EngineNo', 'KeyNo', 'BatteryNo'];

        const units =
            [
                ...this.unitRows,
                ...this.lines
                    .filter((_, i) => i !== this.unitLineIndex)
                    .flatMap(line => line.Units ?? [])
            ]
            .map
            (
                x =>
                ({
                    ChassisNo:(x.ChassisNo ?? '').trim().toUpperCase(),
                    EngineNo:(x.EngineNo ?? '').trim().toUpperCase(),
                    KeyNo:(x.KeyNo ?? '').trim().toUpperCase(),
                    BatteryNo:(x.BatteryNo ?? '').trim().toUpperCase()
                })
            )
            .filter(x => x.ChassisNo || x.EngineNo || x.KeyNo || x.BatteryNo);

        // Every number sent : its old "already on purchase" mark is
        // replaced by the answer
        const sent =
            new Set(
                units.flatMap(
                    unit =>
                        fields
                            .filter(field => !!unit[field])
                            .map(field => `${field}|${unit[field]}`)
                )
            );

        const answer =
            (taken: { field:UnitField; value:string; text:string }[]) =>
            {
                this.unitClashes =
                [
                    ...this.unitClashes.filter
                    (
                        x =>
                            !x.text.includes('already on purchase')
                            ||
                            !sent.has(`${x.field}|${x.value}`)
                    ),
                    ...taken
                ];

                this.unitChecking =
                    false;

                // Say the first one under the desk (unless another
                // problem is shown)
                const first =
                    taken.find
                    (
                        x =>
                            this.unitRows.some(row => (row[x.field] ?? '').trim().toUpperCase() === x.value)
                    );

                if
                (
                    first
                    &&
                    !this.unitError
                )
                {
                    this.unitError =
                        first.text;
                }
                else if
                (
                    !first
                    &&
                    this.unitError.includes('already on purchase')
                )
                {
                    this.unitError =
                        '';
                }

                this.cdr.detectChanges();
            };

        if
        (
            units.length === 0
        )
        {
            answer([]);

            return;
        }

        this.unitChecking =
            true;

        this.cdr.detectChanges();

        this.purchasesService
            .checkUnits(
                this.order?.PurchaseId ?? null,
                units
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    rows =>
                    {
                        if
                        (
                            request !== this.unitRequest
                        )
                        {
                            return;
                        }

                        answer(
                            rows
                                .filter(x => (fields as string[]).includes(x.Field) && !!x.Value)
                                .map
                                (
                                    x =>
                                    ({
                                        field:x.Field as UnitField,
                                        value:x.Value,
                                        text:x.Message || `${x.Field.replace('No', '')} No ${x.Value} is already on purchase ${x.PurchaseNo}.`
                                    })
                                )
                        );
                    },

                error:
                    () =>
                    {
                        // The save checks again
                        if
                        (
                            request === this.unitRequest
                        )
                        {
                            this.unitChecking =
                                false;

                            this.cdr.detectChanges();
                        }
                    }
            });
    }

    // Problem with the rows ('' = fine)
    private unitProblem():
        string
    {
        const index =
            this.unitLineIndex;

        const entered =
            this.unitRows.filter(x => x.ChassisNo || x.EngineNo || x.KeyNo || x.BatteryNo);

        for
        (
            const [i, row] of this.unitRows.entries()
        )
        {
            const touched =
                row.ChassisNo || row.EngineNo || row.KeyNo || row.BatteryNo;

            if
            (
                touched
                &&
                (!row.ChassisNo || !row.EngineNo)
            )
            {
                return `Bike ${i + 1} : Chassis No and Engine No are required.`;
            }

            if
            (
                touched
                &&
                this.unitsRequired
                &&
                (!row.KeyNo || !row.BatteryNo)
            )
            {
                return `Bike ${i + 1} : Key No and Battery No are required.`;
            }
        }

        // No number twice : on this line or on another line
        const others =
            this.lines
                .filter((_, i) => i !== index)
                .flatMap(x => x.Units ?? []);

        const all =
            [...entered, ...others];

        const fields:
            ['ChassisNo' | 'EngineNo' | 'KeyNo' | 'BatteryNo', string, boolean][] =
            [
                ['ChassisNo', 'Chassis No', true],
                ['EngineNo', 'Engine No', true],
                ['KeyNo', 'Key No', this.unitsRequired && switchOn(this.switches, this.page.switches.UNIQUE_KEY_NO, false)],
                ['BatteryNo', 'Battery No', this.unitsRequired && switchOn(this.switches, this.page.switches.UNIQUE_BATTERY_NO, false)]
            ];

        for
        (
            const [field, label, unique] of fields
        )
        {
            if
            (
                !unique
            )
            {
                continue;
            }

            const seen =
                new Set<string>();

            for
            (
                const unit of all
            )
            {
                const value =
                    unit[field];

                if
                (
                    !value
                )
                {
                    continue;
                }

                if
                (
                    seen.has(value)
                )
                {
                    return `${label} ${value} is entered twice.`;
                }

                seen.add(value);
            }
        }

        // Already on another purchase (live check)
        const taken =
            this.unitRows
                .flatMap(row => (['ChassisNo', 'EngineNo', 'KeyNo', 'BatteryNo'] as UnitField[]).map(field => this.clashOf(field, row[field])))
                .find(text => text.includes('already on purchase'));

        if
        (
            taken
        )
        {
            return taken;
        }

        return '';
    }

    saveUnits():
        void
    {
        const index =
            this.unitLineIndex;

        if
        (
            index === null
            ||
            this.isReadonly
        )
        {
            this.closeUnits();

            return;
        }

        const problem =
            this.unitProblem();

        if
        (
            problem
        )
        {
            this.unitError =
                problem;

            return;
        }

        // A refused number that is gone (changed / cleared) is no
        // longer marked
        const kept =
            new Set(
                this.unitRows.flatMap(
                    row =>
                        (['ChassisNo', 'EngineNo', 'KeyNo', 'BatteryNo'] as UnitField[])
                            .map(field => `${field}|${(row[field] ?? '').trim().toUpperCase()}`)
                )
            );

        const others =
            new Set(
                this.lines
                    .filter((_, i) => i !== index)
                    .flatMap(line => line.Units ?? [])
                    .flatMap(
                        unit =>
                            (['ChassisNo', 'EngineNo', 'KeyNo', 'BatteryNo'] as UnitField[])
                                .map(field => `${field}|${(unit[field] ?? '').toUpperCase()}`)
                    )
            );

        this.unitClashes =
            this.unitClashes.filter(x => kept.has(`${x.field}|${x.value}`) || others.has(`${x.field}|${x.value}`));

        // Only the rows filled in are kept; Key & Battery Required
        // OFF : their numbers are not kept
        const keys =
            this.unitsRequired;

        const units =
            this.unitRows
                .filter(x => x.ChassisNo || x.EngineNo)
                .map(x => ({ ...x, KeyNo:keys ? x.KeyNo : '', BatteryNo:keys ? x.BatteryNo : '' }));

        this.lines =
            this.lines.map
            (
                (x, i) =>
                    i === index
                        ? { ...x, Units:units }
                        : x
            );

        this.closeUnits();

        this.checkForChanges();
    }

    private snapshot():        string
    {
        return JSON.stringify(
            {
                date:toIsoDate(this.orderDateValue),
                order:this.orderId,
                invoiceNo:this.supplierInvoiceNo,
                invoiceDate:this.supplierInvoiceDate ? toIsoDate(this.supplierInvoiceDate) : '',
                mushak:[this.mushakNo, this.mushakDate ? toIsoDate(this.mushakDate) : ''],
                doRef:this.doReference,
                gatePass:this.gatePassNo,
                warehouse:this.warehouseId,
                inclusive:this.priceIncludesVat,
                invoice:this.invoicePriceBasis,
                profitOn:this.profitBasis,
                defaultProfit:roundMoney(parseMoney(this.defaultProfitText)),
                discount:[this.discountType, this.discountValue],
                noVat:this.noVatInvoice,
                supplier:this.supplierCode,
                narration:this.narration.trim(),
                lines:this.lines.map(x => [x.ProductCode, x.Quantity, x.FreeQuantity, x.Mrp, x.ProfitPercent, x.UnitPrice, x.IsTotalTyped, x.IsTotalTyped ? x.DpAmount : 0, x.VatRate, x.ShortNotes, x.PurchaseOrderLineId, (x.Units ?? []).map(u => [u.ChassisNo, u.EngineNo, u.KeyNo, u.BatteryNo])])
            }
        );
    }

    private setInitialFormState():
        void
    {
        this.originalState =
            this.snapshot();

        this.hasChanges =
            false;
    }

    private checkForChanges():
        void
    {
        this.reprice();

        this.hasChanges =
            this.snapshot() !== this.originalState;
    }

    //===========================================================
    // Display Helpers
    //===========================================================

    money
    (
        value:
            number
    ):
        string
    {
        return formatMoney(value);
    }

    // yyyy-MM-dd (or ISO date-time) → 30-Oct-2026 (the style of
    // every date on the page)
    displayDate
    (
        value:
            string | null | undefined
    ):
        string
    {
        const parts =
            (value ?? '').substring(0, 10).split('-');

        const month =
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(parts[1]) - 1];

        return parts.length === 3 && month
            ? `${parts[2]}-${month}-${parts[0]}`
            : '—';
    }

    //===========================================================
    // Validate + Build Payload
    //===========================================================

    private validationError():
        string
    {
        if
        (
            this.periodChecking
        )
        {
            return 'The financial year is still being checked. Try again in a moment.';
        }

        if
        (
            this.periodError
        )
        {
            return this.periodError;
        }

        if
        (
            this.orderDateIssue
        )
        {
            return this.orderDateIssue;
        }

        if
        (
            !this.supplierCode
        )
        {
            return 'Select a supplier.';
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
            this.poRequired
            &&
            !this.orderId
        )
        {
            return 'Select the Purchase Order.';
        }

        if
        (
            !this.narration.trim()
        )
        {
            return 'Narration is required.';
        }

        if
        (
            this.mushakNo
            &&
            !this.mushakDate
        )
        {
            return 'Mushak 6.3 Date is required with the Mushak 6.3 No.';
        }

        // Never both missing : the invoice or the Mushak 6.3
        if
        (
            !(this.supplierInvoiceNo && this.supplierInvoiceDate)
            &&
            !(this.mushakNo && this.mushakDate)
        )
        {
            return 'Enter the Supplier Invoice No and Date, or the Mushak 6.3 No and Date : a purchase needs at least one of them.';
        }

        if
        (
            this.receivedOnPurchase
            &&
            !this.warehouseId
        )
        {
            return 'Select the warehouse the goods are received into.';
        }

        if
        (
            this.invoiceRequired
            &&
            (!this.supplierInvoiceNo || !this.supplierInvoiceDate)
        )
        {
            return 'Supplier Invoice No and Date are required.';
        }

        if
        (
            this.mushakRequired
            &&
            (!this.mushakNo || !this.mushakDate)
        )
        {
            return 'Mushak 6.3 No and Date are required.';
        }

        if
        (
            this.mushakError
        )
        {
            return this.mushakError;
        }

        if
        (
            this.doRequired
            &&
            !this.doReference
        )
        {
            return 'DO Reference is required.';
        }

        if
        (
            this.gatePassRequired
            &&
            !this.gatePassNo
        )
        {
            return 'Gate Pass No is required.';
        }

        const late =
            [
                [this.supplierInvoiceDate, 'Invoice Date'],
                [this.mushakDate, 'Mushak Date']
            ] as const;

        for
        (
            const [date, label] of late
        )
        {
            if
            (
                date
                &&
                toIsoDate(date) > toIsoDate(this.orderDateValue)
            )
            {
                return `${label} cannot be after the Purchase Date.`;
            }
        }

        // PO lines : never more than the order has left
        for
        (
            const line of this.lines
        )
        {
            const left =
                this.poLeft(line.PurchaseOrderLineId);

            if
            (
                left !== null
                &&
                line.Quantity + (line.FreeQuantity || 0) > left
            )
            {
                return `${line.ProductName} : the Purchase Order has only ${left} left.`;
            }
        }

        // Unit Desk : every bike received needs its chassis and engine
        // (always; Key & Battery Required adds those two)
        if
        (
            this.unitDesk
        )
        {
            const short =
                this.lines.find(x => this.unitsShort(x) > 0);

            if
            (
                short
            )
            {
                return `${short.ProductName} : enter the chassis and engine of ${this.unitsShort(short)} more bike${this.unitsShort(short) === 1 ? '' : 's'} (Bikes button).`;
            }
        }

        if
        (
            this.maxLines > 0
            &&
            this.lines.length > this.maxLines
        )
        {
            return `A purchase can have at most ${this.maxLines} lines.`;
        }

        const defaultProblem =
            this.profitProblem(roundMoney(parseMoney(this.defaultProfitText)), 'Default Profit %');

        if
        (
            defaultProblem
        )
        {
            return defaultProblem;
        }

        if
        (
            this.invoicePriceBasis === 'MRP'
        )
        {
            const missing =
                this.lines.findIndex(x => !(x.Mrp > 0));

            if
            (
                missing >= 0
            )
            {
                return `Line ${missing + 1} : MRP is required on an MRP invoice.`;
            }
        }

        if
        (
            !this.freeGoodsAllowed
            &&
            this.lines.some(x => x.FreeQuantity > 0)
        )
        {
            return 'Free Qty is not allowed (System Configuration › Free Goods Allowed is OFF). Remove it from the lines.';
        }

        if
        (
            this.pricingProblem
        )
        {
            return this.pricingProblem;
        }

        return '';
    }

    private buildPayload():
        CreatePurchase
    {
        return {
            PageType:this.pageType,
            PurchaseDate:toIsoDate(this.orderDateValue),
            BranchId:this.branchId,
            SupplierCode:this.supplierCode,
            PurchaseOrderId:this.poRequired ? this.orderId : null,
            SupplierInvoiceNo:this.supplierInvoiceNo,
            SupplierInvoiceDate:this.supplierInvoiceDate ? toIsoDate(this.supplierInvoiceDate) : '',
            MushakNo:this.mushakNo,
            MushakDate:this.mushakDate ? toIsoDate(this.mushakDate) : '',
            DoReference:this.doReference,
            GatePassNo:this.gatePassNo,
            WarehouseId:this.receivedOnPurchase ? this.warehouseId : null,
            PriceIncludesVat:this.priceIncludesVat,
            InvoicePriceBasis:this.invoicePriceBasis,
            DefaultProfitPercent:roundMoney(parseMoney(this.defaultProfitText)),
            AdditionalDiscountType:this.discountType,
            AdditionalDiscountValue:this.discountValue,
            NoVatInvoice:this.noVatInvoice,
            Narration:this.narration.trim(),
            Lines:
                this.lines.map
                (
                    x =>
                    ({
                        PurchaseOrderLineId:x.PurchaseOrderLineId ?? null,
                        ProductCode:x.ProductCode,
                        Quantity:x.Quantity,
                        FreeQuantity:x.FreeQuantity || 0,
                        Mrp:this.showMrp ? x.Mrp : 0,
                        ProfitPercent:x.ProfitPercent,
                        UnitPrice:x.UnitPrice,
                        IsAdjusted:x.IsAdjusted,
                        IsTotalTyped:x.IsTotalTyped,
                        DpAmount:x.IsTotalTyped ? x.DpAmount : 0,
                        VatRate:x.VatRate,
                        ShortNotes:x.ShortNotes,
                        Units:this.unitDesk ? (x.Units ?? []) : []
                    })
                )
        };
    }

    //===========================================================
    // Save (Draft : create or update)
    //===========================================================

    onSave():
        void
    {
        if
        (
            this.isSaving
            ||
            !this.isEditable
        )
        {
            return;
        }

        const problem =
            this.validationError();

        if
        (
            problem
        )
        {
            this.toast.warning(
                'Check the Purchase',
                problem
            );

            return;
        }

        if
        (
            this.isEditMode
            &&
            !this.hasChanges
        )
        {
            this.toast.info(
                'No Changes',
                'Nothing has changed since the last save.'
            );

            return;
        }

        const payload =
            this.buildPayload();

        if
        (
            this.isEditMode
        )
        {
            this.startProgress(
                'Updating Purchase',
                'Please wait while the purchase is being updated...'
            );

            this.withMinimumDuration(
                this.purchasesService.update(
                    this.order?.PublicId || this.routePublicId,
                    {
                        ...payload,
                        PurchaseId:this.entityId
                    }
                )
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.completeProgress(
                        'Purchase updated.',
                        () =>
                        {
                            this.hasChanges =
                                false;

                            this.toast.success(
                                'Update Successful',
                                `${this.order?.PurchaseNo ?? 'Purchase'} updated successfully.`
                            );

                            this.goToList();
                        }
                    );
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    this.saveFailed(
                        'Update',
                        error
                    );
                }
            });

            return;
        }

        this.startProgress(
            'Saving Purchase',
            'Please wait while the purchase is being saved...'
        );

        this.withMinimumDuration(
            this.purchasesService.create(
                payload
            )
        )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe
        ({
            next:
            (
                saved
            ):
                void =>
            {
                this.completeProgress(
                    'Purchase saved.',
                    () =>
                    {
                        this.hasChanges =
                            false;

                        this.toast.success(
                            'Save Successful',
                            `${saved.PurchaseNo || 'Purchase'} saved as Draft.`
                        );

                        this.goToList();
                    }
                );
            },

            error:
            (
                error:
                    unknown
            ):
                void =>
            {
                this.saveFailed(
                    'Save',
                    error
                );
            }
        });
    }

    private saveFailed
    (
        action:
            string,
        error:
            unknown
    ):
        void
    {
        console.error(
            `${action} Purchase Error`,
            error
        );

        const message =
            this.extractErrorMessage(
                error,
                `Failed to ${action.toLowerCase()} the purchase.`
            );

        this.failProgress(
            () =>
            {
                this.toast.error(
                    `${action} Failed`,
                    message
                );

                // A bike number refused : mark its line and box red
                this.markUnitClash(message);

                // Mushak 6.3 No refused : the box shows red
                if
                (
                    /^Mushak 6\.3 No /.test(message)
                )
                {
                    this.mushakError =
                        message;

                    this.cdr.detectChanges();
                }
            }
        );
    }

    //===========================================================
    // Bike number refused by the server
    //   "Chassis No X is already on purchase P."
    //   "Engine No X is entered on more than one bike."
    //===========================================================

    private markUnitClash
    (
        message:
            string
    ):
        void
    {
        const match =
            /(Chassis|Engine|Key|Battery) No (.+?) is (already on purchase .+|entered on more than one bike)/
                .exec(message ?? '');

        if
        (
            !match
        )
        {
            return;
        }

        const field =
            `${match[1]}No` as UnitField;

        const value =
            match[2].trim().toUpperCase();

        const text =
            match[3].startsWith('already')
                ? `${match[1]} No ${value} is ${match[3].replace(/\.$/, '')}.`
                : `${match[1]} No ${value} is entered on more than one bike.`;

        this.unitClashes =
        [
            ...this.unitClashes.filter(x => !(x.field === field && x.value === value)),
            { field, value, text }
        ];

        // Stay on the form : the line and its Bikes button show red;
        // the desk opens when the user clicks it
        this.cdr.detectChanges();
    }

    // The refusal of one number ('' = none)
    private clashOf
    (
        field:
            UnitField,
        value:
            string | undefined
    ):
        string
    {
        const key =
            (value ?? '').trim().toUpperCase();

        if
        (
            !key
        )
        {
            return '';
        }

        return this.unitClashes.find(x => x.field === field && x.value === key)?.text
            ??
            '';
    }

    // A line with a refused number (Purchase Summary row in red)
    lineHasClash
    (
        line:
            PurchaseLine
    ):
        boolean
    {
        return this.unitClashes.length > 0
            &&
            (line.Units ?? []).some
            (
                unit =>
                    (['ChassisNo', 'EngineNo', 'KeyNo', 'BatteryNo'] as UnitField[])
                        .some(field => !!this.clashOf(field, unit[field]))
            );
    }

    // Unit Desk box : refused by the server, or entered twice here
    // ('' = fine)
    unitBad
    (
        index:
            number,
        field:
            UnitField
    ):
        string
    {
        const value =
            (this.unitRows[index]?.[field] ?? '').trim().toUpperCase();

        if
        (
            !value
        )
        {
            return '';
        }

        const clash =
            this.clashOf(field, value);

        if
        (
            clash
        )
        {
            return clash;
        }

        // Key / Battery repeat only when their switch asks unique
        const unique =
            field === 'ChassisNo'
            ||
            field === 'EngineNo'
            ||
            (field === 'KeyNo' && this.unitsRequired && switchOn(this.switches, this.page.switches.UNIQUE_KEY_NO, false))
            ||
            (field === 'BatteryNo' && this.unitsRequired && switchOn(this.switches, this.page.switches.UNIQUE_BATTERY_NO, false));

        if
        (
            !unique
        )
        {
            return '';
        }

        const here =
            this.unitRows.filter((row, i) => i !== index && (row[field] ?? '').trim().toUpperCase() === value).length;

        const elsewhere =
            this.lines
                .filter((_, i) => i !== this.unitLineIndex)
                .some(line => (line.Units ?? []).some(unit => (unit[field] ?? '').toUpperCase() === value));

        return here > 0 || elsewhere
            ? `${field.replace('No', '')} No ${value} is entered more than once.`
            : '';
    }

    //===========================================================
    // Workflow
    //===========================================================

    private onApprove():
        void
    {
        if
        (
            this.hasChanges
        )
        {
            this.toast.info(
                'Unsaved Changes',
                'Update the draft before approving it.'
            );

            return;
        }

        this.confirmDialog.open(
            'Approve Purchase',
            this.postOnApproval
                ? `Approve and post ${this.order?.PurchaseNo ?? 'this purchase'} for ${this.money(this.totalPayable)}? The journal is made and the stock comes in now.`
                : `Approve ${this.order?.PurchaseNo ?? 'this purchase'} for ${this.money(this.totalPayable)}?`,
            () =>
                setTimeout(
                    () =>
                        this.runWorkflow(
                            this.postOnApproval ? 'Approving and Posting' : 'Approving Purchase',
                            this.postOnApproval ? 'Purchase approved and posted.' : 'Purchase approved.',
                            publicId =>
                                this.purchasesService.approve(publicId)
                        )
                ),
            'Approve',
            'Cancel',
            'primary'
        );
    }

    private onReturnToDraft():
        void
    {
        this.confirmDialog.open(
            'Return to Draft',
            `Return ${this.order?.PurchaseNo ?? 'this purchase'} to Draft so it can be edited?`,
            () =>
                setTimeout(
                    () =>
                        this.runWorkflow(
                            'Returning to Draft',
                            'Purchase returned to draft.',
                            publicId =>
                                this.purchasesService.returnToDraft(publicId)
                        )
                ),
            'Return',
            'Cancel',
            'primary'
        );
    }

    private onPost():
        void
    {
        this.confirmDialog.open(
            'Post Purchase',
            `Post ${this.order?.PurchaseNo ?? 'this purchase'} for ${this.money(this.order?.TotalPayable ?? this.totalPayable)}? The journal ${this.order?.PurchaseNo ?? ''} is made to ${this.order?.SupplierName ?? 'the supplier'}${this.order?.WarehouseName ? ` and the stock comes into ${this.order.WarehouseName}` : ''}.`,
            () =>
                setTimeout(
                    () =>
                        this.runWorkflow(
                            'Posting Purchase',
                            'Purchase posted.',
                            publicId =>
                                this.purchasesService.post(publicId)
                        )
                ),
            'Post',
            'Cancel',
            'primary'
        );
    }

    //===========================================================
    // Cancel : overlay asks for the reason
    //===========================================================

    private openReason
    (
        action:
            'cancel'
    ):
        void
    {
        this.reasonAction =
            action;

        this.reasonText =
            '';

        this.reasonOpened =
            true;

        this.cdr.detectChanges();
    }

    closeReason():
        void
    {
        if
        (
            this.isSaving
        )
        {
            return;
        }

        this.reasonOpened =
            false;

        this.cdr.detectChanges();
    }

    onReasonChange
    (
        value:
            string
    ):
        void
    {
        this.reasonText =
            value
            ??
            '';
    }

    confirmReason():
        void
    {
        const reason =
            this.reasonText.trim();

        if
        (
            !reason
        )
        {
            this.toast.warning(
                'Reason Required',
                'Enter why the purchase is cancelled.'
            );

            return;
        }

        this.reasonOpened =
            false;

        // The journal is reversed and the stock goes out again
        this.runWorkflow(
            'Cancelling Purchase',
            'Purchase cancelled.',
            publicId =>
                this.purchasesService.cancel(publicId, reason)
        );
    }

    //===========================================================
    // Run a workflow command, then open the list
    //===========================================================

    private runWorkflow
    (
        title:
            string,
        doneMessage:
            string,
        call:
            (publicId: string) => Observable<void>
    ):
        void
    {
        // One action at a time
        if
        (
            this.isSaving
        )
        {
            return;
        }

        // The record is addressed by its uuid (never the number)
        const publicId:
            string =
            this.order?.PublicId
            ||
            this.routePublicId;

        if
        (
            !publicId
        )
        {
            return;
        }

        this.startProgress(
            title,
            'Please wait...'
        );

        this.withMinimumDuration(
            call(publicId)
        )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    doneMessage,
                    () =>
                    {
                        this.toast.success(
                            'Success',
                            doneMessage
                        );

                        this.goToList();
                    }
                );
            },

            error:
            (
                error:
                    unknown
            ):
                void =>
            {
                console.error(
                    `${title} Error`,
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Not Allowed',
                            this.extractErrorMessage(
                                error,
                                `${title} failed.`
                            )
                        );

                        // Status may have changed elsewhere
                        this.loadEntity();
                    }
                );
            }
        });
    }

    //===========================================================
    // Navigation (relative : no hard-coded module path)
    //   list / add / edit/:id / view/:id are siblings
    //===========================================================

    // The route that holds list / add / edit / view
    private get listParent():
        ActivatedRoute
    {
        return this.route.parent
            ??
            this.route;
    }

    private goToList():
        void
    {
        void this.router.navigate(
            ['list'],
            {
                relativeTo:
                    this.listParent
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
            [
                mode,
                this.order?.PublicId || this.routePublicId
            ],
            {
                relativeTo:
                    this.listParent
            }
        );
    }

    //===========================================================
    // Clear
    //===========================================================

    onClear():
        void
    {
        if
        (
            this.isSaving
            ||
            !this.isEditable
        )
        {
            return;
        }

        if
        (
            this.isEditMode
        )
        {
            this.loadEntity();

            return;
        }

        this.initializeEntity();
    }

    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        if
        (
            this.isSaving
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
            {
                this.goToList();
            },
            'Leave',
            'Stay',
            'primary'
        );
    }

    //===========================================================
    // Progress Dialog (Animated)
    //===========================================================

    private startProgress
    (
        title:
            string,

        message:
            string
    ):
        void
    {
        this.isSaving =
            true;

        this.progressValue =
            0;

        this.progressDialog.show(
            title,
            message,
            false
        );

        this.clearProgressTimer();

        this.progressTimer =
            window.setInterval(
                () =>
                {
                    const step =
                        Math.max(
                            0.4,
                            (this.PROGRESS_CEILING - this.progressValue) * 0.06
                        );

                    this.progressValue =
                        Math.min(
                            this.PROGRESS_CEILING,
                            this.progressValue + step
                        );

                    this.progressDialog.update(
                        Math.round(
                            this.progressValue
                        )
                    );
                },

                this.PROGRESS_TICK_MS
            );

        this.cdr.detectChanges();
    }

    private completeProgress
    (
        message:
            string,

        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressDialog.update(
            100,
            message
        );

        this.completeTimer =
            window.setTimeout(
            () =>
            {
                this.completeTimer =
                    null;

                this.progressDialog.close();

                this.isSaving =
                    false;

                // Page already left : no navigation / redraw
                if
                (
                    this.destroyed
                )
                {
                    return;
                }

                this.cdr.detectChanges();

                done();
            },

            this.PROGRESS_COMPLETE_HOLD_MS
        );
    }

    private failProgress
    (
        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressDialog.close();

        this.isSaving =
            false;

        this.cdr.detectChanges();

        done();
    }

    private clearProgressTimer():
        void
    {
        if
        (
            this.progressTimer
        )
        {
            clearInterval(
                this.progressTimer
            );

            this.progressTimer =
                undefined;
        }
    }

    private withMinimumDuration<T>
    (
        source$:
            Observable<T>
    ):
        Observable<T>
    {
        return defer(
            () =>
            {
                const startedAt:
                    number =
                    Date.now();

                const remaining =
                    (): number =>
                        Math.max(
                            0,
                            this.MIN_PROGRESS_MS - (Date.now() - startedAt)
                        );

                return source$.pipe(

                    delayWhen(
                        () =>
                            timer(remaining())
                    ),

                    catchError(
                        error =>
                            timer(remaining()).pipe(
                                switchMap(
                                    () =>
                                        throwError(() => error)
                                )
                            )
                    )
                );
            }
        );
    }

    //===========================================================
    // Error Message
    //===========================================================

    private extractErrorMessage
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
                return error.error;
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
        }

        return fallback;
    }
}
