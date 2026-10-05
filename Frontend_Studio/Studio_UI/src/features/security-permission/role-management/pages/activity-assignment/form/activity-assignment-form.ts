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
    ActivityCartHeaderField,
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
    RecordCounterComponent
}
from '../../../../../../shared/components/utilities/record-counter/record-counter';
import
{
    ProgressDialogComponent
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import
{
    ActivityItem
}
from '../../../../../../shared/components/utilities/activity-selector/activity-selector';
import
{
    SearchBoxComponent
}
from '../../../../../../shared/components/utilities/search-box/search-box';
//===============================================================
// Models & Services
//===============================================================
import
{
    ActivityAssignment,
    ActivityAssignmentPermission
}
from '../../../models/activity-assignment.model';
import
{
    ActivityAssignmentService
}
from '../../../services/activity-assignment.service';
import
{
    RoleProfileService
}
from '../../../services/role-profile.service';
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
    RecordCounterSection
}
from '../../../../../../shared/components/utilities/record-counter/record-counter.model';
import
{
    ProgressDialogService
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';
import
{
    EffectiveAccessService
}
from '../../../../../../core/effective-access/effective-access.service';
import
{
    EffectiveAccess
}
from '../../../../../../core/effective-access/effective-access.model';
import
{
    AuthenticationStorageService
}
from '../../../../../../core/authentication/authentication-storage.service';
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
        SearchBoxComponent,
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
export class ActivityAssignmentForm
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
    private readonly progressDialog =
        inject(ProgressDialogService);
    private readonly effectiveAccessService =
        inject(EffectiveAccessService);
    private readonly authenticationStorageService =
        inject(AuthenticationStorageService);
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
    // Activity Cart Header States
    //===========================================================
    headerCheckboxStates:
    {
        [field:string]:boolean;
    } =
    {
        all:false,
        view:false,
        add:false,
        update:false,
        delete:false,
        restore:false
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
    private allModules:
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
    //===========================================================
    // Effective Access
    //===========================================================
    private effectiveAccess:
        EffectiveAccess[] =
        [
        ];
    private masterActivityPermissionIds:
        {
            add:number | null;
            view:number | null;
            update:number | null;
            delete:number | null;
            restore:number | null;
        } =
        {
            add:null,
            view:null,
            update:null,
            delete:null,
            restore:null
        };
    canAdd =
        false;
    canView =
        false;
    canUpdate =
        false;
    canDelete =
        false;
    canRestore =
        false;
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
    // Activity Search
    //===========================================================
    activitySearchText =
        '';
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
    //===========================================================
    // Edit Cart Initialization
    //
    // Existing database rows are restored into the cart only once.
    // After that, the cart becomes the working source of truth
    // until Update is saved.
    //===========================================================
    private editCartInitialized =
        false;
    hasChanges =
        false;
    //===========================================================
    // Role Profile Lock
    //===========================================================
    isRoleProfileLocked =
        false;
    //===========================================================
    // Infrastructure Control Reservation
    //===========================================================
    private readonly reservedInfrastructureControlRoleProfileId =
        1;
    private readonly infrastructureControlModuleName =
        'Infrastructure Control';
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
            width:'360px',
            align:'left'
        },
        {
            header:'Sub Menu',
            field:'subMenu',
            type:'text',
            width:'460px',
            align:'left'
        },
        {
            header:'',
            field:'masterActivities',
            type:'masterActivities',
            align:'center',
            headerCheckbox:true
        },
        {
            header:'Action',
            field:'action',
            type:'action',
            width:'100px',
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
            field:ActivityCartHeaderField;
            checked:boolean;
        }
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
        this.headerCheckboxStates[event.field] =
            event.checked;
        switch(event.field)
        {
            case 'all':
                this.setAllActivityPermissions(
                    event.checked
                );
                break;
            case 'view':
                this.setActivityPermission(
                    'view',
                    event.checked
                );
                break;
            case 'add':
                this.setActivityPermission(
                    'add',
                    event.checked
                );
                break;
            case 'update':
                this.setActivityPermission(
                    'update',
                    event.checked
                );
                break;
            case 'delete':
                this.setActivityPermission(
                    'delete',
                    event.checked
                );
                break;
            case 'restore':
                this.setActivityPermission(
                    'restore',
                    event.checked
                );
                break;
        }
        this.updatePagination();
        this.updateHeaderCheckboxStates();
        this.updateRoleProfileLock();
        this.detectChanges();
        this.cdr.detectChanges();
    }
    //===========================================================
    // Set All Activity Permissions
    //===========================================================
    private setAllActivityPermissions
    (
        checked:boolean
    ):
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
                                checked
                            })
                        )
                })
            );
    }
    //===========================================================
    // Set Activity Permission
    //===========================================================
    private setActivityPermission
    (
        activityName:string,
        checked:boolean
    ):
        void
    {
        const target =
            activityName
                .trim()
                .toLowerCase();
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
                                checked:
                                    String(
                                        activity.text ??
                                        ''
                                    )
                                    .trim()
                                    .toLowerCase() ===
                                    target
                                    ?
                                    checked
                                    :
                                    activity.checked
                            })
                        )
                })
            );
    }
    //===========================================================
    // Activity Changed
    //===========================================================
    onActivityChanged():
        void
    {
        this.updateHeaderCheckboxStates();
        this.detectChanges();
        this.cdr.detectChanges();
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
        this.cdr.detectChanges();
    }
    //===========================================================
    // Update Header Checkbox States
    //===========================================================
    updateHeaderCheckboxStates():
        void
    {
        const activities =
            this.itemCartRows.flatMap(
                row => row.masterActivities
            );
        const activityState =
            (name:string):boolean =>
            {
                const matchingActivities =
                    activities.filter(
                        activity =>
                            String(
                                activity.text ??
                                ''
                            )
                            .trim()
                            .toLowerCase() ===
                            name
                    );
                return matchingActivities.length > 0
                    &&
                    matchingActivities.every(
                        activity => activity.checked
                    );
            };
        this.headerCheckboxStates =
        {
            all:
                activities.length > 0
                &&
                activities.every(
                    activity => activity.checked
                ),
            view:activityState('view'),
            add:activityState('add'),
            update:activityState('update'),
            delete:activityState('delete'),
            restore:activityState('restore')
        };
        this.cdr.detectChanges();
    }

    //===========================================================
    // Activity Search
    //===========================================================
    onActivitySearch
    (
        value:string
    ):
        void
    {
        this.activitySearchText =
            value ?? '';
        this.currentPage =
            1;
        this.updatePagination();
        this.cdr.detectChanges();
    }
    //===========================================================
    // Filter Item Cart Rows
    //
    // Searches the already loaded Menu and Sub Menu values.
    // The original itemCartRows collection is never modified.
    //===========================================================
    private getFilteredItemCartRows():
        ItemCartRow[]
    {
        const search =
            this.activitySearchText
                .trim()
                .toLowerCase();
        if
        (
            search.length === 0
        )
        {
            return this.itemCartRows;
        }
        return this.itemCartRows.filter(
            row =>
            {
                const menu =
                    String(
                        row.menu ?? ''
                    )
                    .trim()
                    .toLowerCase();
                const subMenu =
                    String(
                        row.subMenu ?? ''
                    )
                    .trim()
                    .toLowerCase();
                return (
                    menu.includes(search)
                    ||
                    subMenu.includes(search)
                );
            }
        );
    }
    //===========================================================
    // Update Pagination
    //===========================================================
    updatePagination():
        void
    {
        const filteredRows =
            this.getFilteredItemCartRows();
        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    filteredRows.length
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
            filteredRows.slice(
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
        this.loadEffectiveAccess();
        this.loadRoleProfiles();
        this.loadModules();
        this.loadMasterActivities();
        this.updatePagination();
        this.updateRoleProfileLock();
    }
    //===========================================================
    // Load Role Profiles
    //===========================================================
    //
    // ADD MODE RULE:
    // A Role Profile that already has an Activity Assignment in
    // the database must NOT be available for a new assignment.
    //
    // EDIT / VIEW MODE RULE:
    // The complete Role Profile list remains available because
    // the existing assigned Role Profile must be displayed.
    //
    // The Activity Assignment list endpoint is used as the
    // database source of truth for already-configured profiles.
    //===========================================================
    private loadRoleProfiles():
        void
    {
        //=======================================================
        // EDIT / VIEW
        //=======================================================
        if
        (
            this.mode !== 'add'
        )
        {
            this.loadAllRoleProfiles();
            return;
        }
        //=======================================================
        // ADD
        //
        // First load all Role Profiles.
        // Then load existing Activity Assignments and remove
        // every Role Profile already configured in the database.
        //=======================================================
        this.roleProfileService
            .getAll()
            .subscribe(
            {
                next:
                    (
                        response:
                            any[]
                    ): void =>
                {
                    const allRoleProfiles =
                        [
                            ...response
                        ];
                    this.activityAssignmentService
                        .getAll()
                        .subscribe(
                        {
                            next:
                                (
                                    assignments:
                                        any[]
                                ): void =>
                            {
                                const assignedRoleProfileIds =
                                    new Set<number>
                                    (
                                        assignments
                                            .filter
                                            (
                                                assignment =>
                                                    assignment != null
                                                    &&
                                                    assignment.roleProfileId != null
                                            )
                                            .map
                                            (
                                                assignment =>
                                                    Number(
                                                        assignment.roleProfileId
                                                    )
                                            )
                                            .filter
                                            (
                                                id =>
                                                    id > 0
                                            )
                                    );
                                this.roleProfiles =
                                    allRoleProfiles.filter
                                    (
                                        roleProfile =>
                                        {
                                            const roleProfileId =
                                                Number(
                                                    roleProfile.id
                                                    ??
                                                    roleProfile.roleProfileId
                                                );
                                            return roleProfileId > 0
                                                &&
                                                !assignedRoleProfileIds.has(
                                                    roleProfileId
                                                );
                                        }
                                    );
                                this.cdr.detectChanges();
                            },
                            error:
                                (
                                    error:
                                        unknown
                                ): void =>
                            {
                                console.error
                                (
                                    'Load Activity Assignments For Role Profile Filter Error',
                                    error
                                );
                                // Do NOT expose already configured
                                // profiles if the assignment source
                                // could not be loaded.
                                this.roleProfiles =
                                [
                                ];
                                this.toast.error
                                (
                                    'Load Failed',
                                    'Unable to determine already configured role profiles.'
                                );
                                this.cdr.detectChanges();
                            }
                        }
                    );
                },
                error:
                    (
                        error:
                            unknown
                    ): void =>
                {
                    console.error
                    (
                        'Load Role Profiles Error',
                        error
                    );
                    this.roleProfiles =
                    [
                    ];
                    this.toast.error
                    (
                        'Load Failed',
                        'Unable to load role profiles.'
                    );
                    this.cdr.detectChanges();
                }
            });
    }
    //===========================================================
    // Load All Role Profiles
    //===========================================================
    private loadAllRoleProfiles():
        void
    {
        this.roleProfileService
            .getAll()
            .subscribe(
            {
                next:
                    (
                        response:
                            any[]
                    ): void =>
                {
                    this.roleProfiles =
                    [
                        ...response
                    ];
                    this.cdr.detectChanges();
                },
                error:
                    (
                        error:
                            unknown
                    ): void =>
                {
                    console.error
                    (
                        'Load Role Profiles Error',
                        error
                    );
                    this.roleProfiles =
                    [
                    ];
                    this.toast.error
                    (
                        'Load Failed',
                        'Unable to load role profiles.'
                    );
                    this.cdr.detectChanges();
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
                    this.allModules =
                    [
                        ...response
                    ];
                    this.refreshAvailableModules();
                    this.cdr.detectChanges();
                },
                error:(error) =>
                {
                    console.error(error);
                    // A secondary lookup must never leave the page
                    // Orbit Loader running.
                    this.orbitLoading =
                        false;
                    this.toast.error(
                        'Error',
                        'Failed to load modules.'
                    );
                    this.cdr.detectChanges();
                }
            });
    }
    //===========================================================
    // Refresh Available Modules
    //===========================================================
    private refreshAvailableModules():
        void
    {
        const infrastructureControlAllowed =
            this.selectedRoleProfileId ===
            this.reservedInfrastructureControlRoleProfileId;
        const availableModules =
            infrastructureControlAllowed
                ?
                this.allModules
                :
                this.allModules.filter(
                    module =>
                        String(
                            module?.name ??
                            ''
                        ).trim().toLowerCase() !==
                        this.infrastructureControlModuleName
                            .toLowerCase()
                );
        this.modules =
        [
            ...this.defaultModules,
            ...availableModules
        ];
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
                    this.resolveMasterActivityPermissionIds(
                        response
                    );
                    // If the edit/view cart was restored before the
                    // master-activity request completed, rebuild the
                    // rows once so the activities are present.
                    if
                    (
                        this.mode !== 'add'
                        &&
                        this.editCartInitialized
                    )
                    {
                        this.refreshItemCartRows();
                    }
                    this.cdr.detectChanges();
                },
                error:(error) =>
                {
                    console.error(error);
                    // Master activities are a secondary lookup.
                    // Never leave the page-level loader active here.
                    this.orbitLoading =
                        false;
                    this.toast.error(
                        'Error',
                        'Failed to load master activities.'
                    );
                    this.cdr.detectChanges();
                }
            });
    }
    //===========================================================
    // Load Effective Access
    //===========================================================
    private loadEffectiveAccess():
        void
    {
        const authenticatedUser =
            this.authenticationStorageService
                .getUser();
        const userProfileId =
            Number(
                authenticatedUser?.userProfileId
                ??
                0
            );
        if
        (
            userProfileId <= 0
        )
        {
            this.effectiveAccess =
            [
            ];
            this.updateActionPermissions();
            return;
        }
        this.effectiveAccessService
            .getEffectiveAccess(
                userProfileId
            )
            .subscribe
            ({
                next:(response) =>
                {
                    this.effectiveAccess =
                        response ??
                        [
                        ];
                    this.updateActionPermissions();
                    this.cdr.detectChanges();
                },
                error:(error) =>
                {
                    console.error(
                        'Load Effective Access Error',
                        error
                    );
                    this.effectiveAccess =
                    [
                    ];
                    this.updateActionPermissions();
                    this.cdr.detectChanges();
                }
            });
    }
    //===========================================================
    // Resolve Master Activity Permission Ids
    //===========================================================
    private resolveMasterActivityPermissionIds
    (
        activities:any[]
    ):
        void
    {
        this.masterActivityPermissionIds =
        {
            add:null,
            view:null,
            update:null,
            delete:null,
            restore:null
        };
        activities.forEach(
            activity =>
            {
                const activityName =
                    String(
                        activity?.name
                        ??
                        ''
                    )
                    .trim()
                    .toLowerCase();
                const activityId =
                    Number(
                        activity?.id
                    );
                if
                (
                    activityId <= 0
                )
                {
                    return;
                }
                if
                (
                    activityName === 'add'
                    ||
                    activityName === 'create'
                )
                {
                    this.masterActivityPermissionIds.add =
                        activityId;
                }
                if
                (
                    activityName === 'view'
                )
                {
                    this.masterActivityPermissionIds.view =
                        activityId;
                }
                if
                (
                    activityName === 'update'
                    ||
                    activityName === 'edit'
                )
                {
                    this.masterActivityPermissionIds.update =
                        activityId;
                }
                if
                (
                    activityName === 'delete'
                )
                {
                    this.masterActivityPermissionIds.delete =
                        activityId;
                }
                if
                (
                    activityName === 'restore'
                )
                {
                    this.masterActivityPermissionIds.restore =
                        activityId;
                }
            }
        );
        this.updateActionPermissions();
    }
    //===========================================================
    // Update Action Permissions
    //===========================================================
    private updateActionPermissions():
        void
    {
        this.canAdd =
            this.hasMasterActivityPermission(
                this.masterActivityPermissionIds.add
            );
        this.canView =
            this.hasMasterActivityPermission(
                this.masterActivityPermissionIds.view
            );
        this.canUpdate =
            this.hasMasterActivityPermission(
                this.masterActivityPermissionIds.update
            );
        this.canDelete =
            this.hasMasterActivityPermission(
                this.masterActivityPermissionIds.delete
            );
        this.canRestore =
            this.hasMasterActivityPermission(
                this.masterActivityPermissionIds.restore
            );
    }
    //===========================================================
    // Check Master Activity Permission
    //===========================================================
    private hasMasterActivityPermission
    (
        activityId:number | null
    ):
        boolean
    {
        if
        (
            activityId == null
            ||
            activityId <= 0
        )
        {
            return false;
        }
        return this.effectiveAccess.some(
            access =>
                access.masterActivityId ===
                activityId
        );
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
            this.resolveEntityId();
        if
        (
            id > 0
        )
        {
            this.activityAssignmentId =
                id;
            this.loadActivityAssignment();
        }
        else
        {
            this.loadDefaults();
        }
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
                    // Main assignment load is complete.
                    //
                    // Menus, sub menus and activity lookups are
                    // secondary UI data. They must never keep the
                    // page-level Orbit Loader running indefinitely.
                    //
                    // The item cart is populated independently as
                    // those secondary requests complete.
                    //===================================================
                    this.orbitLoading =
                        false;
                    this.loading =
                        false;
                    this.loadFailed =
                        false;
                    this.cdr.detectChanges();
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
        //=======================================================
        // Reset Edit Cart Initialization
        //
        // The first submenu load will restore the saved database
        // rows. Later selection changes must preserve the working
        // cart instead of rebuilding it.
        //=======================================================
        this.editCartInitialized =
            false;
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
                                null,
                            activityName:
                                permission.activityName
                        });
                    });
            });
        //=======================================================
        // Default Hierarchy
        //
        // Edit / View mode starts from the complete hierarchy.
        // Zero represents the explicit "All" selection.
        //=======================================================
        this.selectedModuleId =
            0;
        this.selectedMenuId =
            0;
        this.selectedSubMenuId =
            0;
        this.loadMenus(
            0
        );
        this.loadSubMenus(
            0
        );
        this.originalActivityAssignment =
            JSON.stringify(
                data
            );
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
        //=======================================================
        // Infrastructure Control Reservation
        //
        // Infrastructure Control is reserved exclusively for
        // RP-001. When another Role Profile is selected, the
        // module is removed from the available module list.
        //=======================================================
        this.refreshAvailableModules();
        if
        (
            this.selectedRoleProfileId !==
            this.reservedInfrastructureControlRoleProfileId
            &&
            this.isInfrastructureControlModule(
                this.selectedModuleId
            )
        )
        {
            this.selectedModuleId =
                0;
            this.selectedMenuId =
                0;
            this.selectedSubMenuId =
                0;
            this.menus =
            [
                ...this.defaultMenus
            ];
            this.subMenus =
            [
                ...this.defaultSubMenus
            ];
        }
        this.detectChanges();
        this.cdr.detectChanges();
    }
    //===========================================================
    // Infrastructure Control Module Check
    //===========================================================
    private isInfrastructureControlModule
    (
        moduleId:number | null
    ):
        boolean
    {
        if
        (
            moduleId == null
            ||
            moduleId === 0
        )
        {
            return false;
        }
        const module =
            this.allModules.find(
                item =>
                    Number(item?.id) ===
                    Number(moduleId)
            );
        return String(
            module?.name ??
            ''
        ).trim().toLowerCase() ===
        this.infrastructureControlModuleName
            .toLowerCase();
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
        if
        (
            this.isInfrastructureControlModule(value)
            &&
            this.selectedRoleProfileId !==
            this.reservedInfrastructureControlRoleProfileId
        )
        {
            this.toast.warning(
                'Restricted Module',
                'Infrastructure Control can only be assigned to RP-001.'
            );
            return;
        }
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
            this.loadSubMenus(
                0
            );
            this.isAddDisabled =
                false;
            return;
        }
        //=======================================================
        // Specific Module
        //=======================================================
        this.selectedMenuId =
            0;
        this.selectedSubMenuId =
            0;
        this.loadMenus(
            value
        );
        this.loadSubMenus(
            0
        );
        this.isAddDisabled =
            false;
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
                // Preserve Current Selection
                //
                // Do NOT reset Menu/Sub Menu here.
                // Module changes in Edit/View mode must keep the
                // explicit All / specific selection made by the user.
                //===================================================
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
            this.selectedSubMenuId =
                0;
            this.loadSubMenus(
                0
            );
            this.isAddDisabled =
                false;
            return;
        }
        //=======================================================
        // Specific Menu
        //=======================================================
        this.selectedSubMenuId =
            0;
        this.loadSubMenus(
            value
        );
        this.isAddDisabled =
            false;
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
                //===================================================
                // Filter All Sub Menus By Selected Module
                //===================================================
                let filteredResponse =
                    response;
                if
                (
                    menuId === 0
                    &&
                    this.selectedModuleId != null
                    &&
                    this.selectedModuleId !== 0
                )
                {
                    filteredResponse =
                        response.filter(
                            subMenu =>
                                subMenu.navigationModuleId ===
                                this.selectedModuleId
                        );
                }
                this.subMenus =
                [
                    ...this.defaultSubMenus,
                    ...filteredResponse
                ];
                //===================================================
                // Restore Item Cart During Edit/View — ONCE ONLY
                //
                // IMPORTANT:
                // Previously this ran on EVERY Module/Menu/Sub Menu
                // change in Edit mode. That rebuilt itemCartRows from
                // the original database data and therefore removed
                // rows that had just been added during the same edit
                // session.
                //
                // Now the saved rows are restored only on the first
                // submenu load. All later selections work against
                // the existing itemCartRows and therefore APPEND.
                //===================================================
                if
                (
                    this.mode !== 'add'
                    &&
                    !this.editCartInitialized
                )
                {
                    this.editCartInitialized =
                        true;
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
                // Sub menus are secondary data. A failed secondary
                // lookup must not leave the page in a permanent
                // loading state.
                this.orbitLoading =
                    false;
                this.toast.error(
                    'Error',
                    'Failed to load sub menus.'
                );
                this.cdr.detectChanges();
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
            // The assignment itself has already finished loading.
            // Do not restart the page-level Orbit Loader while the
            // cart is being rebuilt.
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
                                )
                        };
                        return row;
                    }
                );
            this.updatePagination();
                this.orbitLoading =
                false;
            this.loading =
                false;
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
            this.orbitLoading =
                false;
            this.loading =
                false;
            this.cdr.detectChanges();
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
                                )
                        };
                        return row;
                    }
                );
        this.updatePagination();
        // Final safety net: rebuilding the cart must never leave
        // View/Edit mode behind an active page-level loader.
        this.orbitLoading =
            false;
        this.loading =
            false;
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
        const details =
            this.activityAssignment?.details
            ??
            [];
        const detail =
            details.find
            (
                x =>
                    x.subMenuId ===
                    subMenuId
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
                    row.masterActivities
                        .filter(
                            permission =>
                                permission.checked
                        )
                        .map(
                            permission =>
                            ({
                                activityAssignmentPermissionId:0,
                                masterActivityId:
                                    permission.id,
                                navigationActivityId:
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
                this.getMasterActivityCount(),
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
    // Total Activity Count
    //===========================================================
    private getTotalActivityCount():
        number
    {
        return (
            this.getMasterActivityCount()
            +
            this.getMasterActivityCount()
        );
    }
    //===========================================================
    // Save
    //===========================================================
    save():
        void
    {
        if
        (
            this.mode === 'add'
            &&
            !this.canAdd
        )
        {
            return;
        }
        if
        (
            this.mode === 'edit'
            &&
            !this.canUpdate
        )
        {
            return;
        }
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
                                    this.hasChanges =
                                        false;
                                    void this.router.navigate(
                                    [
                                        '/security-permission/role-management/activity-assignment/list'
                                    ]);
                                },
                                400
                            );
                        },
                        error:(error) =>
                        {
                            this.progressDialog.close();
                            console.error(
                                'Activity Assignment Create Error:',
                                error
                            );
                            this.toast.error(
                                'Error',
                                error?.error?.message
                                ||
                                error?.message
                                ||
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
                                    this.hasChanges =
                                        false;
                                    void this.router.navigate(
                                    [
                                        '/security-permission/role-management/activity-assignment/list'
                                    ]);
                                },
                                400
                            );
                        },
                        error:(error) =>
                        {
                            this.progressDialog.close();
                            console.error(
                                'Activity Assignment Update Error:',
                                error
                            );
                            this.toast.error(
                                'Error',
                                error?.error?.message
                                ||
                                error?.message
                                ||
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
        if
        (
            !this.canDelete
        )
        {
            return;
        }
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
                                '/security-permission/role-management/activity-assignment/list'
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
        if
        (
            !this.canRestore
        )
        {
            return;
        }
        this.confirmDialog.open(
            'Restore Activity Assignment',
            'Are you sure you want to restore this activity assignment?',
            () =>
            {
                this.activityAssignmentService
                    .restore()
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
            '/security-permission/role-management/activity-assignment/list'
        ]);
    }
    //===========================================================
    // Clear
    //===========================================================
    clear():
        void
    {
        this.activitySearchText =
            '';
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
        this.updateRoleProfileLock();
        this.updatePagination();
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
                        )
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
        if
        (
            this.isInfrastructureControlModule(
                this.selectedModuleId
            )
            &&
            this.selectedRoleProfileId !==
            this.reservedInfrastructureControlRoleProfileId
        )
        {
            this.toast.warning(
                'Restricted Module',
                'Infrastructure Control can only be assigned to RP-001.'
            );
            return;
        }
        const selectedSubMenus =
            this.buildSelectedRows();
        let duplicateFound =
            false;
        let addedCount =
            0;
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
                    exists
                )
                {
                    duplicateFound =
                        true;
                    return;
                }
                this.itemCartRows.push(
                    row
                );
                addedCount++;
            }
        );
        //=======================================================
        // Duplicate Validation Toast
        //=======================================================
        if
        (
            duplicateFound
        )
        {
            this.toast.warning(
                'Already Added',
                'One or more selected sub menus are already added in the cart.'
            );
        }
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
                        )
                })
            );
        this.updateRoleProfileLock();
        this.updatePagination();
        this.updateHeaderCheckboxStates();
        this.detectChanges();
        this.cdr.detectChanges();
    }
    //===========================================================
    // Save Command
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
        if
        (
            this.mode === 'add'
            &&
            !this.canAdd
        )
        {
            return;
        }
        if
        (
            this.mode === 'edit'
            &&
            !this.canUpdate
        )
        {
            return;
        }
        if
        (
            this.selectedRoleProfileId == null
        )
        {
            this.toast.error(
                'Validation',
                'Role Profile is required.'
            );
            return;
        }
        //=======================================================
        // Infrastructure Control Reservation
        //=======================================================
        const containsInfrastructureControl =
            this.itemCartRows.some(
                row =>
                    this.isInfrastructureControlModule(
                        row.moduleId
                    )
            );
        if
        (
            containsInfrastructureControl
            &&
            this.selectedRoleProfileId !==
            this.reservedInfrastructureControlRoleProfileId
        )
        {
            this.toast.error(
                'Validation',
                'Infrastructure Control can only be assigned to RP-001.'
            );
            return;
        }
        //=======================================================
        // ADD MODE
        //
        // A new Activity Assignment must contain at least one
        // submenu assignment.
        //=======================================================
        if
        (
            this.mode === 'add'
            &&
            this.itemCartRows.length === 0
        )
        {
            this.toast.error(
                'Validation',
                'At least one submenu assignment is required.'
            );
            return;
        }
        //=======================================================
        // EDIT MODE
        //
        // Zero rows are valid.
        //
        // When all submenu rows are removed during Edit mode,
        // the empty payload is intentionally sent to the backend.
        // The backend permanently deletes the assignment and its details.
        //=======================================================
        this.save();
    }
    //===========================================================
    // Clear Command
    //===========================================================
    onClear():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }
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
            '/security-permission/role-management/activity-assignment/list'
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
            '/security-permission/role-management/activity-assignment/list'
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
            (
                this.mode === 'add'
                &&
                !this.canAdd
            )
            ||
            (
                this.mode === 'edit'
                &&
                !this.canUpdate
            )
            ||
            this.selectedRoleProfileId == null
            ||
            (
                this.mode === 'add'
                &&
                this.itemCartRows.length === 0
            )
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
                    ...row.masterActivities
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
                label:'Activity',
                value:this.getMasterActivityCount()
            }
        ];
    }
}
