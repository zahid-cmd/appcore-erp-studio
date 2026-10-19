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

export const ScheduledServicesRoutes:
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
            breadcrumb:'Scheduled Services'
        },

        loadComponent:() =>
            import(
                '../pages/scheduled-services/list/scheduled-services-list'
            )
            .then(
                m =>
                    m.ScheduledServicesList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Scheduled Services'
        },

        loadComponent:() =>
            import(
                '../pages/scheduled-services/form/scheduled-services-form'
            )
            .then(
                m =>
                    m.ScheduledServicesForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Scheduled Services'
        },

        loadComponent:() =>
            import(
                '../pages/scheduled-services/form/scheduled-services-form'
            )
            .then(
                m =>
                    m.ScheduledServicesForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Scheduled Services'
        },

        loadComponent:() =>
            import(
                '../pages/scheduled-services/form/scheduled-services-form'
            )
            .then(
                m =>
                    m.ScheduledServicesForm
            )
    }

];