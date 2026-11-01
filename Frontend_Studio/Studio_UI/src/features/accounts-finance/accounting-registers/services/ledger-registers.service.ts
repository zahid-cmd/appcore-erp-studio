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
    LedgerChart,
    LedgerChartNode,
    LedgerStatement,
    LedgerStatementRow,
    LedgerSummary,
    LedgerSummaryRow,
    LedgerVoucher,
    LedgerVoucherLine
}
from '../models/ledger-registers.model';


//===============================================================
// Ledger Statements and Registers service (read only)
//
//   GET <api>/chart?type=
//   GET <api>/statement?type=&ledger=&from=&to=&branchId=&showCancelled=
//   GET <api>/summary?type=&classCode=&groupCode=&subGroupCode=&from=&to=&branchId=&showCancelled=
//   GET <api>/voucher?voucherType=&voucherNo=
//
// The API answers in camelCase; mapped to PascalCase.
//===============================================================

export interface LedgerStatementQuery
{
    apiType:string;
    ledgerCode:string;
    from:string;
    to:string;
    branchId:number;
    showCancelled:boolean;
}

export interface LedgerSummaryQuery
{
    apiType:string;
    classCode:string;
    groupCode:string;
    subGroupCode:string;
    from:string;
    to:string;
    branchId:number;
    showCancelled:boolean;
}

@Injectable(
{
    providedIn:'root'
})

export class LedgerRegistersService
{
    private readonly http =
        inject(HttpClient);

    private readonly api =
        `${environment.apiUrl}/accounts-finance/accounting-registers/ledger-registers`;


    getChart
    (
        apiType:
            string
    ):
        Observable<LedgerChart>
    {
        return this.http
            .get<any>(`${this.api}/chart`, { params:{ type:apiType } })
            .pipe(
                map
                (
                    x =>
                    ({
                        Type:text(pick(x, 'Type')),
                        Classes:list(pick(x, 'Classes')).map(toNode),
                        Groups:list(pick(x, 'Groups')).map(toNode),
                        SubGroups:list(pick(x, 'SubGroups')).map(toNode),
                        Ledgers:list(pick(x, 'Ledgers')).map
                        (
                            l =>
                            ({
                                Code:text(pick(l, 'Code')),
                                Name:text(pick(l, 'Name')),
                                ClassCode:text(pick(l, 'ClassCode')),
                                GroupCode:text(pick(l, 'GroupCode')),
                                SubGroupCode:text(pick(l, 'SubGroupCode')),
                                Mode:text(pick(l, 'Mode')),
                                IsActive:!!pick(l, 'IsActive')
                            })
                        ),
                        Branches:list(pick(x, 'Branches')).map
                        (
                            b =>
                            ({
                                Id:num(pick(b, 'Id')),
                                Code:text(pick(b, 'Code')),
                                Name:text(pick(b, 'Name'))
                            })
                        )
                    })
                )
            );
    }


