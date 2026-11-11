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
import { DropdownComponent } from '../../../../../../shared/components/controls/dropdown/dropdown';
import { SearchBoxComponent } from '../../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { ListTableComponent, ListTableColumn, ListTableRowAction, ListTableRowActionEvent } from '../../../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    PdiTemplateListItem
}
from '../../../models/pdi-templates.model';

import
{
    PdiTemplatesService
}
from '../../../services/pdi-templates.service';


type PdiTemplateRow =
    PdiTemplateListItem
    &
    {
        SectionsText:
            string;
    };


//===============================================================
// PDI Templates List (Settings > Service Settings)
//===============================================================

@Component(
{
    selector:'pdi-templates-list',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        DropdownComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./pdi-templates-list.html',
    styleUrl:'./pdi-templates-list.css'
})
export class PdiTemplatesList
implements OnInit
{
    private readonly service = inject(PdiTemplatesService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    // Status filter (page toolbar, right)
    readonly statusItems:
        { label: string; value: string }[] =
    [
        { label:'All Status', value:'all' },
        { label:'Active', value:'active' },
        { label:'Inactive', value:'inactive' }
    ];

    selectedStatus =
        'all';

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    private all:
        PdiTemplateRow[] = [];

    rows:
        PdiTemplateRow[] = [];

    totalRecords =
        0;

    currentPage =
        1;

    pageSize =
        10;

    historyOpened =
        false;

    historyTitle =
        'PDI Template History';

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
        { header:'Code', field:'Code', width:'110px', align:'center' },
        { header:'Template Name', field:'Name', width:'280px', align:'left' },
        { header:'Bike Models', field:'ModelsText', width:'360px', align:'left' },
        { header:'Sheet', field:'SectionsText', width:'190px', align:'center' },
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
                            SectionsText:`${x.SectionCount} section${x.SectionCount === 1 ? '' : 's'} · ${x.ItemCount} item${x.ItemCount === 1 ? '' : 's'}`
                        }));
                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'PDI templates could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const matched =
            this.all.filter(x =>
                (this.selectedStatus === 'all' || (this.selectedStatus === 'active') === x.IsActive)
                &&
                (!find || [x.Code, x.Name, x.ModelsText].some(v => (v ?? '').toLowerCase().includes(find))));

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

    onStatusChange(value: any):
        void
    {
        this.selectedStatus = String(value ?? 'all') || 'all';
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
        // The list is short : it stays in code order
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    // Blank PDI sheet (Bike + Office copy)
    readonly rowActions:
        ListTableRowAction[] =
    [
        {
            key:'print',
            icon:'fas fa-print',
            title:'Print the blank PDI sheet (Bike + Office copy)',
            tone:'primary',
            visible:(row: PdiTemplateRow) => !!row.PublicId
        }
    ];

    onRowAction(event: ListTableRowActionEvent):
        void
    {
        if (event.key === 'print')
        {
            this.openPrint((event.row as PdiTemplateRow).PublicId);
        }
    }

    // Opens the print viewer in a new tab (the session's login is kept)
    private openPrint(publicId: string):
        void
    {
        if (!publicId)
        {
            return;
        }

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(['/print-viewer', 'pdi-templates', publicId], { queryParams:{ doc:'blank-pdi-sheet' } }));

        if (!window.open(url, '_blank'))
        {
            this.toast.warning('Print', 'The print tab was blocked by the browser. Allow pop-ups for this site and try again.');
        }
    }

    view(row: PdiTemplateRow):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    edit(row: PdiTemplateRow):
        void
    {
        void this.router.navigate(['../edit', row.PublicId], { relativeTo:this.route });
    }

    refresh():
        void
    {
        this.load();
    }

    delete(row: PdiTemplateRow):
        void
    {
        this.confirmDialog.open(
            'Delete PDI Template',
            `Delete ${row.Code} ${row.Name}? Its models will need another template before their bikes can be delivered.`,
            () =>
                this.service.delete(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);
                        this.load();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The template could not be deleted.')
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
            'Restore PDI Template',
            'Bring back the most recently deleted PDI template?',
            () =>
                this.service.restore().subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Restored', 'The PDI template was restored.');
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
