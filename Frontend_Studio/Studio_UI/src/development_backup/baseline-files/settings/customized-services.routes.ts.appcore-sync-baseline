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

export const CustomizedServicesRoutes:
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
            breadcrumb:'Customized Services'
        },

        loadComponent:() =>
            import(
                '../pages/customized-services/list/customized-services-list'
            )
            .then(
                m =>
                    m.CustomizedServicesList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Customized Services'
        },

        loadComponent:() =>
            import(
                '../pages/customized-services/form/customized-services-form'
            )
            .then(
                m =>
                    m.CustomizedServicesForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Customized Services'
        },

        loadComponent:() =>
            import(
                '../pages/customized-services/form/customized-services-form'
            )
            .then(
                m =>
                    m.CustomizedServicesForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Customized Services'
        },

        loadComponent:() =>
            import(
                '../pages/customized-services/form/customized-services-form'
            )
            .then(
                m =>
                    m.CustomizedServicesForm
            )
    }

];