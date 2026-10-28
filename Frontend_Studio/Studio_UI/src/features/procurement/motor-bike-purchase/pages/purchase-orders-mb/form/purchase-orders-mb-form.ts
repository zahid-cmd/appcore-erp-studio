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
    switchMap
}
from 'rxjs';

//===============================================================
// Shared Components
//===============================================================

import
{
    PageHeaderComponent
}
from '../../../../../../shared/components/layout/page-header/page-header';

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    DatepickerComponent
}
from '../../../../../../shared/components/controls/datepicker/datepicker';

import
{
    TextareaComponent
}
from '../../../../../../shared/components/controls/textarea/textarea';

import
{
    TextboxComponent
}
from '../../../../../../shared/components/controls/textbox/textbox';

import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    ControlSegmentComponent,
    ControlSegmentItem
}
from '../../../../../../shared/components/utilities/control-segment/control-segment';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

import
{
    OrbitLoaderComponent
}
from '../../../../../../shared/components/utilities/orbit-loader/orbit-loader';

import
{
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

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

//===============================================================
// Login session (active branch)
//===============================================================

import
{
    AuthenticationStorageService
}
from '../../../../../../core/authentication/authentication-storage.service';

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
from '../../../../../../shared/components/accounting/accounting.models';

//===============================================================
// Purchase VAT (VAT Management › VAT Setup)
//===============================================================

import
{
    PurchaseVatService
}
from '../../../../../vat-management/vat-setup/services/purchase-vat.service';

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
from '../../../../../../shared/components/accounting/voucher-switches';

//===============================================================
// Model & Service
//===============================================================

import
{
    PurchaseOrder,
    PurchaseOrderLine,
    PurchaseOrderDefaults,
    PurchaseOrderPageType,
    PurchaseOrderSupplierOption,
    PurchaseOrderProductOption,
    CreatePurchaseOrder,
    purchaseOrderLineAmounts
}
from '../../../models/purchase-orders-mb.model';

import
{
    PurchaseOrdersMbService
}
from '../../../services/purchase-orders-mb.service';

//===============================================================
// Header Commands
//===============================================================

type FormCommand =
    'save' | 'clear' | 'edit' | 'approve' | 'place' | 'return' | 'closeShort' | 'cancel' | 'print' | '';

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
// Switches : Procurement › Motor Bike Purchase › Purchase Orders
// - MB (Settings › System Configuration), always read BY CODE.
// A missing switch uses its fallback (= today's behaviour).
//===============================================================

export const PO_MB_SWITCH =
{
    // Read by Purchases - MB
    PO_REQUIRED:          'CFG-MOD-007-0001',
    CARRY_BALANCE:        'CFG-MOD-007-0002',

    // PO date window (Value = most days; empty = any day)
    BACK_DATED:           'CFG-MOD-007-0003',
    POST_DATED:           'CFG-MOD-007-0004',

    // Value = most lines (OFF = no limit)
    MAX_LINES:            'CFG-MOD-007-0005',

    EXPECTED_REQUIRED:    'CFG-MOD-007-0006',
    PRINT_ON_APPROVAL:    'CFG-MOD-007-0007',
    PRICE_INCLUSIVE:      'CFG-MOD-007-0008',
    PLACE_ON_APPROVAL:    'CFG-MOD-007-0009'
} as const;

//===============================================================
// Component
//
// Motor Bike Purchase Order : one page
//
//   Header : Branch (login branch) + Financial Year chips,
//            status in the center, commands on the right
//   Left   : PO Information, Supplier, Add Motor Bike
//   Right  : Terms & Narration, Order Summary with totals
//
// The PO number is only previewed; the real one is taken when
// the draft is first saved. VAT is an estimate from the Purchase
// VAT rule on the PO date (the 6.3 decides at purchase entry).
//===============================================================

@Component(
{
    selector:'purchase-orders-mb-form',

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
        ProgressDialogComponent
    ],

    templateUrl:'./purchase-orders-mb-form.html',

    styleUrls:
    [
        './purchase-orders-mb-form.css'
    ]
})

//===============================================================
// Purchase Orders Form
//===============================================================

