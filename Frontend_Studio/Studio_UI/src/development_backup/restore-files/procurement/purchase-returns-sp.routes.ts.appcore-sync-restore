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

export const PurchaseReturnsSpRoutes:
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
            breadcrumb:'Purchase Returns - SP'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-returns-sp/list/purchase-returns-sp-list'
            )
            .then(
                m =>
                    m.PurchaseReturnsSpList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Purchase Returns - SP'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-returns-sp/form/purchase-returns-sp-form'
            )
            .then(
                m =>
                    m.PurchaseReturnsSpForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Purchase Returns - SP'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-returns-sp/form/purchase-returns-sp-form'
            )
            .then(
                m =>
                    m.PurchaseReturnsSpForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Purchase Returns - SP'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-returns-sp/form/purchase-returns-sp-form'
            )
            .then(
                m =>
                    m.PurchaseReturnsSpForm
            )
    }

];