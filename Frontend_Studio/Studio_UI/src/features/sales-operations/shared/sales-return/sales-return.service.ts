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
    HttpClient,
    HttpParams
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
    SalesReturn,
    SalesReturnInvoice,
    SalesReturnInvoiceItem,
    SalesReturnInvoiceLine,
    SalesReturnLine,
    SalesReturnListItem,
    SalesReturnSaved,
    SalesReturnStatus,
    SalesReturnSwitches,
    SaveSalesReturn
}
from './sales-return.model';


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


function toInvoiceLine(x: any): SalesReturnInvoiceLine
{
    return {
        SalesInvoiceLineId:num(x, 'SalesInvoiceLineId'),
        LineNo:num(x, 'LineNo'),
        ProductId:num(x, 'ProductId'),
        ProductCode:text(x, 'ProductCode'),
        PartNumber:text(x, 'PartNumber'),
        ProductName:text(x, 'ProductName'),
        Unit:text(x, 'Unit'),
        MotorBikeUnitId:optNum(x, 'MotorBikeUnitId'),
        ChassisNo:text(x, 'ChassisNo'),
        EngineNo:text(x, 'EngineNo'),
        ColorName:text(x, 'ColorName'),
        SoldQuantity:num(x, 'SoldQuantity'),
        ReturnedQuantity:num(x, 'ReturnedQuantity'),
        PendingQuantity:num(x, 'PendingQuantity'),
        ReturnableQuantity:num(x, 'ReturnableQuantity'),
        UnitPrice:num(x, 'UnitPrice'),
        GrossAmount:num(x, 'GrossAmount'),
        DiscountAmount:num(x, 'DiscountAmount'),
        LineTotal:num(x, 'LineTotal'),
        NetPerUnit:num(x, 'NetPerUnit'),
        VatInside:num(x, 'VatInside'),
        RegistrationRefund:num(x, 'RegistrationRefund'),
        Blocked:text(x, 'Blocked')
    };
}


export function toSalesReturnInvoice(x: any): SalesReturnInvoice
{
    return {
        SalesInvoiceId:num(x, 'SalesInvoiceId'),
        PublicId:text(x, 'PublicId'),
        InvoiceNo:text(x, 'InvoiceNo'),
        InvoiceDate:day(x, 'InvoiceDate'),
        BranchId:num(x, 'BranchId'),
        BranchName:text(x, 'BranchName'),
        WarehouseName:text(x, 'WarehouseName'),
        CustomerId:num(x, 'CustomerId'),
        CustomerCode:text(x, 'CustomerCode'),
        CustomerName:text(x, 'CustomerName'),
        CustomerPhone:text(x, 'CustomerPhone'),
        CustomerAddress:text(x, 'CustomerAddress'),
        SalesPersonName:text(x, 'SalesPersonName'),
        PaymentTerm:text(x, 'PaymentTerm'),
        InvoiceTotal:num(x, 'InvoiceTotal'),
        PaidAmount:num(x, 'PaidAmount'),
        DueAmount:num(x, 'DueAmount'),
        AgeDays:num(x, 'AgeDays'),
        Blocked:text(x, 'Blocked'),
        Lines:((pick(x, 'Lines') ?? []) as any[]).map(toInvoiceLine)
    };
}


function toReturnLine(x: any): SalesReturnLine
{
    return {
        SalesReturnLineId:num(x, 'SalesReturnLineId'),
        LineNo:num(x, 'LineNo'),
        SalesInvoiceLineId:num(x, 'SalesInvoiceLineId'),
        InvoiceLineNo:num(x, 'InvoiceLineNo'),
        ProductId:num(x, 'ProductId'),
        ProductCode:text(x, 'ProductCode'),
        PartNumber:text(x, 'PartNumber'),
        ProductName:text(x, 'ProductName'),
        Unit:text(x, 'Unit'),
        MotorBikeUnitId:optNum(x, 'MotorBikeUnitId'),
        ChassisNo:text(x, 'ChassisNo'),
        EngineNo:text(x, 'EngineNo'),
        ColorName:text(x, 'ColorName'),
        SoldQuantity:num(x, 'SoldQuantity'),
        Quantity:num(x, 'Quantity'),
        UnitPrice:num(x, 'UnitPrice'),
        GrossAmount:num(x, 'GrossAmount'),
        DiscountAmount:num(x, 'DiscountAmount'),
        LineTotal:num(x, 'LineTotal'),
        VatRate:num(x, 'VatRate'),
        VatInside:num(x, 'VatInside'),
        BaseVat:num(x, 'BaseVat'),
        RegistrationRefund:num(x, 'RegistrationRefund'),
        CostAmount:num(x, 'CostAmount'),
        Reason:text(x, 'Reason')
    };
}


