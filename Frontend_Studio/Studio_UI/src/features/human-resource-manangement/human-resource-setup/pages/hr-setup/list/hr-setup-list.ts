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

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { ControlTab, ControlTabsComponent } from '../../../../../../shared/components/controls/control-tabs/control-tabs';
import { SearchDropdownComponent } from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { SearchBoxComponent } from '../../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { ListTableComponent, ListTableColumn } from '../../../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { TextboxComponent } from '../../../../../../shared/components/controls/textbox/textbox';
import { HrProgressService } from '../../../../services/hr-progress.service';

import
{
    HR_SETUP_PAGES,
    HR_WEEK_DAYS,
    HrSetupKey,
    HrSetupOption,
    HrSetupPage,
    HrSetupRow,
    HrSetupSummaryItem,
    hrToggleWeekDay,
    hrWeekDaysText
}
from '../../../models/hr-setup.model';

import
{
    HrSetupService
}
from '../../../services/hr-setup.service';


//===============================================================
// Human Resource Setup List : Shifts, Holidays, Leave Types and
// Salary Heads (the page comes from the route data 'hrSetup').
//
// Short setup lists : loaded once, filtered / paged in the page.
// The page's filter and the status (All / Active / Inactive) are
// dropdowns on the toolbar right; summary line below the canvas.
//
// Holidays has two sections : Weekly Holidays (ONE record, the
// weekly holiday of every employee : edited in place, never added
// a second time, never deleted) and Public Holidays (the list).
//===============================================================

