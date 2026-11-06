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

export const LocationsRoutes:
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
            breadcrumb:'Locations'
        },

        loadComponent:() =>
            import(
                '../pages/locations/list/locations-list'
            )
            .then(
                m =>
                    m.LocationsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Locations'
        },

        loadComponent:() =>
            import(
                '../pages/locations/form/locations-form'
            )
            .then(
                m =>
                    m.LocationsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Locations'
        },

        loadComponent:() =>
            import(
                '../pages/locations/form/locations-form'
            )
            .then(
                m =>
                    m.LocationsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Locations'
        },

        loadComponent:() =>
            import(
                '../pages/locations/form/locations-form'
            )
            .then(
                m =>
                    m.LocationsForm
            )
    }

];