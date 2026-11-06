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

export const AccountClassRoutes:
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
            breadcrumb:'Account Class'
        },

        loadComponent:() =>
            import(
                '../pages/account-class/list/account-class-list'
            )
            .then(
                m =>
                    m.AccountClassList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Account Class'
        },

        loadComponent:() =>
            import(
                '../pages/account-class/form/account-class-form'
            )
            .then(
                m =>
                    m.AccountClassForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Account Class'
        },

        loadComponent:() =>
            import(
                '../pages/account-class/form/account-class-form'
            )
            .then(
                m =>
                    m.AccountClassForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Account Class'
        },

        loadComponent:() =>
            import(
                '../pages/account-class/form/account-class-form'
            )
            .then(
                m =>
                    m.AccountClassForm
            )
    }

];