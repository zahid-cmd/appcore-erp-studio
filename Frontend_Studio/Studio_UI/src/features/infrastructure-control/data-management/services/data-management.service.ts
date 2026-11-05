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
    DataBackup,
    DataBackupResult,
    DataHistory,
    DataResetCatalog,
    DataResetPreview,
    DataResetRequest,
    DataResetResult,
    DataRestoreResult,
    DataServerInfo,
    DataSettings,
    DataStatus
}
from '../models/data-management.model';


//===============================================================
// Data Management service (AppCore Admin only)
//
//   GET  access                    { allowed }
//   GET  status                    databases, tools, folders
//   GET  server-info?connection=   version, size
//   PUT  settings
//   GET  backups                   both folders, newest first
//   POST backups                   { connectionName, note, template }
//   GET  backups/download?fileName=
//   POST backups/copy              { fileName }
//   POST backups/delete            { fileName, where }
//   POST backups/restore           { fileName, connectionName,
//                                    confirmDatabase, reason }
//   GET  reset/catalog?connection=
//   POST reset/preview | reset/run
//   GET  history
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class DataManagementService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/infrastructure-control/data-management`;

    access():
        Observable<boolean>
    {
        return this.http
            .get<any>(`${this.apiUrl}/access`)
            .pipe(map(x => !!(x?.allowed ?? x?.Allowed)));
    }

    status():
        Observable<DataStatus>
    {
        return this.http
            .get<any>(`${this.apiUrl}/status`)
            .pipe(map(x => pascal(x)));
    }

    serverInfo
    (
        connection: string
    ):
        Observable<DataServerInfo>
    {
        return this.http
            .get<any>(`${this.apiUrl}/server-info`, { params:{ connection } })
            .pipe(map(x => pascal(x)));
    }

    saveSettings
    (
        settings: DataSettings
    ):
        Observable<DataStatus>
    {
        return this.http
            .put<any>(`${this.apiUrl}/settings`, settings)
            .pipe(map(x => pascal(x)));
    }

    backups():
        Observable<DataBackup[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/backups`)
            .pipe(map(x => pascal(x ?? [])));
    }

    // template : kind "Template" (Save as Template; never deleted
    // automatically)
    backup
    (
        connectionName: string,
        note: string,
        template = false
    ):
        Observable<DataBackupResult>
    {
        return this.http
            .post<any>(`${this.apiUrl}/backups`, { ConnectionName:connectionName, Note:note, Template:template })
            .pipe(map(x => pascal(x)));
    }

    download
    (
        fileName: string
    ):
        Observable<Blob>
    {
        return this.http.get(
            `${this.apiUrl}/backups/download`,
            {
                params:{ fileName },
                responseType:'blob'
            });
    }

    copy
    (
        fileName: string
    ):
        Observable<DataBackup>
    {
        return this.http
            .post<any>(`${this.apiUrl}/backups/copy`, { FileName:fileName })
            .pipe(map(x => pascal(x)));
    }

    remove
    (
        fileName: string,
        where: 'this' | 'other' | 'both'
    ):
        Observable<unknown>
    {
        return this.http
            .post(`${this.apiUrl}/backups/delete`, { FileName:fileName, Where:where });
    }

    restore
    (
        fileName: string,
        connectionName: string,
        confirmDatabase: string,
        reason: string
    ):
        Observable<DataRestoreResult>
    {
        return this.http
            .post<any>(
                `${this.apiUrl}/backups/restore`,
                {
                    FileName:fileName,
                    ConnectionName:connectionName,
                    ConfirmDatabase:confirmDatabase,
                    Reason:reason
                })
            .pipe(map(x => pascal(x)));
    }

    resetCatalog
    (
        connection: string
    ):
        Observable<DataResetCatalog>
    {
        return this.http
            .get<any>(`${this.apiUrl}/reset/catalog`, { params:{ connection } })
            .pipe(map(x => pascal(x)));
    }

    resetPreview
    (
        request: DataResetRequest
    ):
        Observable<DataResetPreview>
    {
        return this.http
            .post<any>(`${this.apiUrl}/reset/preview`, request)
            .pipe(map(x => pascal(x)));
    }

    resetRun
    (
        request: DataResetRequest
    ):
        Observable<DataResetResult>
    {
        return this.http
            .post<any>(`${this.apiUrl}/reset/run`, request)
            .pipe(map(x => pascal(x)));
    }

    history():
        Observable<DataHistory[]>
    {
        return this.http
            .get<any[]>(`${this.apiUrl}/history`)
            .pipe(map(x => pascal(x ?? [])));
    }
}


//===============================================================
// camelCase -> PascalCase (deep)
//===============================================================

function pascal
(
    value: any
):
    any
{
    if (Array.isArray(value))
    {
        return value.map(x => pascal(x));
    }

    if (value && typeof value === 'object')
    {
        const result:
            Record<string, any> =
            {};

        for (const key of Object.keys(value))
        {
            result[key.charAt(0).toUpperCase() + key.slice(1)] =
                pascal(value[key]);
        }

        return result;
    }

    return value;
}
