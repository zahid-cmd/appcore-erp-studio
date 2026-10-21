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

//===============================================================
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
    MembershipPolicy,
    CreateMembershipPolicy,
    UpdateMembershipPolicy,
    MembershipPoliciesDefaults,
    MembershipPolicyCardOption,
    INTERVAL_UNITS
}
from '../../../models/membership-policies.model';

import
{
    MembershipPoliciesService
}
from '../../../services/membership-policies.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'membership-policies-form',

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
        // Utilities
        //=======================================================

        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./membership-policies-form.html',

    styleUrls:
    [
        './membership-policies-form.css'
    ]
})

//===============================================================
// Membership Policies Form
//===============================================================

export class MembershipPoliciesForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly membershipPoliciesService =
        inject(MembershipPoliciesService);

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
    // Page Header
    //===========================================================

    pageTitle:
        string =
        'Membership Policies';

    entityName:
        string =
        'Membership Policy';

    //===========================================================
    // Tabs
    //===========================================================

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

    unitItems:
        any[]
        =
        INTERVAL_UNITS.map(
            unit =>
            ({
                label:unit,
                value:unit
            })
        );

    // Add : live cards without a policy. Edit / View : its own card.
    cardItems:
        any[]
        =
        [];

    private cards:
        MembershipPolicyCardOption[]
        =
        [];

    private nextPolicyCode:
        string =
        '';


    //===========================================================
    // Entity
    //===========================================================

    entity:
        MembershipPolicy
        =
        this.createEmptyEntity();

    // Card Rank (display)
    cardRankText:
        string =
        '';


    //===========================================================
    // Numbers as typed (the entity keeps the parsed values)
    //===========================================================

    texts:
        Record<NumberField, string>
        =
        this.emptyTexts();


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
    // Create Empty Entity
    //===========================================================

    private createEmptyEntity():
        MembershipPolicy
    {
        return {
            MembershipPolicyId:0,
            PolicyCode:'',
            MembershipCardId:0,
            CardCode:'',
            CardName:'',
            CardRank:0,
            CardIsActive:true,
            ValidityMonths:12,
            EnrollmentFee:0,
            RenewalFee:0,
            SparePartsDiscountPercent:0,
            AccessoriesDiscountPercent:0,
            ServiceChargeDiscountPercent:0,
            FreeServiceCount:0,
            ServiceInterval:0,
            ServiceIntervalUnit:'',
            MissedServiceGraceDays:0,
            MaxMissedServices:0,
            Remarks:'',
            IsActive:true
        };
    }


    private emptyTexts():
        Record<NumberField, string>
    {
        return {
            ValidityMonths:'',
            EnrollmentFee:'',
            RenewalFee:'',
            SparePartsDiscountPercent:'',
            AccessoriesDiscountPercent:'',
            ServiceChargeDiscountPercent:'',
            FreeServiceCount:'',
            ServiceInterval:'',
            MissedServiceGraceDays:'',
            MaxMissedServices:''
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
    // Initialize Entity (Add mode)
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
            this.createEmptyEntity();

        this.entity.PolicyCode =
            this.nextPolicyCode;

        this.cardRankText =
            '';

        this.syncTexts();

        this.buildCardItems();

        this.setInitialFormState();
    }


    //===========================================================
    // Load Defaults (next code + cards without a policy)
    //===========================================================

    private loadDefaults():
        void
    {
        this.membershipPoliciesService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        MembershipPoliciesDefaults
                ):
                    void =>
                {
                    this.cards =
                        response.Cards ?? [];

                    this.nextPolicyCode =
                        response.NextPolicyCode;

                    if
                    (
                        (response.IntervalUnits ?? []).length > 0
                    )
                    {
                        this.unitItems =
                            response.IntervalUnits.map(
                                unit =>
                                ({
                                    label:unit,
                                    value:unit
                                })
                            );
                    }

                    if
                    (
                        this.isAddMode
                    )
                    {
                        const touched =
                            this.hasChanges;

                        this.entity.PolicyCode =
                            this.nextPolicyCode;

                        this.buildCardItems();

                        if
                        (
                            this.cards.length === 0
                        )
                        {
                            this.toast.info(
                                'No Membership Card',
                                'Every membership card already has a policy, or no card exists yet.'
                            );
                        }

                        if
                        (
                            !touched
                        )
                        {
                            this.setInitialFormState();

                            return;
                        }
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
                        'Load Membership Policies Defaults Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load the membership policy defaults.'
                        )
                    );

                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Card Items
    //
    // Add : cards without a policy. Edit / View : its own card
    // (locked).
    //===========================================================

    private buildCardItems():
        void
    {
        if
        (
            this.isAddMode
        )
        {
            this.cardItems =
                this.cards.map(
                    card =>
                    ({
                        label:
                            `${card.CardCode} - ${card.CardName}${card.IsActive ? '' : ' (inactive)'}`,

                        value:
                            Number(card.MembershipCardId)
                    })
                );

            return;
        }

        this.cardItems =
            this.entity.MembershipCardId > 0
                ? [
                    {
                        label:
                            `${this.entity.CardCode} - ${this.entity.CardName}`,

                        value:
                            Number(this.entity.MembershipCardId)
                    }
                ]
                : [];
    }


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


    //===========================================================
    // Card Change (Add mode)
    //===========================================================

    onCardChange
    (
        value:
            any
    ):
        void
    {
        this.entity.MembershipCardId =
            Number(this.unwrapValue(value) ?? 0);

        const card =
            this.cards.find(
                item =>
                    Number(item.MembershipCardId) ===
                    this.entity.MembershipCardId
            );

        this.entity.CardCode =
            card?.CardCode ?? '';

        this.entity.CardName =
            card?.CardName ?? '';

        this.entity.CardRank =
            card?.CardRank ?? 0;

        this.entity.CardIsActive =
            card?.IsActive ?? true;

        this.cardRankText =
            card
                ? String(card.CardRank)
                : '';

        this.onValueChange();
    }


    //===========================================================
    // Numbers (typed as text)
    //===========================================================

    private static readonly NUMBER_KINDS:
        Record<NumberField, 'int' | 'amount' | 'percent'> =
    {
        ValidityMonths:'int',
        EnrollmentFee:'amount',
        RenewalFee:'amount',
        SparePartsDiscountPercent:'percent',
        AccessoriesDiscountPercent:'percent',
        ServiceChargeDiscountPercent:'percent',
        FreeServiceCount:'int',
        ServiceInterval:'int',
        MissedServiceGraceDays:'int',
        MaxMissedServices:'int'
    };


    private syncTexts():
        void
    {
        const amount =
            (value: number): string =>
                Number(value ?? 0).toFixed(2);

        const int =
            (value: number): string =>
                String(Number(value ?? 0));

        this.texts =
        {
            ValidityMonths:
                int(this.entity.ValidityMonths),

            EnrollmentFee:
                amount(this.entity.EnrollmentFee),

            RenewalFee:
                amount(this.entity.RenewalFee),

            SparePartsDiscountPercent:
                amount(this.entity.SparePartsDiscountPercent),

            AccessoriesDiscountPercent:
                amount(this.entity.AccessoriesDiscountPercent),

            ServiceChargeDiscountPercent:
                amount(this.entity.ServiceChargeDiscountPercent),

            FreeServiceCount:
                int(this.entity.FreeServiceCount),

            ServiceInterval:
                this.entity.ServiceInterval > 0
                    ? int(this.entity.ServiceInterval)
                    : '',

            MissedServiceGraceDays:
                int(this.entity.MissedServiceGraceDays),

            MaxMissedServices:
                int(this.entity.MaxMissedServices)
        };
    }


    // Digits only (whole numbers) or digits with up to 2 decimals
    private cleanNumber
    (
        value:
            any,
        kind:
            'int' | 'amount' | 'percent'
    ):
        string
    {
        const raw =
            String(value ?? '');

        if
        (
            kind === 'int'
        )
        {
            return raw
                .replace(/[^0-9]/g, '')
                .slice(0, 3);
        }

        const cleaned =
            raw.replace(/[^0-9.]/g, '');

        const dot =
            cleaned.indexOf('.');

        if
        (
            dot < 0
        )
        {
            return cleaned.slice(0, kind === 'percent' ? 3 : 8);
        }

        return cleaned.slice(0, dot).slice(0, kind === 'percent' ? 3 : 8)
            + '.'
            + cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 2);
    }


    onNumberChange
    (
        field:
            NumberField,
        value:
            any
    ):
        void
    {
        const kind =
            MembershipPoliciesForm.NUMBER_KINDS[field];

        this.texts[field] =
            String(value ?? '');

        this.cdr.detectChanges();

        this.texts[field] =
            this.cleanNumber(
                value,
                kind
            );

        const text =
            this.texts[field];

        this.entity[field] =
            text && text !== '.'
                ? Number(text)
                : 0;

        // No free services : the window settings do not apply
        if
        (
            field === 'FreeServiceCount'
            &&
            !this.hasFreeServices
        )
        {
            this.entity.ServiceInterval =
                0;

            this.entity.ServiceIntervalUnit =
                '';

            this.entity.MissedServiceGraceDays =
                0;

            this.entity.MaxMissedServices =
                0;

            this.texts.ServiceInterval =
                '';

            this.texts.MissedServiceGraceDays =
                '0';

            this.texts.MaxMissedServices =
                '0';
        }

        this.onValueChange();
    }


    onUnitChange
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
            this.entity.ServiceIntervalUnit =
                String(this.unwrapValue(value) ?? '');
        }

        this.onValueChange();
    }


    get hasFreeServices():
        boolean
    {
        return Number(this.entity.FreeServiceCount) > 0;
    }


    // "6 free services, one every 2 months (12 months)"
    get freeServiceSummary():
        string
    {
        if
        (
            !this.hasFreeServices
        )
        {
            return 'No free services';
        }

        const count =
            Number(this.entity.FreeServiceCount);

        const interval =
            Number(this.entity.ServiceInterval);

        const unit =
            (this.entity.ServiceIntervalUnit || '').toLowerCase();

        if
        (
            !interval
            ||
            !unit
        )
        {
            return `${count} free service${count === 1 ? '' : 's'}`;
        }

        return `${count} free service${count === 1 ? '' : 's'}, one every ${interval} ${unit} (${count * interval} ${unit})`;
    }


    //===========================================================
    // Set Initial Form State
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


    //===========================================================
    // Load Entity
    //===========================================================

    private loadEntity():
        void
    {
        this.membershipPoliciesService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        MembershipPolicy
                ): void =>
                {
                    this.entity =
                    {
                        ...response
                    };

                    this.cardRankText =
                        response.CardRank > 0
                            ? String(response.CardRank)
                            : '';

                    this.syncTexts();

                    this.buildCardItems();

                    this.setInitialFormState();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Membership Policy Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load Membership Policy.'
                    );

                    this.hasChanges =
                        false;

                    this.onBackToList();
                }
            });
    }



    //===========================================================
    // Track Changes
    //===========================================================

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

        const e =
            this.entity;

        const count =
            Number(e.FreeServiceCount);

        const interval =
            Number(e.ServiceInterval);

        const validityDays =
            Math.floor(
                Number(e.ValidityMonths) * 365 / 12
            );

        const fits =
            e.ServiceIntervalUnit === 'Months'
                ? count * interval <= Number(e.ValidityMonths)
                : count * interval <= validityDays;

        const percentOk =
            (value: number): boolean =>
                value >= 0
                &&
                value <= 100;

        const checks:
            {
                failed:
                    boolean;

                message:
                    string;
            }[] =
        [
            {
                failed:
                    !(Number(e.MembershipCardId) > 0),

                message:
                    'Membership Card is required.'
            },
            {
                failed:
                    !(e.ValidityMonths >= 1 && e.ValidityMonths <= 120),

                message:
                    'Validity must be from 1 to 120 months.'
            },
            {
                failed:
                    !(e.EnrollmentFee >= 0)
                    ||
                    !(e.RenewalFee >= 0),

                message:
                    'Enrollment Fee and Renewal Fee must be 0.00 or more.'
            },
            {
                failed:
                    !percentOk(e.SparePartsDiscountPercent)
                    ||
                    !percentOk(e.AccessoriesDiscountPercent)
                    ||
                    !percentOk(e.ServiceChargeDiscountPercent),

                message:
                    'Every discount must be from 0 to 100 %.'
            },
            {
                failed:
                    count > 99,

                message:
                    'No. of Free Services must be from 0 to 99.'
            },
            {
                failed:
                    count > 0
                    &&
                    !(interval >= 1),

                message:
                    'Service Interval is required (at least 1).'
            },
            {
                failed:
                    count > 0
                    &&
                    !e.ServiceIntervalUnit,

                message:
                    'Interval Unit is required (Days or Months).'
            },
            {
                failed:
                    count > 0
                    &&
                    interval >= 1
                    &&
                    !!e.ServiceIntervalUnit
                    &&
                    !fits,

                message:
                    `${count} free services every ${interval} ${(e.ServiceIntervalUnit || '').toLowerCase()} do not fit the validity of ${e.ValidityMonths} months.`
            },
            {
                failed:
                    count > 0
                    &&
                    !(e.MissedServiceGraceDays >= 0 && e.MissedServiceGraceDays <= 365),

                message:
                    'Grace Period After Expiry must be from 0 to 365 days.'
            },
            {
                failed:
                    count > 0
                    &&
                    e.MaxMissedServices > count,

                message:
                    `Max Missed Services Allowed cannot be more than ${count} (the No. of Free Services).`
            },
            {
                failed:
                    e.IsActive
                    &&
                    !e.CardIsActive,

                message:
                    `Membership Card '${e.CardName}' is inactive. Activate the card first, or save the policy as Inactive.`
            }
        ];

        const failed =
            checks.find(
                check =>
                    check.failed
            );

        if
        (
            failed
        )
        {
            this.toast.error(
                'Validation',
                failed.message
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
        CreateMembershipPolicy
    {
        const e =
            this.entity;

        const free =
            this.hasFreeServices;

        return {
            MembershipCardId:
                Number(e.MembershipCardId),

            ValidityMonths:
                Number(e.ValidityMonths),

            EnrollmentFee:
                Number(e.EnrollmentFee),

            RenewalFee:
                Number(e.RenewalFee),

            SparePartsDiscountPercent:
                Number(e.SparePartsDiscountPercent),

            AccessoriesDiscountPercent:
                Number(e.AccessoriesDiscountPercent),

            ServiceChargeDiscountPercent:
                Number(e.ServiceChargeDiscountPercent),

            FreeServiceCount:
                Number(e.FreeServiceCount),

            ServiceInterval:
                free ? Number(e.ServiceInterval) : 0,

            ServiceIntervalUnit:
                free ? e.ServiceIntervalUnit : '',

            MissedServiceGraceDays:
                free ? Number(e.MissedServiceGraceDays) : 0,

            MaxMissedServices:
                free ? Number(e.MaxMissedServices) : 0,

            Remarks:
                e.Remarks?.trim()
                ??
                '',

            IsActive:
                e.IsActive
        };
    }



    //===========================================================
    // Create
    //===========================================================

    private saveCreate():
        void
    {
        const model:
            CreateMembershipPolicy =
            this.buildPayload();

        this.isSaving =
            true;

        this.startProgress(
            'Saving Membership Policy',
            'Creating the membership policy...'
        );

        this.withMinimumDuration(
            this.membershipPoliciesService.create(
                model
            ),
            this.minimumSaveDurationMs
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Membership Policy saved successfully.',
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
                            'Membership Policy created successfully.'
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
                    'Create Membership Policy Error',
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
                                'Failed to create Membership Policy.'
                            )
                        );

                        this.cdr.detectChanges();
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
        const model:
            UpdateMembershipPolicy =
        {
            MembershipPolicyId:
                this.entity.MembershipPolicyId,

            ...this.buildPayload()
        };

        this.isSaving =
            true;

        this.startProgress(
            'Updating Membership Policy',
            'Updating the membership policy...'
        );

        this.withMinimumDuration(
            this.membershipPoliciesService.update(
                model
            ),
            this.minimumSaveDurationMs
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Membership Policy updated successfully.',
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
                            'Membership Policy updated successfully.'
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
                    'Update Membership Policy Error',
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
                                'Failed to update Membership Policy.'
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

        this.initializeEntity();

        this.cdr.detectChanges();
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
        )
        {
            void this.router.navigate(
                [
                    'list'
                ],
                {
                    relativeTo:
                        this.route.parent
                }
            );

            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            () =>
            {
                void this.router.navigate(
                    [
                        'list'
                    ],
                    {
                        relativeTo:
                            this.route.parent
                    }
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
    // Value Changed
    //===========================================================

    onValueChange():
        void
    {
        this.checkForChanges();

        this.cdr.detectChanges();
    }
}


//===============================================================
// Numeric fields typed as text
//===============================================================

type NumberField =
    'ValidityMonths'
    | 'EnrollmentFee'
    | 'RenewalFee'
    | 'SparePartsDiscountPercent'
    | 'AccessoriesDiscountPercent'
    | 'ServiceChargeDiscountPercent'
    | 'FreeServiceCount'
    | 'ServiceInterval'
    | 'MissedServiceGraceDays'
    | 'MaxMissedServices';