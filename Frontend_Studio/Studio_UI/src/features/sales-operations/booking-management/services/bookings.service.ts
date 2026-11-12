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
    Booking,
    BookingCollection,
    BookingCustomer,
    BookingLine,
    BookingProduct,
    BookingSaved,
    BookingType,
    BookingsPage,
    CreateBooking,
    OpenBooking,
    UpdateBooking
}
from '../models/bookings.model';


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

const list =
    (x: any, name: string): any[] =>
        (pick(x, name) ?? []) as any[];

const day =
    (x: any, name: string): string =>
        text(x, name).substring(0, 10);


const toLine =
    (r: any): BookingLine =>
    ({
        ProductId:num(r, 'ProductId'),
        ProductCode:text(r, 'ProductCode'),
        PartNumber:text(r, 'PartNumber'),
        ProductName:text(r, 'ProductName'),
        Unit:text(r, 'Unit'),
        Quantity:num(r, 'Quantity'),
        Remarks:text(r, 'Remarks')
    });


//===============================================================
// Bookings service (every call names the type MB / SP / AC)
//   api/sales-operations/booking-management/bookings/{mb|sp|ac}
//   Customer search : the Sales Invoice - MB lookup
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class BookingsService
{
    private readonly http =
        inject(HttpClient);

    private readonly baseUrl =
        `${environment.apiUrl}/sales-operations/booking-management/bookings`;

    private url
    (
        type:
            BookingType
    ):
        string
    {
        return `${this.baseUrl}/${type.toLowerCase()}`;
    }

    private readonly invoiceUrl =
        `${environment.apiUrl}/sales-operations/motor-bike-sales/sales-invoices-mb`;


    getPage
    (
        type:
            BookingType
    ):
        Observable<BookingsPage>
    {
        return this.http
            .get<any>(this.url(type))
            .pipe(
                map
                (
                    x =>
                    {
                        const s =
                            pick(x, 'Switches') ?? {};

                        return {
                            ProductType:((text(x, 'ProductType') || type) as BookingType),
                            Today:day(x, 'Today'),
                            BranchId:num(x, 'BranchId'),
                            BranchName:text(x, 'BranchName'),
                            Switches:
                            {
                                MinimumAmount:pick(s, 'MinimumAmount') == null ? null : num(s, 'MinimumAmount'),
                                ValidityDays:pick(s, 'ValidityDays') == null ? null : num(s, 'ValidityDays'),
                                RefundOnCancel:pick(s, 'RefundOnCancel') !== false,
                                ForfeitPercent:num(s, 'ForfeitPercent')
                            },
                            CanCancel:!!pick(x, 'CanCancel'),
                            Bookings:list(x, 'Bookings').map(r => toBooking(r)),
                            Collections:list(x, 'Collections').map(r => toCollection(r)),
                            Models:
                                list(x, 'Models').map
                                (
                                    r =>
                                    ({
                                        MotorBikeId:num(r, 'MotorBikeId'),
                                        ProductCode:text(r, 'ProductCode'),
                                        ProductName:text(r, 'ProductName')
                                    })
                                )
                        };
                    }
                )
            );
    }

    searchCustomers
    (
        q:
            string
    ):
        Observable<BookingCustomer[]>
    {
        return this.http
            .get<any[]>(`${this.invoiceUrl}/customer-search`, { params:{ q } })
            .pipe(
                map
                (
                    rows =>
                        (rows ?? []).map
                        (
                            r =>
                            ({
                                CustomerId:num(r, 'CustomerId'),
                                CustomerCode:text(r, 'CustomerCode'),
                                CustomerName:text(r, 'CustomerName') || text(r, 'DisplayName'),
                                Phone1:text(r, 'Phone1'),
                                CustomerType:text(r, 'CustomerType'),
                                IsWalkIn:!!pick(r, 'IsWalkIn')
                            })
                        )
                )
            );
    }

    // SP / AC : items by name / code / part number (2+ letters)
    searchProducts
    (
        type:
            BookingType,
        term:
            string
    ):
        Observable<BookingProduct[]>
    {
        return this.http
            .get<any[]>(`${this.url(type)}/products`, { params:{ term } })
            .pipe(
                map
                (
                    rows =>
                        (rows ?? []).map
                        (
                            r =>
                            ({
                                ProductId:num(r, 'ProductId'),
                                ProductCode:text(r, 'ProductCode'),
                                PartNumber:text(r, 'PartNumber'),
                                ProductName:text(r, 'ProductName'),
                                Unit:text(r, 'Unit')
                            })
                        )
                )
            );
    }

    create
    (
        type:
            BookingType,
        model:
            CreateBooking
    ):
        Observable<BookingSaved>
    {
        return this.http.post<any>(this.url(type), model).pipe(map(x => toSaved(x)));
    }

    update
    (
        type:
            BookingType,
        publicId:
            string,
        model:
            UpdateBooking
    ):
        Observable<void>
    {
        return this.http.put<void>(`${this.url(type)}/${publicId}`, model);
    }

    collect
    (
        type:
            BookingType,
        publicId:
            string,
        model:
            { Date:string; Remarks:string; Debits:any[] }
    ):
        Observable<BookingSaved>
    {
        return this.http.post<any>(`${this.url(type)}/${publicId}/collect`, model).pipe(map(x => toSaved(x)));
    }

    cancel
    (
        type:
            BookingType,
        publicId:
            string,
        reason:
            string,
        forfeitAmount:
            number
    ):
        Observable<BookingSaved>
    {
        return this.http
            .put<any>(`${this.url(type)}/${publicId}/cancel`, { Reason:reason, ForfeitAmount:forfeitAmount })
            .pipe(map(x => toSaved(x)));
    }

    getHistory
    (
        type:
            BookingType,
        bookingId:
            number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.url(type)}/history/${bookingId}`);
    }

    // Open bookings of a customer (Sales Invoice of the type)
    getOpen
    (
        type:
            BookingType,
        customerId:
            number
    ):
        Observable<OpenBooking[]>
    {
        return this.http
            .get<any[]>(`${this.url(type)}/open`, { params:{ customerId:String(customerId) } })
            .pipe(
                map
                (
                    rows =>
                        (rows ?? []).map
                        (
                            r =>
                            ({
                                BookingId:num(r, 'BookingId'),
                                BookingNo:text(r, 'BookingNo'),
                                BookingDate:day(r, 'BookingDate'),
                                MotorBikeId:num(r, 'MotorBikeId'),
                                ModelName:text(r, 'ModelName'),
                                Lines:list(r, 'Lines').map(l => toLine(l)),
                                AdvanceAmount:num(r, 'AdvanceAmount'),
                                IsExpired:!!pick(r, 'IsExpired'),
                                ValidUntil:day(r, 'ValidUntil'),
                                HeldByInvoiceNo:text(r, 'HeldByInvoiceNo')
                            })
                        )
                )
            );
    }
}


function toBooking
(
    r:
        any
):
    Booking
{
    return {
        BookingId:num(r, 'BookingId'),
        PublicId:text(r, 'PublicId'),
        BookingNo:text(r, 'BookingNo'),
        BookingDate:day(r, 'BookingDate'),
        BranchId:num(r, 'BranchId'),
        BranchName:text(r, 'BranchName'),
        CustomerId:num(r, 'CustomerId'),
        CustomerCode:text(r, 'CustomerCode'),
        CustomerName:text(r, 'CustomerName'),
        CustomerPhone:text(r, 'CustomerPhone'),
        MotorBikeId:num(r, 'MotorBikeId'),
        ModelName:text(r, 'ModelName'),
        Lines:list(r, 'Lines').map(l => toLine(l)),
        ValidUntil:day(r, 'ValidUntil'),
        ExpectedDate:day(r, 'ExpectedDate'),
        SalesPersonName:text(r, 'SalesPersonName'),
        Remarks:text(r, 'Remarks'),
        AdvanceAmount:num(r, 'AdvanceAmount'),
        Status:(text(r, 'Status') || 'Open') as Booking['Status'],
        IsExpired:!!pick(r, 'IsExpired'),
        SalesInvoiceNo:text(r, 'SalesInvoiceNo'),
        ConvertedDate:day(r, 'ConvertedDate'),
        HeldByInvoiceNo:text(r, 'HeldByInvoiceNo'),
        CancelReason:text(r, 'CancelReason'),
        CancelledDate:day(r, 'CancelledDate'),
        ForfeitAmount:num(r, 'ForfeitAmount'),
        ForfeitVoucherNo:text(r, 'ForfeitVoucherNo'),
        RefundAmount:num(r, 'RefundAmount'),
        CollectionCount:num(r, 'CollectionCount')
    };
}

function toCollection
(
    r:
        any
):
    BookingCollection
{
    return {
        BookingCollectionId:num(r, 'BookingCollectionId'),
        PublicId:text(r, 'PublicId'),
        BookingId:num(r, 'BookingId'),
        BookingNo:text(r, 'BookingNo'),
        CustomerName:text(r, 'CustomerName'),
        ModelName:text(r, 'ModelName'),
        BranchId:num(r, 'BranchId'),
        CollectionDate:day(r, 'CollectionDate'),
        Amount:num(r, 'Amount'),
        ReceiptVoucherNo:text(r, 'ReceiptVoucherNo'),
        Remarks:text(r, 'Remarks')
    };
}

function toSaved
(
    x:
        any
):
    BookingSaved
{
    return {
        PublicId:text(x, 'PublicId'),
        BookingNo:text(x, 'BookingNo'),
        ReceiptVoucherNo:text(x, 'ReceiptVoucherNo'),
        ForfeitVoucherNo:text(x, 'ForfeitVoucherNo')
    };
}
