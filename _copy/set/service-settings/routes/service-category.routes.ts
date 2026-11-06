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

export const ServiceCategoryRoutes:
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
            breadcrumb:'Service Category'
        },

        loadComponent:() =>
            import(
                '../pages/service-category/list/service-category-list'
            )
            .then(
                m =>
                    m.ServiceCategoryList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Service Category'
        },

        loadComponent:() =>
            import(
                '../pages/service-category/form/service-category-form'
            )
            .then(
                m =>
                    m.ServiceCategoryForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Service Category'
        },

        loadComponent:() =>
            import(
                '../pages/service-category/form/service-category-form'
            )
            .then(
                m =>
                    m.ServiceCategoryForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Service Category'
        },

        loadComponent:() =>
            import(
                '../pages/service-category/form/service-category-form'
            )
            .then(
                m =>
                    m.ServiceCategoryForm
            )
    }

];