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
// Purchases - AC Form (Accessories Purchase)
//
// The page is the shared Purchase form
// (procurement/shared/purchase/form); this file only gives it
// this page's config and service.
//===============================================================

@Component(
{
    selector:'purchases-ac-form',

    standalone:true,

    imports:
    [
        PurchaseForm
    ],

    providers:
        purchaseProviders(
            PUR_AC_PAGE,
            PurchasesAcService
        ),

    templateUrl:'./purchases-ac-form.html',

    styleUrl:'./purchases-ac-form.css'
})

export class PurchasesAcForm
{
}
