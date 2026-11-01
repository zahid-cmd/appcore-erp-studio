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
    PurchaseList
}
from '../../../../shared/purchase/list/purchase-list';

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
// Purchases - SP List (Spare Parts & Lubricant Purchase)
//
// The page is the shared Purchase list
// (procurement/shared/purchase/list); this file only gives it
// this page's config and service.
//===============================================================

@Component(
{
    selector:'purchases-sp-list',

    standalone:true,

    imports:
    [
        PurchaseList
    ],

    providers:
        purchaseProviders(
            PUR_SP_PAGE,
            PurchasesSpService
        ),

    templateUrl:'./purchases-sp-list.html',

    styleUrl:'./purchases-sp-list.css'
})

export class PurchasesSpList
{
}
