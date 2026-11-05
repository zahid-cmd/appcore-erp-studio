//===============================================================
// Sold Bike Form (Add / Update / View)
//
// A bike sold from our outlet and its service schedule.
//   • From a sale (Sales Invoices - MB) : made automatically on
//     the sale; chassis, model and sale date are locked here —
//     open it only to correct data (mobile, registration, a due
//     date) or to stop the reminders (inactive).
//   • Sold before the ERP : added by hand — chassis, model, sale
//     date, customer; the schedule comes from the brand's Service
//     Policy (preview) and services already taken can be entered
//     with their date and km.
// The server counts the due dates again on save : from the sale,
// then from each taken service. A due date changed by hand is
// kept. 7 days before a service is due, its Service Enquiry is
// raised (Source "Scheduled").
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
import { SearchDropdownComponent } from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { DropdownComponent } from '../../../../../../shared/components/controls/dropdown/dropdown';
import { DatepickerComponent } from '../../../../../../shared/components/controls/datepicker/datepicker';
import { OrbitLoaderComponent } from '../../../../../../shared/components/utilities/orbit-loader/orbit-loader';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { ProgressDialogService } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';
import { ProgressRunner } from '../../../../../../shared/components/utilities/progress-dialog/progress-runner';
import { AuthenticationStorageService } from '../../../../../../core/authentication/authentication-storage.service';

import
{
    ServiceVehicle,
    ServiceVehicleSchedule,
    SaveServiceVehicle,
    ServiceEnquiriesDefaults
}
from '../../../models/service-enquiries.model';

import { ServiceEnquiriesService } from '../../../services/service-enquiries.service';


interface Item
{
    label:string;
    value:any;
}


// A schedule row with what the form edits
interface ScheduleRow
{
    row:ServiceVehicleSchedule;

    // yyyy-MM-dd
    dueDate:string;

    dueEdited:boolean;

    takenDate:string;

    takenKm:string;

    skipped:boolean;

    note:string;
}


const STATUS_COLORS: Record<string, string> =
{
    'Due':'#DC2626',
    'Enquired':'#2563EB',
    'Upcoming':'#64748B',
    'Missed':'#B45309',
    'Out of warranty':'#9CA3AF',
    'Declined':'#9CA3AF',
    'Enquiry deleted':'#9CA3AF',
    'Taken':'#16A34A',
    'Skipped':'#9CA3AF',
    'Stopped':'#6B7280'
};


