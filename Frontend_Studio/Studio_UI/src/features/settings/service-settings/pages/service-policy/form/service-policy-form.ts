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
    throwError
}
from 'rxjs';

import
{
    catchError,
    delayWhen,
    switchMap
}
from 'rxjs/operators';

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
    ServicePolicy,
    CreateServicePolicy,
    UpdateServicePolicy,
    ServicePolicyDefaults,
    ServicePolicyBrandOption,
    ServicePolicySubGroupOption,
    ServicePolicySchedule,
    DAYS_PER_YEAR
}
from '../../../models/service-policy.model';

import
{
    renumberSchedule,
    firstFreeBeyondWarranty,
    scheduleSummary
}
from '../../../models/service-policy-schedule.util';

import
{
    ServiceScheduleComponent
}
from '../schedule/service-schedule';

import
{
    ServicePolicyService
}
from '../../../services/service-policy.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'service-policy-form',

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
        TextareaComponent,
        DropdownComponent,
        SearchDropdownComponent,

        //=======================================================
        // Service Schedule page
        //=======================================================

        ServiceScheduleComponent,

        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./service-policy-form.html',

    styleUrls:
    [
        './service-policy-form.css'
    ]
})

//===============================================================
// Service Policy Form
//===============================================================

export class ServicePolicyForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly servicePolicyService =
        inject(ServicePolicyService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Progress Configuration
    //===========================================================

    private readonly minimumSaveDurationMs:
        number =
        5000;

    private readonly progressCeiling:
        number =
        90;

    private readonly progressEaseFactor:
        number =
        0.05;

    private readonly progressIntervalMs:
        number =
        100;

    private readonly progressCompleteHoldMs:
        number =
        600;

    //===========================================================
    // Progress State
    //===========================================================

    private progressTimer:
        ReturnType<typeof setInterval> | null =
        null;

    private progressValue:
        number =
        0;

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
        'Service Policy';

    entityName:
        string =
        'Service Policy';

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
    // Dropdown Items
    //===========================================================

    statusItems:
        any[]
        =
        [
            {
                label:'Active',
                value:true
            },
            {
                label:'Inactive',
                value:false
            }
        ];

    // Active brands without a policy (plus the policy's own brand)
    brandItems:
        any[]
        =
        [];

    // Eligible Associated Sub Groups
    subGroupItems:
        any[]
        =
        [];

    private brands:
        ServicePolicyBrandOption[]
        =
        [];

    private subGroups:
        ServicePolicySubGroupOption[]
        =
        [];

    private defaultSubGroupId:
        number =
        0;

    // True once a policy exists : the Associated Sub Group is the
    // same for every policy and cannot be chosen again
    isSubGroupFixed:
        boolean =
        false;

    get isSubGroupLocked():
        boolean
    {
        return !this.isAddMode
            ||
            this.isSubGroupFixed;
    }

    //===========================================================
    // Service Schedule page
    //
    // The schedule is edited on its own page (Service Schedule),
    // opened from the command center. It works on a copy; Apply
    // brings the rows back here and they are saved with the
    // policy. A policy cannot be saved without a schedule.
    //===========================================================

    showSchedule:
        boolean =
        false;

    //===========================================================
    // Entity
    //===========================================================

    entity:
        ServicePolicy
        =
        this.createEmptyEntity();

    //===========================================================
    // Form State
    //===========================================================

    private originalEntity:
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
    // Create Empty Entity
    //===========================================================

    private createEmptyEntity():
        ServicePolicy
    {
        return {
            ServicePolicyId:0,
            PolicyCode:'',
            BrandManagementId:0,
            WarrantyYears:0,
            WarrantyKm:0,
            FreeServiceCount:0,
            PaidServiceCount:0,
            Schedules:[],
            AssociatedSubGroupId:0,
            AssociatedLedgerCode:'',
            AssociatedLedgerName:'',
            Remarks:'',
            IsActive:true
        };
    }

    //===========================================================
    // Initialize Mode
    //===========================================================

    private initializeMode():
        void
    {
        const url =
            this.router.url.toLowerCase();

        if
        (
            url.includes('/view/')
        )
        {
            this.mode =
                'view';
        }
        else if
        (
            url.includes('/edit/')
        )
        {
            this.mode =
                'edit';
        }
        else
        {
            this.mode =
                'add';
        }

        this.entityId =
            this.resolveEntityId();

        if
        (
            this.entityId > 0
        )
        {
            this.loadEntity();
        }
        else
        {
            this.entity =
                this.createEmptyEntity();

            this.syncDisplayValues();

            this.setInitialFormState();
        }

        // Brands, sub groups, next codes
        this.loadDefaults();
    }

    //===========================================================
    // Resolve Entity Id
    //===========================================================

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
    // Load Defaults
    //===========================================================

    private loadDefaults():
        void
    {
        this.servicePolicyService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        ServicePolicyDefaults
                ):
                    void =>
                {
                    this.brands =
                        response.Brands ?? [];

                    this.subGroups =
                        response.SubGroups ?? [];

                    this.defaultSubGroupId =
                        Number(response.DefaultSubGroupId ?? 0);

                    this.isSubGroupFixed =
                        Boolean(response.IsSubGroupFixed);

                    if
                    (
                        this.isAddMode
                    )
                    {
                        this.entity.PolicyCode =
                            response.Code ?? '';

                        if
                        (
                            this.isSubGroupFixed
                            ||
                            !this.entity.AssociatedSubGroupId
                        )
                        {
                            this.entity.AssociatedSubGroupId =
                                this.defaultSubGroupId;
                        }

                        // Code preview, shown on load
                        this.entity.AssociatedLedgerCode =
                            this.entity.AssociatedSubGroupId === this.defaultSubGroupId
                                ? response.NextLedgerCode ?? ''
                                : this.entity.AssociatedLedgerCode;
                    }

                    this.buildBrandItems();

                    this.buildSubGroupItems();

                    this.syncDisplayValues();

                    // Auto-filled values are the new baseline
                    if
                    (
                        this.isAddMode
                        &&
                        !this.entity.BrandManagementId
                    )
                    {
                        this.setInitialFormState();

                        return;
                    }

                    this.checkForChanges();

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
                        'Load Service Policy Defaults Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load Service Policy defaults.'
                        )
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Build Brand Items
    //===========================================================

    private buildBrandItems():
        void
    {
        const currentId =
            Number(this.entity.BrandManagementId ?? 0);

        this.brandItems =
            this.brands
                .filter(
                    brand =>
                        Number(brand.BrandManagementId) === currentId
                        ||
                        (
                            brand.BrandActive
                            &&
                            !brand.ServicePolicyId
                        )
                )
                .map(
                    brand =>
                    ({
                        label:
                            brand.BrandActive
                                ? brand.BrandName
                                : `${brand.BrandName} (Inactive)`,

                        value:
                            Number(brand.BrandManagementId)
                    })
                );

        this.cdr.detectChanges();
    }

    //===========================================================
    // Build Associated Sub Group Items
    //===========================================================

    private buildSubGroupItems():
        void
    {
        const items =
            this.subGroups.map(
                item =>
                ({
                    label:
                        `${item.SubGroupCode} - ${item.SubGroupName}`,

                    value:
                        Number(item.AccountSubGroupId)
                })
            );

        // Saved sub group no longer eligible : still show it
        if
        (
            this.entity.AssociatedSubGroupId
            &&
            !items.some(
                item =>
                    item.value === Number(this.entity.AssociatedSubGroupId)
            )
        )
        {
            items.unshift(
                {
                    label:
                        [
                            this.entity.AssociatedSubGroupCode,
                            this.entity.AssociatedSubGroupName
                        ]
                        .filter(value => !!value)
                        .join(' - ')
                        ||
                        'Saved sub group',

                    value:
                        Number(this.entity.AssociatedSubGroupId)
                }
            );
        }

        this.subGroupItems =
            items;

        this.cdr.detectChanges();
    }

    //===========================================================
    // Display Values
    //===========================================================

    private syncDisplayValues():
        void
    {
        const brand =
            this.brands.find(
                item =>
                    Number(item.BrandManagementId) ===
                    Number(this.entity.BrandManagementId)
            );

        // "<Sub Group Name> - <Brand Name>" from the current names
        // (a preview; the server builds the same name and keeps the
        // ledger renamed when either name changes)
        const brandName =
            (
                brand?.BrandName
                ??
                this.entity.BrandName
                ??
                ''
            ).trim();

        const subGroupName =
            (
                this.subGroups.find(
                    item =>
                        Number(item.AccountSubGroupId) ===
                        Number(this.entity.AssociatedSubGroupId)
                )?.SubGroupName
                ??
                this.entity.AssociatedSubGroupName
                ??
                ''
            ).trim();

        this.entity.AssociatedLedgerName =
            subGroupName && brandName
                ? `${subGroupName} - ${brandName}`
                : '';
    }

    get ledgerCodePlaceholder():
        string
    {
        return this.isAddMode
            ? 'Select the Associated Sub Group'
            : '';
    }

    //===========================================================
    // Changes
    //===========================================================

    // A dropdown may emit the value or the whole { label, value } item
    private unwrapValue
    (
        value:
            any
    ):
        any
    {
        return value !== null
            &&
            typeof value === 'object'
            &&
            'value' in value
                ? value.value
                : value;
    }

    onBrandChange
    (
        value?:
            any
    ):
        void
    {
        if
        (
            value !== undefined
        )
        {
            this.entity.BrandManagementId =
                Number(this.unwrapValue(value) ?? 0);
        }

        this.syncDisplayValues();

        this.onValueChange();
    }

    onSubGroupChange
    (
        value?:
            any
    ):
        void
    {
        if
        (
            value !== undefined
        )
        {
            this.entity.AssociatedSubGroupId =
                Number(this.unwrapValue(value) ?? 0);
        }

        this.syncDisplayValues();

        this.loadNextLedgerCode();

        this.onValueChange();
    }

    // Associated Ledger Code preview for the chosen sub group
    private loadNextLedgerCode():
        void
    {
        const subGroupId =
            Number(this.entity.AssociatedSubGroupId);

        if
        (
            !this.isAddMode
            ||
            !(subGroupId > 0)
        )
        {
            this.entity.AssociatedLedgerCode =
                this.isAddMode
                    ? ''
                    : this.entity.AssociatedLedgerCode;

            return;
        }

        this.servicePolicyService
            .getNextLedgerCode(
                subGroupId
            )
            .subscribe
            ({
                next:
                (
                    code:
                        string
                ):
                    void =>
                {
                    if
                    (
                        Number(this.entity.AssociatedSubGroupId) === subGroupId
                    )
                    {
                        this.entity.AssociatedLedgerCode =
                            String(code ?? '').replace(/^"|"$/g, '');

                        this.cdr.detectChanges();
                    }
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Next Ledger Code Error',
                        error
                    );
                }
            });
    }

    // Number fields are typed into text boxes
    numberText
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

    private toNumber
    (
        value:
            any,

        maxDigits:
            number
    ):
        number
    {
        const digits =
            String(value ?? '')
                .replace(/[^0-9]/g, '')
                .substring(0, maxDigits);

        return digits
            ? Number(digits)
            : 0;
    }

    onWarrantyValueChange
    (
        field:
            'WarrantyYears' | 'WarrantyKm',

        value:
            any
    ):
        void
    {
        this.entity[field] =
            this.toNumber(
                value,
                field === 'WarrantyKm' ? 7 : 2
            );

        this.onValueChange();
    }

    //===========================================================
    // Warranty limit in days (1 year = 365)
    //===========================================================

    get warrantyDays():
        number
    {
        return (this.entity.WarrantyYears || 0) * DAYS_PER_YEAR;
    }

    // "6 Free · 12 Paid · 18 Total"
    get scheduleSummary():
        string
    {
        return scheduleSummary(
            this.entity.Schedules
        );
    }

    //===========================================================
    // Service Schedule page : open / apply / close
    //===========================================================

    openSchedule():
        void
    {
        if
        (
            this.isSaving
        )
        {
            return;
        }

        this.showSchedule =
            true;

        this.cdr.detectChanges();
    }

    onScheduleApplied
    (
        rows:
            ServicePolicySchedule[]
    ):
        void
    {
        this.entity.Schedules =
            rows;

        renumberSchedule(
            this.entity.Schedules
        );

        this.entity.FreeServiceCount =
            rows.filter(row => row.ServiceType === 'Free').length;

        this.entity.PaidServiceCount =
            rows.length - this.entity.FreeServiceCount;

        this.showSchedule =
            false;

        this.toast.success(
            'Service Schedule',
            `${rows.length} services applied. Save the policy to keep them.`
        );

        this.onValueChange();
    }

    onScheduleClosed():
        void
    {
        this.showSchedule =
            false;

        this.cdr.detectChanges();
    }

    get selectedBrandName():
        string
    {
        return this.brands.find(
            item =>
                Number(item.BrandManagementId) ===
                Number(this.entity.BrandManagementId)
        )?.BrandName
        ??
        this.entity.BrandName
        ??
        '';
    }

    get scheduleButtonText():
        string
    {
        return this.entity.Schedules.length
            ? `Schedule (${this.entity.Schedules.length})`
            : 'Schedule';
    }

    //===========================================================
    // Set Initial Form State / Track Changes
    //===========================================================

    private setInitialFormState():
        void
    {
        this.originalEntity =
            JSON.stringify(
                this.entity
            );

        this.hasChanges =
            false;

        this.cdr.detectChanges();
    }

    checkForChanges():
        void
    {
        this.hasChanges =
            JSON.stringify(
                this.entity
            )
            !==
            this.originalEntity;
    }

    onValueChange():
        void
    {
        this.checkForChanges();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Load Entity
    //===========================================================

    private loadEntity():
        void
    {
        this.servicePolicyService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        ServicePolicy
                ): void =>
                {
                    this.entity =
                        response;

                    renumberSchedule(
                        this.entity.Schedules
                    );

                    this.buildBrandItems();

                    this.buildSubGroupItems();

                    this.syncDisplayValues();

                    this.setInitialFormState();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Service Policy Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load Service Policy.'
                    );

                    this.hasChanges =
                        false;

                    this.onBackToList();
                }
            });
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

        //=======================================================
        // Validation
        //=======================================================

        const fail =
            (message: string): void =>
                this.toast.error(
                    'Validation',
                    message
                );

        if
        (
            !(Number(this.entity.BrandManagementId) > 0)
        )
        {
            fail('Brand is required.');

            return;
        }

        if
        (
            !(this.entity.WarrantyYears > 0)
            ||
            !(this.entity.WarrantyKm > 0)
        )
        {
            fail('Enter the free service limit (Warranty Years and Warranty Km).');

            return;
        }

        if
        (
            !this.entity.Schedules.length
        )
        {
            fail('The Service Schedule is required. Open Schedule and add the services.');

            this.openSchedule();

            return;
        }

        const lateFree =
            firstFreeBeyondWarranty(
                this.entity.Schedules,
                this.entity.WarrantyYears
            );

        if
        (
            lateFree >= 0
        )
        {
            fail(`${this.entity.Schedules[lateFree].ServiceName} falls beyond the ${this.entity.WarrantyYears}-year warranty. Adjust the schedule.`);

            return;
        }

        if
        (
            !(Number(this.entity.AssociatedSubGroupId) > 0)
        )
        {
            fail('Associated Sub Group is required.');

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
        CreateServicePolicy
    {
        return {
            PolicyCode:
                this.entity.PolicyCode,

            BrandManagementId:
                Number(this.entity.BrandManagementId),

            WarrantyYears:
                this.entity.WarrantyYears,

            WarrantyKm:
                this.entity.WarrantyKm,

            FreeServiceCount:
                this.entity.FreeServiceCount,

            PaidServiceCount:
                this.entity.PaidServiceCount,

            Schedules:
                this.entity.Schedules.map(
                    row =>
                    ({
                        ...row
                    })
                ),

            AssociatedSubGroupId:
                Number(this.entity.AssociatedSubGroupId),

            AssociatedLedgerCode:
                this.entity.AssociatedLedgerCode,

            AssociatedLedgerName:
                this.entity.AssociatedLedgerName,

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };
    }

    //===========================================================
    // Create
    //===========================================================

    private saveCreate():
        void
    {
        this.runSave(
            this.servicePolicyService.create(
                this.buildPayload()
            ),
            'Saving Service Policy',
            'Creating service policy and its Associated Ledger...',
            'Service Policy created successfully.',
            'Failed to create Service Policy.'
        );
    }

    //===========================================================
    // Update
    //===========================================================

    private saveUpdate():
        void
    {
        const model:
            UpdateServicePolicy =
        {
            ServicePolicyId:
                this.entity.ServicePolicyId,

            ...this.buildPayload()
        };

        this.runSave(
            this.servicePolicyService.update(
                model
            ),
            'Updating Service Policy',
            'Updating service policy and its Associated Ledger...',
            'Service Policy updated successfully.',
            'Failed to update Service Policy.'
        );
    }

    //===========================================================
    // Run Save (shared by Create / Update)
    //===========================================================

    private runSave
    (
        request:
            Observable<unknown>,

        title:
            string,

        message:
            string,

        successMessage:
            string,

        failMessage:
            string
    ):
        void
    {
        this.isSaving =
            true;

        this.startProgress(
            title,
            message
        );

        this.withMinimumDuration(
            request,
            this.minimumSaveDurationMs
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    successMessage,
                    ():
                        void =>
                    {
                        this.isSaving =
                            false;

                        this.originalEntity =
                            JSON.stringify(
                                this.entity
                            );

                        this.hasChanges =
                            false;

                        this.toast.success(
                            'Success',
                            successMessage
                        );

                        this.cdr.detectChanges();

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
                    title,
                    error
                );

                this.failProgress(
                    ():
                        void =>
                    {
                        this.isSaving =
                            false;

                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                failMessage
                            )
                        );

                        this.cdr.detectChanges();
                    }
                );
            }
        });
    }

    //===========================================================
    // Progress : Start
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
        this.clearProgressTimer();

        this.progressValue =
            0;

        this.progressDialog.show(
            title,
            message,
            false
        );

        this.progressDialog.update(
            0,
            message
        );

        this.progressTimer =
            setInterval
            (
                ():
                    void =>
                {
                    const step =
                        Math.max(
                            0.4,
                            (
                                this.progressCeiling -
                                this.progressValue
                            )
                            *
                            this.progressEaseFactor
                        );

                    this.progressValue =
                        Math.min(
                            this.progressCeiling,
                            this.progressValue + step
                        );

                    this.progressDialog.update(
                        Math.round(
                            this.progressValue
                        )
                    );
                },
                this.progressIntervalMs
            );

        this.cdr.detectChanges();
    }

    //===========================================================
    // Progress : Complete
    //===========================================================

    private completeProgress
    (
        message:
            string,
        callback:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressValue =
            100;

        this.progressDialog.update(
            100,
            message
        );

        setTimeout
        (
            ():
                void =>
            {
                this.progressDialog.close();

                callback();
            },
            this.progressCompleteHoldMs
        );
    }

    //===========================================================
    // Progress : Fail
    //===========================================================

    private failProgress
    (
        callback:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressDialog.close();

        callback();
    }

    //===========================================================
    // Progress : Clear Timer
    //===========================================================

    private clearProgressTimer():
        void
    {
        if
        (
            this.progressTimer !== null
        )
        {
            clearInterval(
                this.progressTimer
            );

            this.progressTimer =
                null;
        }
    }

    //===========================================================
    // Minimum Duration Wrapper
    //===========================================================

    private withMinimumDuration<T>
    (
        source:
            Observable<T>,
        minimumMs:
            number
    ):
        Observable<T>
    {
        return defer
        (
            ():
                Observable<T> =>
            {
                const startedAt =
                    Date.now();

                const remaining =
                    ():
                        number =>
                        Math.max(
                            0,
                            minimumMs -
                            (
                                Date.now() -
                                startedAt
                            )
                        );

                return source.pipe
                (
                    delayWhen
                    (
                        () =>
                            timer(
                                remaining()
                            )
                    ),

                    catchError
                    (
                        error =>
                            timer(
                                remaining()
                            )
                            .pipe
                            (
                                switchMap
                                (
                                    () =>
                                        throwError(
                                            () => error
                                        )
                                )
                            )
                    )
                );
            }
        );
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

        const code =
            this.entity.PolicyCode;

        this.entity =
            this.createEmptyEntity();

        this.entity.PolicyCode =
            code;

        this.entity.AssociatedSubGroupId =
            this.defaultSubGroupId;

        this.loadNextLedgerCode();

        this.buildBrandItems();

        this.syncDisplayValues();

        this.setInitialFormState();
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
            'service-settings',
            'service-policy',
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
}