//===============================================================
// Imports
//===============================================================

import
{
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
    PurchaseOrderLastTerms,
    PurchaseOrderVatApplicability
}
from '../purchase-order/purchase-order.model';

import
{
    Purchase,
    PurchaseLine,
    PurchaseUnit,
    PurchaseDefaults,
    PurchaseSaved,
    PurchaseOpenOrder,
    CreatePurchase,
    UpdatePurchase,
    PurchasePageType
}
from './purchase.model';


//===============================================================
// Purchases Service (shared by MB / SP / AC)
//
// Each page has its own small service (PurchasesMbService
// / …Sp / …Ac) that only gives its API path. The server always
// uses the page's own type (the pageType parameter is ignored).
// The API answers in camelCase; every response is mapped to
// PascalCase.
//===============================================================

export abstract class PurchaseService
{
    private readonly http =
        inject(HttpClient);


    // procurement/<menu>/purchases-<type>
    protected abstract readonly apiPath:
        string;


    private get apiUrl():
        string
    {
        return `${environment.apiUrl}/${this.apiPath}`;
    }


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
    // Saved image path (/uploads/...) -> full URL, served from
    // the API root (apiUrl without /api), as the product pages do
    private imageUrl
    (
        path:
            string
    ):
        string
    {
        const value =
            (path ?? '').trim();

        if
        (
            !value
            ||
            /^(https?:|blob:|data:)/i.test(value)
        )
        {
            return value;
        }

        const root =
            environment.apiUrl
                .replace(/\/+$/, '')
                .replace(/\/api$/i, '');

        return `${root}/${value.replace(/^\/+/, '')}`;
    }

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

    private normalizeUnit
    (
        item:
            any
    ):
        PurchaseUnit
    {
        return {
            MotorBikeUnitId:this.num(item, 'MotorBikeUnitId'),
            ChassisNo:this.text(item, 'ChassisNo'),
            EngineNo:this.text(item, 'EngineNo'),
            KeyNo:this.text(item, 'KeyNo'),
            BatteryNo:this.text(item, 'BatteryNo'),
            Status:this.text(item, 'Status')
        };
    }


    private normalizeLine
    (
        item:
            any
    ):
        PurchaseLine
    {
        return {
            PurchaseLineId:this.num(item, 'PurchaseLineId'),
            PurchaseOrderLineId:this.optionalId(item, 'PurchaseOrderLineId'),
            ReturnedQuantity:this.num(item, 'ReturnedQuantity'),
            Units:((this.pick(item, 'Units') ?? []) as any[]).map(unit => this.normalizeUnit(unit)),
            LineNo:this.num(item, 'LineNo'),
            ProductType:this.text(item, 'ProductType'),
            ProductId:this.num(item, 'ProductId'),
            ProductCode:this.text(item, 'ProductCode'),
            ProductName:this.text(item, 'ProductName'),
            Unit:this.text(item, 'Unit'),
            Quantity:this.num(item, 'Quantity'),
            FreeQuantity:this.num(item, 'FreeQuantity'),
            Mrp:this.num(item, 'Mrp'),
            ProfitPercent:this.num(item, 'ProfitPercent'),
            UnitPrice:this.num(item, 'UnitPrice'),
            IsAdjusted:Boolean(this.pick(item, 'IsAdjusted')),
            IsTotalTyped:Boolean(this.pick(item, 'IsTotalTyped')),
            GrossMrp:this.num(item, 'GrossMrp'),
            DpAmount:this.num(item, 'DpAmount'),
            ProfitAmount:this.num(item, 'ProfitAmount'),
            DiscountShare:this.num(item, 'DiscountShare'),
            NetAmount:this.num(item, 'NetAmount'),
            VatRate:this.num(item, 'VatRate'),
            VatClaimable:Boolean(this.pick(item, 'VatClaimable') ?? true),
            Amount:this.num(item, 'Amount'),
            VatAmount:this.num(item, 'VatAmount'),
            LineTotal:this.num(item, 'LineTotal'),
            RoundingShare:this.num(item, 'RoundingShare'),
            NetUnitCost:this.num(item, 'NetUnitCost'),
            BilledQuantity:0,
            ShortNotes:this.text(item, 'ShortNotes')
        };
    }


