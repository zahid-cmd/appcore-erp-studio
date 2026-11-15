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
    AvailableCheckLeaves,
    CheckBook,
    CheckBookDefaults,
    CheckBookListItem,
    CheckLeafStatus
}
from '../models/check-books.model';

import
{
    CheckPrintLayout,
    parseCheckLayout
}
from '../models/check-print.model';

// The cheque print layout of a bank account
export interface CheckPrintLayoutRow
{
    BankAccountId: number;
    BankAccountName: string;
    Bank: string;
    AccountNumber: string;
    // The saved layout over the defaults
    Layout: CheckPrintLayout;
    IsSaved: boolean;
    ModifiedDate: string;
}

function normalizeLayout(x: any): CheckPrintLayoutRow
{
    return {
        BankAccountId:Number(x?.BankAccountId ?? x?.bankAccountId ?? 0) || 0,
        BankAccountName:String(x?.BankAccountName ?? x?.bankAccountName ?? ''),
        Bank:String(x?.Bank ?? x?.bank ?? ''),
        AccountNumber:String(x?.AccountNumber ?? x?.accountNumber ?? ''),
        Layout:parseCheckLayout(String(x?.LayoutJson ?? x?.layoutJson ?? '')),
        IsSaved:!!(x?.IsSaved ?? x?.isSaved),
        ModifiedDate:String(x?.ModifiedDate ?? x?.modifiedDate ?? '')
    };
}


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
    {
        const value = pick(x, name);
        return Array.isArray(value) ? value : [];
    };

function normalizeBook(x: any): CheckBook
{
    return {
        CheckBookId:num(x, 'CheckBookId'),
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        BankAccountId:num(x, 'BankAccountId'),
        BankAccountName:text(x, 'BankAccountName'),
        Bank:text(x, 'Bank'),
        AccountNumber:text(x, 'AccountNumber'),
        BookNo:text(x, 'BookNo'),
        Prefix:text(x, 'Prefix'),
        StartNo:text(x, 'StartNo'),
        EndNo:text(x, 'EndNo'),
        LeafCount:num(x, 'LeafCount'),
        ReceivedDate:text(x, 'ReceivedDate'),
        Remarks:text(x, 'Remarks'),
        IsActive:pick(x, 'IsActive') !== false,
        RangeLocked:!!pick(x, 'RangeLocked'),
        Leaves:list(x, 'Leaves').map(l => ({
            CheckBookLeafId:num(l, 'CheckBookLeafId'),
            LeafNo:num(l, 'LeafNo'),
            CheckNo:text(l, 'CheckNo'),
            Status:(text(l, 'Status') || 'Unused') as CheckLeafStatus,
            SourceType:text(l, 'SourceType'),
            SourceNo:text(l, 'SourceNo'),
            PayeeName:text(l, 'PayeeName'),
            Amount:num(l, 'Amount'),
            IssuedDate:text(l, 'IssuedDate'),
            Reason:text(l, 'Reason'),
            StatusDate:text(l, 'StatusDate')
        }))
    };
}


