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

export const PurchaseAdjustmentsAcRoutes:
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
            breadcrumb:'Purchase Adjustments - AC'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-adjustments-ac/list/purchase-adjustments-ac-list'
            )
            .then(
                m =>
                    m.PurchaseAdjustmentsAcList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Purchase Adjustments - AC'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-adjustments-ac/form/purchase-adjustments-ac-form'
            )
            .then(
                m =>
                    m.PurchaseAdjustmentsAcForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Purchase Adjustments - AC'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-adjustments-ac/form/purchase-adjustments-ac-form'
            )
            .then(
                m =>
                    m.PurchaseAdjustmentsAcForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Purchase Adjustments - AC'
        },

        loadComponent:() =>
            import(
                '../pages/purchase-adjustments-ac/form/purchase-adjustments-ac-form'
            )
            .then(
                m =>
                    m.PurchaseAdjustmentsAcForm
            )
    }

];