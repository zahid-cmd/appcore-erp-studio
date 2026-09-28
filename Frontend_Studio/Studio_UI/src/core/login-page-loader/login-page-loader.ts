//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,

    Component,

    OnInit
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

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

        LoginPage4
    ],

    templateUrl:
        './login-page-loader.html',

    styleUrls:
    [
        './login-page-loader.css'
    ]
})
export class LoginPageLoader
    implements OnInit
{

    //===========================================================
    // Injection
    //===========================================================

    constructor
    (
        private readonly loginPagesService:
            LoginPagesService,

        private readonly toastService:
            ToastService,

        private readonly changeDetectorRef:
            ChangeDetectorRef
    )
    {
    }



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
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.loadActiveLoginPage();
    }



    //===========================================================
    // Load Active Login Page
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
    //===========================================================

    onRetry():
        void
    {
        this.loadActiveLoginPage();
    }

}