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
    Component,
    Input
}
from '@angular/core';


//===============================================================
// Quick Access Item
//===============================================================

interface QuickAccessItem
{
    title:
        string;

    subtitle:
        string;

    icon:
        string;

    iconClass:
        string;

    badge:
        string;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'app-quick-access-widget',

    standalone:
        true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './quick-access-widget.html',

    styleUrl:
        './quick-access-widget.css'
})


//===============================================================
// Quick Access Widget
//===============================================================

export class QuickAccessWidgetComponent
{

    //===========================================================
    // Preview Mode
    //===========================================================

    @Input()
    previewMode:
        boolean =
        false;


    //===========================================================
    // Widget Title
    //===========================================================

    widgetTitle:
        string =
        'Quick Access';


    //===========================================================
    // Widget Subtitle
    //===========================================================

    widgetSubtitle:
        string =
        'Jump directly to your frequently used modules';


    //===========================================================
    // Quick Access Items
    //===========================================================

    quickAccessItems:
        QuickAccessItem[]
    =
    [

        {
            title:
                'Accounts',

            subtitle:
                '& Finance',

            icon:
                'fas fa-wallet',

            iconClass:
                'accounts',

            badge:
                '01'
        },


        {
            title:
                'Sales',

            subtitle:
                'Management',

            icon:
                'fas fa-chart-line',

            iconClass:
                'sales',

            badge:
                '02'
        },


        {
            title:
                'Reports',

            subtitle:
                'Analytics',

            icon:
                'fas fa-chart-pie',

            iconClass:
                'reports',

            badge:
                '03'
        },


        {
            title:
                'Settings',

            subtitle:
                'Configuration',

            icon:
                'fas fa-sliders',

            iconClass:
                'settings',

            badge:
                '04'
        },


        {
            title:
                'Human',

            subtitle:
                'Resources',

            icon:
                'fas fa-users',

            iconClass:
                'hr',

            badge:
                '05'
        },


        {
            title:
                'Procurement',

            subtitle:
                'Purchasing',

            icon:
                'fas fa-cart-shopping',

            iconClass:
                'procurement',

            badge:
                '06'
        },


        {
            title:
                'Inventory',

            subtitle:
                'Management',

            icon:
                'fas fa-boxes-stacked',

            iconClass:
                'inventory',

            badge:
                '07'
        },


        {
            title:
                'More',

            subtitle:
                'Applications',

            icon:
                'fas fa-grip',

            iconClass:
                'more',

            badge:
                '08'
        }

    ];


    //===========================================================
    // Handle Quick Access
    //===========================================================

    onQuickAccessClick
    (
        item:
            QuickAccessItem
    ):
        void
    {
        if
        (
            this.previewMode
        )
        {
            return;
        }


        console.log(
            'Quick Access:',
            item.title
        );
    }


    //===========================================================
    // View All
    //===========================================================

    onViewAll():
        void
    {
        if
        (
            this.previewMode
        )
        {
            return;
        }


        console.log(
            'View All Quick Access'
        );
    }

}