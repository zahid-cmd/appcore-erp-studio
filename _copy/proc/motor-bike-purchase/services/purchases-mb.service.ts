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
    PUR_MB_PAGE
}
from '../../shared/purchase/purchase.config';


//===============================================================
// Purchases - MB Service (Motor Bike Purchase)
//
// Everything is in the shared PurchaseService; this page only
// gives its API path.
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class PurchasesMbService
    extends PurchaseService
{
    protected readonly apiPath:
        string =
        PUR_MB_PAGE.apiPath;
}
