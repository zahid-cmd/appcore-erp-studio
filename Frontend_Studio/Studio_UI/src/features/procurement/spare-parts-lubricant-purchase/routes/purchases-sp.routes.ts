//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Submenu Routes : Spare Parts & Lubricant Purchase › Purchases
//===============================================================

export const PurchasesSpRoutes:
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
            breadcrumb:'Purchases'
        },

        loadComponent:() =>
            import(
                '../pages/purchases-sp/list/purchases-sp-list'
            )
            .then(
                m =>
                    m.PurchasesSpList
            )
    },

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Purchase'
        },

        loadComponent:() =>
            import(
                '../pages/purchases-sp/form/purchases-sp-form'
            )
            .then(
                m =>
                    m.PurchasesSpForm
            )
    },

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Purchase'
        },

        loadComponent:() =>
            import(
                '../pages/purchases-sp/form/purchases-sp-form'
            )
            .then(
                m =>
                    m.PurchasesSpForm
            )
    },

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Purchase'
        },

        loadComponent:() =>
            import(
                '../pages/purchases-sp/form/purchases-sp-form'
            )
            .then(
                m =>
                    m.PurchasesSpForm
            )
    }
];
