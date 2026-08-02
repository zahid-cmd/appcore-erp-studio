//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    inject,
    ChangeDetectorRef
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    Router
}
from '@angular/router';

import
{
    PageHeaderComponent
}
from '../../../../../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    PageCanvasComponent,
    PageCanvasConfig
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    SearchBoxComponent
}
from '../../../../../../shared/components/utilities/search-box/search-box';

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    ListTableComponent,
    ListTableColumn
}
from '../../../../../../shared/components/layout/list-table/list-table';

import
{
    PaginationComponent
}
from '../../../../../../shared/components/controls/pagination/pagination';

import
{
    HistoryDrawerComponent
}
from '../../../../../../shared/components/utilities/history-drawer/history-drawer';

import
{
    ConfirmDialogComponent
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

import
{
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    RoleProfileService
}
from '../../services/role-profile.service';

import
{
    RoleProfile
}
from '../../models/role-profile.model';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-role-profile-list',

    standalone:true,

    imports:
    [
        CommonModule,

        PageHeaderComponent,

        PageToolbarComponent,

        ControlTabsComponent,

        SearchBoxComponent,

        CommandCenterComponent,

        PageCanvasComponent,

        ListTableComponent,

        PaginationComponent,

        ConfirmDialogComponent,

        ToastComponent,

        HistoryDrawerComponent
    ],

    templateUrl:'./role-profile-list.html',

    styleUrl:'./role-profile-list.css'
})

//===============================================================
// Role Profile List Component
//===============================================================

