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
    InventoryBikeList,
    InventoryBikeNumbers,
    InventoryBikeNumberTaken,
    InventoryBikeUnit,
    InventoryStockBatch,
    InventoryStockCard,
    InventoryStockList,
    InventoryStockMovement,
    InventoryStockPlace,
    InventoryStockRow
}
from './inventory-stock.model';


//===============================================================
// Inventory Status service (shared by the three stock pages;
// each call takes the page's apiPath)
//
//   GET <apiPath>?branchId=&warehouseId=
//   GET <apiPath>/<productId>/card?branchId=&warehouseId=
//   GET <apiPath>/bikes?branchId=&search=          (MB)
//   POST <apiPath>/bikes/number-check              (MB editor)
//   PUT  <apiPath>/bikes/numbers                   (MB editor)
//   GET  <apiPath>/bikes/history                   (MB History)
//
// The API answers in camelCase; responses are mapped to
// PascalCase.
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class InventoryStockService
{
    private readonly http =
        inject(HttpClient);


    private url
    (
        apiPath:
            string
    ):
        string
    {
        return `${environment.apiUrl}/${apiPath}`;
    }


    //===========================================================
    // Stock list
    //===========================================================

    getStock
    (
        apiPath:
            string,
        branchId:
            number,
        warehouseId:
            number
    ):
        Observable<InventoryStockList>
    {
        return this.http
            .get<any>(
                this.url(apiPath),
                {
                    params:
                    {
                        branchId:String(branchId || 0),
                        warehouseId:String(warehouseId || 0)
                    }
                }
            )
            .pipe(
                map
                (
                    x =>
                    ({
                        PageType:text(pick(x, 'PageType')),
                        CanViewCost:!!pick(x, 'CanViewCost'),
                        BranchId:num(pick(x, 'BranchId')),
                        WarehouseId:num(pick(x, 'WarehouseId')),
                        AsOf:text(pick(x, 'AsOf')),
                        Rows:list(pick(x, 'Rows')).map(toRow),
                        Branches:list(pick(x, 'Branches')).map
                        (
                            b =>
                            ({
                                Id:num(pick(b, 'Id')),
                                Code:text(pick(b, 'Code')),
                                Name:text(pick(b, 'Name'))
                            })
                        ),
                        Warehouses:list(pick(x, 'Warehouses')).map
                        (
                            w =>
                            ({
                                Id:num(pick(w, 'Id')),
                                BranchId:num(pick(w, 'BranchId')),
                                Code:text(pick(w, 'Code')),
                                Name:text(pick(w, 'Name'))
                            })
                        )
                    })
                )
            );
    }


    //===========================================================
    // Stock card
    //===========================================================

    getCard
    (
        apiPath:
            string,
        productId:
            number,
        branchId:
            number,
        warehouseId:
            number
    ):
        Observable<InventoryStockCard>
    {
        return this.http
            .get<any>(
                `${this.url(apiPath)}/${productId}/card`,
                {
                    params:
                    {
                        branchId:String(branchId || 0),
                        warehouseId:String(warehouseId || 0)
                    }
                }
            )
            .pipe(
                map
                (
                    x =>
                    ({
                        CanViewCost:!!pick(x, 'CanViewCost'),
                        Product:toRow(pick(x, 'Product') ?? {}),
                        Batches:list(pick(x, 'Batches')).map(toBatch),
                        Movements:list(pick(x, 'Movements')).map(toMovement),
                        Places:list(pick(x, 'Places')).map(toPlace),
                        Bikes:list(pick(x, 'Bikes')).map(toBike)
                    })
                )
            );
    }


    //===========================================================
    // Motor bikes (MB page)
    //===========================================================

    getBikes
    (
        apiPath:
            string,
        branchId:
            number,
        search:
            string
    ):
        Observable<InventoryBikeList>
    {
        return this.http
            .get<any>(
                `${this.url(apiPath)}/bikes`,
                {
                    params:
                    {
                        branchId:String(branchId || 0),
                        search:search ?? ''
                    }
                }
            )
            .pipe(
                map
                (
                    x =>
                    ({
                        CanViewCost:!!pick(x, 'CanViewCost'),
                        CanEditNumbers:!!pick(x, 'CanEditNumbers'),
                        CanEditSold:!!pick(x, 'CanEditSold'),
                        KeyBatteryOn:pick(x, 'KeyBatteryOn') !== false,
                        Rows:list(pick(x, 'Rows')).map(toBike)
                    })
                )
            );
    }


    //===========================================================
    // Edit Bike Numbers (MB page) : live check and save
    //===========================================================

    checkBikeNumbers
    (
        apiPath:
            string,
        dto:
            InventoryBikeNumbers
    ):
        Observable<InventoryBikeNumberTaken[]>
    {
        return this.http
            .post<any>(
                `${this.url(apiPath)}/bikes/number-check`,
                dto
            )
            .pipe(
                map
                (
                    x =>
                        list(x).map
                        (
                            y =>
                            ({
                                Field:text(pick(y, 'Field')),
                                Value:text(pick(y, 'Value')),
                                Message:text(pick(y, 'Message'))
                            })
                        )
                )
            );
    }


    updateBikeNumbers
    (
        apiPath:
            string,
        dto:
            InventoryBikeNumbers
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.url(apiPath)}/bikes/numbers`,
            dto
        );
    }


    // Bike number edits, newest first (raw history rows)
    getBikeHistory
    (
        apiPath:
            string
    ):
        Observable<any[]>
    {
        return this.http
            .get<any>(`${this.url(apiPath)}/bikes/history`)
            .pipe(map(x => list(x)));
    }
}


//===============================================================
// Mapping helpers (camelCase or PascalCase)
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

function toRow
(
    x:
        any
):
    InventoryStockRow
{
    return {
        ProductId:num(pick(x, 'ProductId')),
        ProductCode:text(pick(x, 'ProductCode')),
        ProductName:text(pick(x, 'ProductName')),
        PartNumber:text(pick(x, 'PartNumber')),
        ItemName:text(pick(x, 'ItemName')),
        Unit:text(pick(x, 'Unit')),
        ProductKind:text(pick(x, 'ProductKind')),
        CategoryName:text(pick(x, 'CategoryName')),
        SubCategoryName:text(pick(x, 'SubCategoryName')),
        BrandName:text(pick(x, 'BrandName')),
        ColorName:text(pick(x, 'ColorName')),
        ReorderLevel:num(pick(x, 'ReorderLevel')),
        RedLevel:num(pick(x, 'RedLevel')),
        MaxStockLevel:num(pick(x, 'MaxStockLevel')),
        IsActive:!!pick(x, 'IsActive'),
        InTransit:num(pick(x, 'InTransit')),
        OnHand:num(pick(x, 'OnHand')),
        Total:num(pick(x, 'Total')),
        AverageCost:num(pick(x, 'AverageCost')),
        StockValue:num(pick(x, 'StockValue')),
        BatchCount:num(pick(x, 'BatchCount')),
        LastMovementDate:text(pick(x, 'LastMovementDate')),
        Location:text(pick(x, 'Location')),
        StockStatus:text(pick(x, 'StockStatus')),
        ImagePath:text(pick(x, 'ImagePath'))
    };
}

function toBatch
(
    x:
        any
):
    InventoryStockBatch
{
    return {
        StockBatchId:num(pick(x, 'StockBatchId')),
        BatchNo:text(pick(x, 'BatchNo')),
        SourceType:text(pick(x, 'SourceType')),
        SourceNo:text(pick(x, 'SourceNo')),
        SourceDate:text(pick(x, 'SourceDate')),
        SupplierCode:text(pick(x, 'SupplierCode')),
        SupplierName:text(pick(x, 'SupplierName')),
        BranchName:text(pick(x, 'BranchName')),
        Quantity:num(pick(x, 'Quantity')),
        UnitCost:num(pick(x, 'UnitCost')),
        InTransit:num(pick(x, 'InTransit')),
        OnHand:num(pick(x, 'OnHand')),
        Value:num(pick(x, 'Value')),
        AgeDays:num(pick(x, 'AgeDays'))
    };
}

function toMovement
(
    x:
        any
):
    InventoryStockMovement
{
    return {
        StockMovementId:num(pick(x, 'StockMovementId')),
        DocumentDate:text(pick(x, 'DocumentDate')),
        MovementType:text(pick(x, 'MovementType')),
        DocumentType:text(pick(x, 'DocumentType')),
        DocumentNo:text(pick(x, 'DocumentNo')),
        BatchNo:text(pick(x, 'BatchNo')),
        Bucket:text(pick(x, 'Bucket')),
        BranchName:text(pick(x, 'BranchName')),
        WarehouseName:text(pick(x, 'WarehouseName')),
        QuantityIn:num(pick(x, 'QuantityIn')),
        QuantityOut:num(pick(x, 'QuantityOut')),
        Balance:num(pick(x, 'Balance')),
        UnitCost:num(pick(x, 'UnitCost')),
        Value:num(pick(x, 'Value')),
        IsReversal:!!pick(x, 'IsReversal'),
        Narration:text(pick(x, 'Narration'))
    };
}

function toPlace
(
    x:
        any
):
    InventoryStockPlace
{
    return {
        BranchName:text(pick(x, 'BranchName')),
        WarehouseName:text(pick(x, 'WarehouseName')),
        Bucket:text(pick(x, 'Bucket')),
        Quantity:num(pick(x, 'Quantity')),
        Value:num(pick(x, 'Value')),
        Location:text(pick(x, 'Location'))
    };
}

function toBike
(
    x:
        any
):
    InventoryBikeUnit
{
    return {
        MotorBikeUnitId:num(pick(x, 'MotorBikeUnitId')),
        ProductId:num(pick(x, 'ProductId')),
        ProductCode:text(pick(x, 'ProductCode')),
        ProductName:text(pick(x, 'ProductName')),
        ChassisNo:text(pick(x, 'ChassisNo')),
        EngineNo:text(pick(x, 'EngineNo')),
        KeyNo:text(pick(x, 'KeyNo')),
        BatteryNo:text(pick(x, 'BatteryNo')),
        PurchaseNo:text(pick(x, 'PurchaseNo')),
        StockInDate:text(pick(x, 'StockInDate')),
        BranchName:text(pick(x, 'BranchName')),
        Status:text(pick(x, 'Status')),
        UnitCost:num(pick(x, 'UnitCost')),
        IsSold:!!pick(x, 'IsSold'),
        ColorName:text(pick(x, 'ColorName'))
    };
}
