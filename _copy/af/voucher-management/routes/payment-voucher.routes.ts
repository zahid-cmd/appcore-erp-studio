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

export const PaymentVoucherRoutes:
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
            breadcrumb:'Payment Voucher'
        },

        loadComponent:() =>
            import(
                '../pages/payment-voucher/list/payment-voucher-list'
            )
            .then(
                m =>
                    m.PaymentVoucherList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Payment Voucher'
        },

        loadComponent:() =>
            import(
                '../pages/payment-voucher/form/payment-voucher-form'
            )
            .then(
                m =>
                    m.PaymentVoucherForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Payment Voucher'
        },

        loadComponent:() =>
            import(
                '../pages/payment-voucher/form/payment-voucher-form'
            )
            .then(
                m =>
                    m.PaymentVoucherForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Payment Voucher'
        },

        loadComponent:() =>
            import(
                '../pages/payment-voucher/form/payment-voucher-form'
            )
            .then(
                m =>
                    m.PaymentVoucherForm
            )
    }

];