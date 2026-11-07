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
    TrialBalance,
    TrialBalanceBranch,
    TrialBalanceRow
}
from '../models/trial-balance.model';


//===============================================================
// Trial Balance service (read only)
//
//   GET <api>/branches                 allotted branches
//   GET <api>?from=&to=&branchId=&showCancelled=
//
// The API answers in camelCase; mapped to PascalCase.
//===============================================================

export interface TrialBalanceQuery
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
export class TrialBalanceService
{
    private readonly http =
        inject(HttpClient);

    private readonly api =
        `${environment.apiUrl}/accounts-finance/financial-statements/trial-balance`;

    getBranches():
        Observable<TrialBalanceBranch[]>
    {
        return this.http
            .get<any>(`${this.api}/branches`)
            .pipe(
                map
                (
                    x =>
                        list(x).map
                        (
                            b =>
                            ({
                                Id:num(pick(b, 'Id')),
                                Code:text(pick(b, 'Code')),
                                Name:text(pick(b, 'Name'))
                            })
                        )
                )
            );
    }

    getTrialBalance
    (
        query:
            TrialBalanceQuery
    ):
        Observable<TrialBalance>
    {
        return this.http
            .get<any>(
                this.api,
                {
                    params:
                    {
                        from:query.from,
                        to:query.to,
                        branchId:String(query.branchId || 0),
                        showCancelled:String(!!query.showCancelled)
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
                        YearStart:text(pick(x, 'YearStart')),
                        RetainedEarningsCode:text(pick(x, 'RetainedEarningsCode')),
                        RetainedEarningsName:text(pick(x, 'RetainedEarningsName')),
                        PriorYearsResult:num(pick(x, 'PriorYearsResult')),
                        Message:text(pick(x, 'Message')),
                        OpeningDebit:num(pick(x, 'OpeningDebit')),
                        OpeningCredit:num(pick(x, 'OpeningCredit')),
                        PeriodDebit:num(pick(x, 'PeriodDebit')),
                        PeriodCredit:num(pick(x, 'PeriodCredit')),
                        ClosingDebit:num(pick(x, 'ClosingDebit')),
                        ClosingCredit:num(pick(x, 'ClosingCredit')),
                        Difference:num(pick(x, 'Difference')),
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
    TrialBalanceRow
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
        Mode:text(pick(x, 'Mode')) || 'Dr',
        IsNominal:!!pick(x, 'IsNominal'),
        IsActive:!!pick(x, 'IsActive'),
        IsRetainedEarnings:!!pick(x, 'IsRetainedEarnings'),
        HasEntries:!!pick(x, 'HasEntries'),
        Opening:num(pick(x, 'Opening')),
        Debit:num(pick(x, 'Debit')),
        Credit:num(pick(x, 'Credit')),
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
