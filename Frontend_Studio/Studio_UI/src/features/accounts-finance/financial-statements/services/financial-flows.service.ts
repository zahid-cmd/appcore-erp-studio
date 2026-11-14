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
    CashFlowRow,
    CashFlows,
    CashLedger,
    ChangesInEquity,
    EquityLedger,
    FlowActivity
}
from '../models/financial-flows.model';


//===============================================================
// Financial flows service (read only)
//
//   GET <api>/cash-flows?from=&to=&branchId=&showCancelled=
//   GET <api>/changes-in-equity?from=&to=&branchId=&showCancelled=
//
// The API answers in camelCase; mapped to PascalCase.
//===============================================================

export interface FlowQuery
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
export class FinancialFlowsService
{
    private readonly http =
        inject(HttpClient);

    private readonly api =
        `${environment.apiUrl}/accounts-finance/financial-statements`;

    private params
    (
        query:
            FlowQuery
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

    getCashFlows
    (
        query:
            FlowQuery
    ):
        Observable<CashFlows>
    {
        return this.http
            .get<any>(`${this.api}/cash-flows`, { params:this.params(query) })
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
                        CashLedgers:list(pick(x, 'CashLedgers')).map(toCashLedger),
                        Rows:list(pick(x, 'Rows')).map(toFlowRow),
                        Transfers:num(pick(x, 'Transfers')),
                        Opening:num(pick(x, 'Opening')),
                        Receipts:num(pick(x, 'Receipts')),
                        Payments:num(pick(x, 'Payments')),
                        Closing:num(pick(x, 'Closing')),
                        Difference:num(pick(x, 'Difference'))
                    })
                )
            );
    }

    getChangesInEquity
    (
        query:
            FlowQuery
    ):
        Observable<ChangesInEquity>
    {
        return this.http
            .get<any>(`${this.api}/changes-in-equity`, { params:this.params(query) })
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
                        YearStart:text(pick(x, 'YearStart')),
                        RetainedEarningsCode:text(pick(x, 'RetainedEarningsCode')),
                        RetainedEarningsName:text(pick(x, 'RetainedEarningsName')),
                        Message:text(pick(x, 'Message')),
                        Ledgers:list(pick(x, 'Ledgers')).map(toEquityLedger),
                        Opening:num(pick(x, 'Opening')),
                        Profit:num(pick(x, 'Profit')),
                        Added:num(pick(x, 'Added')),
                        Withdrawn:num(pick(x, 'Withdrawn')),
                        Closing:num(pick(x, 'Closing')),
                        BalanceSheetEquity:num(pick(x, 'BalanceSheetEquity')),
                        Difference:num(pick(x, 'Difference'))
                    })
                )
            );
    }
}


//===============================================================
// Mapping helpers
//===============================================================

function toCashLedger
(
    x:
        any
):
    CashLedger
{
    return {
        LedgerCode:text(pick(x, 'LedgerCode')),
        LedgerName:text(pick(x, 'LedgerName')),
        LedgerType:text(pick(x, 'LedgerType')),
        IsActive:!!pick(x, 'IsActive'),
        Opening:num(pick(x, 'Opening')),
        Received:num(pick(x, 'Received')),
        Paid:num(pick(x, 'Paid')),
        Closing:num(pick(x, 'Closing'))
    };
}

function toFlowRow
(
    x:
        any
):
    CashFlowRow
{
    return {
        LedgerCode:text(pick(x, 'LedgerCode')),
        LedgerName:text(pick(x, 'LedgerName')),
        LedgerType:text(pick(x, 'LedgerType')),
        ClassCode:text(pick(x, 'ClassCode')),
        ClassName:text(pick(x, 'ClassName')),
        GroupCode:text(pick(x, 'GroupCode')),
        GroupName:text(pick(x, 'GroupName')),
        SubGroupCode:text(pick(x, 'SubGroupCode')),
        SubGroupName:text(pick(x, 'SubGroupName')),
        IsActive:!!pick(x, 'IsActive'),
        Activity:(text(pick(x, 'Activity')) || 'operating') as FlowActivity,
        Received:num(pick(x, 'Received')),
        Paid:num(pick(x, 'Paid')),
        Vouchers:num(pick(x, 'Vouchers'))
    };
}

function toEquityLedger
(
    x:
        any
):
    EquityLedger
{
    return {
        LedgerCode:text(pick(x, 'LedgerCode')),
        LedgerName:text(pick(x, 'LedgerName')),
        GroupCode:text(pick(x, 'GroupCode')),
        GroupName:text(pick(x, 'GroupName')),
        SubGroupCode:text(pick(x, 'SubGroupCode')),
        SubGroupName:text(pick(x, 'SubGroupName')),
        IsActive:!!pick(x, 'IsActive'),
        IsRetainedEarnings:!!pick(x, 'IsRetainedEarnings'),
        Opening:num(pick(x, 'Opening')),
        Profit:num(pick(x, 'Profit')),
        Added:num(pick(x, 'Added')),
        Withdrawn:num(pick(x, 'Withdrawn')),
        Closing:num(pick(x, 'Closing'))
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
