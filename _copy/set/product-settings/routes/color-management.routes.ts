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

export const ColorManagementRoutes:
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
            breadcrumb:'Color Management'
        },

        loadComponent:() =>
            import(
                '../pages/color-management/list/color-management-list'
            )
            .then(
                m =>
                    m.ColorManagementList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Color Management'
        },

        loadComponent:() =>
            import(
                '../pages/color-management/form/color-management-form'
            )
            .then(
                m =>
                    m.ColorManagementForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Color Management'
        },

        loadComponent:() =>
            import(
                '../pages/color-management/form/color-management-form'
            )
            .then(
                m =>
                    m.ColorManagementForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Color Management'
        },

        loadComponent:() =>
            import(
                '../pages/color-management/form/color-management-form'
            )
            .then(
                m =>
                    m.ColorManagementForm
            )
    }

];