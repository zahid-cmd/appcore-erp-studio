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
    SystemConfiguration,
    CreateSystemConfiguration,
    UpdateSystemConfiguration
}
from '../models/system-configurations.model';


//===============================================================
// Case-Insensitive Field Reader
//
// ASP.NET Core camel-cases JSON names :
//   SystemConfigurationId → "systemConfigurationId"
//===============================================================

function readField
(
    item:
        any,
    name:
        string
):
    any
{
    if
    (
        item == null
        ||
        typeof item !== 'object'
    )
    {
        return undefined;
    }

    if
    (
        name in item
    )
    {
        return item[name];
    }

    const target =
        name.toLowerCase();

    const key =
        Object.keys(item).find
        (
            k =>
                k.toLowerCase() ===
                target
        );

    return key !== undefined
        ? item[key]
        : undefined;
}


//===============================================================
// Typed Readers
//===============================================================

function readText
(
    item:
        any,
    name:
        string
):
    string
{
    return String(
        readField(item, name)
        ??
        ''
    ).trim();
}

function readNumber
(
    item:
        any,
    name:
        string
):
    number
{
    const value =
        Number(
            readField(item, name)
            ??
            0
        );

    return Number.isFinite(value)
        ? value
        : 0;
}

function readBool
(
    item:
        any,
    name:
        string,
    fallback:
        boolean
):
    boolean
{
    const value =
        readField(item, name);

    return value == null
        ? fallback
        : Boolean(value);
}


//===============================================================
// Normalize System Configuration (API → Model)
//===============================================================

export function normalizeSystemConfiguration
(
    item:
        any
):
    SystemConfiguration
{
    return {
        SystemConfigurationId:
            readNumber(item, 'SystemConfigurationId'),

        NavigationModuleId:
            readNumber(item, 'NavigationModuleId'),

        ModuleCode:
            readText(item, 'ModuleCode'),

        ModuleName:
            readText(item, 'ModuleName'),

        ModuleIcon:
            readText(item, 'ModuleIcon'),

        ConfigurationCode:
            readText(item, 'ConfigurationCode'),

        ConfigurationName:
            readText(item, 'ConfigurationName'),

        IsEnabled:
            readBool(item, 'IsEnabled', false),

        Remarks:
            readText(item, 'Remarks')
    };
}


//===============================================================
// System Configurations Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class SystemConfigurationsService
{
    //===========================================================
    // Injection
    //===========================================================

    private readonly http =
        inject(HttpClient);


    //===========================================================
    // API
    //===========================================================

    private readonly apiUrl =
        `${environment.apiUrl}/settings/general-settings/system-configurations`;


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<SystemConfiguration[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        (Array.isArray(response) ? response : [])
                            .map(
                                item =>
                                    normalizeSystemConfiguration(
                                        item
                                    )
                            )
                )
            );
    }


    //===========================================================
    // Get Next Code (per Navigation Module)
    //
    // CFG-<ModuleCode>-0001
    //===========================================================

    getNextCode
    (
        navigationModuleId:
            number
    ):
        Observable<string>
    {
        return this.http
            .get(
                `${this.apiUrl}/next-code`,
                {
                    params:
                    {
                        navigationModuleId:
                            navigationModuleId
                    },

                    responseType:
                        'text'
                }
            )
            .pipe(
                map(
                    code =>
                        String(code ?? '')
                            .trim()
                            .replace(/^"+|"+$/g, '')
                )
            );
    }


    //===========================================================
    // Get By Id
    //===========================================================

    getById
    (
        id:
            number
    ):
        Observable<SystemConfiguration>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/${id}`
            )
            .pipe(
                map(
                    response =>
                        normalizeSystemConfiguration(
                            response
                        )
                )
            );
    }


    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateSystemConfiguration
    ):
        Observable<number>
    {
        return this.http.post<number>(
            this.apiUrl,
            model
        );
    }


    //===========================================================
    // Update
    //===========================================================

    update
    (
        model:
            UpdateSystemConfiguration
    ):
        Observable<void>
    {
        return this.http.put<void>(
            this.apiUrl,
            model
        );
    }


    //===========================================================
    // Set Enabled (card toggle)
    //===========================================================

    setEnabled
    (
        id:
            number,
        isEnabled:
            boolean
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${id}/enabled`,
            {
                IsEnabled:
                    isEnabled
            }
        );
    }


    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        id:
            number
    ):
        Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Restore
    //===========================================================

    restore():
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/restore`,
            {}
        );
    }


    //===========================================================
    // Get History
    //===========================================================

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`
        );
    }
}