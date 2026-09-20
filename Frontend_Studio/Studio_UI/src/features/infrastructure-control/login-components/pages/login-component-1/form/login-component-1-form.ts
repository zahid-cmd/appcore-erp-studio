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
    LoginComponent1,

    CreateLoginComponent1,

    UpdateLoginComponent1,

    LoginComponent1Defaults
}
from '../../../models/login-component-1.model';

import
{
    LoginComponent1Service
}
from '../../../services/login-component-1.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'loginComponent1-form',

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


    templateUrl:'./login-component-1-form.html',


    styleUrls:
    [
        './login-component-1-form.css'
    ]
})


//===============================================================
// Login Component 1 Form Component
//===============================================================

export class LoginComponent1Form
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly logincomponent1service =
        inject(LoginComponent1Service);


    private readonly confirmDialog =
        inject(ConfirmDialogService);


    private readonly toast =
        inject(ToastService);


    private readonly cdr =
        inject(ChangeDetectorRef);



    //===========================================================
    // Fixed Rendering Folder
    //===========================================================

    private readonly renderingFolder =
        'Frontend_Studio\\Studio_UI\\src\\shared\\components';



    //===========================================================
    // Fixed Registration File Path
    //===========================================================

    private readonly registrationFilePath =
        'Frontend_Studio\\Studio_UI\\src\\core\\component-renderer\\component-renderer.ts';



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
        'Login Component 1';


    entityName:
        string =
        'Login Component 1';



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
        LoginComponent1
    =
    {
        id:0,


        //=======================================================
        // Section 1 - General Information
        //=======================================================

        code:'',

        name:'',

        tabName:'',

        icon:'',


        //=======================================================
        // Section 2 - Component Information
        //=======================================================

        folderName:'',

        featureFolder:'',

        featureSubFolder:'',

        componentPath:'',


        //=======================================================
        // Section 3 - File & Registration Information
        //=======================================================

        registrationFilePath:
            this.registrationFilePath,

        htmlFilePath:'',

        tsFilePath:'',

        cssFilePath:'',


        //=======================================================
        // Section 4 - Status & Additional Information
        //=======================================================

        displayOrder:0,

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


            //===================================================
            // Section 1 - General Information
            //===================================================

            code:'',

            name:'',

            tabName:'',

            icon:'',


            //===================================================
            // Section 2 - Component Information
            //===================================================

            folderName:'',

            featureFolder:'',

            featureSubFolder:'',

            componentPath:'',


            //===================================================
            // Section 3 - File & Registration Information
            //===================================================

            registrationFilePath:
                this.registrationFilePath,

            htmlFilePath:'',

            tsFilePath:'',

            cssFilePath:'',


            //===================================================
            // Section 4 - Status & Additional Information
            //===================================================

            displayOrder:0,

            status:true,

            remarks:''
        };


        this.logincomponent1service
            .getAll()
            .subscribe(
            {
                next:
                (
                    entities:
                        LoginComponent1[]
                ):
                    void =>
                {
                    //================================================
                    // Generate Next Code
                    //================================================

                    this.entity.code =
                        this.generateNextCode(
                            entities
                        );


                    //================================================
                    // Generate Next Display Order
                    //================================================

                    this.entity.displayOrder =
                        this.generateNextDisplayOrder(
                            entities
                        );


                    //================================================
                    // Load Last Created Folder Information
                    //================================================

                    const lastCreatedEntity =
                        this.getLastCreatedEntity(
                            entities
                        );


                    if
                    (
                        lastCreatedEntity
                    )
                    {
                        this.entity.folderName =
                            lastCreatedEntity.folderName
                                ?.trim()
                                || '';


                        this.entity.featureFolder =
                            lastCreatedEntity.featureFolder
                                ?.trim()
                                || '';


                        //================================================
                        // Generate Remaining Fields
                        //================================================

                        this.generateFeatureSubFolder();


                        this.entity.componentPath =
                            this.generateComponentPath();


                        this.entity.htmlFilePath =
                            this.generateHtmlFilePath();


                        this.entity.tsFilePath =
                            this.generateTsFilePath();


                        this.entity.cssFilePath =
                            this.generateCssFilePath();


                        this.entity.registrationFilePath =
                            this.registrationFilePath;
                    }


                    else
                    {
                        //================================================
                        // No Previous Record
                        //================================================

                        this.updateGeneratedFields();
                    }


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
                        'Generate Login Component 1 Defaults Error',

                        error
                    );


                    this.entity.code =
                        'LC1-001';


                    this.entity.displayOrder =
                        1;


                    this.updateGeneratedFields();


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
    // Get Last Created Entity
    //===========================================================

    private getLastCreatedEntity
    (
        entities:
            LoginComponent1[]
    ):
        LoginComponent1 | null
    {
        if
        (
            !entities
            ||
            entities.length === 0
        )
        {
            return null;
        }


        let lastCreatedEntity =
            entities[0];


        for
        (
            const entity of entities
        )
        {
            if
            (
                Number(entity.id)
                >
                Number(lastCreatedEntity.id)
            )
            {
                lastCreatedEntity =
                    entity;
            }
        }


        return lastCreatedEntity;
    }



    //===========================================================
    // Generate Next Code
    //===========================================================

    private generateNextCode
    (
        entities:
            LoginComponent1[]
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
                /^LC1-?(\d+)$/.exec(
                    entity.code
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


        return `LC1-${String(
            highestNumber + 1
        ).padStart(
            3,
            '0'
        )}`;
    }



    //===========================================================
    // Generate Lowest Available Display Order
    //===========================================================

    private generateNextDisplayOrder
    (
        entities:
            LoginComponent1[]
    ):
        number
    {
        const usedOrders =
            new Set<number>();


        for
        (
            const entity of entities
        )
        {
            const displayOrder =
                Number(
                    entity.displayOrder
                );


            if
            (
                Number.isInteger(
                    displayOrder
                )
                &&
                displayOrder > 0
            )
            {
                usedOrders.add(
                    displayOrder
                );
            }
        }


        let displayOrder =
            1;


        while
        (
            usedOrders.has(
                displayOrder
            )
        )
        {
            displayOrder++;
        }


        return displayOrder;
    }



    //===========================================================
    // Normalize Folder Value
    //===========================================================

    private normalizeFolderValue
    (
        value:
            string
    ):
        string
    {
        return (value || '')
            .trim()
            .toLowerCase()
            .replace(
                /[^a-z0-9]+/g,
                '-'
            )
            .replace(
                /^-+|-+$/g,
                '');
    }



    //===========================================================
    // Generate Feature Folder
    //===========================================================

    private generateFeatureFolder():
        void
    {
        this.entity.featureFolder =
            this.normalizeFolderValue(
                this.entity.folderName
            );
    }



    //===========================================================
    // Generate Feature Sub Folder
    //===========================================================

    private generateFeatureSubFolder():
        void
    {
        this.entity.featureSubFolder =
            this.normalizeFolderValue(
                this.entity.name
            );
    }



    //===========================================================
    // Generate Component Path
    //===========================================================

    private generateComponentPath():
        string
    {
        const featureFolder =
            this.entity.featureFolder
                ?.trim();


        const featureSubFolder =
            this.entity.featureSubFolder
                ?.trim();


        if
        (
            !featureFolder
            ||
            !featureSubFolder
        )
        {
            return '';
        }


        return `${this.renderingFolder}\\${featureFolder}\\${featureSubFolder}`;
    }



    //===========================================================
    // Generate HTML File Path
    //===========================================================

    private generateHtmlFilePath():
        string
    {
        const componentPath =
            this.entity.componentPath
                ?.trim();


        const featureSubFolder =
            this.entity.featureSubFolder
                ?.trim();


        if
        (
            !componentPath
            ||
            !featureSubFolder
        )
        {
            return '';
        }


        return `${componentPath}\\${featureSubFolder}.html`;
    }



    //===========================================================
    // Generate TS File Path
    //===========================================================

    private generateTsFilePath():
        string
    {
        const componentPath =
            this.entity.componentPath
                ?.trim();


        const featureSubFolder =
            this.entity.featureSubFolder
                ?.trim();


        if
        (
            !componentPath
            ||
            !featureSubFolder
        )
        {
            return '';
        }


        return `${componentPath}\\${featureSubFolder}.ts`;
    }



    //===========================================================
    // Generate CSS File Path
    //===========================================================

    private generateCssFilePath():
        string
    {
        const componentPath =
            this.entity.componentPath
                ?.trim();


        const featureSubFolder =
            this.entity.featureSubFolder
                ?.trim();


        if
        (
            !componentPath
            ||
            !featureSubFolder
        )
        {
            return '';
        }


        return `${componentPath}\\${featureSubFolder}.css`;
    }



    //===========================================================
    // Update Generated Fields
    //===========================================================

    private updateGeneratedFields():
        void
    {
        this.generateFeatureFolder();


        this.generateFeatureSubFolder();


        this.entity.componentPath =
            this.generateComponentPath();


        this.entity.htmlFilePath =
            this.generateHtmlFilePath();


        this.entity.tsFilePath =
            this.generateTsFilePath();


        this.entity.cssFilePath =
            this.generateCssFilePath();


        this.entity.registrationFilePath =
            this.registrationFilePath;
    }



    //===========================================================
    // Load Entity
    //===========================================================

    private loadEntity():
        void
    {
        this.logincomponent1service
            .getById(
                this.entityId
            )
            .subscribe(
            {
                next:
                (
                    response:
                        LoginComponent1
                ):
                    void =>
                {
                    this.entity =
                        response;


                    this.updateGeneratedFields();


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
                        'Load Login Component 1 Error',

                        error
                    );


                    this.toast.error(
                        'Error',

                        this.getErrorMessage(
                            error,

                            'Failed to load Login Component 1.'
                        )
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
        // Generate Fields
        //=======================================================

        this.updateGeneratedFields();


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
            !this.entity.tabName?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Tab Name is required.'
            );

            return;
        }


        if
        (
            !this.entity.icon?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Icon is required.'
            );

            return;
        }


        if
        (
            !this.entity.folderName?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Folder Name is required.'
            );

            return;
        }


        if
        (
            !this.entity.featureFolder?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Feature Folder could not be generated.'
            );

            return;
        }


        if
        (
            !this.entity.featureSubFolder?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Feature Sub Folder could not be generated.'
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
                CreateLoginComponent1 =
            {
                name:
                    this.entity.name,

                tabName:
                    this.entity.tabName,

                icon:
                    this.entity.icon,

                folderName:
                    this.entity.folderName,

                featureFolder:
                    this.entity.featureFolder,

                featureSubFolder:
                    this.entity.featureSubFolder,

                componentPath:
                    this.entity.componentPath,

                registrationFilePath:
                    this.entity.registrationFilePath,

                htmlFilePath:
                    this.entity.htmlFilePath,

                tsFilePath:
                    this.entity.tsFilePath,

                cssFilePath:
                    this.entity.cssFilePath,

                displayOrder:
                    this.entity.displayOrder,

                status:
                    this.entity.status,

                remarks:
                    this.entity.remarks
            };


            this.logincomponent1service
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

                            'Login Component 1 created successfully.'
                        );


                        this.onBackToList();
                    },


                    error:
                    (
                        error:
                            unknown
                    ):
                        void =>
                    {
                        console.error(
                            'Create Login Component 1 Error',

                            error
                        );


                        this.toast.error(
                            'Validation',

                            this.getErrorMessage(
                                error,

                                'Failed to create Login Component 1.'
                            )
                        );
                    }
                });


            return;
        }


        //=======================================================
        // Update
        //=======================================================

        const model:
            UpdateLoginComponent1 =
        {
            id:
                this.entity.id,

            name:
                this.entity.name,

            tabName:
                this.entity.tabName,

            icon:
                this.entity.icon,

            folderName:
                this.entity.folderName,

            featureFolder:
                this.entity.featureFolder,

            featureSubFolder:
                this.entity.featureSubFolder,

            componentPath:
                this.entity.componentPath,

            registrationFilePath:
                this.entity.registrationFilePath,

            htmlFilePath:
                this.entity.htmlFilePath,

            tsFilePath:
                this.entity.tsFilePath,

            cssFilePath:
                this.entity.cssFilePath,

            displayOrder:
                this.entity.displayOrder,

            status:
                this.entity.status,

            remarks:
                this.entity.remarks
        };


        this.logincomponent1service
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

                        'Login Component 1 updated successfully.'
                    );


                    this.onBackToList();
                },


                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Update Login Component 1 Error',

                        error
                    );


                    this.toast.error(
                        'Validation',

                        this.getErrorMessage(
                            error,

                            'Failed to update Login Component 1.'
                        )
                    );
                }
            });
    }



    //===========================================================
    // Extract Error Message
    //===========================================================

    private getErrorMessage
    (
        error:
            any,

        defaultMessage:
            string
    ):
        string
    {
        const response =
            error?.error;


        if
        (
            typeof response === 'string'
            &&
            response.trim()
        )
        {
            return response;
        }


        if
        (
            response?.message
            &&
            typeof response.message === 'string'
        )
        {
            return response.message;
        }


        if
        (
            response?.title
            &&
            typeof response.title === 'string'
        )
        {
            return response.title;
        }


        if
        (
            response?.errors
        )
        {
            const messages:
                string[] =
                [];


            for
            (
                const key of Object.keys(
                    response.errors
                )
            )
            {
                const value =
                    response.errors[key];


                if
                (
                    Array.isArray(
                        value
                    )
                )
                {
                    messages.push(
                        ...value.filter(
                            (
                                message:
                                    unknown
                            ):
                                message is string =>
                            typeof message === 'string'
                        )
                    );
                }


                else if
                (
                    typeof value === 'string'
                )
                {
                    messages.push(
                        value
                    );
                }
            }


            if
            (
                messages.length > 0
            )
            {
                return messages.join(
                    ' '
                );
            }
        }


        if
        (
            typeof response === 'object'
            &&
            response !== null
        )
        {
            try
            {
                return JSON.stringify(
                    response
                );
            }
            catch
            {
                return defaultMessage;
            }
        }


        return defaultMessage;
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
            void this.router.navigate(
            [
                'list'
            ],
            {
                relativeTo:
                    this.route.parent
            });


            return;
        }


        this.confirmDialog.open(

            'Cancel Changes',

            'Any unsaved changes will be lost. Do you want to leave this page?',


            (): void =>
            {
                void this.router.navigate(
                [
                    'list'
                ],
                {
                    relativeTo:
                        this.route.parent
                });
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
    // Folder Name Readonly
    //===========================================================

    get isFolderNameReadonly():
        boolean
    {
        return this.isViewMode;
    }



    //===========================================================
    // Feature Folder Readonly
    //===========================================================

    get isFeatureFolderReadonly():
        boolean
    {
        return true;
    }



    //===========================================================
    // Feature Sub Folder Readonly
    //===========================================================

    get isFeatureSubFolderReadonly():
        boolean
    {
        return true;
    }



    //===========================================================
    // Generated Field Readonly
    //===========================================================

    get isGeneratedFieldReadonly():
        boolean
    {
        return true;
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
        this.updateGeneratedFields();


        this.checkForChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Folder Name Changed
    //===========================================================

    onFolderNameChange():
        void
    {
        this.generateFeatureFolder();


        this.entity.componentPath =
            this.generateComponentPath();


        this.entity.htmlFilePath =
            this.generateHtmlFilePath();


        this.entity.tsFilePath =
            this.generateTsFilePath();


        this.entity.cssFilePath =
            this.generateCssFilePath();


        this.checkForChanges();


        this.cdr.detectChanges();
    }



    //===========================================================
    // Name Changed
    //===========================================================

    onNameChange():
        void
    {
        this.generateFeatureSubFolder();


        this.entity.componentPath =
            this.generateComponentPath();


        this.entity.htmlFilePath =
            this.generateHtmlFilePath();


        this.entity.tsFilePath =
            this.generateTsFilePath();


        this.entity.cssFilePath =
            this.generateCssFilePath();


        this.checkForChanges();


        this.cdr.detectChanges();
    }

}