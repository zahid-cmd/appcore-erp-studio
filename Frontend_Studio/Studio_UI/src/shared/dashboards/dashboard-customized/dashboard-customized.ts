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
    ActivatedRoute,
    Router
}
from '@angular/router';


//===============================================================
// Shared Components
//===============================================================

import
{
    ComponentRenderer
}
from '../../../core/component-renderer/component-renderer';

import
{
    PageHeaderComponent
}
from '../../components/layout/page-header/page-header';

import
{
    CommandCenterComponent
}
from '../../components/utilities/command-center/command-center';

import
{
    OrbitLoaderComponent
}
from '../../components/utilities/orbit-loader/orbit-loader';

import
{
    EmptyStateComponent
}
from '../../components/layout/empty-state/empty-state';


//===============================================================
// Models & Services
//===============================================================

import
{
    WidgetConfiguration,
    WidgetConfigurationDetail
}
from '../../../features/infrastructure-control/application-configuration/models/widget-configuration.model';

import
{
    WidgetConfigurationService
}
from '../../../features/infrastructure-control/application-configuration/services/widget-configuration.service';

import
{
    RoleBasedDashboardComponents
}
from '../../../features/infrastructure-control/dashboard-components/models/role-based-db-components.model';

import
{
    RoleBasedDashboardComponentsService
}
from '../../../features/infrastructure-control/dashboard-components/services/role-based-db-components.service';


//===============================================================
// Dashboard Widget Host
//===============================================================

interface DashboardWidgetHost
{
    widgetConfigurationDetailId:
        number;

    widgetId:
        number;

    widgetCode:
        string;

    widgetName:
        string;

    componentPath:
        string;

    columnSpan:
        number;

    displayOrder:
        number;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'app-dashboard-customized',

    standalone:
        true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        CommandCenterComponent,
        OrbitLoaderComponent,
        ComponentRenderer,
        EmptyStateComponent
    ],

    templateUrl:
        './dashboard-customized.html',

    styleUrl:
        './dashboard-customized.css'
})


//===============================================================
// Dashboard Customized Component
//===============================================================

