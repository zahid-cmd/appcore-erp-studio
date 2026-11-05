//===============================================================
// Purchase Orders - MB : print source (Print Engine)
//
//   /print-viewer/purchase-orders-mb/<id>?doc=all
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
    PO_MB_PAGE
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
    PurchaseOrdersMbService
}
from '../services/purchase-orders-mb.service';


export const PURCHASE_ORDERS_MB_PRINT:
    PrintSourceDef<PurchaseOrderPrintData> =
    purchaseOrderPrintSource(
        PO_MB_PAGE,
        PurchaseOrdersMbService
    );