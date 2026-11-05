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
    PurchaseOrderService
}
from '../../shared/purchase-order/purchase-order.service';

import
{
    PO_MB_PAGE
}
from '../../shared/purchase-order/purchase-order.config';


//===============================================================
// Purchase Orders - MB Service (Motor Bike Purchase)
//
// Everything is in the shared PurchaseOrderService; this page
// only gives its API path.
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class PurchaseOrdersMbService
    extends PurchaseOrderService
{
    protected readonly apiPath:
        string =
        PO_MB_PAGE.apiPath;
}