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

export const FundTransferRoutes:
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
            breadcrumb:'Fund Transfer'
        },

        loadComponent:() =>
            import(
                '../pages/fund-transfer/list/fund-transfer-list'
            )
            .then(
                m =>
                    m.FundTransferList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Fund Transfer'
        },

        loadComponent:() =>
            import(
                '../pages/fund-transfer/form/fund-transfer-form'
            )
            .then(
                m =>
                    m.FundTransferForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Fund Transfer'
        },

        loadComponent:() =>
            import(
                '../pages/fund-transfer/form/fund-transfer-form'
            )
            .then(
                m =>
                    m.FundTransferForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Fund Transfer'
        },

        loadComponent:() =>
            import(
                '../pages/fund-transfer/form/fund-transfer-form'
            )
            .then(
                m =>
                    m.FundTransferForm
            )
    }

];