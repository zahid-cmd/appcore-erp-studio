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

export const MfsAccountsRoutes:
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
            breadcrumb:'MFS Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/mfs-accounts/list/mfs-accounts-list'
            )
            .then(
                m =>
                    m.MfsAccountsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add MFS Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/mfs-accounts/form/mfs-accounts-form'
            )
            .then(
                m =>
                    m.MfsAccountsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit MFS Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/mfs-accounts/form/mfs-accounts-form'
            )
            .then(
                m =>
                    m.MfsAccountsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View MFS Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/mfs-accounts/form/mfs-accounts-form'
            )
            .then(
                m =>
                    m.MfsAccountsForm
            )
    }

];