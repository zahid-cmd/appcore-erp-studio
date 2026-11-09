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
    PagedQuery,
    PagedResult,
    toPagedParams,
    toPagedResult
}
from '../../../../shared/paging/paged-result.model';

import
{
    CreateReceiving,
    Receiving,
    ReceivingDefaults,
    ReceivingLine,
    ReceivingPurchase,
    ReceivingUnit,
    ReceivingUnitTaken
}
from './receiving.model';


//===============================================================
// Product Receiving service (one for the three pages; the page's
// path picks the API)
//
//   GET    <api>/<path>                        receivings
//   GET    <api>/<path>/defaults?branchId=&date=
//   GET    <api>/<path>/pending-purchases?branchId=
//   POST   <api>/<path>/unit-check             { Units }
//   GET    <api>/<path>/{id}
//   POST   <api>/<path>                        create = post
//   PUT    <api>/<path>/{publicId}/cancel      { Reason }
//
// The API answers in camelCase; mapped to PascalCase.
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class ReceivingService
{
    private readonly http =
        inject(HttpClient);

    private readonly api =
        `${environment.apiUrl}/inventory-management/product-receiving`;


    getAll
    (
        path:
            string
    ):
        Observable<Receiving[]>
    {
        return this.http
            .get<any[]>(`${this.api}/${path}`)
            .pipe(map(x => list(x).map(toReceiving)));
    }


    // One page of the list plus the tab counts (server paging)
    getPaged
    (
        path:
            string,
        query:
            PagedQuery & { tab?:string }
    ):
        Observable<PagedResult<Receiving>>
    {
        return this.http
            .get<any>(`${this.api}/${path}/paged`, { params:toPagedParams({ ...query }) })
            .pipe(map(raw => toPagedResult(raw, toReceiving)));
    }

    getById
    (
        path:
            string,
        id:
            string
    ):
        Observable<Receiving>
    {
        return this.http
            .get<any>(`${this.api}/${path}/${id}`)
            .pipe(map(toReceiving));
    }


    getDefaults
    (
        path:
            string,
        branchId:
            number,
        date:
            string
    ):
        Observable<ReceivingDefaults>
    {
        return this.http
            .get<any>(`${this.api}/${path}/defaults`, { params:{ branchId, date } })
            .pipe(
                map
                (
                    x =>
                    ({
                        PageType:text(pick(x, 'PageType')),
                        Today:text(pick(x, 'Today')),
                        BranchId:num(pick(x, 'BranchId')),
                        BranchName:text(pick(x, 'BranchName')),
                        FinancialYearName:text(pick(x, 'FinancialYearName')),
                        NextNumber:text(pick(x, 'NextNumber')),
                        BackDatedAllowed:!!pick(x, 'BackDatedAllowed'),
                        BackDatedDays:num(pick(x, 'BackDatedDays')),
                        ShelfRequired:!!pick(x, 'ShelfRequired'),
                        UnitsRequired:!!pick(x, 'UnitsRequired'),
                        UniqueKeyNo:!!pick(x, 'UniqueKeyNo'),
                        UniqueBatteryNo:!!pick(x, 'UniqueBatteryNo'),
                        Warehouses:list(pick(x, 'Warehouses')).map
                        (
                            w =>
                            ({
                                Id:num(pick(w, 'Id')),
                                BranchId:num(pick(w, 'BranchId')),
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
                        Message:text(pick(x, 'Message'))
                    })
                )
            );
    }


    getPendingPurchases
    (
        path:
            string,
        branchId:
            number
    ):
        Observable<ReceivingPurchase[]>
    {
        return this.http
            .get<any[]>(`${this.api}/${path}/pending-purchases`, { params:{ branchId } })
            .pipe(
                map
                (
                    rows =>
                        list(rows).map
                        (
                            x =>
                            ({
                                PurchaseId:num(pick(x, 'PurchaseId')),
                                PurchaseNo:text(pick(x, 'PurchaseNo')),
                                PurchaseDate:text(pick(x, 'PurchaseDate')),
                                BranchId:num(pick(x, 'BranchId')),
                                SupplierCode:text(pick(x, 'SupplierCode')),
                                SupplierName:text(pick(x, 'SupplierName')),
                                SupplierInvoiceNo:text(pick(x, 'SupplierInvoiceNo')),
                                MushakNo:text(pick(x, 'MushakNo')),
                                DoReference:text(pick(x, 'DoReference')),
                                GatePassNo:text(pick(x, 'GatePassNo')),
                                PurchasedQuantity:num(pick(x, 'PurchasedQuantity')),
                                PendingQuantity:num(pick(x, 'PendingQuantity')),
                                ReceivingStatus:text(pick(x, 'ReceivingStatus')),
                                AccessoryPendingQuantity:num(pick(x, 'AccessoryPendingQuantity')),
                                Accessories:list(pick(x, 'Accessories')).map
                                (
                                    a =>
                                    ({
                                        PurchaseAccessoryDueId:num(pick(a, 'PurchaseAccessoryDueId')),
                                        SchemeCode:text(pick(a, 'SchemeCode')),
                                        SchemeName:text(pick(a, 'SchemeName')),
                                        SchemeKind:text(pick(a, 'SchemeKind')),
                                        AccessoryId:num(pick(a, 'AccessoryId')),
                                        ProductCode:text(pick(a, 'ProductCode')),
                                        AccessoryName:text(pick(a, 'AccessoryName')),
                                        Unit:text(pick(a, 'Unit')),
                                        QuantityDue:num(pick(a, 'QuantityDue')),
                                        ReceivedBefore:num(pick(a, 'ReceivedBefore')),
                                        QuantityClosed:num(pick(a, 'QuantityClosed')),
                                        PendingQuantity:num(pick(a, 'PendingQuantity'))
                                    })
                                ),
                                Lines:list(pick(x, 'Lines')).map
                                (
                                    l =>
                                    ({
                                        PurchaseLineId:num(pick(l, 'PurchaseLineId')),
                                        LineNo:num(pick(l, 'LineNo')),
                                        StockBatchId:num(pick(l, 'StockBatchId')),
                                        BatchNo:text(pick(l, 'BatchNo')),
                                        ProductId:num(pick(l, 'ProductId')),
                                        ProductCode:text(pick(l, 'ProductCode')),
                                        ProductName:text(pick(l, 'ProductName')),
                                        Unit:text(pick(l, 'Unit')),
                                        PurchasedQuantity:num(pick(l, 'PurchasedQuantity')),
                                        ReceivedBefore:num(pick(l, 'ReceivedBefore')),
                                        PendingQuantity:num(pick(l, 'PendingQuantity')),
                                        Shelves:list(pick(l, 'Shelves')).map
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
                                )
                            })
                        )
                )
            );
    }


    checkUnits
    (
        path:
            string,
        units:
            ReceivingUnit[]
    ):
        Observable<ReceivingUnitTaken[]>
    {
        return this.http
            .post<any[]>(`${this.api}/${path}/unit-check`, { Units:units })
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
        path:
            string,
        dto:
            CreateReceiving
    ):
        Observable<{ ReceivingId:number; ReceivingNo:string }>
    {
        return this.http
            .post<any>(`${this.api}/${path}`, dto)
            .pipe(
                map
                (
                    x =>
                    ({
                        ReceivingId:num(pick(x, 'ReceivingId')),
                        ReceivingNo:text(pick(x, 'ReceivingNo'))
                    })
                )
            );
    }


    // MB : Close Due : the rest of one free-accessory due row
    // is written off
    closeAccessoryDue
    (
        path:
            string,
        dueId:
            number,
        branchId:
            number,
        reason:
            string
    ):
        Observable<void>
    {
        return this.http
            .put<void>(`${this.api}/${path}/accessory-dues/${dueId}/close`, { Reason:reason }, { params:{ branchId } });
    }


    // Cancelled by the uuid (point 2)
    cancel
    (
        path:
            string,
        publicId:
            string,
        reason:
            string
    ):
        Observable<void>
    {
        return this.http
            .put<void>(`${this.api}/${path}/${publicId}/cancel`, { Reason:reason });
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

function toLine
(
    x:
        any
):
    ReceivingLine
{
    const rack =
        pick(x, 'RackManagementId');

    return {
        ReceivingLineId:num(pick(x, 'ReceivingLineId')),
        LineNo:num(pick(x, 'LineNo')),
        PurchaseLineId:num(pick(x, 'PurchaseLineId')),
        StockBatchId:num(pick(x, 'StockBatchId')),
        BatchNo:text(pick(x, 'BatchNo')),
        ProductId:num(pick(x, 'ProductId')),
        ProductCode:text(pick(x, 'ProductCode')),
        ProductName:text(pick(x, 'ProductName')),
        Unit:text(pick(x, 'Unit')),
        PurchasedQuantity:num(pick(x, 'PurchasedQuantity')),
        ReceivedBefore:num(pick(x, 'ReceivedBefore')),
        Quantity:num(pick(x, 'Quantity')),
        RackManagementId:rack === null || rack === undefined ? null : num(rack),
        RackCode:text(pick(x, 'RackCode')),
        ShelfNumber:num(pick(x, 'ShelfNumber')),
        // Old lines with a place : bin 1
        BinNumber:num(pick(x, 'BinNumber')) || (rack !== null && rack !== undefined && num(pick(x, 'ShelfNumber')) ? 1 : 0),
        ShelfLabel:text(pick(x, 'ShelfLabel')),
        BinCode:text(pick(x, 'BinCode')),
        ShortNotes:text(pick(x, 'ShortNotes'))
    };
}

function toReceiving
(
    x:
        any
):
    Receiving
{
    return {
        PublicId:text(pick(x, 'PublicId')),
        ReceivingId:num(pick(x, 'ReceivingId')),
        PageType:text(pick(x, 'PageType')),
        ReceivingNo:text(pick(x, 'ReceivingNo')),
        ReceivingDate:text(pick(x, 'ReceivingDate')),
        BranchId:num(pick(x, 'BranchId')),
        BranchName:text(pick(x, 'BranchName')),
        WarehouseId:num(pick(x, 'WarehouseId')),
        WarehouseName:text(pick(x, 'WarehouseName')),
        PurchaseId:num(pick(x, 'PurchaseId')),
        PurchaseNo:text(pick(x, 'PurchaseNo')),
        PurchaseDate:text(pick(x, 'PurchaseDate')),
        SupplierCode:text(pick(x, 'SupplierCode')),
        SupplierName:text(pick(x, 'SupplierName')),
        SupplierInvoiceNo:text(pick(x, 'SupplierInvoiceNo')),
        MushakNo:text(pick(x, 'MushakNo')),
        DoReference:text(pick(x, 'DoReference')),
        GatePassNo:text(pick(x, 'GatePassNo')),
        ReceivedBy:text(pick(x, 'ReceivedBy')),
        Remarks:text(pick(x, 'Remarks')),
        TotalQuantity:num(pick(x, 'TotalQuantity')),
        LineCount:num(pick(x, 'LineCount')),
        Status:text(pick(x, 'Status')),
        CancelReason:text(pick(x, 'CancelReason')),
        CancelledDate:text(pick(x, 'CancelledDate')),
        CreatedDate:text(pick(x, 'CreatedDate')),
        Lines:list(pick(x, 'Lines')).map(toLine),
        Units:list(pick(x, 'Units')).map
        (
            u =>
            ({
                PurchaseLineId:num(pick(u, 'PurchaseLineId')),
                ChassisNo:text(pick(u, 'ChassisNo')),
                EngineNo:text(pick(u, 'EngineNo')),
                KeyNo:text(pick(u, 'KeyNo')),
                BatteryNo:text(pick(u, 'BatteryNo')),
                CkdStatus:text(pick(u, 'CkdStatus')) === 'Yes' ? 'Yes' : 'No',
                ManufactureYear:num(pick(u, 'ManufactureYear')) || null
            })
        ),
        Accessories:list(pick(x, 'Accessories')).map
        (
            a =>
            ({
                PurchaseAccessoryDueId:num(pick(a, 'PurchaseAccessoryDueId')),
                SchemeCode:text(pick(a, 'SchemeCode')),
                SchemeKind:text(pick(a, 'SchemeKind')),
                AccessoryId:num(pick(a, 'AccessoryId')),
                ProductCode:text(pick(a, 'ProductCode')),
                AccessoryName:text(pick(a, 'AccessoryName')),
                Unit:text(pick(a, 'Unit')),
                Quantity:num(pick(a, 'Quantity')),
                BatchNo:text(pick(a, 'BatchNo'))
            })
        )
    };
}
