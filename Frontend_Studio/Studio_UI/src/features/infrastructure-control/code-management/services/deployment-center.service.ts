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
    StartDeployment,
    StartRollback,
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

    deploy
    (
        dto: StartDeployment
    ):
        Observable<StartedJob>
    {
        return this.http.post<StartedJob>(
            `${this.apiUrl}/deploy`,
            dto
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
