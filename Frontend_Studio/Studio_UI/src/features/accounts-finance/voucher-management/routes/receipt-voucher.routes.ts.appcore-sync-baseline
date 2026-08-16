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

export const ReceiptVoucherRoutes:
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
            breadcrumb:'Receipt Voucher'
        },

        loadComponent:() =>
            import(
                '../pages/receipt-voucher/list/receipt-voucher-list'
            )
            .then(
                m =>
                    m.ReceiptVoucherList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Receipt Voucher'
        },

        loadComponent:() =>
            import(
                '../pages/receipt-voucher/form/receipt-voucher-form'
            )
            .then(
                m =>
                    m.ReceiptVoucherForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Receipt Voucher'
        },

        loadComponent:() =>
            import(
                '../pages/receipt-voucher/form/receipt-voucher-form'
            )
            .then(
                m =>
                    m.ReceiptVoucherForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Receipt Voucher'
        },

        loadComponent:() =>
            import(
                '../pages/receipt-voucher/form/receipt-voucher-form'
            )
            .then(
                m =>
                    m.ReceiptVoucherForm
            )
    }

];