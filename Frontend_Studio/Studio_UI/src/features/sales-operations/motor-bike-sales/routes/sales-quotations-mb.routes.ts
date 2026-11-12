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

export const SalesQuotationsMbRoutes:
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
            breadcrumb:'Sales Quotations - MB'
        },

        loadComponent:() =>
            import(
                '../pages/sales-quotations-mb/list/sales-quotations-mb-list'
            )
            .then(
                m =>
                    m.SalesQuotationsMbList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Sales Quotations - MB'
        },

        loadComponent:() =>
            import(
                '../pages/sales-quotations-mb/form/sales-quotations-mb-form'
            )
            .then(
                m =>
                    m.SalesQuotationsMbForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Sales Quotations - MB'
        },

        loadComponent:() =>
            import(
                '../pages/sales-quotations-mb/form/sales-quotations-mb-form'
            )
            .then(
                m =>
                    m.SalesQuotationsMbForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Sales Quotations - MB'
        },

        loadComponent:() =>
            import(
                '../pages/sales-quotations-mb/form/sales-quotations-mb-form'
            )
            .then(
                m =>
                    m.SalesQuotationsMbForm
            )
    }

];