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

export const BikeModelsRoutes:
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
            breadcrumb:'Bike Models'
        },

        loadComponent:() =>
            import(
                '../pages/bike-models/list/bike-models-list'
            )
            .then(
                m =>
                    m.BikeModelsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Bike Models'
        },

        loadComponent:() =>
            import(
                '../pages/bike-models/form/bike-models-form'
            )
            .then(
                m =>
                    m.BikeModelsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Bike Models'
        },

        loadComponent:() =>
            import(
                '../pages/bike-models/form/bike-models-form'
            )
            .then(
                m =>
                    m.BikeModelsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Bike Models'
        },

        loadComponent:() =>
            import(
                '../pages/bike-models/form/bike-models-form'
            )
            .then(
                m =>
                    m.BikeModelsForm
            )
    }

];