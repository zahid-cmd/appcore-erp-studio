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
    HttpClient
}
from '@angular/common/http';

import
{
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    Observable,
    forkJoin,
    map,
    of
}
from 'rxjs';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import { environment } from '../../../../../environments/environment';

import { PageHeaderComponent } from '../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../shared/components/layout/page-canvas/page-canvas';
import { DropdownComponent } from '../../../../../shared/components/controls/dropdown/dropdown';
import { SearchDropdownComponent } from '../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../../shared/components/controls/textbox/textbox';
import { SearchBoxComponent } from '../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../shared/components/utilities/command-center/command-center';
import { ListTableColumn, ListTableComponent } from '../../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../services/hr-progress.service';


//===============================================================
// Model
//===============================================================

export interface LeaveEncashPolicy
{
    PublicId: string;
    Code: string;
    Name: string;
    // Basic / Gross
    RateBase: string;
    // Day rate = salary / this
    MonthDays: number;
    ConfirmedOnly: boolean;
    MinServiceMonths: number;
    // 0 = no limit
    MaxDaysPerYear: number;
    KeepDays: number;
    // Only a leave year that has ended is encashed
    AfterYearEnd: boolean;
    IsDefault: boolean;
    Remarks: string;
    IsActive: boolean;
    LeaveTypeIds: number[];
    LeaveTypeNames: string;
    // Employee Profiles that name it
    EmployeeCount: number;
    EncashmentCount: number;
}

interface PolicyLeaveType
{
    Id: number;
    Name: string;
    DaysPerYear: number;
}

type ListRow =
    LeaveEncashPolicy
    &
    {
        RateText: string;
        KeepText: string;
        MostText: string;
        DefaultText: string;
        StatusText: string;
        StatusColor: string;
    };

const EMPTY_GUID =
    '00000000-0000-0000-0000-000000000000';

function pascal(x: any): any
{
    const row: Record<string, any> = {};

    for (const key of Object.keys(x ?? {}))
    {
        row[key.charAt(0).toUpperCase() + key.slice(1)] = x[key];
    }

    return row;
}

function policy(x: any): LeaveEncashPolicy
{
    const p = pascal(x);

    return {
        PublicId:String(p.PublicId ?? ''),
        Code:String(p.Code ?? ''),
        Name:String(p.Name ?? ''),
        RateBase:String(p.RateBase ?? 'Basic'),
        MonthDays:Number(p.MonthDays) || 30,
        ConfirmedOnly:!!p.ConfirmedOnly,
        MinServiceMonths:Number(p.MinServiceMonths) || 0,
        MaxDaysPerYear:Number(p.MaxDaysPerYear) || 0,
        KeepDays:Number(p.KeepDays) || 0,
        AfterYearEnd:!!p.AfterYearEnd,
        IsDefault:!!p.IsDefault,
        Remarks:String(p.Remarks ?? ''),
        IsActive:p.IsActive !== false,
        LeaveTypeIds:(Array.isArray(p.LeaveTypeIds) ? p.LeaveTypeIds : []).map((id: any) => Number(id) || 0),
        LeaveTypeNames:String(p.LeaveTypeNames ?? ''),
        EmployeeCount:Number(p.EmployeeCount) || 0,
        EncashmentCount:Number(p.EncashmentCount) || 0
    };
}

const daysText =
    (value: number): string => (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits:2 });


//===============================================================
// Leave Encashment Policies (Human Resource > Human Resource
// Setup)
//
// The rule of a leave encashment : which leave types, on what
// salary (the day rate), who (confirmed, service), how many days
// (what must stay in the balance, the most a year). An encashment
// depends on the leave balance and is paid on a year basis : once
// a leave year for a leave type, for the days left of it.
//
// Policies are named by the page ("Encashment Policy - 1"); one
// is the Default : it applies to every employee whose profile
// names no other policy.
//
//   list / add / edit/:id / view/:id   (one component)
//===============================================================

