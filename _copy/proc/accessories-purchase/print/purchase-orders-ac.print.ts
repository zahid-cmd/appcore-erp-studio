//===============================================================
// Purchase Orders - AC : print source (Print Engine)
//
//   /print-viewer/purchase-orders-ac/<id>?doc=all
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
    PO_AC_PAGE
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
    PurchaseOrdersAcService
}
from '../services/purchase-orders-ac.service';


export const PURCHASE_ORDERS_AC_PRINT:
    PrintSourceDef<PurchaseOrderPrintData> =
    purchaseOrderPrintSource(
        PO_AC_PAGE,
        PurchaseOrdersAcService
    );