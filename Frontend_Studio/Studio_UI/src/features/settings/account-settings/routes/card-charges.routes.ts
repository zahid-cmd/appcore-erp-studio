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

export const CardChargesRoutes:
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
            breadcrumb:'Card Charges'
        },

        loadComponent:() =>
            import(
                '../pages/card-charges/list/card-charges-list'
            )
            .then(
                m =>
                    m.CardChargesList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Card Charges'
        },

        loadComponent:() =>
            import(
                '../pages/card-charges/form/card-charges-form'
            )
            .then(
                m =>
                    m.CardChargesForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Card Charges'
        },

        loadComponent:() =>
            import(
                '../pages/card-charges/form/card-charges-form'
            )
            .then(
                m =>
                    m.CardChargesForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Card Charges'
        },

        loadComponent:() =>
            import(
                '../pages/card-charges/form/card-charges-form'
            )
            .then(
                m =>
                    m.CardChargesForm
            )
    }

];