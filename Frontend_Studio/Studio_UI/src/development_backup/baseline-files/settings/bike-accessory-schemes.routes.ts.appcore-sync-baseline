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

export const BikeAccessorySchemesRoutes:
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
            breadcrumb:'Bike Accessory Schemes'
        },

        loadComponent:() =>
            import(
                '../pages/bike-accessory-schemes/list/bike-accessory-schemes-list'
            )
            .then(
                m =>
                    m.BikeAccessorySchemesList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Bike Accessory Schemes'
        },

        loadComponent:() =>
            import(
                '../pages/bike-accessory-schemes/form/bike-accessory-schemes-form'
            )
            .then(
                m =>
                    m.BikeAccessorySchemesForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Bike Accessory Schemes'
        },

        loadComponent:() =>
            import(
                '../pages/bike-accessory-schemes/form/bike-accessory-schemes-form'
            )
            .then(
                m =>
                    m.BikeAccessorySchemesForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Bike Accessory Schemes'
        },

        loadComponent:() =>
            import(
                '../pages/bike-accessory-schemes/form/bike-accessory-schemes-form'
            )
            .then(
                m =>
                    m.BikeAccessorySchemesForm
            )
    }

];