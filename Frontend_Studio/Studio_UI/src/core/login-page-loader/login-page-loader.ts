//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,

    Component,

    HostListener,

    OnDestroy,

    OnInit,

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
    finalize
}
from 'rxjs';

import
{
    LoginPagesService
}
from '../../features/infrastructure-control/application-configuration/services/login-pages.service';

import
{
    LoginPages
}
from '../../features/infrastructure-control/application-configuration/models/login-pages.model';

import
{
    LoginPage1
}
from '../../shared/login-pages/login-page-1/login-page-1';

import
{
    LoginPage2
}
from '../../shared/login-pages/login-page-2/login-page-2';

import
{
    LoginPage3
}
from '../../shared/login-pages/login-page-3/login-page-3';

import
{
    LoginPage4
}
from '../../shared/login-pages/login-page-4/login-page-4';

import
{
    LoginPage5
}
from '../../shared/login-pages/login-page-5/login-page-5';


//===============================================================
// Orbit Loader
//===============================================================

import
{
    OrbitLoaderComponent
}
from '../../shared/components/utilities/orbit-loader/orbit-loader';


//===============================================================
// Toast
//===============================================================

import
{
    ToastComponent
}
from '../../shared/components/utilities/toast/toast';

import
{
    ToastService
}
from '../../shared/components/utilities/toast/toast.service';


//===============================================================
// Empty State
//===============================================================

import
{
    EmptyStateComponent
}
from '../../shared/components/layout/empty-state/empty-state';


//===============================================================
// Login Page Loader
//===============================================================

