//===============================================================
// Service Enquiries Form (Add / Update / View)
//
//   1 Enquiry : Service / Parts switch, No (preview), Date,
//     Branch (login branch), Source, Executive, Status, next
//     follow-up (or suspend reason), method
//   2 Enquirer : Mobile (lookup : known enquirer, customer,
//     earlier sales / service enquiries), Name, Alternate Phone,
//     Location, Address, Remarks
//   3 Bike & Follow-up : Model (required for Service), preferred
//     date (Service), next follow-up (or suspend reason), method,
//     and a summary of what is asked for
//   Services & Parts : a pop-up opened from the toolbar (right)
//     or the summary — services (Service Settings, by the bike's
//     brand) and parts (Spare Parts / Accessories with MRP and
//     stock), or typed; quantity / rate; estimate total
//   (Registration, KM, chassis, alternate phone, address,
//   complaint, time and pick-up are no longer on the form; an
//   enquiry that has them keeps them)
//
// After every successful save the page goes back to the list.
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

import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { ControlTabsComponent, ControlTab } from '../../../../../../shared/components/controls/control-tabs/control-tabs';
import { FormGridComponent } from '../../../../../../shared/components/layout/form-grid/form-grid';
import { FormSectionComponent } from '../../../../../../shared/components/layout/form-section/form-section';
import { TextboxComponent } from '../../../../../../shared/components/controls/textbox/textbox';
import { TextareaComponent } from '../../../../../../shared/components/controls/textarea/textarea';
import { SearchDropdownComponent } from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { DatepickerComponent } from '../../../../../../shared/components/controls/datepicker/datepicker';
import { OrbitLoaderComponent } from '../../../../../../shared/components/utilities/orbit-loader/orbit-loader';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { ProgressDialogService } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';
import { ProgressRunner } from '../../../../../../shared/components/utilities/progress-dialog/progress-runner';
import { AuthenticationStorageService } from '../../../../../../core/authentication/authentication-storage.service';

import
{
    ServiceEnquiry,
    ServiceEnquiryLine,
    ServiceEnquiryType,
    ServiceLineType,
    CreateServiceEnquiry,
    UpdateServiceEnquiry,
    ServiceEnquiriesDefaults,
    ServiceItemOption,
    PartOption,
    EnquiryOption,
    EnquirerLookup,
    EnquirerHistory
}
from '../../../models/service-enquiries.model';

import { ServiceEnquiriesService } from '../../../services/service-enquiries.service';
import { ServiceFollowUpsService } from '../../../services/service-follow-ups.service';
import { ServiceFollowUp } from '../../../models/service-follow-ups.model';
import { ServiceFollowUpDialog, SERVICE_OUTCOME_COLORS } from '../follow-up/service-follow-up-dialog';


// A dropdown item
interface Item
{
    label:string;
    value:any;
}

// A line with its place in entity.Lines
interface LineView
{
    index:number;
    line:ServiceEnquiryLine;
}


const KIND_LABELS: Record<string, string> =
{
    Scheduled:'Scheduled',
    LaborChart:'Labor Chart',
    Customized:'Package',
    Membership:'Membership',
    SparePart:'Spare Part',
    Accessory:'Accessory',
    Other:'Typed'
};


