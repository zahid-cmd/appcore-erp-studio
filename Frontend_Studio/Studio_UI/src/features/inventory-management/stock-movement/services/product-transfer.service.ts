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
    CreateProductTransfer,
    ProductTransferDefaults,
    ProductTransferDetail,
    ProductTransferLine,
    ProductTransferListRow,
    ProductTransferPlaces,
    ProductTransferStockProduct,
    StorageRack,
    UpdateProductTransfer
}
from '../models/product-transfer.model';


//===============================================================
// Product Transfer service
//
//   GET    <api>?type=                     documents ('' = all
//                                          types; deleted drafts
//                                          included)
//   GET    <api>/defaults?type=
//   GET    <api>/stock?type=&warehouseId=  stock on hand there
//   GET    <api>/places?type=&warehouseId=&productIds=1,2,3
//   GET    <api>/{id}
//   POST   <api>                           save draft → new id
//   PUT    <api>/{id}                      change draft
//   DELETE <api>/{id}                      delete draft
//   PUT    <api>/{id}/restore              restore a deleted draft
//   POST   <api>/{id}/post                 post (same branch) /
//                                          send (inter-branch)
//   POST   <api>/{id}/receive              { ReceiveDate }
//   POST   <api>/{id}/cancel               { Reason }
//   GET    <api>/history · <api>/{id}/history
//
// The API answers in PascalCase (camelCase read too).
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class ProductTransferService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/inventory-management/stock-movement/product-transfer`;

    getAll
    (
        type:
            string = ''
    ):
        Observable<ProductTransferListRow[]>
    {
        return this.http
            .get<any>(this.apiUrl, { params:{ type } })
            .pipe(map(x => list(x).map(toListRow)));
    }

    // One page of the list plus the tab / type counts (server paging)
    getPaged
    (
        query:
            PagedQuery & { type?:string; tab?:string }
    ):
        Observable<PagedResult<ProductTransferListRow>>
    {
        return this.http
            .get<any>(`${this.apiUrl}/paged`, { params:toPagedParams({ ...query }) })
            .pipe(map(raw => toPagedResult(raw, toListRow)));
    }

    getById
    (
        id:
            string
    ):
        Observable<ProductTransferDetail>
    {
        return this.http
            .get<any>(`${this.apiUrl}/${id}`)
            .pipe(map(toDetail));
    }

    getDefaults
    (
        type:
            string
    ):
        Observable<ProductTransferDefaults>
    {
        return this.http
            .get<any>(`${this.apiUrl}/defaults`, { params:{ type } })
            .pipe(
                map
                (
                    x =>
                    ({
                        PageType:text(pick(x, 'PageType')),
                        Today:day(pick(x, 'Today')),
                        NextNo:text(pick(x, 'NextNo')) || text(pick(x, 'NextNumber')),
                        CurrentBranchId:num(pick(x, 'CurrentBranchId')),
                        Warehouses:list(pick(x, 'Warehouses')).map
                        (
                            w =>
                            ({
                                Id:num(pick(w, 'Id')) || num(pick(w, 'WarehouseId')),
                                Code:text(pick(w, 'Code')),
                                Name:text(pick(w, 'Name')) || text(pick(w, 'WarehouseName')),
                                BranchId:num(pick(w, 'BranchId')),
                                BranchName:text(pick(w, 'BranchName')),
                                IsCentral:!!(pick(w, 'IsCentral') ?? pick(w, 'IsCentralWarehouse')),
                                IsDefault:!!pick(w, 'IsDefault'),
                                // Business Configuration : the branch runs the type's line
                                CanReceiveType:!!pick(w, 'CanReceiveType'),
                                HoldsTypeStock:!!pick(w, 'HoldsTypeStock')
                            })
                        ),
                        Brands:list(pick(x, 'Brands')).map
                        (
                            b =>
                            ({
                                Id:num(pick(b, 'Id')),
                                Name:text(pick(b, 'Name'))
                            })
                        )
                    })
                )
            );
    }

    // Products with stock on hand in a warehouse (bikes : with the
    // units on hand there)
    getStock
    (
        type:
            string,
        warehouseId:
            number
    ):
        Observable<ProductTransferStockProduct[]>
    {
        return this.http
            .get<any>(`${this.apiUrl}/stock`, { params:{ type, warehouseId } })
            .pipe(map(x => list(x).map(toStockProduct)));
    }

    // Saved places of the products in a warehouse and its racks
    getPlaces
    (
        type:
            string,
        warehouseId:
            number,
        productIds:
            number[]
    ):
        Observable<ProductTransferPlaces>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/places`,
                { params:{ type, warehouseId, productIds:productIds.filter(x => x > 0).join(',') } })
            .pipe(map(toStoragePlaces));
    }

    // → the new document's id
    create
    (
        dto:
            CreateProductTransfer
    ):
        Observable<number>
    {
        return this.http
            .post<any>(this.apiUrl, dto)
            .pipe(map(toId));
    }

    update
    (
        id:
            number,
        dto:
            UpdateProductTransfer
    ):
        Observable<number>
    {
        return this.http
            .put<any>(`${this.apiUrl}/${id}`, { ...dto, ProductTransferId:id })
            .pipe(map(x => toId(x) || id));
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

    restore
    (
        id:
            number
    ):
        Observable<void>
    {
        return this.http
            .put<void>(`${this.apiUrl}/${id}/restore`, {});
    }

    // Same branch : Completed ; inter-branch : In Transit
    post
    (
        id:
            number
    ):
        Observable<void>
    {
        return this.http
            .post<void>(`${this.apiUrl}/${id}/post`, {});
    }

    receive
    (
        id:
            number,
        receiveDate:
            string
    ):
        Observable<void>
    {
        return this.http
            .post<void>(`${this.apiUrl}/${id}/receive`, { ReceiveDate:receiveDate });
    }

    cancel
    (
        id:
            number,
        reason:
            string
    ):
        Observable<void>
    {
        return this.http
            .post<void>(`${this.apiUrl}/${id}/cancel`, { Reason:reason });
    }

    getHistory():
        Observable<any[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/history`);
    }

    getEntityHistory
    (
        id:
            number
    ):
        Observable<any[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/${id}/history`);
    }
}


