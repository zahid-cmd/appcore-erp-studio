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
    DefaultDashboardComponents
}
from '../../../features/infrastructure-control/dashboard-components/models/default-db-components.model';

import
{
    DefaultDashboardComponentsService
}
from '../../../features/infrastructure-control/dashboard-components/services/default-db-components.service';


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
        'app-dashboard-default',

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
        './dashboard-default.html',

    styleUrl:
        './dashboard-default.css'
})


//===============================================================
// Dashboard Default Component
//===============================================================

export class DashboardDefaultComponent
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


    private readonly defaultdashboardcomponentsservice =
        inject(DefaultDashboardComponentsService);


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
    // Default Dashboard Components
    //===========================================================

    defaultDashboardComponents:
        DefaultDashboardComponents[]
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


        if
        (
            !id
            ||
            id <= 0
        )
        {
            this.loadFailed =
                true;

            return;
        }


        this.dashboardId =
            id;


        this.loading =
            true;

        this.loadFailed =
            false;


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
                        configuration.details
                        ??
                        [
                        ];


                    this.loadDefaultDashboardComponents();
                },


                error:
                    ():
                        void =>
                {
                    this.widgetConfiguration =
                        null;

                    this.widgetConfigurationDetails =
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


                    this.buildDashboardWidgets();


                    this.loading =
                        false;

                    this.cdr.detectChanges();
                },


                error:
                    ():
                        void =>
                {
                    this.defaultDashboardComponents =
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
        const configuredDetails =
            this.widgetConfigurationDetails
                .filter(
                    detail =>
                        Number(
                            detail.widgetId
                        ) > 0
                );


        this.dashboardWidgets =
            configuredDetails
                .map(
                    detail =>
                    {
                        const widget =
                            this.defaultDashboardComponents.find(
                                component =>
                                    Number(
                                        component.id
                                    ) ===
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
                            widget.status === false
                        )
                        {
                            return null;
                        }


                        if
                        (
                            !widget.componentPath
                            ||
                            !widget.componentPath.trim()
                        )
                        {
                            return null;
                        }


                        //===================================================
                        // Column Span
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
                        // Display Order
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
                            1;


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
                                    widget.componentPath,

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
                );


        //===========================================================
        // Sort Widgets
        //===========================================================

        this.dashboardWidgets =
            this.dashboardWidgets.sort(
                (
                    first,
                    second
                ) =>
                    first.displayOrder -
                    second.displayOrder
            );
    }



    //===========================================================
    // Get Normalized Column Span
    //===========================================================

    private getNormalizedColumnSpan(
        widget:
            DashboardWidgetHost
    ):
        number
    {
        const columnSpan =
            Number(
                widget.columnSpan
            );


        if
        (
            [
                3,
                4,
                6,
                8,
                12
            ].includes(
                columnSpan
            )
        )
        {
            return columnSpan;
        }


        return 12;
    }



    //===========================================================
    // Get Widget Grid Column Start
    //===========================================================

    getWidgetGridColumnStart(
        widget:
            DashboardWidgetHost
    ):
        number
    {
        return 1;
    }



    //===========================================================
    // Get Widget Grid Column End
    //===========================================================

    getWidgetGridColumnEnd(
        widget:
            DashboardWidgetHost
    ):
        number
    {
        const columnSpan =
            this.getNormalizedColumnSpan(
                widget
            );


        return (
            1 +
            columnSpan
        );
    }



    //===========================================================
    // Refresh
    //===========================================================

    refresh():
        void
    {
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