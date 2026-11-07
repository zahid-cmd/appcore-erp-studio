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
    ServerManagement,
    CreateServerManagement,
    UpdateServerManagement,
    ServerManagementDefaults,
    ServerConnectionTest
}
from '../models/server-management.model';


//===============================================================
// Server Management Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class ServerManagementService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/infrastructure-control/code-management/server-management`;


    getAll():
        Observable<ServerManagement[]>
    {
        return this.http.get<ServerManagement[]>(
            this.apiUrl
        );
    }


    getDefaults():
        Observable<ServerManagementDefaults>
    {
        return this.http.get<ServerManagementDefaults>(
            `${this.apiUrl}/defaults`
        );
    }


    getById
    (
        publicId:
            string
    ):
        Observable<ServerManagement>
    {
        return this.http.get<ServerManagement>(
            `${this.apiUrl}/${publicId}`
        );
    }


    create
    (
        model:
            CreateServerManagement
    ):
        Observable<{ id: number; publicId: string }>
    {
        return this.http.post<{ id: number; publicId: string }>(
            this.apiUrl,
            model
        );
    }


    update
    (
        publicId:
            string,

        model:
            UpdateServerManagement
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${publicId}`,
            model
        );
    }


    // Asks the server's Deploy Agent (agent health)
    testConnection
    (
        publicId:
            string
    ):
        Observable<ServerConnectionTest>
    {
        return this.http.post<ServerConnectionTest>(
            `${this.apiUrl}/${publicId}/test`,
            {}
        );
    }


    delete
    (
        publicId:
            string
    ):
        Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/${publicId}`
        );
    }


    // the most recently deleted server
    restore():
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/restore`,
            {}
        );
    }


    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`
        );
    }


    getEntityHistory
    (
        publicId:
            string
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${publicId}/history`
        );
    }
}