@Component(
{
    selector:'hr-setup-list',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        SearchDropdownComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        TextboxComponent
    ],
    templateUrl:'./hr-setup-list.html',
    styleUrl:'./hr-setup-list.css'
})
export class HrSetupList
implements OnInit
{
    private readonly service = inject(HrSetupService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    private readonly progressDialog = inject(HrProgressService);

    //===========================================================
    // Holidays : Weekly Holidays / Public Holidays
    //===========================================================

    readonly sectionTabs:
        ControlTab[] =
    [
        { id:'weekly', label:'Weekly Holidays' },
        { id:'public', label:'Public Holidays' }
    ];

    section =
        'weekly';

    readonly weekDays =
        HR_WEEK_DAYS;

    weeklyDays =
        '';

    weeklyRemarks =
        '';

    // As saved
    private weeklySavedDays =
        '';

    private weeklySavedRemarks =
        '';

    weeklyOwnCount =
        0;

    weeklyLoading =
        false;

    // The record is open for a change (off : the one-row list)
    weeklyEditing =
        false;

    readonly weeklyActions =
        { view:false, edit:true, delete:false };

    readonly weeklyColumns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Weekly Holiday', field:'DaysText', width:'300px', align:'left' },
        { header:'Days a Week', field:'DayCount', width:'120px', align:'center' },
        { header:'Applies To', field:'AppliesText', width:'260px', align:'left' },
        { header:'Remarks', field:'Remarks', width:'300px', align:'left' },
        { header:'Actions', field:'actions', type:'actions', width:'120px', align:'center' }
    ];

    // The list : the one record
    get weeklyRows(): any[]
    {
        if (this.weeklyLoading)
        {
            return [];
        }

        return [
        {
            DaysText:hrWeekDaysText(this.weeklySavedDays),
            DayCount:this.weeklySavedDays.split(',').filter(Boolean).length,
            AppliesText:this.weeklyOwnCount > 0
                ? `All staff, except ${this.weeklyOwnCount} with their own`
                : 'All staff',
            Remarks:this.weeklySavedRemarks
        }];
    }

    editWeekly():
        void
    {
        this.resetWeekly();
        this.weeklyEditing = true;
        this.cdr.detectChanges();
    }

    // Back to the list (what was typed and not saved is dropped)
    closeWeekly():
        void
    {
        this.resetWeekly();
        this.weeklyEditing = false;
        this.cdr.detectChanges();
    }

    weeklySaving =
        false;

    // The page has the two sections
    get hasSections(): boolean
    {
        return this.page.key === 'holidays';
    }

    // The Weekly Holidays section is on screen
    get isWeekly(): boolean
    {
        return this.hasSections && this.section === 'weekly';
    }

    get weeklyChanged(): boolean
    {
        return this.weeklyDays !== this.weeklySavedDays || this.weeklyRemarks.trim() !== this.weeklySavedRemarks;
    }

    get weeklyText(): string
    {
        return hrWeekDaysText(this.weeklyDays);
    }

    weeklyOn(day: string): boolean
    {
        return this.weeklyDays.split(',').includes(day);
    }

    onSection(value: string):
        void
    {
        this.section = value === 'public' ? 'public' : 'weekly';
        this.weeklyEditing = false;
        this.cdr.detectChanges();
    }

    toggleWeekly(day: string):
        void
    {
        if (this.weeklySaving)
        {
            return;
        }

        this.weeklyDays = hrToggleWeekDay(this.weeklyDays, day);
        this.cdr.detectChanges();
    }

    onWeeklyRemarks(value: any):
        void
    {
        this.weeklyRemarks = String(value ?? '');
        this.cdr.detectChanges();
    }

    private setWeekly(w: { WeeklyOffDays: string; Remarks: string; OwnCount: number }):
        void
    {
        this.weeklyDays = this.weeklySavedDays = w.WeeklyOffDays;
        this.weeklyRemarks = this.weeklySavedRemarks = w.Remarks;
        this.weeklyOwnCount = w.OwnCount;
    }

    private loadWeekly():
        void
    {
        this.weeklyLoading = true;

        this.service
            .getWeeklyHoliday()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:w =>
                {
                    this.setWeekly(w);
                    this.weeklyLoading = false;
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.weeklyLoading = false;
                    this.toast.error('Error', error?.error?.message ?? 'The weekly holiday could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    resetWeekly():
        void
    {
        this.weeklyDays = this.weeklySavedDays;
        this.weeklyRemarks = this.weeklySavedRemarks;
        this.cdr.detectChanges();
    }

    saveWeekly():
        void
    {
        if (this.weeklySaving)
        {
            return;
        }

        if (!this.weeklyChanged)
        {
            this.toast.info('Weekly Holiday', 'Nothing is changed.');
            return;
        }

        if (this.weeklyDays.split(',').filter(Boolean).length >= 7)
        {
            this.toast.error('Validation', 'The week needs at least one working day.');
            return;
        }

        const save =
            () =>
            {
                this.weeklySaving = true;

                this.progressDialog.show('Saving', 'Saving the weekly holiday...', false);

                this.service
                    .saveWeeklyHoliday(this.weeklyDays, this.weeklyRemarks.trim())
                    .subscribe(
                    {
                        next:w =>
                        {
                            this.progressDialog.finish(() =>
                            {
                                this.weeklySaving = false;
                                this.weeklyEditing = false;
                                this.setWeekly(w);
                                this.toast.success('Saved', `Weekly holiday : ${this.weeklyText}.`);
                                this.cdr.detectChanges();
                            });
                        },
                        error:error =>
                        {
                            this.progressDialog.fail();
                            this.weeklySaving = false;
                            this.toast.error('Error', error?.error?.message ?? 'The weekly holiday could not be saved.');
                            this.cdr.detectChanges();
                        }
                    });
            };

        this.confirmDialog.open(
            'Change Weekly Holiday',
            `The weekly holiday becomes ${this.weeklyText} for every employee who has no weekly holiday of their own. Attendance and salary sheets worked out from now on use it, also for earlier dates.`,
            save,
            'Save',
            'Cancel',
            'primary');
    }

    page:
        HrSetupPage =
        HR_SETUP_PAGES['shifts'];


    selectedTab =
        'all';

    // The status filter : a dropdown on the toolbar
    readonly statusItems =
    [
        { label:'All Status', value:'all' },
        { label:'Active', value:'active' },
        { label:'Inactive', value:'inactive' }
    ];

    filterItems:
        HrSetupOption[] = [];

    selectedFilter =
        '';

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    private all:
        HrSetupRow[] = [];

    rows:
        HrSetupRow[] = [];

    totalRecords =
        0;

    currentPage =
        1;

    pageSize =
        10;

    summaryItems:
        HrSetupSummaryItem[] = [];

    historyOpened =
        false;

    historyItems:
        any[] = [];

    readonly canvasConfig:
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

    columns:
        ListTableColumn[] = [];

    get historyTitle(): string
    {
        return `${this.page.singular} History`;
    }

    get searchPlaceholder(): string
    {
        return `Search ${this.page.title.toLowerCase()}...`;
    }

    ngOnInit():
        void
    {
        const key =
            this.route.snapshot.data['hrSetup'] as HrSetupKey;

        this.page =
            HR_SETUP_PAGES[key] ?? HR_SETUP_PAGES['shifts'];

        this.columns =
        [
            { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
            ...this.page.columns,
            { header:'Status', field:'IsActive', type:'status', width:'110px', align:'center' },
            { header:'Actions', field:'actions', type:'actions', width:'120px', align:'center' }
        ];

        this.load();

        if (this.hasSections)
        {
            this.loadWeekly();
        }
    }

    private load():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.service
            .getAll(this.page)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        rows.map(x => ({ ...x, ...this.page.display(x) }) as HrSetupRow);

                    if (this.page.filter)
                    {
                        this.filterItems =
                        [
                            { label:this.page.filter.placeholder, value:'' },
                            ...this.page.filter.items(this.all)
                        ];

                        if (!this.filterItems.some(x => x.value === this.selectedFilter))
                        {
                            this.selectedFilter = '';
                        }
                    }

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? `${this.page.title} could not be loaded.`);
                    this.cdr.detectChanges();
                }
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const filterField =
            this.page.filter?.field ?? '';

        // search + filter (the tab is applied after : the summary
        // counts all statuses)
        const base =
            this.all.filter(x =>
                (!this.selectedFilter || !filterField || String(x[filterField] ?? '') === this.selectedFilter)
                &&
                (!find || this.page.search.some(f => String(x[f] ?? '').toLowerCase().includes(find))));

        const matched =
            base.filter(x =>
                this.selectedTab === 'all' || (this.selectedTab === 'active') === x.IsActive);

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        const count =
            (value: number): string => value.toLocaleString('en-US');

        this.summaryItems =
        [
            { label:'Total', value:count(base.length), tone:'' },
            { label:'Active', value:count(base.filter(x => x.IsActive).length), tone:'ok' },
            { label:'Inactive', value:count(base.filter(x => !x.IsActive).length), tone:'bad' },
            ...(this.page.summary ? this.page.summary(base) : [])
        ];

        this.cdr.detectChanges();
    }

    onTabChange(value: string):
        void
    {
        this.selectedTab = value || 'all';
        this.currentPage = 1;
        this.apply();
    }

    onFilterChange(value: any):
        void
    {
        this.selectedFilter = String(value ?? '');
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
        // Short list : it stays in its own order
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    view(row: HrSetupRow):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    edit(row: HrSetupRow):
        void
    {
        void this.router.navigate(['../edit', row.PublicId], { relativeTo:this.route });
    }

    refresh():
        void
    {
        if (this.isWeekly)
        {
            this.loadWeekly();
            return;
        }

        this.load();
    }

    delete(row: HrSetupRow):
        void
    {
        this.confirmDialog.open(
            `Delete ${this.page.singular}`,
            `Delete ${row.Code} ${row.Name}?`,
            () =>
                this.service.delete(this.page, row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);
                        this.load();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? `The ${this.page.singular.toLowerCase()} could not be deleted.`)
                }),
            'Delete',
            'Keep',
            'danger'
        );
    }

    restore():
        void
    {
        this.confirmDialog.open(
            `Restore ${this.page.singular}`,
            `Bring back the most recently deleted ${this.page.singular.toLowerCase()}?`,
            () =>
                this.service.restore(this.page).subscribe(
                {
                    next:code =>
                    {
                        this.toast.success('Restored', code ? `${code} was restored.` : `The ${this.page.singular.toLowerCase()} was restored.`);
                        this.load();
                    },
                    error:error =>
                        this.toast.error('Restore', error?.error?.message ?? 'Nothing was restored.')
                }),
            'Restore',
            'Cancel',
            'primary'
        );
    }

    openHistory():
        void
    {
        this.service
            .getHistory(this.page)
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
                error:() =>
                    this.toast.error('Error', 'The history could not be loaded.')
            });
    }

    closeHistory():
        void
    {
        this.historyOpened = false;
        this.cdr.detectChanges();
    }
}
