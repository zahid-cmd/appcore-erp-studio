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


import
{
    DatepickerComponent
}
from '../../../../../../shared/components/controls/datepicker/datepicker';


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
    Membership,
    MembershipServiceWindow,
    CreateMembership,
    UpdateMembership,
    MembershipStatusDefaults,
    MembershipCardOption
}
from '../../../models/membership-status.model';

import
{
    MembershipStatusService
}
from '../../../services/membership-status.service';

//===============================================================
// Date helpers ("yyyy-MM-dd" <-> local Date)
//===============================================================

function isoToDate
(
    value:
        string | null | undefined
):
    Date | null
{
    const match =
        /^(\d{4})-(\d{2})-(\d{2})$/.exec(
            (value ?? '').trim()
        );

    if
    (
        !match
    )
    {
        return null;
    }

    const date =
        new Date(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3])
        );

    return isNaN(date.getTime())
        ? null
        : date;
}


function dateToIso
(
    value:
        Date | null | undefined
):
    string
{
    if
    (
        !(value instanceof Date)
        ||
        isNaN(value.getTime())
    )
    {
        return '';
    }

    return [
        value.getFullYear(),
        String(value.getMonth() + 1).padStart(2, '0'),
        String(value.getDate()).padStart(2, '0')
    ].join('-');
}


// "2026-10-21" -> "21-Oct-2026"
function dateText
(
    value:
        string | null | undefined
):
    string
{
    const date =
        isoToDate(
            value
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


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'membership-status-form',

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
        DatepickerComponent,

        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./membership-status-form.html',

    styleUrls:
    [
        './membership-status-form.css'
    ]
})

//===============================================================
// Membership Status Form
//===============================================================

