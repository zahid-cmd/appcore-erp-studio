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
    ProductLedgerFigures,
    ProductLedgerFilters,
    ProductLedgerRow,
    ProductLedgerStatement,
    ProductLedgerSummary,
    ProductLedgerSummaryRow
}
from '../models/product-ledgers.model';


//===============================================================
// Product Ledgers service (read only)
//
//   GET <api>/<path>/filters
//   GET <api>/<path>/statement?productId=&from=&to=&branchId=&warehouseId=&showCancelled=&withBikes=
//   GET <api>/<path>/summary?kind=&categoryId=&subCategoryId=&from=&to=&branchId=&warehouseId=&showCancelled=
//
// <path> : motor-bikes-ledger / spare-parts-lubricants-ledger /
// accessories-ledger. The API answers in camelCase; mapped to
// PascalCase.
//===============================================================

export interface ProductLedgerStatementQuery
{
    path:string;
    productId:number;
    from:string;
    to:string;
    branchId:number;
    warehouseId:number;
    showCancelled:boolean;
    withBikes:boolean;
}

export interface ProductLedgerSummaryQuery
{
    path:string;
    kind:string;
    categoryId:number;
    subCategoryId:number;
    from:string;
    to:string;
    branchId:number;
    warehouseId:number;
    showCancelled:boolean;
}

@Injectable(
{
    providedIn:'root'
})

export class ProductLedgersService
{
    private readonly http =
        inject(HttpClient);

    private readonly api =
        `${environment.apiUrl}/inventory-management/product-ledgers`;


