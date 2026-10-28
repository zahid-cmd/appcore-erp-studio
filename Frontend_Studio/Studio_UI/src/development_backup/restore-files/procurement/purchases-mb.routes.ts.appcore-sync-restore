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

export const PurchasesMbRoutes:
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
            breadcrumb:'Purchases - MB'
        },

        loadComponent:() =>
            import(
                '../pages/purchases-mb/list/purchases-mb-list'
            )
            .then(
                m =>
                    m.PurchasesMbList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Purchases - MB'
        },

        loadComponent:() =>
            import(
                '../pages/purchases-mb/form/purchases-mb-form'
            )
            .then(
                m =>
                    m.PurchasesMbForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Purchases - MB'
        },

        loadComponent:() =>
            import(
                '../pages/purchases-mb/form/purchases-mb-form'
            )
            .then(
                m =>
                    m.PurchasesMbForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Purchases - MB'
        },

        loadComponent:() =>
            import(
                '../pages/purchases-mb/form/purchases-mb-form'
            )
            .then(
                m =>
                    m.PurchasesMbForm
            )
    }

];