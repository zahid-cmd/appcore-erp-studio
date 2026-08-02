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
    PageCanvasComponent,
    PageCanvasConfig
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

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
    ItemCart,
    ItemCartColumn,
    ItemCartRow
}
from '../../../../../../shared/components/layout/item-cart/item-cart';

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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

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
    PaginationComponent
}
from '../../../../../../shared/components/controls/pagination/pagination';

import
{
    ActivityItem
}
from '../../../../../../shared/components/utilities/activity-selector/activity-selector';

import
{
    RecordCounterComponent
}
from '../../../../../../shared/components/utilities/record-counter/record-counter';

import
{
    ProgressDialogComponent
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';

//===============================================================
// Models & Services
//===============================================================

import
{
    ActivityAssignment
}
from '../../models/activity-assignment.model';

import
{
    ActivityAssignmentPermission
}
from '../../models/activity-assignment-permission.model';

import
{
    ActivityAssignmentService
}
from '../../services/activity-assignment.service';

import
{
    RoleProfileService
}
from '../../../role-profiles/services/role-profile.service';

import
{
    ModuleService
}
from '../../../../../infrastructure-control/navigation-management/services/module.service';

import
{
    NavigationMenuService
}
from '../../../../../infrastructure-control/navigation-management/services/menu.service';

import
{
    NavigationSubmenuService
}
from '../../../../../infrastructure-control/navigation-management/services/submenu.service';

import
{
    MasterActivityService
}
from '../../../../../infrastructure-control/navigation-management/services/master-activity.service';

import
{
    NavigationActivityService
}
from '../../../../../infrastructure-control/navigation-management/services/activity.service';

import
{
    RecordCounterSection
}
from '../../../../../../shared/components/utilities/record-counter/record-counter.model';

import
{
    ProgressDialogService
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-activity-assignment-form',

    standalone:true,

    imports:
    [
        CommonModule,
        FormsModule,

        PageCanvasComponent,
        PageHeaderComponent,
        RecordCounterComponent,
        PageToolbarComponent,

        ItemCart,

        CommandCenterComponent,
        ControlTabsComponent,
        SearchDropdownComponent,

        ToastComponent,
        ConfirmDialogComponent,
        PaginationComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./activity-assignment-form.html',

    styleUrls:
    [
        './activity-assignment-form.css'
    ]
})


export class ActivityAssignmentFormComponent
implements OnInit
{

    //===========================================================
    // Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly activityAssignmentService =
        inject(ActivityAssignmentService);


    private readonly confirmDialog =
        inject(ConfirmDialogService);


    private readonly toast =
        inject(ToastService);


    private readonly cdr =
        inject(ChangeDetectorRef);


    private readonly roleProfileService =
        inject(RoleProfileService);


    private readonly moduleService =
        inject(ModuleService);


    private readonly menuService =
        inject(NavigationMenuService);


    private readonly submenuService =
        inject(NavigationSubmenuService);


    private readonly masterActivityService =
        inject(MasterActivityService);


    private readonly navigationActivityService =
        inject(NavigationActivityService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    //===========================================================
    // Mode
    //===========================================================

    mode:
        'add' | 'edit' | 'view'
        =
        'add';


    activityAssignmentId =
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
    // Tab Change
    //===========================================================

    onTabChange(
        tab:string
    ):
        void
    {
        this.selectedTab =
            tab;
    }

    //===========================================================
    // Header
    //===========================================================

    pageTitle =
        'Activity Assignment';


    entityName =
        'Activity Assignment';


    selectedTab =
        'general';



    //===========================================================
    // Tab Title
    //===========================================================

    get tabTitle():
        string
    {
        switch(this.mode)
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
        }];
    }



    //===========================================================
    // Pagination
    //===========================================================

    currentPage =
        1;


    pageSize =
        10;



    //===========================================================
    // Loading State
    //===========================================================

    loading =
        false;


    orbitLoading =
        false;


    loadFailed =
        false;



    //===========================================================
    // Header Activity Checkbox
    //===========================================================

    headerCheckboxStates:
    {
        [field:string]:boolean;
    } =
    {
        masterActivities:false,

        specialActivities:false
    };



    //===========================================================
    // Activity Loading Tracker
    //===========================================================

    private pendingActivityLoads =
        0;


    private completedActivityLoads =
        0;

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
    // Selection Collections
    //===========================================================

    roleProfiles:
        any[] =
    [
    ];


    modules:
        any[] =
    [
    ];


    menus:
        any[] =
    [
    ];


    subMenus:
        any[] =
    [
    ];

    //===========================================================
    // Activity Collections
    //===========================================================

    masterActivities:
        ActivityItem[] =
    [
    ];

    specialActivities:
        ActivityItem[] =
    [
    ];

    //==========================================================
    // Permission Collection
    //===========================================================

    activityAssignmentPermissions:
        ActivityAssignmentPermission[] =
    [
    ];

    //===========================================================
    // Selection State
    //===========================================================

    isAddDisabled =
        true;

    //==========================================================
    // Selected Values
    //===========================================================

    selectedRoleProfileId:
        number | null =
        null;


    selectedModuleId:
        number | null =
        null;


    selectedMenuId:
        number | null =
        null;


    selectedSubMenuId:
        number | null =
        null;



    //===========================================================
    // Activity Assignment
    //===========================================================

    activityAssignment:
        ActivityAssignment =
    {
        activityAssignmentId:0,

        roleProfileId:0,

        roleProfileName:'',

        pageCount:0,

        masterActivityCount:0,

        specialActivityCount:0,

        totalActivityCount:0,

        isActive:true,

        details:[]
    };



    //===========================================================
    // State
    //===========================================================

    private originalActivityAssignment =
        '';


    hasChanges =
        false;



    //===========================================================
    // Role Profile Lock
    //===========================================================

    isRoleProfileLocked =
        false;



    //===========================================================
    // Default Collections
    //===========================================================

    private readonly defaultModules =
    [
        {
            id:0,

            code:'',

            name:'All Modules'
        }
    ];

    private readonly defaultMenus =
    [
        {
            id:0,

            code:'',

            name:'All Menus'
        }
    ];

    private readonly defaultSubMenus =
    [
        {
            id:0,

            code:'',

            name:'All Sub Menus'
        }
    ];


    //===========================================================
    // Item Cart Rows
    //===========================================================

    itemCartRows:
        ItemCartRow[] =
    [
    ];



    pagedItemCartRows:
        ItemCartRow[] =
    [
    ];

    //===========================================================
    // Item Cart Columns
    //===========================================================

    readonly itemCartColumns:
        ItemCartColumn[] =
    [
        {
            header:'#',

            field:'serial',

            type:'serial',

            width:'100px',

            align:'center'
        },

        {
            header:'Menu',

            field:'menu',

            type:'text',

            width:'260px',

            align:'left'
        },

        {
            header:'Sub Menu',

            field:'subMenu',

            type:'text',

            width:'260px',

            align:'left'
        },

        {
            header:'Master Activities',

            field:'masterActivities',

            type:'masterActivities',

            width:'460px',

            align:'center',

            headerCheckbox:true
        },

        {
            header:'Special Activities',

            field:'specialActivities',

            type:'specialActivities',

            width:'460px',

            align:'center',

            headerCheckbox:true
        },

        {
            header:'Action',

            field:'action',

            type:'action',

            width:'60px',

            align:'center'
        }
    ];
    //===========================================================
    // Header Activity Checkbox Changed
    //===========================================================

    onHeaderCheckboxStateChanged
    (
        event:
        {
            field:string;

            checked:boolean;
        }
    ):
        void
    {
        this.headerCheckboxStates[
            event.field
        ] =
            event.checked;


        switch(event.field)
        {
            case 'masterActivities':

                this.toggleMasterActivities(
                    event.checked
                );

                break;


            case 'specialActivities':

                this.toggleSpecialActivities(
                    event.checked
                );

                break;
        }


        this.updatePagination();


        this.detectChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Toggle Master Activities
    //===========================================================

    toggleMasterActivities
    (
        checked:boolean
    ):
        void
    {
        this.itemCartRows =
            this.itemCartRows.map(row =>
            ({
                ...row,

                masterActivities:
                    row.masterActivities.map(activity =>
                    ({
                        ...activity,

                        checked
                    }))
            }));

        this.updatePagination();

        this.updateHeaderCheckboxStates();
    }

    //===========================================================
    // Toggle Special Activities
    //===========================================================

    toggleSpecialActivities
    (
        checked:boolean
    ):
        void
    {
        this.itemCartRows =
            this.itemCartRows.map(row =>
            ({
                ...row,

                specialActivities:
                    row.specialActivities.map(activity =>
                    ({
                        ...activity,

                        checked
                    }))
            }));

        this.updatePagination();

        this.updateHeaderCheckboxStates();
    }


    //===========================================================
    // Activity Changed
    //===========================================================

    onActivityChanged():
        void
    {
        this.updateHeaderCheckboxStates();

        this.detectChanges();
    }

    //===========================================================
    // Remove Item
    //===========================================================

    onRemoveItem
    (
        row:ItemCartRow
    ):
        void
    {
        this.itemCartRows =
            this.itemCartRows.filter(
                item =>
                    item.subMenuId !== row.subMenuId
            );

        //=======================================================
        // Update Role Profile Lock
        //=======================================================

        this.updateRoleProfileLock();

        this.updatePagination();

        this.updateHeaderCheckboxStates();

        this.detectChanges();
    }

    //===========================================================
    // Update Header Checkbox States
    //===========================================================

    updateHeaderCheckboxStates():
        void
    {
        const hasMasterActivities =
            this.itemCartRows.some(
                row => row.masterActivities.length > 0
            );

        const hasSpecialActivities =
            this.itemCartRows.some(
                row => row.specialActivities.length > 0
            );

        this.headerCheckboxStates =
        {
            masterActivities:
                hasMasterActivities
                &&
                this.itemCartRows.every(
                    row =>
                        row.masterActivities.length === 0
                        ||
                        row.masterActivities.every(
                            activity => activity.checked
                        )
                ),

            specialActivities:
                hasSpecialActivities
                &&
                this.itemCartRows.every(
                    row =>
                        row.specialActivities.length === 0
                        ||
                        row.specialActivities.every(
                            activity => activity.checked
                        )
                )
        };

        this.cdr.detectChanges();
    }


    //===========================================================
    // Update Pagination
    //===========================================================

    updatePagination():
        void
    {
        const totalPages =

            Math.max(

                1,

                Math.ceil(

                    this.itemCartRows.length
                    /
                    this.pageSize

                )
            );


        if
        (
            this.currentPage > totalPages
        )
        {
            this.currentPage =
                totalPages;
        }


        const start =

            (
                this.currentPage - 1
            )
            *
            this.pageSize;



        this.pagedItemCartRows =

            this.itemCartRows.slice(

                start,

                start + this.pageSize
            );
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
        pageSize:number
    ):
        void
    {
        this.pageSize =
            pageSize;


        this.currentPage =
            1;


        this.updatePagination();
    }
    //===========================================================
    // Init
    //===========================================================

    ngOnInit():
        void
    {
        this.initializeMode();

        this.loadRoleProfiles();

        this.loadModules();

        this.loadMasterActivities();

        this.updatePagination();

        this.updatePagination();

        this.updateRoleProfileLock();
    }

    //===========================================================
    // Load Role Profiles
    //===========================================================

    private loadRoleProfiles():
        void
    {
        const request =

            this.mode === 'add'

            ?

            this.roleProfileService
                .getAvailableForActivityAssignment()

            :

            this.roleProfileService
                .getAll();


        request.subscribe(
        {
            next:(response) =>
            {
                this.roleProfiles =
                    response;


                this.cdr.detectChanges();
            },


            error:(error) =>
            {
                console.error(error);


                this.toast.error(
                    'Error',
                    'Failed to load role profiles.'
                );
            }
        });
    }

    //===========================================================
    // Load Modules
    //===========================================================

    private loadModules():
        void
    {
        this.moduleService

            .getAll()

            .subscribe(
            {
                next:(response) =>
                {
                    this.modules =
                    [
                        ...this.defaultModules,

                        ...response
                    ];

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(error);

                    this.toast.error(
                        'Error',
                        'Failed to load modules.'
                    );
                }
            });
    }

    //===========================================================
    // Load Master Activities
    //===========================================================

    private loadMasterActivities():
        void
    {
        this.masterActivityService

            .getAll()

            .subscribe(
            {
                next:(response) =>
                {
                    this.masterActivities =
                        response.map(
                            activity => (
                            {
                                id:
                                    activity.id,

                                text:
                                    activity.name,

                                checked:
                                    false
                            })
                        );

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(error);

                    this.toast.error(
                        'Error',
                        'Failed to load master activities.'
                    );
                }
            });
    }

    //===========================================================
    // Load Special Activities
    //===========================================================

    private loadSpecialActivities
    (
        row:ItemCartRow,
        moduleId:number
    ):
        void
    {
        //=======================================================
        // Invalid Module
        //=======================================================

        if
        (
            !moduleId
            ||
            moduleId <= 0
        )
        {
            row.specialActivities =
            [
            ];

            this.completedActivityLoads++;

            if
            (
                this.completedActivityLoads >= this.pendingActivityLoads
            )
            {
                this.orbitLoading =
                    false;

                this.applyPermissionsToCart();

                this.updatePagination();

                this.updateHeaderCheckboxStates();

                this.cdr.detectChanges();
            }

            return;
        }

        //=======================================================
        // Load Activities
        //=======================================================

        this.navigationActivityService

            .getAll(
                moduleId
            )

            .subscribe(
            {
                next:(activities) =>
                {
                    const existingPermissions =

                        this.getExistingPermissions(
                            row.subMenuId
                        );

                    row.specialActivities =

                        activities.map(
                            activity =>
                            ({
                                id:
                                    activity.id,

                                text:
                                    activity.name,

                                checked:

                                    existingPermissions.some(
                                        permission =>
                                            permission.navigationActivityId ===
                                            activity.id
                                    )
                            })
                        );


                    this.completedActivityLoads++;

                    if
                    (
                        this.completedActivityLoads >= this.pendingActivityLoads
                    )
                    {
                        this.orbitLoading =
                            false;

                        this.applyPermissionsToCart();
                    }


                    this.updatePagination();

                    this.updateHeaderCheckboxStates();

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(error);

                    row.specialActivities =
                    [
                    ];

                    this.completedActivityLoads++;

                    if
                    (
                        this.completedActivityLoads >= this.pendingActivityLoads
                    )
                    {
                        this.orbitLoading =
                            false;
                    }

                    this.toast.error(
                        'Error',
                        'Failed to load special activities.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Initialize Mode
    //===========================================================

    private initializeMode():
        void
    {
        const url =
            this.router.url;


        if
        (
            url.includes('/edit/')
        )
        {
            this.mode =
                'edit';
        }
        else if
        (
            url.includes('/view/')
        )
        {
            this.mode =
                'view';
        }
        else
        {
            this.mode =
                'add';
        }


        const id =
            this.route.snapshot.paramMap.get(
                'id'
            );


        if
        (
            id
        )
        {
            this.activityAssignmentId =
                Number(id);


            this.loadActivityAssignment();
        }
        else
        {
            this.loadDefaults();
        }
    }



    //===========================================================
    // Load Defaults
    //===========================================================

    private loadDefaults():
        void
    {
        this.activityAssignmentService

            .getDefaults()

            .subscribe(
            {
                next:(response) =>
                {
                    this.activityAssignment =
                        response;


                    this.originalActivityAssignment =

                        JSON.stringify(
                            response
                        );


                    this.cdr.detectChanges();
                },


                error:(error) =>
                {
                    console.error(error);


                    this.toast.error(
                        'Error',
                        'Failed to load default values.'
                    );
                }
            });
    }

    //===========================================================
    // Load Activity Assignment
    //===========================================================

    private loadActivityAssignment():
        void
    {
        this.loading =
            false;

        this.orbitLoading =
            true;

        this.loadFailed =
            false;

        this.activityAssignmentService

            .getById(
                this.activityAssignmentId
            )

            .subscribe(
            {
                next:(response) =>
                {
                    this.bindActivityAssignment(
                        response
                    );

                    //===================================================
                    // Do NOT stop the Orbit Loader here.
                    // It will be stopped after menus, sub menus,
                    // item cart and special activities are fully loaded.
                    //===================================================
                },

                error:(error) =>
                {
                    console.error(error);

                    this.orbitLoading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error(
                        'Error',
                        'Failed to load activity assignment.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Bind Activity Assignment
    //===========================================================

    private bindActivityAssignment
    (
        data:ActivityAssignment
    ):
        void
    {
        this.activityAssignment =
        {
            ...data
        };


        this.selectedRoleProfileId =
            data.roleProfileId;


        this.activityAssignmentPermissions =
        [
        ];


        data.details.forEach(
            detail =>
            {
                detail.activityAssignmentPermissions.forEach(
                    permission =>
                    {
                        this.activityAssignmentPermissions.push(
                        {
                            activityAssignmentPermissionId:
                                permission.activityAssignmentPermissionId,

                            activityAssignmentDetailId:
                                detail.activityAssignmentDetailId,

                            masterActivityId:
                                permission.masterActivityId,

                            navigationActivityId:
                                permission.navigationActivityId,

                            activityName:
                                permission.activityName
                        });
                    });
            });


        //=======================================================
        // Default Hierarchy
        //=======================================================

        this.selectedModuleId =
            null;

        this.selectedMenuId =
            null;

        this.selectedSubMenuId =
            null;

        this.loadMenus(
            0
        );


        this.originalActivityAssignment =

            JSON.stringify(
                data
            );


        this.updateHeaderCheckboxStates();

        this.updateRoleProfileLock();
    }

    //===========================================================
    // Apply Existing Permissions To Cart
    //===========================================================

    private applyPermissionsToCart():
        void
    {
        this.itemCartRows.forEach(
            row =>
            {
                const existingPermissions =

                    this.getExistingPermissions(
                        row.subMenuId
                    );


                row.masterActivities.forEach(
                    activity =>
                    {
                        activity.checked =

                            existingPermissions.some(
                                permission =>
                                    permission.masterActivityId ===
                                    activity.id
                            );
                    });


                row.specialActivities.forEach(
                    activity =>
                    {
                        activity.checked =

                            existingPermissions.some(
                                permission =>
                                    permission.navigationActivityId ===
                                    activity.id
                            );
                    });
            });


        this.updatePagination();

        this.updateHeaderCheckboxStates();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Detect Changes
    //===========================================================

    private detectChanges():
        void
    {
        this.hasChanges =

            JSON.stringify(
                this.activityAssignment
            )
            !==
            this.originalActivityAssignment;
    }


    //===========================================================
    // Role Profile Changed
    //===========================================================

    onRoleProfileChanged
    (
        value:number | null
    ):
        void
    {
        this.selectedRoleProfileId =
            value;


        this.isAddDisabled =
            this.selectedRoleProfileId == null;


        if
        (
            this.selectedRoleProfileId
        )
        {
            this.activityAssignment.roleProfileId =
                this.selectedRoleProfileId;
        }


        this.detectChanges();
    }

    //===========================================================
    // Module Changed
    //===========================================================

    onModuleChanged
    (
        value:number | null
    ):
        void
    {
        this.selectedModuleId =
            value;

        this.selectedMenuId =
            null;

        this.selectedSubMenuId =
            null;

        this.menus =
        [
            ...this.defaultMenus
        ];

        this.subMenus =
        [
            ...this.defaultSubMenus
        ];

        //=======================================================
        // Nothing Selected
        //=======================================================

        if
        (
            value == null
        )
        {
            this.isAddDisabled =
                true;

            return;
        }

        //=======================================================
        // All Modules
        //=======================================================

        if
        (
            value === 0
        )
        {
            this.selectedMenuId =
                0;

            this.selectedSubMenuId =
                0;

            this.loadMenus(
                0
            );

            this.loadAllSubMenus();

            this.isAddDisabled =
                false;

            return;
        }

        //=======================================================
        // Specific Module
        //=======================================================

        this.loadMenus(
            value
        );

        this.isAddDisabled =
            true;
    }

    //===========================================================
    // Load Menus
    //===========================================================

    private loadMenus
    (
        moduleId:number
    ):
        void
    {
        const request =

            moduleId === 0
            ?
            this.menuService.getAll()
            :
            this.menuService.getByModule(
                moduleId
            );


        request.subscribe(
        {
            next:(response:any[]) =>
            {
                this.menus =
                [
                    ...this.defaultMenus,

                    ...response
                ];


                //===================================================
                // Default Menu Selection During Edit/View
                //===================================================

                if
                (
                    this.mode !== 'add'
                )
                {
                    this.selectedMenuId =
                        null;

                    this.selectedSubMenuId =
                        null;

                    this.loadSubMenus(
                        0
                    );

                    return;
                }


                if
                (
                    this.activityAssignmentPermissions.length > 0
                )
                {
                    this.applyPermissionsToCart();
                }


                this.cdr.detectChanges();
            },


            error:(error:any) =>
            {
                console.error(error);


                this.toast.error(
                    'Error',
                    'Failed to load menus.'
                );
            }
        });
    }

    //===========================================================
    // Menu Changed
    //===========================================================

    onMenuChanged
    (
        value:number | null
    ):
        void
    {
        this.selectedMenuId =
            value;

        this.selectedSubMenuId =
            null;

        this.subMenus =
        [
            ...this.defaultSubMenus
        ];

        //=======================================================
        // Nothing Selected
        //=======================================================

        if
        (
            value == null
        )
        {
            this.isAddDisabled =
                true;

            return;
        }

        //=======================================================
        // All Menus
        //=======================================================

        if
        (
            value === 0
        )
        {
            this.loadAllSubMenus();

            this.isAddDisabled =
                true;

            return;
        }

        //=======================================================
        // Specific Menu
        //=======================================================

        this.loadSubMenus(
            value
        );

        this.isAddDisabled =
            true;
    }

    //===========================================================
    // Load Sub Menus
    //===========================================================

    private loadSubMenus
    (
        menuId:number
    ):
        void
    {
        const request =

            menuId === 0
            ?
            this.submenuService.getAll()
            :
            this.submenuService.getByMenu(
                menuId
            );


        request.subscribe(
        {
            next:(response:any[]) =>
            {
                this.subMenus =
                [
                    ...this.defaultSubMenus,

                    ...response
                ];


                //===================================================
                // Restore Item Cart During Edit/View
                //===================================================

                if
                (
                    this.mode !== 'add'
                )
                {
                    this.refreshItemCartRows();

                    this.applyPermissionsToCart();

                    this.cdr.detectChanges();

                    return;
                }


                this.cdr.detectChanges();
            },


            error:(error:any) =>
            {
                console.error(error);


                this.toast.error(
                    'Error',
                    'Failed to load sub menus.'
                );
            }
        });
    }



    //===========================================================
    // Load All Sub Menus
    //===========================================================

    private loadAllSubMenus():
        void
    {
        this.submenuService

            .getAll()

            .subscribe(
            {
                next:(response:any[]) =>
                {
                    this.subMenus =
                    [
                        ...this.defaultSubMenus,

                        ...response
                    ];


                    this.cdr.detectChanges();
                },


                error:(error:any) =>
                {
                    console.error(error);


                    this.toast.error(
                        'Error',
                        'Failed to load sub menus.'
                    );
                }
            });
    }



    //===========================================================
    // Sub Menu Changed
    //===========================================================

    onSubMenuChanged
    (
        value:number | null
    ):
        void
    {
        this.selectedSubMenuId =
            value;
    }

    //===========================================================
    // Refresh Item Cart Rows
    //===========================================================

    private refreshItemCartRows():
        void
    {
        //=======================================================
        // Edit / View Mode
        //=======================================================

        if
        (
            this.mode !== 'add'
            &&
            this.activityAssignment.details.length > 0
        )
        {
            this.pendingActivityLoads =
                this.activityAssignment.details.length;

            this.completedActivityLoads =
                0;

            this.orbitLoading =
                true;

            this.itemCartRows =

                this.activityAssignment.details.map(
                    detail =>
                    {
                        const existingPermissions =

                            this.getExistingPermissions(
                                detail.subMenuId
                            );

                        const row:ItemCartRow =
                        {
                            id:
                                detail.subMenuId,

                            roleProfileId:
                                this.selectedRoleProfileId
                                ??
                                0,

                            moduleId:
                                detail.moduleId,

                            menuId:
                                detail.menuId,

                            subMenuId:
                                detail.subMenuId,

                            menu:
                                detail.menuName,

                            subMenu:
                                detail.subMenuName,

                            masterActivities:

                                this.masterActivities.map(
                                    activity =>
                                    ({
                                        id:
                                            activity.id,

                                        text:
                                            activity.text,

                                        checked:

                                            existingPermissions.some(
                                                permission =>
                                                    permission.masterActivityId ===
                                                    activity.id
                                            )
                                    })
                                ),

                            specialActivities:
                            [
                            ]
                        };

                        this.loadSpecialActivities(
                            row,
                            detail.moduleId
                        );

                        return row;
                    }
                );

            this.updatePagination();

            this.updateHeaderCheckboxStates();

            this.cdr.detectChanges();

            return;
        }


        //=======================================================
        // Add Mode
        //=======================================================

        if
        (
            this.subMenus.length === 0
        )
        {
            this.itemCartRows =
            [
            ];

            this.updatePagination();

            return;
        }


        this.itemCartRows =

            this.subMenus

                .filter(
                    subMenu =>

                        subMenu.id === 0
                        ||
                        !this.selectedSubMenuId
                        ||
                        subMenu.id === this.selectedSubMenuId
                )

                .map(
                    subMenu =>
                    {
                        const existingPermissions =

                            this.getExistingPermissions(
                                subMenu.id
                            );

                        const row:ItemCartRow =
                        {
                            id:
                                subMenu.id,

                            roleProfileId:
                                this.selectedRoleProfileId
                                ??
                                0,

                            moduleId:
                                this.selectedModuleId
                                ??
                                0,

                            menuId:
                                this.selectedMenuId
                                ??
                                0,

                            subMenuId:
                                subMenu.id,

                            menu:
                                subMenu.menuName
                                ??
                                '',

                            subMenu:
                                subMenu.name,

                            masterActivities:

                                this.masterActivities.map(
                                    activity =>
                                    ({
                                        id:
                                            activity.id,

                                        text:
                                            activity.text,

                                        checked:

                                            existingPermissions.some(
                                                permission =>
                                                    permission.masterActivityId ===
                                                    activity.id
                                            )
                                    })
                                ),

                            specialActivities:
                            [
                            ]
                        };

                        this.loadSpecialActivities(
                            row,
                            row.moduleId
                        );

                        return row;
                    }
                );


        this.updatePagination();

        this.updateHeaderCheckboxStates();

        this.cdr.detectChanges();
    }

//===========================================================
// Get Existing Permissions
//===========================================================

private getExistingPermissions
(
    subMenuId:number
):
    ActivityAssignmentPermission[]
{
    const detail =

        this.activityAssignment.details.find(
            x =>
                x.subMenuId === subMenuId
        );


    if
    (
        !detail
    )
    {
        return [];
    }


    return detail.activityAssignmentPermissions ?? [];
}



    //===========================================================
    // Build Permission Rows
    //===========================================================

    private buildPermissionRows
    (
        existingPermissions:
            ActivityAssignmentPermission[]
    ):
        any[]
    {
        return [

            ...this.masterActivities.map(
                activity =>
                ({
                    activityAssignmentPermissionId:
                        0,


                    masterActivityId:
                        activity.id,


                    navigationActivityId:
                        null,


                    activityName:
                        activity.text,


                    checked:

                        existingPermissions.some(
                            permission =>

                                permission.masterActivityId ===
                                activity.id
                        )
                })
            ),



            ...this.specialActivities.map(
                activity =>
                ({
                    activityAssignmentPermissionId:
                        0,


                    masterActivityId:
                        null,


                    navigationActivityId:
                        activity.id,


                    activityName:
                        activity.text,


                    checked:

                        existingPermissions.some(
                            permission =>

                                permission.navigationActivityId ===
                                activity.id
                        )
                })
            )

        ];
    }



    //===========================================================
    // Build Activity Assignment Payload
    //===========================================================

    private buildActivityAssignment():
        ActivityAssignment
    {
        const details:any[] =
        [];


        this.itemCartRows.forEach(
            row =>
            {
                const permissions =

                    [
                        ...row.masterActivities,

                        ...row.specialActivities
                    ]

                    .filter(
                        permission =>
                            permission.checked
                    )

                    .map(
                        permission =>
                        ({
                            activityAssignmentPermissionId:0,


                            masterActivityId:

                                row.masterActivities.includes(permission)
                                ?
                                permission.id
                                :
                                null,


                            navigationActivityId:

                                row.specialActivities.includes(permission)
                                ?
                                permission.id
                                :
                                null,


                            activityName:

                                permission.text
                        })
                    );


                if
                (
                    permissions.length > 0
                )
                {
                    details.push(
                    {
                        activityAssignmentDetailId:0,


                        activityAssignmentId:

                            this.activityAssignmentId,


                        moduleId:

                            row.moduleId,


                        menuId:

                            row.menuId,


                        subMenuId:

                            row.subMenuId,


                        activityAssignmentPermissions:

                            permissions,


                        isActive:true
                    });
                }
            }
        );


        return {

            activityAssignmentId:

                this.activityAssignment.activityAssignmentId,


            roleProfileId:

                this.selectedRoleProfileId
                ??
                0,


            roleProfileName:

                this.activityAssignment.roleProfileName,


            pageCount:

                details.length,


            masterActivityCount:

                this.getMasterActivityCount(),


            specialActivityCount:

                this.getSpecialActivityCount(),


            totalActivityCount:

                this.getTotalActivityCount(),


            isActive:

                this.activityAssignment.isActive,


            details
        };
    }



    //===========================================================
    // Master Activity Count
    //===========================================================

    private getMasterActivityCount():
        number
    {
        return this.itemCartRows

            .flatMap(
                row =>
                    row.masterActivities
            )

            .filter(
                activity =>

                    activity.checked
            )

            .length;
    }



    //===========================================================
    // Special Activity Count
    //===========================================================

    private getSpecialActivityCount():
        number
    {
        return this.itemCartRows

            .flatMap(
                row =>
                    row.specialActivities
            )

            .filter(
                activity =>

                    activity.checked
            )

            .length;
    }


    //===========================================================
    // Total Activity Count
    //===========================================================

    private getTotalActivityCount():
        number
    {
        return (

            this.getMasterActivityCount()

            +

            this.getSpecialActivityCount()

        );
    }

    //===========================================================
    // Save
    //===========================================================

    save():
        void
    {
        const payload =

            this.buildActivityAssignment();


        if
        (
            this.mode === 'add'
        )
        {
            this.create(
                payload
            );
        }
        else
        {
            this.update(
                payload
            );
        }
    }

    //===========================================================
    // Create
    //===========================================================

    private create
    (
        payload:ActivityAssignment
    ):
        void
    {
        this.progressDialog.show(
            'Saving Activity Assignment',
            'Preparing data...',
            false
        );

        this.progressDialog.update(
            20,
            'Preparing data...'
        );

        setTimeout(
            () =>
            {
                this.progressDialog.update(
                    60,
                    'Saving activity assignment...'
                );

                this.activityAssignmentService

                    .create(
                        payload
                    )

                    .subscribe(
                    {
                        next:() =>
                        {
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
                                        'Activity Assignment created successfully.'
                                    );

                                    this.router.navigate(
                                    [
                                        '/security-permission/role-management/activity-assignment'
                                    ]);
                                },
                                400
                            );
                        },


                        error:(error) =>
                        {
                            this.progressDialog.close();

                            console.error(error);

                            this.toast.error(
                                'Error',
                                'Failed to create activity assignment.'
                            );
                        }
                    });
            },
            300
        );
    }



    //===========================================================
    // Update
    //===========================================================

    private update
    (
        payload:ActivityAssignment
    ):
        void
    {
        this.progressDialog.show(
            'Updating Activity Assignment',
            'Preparing data...',
            false
        );

        this.progressDialog.update(
            20,
            'Preparing data...'
        );

        setTimeout(
            () =>
            {
                this.progressDialog.update(
                    60,
                    'Updating activity assignment...'
                );

                this.activityAssignmentService

                    .update(
                        payload
                    )

                    .subscribe(
                    {
                        next:() =>
                        {
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
                                        'Activity Assignment updated successfully.'
                                    );

                                    this.router.navigate(
                                    [
                                        '/security-permission/role-management/activity-assignment'
                                    ]);
                                },
                                400
                            );
                        },


                        error:(error) =>
                        {
                            this.progressDialog.close();

                            console.error(error);

                            this.toast.error(
                                'Error',
                                'Failed to update activity assignment.'
                            );
                        }
                    });
            },
            300
        );
    }

    //===========================================================
    // Delete
    //===========================================================

    delete():
        void
    {
        this.confirmDialog.open(

            'Delete Activity Assignment',

            'Are you sure you want to delete this activity assignment?',


            () =>
            {
                this.activityAssignmentService

                    .delete(
                        this.activityAssignmentId
                    )

                    .subscribe(
                    {
                        next:() =>
                        {
                            this.toast.success(
                                'Deleted',
                                'Activity Assignment deleted successfully.'
                            );


                            this.router.navigate(
                            [
                                '/security-permission/role-management/activity-assignment'
                            ]);
                        },


                        error:(error) =>
                        {
                            console.error(error);


                            this.toast.error(
                                'Error',
                                'Failed to delete activity assignment.'
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

            'Restore Activity Assignment',

            'Are you sure you want to restore this activity assignment?',


            () =>
            {
                this.activityAssignmentService

                    this.activityAssignmentService.restore()

                    .subscribe(
                    {
                        next:() =>
                        {
                            this.toast.success(
                                'Restored',
                                'Activity Assignment restored successfully.'
                            );


                            this.loadActivityAssignment();
                        },


                        error:(error) =>
                        {
                            console.error(error);


                            this.toast.error(
                                'Error',
                                'Failed to restore activity assignment.'
                            );
                        }
                    });
            }
        );
    }



    //===========================================================
    // Cancel
    //===========================================================

    cancel():
        void
    {
        this.router.navigate(
        [
            '/security-permission/role-management/activity-assignment'
        ]);
    }



    //===========================================================
    // Clear
    //===========================================================

    clear():
        void
    {
        this.selectedModuleId =
            null;

        this.selectedMenuId =
            null;

        this.selectedSubMenuId =
            null;

        this.itemCartRows =
        [
        ];

        this.activityAssignmentPermissions =
        [
        ];

        //=======================================================
        // Update Role Profile Lock
        //=======================================================

        this.updateRoleProfileLock();

        this.updatePagination();

        this.updateHeaderCheckboxStates();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Update Role Profile Lock
    //===========================================================

    private updateRoleProfileLock():
        void
    {
        this.isRoleProfileLocked =
            this.mode !== 'add'
            ||
            this.itemCartRows.length > 0;
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
    // Check Permission
    //===========================================================

    isPermissionChecked
    (
        permission:any
    ):
        boolean
    {
        return permission.checked === true;
    }



    //===========================================================
    // Toggle Permission
    //===========================================================

    togglePermission
    (
        permission:any
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


        permission.checked =
            !permission.checked;


        this.updateHeaderCheckboxStates();


        this.detectChanges();
    }

    //===========================================================
    // Build Selected Rows
    //===========================================================

    private buildSelectedRows():
        ItemCartRow[]
    {
        let selectedSubMenus =
            this.subMenus;

        //=======================================================
        // Remove Default Item
        //=======================================================

        selectedSubMenus =
            selectedSubMenus.filter(
                subMenu =>
                    subMenu.id > 0
            );

        //=======================================================
        // Specific Sub Menu Selected
        //=======================================================

        if
        (
            this.selectedSubMenuId != null
            &&
            this.selectedSubMenuId > 0
        )
        {
            selectedSubMenus =
                selectedSubMenus.filter(
                    subMenu =>
                        subMenu.id ===
                        this.selectedSubMenuId
                );
        }

        //=======================================================
        // Build Cart Rows
        //=======================================================

        const rows:ItemCartRow[] =

            selectedSubMenus.map(
                subMenu =>
                ({
                    //===================================================
                    // Use the real submenu id as the row id
                    //===================================================

                    id:
                        subMenu.id,

                    roleProfileId:
                        this.selectedRoleProfileId ?? 0,

                    moduleId:
                        subMenu.navigationModuleId,

                    menuId:
                        subMenu.navigationMenuId,

                    subMenuId:
                        subMenu.id,

                    menu:
                        subMenu.navigationMenuName,

                    subMenu:
                        subMenu.name,

                    masterActivities:

                        this.masterActivities.map(
                            activity =>
                            ({
                                id:
                                    activity.id,

                                text:
                                    activity.text,

                                checked:
                                    false
                            })
                        ),

                    specialActivities:
                    [
                    ]
                })
            );

        return rows;
    }

    //===========================================================
    // Add Selection
    //===========================================================

    onAddSelection():
        void
    {
        if
        (
            this.selectedRoleProfileId == null
        )
        {
            return;
        }

        const selectedSubMenus =

            this.buildSelectedRows();

        selectedSubMenus.forEach(
            row =>
            {
                const exists =

                    this.itemCartRows.some(
                        item =>
                            item.subMenuId === row.subMenuId
                    );

                if
                (
                    !exists
                )
                {
                    this.itemCartRows.push(
                        row
                    );

                    this.loadSpecialActivities(
                        row,
                        row.moduleId
                    );
                }
            });

        //=======================================================
        // Update Role Profile Lock
        //=======================================================

        this.updateRoleProfileLock();

        this.updatePagination();

        this.updateHeaderCheckboxStates();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Reset Selection
    //===========================================================

    onResetSelection():
        void
    {
        this.itemCartRows =
            this.itemCartRows.map(
                row =>
                ({
                    ...row,

                    masterActivities:
                        row.masterActivities.map(
                            activity =>
                            ({
                                ...activity,

                                checked:false
                            })
                        ),

                    specialActivities:
                        row.specialActivities.map(
                            activity =>
                            ({
                                ...activity,

                                checked:false
                            })
                        )
                })
            );

        this.headerCheckboxStates =
        {
            masterActivities:false,

            specialActivities:false
        };

        this.updateRoleProfileLock();

        this.updatePagination();

        this.detectChanges();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Save Command
    //===========================================================

    onSave():
        void
    {
        this.save();
    }


    //===========================================================
    // Clear Command
    //===========================================================

    onClear():
        void
    {
        this.clear();
    }


    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        this.router.navigate(
        [
            '/security-permission/role-management/activity-assignment'
        ]);
    }

    //===========================================================
    // Back
    //===========================================================

    back():
        void
    {
        this.router.navigate(
        [
            '/security-permission/role-management/activity-assignment'
        ]);
    }



    //===========================================================
    // Save Disabled
    //===========================================================

    get saveDisabled():
        boolean
    {
        return (

            this.isViewMode

            ||

            this.selectedRoleProfileId == null

            ||

            this.itemCartRows.length === 0

        );
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

            this.selectedRoleProfileId == null

            ||

            this.selectedModuleId == null

            ||

            this.selectedMenuId == null

            ||

            this.selectedSubMenuId == null

        );
    }

    //===========================================================
    // Total Selected Permissions
    //===========================================================

    get selectedPermissionCount():
        number
    {
        return this.itemCartRows

            .flatMap(
                row =>
                [
                    ...row.masterActivities,

                    ...row.specialActivities
                ]
            )

            .filter(
                activity =>
                    activity.checked
            )

            .length;
    }

    //===========================================================
    // Record Counter
    //===========================================================

    get recordCounterSections():
        RecordCounterSection[]
    {
        return [

            {
                label:'Submenus',

                value:this.itemCartRows.length
            },

            {
                label:'Master',

                value:this.getMasterActivityCount()
            },

            {
                label:'Special',

                value:this.getSpecialActivityCount()
            },

            {
                label:'Total',

                value:this.getTotalActivityCount()
            }
        ];
    }

}