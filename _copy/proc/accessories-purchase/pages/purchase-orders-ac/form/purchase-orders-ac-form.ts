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
    PurchaseOrderForm
}
from '../../../../shared/purchase-order/form/purchase-order-form';

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
// Purchase Orders - AC Form (Accessories Purchase)
//
// The page is the shared Purchase Order form
// (procurement/shared/purchase-order/form); this file only gives
// it this page's config and service.
//===============================================================

@Component(
{
    selector:'purchase-orders-ac-form',

    standalone:true,

    imports:
    [
        PurchaseOrderForm
    ],

    providers:
        purchaseOrderProviders(
            PO_AC_PAGE,
            PurchaseOrdersAcService
        ),

    templateUrl:'./purchase-orders-ac-form.html',

    styleUrl:'./purchase-orders-ac-form.css'
})

export class PurchaseOrdersAcForm
{
}