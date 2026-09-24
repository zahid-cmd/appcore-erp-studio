//===============================================================
// Imports
//===============================================================

import
{
    Component,
    HostListener,
    Input,
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
    LoginPage1
}
from '../../login-pages/login-page-1/login-page-1';

import
{
    LoginPage2
}
from '../../login-pages/login-page-2/login-page-2';

import
{
    LoginPage3
}
from '../../login-pages/login-page-3/login-page-3';

import
{
    LoginPage4
}
from '../../login-pages/login-page-4/login-page-4';



//===============================================================
// Login Page Previewer
//===============================================================

@Component(
{
    selector:
        'app-login-page-previewer',

    standalone:
        true,

    imports:
    [
        CommonModule,

        LoginPage1,

        LoginPage2,

        LoginPage3,

        LoginPage4
    ],

    templateUrl:
        './login-page-previewer.html',

    styleUrls:
    [
        './login-page-previewer.css'
    ]
})


//===============================================================
// Login Page Previewer Component
//===============================================================

export class LoginPagePreviewer
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);



    //===========================================================
    // Login Page Id
    //===========================================================

    @Input()
    loginPageId:
        number
        |
        null =
        null;



    //===========================================================
    // Preview State
    //===========================================================

    isOpen:
        boolean =
        true;



    //===========================================================
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.isOpen =
            true;


        //=======================================================
        // Read Login Page Id From Route
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
        // Validate Login Page Id
        //=======================================================

        if
        (
            id > 0
        )
        {
            this.loginPageId =
                id;

            return;
        }


        //=======================================================
        // Invalid Id
        //=======================================================

        this.loginPageId =
            null;
    }



    //===========================================================
    // Login Page 1
    //===========================================================

    get isLoginPage1():
        boolean
    {
        return this.loginPageId ===
            1;
    }



    //===========================================================
    // Login Page 2
    //===========================================================

    get isLoginPage2():
        boolean
    {
        return this.loginPageId ===
            2;
    }



    //===========================================================
    // Login Page 3
    //===========================================================

    get isLoginPage3():
        boolean
    {
        return this.loginPageId ===
            3;
    }



    //===========================================================
    // Login Page 4
    //===========================================================

    get isLoginPage4():
        boolean
    {
        return this.loginPageId ===
            4;
    }



    //===========================================================
    // Login Page Available
    //===========================================================

    get hasLoginPage():
        boolean
    {
        return this.isLoginPage1
            ||
            this.isLoginPage2
            ||
            this.isLoginPage3
            ||
            this.isLoginPage4;
    }



    //===========================================================
    // Escape Key
    //===========================================================

    @HostListener(
        'document:keydown.escape'
    )
    onEscapeKey():
        void
    {
        this.closePreview();
    }



    //===========================================================
    // Close Preview
    //===========================================================

    private closePreview():
        void
    {
        this.isOpen =
            false;


        //=======================================================
        // Return To Login Pages List
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