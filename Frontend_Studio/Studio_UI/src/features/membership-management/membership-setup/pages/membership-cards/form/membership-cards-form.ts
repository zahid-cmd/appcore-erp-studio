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
    MembershipCard,
    CreateMembershipCard,
    UpdateMembershipCard,
    MembershipCardsDefaults
}
from '../../../models/membership-cards.model';

import
{
    MembershipCardsService
}
from '../../../services/membership-cards.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'membership-cards-form',

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

        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./membership-cards-form.html',

    styleUrls:
    [
        './membership-cards-form.css'
    ]
})

//===============================================================
// Membership Cards Form
//===============================================================

export class MembershipCardsForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly membershipCardsService =
        inject(MembershipCardsService);

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
        'Membership Cards';

    entityName:
        string =
        'Membership Card';

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


    //===========================================================
    // Defaults (next codes and the four sub groups)
    //===========================================================

    private defaults:
        MembershipCardsDefaults | null =
        null;

    // "SUB-009-001-001 - Membership Fees" etc. (display)
    feeSubGroupDisplay:
        string =
        'SUB-009-001-001';

    discountSubGroupDisplay:
        string =
        'SUB-004-002-002';

    serviceIncomeSubGroupDisplay:
        string =
        'SUB-007-005-001';

    serviceExpenseSubGroupDisplay:
        string =
        'SUB-004-002-001';

    // Sub group names used to build the ledger names (add mode)
    private feeSubGroupName:
        string =
        '';

    private discountSubGroupName:
        string =
        '';

    private serviceIncomeSubGroupName:
        string =
        '';

    private serviceExpenseSubGroupName:
        string =
        '';

    // Why a new card cannot be saved yet ('' when fine)
    private setupMessage:
        string =
        '';


    //===========================================================
    // Entity
    //===========================================================

    entity:
        MembershipCard
        =
        this.createEmptyEntity();

    // Card Rank as typed (digits only)
    cardRankText:
        string =
        '';


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
        MembershipCard
    {
        return {
            MembershipCardId:0,
            CardCode:'',
            CardName:'',
            CardRank:0,
            FeeLedgerCode:'',
            FeeLedgerName:'',
            DiscountLedgerCode:'',
            DiscountLedgerName:'',
            MembershipServiceId:null,
            ServiceCode:'',
            ServiceName:'',
            ServiceValue:0,
            Readiness:'Pending',
            ServiceIncomeLedgerCode:'',
            ServiceIncomeLedgerName:'',
            ServiceExpenseLedgerCode:'',
            ServiceExpenseLedgerName:'',
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

        this.applyDefaults();

        this.setInitialFormState();
    }


    //===========================================================
    // Load Defaults (next codes and the four sub groups)
    //===========================================================

    private loadDefaults():
        void
    {
        this.membershipCardsService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        MembershipCardsDefaults
                ):
                    void =>
                {
                    this.defaults =
                        response;

                    const display =
                        (code: string, name: string): string =>
                            name
                                ? `${code} - ${name}`
                                : code;

                    this.feeSubGroupDisplay =
                        display(
                            response.FeeAccount.SubGroupCode || 'SUB-009-001-001',
                            response.FeeAccount.SubGroupName
                        );

                    this.discountSubGroupDisplay =
                        display(
                            response.DiscountAccount.SubGroupCode || 'SUB-004-002-002',
                            response.DiscountAccount.SubGroupName
                        );

                    this.serviceIncomeSubGroupDisplay =
                        display(
                            response.ServiceIncomeAccount.SubGroupCode || 'SUB-007-005-001',
                            response.ServiceIncomeAccount.SubGroupName
                        );

                    this.serviceExpenseSubGroupDisplay =
                        display(
                            response.ServiceExpenseAccount.SubGroupCode || 'SUB-004-002-001',
                            response.ServiceExpenseAccount.SubGroupName
                        );

                    this.feeSubGroupName =
                        response.FeeAccount.SubGroupName;

                    this.discountSubGroupName =
                        response.DiscountAccount.SubGroupName;

                    this.serviceIncomeSubGroupName =
                        response.ServiceIncomeAccount.SubGroupName;

                    this.serviceExpenseSubGroupName =
                        response.ServiceExpenseAccount.SubGroupName;

                    this.setupMessage =
                        [
                            response.FeeAccount.Message,
                            response.DiscountAccount.Message,
                            response.ServiceIncomeAccount.Message,
                            response.ServiceExpenseAccount.Message,
                            response.ServiceMessage
                        ]
                        .find(
                            message =>
                                !!message
                        )
                        ??
                        '';

                    if
                    (
                        this.isAddMode
                        &&
                        this.setupMessage
                    )
                    {
                        this.toast.info(
                            'Membership Card Setup',
                            this.setupMessage
                        );
                    }

                    if
                    (
                        this.isAddMode
                    )
                    {
                        const touched =
                            this.hasChanges;

                        this.applyDefaults();

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
                        'Load Membership Cards Defaults Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load the membership card defaults.'
                        )
                    );

                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Apply Defaults (Add mode : code previews)
    //
    // Saved codes never change; the server builds the real ones.
    //===========================================================

    private applyDefaults():
        void
    {
        if
        (
            !this.isAddMode
        )
        {
            return;
        }

        const defaults =
            this.defaults;

        this.entity.CardCode =
            defaults?.NextCardCode ?? '';

        if
        (
            !this.cardRankText
            &&
            defaults
        )
        {
            this.cardRankText =
                String(defaults.NextCardRank || 1);

            this.entity.CardRank =
                Number(this.cardRankText);
        }

        this.entity.FeeLedgerCode =
            defaults?.FeeAccount.NextLedgerCode ?? '';

        this.entity.DiscountLedgerCode =
            defaults?.DiscountAccount.NextLedgerCode ?? '';

        this.entity.ServiceCode =
            defaults?.NextServiceCode ?? '';

        this.entity.ServiceName =
            defaults?.ServiceSubCategoryName ?? '';

        this.entity.ServiceIncomeLedgerCode =
            defaults?.ServiceIncomeAccount.NextLedgerCode ?? '';

        this.entity.ServiceExpenseLedgerCode =
            defaults?.ServiceExpenseAccount.NextLedgerCode ?? '';

        this.refreshLedgerNames();
    }


    //===========================================================
    // Ledger Names : "<Sub Group Name> - <Card Name>"
    // (the server builds the same)
    //===========================================================

    private refreshLedgerNames():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        const card =
            this.cleanName(
                this.entity.CardName
            );

        const name =
            (subGroupName: string, current: string | undefined): string =>
                !subGroupName
                    ? current ?? ''
                    : card
                        ? `${this.cleanName(subGroupName)} - ${card}`
                        : '';

        // Edit mode : the saved names keep their sub group part
        if
        (
            this.isEditMode
        )
        {
            const rename =
                (current: string | undefined): string =>
                {
                    const value =
                        current ?? '';

                    const index =
                        value.lastIndexOf(' - ');

                    return index > 0
                        &&
                        card
                            ? `${value.slice(0, index)} - ${card}`
                            : value;
                };

            this.entity.FeeLedgerName =
                rename(this.entity.FeeLedgerName);

            this.entity.DiscountLedgerName =
                rename(this.entity.DiscountLedgerName);

            this.entity.ServiceIncomeLedgerName =
                rename(this.entity.ServiceIncomeLedgerName);

            this.entity.ServiceExpenseLedgerName =
                rename(this.entity.ServiceExpenseLedgerName);

            return;
        }

        this.entity.FeeLedgerName =
            name(this.feeSubGroupName, this.entity.FeeLedgerName);

        this.entity.DiscountLedgerName =
            name(this.discountSubGroupName, this.entity.DiscountLedgerName);

        this.entity.ServiceIncomeLedgerName =
            name(this.serviceIncomeSubGroupName, this.entity.ServiceIncomeLedgerName);

        this.entity.ServiceExpenseLedgerName =
            name(this.serviceExpenseSubGroupName, this.entity.ServiceExpenseLedgerName);
    }


    private cleanName
    (
        value:
            string | undefined
    ):
        string
    {
        return (value ?? '')
            .replace(/\s+/g, ' ')
            .trim();
    }


    //===========================================================
    // Card Name : kept as typed (ledger names follow it)
    //===========================================================

    onCardNameChange():
        void
    {
        this.refreshLedgerNames();

        this.onValueChange();
    }


    //===========================================================
    // Card Rank : digits only (1 - 999)
    //===========================================================

    onCardRankChange
    (
        value:
            any
    ):
        void
    {
        this.cardRankText =
            String(value ?? '');

        this.cdr.detectChanges();

        this.cardRankText =
            String(value ?? '')
                .replace(/[^0-9]/g, '')
                .slice(0, 3);

        this.entity.CardRank =
            this.cardRankText
                ? Number(this.cardRankText)
                : 0;

        this.onValueChange();
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
        this.membershipCardsService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        MembershipCard
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

                    const display =
                        (code: string | undefined, current: string): string =>
                            code
                                ? code
                                : current;

                    this.feeSubGroupDisplay =
                        response.FeeSubGroupName
                            ? `${response.FeeSubGroupCode} - ${response.FeeSubGroupName}`
                            : display(response.FeeSubGroupCode, this.feeSubGroupDisplay);

                    this.discountSubGroupDisplay =
                        response.DiscountSubGroupName
                            ? `${response.DiscountSubGroupCode} - ${response.DiscountSubGroupName}`
                            : display(response.DiscountSubGroupCode, this.discountSubGroupDisplay);

                    this.serviceIncomeSubGroupDisplay =
                        display(response.ServiceIncomeSubGroupCode, this.serviceIncomeSubGroupDisplay);

                    this.serviceExpenseSubGroupDisplay =
                        display(response.ServiceExpenseSubGroupCode, this.serviceExpenseSubGroupDisplay);

                    this.setInitialFormState();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Membership Card Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load Membership Card.'
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

        const name =
            this.cleanName(
                this.entity.CardName
            );

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
                    !name,

                message:
                    'Card Name is required.'
            },
            {
                failed:
                    name.length > 50,

                message:
                    'Card Name cannot be longer than 50 characters.'
            },
            {
                failed:
                    !(this.entity.CardRank >= 1 && this.entity.CardRank <= 999),

                message:
                    'Card Rank must be a whole number from 1 to 999 (1 = lowest card).'
            },
            {
                failed:
                    this.isAddMode
                    &&
                    !!this.setupMessage,

                message:
                    this.setupMessage
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
        CreateMembershipCard
    {
        return {
            CardName:
                this.cleanName(
                    this.entity.CardName
                ),

            CardRank:
                Number(this.entity.CardRank),

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
        const model:
            CreateMembershipCard =
            this.buildPayload();

        this.isSaving =
            true;

        this.startProgress(
            'Saving Membership Card',
            'Creating the card, its four ledgers and its complimentary service...'
        );

        this.withMinimumDuration(
            this.membershipCardsService.create(
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
                    'Membership Card saved successfully.',
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
                            'Membership Card created successfully.'
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
                    'Create Membership Card Error',
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
                                'Failed to create Membership Card.'
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
            UpdateMembershipCard =
        {
            MembershipCardId:
                this.entity.MembershipCardId,

            ...this.buildPayload()
        };

        this.isSaving =
            true;

        this.startProgress(
            'Updating Membership Card',
            'Updating the card, its ledgers and its complimentary service...'
        );

        this.withMinimumDuration(
            this.membershipCardsService.update(
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
                    'Membership Card updated successfully.',
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
                            'Membership Card updated successfully.'
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
                    'Update Membership Card Error',
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
                                'Failed to update Membership Card.'
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

        this.cardRankText =
            '';

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