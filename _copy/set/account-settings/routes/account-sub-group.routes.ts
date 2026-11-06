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

export const AccountSubGroupRoutes:
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
            breadcrumb:'Account Sub Group'
        },

        loadComponent:() =>
            import(
                '../pages/account-sub-group/list/account-sub-group-list'
            )
            .then(
                m =>
                    m.AccountSubGroupList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Account Sub Group'
        },

        loadComponent:() =>
            import(
                '../pages/account-sub-group/form/account-sub-group-form'
            )
            .then(
                m =>
                    m.AccountSubGroupForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Account Sub Group'
        },

        loadComponent:() =>
            import(
                '../pages/account-sub-group/form/account-sub-group-form'
            )
            .then(
                m =>
                    m.AccountSubGroupForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Account Sub Group'
        },

        loadComponent:() =>
            import(
                '../pages/account-sub-group/form/account-sub-group-form'
            )
            .then(
                m =>
                    m.AccountSubGroupForm
            )
    }

];