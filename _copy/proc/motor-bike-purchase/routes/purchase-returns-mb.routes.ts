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

export const PurchaseReturnsMbRoutes:
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
            breadcrumb:'Purchase Returns - MB'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-returns-mb/list/purchase-returns-mb-list'
            )
            .then(
                m =>
                    m.PurchaseReturnsMbList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Purchase Returns - MB'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-returns-mb/form/purchase-returns-mb-form'
            )
            .then(
                m =>
                    m.PurchaseReturnsMbForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Purchase Returns - MB'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-returns-mb/form/purchase-returns-mb-form'
            )
            .then(
                m =>
                    m.PurchaseReturnsMbForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Purchase Returns - MB'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-returns-mb/form/purchase-returns-mb-form'
            )
            .then(
                m =>
                    m.PurchaseReturnsMbForm
            )
    }

];