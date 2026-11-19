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
    forkJoin
}
from 'rxjs';

import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { StepTabsComponent, StepTabsStep } from '../../../../shared/components/layout/step-tabs/step-tabs';
import { WorkspaceArtComponent } from '../../../../shared/components/layout/workspace-art/workspace-art';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { DatepickerComponent } from '../../../../shared/components/controls/datepicker/datepicker';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { ProgressDialogComponent } from '../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../human-resource-manangement/services/hr-progress.service';
import { hrToDate, hrToText } from '../../../human-resource-manangement/services/hr-date';
import { WsService } from '../../shared/ws.service';

import
{
    JobCard,
    JobCardLookups,
    wsDay,
    wsMinutes,
    wsStatusColor
}
from '../../shared/ws.models';


//===============================================================
// Model
//===============================================================

interface Option
{
    label: string;
    value: any;
    // the serial token of the job : the big figure of its row
    token?: string;
}

// A service picked for the job : its standard time (minutes)
interface PickedService
{
    key: string;
    kind: string;
    id: number;
    name: string;
    minutes: number;
}


//===============================================================
// Job Card Assignment (stage 2 of a job card, owner 2026-11-18)
//
// The supervisor picks the services of the job (their standard
// times add up : the Standard Time, which can still be changed),
// gives the Allowed Time, the Delivery Date, and the people : the
// service engineer, the foreman / supervisor, one technician; a
// bay when wanted. The Expected Delivery is worked out : the
// delivery date, the time of the assignment + the allowed time.
//
// Opened from the Job Cards list (Assign on an Open or an Assigned
// job) and from the Job Card Assignment desk. After saving : back
// to the list, the job is Assigned.
//===============================================================

