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
    PurchaseForm
}
from '../../../../shared/purchase/form/purchase-form';

import
{
    PUR_SP_PAGE,
    purchaseProviders
}
from '../../../../shared/purchase/purchase.config';

import
{
    PurchasesSpService
}
from '../../../services/purchases-sp.service';


//===============================================================
// Purchases - SP Form (Spare Parts & Lubricant Purchase)
//
// The page is the shared Purchase form
// (procurement/shared/purchase/form); this file only gives it
// this page's config and service.
//===============================================================

@Component(
{
    selector:'purchases-sp-form',

    standalone:true,

    imports:
    [
        PurchaseForm
    ],

    providers:
        purchaseProviders(
            PUR_SP_PAGE,
            PurchasesSpService
        ),

    templateUrl:'./purchases-sp-form.html',

    styleUrl:'./purchases-sp-form.css'
})

export class PurchasesSpForm
{
}