export class PurchaseOrdersMbForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Page Type (this page : Motor Bikes)
    //===========================================================

    private readonly pageType:
        PurchaseOrderPageType =
        'MB';

    // Purchase VAT rule used for the lines
    private readonly vatType:
        string =
        'Motor Bikes';

    readonly entityName:
        string =
        'Purchase Order - MB';

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly purchaseOrdersService =
        inject(PurchaseOrdersMbService);

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
        PurchaseOrder | null =
        null;

    defaults:
        PurchaseOrderDefaults | null =
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

    expectedDateValue:
        Date | null =
        null;

    priceIncludesVat:
        boolean =
        true;

    supplierCode:
        string =
        '';

    narration:
        string =
        '';

    readonly priceEntryItems:
        ControlSegmentItem[] =
    [
        {
            value:true,
            text:'VAT Inclusive'
        },
        {
            value:false,
            text:'VAT Exclusive'
        }
    ];

    //===========================================================
    // Lines
    //===========================================================

    lines:
        PurchaseOrderLine[] =
    [];

    //===========================================================
    // Add Motor Bike (picker)
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

    unitPriceText:
        string =
        '';

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

    // Purchase VAT rate on the PO date (null = still loading)
    vatRate:
        number | null =
        null;

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
        'closeShort' | 'cancel' =
        'cancel';

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
                PO_MB_SWITCH.BACK_DATED,
                PO_MB_SWITCH.POST_DATED
            );
    }

    // Max Lines (0 = no limit)
    get maxLines():
        number
    {
        return switchNumber(
            this.switches,
            this.switchValues,
            PO_MB_SWITCH.MAX_LINES
        );
    }

    get expectedRequired():
        boolean
    {
        return switchOn(
            this.switches,
            PO_MB_SWITCH.EXPECTED_REQUIRED,
            false
        );
    }

    get printOnApproval():
        boolean
    {
        return switchOn(
            this.switches,
            PO_MB_SWITCH.PRINT_ON_APPROVAL,
            true
        );
    }

    get placeOnApproval():
        boolean
    {
        return switchOn(
            this.switches,
            PO_MB_SWITCH.PLACE_ON_APPROVAL,
            false
        );
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
        .replace(/voucher date/g, 'PO date');
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
            id > 0
        )
        {
            this.entityId =
                id;

            this.loadEntity();

            return;
        }

        this.mode =
            'add';

        this.initializeEntity();
    }

    private resolveEntityId():
        number
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
                Number(
                    currentRoute.snapshot.paramMap.get('id')
                );

            if
            (
                id > 0
            )
            {
                return id;
            }

            currentRoute =
                currentRoute.parent;
        }

        return 0;
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
    // Approved     : Place, Return, Print
    // Placed       : Close, Cancel, Print
    // Completed / Closed Short / Cancelled : Print
    //
    // Print is always the last button. An approved order that is
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

        const place:
            CommandSlot =
        {
            command:'place',
            text:'Place',
            icon:'fas fa-paper-plane',
            activity:'Place Order'
        };

        const returnToDraft:
            CommandSlot =
        {
            command:'return',
            text:'Return',
            icon:'fas fa-rotate-left',
            activity:'Return'
        };

        const closeShort:
            CommandSlot =
        {
            command:'closeShort',
            text:'Close',
            icon:'fas fa-scissors',
            activity:'Close Short'
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
            return [save, clear];
        }

        switch
        (
            this.status
        )
        {
            case 'Draft':
                return this.isEditMode
                    ? [save, approve, clear]
                    : [approve, edit];

            case 'Approved':
                // Print while Approved only when the switch allows
                return this.printOnApproval
                    ? [place, returnToDraft, print]
                    : [place, returnToDraft];

            // Cancel only while nothing is billed (server checks)
            case 'Placed':
                return this.billedQuantity > 0
                    ? [closeShort, print]
                    : [closeShort, cancel, print];

            case 'Completed':
            case 'Closed Short':
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

            case 'edit':
                this.goTo('edit');
                break;

            case 'approve':
                this.onApprove();
                break;

            case 'place':
                this.onPlace();
                break;

            case 'return':
                this.onReturnToDraft();
                break;

            case 'closeShort':
                this.openReason('closeShort');
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
    //   /print-viewer/purchase-orders-mb/<id>?doc=all
    // (the viewer refuses a draft)
    //===========================================================

    onPrint():
        void
    {
        const id =
            this.order?.PurchaseOrderId
            ??
            0;

        if
        (
            !(id > 0)
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
                    ? 'A purchase order prints once it is approved.'
                    : 'A purchase order prints once it is placed.'
            );

            return;
        }

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', 'purchase-orders-mb', id],
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

        this.expectedDateValue =
            null;

        // Switch "Default Price Entry : VAT Inclusive"
        this.priceIncludesVat =
            switchOn(
                this.switches,
                PO_MB_SWITCH.PRICE_INCLUSIVE,
                true
            );

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
    }

    //===========================================================
    // Load Entity (Edit / View)
    //===========================================================

    private loadEntity():
        void
    {
        this.loading =
            true;

        this.purchaseOrdersService
            .getById(this.entityId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    item:
                        PurchaseOrder
                ):
                    void =>
                {
                    this.order =
                        item;

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
                        fromIsoDate(item.OrderDate)
                        ??
                        new Date();

                    this.savedOrderDate =
                        item.OrderDate;

                    this.expectedDateValue =
                        fromIsoDate(item.ExpectedDate);

                    this.priceIncludesVat =
                        item.PriceIncludesVat;

                    this.supplierCode =
                        item.SupplierCode;

                    this.narration =
                        item.Narration;

                    this.lines =
                        item.Lines.map(line => ({ ...line }));

                    this.orderNoText =
                        item.OrderNo;

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

                    // Lookups (suppliers / bikes / period) for a draft
                    this.loadDefaults(false);

                    if
                    (
                        this.isEditable
                    )
                    {
                        this.loadVatRate(false);
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
                        'Load Purchase Order Error',
                        error
                    );

                    this.loading =
                        false;

                    this.toast.error(
                        'Load Failed',
                        this.extractErrorMessage(
                            error,
                            'Unable to load the purchase order.'
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
    // Defaults : PO No preview, Financial Year, suppliers, bikes
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

        this.purchaseOrdersService
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
                        PurchaseOrderDefaults
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
                            item.OrderNo;
                    }

                    this.buildSupplierItems();

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
                        request !== this.defaultsRequest
                    )
                    {
                        return;
                    }

                    console.error(
                        'Purchase Order Defaults Error',
                        error
                    );

                    this.periodChecking =
                        false;

                    this.periodError =
                        this.extractErrorMessage(
                            error,
                            'Unable to load suppliers, motor bikes and the financial year.'
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

        this.vatRate =
            null;

        this.vatWarn =
            false;

        this.vatMessage =
            'Checking the Purchase VAT rule...';

        this.purchaseVatService
            .getRate(
                this.vatType,
                date
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    rule
                ):
                    void =>
                {
                    if
                    (
                        request !== this.vatRequest
                    )
                    {
                        return;
                    }

                    this.applyVatRate(
                        Number(rule?.VatRate) || 0,
                        `Purchase VAT for ${this.vatType} on ${this.displayDate(date)} : ${Number(rule?.VatRate) || 0}% (estimate; the 6.3 decides at purchase entry).`,
                        false,
                        rerate
                    );
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
                        request !== this.vatRequest
                    )
                    {
                        return;
                    }

                    const missing =
                        error instanceof HttpErrorResponse
                        &&
                        error.status === 404;

                    this.applyVatRate(
                        0,
                        missing
                            ? `No active Purchase VAT rule for ${this.vatType} on ${this.displayDate(date)}. VAT is taken as 0% — create or extend the rule in VAT Setup › Purchase VAT.`
                            : 'Unable to read the Purchase VAT rule. VAT is taken as 0%.',
                        true,
                        rerate
                    );
                }
            });
    }

    private applyVatRate
    (
        rate:
            number,
        message:
            string,
        warn:
            boolean,
        rerate:
            boolean
    ):
        void
    {
        this.vatRate =
            rate;

        this.vatMessage =
            message;

        this.vatWarn =
            warn;

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
                        this.withAmounts(
                            {
                                ...line,
                                VatRate:rate
                            }
                        )
                );

            this.checkForChanges();
        }

        this.cdr.detectChanges();
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

        return (this.defaults?.Products ?? [])
            .filter(x => x.IsActive && this.fitsBrand(x, brandId));
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

    // Bikes already on the order are not offered again; the line
    // being edited keeps its own bike in the list
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

        // Expected Delivery is never before the PO date
        if
        (
            this.expectedDateValue
            &&
            toIsoDate(this.expectedDateValue) < toIsoDate(value)
        )
        {
            this.expectedDateValue =
                null;
        }

        this.checkForChanges();

        if
        (
            changed
        )
        {
            // New month / year → new number preview and period
            this.loadDefaults(true);

            this.loadVatRate(true);
        }
    }

    onExpectedDateChange
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

        this.expectedDateValue =
            value
            ??
            null;

        this.checkForChanges();
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

        this.priceIncludesVat =
            value === true;

        // Same typed prices, amounts worked out the other way
        this.lines =
            this.lines.map(line => this.withAmounts(line));

        this.checkForChanges();
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
    // Add Motor Bike events
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

        // The bike sets its own Category and Sub-Category, so both
        // lists narrow to it (the bike stays selected)
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

        this.shortNotes =
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

    get isEditingLine():
        boolean
    {
        return this.editingIndex !== null;
    }

    get lineCardTitle():
        string
    {
        return this.editingIndex === null
            ? 'Add Motor Bike'
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

        // Rebuilds the lists with this line's bike available again
        this.buildSubCategoryItems();

        this.productCode =
            product
                ? line.ProductCode
                : '';

        this.quantityText =
            String(line.Quantity);

        this.unitPriceText =
            String(line.UnitPrice);

        this.shortNotes =
            line.ShortNotes;

        if
        (
            !product
        )
        {
            this.lineError =
                `${line.ProductName} is no longer active. Pick another bike or remove the line.`;
        }

        this.cdr.detectChanges();
    }

    cancelEdit():
        void
    {
        this.resetPicker();
    }

    //===========================================================
    // Add / Remove line
    //===========================================================

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
                `A purchase order can have at most ${this.maxLines} lines.`;

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
                'Select a motor bike.';

            return;
        }

        const quantity =
            parseMoney(this.quantityText);

        if
        (
            !(quantity > 0)
            ||
            !Number.isInteger(quantity)
        )
        {
            this.lineError =
                'Quantity must be a whole number greater than zero.';

            return;
        }

        const unitPrice =
            roundMoney(parseMoney(this.unitPriceText));

        if
        (
            !(unitPrice > 0)
        )
        {
            this.lineError =
                'Unit Price must be greater than zero.';

            return;
        }

        if
        (
            this.vatRate === null
        )
        {
            this.lineError =
                'The Purchase VAT rate is still loading. Try again in a moment.';

            return;
        }

        const line:
            PurchaseOrderLine =
            this.withAmounts(
                {
                    LineNo:0,
                    ProductType:product.ProductType,
                    ProductId:product.ProductId,
                    ProductCode:product.ProductCode,
                    ProductName:product.ProductName,
                    Unit:product.Unit,
                    Quantity:quantity,
                    UnitPrice:unitPrice,
                    VatRate:this.vatRate,
                    Amount:0,
                    VatAmount:0,
                    LineTotal:0,
                    BilledQuantity:0,
                    ShortNotes:this.shortNotes.trim()
                }
            );

        // One line per bike (the server checks it too)
        if
        (
            this.takenProductCodes.has(line.ProductCode)
        )
        {
            this.lineError =
                `${line.ProductName} is already on the order.`;

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
                            ? { ...line, LineNo:x.LineNo, BilledQuantity:x.BilledQuantity }
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

        // The removed bike is offered again
        this.buildProductItems();

        this.checkForChanges();
    }

    private withAmounts
    (
        line:
            PurchaseOrderLine
    ):
        PurchaseOrderLine
    {
        return {
            ...line,
            ...purchaseOrderLineAmounts(
                line.Quantity,
                line.UnitPrice,
                line.VatRate,
                this.priceIncludesVat
            )
        };
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
        return roundMoney(this.lines.reduce((sum, x) => sum + x.LineTotal, 0));
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

    private snapshot():
        string
    {
        return JSON.stringify(
            {
                date:toIsoDate(this.orderDateValue),
                expected:this.expectedDateValue ? toIsoDate(this.expectedDateValue) : '',
                inclusive:this.priceIncludesVat,
                supplier:this.supplierCode,
                narration:this.narration.trim(),
                lines:this.lines.map(x => [x.ProductCode, x.Quantity, x.UnitPrice, x.VatRate, x.ShortNotes])
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

    // yyyy-MM-dd (or ISO date-time) → dd-MM-yyyy
    displayDate
    (
        value:
            string | null | undefined
    ):
        string
    {
        const parts =
            (value ?? '').substring(0, 10).split('-');

        return parts.length === 3
            ? `${parts[2]}-${parts[1]}-${parts[0]}`
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
            return 'Add at least one motor bike.';
        }

        if
        (
            !this.narration.trim()
        )
        {
            return 'Terms & Narration is required.';
        }

        if
        (
            this.expectedDateValue
            &&
            toIsoDate(this.expectedDateValue) < toIsoDate(this.orderDateValue)
        )
        {
            return 'Expected Delivery cannot be before the PO Date.';
        }

        if
        (
            this.expectedRequired
            &&
            !this.expectedDateValue
        )
        {
            return 'Expected Delivery is required.';
        }

        if
        (
            this.maxLines > 0
            &&
            this.lines.length > this.maxLines
        )
        {
            return `A purchase order can have at most ${this.maxLines} lines.`;
        }

        return '';
    }

    private buildPayload():
        CreatePurchaseOrder
    {
        return {
            PageType:this.pageType,
            OrderDate:toIsoDate(this.orderDateValue),
            ExpectedDate:this.expectedDateValue ? toIsoDate(this.expectedDateValue) : '',
            BranchId:this.branchId,
            SupplierCode:this.supplierCode,
            PriceIncludesVat:this.priceIncludesVat,
            Narration:this.narration.trim(),
            Lines:
                this.lines.map
                (
                    x =>
                    ({
                        ProductCode:x.ProductCode,
                        Quantity:x.Quantity,
                        UnitPrice:x.UnitPrice,
                        VatRate:x.VatRate,
                        ShortNotes:x.ShortNotes
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
                'Check the Purchase Order',
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
                'Updating Purchase Order',
                'Please wait while the purchase order is being updated...'
            );

            this.withMinimumDuration(
                this.purchaseOrdersService.update(
                    {
                        ...payload,
                        PurchaseOrderId:this.entityId
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
                        'Purchase order updated.',
                        () =>
                        {
                            this.hasChanges =
                                false;

                            this.toast.success(
                                'Update Successful',
                                `${this.order?.OrderNo ?? 'Purchase order'} updated successfully.`
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
            'Saving Purchase Order',
            'Please wait while the purchase order is being saved...'
        );

        this.withMinimumDuration(
            this.purchaseOrdersService.create(
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
                    'Purchase order saved.',
                    () =>
                    {
                        this.hasChanges =
                            false;

                        this.toast.success(
                            'Save Successful',
                            `${saved.OrderNo || 'Purchase order'} saved as Draft.`
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
            `${action} Purchase Order Error`,
            error
        );

        this.failProgress(
            () =>
            {
                this.toast.error(
                    `${action} Failed`,
                    this.extractErrorMessage(
                        error,
                        `Failed to ${action.toLowerCase()} the purchase order.`
                    )
                );
            }
        );
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
            'Approve Purchase Order',
            this.placeOnApproval
                ? `Approve and place ${this.order?.OrderNo ?? 'this order'} for ${this.money(this.totalPayable)}? It goes straight to Placed.`
                : `Approve ${this.order?.OrderNo ?? 'this order'} for ${this.money(this.totalPayable)}?`,
            () =>
                setTimeout(
                    () =>
                        this.runWorkflow(
                            this.placeOnApproval ? 'Approving and Placing' : 'Approving Purchase Order',
                            this.placeOnApproval ? 'Purchase order approved and placed.' : 'Purchase order approved.',
                            id =>
                                this.purchaseOrdersService.approve(id)
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
            `Return ${this.order?.OrderNo ?? 'this order'} to Draft so it can be edited?`,
            () =>
                setTimeout(
                    () =>
                        this.runWorkflow(
                            'Returning to Draft',
                            'Purchase order returned to draft.',
                            id =>
                                this.purchaseOrdersService.returnToDraft(id)
                        )
                ),
            'Return',
            'Cancel',
            'primary'
        );
    }

    private onPlace():
        void
    {
        this.confirmDialog.open(
            'Place Purchase Order',
            `Place ${this.order?.OrderNo ?? 'this order'} with ${this.order?.SupplierName ?? 'the supplier'}? Once placed, the purchase entry bills against it.`,
            () =>
                setTimeout(
                    () =>
                        this.runWorkflow(
                            'Placing Purchase Order',
                            'Purchase order placed.',
                            id =>
                                this.purchaseOrdersService.place(id)
                        )
                ),
            'Place',
            'Cancel',
            'primary'
        );
    }

    //===========================================================
    // Close Short / Cancel : overlay asks for the reason
    //===========================================================

    private openReason
    (
        action:
            'closeShort' | 'cancel'
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
                this.reasonAction === 'cancel'
                    ? 'Enter why the order is cancelled.'
                    : 'Enter why the order is closed short.'
            );

            return;
        }

        this.reasonOpened =
            false;

        if
        (
            this.reasonAction === 'cancel'
        )
        {
            this.runWorkflow(
                'Cancelling Purchase Order',
                'Purchase order cancelled.',
                id =>
                    this.purchaseOrdersService.cancel(id, reason)
            );

            return;
        }

        this.runWorkflow(
            'Closing Purchase Order',
            'Purchase order closed short.',
            id =>
                this.purchaseOrdersService.closeShort(id, reason)
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
            (id: number) => Observable<void>
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

        const id:
            number =
            this.order?.PurchaseOrderId
            ||
            this.entityId;

        if
        (
            !(id > 0)
        )
        {
            return;
        }

        this.startProgress(
            title,
            'Please wait...'
        );

        this.withMinimumDuration(
            call(id)
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
                this.entityId
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