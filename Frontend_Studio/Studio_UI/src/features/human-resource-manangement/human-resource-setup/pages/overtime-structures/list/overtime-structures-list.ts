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

import
{
    OvertimeStructure,
    overtimeNumber,
    overtimeRateText
}
from '../../../models/overtime-structures.model';

import
{
    OvertimeStructuresService
}
from '../../../services/overtime-structures.service';


type StructureRow =
    OvertimeStructure
    &
    {
        RateText:
            string;

        HoursText:
            string;

        DaysText:
            string;

        DefaultText:
            string;
    };


//===============================================================
// Overtime Structures List (Human Resource Setup)
//
// Short setup list : loaded once, filtered / paged in the page.
// Tabs All / Active / Inactive; summary line below the canvas.
//===============================================================

@Component(
{
    selector:'overtime-structures-list',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        SearchDropdownComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./overtime-structures-list.html',
    styleUrl:'./overtime-structures-list.css'
})
export class OvertimeStructuresList
implements OnInit
{
    private readonly service = inject(OvertimeStructuresService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    readonly statusItems =
    [
        { label:'All Status', value:'all' },
        { label:'Active', value:'active' },
        { label:'Inactive', value:'inactive' }
    ];

    selectedTab =
        'all';

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    private all:
        StructureRow[] = [];

    rows:
        StructureRow[] = [];

    totalRecords =
        0;

    currentPage =
        1;

    pageSize =
        10;

    summaryItems:
        { label: string; value: string; tone: '' | 'ok' | 'bad' }[] = [];

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

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Code', field:'Code', width:'100px', align:'center' },
        { header:'Structure Name', field:'Name', width:'210px', align:'left' },
        { header:'Rate', field:'RateText', width:'210px', align:'left' },
        { header:'Extra Hours', field:'HoursText', width:'190px', align:'center' },
        { header:'Extra Days', field:'DaysText', width:'120px', align:'center' },
        { header:'Default', field:'DefaultText', width:'100px', align:'center' },
        { header:'Employees', field:'EmployeeCount', width:'100px', align:'center' },
        { header:'Status', field:'IsActive', type:'status', width:'110px', align:'center' },
        { header:'Actions', field:'actions', type:'actions', width:'120px', align:'center' }
    ];

    ngOnInit():
        void
    {
        this.load();
    }

    private load():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.service
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        rows.map(x => ({
                            ...x,
                            RateText:overtimeRateText(x),
                            HoursText:x.PayExtraHours ? `x ${overtimeNumber(x.HourMultiplier)}  (holiday x ${overtimeNumber(x.HolidayHourMultiplier)})` : 'Not paid',
                            DaysText:x.PayExtraDays ? `x ${overtimeNumber(x.DayMultiplier)}` : 'Not paid',
                            DefaultText:x.IsDefault ? 'Default' : ''
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'Overtime structures could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        // search (the tab is applied after : the summary counts all
        // statuses)
        const base =
            this.all.filter(x =>
                !find || [x.Code, x.Name, x.DefaultText, x.Remarks].some(v => (v ?? '').toLowerCase().includes(find)));

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
            { label:'Employees on a Structure', value:count(base.reduce((sum, x) => sum + x.EmployeeCount, 0)), tone:'' }
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
        // Short list : it stays in code order
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    view(row: StructureRow):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    edit(row: StructureRow):
        void
    {
        void this.router.navigate(['../edit', row.PublicId], { relativeTo:this.route });
    }

    refresh():
        void
    {
        this.load();
    }

    delete(row: StructureRow):
        void
    {
        if (row.EmployeeCount > 0)
        {
            this.toast.error('Overtime Structures', `${row.Code} ${row.Name} is the overtime structure of ${row.EmployeeCount} employee(s) : move them to another structure first, or make this one Inactive.`);
            return;
        }

        this.confirmDialog.open(
            'Delete Overtime Structure',
            `Delete ${row.Code} ${row.Name}?`,
            () =>
                this.service.delete(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);
                        this.load();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The overtime structure could not be deleted.')
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
            'Restore Overtime Structure',
            'Bring back the most recently deleted overtime structure?',
            () =>
                this.service.restore().subscribe(
                {
                    next:code =>
                    {
                        this.toast.success('Restored', code ? `${code} was restored.` : 'The overtime structure was restored.');
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
            .getHistory()
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
