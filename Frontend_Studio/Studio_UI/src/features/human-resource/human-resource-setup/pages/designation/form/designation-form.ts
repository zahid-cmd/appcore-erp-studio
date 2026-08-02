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
    Designation,
    DesignationDefaults,
    CreateDesignation,
    UpdateDesignation
}
from '../../../models/designation.model';

import
{
    DesignationService
}
from '../../../services/designation.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-designation-form',

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

    templateUrl:'./designation-form.html',

    styleUrls:
    [
        './designation-form.css'
    ]
})

export class DesignationFormComponent
implements OnInit
{
    //===========================================================
    // Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly designationService =
        inject(DesignationService);

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

    designationId =
        0;

    //===========================================================
    // Page Header
    //===========================================================

    pageTitle =
        'Designation';

    //===========================================================
    // Entity
    //===========================================================

    entityName =
        'Designation';

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

    designation: Designation =
    {
        id:0,

        code:'',

        name:'',

        remarks:'',

        isActive:true
    };

    //===========================================================
    // Form State
    //===========================================================

    private originalDesignation =
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
            JSON.stringify(this.designation)
            !==
            this.originalDesignation;
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
            this.designationId =
                id;

            this.cdr.detectChanges();

            this.loadDesignation();

            return;
        }

        this.designation =
        {
            id:0,

            code:'',

            name:'',

            remarks:'',

            isActive:true
        };

        this.cdr.detectChanges();

        this.loadDefaults();
    }
    //===========================================================
    // Load Designation
    //===========================================================

    private loadDesignation():
        void
    {
        this.designationService
            .getById(this.designationId)
            .subscribe(
            {
                next:(response) =>
                {
                    this.designation =
                        response;

                    this.originalDesignation =
                        JSON.stringify(this.designation);

                    this.hasChanges =
                        false;

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(error);

                    this.toast.error(
                        'Error',
                        'Failed to load designation.'
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
        this.designationService
            .getDefaults()
            .subscribe(
            {
                next:(defaults:DesignationDefaults) =>
                {
                    this.designation.code =
                        defaults.code;

                    this.designation.isActive =
                        defaults.isActive;

                    this.originalDesignation =
                        JSON.stringify(this.designation);

                    this.hasChanges =
                        false;

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(
                        'Failed to load designation defaults.',
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
        this.designation.isActive =
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
        if(!this.designation.name.trim())
        {
            this.toast.warning(
                'Validation',
                'Designation name is required.'
            );

            return;
        }

        if(this.mode === 'add')
        {
            const model:CreateDesignation =
            {
                name:this.designation.name,

                remarks:this.designation.remarks,

                isActive:this.designation.isActive
            };

            this.designationService
                .create(model)
                .subscribe(
                {
                    next:() =>
                    {
                        this.originalDesignation =
                            JSON.stringify(this.designation);

                        this.hasChanges =
                            false;

                        this.toast.success(
                            'Success',
                            'Designation created successfully.'
                        );

                        this.onBackToList();
                    },

                    error:(error) =>
                    {
                        console.error(error);

                        const message =
                            error?.error
                            ??
                            'Failed to create designation.';

                        this.toast.error(
                            'Validation',
                            message
                        );
                    }
                });

            return;
        }

        const model:UpdateDesignation =
        {
            id:this.designation.id,

            name:this.designation.name,

            remarks:this.designation.remarks,

            isActive:this.designation.isActive
        };

        this.designationService
            .update(model)
            .subscribe(
            {
                next:() =>
                {
                    this.originalDesignation =
                        JSON.stringify(this.designation);

                    this.hasChanges =
                        false;

                    this.toast.success(
                        'Success',
                        'Designation updated successfully.'
                    );

                    this.onBackToList();
                },

                error:(error) =>
                {
                    console.error(error);

                    const message =
                        error?.error
                        ??
                        'Failed to update designation.';

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

            this.designation.name =
                '';

            this.designation.remarks =
                '';

            this.designation.isActive =
                true;

            this.checkForChanges();

            return;
        }

        //=======================================================
        // Add Mode
        //=======================================================

        this.designation =
        {
            id:0,

            code:'',

            name:'',

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
                '/human-resource/human-resource-setup/designation'
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
                    '/human-resource/human-resource-setup/designation'
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