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
    TermsConditionDefaults,
    TermsConditionListItem,
    TermsConditionSet
}
from '../models/terms-conditions.model';


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

export function normalizeTermsSet
(
    x: any
):
    TermsConditionSet
{
    return {
        TermsConditionSetId:num(x, 'TermsConditionSetId'),
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        Title:text(x, 'Title'),
        OperationCode:text(x, 'OperationCode'),
        OperationName:text(x, 'OperationName'),
        IsDefault:!!pick(x, 'IsDefault'),
        Note:text(x, 'Note'),
        IsActive:pick(x, 'IsActive') !== false,
        Lines:list(x, 'Lines').map(l => ({
            TextEn:text(l, 'TextEn'),
            TextBn:text(l, 'TextBn')
        }))
    };
}


//===============================================================
// Terms & Conditions Service :
// api/settings/general-settings/terms-conditions
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class TermsConditionsService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/settings/general-settings/terms-conditions`;

    getAll():
        Observable<TermsConditionListItem[]>
    {
        return this.http
            .get<any[]>(this.apiUrl)
            .pipe(
                map(rows =>
                    (Array.isArray(rows) ? rows : []).map(x => ({
                        PublicId:text(x, 'PublicId'),
                        Code:text(x, 'Code'),
                        Title:text(x, 'Title'),
                        OperationCode:text(x, 'OperationCode'),
                        OperationName:text(x, 'OperationName'),
                        LineCount:num(x, 'LineCount'),
                        BanglaCount:num(x, 'BanglaCount'),
                        IsDefault:!!pick(x, 'IsDefault'),
                        IsActive:pick(x, 'IsActive') !== false,
                        LinesText:text(x, 'LinesText')
                    }))));
    }

    getById(publicId: string):
        Observable<TermsConditionSet>
    {
        return this.http
            .get<any>(`${this.apiUrl}/${publicId}`)
            .pipe(map(normalizeTermsSet));
    }

    getDefaults():
        Observable<TermsConditionDefaults>
    {
        return this.http
            .get<any>(`${this.apiUrl}/defaults`)
            .pipe(
                map(x => ({
                    NextCode:text(x, 'NextCode'),
                    Operations:list(x, 'Operations').map(o => ({
                        Code:text(o, 'Code'),
                        Name:text(o, 'Name'),
                        Group:text(o, 'Group'),
                        DefaultSetCode:text(o, 'DefaultSetCode'),
                        DefaultSetPublicId:text(o, 'DefaultSetPublicId'),
                        NextTitle:text(o, 'NextTitle')
                    }))
                })));
    }

    // The operation's Default set (null = none) : for the documents
    getDefaultFor(operationCode: string):
        Observable<TermsConditionSet | null>
    {
        return this.http
            .get<any>(`${this.apiUrl}/default/${encodeURIComponent(operationCode)}`)
            .pipe(map(x => x ? normalizeTermsSet(x) : null));
    }

    private body(t: TermsConditionSet): any
    {
        // no Title : the server names a new set after its operation
        return {
            OperationCode:t.OperationCode,
            IsDefault:t.IsDefault,
            Note:t.Note,
            IsActive:t.IsActive,
            Lines:t.Lines
                .filter(l => l.TextEn.trim() || l.TextBn.trim())
                .map(l => ({ TextEn:l.TextEn, TextBn:l.TextBn }))
        };
    }

    create(t: TermsConditionSet):
        Observable<TermsConditionSet>
    {
        return this.http
            .post<any>(this.apiUrl, this.body(t))
            .pipe(map(normalizeTermsSet));
    }

    update(publicId: string, t: TermsConditionSet):
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${publicId}`, this.body(t));
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

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/history`);
    }
}
