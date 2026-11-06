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

export const GeneralLedgersRoutes:
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
            breadcrumb:'General Ledgers'
        },

        loadComponent:() =>
            import(
                '../pages/general-ledgers/list/general-ledgers-list'
            )
            .then(
                m =>
                    m.GeneralLedgersList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add General Ledgers'
        },

        loadComponent:() =>
            import(
                '../pages/general-ledgers/form/general-ledgers-form'
            )
            .then(
                m =>
                    m.GeneralLedgersForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit General Ledgers'
        },

        loadComponent:() =>
            import(
                '../pages/general-ledgers/form/general-ledgers-form'
            )
            .then(
                m =>
                    m.GeneralLedgersForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View General Ledgers'
        },

        loadComponent:() =>
            import(
                '../pages/general-ledgers/form/general-ledgers-form'
            )
            .then(
                m =>
                    m.GeneralLedgersForm
            )
    }

];