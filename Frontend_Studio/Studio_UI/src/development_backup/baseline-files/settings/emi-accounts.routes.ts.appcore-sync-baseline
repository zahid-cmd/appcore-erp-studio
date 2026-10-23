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

export const EmiAccountsRoutes:
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
            breadcrumb:'EMI Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/emi-accounts/list/emi-accounts-list'
            )
            .then(
                m =>
                    m.EmiAccountsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add EMI Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/emi-accounts/form/emi-accounts-form'
            )
            .then(
                m =>
                    m.EmiAccountsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit EMI Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/emi-accounts/form/emi-accounts-form'
            )
            .then(
                m =>
                    m.EmiAccountsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View EMI Accounts'
        },

        loadComponent:() =>
            import(
                '../pages/emi-accounts/form/emi-accounts-form'
            )
            .then(
                m =>
                    m.EmiAccountsForm
            )
    }

];