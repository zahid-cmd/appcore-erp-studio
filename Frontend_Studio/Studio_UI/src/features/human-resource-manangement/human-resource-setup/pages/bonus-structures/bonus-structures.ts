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
    map
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

// From so many months of service, so many percent of the salary
export interface BonusSlab
{
    FromMonths: number;
    BonusPercent: number;
}

export interface BonusStructure
{
    PublicId: string;
    Code: string;
    Name: string;
    // Basic / Gross
    RateBase: string;
    // Joining / Confirmation
    ServiceFrom: string;
    ConfirmedOnly: boolean;
    IsDefault: boolean;
    Remarks: string;
    IsActive: boolean;
    // Bonus sheets made with it
    SheetCount: number;
    Slabs: BonusSlab[];
}

type ListRow =
    BonusStructure
    &
    {
        SlabText: string;
        DefaultText: string;
        StatusText: string;
        StatusColor: string;
    };

// A slab row of the form : what is typed
interface SlabRow
{
    months: string;
    percent: string;
}

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

function structure(x: any): BonusStructure
{
    const s = pascal(x);

    return {
        PublicId:String(s.PublicId ?? ''),
        Code:String(s.Code ?? ''),
        Name:String(s.Name ?? ''),
        RateBase:String(s.RateBase ?? 'Basic'),
        ServiceFrom:String(s.ServiceFrom ?? 'Joining'),
        ConfirmedOnly:!!s.ConfirmedOnly,
        IsDefault:!!s.IsDefault,
        Remarks:String(s.Remarks ?? ''),
        IsActive:s.IsActive !== false,
        SheetCount:Number(s.SheetCount) || 0,
        Slabs:(Array.isArray(s.Slabs) ? s.Slabs : []).map((l: any) =>
        {
            const slab = pascal(l);

            return { FromMonths:Number(slab.FromMonths) || 0, BonusPercent:Number(slab.BonusPercent) || 0 };
        })
    };
}

const percentText =
    (value: number): string => (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits:3 });

// "6 m : 50 %, 12 m : 100 %"
function slabText(slabs: BonusSlab[]): string
{
    return [...slabs]
        .sort((a, b) => a.FromMonths - b.FromMonths)
        .map(x => `${x.FromMonths} m : ${percentText(x.BonusPercent)} %`)
        .join(',  ');
}


//===============================================================
// Bonus Structures (Human Resource > Human Resource Setup)
//
// How a festival bonus is worked out, and who gets it by the
// length of employment :
//     bonus = Basic or Gross x the percent of the service slab
// The slabs say from how many months of service how many percent;
// an employee below the first slab gets no bonus. Structures are
// named by the page ("Bonus Structure - 1"); one is the Default.
// The Default applies to every employee whose profile names no
// other structure (Employee Profile > Bonus Structure).
//
//   list / add / edit/:id / view/:id   (one component)
//===============================================================

