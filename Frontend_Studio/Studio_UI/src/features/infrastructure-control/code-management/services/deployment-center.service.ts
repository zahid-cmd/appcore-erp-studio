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
    DeploymentCenter,
    DeploymentProgress,
    DeploymentPreflight,
    DeploymentServerOption,
    ServerRelease,
    DeploymentDraftDefaults,
    SaveDeploymentDraft,
    StartRollback,
    DeploymentCapabilities,
    StartedJob
}
from '../models/deployment-center.model';


//===============================================================
// Deployment Center Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class DeploymentCenterService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/infrastructure-control/code-management/deployment-center`;


    // deployments, newest first (serverPublicId = one server)
    getAll
    (
        serverPublicId?: string | null
    ):
        Observable<DeploymentCenter[]>
    {
        let params =
            new HttpParams();

        if (serverPublicId)
        {
            params =
                params.set('server', serverPublicId);
        }

        return this.http.get<DeploymentCenter[]>(
            this.apiUrl,
            { params }
        );
    }

    // servers to deploy to
    getServers():
        Observable<DeploymentServerOption[]>
    {
        return this.http.get<DeploymentServerOption[]>(
            `${this.apiUrl}/defaults`
        );
    }

    // git check (committed / pushed / up to date)
    getPreflight():
        Observable<DeploymentPreflight>
    {
        return this.http.get<DeploymentPreflight>(
            `${this.apiUrl}/preflight`
        );
    }

    // one deployment with its log
    getById
    (
        publicId: string
    ):
        Observable<DeploymentCenter>
    {
        return this.http.get<DeploymentCenter>(
            `${this.apiUrl}/${publicId}`
        );
    }

    getProgress
    (
        publicId: string,
        lines: number = 200
    ):
        Observable<DeploymentProgress>
    {
        return this.http.get<DeploymentProgress>(
            `${this.apiUrl}/${publicId}/progress`,
            { params:new HttpParams().set('lines', lines) }
        );
    }

    // can this copy deploy? (live server : read-only)
    getCapabilities():
        Observable<DeploymentCapabilities>
    {
        return this.http.get<DeploymentCapabilities>(
            `${this.apiUrl}/capabilities`
        );
    }

    // next release, commit and release notes (New)
    getDraftDefaults
    (
        serverPublicId?: string | null
    ):
        Observable<DeploymentDraftDefaults>
    {
        let params =
            new HttpParams();

        if (serverPublicId)
        {
            params =
                params.set('server', serverPublicId);
        }

        return this.http.get<DeploymentDraftDefaults>(
            `${this.apiUrl}/draft-defaults`,
            { params }
        );
    }

    // new draft
    create
    (
        dto: SaveDeploymentDraft
    ):
        Observable<StartedJob>
    {
        return this.http.post<StartedJob>(
            this.apiUrl,
            dto
        );
    }

    // edit a draft
    update
    (
        publicId: string,
        dto: SaveDeploymentDraft
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${publicId}`,
            dto
        );
    }

    // delete a draft
    delete
    (
        publicId: string
    ):
        Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/${publicId}`
        );
    }

    // run a draft
    deploy
    (
        publicId: string
    ):
        Observable<StartedJob>
    {
        return this.http.post<StartedJob>(
            `${this.apiUrl}/${publicId}/deploy`,
            {}
        );
    }

    getReleases
    (
        serverPublicId: string
    ):
        Observable<ServerRelease[]>
    {
        return this.http.get<ServerRelease[]>(
            `${this.apiUrl}/servers/${serverPublicId}/releases`
        );
    }

    rollback
    (
        dto: StartRollback
    ):
        Observable<StartedJob>
    {
        return this.http.post<StartedJob>(
            `${this.apiUrl}/rollback`,
            dto
        );
    }
}
