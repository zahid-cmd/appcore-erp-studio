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
    PagedResult,
    toPagedParams,
    toPagedResult
}
from '../../../../shared/paging/paged-result.model';

import
{
    CreateOpeningStock,
    OpeningStock,
    OpeningStockDefaults,
    OpeningStockLine,
    OpeningStockSaved,
    OpeningStockUnit,
    OpeningStockUnitTaken,
    OpeningStockVatRule
}
from '../models/opening-stock.model';


//===============================================================
// Opening Stock service
//
//   GET    <api>?type=                 documents ('' = all types)
//   GET    <api>/defaults?type=
//   POST   <api>/unit-check            { PageType, OpeningStockId, Units }
//   GET    <api>/{id}
//   POST   <api>                       save draft
//   PUT    <api>/{id}                  change draft
//   DELETE <api>/{id}                  delete draft
//   PUT    <api>/{publicId}/post       post (save and actions by uuid)
//   PUT    <api>/{publicId}/cancel     { Reason }
//   PUT    <api>/restore                last deleted draft
//   GET    <api>/history · <api>/{publicId}/history
//
// The API answers in camelCase; mapped to PascalCase.
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class OpeningStockService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/inventory-management/store-setup/opening-stock`;


    getAll
    (
        type:
            string = ''
    ):
        Observable<OpeningStock[]>
    {
        return this.http
            .get<any[]>(this.apiUrl, { params:{ type } })
            .pipe(map(x => list(x).map(toOpeningStock)));
    }

    // One list page : tab / type / search / sort / page on the
    // server ; counts = All · <status> · Type_<type> · Type_All
    getPaged
    (
        query:
            Record<string, unknown>
    ):
        Observable<PagedResult<any>>
    {
        return this.http
            .get<any>(`${this.apiUrl}/paged`, { params:toPagedParams({ ...query }) })
            .pipe(map(raw => toPagedResult(raw, toOpeningStock)));
    }


    getById
    (
        id:
            string
    ):
        Observable<OpeningStock>
    {
        return this.http
            .get<any>(`${this.apiUrl}/${id}`)
            .pipe(map(toOpeningStock));
    }


    getDefaults
    (
        type:
            string
    ):
        Observable<OpeningStockDefaults>
    {
        return this.http
            .get<any>(`${this.apiUrl}/defaults`, { params:{ type } })
            .pipe(
                map
                (
                    x =>
                    ({
                        PageType:text(pick(x, 'PageType')),
                        Today:text(pick(x, 'Today')),
                        LedgerLocked:pick(x, 'LedgerLocked') !== false,
                        VatIncluded:!!pick(x, 'VatIncluded'),
                        ProfitOnSale:!!pick(x, 'ProfitOnSale'),
                        PurchaseVatApplicable:pick(x, 'PurchaseVatApplicable') !== false,
                        SalesVatApplicable:pick(x, 'SalesVatApplicable') !== false,
                        PurchaseVatRules:list(pick(x, 'PurchaseVatRules')).map(toVatRule),
                        SalesVatRules:list(pick(x, 'SalesVatRules')).map(toVatRule),

                        Branches:list(pick(x, 'Branches')).map
                        (
                            b =>
                            ({
                                Id:num(pick(b, 'Id')),
                                Code:text(pick(b, 'Code')),
                                Name:text(pick(b, 'Name')),
                                NextNumber:text(pick(b, 'NextNumber'))
                            })
                        ),
                        DefaultLedgerCode:text(pick(x, 'DefaultLedgerCode')),
                        UnitsRequired:!!pick(x, 'UnitsRequired'),
                        UniqueKeyNo:!!pick(x, 'UniqueKeyNo'),
                        UniqueBatteryNo:!!pick(x, 'UniqueBatteryNo'),

                        Warehouses:list(pick(x, 'Warehouses')).map
                        (
                            w =>
                            ({
                                Id:num(pick(w, 'Id')),
                                BranchId:num(pick(w, 'BranchId')),
                                BranchName:text(pick(w, 'BranchName')),
                                Code:text(pick(w, 'Code')),
                                Name:text(pick(w, 'Name')),
                                IsDefault:!!pick(w, 'IsDefault')
                            })
                        ),

                        Racks:list(pick(x, 'Racks')).map
                        (
                            r =>
                            ({
                                Id:num(pick(r, 'Id')),
                                WarehouseId:num(pick(r, 'WarehouseId')),
                                Code:text(pick(r, 'Code')),
                                Name:text(pick(r, 'Name')),
                                ShelfCount:num(pick(r, 'ShelfCount')),
                                ZoneCode:text(pick(r, 'ZoneCode')),
                                ZoneName:text(pick(r, 'ZoneName')),
                                Shelves:list(pick(r, 'Shelves')).map
                                (
                                    s =>
                                    ({
                                        ShelfNumber:num(pick(s, 'ShelfNumber')),
                                        ShelfLabel:text(pick(s, 'ShelfLabel')),
                                        BinCount:num(pick(s, 'BinCount')) || 1
                                    })
                                )
                            })
                        ),

                        Products:list(pick(x, 'Products')).map
                        (
                            p =>
                            ({
                                Id:num(pick(p, 'Id')),
                                Code:text(pick(p, 'Code')),
                                Name:text(pick(p, 'Name')),
                                Unit:text(pick(p, 'Unit')),
                                CategoryName:text(pick(p, 'CategoryName')),
                                SubCategoryName:text(pick(p, 'SubCategoryName')),
                                HasLedger:!!pick(p, 'HasLedger'),
                                LastCost:num(pick(p, 'LastCost')),
                                LastMrp:num(pick(p, 'LastMrp')),
                                VatType:text(pick(p, 'VatType')),
                                Shelves:list(pick(p, 'Shelves')).map
                                (
                                    s =>
                                    ({
                                        WarehouseId:num(pick(s, 'WarehouseId')),
                                        RackManagementId:num(pick(s, 'RackManagementId')),
                                        ShelfNumber:num(pick(s, 'ShelfNumber')),
                                        // Old answers : bin 1
                                        BinNumber:num(pick(s, 'BinNumber')) || 1,
                                        BinCode:text(pick(s, 'BinCode'))
                                    })
                                )
                            })
                        ),

                        Ledgers:list(pick(x, 'Ledgers')).map
                        (
                            l =>
                            ({
                                Code:text(pick(l, 'Code')),
                                Name:text(pick(l, 'Name'))
                            })
                        ),

                        Suppliers:list(pick(x, 'Suppliers')).map
                        (
                            l =>
                            ({
                                Code:text(pick(l, 'Code')),
                                Name:text(pick(l, 'Name'))
                            })
                        )
                    })
                )
            );
    }


    checkUnits
    (
        type:
            string,
        openingStockId:
            number,
        units:
            OpeningStockUnit[]
    ):
        Observable<OpeningStockUnitTaken[]>
    {
        return this.http
            .post<any[]>(
                `${this.apiUrl}/unit-check`,
                {
                    PageType:type,
                    OpeningStockId:openingStockId,
                    Units:units
                })
            .pipe(
                map
                (
                    rows =>
                        list(rows).map
                        (
                            x =>
                            ({
                                Field:text(pick(x, 'Field')),
                                Value:text(pick(x, 'Value')),
                                Message:text(pick(x, 'Message'))
                            })
                        )
                )
            );
    }


    create
    (
        dto:
            CreateOpeningStock
    ):
        Observable<OpeningStockSaved>
    {
        return this.http
            .post<any>(this.apiUrl, dto)
            .pipe(map(toSaved));
    }


    // Saved by the uuid (the server ignores any id in the body)
    update
    (
        publicId:
            string,
        dto:
            CreateOpeningStock
    ):
        Observable<OpeningStockSaved>
    {
        return this.http
            .put<any>(`${this.apiUrl}/${publicId}`, dto)
            .pipe(map(toSaved));
    }


    delete
    (
        id:
            string
    ):
        Observable<void>
    {
        return this.http
            .delete<void>(`${this.apiUrl}/${id}`);
    }


    post
    (
        publicId:
            string
    ):
        Observable<OpeningStockSaved>
    {
        return this.http
            .put<any>(`${this.apiUrl}/${publicId}/post`, {})
            .pipe(map(toSaved));
    }


    cancel
    (
        publicId:
            string,
        reason:
            string
    ):
        Observable<void>
    {
        return this.http
            .put<void>(`${this.apiUrl}/${publicId}/cancel`, { Reason:reason });
    }


    // The most recently deleted draft back (404 = none)
    restore():
        Observable<void>
    {
        return this.http
            .put<void>(`${this.apiUrl}/restore`, {});
    }


    getHistory():
        Observable<any[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/history`);
    }


    getEntityHistory
    (
        publicId:
            string
    ):
        Observable<any[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/${publicId}/history`);
    }
}


//===============================================================
// Mapping
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

function toVatRule
(
    x:
        any
):
    OpeningStockVatRule
{
    return {
        VatType:text(pick(x, 'VatType')),
        Rate:num(pick(x, 'Rate')),
        InputCreditAllowed:pick(x, 'InputCreditAllowed') !== false,
        EffectiveFrom:text(pick(x, 'EffectiveFrom')),
        ValidTo:text(pick(x, 'ValidTo'))
    };
}

function toSaved
(
    x:
        any
):
    OpeningStockSaved
{
    return {
        PublicId:text(pick(x, 'PublicId')),
        OpeningStockId:num(pick(x, 'OpeningStockId')),
        OpeningNo:text(pick(x, 'OpeningNo')),
        Status:text(pick(x, 'Status'))
    };
}

function toLine
(
    x:
        any
):
    OpeningStockLine
{
    const rack =
        pick(x, 'RackManagementId');

    return {
        OpeningStockLineId:num(pick(x, 'OpeningStockLineId')),
        LineNo:num(pick(x, 'LineNo')),
        ProductId:num(pick(x, 'ProductId')),
        ProductCode:text(pick(x, 'ProductCode')),
        ProductName:text(pick(x, 'ProductName')),
        Unit:text(pick(x, 'Unit')),
        Quantity:num(pick(x, 'Quantity')),
        UnitCost:num(pick(x, 'UnitCost')),
        LineValue:num(pick(x, 'LineValue')),
        Mrp:num(pick(x, 'Mrp')),
        MarginPercent:num(pick(x, 'MarginPercent')),
        GrossUnitCost:num(pick(x, 'GrossUnitCost')),
        VatRate:num(pick(x, 'VatRate')),
        VatAmount:num(pick(x, 'VatAmount')),
        RackManagementId:rack === null || rack === undefined ? null : num(rack),
        RackCode:text(pick(x, 'RackCode')),
        ShelfNumber:num(pick(x, 'ShelfNumber')),
        // Old lines with a place : bin 1
        BinNumber:num(pick(x, 'BinNumber')) || (rack !== null && rack !== undefined && num(pick(x, 'ShelfNumber')) ? 1 : 0),
        ShelfLabel:text(pick(x, 'ShelfLabel')),
        BinCode:text(pick(x, 'BinCode')),
        SaveAsDefault:!!pick(x, 'SaveAsDefault'),
        ShortNotes:text(pick(x, 'ShortNotes')),
        BatchNo:text(pick(x, 'BatchNo')),
        CardNo:text(pick(x, 'CardNo')),
        CardDp:num(pick(x, 'CardDp')),
        Allowance:num(pick(x, 'Allowance'))
    };
}

function toOpeningStock
(
    x:
        any
):
    OpeningStock
{
    return {
        PublicId:text(pick(x, 'PublicId')),
        OpeningStockId:num(pick(x, 'OpeningStockId')),
        PageType:text(pick(x, 'PageType')),
        OpeningNo:text(pick(x, 'OpeningNo')),
        OpeningDate:text(pick(x, 'OpeningDate')),
        BranchId:num(pick(x, 'BranchId')),
        BranchCode:text(pick(x, 'BranchCode')),
        BranchName:text(pick(x, 'BranchName')),
        CostBasis:text(pick(x, 'CostBasis')) || 'Cost',
        JournalNo:text(pick(x, 'JournalNo')),
        VatIncluded:!!pick(x, 'VatIncluded'),
        TotalVat:num(pick(x, 'TotalVat')),
        WarehouseId:num(pick(x, 'WarehouseId')),
        WarehouseName:text(pick(x, 'WarehouseName')),
        LedgerCode:text(pick(x, 'LedgerCode')),
        LedgerName:text(pick(x, 'LedgerName')),
        Remarks:text(pick(x, 'Remarks')),
        SupplierCode:text(pick(x, 'SupplierCode')),
        SupplierName:text(pick(x, 'SupplierName')),
        TotalQuantity:num(pick(x, 'TotalQuantity')),
        TotalValue:num(pick(x, 'TotalValue')),
        LineCount:num(pick(x, 'LineCount')),
        Status:text(pick(x, 'Status')),
        PostedDate:text(pick(x, 'PostedDate')),
        CancelReason:text(pick(x, 'CancelReason')),
        CancelledDate:text(pick(x, 'CancelledDate')),
        CreatedDate:text(pick(x, 'CreatedDate')),
        Lines:list(pick(x, 'Lines')).map(toLine),
        Units:list(pick(x, 'Units')).map
        (
            u =>
            ({
                ProductId:num(pick(u, 'ProductId')),
                ChassisNo:text(pick(u, 'ChassisNo')),
                EngineNo:text(pick(u, 'EngineNo')),
                KeyNo:text(pick(u, 'KeyNo')),
                BatteryNo:text(pick(u, 'BatteryNo'))
            })
        )
    };
}
