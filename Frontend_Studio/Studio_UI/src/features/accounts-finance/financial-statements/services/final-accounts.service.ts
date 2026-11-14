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
    BalanceSheet,
    BalanceSheetTotals,
    FaCompare,
    FaRow,
    FaYear,
    ProfitLoss,
    ProfitLossTotals
}
from '../models/final-accounts.model';


//===============================================================
// Final Accounts service (read only)
//
//   GET <api>/year?date=
//   GET <api>/profit-loss?from=&to=&branchId=&showCancelled=&compare=
//   GET <api>/balance-sheet?asOn=&branchId=&showCancelled=&compare=
//
// Branches : TrialBalanceService.getBranches() (same list).
// The API answers in camelCase; mapped to PascalCase.
//===============================================================

export interface ProfitLossQuery
{
    from:string;
    to:string;
    branchId:number;
    showCancelled:boolean;
    compare:FaCompare;
}

export interface BalanceSheetQuery
{
    asOn:string;
    branchId:number;
    showCancelled:boolean;
    compare:FaCompare;
}

@Injectable(
{
    providedIn:'root'
})
export class FinalAccountsService
{
    private readonly http =
        inject(HttpClient);

    private readonly api =
        `${environment.apiUrl}/accounts-finance/financial-statements`;

    getYear
    (
        date:
            string
    ):
        Observable<FaYear>
    {
        return this.http
            .get<any>(
                `${this.api}/year`,
                {
                    params:{ date }
                }
            )
            .pipe(
                map
                (
                    x =>
                    ({
                        Date:text(pick(x, 'Date')),
                        YearStart:text(pick(x, 'YearStart')),
                        YearEnd:text(pick(x, 'YearEnd'))
                    })
                )
            );
    }

    getProfitLoss
    (
        query:
            ProfitLossQuery
    ):
        Observable<ProfitLoss>
    {
        return this.http
            .get<any>(
                `${this.api}/profit-loss`,
                {
                    params:
                    {
                        from:query.from,
                        to:query.to,
                        branchId:String(query.branchId || 0),
                        showCancelled:String(!!query.showCancelled),
                        compare:query.compare || 'none'
                    }
                }
            )
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
                        Compare:(text(pick(x, 'Compare')) || 'none') as FaCompare,
                        CompareFrom:text(pick(x, 'CompareFrom')),
                        CompareTo:text(pick(x, 'CompareTo')),
                        CompareLabel:text(pick(x, 'CompareLabel')),
                        YearStart:text(pick(x, 'YearStart')),
                        Message:text(pick(x, 'Message')),
                        Totals:toPlTotals(pick(x, 'Totals')),
                        CompareTotals:toPlTotals(pick(x, 'CompareTotals')),
                        Rows:list(pick(x, 'Rows')).map(toRow)
                    })
                )
            );
    }

    getBalanceSheet
    (
        query:
            BalanceSheetQuery
    ):
        Observable<BalanceSheet>
    {
        return this.http
            .get<any>(
                `${this.api}/balance-sheet`,
                {
                    params:
                    {
                        asOn:query.asOn,
                        branchId:String(query.branchId || 0),
                        showCancelled:String(!!query.showCancelled),
                        compare:query.compare || 'none'
                    }
                }
            )
            .pipe(
                map
                (
                    x =>
                    ({
                        AsOn:text(pick(x, 'AsOn')),
                        BranchId:num(pick(x, 'BranchId')),
                        BranchName:text(pick(x, 'BranchName')),
                        ShowCancelled:!!pick(x, 'ShowCancelled'),
                        Compare:(text(pick(x, 'Compare')) || 'none') as FaCompare,
                        CompareAsOn:text(pick(x, 'CompareAsOn')),
                        CompareLabel:text(pick(x, 'CompareLabel')),
                        YearStart:text(pick(x, 'YearStart')),
                        RetainedEarningsCode:text(pick(x, 'RetainedEarningsCode')),
                        RetainedEarningsName:text(pick(x, 'RetainedEarningsName')),
                        PriorYearsResult:num(pick(x, 'PriorYearsResult')),
                        Message:text(pick(x, 'Message')),
                        Totals:toBsTotals(pick(x, 'Totals')),
                        CompareTotals:toBsTotals(pick(x, 'CompareTotals')),
                        Rows:list(pick(x, 'Rows')).map(toRow)
                    })
                )
            );
    }
}


//===============================================================
// Mapping helpers
//===============================================================

function toRow
(
    x:
        any
):
    FaRow
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
        IsRetainedEarnings:!!pick(x, 'IsRetainedEarnings'),
        Section:text(pick(x, 'Section')) as FaRow['Section'],
        Line:text(pick(x, 'Line')) as FaRow['Line'],
        Amount:num(pick(x, 'Amount')),
        CompareAmount:num(pick(x, 'CompareAmount'))
    };
}

function toPlTotals
(
    x:
        any
):
    ProfitLossTotals
{
    return {
        Sales:num(pick(x, 'Sales')),
        Cogs:num(pick(x, 'Cogs')),
        GrossProfit:num(pick(x, 'GrossProfit')),
        OtherIncome:num(pick(x, 'OtherIncome')),
        Expenses:num(pick(x, 'Expenses')),
        NetProfit:num(pick(x, 'NetProfit'))
    };
}

function toBsTotals
(
    x:
        any
):
    BalanceSheetTotals
{
    return {
        Assets:num(pick(x, 'Assets')),
        Liabilities:num(pick(x, 'Liabilities')),
        Equity:num(pick(x, 'Equity')),
        ProfitToDate:num(pick(x, 'ProfitToDate')),
        LiabilitiesAndEquity:num(pick(x, 'LiabilitiesAndEquity')),
        Difference:num(pick(x, 'Difference'))
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