    getStatement
    (
        query:
            LedgerStatementQuery
    ):
        Observable<LedgerStatement>
    {
        return this.http
            .get<any>(
                `${this.api}/statement`,
                {
                    params:
                    {
                        type:query.apiType,
                        ledger:query.ledgerCode,
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
                        Type:text(pick(x, 'Type')),
                        LedgerCode:text(pick(x, 'LedgerCode')),
                        LedgerName:text(pick(x, 'LedgerName')),
                        ClassName:text(pick(x, 'ClassName')),
                        GroupName:text(pick(x, 'GroupName')),
                        SubGroupName:text(pick(x, 'SubGroupName')),
                        Mode:text(pick(x, 'Mode')),
                        IsNominal:!!pick(x, 'IsNominal'),
                        OpeningFrom:text(pick(x, 'OpeningFrom')),
                        From:text(pick(x, 'From')),
                        To:text(pick(x, 'To')),
                        BranchId:num(pick(x, 'BranchId')),
                        BranchName:text(pick(x, 'BranchName')),
                        ShowCancelled:!!pick(x, 'ShowCancelled'),
                        Opening:num(pick(x, 'Opening')),
                        TotalDebit:num(pick(x, 'TotalDebit')),
                        TotalCredit:num(pick(x, 'TotalCredit')),
                        Closing:num(pick(x, 'Closing')),
                        Truncated:!!pick(x, 'Truncated'),
                        Rows:list(pick(x, 'Rows')).map(toStatementRow)
                    })
                )
            );
    }


    getSummary
    (
        query:
            LedgerSummaryQuery
    ):
        Observable<LedgerSummary>
    {
        return this.http
            .get<any>(
                `${this.api}/summary`,
                {
                    params:
                    {
                        type:query.apiType,
                        classCode:query.classCode,
                        groupCode:query.groupCode,
                        subGroupCode:query.subGroupCode,
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
                        Type:text(pick(x, 'Type')),
                        ClassCode:text(pick(x, 'ClassCode')),
                        GroupCode:text(pick(x, 'GroupCode')),
                        SubGroupCode:text(pick(x, 'SubGroupCode')),
                        ScopePath:text(pick(x, 'ScopePath')),
                        From:text(pick(x, 'From')),
                        To:text(pick(x, 'To')),
                        BranchId:num(pick(x, 'BranchId')),
                        BranchName:text(pick(x, 'BranchName')),
                        ShowCancelled:!!pick(x, 'ShowCancelled'),
                        Opening:num(pick(x, 'Opening')),
                        TotalDebit:num(pick(x, 'TotalDebit')),
                        TotalCredit:num(pick(x, 'TotalCredit')),
                        Closing:num(pick(x, 'Closing')),
                        Rows:list(pick(x, 'Rows')).map(toSummaryRow)
                    })
                )
            );
    }


    getVoucher
    (
        voucherType:
            string,
        voucherNo:
            string
    ):
        Observable<LedgerVoucher>
    {
        return this.http
            .get<any>(
                `${this.api}/voucher`,
                {
                    params:
                    {
                        voucherType,
                        voucherNo
                    }
                }
            )
            .pipe(
                map
                (
                    x =>
                    ({
                        VoucherType:text(pick(x, 'VoucherType')),
                        VoucherNo:text(pick(x, 'VoucherNo')),
                        VoucherDate:text(pick(x, 'VoucherDate')),
                        BranchName:text(pick(x, 'BranchName')),
                        Narration:text(pick(x, 'Narration')),
                        Lines:list(pick(x, 'Lines')).map(toVoucherLine),
                        IsReversed:!!pick(x, 'IsReversed'),
                        ReversalDate:text(pick(x, 'ReversalDate')),
                        ReversalReason:text(pick(x, 'ReversalReason')),
                        ReversalLines:list(pick(x, 'ReversalLines')).map(toVoucherLine)
                    })
                )
            );
    }
}


//===============================================================
// Mapping
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
    if
    (
        !source
    )
    {
        return undefined;
    }

    const camel =
        name.charAt(0).toLowerCase() + name.slice(1);

    return source[name] ?? source[camel];
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
    return Array.isArray(value)
        ? value
        : [];
}

function toNode
(
    x:
        any
):
    LedgerChartNode
{
    return {
        Code:text(pick(x, 'Code')),
        Name:text(pick(x, 'Name')),
        ParentCode:text(pick(x, 'ParentCode')),
        ClassCode:text(pick(x, 'ClassCode'))
    };
}

function toStatementRow
(
    x:
        any
):
    LedgerStatementRow
{
    return {
        VoucherType:text(pick(x, 'VoucherType')),
        VoucherNo:text(pick(x, 'VoucherNo')),
        VoucherDate:text(pick(x, 'VoucherDate')),
        BranchName:text(pick(x, 'BranchName')),
        IsReversal:!!pick(x, 'IsReversal'),
        IsCancelled:!!pick(x, 'IsCancelled'),
        Particulars:text(pick(x, 'Particulars')),
        ContraCodes:text(pick(x, 'ContraCodes')),
        PartyName:text(pick(x, 'PartyName')),
        Reference:text(pick(x, 'Reference')),
        Status:text(pick(x, 'Status')),
        Narration:text(pick(x, 'Narration')),
        ShortNote:text(pick(x, 'ShortNote')),
        Debit:num(pick(x, 'Debit')),
        Credit:num(pick(x, 'Credit')),
        Balance:num(pick(x, 'Balance'))
    };
}

function toSummaryRow
(
    x:
        any
):
    LedgerSummaryRow
{
    return {
        LedgerCode:text(pick(x, 'LedgerCode')),
        LedgerName:text(pick(x, 'LedgerName')),
        GroupName:text(pick(x, 'GroupName')),
        SubGroupName:text(pick(x, 'SubGroupName')),
        Mode:text(pick(x, 'Mode')),
        IsActive:!!pick(x, 'IsActive'),
        Opening:num(pick(x, 'Opening')),
        Debit:num(pick(x, 'Debit')),
        Credit:num(pick(x, 'Credit')),
        Closing:num(pick(x, 'Closing'))
    };
}

function toVoucherLine
(
    x:
        any
):
    LedgerVoucherLine
{
    return {
        LedgerCode:text(pick(x, 'LedgerCode')),
        LedgerName:text(pick(x, 'LedgerName')),
        PartyName:text(pick(x, 'PartyName')),
        Narration:text(pick(x, 'Narration')),
        Debit:num(pick(x, 'Debit')),
        Credit:num(pick(x, 'Credit'))
    };
}
