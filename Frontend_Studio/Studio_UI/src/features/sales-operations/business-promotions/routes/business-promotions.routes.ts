//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';

import
{
    moved
}
from '../../../../shared/utils/moved-route';


//===============================================================
// Business Promotions routes (hand-written : NEVER run Code Sync
// for these pages). Each Promotional Offers page has its own
// list / form wrapper (pages/...) around the shared Promotional
// Offer list and form (sales-operations/shared/promotional-offer).
//===============================================================

export const businessPromotionsRoutes:
Routes =
[
    {
        path:'',

        redirectTo:'promotional-offers-sales-center',

        pathMatch:'full'
    },

    //===========================================================
    // Promotional Offers - Sales Center
    //===========================================================

    {
        path:'promotional-offers-sales-center',

        data:
        {
            breadcrumb:'Promotional Offers - Sales Center'
        },

        loadChildren:() =>
            import(
                './promotional-offers-sales-center.routes'
            )
            .then(
                m =>
                    m.PromotionalOffersSalesCenterRoutes
            )
    },

    //===========================================================
    // Moved 2026-11-15 : the old addresses open the new ones.
    //   Service Center offers -> Service Operations
    //   Accessory Shop offers -> Accessories Operations
    //===========================================================

    moved('promotional-offers-service-center', '/service-operations/business-promotions/promotional-offers-service-center'),

    moved('promotional-offers-accessory-shop', '/accessories-operations/business-promotions/promotional-offers-accessory-shop')
];
