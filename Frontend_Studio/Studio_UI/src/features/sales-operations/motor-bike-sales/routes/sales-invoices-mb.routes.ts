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

export const SalesInvoicesMbRoutes:
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
            breadcrumb:'Sales Invoices - MB'
        },

        loadComponent:() =>
            import(
                '../pages/sales-invoices-mb/list/sales-invoices-mb-list'
            )
            .then(
                m =>
                    m.SalesInvoicesMbList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Sales Invoices - MB'
        },

        loadComponent:() =>
            import(
                '../pages/sales-invoices-mb/form/sales-invoices-mb-form'
            )
            .then(
                m =>
                    m.SalesInvoicesMbForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Sales Invoices - MB'
        },

        loadComponent:() =>
            import(
                '../pages/sales-invoices-mb/form/sales-invoices-mb-form'
            )
            .then(
                m =>
                    m.SalesInvoicesMbForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Sales Invoices - MB'
        },

        loadComponent:() =>
            import(
                '../pages/sales-invoices-mb/form/sales-invoices-mb-form'
            )
            .then(
                m =>
                    m.SalesInvoicesMbForm
            )
    }

];