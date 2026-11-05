//===============================================================
// Service Appointments (full page, opened from the Service
// Enquiries list : the "Appointments" pill, or the calendar icon
// of an open Service-type enquiry → ?enquiry=<id>)
//
//   Top    : the day (week strip, previous / next week, date
//            picker, Today) and the day's counts per status
//   Left   : waiting list : open Service enquiries with no live
//            appointment (asked date first)
//   Centre : the day board : the slots of the default "Service
//            Appointment" time slot (Enquiry Setup › Time Slots),
//            lunch break shown, appointments in their slot
//   Right  : the picked enquiry (book : advisor, note, then a
//            slot) or the picked appointment (call, status
//            buttons, move, cancel with a reason, history)
//
// Hand-written page (NO Code Synchronization), routes added by
// hand in service-enquiries.routes.ts.
//===============================================================

import
{
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ElementRef,
    HostListener,
    OnDestroy,
    OnInit,
    ViewChild,
    inject
}
from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { SearchDropdownComponent } from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { DatepickerComponent } from '../../../../../../shared/components/controls/datepicker/datepicker';
import { TextareaComponent } from '../../../../../../shared/components/controls/textarea/textarea';
import { OrbitLoaderComponent } from '../../../../../../shared/components/utilities/orbit-loader/orbit-loader';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { ProgressDialogService } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';
import { ProgressRunner } from '../../../../../../shared/components/utilities/progress-dialog/progress-runner';
import { AuthenticationStorageService } from '../../../../../../core/authentication/authentication-storage.service';

import
{
    APPOINTMENT_STATUSES,
    AppointmentDay,
    AppointmentStatus,
    AppointmentWaiting,
    ServiceAppointment
}
from '../../../models/service-appointments.model';

import { slotLabel, slotMinutes } from '../../../models/enquiry-setup.model';

import { ServiceAppointmentsService } from '../../../services/service-appointments.service';
import { ServiceEnquiriesService } from '../../../services/service-enquiries.service';


interface Item
{
    label:string;
    value:any;
}

// One row of the day board
interface BoardRow
{
    kind:'slot' | 'lunch' | 'other';
    start:string;
    end:string;
    label:string;
    past:boolean;
    booked:number;
    // Bookings the slot takes; full = booked reached it
    capacity:number;
    full:boolean;
    appointments:ServiceAppointment[];
}

interface WeekDay
{
    date:string;
    day:string;
    num:string;
    month:string;
    count:number;
    today:boolean;
}


