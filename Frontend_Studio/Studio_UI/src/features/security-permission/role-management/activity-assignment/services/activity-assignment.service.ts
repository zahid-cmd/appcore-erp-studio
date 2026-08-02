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
from '../../../../../environments/environment';

import
{
    ActivityAssignment
}
from '../models/activity-assignment.model';

//===============================================================
// Service
//===============================================================

@Injectable(
{
    providedIn: 'root'
})

export class ActivityAssignmentService
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/security-permission/role-management/activity-assignment`;

    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<ActivityAssignment>
    {
        return this.http.get<ActivityAssignment>(
            `${this.apiUrl}/defaults`);
    }

    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<ActivityAssignment[]>
    {
        return this.http.get<ActivityAssignment[]>(
            this.apiUrl);
    }

    //===========================================================
    // Get List History
    //===========================================================

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`);
    }

    //===========================================================
    // Get By Id
    //===========================================================

    getById(
        id:number
    ):
        Observable<ActivityAssignment>
    {
        return this.http.get<ActivityAssignment>(
            `${this.apiUrl}/${id}`);
    }

    //===========================================================
    // Get By Role Profile Id
    //===========================================================

    getByRoleProfileId(
        roleProfileId:number
    ):
        Observable<ActivityAssignment>
    {
        return this.http.get<ActivityAssignment>(
            `${this.apiUrl}/role-profile/${roleProfileId}`);
    }

    //===========================================================
    // Get Entity History
    //===========================================================

    getEntityHistory(
        id:number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${id}/history`);
    }

    //===========================================================
    // Create
    //===========================================================

    create(
        activityAssignment:ActivityAssignment
    ):
        Observable<number>
    {
        return this.http.post<number>(
            this.apiUrl,
            activityAssignment);
    }

    //===========================================================
    // Update
    //===========================================================

    update(
        activityAssignment:ActivityAssignment
    ):
        Observable<void>
    {
        return this.http.put<void>(
            this.apiUrl,
            activityAssignment);
    }

    //===========================================================
    // Delete
    //===========================================================

    delete(
        id:number
    ):
        Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/${id}`);
    }

    //===========================================================
    // Restore
    //===========================================================

    restore():
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/restore`,
            {});
    }
}