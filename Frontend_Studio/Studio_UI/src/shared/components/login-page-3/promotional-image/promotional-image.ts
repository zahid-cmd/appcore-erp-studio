//===============================================================
// Login Page 1 — Promotional Image
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


/* ===============================================================
   PROMOTIONAL IMAGE CONFIGURATION
================================================================ */

export interface LoginPagePromotionalImageConfig
{
    visible:boolean;

    imageUrl:string;

    altText:string;

    width:number|'auto';

    height:number|'auto';

    opacity:number;

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

    objectPosition:string;
}


/* ===============================================================
   COMPONENT
================================================================ */

@Component
({
    selector:
        'app-login-page-promotional-image',

    standalone:
        true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './promotional-image.html',

    styleUrl:
        './promotional-image.css',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})
export class LoginPagePromotionalImageComponent
{
    /* ===========================================================
       CONFIGURATION
    ============================================================ */

    @Input()
    config:
        LoginPagePromotionalImageConfig =
    {
        visible:
            true,

        imageUrl:
            '/assets/promotional-panel/Promotional_Image.png',

        altText:
            'AppCore Technologies',

        width:
            'auto',

        height:
            'auto',

        opacity:
            1,

        objectFit:
            'contain',

        objectPosition:
            'center'
    };


    /* ===========================================================
       CONFIGURATION CHANGE EVENT
    ============================================================ */

    @Output()
    configChange:
        EventEmitter<LoginPagePromotionalImageConfig> =
        new EventEmitter<LoginPagePromotionalImageConfig>();


        /* ===========================================================
        IMAGE STYLE
        -----------------------------------------------------------
        IMPORTANT:

            Width and Height are intentionally NOT included here.

            Promotional Image size is controlled exclusively by
            promotional-image.css.

            CSS master controls:

                --promotional-image-width
                --promotional-image-height

            This prevents Angular inline styles from overriding
            the CSS size controls.
        =========================================================== */

        get imageStyle():Record<string,string>
        {
            return {
                opacity:
                    String(
                        this.config.opacity
                    ),

                'object-fit':
                    this.config.objectFit,

                'object-position':
                    this.config.objectPosition
            };
        }


    /* ===========================================================
       UPDATE CONFIGURATION
    ============================================================ */

    updateConfig(
        changes:
            Partial<LoginPagePromotionalImageConfig>
    ):void
    {
        this.config =
        {
            ...this.config,
            ...changes
        };

        this.configChange.emit(
            this.config
        );
    }
}