export class MembershipStatusForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly membershipStatusService =
        inject(MembershipStatusService);

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
        'Membership Status';

    entityName:
        string =
        'Membership';

    //===========================================================
    // Tabs
    //===========================================================

    selectedTab:
        string =
        'general';

    // View / Edit : a second tab opens the free service schedule in
    // place of the form (same page, same canvas)
    private readonly generalTabs:
        ControlTab[] =
        [];

    get tabs():
        ControlTab[]
    {
        const list:
            ControlTab[] =
        [
            {
                id:'general',
                label:this.tabTitle
            }
        ];

        if
        (
            !this.isAddMode
        )
        {
            list.push(
                {
                    id:'schedule',
                    label:'Service Schedule'
                }
            );
        }

        // Same array while nothing changed (no re-render on every check)
        if
        (
            this.generalTabs.length === list.length
            &&
            this.generalTabs.every(
                (tab, index) =>
                    tab.id === list[index].id
                    &&
                    tab.label === list[index].label
            )
        )
        {
            return this.generalTabs;
        }

        this.generalTabs.splice(
            0,
            this.generalTabs.length,
            ...list
        );

        return this.generalTabs;
    }


    get isScheduleTab():
        boolean
    {
        return !this.isAddMode
            &&
            this.selectedTab === 'schedule';
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
                return `Enroll ${this.entityName}`;

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

    cardItems:
        any[]
        =
        [];

    customerItems:
        any[]
        =
        [];

    motorBikeItems:
        any[]
        =
        [];

    // Status changes allowed by hand (from the saved status)
    statusItems:
        any[]
        =
        [];

    private cards:
        MembershipCardOption[]
        =
        [];

    private today:
        string =
        dateToIso(new Date());

    private nextMembershipNo:
        string =
        '';


    //===========================================================
    // Entity
    //===========================================================

    entity:
        Membership
        =
        this.createEmptyEntity();

    // Status as saved (edit / view)
    savedStatus:
        string =
        'Pending';

    // Datepicker values
    enrollmentDateValue:
        Date | null =
        null;

    startDateValue:
        Date | null =
        null;


    //===========================================================
    // Free service schedule : inline action on one window
    //===========================================================

    actionWindowId:
        number =
        0;

    actionKind:
        'use' | 'approve' | '' =
        '';

    actionDate:
        string =
        '';

    actionText:
        string =
        '';

    isActing:
        boolean =
        false;


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
        Membership
    {
        return {
            MembershipId:0,
            MembershipNo:'',
            EntryType:'Enrollment',
            MembershipCardId:0,
            MembershipPolicyId:0,
            CustomerId:0,
            CardCode:'',
            CardName:'',
            PolicyCode:'',
            CustomerCode:'',
            CustomerName:'',
            CustomerType:'',
            MotorBikeName:'',
            UsedCount:0,
            MissedCount:0,
            ApprovedCount:0,
            IsEditable:true,
            Windows:[],
            CustomerVehicleId:null,
            MotorBikeId:0,
            ChassisNo:'',
            EngineNo:'',
            EnrollmentDate:'',
            StartDate:'',
            ExpiryDate:'',
            FeeAmount:0,
            FeeCollected:false,
            ValidityMonths:0,
            SparePartsDiscountPercent:0,
            AccessoriesDiscountPercent:0,
            ServiceChargeDiscountPercent:0,
            FreeServiceCount:0,
            CarriedServiceCount:0,
            ServiceInterval:0,
            ServiceIntervalUnit:'',
            MissedServiceGraceDays:0,
            MaxMissedServices:0,
            Status:'Pending',
            StatusReason:'',
            StatusDate:'',
            Remarks:''
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

        this.entity.MembershipNo =
            this.nextMembershipNo;

        this.entity.EnrollmentDate =
            this.today;

        this.entity.StartDate =
            this.today;

        this.savedStatus =
            'Pending';

        this.syncDates();

        this.applyCard();

        this.buildStatusItems();

        this.setInitialFormState();
    }


    //===========================================================
    // Load Defaults
    //===========================================================

    private loadDefaults():
        void
    {
        this.membershipStatusService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        MembershipStatusDefaults
                ):
                    void =>
                {
                    this.cards =
                        response.Cards ?? [];

                    this.nextMembershipNo =
                        response.NextMembershipNo;

                    if
                    (
                        response.Today
                    )
                    {
                        this.today =
                            response.Today;
                    }

                    this.cardItems =
                        this.cards.map(
                            card =>
                            ({
                                label:
                                    `${card.CardCode} - ${card.CardName}`,

                                value:
                                    Number(card.MembershipCardId)
                            })
                        );

                    this.customerItems =
                        (response.Customers ?? []).map(
                            customer =>
                            ({
                                label:
                                    `${customer.CustomerCode} - ${customer.DisplayName}`,

                                value:
                                    Number(customer.CustomerId)
                            })
                        );

                    this.motorBikeItems =
                        (response.MotorBikes ?? []).map(
                            bike =>
                            ({
                                label:
                                    `${bike.ProductCode} - ${bike.ProductName}`,

                                value:
                                    Number(bike.MotorBikeId)
                            })
                        );

                    this.ensureSavedItems();

                    if
                    (
                        this.isAddMode
                    )
                    {
                        const touched =
                            this.hasChanges;

                        this.entity.MembershipNo =
                            this.nextMembershipNo;

                        if
                        (
                            !touched
                        )
                        {
                            this.entity.EnrollmentDate =
                                this.today;

                            this.entity.StartDate =
                                this.today;

                            this.syncDates();
                        }

                        this.applyCard();

                        if
                        (
                            this.cards.length === 0
                        )
                        {
                            this.toast.info(
                                'No Membership Card',
                                'No active card with an active policy (Membership Setup).'
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
                        'Load Membership Status Defaults Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load the membership defaults.'
                        )
                    );

                    this.cdr.detectChanges();
                }
            });
    }


    // A saved card / customer / bike that is no longer offered
    // (inactive) still shows in its dropdown
    private ensureSavedItems():
        void
    {
        if
        (
            this.isAddMode
            ||
            !this.entity.MembershipId
        )
        {
            return;
        }

        const add =
            (items: any[], value: number, label: string): any[] =>
                value > 0
                &&
                !items.some(item => Number(item.value) === value)
                    ? [...items, { label, value }]
                    : items;

        this.cardItems =
            add(
                this.cardItems,
                Number(this.entity.MembershipCardId),
                `${this.entity.CardCode} - ${this.entity.CardName}`
            );

        this.customerItems =
            add(
                this.customerItems,
                Number(this.entity.CustomerId),
                `${this.entity.CustomerCode} - ${this.entity.CustomerName}`
            );

        this.motorBikeItems =
            add(
                this.motorBikeItems,
                Number(this.entity.MotorBikeId),
                this.entity.MotorBikeName
            );
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
    // Editing rules
    //===========================================================

    // Pending (or a new enrollment) : every field can change
    get canEditDetails():
        boolean
    {
        return !this.isViewMode
            &&
            !this.isSaving
            &&
            (
                this.isAddMode
                ||
                this.savedStatus === 'Pending'
            );
    }


    get needsReason():
        boolean
    {
        return !this.isAddMode
            &&
            this.entity.Status !== this.savedStatus
            &&
            (
                this.entity.Status === 'Suspended'
                ||
                this.entity.Status === 'Cancelled'
            );
    }


    private buildStatusItems():
        void
    {
        const allowed:
            Record<string, string[]> =
        {
            Pending:
                ['Pending', 'Cancelled'],

            Active:
                ['Active', 'Suspended', 'Cancelled'],

            Suspended:
                ['Suspended', 'Active', 'Cancelled']
        };

        const list =
            this.isAddMode
                ? ['Pending']
                : allowed[this.savedStatus] ?? [this.savedStatus];

        this.statusItems =
            list.map(
                status =>
                ({
                    label:status,
                    value:status
                })
            );
    }


    onStatusChange
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
            this.entity.Status =
                String(this.unwrapValue(value) ?? this.savedStatus);
        }

        if
        (
            this.entity.Status === this.savedStatus
        )
        {
            this.entity.StatusReason =
                this.originalReason;
        }

        this.onValueChange();
    }

    private originalReason:
        string =
        '';


    //===========================================================
    // Card / Customer / Bike
    //===========================================================

    get selectedCard():
        MembershipCardOption | undefined
    {
        return this.cards.find(
            card =>
                Number(card.MembershipCardId) ===
                Number(this.entity.MembershipCardId)
        );
    }


    onCardChange
    (
        value:
            any
    ):
        void
    {
        this.entity.MembershipCardId =
            Number(this.unwrapValue(value) ?? 0);

        this.applyCard();

        this.onValueChange();
    }


    // Add / Pending : the card's current policy (preview; the server
    // copies it on save)
    private applyCard():
        void
    {
        if
        (
            !this.canEditDetailsIgnoringSave
        )
        {
            return;
        }

        const card =
            this.selectedCard;

        if
        (
            !card
        )
        {
            if
            (
                this.isAddMode
            )
            {
                this.entity.PolicyCode = '';
                this.entity.FeeAmount = 0;
                this.entity.ValidityMonths = 0;
                this.entity.ExpiryDate = '';
            }

            return;
        }

        this.entity.CardCode = card.CardCode;
        this.entity.CardName = card.CardName;
        this.entity.MembershipPolicyId = card.MembershipPolicyId;
        this.entity.PolicyCode = card.PolicyCode;
        this.entity.ValidityMonths = card.ValidityMonths;
        this.entity.FeeAmount = card.EnrollmentFee;
        this.entity.SparePartsDiscountPercent = card.SparePartsDiscountPercent;
        this.entity.AccessoriesDiscountPercent = card.AccessoriesDiscountPercent;
        this.entity.ServiceChargeDiscountPercent = card.ServiceChargeDiscountPercent;
        this.entity.FreeServiceCount = card.FreeServiceCount;
        this.entity.ServiceInterval = card.ServiceInterval;
        this.entity.ServiceIntervalUnit = card.ServiceIntervalUnit;
        this.entity.MissedServiceGraceDays = card.MissedServiceGraceDays;
        this.entity.MaxMissedServices = card.MaxMissedServices;

        this.refreshExpiry();
    }


    private get canEditDetailsIgnoringSave():
        boolean
    {
        return !this.isViewMode
            &&
            (
                this.isAddMode
                ||
                this.savedStatus === 'Pending'
            );
    }


    onCustomerChange
    (
        value:
            any
    ):
        void
    {
        this.entity.CustomerId =
            Number(this.unwrapValue(value) ?? 0);

        this.onValueChange();
    }


    onMotorBikeChange
    (
        value:
            any
    ):
        void
    {
        this.entity.MotorBikeId =
            Number(this.unwrapValue(value) ?? 0);

        this.onValueChange();
    }


    // Chassis / Engine No : UPPERCASE while typing
    onCodeChange
    (
        field:
            'ChassisNo' | 'EngineNo'
    ):
        void
    {
        const upper =
            (this.entity[field] ?? '').toUpperCase();

        if
        (
            upper !==
            this.entity[field]
        )
        {
            this.cdr.detectChanges();

            this.entity[field] =
                upper;
        }

        this.onValueChange();
    }


    //===========================================================
    // Dates
    //===========================================================

    private syncDates():
        void
    {
        this.enrollmentDateValue =
            isoToDate(
                this.entity.EnrollmentDate
            );

        this.startDateValue =
            isoToDate(
                this.entity.StartDate
            );
    }


    onEnrollmentDateChange
    (
        value:
            Date | null
    ):
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        this.entity.EnrollmentDate =
            dateToIso(
                value
            );

        this.onValueChange();
    }


    onStartDateChange
    (
        value:
            Date | null
    ):
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        this.entity.StartDate =
            dateToIso(
                value
            );

        this.refreshExpiry();

        this.onValueChange();
    }


    // Expiry = Start + validity months - 1 day (the server sets the same)
    private refreshExpiry():
        void
    {
        const start =
            isoToDate(
                this.entity.StartDate
            );

        if
        (
            !start
            ||
            !(this.entity.ValidityMonths > 0)
        )
        {
            this.entity.ExpiryDate =
                '';

            return;
        }

        const day =
            start.getDate();

        const end =
            new Date(
                start.getFullYear(),
                start.getMonth() + this.entity.ValidityMonths,
                1
            );

        // Same day of the month, or the month's last day
        const last =
            new Date(
                end.getFullYear(),
                end.getMonth() + 1,
                0
            ).getDate();

        end.setDate(
            Math.min(day, last)
        );

        end.setDate(
            end.getDate() - 1
        );

        this.entity.ExpiryDate =
            dateToIso(
                end
            );
    }


    //===========================================================
    // Read-only displays
    //===========================================================

    get expiryDisplay():
        string
    {
        return dateText(
            this.entity.ExpiryDate
        );
    }


    get feeDisplay():
        string
    {
        const fee =
            Number(this.entity.FeeAmount ?? 0).toFixed(2);

        if
        (
            this.isAddMode
            ||
            this.savedStatus === 'Pending'
        )
        {
            return Number(this.entity.FeeAmount) > 0
                ? `${fee} (collect in Fees Collection)`
                : `${fee} (free card : Active on save)`;
        }

        return this.entity.FeeCollected
            ? `${fee} (collected)`
            : fee;
    }


    get discountDisplay():
        string
    {
        const e =
            this.entity;

        return `Parts ${Number(e.SparePartsDiscountPercent)}% / Accessories ${Number(e.AccessoriesDiscountPercent)}% / Service ${Number(e.ServiceChargeDiscountPercent)}%`;
    }


    get freeServiceDisplay():
        string
    {
        const e =
            this.entity;

        const total =
            Number(e.FreeServiceCount) + Number(e.CarriedServiceCount);

        if
        (
            !(total > 0)
        )
        {
            return 'No free services';
        }

        const carried =
            e.CarriedServiceCount > 0
                ? ` + ${e.CarriedServiceCount} carried over`
                : '';

        return `${e.FreeServiceCount}${carried}, one every ${e.ServiceInterval} ${(e.ServiceIntervalUnit || '').toLowerCase()}`;
    }


    get missedRuleDisplay():
        string
    {
        const e =
            this.entity;

        if
        (
            !(Number(e.FreeServiceCount) > 0)
        )
        {
            return '-';
        }

        return `Up to ${e.MaxMissedServices} with approval, until ${e.MissedServiceGraceDays} days after expiry`;
    }


    get statusDisplay():
        string
    {
        // New enrollment : what Save will do
        if
        (
            this.isAddMode
        )
        {
            if
            (
                !(Number(this.entity.MembershipCardId) > 0)
            )
            {
                return 'Select a membership card';
            }

            return Number(this.entity.FeeAmount) > 0
                ? 'Pending until the fee is collected'
                : 'Active on save (free card, full benefits)';
        }

        const date =
            dateText(
                this.entity.StatusDate
            );

        return date
            ? `${this.savedStatus} since ${date}`
            : this.savedStatus;
    }


    windowDate
    (
        value:
            string
    ):
        string
    {
        return dateText(
            value
        );
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
    // Load Entity (with the free service windows)
    //===========================================================

    private loadEntity():
        void
    {
        this.membershipStatusService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        Membership
                ): void =>
                {
                    this.entity =
                    {
                        ...response
                    };

                    this.savedStatus =
                        response.Status;

                    this.originalReason =
                        response.StatusReason;

                    this.syncDates();

                    this.ensureSavedItems();

                    this.buildStatusItems();

                    this.cancelAction();

                    this.setInitialFormState();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Membership Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load the membership.'
                    );

                    this.hasChanges =
                        false;

                    this.onBackToList();
                }
            });
    }


    //===========================================================
    // Free service schedule : Mark Used / Undo / Approve
    //
    // Saved at once (not with the form). Shown in view and edit.
    //===========================================================

    // Totals shown above the schedule
    get scheduleTotals():
        {
            total:
                number;

            taken:
                number;

            available:
                number;

            lapsed:
                number;

            rescheduled:
                number;

            rescheduleLeft:
                number;
        }
    {
        const windows =
            this.entity.Windows ?? [];

        const count =
            (test: (slot: MembershipServiceWindow) => boolean): number =>
                windows.filter(test).length;

        const rescheduled =
            count(slot => slot.IsApproved);

        return {
            total:
                windows.length,

            taken:
                count(slot => slot.State === 'Taken'),

            // Not taken and still possible : in a window, coming, or rescheduled
            available:
                count(
                    slot =>
                        slot.State === 'Available'
                        ||
                        slot.State === 'Upcoming'
                        ||
                        slot.State === 'Rescheduled'
                ),

            lapsed:
                count(slot => slot.State === 'Lapsed'),

            rescheduled:
                rescheduled,

            rescheduleLeft:
                Math.max(
                    0,
                    Number(this.entity.MaxMissedServices) - rescheduled
                )
        };
    }


    windowStateClass
    (
        slot:
            MembershipServiceWindow
    ):
        string
    {
        return `mst-state mst-state-${slot.State.toLowerCase()}`;
    }


    // "Taken" column : the date the service was taken
    takenText
    (
        slot:
            MembershipServiceWindow
    ):
        string
    {
        return slot.UsedDate
            ? dateText(slot.UsedDate)
            : '-';
    }


    // "Rescheduled" column : approval date and reason
    rescheduleText
    (
        slot:
            MembershipServiceWindow
    ):
        string
    {
        return slot.IsApproved
            ? `${dateText(slot.ApprovedDate)} : ${slot.ApprovalReason}`
            : '-';
    }


    startUse
    (
        window:
            MembershipServiceWindow
    ):
        void
    {
        this.actionWindowId =
            window.MembershipServiceWindowId;

        this.actionKind =
            'use';

        this.actionDate =
            this.today;

        this.actionText =
            '';
    }


    startApprove
    (
        window:
            MembershipServiceWindow
    ):
        void
    {
        this.actionWindowId =
            window.MembershipServiceWindowId;

        this.actionKind =
            'approve';

        this.actionDate =
            '';

        this.actionText =
            '';
    }


    cancelAction():
        void
    {
        this.actionWindowId =
            0;

        this.actionKind =
            '';

        this.actionDate =
            '';

        this.actionText =
            '';
    }


    isActionOn
    (
        window:
            MembershipServiceWindow
    ):
        boolean
    {
        return this.actionWindowId ===
            window.MembershipServiceWindowId;
    }


    onActionDateInput
    (
        event:
            Event
    ):
        void
    {
        this.actionDate =
            (event.target as HTMLInputElement).value;
    }


    onActionTextInput
    (
        event:
            Event
    ):
        void
    {
        this.actionText =
            (event.target as HTMLInputElement).value;
    }


    confirmAction
    (
        window:
            MembershipServiceWindow
    ):
        void
    {
        if
        (
            this.isActing
        )
        {
            return;
        }

        if
        (
            this.actionKind === 'approve'
            &&
            !this.actionText.trim()
        )
        {
            this.toast.error(
                'Validation',
                'A reason is required to reschedule a lapsed service.'
            );

            return;
        }

        if
        (
            this.actionKind === 'use'
            &&
            !this.actionDate
        )
        {
            this.toast.error(
                'Validation',
                'Taken Date is required.'
            );

            return;
        }

        const request =
            this.actionKind === 'use'
                ? this.membershipStatusService.useWindow(
                    this.entity.MembershipId,
                    window.MembershipServiceWindowId,
                    this.actionDate,
                    this.actionText.trim()
                )
                : this.membershipStatusService.approveWindow(
                    this.entity.MembershipId,
                    window.MembershipServiceWindowId,
                    this.actionText.trim()
                );

        const done =
            this.actionKind === 'use'
                ? `Free service ${window.WindowNo} marked taken.`
                : `Lapsed free service ${window.WindowNo} rescheduled.`;

        this.runWindowAction(
            request,
            done
        );
    }


    undoUse
    (
        window:
            MembershipServiceWindow
    ):
        void
    {
        this.confirmDialog.open(
            'Undo Free Service',
            `Undo the taken free service ${window.WindowNo}?`,
            () =>
            {
                this.runWindowAction(
                    this.membershipStatusService.undoUseWindow(
                        this.entity.MembershipId,
                        window.MembershipServiceWindowId
                    ),
                    `Free service ${window.WindowNo} is not taken any more.`
                );
            },
            'Undo',
            'Cancel',
            'primary'
        );
    }


    private runWindowAction
    (
        request:
            Observable<void>,
        message:
            string
    ):
        void
    {
        this.isActing =
            true;

        request.subscribe
        ({
            next:
            ():
                void =>
            {
                this.isActing =
                    false;

                this.toast.success(
                    'Free Services',
                    message
                );

                this.reloadWindows();
            },

            error:
            (
                error:
                    unknown
            ):
                void =>
            {
                this.isActing =
                    false;

                this.toast.error(
                    'Free Services',
                    this.extractErrorMessage(
                        error,
                        'The free service could not be updated.'
                    )
                );

                this.cdr.detectChanges();
            }
        });
    }


    // Refresh the schedule without losing unsaved form edits
    private reloadWindows():
        void
    {
        this.membershipStatusService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        Membership
                ): void =>
                {
                    const original =
                        JSON.parse(
                            this.originalEntity || '{}'
                        );

                    this.entity.Windows = response.Windows;
                    this.entity.UsedCount = response.UsedCount;
                    this.entity.MissedCount = response.MissedCount;
                    this.entity.ApprovedCount = response.ApprovedCount;

                    original.Windows = response.Windows;
                    original.UsedCount = response.UsedCount;
                    original.MissedCount = response.MissedCount;
                    original.ApprovedCount = response.ApprovedCount;

                    this.originalEntity =
                        JSON.stringify(
                            original
                        );

                    this.cancelAction();

                    this.checkForChanges();

                    this.cdr.detectChanges();
                },

                error:
                (): void =>
                {
                    this.cdr.detectChanges();
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
                    !(Number(e.CustomerId) > 0),

                message:
                    'Customer is required.'
            },
            {
                failed:
                    !(Number(e.MotorBikeId) > 0),

                message:
                    'Motor Bike is required.'
            },
            {
                failed:
                    !e.ChassisNo.trim(),

                message:
                    'Chassis No is required.'
            },
            {
                failed:
                    !e.EnrollmentDate
                    ||
                    !e.StartDate,

                message:
                    'Enrollment Date and Start Date are required.'
            },
            {
                failed:
                    !!e.EnrollmentDate
                    &&
                    !!e.StartDate
                    &&
                    e.StartDate < e.EnrollmentDate,

                message:
                    'Start Date cannot be before the Enrollment Date.'
            },
            {
                failed:
                    this.needsReason
                    &&
                    !e.StatusReason.trim(),

                message:
                    `A reason is required to set the membership ${e.Status}.`
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
        CreateMembership
    {
        const e =
            this.entity;

        return {
            MembershipCardId:
                Number(e.MembershipCardId),

            CustomerId:
                Number(e.CustomerId),

            MotorBikeId:
                Number(e.MotorBikeId),

            ChassisNo:
                e.ChassisNo.trim().toUpperCase(),

            EngineNo:
                e.EngineNo.trim().toUpperCase(),

            EnrollmentDate:
                e.EnrollmentDate,

            StartDate:
                e.StartDate,

            Remarks:
                e.Remarks?.trim()
                ??
                ''
        };
    }



    //===========================================================
    // Create
    //===========================================================

    private saveCreate():
        void
    {
        const model:
            CreateMembership =
            this.buildPayload();

        this.isSaving =
            true;

        this.startProgress(
            'Enrolling Membership',
            'Enrolling the membership and building its free service schedule...'
        );

        this.withMinimumDuration(
            this.membershipStatusService.create(
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
                    'Membership saved successfully.',
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
                            'Membership created successfully.'
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
                    'Create Membership Error',
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
                                'Failed to create Membership.'
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
            UpdateMembership =
        {
            MembershipId:
                this.entity.MembershipId,

            ...this.buildPayload(),

            Status:
                this.entity.Status,

            StatusReason:
                this.needsReason
                    ? this.entity.StatusReason.trim()
                    : this.originalReason
        };

        this.isSaving =
            true;

        this.startProgress(
            'Updating Membership',
            'Updating the membership...'
        );

        this.withMinimumDuration(
            this.membershipStatusService.update(
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
                    'Membership updated successfully.',
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
                            'Membership updated successfully.'
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
                    'Update Membership Error',
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
                                'Failed to update Membership.'
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