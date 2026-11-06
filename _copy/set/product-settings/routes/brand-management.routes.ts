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

export const BrandManagementRoutes:
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
            breadcrumb:'Brand Management'
        },

        loadComponent:() =>
            import(
                '../pages/brand-management/list/brand-management-list'
            )
            .then(
                m =>
                    m.BrandManagementList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Brand Management'
        },

        loadComponent:() =>
            import(
                '../pages/brand-management/form/brand-management-form'
            )
            .then(
                m =>
                    m.BrandManagementForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Brand Management'
        },

        loadComponent:() =>
            import(
                '../pages/brand-management/form/brand-management-form'
            )
            .then(
                m =>
                    m.BrandManagementForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Brand Management'
        },

        loadComponent:() =>
            import(
                '../pages/brand-management/form/brand-management-form'
            )
            .then(
                m =>
                    m.BrandManagementForm
            )
    }

];