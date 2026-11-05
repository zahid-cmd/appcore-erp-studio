//===============================================================
// Sales Enquiries Form (Add / Update / View)
//
//   1 Enquiry Information : No (preview), Date, Branch (login
//     branch), Source, Executive, Status, Interest Level
//   2 Enquirer : Mobile (lookup : known enquirer, existing
//     customer, earlier enquiries), Name, Enquiry For (Self /
//     Referrer), Alternate Phone, Location, Address
//   3 Interest : Model, Second Model (no colour), Quantity,
//     Budget, Payment Mode, Exchange Bike, Expected Purchase Date
//   4 Follow-up & Notes : Next Follow-up Date, Method, Lost Reason
//     (Lost status), Remarks, Last Follow-up / Maturity (read only)
//
// After every successful save the page goes back to the list.
//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    AfterViewInit,
    OnDestroy,
    ChangeDetectorRef,
    ElementRef,
    HostListener,
    ViewChild,
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
    FormGridComponent
}
from '../../../../../../shared/components/layout/form-grid/form-grid';

import
{
    FormSectionComponent
}
from '../../../../../../shared/components/layout/form-section/form-section';

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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    DropdownComponent
}
from '../../../../../../shared/components/controls/dropdown/dropdown';

import
{
    DatepickerComponent
}
from '../../../../../../shared/components/controls/datepicker/datepicker';

import
{
    OrbitLoaderComponent
}
from '../../../../../../shared/components/utilities/orbit-loader/orbit-loader';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

import
{
    SalesFollowUpDialog,
    OUTCOME_COLORS
}
from '../follow-up/sales-follow-up-dialog';

import
{
    SalesFollowUp
}
from '../../../models/sales-follow-ups.model';

import
{
    SalesFollowUpsService
}
from '../../../services/sales-follow-ups.service';

import
{
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

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

import
{
    ProgressRunner
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-runner';

import
{
    AuthenticationStorageService
}
from '../../../../../../core/authentication/authentication-storage.service';


//===============================================================
// Models & Services
//===============================================================

import
{
    SalesEnquiry,
    CreateSalesEnquiry,
    UpdateSalesEnquiry,
    SalesEnquiriesDefaults,
    EnquiryOption,
    EnquirerLookup,
    EnquirerHistory
}
from '../../../models/sales-enquiries.model';

import
{
    SalesEnquiriesService
}
from '../../../services/sales-enquiries.service';


// A dropdown item
interface Item
{
    label:string;
    value:any;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'salesEnquiries-form',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        CommandCenterComponent,
        ControlTabsComponent,
        FormGridComponent,
        FormSectionComponent,
        TextboxComponent,
        TextareaComponent,
        SearchDropdownComponent,
        DropdownComponent,
        DatepickerComponent,
        OrbitLoaderComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        SalesFollowUpDialog
    ],

    templateUrl:'./sales-enquiries-form.html',

    styleUrls:
    [
        './sales-enquiries-form.css'
    ]
})


//===============================================================
// Sales Enquiries Form
//===============================================================

