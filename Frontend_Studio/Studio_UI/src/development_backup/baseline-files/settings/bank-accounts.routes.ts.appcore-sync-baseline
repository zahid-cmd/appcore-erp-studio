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

export const BankAccountsRoutes:
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
            breadcrumb:'Bank Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/bank-accounts/list/bank-accounts-list'
            )
            .then(
                m =>
                    m.BankAccountsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Bank Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/bank-accounts/form/bank-accounts-form'
            )
            .then(
                m =>
                    m.BankAccountsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Bank Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/bank-accounts/form/bank-accounts-form'
            )
            .then(
                m =>
                    m.BankAccountsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Bank Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/bank-accounts/form/bank-accounts-form'
            )
            .then(
                m =>
                    m.BankAccountsForm
            )
    }

];