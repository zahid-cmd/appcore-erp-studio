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
    PurchaseOrder,
    PurchaseOrderLine,
    PurchaseOrderDefaults,
    PurchaseOrderSaved,
    CreatePurchaseOrder,
    UpdatePurchaseOrder,
    PurchaseOrderPageType
}
from '../models/purchase-orders-mb.model';


//===============================================================
// Purchase Orders - MB Service
//
// API procurement/motor-bike-purchase/purchase-orders-mb (this
// page only; the server always uses PageType MB, the pageType
// parameter is ignored). The API answers in camelCase; every
// response is mapped to PascalCase.
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class PurchaseOrdersMbService
{
    private readonly http =
        inject(HttpClient);


    private readonly apiUrl =
        `${environment.apiUrl}/procurement/motor-bike-purchase/purchase-orders-mb`;


    //===========================================================
    // Read a value in PascalCase or camelCase
    //===========================================================

    private pick
    (
        item:
            any,
        name:
            string
    ):
        any
    {
        if
        (
            item == null
        )
        {
            return undefined;
        }

        const camel =
            name.charAt(0).toLowerCase() + name.slice(1);

        return item[name] ?? item[camel];
    }


    private text
    (
        item:
            any,
        name:
            string
    ):
        string
    {
        return String(this.pick(item, name) ?? '');
    }


    private num
    (
        item:
            any,
        name:
            string
    ):
        number
    {
        return Number(this.pick(item, name) ?? 0) || 0;
    }


    // Optional id : null when missing or 0
    private optionalId
    (
        item:
            any,
        name:
            string
    ):
        number | null
    {
        return Number(this.pick(item, name) ?? 0) || null;
    }


    //===========================================================
    // Normalize
    //===========================================================

    private normalizeLine
    (
        item:
            any
    ):
        PurchaseOrderLine
    {
        return {
            LineNo:this.num(item, 'LineNo'),
            ProductType:this.text(item, 'ProductType'),
            ProductId:this.num(item, 'ProductId'),
            ProductCode:this.text(item, 'ProductCode'),
            ProductName:this.text(item, 'ProductName'),
            Unit:this.text(item, 'Unit'),
            Quantity:this.num(item, 'Quantity'),
            UnitPrice:this.num(item, 'UnitPrice'),
            VatRate:this.num(item, 'VatRate'),
            Amount:this.num(item, 'Amount'),
            VatAmount:this.num(item, 'VatAmount'),
            LineTotal:this.num(item, 'LineTotal'),
            BilledQuantity:this.num(item, 'BilledQuantity'),
            ShortNotes:this.text(item, 'ShortNotes')
        };
    }


    normalize
    (
        item:
            any
    ):
        PurchaseOrder
    {
        return {
            PurchaseOrderId:this.num(item, 'PurchaseOrderId'),
            PageType:this.text(item, 'PageType'),
            OrderNo:this.text(item, 'OrderNo'),
            OrderDate:this.text(item, 'OrderDate').substring(0, 10),
            ExpectedDate:this.text(item, 'ExpectedDate').substring(0, 10),
            BranchId:this.num(item, 'BranchId'),
            BranchCode:this.text(item, 'BranchCode'),
            BranchName:this.text(item, 'BranchName'),
            FinancialYearId:this.num(item, 'FinancialYearId'),
            SupplierCode:this.text(item, 'SupplierCode'),
            SupplierName:this.text(item, 'SupplierName'),
            PriceIncludesVat:Boolean(this.pick(item, 'PriceIncludesVat')),
            TotalQuantity:this.num(item, 'TotalQuantity'),
            TotalAmount:this.num(item, 'TotalAmount'),
            TotalVat:this.num(item, 'TotalVat'),
            TotalPayable:this.num(item, 'TotalPayable'),
            Narration:this.text(item, 'Narration'),
            Status:this.text(item, 'Status') || 'Draft',
            CloseReason:this.text(item, 'CloseReason'),
            ApprovedDate:this.text(item, 'ApprovedDate'),
            PlacedDate:this.text(item, 'PlacedDate'),
            ClosedDate:this.text(item, 'ClosedDate'),
            CreatedDate:this.text(item, 'CreatedDate'),
            Lines:((this.pick(item, 'Lines') ?? []) as any[]).map(line => this.normalizeLine(line))
        };
    }


    private normalizeDefaults
    (
        item:
            any
    ):
        PurchaseOrderDefaults
    {
        return {
            OrderNo:this.text(item, 'OrderNo'),
            BranchId:this.num(item, 'BranchId'),
            BranchName:this.text(item, 'BranchName'),
            FinancialYearId:this.num(item, 'FinancialYearId'),
            FinancialYearName:this.text(item, 'FinancialYearName'),
            FinancialYearCode:this.text(item, 'FinancialYearCode'),
            PeriodMonth:this.num(item, 'PeriodMonth'),
            Message:this.text(item, 'Message'),
            Today:this.text(item, 'Today').substring(0, 10),
            Suppliers:
                ((this.pick(item, 'Suppliers') ?? []) as any[]).map
                (
                    row =>
                    ({
                        SupplierCode:this.text(row, 'SupplierCode'),
                        DisplayName:this.text(row, 'DisplayName'),
                        SupplyType:this.text(row, 'SupplyType'),
                        Phone:this.text(row, 'Phone'),
                        BinNo:this.text(row, 'BinNo'),
                        CreditDays:this.num(row, 'CreditDays'),
                        BrandManagementId:this.optionalId(row, 'BrandManagementId'),
                        BrandName:this.text(row, 'BrandName'),
                        IsActive:Boolean(this.pick(row, 'IsActive') ?? true)
                    })
                ),
            Products:
                ((this.pick(item, 'Products') ?? []) as any[]).map
                (
                    row =>
                    ({
                        ProductType:this.text(row, 'ProductType'),
                        ProductId:this.num(row, 'ProductId'),
                        ProductCode:this.text(row, 'ProductCode'),
                        ProductName:this.text(row, 'ProductName'),
                        Unit:this.text(row, 'Unit'),
                        CategoryId:this.num(row, 'CategoryId'),
                        CategoryName:this.text(row, 'CategoryName'),
                        SubCategoryId:this.num(row, 'SubCategoryId'),
                        SubCategoryName:this.text(row, 'SubCategoryName'),
                        BrandManagementId:this.optionalId(row, 'BrandManagementId'),
                        IsActive:Boolean(this.pick(row, 'IsActive') ?? true)
                    })
                )
        };
    }


    //===========================================================
    // Read
    //===========================================================

    getAll
    (
        pageType:
            PurchaseOrderPageType
    ):
        Observable<PurchaseOrder[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl,
                { params:{ pageType } }
            )
            .pipe(
                map(response => (response ?? []).map(item => this.normalize(item)))
            );
    }


    getById
    (
        id:
            number
    ):
        Observable<PurchaseOrder>
    {
        return this.http
            .get<any>(`${this.apiUrl}/${id}`)
            .pipe(
                map(item => this.normalize(item))
            );
    }


    getDefaults
    (
        pageType:
            PurchaseOrderPageType,
        branchId:
            number,
        date:
            string
    ):
        Observable<PurchaseOrderDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`,
                { params:{ pageType, branchId:String(branchId), date } }
            )
            .pipe(
                map(item => this.normalizeDefaults(item))
            );
    }


    //===========================================================
    // Draft
    //===========================================================

    create
    (
        model:
            CreatePurchaseOrder
    ):
        Observable<PurchaseOrderSaved>
    {
        return this.http
            .post<any>(this.apiUrl, model)
            .pipe(
                map
                (
                    item =>
                    ({
                        PurchaseOrderId:this.num(item, 'PurchaseOrderId'),
                        OrderNo:this.text(item, 'OrderNo')
                    })
                )
            );
    }


    update
    (
        model:
            UpdatePurchaseOrder
    ):
        Observable<void>
    {
        return this.http.put<void>(this.apiUrl, model);
    }


    delete
    (
        id:
            number
    ):
        Observable<void>
    {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }


    restore
    (
        pageType:
            PurchaseOrderPageType
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/restore`,
            {},
            { params:{ pageType } }
        );
    }


    //===========================================================
    // Workflow
    //===========================================================

    approve(id: number): Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${id}/approve`, {});
    }


    returnToDraft(id: number): Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${id}/return-to-draft`, {});
    }


    place(id: number): Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${id}/place`, {});
    }


    closeShort(id: number, reason: string): Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${id}/close-short`, { Reason:reason });
    }


    cancel(id: number, reason: string): Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${id}/cancel`, { Reason:reason });
    }


    //===========================================================
    // History (one page)
    //===========================================================

    getHistory
    (
        pageType:
            PurchaseOrderPageType
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`,
            { params:{ pageType } }
        );
    }
}