export class SalesEnquiriesForm
implements OnInit, AfterViewInit, OnDestroy
{
    //===========================================================
    // Body height
    //
    // The four sections are as tall as the longest one. The body
    // is capped (max-height) at the bottom of the visible content
    // area less a 12px gap, so a long form scrolls instead of
    // running under the footer. Refitted on resize and after
    // loading.
    //===========================================================

    @ViewChild('formBody')
    private formBody?:
        ElementRef<HTMLElement>;

    private fitTimer?:
        number;

    private static readonly BottomGap = 12;


    ngAfterViewInit():
        void
    {
        this.scheduleFit();
    }


    ngOnDestroy():
        void
    {
        if
        (
            this.fitTimer
        )
        {
            clearTimeout(this.fitTimer);
        }
    }


    @HostListener('window:resize')
    onWindowResize():
        void
    {
        this.scheduleFit();
    }


    private scheduleFit():
        void
    {
        if
        (
            this.fitTimer
        )
        {
            clearTimeout(this.fitTimer);
        }

        this.fitTimer =
            window.setTimeout(
                () => this.fitHeight(),
                30
            );
    }


    // Bottom of the visible content area : the layout's content
    // pane (main.content, which ends at the app footer); without
    // it, the window less the footer height
    private visibleBottom
    (
        element:
            HTMLElement
    ):
        number
    {
        const pane =
            element.closest('main.content');

        if
        (
            pane
        )
        {
            return Math.min(
                pane.getBoundingClientRect().bottom,
                window.innerHeight
            );
        }

        return window.innerHeight - 44;
    }


    private fitHeight():
        void
    {
        const body =
            this.formBody?.nativeElement;

        if
        (
            !body
        )
        {
            return;
        }

        const top =
            body.getBoundingClientRect().top;

        const height =
            Math.floor(
                this.visibleBottom(body) - top - SalesEnquiriesForm.BottomGap
            );

        const limit =
            `${Math.max(320, height)}px`;

        // Loading : the body takes the whole space, so the loader
        // sits in its middle with nothing to scroll
        body.style.height =
            this.loading
                ? limit
                : '';

        // Height = the longest section; never past the footer gap
        // (then the body scrolls). Never capped below 320px.
        body.style.maxHeight =
            limit;
    }


    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly service =
        inject(SalesEnquiriesService);

    private readonly toast =
        inject(ToastService);

    private readonly auth =
        inject(AuthenticationStorageService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges()
        );



    //===========================================================
    // Mode / Header
    //===========================================================

    mode:
        'add' | 'edit' | 'view' =
        'add';

    entityId:
        number =
        0;

    loading:
        boolean =
        true;

    selectedTab:
        string =
        'general';

    get isView():
        boolean
    {
        return this.mode === 'view';
    }

    get pageTitle():
        string
    {
        return this.mode === 'edit'
            ? 'Update Sales Enquiry'
            : this.mode === 'view'
                ? 'View Sales Enquiry'
                : 'Add Sales Enquiry';
    }

    get tabs():
        ControlTab[]
    {
        return [
            {
                id:'general',
                label:this.pageTitle
            }
        ];
    }

    get saveText():
        string
    {
        return this.mode === 'edit'
            ? 'Update'
            : 'Save';
    }

    get saveIcon():
        string
    {
        return this.mode === 'edit'
            ? 'fas fa-pen-to-square'
            : 'fas fa-floppy-disk';
    }

    //===========================================================
    // Follow-ups : calls logged on this enquiry (pop-up)
    // Next follow-up and method change only by logging a call
    // once the enquiry is saved.
    //===========================================================

    private readonly followUps =
        inject(SalesFollowUpsService);

    calls:
        SalesFollowUp[] =
        [];

    callsLoading:
        boolean =
        false;

    callEnquiry:
        SalesEnquiry | null =
        null;

    get followUpLocked():
        boolean
    {
        return this.locked
            ||
            this.mode !== 'add';
    }

    get canLogCall():
        boolean
    {
        return this.mode !== 'add'
            &&
            !this.entity.IsMatured
            &&
            this.entity.SalesEnquiryId > 0;
    }

    outcomeColor
    (
        outcome:
            string
    ):
        string
    {
        return OUTCOME_COLORS[outcome] ?? '#64748B';
    }

    callTime
    (
        value:
            string
    ):
        string
    {
        const date = new Date(value);

        return isNaN(date.getTime())
            ? ''
            : date.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    }

    private loadCalls
    (
        enquiryId:
            number
    ):
        void
    {
        this.callsLoading = true;

        this.followUps
            .getByEnquiry(enquiryId)
            .subscribe
            ({
                next:
                (
                    rows:
                        SalesFollowUp[]
                ):
                    void =>
                {
                    this.calls = rows ?? [];

                    this.callsLoading = false;

                    this.cdr.detectChanges();
                },

                error:
                ():
                    void =>
                {
                    this.calls = [];

                    this.callsLoading = false;

                    this.cdr.detectChanges();
                }
            });
    }

    openCall():
        void
    {
        if
        (
            !this.canLogCall
            ||
            this.progress.busy
        )
        {
            return;
        }

        this.callEnquiry = { ...this.entity };

        this.cdr.detectChanges();
    }

    // The call changed the enquiry on the server : load it again
    onCallSaved():
        void
    {
        this.callEnquiry = null;

        this.loadEntity();
    }

    onCallClosed():
        void
    {
        this.callEnquiry = null;

        this.cdr.detectChanges();
    }


    // Form locked : view, matured, or saving
    get locked():
        boolean
    {
        return this.isView
            ||
            this.entity.IsMatured
            ||
            this.progress.busy;
    }



    //===========================================================
    // Dropdown items (stable arrays, built once per load)
    //===========================================================

    sourceItems:
        Item[] = [];

    statusItems:
        Item[] = [];

    interestItems:
        Item[] = [];

    methodItems:
        Item[] = [];

    lostReasonItems:
        Item[] = [];

    modelItems:
        Item[] = [];

    secondModelItems:
        Item[] = [];

    executiveItems:
        Item[] = [];

    locationItems:
        Item[] = [];

    readonly enquiryForItems:
        Item[] =
    [
        { label:'Self',     value:'Self' },
        { label:'Referrer', value:'Referrer' }
    ];

    readonly paymentModeItems:
        Item[] =
    [
        { label:'Cash',     value:'Cash' },
        { label:'EMI',      value:'EMI' },
        { label:'Exchange', value:'Exchange' }
    ];


    // Status stage by id (Open / Lost)
    private statusStages =
        new Map<number, string>();

    private defaults:
        SalesEnquiriesDefaults | null =
        null;



    //===========================================================
    // Entity + text boxes
    //===========================================================

    entity:
        SalesEnquiry =
        this.emptyEntity();

    enquiryDate:
        Date =
        new Date();

    // An enquiry cannot be dated in the future
    readonly today:
        Date =
        new Date();

    expectedPurchaseDate:
        Date | null =
        null;

    nextFollowUpDate:
        Date | null =
        null;

    quantityText:
        string =
        '1';

    budgetText:
        string =
        '';



    //===========================================================
    // Enquirer lookup
    //===========================================================

    lookup:
        EnquirerLookup | null =
        null;

    lookupBusy:
        boolean =
        false;

    // Mobile of the last lookup (a new one replaces an old answer)
    private lookedUpMobile:
        string =
        '';

    // Mobile as loaded (edit : details are only refilled when it changes)
    private originalMobile:
        string =
        '';

    get earlierEnquiries():
        EnquirerHistory[]
    {
        return (this.lookup?.Enquiries ?? []).slice(0, 4);
    }

    get isLost():
        boolean
    {
        return this.statusStages.get(Number(this.entity.StatusId)) === 'Lost';
    }



    //===========================================================
    // Interest Level by days to purchase : an open enquiry with an
    // Expected Purchase Date takes the level whose days range
    // (Enquiry Setup) holds the days left. Without a date, or no
    // matching range, it is chosen by hand.
    //===========================================================

    // Switch (System Configurations) : the date is required
    get purchaseDateRequired():
        boolean
    {
        return this.defaults?.PurchaseDateRequired !== false;
    }


    // Days left to the expected purchase date (0 when due / past)
    get daysToPurchase():
        number | null
    {
        if
        (
            !this.expectedPurchaseDate
        )
        {
            return null;
        }

        const start =
            new Date();

        start.setHours(0, 0, 0, 0);

        const end =
            new Date(this.expectedPurchaseDate);

        end.setHours(0, 0, 0, 0);

        return Math.max(
            0,
            Math.round((end.getTime() - start.getTime()) / 86400000)
        );
    }


    // The level of the days left (open status only)
    get autoInterest():
        EnquiryOption | null
    {
        const days =
            this.daysToPurchase;

        if
        (
            days === null
            ||
            !this.defaults
            ||
            this.defaults.AutoInterest === false
            ||
            this.statusStages.get(Number(this.entity.StatusId)) !== 'Open'
        )
        {
            return null;
        }

        return this.defaults.InterestLevels.find(
            x =>
                x.DaysFrom !== null
                &&
                x.DaysFrom !== undefined
                &&
                days >= x.DaysFrom
                &&
                (x.DaysTo === null || x.DaysTo === undefined || days <= x.DaysTo)
        )
        ?? null;
    }


    get interestLabel():
        string
    {
        const days =
            this.daysToPurchase;

        return this.autoInterest && days !== null
            ? `Interest Level · Auto (${days === 0 ? 'due' : days + (days === 1 ? ' day' : ' days') + ' left'})`
            : 'Interest Level';
    }


    private applyAutoInterest():
        void
    {
        const auto =
            this.autoInterest;

        if
        (
            auto
        )
        {
            this.entity.InterestLevelId =
                auto.Id;
        }
    }



    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        const id =
            Number(this.route.snapshot.paramMap.get('id') ?? 0);

        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/')
                ? 'view'
                : url.includes('/edit/')
                    ? 'edit'
                    : 'add';

        this.entityId =
            id > 0 ? id : 0;

        if
        (
            this.entityId > 0
        )
        {
            this.loadEntity();
        }
        else
        {
            this.startNew();
        }
    }


    private emptyEntity():
        SalesEnquiry
    {
        const user =
            this.auth.getUser();

        return {
            SalesEnquiryId:0,
            EnquiryNo:'',
            EnquiryDate:'',
            BranchId:Number(user?.branchId ?? 0),
            BranchName:user?.branchName ?? '',
            SourceId:0,
            SourceName:'',
            StatusId:0,
            StatusName:'',
            StatusColor:'',
            StatusStage:'',
            InterestLevelId:null,
            InterestLevelName:'',
            InterestLevelColor:'',
            ExecutiveUserId:Number(user?.userProfileId ?? 0),
            ExecutiveName:'',
            EnquiryContactId:0,
            EnquirerMobile:'',
            EnquirerName:'',
            AltPhone:'',
            LocationId:null,
            LocationName:'',
            Address:'',
            EnquiryFor:'Self',
            ModelId:0,
            ModelName:'',
            BrandName:'',
            SecondModelId:null,
            SecondModelName:'',
            Quantity:1,
            Budget:0,
            PaymentMode:'Cash',
            ExchangeBike:'',
            ExpectedPurchaseDate:null,
            PreferredColor:'',
            FromWebsite:false,
            NextFollowUpDate:null,
            FollowUpMethodId:null,
            FollowUpMethodName:'',
            LastFollowUpDate:null,
            LastFollowUpNote:'',
            LostReasonId:null,
            LostReasonName:'',
            ClosedDate:null,
            Remarks:'',
            IsMatured:false,
            MaturedDate:null,
            SaleNo:'',
            CustomerId:null,
            CustomerName:'',
            MaturityDays:null
        };
    }



    //===========================================================
    // Dates
    //===========================================================

    private toIso
    (
        date:
            Date | null
    ):
        string | null
    {
        if
        (
            !date
        )
        {
            return null;
        }

        const pad =
            (n: number): string =>
                String(n).padStart(2, '0');

        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }


    private fromIso
    (
        value:
            string | null
    ):
        Date | null
    {
        if
        (
            !value
        )
        {
            return null;
        }

        const [year, month, day] =
            value.slice(0, 10).split('-').map(Number);

        return year && month && day
            ? new Date(year, month - 1, day)
            : null;
    }


    formatDate
    (
        value:
            string | null
    ):
        string
    {
        const date =
            this.fromIso(value);

        return date
            ? date.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
            : '—';
    }



    //===========================================================
    // Load
    //===========================================================

    private startNew():
        void
    {
        this.entity =
            this.emptyEntity();

        this.enquiryDate =
            new Date();

        this.loadDefaults(
            () =>
            {
                const d =
                    this.defaults!;

                const pick =
                    (list: EnquiryOption[]): number =>
                        list.find(x => x.IsDefault)?.Id ?? list[0]?.Id ?? 0;

                this.entity.EnquiryNo = d.NextEnquiryNo;

                this.entity.SourceId = pick(d.Sources);

                this.entity.StatusId =
                    d.Statuses.find(x => x.IsDefault && x.Stage === 'Open')?.Id
                    ??
                    d.Statuses.find(x => x.Stage === 'Open')?.Id
                    ??
                    0;

                const interest =
                    d.InterestLevels.find(x => x.IsDefault);

                this.entity.InterestLevelId = interest ? interest.Id : null;

                const method =
                    d.FollowUpMethods.find(x => x.IsDefault);

                this.entity.FollowUpMethodId = method ? method.Id : null;

                // Executive : the logged-in user when listed
                if
                (
                    !d.Executives.some(x => x.Id === this.entity.ExecutiveUserId)
                )
                {
                    this.entity.ExecutiveUserId = 0;
                }

                this.quantityText = '1';

                this.budgetText = '';

                this.loading = false;

                this.cdr.detectChanges();

                this.scheduleFit();
            }
        );
    }


    private loadEntity():
        void
    {
        this.loading =
            true;

        this.service
            .getById(this.entityId)
            .subscribe
            ({
                next:
                (
                    response:
                        SalesEnquiry
                ):
                    void =>
                {
                    this.entity = response;

                    this.loadCalls(response.SalesEnquiryId);

                    this.enquiryDate = this.fromIso(response.EnquiryDate) ?? new Date();

                    this.expectedPurchaseDate = this.fromIso(response.ExpectedPurchaseDate);

                    this.nextFollowUpDate = this.fromIso(response.NextFollowUpDate);

                    this.quantityText = String(response.Quantity || 1);

                    this.budgetText = response.Budget > 0 ? String(response.Budget) : '';

                    this.originalMobile = response.EnquirerMobile;

                    // Website enquiry, unassigned : the user who saves
                    // it becomes its executive
                    if
                    (
                        !(response.ExecutiveUserId > 0)
                        &&
                        this.mode === 'edit'
                    )
                    {
                        this.entity.ExecutiveUserId =
                            Number(this.auth.getUser()?.userProfileId ?? 0);
                    }

                    // A matured enquiry opens read-only
                    if
                    (
                        response.IsMatured
                        &&
                        this.mode === 'edit'
                    )
                    {
                        this.mode = 'view';
                    }

                    this.loadDefaults(
                        () =>
                        {
                            this.loading = false;

                            this.runLookup(response.EnquirerMobile, false);

                            this.cdr.detectChanges();

                            this.scheduleFit();
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
                    console.error('Load Sales Enquiry Error:', error);

                    this.toast.error(
                        'Load Failed',
                        this.errorText(error, 'The sales enquiry could not be loaded.')
                    );

                    this.onBackToList();
                }
            });
    }


    private loadDefaults
    (
        done:
            () => void
    ):
        void
    {
        this.service
            .getDefaults(this.toIso(this.enquiryDate) ?? '')
            .subscribe
            ({
                next:
                (
                    defaults:
                        SalesEnquiriesDefaults
                ):
                    void =>
                {
                    this.defaults = defaults;

                    this.buildItems();

                    done();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error('Load Defaults Error:', error);

                    this.loading = false;

                    this.toast.error(
                        'Load Failed',
                        this.errorText(error, 'The enquiry lists could not be loaded. Run SalesEnquiries_Tables.sql and EnquirySetup_Tables.sql.')
                    );

                    this.cdr.detectChanges();
                }
            });
    }


    // Lists from the defaults; the record's own (now inactive)
    // choice is kept so it still shows
    private buildItems():
        void
    {
        const d =
            this.defaults!;

        const e =
            this.entity;

        const items =
            (list: EnquiryOption[], ownId: number | null, ownName: string): Item[] =>
            {
                const result =
                    list.map(x => ({ label:x.Name, value:x.Id }));

                if
                (
                    ownId
                    &&
                    ownName
                    &&
                    !list.some(x => x.Id === ownId)
                )
                {
                    result.push({ label:`${ownName} (inactive)`, value:ownId });
                }

                return result;
            };

        this.sourceItems = items(d.Sources, e.SourceId, e.SourceName);

        this.statusItems = items(d.Statuses, e.StatusId, e.StatusName);

        this.interestItems = items(d.InterestLevels, e.InterestLevelId, e.InterestLevelName);

        this.methodItems = items(d.FollowUpMethods, e.FollowUpMethodId, e.FollowUpMethodName);

        this.lostReasonItems = items(d.LostReasons, e.LostReasonId, e.LostReasonName);

        this.executiveItems = items(d.Executives, e.ExecutiveUserId, e.ExecutiveName);

        this.locationItems = items(d.Locations, e.LocationId, e.LocationName);

        this.statusStages =
            new Map(d.Statuses.map(x => [x.Id, x.Stage] as [number, string]));

        if
        (
            e.StatusId
            &&
            !this.statusStages.has(e.StatusId)
        )
        {
            this.statusStages.set(e.StatusId, e.StatusStage);
        }

        const models =
            d.Models.map(
                x =>
                ({
                    label:x.BrandName ? `${x.Name} · ${x.BrandName}` : x.Name,
                    value:x.Id
                })
            );

        if
        (
            e.ModelId
            &&
            !models.some(x => x.value === e.ModelId)
        )
        {
            models.push({ label:`${e.ModelName} (inactive)`, value:e.ModelId });
        }

        this.modelItems = models;

        this.buildSecondModelItems();
    }


    // Second model : every model but the first choice
    private buildSecondModelItems():
        void
    {
        const list =
            this.modelItems.filter(x => x.value !== this.entity.ModelId);

        if
        (
            this.entity.SecondModelId
            &&
            !list.some(x => x.value === this.entity.SecondModelId)
            &&
            this.entity.SecondModelId !== this.entity.ModelId
        )
        {
            list.push({ label:`${this.entity.SecondModelName} (inactive)`, value:this.entity.SecondModelId });
        }

        this.secondModelItems = list;
    }



    //===========================================================
    // Inputs
    //===========================================================

    // A dropdown may emit the value or the whole { label, value } item
    private unwrap
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


    private toId
    (
        value:
            any
    ):
        number | null
    {
        const id =
            Number(this.unwrap(value) ?? 0);

        return id > 0 ? id : null;
    }


    onEnquiryDateChange
    (
        date:
            Date
    ):
        void
    {
        const old =
            this.enquiryDate;

        this.enquiryDate =
            date;

        // Add : the number follows the month
        if
        (
            this.mode === 'add'
            &&
            date
            &&
            (date.getMonth() !== old?.getMonth() || date.getFullYear() !== old?.getFullYear())
        )
        {
            this.service
                .getDefaults(this.toIso(date) ?? '')
                .subscribe
                ({
                    next:
                        defaults =>
                        {
                            if
                            (
                                this.toIso(this.enquiryDate)?.slice(0, 7) === this.toIso(date)?.slice(0, 7)
                            )
                            {
                                this.entity.EnquiryNo = defaults.NextEnquiryNo;

                                this.cdr.detectChanges();
                            }
                        },

                    error:
                        () => {}
                });
        }
    }


    onSourceChange(value: any): void { this.entity.SourceId = this.toId(value) ?? 0; }

    onExecutiveChange(value: any): void { this.entity.ExecutiveUserId = this.toId(value) ?? 0; }

    onInterestChange(value: any): void { this.entity.InterestLevelId = this.toId(value); }

    onMethodChange(value: any): void { this.entity.FollowUpMethodId = this.toId(value); }

    onLostReasonChange(value: any): void { this.entity.LostReasonId = this.toId(value); }

    onLocationChange(value: any): void { this.entity.LocationId = this.toId(value); }


    onStatusChange
    (
        value:
            any
    ):
        void
    {
        this.entity.StatusId =
            this.toId(value) ?? 0;

        this.applyAutoInterest();

        if
        (
            !this.isLost
        )
        {
            this.entity.LostReasonId =
                null;
        }

        this.cdr.detectChanges();
    }


    onEnquiryForChange
    (
        value:
            any
    ):
        void
    {
        this.entity.EnquiryFor =
            this.unwrap(value) === 'Referrer'
                ? 'Referrer'
                : 'Self';
    }


    onPaymentModeChange
    (
        value:
            any
    ):
        void
    {
        const mode =
            String(this.unwrap(value) ?? 'Cash');

        this.entity.PaymentMode =
            mode === 'EMI' || mode === 'Exchange'
                ? mode
                : 'Cash';

        if
        (
            this.entity.PaymentMode !== 'Exchange'
        )
        {
            this.entity.ExchangeBike =
                '';
        }

        this.cdr.detectChanges();
    }


    onModelChange
    (
        value:
            any
    ):
        void
    {
        this.entity.ModelId =
            this.toId(value) ?? 0;

        if
        (
            this.entity.SecondModelId === this.entity.ModelId
        )
        {
            this.entity.SecondModelId =
                null;
        }

        this.buildSecondModelItems();

        this.cdr.detectChanges();
    }


    onSecondModelChange
    (
        value:
            any
    ):
        void
    {
        this.entity.SecondModelId =
            this.toId(value);
    }


    onTextChange
    (
        field:
            'EnquirerName' | 'Address' | 'ExchangeBike' | 'PreferredColor',

        value:
            string | number
    ):
        void
    {
        this.entity[field] =
            String(value ?? '');
    }


    onRemarksChange
    (
        value:
            string
    ):
        void
    {
        this.entity.Remarks =
            String(value ?? '');
    }


    // Phones : digits only, at most 11
    private digits
    (
        value:
            string | number
    ):
        string
    {
        return String(value ?? '')
            .replace(/\D/g, '')
            .slice(0, 11);
    }


    onAltPhoneChange
    (
        value:
            string | number
    ):
        void
    {
        this.entity.AltPhone =
            this.digits(value);

        this.cdr.detectChanges();
    }


    onQuantityChange
    (
        value:
            string | number
    ):
        void
    {
        this.quantityText =
            String(value ?? '')
                .replace(/\D/g, '')
                .replace(/^0+(?=\d)/, '')
                .slice(0, 2);

        this.entity.Quantity =
            Number(this.quantityText || 0);

        this.cdr.detectChanges();
    }


    onBudgetChange
    (
        value:
            string | number
    ):
        void
    {
        let text =
            String(value ?? '')
                .replace(/[^0-9.]/g, '');

        const dot =
            text.indexOf('.');

        if
        (
            dot >= 0
        )
        {
            text =
                text.slice(0, dot + 1)
                +
                text.slice(dot + 1).replace(/\./g, '').slice(0, 2);
        }

        this.budgetText =
            text.slice(0, 14);

        this.entity.Budget =
            Number(this.budgetText || 0);

        this.cdr.detectChanges();
    }


    onExpectedDateChange(date: Date): void
    {
        this.expectedPurchaseDate = date ?? null;

        this.applyAutoInterest();

        this.cdr.detectChanges();
    }

    onNextFollowUpChange(date: Date): void { this.nextFollowUpDate = date ?? null; }


    get mobileWarning():
        string
    {
        const mobile =
            this.entity.EnquirerMobile;

        return mobile && (mobile.length !== 11 || !mobile.startsWith('01'))
            ? 'Mobile must be 11 digits starting with 01.'
            : '';
    }


    get altPhoneWarning():
        string
    {
        const phone =
            this.entity.AltPhone;

        return phone && (phone.length !== 11 || !phone.startsWith('01'))
            ? 'Alternate Phone must be 11 digits starting with 01.'
            : '';
    }



    //===========================================================
    // Enquirer Mobile : lookup at 11 digits
    //===========================================================

    onMobileChange
    (
        value:
            string | number
    ):
        void
    {
        this.entity.EnquirerMobile =
            this.digits(value);

        if
        (
            this.entity.EnquirerMobile.length === 11
            &&
            this.entity.EnquirerMobile.startsWith('01')
        )
        {
            this.runLookup(
                this.entity.EnquirerMobile,
                this.entity.EnquirerMobile !== this.originalMobile
            );
        }
        else
        {
            this.lookup = null;

            this.lookedUpMobile = '';
        }

        this.cdr.detectChanges();
    }


    private runLookup
    (
        mobile:
            string,

        fill:
            boolean
    ):
        void
    {
        if
        (
            !mobile
            ||
            mobile === this.lookedUpMobile
        )
        {
            return;
        }

        this.lookedUpMobile =
            mobile;

        this.lookupBusy =
            true;

        this.service
            .lookupEnquirer(mobile, this.entity.SalesEnquiryId)
            .subscribe
            ({
                next:
                (
                    result:
                        EnquirerLookup
                ):
                    void =>
                {
                    // Ignore an answer for an older mobile
                    if
                    (
                        this.entity.EnquirerMobile !== mobile
                    )
                    {
                        return;
                    }

                    this.lookup = result;

                    this.lookupBusy = false;

                    // A known enquirer fills the details (a new mobile
                    // on edit too); what was typed is kept when unknown
                    if
                    (
                        fill
                        &&
                        result.EnquiryContactId
                        &&
                        !this.locked
                    )
                    {
                        this.entity.EnquirerName = result.ContactName;

                        this.entity.AltPhone = result.AltPhone;

                        this.entity.Address = result.Address;

                        this.entity.LocationId = result.LocationId;

                        const location =
                            this.locationItems.find(x => x.value === result.LocationId);

                        this.entity.LocationName = location?.label ?? '';
                    }

                    this.cdr.detectChanges();
                },

                error:
                    () =>
                    {
                        this.lookupBusy = false;

                        this.cdr.detectChanges();
                    }
            });
    }



    //===========================================================
    // Save
    //===========================================================

    private validate():
        string
    {
        const e =
            this.entity;

        if (!this.enquiryDate) return 'Enquiry Date is required.';

        if (!(e.BranchId > 0)) return 'No branch : log in to a branch first.';

        if (!(e.SourceId > 0)) return 'Choose the Source of Enquiry.';

        if (!(e.ExecutiveUserId > 0)) return 'Choose the Executive.';

        if (!(e.StatusId > 0)) return 'Choose the Enquiry Status.';

        if (this.mobileWarning || !e.EnquirerMobile) return 'Enter the enquirer\'s Mobile (11 digits starting with 01).';

        if (!e.EnquirerName.trim()) return 'Enquirer Name is required.';

        if (this.altPhoneWarning) return this.altPhoneWarning;

        if (!e.InterestLevelId) return 'Choose the Interest Level.';

        if (!this.expectedPurchaseDate && this.purchaseDateRequired) return 'Expected Purchase Date is required.';

        if (!(e.ModelId > 0)) return 'Choose the Model.';

        if (!(e.Quantity >= 1 && e.Quantity <= 99)) return 'Quantity must be from 1 to 99.';

        if (e.PaymentMode === 'Exchange' && !e.ExchangeBike.trim()) return 'Exchange Bike is required for an exchange.';

        if (this.isLost && !e.LostReasonId) return 'Choose the Suspend Reason.';

        return '';
    }


    onSave():
        void
    {
        if
        (
            this.locked
        )
        {
            return;
        }

        const problem =
            this.validate();

        if
        (
            problem
        )
        {
            this.toast.warning(
                'Check the Form',
                problem
            );

            return;
        }

        const e =
            this.entity;

        const body:
            CreateSalesEnquiry =
        {
            EnquiryDate: this.toIso(this.enquiryDate)!,
            BranchId: e.BranchId,
            SourceId: e.SourceId,
            StatusId: e.StatusId,
            InterestLevelId: e.InterestLevelId,
            ExecutiveUserId: e.ExecutiveUserId,
            EnquirerMobile: e.EnquirerMobile,
            EnquirerName: e.EnquirerName.trim(),
            AltPhone: e.AltPhone,
            LocationId: e.LocationId,
            Address: e.Address.trim(),
            EnquiryFor: e.EnquiryFor,
            ModelId: e.ModelId,
            SecondModelId: e.SecondModelId,
            Quantity: e.Quantity,
            Budget: e.Budget,
            PaymentMode: e.PaymentMode,
            ExchangeBike: e.PaymentMode === 'Exchange' ? e.ExchangeBike.trim() : '',
            ExpectedPurchaseDate: this.toIso(this.expectedPurchaseDate),
            PreferredColor: (e.PreferredColor ?? '').trim(),
            NextFollowUpDate: this.isLost ? null : this.toIso(this.nextFollowUpDate),
            FollowUpMethodId: e.FollowUpMethodId,
            LostReasonId: this.isLost ? e.LostReasonId : null,
            Remarks: e.Remarks.trim()
        };

        const isAdd =
            this.mode === 'add';

        const call$ =
            isAdd
                ? this.service.create(body)
                : this.service.update(
                    {
                        SalesEnquiryId:e.SalesEnquiryId,
                        ...body
                    } as UpdateSalesEnquiry
                );

        this.progress
            .run<unknown>(
                isAdd ? 'Saving Sales Enquiry' : 'Updating Sales Enquiry',
                'Please wait while the sales enquiry is being saved...',
                isAdd ? 'Sales enquiry saved.' : 'Sales enquiry updated.',
                call$
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.toast.success(
                        isAdd ? 'Save Successful' : 'Update Successful',
                        isAdd
                            ? `Sales enquiry for ${body.EnquirerName} saved.`
                            : `${e.EnquiryNo} updated.`
                    );

                    this.onBackToList();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error('Save Sales Enquiry Error:', error);

                    this.toast.error(
                        isAdd ? 'Save Failed' : 'Update Failed',
                        this.errorText(error, 'The sales enquiry could not be saved.')
                    );
                }
            });
    }


    onClear():
        void
    {
        if
        (
            this.mode !== 'add'
            ||
            this.progress.busy
        )
        {
            return;
        }

        this.lookup = null;

        this.lookedUpMobile = '';

        this.expectedPurchaseDate = null;

        this.nextFollowUpDate = null;

        this.loading = true;

        this.scheduleFit();

        this.startNew();
    }


    onBackToList():
        void
    {
        void this.router.navigate(
            ['list'],
            {
                relativeTo:this.route.parent
            }
        );
    }



    //===========================================================
    // Server message
    //===========================================================

    private errorText
    (
        error:
            unknown,

        fallback:
            string
    ):
        string
    {
        const err =
            error as any;

        const body =
            err?.error;

        if
        (
            err?.status === 403
        )
        {
            return body?.message || body?.Message || 'You do not have permission for this action.';
        }

        if
        (
            typeof body === 'string'
            &&
            body.trim()
        )
        {
            return body.trim();
        }

        return body?.message || body?.Message || body?.title || fallback;
    }
}
