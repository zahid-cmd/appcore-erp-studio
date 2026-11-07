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
    CreateProductPricing,
    ProductPricing,
    ProductPricingBatch,
    ProductPricingBatchList,
    NewItemInput,
    NewItemResult,
    NewItemSetup,
    ProductPricingDefaults,
    ProductPricingInvoice,
    ProductPricingInvoiceLines,
    ProductPricingLine,
    ProductPricingSaved
}
from '../models/product-pricing.model';


//===============================================================
// Product Pricing (Price Change) service
//
//   GET    <api>?type=                 documents ('' = all types)
//   GET    <api>/defaults?type=
//   GET    <api>/batches?type=&productId=
//   GET    <api>/{id}
//   POST   <api>                       save draft
//   PUT    <api>/{id}                  change draft
//   DELETE <api>/{id}                  delete draft
//   PUT    <api>/{id}/post             post
//   PUT    <api>/{id}/cancel           { Reason }
//   PUT    <api>/restore               last deleted draft
//   GET    <api>/history · <api>/{id}/history
//
// The API answers in camelCase; mapped to PascalCase.
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class ProductPricingService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/inventory-management/pricing-labels/product-pricing`;

    getAll
    (
        type:
            string = ''
    ):
        Observable<ProductPricing[]>
    {
        return this.http
            .get<any[]>(this.apiUrl, { params:{ type } })
            .pipe(map(x => list(x).map(toPricing)));
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
            .pipe(map(raw => toPagedResult(raw, toPricing)));
    }

    getById
    (
        id:
            string
    ):
        Observable<ProductPricing>
    {
        return this.http
            .get<any>(`${this.apiUrl}/${id}`)
            .pipe(map(toPricing));
    }

    getDefaults
    (
        type:
            string
    ):
        Observable<ProductPricingDefaults>
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
                        NextNumber:text(pick(x, 'NextNumber')),
                        ProfitOnSale:!!pick(x, 'ProfitOnSale'),
                        GridEditable:pick(x, 'GridEditable') !== false,
                        RaiseOldStock:pick(x, 'RaiseOldStock') !== false,
                        ReductionAllStock:!!pick(x, 'ReductionAllStock'),
                        SalesVatApplicable:pick(x, 'SalesVatApplicable') !== false,
                        SalesVatRules:list(pick(x, 'SalesVatRules')).map
                        (
                            r =>
                            ({
                                VatType:text(pick(r, 'VatType')),
                                Rate:num(pick(r, 'Rate')),
                                EffectiveFrom:text(pick(r, 'EffectiveFrom')),
                                ValidTo:text(pick(r, 'ValidTo'))
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
                                VatType:text(pick(p, 'VatType')),
                                PartNumber:text(pick(p, 'PartNumber')),
                                PartName:text(pick(p, 'PartName')),
                                CategoryId:num(pick(p, 'CategoryId')),
                                SubCategoryId:num(pick(p, 'SubCategoryId')),
                                BrandId:num(pick(p, 'BrandId')),
                                BrandName:text(pick(p, 'BrandName')),
                                InStock:num(pick(p, 'InStock')),
                                BatchCount:num(pick(p, 'BatchCount')),
                                UnpricedCount:num(pick(p, 'UnpricedCount')),
                                LastMrp:num(pick(p, 'LastMrp'))
                            })
                        )
                    })
                )
            );
    }

    getBatches
    (
        type:
            string,
        productId:
            number
    ):
        Observable<ProductPricingBatchList>
    {
        return this.http
            .get<any>(`${this.apiUrl}/batches`, { params:{ type, productId:String(productId) } })
            .pipe(
                map
                (
                    x =>
                    ({
                        ProductId:num(pick(x, 'ProductId')),
                        SuggestedMrp:num(pick(x, 'SuggestedMrp')),
                        SuggestionNote:text(pick(x, 'SuggestionNote')),
                        LastMrp:num(pick(x, 'LastMrp')),
                        Batches:list(pick(x, 'Batches')).map(toBatch)
                    })
                )
            );
    }

    // Excel import : the stock of many products in one call
    getStocks
    (
        type:
            string,
        productIds:
            number[]
    ):
        Observable<ProductPricingBatchList[]>
    {
        return this.http
            .post<any[]>(`${this.apiUrl}/stocks`, productIds, { params:{ type } })
            .pipe(
                map
                (
                    rows =>
                        list(rows).map
                        (
                            x =>
                            ({
                                ProductId:num(pick(x, 'ProductId')),
                                SuggestedMrp:0,
                                SuggestionNote:'',
                                LastMrp:num(pick(x, 'LastMrp')),
                                Batches:list(pick(x, 'Batches')).map(toBatch)
                            })
                        )
                )
            );
    }

    // Excel import : groups, sub-groups, units and the current
    // branch's racks for parts not in the database
    getNewItemSetup
    (
        type:
            string
    ):
        Observable<NewItemSetup>
    {
        return this.http
            .get<any>(`${this.apiUrl}/new-item-setup`, { params:{ type } })
            .pipe(
                map
                (
                    x =>
                    ({
                        Categories:list(pick(x, 'Categories')).map(c => ({ Id:num(pick(c, 'Id')), Name:text(pick(c, 'Name')), CategoryType:text(pick(c, 'CategoryType')) })),
                        SubCategories:list(pick(x, 'SubCategories')).map(c => ({ Id:num(pick(c, 'Id')), CategoryId:num(pick(c, 'CategoryId')), Name:text(pick(c, 'Name')) })),
                        Units:list(pick(x, 'Units')).map(u => String(u ?? '')),
                        BranchId:num(pick(x, 'BranchId')),
                        BranchName:text(pick(x, 'BranchName')),
                        WarehouseId:num(pick(x, 'WarehouseId')),
                        WarehouseName:text(pick(x, 'WarehouseName')),
                        Racks:list(pick(x, 'Racks')).map
                        (
                            r =>
                            {
                                const shelves =
                                    list(pick(r, 'FreeShelves')).map(n => Number(n) || 0);

                                const bins =
                                    list(pick(r, 'FreeBins')).map
                                    (
                                        b =>
                                        ({
                                            ShelfNumber:num(pick(b, 'ShelfNumber')),
                                            BinNumber:num(pick(b, 'BinNumber')) || 1,
                                            BinCode:text(pick(b, 'BinCode'))
                                        })
                                    );

                                return {
                                    Id:num(pick(r, 'Id')),
                                    Name:text(pick(r, 'Name')),
                                    FreeShelves:shelves,
                                    // Old answers (no bins) : bin 1 of each free shelf
                                    FreeBins:Array.isArray(pick(r, 'FreeBins'))
                                        ? bins
                                        : shelves.map(n => ({ ShelfNumber:n, BinNumber:1, BinCode:'' }))
                                };
                            }
                        )
                    })
                )
            );
    }

    // Excel import : create the parts (the Spare Parts rules); each
    // row answers on its own
    createNewItems
    (
        items:
            NewItemInput[]
    ):
        Observable<NewItemResult[]>
    {
        return this.http
            .post<any[]>(`${this.apiUrl}/new-items`, items)
            .pipe(
                map
                (
                    rows =>
                        list(rows).map
                        (
                            x =>
                            ({
                                Key:num(pick(x, 'Key')),
                                Created:!!pick(x, 'Created'),
                                ProductId:num(pick(x, 'ProductId')),
                                ProductCode:text(pick(x, 'ProductCode')),
                                Error:text(pick(x, 'Error'))
                            })
                        )
                )
            );
    }

    getInvoices
    (
        type:
            string
    ):
        Observable<ProductPricingInvoice[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/invoices`, { params:{ type } })
            .pipe(map(x => list(x).map(toInvoice)));
    }

    getInvoice
    (
        type:
            string,
        purchaseId:
            number
    ):
        Observable<ProductPricingInvoiceLines>
    {
        return this.http
            .get<any>(`${this.apiUrl}/invoice`, { params:{ type, purchaseId:String(purchaseId) } })
            .pipe(
                map
                (
                    x =>
                    ({
                        Invoice:toInvoice(pick(x, 'Invoice')),
                        SupplierBasis:text(pick(x, 'SupplierBasis')),
                        SupplierPercent:num(pick(x, 'SupplierPercent')),
                        Lines:list(pick(x, 'Lines')).map
                        (
                            l =>
                            ({
                                StockBatchId:num(pick(l, 'StockBatchId')),
                                BatchNo:text(pick(l, 'BatchNo')),
                                PurchaseLineId:num(pick(l, 'PurchaseLineId')),
                                ProductId:num(pick(l, 'ProductId')),
                                ProductCode:text(pick(l, 'ProductCode')),
                                ProductName:text(pick(l, 'ProductName')),
                                Unit:text(pick(l, 'Unit')),
                                VatType:text(pick(l, 'VatType')),
                                SalesVatRate:num(pick(l, 'SalesVatRate')),
                                BranchId:num(pick(l, 'BranchId')),
                                BranchName:text(pick(l, 'BranchName')),
                                Quantity:num(pick(l, 'Quantity')),
                                ReceivedQuantity:num(pick(l, 'ReceivedQuantity')),
                                UnitCost:num(pick(l, 'UnitCost')),
                                Mrp:num(pick(l, 'Mrp')),
                                LastMrp:num(pick(l, 'LastMrp')),
                                LastMrpDate:text(pick(l, 'LastMrpDate')),
                                ProductStock:num(pick(l, 'ProductStock'))
                            })
                        )
                    })
                )
            );
    }

    create
    (
        dto:
            CreateProductPricing
    ):
        Observable<ProductPricingSaved>
    {
        return this.http
            .post<any>(this.apiUrl, dto)
            .pipe(map(toSaved));
    }

    update
    (
        publicId:
            string,
        dto:
            CreateProductPricing
    ):
        Observable<ProductPricingSaved>
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
        Observable<ProductPricingSaved>
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

