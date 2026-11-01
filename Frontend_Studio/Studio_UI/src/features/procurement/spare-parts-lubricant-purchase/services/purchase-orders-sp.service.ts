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
    PO_SP_PAGE
}
from '../../shared/purchase-order/purchase-order.config';


//===============================================================
// Purchase Orders - SP Service (Spare Parts & Lubricant Purchase)
//
// Everything is in the shared PurchaseOrderService; this page
// only gives its API path.
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class PurchaseOrdersSpService
    extends PurchaseOrderService
{
    protected readonly apiPath:
        string =
        PO_SP_PAGE.apiPath;
}