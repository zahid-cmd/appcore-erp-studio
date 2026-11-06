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

export const RoleProfileRoutes:
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
            breadcrumb:'Role Profile'
        },

        loadComponent:() =>
            import(
                '../pages/role-profile/list/role-profile-list'
            )
            .then(
                m =>
                    m.RoleProfileList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Role Profile'
        },

        loadComponent:() =>
            import(
                '../pages/role-profile/form/role-profile-form'
            )
            .then(
                m =>
                    m.RoleProfileForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Role Profile'
        },

        loadComponent:() =>
            import(
                '../pages/role-profile/form/role-profile-form'
            )
            .then(
                m =>
                    m.RoleProfileForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Role Profile'
        },

        loadComponent:() =>
            import(
                '../pages/role-profile/form/role-profile-form'
            )
            .then(
                m =>
                    m.RoleProfileForm
            )
    }

];