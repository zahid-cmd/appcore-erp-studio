//===============================================================
// Product Pricing - Motor Bikes : API (2026-11-09)
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
    PriceCard,
    PriceCardActive,
    PriceCardCost,
    PriceCardDefaults,
    PriceCardLine,
    PriceCardSaved,
    SavePriceCard
}
from '../models/product-pricing-motor-bikes.model';


@Injectable(
{
    providedIn:'root'
})
export class ProductPricingMotorBikesService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/inventory-management/pricing-labels/product-pricing-motor-bikes`;

    getPaged
    (
        query:
            Record<string, unknown>
    ):
        Observable<PagedResult<PriceCard>>
    {
        return this.http
            .get<any>(`${this.apiUrl}/paged`, { params:toPagedParams({ ...query }) })
            .pipe(map(raw => toPagedResult(raw, toCard)));
    }

    getById
    (
        publicId:
            string
    ):
        Observable<PriceCard>
    {
        return this.http
            .get<any>(`${this.apiUrl}/${publicId}`)
            .pipe(map(toCard));
    }

    getDefaults():
        Observable<PriceCardDefaults>
    {
        return this.http
            .get<any>(`${this.apiUrl}/defaults`)
            .pipe
            (
                map
                (
                    x =>
                    ({
                        Today:text(pick(x, 'Today')),
                        NextNumber:text(pick(x, 'NextNumber')),
                        Suppliers:list(pick(x, 'Suppliers')).map(s => ({
                            SupplierCode:text(pick(s, 'SupplierCode')),
                            SupplierName:text(pick(s, 'SupplierName'))
                        })),
                        Products:list(pick(x, 'Products')).map(p => ({
                            MotorBikeId:num(pick(p, 'MotorBikeId')),
                            ProductCode:text(pick(p, 'ProductCode')),
                            ProductName:text(pick(p, 'ProductName')),
                            ModelId:num(pick(p, 'ModelId')),
                            ModelName:text(pick(p, 'ModelName')),
                            ColorName:text(pick(p, 'ColorName')),
                            ImagePath:text(pick(p, 'ImagePath')),
                            IsActive:pick(p, 'IsActive') !== false
                        })),
                        VatRules:list(pick(x, 'VatRules')).map(r => ({
                            Rate:num(pick(r, 'Rate')),
                            EffectiveFrom:text(pick(r, 'EffectiveFrom')).substring(0, 10),
                            ValidTo:text(pick(r, 'ValidTo')).substring(0, 10)
                        })),
                        PurchaseVatRules:list(pick(x, 'PurchaseVatRules')).map(r => ({
                            Rate:num(pick(r, 'Rate')),
                            EffectiveFrom:text(pick(r, 'EffectiveFrom')).substring(0, 10),
                            ValidTo:text(pick(r, 'ValidTo')).substring(0, 10)
                        }))
                    })
                )
            );
    }

    // Last purchase cost (from the supplier) and stock per colour
    getCosts
    (
        supplierCode:
            string
    ):
        Observable<PriceCardCost[]>
    {
        return this.http
            .get<any>(`${this.apiUrl}/costs`, { params:{ supplierCode } })
            .pipe
            (
                map
                (
                    rows =>
                        list(rows).map(x => ({
                            MotorBikeId:num(pick(x, 'MotorBikeId')),
                            LastBatchId:num(pick(x, 'LastBatchId')),
                            LastDate:text(pick(x, 'LastDate')),
                            LastSourceNo:text(pick(x, 'LastSourceNo')),
                            LastUnitCost:num(pick(x, 'LastUnitCost')),
                            LastVat:num(pick(x, 'LastVat')),
                            LastPaid:num(pick(x, 'LastPaid')),
                            StockQty:num(pick(x, 'StockQty')),
                            StockAvgPaid:num(pick(x, 'StockAvgPaid'))
                        }))
                )
            );
    }

    // The card in force per model for a supplier on a date
    getActive
    (
        supplierCode:
            string,
        date:
            string,
        // true : the Regular card only (no Campaign prices)
        regularOnly:
            boolean = false
    ):
        Observable<PriceCardActive[]>
    {
        return this.http
            .get<any>(`${this.apiUrl}/active`, { params:{ supplierCode, date, regularOnly } })
            .pipe
            (
                map
                (
                    rows =>
                        list(rows).map(x => ({
                            MotorBikeId:num(pick(x, 'MotorBikeId')),
                            ModelId:num(pick(x, 'ModelId')),
                            FromModel:pick(x, 'FromModel') === true,
                            CardId:num(pick(x, 'CardId')),
                            CardNo:text(pick(x, 'CardNo')),
                            CardType:text(pick(x, 'CardType')),
                            EffectiveFrom:text(pick(x, 'EffectiveFrom')),
                            EffectiveTo:text(pick(x, 'EffectiveTo')),
                            Dp:num(pick(x, 'Dp')),
                            Mrp:num(pick(x, 'Mrp')),
                            Commission:num(pick(x, 'Commission'))
                        }))
                )
            );
    }

    create
    (
        model:
            SavePriceCard
    ):
        Observable<PriceCardSaved>
    {
        return this.http
            .post<any>(this.apiUrl, model)
            .pipe(map(toSaved));
    }

    update
    (
        publicId:
            string,
        model:
            SavePriceCard
    ):
        Observable<PriceCardSaved>
    {
        return this.http
            .put<any>(`${this.apiUrl}/${publicId}`, model)
            .pipe(map(toSaved));
    }

    delete
    (
        publicId:
            string
    ):
        Observable<void>
    {
        return this.http.delete<void>(`${this.apiUrl}/${publicId}`);
    }

    post
    (
        publicId:
            string
    ):
        Observable<PriceCardSaved>
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
        return this.http.put<void>(`${this.apiUrl}/${publicId}/cancel`, { Reason:reason });
    }

    restore():
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/restore`, {});
    }

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/history`);
    }

    getEntityHistory
    (
        publicId:
            string
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/${publicId}/history`);
    }
}