function toInvoice
(
    x:
        any
):
    ProductPricingInvoice
{
    return {
        PurchaseId:num(pick(x, 'PurchaseId')),
        PurchaseNo:text(pick(x, 'PurchaseNo')),
        PurchaseDate:text(pick(x, 'PurchaseDate')),
        SupplierCode:text(pick(x, 'SupplierCode')),
        SupplierName:text(pick(x, 'SupplierName')),
        InvoicePriceBasis:text(pick(x, 'InvoicePriceBasis')),
        ReceivedLines:num(pick(x, 'ReceivedLines')),
        UnpricedLines:num(pick(x, 'UnpricedLines')),
        PendingLines:num(pick(x, 'PendingLines'))
    };
}

function toSaved
(
    x:
        any
):
    ProductPricingSaved
{
    return {
        PublicId:text(pick(x, 'PublicId')),
        ProductPricingId:num(pick(x, 'ProductPricingId')),
        PricingNo:text(pick(x, 'PricingNo')),
        Status:text(pick(x, 'Status'))
    };
}

function toBatch
(
    x:
        any
):
    ProductPricingBatch
{
    return {
        StockBatchId:num(pick(x, 'StockBatchId')),
        BatchNo:text(pick(x, 'BatchNo')),
        SourceType:text(pick(x, 'SourceType')),
        SourceNo:text(pick(x, 'SourceNo')),
        SourceDate:text(pick(x, 'SourceDate')),
        SupplierName:text(pick(x, 'SupplierName')),
        BranchId:num(pick(x, 'BranchId')),
        BranchName:text(pick(x, 'BranchName')),
        Quantity:num(pick(x, 'Quantity')),
        UnitCost:num(pick(x, 'UnitCost')),
        Mrp:num(pick(x, 'Mrp')),
        SuggestedMrp:num(pick(x, 'SuggestedMrp')),
        DefaultTicked:!!pick(x, 'DefaultTicked')
    };
}

