//===============================================================
// Imports
//===============================================================

import
{
    Injectable,
    inject
}
from '@angular/core';

import
{
    HttpClient
}
from '@angular/common/http';

import
{
    Observable,
    map
}
from 'rxjs';

import
{
    environment
}
from '../../../../environments/environment';

import
{
    BarcodeDocument,
    BarcodeHistoryInput,
    BarcodeHistorySaved,
    BarcodeRow,
    BarcodeRowsFilter,
    BarcodeSettings,
    BarcodeSource,
    BarcodeUnit,
    BrandAs,
    LabelPaperCode,
    labelPaper
}
from '../models/barcode-management.model';


//===============================================================
// Barcode Management service
//
//   GET  <api>/settings?type=            switches + pickers
//   GET  <api>/documents?type=&source=   price changes / purchases
//   POST <api>/rows                      batches of a source
//   GET  <api>/units?purchaseId=         bikes of a purchase
//   POST <api>/units                     bikes of a source
//   POST <api>/history                   print run (needs "Print")
//
// The API answers in camelCase; mapped to PascalCase.
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class BarcodeManagementService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/inventory-management/pricing-labels/barcode-management`;

    getSettings
    (
        type:
            string
    ):
        Observable<BarcodeSettings>
    {
        return this.http
            .get<any>(`${this.apiUrl}/settings`, { params:{ type } })
            .pipe(map(toSettings));
    }

    getDocuments
    (
        type:
            string,
        source:
            BarcodeSource
    ):
        Observable<BarcodeDocument[]>
    {
        return this.http
            .get<any>(`${this.apiUrl}/documents`, { params:{ type, source } })
            .pipe(
                map
                (
                    x =>
                        list(x).map
                        (
                            d =>
                            ({
                                Id:num(pick(d, 'Id')),
                                No:text(pick(d, 'No')),
                                Date:text(pick(d, 'Date')),
                                Party:text(pick(d, 'Party')),
                                Lines:num(pick(d, 'Lines')),
                                TotalLines:num(pick(d, 'TotalLines')),
                                Units:num(pick(d, 'Units'))
                            })
                        )
                )
            );
    }

    getRows
    (
        filter:
            BarcodeRowsFilter
    ):
        Observable<BarcodeRow[]>
    {
        return this.http
            .post<any>(`${this.apiUrl}/rows`, filter)
            .pipe(map(x => list(x).map(toRow)));
    }

    getUnitsByPurchase
    (
        purchaseId:
            number
    ):
        Observable<BarcodeUnit[]>
    {
        return this.http
            .get<any>(`${this.apiUrl}/units`, { params:{ purchaseId:String(purchaseId) } })
            .pipe(map(x => list(x).map(toUnit)));
    }

    getUnits
    (
        filter:
            BarcodeRowsFilter
    ):
        Observable<BarcodeUnit[]>
    {
        return this.http
            .post<any>(`${this.apiUrl}/units`, filter)
            .pipe(map(x => list(x).map(toUnit)));
    }

    saveHistory
    (
        input:
            BarcodeHistoryInput
    ):
        Observable<BarcodeHistorySaved>
    {
        return this.http
            .post<any>(`${this.apiUrl}/history`, input)
            .pipe(
                map
                (
                    x =>
                    ({
                        Saved:!!pick(x, 'Saved'),
                        RunId:num(pick(x, 'RunId')),
                        Labels:num(pick(x, 'Labels'))
                    })
                )
            );
    }
}


//===============================================================
// Mapping (camelCase or PascalCase in)
//===============================================================

function pick
(
    source:
        any,
    name:
        string
):
    any
{
    if
    (
        !source
    )
    {
        return undefined;
    }

    const camel =
        name.charAt(0).toLowerCase() + name.slice(1);

    return source[name] ?? source[camel];
}

function text
(
    value:
        any
):
    string
{
    return value === null || value === undefined
        ? ''
        : String(value);
}

function num
(
    value:
        any
):
    number
{
    return Number(value) || 0;
}

function list
(
    value:
        any
):
    any[]
{
    return Array.isArray(value)
        ? value
        : [];
}

// A switch missing from the answer keeps its default
function flag
(
    value:
        any,
    fallback:
        boolean
):
    boolean
{
    return value === undefined || value === null
        ? fallback
        : !!value;
}

function toSettings
(
    x:
        any
):
    BarcodeSettings
{
    const brandAs:
        BrandAs =
        text(pick(x, 'BrandAs')).toLowerCase() === 'logo'
            ? 'Logo'
            : 'Name';

    const paper:
        LabelPaperCode =
        labelPaper(text(pick(x, 'DefaultPaper'))).code;

    return {
        PageType:text(pick(x, 'PageType')),
        Today:text(pick(x, 'Today')),
        PrintMrp:flag(pick(x, 'PrintMrp'), true),
        MrpFormat:text(pick(x, 'MrpFormat')) || 'MRP {0}',
        ShowName:flag(pick(x, 'ShowName'), true),
        ShowPartNumber:flag(pick(x, 'ShowPartNumber'), true),
        ShowBrand:flag(pick(x, 'ShowBrand'), true),
        BrandAs:brandAs,
        ShowBatch:flag(pick(x, 'ShowBatch'), false),
        ShowDate:flag(pick(x, 'ShowDate'), false),
        ShowCode128:flag(pick(x, 'ShowCode128'), true),
        ShowQr:flag(pick(x, 'ShowQr'), true),
        DefaultPaper:paper,
        KeepHistory:flag(pick(x, 'KeepHistory'), true),
        Brands:list(pick(x, 'Brands')).map
        (
            b =>
            ({
                Id:num(pick(b, 'Id')),
                Name:text(pick(b, 'Name')),
                LogoPath:text(pick(b, 'LogoPath'))
            })
        ),
        Categories:list(pick(x, 'Categories')).map
        (
            c =>
            ({
                Id:num(pick(c, 'Id')),
                Name:text(pick(c, 'Name')),
                BrandId:num(pick(c, 'BrandId'))
            })
        ),
        Products:list(pick(x, 'Products')).map
        (
            p =>
            ({
                Id:num(pick(p, 'Id')),
                Code:text(pick(p, 'Code')),
                Name:text(pick(p, 'Name')),
                PartNumber:text(pick(p, 'PartNumber')),
                BrandId:num(pick(p, 'BrandId')),
                CategoryId:num(pick(p, 'CategoryId')),
                Stock:num(pick(p, 'Stock')),
                BatchCount:num(pick(p, 'BatchCount'))
            })
        )
    };
}

function toRow
(
    x:
        any
):
    BarcodeRow
{
    return {
        StockBatchId:num(pick(x, 'StockBatchId')),
        BatchNo:text(pick(x, 'BatchNo')),
        ProductId:num(pick(x, 'ProductId')),
        Code:text(pick(x, 'Code')),
        Name:text(pick(x, 'Name')),
        PartNumber:text(pick(x, 'PartNumber')),
        BrandId:num(pick(x, 'BrandId')),
        BrandName:text(pick(x, 'BrandName')),
        BrandLogo:text(pick(x, 'BrandLogo')),
        Unit:text(pick(x, 'Unit')),
        Mrp:num(pick(x, 'Mrp')),
        Stock:num(pick(x, 'Stock')),
        DefaultQty:num(pick(x, 'DefaultQty')),
        BarcodeValue:text(pick(x, 'BarcodeValue')),
        SourceNo:text(pick(x, 'SourceNo')),
        BatchDate:text(pick(x, 'BatchDate')),
        BranchName:text(pick(x, 'BranchName'))
    };
}

function toUnit
(
    x:
        any
):
    BarcodeUnit
{
    return {
        UnitId:num(pick(x, 'UnitId')),
        StockBatchId:num(pick(x, 'StockBatchId')),
        BatchNo:text(pick(x, 'BatchNo')),
        ProductId:num(pick(x, 'ProductId')),
        Code:text(pick(x, 'Code')),
        Model:text(pick(x, 'Model')),
        Color:text(pick(x, 'Color')),
        ChassisNo:text(pick(x, 'ChassisNo')),
        EngineNo:text(pick(x, 'EngineNo')),
        KeyNo:text(pick(x, 'KeyNo')),
        BatteryNo:text(pick(x, 'BatteryNo')),
        BrandName:text(pick(x, 'BrandName')),
        BrandLogo:text(pick(x, 'BrandLogo')),
        Mrp:num(pick(x, 'Mrp')),
        BarcodeValue:text(pick(x, 'BarcodeValue')),
        QrValue:text(pick(x, 'QrValue')),
        SourceNo:text(pick(x, 'SourceNo')),
        StockInDate:text(pick(x, 'StockInDate')),
        BranchName:text(pick(x, 'BranchName'))
    };
}
