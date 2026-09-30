/* =============================================================
   LOGIN PAGE 1
   -------------------------------------------------------------
   PAGE RESPONSIBILITIES:

       - Login / Registration / Forget Password mode
       - Theme state
       - Background Image 1
       - Branding
       - Powered By
       - Notification Panel

   AUTHENTICATION:

       Completely owned by the Central Login Panel.

   BACKGROUND:

       Loaded from:

           Sub Ordinate Component ID = 1

       Light:

           lightBackgroundImageUrl

       Deep:

           deepBackgroundImageUrl

       Current:

           currentBackgroundImageUrl

   CHANGE DETECTION:

       Login Page 1 uses Angular's Default change-detection
       strategy.

       Background images are loaded asynchronously.

       ChangeDetectorRef.detectChanges() is explicitly called
       after the image URLs are assigned so the background
       renders reliably after browser refresh and theme changes.
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

import
{
    environment
}
from '../../../environments/environment';

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
   LOGIN CREDENTIAL COMPONENTS
============================================================= */

import
{
    LoginPageLoginPanelComponent
}
from '../../components/login-credentials/login-panel/login-panel';

import
{
    LoginPageRegistrationPanelComponent
}
from '../../components/login-credentials/registration-panel/registration-panel';

import
{
    LoginPageForgetPasswordPanelComponent
}
from '../../components/login-credentials/forget-password/forget-password';

import
{
    LoginPageNotificationPanelComponent
}
from '../../components/login-credentials/notification-panel/notification-panel';


/* =============================================================
   COMPONENT
============================================================= */

@Component
({
    selector:
        'app-login-page-1',

    standalone:
        true,

    imports:
    [
        CommonModule,

        /* -----------------------------------------------------
           CORE COMPONENTS
        ----------------------------------------------------- */

        LoginPageBrandingComponent,

        LoginPagePoweredByComponent,

        LoginPageThemeSelectorComponent,


        /* -----------------------------------------------------
           LOGIN CREDENTIAL COMPONENTS
        ----------------------------------------------------- */

        LoginPageLoginPanelComponent,

        LoginPageRegistrationPanelComponent,

        LoginPageForgetPasswordPanelComponent,

        LoginPageNotificationPanelComponent
    ],

    templateUrl:
        './login-page-1.html',

    styleUrls:
    [
        './login-page-1.css'
    ],

    /*
     * IMPORTANT:
     *
     * Login Page 1 intentionally uses Angular's Default
     * change-detection strategy.
     *
     * Do NOT change this to OnPush.
     */
    changeDetection:
        ChangeDetectionStrategy.Default
})
export class LoginPage1
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
       BACKGROUND IMAGE 1
       ---------------------------------------------------------
       Sub Ordinate Component ID:

           1
    ========================================================= */

    lightBackgroundImageUrl:
        string =
        '';

    deepBackgroundImageUrl:
        string =
        '';

    private readonly backgroundImageComponentId:
        number =
        1;


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
       ---------------------------------------------------------
       LIGHT:

           lightBackgroundImageUrl

       DEEP:

           deepBackgroundImageUrl
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

           Sub Ordinate Component ID = 1
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
                        /* -------------------------------------
                           LIGHT BACKGROUND
                        ------------------------------------- */

                        this.lightBackgroundImageUrl =
                            this.buildImageUrl(
                                response.lightBackgroundImagePath
                            );


                        /* -------------------------------------
                           DEEP BACKGROUND
                        ------------------------------------- */

                        this.deepBackgroundImageUrl =
                            this.buildImageUrl(
                                response.deepBackgroundImagePath
                            );


                        /* -------------------------------------
                           FORCE VIEW UPDATE
                        ------------------------------------- */

                        this.changeDetectorRef.detectChanges();
                    },

                error:
                    error =>
                    {
                        console.error(
                            'Failed to load Login Page 1 background images.',
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
           ROOT-RELATIVE PATH
        ----------------------------------------------------- */

        if (
            value.startsWith('/')
        )
        {
            return `${this.apiBaseUrl}${value}`;
        }


        /* -----------------------------------------------------
           RELATIVE PATH
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


        /*
         * Immediately refresh the background binding.
         */
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