//===============================================================
// Purchases - MB : print source (Print Engine)
//
//   /print-viewer/purchases-mb/<id>?doc=all
//
// The source and layout are shared by MB / SP / AC
// (procurement/shared/purchase/print); this file gives this
// page's config and service.
//===============================================================

import
{
    PrintSourceDef
}
from '../../../../shared/print/print.models';

import
{
    PUR_MB_PAGE
}
from '../../shared/purchase/purchase.config';

import
{
    PurchasePrintData
}
from '../../shared/purchase/print/purchase.template';

import
{
    purchasePrintSource
}
from '../../shared/purchase/print/purchase.print';

import
{
    PurchasesMbService
}
from '../services/purchases-mb.service';


export const PURCHASES_MB_PRINT:
    PrintSourceDef<PurchasePrintData> =
    purchasePrintSource(
        PUR_MB_PAGE,
        PurchasesMbService
    );
