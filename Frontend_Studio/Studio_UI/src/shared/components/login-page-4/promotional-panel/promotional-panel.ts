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
// Promotional Feature
//===============================================================

export interface LoginPagePromotionalFeature
{
    //===========================================================
    // Visibility
    //===========================================================

    visible:
        boolean;


    //===========================================================
    // Icon
    //===========================================================

    icon:
        string;


    //===========================================================
    // Title
    //===========================================================

    title:
        string;


    //===========================================================
    // Description
    //===========================================================

    description:
        string;
}


//===============================================================
// Promotional Panel Configuration
//===============================================================

export interface LoginPagePromotionalPanelConfig
{
    //===========================================================
    // Visibility
    //===========================================================

    visible:
        boolean;


    //===========================================================
    // Eyebrow
    //===========================================================

    eyebrow:
        string;


    //===========================================================
    // Main Heading
    //===========================================================

    heading:
        string;


    //===========================================================
    // Highlighted Heading
    //===========================================================

    highlightedHeading:
        string;


    //===========================================================
    // Heading Suffix
    //===========================================================

    headingSuffix:
        string;


    //===========================================================
    // Description
    //===========================================================

    description:
        string;


    //===========================================================
    // Promotional Visual
    //===========================================================

    visualImageUrl:
        string;


    //===========================================================
    // Promotional Features
    //===========================================================

    features:
        LoginPagePromotionalFeature[];
}


//===============================================================
// Component
//===============================================================

@Component
({
    selector:
        'app-login-page-promotional-panel',

    standalone:
        true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './promotional-panel.html',

    styleUrl:
        './promotional-panel.css',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})


//===============================================================
// Login Page Promotional Panel Component
//===============================================================

export class LoginPagePromotionalPanelComponent
{

    //===========================================================
    // Input Configuration
    //===========================================================

    @Input()
    config:
        LoginPagePromotionalPanelConfig =
        {

            //===================================================
            // Visibility
            //===================================================

            visible:
                true,


            //===================================================
            // Eyebrow
            //===================================================

            eyebrow:
                'WELCOME TO APPCORE',


            //===================================================
            // Main Heading
            //===================================================

            heading:
                'One Platform',


            //===================================================
            // Highlighted Heading
            //===================================================

            highlightedHeading:
                'Infinite',


            //===================================================
            // Heading Suffix
            //===================================================

            headingSuffix:
                'Possibilities',


            //===================================================
            // Description
            //===================================================

            description:
                'Empowering businesses with intelligent tools to manage, comply and grow — today and tomorrow.',


            //===================================================
            // Promotional Visual
            //===================================================

            visualImageUrl:
                '/assets/promotional-panel/Promotional_Image.png',


            //===================================================
            // Promotional Features
            //===================================================

            features:
            [

                //=================================================
                // Feature 01
                //=================================================

                {
                    visible:
                        true,

                    icon:
                        'fas fa-layer-group',

                    title:
                        'Integrated ERP',

                    description:
                        'Everything your business needs in one platform'
                },


                //=================================================
                // Feature 02
                //=================================================

                {
                    visible:
                        true,

                    icon:
                        'fas fa-shield-halved',

                    title:
                        'Secure & Compliant',

                    description:
                        'Built with enterprise-grade security and compliance'
                },


                //=================================================
                // Feature 03
                //=================================================

                {
                    visible:
                        true,

                    icon:
                        'fas fa-chart-simple',

                    title:
                        'Scalable for Growth',

                    description:
                        'Designed to scale with your ambition'
                },


                //=================================================
                // Feature 04
                //=================================================

                {
                    visible:
                        true,

                    icon:
                        'fas fa-chart-line',

                    title:
                        'Real-Time Insights',

                    description:
                        'Make informed decisions with powerful real-time business intelligence'
                }

            ]
        };


    //===========================================================
    // Configuration Changed
    //===========================================================

    @Output()
    configChange:
        EventEmitter<LoginPagePromotionalPanelConfig> =
        new EventEmitter<LoginPagePromotionalPanelConfig>();


    //===========================================================
    // Update Configuration
    //===========================================================

    updateConfig
    (
        changes:
            Partial<LoginPagePromotionalPanelConfig>
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
    // Update Feature
    //===========================================================

    updateFeature
    (
        index:
            number,

        changes:
            Partial<LoginPagePromotionalFeature>
    ):
        void
    {
        if
        (
            index < 0
            ||
            index >= this.config.features.length
        )
        {
            return;
        }


        const features =
        [
            ...this.config.features
        ];


        features[index] =
        {
            ...features[index],

            ...changes
        };


        this.config =
        {
            ...this.config,

            features
        };


        this.configChange.emit(
            this.config
        );
    }


    //===========================================================
    // Visible Features
    //===========================================================

    get visibleFeatures():
        LoginPagePromotionalFeature[]
    {
        return this.config.features.filter
        (
            (
                feature:
                    LoginPagePromotionalFeature
            ) =>
                feature.visible
        );
    }

}