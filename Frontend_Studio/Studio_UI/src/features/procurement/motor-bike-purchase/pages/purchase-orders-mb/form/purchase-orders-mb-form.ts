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
// Purchase Orders - MB Form (Motor Bike Purchase)
//
// The page is the shared Purchase Order form
// (procurement/shared/purchase-order/form); this file only gives
// it this page's config and service.
//===============================================================

@Component(
{
    selector:'purchase-orders-mb-form',

    standalone:true,

    imports:
    [
        PurchaseOrderForm
    ],

    providers:
        purchaseOrderProviders(
            PO_MB_PAGE,
            PurchaseOrdersMbService
        ),

    templateUrl:'./purchase-orders-mb-form.html',

    styleUrl:'./purchase-orders-mb-form.css'
})

export class PurchaseOrdersMbForm
{
}