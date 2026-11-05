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
    CreateMassStoring,
    MassStoringDefaults,
    MassStoringDetail,
    MassStoringLine,
    MassStoringListRow,
    MassStoringPlaces,
    MassStoringProduct,
    MassStoringRack,
    UpdateMassStoring
}
from '../models/mass-storing.model';

import
{
    toStoragePlaces
}
from './product-transfer.service';

import
{
    movementClassInfo
}
from '../../../../shared/inventory/storage-labels';


//===============================================================
// Mass Storing service
//
//   GET    <api>?type=                     documents ('' = all
//                                          types; deleted drafts
//                                          included)
//   GET    <api>/defaults?type=
//   GET    <api>/products?type=&warehouseId=&includeNoStock=
//   GET    <api>/places?type=&warehouseId=
//   GET    <api>/{id}
//   POST   <api>                           save draft → new id
//   PUT    <api>/{id}                      change draft
//   DELETE <api>/{id}                      delete draft
//   PUT    <api>/{id}/restore              restore a deleted draft
//   POST   <api>/{id}/post                 apply every line
//   POST   <api>/{id}/cancel               { Reason }
//   GET    <api>/history · <api>/{id}/history
//
// The API answers in PascalCase (camelCase read too).
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class MassStoringService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/inventory-management/stock-movement/mass-storing`;

    getAll
    (
        type:
            string = ''
    ):
        Observable<MassStoringListRow[]>
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
        Observable<PagedResult<MassStoringListRow>>
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
        Observable<MassStoringDetail>
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
        Observable<MassStoringDefaults>
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
                        CurrentBranchName:text(pick(x, 'CurrentBranchName')),
                        DefaultWarehouseId:num(pick(x, 'DefaultWarehouseId')),
                        Warehouses:list(pick(x, 'Warehouses')).map
                        (
                            w =>
                            {
                                const can =
                                    pick(w, 'CanReceiveType');

                                return {
                                    Id:num(pick(w, 'Id')) || num(pick(w, 'WarehouseId')),
                                    Code:text(pick(w, 'Code')),
                                    Name:text(pick(w, 'Name')) || text(pick(w, 'WarehouseName')),
                                    BranchId:num(pick(w, 'BranchId')),
                                    BranchName:text(pick(w, 'BranchName')),
                                    IsDefault:!!pick(w, 'IsDefault'),
                                    // Missing = listed by the server, so usable
                                    CanReceiveType:can === undefined || can === null ? true : !!can
                                };
                            }
                        ),
                        Brands:list(pick(x, 'Brands')).map
                        (
                            b =>
                            ({
                                Id:num(pick(b, 'Id')),
                                Name:text(pick(b, 'Name'))
                            })
                        ),
                        Categories:list(pick(x, 'Categories')).map
                        (
                            c =>
                            ({
                                Id:num(pick(c, 'Id')),
                                Name:text(pick(c, 'Name')),
                                BrandId:num(pick(c, 'BrandId')),
                                BrandName:text(pick(c, 'BrandName'))
                            })
                        )
                    })
                )
            );
    }

    // The grid : products with stock in the warehouse (or every
    // live product of the type); options : includePlaced (plus
    // every product placed there), rackId (ONLY the products on
    // that rack now, whatever their stock : the rack tools)
    getProducts
    (
        type:
            string,
        warehouseId:
            number,
        includeNoStock:
            boolean,
        options:
            { includePlaced?:boolean; rackId?:number } = {}
    ):
        Observable<MassStoringProduct[]>
    {
        const params:
            Record<string, string | number | boolean> =
            { type, warehouseId, includeNoStock, includePlaced:!!options.includePlaced };

        if
        (
            options.rackId
        )
        {
            params['rackId'] = options.rackId;
        }

        return this.http
            .get<any>(`${this.apiUrl}/products`, { params })
            .pipe(map(x => list(x).map(toProduct)));
    }

    // Racks and shelves of the warehouse (free / held by whom)
    getPlaces
    (
        type:
            string,
        warehouseId:
            number
    ):
        Observable<MassStoringPlaces>
    {
        return this.http
            .get<any>(`${this.apiUrl}/places`, { params:{ type, warehouseId } })
            .pipe(map(toPlaces));
    }

    // → the new document's id
    create
    (
        dto:
            CreateMassStoring
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
            UpdateMassStoring
    ):
        Observable<number>
    {
        return this.http
            .put<any>(`${this.apiUrl}/${id}`, { ...dto, Id:id })
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

// A positive number, or null when none
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

// The id a save answers : a number, or { Id } / { MassStoringId }
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

    return num(pick(x, 'Id')) || num(pick(x, 'MassStoringId'));
}

function toListRow
(
    x:
        any
):
    MassStoringListRow
{
    return {
        PublicId:text(pick(x, 'PublicId')),
        Id:num(pick(x, 'Id')) || num(pick(x, 'MassStoringId')),
        StoringNo:text(pick(x, 'StoringNo')),
        PageType:text(pick(x, 'PageType')),
        StoringDate:day(pick(x, 'StoringDate')),
        BranchId:num(pick(x, 'BranchId')),
        BranchName:text(pick(x, 'BranchName')),
        WarehouseId:num(pick(x, 'WarehouseId')),
        WarehouseCode:text(pick(x, 'WarehouseCode')),
        WarehouseName:text(pick(x, 'WarehouseName')),
        Status:text(pick(x, 'Status')) || 'Draft',
        LineCount:num(pick(x, 'LineCount')),
        PlacedCount:num(pick(x, 'PlacedCount')),
        ClearedCount:num(pick(x, 'ClearedCount')),
        Remarks:text(pick(x, 'Remarks')),
        IsDeleted:!!pick(x, 'IsDeleted'),
        CreatedByName:text(pick(x, 'CreatedByName')),
        CreatedDate:text(pick(x, 'CreatedDate')),
        PostedDate:text(pick(x, 'PostedDate'))
    };
}

function toProduct
(
    x:
        any
):
    MassStoringProduct
{
    const rackId =
        numOrNull(pick(x, 'RackId'));

    const placed =
        pick(x, 'IsPlaced');

    return {
        ProductId:num(pick(x, 'ProductId')) || num(pick(x, 'Id')),
        Code:text(pick(x, 'Code')) || text(pick(x, 'ProductCode')),
        Name:text(pick(x, 'Name')) || text(pick(x, 'ProductName')),
        PartNumber:text(pick(x, 'PartNumber')),
        Unit:text(pick(x, 'Unit')),
        BrandId:num(pick(x, 'BrandId')),
        BrandName:text(pick(x, 'BrandName')),
        CategoryId:num(pick(x, 'CategoryId')),
        CategoryName:text(pick(x, 'CategoryName')),
        SubCategoryId:num(pick(x, 'SubCategoryId')),
        SubCategoryName:text(pick(x, 'SubCategoryName')),
        // Missing / unknown : Slow (the default class)
        MovementClass:movementClassInfo(text(pick(x, 'MovementClass'))).value,
        MovementRank:num(pick(x, 'MovementRank')) || movementClassInfo(text(pick(x, 'MovementClass'))).rank,
        Stock:num(pick(x, 'Stock')),
        RackId:rackId,
        RackCode:text(pick(x, 'RackCode')),
        RackName:text(pick(x, 'RackName')),
        ShelfNo:numOrNull(pick(x, 'ShelfNo')),
        ShelfLabel:text(pick(x, 'ShelfLabel')),
        // Old answers (one place per shelf) : bin 1
        BinNo:numOrNull(pick(x, 'BinNo')) ?? (rackId !== null && numOrNull(pick(x, 'ShelfNo')) ? 1 : null),
        BinCode:text(pick(x, 'BinCode')),
        Location:text(pick(x, 'Location')),
        IsPlaced:placed === undefined || placed === null ? rackId !== null : !!placed
    };
}

// { Places, Racks } : the Product Transfer places shape (racks →
// shelves → bins with their holders) plus the rack plan and the
// holders' sub category / movement / stock (Stage 2). Old answers
// without them : a General, active rack with no prime range
function toPlaces
(
    x:
        any
):
    MassStoringPlaces
{
    const places =
        toStoragePlaces(x);

    const raw =
        list(Array.isArray(x) ? x : pick(x, 'Racks'));

    return {
        Places:places.Places,
        Racks:places.Racks.map
        (
            (rack, index): MassStoringRack =>
            {
                const r =
                    raw.find(y => (num(pick(y, 'Id')) || num(pick(y, 'RackId'))) === rack.Id) ?? raw[index] ?? {};

                const category =
                    numOrNull(pick(r, 'ProductCategoryId'));

                const general =
                    pick(r, 'IsGeneral');

                const active =
                    pick(r, 'IsActive');

                const from =
                    numOrNull(pick(r, 'PrimeShelfFrom'));

                const to =
                    numOrNull(pick(r, 'PrimeShelfTo'));

                const rawShelves =
                    list(pick(r, 'Shelves'));

                return {
                    ...rack,
                    ProductCategoryId:category && category > 0 ? category : null,
                    CategoryName:text(pick(r, 'CategoryName')),
                    SubCategoryIds:list(pick(r, 'SubCategoryIds')).map(num).filter(n => n > 0),
                    SubCategoryNames:list(pick(r, 'SubCategoryNames')).map(n => String(n ?? '')),
                    IsGeneral:general === undefined || general === null ? !(category && category > 0) : !!general,
                    PrimeShelfFrom:from && to ? from : null,
                    PrimeShelfTo:from && to ? to : null,
                    RackLetter:text(pick(r, 'RackLetter')),
                    IsActive:active === undefined || active === null ? true : !!active,
                    Shelves:rack.Shelves.map
                    (
                        shelf =>
                        {
                            const rs =
                                rawShelves.find(y => (num(pick(y, 'ShelfNo')) || num(pick(y, 'ShelfNumber'))) === shelf.ShelfNo) ?? {};

                            const rawBins =
                                list(pick(rs, 'Bins'));

                            return {
                                ...shelf,
                                Bins:shelf.Bins.map
                                (
                                    bin =>
                                    {
                                        const b =
                                            rawBins.find(y => (num(pick(y, 'BinNo')) || num(pick(y, 'BinNumber'))) === bin.BinNo) ?? {};

                                        return {
                                            ...bin,
                                            HeldBySubCategoryId:num(pick(b, 'HeldBySubCategoryId')),
                                            HeldBySubCategoryName:text(pick(b, 'HeldBySubCategoryName')),
                                            HeldByMovementClass:bin.IsFree ? '' : movementClassInfo(text(pick(b, 'HeldByMovementClass'))).value,
                                            HeldByPartNumber:text(pick(b, 'HeldByPartNumber')),
                                            HeldByStock:num(pick(b, 'HeldByStock'))
                                        };
                                    }
                                )
                            };
                        }
                    )
                };
            }
        )
    };
}

function toLine
(
    x:
        any
):
    MassStoringLine
{
    const toRack =
        numOrNull(pick(x, 'ToRackId'));

    const clear =
        pick(x, 'IsClear');

    return {
        MassStoringLineId:num(pick(x, 'MassStoringLineId')) || num(pick(x, 'Id')),
        LineNo:num(pick(x, 'LineNo')),
        ProductId:num(pick(x, 'ProductId')),
        ProductCode:text(pick(x, 'ProductCode')),
        ProductName:text(pick(x, 'ProductName')),
        PartNumber:text(pick(x, 'PartNumber')),
        Unit:text(pick(x, 'Unit')),
        StockQuantity:num(pick(x, 'StockQuantity')),
        FromRackId:numOrNull(pick(x, 'FromRackId')),
        FromRackCode:text(pick(x, 'FromRackCode')),
        FromRackName:text(pick(x, 'FromRackName')),
        FromShelfNo:numOrNull(pick(x, 'FromShelfNo')),
        FromShelfLabel:text(pick(x, 'FromShelfLabel')),
        FromBinNo:numOrNull(pick(x, 'FromBinNo')) ?? (numOrNull(pick(x, 'FromShelfNo')) ? 1 : null),
        FromBinCode:text(pick(x, 'FromBinCode')),
        FromLocation:text(pick(x, 'FromLocation')),
        ToRackId:toRack,
        ToRackCode:text(pick(x, 'ToRackCode')),
        ToRackName:text(pick(x, 'ToRackName')),
        ToShelfNo:numOrNull(pick(x, 'ToShelfNo')),
        ToShelfLabel:text(pick(x, 'ToShelfLabel')),
        ToBinNo:numOrNull(pick(x, 'ToBinNo')) ?? (numOrNull(pick(x, 'ToShelfNo')) ? 1 : null),
        ToBinCode:text(pick(x, 'ToBinCode')),
        ToLocation:text(pick(x, 'ToLocation')),
        IsClear:clear === undefined || clear === null ? toRack === null : !!clear,
        Notes:text(pick(x, 'Notes'))
    };
}

function toDetail
(
    x:
        any
):
    MassStoringDetail
{
    const lines =
        list(pick(x, 'Lines')).map(toLine);

    return {
        PublicId:text(pick(x, 'PublicId')),
        Id:num(pick(x, 'Id')) || num(pick(x, 'MassStoringId')),
        StoringNo:text(pick(x, 'StoringNo')),
        PageType:text(pick(x, 'PageType')),
        StoringDate:day(pick(x, 'StoringDate')),
        BranchId:num(pick(x, 'BranchId')),
        BranchName:text(pick(x, 'BranchName')),
        WarehouseId:num(pick(x, 'WarehouseId')),
        WarehouseCode:text(pick(x, 'WarehouseCode')),
        WarehouseName:text(pick(x, 'WarehouseName')),
        Remarks:text(pick(x, 'Remarks')),
        Status:text(pick(x, 'Status')) || 'Draft',
        LineCount:num(pick(x, 'LineCount')) || lines.length,
        PlacedCount:num(pick(x, 'PlacedCount')) || lines.filter(l => !l.IsClear).length,
        ClearedCount:num(pick(x, 'ClearedCount')) || lines.filter(l => l.IsClear).length,
        IsDeleted:!!pick(x, 'IsDeleted'),
        CreatedByName:text(pick(x, 'CreatedByName')),
        CreatedDate:text(pick(x, 'CreatedDate')),
        PostedByName:text(pick(x, 'PostedByName')),
        PostedDate:text(pick(x, 'PostedDate')),
        CancelledByName:text(pick(x, 'CancelledByName')),
        CancelledDate:text(pick(x, 'CancelledDate')),
        CancelReason:text(pick(x, 'CancelReason')),
        CanEdit:!!pick(x, 'CanEdit'),
        CanPost:!!pick(x, 'CanPost'),
        CanCancel:!!pick(x, 'CanCancel'),
        CancelBlockedReason:text(pick(x, 'CancelBlockedReason')),
        Lines:lines
    };
}
