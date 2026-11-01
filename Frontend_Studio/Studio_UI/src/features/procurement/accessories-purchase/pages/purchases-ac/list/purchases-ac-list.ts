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
    PUR_AC_PAGE,
    purchaseProviders
}
from '../../../../shared/purchase/purchase.config';

import
{
    PurchasesAcService
}
from '../../../services/purchases-ac.service';


//===============================================================
// Purchases - AC List (Accessories Purchase)
//
// The page is the shared Purchase list
// (procurement/shared/purchase/list); this file only gives it
// this page's config and service.
//===============================================================

@Component(
{
    selector:'purchases-ac-list',

    standalone:true,

    imports:
    [
        PurchaseList
    ],

    providers:
        purchaseProviders(
            PUR_AC_PAGE,
            PurchasesAcService
        ),

    templateUrl:'./purchases-ac-list.html',

    styleUrl:'./purchases-ac-list.css'
})

export class PurchasesAcList
{
}
