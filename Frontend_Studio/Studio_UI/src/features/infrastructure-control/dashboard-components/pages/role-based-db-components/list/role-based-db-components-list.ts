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
    HttpErrorResponse
}
from '@angular/common/http';

import
{
    ActivatedRoute,
    Router
}
from '@angular/router';


//===============================================================
// Models
//===============================================================

import
{
    RoleBasedDashboardComponents
}
from '../../../models/role-based-db-components.model';


//===============================================================
// Shared Components
//===============================================================

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
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';


//===============================================================
// Utility Components
//===============================================================

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    HistoryDrawerComponent
}
from '../../../../../../shared/components/utilities/history-drawer/history-drawer';

import
{
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    ConfirmDialogComponent
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';


//===============================================================
// Component Renderer
//===============================================================

import
{
    ComponentRenderer
}
from '../../../../../../core/component-renderer/component-renderer';


//===============================================================
// Service
//===============================================================

import
{
    RoleBasedDashboardComponentsService
}
from '../../../services/role-based-db-components.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'role-based-db-components-list',

    standalone:
        true,

    imports:
    [
        CommonModule,

        PageHeaderComponent,

        PageToolbarComponent,

        ControlTabsComponent,

        CommandCenterComponent,

        HistoryDrawerComponent,

        ConfirmDialogComponent,

        ToastComponent,

        ComponentRenderer
    ],

    templateUrl:
        './role-based-db-components-list.html',

    styleUrls:
    [
        './role-based-db-components-list.css',

        '../../../../../../shared/styles/component-page.css'
    ]
})


//===============================================================
// Role-Based Dashboard Components List Component
//===============================================================

