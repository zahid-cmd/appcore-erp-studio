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

export const PurchaseOrdersMbRoutes:
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
            breadcrumb:'Purchase Orders - MB'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-orders-mb/list/purchase-orders-mb-list'
            )
            .then(
                m =>
                    m.PurchaseOrdersMbList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Purchase Orders - MB'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-orders-mb/form/purchase-orders-mb-form'
            )
            .then(
                m =>
                    m.PurchaseOrdersMbForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Purchase Orders - MB'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-orders-mb/form/purchase-orders-mb-form'
            )
            .then(
                m =>
                    m.PurchaseOrdersMbForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Purchase Orders - MB'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-orders-mb/form/purchase-orders-mb-form'
            )
            .then(
                m =>
                    m.PurchaseOrdersMbForm
            )
    }

];