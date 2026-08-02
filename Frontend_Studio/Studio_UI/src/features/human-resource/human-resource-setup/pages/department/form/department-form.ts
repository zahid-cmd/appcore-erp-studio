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
    ControlTabsComponent
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
    DepartmentDefaults,
    CreateDepartment,
    UpdateDepartment
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
    selector:'app-department-form',

    standalone:true,

    imports:
    [
        CommonModule,
        FormsModule,

        PageHeaderComponent,
        PageToolbarComponent,
        CommandCenterComponent,
        ControlTabsComponent,
        PageCanvasComponent,
        FormGridComponent,
        FormSectionComponent,

        TextboxComponent,
        TextareaComponent,
        DropdownComponent,

        ToastComponent,
        ConfirmDialogComponent
    ],

    templateUrl:'./department-form.html',

    styleUrls:
    [
        './department-form.css'
    ]
})

export class DepartmentFormComponent
implements OnInit
{
    //===========================================================
    // Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly departmentService =
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
        'add' | 'edit' | 'view' = 'add';

    departmentId =
        0;

    //===========================================================
    // Page Header
    //===========================================================

    pageTitle =
        'Department';

    //===========================================================
    // Entity
    //===========================================================

    entityName =
        'Department';

    //===========================================================
    // Selected Tab
    //===========================================================

    selectedTab =
        'general';

    //===========================================================
    // Tab Title
    //===========================================================

    get tabTitle(): string
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

    get tabs()
    {
        return [
            {
                id:'general',
                label:this.tabTitle
            }
        ];
    }

    //===========================================================
    // Status Dropdown
    //===========================================================

    statuses =
    [
        {
            value:true,
            text:'Active'
        },
        {
            value:false,
            text:'Inactive'
        }
    ];

    //===========================================================
    // Model
    //===========================================================

    department: Department =
    {
        id:0,

        code:'',

        name:'',

        shortName:'',

        departmentHead:'',

        email:'',

        phone:'',

        companyId:0,

        companyName:'',

        remarks:'',

        isActive:true
    };

    //===========================================================
    // Form State
    //===========================================================

    private originalDepartment =
        '';

    hasChanges =
        false;

    //===========================================================
    // Track Form Changes
    //===========================================================

    checkForChanges():
        void
    {
        this.hasChanges =
            JSON.stringify(this.department)
            !==
            this.originalDepartment;
    }

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
        const id =
            Number(
                this.route.snapshot.paramMap.get('id')
            );

        const url =
            this.router.url.toLowerCase();

        if(url.includes('/view/'))
        {
            this.mode =
                'view';
        }
        else if(url.includes('/edit/'))
        {
            this.mode =
                'edit';
        }
        else
        {
            this.mode =
                'add';
        }

        if(id > 0)
        {
            this.departmentId =
                id;

            this.cdr.detectChanges();

            this.loadDepartment();

            return;
        }

        this.department =
        {
            id:0,

            code:'',

            name:'',

            shortName:'',

            departmentHead:'',

            email:'',

            phone:'',

            companyId:0,

            companyName:'',

            remarks:'',

            isActive:true
        };

        this.cdr.detectChanges();

        this.loadDefaults();
    }
    //===========================================================
    // Load Department
    //===========================================================

    private loadDepartment():
        void
    {
        this.departmentService
            .getById(this.departmentId)
            .subscribe(
            {
                next:(response) =>
                {
                    this.department =
                        response;

                    this.originalDepartment =
                        JSON.stringify(this.department);

                    this.hasChanges =
                        false;

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(error);

                    this.toast.error(
                        'Error',
                        'Failed to load department.'
                    );

                    this.onBackToList();
                }
            });
    }

    //===========================================================
    // Load Defaults
    //===========================================================

    private loadDefaults():
        void
    {
        this.departmentService
            .getDefaults()
            .subscribe(
            {
                next:(defaults:DepartmentDefaults) =>
                {
                    this.department.code =
                        defaults.code;

                    this.department.companyId =
                        defaults.companyId;

                    this.department.isActive =
                        defaults.isActive;

                    this.originalDepartment =
                        JSON.stringify(this.department);

                    this.hasChanges =
                        false;

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(
                        'Failed to load department defaults.',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Unable to load default values.'
                    );
                }
            });
    }

    //===========================================================
    // Status Changed
    //===========================================================

    onStatusChange
    (
        value:boolean
    ):
        void
    {
        this.department.isActive =
            value;

        this.checkForChanges();
    }

    //===========================================================
    // Active Tab Changed
    //===========================================================

    onTabChange
    (
        tabId:string
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
        if(!this.department.name.trim())
        {
            this.toast.warning(
                'Validation',
                'Department name is required.'
            );

            return;
        }

        if(this.mode === 'add')
        {
            const model:CreateDepartment =
            {
                name:this.department.name,

                shortName:this.department.shortName,

                departmentHead:this.department.departmentHead,

                email:this.department.email,

                phone:this.department.phone,

                companyId:this.department.companyId,

                remarks:this.department.remarks,

                isActive:this.department.isActive
            };

            this.departmentService
                .create(model)
                .subscribe(
                {
                    next:() =>
                    {
                        this.originalDepartment =
                            JSON.stringify(this.department);

                        this.hasChanges =
                            false;

                        this.toast.success(
                            'Success',
                            'Department created successfully.'
                        );

                        this.onBackToList();
                    },

                    error:(error) =>
                    {
                        console.error(error);

                        const message =
                            error?.error
                            ??
                            'Failed to create department.';

                        this.toast.error(
                            'Validation',
                            message
                        );
                    }
                });

            return;
        }

        const model:UpdateDepartment =
        {
            id:this.department.id,

            name:this.department.name,

            shortName:this.department.shortName,

            departmentHead:this.department.departmentHead,

            email:this.department.email,

            phone:this.department.phone,

            companyId:this.department.companyId,

            remarks:this.department.remarks,

            isActive:this.department.isActive
        };

        this.departmentService
            .update(model)
            .subscribe(
            {
                next:() =>
                {
                    this.originalDepartment =
                        JSON.stringify(this.department);

                    this.hasChanges =
                        false;

                    this.toast.success(
                        'Success',
                        'Department updated successfully.'
                    );

                    this.onBackToList();
                },

                error:(error) =>
                {
                    console.error(error);

                    const message =
                        error?.error
                        ??
                        'Failed to update department.';

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
        // View Mode
        //=======================================================

        if(this.mode === 'view')
        {
            return;
        }

        //=======================================================
        // Edit Mode
        //=======================================================

        if(this.mode === 'edit')
        {
            // Keep:
            // - Code
            // - Company

            this.department.name =
                '';

            this.department.shortName =
                '';

            this.department.departmentHead =
                '';

            this.department.email =
                '';

            this.department.phone =
                '';

            this.department.remarks =
                '';

            this.department.isActive =
                true;

            this.checkForChanges();

            return;
        }

        //=======================================================
        // Add Mode
        //=======================================================

        this.department =
        {
            id:0,

            code:'',

            name:'',

            shortName:'',

            departmentHead:'',

            email:'',

            phone:'',

            companyId:0,

            companyName:'',

            remarks:'',

            isActive:true
        };

        this.hasChanges =
            false;

        this.loadDefaults();
    }

    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        if(!this.hasChanges)
        {
            this.router.navigate(
            [
                '/human-resource/human-resource-setup/department'
            ]);

            return;
        }

        this.confirmDialog.open(

            'Cancel Changes',

            'Any unsaved changes will be lost. Do you want to leave this page?',

            () =>
            {
                this.router.navigate(
                [
                    '/human-resource/human-resource-setup/department'
                ]);
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
        switch(this.mode)
        {
            case 'add':
                return 'Save';

            case 'edit':
                return 'Update';

            case 'view':
                return 'View';

            default:
                return 'Save';
        }
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
}
