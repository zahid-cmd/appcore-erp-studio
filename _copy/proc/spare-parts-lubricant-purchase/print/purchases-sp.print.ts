//===============================================================
// Purchases - SP : print source (Print Engine)
//
//   /print-viewer/purchases-sp/<id>?doc=all
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
    PUR_SP_PAGE
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
    PurchasesSpService
}
from '../services/purchases-sp.service';


export const PURCHASES_SP_PRINT:
    PrintSourceDef<PurchasePrintData> =
    purchasePrintSource(
        PUR_SP_PAGE,
        PurchasesSpService
    );
