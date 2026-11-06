//===============================================================
// Test Rides : form (Follow-ups & Appointments)
//
//   Add  : an open sales enquiry with no live ride, the bike (its
//          model or second model), the date, a slot of the default
//          Test Ride time slot (free places shown), the sales
//          executive and a note → the ride is Booked (same rules
//          as the board).
//   Edit : live (Booked / Confirmed) → a new date / slot moves it;
//          Status Confirmed / Ridden / No-show / Cancelled
//          (reason); bike; executive; note. Closed → executive and
//          note.
//   View : read only.
//
// A full slot is booked only after a warning, when switch 0005
// allows overbooking.
//
// HAND-WRITTEN over the Code Sync baseline (2026-11-06). Never
// run Code Synchronization or its rollback again for this
// submenu.
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    inject
}
from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { FormGridComponent } from '../../../../../../shared/components/layout/form-grid/form-grid';
import { FormSectionComponent } from '../../../../../../shared/components/layout/form-section/form-section';
import { ControlTabsComponent, ControlTab } from '../../../../../../shared/components/controls/control-tabs/control-tabs';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { TextboxComponent } from '../../../../../../shared/components/controls/textbox/textbox';
import { TextareaComponent } from '../../../../../../shared/components/controls/textarea/textarea';
import { DropdownComponent } from '../../../../../../shared/components/controls/dropdown/dropdown';
import { SearchDropdownComponent } from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { DatepickerComponent } from '../../../../../../shared/components/controls/datepicker/datepicker';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { ProgressDialogService } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';
import { ProgressRunner } from '../../../../../../shared/components/utilities/progress-dialog/progress-runner';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { AuthenticationStorageService } from '../../../../../../core/authentication/authentication-storage.service';

import
{
    FollowUpSlot,
    TEST_RIDE_STATUSES,
    TestRideDefaults,
    TestRideRow,
    TestRideWaiting
}
from '../../../models/test-rides.model';

import { TestRidesService } from '../../../services/test-rides.service';

import
{
    dateLabel,
    slotLabel,
    toIso
}
from '../../../services/service-appointments.service';


interface Item
{
    label:string;
    value:any;
    color?:string;
}