    normalize
    (
        item:
            any
    ):
        Purchase
    {
        return {
            PurchaseId:this.num(item, 'PurchaseId'),
            PublicId:this.text(item, 'PublicId'),
            PageType:this.text(item, 'PageType'),
            PurchaseNo:this.text(item, 'PurchaseNo'),
            PurchaseDate:this.text(item, 'PurchaseDate').substring(0, 10),
            BranchId:this.num(item, 'BranchId'),
            BranchCode:this.text(item, 'BranchCode'),
            BranchName:this.text(item, 'BranchName'),
            FinancialYearId:this.num(item, 'FinancialYearId'),
            SupplierCode:this.text(item, 'SupplierCode'),
            SupplierName:this.text(item, 'SupplierName'),
            PurchaseOrderId:this.optionalId(item, 'PurchaseOrderId'),
            OrderNo:this.text(item, 'OrderNo'),
            SupplierInvoiceNo:this.text(item, 'SupplierInvoiceNo'),
            SupplierInvoiceDate:this.text(item, 'SupplierInvoiceDate').substring(0, 10),
            MushakNo:this.text(item, 'MushakNo'),
            MushakDate:this.text(item, 'MushakDate').substring(0, 10),
            DoReference:this.text(item, 'DoReference'),
            GatePassNo:this.text(item, 'GatePassNo'),
            WarehouseId:this.optionalId(item, 'WarehouseId'),
            WarehouseName:this.text(item, 'WarehouseName'),
            PriceIncludesVat:Boolean(this.pick(item, 'PriceIncludesVat')),
            InvoicePriceBasis:this.text(item, 'InvoicePriceBasis') || 'DP',
            ProfitBasis:this.text(item, 'ProfitBasis') || 'MRP',
            DefaultProfitPercent:this.num(item, 'DefaultProfitPercent'),
            AdditionalDiscountType:this.text(item, 'AdditionalDiscountType') || 'None',
            AdditionalDiscountValue:this.num(item, 'AdditionalDiscountValue'),
            AdditionalDiscountAmount:this.num(item, 'AdditionalDiscountAmount'),
            RoundingMethod:this.text(item, 'RoundingMethod') || 'None',
            WholeTakaLines:Boolean(this.pick(item, 'WholeTakaLines')),
            RoundingAdjustment:this.num(item, 'RoundingAdjustment'),
            PurchaseVatApplicable:Boolean(this.pick(item, 'PurchaseVatApplicable') ?? true),
            SalesVatApplicable:Boolean(this.pick(item, 'SalesVatApplicable') ?? true),
            NoVatInvoice:Boolean(this.pick(item, 'NoVatInvoice')),
            VatCharged:Boolean(this.pick(item, 'VatCharged') ?? true),
            TotalQuantity:this.num(item, 'TotalQuantity'),
            TotalFreeQuantity:this.num(item, 'TotalFreeQuantity'),
            TotalMrp:this.num(item, 'TotalMrp'),
            TotalProfit:this.num(item, 'TotalProfit'),
            TotalDp:this.num(item, 'TotalDp'),
            TotalAmount:this.num(item, 'TotalAmount'),
            TotalVat:this.num(item, 'TotalVat'),
            TotalVatClaimable:this.num(item, 'TotalVatClaimable'),
            TotalPayable:this.num(item, 'TotalPayable'),
            Narration:this.text(item, 'Narration'),
            Status:this.text(item, 'Status') || 'Draft',
            StockedIn:Boolean(this.pick(item, 'StockedIn')),
            VoucherNo:this.text(item, 'VoucherNo'),
            CancelReason:this.text(item, 'CancelReason'),
            ApprovedDate:this.text(item, 'ApprovedDate'),
            PostedDate:this.text(item, 'PostedDate'),
            CancelledDate:this.text(item, 'CancelledDate'),
            CreatedDate:this.text(item, 'CreatedDate'),
            Lines:((this.pick(item, 'Lines') ?? []) as any[]).map(line => this.normalizeLine(line))
        };
    }


