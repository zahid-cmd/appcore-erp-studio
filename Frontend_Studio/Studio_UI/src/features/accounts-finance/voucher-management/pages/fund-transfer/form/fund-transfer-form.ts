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
    TransferEntryComponent
}
from '../../../../../../shared/components/accounting/transfer-entry/transfer-entry';

import
{
    TransferEntryData,
    emptyTransferEntry
}
from '../../../../../../shared/components/accounting/transfer-entry/transfer-entry.models';

import
{
    AccountingLookupService
}
from '../../../../../../shared/components/accounting/accounting-lookup.service';

import
{
    VoucherPeriod,
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
    FundTransfer,
    FundTransferSaved,
    FundTransferDefaults,
    CreateFundTransfer,
    UpdateFundTransfer
}
from '../../../models/fund-transfer.model';

import
{
    FundTransferService
}
from '../../../services/fund-transfer.service';

//===============================================================
// Header Commands
//===============================================================

type FormCommand =
    'save' | 'clear' | 'edit' | 'approve' | 'post' | 'return' | 'cancel' | 'print' | '';

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
    'FT';

//===============================================================
// Component
//
// Fund Transfer : one page
//
//   Header  : Branch (login branch) + Financial Year chips,
//             status in the center, commands on the right
//   Body    : Transfer Entry (Transfer From / To cards,
//             narration, summary; switch 0023 allows several
//             From / To rows)
//
// The voucher number is only previewed; the real one is taken
// when the draft is first saved.
//===============================================================

@Component(
{
    selector:'fund-transfer-form',

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

        TransferEntryComponent,

        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,
        OrbitLoaderComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./fund-transfer-form.html',

    styleUrls:
    [
        './fund-transfer-form.css'
    ]
})

//===============================================================
// Fund Transfer Form
//===============================================================

