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

export const ProductCategoryRoutes:
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
            breadcrumb:'Product Category'
        },

        loadComponent:() =>
            import(
                '../pages/product-category/list/product-category-list'
            )
            .then(
                m =>
                    m.ProductCategoryList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Product Category'
        },

        loadComponent:() =>
            import(
                '../pages/product-category/form/product-category-form'
            )
            .then(
                m =>
                    m.ProductCategoryForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Product Category'
        },

        loadComponent:() =>
            import(
                '../pages/product-category/form/product-category-form'
            )
            .then(
                m =>
                    m.ProductCategoryForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Product Category'
        },

        loadComponent:() =>
            import(
                '../pages/product-category/form/product-category-form'
            )
            .then(
                m =>
                    m.ProductCategoryForm
            )
    }

];