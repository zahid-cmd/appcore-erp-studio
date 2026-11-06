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

export const UserProfileRoutes:
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
            breadcrumb:'User Profile'
        },

        loadComponent:() =>
            import(
                '../pages/user-profile/list/user-profile-list'
            )
            .then(
                m =>
                    m.UserProfileList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add User Profile'
        },

        loadComponent:() =>
            import(
                '../pages/user-profile/form/user-profile-form'
            )
            .then(
                m =>
                    m.UserProfileForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit User Profile'
        },

        loadComponent:() =>
            import(
                '../pages/user-profile/form/user-profile-form'
            )
            .then(
                m =>
                    m.UserProfileForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View User Profile'
        },

        loadComponent:() =>
            import(
                '../pages/user-profile/form/user-profile-form'
            )
            .then(
                m =>
                    m.UserProfileForm
            )
    }

];