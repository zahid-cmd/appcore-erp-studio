//===============================================================
// Imports
//===============================================================

import
{
    Component
}
from '@angular/core';

import
{
    PromotionalOfferForm
}
from '../../../../shared/promotional-offer/form/promotional-offer-form';

import
{
    PO_ACCESSORY_SHOP_PAGE,
    promotionalOfferProviders
}
from '../../../../shared/promotional-offer/promotional-offer.config';


//===============================================================
// Promotional Offers - Accessory Shop Form (hand-written : NEVER run
// Code Sync for this page)
//
// The page is the shared Promotional Offer form
// (sales-operations/shared/promotional-offer); this file only
// gives it this page's config (PO_ACCESSORY_SHOP_PAGE).
//===============================================================

@Component(
{
    selector:'promotional-offers-accessory-shop-form',

    standalone:true,

    imports:
    [
        PromotionalOfferForm
    ],

    providers:
        promotionalOfferProviders(
            PO_ACCESSORY_SHOP_PAGE
        ),

    templateUrl:'./promotional-offers-accessory-shop-form.html',

    styleUrl:'./promotional-offers-accessory-shop-form.css'
})

export class PromotionalOffersAccessoryShopForm
{
}
