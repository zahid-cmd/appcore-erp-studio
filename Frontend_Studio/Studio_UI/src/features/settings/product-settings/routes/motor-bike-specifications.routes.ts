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

export const MotorBikeSpecificationsRoutes:
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
            breadcrumb:'Motor Bike Specifications'
        },

        loadComponent:() =>
            import(
                '../pages/motor-bike-specifications/list/motor-bike-specifications-list'
            )
            .then(
                m =>
                    m.MotorBikeSpecificationsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Motor Bike Specifications'
        },

        loadComponent:() =>
            import(
                '../pages/motor-bike-specifications/form/motor-bike-specifications-form'
            )
            .then(
                m =>
                    m.MotorBikeSpecificationsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Motor Bike Specifications'
        },

        loadComponent:() =>
            import(
                '../pages/motor-bike-specifications/form/motor-bike-specifications-form'
            )
            .then(
                m =>
                    m.MotorBikeSpecificationsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Motor Bike Specifications'
        },

        loadComponent:() =>
            import(
                '../pages/motor-bike-specifications/form/motor-bike-specifications-form'
            )
            .then(
                m =>
                    m.MotorBikeSpecificationsForm
            )
    }

];