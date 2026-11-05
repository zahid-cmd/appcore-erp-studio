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

export const RackManagementRoutes:
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
            breadcrumb:'Rack Management'
        },

        loadComponent:() =>
            import(
                '../pages/rack-management/list/rack-management-list'
            )
            .then(
                m =>
                    m.RackManagementList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Rack Management'
        },

        loadComponent:() =>
            import(
                '../pages/rack-management/form/rack-management-form'
            )
            .then(
                m =>
                    m.RackManagementForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Rack Management'
        },

        loadComponent:() =>
            import(
                '../pages/rack-management/form/rack-management-form'
            )
            .then(
                m =>
                    m.RackManagementForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Rack Management'
        },

        loadComponent:() =>
            import(
                '../pages/rack-management/form/rack-management-form'
            )
            .then(
                m =>
                    m.RackManagementForm
            )
    }

];