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
    BackupCenter,
    BackupCenterResult
}
from '../models/backup-center.model';


//===============================================================
// Backup Center service
//
//   GET  <api>          status + last 10 backups (View)
//   POST <api>/backup   { note } : backup now (Take Backup)
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class BackupCenterService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/settings/general-settings/backup-center`;

    get():
        Observable<BackupCenter>
    {
        return this.http
            .get<any>(this.apiUrl)
            .pipe(map(x => pascal(x)));
    }

    backup
    (
        note: string
    ):
        Observable<BackupCenterResult>
    {
        return this.http
            .post<any>(`${this.apiUrl}/backup`, { Note:note })
            .pipe(map(x => pascal(x)));
    }
}


// camelCase -> PascalCase (deep)
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
