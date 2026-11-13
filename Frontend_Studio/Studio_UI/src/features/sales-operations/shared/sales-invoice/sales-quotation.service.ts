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
    SalesInvoicePageType,
    SalesQuotation,
    SalesQuotationLine,
    SalesQuotationListItem,
    SalesQuotationSaved,
    SaveSalesQuotation
}
from './sales-invoice.model';


//===============================================================
// Read helpers (PascalCase or camelCase from the API)
//===============================================================

const pick =
    (x: any, name: string): any =>
        x?.[name] ?? x?.[name.charAt(0).toLowerCase() + name.slice(1)];

const text =
    (x: any, name: string): string =>
        String(pick(x, name) ?? '');

const num =
    (x: any, name: string): number =>
        Number(pick(x, name) ?? 0) || 0;

const optNum =
    (x: any, name: string): number | null =>
    {
        const value = pick(x, name);

        return value == null || value === '' ? null : Number(value) || null;
    };

const day =
    (x: any, name: string): string =>
        text(x, name).substring(0, 10);


//===============================================================
// Sales Quotations - MB / SP / AC : the quotation API of a page
// (page config quotationApiPath). Pricing stays on the invoice
// API (POST quote?quotation=true).
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class SalesQuotationService
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

    getAll
    (
        apiPath:
            string
    ):
        Observable<SalesQuotationListItem[]>
    {
        return this.http
            .get<any[]>(this.url(apiPath))
            .pipe(
                map
                (
                    rows =>
                        (rows ?? []).map
                        (
                            r =>
                            ({
                                SalesQuotationId:num(r, 'SalesQuotationId'),
                                PublicId:text(r, 'PublicId'),
                                QuotationNo:text(r, 'QuotationNo'),
                                QuotationDate:day(r, 'QuotationDate'),
                                ValidUntil:day(r, 'ValidUntil'),
                                IsExpired:!!pick(r, 'IsExpired'),
                                BranchId:num(r, 'BranchId'),
                                BranchName:text(r, 'BranchName'),
                                IsProspect:!!pick(r, 'IsProspect'),
                                CustomerName:text(r, 'CustomerName'),
                                CustomerPhone:text(r, 'CustomerPhone'),
                                ItemsText:text(r, 'ItemsText'),
                                TotalQuantity:num(r, 'TotalQuantity'),
                                QuotationTotal:num(r, 'QuotationTotal'),
                                SalesPersonName:text(r, 'SalesPersonName'),
                                Status:text(r, 'Status') || 'Open',
                                SalesInvoiceNo:text(r, 'SalesInvoiceNo'),
                                HeldByInvoiceNo:text(r, 'HeldByInvoiceNo')
                            })
                        )
                )
            );
    }

    getById
    (
        apiPath:
            string,
        publicId:
            string
    ):
        Observable<SalesQuotation>
    {
        return this.http
            .get<any>(`${this.url(apiPath)}/${publicId}`)
            .pipe(map(x => toQuotation(x)));
    }

    create
    (
        apiPath:
            string,
        model:
            SaveSalesQuotation
    ):
        Observable<SalesQuotationSaved>
    {
        return this.http
            .post<any>(this.url(apiPath), model)
            .pipe(map(x => ({ PublicId:text(x, 'PublicId'), QuotationNo:text(x, 'QuotationNo') })));
    }

    update
    (
        apiPath:
            string,
        publicId:
            string,
        model:
            SaveSalesQuotation
    ):
        Observable<SalesQuotationSaved>
    {
        return this.http
            .put<any>(`${this.url(apiPath)}/${publicId}`, model)
            .pipe(map(x => ({ PublicId:text(x, 'PublicId'), QuotationNo:text(x, 'QuotationNo') })));
    }

    cancel
    (
        apiPath:
            string,
        publicId:
            string,
        reason:
            string
    ):
        Observable<void>
    {
        return this.http.put<void>(`${this.url(apiPath)}/${publicId}/cancel`, { Reason:reason });
    }

    remove
    (
        apiPath:
            string,
        publicId:
            string
    ):
        Observable<void>
    {
        return this.http.delete<void>(`${this.url(apiPath)}/${publicId}`);
    }

    getHistory
    (
        apiPath:
            string,
        id:
            number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.url(apiPath)}/history/${id}`);
    }
}


export function toQuotation
(
    x:
        any
):
    SalesQuotation
{
    return {
        SalesQuotationId:num(x, 'SalesQuotationId'),
        PublicId:text(x, 'PublicId'),
        ProductType:(text(x, 'ProductType') || 'SP') as SalesInvoicePageType,
        QuotationNo:text(x, 'QuotationNo'),
        QuotationDate:day(x, 'QuotationDate'),
        ValidUntil:day(x, 'ValidUntil'),
        IsExpired:!!pick(x, 'IsExpired'),
        BranchId:num(x, 'BranchId'),
        BranchName:text(x, 'BranchName'),
        WarehouseId:num(x, 'WarehouseId'),
        SalesPersonId:optNum(x, 'SalesPersonId'),
        SalesPersonName:text(x, 'SalesPersonName'),
        CustomerId:optNum(x, 'CustomerId'),
        IsProspect:!!pick(x, 'IsProspect'),
        CustomerCode:text(x, 'CustomerCode'),
        CustomerName:text(x, 'CustomerName'),
        CustomerPhone:text(x, 'CustomerPhone'),
        CustomerAddress:text(x, 'CustomerAddress'),
        SaleType:text(x, 'SaleType'),
        InvoiceSpecialType:((text(x, 'InvoiceSpecialType') || 'None') as SalesQuotation['InvoiceSpecialType']),
        InvoiceSpecialValue:num(x, 'InvoiceSpecialValue'),
        FractionalDiscount:num(x, 'FractionalDiscount'),
        TotalQuantity:num(x, 'TotalQuantity'),
        GrossAmount:num(x, 'GrossAmount'),
        DiscountAmount:num(x, 'DiscountAmount'),
        QuotationTotal:num(x, 'QuotationTotal'),
        TotalVatInside:num(x, 'TotalVatInside'),
        Narration:text(x, 'Narration'),
        Terms:text(x, 'Terms'),
        SpecificUnits:!!pick(x, 'SpecificUnits'),
        Status:text(x, 'Status') || 'Open',
        SalesInvoiceNo:text(x, 'SalesInvoiceNo'),
        ConvertedDate:day(x, 'ConvertedDate'),
        HeldByInvoiceNo:text(x, 'HeldByInvoiceNo'),
        CancelReason:text(x, 'CancelReason'),
        CreatedByName:text(x, 'CreatedByName'),
        CreatedDate:text(x, 'CreatedDate'),
        Lines:
            ((pick(x, 'Lines') ?? []) as any[]).map
            (
                (l): SalesQuotationLine =>
                ({
                    LineNo:num(l, 'LineNo'),
                    ProductId:num(l, 'ProductId'),
                    ProductCode:text(l, 'ProductCode'),
                    PartNumber:text(l, 'PartNumber'),
                    ProductName:text(l, 'ProductName'),
                    Unit:text(l, 'Unit'),
                    Quantity:num(l, 'Quantity'),
                    TypedPrice:optNum(l, 'TypedPrice'),
                    TypedSpecialPercent:optNum(l, 'TypedSpecialPercent'),
                    TypedSpecialTk:optNum(l, 'TypedSpecialTk'),
                    Mrp:num(l, 'Mrp'),
                    UnitPrice:num(l, 'UnitPrice'),
                    GrossAmount:num(l, 'GrossAmount'),
                    DiscountLabel:text(l, 'DiscountLabel'),
                    DiscountAmount:num(l, 'DiscountAmount'),
                    NetAmount:num(l, 'NetAmount'),
                    VatInside:num(l, 'VatInside'),
                    Units:
                        ((pick(l, 'Units') ?? []) as any[]).map
                        (
                            u =>
                            ({
                                ProductId:num(u, 'ProductId'),
                                MotorBikeUnitId:num(u, 'MotorBikeUnitId'),
                                ChassisNo:text(u, 'ChassisNo'),
                                EngineNo:text(u, 'EngineNo'),
                                ColorName:text(u, 'ColorName')
                            })
                        )
                })
            )
    };
}
