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

export const ProductMasterRoutes:
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
            breadcrumb:'Product Master'
        },

        loadComponent:() =>
            import(
                '../pages/product-master/list/product-master-list'
            )
            .then(
                m =>
                    m.ProductMasterList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Product Master'
        },

        loadComponent:() =>
            import(
                '../pages/product-master/form/product-master-form'
            )
            .then(
                m =>
                    m.ProductMasterForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Product Master'
        },

        loadComponent:() =>
            import(
                '../pages/product-master/form/product-master-form'
            )
            .then(
                m =>
                    m.ProductMasterForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Product Master'
        },

        loadComponent:() =>
            import(
                '../pages/product-master/form/product-master-form'
            )
            .then(
                m =>
                    m.ProductMasterForm
            )
    }

];