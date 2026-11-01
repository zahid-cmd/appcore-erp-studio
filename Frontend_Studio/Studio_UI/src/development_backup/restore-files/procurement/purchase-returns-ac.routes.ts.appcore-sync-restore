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

export const PurchaseReturnsAcRoutes:
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
            breadcrumb:'Purchase Returns - AC'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-returns-ac/list/purchase-returns-ac-list'
            )
            .then(
                m =>
                    m.PurchaseReturnsAcList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Purchase Returns - AC'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-returns-ac/form/purchase-returns-ac-form'
            )
            .then(
                m =>
                    m.PurchaseReturnsAcForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Purchase Returns - AC'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-returns-ac/form/purchase-returns-ac-form'
            )
            .then(
                m =>
                    m.PurchaseReturnsAcForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Purchase Returns - AC'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-returns-ac/form/purchase-returns-ac-form'
            )
            .then(
                m =>
                    m.PurchaseReturnsAcForm
            )
    }

];