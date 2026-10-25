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
    EmiReimbursementSchemes,
    CreateEmiReimbursementSchemes,
    UpdateEmiReimbursementSchemes,
    EmiReimbursementSchemesDefaults,
    EmiSchemeBasis
}
from '../../../models/emi-reimbursement-schemes.model';

import
{
    EmiReimbursementSchemesService
}
from '../../../services/emi-reimbursement-schemes.service';

import
{
    DatepickerComponent
}
from '../../../../../../shared/components/controls/datepicker/datepicker';

import
{
    fromIsoDate,
    parseMoney,
    toIsoDate
}
from '../../../../../../shared/components/accounting/accounting.models';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'emi-reimbursement-schemes-form',

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

    templateUrl:'./emi-reimbursement-schemes-form.html',

    styleUrls:
    [
        './emi-reimbursement-schemes-form.css'
    ]
})

//===============================================================
// EMI Reimbursement Schemes Form
//
// Scheme Information (code, brand, its Motor Bikes Supplier) ·
// Validity & Tenure · Reimbursement (swap / EMI : basis + value
// + cap, total cap) · Status & Description.
// Percent = % of the showroom's share of that charge; Fixed = Tk
// per sale. Caps are optional (empty = no limit).
//===============================================================

export class EmiReimbursementSchemesForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly schemesService =
        inject(EmiReimbursementSchemesService);

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
        'EMI Reimbursement Scheme';

    entityName:
        string =
        'EMI Reimbursement Scheme';

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
    // Defaults (brands with their Motor Bikes Supplier)
    //===========================================================

    private defaults:
        EmiReimbursementSchemesDefaults | null =
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

    basisItems:
        any[] =
    [
        { label:'Percent (% of showroom share)', value:'Percent' },
        { label:'Fixed (Tk per sale)', value:'Fixed' }
    ];

    tenureItems:
        any[] =
    [
        { label:'All tenures', value:0 },
        ...[3, 6, 9, 12, 18, 24, 36].map(months => ({ label:`${months} months`, value:months }))
    ];

    brandItems:
        any[] =
        [];

    //===========================================================
    // Entity + typed values (numbers are typed as text and
    // parsed on save)
    //===========================================================

    entity:
        EmiReimbursementSchemes =
        this.createEmptyEntity();

    swapValueText:
        string =
        '';

    swapCapText:
        string =
        '';

    emiValueText:
        string =
        '';

    emiCapText:
        string =
        '';

    // Datepicker values (fields : a getter would make a new Date
    // on every check)
    validFromDate:
        Date | null =
        null;

    validToDate:
        Date | null =
        null;

    // The brand the scheme was loaded with (kept even if inactive)
    private savedBrandCode:
        string =
        '';

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
        EmiReimbursementSchemes
    {
        return {
            EmiReimbursementSchemeId:0,
            SchemeCode:'',
            BrandCode:'',
            BrandName:'',
            SupplierCode:'',
            SupplierName:'',
            ValidFrom:'',
            ValidTo:'',
            TenureMonths:0,
            IsExpired:false,
            IsUpcoming:false,
            SwapBasis:'Percent',
            SwapValue:0,
            SwapCap:null,
            EmiBasis:'Percent',
            EmiValue:0,
            EmiCap:null,
            TotalCap:null,
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
    // Initialize Entity (Add) : Valid From = today
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
            this.createEmptyEntity();

        this.entity.SchemeCode =
            this.defaults?.Code ?? '';

        this.entity.ValidFrom =
            this.defaults?.Today || toIsoDate(new Date());

        this.savedBrandCode =
            '';

        this.loadTexts();

        this.buildBrandItems();

        this.setInitialFormState();
    }

    //===========================================================
    // Load Defaults
    //===========================================================

    private loadDefaults():
        void
    {
        this.schemesService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        EmiReimbursementSchemesDefaults
                ):
                    void =>
                {
                    this.defaults =
                        response;

                    this.buildBrandItems();

                    if
                    (
                        this.isAddMode
                    )
                    {
                        const pristine =
                            !this.hasChanges;

                        this.entity.SchemeCode =
                            response.Code;

                        if
                        (
                            response.Today
                            &&
                            pristine
                        )
                        {
                            this.entity.ValidFrom =
                                response.Today;

                            this.validFromDate =
                                fromIsoDate(response.Today);
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
                        'Load EMI Scheme Defaults Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load brands.'
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
        this.schemesService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        EmiReimbursementSchemes
                ):
                    void =>
                {
                    this.entity =
                    {
                        ...response,

                        EmiReimbursementSchemeId:
                            response.EmiReimbursementSchemeId
                            ||
                            this.entityId
                    };

                    this.savedBrandCode =
                        this.entity.BrandCode;

                    this.loadTexts();

                    this.buildBrandItems();

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
                        'Load EMI Scheme Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load the EMI reimbursement scheme.'
                        )
                    );

                    this.hasChanges =
                        false;

                    this.onBackToList();
                }
            });
    }

    // Entity → typed texts and picker dates
    private loadTexts():
        void
    {
        const money =
            (value: number | null): string =>
                value == null || value === 0
                    ? ''
                    : String(value);

        this.swapValueText =
            money(this.entity.SwapValue);

        this.swapCapText =
            money(this.entity.SwapCap);

        this.emiValueText =
            money(this.entity.EmiValue);

        this.emiCapText =
            money(this.entity.EmiCap);

        this.validFromDate =
            fromIsoDate(this.entity.ValidFrom);

        this.validToDate =
            fromIsoDate(this.entity.ValidTo);
    }

    //===========================================================
    // Brands : active ones + the saved one; a brand without a
    // Motor Bikes Supplier is shown but cannot be saved
    //===========================================================

    private buildBrandItems():
        void
    {
        const saved =
            this.savedBrandCode;

        const items =
            (this.defaults?.Brands ?? [])
                .filter
                (
                    brand =>
                        brand.IsActive
                        ||
                        brand.BrandCode === saved
                )
                .map
                (
                    brand =>
                    ({
                        label:
                            brand.BrandName
                            +
                            (brand.SupplierCode ? '' : ' (no Motor Bikes Supplier)')
                            +
                            (brand.IsActive ? '' : ' (inactive)'),

                        value:
                            brand.BrandCode
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
                    this.entity.BrandName || saved,

                value:
                    saved
            });
        }

        this.brandItems =
            items;

        this.refreshSupplier();
    }

    // Supplier (read only) follows the brand
    private refreshSupplier():
        void
    {
        const brand =
            (this.defaults?.Brands ?? []).find
            (
                item =>
                    item.BrandCode ===
                    this.entity.BrandCode
            );

        if
        (
            !brand
        )
        {
            return;
        }

        this.entity.BrandName =
            brand.BrandName;

        this.entity.SupplierCode =
            brand.SupplierCode;

        this.entity.SupplierName =
            brand.SupplierName;
    }

    get supplierText():
        string
    {
        if
        (
            !this.entity.BrandCode
        )
        {
            return '';
        }

        return this.entity.SupplierName
            || 'No Motor Bikes Supplier : set it on Brand Management';
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

    onBrandChange
    (
        value:
            any
    ):
        void
    {
        const code =
            this.unwrap(value);

        this.entity.BrandCode =
            code == null
                ? ''
                : String(code);

        this.entity.BrandName =
            '';

        this.entity.SupplierCode =
            '';

        this.entity.SupplierName =
            '';

        this.refreshSupplier();

        this.onValueChange();
    }

    onValidFrom
    (
        value:
            Date | null
    ):
        void
    {
        this.validFromDate =
            value;

        this.entity.ValidFrom =
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

    onTenureChange
    (
        value:
            any
    ):
        void
    {
        this.entity.TenureMonths =
            Number(this.unwrap(value) ?? 0) || 0;

        this.onValueChange();
    }

    onBasisChange
    (
        charge:
            'swap' | 'emi',
        value:
            any
    ):
        void
    {
        const basis:
            EmiSchemeBasis =
            this.unwrap(value) === 'Fixed'
                ? 'Fixed'
                : 'Percent';

        if
        (
            charge === 'swap'
        )
        {
            this.entity.SwapBasis =
                basis;
        }
        else
        {
            this.entity.EmiBasis =
                basis;
        }

        this.onValueChange();
    }

    onText
    (
        field:
            'swapValueText' | 'swapCapText' | 'emiValueText' | 'emiCapText',
        value:
            string | number
    ):
        void
    {
        this[field] =
            String(value ?? '');

        this.onValueChange();
    }

    //===========================================================
    // Total Cap (read only) = Swap Cap + EMI Cap, live as they
    // are typed (an empty cap counts 0); no limit when both are
    // empty
    //===========================================================

    get totalCapValue():
        number | null
    {
        const swap =
            this.readNumber(this.swapCapText) ?? 0;

        const emi =
            this.readNumber(this.emiCapText) ?? 0;

        return swap > 0 || emi > 0
            ? Math.round((swap + emi) * 100) / 100
            : null;
    }

    get totalCapText():
        string
    {
        const total =
            this.totalCapValue;

        return total === null
            ? ''
            : total.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
    }

    valueLabel
    (
        charge:
            'swap' | 'emi'
    ):
        string
    {
        const basis =
            charge === 'swap'
                ? this.entity.SwapBasis
                : this.entity.EmiBasis;

        const name =
            charge === 'swap'
                ? 'Swap Charge Share'
                : 'EMI Charge Share';

        return basis === 'Fixed'
            ? `${name} (Tk per sale)`
            : `${name} (%)`;
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

            texts:
            [
                this.swapValueText,
                this.swapCapText,
                this.emiValueText,
                this.emiCapText
            ]
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
    // Number Checks ('' = 0 / no cap)
    //===========================================================

    private readonly MONEY_TEXT =
        /^\d[\d,]*(\.\d{0,2})?$/;

    // null = invalid
    private readNumber
    (
        text:
            string
    ):
        number | null
    {
        const value =
            (text ?? '').trim();

        if
        (
            !value
        )
        {
            return 0;
        }

        return this.MONEY_TEXT.test(value)
            ? parseMoney(value)
            : null;
    }

    private validationIssue():
        string
    {
        if
        (
            !this.entity.BrandCode
        )
        {
            return 'Brand is required.';
        }

        if
        (
            !this.entity.SupplierCode
        )
        {
            return 'The brand has no Motor Bikes Supplier. Set it on Brand Management first : the claims go to that supplier.';
        }

        if
        (
            !this.entity.ValidFrom
        )
        {
            return 'Valid From is required.';
        }

        if
        (
            this.entity.ValidTo
            &&
            this.entity.ValidTo < this.entity.ValidFrom
        )
        {
            return 'Valid To cannot be before Valid From.';
        }

        const checks:
            [string, string, boolean][] =
        [
            [this.swapValueText, this.valueLabel('swap'), this.entity.SwapBasis === 'Percent'],
            [this.emiValueText, this.valueLabel('emi'), this.entity.EmiBasis === 'Percent'],
            [this.swapCapText, 'Swap Cap', false],
            [this.emiCapText, 'EMI Cap', false]
        ];

        for
        (
            const [text, label, isPercent] of checks
        )
        {
            const value =
                this.readNumber(text);

            if
            (
                value === null
            )
            {
                return `${label} must be a number with at most 2 decimals.`;
            }

            if
            (
                isPercent
                &&
                value > 100
            )
            {
                return `${label} cannot be more than 100%.`;
            }
        }

        if
        (
            !this.readNumber(this.swapValueText)
            &&
            !this.readNumber(this.emiValueText)
        )
        {
            return 'Give a reimbursement for the swap charge, the EMI charge or both.';
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

        this.saveUpdate();
    }

    //===========================================================
    // Build Payload
    //===========================================================

    private buildPayload():
        CreateEmiReimbursementSchemes
    {
        const cap =
            (text: string): number | null =>
            {
                const value =
                    this.readNumber(text) ?? 0;

                return value > 0
                    ? value
                    : null;
            };

        return {
            BrandCode:
                this.entity.BrandCode,

            ValidFrom:
                this.entity.ValidFrom,

            ValidTo:
                this.entity.ValidTo ?? '',

            TenureMonths:
                this.entity.TenureMonths,

            SwapBasis:
                this.entity.SwapBasis,

            SwapValue:
                this.readNumber(this.swapValueText) ?? 0,

            SwapCap:
                cap(this.swapCapText),

            EmiBasis:
                this.entity.EmiBasis,

            EmiValue:
                this.readNumber(this.emiValueText) ?? 0,

            EmiCap:
                cap(this.emiCapText),

            // Read only : Swap Cap + EMI Cap (the server works it
            // out the same way)
            TotalCap:
                this.totalCapValue,

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
            CreateEmiReimbursementSchemes =
            this.buildPayload();

        this.startProgress(
            'Saving EMI Scheme',
            'Please wait while the EMI reimbursement scheme is being saved...'
        );

        this.withMinimumDuration(
            this.schemesService.create(
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
                    'EMI reimbursement scheme saved.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'EMI Reimbursement Scheme created successfully.'
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
                    'Create EMI Reimbursement Scheme Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to create EMI Reimbursement Scheme.'
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
            this.entity.EmiReimbursementSchemeId
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
                'Invalid EMI Reimbursement Scheme. Please reload the page and try again.'
            );

            return;
        }

        const model:
            UpdateEmiReimbursementSchemes =
        {
            EmiReimbursementSchemeId:
                id,

            ...this.buildPayload()
        };

        this.startProgress(
            'Updating EMI Scheme',
            'Please wait while the EMI reimbursement scheme is being updated...'
        );

        this.withMinimumDuration(
            this.schemesService.update(
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
                    'EMI reimbursement scheme updated.',
                    () =>
                    {
                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'EMI Reimbursement Scheme updated successfully.'
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
                    'Update EMI Reimbursement Scheme Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to update EMI Reimbursement Scheme.'
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
            '/settings',
            'account-settings',
            'emi-reimbursement-schemes',
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