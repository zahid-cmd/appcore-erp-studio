//===============================================================
// Sales Test Rides (full page, opened from the Sales Enquiries
// list : the "Test Rides" view's Book Test Ride button, a row of
// it, or the motorcycle icon of an open enquiry → ?enquiry=<id>)
//
//   Top    : the day (week strip, previous / next week, date
//            picker, Today) and the day's counts per status
//   Left   : waiting list : open sales enquiries with no live
//            ride; "Asked" (a test ride date asked, nearest first)
//            or "All open"
//   Centre : the day board : the slots of the default "Test Ride"
//            time slot (Enquiry Setup › Time Slots), lunch shown,
//            rides in their slot, booked / capacity per slot
//   Right  : the picked enquiry (book : bike, executive, note,
//            then a slot) or the picked ride (call, status
//            buttons, move, cancel with a reason, history)
//
// Hand-written page (NO Code Synchronization), routes added by
// hand in sales-enquiries.routes.ts.
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
    TEST_RIDE_STATUSES,
    TestRideDay,
    TestRideStatus,
    TestRideWaiting,
    SalesTestRide
}
from '../../../models/sales-test-rides.model';

import { slotLabel, slotMinutes } from '../../../models/enquiry-setup.model';

import { SalesTestRidesService } from '../../../services/sales-test-rides.service';
import { SalesEnquiriesService } from '../../../services/sales-enquiries.service';


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
    appointments:SalesTestRide[];
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
    selector:'sales-test-rides-page',

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

    templateUrl:'./sales-test-rides.html',

    styleUrl:'./sales-test-rides.css'
})
export class SalesTestRidesPage
implements OnInit, AfterViewInit, OnDestroy
{
    private readonly route = inject(ActivatedRoute);

    private readonly router = inject(Router);

    private readonly appointments = inject(SalesTestRidesService);

    private readonly enquiries = inject(SalesEnquiriesService);

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

    readonly todayIso = SalesTestRidesPage.iso(new Date());

    readonly statuses = TEST_RIDE_STATUSES;

    date = this.todayIso;

    weekFrom = this.todayIso;

    week: WeekDay[] = [];

    day: TestRideDay | null = null;

    board: BoardRow[] = [];

    loading = false;

    loadFailed = false;

    // Waiting list
    waitingSearch = '';

    selectedWaiting: TestRideWaiting | null = null;

    advisorItems: Item[] = [];

    advisorId = 0;

    // The bike to ride : the enquiry's model or second model
    rideModelId = 0;

    bookNote = '';

    // The picked appointment
    selected: SalesTestRide | null = null;

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
                next:(day: TestRideDay): void =>
                {
                    this.day = day;

                    this.loading = false;

                    this.buildBoard();

                    this.buildWeek();

                    // Keep the picks when they still exist
                    if (keepSelection && this.selected)
                    {
                        this.selected = day.Rides.find(x => x.SalesTestRideId === this.selected!.SalesTestRideId) ?? (this.moving ? this.selected : null);
                    }

                    if (keepSelection && this.selectedWaiting)
                    {
                        this.selectedWaiting = day.Waiting.find(x => x.SalesEnquiryId === this.selectedWaiting!.SalesEnquiryId) ?? null;
                    }

                    this.pickWanted();

                    this.cdr.detectChanges();

                    this.scheduleFit();
                },

                error:(error: unknown): void =>
                {
                    console.error('Load Test Rides Error:', error);

                    this.loading = false;

                    this.loadFailed = true;

                    this.toast.error('Load Failed', this.errorText(error, 'The test rides could not be loaded.'));

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
            this.day.Waiting.find(x => x.SalesEnquiryId === this.wantedEnquiryId);

        if (!item)
        {
            const booked =
                this.day.Rides.find(x => x.SalesEnquiryId === this.wantedEnquiryId);

            if (booked)
            {
                this.pickAppointment(booked);

                return;
            }

            this.toast.info('Already Booked', 'This enquiry already has a live test ride, or it is not open (suspended / matured). Find it on its day.');

            return;
        }

        if (!item.TestRideDate)
        {
            this.waitingAll = true;
        }

        this.pickWaiting(item);

        if (!this.wantedDateGiven && item.TestRideDate && item.TestRideDate > this.date)
        {
            this.goTo(item.TestRideDate);
        }
    }

    refresh(): void
    {
        this.load();
    }

    // Back : to the Sales Enquiries list's Test Rides view when
    // opened from there (?from=enquiries), else to the Test Rides
    // list
    back(): void
    {
        if (this.route.snapshot.queryParamMap.get('from') === 'enquiries')
        {
            void this.router.navigate(['/enquiry-management/enquiry-profiles/sales-enquiries/list'], { queryParams:{ tab:'test-rides' } });

            return;
        }

        void this.router.navigate(['/enquiry-management/follow-ups-appointments/test-rides/list']);
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
        const date = SalesTestRidesPage.fromIso(value);

        date.setDate(date.getDate() + days);

        return SalesTestRidesPage.iso(date);
    }

    get dateValue(): Date
    {
        return SalesTestRidesPage.fromIso(this.date);
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
                const iso = SalesTestRidesPage.addDays(this.weekFrom, i);

                const date = SalesTestRidesPage.fromIso(iso);

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
        if (iso < this.weekFrom || iso > SalesTestRidesPage.addDays(this.weekFrom, 6))
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
        this.weekFrom = SalesTestRidesPage.addDays(this.weekFrom, days);

        this.goTo(this.weekFrom);
    }

    onDatePicked(date: Date): void
    {
        if (date)
        {
            this.goTo(SalesTestRidesPage.iso(date));
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
                day.Rides.filter(a => a.SlotStart === slot.Start);

            inSlot.forEach(a => used.add(a.SalesTestRideId));

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
            day.Rides.filter(a => !used.has(a.SalesTestRideId));

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

        return !(this.moving && !!this.selected && row.appointments.some(a => a.SalesTestRideId === this.selected!.SalesTestRideId));
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

    // Asked = a test ride date asked (website / form); All = every
    // open enquiry without a live ride. A search looks in all.
    waitingAll = false;

    get askedCount(): number
    {
        return (this.day?.Waiting ?? []).filter(x => !!x.TestRideDate).length;
    }

    setWaitingAll(all: boolean): void
    {
        this.waitingAll = all;
    }

    get waiting(): TestRideWaiting[]
    {
        const key = this.waitingSearch.trim().toLowerCase();

        const list =
            (this.day?.Waiting ?? []).filter(x => key || this.waitingAll || !!x.TestRideDate);

        return key
            ? list.filter(x => [x.EnquiryNo, x.EnquirerName, x.EnquirerMobile, x.ModelName, x.SecondModelName, x.TestRideSlot].join(' ').toLowerCase().includes(key))
            : list;
    }

    onWaitingSearch(event: Event): void
    {
        this.waitingSearch = (event.target as HTMLInputElement).value ?? '';
    }

    pickWaiting(item: TestRideWaiting): void
    {
        if (this.progress.busy)
        {
            return;
        }

        this.selectedWaiting =
            this.selectedWaiting?.SalesEnquiryId === item.SalesEnquiryId ? null : item;

        this.selected = null;

        this.moving = false;

        this.cancelling = false;

        this.bookNote = '';

        this.rideModelId = this.selectedWaiting?.ModelId ?? 0;

        if (this.selectedWaiting && !(this.advisorId > 0))
        {
            this.advisorId = this.myId;
        }

        this.cdr.detectChanges();
    }

    get modelItems(): Item[]
    {
        const w = this.selectedWaiting;

        if (!w)
        {
            return [];
        }

        const items: Item[] = [];

        if (w.ModelId > 0)
        {
            items.push({ label:w.ModelName || 'Model', value:w.ModelId });
        }

        if (w.SecondModelId && w.SecondModelId > 0 && w.SecondModelId !== w.ModelId)
        {
            items.push({ label:`${w.SecondModelName || 'Second model'} (second choice)`, value:w.SecondModelId });
        }

        return items;
    }

    onRideModel(value: any): void
    {
        const id = Number(value !== null && typeof value === 'object' && 'value' in value ? value.value : value);

        this.rideModelId = id > 0 ? id : 0;
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
                'Booking the Test Ride',
                `Please wait while ${w.EnquiryNo} is booked for ${when}...`,
                'Test ride booked.',
                this.appointments.book({
                    SalesEnquiryId:w.SalesEnquiryId,
                    BranchId:this.branchId,
                    RideDate:this.date,
                    SlotStart:row.start,
                    ModelId:this.rideModelId,
                    AdvisorUserId:this.advisorId,
                    Note:this.bookNote.trim(),
                    AllowOverbook:overbook
                })
            )
            .subscribe
            ({
                next:(id: number): void =>
                {
                    this.toast.success('Test Ride Booked', `${w.EnquirerName} : ${when}.`);

                    this.selectedWaiting = null;

                    this.bookNote = '';

                    this.selected = { SalesTestRideId:Number(id) } as SalesTestRide;

                    this.load();

                    this.loadHistory(Number(id));
                },

                error:(error: unknown): void =>
                    this.toast.error('Booking Failed', this.errorText(error, 'The test ride could not be booked.'))
            });
    }

    private move(row: BoardRow, overbook: boolean): void
    {
        const a = this.selected!;

        const when = `${this.dateValue.toLocaleDateString('en-GB', { day:'2-digit', month:'short' })} ${slotLabel(row.start)}`;

        this.progress
            .run<void>(
                'Moving the Test Ride',
                `Please wait while ${a.EnquiryNo} is moved to ${when}...`,
                'Test ride moved.',
                this.appointments.reschedule({
                    SalesTestRideId:a.SalesTestRideId,
                    RideDate:this.date,
                    SlotStart:row.start,
                    Note:this.moveNote.trim(),
                    AllowOverbook:overbook
                })
            )
            .subscribe
            ({
                next:(): void =>
                {
                    this.toast.success('Test Ride Moved', `${a.EnquirerName} : ${when}.`);

                    this.moving = false;

                    this.moveNote = '';

                    this.load();

                    this.loadHistory(a.SalesTestRideId);
                },

                error:(error: unknown): void =>
                    this.toast.error('Move Failed', this.errorText(error, 'The test ride could not be moved.'))
            });
    }


    //===========================================================
    // The picked appointment
    //===========================================================

    pickAppointment(item: SalesTestRide, event?: Event): void
    {
        event?.stopPropagation();

        if (this.progress.busy)
        {
            return;
        }

        if (this.moving)
        {
            this.toast.info('Moving', 'Pick a free slot for the test ride, or press Stop moving.');

            return;
        }

        this.selected = item;

        this.selectedWaiting = null;

        this.cancelling = false;

        this.cancelReason = '';

        this.loadHistory(item.SalesTestRideId);

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
        return this.isLive && this.selected!.RideDate <= this.todayIso;
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

        this.toast.info('Move the Test Ride', 'Pick a day on the strip, then a slot marked "Move here".');
    }

    stopMove(): void
    {
        this.moving = false;

        if (this.selected && this.selected.RideDate !== this.date)
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

    setStatus(status: TestRideStatus): void
    {
        const a = this.selected;

        if (!a || this.progress.busy)
        {
            return;
        }

        const reason = this.cancelReason.trim();

        if (status === 'Cancelled' && reason.length < 2)
        {
            this.toast.warning('Check the Form', 'Write why the test ride is cancelled.');

            return;
        }

        const label = this.statusOf(status).label;

        this.progress
            .run<void>(
                'Updating the Test Ride',
                `Please wait while ${a.EnquiryNo} is marked ${label}...`,
                'Test ride updated.',
                this.appointments.setStatus({ SalesTestRideId:a.SalesTestRideId, Status:status, Reason:reason })
            )
            .subscribe
            ({
                next:(): void =>
                {
                    this.toast.success('Test Ride Updated', `${a.EnquirerName} : ${label}.`);

                    this.cancelling = false;

                    this.cancelReason = '';

                    this.load();

                    this.loadHistory(a.SalesTestRideId);
                },

                error:(error: unknown): void =>
                    this.toast.error('Update Failed', this.errorText(error, 'The test ride could not be updated.'))
            });
    }

    openEnquiry(id: number): void
    {
        void this.router.navigate(['/enquiry-management/enquiry-profiles/sales-enquiries/view', id]);
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

        return SalesTestRidesPage.fromIso(value.slice(0, 10))
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
