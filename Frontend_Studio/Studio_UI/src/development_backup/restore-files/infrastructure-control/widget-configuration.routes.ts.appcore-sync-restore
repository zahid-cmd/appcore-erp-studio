//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Submenu Routes
//===============================================================

export const WidgetConfigurationRoutes:
Routes =
[


    //===========================================================
    // Default
    //===========================================================

    {
        path:'',

        redirectTo:'list',

        pathMatch:'full'
    },


    //===========================================================
    // List
    //===========================================================

    {
        path:'list',

        data:
        {
            breadcrumb:'Widget Configuration'
        },

        loadComponent:() =>
            import(
                '../pages/widget-configuration/list/widget-configuration-list'
            )
            .then(
                m =>
                    m.WidgetConfigurationList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Widget Configuration'
        },

        loadComponent:() =>
            import(
                '../pages/widget-configuration/form/widget-configuration-form'
            )
            .then(
                m =>
                    m.WidgetConfigurationForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Widget Configuration'
        },

        loadComponent:() =>
            import(
                '../pages/widget-configuration/form/widget-configuration-form'
            )
            .then(
                m =>
                    m.WidgetConfigurationForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Widget Configuration'
        },

        loadComponent:() =>
            import(
                '../pages/widget-configuration/form/widget-configuration-form'
            )
            .then(
                m =>
                    m.WidgetConfigurationForm
            )
    }

];