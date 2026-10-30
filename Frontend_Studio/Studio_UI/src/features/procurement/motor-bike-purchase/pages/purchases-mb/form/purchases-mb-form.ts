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
// Purchases - MB Form (Motor Bike Purchase)
//
// The page is the shared Purchase form
// (procurement/shared/purchase/form); this file only gives it
// this page's config and service.
//===============================================================

@Component(
{
    selector:'purchases-mb-form',

    standalone:true,

    imports:
    [
        PurchaseForm
    ],

    providers:
        purchaseProviders(
            PUR_MB_PAGE,
            PurchasesMbService
        ),

    templateUrl:'./purchases-mb-form.html',

    styleUrl:'./purchases-mb-form.css'
})

export class PurchasesMbForm
{
}
