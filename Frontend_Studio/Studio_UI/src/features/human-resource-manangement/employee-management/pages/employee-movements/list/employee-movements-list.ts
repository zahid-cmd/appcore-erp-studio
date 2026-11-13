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
    EmployeeMovement,
    MOVEMENT_COLORS
}
from '../../../models/employee-movements.model';

import
{
    EmployeeMovementsService
}
from '../../../services/employee-movements.service';


type MovementRow =
    EmployeeMovement
    &
    {
        EmployeeText:
            string;

        DateText:
            string;

        TypeColor:
            string;
    };

const MONTHS =
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// yyyy-MM-dd -> 13 Nov 2026
function dayText(value: string): string
{
    const m =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

    return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
}


//===============================================================
// Employee Movements List (Human Resource > Employee Management)
//
// Loaded once, filtered / paged in the page. Tabs by movement
// type; summary line below the canvas. A movement is not edited :
// Delete takes back the employee's latest one.
//===============================================================

@Component(
{
    selector:'employee-movements-list',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./employee-movements-list.html',
    styleUrl:'./employee-movements-list.css'
})
export class EmployeeMovementsList
implements OnInit
{
    private readonly service = inject(EmployeeMovementsService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    readonly tabs:
        ControlTab[] =
    [
        { id:'all', label:'All' },
        { id:'Increment', label:'Increment' },
        { id:'Promotion', label:'Promotion' },
        { id:'Transfer', label:'Transfer' },
        { id:'Confirmation', label:'Confirmation' },
        { id:'Separation', label:'Separation' }
    ];

    // A movement is not edited
    readonly tableActions =
    {
        view:true,
        edit:false,
        delete:true
    };

    selectedTab =
        'all';

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    private all:
        MovementRow[] = [];

    rows:
        MovementRow[] = [];

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
        { header:'Employee', field:'EmployeeText', width:'240px', align:'left' },
        { header:'Movement', field:'MovementType', width:'140px', align:'left', dotField:'TypeColor' },
        { header:'Effective', field:'DateText', width:'120px', align:'center' },
        { header:'What Changed', field:'Summary', width:'460px', align:'left' },
        { header:'Actions', field:'actions', type:'actions', width:'100px', align:'center' }
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
                            EmployeeText:`${x.EmployeeCode}  ${x.EmployeeName}`,
                            DateText:dayText(x.EffectiveDate),
                            TypeColor:MOVEMENT_COLORS[x.MovementType] ?? '#64748b'
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'Employee movements could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        // search (the tab is applied after : the summary counts
        // every type)
        const base =
            this.all.filter(x =>
                !find || [x.Code, x.EmployeeCode, x.EmployeeName, x.MovementType, x.DateText, x.Summary, x.Remarks]
                    .some(v => (v ?? '').toLowerCase().includes(find)));

        const matched =
            base.filter(x => this.selectedTab === 'all' || x.MovementType === this.selectedTab);

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        const count =
            (type: string): string => base.filter(x => x.MovementType === type).length.toLocaleString('en-US');

        this.summaryItems =
        [
            { label:'Total', value:base.length.toLocaleString('en-US'), tone:'' },
            { label:'Increments', value:count('Increment'), tone:'ok' },
            { label:'Promotions', value:count('Promotion'), tone:'' },
            { label:'Transfers', value:count('Transfer'), tone:'' },
            { label:'Confirmations', value:count('Confirmation'), tone:'' },
            { label:'Separations', value:count('Separation'), tone:'bad' }
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
        // Newest movement first
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    view(row: MovementRow):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    refresh():
        void
    {
        this.load();
    }

    delete(row: MovementRow):
        void
    {
        if (!row.IsLatest)
        {
            this.toast.error('Employee Movements', `${row.Code} is not the latest movement of ${row.EmployeeName} : delete the later ones first.`);
            return;
        }

        this.confirmDialog.open(
            'Take Back Movement',
            `Delete ${row.Code} (${row.MovementType} of ${row.EmployeeName})? The employee goes back to what was before it${row.MovementType === 'Separation' ? ' and becomes Active again' : ''}.`,
            () =>
                this.service.delete(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was taken back.`);
                        this.load();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The employee movement could not be deleted.')
                }),
            'Delete',
            'Keep',
            'danger'
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
