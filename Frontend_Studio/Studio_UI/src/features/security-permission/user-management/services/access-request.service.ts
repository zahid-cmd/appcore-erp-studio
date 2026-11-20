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
    AccessRequestItem,
    AccessRequestList,
    AccessRequestOption,
    AccessRequestOptions,
    AccessRequestStatus
}
from '../models/access-request.model';


//===============================================================
// Access Request Service (2026-11-20)
//
// Reads both spellings of the answer (camelCase from the API,
// PascalCase if the API's JSON settings ever change).
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class AccessRequestService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/security-permission/user-management/access-requests`;


    list
    (
        status: AccessRequestStatus
    ):
        Observable<AccessRequestList>
    {
        const params =
            new HttpParams().set('status', status);

        return this.http
            .get<any>(this.apiUrl, { params })
            .pipe(
                map(raw =>
                ({
                    canDecide: !!(raw?.canDecide ?? raw?.CanDecide),
                    pending: Number(raw?.pending ?? raw?.Pending ?? 0),
                    approved: Number(raw?.approved ?? raw?.Approved ?? 0),
                    rejected: Number(raw?.rejected ?? raw?.Rejected ?? 0),
                    items: ((raw?.items ?? raw?.Items ?? []) as any[]).map(AccessRequestService.item)
                }))
            );
    }

    options():
        Observable<AccessRequestOptions>
    {
        return this.http
            .get<any>(`${this.apiUrl}/options`)
            .pipe(
                map(raw =>
                ({
                    roles: ((raw?.roles ?? raw?.Roles ?? []) as any[]).map(AccessRequestService.option),
                    branches: ((raw?.branches ?? raw?.Branches ?? []) as any[]).map(AccessRequestService.option)
                }))
            );
    }

    approve
    (
        publicId: string,
        roleProfileId: number,
        branchIds: number[]
    ):
        Observable<string>
    {
        return this.http
            .post<any>(`${this.apiUrl}/${publicId}/approve`, { roleProfileId, branchIds })
            .pipe(map(raw => String(raw?.message ?? raw?.Message ?? 'Approved.')));
    }

    reject
    (
        publicId: string,
        reason: string
    ):
        Observable<string>
    {
        return this.http
            .post<any>(`${this.apiUrl}/${publicId}/reject`, { reason })
            .pipe(map(raw => String(raw?.message ?? raw?.Message ?? 'Rejected.')));
    }


    private static item(x: any): AccessRequestItem
    {
        return {
            publicId: String(x?.publicId ?? x?.PublicId ?? ''),
            userName: String(x?.userName ?? x?.UserName ?? ''),
            displayName: String(x?.displayName ?? x?.DisplayName ?? ''),
            fullName: String(x?.fullName ?? x?.FullName ?? ''),
            email: String(x?.email ?? x?.Email ?? ''),
            mobileNo: String(x?.mobileNo ?? x?.MobileNo ?? ''),
            userPhotoPath: String(x?.userPhotoPath ?? x?.UserPhotoPath ?? ''),
            status: (x?.status ?? x?.Status ?? 'Pending'),
            requestedDate: String(x?.requestedDate ?? x?.RequestedDate ?? ''),
            decidedByName: String(x?.decidedByName ?? x?.DecidedByName ?? ''),
            decidedDate: (x?.decidedDate ?? x?.DecidedDate ?? null),
            decisionNote: String(x?.decisionNote ?? x?.DecisionNote ?? '')
        };
    }

    private static option(x: any): AccessRequestOption
    {
        return {
            id: Number(x?.id ?? x?.Id ?? 0),
            code: String(x?.code ?? x?.Code ?? ''),
            name: String(x?.name ?? x?.Name ?? '')
        };
    }
}
