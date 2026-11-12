//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


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
    // Promotional Offers - Service Center
    //===========================================================

    {
        path:'promotional-offers-service-center',

        data:
        {
            breadcrumb:'Promotional Offers - Service Center'
        },

        loadChildren:() =>
            import(
                './promotional-offers-service-center.routes'
            )
            .then(
                m =>
                    m.PromotionalOffersServiceCenterRoutes
            )
    },

    //===========================================================
    // Promotional Offers - Accessory Shop
    //===========================================================

    {
        path:'promotional-offers-accessory-shop',

        data:
        {
            breadcrumb:'Promotional Offers - Accessory Shop'
        },

        loadChildren:() =>
            import(
                './promotional-offers-accessory-shop.routes'
            )
            .then(
                m =>
                    m.PromotionalOffersAccessoryShopRoutes
            )
    }
];