@Component(
{
    selector:'job-card-assign',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        StepTabsComponent,
        WorkspaceArtComponent,
        SearchDropdownComponent,
        TextboxComponent,
        DatepickerComponent,
        CommandCenterComponent,
        ToastComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./job-card-assign.html',
    styleUrl:'./job-card-assign.css'
})
export class JobCardAssignPage
implements OnInit
{
    private readonly ws = inject(WsService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly progress = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    readonly config:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:false,
        reserveFooterSpace:false,
        bodyScrollable:true,
        fixedHeight:true
    };

    // the toolbar : the one step of the page
    readonly steps:
        StepTabsStep[] =
    [
        { id:'assign', label:'Job Assignment' },
        { id:'observations', label:'Observations' }
    ];

    tab =
        'assign';

    // the whole card has come (the list knows no observations)
    cardWhole =
        false;

    get observationRows(): { Observation: string; Note: string }[]
    {
        return (this.card?.Observations ?? []).map(x => ({ Observation:x.Observation ?? '', Note:x.Note ?? '' }));
    }

    loading =
        true;

    card:
        JobCard | null = null;

    lookups:
        JobCardLookups | null = null;

    // The time the page was opened : the assignment starts then
    private readonly startedAt =
        new Date();

    //-----------------------------------------------------------
    // Services and time
    //-----------------------------------------------------------

    services:
        PickedService[] = [];

    serviceItems:
        Option[] = [];

    servicePick:
        string | null = null;

    // typed : "90", "1:30", "1h 30m", "1 30"
    standardText =
        '';

    allowedText =
        '';

    // the allowed time follows the standard time until it is typed
    private allowedTyped =
        false;

    // the standard time follows the services until it is typed
    private standardTyped =
        false;

    // yyyy-MM-dd
    deliveryDate =
        '';

    //-----------------------------------------------------------
    // People
    //-----------------------------------------------------------

    employeeItems:
        Option[] = [];

    technicianItems:
        Option[] = [];

    bayItems:
        Option[] = [];

    engineerId:
        number | null = null;

    supervisorId:
        number | null = null;

    technicianId:
        number | null = null;

    bayId:
        number | null = null;

    note =
        '';

    //-----------------------------------------------------------
    // Load
    //-----------------------------------------------------------

    // The page opens with a job (from a list) or without one (the
    // Job Assignment button) : the job is then picked here, from the
    // ones waiting (Pending) and the ones assigned already
    private routeId =
        '';

    jobItems:
        Option[] = [];

    jobPick:
        string | null = null;

    ngOnInit():
        void
    {
        this.routeId = this.route.snapshot.paramMap.get('id') ?? '';

        this.deliveryDate = hrToText(new Date());

        // The jobs : they come quickly, the page does not wait for
        // the lists (employees, bays ...) to show them
        this.ws.getJobCards()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:cards =>
                {
                    this.heads =
                        // Only the jobs still waiting. An assigned job is
                        // not picked here : it is changed by the Edit
                        // button of the list (owner 2026-11-18)
                        (cards ?? []).filter(x => x.Status === 'Open' || (x.Status === 'Assigned' && x.PublicId === this.routeId));

                    this.jobItems =
                        this.heads.map(x => ({
                            label:[x.JobCardNo, x.CustomerName, jobToken(x), x.Status === 'Open' ? 'Pending' : x.Status].filter(v => !!v).join('   -   '),
                            value:x.PublicId,
                            token:jobToken(x)
                        }));

                    this.jobsLoading = false;

                    if (this.routeId)
                    {
                        this.onJob(this.routeId);
                    }

                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.jobsLoading = false;
                    this.loadFailed(error);
                }
            });

        this.ws.getJobCardLookups()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:lookups =>
                {
                    this.lookups = lookups;
                    this.loading = false;

                    // a job picked before the lists came
                    if (this.card)
                    {
                        this.fill();
                    }
                    else
                    {
                        this.deliveryDate = (lookups.Today ?? '').substring(0, 10) || this.deliveryDate;
                    }

                    this.cdr.detectChanges();
                },
                error:error => this.loadFailed(error)
            });
    }

    // The jobs of the list (their heads : enough to show the job at
    // once, before its whole card comes)
    private heads:
        JobCard[] = [];

    jobsLoading =
        true;

    private loadFailed(error: any):
        void
    {
        this.loading = false;
        this.toast.error('Assignment', error?.error?.message ?? 'The job cards could not be loaded. (Was ServiceOperations_JobCard_Assignment.sql run and the API restarted ?)');
        this.cdr.detectChanges();
    }

    // A job is picked : it comes onto the page
    onJob(value: any):
        void
    {
        const id = String(value ?? '');

        if (!id)
        {
            return;
        }

        this.jobPick = id;

        // at once : what the list knows of the job
        const head = this.heads.find(x => x.PublicId === id);

        this.cardWhole = false;

        if (head)
        {
            this.card = head;
            this.note = '';
            this.fill();
            this.cdr.detectChanges();
        }

        // then the whole card (its observations)
        this.ws.getJobCard(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:card =>
                {
                    if (this.jobPick !== id)
                    {
                        return;
                    }

                    this.card = card;
                    this.cardWhole = true;

                    if (!head)
                    {
                        this.note = '';
                        this.fill();
                    }

                    this.cdr.detectChanges();
                },
                error:error => this.loadFailed(error)
            });
    }

    private fill():
        void
    {
        if (!this.card || !this.lookups)
        {
            return;
        }

        const card = this.card;
        const lookups = this.lookups;

        // who is busy : not counting this job itself
        const busyBay = (id: number) =>
        {
            const no = lookups.BusyBays?.[id];

            return no && no !== card.JobCardNo ? no : '';
        };

        const busyTechnician = (id: number) =>
        {
            const no = lookups.BusyTechnicians?.[id];

            return no && no !== card.JobCardNo ? no : '';
        };

        this.employeeItems =
            (lookups.Employees ?? []).map(x => ({ label:x.Name, value:x.Id }));

        this.technicianItems =
            (lookups.Employees ?? []).map(x => ({ label:busyTechnician(x.Id) ? `${x.Name}  -  has ${busyTechnician(x.Id)} : will wait` : x.Name, value:x.Id }));

        this.bayItems =
            (lookups.Bays ?? [])
                .filter(x => !x.BranchId || x.BranchId === card.BranchId)
                .map(x => ({ label:busyBay(x.Id) ? `${x.Name}  -  busy : ${busyBay(x.Id)}` : `${x.Name}  -  free`, value:x.Id }));

        // the services the card has already (an assignment done again)
        this.services =
            (card.Services ?? [])
                .filter(x => x.ItemId != null && x.ItemKind !== 'Other')
                .map(x => ({
                    key:`${x.ItemKind}|${x.ItemId}`,
                    kind:x.ItemKind,
                    id:Number(x.ItemId),
                    name:x.ItemName,
                    minutes:this.minutesOf(x.ItemKind, Number(x.ItemId))
                }));

        this.buildServiceItems();

        this.engineerId = card.ServiceEngineerEmployeeId ?? null;
        this.supervisorId = card.SupervisorEmployeeId ?? null;
        this.technicianId = card.TechnicianEmployeeId ?? null;
        this.bayId = card.WorkshopBayId ?? null;

        const standard = Number(card.StandardMinutes) || 0;
        const allowed = Number(card.AllowedMinutes) || 0;

        this.standardTyped = standard > 0;
        this.allowedTyped = allowed > 0;
        this.standardText = standard > 0 ? wsMinutes(standard) : this.sumText;
        this.allowedText = allowed > 0 ? wsMinutes(allowed) : this.standardText;

        // the delivery date : the one given before, else today
        const promised = card.PromisedAt ? new Date(card.PromisedAt) : null;

        this.deliveryDate =
            allowed > 0 && promised && !isNaN(promised.getTime())
                ? hrToText(promised)
                : (lookups.Today ?? '').substring(0, 10) || hrToText(new Date());
    }

    private minutesOf(kind: string, id: number):
        number
    {
        return (this.lookups?.ServiceMinutes ?? []).find(x => x.Kind === kind && x.Id === id)?.Minutes ?? 0;
    }

    // The services of the catalogue : the ones of every brand and of
    // the brand of the bike, not picked yet
    private buildServiceItems():
        void
    {
        const brand = this.card?.BrandManagementId ?? null;
        const picked = new Set(this.services.map(x => x.key));

        this.serviceItems =
            (this.lookups?.ServiceItems ?? [])
                .filter(x => x.Kind !== 'Membership')
                .filter(x => !x.BrandManagementId || !brand || x.BrandManagementId === brand)
                .filter(x => !picked.has(`${x.Kind}|${x.Id}`))
                .map(x =>
                {
                    const minutes = this.minutesOf(x.Kind, x.Id);

                    return {
                        label:`${x.Name}${minutes > 0 ? '  -  ' + wsMinutes(minutes) : ''}`,
                        value:`${x.Kind}|${x.Id}`
                    };
                });
    }

    //-----------------------------------------------------------
    // Header and panel
    //-----------------------------------------------------------

    get canAssign(): boolean
    {
        return !!this.card?.CanAssign && (this.lookups?.Access?.CanAssign ?? false);
    }

    get again(): boolean
    {
        return !!this.card && this.card.Status !== 'Open';
    }

    get statusText(): string
    {
        return !this.card ? '' : this.card.Status === 'Open' ? 'Pending' : this.card.Status;
    }

    get statusColor(): string
    {
        return wsStatusColor(this.card?.Status ?? 'Open');
    }

    get branchName(): string
    {
        const centers = this.lookups?.Branches ?? [];

        return this.card
            ? centers.find(x => x.Id === this.card?.BranchId)?.Name ?? this.card.BranchName ?? ''
            : centers.length === 1 ? centers[0].Name : '';
    }

    get dateText(): string
    {
        return this.card ? wsDay(this.card.JobDate) : '';
    }

    get bikeText(): string
    {
        const card = this.card;

        return !card
            ? ''
            : [[card.BrandName, card.ModelName].filter(x => !!x).join(' '), card.ColorName].filter(x => !!x).join(' - ');
    }

    get bikeNoText(): string
    {
        return this.card?.RegistrationNo || this.card?.ChassisNo || this.card?.EngineNo || '';
    }

    // 1118001 : "1118" and "001"
    private get token(): string
    {
        const serial = (this.card?.WelcomeTokenNo ?? '').replace(/^W-/, '');
        const date = (this.card?.JobDate ?? '').substring(0, 10);

        return serial && date.length === 10 ? date.substring(5, 7) + date.substring(8, 10) + serial : serial;
    }

    get tokenPrefix(): string
    {
        return /^[0-9]{7,}$/.test(this.token) ? this.token.substring(0, 4) : '';
    }

    get tokenSerial(): string
    {
        return /^[0-9]{7,}$/.test(this.token) ? this.token.substring(4) : this.token || '-';
    }

    get observations(): string[]
    {
        return (this.card?.Observations ?? []).map(x => x.Note ? `${x.Observation} (${x.Note})` : x.Observation);
    }

    //-----------------------------------------------------------
    // Services
    //-----------------------------------------------------------

    private get sumMinutes(): number
    {
        return this.services.reduce((sum, x) => sum + x.minutes, 0);
    }

    private get sumText(): string
    {
        return this.sumMinutes > 0 ? wsMinutes(this.sumMinutes) : '';
    }

    get sumNote(): string
    {
        return this.services.length === 0
            ? 'No service picked'
            : `${this.services.length} service${this.services.length === 1 ? '' : 's'} : ${wsMinutes(this.sumMinutes)}`;
    }

    minutesText(minutes: number):
        string
    {
        return minutes > 0 ? wsMinutes(minutes) : 'no standard time';
    }

    onService(value: any):
        void
    {
        const item =
            (this.lookups?.ServiceItems ?? []).find(x => `${x.Kind}|${x.Id}` === value);

        if (item && !this.services.some(x => x.key === value))
        {
            this.services =
                [...this.services, { key:value, kind:item.Kind, id:item.Id, name:item.Name, minutes:this.minutesOf(item.Kind, item.Id) }];

            this.afterServices();
        }

        this.servicePick = null;
        this.cdr.detectChanges();
    }

    removeService(key: string):
        void
    {
        this.services = this.services.filter(x => x.key !== key);
        this.afterServices();
        this.cdr.detectChanges();
    }

    // The standard time follows the services (and the allowed time
    // the standard time) as long as they were not typed
    private afterServices():
        void
    {
        this.buildServiceItems();

        if (!this.standardTyped)
        {
            this.standardText = this.sumText;
        }

        if (!this.allowedTyped)
        {
            this.allowedText = this.standardText;
        }
    }

    //-----------------------------------------------------------
    // Time
    //-----------------------------------------------------------

    onStandard(value: any):
        void
    {
        this.standardText = String(value ?? '');
        this.standardTyped = this.standardText.trim().length > 0;

        if (!this.standardTyped)
        {
            this.standardText = this.sumText;
        }

        if (!this.allowedTyped)
        {
            this.allowedText = this.standardText;
        }

        this.cdr.detectChanges();
    }

    onAllowed(value: any):
        void
    {
        this.allowedText = String(value ?? '');
        this.allowedTyped = this.allowedText.trim().length > 0;
        this.cdr.detectChanges();
    }

    get standardMinutes(): number | null
    {
        return parseMinutes(this.standardText);
    }

    get allowedMinutes(): number | null
    {
        return parseMinutes(this.allowedText);
    }

    // What the typed time is taken as
    timeNote(text: string, minutes: number | null):
        string
    {
        return !text.trim() ? '' : minutes == null ? 'not a time : type 90, 1:30 or 1h 30m' : `= ${wsMinutes(minutes)}`;
    }

    asDate(text: string):
        Date | null
    {
        return hrToDate(text);
    }

    onDeliveryDate(date: any):
        void
    {
        this.deliveryDate = date ? hrToText(date) : '';
        this.cdr.detectChanges();
    }

    // The delivery date, the time of the assignment + the allowed time
    get expectedAt(): Date | null
    {
        const day = hrToDate(this.deliveryDate);
        const allowed = this.allowedMinutes;

        if (!day || !allowed)
        {
            return null;
        }

        const at =
            new Date(day.getFullYear(), day.getMonth(), day.getDate(), this.startedAt.getHours(), this.startedAt.getMinutes());

        at.setMinutes(at.getMinutes() + allowed);

        return at;
    }

    get expectedText(): string
    {
        const at = this.expectedAt;

        if (!at)
        {
            return '';
        }

        const hours = at.getHours();
        const clock = `${String(hours % 12 || 12).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;

        return `${wsDay(hrToText(at))}  ${clock}`;
    }

    //-----------------------------------------------------------
    // People
    //-----------------------------------------------------------

    onPick(field: 'engineer' | 'supervisor' | 'technician' | 'bay', value: any):
        void
    {
        const id = Number(value) || null;

        if (field === 'engineer')
        {
            this.engineerId = id;
        }
        else if (field === 'supervisor')
        {
            this.supervisorId = id;
        }
        else if (field === 'technician')
        {
            this.technicianId = id;
            this.warnBusy(id, this.lookups?.BusyTechnicians, 'This technician');
        }
        else
        {
            this.bayId = id;
            this.warnBusy(id, this.lookups?.BusyBays, 'This bay');
        }

        this.cdr.detectChanges();
    }

    // Busy never blocks (owner 2026-11-19) : a technician takes
    // several jobs - the later ones wait for the one in hand
    private warnBusy(id: number | null, busy: { [id: number]: string } | undefined, who: string):
        void
    {
        const no = id ? busy?.[id] : '';

        if (no && no !== this.card?.JobCardNo)
        {
            this.toast.info('Waiting', `${who} has ${no} now : this job will wait after it.`);
        }
    }

    onNote(value: any):
        void
    {
        this.note = String(value ?? '');
    }

    //-----------------------------------------------------------
    // Save / back
    //-----------------------------------------------------------

    save():
        void
    {
        if (!this.card || !this.canAssign)
        {
            return;
        }

        const standard = this.standardText.trim() ? this.standardMinutes : 0;
        const allowed = this.allowedMinutes;
        const expected = this.expectedAt;

        if (standard == null)
        {
            this.toast.error('Assignment', 'The standard time is not a time : type 90, 1:30 or 1h 30m.');
            return;
        }

        if (!allowed)
        {
            this.toast.error('Assignment', 'Give the allowed time : type 90, 1:30 or 1h 30m.');
            return;
        }

        if (!this.deliveryDate || !expected)
        {
            this.toast.error('Assignment', 'Give the delivery date.');
            return;
        }

        if (this.deliveryDate < (this.lookups?.Today ?? '').substring(0, 10))
        {
            this.toast.error('Assignment', 'The delivery date cannot be before today.');
            return;
        }

        if (!this.engineerId)
        {
            this.toast.error('Assignment', 'Pick the service engineer.');
            return;
        }

        if (!this.technicianId)
        {
            this.toast.error('Assignment', 'Pick the technician.');
            return;
        }

        this.progress.show('Saving', 'Assigning the job card...');

        this.ws
            .assignJobCardSimple(
                this.card.PublicId,
                {
                    Simple:true,
                    ServiceEngineerEmployeeId:this.engineerId ?? 0,
                    SupervisorEmployeeId:this.supervisorId,
                    TechnicianEmployeeId:this.technicianId ?? 0,
                    WorkshopBayId:this.bayId,
                    StandardMinutes:standard,
                    AllowedMinutes:allowed,
                    ExpectedAt:expected.toISOString(),
                    // the services of the card stay as they are
                    Services:null,
                    Note:this.note.trim()
                })
            .subscribe(
            {
                next:card =>
                {
                    this.progress.finish(() =>
                    {
                        this.toast.success('Assignment', `${card.JobCardNo} is assigned to ${card.TechnicianName || 'the technician'}.`);
                        this.back();
                    });
                },
                error:error =>
                {
                    this.progress.fail();
                    this.toast.error('Assignment', error?.error?.message ?? 'The job card could not be assigned.');
                    this.cdr.detectChanges();
                }
            });
    }

    back():
        void
    {
        void this.router.navigate([this.routeId ? '../../list' : '../list'], { relativeTo:this.route });
    }
}

// 1118001 : the month and the day of the job, then its serial
function jobToken(card: JobCard): string
{
    const serial = (card.WelcomeTokenNo ?? '').replace(/^W-/, '');
    const date = (card.JobDate ?? '').substring(0, 10);

    return serial && date.length === 10 ? date.substring(5, 7) + date.substring(8, 10) + serial : serial;
}


//===============================================================
// A typed time, in minutes : "90" (minutes), "1:30" / "1 30" /
// "1h 30m" / "1 h 30 m" (hours and minutes), "2h", "45m". null :
// not a time.
//===============================================================

function parseMinutes(text: string): number | null
{
    const value = (text ?? '').trim().toLowerCase();

    let match = /^([0-9]{1,5})$/.exec(value);

    if (match)
    {
        return Number(match[1]);
    }

    match = /^([0-9]{1,3})\s*(?::|\s)\s*([0-9]{1,2})$/.exec(value);

    if (match && Number(match[2]) < 60)
    {
        return Number(match[1]) * 60 + Number(match[2]);
    }

    match = /^([0-9]{1,3})\s*h(?:ours?|rs?)?(?:\s*([0-9]{1,2})\s*(?:m(?:in(?:utes?)?)?)?)?$/.exec(value);

    if (match && Number(match[2] ?? 0) < 60)
    {
        return Number(match[1]) * 60 + Number(match[2] ?? 0);
    }

    match = /^([0-9]{1,5})\s*m(?:in(?:utes?)?)?$/.exec(value);

    return match ? Number(match[1]) : null;
}
