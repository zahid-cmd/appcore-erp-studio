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

export const SalesQuotationsAcRoutes:
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
            breadcrumb:'Sales Quotations - AC'
        },

        loadComponent:() =>
            import(
                '../pages/sales-quotations-ac/list/sales-quotations-ac-list'
            )
            .then(
                m =>
                    m.SalesQuotationsAcList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Sales Quotations - AC'
        },

        loadComponent:() =>
            import(
                '../pages/sales-quotations-ac/form/sales-quotations-ac-form'
            )
            .then(
                m =>
                    m.SalesQuotationsAcForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Sales Quotations - AC'
        },

        loadComponent:() =>
            import(
                '../pages/sales-quotations-ac/form/sales-quotations-ac-form'
            )
            .then(
                m =>
                    m.SalesQuotationsAcForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Sales Quotations - AC'
        },

        loadComponent:() =>
            import(
                '../pages/sales-quotations-ac/form/sales-quotations-ac-form'
            )
            .then(
                m =>
                    m.SalesQuotationsAcForm
            )
    }

];