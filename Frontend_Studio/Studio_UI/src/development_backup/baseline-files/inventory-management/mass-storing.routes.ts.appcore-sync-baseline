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

export const MassStoringRoutes:
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
            breadcrumb:'Mass Storing'
        },

        loadComponent:() =>
            import(
                '../pages/mass-storing/list/mass-storing-list'
            )
            .then(
                m =>
                    m.MassStoringList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Mass Storing'
        },

        loadComponent:() =>
            import(
                '../pages/mass-storing/form/mass-storing-form'
            )
            .then(
                m =>
                    m.MassStoringForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Mass Storing'
        },

        loadComponent:() =>
            import(
                '../pages/mass-storing/form/mass-storing-form'
            )
            .then(
                m =>
                    m.MassStoringForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Mass Storing'
        },

        loadComponent:() =>
            import(
                '../pages/mass-storing/form/mass-storing-form'
            )
            .then(
                m =>
                    m.MassStoringForm
            )
    }

];