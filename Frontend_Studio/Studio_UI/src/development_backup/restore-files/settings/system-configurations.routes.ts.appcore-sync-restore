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

export const SystemConfigurationsRoutes:
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
            breadcrumb:'System Configurations'
        },

        loadComponent:() =>
            import(
                '../pages/system-configurations/list/system-configurations-list'
            )
            .then(
                m =>
                    m.SystemConfigurationsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add System Configurations'
        },

        loadComponent:() =>
            import(
                '../pages/system-configurations/form/system-configurations-form'
            )
            .then(
                m =>
                    m.SystemConfigurationsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit System Configurations'
        },

        loadComponent:() =>
            import(
                '../pages/system-configurations/form/system-configurations-form'
            )
            .then(
                m =>
                    m.SystemConfigurationsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View System Configurations'
        },

        loadComponent:() =>
            import(
                '../pages/system-configurations/form/system-configurations-form'
            )
            .then(
                m =>
                    m.SystemConfigurationsForm
            )
    }

];