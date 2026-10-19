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

export const MotorBikesRoutes:
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
            breadcrumb:'Motor Bikes'
        },

        loadComponent:() =>
            import(
                '../pages/motor-bikes/list/motor-bikes-list'
            )
            .then(
                m =>
                    m.MotorBikesList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Motor Bikes'
        },

        loadComponent:() =>
            import(
                '../pages/motor-bikes/form/motor-bikes-form'
            )
            .then(
                m =>
                    m.MotorBikesForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Motor Bikes'
        },

        loadComponent:() =>
            import(
                '../pages/motor-bikes/form/motor-bikes-form'
            )
            .then(
                m =>
                    m.MotorBikesForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Motor Bikes'
        },

        loadComponent:() =>
            import(
                '../pages/motor-bikes/form/motor-bikes-form'
            )
            .then(
                m =>
                    m.MotorBikesForm
            )
    }

];