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

export const BankSetupRoutes:
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
            breadcrumb:'Bank Setup'
        },

        loadComponent:() =>
            import(
                '../pages/bank-setup/list/bank-setup-list'
            )
            .then(
                m =>
                    m.BankSetupList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Bank Setup'
        },

        loadComponent:() =>
            import(
                '../pages/bank-setup/form/bank-setup-form'
            )
            .then(
                m =>
                    m.BankSetupForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Bank Setup'
        },

        loadComponent:() =>
            import(
                '../pages/bank-setup/form/bank-setup-form'
            )
            .then(
                m =>
                    m.BankSetupForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Bank Setup'
        },

        loadComponent:() =>
            import(
                '../pages/bank-setup/form/bank-setup-form'
            )
            .then(
                m =>
                    m.BankSetupForm
            )
    }

];