//===============================================================
// Mapping (PascalCase or camelCase from the API)
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
    if (!source)
    {
        return undefined;
    }

    if (name in source)
    {
        return source[name];
    }

    const camel =
        name.charAt(0).toLowerCase() + name.slice(1);

    return source[camel];
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
    return Array.isArray(value) ? value : [];
}

function toLine
(
    x:
        any
):
    PriceCardLine
{
    return {
        LineNo:num(pick(x, 'LineNo')),
        ModelId:num(pick(x, 'ModelId')),
        ModelName:text(pick(x, 'ModelName')),
        IsException:pick(x, 'IsException') === true,
        MotorBikeId:num(pick(x, 'MotorBikeId')),
        ProductCode:text(pick(x, 'ProductCode')),
        ProductName:text(pick(x, 'ProductName')),
        Dp:num(pick(x, 'Dp')),
        Mrp:num(pick(x, 'Mrp')),
        VatRate:num(pick(x, 'VatRate')),
        VatInside:num(pick(x, 'VatInside')),
        NetSale:num(pick(x, 'NetSale')),
        Commission:num(pick(x, 'Commission')),
        CommissionPercent:num(pick(x, 'CommissionPercent'))
    };
}

export function toCard
(
    x:
        any
):
    PriceCard
{
    return {
        Id:num(pick(x, 'Id')),
        PublicId:text(pick(x, 'PublicId')),
        CardNo:text(pick(x, 'CardNo')),
        SupplierCode:text(pick(x, 'SupplierCode')),
        SupplierName:text(pick(x, 'SupplierName')),
        CardType:text(pick(x, 'CardType')) || 'Regular',
        EffectiveFrom:text(pick(x, 'EffectiveFrom')).substring(0, 10),
        EffectiveTo:text(pick(x, 'EffectiveTo')).substring(0, 10),
        Reference:text(pick(x, 'Reference')),
        Remarks:text(pick(x, 'Remarks')),
        ProductCount:num(pick(x, 'ProductCount')),
        Status:text(pick(x, 'Status')),
        PostedDate:text(pick(x, 'PostedDate')),
        CancelledDate:text(pick(x, 'CancelledDate')),
        CancelReason:text(pick(x, 'CancelReason')),
        SupersededByNo:text(pick(x, 'SupersededByNo')),
        SupersededFrom:text(pick(x, 'SupersededFrom')).substring(0, 10),
        Superseded:pick(x, 'Superseded') === true,
        InForce:pick(x, 'InForce') === true,
        Lines:list(pick(x, 'Lines')).map(toLine)
    };
}

function toSaved
(
    x:
        any
):
    PriceCardSaved
{
    return {
        Id:num(pick(x, 'Id')),
        PublicId:text(pick(x, 'PublicId')),
        CardNo:text(pick(x, 'CardNo')),
        Status:text(pick(x, 'Status'))
    };
}
