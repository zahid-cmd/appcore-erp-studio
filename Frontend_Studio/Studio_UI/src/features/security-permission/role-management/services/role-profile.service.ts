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
    RoleProfile,

    CreateRoleProfile,

    UpdateRoleProfile,

    RoleProfileDefaults
}
from '../models/role-profile.model';


//===============================================================
// Role Profile Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class RoleProfileService
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
        `${environment.apiUrl}/security-permission/role-management/role-profile`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<RoleProfile[]>
    {
        return this.http

            .get<any[]>(
                this.apiUrl
            )

            .pipe(
                map(
                    response =>

                        response.map(
                            profile =>
                            ({
                                ...profile,

                                roleProfileId:
                                    Number
                                    (
                                        profile.roleProfileId
                                        ??
                                        profile.RoleProfileId
                                        ??
                                        profile.id
                                        ??
                                        profile.Id
                                    ),

                                displayName:
                                    profile.displayName
                                    ??
                                    profile.DisplayName
                                    ??
                                    profile.profileName
                                    ??
                                    profile.ProfileName
                                    ??
                                    profile.roleName
                                    ??
                                    profile.RoleName
                                    ??
                                    ''
                            })
                        )
                )
            );
    }



    //===========================================================
    // Get Next Code
    //===========================================================

    getNextCode():
        Observable<string>
    {
        return this.http.get<string>(
            `${this.apiUrl}/next-code`
        );
    }



    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<RoleProfileDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    response =>
                    ({
                        Code:
                            response.code,

                        DisplayOrder:
                            response.displayOrder
                    })
                )
            );
    }



    //===========================================================
    // Get Suggested Display Order
    //===========================================================

    getSuggestedDisplayOrder():
        Observable<number>
    {
        return this.http.get<number>(
            `${this.apiUrl}/suggested-display-order`
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
        Observable<RoleProfile>
    {
        return this.http.get<RoleProfile>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateRoleProfile
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
            UpdateRoleProfile
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${model.RoleProfileId}`,

            model
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
        Observable<boolean>
    {
        return this.http.put<boolean>(
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
        id:
            number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${id}/history`
        );
    }

}