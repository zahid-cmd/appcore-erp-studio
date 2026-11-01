//===============================================================
// Purchase Orders - SP : print source (Print Engine)
//
//   /print-viewer/purchase-orders-sp/<id>?doc=all
//
// The source and layout are shared by MB / SP / AC
// (procurement/shared/purchase-order/print); this file gives this
// page's config and service.
//===============================================================

import
{
    PrintSourceDef
}
from '../../../../shared/print/print.models';

import
{
    PO_SP_PAGE
}
from '../../shared/purchase-order/purchase-order.config';

import
{
    PurchaseOrderPrintData
}
from '../../shared/purchase-order/print/purchase-order.template';

import
{
    purchaseOrderPrintSource
}
from '../../shared/purchase-order/print/purchase-order.print';

import
{
    PurchaseOrdersSpService
}
from '../services/purchase-orders-sp.service';


export const PURCHASE_ORDERS_SP_PRINT:
    PrintSourceDef<PurchaseOrderPrintData> =
    purchaseOrderPrintSource(
        PO_SP_PAGE,
        PurchaseOrdersSpService
    );