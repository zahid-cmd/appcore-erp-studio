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
    ApplicationComponents,
    CreateApplicationComponents,
    UpdateApplicationComponents
}
from '../../../models/application-components.model';

import
{
    ApplicationComponentsService
}
from '../../../services/application-components.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'applicationComponents-form',

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


    templateUrl:'./application-components-form.html',


    styleUrls:
    [
        './application-components-form.css'
    ]
})


export class ApplicationComponentsForm
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly applicationcomponentsservice =
        inject(ApplicationComponentsService);


    private readonly confirmDialog =
        inject(ConfirmDialogService);


    private readonly toast =
        inject(ToastService);


    private readonly cdr =
        inject(ChangeDetectorRef);



    //===========================================================
    // Fixed Component Directory
    //===========================================================

    private readonly componentDirectory =
        'Frontend_Studio\\Studio_UI\\src\\shared\\components\\application';



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
        'Application Components';


    entityName:
        string =
        'Application Components';



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
    // Sample Search Dropdown Items
    //===========================================================

    items:
        any[]
    =
        [];



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
        ApplicationComponents
    =
    {
        id:0,

        code:'',

        name:'',

        tabName:'',

        componentKey:'',

        displayOrder:0,

        icon:'',

        componentPath:'',

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

            code:'',

            name:'',

            tabName:'',

            componentKey:'',

            displayOrder:0,

            icon:'',

            componentPath:'',

            status:true,

            remarks:''
        };


        this.applicationcomponentsservice
            .getAll()
            .subscribe(
            {
                next:(entities) =>
                {
                    this.entity.code =
                        this.generateNextCode(
                            entities
                        );


                    this.entity.displayOrder =
                        this.generateNextDisplayOrder(
                            entities
                        );


                    this.updateComponentPath();


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
                        'Generate Application Components Code Error',
                        error
                    );


                    this.entity.code =
                        'AC-001';


                    this.entity.displayOrder =
                        1;


                    this.updateComponentPath();


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
            ApplicationComponents[]
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
                /^AC-?(\d+)$/.exec(
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


        return `AC-${String(
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
            ApplicationComponents[]
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
    // Generate Component Key
    //===========================================================

    private generateComponentKey
    (
        name:
            string
    ):
        string
    {
        return name
            .trim()
            .toLowerCase()
            .replace(
                /\s+/g,
                '-'
            );
    }



    //===========================================================
    // Generate Component Path
    //===========================================================

    private generateComponentPath
    (
        componentKey:
            string
    ):
        string
    {
        if
        (
            !componentKey.trim()
        )
        {
            return '';
        }


        return `${this.componentDirectory}\\${componentKey}`;
    }



    //===========================================================
    // Update Component Path
    //===========================================================

    private updateComponentPath():
        void
    {
        this.entity.componentPath =
            this.generateComponentPath(
                this.entity.componentKey
            );
    }



    //===========================================================
    // Load Entity
    //===========================================================

    private loadEntity():
        void
    {
        this.applicationcomponentsservice
            .getById(
                this.entityId
            )
            .subscribe(
            {
                next:(response) =>
                {
                    this.entity =
                        response;


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
                        'Load Application Components Error',
                        error
                    );


                    this.toast.error(
                        'Error',

                        this.getErrorMessage(
                            error,
                            'Failed to load Application Components.'
                        )
                    );


                    this.onBackToList();
                }
            });
    }



    //===========================================================
    // Sample Search Dropdown Changed
    //===========================================================

    onSampleSearchDropdownChange():
        void
    {
        this.checkForChanges();
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
            !this.entity.name?.trim()
        )
        {
            this.toast.error(
                'Validation',

                'Name is required.'
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
                CreateApplicationComponents =
            {
                code:
                    this.entity.code,

                name:
                    this.entity.name,

                tabName:
                    this.entity.tabName,

                componentKey:
                    this.entity.componentKey,

                displayOrder:
                    this.entity.displayOrder,

                icon:
                    this.entity.icon,

                componentPath:
                    this.entity.componentPath,

                status:
                    this.entity.status,

                remarks:
                    this.entity.remarks
            };


            this.applicationcomponentsservice
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

                            'Application Components created successfully.'
                        );


                        this.onBackToList();
                    },


                    error:(error) =>
                    {
                        console.error(
                            'Create Application Components Error',
                            error
                        );


                        this.toast.error(
                            'Validation',

                            this.getErrorMessage(
                                error,
                                'Failed to create Application Components.'
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
            UpdateApplicationComponents =
        {
            id:
                this.entity.id,

            name:
                this.entity.name,

            tabName:
                this.entity.tabName,

            componentKey:
                this.entity.componentKey,

            displayOrder:
                this.entity.displayOrder,

            icon:
                this.entity.icon,

            componentPath:
                this.entity.componentPath,

            status:
                this.entity.status,

            remarks:
                this.entity.remarks
        };


        this.applicationcomponentsservice
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

                        'Application Components updated successfully.'
                    );


                    this.onBackToList();
                },


                error:(error) =>
                {
                    console.error(
                        'Update Application Components Error',
                        error
                    );


                    this.toast.error(
                        'Validation',

                        this.getErrorMessage(
                            error,
                            'Failed to update Application Components.'
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


            this.checkForChanges();


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


            () =>
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
        this.entity.componentKey =
            this.generateComponentKey(
                this.entity.name
            );


        this.updateComponentPath();


        this.checkForChanges();


        this.cdr.detectChanges();
    }

}