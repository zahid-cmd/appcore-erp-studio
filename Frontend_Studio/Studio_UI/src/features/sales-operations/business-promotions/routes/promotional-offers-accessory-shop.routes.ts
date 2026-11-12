//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Promotional Offers - Accessory Shop routes (hand-written page : NEVER
// run Code Sync for it)
//===============================================================

export const PromotionalOffersAccessoryShopRoutes:
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
            breadcrumb:'Promotional Offers - Accessory Shop'
        },

        loadComponent:() =>
            import(
                '../pages/promotional-offers-accessory-shop/list/promotional-offers-accessory-shop-list'
            )
            .then(
                m =>
                    m.PromotionalOffersAccessoryShopList
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
                '../pages/promotional-offers-accessory-shop/form/promotional-offers-accessory-shop-form'
            )
            .then(
                m =>
                    m.PromotionalOffersAccessoryShopForm
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
                '../pages/promotional-offers-accessory-shop/form/promotional-offers-accessory-shop-form'
            )
            .then(
                m =>
                    m.PromotionalOffersAccessoryShopForm
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
                '../pages/promotional-offers-accessory-shop/form/promotional-offers-accessory-shop-form'
            )
            .then(
                m =>
                    m.PromotionalOffersAccessoryShopForm
            )
    }
];