@Component(
{
    selector:'service-appointments-page',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        CommandCenterComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        TextareaComponent,
        OrbitLoaderComponent,
        ToastComponent,
        ProgressDialogComponent,
        ConfirmDialogComponent
    ],

    templateUrl:'./service-appointments.html',

    styleUrl:'./service-appointments.css'
})
export class ServiceAppointmentsPage
implements OnInit, AfterViewInit, OnDestroy
{
    private readonly route = inject(ActivatedRoute);

    private readonly router = inject(Router);

    private readonly appointments = inject(ServiceAppointmentsService);

    private readonly enquiries = inject(ServiceEnquiriesService);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly auth = inject(AuthenticationStorageService);

    private readonly cdr = inject(ChangeDetectorRef);

    readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges()
        );


    //===========================================================
    // Page height : the body fills the page down to the footer;
    // each column scrolls on its own
    //===========================================================

    @ViewChild('pageBody')
    private pageBody?: ElementRef<HTMLElement>;

    private fitTimer?: number;

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

    private fitHeight(): void
    {
        const body = this.pageBody?.nativeElement;

        if (!body)
        {
            return;
        }

        const pane = body.closest('main.content');

        const bottom =
            pane
                ? Math.min(pane.getBoundingClientRect().bottom, window.innerHeight)
                : window.innerHeight - 44;

        body.style.height = `${Math.max(420, Math.floor(bottom - body.getBoundingClientRect().top - 12))}px`;
    }


    //===========================================================
    // State
    //===========================================================

    private readonly user = this.auth.getUser();

    readonly branchId = Number(this.user?.branchId ?? 0);

    readonly branchName = String(this.user?.branchName ?? '');

    private readonly myId = Number(this.user?.userProfileId ?? 0);

    readonly todayIso = ServiceAppointmentsPage.iso(new Date());

    readonly statuses = APPOINTMENT_STATUSES;

    date = this.todayIso;

    weekFrom = this.todayIso;

    week: WeekDay[] = [];

    day: AppointmentDay | null = null;

    board: BoardRow[] = [];

    loading = false;

    loadFailed = false;

    // Waiting list
    waitingSearch = '';

    selectedWaiting: AppointmentWaiting | null = null;

    advisorItems: Item[] = [];

    advisorId = 0;

    bookNote = '';

    // The picked appointment
    selected: ServiceAppointment | null = null;

    moving = false;

    cancelling = false;

    cancelReason = '';

    moveNote = '';

    history: any[] = [];

    historyLoading = false;

    // ?enquiry=<id> from the list : pick it once loaded
    private wantedEnquiryId = 0;

    private wantedHandled = false;

    private wantedDateGiven = false;


    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit(): void
    {
        this.wantedEnquiryId =
            Number(this.route.snapshot.queryParamMap.get('enquiry') ?? 0);

        // ?date=yyyy-MM-dd (from the Appointments list) : open that day
        const asked =
            this.route.snapshot.queryParamMap.get('date') ?? '';

        if (/^\d{4}-\d{2}-\d{2}$/.test(asked))
        {
            this.date = asked;

            this.weekFrom = asked;

            this.wantedDateGiven = true;
        }

        this.advisorId = this.myId;

        this.enquiries
            .getDefaults()
            .subscribe
            ({
                next:(d): void =>
                {
                    this.advisorItems = (d?.Executives ?? []).map((x: any) => ({ label:x.Name, value:x.Id }));

                    if (!this.advisorItems.some(x => x.value === this.advisorId))
                    {
                        this.advisorId = 0;
                    }

                    this.cdr.detectChanges();
                },

                error:(): void => { }
            });

        this.load();
    }


    //===========================================================
    // Load the day
    //===========================================================

    load(keepSelection: boolean = true): void
    {
        this.loading = !this.day;

        this.loadFailed = false;

        this.appointments
            .getDay(this.date, this.branchId, this.weekFrom)
            .subscribe
            ({
                next:(day: AppointmentDay): void =>
                {
                    this.day = day;

                    this.loading = false;

                    this.buildBoard();

                    this.buildWeek();

                    // Keep the picks when they still exist
                    if (keepSelection && this.selected)
                    {
                        this.selected = day.Appointments.find(x => x.ServiceAppointmentId === this.selected!.ServiceAppointmentId) ?? (this.moving ? this.selected : null);
                    }

                    if (keepSelection && this.selectedWaiting)
                    {
                        this.selectedWaiting = day.Waiting.find(x => x.ServiceEnquiryId === this.selectedWaiting!.ServiceEnquiryId) ?? null;
                    }

                    this.pickWanted();

                    this.cdr.detectChanges();

                    this.scheduleFit();
                },

                error:(error: unknown): void =>
                {
                    console.error('Load Appointments Error:', error);

                    this.loading = false;

                    this.loadFailed = true;

                    this.toast.error('Load Failed', this.errorText(error, 'The appointments could not be loaded.'));

                    this.cdr.detectChanges();

                    this.scheduleFit();
                }
            });
    }

    // The enquiry asked by the list : pick it; jump to its asked
    // date when that is still ahead
    private pickWanted(): void
    {
        if (this.wantedHandled || !this.wantedEnquiryId || !this.day)
        {
            return;
        }

        this.wantedHandled = true;

        const item =
            this.day.Waiting.find(x => x.ServiceEnquiryId === this.wantedEnquiryId);

        if (!item)
        {
            const booked =
                this.day.Appointments.find(x => x.ServiceEnquiryId === this.wantedEnquiryId);

            if (booked)
            {
                this.pickAppointment(booked);

                return;
            }

            this.toast.info('Already Booked', 'This enquiry already has an appointment, or it is not an open Service enquiry. Find it on its day.');

            return;
        }

        this.pickWaiting(item);

        if (!this.wantedDateGiven && item.PreferredDate && item.PreferredDate > this.date)
        {
            this.goTo(item.PreferredDate);
        }
    }

    refresh(): void
    {
        this.load();
    }

    // Back to the list's Appointments view
    back(): void
    {
        void this.router.navigate(['list'], { relativeTo:this.route.parent, queryParams:{ tab:'appointments' } });
    }


    //===========================================================
    // Day / week
    //===========================================================

    private static iso(date: Date): string
    {
        const pad = (n: number): string => String(n).padStart(2, '0');

        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    private static fromIso(value: string): Date
    {
        const [y, m, d] = value.split('-').map(Number);

        return new Date(y, m - 1, d);
    }

    private static addDays(value: string, days: number): string
    {
        const date = ServiceAppointmentsPage.fromIso(value);

        date.setDate(date.getDate() + days);

        return ServiceAppointmentsPage.iso(date);
    }

    get dateValue(): Date
    {
        return ServiceAppointmentsPage.fromIso(this.date);
    }

    get dateTitle(): string
    {
        return this.dateValue.toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
    }

    get isToday(): boolean
    {
        return this.date === this.todayIso;
    }

    get isPastDay(): boolean
    {
        return this.date < this.todayIso;
    }

    private buildWeek(): void
    {
        const counts = this.day?.Week ?? {};

        this.week =
            Array.from({ length:7 }, (_x, i) =>
            {
                const iso = ServiceAppointmentsPage.addDays(this.weekFrom, i);

                const date = ServiceAppointmentsPage.fromIso(iso);

                return {
                    date:iso,
                    day:date.toLocaleDateString('en-GB', { weekday:'short' }),
                    num:String(date.getDate()).padStart(2, '0'),
                    month:date.toLocaleDateString('en-GB', { month:'short' }),
                    count:Number(counts[iso] ?? 0),
                    today:iso === this.todayIso
                };
            });
    }

    goTo(iso: string): void
    {
        if (!iso || iso === this.date)
        {
            return;
        }

        this.date = iso;

        // Keep the strip when the day is on it, else start it there
        if (iso < this.weekFrom || iso > ServiceAppointmentsPage.addDays(this.weekFrom, 6))
        {
            this.weekFrom = iso;
        }

        this.cancelling = false;

        if (!this.moving)
        {
            this.selected = null;
        }

        this.load();
    }

    goToday(): void
    {
        this.weekFrom = this.todayIso;

        if (this.date === this.todayIso)
        {
            this.load();

            return;
        }

        this.goTo(this.todayIso);
    }

    shiftWeek(days: number): void
    {
        this.weekFrom = ServiceAppointmentsPage.addDays(this.weekFrom, days);

        this.goTo(this.weekFrom);
    }

    onDatePicked(date: Date): void
    {
        if (date)
        {
            this.goTo(ServiceAppointmentsPage.iso(date));
        }
    }


    //===========================================================
    // Board
    //===========================================================

    private buildBoard(): void
    {
        const day = this.day;

        if (!day)
        {
            this.board = [];

            return;
        }

        const now = new Date();

        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        const rows: BoardRow[] = [];

        const used = new Set<number>();

        const lunchStart = slotMinutes(day.BreakFrom);

        let lunchShown = !Number.isFinite(lunchStart);

        for (const slot of day.Slots)
        {
            // Lunch row before the first slot after the break
            if (!lunchShown && slotMinutes(slot.Start) >= lunchStart)
            {
                rows.push({ kind:'lunch', start:day.BreakFrom, end:day.BreakTo, label:`${slotLabel(day.BreakFrom)} - ${slotLabel(day.BreakTo)}`, past:false, booked:0, capacity:0, full:false, appointments:[] });

                lunchShown = true;
            }

            const inSlot =
                day.Appointments.filter(a => a.SlotStart === slot.Start);

            inSlot.forEach(a => used.add(a.ServiceAppointmentId));

            rows.push({
                kind:'slot',
                start:slot.Start,
                end:slot.End,
                label:slotLabel(slot.Start),
                past:this.isPastDay || (this.isToday && slotMinutes(slot.End) <= nowMinutes),
                booked:slot.Booked,
                capacity:slot.Capacity || day.Capacity || 1,
                full:slot.Full,
                appointments:inSlot
            });
        }

        // Booked under an older time slot setup
        const others =
            day.Appointments.filter(a => !used.has(a.ServiceAppointmentId));

        if (others.length)
        {
            rows.push({ kind:'other', start:'', end:'', label:'Other times', past:true, booked:others.length, capacity:0, full:false, appointments:others });
        }

        this.board = rows;
    }

    get hoursText(): string
    {
        const d = this.day;

        if (!d || !d.TimeFrom)
        {
            return '';
        }

        const lunch =
            d.BreakFrom ? ` · lunch ${slotLabel(d.BreakFrom)} - ${slotLabel(d.BreakTo)}` : '';

        return `${d.TimeSlotName} : ${slotLabel(d.TimeFrom)} - ${slotLabel(d.TimeTo)}, every ${d.IntervalMinutes} min, ${d.Capacity || 1} per slot${lunch}`;
    }

    count(status: string): number
    {
        return Number(this.day?.Counts?.[status] ?? 0);
    }

    statusOf(status: string): { label:string; color:string; icon:string }
    {
        return this.statuses.find(x => x.value === status) ?? { label:status, color:'#64748B', icon:'fas fa-circle' };
    }

    // A slot can take a booking / a move now
    get picking(): boolean
    {
        return (!!this.selectedWaiting && !this.selected) || (this.moving && !!this.selected);
    }

    pickText(row: BoardRow): string
    {
        if (this.isFullFor(row))
        {
            return 'Overbook';
        }

        return this.moving ? 'Move here' : 'Book';
    }

    // "1 / 2 booked", "2 / 2 full", "free (2)"
    slotUseText(row: BoardRow): string
    {
        if (!row.booked)
        {
            return `free · ${row.capacity}`;
        }

        return `${row.booked} / ${row.capacity} ${row.booked >= row.capacity ? 'full' : 'booked'}`;
    }

    // Full for the pick at hand (a move inside its own slot is not)
    private isFullFor(row: BoardRow): boolean
    {
        if (!row.full)
        {
            return false;
        }

        return !(this.moving && !!this.selected && row.appointments.some(a => a.ServiceAppointmentId === this.selected!.ServiceAppointmentId));
    }

    // A full slot takes a pick only while overbooking is allowed
    // (System Configurations switch)
    canPick(row: BoardRow): boolean
    {
        return this.picking && row.kind === 'slot' && !row.past && !this.progress.busy
            && (this.day?.AllowOverbook !== false || !this.isFullFor(row));
    }


    //===========================================================
    // Waiting list
    //===========================================================

    get waiting(): AppointmentWaiting[]
    {
        const key = this.waitingSearch.trim().toLowerCase();

        const list = this.day?.Waiting ?? [];

        return key
            ? list.filter(x => [x.EnquiryNo, x.EnquirerName, x.EnquirerMobile, x.ModelName, x.RequestSummary].join(' ').toLowerCase().includes(key))
            : list;
    }

    onWaitingSearch(event: Event): void
    {
        this.waitingSearch = (event.target as HTMLInputElement).value ?? '';
    }

    pickWaiting(item: AppointmentWaiting): void
    {
        if (this.progress.busy)
        {
            return;
        }

        this.selectedWaiting =
            this.selectedWaiting?.ServiceEnquiryId === item.ServiceEnquiryId ? null : item;

        this.selected = null;

        this.moving = false;

        this.cancelling = false;

        this.bookNote = '';

        if (this.selectedWaiting && !(this.advisorId > 0))
        {
            this.advisorId = this.myId;
        }

        this.cdr.detectChanges();
    }

    onAdvisor(value: any): void
    {
        const id = Number(value !== null && typeof value === 'object' && 'value' in value ? value.value : value);

        this.advisorId = id > 0 ? id : 0;
    }

    onBookNote(value: string | number): void
    {
        this.bookNote = String(value ?? '');
    }

    onMoveNote(value: string | number): void
    {
        this.moveNote = String(value ?? '');
    }

    onCancelReason(value: string | number): void
    {
        this.cancelReason = String(value ?? '');
    }


    //===========================================================
    // Book / move (a slot of the board)
    //===========================================================

    pickSlot(row: BoardRow): void
    {
        if (!this.canPick(row))
        {
            return;
        }

        if (this.isFullFor(row))
        {
            const who =
                this.moving ? this.selected?.EnquirerName : this.selectedWaiting?.EnquirerName;

            this.confirmDialog.open
            (
                'Slot Full',

                `The ${slotLabel(row.start)} slot already has ${row.booked} of ${row.capacity} bookings. Book ${who || 'this customer'} into it anyway?`,

                (): void =>
                {
                    setTimeout(() => this.bookOrMove(row, true));
                }
            );

            return;
        }

        this.bookOrMove(row, false);
    }

    private bookOrMove(row: BoardRow, overbook: boolean): void
    {
        if (this.moving && this.selected)
        {
            this.move(row, overbook);

            return;
        }

        const w = this.selectedWaiting;

        if (!w)
        {
            return;
        }

        const when = `${this.dateValue.toLocaleDateString('en-GB', { day:'2-digit', month:'short' })} ${slotLabel(row.start)}`;

        this.progress
            .run<number>(
                'Booking the Appointment',
                `Please wait while ${w.EnquiryNo} is booked for ${when}...`,
                'Appointment booked.',
                this.appointments.book({
                    ServiceEnquiryId:w.ServiceEnquiryId,
                    BranchId:this.branchId,
                    AppointmentDate:this.date,
                    SlotStart:row.start,
                    AdvisorUserId:this.advisorId,
                    Note:this.bookNote.trim(),
                    AllowOverbook:overbook
                })
            )
            .subscribe
            ({
                next:(id: number): void =>
                {
                    this.toast.success('Appointment Booked', `${w.EnquirerName} : ${when}.`);

                    this.selectedWaiting = null;

                    this.bookNote = '';

                    this.selected = { ServiceAppointmentId:Number(id) } as ServiceAppointment;

                    this.load();

                    this.loadHistory(Number(id));
                },

                error:(error: unknown): void =>
                    this.toast.error('Booking Failed', this.errorText(error, 'The appointment could not be booked.'))
            });
    }

    private move(row: BoardRow, overbook: boolean): void
    {
        const a = this.selected!;

        const when = `${this.dateValue.toLocaleDateString('en-GB', { day:'2-digit', month:'short' })} ${slotLabel(row.start)}`;

        this.progress
            .run<void>(
                'Moving the Appointment',
                `Please wait while ${a.EnquiryNo} is moved to ${when}...`,
                'Appointment moved.',
                this.appointments.reschedule({
                    ServiceAppointmentId:a.ServiceAppointmentId,
                    AppointmentDate:this.date,
                    SlotStart:row.start,
                    Note:this.moveNote.trim(),
                    AllowOverbook:overbook
                })
            )
            .subscribe
            ({
                next:(): void =>
                {
                    this.toast.success('Appointment Moved', `${a.EnquirerName} : ${when}.`);

                    this.moving = false;

                    this.moveNote = '';

                    this.load();

                    this.loadHistory(a.ServiceAppointmentId);
                },

                error:(error: unknown): void =>
                    this.toast.error('Move Failed', this.errorText(error, 'The appointment could not be moved.'))
            });
    }


    //===========================================================
    // The picked appointment
    //===========================================================

    pickAppointment(item: ServiceAppointment, event?: Event): void
    {
        event?.stopPropagation();

        if (this.progress.busy)
        {
            return;
        }

        if (this.moving)
        {
            this.toast.info('Moving', 'Pick a free slot for the appointment, or press Stop moving.');

            return;
        }

        this.selected = item;

        this.selectedWaiting = null;

        this.cancelling = false;

        this.cancelReason = '';

        this.loadHistory(item.ServiceAppointmentId);

        this.cdr.detectChanges();
    }

    closeDetail(): void
    {
        this.selected = null;

        this.selectedWaiting = null;

        this.moving = false;

        this.cancelling = false;

        this.cdr.detectChanges();
    }

    private loadHistory(id: number): void
    {
        this.historyLoading = true;

        this.history = [];

        this.appointments
            .getHistory(id)
            .subscribe
            ({
                next:(rows: any[]): void =>
                {
                    this.history = rows ?? [];

                    this.historyLoading = false;

                    this.cdr.detectChanges();
                },

                error:(): void =>
                {
                    this.historyLoading = false;

                    this.cdr.detectChanges();
                }
            });
    }

    pickHistory(row: any, name: string): string
    {
        return String(row?.[name] ?? row?.[name.charAt(0).toLowerCase() + name.slice(1)] ?? '');
    }

    get isLive(): boolean
    {
        return !!this.selected && (this.selected.Status === 'Booked' || this.selected.Status === 'Confirmed');
    }

    get canArrive(): boolean
    {
        return this.isLive && this.selected!.AppointmentDate <= this.todayIso;
    }

    get callLink(): string
    {
        const mobile = this.selected?.EnquirerMobile ?? this.selectedWaiting?.EnquirerMobile ?? '';

        return mobile ? `tel:${mobile}` : '';
    }

    startMove(): void
    {
        if (!this.isLive)
        {
            return;
        }

        this.moving = true;

        this.cancelling = false;

        this.moveNote = '';

        this.toast.info('Move the Appointment', 'Pick a day on the strip, then a slot marked "Move here".');
    }

    stopMove(): void
    {
        this.moving = false;

        if (this.selected && this.selected.AppointmentDate !== this.date)
        {
            this.selected = null;
        }

        this.cdr.detectChanges();
    }

    startCancel(): void
    {
        this.cancelling = !this.cancelling;

        this.cancelReason = '';
    }

    setStatus(status: AppointmentStatus): void
    {
        const a = this.selected;

        if (!a || this.progress.busy)
        {
            return;
        }

        const reason = this.cancelReason.trim();

        if (status === 'Cancelled' && reason.length < 2)
        {
            this.toast.warning('Check the Form', 'Write why the appointment is cancelled.');

            return;
        }

        const label = this.statusOf(status).label;

        this.progress
            .run<void>(
                'Updating the Appointment',
                `Please wait while ${a.EnquiryNo} is marked ${label}...`,
                'Appointment updated.',
                this.appointments.setStatus({ ServiceAppointmentId:a.ServiceAppointmentId, Status:status, Reason:reason })
            )
            .subscribe
            ({
                next:(): void =>
                {
                    this.toast.success('Appointment Updated', `${a.EnquirerName} : ${label}.`);

                    this.cancelling = false;

                    this.cancelReason = '';

                    this.load();

                    this.loadHistory(a.ServiceAppointmentId);
                },

                error:(error: unknown): void =>
                    this.toast.error('Update Failed', this.errorText(error, 'The appointment could not be updated.'))
            });
    }

    openEnquiry(id: number): void
    {
        void this.router.navigate(['view', id], { relativeTo:this.route.parent });
    }


    //===========================================================
    // Texts
    //===========================================================

    slotText(start: string, end: string): string
    {
        return `${slotLabel(start)} - ${slotLabel(end)}`;
    }

    dateText(value: string | null): string
    {
        if (!value)
        {
            return '—';
        }

        return ServiceAppointmentsPage.fromIso(value.slice(0, 10))
            .toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
    }

    dateTimeText(value: string): string
    {
        const date = new Date(value);

        return isNaN(date.getTime())
            ? ''
            : date.toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
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
