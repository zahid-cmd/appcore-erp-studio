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

export const ProductPricingRoutes:
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
            breadcrumb:'Product Pricing'
        },

        loadComponent:() =>
            import(
                '../pages/product-pricing/list/product-pricing-list'
            )
            .then(
                m =>
                    m.ProductPricingList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Product Pricing'
        },

        loadComponent:() =>
            import(
                '../pages/product-pricing/form/product-pricing-form'
            )
            .then(
                m =>
                    m.ProductPricingForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Update Product Pricing'
        },

        loadComponent:() =>
            import(
                '../pages/product-pricing/form/product-pricing-form'
            )
            .then(
                m =>
                    m.ProductPricingForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Product Pricing'
        },

        loadComponent:() =>
            import(
                '../pages/product-pricing/form/product-pricing-form'
            )
            .then(
                m =>
                    m.ProductPricingForm
            )
    }

];