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
    DailyCollection,
    DcLine,
    DcRow,
    InvoiceProfit,
    IpDetail,
    IpLine,
    IpRow
}
from '../models/daily-statements.model';


//===============================================================
// Daily statements service (read only)
//
//   GET <api>/daily-collection?from=&to=&branchId=&showCancelled=
//   GET <api>/invoice-profit?from=&to=&branchId=&showCancelled=
//
// The API answers in camelCase; mapped to PascalCase.
//===============================================================

export interface DailyQuery
{
    from:string;
    to:string;
    branchId:number;
    showCancelled:boolean;
}

@Injectable(
{
    providedIn:'root'
})
export class DailyStatementsService
{
    private readonly http =
        inject(HttpClient);

    private readonly api =
        `${environment.apiUrl}/accounts-finance/financial-statements`;

    private params
    (
        query:
            DailyQuery
    ):
        Record<string, string>
    {
        return {
            from:query.from,
            to:query.to,
            branchId:String(query.branchId || 0),
            showCancelled:String(!!query.showCancelled)
        };
    }

    getDailyCollection
    (
        query:
            DailyQuery
    ):
        Observable<DailyCollection>
    {
        return this.http
            .get<any>(`${this.api}/daily-collection`, { params:this.params(query) })
            .pipe(
                map
                (
                    x =>
                    ({
                        From:text(pick(x, 'From')),
                        To:text(pick(x, 'To')),
                        BranchId:num(pick(x, 'BranchId')),
                        BranchName:text(pick(x, 'BranchName')),
                        ShowCancelled:!!pick(x, 'ShowCancelled'),
                        Message:text(pick(x, 'Message')),
                        Users:list(pick(x, 'Users')).map(u => ({ Id:num(pick(u, 'Id')), Name:text(pick(u, 'Name')) })),
                        Rows:list(pick(x, 'Rows')).map(toDcRow)
                    })
                )
            );
    }

    getInvoiceProfit
    (
        query:
            DailyQuery
    ):
        Observable<InvoiceProfit>
    {
        return this.http
            .get<any>(`${this.api}/invoice-profit`, { params:this.params(query) })
            .pipe(
                map
                (
                    x =>
                    ({
                        From:text(pick(x, 'From')),
                        To:text(pick(x, 'To')),
                        BranchId:num(pick(x, 'BranchId')),
                        BranchName:text(pick(x, 'BranchName')),
                        ShowCancelled:!!pick(x, 'ShowCancelled'),
                        Message:text(pick(x, 'Message')),
                        Checks:list(pick(x, 'Checks')).map
                        (
                            c =>
                            ({
                                Line:text(pick(c, 'Line')) as IpLine,
                                Sales:num(pick(c, 'Sales')),
                                Cost:num(pick(c, 'Cost'))
                            })
                        ),
                        Rows:list(pick(x, 'Rows')).map(toIpRow)
                    })
                )
            );
    }
}


//===============================================================
// Mapping helpers
//===============================================================

function toDcRow
(
    x:
        any
):
    DcRow
{
    return {
        Date:text(pick(x, 'Date')),
        Time:text(pick(x, 'Time')),
        VoucherNo:text(pick(x, 'VoucherNo')),
        VoucherType:text(pick(x, 'VoucherType')),
        DocumentNo:text(pick(x, 'DocumentNo')),
        DocumentType:text(pick(x, 'DocumentType')),
        Line:(text(pick(x, 'Line')) || 'other') as DcLine,
        Customer:text(pick(x, 'Customer')),
        Narration:text(pick(x, 'Narration')),
        Accounts:text(pick(x, 'Accounts')),
        Cash:num(pick(x, 'Cash')),
        Bank:num(pick(x, 'Bank')),
        Mfs:num(pick(x, 'Mfs')),
        Pos:num(pick(x, 'Pos')),
        Emi:num(pick(x, 'Emi')),
        Total:num(pick(x, 'Total')),
        IsRefund:!!pick(x, 'IsRefund'),
        CollectedById:num(pick(x, 'CollectedById')),
        CollectedBy:text(pick(x, 'CollectedBy'))
    };
}

function toIpRow
(
    x:
        any
):
    IpRow
{
    return {
        Line:text(pick(x, 'Line')) as IpLine,
        Kind:text(pick(x, 'Kind')) === 'return' ? 'return' : 'invoice',
        Date:text(pick(x, 'Date')),
        DocumentNo:text(pick(x, 'DocumentNo')),
        InvoiceNo:text(pick(x, 'InvoiceNo')),
        Customer:text(pick(x, 'Customer')),
        SalesPerson:text(pick(x, 'SalesPerson')),
        Quantity:num(pick(x, 'Quantity')),
        Chassis:text(pick(x, 'Chassis')),
        Sales:num(pick(x, 'Sales')),
        Discount:num(pick(x, 'Discount')),
        Other:num(pick(x, 'Other')),
        NetSales:num(pick(x, 'NetSales')),
        Cost:num(pick(x, 'Cost')),
        Profit:num(pick(x, 'Profit')),
        LinkedVouchers:num(pick(x, 'LinkedVouchers')),
        Lines:list(pick(x, 'Lines')).map(toIpDetail)
    };
}

function toIpDetail
(
    x:
        any
):
    IpDetail
{
    return {
        LineNo:num(pick(x, 'LineNo')),
        ProductCode:text(pick(x, 'ProductCode')),
        ProductName:text(pick(x, 'ProductName')),
        ChassisNo:text(pick(x, 'ChassisNo')),
        Detail:text(pick(x, 'Detail')),
        Quantity:num(pick(x, 'Quantity')),
        UnitPrice:num(pick(x, 'UnitPrice')),
        Gross:num(pick(x, 'Gross')),
        Discount:num(pick(x, 'Discount')),
        Net:num(pick(x, 'Net')),
        UnitCost:num(pick(x, 'UnitCost')),
        Cost:num(pick(x, 'Cost')),
        Profit:num(pick(x, 'Profit'))
    };
}

// Reads Name or name
function pick
(
    source:
        any,
    name:
        string
):
    any
{
    if (!source || typeof source !== 'object')
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
    const n =
        Number(value);

    return Number.isFinite(n) ? n : 0;
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
