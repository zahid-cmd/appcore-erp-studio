//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Submenu Routes : Accessories Purchase › Purchases
//===============================================================

export const PurchasesAcRoutes:
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
                '../pages/purchases-ac/list/purchases-ac-list'
            )
            .then(
                m =>
                    m.PurchasesAcList
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
                '../pages/purchases-ac/form/purchases-ac-form'
            )
            .then(
                m =>
                    m.PurchasesAcForm
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
                '../pages/purchases-ac/form/purchases-ac-form'
            )
            .then(
                m =>
                    m.PurchasesAcForm
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
                '../pages/purchases-ac/form/purchases-ac-form'
            )
            .then(
                m =>
                    m.PurchasesAcForm
            )
    }
];
