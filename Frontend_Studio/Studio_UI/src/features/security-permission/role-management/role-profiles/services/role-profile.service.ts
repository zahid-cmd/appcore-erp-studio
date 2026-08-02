//===============================================================
// Imports
//===============================================================

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { RoleProfile } from '../models/role-profile.model';

//===============================================================
// Service
//===============================================================

@Injectable({
    providedIn: 'root'
})
export class RoleProfileService
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/security-permission/role-management/role-profiles`;

    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults(): Observable<RoleProfile>
    {
        return this.http.get<RoleProfile>(
            `${this.apiUrl}/defaults`);
    }

    //===========================================================
    // Get All
    //===========================================================

    getAll(): Observable<RoleProfile[]>
    {
        return this.http.get<RoleProfile[]>(
            this.apiUrl);
    }

    //===========================================================
    // Get Available For Activity Assignment
    //===========================================================

    getAvailableForActivityAssignment(): Observable<RoleProfile[]>
    {
        return this.http.get<RoleProfile[]>(
            `${this.apiUrl}/available-for-activity-assignment`);
    }

    //===========================================================
    // Get By Id
    //===========================================================

    getById(
        id: number
    ): Observable<RoleProfile>
    {
        return this.http.get<RoleProfile>(
            `${this.apiUrl}/${id}`);
    }

    //===========================================================
    // Get List History
    //===========================================================

    getHistory(): Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`);
    }

    //===========================================================
    // Get Entity History
    //===========================================================

    getEntityHistory(
        id: number
    ): Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${id}/history`);
    }

    //===========================================================
    // Create
    //===========================================================

    create(
        roleProfile: RoleProfile
    ): Observable<number>
    {
        return this.http.post<number>(
            this.apiUrl,
            roleProfile);
    }

    //===========================================================
    // Update
    //===========================================================

    update(
        roleProfile: RoleProfile
    ): Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${roleProfile.roleProfileId}`,
            roleProfile);
    }

    //===========================================================
    // Delete
    //===========================================================

    delete(
        id: number
    ): Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/${id}`);
    }

    //===========================================================
    // Restore
    //===========================================================

    restore(): Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/restore`,
            {});
    }
}