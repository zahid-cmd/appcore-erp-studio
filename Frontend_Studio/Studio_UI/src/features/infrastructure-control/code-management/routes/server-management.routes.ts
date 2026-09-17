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

export const ServerManagementRoutes:
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
            breadcrumb:'Server Management'
        },

        loadComponent:() =>
            import(
                '../pages/server-management/list/server-management-list'
            )
            .then(
                m =>
                    m.ServerManagementList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Server Management'
        },

        loadComponent:() =>
            import(
                '../pages/server-management/form/server-management-form'
            )
            .then(
                m =>
                    m.ServerManagementForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Server Management'
        },

        loadComponent:() =>
            import(
                '../pages/server-management/form/server-management-form'
            )
            .then(
                m =>
                    m.ServerManagementForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Server Management'
        },

        loadComponent:() =>
            import(
                '../pages/server-management/form/server-management-form'
            )
            .then(
                m =>
                    m.ServerManagementForm
            )
    }

];