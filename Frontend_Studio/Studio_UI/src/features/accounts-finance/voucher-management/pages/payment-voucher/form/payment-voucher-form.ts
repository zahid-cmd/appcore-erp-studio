//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
    DestroyRef,
    inject
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
    FormsModule
}
from '@angular/forms';

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
// Accounting Components
//===============================================================

import
{
    VoucherMasterDataComponent
}
from '../../../../../../shared/components/accounting/voucher-master-data/voucher-master-data';

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
    VoucherEntryData,
    VoucherDebitLine,
    VoucherPeriod,
    CreditLedgerType,
    emptyVoucherEntry,
    needsDetails,
    debitDetailIssue,
    emptyDebitLine,
    isDebitRowReady,
    roundMoney,
    formatMoney,
    toIsoDate
}
from '../../../../../../shared/components/accounting/accounting.models';

import
{
    VOUCHER_SWITCH,
    SwitchMap,
    SwitchValueMap,
    switchOn,
    switchNumber,
    voucherDateWindow,
    voucherDateIssue,
    VoucherDateWindow,
    VoucherSwitchesService
}
from '../../../../../../shared/components/accounting/voucher-switches';

//===============================================================
// Models / Service
//===============================================================

import
{
    PaymentVoucher,
    PaymentVoucherSaved,
    PaymentVoucherDefaults,
    CreatePaymentVoucher,
    UpdatePaymentVoucher
}
from '../../../models/payment-voucher.model';

import
{
    PaymentVoucherService
}
from '../../../services/payment-voucher.service';

//===============================================================
// Header Commands
//===============================================================

type FormCommand =
    'save' | 'clear' | 'edit' | 'approve' | 'post' | 'return' | 'cancel' | 'next' | 'back' | 'print' | '';

interface CommandSlot
{
    command:
        FormCommand;

    text:
        string;

    icon:
        string;
}

const NO_COMMAND:
    CommandSlot =
{
    command:'',
    text:'',
    icon:''
};

const VOUCHER_PREFIX:
    string =
    'PV';

//===============================================================
// Component
//
// Payment Voucher : one page, up to two steps
//
//   Header  : Branch (login branch) + Financial Year chips,
//             status and step in the center; Checkout / Back in
//             the command center (only when a Check / MFS row
//             exists)
//   Step 1  : Voucher Master Data (debits first, then credits,
//             narration, summary)
//   Step 2  : Payment Desk (details of Check / MFS
//             rows)
//   Save    : step 1 when every row is Cash / Bank, otherwise
//             step 2
//
// The voucher number is only previewed; the real one is taken
// when the draft is first saved.
//===============================================================

