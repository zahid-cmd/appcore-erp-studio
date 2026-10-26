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
    UpdateSystemConfiguration,
    SystemConfigurationValue,
    ConfigurationWorkspace,
    ConfigurationChange,
    ApplyConfigurationResult,
    ConfigurationRequest,
    ConfigurationScope,
    ConfigurationValueType
}
from '../models/system-configurations.model';


//===============================================================
// Case-insensitive field readers
//
// The API may send PascalCase or camelCase.
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

function readOptionalNumber
(
    item:
        any,
    name:
        string
):
    number | null
{
    const raw =
        readField(item, name);

    if
    (
        raw === null
        ||
        raw === undefined
        ||
        raw === ''
    )
    {
        return null;
    }

    const value =
        Number(raw);

    return Number.isFinite(value)
        ? value
        : null;
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

function readList
(
    item:
        any,
    name:
        string
):
    any[]
{
    const value =
        readField(item, name);

    return Array.isArray(value)
        ? value
        : [];
}

function readScope
(
    item:
        any
):
    ConfigurationScope
{
    const value =
        readText(item, 'ScopeType');

    return value === 'Menu' || value === 'Submenu'
        ? value
        : 'Module';
}

function readValueType
(
    item:
        any
):
    ConfigurationValueType
{
    const value =
        readText(item, 'ValueType');

    return value === 'Number' || value === 'Text'
        ? value
        : 'None';
}


//===============================================================
// Normalize a switch
//===============================================================

export function normalizeSystemConfiguration
(
    item:
        any
):
    SystemConfiguration
{
    return {
        SystemConfigurationId: readNumber(item, 'SystemConfigurationId'),
        NavigationModuleId: readNumber(item, 'NavigationModuleId'),
        ModuleCode: readText(item, 'ModuleCode'),
        ModuleName: readText(item, 'ModuleName'),
        ModuleIcon: readText(item, 'ModuleIcon'),
        ScopeType: readScope(item),
        NavigationMenuCode: readText(item, 'NavigationMenuCode'),
        MenuName: readText(item, 'MenuName'),
        NavigationSubmenuCode: readText(item, 'NavigationSubmenuCode'),
        SubmenuName: readText(item, 'SubmenuName'),
        ConfigurationCode: readText(item, 'ConfigurationCode'),
        ConfigurationName: readText(item, 'ConfigurationName'),
        OnDescription: readText(item, 'OnDescription'),
        OffDescription: readText(item, 'OffDescription'),
        IsEnabled: readBool(item, 'IsEnabled', false),
        Value: readText(item, 'Value'),
        ValueType: readValueType(item),
        ValueUnit: readText(item, 'ValueUnit'),
        ValueMin: readOptionalNumber(item, 'ValueMin'),
        ValueMax: readOptionalNumber(item, 'ValueMax'),
        ValueEmptyText: readText(item, 'ValueEmptyText'),
        DefaultEnabled: readBool(item, 'DefaultEnabled', false),
        DefaultValue: readText(item, 'DefaultValue'),
        ParentConfigurationCode: readText(item, 'ParentConfigurationCode'),
        IsCritical: readBool(item, 'IsCritical', false),
        IsSystemDefined: readBool(item, 'IsSystemDefined', false),
        DisplayOrder: readNumber(item, 'DisplayOrder'),
        Remarks: readText(item, 'Remarks'),
        CanChange: readBool(item, 'CanChange', false),
        IsPending: readBool(item, 'IsPending', false),
        PendingEnabled: readBool(item, 'PendingEnabled', false),
        PendingValue: readText(item, 'PendingValue'),
        PendingByName: readText(item, 'PendingByName')
    };
}


//===============================================================
// Normalize the workspace
//===============================================================

export function normalizeWorkspace
(
    item:
        any
):
    ConfigurationWorkspace
{
    return {
        CanManage:
            readBool(item, 'CanManage', false),

        PendingCount:
            readNumber(item, 'PendingCount'),

        Modules:
            readList(item, 'Modules').map
            (
                x =>
                ({
                    NavigationModuleId: readNumber(x, 'NavigationModuleId'),
                    Code: readText(x, 'Code'),
                    Name: readText(x, 'Name'),
                    Icon: readText(x, 'Icon'),
                    DisplayOrder: readNumber(x, 'DisplayOrder')
                })
            ),

        Menus:
            readList(item, 'Menus').map
            (
                x =>
                ({
                    NavigationModuleId: readNumber(x, 'NavigationModuleId'),
                    Code: readText(x, 'Code'),
                    Name: readText(x, 'Name'),
                    DisplayOrder: readNumber(x, 'DisplayOrder')
                })
            ),

        Submenus:
            readList(item, 'Submenus').map
            (
                x =>
                ({
                    NavigationModuleId: readNumber(x, 'NavigationModuleId'),
                    MenuCode: readText(x, 'MenuCode'),
                    Code: readText(x, 'Code'),
                    Name: readText(x, 'Name'),
                    DisplayOrder: readNumber(x, 'DisplayOrder')
                })
            ),

        Switches:
            readList(item, 'Switches').map(normalizeSystemConfiguration),

        Recent:
            readList(item, 'Recent').map
            (
                x =>
                ({
                    ConfigurationCode: readText(x, 'ConfigurationCode'),
                    ConfigurationName: readText(x, 'ConfigurationName'),
                    Description: readText(x, 'Description'),
                    PerformedByName: readText(x, 'PerformedByName'),
                    PerformedDate: readText(x, 'PerformedDate')
                })
            )
    };
}


//===============================================================
// Normalize a change request
//===============================================================

export function normalizeRequest
(
    item:
        any
):
    ConfigurationRequest
{
    return {
        SystemConfigurationRequestId: readNumber(item, 'SystemConfigurationRequestId'),
        ConfigurationCode: readText(item, 'ConfigurationCode'),
        ConfigurationName: readText(item, 'ConfigurationName'),
        ModuleName: readText(item, 'ModuleName'),
        SubmenuName: readText(item, 'SubmenuName'),
        ValueUnit: readText(item, 'ValueUnit'),
        ValueEmptyText: readText(item, 'ValueEmptyText'),
        FromEnabled: readBool(item, 'FromEnabled', false),
        FromValue: readText(item, 'FromValue'),
        ToEnabled: readBool(item, 'ToEnabled', false),
        ToValue: readText(item, 'ToValue'),
        Reason: readText(item, 'Reason'),
        Status: readText(item, 'Status'),
        IsStale: readBool(item, 'IsStale', false),
        RequestedBy: readNumber(item, 'RequestedBy'),
        RequestedByName: readText(item, 'RequestedByName'),
        RequestedDate: readText(item, 'RequestedDate')
    };
}


//===============================================================
// Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class SystemConfigurationsService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/settings/general-settings/system-configurations`;


    //===========================================================
    // Runtime values (any logged-in user; read by code)
    //===========================================================

    getValues():
        Observable<SystemConfigurationValue[]>
    {
        return this.http
            .get<any[]>(
                `${this.apiUrl}/values`
            )
            .pipe(
                map(
                    response =>
                        (Array.isArray(response) ? response : [])
                            .map
                            (
                                item =>
                                ({
                                    ConfigurationCode: readText(item, 'ConfigurationCode'),
                                    IsEnabled: readBool(item, 'IsEnabled', false),
                                    Value: readText(item, 'Value')
                                })
                            )
                )
            );
    }


    //===========================================================
    // Workspace (the page for the logged-in user)
    //===========================================================

    getWorkspace():
        Observable<ConfigurationWorkspace>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/workspace`
            )
            .pipe(
                map(normalizeWorkspace)
            );
    }


    //===========================================================
    // Switches the user may see
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
                            .map(normalizeSystemConfiguration)
                )
            );
    }

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
                map(normalizeSystemConfiguration)
            );
    }


    //===========================================================
    // Review & Apply
    //===========================================================

    apply
    (
        changes:
            ConfigurationChange[]
    ):
        Observable<ApplyConfigurationResult>
    {
        return this.http
            .post<any>(
                `${this.apiUrl}/apply`,
                {
                    Changes:
                        changes
                }
            )
            .pipe(
                map(
                    response =>
                    ({
                        Applied: readNumber(response, 'Applied'),
                        SentForApproval: readNumber(response, 'SentForApproval'),
                        Unchanged: readNumber(response, 'Unchanged')
                    })
                )
            );
    }

    setEnabled
    (
        id:
            number,
        isEnabled:
            boolean,
        reason:
            string = ''
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${id}/enabled`,
            {
                IsEnabled:
                    isEnabled,

                Reason:
                    reason
            }
        );
    }


    //===========================================================
    // Approvals (admin)
    //===========================================================

    getRequests():
        Observable<ConfigurationRequest[]>
    {
        return this.http
            .get<any[]>(
                `${this.apiUrl}/requests`
            )
            .pipe(
                map(
                    response =>
                        (Array.isArray(response) ? response : [])
                            .map(normalizeRequest)
                )
            );
    }

    approve
    (
        requestId:
            number,
        note:
            string = ''
    ):
        Observable<void>
    {
        return this.http.post<void>(
            `${this.apiUrl}/requests/${requestId}/approve`,
            {
                Note:
                    note
            }
        );
    }

    reject
    (
        requestId:
            number,
        note:
            string = ''
    ):
        Observable<void>
    {
        return this.http.post<void>(
            `${this.apiUrl}/requests/${requestId}/reject`,
            {
                Note:
                    note
            }
        );
    }


    //===========================================================
    // Definitions (admin)
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
}