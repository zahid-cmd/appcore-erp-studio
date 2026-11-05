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
    PurchaseOrderList
}
from '../../../../shared/purchase-order/list/purchase-order-list';

import
{
    PO_SP_PAGE,
    purchaseOrderProviders
}
from '../../../../shared/purchase-order/purchase-order.config';

import
{
    PurchaseOrdersSpService
}
from '../../../services/purchase-orders-sp.service';


//===============================================================
// Purchase Orders - SP List (Spare Parts & Lubricant Purchase)
//
// The page is the shared Purchase Order list
// (procurement/shared/purchase-order/list); this file only gives
// it this page's config and service.
//===============================================================

@Component(
{
    selector:'purchase-orders-sp-list',

    standalone:true,

    imports:
    [
        PurchaseOrderList
    ],

    providers:
        purchaseOrderProviders(
            PO_SP_PAGE,
            PurchaseOrdersSpService
        ),

    templateUrl:'./purchase-orders-sp-list.html',

    styleUrl:'./purchase-orders-sp-list.css'
})

export class PurchaseOrdersSpList
{
}