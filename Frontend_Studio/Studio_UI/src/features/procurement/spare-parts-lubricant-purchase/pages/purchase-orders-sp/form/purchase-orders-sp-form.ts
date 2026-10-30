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
// Purchase Orders - SP Form (Spare Parts & Lubricant Purchase)
//
// The page is the shared Purchase Order form
// (procurement/shared/purchase-order/form); this file only gives
// it this page's config and service.
//===============================================================

@Component(
{
    selector:'purchase-orders-sp-form',

    standalone:true,

    imports:
    [
        PurchaseOrderForm
    ],

    providers:
        purchaseOrderProviders(
            PO_SP_PAGE,
            PurchaseOrdersSpService
        ),

    templateUrl:'./purchase-orders-sp-form.html',

    styleUrl:'./purchase-orders-sp-form.css'
})

export class PurchaseOrdersSpForm
{
}