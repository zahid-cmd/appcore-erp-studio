//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
    DestroyRef,
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
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import
{
    Observable,
    forkJoin,
    of
}
from 'rxjs';

import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../shared/components/layout/page-toolbar/page-toolbar';
import { ControlTab, ControlTabsComponent } from '../../../../shared/components/controls/control-tabs/control-tabs';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { StepTabsComponent, StepTabsStep } from '../../../../shared/components/layout/step-tabs/step-tabs';
import { WorkspaceArtComponent } from '../../../../shared/components/layout/workspace-art/workspace-art';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { DropdownComponent } from '../../../../shared/components/controls/dropdown/dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { DatepickerComponent } from '../../../../shared/components/controls/datepicker/datepicker';
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ListTableColumn, ListTableComponent, ListTableRowAction, ListTableRowActionEvent } from '../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../human-resource-manangement/services/hr-progress.service';

import { hrToDate, hrToText } from '../../../human-resource-manangement/services/hr-date';

import { WsService } from '../../shared/ws.service';

import { openJobCardPrint, openJobCardTokensPrint } from '../../print/job-card.print';

import
{
    JobCard,
    JobCardBike,
    JobCardMotorBike,
    JobCardLookups,
    JobCardScheduleOption,
    JobCardAccess,
    JobCardStatusLine,
    JobCardWorkEntry,
    OutsourcedPart,
    OutsourcedParts,
    WorkshopOutsideWork,
    SaveJobCard,
    WsPartOption,
    WsServiceItem,
    wsDateTime,
    wsDay,
    wsMinutes,
    wsMoney,
    wsStatusColor
}
from '../../shared/ws.models';


//===============================================================
// Model
//===============================================================

type Mode =
    'list' | 'add' | 'edit' | 'view';

type Section =
    'complaints' | 'services' | 'parts' | 'checklist' | 'assign' | 'work' | 'status';

// A labour line or a part line of the form
interface Line
{
    key: number;
    ItemKind: string;
    ItemId: number | null;
    ItemCode: string;
    ItemName: string;
    Quantity: string;
    Rate: string;
    IsFree: boolean;
    Note: string;
}

interface CheckLine
{
    WorkshopChecklistItemId: number;
    ItemName: string;
    Result: string;
    Note: string;
}

interface Option
{
    label: string;
    value: any;
}


//===============================================================
// Job Cards (Service Operations > Workshop Management)
//
// One page : the list, and the form of one job card (add / edit /
// view). The form : left the bike, the customer and the check-in;
// right the complaints, the labour, the parts needed, the check-in
// checklist, the technician time stamps and the status.
//
// A saved card is worked on from its edit page : technicians start
// and stop (time stamped), the status moves Open > In Progress >
// Work Done > Ready. Invoicing and delivery come with Service
// Invoices.
//===============================================================

// A row of the customer search : a customer and the bikes the
// service center knows of him
interface CustomerHit
{
    key: string;
    customerId: number | null;
    name: string;
    mobile: string;
    bikes: JobCardBike[];
}

