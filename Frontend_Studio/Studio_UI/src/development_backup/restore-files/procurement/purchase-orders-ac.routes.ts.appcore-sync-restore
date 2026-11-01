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

export const PurchaseOrdersAcRoutes:
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
            breadcrumb:'Purchase Orders - AC'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-orders-ac/list/purchase-orders-ac-list'
            )
            .then(
                m =>
                    m.PurchaseOrdersAcList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Purchase Orders - AC'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-orders-ac/form/purchase-orders-ac-form'
            )
            .then(
                m =>
                    m.PurchaseOrdersAcForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Purchase Orders - AC'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-orders-ac/form/purchase-orders-ac-form'
            )
            .then(
                m =>
                    m.PurchaseOrdersAcForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Purchase Orders - AC'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-orders-ac/form/purchase-orders-ac-form'
            )
            .then(
                m =>
                    m.PurchaseOrdersAcForm
            )
    }

];