export class RoleProfileListComponent
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly roleProfileService =
        inject(RoleProfileService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Page Tabs
    //===========================================================

    tabs: ControlTab[] =
    [
        {
            id:'all',

            label:'All Role Profiles'
        }
    ];

    selectedTab =
        'all';

    //===========================================================
    // Data Source
    //===========================================================

    roleProfiles: RoleProfile[] =
    [];

    filteredRoleProfiles: RoleProfile[] =
    [];

    pagedRoleProfiles: RoleProfile[] =
    [];

    //===========================================================
    // Search & Loading
    //===========================================================

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    //===========================================================
    // Pagination
    //===========================================================

    currentPage =
        1;

    pageSize =
        10;

    //===========================================================
    // History Drawer
    //===========================================================

    historyOpened =
        false;

    historyTitle =
        'Role Profile Management History';

    historyItems:any[] =
    [];

    //===========================================================
    // Page Canvas Configuration
    //===========================================================

    readonly canvasConfig: PageCanvasConfig =
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

    //===========================================================
    // Table Columns
    //===========================================================

    readonly columns: ListTableColumn[] =
    [
        {
            header:'#',
            field:'serial',
            type:'serial',
            width:'60px',
            align:'center'
        },

        {
            header:'Code',
            field:'profileCode',
            width:'180px',
            align:'center'
        },

        {
            header:'Profile Name',
            field:'profileName',
            align:'left'
        },

        {
            header:'Display Name',
            field:'displayName',
            align:'left'
        },

        {
            header:'Order',
            field:'displayOrder',
            width:'100px',
            align:'center'
        },

        {
            header:'Status',
            field:'isActive',
            type:'status',
            width:'120px',
            align:'center'
        },

        {
            header:'Actions',
            field:'actions',
            type:'actions',
            width:'180px',
            align:'center'
        }
    ];

    //===========================================================
    // Component Initialization
    //===========================================================

    ngOnInit(): void
    {
        this.loadRoleProfiles();
    }
    //===========================================================
    // Load Role Profile Data
    //===========================================================

    loadRoleProfiles():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        this.roleProfileService
            .getAll()
            .subscribe(
            {
                next:(response) =>
                {
                    console.log('================================');
                    console.log('Role Profiles Response');
                    console.log(response);
                    console.log('Total Records:', response.length);
                    console.log('================================');

                    this.roleProfiles =
                    [
                        ...response
                    ];

                    this.filteredRoleProfiles =
                    [
                        ...response
                    ].sort(
                        (a, b) =>
                            a.profileCode.localeCompare(b.profileCode)
                    );

                    this.currentPage =
                        1;

                    this.updatePagination();

                    this.loading =
                        false;

                    this.loadFailed =
                        false;

                    this.cdr.detectChanges();

                    console.log('Change Detection Triggered');
                },

                error:(error) =>
                {
                    console.error('Load Role Profiles Error');
                    console.error(error);

                    this.roleProfiles =
                    [];

                    this.filteredRoleProfiles =
                    [];

                    this.pagedRoleProfiles =
                    [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error(
                        'Load Failed',
                        'Unable to load role profiles.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Search Role Profiles
    //===========================================================

    onSearch
    (
        value:string
    ):
        void
    {
        this.searchText =
            value;

        const keyword =
            value
                .trim()
                .toLowerCase();

        if (!keyword)
        {
            this.filteredRoleProfiles =
            [
                ...this.roleProfiles
            ];
        }
        else
        {
            this.filteredRoleProfiles =
                this.roleProfiles.filter(x =>

                    x.profileCode
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    x.profileName
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    x.displayName
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    x.remarks
                        ?.toLowerCase()
                        .includes(keyword)

                );
        }

        this.filteredRoleProfiles.sort(
            (a, b) =>
                a.profileCode.localeCompare(b.profileCode)
        );

        this.currentPage =
            1;

        this.updatePagination();
    }

    //===========================================================
    // Sort Role Profiles
    //===========================================================

    onSort
    (
        event:
        {
            field:string;
            direction:'asc' | 'desc';
        }
    ):
        void
    {
        this.filteredRoleProfiles =
        [
            ...this.filteredRoleProfiles
        ];

        this.filteredRoleProfiles.sort(
            (a:any, b:any) =>
            {
                const valueA =
                    a[event.field];

                const valueB =
                    b[event.field];

                if (valueA == null && valueB == null)
                {
                    return 0;
                }

                if (valueA == null)
                {
                    return -1;
                }

                if (valueB == null)
                {
                    return 1;
                }

                if
                (
                    typeof valueA === 'string' &&
                    typeof valueB === 'string'
                )
                {
                    return event.direction === 'asc'
                        ? valueA.localeCompare(valueB)
                        : valueB.localeCompare(valueA);
                }

                if (valueA < valueB)
                {
                    return event.direction === 'asc'
                        ? -1
                        : 1;
                }

                if (valueA > valueB)
                {
                    return event.direction === 'asc'
                        ? 1
                        : -1;
                }

                return 0;
            });

        this.currentPage =
            1;

        this.updatePagination();
    }

    //===========================================================
    // Refresh Role Profiles
    //===========================================================

    refresh():
        void
    {
        this.searchText =
            '';

        this.currentPage =
            1;

        this.loadRoleProfiles();
    }

    //===========================================================
    // Update Pagination
    //===========================================================

    updatePagination():
        void
    {
        const start =
            (this.currentPage - 1)
            *
            this.pageSize;

        this.pagedRoleProfiles =
        [
            ...this.filteredRoleProfiles.slice(
                start,
                start + this.pageSize
            )
        ];
    }

    //===========================================================
    // Page Change
    //===========================================================

    onPageChange
    (
        page:number
    ):
        void
    {
        this.currentPage =
            page;

        this.updatePagination();
    }

    //===========================================================
    // Page Size Change
    //===========================================================

    onPageSizeChange
    (
        size:number
    ):
        void
    {
        this.pageSize =
            size;

        this.currentPage =
            1;

        this.updatePagination();
    }
    //===========================================================
    // Add Role Profile
    //===========================================================

    add():
        void
    {
        this.router.navigate(
        [
            '/security-permission/role-management/role-profiles/new'
        ]);
    }

    //===========================================================
    // View Role Profile
    //===========================================================

    view(
        item: RoleProfile
    ):
        void
    {
        this.router.navigate(
        [
            '/security-permission/role-management/role-profiles/view',

            item.roleProfileId
        ]);
    }

    //===========================================================
    // Edit Role Profile
    //===========================================================

    edit(
        item: RoleProfile
    ):
        void
    {
        this.router.navigate(
        [
            '/security-permission/role-management/role-profiles/edit',

            item.roleProfileId
        ]);
    }

    //===========================================================
    // Delete Role Profile
    //===========================================================

    delete(
        item: RoleProfile
    ):
        void
    {
        this.confirmDialog.open(

            'Delete Role Profile',

            `Are you sure you want to delete "${item.profileName}" ?`,

            () =>
            {
                this.roleProfileService
                    .delete(item.roleProfileId)
                    .subscribe(
                    {
                        next: () =>
                        {
                            this.toast.success(
                                'Delete Successful',
                                `${item.profileName} deleted successfully.`
                            );

                            this.loadRoleProfiles();
                        },

                        error:(error) =>
                        {
                            console.error(error);

                            this.toast.error(
                                'Delete Failed',
                                'Failed to delete role profile.'
                            );
                        }
                    });
            }
        );
    }

    //===========================================================
    // Restore 
    //===========================================================

    restore():
        void
    {
        this.confirmDialog.open(

            'Restore Role Profile',

            'Are you sure you want to restore the most recently deleted role profile?',

            () =>
            {
                this.restoreRoleProfile();
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }

    //===========================================================
    // Restore Role Profile
    //===========================================================

    private restoreRoleProfile():
        void
    {
        this.roleProfileService
            .restore()

            .subscribe(
            {
                next: () =>
                {
                    this.toast.success(
                        'Restore Successful',
                        'The most recently deleted role profile has been restored.'
                    );

                    this.loadRoleProfiles();
                },

                error: (error) =>
                {
                    this.toast.error(
                        'Restore Failed',
                        error?.error ??
                        'Failed to restore role profile.'
                    );
                }
            });
    }

    //===========================================================
    // Open History Drawer
    //===========================================================

    openHistory():
        void
    {
        this.roleProfileService
            .getHistory()

            .subscribe(
            {
                next:(response:any[]) =>
                {
                    this.historyItems =
                        response.map(
                            item =>
                            ({
                                title:
                                    item.activityTitle,

                                description:
                                    item.activityDescription,

                                user:
                                    item.performedByName
                                    ??
                                    'System',

                                dateTime:
                                    new Date(
                                        item.performedDate
                                    )
                                    .toLocaleString(),

                                badge:
                                    item.activityType
                            })
                        );

                    this.historyTitle =
                        'Role Profile Management History';

                    this.historyOpened =
                        true;

                    this.cdr.detectChanges();
                },

                error:(error:any) =>
                {
                    console.error(
                        'History Load Failed',
                        error
                    );

                    this.toast.error(
                        'History',
                        'Failed to load role profile history.'
                    );
                }
            });
    }
    //===========================================================
    // Close History Drawer
    //===========================================================

    closeHistory():
        void
    {
        this.historyOpened =
            false;
    }
}