@Component(
{
    selector:'leave-encashment-policies',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        DropdownComponent,
        SearchDropdownComponent,
        TextboxComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./leave-encashment-policies.html',
    styleUrl:'./leave-encashment-policies.css'
})
export class LeaveEncashmentPoliciesPage
implements OnInit
{
    private readonly http = inject(HttpClient);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    private readonly api =
        `${environment.apiUrl}/human-resource-manangement/human-resource-setup/leave-encashment-policies`;

    mode:
        'list' | 'add' | 'edit' | 'view' = 'list';

    loading =
        false;

    loadFailed =
        false;

    isSaving =
        false;

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

    private all:
        ListRow[] = [];

    rows:
        ListRow[] = [];

    searchText =
        '';

    currentPage =
        1;

    pageSize =
        10;

    totalRecords =
        0;

    statusFilter =
        '';

    readonly statusItems =
    [
        { label:'All', value:'' },
        { label:'Active', value:'active' },
        { label:'Inactive', value:'inactive' }
    ];

    historyOpened =
        false;

    historyItems:
        any[] = [];

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Code', field:'Code', width:'100px', align:'center' },
        { header:'Policy', field:'Name', width:'190px', align:'left' },
        { header:'Leave Types', field:'LeaveTypeNames', width:'260px', align:'left' },
        { header:'Day Rate', field:'RateText', width:'110px', align:'center' },
        { header:'Days Kept', field:'KeepText', width:'95px', align:'center' },
        { header:'Max Days a Year', field:'MostText', width:'125px', align:'center' },
        { header:'Default', field:'DefaultText', width:'85px', align:'center' },
        { header:'Employees', field:'EmployeeCount', width:'95px', align:'center' },
        { header:'Status', field:'StatusText', width:'105px', align:'left', dotField:'StatusColor' },
        { header:'Actions', field:'actions', type:'actions', width:'120px', align:'center' }
    ];

    //===========================================================
    // Form
    //===========================================================

    entityId =
        '';

    code =
        '';

    name =
        '';

    rateBase =
        'Basic';

    monthDays =
        '30';

    minServiceMonths =
        '0';

    keepDays =
        '0';

    maxDaysPerYear =
        '0';

    confirmedOnly =
        false;

    afterYearEnd =
        false;

    isDefault =
        false;

    isActive =
        true;

    remarks =
        '';

    leaveTypes:
        PolicyLeaveType[] = [];

    // The leave types ticked
    private ticked =
        new Set<number>();

    readonly rateItems =
    [
        { label:'Basic salary', value:'Basic' },
        { label:'Gross salary', value:'Gross' }
    ];

    days(value: number): string
    {
        return daysText(value);
    }

    // The days a year of the leave types listed
    get totalDays(): number
    {
        return this.leaveTypes.reduce((sum, x) => sum + x.DaysPerYear, 0);
    }

    isTicked(id: number): boolean
    {
        return this.ticked.has(id);
    }

    get isViewMode(): boolean
    {
        return this.mode === 'view';
    }

    get pageTitle(): string
    {
        return this.mode === 'list' ? 'Leave Encashment Policies'
            : this.mode === 'add' ? 'Add Leave Encashment Policy'
            : this.mode === 'edit' ? 'Update Leave Encashment Policy'
            : 'View Leave Encashment Policy';
    }

    get saveText(): string
    {
        return this.mode === 'edit' ? 'Update' : 'Save';
    }

    private num(value: string): number
    {
        return Number(String(value ?? '').replace(/,/g, '').trim() || 0);
    }

    // What the policy means, line by line
    get ruleLines(): string[]
    {
        const names =
            this.leaveTypes.filter(x => this.ticked.has(x.Id)).map(x => x.Name);

        if (names.length === 0)
        {
            return ['Tick the leave types that can be encashed.'];
        }

        const keep = this.num(this.keepDays);
        const most = this.num(this.maxDaysPerYear);
        const service = this.num(this.minServiceMonths);

        const lines =
        [
            `${names.join(', ')} can be encashed.`,
            'It is paid on a year basis : one encashment of an employee for a leave year, on the whole balance left of these leave types. No balance : nothing is paid.',
            'The leave year is the financial year (Settings > Financial Years).',
            `Amount = days x day rate. Day rate = ${this.rateBase.toLowerCase()} salary / ${this.num(this.monthDays) || 30}, in whole taka.`
        ];

        lines.push(
            keep > 0
                ? `${daysText(keep)} day(s) must stay in the balance : only the days above that are paid.`
                : 'All the days left are paid.');

        if (most > 0)
        {
            lines.push(`At most ${daysText(most)} day(s) are paid to an employee a year, over all the leave types together. A balance above that is not paid.`);
        }

        if (this.confirmedOnly)
        {
            lines.push('Only confirmed employees.');
        }

        if (service > 0)
        {
            lines.push(`${service} month(s) of service needed.`);
        }

        lines.push(
            this.afterYearEnd
                ? 'Only a leave year that has ended can be encashed.'
                : 'The running leave year and the one before can be encashed.');

        return lines;
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

        if (this.mode === 'list')
        {
            this.loadList();
            return;
        }

        this.loading = true;

        forkJoin(
        {
            defaults:this.http.get<any>(`${this.api}/defaults`),
            entity:this.mode === 'add' ? of(null) : this.http.get<any>(`${this.api}/${this.entityId}`).pipe(map(policy))
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(
        {
            next:({ defaults, entity }) =>
            {
                const d = pascal(defaults);

                this.leaveTypes =
                    (Array.isArray(d.LeaveTypes) ? d.LeaveTypes : []).map((x: any) =>
                    {
                        const t = pascal(x);

                        return { Id:Number(t.Id) || 0, Name:String(t.Name ?? ''), DaysPerYear:Number(t.DaysPerYear) || 0 };
                    });

                if (entity)
                {
                    this.code = entity.Code;
                    this.name = entity.Name;
                    this.rateBase = entity.RateBase;
                    this.monthDays = String(entity.MonthDays);
                    this.minServiceMonths = String(entity.MinServiceMonths);
                    this.keepDays = String(entity.KeepDays);
                    this.maxDaysPerYear = String(entity.MaxDaysPerYear);
                    this.confirmedOnly = entity.ConfirmedOnly;
                    this.afterYearEnd = entity.AfterYearEnd;
                    this.isDefault = entity.IsDefault;
                    this.isActive = entity.IsActive;
                    this.remarks = entity.Remarks;
                    this.ticked = new Set(entity.LeaveTypeIds);
                }
                else
                {
                    this.code = String(d.NextCode ?? '');
                    this.name = String(d.NextName ?? '');
                    this.isDefault = !!d.IsFirst;
                }

                this.loading = false;
                this.cdr.detectChanges();
            },
            error:error => this.failed(error, 'The leave encashment policy could not be loaded.')
        });
    }

    private failed(error: any, fallback: string):
        void
    {
        this.loading = false;
        this.loadFailed = true;
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

        this.http
            .get<any[]>(this.api)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        (Array.isArray(rows) ? rows : []).map(policy).map(x => ({
                            ...x,
                            RateText:`${x.RateBase} / ${x.MonthDays}`,
                            KeepText:x.KeepDays > 0 ? daysText(x.KeepDays) : '-',
                            MostText:x.MaxDaysPerYear > 0 ? daysText(x.MaxDaysPerYear) : 'No limit',
                            DefaultText:x.IsDefault ? 'Default' : '',
                            StatusText:x.IsActive ? 'Active' : 'Inactive',
                            StatusColor:x.IsActive ? '#047857' : '#b4232c'
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error => this.failed(error, 'Leave encashment policies could not be loaded.')
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const matched =
            this.all.filter(x =>
                (!this.statusFilter || (this.statusFilter === 'active') === x.IsActive)
                &&
                (!find || [x.Code, x.Name, x.LeaveTypeNames, x.RateText, x.Remarks]
                    .some(v => (v ?? '').toLowerCase().includes(find))));

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

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;
        this.apply();
    }

    onStatusFilter(value: any):
        void
    {
        this.statusFilter = String(value ?? '');
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
        // By code
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    view(row: ListRow):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    edit(row: ListRow):
        void
    {
        void this.router.navigate(['../edit', row.PublicId], { relativeTo:this.route });
    }

    goToList():
        void
    {
        void this.router.navigate([this.mode === 'add' ? '../list' : '../../list'], { relativeTo:this.route });
    }

    delete(row: ListRow):
        void
    {
        this.confirmDialog.open(
            'Delete Leave Encashment Policy',
            `Delete ${row.Code} ${row.Name}?`,
            () =>
                this.http.delete<void>(`${this.api}/${row.PublicId}`).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);
                        this.loadList();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The leave encashment policy could not be deleted.')
                }),
            'Delete',
            'Keep',
            'danger');
    }

    restore():
        void
    {
        this.confirmDialog.open(
            'Restore Leave Encashment Policy',
            'Bring back the most recently deleted leave encashment policy?',
            () =>
                this.http.put<any>(`${this.api}/restore`, {}).subscribe(
                {
                    next:x =>
                    {
                        this.toast.success('Restored', x?.message ?? x?.Message ?? 'The leave encashment policy was restored.');
                        this.loadList();
                    },
                    error:error =>
                        this.toast.error('Restore', error?.error?.message ?? 'Nothing was restored.')
                }),
            'Restore',
            'Cancel',
            'primary');
    }

    openHistory():
        void
    {
        this.http
            .get<any[]>(`${this.api}/history`)
            .subscribe(
            {
                next:items =>
                {
                    this.historyItems =
                        (Array.isArray(items) ? items : []).map(h => ({
                            title:h.ActivityTitle ?? h.activityTitle,
                            description:h.ActivityDescription ?? h.activityDescription,
                            user:h.PerformedByName ?? h.performedByName ?? 'System',
                            dateTime:new Date(h.PerformedDate ?? h.performedDate).toLocaleString(),
                            badge:h.ActivityType ?? h.activityType
                        }));

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
    // Form
    //===========================================================

    onRate(value: any):
        void
    {
        this.rateBase = String(value ?? 'Basic');
        this.cdr.detectChanges();
    }

    onNumber(field: 'monthDays' | 'minServiceMonths' | 'keepDays' | 'maxDaysPerYear', value: any):
        void
    {
        this[field] = String(value ?? '');
        this.cdr.detectChanges();
    }

    onSwitch(field: 'confirmedOnly' | 'afterYearEnd' | 'isDefault' | 'isActive', event: Event):
        void
    {
        this[field] = (event.target as HTMLInputElement).checked;

        // an Inactive policy is not the Default
        if (!this.isActive)
        {
            this.isDefault = false;
        }

        this.cdr.detectChanges();
    }

    onTick(id: number, event: Event):
        void
    {
        if ((event.target as HTMLInputElement).checked)
        {
            this.ticked.add(id);
        }
        else
        {
            this.ticked.delete(id);
        }

        this.cdr.detectChanges();
    }

    onRemarks(value: any):
        void
    {
        this.remarks = String(value ?? '');
    }

    private validate(): string
    {
        const monthDays = this.num(this.monthDays);
        const service = this.num(this.minServiceMonths);
        const keep = this.num(this.keepDays);
        const most = this.num(this.maxDaysPerYear);

        if (this.ticked.size === 0)
        {
            return 'Tick at least one leave type that can be encashed.';
        }

        if (!Number.isInteger(monthDays) || monthDays < 1 || monthDays > 31)
        {
            return 'Days of the month (for the day rate) must be a whole number, 1 to 31.';
        }

        if (!Number.isInteger(service) || service < 0 || service > 600)
        {
            return 'Minimum service must be a whole number of months, 0 to 600.';
        }

        if (!(keep >= 0) || keep > 366)
        {
            return 'Days to keep in the balance must be 0 to 366.';
        }

        if (!(most >= 0) || most > 366)
        {
            return 'Maximum Encashable Days a Year must be 0 (no limit) to 366.';
        }

        return '';
    }

    onSave():
        void
    {
        if (this.isSaving || this.isViewMode)
        {
            return;
        }

        const problem =
            this.validate();

        if (problem)
        {
            this.toast.error('Validation', problem);
            return;
        }

        const body =
        {
            PublicId:this.entityId || EMPTY_GUID,
            Code:this.code,
            Name:this.name,
            RateBase:this.rateBase,
            MonthDays:this.num(this.monthDays),
            ConfirmedOnly:this.confirmedOnly,
            MinServiceMonths:this.num(this.minServiceMonths),
            MaxDaysPerYear:this.num(this.maxDaysPerYear),
            KeepDays:this.num(this.keepDays),
            AfterYearEnd:this.afterYearEnd,
            IsDefault:this.isDefault,
            IsActive:this.isActive,
            Remarks:this.remarks.trim(),
            LeaveTypeIds:[...this.ticked]
        };

        const call: Observable<any> =
            this.mode === 'edit'
                ? this.http.put<void>(`${this.api}/${this.entityId}`, body)
                : this.http.post<any>(this.api, body);

        this.isSaving = true;

        this.progressDialog.show('Saving', 'Saving the leave encashment policy...', false);

        call.subscribe(
        {
            next:() =>
                this.progressDialog.finish(() =>
                {
                    this.isSaving = false;
                    this.toast.success('Success', `${this.name} was ${this.mode === 'edit' ? 'updated' : 'saved'}.`);
                    this.goToList();
                }),
            error:error =>
            {
                this.progressDialog.fail();
                this.isSaving = false;
                this.toast.error('Error', error?.error?.message ?? 'The leave encashment policy could not be saved.');
                this.cdr.detectChanges();
            }
        });
    }
}
