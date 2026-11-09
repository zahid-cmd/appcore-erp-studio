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

export const ProductPricingMotorBikesRoutes:
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
            breadcrumb:'Product Pricing - Motor Bikes'
        },

        loadComponent:() =>
            import(
                '../pages/product-pricing-motor-bikes/list/product-pricing-motor-bikes-list'
            )
            .then(
                m =>
                    m.ProductPricingMotorBikesList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Product Pricing - Motor Bikes'
        },

        loadComponent:() =>
            import(
                '../pages/product-pricing-motor-bikes/form/product-pricing-motor-bikes-form'
            )
            .then(
                m =>
                    m.ProductPricingMotorBikesForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Product Pricing - Motor Bikes'
        },

        loadComponent:() =>
            import(
                '../pages/product-pricing-motor-bikes/form/product-pricing-motor-bikes-form'
            )
            .then(
                m =>
                    m.ProductPricingMotorBikesForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Product Pricing - Motor Bikes'
        },

        loadComponent:() =>
            import(
                '../pages/product-pricing-motor-bikes/form/product-pricing-motor-bikes-form'
            )
            .then(
                m =>
                    m.ProductPricingMotorBikesForm
            )
    }

];