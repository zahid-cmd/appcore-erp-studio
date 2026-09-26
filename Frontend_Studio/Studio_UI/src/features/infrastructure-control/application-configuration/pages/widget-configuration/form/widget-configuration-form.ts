//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
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
    FormsModule
}
from '@angular/forms';


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
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    PageCanvasComponent,
    PageCanvasConfig
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';


//===============================================================
// Utilities
//===============================================================

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
    PaginationComponent
}
from '../../../../../../shared/components/controls/pagination/pagination';

import
{
    RecordCounterComponent
}
from '../../../../../../shared/components/utilities/record-counter/record-counter';

import
{
    RecordCounterSection
}
from '../../../../../../shared/components/utilities/record-counter/record-counter.model';

import
{
    ProgressDialogComponent
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';


//===============================================================
// Models & Services
//===============================================================

import
{
    WidgetConfiguration,
    WidgetConfigurationDetail
}
from '../../../models/widget-configuration.model';

import
{
    WidgetConfigurationService
}
from '../../../services/widget-configuration.service';

import
{
    Dashboards
}
from '../../../models/dashboards.model';

import
{
    DashboardsService
}
from '../../../services/dashboards.service';

import
{
    DefaultDashboardComponents
}
from '../../../../dashboard-components/models/default-db-components.model';

import
{
    RoleBasedDashboardComponents
}
from '../../../../dashboard-components/models/role-based-db-components.model';

import
{
    DefaultDashboardComponentsService
}
from '../../../../dashboard-components/services/default-db-components.service';

import
{
    RoleBasedDashboardComponentsService
}
from '../../../../dashboard-components/services/role-based-db-components.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-widget-configuration-form',

    standalone:true,

    imports:
    [
        CommonModule,

        FormsModule,


        //=======================================================
        // Layout
        //=======================================================

        PageHeaderComponent,

        PageToolbarComponent,

        CommandCenterComponent,

        ControlTabsComponent,

        PageCanvasComponent,

        SearchDropdownComponent,


        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,

        ConfirmDialogComponent,

        PaginationComponent,

        RecordCounterComponent,

        ProgressDialogComponent
    ],


    templateUrl:'./widget-configuration-form.html',


    styleUrls:
    [
        './widget-configuration-form.css'
    ]
})


