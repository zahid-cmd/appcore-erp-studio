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
    PO_SERVICE_CENTER_PAGE,
    promotionalOfferProviders
}
from '../../../../shared/promotional-offer/promotional-offer.config';


//===============================================================
// Promotional Offers - Service Center Form (hand-written : NEVER run
// Code Sync for this page)
//
// The page is the shared Promotional Offer form
// (sales-operations/shared/promotional-offer); this file only
// gives it this page's config (PO_SERVICE_CENTER_PAGE).
//===============================================================

@Component(
{
    selector:'promotional-offers-service-center-form',

    standalone:true,

    imports:
    [
        PromotionalOfferForm
    ],

    providers:
        promotionalOfferProviders(
            PO_SERVICE_CENTER_PAGE
        ),

    templateUrl:'./promotional-offers-service-center-form.html',

    styleUrl:'./promotional-offers-service-center-form.css'
})

export class PromotionalOffersServiceCenterForm
{
}
