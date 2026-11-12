//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Sales Returns - MB routes (hand-written page : NEVER run Code
// Sync for it again)
//===============================================================

export const SalesReturnsMbRoutes:
Routes =
[
    {
        path:'',

        redirectTo:'list',

        pathMatch:'full'
    },

    {
        path:'list',

        data:
        {
            breadcrumb:'Sales Returns - MB'
        },

        loadComponent:() =>
            import(
                '../pages/sales-returns-mb/list/sales-returns-mb-list'
            )
            .then(
                m =>
                    m.SalesReturnsMbList
            )
    },

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Sales Returns - MB'
        },

        loadComponent:() =>
            import(
                '../pages/sales-returns-mb/form/sales-returns-mb-form'
            )
            .then(
                m =>
                    m.SalesReturnsMbForm
            )
    },

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Sales Returns - MB'
        },

        loadComponent:() =>
            import(
                '../pages/sales-returns-mb/form/sales-returns-mb-form'
            )
            .then(
                m =>
                    m.SalesReturnsMbForm
            )
    },

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Sales Returns - MB'
        },

        loadComponent:() =>
            import(
                '../pages/sales-returns-mb/form/sales-returns-mb-form'
            )
            .then(
                m =>
                    m.SalesReturnsMbForm
            )
    }
];
