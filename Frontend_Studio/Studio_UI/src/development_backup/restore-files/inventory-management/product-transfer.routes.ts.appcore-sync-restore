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

export const ProductTransferRoutes:
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
            breadcrumb:'Product Transfer'
        },

        loadComponent:() =>
            import(
                '../pages/product-transfer/list/product-transfer-list'
            )
            .then(
                m =>
                    m.ProductTransferList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Product Transfer'
        },

        loadComponent:() =>
            import(
                '../pages/product-transfer/form/product-transfer-form'
            )
            .then(
                m =>
                    m.ProductTransferForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Product Transfer'
        },

        loadComponent:() =>
            import(
                '../pages/product-transfer/form/product-transfer-form'
            )
            .then(
                m =>
                    m.ProductTransferForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Product Transfer'
        },

        loadComponent:() =>
            import(
                '../pages/product-transfer/form/product-transfer-form'
            )
            .then(
                m =>
                    m.ProductTransferForm
            )
    }

];