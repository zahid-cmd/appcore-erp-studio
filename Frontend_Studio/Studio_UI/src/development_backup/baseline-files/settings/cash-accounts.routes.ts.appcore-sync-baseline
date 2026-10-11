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

export const CashAccountsRoutes:
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
            breadcrumb:'Cash Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/cash-accounts/list/cash-accounts-list'
            )
            .then(
                m =>
                    m.CashAccountsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Cash Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/cash-accounts/form/cash-accounts-form'
            )
            .then(
                m =>
                    m.CashAccountsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Cash Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/cash-accounts/form/cash-accounts-form'
            )
            .then(
                m =>
                    m.CashAccountsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Cash Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/cash-accounts/form/cash-accounts-form'
            )
            .then(
                m =>
                    m.CashAccountsForm
            )
    }

];