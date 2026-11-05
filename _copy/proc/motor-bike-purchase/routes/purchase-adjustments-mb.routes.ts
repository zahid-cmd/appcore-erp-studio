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

export const PurchaseAdjustmentsMbRoutes:
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
            breadcrumb:'Purchase Adjustments - MB'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-adjustments-mb/list/purchase-adjustments-mb-list'
            )
            .then(
                m =>
                    m.PurchaseAdjustmentsMbList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Purchase Adjustments - MB'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-adjustments-mb/form/purchase-adjustments-mb-form'
            )
            .then(
                m =>
                    m.PurchaseAdjustmentsMbForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Purchase Adjustments - MB'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-adjustments-mb/form/purchase-adjustments-mb-form'
            )
            .then(
                m =>
                    m.PurchaseAdjustmentsMbForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Purchase Adjustments - MB'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-adjustments-mb/form/purchase-adjustments-mb-form'
            )
            .then(
                m =>
                    m.PurchaseAdjustmentsMbForm
            )
    }

];