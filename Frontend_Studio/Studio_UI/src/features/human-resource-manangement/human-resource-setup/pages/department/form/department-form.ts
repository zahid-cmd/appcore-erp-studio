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
    PageCanvasComponent
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    FormGridComponent
}
from '../../../../../../shared/components/layout/form-grid/form-grid';

import
{
    FormSectionComponent
}
from '../../../../../../shared/components/layout/form-section/form-section';


//===============================================================
// Form Controls
//===============================================================

import
{
    TextboxComponent
}
from '../../../../../../shared/components/controls/textbox/textbox';

import
{
    TextareaComponent
}
from '../../../../../../shared/components/controls/textarea/textarea';

import
{
    DropdownComponent
}
from '../../../../../../shared/components/controls/dropdown/dropdown';


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


//===============================================================
// Models & Services
//===============================================================

import
{
    Department,
    CreateDepartment,
    UpdateDepartment,
    DepartmentDefaults
}
from '../../../models/department.model';

import
{
    DepartmentService
}
from '../../../services/department.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'department-form',

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
        FormGridComponent,
        FormSectionComponent,

        //=======================================================
        // Form Controls
        //=======================================================

        TextboxComponent,
        TextareaComponent,
        DropdownComponent,

        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,
        ConfirmDialogComponent
    ],

    templateUrl:'./department-form.html',

    styleUrls:
    [
        './department-form.css'
    ]
})