export class WidgetConfigurationForm
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly widgetconfigurationservice =
        inject(WidgetConfigurationService);


    private readonly dashboardsservice =
        inject(DashboardsService);


    private readonly defaultdashboardcomponentsservice =
        inject(DefaultDashboardComponentsService);


    private readonly rolebaseddashboardcomponentsservice =
        inject(RoleBasedDashboardComponentsService);


    private readonly confirmDialog =
        inject(ConfirmDialogService);


    private readonly toast =
        inject(ToastService);


    private readonly cdr =
        inject(ChangeDetectorRef);


    private readonly progressDialog =
        inject(ProgressDialogService);



    //===========================================================
    // Mode
    //===========================================================

    mode:
        'add' | 'edit' | 'view'
        =
        'add';


    widgetConfigurationId:
        number =
        0;



    //===========================================================
    // Save Button Text
    //===========================================================

    get saveButtonText():
        string
    {
        return this.mode === 'edit'
            ?
            'Update'
            :
            'Save';
    }



    //===========================================================
    // View Mode
    //===========================================================

    get isViewMode():
        boolean
    {
        return this.mode === 'view';
    }



    //===========================================================
    // Edit Mode
    //===========================================================

    get isEditMode():
        boolean
    {
        return this.mode === 'edit';
    }



    //===========================================================
    // Add Mode
    //===========================================================

    get isAddMode():
        boolean
    {
        return this.mode === 'add';
    }



    //===========================================================
    // Page Header
    //===========================================================

    pageTitle:
        string =
        'Widget Configuration';


    entityName:
        string =
        'Widget Configuration';



    //===========================================================
    // Selected Tab
    //===========================================================

    selectedTab:
        string =
        'general';



    //===========================================================
    // Tab Change
    //===========================================================

    onTabChange
    (
        tab:
            string
    ):
        void
    {
        this.selectedTab =
            tab;
    }



    //===========================================================
    // Tab Title
    //===========================================================

    get tabTitle():
        string
    {
        switch
        (
            this.mode
        )
        {
            case 'add':

                return `Add ${this.entityName}`;


            case 'edit':

                return `Update ${this.entityName}`;


            case 'view':

                return `View ${this.entityName}`;


            default:

                return this.entityName;
        }
    }



    //===========================================================
    // Tabs
    //===========================================================

    get tabs():
        ControlTab[]
    {
        return [

            {
                id:'general',

                label:this.tabTitle
            }

        ];
    }



    //===========================================================
    // Dashboards
    //===========================================================

    dashboards:
        Dashboards[]
    =
    [
    ];



    //===========================================================
    // Widgets
    //===========================================================

    widgets:
        Array<
            DefaultDashboardComponents
            |
            RoleBasedDashboardComponents
        >
    =
    [
    ];



    //===========================================================
    // Selected Dashboard
    //===========================================================

    selectedDashboardId:
        number | null =
        null;


    selectedDashboard:
        Dashboards | null =
        null;



    //===========================================================
    // Selected Widget
    //===========================================================

    selectedWidgetId:
        number | null =
        null;



    //===========================================================
    // Selected Widget Width
    //===========================================================

    selectedWidth:
        number | null =
        null;



    //===========================================================
    // Selected Widget Order
    //===========================================================

    selectedOrder:
        number | null =
        null;


    //===========================================================
    // Editing Widget Row
    //===========================================================

    editingWidgetConfigurationDetailId:
        number | null =
        null;


    get isRowEditMode():
        boolean
    {
        return (
            this.mode === 'edit'
            &&
            this.editingWidgetConfigurationDetailId !== null
        );
    }



    //===========================================================
    // Width Options
    //===========================================================

    readonly widthOptions:
        {
            text:
                string;

            value:
                number;
        }[]
    =
    [
        {
            text:'Full Width (12)',
            value:12
        },

        {
            text:'Two Thirds (8)',
            value:8
        },

        {
            text:'Half Width (6)',
            value:6
        },

        {
            text:'One Third (4)',
            value:4
        },

        {
            text:'Quarter Width (3)',
            value:3
        }
    ];



    //===========================================================
    // Widget Configuration Rows
    //===========================================================

    widgetConfigurationRows:
        WidgetConfigurationDetail[]
    =
    [
    ];


    pagedWidgetConfigurationRows:
        WidgetConfigurationDetail[]
    =
    [
    ];



    //===========================================================
    // Entity
    //===========================================================

    entity:
        WidgetConfiguration =
    {
        widgetConfigurationId:0,

        dashboardId:0,

        dashboardCode:'',

        dashboardName:'',

        displayName:'',

        widgetCount:0,

        isActive:true,

        details:
        [
        ]
    };



    //===========================================================
    // Original Entity
    //===========================================================

    private originalEntity:
        string =
        '';


    hasChanges:
        boolean =
        false;



    //===========================================================
    // Pagination
    //===========================================================

    currentPage:
        number =
        1;


    pageSize:
        number =
        10;



    //===========================================================
    // Loading State
    //===========================================================

    loading:
        boolean =
        false;


    orbitLoading:
        boolean =
        false;


    loadFailed:
        boolean =
        false;



    //===========================================================
    // Page Canvas Configuration
    //===========================================================

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



    //===========================================================
    // Table Columns
    //===========================================================

    readonly columns:
        any[]
    =
    [
        {
            header:'#',

            field:'serial',

            type:'serial',

            width:'60px',

            align:'center'
        },


        {
            header:'Widget Code',

            field:'widgetCode',

            width:'180px',

            align:'left'
        },


        {
            header:'Widget',

            field:'widgetName',

            width:'auto',

            align:'left'
        },


        {
            header:'Width',

            field:'columnSpan',

            width:'150px',

            align:'center'
        },


        {
            header:'Order',

            field:'displayOrder',

            width:'100px',

            align:'center'
        },


        {
            header:'Actions',

            field:'actions',

            type:'actions',

            width:'120px',

            align:'center'
        }
    ];


    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.initializeMode();
    }



    //===========================================================
    // Initialize Mode
    //===========================================================

    private initializeMode():
        void
    {
        const url =
            this.router.url.toLowerCase();


        //=======================================================
        // View Mode
        //=======================================================

        if
        (
            url.includes('/view/')
        )
        {
            this.mode =
                'view';
        }


        //=======================================================
        // Edit Mode
        //=======================================================

        else if
        (
            url.includes('/edit/')
        )
        {
            this.mode =
                'edit';
        }


        //=======================================================
        // Add Mode
        //=======================================================

        else
        {
            this.mode =
                'add';
        }


        //=======================================================
        // Entity Id
        //=======================================================

        const id =
            this.resolveEntityId();


        //=======================================================
        // Existing Entity
        //=======================================================

        if
        (
            id > 0
        )
        {
            this.widgetConfigurationId =
                id;


            this.loadDashboards();

            this.loadWidgetConfiguration();


            return;
        }


        //=======================================================
        // New Entity
        //=======================================================

        this.loadDashboards();

        this.initializeEntity();
    }



    //===========================================================
    // Resolve Entity Id
    //===========================================================

    private resolveEntityId():
        number
    {
        let currentRoute:
            ActivatedRoute | null =
            this.route;


        while
        (
            currentRoute
        )
        {
            const id =
                Number(
                    currentRoute.snapshot.paramMap.get(
                        'id'
                    )
                );


            if
            (
                id > 0
            )
            {
                return id;
            }


            currentRoute =
                currentRoute.parent;
        }


        return 0;
    }



    //===========================================================
    // Initialize Entity
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
        {
            widgetConfigurationId:0,

            dashboardId:0,

            dashboardCode:'',

            dashboardName:'',

            displayName:'',

            widgetCount:0,

            isActive:true,

            details:
            [
            ]
        };


        this.widgetConfigurationRows =
        [
        ];


        this.pagedWidgetConfigurationRows =
        [
        ];


        this.selectedDashboardId =
            null;


        this.selectedDashboard =
            null;


        this.selectedWidgetId =
            null;


        this.selectedWidth =
            null;


        this.selectedOrder =
            1;


        this.editingWidgetConfigurationDetailId =
            null;


        this.widgets =
        [
        ];


        this.currentPage =
            1;


        this.updatePagination();


        this.originalEntity =
            JSON.stringify(
                this.buildWidgetConfiguration()
            );


        this.hasChanges =
            false;


        this.cdr.detectChanges();
    }



    //===========================================================
    // Load Dashboards
    //===========================================================

    private loadDashboards():
        void
    {
        this.dashboardsservice
            .getAll()
            .subscribe(
            {
                next:
                    (
                        response:
                            Dashboards[]
                    ):
                        void =>
                {
                    this.dashboards =
                    [
                        ...response
                    ];


                    if
                    (
                        this.entity.dashboardId > 0
                    )
                    {
                        this.bindSelectedDashboard(
                            this.entity.dashboardId
                        );
                    }


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
                        'Load Dashboards Error',

                        error
                    );


                    this.dashboards =
                    [
                    ];


                    this.toast.error(
                        'Load Failed',

                        'Unable to load dashboards.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Load Widget Configuration
    //===========================================================

    private loadWidgetConfiguration():
        void
    {
        this.loading =
            true;


        this.orbitLoading =
            true;


        this.loadFailed =
            false;


        this.widgetconfigurationservice
            .getById(
                this.widgetConfigurationId
            )
            .subscribe(
            {
                next:
                    (
                        response:
                            WidgetConfiguration
                    ):
                        void =>
                {
                    const details =
                        (
                            response.details
                            ??
                            [
                            ]
                        )
                        .map(
                            (
                                detail,
                                index
                            ) =>
                            ({
                                ...detail,

                                columnSpan:
                                    Number(
                                        detail.columnSpan
                                    ) > 0
                                        ?
                                        Number(
                                            detail.columnSpan
                                        )
                                        :
                                        12,

                                displayOrder:
                                    Number(
                                        detail.displayOrder
                                    ) > 0
                                        ?
                                        Number(
                                            detail.displayOrder
                                        )
                                        :
                                        index + 1
                            })
                        )
                        .sort(
                            (
                                first,
                                second
                            ) =>
                                Number(
                                    first.displayOrder
                                )
                                -
                                Number(
                                    second.displayOrder
                                )
                        );


                    this.entity =
                    {
                        ...response,

                        details:
                            details
                    };


                    this.widgetConfigurationRows =
                    [
                        ...details
                    ];


                    this.entity.widgetCount =
                        this.widgetConfigurationRows.length;


                    this.selectedDashboardId =
                        this.entity.dashboardId > 0
                            ?
                            this.entity.dashboardId
                            :
                            null;


                    this.selectedWidgetId =
                        null;


                    this.selectedWidth =
                        null;


                    this.selectedOrder =
                        this.getNextAvailableOrder();


                    this.editingWidgetConfigurationDetailId =
                        null;


                    this.currentPage =
                        1;


                    this.updatePagination();


                    this.originalEntity =
                        JSON.stringify(
                            this.buildWidgetConfiguration()
                        );


                    this.hasChanges =
                        false;


                    this.loading =
                        false;


                    this.orbitLoading =
                        false;


                    this.loadFailed =
                        false;


                    this.bindSelectedDashboard(
                        this.selectedDashboardId
                    );


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
                        'Load Widget Configuration Error',

                        error
                    );


                    this.loading =
                        false;


                    this.orbitLoading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error(
                        'Load Failed',

                        'Failed to load Widget Configuration.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Bind Selected Dashboard
    //===========================================================

    private bindSelectedDashboard
    (
        dashboardId:
            number | null
    ):
        void
    {
        if
        (
            dashboardId === null
            ||
            dashboardId <= 0
        )
        {
            this.selectedDashboard =
                null;


            this.widgets =
            [
            ];


            return;
        }


        const dashboard =
            this.dashboards.find(
                item =>
                    Number(item.id) ===
                    Number(dashboardId)
            );


        this.selectedDashboard =
            dashboard
            ??
            null;


        if
        (
            !dashboard
        )
        {
            this.widgets =
            [
            ];


            return;
        }


        this.loadWidgetsForDashboard(
            dashboard
        );
    }



    //===========================================================
    // Dashboard Changed
    //===========================================================

    onDashboardChanged
    (
        value:
            number
            |
            string
            |
            null
    ):
        void
    {
        const dashboardId =
            value === null
            ||
            value === undefined
            ||
            value === ''
                ?
                null
                :
                Number(value);


        this.selectedDashboardId =
            dashboardId !== null
            &&
            Number.isFinite(dashboardId)
                ?
                dashboardId
                :
                null;


        this.selectedWidgetId =
            null;


        this.selectedWidth =
            null;


        this.selectedOrder =
            1;


        this.widgets =
        [
        ];


        this.selectedDashboard =
            null;


        if
        (
            this.selectedDashboardId === null
        )
        {
            this.entity.dashboardId =
                0;


            this.entity.dashboardCode =
                '';


            this.entity.dashboardName =
                '';


            this.checkForChanges();


            this.cdr.detectChanges();


            return;
        }


        const dashboard =
            this.dashboards.find(
                item =>
                    Number(item.id) ===
                    Number(this.selectedDashboardId)
            );


        if
        (
            !dashboard
        )
        {
            this.checkForChanges();

            this.cdr.detectChanges();

            return;
        }


        this.selectedDashboard =
            dashboard;


        this.entity.dashboardId =
            Number(
                dashboard.id
            );


        this.entity.dashboardCode =
            dashboard.code
            ??
            '';


        this.entity.dashboardName =
            dashboard.name
            ??
            '';


        this.loadWidgetsForDashboard(
            dashboard
        );


        this.checkForChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Load Widgets For Dashboard
    //===========================================================

    private loadWidgetsForDashboard
    (
        dashboard:
            Dashboards
    ):
        void
    {
        const dashboardType =
            String(
                dashboard.dashboardType
                ??
                ''
            )
            .trim()
            .toLowerCase();


        if
        (
            dashboardType ===
            'role-based'
        )
        {
            this.loadRoleBasedWidgets();


            return;
        }


        this.loadDefaultWidgets();
    }



    //===========================================================
    // Load Default Dashboard Widgets
    //===========================================================

    private loadDefaultWidgets():
        void
    {
        this.defaultdashboardcomponentsservice
            .getAll()
            .subscribe(
            {
                next:
                    (
                        response:
                            DefaultDashboardComponents[]
                    ):
                        void =>
                {
                    this.widgets =
                    [
                        ...response.filter(
                            item =>
                                item.status !== false
                        )
                    ];


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
                        'Load Default Dashboard Widgets Error',

                        error
                    );


                    this.widgets =
                    [
                    ];


                    this.toast.error(
                        'Load Failed',

                        'Unable to load dashboard widgets.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Load Role Based Dashboard Widgets
    //===========================================================

    private loadRoleBasedWidgets():
        void
    {
        this.rolebaseddashboardcomponentsservice
            .getAll()
            .subscribe(
            {
                next:
                    (
                        response:
                            RoleBasedDashboardComponents[]
                    ):
                        void =>
                {
                    this.widgets =
                    [
                        ...response.filter(
                            item =>
                                item.status !== false
                        )
                    ];


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
                        'Load Role Based Dashboard Widgets Error',

                        error
                    );


                    this.widgets =
                    [
                    ];


                    this.toast.error(
                        'Load Failed',

                        'Unable to load dashboard widgets.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Widget Changed
    //===========================================================

    onWidgetChanged
    (
        value:
            number
            |
            string
            |
            null
    ):
        void
    {
        if
        (
            value === null
            ||
            value === undefined
            ||
            value === ''
        )
        {
            this.selectedWidgetId =
                null;


            return;
        }


        const widgetId =
            Number(value);


        this.selectedWidgetId =
            Number.isFinite(widgetId)
                ?
                widgetId
                :
                null;


        this.checkForChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Widget Width Changed
    //===========================================================

    onWidthChanged
    (
        value:
            number
            |
            string
            |
            null
    ):
        void
    {
        if
        (
            value === null
            ||
            value === undefined
            ||
            value === ''
        )
        {
            this.selectedWidth =
                null;


            this.checkForChanges();


            this.cdr.detectChanges();


            return;
        }


        const width =
            Number(value);


        this.selectedWidth =
            Number.isFinite(width)
                ?
                width
                :
                null;


        this.checkForChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Widget Order Changed
    //===========================================================

    onOrderChanged
    (
        value:
            number
            |
            string
            |
            null
    ):
        void
    {
        if
        (
            value === null
            ||
            value === undefined
            ||
            value === ''
        )
        {
            this.selectedOrder =
                null;


            this.checkForChanges();


            this.cdr.detectChanges();


            return;
        }


        const order =
            Number(value);


        this.selectedOrder =
            Number.isFinite(order)
                ?
                order
                :
                null;


        this.checkForChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Available Widget Order Options
    //===========================================================

    get orderOptions():
        {
            text:
                string;

            value:
                number;
        }[]
    {
        const maximumOrder =
            Math.max(
                this.widgetConfigurationRows.length +
                1,

                20
            );


        const options:
            {
                text:
                    string;

                value:
                    number;
            }[]
        =
        [
        ];


        for
        (
            let order =
                1;

            order <= maximumOrder;

            order++
        )
        {
            options.push(
            {
                text:
                    `Order ${order}`,

                value:
                    order
            });
        }


        return options;
    }


    //===========================================================
    // Next Available Order
    //===========================================================

    private getNextAvailableOrder():
        number
    {
        if
        (
            this.widgetConfigurationRows.length === 0
        )
        {
            return 1;
        }


        const orders =
            this.widgetConfigurationRows
                .map(
                    row =>
                        Number(
                            row.displayOrder
                        )
                )
                .filter(
                    order =>
                        Number.isFinite(order)
                        &&
                        order > 0
                );


        if
        (
            orders.length === 0
        )
        {
            return 1;
        }


        return (
            Math.max(
                ...orders
            )
            +
            1
        );
    }


    //===========================================================
    // Available Widgets
    //===========================================================

    get availableWidgets():
        Array<
            DefaultDashboardComponents
            |
            RoleBasedDashboardComponents
        >
    {
        const assignedWidgetIds =
            new Set(
                this.widgetConfigurationRows
                    .filter(
                        row =>
                            this.editingWidgetConfigurationDetailId === null
                            ||
                            Number(
                                row.widgetConfigurationDetailId
                            ) !==
                            Number(
                                this.editingWidgetConfigurationDetailId
                            )
                    )
                    .map(
                        row =>
                            Number(
                                row.widgetId
                            )
                    )
            );


        return this.widgets.filter(
            widget =>
                !assignedWidgetIds.has(
                    Number(widget.id)
                )
        );
    }


    //===========================================================
    // Dashboard Locked
    //===========================================================

    get isDashboardLocked():
        boolean
    {
        return this.widgetConfigurationRows.length > 0;
    }



    //===========================================================
    // Add Disabled
    //===========================================================

    get addDisabled():
        boolean
    {
        return (
            this.isViewMode
            ||
            this.selectedDashboardId === null
            ||
            this.selectedDashboardId <= 0
            ||
            this.selectedWidgetId === null
            ||
            this.selectedWidgetId <= 0
            ||
            this.selectedWidth === null
            ||
            this.selectedWidth <= 0
            ||
            this.selectedOrder === null
            ||
            this.selectedOrder <= 0
        );
    }



    //===========================================================
    // Add Widget Selection
    //===========================================================

    onAddSelection():
        void
    {
        if
        (
            this.addDisabled
        )
        {
            return;
        }


        const widgetId =
            Number(
                this.selectedWidgetId
            );


        const widget =
            this.widgets.find(
                item =>
                    Number(item.id) ===
                    widgetId
            );


        if
        (
            !widget
        )
        {
            this.toast.error(
                'Validation',

                'Selected widget could not be found.'
            );


            return;
        }


        const alreadyAssigned =
            this.widgetConfigurationRows.some(
                row =>
                    Number(row.widgetId) ===
                    widgetId
            );


        if
        (
            alreadyAssigned
        )
        {
            this.toast.error(
                'Validation',

                'This widget is already assigned.'
            );


            return;
        }


        const selectedOrder =
            Number(
                this.selectedOrder
            );


        const selectedWidth =
            Number(
                this.selectedWidth
            );


        const adjustedRows =
            this.widgetConfigurationRows.map(
                row =>
                {
                    const rowOrder =
                        Number(
                            row.displayOrder
                        );


                    if
                    (
                        rowOrder >=
                        selectedOrder
                    )
                    {
                        return {
                            ...row,

                            displayOrder:
                                rowOrder + 1
                        };
                    }


                    return row;
                }
            );


        const detail:
            WidgetConfigurationDetail =
        {
            widgetConfigurationDetailId:0,

            widgetConfigurationId:
                this.widgetConfigurationId,

            widgetId:
                widgetId,

            widgetCode:
                widget.code
                ??
                '',

            widgetName:
                widget.name
                ??
                '',

            columnSpan:
                selectedWidth,

            displayOrder:
                selectedOrder,

            isActive:true
        };


        this.widgetConfigurationRows =
        [
            ...adjustedRows,

            detail
        ]
        .sort(
            (
                first,
                second
            ) =>
                Number(
                    first.displayOrder
                )
                -
                Number(
                    second.displayOrder
                )
        );


        this.entity.widgetCount =
            this.widgetConfigurationRows.length;


        this.entity.details =
        [
            ...this.widgetConfigurationRows
        ];


        if
        (
            this.entity.dashboardId <= 0
            &&
            this.selectedDashboard
        )
        {
            this.entity.dashboardId =
                Number(
                    this.selectedDashboard.id
                );


            this.entity.dashboardCode =
                this.selectedDashboard.code
                ??
                '';


            this.entity.dashboardName =
                this.selectedDashboard.name
                ??
                '';
        }


        this.selectedWidgetId =
            null;


        this.selectedWidth =
            null;


        this.selectedOrder =
            this.getNextAvailableOrder();


        this.currentPage =
            Math.ceil(
                this.widgetConfigurationRows.length /
                this.pageSize
            );


        this.updatePagination();


        this.checkForChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Double Click Row — Edit Mode
    //===========================================================

    onRowDoubleClick(
        row:
            WidgetConfigurationDetail
    ):
        void
    {
        if
        (
            !this.isEditMode
        )
        {
            return;
        }


        this.editingWidgetConfigurationDetailId =
            Number(
                row.widgetConfigurationDetailId
            );


        this.selectedWidgetId =
            Number(
                row.widgetId
            );


        this.selectedWidth =
            Number(
                row.columnSpan
            ) > 0
                ?
                Number(
                    row.columnSpan
                )
                :
                12;


        this.selectedOrder =
            Number(
                row.displayOrder
            ) > 0
                ?
                Number(
                    row.displayOrder
                )
                :
                1;


        this.cdr.detectChanges();
    }



    //===========================================================
    // Update Row Locally
    //===========================================================

    onUpdateRow():
        void
    {
        if
        (
            this.isViewMode
            ||
            !this.isRowEditMode
        )
        {
            return;
        }


        this.updateSelectedRow();
    }



    //===========================================================
    // Update Selected Widget Row
    //===========================================================

    private updateSelectedRow():
        void
    {
        if
        (
            !this.isRowEditMode
        )
        {
            return;
        }


        const detailId =
            Number(
                this.editingWidgetConfigurationDetailId
            );


        const selectedOrder =
            Number(
                this.selectedOrder
            );


        const selectedWidth =
            Number(
                this.selectedWidth
            );


        const selectedWidgetId =
            Number(
                this.selectedWidgetId
            );


        const existingRow =
            this.widgetConfigurationRows.find(
                row =>
                    Number(
                        row.widgetConfigurationDetailId
                    ) ===
                    detailId
            );


        if
        (
            !existingRow
        )
        {
            this.toast.error(
                'Validation',

                'The selected widget row could not be found.'
            );


            return;
        }


        const widget =
            this.widgets.find(
                item =>
                    Number(item.id) ===
                    selectedWidgetId
            );


        if
        (
            !widget
        )
        {
            this.toast.error(
                'Validation',

                'Selected widget could not be found.'
            );


            return;
        }


        const oldOrder =
            Number(
                existingRow.displayOrder
            );


        const otherRows =
            this.widgetConfigurationRows.filter(
                row =>
                    Number(
                        row.widgetConfigurationDetailId
                    ) !==
                    detailId
            );


        const adjustedRows =
            otherRows.map(
                row =>
                {
                    const rowOrder =
                        Number(
                            row.displayOrder
                        );


                    if
                    (
                        selectedOrder <
                        oldOrder
                        &&
                        rowOrder >=
                        selectedOrder
                        &&
                        rowOrder <
                        oldOrder
                    )
                    {
                        return {
                            ...row,

                            displayOrder:
                                rowOrder + 1
                        };
                    }


                    if
                    (
                        selectedOrder >
                        oldOrder
                        &&
                        rowOrder <=
                        selectedOrder
                        &&
                        rowOrder >
                        oldOrder
                    )
                    {
                        return {
                            ...row,

                            displayOrder:
                                rowOrder - 1
                        };
                    }


                    return row;
                }
            );


        const updatedRow:
            WidgetConfigurationDetail =
        {
            ...existingRow,

            widgetId:
                selectedWidgetId,

            widgetCode:
                widget.code
                ??
                existingRow.widgetCode
                ??
                '',

            widgetName:
                widget.name
                ??
                existingRow.widgetName
                ??
                '',

            columnSpan:
                selectedWidth,

            displayOrder:
                selectedOrder
        };


        this.widgetConfigurationRows =
        [
            ...adjustedRows,

            updatedRow
        ]
        .sort(
            (
                first,
                second
            ) =>
                Number(
                    first.displayOrder
                )
                -
                Number(
                    second.displayOrder
                )
        );


        this.entity.widgetCount =
            this.widgetConfigurationRows.length;


        this.entity.details =
        [
            ...this.widgetConfigurationRows
        ];


        this.selectedWidgetId =
            null;


        this.selectedWidth =
            null;


        this.selectedOrder =
            this.getNextAvailableOrder();


        this.editingWidgetConfigurationDetailId =
            null;


        this.checkForChanges();


        this.updatePagination();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Remove Widget Configuration
    //===========================================================

    onRemoveConfiguration
    (
        row:
            WidgetConfigurationDetail
    ):
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }


        this.confirmDialog.open(

            'Remove Widget',

            `Are you sure you want to remove "${row.widgetName}" from this configuration?`,


            () =>
            {
                this.widgetConfigurationRows =
                    this.widgetConfigurationRows.filter(
                        item =>
                            !(
                                Number(
                                    item.widgetConfigurationDetailId
                                ) ===
                                Number(
                                    row.widgetConfigurationDetailId
                                )
                                &&
                                Number(
                                    item.widgetId
                                ) ===
                                Number(
                                    row.widgetId
                                )
                            )
                    );


                this.normalizeDisplayOrders();


                if
                (
                    this.editingWidgetConfigurationDetailId !== null
                    &&
                    Number(
                        this.editingWidgetConfigurationDetailId
                    ) ===
                    Number(
                        row.widgetConfigurationDetailId
                    )
                )
                {
                    this.editingWidgetConfigurationDetailId =
                        null;
                }


                this.selectedWidth =
                    null;


                this.selectedOrder =
                    this.getNextAvailableOrder();


                this.entity.widgetCount =
                    this.widgetConfigurationRows.length;


                this.entity.details =
                [
                    ...this.widgetConfigurationRows
                ];


                const totalPages =
                    Math.max(
                        1,

                        Math.ceil(
                            this.widgetConfigurationRows.length /
                            this.pageSize
                        )
                    );


                if
                (
                    this.currentPage >
                    totalPages
                )
                {
                    this.currentPage =
                        totalPages;
                }


                this.updatePagination();


                this.checkForChanges();


                this.cdr.detectChanges();
            },


            'Remove',

            'Cancel',

            'danger'
        );
    }



    //===========================================================
    // Normalize Display Orders
    //===========================================================

    private normalizeDisplayOrders():
        void
    {
        this.widgetConfigurationRows =
            [
                ...this.widgetConfigurationRows
            ]
            .sort(
                (
                    first,
                    second
                ) =>
                    Number(
                        first.displayOrder
                    )
                    -
                    Number(
                        second.displayOrder
                    )
            )
            .map(
                (
                    row,
                    index
                ) =>
                ({
                    ...row,

                    displayOrder:
                        index + 1
                })
            );


        this.entity.details =
        [
            ...this.widgetConfigurationRows
        ];
    }



    //===========================================================
    // Reset Selection
    //===========================================================

    onResetSelection():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }


        this.selectedWidgetId =
            null;


        this.selectedWidth =
            null;


        this.selectedOrder =
            this.getNextAvailableOrder();


        this.editingWidgetConfigurationDetailId =
            null;


        this.cdr.detectChanges();
    }



    //===========================================================
    // Pagination — Page Change
    //===========================================================

    onPageChange
    (
        page:
            number
    ):
        void
    {
        this.currentPage =
            page;


        this.updatePagination();
    }



    //===========================================================
    // Pagination — Page Size Change
    //===========================================================

    onPageSizeChange
    (
        size:
            number
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
    // Update Pagination
    //===========================================================

    private updatePagination():
        void
    {
        const start =
            (
                this.currentPage -
                1
            )
            *
            this.pageSize;


        const end =
            start +
            this.pageSize;


        this.pagedWidgetConfigurationRows =
            this.widgetConfigurationRows.slice(
                start,

                end
            );
    }



    //===========================================================
    // Build Widget Configuration
    //===========================================================

    private buildWidgetConfiguration():
        WidgetConfiguration
    {
        return {

            widgetConfigurationId:
                this.widgetConfigurationId,

            dashboardId:
                Number(
                    this.entity.dashboardId
                    ??
                    this.selectedDashboardId
                    ??
                    0
                ),

            dashboardCode:
                this.entity.dashboardCode
                ??
                this.selectedDashboard?.code
                ??
                '',

            dashboardName:
                this.entity.dashboardName
                ??
                this.selectedDashboard?.name
                ??
                '',

            displayName:
                this.entity.displayName
                ??
                '',

            widgetCount:
                this.widgetConfigurationRows.length,

            isActive:
                this.entity.isActive !== false,

            details:
            [
                ...this.widgetConfigurationRows
            ]
        };
    }



    //===========================================================
    // Track Changes
    //===========================================================

    checkForChanges():
        void
    {
        this.hasChanges =
            JSON.stringify(
                this.buildWidgetConfiguration()
            )
            !==
            this.originalEntity;
    }



    //===========================================================
    // Save
    //===========================================================

    onSave():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }


        //=======================================================
        // Row Edit Validation
        //=======================================================

        if
        (
            this.isRowEditMode
        )
        {
            this.toast.error(
                'Validation',

                'Please click the row Update button before saving the complete configuration.'
            );


            return;
        }


        //=======================================================
        // Dashboard Validation
        //=======================================================

        if
        (
            this.selectedDashboardId === null
            ||
            this.selectedDashboardId <= 0
        )
        {
            this.toast.error(
                'Validation',

                'Dashboard is required.'
            );


            return;
        }


        //=======================================================
        // Widget Validation
        //=======================================================

        if
        (
            this.widgetConfigurationRows.length === 0
        )
        {
            this.toast.error(
                'Validation',

                'At least one widget is required.'
            );


            return;
        }


        this.entity =
            this.buildWidgetConfiguration();


        //=======================================================
        // Create
        //=======================================================

        if
        (
            this.mode === 'add'
        )
        {
            this.create(
                this.entity
            );


            return;
        }


        //=======================================================
        // Update
        //=======================================================

        this.update(
            this.entity
        );
    }



    //===========================================================
    // Create
    //===========================================================

    private create
    (
        payload:
            WidgetConfiguration
    ):
        void
    {
        this.progressDialog.show(
            'Creating Widget Configuration',

            'Preparing data...',

            false
        );


        this.progressDialog.update(
            20,

            'Preparing data...'
        );


        this.widgetconfigurationservice
            .create(
                payload
            )
            .subscribe(
            {
                next:
                    (
                        id:
                            number
                    ):
                        void =>
                {
                    this.widgetConfigurationId =
                        Number(id);


                    this.progressDialog.update(
                        80,

                        'Widget configuration saved successfully...'
                    );


                    this.progressDialog.update(
                        100,

                        'Finalizing...'
                    );


                    setTimeout(
                        () =>
                        {
                            this.progressDialog.close();


                            this.toast.success(
                                'Success',

                                'Widget Configuration created successfully.'
                            );


                            this.hasChanges =
                                false;


                            void this.router.navigate(
                            [
                                '/infrastructure-control/application-configuration/widget-configuration/list'
                            ]);
                        },

                        300
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
                        'Create Widget Configuration Error',

                        error
                    );


                    this.progressDialog.close();


                    this.toast.error(
                        'Save Failed',

                        this.getErrorMessage(
                            error,

                            'Failed to create Widget Configuration.'
                        )
                    );
                }
            });
    }



    //===========================================================
    // Update
    //===========================================================

    private update
    (
        payload:
            WidgetConfiguration
    ):
        void
    {
        this.progressDialog.show(
            'Updating Widget Configuration',

            'Preparing data...',

            false
        );


        this.progressDialog.update(
            20,

            'Preparing data...'
        );


        this.widgetconfigurationservice
            .update(
                payload
            )
            .subscribe(
            {
                next:
                    ():
                        void =>
                {
                    this.progressDialog.update(
                        80,

                        'Widget configuration updated successfully...'
                    );


                    this.progressDialog.update(
                        100,

                        'Finalizing...'
                    );


                    setTimeout(
                        () =>
                        {
                            this.progressDialog.close();


                            this.toast.success(
                                'Success',

                                'Widget Configuration updated successfully.'
                            );


                            this.hasChanges =
                                false;


                            void this.router.navigate(
                            [
                                '/infrastructure-control/application-configuration/widget-configuration/list'
                            ]);
                        },

                        300
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
                        'Update Widget Configuration Error',

                        error
                    );


                    this.progressDialog.close();


                    this.toast.error(
                        'Update Failed',

                        this.getErrorMessage(
                            error,

                            'Failed to update Widget Configuration.'
                        )
                    );
                }
            });
    }



    //===========================================================
    // Error Message
    //===========================================================

    private getErrorMessage
    (
        error:
            unknown,

        fallback:
            string
    ):
        string
    {
        if
        (
            typeof error ===
            'string'
        )
        {
            return error;
        }


        if
        (
            error
            &&
            typeof error ===
            'object'
        )
        {
            const response =
                error as
                {
                    error?:
                        unknown;

                    message?:
                        string
                };


            if
            (
                typeof response.message ===
                'string'
            )
            {
                return response.message;
            }


            if
            (
                typeof response.error ===
                'string'
            )
            {
                return response.error;
            }


            if
            (
                response.error
                &&
                typeof response.error ===
                'object'
            )
            {
                const body =
                    response.error as
                    {
                        message?:
                            string;

                        title?:
                            string
                    };


                if
                (
                    typeof body.message ===
                    'string'
                )
                {
                    return body.message;
                }


                if
                (
                    typeof body.title ===
                    'string'
                )
                {
                    return body.title;
                }
            }
        }


        return fallback;
    }



    //===========================================================
    // Clear
    //===========================================================

    onClear():
        void
    {
        if
        (
            this.mode === 'edit'
            ||
            this.mode === 'view'
        )
        {
            this.loadWidgetConfiguration();


            return;
        }


        this.initializeEntity();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        if
        (
            !this.hasChanges
        )
        {
            void this.router.navigate(
            [
                '/infrastructure-control/application-configuration/widget-configuration/list'
            ]);


            return;
        }


        this.confirmDialog.open(

            'Cancel Changes',

            'Any unsaved changes will be lost. Do you want to leave this page?',


            () =>
            {
                void this.router.navigate(
                [
                    '/infrastructure-control/application-configuration/widget-configuration/list'
                ]);
            },


            'Leave',

            'Stay',

            'primary'
        );
    }



    //===========================================================
    // Close
    //===========================================================

    close():
        void
    {
        this.onBackToList();
    }



    //===========================================================
    // Refresh
    //===========================================================

    refresh():
        void
    {
        if
        (
            this.mode === 'edit'
            ||
            this.mode === 'view'
        )
        {
            this.loadWidgetConfiguration();


            return;
        }


        this.initializeEntity();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Value Changed
    //===========================================================

    onValueChange():
        void
    {
        this.checkForChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Record Counter
    //===========================================================

    get recordCounterSections():
        RecordCounterSection[]
    {
        return [

            {
                label:'Widgets',

                value:
                    this.widgetConfigurationRows.length
            },


            {
                label:'Active',

                value:
                    this.widgetConfigurationRows.filter(
                        row =>
                            row.isActive !== false
                    ).length
            },


            {
                label:'Inactive',

                value:
                    this.widgetConfigurationRows.filter(
                        row =>
                            row.isActive === false
                    ).length
            },


            {
                label:'Total',

                value:
                    this.widgetConfigurationRows.length
            }

        ];
    }

}