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
    Designation,
    CreateDesignation,
    UpdateDesignation,
    DesignationDefaults
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
    selector:'designation-form',

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

    templateUrl:'./designation-form.html',

    styleUrls:
    [
        './designation-form.css'
    ]
})


export class DesignationForm
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly designationservice =
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
        'Designation';

    entityName:
        string =
        'Designation';


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
        Designation
    =
    {
        DesignationId:0,

        DesignationCode:'',

        DesignationName:'',

        DesignationShortName:'',

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
            DesignationId:0,

            DesignationCode:'',

            DesignationName:'',

            DesignationShortName:'',

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

        this.designationservice
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        DesignationDefaults
                ): void =>
                {
                    this.entity.DesignationCode =
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
                        'Generate Designation Defaults Error',
                        error
                    );


                    //===================================================
                    // Fallback Code
                    //===================================================

                    this.designationservice
                        .getNextCode()
                        .subscribe
                        ({
                            next:
                            (
                                code:
                                    string
                            ): void =>
                            {
                                this.entity.DesignationCode =
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
                                    'Generate Designation Code Error',
                                    codeError
                                );


                                //===========================================
                                // Final Fallback Code
                                //===========================================

                                this.entity.DesignationCode =
                                    'DSG-001';

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
        this.designationservice
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
                        DesignationId:
                            Number(
                                response?.DesignationId
                                ??
                                response?.designationId
                                ??
                                0
                            ),

                        DesignationCode:
                            response?.DesignationCode
                            ??
                            response?.designationCode
                            ??
                            '',

                        DesignationName:
                            response?.DesignationName
                            ??
                            response?.designationName
                            ??
                            '',

                        DesignationShortName:
                            response?.DesignationShortName
                            ??
                            response?.designationShortName
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
                        'Load Designation Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load Designation.'
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
            !this.entity.DesignationCode?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Designation Code is required.'
            );

            return;
        }


        if
        (
            !this.entity.DesignationName?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Designation Name is required.'
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
            CreateDesignation =
        {
            DesignationCode:
                this.entity.DesignationCode.trim(),

            DesignationName:
                this.entity.DesignationName.trim(),

            DesignationShortName:
                this.entity.DesignationShortName?.trim()
                ??
                '',

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };


        this.designationservice
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
                        'Designation created successfully.'
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
                        'Create Designation Error',
                        error
                    );

                    const message =
                        (error as any)?.error
                        ??
                        'Failed to create Designation.';

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
            UpdateDesignation =
        {
            DesignationId:
                this.entity.DesignationId,

            DesignationCode:
                this.entity.DesignationCode.trim(),

            DesignationName:
                this.entity.DesignationName.trim(),

            DesignationShortName:
                this.entity.DesignationShortName?.trim()
                ??
                '',

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };


        this.designationservice
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
                        'Designation updated successfully.'
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
                        'Update Designation Error',
                        error
                    );

                    const message =
                        (error as any)?.error
                        ??
                        'Failed to update Designation.';

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
                    'designation',
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
                        'designation',
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