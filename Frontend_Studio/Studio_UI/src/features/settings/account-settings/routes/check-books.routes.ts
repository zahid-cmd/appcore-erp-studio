//===============================================================
// Check Books routes (hand-written page : NEVER run Code Sync for
// it). Wired by the MANUAL block in account-settings.routes.ts.
//===============================================================

import
{
    Routes
}
from '@angular/router';

export const CheckBooksRoutes:
Routes =
[
    {
        path:'',
        redirectTo:'list',
        pathMatch:'full'
    },
    {
        path:'list',
        data:{ breadcrumb:'Check Books' },
        loadComponent:() =>
            import('../pages/check-books/list/check-books-list')
                .then(m => m.CheckBooksList)
    },
    {
        path:'add',
        data:{ breadcrumb:'Add Check Book' },
        loadComponent:() =>
            import('../pages/check-books/form/check-books-form')
                .then(m => m.CheckBooksForm)
    },
    {
        path:'edit/:id',
        data:{ breadcrumb:'Edit Check Book' },
        loadComponent:() =>
            import('../pages/check-books/form/check-books-form')
                .then(m => m.CheckBooksForm)
    },
    {
        path:'view/:id',
        data:{ breadcrumb:'View Check Book' },
        loadComponent:() =>
            import('../pages/check-books/form/check-books-form')
                .then(m => m.CheckBooksForm)
    }
];
