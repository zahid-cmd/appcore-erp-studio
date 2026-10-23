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

export const JournalVoucherRoutes:
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
            breadcrumb:'Journal Voucher'
        },

        loadComponent:() =>
            import(
                '../pages/journal-voucher/list/journal-voucher-list'
            )
            .then(
                m =>
                    m.JournalVoucherList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Journal Voucher'
        },

        loadComponent:() =>
            import(
                '../pages/journal-voucher/form/journal-voucher-form'
            )
            .then(
                m =>
                    m.JournalVoucherForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Journal Voucher'
        },

        loadComponent:() =>
            import(
                '../pages/journal-voucher/form/journal-voucher-form'
            )
            .then(
                m =>
                    m.JournalVoucherForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Journal Voucher'
        },

        loadComponent:() =>
            import(
                '../pages/journal-voucher/form/journal-voucher-form'
            )
            .then(
                m =>
                    m.JournalVoucherForm
            )
    }

];