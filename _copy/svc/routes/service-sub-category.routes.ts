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

export const ServiceSubCategoryRoutes:
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
            breadcrumb:'Service Sub Category'
        },

        loadComponent:() =>
            import(
                '../pages/service-sub-category/list/service-sub-category-list'
            )
            .then(
                m =>
                    m.ServiceSubCategoryList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Service Sub Category'
        },

        loadComponent:() =>
            import(
                '../pages/service-sub-category/form/service-sub-category-form'
            )
            .then(
                m =>
                    m.ServiceSubCategoryForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Service Sub Category'
        },

        loadComponent:() =>
            import(
                '../pages/service-sub-category/form/service-sub-category-form'
            )
            .then(
                m =>
                    m.ServiceSubCategoryForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Service Sub Category'
        },

        loadComponent:() =>
            import(
                '../pages/service-sub-category/form/service-sub-category-form'
            )
            .then(
                m =>
                    m.ServiceSubCategoryForm
            )
    }

];