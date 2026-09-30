//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    inject,
    ChangeDetectorRef,
    Type
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    HttpErrorResponse
}
from '@angular/common/http';

import
{
    ActivatedRoute,
    Router
}
from '@angular/router';


//===============================================================
// Environment
//===============================================================

import
{
    environment
}
from '../../../../../../environments/environment';


//===============================================================
// Models
//===============================================================

import
{
    SubOrdinateComponents
}
from '../../../models/sub-ordinate-components.model';


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
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';


//===============================================================
// Utility Components
//===============================================================

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    HistoryDrawerComponent
}
from '../../../../../../shared/components/utilities/history-drawer/history-drawer';

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

import
{
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';


//===============================================================
// Sub-ordinate Components
//===============================================================

import
{
    BackgroundImageComponent
}
from '../../../../../../shared/components/sub-ordinate-components/background-image-1/background-image-1';

import
{
    BackgroundImageComponent as BackgroundImageComponent2
}
from '../../../../../../shared/components/sub-ordinate-components/background-image-2/background-image-2';

import
{
    BackgroundImageComponent as BackgroundImageComponent3
}
from '../../../../../../shared/components/sub-ordinate-components/background-image-3/background-image-3';

import
{
    BackgroundImageComponent as BackgroundImageComponent4
}
from '../../../../../../shared/components/sub-ordinate-components/background-image-4/background-image-4';

import
{
    BackgroundImageComponent as BackgroundImageComponent5
}
from '../../../../../../shared/components/sub-ordinate-components/background-image-5/background-image-5';


//===============================================================
// Service
//===============================================================

import
{
    SubOrdinateComponentsService
}
from '../../../services/sub-ordinate-components.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'sub-ordinate-components-list',

    standalone:
        true,

    imports:
    [
        CommonModule,

        PageHeaderComponent,

        PageToolbarComponent,

        ControlTabsComponent,

        CommandCenterComponent,

        HistoryDrawerComponent,

        ConfirmDialogComponent,

        ToastComponent
    ],

    templateUrl:
        './sub-ordinate-components-list.html',

    styleUrls:
    [
        './sub-ordinate-components-list.css'
    ]
})


//===============================================================
// Sub Ordinate Components List Component
//===============================================================

