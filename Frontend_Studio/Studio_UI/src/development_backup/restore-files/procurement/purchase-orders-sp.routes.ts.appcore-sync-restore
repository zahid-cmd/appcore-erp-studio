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

export const PurchaseOrdersSpRoutes:
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
            breadcrumb:'Purchase Orders - SP'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-orders-sp/list/purchase-orders-sp-list'
            )
            .then(
                m =>
                    m.PurchaseOrdersSpList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Purchase Orders - SP'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-orders-sp/form/purchase-orders-sp-form'
            )
            .then(
                m =>
                    m.PurchaseOrdersSpForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Purchase Orders - SP'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-orders-sp/form/purchase-orders-sp-form'
            )
            .then(
                m =>
                    m.PurchaseOrdersSpForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Purchase Orders - SP'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-orders-sp/form/purchase-orders-sp-form'
            )
            .then(
                m =>
                    m.PurchaseOrdersSpForm
            )
    }

];