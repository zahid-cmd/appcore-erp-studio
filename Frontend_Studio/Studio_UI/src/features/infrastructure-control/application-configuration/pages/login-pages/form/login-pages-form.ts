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
    LoginPages,

    CreateLoginPages,

    UpdateLoginPages,

    LoginPagesDefaults
}
from '../../../models/login-pages.model';

import
{
    LoginPagesService
}
from '../../../services/login-pages.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'loginPages-form',

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


    templateUrl:'./login-pages-form.html',


    styleUrls:
    [
        './login-pages-form.css'
    ]
})


//===============================================================
// Login Pages Form Component
//===============================================================

export class LoginPagesForm
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly loginpagesservice =
        inject(LoginPagesService);


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
        'Login Pages';


    entityName:
        string =
        'Login Page';



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
        {
            text:
                string;

            value:
                boolean;
        }[] =
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
        LoginPages =
    {
        id:0,

        code:'',

        name:'',

        pageKey:'',

        title:'',

        subtitle:'',

        status:true,

        remarks:''
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
    // Page Key Read Only
    //===========================================================

    get isPageKeyReadonly():
        boolean
    {
        return true;
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
    // Initialize Entity
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
        {
            id:0,

            code:'',

            name:'',

            pageKey:'',

            title:'',

            subtitle:'',

            status:true,

            remarks:''
        };


        this.originalEntity =
            JSON.stringify(
                this.entity
            );


        this.hasChanges =
            false;


        //=======================================================
        // Load Next Code
        //=======================================================

        this.loadNextCode();
    }



    //===========================================================
    // Load Next Code
    //===========================================================

    private loadNextCode():
        void
    {
        this.loginpagesservice
            .getDefaults()
            .subscribe(
            {
                next:
                (
                    response:
                        LoginPagesDefaults
                ):
                    void =>
                {
                    this.entity.code =
                        response.code;


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
                ):
                    void =>
                {
                    console.error(
                        'Load Login Page Defaults Error',

                        error
                    );


                    this.toast.error(
                        'Error',

                        'Failed to generate login page code.'
                    );
                }
            });
    }



    //===========================================================
    // Load Entity
    //===========================================================

    private loadEntity():
        void
    {
        this.loginpagesservice
            .getById(
                this.entityId
            )
            .subscribe(
            {
                next:
                (
                    response:
                        LoginPages
                ):
                    void =>
                {
                    this.entity =
                        response;


                    //================================================
                    // Ensure Page Key Matches Name
                    //================================================

                    this.generatePageKey();


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
                ):
                    void =>
                {
                    console.error(
                        'Load Login Page Error',

                        error
                    );


                    this.toast.error(
                        'Error',

                        'Failed to load login page.'
                    );


                    this.navigateToList();
                }
            });
    }



    //===========================================================
    // Generate Page Key
    //===========================================================

    private generatePageKey():
        void
    {
        const name =
            this.entity.name?.trim()
            ??
            '';


        if
        (
            !name
        )
        {
            this.entity.pageKey =
                '';

            return;
        }


        this.entity.pageKey =
            name
                .toLowerCase()
                .replace(
                    /\s+/g,
                    '-'
                );
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
        // Generate Page Key
        //=======================================================

        this.generatePageKey();


        //=======================================================
        // Validation
        //=======================================================

        if
        (
            !this.entity.name?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Name is required.'
            );

            return;
        }


        if
        (
            !this.entity.pageKey?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Page Key could not be generated.'
            );

            return;
        }


        if
        (
            !this.entity.title?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Title is required.'
            );

            return;
        }


        //=======================================================
        // Create
        //=======================================================

        if
        (
            this.mode === 'add'
        )
        {
            const model:
                CreateLoginPages =
            {
                name:
                    this.entity.name,

                pageKey:
                    this.entity.pageKey,

                title:
                    this.entity.title,

                subtitle:
                    this.entity.subtitle,

                status:
                    this.entity.status,

                remarks:
                    this.entity.remarks
            };


            this.loginpagesservice
                .create(
                    model
                )
                .subscribe(
                {
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

                            'Login Page created successfully.'
                        );


                        this.navigateToList();
                    },


                    error:
                    (
                        error:
                            unknown
                    ):
                        void =>
                    {
                        console.error(
                            'Create Login Page Error',

                            error
                        );


                        const message =
                            (error as any)?.error?.message
                            ??
                            (error as any)?.error
                            ??
                            'Failed to create login page.';


                        this.toast.error(
                            'Validation',

                            message
                        );
                    }
                });


            return;
        }


        //=======================================================
        // Update
        //=======================================================

        const model:
            UpdateLoginPages =
        {
            id:
                this.entity.id,

            name:
                this.entity.name,

            pageKey:
                this.entity.pageKey,

            title:
                this.entity.title,

            subtitle:
                this.entity.subtitle,

            status:
                this.entity.status,

            remarks:
                this.entity.remarks
        };


        this.loginpagesservice
            .update(
                model
            )
            .subscribe(
            {
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

                        'Login Page updated successfully.'
                    );


                    this.navigateToList();
                },


                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Update Login Page Error',

                        error
                    );


                    const message =
                        (error as any)?.error?.message
                        ??
                        (error as any)?.error
                        ??
                        'Failed to update login page.';


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
            this.navigateToList();


            return;
        }


        this.confirmDialog.open(

            'Cancel Changes',

            'Any unsaved changes will be lost. Do you want to leave this page?',


            (): void =>
            {
                this.navigateToList();
            },


            'Leave',

            'Stay',

            'primary'
        );
    }



    //===========================================================
    // Navigate To List
    //===========================================================

    private navigateToList():
        void
    {
        void this.router.navigate(
        [
            'list'
        ],
        {
            relativeTo:
                this.route.parent
        });
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
        //=======================================================
        // Generate Page Key From Name
        //=======================================================

        this.generatePageKey();


        //=======================================================
        // Track Changes
        //=======================================================

        this.checkForChanges();


        this.cdr.detectChanges();
    }

}