@Component
({
    selector:
        'app-login-page-loader',

    standalone:
        true,

    imports:
    [
        CommonModule,

        OrbitLoaderComponent,

        ToastComponent,

        EmptyStateComponent,

        LoginPage1,

        LoginPage2,

        LoginPage3,

        LoginPage4,

        LoginPage5
    ],

    templateUrl:
        './login-page-loader.html',

    styleUrls:
    [
        './login-page-loader.css'
    ]
})
export class LoginPageLoader
    implements OnInit, OnDestroy
{


    //===========================================================
    // Injection
    //===========================================================

    private readonly loginPagesService =
        inject(
            LoginPagesService
        );


    private readonly toastService =
        inject(
            ToastService
        );


    private readonly changeDetectorRef =
        inject(
            ChangeDetectorRef
        );


    private readonly route =
        inject(
            ActivatedRoute
        );


    private readonly router =
        inject(
            Router
        );



    //===========================================================
    // State
    //===========================================================

    isLoading:
        boolean =
            true;


    loadError:
        string =
            '';


    activePageKey:
        string =
            '';



    //===========================================================
    // PREVIEW MODE
    // ----------------------------------------------------------
    // TRUE:
    //
    //     Loader was opened from the Login Pages List
    //     Operation → Preview.
    //
    // FALSE:
    //
    //     Loader is being used for the normal active Login Page.
    //===========================================================

    isPreviewMode:
        boolean =
            false;



    //===========================================================
    // PREVIEW LOGIN PAGE ID
    // ----------------------------------------------------------
    // Route examples:
    //
    //     /preview/1
    //         ↓
    //     loginPageId = 1
    //
    //     /preview/5
    //         ↓
    //     loginPageId = 5
    //===========================================================

    loginPageId:
        number
        |
        null =
        null;



    //===========================================================
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.detectPreviewMode();
    }



    //===========================================================
    // Destroy
    // ----------------------------------------------------------
    // Removes the global Preview Mode body class when the
    // Loader component is destroyed.
    //===========================================================

    ngOnDestroy():
        void
    {
        document.body.classList.remove(
            'login-page-preview-active'
        );
    }



    //===========================================================
    // Detect Preview Mode
    // ----------------------------------------------------------
    // The Loader determines its mode from the route.
    //
    // PREVIEW:
    //
    //     /preview/:id
    //
    // NORMAL:
    //
    //     No valid preview ID.
    //===========================================================

    private detectPreviewMode():
        void
    {
        //=======================================================
        // READ LOGIN PAGE ID FROM ROUTE
        //=======================================================

        const routeId =
            this.route.snapshot.paramMap.get(
                'id'
            );


        const id =
            Number(
                routeId
            );


        //=======================================================
        // VALID PREVIEW LOGIN PAGE
        //=======================================================

        if
        (
            id >= 1
            &&
            id <= 5
        )
        {
            this.isPreviewMode =
                true;


            this.loginPageId =
                id;


            //===================================================
            // ENABLE GLOBAL PREVIEW MODE
            //===================================================

            document.body.classList.add(
                'login-page-preview-active'
            );


            //===================================================
            // LOAD SELECTED LOGIN PAGE
            //===================================================

            this.loadPreviewLoginPage(
                id
            );


            return;
        }


        //=======================================================
        // NORMAL ACTIVE LOGIN PAGE MODE
        //=======================================================

        this.isPreviewMode =
            false;


        this.loginPageId =
            null;


        document.body.classList.remove(
            'login-page-preview-active'
        );


        this.loadActiveLoginPage();
    }



    //===========================================================
    // Load Preview Login Page
    // ----------------------------------------------------------
    // IMPORTANT:
    //
    // Preview mode does NOT call getActive().
    //
    // The Login Page ID comes directly from the route.
    //
    //     ID 1 → Login Page 1
    //     ID 2 → Login Page 2
    //     ID 3 → Login Page 3
    //     ID 4 → Login Page 4
    //     ID 5 → Login Page 5
    //===========================================================

    private loadPreviewLoginPage(
        id:
            number
    ):
        void
    {
        this.isLoading =
            true;


        this.loadError =
            '';


        this.activePageKey =
            '';


        this.changeDetectorRef.detectChanges();


        //=======================================================
        // BUILD LOGIN PAGE KEY
        //=======================================================

        const pageKey =
            `login-page-${id}`;


        //=======================================================
        // VALIDATE LOGIN PAGE KEY
        //=======================================================

        switch
        (
            pageKey
        )
        {
            case 'login-page-1':

                this.activePageKey =
                    'login-page-1';

                break;


            case 'login-page-2':

                this.activePageKey =
                    'login-page-2';

                break;


            case 'login-page-3':

                this.activePageKey =
                    'login-page-3';

                break;


            case 'login-page-4':

                this.activePageKey =
                    'login-page-4';

                break;


            case 'login-page-5':

                this.activePageKey =
                    'login-page-5';

                break;


            default:

                this.loadError =
                    'The selected Login Page configuration is invalid.';

                this.toastService.error
                (
                    'Login Page',

                    this.loadError,

                    5000
                );

                break;
        }


        //=======================================================
        // PREVIEW PAGE DOES NOT REQUIRE getActive()
        // ------------------------------------------------------
        // The selected Login Page component is now responsible
        // for loading its own configuration and resources.
        //=======================================================

        this.isLoading =
            false;


        this.changeDetectorRef.detectChanges();
    }



    //===========================================================
    // Load Active Login Page
    // ----------------------------------------------------------
    // NORMAL MODE
    //
    // Uses LoginPagesService.getActive() to determine which
    // Login Page is currently configured as active.
    //===========================================================

    private loadActiveLoginPage():
        void
    {
        this.isLoading =
            true;


        this.loadError =
            '';


        this.activePageKey =
            '';


        this.changeDetectorRef.detectChanges();


        this.loginPagesService
            .getActive()
            .pipe
            (
                finalize
                (
                    () =>
                    {
                        this.isLoading =
                            false;


                        this.changeDetectorRef.detectChanges();
                    }
                )
            )
            .subscribe
            ({
                next:
                    (page: LoginPages) =>
                    {
                        const pageKey =
                            (
                                page.pageKey
                                ||
                                ''
                            )
                            .trim()
                            .toLowerCase();


                        switch
                        (
                            pageKey
                        )
                        {
                            case 'login-page-1':

                                this.activePageKey =
                                    'login-page-1';

                                break;


                            case 'login-page-2':

                                this.activePageKey =
                                    'login-page-2';

                                break;


                            case 'login-page-3':

                                this.activePageKey =
                                    'login-page-3';

                                break;


                            case 'login-page-4':

                                this.activePageKey =
                                    'login-page-4';

                                break;


                            case 'login-page-5':

                                this.activePageKey =
                                    'login-page-5';

                                break;


                            default:

                                this.loadError =
                                    'The active Login Page configuration is invalid.';


                                this.toastService.error
                                (
                                    'Login Page',

                                    this.loadError,

                                    5000
                                );

                                break;
                        }


                        this.changeDetectorRef.detectChanges();
                    },


                error:
                    (error: any) =>
                    {
                        this.loadError =
                            error?.error?.message
                            ||
                            'Unable to load the active login page.';


                        this.toastService.error
                        (
                            'Login Page',

                            this.loadError,

                            5000
                        );


                        this.changeDetectorRef.detectChanges();
                    }
            });
    }



    //===========================================================
    // Retry
    // ----------------------------------------------------------
    // Retry behavior depends on the current Loader mode.
    //===========================================================

    onRetry():
        void
    {
        //=======================================================
        // PREVIEW MODE
        //=======================================================

        if
        (
            this.isPreviewMode
            &&
            this.loginPageId
        )
        {
            this.loadPreviewLoginPage(
                this.loginPageId
            );


            return;
        }


        //=======================================================
        // NORMAL MODE
        //=======================================================

        this.loadActiveLoginPage();
    }



    //===========================================================
    // ESCAPE KEY
    // ----------------------------------------------------------
    // IMPORTANT:
    //
    // ESC closes ONLY Preview Mode.
    //
    // Normal Active Login Page mode is not affected.
    //===========================================================

    @HostListener(
        'document:keydown.escape'
    )
    onEscapeKey():
        void
    {
        if
        (
            !this.isPreviewMode
        )
        {
            return;
        }


        this.closePreview();
    }



    //===========================================================
    // Close Preview
    // ----------------------------------------------------------
    // Returns the user to the Login Pages List.
    //===========================================================

    private closePreview():
        void
    {
        //=======================================================
        // REMOVE GLOBAL PREVIEW MODE
        //=======================================================

        document.body.classList.remove(
            'login-page-preview-active'
        );


        //=======================================================
        // RESET PREVIEW STATE
        //=======================================================

        this.isPreviewMode =
            false;


        this.loginPageId =
            null;


        //=======================================================
        // RETURN TO LOGIN PAGES LIST
        //=======================================================

        void this.router.navigate(
        [
            'list'
        ],
        {
            relativeTo:
                this.route.parent
        });
    }

}