    private normalizeDefaults
    (
        item:
            any
    ):
        PurchaseDefaults
    {
        return {
            PurchaseNo:this.text(item, 'PurchaseNo'),
            Warehouses:
                ((this.pick(item, 'Warehouses') ?? []) as any[]).map
                (
                    row =>
                    ({
                        WarehouseId:this.num(row, 'WarehouseId'),
                        WarehouseCode:this.text(row, 'WarehouseCode'),
                        WarehouseName:this.text(row, 'WarehouseName'),
                        IsDefault:Boolean(this.pick(row, 'IsDefault'))
                    })
                ),
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
                        LastNoVatInvoice:Boolean(this.pick(row, 'LastNoVatInvoice')),
                        LastMarginPercent:
                            this.pick(row, 'LastMarginPercent') === null || this.pick(row, 'LastMarginPercent') === undefined
                                ? null
                                : Number(this.pick(row, 'LastMarginPercent')),
                        LastMarginNo:this.text(row, 'LastMarginNo'),
                        DefaultPriceEntry:this.text(row, 'DefaultPriceEntry'),
                        DefaultInvoicePrice:this.text(row, 'DefaultInvoicePrice'),
                        DefaultProfitPercent:
                            this.pick(row, 'DefaultProfitPercent') === null || this.pick(row, 'DefaultProfitPercent') === undefined
                                ? null
                                : Number(this.pick(row, 'DefaultProfitPercent')),
                        DefaultProfitOn:this.text(row, 'DefaultProfitOn'),
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
                        ImageUrl:this.imageUrl(this.text(row, 'ImagePath')),
                        ReorderLevel:this.num(row, 'ReorderLevel'),
                        RedLevel:this.num(row, 'RedLevel'),
                        MaxStockLevel:this.num(row, 'MaxStockLevel'),
                        OnOrder:this.num(row, 'OnOrder'),
                        TotalStock:
                            this.pick(row, 'TotalStock') === null || this.pick(row, 'TotalStock') === undefined
                                ? null
                                : this.num(row, 'TotalStock'),
                        StockByBranch:
                            ((this.pick(row, 'StockByBranch') ?? []) as any[]).map
                            (
                                b =>
                                ({
                                    BranchId:this.num(b, 'BranchId'),
                                    BranchName:this.text(b, 'BranchName'),
                                    InTransit:this.num(b, 'InTransit'),
                                    OnHand:this.num(b, 'OnHand')
                                })
                            ),
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
            PurchasePageType
    ):
        Observable<Purchase[]>
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


    // One page of the list plus the tab counts (server paging)
    getPaged
    (
        query:
            PagedQuery & { tab?:string; supplier?:string }
    ):
        Observable<PagedResult<Purchase>>
    {
        return this.http
            .get<any>(`${this.apiUrl}/paged`, { params:toPagedParams({ ...query }) })
            .pipe(
                map(raw => toPagedResult(raw, item => this.normalize(item)))
            );
    }


    // The suppliers on this page's documents (list filter)
    getListSuppliers():
        Observable<{ code:string; name:string }[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/list-suppliers`)
            .pipe(
                map
                (
                    rows =>
                        (rows ?? []).map
                        (
                            row =>
                            ({
                                code:this.text(row, 'SupplierCode'),
                                name:this.text(row, 'SupplierName')
                            })
                        )
                )
            );
    }


    getById
    (
        id:
            string
    ):
        Observable<Purchase>
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
            PurchasePageType,
        branchId:
            number,
        date:
            string
    ):
        Observable<PurchaseDefaults>
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


    // VAT applicability of the product line on a date (VAT
    // Management switches; MB / missing switch = applicable)
    getVatApplicability
    (
        productLine:
            string,
        date:
            string
    ):
        Observable<PurchaseOrderVatApplicability>
    {
        return this.http
            .get<any>(
                `${environment.apiUrl}/platform/vat-applicability`,
                { params:{ productLine, date } }
            )
            .pipe(
                map
                (
                    item =>
                    ({
                        PurchaseVatApplicable:Boolean(this.pick(item, 'PurchaseVatApplicable') ?? true),
                        SalesVatApplicable:Boolean(this.pick(item, 'SalesVatApplicable') ?? true),
                        PurchaseSince:this.text(item, 'PurchaseSince'),
                        SalesSince:this.text(item, 'SalesSince')
                    })
                )
            );
    }


    // Last MRP (any supplier) and this supplier's last DP / margin
    // per item (from earlier purchases)
    getLastTerms
    (
        supplierCode:
            string
    ):
        Observable<PurchaseOrderLastTerms[]>
    {
        return this.http
            .get<any[]>(
                `${this.apiUrl}/last-terms`,
                { params:{ supplierCode } }
            )
            .pipe(
                map
                (
                    response =>
                        (Array.isArray(response) ? response : []).map
                        (
                            row =>
                            ({
                                ProductCode:this.text(row, 'ProductCode'),
                                LastMrp:this.num(row, 'LastMrp'),
                                LastMrpOrderNo:this.text(row, 'LastMrpOrderNo'),
                                HasProfit:Boolean(this.pick(row, 'HasProfit')),
                                ProfitPercent:this.num(row, 'ProfitPercent'),
                                ProfitBasis:this.text(row, 'ProfitBasis'),
                                ProfitOrderNo:this.text(row, 'ProfitOrderNo'),
                                ProfitDate:this.text(row, 'ProfitDate').substring(0, 10),
                                LastDp:this.num(row, 'LastDp'),
                                LastDpIncludesVat:Boolean(this.pick(row, 'LastDpIncludesVat') ?? true),
                                LastVatRate:this.num(row, 'LastVatRate'),
                                LastDpOrderNo:this.text(row, 'LastDpOrderNo')
                            })
                        )
                )
            );
    }


    //===========================================================
    // Open Purchase Orders of a supplier (PO Required ON)
    //   keepOrderId : the order a draft already uses
    //===========================================================

    // Mushak 6.3 No : once per supplier in the financial year of
    // the purchase date ('' message = free)
    // Unit Desk : bike numbers already on another purchase
    checkUnits
    (
        purchaseId:
            number | null,
        units:
            { ChassisNo:string; EngineNo:string; KeyNo:string; BatteryNo:string }[]
    ):
        Observable<{ Field:string; Value:string; PurchaseNo:string; Message:string }[]>
    {
        return this.http
            .post<any[]>(
                `${this.apiUrl}/unit-check`,
                {
                    PurchaseId:purchaseId,
                    Units:units
                }
            )
            .pipe(
                map
                (
                    response =>
                        (response ?? []).map
                        (
                            x =>
                            ({
                                Field:String(x?.Field ?? x?.field ?? ''),
                                Value:String(x?.Value ?? x?.value ?? '').toUpperCase(),
                                PurchaseNo:String(x?.PurchaseNo ?? x?.purchaseNo ?? ''),
                                Message:String(x?.Message ?? x?.message ?? '')
                            })
                        )
                )
            );
    }

    checkMushak
    (
        supplierCode:
            string,
        mushakNo:
            string,
        branchId:
            number,
        purchaseDate:
            string,
        purchaseId:
            number | null
    ):
        Observable<{ Taken:boolean; PurchaseNo:string; Message:string }>
    {
        const params:
            Record<string, string> =
            {
                supplierCode,
                mushakNo,
                branchId:String(branchId),
                date:purchaseDate
            };

        if
        (
            purchaseId
        )
        {
            params['purchaseId'] =
                String(purchaseId);
        }

        return this.http
            .get<any>(
                `${this.apiUrl}/mushak-check`,
                { params }
            )
            .pipe(
                map
                (
                    response =>
                    ({
                        Taken:!!(response?.Taken ?? response?.taken),
                        PurchaseNo:String(response?.PurchaseNo ?? response?.purchaseNo ?? ''),
                        Message:String(response?.Message ?? response?.message ?? '')
                    })
                )
            );
    }

    getOpenOrders
    (
        supplierCode:
            string,
        keepOrderId:
            number | null
    ):
        Observable<PurchaseOpenOrder[]>
    {
        const params:
            Record<string, string> =
            { supplierCode };

        if
        (
            keepOrderId
        )
        {
            params['keepOrderId'] =
                String(keepOrderId);
        }

        return this.http
            .get<any[]>(
                `${this.apiUrl}/open-orders`,
                { params }
            )
            .pipe(
                map
                (
                    response =>
                        (Array.isArray(response) ? response : []).map
                        (
                            row =>
                            ({
                                PurchaseOrderId:this.num(row, 'PurchaseOrderId'),
                                OrderNo:this.text(row, 'OrderNo'),
                                OrderDate:this.text(row, 'OrderDate').substring(0, 10),
                                Status:this.text(row, 'Status'),
                                BranchId:this.num(row, 'BranchId'),
                                BranchName:this.text(row, 'BranchName'),
                                PriceIncludesVat:Boolean(this.pick(row, 'PriceIncludesVat')),
                                InvoicePriceBasis:this.text(row, 'InvoicePriceBasis') || 'DP',
                                DefaultProfitPercent:this.num(row, 'DefaultProfitPercent'),
                                AdditionalDiscountType:this.text(row, 'AdditionalDiscountType') || 'None',
                                AdditionalDiscountValue:this.num(row, 'AdditionalDiscountValue'),
                                NoVatInvoice:Boolean(this.pick(row, 'NoVatInvoice')),
                                TotalPayable:this.num(row, 'TotalPayable'),
                                Lines:
                                    ((this.pick(row, 'Lines') ?? []) as any[]).map
                                    (
                                        line =>
                                        ({
                                            PurchaseOrderLineId:this.num(line, 'PurchaseOrderLineId'),
                                            LineNo:this.num(line, 'LineNo'),
                                            ProductType:this.text(line, 'ProductType'),
                                            ProductId:this.num(line, 'ProductId'),
                                            ProductCode:this.text(line, 'ProductCode'),
                                            ProductName:this.text(line, 'ProductName'),
                                            Unit:this.text(line, 'Unit'),
                                            Quantity:this.num(line, 'Quantity'),
                                            FreeQuantity:this.num(line, 'FreeQuantity'),
                                            BilledQuantity:this.num(line, 'BilledQuantity'),
                                            Remaining:this.num(line, 'Remaining'),
                                            Mrp:this.num(line, 'Mrp'),
                                            ProfitPercent:this.num(line, 'ProfitPercent'),
                                            UnitPrice:this.num(line, 'UnitPrice'),
                                            VatRate:this.num(line, 'VatRate')
                                        })
                                    )
                            })
                        )
                )
            );
    }


    //===========================================================
    // Draft
    //===========================================================

    create
    (
        model:
            CreatePurchase
    ):
        Observable<PurchaseSaved>
    {
        return this.http
            .post<any>(this.apiUrl, model)
            .pipe(
                map
                (
                    item =>
                    ({
                        PurchaseId:this.num(item, 'PurchaseId'),
                        PublicId:this.text(item, 'PublicId'),
                        PurchaseNo:this.text(item, 'PurchaseNo')
                    })
                )
            );
    }


    update
    (
        model:
            UpdatePurchase
    ):
        Observable<void>
    {
        return this.http.put<void>(this.apiUrl, model);
    }


    delete
    (
        id:
            string
    ):
        Observable<void>
    {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }


    restore
    (
        pageType:
            PurchasePageType
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


    post(id: number): Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${id}/post`, {});
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
            PurchasePageType
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`,
            { params:{ pageType } }
        );
    }
}
