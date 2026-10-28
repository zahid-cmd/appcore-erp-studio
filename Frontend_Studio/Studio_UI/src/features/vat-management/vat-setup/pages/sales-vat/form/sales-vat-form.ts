//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
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
    PageToolbarComponent
}
from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    PageCanvasComponent
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    FormGridComponent
}
from '../../../../../../shared/components/layout/form-grid/form-grid';

import
{
    FormSectionComponent
}
from '../../../../../../shared/components/layout/form-section/form-section';

//===============================================================
// Form Controls
//===============================================================

import
{
    TextboxComponent
}
from '../../../../../../shared/components/controls/textbox/textbox';

import
{
    TextareaComponent
}
from '../../../../../../shared/components/controls/textarea/textarea';

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

//===============================================================
// Utilities
//===============================================================

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

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
// Models & Services
//===============================================================

import
{
    SalesVat,
    CreateSalesVat,
    UpdateSalesVat,
    SalesVatDefaults
}
from '../../../models/sales-vat.model';

import
{
    SalesVatService
}
from '../../../services/sales-vat.service';

import
{
    DatepickerComponent
}
from '../../../../../../shared/components/controls/datepicker/datepicker';

import
{
    fromIsoDate,
    toIsoDate
}
from '../../../../../../shared/components/accounting/accounting.models';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'sales-vat-form',

    standalone:true,

    imports:
    [
        CommonModule,
        FormsModule,

        //=======================================================
        // Layout
        //=======================================================

        PageHeaderComponent,
        PageToolbarComponent,
        CommandCenterComponent,
        ControlTabsComponent,
        PageCanvasComponent,
        FormGridComponent,
        FormSectionComponent,

        //=======================================================
        // Form Controls
        //=======================================================

        TextboxComponent,
        SearchDropdownComponent,
        TextareaComponent,
        DropdownComponent,
        DatepickerComponent,

        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./sales-vat-form.html',

    styleUrls:
    [
        './sales-vat-form.css'
    ]
})

//===============================================================
// Sales VAT Form
//
// VAT Information (code, VAT Type, remarks) · Rate (VAT %,
// Price Includes VAT) · Period (Effective From, Valid Until, state) ·
// Ledger & Status. VAT Type is locked after saving; changing the
// rate of a saved rule asks first (records that used it follow).
//===============================================================

