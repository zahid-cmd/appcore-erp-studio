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

export const PriceAdjustmentRoutes:
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
            breadcrumb:'Price Adjustment'
        },

        loadComponent:() =>
            import(
                '../pages/price-adjustment/list/price-adjustment-list'
            )
            .then(
                m =>
                    m.PriceAdjustmentList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Price Adjustment'
        },

        loadComponent:() =>
            import(
                '../pages/price-adjustment/form/price-adjustment-form'
            )
            .then(
                m =>
                    m.PriceAdjustmentForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Price Adjustment'
        },

        loadComponent:() =>
            import(
                '../pages/price-adjustment/form/price-adjustment-form'
            )
            .then(
                m =>
                    m.PriceAdjustmentForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Price Adjustment'
        },

        loadComponent:() =>
            import(
                '../pages/price-adjustment/form/price-adjustment-form'
            )
            .then(
                m =>
                    m.PriceAdjustmentForm
            )
    }

];