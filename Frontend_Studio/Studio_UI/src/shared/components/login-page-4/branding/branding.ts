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
// Branding Configuration
//===============================================================

export interface LoginPageBrandingConfig
{
    //===========================================================
    // Visibility
    //===========================================================

    visible:
        boolean;


    //===========================================================
    // Logo
    //===========================================================

    logoUrl:
        string;


    //===========================================================
    // Logo Size
    //===========================================================

    width:
        number;

    height:
        number | 'auto';


    //===========================================================
    // Logo Appearance
    //===========================================================

    opacity:
        number;


    //===========================================================
    // Logo Fit
    //===========================================================

    objectFit:
        'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'app-login-page-branding',

    standalone:
        true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './branding.html',

    styleUrl:
        './branding.css',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})


//===============================================================
// Login Page Branding Component
//===============================================================

export class LoginPageBrandingComponent
{

    //===========================================================
    // Input Configuration
    //===========================================================

    @Input()
    config:
        LoginPageBrandingConfig =
        {
            //===================================================
            // Visibility
            //===================================================

            visible:
                true,


            //===================================================
            // Logo
            //===================================================

            logoUrl:
                '/assets/branding.png',


            //===================================================
            // Logo Size
            //===================================================

            width:
                300,

            height:
                'auto',


            //===================================================
            // Logo Appearance
            //===================================================

            opacity:
                1,


            //===================================================
            // Logo Fit
            //===================================================

            objectFit:
                'contain'
        };


    //===========================================================
    // Configuration Changed
    //===========================================================

    @Output()
    configChange:
        EventEmitter<LoginPageBrandingConfig> =
        new EventEmitter<LoginPageBrandingConfig>();


    //===========================================================
    // Branding Width Multiplier
    //===========================================================

    private readonly brandingWidthMultiplier:
        number =
        2;


    //===========================================================
    // Logo Style
    //===========================================================

    get logoStyle():
        Record<string, string>
    {
        const displayWidth:
            number =
            this.config.width *
            this.brandingWidthMultiplier;

        return {
            width:
                `${displayWidth}px`,

            height:
                this.config.height === 'auto'
                    ? 'auto'
                    : `${this.config.height}px`,

            opacity:
                String(
                    this.config.opacity
                ),

            'object-fit':
                this.config.objectFit
        };
    }


    //===========================================================
    // Update Configuration
    //===========================================================

    updateConfig
    (
        changes:
            Partial<LoginPageBrandingConfig>
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

}