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
    PromotionalOfferList
}
from '../../../../shared/promotional-offer/list/promotional-offer-list';

import
{
    PO_ACCESSORY_SHOP_PAGE,
    promotionalOfferProviders
}
from '../../../../shared/promotional-offer/promotional-offer.config';


//===============================================================
// Promotional Offers - Accessory Shop List (hand-written : NEVER run
// Code Sync for this page)
//
// The page is the shared Promotional Offer list
// (sales-operations/shared/promotional-offer); this file only
// gives it this page's config (PO_ACCESSORY_SHOP_PAGE).
//===============================================================

@Component(
{
    selector:'promotional-offers-accessory-shop-list',

    standalone:true,

    imports:
    [
        PromotionalOfferList
    ],

    providers:
        promotionalOfferProviders(
            PO_ACCESSORY_SHOP_PAGE
        ),

    templateUrl:'./promotional-offers-accessory-shop-list.html',

    styleUrl:'./promotional-offers-accessory-shop-list.css'
})

export class PromotionalOffersAccessoryShopList
{
}
