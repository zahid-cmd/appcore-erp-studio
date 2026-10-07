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

export const PosAccountsRoutes:
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
            breadcrumb:'POS Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/pos-accounts/list/pos-accounts-list'
            )
            .then(
                m =>
                    m.PosAccountsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add POS Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/pos-accounts/form/pos-accounts-form'
            )
            .then(
                m =>
                    m.PosAccountsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit POS Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/pos-accounts/form/pos-accounts-form'
            )
            .then(
                m =>
                    m.PosAccountsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View POS Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/pos-accounts/form/pos-accounts-form'
            )
            .then(
                m =>
                    m.PosAccountsForm
            )
    }

];