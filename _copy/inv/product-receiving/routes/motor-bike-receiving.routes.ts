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

export const MotorBikeReceivingRoutes:
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
            breadcrumb:'Motor Bike Receiving'
        },

        loadComponent:() =>
            import(
                '../pages/motor-bike-receiving/list/motor-bike-receiving-list'
            )
            .then(
                m =>
                    m.MotorBikeReceivingList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Motor Bike Receiving'
        },

        loadComponent:() =>
            import(
                '../pages/motor-bike-receiving/form/motor-bike-receiving-form'
            )
            .then(
                m =>
                    m.MotorBikeReceivingForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Motor Bike Receiving'
        },

        loadComponent:() =>
            import(
                '../pages/motor-bike-receiving/form/motor-bike-receiving-form'
            )
            .then(
                m =>
                    m.MotorBikeReceivingForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Motor Bike Receiving'
        },

        loadComponent:() =>
            import(
                '../pages/motor-bike-receiving/form/motor-bike-receiving-form'
            )
            .then(
                m =>
                    m.MotorBikeReceivingForm
            )
    }

];