@Component(
{
    selector:'serviceEnquiries-form',

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
        DatepickerComponent,
        OrbitLoaderComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        ServiceFollowUpDialog
    ],

    templateUrl:'./service-enquiries-form.html',

    styleUrls:
    [
        './service-enquiries-form.css'
    ]
})
export class ServiceEnquiriesForm
implements OnInit, AfterViewInit, OnDestroy
{
    //===========================================================
    // Body height (as on Sales Enquiries : the sections are as
    // tall as the longest one, capped above the footer)
    //===========================================================

    @ViewChild('formBody')
    private formBody?: ElementRef<HTMLElement>;

    private fitTimer?: number;

    private static readonly BottomGap = 12;

    ngAfterViewInit(): void
    {
        this.scheduleFit();
    }

    ngOnDestroy(): void
    {
        if (this.fitTimer)
        {
            clearTimeout(this.fitTimer);
        }
    }

    @HostListener('window:resize')
    onWindowResize(): void
    {
        this.scheduleFit();
    }

    private scheduleFit(): void
    {
        if (this.fitTimer)
        {
            clearTimeout(this.fitTimer);
        }

        this.fitTimer = window.setTimeout(() => this.fitHeight(), 30);
    }

    private visibleBottom(element: HTMLElement): number
    {
        const pane = element.closest('main.content');

        return pane
            ? Math.min(pane.getBoundingClientRect().bottom, window.innerHeight)
            : window.innerHeight - 44;
    }

    private fitHeight(): void
    {
        const body = this.formBody?.nativeElement;

        if (!body)
        {
            return;
        }

        const height =
            Math.floor(this.visibleBottom(body) - body.getBoundingClientRect().top - ServiceEnquiriesForm.BottomGap);

        const limit = `${Math.max(320, height)}px`;

        body.style.height = this.loading ? limit : '';

        body.style.maxHeight = limit;
    }


    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route = inject(ActivatedRoute);

    private readonly router = inject(Router);

    private readonly service = inject(ServiceEnquiriesService);

    private readonly toast = inject(ToastService);

    private readonly auth = inject(AuthenticationStorageService);

    private readonly cdr = inject(ChangeDetectorRef);

    readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges()
        );


    //===========================================================
    // Mode / Header
    //===========================================================

    mode: 'add' | 'edit' | 'view' = 'add';

    entityId = 0;

    // The id in the address bar : the uuid (or the internal id
    // when opened from the Appointments board)
    routePublicId = '';

    loading = true;

    selectedTab = 'general';

    get isView(): boolean
    {
        return this.mode === 'view';
    }

    get pageTitle(): string
    {
        return this.mode === 'edit'
            ? 'Update Service Enquiry'
            : this.mode === 'view'
                ? 'View Service Enquiry'
                : 'Add Service Enquiry';
    }

    get tabs(): ControlTab[]
    {
        return [{ id:'general', label:this.pageTitle }];
    }

    get saveText(): string
    {
        return this.mode === 'edit' ? 'Update' : 'Save';
    }

    get saveIcon(): string
    {
        return this.mode === 'edit' ? 'fas fa-pen-to-square' : 'fas fa-floppy-disk';
    }

    //===========================================================
    // Follow-ups : calls logged on this enquiry (pop-up). Next
    // follow-up and method change only by logging a call once the
    // enquiry is saved.
    //===========================================================

    private readonly followUps = inject(ServiceFollowUpsService);

    calls: ServiceFollowUp[] = [];

    callsLoading = false;

    callEnquiry: ServiceEnquiry | null = null;

    get followUpLocked(): boolean
    {
        return this.locked || this.mode !== 'add';
    }

    get canLogCall(): boolean
    {
        return this.mode !== 'add' && !this.entity.IsConverted && this.entity.ServiceEnquiryId > 0;
    }

    outcomeColor(outcome: string): string
    {
        return SERVICE_OUTCOME_COLORS[outcome] ?? '#64748B';
    }

    callTime(value: string): string
    {
        const date = new Date(value);

        return isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    }

    private loadCalls(enquiryId: number): void
    {
        this.callsLoading = true;

        this.followUps
            .getByEnquiry(enquiryId)
            .subscribe
            ({
                next: (rows: ServiceFollowUp[]): void =>
                {
                    this.calls = rows ?? [];

                    this.callsLoading = false;

                    this.cdr.detectChanges();
                },

                error: (): void =>
                {
                    this.calls = [];

                    this.callsLoading = false;

                    this.cdr.detectChanges();
                }
            });
    }

    openCall(): void
    {
        if (!this.canLogCall || this.progress.busy)
        {
            return;
        }

        this.requestOpen = false;

        this.callEnquiry = { ...this.entity };

        this.cdr.detectChanges();
    }

    // The call changed the enquiry on the server : load it again
    onCallSaved(): void
    {
        this.callEnquiry = null;

        this.loadEntity();
    }

    onCallClosed(): void
    {
        this.callEnquiry = null;

        this.cdr.detectChanges();
    }

    // Form locked : view, converted, or saving
    get locked(): boolean
    {
        return this.isView || this.entity.IsConverted || this.progress.busy;
    }

    get isService(): boolean
    {
        return this.entity.EnquiryType === 'Service';
    }


    //===========================================================
    // Dropdown items
    //===========================================================

    sourceItems: Item[] = [];

    statusItems: Item[] = [];

    methodItems: Item[] = [];

    lostReasonItems: Item[] = [];

    executiveItems: Item[] = [];

    locationItems: Item[] = [];

    modelItems: Item[] = [];

    // Services for the bike's brand (+ dealer services)
    serviceItems: Item[] = [];

    partItems: Item[] = [];

    readonly slotItems: Item[] =
    [
        { label:'Any time',  value:'' },
        { label:'Morning',   value:'Morning' },
        { label:'Afternoon', value:'Afternoon' },
        { label:'Evening',   value:'Evening' }
    ];

    readonly pickupItems: Item[] =
    [
        { label:'No',               value:false },
        { label:'Yes, pick & drop', value:true }
    ];

    // Picker values (cleared after a line is added)
    pickedService: string | null = null;

    pickedPart: string | null = null;

    otherServiceText = '';

    otherPartText = '';

    partsLoading = false;

    private statusStages = new Map<number, string>();

    private defaults: ServiceEnquiriesDefaults | null = null;

    private parts: PartOption[] = [];


    //===========================================================
    // Entity + text boxes
    //===========================================================

    entity: ServiceEnquiry = this.emptyEntity();

    enquiryDate: Date = new Date();

    readonly today: Date = new Date();

    preferredDate: Date | null = null;

    nextFollowUpDate: Date | null = null;

    kmText = '';


    //===========================================================
    // Enquirer lookup
    //===========================================================

    lookup: EnquirerLookup | null = null;

    lookupBusy = false;

    private lookedUpMobile = '';

    private originalMobile = '';

    get earlierEnquiries(): EnquirerHistory[]
    {
        return (this.lookup?.Enquiries ?? []).slice(0, 4);
    }

    get isLost(): boolean
    {
        return this.statusStages.get(Number(this.entity.StatusId)) === 'Lost';
    }


    //===========================================================
    // Lines
    //===========================================================

    get serviceLines(): LineView[]
    {
        return this.entity.Lines
            .map((line, index) => ({ index, line }))
            .filter(x => x.line.LineType === 'Service');
    }

    get partLines(): LineView[]
    {
        return this.entity.Lines
            .map((line, index) => ({ index, line }))
            .filter(x => x.line.LineType === 'Part');
    }

    get total(): number
    {
        return this.entity.Lines.reduce((sum, x) => sum + (Number(x.Amount) || 0), 0);
    }

    kindLabel(kind: string): string
    {
        return KIND_LABELS[kind] ?? kind;
    }

    money(value: number): string
    {
        return 'Tk ' + (Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits:0, maximumFractionDigits:2 });
    }


    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit(): void
    {
        const routeId = (this.route.snapshot.paramMap.get('id') ?? '').trim();

        const url = this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/') ? 'view'
            : url.includes('/edit/') ? 'edit'
            : 'add';

        this.routePublicId = routeId;

        this.entityId = 0;

        this.loadParts();

        if (this.routePublicId)
        {
            this.loadEntity();
        }
        else
        {
            this.startNew();
        }
    }


    private emptyEntity(): ServiceEnquiry
    {
        const user = this.auth.getUser();

        return {
            ServiceEnquiryId:0,
            EnquiryNo:'',
            EnquiryDate:'',
            BranchId:Number(user?.branchId ?? 0),
            BranchName:user?.branchName ?? '',
            EnquiryType:'Service',
            SourceId:0,
            SourceName:'',
            StatusId:0,
            StatusName:'',
            StatusColor:'',
            StatusStage:'',
            ExecutiveUserId:Number(user?.userProfileId ?? 0),
            ExecutiveName:'',
            EnquiryContactId:0,
            EnquirerMobile:'',
            EnquirerName:'',
            AltPhone:'',
            LocationId:null,
            LocationName:'',
            Address:'',
            ModelId:null,
            ModelName:'',
            BrandManagementId:null,
            BrandName:'',
            RegistrationNo:'',
            ChassisNo:'',
            KmReading:null,
            Complaint:'',
            PreferredDate:null,
            PreferredSlot:'',
            PickupDrop:false,
            EstimatedTotal:0,
            Lines:[],
            RequestSummary:'',
            NextFollowUpDate:null,
            FollowUpMethodId:null,
            FollowUpMethodName:'',
            LastFollowUpDate:null,
            LastFollowUpNote:'',
            LostReasonId:null,
            LostReasonName:'',
            ClosedDate:null,
            Remarks:'',
            FromWebsite:false,
            ServiceVehicleScheduleId:null,
            IsConverted:false,
            ConvertedDate:null,
            ConvertedDocType:'',
            ConvertedDocNo:''
        };
    }


    //===========================================================
    // Dates
    //===========================================================

    private toIso(date: Date | null): string | null
    {
        if (!date)
        {
            return null;
        }

        const pad = (n: number): string => String(n).padStart(2, '0');

        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    private fromIso(value: string | null): Date | null
    {
        if (!value)
        {
            return null;
        }

        const [year, month, day] = value.slice(0, 10).split('-').map(Number);

        return year && month && day ? new Date(year, month - 1, day) : null;
    }

    formatDate(value: string | null): string
    {
        const date = this.fromIso(value);

        return date
            ? date.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
            : '—';
    }


    //===========================================================
    // Load
    //===========================================================

    private startNew(): void
    {
        this.entity = this.emptyEntity();

        this.enquiryDate = new Date();

        this.preferredDate = null;

        this.nextFollowUpDate = null;

        this.kmText = '';

        this.loadDefaults(() =>
        {
            const d = this.defaults!;

            const pick = (list: EnquiryOption[]): number =>
                list.find(x => x.IsDefault)?.Id ?? list[0]?.Id ?? 0;

            this.entity.EnquiryNo = d.NextEnquiryNo;

            this.entity.SourceId = pick(d.Sources);

            this.entity.StatusId =
                d.Statuses.find(x => x.IsDefault && x.Stage === 'Open')?.Id
                ?? d.Statuses.find(x => x.Stage === 'Open')?.Id
                ?? 0;

            this.entity.FollowUpMethodId = d.FollowUpMethods.find(x => x.IsDefault)?.Id ?? null;

            if (!d.Executives.some(x => x.Id === this.entity.ExecutiveUserId))
            {
                this.entity.ExecutiveUserId = 0;
            }

            this.loading = false;

            this.cdr.detectChanges();

            this.scheduleFit();
        });
    }


    private loadEntity(): void
    {
        this.loading = true;

        this.service
            .getById(this.routePublicId)
            .subscribe
            ({
                next: (response: ServiceEnquiry): void =>
                {
                    this.entity = response;

                    this.entityId = response.ServiceEnquiryId;

                    this.loadCalls(response.ServiceEnquiryId);

                    this.enquiryDate = this.fromIso(response.EnquiryDate) ?? new Date();

                    this.preferredDate = this.fromIso(response.PreferredDate);

                    this.nextFollowUpDate = this.fromIso(response.NextFollowUpDate);

                    this.kmText = response.KmReading != null ? String(response.KmReading) : '';

                    this.originalMobile = response.EnquirerMobile;

                    // Website enquiry, unassigned : the user who saves
                    // it becomes its executive
                    if (!(response.ExecutiveUserId > 0) && this.mode === 'edit')
                    {
                        this.entity.ExecutiveUserId = Number(this.auth.getUser()?.userProfileId ?? 0);
                    }

                    // A converted enquiry opens read-only
                    if (response.IsConverted && this.mode === 'edit')
                    {
                        this.mode = 'view';
                    }

                    this.loadDefaults(() =>
                    {
                        this.loading = false;

                        this.runLookup(response.EnquirerMobile, false);

                        this.cdr.detectChanges();

                        this.scheduleFit();
                    });
                },

                error: (error: unknown): void =>
                {
                    console.error('Load Service Enquiry Error:', error);

                    this.toast.error('Load Failed', this.errorText(error, 'The service enquiry could not be loaded.'));

                    this.onBackToList();
                }
            });
    }


    private loadDefaults(done: () => void): void
    {
        this.service
            .getDefaults(this.toIso(this.enquiryDate) ?? '')
            .subscribe
            ({
                next: (defaults: ServiceEnquiriesDefaults): void =>
                {
                    this.defaults = defaults;

                    this.buildItems();

                    done();
                },

                error: (error: unknown): void =>
                {
                    console.error('Load Defaults Error:', error);

                    this.loading = false;

                    this.toast.error('Load Failed', this.errorText(error, 'The enquiry lists could not be loaded. Run ServiceEnquiries_Tables.sql.'));

                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Services & Parts pop-up
    //===========================================================

    requestOpen = false;

    openRequest(): void
    {
        if (this.loading)
        {
            return;
        }

        this.requestOpen = true;

        this.cdr.detectChanges();
    }

    closeRequest(): void
    {
        this.requestOpen = false;

        this.cdr.detectChanges();
    }

    @HostListener('document:keydown.escape')
    onEscape(): void
    {
        if (this.requestOpen)
        {
            this.closeRequest();
        }
    }

    // "1st Free Service, Brake Shoe x 2 …" on the summary
    get requestPreview(): string
    {
        const names =
            this.entity.Lines.map(x => x.Quantity > 1 ? `${x.ItemName} x ${x.Quantity}` : x.ItemName);

        return names.length > 3
            ? `${names.slice(0, 3).join(', ')} +${names.length - 3} more`
            : names.join(', ');
    }


    // Spare parts + accessories (once per form)
    private loadParts(): void
    {
        this.partsLoading = true;

        this.service
            .getParts()
            .subscribe
            ({
                next: (parts: PartOption[]): void =>
                {
                    this.parts = parts ?? [];

                    this.partsLoading = false;

                    this.buildPartItems();

                    this.cdr.detectChanges();
                },

                error: (): void =>
                {
                    this.partsLoading = false;

                    this.cdr.detectChanges();
                }
            });
    }


    private buildItems(): void
    {
        const d = this.defaults!;

        const e = this.entity;

        const items = (list: EnquiryOption[], ownId: number | null, ownName: string): Item[] =>
        {
            const result = list.map(x => ({ label:x.Name, value:x.Id }));

            if (ownId && ownName && !list.some(x => x.Id === ownId))
            {
                result.push({ label:`${ownName} (inactive)`, value:ownId });
            }

            return result;
        };

        this.sourceItems = items(d.Sources, e.SourceId, e.SourceName);

        this.statusItems = items(d.Statuses, e.StatusId, e.StatusName);

        this.methodItems = items(d.FollowUpMethods, e.FollowUpMethodId, e.FollowUpMethodName);

        this.lostReasonItems = items(d.LostReasons, e.LostReasonId, e.LostReasonName);

        this.executiveItems = items(d.Executives, e.ExecutiveUserId, e.ExecutiveName);

        this.locationItems = items(d.Locations, e.LocationId, e.LocationName);

        this.statusStages = new Map(d.Statuses.map(x => [x.Id, x.Stage] as [number, string]));

        if (e.StatusId && !this.statusStages.has(e.StatusId))
        {
            this.statusStages.set(e.StatusId, e.StatusStage);
        }

        const models =
            d.Models.map(x => ({ label:x.BrandName ? `${x.Name} · ${x.BrandName}` : x.Name, value:x.Id }));

        if (e.ModelId && !models.some(x => x.value === e.ModelId))
        {
            models.push({ label:`${e.ModelName} (inactive)`, value:e.ModelId });
        }

        this.modelItems = models;

        this.buildServiceItems();
    }


    // Services of the bike's brand, then dealer services (any brand)
    private buildServiceItems(): void
    {
        const brand = this.entity.BrandManagementId;

        const list =
            (this.defaults?.ServiceItems ?? [])
                .filter(x => x.BrandManagementId == null || brand == null || x.BrandManagementId === brand);

        this.serviceItems =
            list.map(x => ({
                label:
                    `${x.Name} · ${this.kindLabel(x.Kind)}`
                    + (x.IsFree ? ' · Free' : x.Rate > 0 ? ` · Charge ${this.money(x.Rate)}` : ' · Charge not set')
                    + (x.Info ? ` · ${x.Info}` : ''),
                value:`${x.Kind}-${x.Id}`
            }));
    }


    // Parts : the bike's brand first; all when no bike
    private buildPartItems(): void
    {
        const brand = this.entity.BrandManagementId;

        const list =
            brand == null
                ? this.parts
                : [
                    ...this.parts.filter(x => x.BrandManagementId === brand),
                    ...this.parts.filter(x => x.BrandManagementId !== brand)
                  ];

        this.partItems =
            list.map(x => ({
                label:
                    `${x.Name}`
                    + (x.PartNumber ? ` · ${x.PartNumber}` : '')
                    + (x.Price != null && x.Price > 0 ? ` · MRP ${this.money(x.Price)}` : ' · MRP not set')
                    + (x.OnHand > 0 ? ` · In stock ${x.OnHand}` : ' · Order')
                    + (x.BrandName ? ` · ${x.BrandName}` : ''),
                value:`${x.Kind}-${x.Id}`
            }));
    }


    //===========================================================
    // Inputs
    //===========================================================

    private unwrap(value: any): any
    {
        return value !== null && typeof value === 'object' && 'value' in value ? value.value : value;
    }

    private toId(value: any): number | null
    {
        const id = Number(this.unwrap(value) ?? 0);

        return id > 0 ? id : null;
    }

    setType(type: ServiceEnquiryType): void
    {
        if (this.locked || this.entity.EnquiryType === type)
        {
            return;
        }

        this.entity.EnquiryType = type;

        this.cdr.detectChanges();

        this.scheduleFit();
    }

    onEnquiryDateChange(date: Date): void
    {
        const old = this.enquiryDate;

        this.enquiryDate = date;

        // Add : the number follows the month
        if (this.mode === 'add' && date && (date.getMonth() !== old?.getMonth() || date.getFullYear() !== old?.getFullYear()))
        {
            this.service
                .getDefaults(this.toIso(date) ?? '')
                .subscribe
                ({
                    next: defaults =>
                    {
                        if (this.toIso(this.enquiryDate)?.slice(0, 7) === this.toIso(date)?.slice(0, 7))
                        {
                            this.entity.EnquiryNo = defaults.NextEnquiryNo;

                            this.cdr.detectChanges();
                        }
                    },

                    error: () => {}
                });
        }
    }

    onSourceChange(value: any): void { this.entity.SourceId = this.toId(value) ?? 0; }

    onExecutiveChange(value: any): void { this.entity.ExecutiveUserId = this.toId(value) ?? 0; }

    onMethodChange(value: any): void { this.entity.FollowUpMethodId = this.toId(value); }

    onLostReasonChange(value: any): void { this.entity.LostReasonId = this.toId(value); }

    onLocationChange(value: any): void { this.entity.LocationId = this.toId(value); }

    onStatusChange(value: any): void
    {
        this.entity.StatusId = this.toId(value) ?? 0;

        if (!this.isLost)
        {
            this.entity.LostReasonId = null;
        }

        this.cdr.detectChanges();
    }

    onModelChange(value: any): void
    {
        this.entity.ModelId = this.toId(value);

        const model = this.defaults?.Models.find(x => x.Id === this.entity.ModelId);

        this.entity.BrandManagementId = model?.BrandManagementId ?? null;

        this.entity.BrandName = model?.BrandName ?? '';

        this.entity.ModelName = model?.Name ?? '';

        this.buildServiceItems();

        this.buildPartItems();

        this.cdr.detectChanges();
    }

    onTextChange(field: 'EnquirerName' | 'Address' | 'Complaint' | 'Remarks', value: string | number): void
    {
        this.entity[field] = String(value ?? '');
    }

    onPlateChange(field: 'RegistrationNo' | 'ChassisNo', value: string | number): void
    {
        this.entity[field] = String(value ?? '').toUpperCase();
    }

    onKmChange(value: string | number): void
    {
        this.kmText = String(value ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 6);

        this.entity.KmReading = this.kmText ? Number(this.kmText) : null;

        this.cdr.detectChanges();
    }

    onSlotChange(value: any): void
    {
        this.entity.PreferredSlot = String(this.unwrap(value) ?? '');
    }

    onPickupChange(value: any): void
    {
        const v = this.unwrap(value);

        this.entity.PickupDrop = v === true || v === 'true';
    }

    onPreferredDateChange(date: Date): void { this.preferredDate = date ?? null; }

    onNextFollowUpChange(date: Date): void { this.nextFollowUpDate = date ?? null; }

    private digits(value: string | number): string
    {
        return String(value ?? '').replace(/\D/g, '').slice(0, 11);
    }

    onAltPhoneChange(value: string | number): void
    {
        this.entity.AltPhone = this.digits(value);

        this.cdr.detectChanges();
    }

    get mobileWarning(): string
    {
        const mobile = this.entity.EnquirerMobile;

        return mobile && (mobile.length !== 11 || !mobile.startsWith('01'))
            ? 'Mobile must be 11 digits starting with 01.'
            : '';
    }

    get altPhoneWarning(): string
    {
        const phone = this.entity.AltPhone;

        return phone && (phone.length !== 11 || !phone.startsWith('01'))
            ? 'Alternate Phone must be 11 digits starting with 01.'
            : '';
    }


    //===========================================================
    // Lines : add / change / remove
    //===========================================================

    private addLine(line: ServiceEnquiryLine): void
    {
        if (this.entity.Lines.length >= 50)
        {
            this.toast.warning('Too Many Lines', 'An enquiry can have up to 50 lines.');

            return;
        }

        this.entity.Lines = [...this.entity.Lines, line];

        this.cdr.detectChanges();

        this.scheduleFit();
    }

    onServicePick(value: any): void
    {
        const key = String(this.unwrap(value) ?? '');

        const item: ServiceItemOption | undefined =
            this.defaults?.ServiceItems.find(x => `${x.Kind}-${x.Id}` === key);

        if (!item)
        {
            return;
        }

        const scheduled =
            item.Kind === 'Scheduled'
                ? this.entity.Lines.find(x => x.LineType === 'Service' && x.ItemKind === 'Scheduled')
                : undefined;

        if (this.entity.Lines.some(x => x.LineType === 'Service' && x.ItemKind === item.Kind && x.ItemId === item.Id))
        {
            this.toast.info('Already Added', `${item.Name} is already on this enquiry.`);
        }
        else if (scheduled)
        {
            // One scheduled (free / paid policy) service at a time
            this.toast.warning('One Scheduled Service', `${scheduled.ItemName} is already in the cart. Only one scheduled service can be taken at a time : remove it first.`);
        }
        else
        {
            this.addLine({
                LineType:'Service',
                ItemKind:item.Kind,
                ItemId:item.Id,
                ItemCode:item.Code,
                ItemName:item.Name,
                Quantity:1,
                Rate:item.Rate,
                Amount:item.Rate,
                Note:item.IsFree ? 'Free' : ''
            });
        }

        // Clear the picker for the next one
        this.pickedService = key;

        setTimeout(() => { this.pickedService = null; this.cdr.detectChanges(); });
    }

    onPartPick(value: any): void
    {
        const key = String(this.unwrap(value) ?? '');

        const part = this.parts.find(x => `${x.Kind}-${x.Id}` === key);

        if (!part)
        {
            return;
        }

        const existing =
            this.entity.Lines.findIndex(x => x.LineType === 'Part' && x.ItemKind === part.Kind && x.ItemId === part.Id);

        if (existing >= 0)
        {
            // Same part again : one more
            const line = this.entity.Lines[existing];

            this.setQuantity(existing, line.Quantity + 1);
        }
        else
        {
            const rate = part.Price ?? 0;

            this.addLine({
                LineType:'Part',
                ItemKind:part.Kind,
                ItemId:part.Id,
                ItemCode:part.PartNumber || part.Code,
                ItemName:part.Name,
                Quantity:1,
                Rate:rate,
                Amount:rate,
                Note:part.OnHand > 0 ? `In stock ${part.OnHand}` : 'To order'
            });
        }

        this.pickedPart = key;

        setTimeout(() => { this.pickedPart = null; this.cdr.detectChanges(); });
    }

    onOtherText(type: ServiceLineType, value: string | number): void
    {
        if (type === 'Service')
        {
            this.otherServiceText = String(value ?? '');
        }
        else
        {
            this.otherPartText = String(value ?? '');
        }
    }

    addOther(type: ServiceLineType): void
    {
        const text = (type === 'Service' ? this.otherServiceText : this.otherPartText).trim();

        if (!text || this.locked)
        {
            return;
        }

        this.addLine({
            LineType:type,
            ItemKind:'Other',
            ItemId:null,
            ItemCode:'',
            ItemName:text.slice(0, 200),
            Quantity:1,
            Rate:0,
            Amount:0,
            Note:''
        });

        if (type === 'Service')
        {
            this.otherServiceText = '';
        }
        else
        {
            this.otherPartText = '';
        }
    }

    private setQuantity(index: number, quantity: number): void
    {
        const lines = [...this.entity.Lines];

        const line = { ...lines[index] };

        line.Quantity = Math.min(9999, Math.max(0, quantity));

        line.Amount = Math.round(line.Quantity * line.Rate * 100) / 100;

        lines[index] = line;

        this.entity.Lines = lines;

        this.cdr.detectChanges();
    }

    onLineQuantity(index: number, event: Event): void
    {
        const input = event.target as HTMLInputElement;

        const text = input.value.replace(/[^0-9.]/g, '').slice(0, 7);

        input.value = text;

        this.setQuantity(index, Number(text || 0));
    }

    onLineRate(index: number, event: Event): void
    {
        const input = event.target as HTMLInputElement;

        const text = input.value.replace(/[^0-9.]/g, '').slice(0, 12);

        input.value = text;

        const lines = [...this.entity.Lines];

        const line = { ...lines[index] };

        line.Rate = Number(text || 0);

        line.Amount = Math.round(line.Quantity * line.Rate * 100) / 100;

        lines[index] = line;

        this.entity.Lines = lines;

        this.cdr.detectChanges();
    }

    removeLine(index: number): void
    {
        if (this.locked)
        {
            return;
        }

        this.entity.Lines = this.entity.Lines.filter((_, i) => i !== index);

        this.cdr.detectChanges();

        this.scheduleFit();
    }


    //===========================================================
    // Enquirer Mobile : lookup at 11 digits
    //===========================================================

    onMobileChange(value: string | number): void
    {
        this.entity.EnquirerMobile = this.digits(value);

        if (this.entity.EnquirerMobile.length === 11 && this.entity.EnquirerMobile.startsWith('01'))
        {
            this.runLookup(this.entity.EnquirerMobile, this.entity.EnquirerMobile !== this.originalMobile);
        }
        else
        {
            this.lookup = null;

            this.lookedUpMobile = '';
        }

        this.cdr.detectChanges();
    }

    private runLookup(mobile: string, fill: boolean): void
    {
        if (!mobile || mobile === this.lookedUpMobile)
        {
            return;
        }

        this.lookedUpMobile = mobile;

        this.lookupBusy = true;

        this.service
            .lookupEnquirer(mobile, this.entity.ServiceEnquiryId)
            .subscribe
            ({
                next: (result: EnquirerLookup): void =>
                {
                    if (this.entity.EnquirerMobile !== mobile)
                    {
                        return;
                    }

                    this.lookup = result;

                    this.lookupBusy = false;

                    if (fill && result.EnquiryContactId && !this.locked)
                    {
                        this.entity.EnquirerName = result.ContactName;

                        this.entity.AltPhone = result.AltPhone;

                        this.entity.Address = result.Address;

                        this.entity.LocationId = result.LocationId;

                        this.entity.LocationName = this.locationItems.find(x => x.value === result.LocationId)?.label ?? '';
                    }

                    this.cdr.detectChanges();
                },

                error: () =>
                {
                    this.lookupBusy = false;

                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Save
    //===========================================================

    private validate(): string
    {
        const e = this.entity;

        if (!this.enquiryDate) return 'Enquiry Date is required.';

        if (!(e.BranchId > 0)) return 'No branch : log in to a branch first.';

        if (!(e.SourceId > 0)) return 'Choose the Source of Enquiry.';

        if (!(e.ExecutiveUserId > 0)) return 'Choose the Executive.';

        if (!(e.StatusId > 0)) return 'Choose the Enquiry Status.';

        if (this.mobileWarning || !e.EnquirerMobile) return 'Enter the enquirer\'s Mobile (11 digits starting with 01).';

        if (!e.EnquirerName.trim()) return 'Enquirer Name is required.';

        if (this.altPhoneWarning) return this.altPhoneWarning;

        if (this.isService && !e.ModelId) return 'Choose the bike Model.';

        if (this.isService && this.serviceLines.length === 0 && !e.Complaint.trim()) return 'Add the service needed : open Services & Parts.';

        if (!this.isService && this.partLines.length === 0) return 'Add at least one part : open Parts.';

        if (e.Lines.some(x => !(x.Quantity > 0))) return 'Every line needs a quantity above 0.';

        if (this.isLost && !e.LostReasonId) return 'Choose the Suspend Reason.';

        return '';
    }

    onSave(): void
    {
        if (this.locked)
        {
            return;
        }

        const problem = this.validate();

        if (problem)
        {
            this.toast.warning('Check the Form', problem);

            return;
        }

        const e = this.entity;

        const body: CreateServiceEnquiry =
        {
            EnquiryDate: this.toIso(this.enquiryDate)!,
            BranchId: e.BranchId,
            EnquiryType: e.EnquiryType,
            SourceId: e.SourceId,
            StatusId: e.StatusId,
            ExecutiveUserId: e.ExecutiveUserId,
            EnquirerMobile: e.EnquirerMobile,
            EnquirerName: e.EnquirerName.trim(),
            AltPhone: e.AltPhone,
            LocationId: e.LocationId,
            Address: e.Address.trim(),
            ModelId: e.ModelId,
            RegistrationNo: e.RegistrationNo.trim(),
            ChassisNo: e.ChassisNo.trim(),
            KmReading: e.KmReading,
            Complaint: e.Complaint.trim(),
            PreferredDate: this.isService ? this.toIso(this.preferredDate) : null,
            PreferredSlot: this.isService ? e.PreferredSlot : '',
            PickupDrop: this.isService && e.PickupDrop,
            Lines: e.Lines,
            NextFollowUpDate: this.isLost ? null : this.toIso(this.nextFollowUpDate),
            FollowUpMethodId: e.FollowUpMethodId,
            LostReasonId: this.isLost ? e.LostReasonId : null,
            Remarks: e.Remarks.trim()
        };

        const isAdd = this.mode === 'add';

        const call$ =
            isAdd
                ? this.service.create(body)
                : this.service.update(this.routePublicId, { ServiceEnquiryId:e.ServiceEnquiryId, ...body } as UpdateServiceEnquiry);

        this.progress
            .run<unknown>(
                isAdd ? 'Saving Service Enquiry' : 'Updating Service Enquiry',
                'Please wait while the service enquiry is being saved...',
                isAdd ? 'Service enquiry saved.' : 'Service enquiry updated.',
                call$
            )
            .subscribe
            ({
                next: (): void =>
                {
                    this.toast.success(
                        isAdd ? 'Save Successful' : 'Update Successful',
                        isAdd ? `Service enquiry for ${body.EnquirerName} saved.` : `${e.EnquiryNo} updated.`
                    );

                    this.onBackToList();
                },

                error: (error: unknown): void =>
                {
                    console.error('Save Service Enquiry Error:', error);

                    this.toast.error(
                        isAdd ? 'Save Failed' : 'Update Failed',
                        this.errorText(error, 'The service enquiry could not be saved.')
                    );
                }
            });
    }

    onClear(): void
    {
        if (this.mode !== 'add' || this.progress.busy)
        {
            return;
        }

        this.lookup = null;

        this.lookedUpMobile = '';

        this.otherServiceText = '';

        this.otherPartText = '';

        this.loading = true;

        this.scheduleFit();

        this.startNew();
    }

    onBackToList(): void
    {
        void this.router.navigate(['list'], { relativeTo:this.route.parent });
    }


    private errorText(error: unknown, fallback: string): string
    {
        const err = error as any;

        const body = err?.error;

        if (err?.status === 403)
        {
            return body?.message || body?.Message || 'You do not have permission for this action.';
        }

        if (typeof body === 'string' && body.trim())
        {
            return body.trim();
        }

        return body?.message || body?.Message || body?.title || fallback;
    }
}
