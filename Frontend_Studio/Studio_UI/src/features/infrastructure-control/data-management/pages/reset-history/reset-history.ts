//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    OnInit,
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
    PageHeaderComponent
}
from '../../../../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    CommandCenterComponent
}
from '../../../../../shared/components/utilities/command-center/command-center';

import
{
    SearchBoxComponent
}
from '../../../../../shared/components/utilities/search-box/search-box';

import
{
    OrbitLoaderComponent
}
from '../../../../../shared/components/utilities/orbit-loader/orbit-loader';

import
{
    PageCanvasComponent,
    PageCanvasConfig
}
from '../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    PaginationComponent
}
from '../../../../../shared/components/controls/pagination/pagination';

import
{
    ToastService
}
from '../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../shared/components/utilities/toast/toast';

import
{
    DataHistory,
    apiError,
    formatCount,
    formatDateTime
}
from '../../models/data-management.model';

import
{
    DataManagementService
}
from '../../services/data-management.service';


type ActionFilter =
    'All' | 'Reset' | 'Restore' | 'Backup' | 'Delete' | 'Copy' | 'Failed';


//===============================================================
// Reset History
//
//   Every backup, restore, reset, copy and delete (history.jsonl
//   in the backup folders, so it survives any reset or restore).
//   A reset row opens the list of tables it cleared.
//   AppCore Admin (RP-001) only.
//===============================================================

@Component(
{
    selector:'reset-history',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        CommandCenterComponent,
        SearchBoxComponent,
        OrbitLoaderComponent,
        PageCanvasComponent,
        PaginationComponent,
        ToastComponent
    ],

    templateUrl:'./reset-history.html',

    styleUrls:
    [
        '../database-backups/database-backups.css',
        './reset-history.css'
    ]
})
export class ResetHistoryPage
    implements OnInit
{
    private readonly service =
        inject(DataManagementService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    // List canvas (same contract as the other list pages)
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

    currentPage = 1;

    pageSize = 10;

    loading = true;

    allowed = false;

    items: DataHistory[] = [];

    filter: ActionFilter = 'All';

    searchText = '';

    openId = '';

    readonly filters: ActionFilter[] =
        ['All', 'Reset', 'Restore', 'Backup', 'Copy', 'Delete', 'Failed'];

    readonly formatCount = formatCount;

    readonly formatDateTime = formatDateTime;

    ngOnInit():
        void
    {
        this.service
            .access()
            .subscribe(
            {
                next:allowed =>
                {
                    this.allowed = allowed;

                    if (allowed)
                    {
                        this.load();
                    }
                    else
                    {
                        this.loading = false;
                        this.refreshView();
                    }
                },
                error:() =>
                {
                    this.loading = false;
                    this.refreshView();
                }
            });
    }

    refresh():
        void
    {
        if (!this.allowed)
        {
            return;
        }

        this.filter = 'All';
        this.searchText = '';
        this.openId = '';
        this.load();
    }

    private load():
        void
    {
        this.loading = true;
        this.refreshView();

        this.service
            .history()
            .subscribe(
            {
                next:items =>
                {
                    this.items = items;
                    this.loading = false;
                    this.refreshView();
                },
                error:error =>
                {
                    this.loading = false;
                    this.toast.error('Reset History', apiError(error, 'The history could not be read.'));
                    this.refreshView();
                }
            });
    }

    count
    (
        filter: ActionFilter
    ):
        number
    {
        return this.items.filter(x => this.matchesFilter(x, filter)).length;
    }

    private matchesFilter
    (
        item: DataHistory,
        filter: ActionFilter
    ):
        boolean
    {
        if (filter === 'All')
        {
            return true;
        }

        if (filter === 'Failed')
        {
            return item.Status === 'Failed';
        }

        return item.Action === filter;
    }

    setFilter
    (
        filter: ActionFilter
    ):
        void
    {
        this.filter = filter;
        this.currentPage = 1;
        this.refreshView();
    }

    onSearch
    (
        value: string
    ):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;
        this.refreshView();
    }

    get visible():
        DataHistory[]
    {
        const text =
            this.searchText.trim().toLowerCase();

        return this.items.filter(x =>
            this.matchesFilter(x, this.filter)
            &&
            (!text
                || [x.Action, x.Database, x.ConnectionName, x.FileName, x.Reason, x.Details, x.By, x.Error]
                    .join(' ')
                    .toLowerCase()
                    .includes(text)));
    }

    toggle
    (
        item: DataHistory
    ):
        void
    {
        if (!item.Tables?.length)
        {
            return;
        }

        this.openId =
            this.openId === item.Id ? '' : item.Id;

        this.refreshView();
    }

    actionIcon
    (
        action: string
    ):
        string
    {
        switch (action)
        {
            case 'Reset': return 'fa-solid fa-broom';
            case 'Restore': return 'fa-solid fa-clock-rotate-left';
            case 'Backup': return 'fa-solid fa-floppy-disk';
            case 'Copy': return 'fa-solid fa-copy';
            case 'Delete': return 'fa-solid fa-trash';
            default: return 'fa-solid fa-circle';
        }
    }

    //===========================================================
    // Pagination
    //===========================================================

    onPageChange
    (
        page: number
    ):
        void
    {
        this.currentPage = page;
        this.refreshView();
    }

    onPageSizeChange
    (
        size: number
    ):
        void
    {
        this.pageSize = size;
        this.currentPage = 1;
        this.refreshView();
    }

    get pagedItems():
        DataHistory[]
    {
        const list =
            this.visible;

        const pages =
            Math.max(1, Math.ceil(list.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start =
            (this.currentPage - 1) * this.pageSize;

        return list.slice(start, start + this.pageSize);
    }

    private refreshView():
        void
    {
        this.cdr.markForCheck();
        this.cdr.detectChanges();
    }
}
