//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Submenu Routes : Motor Bike Purchase › Purchases
//===============================================================

export const PurchasesMbRoutes:
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
                '../pages/purchases-mb/list/purchases-mb-list'
            )
            .then(
                m =>
                    m.PurchasesMbList
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
                '../pages/purchases-mb/form/purchases-mb-form'
            )
            .then(
                m =>
                    m.PurchasesMbForm
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
                '../pages/purchases-mb/form/purchases-mb-form'
            )
            .then(
                m =>
                    m.PurchasesMbForm
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
                '../pages/purchases-mb/form/purchases-mb-form'
            )
            .then(
                m =>
                    m.PurchasesMbForm
            )
    }
];
