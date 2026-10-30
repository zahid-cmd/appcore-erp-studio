//===============================================================
// Purchases - AC : print source (Print Engine)
//
//   /print-viewer/purchases-ac/<id>?doc=all
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
    PUR_AC_PAGE
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
    PurchasesAcService
}
from '../services/purchases-ac.service';


export const PURCHASES_AC_PRINT:
    PrintSourceDef<PurchasePrintData> =
    purchasePrintSource(
        PUR_AC_PAGE,
        PurchasesAcService
    );