export class DashboardCustomizedComponent
implements
    OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly router =
        inject(Router);


    private readonly route =
        inject(ActivatedRoute);


    private readonly widgetconfigurationservice =
        inject(WidgetConfigurationService);


    private readonly rolebaseddashboardcomponentsservice =
        inject(RoleBasedDashboardComponentsService);


    private readonly cdr =
        inject(ChangeDetectorRef);



    //===========================================================
    // Dashboard ID
    //===========================================================

    dashboardId:
        number =
        0;



    //===========================================================
    // Widget Configuration
    //===========================================================

    widgetConfiguration:
        WidgetConfiguration
        |
        null =
        null;


    widgetConfigurationDetails:
        WidgetConfigurationDetail[]
    =
    [
    ];



    //===========================================================
    // Dashboard Widgets
    //===========================================================

    dashboardWidgets:
        DashboardWidgetHost[]
    =
    [
    ];



    //===========================================================
    // Role Based Dashboard Components
    //===========================================================

    roleBasedDashboardComponents:
        RoleBasedDashboardComponents[]
    =
    [
    ];



    //===========================================================
    // Loading State
    //===========================================================

    loading:
        boolean =
        false;


    loadFailed:
        boolean =
        false;



    //===========================================================
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.loadDashboard();
    }



    //===========================================================
    // Load Dashboard
    //===========================================================

    private loadDashboard():
        void
    {
        const id =
            Number(
                this.route.snapshot.paramMap.get(
                    'id'
                )
            );


        //=======================================================
        // Validate Dashboard ID
        //=======================================================

        if
        (
            !id
            ||
            id <= 0
        )
        {
            this.dashboardId =
                0;

            this.widgetConfiguration =
                null;

            this.widgetConfigurationDetails =
            [
            ];

            this.dashboardWidgets =
            [
            ];

            this.roleBasedDashboardComponents =
            [
            ];

            this.loading =
                false;

            this.loadFailed =
                true;

            this.cdr.detectChanges();

            return;
        }


        //=======================================================
        // Initialize State
        //=======================================================

        this.dashboardId =
            id;


        this.loading =
            true;

        this.loadFailed =
            false;


        this.widgetConfiguration =
            null;


        this.widgetConfigurationDetails =
        [
        ];


        this.dashboardWidgets =
        [
        ];


        this.roleBasedDashboardComponents =
        [
        ];


        //=======================================================
        // Load Widget Configuration
        //=======================================================

        this.widgetconfigurationservice
            .getByDashboardId(
                this.dashboardId
            )
            .subscribe(
            {
                next:
                    (
                        configuration:
                            WidgetConfiguration
                    ):
                        void =>
                {
                    this.widgetConfiguration =
                        configuration;


                    this.widgetConfigurationDetails =
                        configuration?.details
                        ??
                        [
                        ];


                    //===================================================
                    // No Configuration Details
                    //===================================================

                    if
                    (
                        this.widgetConfigurationDetails.length ===
                        0
                    )
                    {
                        this.dashboardWidgets =
                        [
                        ];

                        this.loading =
                            false;

                        this.loadFailed =
                            false;

                        this.cdr.detectChanges();

                        return;
                    }


                    //===================================================
                    // Load Role Based Dashboard Widget Definitions
                    //===================================================

                    this.loadRoleBasedDashboardComponents();
                },


                error:
                    (
                        error:
                            unknown
                    ):
                        void =>
                {
                    console.error(
                        'Load Customized Dashboard Configuration Error',
                        error
                    );


                    this.widgetConfiguration =
                        null;


                    this.widgetConfigurationDetails =
                    [
                    ];


                    this.dashboardWidgets =
                    [
                    ];


                    this.roleBasedDashboardComponents =
                    [
                    ];


                    /*
                       A Dashboard without a Widget Configuration
                       is a valid empty dashboard state.

                       The backend returns HTTP 404 when no
                       Widget Configuration exists for this
                       Dashboard ID.

                       Therefore:

                       404 = No Widgets Configured

                       Other HTTP errors remain genuine
                       dashboard load failures.
                    */

                    const status =
                        this.getHttpStatus(
                            error
                        );


                    if
                    (
                        status ===
                        404
                    )
                    {
                        this.loading =
                            false;

                        this.loadFailed =
                            false;

                        this.cdr.detectChanges();

                        return;
                    }


                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.cdr.detectChanges();
                }
            }
        );
    }



    //===========================================================
    // Get HTTP Status
    //===========================================================

    private getHttpStatus(
        error:
            unknown
    ):
        number
    {
        if
        (
            typeof error ===
            'object'
            &&
            error !== null
            &&
            'status' in error
        )
        {
            const status =
                (
                    error as
                    {
                        status?:
                            unknown;
                    }
                ).status;


            if
            (
                typeof status ===
                'number'
            )
            {
                return status;
            }
        }


        return 0;
    }



    //===========================================================
    // Load Role Based Dashboard Components
    //===========================================================

    private loadRoleBasedDashboardComponents():
        void
    {
        this.rolebaseddashboardcomponentsservice
            .getAll()
            .subscribe(
            {
                next:
                    (
                        components:
                            RoleBasedDashboardComponents[]
                    ):
                        void =>
                {
                    this.roleBasedDashboardComponents =
                        components
                        ??
                        [
                        ];


                    this.buildDashboardWidgets();


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
                    console.error(
                        'Load Role Based Dashboard Components Error',
                        error
                    );


                    this.roleBasedDashboardComponents =
                    [
                    ];


                    this.dashboardWidgets =
                    [
                    ];


                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.cdr.detectChanges();
                }
            }
        );
    }



    //===========================================================
    // Build Dashboard Widgets
    //===========================================================

    private buildDashboardWidgets():
        void
    {
        //=======================================================
        // Get Active Configuration Details
        //=======================================================

        const configuredDetails =
            this.widgetConfigurationDetails
                .filter(
                    detail =>
                        detail.isActive !== false
                        &&
                        Number(
                            detail.widgetId
                        ) > 0
                );


        //=======================================================
        // Resolve Widgets
        //=======================================================

        this.dashboardWidgets =
            configuredDetails
                .map(
                    (
                        detail
                    ):
                        DashboardWidgetHost
                        |
                        null =>
                    {
                        //===================================================
                        // Find Widget Definition
                        //===================================================

                        const widget =
                            this.roleBasedDashboardComponents.find(
                                component =>
                                    Number(
                                        component.id
                                    )
                                    ===
                                    Number(
                                        detail.widgetId
                                    )
                            );


                        //===================================================
                        // Widget Not Found
                        //===================================================

                        if
                        (
                            !widget
                        )
                        {
                            return null;
                        }


                        //===================================================
                        // Widget Inactive
                        //===================================================

                        if
                        (
                            widget.status === false
                        )
                        {
                            return null;
                        }


                        //===================================================
                        // Component Path
                        //===================================================

                        const componentPath =
                            (
                                widget.componentPath
                                ??
                                ''
                            )
                            .trim();


                        if
                        (
                            !componentPath
                        )
                        {
                            return null;
                        }


                        //===================================================
                        // Normalize Column Span
                        //===================================================

                        const configuredColumnSpan =
                            Number(
                                detail.columnSpan
                            );


                        const columnSpan =
                            [
                                3,
                                4,
                                6,
                                8,
                                12
                            ].includes(
                                configuredColumnSpan
                            )
                            ?
                            configuredColumnSpan
                            :
                            12;


                        //===================================================
                        // Normalize Display Order
                        //===================================================

                        const configuredDisplayOrder =
                            Number(
                                detail.displayOrder
                            );


                        const displayOrder =
                            configuredDisplayOrder > 0
                            ?
                            configuredDisplayOrder
                            :
                            999999;


                        //===================================================
                        // Create Dashboard Widget
                        //===================================================

                        return (
                            {
                                widgetConfigurationDetailId:
                                    Number(
                                        detail.widgetConfigurationDetailId
                                    ),

                                widgetId:
                                    Number(
                                        detail.widgetId
                                    ),

                                widgetCode:
                                    widget.code
                                    ??
                                    detail.widgetCode
                                    ??
                                    '',

                                widgetName:
                                    widget.name
                                    ??
                                    detail.widgetName
                                    ??
                                    '',

                                componentPath:
                                    componentPath,

                                columnSpan:
                                    columnSpan,

                                displayOrder:
                                    displayOrder
                            }
                        );
                    }
                )
                .filter(
                    (
                        widget
                    ):
                        widget is DashboardWidgetHost =>
                            widget !== null
                )
                .sort(
                    (
                        first,
                        second
                    ) =>
                        first.displayOrder -
                        second.displayOrder
                );
    }



    //===========================================================
    // Track Dashboard Widget
    //===========================================================

    trackByWidgetId(
        index:
            number,

        widget:
            DashboardWidgetHost
    ):
        number
    {
        return (
            widget.widgetConfigurationDetailId
            ||
            widget.widgetId
            ||
            index
        );
    }



    //===========================================================
    // Refresh Dashboard
    //===========================================================

    refreshDashboard():
        void
    {
        if
        (
            this.loading
        )
        {
            return;
        }


        this.loadDashboard();
    }



    //===========================================================
    // Back
    //===========================================================

    back():
        void
    {
        void this.router.navigate
        (
            [
                'list'
            ],

            {
                relativeTo:
                    this.route.parent
            }
        );
    }

}