@Component(
{
    selector:'job-cards',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        StepTabsComponent,
        WorkspaceArtComponent,
        ControlTabsComponent,
        SearchDropdownComponent,
        DropdownComponent,
        TextboxComponent,
        DatepickerComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./job-cards.html',
    styleUrl:'./job-cards.css'
})
export class JobCardsPage
implements OnInit
{
    private readonly ws = inject(WsService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progress = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    readonly asDate = hrToDate;

    readonly money = wsMoney;

    readonly dateTime = wsDateTime;

    readonly minutes = wsMinutes;

    mode:
        Mode = 'list';

    entityId =
        '';

    loading =
        false;

    loadFailed =
        false;

    isSaving =
        false;

    get isView(): boolean
    {
        return this.mode === 'view';
    }

    // The fields can be changed : a new card, or a card still open.
    // A stage is a page action : the opening desk changes a card
    // while it is Open, the work desk afterwards.
    get canEdit(): boolean
    {
        // the assignment desk only assigns
        if (this.desk === 'assignment')
        {
            return false;
        }

        if (this.mode === 'add')
        {
            return this.access.CanOpen;
        }

        if (this.mode !== 'edit' || !this.card?.CanEdit)
        {
            return false;
        }

        return this.card.Status === 'Open' ? this.access.CanEditOpen : this.access.CanWork;
    }

    // What the user may do (all, until the lists are read)
    get access(): JobCardAccess
    {
        return this.lookups?.Access ?? { CanOpen:true, CanEditOpen:true, CanAssign:true, CanWork:true };
    }

    // Job Card Assignment can be saved
    get canAssign(): boolean
    {
        return this.mode === 'edit' && !!this.card?.CanAssign && this.access.CanAssign;
    }

    // Work can be started, stopped and removed
    get canWork(): boolean
    {
        return this.mode === 'edit' && !!this.card?.CanWorkOn && this.access.CanWork;
    }

    // The statuses the user may move the card to
    get nextStatuses(): string[]
    {
        const current = this.card?.Status ?? '';

        return (this.card?.NextStatuses ?? []).filter(target =>
            current === 'Assigned' && target === 'Open' ? this.access.CanAssign
            : current === 'Open' || current === 'Cancelled' ? this.access.CanEditOpen
            : this.access.CanWork);
    }

    // The stages of a job card, strictly in order
    readonly stages =
        ['Opening', 'Assignment', 'Work', 'Closing', 'Billing', 'Delivery'];

    get stageNo(): number
    {
        return Number(this.card?.StageNo) || 0;
    }

    // The labour and the parts can be changed : not while the card
    // follows an approved estimate
    get canEditLines(): boolean
    {
        return this.canEdit && !this.card?.LinesLocked;
    }

    // The estimate the card was made from opens
    openEstimate():
        void
    {
        if (this.card?.EstimatePublicId)
        {
            void this.router.navigate(['../../../service-estimates/view', this.card.EstimatePublicId], { relativeTo:this.route });
        }
    }

    // The desk this page is opened as : '' the Job Cards page (all
    // the stages), or the page of one stage (its own menu entry)
    desk:
        '' | 'opening' | 'assignment' = '';

    get listTitle(): string
    {
        return this.desk === 'opening' ? 'Job Card Opening' : this.desk === 'assignment' ? 'Job Card Assignment' : 'Job Cards';
    }

    get listSubtitle(): string
    {
        return this.desk === 'opening'
            ? 'Stage 1 : receive the bike, open the job card, print the tokens of the customer'
            : this.desk === 'assignment'
                ? 'Stage 2 : give an opened job card its service engineer, bay and technicians'
                : 'The bikes in the workshop : check-in, work and technician time';
    }

    get listIcon(): string
    {
        return this.desk === 'opening' ? 'fas fa-door-open' : this.desk === 'assignment' ? 'fas fa-user-check' : 'fas fa-clipboard-list';
    }

    // The simple page (route data) : only what opens a job card -
    // date, numbers, customer, bike, check-in. No labour, no parts,
    // no tabs. The full form stays in this page, on no route for now.
    simple =
        false;

    // The New Job page : one light step, the workspace layout
    readonly openSteps:
        StepTabsStep[] =
    [
        { id:'open', label:'Job Opening' },
        { id:'observations', label:'Observations' }
    ];

    openTab =
        'open';

    // The bike : bought, serviced last (yyyy-MM-dd). A bike sold by
    // us : from the records, not changed here. A bike of another
    // showroom : asked from the customer.
    purchaseDate =
        '';

    lastServiceDate =
        '';

    // The observations of the opening desk : picked from the list
    // of Workshop Configuration. One at least; a customer with no
    // complaint gets the fixed one.
    static readonly NO_COMPLAINT =
        'No complaint or problem';

    openObs:
        { key: number; WorkshopObservationId: number | null; Observation: string; Note: string }[] = [];

    observationItems:
        { label: string; value: number }[] = [];

    observationPick:
        number | null = null;

    get noComplaint(): boolean
    {
        return this.openObs.some(x => x.WorkshopObservationId === null && x.Observation === JobCardsPage.NO_COMPLAINT);
    }

    // The default observation of Workshop Configuration : a new job
    // starts with it
    private defaultObservationId:
        number | null = null;

    private putDefaultObservation():
        void
    {
        const item = this.observationItems.find(x => x.value === this.defaultObservationId);

        if (this.mode === 'add' && item && this.openObs.length === 0)
        {
            this.openObs = [{ key:this.nextKey++, WorkshopObservationId:item.value, Observation:item.label, Note:'' }];
        }
    }

    private loadObservationList():
        void
    {
        this.ws.getEstimateObservationLists().subscribe(
        {
            next:lists =>
            {
                this.observationItems =
                    (lists?.Observations ?? [])
                        .filter(x => x.IsActive !== false)
                        .map(x => ({ label:x.Name, value:x.WorkshopObservationId }));

                this.defaultObservationId =
                    (lists?.Observations ?? []).find(x => x.IsDefault === true && x.IsActive !== false)?.WorkshopObservationId ?? null;

                this.putDefaultObservation();

                this.cdr.detectChanges();
            },
            error:error => this.failed(error, 'The observations could not be loaded.')
        });
    }

    onObservationPick(value: any):
        void
    {
        const id = Number(value) || 0;

        const item = this.observationItems.find(x => x.value === id);

        this.observationPick = null;

        if (item && !this.openObs.some(x => x.WorkshopObservationId === id))
        {
            // a problem is seen : "no complaint" goes
            this.openObs =
                [
                    ...this.openObs.filter(x => x.WorkshopObservationId !== null),
                    { key:this.nextKey++, WorkshopObservationId:id, Observation:item.label, Note:'' }
                ];
        }

        this.cdr.detectChanges();
    }

    // The customer has no complaint : the only observation
    setNoComplaint():
        void
    {
        this.openObs =
            [{ key:this.nextKey++, WorkshopObservationId:null, Observation:JobCardsPage.NO_COMPLAINT, Note:'' }];

        this.cdr.detectChanges();
    }

    removeObservation(row: { key: number }):
        void
    {
        this.openObs = this.openObs.filter(x => x.key !== row.key);
        this.cdr.detectChanges();
    }

    onObsNote(row: { Note: string }, event: Event):
        void
    {
        row.Note = (event.target as HTMLInputElement).value;
    }

    // Clear (the New Job page) : the form as it opens
    clearForm():
        void
    {
        if (!this.simple || this.mode !== 'add' || this.isSaving)
        {
            return;
        }

        // the customer, the bike, the search
        this.changeCustomer();

        this.jobDate = (this.lookups?.Today ?? '').substring(0, 10) || hrToText(new Date());
        this.jobType = (this.lookups?.JobTypes ?? [])[0] ?? '';
        this.previewNo();
        this.kmReading = '';
        this.fuelLevel = '';
        this.basicRequirement = '';
        this.remarks = '';
        this.purchaseDate = '';
        this.lastServiceDate = '';
        this.openObs = [];
        this.putDefaultObservation();
        this.observationPick = null;
        this.openTab = 'open';

        this.cdr.detectChanges();
    }

    onPurchaseDate(date: Date | null):
        void
    {
        this.purchaseDate = date ? hrToText(date) : '';
        this.cdr.detectChanges();
    }

    onLastServiceDate(date: Date | null):
        void
    {
        this.lastServiceDate = date ? hrToText(date) : '';
        this.cdr.detectChanges();
    }

    readonly openConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:false,
        reserveFooterSpace:false,
        bodyScrollable:true,
        fixedHeight:true
    };

    get openBranchName(): string
    {
        return this.branchItems.find(x => x.value === this.branchId)?.label ?? '';
    }

    // The New Job page : the customer is never typed. He is found
    // by the search; when nobody is found, Add sends the user to
    // Customer Profiles (Outside customer) and brings him back here
    // with the saved customer on the card.
    searchedNone =
        false;

    // The matches of the toolbar search open right under its box :
    // the same left edge, the same width
    toolBox =
        { left:0, top:0, width:0 };

    private placeResults():
        void
    {
        const box = document.querySelector('.jc-tool-search .se-cust-search');

        if (box)
        {
            const rect = box.getBoundingClientRect();

            this.toolBox = { left:rect.left, top:rect.bottom, width:rect.width };
        }
    }

    // The search holds a whole mobile number : 11 digits
    get fullMobileTyped(): boolean
    {
        return /^[0-9]{11}$/.test((this.customerQuery ?? '').trim());
    }

    // Add opens only when a whole mobile number (11 digits) was
    // searched and nobody has it (owner 2026-11-18)
    get canAddCustomer(): boolean
    {
        return this.mode === 'add' && !this.customerPicked && this.searchedNone && this.fullMobileTyped && this.access.CanOpen;
    }

    addCustomer():
        void
    {
        if (!this.canAddCustomer)
        {
            return;
        }

        const typed = this.customerQuery.trim();

        void this.router.navigate(
            ['/settings/client-settings/customer-profiles/add'],
            {
                queryParams:
                {
                    type:'Outside',
                    lockType:'1',
                    returnUrl:this.router.url.split('?')[0],
                    // a phone number typed in the search goes with him
                    phone:/^[0-9+][0-9 -]{5,19}$/.test(typed) ? typed : null
                }
            });
    }

    // Back from Customer Profiles (?customerPhone=) : the saved
    // customer comes onto the card
    private pickReturnedCustomer():
        void
    {
        const phone = (this.route.snapshot.queryParamMap.get('customerPhone') ?? '').trim();

        if (!phone || this.mode !== 'add')
        {
            return;
        }

        void this.router.navigate([], { relativeTo:this.route, queryParams:{ customerPhone:null }, queryParamsHandling:'merge', replaceUrl:true });

        this.ws.findBikes(phone).subscribe(
        {
            next:bikes =>
            {
                const hits = this.toHits(bikes ?? []);

                const hit = hits.find(x => (x.mobile || '').trim() === phone) ?? (hits.length === 1 ? hits[0] : null);

                if (hit)
                {
                    this.pickHit(hit);
                    return;
                }

                // several, none exactly : the user chooses
                this.customerQuery = phone;
                this.hits = hits;
                this.hitActive = 0;
                this.hitsOpen = hits.length > 0;
                this.placeResults();
                this.searchedNone = hits.length === 0;
                this.cdr.detectChanges();
            },
            error:error => this.failed(error, 'The saved customer could not be loaded : search the phone number.')
        });
    }

    // A new card : the number it will get (today, this service
    // center), shown before saving; otherwise "Given when it is saved"
    private previewNo():
        void
    {
        if (this.card || this.mode !== 'add')
        {
            return;
        }

        const today = (this.lookups?.Today ?? '').substring(0, 10);

        this.jobCardNo =
            (this.jobDate === today ? this.lookups?.NextJobCardNos?.[this.branchId] : '')
            || this.lookups?.NextJobCardNo
            || '';
    }

    // The token, big, on the New Job page : the one of the saved
    // card; before saving, the one the card will get (today, this
    // service center); '-' when it cannot be told or there is none
    get tokenBig(): string
    {
        if (this.card)
        {
            return this.tokenNo || '-';
        }

        const today = (this.lookups?.Today ?? '').substring(0, 10);

        if (this.jobType === 'Internal' || !this.branchId || !today || this.jobDate !== today)
        {
            return '-';
        }

        return jobToken('W-' + String(this.lookups?.NextTokens?.[this.branchId] ?? 1).padStart(3, '0'), this.jobDate);
    }

    // The big token in two parts : "1118" (regular) and "001" (big)
    // mmdd001 (no hyphen, owner 2026-11-18) : the first four are
    // the month and the day, the rest the serial
    get tokenPrefix(): string
    {
        return /^[0-9]{7,}$/.test(this.tokenBig) ? this.tokenBig.substring(0, 4) : '';
    }

    get tokenSerial(): string
    {
        return /^[0-9]{7,}$/.test(this.tokenBig) ? this.tokenBig.substring(4) : this.tokenBig;
    }

    get tokenNote(): string
    {
        if (this.card)
        {
            return this.tokenNo ? 'The serial token of this job card' : 'This job card has no serial token';
        }

        return this.jobType === 'Internal'
            ? 'An internal job has no serial token'
            : this.tokenBig === '-'
                ? 'Given when the job card is saved'
                : 'The next serial token : given when the job card is saved';
    }

    // The day-wise serial of the card : 001, 002 ...
    get tokenNo(): string
    {
        return jobToken(this.card?.WelcomeTokenNo, this.card?.JobDate);
    }

    // The card has the tokens of the customer
    get hasTokens(): boolean
    {
        return !!this.card?.WelcomeTokenNo || !!this.card?.DeliveryTokenNo;
    }

    get pageTitle(): string
    {
        if (this.desk === 'assignment')
        {
            return this.mode === 'edit' ? 'Assign Job Card' : 'View Job Card';
        }

        if (this.simple)
        {
            return this.mode === 'add' ? 'New Job' : this.mode === 'edit' ? 'Update Job' : 'View Job';
        }

        return this.mode === 'add' ? 'Add Job Card' : this.mode === 'edit' ? 'Update Job Card' : 'View Job Card';
    }

    readonly listConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:true,
        reserveFooterSpace:true,
        bodyScrollable:true,
        fixedHeight:true,
        visibleRows:10,
        rowHeight:32,
        headerHeight:36,
        footerHeight:56
    };

    readonly formConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:false,
        reserveFooterSpace:false,
        bodyScrollable:true,
        fixedHeight:true
    };

    //===========================================================
    // List
    //===========================================================

    tabs:
        ControlTab[] =
    [
        { id:'all', label:'All' },
        { id:'Open', label:'Open' },
        { id:'Assigned', label:'Assigned' },
        { id:'Allocated', label:'Allocated' },
        { id:'In Progress', label:'In Progress' },
        { id:'Waiting Parts', label:'Waiting Parts' },
        { id:'Work Done', label:'Work Done' },
        { id:'Ready', label:'Ready' },
        { id:'Cancelled', label:'Cancelled' }
    ];

    selectedTab =
        'all';

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        // balanced (owner 2026-11-19) : fewer, wider columns - the
        // date || the serial token under the job card no, the mobile
        // under the customer, the bike no under the model
        { header:'Job Card', field:'JobCardNo', width:'250px', align:'left', subField:'DateText', subFigureField:'TokenText' },
        { header:'Customer', field:'CustomerName', width:'230px', align:'left', subField:'Mobile' },
        { header:'Model', field:'ModelName', width:'240px', align:'left', subField:'BikeText' },
        { header:'Job Type', field:'JobType', width:'160px', align:'left' },
        { header:'Working Now', field:'WorkingNow', width:'150px', align:'left' },
        { header:'Status', field:'StatusText', width:'175px', align:'left', dotField:'StatusColor' },
        { header:'Actions', field:'actions', type:'actions', width:'180px', align:'center' }
    ];

    rowActions:
        ListTableRowAction[] =
    [
        // (no stage button on a row, owner 2026-11-18 : a job is
        // assigned on the Job Card Assignment page, closed on its own
        // page)
        { key:'tokens', icon:'fas fa-ticket', title:'Print the tokens', tone:'primary' },
        { key:'print', icon:'fas fa-print', title:'Print the job card', tone:'primary' }
    ];

    private all:
        any[] = [];

    rows:
        any[] = [];

    searchText =
        '';

    currentPage =
        1;

    pageSize =
        10;

    totalRecords =
        0;

    historyOpened =
        false;

    historyItems:
        any[] = [];

    //===========================================================
    // Form : lists
    //===========================================================

    lookups:
        JobCardLookups | null = null;

    card:
        JobCard | null = null;

    branchItems:
        Option[] = [];

    modelItems:
        Option[] = [];

    // New Job page : the Motor Bikes (one model in one colour)
    motorBikeItems:
        Option[] = [];

    advisorItems:
        Option[] = [];

    fuelItems:
        Option[] = [];

    jobTypeItems:
        Option[] = [];

    serviceItems:
        Option[] = [];

    partItems:
        Option[] = [];

    technicianItems:
        Option[] = [];

    bayItems:
        Option[] = [];

    scheduleItems:
        Option[] = [];

    private schedules:
        JobCardScheduleOption[] = [];

    private parts:
        WsPartOption[] | null = null;

    //===========================================================
    // Form : the head
    //===========================================================

    jobCardNo =
        '';

    jobDate =
        '';

    branchId =
        0;

    serviceVehicleId:
        number | null = null;

    chassisNo =
        '';

    engineNo =
        '';

    registrationNo =
        '';

    modelId:
        number | null = null;

    modelName =
        '';

    brandName =
        '';

    private brandManagementId:
        number | null = null;

    colorName =
        '';

    customerId:
        number | null = null;

    customerName =
        '';

    mobile =
        '';

    kmReading =
        '';

    fuelLevel =
        '';

    jobType =
        '';

    scheduleId:
        number | null = null;

    scheduleName =
        '';

    enquiryId:
        number | null = null;

    advisorId:
        number | null = null;

    promisedDate =
        '';

    promisedTime =
        '';

    pickupDrop =
        false;

    basicRequirement =
        '';

    remarks =
        '';

    // What the found bike says (warranty, sale date, last km)
    bikeInfo =
        '';

    // A new card made from an estimate : its public id and its name
    fromEstimate =
        '';

    fromEstimateNo =
        '';

    //===========================================================
    // Form : the customer search (as on the sales invoice)
    //===========================================================

    customerQuery =
        '';

    finding =
        false;

    hits:
        CustomerHit[] = [];

    hitsOpen =
        false;

    hitActive =
        0;

    // a customer was picked from the list : name and mobile are locked
    customerPicked =
        false;

    // the bikes of the picked customer, and the list to choose from
    customerBikes:
        JobCardBike[] = [];

    bikeChoices:
        JobCardBike[] = [];

    private searchTimer:
        any = null;

    private searchNo =
        0;

    //===========================================================
    // Form : the lines
    //===========================================================

    readonly sectionTabs:
        ControlTab[] =
    [
        { id:'complaints', label:'Complaints' },
        { id:'services', label:'Service / Labour' },
        { id:'parts', label:'Parts Needed' },
        { id:'checklist', label:'Checklist' },
        { id:'assign', label:'Assignment' },
        { id:'work', label:'Technician Time' },
        { id:'status', label:'Status' }
    ];

    // The tabs a card shows : only those of the stages it has
    // reached. A new card : what the opening desk writes; an Open
    // card : also its assignment and status; technician time once
    // it is assigned.
    shownTabs:
        ControlTab[] = this.sectionTabs.slice(0, 4);

    private setTabs():
        void
    {
        this.shownTabs =
            !this.card
                ? this.sectionTabs.slice(0, 4)
                : this.card.Status === 'Open'
                    ? this.sectionTabs.filter(x => x.id !== 'work')
                    : this.sectionTabs;
    }

    section:
        Section = 'complaints';

    private nextKey =
        1;

    complaints:
        { key: number; text: string }[] = [];

    services:
        Line[] = [];

    partLines:
        Line[] = [];

    checklist:
        CheckLine[] = [];

    workEntries:
        JobCardWorkEntry[] = [];

    statusHistory:
        JobCardStatusLine[] = [];

    readonly results =
        ['OK', 'Not OK', 'N/A'];

    servicePick:
        any = null;

    partPick:
        any = null;

    // Job Card Assignment
    engineerItems:
        Option[] = [];

    assignEngineerId:
        number | null = null;

    assignBayId:
        number | null = null;

    // the first : the lead
    assignTechnicianIds:
        number[] = [];

    assignPick:
        any = null;

    assignNote =
        '';

    // Starting work
    workTechnicianId:
        number | null = null;

    workBayId:
        number | null = null;

    workNote =
        '';

    // The note of a status change (needed to cancel)
    statusNote =
        '';

    get labourTotal(): number
    {
        return this.services.reduce((sum, x) => sum + this.amount(x), 0);
    }

    get partsTotal(): number
    {
        return this.partLines.reduce((sum, x) => sum + this.amount(x), 0);
    }

    get statusColor(): string
    {
        return wsStatusColor(this.card?.Status ?? 'Open');
    }

    // Header ribbon (2026-11-17 : the layout of the Service Estimate)
    get branchName(): string
    {
        return this.branchItems.find(x => Number(x.value) === Number(this.branchId))?.label ?? '';
    }

    // The count at the right of the tabs
    get sectionCount(): string
    {
        const count =
            (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

        switch (this.section)
        {
            case 'complaints':
                return count(this.complaints.length, 'complaint', 'complaints');
            case 'services':
                return count(this.services.length, 'line', 'lines');
            case 'parts':
                return count(this.partLines.length, 'line', 'lines');
            case 'checklist':
                return count(this.checklist.length, 'item', 'items');
            case 'assign':
                return count(this.assignTechnicianIds.length, 'technician', 'technicians');
            case 'work':
                return count(this.workEntries.length, 'entry', 'entries');
            default:
                return count(this.statusHistory.length, 'change', 'changes');
        }
    }

    amount(line: Line): number
    {
        return line.IsFree ? 0 : Math.round((Number(line.Quantity) || 0) * (Number(line.Rate) || 0) * 100) / 100;
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/') ? 'view' : url.includes('/edit/') ? 'edit' : url.includes('/add') ? 'add' : 'list';

        this.entityId =
            this.route.snapshot.paramMap.get('id') ?? '';

        this.simple =
            this.route.snapshot.data?.['simple'] === true;

        if (this.simple && this.router.url.toLowerCase().includes('/list') === false)
        {
            this.loadObservationList();
        }

        this.desk =
            url.includes('/job-card-opening/') ? 'opening' : url.includes('/job-card-assignment/') ? 'assignment' : '';

        // a desk lists what waits for it
        if (this.desk === 'opening')
        {
            this.tabs =
            [
                { id:'Open', label:'Open' },
                { id:'today', label:'Opened Today' },
                { id:'all', label:'All' }
            ];

            this.selectedTab = 'Open';

        }

        if (this.desk === 'assignment')
        {
            this.tabs =
            [
                { id:'Open', label:'To Assign' },
                { id:'Assigned', label:'Assigned' }
            ];

            this.selectedTab = 'Open';
            this.section = 'assign';
        }

        if (this.mode === 'list')
        {
            this.loadList();
        }
        else
        {
            this.loadForm();
        }
    }

    private failed(error: any, fallback: string):
        void
    {
        this.toast.error('Error', error?.error?.message ?? fallback);
        this.cdr.detectChanges();
    }

    //===========================================================
    // List
    //===========================================================

    loadList():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.ws
            .getJobCards()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:cards =>
                {
                    this.all =
                        (cards ?? []).map(x => ({
                            ...x,
                            DateText:wsDay(x.JobDate),
                            TokenText:jobToken(x.WelcomeTokenNo, x.JobDate),
                            // a later job of a busy technician : it waits
                            StatusText:x.WaitingBehind ? `${x.Status} - Waiting` : x.Status === 'Open' ? 'Pending' : x.Status,
                            BikeText:x.RegistrationNo || x.ChassisNo || x.EngineNo,
                            StatusColor:x.WaitingBehind ? '#d97706' : wsStatusColor(x.Status),
                            WorkingNow:x.WorkingNow || (x.WaitingBehind ? `After ${x.WaitingBehind.slice(-5)}` : '')
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.failed(error, 'Job cards could not be loaded.');
                }
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const today =
            hrToText(new Date());

        const matched =
            this.all.filter(x =>
                (this.selectedTab === 'all'
                    || (this.selectedTab === 'today'
                        ? String(x.JobDate ?? '').substring(0, 10) === today
                        : x.Status === this.selectedTab))
                && (!find
                    || [x.JobCardNo, x.CustomerName, x.Mobile, x.ModelName, x.ChassisNo, x.EngineNo, x.RegistrationNo, x.JobType, x.Status]
                        .some(v => String(v ?? '').toLowerCase().includes(find))));

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        this.cdr.detectChanges();
    }

    onTab(value: string):
        void
    {
        this.selectedTab = value || 'all';
        this.currentPage = 1;
        this.apply();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;
        this.apply();
    }

    onPageChange(page: number):
        void
    {
        this.currentPage = page;
        this.apply();
    }

    onPageSizeChange(size: number):
        void
    {
        this.pageSize = size;
        this.currentPage = 1;
        this.apply();
    }

    onSort(_event: any):
        void
    {
        // Newest first
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    view(row: any):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    edit(row: any):
        void
    {
        // An assigned job : its assignment is what is changed (the
        // Job Cards list; the assignment desk has it on edit/:id)
        if (this.desk === '' && row?.Status === 'Assigned')
        {
            void this.router.navigate(['../assign', row.PublicId], { relativeTo:this.route });
            return;
        }

        void this.router.navigate(['../edit', row.PublicId], { relativeTo:this.route });
    }

    goToList():
        void
    {
        // opened from the Workshop Dashboard (owner 2026-11-19) : Back
        // returns to it, on the tab it was opened from
        if (this.mode !== 'add' && this.route.snapshot.queryParamMap.get('from') === 'dashboard')
        {
            const tab = this.route.snapshot.queryParamMap.get('tab');

            void this.router.navigate(['../../../workshop-dashboard'], { relativeTo:this.route, queryParams:tab ? { tab } : {} });
            return;
        }

        void this.router.navigate([this.mode === 'add' ? '../list' : '../../list'], { relativeTo:this.route });
    }

    // The toolbar of the list : Job Assignment opens the page of
    // the jobs waiting to be assigned; Job Closing its own page
    // (built after the work stage)
    goToStage(stage: 'assignment' | 'closing'):
        void
    {
        if (stage === 'assignment')
        {
            // the form at once : the job is picked on it
            void this.router.navigate(['../assign'], { relativeTo:this.route });
            return;
        }

        // its own page : the jobs in work, priced and billed
        void this.router.navigate(['../../job-closing'], { relativeTo:this.route });
    }

    onRowAction(event: ListTableRowActionEvent):
        void
    {
        if (event.key === 'print')
        {
            this.print(event.row?.PublicId);
        }

        if (event.key === 'tokens')
        {
            this.print(event.row?.PublicId, true);
        }
    }

    print(publicId?: string, tokens = false):
        void
    {
        const id = publicId || this.card?.PublicId || '';

        if (!id)
        {
            return;
        }

        const problem = tokens ? openJobCardTokensPrint(this.router, id) : openJobCardPrint(this.router, id);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }

    delete(row: any):
        void
    {
        this.confirmDialog.open(
            'Delete Job Card',
            `Delete ${row.JobCardNo}? Only an Open or a Cancelled job card with no technician time can be deleted.`,
            () =>
                this.ws.deleteJobCard(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.JobCardNo} was deleted.`);
                        this.loadList();
                    },
                    error:error => this.failed(error, 'The job card could not be deleted.')
                }),
            'Delete',
            'Keep',
            'danger');
    }

    // Asks first, then brings back the job card deleted last
    restore():
        void
    {
        this.confirmDialog.open(
            'Restore Job Card',
            'Bring back the job card that was deleted last?',
            () =>
                this.ws.restoreJobCard().subscribe(
                {
                    next:result =>
                    {
                        this.toast.success('Restored', result?.Message ?? 'The job card was restored.');
                        this.loadList();
                    },
                    error:error => this.failed(error, 'The job card could not be restored.')
                }),
            'Restore',
            'Cancel',
            'primary');
    }

    openHistory():
        void
    {
        this.ws
            .getHistory('workshop-management/job-cards')
            .subscribe(
            {
                next:items =>
                {
                    this.historyItems = items;
                    this.historyOpened = true;
                    this.cdr.detectChanges();
                },
                error:() => this.toast.error('Error', 'The history could not be loaded.')
            });
    }

    closeHistory():
        void
    {
        this.historyOpened = false;
        this.cdr.detectChanges();
    }

    //===========================================================
    // Form : load
    //===========================================================

    private loadForm():
        void
    {
        this.loading = true;
        this.cdr.detectChanges();

        const card$: Observable<JobCard | null> =
            this.mode === 'add' ? of(null) : this.ws.getJobCard(this.entityId);

        forkJoin({ lookups:this.ws.getJobCardLookups(), card:card$ })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:({ lookups, card }) =>
                {
                    this.lookups = lookups;

                    this.branchItems = (lookups.Branches ?? []).map(x => ({ label:x.Name, value:x.Id }));
                    this.buildMotorBikeItems();
                    this.brandItems = (lookups.Brands ?? []).map(x => ({ label:x.Name, value:x.Id }));
                    this.colorItems = (lookups.Colors ?? []).map(x => ({ label:x.Name, value:x.Id }));
                    this.modelItems = (lookups.Models ?? []).map(x => ({ label:[x.BrandName, x.Name].filter(v => !!v).join('  '), value:x.Id }));
                    this.advisorItems = (lookups.Employees ?? []).map(x => ({ label:`${x.Code}  ${x.Name}`, value:x.Id }));
                    this.engineerItems = (lookups.Engineers ?? lookups.Employees ?? []).map(x => ({ label:`${x.Code}  ${x.Name}`, value:x.Id }));
                    this.fuelItems = (lookups.FuelLevels ?? []).map(x => ({ label:x, value:x }));
                    this.jobTypeItems = (lookups.JobTypes ?? []).map(x => ({ label:x, value:x }));

                    if (card)
                    {
                        // a card that can no longer be changed is only shown
                        if (this.mode === 'edit' && !card.CanEdit && (card.NextStatuses ?? []).length === 0)
                        {
                            void this.router.navigate(['../../view', card.PublicId], { relativeTo:this.route });
                            return;
                        }

                        this.fill(card);
                    }
                    else
                    {
                        this.jobCardNo = lookups.NextJobCardNo ?? '';
                        this.jobDate = (lookups.Today ?? '').substring(0, 10) || hrToText(new Date());
                        this.branchId = (lookups.Branches ?? []).length === 1 ? lookups.Branches[0].Id : 0;
                        this.jobType = (lookups.JobTypes ?? [])[0] ?? '';
                        this.previewNo();
                        this.checklist = (lookups.Checklist ?? []).map(x => ({ ...x, Result:x.Result ?? '', Note:x.Note ?? '' }));

                        // opened from an estimate (Create Job Card) : its
                        // customer, bike, labour and parts come here
                        const estimate = this.route.snapshot.queryParamMap.get('estimate') ?? '';

                        if (estimate)
                        {
                            this.startFromEstimate(estimate);
                        }
                        else if (this.simple)
                        {
                            this.pickReturnedCustomer();
                        }
                    }

                    this.buildServiceItems();
                    this.buildWorkItems();

                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.failed(error, 'The job card could not be loaded.');
                }
            });
    }

    // A new card : what the estimate has comes onto the form. The
    // card is not saved yet
    private startFromEstimate(estimatePublicId: string):
        void
    {
        this.ws.getJobCardFromEstimate(estimatePublicId).subscribe(
        {
            next:draft =>
            {
                this.fromEstimate = estimatePublicId;
                this.fromEstimateNo = draft.EstimateNo ?? '';

                this.branchId = Number(draft.BranchId) || this.branchId;
                this.serviceVehicleId = draft.ServiceVehicleId ?? null;
                this.chassisNo = draft.ChassisNo ?? '';
                this.engineNo = draft.EngineNo ?? '';
                this.registrationNo = draft.RegistrationNo ?? '';
                this.modelId = draft.ModelId ?? null;
                this.modelName = draft.ModelName ?? '';
                this.brandName = draft.BrandName ?? '';
                this.brandManagementId = draft.BrandManagementId ?? null;
                this.colorName = draft.ColorName ?? '';
                this.customerId = draft.CustomerId ?? null;
                this.customerName = draft.CustomerName ?? '';
                this.mobile = draft.Mobile ?? '';
                this.kmReading = draft.KmReading === null || draft.KmReading === undefined ? '' : String(draft.KmReading);
                this.basicRequirement = draft.BasicRequirement ?? '';

                this.services =
                    (draft.Services ?? []).map(x => ({
                        key:this.nextKey++,
                        ItemKind:x.ItemKind,
                        ItemId:x.ItemId ?? null,
                        ItemCode:x.ItemCode ?? '',
                        ItemName:x.ItemName ?? '',
                        Quantity:String(x.Quantity ?? 1),
                        Rate:String(x.Rate ?? 0),
                        IsFree:!!x.IsFree,
                        Note:x.Note ?? ''
                    }));

                this.partLines =
                    (draft.Parts ?? []).map(x => ({
                        key:this.nextKey++,
                        ItemKind:x.ItemKind,
                        ItemId:x.ItemId ?? null,
                        ItemCode:x.ItemCode ?? '',
                        ItemName:x.ItemName ?? '',
                        Quantity:String(x.Quantity ?? 1),
                        Rate:String(x.Rate ?? 0),
                        IsFree:false,
                        Note:x.Note ?? ''
                    }));

                this.buildServiceItems();
                this.buildWorkItems();
                this.cdr.detectChanges();
            },
            error:error => this.failed(error, 'The estimate could not be read.')
        });
    }

    // The whole card on the form
    private fill(card: JobCard):
        void
    {
        this.card = card;

        this.purchaseDate = (card.PurchaseDate ?? '').substring(0, 10);
        this.lastServiceDate = (card.LastServiceDate ?? '').substring(0, 10);

        this.openObs =
            (card.Observations ?? []).map(x => ({
                key:this.nextKey++,
                WorkshopObservationId:x.WorkshopObservationId ?? null,
                Observation:x.Observation ?? '',
                Note:x.Note ?? ''
            }));

        this.setTabs();

        this.fillAssignment(card);

        this.out = null;
        this.outOpen = false;
        this.outCancel = '';

        if (this.section === 'parts' || this.section === 'services')
        {
            this.loadOutsourced();
        }

        this.jobCardNo = card.JobCardNo ?? '';
        this.jobDate = (card.JobDate ?? '').substring(0, 10);
        this.branchId = Number(card.BranchId) || 0;
        this.serviceVehicleId = card.ServiceVehicleId ?? null;
        this.chassisNo = card.ChassisNo ?? '';
        this.engineNo = card.EngineNo ?? '';
        this.registrationNo = card.RegistrationNo ?? '';
        this.modelId = card.ModelId ?? null;
        this.modelName = card.ModelName ?? '';
        this.brandName = card.BrandName ?? '';
        this.brandManagementId = card.BrandManagementId ?? null;
        this.colorName = card.ColorName ?? '';
        this.customerId = card.CustomerId ?? null;
        this.customerName = card.CustomerName ?? '';
        this.mobile = card.Mobile ?? '';
        this.kmReading = card.KmReading === null || card.KmReading === undefined ? '' : String(card.KmReading);
        this.fuelLevel = card.FuelLevel ?? '';
        this.jobType = card.JobType ?? '';
        this.scheduleId = card.ServiceVehicleScheduleId ?? null;
        this.scheduleName = card.ScheduleName ?? '';
        this.enquiryId = card.ServiceEnquiryId ?? null;
        this.advisorId = card.AdvisorEmployeeId ?? null;
        this.pickupDrop = !!card.PickupDrop;
        this.basicRequirement = card.BasicRequirement ?? '';
        this.remarks = card.Remarks ?? '';

        const promised =
            card.PromisedAt ? new Date(card.PromisedAt) : null;

        if (promised && !Number.isNaN(promised.getTime()))
        {
            const pad = (n: number): string => String(n).padStart(2, '0');

            this.promisedDate = `${promised.getFullYear()}-${pad(promised.getMonth() + 1)}-${pad(promised.getDate())}`;
            this.promisedTime = `${pad(promised.getHours())}:${pad(promised.getMinutes())}`;
        }
        else
        {
            this.promisedDate = '';
            this.promisedTime = '';
        }

        this.complaints = (card.Complaints ?? []).map(x => ({ key:this.nextKey++, text:x.Complaint ?? '' }));

        this.services =
            (card.Services ?? []).map(x => ({
                key:this.nextKey++,
                ItemKind:x.ItemKind,
                ItemId:x.ItemId ?? null,
                ItemCode:x.ItemCode ?? '',
                ItemName:x.ItemName ?? '',
                Quantity:String(x.Quantity ?? 1),
                Rate:String(x.Rate ?? 0),
                IsFree:!!x.IsFree,
                Note:x.Note ?? ''
            }));

        this.partLines =
            (card.Parts ?? []).map(x => ({
                key:this.nextKey++,
                ItemKind:x.ItemKind,
                ItemId:x.ItemId ?? null,
                ItemCode:x.ItemCode ?? '',
                ItemName:x.ItemName ?? '',
                Quantity:String(x.Quantity ?? 1),
                Rate:String(x.Rate ?? 0),
                IsFree:false,
                Note:x.Note ?? ''
            }));

        this.checklist = (card.Checklist ?? []).map(x => ({ ...x, Result:x.Result ?? '', Note:x.Note ?? '' }));

        this.applyState(card);
    }

    // What a status change or a time stamp changes (the fields being
    // typed stay as they are)
    private applyState(card: JobCard):
        void
    {
        if (this.card)
        {
            this.card =
            {
                ...this.card,
                Status:card.Status,
                StatusDate:card.StatusDate,
                CancelReason:card.CancelReason,
                CanEdit:card.CanEdit,
                NextStatuses:card.NextStatuses ?? [],
                EstimateNo:card.EstimateNo ?? '',
                EstimateStatus:card.EstimateStatus ?? '',
                EstimatePublicId:card.EstimatePublicId ?? null,
                LinesLocked:!!card.LinesLocked,
                WorkingNow:card.WorkingNow,
                StageNo:card.StageNo,
                ServiceEngineerEmployeeId:card.ServiceEngineerEmployeeId,
                ServiceEngineerName:card.ServiceEngineerName,
                WorkshopBayId:card.WorkshopBayId,
                BayName:card.BayName,
                AssignedAt:card.AssignedAt,
                Technicians:card.Technicians ?? [],
                TechnicianNames:card.TechnicianNames,
                CanAssign:card.CanAssign,
                CanWorkOn:card.CanWorkOn
            };
        }

        this.fillAssignment(card);

        this.workEntries = card.WorkEntries ?? [];
        this.statusHistory = card.StatusHistory ?? [];
    }

    // The assignment of the card on the form
    private fillAssignment(card: JobCard):
        void
    {
        this.assignEngineerId = card.ServiceEngineerEmployeeId ?? null;
        this.assignBayId = card.WorkshopBayId ?? null;
        this.assignTechnicianIds = (card.Technicians ?? []).map(x => x.WorkshopTechnicianId);
        this.assignPick = null;
        this.assignNote = '';
    }

    // The services the bike can get : of its brand, and the dealer's
    // own (any brand)
    private buildServiceItems():
        void
    {
        const brand = this.brandManagementId;

        this.serviceItems =
            (this.lookups?.ServiceItems ?? [])
                .filter(x => !brand || !x.BrandManagementId || x.BrandManagementId === brand)
                .map(x => ({
                    label:`${x.Code}  ${x.Name}  (${x.IsFree ? 'Free' : wsMoney(x.Rate)})`,
                    value:`${x.Kind}:${x.Id}`
                }));
    }

    // Technicians and bays of the service center of the card
    private buildWorkItems():
        void
    {
        const here =
            (x: { BranchId: number }): boolean => !this.branchId || !x.BranchId || x.BranchId === this.branchId;

        this.technicianItems =
            (this.lookups?.Technicians ?? []).filter(here).map(x => ({ label:`${x.Code}  ${x.Name}`, value:x.Id }));

        this.bayItems =
            (this.lookups?.Bays ?? []).filter(here).map(x => ({ label:`${x.Code}  ${x.Name}`, value:x.Id }));
    }

    //===========================================================
    // Form : the head
    //===========================================================

    onText(field: 'chassisNo' | 'engineNo' | 'registrationNo' | 'colorName' | 'customerName' | 'mobile' | 'kmReading' | 'promisedTime' | 'basicRequirement' | 'remarks' | 'workNote' | 'statusNote' | 'modelName', value: any):
        void
    {
        this[field] = String(value ?? '');
    }

    onDate(date: Date | null):
        void
    {
        this.jobDate = date ? hrToText(date) : '';
        this.previewNo();
        this.cdr.detectChanges();
    }

    onPromisedDate(date: Date | null):
        void
    {
        this.promisedDate = date ? hrToText(date) : '';
        this.cdr.detectChanges();
    }

    onBranch(value: any):
        void
    {
        this.branchId = Number(value) || 0;
        this.previewNo();
        this.buildWorkItems();

        // the parts follow the business lines of the service center
        this.parts = null;
        this.partItems = [];

        if (this.section === 'parts')
        {
            this.onSection('parts');
        }

        this.cdr.detectChanges();
    }

    // The list : our Motor Bikes (P + id) and the bikes we do not
    // sell, added here (S + id)
    private buildMotorBikeItems():
        void
    {
        this.motorBikeItems =
            (this.lookups?.MotorBikes ?? []).map(x => ({ label:x.Name, value:bikeKey(x) }));

        // on top : the way to Add (the list is looked through first)
        if (this.mode === 'add')
        {
            this.motorBikeItems.unshift({ label:'Bike not found', value:BIKE_NOT_FOUND });
        }
    }

    // "Bike not found" was picked in the list : Add of the Bike
    // section opens
    bikeNotFound =
        false;

    // New Job page : the Motor Bike the model and the colour of the
    // card stand for (nothing more is kept on the card)
    get pickedMotorBike(): JobCardMotorBike | null
    {
        const same = (a?: string | null, b?: string | null) =>
            (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

        if (!this.colorName.trim())
        {
            return null;
        }

        return (this.lookups?.MotorBikes ?? []).find(x =>
            same(x.ColorName, this.colorName)
            && (x.ServiceOnly
                ? !this.modelId && same(x.ModelName, this.modelName) && same(x.BrandName, this.brandName)
                : !!this.modelId && x.ModelId === this.modelId)) ?? null;
    }

    get motorBikeId(): string | null
    {
        if (this.bikeNotFound)
        {
            return BIKE_NOT_FOUND;
        }

        const bike = this.pickedMotorBike;

        return bike ? bikeKey(bike) : null;
    }

    // New Job page : a Motor Bike is picked - its model and its
    // colour go on the card (the colour is never typed there)
    onMotorBike(value: any):
        void
    {
        const bike =
            (this.lookups?.MotorBikes ?? []).find(x => bikeKey(x) === value);

        this.bikeNotFound = value === BIKE_NOT_FOUND;

        if (this.bikeNotFound && !this.canAddBike)
        {
            this.bikeNotFound = false;
            this.toast.error('Bike', 'A bike can be added only for a picked customer who has no saved bike.');
        }

        this.colorName = bike?.ColorName ?? '';
        this.onModel(bike && !bike.ServiceOnly ? bike.ModelId : null);

        // a bike we do not sell : no model of ours, its own names
        if (bike?.ServiceOnly)
        {
            this.modelName = bike.ModelName ?? '';
            this.brandName = bike.BrandName ?? '';
            this.brandManagementId = bike.BrandManagementId ?? null;
            this.buildServiceItems();
            this.cdr.detectChanges();
        }
    }

    // ---- Add of the Bike section : a bike we do not sell ----------

    brandItems:
        Option[] = [];

    colorItems:
        Option[] = [];

    bikeAddOpen =
        false;

    bikeAddBusy =
        false;

    bikeAddBrand:
        number | null = null;

    bikeAddModel =
        '';

    bikeAddColor:
        number | null = null;

    // Add of the Bike section opens only for a picked customer who
    // has no saved bike (owner 2026-11-18)
    get canAddBike(): boolean
    {
        return this.mode === 'add' && this.customerPicked && this.customerBikes.length === 0 && this.access.CanOpen;
    }

    // ... and only after "Bike not found" was picked in the list
    get canOpenBikeAdd(): boolean
    {
        return this.canAddBike && this.bikeNotFound;
    }

    // Add Bike : the bikes of the list that look like what is being
    // typed (letters and digits only) - one of them is picked
    // instead of adding it again
    get bikeAddLike(): JobCardMotorBike[]
    {
        const plain = (text?: string | null) => (text ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const typed = plain(this.bikeAddModel);

        if (typed.length < 2)
        {
            return [];
        }

        return (this.lookups?.MotorBikes ?? []).filter(x => plain(x.Name).includes(typed)).slice(0, 6);
    }

    pickBikeAddLike(bike: JobCardMotorBike):
        void
    {
        this.bikeAddOpen = false;
        this.onMotorBike(bikeKey(bike));
    }

    openBikeAdd():
        void
    {
        if (!this.canOpenBikeAdd)
        {
            return;
        }

        this.bikeAddBrand = null;
        this.bikeAddModel = '';
        this.bikeAddColor = null;
        this.bikeAddOpen = true;
        this.cdr.detectChanges();
    }

    closeBikeAdd():
        void
    {
        if (!this.bikeAddBusy)
        {
            this.bikeAddOpen = false;
            this.cdr.detectChanges();
        }
    }

    onBikeAdd(field: 'brand' | 'model' | 'color', value: any):
        void
    {
        if (field === 'model')
        {
            this.bikeAddModel = String(value ?? '');
        }
        else if (field === 'brand')
        {
            this.bikeAddBrand = Number(value) || null;
        }
        else
        {
            this.bikeAddColor = Number(value) || null;
        }

        this.cdr.detectChanges();
    }

    saveBikeAdd():
        void
    {
        const model = this.bikeAddModel.trim();

        if (!this.bikeAddBrand || !model || !this.bikeAddColor)
        {
            this.toast.error('Add Bike', 'Pick the brand, type the model and pick the colour.');
            return;
        }

        this.bikeAddBusy = true;

        this.ws.addServiceBike({ BrandManagementId:this.bikeAddBrand, ModelName:model, ColorManagementId:this.bikeAddColor })
            .subscribe(
            {
                next:bike =>
                {
                    this.bikeAddBusy = false;
                    this.bikeAddOpen = false;

                    if (this.lookups)
                    {
                        const list = this.lookups.MotorBikes ?? [];

                        if (!list.some(x => bikeKey(x) === bikeKey(bike)))
                        {
                            list.push(bike);
                        }

                        this.lookups.MotorBikes = list;
                        this.buildMotorBikeItems();
                    }

                    this.onMotorBike(bikeKey(bike));
                    this.toast.success('Add Bike', `${bike.Name} is in the list and picked.`);
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.bikeAddBusy = false;
                    this.toast.error('Add Bike', error?.error?.message ?? 'The bike could not be added. (Was ServiceOperations_JobCard_ServiceBikes.sql run and the API restarted ?)');
                    this.cdr.detectChanges();
                }
            });
    }

    onModel(value: any):
        void
    {
        this.modelId = Number(value) || null;

        const model =
            (this.lookups?.Models ?? []).find(x => x.Id === this.modelId);

        this.modelName = model?.Name ?? '';
        this.brandName = model?.BrandName ?? '';
        this.brandManagementId = model?.BrandManagementId ?? null;

        this.buildServiceItems();
        this.cdr.detectChanges();
    }

    onPick(field: 'fuelLevel' | 'jobType', value: any):
        void
    {
        this[field] = String(value ?? '');
        this.cdr.detectChanges();
    }

    onAdvisor(value: any):
        void
    {
        this.advisorId = Number(value) || null;
        this.cdr.detectChanges();
    }

    onPickup(event: Event):
        void
    {
        this.pickupDrop = (event.target as HTMLInputElement).checked;
        this.cdr.detectChanges();
    }

    // A schedule position of the bike (2nd Free Service ...) : its
    // service goes on the labour lines
    onSchedule(value: any):
        void
    {
        this.scheduleId = Number(value) || null;

        const schedule =
            this.schedules.find(x => x.ServiceVehicleScheduleId === this.scheduleId);

        this.scheduleName = schedule?.ServiceName ?? '';
        this.enquiryId = schedule?.ServiceEnquiryId ?? null;

        if (schedule?.ScheduledServiceId)
        {
            this.addService(`Scheduled:${schedule.ScheduledServiceId}`, false);

            if (this.jobTypeItems.some(x => x.value === `${schedule.ServiceType} Service`))
            {
                this.jobType = `${schedule.ServiceType} Service`;
            }
        }

        this.cdr.detectChanges();
    }

    //===========================================================
    // Form : the customer search (as on the sales invoice)
    //
    // Mobile or name first (registration, chassis and engine no work
    // too). The list opens while typing : Up / Down, Enter picks, Esc
    // closes. A customer comes with the bikes the service center
    // knows of him : one bike comes at once, several are listed to
    // choose from.
    //===========================================================

    get customerBoxText(): string
    {
        if (this.customerPicked)
        {
            return [this.customerName, this.mobile].filter(x => !!x).join('  ·  ');
        }

        return this.customerQuery;
    }

    private resetSearch():
        void
    {
        if (this.searchTimer)
        {
            clearTimeout(this.searchTimer);
            this.searchTimer = null;
        }

        this.searchNo++;
        this.customerQuery = '';
        this.searchedNone = false;
        this.finding = false;
        this.hits = [];
        this.hitsOpen = false;
        this.hitActive = 0;
    }

    onCustomerQuery(value: any):
        void
    {
        if (this.customerPicked)
        {
            return;
        }

        const text = String(value ?? '').substring(0, 60);

        this.customerQuery = text;
        this.searchedNone = false;

        if (this.searchTimer)
        {
            clearTimeout(this.searchTimer);
            this.searchTimer = null;
        }

        if (text.trim().length < 3)
        {
            this.searchNo++;
            this.finding = false;
            this.hits = [];
            this.hitsOpen = false;
            this.cdr.detectChanges();
            return;
        }

        this.searchTimer = setTimeout(() => this.search(text.trim()), 300);
    }

    private search(text: string):
        void
    {
        const no = ++this.searchNo;

        this.searchTimer = null;
        this.finding = true;
        this.cdr.detectChanges();

        this.ws.findBikes(text).subscribe(
        {
            next:bikes =>
            {
                if (no !== this.searchNo)
                {
                    // typed on meanwhile
                    return;
                }

                this.finding = false;
                this.hits = this.toHits(bikes ?? []);
                this.hitActive = 0;
                this.hitsOpen = true;
                this.placeResults();

                // nobody : Add (on the Customer card) opens
                this.searchedNone = this.hits.length === 0;
                this.cdr.detectChanges();
            },
            error:error =>
            {
                if (no !== this.searchNo)
                {
                    return;
                }

                this.finding = false;
                this.failed(error, 'The customers could not be searched.');
            }
        });
    }

    // The found bikes by customer
    private toHits(bikes: JobCardBike[]): CustomerHit[]
    {
        const hits: CustomerHit[] = [];

        for (const bike of bikes)
        {
            const key =
                bike.CustomerId ? `c${bike.CustomerId}` : `m${(bike.Mobile || '').trim()}|${(bike.CustomerName || '').trim().toLowerCase()}`;

            let hit = hits.find(x => x.key === key);

            if (!hit)
            {
                hit = { key, customerId:bike.CustomerId ?? null, name:bike.CustomerName ?? '', mobile:bike.Mobile ?? '', bikes:[] };
                hits.push(hit);
            }

            if (bike.CustomerOnly)
            {
                continue;
            }

            hit.bikes.push(bike);
        }

        return hits;
    }

    hitBikeText(hit: CustomerHit): string
    {
        const bike = hit.bikes[0];

        if (!bike)
        {
            return 'no bike here yet';
        }

        const text =
            [bike.RegistrationNo || bike.ChassisNo, [bike.BrandName, bike.ModelName].filter(x => !!x).join(' ')].filter(x => !!x).join(' · ');

        return hit.bikes.length > 1 ? `${text} ...` : text;
    }

    onHitKey(event: KeyboardEvent):
        void
    {
        if (!this.hitsOpen)
        {
            return;
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp')
        {
            event.preventDefault();

            const count = this.hits.length;

            if (count)
            {
                this.hitActive = (this.hitActive + (event.key === 'ArrowDown' ? 1 : count - 1)) % count;
                this.cdr.detectChanges();
            }
        }
        else if (event.key === 'Escape')
        {
            event.preventDefault();
            this.hitsOpen = false;
            this.cdr.detectChanges();
        }
    }

    onHitEnter():
        void
    {
        if (this.customerPicked)
        {
            return;
        }

        if (this.hitsOpen && this.hits[this.hitActive])
        {
            this.pickHit(this.hits[this.hitActive]);
            return;
        }

        const text = this.customerQuery.trim();

        if (text.length < 3)
        {
            this.toast.error('Customer', 'Type 3 letters at least : mobile or customer name, registration or chassis no.');
            return;
        }

        if (this.searchTimer)
        {
            clearTimeout(this.searchTimer);
        }

        this.search(text);
    }

    onHitBlur():
        void
    {
        // a click on a row comes first (mousedown)
        setTimeout(() =>
        {
            if (this.hitsOpen)
            {
                this.hitsOpen = false;
                this.cdr.detectChanges();
            }
        }, 150);
    }

    // The customer comes onto the card : with his bike when the
    // service center knows one only (and it has no open job card),
    // with the list to choose from otherwise
    pickHit(hit: CustomerHit):
        void
    {
        this.clearBike();
        this.emptyBike();

        this.customerId = hit.customerId;
        this.customerName = hit.name;
        this.mobile = hit.mobile;
        this.customerPicked = true;
        this.customerBikes = hit.bikes;

        this.resetSearch();

        if (hit.bikes.length === 1 && !hit.bikes[0].OpenJobCardNo)
        {
            this.bikeChoices = [];
            this.pickBike(hit.bikes[0]);
            return;
        }

        this.bikeChoices = hit.bikes;

        this.buildServiceItems();
        this.cdr.detectChanges();
    }

    // Another customer : the search opens again
    changeCustomer():
        void
    {
        this.customerPicked = false;
        this.clearBike();
        this.emptyBike();

        this.customerId = null;
        this.customerName = '';
        this.mobile = '';
        this.customerBikes = [];
        this.bikeChoices = [];

        this.resetSearch();
        this.buildServiceItems();
        this.cdr.detectChanges();
    }

    private emptyBike():
        void
    {
        this.purchaseDate = '';
        this.lastServiceDate = '';
        this.chassisNo = '';
        this.engineNo = '';
        this.registrationNo = '';
        this.modelId = null;
        this.modelName = '';
        this.brandName = '';
        this.brandManagementId = null;
        this.colorName = '';
        this.bikeNotFound = false;
    }

    // The list of the customer's bikes again
    chooseBike():
        void
    {
        this.bikeChoices = this.customerBikes;
        this.cdr.detectChanges();
    }

    // A bike of the customer the service center does not know : typed
    otherBike():
        void
    {
        this.bikeChoices = [];
        this.clearBike();
        this.emptyBike();
        this.buildServiceItems();
        this.cdr.detectChanges();
    }

    bikeLine(bike: JobCardBike): string
    {
        return [bike.RegistrationNo, bike.ChassisNo, [bike.BrandName, bike.ModelName].filter(x => !!x).join(' '), bike.ColorName]
            .filter(x => !!x)
            .join('  |  ');
    }

    pickBike(bike: JobCardBike):
        void
    {
        if (bike.OpenJobCardNo)
        {
            this.toast.error('Find Bike', `This bike already has an open job card : ${bike.OpenJobCardNo}.`);
            return;
        }

        this.serviceVehicleId = bike.ServiceVehicleId ?? null;
        this.chassisNo = bike.ChassisNo ?? '';
        this.engineNo = bike.EngineNo ?? '';
        this.registrationNo = bike.RegistrationNo ?? '';
        this.modelId = bike.ModelId ?? null;
        this.modelName = bike.ModelName ?? '';
        this.brandName = bike.BrandName ?? '';
        this.brandManagementId = bike.BrandManagementId ?? null;
        this.colorName = bike.ColorName ?? '';
        this.customerId = bike.CustomerId ?? null;
        this.customerName = bike.CustomerName ?? '';
        this.mobile = bike.Mobile ?? '';

        this.purchaseDate = (bike.PurchaseDate || bike.SaleDate || '').substring(0, 10);
        this.lastServiceDate = (bike.LastServiceDate ?? '').substring(0, 10);

        this.bikeInfo =
            [
                bike.SaleDate ? `Sold ${wsDay(bike.SaleDate)}` : 'Not sold by us',
                bike.SaleDate ? (bike.InWarranty ? 'In warranty' : 'Out of warranty') : '',
                bike.LastKm ? `Last ${bike.LastKm} km` : ''
            ]
            .filter(x => !!x)
            .join('  |  ');

        this.schedules = bike.Schedules ?? [];

        this.scheduleItems =
            this.schedules.map(x => ({
                label:[x.ServiceName, x.ServiceType, x.DueDate ? `due ${wsDay(x.DueDate)}` : '', x.StatusText, x.EnquiryNo].filter(v => !!v).join('  |  '),
                value:x.ServiceVehicleScheduleId
            }));

        this.scheduleId = null;
        this.scheduleName = '';
        this.enquiryId = null;

        this.bikeChoices = [];

        this.buildServiceItems();
        this.cdr.detectChanges();
    }

    // The bike is typed again (a bike not sold by us)
    clearBike():
        void
    {
        this.serviceVehicleId = null;

        if (!this.customerPicked)
        {
            this.customerId = null;
        }

        this.bikeInfo = '';
        this.schedules = [];
        this.scheduleItems = [];
        this.scheduleId = null;
        this.scheduleName = '';
        this.enquiryId = null;
        this.cdr.detectChanges();
    }

    //===========================================================
    // Parts Outsourcing : a part bought from a local vendor for this
    // job card (no purchase order, no stock). The part is one of the
    // product lists or typed; the vendor is a supplier or typed.
    // Saved and posted at once : Dr Workshop WIP, Cr the vendor. The
    // service invoice bills it at its selling rate.
    //===========================================================

    out:
        OutsourcedParts | null = null;

    outOpen =
        false;

    outSaving =
        false;

    outSupplierItems:
        Option[] = [];

    // the part : picked ("Kind:Id") or typed
    outTyped =
        false;

    outPick:
        string | null = null;

    outCode =
        '';

    outName =
        '';

    // the vendor : a supplier or typed
    outVendorTyped =
        false;

    outSupplierId:
        number | null = null;

    outVendor =
        '';

    outDate =
        '';

    outBill =
        '';

    outQty =
        '1';

    outCost =
        '';

    outSell =
        '';

    outNote =
        '';

    // OUTSIDE WORKS : the same entry for a work done by a vendor. The
    // work is picked from the list of Workshop Configuration (never
    // typed); the vendor is credited at once. It is listed on the
    // tab Service / Labour.
    outWork =
        false;

    private works:
        WorkshopOutsideWork[] = [];

    workItems:
        Option[] = [];

    outWorkId:
        number | null = null;

    // the entries of the card : the parts, the works
    outPartRows:
        OutsourcedPart[] = [];

    outWorkRows:
        OutsourcedPart[] = [];

    // the entry being cancelled, and why
    outCancel =
        '';

    outReason =
        '';

    readonly day = wsDay;

    private loadOutsourced():
        void
    {
        const publicId = this.card?.PublicId;

        if (!publicId)
        {
            return;
        }

        this.ws.getOutsourcedParts(publicId).subscribe(
        {
            next:out => this.setOutsourced(out),
            // the table is made by ServiceOperations_Outsourced_Parts.sql :
            // before it is run the tab works without it
            error:() =>
            {
                this.out = null;
                this.cdr.detectChanges();
            }
        });
    }

    private setOutsourced(out: OutsourcedParts | null):
        void
    {
        this.out = out;

        this.outPartRows = (out?.Lines ?? []).filter(x => x.ItemKind !== 'OutsideWork');
        this.outWorkRows = (out?.Lines ?? []).filter(x => x.ItemKind === 'OutsideWork');

        this.outSupplierItems =
            (out?.Suppliers ?? []).map(x => ({ label:[x.Name, x.Code].filter(v => !!v).join('  '), value:x.SupplierId }));

        this.cdr.detectChanges();
    }

    // The price of Price Setup of the picked part
    get outMrp(): number | null
    {
        if (this.outWork || this.outTyped || !this.outPick)
        {
            return null;
        }

        const part = (this.parts ?? []).find(x => `${x.Kind}:${x.Id}` === this.outPick);

        return part?.Price ?? null;
    }

    get outAboveMrp(): boolean
    {
        const mrp = this.outMrp;

        return mrp !== null && mrp > 0 && (Number(this.outSell) || 0) > mrp;
    }

    // billed below what it cost
    get outLoss(): boolean
    {
        return this.outSell !== '' && (Number(this.outSell) || 0) < (Number(this.outCost) || 0);
    }

    get outSummary(): string
    {
        const quantity = Number(this.outQty) || 0;
        const cost = quantity * (Number(this.outCost) || 0);
        const sell = quantity * (Number(this.outSell) || 0);
        const mrp = this.outMrp;

        return [
            mrp !== null ? `Price ${wsMoney(mrp)}` : '',
            `Cost ${wsMoney(cost)}`,
            `Billed ${wsMoney(sell)}`,
            `${sell >= cost ? 'Margin' : 'Loss'} ${wsMoney(Math.abs(sell - cost))}`,
            this.outAboveMrp ? (this.out?.CanAboveMrp ? 'above the price' : 'above the price : needs Sell Above MRP') : ''
        ]
        .filter(x => !!x)
        .join('  ·  ');
    }

    openOutsource():
        void
    {
        if (!this.card?.PublicId)
        {
            this.toast.error('Parts Outsourcing', 'Save the job card first : an outsourced part is posted to the accounts under the job card.');
            return;
        }

        if (!this.out)
        {
            this.toast.error('Parts Outsourcing', 'Parts Outsourcing is not ready : run ServiceOperations_Outsourced_Parts.sql and restart the API.');
            return;
        }

        if (!this.out.CanAdd)
        {
            this.toast.error('Parts Outsourcing', `${this.out.JobCardNo} is closed for parts.`);
            return;
        }

        this.outOpen = true;
        this.outWork = false;
        this.outWorkId = null;
        this.outTyped = false;
        this.outPick = null;
        this.outCode = '';
        this.outName = '';
        this.outVendorTyped = false;
        this.outSupplierId = null;
        this.outVendor = '';
        this.outDate = this.out.Today || '';
        this.outBill = '';
        this.outQty = '1';
        this.outCost = '';
        this.outSell = '';
        this.outNote = '';

        this.cdr.detectChanges();
    }

    // What is posted of some entries (the cancelled ones do not count)
    outSum(rows: OutsourcedPart[], field: 'CostAmount' | 'SellAmount'): number
    {
        return (rows ?? []).filter(x => x.Status === 'Posted').reduce((sum, x) => sum + (Number(x[field]) || 0), 0);
    }

    // Outside Works (tab Service / Labour) : the same entry, for a
    // work of the list
    openOutsideWork():
        void
    {
        this.outOpen = false;

        this.openOutsource();

        if (!this.outOpen)
        {
            return;
        }

        this.outWork = true;

        this.ws.getOutsideWorks('card').subscribe(
        {
            next:works =>
            {
                this.works = works ?? [];

                this.workItems =
                    this.works.map(x => ({ label:`${x.Code}  ${x.Name}${x.Rate > 0 ? `  (${wsMoney(x.Rate)})` : ''}`, value:x.WorkshopOutsideWorkId }));

                this.cdr.detectChanges();
            },
            error:() =>
            {
                this.outOpen = false;
                this.toast.error('Outside Works', 'The list of outside works is not ready : run ServiceOperations_Outside_Works.sql and restart the API.');
                this.cdr.detectChanges();
            }
        });

        this.cdr.detectChanges();
    }

    // The customer charge starts at the usual charge of the work
    onOutWork(value: any):
        void
    {
        this.outWorkId = Number(value) || null;

        const work = this.works.find(x => x.WorkshopOutsideWorkId === this.outWorkId);

        this.outSell = work && work.Rate > 0 ? String(work.Rate) : '';

        this.cdr.detectChanges();
    }

    // A work that is not in the list : it is added in Workshop
    // Configuration, never typed here
    newWork():
        void
    {
        this.confirmDialog.open(
            'Outside Works',
            'A new outside work is added in Workshop Configuration (tab Outside Works). Open it? What is not saved on this job card will be lost.',
            () => void this.router.navigate(['/service-operations/service-setup/workshop-configuration'], { queryParams:{ tab:'outsideworks' } }),
            'Open',
            'Stay',
            'primary');
    }

    closeOutsource():
        void
    {
        this.outOpen = false;
        this.cdr.detectChanges();
    }

    onOutTyped(typed: boolean):
        void
    {
        this.outTyped = typed;
        this.outPick = null;
        this.outCode = '';
        this.outName = '';
        this.cdr.detectChanges();
    }

    onOutVendorTyped(typed: boolean):
        void
    {
        this.outVendorTyped = typed;
        this.outSupplierId = null;
        this.outVendor = '';
        this.cdr.detectChanges();
    }

    // The selling rate starts at the price of Price Setup
    onOutPick(value: any):
        void
    {
        this.outPick = value ? String(value) : null;

        const mrp = this.outMrp;

        this.outSell = mrp !== null && mrp > 0 ? String(mrp) : '';

        this.cdr.detectChanges();
    }

    onOutSupplier(value: any):
        void
    {
        this.outSupplierId = Number(value) || null;
        this.cdr.detectChanges();
    }

    onOutDate(date: Date | null):
        void
    {
        this.outDate = date ? hrToText(date) : '';
        this.cdr.detectChanges();
    }

    onOutText(field: 'outCode' | 'outName' | 'outVendor' | 'outBill' | 'outQty' | 'outCost' | 'outSell' | 'outNote' | 'outReason', value: any):
        void
    {
        this[field] = String(value ?? '');
        this.cdr.detectChanges();
    }

    saveOutsource():
        void
    {
        const publicId = this.card?.PublicId;

        if (!publicId || this.outSaving)
        {
            return;
        }

        const work = this.outWork;

        const title = work ? 'Outside Works' : 'Parts Outsourcing';

        const [kind, id] = (this.outPick ?? '').split(':');

        const listed = this.works.find(x => x.WorkshopOutsideWorkId === this.outWorkId);

        if (work && !listed)
        {
            this.toast.error(title, 'Pick the outside work.');
            return;
        }

        if (!work && !this.outTyped && !this.outPick)
        {
            this.toast.error(title, 'Pick the part, or type it.');
            return;
        }

        if (!work && this.outTyped && !this.outName.trim())
        {
            this.toast.error(title, 'Type the part.');
            return;
        }

        if (!this.outVendorTyped && !this.outSupplierId)
        {
            this.toast.error(title, 'Pick the supplier, or type the vendor.');
            return;
        }

        if (this.outVendorTyped && !this.outVendor.trim())
        {
            this.toast.error(title, 'Type the vendor.');
            return;
        }

        if (!this.outDate)
        {
            this.toast.error(title, 'Give the date.');
            return;
        }

        if (!((Number(this.outQty) || 0) > 0))
        {
            this.toast.error(title, 'Give the quantity.');
            return;
        }

        if (!((Number(this.outCost) || 0) > 0))
        {
            this.toast.error(title, work ? 'Give the vendor charge : what the vendor takes for the work.' : 'Give the purchase rate : what the vendor charges for one.');
            return;
        }

        if (this.outSell.trim() === '' || (Number(this.outSell) || 0) < 0)
        {
            this.toast.error(title, work ? 'Give the customer charge (0 when it is not charged).' : 'Give the selling rate : what the customer pays for one (0 when it is not charged).');
            return;
        }

        if (this.outAboveMrp && !this.out?.CanAboveMrp)
        {
            this.toast.error(title, `The price is ${wsMoney(this.outMrp ?? 0)} : selling above it needs the page action Sell Above MRP.`);
            return;
        }

        this.outSaving = true;

        this.progress.show('Saving', work ? 'Posting the outside work...' : 'Posting the outsourced part...');

        this.ws.addOutsourcedPart(
            publicId,
            {
                PurchaseDate:this.outDate,
                ItemKind:work ? 'OutsideWork' : this.outTyped ? 'Other' : kind,
                ItemId:work ? this.outWorkId : this.outTyped ? null : Number(id) || null,
                ItemCode:this.outTyped ? this.outCode.trim() : '',
                ItemName:this.outTyped ? this.outName.trim() : '',
                SupplierId:this.outVendorTyped ? null : this.outSupplierId,
                VendorName:this.outVendorTyped ? this.outVendor.trim() : '',
                BillNo:this.outBill.trim(),
                Quantity:Number(this.outQty) || 0,
                CostRate:Number(this.outCost) || 0,
                SellRate:Number(this.outSell) || 0,
                Note:this.outNote.trim()
            })
            .subscribe(
            {
                next:out =>
                    this.progress.finish(() =>
                    {
                        this.outSaving = false;
                        this.outOpen = false;
                        this.toast.success('Success', work ? 'The outside work was posted to the job card.' : 'The outsourced part was posted to the job card.');

                        // the line of the same work that came from the
                        // estimate : the entry replaces it
                        if (work && listed)
                        {
                            this.services = this.services.filter(x => !(x.ItemKind === 'Other' && x.ItemCode === listed.Code));
                        }

                        this.setOutsourced(out);
                    }),
                error:error =>
                {
                    this.progress.fail();
                    this.outSaving = false;
                    this.failed(error, work ? 'The outside work could not be saved.' : 'The outsourced part could not be saved.');
                }
            });
    }

    startCancelOut(row: OutsourcedPart):
        void
    {
        this.outCancel = this.outCancel === row.PublicId ? '' : row.PublicId;
        this.outReason = '';
        this.cdr.detectChanges();
    }

    cancelOut(row: OutsourcedPart):
        void
    {
        const publicId = this.card?.PublicId;

        if (!publicId || this.outSaving)
        {
            return;
        }

        if (!this.outReason.trim())
        {
            this.toast.error('Parts Outsourcing', 'Give the reason.');
            return;
        }

        this.outSaving = true;

        this.ws.cancelOutsourcedPart(publicId, row.PublicId, this.outReason.trim()).subscribe(
        {
            next:out =>
            {
                this.outSaving = false;
                this.outCancel = '';
                this.toast.success('Success', `${row.PurchaseNo} was cancelled.`);
                this.setOutsourced(out);
            },
            error:error =>
            {
                this.outSaving = false;
                this.failed(error, 'The outsourced part could not be cancelled.');
            }
        });
    }

    //===========================================================
    // Form : the lines
    //===========================================================

    onSection(value: string):
        void
    {
        this.section = (value || 'complaints') as Section;

        // the parts bought outside for the card
        if ((this.section === 'parts' || this.section === 'services') && this.out === null)
        {
            this.loadOutsourced();
        }

        // the parts of the business lines the service center runs
        // (Business Configuration); read again when it changes
        if (this.section === 'parts' && this.parts === null && this.canEditLines && this.branchId)
        {
            this.parts = [];

            const branchId = this.branchId;

            this.ws.getParts(branchId).subscribe(
            {
                next:parts =>
                {
                    if (branchId !== this.branchId)
                    {
                        // the service center changed meanwhile
                        return;
                    }

                    this.parts = parts ?? [];

                    this.partItems =
                        this.parts.map(x => ({
                            label:`${x.PartNumber || x.Code}  ${x.Name}  (${x.Price === null || x.Price === undefined ? 'no price' : wsMoney(x.Price)}, stock ${x.OnHand})`,
                            value:`${x.Kind}:${x.Id}`
                        }));

                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.parts = null;
                    this.failed(error, 'The parts could not be loaded.');
                }
            });
        }

        this.cdr.detectChanges();
    }

    addComplaint():
        void
    {
        this.complaints = [...this.complaints, { key:this.nextKey++, text:'' }];
        this.cdr.detectChanges();
    }

    onComplaint(row: { text: string }, event: Event):
        void
    {
        row.text = (event.target as HTMLInputElement).value;
    }

    removeComplaint(row: { key: number }):
        void
    {
        this.complaints = this.complaints.filter(x => x.key !== row.key);
        this.cdr.detectChanges();
    }

    // The picker : a service of the catalogue goes on a line
    onServicePick(value: any):
        void
    {
        if (!value)
        {
            return;
        }

        this.servicePick = value;
        this.addService(String(value), true);

        setTimeout(() =>
        {
            this.servicePick = null;
            this.cdr.detectChanges();
        });
    }

    private addService(key: string, warn: boolean):
        void
    {
        const item: WsServiceItem | undefined =
            (this.lookups?.ServiceItems ?? []).find(x => `${x.Kind}:${x.Id}` === key);

        if (!item)
        {
            return;
        }

        if (this.services.some(x => x.ItemKind === item.Kind && x.ItemId === item.Id))
        {
            if (warn)
            {
                this.toast.error('Service', `${item.Name} is already on the job card.`);
            }

            return;
        }

        this.services =
        [
            ...this.services,
            {
                key:this.nextKey++,
                ItemKind:item.Kind,
                ItemId:item.Id,
                ItemCode:item.Code ?? '',
                ItemName:item.Name ?? '',
                Quantity:'1',
                Rate:String(item.Rate ?? 0),
                IsFree:!!item.IsFree,
                Note:''
            }
        ];

        this.cdr.detectChanges();
    }

    // A labour line that is not in the catalogue : name and charge
    // are typed
    addOtherService():
        void
    {
        this.services =
            [...this.services, { key:this.nextKey++, ItemKind:'Other', ItemId:null, ItemCode:'', ItemName:'', Quantity:'1', Rate:'', IsFree:false, Note:'' }];

        this.cdr.detectChanges();
    }

    removeService(line: Line):
        void
    {
        this.services = this.services.filter(x => x.key !== line.key);
        this.cdr.detectChanges();
    }

    onPartPick(value: any):
        void
    {
        if (!value)
        {
            return;
        }

        this.partPick = value;

        const part =
            (this.parts ?? []).find(x => `${x.Kind}:${x.Id}` === String(value));

        if (part)
        {
            if (this.partLines.some(x => x.ItemKind === part.Kind && x.ItemId === part.Id))
            {
                this.toast.error('Parts', `${part.Name} is already on the job card : change its quantity.`);
            }
            else
            {
                this.partLines =
                [
                    ...this.partLines,
                    {
                        key:this.nextKey++,
                        ItemKind:part.Kind,
                        ItemId:part.Id,
                        ItemCode:part.PartNumber || part.Code || '',
                        ItemName:part.Name ?? '',
                        Quantity:'1',
                        Rate:String(part.Price ?? 0),
                        IsFree:false,
                        Note:''
                    }
                ];
            }
        }

        setTimeout(() =>
        {
            this.partPick = null;
            this.cdr.detectChanges();
        });
    }

    addOtherPart():
        void
    {
        this.partLines =
            [...this.partLines, { key:this.nextKey++, ItemKind:'Other', ItemId:null, ItemCode:'', ItemName:'', Quantity:'1', Rate:'', IsFree:false, Note:'' }];

        this.cdr.detectChanges();
    }

    removePart(line: Line):
        void
    {
        this.partLines = this.partLines.filter(x => x.key !== line.key);
        this.cdr.detectChanges();
    }

    onLine(line: Line, field: 'ItemName' | 'Quantity' | 'Rate' | 'Note', event: Event):
        void
    {
        line[field] = (event.target as HTMLInputElement).value;
        this.cdr.detectChanges();
    }

    onResult(row: CheckLine, result: string):
        void
    {
        // pressed again : not marked
        row.Result = row.Result === result ? '' : result;
        this.cdr.detectChanges();
    }

    onCheckNote(row: CheckLine, event: Event):
        void
    {
        row.Note = (event.target as HTMLInputElement).value;
    }

    //===========================================================
    // Save
    //===========================================================

    private body(): SaveJobCard | null
    {
        if (!this.jobDate)
        {
            this.toast.error('Validation', 'Choose the date.');
            return null;
        }

        if (!this.branchId)
        {
            this.toast.error('Validation', 'Choose the service center.');
            return null;
        }

        if (!this.serviceVehicleId && !this.chassisNo.trim() && !this.registrationNo.trim() && !this.engineNo.trim())
        {
            this.toast.error('Validation', 'Find the bike, or type its chassis, engine or registration no.');
            return null;
        }

        if (!this.customerName.trim())
        {
            this.toast.error('Validation', 'Give the name of the customer.');
            return null;
        }

        const km =
            this.kmReading.trim() === '' ? null : Math.round(Number(this.kmReading));

        if (km !== null && (!Number.isFinite(km) || km < 0))
        {
            this.toast.error('Validation', 'The KM reading is not a number.');
            return null;
        }

        if (km === null && this.lookups?.Switches?.RequireKm !== false)
        {
            this.toast.error('Validation', 'Give the KM reading of the bike.');
            return null;
        }

        let promisedAt: string | null = null;

        if (this.promisedDate)
        {
            const time =
                /^\d{1,2}:\d{2}$/.test(this.promisedTime.trim()) ? this.promisedTime.trim().padStart(5, '0') : '18:00';

            const promised =
                new Date(`${this.promisedDate}T${time}:00`);

            if (Number.isNaN(promised.getTime()))
            {
                this.toast.error('Validation', 'The promised time is not a time (like 17:30).');
                return null;
            }

            promisedAt = promised.toISOString();
        }

        const lines =
            (rows: Line[], what: string): any[] | null =>
            {
                const result: any[] = [];

                for (const x of rows)
                {
                    const quantity = Number(x.Quantity) || 0;

                    const rate = Number(x.Rate) || 0;

                    if (!x.ItemName.trim())
                    {
                        this.toast.error('Validation', `Give every ${what} line a name, or remove the empty line.`);
                        return null;
                    }

                    if (quantity <= 0 || rate < 0)
                    {
                        this.toast.error('Validation', `${x.ItemName} : the quantity must be more than 0 and the rate cannot be less than 0.`);
                        return null;
                    }

                    result.push({
                        ItemKind:x.ItemKind,
                        ItemId:x.ItemId,
                        ItemCode:x.ItemCode,
                        ItemName:x.ItemName.trim(),
                        Quantity:quantity,
                        Rate:rate,
                        Amount:this.amount(x),
                        IsFree:x.IsFree,
                        Note:x.Note.trim()
                    });
                }

                return result;
            };

        const services = lines(this.services, 'labour');

        if (!services)
        {
            return null;
        }

        const parts = lines(this.partLines, 'part');

        if (!parts)
        {
            return null;
        }

        if (this.simple)
        {
            // a bike of another showroom : serviced last, or (a new
            // bike, never serviced) bought
            if (!this.serviceVehicleId && this.jobType !== 'Internal' && !this.lastServiceDate && !this.purchaseDate)
            {
                this.openTab = 'open';
                this.toast.error('Validation', 'Give the purchase date or the last service date of the bike : one of the two is needed.');
                return null;
            }

            if (this.openObs.length === 0)
            {
                this.openTab = 'observations';
                this.toast.error('Validation', 'Pick one observation at least. The customer has no complaint : press No complaint or problem.');
                this.cdr.detectChanges();
                return null;
            }
        }

        return {
            PurchaseDate:this.simple ? this.purchaseDate : null,
            LastServiceDate:this.simple ? this.lastServiceDate : null,
            Observations:this.simple
                ? this.openObs.map(x => ({ WorkshopObservationId:x.WorkshopObservationId, Observation:x.Observation, Note:x.Note.trim() }))
                : null,
            JobDate:this.jobDate,
            BranchId:this.branchId,
            ServiceVehicleId:this.serviceVehicleId,
            ChassisNo:this.chassisNo.trim(),
            EngineNo:this.engineNo.trim(),
            RegistrationNo:this.registrationNo.trim(),
            ServiceBikeId:this.simple && this.pickedMotorBike?.ServiceOnly ? this.pickedMotorBike.Id : null,
            ModelId:this.modelId,
            ModelName:this.modelName.trim(),
            BrandName:this.brandName.trim(),
            ColorName:this.colorName.trim(),
            CustomerId:this.customerId,
            CustomerName:this.customerName.trim(),
            Mobile:this.mobile.trim(),
            KmReading:km,
            FuelLevel:this.fuelLevel,
            JobType:this.jobType,
            ServiceVehicleScheduleId:this.scheduleId,
            ServiceEnquiryId:this.enquiryId,
            AdvisorEmployeeId:this.advisorId,
            BasicRequirement:this.basicRequirement.trim(),
            PromisedAt:promisedAt,
            PickupDrop:this.pickupDrop,
            Remarks:this.remarks.trim(),
            EstimatePublicId:this.mode === 'add' && this.fromEstimate ? this.fromEstimate : null,
            Complaints:this.complaints.map(x => ({ Complaint:x.text.trim() })).filter(x => !!x.Complaint),
            Services:services,
            Parts:parts,
            Checklist:this.checklist.map(x => ({ WorkshopChecklistItemId:x.WorkshopChecklistItemId, ItemName:x.ItemName, Result:x.Result, Note:(x.Note ?? '').trim() }))
        };
    }

    onSave():
        void
    {
        if (this.isSaving || this.loading || !this.canEdit)
        {
            return;
        }

        const body = this.body();

        if (!body)
        {
            return;
        }

        // A new job with the default observation alone : the user is
        // asked before the save. Yes - back to the observations; No -
        // the job is saved as it is (owner 2026-11-18)
        if (this.simple && this.mode === 'add' && this.defaultObservationId != null
            && this.openObs.length > 0 && this.openObs.every(x => x.WorkshopObservationId === this.defaultObservationId))
        {
            this.confirmDialog.open(
                'Only The Default Observation',
                'Only the default observation is added to this job. Do you want to add other observations before saving?',
                () =>
                {
                    this.openTab = 'observations';
                    this.cdr.detectChanges();
                },
                'Yes, Add',
                'No, Save',
                'primary',
                () => this.saveBody(body));

            return;
        }

        this.saveBody(body);
    }

    private saveBody(body: NonNullable<ReturnType<JobCardsPage['body']>>):
        void
    {
        this.isSaving = true;

        this.progress.show(this.mode === 'edit' ? 'Updating' : 'Saving', 'Saving the job card...');

        this.ws.saveJobCard(this.mode === 'edit' ? this.entityId : '', body).subscribe(
        {
            next:saved =>
                // the bar fills, then the page carries on
                this.progress.finish(() =>
                {
                    this.isSaving = false;
                    const token = jobToken(saved?.WelcomeTokenNo, saved?.JobDate);

                    this.toast.success('Success', `${saved?.JobCardNo ?? 'The job card'} was saved.${token ? ' Serial token ' + token + '.' : ''}`);

                    // the simple page : back to the list, the card waits under Open
                    if (this.simple)
                    {
                        void this.router.navigate([this.mode === 'add' ? '../list' : '../../list'], { relativeTo:this.route });
                        return;
                    }

                    if (this.mode === 'add')
                    {
                        // the tokens of the customer print at once
                        if (saved?.WelcomeTokenNo || saved?.DeliveryTokenNo)
                        {
                            if (openJobCardTokensPrint(this.router, saved.PublicId))
                            {
                                this.toast.info('Tokens', 'The browser blocked the print tab : use the Tokens button.');
                            }
                        }

                        // the saved card opens : technicians start from there
                        void this.router.navigate(['../edit', saved.PublicId], { relativeTo:this.route });
                        return;
                    }

                    this.fill(saved);
                    this.cdr.detectChanges();
                }),
            error:error =>
            {
                this.progress.fail();
                this.isSaving = false;
                this.failed(error, 'The job card could not be saved.');
            }
        });
    }

    //===========================================================
    // Status and technician time (a saved card)
    //===========================================================

    statusIcon(status: string): string
    {
        return status === 'Cancelled' ? 'fas fa-ban'
            : status === 'Ready' ? 'fas fa-flag-checkered'
            : status === 'Work Done' ? 'fas fa-check'
            : status === 'Waiting Parts' ? 'fas fa-hourglass-half'
            : status === 'Open' ? 'fas fa-rotate-left'
            : 'fas fa-play';
    }

    //===========================================================
    // Job Card Assignment (stage 2) : the service engineer, the
    // bay and the technicians. An Open card becomes Assigned.
    //===========================================================

    technicianName(id: number): string
    {
        const row = (this.lookups?.Technicians ?? []).find(x => x.Id === id);

        return row ? `${row.Code}  ${row.Name}` : (this.card?.Technicians ?? []).find(x => x.WorkshopTechnicianId === id)?.TechnicianName ?? String(id);
    }

    // Only a technician of the assignment starts work on the card
    get startTechnicianItems(): Option[]
    {
        const assigned = (this.card?.Technicians ?? []).map(x => x.WorkshopTechnicianId);

        return this.technicianItems.filter(x => assigned.includes(Number(x.value)));
    }

    onAssignEngineer(value: any):
        void
    {
        this.assignEngineerId = Number(value) || null;
        this.cdr.detectChanges();
    }

    onAssignBay(value: any):
        void
    {
        this.assignBayId = Number(value) || null;
        this.cdr.detectChanges();
    }

    onAssignNote(value: any):
        void
    {
        this.assignNote = String(value ?? '');
    }

    onAssignTechnician(value: any):
        void
    {
        const id = Number(value) || 0;

        if (id && !this.assignTechnicianIds.includes(id))
        {
            this.assignTechnicianIds = [...this.assignTechnicianIds, id];
        }

        this.assignPick = null;
        this.cdr.detectChanges();
    }

    removeAssignTechnician(id: number):
        void
    {
        this.assignTechnicianIds = this.assignTechnicianIds.filter(x => x !== id);
        this.cdr.detectChanges();
    }

    // The technician becomes the lead (the first of the list)
    leadAssignTechnician(id: number):
        void
    {
        this.assignTechnicianIds = [id, ...this.assignTechnicianIds.filter(x => x !== id)];
        this.cdr.detectChanges();
    }

    saveAssignment():
        void
    {
        if (!this.card || this.isSaving)
        {
            return;
        }

        if (!this.assignEngineerId)
        {
            this.toast.error('Assignment', 'Pick the service engineer.');
            return;
        }

        if (!this.assignBayId)
        {
            this.toast.error('Assignment', 'Pick the bay.');
            return;
        }

        if (this.assignTechnicianIds.length === 0)
        {
            this.toast.error('Assignment', 'Pick the technician (the first is the lead).');
            return;
        }

        this.isSaving = true;

        this.progress.show('Saving', 'Assigning the job card...');

        this.ws.assignJobCard(this.card.PublicId, this.assignEngineerId, this.assignBayId, this.assignTechnicianIds, this.assignNote.trim()).subscribe(
        {
            next:card =>
            {
                this.progress.finish(() =>
                {
                    this.isSaving = false;
                    this.applyState(card);
                    this.toast.success('Assignment', `${card.JobCardNo} is assigned : ${card.BayName}, ${card.TechnicianNames}.`);
                    this.cdr.detectChanges();
                });
            },
            error:error =>
            {
                this.progress.fail();
                this.isSaving = false;
                this.failed(error, 'The job card could not be assigned.');
            }
        });
    }

    changeStatus(status: string):
        void
    {
        if (!this.card || this.isSaving)
        {
            return;
        }

        const note = this.statusNote.trim();

        if (status === 'Cancelled' && !note)
        {
            this.section = 'status';
            this.toast.error('Cancel', 'Write in the note why the job card is cancelled, then press Cancelled again.');
            this.cdr.detectChanges();
            return;
        }

        const run =
            (): void =>
            {
                this.isSaving = true;

                this.ws.changeJobCardStatus(this.card!.PublicId, status, note).subscribe(
                {
                    next:card =>
                    {
                        this.isSaving = false;
                        this.statusNote = '';
                        this.applyState(card);
                        this.toast.success('Status', `${card.JobCardNo} is now ${card.Status}.`);
                        this.cdr.detectChanges();
                    },
                    error:error =>
                    {
                        this.isSaving = false;
                        this.failed(error, 'The status could not be changed.');
                    }
                });
            };

        if (status === 'Cancelled')
        {
            this.confirmDialog.open('Cancel Job Card', `Cancel ${this.card.JobCardNo}?`, run, 'Cancel it', 'Keep', 'danger');
        }
        else
        {
            run();
        }
    }

    onWorkTechnician(value: any):
        void
    {
        this.workTechnicianId = Number(value) || null;
        this.cdr.detectChanges();
    }

    onWorkBay(value: any):
        void
    {
        this.workBayId = Number(value) || null;
        this.cdr.detectChanges();
    }

    startWork():
        void
    {
        if (!this.card || this.isSaving)
        {
            return;
        }

        if (!this.workTechnicianId)
        {
            this.toast.error('Technician Time', 'Choose the technician.');
            return;
        }

        this.isSaving = true;

        this.ws.startWork(this.card.PublicId, this.workTechnicianId, this.workBayId, this.workNote.trim()).subscribe(
        {
            next:card =>
            {
                this.isSaving = false;
                this.workTechnicianId = null;
                this.workNote = '';
                this.applyState(card);
                this.toast.success('Technician Time', 'The work has started.');
                this.cdr.detectChanges();
            },
            error:error =>
            {
                this.isSaving = false;
                this.failed(error, 'The work could not be started.');
            }
        });
    }

    stopWork(entry: JobCardWorkEntry):
        void
    {
        if (!this.card || this.isSaving)
        {
            return;
        }

        this.isSaving = true;

        this.ws.stopWork(this.card.PublicId, entry.JobCardWorkEntryId).subscribe(
        {
            next:card =>
            {
                this.isSaving = false;
                this.applyState(card);
                this.cdr.detectChanges();
            },
            error:error =>
            {
                this.isSaving = false;
                this.failed(error, 'The work could not be stopped.');
            }
        });
    }

    removeWork(entry: JobCardWorkEntry):
        void
    {
        if (!this.card)
        {
            return;
        }

        const card = this.card;

        this.confirmDialog.open(
            'Remove Time Stamp',
            `Remove the time of ${entry.TechnicianName}?`,
            () =>
                this.ws.deleteWork(card.PublicId, entry.JobCardWorkEntryId).subscribe(
                {
                    next:result =>
                    {
                        this.applyState(result);
                        this.cdr.detectChanges();
                    },
                    error:error => this.failed(error, 'The work entry could not be removed.')
                }),
            'Remove',
            'Keep',
            'danger');
    }
}

// The serial token of a job card, with its date : W-017 of 18
// November -> 1118017 (mmdd + serial, no hyphen). The serial starts from 001
// every day, so a bike still in the workshop from another day is
// told apart by the date in front (owner, 2026-11-18).
// The value of a Motor Bike in the list : ours (P) or one we do
// not sell (S)
const BIKE_NOT_FOUND = 'NONE';

function bikeKey(bike: JobCardMotorBike): string
{
    return (bike.ServiceOnly ? 'S' : 'P') + bike.Id;
}

function jobToken(welcomeTokenNo: string | null | undefined, jobDate?: string | null): string
{
    const serial = (welcomeTokenNo ?? '').replace(/^W-/, '');

    const date = (jobDate ?? '').substring(0, 10);

    const day = date.length === 10 ? date.substring(5, 7) + date.substring(8, 10) : '';

    return serial && day ? `${day}${serial}` : serial;
}