//===============================================================
// Check Books Service : api/settings/account-settings/check-books
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class CheckBooksService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/settings/account-settings/check-books`;

    getAll():
        Observable<CheckBookListItem[]>
    {
        return this.http
            .get<any[]>(this.apiUrl)
            .pipe(
                map(rows =>
                    (Array.isArray(rows) ? rows : []).map(x => ({
                        PublicId:text(x, 'PublicId'),
                        Code:text(x, 'Code'),
                        BankAccountId:num(x, 'BankAccountId'),
                        BankAccountName:text(x, 'BankAccountName'),
                        Bank:text(x, 'Bank'),
                        AccountNumber:text(x, 'AccountNumber'),
                        BookNo:text(x, 'BookNo'),
                        FirstCheckNo:text(x, 'FirstCheckNo'),
                        LastCheckNo:text(x, 'LastCheckNo'),
                        LeafCount:num(x, 'LeafCount'),
                        Unused:num(x, 'Unused'),
                        Issued:num(x, 'Issued'),
                        Cancelled:num(x, 'Cancelled'),
                        Lost:num(x, 'Lost'),
                        Void:num(x, 'Void'),
                        NextCheckNo:text(x, 'NextCheckNo'),
                        ReceivedDate:text(x, 'ReceivedDate'),
                        IsActive:pick(x, 'IsActive') !== false,
                        AccountUnused:num(x, 'AccountUnused'),
                        LowLeaf:!!pick(x, 'LowLeaf')
                    }))));
    }

    getById(publicId: string):
        Observable<CheckBook>
    {
        return this.http
            .get<any>(`${this.apiUrl}/${publicId}`)
            .pipe(map(normalizeBook));
    }

    getDefaults():
        Observable<CheckBookDefaults>
    {
        return this.http
            .get<any>(`${this.apiUrl}/defaults`)
            .pipe(
                map(x => ({
                    NextCode:text(x, 'NextCode'),
                    LowLeafThreshold:num(x, 'LowLeafThreshold'),
                    AllowChooseLeaf:pick(x, 'AllowChooseLeaf') !== false,
                    BankAccounts:list(x, 'BankAccounts').map(a => ({
                        BankAccountId:num(a, 'BankAccountId'),
                        Code:text(a, 'Code'),
                        Name:text(a, 'Name'),
                        Bank:text(a, 'Bank'),
                        AccountNumber:text(a, 'AccountNumber'),
                        UnusedLeaves:num(a, 'UnusedLeaves'),
                        LowLeaf:!!pick(a, 'LowLeaf'),
                        SuggestedStartNo:text(a, 'SuggestedStartNo'),
                        SuggestedPrefix:text(a, 'SuggestedPrefix')
                    }))
                })));
    }

    // The unused leaves of a bank account (Payment Voucher, Fund
    // Transfer : phase 2)
    getAvailableLeaves(bankAccountId: number, take = 50):
        Observable<AvailableCheckLeaves>
    {
        return this.http
            .get<any>(`${this.apiUrl}/available-leaves/${bankAccountId}`, { params:{ take } })
            .pipe(
                map(x => ({
                    BankAccountId:num(x, 'BankAccountId'),
                    HasBooks:!!pick(x, 'HasBooks'),
                    AllowChooseLeaf:pick(x, 'AllowChooseLeaf') !== false,
                    LowLeafThreshold:num(x, 'LowLeafThreshold'),
                    LowLeaf:!!pick(x, 'LowLeaf'),
                    UnusedLeaves:num(x, 'UnusedLeaves'),
                    Leaves:list(x, 'Leaves').map(l => ({
                        CheckBookLeafId:num(l, 'CheckBookLeafId'),
                        CheckNo:text(l, 'CheckNo'),
                        BookCode:text(l, 'BookCode')
                    }))
                })));
    }

    private body(b: CheckBook): any
    {
        return {
            BankAccountId:b.BankAccountId,
            BookNo:b.BookNo,
            Prefix:b.Prefix,
            StartNo:b.StartNo,
            LeafCount:b.LeafCount,
            ReceivedDate:b.ReceivedDate,
            Remarks:b.Remarks,
            IsActive:b.IsActive
        };
    }

    create(b: CheckBook):
        Observable<CheckBook>
    {
        return this.http
            .post<any>(this.apiUrl, this.body(b))
            .pipe(map(normalizeBook));
    }

    update(publicId: string, b: CheckBook):
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${publicId}`, this.body(b));
    }

    delete(publicId: string):
        Observable<void>
    {
        return this.http.delete<void>(`${this.apiUrl}/${publicId}`);
    }

    restore():
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/restore`, {});
    }

    markLeaf(publicId: string, leafId: number, status: 'Cancelled' | 'Lost', reason: string):
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${publicId}/leaves/${leafId}/mark`, { Status:status, Reason:reason });
    }

    undoLeaf(publicId: string, leafId: number):
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${publicId}/leaves/${leafId}/undo`, {});
    }

    // Cheque print layouts of bank accounts (defaults when none is
    // saved)
    getPrintLayouts(bankAccountIds: number[]):
        Observable<CheckPrintLayoutRow[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/print-layouts`, { params:{ accountIds:bankAccountIds.join(',') } })
            .pipe(map(rows => (Array.isArray(rows) ? rows : []).map(normalizeLayout)));
    }

    savePrintLayout(bankAccountId: number, layout: CheckPrintLayout):
        Observable<CheckPrintLayoutRow>
    {
        return this.http
            .put<any>(`${this.apiUrl}/print-layouts/${bankAccountId}`, { LayoutJson:JSON.stringify(layout) })
            .pipe(map(normalizeLayout));
    }

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/history`);
    }
}
