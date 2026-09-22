//===============================================================
// LOGIN PAGE — CLIENT LOGO
//===============================================================
//
// Premium Client Identity Display
//
// This component owns ONLY the visual client-logo area.
//
// It does NOT contain:
// - Client management logic
// - API calls
// - Client selection logic
// - Carousel logic
// - Login logic
// - Page composition
//
//===============================================================


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
// Client Logo Configuration
//===============================================================

export interface LoginPageClientLogoConfig
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
    // Client Name
    //===========================================================

    clientName:
        string;


    //===========================================================
    // Logo Width
    //===========================================================

    logoWidth:
        number;


    //===========================================================
    // Logo Height
    //===========================================================

    logoHeight:
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
        'contain'
        |
        'cover'
        |
        'fill'
        |
        'none'
        |
        'scale-down';
}


//===============================================================
// Component
//===============================================================

@Component
({
    selector:
        'app-login-page-client-logo',

    standalone:
        true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './client-logo.html',

    styleUrl:
        './client-logo.css',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})


//===============================================================
// Login Page Client Logo Component
//===============================================================

export class LoginPageClientLogoComponent
{

    //===========================================================
    // Input Configuration
    //===========================================================

    @Input()
    config:
        LoginPageClientLogoConfig =
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
                '/assets/client-logo/MotoZone.png',


            //===================================================
            // Client Name
            //===================================================

            clientName:
                'Moto Zone',


            //===================================================
            // Logo Width
            //===================================================

            logoWidth:
                180,


            //===================================================
            // Logo Height
            //===================================================

            logoHeight:
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
        EventEmitter<LoginPageClientLogoConfig> =
        new EventEmitter<LoginPageClientLogoConfig>();


    //===========================================================
    // Logo Style
    //===========================================================

    get logoStyle():
        Record<string, string>
    {
        return {
            width:
                `${this.config.logoWidth}px`,

            height:
                this.config.logoHeight === 'auto'
                    ?
                'auto'
                    :
                `${this.config.logoHeight}px`,

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
            Partial<LoginPageClientLogoConfig>
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