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

export const SalesReturnsAcRoutes:
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
            breadcrumb:'Sales Returns - AC'
        },

        loadComponent:() =>
            import(
                '../pages/sales-returns-ac/list/sales-returns-ac-list'
            )
            .then(
                m =>
                    m.SalesReturnsAcList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Sales Returns - AC'
        },

        loadComponent:() =>
            import(
                '../pages/sales-returns-ac/form/sales-returns-ac-form'
            )
            .then(
                m =>
                    m.SalesReturnsAcForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Sales Returns - AC'
        },

        loadComponent:() =>
            import(
                '../pages/sales-returns-ac/form/sales-returns-ac-form'
            )
            .then(
                m =>
                    m.SalesReturnsAcForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Sales Returns - AC'
        },

        loadComponent:() =>
            import(
                '../pages/sales-returns-ac/form/sales-returns-ac-form'
            )
            .then(
                m =>
                    m.SalesReturnsAcForm
            )
    }

];