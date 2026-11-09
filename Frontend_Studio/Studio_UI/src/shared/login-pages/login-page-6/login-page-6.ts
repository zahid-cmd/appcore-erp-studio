/* =============================================================
   LOGIN PAGE 6
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

       Login Page 6 uses Angular's Default change-detection
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
    HostListener,
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
    HttpClient
}
from '@angular/common/http';


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
    LoginPagePoweredByComponent,
    LoginPagePoweredByConfig
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
   IMPORTANT:

       Login Panel is now located under:

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
        'app-login-page-6',

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
        './login-page-6.html',

    styleUrls:
    [
        './login-page-6.css'
    ],

    changeDetection:
        ChangeDetectionStrategy.Default
})


/* =============================================================
   LOGIN PAGE 6
============================================================= */

export class LoginPage6
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


    private readonly http =
        inject(
            HttpClient
        );


    /* =========================================================
       POWERED BY : BRAND LOGOS FROM BRAND MANAGEMENT
       ---------------------------------------------------------
       Source:
           GET api/public/website  (anonymous)
           brands = active brands used by an active product
                    category, with their Brand Management image
       Up to 6 logos, by Brand Code. With no brand logo (or
       when the call fails) the component's own default logos
       are shown.
    ========================================================= */

    poweredByConfig:
        LoginPagePoweredByConfig
        |
        null =
        null;

    poweredByChecked:
        boolean =
        false;


    /* =========================================================
       BACKGROUND IMAGE 1
       ---------------------------------------------------------
       IMPORTANT:

       Background Image 1 = Sub Ordinate Component ID 1
    ========================================================= */

    lightBackgroundImageUrl:
        string =
        '';

    deepBackgroundImageUrl:
        string =
        '';

    // Background Image 6 = Sub Ordinate Component ID 6.
    // Until that record exists (or when it has no image), the
    // images of Background Image 1 are used.
    private readonly backgroundImageComponentId:
        number =
        6;

    private readonly fallbackBackgroundImageComponentId:
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
        false;


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

        this.loadBrandLogos();
    }


    /* =========================================================
       LOAD BRAND LOGOS (Powered By)
    ========================================================= */

    private loadBrandLogos():
        void
    {
        this.http
            .get<any>(
                `${environment.apiUrl}/public/website`
            )
            .subscribe(
            {
                next:
                    response =>
                    {
                        const brands:
                            any[] =
                            Array.isArray(response?.brands)
                                ? response.brands
                                : [];

                        const logos =
                            brands
                                .map(
                                    brand =>
                                    ({
                                        name:
                                            String(brand?.name ?? '').trim(),
                                        url:
                                            this.buildImageUrl(
                                                String(brand?.logoPath ?? '')
                                            )
                                    })
                                )
                                .filter(
                                    brand =>
                                        brand.url.length > 0
                                )
                                .slice(
                                    0,
                                    6
                                )
                                .map(
                                    (brand, index) =>
                                    ({
                                        id:
                                            index + 1,
                                        visible:
                                            true,
                                        logoUrl:
                                            brand.url,
                                        altText:
                                            brand.name || `Brand ${index + 1}`,
                                        width:
                                            150,
                                        height:
                                            'auto' as const,
                                        hoverEffect:
                                            'jump' as const,
                                        hoverIntensity:
                                            8,
                                        hoverDuration:
                                            450
                                    })
                                );

                        this.poweredByConfig =
                            logos.length > 0
                                ?
                                {
                                    visible:
                                        true,
                                    heading:
                                        'Powered by',
                                    logos
                                }
                                : null;

                        this.poweredByChecked =
                            true;

                        this.changeDetectorRef.detectChanges();
                    },

                error:
                    () =>
                    {
                        this.poweredByConfig =
                            null;

                        this.poweredByChecked =
                            true;

                        this.changeDetectorRef.detectChanges();
                    }
            });
    }


    /* =========================================================
       LOAD BACKGROUND IMAGES
       ---------------------------------------------------------
       Source:

           Sub Ordinate Component ID = 6 (Background Image 6),
           falling back to ID 1
    ========================================================= */

    private loadBackgroundImages(
        componentId:
            number =
            this.backgroundImageComponentId
    ):
        void
    {
        this.subOrdinateComponentsService
            .getByInternalId(
                componentId
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
                        // NO IMAGE YET : use Background Image 1
                        //=======================================

                        if
                        (
                            !this.lightBackgroundImageUrl
                            &&
                            !this.deepBackgroundImageUrl
                            &&
                            componentId !== this.fallbackBackgroundImageComponentId
                        )
                        {
                            this.loadBackgroundImages(
                                this.fallbackBackgroundImageComponentId
                            );

                            return;
                        }


                        //=======================================
                        // FORCE VIEW UPDATE
                        //=======================================

                        this.changeDetectorRef.detectChanges();
                    },

                error:
                    error =>
                    {
                        //=======================================
                        // NOT FOUND YET : use Background Image 1
                        //=======================================

                        if
                        (
                            componentId !== this.fallbackBackgroundImageComponentId
                        )
                        {
                            this.loadBackgroundImages(
                                this.fallbackBackgroundImageComponentId
                            );

                            return;
                        }

                        console.error(
                            'Failed to load Login Page 6 background images.',
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

        // Opens centred every time
        this.registrationOffsetX =
            0;

        this.registrationOffsetY =
            0;

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

        // Opens centred every time
        this.registrationOffsetX =
            0;

        this.registrationOffsetY =
            0;


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



    /* =========================================================
       POP-UP (Registration / Forgot Password) : MOVE
       (drag by its top bar)
       ---------------------------------------------------------
       The pop-up is moved with left / top offsets, never a
       transform, so the registration panel's own success
       dialog (position: fixed) stays centred on the screen.
       It always keeps at least 80px on screen.
    ========================================================= */

    registrationOffsetX:
        number =
        0;

    registrationOffsetY:
        number =
        0;

    isDraggingRegistration:
        boolean =
        false;

    private dragStartX =
        0;

    private dragStartY =
        0;

    onRegistrationDragStart(
        event:
            PointerEvent
    ):
        void
    {
        const target =
            event.target as HTMLElement | null;

        if
        (
            event.button !== 0
            ||
            target?.closest('button')
        )
        {
            return;
        }

        event.preventDefault();

        this.isDraggingRegistration =
            true;

        this.dragStartX =
            event.clientX - this.registrationOffsetX;

        this.dragStartY =
            event.clientY - this.registrationOffsetY;
    }

    @HostListener(
        'document:pointermove',
        ['$event']
    )
    onRegistrationDragMove(
        event:
            PointerEvent
    ):
        void
    {
        if (!this.isDraggingRegistration)
        {
            return;
        }

        const limitX =
            Math.max(0, window.innerWidth / 2 - 80);

        const limitY =
            Math.max(0, window.innerHeight / 2 - 80);

        this.registrationOffsetX =
            Math.max(-limitX, Math.min(limitX, event.clientX - this.dragStartX));

        this.registrationOffsetY =
            Math.max(-limitY, Math.min(limitY, event.clientY - this.dragStartY));

        this.changeDetectorRef.detectChanges();
    }

    @HostListener(
        'document:pointerup'
    )
    onRegistrationDragEnd():
        void
    {
        this.isDraggingRegistration =
            false;
    }

    // Esc closes the pop-up (registration or forgot password)
    @HostListener(
        'document:keydown.escape'
    )
    onRegistrationEscape():
        void
    {
        if
        (
            this.isRegistrationMode
            ||
            this.isForgetPasswordMode
        )
        {
            this.onBackToLogin();
        }
    }
}