    getFilters
    (
        path:
            string
    ):
        Observable<ProductLedgerFilters>
    {
        return this.http
            .get<any>(`${this.api}/${path}/filters`)
            .pipe(
                map
                (
                    x =>
                    ({
                        PageType:text(pick(x, 'PageType')),
                        CanViewCost:!!pick(x, 'CanViewCost'),
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
                        ),
                        Categories:list(pick(x, 'Categories')).map
                        (
                            c =>
                            ({
                                Id:num(pick(c, 'Id')),
                                Name:text(pick(c, 'Name')),
                                Kind:text(pick(c, 'Kind'))
                            })
                        ),
                        SubCategories:list(pick(x, 'SubCategories')).map
                        (
                            s =>
                            ({
                                Id:num(pick(s, 'Id')),
                                CategoryId:num(pick(s, 'CategoryId')),
                                Name:text(pick(s, 'Name'))
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
                                Kind:text(pick(p, 'Kind')),
                                CategoryId:num(pick(p, 'CategoryId')),
                                SubCategoryId:num(pick(p, 'SubCategoryId')),
                                IsActive:!!pick(p, 'IsActive')
                            })
                        )
                    })
                )
            );
    }


    getStatement
    (
        query:
            ProductLedgerStatementQuery
    ):
        Observable<ProductLedgerStatement>
    {
        return this.http
            .get<any>(
                `${this.api}/${query.path}/statement`,
                {
                    params:
                    {
                        productId:query.productId,
                        from:query.from,
                        to:query.to,
                        branchId:query.branchId,
                        warehouseId:query.warehouseId,
                        showCancelled:query.showCancelled,
                        withBikes:query.withBikes
                    }
                }
            )
            .pipe(
                map
                (
                    x =>
                    ({
                        ...toFigures(x),
                        PageType:text(pick(x, 'PageType')),
                        CanViewCost:!!pick(x, 'CanViewCost'),
                        ProductId:num(pick(x, 'ProductId')),
                        ProductCode:text(pick(x, 'ProductCode')),
                        ProductName:text(pick(x, 'ProductName')),
                        Unit:text(pick(x, 'Unit')),
                        Kind:text(pick(x, 'Kind')),
                        CategoryName:text(pick(x, 'CategoryName')),
                        SubCategoryName:text(pick(x, 'SubCategoryName')),
                        BrandName:text(pick(x, 'BrandName')),
                        ColorName:text(pick(x, 'ColorName')),
                        From:text(pick(x, 'From')),
                        To:text(pick(x, 'To')),
                        BranchId:num(pick(x, 'BranchId')),
                        BranchName:text(pick(x, 'BranchName')),
                        WarehouseId:num(pick(x, 'WarehouseId')),
                        WarehouseName:text(pick(x, 'WarehouseName')),
                        ShowCancelled:!!pick(x, 'ShowCancelled'),
                        OpeningTransit:num(pick(x, 'OpeningTransit')),
                        Truncated:!!pick(x, 'Truncated'),
                        Rows:list(pick(x, 'Rows')).map(toRow)
                    })
                )
            );
    }


    getSummary
    (
        query:
            ProductLedgerSummaryQuery
    ):
        Observable<ProductLedgerSummary>
    {
        return this.http
            .get<any>(
                `${this.api}/${query.path}/summary`,
                {
                    params:
                    {
                        kind:query.kind,
                        categoryId:query.categoryId,
                        subCategoryId:query.subCategoryId,
                        from:query.from,
                        to:query.to,
                        branchId:query.branchId,
                        warehouseId:query.warehouseId,
                        showCancelled:query.showCancelled
                    }
                }
            )
            .pipe(
                map
                (
                    x =>
                    ({
                        ...toFigures(x),
                        PageType:text(pick(x, 'PageType')),
                        CanViewCost:!!pick(x, 'CanViewCost'),
                        ScopePath:text(pick(x, 'ScopePath')),
                        Kind:text(pick(x, 'Kind')),
                        CategoryId:num(pick(x, 'CategoryId')),
                        SubCategoryId:num(pick(x, 'SubCategoryId')),
                        From:text(pick(x, 'From')),
                        To:text(pick(x, 'To')),
                        BranchId:num(pick(x, 'BranchId')),
                        BranchName:text(pick(x, 'BranchName')),
                        WarehouseId:num(pick(x, 'WarehouseId')),
                        WarehouseName:text(pick(x, 'WarehouseName')),
                        ShowCancelled:!!pick(x, 'ShowCancelled'),
                        Rows:list(pick(x, 'Rows')).map(toSummaryRow)
                    })
                )
            );
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

function toFigures
(
    x:
        any
):
    ProductLedgerFigures
{
    return {
        OpeningQty:num(pick(x, 'OpeningQty')),
        OpeningValue:num(pick(x, 'OpeningValue')),
        InQty:num(pick(x, 'InQty')),
        InValue:num(pick(x, 'InValue')),
        OutQty:num(pick(x, 'OutQty')),
        OutValue:num(pick(x, 'OutValue')),
        ClosingQty:num(pick(x, 'ClosingQty')),
        ClosingValue:num(pick(x, 'ClosingValue')),
        ClosingTransit:num(pick(x, 'ClosingTransit'))
    };
}

function toRow
(
    x:
        any
):
    ProductLedgerRow
{
    return {
        Date:text(pick(x, 'Date')),
        MovementType:text(pick(x, 'MovementType')),
        DocumentType:text(pick(x, 'DocumentType')),
        DocumentNo:text(pick(x, 'DocumentNo')),
        Particulars:text(pick(x, 'Particulars')),
        PartyName:text(pick(x, 'PartyName')),
        Batches:text(pick(x, 'Batches')),
        Location:text(pick(x, 'Location')),
        IsReversal:!!pick(x, 'IsReversal'),
        IsCancelled:!!pick(x, 'IsCancelled'),
        IsTransfer:!!pick(x, 'IsTransfer'),
        InQty:num(pick(x, 'InQty')),
        OutQty:num(pick(x, 'OutQty')),
        BalanceQty:num(pick(x, 'BalanceQty')),
        TransitQty:num(pick(x, 'TransitQty')),
        TransitBalance:num(pick(x, 'TransitBalance')),
        UnitCost:num(pick(x, 'UnitCost')),
        InValue:num(pick(x, 'InValue')),
        OutValue:num(pick(x, 'OutValue')),
        BalanceValue:num(pick(x, 'BalanceValue')),
        ShortNote:text(pick(x, 'ShortNote')),
        Bikes:list(pick(x, 'Bikes')).map
        (
            b =>
            ({
                ChassisNo:text(pick(b, 'ChassisNo')),
                EngineNo:text(pick(b, 'EngineNo'))
            })
        )
    };
}

function toSummaryRow
(
    x:
        any
):
    ProductLedgerSummaryRow
{
    return {
        ...toFigures(x),
        ProductId:num(pick(x, 'ProductId')),
        ProductCode:text(pick(x, 'ProductCode')),
        ProductName:text(pick(x, 'ProductName')),
        Unit:text(pick(x, 'Unit')),
        CategoryName:text(pick(x, 'CategoryName')),
        SubCategoryName:text(pick(x, 'SubCategoryName')),
        IsActive:!!pick(x, 'IsActive')
    };
}
