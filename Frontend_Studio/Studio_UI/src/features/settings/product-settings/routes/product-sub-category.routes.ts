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

export const ProductSubCategoryRoutes:
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
            breadcrumb:'Product Sub Category'
        },

        loadComponent:() =>
            import(
                '../pages/product-sub-category/list/product-sub-category-list'
            )
            .then(
                m =>
                    m.ProductSubCategoryList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Product Sub Category'
        },

        loadComponent:() =>
            import(
                '../pages/product-sub-category/form/product-sub-category-form'
            )
            .then(
                m =>
                    m.ProductSubCategoryForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Product Sub Category'
        },

        loadComponent:() =>
            import(
                '../pages/product-sub-category/form/product-sub-category-form'
            )
            .then(
                m =>
                    m.ProductSubCategoryForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Product Sub Category'
        },

        loadComponent:() =>
            import(
                '../pages/product-sub-category/form/product-sub-category-form'
            )
            .then(
                m =>
                    m.ProductSubCategoryForm
            )
    }

];