@Component(
{
    selector:'sold-bike-form',

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
        SearchDropdownComponent,
        DropdownComponent,
        DatepickerComponent,
        OrbitLoaderComponent,
        ToastComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./sold-bike-form.html',

    styleUrls:
    [
        '../form/service-enquiries-form.css',
        './sold-bike-form.css'
    ]
})
export class SoldBikeForm
implements OnInit, AfterViewInit, OnDestroy
{
    //===========================================================
    // Body height (as on Service Enquiries) : while loading the
    // body fills the page down to the footer; afterwards it is
    // as tall as its content, capped there (then it scrolls)
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
            Math.floor(this.visibleBottom(body) - body.getBoundingClientRect().top - SoldBikeForm.BottomGap);

        const limit = `${Math.max(320, height)}px`;

        body.style.height = this.loading ? limit : '';

        body.style.maxHeight = limit;
    }


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
    // Mode / header
    //===========================================================

    mode: 'add' | 'edit' | 'view' = 'add';

    entityId = 0;

    loading = true;

    previewing = false;

    previewMessage = '';

    selectedTab = 'general';

    get isView(): boolean
    {
        return this.mode === 'view';
    }

    get pageTitle(): string
    {
        return this.mode === 'edit'
            ? 'Update Sold Bike'
            : this.mode === 'view'
                ? 'View Sold Bike'
                : 'Add Sold Bike';
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

    get locked(): boolean
    {
        return this.isView || this.progress.busy;
    }

    // Chassis / model / sale date come from the sales invoice
    get fromSale(): boolean
    {
        return this.entity.SaleSource === 'Sale';
    }

    // Model can no longer change : a service is enquired / taken by a job card
    get modelLocked(): boolean
    {
        return this.locked
            || this.fromSale
            || this.rows.some(x => x.row.Status === 'Enquired' || (x.row.Status === 'Taken' && !!x.row.TakenDocNo));
    }


    //===========================================================
    // Data
    //===========================================================

    entity: ServiceVehicle = this.emptyEntity();

    saleDate: Date | null = null;

    readonly today: Date = new Date();

    lastKmText = '';

    modelItems: Item[] = [];

    readonly statusItems: Item[] =
    [
        { label:'Active (send reminders)', value:true },
        { label:'Inactive (stopped)',      value:false }
    ];

    rows: ScheduleRow[] = [];

    private defaults: ServiceEnquiriesDefaults | null = null;


    ngOnInit(): void
    {
        const id = Number(this.route.snapshot.paramMap.get('id') ?? 0);

        const url = this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/') ? 'view'
            : url.includes('/edit/') ? 'edit'
            : 'add';

        this.entityId = id > 0 ? id : 0;

        this.loadDefaults(() =>
        {
            if (this.entityId > 0)
            {
                this.loadEntity();
            }
            else
            {
                this.loading = false;

                this.cdr.detectChanges();

                this.scheduleFit();
            }
        });
    }


    private emptyEntity(): ServiceVehicle
    {
        const user = this.auth.getUser();

        return {
            ServiceVehicleId:0,
            ChassisNo:'',
            EngineNo:'',
            RegistrationNo:'',
            ModelId:0,
            ModelName:'',
            BrandManagementId:0,
            BrandName:'',
            ColorName:'',
            ServicePolicyId:null,
            PolicyCode:'',
            WarrantyYears:0,
            WarrantyKm:0,
            WarrantyUntil:null,
            InWarranty:false,
            SaleDate:'',
            SaleSource:'Manual',
            SaleDocType:'',
            SaleDocId:null,
            SaleDocNo:'',
            CustomerId:null,
            CustomerCode:'',
            CustomerName:'',
            Mobile:'',
            BranchId:Number(user?.branchId ?? 0),
            BranchName:user?.branchName ?? '',
            LastKm:null,
            Remarks:'',
            IsActive:true,
            TakenCount:0,
            TotalCount:0,
            NextServiceName:'',
            NextDueDate:null,
            NextStatusText:'',
            NextEnquiryNo:'',
            Schedules:[]
        };
    }


    //===========================================================
    // Dates / texts
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

    get todayIso(): string
    {
        return this.toIso(this.today)!;
    }

    get saleIso(): string
    {
        return this.toIso(this.saleDate) ?? '';
    }

    statusColor(text: string): string
    {
        return STATUS_COLORS[text] ?? '#64748B';
    }

    money(value: number): string
    {
        return value > 0 ? value.toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:2 }) : 'Free';
    }

    get warrantyText(): string
    {
        const e = this.entity;

        if (!e.PolicyCode)
        {
            return 'Choose the model and sale date';
        }

        const until =
            e.WarrantyUntil
                ? this.formatDate(e.WarrantyUntil)
                : this.saleDate && e.WarrantyYears > 0
                    ? this.formatDate(this.toIso(new Date(this.saleDate.getFullYear() + e.WarrantyYears, this.saleDate.getMonth(), this.saleDate.getDate())))
                    : '—';

        return `${e.WarrantyYears} year${e.WarrantyYears === 1 ? '' : 's'} / ${e.WarrantyKm.toLocaleString()} km · until ${until}`;
    }

    // A row the form may change (not taken by a job card)
    rowLocked(item: ScheduleRow): boolean
    {
        return this.locked || (item.row.Status === 'Taken' && !!item.row.TakenDocNo);
    }


    //===========================================================
    // Load
    //===========================================================

    private loadDefaults(done: () => void): void
    {
        this.service
            .getDefaults()
            .subscribe
            ({
                next: (defaults: ServiceEnquiriesDefaults): void =>
                {
                    this.defaults = defaults;

                    this.modelItems =
                        defaults.Models.map(x => ({
                            label: x.BrandName ? `${x.Name} · ${x.BrandName}` : x.Name,
                            value: x.Id
                        }));

                    done();
                },

                error: (error: unknown): void =>
                {
                    console.error('Load Defaults Error:', error);

                    this.loading = false;

                    this.toast.error('Load Failed', this.errorText(error, 'The bike models could not be loaded.'));

                    this.cdr.detectChanges();
                }
            });
    }


    private loadEntity(): void
    {
        this.loading = true;

        this.service
            .getVehicle(this.entityId)
            .subscribe
            ({
                next: (response: ServiceVehicle): void =>
                {
                    this.entity = response;

                    this.saleDate = this.fromIso(response.SaleDate);

                    this.lastKmText = response.LastKm != null ? String(response.LastKm) : '';

                    this.setRows(response.Schedules);

                    // A model no longer offered stays shown
                    if (response.ModelId && !this.modelItems.some(x => x.value === response.ModelId))
                    {
                        this.modelItems = [{ label:`${response.ModelName} · ${response.BrandName}`, value:response.ModelId }, ...this.modelItems];
                    }

                    this.loading = false;

                    this.cdr.detectChanges();

                    this.scheduleFit();
                },

                error: (error: unknown): void =>
                {
                    console.error('Load Sold Bike Error:', error);

                    this.toast.error('Load Failed', this.errorText(error, 'The sold bike could not be loaded.'));

                    this.onBackToList();
                }
            });
    }


    private setRows(list: ServiceVehicleSchedule[]): void
    {
        this.rows =
            (list ?? []).map(row => ({
                row,
                dueDate: (row.DueDate ?? '').slice(0, 10),
                dueEdited: row.DueDateEdited,
                takenDate: (row.TakenDate ?? '').slice(0, 10),
                takenKm: row.TakenKm != null ? String(row.TakenKm) : '',
                skipped: row.Status === 'Skipped',
                note: row.Note
            }));
    }


    // Add / model change : the schedule from the brand's policy
    private preview(): void
    {
        const modelId = this.entity.ModelId;

        const sale = this.toIso(this.saleDate);

        if (!modelId || !sale)
        {
            return;
        }

        this.previewing = true;

        this.previewMessage = '';

        this.service
            .previewSchedule(modelId, sale)
            .subscribe
            ({
                next: (rows: ServiceVehicleSchedule[]): void =>
                {
                    this.previewing = false;

                    this.setRows(rows);

                    this.cdr.detectChanges();
                },

                error: (error: unknown): void =>
                {
                    this.previewing = false;

                    this.rows = [];

                    this.previewMessage = this.errorText(error, 'The service schedule could not be worked out.');

                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Field changes
    //===========================================================

    private unwrap(value: any): any
    {
        return value && typeof value === 'object' && 'value' in value ? value.value : value;
    }

    onModelChange(value: any): void
    {
        const id = Number(this.unwrap(value) ?? 0);

        if (id === this.entity.ModelId)
        {
            return;
        }

        const model = this.defaults?.Models.find(x => x.Id === id);

        this.entity.ModelId = id;

        this.entity.ModelName = model?.Name ?? '';

        this.entity.BrandName = model?.BrandName ?? '';

        this.entity.PolicyCode = '';

        this.preview();
    }

    onSaleDateChange(date: Date): void
    {
        this.saleDate = date ?? null;

        this.entity.WarrantyUntil = null;

        if (this.mode === 'add')
        {
            this.preview();
        }
    }

    onText(field: 'ChassisNo' | 'EngineNo' | 'RegistrationNo' | 'ColorName' | 'CustomerName' | 'Remarks', value: string | number): void
    {
        const text = String(value ?? '');

        (this.entity as any)[field] =
            field === 'ChassisNo' || field === 'EngineNo'
                ? text.toUpperCase().replace(/\s+/g, '')
                : field === 'RegistrationNo'
                    ? text.toUpperCase()
                    : text;
    }

    onMobileChange(value: string | number): void
    {
        this.entity.Mobile = String(value ?? '').replace(/\D/g, '').slice(0, 11);
    }

    onLastKmChange(value: string | number): void
    {
        this.lastKmText = String(value ?? '').replace(/\D/g, '').slice(0, 7);

        this.entity.LastKm = this.lastKmText ? Number(this.lastKmText) : null;
    }

    onActiveChange(value: any): void
    {
        this.entity.IsActive = Boolean(this.unwrap(value));
    }

    get mobileWarning(): string
    {
        const m = this.entity.Mobile;

        return m && !/^01\d{9}$/.test(m) ? 'Mobile must be 11 digits starting with 01.' : '';
    }


    // Schedule row edits
    private input(event: Event): string
    {
        return (event.target as HTMLInputElement).value ?? '';
    }

    onDueDate(item: ScheduleRow, event: Event): void
    {
        item.dueDate = this.input(event);

        item.dueEdited = item.dueDate !== (item.row.DueDate ?? '').slice(0, 10) || item.row.DueDateEdited;
    }

    resetDue(item: ScheduleRow): void
    {
        item.dueEdited = false;

        item.dueDate = (item.row.DueDate ?? '').slice(0, 10);
    }

    onTakenDate(item: ScheduleRow, event: Event): void
    {
        item.takenDate = this.input(event);

        if (item.takenDate)
        {
            item.skipped = false;
        }
    }

    onTakenKm(item: ScheduleRow, event: Event): void
    {
        const digits = this.input(event).replace(/\D/g, '').slice(0, 7);

        (event.target as HTMLInputElement).value = digits;

        item.takenKm = digits;
    }

    onSkip(item: ScheduleRow, event: Event): void
    {
        item.skipped = (event.target as HTMLInputElement).checked;

        if (item.skipped)
        {
            item.takenDate = '';

            item.takenKm = '';
        }
    }

    onNote(item: ScheduleRow, event: Event): void
    {
        item.note = this.input(event).slice(0, 200);
    }


    //===========================================================
    // Save
    //===========================================================

    private validate(): string
    {
        const e = this.entity;

        if (!(e.BranchId > 0)) return 'No branch : log in to a branch first.';

        if (e.ChassisNo.trim().length < 5) return 'Enter the Chassis No (at least 5 characters).';

        if (!e.ModelId) return 'Choose the bike Model.';

        if (!this.saleDate) return 'Sale Date is required.';

        if (this.toIso(this.saleDate)! > this.todayIso) return 'Sale Date cannot be in the future.';

        if (!e.Mobile || this.mobileWarning) return 'Enter the customer\'s Mobile (11 digits starting with 01).';

        if (e.CustomerName.trim().length < 2) return 'Customer Name is required.';

        if (this.mode === 'add' && this.rows.length === 0) return this.previewMessage || 'The model\'s brand has no service schedule.';

        for (const item of this.rows)
        {
            if (item.takenDate && item.takenDate > this.todayIso) return `${item.row.ServiceName} : the taken date cannot be in the future.`;

            if (item.takenDate && item.takenDate < this.saleIso) return `${item.row.ServiceName} : the taken date cannot be before the sale date.`;

            if (item.dueEdited && !item.dueDate) return `${item.row.ServiceName} : enter the due date, or reset it.`;
        }

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

        const body: SaveServiceVehicle =
        {
            ServiceVehicleId: e.ServiceVehicleId,
            BranchId: e.BranchId,
            ChassisNo: e.ChassisNo.trim(),
            EngineNo: e.EngineNo.trim(),
            RegistrationNo: e.RegistrationNo.trim(),
            ModelId: e.ModelId,
            ColorName: e.ColorName.trim(),
            SaleDate: this.toIso(this.saleDate),
            Mobile: e.Mobile,
            CustomerName: e.CustomerName.trim(),
            LastKm: e.LastKm,
            Remarks: e.Remarks.trim(),
            IsActive: e.IsActive,
            Schedules:
                this.rows.map(item => ({
                    SequenceNo: item.row.SequenceNo,
                    DueDate: item.dueEdited ? item.dueDate || null : null,
                    DueDateEdited: item.dueEdited && !!item.dueDate,
                    TakenDate: item.takenDate || null,
                    TakenKm: item.takenDate && item.takenKm ? Number(item.takenKm) : null,
                    Skipped: item.skipped && !item.takenDate,
                    Note: item.note.trim()
                }))
        };

        const isAdd = this.mode === 'add';

        const call$ =
            isAdd
                ? this.service.createVehicle(body)
                : this.service.updateVehicle(body);

        this.progress
            .run<unknown>(
                isAdd ? 'Saving Sold Bike' : 'Updating Sold Bike',
                'Please wait while the bike and its service schedule are being saved...',
                isAdd ? 'Sold bike saved.' : 'Sold bike updated.',
                call$
            )
            .subscribe
            ({
                next: (): void =>
                {
                    this.toast.success(
                        isAdd ? 'Save Successful' : 'Update Successful',
                        `${e.ModelName} ${body.ChassisNo} ${isAdd ? 'added with its service schedule' : 'updated'}.`
                    );

                    this.onBackToList();
                },

                error: (error: unknown): void =>
                {
                    console.error('Save Sold Bike Error:', error);

                    this.toast.error(
                        isAdd ? 'Save Failed' : 'Update Failed',
                        this.errorText(error, 'The sold bike could not be saved.')
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

        this.entity = this.emptyEntity();

        this.saleDate = null;

        this.lastKmText = '';

        this.rows = [];

        this.previewMessage = '';
    }

    onBackToList(): void
    {
        void this.router.navigate(['list'], { relativeTo:this.route.parent, queryParams:{ tab:'bikes' } });
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
