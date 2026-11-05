//===============================================================
// Imports
//===============================================================

import
{
    Injectable
}
from '@angular/core';

import
{
    PurchaseService
}
from '../../shared/purchase/purchase.service';

import
{
    PUR_SP_PAGE
}
from '../../shared/purchase/purchase.config';


//===============================================================
// Purchases - SP Service (Spare Parts & Lubricant Purchase)
//
// Everything is in the shared PurchaseService; this page only
// gives its API path.
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class PurchasesSpService
    extends PurchaseService
{
    protected readonly apiPath:
        string =
        PUR_SP_PAGE.apiPath;
}