export class RoleBasedDashboardComponentsList
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly rolebaseddashboardcomponentsservice =
        inject(RoleBasedDashboardComponentsService);


    private readonly confirmDialog =
        inject(ConfirmDialogService);


    private readonly toast =
        inject(ToastService);


    private readonly router =
        inject(Router);


    private readonly route =
        inject(ActivatedRoute);


    private readonly cdr =
        inject(ChangeDetectorRef);



    //===========================================================
    // Page Tabs
    //===========================================================

    tabs:
        ControlTab[] =
    [];


    selectedTab:
        string =
        '';



    //===========================================================
    // Role-Based Dashboard Components
    //===========================================================

    rolebaseddashboardcomponents:
        RoleBasedDashboardComponents[] =
    [];


    selectedComponent:
        RoleBasedDashboardComponents | null =
        null;



    //===========================================================
    // Loading
    //===========================================================

    loading:
        boolean =
        false;


    loadFailed:
        boolean =
        false;



    //===========================================================
    // History
    //===========================================================

    historyOpened:
        boolean =
        false;


    historyTitle:
        string =
        'Role-Based Dashboard Components History';


    historyItems:
        any[] =
    [];



    //===========================================================
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.loadItems();
    }



    //===========================================================
    // Load Role-Based Dashboard Components
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;


        this.loadFailed =
            false;


        this.rolebaseddashboardcomponentsservice
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        RoleBasedDashboardComponents[]
                ):
                    void =>
                {
                    this.rolebaseddashboardcomponents =
                    [
                        ...response
                    ];


                    console.log(
                        'Role-Based Dashboard Components Records:',
                        this.rolebaseddashboardcomponents
                    );


                    this.buildTabs();


                    this.selectInitialTab();


                    this.loading =
                        false;


                    this.loadFailed =
                        false;


                    this.cdr.detectChanges();
                },


                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error
                    (
                        'Load Role-Based Dashboard Components Error',

                        error
                    );


                    this.rolebaseddashboardcomponents =
                    [];


                    this.tabs =
                    [];


                    this.selectedTab =
                        '';


                    this.selectedComponent =
                        null;


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load role-based dashboard components.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Build Tabs
    //===========================================================

    private buildTabs():
        void
    {
        this.tabs =
            this.rolebaseddashboardcomponents
                .map
                (
                    (
                        component:
                            RoleBasedDashboardComponents
                    ):
                        ControlTab =>
                    ({
                        id:
                            String(
                                component.id
                            ),

                        label:
                            component.tabName
                    })
                );
    }



    //===========================================================
    // Select Initial Tab
    //===========================================================

    private selectInitialTab():
        void
    {
        if
        (
            this.tabs.length === 0
        )
        {
            this.selectedTab =
                '';

            this.selectedComponent =
                null;

            return;
        }


        const existingTab =
            this.tabs.find
            (
                tab =>
                    tab.id ===
                    this.selectedTab
            );


        if
        (
            existingTab
        )
        {
            this.selectTab(
                existingTab.id
            );

            return;
        }


        this.selectTab(
            this.tabs[0].id
        );
    }



    //===========================================================
    // Tab Changed
    //===========================================================

    onTabChange
    (
        tabId:
            string
    ):
        void
    {
        this.selectTab(
            tabId
        );
    }



    //===========================================================
    // Select Tab
    //===========================================================

    private selectTab
    (
        tabId:
            string
    ):
        void
    {
        this.selectedTab =
            tabId;


        this.selectedComponent =
            this.rolebaseddashboardcomponents
                .find
                (
                    component =>
                        String(
                            component.id
                        ) ===
                        tabId
                )
                ??
                null;


        console.log(
            'Role-Based Dashboard Selected Component:',
            this.selectedComponent
        );


        console.log(
            'Role-Based Dashboard Component Path:',
            this.selectedComponent?.componentPath
        );


        console.log(
            'Role-Based Dashboard Renderer Key:',
            this.getRendererKey(
                this.selectedComponent?.componentPath
                ??
                ''
            )
        );


        console.log(
            'Role-Based Dashboard Component Name:',
            this.selectedComponent?.name
        );


        console.log(
            'Role-Based Dashboard Component ID:',
            this.selectedComponent?.id
        );


        this.cdr.detectChanges();
    }



    //===========================================================
    // Get Renderer Key
    //
    // Converts the database componentPath into the key used
    // by the shared ComponentRenderer registry.
    //===========================================================

    getRendererKey
    (
        componentPath:
            string
    ):
        string
    {
        if
        (
            !componentPath
            ||
            !componentPath.trim()
        )
        {
            return '';
        }


        const normalizedPath =
            componentPath
                .trim()
                .replace(
                    /\\/g,
                    '/'
                )
                .replace(
                    /\/+/g,
                    '/'
                )
                .replace(
                    /\/$/,
                    ''
                );


        if
        (
            normalizedPath
                .toLowerCase()
                .startsWith(
                    'dashboard-customized-'
                )
        )
        {
            return normalizedPath
                .toLowerCase();
        }


        const pathParts =
            normalizedPath
                .split('/')
                .filter(
                    part =>
                        part.trim().length > 0
                );


        const dashboardIndex =
            pathParts.findIndex
            (
                part =>
                    part
                        .trim()
                        .toLowerCase()
                        ===
                        'dashboard-customized'
            );


        if
        (
            dashboardIndex < 0
        )
        {
            console.warn
            (
                'Role-Based Dashboard: Unable to resolve renderer key.',
                componentPath
            );


            return '';
        }


        const componentParts =
            pathParts.slice(
                dashboardIndex
            );


        return componentParts
            .join('-')
            .toLowerCase();
    }



    //===========================================================
    // Refresh
    //===========================================================

    refresh():
        void
    {
        this.selectedTab =
            '';


        this.selectedComponent =
            null;


        this.loadItems();
    }



    //===========================================================
    // Add
    //===========================================================

    add():
        void
    {
        void this.router.navigate
        (
            [
                'add'
            ],

            {
                relativeTo:
                    this.route.parent
            }
        );
    }



    //===========================================================
    // Edit
    //===========================================================

    edit
    (
        item:
            RoleBasedDashboardComponents
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',

                item.id
            ],

            {
                relativeTo:
                    this.route.parent
            }
        );
    }



    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        item:
            RoleBasedDashboardComponents
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Role-Based Dashboard Component',

            `Are you sure you want to delete "${item.name}" ?`,

            ():
                void =>
            {
                this.rolebaseddashboardcomponentsservice
                    .delete
                    (
                        item.id
                    )
                    .subscribe
                    ({
                        next:
                        ():
                            void =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',

                                `${item.name} deleted successfully.`
                            );


                            this.loadItems();
                        },


                        error:
                        (
                            error:
                                unknown
                        ):
                            void =>
                        {
                            console.error
                            (
                                'Delete Role-Based Dashboard Component Error',

                                error
                            );


                            this.toast.error
                            (
                                'Delete Failed',

                                'Failed to delete role-based dashboard component.'
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
        this.confirmDialog.open
        (
            'Restore Role-Based Dashboard Component',

            'Are you sure you want to restore the most recently deleted role-based dashboard component.',

            ():
                void =>
            {
                this.restoreItem();
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }



    //===========================================================
    // Restore Item
    //===========================================================

    private restoreItem():
        void
    {
        this.rolebaseddashboardcomponentsservice
            .restore()
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.toast.success
                    (
                        'Restore Successful',

                        'The most recently deleted role-based dashboard component has been restored.'
                    );


                    this.loadItems();
                },


                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error
                    (
                        'Restore Role-Based Dashboard Component Error',

                        error
                    );


                    if
                    (
                        error instanceof HttpErrorResponse
                        &&
                        error.status === 404
                    )
                    {
                        this.toast.info
                        (
                            'No Data to Restore',

                            'There is no deleted role-based dashboard component record to restore.'
                        );

                        return;
                    }


                    this.toast.error
                    (
                        'Restore Failed',

                        'Failed to restore role-based dashboard component.'
                    );
                }
            });
    }



    //===========================================================
    // Open History
    //===========================================================

    openHistory():
        void
    {
        this.rolebaseddashboardcomponentsservice
            .getHistory()
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ):
                    void =>
                {
                    this.historyItems =
                        response.map
                        (
                            history =>
                            ({
                                title:
                                    history.activityTitle,


                                description:
                                    history.activityDescription,


                                user:
                                    history.performedByName
                                    ??
                                    'System',


                                dateTime:
                                    new Date
                                    (
                                        history.performedDate
                                    )
                                    .toLocaleString(),


                                badge:
                                    history.activityType
                            })
                        );


                    this.historyTitle =
                        'Role-Based Dashboard Components Management History';


                    this.historyOpened =
                        true;


                    this.cdr.detectChanges();
                },


                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error
                    (
                        'History Load Failed',

                        error
                    );


                    this.toast.error
                    (
                        'History',

                        'Failed to load role-based dashboard components history.'
                    );
                }
            });
    }



    //===========================================================
    // Close History
    //===========================================================

    closeHistory():
        void
    {
        this.historyOpened =
            false;
    }

}