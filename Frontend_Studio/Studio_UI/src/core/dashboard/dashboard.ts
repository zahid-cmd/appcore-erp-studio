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


//===============================================================
// Shared Components
//===============================================================

import
{
    PageHeaderComponent
}
from '../../shared/components/layout/page-header/page-header';

import
{
    CommandCenterComponent
}
from '../../shared/components/utilities/command-center/command-center';

import
{
    ComponentRenderer
}
from '../component-renderer/component-renderer';


//===============================================================
// Models & Services
//===============================================================

import
{
    Dashboards,
    DashboardsDefaults
}
from '../../features/infrastructure-control/application-configuration/models/dashboards.model';

import
{
    DashboardsService
}
from '../../features/infrastructure-control/application-configuration/services/dashboards.service';

import
{
    WidgetConfiguration,
    WidgetConfigurationDetail
}
from '../../features/infrastructure-control/application-configuration/models/widget-configuration.model';

import
{
    WidgetConfigurationService
}
from '../../features/infrastructure-control/application-configuration/services/widget-configuration.service';

import
{
    DefaultDashboardComponents
}
from '../../features/infrastructure-control/dashboard-components/models/default-db-components.model';

import
{
    DefaultDashboardComponentsService
}
from '../../features/infrastructure-control/dashboard-components/services/default-db-components.service';

import
{
    RoleBasedDashboardComponents
}
from '../../features/infrastructure-control/dashboard-components/models/role-based-db-components.model';

import
{
    RoleBasedDashboardComponentsService
}
from '../../features/infrastructure-control/dashboard-components/services/role-based-db-components.service';


//===============================================================
// Dashboard Widget Size
//===============================================================

type DashboardWidgetSize =
    'small'
    |
    'medium'
    |
    'large';


//===============================================================
// Dashboard Widget
//===============================================================

interface DashboardWidget
{
    widgetConfigurationDetailId:
        number;

    widgetId:
        number;

    widgetCode:
        string;

    widgetName:
        string;

    componentKey:
        string;

    componentPath:
        string;

    columnSpan:
        number;

    displayOrder:
        number;

    size:
        DashboardWidgetSize;

    visible:
        boolean;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'app-dashboard',

    standalone:
        true,

    imports:
    [
        CommonModule,

        PageHeaderComponent,

        CommandCenterComponent,

        ComponentRenderer
    ],

    templateUrl:
        './dashboard.html',

    styleUrl:
        './dashboard.css'
})


//===============================================================
// Dashboard Host Component
//===============================================================