export class FundTransferForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly fundTransferService =
        inject(FundTransferService);

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
        'fund-transfer',
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
        'Fund Transfer';

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
        FundTransfer | null =
        null;

    //===========================================================
    // Transfer Entry
    //
    // entryInput : what the component is given (load / clear
    //              only, so typing is never reset)
    // entry      : the latest value
    //===========================================================

    entryInput:
        TransferEntryData | null =
        null;

    entry:
        TransferEntryData =
        emptyTransferEntry(
            toIsoDate(new Date())
        );

    total:
        number =
        0;

    masterValid:
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

    // Post Fund Transfer On Approval : Approve also posts
    // Multi Mode Fund Transfer : several From / To rows
    get multiMode():
        boolean
    {
        return switchOn(this.switches, VOUCHER_SWITCH.FT_MULTI_MODE, false);
    }

    get postOnApproval():
        boolean
    {
        return switchOn(this.switches, VOUCHER_SWITCH.FT_POST_ON_APPROVAL, false);
    }

    // Fund Transfer : Max Lines (0 = no limit)
    get maxLines():
        number
    {
        return switchNumber(this.switches, this.switchValues, VOUCHER_SWITCH.FT_MAX_LINES);
    }

    // Fund Transfer : Back Dated / Post Dated Entry
    get dateWindow():
        VoucherDateWindow
    {
        return voucherDateWindow(
            this.switches,
            this.switchValues,
            VOUCHER_SWITCH.FT_BACK_DATED,
            VOUCHER_SWITCH.FT_POST_DATED
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

    // Fund Transfer : Allow Print On Approval
    get printOnApproval():
        boolean
    {
        return switchOn(this.switches, VOUCHER_SWITCH.FT_PRINT_ON_APPROVAL, true);
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
        return `ftf-status ftf-status-${this.status.toLowerCase()}`;
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
    // Ready to save
    //===========================================================

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

    //===========================================================
    // Header Commands (by mode and status; at most 3)
    //
    // Button 1 is always the main action (Save / Update /
    // Approve / Post / Return …); Print is always the last button
    // before the divider.
    //
    // Add          : Save, Clear
    // Edit (Draft) : Update, Approve, Clear
    // View Draft   : Approve, Edit
    // Approved     : Post, Return (+ Print)
    // Posted       : Cancel, Print
    // Cancelled    : Print
    // After any action (Save, Update, Approve, Post, Return,
    // Cancel) the page goes back to the list
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

            // Prints : Posted / Cancelled; Approved when allowed
            case 'Approved':
                return [post, returnToDraft, ...(this.printOnApproval ? [print] : [])];

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
                this.onPrint();
                break;
        }
    }

    //===========================================================
    // Print : opens the Print Viewer in a new tab
    //   /print-viewer/fund-transfer/<id>?doc=all
    // (Fund Transfer + Fund Transfer Advice; the viewer refuses Draft)
    //===========================================================

    onPrint():
        void
    {
        const id =
            this.voucher?.FundTransferId
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
                    ['/print-viewer', 'fund-transfer', id],
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

        this.entry =
            emptyTransferEntry(
                toIsoDate(new Date())
            );

        this.entryInput =
            this.cloneEntry(
                this.entry
            );

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

        this.fundTransferService
            .getById(
                this.entityId
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    item:
                        FundTransfer
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
                        'Load Fund Transfer Error',
                        error
                    );

                    this.loading =
                        false;

                    this.toast.error(
                        'Load Failed',
                        this.extractErrorMessage(
                            error,
                            'Unable to load the fund transfer.'
                        )
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    private applyVoucher
    (
        item:
            FundTransfer
    ):
        void
    {
        this.voucher =
            item;

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

            Lines:
                (item.Lines ?? []).map
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
            TransferEntryData
    ):
        TransferEntryData
    {
        return {
            ...value,

            Lines:
                value.Lines.map
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
    // Voucher No preview (Add) : fund-transfer/defaults
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
        this.fundTransferService
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
                        FundTransferDefaults
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
                        'Voucher No (fund-transfer/defaults) :',
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
                        'Voucher No (fund-transfer/defaults) failed; using platform/accounting/next-number',
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
            TransferEntryData
    ):
        void
    {
        this.entry =
            value;

        this.refreshPeriod();

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
        CreateFundTransfer
    {
        return {
            VoucherDate:
                this.entry.VoucherDate,

            BranchId:
                this.branchId,

            Narration:
                this.entry.Narration?.trim() ?? '',

            Lines:
                this.entry.Lines.map
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
                    : 'Transfer From and Transfer To must be equal (Balance Remaining 0.00).'
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

                return;
            }
        }

        // Setting "Fund Transfer : Max Lines"
        const lines =
            this.entry.Lines.length;

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
            CreateFundTransfer =
            this.buildPayload();

        const previewNo =
            this.voucherNoText;

        this.startProgress(
            'Saving Fund Transfer',
            'Please wait while the fund transfer is being saved as a draft...'
        );

        this.withMinimumDuration(
            this.fundTransferService.create(
                model
            )
        )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe
        ({
            next:
            (
                saved:
                    FundTransferSaved
            ):
                void =>
            {
                this.completeProgress(
                    'Fund transfer saved.',
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
                            `Fund transfer ${saved.VoucherNo} saved${note}.`
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
                    'Create Fund Transfer Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to save the fund transfer.'
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
            this.voucher?.FundTransferId
            ||
            this.entityId;

        if
        (
            !(id > 0)
        )
        {
            this.toast.error(
                'Validation',
                'Invalid fund transfer. Please reload the page and try again.'
            );

            return;
        }

        const model:
            UpdateFundTransfer =
        {
            FundTransferId:
                id,

            ...this.buildPayload()
        };

        this.startProgress(
            'Updating Fund Transfer',
            'Please wait while the draft is being updated...'
        );

        this.withMinimumDuration(
            this.fundTransferService.update(
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
                    'Fund transfer updated.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'Fund transfer updated successfully.'
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
                    'Update Fund Transfer Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to update the fund transfer.'
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
            'Approve Fund Transfer',
            this.postOnApproval
                ? `Approve and post ${this.voucher?.VoucherNo ?? 'this voucher'} for ${this.money(this.total)}? Posting writes the ledger entries.`
                : `Approve ${this.voucher?.VoucherNo ?? 'this voucher'} for ${this.money(this.total)}?`,
            () =>
                setTimeout(
                    () =>
                        this.runWorkflow(
                            this.postOnApproval ? 'Approving and Posting' : 'Approving Fund Transfer',
                            this.postOnApproval ? 'Fund transfer approved and posted.' : 'Fund transfer approved.',
                            id =>
                                this.fundTransferService.approve(id),
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
                            'Fund transfer returned to draft.',
                            id =>
                                this.fundTransferService.returnToDraft(id),
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
            '';

        this.confirmDialog.open(
            'Post Fund Transfer',
            `Post ${this.voucher?.VoucherNo ?? 'this voucher'} to the ledgers? A posted voucher can only be cancelled.${note}`,
            () =>
                setTimeout(
                    () =>
                        this.runWorkflow(
                            'Posting Fund Transfer',
                            'Fund transfer posted.',
                            id =>
                                this.fundTransferService.post(id),
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
            'Cancelling Fund Transfer',
            'Fund transfer cancelled.',
            id =>
                this.fundTransferService.cancel(
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
            this.voucher?.FundTransferId
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
                'fund-transfer',
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