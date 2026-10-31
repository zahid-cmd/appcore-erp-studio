//===============================================================
// Motor Bike Stock : print source (Stock Position)
//   /print-viewer/motor-bike-stock/<token>?doc=all
//===============================================================

import
{
    PrintSourceDef
}
from '../../../../shared/print/print.models';

import
{
    STOCK_MB_PAGE
}
from '../shared/inventory-stock.config';

import
{
    StockPrintData,
    inventoryStockPrintSource
}
from '../shared/print/inventory-stock.print';


export const MOTOR_BIKE_STOCK_PRINT:
    PrintSourceDef<StockPrintData> =
    inventoryStockPrintSource(
        STOCK_MB_PAGE
    );
