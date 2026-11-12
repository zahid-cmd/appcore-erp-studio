//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Sales Returns - SP routes (hand-written page : NEVER run Code
// Sync for it again)
//===============================================================

export const SalesReturnsSpRoutes:
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
            breadcrumb:'Sales Returns - SP'
        },

        loadComponent:() =>
            import(
                '../pages/sales-returns-sp/list/sales-returns-sp-list'
            )
            .then(
                m =>
                    m.SalesReturnsSpList
            )
    },

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Sales Returns - SP'
        },

        loadComponent:() =>
            import(
                '../pages/sales-returns-sp/form/sales-returns-sp-form'
            )
            .then(
                m =>
                    m.SalesReturnsSpForm
            )
    },

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Sales Returns - SP'
        },

        loadComponent:() =>
            import(
                '../pages/sales-returns-sp/form/sales-returns-sp-form'
            )
            .then(
                m =>
                    m.SalesReturnsSpForm
            )
    },

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Sales Returns - SP'
        },

        loadComponent:() =>
            import(
                '../pages/sales-returns-sp/form/sales-returns-sp-form'
            )
            .then(
                m =>
                    m.SalesReturnsSpForm
            )
    }
];
