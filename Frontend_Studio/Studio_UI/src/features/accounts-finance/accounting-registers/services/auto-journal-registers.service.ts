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
    AutoJournal,
    AutoJournalLine,
    AutoJournalList,
    AutoJournalNode,
    AutoJournalTree
}
from '../models/auto-journal-registers.model';


//===============================================================
// Auto Journal Registers service (read only)
//
//   GET <api>/tree?from=&to=&branchId=
//   GET <api>/journals?from=&to=&branchId=&node=
//
// The API answers in camelCase; responses are mapped to
// PascalCase.
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class AutoJournalRegistersService
{
    private readonly http =
        inject(HttpClient);

    private readonly api =
        `${environment.apiUrl}/accounts-finance/accounting-registers/auto-journal-registers`;


    //===========================================================
    // Tree : Module › Menu › Submenu with counts
    //===========================================================

    getTree
    (
        from:
            string,
        to:
            string,
        branchId:
            number
    ):
        Observable<AutoJournalTree>
    {
        return this.http
            .get<any>(
                `${this.api}/tree`,
                {
                    params:
                    {
                        from,
                        to,
                        branchId:String(branchId || 0)
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
                        Total:num(pick(x, 'Total')),
                        OtherCount:num(pick(x, 'OtherCount')),
                        Modules:list(pick(x, 'Modules')).map(toNode),
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


    //===========================================================
    // Journals of a node ("" = all, OTHER = not linked)
    //===========================================================

    getJournals
    (
        from:
            string,
        to:
            string,
        branchId:
            number,
        node:
            string
    ):
        Observable<AutoJournalList>
    {
        return this.http
            .get<any>(
                `${this.api}/journals`,
                {
                    params:
                    {
                        from,
                        to,
                        branchId:String(branchId || 0),
                        node:node ?? ''
                    }
                }
            )
            .pipe(
                map
                (
                    x =>
                    ({
                        Node:text(pick(x, 'Node')),
                        NodePath:text(pick(x, 'NodePath')),
                        From:text(pick(x, 'From')),
                        To:text(pick(x, 'To')),
                        BranchId:num(pick(x, 'BranchId')),
                        BranchName:text(pick(x, 'BranchName')),
                        Total:num(pick(x, 'Total')),
                        Shown:num(pick(x, 'Shown')),
                        Truncated:!!pick(x, 'Truncated'),
                        Journals:list(pick(x, 'Journals')).map(toJournal)
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
    AutoJournalNode
{
    return {
        Code:text(pick(x, 'Code')),
        Name:text(pick(x, 'Name')),
        Icon:text(pick(x, 'Icon')),
        Count:num(pick(x, 'Count')),
        VoucherTypes:list(pick(x, 'VoucherTypes')).map(text),
        Children:list(pick(x, 'Children')).map(toNode)
    };
}

function toLine
(
    x:
        any
):
    AutoJournalLine
{
    return {
        GroupNo:num(pick(x, 'GroupNo')),
        LineNo:num(pick(x, 'LineNo')),
        LedgerCode:text(pick(x, 'LedgerCode')),
        LedgerName:text(pick(x, 'LedgerName')),
        LedgerType:text(pick(x, 'LedgerType')),
        PartyType:text(pick(x, 'PartyType')),
        PartyCode:text(pick(x, 'PartyCode')),
        PartyName:text(pick(x, 'PartyName')),
        Narration:text(pick(x, 'Narration')),
        Debit:num(pick(x, 'Debit')),
        Credit:num(pick(x, 'Credit'))
    };
}

function toJournal
(
    x:
        any
):
    AutoJournal
{
    return {
        VoucherNo:text(pick(x, 'VoucherNo')),
        VoucherType:text(pick(x, 'VoucherType')),
        VoucherDate:text(pick(x, 'VoucherDate')),
        SourceCode:text(pick(x, 'SourceCode')),
        SourceName:text(pick(x, 'SourceName')),
        BranchId:num(pick(x, 'BranchId')),
        BranchName:text(pick(x, 'BranchName')),
        PartyType:text(pick(x, 'PartyType')),
        PartyCode:text(pick(x, 'PartyCode')),
        PartyName:text(pick(x, 'PartyName')),
        Narration:text(pick(x, 'Narration')),
        ReferenceNo:text(pick(x, 'ReferenceNo')),
        TotalDebit:num(pick(x, 'TotalDebit')),
        TotalCredit:num(pick(x, 'TotalCredit')),
        Lines:list(pick(x, 'Lines')).map(toLine),
        IsReversed:!!pick(x, 'IsReversed'),
        ReversalDate:text(pick(x, 'ReversalDate')),
        ReversalReason:text(pick(x, 'ReversalReason')),
        ReversalLines:list(pick(x, 'ReversalLines')).map(toLine)
    };
}
