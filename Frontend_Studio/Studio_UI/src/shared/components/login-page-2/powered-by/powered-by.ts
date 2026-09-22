//===============================================================
// Imports
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
// Login Page Powered By Hover Effect
//===============================================================

export type LoginPagePoweredByHoverEffect =
    | 'none'
    | 'jump'
    | 'rotate'
    | 'rotate-jump';


//===============================================================
// Login Page Powered By Logo
//===============================================================

export interface LoginPagePoweredByLogo
{
    id:
        number;

    visible:
        boolean;

    logoUrl:
        string;

    altText:
        string;

    width:
        number;

    height:
        number | 'auto';

    hoverEffect:
        LoginPagePoweredByHoverEffect;

    hoverIntensity:
        number;

    hoverDuration:
        number;
}


//===============================================================
// Login Page Powered By Configuration
//===============================================================

export interface LoginPagePoweredByConfig
{
    visible:
        boolean;

    heading:
        string;

    logos:
        LoginPagePoweredByLogo[];
}


//===============================================================
// Login Page Powered By Component
//===============================================================

@Component
({
    selector:
        'app-login-page-powered-by',

    standalone:
        true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './powered-by.html',

    styleUrl:
        './powered-by.css',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})


//===============================================================
// Login Page Powered By
//===============================================================

export class LoginPagePoweredByComponent
{
    //===============================================================
    // Configuration
    //===============================================================

    @Input()
    config:
        LoginPagePoweredByConfig =
        {
            visible:
                true,

            heading:
                'Powered by',

            logos:
            [
                //===================================================
                // Logo 1
                //===================================================

                {
                    id:
                        1,

                    visible:
                        true,

                    logoUrl:
                        '/assets/powered-by/logo_1.png',

                    altText:
                        'Powered By Logo 1',

                    width:
                        150,

                    height:
                        'auto',

                    hoverEffect:
                        'jump',

                    hoverIntensity:
                        8,

                    hoverDuration:
                        450
                },


                //===================================================
                // Logo 2
                //===================================================

                {
                    id:
                        2,

                    visible:
                        true,

                    logoUrl:
                        '/assets/powered-by/logo_2.png',

                    altText:
                        'Powered By Logo 2',

                    width:
                        150,

                    height:
                        'auto',

                    hoverEffect:
                        'rotate',

                    hoverIntensity:
                        12,

                    hoverDuration:
                        450
                },


                //===================================================
                // Logo 3
                //===================================================

                {
                    id:
                        3,

                    visible:
                        true,

                    logoUrl:
                        '/assets/powered-by/logo_3.png',

                    altText:
                        'Powered By Logo 3',

                    width:
                        150,

                    height:
                        'auto',

                    hoverEffect:
                        'rotate-jump',

                    hoverIntensity:
                        8,

                    hoverDuration:
                        450
                },


                //===================================================
                // Logo 4
                //===================================================

                {
                    id:
                        4,

                    visible:
                        true,

                    logoUrl:
                        '/assets/powered-by/logo_4.png',

                    altText:
                        'Powered By Logo 4',

                    width:
                        150,

                    height:
                        'auto',

                    hoverEffect:
                        'jump',

                    hoverIntensity:
                        8,

                    hoverDuration:
                        450
                },


                //===================================================
                // Logo 5
                //===================================================

                {
                    id:
                        5,

                    visible:
                        true,

                    logoUrl:
                        '/assets/powered-by/logo_5.png',

                    altText:
                        'Powered By Logo 5',

                    width:
                        150,

                    height:
                        'auto',

                    hoverEffect:
                        'rotate',

                    hoverIntensity:
                        12,

                    hoverDuration:
                        450
                },


                //===================================================
                // Logo 6
                //===================================================

                {
                    id:
                        6,

                    visible:
                        true,

                    logoUrl:
                        '/assets/powered-by/logo_6.png',

                    altText:
                        'Powered By Logo 6',

                    width:
                        150,

                    height:
                        'auto',

                    hoverEffect:
                        'rotate-jump',

                    hoverIntensity:
                        8,

                    hoverDuration:
                        450
                }
            ]
        };


    //===============================================================
    // Configuration Change Event
    //===============================================================

    @Output()
    configChange:
        EventEmitter<LoginPagePoweredByConfig> =
        new EventEmitter<LoginPagePoweredByConfig>();


    //===============================================================
    // Update Main Configuration
    //===============================================================

    updateConfig
    (
        changes:
            Partial<LoginPagePoweredByConfig>
    ):
        void
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


    //===============================================================
    // Update Individual Logo
    //===============================================================

    updateLogo
    (
        index:
            number,

        changes:
            Partial<LoginPagePoweredByLogo>
    ):
        void
    {
        if
        (
            index < 0
            ||
            index >= this.config.logos.length
        )
        {
            return;
        }


        const logos:
            LoginPagePoweredByLogo[] =
            this.config.logos.map
            (
                (
                    logo,
                    logoIndex
                ) =>
                    logoIndex === index
                        ?
                        {
                            ...logo,
                            ...changes
                        }
                        :
                        logo
            );


        this.config =
        {
            ...this.config,
            logos
        };


        this.configChange.emit(
            this.config
        );
    }


    //===============================================================
    // Visible Logos
    //===============================================================

    get visibleLogos():
        LoginPagePoweredByLogo[]
    {
        return this.config.logos.filter
        (
            logo =>
                logo.visible
                &&
                !!logo.logoUrl
                &&
                logo.logoUrl.trim().length > 0
        );
    }


    //===============================================================
    // Has Renderable Logos
    //===============================================================

    get hasRenderableLogos():
        boolean
    {
        return this.visibleLogos.length > 0;
    }


    //===============================================================
    // Logo Hover Class
    //===============================================================

    getLogoSlotClass
    (
        logo:
            LoginPagePoweredByLogo
    ):
        string
    {
        return `powered-by-hover-${logo.hoverEffect}`;
    }


    //===============================================================
    // Logo Style
    //===============================================================

    getLogoStyle
    (
        logo:
            LoginPagePoweredByLogo
    ):
        Record<string, string>
    {
        return {
            width:
                `${logo.width}px`,

            height:
                logo.height === 'auto'
                    ?
                    'auto'
                    :
                    `${logo.height}px`,

            '--hover-intensity':
                `${logo.hoverIntensity}px`,

            '--hover-duration':
                `${logo.hoverDuration}ms`
        };
    }
}