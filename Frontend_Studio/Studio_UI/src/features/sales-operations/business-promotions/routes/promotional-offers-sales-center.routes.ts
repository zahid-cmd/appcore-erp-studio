//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Promotional Offers - Sales Center routes (hand-written page : NEVER
// run Code Sync for it)
//===============================================================

export const PromotionalOffersSalesCenterRoutes:
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
            breadcrumb:'Promotional Offers - Sales Center'
        },

        loadComponent:() =>
            import(
                '../pages/promotional-offers-sales-center/list/promotional-offers-sales-center-list'
            )
            .then(
                m =>
                    m.PromotionalOffersSalesCenterList
            )
    },

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Promotional Offer'
        },

        loadComponent:() =>
            import(
                '../pages/promotional-offers-sales-center/form/promotional-offers-sales-center-form'
            )
            .then(
                m =>
                    m.PromotionalOffersSalesCenterForm
            )
    },

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Update Promotional Offer'
        },

        loadComponent:() =>
            import(
                '../pages/promotional-offers-sales-center/form/promotional-offers-sales-center-form'
            )
            .then(
                m =>
                    m.PromotionalOffersSalesCenterForm
            )
    },

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Promotional Offer'
        },

        loadComponent:() =>
            import(
                '../pages/promotional-offers-sales-center/form/promotional-offers-sales-center-form'
            )
            .then(
                m =>
                    m.PromotionalOffersSalesCenterForm
            )
    }
];