@Component(
{
    selector:'bonus-structures',
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
    templateUrl:'./bonus-structures.html',
    styleUrl:'./bonus-structures.css'
})
export class BonusStructuresPage
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
        `${environment.apiUrl}/human-resource-manangement/human-resource-setup/bonus-structures`;

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
        { header:'Structure', field:'Name', width:'200px', align:'left' },
        { header:'Bonus On', field:'RateBase', width:'100px', align:'center' },
        { header:'Service From', field:'ServiceFrom', width:'130px', align:'center' },
        { header:'Service Slabs (months : percent)', field:'SlabText', width:'340px', align:'left' },
        { header:'Default', field:'DefaultText', width:'90px', align:'center' },
        { header:'Sheets', field:'SheetCount', width:'80px', align:'center' },
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

    serviceFrom =
        'Joining';

    confirmedOnly =
        false;

    isDefault =
        false;

    isActive =
        true;

    remarks =
        '';

    slabs:
        SlabRow[] = [];

    readonly rateItems =
    [
        { label:'Basic salary', value:'Basic' },
        { label:'Gross salary', value:'Gross' }
    ];

    readonly serviceItems =
    [
        { label:'The joining date', value:'Joining' },
        { label:'The confirmation date', value:'Confirmation' }
    ];

    get isViewMode(): boolean
    {
        return this.mode === 'view';
    }

    get pageTitle(): string
    {
        return this.mode === 'list' ? 'Bonus Structures'
            : this.mode === 'add' ? 'Add Bonus Structure'
            : this.mode === 'edit' ? 'Update Bonus Structure'
            : 'View Bonus Structure';
    }

    get saveText(): string
    {
        return this.mode === 'edit' ? 'Update' : 'Save';
    }

    // The slabs that are filled, in order
    private get cleanSlabs(): BonusSlab[]
    {
        return this.slabs
            .filter(x => x.months.trim() !== '' || x.percent.trim() !== '')
            .map(x => ({ FromMonths:Number(x.months), BonusPercent:Number(x.percent) }))
            .sort((a, b) => a.FromMonths - b.FromMonths);
    }

    // What the structure means, slab by slab
    get ruleLines(): string[]
    {
        const slabs =
            this.cleanSlabs.filter(x => x.FromMonths >= 0 && x.BonusPercent > 0);

        if (slabs.length === 0)
        {
            return ['Add a slab : from how many months of service, and what percent.'];
        }

        const salary = this.rateBase.toLowerCase();

        const lines: string[] = [];

        if (slabs[0].FromMonths > 0)
        {
            lines.push(`Under ${slabs[0].FromMonths} month(s) of service : no bonus.`);
        }

        slabs.forEach((slab, i) =>
        {
            const next = slabs[i + 1];

            lines.push(
                next
                    ? `${slab.FromMonths} to under ${next.FromMonths} month(s) : ${percentText(slab.BonusPercent)} % of the ${salary} salary.`
                    : `${slab.FromMonths} month(s) and above : ${percentText(slab.BonusPercent)} % of the ${salary} salary.`);
        });

        lines.push(`Service is counted from ${this.serviceFrom === 'Confirmation' ? 'the confirmation date (an employee who is not confirmed has none)' : 'the joining date'} to the bonus date.`);

        if (this.confirmedOnly)
        {
            lines.push('Only employees confirmed on or before the bonus date get it.');
        }

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
        }
        else if (this.mode === 'add')
        {
            this.slabs = [{ months:'0', percent:'100' }];

            this.http
                .get<any>(`${this.api}/defaults`)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(
                {
                    next:x =>
                    {
                        const d = pascal(x);

                        this.code = String(d.NextCode ?? '');
                        this.name = String(d.NextName ?? '');
                        this.isDefault = !!d.IsFirst;
                        this.cdr.detectChanges();
                    },
                    error:error => this.failed(error, 'The bonus structure defaults could not be loaded.')
                });
        }
        else
        {
            this.loading = true;

            this.http
                .get<any>(`${this.api}/${this.entityId}`)
                .pipe(map(structure), takeUntilDestroyed(this.destroyRef))
                .subscribe(
                {
                    next:s =>
                    {
                        this.code = s.Code;
                        this.name = s.Name;
                        this.rateBase = s.RateBase;
                        this.serviceFrom = s.ServiceFrom;
                        this.confirmedOnly = s.ConfirmedOnly;
                        this.isDefault = s.IsDefault;
                        this.isActive = s.IsActive;
                        this.remarks = s.Remarks;
                        this.slabs = s.Slabs.map(l => ({ months:String(l.FromMonths), percent:String(l.BonusPercent) }));
                        this.loading = false;
                        this.cdr.detectChanges();
                    },
                    error:error => this.failed(error, 'The bonus structure could not be loaded.')
                });
        }
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
                        (Array.isArray(rows) ? rows : []).map(structure).map(x => ({
                            ...x,
                            SlabText:slabText(x.Slabs),
                            DefaultText:x.IsDefault ? 'Default' : '',
                            StatusText:x.IsActive ? 'Active' : 'Inactive',
                            StatusColor:x.IsActive ? '#047857' : '#b4232c'
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error => this.failed(error, 'Bonus structures could not be loaded.')
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
                (!find || [x.Code, x.Name, x.RateBase, x.ServiceFrom, x.SlabText, x.Remarks]
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
            'Delete Bonus Structure',
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
                        this.toast.error('Error', error?.error?.message ?? 'The bonus structure could not be deleted.')
                }),
            'Delete',
            'Keep',
            'danger');
    }

    restore():
        void
    {
        this.confirmDialog.open(
            'Restore Bonus Structure',
            'Bring back the most recently deleted bonus structure?',
            () =>
                this.http.put<any>(`${this.api}/restore`, {}).subscribe(
                {
                    next:x =>
                    {
                        this.toast.success('Restored', x?.message ?? x?.Message ?? 'The bonus structure was restored.');
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

    onServiceFrom(value: any):
        void
    {
        this.serviceFrom = String(value ?? 'Joining');
        this.cdr.detectChanges();
    }

    onSwitch(field: 'confirmedOnly' | 'isDefault' | 'isActive', event: Event):
        void
    {
        this[field] = (event.target as HTMLInputElement).checked;

        // an Inactive structure is not the Default
        if (!this.isActive)
        {
            this.isDefault = false;
        }

        this.cdr.detectChanges();
    }

    onRemarks(value: any):
        void
    {
        this.remarks = String(value ?? '');
    }

    onSlab(row: SlabRow, field: 'months' | 'percent', event: Event):
        void
    {
        row[field] = ((event.target as HTMLInputElement).value ?? '').trim();
        this.cdr.detectChanges();
    }

    addSlab():
        void
    {
        this.slabs = [...this.slabs, { months:'', percent:'' }];
        this.cdr.detectChanges();
    }

    removeSlab(index: number):
        void
    {
        this.slabs = this.slabs.filter((_, i) => i !== index);
        this.cdr.detectChanges();
    }

    private validate(): string
    {
        const slabs = this.cleanSlabs;

        if (slabs.length === 0)
        {
            return 'Add at least one service slab : from how many months of service, and what percent.';
        }

        for (const slab of slabs)
        {
            if (!Number.isInteger(slab.FromMonths) || slab.FromMonths < 0 || slab.FromMonths > 600)
            {
                return 'Months of service must be a whole number, 0 to 600.';
            }

            if (!(slab.BonusPercent > 0) || slab.BonusPercent > 1000)
            {
                return `From ${slab.FromMonths} month(s) : the percent must be more than 0. Leave a service out of the slabs to give it no bonus.`;
            }
        }

        if (new Set(slabs.map(x => x.FromMonths)).size !== slabs.length)
        {
            return 'Two slabs start at the same months of service.';
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
            ServiceFrom:this.serviceFrom,
            ConfirmedOnly:this.confirmedOnly,
            IsDefault:this.isDefault,
            IsActive:this.isActive,
            Remarks:this.remarks.trim(),
            Slabs:this.cleanSlabs
        };

        const call: Observable<any> =
            this.mode === 'edit'
                ? this.http.put<void>(`${this.api}/${this.entityId}`, body)
                : this.http.post<any>(this.api, body);

        this.isSaving = true;

        this.progressDialog.show('Saving', 'Saving the bonus structure...', false);

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
                this.toast.error('Error', error?.error?.message ?? 'The bonus structure could not be saved.');
                this.cdr.detectChanges();
            }
        });
    }
}
