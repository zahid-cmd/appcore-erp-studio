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

import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../shared/components/layout/page-toolbar/page-toolbar';
import { ControlTab, ControlTabsComponent } from '../../../../shared/components/controls/control-tabs/control-tabs';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ListTableColumn, ListTableComponent } from '../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../human-resource-manangement/services/hr-progress.service';

import { FaService } from '../../shared/fa.service';

import
{
    FA_EMPTY_GUID,
    FaLocation,
    FaLookup,
    faStatusColor
}
from '../../shared/fa.models';


//===============================================================
// Model
//===============================================================

type ListRow =
    FaLocation
    &
    {
        StatusText: string;
        StatusColor: string;
    };


//===============================================================
// Asset Locations (Fixed Assets > Asset Setup)
//
// The places of a branch where assets are kept (a room, a floor,
// a store). An asset card can name its location; a transfer moves
// it; the physical count is done location by location. The code
// is made by the server.
//
//   list / add / edit/:id / view/:id   (one component)
//===============================================================

@Component(
{
    selector:'asset-locations',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
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
    templateUrl:'./asset-locations.html',
    styleUrl:'./asset-locations.css'
})
export class AssetLocationsPage
implements OnInit
{
    private readonly fa = inject(FaService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

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

    // The tabs of the list
    readonly tabs:
        ControlTab[] =
    [
        { id:'all', label:'All Locations' },
        { id:'used', label:'Holding Assets' },
        { id:'empty', label:'No Assets Yet' }
    ];

    selectedTab =
        'all';

    onTab(value: string):
        void
    {
        this.selectedTab = value || 'all';
        this.currentPage = 1;
        this.apply();
    }

    readonly statusItems =
    [
        { label:'All', value:'' },
        { label:'Active', value:'active' },
        { label:'Inactive', value:'inactive' }
    ];

    // 0 : all branches
    branchFilter =
        0;

    // The branches of the rows
    branchFilterItems:
        { label: string; value: number }[] = [{ label:'All branches', value:0 }];

    historyOpened =
        false;

    historyItems:
        any[] = [];

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Code', field:'Code', width:'100px', align:'center' },
        { header:'Location', field:'Name', width:'240px', align:'left' },
        { header:'Branch', field:'BranchName', width:'200px', align:'left' },
        { header:'Assets', field:'AssetCount', width:'80px', align:'center' },
        { header:'Remarks', field:'Remarks', width:'280px', align:'left' },
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

    // 0 : not chosen
    branchId =
        0;

    isActive =
        true;

    remarks =
        '';

    // Assets kept at the location (its branch is then fixed)
    assetCount =
        0;

    branches:
        FaLookup[] = [];

    get isViewMode(): boolean
    {
        return this.mode === 'view';
    }

    get pageTitle(): string
    {
        return this.mode === 'add' ? 'Add Asset Location'
            : this.mode === 'edit' ? 'Update Asset Location'
            : 'View Asset Location';
    }

    get saveText(): string
    {
        return this.mode === 'edit' ? 'Update' : 'Save';
    }

    // The code a new location gets
    nextCode =
        '';

    get codeText(): string
    {
        return this.mode === 'add' ? this.nextCode : this.code;
    }

    // The branch of a location that holds assets cannot be changed
    get branchLocked(): boolean
    {
        return this.isViewMode || (this.mode === 'edit' && this.assetCount > 0);
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

        this.fa
            .getLookups()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:lookups =>
                {
                    this.branches = lookups?.Branches ?? [];
                    this.nextCode = lookups?.NextLocationCode ?? '';
                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The branches could not be loaded.')
            });

        if (this.mode === 'add')
        {
            return;
        }

        this.loading = true;

        this.fa
            .getLocation(this.entityId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:l =>
                {
                    this.code = l.Code ?? '';
                    this.name = l.Name ?? '';
                    this.branchId = Number(l.BranchId) || 0;
                    this.isActive = l.IsActive !== false;
                    this.remarks = l.Remarks ?? '';
                    this.assetCount = Number(l.AssetCount) || 0;
                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The asset location could not be loaded.')
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

        this.fa
            .getLocations()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        (Array.isArray(rows) ? rows : []).map(x => ({
                            ...x,
                            StatusText:x.IsActive ? 'Active' : 'Inactive',
                            StatusColor:faStatusColor(x.IsActive ? 'Active' : 'Inactive')
                        }));

                    const names = new Map<number, string>();

                    for (const row of this.all)
                    {
                        if (!names.has(row.BranchId))
                        {
                            names.set(row.BranchId, row.BranchName ?? '');
                        }
                    }

                    this.branchFilterItems =
                    [
                        { label:'All branches', value:0 },
                        ...[...names.entries()]
                            .map(([value, label]) => ({ label, value }))
                            .sort((a, b) => a.label.localeCompare(b.label))
                    ];

                    if (this.branchFilter && !names.has(this.branchFilter))
                    {
                        this.branchFilter = 0;
                    }

                    this.loading = false;
                    this.apply();
                },
                error:error => this.failed(error, 'Asset locations could not be loaded.')
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const matched =
            this.all.filter(x =>
                (this.selectedTab === 'all' || (this.selectedTab === 'used') === (x.AssetCount > 0))
                &&
                (!this.statusFilter || (this.statusFilter === 'active') === x.IsActive)
                &&
                (!this.branchFilter || x.BranchId === this.branchFilter)
                &&
                (!find || [x.Code, x.Name, x.BranchName, x.Remarks]
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

    onBranchFilter(value: any):
        void
    {
        this.branchFilter = Number(value) || 0;
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
            'Delete Asset Location',
            `Delete ${row.Code} ${row.Name}?`,
            () =>
                this.fa.deleteLocation(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);
                        this.loadList();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The asset location could not be deleted.')
                }),
            'Delete',
            'Keep',
            'danger');
    }

    restore():
        void
    {
        this.confirmDialog.open(
            'Restore Asset Location',
            'Bring back the most recently deleted asset location?',
            () =>
                this.fa.restoreLocation().subscribe(
                {
                    next:x =>
                    {
                        this.toast.success('Restored', x?.Message || 'The asset location was restored.');
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
        this.fa
            .getHistory('asset-setup/asset-locations')
            .subscribe(
            {
                next:items =>
                {
                    this.historyItems = items;
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

    onName(value: any):
        void
    {
        this.name = String(value ?? '');
    }

    onBranch(value: any):
        void
    {
        this.branchId = Number(value) || 0;
        this.cdr.detectChanges();
    }

    onActive(event: Event):
        void
    {
        this.isActive = (event.target as HTMLInputElement).checked;
        this.cdr.detectChanges();
    }

    onRemarks(value: any):
        void
    {
        this.remarks = String(value ?? '');
    }

    onSave():
        void
    {
        if (this.isSaving || this.isViewMode)
        {
            return;
        }

        if (!this.name.trim())
        {
            this.toast.error('Validation', 'Give the location a name.');
            return;
        }

        if (!this.branchId)
        {
            this.toast.error('Validation', 'Choose the branch of the location.');
            return;
        }

        const body: Partial<FaLocation> =
        {
            PublicId:this.entityId || FA_EMPTY_GUID,
            Code:this.code,
            Name:this.name.trim(),
            BranchId:this.branchId,
            Remarks:this.remarks.trim(),
            IsActive:this.isActive
        };

        this.isSaving = true;

        this.progressDialog.show('Saving', 'Saving the asset location...', false);

        this.fa.saveLocation(this.mode === 'edit' ? this.entityId : '', body).subscribe(
        {
            next:() =>
                this.progressDialog.finish(() =>
                {
                    this.isSaving = false;
                    this.toast.success('Success', `${body.Name} was ${this.mode === 'edit' ? 'updated' : 'saved'}.`);
                    this.goToList();
                }),
            error:error =>
            {
                this.progressDialog.fail();
                this.isSaving = false;
                this.toast.error('Error', error?.error?.message ?? 'The asset location could not be saved.');
                this.cdr.detectChanges();
            }
        });
    }
}
