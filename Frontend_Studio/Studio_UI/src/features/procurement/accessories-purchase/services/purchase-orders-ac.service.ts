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
    PO_AC_PAGE
}
from '../../shared/purchase-order/purchase-order.config';


//===============================================================
// Purchase Orders - AC Service (Accessories Purchase)
//
// Everything is in the shared PurchaseOrderService; this page
// only gives its API path.
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class PurchaseOrdersAcService
    extends PurchaseOrderService
{
    protected readonly apiPath:
        string =
        PO_AC_PAGE.apiPath;
}