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
    PO_MB_PAGE,
    purchaseOrderProviders
}
from '../../../../shared/purchase-order/purchase-order.config';

import
{
    PurchaseOrdersMbService
}
from '../../../services/purchase-orders-mb.service';


//===============================================================
// Purchase Orders - MB List (Motor Bike Purchase)
//
// The page is the shared Purchase Order list
// (procurement/shared/purchase-order/list); this file only gives
// it this page's config and service.
//===============================================================

@Component(
{
    selector:'purchase-orders-mb-list',

    standalone:true,

    imports:
    [
        PurchaseOrderList
    ],

    providers:
        purchaseOrderProviders(
            PO_MB_PAGE,
            PurchaseOrdersMbService
        ),

    templateUrl:'./purchase-orders-mb-list.html',

    styleUrl:'./purchase-orders-mb-list.css'
})

export class PurchaseOrdersMbList
{
}