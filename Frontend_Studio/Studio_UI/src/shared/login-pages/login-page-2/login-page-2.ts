/* =============================================================
   LOGIN PAGE 2
   -------------------------------------------------------------
   PAGE RESPONSIBILITIES:

       - Login / Registration / Forget Password mode
       - Theme state
       - Background Image 2
       - Branding
       - Powered By
       - Notification Panel

   AUTHENTICATION:

       Completely owned by the Central Login Panel.

   BACKGROUND:

       Loaded from:

           Sub Ordinate Component ID = 2

       Light:

           lightBackgroundImageUrl

       Deep:

           deepBackgroundImageUrl

       Current:

           currentBackgroundImageUrl

   CHANGE DETECTION:

       Login Page 2 uses Angular's Default change-detection
       strategy.

       Background images are loaded asynchronously.

       ChangeDetectorRef.detectChanges() is explicitly called
       after the image URLs are assigned so the background
       renders reliably after browser refresh and theme changes.
============================================================= */


/* =============================================================
   Angular
============================================================= */

import
{
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnInit,
    ViewChild,
    inject
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';


/* =============================================================
   Environment
============================================================= */

import
{
    environment
}
from '../../../environments/environment';


/* =============================================================
   Sub Ordinate Components Service
============================================================= */

import
{
    SubOrdinateComponentsService
}
from '../../../features/infrastructure-control/login-components/services/sub-ordinate-components.service';


/* =============================================================
   CORE COMPONENTS
============================================================= */

import
{
    LoginPageBrandingComponent
}
from '../../components/core-components/branding/branding';

import
{
    LoginPagePoweredByComponent
}
from '../../components/core-components/powered-by/powered-by';

import
{
    LoginPageThemeSelectorComponent
}
from '../../components/core-components/theme-selector/theme-selector';


/* =============================================================
   LOGIN PANEL
   -------------------------------------------------------------
   Login Panel is located under:

       components/core-components/login-panel
============================================================= */

import
{
    LoginPageLoginPanelComponent
}
from '../../components/core-components/login-panel/login-panel';


/* =============================================================
   REGISTRATION PANEL
============================================================= */

import
{
    LoginPageRegistrationPanelComponent
}
from '../../components/core-components/registration-panel/registration-panel';


/* =============================================================
   FORGET PASSWORD
============================================================= */

import
{
    LoginPageForgetPasswordPanelComponent
}
from '../../components/core-components/forget-password/forget-password';


/* =============================================================
   NOTIFICATION PANEL
============================================================= */

import
{
    LoginPageNotificationPanelComponent
}
from '../../components/core-components/notification-panel/notification-panel';


/* =============================================================
   COMPONENT
============================================================= */

@Component
({
    selector:
        'app-login-page-2',

    standalone:
        true,

    imports:
    [
        CommonModule,

        //=======================================================
        // CORE COMPONENTS
        //=======================================================

        LoginPageBrandingComponent,

        LoginPagePoweredByComponent,

        LoginPageThemeSelectorComponent,


        //=======================================================
        // LOGIN COMPONENTS
        //=======================================================

        LoginPageLoginPanelComponent,

        LoginPageRegistrationPanelComponent,

        LoginPageForgetPasswordPanelComponent,

        LoginPageNotificationPanelComponent
    ],

    templateUrl:
        './login-page-2.html',

    styleUrls:
    [
        './login-page-2.css'
    ],

    changeDetection:
        ChangeDetectionStrategy.Default
})
export class LoginPage2
    implements OnInit
{


    /* =========================================================
       SERVICES
    ========================================================= */

    private readonly subOrdinateComponentsService =
        inject(
            SubOrdinateComponentsService
        );

    private readonly changeDetectorRef =
        inject(
            ChangeDetectorRef
        );


    /* =========================================================
       BACKGROUND IMAGE 2
       ---------------------------------------------------------
       IMPORTANT:

       Background Image 2 = Sub Ordinate Component ID 2
    ========================================================= */

    lightBackgroundImageUrl:
        string =
        '';

    deepBackgroundImageUrl:
        string =
        '';

    private readonly backgroundImageComponentId:
        number =
        2;


    /* =========================================================
       API BASE URL
    ========================================================= */

    private readonly apiBaseUrl =
        environment.apiUrl
            .replace(
                /\/api\/?$/,
                ''
            );


    /* =========================================================
       NOTIFICATION PANEL
    ========================================================= */

    @ViewChild(
        LoginPageNotificationPanelComponent
    )
    private notificationPanel:
        LoginPageNotificationPanelComponent
        |
        undefined;


    /* =========================================================
       PAGE STATE
    ========================================================= */

    isRegistrationMode:
        boolean =
        false;

    isForgetPasswordMode:
        boolean =
        false;

    isLightTheme:
        boolean =
        true;


    /* =========================================================
       CURRENT BACKGROUND IMAGE
    ========================================================= */

    get currentBackgroundImageUrl():
        string
    {
        return this.isLightTheme
            ? this.lightBackgroundImageUrl
            : this.deepBackgroundImageUrl;
    }


    /* =========================================================
       INITIALIZATION
    ========================================================= */

    ngOnInit():
        void
    {
        this.loadBackgroundImages();
    }


    /* =========================================================
       LOAD BACKGROUND IMAGES
       ---------------------------------------------------------
       Source:

           Sub Ordinate Component ID = 2
    ========================================================= */

    private loadBackgroundImages():
        void
    {
        this.subOrdinateComponentsService
            .getById(
                this.backgroundImageComponentId
            )
            .subscribe(
            {
                next:
                    response =>
                    {
                        //=======================================
                        // LIGHT
                        //=======================================

                        this.lightBackgroundImageUrl =
                            this.buildImageUrl(
                                response.lightBackgroundImagePath
                            );


                        //=======================================
                        // DEEP
                        //=======================================

                        this.deepBackgroundImageUrl =
                            this.buildImageUrl(
                                response.deepBackgroundImagePath
                            );


                        //=======================================
                        // FORCE VIEW UPDATE
                        //=======================================

                        this.changeDetectorRef.detectChanges();
                    },

                error:
                    error =>
                    {
                        console.error(
                            'Failed to load Login Page 2 background images.',
                            error
                        );


                        this.lightBackgroundImageUrl =
                            '';

                        this.deepBackgroundImageUrl =
                            '';


                        this.changeDetectorRef.detectChanges();
                    }
            });
    }


    /* =========================================================
       BUILD IMAGE URL
       ---------------------------------------------------------
       SUPPORTED:

           http://
           https://
           data:
           blob:
           /uploads/...
           uploads/...
    ========================================================= */

    private buildImageUrl(
        imagePath:
            string
    ):
        string
    {
        if (!imagePath)
        {
            return '';
        }


        const value =
            imagePath.trim();


        if (!value)
        {
            return '';
        }


        /* -----------------------------------------------------
           ABSOLUTE URL
        ----------------------------------------------------- */

        if
        (
            value.startsWith('http://')
            ||
            value.startsWith('https://')
            ||
            value.startsWith('data:')
            ||
            value.startsWith('blob:')
        )
        {
            return value;
        }


        /* -----------------------------------------------------
           ROOT RELATIVE
        ----------------------------------------------------- */

        if
        (
            value.startsWith('/')
        )
        {
            return `${this.apiBaseUrl}${value}`;
        }


        /* -----------------------------------------------------
           RELATIVE
        ----------------------------------------------------- */

        return `${this.apiBaseUrl}/${value}`;
    }


    /* =========================================================
       THEME CHANGE
       ---------------------------------------------------------
       true:

           LIGHT

       false:

           DEEP
    ========================================================= */

    onThemeChange(
        isLightTheme:
            boolean
    ):
        void
    {
        this.isLightTheme =
            isLightTheme;


        this.changeDetectorRef.detectChanges();
    }


    /* =========================================================
       FORGOT PASSWORD
    ========================================================= */

    onForgotPassword():
        void
    {
        this.isRegistrationMode =
            false;

        this.isForgetPasswordMode =
            true;


        this.changeDetectorRef.detectChanges();
    }


    /* =========================================================
       PASSWORD RESET SUCCESS
    ========================================================= */

    onPasswordResetSuccess():
        void
    {
        this.onBackToLogin();


        if (!this.notificationPanel)
        {
            return;
        }


        this.notificationPanel.addNotification(
        {
            visible:
                true,

            isRead:
                false,

            heading:
                'Password Changed',

            message:
                'Your password was changed successfully. You can now sign in using your new password.',

            icon:
                'fas fa-key',

            type:
                'success',

            dismissible:
                true,

            autoHide:
                false,

            displayDuration:
                5000
        },
        5000
        );
    }


    /* =========================================================
       REGISTRATION
    ========================================================= */

    onRegister():
        void
    {
        this.isForgetPasswordMode =
            false;

        this.isRegistrationMode =
            true;


        this.changeDetectorRef.detectChanges();
    }


    /* =========================================================
       BACK TO LOGIN
    ========================================================= */

    onBackToLogin():
        void
    {
        this.isRegistrationMode =
            false;

        this.isForgetPasswordMode =
            false;


        this.changeDetectorRef.detectChanges();
    }

}