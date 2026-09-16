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
    SourceControl,

    CreateSourceControl,

    UpdateSourceControl
}
from '../models/source-control.model';


//===============================================================
// Git Status
//===============================================================

export interface GitStatusDto
{
    repositoryName:
        string;

    branch:
        string;

    lastCommitHash:
        string;

    lastCommitMessage:
        string;

    lastCommitDate:
        string;

    isClean:
        boolean;

    modifiedFiles:
        string[];
}


//===============================================================
// Git Commit
//===============================================================

export interface GitCommitDto
{
    message:
        string;
}


//===============================================================
// Git Operation Result
//===============================================================

export interface GitOperationResultDto
{
    success:
        boolean;

    message:
        string;

    output?:
        string;
}


//===============================================================
// Source Control History
//===============================================================

export interface SourceControlHistoryDto
{
    sourceControlHistoryId:
        number;

    activityType:
        string;

    activityTitle:
        string;

    activityDescription:
        string | null;

    activityResult:
        string;

    commitHash:
        string | null;

    performedDate:
        string;
}


//===============================================================
// Source Control Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class SourceControlService
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
        `${environment.apiUrl}/infrastructure-control/code-management/source-control`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<SourceControl[]>
    {
        return this.http.get<SourceControl[]>(
            this.apiUrl
        );
    }



    //===========================================================
    // Get By Id
    //===========================================================

    getById
    (
        sourceControlId:
            number
    ):
        Observable<SourceControl>
    {
        return this.http.get<SourceControl>(
            `${this.apiUrl}/${sourceControlId}`
        );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateSourceControl
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
            UpdateSourceControl
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${model.sourceControlId}`,

            model
        );
    }



    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        sourceControlId:
            number
    ):
        Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/${sourceControlId}`
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



    //===========================================================
    // Get Entity History
    //===========================================================

    getEntityHistory
    (
        sourceControlId:
            number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${sourceControlId}/history`
        );
    }



    //===========================================================
    // Get Git Status
    //===========================================================

    getStatus
    (
        sourceControlId:
            number
    ):
        Observable<GitStatusDto>
    {
        return this.http.get<GitStatusDto>(
            `${this.apiUrl}/${sourceControlId}/status`
        );
    }



    //===========================================================
    // Pull Latest
    //===========================================================

    pull
    (
        sourceControlId:
            number
    ):
        Observable<GitOperationResultDto>
    {
        return this.http.post<GitOperationResultDto>(
            `${this.apiUrl}/${sourceControlId}/pull`,

            {}
        );
    }



    //===========================================================
    // Commit Changes
    //===========================================================

    commit
    (
        sourceControlId:
            number,

        message:
            string
    ):
        Observable<GitOperationResultDto>
    {
        const model:
            GitCommitDto =
        {
            message:
                message
        };


        return this.http.post<GitOperationResultDto>(
            `${this.apiUrl}/${sourceControlId}/commit`,

            model
        );
    }



    //===========================================================
    // Push Changes
    //===========================================================

    push
    (
        sourceControlId:
            number
    ):
        Observable<GitOperationResultDto>
    {
        return this.http.post<GitOperationResultDto>(
            `${this.apiUrl}/${sourceControlId}/push`,

            {}
        );
    }



    //===========================================================
    // Full Synchronization
    //===========================================================

    sync
    (
        sourceControlId:
            number,

        message:
            string
    ):
        Observable<GitOperationResultDto>
    {
        const model:
            GitCommitDto =
        {
            message:
                message
        };


        return this.http.post<GitOperationResultDto>(
            `${this.apiUrl}/${sourceControlId}/sync`,

            model
        );
    }

}