export class SubOrdinateComponentsList
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly subordinatecomponentsservice =
        inject(SubOrdinateComponentsService);


    private readonly confirmDialog =
        inject(ConfirmDialogService);


    private readonly toast =
        inject(ToastService);


    private readonly router =
        inject(Router);


    private readonly route =
        inject(ActivatedRoute);


    private readonly cdr =
        inject(ChangeDetectorRef);



    //===========================================================
    // API Image Base URL
    //===========================================================

    /*
       Backend image paths are stored as relative paths.

       Example:

       /uploads/sub-ordinate-components/1/light-xxxx.jpg

       This base URL converts that path into a browser URL.
    */

    private readonly apiBaseUrl =
        environment.apiUrl
            .replace(
                /\/api\/?$/,
                ''
            );



    //===========================================================
    // Page Tabs
    //===========================================================

    tabs:
        ControlTab[] =
    [];


    selectedTab:
        string =
        '';



    //===========================================================
    // Sub Ordinate Components
    //===========================================================

    subordinatecomponents:
        SubOrdinateComponents[] =
    [];


    selectedComponent:
        SubOrdinateComponents | null =
        null;



    //===========================================================
    // Selected Component Type
    //===========================================================

    selectedComponentType:
        Type<unknown>
        |
        null =
        null;



    //===========================================================
    // Selected Component Inputs
    //===========================================================
    //
    // Strongly typed dynamic component inputs.
    //
    // These are passed to the selected subordinate component
    // through Angular's ngComponentOutlet inputs.
    //
    //===========================================================

    selectedComponentInputs:
    {
        lightBackgroundImageUrl:
            string;

        deepBackgroundImageUrl:
            string;
    } =
    {
        lightBackgroundImageUrl:
            '',

        deepBackgroundImageUrl:
            ''
    };



    //===========================================================
    // Loading
    //===========================================================

    loading:
        boolean =
        false;


    loadFailed:
        boolean =
        false;



    //===========================================================
    // History
    //===========================================================

    historyOpened:
        boolean =
        false;


    historyTitle:
        string =
        'Sub Ordinate Components History';


    historyItems:
        any[] =
    [];



    //===========================================================
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.loadItems();
    }



    //===========================================================
    // Load Sub Ordinate Components
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;


        this.loadFailed =
            false;


        this.subordinatecomponentsservice
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        SubOrdinateComponents[]
                ):
                    void =>
                {
                    this.subordinatecomponents =
                    [
                        ...response
                    ];


                    console.log(
                        'Sub Ordinate Components Records:',
                        this.subordinatecomponents
                    );


                    this.buildTabs();


                    this.selectInitialTab();


                    this.loading =
                        false;


                    this.loadFailed =
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
                    console.error
                    (
                        'Load Sub Ordinate Components Error',

                        error
                    );


                    this.subordinatecomponents =
                    [];


                    this.tabs =
                    [];


                    this.selectedTab =
                        '';


                    this.selectedComponent =
                        null;


                    this.selectedComponentType =
                        null;


                    this.clearSelectedComponentInputs();


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load sub ordinate components.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Build Tabs
    //===========================================================

    private buildTabs():
        void
    {
        this.tabs =
            this.subordinatecomponents
                .map
                (
                    (
                        component:
                            SubOrdinateComponents
                    ):
                        ControlTab =>
                    ({
                        id:
                            String(
                                component.id
                            ),

                        label:
                            component.tabName
                    })
                );
    }



    //===========================================================
    // Select Initial Tab
    //===========================================================

    private selectInitialTab():
        void
    {
        if
        (
            this.tabs.length === 0
        )
        {
            this.selectedTab =
                '';

            this.selectedComponent =
                null;

            this.selectedComponentType =
                null;

            this.clearSelectedComponentInputs();

            return;
        }


        const existingTab =
            this.tabs.find
            (
                tab =>
                    tab.id ===
                    this.selectedTab
            );


        if
        (
            existingTab
        )
        {
            this.selectTab(
                existingTab.id
            );

            return;
        }


        this.selectTab(
            this.tabs[0].id
        );
    }



    //===========================================================
    // Tab Changed
    //===========================================================

    onTabChange
    (
        tabId:
            string
    ):
        void
    {
        this.selectTab(
            tabId
        );
    }



    //===========================================================
    // Select Tab
    //===========================================================

    private selectTab
    (
        tabId:
            string
    ):
        void
    {
        this.selectedTab =
            tabId;


        this.selectedComponent =
            this.subordinatecomponents
                .find
                (
                    component =>
                        String(
                            component.id
                        ) ===
                        tabId
                )
                ??
                null;


        this.selectedComponentType =
            this.resolveComponentType(
                this.selectedComponent
            );


        //=======================================================
        // Build Dynamic Component Inputs
        //=======================================================

        if
        (
            this.selectedComponent
        )
        {
            this.selectedComponentInputs =
            {
                lightBackgroundImageUrl:
                    this.buildImageUrl(
                        this.selectedComponent
                            .lightBackgroundImagePath
                    ),

                deepBackgroundImageUrl:
                    this.buildImageUrl(
                        this.selectedComponent
                            .deepBackgroundImagePath
                    )
            };
        }

        else
        {
            this.clearSelectedComponentInputs();
        }


        //=======================================================
        // Debug
        //=======================================================

        console.log(
            'Sub Ordinate Components Selected Component:',
            this.selectedComponent
        );


        console.log(
            'Sub Ordinate Component Type:',
            this.selectedComponentType
        );


        console.log(
            'Sub Ordinate Component Inputs:',
            this.selectedComponentInputs
        );


        console.log(
            'Light Background Image URL:',
            this.selectedComponentInputs
                .lightBackgroundImageUrl
        );


        console.log(
            'Deep Background Image URL:',
            this.selectedComponentInputs
                .deepBackgroundImageUrl
        );


        console.log(
            'Sub Ordinate Component Name:',
            this.selectedComponent?.name
        );


        console.log(
            'Sub Ordinate Component ID:',
            this.selectedComponent?.id
        );


        this.cdr.detectChanges();
    }



    //===========================================================
    // Build Image URL
    //===========================================================
    //
    // Converts the database image path into a browser URL.
    //
    // Example:
    //
    // /uploads/sub-ordinate-components/1/light-xxxx.jpg
    //
    // becomes:
    //
    // http://localhost:xxxx/uploads/
    // sub-ordinate-components/1/light-xxxx.jpg
    //
    //===========================================================

    private buildImageUrl
    (
        imagePath:
            string
            |
            null
            |
            undefined
    ):
        string
    {
        if
        (
            !imagePath
        )
        {
            return '';
        }


        const value =
            imagePath.trim();


        if
        (
            !value
        )
        {
            return '';
        }


        //=======================================================
        // Absolute URL
        //=======================================================

        if
        (
            value.startsWith(
                'http://'
            )
            ||
            value.startsWith(
                'https://'
            )
            ||
            value.startsWith(
                'data:'
            )
            ||
            value.startsWith(
                'blob:'
            )
        )
        {
            return value;
        }


        //=======================================================
        // Root Relative Path
        //=======================================================

        if
        (
            value.startsWith('/')
        )
        {
            return `${this.apiBaseUrl}${value}`;
        }


        //=======================================================
        // Relative Path
        //=======================================================

        return `${this.apiBaseUrl}/${value}`;
    }



    //===========================================================
    // Clear Selected Component Inputs
    //===========================================================

    private clearSelectedComponentInputs():
        void
    {
        this.selectedComponentInputs =
        {
            lightBackgroundImageUrl:
                '',

            deepBackgroundImageUrl:
                ''
        };
    }



    //===========================================================
    // Resolve Component Type
    //===========================================================
    //
    // The database record identifies the component through
    // componentPath / component name.
    //
    // The actual Angular component class is selected directly
    // here.
    //
    // ComponentRenderer is intentionally NOT used.
    //===========================================================

    private resolveComponentType
    (
        component:
            SubOrdinateComponents
            |
            null
    ):
        Type<unknown>
        |
        null
    {
        if
        (
            !component
        )
        {
            return null;
        }


        const componentPath =
            (
                component.componentPath
                ??
                ''
            )
            .trim()
            .replace(
                /\\/g,
                '/'
            )
            .replace(
                /\/+/g,
                '/'
            )
            .replace(
                /\/$/,
                ''
            )
            .toLowerCase();


        const componentName =
            (
                component.name
                ??
                ''
            )
            .trim()
            .toLowerCase();


        const tabName =
            (
                component.tabName
                ??
                ''
            )
            .trim()
            .toLowerCase();


        //=======================================================
        // Background Image 1
        //=======================================================

        if
        (
            componentPath.includes(
                'background-image-1'
            )
            ||
            componentName ===
                'background image 1'
            ||
            tabName ===
                'background image 1'
        )
        {
            return BackgroundImageComponent;
        }


        //=======================================================
        // Background Image 2
        //=======================================================

        if
        (
            componentPath.includes(
                'background-image-2'
            )
            ||
            componentName ===
                'background image 2'
            ||
            tabName ===
                'background image 2'
        )
        {
            return BackgroundImageComponent2;
        }


        //=======================================================
        // Background Image 3
        //=======================================================

        if
        (
            componentPath.includes(
                'background-image-3'
            )
            ||
            componentName ===
                'background image 3'
            ||
            tabName ===
                'background image 3'
        )
        {
            return BackgroundImageComponent3;
        }


        //=======================================================
        // Background Image 4
        //=======================================================

        if
        (
            componentPath.includes(
                'background-image-4'
            )
            ||
            componentName ===
                'background image 4'
            ||
            tabName ===
                'background image 4'
        )
        {
            return BackgroundImageComponent4;
        }


        //=======================================================
        // Background Image 5
        //=======================================================

        if
        (
            componentPath.includes(
                'background-image-5'
            )
            ||
            componentName ===
                'background image 5'
            ||
            tabName ===
                'background image 5'
        )
        {
            return BackgroundImageComponent5;
        }


        return null;
    }



    //===========================================================
    // Refresh
    //===========================================================

    refresh():
        void
    {
        this.selectedTab =
            '';


        this.selectedComponent =
            null;


        this.selectedComponentType =
            null;


        this.clearSelectedComponentInputs();


        this.loadItems();
    }



    //===========================================================
    // Add
    //===========================================================

    add():
        void
    {
        void this.router.navigate
        (
            [
                'add'
            ],

            {
                relativeTo:
                    this.route.parent
            }
        );
    }



    //===========================================================
    // Edit
    //===========================================================

    edit
    (
        item:
            SubOrdinateComponents
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',

                item.id
            ],

            {
                relativeTo:
                    this.route.parent
            }
        );
    }



    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        item:
            SubOrdinateComponents
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Sub Ordinate Component',

            `Are you sure you want to delete "${item.name}" ?`,

            ():
                void =>
            {
                this.subordinatecomponentsservice
                    .delete
                    (
                        item.id
                    )
                    .subscribe
                    ({
                        next:
                        ():
                            void =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',

                                `${item.name} deleted successfully.`
                            );


                            this.loadItems();
                        },


                        error:
                        (
                            error:
                                unknown
                        ):
                            void =>
                        {
                            console.error
                            (
                                'Delete Sub Ordinate Component Error',

                                error
                            );


                            this.toast.error
                            (
                                'Delete Failed',

                                'Failed to delete sub ordinate component.'
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
        this.confirmDialog.open
        (
            'Restore Sub Ordinate Component',

            'Are you sure you want to restore the most recently deleted sub ordinate component.',

            ():
                void =>
            {
                this.restoreItem();
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }



    //===========================================================
    // Restore Item
    //===========================================================

    private restoreItem():
        void
    {
        this.subordinatecomponentsservice
            .restore()
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.toast.success
                    (
                        'Restore Successful',

                        'The most recently deleted sub ordinate component has been restored.'
                    );


                    this.loadItems();
                },


                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error
                    (
                        'Restore Sub Ordinate Component Error',

                        error
                    );


                    if
                    (
                        error instanceof HttpErrorResponse
                        &&
                        error.status === 404
                    )
                    {
                        this.toast.info
                        (
                            'No Data to Restore',

                            'There is no deleted sub ordinate component record to restore.'
                        );

                        return;
                    }


                    this.toast.error
                    (
                        'Restore Failed',

                        'Failed to restore sub ordinate component.'
                    );
                }
            });
    }



    //===========================================================
    // Open History
    //===========================================================

    openHistory():
        void
    {
        this.subordinatecomponentsservice
            .getHistory()
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ):
                    void =>
                {
                    this.historyItems =
                        response.map
                        (
                            history =>
                            ({
                                title:
                                    history.activityTitle,


                                description:
                                    history.activityDescription,


                                user:
                                    history.performedByName
                                    ??
                                    'System',


                                dateTime:
                                    new Date
                                    (
                                        history.performedDate
                                    )
                                    .toLocaleString(),


                                badge:
                                    history.activityType
                            })
                        );


                    this.historyTitle =
                        'Sub Ordinate Components Management History';


                    this.historyOpened =
                        true;


                    this.cdr.detectChanges();
                },


                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error
                    (
                        'History Load Failed',

                        error
                    );


                    this.toast.error
                    (
                        'History',

                        'Failed to load sub ordinate components history.'
                    );
                }
            });
    }



    //===========================================================
    // Close History
    //===========================================================

    closeHistory():
        void
    {
        this.historyOpened =
            false;
    }

}