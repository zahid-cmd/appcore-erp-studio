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

export const SalesInvoicesSpRoutes:
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
            breadcrumb:'Sales Invoices - SP'
        },

        loadComponent:() =>
            import(
                '../pages/sales-invoices-sp/list/sales-invoices-sp-list'
            )
            .then(
                m =>
                    m.SalesInvoicesSpList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Sales Invoices - SP'
        },

        loadComponent:() =>
            import(
                '../pages/sales-invoices-sp/form/sales-invoices-sp-form'
            )
            .then(
                m =>
                    m.SalesInvoicesSpForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Sales Invoices - SP'
        },

        loadComponent:() =>
            import(
                '../pages/sales-invoices-sp/form/sales-invoices-sp-form'
            )
            .then(
                m =>
                    m.SalesInvoicesSpForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Sales Invoices - SP'
        },

        loadComponent:() =>
            import(
                '../pages/sales-invoices-sp/form/sales-invoices-sp-form'
            )
            .then(
                m =>
                    m.SalesInvoicesSpForm
            )
    }

];