export function toSalesReturn(x: any): SalesReturn
{
    return {
        SalesReturnId:num(x, 'SalesReturnId'),
        PublicId:text(x, 'PublicId'),
        ProductType:(text(x, 'ProductType') || 'SP') as any,
        ReturnNo:text(x, 'ReturnNo'),
        ReturnDate:day(x, 'ReturnDate'),
        BranchId:num(x, 'BranchId'),
        BranchName:text(x, 'BranchName'),
        WarehouseName:text(x, 'WarehouseName'),
        SalesInvoiceId:num(x, 'SalesInvoiceId'),
        InvoicePublicId:text(x, 'InvoicePublicId'),
        SalesInvoiceNo:text(x, 'SalesInvoiceNo'),
        SalesInvoiceDate:day(x, 'SalesInvoiceDate'),
        CustomerId:num(x, 'CustomerId'),
        CustomerCode:text(x, 'CustomerCode'),
        CustomerName:text(x, 'CustomerName'),
        CustomerPhone:text(x, 'CustomerPhone'),
        CustomerAddress:text(x, 'CustomerAddress'),
        Reason:text(x, 'Reason'),
        Narration:text(x, 'Narration'),
        TotalQuantity:num(x, 'TotalQuantity'),
        GrossAmount:num(x, 'GrossAmount'),
        DiscountAmount:num(x, 'DiscountAmount'),
        ItemsAmount:num(x, 'ItemsAmount'),
        RegistrationRefund:num(x, 'RegistrationRefund'),
        ReturnTotal:num(x, 'ReturnTotal'),
        TotalVatInside:num(x, 'TotalVatInside'),
        TotalBaseVat:num(x, 'TotalBaseVat'),
        CostAmount:num(x, 'CostAmount'),
        Status:(text(x, 'Status') || 'Draft') as SalesReturnStatus,
        VoucherNo:text(x, 'VoucherNo'),
        CancelReason:text(x, 'CancelReason'),
        CreatedByName:text(x, 'CreatedByName'),
        CreatedDate:text(x, 'CreatedDate'),
        ApprovedByName:text(x, 'ApprovedByName'),
        PostedByName:text(x, 'PostedByName'),
        PostedDate:text(x, 'PostedDate'),
        Lines:((pick(x, 'Lines') ?? []) as any[]).map(toReturnLine)
    };
}


function toSaved(x: any): SalesReturnSaved
{
    return {
        SalesReturnId:num(x, 'SalesReturnId'),
        PublicId:text(x, 'PublicId'),
        ReturnNo:text(x, 'ReturnNo'),
        Status:text(x, 'Status'),
        ReturnTotal:num(x, 'ReturnTotal'),
        Warnings:((pick(x, 'Warnings') ?? []) as any[]).map(w => String(w))
    };
}


