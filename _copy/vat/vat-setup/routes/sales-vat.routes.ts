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

export const SalesVatRoutes:
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
            breadcrumb:'Sales VAT'
        },

        loadComponent:() =>
            import(
                '../pages/sales-vat/list/sales-vat-list'
            )
            .then(
                m =>
                    m.SalesVatList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Sales VAT'
        },

        loadComponent:() =>
            import(
                '../pages/sales-vat/form/sales-vat-form'
            )
            .then(
                m =>
                    m.SalesVatForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Sales VAT'
        },

        loadComponent:() =>
            import(
                '../pages/sales-vat/form/sales-vat-form'
            )
            .then(
                m =>
                    m.SalesVatForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Sales VAT'
        },

        loadComponent:() =>
            import(
                '../pages/sales-vat/form/sales-vat-form'
            )
            .then(
                m =>
                    m.SalesVatForm
            )
    }

];