export class SalesVatForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly vatService =
        inject(SalesVatService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Progress Configuration
    //===========================================================

    private readonly MIN_PROGRESS_MS:
        number =
        5000;

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

    // Prevents double submit while Save / Update is running
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

    //===========================================================
    // Page Header / Tabs
    //===========================================================

    pageTitle:
        string =
        'Sales VAT';

    entityName:
        string =
        'Sales VAT Rule';

    selectedTab:
        string =
        'general';

    get tabs():
        ControlTab[]
    {
        return [
            {
                id:'general',
                label:this.tabTitle
            }
        ];
    }

    get tabTitle():
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

            case 'view':
                return `View ${this.entityName}`;

            default:
                return this.entityName;
        }
    }

    //===========================================================
    // Defaults (VAT types, ledgers, suggested ledger per type)
    //===========================================================

    private defaults:
        SalesVatDefaults | null =
        null;


    //===========================================================
    // Dropdown Items (fields, not getters : a getter returning a
    // new array makes the dropdown lose its first click)
    //===========================================================

    statusItems:
        any[] =
    [
        { label:'Active', value:true },
        { label:'Inactive', value:false }
    ];


    flagItems:
        any[] =
    [
        { label:'Yes', value:true },
        { label:'No', value:false }
    ];


    typeItems:
        any[] =
    [];


    ledgerItems:
        any[] =
        [];


    //===========================================================
    // Entity + typed rate (typed as text, parsed on save)
    //===========================================================

    entity:
        SalesVat =
        this.createEmptyEntity();


    rateText:
        string =
        '';


    // Datepicker value (a field : a getter would make a new Date
    // on every check)
    effectiveFromDate:
        Date | null =
        null;


    validToDate:
        Date | null =
        null;


    // The ledger the rule was loaded with (kept even if inactive)
    private savedLedgerCode:
        string =
        '';


    // The rate the rule was loaded with (a change asks first)
    private savedRate:
        number =
        0;


    private originalState:
        string =
        '';


    hasChanges:
        boolean =
        false;



    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.initializeMode();

        this.loadDefaults();
    }



    //===========================================================
    // Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        this.clearProgressTimer();

        if
        (
            this.isSaving
        )
        {
            this.progressDialog.close();
        }
    }



    //===========================================================
    // Empty Entity
    //===========================================================

    private createEmptyEntity():
        SalesVat
    {
        return {
            SalesVatId:0,
            VatCode:'',
            VatType:'',
            VatRate:0,
            PriceIncludesVat:true,
            EffectiveFrom:'',
            ValidTo:'',
            DaysToExpiry:0,
            RateState:'',
            LedgerCode:'',
            LedgerName:'',
            Remarks:'',
            Status:true
        };
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

    //===========================================================
    // Initialize Entity (Add) : Effective From = today
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
            this.createEmptyEntity();

        this.entity.VatCode =
            this.defaults?.Code ?? '';

        this.entity.EffectiveFrom =
            this.defaults?.Today || toIsoDate(new Date());

        this.entity.ValidTo =
            this.defaults?.DefaultValidTo ?? '';

        this.savedLedgerCode =
            '';

        this.savedRate =
            0;

        this.loadTexts();

        this.buildTypeItems();

        this.buildLedgerItems();

        this.setInitialFormState();
    }



    //===========================================================
    // Load Defaults
    //===========================================================

    private loadDefaults():
        void
    {
        this.vatService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        SalesVatDefaults
                ):
                    void =>
                {
                    this.defaults =
                        response;

                    this.buildTypeItems();

                    this.buildLedgerItems();

                    if
                    (
                        this.isAddMode
                    )
                    {
                        const pristine =
                            !this.hasChanges;

                        this.entity.VatCode =
                            response.Code;

                        if
                        (
                            response.Today
                            &&
                            pristine
                        )
                        {
                            this.entity.EffectiveFrom =
                                response.Today;

                            this.effectiveFromDate =
                                fromIsoDate(response.Today);

                            this.entity.ValidTo =
                                response.DefaultValidTo;

                            this.validToDate =
                                fromIsoDate(response.DefaultValidTo);
                        }

                        // Code / today are not user changes
                        if
                        (
                            pristine
                        )
                        {
                            this.setInitialFormState();
                        }
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
                        'Load Sales VAT Defaults Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load the VAT types and ledgers.'
                        )
                    );
                }
            });
    }



    //===========================================================
    // Load Entity (Edit / View)
    //===========================================================

    private loadEntity():
        void
    {
        this.vatService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        SalesVat
                ):
                    void =>
                {
                    this.entity =
                    {
                        ...response,

                        SalesVatId:
                            response.SalesVatId
                            ||
                            this.entityId
                    };

                    this.savedLedgerCode =
                        this.entity.LedgerCode;

                    this.savedRate =
                        this.entity.VatRate;

                    this.loadTexts();

                    this.buildTypeItems();

                    this.buildLedgerItems();

                    this.setInitialFormState();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Sales VAT Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load the Sales VAT rule.'
                        )
                    );

                    this.hasChanges =
                        false;

                    this.onBackToList();
                }
            });
    }


    // Entity → typed rate and picker date
    private loadTexts():
        void
    {
        this.rateText =
            this.entity.VatRate
                ? String(this.entity.VatRate)
                : '';

        this.effectiveFromDate =
            fromIsoDate(this.entity.EffectiveFrom);

        this.validToDate =
            fromIsoDate(this.entity.ValidTo);
    }



    //===========================================================
    // VAT Types (fixed list from the server; the saved one kept)
    //===========================================================

    private buildTypeItems():
        void
    {
        const types =
            [...(this.defaults?.VatTypes ?? [])];

        if
        (
            this.entity.VatType
            &&
            !types.includes(this.entity.VatType)
        )
        {
            types.unshift(
                this.entity.VatType
            );
        }

        this.typeItems =
            types.map
            (
                type =>
                ({
                    label:type,
                    value:type
                })
            );
    }



    //===========================================================
    // Ledgers : active VAT Current Account ledgers + the saved
    // one; shown as "Name || Code"
    //===========================================================

    private buildLedgerItems():
        void
    {
        const saved =
            this.savedLedgerCode;

        const items =
            (this.defaults?.Ledgers ?? [])
                .filter
                (
                    ledger =>
                        ledger.IsActive
                        ||
                        ledger.LedgerCode === saved
                )
                .map
                (
                    ledger =>
                    ({
                        label:
                            `${ledger.LedgerName} || ${ledger.LedgerCode}`
                            +
                            (ledger.IsActive ? '' : ' (inactive)'),

                        value:
                            ledger.LedgerCode
                    })
                );

        if
        (
            saved
            &&
            !items.some(item => item.value === saved)
        )
        {
            items.unshift
            ({
                label:
                    `${this.entity.LedgerName || saved} || ${saved}`,

                value:
                    saved
            });
        }

        this.ledgerItems =
            items;
    }



    //===========================================================
    // Field Changes
    //===========================================================

    private unwrap
    (
        value:
            any
    ):
        any
    {
        return value
            &&
            typeof value === 'object'
            &&
            'value' in value
                ? value.value
                : value;
    }


    // A new type pre-selects the ledger its latest rule used
    onTypeChange
    (
        value:
            any
    ):
        void
    {
        const type =
            this.unwrap(value);

        this.entity.VatType =
            type == null
                ? ''
                : String(type);

        const suggested =
            this.defaults?.SuggestedLedgers?.[this.entity.VatType] ?? '';

        if
        (
            suggested
            &&
            (this.defaults?.Ledgers ?? []).some(ledger => ledger.LedgerCode === suggested && ledger.IsActive)
        )
        {
            this.entity.LedgerCode =
                suggested;
        }

        this.onValueChange();
    }


    onLedgerChange
    (
        value:
            any
    ):
        void
    {
        const code =
            this.unwrap(value);

        this.entity.LedgerCode =
            code == null
                ? ''
                : String(code);

        this.onValueChange();
    }


    onFlagChange
    (
        value:
            any
    ):
        void
    {
        this.entity.PriceIncludesVat =
            Boolean(this.unwrap(value));

        this.onValueChange();
    }


    onEffectiveFrom
    (
        value:
            Date | null
    ):
        void
    {
        this.effectiveFromDate =
            value;

        this.entity.EffectiveFrom =
            value
                ? toIsoDate(value)
                : '';

        this.onValueChange();
    }


    onValidTo
    (
        value:
            Date | null
    ):
        void
    {
        this.validToDate =
            value;

        this.entity.ValidTo =
            value
                ? toIsoDate(value)
                : '';

        this.onValueChange();
    }


    onRateText
    (
        value:
            string | number
    ):
        void
    {
        this.rateText =
            String(value ?? '');

        this.onValueChange();
    }



    //===========================================================
    // Read-only period texts
    //===========================================================

    get rateStateText():
        string
    {
        if
        (
            this.isAddMode
        )
        {
            return '';
        }

        const days =
            this.entity.DaysToExpiry;

        switch
        (
            this.entity.RateState
        )
        {
            case 'Expiring':
                return `Expiring in ${days} day${days === 1 ? '' : 's'}`;

            case 'Expired':
                return `Expired ${-days} day${days === -1 ? '' : 's'} ago`;

            default:
                return this.entity.RateState;
        }
    }


    // Extend : shown for saved, active rules
    get canExtend():
        boolean
    {
        return !this.isAddMode
            &&
            this.entity.Status
            &&
            !!this.entity.ValidTo;
    }


    // The 30 June after the current Valid To
    private nextValidTo():
        string
    {
        const current =
            fromIsoDate(this.entity.ValidTo);

        if
        (
            !current
        )
        {
            return '';
        }

        const dayAfter =
            new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);

        const june30 =
            new Date(dayAfter.getFullYear(), 5, 30);

        return toIsoDate(
            dayAfter <= june30
                ? june30
                : new Date(dayAfter.getFullYear() + 1, 5, 30)
        );
    }


    onExtend():
        void
    {
        if
        (
            this.isSaving
            ||
            !this.canExtend
        )
        {
            return;
        }

        if
        (
            this.hasChanges
        )
        {
            this.toast.error(
                'Validation',
                'Save or clear your changes first, then extend the rule.'
            );

            return;
        }

        const validTo =
            this.nextValidTo();

        this.confirmDialog.open(
            'Extend Rule',
            `Keep ${this.entity.VatType} at ${this.entity.VatRate}% and extend rule ${this.entity.VatCode} from ${this.displayDate(this.entity.ValidTo)} to ${this.displayDate(validTo)}?`,
            () =>
            {
                this.saveExtend(
                    validTo
                );
            },
            'Extend',
            'Cancel',
            'primary'
        );
    }


    private saveExtend
    (
        validTo:
            string
    ):
        void
    {
        this.startProgress(
            'Extending Sales VAT Rule',
            'Please wait while the rule is being extended...'
        );

        this.withMinimumDuration(
            this.vatService.extend(
            {
                SalesVatId:
                    this.entity.SalesVatId || this.entityId,

                ValidTo:
                    validTo
            })
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Sales VAT rule extended.',
                    () =>
                    {
                        this.toast.success(
                            'Success',
                            `Rule ${this.entity.VatCode} extended to ${this.displayDate(validTo)}.`
                        );

                        this.loadEntity();
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
                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to extend the Sales VAT rule.'
                            )
                        );
                    }
                );
            }
        });
    }


    // yyyy-MM-dd → dd-MM-yyyy
    private displayDate
    (
        value:
            string
    ):
        string
    {
        const [year, month, day] =
            (value ?? '').split('-');

        return year && month && day
            ? `${day}-${month}-${year}`
            : value;
    }



    //===========================================================
    // Track Changes
    //===========================================================

    private snapshot():
        string
    {
        return JSON.stringify(
        {
            entity:
                this.entity,

            rate:
                this.rateText
        });
    }


    private setInitialFormState():
        void
    {
        this.originalState =
            this.snapshot();

        this.hasChanges =
            false;

        this.cdr.detectChanges();
    }


    checkForChanges():
        void
    {
        this.hasChanges =
            this.snapshot() !==
            this.originalState;
    }


    onTabChange
    (
        tabId:
            string
    ):
        void
    {
        this.selectedTab =
            tabId;
    }



    //===========================================================
    // Rate Check : 0 – 100, at most 2 decimals (null = invalid)
    //===========================================================

    private readonly RATE_TEXT =
        /^\d{1,3}(\.\d{0,2})?$/;


    private readRate():
        number | null
    {
        const value =
            (this.rateText ?? '').trim();

        if
        (
            !value
        )
        {
            return null;
        }

        if
        (
            !this.RATE_TEXT.test(value)
        )
        {
            return null;
        }

        const rate =
            Number(value);

        return rate >= 0 && rate <= 100
            ? rate
            : null;
    }


    private validationIssue():
        string
    {
        if
        (
            !this.entity.VatType
        )
        {
            return 'VAT Type is required.';
        }

        if
        (
            this.readRate() === null
        )
        {
            return 'VAT Rate must be a number from 0 to 100, with at most 2 decimals.';
        }

        if
        (
            !this.entity.EffectiveFrom
        )
        {
            return 'Effective From is required.';
        }

        if
        (
            !this.entity.ValidTo
        )
        {
            return 'Valid To is required.';
        }

        if
        (
            this.entity.ValidTo < this.entity.EffectiveFrom
        )
        {
            return 'Valid To cannot be before Effective From.';
        }

        if
        (
            !this.entity.LedgerCode
        )
        {
            return 'VAT Current Account is required.';
        }

        return '';
    }



    //===========================================================
    // Extract Error Message
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
                            (this.PROGRESS_CEILING - this.progressValue) * 0.05
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

        window.setTimeout(
            () =>
            {
                this.progressDialog.close();

                this.isSaving =
                    false;

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

    //===========================================================
    // Minimum Progress Duration
    //===========================================================

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
    // Save
    //===========================================================

    onSave():
        void
    {
        if
        (
            this.isViewMode
            ||
            this.isSaving
        )
        {
            return;
        }

        const issue =
            this.validationIssue();

        if
        (
            issue
        )
        {
            this.toast.error(
                'Validation',
                issue
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

        const newRate =
            this.readRate() ?? 0;

        if
        (
            newRate !== this.savedRate
        )
        {
            this.confirmDialog.open(
                'Change VAT Rate',
                `The rate changes from ${this.savedRate}% to ${newRate}%. Records that used this rule will follow the new rate. Continue?`,
                () =>
                {
                    this.saveUpdate();
                },
                'Change Rate',
                'Cancel',
                'primary'
            );

            return;
        }

        this.saveUpdate();
    }

    //===========================================================
    // Build Payload
    //===========================================================

    private buildPayload():
        CreateSalesVat
    {
        return {
            VatType:
                this.entity.VatType,

            VatRate:
                this.readRate() ?? 0,

            PriceIncludesVat:
                this.entity.PriceIncludesVat,

            EffectiveFrom:
                this.entity.EffectiveFrom,

            ValidTo:
                this.entity.ValidTo,

            LedgerCode:
                this.entity.LedgerCode,

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            Status:
                this.entity.Status
        };
    }



    //===========================================================
    // Create
    //===========================================================

    private saveCreate():
        void
    {
        const model:
            CreateSalesVat =
            this.buildPayload();

        this.startProgress(
            'Saving Sales VAT Rule',
            'Please wait while the Sales VAT rule is being saved...'
        );

        this.withMinimumDuration(
            this.vatService.create(
                model
            )
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Sales VAT rule saved.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'Sales VAT rule created successfully.'
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
                    'Create Sales VAT rule Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to create Sales VAT rule.'
                            )
                        );
                    }
                );
            }
        });
    }

    //===========================================================
    // Update
    //===========================================================

    private saveUpdate():
        void
    {
        const id:
            number =
            this.entity.SalesVatId
            ||
            this.entityId;

        if
        (
            !id
            ||
            id <= 0
        )
        {
            this.toast.error(
                'Validation',
                'Invalid Sales VAT rule. Please reload the page and try again.'
            );

            return;
        }

        const model:
            UpdateSalesVat =
        {
            SalesVatId:
                id,

            ...this.buildPayload()
        };

        this.startProgress(
            'Updating Sales VAT Rule',
            'Please wait while the Sales VAT rule is being updated...'
        );

        this.withMinimumDuration(
            this.vatService.update(
                model
            )
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Sales VAT rule updated.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'Sales VAT rule updated successfully.'
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
                    'Update Sales VAT rule Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to update Sales VAT rule.'
                            )
                        );
                    }
                );
            }
        });
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

        const listRoute =
        [
            '/vat-management',
            'vat-setup',
            'sales-vat',
            'list'
        ];

        if
        (
            !this.hasChanges
        )
        {
            void this.router.navigate(
                listRoute
            );

            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            () =>
            {
                void this.router.navigate(
                    listRoute
                );
            },
            'Leave',
            'Stay',
            'primary'
        );
    }

    //===========================================================
    // Save Button Text
    //===========================================================

    get saveButtonText():
        string
    {
        return this.isEditMode
            ? 'Update'
            : 'Save';
    }

    //===========================================================
    // Mode Helpers
    //===========================================================

    get isViewMode():
        boolean
    {
        return this.mode === 'view';
    }

    get isEditMode():
        boolean
    {
        return this.mode === 'edit';
    }

    get isAddMode():
        boolean
    {
        return this.mode === 'add';
    }

    //===========================================================
    // Close
    //===========================================================

    close():
        void
    {
        this.onBackToList();
    }

    //===========================================================
    // Refresh
    //===========================================================

    refresh():
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
            this.isEditMode
            ||
            this.isViewMode
        )
        {
            this.loadEntity();

            return;
        }

        this.initializeEntity();
    }

    //===========================================================
    // Value Changed
    //===========================================================

    onValueChange():
        void
    {
        this.checkForChanges();

        this.cdr.detectChanges();
    }
}