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
    CreatePriceAdjustment,
    PriceAdjustmentAnalyseInput,
    PriceAdjustmentAnalysis,
    PriceAdjustmentDefaults,
    PriceAdjustmentDetail,
    PriceAdjustmentLine,
    PriceAdjustmentListRow,
    PriceAdjustmentProduct,
    PriceAdjustmentRelease,
    PriceAdjustmentSupplier,
    UpdatePriceAdjustment
}
from '../models/price-adjustment.model';


//===============================================================
// Price Adjustment service
//
//   GET    <api>?type=                 documents ('' = all types;
//                                      deleted drafts included)
//   GET    <api>/defaults?type=
//   POST   <api>/analyse               the stock on the cut-off date
//   GET    <api>/{id}
//   POST   <api>                       save draft → new id
//   PUT    <api>/{id}                  change draft
//   DELETE <api>/{id}                  delete draft
//   PUT    <api>/{id}/restore          restore a deleted draft
//   POST   <api>/{id}/post             post
//   POST   <api>/{id}/cancel           { Reason }
//   GET    <api>/history · <api>/{id}/history
//
// The API answers in PascalCase (camelCase read too).
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class PriceAdjustmentService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/inventory-management/pricing-labels/price-adjustment`;

    getAll
    (
        type:
            string = ''
    ):
        Observable<PriceAdjustmentListRow[]>
    {
        return this.http
            .get<any[]>(this.apiUrl, { params:{ type } })
            .pipe(map(x => list(x).map(toListRow)));
    }

    // One page of the list plus the tab / type counts (server paging)
    getPaged
    (
        query:
            PagedQuery & { type?:string; tab?:string }
    ):
        Observable<PagedResult<PriceAdjustmentListRow>>
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
        Observable<PriceAdjustmentDetail>
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
        Observable<PriceAdjustmentDefaults>
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
                        NextNo:text(pick(x, 'NextNo')) || text(pick(x, 'NextNumber')),
                        Products:list(pick(x, 'Products')).map
                        (
                            p =>
                            ({
                                Id:num(pick(p, 'Id')),
                                Code:text(pick(p, 'Code')),
                                Name:text(pick(p, 'Name')),
                                PartNumber:text(pick(p, 'PartNumber')),
                                BrandId:num(pick(p, 'BrandId')),
                                BrandName:text(pick(p, 'BrandName')),
                                CategoryId:num(pick(p, 'CategoryId')),
                                CategoryName:text(pick(p, 'CategoryName')),
                                LastMrp:num(pick(p, 'LastMrp')),
                                Stock:num(pick(p, 'Stock'))
                            })
                        ),
                        Brands:list(pick(x, 'Brands')).map
                        (
                            b =>
                            ({
                                Id:num(pick(b, 'Id')),
                                Name:text(pick(b, 'Name'))
                            })
                        ),
                        Suppliers:list(pick(x, 'Suppliers')).map
                        (
                            s =>
                            ({
                                Code:text(pick(s, 'Code')),
                                Name:text(pick(s, 'Name')),
                                IncreaseTo:text(pick(s, 'IncreaseTo')),
                                ReductionTo:text(pick(s, 'ReductionTo'))
                            })
                        )
                    })
                )
            );
    }

    analyse
    (
        input:
            PriceAdjustmentAnalyseInput
    ):
        Observable<PriceAdjustmentAnalysis>
    {
        return this.http
            .post<any>(`${this.apiUrl}/analyse`, input)
            .pipe(map(toAnalysis));
    }

    // → the new document's id
    create
    (
        dto:
            CreatePriceAdjustment
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
            UpdatePriceAdjustment
    ):
        Observable<number>
    {
        return this.http
            .put<any>(`${this.apiUrl}/${id}`, { ...dto, PriceAdjustmentId:id })
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

// The id a save answers : a number, or { Id } / { PriceAdjustmentId }
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

    return num(pick(x, 'Id')) || num(pick(x, 'PriceAdjustmentId'));
}

function toListRow
(
    x:
        any
):
    PriceAdjustmentListRow
{
    return {
        PublicId:text(pick(x, 'PublicId')),
        Id:num(pick(x, 'Id')) || num(pick(x, 'PriceAdjustmentId')),
        AdjustmentNo:text(pick(x, 'AdjustmentNo')),
        PageType:text(pick(x, 'PageType')),
        CircularRef:text(pick(x, 'CircularRef')),
        CircularDate:day(pick(x, 'CircularDate')),
        CutOffDate:day(pick(x, 'CutOffDate')),
        Status:text(pick(x, 'Status')) || 'Draft',
        ProductCount:num(pick(x, 'ProductCount')),
        BatchCount:num(pick(x, 'BatchCount')),
        IncreaseAmount:num(pick(x, 'IncreaseAmount')),
        ReductionAmount:num(pick(x, 'ReductionAmount')),
        NetAmount:num(pick(x, 'NetAmount')),
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
    PriceAdjustmentProduct
{
    const oldMrp =
        num(pick(x, 'OldMrp'));

    const newMrp =
        num(pick(x, 'NewMrp'));

    const hasStock =
        pick(x, 'HasStock');

    return {
        PriceAdjustmentProductId:num(pick(x, 'PriceAdjustmentProductId')),
        LineNo:num(pick(x, 'LineNo')),
        ProductId:num(pick(x, 'ProductId')),
        ProductCode:text(pick(x, 'ProductCode')),
        ProductName:text(pick(x, 'ProductName')),
        PartNumber:text(pick(x, 'PartNumber')),
        OldMrp:oldMrp,
        NewMrp:newMrp,
        Direction:text(pick(x, 'Direction')) || (newMrp >= oldMrp ? 'Increase' : 'Reduction'),
        BatchCount:num(pick(x, 'BatchCount')),
        Quantity:num(pick(x, 'Quantity')),
        Amount:num(pick(x, 'Amount')),
        // A saved row carries no flag : stock = it has batches
        HasStock:hasStock === undefined || hasStock === null
            ? num(pick(x, 'BatchCount')) > 0
            : !!hasStock
    };
}

function toLine
(
    x:
        any
):
    PriceAdjustmentLine
{
    const quantity =
        num(pick(x, 'Quantity'));

    const sold =
        num(pick(x, 'SoldSinceCutOff'));

    const onHand =
        pick(x, 'QuantityOnHandNow');

    return {
        PriceAdjustmentLineId:num(pick(x, 'PriceAdjustmentLineId')),
        ProductId:num(pick(x, 'ProductId')),
        StockBatchId:num(pick(x, 'StockBatchId')),
        BatchNo:text(pick(x, 'BatchNo')),
        SupplierCode:text(pick(x, 'SupplierCode')),
        SupplierName:text(pick(x, 'SupplierName')),
        VatRate:num(pick(x, 'VatRate')),
        Quantity:quantity,
        SoldSinceCutOff:sold,
        ReleasedQuantity:num(pick(x, 'ReleasedQuantity')),
        // A saved line keeps none : the cut-off stock less the sold
        QuantityOnHandNow:onHand === undefined || onHand === null
            ? Math.max(0, quantity - sold)
            : num(onHand),
        UnitCost:num(pick(x, 'UnitCost')),
        OldMrp:num(pick(x, 'OldMrp')),
        NewMrp:num(pick(x, 'NewMrp')),
        MarginPercent:num(pick(x, 'MarginPercent')),
        MarginEdited:!!pick(x, 'MarginEdited'),
        NewUnitCost:num(pick(x, 'NewUnitCost')),
        DifferencePerUnit:num(pick(x, 'DifferencePerUnit')),
        Amount:num(pick(x, 'Amount'))
    };
}

function toSupplier
(
    x:
        any
):
    PriceAdjustmentSupplier
{
    return {
        SupplierCode:text(pick(x, 'SupplierCode')),
        SupplierName:text(pick(x, 'SupplierName')),
        IncreaseAmount:num(pick(x, 'IncreaseAmount')),
        ReductionAmount:num(pick(x, 'ReductionAmount')),
        IncreaseTo:text(pick(x, 'IncreaseTo')),
        ReductionTo:text(pick(x, 'ReductionTo'))
    };
}

function toRelease
(
    x:
        any
):
    PriceAdjustmentRelease
{
    return {
        PriceAdjustmentReleaseId:num(pick(x, 'PriceAdjustmentReleaseId')),
        PriceAdjustmentLineId:num(pick(x, 'PriceAdjustmentLineId')),
        StockBatchId:num(pick(x, 'StockBatchId')),
        Quantity:num(pick(x, 'Quantity')),
        Amount:num(pick(x, 'Amount')),
        SourceType:text(pick(x, 'SourceType')),
        SourceNo:text(pick(x, 'SourceNo')),
        ReleaseDate:day(pick(x, 'ReleaseDate')),
        CreatedDate:text(pick(x, 'CreatedDate'))
    };
}

function toAnalysis
(
    x:
        any
):
    PriceAdjustmentAnalysis
{
    return {
        CutOffDate:day(pick(x, 'CutOffDate')),
        Products:list(pick(x, 'Products')).map(toProduct),
        Lines:list(pick(x, 'Lines')).map(toLine),
        Suppliers:list(pick(x, 'Suppliers')).map(toSupplier),
        IncreaseAmount:num(pick(x, 'IncreaseAmount')),
        ReductionAmount:num(pick(x, 'ReductionAmount')),
        NetAmount:num(pick(x, 'NetAmount'))
    };
}

function toDetail
(
    x:
        any
):
    PriceAdjustmentDetail
{
    return {
        PublicId:text(pick(x, 'PublicId')),
        Id:num(pick(x, 'Id')) || num(pick(x, 'PriceAdjustmentId')),
        AdjustmentNo:text(pick(x, 'AdjustmentNo')),
        PageType:text(pick(x, 'PageType')),
        BranchId:num(pick(x, 'BranchId')),
        CircularRef:text(pick(x, 'CircularRef')),
        CircularDate:day(pick(x, 'CircularDate')),
        CutOffDate:day(pick(x, 'CutOffDate')),
        Remarks:text(pick(x, 'Remarks')),
        Status:text(pick(x, 'Status')) || 'Draft',
        ProductCount:num(pick(x, 'ProductCount')),
        BatchCount:num(pick(x, 'BatchCount')),
        IncreaseAmount:num(pick(x, 'IncreaseAmount')),
        ReductionAmount:num(pick(x, 'ReductionAmount')),
        NetAmount:num(pick(x, 'NetAmount')),
        IsDeleted:!!pick(x, 'IsDeleted'),
        CreatedDate:text(pick(x, 'CreatedDate')),
        PostedDate:text(pick(x, 'PostedDate')),
        CancelledDate:text(pick(x, 'CancelledDate')),
        CancelReason:text(pick(x, 'CancelReason')),
        CreatedByName:text(pick(x, 'CreatedByName')),
        PostedByName:text(pick(x, 'PostedByName')),
        CancelledByName:text(pick(x, 'CancelledByName')),
        CanEdit:!!pick(x, 'CanEdit'),
        CanPost:!!pick(x, 'CanPost'),
        CanCancel:!!pick(x, 'CanCancel'),
        Products:list(pick(x, 'Products')).map(toProduct),
        Lines:list(pick(x, 'Lines')).map(toLine),
        Suppliers:list(pick(x, 'Suppliers')).map(toSupplier),
        Releases:list(pick(x, 'Releases')).map(toRelease)
    };
}
