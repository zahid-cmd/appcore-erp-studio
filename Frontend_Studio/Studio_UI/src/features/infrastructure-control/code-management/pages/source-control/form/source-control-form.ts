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
    SourceControl,
    CreateSourceControl,
    UpdateSourceControl
}
from '../../../models/source-control.model';

import
{
    SourceControlService
}
from '../../../services/source-control.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'sourceControl-form',

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


    templateUrl:'./source-control-form.html',


    styleUrls:
    [
        './source-control-form.css'
    ]
})


export class SourceControlForm
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly sourcecontrolservice =
        inject(SourceControlService);


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
        'Source Control';


    entityName:
        string =
        'Source Control';



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
    // Default Branch Items
    //===========================================================

    branchItems:
        any[]
    =
        [
            {
                text:'main',

                value:'main'
            },

            {
                text:'master',

                value:'master'
            }
        ];



    //===========================================================
    // Status Items
    //===========================================================

    statusItems:
        any[]
    =
        [
            {
                text:'Active',

                value:true
            },

            {
                text:'Inactive',

                value:false
            }
        ];



    //===========================================================
    // Entity
    //===========================================================

    entity:
        SourceControl
    =
    {
        sourceControlId:0,

        repositoryCode:'',

        repositoryName:'',

        gitRemoteUrl:'',

        defaultBranch:'main',

        repositoryPath:'',

        remarks:null,

        isActive:true,

        isDeleted:false,

        deletedBy:null,

        deletedDate:null,

        createdBy:0,

        createdDate:'',

        modifiedBy:null,

        modifiedDate:null
    };



    //===========================================================
    // Remarks
    //===========================================================

    remarks:
        string =
        '';



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
            sourceControlId:0,

            repositoryCode:'',

            repositoryName:'',

            gitRemoteUrl:'',

            defaultBranch:'main',

            repositoryPath:'',

            remarks:null,

            isActive:true,

            isDeleted:false,

            deletedBy:null,

            deletedDate:null,

            createdBy:0,

            createdDate:'',

            modifiedBy:null,

            modifiedDate:null
        };


        this.remarks =
            '';


        //=======================================================
        // Generate Next Repository Code
        //=======================================================

        this.sourcecontrolservice
            .getAll()
            .subscribe(
            {
                next:(entities) =>
                {
                    this.entity.repositoryCode =
                        this.generateNextCode(
                            entities
                        );


                    this.entity.isActive =
                        true;


                    this.entity.defaultBranch =
                        'main';


                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );


                    this.hasChanges =
                        false;


                    this.cdr.detectChanges();
                },


                error:(error) =>
                {
                    console.error(
                        'Generate Source Control Code Error',

                        error
                    );


                    this.entity.repositoryCode =
                        'SC-001';


                    this.entity.isActive =
                        true;


                    this.entity.defaultBranch =
                        'main';


                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );


                    this.hasChanges =
                        false;


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Generate Next Code
    //===========================================================

    private generateNextCode
    (
        entities:
            SourceControl[]
    ):
        string
    {
        let highestNumber =
            0;


        for
        (
            const entity of entities
        )
        {
            const match =
                /^SC-?(\d+)$/.exec(
                    entity.repositoryCode
                );


            if
            (
                match
            )
            {
                const number =
                    Number(
                        match[1]
                    );


                if
                (
                    number > highestNumber
                )
                {
                    highestNumber =
                        number;
                }
            }
        }


        return `SC-${String(
            highestNumber + 1
        ).padStart(
            3,
            '0'
        )}`;
    }



    //===========================================================
    // Load Entity
    //===========================================================

    private loadEntity():
        void
    {
        this.sourcecontrolservice
            .getById(
                this.entityId
            )
            .subscribe(
            {
                next:(response) =>
                {
                    this.entity =
                    {
                        sourceControlId:
                            response.sourceControlId,

                        repositoryCode:
                            response.repositoryCode,

                        repositoryName:
                            response.repositoryName,

                        gitRemoteUrl:
                            response.gitRemoteUrl,

                        defaultBranch:
                            response.defaultBranch,

                        repositoryPath:
                            response.repositoryPath,

                        remarks:
                            response.remarks,

                        isActive:
                            response.isActive,

                        isDeleted:
                            response.isDeleted,

                        deletedBy:
                            response.deletedBy,

                        deletedDate:
                            response.deletedDate,

                        createdBy:
                            response.createdBy,

                        createdDate:
                            response.createdDate,

                        modifiedBy:
                            response.modifiedBy,

                        modifiedDate:
                            response.modifiedDate
                    };


                    this.remarks =
                        response.remarks
                        ??
                        '';


                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );


                    this.hasChanges =
                        false;


                    this.cdr.detectChanges();
                },


                error:(error) =>
                {
                    console.error(
                        'Load Source Control Error',

                        error
                    );


                    this.toast.error(
                        'Error',

                        'Failed to load Source Control.'
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
        this.entity.remarks =
            this.remarks
            ||
            null;


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
        // Ensure Repository Code
        //=======================================================

        if
        (
            this.mode === 'add'
            &&
            !this.entity.repositoryCode?.trim()
        )
        {
            this.sourcecontrolservice
                .getAll()
                .subscribe(
                {
                    next:(entities) =>
                    {
                        this.entity.repositoryCode =
                            this.generateNextCode(
                                entities
                            );


                        this.saveCreate();
                    },


                    error:(error) =>
                    {
                        console.error(
                            'Generate Source Control Code Before Save Error',

                            error
                        );


                        this.entity.repositoryCode =
                            'SC-001';


                        this.saveCreate();
                    }
                });


            return;
        }


        //=======================================================
        // Continue Save
        //=======================================================

        this.saveRecord();
    }



    //===========================================================
    // Save Record
    //===========================================================

    private saveRecord():
        void
    {
        //=======================================================
        // Validation
        //=======================================================

        if
        (
            !this.entity.repositoryName?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Repository Name is required.'
            );

            return;
        }


        if
        (
            !this.entity.gitRemoteUrl?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Git Remote URL is required.'
            );

            return;
        }


        if
        (
            !this.entity.defaultBranch?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Default Branch is required.'
            );

            return;
        }


        if
        (
            !this.entity.repositoryPath?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Repository Path is required.'
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
        //=======================================================
        // Validate Repository Code
        //=======================================================

        if
        (
            !this.entity.repositoryCode?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Repository Code is required.'
            );

            return;
        }


        //=======================================================
        // Synchronize Remarks
        //=======================================================

        this.entity.remarks =
            this.remarks
            ||
            null;


        //=======================================================
        // Create Model
        //=======================================================

        const model:
            CreateSourceControl =
        {
            repositoryCode:
                this.entity.repositoryCode.trim(),

            repositoryName:
                this.entity.repositoryName.trim(),

            gitRemoteUrl:
                this.entity.gitRemoteUrl.trim(),

            defaultBranch:
                this.entity.defaultBranch.trim(),

            repositoryPath:
                this.entity.repositoryPath.trim(),

            remarks:
                this.entity.remarks,

            isActive:
                this.entity.isActive
        };


        //=======================================================
        // Create Request
        //=======================================================

        this.sourcecontrolservice
            .create(
                model
            )
            .subscribe(
            {
                next:() =>
                {
                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );


                    this.hasChanges =
                        false;


                    this.toast.success(
                        'Success',

                        'Source Control created successfully.'
                    );


                    this.onBackToList();
                },


                error:(error) =>
                {
                    console.error(
                        'Create Source Control Error',

                        error
                    );


                    const message =
                        error?.error
                        ??
                        'Failed to create Source Control.';


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
        //=======================================================
        // Synchronize Remarks
        //=======================================================

        this.entity.remarks =
            this.remarks
            ||
            null;


        const model:
            UpdateSourceControl =
        {
            sourceControlId:
                this.entity.sourceControlId,

            repositoryCode:
                this.entity.repositoryCode.trim(),

            repositoryName:
                this.entity.repositoryName.trim(),

            gitRemoteUrl:
                this.entity.gitRemoteUrl.trim(),

            defaultBranch:
                this.entity.defaultBranch.trim(),

            repositoryPath:
                this.entity.repositoryPath.trim(),

            remarks:
                this.entity.remarks,

            isActive:
                this.entity.isActive
        };


        this.sourcecontrolservice
            .update(
                model
            )
            .subscribe(
            {
                next:() =>
                {
                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );


                    this.hasChanges =
                        false;


                    this.toast.success(
                        'Success',

                        'Source Control updated successfully.'
                    );


                    this.onBackToList();
                },


                error:(error) =>
                {
                    console.error(
                        'Update Source Control Error',

                        error
                    );


                    const message =
                        error?.error
                        ??
                        'Failed to update Source Control.';


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
                    '/infrastructure-control',

                    'code-management',

                    'source-control',

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
                        '/infrastructure-control',

                        'code-management',

                        'source-control',

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