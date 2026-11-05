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

export const PurchaseAdjustmentsSpRoutes:
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
            breadcrumb:'Purchase Adjustments - SP'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-adjustments-sp/list/purchase-adjustments-sp-list'
            )
            .then(
                m =>
                    m.PurchaseAdjustmentsSpList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Purchase Adjustments - SP'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-adjustments-sp/form/purchase-adjustments-sp-form'
            )
            .then(
                m =>
                    m.PurchaseAdjustmentsSpForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Purchase Adjustments - SP'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-adjustments-sp/form/purchase-adjustments-sp-form'
            )
            .then(
                m =>
                    m.PurchaseAdjustmentsSpForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Purchase Adjustments - SP'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-adjustments-sp/form/purchase-adjustments-sp-form'
            )
            .then(
                m =>
                    m.PurchaseAdjustmentsSpForm
            )
    }

];