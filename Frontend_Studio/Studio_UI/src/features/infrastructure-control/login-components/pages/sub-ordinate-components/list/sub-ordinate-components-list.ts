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

import
{
    EmptyStateComponent
}
from '../../../../../../shared/components/layout/empty-state/empty-state';

import
{
    OrbitLoaderComponent
}
from '../../../../../../shared/components/utilities/orbit-loader/orbit-loader';

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

        ToastComponent,

        ComponentRenderer,

        EmptyStateComponent,

        OrbitLoaderComponent
    ],

    templateUrl:
        './sub-ordinate-components-list.html',

    styleUrls:
    [
        './sub-ordinate-components-list.css',

        '../../../../../../shared/styles/component-page.css'
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

    private readonly subOrdinatecomponentsservice =
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

    subOrdinatecomponents:
        SubOrdinateComponents[] =
    [];


    selectedComponent:
        SubOrdinateComponents | null =
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


        this.subOrdinatecomponentsservice
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
                    this.subOrdinatecomponents =
                    [
                        ...response
                    ];


                    console.log(
                        'Sub Ordinate Components Records:',
                        this.subOrdinatecomponents
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


                    this.subOrdinatecomponents =
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
            this.subOrdinatecomponents
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
            this.subOrdinatecomponents
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


        console.log(
            'Sub Ordinate Components Selected Component:',
            this.selectedComponent
        );


        console.log(
            'Sub Ordinate Components Component Path:',
            this.selectedComponent?.componentPath
        );


        console.log(
            'Sub Ordinate Components Renderer Key:',
            this.getRendererKey(
                this.selectedComponent?.componentPath
                ??
                ''
            )
        );


        console.log(
            'Sub Ordinate Components Component Name:',
            this.selectedComponent?.name
        );


        console.log(
            'Sub Ordinate Components Component ID:',
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
    // sub-ordinate-components\login-panel
    //
    // becomes:
    //
    // login-panel
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


        const pathParts =
            normalizedPath
                .split('/')
                .filter(
                    part =>
                        part.trim().length > 0
                );


        if
        (
            pathParts.length === 0
        )
        {
            return '';
        }


        const componentFolder =
            pathParts[
                pathParts.length - 1
            ]
            .trim()
            .toLowerCase();


        if
        (
            !componentFolder
        )
        {
            return '';
        }


        console.log(
            'Sub Ordinate Components Renderer Key:',
            componentFolder
        );


        return componentFolder;
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
                this.subOrdinatecomponentsservice
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
        this.subOrdinatecomponentsservice
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
        this.subOrdinatecomponentsservice
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