export class DepartmentForm
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly departmentservice =
        inject(DepartmentService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);


    //===========================================================
    // Mode
    //===========================================================

    mode:
        'add' | 'edit' | 'view' =
        'add';

    entityId:
        number =
        0;


    //===========================================================
    // Page Header
    //===========================================================

    pageTitle:
        string =
        'Department';

    entityName:
        string =
        'Department';


    //===========================================================
    // Selected Tab
    //===========================================================

    selectedTab:
        string =
        'general';


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
    // Status Items
    //===========================================================

    statusItems:
        any[]
    =
    [
        {
            label:'Active',
            value:true
        },

        {
            label:'Inactive',
            value:false
        }
    ];


    //===========================================================
    // Entity
    //===========================================================

    entity:
        Department
    =
    {
        DepartmentId:0,

        DepartmentCode:'',

        DepartmentName:'',

        DepartmentShortName:'',

        Remarks:'',

        IsActive:true
    };


    //===========================================================
    // Form State
    //===========================================================

    private originalEntity:
        string =
        '';

    hasChanges:
        boolean =
        false;


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
        // Resolve Entity Id
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
            this.entityId =
                id;

            this.loadEntity();

            return;
        }


        //=======================================================
        // New Entity
        //=======================================================

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
                    currentRoute.snapshot.paramMap.get('id')
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
            DepartmentId:0,

            DepartmentCode:'',

            DepartmentName:'',

            DepartmentShortName:'',

            Remarks:'',

            IsActive:true
        };

        this.generateDefaults();
    }


    //===========================================================
    // Generate Defaults
    //===========================================================

    private generateDefaults():
        void
    {
        //=======================================================
        // Existing Record
        //=======================================================

        if
        (
            this.entityId > 0
        )
        {
            return;
        }


        //=======================================================
        // Get Defaults
        //=======================================================

        this.departmentservice
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        DepartmentDefaults
                ): void =>
                {
                    this.entity.DepartmentCode =
                        response.Code;

                    this.entity.IsActive =
                        true;

                    this.setInitialFormState();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Generate Department Defaults Error',
                        error
                    );


                    //===================================================
                    // Fallback Code
                    //===================================================

                    this.departmentservice
                        .getNextCode()
                        .subscribe
                        ({
                            next:
                            (
                                code:
                                    string
                            ): void =>
                            {
                                this.entity.DepartmentCode =
                                    code;

                                this.entity.IsActive =
                                    true;

                                this.setInitialFormState();
                            },

                            error:
                            (
                                codeError:
                                    unknown
                            ): void =>
                            {
                                console.error(
                                    'Generate Department Code Error',
                                    codeError
                                );


                                //===========================================
                                // Final Fallback Code
                                //===========================================

                                this.entity.DepartmentCode =
                                    'DPT-001';

                                this.entity.IsActive =
                                    true;

                                this.setInitialFormState();
                            }
                        });
                }
            });
    }


    //===========================================================
    // Set Initial Form State
    //===========================================================

    private setInitialFormState():
        void
    {
        this.originalEntity =
            JSON.stringify(
                this.entity
            );

        this.hasChanges =
            false;

        this.cdr.detectChanges();
    }


    //===========================================================
    // Load Entity
    //===========================================================

    private loadEntity():
        void
    {
        this.departmentservice
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        any
                ): void =>
                {
                    this.entity =
                    {
                        DepartmentId:
                            Number(
                                response?.DepartmentId
                                ??
                                response?.departmentId
                                ??
                                0
                            ),

                        DepartmentCode:
                            response?.DepartmentCode
                            ??
                            response?.departmentCode
                            ??
                            '',

                        DepartmentName:
                            response?.DepartmentName
                            ??
                            response?.departmentName
                            ??
                            '',

                        DepartmentShortName:
                            response?.DepartmentShortName
                            ??
                            response?.departmentShortName
                            ??
                            '',

                        Remarks:
                            response?.Remarks
                            ??
                            response?.remarks
                            ??
                            '',

                        IsActive:
                            Boolean(
                                response?.IsActive
                                ??
                                response?.isActive
                                ??
                                true
                            )
                    };

                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );

                    this.hasChanges =
                        false;

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Department Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load Department.'
                    );

                    this.onBackToList();
                }
            });
    }


    //===========================================================
    // Track Changes
    //===========================================================

    checkForChanges():
        void
    {
        this.hasChanges =
            JSON.stringify(
                this.entity
            )
            !==
            this.originalEntity;
    }


    //===========================================================
    // Tab Change
    //===========================================================

    onTabChange
    (
        tabId:
            string
    ):
        void
    {
        this.selectedTab =
            tabId;
    }


    //===========================================================
    // Save
    //===========================================================

    onSave():
        void
    {
        //=======================================================
        // View Mode
        //=======================================================

        if
        (
            this.isViewMode
        )
        {
            return;
        }


        //=======================================================
        // Validation
        //=======================================================

        if
        (
            !this.entity.DepartmentCode?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Department Code is required.'
            );

            return;
        }


        if
        (
            !this.entity.DepartmentName?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Department Name is required.'
            );

            return;
        }


        //=======================================================
        // Add
        //=======================================================

        if
        (
            this.mode === 'add'
        )
        {
            this.saveCreate();

            return;
        }


        //=======================================================
        // Update
        //=======================================================

        this.saveUpdate();
    }


    //===========================================================
    // Create
    //===========================================================

    private saveCreate():
        void
    {
        const model:
            CreateDepartment =
        {
            DepartmentCode:
                this.entity.DepartmentCode.trim(),

            DepartmentName:
                this.entity.DepartmentName.trim(),

            DepartmentShortName:
                this.entity.DepartmentShortName?.trim()
                ??
                '',

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };


        this.departmentservice
            .create(
                model
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );

                    this.hasChanges =
                        false;

                    this.toast.success(
                        'Success',
                        'Department created successfully.'
                    );

                    this.onBackToList();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Create Department Error',
                        error
                    );

                    const message =
                        (error as any)?.error
                        ??
                        'Failed to create Department.';

                    this.toast.error(
                        'Validation',
                        message
                    );
                }
            });
    }


    //===========================================================
    // Update
    //===========================================================

    private saveUpdate():
        void
    {
        const model:
            UpdateDepartment =
        {
            DepartmentId:
                this.entity.DepartmentId,

            DepartmentCode:
                this.entity.DepartmentCode.trim(),

            DepartmentName:
                this.entity.DepartmentName.trim(),

            DepartmentShortName:
                this.entity.DepartmentShortName?.trim()
                ??
                '',

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };


        this.departmentservice
            .update(
                model
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );

                    this.hasChanges =
                        false;

                    this.toast.success(
                        'Success',
                        'Department updated successfully.'
                    );

                    this.onBackToList();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Update Department Error',
                        error
                    );

                    const message =
                        (error as any)?.error
                        ??
                        'Failed to update Department.';

                    this.toast.error(
                        'Validation',
                        message
                    );
                }
            });
    }


    //===========================================================
    // Clear
    //===========================================================

    onClear():
        void
    {
        //=======================================================
        // Edit Mode
        //=======================================================

        if
        (
            this.mode === 'edit'
        )
        {
            this.loadEntity();

            return;
        }


        //=======================================================
        // Add Mode
        //=======================================================

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
            void this.router.navigate
            (
                [
                    '/human-resource-manangement',
                    'human-resource-setup',
                    'department',
                    'list'
                ]
            );

            return;
        }


        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',

            () =>
            {
                void this.router.navigate
                (
                    [
                        '/human-resource-manangement',
                        'human-resource-setup',
                        'department',
                        'list'
                    ]
                );
            },

            'Leave',
            'Stay',
            'primary'
        );
    }


    //===========================================================
    // Save Button Text
    //===========================================================

    get saveButtonText():
        string
    {
        return this.mode === 'edit'
            ? 'Update'
            : 'Save';
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
            this.loadEntity();

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

}