@Component(
{
    selector:'payment-voucher-form',

    standalone:true,

    imports:
    [
        CommonModule,
        FormsModule,

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

        //=======================================================
        // Accounting
        //=======================================================

        VoucherMasterDataComponent,
        PaymentDeskComponent,

        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,
        OrbitLoaderComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./payment-voucher-form.html',

    styleUrls:
    [
        './payment-voucher-form.css'
    ]
})

//===============================================================
// Payment Voucher Form
//===============================================================

export class PaymentVoucherForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly paymentVoucherService =
        inject(PaymentVoucherService);

    private readonly switchesService =
        inject(VoucherSwitchesService);

    // Settings › System Configuration (Accounts & Finance)
    private switches:
        SwitchMap =
        {};

    private switchValues:
        SwitchValueMap =
        {};



    private readonly lookup =
        inject(AccountingLookupService);

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
    // List Route
    //===========================================================

    private readonly listRoute:
        string[] =
    [
        '/accounts-finance',
        'voucher-management',
        'payment-voucher',
        'list'
    ];

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

    readonly entityName:
        string =
        'Payment Voucher';

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
    // Loaded voucher (edit / view)
    //===========================================================

    voucher:
        PaymentVoucher | null =
        null;

    //===========================================================
    // Step 1 : Voucher Master Data
    //
    // entryInput : what the component is given (load / clear /
    //              back from step 2 only, so typing is never
    //              reset)
    // entry      : the latest value (with step 2 details)
    //===========================================================

    entryInput:
        VoucherEntryData | null =
        null;

    entry:
        VoucherEntryData =
        emptyVoucherEntry(
            toIsoDate(new Date())
        );

    total:
        number =
        0;

    masterValid:
        boolean =
        false;

    //===========================================================
    // Step 2 : Payment Desk
    //===========================================================

    step:
        1 | 2 =
        1;

    deskInput:
        VoucherDebitLine[] =
        [];

    deskValid:
        boolean =
        true;

    // Debits as they were when the desk opened (Close discards
    // back to this)
    private deskSnapshot:
        VoucherDebitLine[] =
        [];

    // Close pressed with changes : footer asks to discard
    deskConfirmClose:
        boolean =
        false;

    //===========================================================
    // Voucher No preview / Financial Year
    //===========================================================

    voucherNoText:
        string =
        '';

    period:
        VoucherPeriod | null =
        null;

    periodError:
        string =
        '';

    periodChecking:
        boolean =
        false;

    private periodDate:
        string =
        '';

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
    // Cancel Overlay (Posted)
    //===========================================================

    cancelOpened:
        boolean =
        false;

    cancelDateValue:
        Date | null =
        null;

    cancelReason:
        string =
        '';

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.readLoginBranch();

        this.initializeMode();

        void this.loadSwitches();
    }

    //===========================================================
    // Switches (read by code)
    //===========================================================

    private async loadSwitches():
        Promise<void>
    {
        this.switches =
            await this.switchesService.load();

        this.switchValues =
            this.switchesService.lastValues;

        this.refreshDateWindow();

        this.cdr.detectChanges();
    }

    // Multi Mode Payment Voucher : several payment modes
    get multiMode():
        boolean
    {
        return switchOn(this.switches, VOUCHER_SWITCH.PV_MULTI_MODE, false);
    }

    // Post Payment Voucher On Approval : Approve also posts
    get postOnApproval():
        boolean
    {
        return switchOn(this.switches, VOUCHER_SWITCH.PV_POST_ON_APPROVAL, false);
    }

    // Every payment row is a check : posting writes nothing (the
    // checks post at Check Reconciliation), so Approve always posts
    get checkOnly():
        boolean
    {
        return this.entry.Debits.length > 0
            &&
            this.entry.Debits.every
            (
                line =>
                    line.Mode === 'Check'
            );
    }

    // Approve also posts : switch ON, or a check-only voucher
    get approvePosts():
        boolean
    {
        return this.postOnApproval || this.checkOnly;
    }

    // Payment Voucher : Max Lines (0 = no limit)
    get maxLines():
        number
    {
        return switchNumber(this.switches, this.switchValues, VOUCHER_SWITCH.PV_MAX_LINES);
    }

    // Payment Voucher : Back Dated / Post Dated Entry
    get dateWindow():
        VoucherDateWindow
    {
        return voucherDateWindow(
            this.switches,
            this.switchValues,
            VOUCHER_SWITCH.PV_BACK_DATED,
            VOUCHER_SWITCH.PV_POST_DATED
        );
    }

    // Calendar limits (kept as fields so the calendar is not
    // rebuilt on every check)
    minVoucherDate:
        Date | null =
        null;

    maxVoucherDate:
        Date | null =
        null;

    // Date of the voucher as saved (an unchanged date of an
    // older draft is not checked again)
    private savedVoucherDate =
        '';

    private refreshDateWindow():
        void
    {
        const window =
            this.dateWindow;

        this.minVoucherDate =
            window.min;

        this.maxVoucherDate =
            window.max;
    }

    // Payment Voucher : Allow Print On Approval
    get printOnApproval():
        boolean
    {
        return switchOn(this.switches, VOUCHER_SWITCH.PV_PRINT_ON_APPROVAL, true);
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

    // The voucher's own branch once saved, else the login branch
    get branchId():
        number
    {
        return this.voucher?.BranchId
            ||
            this.loginBranchId;
    }

    get branchName():
        string
    {
        return this.voucher?.BranchName
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
        return this.voucher?.Status
            ||
            'Draft';
    }

    get statusClass():
        string
    {
        return `pvf-status pvf-status-${this.status.toLowerCase()}`;
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

    //===========================================================
    // Steps
    //===========================================================

    // A Check / MFS row needs the Payment Desk
    get needsDesk():
        boolean
    {
        return this.entry.Debits.some
        (
            line =>
                needsDetails(line.Mode)
        );
    }

    // Every Check / MFS row has its step 2 details
    // and is ticked Verified
    get deskComplete():
        boolean
    {
        return this.entry.Debits.every
        (
            line =>
                isDebitRowReady(line)
        );
    }

    //-----------------------------------------------------------
    // Payment Desk modal : progress + footer
    //-----------------------------------------------------------

    get deskRowCount():
        number
    {
        return this.entry.Debits.filter
        (
            line =>
                needsDetails(line.Mode)
        ).length;
    }

    get deskVerifiedCount():
        number
    {
        return this.entry.Debits.filter
        (
            line =>
                needsDetails(line.Mode)
                &&
                isDebitRowReady(line)
        ).length;
    }

    get deskProgress():
        number
    {
        return this.deskRowCount > 0
            ? Math.round(this.deskVerifiedCount * 100 / this.deskRowCount)
            : 100;
    }

    get deskAllVerified():
        boolean
    {
        return this.deskVerifiedCount === this.deskRowCount;
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
            this.deskAllVerified
        )
        {
            return 'All rows verified. Press Okay, then Save.';
        }

        const left =
            this.deskRowCount - this.deskVerifiedCount;

        return `${left} row${left === 1 ? '' : 's'} left to verify.`;
    }

    private get deskChanged():
        boolean
    {
        return JSON.stringify(this.entry.Debits)
            !==
            JSON.stringify(this.deskSnapshot);
    }

    // Header X / footer Close : leave without keeping changes
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

            return;
        }

        this.onBack();
    }

    onDeskKeepEditing():
        void
    {
        this.deskConfirmClose =
            false;
    }

    onDeskDiscard():
        void
    {
        this.entry =
        {
            ...this.entry,

            Debits:
                this.deskSnapshot.map
                (
                    line =>
                    ({
                        ...line
                    })
                )
        };

        this.checkForChanges();

        this.onBack();
    }

    // Save always happens on step 1 : once step 2 is complete
    // (or not needed) Checkout turns into Save
    get isSaveStep():
        boolean
    {
        return this.step === 1
            &&
            (
                !this.needsDesk
                ||
                this.deskComplete
            );
    }

    get canGoNext():
        boolean
    {
        return this.masterValid
            &&
            (
                !this.isEditable
                ||
                !!this.period
            );
    }

    // Detail Narration is required on every voucher
    get narrationMissing():
        boolean
    {
        return !(this.entry.Narration ?? '').trim();
    }

    get nextHint():
        string
    {
        if
        (
            this.isEditable
            &&
            this.periodError
        )
        {
            return this.periodError;
        }

        if
        (
            this.masterValid
        )
        {
            return '';
        }

        return this.narrationMissing
            ? 'Detail Narration is required.'
            : 'Balance the debit and credit first.';
    }

    onNext():
        void
    {
        if
        (
            !this.canGoNext
        )
        {
            this.toast.info(
                'Not Ready',
                this.nextHint || 'Complete step 1 first.'
            );

            return;
        }

        this.deskInput =
            this.entry.Debits.map
            (
                line =>
                ({
                    ...line
                })
            );

        this.deskSnapshot =
            this.entry.Debits.map
            (
                line =>
                ({
                    ...line
                })
            );

        this.deskConfirmClose =
            false;

        this.step =
            2;

        this.cdr.detectChanges();
    }

    // Okay (modal footer) : keep the desk details, back to step 1
    onBack():
        void
    {
        this.deskConfirmClose =
            false;

        // Step 1 gets the debits back with their step 2 details
        this.entryInput =
            this.cloneEntry(
                this.entry
            );

        this.step =
            1;

        this.cdr.detectChanges();
    }

    //===========================================================
    // Header Commands (by mode, status and step; at most 3)
    //
    // Save always happens on step 1. Checkout opens step 2
    // (Payment Desk) for Check / MFS rows; once those
    // details are complete Checkout turns into Save (Checkout
    // stays as a second button to revisit the details).
    //
    // Add          : Checkout, Clear  |  Save, Checkout, Clear
    // Edit (Draft) : Checkout, Approve, Clear  |  Update, Checkout, Approve
    // Step 2       : Done → back to step 1 (View : workflow buttons + Done)
    // Button 1 is always the main action (Save / Update /
    // Approve / Post / Return …); Print is always the last button
    // before the divider.
    // View Draft   : Approve, Edit (+ Checkout)
    // Approved     : Post, Return (+ Print)
    // After any action (Save, Update, Approve, Post, Return,
    // Cancel) the page goes back to the list
    // Posted       : Cancel (+ Checkout), Print
    // Cancelled    : (Checkout), Print
    //
    // Button texts (all vouchers) : Return = back to Draft,
    // Cancel = cancel a posted voucher (command keys unchanged)
    //===========================================================

    private get commandSlots():
        CommandSlot[]
    {
        const save:
            CommandSlot =
        {
            command:'save',
            text:this.isEditMode ? 'Update' : 'Save',
            icon:'fas fa-floppy-disk'
        };

        const clear:
            CommandSlot =
        {
            command:'clear',
            text:'Clear',
            icon:'fas fa-broom'
        };

        const edit:
            CommandSlot =
        {
            command:'edit',
            text:'Edit',
            icon:'fas fa-pen'
        };

        const approve:
            CommandSlot =
        {
            command:'approve',
            text:'Approve',
            icon:'fas fa-circle-check'
        };

        const post:
            CommandSlot =
        {
            command:'post',
            text:'Post',
            icon:'fas fa-paper-plane'
        };

        const returnToDraft:
            CommandSlot =
        {
            command:'return',
            text:'Return',
            icon:'fas fa-rotate-left'
        };

        const cancel:
            CommandSlot =
        {
            command:'cancel',
            text:'Cancel',
            icon:'fas fa-ban'
        };

        const print:
            CommandSlot =
        {
            command:'print',
            text:'Print',
            icon:'fas fa-print'
        };

        const checkout:
            CommandSlot =
        {
            command:'next',
            text:'Checkout',
            icon:'fas fa-cash-register'
        };

        const back:
            CommandSlot =
        {
            command:'back',
            text:'Okay',
            icon:'fas fa-check'
        };

        if
        (
            this.loading
        )
        {
            return [];
        }

        // Step 2 (Payment Desk) : only Back while editing; the
        // workflow buttons stay in View
        if
        (
            this.step === 2
        )
        {
            if
            (
                this.isEditable
            )
            {
                return [back];
            }

            switch
            (
                this.status
            )
            {
                case 'Draft':
                    return [approve, edit, back];

                case 'Approved':
                    return [post, returnToDraft, back];

                case 'Posted':
                    return [cancel, back, print];

                case 'Cancelled':
                    return [back, print];

                default:
                    return [back];
            }
        }

        // Step 1
        //   desk needed, not complete : Checkout
        //   desk complete / not needed : Save (+ Checkout to
        //   revisit the details)
        const reopen:
            CommandSlot[] =
            this.needsDesk
                ? [checkout]
                : [];

        const primary:
            CommandSlot[] =
            this.isSaveStep
                ? [save, ...reopen]
                : [checkout];

        if
        (
            this.isAddMode
        )
        {
            return [...primary, clear].slice(0, 3);
        }

        switch
        (
            this.status
        )
        {
            case 'Draft':

                if
                (
                    this.isEditMode
                )
                {
                    return [...primary, approve, clear].slice(0, 3);
                }

                return [approve, edit, ...reopen];

            // Prints : Posted / Cancelled; Approved when allowed
            case 'Approved':
                return [post, returnToDraft, ...(this.printOnApproval ? [print] : [])];

            case 'Posted':
                return [cancel, ...reopen, print];

            case 'Cancelled':
                return [...reopen, print];

            default:
                return reopen;
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

            case 'post':
                this.onPost();
                break;

            case 'return':
                this.onReturnToDraft();
                break;

            case 'cancel':
                this.openCancel();
                break;

            case 'next':
                this.onNext();
                break;

            case 'back':
                this.onBack();
                break;

            case 'print':
                this.onPrint();
                break;
        }
    }

    //===========================================================
    // Print : opens the Print Viewer in a new tab
    //   /print-viewer/payment-voucher/<id>?doc=all
    // (Payment Voucher + Payment Slip; the viewer refuses Draft)
    //===========================================================

    onPrint():
        void
    {
        const id =
            this.voucher?.PaymentVoucherId
            ??
            0;

        const status =
            String(this.voucher?.Status ?? '');

        if
        (
            !(id > 0)
            ||
            !(
                status === 'Posted'
                ||
                status === 'Cancelled'
                ||
                (status === 'Approved' && this.printOnApproval)
            )
        )
        {
            this.toast.info(
                'Not Printable',
                this.printOnApproval
                    ? 'Prints are available once the voucher is approved.'
                    : 'Prints are available once the voucher is posted.'
            );

            return;
        }

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', 'payment-voucher', id],
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
        this.voucher =
            null;

        this.step =
            1;

        this.entry =
            emptyVoucherEntry(
                toIsoDate(new Date())
            );

        this.entryInput =
            this.cloneEntry(
                this.entry
            );

        this.deskInput =
            [];

        this.total =
            0;

        this.voucherNoText =
            '';

        this.periodDate =
            '';

        this.setInitialFormState();

        if
        (
            !this.loginBranchId
        )
        {
            this.periodError =
                'No login branch. Log in again and choose a branch.';

            this.toast.error(
                'Branch',
                this.periodError
            );
        }
        else
        {
            this.refreshPeriod();
        }

        this.cdr.detectChanges();
    }

    //===========================================================
    // Load Entity (Edit / View)
    //===========================================================

    private loadEntity():
        void
    {
        this.loading =
            true;

        this.paymentVoucherService
            .getById(
                this.entityId
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    item:
                        PaymentVoucher
                ):
                    void =>
                {
                    this.applyVoucher(
                        item
                    );

                    this.loading =
                        false;

                    // Only drafts open in Edit
                    if
                    (
                        this.isEditMode
                        &&
                        item.Status !== 'Draft'
                    )
                    {
                        this.mode =
                            'view';

                        this.toast.info(
                            'View Only',
                            `${item.VoucherNo} is ${item.Status}. Only a draft can be edited.`
                        );
                    }

                    this.setInitialFormState();

                    this.refreshPeriod();

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
                        'Load Payment Voucher Error',
                        error
                    );

                    this.loading =
                        false;

                    this.toast.error(
                        'Load Failed',
                        this.extractErrorMessage(
                            error,
                            'Unable to load the payment voucher.'
                        )
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    private applyVoucher
    (
        item:
            PaymentVoucher
    ):
        void
    {
        this.voucher =
            item;

        this.step =
            1;

        this.voucherNoText =
            item.VoucherNo;

        this.savedVoucherDate =
            item.VoucherDate;

        this.entry =
        {
            VoucherDate:
                item.VoucherDate,

            Narration:
                item.Narration,

            LedgerType:
                (item.LedgerType || '') as CreditLedgerType | '',

            // The entry screen keeps money rows in Debits and
            // account rows in Credits : the server's Credits
            // (Payment Mode) come in as Debits, its Debits (Pay
            // To) as Credits. Saved rows were checked already :
            // load as verified.
            Debits:
                (item.Credits ?? []).map
                (
                    line =>
                    {
                        const row =
                        {
                            ...emptyDebitLine(line.Mode),

                            ...line
                        };

                        return {
                            ...row,

                            Verified:
                                !debitDetailIssue(row)
                        };
                    }
                ),

            Credits:
                (item.Debits ?? []).map
                (
                    line =>
                    ({
                        ...line
                    })
                )
        };

        this.entryInput =
            this.cloneEntry(
                this.entry
            );

        this.deskInput =
            this.entry.Debits.map
            (
                line =>
                ({
                    ...line
                })
            );

        this.total =
            roundMoney(
                item.TotalAmount
            );

        this.periodDate =
            '';
    }

    private cloneEntry
    (
        value:
            VoucherEntryData
    ):
        VoucherEntryData
    {
        return {
            ...value,

            Debits:
                value.Debits.map
                (
                    line =>
                    ({
                        ...line
                    })
                ),

            Credits:
                value.Credits.map
                (
                    line =>
                    ({
                        ...line
                    })
                )
        };
    }

    //===========================================================
    // Financial Year + Voucher No preview (branch + date)
    //===========================================================

    private refreshPeriod():
        void
    {
        const date =
            this.entry.VoucherDate;

        const branchId =
            this.branchId;

        if
        (
            !date
            ||
            !branchId
            ||
            date === this.periodDate
        )
        {
            return;
        }

        this.periodDate =
            date;

        // The old year is not valid for the new date
        this.period =
            null;

        this.periodChecking =
            true;

        this.periodError =
            '';

        //=======================================================
        // Financial year (decides Save)
        //=======================================================

        this.lookup
            .getPeriod(
                branchId,
                date
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    period:
                        VoucherPeriod
                ):
                    void =>
                {
                    if
                    (
                        date !== this.entry.VoucherDate
                    )
                    {
                        return;
                    }

                    this.period =
                        period;

                    this.periodChecking =
                        false;

                    this.cdr.detectChanges();

                    // Add : preview the next number
                    if
                    (
                        this.isAddMode
                    )
                    {
                        this.refreshVoucherNoPreview(
                            branchId,
                            date
                        );
                    }
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    this.onPeriodError(
                        date,
                        error
                    );
                }
            });
    }

    //===========================================================
    // Voucher No preview (Add) : payment-voucher/defaults
    // (repository + CodeGenerator). Display only : the number
    // actually taken on save may be higher.
    //===========================================================

    private refreshVoucherNoPreview
    (
        branchId:
            number,
        date:
            string
    ):
        void
    {
        this.paymentVoucherService
            .getDefaults(
                branchId,
                date
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    defaults:
                        PaymentVoucherDefaults
                ):
                    void =>
                {
                    if
                    (
                        date !== this.entry.VoucherDate
                    )
                    {
                        return;
                    }

                    if
                    (
                        defaults.VoucherNo
                    )
                    {
                        this.voucherNoText =
                            defaults.VoucherNo;

                        this.cdr.detectChanges();

                        return;
                    }

                    console.warn(
                        'Voucher No (payment-voucher/defaults) :',
                        defaults.Message || 'no number returned'
                    );

                    this.platformVoucherNoPreview(
                        branchId,
                        date
                    );
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.warn(
                        'Voucher No (payment-voucher/defaults) failed; using platform/accounting/next-number',
                        error
                    );

                    this.platformVoucherNoPreview(
                        branchId,
                        date
                    );
                }
            });
    }

    // Second source : the platform number service (same number)
    private platformVoucherNoPreview
    (
        branchId:
            number,
        date:
            string
    ):
        void
    {
        this.lookup
            .getNextVoucherNo(
                VOUCHER_PREFIX,
                branchId,
                date
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    preview
                ):
                    void =>
                {
                    if
                    (
                        date !== this.entry.VoucherDate
                    )
                    {
                        return;
                    }

                    this.voucherNoText =
                        preview.VoucherNo;

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
                        'Voucher No preview failed',
                        error
                    );

                    this.voucherNoText =
                        '';

                    this.cdr.detectChanges();
                }
            });
    }

    private onPeriodError
    (
        date:
            string,
        error:
            unknown
    ):
        void
    {
        if
        (
            date !== this.entry.VoucherDate
        )
        {
            return;
        }

        this.period =
            null;

        this.periodChecking =
            false;

        // The same date may be tried again
        this.periodDate =
            '';

        this.voucherNoText =
            this.isAddMode
                ? ''
                : this.voucherNoText;

        this.periodError =
            this.extractErrorMessage(
                error,
                'No open financial year for this date.'
            );

        this.cdr.detectChanges();
    }

    get financialYearText():
        string
    {
        if
        (
            this.periodChecking
        )
        {
            return 'Checking...';
        }

        if
        (
            this.period
        )
        {
            return this.period.FinancialYearName
                ||
                this.period.FinancialYearCode;
        }

        return this.periodError
            ? 'Not open'
            : '-';
    }

    //===========================================================
    // Component Events
    //===========================================================

    onEntryChange
    (
        value:
            VoucherEntryData
    ):
        void
    {
        this.entry =
            value;

        this.refreshPeriod();

        // Back on step 1 with no detail rows left : start again
        if
        (
            !this.needsDesk
        )
        {
            this.step =
                1;
        }

        this.checkForChanges();
    }

    onTotalChange
    (
        value:
            number
    ):
        void
    {
        this.total =
            roundMoney(
                value
            );
    }

    onMasterValidChange
    (
        value:
            boolean
    ):
        void
    {
        this.masterValid =
            value;

        this.cdr.detectChanges();
    }

    onDeskChange
    (
        lines:
            VoucherDebitLine[]
    ):
        void
    {
        this.entry =
        {
            ...this.entry,

            Debits:
                lines.map
                (
                    line =>
                    ({
                        ...line
                    })
                )
        };

        this.checkForChanges();
    }

    onDeskValidChange
    (
        value:
            boolean
    ):
        void
    {
        this.deskValid =
            value;

        this.cdr.detectChanges();
    }

    //===========================================================
    // Change Tracking
    //===========================================================

    private snapshot():
        string
    {
        return JSON.stringify(
            this.buildPayload()
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
            this.snapshot()
            !==
            this.originalState;

        this.cdr.detectChanges();
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
        return formatMoney(
            value
        );
    }

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
            : '';
    }

    //===========================================================
    // Build Payload
    //===========================================================

    private buildPayload():
        CreatePaymentVoucher
    {
        return {
            VoucherDate:
                this.entry.VoucherDate,

            BranchId:
                this.branchId,

            Narration:
                this.entry.Narration?.trim() ?? '',

            // Server : Debits = Pay To (the entry's Credits),
            // Credits = Payment Mode (the entry's Debits)
            Debits:
                this.entry.Credits.map
                (
                    line =>
                    ({
                        ...line,

                        Amount:
                            roundMoney(
                                line.Amount
                            ),

                        ShortNotes:
                            line.ShortNotes?.trim() ?? ''
                    })
                ),

            Credits:
                this.entry.Debits.map
                (
                    ({ Verified: _verified, ...line }) =>
                    ({
                        ...line,

                        Amount:
                            roundMoney(
                                line.Amount
                            ),

                        ShortNotes:
                            line.ShortNotes?.trim() ?? ''
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
            !this.isEditable
            ||
            this.isSaving
        )
        {
            return;
        }

        if
        (
            !this.branchId
        )
        {
            this.toast.error(
                'Branch',
                'No login branch. Log in again and choose a branch.'
            );

            return;
        }

        if
        (
            this.periodChecking
        )
        {
            this.toast.info(
                'Financial Year',
                'Checking the financial year for the voucher date. Try again in a moment.'
            );

            return;
        }

        if
        (
            !this.period
        )
        {
            this.toast.error(
                'Financial Year',
                this.periodError || 'No open financial year for the voucher date.'
            );

            return;
        }

        if
        (
            !this.masterValid
        )
        {
            this.toast.error(
                'Validation',
                this.narrationMissing
                    ? 'Detail Narration is required.'
                    : 'Debit and credit must be entered and equal (Balance Remaining 0.00).'
            );

            this.step =
                1;

            return;
        }

        if
        (
            this.needsDesk
            &&
            !this.deskComplete
        )
        {
            this.toast.error(
                'Validation',
                'Complete and verify every check / MFS row (Checkout).'
            );

            return;
        }

        // Settings "Back Dated / Post Dated Entry" (an older draft
        // keeps its saved date)
        if
        (
            this.entry.VoucherDate !== this.savedVoucherDate
        )
        {
            const dateIssue =
                voucherDateIssue(
                    this.entry.VoucherDate,
                    this.dateWindow
                );

            if
            (
                dateIssue
            )
            {
                this.toast.error(
                    'Validation',
                    dateIssue
                );

                this.step =
                    1;

                return;
            }
        }

        // Setting "Payment Voucher : Max Lines"
        const lines =
            this.entry.Debits.length + this.entry.Credits.length;

        if
        (
            this.maxLines > 0
            &&
            lines > this.maxLines
        )
        {
            this.toast.error(
                'Validation',
                `Maximum ${this.maxLines} lines per voucher; this voucher has ${lines}. Remove ${lines - this.maxLines} row(s).`
            );

            return;
        }

        if
        (
            this.isAddMode
        )
        {
            this.saveCreate();

            return;
        }

        this.saveUpdate();
    }

    private saveCreate():
        void
    {
        const model:
            CreatePaymentVoucher =
            this.buildPayload();

        const previewNo =
            this.voucherNoText;

        this.startProgress(
            'Saving Payment Voucher',
            'Please wait while the payment voucher is being saved as a draft...'
        );

        this.withMinimumDuration(
            this.paymentVoucherService.create(
                model
            )
        )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe
        ({
            next:
            (
                saved:
                    PaymentVoucherSaved
            ):
                void =>
            {
                this.completeProgress(
                    'Payment voucher saved.',
                    () =>
                    {
                        this.setInitialFormState();

                        const note =
                            previewNo
                            &&
                            saved.VoucherNo
                            &&
                            previewNo !== saved.VoucherNo
                                ? ` (${previewNo} was taken by another entry)`
                                : '';

                        this.toast.success(
                            'Saved as Draft',
                            `Payment voucher ${saved.VoucherNo} saved${note}.`
                        );

                        this.onBackToList();
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
                    'Create Payment Voucher Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to save the payment voucher.'
                            )
                        );
                    }
                );
            }
        });
    }

    private saveUpdate():
        void
    {
        const id:
            number =
            this.voucher?.PaymentVoucherId
            ||
            this.entityId;

        if
        (
            !(id > 0)
        )
        {
            this.toast.error(
                'Validation',
                'Invalid payment voucher. Please reload the page and try again.'
            );

            return;
        }

        const model:
            UpdatePaymentVoucher =
        {
            PaymentVoucherId:
                id,

            ...this.buildPayload()
        };

        this.startProgress(
            'Updating Payment Voucher',
            'Please wait while the draft is being updated...'
        );

        this.withMinimumDuration(
            this.paymentVoucherService.update(
                model
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
                    'Payment voucher updated.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'Payment voucher updated successfully.'
                        );

                        this.onBackToList();
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
                    'Update Payment Voucher Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to update the payment voucher.'
                            )
                        );
                    }
                );
            }
        });
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
            'Approve Payment Voucher',
            this.checkOnly
                ? `Approve ${this.voucher?.VoucherNo ?? 'this voucher'} for ${this.money(this.total)}? It is posted at once and its checks go to Check Reconciliation (they post when cleared).`
                : this.postOnApproval
                    ? `Approve and post ${this.voucher?.VoucherNo ?? 'this voucher'} for ${this.money(this.total)}? Posting writes the ledger entries.`
                    : `Approve ${this.voucher?.VoucherNo ?? 'this voucher'} for ${this.money(this.total)}?`,
            () =>
                setTimeout(
                    () =>
                        this.runWorkflow(
                            this.approvePosts ? 'Approving and Posting' : 'Approving Payment Voucher',
                            this.checkOnly
                                ? 'Payment voucher approved and posted; its checks are in Check Reconciliation.'
                                : this.postOnApproval ? 'Payment voucher approved and posted.' : 'Payment voucher approved.',
                            id =>
                                this.paymentVoucherService.approve(id),
                            'list'
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
            `Return ${this.voucher?.VoucherNo ?? 'this voucher'} to Draft so it can be edited?`,
            () =>
                setTimeout(
                    () =>
                        this.runWorkflow(
                            'Returning to Draft',
                            'Payment voucher returned to draft.',
                            id =>
                                this.paymentVoucherService.returnToDraft(id),
                            'list'
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
        const note =
            this.checkOnly
                ? ' Checks post nothing now; they post at Check Reconciliation.'
                : '';

        this.confirmDialog.open(
            'Post Payment Voucher',
            `Post ${this.voucher?.VoucherNo ?? 'this voucher'} to the ledgers? A posted voucher can only be cancelled.${note}`,
            () =>
                setTimeout(
                    () =>
                        this.runWorkflow(
                            'Posting Payment Voucher',
                            'Payment voucher posted.',
                            id =>
                                this.paymentVoucherService.post(id),
                            'list'
                        )
                ),
            'Post',
            'Cancel',
            'primary'
        );
    }

    //===========================================================
    // Cancel (Posted) : overlay asks for date and reason
    //===========================================================

    openCancel():
        void
    {
        this.cancelDateValue =
            new Date();

        this.cancelReason =
            '';

        this.cancelOpened =
            true;

        this.cdr.detectChanges();
    }

    closeCancel():
        void
    {
        if
        (
            this.isSaving
        )
        {
            return;
        }

        this.cancelOpened =
            false;

        this.cdr.detectChanges();
    }

    onCancelDateChange
    (
        value:
            Date | null
    ):
        void
    {
        this.cancelDateValue =
            value;
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
    }

    confirmCancel():
        void
    {
        if
        (
            this.isSaving
        )
        {
            return;
        }

        const reason =
            this.cancelReason.trim();

        if
        (
            !reason
        )
        {
            this.toast.error(
                'Validation',
                'Reason is required to cancel a posted voucher.'
            );

            return;
        }

        if
        (
            !this.cancelDateValue
        )
        {
            this.toast.error(
                'Validation',
                'Cancel Date is required.'
            );

            return;
        }

        const model =
        {
            CancelDate:
                toIsoDate(
                    this.cancelDateValue
                ),

            Reason:
                reason
        };

        this.cancelOpened =
            false;

        this.runWorkflow(
            'Cancelling Payment Voucher',
            'Payment voucher cancelled.',
            id =>
                this.paymentVoucherService.cancel(
                    id,
                    model
                ),
            'list'
        );
    }

    //===========================================================
    // Run a workflow command, then open the list
    // (every action : Save, Update, Approve, Post, Return,
    //  Cancel ends on the list page)
    //===========================================================

    private runWorkflow
    (
        title:
            string,

        doneMessage:
            string,

        call:
            (id: number) => Observable<void>,

        nextMode:
            'edit' | 'view' | 'list'
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
            this.voucher?.PaymentVoucherId
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

                        if
                        (
                            nextMode === 'list'
                        )
                        {
                            void this.router.navigate(
                                this.listRoute
                            );

                            return;
                        }

                        if
                        (
                            this.mode === nextMode
                        )
                        {
                            this.loadEntity();

                            return;
                        }

                        this.goTo(
                            nextMode
                        );
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
    // Navigation
    //===========================================================

    private goTo
    (
        mode:
            'edit' | 'view'
    ):
        void
    {
        void this.router.navigate(
            [
                '/accounts-finance',
                'voucher-management',
                'payment-voucher',
                mode,
                this.entityId
            ]
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
            void this.router.navigate(
                this.listRoute
            );

            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            () =>
            {
                void this.router.navigate(
                    this.listRoute
                );
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