//===============================================================
// Mapping (PascalCase or camelCase in)
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

// A number, or null when none
function numOrNull
(
    value:
        any
):
    number | null
{
    return value === null || value === undefined || value === '' || !(Number(value) > 0)
        ? null
        : Number(value);
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

// yyyy-MM-dd of a date / date-time text ('' = none)
function day
(
    value:
        any
):
    string
{
    const match =
        /^(\d{4}-\d{2}-\d{2})/.exec(text(value));

    return match ? match[1] : '';
}

// The id a save answers : a number, or { Id } / { ProductTransferId }
function toId
(
    x:
        any
):
    number
{
    if
    (
        typeof x === 'number' || typeof x === 'string'
    )
    {
        return num(x);
    }

    return num(pick(x, 'Id')) || num(pick(x, 'ProductTransferId'));
}

function toListRow
(
    x:
        any
):
    ProductTransferListRow
{
    return {
        PublicId:text(pick(x, 'PublicId')),
        Id:num(pick(x, 'Id')) || num(pick(x, 'ProductTransferId')),
        TransferNo:text(pick(x, 'TransferNo')),
        PageType:text(pick(x, 'PageType')),
        TransferDate:day(pick(x, 'TransferDate')),
        FromWarehouseName:text(pick(x, 'FromWarehouseName')),
        FromBranchName:text(pick(x, 'FromBranchName')),
        ToWarehouseName:text(pick(x, 'ToWarehouseName')),
        ToBranchName:text(pick(x, 'ToBranchName')),
        IsInterBranch:!!pick(x, 'IsInterBranch'),
        Status:text(pick(x, 'Status')) || 'Draft',
        LineCount:num(pick(x, 'LineCount')),
        TotalQuantity:num(pick(x, 'TotalQuantity')),
        TotalValue:num(pick(x, 'TotalValue')),
        Remarks:text(pick(x, 'Remarks')),
        IsDeleted:!!pick(x, 'IsDeleted'),
        CreatedByName:text(pick(x, 'CreatedByName')),
        CreatedDate:text(pick(x, 'CreatedDate'))
    };
}

function toStockProduct
(
    x:
        any
):
    ProductTransferStockProduct
{
    return {
        ProductId:num(pick(x, 'ProductId')) || num(pick(x, 'Id')),
        Code:text(pick(x, 'Code')) || text(pick(x, 'ProductCode')),
        Name:text(pick(x, 'Name')) || text(pick(x, 'ProductName')),
        PartNumber:text(pick(x, 'PartNumber')),
        Unit:text(pick(x, 'Unit')),
        BrandId:num(pick(x, 'BrandId')),
        BrandName:text(pick(x, 'BrandName')),
        CategoryId:num(pick(x, 'CategoryId')),
        Available:num(pick(x, 'Available')),
        Batches:list(pick(x, 'Batches')).map
        (
            b =>
            ({
                StockBatchId:num(pick(b, 'StockBatchId')),
                BatchNo:text(pick(b, 'BatchNo')),
                Available:num(pick(b, 'Available')),
                UnitCost:num(pick(b, 'UnitCost')),
                Mrp:num(pick(b, 'Mrp')),
                SourceDate:day(pick(b, 'SourceDate'))
            })
        ),
        Units:list(pick(x, 'Units')).map
        (
            u =>
            ({
                MotorBikeUnitId:num(pick(u, 'MotorBikeUnitId')),
                ChassisNo:text(pick(u, 'ChassisNo')),
                EngineNo:text(pick(u, 'EngineNo')),
                Color:text(pick(u, 'Color')),
                StockBatchId:num(pick(u, 'StockBatchId'))
            })
        )
    };
}

// { Places, Racks } (a bare array = the places only). Racks →
// Shelves → Bins with their holders (Mass Storing reads the same
// shape)
export function toStoragePlaces
(
    x:
        any
):
    ProductTransferPlaces
{
    const places =
        Array.isArray(x)
            ? x
            : list(pick(x, 'Places') ?? pick(x, 'Items'));

    return {
        Places:places.map
        (
            p =>
            ({
                ProductId:num(pick(p, 'ProductId')),
                RackId:num(pick(p, 'RackId')),
                RackName:text(pick(p, 'RackName')),
                ShelfNo:num(pick(p, 'ShelfNo')),
                ShelfLabel:text(pick(p, 'ShelfLabel')),
                // Old answers : one place per shelf = bin 1
                BinNo:num(pick(p, 'BinNo')) || num(pick(p, 'BinNumber')) || (num(pick(p, 'ShelfNo')) ? 1 : 0),
                BinCode:text(pick(p, 'BinCode'))
            })
        )
        .filter(p => p.ProductId > 0 && p.RackId > 0),
        Racks:list(Array.isArray(x) ? [] : pick(x, 'Racks')).map(toStorageRack)
    };
}

function toStorageRack
(
    r:
        any
):
    StorageRack
{
    const freeShelves =
        list(pick(r, 'FreeShelves')).map(num).filter(s => s > 0);

    const code =
        text(pick(r, 'Code')) || text(pick(r, 'RackCode'));

    const name =
        text(pick(r, 'Name')) || text(pick(r, 'RackName'));

    const full =
        pick(r, 'IsFull');

    const shelves =
        list(pick(r, 'Shelves')).map
        (
            s =>
            {
                const shelfNo =
                    num(pick(s, 'ShelfNo')) || num(pick(s, 'ShelfNumber'));

                const isFree =
                    pick(s, 'IsFree');

                return {
                    ShelfNo:shelfNo,
                    Label:text(pick(s, 'Label')) || text(pick(s, 'ShelfLabel')),
                    BinCount:num(pick(s, 'BinCount')) || 1,
                    FreeBins:num(pick(s, 'FreeBins')),
                    IsFree:isFree === undefined || isFree === null ? freeShelves.includes(shelfNo) : !!isFree,
                    IsPrime:!!pick(s, 'IsPrime'),
                    Bins:list(pick(s, 'Bins')).map
                    (
                        b =>
                        {
                            const binFree =
                                pick(b, 'IsFree');

                            const own =
                                pick(b, 'IsOwnType');

                            return {
                                BinNo:num(pick(b, 'BinNo')) || num(pick(b, 'BinNumber')),
                                BinCode:text(pick(b, 'BinCode')),
                                BinLabel:text(pick(b, 'BinLabel')),
                                IsFree:binFree === undefined || binFree === null ? !num(pick(b, 'HeldById')) : !!binFree,
                                HeldByType:text(pick(b, 'HeldByType')),
                                HeldById:num(pick(b, 'HeldById')),
                                HeldByCode:text(pick(b, 'HeldByCode')),
                                HeldByName:text(pick(b, 'HeldByName')),
                                // Missing : a holder with an id is taken as the page's type
                                IsOwnType:own === undefined || own === null ? num(pick(b, 'HeldById')) > 0 : !!own
                            };
                        }
                    )
                    .filter(b => b.BinNo > 0)
                };
            }
        )
        .filter(s => s.ShelfNo > 0);

    return {
        Id:num(pick(r, 'Id')) || num(pick(r, 'RackId')),
        Code:code,
        Name:name,
        DisplayName:text(pick(r, 'DisplayName')) || [code, name].filter(t => !!t).join(' - '),
        ZoneCode:text(pick(r, 'ZoneCode')),
        ZoneName:text(pick(r, 'ZoneName')),
        ZonePriority:num(pick(r, 'ZonePriority')),
        AssignmentText:text(pick(r, 'AssignmentText')),
        ShelfCount:num(pick(r, 'ShelfCount')),
        TotalBins:num(pick(r, 'TotalBins')),
        FreeBinCount:num(pick(r, 'FreeBinCount')) || num(pick(r, 'FreeBins')),
        FreeShelves:freeShelves,
        IsFull:full === undefined || full === null ? freeShelves.length === 0 : !!full,
        Shelves:shelves
    };
}

function toLine
(
    x:
        any
):
    ProductTransferLine
{
    return {
        ProductTransferLineId:num(pick(x, 'ProductTransferLineId')) || num(pick(x, 'Id')),
        LineNo:num(pick(x, 'LineNo')),
        ProductId:num(pick(x, 'ProductId')),
        ProductCode:text(pick(x, 'ProductCode')),
        ProductName:text(pick(x, 'ProductName')),
        PartNumber:text(pick(x, 'PartNumber')),
        Unit:text(pick(x, 'Unit')),
        Quantity:num(pick(x, 'Quantity')),
        UnitCostAvg:num(pick(x, 'UnitCostAvg')),
        Value:num(pick(x, 'Value')),
        ToRackId:numOrNull(pick(x, 'ToRackId')),
        ToRackName:text(pick(x, 'ToRackName')) || text(pick(x, 'RackName')),
        ToShelfNo:numOrNull(pick(x, 'ToShelfNo')),
        ToShelfLabel:text(pick(x, 'ToShelfLabel')) || text(pick(x, 'ShelfLabel')),
        // Old lines (one place per shelf) : bin 1
        ToBinNo:numOrNull(pick(x, 'ToBinNo')) ?? (numOrNull(pick(x, 'ToShelfNo')) ? 1 : null),
        ToBinCode:text(pick(x, 'ToBinCode')),
        SavePlace:!!pick(x, 'SavePlace'),
        Notes:text(pick(x, 'Notes')),
        Batches:list(pick(x, 'Batches')).map
        (
            b =>
            ({
                StockBatchId:num(pick(b, 'StockBatchId')),
                BatchNo:text(pick(b, 'BatchNo')),
                Quantity:num(pick(b, 'Quantity')),
                UnitCost:num(pick(b, 'UnitCost')),
                Value:num(pick(b, 'Value'))
            })
        ),
        Units:list(pick(x, 'Units')).map
        (
            u =>
            ({
                MotorBikeUnitId:num(pick(u, 'MotorBikeUnitId')),
                ChassisNo:text(pick(u, 'ChassisNo')),
                EngineNo:text(pick(u, 'EngineNo')),
                StockBatchId:num(pick(u, 'StockBatchId'))
            })
        )
    };
}

function toDetail
(
    x:
        any
):
    ProductTransferDetail
{
    const lines =
        list(pick(x, 'Lines')).map(toLine);

    return {
        PublicId:text(pick(x, 'PublicId')),
        Id:num(pick(x, 'Id')) || num(pick(x, 'ProductTransferId')),
        TransferNo:text(pick(x, 'TransferNo')),
        PageType:text(pick(x, 'PageType')),
        TransferDate:day(pick(x, 'TransferDate')),
        FromWarehouseId:num(pick(x, 'FromWarehouseId')),
        FromWarehouseName:text(pick(x, 'FromWarehouseName')),
        FromBranchId:num(pick(x, 'FromBranchId')),
        FromBranchName:text(pick(x, 'FromBranchName')),
        ToWarehouseId:num(pick(x, 'ToWarehouseId')),
        ToWarehouseName:text(pick(x, 'ToWarehouseName')),
        ToBranchId:num(pick(x, 'ToBranchId')),
        ToBranchName:text(pick(x, 'ToBranchName')),
        IsInterBranch:!!pick(x, 'IsInterBranch'),
        Remarks:text(pick(x, 'Remarks')),
        Status:text(pick(x, 'Status')) || 'Draft',
        LineCount:num(pick(x, 'LineCount')) || lines.length,
        TotalQuantity:num(pick(x, 'TotalQuantity')),
        TotalValue:num(pick(x, 'TotalValue')),
        VoucherNo:text(pick(x, 'VoucherNo')),
        IsDeleted:!!pick(x, 'IsDeleted'),
        CreatedByName:text(pick(x, 'CreatedByName')),
        CreatedDate:text(pick(x, 'CreatedDate')),
        PostedByName:text(pick(x, 'PostedByName')),
        PostedDate:text(pick(x, 'PostedDate')),
        ReceivedByName:text(pick(x, 'ReceivedByName')),
        ReceivedDate:text(pick(x, 'ReceivedDate')),
        ReceiveDate:day(pick(x, 'ReceiveDate')),
        CancelledByName:text(pick(x, 'CancelledByName')),
        CancelledDate:text(pick(x, 'CancelledDate')),
        CancelReason:text(pick(x, 'CancelReason')),
        CanEdit:!!pick(x, 'CanEdit'),
        CanPost:!!pick(x, 'CanPost'),
        CanReceive:!!pick(x, 'CanReceive'),
        CanCancel:!!pick(x, 'CanCancel'),
        Lines:lines
    };
}