@Component(
{
    selector:'test-rides-form',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        FormGridComponent,
        FormSectionComponent,
        ControlTabsComponent,
        CommandCenterComponent,
        TextboxComponent,
        TextareaComponent,
        DropdownComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        ToastComponent
    ],
    templateUrl:'./test-rides-form.html',
    styleUrl:'./test-rides-form.css'
})
export class TestRidesForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependencies
    //===========================================================

    private readonly service = inject(TestRidesService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly toast = inject(ToastService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly auth = inject(AuthenticationStorageService);

    readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges());


    //===========================================================
    // Mode
    //===========================================================

    mode: 'add' | 'edit' | 'view' = 'add';

    // PublicId from the link (edit / view)
    private publicId = '';

    get isAddMode(): boolean { return this.mode === 'add'; }

    get isEditMode(): boolean { return this.mode === 'edit'; }

    get isViewMode(): boolean { return this.mode === 'view'; }

    get saveButtonText(): string { return this.isEditMode ? 'Update' : 'Save'; }

    tabs: ControlTab[] = [];

    selectedTab = 'test-ride';


    //===========================================================
    // State
    //===========================================================

    private readonly user = this.auth.getUser();

    private readonly myId = Number(this.user?.userProfileId ?? 0);

    readonly branchId = Number(this.user?.branchId ?? 0);

    branchName = String(this.user?.branchName ?? '');

    readonly today = TestRidesForm.startOfDay(new Date());

    // The saved test ride (edit / view)
    record: TestRideRow | null = null;

    defaults: TestRideDefaults | null = null;

    loading = false;

    loadingSlots = false;

    private dirty = false;

    private defaultsSubscription?: Subscription;

    // The form
    enquiryId = 0;

    dateValue: Date = this.today;

    date = toIso(this.today);

    slotStart = '';

    advisorId = 0;

    status = 'Booked';

    reason = '';

    note = '';

    // The picked enquiry (Add) / the record's enquiry
    enquiryNo = '';

    customerText = '';

    mobileText = '';

    // The bike to ride (the enquiry's model or its second model)
    modelId = 0;

    interestText = '';

    enquiryNote = '';

    // Dropdowns (rebuilt when their data changes)
    enquiryItems: Item[] = [];

    slotItems: Item[] = [];

    advisorItems: Item[] = [];

    modelItems: Item[] = [];

    statusItems: Item[] = [];

    slotHint = '';

    private waiting: TestRideWaiting[] = [];

    private slots: FollowUpSlot[] = [];


    //===========================================================
    // Life cycle
    //===========================================================

    ngOnInit(): void
    {
        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/') ? 'view' : url.includes('/edit/') ? 'edit' : 'add';

        this.publicId =
            String(this.route.snapshot.paramMap.get('id') ?? '').trim();

        const title =
            this.isAddMode ? 'Add Test Ride' : this.isEditMode ? 'Update Test Ride' : 'View Test Ride';

        this.tabs = [{ id:'test-ride', label:title }];

        if (this.isAddMode)
        {
            this.advisorId = this.myId;

            this.buildStatusItems();

            this.loadDefaults();

            return;
        }

        this.loadRecord();
    }


    ngOnDestroy(): void
    {
        this.defaultsSubscription?.unsubscribe();
    }


    private static startOfDay(date: Date): Date
    {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }


    //===========================================================
    // Load the test ride (edit / view)
    //===========================================================

    private loadRecord(): void
    {
        this.loading = true;

        this.service
            .getByPublicId(this.publicId)
            .subscribe
            ({
                next:(row: TestRideRow): void =>
                {
                    this.record = row;

                    this.enquiryId = row.SalesEnquiryId;

                    this.date = row.RideDate;

                    this.dateValue = this.parseIso(row.RideDate);

                    this.slotStart = row.SlotStart;

                    this.advisorId = row.AdvisorUserId;

                    this.status = row.Status;

                    this.reason = row.CancelReason;

                    this.note = row.Note;

                    this.branchName = row.BranchName || this.branchName;

                    this.enquiryNo = row.EnquiryNo;

                    this.customerText = row.EnquirerName;

                    this.mobileText = row.EnquirerMobile;

                    this.modelId = row.ModelId ?? 0;

                    this.modelItems = this.rideModels(row.ModelId, row.ModelName, row.EnquiryModelName, row.SecondModelName);

                    this.interestText = row.InterestLevelName;

                    this.enquiryNote = row.EnquiryStatusName ? `Enquiry status : ${row.EnquiryStatusName}` : '';

                    this.loading = false;

                    this.buildStatusItems();

                    this.loadDefaults();
                },

                error:(error: unknown): void =>
                {
                    this.loading = false;

                    this.toast.error('Load Failed', this.errorText(error, 'The test ride could not be loaded.'));

                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Slots, waiting enquiries and sales executives of the date
    //===========================================================

    private loadDefaults(): void
    {
        this.defaultsSubscription?.unsubscribe();

        this.loadingSlots = true;

        const branch =
            this.record?.BranchId || this.branchId;

        this.defaultsSubscription =
            this.service
                .getDefaults(this.date, branch)
                .subscribe
                ({
                    next:(d: TestRideDefaults): void =>
                    {
                        this.defaults = d;

                        this.waiting = d.Waiting;

                        this.slots = d.Slots;

                        this.buildEnquiryItems();

                        this.buildSlotItems();

                        this.buildAdvisorItems(d);

                        this.loadingSlots = false;

                        this.cdr.detectChanges();
                    },

                    error:(error: unknown): void =>
                    {
                        this.loadingSlots = false;

                        this.toast.error('Slots', this.errorText(error, 'The slots of the day could not be loaded.'));

                        this.cdr.detectChanges();
                    }
                });
    }


    private buildEnquiryItems(): void
    {
        if (!this.isAddMode)
        {
            return;
        }

        this.enquiryItems =
            this.waiting.map(
                w =>
                ({
                    label:[w.EnquiryNo, w.EnquirerName, w.EnquirerMobile, w.ModelName].filter(x => !!x).join(' · ')
                        + (w.TestRideDate ? ` · asked ${dateLabel(w.TestRideDate, false)}` : ''),
                    value:w.SalesEnquiryId
                }));

        // The picked enquiry went (booked meanwhile)
        if (this.enquiryId > 0 && !this.waiting.some(w => w.SalesEnquiryId === this.enquiryId))
        {
            this.setEnquiry(0);
        }
    }


    private buildSlotItems(): void
    {
        const now = new Date();

        const isToday = this.date === toIso(now);

        const nowHm =
            `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const own =
            this.record && this.record.RideDate === this.date && this.record.IsLive
                ? this.record.SlotStart
                : '';

        this.slotItems =
            this.slots
                .filter(s => !isToday || s.End > nowHm || s.Start === own)
                .map(
                    s =>
                    {
                        // Its own place is not "taken" when it stays
                        const booked = s.Start === own ? Math.max(0, s.Booked - 1) : s.Booked;

                        const free = s.Capacity - booked;

                        const state =
                            s.Start === own
                                ? 'current'
                                : free > 0
                                    ? `${free} of ${s.Capacity} free`
                                    : `full (${booked} of ${s.Capacity})`;

                        return {
                            label:`${slotLabel(s.Start)} - ${slotLabel(s.End)} · ${state}`,
                            value:s.Start,
                            color:s.Start === own ? '#2563EB' : free > 0 ? '#16A34A' : '#DC2626'
                        };
                    });

        // A closed ride keeps its slot (read only)
        if (this.record && !this.record.IsLive && !this.slotItems.some(x => x.value === this.record!.SlotStart))
        {
            this.slotItems =
            [
                { label:this.record.SlotText, value:this.record.SlotStart, color:'#64748B' },
                ...this.slotItems
            ];
        }

        if (this.slotStart && !this.slotItems.some(x => x.value === this.slotStart))
        {
            this.slotStart = '';
        }

        const d = this.defaults;

        this.slotHint =
            d?.Message
                ? d.Message
                : this.slotItems.length === 0
                    ? 'No slot left on this date.'
                    : d?.TimeSlotName
                        ? `${d.TimeSlotName} : ${d.Capacity} per slot${d.AllowOverbook ? ', a full slot can be overbooked after a warning' : ''}.`
                        : '';
    }


    private buildAdvisorItems(d: TestRideDefaults): void
    {
        this.advisorItems =
            d.Advisors.map(a => ({ label:a.Name, value:a.Id }));

        // The saved executive may not be one any more
        if (this.record && this.record.AdvisorUserId > 0 && !this.advisorItems.some(x => x.value === this.record!.AdvisorUserId))
        {
            this.advisorItems =
            [
                { label:this.record.AdvisorName || `User ${this.record.AdvisorUserId}`, value:this.record.AdvisorUserId },
                ...this.advisorItems
            ];
        }

        if (this.isAddMode && this.advisorId > 0 && !this.advisorItems.some(x => x.value === this.advisorId))
        {
            this.advisorId = 0;
        }
    }


    private buildStatusItems(): void
    {
        const live =
            !this.record || this.record.IsLive;

        this.statusItems =
            TEST_RIDE_STATUSES
                .filter(s => live || s.value === this.record?.Status)
                .filter(s => !this.isAddMode || s.value === 'Booked')
                .map(s => ({ label:s.label, value:s.value, color:s.color }));
    }


    //===========================================================
    // What may change
    //===========================================================

    // Live (or a new one) : date, slot and status
    get canMove(): boolean
    {
        return !this.isViewMode && (this.isAddMode || !!this.record?.IsLive);
    }


    get canChangeStatus(): boolean
    {
        return this.isEditMode && !!this.record?.IsLive;
    }


    get showsReason(): boolean
    {
        return this.status === 'Cancelled';
    }


    get busy(): boolean
    {
        return this.progress.busy;
    }


    get footerText(): string
    {
        const parts =
        [
            this.enquiryNo,
            this.customerText,
            this.date ? dateLabel(this.date) : '',
            this.slotStart ? slotLabel(this.slotStart) : ''
        ];

        return parts.filter(x => !!x).join(' · ');
    }


    get footerStatus(): string
    {
        return TEST_RIDE_STATUSES.find(x => x.value === this.status)?.label ?? this.status;
    }


    get footerColor(): string
    {
        return TEST_RIDE_STATUSES.find(x => x.value === this.status)?.color ?? '#64748B';
    }


    //===========================================================
    // Changes
    //===========================================================

    private unwrap(value: any): any
    {
        return value !== null && typeof value === 'object' && 'value' in value
            ? value.value
            : value;
    }


    onEnquiryChange(value: any): void
    {
        this.setEnquiry(Number(this.unwrap(value) ?? 0));

        this.dirty = true;
    }


    private setEnquiry(id: number): void
    {
        const w =
            this.waiting.find(x => x.SalesEnquiryId === id);

        this.enquiryId = w ? id : 0;

        this.enquiryNo = w?.EnquiryNo ?? '';

        this.customerText = w?.EnquirerName ?? '';

        this.mobileText = w?.EnquirerMobile ?? '';

        this.modelItems =
            w
                ? this.rideModels(null, '', w.ModelName, w.SecondModelName, w.ModelId, w.SecondModelId)
                : [];

        this.modelId = w?.ModelId ?? 0;

        this.interestText = w?.InterestLevelName ?? '';

        this.enquiryNote =
            w
                ? [
                    w.TestRideDate ? `Asked for ${dateLabel(w.TestRideDate)}${w.TestRideSlot ? ' ' + w.TestRideSlot : ''}` : '',
                    w.FromWebsite ? 'from the website' : w.SourceName,
                    w.ExecutiveName ? `executive ${w.ExecutiveName}` : '',
                    w.LastRide ? `last : ${w.LastRide}` : ''
                  ].filter(x => !!x).join(' · ')
                : '';

        this.cdr.detectChanges();
    }


    onDateChange(value: Date): void
    {
        if (!(value instanceof Date) || isNaN(value.getTime()))
        {
            return;
        }

        this.dateValue = TestRidesForm.startOfDay(value);

        this.date = toIso(this.dateValue);

        this.dirty = true;

        this.loadDefaults();
    }


    onSlotChange(value: any): void
    {
        this.slotStart = String(this.unwrap(value) ?? '');

        this.dirty = true;
    }


    onModelChange(value: any): void
    {
        this.modelId = Number(this.unwrap(value) ?? 0) || 0;

        this.dirty = true;
    }


    // The bike choices : the enquiry's model and its second model
    // (a saved ride keeps its bike even if the enquiry changed)
    private rideModels
    (
        savedId: number | null,
        savedName: string,
        modelName: string,
        secondName: string,
        modelId: number = 0,
        secondId: number | null = null
    ):
        Item[]
    {
        const items: Item[] = [];

        if (savedId && savedId > 0)
        {
            items.push({ label:savedName, value:savedId });
        }

        if (modelId > 0 && !items.some(x => x.value === modelId))
        {
            items.push({ label:modelName, value:modelId });
        }

        if (secondId && secondId > 0 && !items.some(x => x.value === secondId))
        {
            items.push({ label:`${secondName} (second model)`, value:secondId });
        }

        return items;
    }


    onAdvisorChange(value: any): void
    {
        this.advisorId = Number(this.unwrap(value) ?? 0) || 0;

        this.dirty = true;
    }


    onStatusChange(value: any): void
    {
        this.status = String(this.unwrap(value) ?? this.status);

        this.dirty = true;

        this.cdr.detectChanges();
    }


    onReasonChange(value: string | number): void
    {
        this.reason = String(value ?? '');

        this.dirty = true;
    }


    onNoteChange(value: string | number): void
    {
        this.note = String(value ?? '');

        this.dirty = true;
    }


    //===========================================================
    // Save
    //===========================================================

    onSave(): void
    {
        if (this.busy || this.isViewMode)
        {
            return;
        }

        if (this.isAddMode && !(this.enquiryId > 0))
        {
            this.toast.warning('Sales Enquiry', 'Choose the sales enquiry to book a test ride for.');

            return;
        }

        if (!this.slotStart)
        {
            this.toast.warning('Time Slot', 'Choose a time slot.');

            return;
        }

        if (this.showsReason && this.canChangeStatus && this.reason.trim().length < 2)
        {
            this.toast.warning('Cancel Reason', 'Write why the test ride is cancelled.');

            return;
        }

        const moved =
            this.isAddMode
            || (!!this.record && (this.record.RideDate !== this.date || this.record.SlotStart !== this.slotStart));

        const slot =
            this.slots.find(s => s.Start === this.slotStart);

        const own =
            this.record && this.record.RideDate === this.date ? this.record.SlotStart : '';

        const booked =
            slot ? (slot.Start === own ? slot.Booked - 1 : slot.Booked) : 0;

        if (moved && slot && booked >= slot.Capacity)
        {
            if (!this.defaults?.AllowOverbook)
            {
                this.toast.error('Slot Full', `The ${slotLabel(slot.Start)} slot is full (${booked} of ${slot.Capacity}). Pick another slot.`);

                return;
            }

            this.confirmDialog.open(
                'Slot Full',
                `The ${slotLabel(slot.Start)} slot already has ${booked} of ${slot.Capacity}. Book it anyway?`,
                (): void =>
                {
                    setTimeout(() => this.save(true));
                },
                'Overbook',
                'Cancel',
                'primary');

            return;
        }

        this.save(false);
    }


    private save(overbook: boolean): void
    {
        if (this.isAddMode)
        {
            this.progress
                .run<string>(
                    'Booking the Test Ride',
                    `Please wait while ${this.enquiryNo} is booked for ${dateLabel(this.date)} ${slotLabel(this.slotStart)}...`,
                    'Test ride booked.',
                    this.service.create({
                        SalesEnquiryId:this.enquiryId,
                        BranchId:this.branchId,
                        RideDate:this.date,
                        SlotStart:this.slotStart,
                        ModelId:this.modelId,
                        AdvisorUserId:this.advisorId,
                        Note:this.note.trim(),
                        AllowOverbook:overbook
                    }))
                .subscribe
                ({
                    next:(): void =>
                    {
                        this.toast.success('Test Ride Booked', `${this.enquiryNo} : ${dateLabel(this.date)} ${slotLabel(this.slotStart)}.`);

                        this.dirty = false;

                        this.toList();
                    },

                    error:(error: unknown): void =>
                    {
                        this.toast.error('Booking Failed', this.errorText(error, 'The test ride could not be booked.'));

                        this.loadDefaults();
                    }
                });

            return;
        }

        this.progress
            .run<void>(
                'Updating the Test Ride',
                `Please wait while ${this.enquiryNo} is updated...`,
                'Test ride updated.',
                this.service.update(
                    this.publicId,
                    {
                        RideDate:this.date,
                        SlotStart:this.slotStart,
                        ModelId:this.modelId,
                        AdvisorUserId:this.advisorId,
                        Note:this.note.trim(),
                        Status:this.status,
                        Reason:this.reason.trim(),
                        AllowOverbook:overbook
                    }))
            .subscribe
            ({
                next:(): void =>
                {
                    this.toast.success('Test Ride Updated', `${this.enquiryNo} : ${dateLabel(this.date)} ${slotLabel(this.slotStart)}, ${this.footerStatus}.`);

                    this.dirty = false;

                    this.toList();
                },

                error:(error: unknown): void =>
                {
                    this.toast.error('Update Failed', this.errorText(error, 'The test ride could not be updated.'));

                    this.loadDefaults();
                }
            });
    }


    //===========================================================
    // Clear (Add) / Back
    //===========================================================

    onClear(): void
    {
        if (this.isAddMode)
        {
            this.setEnquiry(0);

            this.slotStart = '';

            this.advisorId = this.advisorItems.some(x => x.value === this.myId) ? this.myId : 0;

            this.note = '';

            this.dirty = false;

            this.cdr.detectChanges();

            return;
        }

        // Edit : back to the saved values
        this.loadRecord();

        this.dirty = false;
    }


    onBackToList(): void
    {
        if (this.busy)
        {
            return;
        }

        if (!this.dirty || this.isViewMode)
        {
            this.toList();

            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            () => this.toList(),
            'Leave',
            'Stay',
            'primary');
    }


    private toList(): void
    {
        void this.router.navigate(['list'], { relativeTo:this.route.parent });
    }


    // The day board with this enquiry picked
    openBoard(): void
    {
        void this.router.navigate(
            ['board'],
            {
                relativeTo:this.route.parent,
                queryParams:this.enquiryId > 0 ? { enquiry:this.enquiryId, date:this.date } : { date:this.date }
            });
    }


    //===========================================================
    // Helpers
    //===========================================================

    private parseIso(iso: string): Date
    {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');

        return m
            ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
            : this.today;
    }


    private errorText(error: unknown, fallback: string): string
    {
        if (error instanceof HttpErrorResponse)
        {
            if (typeof error.error === 'string' && error.error.trim())
            {
                return error.error;
            }

            return error.error?.message ?? error.error?.title ?? fallback;
        }

        return fallback;
    }
}
