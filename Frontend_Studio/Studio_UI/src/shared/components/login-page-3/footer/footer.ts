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
// Footer Link
//===============================================================

export interface LoginPageFooterLink
{
    id:
        number;

    visible:
        boolean;

    label:
        string;

    url:
        string;

    openInNewTab:
        boolean;
}


//===============================================================
// Footer Configuration
//===============================================================

export interface LoginPageFooterConfig
{
    visible:
        boolean;

    copyrightVisible:
        boolean;

    copyrightText:
        string;

    linksVisible:
        boolean;

    links:
        LoginPageFooterLink[];

    separator:
        string;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'app-login-page-footer',

    standalone:
        true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './footer.html',

    styleUrl:
        './footer.css',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})


export class LoginPageFooterComponent
{

    //===========================================================
    // Configuration
    //===========================================================

    @Input()
    config:
        LoginPageFooterConfig =
        {
            visible:
                true,

            copyrightVisible:
                true,

            copyrightText:
                '© 2026 AppCore Technologies. All rights reserved.',

            linksVisible:
                true,

            links:
            [
                {
                    id:
                        1,

                    visible:
                        true,

                    label:
                        'Privacy Policy',

                    url:
                        '#',

                    openInNewTab:
                        false
                },

                {
                    id:
                        2,

                    visible:
                        true,

                    label:
                        'Terms of Use',

                    url:
                        '#',

                    openInNewTab:
                        false
                },

                {
                    id:
                        3,

                    visible:
                        true,

                    label:
                        'Contact Support',

                    url:
                        '#',

                    openInNewTab:
                        false
                }
            ],

            separator:
                '|'
        };


    //===========================================================
    // Configuration Change Event
    //===========================================================

    @Output()
    configChange:
        EventEmitter<LoginPageFooterConfig> =
        new EventEmitter<LoginPageFooterConfig>();


    //===========================================================
    // Update Configuration
    //===========================================================

    updateConfig
    (
        changes:
            Partial<LoginPageFooterConfig>
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
    // Update Link
    //===========================================================

    updateLink
    (
        index:
            number,

        changes:
            Partial<LoginPageFooterLink>
    ):
        void
    {
        if
        (
            index < 0
            ||
            index >= this.config.links.length
        )
        {
            return;
        }


        const links =
            this.config.links.map(
                (
                    link:
                        LoginPageFooterLink,

                    linkIndex:
                        number
                ) =>
                {
                    if
                    (
                        linkIndex !== index
                    )
                    {
                        return link;
                    }


                    return {
                        ...link,
                        ...changes
                    };
                }
            );


        this.config =
        {
            ...this.config,

            links:
                links
        };


        this.configChange.emit(
            this.config
        );
    }


    //===========================================================
    // Visible Links
    //===========================================================

    get visibleLinks():
        LoginPageFooterLink[]
    {
        return this.config.links.filter(
            (
                link:
                    LoginPageFooterLink
            ) =>
                link.visible
                &&
                !!link.label
                &&
                link.label.trim().length > 0
        );
    }


    //===========================================================
    // Has Visible Links
    //===========================================================

    get hasVisibleLinks():
        boolean
    {
        return this.visibleLinks.length > 0;
    }


    //===========================================================
    // Track Link
    //===========================================================

    trackLink
    (
        index:
            number,

        link:
            LoginPageFooterLink
    ):
        string
    {
        return `${link.id}-${index}`;
    }

}