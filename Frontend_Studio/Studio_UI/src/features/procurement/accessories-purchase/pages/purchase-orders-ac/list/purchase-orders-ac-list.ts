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
    PO_AC_PAGE,
    purchaseOrderProviders
}
from '../../../../shared/purchase-order/purchase-order.config';

import
{
    PurchaseOrdersAcService
}
from '../../../services/purchase-orders-ac.service';


//===============================================================
// Purchase Orders - AC List (Accessories Purchase)
//
// The page is the shared Purchase Order list
// (procurement/shared/purchase-order/list); this file only gives
// it this page's config and service.
//===============================================================

@Component(
{
    selector:'purchase-orders-ac-list',

    standalone:true,

    imports:
    [
        PurchaseOrderList
    ],

    providers:
        purchaseOrderProviders(
            PO_AC_PAGE,
            PurchaseOrdersAcService
        ),

    templateUrl:'./purchase-orders-ac-list.html',

    styleUrl:'./purchase-orders-ac-list.css'
})

export class PurchaseOrdersAcList
{
}