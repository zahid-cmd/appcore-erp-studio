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
    PO_SALES_CENTER_PAGE,
    promotionalOfferProviders
}
from '../../../../shared/promotional-offer/promotional-offer.config';


//===============================================================
// Promotional Offers - Sales Center List (hand-written : NEVER run
// Code Sync for this page)
//
// The page is the shared Promotional Offer list
// (sales-operations/shared/promotional-offer); this file only
// gives it this page's config (PO_SALES_CENTER_PAGE).
//===============================================================

@Component(
{
    selector:'promotional-offers-sales-center-list',

    standalone:true,

    imports:
    [
        PromotionalOfferList
    ],

    providers:
        promotionalOfferProviders(
            PO_SALES_CENTER_PAGE
        ),

    templateUrl:'./promotional-offers-sales-center-list.html',

    styleUrl:'./promotional-offers-sales-center-list.css'
})

export class PromotionalOffersSalesCenterList
{
}