export class DashboardComponent
implements
    OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly dashboardsservice =
        inject(DashboardsService);


    private readonly widgetconfigurationservice =
        inject(WidgetConfigurationService);


    private readonly defaultdashboardcomponentsservice =
        inject(DefaultDashboardComponentsService);


    private readonly rolebaseddashboardcomponentsservice =
        inject(RoleBasedDashboardComponentsService);


    private readonly cdr =
        inject(ChangeDetectorRef);


    //===========================================================
    // Dashboard State
    //===========================================================

    isCustomizeMode:
        boolean =
        false;


    isLoading:
        boolean =
        false;


    loadFailed:
        boolean =
        false;


    //===========================================================
    // Dashboard Definition
    //===========================================================

    dashboard:
        Dashboards
        |
        null =
        null;


    dashboardType:
        string =
        'default';


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
    // Dashboard Components
    //===========================================================

    defaultDashboardComponents:
        DefaultDashboardComponents[]
    =
    [
    ];


    roleBasedDashboardComponents:
        RoleBasedDashboardComponents[]
    =
    [
    ];


    //===========================================================
    // Dashboard Widgets
    //===========================================================

    widgets:
        DashboardWidget[]
    =
    [
    ];


    //===========================================================
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.loadDashboardHost();
    }


    //===========================================================
    // Load Dashboard Host
    //===========================================================

    private loadDashboardHost():
        void
    {
        this.isLoading =
            true;

        this.loadFailed =
            false;

        this.dashboard =
            null;

        this.dashboardId =
            0;

        this.dashboardType =
            'default';

        this.widgetConfiguration =
            null;

        this.widgetConfigurationDetails =
        [
        ];

        this.defaultDashboardComponents =
        [
        ];

        this.roleBasedDashboardComponents =
        [
        ];

        this.widgets =
        [
        ];


        //=======================================================
        // Load Dashboard Defaults
        //=======================================================

        this.dashboardsservice
            .getDefaults()
            .subscribe(
            {
                next:
                    (
                        defaults:
                            DashboardsDefaults
                    ):
                        void =>
                {
                    this.loadDashboardByDefaultCode(
                        defaults.code
                    );
                },

                error:
                    (
                        error:
                            unknown
                    ):
                        void =>
                {
                    console.error(
                        'Load Dashboard Defaults Error',
                        error
                    );

                    this.loadDefaultDashboardDirectly();
                }
            }
        );
    }


    //===========================================================
    // Load Dashboard By Default Code
    //===========================================================

    private loadDashboardByDefaultCode(
        defaultCode:
            string
    ):
        void
    {
        this.dashboardsservice
            .getAll()
            .subscribe(
            {
                next:
                    (
                        dashboards:
                            Dashboards[]
                    ):
                        void =>
                {
                    const normalizedCode =
                        (
                            defaultCode
                            ??
                            ''
                        )
                        .trim()
                        .toLowerCase();


                    let dashboard =
                        dashboards.find(
                            item =>
                                (
                                    item.code
                                    ??
                                    ''
                                )
                                .trim()
                                .toLowerCase()
                                ===
                                normalizedCode
                                &&
                                item.status !== false
                        );


                    if
                    (
                        !dashboard
                    )
                    {
                        dashboard =
                            dashboards.find(
                                item =>
                                    (
                                        item.dashboardType
                                        ??
                                        ''
                                    )
                                    .trim()
                                    .toLowerCase()
                                    ===
                                    'default'
                                    &&
                                    item.status !== false
                            );
                    }


                    if
                    (
                        !dashboard
                    )
                    {
                        this.handleLoadFailure();

                        return;
                    }


                    this.bindDashboard(
                        dashboard
                    );
                },

                error:
                    (
                        error:
                            unknown
                    ):
                        void =>
                {
                    console.error(
                        'Load Dashboards Error',
                        error
                    );

                    this.handleLoadFailure();
                }
            }
        );
    }


    //===========================================================
    // Load Default Dashboard Directly
    //===========================================================

    private loadDefaultDashboardDirectly():
        void
    {
        this.dashboardsservice
            .getAll()
            .subscribe(
            {
                next:
                    (
                        dashboards:
                            Dashboards[]
                    ):
                        void =>
                {
                    const dashboard =
                        dashboards.find(
                            item =>
                                (
                                    item.dashboardType
                                    ??
                                    ''
                                )
                                .trim()
                                .toLowerCase()
                                ===
                                'default'
                                &&
                                item.status !== false
                        );


                    if
                    (
                        !dashboard
                    )
                    {
                        this.handleLoadFailure();

                        return;
                    }


                    this.bindDashboard(
                        dashboard
                    );
                },

                error:
                    (
                        error:
                            unknown
                    ):
                        void =>
                {
                    console.error(
                        'Load Default Dashboard Error',
                        error
                    );

                    this.handleLoadFailure();
                }
            }
        );
    }


    //===========================================================
    // Bind Dashboard
    //===========================================================

    private bindDashboard(
        dashboard:
            Dashboards
    ):
        void
    {
        this.dashboard =
            dashboard;

        this.dashboardId =
            Number(
                dashboard.id
            );

        this.dashboardType =
            (
                dashboard.dashboardType
                ??
                'default'
            )
            .trim()
            .toLowerCase();


        if
        (
            this.dashboardId <= 0
        )
        {
            this.handleLoadFailure();

            return;
        }


        this.loadWidgetConfiguration();
    }


    //===========================================================
    // Load Widget Configuration
    //===========================================================

    private loadWidgetConfiguration():
        void
    {
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


                    if
                    (
                        this.widgetConfigurationDetails.length ===
                        0
                    )
                    {
                        this.widgets =
                        [
                        ];

                        this.isLoading =
                            false;

                        this.loadFailed =
                            false;

                        this.cdr.detectChanges();

                        return;
                    }


                    this.loadDashboardComponents();
                },

                error:
                    (
                        error:
                            unknown
                    ):
                        void =>
                {
                    console.error(
                        'Load Widget Configuration Error',
                        error
                    );


                    this.widgetConfiguration =
                        null;

                    this.widgetConfigurationDetails =
                    [
                    ];

                    this.widgets =
                    [
                    ];

                    this.isLoading =
                        false;

                    this.loadFailed =
                        false;

                    this.cdr.detectChanges();
                }
            }
        );
    }


    //===========================================================
    // Load Dashboard Components
    //===========================================================

    private loadDashboardComponents():
        void
    {
        if
        (
            this.dashboardType ===
            'role-based'
        )
        {
            this.loadRoleBasedDashboardComponents();

            return;
        }


        this.loadDefaultDashboardComponents();
    }


    //===========================================================
    // Load Default Dashboard Components
    //===========================================================

    private loadDefaultDashboardComponents():
        void
    {
        this.defaultdashboardcomponentsservice
            .getAll()
            .subscribe(
            {
                next:
                    (
                        components:
                            DefaultDashboardComponents[]
                    ):
                        void =>
                {
                    this.defaultDashboardComponents =
                        components
                        ??
                        [
                        ];


                    this.buildConfiguredWidgets(
                        this.defaultDashboardComponents
                    );


                    this.isLoading =
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
                        'Load Default Dashboard Components Error',
                        error
                    );

                    this.handleLoadFailure();
                }
            }
        );
    }


    //===========================================================
    // Load Role-Based Dashboard Components
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


                    this.buildConfiguredWidgets(
                        this.roleBasedDashboardComponents
                    );


                    this.isLoading =
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
                        'Load Role-Based Dashboard Components Error',
                        error
                    );

                    this.handleLoadFailure();
                }
            }
        );
    }


    //===========================================================
    // Build Configured Widgets
    //===========================================================

    private buildConfiguredWidgets(
        components:
            (
                DefaultDashboardComponents
                |
                RoleBasedDashboardComponents
            )[]
    ):
        void
    {
        this.widgets =
            this.widgetConfigurationDetails
                .filter(
                    detail =>
                        Number(
                            detail.widgetId
                        ) > 0
                )
                .map(
                    detail =>
                    {
                        const widget =
                            components.find(
                                component =>
                                    Number(
                                        component.id
                                    )
                                    ===
                                    Number(
                                        detail.widgetId
                                    )
                            );


                        if
                        (
                            !widget
                        )
                        {
                            return null;
                        }


                        if
                        (
                            widget.status ===
                            false
                        )
                        {
                            return null;
                        }


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


                        /*
                         * IMPORTANT:
                         *
                         * Layout now comes from the
                         * WidgetConfigurationDetail.
                         */

                        const columnSpan =
                            this.normalizeColumnSpan(
                                Number(
                                    detail.columnSpan
                                )
                            );


                        const displayOrder =
                            Number(
                                detail.displayOrder
                            )
                            > 0
                                ?
                                Number(
                                    detail.displayOrder
                                )
                                :
                                999999;


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

                                componentKey:
                                    componentPath,

                                componentPath:
                                    componentPath,

                                columnSpan:
                                    columnSpan,

                                displayOrder:
                                    displayOrder,

                                size:
                                    this.getWidgetSize(
                                        columnSpan
                                    ),

                                visible:
                                    true
                            }
                        );
                    }
                )
                .filter(
                    (
                        widget
                    ):
                        widget is DashboardWidget =>
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
    // Normalize Column Span
    //===========================================================

    private normalizeColumnSpan(
        columnSpan:
            number
    ):
        number
    {
        if
        (
            columnSpan === 3
            ||
            columnSpan === 4
            ||
            columnSpan === 6
            ||
            columnSpan === 8
            ||
            columnSpan === 12
        )
        {
            return columnSpan;
        }


        return 12;
    }


    //===========================================================
    // Resolve Widget Size
    //===========================================================

    private getWidgetSize(
        columnSpan:
            number
    ):
        DashboardWidgetSize
    {
        if
        (
            columnSpan <= 3
        )
        {
            return 'small';
        }


        if
        (
            columnSpan <= 8
        )
        {
            return 'medium';
        }


        return 'large';
    }


    //===========================================================
    // Customize Mode
    //===========================================================

    toggleCustomizeMode():
        void
    {
        this.isCustomizeMode =
            !this.isCustomizeMode;
    }


    //===========================================================
    // Refresh Dashboard
    //===========================================================

    refreshDashboard():
        void
    {
        if
        (
            this.isLoading
        )
        {
            return;
        }


        this.loadDashboardHost();
    }


    //===========================================================
    // Visible Widgets
    //===========================================================

    get visibleWidgets():
        DashboardWidget[]
    {
        return this.widgets
            .filter(
                widget =>
                    widget.visible
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
    // Track Widget
    //===========================================================

    trackByWidgetId(
        index:
            number,

        widget:
            DashboardWidget
    ):
        number
    {
        return widget.widgetId;
    }


    //===========================================================
    // Load Failure
    //===========================================================

    private handleLoadFailure():
        void
    {
        this.isLoading =
            false;

        this.loadFailed =
            true;

        this.widgets =
        [
        ];

        this.cdr.detectChanges();
    }

}