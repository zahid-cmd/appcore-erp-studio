//===============================================================
// Accessories Stock : print source (Stock Position)
//   /print-viewer/accessories-stock/<token>?doc=all
//===============================================================

import
{
    PrintSourceDef
}
from '../../../../shared/print/print.models';

import
{
    STOCK_AC_PAGE
}
from '../shared/inventory-stock.config';

import
{
    StockPrintData,
    inventoryStockPrintSource
}
from '../shared/print/inventory-stock.print';


export const ACCESSORIES_STOCK_PRINT:
    PrintSourceDef<StockPrintData> =
    inventoryStockPrintSource(
        STOCK_AC_PAGE
    );
