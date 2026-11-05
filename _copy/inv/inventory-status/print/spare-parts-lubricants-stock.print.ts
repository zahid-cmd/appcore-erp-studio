//===============================================================
// Spare Parts & Lubricants Stock : print source (Stock Position)
//   /print-viewer/spare-parts-lubricants-stock/<token>?doc=all
//===============================================================

import
{
    PrintSourceDef
}
from '../../../../shared/print/print.models';

import
{
    STOCK_SP_PAGE
}
from '../shared/inventory-stock.config';

import
{
    StockPrintData,
    inventoryStockPrintSource
}
from '../shared/print/inventory-stock.print';


export const SPARE_PARTS_LUBRICANTS_STOCK_PRINT:
    PrintSourceDef<StockPrintData> =
    inventoryStockPrintSource(
        STOCK_SP_PAGE
    );
