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
    PUR_AC_PAGE
}
from '../../shared/purchase/purchase.config';


//===============================================================
// Purchases - AC Service (Accessories Purchase)
//
// Everything is in the shared PurchaseService; this page only
// gives its API path.
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class PurchasesAcService
    extends PurchaseService
{
    protected readonly apiPath:
        string =
        PUR_AC_PAGE.apiPath;
}
