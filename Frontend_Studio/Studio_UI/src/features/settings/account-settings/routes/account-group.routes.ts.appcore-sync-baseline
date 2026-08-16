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

export const AccountGroupRoutes:
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
            breadcrumb:'Account Group'
        },

        loadComponent:() =>
            import(
                '../pages/account-group/list/account-group-list'
            )
            .then(
                m =>
                    m.AccountGroupList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Account Group'
        },

        loadComponent:() =>
            import(
                '../pages/account-group/form/account-group-form'
            )
            .then(
                m =>
                    m.AccountGroupForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Account Group'
        },

        loadComponent:() =>
            import(
                '../pages/account-group/form/account-group-form'
            )
            .then(
                m =>
                    m.AccountGroupForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Account Group'
        },

        loadComponent:() =>
            import(
                '../pages/account-group/form/account-group-form'
            )
            .then(
                m =>
                    m.AccountGroupForm
            )
    }

];