function toLine
(
    x:
        any
):
    ProductPricingLine
{
    return {
        ProductPricingLineId:num(pick(x, 'ProductPricingLineId')),
        LineNo:num(pick(x, 'LineNo')),
        ProductId:num(pick(x, 'ProductId')),
        ProductCode:text(pick(x, 'ProductCode')),
        ProductName:text(pick(x, 'ProductName')),
        Unit:text(pick(x, 'Unit')),
        StockBatchId:num(pick(x, 'StockBatchId')),
        BatchNo:text(pick(x, 'BatchNo')),
        SourceType:text(pick(x, 'SourceType')),
        SourceNo:text(pick(x, 'SourceNo')),
        BranchId:num(pick(x, 'BranchId')),
        BranchName:text(pick(x, 'BranchName')),
        Quantity:num(pick(x, 'Quantity')),
        UnitCost:num(pick(x, 'UnitCost')),
        OldMrp:num(pick(x, 'OldMrp')),
        NewMrp:num(pick(x, 'NewMrp')),
        Notes:text(pick(x, 'Notes')),
        ReceivedQuantity:num(pick(x, 'ReceivedQuantity')),
        ProfitPercent:num(pick(x, 'ProfitPercent')),
        SuggestedMrp:num(pick(x, 'SuggestedMrp')),
        IsRaised:!!pick(x, 'IsRaised')
    };
}

function toPricing
(
    x:
        any
):
    ProductPricing
{
    return {
        PublicId:text(pick(x, 'PublicId')),
        ProductPricingId:num(pick(x, 'ProductPricingId')),
        PageType:text(pick(x, 'PageType')),
        PricingNo:text(pick(x, 'PricingNo')),
        PricingDate:text(pick(x, 'PricingDate')),
        Remarks:text(pick(x, 'Remarks')),
        PricingKind:text(pick(x, 'PricingKind')) || 'Reprice',
        PurchaseId:num(pick(x, 'PurchaseId')),
        PurchaseNo:text(pick(x, 'PurchaseNo')),
        SupplierName:text(pick(x, 'SupplierName')),
        PricingBasis:text(pick(x, 'PricingBasis')),
        BasisPercent:num(pick(x, 'BasisPercent')),
        ProductCount:num(pick(x, 'ProductCount')),
        BatchCount:num(pick(x, 'BatchCount')),
        Status:text(pick(x, 'Status')),
        PostedDate:text(pick(x, 'PostedDate')),
        CancelReason:text(pick(x, 'CancelReason')),
        CancelledDate:text(pick(x, 'CancelledDate')),
        CreatedDate:text(pick(x, 'CreatedDate')),
        Lines:list(pick(x, 'Lines')).map(toLine)
    };
}
