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
    PUR_MB_PAGE,
    purchaseProviders
}
from '../../../../shared/purchase/purchase.config';

import
{
    PurchasesMbService
}
from '../../../services/purchases-mb.service';


//===============================================================
// Purchases - MB List (Motor Bike Purchase)
//
// The page is the shared Purchase list
// (procurement/shared/purchase/list); this file only gives it
// this page's config and service.
//===============================================================

@Component(
{
    selector:'purchases-mb-list',

    standalone:true,

    imports:
    [
        PurchaseList
    ],

    providers:
        purchaseProviders(
            PUR_MB_PAGE,
            PurchasesMbService
        ),

    templateUrl:'./purchases-mb-list.html',

    styleUrl:'./purchases-mb-list.css'
})

export class PurchasesMbList
{
}
