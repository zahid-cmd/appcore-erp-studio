//===============================================================
// LOGIN PAGE — BACKGROUND
//===============================================================
//
// Premium Orbital Flow Background
//
// Visual language:
// - White
// - Light blue
// - AppCore blue
// - Cool grey
// - Restrained orange
//
// This component owns ONLY the visual background.
// It does NOT contain:
// - Logo
// - Promotional content
// - Login form
// - Registration
// - Footer
// - Page composition
//
//===============================================================


//===============================================================
// Imports
//===============================================================

import
{
    CommonModule
}
from '@angular/common';

import
{
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output
}
from '@angular/core';


//===============================================================
// Background Types
//===============================================================

export type LoginPageBackgroundType =
    | 'solid'
    | 'gradient'
    | 'image'
    | 'image-overlay';


export type LoginPageBackgroundSize =
    | 'cover'
    | 'contain'
    | 'auto';


export type LoginPageBackgroundPosition =
    | 'center'
    | 'center center'
    | 'center top'
    | 'center bottom'
    | 'left center'
    | 'right center'
    | 'left top'
    | 'right top'
    | 'left bottom'
    | 'right bottom';


//===============================================================
// Background Configuration
//===============================================================

export interface LoginPageBackgroundConfig
{
    type:
        LoginPageBackgroundType;

    primaryColor:
        string;

    secondaryColor:
        string;

    gradientDirection:
        string;

    imageUrl:
        string;

    imagePosition:
        LoginPageBackgroundPosition;

    imageSize:
        LoginPageBackgroundSize;

    overlayEnabled:
        boolean;

    overlayColor:
        string;

    overlayOpacity:
        number;

    decorativeElementsEnabled:
        boolean;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'app-login-page-background',

    standalone:
        true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './background.html',

    styleUrl:
        './background.css',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})


export class LoginPageBackgroundComponent
{

    //===========================================================
    // Configuration
    //===========================================================

    @Input()
    config:
        LoginPageBackgroundConfig =
        {
            type:
                'gradient',

            primaryColor:
                '#FFFFFF',

            secondaryColor:
                '#EEF5FF',

            gradientDirection:
                'to right',

            imageUrl:
                '',

            imagePosition:
                'center',

            imageSize:
                'cover',

            overlayEnabled:
                false,

            overlayColor:
                '#FFFFFF',

            overlayOpacity:
                0,

            decorativeElementsEnabled:
                true
        };


    //===========================================================
    // Configuration Change
    //===========================================================

    @Output()
    configChange =
        new EventEmitter<
            LoginPageBackgroundConfig
        >();


    //===========================================================
    // Background Value
    //===========================================================

    get backgroundValue():
        string
    {
        switch
        (
            this.config.type
        )
        {
            case 'solid':

                return this.config.primaryColor;


            case 'gradient':

                return this.buildGradient();


            case 'image':
            case 'image-overlay':

                return this.buildImageBackground();


            default:

                return this.config.primaryColor;
        }
    }


    //===========================================================
    // Overlay Value
    //===========================================================

    get overlayValue():
        string
    {
        if
        (
            !this.config.overlayEnabled
        )
        {
            return 'transparent';
        }


        return this.hexToRgba(
            this.config.overlayColor,
            this.config.overlayOpacity
        );
    }


    //===========================================================
    // Image Style
    //===========================================================

    get imageStyle():
        Record<string, string>
    {
        return {
            'background-image':
                this.config.imageUrl
                    ? `url("${this.config.imageUrl}")`
                    : 'none',

            'background-position':
                this.config.imagePosition,

            'background-size':
                this.config.imageSize,

            'background-repeat':
                'no-repeat'
        };
    }


    //===========================================================
    // Update Configuration
    //===========================================================

    updateConfig
    (
        changes:
            Partial<
                LoginPageBackgroundConfig
            >
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


    //===========================================================
    // Build Gradient
    //===========================================================

    private buildGradient():
        string
    {
        return `
            linear-gradient(
                ${this.config.gradientDirection},
                ${this.config.primaryColor},
                ${this.config.secondaryColor}
            )
        `;
    }


    //===========================================================
    // Build Image Background
    //===========================================================

    private buildImageBackground():
        string
    {
        if
        (
            !this.config.imageUrl
        )
        {
            return this.config.primaryColor;
        }


        return `
            url("${this.config.imageUrl}")
        `;
    }


    //===========================================================
    // Hex To RGBA
    //===========================================================

    private hexToRgba
    (
        color:
            string,

        opacity:
            number
    ):
        string
    {
        const normalized =
            color.replace(
                '#',
                ''
            );


        if
        (
            normalized.length !== 6 &&
            normalized.length !== 3
        )
        {
            return color;
        }


        const hex =
            normalized.length === 3
                ?
            normalized
                .split('')
                .map(
                    value =>
                        value + value
                )
                .join('')
                :
            normalized;


        const red =
            parseInt(
                hex.substring(
                    0,
                    2
                ),
                16
            );


        const green =
            parseInt(
                hex.substring(
                    2,
                    4
                ),
                16
            );


        const blue =
            parseInt(
                hex.substring(
                    4,
                    6
                ),
                16
            );


        const safeOpacity =
            Math.max(
                0,
                Math.min(
                    1,
                    opacity
                )
            );


        return `
            rgba(
                ${red},
                ${green},
                ${blue},
                ${safeOpacity}
            )
        `;
    }

}