//===============================================================
// Sales Returns - MB / SP / AC : the return API of a page (page
// config apiPath)
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class SalesReturnService
{
    private readonly http =
        inject(HttpClient);

    private url(apiPath: string): string
    {
        return `${environment.apiUrl}/${apiPath}`;
    }


    getSwitches(apiPath: string): Observable<SalesReturnSwitches>
    {
        return this.http
            .get<any>(`${this.url(apiPath)}/switches`)
            .pipe(
                map
                (
                    x =>
                    ({
                        PostOnApproval:!!pick(x, 'PostOnApproval'),
                        ReturnWindowDays:optNum(x, 'ReturnWindowDays'),
                        PostOnApprovalCode:text(x, 'PostOnApprovalCode'),
                        ReturnWindowCode:text(x, 'ReturnWindowCode'),
                        BranchId:num(x, 'BranchId'),
                        BranchName:text(x, 'BranchName'),
                        Today:day(x, 'Today')
                    })
                )
            );
    }


    findInvoices(apiPath: string, search: string): Observable<SalesReturnInvoiceItem[]>
    {
        const params =
            new HttpParams().set('search', search ?? '');

        return this.http
            .get<any[]>(`${this.url(apiPath)}/invoices`, { params })
            .pipe(
                map
                (
                    rows =>
                        (rows ?? []).map
                        (
                            r =>
                            ({
                                SalesInvoiceId:num(r, 'SalesInvoiceId'),
                                PublicId:text(r, 'PublicId'),
                                InvoiceNo:text(r, 'InvoiceNo'),
                                InvoiceDate:day(r, 'InvoiceDate'),
                                CustomerCode:text(r, 'CustomerCode'),
                                CustomerName:text(r, 'CustomerName'),
                                CustomerPhone:text(r, 'CustomerPhone'),
                                ItemsText:text(r, 'ItemsText'),
                                InvoiceTotal:num(r, 'InvoiceTotal'),
                                SoldQuantity:num(r, 'SoldQuantity'),
                                ReturnedQuantity:num(r, 'ReturnedQuantity'),
                                ReturnableQuantity:num(r, 'ReturnableQuantity'),
                                AgeDays:num(r, 'AgeDays'),
                                OutsideWindow:!!pick(r, 'OutsideWindow')
                            })
                        )
                )
            );
    }


    getInvoice(apiPath: string, invoicePublicId: string, exceptReturnPublicId: string = ''): Observable<SalesReturnInvoice>
    {
        let params = new HttpParams();

        if (exceptReturnPublicId)
        {
            params = params.set('except', exceptReturnPublicId);
        }

        return this.http
            .get<any>(`${this.url(apiPath)}/invoices/${invoicePublicId}`, { params })
            .pipe(map(x => toSalesReturnInvoice(x)));
    }


    getAll(apiPath: string): Observable<SalesReturnListItem[]>
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
                                SalesReturnId:num(r, 'SalesReturnId'),
                                PublicId:text(r, 'PublicId'),
                                ReturnNo:text(r, 'ReturnNo'),
                                ReturnDate:day(r, 'ReturnDate'),
                                BranchId:num(r, 'BranchId'),
                                BranchName:text(r, 'BranchName'),
                                SalesInvoiceNo:text(r, 'SalesInvoiceNo'),
                                SalesInvoiceDate:day(r, 'SalesInvoiceDate'),
                                CustomerName:text(r, 'CustomerName'),
                                CustomerPhone:text(r, 'CustomerPhone'),
                                ItemsText:text(r, 'ItemsText'),
                                TotalQuantity:num(r, 'TotalQuantity'),
                                ReturnTotal:num(r, 'ReturnTotal'),
                                Reason:text(r, 'Reason'),
                                Status:(text(r, 'Status') || 'Draft') as SalesReturnStatus
                            })
                        )
                )
            );
    }


    getById(apiPath: string, publicId: string): Observable<SalesReturn>
    {
        return this.http
            .get<any>(`${this.url(apiPath)}/${publicId}`)
            .pipe(map(x => toSalesReturn(x)));
    }


    create(apiPath: string, model: SaveSalesReturn): Observable<SalesReturnSaved>
    {
        return this.http
            .post<any>(this.url(apiPath), model)
            .pipe(map(x => toSaved(x)));
    }


    update(apiPath: string, publicId: string, model: SaveSalesReturn): Observable<SalesReturnSaved>
    {
        return this.http
            .put<any>(`${this.url(apiPath)}/${publicId}`, model)
            .pipe(map(x => toSaved(x)));
    }


    approve(apiPath: string, publicId: string): Observable<void>
    {
        return this.http.put<void>(`${this.url(apiPath)}/${publicId}/approve`, {});
    }


    returnToDraft(apiPath: string, publicId: string): Observable<void>
    {
        return this.http.put<void>(`${this.url(apiPath)}/${publicId}/return`, {});
    }


    post(apiPath: string, publicId: string): Observable<SalesReturnSaved>
    {
        return this.http
            .put<any>(`${this.url(apiPath)}/${publicId}/post`, {})
            .pipe(map(x => toSaved(x)));
    }


    cancel(apiPath: string, publicId: string, reason: string): Observable<void>
    {
        return this.http.put<void>(`${this.url(apiPath)}/${publicId}/cancel`, { Reason:reason });
    }


    remove(apiPath: string, publicId: string): Observable<void>
    {
        return this.http.delete<void>(`${this.url(apiPath)}/${publicId}`);
    }


    getHistory(apiPath: string, id: number): Observable<any[]>
    {
        return this.http.get<any[]>(`${this.url(apiPath)}/history/${id}`);
    }
}
