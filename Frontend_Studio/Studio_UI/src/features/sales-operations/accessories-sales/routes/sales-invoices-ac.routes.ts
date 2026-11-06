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

export const SalesInvoicesAcRoutes:
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
            breadcrumb:'Sales Invoices - AC'
        },

        loadComponent:() =>
            import(
                '../pages/sales-invoices-ac/list/sales-invoices-ac-list'
            )
            .then(
                m =>
                    m.SalesInvoicesAcList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Sales Invoices - AC'
        },

        loadComponent:() =>
            import(
                '../pages/sales-invoices-ac/form/sales-invoices-ac-form'
            )
            .then(
                m =>
                    m.SalesInvoicesAcForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Sales Invoices - AC'
        },

        loadComponent:() =>
            import(
                '../pages/sales-invoices-ac/form/sales-invoices-ac-form'
            )
            .then(
                m =>
                    m.SalesInvoicesAcForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Sales Invoices - AC'
        },

        loadComponent:() =>
            import(
                '../pages/sales-invoices-ac/form/sales-invoices-ac-form'
            )
            .then(
                m =>
                    m.SalesInvoicesAcForm
            )
    }

];