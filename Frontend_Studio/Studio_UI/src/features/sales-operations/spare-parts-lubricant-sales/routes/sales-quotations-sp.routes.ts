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

export const SalesQuotationsSpRoutes:
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
            breadcrumb:'Sales Quotations - SP'
        },

        loadComponent:() =>
            import(
                '../pages/sales-quotations-sp/list/sales-quotations-sp-list'
            )
            .then(
                m =>
                    m.SalesQuotationsSpList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Sales Quotations - SP'
        },

        loadComponent:() =>
            import(
                '../pages/sales-quotations-sp/form/sales-quotations-sp-form'
            )
            .then(
                m =>
                    m.SalesQuotationsSpForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Sales Quotations - SP'
        },

        loadComponent:() =>
            import(
                '../pages/sales-quotations-sp/form/sales-quotations-sp-form'
            )
            .then(
                m =>
                    m.SalesQuotationsSpForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Sales Quotations - SP'
        },

        loadComponent:() =>
            import(
                '../pages/sales-quotations-sp/form/sales-quotations-sp-form'
            )
            .then(
                m =>
                    m.SalesQuotationsSpForm
            )
    }

];