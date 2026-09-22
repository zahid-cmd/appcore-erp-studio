//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    inject,
    ChangeDetectorRef
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
// Models
//===============================================================

import
{
    LoginComponent3
}
from '../../../models/login-component-3.model';


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
// Component Renderer
//===============================================================

import
{
    ComponentRenderer
}
from '../../../../../../core/component-renderer/component-renderer';


//===============================================================
// Service
//===============================================================

import
{
    LoginComponent3Service
}
from '../../../services/login-component-3.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'loginComponent3-list',

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

        ToastComponent,

        ComponentRenderer
    ],

    templateUrl:
        './login-component-3-list.html',

    styleUrls:
    [
        './login-component-3-list.css',

        '../../../../../../shared/styles/component-page.css'
    ]
})


//===============================================================
// Login Component 3 List Component
//===============================================================

export class LoginComponent3List
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly logincomponent3service =
        inject(LoginComponent3Service);


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
    // Page Tabs
    //===========================================================

    tabs:
        ControlTab[] =
    [];


    selectedTab:
        string =
        '';



    //===========================================================
    // Login Component 3
    //===========================================================

    logincomponent3s:
        LoginComponent3[] =
    [];


    selectedComponent:
        LoginComponent3 | null =
        null;



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
        'Login Component 3 History';


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
    // Load Login Component 3
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;


        this.loadFailed =
            false;


        this.logincomponent3service
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        LoginComponent3[]
                ):
                    void =>
                {
                    this.logincomponent3s =
                    [
                        ...response
                    ];


                    console.log(
                        'Login Component 3 Records:',
                        this.logincomponent3s
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
                        'Load Login Component 3 Error',

                        error
                    );


                    this.logincomponent3s =
                    [];


                    this.tabs =
                    [];


                    this.selectedTab =
                        '';


                    this.selectedComponent =
                        null;


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load login component 3.'
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
            this.logincomponent3s
                .map
                (
                    (
                        component:
                            LoginComponent3
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


        console.log(
            'Login Component 3 Tabs:',
            this.tabs
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
            this.logincomponent3s
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


        //=======================================================
        // Renderer Diagnostic
        //=======================================================

        console.log(
            'Login Component 3 Selected Component:',
            this.selectedComponent
        );


        console.log(
            'Login Component 3 Component Path:',
            this.selectedComponent?.componentPath
        );


        console.log(
            'Login Component 3 Renderer Key:',
            this.getRendererKey(
                this.selectedComponent?.componentPath
                ??
                ''
            )
        );


        console.log(
            'Login Component 3 Component Name:',
            this.selectedComponent?.name
        );


        console.log(
            'Login Component 3 Component ID:',
            this.selectedComponent?.id
        );


        this.cdr.detectChanges();
    }



    //===========================================================
    // Get Renderer Key
    //
    // Converts the database componentPath into the key used
    // by the shared ComponentRenderer registry.
    //
    // Example:
    //
    // Frontend_Studio\Studio_UI\src\shared\components\
    // login-page-3\background
    //
    // becomes:
    //
    // login-page-3-background
    //===========================================================

    getRendererKey
    (
        componentPath:
            string
    ):
        string
    {
        if
        (
            !componentPath
            ||
            !componentPath.trim()
        )
        {
            return '';
        }


        const normalizedPath =
            componentPath
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
                );


        //=======================================================
        // Already a renderer key
        //=======================================================

        if
        (
            normalizedPath
                .toLowerCase()
                .startsWith(
                    'login-page-3-'
                )
        )
        {
            return normalizedPath
                .toLowerCase();
        }


        //=======================================================
        // Find Login Page 3 Folder
        //=======================================================

        const pathParts =
            normalizedPath
                .split('/')
                .filter(
                    part =>
                        part.trim().length > 0
                );


        const loginPageIndex =
            pathParts.findIndex
            (
                part =>
                    part
                        .trim()
                        .toLowerCase()
                        ===
                        'login-page-3'
            );


        if
        (
            loginPageIndex < 0
        )
        {
            console.warn
            (
                'Login Component 3: Unable to resolve Login Page 3 renderer key.',
                componentPath
            );


            return '';
        }


        //=======================================================
        // Get Child Component Folder Path
        //=======================================================

        const componentParts =
            pathParts.slice(
                loginPageIndex
            );


        //=======================================================
        // Build Renderer Key
        //
        // login-page-3 + background
        //         ↓
        // login-page-3-background
        //=======================================================

        return componentParts
            .join('-')
            .toLowerCase();
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
            LoginComponent3
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
            LoginComponent3
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Login Component 3',

            `Are you sure you want to delete "${item.name}" ?`,

            ():
                void =>
            {
                this.logincomponent3service
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
                                'Delete Login Component 3 Error',

                                error
                            );


                            this.toast.error
                            (
                                'Delete Failed',

                                'Failed to delete login component 3.'
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
            'Restore Login Component 3',

            'Are you sure you want to restore the most recently deleted login component 3.',

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
        this.logincomponent3service
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

                        'The most recently deleted login component 3 has been restored.'
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
                        'Restore Login Component 3 Error',

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

                            'There is no deleted login component 3 record to restore.'
                        );

                        return;
                    }


                    this.toast.error
                    (
                        'Restore Failed',

                        'Failed to restore login component 3.'
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
        this.logincomponent3service
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
                        'Login Component 3 Management History';


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

                        'Failed to load login component 3 history.'
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