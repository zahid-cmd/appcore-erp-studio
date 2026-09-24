//===============================================================
// Login Page 2 — Promotional Image Light
//===============================================================

import
{
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';


//===============================================================
// PROMOTIONAL IMAGE LIGHT CONFIGURATION
//===============================================================

export interface LoginPagePromotionalImageLightConfig
{
    visible:
        boolean;

    imageUrl:
        string;

    altText:
        string;

    width:
        number
        |
        'auto';

    height:
        number
        |
        'auto';

    opacity:
        number;

    objectFit:
        'contain'
        |
        'cover'
        |
        'fill'
        |
        'none'
        |
        'scale-down';

    objectPosition:
        string;
}


//===============================================================
// COMPONENT
//===============================================================

@Component
({
    selector:
        'app-login-page-promotional-image-light',

    standalone:
        true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './promotional-image-light.html',

    styleUrl:
        './promotional-image-light.css',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})
export class LoginPagePromotionalImageLightComponent
{
    /* ===========================================================
       CONFIGURATION
    ============================================================ */

    @Input()
    config:
        LoginPagePromotionalImageLightConfig =
    {
        visible:
            true,

        imageUrl:
            '/assets/promotional-panel/Promo_Image2_Light.png',

        altText:
            'AppCore Technologies',

        width:
            'auto',

        height:
            'auto',

        opacity:
            1,

        objectFit:
            'cover',

        objectPosition:
            'center center'
    };


    /* ===========================================================
       CONFIGURATION CHANGE EVENT
    ============================================================ */

    @Output()
    configChange:
        EventEmitter<LoginPagePromotionalImageLightConfig> =
        new EventEmitter<LoginPagePromotionalImageLightConfig>();


    /* ===========================================================
       IMAGE STYLE
       -----------------------------------------------------------
       IMPORTANT:

           Width and Height are intentionally NOT included here.

           Promotional Image Light size is controlled exclusively
           by promotional-image-light.css.

           Object Fit and Object Position are ALSO intentionally
           NOT included here.

           CSS master controls:

               width
               height
               object-fit
               object-position

           This prevents Angular inline styles from overriding
           the CSS master controls.

           Opacity remains configurable through the component
           configuration.
    ============================================================ */

    get imageStyle():
        Record<string,string>
    {
        return {
            opacity:
                String
                (
                    this.config.opacity
                )
        };
    }


    /* ===========================================================
       UPDATE CONFIGURATION
    ============================================================ */

    updateConfig
    (
        changes:
            Partial<LoginPagePromotionalImageLightConfig>
    ):
        void
    {
        this.config =
        {
            ...this.config,
            ...changes
        };

        this.configChange.emit
        (
            this.config
        );
    }
}