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
    PageCloning,
    CreatePageCloning,
    UpdatePageCloning,
    PageCloningDefaults,
    PageCloningPreview,
    PageCloningResult,
    EntityAnalysis
}
from '../model/page-cloning.model';


//===============================================================
// Page Cloning Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class PageCloningService
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
        `${environment.apiUrl}/infrastructure-control/development-management/page-cloning`;


    //===========================================================
    // Get API Base URL
    //===========================================================

    getApiBaseUrl():
        string
    {
        return environment.apiUrl
            .replace(
                /\/+$/,
                ''
            );
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<PageCloning[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        response.map(
                            item =>
                            ({
                                ...item,

                                PageCloningId:
                                    Number(
                                        item.PageCloningId
                                        ??
                                        item.pageCloningId
                                        ??
                                        item.id
                                        ??
                                        item.Id
                                        ??
                                        0
                                    ),

                                CloneFromId:
                                    Number(
                                        item.CloneFromId
                                        ??
                                        item.cloneFromId
                                        ??
                                        0
                                    ),

                                CloneFromCode:
                                    item.CloneFromCode
                                    ??
                                    item.cloneFromCode
                                    ??
                                    '',

                                CloneFromName:
                                    item.CloneFromName
                                    ??
                                    item.cloneFromName
                                    ??
                                    '',

                                CloneToId:
                                    Number(
                                        item.CloneToId
                                        ??
                                        item.cloneToId
                                        ??
                                        0
                                    ),

                                CloneToCode:
                                    item.CloneToCode
                                    ??
                                    item.cloneToCode
                                    ??
                                    '',

                                CloneToName:
                                    item.CloneToName
                                    ??
                                    item.cloneToName
                                    ??
                                    '',

                                EntityName:
                                    item.EntityName
                                    ??
                                    item.entityName
                                    ??
                                    '',

                                BlueprintJson:
                                    item.BlueprintJson
                                    ??
                                    item.blueprintJson
                                    ??
                                    '',

                                NumberOfFiles:
                                    Number(
                                        item.NumberOfFiles
                                        ??
                                        item.numberOfFiles
                                        ??
                                        15
                                    ),

                                RunStatus:
                                    item.RunStatus
                                    ??
                                    item.runStatus
                                    ??
                                    'Draft',

                                LastRunDate:
                                    item.LastRunDate
                                    ??
                                    item.lastRunDate
                                    ??
                                    null,

                                BuildOutput:
                                    item.BuildOutput
                                    ??
                                    item.buildOutput
                                    ??
                                    '',

                                Remarks:
                                    item.Remarks
                                    ??
                                    item.remarks
                                    ??
                                    '',

                                IsActive:
                                    Boolean(
                                        item.IsActive
                                        ??
                                        item.isActive
                                        ??
                                        true
                                    )
                            })
                        )
                )
            );
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<PageCloningDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    response =>
                    ({
                        NumberOfFiles:
                            Number(
                                response.numberOfFiles
                                ??
                                response.NumberOfFiles
                                ??
                                15
                            ),

                        RunStatus:
                            response.runStatus
                            ??
                            response.RunStatus
                            ??
                            'Draft'
                    })
                )
            );
    }


    //===========================================================
    // Get By Id
    //===========================================================

    getById(
        id:
            number
    ):
        Observable<PageCloning>
    {
        return this.http.get<PageCloning>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create(
        model:
            CreatePageCloning
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

    update(
        model:
            UpdatePageCloning
    ):
        Observable<void>
    {
        return this.http.put<void>(
            this.apiUrl,
            model
        );
    }


    //===========================================================
    // Delete
    //===========================================================

    delete(
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
    // Restore Deleted Record
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
    // Analyze Source Page
    //===========================================================

    analyze(
        name:
            string
    ):
        Observable<EntityAnalysis>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/analyze`,
                {
                    params:
                    {
                        name
                    }
                }
            )
            .pipe(
                map(
                    r =>
                    ({
                        SourceName:
                            r.sourceName ?? '',

                        Entity:
                            r.entity ?? '',

                        Table:
                            r.table ?? '',

                        Namespace:
                            r.namespace ?? '',

                        PrimaryKey:
                            r.primaryKey ?? '',

                        Files:
                            (r.files ?? []).map(
                                (f: any) =>
                                ({
                                    Key: f.key,
                                    Path: f.path,
                                    Exists: !!f.exists
                                })
                            ),

                        Fields:
                            (r.fields ?? []).map(
                                (f: any) =>
                                ({
                                    Name: f.name,
                                    CsType: f.csType,
                                    TsType: f.tsType,
                                    MaxLength: f.maxLength ?? null,
                                    Required: !!f.required,
                                    Unique: !!f.unique,
                                    Category: f.category
                                })
                            ),

                        Parents:
                            (r.parents ?? []).map(
                                (p: any) =>
                                ({
                                    ForeignKey: p.foreignKey,
                                    ParentEntity: p.parentEntity
                                })
                            ),

                        ChildEntities:
                            r.childEntities ?? [],

                        CodeMethod:
                            r.codeMethod ?? '',

                        CodeFormat:
                            r.codeFormat ?? '',

                        Hints:
                            r.hints ?? [],

                        Errors:
                            r.errors ?? []
                    })
                )
            );
    }


    //===========================================================
    // Preview Clone
    //===========================================================

    preview(
        id:
            number
    ):
        Observable<PageCloningPreview>
    {
        return this.http
            .post<any>(
                `${this.apiUrl}/${id}/preview`,
                {}
            )
            .pipe(
                map(
                    response =>
                    ({
                        PageCloningId:
                            Number(
                                response.pageCloningId
                                ??
                                response.PageCloningId
                                ??
                                id
                            ),

                        Files:
                            (
                                response.files
                                ??
                                response.Files
                                ??
                                []
                            )
                            .map(
                                (file: any) =>
                                ({
                                    LogicalKey:
                                        file.logicalKey
                                        ??
                                        file.LogicalKey
                                        ??
                                        '',

                                    Path:
                                        file.path
                                        ??
                                        file.Path
                                        ??
                                        '',

                                    Before:
                                        file.before
                                        ??
                                        file.Before
                                        ??
                                        '',

                                    After:
                                        file.after
                                        ??
                                        file.After
                                        ??
                                        '',

                                    EditedSinceBaseline:
                                        Boolean(
                                            file.editedSinceBaseline
                                            ??
                                            file.EditedSinceBaseline
                                            ??
                                            false
                                        )
                                })
                            ),

                        Warnings:
                            response.warnings
                            ??
                            response.Warnings
                            ??
                            []
                    })
                )
            );
    }


    //===========================================================
    // Apply Clone
    //===========================================================

    apply(
        id:
            number,
        overwriteEdited:
            boolean = false
    ):
        Observable<PageCloningResult>
    {
        return this.http
            .post<any>(
                `${this.apiUrl}/${id}/apply`,
                {},
                {
                    params:
                        new HttpParams()
                            .set(
                                'overwriteEdited',
                                overwriteEdited
                            )
                }
            )
            .pipe(
                map(
                    response =>
                        this.mapResult(
                            response
                        )
                )
            );
    }


    //===========================================================
    // Restore Code To Baseline
    //===========================================================

    restoreBaseline(
        id:
            number
    ):
        Observable<PageCloningResult>
    {
        return this.http
            .post<any>(
                `${this.apiUrl}/${id}/restore-baseline`,
                {}
            )
            .pipe(
                map(
                    response =>
                        this.mapResult(
                            response
                        )
                )
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


    //===========================================================
    // Map Result
    //===========================================================

    private mapResult(
        response:
            any
    ):
        PageCloningResult
    {
        return {
            Success:
                Boolean(
                    response?.success
                    ??
                    response?.Success
                    ??
                    false
                ),

            Messages:
                response?.messages
                ??
                response?.Messages
                ??
                [],

            BuildOutput:
                response?.buildOutput
                ??
                response?.BuildOutput
                ??
                '',

            RunStatus:
                response?.runStatus
                ??
                response?.RunStatus
                ??
                ''
        };
    }
}