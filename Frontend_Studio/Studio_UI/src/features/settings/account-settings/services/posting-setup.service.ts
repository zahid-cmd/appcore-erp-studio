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
    HttpClient,
    HttpParams
}
from '@angular/common/http';

import
{
    Observable
}
from 'rxjs';

import
{
    environment
}
from '../../../../environments/environment';

import
{
    PostingSetupWorkspace,
    PostingSetupRow,
    UpdatePostingSetup,
    PostingSetupHistory
}
from '../models/posting-setup.model';


//===============================================================
// Posting Setup Service
//
//   GET workspace        purposes + ledgers + canChange
//   PUT {purposeCode}    change one ledger (reason required)
//   GET history          changes, newest first
//===============================================================

@Injectable(
{
    providedIn: 'root'
})
export class PostingSetupService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/settings/account-settings/posting-setup`;


    getWorkspace():
        Observable<PostingSetupWorkspace>
    {
        return this.http.get<PostingSetupWorkspace>(
            `${this.apiUrl}/workspace`);
    }


    update(
        purposeCode: string,
        dto: UpdatePostingSetup
    ):
        Observable<PostingSetupRow>
    {
        return this.http.put<PostingSetupRow>(
            `${this.apiUrl}/${encodeURIComponent(purposeCode)}`,
            dto);
    }


    getHistory(
        purposeCode: string | null = null
    ):
        Observable<PostingSetupHistory[]>
    {
        let params =
            new HttpParams();

        if (purposeCode)
        {
            params =
                params.set(
                    'purposeCode',
                    purposeCode);
        }

        return this.http.get<PostingSetupHistory[]>(
            `${this.apiUrl}/history`,
            { params });
    }
}
